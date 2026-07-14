"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Compass, Users, ShieldAlert, Activity, Droplets,
  AlertTriangle, CheckCircle, Zap, ArrowUpRight, Satellite,
  Brain, Map, BarChart3,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const ROLES = [
  {
    id:          "citizen",
    label:       "Citizen Portal",
    tagline:     "Community Monitor",
    Icon:        Compass,
    description: "Report pollution with geo-validated photos. Track your reports and earn Eco Points for a healthier Dal Lake.",
    features:    ["ML Geo-Validated Photo Upload", "Live Hotspot Map", "Personal Impact Metrics", "Citizen Trust Score"],
    accentColor: "#10B981",
    bgGlow:      "rgba(16,185,129,0.06)",
    borderColor: "rgba(16,185,129,0.18)",
    hoverBorder: "rgba(16,185,129,0.40)",
  },
  {
    id:          "worker",
    label:       "Field Operator",
    tagline:     "Response Team",
    Icon:        Users,
    description: "Receive AI-optimized assignments. Navigate via boat routes, submit photo proof, and sync with HQ in real time.",
    features:    ["A* Route Optimization", "Before/After Photo Proof", "Real-Time Sync", "Performance Tracking"],
    accentColor: "#0EA5E9",
    bgGlow:      "rgba(14,165,233,0.06)",
    borderColor: "rgba(14,165,233,0.18)",
    hoverBorder: "rgba(14,165,233,0.40)",
  },
  {
    id:          "admin",
    label:       "Command Centre",
    tagline:     "LCMA Admin",
    Icon:        ShieldAlert,
    description: "Full environmental intelligence: predictive health scores, risk forecasting, simulation lab, and accountability tools.",
    features:    ["XGBoost Health Score", "7-Day Risk Forecast", "Simulation Lab", "Culprit Tracking"],
    accentColor: "#8B5CF6",
    bgGlow:      "rgba(139,92,246,0.06)",
    borderColor: "rgba(139,92,246,0.18)",
    hoverBorder: "rgba(139,92,246,0.40)",
  },
];

const SYSTEM_STATS = [
  { label: "Lake Sectors Monitored", value: "8",     Icon: Map },
  { label: "AI Models Active",       value: "7",     Icon: Brain },
  { label: "Satellite Coverage",     value: "Weekly", Icon: Satellite },
  { label: "Avg Response Time",      value: "18 min", Icon: Zap },
];

const LIVE_INDICATORS = [
  { label: "XGBoost Health Engine",     status: "LIVE" },
  { label: "LightGBM Risk Forecast",    status: "LIVE" },
  { label: "Sentinel-2 Satellite",      status: "UPDATED" },
  { label: "Open-Meteo Rainfall API",   status: "SYNC" },
];

