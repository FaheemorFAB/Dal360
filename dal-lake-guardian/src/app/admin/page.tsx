"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import SideNav from "@/components/SideNav";
import {
  LayoutDashboard, Globe, ClipboardList, Building2, Users,
  Bot, BarChart3, FlaskConical, Network, ShieldAlert,
  TrendingDown, TrendingUp, Minus, AlertTriangle, CheckCircle,
  Flag, Ban, Gavel, Activity, Droplets, Thermometer,
  Wind, Eye, Zap, Info, ChevronRight, RefreshCw, Video
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { getHealthColor, getHealthStatus, STATIONS as STATION_DATA } from "@/lib/constants";

const DalLakeMap = dynamic(() => import("@/components/DalLakeMap"), { ssr: false });
const DalLakeCesiumTwin = dynamic(() => import("@/components/DalLakeCesiumTwin"), { ssr: false });

// ─── Nav items ────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "dashboard",      label: "Operations Room",    Icon: LayoutDashboard },
  { id: "twin",          label: "Digital Twin Command Center",   Icon: Globe },
  { id: "health",        label: "Lake Health Score",  Icon: Activity },
  { id: "forecast",      label: "Risk Forecast",      Icon: AlertTriangle },
  { id: "simulate",      label: "Simulation Lab",     Icon: FlaskConical },
  { id: "tickets",       label: "Inflow Tickets",     Icon: ClipboardList },
  { id: "stations",      label: "Station Network",    Icon: Building2 },
  { id: "fleet",         label: "Fleet Monitor",      Icon: Users },
  { id: "accountability",label: "Accountability",     Icon: Gavel },
  { id: "analytics",     label: "Analytics",          Icon: BarChart3 },
];

// ─── Static seed data ─────────────────────────────────────────────────────

const SECTOR_HEALTH = [
  { id: "hazratbal",  name: "Hazratbal (NW Shore)",          score: 68, trend: "declining", station: "STA-HAZ" },
  { id: "boddal",     name: "Bod Dal (N Basin)",             score: 75, trend: "stable",    station: "STA-BD" },
  { id: "nishat",     name: "Nishat–Shalimar (NE Shore)",    score: 82, trend: "stable",    station: "STA-NS" },
  { id: "nigeen",     name: "Nigeen Lake (W Lobe)",          score: 90, trend: "improving", station: "STA-NG" },
  { id: "lokutdal",   name: "Lokut Dal (Central)",           score: 56, trend: "declining", station: "STA-LD" },
  { id: "rainawari",  name: "Rainawari (SW Shore)",          score: 61, trend: "declining", station: "STA-RW" },
  { id: "boulevard",  name: "Boulevard–Tulip Garden (SE)",   score: 72, trend: "improving", station: "STA-BL" },
  { id: "gagribal",   name: "Gagribal–Foreshore (S Basin)",  score: 64, trend: "stable",    station: "STA-GB" },
];

const COMPLAINTS = [
  { id: "DLG-1034", cat: "Plastic Waste",   severity: "critical", aiSeverity: "critical", status: "pending",     area: "Hazratbal Basin",    lat: 34.1280, lon: 74.8420,  time: "2m ago",  confidence: 0.96, explanation: "Plastic Waste × Hazratbal Basin critical threshold", priorityScore: 0.91 },
  { id: "DLG-1033", cat: "Oil Spill",       severity: "critical", aiSeverity: "critical", status: "assigned",    area: "Boulevard Basin",     lat: 34.0850, lon: 74.8620,  time: "8m ago",  confidence: 0.91, explanation: "Oil Spill × houseboat zone",       priorityScore: 0.87 },
  { id: "DLG-1032", cat: "Sewage Discharge",severity: "high",     aiSeverity: "high",     status: "in_progress", area: "Rainawari Basin",      lat: 34.0960, lon: 74.8350,  time: "15m ago", confidence: 0.88, explanation: "Sewage spill in west residential shore",            priorityScore: 0.78 },
  { id: "DLG-1031", cat: "Water Hyacinth",  severity: "medium",   aiSeverity: "medium",   status: "pending",     area: "Lokut Dal Area",   lat: 34.0960, lon: 74.8480,  time: "22m ago", confidence: 0.84, explanation: "Weed canopy blocks tourist lanes",                             priorityScore: 0.42 },
  { id: "DLG-1030", cat: "Dead Fish",       severity: "high",     aiSeverity: "critical", status: "resolved",    area: "Nishat Basin",      lat: 34.1150, lon: 74.8720,  time: "1h ago",  confidence: 0.79, explanation: "Anoxic conditions lead to fish kill",         priorityScore: 0.88 },
];

const WORKERS = [
  { id: "W01", name: "Abdul Rashid",  role: "Boat Operator",  station: "STA-HAZ", status: "active",  tasks: 2, lat: 34.1280, lon: 74.8420, score: 91, flags: 0, suspended: false },
  { id: "W02", name: "Farooq Ahmed",  role: "LCMA Crew",     station: "STA-GB",  status: "active",  tasks: 1, lat: 34.0790, lon: 74.8520, score: 87, flags: 0, suspended: false },
  { id: "W03", name: "Zahid Mir",     role: "Volunteer",      station: "STA-LD",  status: "idle",    tasks: 0, lat: 34.0960, lon: 74.8480, score: 74, flags: 1, suspended: false },
  { id: "W04", name: "Nazia Bhat",    role: "Lead Inspector", station: "STA-NS",  status: "active",  tasks: 3, lat: 34.1150, lon: 74.8720, score: 95, flags: 0, suspended: false },
  { id: "W05", name: "Tariq Lone",    role: "Municipal",      station: "STA-RW",  status: "offline", tasks: 0, lat: 34.0960, lon: 74.8350, score: 61, flags: 2, suspended: false },
];

const DAILY_TRENDS = [
  { day: "Jul 7",  reports: 18, resolved: 14, health: 62 },
  { day: "Jul 8",  reports: 24, resolved: 19, health: 59 },
  { day: "Jul 9",  reports: 15, resolved: 12, health: 61 },
  { day: "Jul 10", reports: 30, resolved: 22, health: 55 },
  { day: "Jul 11", reports: 28, resolved: 20, health: 57 },
  { day: "Jul 12", reports: 35, resolved: 27, health: 58 },
  { day: "Jul 13", reports: 22, resolved: 18, health: 58 },
];

const CATEGORY_DATA = [
  { name: "Plastic",   value: 34 },
  { name: "Hyacinth",  value: 22 },
  { name: "Oil Slick", value: 18 },
  { name: "Sewage",    value: 15 },
  { name: "Other",     value: 11 },
];
const CHART_COLORS = ["#0EA5E9", "#F59E0B", "#EF4444", "#8B5CF6", "#14B8A6"];

const SIMULATION_PRESETS = [
  { name: "Festival Weekend", rainfall: 60, plastic: 0,   workers: 3, density: "high",   desc: "Eid weekend + 60mm rain + no extra crew" },
  { name: "Emergency Cleanup",rainfall: 5,  plastic: 200, workers: 8, density: "low",    desc: "200kg plastic removed + 8 workers deployed" },
  { name: "Normal Monday",    rainfall: 8,  plastic: 30,  workers: 5, density: "low",    desc: "Typical low-activity weekday" },
  { name: "Worst Case",       rainfall: 80, plastic: 0,   workers: 1, density: "high",   desc: "80mm monsoon + festival + minimal crew" },
];

const RISK_FORECAST = [
  { day: "Mon", date: "Jul 14", rain: 8,  risk: "low",      alerts: 0 },
  { day: "Tue", date: "Jul 15", rain: 35, risk: "high",     alerts: 3 },
  { day: "Wed", date: "Jul 16", rain: 62, risk: "critical", alerts: 5 },
  { day: "Thu", date: "Jul 17", rain: 45, risk: "high",     alerts: 4 },
  { day: "Fri", date: "Jul 18", rain: 12, risk: "medium",   alerts: 1 },
  { day: "Sat", date: "Jul 19", rain: 5,  risk: "medium",   alerts: 2 },
  { day: "Sun", date: "Jul 20", rain: 3,  risk: "low",      alerts: 0 },
];

// ─── Sub-components ───────────────────────────────────────────────────────

