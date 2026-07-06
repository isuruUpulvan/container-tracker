const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const btn = document.getElementById("search-btn");
const statusArea = document.getElementById("status-area");
const results = document.getElementById("results");
const demoBanner = document.getElementById("demo-banner");

let map = null;
let mapLayers = [];

init();

async function init() {
  try {
    const cfg = await fetch("/api/config").then((r) => r.json());
    if (cfg.demoMode) demoBanner.classList.remove("hidden");
  } catch (e) {
    // non-fatal
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const number = input.value.trim();
  if (!number) return;
  await track(number);
});

async function track(number) {
  setLoading(true);
  results.classList.add("hidden");
  showStatus(`Looking up ${number}…`, false);

  try {
    const res = await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number }),
    });
    const data = await res.json();
    await handleResponse(data);
  } catch (err) {
    showStatus("Something went wrong reaching the server.", true);
  } finally {
    setLoading(false);
  }
}

async function handleResponse(data) {
  if (data.status === "error") {
    showStatus(data.message || "Couldn't find that shipment.", true);
    return;
  }

  if (data.status === "pending") {
    showStatus("Carrier accepted the request — waiting for shipment data (this can take a minute)…", false);
    await pollStatus(data.trackingRequestId);
    return;
  }

  showStatus("", false);
  statusArea.classList.add("hidden");
  renderResult(data);
}

async function pollStatus(trackingRequestId, attempt = 0) {
  if (attempt > 12) {
    showStatus(
      "Still waiting on the carrier. Try searching again in a few minutes — Terminal49 keeps working on it in the background.",
      false
    );
    return;
  }
  await new Promise((r) => setTimeout(r, 5000));
  try {
    const res = await fetch(`/api/track/status/${trackingRequestId}`);
    const data = await res.json();
    if (data.status === "pending") {
      return pollStatus(trackingRequestId, attempt + 1);
    }
    await handleResponse(data);
  } catch (err) {
    showStatus("Lost connection while waiting for shipment data.", true);
  }
}

function setLoading(isLoading) {
  btn.disabled = isLoading;
  btn.textContent = isLoading ? "Tracking…" : "Track";
}

function showStatus(message, isError) {
  if (!message) {
    statusArea.classList.add("hidden");
    return;
  }
  statusArea.classList.remove("hidden");
  statusArea.classList.toggle("error", Boolean(isError));
  statusArea.textContent = message;
}

function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function renderResult(data) {
  results.classList.remove("hidden");

  const { shipment, containers, route } = data;

  document.getElementById("bol-value").textContent = shipment.billOfLading || "—";
  document.getElementById("carrier-value").textContent = shipment.carrier.name
    ? `${shipment.carrier.name} (${shipment.carrier.scac || ""})`
    : "—";
  document.getElementById("vessel-value").textContent = shipment.vessel.name
    ? `${shipment.vessel.name}${shipment.vessel.voyage ? " / " + shipment.vessel.voyage : ""}`
    : "—";

  document.getElementById("pol-name").textContent = shipment.pol.name || "—";
  document.getElementById("pol-date").textContent = shipment.pol.atd
    ? `Departed ${fmtDate(shipment.pol.atd)}`
    : shipment.pol.etd
    ? `ETD ${fmtDate(shipment.pol.etd)}`
    : "";

  document.getElementById("pod-name").textContent = shipment.pod.name || "—";
  document.getElementById("pod-date").textContent = shipment.pod.ata
    ? `Arrived ${fmtDate(shipment.pod.ata)}`
    : shipment.pod.eta
    ? `ETA ${fmtDate(shipment.pod.eta)}`
    : "";

  renderTimeline(shipment.milestones || []);
  renderContainers(containers || []);
  renderMap(route, shipment);
}

function renderTimeline(milestones) {
  const el = document.getElementById("timeline");
  el.innerHTML = "";
  milestones.forEach((m) => {
    const li = document.createElement("li");
    li.className = m.done ? "done" : "";
    const dateLabel = m.at ? fmtDate(m.at) : m.eta ? `Est. ${fmtDate(m.eta)}` : "Pending";
    li.innerHTML = `<div class="milestone-label">${m.label}</div><div class="milestone-date">${dateLabel}</div>`;
    el.appendChild(li);
  });
}

