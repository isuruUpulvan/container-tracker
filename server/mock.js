// Demo data used when DEMO_MODE=true or no TERMINAL49_API_KEY is configured,
// so the UI can be exercised end-to-end before signing up for a real key.

function buildDemoResult(query) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  return {
    status: "success",
    demo: true,
    query,
    shipment: {
      billOfLading: "MAEU123456789",
      carrier: { scac: "MAEU", name: "Maersk" },
      vessel: { name: "MAERSK ESSEX", voyage: "412W" },
      pol: {
        name: "Shanghai",
        locode: "CNSHA",
        lat: 31.2304,
        lon: 121.4737,
        etd: new Date(now - 14 * day).toISOString(),
        atd: new Date(now - 14 * day).toISOString(),
      },
      pod: {
        name: "Los Angeles",
        locode: "USLAX",
        lat: 33.7406,
        lon: -118.2706,
        eta: new Date(now + 2 * day).toISOString(),
        ata: null,
      },
      milestones: [
        { key: "booked", label: "Booking Confirmed", at: new Date(now - 20 * day).toISOString(), done: true },
        { key: "departed", label: "Departed Port of Loading", at: new Date(now - 14 * day).toISOString(), done: true },
        { key: "transit", label: "In Transit", at: new Date(now - 13 * day).toISOString(), done: true },
        { key: "arrived", label: "Arrived at Port of Discharge", at: null, done: false, eta: new Date(now + 2 * day).toISOString() },
        { key: "discharged", label: "Discharged from Vessel", at: null, done: false },
        { key: "available", label: "Available for Pickup", at: null, done: false },
        { key: "full_out", label: "Full Out (Picked Up)", at: null, done: false },
        { key: "empty_returned", label: "Empty Returned", at: null, done: false },
      ],
    },
    containers: [
      {
        number: "MSCU1234567",
        equipmentType: "40HC",
        weightLbs: 38210,
        lastFreeDay: new Date(now + 5 * day).toISOString(),
        availableForPickup: false,
        holds: [],
        fees: [],
      },
    ],
    route: {
      live: false,
      note: "Demo data — this is not a live shipment.",
      pol: { name: "Shanghai", lat: 31.2304, lon: 121.4737, label: "POL" },
      pod: { name: "Los Angeles", lat: 33.7406, lon: -118.2706, label: "POD" },
      vessel: { lat: 24.5, lon: -160.2, name: "MAERSK ESSEX" },
    },
  };
}

module.exports = { buildDemoResult };
