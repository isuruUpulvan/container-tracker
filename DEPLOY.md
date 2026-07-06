# Deploying Container Tracker to Render

The project already has a git repo initialized locally (in your `Container tracking/container-tracker` folder) with everything committed except secrets (`.env`) and `node_modules`. You just need to push it to GitHub and connect it to Render. Total time: ~10 minutes.

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

## 3. Create the Render service

1. Go to https://dashboard.render.com and sign up / log in (you can use your GitHub account to sign up, which also handles the repo connection permission in one step).
2. Click **New +** → **Web Service**.
3. Connect your GitHub account if prompted, then select the `container-tracker` repo.
4. Render should auto-detect the settings from `render.yaml`, but double check:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Under **Environment Variables**, add:
   - `TERMINAL49_API_KEY` = your key from https://app.terminal49.com/developers/api-keys
   - `DEMO_MODE` = `false`
   (If you don't have a Terminal49 key yet, leave `TERMINAL49_API_KEY` blank / omit it — the app will automatically fall back to demo mode.)
6. Click **Create Web Service**.

Render will build and deploy automatically. First deploy takes a few minutes. You'll get a live URL like:

```
https://container-tracker-xxxx.onrender.com
```

## 4. Redeploying after changes

Any time you push new commits to the `main` branch on GitHub, Render redeploys automatically:

```bash
git add -A
git commit -m "describe your change"
git push
```

## Notes on the free plan

- Render's free web services spin down after periods of inactivity and take ~30-60 seconds to wake up on the next request. Fine for personal/internal use; upgrade to a paid instance ($7/mo+) if you need it always-on.
- Your `TERMINAL49_API_KEY` stays in Render's environment variables — it's never in the GitHub repo or visible in the browser.
