const { normalizeShipsGo } = require("./shipsgo-normalize");
const { guessShippingLineFromContainerNumber } = require("./shipping-lines");

// ISO 6346 container numbers: 4 letters + 7 digits.
const CONTAINER_NUMBER_RE = /^[A-Z]{4}\d{7}$/;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function looksLikeContainerNumber(number) {
  return CONTAINER_NUMBER_RE.test(number.toUpperCase().replace(/\s+/g, ""));
}

/** Create a ShipsGo tracking request, returning its requestId. */
async function createTrackingRequest(shipsgo, number) {
  const clean = number.trim();

  if (looksLikeContainerNumber(clean)) {
    const shippingLine = guessShippingLineFromContainerNumber(clean);
    const res = await shipsgo.postContainerInfo({ containerNumber: clean, shippingLine });
    return extractRequestId(res);
  }

  // Treat anything else (Master BL or booking number) as blContainersRef.
  // We don't have a reliable way to guess the carrier from a BL/booking
  // number, so we fall back to "OTHERS", which ShipsGo's docs say is valid.
  const res = await shipsgo.postContainerInfoWithBl({
    blContainersRef: clean,
    shippingLine: "OTHERS",
  });
  return extractRequestId(res);
}

function extractRequestId(res) {
  if (typeof res === "number") return res;
  if (typeof res === "string" && /^\d+$/.test(res.trim())) return res.trim();
  if (res && typeof res === "object") {
    const id = res.RequestId ?? res.requestId ?? res.Id ?? res.id;
    if (id != null) return id;
  }
  const err = new Error("ShipsGo didn't return a recognizable request id for this tracking request.");
  err.isUserError = true;
  throw err;
}

async function resolveTrackingRequest(shipsgo, requestId, number) {
  const data = await shipsgo.getContainerInfo(requestId, { mapPoint: true });
  return normalizeShipsGo({ data, requestNumber: number, requestId });
}

/**
 * Full flow for a brand-new search: create the tracking request, then poll
 * briefly so fast-resolving requests can return in one round trip.
 */
async function trackNumber(shipsgo, number, { maxAttempts = 3, delayMs = 3000 } = {}) {
  const requestId = await createTrackingRequest(shipsgo, number);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await resolveTrackingRequest(shipsgo, requestId, number);
    if (result.status !== "pending") return result;
    if (attempt < maxAttempts - 1) await sleep(delayMs);
  }

  return { status: "pending", trackingRequestId: requestId };
}

module.exports = {
  createTrackingRequest,
  resolveTrackingRequest,
  trackNumber,
  looksLikeContainerNumber,
};
