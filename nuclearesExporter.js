const promClient = require('prom-client');
const config = require('./config.json');

// Prometheus metrics registry
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// HTTP request counter for this service
const requestCounter = new promClient.Counter({
  name: 'nucleares_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

register.registerMetric(requestCounter);

// Dynamic Nucleares variable gauges
const nuclearesVariableGauges = new Map(); // name -> { gauge, type }
let nuclearesInitialised = false;

function sanitiseMetricName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseNuclearesValue(raw) {
  const value = raw.trim();

  if (/^(true|false)$/i.test(value)) {
    return { type: 'boolean', value: /^true$/i.test(value) };
  }

  const normalised = value.replace(',', '.');
  const num = Number(normalised);
  if (!Number.isNaN(num)) {
    return { type: 'number', value: num };
  }

  return { type: 'string', value };
}

async function fetchText(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status} ${res.statusText}`);
    }
    return res.text();
  } catch (err) {
    const extra = err && typeof err === 'object' && 'cause' in err && err.cause ? ` (cause: ${err.cause})` : '';
    throw new Error(`fetch failed for ${url}: ${err.message}${extra}`);
  }
}

async function discoverNuclearesVariables() {
  const baseUrl = config.nuclearesUrl.replace(/\/+$/, '');
  const rootText = await fetchText(baseUrl + '/');

  const getMarker = '==== GET ====';
  const postMarker = '==== POST ====';
  const start = rootText.indexOf(getMarker);
  if (start === -1) {
    console.warn('Could not find "==== GET ====" section in Nucleares root response');
    return;
  }
  const end = rootText.indexOf(postMarker, start);
  const section = rootText.slice(start + getMarker.length, end === -1 ? rootText.length : end);

  // The Nucleares endpoint returns HTML with links like: <a href="/?variable=VALVE_M01_OPEN">...
  const variableNames = [];
  const variableRegex = /\/\?variable=([^"'>\s]+)/g;
  for (;;) {
    const match = variableRegex.exec(section);
    if (!match) break;
    try {
      variableNames.push(decodeURIComponent(match[1]));
    } catch {
      variableNames.push(match[1]);
    }
  }

  for (const name of variableNames) {
    try {
      const valueText = await fetchText(`${baseUrl}/?variable=${encodeURIComponent(name)}`);
      const parsed = parseNuclearesValue(valueText);

      const metricName = `nucleares_${sanitiseMetricName(name)}`;
      const gauge = new promClient.Gauge({
        name: metricName,
        help: `Nucleares variable ${name}`,
        labelNames: ['variable'],
      });

      register.registerMetric(gauge);
      nuclearesVariableGauges.set(name, { gauge, type: parsed.type });
    } catch (err) {
      console.warn(`Failed to register Nucleares variable "${name}":`, err.message);
    }
  }

  nuclearesInitialised = true;
  console.log(`Discovered ${nuclearesVariableGauges.size} Nucleares GET variables`);
}

async function refreshNuclearesMetrics() {
  if (!nuclearesInitialised || nuclearesVariableGauges.size === 0) return;
  const baseUrl = config.nuclearesUrl.replace(/\/+$/, '');

  await Promise.all(
    Array.from(nuclearesVariableGauges.entries()).map(async ([name, { gauge, type }]) => {
      try {
        const valueText = await fetchText(`${baseUrl}/?variable=${encodeURIComponent(name)}`);
        const parsed = parseNuclearesValue(valueText);

        if (type === 'boolean') {
          if (parsed.type === 'boolean') {
            gauge.set({ variable: name }, parsed.value ? 1 : 0);
          } else if (parsed.type === 'number') {
            // Auto-upgrade: some variables start at 0/1 but later take real numeric values (e.g. ordered speeds).
            nuclearesVariableGauges.set(name, { gauge, type: 'number' });
            gauge.set({ variable: name }, parsed.value);
          }
        } else if (type === 'number' && parsed.type === 'number') {
          gauge.set({ variable: name }, parsed.value);
        }
      } catch (err) {
        // On error, do not update the previous value; just log
        console.warn(`Failed to refresh Nucleares variable "${name}":`, err.message);
      }
    })
  );
}

module.exports = {
  register,
  requestCounter,
  discoverNuclearesVariables,
  refreshNuclearesMetrics,
};


