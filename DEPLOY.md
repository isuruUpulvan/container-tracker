# Deploying Container Tracker

The project already has a git repo initialized locally (in your `Container tracking/container-tracker` folder) with everything committed except secrets (`.env`) and `node_modules`. Two deploy paths are set up:

- **Vercel** — no credit card required. Recommended if you'd rather not enter payment info. Uses serverless functions in `api/`.
- **Render** — may ask for card verification on newer accounts (free tier itself stays $0, but some accounts get asked anyway). Runs the app as a normal always-on-ish Node server.

Both read from the same codebase — pick one, you don't need both.

## 1. Create a GitHub repo

1. Go to https://github.com/new
2. Name it something like `container-tracker`. Keep it **Public** or **Private**, either works.
3. Do **not** check "Add a README" or ".gitignore" — the repo already has these locally. Click **Create repository**.
4. On the next page, copy the repo URL under "…or push an existing repository from the command line". It looks like:
   ```
   https://github.com/YOUR_USERNAME/container-tracker.git
   ```

## 2. Push your code

Open Terminal on your Mac and run:

```bash
cd "/Users/isuru/Claude/Projects/COntainer tracking/container-tracker"
git remote add origin https://github.com/YOUR_USERNAME/container-tracker.git
git push -u origin main
```

If this is the first time you've pushed from this Mac, GitHub will prompt you to sign in (usually opens a browser window) — just follow that prompt.

## Option A: Deploy on Vercel (no credit card)

1. Go to https://vercel.com/signup and sign up with **Continue with GitHub** — no card needed for the Hobby plan.
2. Click **Add New** → **Project**, then find and import your `container-tracker` repo.
3. Vercel auto-detects the `api/` folder as serverless functions and reads `vercel.json` for the static frontend routes — you shouldn't need to change any build settings. Leave Framework Preset as "Other".
4. Before clicking Deploy, expand **Environment Variables** and add:
   - `SHIPSGO_API_KEY` = your Auth Code from https://shipsgo.com/dashboard (Integration section) — sign up free, no card required (leave it out to run in demo mode)
   - `DEMO_MODE` = `false`
5. Click **Deploy**. It takes under a minute. You'll get a live URL like:
   ```
   https://container-tracker-xxxx.vercel.app
   ```

**How it works differently from Render:** instead of one long-running server, each API call (`/api/track`, `/api/track/status/:id`, `/api/config`) runs as its own short-lived serverless function — this is why Vercel's free tier doesn't need a card (you're billed, even at $0, by execution rather than by a server sitting idle). Functionally identical from the browser's point of view.

## Option B: Deploy on Render (may ask for card verification)

1. Go to https://dashboard.render.com and sign up / log in (you can use your GitHub account to sign up, which also handles the repo connection permission in one step).
2. Click **New +** → **Web Service**.
3. Connect your GitHub account if prompted, then select the `container-tracker` repo.
4. Render should auto-detect the settings from `render.yaml`, but double check:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Under **Environment Variables**, add:
   - `SHIPSGO_API_KEY` = your Auth Code from https://shipsgo.com/dashboard (Integration section)
   - `DEMO_MODE` = `false`
   (If you don't have a ShipsGo key yet, leave `SHIPSGO_API_KEY` blank / omit it — the app will automatically fall back to demo mode.)
6. Click **Create Web Service**.

Render will build and deploy automatically. First deploy takes a few minutes. You'll get a live URL like:

```
https://container-tracker-xxxx.onrender.com
```

## Redeploying after changes

Any time you push new commits to the `main` branch on GitHub, both Vercel and Render redeploy automatically:

```bash
git add -A
git commit -m "describe your change"
git push
```

## Notes on the free plans

- **Vercel Hobby**: functions have a 10-second execution limit, which is why `api/track.js` polls ShipsGo briefly and returns `"pending"` for slower carriers — the frontend keeps polling `/api/track/status/:id` (a separate short function call) until it resolves. No always-on server, so no idle spin-down either.
- **Render free tier**: the service spins down after periods of inactivity and takes ~30-60 seconds to wake up on the next request. Fine for personal/internal use; upgrade to a paid instance ($7/mo+) if you need it always-on.
- Either way, your `SHIPSGO_API_KEY` stays in the platform's environment variables — it's never in the GitHub repo or visible in the browser.
- Each new number you track consumes one of your ShipsGo credits — see https://shipsgo.com/pricing when your free 3 run out.
