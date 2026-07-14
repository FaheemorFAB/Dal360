"use client";

import { useState } from "react";
import SideNav from "@/components/SideNav";
import {
  ClipboardList, BarChart3, CheckCircle, Clock,
  AlertTriangle, Navigation, Camera, Flag, Zap,
  TrendingUp, Package, Timer,
} from "lucide-react";
import { getHealthColor, getHealthStatus } from "@/lib/constants";

const NAV_ITEMS = [
  { id: "tasks",     label: "My Tasks",         Icon: ClipboardList },
  { id: "performance",label: "My Performance",  Icon: BarChart3 },
];

const SEVERITY_ORDER: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

const MY_TASKS = [
  { id: "DLG-1033", cat: "Oil Spill",       area: "Hazratbal", priority: "critical", eta: "8 min",  status: "assigned",    route: "Hazratbal Station → North Channel", ai_explanation: "Oil Spill near Hazratbal Basin. Crucial ecological impact.", lat: 34.1280, lon: 74.8420 },
  { id: "DLG-1032", cat: "Sewage Discharge",area: "Gagribal",  priority: "high",    eta: "12 min", status: "in_progress", route: "Central Coordination → Southern Canal",  ai_explanation: "Sewage spill in Gagribal Basin near houseboats.", lat: 34.0790, lon: 74.8520 },
  { id: "DLG-1029", cat: "Plastic Waste",   area: "Nishat",    priority: "medium",  eta: "18 min", status: "resolved",    route: "Direct Patrol Vessel Route",                                ai_explanation: "Plastic collection completed in Nishat Basin.", lat: 34.1150, lon: 74.8720 },
];

function PriorityBadge({ p }: { p: string }) {
  const cls = { critical: "badge-critical", high: "badge-warning", medium: "badge-info", low: "badge-healthy" }[p] ?? "badge-muted";
  return <span className={`badge ${cls}`}>{p}</span>;
}