export default function LandingPage() {
  const router = useRouter();
  const [time, setTime] = useState("");
  const [overallScore, setOverallScore] = useState(71);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Animate score on mount
  useEffect(() => {
    let v = 0;
    const id = setInterval(() => {
      v += 2;
      if (v >= 71) { setOverallScore(71); clearInterval(id); }
      else setOverallScore(v);
    }, 20);
    return () => clearInterval(id);
  }, []);

  const scoreColor = overallScore >= 80 ? "#10B981" : overallScore >= 60 ? "#F59E0B" : overallScore >= 40 ? "#EF4444" : "#7F1D1D";
  const scoreLabel = overallScore >= 80 ? "Healthy" : overallScore >= 60 ? "Warning" : overallScore >= 40 ? "Critical" : "Emergency";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── TOP NAV ── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          height: 60,
          borderBottom: "1px solid var(--border-dim)",
          background: "var(--bg-panel)",
          backdropFilter: "blur(20px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(14,165,233,0.12)",
              border: "1px solid rgba(14,165,233,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Droplets size={18} color="#0EA5E9" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>
              DAL360
            </div>
            <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
              Environmental Intelligence Platform
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <ThemeToggle />
        </div>
      </header>

      {/* ── HERO ── */}
      <main style={{ flex: 1, maxWidth: 1200, margin: "0 auto", padding: "100px 48px 80px", width: "100%" }}>

        {/* Hero Text */}
        <div style={{ textAlign: "center", marginBottom: 72 }} className="animate-fade-in">
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.2)",
              borderRadius: 99, padding: "6px 16px", marginBottom: 28,
              fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.06em",
              color: "#0EA5E9", textTransform: "uppercase",
            }}
          >
            <Activity size={12} />
            LCMA · Digital Twin Operations · v2.0
          </div>

          <h1
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.15,
              marginBottom: 24,
              color: "var(--text-primary)",
            }}
          >
            Preserving Dal Lake
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #0EA5E9 0%, #14B8A6 50%, #10B981 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Through Environmental Intelligence
            </span>
          </h1>

          <p style={{ fontSize: 17.5, color: "var(--text-secondary)", maxWidth: 680, margin: "0 auto 48px", lineHeight: 1.8 }}>
            A full-fledged digital twin using XGBoost health prediction, LightGBM risk forecasting,
            Sentinel-2 satellite intelligence, and computer vision validation — not just a dashboard.
          </p>

          {/* Live Lake Health Score */}
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 24,
              background: "var(--bg-surface)", border: `1px solid ${scoreColor}33`,
              borderRadius: 16, padding: "20px 32px",
              boxShadow: `0 0 32px ${scoreColor}15`,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.08em", marginBottom: 4 }}>
                OVERALL LAKE HEALTH
              </div>
              <div style={{ fontSize: 48, fontWeight: 800, fontFamily: "var(--font-mono)", color: scoreColor, lineHeight: 1 }}>
                {overallScore}
              </div>
              <div style={{ fontSize: 12, color: scoreColor, fontWeight: 600, marginTop: 2 }}>{scoreLabel}</div>
            </div>
            <div style={{ width: 1, height: 60, background: "var(--border-dim)" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px" }}>
              {[
                { label: "Hazratbal", score: 68, color: "#F59E0B" },
                { label: "Bod Dal", score: 75, color: "#F59E0B" },
                { label: "Nishat-Shalimar", score: 68, color: "#F59E0B" },
                { label: "Nigeen Lake", score: 90, color: "#10B981" },
                { label: "Lokut Dal", score: 56, color: "#EF4444" },
                { label: "Rainawari", score: 61, color: "#F59E0B" },
                { label: "Boulevard", score: 85, color: "#10B981" },
                { label: "Gagribal", score: 64, color: "#F59E0B" },
              ].map((s) => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{s.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: s.color, fontFamily: "var(--font-mono)" }}>{s.score}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)", writingMode: "vertical-rl" }}>
              XGBoost · Live
            </div>
          </div>
        </div>

        {/* System Stats Bar */}
        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 64 }}
          className="stagger-children"
        >
          {SYSTEM_STATS.map(({ label, value, Icon }) => (
            <div
              key={label}
              style={{
                background: "var(--bg-surface)", border: "1px solid var(--border-dim)",
                borderRadius: 14, padding: "20px 24px",
                display: "flex", alignItems: "center", gap: 14,
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={18} color="#0EA5E9" />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>{value}</div>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)", letterSpacing: "0.04em" }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Role Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }} className="stagger-children">
          {ROLES.map((role) => {
            const Icon = role.Icon;
            const isHovered = hovered === role.id;
            return (
              <div
                key={role.id}
                onClick={() => router.push(`/${role.id}`)}
                onMouseEnter={() => setHovered(role.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: isHovered ? role.bgGlow : "var(--bg-surface)",
                  border: `1px solid ${isHovered ? role.hoverBorder : role.borderColor}`,
                  borderRadius: 18,
                  padding: 32,
                  cursor: "pointer",
                  transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                  transform: isHovered ? "translateY(-4px)" : "none",
                  boxShadow: isHovered ? `0 12px 32px ${role.accentColor}18` : "none",
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                  minHeight: 310,
                }}
              >
                <div>
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div
                      style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: `${role.accentColor}14`,
                        border: `1px solid ${role.accentColor}30`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Icon size={20} color={role.accentColor} />
                    </div>
                    <ArrowUpRight
                      size={16}
                      color={isHovered ? role.accentColor : "var(--text-muted)"}
                      style={{ transition: "color 0.2s ease" }}
                    />
                  </div>

                  {/* Labels */}
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-mono)", color: role.accentColor, marginBottom: 6 }}>
                    {role.tagline}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "var(--text-primary)" }}>
                    {role.label}
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 20 }}>
                    {role.description}
                  </p>
                </div>

                {/* Features */}
                <div style={{ borderTop: "1px solid var(--border-dim)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                  {role.features.map((f) => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-muted)" }}>
                      <CheckCircle size={11} color={role.accentColor} />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer
        style={{
          borderTop: "1px solid var(--border-dim)",
          padding: "16px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          color: "var(--text-muted)",
          letterSpacing: "0.06em",
        }}
      >
        <span>LCMA DIGITAL TWIN OPS · v2.0 · KASHMIR</span>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {["XGBoost Health", "LightGBM Forecast", "Sentinel-2 Sat", "Gemini Vision"].map((s) => (
            <span key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span className="status-dot status-dot-online" style={{ width: 4, height: 4 }} />
              {s}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}
