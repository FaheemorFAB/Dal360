import dalSectorsGeojsonForBounds from "../../public/geojson/dal-sectors.json";

let tempMinLat = 90.0, tempMaxLat = -90.0, tempMinLon = 180.0, tempMaxLon = -180.0;
dalSectorsGeojsonForBounds.features.forEach((f) => {
  f.geometry.coordinates[0].forEach((coord) => {
    const lon = coord[0];
    const lat = coord[1];
    if (lat < tempMinLat) tempMinLat = lat;
    if (lat > tempMaxLat) tempMaxLat = lat;
    if (lon < tempMinLon) tempMinLon = lon;
    if (lon > tempMaxLon) tempMaxLon = lon;
  });
});

export const DAL_BOUNDS = {
  minLat: tempMinLat,
  maxLat: tempMaxLat,
  minLon: tempMinLon,
  maxLon: tempMaxLon,
  center: { lat: (tempMinLat + tempMaxLat) / 2, lon: (tempMinLon + tempMaxLon) / 2 },
};

// ─── 5 LAWDA Admin Stations (Real Dal Lake Locations) ───────────────────────
// Distributed as 4 sectors/basins + 1 Central HQ Station at Char Chinari
//  1. Hazratbal   - NW Basin (North part)
//  2. Nishat      - NE Basin (East part)
//  3. Rainawari   - West Basin (West part)
//  4. Boulevard   - SE Basin (South part)
//  5. Char Chinari - Central (HQ)

export const STATIONS = [
  {
    id:        "STA-HAZ",
    name:      "Hazratbal Station",
    short:     "Hazratbal",
    sector:    "Hazratbal (NW)",
    sectorId:  "hazratbal",
    lat:       34.1280,
    lon:       74.8420,
    commander: "Cmd. Ayesha Malik",
    color:     "#0EA5E9",
    bgClass:   "rgba(14,165,233,0.08)",
    borderClass: "rgba(14,165,233,0.2)",
    workers:   6,
    description: "Governs NW shore near Hazratbal Shrine."
  },
  {
    id:        "STA-BD",
    name:      "Bod Dal Control Post",
    short:     "Bod Dal",
    sector:    "Bod Dal (N)",
    sectorId:  "boddal",
    lat:       34.1150,
    lon:       74.8560,
    commander: "Cmd. Firdaus Bhat",
    color:     "#10B981",
    bgClass:   "rgba(16,185,129,0.08)",
    borderClass: "rgba(16,185,129,0.2)",
    workers:   5,
    description: "Governs main open-water northern basin."
  },
  {
    id:        "STA-NS",
    name:      "Nishat-Shalimar Station",
    short:     "Nishat-Shalimar",
    sector:    "Nishat–Shalimar (NE)",
    sectorId:  "nishat",
    lat:       34.1150,
    lon:       74.8720,
    commander: "Cmd. Riyaz Khan",
    color:     "#8B5CF6",
    bgClass:   "rgba(139,92,246,0.08)",
    borderClass: "rgba(139,92,246,0.2)",
    workers:   5,
    description: "Governs Nishat-Shalimar Mughal garden shores."
  },
  {
    id:        "STA-NG",
    name:      "Nigeen Station",
    short:     "Nigeen",
    sector:    "Nigeen Lake (W Lobe)",
    sectorId:  "nigeen",
    lat:       34.1120,
    lon:       74.8320,
    commander: "Cmd. Nazia Bhat",
    color:     "#14B8A6",
    bgClass:   "rgba(20,184,166,0.08)",
    borderClass: "rgba(20,184,166,0.2)",
    workers:   4,
    description: "Governs Nigeen Lake and Nagin Bagh shores."
  },
  {
    id:        "STA-LD",
    name:      "Floating Gardens Post",
    short:     "Lokut Dal",
    sector:    "Lokut Dal (Central)",
    sectorId:  "lokutdal",
    lat:       34.0960,
    lon:       74.8480,
    commander: "Cmd. Zahid Mir",
    color:     "#EC4899",
    bgClass:   "rgba(236,72,153,0.08)",
    borderClass: "rgba(236,72,153,0.2)",
    workers:   7,
    description: "Governs floating gardens and central corridors."
  },
  {
    id:        "STA-RW",
    name:      "Rainawari Station",
    short:     "Rainawari",
    sector:    "Rainawari (SW)",
    sectorId:  "rainawari",
    lat:       34.0960,
    lon:       74.8350,
    commander: "Cmd. Tariq Wani",
    color:     "#3B82F6",
    bgClass:   "rgba(59,130,246,0.08)",
    borderClass: "rgba(59,130,246,0.2)",
    workers:   5,
    description: "Governs dense residential southwest channels."
  },
  {
    id:        "STA-BL",
    name:      "Boulevard Station",
    short:     "Boulevard",
    sector:    "Boulevard-Tulip Garden (SE)",
    sectorId:  "boulevard",
    lat:       34.0850,
    lon:       74.8620,
    commander: "Cmd. Abdul Rashid",
    color:     "#F59E0B",
    bgClass:   "rgba(245,158,11,0.08)",
    borderClass: "rgba(245,158,11,0.2)",
    workers:   6,
    description: "Governs houseboats and Tulip Garden shoreline."
  },
  {
    id:        "STA-GB",
    name:      "Gagribal Station",
    short:     "Gagribal",
    sector:    "Gagribal-Foreshore (S)",
    sectorId:  "gagribal",
    lat:       34.0790,
    lon:       74.8520,
    commander: "Cmd. Farooq Ahmed",
    color:     "#EF4444",
    bgClass:   "rgba(239,68,68,0.08)",
    borderClass: "rgba(239,68,68,0.2)",
    workers:   6,
    description: "Governs Dal Gate and Gagribal basin inlets."
  },
] as const;

