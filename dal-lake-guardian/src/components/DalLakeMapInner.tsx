"use client";

// ── MUST be top-level imports (never inside render) ──────────────────────
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Polygon,
  CircleMarker,
  Circle,
  Marker,
  Tooltip,
  Popup,
} from "react-leaflet";
import { useState, useEffect, useCallback, Fragment } from "react";
import { STATIONS, SECTORS, getHealthColor, getHealthStatus, DAL_BOUNDS } from "@/lib/constants";

// ── Fix default Leaflet icon URLs broken by webpack asset hashing ─────────
const icon = L.icon({
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize:      [25, 41],
  iconAnchor:    [12, 41],
  popupAnchor:   [1, -34],
  shadowSize:    [41, 41],
});
L.Marker.prototype.options.icon = icon;

// ── Incident data (real Dal Lake GPS points) ──────────────────────────────
const INCIDENTS = [
  { lat: 34.0912, lng: 74.8518, sev: "critical", cat: "Plastic Waste",     id: "DLG-1001" },
  { lat: 34.1080, lng: 74.8610, sev: "high",     cat: "Oil Spill",         id: "DLG-1002" },
  { lat: 34.1055, lng: 74.8548, sev: "critical", cat: "Sewage Discharge",  id: "DLG-1003" },
  { lat: 34.0948, lng: 74.8415, sev: "medium",   cat: "Algae Bloom",       id: "DLG-1004" },
  { lat: 34.1120, lng: 74.8540, sev: "high",     cat: "Water Hyacinth",    id: "DLG-1005" },
  { lat: 34.0875, lng: 74.8490, sev: "low",      cat: "Floating Waste",    id: "DLG-1006" },
  { lat: 34.0990, lng: 74.8620, sev: "medium",   cat: "Illegal Dumping",   id: "DLG-1007" },
  { lat: 34.0800, lng: 74.8510, sev: "high",     cat: "Dead Fish",         id: "DLG-1008" },
  { lat: 34.1350, lng: 74.8550, sev: "high",     cat: "Algae Bloom",       id: "DLG-1009" },
];

const CAMERAS = [
  { lat: 34.0948, lng: 74.8415, label: "CAM-01 · Lokut Dal Ghat",     live: true  },
  { lat: 34.1080, lng: 74.8680, label: "CAM-02 · Nishat Shore",        live: true  },
  { lat: 34.0912, lng: 74.8518, label: "CAM-03 · Lokut Dal Island",    live: false },
  { lat: 34.1055, lng: 74.8548, label: "CAM-04 · Rainawari North",     live: true  },
  { lat: 34.0813, lng: 74.8631, label: "CAM-05 · Boulevard Houseboat", live: false },
];

const SEV_COLOR: Record<string, string> = {
  critical: "#EF4444",
  high:     "#F97316",
  medium:   "#F59E0B",
  low:      "#10B981",
};

// Mock health scores (0-100) per sector
const SECTOR_SCORES: Record<string, number> = {
  hazratbal:  68,
  boddal:     75,
  nishat:     82,
  nigeen:     90,
  lokutdal:   56,
  rainawari:  61,
  boulevard:  72,
  gagribal:   64,
};

// Tile layer definitions
const TILES = {
  osm: {
    url:     "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attr:    "© OpenStreetMap contributors",
    label:   "🗺 MAP",
    opacity: 1,
  },
  satellite: {
    url:     "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attr:    "© Esri · USGS · NOAA",
    label:   "🛰 SAT",
    opacity: 1,
  },
} as const;

export interface DalLakeMapProps {
  showHeatmap?:      boolean; // legacy, maps to general/all
  showAlgaeHeatmap?: boolean;
  showWeedHeatmap?:  boolean;
  showComplaints?:   boolean;
  showCameras?:      boolean;
  showStations?:     boolean;
  showSectors?:      boolean;
  height?:           string;
  onComplaintClick?: (c: (typeof INCIDENTS)[0]) => void;
  // Dynamic overrides from simulation
  simulatedSectors?: Record<string, number>;
  simulatedAlgaePoints?: [number, number][];
  simulatedWeedPoints?: [number, number][];
}

