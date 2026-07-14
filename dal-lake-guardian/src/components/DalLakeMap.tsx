// DalLakeMap.tsx — client-only dynamic wrapper
// The inner component (DalLakeMapInner) imports leaflet/dist/leaflet.css
// and uses L directly, both of which crash on the server. Wrapping with
// dynamic + ssr:false guarantees they only ever run in the browser.

import dynamic from "next/dynamic";

export type { DalLakeMapProps } from "./DalLakeMapInner";

const DalLakeMap = dynamic(
  () => import("./DalLakeMapInner"),
  {
    ssr:     false,
    loading: () => (
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          height:         "460px",
          background:     "var(--bg-surface)",
          border:         "1px solid var(--border-dim)",
          borderRadius:   14,
          color:          "var(--text-muted)",
          fontFamily:     "monospace",
          fontSize:       11,
          letterSpacing:  ".06em",
          textTransform:  "uppercase",
          gap:            10,
        }}
      >
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "#0EA5E9",
          display: "inline-block",
          animation: "pulse 1.4s ease-in-out infinite",
        }} />
        Loading Dal Lake map…
      </div>
    ),
  }
);

export default DalLakeMap;
