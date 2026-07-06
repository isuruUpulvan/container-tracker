const { client, ShipsGoError } = require("../server/shipsgo");
const { buildDemoResult } = require("../server/mock");
const { trackNumber } = require("../server/shipsgo-flow");

const API_KEY = process.env.SHIPSGO_API_KEY || "";
const DEMO_MODE = process.env.DEMO_MODE === "true" || !API_KEY;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ status: "error", message: "Method not allowed." });
    return;
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const number = String(body.number || "").trim();

  if (!number) {
    res.status(400).json({ status: "error", message: "Enter a container or BL number." });
    return;
  }

  if (DEMO_MODE) {
    res.status(200).json(buildDemoResult(number));
    return;
  }

  try {
    const shipsgo = client(API_KEY);
    // Vercel's Hobby plan caps function execution at 10s, so we poll less
    // than the long-lived Express server does — the frontend already polls
    // /api/track/status/:id on its own if this returns "pending".
    const result = await trackNumber(shipsgo, number, { maxAttempts: 2, delayMs: 3000 });
    res.status(200).json(result);
  } catch (err) {
    if (err.isUserError) {
      res.status(422).json({ status: "error", message: err.message });
      return;
    }
    if (err instanceof ShipsGoError) {
      res.status(err.status || 502).json({ status: "error", message: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ status: "error", message: "Unexpected server error." });
  }
};
