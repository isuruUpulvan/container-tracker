// Maps ShipsGo v2 API responses (confirmed shape, from their official docs
// and real example payloads) into the flat shape public/app.js renders.

// Friendly labels for the container movement event codes ShipsGo uses.
// Confirmed from a real "OCEAN.SHIPMENTS.SHIPMENT_UPDATED" webhook example.
const EVENT_LABELS = {
  EMSH: "Empty Container Picked Up",
  GTIN: "Gate In (Full) at Origin",
  LOAD: "Loaded on Vessel",
  DEPA: "Departed",
  ARRV: "Arrived",
  DISC: "Discharged from Vessel",
  GTOT: "Gate Out (Picked Up)",
  EMRT: "Empty Container Returned",
};

function buildMilestones(container) {
  if (!container || !Array.isArray(container.movements)) return [];
  return container.movements.map((m, i) => ({
    key: `${m.event}-${i}`,
    label: EVENT_LABELS[m.event] || m.event,
    at: m.status === "ACT" ? m.timestamp : null,
    eta: m.status !== "ACT" ? m.timestamp : null,
    done: m.status === "ACT",
    location: m.location ? m.location.name : null,
  }));
}

/** Turn a GET /ocean/shipments/{id} response into the frontend contract. */
function normalizeShipsGo({ shipment, geojson, requestNumber }) {
  if (!shipment) {
    return { status: "pending", trackingRequestId: requestNumber };
  }

  if (shipment.status === "UNTRACKED") {
    return {
      status: "error",
      message:
        "This shipment isn't trackable — the shipping line has no online tracking service, or the number couldn't be matched to a carrier.",
    };
  }

  // route is null until ShipsGo has pulled initial data from the carrier.
  if (!shipment.route) {
    return { status: "pending", trackingRequestId: shipment.id };
  }

  const pol = shipment.route.port_of_loading;
  const pod = shipment.route.port_of_discharge;
  const containers = Array.isArray(shipment.containers) ? shipment.containers : [];
  const primary = containers[0];

  const result = {
    status: "success",
    demo: false,
    shipment: {
      billOfLading: shipment.booking_number || shipment.container_number || String(shipment.id),
      carrier: {
        scac: shipment.carrier ? shipment.carrier.scac : null,
        name: shipment.carrier ? shipment.carrier.name : null,
      },
      vessel: getCurrentVessel(primary),
      pol: {
        name: pol ? pol.location.name : null,
        locode: pol ? pol.location.code : null,
        lat: null,
        lon: null,
        etd: pol ? pol.date_of_loading_initial : null,
        atd: pol ? pol.date_of_loading : null,
      },
      pod: {
        name: pod ? pod.location.name : null,
        locode: pod ? pod.location.code : null,
        lat: null,
        lon: null,
        eta: pod ? pod.date_of_discharge_predicted || pod.date_of_discharge_initial : null,
        ata: pod && shipment.status === "DISCHARGED" ? pod.date_of_discharge : null,
      },
      milestones: buildMilestones(primary),
      statusLabel: shipment.status,
      transitPercentage: shipment.route.transit_percentage,
    },
    containers: containers.map((c) => ({
      number: c.number,
      equipmentType: c.size && c.type ? `${c.size}${c.type}` : c.type || null,
      weightLbs: null,
      lastFreeDay: null,
      availableForPickup: c.status === "GATE_OUT" || c.status === "EMPTY_RETURN",
      holds: [],
      fees: [],
    })),
  };

  // Fill in port coordinates from the geojson response if we fetched one
  // (its Point features carry lon/lat for every port in the route).
  if (geojson && Array.isArray(geojson.features)) {
    const polPoint = findPortPoint(geojson.features, result.shipment.pol.locode);
    const podPoint = findPortPoint(geojson.features, result.shipment.pod.locode);
    if (polPoint) {
      result.shipment.pol.lat = polPoint.geometry.coordinates[1];
      result.shipment.pol.lon = polPoint.geometry.coordinates[0];
    }
    if (podPoint) {
      result.shipment.pod.lat = podPoint.geometry.coordinates[1];
      result.shipment.pod.lon = podPoint.geometry.coordinates[0];
    }
    result.route = { live: true, geojson };
  } else {
    result.route = {
      live: false,
      note: "Route map isn't available for this shipment yet.",
      pol: result.shipment.pol.lat != null
        ? { name: result.shipment.pol.name, lat: result.shipment.pol.lat, lon: result.shipment.pol.lon, label: "POL" }
        : null,
      pod: result.shipment.pod.lat != null
        ? { name: result.shipment.pod.name, lat: result.shipment.pod.lat, lon: result.shipment.pod.lon, label: "POD" }
        : null,
    };
  }

  return result;
}

function findPortPoint(features, locode) {
  if (!locode) return null;
  return features.find(
    (f) =>
      f.geometry &&
      f.geometry.type === "Point" &&
      f.properties &&
      f.properties.location &&
      f.properties.location.code === locode
  );
}

/** Pull vessel name/voyage off the most recent movement that has one. */
function getCurrentVessel(container) {
  if (!container || !Array.isArray(container.movements)) return { name: null, voyage: null };
  for (let i = container.movements.length - 1; i >= 0; i--) {
    const m = container.movements[i];
    if (m.vessel && m.vessel.name) {
      return { name: m.vessel.name, voyage: m.voyage || null };
    }
  }
  return { name: null, voyage: null };
}

module.exports = { normalizeShipsGo, EVENT_LABELS };
