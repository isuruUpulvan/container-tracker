# Container Tracker

Search a shipment by container number or Bill of Lading/booking number and see its status, milestones, and route on a map. Powered by the [ShipsGo](https://shipsgo.com) v2 API.

## Run it now (demo mode, no signup needed)

```bash
cd container-tracker
npm install
npm start
```

Open http://localhost:3000. With no API key configured, the app runs on bundled demo data so you can see the full UI (search, milestone timeline, container details, map) immediately.

## Connect it to real shipments

1. Sign up free at https://shipsgo.com/dashboard/register — no credit card required. You get **3 free tracking credits** to start.
2. In the ShipsGo dashboard, go to the **"ShipsGo API"** section (under Ocean → Integrations). Copy the value shown under **Existing Tokens** (this is your API token — the dashboard doesn't call it an "API key", just a token).
3. Copy `.env.example` to `.env` and paste it in:
   ```
   SHIPSGO_API_KEY=your_token_here
   ```
4. Restart the server (`npm start`). The demo banner disappears and searches now hit the live API.

## Why ShipsGo (and not Terminal49)

This project originally integrated Terminal49, but their **free developer key only allows creating tracking requests via the API — reading the results back (shipment status, containers, milestones) requires their paid Pay As You Go or Enterprise plan.** That's confirmed in their own docs and support FAQ. Since the whole point of this app is showing results on your own site, that free tier doesn't work for this use case.

ShipsGo's free tier doesn't have that restriction — 3 free credits give full create + read access, no separate paywall for reads. The Terminal49 client code (`server/terminal49.js`, `server/normalize.js`, `server/track-flow.js`) is still in the repo, unused, in case you ever want to switch back or upgrade a Terminal49 account.

**A note on how this was built:** the first pass at the ShipsGo integration targeted their older, publicly-documented v1.2 REST API (`authCode` query param). That turned out to be the wrong API for tokens issued by the current dashboard — it errored with "Invalid Authentication Code." Digging into ShipsGo's actual interactive API docs (https://api.shipsgo.com/docs/v2/) showed the real, current API: JSON-based, authenticated with an `X-Shipsgo-User-Token` header, at `https://api.shipsgo.com/v2`. This code targets that real v2 API.

## How a search works

1. You enter a container, BL, or booking number.
2. If it looks like a container number (4 letters + 7 digits), the server sends it as `container_number` to ShipsGo's `POST /ocean/shipments`. Otherwise it's sent as `booking_number` (ShipsGo accepts Master BL numbers in the same field). The carrier (SCAC) field is left out — ShipsGo detects it automatically.
3. ShipsGo returns a shipment `id` (or, if you've already tracked that number before, the existing shipment's id via a 409 response — ShipsGo dedupes this server-side, so re-searching the same number doesn't burn another credit).
4. The server polls `GET /ocean/shipments/{id}` for voyage data. Right after creation, `route` is `null` until ShipsGo has pulled initial data from the carrier — the frontend keeps polling `/api/track/status/:id` until it's populated.
5. Once available, the page renders the route, a milestone timeline (built from each container's `movements` array — event codes like `LOAD`, `DEPA`, `ARRV`, `DISC`), and container details. `GET /ocean/shipments/{id}/geojson` supplies port coordinates and, for actively-sailing shipments, the live vessel position for the map.

## About the map

Ports and routes are drawn from ShipsGo's `/geojson` endpoint (documented as "Experimental" but not paid-gated, per their docs). One detail isn't confirmed from real data yet: the exact shape of the `current` field that's supposed to carry the vessel's live position on an in-progress route leg — the docs' example didn't have a populated one. `public/app.js` reads it defensively (a few likely shapes); if your real sailing shipment's map is missing the moving vessel dot but shows the route lines fine, that's the spot to adjust once you see real data.

## Notes / limitations

- Only Master Bill of Lading, booking, and container numbers are supported (not House BLs, PO numbers, or internal references) — a carrier data limitation, not specific to this app.
- Each new number tracked consumes one of your ShipsGo credits; re-searching a number you've already tracked reuses the existing shipment via ShipsGo's own dedup (confirmed in their docs — no extra credit charged).
- The server keeps your API token out of the browser — all ShipsGo calls happen server-side.
- This is a working prototype: no user accounts or saved search history yet. The `/api/track` and `/api/track/status/:id` endpoints are the integration points if you want to add persistence later.

## Project structure

```
container-tracker/
  server/
    index.js              Express app + API routes (active: ShipsGo v2)
    shipsgo.js             ShipsGo v2 API client
    shipsgo-normalize.js   Shapes ShipsGo responses for the frontend
    shipsgo-flow.js        Create/poll orchestration
    shipping-lines.js       Unused leftover from the v1.2 attempt
    mock.js                 Demo data
    ports.js                Unused leftover (name-based port lookup)
    terminal49.js           Unused — kept in case you switch back
    normalize.js             Unused — Terminal49 version
    track-flow.js            Unused — Terminal49 version
  api/                      Vercel serverless functions (same routes as server/index.js)
  public/
    index.html
    styles.css
    app.js                  Search UI, polling, Leaflet map rendering
```
