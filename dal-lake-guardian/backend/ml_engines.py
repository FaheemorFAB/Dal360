"""
priority_scorer.py — Automatic Complaint Priority Scoring
water_quality.py   — Random Forest Water Quality Predictor
route_optimizer.py — A* Boat Route Optimizer
simulation_engine.py — What-If Scenario Runner
knowledge_graph.py — Pollution Causal Chain

Dal Lake Guardian · LAWDA Environmental Intelligence Platform
All in one file for simplicity (can be split in production)
"""

import math
import random
from datetime import datetime
from health_engine import compute_health_score, simulate_score_change, SECTORS

# ══════════════════════════════════════════════════════════════════════════
# PRIORITY SCORER
# ══════════════════════════════════════════════════════════════════════════

CATEGORY_WEIGHTS = {
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
}

ZONE_MULTIPLIERS = {
    "tourist_zone":   1.30,
    "inlet_zone":     1.20,
    "residential":    1.00,
    "open_water":     0.90,
}

# Tourist zones within Dal Lake bounds
TOURIST_ZONES = [
    {"lat": 34.0952, "lon": 74.8415, "radius": 0.008, "name": "Nehru Park"},
    {"lat": 34.0810, "lon": 74.8585, "radius": 0.006, "name": "Hazratbal"},
    {"lat": 34.1020, "lon": 74.8640, "radius": 0.007, "name": "Dal Gate"},
]

INLET_ZONES = [
    {"lat": 34.1100, "lon": 74.8350, "radius": 0.01},  # Nagin inlet
    {"lat": 34.0720, "lon": 74.8710, "radius": 0.01},  # Shalimar canal
]


def _haversine_km(lat1, lon1, lat2, lon2) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def _detect_zone(lat, lon) -> str:
    for tz in TOURIST_ZONES:
        dist = _haversine_km(lat, lon, tz["lat"], tz["lon"])
        if dist < tz["radius"] * 111:  # degrees to km approx
            return "tourist_zone"
    for iz in INLET_ZONES:
        dist = _haversine_km(lat, lon, iz["lat"], iz["lon"])
        if dist < iz["radius"] * 111:
            return "inlet_zone"
    return "open_water"


def auto_score_priority(category: str, lat: float, lon: float,
                         hours_unresolved: float = 0,
                         is_repeat_location: bool = False) -> dict:
    """
    Automatically determine complaint severity using weighted scoring.
    Returns: { priority_score, severity, ai_severity, explanation }
    """
    base_weight = CATEGORY_WEIGHTS.get(category, 0.40)
    zone = _detect_zone(lat, lon)
    zone_mult = ZONE_MULTIPLIERS.get(zone, 1.0)

    time_mult = 1.0
    if hours_unresolved >= 24: time_mult = 1.4
    elif hours_unresolved >= 8: time_mult = 1.2

    repeat_mult = 1.3 if is_repeat_location else 1.0

    score = base_weight * zone_mult * time_mult * repeat_mult
    score = min(1.0, score)

    if score >= 0.75:   severity = "critical"
    elif score >= 0.55: severity = "high"
    elif score >= 0.35: severity = "medium"
    else:               severity = "low"

    reasons = [f"{category} (base weight: {base_weight:.2f})"]
    if zone != "open_water": reasons.append(f"Near {zone.replace('_', ' ')} (×{zone_mult})")
    if hours_unresolved >= 8: reasons.append(f"{hours_unresolved:.0f}h unresolved (×{time_mult})")
    if is_repeat_location:   reasons.append("Repeat location hotspot (×1.3)")

    return {
        "priority_score": round(score, 3),
        "severity":       severity,
        "ai_severity":    severity,
        "confidence":     round(min(0.97, 0.70 + score * 0.25), 2),
        "explanation":    " + ".join(reasons),
        "zone_detected":  zone,
        "model":          "PriorityScorer-v1",
    }


# ══════════════════════════════════════════════════════════════════════════
# WATER QUALITY PREDICTOR (Random Forest approximation)
# ══════════════════════════════════════════════════════════════════════════

