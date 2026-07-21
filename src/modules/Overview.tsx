import React, { useMemo } from "react";
import { useStore } from "../lib/store";
import { Card, StatTile, Delta } from "../components/ui";
import { Icon } from "../components/Icon";
import { LineChart, RankBars, Donut, SERIES, Legend } from "../components/charts";
import { fmtUSD, fmtPct, fmtMW, gainColor } from "../lib/format";

export const Overview: React.FC = () => {
  const { data } = useStore();
  const d = data;
  const hasProjects = d.projects.length > 0;

  const roll = useMemo(() => {
    const P = d.projects;
    const cost = P.reduce((a, p) => a + p.totalCost, 0);
    const value = P.reduce((a, p) => a + p.stabilizedValue, 0);
    const profit = P.reduce((a, p) => a + p.developmentProfit, 0);
    const equity = P.reduce((a, p) => a + p.equity, 0);
    const mw = P.reduce((a, p) => a + p.sizeMW, 0);
    const yoc = cost > 0 ? P.reduce((a, p) => a + p.yieldOnCost * p.totalCost, 0) / cost : 0;
    const irr = equity > 0 ? P.reduce((a, p) => a + p.leveredIRR * p.equity, 0) / equity : 0;

    const byStatus: Record<string, number> = {};
    P.forEach((p) => (byStatus[p.status] = (byStatus[p.status] || 0) + p.stabilizedValue));
    const statusData = Object.entries(byStatus).map(([k, v], i) => ({ label: k, value: v, color: SERIES[i % SERIES.length] }));
    const profitBars = [...P].sort((a, b) => b.developmentProfit - a.developmentProfit).slice(0, 6)
      .map((p) => ({ label: p.name, value: p.developmentProfit, color: gainColor(p.developmentProfit), sub: "dev profit" }));
    return { cost, value, profit, equity, mw, yoc, irr, statusData, profitBars, count: P.length };
  }, [d]);

  const absBars = [...d.markets].sort((a, b) => b.absorptionMW - a.absorptionMW).slice(0, 6)
    .map((x) => ({ label: x.name, value: x.absorptionMW, sub: "12mo absorption" }));

  const ust10 = d.rates.find((r) => r.key === "ust10")!;
  const sofr = d.rates.find((r) => r.key === "sofr")!;
  const devSpread = d.rates.find((r) => r.key === "spread_dev")!;
  const capStab = d.rates.find((r) => r.key === "cap_stab")!;
  const dealFlow = [...d.deals].sort((a, b) => +new Date(b.closeDate) - +new Date(a.closeDate)).slice(0, 6);

  const RateTrend = (
    <Card title="Rate & spread trend" sub="18-month history — 10Y UST vs SOFR">
      <LineChart labels={ust10.history.map((h, i) => (i % 3 === 0 ? mo(h.t) : ""))} area
        series={[
          { name: "10-Yr UST", color: SERIES[0], data: ust10.history.map((h) => h.v) },
          { name: "SOFR", color: SERIES[1], data: sofr.history.map((h) => h.v) },
        ]} yFmt={(v) => v.toFixed(1)} valueSuffix="%" height={210} />
      <div style={{ marginTop: 8 }}><Legend line items={[{ label: "10-Yr UST", color: SERIES[0] }, { label: "SOFR", color: SERIES[1] }]} /></div>
    </Card>
  );
  const HottestMarkets = (
    <Card title="Hottest markets" sub="Trailing 12-month net absorption (MW)">
      <RankBars items={absBars} valueFmt={(v) => v.toFixed(0) + " MW"} color="var(--s3)" />
    </Card>
  );

  return (
    <div className="col" style={{ gap: 16 }}>
      {/* Portfolio hero — or onboarding prompt when empty */}
      {hasProjects ? (
        <div className="grid g-4">
          <div className="card stat" style={{ background: "linear-gradient(160deg, var(--brand-deep-2), var(--surface-card) 70%)" }}>
            <div className="stat-label" style={{ color: "#bfe3d3" }}>Underwriting portfolio value</div>
            <div className="hero-num" style={{ fontSize: 36 }}>{fmtUSD(roll.value, { compact: true })}</div>
            <div className="stat-row">
              <span className="chip" style={{ background: "rgba(23,232,143,0.14)", color: "var(--accent)", border: "none" }}>{roll.count} projects</span>
              <span className="stat-sub">{fmtMW(roll.mw)}</span>
            </div>
          </div>
          <div className="card stat">
            <div className="stat-label">Value created</div>
            <div className="stat-value" style={{ color: gainColor(roll.profit) }}>{fmtUSD(roll.profit, { compact: true })}</div>
            <div className="stat-row"><span className="stat-delta up" style={{ fontSize: 12 }}>▲ {fmtPct(roll.profit / (roll.cost || 1) * 100, 0)} margin</span><span className="stat-sub">development profit</span></div>
          </div>
          <StatTile label="Total development cost" value={fmtUSD(roll.cost, { compact: true })} sub={`avg YoC ${fmtPct(roll.yoc, 2)}`} />
          <StatTile label="Portfolio levered IRR" value={fmtPct(roll.irr, 1)} sub="equity-weighted" delta="+" deltaGood />
        </div>
      ) : (
        <div className="card" style={{ background: "linear-gradient(150deg, var(--brand-deep-2), var(--surface-card) 68%)" }}>
          <div className="card-pad row" style={{ gap: 16, alignItems: "center" }}>
            <div className="brand-mark" style={{ width: 42, height: 42, flex: "none" }}><Icon name="underwrite" size={22} style={{ color: "var(--accent)" }} /></div>
            <div>
              <div style={{ fontWeight: 680, fontSize: 16 }}>Your underwriting portfolio starts at zero</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>Upload your engine's exports in <strong style={{ color: "var(--text-secondary)" }}>Underwriting Reports</strong> to populate this dashboard. The public market intelligence below is live now.</div>
            </div>
          </div>
        </div>
      )}

      {/* Market pulse strip (public) */}
      <Card title="Market pulse" sub="Key capital-markets signals from public sources">
        <div className="grid g-4" style={{ gap: 20 }}>
          {[
            { r: ust10, goodUp: false }, { r: sofr, goodUp: false },
            { r: capStab, goodUp: false }, { r: devSpread, goodUp: true },
          ].map(({ r, goodUp }) => (
            <div key={r.key} className="col" style={{ gap: 2 }}>
              <span className="muted" style={{ fontSize: 12 }}>{r.label}</span>
              <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 700 }}>{r.value}{r.unit === "%" ? "%" : ""}<span style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.unit === "bps" ? " bps" : ""}</span></span>
                <Delta v={r.changeBps} bps goodUp={goodUp} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {hasProjects ? (
        <>
          <div className="grid" style={{ gridTemplateColumns: "1.15fr 1fr" }}>
            <Card title="Portfolio by status" sub="Underwritten value by project phase">
              <Donut data={roll.statusData} centerValue={fmtUSD(roll.value, { compact: true })} centerLabel="value" />
            </Card>
            {RateTrend}
          </div>
          <div className="grid g-2">
            <Card title="Top projects by value created" sub="Development profit ($)">
              <RankBars items={roll.profitBars} valueFmt={(v) => fmtUSD(v, { compact: true })} />
            </Card>
            {HottestMarkets}
          </div>
        </>
      ) : (
        <div className="grid g-2">{RateTrend}{HottestMarkets}</div>
      )}

      {/* Public deal flow */}
      <Card title="Market deal flow" sub="Recent publicly-announced transactions" pad={false}>
        <div className="table-wrap">
          <table className="dt">
            <thead><tr><th>Transaction</th><th>Market</th><th>Type</th><th className="num">Value</th><th className="num">Size</th><th className="num">Cap</th><th className="num">Date</th></tr></thead>
            <tbody>
              {dealFlow.map((x) => (
                <tr key={x.id}>
                  <td className="t-strong">{x.name}</td>
                  <td className="t-mut">{x.market}</td>
                  <td><span className="chip">{x.dealType}</span></td>
                  <td className="num t-strong">{x.value ? fmtUSD(x.value, { compact: true }) : "—"}</td>
                  <td className="num t-mut">{x.sizeMW ? x.sizeMW + " MW" : "—"}</td>
                  <td className="num t-mut">{x.capRate ? x.capRate + "%" : "—"}</td>
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
