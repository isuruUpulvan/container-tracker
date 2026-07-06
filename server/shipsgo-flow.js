const { normalizeShipsGo } = require("./shipsgo-normalize");
const { ShipsGoError } = require("./shipsgo");

// ISO 6346 container numbers: 4 letters + 7 digits.
const CONTAINER_NUMBER_RE = /^[A-Z]{4}\d{7}$/;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function looksLikeContainerNumber(number) {
  return CONTAINER_NUMBER_RE.test(number.toUpperCase().replace(/\s+/g, ""));
}

/**
 * Create a ShipsGo shipment, returning its numeric id. ShipsGo itself
 * handles de-duping: re-tracking the same container/booking number returns
 * a 409 with the existing shipment's id attached, at no extra credit cost —
 * so we just unwrap that instead of maintaining our own lookup.
 */
async function createShipment(shipsgo, number) {
  const clean = number.trim().toUpperCase();
  const isContainer = looksLikeContainerNumber(clean);

  const payload = {
    reference: `TRACK-${clean}`.slice(0, 128),
  };
  if (isContainer) {
    payload.containerNumber = clean;
  } else {
    payload.bookingNumber = clean;
  }

  try {
    const res = await shipsgo.createShipment(payload);
    return res.shipment.id;
  } catch (err) {
    if (err instanceof ShipsGoError && err.status === 409 && err.body && err.body.shipment) {
      return err.body.shipment.id;
    }
    if (err instanceof ShipsGoError && err.status === 402) {
      const e = new Error(
        "Your ShipsGo account doesn't have enough credits to track a new shipment. Buy more at https://shipsgo.com/pricing."
      );
      e.isUserError = true;
      throw e;
    }
    throw err;
  }
}

async function resolveShipment(shipsgo, shipmentId) {
  const res = await shipsgo.getShipment(shipmentId);
  const shipment = res.shipment;

  let geojson = null;
  if (shipment && shipment.route) {
    try {
      const geoRes = await shipsgo.getShipmentGeoJson(shipmentId);
      geojson = geoRes.geojson;
    } catch (err) {
      // Non-fatal — the normalizer falls back to a route-less view.
      geojson = null;
    }
  }

  return normalizeShipsGo({ shipment, geojson, requestNumber: shipmentId });
}

/**
 * Full flow for a brand-new search: create the shipment, then poll briefly
 * so fast-resolving requests can return in one round trip.
 */
async function trackNumber(shipsgo, number, { maxAttempts = 3, delayMs = 3000 } = {}) {
  const shipmentId = await createShipment(shipsgo, number);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await resolveShipment(shipsgo, shipmentId);
    if (result.status !== "pending") return result;
    if (attempt < maxAttempts - 1) await sleep(delayMs);
  }

  return { status: "pending", trackingRequestId: shipmentId };
}

module.exports = {
  createShipment,
  resolveShipment,
  trackNumber,
  looksLikeContainerNumber,
};
