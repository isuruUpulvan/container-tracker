require("dotenv").config();
const path = require("path");
const express = require("express");

const { client, ShipsGoError } = require("./shipsgo");
const { buildDemoResult } = require("./mock");
const { trackNumber, resolveTrackingRequest } = require("./shipsgo-flow");

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.SHIPSGO_API_KEY || "";
const DEMO_MODE = process.env.DEMO_MODE === "true" || !API_KEY;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

const shipsgo = API_KEY ? client(API_KEY) : null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function handleError(res, err) {
  if (err.isUserError) {
    return res.status(422).json({ status: "error", message: err.message });
  }
  if (err instanceof ShipsGoError) {
    return res.status(err.status || 502).json({ status: "error", message: err.message });
  }
  console.error(err);
  return res.status(500).json({ status: "error", message: "Unexpected server error." });
}

app.post("/api/track", async (req, res) => {
  const number = ((req.body && req.body.number) || "").trim();
  if (!number) {
    return res.status(400).json({ status: "error", message: "Enter a container or BL number." });
  }

  if (DEMO_MODE) {
    await sleep(400); // small delay so the loading state is visible
    return res.json(buildDemoResult(number));
  }

  try {
    const result = await trackNumber(shipsgo, number, { maxAttempts: 3, delayMs: 3000 });
    return res.json(result);
  } catch (err) {
    return handleError(res, err);
  }
});

app.get("/api/track/status/:trackingRequestId", async (req, res) => {
  if (DEMO_MODE) {
    return res.json(buildDemoResult("demo"));
  }
  try {
    const result = await resolveTrackingRequest(shipsgo, req.params.trackingRequestId);
    return res.json(result);
  } catch (err) {
    return handleError(res, err);
  }
});

app.get("/api/config", (req, res) => {
  res.json({ demoMode: DEMO_MODE });
});

app.listen(PORT, () => {
  console.log(`Container tracker running at http://localhost:${PORT}`);
  console.log(DEMO_MODE ? "Running in DEMO MODE (no API key set)." : "Using live ShipsGo API.");
});