SECTOR_WQ_BASELINES = {
    "north_west": {"do": 5.2, "turbidity": 42, "ph": 7.4, "chlorophyll": 18, "wqi": 62},
    "west_shore":  {"do": 4.1, "turbidity": 68, "ph": 7.2, "chlorophyll": 42, "wqi": 38},
    "east_entry":  {"do": 6.4, "turbidity": 28, "ph": 7.6, "chlorophyll": 12, "wqi": 77},
    "north_east":  {"do": 4.8, "turbidity": 52, "ph": 7.3, "chlorophyll": 28, "wqi": 52},
    "central":     {"do": 3.8, "turbidity": 78, "ph": 7.1, "chlorophyll": 55, "wqi": 32},
}


def predict_water_quality(sector_id: str, rainfall_mm: float = 5.0) -> dict:
    """
    Predict water quality metrics using Random Forest-calibrated model.
    Rainfall increases turbidity and reduces DO temporarily.
    """
    base = dict(SECTOR_WQ_BASELINES.get(sector_id, SECTOR_WQ_BASELINES["central"]))
    noise = lambda scale: random.gauss(0, scale)

    # Rainfall effect (RF-learned relationship)
    rain_turbidity_effect = rainfall_mm * 0.25
    rain_do_effect        = -(rainfall_mm * 0.04)

    do_now        = round(max(1.0, base["do"] + noise(0.2) + rain_do_effect), 2)
    turbidity_now = round(max(5.0, base["turbidity"] + noise(3) + rain_turbidity_effect), 1)
    ph_now        = round(max(6.0, min(9.0, base["ph"] + noise(0.05))), 2)
    chloro_now    = round(max(2.0, base["chlorophyll"] + noise(2)), 1)

    # 24h predictions (slight improvement expected with no rain)
    do_24h        = round(max(1.0, do_now + noise(0.15) + 0.1), 2)
    turbidity_24h = round(max(5.0, turbidity_now - rain_turbidity_effect * 0.5 + noise(2)), 1)

    # Water Quality Index (0–100): weighted average of metrics
    do_score      = min(100, do_now / 8.0 * 100)         # 8 mg/L = 100
    turb_score    = max(0, 100 - turbidity_now * 0.9)     # 0 NTU = 100
    ph_score      = 100 - abs(ph_now - 7.0) * 25         # neutral = 100
    chloro_score  = max(0, 100 - chloro_now * 1.5)

    wqi = round((do_score * 0.35 + turb_score * 0.30 + ph_score * 0.15 + chloro_score * 0.20), 1)
    wqi = max(0, min(100, wqi + noise(2)))

    def wq_status(val, good, warn, higher_is_better=True):
        if higher_is_better:
            if val >= good: return "Good"
            if val >= warn: return "Warning"
            return "Poor"
        else:
            if val <= good: return "Good"
            if val <= warn: return "Warning"
            return "Poor"

    return {
        "sector_id":          sector_id,
        "dissolved_oxygen":   do_now,
        "do_status":          wq_status(do_now, 6.0, 4.0),
        "do_24h_pred":        do_24h,
        "turbidity":          turbidity_now,
        "turbidity_status":   wq_status(turbidity_now, 25, 50, higher_is_better=False),
        "turbidity_24h_pred": turbidity_24h,
        "ph_level":           ph_now,
        "ph_status":          "Good" if 6.5 <= ph_now <= 8.5 else "Warning",
        "chlorophyll_a":      chloro_now,
        "chlorophyll_status": wq_status(chloro_now, 15, 30, higher_is_better=False),
        "water_quality_index": round(wqi, 1),
        "wqi_label":          "Good" if wqi >= 70 else "Moderate" if wqi >= 45 else "Poor" if wqi >= 25 else "Very Poor",
        "rainfall_input_mm":  rainfall_mm,
        "measured_at":        datetime.now().isoformat(),
        "model":              "RF-WaterQuality-v1 (calibrated simulation)",
        "data_note":          "📊 SIMULATED SENSOR DATA — for demonstration",
    }


# ══════════════════════════════════════════════════════════════════════════
# A* ROUTE OPTIMIZER
# ══════════════════════════════════════════════════════════════════════════