export type StationId = typeof STATIONS[number]["id"];
export type SectorId  = typeof STATIONS[number]["sectorId"];

import dalSectorsGeojson from "../../public/geojson/dal-sectors.json";

export const SECTORS: Record<string, {
  label:      string;
  stationId:  StationId;
  center:     [number, number];
  polygon:    [number, number][];
  color:      string;
}> = {};

dalSectorsGeojson.features.forEach((f) => {
  const leafletPoly = f.geometry.coordinates[0].map(c => [c[1], c[0]] as [number, number]);
  SECTORS[f.id] = {
    label: f.properties.name,
    stationId: f.properties.stationId as StationId,
    center: f.properties.center as [number, number],
    color: f.properties.color,
    polygon: leafletPoly
  };
});


// ─── Complaint Categories ──────────────────────────────────────────────────

export const CATEGORIES = [
  "Plastic Waste",
  "Oil Spill",
  "Sewage Discharge",
  "Floating Waste",
  "Water Hyacinth",
  "Algae Bloom",
  "Dead Fish",
  "Illegal Dumping",
  "Encroachment",
  "Hospital Waste",
] as const;

export type Category = typeof CATEGORIES[number];

// Priority weights per category (used by priority scorer)
export const CATEGORY_WEIGHTS: Record<string, number> = {
  "Hospital Waste":   0.95,
  "Oil Spill":        0.85,
  "Sewage Discharge": 0.75,
  "Dead Fish":        0.70,
  "Algae Bloom":      0.55,
  "Floating Waste":   0.45,
  "Plastic Waste":    0.40,
  "Illegal Dumping":  0.50,
  "Water Hyacinth":   0.35,
  "Encroachment":     0.30,
};

// ─── Severity System ───────────────────────────────────────────────────────

export const SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type Severity = typeof SEVERITIES[number];

export const SEVERITY_COLORS: Record<Severity, string> = {
  low:      "#10B981",
  medium:   "#F59E0B",
  high:     "#EF4444",
  critical: "#7F1D1D",
};

export const SEVERITY_BADGE_CLASSES: Record<Severity, string> = {
  low:      "badge-healthy",
  medium:   "badge-warning",
  high:     "badge-critical",
  critical: "badge-emergency",
};

// ─── Complaint Statuses ────────────────────────────────────────────────────

export const COMPLAINT_STATUSES = [
  "pending",
  "geo_validating",
  "ai_review",
  "validated",
  "assigned",
  "in_progress",
  "resolved",
  "rejected",
] as const;

export type ComplaintStatus = typeof COMPLAINT_STATUSES[number];

// ─── Health Score Thresholds ───────────────────────────────────────────────

export const HEALTH_THRESHOLDS = {
  healthy:   { min: 80, max: 100, label: "Healthy",   colorVar: "var(--health-healthy)" },
  warning:   { min: 60, max: 79,  label: "Warning",   colorVar: "var(--health-warning)" },
  critical:  { min: 40, max: 59,  label: "Critical",  colorVar: "var(--health-critical)" },
  emergency: { min: 0,  max: 39,  label: "Emergency", colorVar: "var(--accent-crimson)" },
} as const;

export function getHealthStatus(score: number) {
  if (score >= 80) return HEALTH_THRESHOLDS.healthy;
  if (score >= 60) return HEALTH_THRESHOLDS.warning;
  if (score >= 40) return HEALTH_THRESHOLDS.critical;
  return HEALTH_THRESHOLDS.emergency;
}

export function getHealthColor(score: number): string {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  if (score >= 40) return "#EF4444";
  return "#7F1D1D";
}

// ─── Water Quality Thresholds ──────────────────────────────────────────────

export const WQ_THRESHOLDS = {
  dissolved_oxygen: { good: 6.0, warn: 4.0, unit: "mg/L", label: "Dissolved Oxygen" },
  turbidity:        { good: 25,  warn: 50,  unit: "NTU",  label: "Turbidity" },
  ph_level:         { min: 6.5, max: 8.5,  unit: "",     label: "pH Level" },
  chlorophyll_a:    { good: 15,  warn: 30,  unit: "μg/L", label: "Chlorophyll-a" },
} as const;

