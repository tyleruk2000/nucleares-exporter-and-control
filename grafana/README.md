# Grafana Dashboard for Nucleares Exporter

This folder contains a Grafana dashboard JSON file for visualizing Nucleares reactor metrics.

## Importing the Dashboard

1. **In Grafana UI:**
   - Go to **Dashboards** → **Import**
   - Click **Upload JSON file** and select `nucleares-dashboard.json`
   - Or paste the JSON content directly

2. **Via Grafana CLI:**
   ```bash
   grafana-cli admin import-dashboard nucleares-dashboard.json
   ```

3. **Via API:**
   ```bash
   curl -X POST \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -d @nucleares-dashboard.json \
     http://your-grafana-instance/api/dashboards/db
   ```

## Prerequisites

- **Prometheus data source** configured in Grafana
  - URL should point to your Prometheus instance scraping `http://your-nucleares-exporter:3031/metrics`
  - The dashboard uses a template variable `${DS_PROMETHEUS}` that will auto-select your Prometheus datasource

## Dashboard Structure

The dashboard is organized into collapsible rows matching the web UI categories:

- **Core** - Core temperature, pressure, critical mass status, fuel metrics
- **Condenser** - Condenser temperature, pressure, circulation pump metrics
- **Coolant** - Coolant circulation pumps, vessel temperature, core pressure
- **Valves** - Valve status (M01, M02, M03, etc.)
- **Steam & Turbines** - Steam turbine RPM, generator power output
- **Alarms & Status** - Alarm status indicators

## Customization

You can customize the dashboard by:

1. **Adding more metrics**: Edit the JSON and add new panels with queries like:
   ```promql
   nucleares_<variable_name>{variable="VARIABLE_NAME"}
   ```

2. **Adjusting time ranges**: Change the default time range in the dashboard settings

3. **Adding alerts**: Configure alert rules based on the metrics shown

## Metric Naming

All metrics follow the pattern:
- Metric name: `nucleares_<sanitized_variable_name>`
- Label: `variable="<ORIGINAL_VARIABLE_NAME>"`

Example:
- `nucleares_core_temp{variable="CORE_TEMP"}`
- `nucleares_valve_m01_open{variable="VALVE_M01_OPEN"}`

