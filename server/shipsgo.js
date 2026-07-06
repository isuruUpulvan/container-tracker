// Client for the real ShipsGo v2 API (https://api.shipsgo.com/docs/v2/).
//
// Confirmed directly from ShipsGo's official interactive API docs (not the
// older v1.2 REST API, which uses a different auth scheme entirely and
// turned out to be the wrong target — see README for the story):
//   - Base URL: https://api.shipsgo.com/v2
//   - Auth: header `X-Shipsgo-User-Token: <token>` (token from the ShipsGo
//     dashboard's "ShipsGo API" section, labeled "Existing Tokens")
//   - JSON request/response bodies throughout.

const BASE_URL = "https://api.shipsgo.com/v2";

class ShipsGoError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ShipsGoError";
    this.status = status;
    this.body = body;
  }
}

function client(token) {
  const fetchImpl = () => globalThis.fetch || require("node-fetch");

  async function request(method, path, body) {
    const fetchFn = fetchImpl();
    const res = await fetchFn(`${BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Shipsgo-User-Token": token,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let data = null;
    if (text && text.trim()) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { message: text.trim() };
      }
    }

    if (!res.ok) {
      const message = (data && data.message) || res.statusText;
      throw new ShipsGoError(message, res.status, data);
    }

    return data;
  }

  return {
    /**
     * Create (or, per ShipsGo's dedup rules, resolve to an existing) ocean
     * shipment tracking request. Provide container_number OR booking_number.
     * carrier (SCAC) is optional — omit it when unsure and ShipsGo will
     * attempt its own detection from the number.
     */
    async createShipment({ reference, carrier, bookingNumber, containerNumber, followers, tags } = {}) {
      const body = { reference: reference || null };
      if (carrier) body.carrier = carrier;
      if (bookingNumber) body.booking_number = bookingNumber;
      if (containerNumber) body.container_number = containerNumber;
      if (followers) body.followers = followers;
      if (tags) body.tags = tags;
      return request("POST", "/ocean/shipments", body);
    },

    async getShipment(shipmentId) {
      return request("GET", `/ocean/shipments/${shipmentId}`);
    },

    async listShipments(query = "") {
      return request("GET", `/ocean/shipments${query ? `?${query}` : ""}`);
    },

    /** Route/vessel-position map data. Experimental per ShipsGo's docs, but
     * documented as part of standard (non-paid-gated) API access. */
    async getShipmentGeoJson(shipmentId) {
      return request("GET", `/ocean/shipments/${shipmentId}/geojson`);
    },

    async listCarriers() {
      return request("GET", "/ocean/carriers");
    },
  };
}

module.exports = { client, ShipsGoError };