export default function WorkerPortal() {
  const [section, setSection] = useState("tasks");
  const [tasks, setTasks] = useState(MY_TASKS);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>("DLG-1033");

  const completeTask = (id: string) => {
    setCompletingId(id);
    setTimeout(() => {
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: "resolved" } : t));
      setCompletingId(null);
    }, 800);
  };

  // Classified Sector Assignment
  const assignedSector = "Hazratbal (NW Shore)";
  const assignedStation = "Hazratbal Station (STA-HAZ)";

  // Sort tasks by severity (Critical > High > Medium > Low)
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status === "resolved" && b.status !== "resolved") return 1;
    if (a.status !== "resolved" && b.status === "resolved") return -1;
    return (SEVERITY_ORDER[b.priority] ?? 0) - (SEVERITY_ORDER[a.priority] ?? 0);
  });

  const performanceScore = 91;
  const perfColor = getHealthColor(performanceScore);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)" }}>
      <SideNav role="worker" items={NAV_ITEMS} activeSection={section} onSectionChange={setSection} />
      <main className="portal-main">
        <div className="portal-content">

          {/* TASKS */}
          {section === "tasks" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>My Assignments</h1>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    AI-dispatched tasks ordered by severity · Geographically classified
                  </p>
                </div>
                <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)", borderRadius: 10, padding: "8px 14px", fontSize: 11 }}>
                  <span style={{ color: "var(--text-muted)" }}>Assigned Sector: </span>
                  <strong style={{ color: "#0EA5E9" }}>{assignedSector}</strong>
                </div>
              </div>

              <div className="responsive-grid-3" style={{ gap: 12 }}>
                {[
                  { label: "Active Tasks", value: tasks.filter(t => t.status !== "resolved").length, color: "#0EA5E9", Icon: ClipboardList },
                  { label: "Completed",    value: tasks.filter(t => t.status === "resolved").length,  color: "#10B981", Icon: CheckCircle },
                  { label: "Performance",  value: `${performanceScore}%`,                             color: perfColor,  Icon: TrendingUp },
                ].map((m) => (
                  <div key={m.label} className="glass-panel metric-card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${m.color}14`, border: `1px solid ${m.color}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <m.Icon size={18} color={m.color} />
                    </div>
                    <div>
                      <div className="metric-label">{m.label}</div>
                      <div className="metric-value" style={{ color: m.color, fontSize: 22 }}>{m.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {sortedTasks.map((task) => {
                const isActive = task.status !== "resolved";
                const isCompleting = completingId === task.id;
                const isExpanded = expandedTaskId === task.id;
                return (
                  <div
                    key={task.id}
                    className="glass-panel"
                    style={{
                      padding: 22,
                      opacity: isActive ? 1 : 0.65,
                      borderLeft: `3px solid ${isActive ? (task.priority === "critical" ? "#EF4444" : "#F59E0B") : "#10B981"}`,
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                    onClick={() => isActive && setExpandedTaskId(isExpanded ? null : task.id)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>{task.id}</span>
                          <PriorityBadge p={task.priority} />
                          <span className={`badge ${task.status === "resolved" ? "badge-healthy" : task.status === "in_progress" ? "badge-purple" : "badge-info"}`}>
                            {task.status.replace("_", " ")}
                          </span>
                        </div>
                        <h3 style={{ fontSize: 16, fontWeight: 700 }}>{task.cat}</h3>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          Location: <span style={{ color: "var(--text-secondary)" }}>{task.area}</span> (Target: {task.lat}°N, {task.lon}°E)
                        </div>
                      </div>
                      {isActive && (
                        <button
                          className="btn-primary"
                          onClick={(e) => { e.stopPropagation(); completeTask(task.id); }}
                          disabled={isCompleting}
                          style={{ gap: 8 }}
                        >
                          {isCompleting ? (
                            <span className="animate-spin" style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />
                          ) : (
                            <CheckCircle size={14} />
                          )}
                          {isCompleting ? "Completing..." : "Mark Complete"}
                        </button>
                      )}
                    </div>

                    <div className="responsive-split-1-2" style={{ marginTop: 14, gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                        <Timer size={13} color="#0EA5E9" />
                        <span style={{ color: "var(--text-muted)" }}>ETA:</span>
                        <span style={{ color: "var(--text-primary)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>{task.eta}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                        <Flag size={13} color="#8B5CF6" />
                        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{task.ai_explanation}</span>
                      </div>
                    </div>

                    {isExpanded && isActive && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-dim)", display: "flex", flexDirection: "column", gap: 10 }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                            📍 Coordinates: {task.lat}°N, {task.lon}°E (Sector Dispatch: {task.area})
                          </span>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${task.lat},${task.lon}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary"
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 12, padding: "8px 16px" }}
                          >
                            <Navigation size={12} /> Open Google Maps Directions
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* PERFORMANCE */}
          {section === "performance" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700 }}>My Performance</h1>
              <div className="responsive-grid-2" style={{ gap: 16 }}>
                <div className="glass-panel" style={{ padding: 24, textAlign: "center", borderTop: `3px solid ${perfColor}` }}>
                  <div className="metric-label">Performance Score</div>
                  <div style={{ fontSize: 64, fontWeight: 800, fontFamily: "var(--font-mono)", color: perfColor }}>{performanceScore}</div>
                  <div style={{ color: perfColor, fontWeight: 600 }}>Excellent</div>
                </div>
                <div className="glass-panel" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { label: "Cleanups Completed", val: "47", icon: <CheckCircle size={14} color="#10B981" /> },
                    { label: "Avg Response Time", val: "14 min", icon: <Timer size={14} color="#0EA5E9" /> },
                    { label: "Eco Points", val: "2,340", icon: <Zap size={14} color="#F59E0B" /> },
                    { label: "Flags Received", val: "0", icon: <Flag size={14} color="#10B981" /> },
                  ].map((m) => (
                    <div key={m.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)" }}>
                        {m.icon} {m.label}
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-primary)" }}>{m.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