// ── Custom station divIcon (pure HTML, no broken img URLs) ───────────────
function makeStationIcon(color: string, initials: string, isHQ: boolean) {
  const size = isHQ ? 44 : 38;
  return L.divIcon({
    className:  "",
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `
      <div style="
        width:${size}px;height:${size}px;
        background:${color}20;
        border:2.5px solid ${color};
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 0 14px ${color}55,0 0 4px ${color}30;
        font-size:9px;font-weight:800;color:${color};
        font-family:monospace;letter-spacing:.03em;
        position:relative;
      ">
        ${initials}
        ${isHQ ? `<span style="
          position:absolute;top:-3px;right:-3px;
          width:10px;height:10px;
          background:#EF4444;
          border:2px solid #060A0F;
          border-radius:50%;
          animation:dal-pulse 2s ease-in-out infinite;
        "></span>` : ""}
      </div>`,
  });
}

function makeCameraIcon(live: boolean) {
  return L.divIcon({
    className:  "",
    iconSize:   [24, 24],
    iconAnchor: [12, 12],
    html: `<div style="
      width:22px;height:22px;
      background:${live ? "rgba(14,165,233,.15)" : "rgba(100,116,139,.15)"};
      border:1.5px solid ${live ? "#0EA5E9" : "#64748B"};
      border-radius:5px;
      display:flex;align-items:center;justify-content:center;
      font-size:12px;
    ">📷</div>`,
  });
}

// ── Main inner component ─────────────────────────────────────────────────

