const { client, ShipsGoError } = require("../../../server/shipsgo");
const { buildDemoResult } = require("../../../server/mock");
const { resolveShipment } = require("../../../server/shipsgo-flow");

const API_KEY = process.env.SHIPSGO_API_KEY || "";
const DEMO_MODE = process.env.DEMO_MODE === "true" || !API_KEY;

module.exports = async (req, res) => {
  const { id } = req.query;

  if (DEMO_MODE) {
    res.status(200).json(buildDemoResult("demo"));
    return;
  }

  try {
    const shipsgo = client(API_KEY);
    const result = await resolveShipment(shipsgo, id);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof ShipsGoError) {
      res.status(err.status || 502).json({ status: "error", message: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ status: "error", message: "Unexpected server error." });
  }
};
