import React, { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { Card, StatTile, Delta } from "../components/ui";
import { Donut, RankBars, LineChart, Sparkline, SERIES } from "../components/charts";
import { Icon } from "../components/Icon";
import { fmtUSD, compactNum } from "../lib/format";
import { exportRows } from "../lib/xlsx";

const GROUP_COLORS: Record<string, string> = {
  "Land & Sitework": SERIES[0], "Shell & Core": SERIES[2], "Electrical": SERIES[3],
  "Mechanical": SERIES[1], "Fit-out": SERIES[4], "Soft Costs": SERIES[6],
};

export const Costs: React.FC = () => {
  const { data } = useStore();
  const C = data.costs;
  const [selInf, setSelInf] = useState("transformer");
  const inf = data.inflation.find((i) => i.key === selInf)!;

  const agg = useMemo(() => {
    const total = C.reduce((a, c) => a + c.costPerMW, 0);
    const byGroup: Record<string, number> = {};
    C.forEach((c) => (byGroup[c.group] = (byGroup[c.group] || 0) + c.costPerMW));
    const donut = Object.entries(byGroup).map(([k, v]) => ({ label: k, value: v, color: GROUP_COLORS[k] }));
    const wtdInfl = C.reduce((a, c) => a + c.yoyPct * c.costPerMW, 0) / total;
    const comps = [...C].sort((a, b) => b.costPerMW - a.costPerMW).map((c) => ({ label: c.label, value: c.costPerMW, color: GROUP_COLORS[c.group], sub: "$/MW" }));
    return { total, donut, wtdInfl, comps };
  }, [C]);

  const infLabels = inf.history.map((h, i) => (i % 3 === 0 ? mo(h.t) : ""));

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="grid g-4">
        <div className="card stat" style={{ background: "linear-gradient(160deg, var(--brand-deep-2), var(--surface-card) 70%)" }}>
          <div className="stat-label" style={{ color: "#bfe3d3" }}>All-in build cost</div>
          <div className="hero-num" style={{ fontSize: 34 }}>{fmtUSD(agg.total, { compact: true })}<span style={{ fontSize: 15, color: "var(--text-secondary)" }}>/MW</span></div>
          <div className="stat-sub">critical IT load · hyperscale</div>
        </div>
        <StatTile label="Blended input inflation" value={agg.wtdInfl.toFixed(1) + "%"} sub="cost-weighted YoY" delta="+1.4 pts" deltaGood={false} />
        <StatTile label="Longest lead item" value="Switchgear" sub="transformers 60–100 wk" delta="+18.5% YoY" deltaGood={false} />
        <StatTile label="Cost per 100MW campus" value={fmtUSD(agg.total * 100, { compact: true })} sub="illustrative total" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1.4fr" }}>
        <Card title="Cost stack by system" sub="Share of all-in $/MW">
          <Donut data={agg.donut} centerValue={fmtUSD(agg.total, { compact: true })} centerLabel="per MW" size={172} />
        </Card>
        <Card title="Component detail" sub="Cost per MW and YoY input inflation" pad={false}>
          <div className="table-wrap">
            <table className="dt">
              <thead><tr><th>Component</th><th>System</th><th className="num">$/MW</th><th className="num">YoY</th></tr></thead>
              <tbody>
                {C.map((c) => (
                  <tr key={c.key}>
                    <td><span className="row" style={{ gap: 8 }}><span className="tooltip-dot" style={{ background: GROUP_COLORS[c.group] }} /><span className="t-strong">{c.label}</span></span></td>
                    <td className="t-mut">{c.group}</td>
                    <td className="num t-strong">{fmtUSD(c.costPerMW, { compact: true })}</td>
                    <td className="num"><span style={{ color: c.yoyPct > 12 ? "var(--warning)" : c.yoyPct > 8 ? "var(--serious)" : "var(--text-secondary)" }}>+{c.yoyPct}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="col" style={{ gap: 10 }}>
        <div className="row"><div className="section-title">Inflation tracker</div><div className="spacer" /><button className="btn btn-sm" onClick={() => exportRows(data.inflation.map((i) => ({ Index: i.label, Latest: i.latest, Unit: i.unit, YoY: i.yoyPct, Category: i.category })), "meridian-inflation.xlsx", "Inflation")}><Icon name="download" size={15} /> Export</button></div>
        <Card title={inf.label} sub={`18-month history · ${inf.category}`}
          actions={<span className="row" style={{ alignItems: "baseline", gap: 8 }}><span style={{ fontSize: 20, fontWeight: 700 }}>{inf.latest}{inf.unit === "index" ? "" : " " + inf.unit.replace("% YoY", "%")}</span><Delta v={inf.yoyPct} suffix="%" goodUp={false} /></span>}>
          <LineChart labels={infLabels} area series={[{ name: inf.label, color: inf.yoyPct > 12 ? "var(--s2)" : "var(--s1)", data: inf.history.map((h) => h.v) }]}
            yFmt={(v) => v.toFixed(inf.latest < 10 ? 2 : 0)} height={200} />
        </Card>
        <div className="grid g-4">
          {data.inflation.map((i) => (
            <button key={i.key} className="card stat" style={{ textAlign: "left", cursor: "pointer", border: selInf === i.key ? "1px solid var(--accent-dim)" : undefined }} onClick={() => setSelInf(i.key)}>
              <div className="stat-label">{i.label}</div>
              <div className="row" style={{ alignItems: "baseline", gap: 8, marginTop: 2 }}>
                <span className="stat-value" style={{ fontSize: 19 }}>{i.latest}{i.unit === "index" ? "" : i.unit.includes("$") ? " " + i.unit : ""}</span>
                <Delta v={i.yoyPct} suffix="%" goodUp={false} />
              </div>
              <div className="stat-spark"><Sparkline data={i.history.map((h) => h.v)} color={i.yoyPct > 12 ? "var(--s2)" : "var(--s1)"} width={68} height={22} fill={false} /></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

function mo(t: string) { return new Date(t).toLocaleDateString("en-US", { month: "short", year: "2-digit" }); }
