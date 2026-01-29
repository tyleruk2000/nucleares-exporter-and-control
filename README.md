# nucleares-exporter-and-control
A Prometheus exporter and web-based controller for Nucleares

## Running locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure the Nucleares URL (defaults to the example IP):

   ```json
   {
     "nuclearesUrl": "http://192.168.1.215:8785/"
   }
   ```

3. Start the server:

   ```bash
   npm run start
   # or, for auto-reload during development:
   npm run dev
   ```

4. Endpoints:

   - **Prometheus scrape**: `http://localhost:3000/metrics`  
     - On startup, the exporter discovers all `==== GET ==== ` variables from the Nucleares webserver and creates a gauge for each.
     - On every scrape, it refreshes their values by calling `/?variable=VARNAME`.
   - **Web UI**: `http://localhost:3000/` – live metrics dashboard and controls
   - **API**:
     - `GET /api/state` – sample reactor state JSON (used by the initial mock UI)
     - `POST /api/control` – sample control endpoint (currently placeholder logic)
     - `GET /api/post-variables` – list of Nucleares POST variables (control variables)
     - `POST /api/post-variable` – proxy to the Nucleares POST API (`/?variable=VARNAME&value=NEWVALUE`)

## Web dashboard

- **Metric discovery & display**
  - Metrics are grouped by subsystem (e.g. `CORE`, `CONDENSER`, `COOLANT`, `VALVE`) into collapsible sections.
  - Each Nucleares GET variable becomes a Prometheus gauge and a card showing the current value plus a sparkline of recent samples.
  - Default refresh interval is **30 seconds**, configurable in the UI; you can also trigger a manual refresh.

- **Control variables (POST)**
  - POST variables are discovered from the `==== POST ==== ` section on the Nucleares page.
  - For each metric, related POST variables (by common stem in the name) are shown as inline controls in the same card:
    - `*_SWITCH`, `*_STOP`, `*_TRIP`, `*_RESET`, `*_OPEN`, `*_CLOSE`, `*_EMERGENCY` → boolean toggle posting `true` / `false`.
    - `*_ORDERED`, `*_ORDERED_SPEED` → numeric input.
    - Other POST variables → text input.
  - All controls call `POST /api/post-variable`, which in turn posts to the real Nucleares endpoint.

