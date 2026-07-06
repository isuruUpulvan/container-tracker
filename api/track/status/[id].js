const { client, Terminal49Error } = require("../../../server/terminal49");
const { buildDemoResult } = require("../../../server/mock");
const { resolveShipmentFromTrackingRequest } = require("../../../server/track-flow");

const API_KEY = process.env.TERMINAL49_API_KEY || "";
const DEMO_MODE = process.env.DEMO_MODE === "true" || !API_KEY;

module.exports = async (req, res) => {
  const { id } = req.query;

  if (DEMO_MODE) {
    res.status(200).json(buildDemoResult("demo"));
    return;
  }

  try {
    const t49 = client(API_KEY);
    const result = await resolveShipmentFromTrackingRequest(t49, id);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof Terminal49Error) {
      res.status(err.status || 502).json({ status: "error", message: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ status: "error", message: "Unexpected server error." });
  }
};
