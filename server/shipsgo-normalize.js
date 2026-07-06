const { findPortCoordsByName } = require("./ports");

/**
 * ShipsGo's official docs describe the fields conceptually (POL/POD names,
 * vessel name, ETD/ETA, status) but don't publish an exhaustive JSON key
 * reference. Their backend is .NET-style (PascalCase endpoint names like
 * GetContainerInfo), so PascalCase JSON keys are the most likely shape —
 * but we look up several casing variants defensively so a mismatch doesn't
 * silently break the page. If ShipsGo's real response uses different key
 * names than the ones tried here, extend CANDIDATES rather than rewriting
 * the whole normalizer.
 */
function pick(obj, names) {
  if (!obj || typeof obj !== "object") return null;
  for (const name of names) {
    if (obj[name] !== undefined && obj[name] !== null && obj[name] !== "") {
      return obj[name];
    }
  }
  return null;
}

// StatusId meanings per ShipsGo's FAQ/docs.
const STATUS_LABELS = {
  20: "In Progress",
  30: "Booked",
  35: "Loaded",
  40: "Sailing",
  45: "Arrived",
  50: "Discharged",
  60: "Untracked",
};

function buildMilestones(data) {
  const statusId = Number(pick(data, ["StatusId", "statusId", "status_id"]));
  const pol = pick(data, ["Pol", "POL", "PortOfLoading", "pol"]);
  const pod = pick(data, ["Pod", "POD", "PortOfDischarge", "pod"]);

  const etd = pick(data, ["Etd", "ETD", "DepartureDate", "PolEtd"]);
  const atd = pick(data, ["Atd", "ATD", "PolAtd"]);
  const eta = pick(data, ["Eta", "ETA", "ArrivalDate", "PodEta"]);
  const ata = pick(data, ["Ata", "ATA", "PodAta"]);
  const dischargeDate = pick(data, ["DischargeDate", "PodDischargeDate"]);

  return [
    {
      key: "departed",
      label: "Departed Port of Loading",
      at: atd || (statusId >= 40 ? etd : null),
      eta: etd,
      done: statusId >= 40 || Boolean(atd),
    },
    {
      key: "arrived",
      label: "Arrived at Port of Discharge",
      at: ata || (statusId >= 45 ? eta : null),
      eta: eta,
      done: statusId >= 45,
    },
    {
      key: "discharged",
      label: "Discharged from Vessel",
      at: dischargeDate,
      done: statusId >= 50,
    },
  ];
}

/**
 * Turn a ShipsGo GetContainerInfo response into the flat shape the frontend
 * renders (same contract used previously for Terminal49, so the frontend
 * needed no changes).
 */
function normalizeShipsGo({ data, requestNumber, requestId }) {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return { status: "pending", trackingRequestId: requestId };
  }

  // Some ShipsGo responses wrap the payload in an array or a "Data" key.
  const record = Array.isArray(data) ? data[0] : data.Data || data.data || data;

  const statusId = Number(pick(record, ["StatusId", "statusId", "status_id"]));
  if (statusId === 60) {
    return {
      status: "error",
      message:
        "This shipment isn't trackable — the shipping line has no online tracking service, or the number couldn't be matched to a carrier.",
    };
  }

  const polName = pick(record, ["Pol", "POL", "PortOfLoading", "pol"]);
  const podName = pick(record, ["Pod", "POD", "PortOfDischarge", "pod"]);
  const polCoords = findPortCoordsByName(polName);
  const podCoords = findPortCoordsByName(podName);

  const vesselLat = pick(record, ["Latitude", "latitude", "Lat"]);
  const vesselLon = pick(record, ["Longitude", "longitude", "Lng", "Lon"]);

  const containersRaw =
    pick(record, ["Containers", "ContainerList", "containers"]) || [];
  const containerNumbers = Array.isArray(containersRaw)
    ? containersRaw.map((c) => (typeof c === "string" ? c : pick(c, ["ContainerNumber", "Number"])))
    : [];
  if (!containerNumbers.length) {
    const single = pick(record, ["ContainerNumber", "Container"]);
    if (single) containerNumbers.push(single);
  }

  const result = {
    status: "success",
    demo: false,
    shipment: {
      billOfLading: pick(record, ["BlContainersRef", "BLContainersRef", "Bl", "BookingNumber"]) || requestNumber,
      carrier: {
        scac: null,
        name: pick(record, ["ShippingLine", "Carrier", "CarrierName"]),
      },
      vessel: {
        name: pick(record, ["VesselName", "Vessel"]),
        voyage: pick(record, ["Voyage", "VoyageNumber"]),
      },
      pol: {
        name: polName,
        locode: null,
        lat: polCoords ? polCoords.lat : null,
        lon: polCoords ? polCoords.lon : null,
        etd: pick(record, ["Etd", "ETD"]),
        atd: pick(record, ["Atd", "ATD"]),
      },
      pod: {
        name: podName,
        locode: null,
        lat: podCoords ? podCoords.lat : null,
        lon: podCoords ? podCoords.lon : null,
        eta: pick(record, ["Eta", "ETA"]),
        ata: pick(record, ["Ata", "ATA"]),
      },
      milestones: buildMilestones(record),
      statusLabel: STATUS_LABELS[statusId] || null,
    },
    containers: containerNumbers.filter(Boolean).map((number) => ({
      number,
      equipmentType: null,
      weightLbs: null,
      lastFreeDay: null,
      availableForPickup: statusId >= 50,
      holds: [],
      fees: [],
    })),
  };

  if (vesselLat != null && vesselLon != null) {
    result.route = {
      live: true,
      vessel: { lat: Number(vesselLat), lon: Number(vesselLon), name: result.shipment.vessel.name },
      pol: polCoords ? { name: polCoords.name, lat: polCoords.lat, lon: polCoords.lon, label: "POL" } : null,
      pod: podCoords ? { name: podCoords.name, lat: podCoords.lat, lon: podCoords.lon, label: "POD" } : null,
    };
  } else {
    result.route = {
      live: false,
      note: "Live vessel coordinates aren't available for this shipment yet (only shown while a container is actively sailing) — showing origin/destination ports instead.",
      pol: polCoords ? { name: polCoords.name, lat: polCoords.lat, lon: polCoords.lon, label: "POL" } : null,
      pod: podCoords ? { name: podCoords.name, lat: podCoords.lat, lon: podCoords.lon, label: "POD" } : null,
    };
  }

  return result;
}

module.exports = { normalizeShipsGo, pick, STATUS_LABELS };
