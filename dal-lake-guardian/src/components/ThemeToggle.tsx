"use client";

import { useEffect, useState, useRef } from "react";
import { Palette } from "lucide-react";

const THEMES = [
  { id: "slate",   name: "Slate Dark",  bg: "#1d232a", color: "#6610f2", text: "Slate" },
  { id: "emerald", name: "Eco Emerald", bg: "#0c1914", color: "#10B981", text: "Eco" },
  { id: "nordic",  name: "Nordic Snow", bg: "#ffffff", color: "#4f46e5", text: "Nordic" },
  { id: "sepia",   name: "Sepia Warm",  bg: "#f4efe6", color: "#c2410c", text: "Sepia" },
];

export default function ThemeToggle() {
  const [theme, setTheme] = useState("slate");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load persisted theme on mount
  useEffect(() => {
    const saved = localStorage.getItem("dal-theme") || "slate";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
    if (saved === "nordic" || saved === "sepia") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, []);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const selectTheme = (themeId: string) => {
    setTheme(themeId);
    document.documentElement.setAttribute("data-theme", themeId);
    localStorage.setItem("dal-theme", themeId);
    
    // Maintain backwards compatibility for light-mode css overrides
    if (themeId === "nordic" || themeId === "sepia") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
    setOpen(false);
  };

  const activeTheme = THEMES.find(t => t.id === theme) || THEMES[0];

  return (
    <div ref={menuRef} style={{ position: "relative", zIndex: 10000 }}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Select theme"
        title="Select UI Theme"
        style={{
          display:       "flex",
          alignItems:    "center",
          gap:           8,
          padding:       "0 12px",
          height:        32,
          borderRadius:  "var(--radius-sm)",
          border:        "1px solid var(--border-dim)",
          background:    "var(--bg-elevated)",
          color:         "var(--text-secondary)",
          cursor:        "pointer",
          transition:    "all 0.2s ease",
          fontSize:      11,
          fontFamily:    "var(--font-mono)",
          fontWeight:    600,
          flexShrink:    0,
        }}
      >
        <Palette size={13} color={activeTheme.color} />
        <span>{activeTheme.text.toUpperCase()}</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0,
          width: 140, background: "var(--bg-surface)", border: "1px solid var(--border-soft)",
          borderRadius: 8, padding: 4, boxShadow: "var(--shadow-md)",
          display: "flex", flexDirection: "column", gap: 2
        }}>
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => selectTheme(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 8px", border: "none", borderRadius: 6,
                background: theme === t.id ? "var(--bg-elevated)" : "transparent",
                color: theme === t.id ? "var(--text-primary)" : "var(--text-secondary)",
                cursor: "pointer", fontSize: 11, fontFamily: "var(--font-ui)",
                textAlign: "left", width: "100%", transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => {
                if (theme !== t.id) e.currentTarget.style.background = "var(--bg-elevated)";
              }}
              onMouseLeave={(e) => {
                if (theme !== t.id) e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.color, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{t.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
