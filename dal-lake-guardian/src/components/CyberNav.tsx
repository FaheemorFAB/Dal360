"use client";

import { useRouter } from "next/navigation";
import { LogOut, Map, PlusCircle, Compass, Users, Activity, BarChart2, Settings, Shield } from "lucide-react";

interface NavItem {
  id: string;
  icon: string; // we'll map icons dynamically inside or accept components
  label: string;
  href: string;
}

interface CyberNavProps {
  role: "citizen" | "worker" | "admin";
  items: NavItem[];
  activeSection: string;
  onSectionChange: (id: string) => void;
}

const ROLE_THEME = {
  citizen: {
    title: "Citizen Portal",
    badge: "Community Monitor",
    color: "text-emerald-400 bg-emerald-500/5 border-emerald-500/10",
  },
  worker: {
    title: "Field Operator",
    badge: "Response Team",
    color: "text-cyan-400 bg-cyan-500/5 border-cyan-500/10",
  },
  admin: {
    title: "Command Centre",
    badge: "LCMA Admin",
    color: "text-violet-400 bg-violet-500/5 border-violet-500/10",
  },
};

// Map string keys to Lucide icons
const iconMap: Record<string, any> = {
  "🗺️": Map,
  "📷": PlusCircle,
  "📋": Compass,
  "💧": Activity,
  "👤": Users,
  "🏠": Shield,
  "👷": Users,
  "🤖": Activity,
  "📈": BarChart2,
  "⚙️": Settings,
  "📸": PlusCircle,
  "✅": Shield,
};

export default function CyberNav({ role, items, activeSection, onSectionChange }: CyberNavProps) {
  const router = useRouter();
  const theme = ROLE_THEME[role];

  return (
    <>
      {/* Top Navbar */}
      <header className="nav-top flex items-center justify-between px-6 border-b border-zinc-900 z-50">
        <div className="flex items-center gap-3">
          <div 
            onClick={() => router.push("/")}
            className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm cursor-pointer hover:bg-zinc-800 transition-all"
          >
            🌊
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-wide text-zinc-100">{theme.title}</span>
              <span className={`text-[9px] px-2 py-0.5 rounded-full border font-mono ${theme.color}`}>
                {theme.badge}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
          <span className="hidden md:inline">34.0895° N, 74.8564° E</span>
          <span className="text-zinc-800">|</span>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="font-medium">Exit</span>
          </button>
        </div>
      </header>

      {/* Side Navigation */}
      <aside className="w-60 bg-[#09090b] border-r border-zinc-900 h-screen fixed top-0 left-0 pt-20 z-40 flex flex-col justify-between">
        <div className="space-y-1 px-3">
          {items.map((item) => {
            const IconComponent = iconMap[item.icon] || Map;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-xs font-medium transition-all ${
                  isActive
                    ? "bg-zinc-900 text-zinc-100 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30"
                }`}
              >
                <IconComponent className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-zinc-500"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-zinc-900/60 font-mono text-[9px] text-zinc-600 space-y-1">
          <div>DAL360 v1.0</div>
          <div>STABLE SATELLITE CONNECTION</div>
        </div>
      </aside>
    </>
  );
}