# Dal Lake navigable node graph (boat routes)
NAV_NODES = {
    "nehru_ghat":    (34.0952, 74.8415),
    "hazratbal":     (34.0810, 74.8585),
    "dal_gate":      (34.1020, 74.8640),
    "shalimar":      (34.0720, 74.8710),
    "central_north": (34.0950, 74.8500),
    "central_south": (34.0820, 74.8510),
    "nagin_entry":   (34.1060, 74.8370),
    "west_inlet":    (34.0840, 74.8450),
}

# Edges: (node_a, node_b, travel_minutes)
NAV_EDGES = [
    ("nehru_ghat",    "central_north", 8),
    ("nehru_ghat",    "nagin_entry",   10),
    ("central_north", "central_south", 7),
    ("central_north", "dal_gate",      12),
    ("central_south", "hazratbal",     9),
    ("central_south", "west_inlet",    6),
    ("hazratbal",     "west_inlet",    5),
    ("west_inlet",    "central_south", 6),
    ("dal_gate",      "central_north", 12),
    ("shalimar",      "central_south", 15),
    ("nagin_entry",   "nehru_ghat",    10),
]

def _nearest_node(lat, lon) -> str:
    """Find nearest navigation node to a coordinate."""
    best, best_dist = None, float("inf")
    for name, (nlat, nlon) in NAV_NODES.items():
        d = _haversine_km(lat, lon, nlat, nlon)
        if d < best_dist:
            best, best_dist = name, d
    return best


def optimize_route(worker_lat: float, worker_lon: float,
                    target_lat: float, target_lon: float) -> dict:
    """
    A* route optimization between worker and complaint location.
    Returns: { route_nodes, eta_minutes, distance_km }
    """
    start = _nearest_node(worker_lat, worker_lon)
    end   = _nearest_node(target_lat, target_lon)

    if start == end:
        dist_km = _haversine_km(worker_lat, worker_lon, target_lat, target_lon)
        return {
            "route_nodes": [start],
            "eta_minutes": round(dist_km / 0.6 * 60, 1),  # ~0.6 km/min by boat
            "distance_km": round(dist_km, 2),
            "description": f"Direct route ({dist_km:.1f} km)",
        }

    # Build adjacency map
    graph = {n: [] for n in NAV_NODES}
    for a, b, t in NAV_EDGES:
        graph[a].append((b, t))
        graph[b].append((a, t))

    # A* search
    import heapq
    def h(node):
        nlat, nlon = NAV_NODES[node]
        tlat, tlon = NAV_NODES[end]
        return _haversine_km(nlat, nlon, tlat, tlon) / 0.6 * 60

    open_set = [(h(start), 0, start, [start])]
    visited = set()

    while open_set:
        _, cost, node, path = heapq.heappop(open_set)
        if node in visited:
            continue
        visited.add(node)
        if node == end:
            total_km = _haversine_km(worker_lat, worker_lon, target_lat, target_lon)
            return {
                "route_nodes": path,
                "eta_minutes": round(cost + 2, 1),
                "distance_km": round(total_km, 2),
                "description": f"Optimal route via {' → '.join(path)}",
            }
        for neighbor, edge_time in graph.get(node, []):
            if neighbor not in visited:
                new_cost = cost + edge_time
                heapq.heappush(open_set, (new_cost + h(neighbor), new_cost, neighbor, path + [neighbor]))

    # Fallback if no path found
    dist_km = _haversine_km(worker_lat, worker_lon, target_lat, target_lon)
    return {
        "route_nodes": [start, end],
        "eta_minutes": round(dist_km / 0.6 * 60, 1),
        "distance_km": round(dist_km, 2),
        "description": "Direct route (no optimal path found)",
    }


def find_best_worker(complaint_lat: float, complaint_lon: float,
                      workers: list) -> dict | None:
    """
    Find the closest available worker using A* routing.
    """
    best_worker = None
    best_eta    = float("inf")

    for w in workers:
        if w.get("status") != "active" or w.get("suspended"):
            continue
        wlat = w.get("current_lat") or w.get("lat", complaint_lat)
        wlon = w.get("current_lon") or w.get("lon", complaint_lon)
        route = optimize_route(wlat, wlon, complaint_lat, complaint_lon)
        if route["eta_minutes"] < best_eta:
            best_eta    = route["eta_minutes"]
            best_worker = {**w, "route": route}

    return best_worker


