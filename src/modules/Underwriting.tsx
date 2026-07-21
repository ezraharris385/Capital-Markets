import React, { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { Card, Delta } from "../components/ui";
import { ColumnChart } from "../components/charts";
import { Icon } from "../components/Icon";
import { fmtUSD, fmtPct, compactNum } from "../lib/format";
import { exportWorkbook } from "../lib/xlsx";
import { underwrite, sensitivity, defaultInputs, NET_RENT_FACTOR, UWInputs } from "../lib/underwriting";

export const Underwriting: React.FC = () => {
  const { data, toast } = useStore();
  const costPerMW = useMemo(() => data.costs.reduce((a, c) => a + c.costPerMW, 0), [data.costs]);
  const [inp, setInp] = useState<UWInputs>({ ...defaultInputs, devCostPerMW: costPerMW });

  const out = useMemo(() => underwrite(inp), [inp]);
  const grid = useMemo(() => sensitivity(inp, [-0.5, -0.25, 0, 0.25, 0.5], [-15, -7.5, 0, 7.5, 15]), [inp]);

  const set = (patch: Partial<UWInputs>) => setInp((p) => ({ ...p, ...patch }));

  const loadDeal = (dealId: string) => {
    const d = data.deals.find((x) => x.id === dealId);
    if (!d || !d.sizeMW) return;
    const mkt = data.markets.find((m) => m.name === d.market);
    set({
      sizeMW: d.sizeMW,
      devCostPerMW: d.value && d.assetType !== "Land" ? Math.round(d.value / d.sizeMW) : costPerMW,
      leaseRateKwMonth: mkt ? Math.round(mkt.rentPerKwMonth * NET_RENT_FACTOR) : inp.leaseRateKwMonth,
      stabilizedCapRate: d.capRate ?? inp.stabilizedCapRate,
      exitCapRate: (d.capRate ?? inp.stabilizedCapRate) + 0.25,
    });
    toast(`Loaded ${d.name}`);
  };

  const irrs = grid.flat().map((c) => c.irr);
  const minIrr = Math.min(...irrs), maxIrr = Math.max(...irrs);
  const heat = (v: number) => {
    const t = maxIrr === minIrr ? 0.5 : (v - minIrr) / (maxIrr - minIrr);
    // low → muted red, high → accent green
    const g = Math.round(60 + t * 140);
    return `rgba(${Math.round(200 - t * 170)}, ${g}, ${Math.round(90 + t * 60)}, ${0.14 + t * 0.30})`;
  };

  const exportUW = () => {
    exportWorkbook([
      { name: "Inputs", rows: Object.entries(inp).map(([k, v]) => ({ Input: k, Value: v })) },
      { name: "Outputs", rows: [
        { Metric: "Total dev cost", Value: out.totalCost },
        { Metric: "Stabilized NOI", Value: out.stabilizedNOI },
        { Metric: "Yield on cost %", Value: out.yieldOnCost },
        { Metric: "Stabilized value", Value: out.stabilizedValue },
        { Metric: "Development profit", Value: out.developmentProfit },
        { Metric: "Development margin %", Value: out.developmentMargin },
        { Metric: "Dev spread bps", Value: out.developmentSpreadBps },
        { Metric: "Loan amount", Value: out.loanAmount },
        { Metric: "Equity", Value: out.equity },
        { Metric: "DSCR", Value: out.dscr },
        { Metric: "Debt yield %", Value: out.debtYield },
        { Metric: "Exit value", Value: out.exitValue },
        { Metric: "Levered IRR %", Value: out.leveredIRR },
        { Metric: "Unlevered IRR %", Value: out.unleveredIRR },
        { Metric: "Equity multiple", Value: out.equityMultiple },
      ] },
      { name: "CashFlows", rows: out.cashFlows.map((v, i) => ({ Year: i, EquityCashFlow: Math.round(v) })) },
    ], "meridian-underwriting.xlsx");
    toast("Underwriting exported to XLSX");
  };

  const nInput = (label: string, key: keyof UWInputs, step = 1, suffix = "", fmt?: (v: number) => string) => (
    <label className="field">{label}
      <div className="row" style={{ gap: 6 }}>
        <input className="input" type="number" step={step} value={inp[key] as number}
          onChange={(e) => set({ [key]: +e.target.value } as any)} />
        {suffix && <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{suffix}</span>}
      </div>
    </label>
  );

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="grid" style={{ gridTemplateColumns: "340px 1fr", alignItems: "start" }}>
        {/* Inputs */}
        <Card title="Assumptions" sub="Deterministic — every output is derived live"
          actions={<select className="select" style={{ width: "auto", maxWidth: 150 }} defaultValue="" onChange={(e) => e.target.value && loadDeal(e.target.value)}>
            <option value="">Load deal…</option>
            {data.deals.filter((d) => d.sizeMW > 0).map((d) => <option key={d.id} value={d.id}>{d.name.slice(0, 28)}</option>)}
          </select>}>
          <div className="col" style={{ gap: 12 }}>
            <div className="section-title">Scope & cost</div>
            {nInput("Critical IT load", "sizeMW", 1, "MW")}
            {nInput("Dev cost per MW", "devCostPerMW", 100000, "$/MW")}
            <button className="btn btn-sm" onClick={() => set({ devCostPerMW: costPerMW })}><Icon name="refresh" size={14} /> Reset $/MW from cost stack</button>
            <div className="section-title" style={{ marginTop: 4 }}>Revenue</div>
            {nInput("Net lease rate", "leaseRateKwMonth", 1, "$/kW/mo net")}
            {nInput("Opex (% of revenue)", "opexPctRevenue", 0.5, "%")}
            {nInput("Rent escalator", "rentEscalatorPct", 0.1, "%/yr")}
            <div className="section-title" style={{ marginTop: 4 }}>Valuation & exit</div>
            {nInput("Stabilized cap rate", "stabilizedCapRate", 0.05, "%")}
            {nInput("Exit cap rate", "exitCapRate", 0.05, "%")}
            {nInput("Hold period", "holdYears", 1, "yrs")}
            {nInput("Sale cost", "saleCostPct", 0.1, "%")}
            <div className="section-title" style={{ marginTop: 4 }}>Debt</div>
            {nInput("Loan-to-cost", "ltcPct", 1, "%")}
            {nInput("Interest rate", "interestRatePct", 0.1, "%")}
          </div>
        </Card>

        {/* Outputs */}
        <div className="col" style={{ gap: 16 }}>
          <div className="grid g-4">
            <ResultTile label="Total dev cost" value={fmtUSD(out.totalCost, { compact: true })} sub={`${inp.sizeMW} MW`} />
            <ResultTile label="Stabilized NOI" value={fmtUSD(out.stabilizedNOI, { compact: true })} sub="annual" />
            <ResultTile label="Yield on cost" value={fmtPct(out.yieldOnCost, 2)} sub="untrended" accent />
            <ResultTile label="Dev spread" value={Math.round(out.developmentSpreadBps) + " bps"} sub="YoC − stabilized cap" accent={out.developmentSpreadBps > 150} />
          </div>
          <div className="grid g-4">
            <ResultTile label="Stabilized value" value={fmtUSD(out.stabilizedValue, { compact: true })} sub={`@ ${inp.stabilizedCapRate}% cap`} />
            <ResultTile label="Development profit" value={fmtUSD(out.developmentProfit, { compact: true })} sub={fmtPct(out.developmentMargin, 0) + " margin"} good={out.developmentProfit > 0} />
            <ResultTile label="Levered IRR" value={out.leveredIRR != null ? fmtPct(out.leveredIRR, 1) : "—"} sub={`${inp.holdYears}-yr hold`} accent />
            <ResultTile label="Equity multiple" value={out.equityMultiple.toFixed(2) + "x"} sub={`unlev. IRR ${out.unleveredIRR?.toFixed(1)}%`} />
          </div>
          <div className="grid g-4">
            <ResultTile label="Equity required" value={fmtUSD(out.equity, { compact: true })} sub={`${100 - inp.ltcPct}% of cost`} />
            <ResultTile label="Loan amount" value={fmtUSD(out.loanAmount, { compact: true })} sub={`${inp.ltcPct}% LTC`} />
            <ResultTile label="DSCR" value={out.dscr.toFixed(2) + "x"} sub="interest-only" good={out.dscr >= 1.35} />
            <ResultTile label="Debt yield" value={fmtPct(out.debtYield, 1)} sub="NOI / loan" good={out.debtYield >= 8.5} />
          </div>

          <Card title="Equity cash flows" sub="Levered distributions by hold year (Year 0 = equity outlay)"
            actions={<button className="btn btn-sm" onClick={exportUW}><Icon name="download" size={15} /> Export model</button>}>
            <ColumnChart labels={out.cashFlows.map((_, i) => "Y" + i)} values={out.cashFlows.map((v) => v)}
              barColors={out.cashFlows.map((v) => v < 0 ? "var(--s8)" : "var(--accent)")}
              valueFmt={(v) => (v < 0 ? "-$" : "$") + compactNum(Math.abs(v), 0)} height={220} />
          </Card>
        </div>
      </div>

      {/* Sensitivity */}
      <Card title="Sensitivity — levered IRR" sub="Rows: exit cap rate · Columns: lease rate ($/kW/mo). Center cell = base case.">
        <div className="table-wrap">
          <table className="dt" style={{ textAlign: "center" }}>
            <thead>
              <tr>
                <th className="no-sort" style={{ textAlign: "left" }}>Exit cap ＼ Rent</th>
                {grid[0].map((c, j) => <th key={j} className="num no-sort">${c.rent.toFixed(0)}</th>)}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, i) => (
                <tr key={i}>
                  <td className="t-strong">{row[0].cap.toFixed(2)}%</td>
                  {row.map((c, j) => (
                    <td key={j} className="num tnum" style={{ background: heat(c.irr), fontWeight: c.cap === inp.exitCapRate && c.rent === inp.leaseRateKwMonth ? 700 : 500, outline: c.cap === inp.exitCapRate && c.rent === inp.leaseRateKwMonth ? "1.5px solid var(--accent)" : undefined }}>
                      {c.irr.toFixed(1)}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

function ResultTile({ label, value, sub, accent, good }: { label: string; value: string; sub?: string; accent?: boolean; good?: boolean }) {
  return (
    <div className="card stat" style={accent ? { border: "1px solid var(--accent-dim)", background: "color-mix(in srgb, var(--accent) 6%, var(--surface-card))" } : undefined}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ fontSize: 23, color: accent ? "var(--accent)" : good === true ? "var(--up)" : good === false ? "var(--down)" : undefined }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
