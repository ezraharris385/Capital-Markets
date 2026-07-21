import React, { useState, useMemo } from "react";
import { useStore } from "../lib/store";
import { Card, Delta, PillTabs } from "../components/ui";
import { LineChart, Sparkline, SERIES } from "../components/charts";
import { Icon } from "../components/Icon";
import type { RateMetric } from "../data/types";

const CATS = ["Rates", "Spreads", "Cap Rates", "Equity"] as const;

export const CapitalMarkets: React.FC = () => {
  const { data } = useStore();
  const R = data.rates;
  const [selKey, setSel] = useState("cap_stab");
  const sel = R.find((r) => r.key === selKey)!;

  const goodUp = (r: RateMetric) => r.category === "Equity";
  const labels = sel.history.map((h, i) => (i % 3 === 0 ? mo(h.t) : ""));

  const devSpread = R.find((r) => r.key === "spread_dev")!;
  const yoc = R.find((r) => r.key === "yoc")!;
  const capStab = R.find((r) => r.key === "cap_stab")!;

  return (
    <div className="col" style={{ gap: 16 }}>
      {/* Signal callout */}
      <div className="card" style={{ background: "linear-gradient(150deg, var(--brand-deep-2), var(--surface-card) 65%)", overflow: "hidden" }}>
        <div className="card-pad row" style={{ gap: 26, flexWrap: "wrap" }}>
          <div className="col" style={{ gap: 3 }}>
            <span className="muted" style={{ fontSize: 12 }}>Development spread (build-to-core margin)</span>
            <div className="row" style={{ alignItems: "baseline", gap: 10 }}>
              <span className="hero-num" style={{ fontSize: 40, color: "var(--accent)" }}>{devSpread.value}</span>
              <span style={{ fontSize: 15, color: "var(--text-secondary)" }}>bps</span>
              <Delta v={devSpread.changeBps} bps goodUp />
            </div>
            <span className="muted" style={{ fontSize: 12 }}>Yield-on-cost {yoc.value}% − stabilized cap {capStab.value}%. Wide spread favors building over buying.</span>
          </div>
          <div className="spacer" />
          <div style={{ minWidth: 160 }}>
            <Sparkline data={devSpread.history.map((h) => h.v)} color="var(--accent)" width={180} height={54} />
          </div>
        </div>
      </div>

      {/* Main chart */}
      <Card title={sel.label} sub={`18-month history · ${sel.note || sel.category}`}
        actions={<span className="row" style={{ alignItems: "baseline", gap: 8 }}><span style={{ fontSize: 22, fontWeight: 720 }}>{sel.value}{sel.unit === "%" ? "%" : sel.unit === "bps" ? " bps" : ""}</span><Delta v={sel.changeBps} bps goodUp={goodUp(sel)} /></span>}>
        <LineChart labels={labels} area
          series={[{ name: sel.label, color: sel.category === "Equity" ? "var(--s3)" : sel.category === "Cap Rates" ? "var(--s2)" : SERIES[0], data: sel.history.map((h) => h.v) }]}
          yFmt={(v) => sel.unit === "bps" ? String(Math.round(v)) : v.toFixed(2)} valueSuffix={sel.unit === "%" ? "%" : sel.unit === "bps" ? "bps" : ""} height={230} />
      </Card>

      {/* Metric grid by category */}
      {CATS.map((cat) => {
        const list = R.filter((r) => r.category === cat);
        if (!list.length) return null;
        return (
          <div key={cat} className="col" style={{ gap: 10 }}>
            <div className="section-title">{cat}</div>
            <div className="grid g-3">
              {list.map((r) => (
                <button key={r.key} className="card stat" style={{ textAlign: "left", cursor: "pointer", border: selKey === r.key ? "1px solid var(--accent-dim)" : undefined }}
                  onClick={() => setSel(r.key)}>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span className="stat-label">{r.label}</span>
                    {selKey === r.key && <Icon name="check" size={14} style={{ color: "var(--accent)" }} />}
                  </div>
                  <div className="row" style={{ alignItems: "baseline", gap: 8, marginTop: 2 }}>
                    <span className="stat-value" style={{ fontSize: 22 }}>{r.value}{r.unit === "%" ? "%" : r.unit === "bps" ? "" : ""}<span style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.unit === "bps" ? " bps" : ""}</span></span>
                    <Delta v={r.changeBps} bps goodUp={goodUp(r)} />
                  </div>
                  <div className="stat-spark"><Sparkline data={r.history.map((h) => h.v)} color={goodUp(r) ? "var(--up)" : "var(--s1)"} width={72} height={24} fill={false} /></div>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <Card title="Financing conditions — quick reference" sub="Typical terms for institutional-quality data-center assets (illustrative)">
        <div className="grid g-4">
          {[
            { k: "Sr. debt LTV", v: "55–65%" }, { k: "Sr. spread (SOFR+)", v: "170–195 bps" },
            { k: "DSCR floor", v: "1.35–1.50x" }, { k: "Debt yield", v: "8.5–10%" },
            { k: "Going-in cap (stabilized)", v: "6.0–6.5%" }, { k: "Powered shell cap", v: "6.75–7.1%" },
            { k: "Dev yield-on-cost", v: "8.3–9.0%" }, { k: "Equity target IRR", v: "13–17%" },
          ].map((x) => (
            <div key={x.k} className="col" style={{ gap: 2, padding: "6px 0" }}>
              <span className="muted" style={{ fontSize: 12 }}>{x.k}</span>
              <span style={{ fontWeight: 640, fontSize: 15 }}>{x.v}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

function mo(t: string) { return new Date(t).toLocaleDateString("en-US", { month: "short", year: "2-digit" }); }
