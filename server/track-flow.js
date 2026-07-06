const { normalizeShipment } = require("./normalize");

/**
 * Shared orchestration logic used by both the Express server (server/index.js,
 * for Render/local hosting) and the Vercel serverless functions (api/*.js).
 * Keeping this in one place means both deploy targets behave identically.
 */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a tracking request for `number`, or reuse an existing one if
 * Terminal49 already has one (it rejects exact duplicates with a 422).
 * Serverless functions can't rely on in-memory caches across invocations,
 * so this always asks Terminal49 rather than trusting local state.
 */
async function createOrReuseTrackingRequest(t49, number) {
  const inferDoc = await t49.inferNumber(number);
  const inferAttrs = inferDoc.data.attributes;
  const selected = inferAttrs.shipping_line && inferAttrs.shipping_line.selected;

  if (!selected || !selected.scac) {
    const err = new Error(
      "Couldn't identify the carrier for that number. Double check it against the carrier's own tracking page."
    );
    err.isUserError = true;
    err.candidates = (inferAttrs.shipping_line && inferAttrs.shipping_line.candidates) || [];
    throw err;
  }

  try {
    const createDoc = await t49.createTrackingRequest({
      requestNumber: number,
      scac: selected.scac,
      requestType: inferAttrs.number_type === "bill_of_lading" ? "bill_of_lading" : inferAttrs.number_type,
    });
    return createDoc.data.id;
  } catch (err) {
    // 422 + code "duplicate" means Terminal49 already has this tracking
    // request from an earlier search. Look it up instead of failing.
    if (err.status === 422) {
      const listDoc = await t49.listTrackingRequests();
      const existing = (listDoc.data || []).find(
        (tr) => tr.attributes.request_number === number
      );
      if (existing) return existing.id;
    }
    throw err;
  }
}

async function resolveShipmentFromTrackingRequest(t49, trId) {
  const trDoc = await t49.getTrackingRequest(trId);
  const tr = trDoc.data;
  const status = tr.attributes.status;

  if (status === "failed") {
    return { status: "error", message: tr.attributes.failed_reason || "Tracking request failed." };
  }

  if (status !== "succeeded") {
    return { status: "pending", trackingRequestId: trId };
  }

  const tracked = tr.relationships && tr.relationships.tracked_object && tr.relationships.tracked_object.data;
  if (!tracked) {
    return { status: "pending", trackingRequestId: trId };
  }

  // tracked_object may be a shipment or (less commonly) a container.
  if (tracked.type !== "shipment") {
    // Fall back to pending; container-only tracking without a shipment
    // record is rare but possible for some carriers.
    return { status: "pending", trackingRequestId: trId };
  }

  const shipmentDoc = await t49.getShipment(
    tracked.id,
    "containers,port_of_lading,port_of_discharge,pod_terminal"
  );

  const containerRefs =
    (shipmentDoc.data.relationships &&
      shipmentDoc.data.relationships.containers &&
      shipmentDoc.data.relationships.containers.data) ||
    [];

  let geojson = null;
  if (containerRefs.length) {
    try {
      geojson = await t49.getContainerMapGeoJSON(containerRefs[0].id);
    } catch (err) {
      // Expected on free/non-entitled accounts (403). We just fall back to
      // the static port-coordinate map in normalizeShipment.
      geojson = null;
    }
  }

  return normalizeShipment({ shipmentDoc, geojson });
}

/**
 * Full flow for a brand-new search: create/reuse a tracking request, then
 * poll briefly so fast-resolving requests can return in one round trip.
 * `maxAttempts` / `delayMs` are tuned down for serverless (time-limited)
 * callers and up for the long-lived Express server.
 */
async function trackNumber(t49, number, { maxAttempts = 3, delayMs = 2500 } = {}) {
  const trId = await createOrReuseTrackingRequest(t49, number);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await resolveShipmentFromTrackingRequest(t49, trId);
    if (result.status !== "pending") return result;
    if (attempt < maxAttempts - 1) await sleep(delayMs);
  }

  return { status: "pending", trackingRequestId: trId };
}

module.exports = {
  sleep,
  createOrReuseTrackingRequest,
  resolveShipmentFromTrackingRequest,
  trackNumber,
};
