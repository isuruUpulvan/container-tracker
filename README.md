# Container Tracker

Search a shipment by container number or Bill of Lading (BOL) number and see its status, milestones, and route on a map. Powered by the [ShipsGo](https://shipsgo.com) API.

## Run it now (demo mode, no signup needed)

```bash
cd container-tracker
npm install
npm start
```

Open http://localhost:3000. With no API key configured, the app runs on bundled demo data so you can see the full UI (search, milestone timeline, container details, map) immediately.

## Connect it to real shipments

1. Sign up free at https://shipsgo.com/dashboard/register — no credit card required. You get **3 free tracking credits** to start.
2. Find your Auth Code in the dashboard under the Integration / API section.
3. Copy `.env.example` to `.env` and paste in your key:
   ```
   SHIPSGO_API_KEY=your_auth_code_here
   ```
4. Restart the server (`npm start`). The demo banner disappears and searches now hit the live API.

## Why ShipsGo (and not Terminal49)

This project originally integrated Terminal49, but their **free developer key only allows creating tracking requests via the API — reading the results back (shipment status, containers, milestones) requires their paid Pay As You Go or Enterprise plan.** That's confirmed in their own docs and support FAQ. Since the whole point of this app is showing results on your own site, that free tier doesn't work for this use case.

ShipsGo's free tier doesn't have that restriction: per their FAQ, "there is no limitation for posting tracking requests; or making a call for getting voyage data" — your 3 free credits give full create + read access, no separate paywall for reads. The Terminal49 client code (`server/terminal49.js`, `server/normalize.js`, `server/track-flow.js`) is still in the repo, unused, in case you ever want to switch back or upgrade a Terminal49 account.

## How a search works

1. You enter a container, BL, or booking number.
2. If it looks like a container number (4 letters + 7 digits), the server guesses the carrier from a small prefix table (e.g. `MSCU` → MSC) and posts it to ShipsGo's `PostContainerInfo` endpoint. Otherwise it's treated as a BL/booking number and posted to `PostContainerInfoWithBl` with the carrier set to `OTHERS` (ShipsGo's documented fallback that lets their system attempt its own detection).
3. ShipsGo returns a request ID. The server polls `GetContainerInfo` with that ID for voyage data — this can be empty right after creation if the carrier hasn't responded yet, in which case the frontend keeps polling `/api/track/status/:id`.
4. Once data's available, the page renders route, milestone timeline, and container details. Adding `&mapPoint=true` to the ShipsGo request also returns live vessel coordinates when the container is actively sailing.

**Heads up:** ShipsGo's official docs describe the response fields conceptually but don't publish a field-by-field JSON reference, so `server/shipsgo-normalize.js` reads several likely key-name variants defensively. If your real account returns data that doesn't map cleanly (missing vessel name, wrong dates, etc.), that file is the place to adjust — the actual JSON ShipsGo returns will make the correct field names obvious.

## About the map

The map plots the origin (POL) and destination (POD) ports using a bundled name-based lookup table (`server/ports.js`) — no extra cost or paid plan needed. When ShipsGo returns live coordinates for an actively-sailing container (via `mapPoint=true`), the map also shows the current vessel position. Once a shipment is discharged/completed, only the static route shows.

## Notes / limitations

- Only Master Bill of Lading, booking, and container numbers are supported (not House BLs, PO numbers, or internal references) — a carrier data limitation, not specific to this app.
- Each new number tracked consumes one of your ShipsGo credits; re-searching the same number reuses the existing request (no extra credit) — though this app doesn't persist that dedupe across restarts, so repeat searches after a redeploy may consume another credit. Buy more credits at https://shipsgo.com/pricing when you run out.
- The server keeps your API key out of the browser — all ShipsGo calls happen server-side.
- This is a working prototype: no user accounts or saved search history yet. The `/api/track` and `/api/track/status/:id` endpoints are the integration points if you want to add persistence later.

## Project structure

```
container-tracker/
  server/
    index.js              Express app + API routes (active: ShipsGo)
    shipsgo.js             ShipsGo API client
    shipsgo-normalize.js   Shapes ShipsGo responses for the frontend
    shipsgo-flow.js        Create/poll orchestration
    shipping-lines.js       Container-prefix -> carrier name guesses
    mock.js                 Demo data
    ports.js                Static port name -> lat/long lookup for the map
    terminal49.js           Unused — kept in case you switch back
    normalize.js             Unused — Terminal49 version
    track-flow.js            Unused — Terminal49 version
  api/                      Vercel serverless functions (same routes as server/index.js)
  public/
    index.html
    styles.css
    app.js                  Search UI, polling, Leaflet map rendering
```
