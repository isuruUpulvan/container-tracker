const BASE_URL = "https://api.terminal49.com/v2";

class Terminal49Error extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "Terminal49Error";
    this.status = status;
    this.body = body;
  }
}

function client(apiKey) {
  async function request(path, options = {}) {
    const fetchImpl = globalThis.fetch || require("node-fetch");
    const res = await fetchImpl(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/vnd.api+json",
        ...(options.headers || {}),
      },
    });

    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch (e) {
      json = { raw: text };
    }

    if (!res.ok) {
      const detail =
        (json.errors && json.errors[0] && json.errors[0].detail) ||
        res.statusText;
      throw new Terminal49Error(detail, res.status, json);
    }

    return json;
  }

  return {
    /** Predict carrier SCAC + number type from a raw tracking number. */
    async inferNumber(number) {
      return request("/tracking_requests/infer_number", {
        method: "POST",
        body: JSON.stringify({ number }),
      });
    },

    /** Create a tracking request for a BOL / booking / container number. */
    async createTrackingRequest({ requestNumber, scac, requestType }) {
      return request("/tracking_requests", {
        method: "POST",
        body: JSON.stringify({
          data: {
            type: "tracking_request",
            attributes: {
              request_number: requestNumber,
              scac,
              request_type: requestType,
            },
          },
        }),
      });
    },

    async getTrackingRequest(id) {
      return request(`/tracking_requests/${id}`, { method: "GET" });
    },

    /** List existing tracking requests, optionally filtered by request_number. */
    async listTrackingRequests() {
      return request("/tracking_requests", { method: "GET" });
    },

    async getShipment(id, include) {
      const qs = include ? `?include=${include}` : "";
      return request(`/shipments/${id}${qs}`, { method: "GET" });
    },

    async getContainer(id) {
      return request(`/containers/${id}`, { method: "GET" });
    },

    /**
     * Live route / vessel position GeoJSON. This requires the paid
     * "Routing Data" entitlement on the Terminal49 account. On free
     * developer keys this will throw a Terminal49Error with status 403 —
     * callers should catch that and fall back to static port coordinates.
     */
    async getContainerMapGeoJSON(containerId) {
      return request(`/containers/${containerId}/map_geojson`, {
        method: "GET",
      });
    },
  };
}

module.exports = { client, Terminal49Error };
