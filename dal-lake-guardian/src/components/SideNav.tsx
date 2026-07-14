"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LogOut, LucideIcon, ChevronLeft } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

interface NavItem {
  id:    string;
  label: string;
  Icon:  LucideIcon;
  badge?: string;
}

interface SideNavProps {
  role:           "citizen" | "worker" | "admin";
  items:          NavItem[];
  activeSection:  string;
  onSectionChange:(id: string) => void;
  systemStatus?:  string;
}

const ROLE_CONFIG = {
  citizen: {
    label:  "Citizen Portal",
    badge:  "Community Monitor",
    color:  "#10B981",
    bg:     "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.2)",
  },
  worker: {
    label:  "Field Operator",
    badge:  "Response Team",
    color:  "#0EA5E9",
    bg:     "rgba(14,165,233,0.08)",
    border: "rgba(14,165,233,0.2)",
  },
  admin: {
    label:  "Command Centre",
    badge:  "LAWDA Admin",
    color:  "#8B5CF6",
    bg:     "rgba(139,92,246,0.08)",
    border: "rgba(139,92,246,0.2)",
  },
};

import { Droplets } from "lucide-react";

export default function SideNav({ role, items, activeSection, onSectionChange, systemStatus }: SideNavProps) {
  const router = useRouter();
  const cfg    = ROLE_CONFIG[role];
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const isCollapsed = localStorage.getItem("dal-sidebar-collapsed") === "true";
    setCollapsed(isCollapsed);
    if (isCollapsed) {
      document.documentElement.classList.add("sidebar-collapsed");
    } else {
      document.documentElement.classList.remove("sidebar-collapsed");
    }
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("dal-sidebar-collapsed", String(next));
    if (next) {
      document.documentElement.classList.add("sidebar-collapsed");
    } else {
      document.documentElement.classList.remove("sidebar-collapsed");
    }
  };

  return (
    <>
      {/* ─ Top bar ─────────────────────────────────────── */}
      <header
        className="nav-top"
        style={{ paddingLeft: 260, paddingRight: 24, justifyContent: "space-between" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              fontSize: 12, fontWeight: 600,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.04em",
            }}
          >
            {cfg.label}
          </div>
          <span
            style={{
              fontSize: 9, fontWeight: 700, padding: "2px 8px",
              borderRadius: 99, border: `1px solid ${cfg.border}`,
              background: cfg.bg, color: cfg.color,
              fontFamily: "var(--font-mono)", letterSpacing: "0.06em",
            }}
          >
            {cfg.badge}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-muted)",
            }}
          >
            <span className="status-dot status-dot-online status-dot-pulse" />
            <span>34.0895°N · 74.8564°E</span>
          </div>
          <ThemeToggle />
          <button
            onClick={() => router.push("/")}
            className="btn-ghost"
            style={{ fontSize: 12, gap: 6 }}
          >
            <LogOut size={14} />
            Exit
          </button>
        </div>
      </header>

      {/* ─ Sidebar ─────────────────────────────────────── */}
      <aside className="nav-side">
        {/* Logo and Collapse Toggle */}
        <div
          style={{
            padding: "0 16px 20px",
            borderBottom: "1px solid var(--border-dim)",
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div
            onClick={() => router.push("/")}
            style={{
              display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
              padding: "10px 8px", borderRadius: 10,
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-soft)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              <Droplets size={15} color="var(--accent-primary)" />
            </div>
            <div className="nav-logo-text">
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>
                Dal360
              </div>
              <div style={{ fontSize: 8, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
                LAWDA · Digital Twin
              </div>
            </div>
          </div>

          <button
            onClick={toggleCollapse}
            className="nav-collapse-btn"
            style={{
              padding: 4, width: 24, height: 24, borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid var(--border-soft)", background: "var(--bg-elevated)",
              color: "var(--text-muted)", cursor: "pointer"
            }}
          >
            <ChevronLeft size={14} style={{ transition: "transform 0.2s" }} />
          </button>
        </div>

        {/* Nav items */}
        <div style={{ padding: "0 8px", flex: 1 }}>
          {items.map((item) => {
            const isActive = activeSection === item.id;
            const Icon     = item.Icon;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`nav-item ${isActive ? "active" : ""}`}
                style={{ width: "100%", textAlign: "left" }}
              >
                <Icon
                  size={15}
                  className="nav-item-icon"
                  color={isActive ? cfg.color : undefined}
                />
                <span style={{ flex: 1, fontSize: 12.5 }}>{item.label}</span>
                {item.badge && (
                  <span
                    style={{
                      fontSize: 9, fontWeight: 700, padding: "1px 6px",
                      borderRadius: 99, background: "rgba(239,68,68,0.12)",
                      color: "#EF4444", fontFamily: "var(--font-mono)",
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom status */}
        <div
          className="nav-footer-text"
          style={{
            padding: "16px 16px",
            borderTop: "1px solid var(--border-dim)",
          }}
        >
          <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.06em", lineHeight: 1.8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
              <span className="status-dot status-dot-online" style={{ width: 4, height: 4 }} />
              ML ENGINE ONLINE
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span className="status-dot status-dot-online" style={{ width: 4, height: 4 }} />
              {systemStatus ?? "ALL SYSTEMS NOMINAL"}
            </div>
            <div style={{ marginTop: 6, color: "var(--text-faint)" }}>DAL360 v2.0</div>
          </div>
        </div>
      </aside>
    </>
  );
}
