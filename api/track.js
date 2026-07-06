const { client, Terminal49Error } = require("../server/terminal49");
const { buildDemoResult } = require("../server/mock");
const { trackNumber } = require("../server/track-flow");

const API_KEY = process.env.TERMINAL49_API_KEY || "";
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
    const t49 = client(API_KEY);
    // Vercel's Hobby plan caps function execution at 10s, so we poll less
    // than the long-lived Express server does — the frontend already polls
    // /api/track/status/:id on its own if this returns "pending".
    const result = await trackNumber(t49, number, { maxAttempts: 2, delayMs: 2500 });
    res.status(200).json(result);
  } catch (err) {
    if (err.isUserError) {
      res.status(422).json({ status: "error", message: err.message, candidates: err.candidates || [] });
      return;
    }
    if (err instanceof Terminal49Error) {
      res.status(err.status || 502).json({ status: "error", message: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ status: "error", message: "Unexpected server error." });
  }
};
