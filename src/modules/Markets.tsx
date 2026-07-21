import React, { useMemo } from "react";
import { useStore } from "../lib/store";
import { DataTable, Column, Facet } from "../components/DataTable";
import { Card, StatTile, powerBadge } from "../components/ui";
import { StackedRows, RankBars, Legend, SERIES } from "../components/charts";
import { Icon } from "../components/Icon";
import { fmtUSD, fmtNum, fmtMW } from "../lib/format";
import { exportRows } from "../lib/xlsx";
import type { Market } from "../data/types";

export const Markets: React.FC = () => {
  const { data } = useStore();
  const M = data.markets;

  const totals = useMemo(() => {
    const op = M.reduce((a, m) => a + m.operationalMW, 0);
    const uc = M.reduce((a, m) => a + m.underConstructionMW, 0);
    const pl = M.reduce((a, m) => a + m.plannedMW, 0);
    const vac = M.reduce((a, m) => a + m.vacancyPct, 0) / M.length;
    return { op, uc, pl, vac };
  }, [M]);

  const stackRows = [...M].sort((a, b) => (b.operationalMW + b.underConstructionMW + b.plannedMW) - (a.operationalMW + a.underConstructionMW + a.plannedMW))
    .map((m) => ({ label: m.name, values: { "Operational": m.operationalMW, "Under construction": m.underConstructionMW, "Planned": m.plannedMW } }));

  const rentBars = [...M].sort((a, b) => b.rentPerKwMonth - a.rentPerKwMonth)
    .map((m) => ({ label: m.name, value: m.rentPerKwMonth, sub: "$/kW/mo" }));

  const columns: Column<Market>[] = [
    { key: "name", header: "Market", render: (r) => <span className="t-strong">{r.name}</span>, sortValue: (r) => r.name },
    { key: "tier", header: "Tier", render: (r) => <span className={"badge " + (r.tier === "Primary" ? "badge-accent" : r.tier === "Secondary" ? "badge-neutral" : "badge-warn")}>{r.tier}</span>, sortValue: (r) => r.tier },
    { key: "operationalMW", header: "Operational", align: "right", render: (r) => fmtNum(r.operationalMW) + " MW", sortValue: (r) => r.operationalMW },
    { key: "underConstructionMW", header: "Under Const.", align: "right", render: (r) => fmtNum(r.underConstructionMW) + " MW", sortValue: (r) => r.underConstructionMW },
    { key: "vacancyPct", header: "Vacancy", align: "right", render: (r) => <span style={{ color: r.vacancyPct < 3 ? "var(--up)" : r.vacancyPct > 6 ? "var(--warning)" : undefined }}>{r.vacancyPct}%</span>, sortValue: (r) => r.vacancyPct },
    { key: "absorptionMW", header: "Absorption", align: "right", render: (r) => fmtNum(r.absorptionMW) + " MW", sortValue: (r) => r.absorptionMW },
    { key: "rentPerKwMonth", header: "Rent", align: "right", render: (r) => <span className="t-strong">${r.rentPerKwMonth}<span className="muted" style={{ fontSize: 10.5 }}>/kW</span></span>, sortValue: (r) => r.rentPerKwMonth },
    { key: "rentYoYPct", header: "Rent YoY", align: "right", render: (r) => <span style={{ color: "var(--up)" }}>+{r.rentYoYPct}%</span>, sortValue: (r) => r.rentYoYPct },
    { key: "landPerAcre", header: "Land/acre", align: "right", render: (r) => fmtUSD(r.landPerAcre, { compact: true }), sortValue: (r) => r.landPerAcre },
    { key: "powerAvail", header: "Power", render: (r) => powerBadge(r.powerAvail), sortValue: (r) => ({ Constrained: 0, Tight: 1, Moderate: 2, Ample: 3 }[r.powerAvail]) },
    { key: "powerCostKwh", header: "$/kWh", align: "right", render: (r) => "$" + r.powerCostKwh.toFixed(3), sortValue: (r) => r.powerCostKwh },
    { key: "preleasedPct", header: "Pre-leased", align: "right", render: (r) => r.preleasedPct + "%", sortValue: (r) => r.preleasedPct },
  ];

  const facets: Facet<Market>[] = [
    { key: "tier", label: "Tiers", accessor: (r) => r.tier },
    { key: "region", label: "Regions", accessor: (r) => r.region },
    { key: "powerAvail", label: "Power", accessor: (r) => r.powerAvail },
  ];

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="grid g-4">
        <StatTile label="Operational capacity" value={fmtMW(totals.op)} sub={`${M.length} markets tracked`} />
        <StatTile label="Under construction" value={fmtMW(totals.uc)} sub="near-term supply" delta="+ pipeline" deltaGood />
        <StatTile label="Planned / announced" value={fmtMW(totals.pl)} sub="future supply" />
        <StatTile label="Avg vacancy" value={totals.vac.toFixed(1) + "%"} sub="structurally tight" delta="-0.6 pts" deltaGood />
      </div>

      <Card title="Supply composition by market" sub="Operational, under-construction and planned MW">
        <StackedRows rows={stackRows} segs={[
          { key: "Operational", color: SERIES[0] },
          { key: "Under construction", color: SERIES[3] },
          { key: "Planned", color: "var(--surface-3)" },
        ]} valueFmt={(v) => fmtNum(v) + " MW"} />
        <div style={{ marginTop: 10 }}><Legend items={[
          { label: "Operational", color: SERIES[0] }, { label: "Under construction", color: SERIES[3] }, { label: "Planned", color: "var(--surface-3)" },
        ]} /></div>
      </Card>

      <div className="grid g-2">
        <Card title="Lease rate by market" sub="Asking $/kW/month, critical load">
          <RankBars items={rentBars} valueFmt={(v) => "$" + v} color="var(--s3)" />
        </Card>
        <Card title="Power availability" sub="The binding constraint on new supply">
          <div className="col" style={{ gap: 10 }}>
            {(["Constrained", "Tight", "Moderate", "Ample"] as const).map((p) => {
              const list = M.filter((m) => m.powerAvail === p);
              return (
                <div key={p} className="row" style={{ gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ width: 110 }}>{powerBadge(p)}</div>
                  <div className="wrap" style={{ flex: 1 }}>
                    {list.map((m) => <span key={m.id} className="chip">{m.name}</span>)}
                    {!list.length && <span className="muted" style={{ fontSize: 12 }}>—</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <DataTable<Market>
        rows={M}
        columns={columns}
        facets={facets}
        initialSort={{ key: "operationalMW", dir: "desc" }}
        getSearchText={(r) => `${r.name} ${r.region} ${r.tier} ${r.powerAvail}`}
        searchPlaceholder="Search markets, regions…"
        rightActions={(f) => (<button className="btn btn-sm" onClick={() => exportRows(f as any, "meridian-markets.xlsx", "Markets")}><Icon name="download" size={15} /> Export</button>)}
      />
    </div>
  );
};
