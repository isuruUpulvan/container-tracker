const { getPortCoords } = require("./ports");

/** Find an included resource by type + id from a JSON:API response. */
function findIncluded(included, type, id) {
  if (!included || !id) return null;
  return included.find((r) => r.type === type && r.id === id) || null;
}

function buildMilestones(attrs, containerAttrs) {
  const m = [];
  m.push({
    key: "pol_departed",
    label: "Departed Port of Loading",
    at: attrs.pol_atd_at || null,
    eta: attrs.pol_etd_at || null,
    done: Boolean(attrs.pol_atd_at),
  });
  m.push({
    key: "pod_arrived",
    label: "Arrived at Port of Discharge",
    at: attrs.pod_ata_at || null,
    eta: attrs.pod_eta_at || null,
    done: Boolean(attrs.pod_ata_at),
  });
  if (containerAttrs) {
    m.push({
      key: "discharged",
      label: "Discharged from Vessel",
      at: containerAttrs.pod_discharged_at || null,
      done: Boolean(containerAttrs.pod_discharged_at),
    });
    m.push({
      key: "available",
      label: "Available for Pickup",
      at: containerAttrs.available_for_pickup ? containerAttrs.pod_discharged_at : null,
      done: Boolean(containerAttrs.available_for_pickup),
    });
    m.push({
      key: "full_out",
      label: "Full Out (Picked Up)",
      at: containerAttrs.pod_full_out_at || containerAttrs.final_destination_full_out_at || null,
      done: Boolean(containerAttrs.pod_full_out_at || containerAttrs.final_destination_full_out_at),
    });
    m.push({
      key: "empty_returned",
      label: "Empty Returned",
      at: containerAttrs.empty_terminated_at || null,
      done: Boolean(containerAttrs.empty_terminated_at),
    });
  }
  return m;
}

/**
 * Turn a Terminal49 /shipments/{id}?include=... response, plus optional
 * live route GeoJSON, into the flat shape the frontend renders.
 */
function normalizeShipment({ shipmentDoc, geojson }) {
  const shipment = shipmentDoc.data;
  const included = shipmentDoc.included || [];
  const attrs = shipment.attributes;

  const containerRefs =
    (shipment.relationships &&
      shipment.relationships.containers &&
      shipment.relationships.containers.data) ||
    [];
  const containers = containerRefs
    .map((ref) => findIncluded(included, "container", ref.id))
    .filter(Boolean);

  const primaryContainerAttrs = containers[0] ? containers[0].attributes : null;

  const polCoords = getPortCoords(attrs.port_of_lading_locode);
  const podCoords = getPortCoords(attrs.port_of_discharge_locode);

  const result = {
    status: "success",
    demo: false,
    shipment: {
      billOfLading: attrs.bill_of_lading_number,
      carrier: { scac: attrs.shipping_line_scac, name: attrs.shipping_line_name },
      vessel: { name: attrs.pod_vessel_name || null, voyage: attrs.pod_voyage_number || null },
      pol: {
        name: attrs.port_of_lading_name,
        locode: attrs.port_of_lading_locode,
        lat: polCoords ? polCoords.lat : null,
        lon: polCoords ? polCoords.lon : null,
        etd: attrs.pol_etd_at,
        atd: attrs.pol_atd_at,
      },
      pod: {
        name: attrs.port_of_discharge_name,
        locode: attrs.port_of_discharge_locode,
        lat: podCoords ? podCoords.lat : null,
        lon: podCoords ? podCoords.lon : null,
        eta: attrs.pod_eta_at,
        ata: attrs.pod_ata_at,
      },
      milestones: buildMilestones(attrs, primaryContainerAttrs),
    },
    containers: containers.map((c) => ({
      number: c.attributes.number,
      equipmentType: c.attributes.equipment_type,
      weightLbs: c.attributes.weight_in_lbs,
      lastFreeDay: c.attributes.pickup_lfd,
      availableForPickup: c.attributes.available_for_pickup,
      holds: c.attributes.holds_at_pod_terminal || [],
      fees: c.attributes.fees_at_pod_terminal || [],
    })),
  };

  // Route / map data: prefer live GeoJSON (paid entitlement), else fall
  // back to static port coordinates for a simple origin -> destination view.
  if (geojson && Array.isArray(geojson.features) && geojson.features.length) {
    result.route = { live: true, geojson };
  } else {
    result.route = {
      live: false,
      note:
        "Live vessel position requires a Terminal49 paid Routing Data plan. Showing origin/destination ports instead.",
      pol: polCoords
        ? { name: polCoords.name, lat: polCoords.lat, lon: polCoords.lon, label: "POL" }
        : null,
      pod: podCoords
        ? { name: podCoords.name, lat: podCoords.lat, lon: podCoords.lon, label: "POD" }
        : null,
    };
  }

  return result;
}

module.exports = { normalizeShipment, findIncluded };
