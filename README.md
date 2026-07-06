# Container Tracker

Search a shipment by container number or Bill of Lading (BOL) number and see its status, milestones, and route on a map. Powered by the [Terminal49](https://terminal49.com) API.

## Run it now (demo mode, no signup needed)

```bash
cd container-tracker
npm install
npm start
```

Open http://localhost:3000. With no API key configured, the app runs on bundled demo data so you can see the full UI (search, milestone timeline, container details, map) immediately.

## Connect it to real shipments

1. Sign up for a free Terminal49 developer key: https://app.terminal49.com/register
   The free tier tracks up to 10 active containers/shipments at a time — enough to build and test with.
2. Get your API key from the [developer portal](https://app.terminal49.com/developers/api-keys).
3. Copy `.env.example` to `.env` and paste in your key:
   ```
   TERMINAL49_API_KEY=your_key_here
   ```
4. Restart the server (`npm start`). The demo banner disappears and searches now hit the live API.

## How a search works

1. You enter a container, BOL, or booking number.
2. The server calls Terminal49's carrier auto-detect (`infer_number`) to figure out which shipping line owns the number, so you don't have to know the carrier code.
3. It creates a tracking request. Terminal49 fetches data from the carrier — this is usually fast, but can take a couple of minutes the first time a shipment is tracked.
4. Once ready, the server pulls the shipment, its containers, and (if available) live vessel position, and the page renders the route, milestone timeline, and container details.

## About the map

Live vessel position and full route tracking use Terminal49's Routing Data API, which is a **paid add-on** (not included in the free developer key — see [their entitlements page](https://terminal49.com/docs/api-docs/useful-info/entitlements)). Without it, the app still draws the origin and destination ports on the map using the shipment's port codes, with a note explaining that live tracking needs the paid plan. If you upgrade your Terminal49 account for Routing Data, the app automatically switches to showing the live vessel position and full route — no code changes needed.

## Notes / limitations

- Only Master Bill of Lading, booking, and container numbers are supported (not House BOLs, PO numbers, or internal references) — this is a carrier data limitation, not specific to this app.
- Container number tracking support varies by carrier; BOL or booking number is more reliable.
- The server keeps your API key out of the browser — all Terminal49 calls happen server-side.
- This is a working prototype: no user accounts or saved search history yet. The `/api/track` and `/api/track/status/:id` endpoints are the integration points if you want to add persistence later.

## Project structure

```
container-tracker/
  server/
    index.js       Express app + API routes
    terminal49.js  Terminal49 API client
    normalize.js    Shapes Terminal49 responses for the frontend
    mock.js         Demo data
    ports.js        Static UN/LOCODE -> lat/long fallback for the map
  public/
    index.html
    styles.css
    app.js          Search UI, polling, Leaflet map rendering
```
