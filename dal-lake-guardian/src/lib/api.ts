import { API_ROUTES, DAL_BOUNDS } from "./constants";

// ─── Geo Validation ────────────────────────────────────────────────────────

export interface GeoValidationResult {
  valid: boolean;
  confidence: number;
  reason: string;
  detected_features?: string[];
  coordinates_valid?: boolean;
}

export function isWithinDalBounds(lat: number, lon: number): boolean {
  return (
    lat >= DAL_BOUNDS.minLat &&
    lat <= DAL_BOUNDS.maxLat &&
    lon >= DAL_BOUNDS.minLon &&
    lon <= DAL_BOUNDS.maxLon
  );
}

export async function validateDalPhoto(
  file: File,
  lat: number,
  lon: number
): Promise<GeoValidationResult> {
  // Step 1: Fast bounds check (no API call needed)
  const coordsValid = isWithinDalBounds(lat, lon);

  // Step 2: Send to Gemini Vision via backend
  const formData = new FormData();
  formData.append("image", file);
  formData.append("lat", lat.toString());
  formData.append("lon", lon.toString());
  formData.append("coords_valid", coordsValid.toString());

  try {
    const res = await fetch(API_ROUTES.validateGeo, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Validation API error");
    const data = await res.json();
    return {
      valid: data.valid && coordsValid,
      confidence: data.confidence ?? 0,
      reason: !coordsValid
        ? `GPS coordinates (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E) are outside Dal Lake boundary`
        : data.reason,
      detected_features: data.detected_features ?? [],
      coordinates_valid: coordsValid,
    };
  } catch {
    // Fallback: GPS-only validation when backend unavailable
    return {
      valid: coordsValid,
      confidence: coordsValid ? 0.7 : 0,
      reason: coordsValid
        ? "Location within Dal Lake boundary (ML validation unavailable)"
        : `GPS coordinates outside Dal Lake boundary (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`,
      coordinates_valid: coordsValid,
    };
  }
}

// ─── Generic API Fetcher ───────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── Complaint APIs ────────────────────────────────────────────────────────

export interface Complaint {
  id: string;
  category: string;
  severity: string;
  ai_severity?: string;
  priority_score?: number;
  status: string;
  lat: number;
  lon: number;
  sector_id?: string;
  description: string;
  image_url?: string;
  ai_confidence?: number;
  ai_detections?: Array<{ object: string; confidence: number }>;
  ai_explanation?: string;
  geo_validated?: boolean;
  station_id?: string;
  worker_id?: string;
  culprit_name?: string;
  culprit_status?: string;
  created_at: string;
  resolved_at?: string;
  health_delta?: number;
}

export interface ComplaintsResponse {
  complaints: Complaint[];
  total: number;
}

export const complaintApi = {
  list: (params?: Record<string, string>) => {
    const url = new URL(API_ROUTES.complaints);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return apiFetch<ComplaintsResponse>(url.toString());
  },
  get: (id: string) =>
    apiFetch<Complaint>(`${API_ROUTES.complaints}/${id}`),
  create: (data: Partial<Complaint>) =>
    apiFetch<Complaint>(API_ROUTES.complaints, { method: "POST", body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string, workerId?: string) =>
    apiFetch<Complaint>(`${API_ROUTES.complaints}/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, worker_id: workerId }),
    }),
  logCulprit: (id: string, data: { culprit_name: string; culprit_ref: string }) =>
    apiFetch(`${API_ROUTES.complaints}/${id}/culprit`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ─── Health Score APIs ─────────────────────────────────────────────────────

export interface SectorHealthScore {
  sector_id: string;
  score: number;
  label: string;
  trend: "improving" | "stable" | "declining";
  drivers: Array<{ factor: string; impact: number; direction: "positive" | "negative" }>;
  computed_at: string;
}

export interface HealthScoreResponse {
  sectors: SectorHealthScore[];
  overall: number;
  timestamp: string;
}

export const healthApi = {
  all: () => apiFetch<HealthScoreResponse>(API_ROUTES.healthScore),
  sector: (sectorId: string) =>
    apiFetch<SectorHealthScore>(`${API_ROUTES.healthScore}/${sectorId}`),
  history: (sectorId: string) =>
    apiFetch<{ history: Array<{ date: string; score: number }> }>(
      `${API_ROUTES.healthScore}/${sectorId}/history`
    ),
};

// ─── Water Quality APIs ────────────────────────────────────────────────────

export interface WaterQualityData {
  sector_id: string;
  dissolved_oxygen: number;
  turbidity: number;
  ph_level: number;
  chlorophyll_a: number;
  water_quality_index: number;
  do_24h_pred: number;
  turbidity_24h_pred: number;
  measured_at: string;
}

export const waterQualityApi = {
  all: () => apiFetch<{ sectors: WaterQualityData[] }>(API_ROUTES.waterQuality),
  sector: (sectorId: string) =>
    apiFetch<WaterQualityData>(`${API_ROUTES.waterQuality}/${sectorId}`),
};

// ─── Forecast APIs ─────────────────────────────────────────────────────────

export interface RiskAlert {
  id: string;
  sector_id: string;
  alert_type: string;
  severity: string;
  description: string;
  trigger_reason: string;
  predicted_for: string;
  confidence: number;
  preposition_recommended: Array<{ action: string; station_id: string }>;
}

export interface ForecastResponse {
  forecast: Array<{
    date: string;
    day_label: string;
    max_risk_level: string;
    alerts: RiskAlert[];
    rainfall_mm: number;
  }>;
  generated_at: string;
}

export const forecastApi = {
  all: () => apiFetch<ForecastResponse>(API_ROUTES.forecast),
  sector: (sectorId: string) =>
    apiFetch<ForecastResponse>(`${API_ROUTES.forecast}/${sectorId}`),
};

// ─── Simulation APIs ───────────────────────────────────────────────────────

export interface SimulationInput {
  rainfall_mm: number;
  plastic_removed_kg: number;
  workers_deployed: number;
  tourist_density: "low" | "medium" | "high";
  scenario?: string;
}

export interface SimulationOutput {
  sector_predictions: Array<{
    sector_id: string;
    current_score: number;
    predicted_score: number;
    delta: number;
    risk_level: string;
  }>;
  recommendations: string[];
  overall_risk: string;
}

export const simulationApi = {
  run: (inputs: SimulationInput) =>
    apiFetch<SimulationOutput>(API_ROUTES.simulate, {
      method: "POST",
      body: JSON.stringify(inputs),
    }),
  presets: () => apiFetch<{ presets: Array<{ name: string; inputs: SimulationInput }> }>(
    `${API_ROUTES.simulate}/presets`
  ),
};

// ─── Worker APIs ───────────────────────────────────────────────────────────

export interface Worker {
  id: string;
  name: string;
  role: string;
  station_id: string;
  status: "active" | "idle" | "offline";
  flag_count: number;
  suspended: boolean;
  current_lat?: number;
  current_lon?: number;
  performance_score: number;
  tasks?: number;
}

export const workerApi = {
  list: () => apiFetch<{ workers: Worker[] }>(API_ROUTES.workers),
  flag: (workerId: string, reason: string) =>
    apiFetch(`${API_ROUTES.workers}/${workerId}/flag`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  suspend: (workerId: string) =>
    apiFetch(`${API_ROUTES.workers}/${workerId}/suspend`, { method: "POST" }),
  tasks: (workerId: string) =>
    apiFetch<{ tasks: Complaint[] }>(`${API_ROUTES.workers}/${workerId}/tasks`),
};

// ─── Stats / Analytics ─────────────────────────────────────────────────────

export interface DashboardStats {
  pending_complaints: number;
  resolved_today: number;
  high_risk_zones: number;
  active_workers: number;
  ai_alerts: number;
  lake_health_score: number;
  lake_health_label: string;
  total_complaints: number;
  reports_today: number;
}

export const statsApi = {
  dashboard: () => apiFetch<DashboardStats>(API_ROUTES.stats),
  impact: () => apiFetch(API_ROUTES.impactAnalytics),
  analytics: () => apiFetch(API_ROUTES.analytics),
};
