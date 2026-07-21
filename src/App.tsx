import React, { useState } from "react";
import { StoreProvider, useStore } from "./lib/store";
import { Icon } from "./components/Icon";
import { refreshPublicData } from "./lib/marketdata";
import { fmtDate } from "./lib/format";

import { Overview } from "./modules/Overview";
import { Pipeline } from "./modules/Pipeline";
import { Comps } from "./modules/Comps";
import { Markets } from "./modules/Markets";
import { Firms } from "./modules/Firms";
import { CapitalMarkets } from "./modules/CapitalMarkets";
import { Costs } from "./modules/Costs";
import { Underwriting } from "./modules/Underwriting";
import { Analyst } from "./modules/Analyst";
import { DataHub } from "./modules/DataHub";
import { SettingsPage } from "./modules/SettingsPage";

interface NavDef { key: string; label: string; icon: string; title: string; desc: string; Comp: React.FC; group: string; }

const NAV: NavDef[] = [
  { key: "overview", label: "Overview", icon: "dashboard", title: "Executive Overview", desc: "Live snapshot across pipeline, markets, capital & costs", Comp: Overview, group: "Command" },
  { key: "pipeline", label: "Deal Pipeline", icon: "pipeline", title: "Deal Pipeline & Flow", desc: "Every live pursuit — sortable, filterable, weighted", Comp: Pipeline, group: "Deals" },
  { key: "comps", label: "Comparables", icon: "comps", title: "Sale & Lease Comps", desc: "Public and internal transaction evidence", Comp: Comps, group: "Deals" },
  { key: "markets", label: "Markets", icon: "markets", title: "Market Fundamentals", desc: "Supply, demand, power & pricing by metro", Comp: Markets, group: "Intelligence" },
  { key: "firms", label: "Firms & Activity", icon: "firms", title: "Firms & Activity", desc: "Who's buying, building and leasing", Comp: Firms, group: "Intelligence" },
  { key: "capital", label: "Capital Markets", icon: "capital", title: "Capital Markets", desc: "Rates, spreads, cap rates & debt/equity conditions", Comp: CapitalMarkets, group: "Intelligence" },
  { key: "costs", label: "Costs & Inflation", icon: "costs", title: "Costs & Inflation", desc: "Development cost stack and input-price tracker", Comp: Costs, group: "Intelligence" },
  { key: "underwrite", label: "Underwriting", icon: "underwrite", title: "Underwriting Model", desc: "Deterministic development & investment model", Comp: Underwriting, group: "Tools" },
  { key: "analyst", label: "AI Analyst", icon: "ai", title: "AI Analyst", desc: "Ask questions across all your live data", Comp: Analyst, group: "Tools" },
  { key: "data", label: "Data & Sources", icon: "data", title: "Data & Sources", desc: "Upload, export, search and redress your records", Comp: DataHub, group: "Tools" },
];

const GROUPS = ["Command", "Deals", "Intelligence", "Tools"];

function Shell() {
  const { settings, updateSettings, data, replaceData, toast, toasts } = useStore();
  const [active, setActive] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);
  const cur = active === "settings"
    ? { title: "Settings", desc: "Keys, identity and data controls", Comp: SettingsPage }
    : NAV.find((n) => n.key === active)!;

  const doRefresh = async () => {
    setRefreshing(true);
    try {
      const { data: nd, result } = await refreshPublicData(data, settings);
      replaceData(nd);
      if (result.updated.length) toast(`Refreshed: ${result.updated.join(", ")}`, "ok");
      else toast(result.errors[0] || "No live sources reachable — using last-known values.", "warn");
    } catch (e) {
      toast("Refresh failed — kept last-known values.", "warn");
    } finally {
      setRefreshing(false);
    }
  };

  const Comp = cur.Comp;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#17e88f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 18 L9.5 11 L14 14.5 L20 6" /><path d="M20 6 h-4 M20 6 v4" />
            </svg>
          </div>
          <div>
            <div className="brand-name">Meridian</div>
            <div className="brand-sub">Capital Markets</div>
          </div>
        </div>

        {GROUPS.map((g) => (
          <div key={g}>
            <div className="nav-group-label">{g}</div>
            {NAV.filter((n) => n.group === g).map((n) => (
              <button key={n.key} className={"nav-item " + (active === n.key ? "active" : "")} onClick={() => setActive(n.key)}>
                <Icon name={n.icon} size={17} className="nav-ico" />
                {n.label}
                {n.key === "analyst" && <span className="nav-badge">AI</span>}
              </button>
            ))}
          </div>
        ))}

        <div className="sidebar-footer">
          <button className={"nav-item " + (active === "settings" ? "active" : "")} onClick={() => setActive("settings")}>
            <Icon name="settings" size={17} className="nav-ico" /> Settings
          </button>
          <div style={{ padding: "10px 12px 2px", fontSize: 10.5, color: "#5f9782" }}>
            {settings.firmName} · {settings.brokerName}
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <div className="page-title">{cur.title}</div>
            <div className="page-desc">{cur.desc}</div>
          </div>
          <div className="topbar-actions">
            <span className="muted" style={{ fontSize: 11.5, marginRight: 2 }}>
              {data.meta.lastRefresh ? `Updated ${fmtDate(data.meta.lastRefresh)}` : "Seed data"}
            </span>
            <button className="btn btn-sm" onClick={doRefresh} disabled={refreshing} title="Redress — pull latest public benchmarks">
              <Icon name="redress" size={15} style={refreshing ? { animation: "spin 1s linear infinite" } : undefined} />
              {refreshing ? "Refreshing…" : "Redress"}
            </button>
            <button className="btn btn-icon btn-sm" onClick={() => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })} title="Toggle theme">
              <Icon name={settings.theme === "dark" ? "sun" : "moon"} size={16} />
            </button>
          </div>
        </div>

        <div className="content">
          <div className="content-narrow">
            <Comp />
          </div>
        </div>
      </main>

      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <span className="bar" style={{ background: t.tone === "err" ? "var(--critical)" : t.tone === "warn" ? "var(--warning)" : "var(--accent)" }} />
            {t.msg}
          </div>
        ))}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
