"use client";

import { useEffect, useRef, useState } from "react";
import { STATIONS, getHealthColor, getHealthStatus } from "@/lib/constants";

// SEV_COLOR config
const SEV_COLOR: Record<string, string> = {
  critical: "#EF4444",
  high:     "#F97316",
  medium:   "#F59E0B",
  low:      "#10B981",
};
const CAMERAS = [
  { lat: 34.0948, lng: 74.8415, label: "CAM-01 · Lokut Dal Ghat",     live: true  },
  { lat: 34.1080, lng: 74.8680, label: "CAM-02 · Nishat Shore",        live: true  },
  { lat: 34.0912, lng: 74.8518, label: "CAM-03 · Lokut Dal Island",    live: false },
  { lat: 34.1055, lng: 74.8548, label: "CAM-04 · Rainawari North",     live: true  },
  { lat: 34.0813, lng: 74.8631, label: "CAM-05 · Boulevard Houseboat", live: false },
];

interface CesiumTwinProps {
  simulatedSectors?: Record<string, number>;
  timeSliderIndex?: number; // 0: past, 1: current, 2: +7d, 3: +14d
}

export default function DalLakeCesiumTwin({ simulatedSectors, timeSliderIndex = 1 }: CesiumTwinProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const viewerRef = useRef<any>(null);
  const prevSectorsRef = useRef<string>("");

  // Time metrics
  const isPast = timeSliderIndex === 0;
  const isCurrent = timeSliderIndex === 1;
  const isForecast7 = timeSliderIndex === 2;
  const isForecast14 = timeSliderIndex === 3;

  // Modeling coefficients
  const diffusionMultiplier = isPast ? 0.7 : isCurrent ? 1.0 : isForecast7 ? 1.7 : 2.5;

  useEffect(() => {
    if (typeof window === "undefined") return;

    (window as any).CESIUM_BASE_URL = "/cesium";

    let link: HTMLLinkElement | null = null;
    let script: HTMLScriptElement | null = null;

    const initCesium = () => {
      const Cesium = (window as any).Cesium;
      if (!Cesium || !containerRef.current) return;

      Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2YWM0NzAwMy03ZThlLTQzZjMtOTA1Ni0yMmRlNDE2OGNhMWYiLCJpZCI6NDU1ODgxLCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3ODM5MzkyODB9.i9tOgCCXqSrMw_MU92PrygIjzP11JIQeb0dWQn2h90M";

      try {
        const viewer = new Cesium.Viewer(containerRef.current, {
          terrainProvider: new Cesium.EllipsoidTerrainProvider(),
          animation: false,
          timeline: false,
          infoBox: false,
          selectionIndicator: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          navigationHelpButton: false,
          sceneModePicker: false,
          geocoder: false,
          homeButton: false,
          creditContainer: document.createElement("div"),
        });

        viewerRef.current = viewer;
        setLoading(false);

        // Keep objects sitting correctly on elevation and prevent clipping
        viewer.scene.globe.depthTestAgainstTerrain = true;

        Cesium.createWorldTerrainAsync().then((tp: any) => {
          viewer.terrainProvider = tp;
        }).catch((e: any) => console.log("Terrain load error:", e));

        Cesium.createOsmBuildingsAsync().then((buildings: any) => {
          viewer.scene.primitives.add(buildings);
        }).catch((e: any) => console.log("OSM Buildings load error:", e));

        // Dynamically compute viewbounds from GeoJSON boundary envelope
        fetch("/geojson/dal-lake-boundary.json")
          .then(res => res.json())
          .then(boundaryJson => {
            const coords = boundaryJson.features[0].geometry.coordinates[0];
            let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
            coords.forEach(([lon, lat]: [number, number]) => {
              if (lon < minLon) minLon = lon;
              if (lon > maxLon) maxLon = lon;
              if (lat < minLat) minLat = lat;
              if (lat > maxLat) maxLat = lat;
            });

            const centerLon = (minLon + maxLon) / 2;
            const centerLat = (minLat + maxLat) / 2;
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(centerLon, centerLat - 0.024, 6200),
              orientation: {
                heading: Cesium.Math.toRadians(0.0),
                pitch: Cesium.Math.toRadians(-36.0),
                roll: 0.0
              },
              duration: 0
            });

            // Set dynamic camera zoom limits
            viewer.scene.screenSpaceCameraController.maximumZoomDistance = 8500.0;
            viewer.scene.screenSpaceCameraController.minimumZoomDistance = 400.0;
            viewer.scene.screenSpaceCameraController.enableCollisionDetection = true;

            // Camera bounds constraint handler
            let isAdjusting = false;
            viewer.camera.changed.addEventListener(() => {
              if (isAdjusting) return;
              const cameraPosition = viewer.camera.positionCartographic;
              const lon = Cesium.Math.toDegrees(cameraPosition.longitude);
              const lat = Cesium.Math.toDegrees(cameraPosition.latitude);

              let corrected = false;
              let newLon = lon;
              let newLat = lat;

              const padLon = 0.045;
              const padLat = 0.045;

              if (lon < minLon - padLon) { newLon = minLon - padLon; corrected = true; }
              if (lon > maxLon + padLon) { newLon = maxLon + padLon; corrected = true; }
              if (lat < minLat - padLat) { newLat = minLat - padLat; corrected = true; }
              if (lat > maxLat + padLat) { newLat = maxLat + padLat; corrected = true; }

              if (corrected) {
                isAdjusting = true;
                viewer.camera.setView({
                  destination: Cesium.Cartesian3.fromRadians(
                    Cesium.Math.toRadians(newLon),
                    Cesium.Math.toRadians(newLat),
                    cameraPosition.height
                  ),
                  orientation: {
                    heading: viewer.camera.heading,
                    pitch: viewer.camera.pitch,
                    roll: viewer.camera.roll
                  }
                });
                setTimeout(() => { isAdjusting = false; }, 60);
              }
            });
          });

        // Initialize layers
        updateLayers(viewer, Cesium);
      } catch (err: any) {
        console.error("Cesium Viewer initialization error:", err);
        setError(err.message || "Failed to initialize Cesium.");
        setLoading(false);
      }
    };

    if (!(window as any).Cesium) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "/cesium/Widgets/widgets.css";
      document.head.appendChild(link);

      script = document.createElement("script");
      script.src = "/cesium/Cesium.js";
      script.async = true;
      script.onload = initCesium;
      script.onerror = () => {
        setError("Failed to load Cesium libraries locally.");
        setLoading(false);
      };
      document.body.appendChild(script);
    } else {
      initCesium();
    }

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  const updateLayers = (viewer: any, Cesium: any) => {
    if (!viewer) return;

    viewer.entities.removeAll();
    viewer.dataSources.removeAll();

    // 1. Load contiguous shoreline sectors from GeoJSON file dynamically
    Cesium.GeoJsonDataSource.load("/geojson/dal-sectors.json").then((dataSource: any) => {
      viewer.dataSources.add(dataSource);
      const entities = dataSource.entities.values;

      entities.forEach((entity: any) => {
        const sid = entity.id; // e.g. "hazratbal"
        const score = simulatedSectors ? (simulatedSectors[sid] ?? 65) : 65;
        const color = entity.properties.color?.getValue() || "#0EA5E9";
        const center = entity.properties.center?.getValue() || [34.11, 74.85];
        const hStatus = getHealthStatus(score);
        const shortName = entity.name?.split(" (")[0] || sid;

        // Custom translucent water shader styling
        entity.polygon.material = Cesium.Color.fromCssColorString("#0EA5E9").withAlpha(0.15);
        entity.polygon.classificationType = Cesium.ClassificationType.TERRAIN;
        entity.polygon.outline = false; // Disable default outlines to draw custom thick outlines

        // Extract boundaries hierarchy to draw custom thick ground outlines
        const hierarchy = entity.polygon.hierarchy.getValue();
        const points = hierarchy.positions;

        viewer.entities.add({
          name: `${shortName} Shoreline Outline`,
          polyline: {
            positions: [...points, points[0]],
            width: 3.5,
            material: Cesium.Color.fromCssColorString(color).withAlpha(0.8),
            clampToGround: true,
          },
        });

        // Predictive WQI labels (WQI, trend, forecast)
        const trendText = score > 70 ? "↑ 1.2%" : "↓ 3.4%";
        const forecastText = score < 60 ? "Critical in 5 days" : "Stable for 7 days";

        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(center[1], center[0]),
          label: {
            text: ` ${shortName.toUpperCase()} \n WQI: ${score} | Trend: ${trendText} \n AI Forecast: ${forecastText} `,
            font: "700 11px monospace",
            fillColor: Cesium.Color.fromCssColorString("#EDE6D6"),
            style: Cesium.LabelStyle.FILL,
            showBackground: true,
            backgroundColor: Cesium.Color.BLACK.withAlpha(0.75),
            backgroundPadding: new Cesium.Cartesian2(8, 6),
            pixelOffset: new Cesium.Cartesian2(0, -25),
            eyeOffset: new Cesium.ConstantProperty(new Cesium.Cartesian3(0.0, 0.0, -120.0)),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      });
    }).catch((e: any) => console.log("Cesium Sectors load error:", e));

    // 2. Load organic pollution plumes from pollution.geojson
    Cesium.GeoJsonDataSource.load("/geojson/pollution.json").then((dataSource: any) => {
      const entities = dataSource.entities.values;
      entities.forEach((entity: any) => {
        const cat = entity.properties.cat?.getValue();
        const sev = entity.properties.sev?.getValue();
        const size = entity.properties.size?.getValue() || 180;
        const pos = entity.position.getValue(viewer.clock.currentTime);

        const colorString = SEV_COLOR[sev] || "#F59E0B";
        const baseRadius = size * diffusionMultiplier;

        // Overlay 3 organic cloud plumes (opacity 0.25, 0.15, 0.10)
        const plumeLayers = [
          { scale: 1.0, opacity: 0.25 },
          { scale: 1.4, opacity: 0.15 },
          { scale: 1.9, opacity: 0.10 },
        ];

        plumeLayers.forEach((layer) => {
          viewer.entities.add({
            name: `Outbreak Plume ${entity.id}: ${cat}`,
            position: pos,
            ellipse: {
              semiMinorAxis: baseRadius * layer.scale,
              semiMajorAxis: baseRadius * layer.scale,
              material: Cesium.Color.fromCssColorString(colorString).withAlpha(layer.opacity),
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              outline: false,
            },
          });
        });

        // Center dot
        viewer.entities.add({
          position: pos,
          point: {
            pixelSize: 8,
            color: Cesium.Color.fromCssColorString(colorString),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      });
    }).catch((e: any) => console.log("Cesium Pollution load error:", e));

    // 3. Load 5 LCMA Stations
    STATIONS.forEach((sta) => {
      const isHQ = sta.id === "STA-LD";
      viewer.entities.add({
        name: sta.name,
        position: Cesium.Cartesian3.fromDegrees(sta.lon, sta.lat),
        point: {
          pixelSize: isHQ ? 12 : 9,
          color: Cesium.Color.fromCssColorString(sta.color),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: isHQ ? "⭐ HQ CONTROL" : `🛰️ ${sta.short}`,
          font: "bold 9px monospace",
          fillColor: Cesium.Color.fromCssColorString(sta.color),
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.8),
          backgroundPadding: new Cesium.Cartesian2(4, 3),
          pixelOffset: new Cesium.Cartesian2(0, -18),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    });

    // 4. Load CCTV camera nodes
    CAMERAS.forEach((cam, i) => {
      viewer.entities.add({
        name: cam.label,
        position: Cesium.Cartesian3.fromDegrees(cam.lng, cam.lat),
        point: {
          pixelSize: 6,
          color: cam.live ? Cesium.Color.fromCssColorString("#0EA5E9") : Cesium.Color.fromCssColorString("#64748B"),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: `📷 CAM-${i+1}`,
          font: "700 8px system-ui",
          fillColor: cam.live ? Cesium.Color.fromCssColorString("#0EA5E9") : Cesium.Color.fromCssColorString("#64748B"),
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.8),
          backgroundPadding: new Cesium.Cartesian2(3, 2),
          pixelOffset: new Cesium.Cartesian2(0, 14),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    });

    // 5. Load Cleanup Harvesters from boats.geojson and use SampledPositionProperty animation
    const startTime = viewer.clock.currentTime;

    Cesium.GeoJsonDataSource.load("/geojson/boats.json").then((dataSource: any) => {
      const entities = dataSource.entities.values;
      entities.forEach((entity: any) => {
        const name = entity.properties.name?.getValue();
        const type = entity.properties.type?.getValue();
        const positions = entity.polyline.positions.getValue();

        const property = new Cesium.SampledPositionProperty();
        positions.forEach((pos: any, idx: number) => {
          const time = Cesium.JulianDate.addSeconds(startTime, idx * 60, new Cesium.JulianDate());
          property.addSample(time, pos);
        });

        // Set position to active interpolation segment based on play index
        const activePos = positions[Math.min(timeSliderIndex, positions.length - 1)];

        viewer.entities.add({
          name: `CLEANUP VESSEL - ${name}`,
          position: activePos,
          point: {
            pixelSize: 10,
            color: type === "skimmer" ? Cesium.Color.fromCssColorString("#E29A56") : Cesium.Color.fromCssColorString("#38BDF8"),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: `⛵ ${name.toUpperCase()}\n[Status: ${isPast ? "Finished" : isCurrent ? "Active" : "Cruising"}]`,
            font: "bold 9px monospace",
            fillColor: type === "skimmer" ? Cesium.Color.fromCssColorString("#E29A56") : Cesium.Color.fromCssColorString("#38BDF8"),
            showBackground: true,
            backgroundColor: Cesium.Color.BLACK.withAlpha(0.85),
            backgroundPadding: new Cesium.Cartesian2(4, 3),
            pixelOffset: new Cesium.Cartesian2(0, -18),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      });
    }).catch((e: any) => console.log("Cesium Boats load error:", e));

    // 6. Load IoT Sensor Nodes from sensors.geojson
    Cesium.GeoJsonDataSource.load("/geojson/sensors.json").then((dataSource: any) => {
      const entities = dataSource.entities.values;
      entities.forEach((entity: any) => {
        const phVal = entity.properties.ph?.getValue() || 7.2;
        const doValBase = entity.properties.do?.getValue() || 4.8;
        const turbValBase = entity.properties.turb?.getValue() || 45;
        const pos = entity.position.getValue(viewer.clock.currentTime);

        const tempFactor = isPast ? -0.8 : isCurrent ? 0.0 : isForecast7 ? 1.2 : 2.5;
        const doVal = Math.max(1.0, parseFloat((doValBase - tempFactor * 0.3).toFixed(1)));
        const turbVal = Math.round(turbValBase + tempFactor * 6.5);
        const isOk = turbVal < 45 && doVal > 4.5;

        viewer.entities.add({
          name: `IoT Node ${entity.id}`,
          position: pos,
          point: {
            pixelSize: 8,
            color: isOk ? Cesium.Color.fromCssColorString("#10B981") : Cesium.Color.fromCssColorString("#EF4444"),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 1.5,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: `📡 ${entity.id}\n[pH: ${phVal} · DO: ${doVal} · Turb: ${turbVal}]`,
            font: "8px monospace",
            fillColor: Cesium.Color.fromCssColorString("#EDE6D6"),
            showBackground: true,
            backgroundColor: Cesium.Color.BLACK.withAlpha(0.75),
            backgroundPadding: new Cesium.Cartesian2(4, 2),
            pixelOffset: new Cesium.Cartesian2(0, 14),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      });
    }).catch((e: any) => console.log("Cesium Sensors load error:", e));
  };

  useEffect(() => {
    const currentStr = JSON.stringify(simulatedSectors) + "-" + timeSliderIndex;
    if (currentStr === prevSectorsRef.current) return;
    prevSectorsRef.current = currentStr;

    if (viewerRef.current && (window as any).Cesium) {
      updateLayers(viewerRef.current, (window as any).Cesium);
    }
  }, [timeSliderIndex, simulatedSectors]);

  return (
    <div style={{ position: "relative", width: "100%", height: "540px", background: "#060A0F" }}>
      {loading && (
        <div style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
          gap: 12, background: "rgba(11,17,23,0.95)", color: "var(--text-muted)",
          zIndex: 10, fontFamily: "monospace", fontSize: 12
        }}>
          <span style={{
            width: 20, height: 20, borderRadius: "50%",
            border: "2px solid rgba(14,165,233,0.2)", borderTopColor: "#0EA5E9",
            animation: "spin 1s linear infinite"
          }} />
          INITIALIZING LAKE STATE SHADER & 3D TERRAIN INFRASTRUCTURE...
          <style>{`
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}

      {error && (
        <div style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(127,29,29,0.95)", color: "#FF8F8F",
          zIndex: 10, fontFamily: "monospace", fontSize: 12, padding: 20, textAlign: "center"
        }}>
          ⚠️ DIGITAL TWIN BOOT ERROR: {error}<br/>
          (Falling back to active 2D Tactical open-source layers...)
        </div>
      )}

      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
