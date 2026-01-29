const express = require('express');
const path = require('path');
const {
  register,
  requestCounter,
  refreshNuclearesMetrics,
  discoverNuclearesVariables,
  getNuclearesPostVariables,
  setNuclearesVariable,
} = require('./nuclearesExporter');

const app = express();
const port = process.env.PORT || 3000;

// Simple in-memory state for the control UI (still available if you want it)
let reactorState = {
  powerLevel: 0.75,
  temperature: 320,
  status: 'nominal',
  lastUpdated: new Date().toISOString(),
};

app.use(express.json());

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to count requests
app.use((req, res, next) => {
  res.on('finish', () => {
    requestCounter.labels(req.method, req.path, res.statusCode.toString()).inc();
  });
  next();
});

// Simple API endpoint for live data
app.get('/api/state', (req, res) => {
  reactorState.lastUpdated = new Date().toISOString();
  res.json(reactorState);
});

// Example control endpoint (placeholder)
app.post('/api/control', (req, res) => {
  const { powerLevel } = req.body || {};
  if (typeof powerLevel === 'number') {
    reactorState.powerLevel = Math.max(0, Math.min(1, powerLevel));
    reactorState.status = 'adjusting';
    reactorState.lastUpdated = new Date().toISOString();
    return res.json({ ok: true, reactorState });
  }
  return res.status(400).json({ ok: false, error: 'Invalid powerLevel' });
});

// Prometheus scrape endpoint
app.get('/metrics', async (req, res) => {
  try {
    await refreshNuclearesMetrics();
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// List Nucleares POST variables (control variables)
app.get('/api/post-variables', (req, res) => {
  const variables = getNuclearesPostVariables();
  res.json({ variables });
});

// Set a Nucleares POST variable
app.post('/api/post-variable', async (req, res) => {
  const { variable, value } = req.body || {};
  if (!variable || typeof value === 'undefined') {
    return res.status(400).json({ ok: false, error: 'variable and value are required' });
  }
  try {
    await setNuclearesVariable(variable, value);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Nucleares exporter and control server running on http://localhost:${port}`);
  discoverNuclearesVariables().catch((err) => {
    console.error('Failed to discover Nucleares variables on startup:', err.message);
  });
});

