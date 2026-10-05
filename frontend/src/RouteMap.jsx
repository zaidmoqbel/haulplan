import { useEffect, useRef } from "react";
import L from "leaflet";
import { feature } from "topojson-client";
import atlas from "us-atlas/states-10m.json";
import { Expand, MapPin } from "lucide-react";
import { duration, stamp, shortPlace } from "./utils";

export default function RouteMap({ plan }) {
  const container = useRef(null),
    map = useRef(null),
    layer = useRef(null),
    bounds = useRef(null);
  useEffect(() => {
    map.current = L.map(container.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      minZoom: 3,
      maxZoom: 14,
    }).setView([38, -94], 4);
    L.control.zoom({ position: "bottomright" }).addTo(map.current);
    const states = feature(atlas, atlas.objects.states);
    L.geoJSON(states, {
      style: (f) => ({
        color: "#f9fbf6",
        weight: 1.6,
        fillColor: ["#e5ebda", "#e9eddc", "#e0e8d7", "#e8eddf"][
          Number(f.id) % 4
        ],
        fillOpacity: 1,
      }),
      onEachFeature: (f, l) => {
        const center = l.getBounds().getCenter();
        if (center.lat < 50 && center.lng < -67 && center.lng > -126) {
          L.marker(center, {
            icon: L.divIcon({
              className: "state-label",
              html: f.properties.name,
              iconSize: [100, 16],
              iconAnchor: [50, 8],
            }),
            interactive: false,
            keyboard: false,
          }).addTo(map.current);
        }
      },
    }).addTo(map.current);
    map.current.attributionControl.addAttribution(
      'Boundaries: <a href="https://github.com/topojson/us-atlas">US Census / us-atlas</a> · Route: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    );
    const resize = new ResizeObserver(() => map.current?.invalidateSize());
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      map.current.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!plan || !map.current) return;
    if (layer.current) layer.current.remove();
    layer.current = L.layerGroup().addTo(map.current);
    const path = plan.route.geometry.map(([lon, lat]) => [lat, lon]);
    L.polyline(path, { color: "#ffffff", weight: 8, opacity: 0.95 }).addTo(
      layer.current,
    );
    L.polyline(path, { color: "#287a62", weight: 4.5, opacity: 1 }).addTo(
      layer.current,
    );
    const popup = (text) => {
      const el = document.createElement("div");
      el.textContent = text;
      return el;
    };
    plan.events
      .filter(
        (e) =>
          e.status !== "driving" && !["pickup", "dropoff"].includes(e.kind),
      )
      .forEach((e) => {
        const [lon, lat] = e.coordinate;
        L.circleMarker([lat, lon], {
          radius: 6,
          color: "#fff",
          weight: 2,
          fillColor: e.kind === "fuel" ? "#c47730" : "#28645a",
          fillOpacity: 1,
        })
          .bindPopup(
            popup(
              `${e.label} • ${stamp(e.start, plan.base_date)} • ${duration(e.end - e.start)}. ${e.location}. Verify a suitable stopping place.`,
            ),
          )
          .addTo(layer.current);
      });
    plan.places.forEach((p, i) => {
      const icon = L.divIcon({
        className: "route-pin",
        html: `<span class="pin pin-${i}">${["A", "P", "B"][i]}</span>`,
        iconSize: [32, 38],
        iconAnchor: [16, 35],
      });
      L.marker([p.lat, p.lon], {
        icon,
        alt: `${["Start", "Pickup", "Delivery"][i]}: ${p.name}`,
      })
        .bindPopup(popup(`${["Start", "Pickup", "Delivery"][i]}: ${p.name}`))
        .bindTooltip(popup(shortPlace(p.name)), {
          permanent: true,
          direction: "right",
          offset: [15, -19],
          className: "city-label",
        })
        .addTo(layer.current);
    });
    bounds.current = L.latLngBounds(path);
    map.current.fitBounds(bounds.current, { padding: [48, 48] });
  }, [plan]);
  return (
    <div className="map-wrap">
      <div ref={container} className="map" aria-label="Trip route map" />
      <div className="map-label">
        <span className="live-dot" /> {plan?.route.source || "Route preview"}
      </div>
      <button
        className="map-fit"
        aria-label="Fit route to map"
        onClick={() =>
          bounds.current &&
          map.current.fitBounds(bounds.current, { padding: [48, 48] })
        }
      >
        <Expand size={17} />
      </button>
      {plan && (
        <div className="map-caption">
          <MapPin size={15} />
          <span>
            {shortPlace(plan.places[0].name)} <b>→</b>{" "}
            {shortPlace(plan.places[2].name)}
          </span>
        </div>
      )}
    </div>
  );
}
