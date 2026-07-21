import React, { useMemo } from "react";
import { useStore } from "../lib/store";
import { Card, StatTile, Delta, stageBadge } from "../components/ui";
import { LineChart, RankBars, Donut, SERIES, Legend, ColumnChart } from "../components/charts";
import { fmtUSD, fmtPct, fmtMW, compactNum } from "../lib/format";
import { Icon } from "../components/Icon";

export const Overview: React.FC = () => {
  const { data } = useStore();
  const d = data;

  const m = useMemo(() => {
    const pipeline = d.deals.filter((x) => x.stage !== "Closed" && x.stage !== "Lost");
    const totalPipe = pipeline.reduce((a, x) => a + x.value, 0);
    const wtdPipe = pipeline.reduce((a, x) => a + x.value * x.probability / 100, 0);
    const closed = d.deals.filter((x) => x.stage === "Closed");
    const closedVal = closed.reduce((a, x) => a + x.value, 0);
    const feeYTD = d.deals.filter((x) => x.stage === "Closed").reduce((a, x) => a + x.commission, 0);
    const openFee = pipeline.reduce((a, x) => a + x.commission * x.probability / 100, 0);
    const caps = d.deals.filter((x) => x.capRate).map((x) => x.capRate!);
    const avgCap = caps.reduce((a, b) => a + b, 0) / (caps.length || 1);
    const totalMW = pipeline.reduce((a, x) => a + x.sizeMW, 0);

    const byStage: Record<string, number> = {};
    pipeline.forEach((x) => (byStage[x.stage] = (byStage[x.stage] || 0) + x.value));
    const stageOrder = ["Sourcing", "Underwriting", "LOI", "Under Contract"];
    const stageData = stageOrder.filter((s) => byStage[s]).map((s, i) => ({ label: s, value: byStage[s], color: SERIES[i] }));

    const byMarket: Record<string, number> = {};
    pipeline.forEach((x) => (byMarket[x.market] = (byMarket[x.market] || 0) + x.value));
    const marketBars = Object.entries(byMarket).map(([k, v]) => ({ label: k, value: v })).sort((a, b) => b.value - a.value).slice(0, 6);

    const absBars = [...d.markets].sort((a, b) => b.absorptionMW - a.absorptionMW).slice(0, 6)
      .map((x) => ({ label: x.name, value: x.absorptionMW, sub: "12mo absorption" }));

    const costTotal = d.costs.reduce((a, c) => a + c.costPerMW, 0);
    return { pipeline, totalPipe, wtdPipe, closed, closedVal, feeYTD, openFee, avgCap, totalMW, stageData, marketBars, absBars, costTotal };
  }, [d]);

  const ust10 = d.rates.find((r) => r.key === "ust10")!;
  const sofr = d.rates.find((r) => r.key === "sofr")!;
  const devSpread = d.rates.find((r) => r.key === "spread_dev")!;
  const capStab = d.rates.find((r) => r.key === "cap_stab")!;

  const recent = [...d.deals].sort((a, b) => +new Date(b.closeDate) - +new Date(a.closeDate)).slice(0, 6);

  return (
    <div className="col" style={{ gap: 16 }}>
      {/* Hero row */}
      <div className="grid g-4">
        <div className="card stat" style={{ gridColumn: "span 1", background: "linear-gradient(160deg, var(--brand-deep-2), var(--surface-card) 70%)" }}>
          <div className="stat-label" style={{ color: "#bfe3d3" }}>Total pipeline value</div>
          <div className="hero-num" style={{ fontSize: 38 }}>{fmtUSD(m.totalPipe, { compact: true })}</div>
          <div className="stat-row">
            <span className="chip" style={{ background: "rgba(23,232,143,0.14)", color: "var(--accent)", border: "none" }}>{m.pipeline.length} active deals</span>
            <span className="stat-sub">{fmtMW(m.totalMW)}</span>
          </div>
        </div>
        <StatTile label="Probability-weighted" value={fmtUSD(m.wtdPipe, { compact: true })} sub="expected value" spark={ust10.history.map((h) => h.v)} sparkColor="var(--accent)" delta="+8.4%" deltaGood />
        <StatTile label="Closed YTD" value={fmtUSD(m.closedVal, { compact: true })} sub={`${m.closed.length} transactions`} delta="+2 deals" deltaGood />
        <StatTile label="Est. fees (closed + weighted)" value={fmtUSD(m.feeYTD + m.openFee, { compact: true })} sub={`${fmtUSD(m.feeYTD, { compact: true })} realized`} delta="+11%" deltaGood />
      </div>

      {/* Market pulse strip */}
      <Card title="Market pulse" sub="Key capital-markets signals, live">
        <div className="grid g-4" style={{ gap: 20 }}>
          {[
            { r: ust10, goodUp: false }, { r: sofr, goodUp: false },
            { r: capStab, goodUp: false }, { r: devSpread, goodUp: true },
          ].map(({ r, goodUp }) => (
            <div key={r.key} className="col" style={{ gap: 2 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="muted" style={{ fontSize: 12 }}>{r.label}</span>
              </div>
              <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 700 }}>{r.value}{r.unit === "%" ? "%" : r.unit === "bps" ? "" : ""}<span style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.unit === "bps" ? " bps" : ""}</span></span>
                <Delta v={r.changeBps} bps goodUp={goodUp} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Pipeline composition + rates */}
      <div className="grid" style={{ gridTemplateColumns: "1.15fr 1fr" }}>
        <Card title="Pipeline by stage" sub="Active pursuits weighted toward close">
          <Donut data={m.stageData} centerValue={fmtUSD(m.totalPipe, { compact: true })} centerLabel="in pursuit" />
        </Card>
        <Card title="Rate & spread trend" sub="18-month history — 10Y UST vs SOFR">
          <LineChart labels={ust10.history.map((h, i) => (i % 3 === 0 ? mo(h.t) : ""))} area
            series={[
              { name: "10-Yr UST", color: SERIES[0], data: ust10.history.map((h) => h.v) },
              { name: "SOFR", color: SERIES[1], data: sofr.history.map((h) => h.v) },
            ]} yFmt={(v) => v.toFixed(1)} valueSuffix="%" height={210} />
          <div style={{ marginTop: 8 }}><Legend line items={[{ label: "10-Yr UST", color: SERIES[0] }, { label: "SOFR", color: SERIES[1] }]} /></div>
        </Card>
      </div>

      {/* Pipeline by market + absorption */}
      <div className="grid g-2">
        <Card title="Pipeline value by market" sub="Where your book is concentrated">
          <RankBars items={m.marketBars} valueFmt={(v) => fmtUSD(v, { compact: true })} color="var(--s1)" />
        </Card>
        <Card title="Hottest markets" sub="Trailing 12-month net absorption (MW)">
          <RankBars items={m.absBars} valueFmt={(v) => v.toFixed(0) + " MW"} color="var(--s3)" />
        </Card>
      </div>

      {/* Recent activity */}
      <Card title="Recent & upcoming activity" sub="Latest closings and near-term milestones" pad={false}>
        <div className="table-wrap">
          <table className="dt">
            <thead><tr><th>Deal</th><th>Market</th><th>Type</th><th>Stage</th><th className="num">Value</th><th className="num">Size</th><th className="num">Close</th></tr></thead>
            <tbody>
              {recent.map((x) => (
                <tr key={x.id}>
                  <td className="t-strong">{x.name}</td>
                  <td className="t-mut">{x.market}</td>
                  <td><span className="chip">{x.dealType}</span></td>
                  <td>{stageBadge(x.stage)}</td>
                  <td className="num t-strong">{x.value ? fmtUSD(x.value, { compact: true }) : "—"}</td>
                  <td className="num t-mut">{x.sizeMW ? x.sizeMW + " MW" : "—"}</td>
                  <td className="num t-mut">{new Date(x.closeDate).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

function mo(t: string) {
  return new Date(t).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}