function renderContainers(containers) {
  const el = document.getElementById("containers-list");
  el.innerHTML = "";
  if (!containers.length) {
    el.innerHTML = '<div class="port-date">No container details yet.</div>';
    return;
  }
  containers.forEach((c) => {
    const div = document.createElement("div");
    div.className = "container-item";
    const lfd = c.lastFreeDay ? fmtDate(c.lastFreeDay) : null;
    div.innerHTML = `
      <div class="container-number">${c.number || "Unknown container"}</div>
      <div class="container-meta">
        ${c.equipmentType ? `<span>${c.equipmentType}</span>` : ""}
        ${c.weightLbs ? `<span>${c.weightLbs.toLocaleString()} lbs</span>` : ""}
        ${lfd ? `<span>Last free day: ${lfd}</span>` : ""}
        ${c.availableForPickup ? '<span class="pill">Available for pickup</span>' : ""}
      </div>
    `;
    el.appendChild(div);
  });
}

function renderMap(route, shipment) {
  const note = document.getElementById("map-note");

  if (!map) {
    map = L.map("map", { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 12,
    }).addTo(map);
  }

  mapLayers.forEach((l) => map.removeLayer(l));
  mapLayers = [];

  const bounds = [];

  if (route && route.live && route.geojson) {
    note.textContent = "Live vessel position from Terminal49.";
    route.geojson.features.forEach((feature) => {
      const props = feature.properties || {};
      if (feature.geometry.type === "Point") {
        const [lon, lat] = feature.geometry.coordinates;
        bounds.push([lat, lon]);
        if (props.feature_type === "port") {
          const marker = L.marker([lat, lon]).bindPopup(`<b>${props.label}</b><br>${props.name}`);
          marker.addTo(map);
          mapLayers.push(marker);
        } else if (props.feature_type === "current_vessel") {
          const marker = L.circleMarker([lat, lon], {
            radius: 8,
            color: "#1c4ed8",
            fillColor: "#1c4ed8",
            fillOpacity: 0.9,
          }).bindPopup(`<b>${props.vessel_name || "Vessel"}</b><br>${props.vessel_location_speed || "?"} kn`);
          marker.addTo(map);
          mapLayers.push(marker);
        }
      } else if (feature.geometry.type === "LineString") {
        const coords = feature.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
        coords.forEach((c) => bounds.push(c));
        const isEstimate = props.feature_type !== "past_vessel_locations";
        const line = L.polyline(coords, {
          color: isEstimate ? "#93a3c2" : "#1c4ed8",
          weight: 3,
          dashArray: isEstimate ? "6,8" : null,
        });
        line.addTo(map);
        mapLayers.push(line);
      }
    });
  } else if (route && (route.pol || route.pod)) {
    note.textContent =
      route.note ||
      "Showing origin/destination ports. Live vessel position requires a paid Terminal49 plan.";
    const pol = route.pol;
    const pod = route.pod;
    if (pol) {
      const m = L.marker([pol.lat, pol.lon]).bindPopup(`<b>POL</b><br>${pol.name}`);
      m.addTo(map);
      mapLayers.push(m);
      bounds.push([pol.lat, pol.lon]);
    }
    if (pod) {
      const m = L.marker([pod.lat, pod.lon]).bindPopup(`<b>POD</b><br>${pod.name}`);
      m.addTo(map);
      mapLayers.push(m);
      bounds.push([pod.lat, pod.lon]);
    }
    if (pol && pod) {
      const line = L.polyline(
        [
          [pol.lat, pol.lon],
          [pod.lat, pod.lon],
        ],
        { color: "#93a3c2", weight: 2, dashArray: "6,8" }
      );
      line.addTo(map);
      mapLayers.push(line);
    }
  } else {
    note.textContent = "No map data available for this shipment yet.";
  }

  setTimeout(() => {
    map.invalidateSize();
    if (bounds.length) {
      map.fitBounds(bounds, { padding: [30, 30] });
    } else {
      map.setView([20, 20], 2);
    }
  }, 50);
}
