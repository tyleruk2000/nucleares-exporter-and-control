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
   - **Web UI**: `http://localhost:3000/` (simple control dashboard)
   - **API**:
     - `GET /api/state` – sample reactor state JSON
     - `POST /api/control` – sample control endpoint (currently placeholder logic)

