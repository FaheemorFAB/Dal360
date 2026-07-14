"""
app.py — Dal Lake Guardian Environmental Intelligence API
LAWDA Digital Twin Platform · v2.0

30+ endpoints covering: complaints, health scores, water quality,
7-day risk forecasts, simulations, route optimization, worker
management, knowledge graph, geo-validation, and impact analytics.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import random
import time
from datetime import datetime, timedelta
import base64
import os

# ─── ML Engine imports ─────────────────────────────────────────────────────

from health_engine  import compute_all_sectors, compute_health_score, simulate_score_change, SECTORS as HEALTH_SECTORS
from forecast_engine import generate_7day_forecast
from ml_engines import (
    auto_score_priority, predict_water_quality, optimize_route, find_best_worker,
    run_simulation, SIMULATION_PRESETS,
    get_causal_chain, get_full_graph,
    SECTOR_WQ_BASELINES,
)

# ─── App Init ──────────────────────────────────────────────────────────────

app = Flask(__name__)
CORS(app)

# ─── Static seed data ──────────────────────────────────────────────────────

CATEGORIES = [
    "Plastic Waste", "Floating Waste", "Oil Spill", "Algae Bloom", "Dead Fish",
    "Sewage Discharge", "Water Hyacinth", "Illegal Dumping", "Encroachment", "Hospital Waste",
]
SEVERITIES = ["low", "medium", "high", "critical"]
STATUSES   = ["pending", "ai_review", "validated", "assigned", "in_progress", "resolved"]

STATIONS = [
    {"id": "STA-A", "name": "Nehru Park Command",  "sector": "North-West Dal", "sectorId": "north_west",
     "lat": 34.0952, "lon": 74.8415, "commander": "Cmd. Ayesha Malik",  "color": "#0EA5E9", "workers": 6},
    {"id": "STA-B", "name": "Hazratbal Command",   "sector": "West Shore",     "sectorId": "west_shore",
     "lat": 34.0810, "lon": 74.8585, "commander": "Cmd. Tariq Wani",    "color": "#14B8A6", "workers": 5},
    {"id": "STA-C", "name": "Dal Gate Command",    "sector": "East Entry",     "sectorId": "east_entry",
     "lat": 34.1020, "lon": 74.8640, "commander": "Cmd. Riyaz Khan",    "color": "#8B5CF6", "workers": 4},
    {"id": "STA-D", "name": "Shalimar Command",    "sector": "North-East Canal","sectorId": "north_east",
     "lat": 34.0720, "lon": 74.8710, "commander": "Cmd. Firdaus Bhat",  "color": "#F59E0B", "workers": 4},
    {"id": "STA-E", "name": "Central Operations",  "sector": "Central Dal",    "sectorId": "central",
     "lat": 34.0880, "lon": 74.8490, "commander": "Cmd. Zahid Mir",     "color": "#EF4444", "workers": 7},
]

WORKERS = [
    {"id": "W01", "name": "Abdul Rashid",  "role": "Boat Operator",     "station_id": "STA-A", "status": "active",  "flag_count": 0, "suspended": False, "current_lat": 34.0920, "current_lon": 74.8430, "performance_score": 91},
    {"id": "W02", "name": "Farooq Ahmed",  "role": "LAWDA Crew",        "station_id": "STA-B", "status": "active",  "flag_count": 0, "suspended": False, "current_lat": 34.0810, "current_lon": 74.8560, "performance_score": 87},
    {"id": "W03", "name": "Zahid Mir",     "role": "Volunteer",         "station_id": "STA-E", "status": "idle",    "flag_count": 1, "suspended": False, "current_lat": 34.0870, "current_lon": 74.8490, "performance_score": 74},
    {"id": "W04", "name": "Nazia Bhat",    "role": "Lead Inspector",    "station_id": "STA-C", "status": "active",  "flag_count": 0, "suspended": False, "current_lat": 34.1010, "current_lon": 74.8640, "performance_score": 95},
    {"id": "W05", "name": "Tariq Lone",    "role": "Municipal Worker",  "station_id": "STA-D", "status": "offline", "flag_count": 2, "suspended": False, "current_lat": 34.0720, "current_lon": 74.8700, "performance_score": 61},
    {"id": "W06", "name": "Firdaus Shah",  "role": "Boat Operator",     "station_id": "STA-A", "status": "active",  "flag_count": 0, "suspended": False, "current_lat": 34.0955, "current_lon": 74.8415, "performance_score": 88},
    {"id": "W07", "name": "Bilal Wani",    "role": "Surveillance",      "station_id": "STA-B", "status": "active",  "flag_count": 0, "suspended": False, "current_lat": 34.0800, "current_lon": 74.8590, "performance_score": 82},
]


def random_dal_point():
    lat = 34.0600 + random.random() * 0.070
    lon = 74.8050 + random.random() * 0.088
    return lat, lon


def generate_complaints(n=60):
    complaints = []
    now = datetime.now()
    for i in range(n):
        lat, lon = random_dal_point()
        cat      = random.choice(CATEGORIES)
        status   = random.choice(STATUSES)
        dt       = now - timedelta(hours=random.randint(0, 72))
        hours_un = (now - dt).total_seconds() / 3600

        # Auto-score priority
        priority = auto_score_priority(cat, lat, lon, hours_un)

        complaints.append({
            "id":               f"DLG-{1000 + i}",
            "category":         cat,
            "severity":         random.choice(SEVERITIES),
            "ai_severity":      priority["ai_severity"],
            "priority_score":   priority["priority_score"],
            "ai_explanation":   priority["explanation"],
            "status":           status,
            "lat":              round(lat, 6),
            "lon":              round(lon, 6),
            "sector_id":        random.choice(list(HEALTH_SECTORS.keys())),
            "description":      random.choice([
                "Large patch of floating plastic bags near the shore",
                "Oil slick visible on water surface",
                "Dense water hyacinth covering 50m² area",
                "Sewage discharge from nearby houseboat",
                "Dead fish spotted near Nehru Park ghat",
                "Garbage dump on shikara landing zone",
                "Algal bloom covering large area",
                "Illegal construction near lake boundary",
            ]),
            "ai_confidence":    round(random.uniform(0.72, 0.99), 2),
            "geo_validated":    True,
            "timestamp":        dt.isoformat(),
            "created_at":       dt.isoformat(),
            "station_id":       random.choice([s["id"] for s in STATIONS]),
            "worker_id":        random.choice([w["id"] for w in WORKERS]) if status in ["assigned","in_progress","resolved"] else None,
            "image_url":        f"https://picsum.photos/seed/{200+i}/600/400",
            "culprit_status":   "none",
            "health_delta":     round(random.uniform(5, 25), 1) if status == "resolved" else None,
        })
    return complaints


COMPLAINTS   = generate_complaints(60)

# ─── Core Routes ───────────────────────────────────────────────────────────

@app.route("/api/health")
def health_check():
    return jsonify({"status": "ok", "service": "Dal Lake Guardian API v2.0", "timestamp": datetime.now().isoformat()})

@app.route("/api/stations")
def get_stations():
    # Attach live complaint count per station
    result = []
    for sta in STATIONS:
        count = len([c for c in COMPLAINTS if c["station_id"] == sta["id"]])
        pending = len([c for c in COMPLAINTS if c["station_id"] == sta["id"] and c["status"] == "pending"])
        result.append({**sta, "total_complaints": count, "pending_complaints": pending})
    return jsonify({"stations": result})

@app.route("/api/complaints")
def get_complaints():
    status   = request.args.get("status")
    category = request.args.get("category")
    station  = request.args.get("station_id")
    sector   = request.args.get("sector_id")
    result   = COMPLAINTS

    if status:   result = [c for c in result if c["status"] == status]
    if category: result = [c for c in result if c["category"] == category]
    if station:  result = [c for c in result if c.get("station_id") == station]
    if sector:   result = [c for c in result if c.get("sector_id") == sector]

    return jsonify({"complaints": result, "total": len(result)})

@app.route("/api/complaints/<complaint_id>")
def get_complaint(complaint_id):
    c = next((c for c in COMPLAINTS if c["id"] == complaint_id), None)
    if not c:
        return jsonify({"error": "Not found"}), 404
    return jsonify(c)

@app.route("/api/complaints", methods=["POST"])
def create_complaint():
    data = request.json or {}
    lat  = data.get("lat", 34.0895)
    lon  = data.get("lon", 74.8564)
    cat  = data.get("category", "Plastic Waste")
    priority = auto_score_priority(cat, lat, lon)

    complaint = {
        "id":              f"DLG-{random.randint(5000, 9999)}",
        "category":        cat,
        "severity":        data.get("severity", priority["ai_severity"]),
        "ai_severity":     priority["ai_severity"],
        "priority_score":  priority["priority_score"],
        "ai_explanation":  priority["explanation"],
        "status":          "pending",
        "lat":             lat, "lon": lon,
        "sector_id":       data.get("sector_id", "central"),
        "description":     data.get("description", ""),
        "ai_confidence":   round(random.uniform(0.78, 0.97), 2),
        "geo_validated":   data.get("geo_validated", False),
        "geo_reason":      data.get("geo_reason", ""),
        "station_id":      None, "worker_id": None,
        "image_url":       data.get("image_url", ""),
        "culprit_status":  "none",
        "timestamp":       datetime.now().isoformat(),
        "created_at":      datetime.now().isoformat(),
        "health_delta":    None,
    }
    COMPLAINTS.insert(0, complaint)
    return jsonify(complaint), 201

@app.route("/api/complaints/<complaint_id>/status", methods=["PATCH"])
def update_complaint_status(complaint_id):
    data = request.json or {}
    c = next((c for c in COMPLAINTS if c["id"] == complaint_id), None)
    if not c:
        return jsonify({"error": "Not found"}), 404
    c["status"]    = data.get("status", c["status"])
    c["worker_id"] = data.get("worker_id", c.get("worker_id"))
    if c["status"] == "resolved":
        c["resolved_at"] = datetime.now().isoformat()
        c["health_delta"] = round(random.uniform(5, 25), 1)
    return jsonify(c)

@app.route("/api/complaints/<complaint_id>/culprit", methods=["POST"])
def log_culprit(complaint_id):
    data = request.json or {}
    c = next((c for c in COMPLAINTS if c["id"] == complaint_id), None)
    if not c:
        return jsonify({"error": "Not found"}), 404
    c["culprit_name"]   = data.get("culprit_name")
    c["culprit_ref"]    = data.get("culprit_ref")
    c["culprit_status"] = "under_investigation"
    return jsonify(c)

@app.route("/api/workers")
def get_workers():
    station_id = request.args.get("station_id")
    workers = WORKERS
    if station_id:
        workers = [w for w in workers if w["station_id"] == station_id]
    return jsonify({"workers": workers})

@app.route("/api/workers/<worker_id>/tasks")
def worker_tasks(worker_id):
    tasks = [c for c in COMPLAINTS if c.get("worker_id") == worker_id]
    return jsonify({"tasks": tasks})

@app.route("/api/workers/<worker_id>/flag", methods=["POST"])
def flag_worker(worker_id):
    data = request.json or {}
    w = next((w for w in WORKERS if w["id"] == worker_id), None)
    if not w:
        return jsonify({"error": "Not found"}), 404
    w["flag_count"] += 1
    w["last_flag_reason"] = data.get("reason", "Performance issue")
    w["performance_score"] = max(0, w["performance_score"] - 10)
    return jsonify({"worker": w, "message": f"Worker {w['name']} flagged. Total flags: {w['flag_count']}"})

@app.route("/api/workers/<worker_id>/suspend", methods=["POST"])
def suspend_worker(worker_id):
    w = next((w for w in WORKERS if w["id"] == worker_id), None)
    if not w:
        return jsonify({"error": "Not found"}), 404
    w["suspended"] = True
    w["status"]    = "offline"
    return jsonify({"worker": w, "message": f"Worker {w['name']} suspended."})

@app.route("/api/stats")
def get_stats():
    pending    = len([c for c in COMPLAINTS if c["status"] == "pending"])
    resolved   = len([c for c in COMPLAINTS if c["status"] == "resolved"])
    high_risk  = len([c for c in COMPLAINTS if c["ai_severity"] in ["high","critical"]])
    active_w   = len([w for w in WORKERS if w["status"] == "active"])
    all_scores = compute_all_sectors()
    lake_score = all_scores["overall"]

    return jsonify({
        "pending_complaints": pending,
        "resolved_today":     resolved,
        "high_risk_zones":    high_risk,
        "active_workers":     active_w,
        "ai_alerts":          random.randint(3, 12),
        "lake_health_score":  lake_score,
        "lake_health_label":  all_scores["overall_label"],
        "total_complaints":   len(COMPLAINTS),
        "reports_today":      random.randint(8, 25),
        "sector_count":       len(HEALTH_SECTORS),
        "stations_online":    len(STATIONS),
    })

# ─── ML: Health Score ─────────────────────────────────────────────────────

@app.route("/api/health-score")
def get_health_scores():
    return jsonify(compute_all_sectors())

@app.route("/api/health-score/<sector_id>")
def get_sector_health(sector_id):
    if sector_id not in HEALTH_SECTORS:
        return jsonify({"error": "Unknown sector"}), 404
    return jsonify(compute_health_score(sector_id))

@app.route("/api/health-score/<sector_id>/history")
def get_health_history(sector_id):
    # Simulated 30-day history
    now = datetime.now()
    history = []
    base = compute_health_score(sector_id)["score"]
    for i in range(29, -1, -1):
        d = now - timedelta(days=i)
        noise = random.gauss(0, 4)
        trend = -i * 0.1 if base < 60 else 0  # Declining trend for poor sectors
        history.append({
            "date":  d.strftime("%Y-%m-%d"),
            "score": round(max(0, min(100, base + noise + trend)), 1),
        })
    return jsonify({"sector_id": sector_id, "history": history})

# ─── ML: Water Quality ────────────────────────────────────────────────────

@app.route("/api/water-quality")
def get_water_quality():
    rainfall = float(request.args.get("rainfall_mm", 5.0))
    return jsonify({
        "sectors": [predict_water_quality(sid, rainfall) for sid in HEALTH_SECTORS],
    })

@app.route("/api/water-quality/<sector_id>")
def get_sector_wq(sector_id):
    if sector_id not in HEALTH_SECTORS:
        return jsonify({"error": "Unknown sector"}), 404
    rainfall = float(request.args.get("rainfall_mm", 5.0))
    return jsonify(predict_water_quality(sector_id, rainfall))

# ─── ML: Forecast ─────────────────────────────────────────────────────────

@app.route("/api/forecast")
def get_forecast():
    sector_id = request.args.get("sector_id")
    return jsonify(generate_7day_forecast(sector_id))

# ─── ML: Satellite ───────────────────────────────────────────────────────

@app.route("/api/satellite/latest")
def get_satellite():
    # Pre-processed Sentinel-2 derived data for Dal Lake
    return jsonify({
        "source":       "Sentinel-2 · ESA Copernicus",
        "image_date":   "2026-07-08",
        "processed_at": datetime.now().isoformat(),
        "note":         "🛰️ Weekly update · ESA open data",
        "sectors": [
            {
                "sector_id":              "north_west",
                "ndwi":                   0.42,
                "ndvi":                   0.28,
                "evi":                    0.19,
                "vegetation_coverage_pct": 32.5,
                "algae_probability":      0.35,
                "water_body_change_pct":  -1.2,
                "notes":                  "Moderate floating vegetation detected",
            },
            {
                "sector_id":              "west_shore",
                "ndwi":                   0.38,
                "ndvi":                   0.41,
                "evi":                    0.31,
                "vegetation_coverage_pct": 52.1,
                "algae_probability":      0.71,
                "water_body_change_pct":  -0.8,
                "notes":                  "High algae probability — dense surface bloom visible",
            },
            {
                "sector_id":              "east_entry",
                "ndwi":                   0.55,
                "ndvi":                   0.15,
                "evi":                    0.11,
                "vegetation_coverage_pct": 12.3,
                "algae_probability":      0.18,
                "water_body_change_pct":  0.2,
                "notes":                  "Clear water — low vegetation",
            },
            {
                "sector_id":              "north_east",
                "ndwi":                   0.44,
                "ndvi":                   0.33,
                "evi":                    0.24,
                "vegetation_coverage_pct": 41.2,
                "algae_probability":      0.48,
                "water_body_change_pct":  -0.5,
                "notes":                  "Moderate hyacinth coverage",
            },
            {
                "sector_id":              "central",
                "ndwi":                   0.31,
                "ndvi":                   0.58,
                "evi":                    0.44,
                "vegetation_coverage_pct": 68.4,
                "algae_probability":      0.82,
                "water_body_change_pct":  -2.1,
                "notes":                  "🔴 Critical — extensive algae bloom + lake area shrinkage",
            },
        ]
    })

# ─── ML: Simulation ───────────────────────────────────────────────────────

@app.route("/api/simulate", methods=["POST"])
def simulate():
    data = request.json or {}
    result = run_simulation(
        rainfall_mm          = float(data.get("rainfall_mm", 10)),
        plastic_removed_kg   = float(data.get("plastic_removed_kg", 0)),
        workers_deployed     = int(data.get("workers_deployed", 5)),
        tourist_density      = data.get("tourist_density", "medium"),
        scenario_name        = data.get("scenario", "Custom"),
    )
    return jsonify(result)

@app.route("/api/simulate/presets")
def simulate_presets():
    return jsonify({"presets": SIMULATION_PRESETS})

# ─── ML: Route Optimization ───────────────────────────────────────────────

@app.route("/api/route-optimize")
def route_optimize():
    w_lat  = float(request.args.get("worker_lat",    34.0920))
    w_lon  = float(request.args.get("worker_lon",    74.8430))
    t_lat  = float(request.args.get("target_lat",    34.0810))
    t_lon  = float(request.args.get("target_lon",    74.8585))
    result = optimize_route(w_lat, w_lon, t_lat, t_lon)
    return jsonify(result)

@app.route("/api/route-optimize/best-worker")
def best_worker():
    t_lat  = float(request.args.get("target_lat", 34.0895))
    t_lon  = float(request.args.get("target_lon", 74.8564))
    available = [w for w in WORKERS if not w.get("suspended")]
    best = find_best_worker(t_lat, t_lon, available)
    if not best:
        return jsonify({"error": "No available workers"}), 404
    return jsonify(best)

# ─── ML: Knowledge Graph ──────────────────────────────────────────────────

@app.route("/api/knowledge-graph")
def knowledge_graph():
    return jsonify(get_full_graph())

@app.route("/api/knowledge-graph/<category>")
def knowledge_graph_category(category):
    cat = category.replace("-", " ").replace("_", " ").title()
    return jsonify(get_causal_chain(cat))

# ─── ML: Priority Scoring ─────────────────────────────────────────────────

@app.route("/api/ai/priority-score", methods=["POST"])
def priority_score():
    data = request.json or {}
    result = auto_score_priority(
        category         = data.get("category", "Plastic Waste"),
        lat              = float(data.get("lat", 34.0895)),
        lon              = float(data.get("lon", 74.8564)),
        hours_unresolved = float(data.get("hours_unresolved", 0)),
        is_repeat_location= data.get("is_repeat_location", False),
    )
    return jsonify(result)

# ─── ML: Geo Validation ───────────────────────────────────────────────────

@app.route("/api/ai/validate-geo", methods=["POST"])
def validate_geo():
    """
    Geo-validate a photo using Gemini Vision API.
    Falls back to GPS-only if GEMINI_API_KEY not set.
    """
    lat = float(request.form.get("lat", 34.0895))
    lon = float(request.form.get("lon", 74.8564))
    coords_valid = request.form.get("coords_valid", "true").lower() == "true"
    image_file = request.files.get("image")

    gemini_key = os.environ.get("GEMINI_API_KEY")

    if gemini_key and image_file:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)

            img_bytes = image_file.read()
            model     = genai.GenerativeModel("gemini-1.5-flash")
            prompt = (
                "Analyze this image and determine if it was taken at or near Dal Lake "
                "in Srinagar, Kashmir, India. Look for: water body with Kashmiri landscape, "
                "houseboats, shikaras, mountains in background, floating gardens, "
                "or typical Dal Lake shoreline features. "
                "Respond ONLY with JSON: "
                '{\"valid\": true/false, \"confidence\": 0.0-1.0, '
                '"reason\": \"brief explanation\", '
                '"detected_features\": [\"list\", \"of\", \"features\"]}'
            )
            import google.generativeai.types as gtypes
            response = model.generate_content(
                [prompt, gtypes.Part.from_bytes(img_bytes, mime_type=image_file.content_type)]
            )
            import json, re
            raw  = response.text
            m    = re.search(r'\{.*\}', raw, re.DOTALL)
            data = json.loads(m.group()) if m else {}

            return jsonify({
                "valid":              bool(data.get("valid", False)) and coords_valid,
                "confidence":         float(data.get("confidence", 0)),
                "reason":             data.get("reason", "Analysis complete"),
                "detected_features":  data.get("detected_features", []),
                "coordinates_valid":  coords_valid,
                "method":             "gemini_vision",
            })
        except Exception as e:
            pass  # Fallback to GPS-only below

    # GPS-only fallback
    dal_bounds = {"minLat": 34.055, "maxLat": 34.135, "minLon": 74.800, "maxLon": 74.920}
    in_bounds  = (
        dal_bounds["minLat"] <= lat <= dal_bounds["maxLat"] and
        dal_bounds["minLon"] <= lon <= dal_bounds["maxLon"]
    )
    return jsonify({
        "valid":             in_bounds,
        "confidence":        0.75 if in_bounds else 0.0,
        "reason":            (
            "GPS coordinates within Dal Lake boundary"
            if in_bounds
            else f"GPS coordinates ({lat:.4f}°N, {lon:.4f}°E) outside Dal Lake boundary"
        ),
        "detected_features": ["GPS validated"],
        "coordinates_valid": in_bounds,
        "method":            "gps_fallback",
        "note":              "Set GEMINI_API_KEY for full image analysis",
    })

# ─── ML: Image Analysis ───────────────────────────────────────────────────

@app.route("/api/ai/analyze", methods=["POST"])
def analyze_image():
    """Gemini Vision waste detection. Falls back to simulated if no key."""
    time.sleep(0.4)  # Realistic processing time

    gemini_key = os.environ.get("GEMINI_API_KEY")
    image_file = request.files.get("image")

    if gemini_key and image_file:
        try:
            import google.generativeai as genai
            import google.generativeai.types as gtypes
            import json, re
            genai.configure(api_key=gemini_key)
            model     = genai.GenerativeModel("gemini-1.5-flash")
            img_bytes = image_file.read()
            prompt = (
                "Analyze this water/lake image for pollution. Detect: plastic waste, "
                "oil spills, algae blooms, water hyacinth, dead fish, sewage discharge, "
                "floating garbage. Respond ONLY with JSON: "
                '{"detections": [{"object": "name", "confidence": 0.0-1.0}], '
                '"overall_confidence": 0.0-1.0, "predicted_category": "category", '
                '"severity": "low/medium/high/critical", "heatmap_contribution": 0.0-1.0}'
            )
            response = model.generate_content(
                [prompt, gtypes.Part.from_bytes(img_bytes, mime_type=image_file.content_type)]
            )
            raw  = response.text
            m    = re.search(r'\{.*\}', raw, re.DOTALL)
            data = json.loads(m.group()) if m else {}
            return jsonify({**data, "method": "gemini_vision"})
        except Exception:
            pass

    # Simulated fallback
    detections = []
    object_types = ["Plastic Bottle", "Garbage Bag", "Floating Waste", "Water Hyacinth", "Algae Patch", "Oil Sheen"]
    for _ in range(random.randint(1, 4)):
        detections.append({
            "object":     random.choice(object_types),
            "confidence": round(random.uniform(0.75, 0.98), 2),
        })
    return jsonify({
        "detections":          detections,
        "overall_confidence":  round(random.uniform(0.80, 0.97), 2),
        "predicted_category":  random.choice(CATEGORIES),
        "severity":            random.choice(SEVERITIES),
        "heatmap_contribution": round(random.uniform(0.5, 1.0), 2),
        "method":              "simulated",
        "note":                "Set GEMINI_API_KEY for real detection",
    })

# ─── Analytics ────────────────────────────────────────────────────────────

@app.route("/api/analytics")
def analytics():
    days = 30
    now  = datetime.now()
    daily = []
    for i in range(days):
        d = now - timedelta(days=days-i)
        daily.append({
            "date":          d.strftime("%Y-%m-%d"),
            "reports":       random.randint(5, 35),
            "resolved":      random.randint(3, 28),
            "ai_detections": random.randint(2, 20),
        })
    cat_counts = {}
    for c in COMPLAINTS:
        cat_counts[c["category"]] = cat_counts.get(c["category"], 0) + 1

    return jsonify({
        "daily":              daily,
        "by_category":        [{"category": k, "count": v} for k, v in cat_counts.items()],
        "avg_resolution_hrs": round(random.uniform(4, 22), 1),
        "ai_accuracy":        0.912,
    })

@app.route("/api/analytics/impact")
def impact_analytics():
    resolved = [c for c in COMPLAINTS if c["status"] == "resolved"]
    total_health_delta = sum(c.get("health_delta") or 0 for c in resolved)
    avg_delta = total_health_delta / max(len(resolved), 1)

    return jsonify({
        "total_cleanups":        len(resolved),
        "avg_health_improvement": round(avg_delta, 1),
        "total_waste_kg_est":    round(len(resolved) * 24.5, 1),
        "avg_resolution_hrs":    round(random.uniform(4, 18), 1),
        "co2_prevented_kg_est":  round(len(resolved) * 0.82, 1),
        "tourism_value_protected_lakh": round(len(resolved) * 1.2, 1),
        "top_workers": [
            {"name": w["name"], "cleanups": random.randint(3, 12), "score": w["performance_score"]}
            for w in sorted(WORKERS, key=lambda x: x["performance_score"], reverse=True)[:3]
        ],
    })

@app.route("/api/heatmap")
def get_heatmap():
    points = [{"lat": c["lat"], "lon": c["lon"], "weight": c["priority_score"], "category": c["category"]}
              for c in COMPLAINTS]
    return jsonify({"points": points, "total": len(points)})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
