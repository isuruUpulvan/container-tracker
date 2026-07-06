// Client for the ShipsGo v1.2 REST API (https://shipsgo.com/api-documentation).
//
// Why v1.2 and not their newer v2: v2 isn't fully/officially documented in a
// stable public spec at the time this was written, while v1.2 has a complete
// official reference (form-encoded POST to create a tracking request, then
// GET to poll for voyage data using the returned requestId). ShipsGo's free
// signup includes 3 tracking credits and, per their own FAQ, "no limitation
// for posting tracking requests; or making a call for getting voyage data" —
// unlike Terminal49's free tier, reads aren't paywalled.

const BASE_URL = "https://shipsgo.com/api/v1.2/ContainerService";

class ShipsGoError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ShipsGoError";
    this.status = status;
    this.body = body;
  }
}

function client(authCode) {
  const fetchImpl = () => globalThis.fetch || require("node-fetch");

  async function postForm(path, params) {
    const fetchFn = fetchImpl();
    const body = new URLSearchParams({ authCode, ...params });
    const res = await fetchFn(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    });
    const text = await res.text();
    return parseResponse(res, text);
  }

  async function get(path, params) {
    const fetchFn = fetchImpl();
    const qs = new URLSearchParams({ authCode, ...params });
    const res = await fetchFn(`${BASE_URL}${path}?${qs.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const text = await res.text();
    return parseResponse(res, text);
  }

  function parseResponse(res, text) {
    let data = null;
    if (text && text.trim()) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        // Some ShipsGo responses are a bare integer (the request id) or plain
        // text rather than JSON.
        data = text.trim();
      }
    }
    if (!res.ok) {
      const message =
        (data && typeof data === "object" && (data.Message || data.message)) ||
        (typeof data === "string" ? data : res.statusText);
      throw new ShipsGoError(message, res.status, data);
    }
    return data;
  }

  return {
    /** Create a tracking request from a container number (simple form). */
    async postContainerInfo({ containerNumber, shippingLine }) {
      return postForm("/PostContainerInfo", { containerNumber, shippingLine });
    },

    /** Create a tracking request from a Master BL or booking number (simple form). */
    async postContainerInfoWithBl({ blContainersRef, shippingLine, containerNumber }) {
      return postForm("/PostContainerInfoWithBl", {
        blContainersRef,
        shippingLine,
        containerNumber: containerNumber || "",
      });
    },

    /** Poll voyage data for a previously created tracking request. */
    async getContainerInfo(requestId, { mapPoint = false } = {}) {
      const params = { requestId };
      if (mapPoint) params.mapPoint = "true";
      return get("/GetContainerInfo/", params);
    },

    /** List of carrier names ShipsGo recognizes for the {shippingLine} field. */
    async getShippingLineList() {
      return get("/GetShippingLineList", {});
    },
  };
}

module.exports = { client, ShipsGoError };
