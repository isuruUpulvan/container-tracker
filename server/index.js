require("dotenv").config();
const path = require("path");
const express = require("express");

const { client, Terminal49Error } = require("./terminal49");
const { normalizeShipment } = require("./normalize");
const { buildDemoResult } = require("./mock");

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.TERMINAL49_API_KEY || "";
const DEMO_MODE = process.env.DEMO_MODE === "true" || !API_KEY;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

const t49 = API_KEY ? client(API_KEY) : null;

// In-memory cache of query -> tracking_request id, so re-searching the same
// number doesn't create a duplicate tracking request (Terminal49 rejects
// duplicates with a 422).
const trackingRequestsByNumber = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveShipmentFromTrackingRequest(trId) {
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
  let shipmentId = tracked.id;
  if (tracked.type !== "shipment") {
    // Fall back to pending; container-only tracking without a shipment
    // record is rare but possible for some carriers.
    return { status: "pending", trackingRequestId: trId };
  }

  const shipmentDoc = await t49.getShipment(
    shipmentId,
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

  const normalized = normalizeShipment({ shipmentDoc, geojson });
  return normalized;
}

app.post("/api/track", async (req, res) => {
  const number = (req.body && req.body.number || "").trim();
  if (!number) {
    return res.status(400).json({ status: "error", message: "Enter a container or BL number." });
  }

  if (DEMO_MODE) {
    await sleep(400); // small delay so the loading state is visible
    return res.json(buildDemoResult(number));
  }

  try {
    // Reuse an existing tracking request for this number if we've seen it
    // in this server session, to avoid Terminal49's duplicate-request error.
    let trId = trackingRequestsByNumber.get(number);

    if (!trId) {
      const inferDoc = await t49.inferNumber(number);
      const inferAttrs = inferDoc.data.attributes;
      const selected = inferAttrs.shipping_line && inferAttrs.shipping_line.selected;

      if (!selected || !selected.scac) {
        return res.status(422).json({
          status: "error",
          message:
            "Couldn't identify the carrier for that number. Double check it against the carrier's own tracking page.",
          candidates: (inferAttrs.shipping_line && inferAttrs.shipping_line.candidates) || [],
        });
      }

      const createDoc = await t49.createTrackingRequest({
        requestNumber: number,
        scac: selected.scac,
        requestType: inferAttrs.number_type === "bill_of_lading" ? "bill_of_lading" : inferAttrs.number_type,
      });

      trId = createDoc.data.id;
      trackingRequestsByNumber.set(number, trId);
    }

    // Poll briefly so a fast-resolving request can return in one round trip.
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await resolveShipmentFromTrackingRequest(trId);
      if (result.status !== "pending") {
        return res.json(result);
      }
      await sleep(2500);
    }

    return res.json({ status: "pending", trackingRequestId: trId });
  } catch (err) {
    if (err instanceof Terminal49Error) {
      return res.status(err.status || 502).json({ status: "error", message: err.message });
    }
    console.error(err);
    return res.status(500).json({ status: "error", message: "Unexpected server error." });
  }
});

app.get("/api/track/status/:trackingRequestId", async (req, res) => {
  if (DEMO_MODE) {
    return res.json(buildDemoResult("demo"));
  }
  try {
    const result = await resolveShipmentFromTrackingRequest(req.params.trackingRequestId);
    return res.json(result);
  } catch (err) {
    if (err instanceof Terminal49Error) {
      return res.status(err.status || 502).json({ status: "error", message: err.message });
    }
    console.error(err);
    return res.status(500).json({ status: "error", message: "Unexpected server error." });
  }
});

app.get("/api/config", (req, res) => {
  res.json({ demoMode: DEMO_MODE });
});

app.listen(PORT, () => {
  console.log(`Container tracker running at http://localhost:${PORT}`);
  console.log(DEMO_MODE ? "Running in DEMO MODE (no API key set)." : "Using live Terminal49 API.");
});