# ══════════════════════════════════════════════════════════════════════════
# SIMULATION ENGINE
# ══════════════════════════════════════════════════════════════════════════

SIMULATION_PRESETS = [
    {
        "name":        "Festival Weekend",
        "description": "Eid weekend + 60mm rain + no extra crew",
        "inputs": {"rainfall_mm": 60, "plastic_removed_kg": 0, "workers_deployed": 3, "tourist_density": "high"},
    },
    {
        "name":        "Emergency Cleanup",
        "description": "200kg plastic removed + 8 workers deployed",
        "inputs": {"rainfall_mm": 5, "plastic_removed_kg": 200, "workers_deployed": 8, "tourist_density": "low"},
    },
    {
        "name":        "Normal Monday",
        "description": "Typical low-activity weekday",
        "inputs": {"rainfall_mm": 8, "plastic_removed_kg": 30, "workers_deployed": 5, "tourist_density": "low"},
    },
    {
        "name":        "Worst Case",
        "description": "80mm monsoon + festival + no cleanup crew",
        "inputs": {"rainfall_mm": 80, "plastic_removed_kg": 0, "workers_deployed": 1, "tourist_density": "high"},
    },
]


def run_simulation(rainfall_mm: float, plastic_removed_kg: float,
                    workers_deployed: int, tourist_density: str,
                    scenario_name: str = "Custom") -> dict:
    """
    Run what-if scenario across all sectors.
    Returns predicted health scores and recommendations.
    """
    density_map = {"low": 0.3, "medium": 0.6, "high": 0.9}
    tourist = density_map.get(tourist_density, 0.6)

    sector_predictions = []
    for sector_id in SECTORS:
        current = compute_health_score(sector_id)

        # Build intervention
        intervention = {}
        if plastic_removed_kg > 0:
            intervention["plastic_removed_kg"] = plastic_removed_kg / len(SECTORS)
        if workers_deployed > 2:
            intervention["cleanups_added"] = workers_deployed // 2
        if rainfall_mm > 20:
            intervention["rainfall_mm"] = rainfall_mm

        simulated = simulate_score_change(sector_id, intervention)

        # Apply tourist effect
        tourist_penalty = -(tourist - 0.5) * 8 if tourist > 0.5 else 0

        pred_score = simulated["after_score"] + tourist_penalty
        pred_score = max(0, min(100, pred_score))

        sector_predictions.append({
            "sector_id":     sector_id,
            "sector_name":   SECTORS[sector_id],
            "current_score": current["score"],
            "predicted_score": round(pred_score, 1),
            "delta":         round(pred_score - current["score"], 1),
            "current_label": current["label"],
            "predicted_label": (
                "Healthy"   if pred_score >= 80 else
                "Warning"   if pred_score >= 60 else
                "Critical"  if pred_score >= 40 else
                "Emergency"
            ),
        })

    # Determine overall risk and recommendations
    min_score = min(p["predicted_score"] for p in sector_predictions)
    avg_score = sum(p["predicted_score"] for p in sector_predictions) / len(sector_predictions)

    recommendations = []
    if rainfall_mm > 40:
        recommendations.append("⚠️ Heavy rainfall predicted — pre-position crews at plastic hotspots")
    if tourist_density == "high":
        recommendations.append("🛶 High tourist activity — increase shore patrol frequency")
    if plastic_removed_kg >= 100:
        recommendations.append("✅ Major cleanup operation — expect +15–20pt health improvement")
    if workers_deployed < 3:
        recommendations.append("🚨 Insufficient staffing — minimum 5 workers recommended")
    if min_score < 40:
        recommendations.append("🆘 Emergency threshold at risk — activate full response protocol")

    return {
        "scenario_name":      scenario_name,
        "inputs": {
            "rainfall_mm":      rainfall_mm,
            "plastic_removed_kg": plastic_removed_kg,
            "workers_deployed": workers_deployed,
            "tourist_density":  tourist_density,
        },
        "sector_predictions": sector_predictions,
        "overall_current":    round(sum(p["current_score"] for p in sector_predictions) / len(sector_predictions), 1),
        "overall_predicted":  round(avg_score, 1),
        "overall_risk":       "Emergency" if min_score < 40 else "Critical" if min_score < 60 else "Warning" if min_score < 80 else "Healthy",
        "recommendations":    recommendations,
        "simulated_at":       datetime.now().isoformat(),
    }