// ─── Risk Alert Types ──────────────────────────────────────────────────────

export const RISK_TYPES = [
  "plastic_accumulation",
  "algae_bloom_imminent",
  "oil_spill_risk",
  "fish_kill_warning",
  "encroachment_risk",
  "sewage_overflow",
  "tourism_impact",
] as const;

export type RiskType = typeof RISK_TYPES[number];

export const RISK_LABELS: Record<RiskType, string> = {
  plastic_accumulation: "Plastic Accumulation Surge",
  algae_bloom_imminent: "Algae Bloom Imminent",
  oil_spill_risk:       "Oil Spill Risk",
  fish_kill_warning:    "Fish Kill Warning",
  encroachment_risk:    "Encroachment Risk",
  sewage_overflow:      "Sewage Overflow Risk",
  tourism_impact:       "Tourism Impact Alert",
};

// ─── Citizen Trust Tiers ───────────────────────────────────────────────────

export const TRUST_TIERS = [
  { min: 80, max: 100, label: "Gold Tier",   badge: "🥇 Gold Tier",   class: "badge-healthy", queue: "Instant acceptance, priority queue" },
  { min: 50, max: 79,  label: "Silver Tier", badge: "🥈 Silver Tier", class: "badge-info",    queue: "Standard AI validation" },
  { min: 20, max: 49,  label: "Bronze Tier", badge: "🥉 Bronze Tier", class: "badge-warning", queue: "Additional validation" },
  { min: 0,  max: 19,  label: "Copper Tier", badge: "⚪ Copper Tier", class: "badge-critical",queue: "Manual verification" },
] as const;

export function getTrustTier(score: number) {
  return TRUST_TIERS.find((t) => score >= t.min && score <= t.max) ?? TRUST_TIERS[1];
}

// ─── Knowledge Graph Edges ─────────────────────────────────────────────────

export const CAUSAL_CHAINS: Record<string, string[]> = {
  "Illegal Dumping":    ["Drain Blockage", "Stagnant Water"],
  "Drain Blockage":     ["Algae Bloom", "Mosquito Breeding"],
  "Stagnant Water":     ["Algae Bloom", "DO Depletion"],
  "Algae Bloom":        ["DO Depletion", "Fish Kill"],
  "DO Depletion":       ["Fish Kill"],
  "Fish Kill":          ["Tourism Loss", "Resident Complaints"],
  "Oil Spill":          ["Toxicity Risk", "Tourism Loss", "Light Penetration Loss"],
  "Sewage Discharge":   ["Nutrient Loading", "Pathogen Contamination"],
  "Nutrient Loading":   ["Eutrophication"],
  "Eutrophication":     ["Algae Bloom"],
  "Plastic Waste":      ["Marine Ingestion", "Drain Blockage"],
  "Water Hyacinth":     ["DO Depletion", "Boat Navigation Blocked"],
  "Mosquito Breeding":  ["Public Health Risk"],
  "Pathogen Contamination": ["Swimming Ban Risk"],
  "Tourism Loss":       ["Economic Impact"],
};

// ─── Worker Roles ─────────────────────────────────────────────────────────

export const WORKER_ROLES = [
  "Boat Operator",
  "LAWDA Crew",
  "Lead Inspector",
  "Volunteer",
  "Municipal Worker",
  "Surveillance Officer",
] as const;

// ─── API Routes ───────────────────────────────────────────────────────────

export const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000";

export const API_ROUTES = {
  health:          `${API_BASE}/api/health`,
  stations:        `${API_BASE}/api/stations`,
  complaints:      `${API_BASE}/api/complaints`,
  workers:         `${API_BASE}/api/workers`,
  stats:           `${API_BASE}/api/stats`,
  heatmap:         `${API_BASE}/api/heatmap`,
  analytics:       `${API_BASE}/api/analytics`,
  // ML Endpoints
  validateGeo:     `${API_BASE}/api/ai/validate-geo`,
  analyzeImage:    `${API_BASE}/api/ai/analyze`,
  priorityScore:   `${API_BASE}/api/ai/priority-score`,
  healthScore:     `${API_BASE}/api/health-score`,
  waterQuality:    `${API_BASE}/api/water-quality`,
  forecast:        `${API_BASE}/api/forecast`,
  satellite:       `${API_BASE}/api/satellite/latest`,
  simulate:        `${API_BASE}/api/simulate`,
  routeOptimize:   `${API_BASE}/api/route-optimize`,
  knowledgeGraph:  `${API_BASE}/api/knowledge-graph`,
  impactAnalytics: `${API_BASE}/api/analytics/impact`,
} as const;

// ─── Geo Helpers ──────────────────────────────────────────────────────────

export function isWithinDalBounds(lat: number, lon: number): boolean {
  return (
    lat >= DAL_BOUNDS.minLat &&
    lat <= DAL_BOUNDS.maxLat &&
    lon >= DAL_BOUNDS.minLon &&
    lon <= DAL_BOUNDS.maxLon
  );
}
