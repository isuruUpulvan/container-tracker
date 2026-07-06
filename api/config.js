module.exports = (req, res) => {
  const demoMode = process.env.DEMO_MODE === "true" || !process.env.SHIPSGO_API_KEY;
  res.status(200).json({ demoMode });
};