function SeverityBadge({ sev }: { sev: string }) {
  const cls = { critical: "badge-critical", high: "badge-warning", medium: "badge-info", low: "badge-healthy", resolved: "badge-healthy" }[sev] ?? "badge-muted";
  return <span className={`badge ${cls}`}>{sev}</span>;
}

function StatusBadge({ s }: { s: string }) {
  const cls = { pending: "badge-warning", assigned: "badge-info", in_progress: "badge-purple", resolved: "badge-healthy", validated: "badge-teal" }[s] ?? "badge-muted";
  return <span className={`badge ${cls}`}>{s.replace("_", " ")}</span>;
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "improving") return <TrendingUp size={13} color="#10B981" />;
  if (trend === "declining") return <TrendingDown size={13} color="#EF4444" />;
  return <Minus size={13} color="#F59E0B" />;
}

function SectionTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>{title}</h1>
      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{sub}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function AdminPortal() {
  const [section,  setSection]  = useState("dashboard");
  const [time,     setTime]     = useState("");
  const [workers,  setWorkers]  = useState(WORKERS);
  const [twinMode, setTwinMode] = useState<"2d" | "3d">("3d");
  const [timeSlider, setTimeSlider] = useState<number>(1); // 0: Past 24h, 1: Current, 2: +7 Days, 3: +14 Days
  const [isPlayingSim, setIsPlayingSim] = useState(false);
  const [complaints, setComplaints] = useState<any[]>(COMPLAINTS);

  useEffect(() => {
    const checkCustom = () => {
      const custom = JSON.parse(localStorage.getItem("dal-custom-complaints") || "[]");
      if (custom.length > 0) {
        setComplaints([...custom, ...COMPLAINTS]);
      } else {
        setComplaints(COMPLAINTS);
      }
    };
    checkCustom();
    const interval = setInterval(checkCustom, 2000);
    return () => clearInterval(interval);
  }, []);

  // Auto-play timeline simulation effect
  useEffect(() => {
    if (!isPlayingSim) return;
    const interval = setInterval(() => {
      setTimeSlider((prev) => (prev + 1) % 4);
    }, 1800);
    return () => clearInterval(interval);
  }, [isPlayingSim]);

  // Sector health list as state so it is dynamic
  const [sectorHealth, setSectorHealth] = useState([
    { id: "hazratbal",  name: "Hazratbal (NW Shore)",          score: 68, trend: "declining", station: "STA-HAZ" },
    { id: "boddal",     name: "Bod Dal (N Basin)",             score: 75, trend: "stable",    station: "STA-BD" },
    { id: "nishat",     name: "Nishat–Shalimar (NE Shore)",    score: 68, trend: "stable",    station: "STA-NS" },
    { id: "nigeen",     name: "Nigeen Lake (W Lobe)",          score: 90, trend: "improving", station: "STA-NG" },
    { id: "lokutdal",   name: "Lokut Dal (Central)",           score: 56, trend: "declining", station: "STA-LD" },
    { id: "rainawari",  name: "Rainawari (SW Shore)",          score: 61, trend: "declining", station: "STA-RW" },
    { id: "boulevard",  name: "Boulevard–Tulip Garden (SE)",   score: 85, trend: "improving", station: "STA-BL" },
    { id: "gagribal",   name: "Gagribal–Foreshore (S Basin)",  score: 64, trend: "stable",    station: "STA-GB" },
  ]);

  // Simulation state variables
  const [simInputs, setSimInputs] = useState({ rainfall: 20, plastic: 50, workers: 5, density: "medium" });
  const [simResult, setSimResult] = useState<any>(null);
  const [simSectorsMap, setSimSectorsMap] = useState<Record<string, number> | null>(null);
  const [simRunning, setSimRunning] = useState(false);
  const [simTimeline, setSimTimeline] = useState<any[] | null>(null);
  const [selectedDay, setSelectedDay] = useState("Wed");

  // Live Water Quality Telemetry State
  const [liveSensors, setLiveSensors] = useState({ turbidity: 68.2, do: 4.12, ph: 7.23, temp: 22.4 });
  const [sensorHistory, setSensorHistory] = useState<any[]>([
    { time: "23:01", turbidity: 68.1, do: 4.10, ph: 7.21, temp: 22.3 },
    { time: "23:02", turbidity: 68.3, do: 4.12, ph: 7.22, temp: 22.4 },
    { time: "23:03", turbidity: 68.2, do: 4.11, ph: 7.23, temp: 22.4 },
  ]);
  const [selectedCamera, setSelectedCamera] = useState<any>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    
    // Telemetry tick every 2.5 seconds
    const telemetryId = setInterval(() => {
      setLiveSensors(prev => {
        const next = {
          turbidity: parseFloat(Math.max(10, Math.min(100, prev.turbidity + (Math.random() - 0.5) * 0.4)).toFixed(1)),
          do: parseFloat(Math.max(2, Math.min(12, prev.do + (Math.random() - 0.5) * 0.08)).toFixed(2)),
          ph: parseFloat(Math.max(5, Math.min(9, prev.ph + (Math.random() - 0.5) * 0.02)).toFixed(2)),
          temp: parseFloat(Math.max(15, Math.min(30, prev.temp + (Math.random() - 0.5) * 0.06)).toFixed(1)),
        };
        
        setSensorHistory(hist => {
          const now = new Date().toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
          const newHist = [...hist, { time: now, ...next }];
          if (newHist.length > 8) newHist.shift();
          return newHist;
        });
        
        return next;
      });
    }, 2500);

    return () => {
      clearInterval(id);
      clearInterval(telemetryId);
    };
  }, []);

  const getSectorScore = (baseScore: number, id: string) => {
    if (timeSlider === 0) return Math.min(100, Math.max(0, baseScore - 3));
    if (timeSlider === 1) return baseScore;
    
    // Simulate decay over time (simulating heavy rain/runoff and pollution diffusion)
    const decay = id === "hazratbal" || id === "lokutdal" || id === "rainawari" ? 7 : 4;
    if (timeSlider === 2) return Math.max(0, baseScore - decay);
    return Math.max(0, baseScore - Math.round(decay * 1.7));
  };

  const activeSectorsData = sectorHealth.map((s) => ({
    ...s,
    score: getSectorScore(s.score, s.id),
  }));

  const overallScore = Math.round(activeSectorsData.reduce((s, x) => s + x.score, 0) / activeSectorsData.length);
  const overallColor = getHealthColor(overallScore);

  const currentSectorScores: Record<string, number> = {};
  activeSectorsData.forEach((s) => {
    currentSectorScores[s.id] = s.score;
  });

  const flagWorker = (workerId: string) =>
    setWorkers((prev) => prev.map((w) => w.id === workerId ? { ...w, flags: w.flags + 1, score: Math.max(0, w.score - 10) } : w));
  const suspendWorker = (workerId: string) =>
    setWorkers((prev) => prev.map((w) => w.id === workerId ? { ...w, suspended: true, status: "offline" } : w));

  const runSimulation = async () => {
    setSimRunning(true);
    await new Promise((r) => setTimeout(r, 900));
    const density = simInputs.density === "high" ? 0.9 : simInputs.density === "medium" ? 0.6 : 0.3;
    const result = sectorHealth.map((s) => {
      let delta = 0;
      delta += simInputs.plastic > 0 ? (simInputs.plastic / 50) * 4 : 0;
      delta += simInputs.workers > 4 ? (simInputs.workers - 4) * 2 : -(4 - simInputs.workers) * 2;
      delta -= simInputs.rainfall > 20 ? (simInputs.rainfall - 20) * 0.2 : 0;
      delta -= (density - 0.5) * 8;
      const pred = Math.max(0, Math.min(100, s.score + delta + (Math.random() - 0.5) * 3));
      return { ...s, predictedScore: Math.round(pred), delta: Math.round(pred - s.score) };
    });
    setSimResult(result);
    
    // Generate 14-day forecast data showing rainfall -> runoff -> pollution load -> lake health
    const timelineData = [];
    let movingHealth = Math.round(result.reduce((sum, item) => sum + item.predictedScore, 0) / result.length);
    for (let day = 1; day <= 14; day++) {
      const dailyRainfall = parseFloat((simInputs.rainfall * (1.0 - (day - 1) * 0.05) + (Math.random() - 0.5) * 4).toFixed(1));
      const runoff = parseFloat((dailyRainfall * 0.18 + (Math.random() - 0.5) * 1.5).toFixed(1));
      const pollutionLoad = Math.max(0, Math.round(runoff * 2.2 + (simInputs.density === "high" ? 12 : 5) - (simInputs.plastic * 0.04)));
      const recovery = (simInputs.workers * 0.5) + (simInputs.plastic > 100 ? 2 : 0);
      
      const change = recovery - (pollutionLoad * 0.18);
      movingHealth = Math.max(0, Math.min(100, movingHealth + change + (Math.random() - 0.5) * 1.2));
      
      timelineData.push({
        day: `Day ${day}`,
        health: Math.round(movingHealth),
        runoff: Math.max(0, runoff),
        pollution: pollutionLoad
      });
    }
    setSimTimeline(timelineData);

    const mapping: Record<string, number> = {};
    result.forEach((item: any) => {
      mapping[item.id] = item.predictedScore;
    });
    setSimSectorsMap(mapping);
    setSectorHealth(result.map(r => ({
      id: r.id,
      name: r.name,
      score: r.predictedScore,
      trend: r.predictedScore > r.score ? "improving" : r.predictedScore < r.score ? "declining" : "stable",
      station: r.station
    })));
    setSimRunning(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)" }}>
      <SideNav role="admin" items={NAV_ITEMS} activeSection={section} onSectionChange={setSection} />

      <main style={{ paddingLeft: 248, paddingTop: 60 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 28px 60px" }}>

          {/* ═══ OPERATIONS DASHBOARD ═══ */}
          {section === "dashboard" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <SectionTitle title="Operations Command Room" sub="Real-time oversight: telemetry, AI alerts, and field crew coordination" />
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-surface)", border: "1px solid var(--border-dim)", borderRadius: 10, padding: "8px 14px", fontSize: 11, fontFamily: "var(--font-mono)", color: "#0EA5E9" }}>
                  <span className="status-dot status-dot-online status-dot-pulse" />
                  COMMAND SYNC · {time}
                </div>
              </div>

              {/* KPI Grid */}
              <div className="responsive-admin-kpi-grid" style={{ gap: 12 }}>
                {[
                  { label: "Overall Health", value: overallScore, unit: "/100", color: overallColor, sub: getHealthStatus(overallScore).label },
                  { label: "Active Tickets",  value: complaints.filter(c => c.status !== "resolved").length, color: "#EF4444", sub: "+2 from yesterday" },
                  { label: "Critical Zones",  value: activeSectorsData.filter(s => s.score < 60).length, color: "#EF4444", sub: "Below threshold" },
                  { label: "Fleet Active",    value: WORKERS.filter(w => w.status === "active").length, color: "#0EA5E9", sub: `${WORKERS.length} total deployed` },
                  { label: "Twin SCADA Sync", value: "99.3%", color: "#8B5CF6", sub: "30 FPS · Weather Connected" },
                ].map((m) => (
                  <div key={m.label} className="metric-card glass-panel">
                    <div className="metric-label">{m.label}</div>
                    <div className="metric-value" style={{ color: m.color }}>{m.value}{m.unit}</div>
                    <div className="metric-change">{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* 4-Panel Operations Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Panel 1: AI Surveillance Wall */}
                <div className="glass-panel" style={{ padding: 18, display: "flex", flexDirection: "column", height: 380 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <Video size={12} />
                    AI SURVEILLANCE WALL (SIMULATED CCTV FEEDS)
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, flex: 1, overflowY: "auto" }}>
                    {[
                      { id: 1, label: "CAM-01 · Lokut Dal Ghat", live: true },
                      { id: 2, label: "CAM-02 · Nishat Shore", live: true },
                      { id: 3, label: "CAM-03 · Lokut Dal Island", live: false },
                      { id: 4, label: "CAM-04 · Rainawari North", live: true },
                      { id: 5, label: "CAM-05 · Boulevard Houseboat", live: false },
                    ].map((cam) => (
                      <div key={cam.id} onClick={() => setSelectedCamera(cam)} style={{ position: "relative", cursor: "pointer", border: "1px solid var(--border-dim)", borderRadius: 6, overflow: "hidden", height: 85 }}>
                        <img src={`/cctv/cam-${cam.id}.png`} alt={cam.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <div style={{ position: "absolute", top: 4, left: 4, background: "rgba(0,0,0,0.6)", padding: "1px 4px", borderRadius: 3, fontSize: 7, fontFamily: "var(--font-mono)", color: cam.live ? "#10B981" : "#94A3B8" }}>
                          {cam.live ? "● LIVE" : "○ OFFLINE"}
                        </div>
                        <div style={{ position: "absolute", bottom: 4, left: 4, right: 4, background: "rgba(0,0,0,0.6)", padding: "2px 4px", borderRadius: 3, fontSize: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {cam.label.split(" · ")[1]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Panel 2: Ecosystem Alerts & Telemetry Feed */}
                <div className="glass-panel" style={{ padding: 18, display: "flex", flexDirection: "column", height: 380 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <ShieldAlert size={12} style={{ color: "#EF4444" }} />
                    REAL-TIME AI SURVEILLANCE ALERTS
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { sev: "HIGH", zone: "Hazratbal NW Shore", param: "Weed Density", change: "+12%", rec: "Deploy Harvester", eta: "6 min", time: "Just Now", bg: "rgba(239,68,68,0.15)", border: "#EF4444", text: "#EF4444" },
                      { sev: "MEDIUM", zone: "Lokut Dal Island", param: "Turbidity Surge", change: "+18%", rec: "Inspect Inflow Channel", eta: "12 min", time: "4m ago", bg: "rgba(245,158,11,0.12)", border: "#F59E0B", text: "#F59E0B" },
                      { sev: "HIGH", zone: "Rainawari North", param: "Sewage Inflow", change: "Detected", rec: "Deploy Skimmer 1", eta: "8 min", time: "12m ago", bg: "rgba(239,68,68,0.15)", border: "#EF4444", text: "#EF4444" },
                      { sev: "LOW", zone: "Boulevard Houseboat", param: "Plastic Waste", change: "Low Density", rec: "Schedule Clean", eta: "24 min", time: "25m ago", bg: "rgba(16,185,129,0.12)", border: "#10B981", text: "#10B981" },
                    ].map((alert, idx) => (
                      <div key={idx} style={{
                        background: alert.bg, border: `1px solid ${alert.border}`, borderRadius: 8, padding: 10,
                        display: "flex", justifyContent: "space-between", alignItems: "center"
                      }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 8, fontWeight: 800, padding: "2px 5px", borderRadius: 4, background: alert.border, color: "var(--bg-void)" }}>
                              {alert.sev}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: 11 }}>{alert.zone}</span>
                            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{alert.time}</span>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                            Anomaly: <strong style={{ color: "var(--text-primary)" }}>{alert.param} ({alert.change})</strong>
                          </div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                            💡 AI Recommendation: <strong style={{ color: "#10B981" }}>{alert.rec} (ETA: {alert.eta})</strong>
                          </div>
                        </div>
                        <button className="btn-primary" style={{ fontSize: 9, padding: "4px 8px", background: alert.border, borderColor: alert.border, color: "#000", fontWeight: 700 }}>
                          Action
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Panel 3: Citizen Photo Verification Queue */}
                <div className="glass-panel" style={{ padding: 18, display: "flex", flexDirection: "column", height: 360 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <ClipboardList size={12} />
                    CITIZEN PHOTO REPORT VERIFICATION
                  </div>
                  <div style={{ flex: 1, overflowY: "auto" }}>
                    <table className="table-base" style={{ fontSize: 10, width: "100%" }}>
                      <thead>
                        <tr>
                          <th>Ticket</th><th>Category</th><th>Verification Checks</th><th>Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {complaints.slice(0, 4).map((c) => (
                          <tr key={c.id} onClick={() => setSelectedComplaint(c)} style={{ cursor: "pointer" }}>
                            <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{c.id}</td>
                            <td style={{ fontWeight: 600 }}>{c.cat}</td>
                            <td style={{ fontSize: 8 }}>
                              <span style={{ color: "#10B981" }}>✓ GPS MATCH</span> · <span style={{ color: "#10B981" }}>✓ IN BASIN</span> · <span style={{ color: "#10B981" }}>✓ IMAGE AUTH</span>
                            </td>
                            <td style={{ fontFamily: "var(--font-mono)", color: "#10B981", fontWeight: 700 }}>{Math.round(c.confidence * 100)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Panel 4: AI Mission Planner & SCADA Decision Gate */}
                <div className="glass-panel" style={{ padding: 18, display: "flex", flexDirection: "column", height: 360 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <Zap size={12} />
                    AI MISSION PLANNER & DECISION GATE
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, fontSize: 11 }}>
                    <div style={{ background: "var(--bg-void)", padding: 10, borderRadius: 8, border: "1px solid var(--border-dim)" }}>
                      <div style={{ fontWeight: 700, color: "#8B5CF6", marginBottom: 4 }}>Recommended Action</div>
                      <div style={{ fontSize: 12, fontWeight: 800 }}>Deploy Vessel 2 (Algae Harvester)</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div style={{ background: "var(--bg-void)", padding: 8, borderRadius: 6, border: "1px solid var(--border-dim)" }}>
                        <div style={{ fontSize: 8, color: "var(--text-muted)" }}>DESTINATION</div>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>Hazratbal NW Shore</div>
                      </div>
                      <div style={{ background: "var(--bg-void)", padding: 8, borderRadius: 6, border: "1px solid var(--border-dim)" }}>
                        <div style={{ fontSize: 8, color: "var(--text-muted)" }}>TRANSIT ETA</div>
                        <div style={{ fontWeight: 700, color: "#0EA5E9" }}>6 Minutes</div>
                      </div>
                    </div>
                    <div style={{ background: "var(--bg-void)", padding: 10, borderRadius: 8, border: "1px solid var(--border-dim)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 8, color: "var(--text-muted)" }}>EXPECTED IMPROVEMENT</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#10B981" }}>+9% Ecosystem WQI</div>
                      </div>
                      <button className="btn-primary" style={{ fontSize: 9, padding: "5px 10px" }}>Confirm Dispatch</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ DIGITAL TWIN Command Center ═══ */}
          {section === "twin" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <SectionTitle title="Digital Twin Command Center & Simulation Room" sub="Immersive 3D/2D GIS mapping, real-time sensor array ingestion, and forecast modeling" />
              
              {/* Main twin view grid */}
              <div className="responsive-admin-split-grid" style={{ gap: 20 }}>
                {/* Map */}
                <div>
                  {/* Mode Selector */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", gap: 6, background: "var(--bg-void)", padding: 4, borderRadius: 8, border: "1px solid var(--border-dim)" }}>
                      <button
                        onClick={() => setTwinMode("2d")}
                        className={twinMode === "2d" ? "btn-primary" : "btn-secondary"}
                        style={{ fontSize: 11, padding: "6px 12px", border: "none" }}
                      >
                        🗺️ 2D Tactical View
                      </button>
                      <button
                        onClick={() => setTwinMode("3d")}
                        className={twinMode === "3d" ? "btn-primary" : "btn-secondary"}
                        style={{ fontSize: 11, padding: "6px 12px", border: "none" }}
                      >
                        🛰️ 3D Immersive Twin
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: "#10B981", fontFamily: "var(--font-mono)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      <span className="status-dot status-dot-online status-dot-pulse" />
                      LAKE STATE ENGINE: SYNC ACTIVE
                    </div>
                  </div>

                  <div className="glass-panel" style={{ overflow: "hidden", position: "relative" }}>
                    {twinMode === "3d" ? (
                      <DalLakeCesiumTwin simulatedSectors={currentSectorScores} timeSliderIndex={timeSlider} />
                    ) : (
                      <DalLakeMap
                        showHeatmap={false}
                        showAlgaeHeatmap={true}
                        showWeedHeatmap={true}
                        showComplaints={true}
                        showCameras={true}
                        showStations={true}
                        showSectors={true}
                        height="540px"
                        simulatedSectors={currentSectorScores}
                        onComplaintClick={{
                          onCameraSelect: (cam: any) => setSelectedCamera(cam)
                        } as any}
                      />
                    )}

                    {/* Camera overlay modal inside Map panel */}
                    {selectedCamera && (
                      <div style={{
                        position: "absolute", bottom: 20, right: 20, zIndex: 1000,
                        width: 280, background: "var(--bg-panel)", border: "1px solid var(--border-dim)",
                        borderRadius: 10, padding: 14, backdropFilter: "blur(20px)",
                        boxShadow: "0 0 20px rgba(14,165,233,0.15)"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: selectedCamera.live ? "#10B981" : "#64748B", display: "inline-block", animation: selectedCamera.live ? "dal-pulse 2s infinite" : undefined }} />
                            <strong style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#0EA5E9" }}>{selectedCamera.label.split(" · ")[0]} LIVE FEED</strong>
                          </div>
                          <button onClick={() => setSelectedCamera(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 12 }}>✕</button>
                        </div>
                        
                        {/* Image CCTV Viewport */}
                        <div style={{
                          height: 140, background: "#060A0F", border: "1px solid var(--border-dim)", borderRadius: 6,
                          position: "relative", overflow: "hidden"
                        }}>
                          <img
                            src={`/cctv/cam-${selectedCamera.label.match(/CAM-(\d+)/) ? parseInt(selectedCamera.label.match(/CAM-(\d+)/)![1]) : 1}.png`}
                            alt={selectedCamera.label}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                          {/* Live overlay tag */}
                          <div style={{ position: "absolute", top: 8, left: 8, fontSize: 8, fontFamily: "var(--font-mono)", color: "#10B981", background: "rgba(0,0,0,0.6)", padding: "2px 4px", borderRadius: 3 }}>
                            REC · {time}
                          </div>
                          <span style={{ fontSize: 10, color: "#fff", position: "absolute", bottom: 8, right: 8, fontFamily: "var(--font-mono)", background: "rgba(0,0,0,0.6)", padding: "2px 4px", borderRadius: 3 }}>
                            WQI: {liveSensors.turbidity > 60 ? "POOR" : "STABLE"}
                          </span>
                        </div>
                        
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5 }}>
                          <div>Loc: <span style={{ color: "var(--text-secondary)" }}>{selectedCamera.label.split(" · ")[1]}</span></div>
                          <div style={{ color: "#10B981", marginTop: 4 }}>✓ AI Analysis: Weed Canopy detected (12%), floating debris clear</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Time Controller Widget */}
                  <div className="glass-panel" style={{ marginTop: 14, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>TIME CONTROLLER</span>
                      <div style={{ display: "flex", gap: 4 }}>
                        {["Past 24h", "Current", "+7 Days", "+14 Days"].map((lbl, idx) => (
                          <button
                            key={lbl}
                            onClick={() => { setTimeSlider(idx); setIsPlayingSim(false); }}
                            className={timeSlider === idx ? "btn-primary" : "btn-secondary"}
                            style={{ fontSize: 10, padding: "5px 10px" }}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => setIsPlayingSim(!isPlayingSim)}
                        className="btn-secondary"
                        style={{ fontSize: 10, padding: "6px 12px", background: isPlayingSim ? "rgba(239,68,68,0.1)" : undefined, borderColor: isPlayingSim ? "#EF4444" : undefined }}
                      >
                        {isPlayingSim ? "⏸ Pause" : "▶ Play"}
                      </button>
                      <button
                        onClick={() => { setTimeSlider(1); setIsPlayingSim(false); }}
                        className="btn-secondary"
                        style={{ fontSize: 10, padding: "6px 12px" }}
                      >
                        🔄 Reset
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Water Quality Telemetry & Sensor History Chart */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Lake State Integration Panel */}
                  <div className="glass-panel" style={{ padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                        LAKE STATE ENGINE
                      </span>
                      <span style={{ fontSize: 10, color: "#10B981", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                        SYNC: 99.3%
                      </span>
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                      <div style={{ background: "var(--bg-void)", padding: 8, borderRadius: 6, border: "1px solid var(--border-dim)" }}>
                        <div style={{ fontSize: 8, color: "var(--text-muted)" }}>IoT SENSORS</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "#0EA5E9" }}>18 Array Nodes</div>
                      </div>
                      <div style={{ background: "var(--bg-void)", padding: 8, borderRadius: 6, border: "1px solid var(--border-dim)" }}>
                        <div style={{ fontSize: 8, color: "var(--text-muted)" }}>CCTV CAMERAS</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "#8B5CF6" }}>8 Streams</div>
                      </div>
                      <div style={{ background: "var(--bg-void)", padding: 8, borderRadius: 6, border: "1px solid var(--border-dim)" }}>
                        <div style={{ fontSize: 8, color: "var(--text-muted)" }}>REPORTS DETECTED</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "#10B981" }}>42 Verified</div>
                      </div>
                      <div style={{ background: "var(--bg-void)", padding: 8, borderRadius: 6, border: "1px solid var(--border-dim)" }}>
                        <div style={{ fontSize: 8, color: "var(--text-muted)" }}>WEATHER FEED</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "#EF4444" }}>Rain Runoff Active</div>
                      </div>
                    </div>

                    <div style={{ borderTop: "1px solid var(--border-dim)", paddingTop: 10 }}>
                      <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: 6 }}>
                        TWIN SYSTEM PERFORMANCE
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, padding: "2px 0" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Cesium Render Tick</span>
                        <span style={{ fontFamily: "var(--font-mono)", color: "#10B981" }}>60 FPS / 16ms</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, padding: "2px 0" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Telemetry Latency</span>
                        <span style={{ fontFamily: "var(--font-mono)", color: "#10B981" }}>42ms</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, padding: "2px 0" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Prediction Process Time</span>
                        <span style={{ fontFamily: "var(--font-mono)", color: "#0EA5E9" }}>180ms</span>
                      </div>
                    </div>
                  </div>

                  {/* Digital Live Telemetry values */}
                  <div className="glass-panel" style={{ padding: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 12 }}>
                      LIVE SENSOR ARRAY (REALTIME)
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {[
                        { name: "Turbidity", val: `${(liveSensors.turbidity * (timeSlider === 0 ? 0.9 : timeSlider === 2 ? 1.3 : timeSlider === 3 ? 1.6 : 1.0)).toFixed(1)} NTU`, color: liveSensors.turbidity > 65 ? "#EF4444" : "#10B981" },
                        { name: "Dissolved O₂", val: `${(liveSensors.do * (timeSlider === 0 ? 1.05 : timeSlider === 2 ? 0.85 : timeSlider === 3 ? 0.72 : 1.0)).toFixed(2)} mg/L`, color: liveSensors.do < 5.0 ? "#F59E0B" : "#10B981" },
                        { name: "pH Level", val: liveSensors.ph.toFixed(2), color: "#10B981" },
                        { name: "Water Temp", val: `${liveSensors.temp}°C`, color: "#0EA5E9" },
                      ].map((s) => (
                        <div key={s.name} style={{ background: "var(--bg-void)", padding: 12, borderRadius: 8, border: "1px solid var(--border-dim)" }}>
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{s.name}</span>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 800, color: s.color, marginTop: 2 }}>
                            {s.val}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ LAKE HEALTH SCORE ═══ */}
          {section === "health" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <SectionTitle title="Lake Health Intelligence" sub="XGBoost-powered sector health scores with SHAP explainability" />

              {/* Overall score hero */}
              <div className="glass-panel" style={{ padding: 28, display: "flex", alignItems: "center", gap: 32, borderTop: `3px solid ${overallColor}` }}>
                <div style={{ textAlign: "center", minWidth: 120 }}>
                  <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: 4, letterSpacing: "0.06em" }}>OVERALL SCORE</div>
                  <div style={{ fontSize: 64, fontWeight: 800, fontFamily: "var(--font-mono)", color: overallColor, lineHeight: 1 }}>{overallScore}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: overallColor, marginTop: 4 }}>{getHealthStatus(overallScore).label}</div>
                </div>
                <div style={{ width: 1, height: 80, background: "var(--border-dim)" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
                    HEALTH DRIVERS (XGBoost SHAP Values)
                  </div>
                  {[
                    { factor: "Complaint density: 2.8/km² (Central Dal)", impact: -14, direction: "negative" },
                    { factor: "Algae detections: 7 events (West Shore)",   impact: -11, direction: "negative" },
                    { factor: "Turbidity: 68 NTU (above 25 limit)",        impact: -9,  direction: "negative" },
                    { factor: "Tourist density: High (weekend peak)",       impact: -6,  direction: "negative" },
                    { factor: "Cleanup ops this week: 12",                  impact: +8,  direction: "positive" },
                  ].map((d) => (
                    <div key={d.factor} className="driver-row">
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: d.direction === "negative" ? "#EF4444" : "#10B981", flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 12, color: "var(--text-secondary)" }}>{d.factor}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: d.direction === "negative" ? "#EF4444" : "#10B981", minWidth: 48, textAlign: "right" }}>
                        {d.impact > 0 ? "+" : ""}{d.impact} pts
                      </div>
                      <div className="driver-bar-container" style={{ width: 60 }}>
                        <div
                          className={d.direction === "negative" ? "driver-bar-negative" : "driver-bar-positive"}
                          style={{ width: `${Math.abs(d.impact) / 20 * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Per-sector grid */}
              <div className="responsive-admin-kpi-grid" style={{ gap: 12 }}>
                {sectorHealth.map((s) => {
                  const color = getHealthColor(s.score);
                  return (
                    <div key={s.id} className="glass-panel" style={{ padding: 18, borderTop: `2px solid ${color}` }}>
                      <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: 8 }}>{s.name.toUpperCase()}</div>
                      <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "var(--font-mono)", color, lineHeight: 1 }}>{s.score}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
                        <TrendIcon trend={s.trend} />
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{s.trend}</span>
                      </div>
                      <div className="progress-track" style={{ marginTop: 10 }}>
                        <div className="progress-fill" style={{ width: `${s.score}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Satellite Intelligence */}
              <div className="glass-panel" style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <div className="ai-badge">🛰️ Sentinel-2 · ESA Copernicus</div>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Image Date: Jul 8 2026</span>
                </div>
                <div className="responsive-admin-kpi-grid" style={{ gap: 12 }}>
                  {[
                    { sector: "North-West", ndwi: 0.42, ndvi: 0.28, algae: "35%", note: "Moderate vegetation" },
                    { sector: "West Shore",  ndwi: 0.38, ndvi: 0.41, algae: "71%", note: "High algae bloom" },
                    { sector: "East Entry",  ndwi: 0.55, ndvi: 0.15, algae: "18%", note: "Clear water" },
                    { sector: "NE Canal",    ndwi: 0.44, ndvi: 0.33, algae: "48%", note: "Moderate hyacinth" },
                    { sector: "Central Dal", ndwi: 0.31, ndvi: 0.58, algae: "82%", note: "Critical bloom" },
                  ].map((sat) => (
                    <div key={sat.sector} style={{ background: "var(--bg-void)", borderRadius: 10, padding: 14, border: "1px solid var(--border-dim)" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>{sat.sector}</div>
                      {[
                        { label: "NDWI", val: sat.ndwi.toFixed(2) },
                        { label: "NDVI", val: sat.ndvi.toFixed(2) },
                        { label: "Algae", val: sat.algae },
                      ].map((m) => (
                        <div key={m.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "2px 0" }}>
                          <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{m.label}</span>
                          <span style={{ color: "var(--text-primary)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>{m.val}</span>
                        </div>
                      ))}
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6 }}>{sat.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ RISK FORECAST ═══ */}
          {section === "forecast" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <SectionTitle title="7-Day Environmental Risk Forecast" sub="LightGBM model with real rainfall from Open-Meteo API — proactive dispatch recommendations" />

              {/* 7-day calendar */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
                {RISK_FORECAST.map((d) => {
                  const color = { low: "#10B981", medium: "#F59E0B", high: "#EF4444", critical: "#7F1D1D" }[d.risk] ?? "#94A3B8";
                  const isSelected = selectedDay === d.day;
                  return (
                    <div
                      key={d.day}
                      onClick={() => setSelectedDay(d.day)}
                      className="forecast-day"
                      style={{
                        borderColor: isSelected ? "#0EA5E9" : `${color}33`,
                        background: isSelected ? "rgba(14,165,233,0.08)" : "var(--bg-surface)",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4 }}>{d.day}</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 10, fontFamily: "var(--font-mono)" }}>{d.date}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "var(--font-mono)", lineHeight: 1 }}>{d.risk === "critical" ? "⚠" : d.rain}</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>{d.rain}mm rain</div>
                      <div style={{ marginTop: 8 }}>
                        <span className="badge" style={{ fontSize: "0.55rem", background: `${color}15`, color, borderColor: `${color}33` }}>
                          {d.risk}
                        </span>
                      </div>
                      {d.alerts > 0 && (
                        <div style={{ marginTop: 4, fontSize: 9, color: "#EF4444", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                          {d.alerts} alert{d.alerts > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Selected day details */}
              {(() => {
                const day = RISK_FORECAST.find((d) => d.day === selectedDay);
                if (!day) return null;
                const alerts = day.alerts > 0 ? [
                  { type: "Plastic Accumulation", sector: "North-West Dal", action: "Pre-position cleanup at Nehru Park shore", station: "STA-A" },
                  { type: "Algae Bloom Imminent", sector: "West Shore",     action: "Deploy aeration units, alert fisheries",   station: "STA-B" },
                  { type: "Sewage Overflow Risk", sector: "Central Dal",    action: "Inspect drain outflows, alert SMHS",        station: "STA-E" },
                ].slice(0, day.alerts) : [];
                return (
                  <div className="glass-panel" style={{ padding: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                      {day.day} · {day.date} — Predicted Risk Events
                      <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Rainfall: {day.rain}mm</span>
                    </div>
                    {alerts.length === 0 ? (
                      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No significant risk events predicted for this day.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {alerts.map((a) => (
                          <div key={a.type} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 14, background: "var(--bg-void)", borderRadius: 10, border: "1px solid rgba(239,68,68,0.15)" }}>
                            <AlertTriangle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{a.type}</div>
                              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Sector: {a.sector}</div>
                              <div style={{ fontSize: 11, color: "#0EA5E9", marginTop: 4 }}>Recommended: {a.action}</div>
                            </div>
                            <button className="btn-primary" style={{ fontSize: 11, padding: "6px 12px" }}>
                              Dispatch {a.station}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ═══ SIMULATION LAB ═══ */}
          {section === "simulate" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <SectionTitle title="Simulation Laboratory" sub={'What-if scenario modeling — "What if we remove 200kg plastic?" or "What if 80mm rain tomorrow?"'} />

              <div className="responsive-admin-sim-grid" style={{ gap: 20 }}>
                {/* Controls */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Presets */}
                  <div className="glass-panel" style={{ padding: 16 }}>
                    <div className="section-label" style={{ marginBottom: 10 }}>Quick Scenarios</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {SIMULATION_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          className="btn-secondary"
                          style={{ justifyContent: "flex-start", fontSize: 12, padding: "8px 12px", textAlign: "left", gap: 10 }}
                          onClick={() => setSimInputs({ rainfall: p.rainfall, plastic: p.plastic, workers: p.workers, density: p.density })}
                        >
                          <ChevronRight size={12} />
                          <div>
                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{p.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom sliders */}
                  <div className="glass-panel" style={{ padding: 18 }}>
                    <div className="section-label" style={{ marginBottom: 14 }}>Custom Variables</div>
                    {[
                      { key: "rainfall", label: "Rainfall (mm)", min: 0, max: 100, color: "#0EA5E9" },
                      { key: "plastic",  label: "Plastic Removed (kg)", min: 0, max: 500, color: "#10B981" },
                      { key: "workers",  label: "Workers Deployed", min: 1, max: 15, color: "#8B5CF6" },
                    ].map((s) => (
                      <div key={s.key} style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                          <span style={{ color: "var(--text-secondary)" }}>{s.label}</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: s.color }}>
                            {simInputs[s.key as keyof typeof simInputs]}
                          </span>
                        </div>
                        <input
                          type="range" min={s.min} max={s.max}
                          value={simInputs[s.key as keyof typeof simInputs] as number}
                          onChange={(e) => setSimInputs((prev) => ({ ...prev, [s.key]: parseInt(e.target.value) }))}
                          style={{ width: "100%", accentColor: s.color }}
                        />
                      </div>
                    ))}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Tourist Density</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {["low", "medium", "high"].map((d) => (
                          <button
                            key={d}
                            onClick={() => setSimInputs((prev) => ({ ...prev, density: d }))}
                            className={simInputs.density === d ? "btn-primary" : "btn-secondary"}
                            style={{ flex: 1, fontSize: 11, padding: "6px 8px", textTransform: "capitalize" }}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      className="btn-primary"
                      style={{ width: "100%", gap: 8 }}
                      onClick={runSimulation}
                      disabled={simRunning}
                    >
                      {simRunning ? (
                        <><span className="animate-spin" style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} /> Running...</>
                      ) : (
                        <><FlaskConical size={14} /> Run Simulation</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Results */}
                <div className="glass-panel" style={{ padding: 20 }}>
                  {!simResult ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 400, gap: 12, color: "var(--text-muted)" }}>
                      <FlaskConical size={40} color="var(--text-muted)" />
                      <div style={{ fontSize: 14 }}>Configure variables and run a simulation</div>
                      <div style={{ fontSize: 11 }}>Adjust sliders or pick a preset scenario</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>72-Hour Prediction & Live Digital Twin Impact</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16 }}>
                        Rain: {simInputs.rainfall}mm · Plastic removed: {simInputs.plastic}kg · Workers: {simInputs.workers} · Tourism: {simInputs.density}
                      </div>

                      {/* 14-Day Projection Chart (Full Width) */}
                      <div className="glass-panel" style={{ padding: 18, display: "flex", flexDirection: "column", height: 280, marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 12 }}>
                          14-DAY SIMULATION FORECAST PROJECTION
                        </div>
                        {simTimeline && (
                          <div style={{ flex: 1, minHeight: 200 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={simTimeline} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                <defs>
                                  <linearGradient id="simHealthGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                  </linearGradient>
                                  <linearGradient id="simRunoffGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid stroke="rgba(255,255,255,0.03)" />
                                <XAxis dataKey="day" stroke="#475569" tick={{ fill: "#475569", fontSize: 8 }} />
                                <YAxis yAxisId="left" stroke="#475569" tick={{ fill: "#475569", fontSize: 8 }} domain={[0, 100]} />
                                <YAxis yAxisId="right" orientation="right" stroke="#475569" tick={{ fill: "#475569", fontSize: 8 }} />
                                <Tooltip contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border-soft)", color: "var(--text-primary)", fontSize: 10 }} />
                                <Area yAxisId="left" type="monotone" dataKey="health" stroke="#10B981" fill="url(#simHealthGrad)" strokeWidth={1.5} name="Lake Health" />
                                <Area yAxisId="right" type="monotone" dataKey="runoff" stroke="#0EA5E9" fill="url(#simRunoffGrad)" strokeWidth={1.0} name="Runoff m³/s" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {simResult.map((r: any) => {
                          const curColor  = getHealthColor(r.score);
                          const predColor = getHealthColor(r.predictedScore);
                          return (
                            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, background: "var(--bg-void)", borderRadius: 8, border: "1px solid var(--border-dim)" }}>
                              <div style={{ minWidth: 120, fontSize: 11, color: "var(--text-secondary)" }}>{r.name}</div>
                              <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: curColor }}>{r.score}</div>
                              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>→</div>
                              <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: predColor }}>{r.predictedScore}</div>
                              <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 700, color: r.delta >= 0 ? "#10B981" : "#EF4444" }}>
                                {r.delta >= 0 ? "+" : ""}{r.delta} pts
                              </span>
                              <div style={{ flex: 1 }}>
                                <SeverityBadge sev={getHealthStatus(r.predictedScore).label.toLowerCase()} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ marginTop: 16, padding: 12, background: "rgba(14,165,233,0.03)", borderRadius: 10, border: "1px solid rgba(14,165,233,0.12)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div>
                          <div style={{ fontSize: 11, color: "#0EA5E9", fontWeight: 600, marginBottom: 6 }}>Weather & Runoff Impact Pipeline</div>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                            🌧️ rainfall: <strong style={{ color: "#0EA5E9" }}>{simInputs.rainfall} mm</strong><br/>
                            🌊 runoff volume: <strong style={{ color: "#0EA5E9" }}>{(simInputs.rainfall * 0.18).toFixed(1)} m³/s</strong><br/>
                            ⚠️ pollution load: <strong style={{ color: "#EF4444" }}>+{(simInputs.rainfall * 0.18 * 2.2).toFixed(0)} kg</strong> raw inflow<br/>
                            🏥 recommendation: {simInputs.rainfall > 40 ? "Deploy shoreline filtration barriers immediately." : "Standard water retention limits."}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: "#8B5CF6", fontWeight: 600, marginBottom: 6 }}>Resource & Crew Allocation Optimization</div>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                            👷 active crew: <strong style={{ color: "#8B5CF6" }}>{simInputs.workers} staff members</strong><br/>
                            ⛵ cleaning mission: <strong style={{ color: "#8B5CF6" }}>{simInputs.plastic > 0 ? "Plastic Skimming Mode" : "Debris Patrol Mode"}</strong><br/>
                            🎯 optimal dispatch: {simInputs.workers < 4 ? "🚨 Dispatch Station Lokut Dal reinforcements." : "Rules satisfy watershed health limits."}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ INFLOW TICKETS ═══ */}
          {section === "tickets" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <SectionTitle title="Inflow Operation Tickets" sub="AI auto-scored complaints with SHAP priority explanations" />
              <div className="glass-panel" style={{ overflow: "hidden" }}>
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Ticket</th><th>Category</th><th>Area</th>
                      <th>Citizen Sev.</th><th>AI Severity</th><th>Status</th>
                      <th>AI Confidence</th><th>Explanation</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((c) => (
                      <tr key={c.id} className={`priority-${c.aiSeverity}`}>
                        <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: 12 }}>{c.id}</td>
                        <td style={{ fontWeight: 600, fontSize: 13 }}>{c.cat}</td>
                        <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{c.area}</td>
                        <td><SeverityBadge sev={c.severity} /></td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <SeverityBadge sev={c.aiSeverity} />
                            {c.aiSeverity !== c.severity && <Bot size={10} color="#8B5CF6" aria-label="AI upgraded severity" />}
                          </div>
                        </td>
                        <td><StatusBadge s={c.status} /></td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#10B981" }}>
                          <div style={{ fontWeight: 700 }}>{Math.round(c.confidence * 100)}% Conf</div>
                          <div style={{ fontSize: 8, color: c.confidence > 0.88 ? "#10B981" : "#F59E0B" }}>
                            {c.confidence > 0.88 ? "✓ GPS Match" : "⚠ GPS Offset"}
                          </div>
                          <div style={{ fontSize: 8, color: "#10B981" }}>✓ Inside Basin</div>
                          <div style={{ fontSize: 8, color: c.confidence > 0.82 ? "#10B981" : "#F59E0B" }}>
                            {c.confidence > 0.82 ? "✓ Image Auth" : "⚠ Low Quality"}
                          </div>
                        </td>
                        <td style={{ fontSize: 10, color: "var(--text-muted)", maxWidth: 200 }}>{c.explanation}</td>
                        <td>
                          <button className="btn-primary" style={{ fontSize: 11, padding: "5px 10px" }}>Assign</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ STATION NETWORK ═══ */}
          {section === "stations" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <SectionTitle title="Station Network" sub="5 LCMA command stations with live sector health and pending workload" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {STATION_DATA.map((sta) => {
                  const sectorHealth = SECTOR_HEALTH.find((s) => s.station === sta.id);
                  const score = sectorHealth?.score ?? 65;
                  const color = getHealthColor(score);
                  const pending = complaints.filter((c) => c.status === "pending").length;
                  return (
                    <div key={sta.id} className="glass-panel" style={{ padding: 22, borderTop: `3px solid ${sta.color}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                        <div>
                          <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: sta.color, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>{sta.id}</div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{sta.name}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{sta.sector}</div>
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{score}</div>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>
                        Cmdr: <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{sta.commander}</span>
                      </div>
                      <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 11 }}>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <Users size={11} color="var(--text-muted)" />
                          <span style={{ color: "var(--text-secondary)" }}>{sta.workers} workers</span>
                        </div>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <ClipboardList size={11} color="var(--text-muted)" />
                          <span style={{ color: "var(--text-secondary)" }}>{pending} pending</span>
                        </div>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${score}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ FLEET MONITOR ═══ */}
          {section === "fleet" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <SectionTitle title="Fleet Monitoring Centre" sub="Real-time field crew status, A* route optimization, and performance tracking" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
                {workers.map((w) => (
                  <div key={w.id} className={`glass-panel ${w.suspended ? "glass-panel-danger" : ""}`} style={{ padding: 20, display: "flex", gap: 14, alignItems: "flex-start", opacity: w.suspended ? 0.6 : 1 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Users size={18} color="#0EA5E9" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{w.name}</span>
                        <span className={`badge ${w.status === "active" ? "badge-healthy" : w.status === "idle" ? "badge-warning" : "badge-muted"}`}>{w.status}</span>
                        {w.suspended && <span className="badge badge-critical">SUSPENDED</span>}
                        {w.flags > 0 && <span className="badge badge-warning">{w.flags} flag{w.flags > 1 ? "s" : ""}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{w.role} · {w.station}</div>
                      <div style={{ display: "flex", gap: 16, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginTop: 6 }}>
                        <span>Tasks: {w.tasks}</span>
                        <span>Score: <span style={{ color: w.score >= 80 ? "#10B981" : w.score >= 60 ? "#F59E0B" : "#EF4444", fontWeight: 700 }}>{w.score}%</span></span>
                        <span>GPS: {w.lat.toFixed(3)}°, {w.lon.toFixed(3)}°</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <button className="btn-primary" style={{ fontSize: 11, padding: "5px 10px" }}>Dispatch</button>
                      {!w.suspended && (
                        <>
                          <button className="btn-secondary" onClick={() => flagWorker(w.id)} style={{ fontSize: 11, padding: "5px 10px", display: "flex", alignItems: "center", gap: 4 }}>
                            <Flag size={11} /> Flag
                          </button>
                          {w.flags >= 2 && (
                            <button className="btn-danger" onClick={() => suspendWorker(w.id)} style={{ fontSize: 11, padding: "5px 10px", display: "flex", alignItems: "center", gap: 4 }}>
                              <Ban size={11} /> Suspend
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ ACCOUNTABILITY ═══ */}
          {section === "accountability" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <SectionTitle title="Accountability Centre" sub="Worker performance tracking, culprit identification, and enforcement actions" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Flagged workers */}
                <div className="glass-panel glass-panel-danger" style={{ padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <Flag size={15} color="#EF4444" />
                    <span style={{ fontWeight: 700, fontSize: 14 }}>Flagged Workers</span>
                  </div>
                  {workers.filter((w) => w.flags > 0).map((w) => (
                    <div key={w.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border-dim)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{w.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{w.role} · {w.station}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span className="badge badge-critical">{w.flags} flag{w.flags > 1 ? "s" : ""}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#EF4444" }}>{w.score}%</span>
                        {w.flags >= 2 && !w.suspended && (
                          <button className="btn-danger" onClick={() => suspendWorker(w.id)} style={{ fontSize: 11, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }}>
                            <Ban size={11} /> Suspend
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {workers.filter((w) => w.flags > 0).length === 0 && (
                    <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>No flagged workers</div>
                  )}
                </div>

                {/* Culprit entry */}
                <div className="glass-panel" style={{ padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <Gavel size={15} color="#F59E0B" />
                    <span style={{ fontWeight: 700, fontSize: 14 }}>Log Culprit Identification</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label className="form-label">Linked Complaint ID</label>
                      <input className="form-input" placeholder="DLG-1034" />
                    </div>
                    <div>
                      <label className="form-label">Culprit Name / Entity</label>
                      <input className="form-input" placeholder="Houseboat owner / Person name" />
                    </div>
                    <div>
                      <label className="form-label">Reference (Houseboat ID / Property)</label>
                      <input className="form-input" placeholder="HB-0034 / Land Ref No." />
                    </div>
                    <div>
                      <label className="form-label">Evidence Notes</label>
                      <textarea className="form-textarea" rows={3} placeholder="Describe evidence found at scene..." />
                    </div>
                    <button className="btn-primary" style={{ gap: 8 }}>
                      <Gavel size={14} /> Open Investigation
                    </button>
                  </div>
                </div>
              </div>

              {/* Active investigations */}
              <div className="glass-panel" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Active Investigations</div>
                {[
                  { id: "INV-001", culprit: "Houseboat HB-0091", complaint: "DLG-1020", type: "Sewage Discharge", status: "under_investigation", opened: "3 days ago" },
                  { id: "INV-002", culprit: "Construction: Sector-A Plot 12", complaint: "DLG-0991", type: "Encroachment", status: "charged", opened: "8 days ago" },
                ].map((inv) => (
                  <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid var(--border-dim)" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <Gavel size={14} color="#F59E0B" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{inv.culprit}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{inv.complaint} · {inv.type} · Opened {inv.opened}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className={`badge ${inv.status === "charged" ? "badge-critical" : "badge-warning"}`}>{inv.status.replace("_", " ")}</span>
                      <button className="btn-secondary" style={{ fontSize: 11, padding: "4px 10px" }}>View</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ ANALYTICS ═══ */}
          {section === "analytics" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <SectionTitle title="Analytics & Impact" sub="Environmental outcomes, cleanup effectiveness, and sector trend analysis" />

              {/* Impact metrics */}
              <div className="responsive-admin-fleet-grid" style={{ gap: 12 }}>
                {[
                  { label: "Total Cleanups", value: "127",    sub: "This month", color: "#10B981" },
                  { label: "Waste Removed",  value: "3.1 T",  sub: "Estimated total", color: "#0EA5E9" },
                  { label: "Avg Resolution", value: "18 min", sub: "By field crew", color: "#8B5CF6" },
                  { label: "Health Delta",   value: "+14.2",  sub: "Avg improvement", color: "#10B981" },
                ].map((m) => (
                  <div key={m.label} className="metric-card glass-panel">
                    <div className="metric-label">{m.label}</div>
                    <div className="metric-value" style={{ color: m.color }}>{m.value}</div>
                    <div className="metric-change">{m.sub}</div>
                  </div>
                ))}
              </div>

              <div className="glass-panel" style={{ padding: 20 }}>
                <div className="section-label" style={{ marginBottom: 12 }}>30-Day Reports vs Resolved</div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={DAILY_TRENDS}>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="day" stroke="#475569" tick={{ fill: "#475569", fontSize: 10 }} />
                    <YAxis stroke="#475569" tick={{ fill: "#475569", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border-soft)", color: "var(--text-primary)" }} />
                    <Bar dataKey="reports"  fill="#EF444440" stroke="#EF4444" strokeWidth={1} name="Reported" radius={[3,3,0,0]} />
                    <Bar dataKey="resolved" fill="#10B98140" stroke="#10B981" strokeWidth={1} name="Resolved" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>

        {/* Floating Surveillance & Report Detail Overlays */}
        {selectedCamera && (
          <div style={{
            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
            background: "rgba(6, 10, 15, 0.8)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
          }}>
            <div className="glass-panel animate-scale-in" style={{
              width: 640, padding: 20, border: "1px solid #0EA5E9",
              boxShadow: "0 0 40px rgba(14, 165, 233, 0.4)", borderRadius: 12
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="status-dot status-dot-online status-dot-pulse" style={{ background: selectedCamera.live ? "#10B981" : "#64748B" }} />
                  <strong style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "#0EA5E9" }}>
                    {selectedCamera.label.split(" · ")[0]} – SIMULATED SURVEILLANCE FEED
                  </strong>
                </div>
                <button onClick={() => setSelectedCamera(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
              
              {/* Main Video Viewport */}
              <div style={{
                height: 360, background: "#060A0F", border: "1px solid var(--border-dim)", borderRadius: 8,
                position: "relative", overflow: "hidden", boxShadow: "inset 0 0 20px rgba(0,0,0,0.8)"
              }}>
                <img
                  src={`/cctv/cam-${selectedCamera.id || (selectedCamera.label.match(/CAM-(\d+)/) ? parseInt(selectedCamera.label.match(/CAM-(\d+)/)![1]) : 1)}.png`}
                  alt={selectedCamera.label}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{ position: "absolute", top: 12, left: 12, fontSize: 10, fontFamily: "var(--font-mono)", color: "#10B981", background: "rgba(0,0,0,0.6)", padding: "4px 8px", borderRadius: 4 }}>
                  REC · {time}
                </div>
                <div style={{ position: "absolute", bottom: 12, right: 12, fontSize: 11, color: "#fff", fontFamily: "var(--font-mono)", background: "rgba(0,0,0,0.6)", padding: "4px 8px", borderRadius: 4 }}>
                  LOCATION: {selectedCamera.label.split(" · ")[1] || "Ghat Station"}
                </div>
              </div>

              <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Status: <span style={{ color: selectedCamera.live ? "#10B981" : "#F59E0B" }}>{selectedCamera.live ? "Feed Connected" : "Stream Suspended / Offline"}</span>
                </div>
                <div style={{ color: "#10B981", fontSize: 11, fontWeight: 700 }}>
                  ✓ AI Analysis: Weed Canopy detected (12%), floating debris clear
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedComplaint && (
          <div style={{
            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
            background: "rgba(6, 10, 15, 0.8)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
          }}>
            <div className="glass-panel animate-scale-in" style={{
              width: 500, padding: 20, border: "1px solid #EF4444",
              boxShadow: "0 0 40px rgba(239, 68, 68, 0.3)", borderRadius: 12
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="status-dot status-dot-online" style={{ background: "#EF4444" }} />
                  <strong style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "#EF4444" }}>
                    REPORT {selectedComplaint.id} – VERIFIED CITIZEN UPLOAD
                  </strong>
                </div>
                <button onClick={() => setSelectedComplaint(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
              
              {/* Attached Photo Viewport */}
              <div style={{
                height: 280, background: "#060A0F", border: "1px solid var(--border-dim)", borderRadius: 8,
                position: "relative", overflow: "hidden", marginBottom: 14
              }}>
                <img
                  src={["DLG-1034", "DLG-1033", "DLG-1032", "DLG-1031"].includes(selectedComplaint.id) ? `/cctv/citizen-${selectedComplaint.id}.png` : `/cctv/citizen-default.png`}
                  alt={selectedComplaint.cat}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{ position: "absolute", top: 12, left: 12, fontSize: 10, fontFamily: "var(--font-mono)", color: "#EF4444", background: "rgba(0,0,0,0.6)", padding: "4px 8px", borderRadius: 4 }}>
                  TYPE: {selectedComplaint.cat.toUpperCase()}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>Location:</strong>{" "}
                  <span style={{ color: "var(--text-secondary)" }}>{selectedComplaint.area}</span>
                </div>
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>Citizen Caption:</strong>
                  <p style={{ color: "var(--text-secondary)", margin: "4px 0 0 0", lineHeight: 1.4, background: "rgba(255,255,255,0.03)", padding: 8, borderRadius: 6, border: "1px solid var(--border-dim)" }}>
                    {selectedComplaint.id === "DLG-1034" ? "Severe algal bloom and weed canopy observed near Hazratbal NW shore. Needs urgent harvesting." :
                     selectedComplaint.id === "DLG-1033" ? "Oil slick from tourist houseboats spreading near Boulevard shore. Iridescent sheen visible." :
                     selectedComplaint.id === "DLG-1032" ? "Active raw sewage discharge and plastic bag accumulation near Rainawari residential canals." :
                     selectedComplaint.id === "DLG-1031" ? "Weed canopy and floating debris blocking shikara channels near Lokut Dal tourist spots." :
                     selectedComplaint.explanation || "Debris and pollution reported by citizen near the shoreline."}
                  </p>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Submitted: {selectedComplaint.time}
                  </span>
                  <span style={{ fontSize: 11, color: "#10B981", fontWeight: 700 }}>
                    ✓ AI Confidence: {Math.round(selectedComplaint.confidence * 100)}% Verified
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