export default function DalLakeMapInner({
  showHeatmap        = false,
  showAlgaeHeatmap   = true,
  showWeedHeatmap    = true,
  showComplaints     = true,
  showCameras        = false,
  showStations       = true,
  showSectors        = true,
  height             = "460px",
  onComplaintClick,
  simulatedSectors,
  simulatedAlgaePoints,
  simulatedWeedPoints,
}: DalLakeMapProps) {
  const [tile,   setTile]   = useState<keyof typeof TILES>("osm");
  const [isDark, setIsDark] = useState(true);
  const [layers, setLayers] = useState({
    sectors:       showSectors,
    algaeHeatmap:  showAlgaeHeatmap,
    weedHeatmap:   showWeedHeatmap,
    complaints:    showComplaints,
    stations:      showStations,
    cameras:       showCameras,
  });
  const [selected, setSelected] = useState<string | null>(null);

  // Sync dark/light from html.light class
  useEffect(() => {
    const check = () => setIsDark(!document.documentElement.classList.contains("light"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const toggleLayer = useCallback(
    (k: keyof typeof layers) => setLayers((p) => ({ ...p, [k]: !p[k] })),
    []
  );

  const DAL_CENTER: [number, number] = [DAL_BOUNDS.center.lat, DAL_BOUNDS.center.lon];


  // Tooltip box styles based on theme
  const TT: React.CSSProperties = {
    background:   isDark ? "#111820" : "#ffffff",
    border:       `1px solid ${isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.10)"}`,
    borderRadius: 8,
    color:        isDark ? "#E2E8F0" : "#0F172A",
    padding:      "8px 11px",
    fontFamily:   "'Space Grotesk', system-ui, sans-serif",
    boxShadow:    isDark ? "0 4px 16px rgba(0,0,0,.5)" : "0 4px 16px rgba(0,0,0,.12)",
  };

  return (
    <div style={{ position: "relative", height, borderRadius: 14, overflow: "hidden" }}>
      {/* Pulse keyframe injected once */}
      <style>{`
        @keyframes dal-pulse {
          0%,100%{ opacity:1; transform:scale(1); }
          50%    { opacity:.45; transform:scale(1.5); }
        }
        .leaflet-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-tooltip::before { display:none !important; }
        .leaflet-popup-content-wrapper {
          border-radius:10px !important;
          background: ${isDark ? "#111820" : "#fff"} !important;
          color: ${isDark ? "#E2E8F0" : "#0F172A"} !important;
          border: 1px solid ${isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.10)"} !important;
          box-shadow: 0 8px 32px rgba(0,0,0,.4) !important;
        }
        .leaflet-popup-tip { background: ${isDark ? "#111820" : "#fff"} !important; }
        .leaflet-popup-close-button { color: ${isDark ? "#94A3B8" : "#64748B"} !important; }
      `}</style>

      {/* ── Leaflet Map ── */}
      <MapContainer
        center={DAL_CENTER}
        zoom={12.5}
        minZoom={11.5}
        maxZoom={17}
        maxBounds={[
          [DAL_BOUNDS.minLat - 0.005, DAL_BOUNDS.minLon - 0.005],
          [DAL_BOUNDS.maxLat + 0.005, DAL_BOUNDS.maxLon + 0.005]
        ]}
        maxBoundsViscosity={1.0}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
      >
        {/* Base tile layer */}
        <TileLayer
          key={tile}
          url={TILES[tile].url}
          maxZoom={18}
          opacity={TILES[tile].opacity}
        />

        {/* Labels overlay for satellite */}
        {tile === "satellite" && (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
            opacity={0.7}
          />
        )}

        {/* ── Sector Polygons & Labels ─────────────────── */}
        {layers.sectors && Object.entries(SECTORS).map(([sid, sec]) => {
          // Use simulated health score if provided, otherwise fallback to static mock score
          const score    = simulatedSectors ? (simulatedSectors[sid] ?? 65) : (SECTOR_SCORES[sid] ?? 65);
          const color    = sec.color ?? getHealthColor(score);
          const isSel    = selected === sid;
          const station  = STATIONS.find((s) => s.id === sec.stationId);
          const hStatus  = getHealthStatus(score);
          const shortName = sec.label.split(" (")[0];

          return (
            <Fragment key={`${sid}-${score}-${isSel}`}>
              <Polygon
                positions={sec.polygon as [number, number][]}
                pathOptions={{
                  color:       color,
                  fillColor:   color,
                  fillOpacity: isSel ? 0.22 : 0.10,
                  weight:      isSel ? 2.5  : 1.5,
                  dashArray:   isSel ? undefined : "7 4",
                  opacity:     0.9,
                }}
                eventHandlers={{
                  click:     () => setSelected(isSel ? null : sid),
                  mouseover: (e) => (e.target as any).setStyle({ fillOpacity: 0.20 }),
                  mouseout:  (e) => (e.target as any).setStyle({ fillOpacity: isSel ? 0.22 : 0.10 }),
                }}
              >
                <Tooltip sticky>
                  <div style={TT}>
                    <div style={{ fontWeight: 700, fontSize: 13, color, marginBottom: 3 }}>{sec.label}</div>
                    <div style={{ fontSize: 12 }}>
                      Health:&nbsp;
                      <strong style={{ color: getHealthColor(score), fontFamily: "monospace" }}>
                        {score}/100
                      </strong>
                    </div>
                    <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>
                      {score >= 80 ? "● Healthy (Swim & Drink Safe)" : score >= 60 ? "⚠ Warning (Boating Only)" : score >= 40 ? "🔴 Critical (Do Not Swim/Consume!)" : "🚨 Emergency (Extreme Pollution!)"}
                    </div>
                    {station && (
                      <div style={{ fontSize: 11, marginTop: 5, paddingTop: 5, borderTop: "1px solid rgba(128,128,128,.2)" }}>
                        Station:&nbsp;<strong style={{ color: station.color }}>{station.short}</strong>
                        &nbsp;·&nbsp;{station.workers} crew
                      </div>
                    )}
                  </div>
                </Tooltip>
              </Polygon>

              {/* Floating Sector Label */}
              <Marker
                position={sec.center}
                interactive={false}
                icon={L.divIcon({
                  className: "custom-sector-label-icon",
                  html: `
                    <div style="
                      text-align: center;
                      transform: translate(-50%, -50%);
                      pointer-events: none;
                      white-space: nowrap;
                    ">
                      <div style="
                        font-family: 'Inter', system-ui, sans-serif;
                        font-weight: 700;
                        font-size: 10px;
                        color: #EDE6D6;
                        letter-spacing: 0.05em;
                        text-transform: uppercase;
                        text-shadow: 0 0 3px #0B1F22, 0 0 5px #0B1F22, 0 0 7px #0B1F22;
                      ">${shortName}</div>
                      <div style="
                        font-family: 'Space Grotesk', monospace;
                        font-weight: 700;
                        font-size: 10px;
                        color: ${color};
                        margin-top: 1px;
                        text-shadow: 0 0 3px #0B1F22, 0 0 5px #0B1F22;
                      ">${score} (${hStatus.label.toUpperCase()})</div>
                    </div>
                  `
                })}
              />
            </Fragment>
          );
        })}

        {/* ── Algae Bloom Heatmap ──────────────────────── */}
        {layers.algaeHeatmap && (simulatedAlgaePoints || INCIDENTS.filter(i => i.cat === "Algae Bloom")).map((pt: any, i) => {
          const lat = pt.lat !== undefined ? pt.lat : pt[0];
          const lng = pt.lng !== undefined ? pt.lng : pt[1];
          return (
            <Circle
              key={`algae-${i}`}
              center={[lat, lng]}
              radius={100}
              pathOptions={{
                color:       "transparent",
                fillColor:   "#10B981", // Bright Green
                fillOpacity: 0.22,
              }}
            />
          );
        })}

        {/* ── Weed Invasion Heatmap ────────────────────── */}
        {layers.weedHeatmap && (simulatedWeedPoints || INCIDENTS.filter(i => i.cat === "Water Hyacinth")).map((pt: any, i) => {
          const lat = pt.lat !== undefined ? pt.lat : pt[0];
          const lng = pt.lng !== undefined ? pt.lng : pt[1];
          return (
            <Circle
              key={`weed-${i}`}
              center={[lat, lng]}
              radius={110}
              pathOptions={{
                color:       "transparent",
                fillColor:   "#F59E0B", // Brownish/Amber
                fillOpacity: 0.20,
              }}
            />
          );
        })}

        {/* ── Incident Hotspots (Shaded Outbreaks) ────────── */}
        {layers.complaints && INCIDENTS.map((inc, i) => (
          <Circle
            key={`c${i}`}
            center={[inc.lat, inc.lng]}
            radius={90}
            pathOptions={{
              color:       "transparent",
              fillColor:   SEV_COLOR[inc.sev] ?? "#F59E0B",
              fillOpacity: 0.25,
              weight:      0,
            }}
            eventHandlers={{ click: () => onComplaintClick?.(inc) }}
          >
            <Tooltip sticky>
              <div style={TT}>
                <div style={{ fontWeight: 700, fontSize: 11, fontFamily: "monospace", marginBottom: 2 }}>{inc.id}</div>
                <div style={{ fontSize: 12 }}>{inc.cat}</div>
                <div style={{ fontSize: 10, marginTop: 3, fontWeight: 700, color: SEV_COLOR[inc.sev], textTransform: "uppercase" }}>
                  ● {inc.sev}
                </div>
              </div>
            </Tooltip>
          </Circle>
        ))}

        {/* ── Station Markers ──────────────────────────── */}
        {layers.stations && STATIONS.map((sta) => {
          const isHQ     = sta.id === "STA-LD";
          const initials = sta.short.split(" ").map((w: string) => w[0]).join("").slice(0, 3).toUpperCase();
          return (
            <Marker
              key={sta.id}
              position={[sta.lat, sta.lon] as [number, number]}
              icon={makeStationIcon(sta.color, initials, isHQ)}
            >
              <Popup minWidth={220}>
                <div style={{ fontFamily: "'Space Grotesk',system-ui,sans-serif", padding: "4px 2px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: sta.color, flexShrink: 0 }} />
                    <strong style={{ fontSize: 14, color: sta.color }}>{sta.short}</strong>
                    {isHQ && (
                      <span style={{
                        fontSize: 9, padding: "2px 5px", borderRadius: 99,
                        background: "rgba(239,68,68,.15)", color: "#EF4444",
                        border: "1px solid rgba(239,68,68,.3)", fontWeight: 700,
                      }}>
                        HQ
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{sta.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 6 }}>{sta.sector}</div>
                  <div style={{ fontSize: 11, opacity: 0.8, borderTop: "1px solid rgba(128,128,128,.15)", paddingTop: 6 }}>
                    <div>Cmdr: <strong>{sta.commander}</strong></div>
                    <div style={{ marginTop: 2 }}>Workers: <strong>{sta.workers}</strong> deployed</div>
                    <div style={{ marginTop: 4, fontSize: 10, opacity: 0.6, lineHeight: 1.5 }}>
                      {(sta as any).description}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* ── Camera Markers ───────────────────────────── */}
        {layers.cameras && CAMERAS.map((cam, i) => (
          <Marker
            key={`cam${i}`}
            position={[cam.lat, cam.lng] as [number, number]}
            icon={makeCameraIcon(cam.live)}
            eventHandlers={{
              click: () => {
                if ((onComplaintClick as any)?.onCameraClick) {
                  (onComplaintClick as any).onCameraClick(cam);
                } else if ((onComplaintClick as any)?.onCameraSelect) {
                  (onComplaintClick as any).onCameraSelect(cam);
                }
              }
            }}
          >
            <Tooltip sticky>
              <div style={TT}>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{cam.label}</div>
                <div style={{ fontSize: 10, marginTop: 2, fontWeight: 700, color: cam.live ? "#0EA5E9" : "#64748B" }}>
                  {cam.live ? "● LIVE" : "○ Offline"}
                </div>
              </div>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>

      {/* ── Top-left badge ──────────────────────────────── */}
      <div style={{
        position: "absolute", top: 10, left: 10, zIndex: 1000,
        display: "flex", alignItems: "center", gap: 6,
        background: isDark ? "rgba(6,10,15,.82)" : "rgba(255,255,255,.88)",
        border: `1px solid ${isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.09)"}`,
        borderRadius: 7, padding: "4px 10px",
        backdropFilter: "blur(12px)",
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "#10B981", display: "inline-block",
          animation: "dal-pulse 2s ease-in-out infinite",
        }} />
        <span style={{
          fontFamily: "monospace", fontSize: 10, letterSpacing: ".06em",
          color: isDark ? "#94A3B8" : "#334155",
          textTransform: "uppercase",
        }}>
          {TILES[tile].label.replace(/^[^ ]+ /, "")} · Dal Lake · Live
        </span>
      </div>

      {/* ── Top-right tile switcher ──────────────────────── */}
      <div style={{
        position: "absolute", top: 10, right: 10, zIndex: 1000,
        display: "flex", gap: 4,
      }}>
        {(Object.keys(TILES) as (keyof typeof TILES)[]).map((t) => (
          <button
            key={t}
            onClick={() => setTile(t)}
            style={{
              padding: "4px 10px",
              fontSize: 10,
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: ".05em",
              borderRadius: 6,
              border: `1px solid ${t === tile
                ? "rgba(14,165,233,.7)"
                : isDark ? "rgba(255,255,255,.09)" : "rgba(0,0,0,.10)"}`,
              background: t === tile
                ? "rgba(14,165,233,.16)"
                : isDark ? "rgba(6,10,15,.80)" : "rgba(255,255,255,.80)",
              color: t === tile ? "#0EA5E9" : isDark ? "#94A3B8" : "#475569",
              cursor: "pointer",
              backdropFilter: "blur(12px)",
              transition: "all .14s ease",
              textTransform: "uppercase",
            }}
          >
            {TILES[t].label}
          </button>
        ))}
      </div>

      {/* ── Bottom-left layer toggles ─────────────────────── */}
      <div style={{
        position: "absolute", bottom: 14, left: 10, zIndex: 1000,
        display: "flex", flexDirection: "column", gap: 4,
      }}>
        {([
          ["sectors",       "Sectors"],
          ["algaeHeatmap",  "Algae Bloom Heatmap"],
          ["weedHeatmap",   "Weed Invasion Heatmap"],
          ["complaints",    "Incidents"],
          ["stations",      "Stations Network"],
          ["cameras",       "Cameras"],
        ] as const).map(([key, label]) => {
          const on = layers[key];
          return (
            <button
              key={key}
              onClick={() => toggleLayer(key)}
              style={{
                padding: "3px 8px",
                fontSize: 10, fontFamily: "monospace", fontWeight: 700,
                letterSpacing: ".04em", textTransform: "uppercase",
                borderRadius: 5,
                border: `1px solid ${on ? "rgba(14,165,233,.45)" : isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.09)"}`,
                background: on
                  ? "rgba(14,165,233,.13)"
                  : isDark ? "rgba(6,10,15,.78)" : "rgba(255,255,255,.78)",
                color: on ? "#0EA5E9" : isDark ? "#64748B" : "#94A3B8",
                cursor: "pointer",
                backdropFilter: "blur(12px)",
                transition: "all .14s ease",
              }}
            >
              {on ? "✓ " : "○ "}{label}
            </button>
          );
        })}
      </div>

      {/* ── Bottom-right legend ──────────────────────────── */}
      <div style={{
        position: "absolute", bottom: 14, right: 10, zIndex: 1000,
        background: isDark ? "rgba(6,10,15,.82)" : "rgba(255,255,255,.88)",
        border: `1px solid ${isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.09)"}`,
        borderRadius: 9, padding: "10px 12px",
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontFamily: "monospace", color: isDark ? "#475569" : "#94A3B8", marginBottom: 6 }}>
          Health Index
        </div>
        {[
          ["#10B981", "Healthy (80–100)"],
          ["#F59E0B", "Warning (60–79)"],
          ["#EF4444", "Critical (40–59)"],
          ["#7F1D1D", "Emergency (<40)"],
        ].map(([color, label]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontFamily: "monospace", color: isDark ? "#94A3B8" : "#475569" }}>{label}</span>
          </div>
        ))}
        <div style={{ borderTop: `1px solid ${isDark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.07)"}`, marginTop: 7, paddingTop: 7 }}>
          {[
            ["#10B981", "Algae Bloom Area"],
            ["#F59E0B", "Weed Cover Area"],
            ["#EF4444", "Active Incident Alert"],
            ["#0EA5E9", "Patrol/Command Post"]
          ].map(([color, label]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontFamily: "monospace", color: isDark ? "#64748B" : "#94A3B8" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