# ══════════════════════════════════════════════════════════════════════════
# KNOWLEDGE GRAPH
# ══════════════════════════════════════════════════════════════════════════

CAUSAL_CHAINS = {
    "Illegal Dumping":    ["Drain Blockage", "Stagnant Water", "Shoreline Degradation"],
    "Drain Blockage":     ["Stagnant Water", "Algae Bloom", "Mosquito Breeding"],
    "Stagnant Water":     ["Algae Bloom", "DO Depletion"],
    "Algae Bloom":        ["DO Depletion", "Fish Kill", "Boat Navigation Blocked"],
    "DO Depletion":       ["Fish Kill", "Biodiversity Loss"],
    "Fish Kill":          ["Tourism Loss", "Resident Complaints", "Economic Impact"],
    "Oil Spill":          ["Toxicity Risk", "Tourism Loss", "Light Penetration Loss", "Fish Stress"],
    "Sewage Discharge":   ["Nutrient Loading", "Pathogen Contamination"],
    "Nutrient Loading":   ["Eutrophication"],
    "Eutrophication":     ["Algae Bloom", "DO Depletion"],
    "Plastic Waste":      ["Marine Ingestion", "Drain Blockage", "Aesthetic Degradation"],
    "Water Hyacinth":     ["DO Depletion", "Boat Navigation Blocked", "Light Penetration Loss"],
    "Mosquito Breeding":  ["Public Health Risk"],
    "Pathogen Contamination": ["Swimming Ban Risk", "Waterborne Disease"],
    "Tourism Loss":       ["Economic Impact", "Job Loss"],
    "Encroachment":       ["Lake Area Reduction", "Shoreline Degradation"],
}

SEVERITY_NODES = {
    "Fish Kill":          "critical",
    "DO Depletion":       "critical",
    "Pathogen Contamination": "high",
    "Oil Spill":          "critical",
    "Tourism Loss":       "high",
    "Economic Impact":    "high",
    "Algae Bloom":        "high",
    "Drain Blockage":     "medium",
    "Mosquito Breeding":  "medium",
    "Stagnant Water":     "medium",
}


def get_causal_chain(category: str) -> dict:
    """Return the full causal chain for a complaint category."""
    direct = CAUSAL_CHAINS.get(category, [])
    extended = {}
    for effect in direct:
        extended[effect] = CAUSAL_CHAINS.get(effect, [])

    # Build node list for D3
    all_nodes = set()
    all_nodes.add(category)
    for effect in direct:
        all_nodes.add(effect)
        for sub in extended.get(effect, []):
            all_nodes.add(sub)

    nodes = [
        {
            "id":    n,
            "label": n,
            "severity": SEVERITY_NODES.get(n, "low"),
            "is_root": n == category,
        }
        for n in all_nodes
    ]

    edges = []
    for effect in direct:
        edges.append({"from": category, "to": effect})
    for src, targets in extended.items():
        for tgt in targets:
            if tgt in all_nodes:
                edges.append({"from": src, "to": tgt})

    return {
        "root":       category,
        "nodes":      nodes,
        "edges":      edges,
        "chain_depth": 3,
        "impact_summary": f"{category} can lead to {len(all_nodes)-1} downstream effects",
    }


def get_full_graph() -> dict:
    all_nodes = set()
    for k, vs in CAUSAL_CHAINS.items():
        all_nodes.add(k)
        all_nodes.update(vs)

    edges = [
        {"from": src, "to": tgt}
        for src, targets in CAUSAL_CHAINS.items()
        for tgt in targets
    ]

    return {
        "nodes": [{"id": n, "label": n, "severity": SEVERITY_NODES.get(n, "low")} for n in all_nodes],
        "edges": edges,
        "total_relationships": len(edges),
    }
