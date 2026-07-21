import React, { useMemo } from "react";
import { useStore } from "../lib/store";
import { DataTable, Column, Facet } from "../components/DataTable";
import { Card, StatTile } from "../components/ui";
import { RankBars, Donut, SERIES } from "../components/charts";
import { Icon } from "../components/Icon";
import { exportRows } from "../lib/xlsx";
import type { Firm } from "../data/types";

const TYPE_COLORS: Record<string, string> = {
  Hyperscaler: SERIES[0], "Colo Operator": SERIES[2], Developer: SERIES[3],
  REIT: SERIES[4], Investor: SERIES[6], Lender: SERIES[1], Utility: SERIES[5],
};

export const Firms: React.FC = () => {
  const { data } = useStore();
  const F = data.firms;

  const agg = useMemo(() => {
    const capital = F.reduce((a, f) => a + f.capitalDeployedB, 0);
    const deals = F.reduce((a, f) => a + f.dealsL12M, 0);
    const byType: Record<string, number> = {};
    F.forEach((f) => (byType[f.type] = (byType[f.type] || 0) + 1));
    const donut = Object.entries(byType).map(([k, v]) => ({ label: k, value: v, color: TYPE_COLORS[k] || "var(--surface-3)" }));
    const rank = [...F].sort((a, b) => b.activityScore - a.activityScore).slice(0, 8)
      .map((f) => ({ label: f.name, value: f.activityScore, color: TYPE_COLORS[f.type], sub: "activity score" }));
    return { capital, deals, donut, rank };
  }, [F]);

  const columns: Column<Firm>[] = [
    { key: "name", header: "Firm", render: (r) => <span className="row" style={{ gap: 8 }}><span className="tooltip-dot" style={{ background: TYPE_COLORS[r.type] }} /><span className="t-strong">{r.name}</span>{r.ticker && <span className="chip">{r.ticker}</span>}</span>, sortValue: (r) => r.name },
    { key: "type", header: "Type", render: (r) => <span className="chip">{r.type}</span>, sortValue: (r) => r.type },
    { key: "activityScore", header: "Activity", align: "right", render: (r) => (
      <span className="row" style={{ justifyContent: "flex-end", gap: 7 }}>
        <span className="meter" style={{ width: 54 }}><span style={{ width: r.activityScore + "%", background: TYPE_COLORS[r.type] }} /></span>
        <span className="tnum" style={{ width: 24 }}>{r.activityScore}</span>
      </span>
    ), sortValue: (r) => r.activityScore },
    { key: "dealsL12M", header: "Deals (12mo)", align: "right", render: (r) => r.dealsL12M, sortValue: (r) => r.dealsL12M },
    { key: "capitalDeployedB", header: "Capital", align: "right", render: (r) => <span className="t-strong">${r.capitalDeployedB}B</span>, sortValue: (r) => r.capitalDeployedB },
    { key: "markets", header: "Active markets", render: (r) => <span className="wrap">{r.activeMarkets.slice(0, 3).map((m) => <span key={m} className="chip" style={{ fontSize: 10.5 }}>{m}</span>)}{r.activeMarkets.length > 3 && <span className="muted" style={{ fontSize: 11 }}>+{r.activeMarkets.length - 3}</span>}</span>, sortable: false },
    { key: "note", header: "Signal", render: (r) => <span className="t-mut" style={{ whiteSpace: "normal", display: "block", maxWidth: 320 }}>{r.note}</span>, sortable: false },
  ];

  const facets: Facet<Firm>[] = [{ key: "type", label: "Types", accessor: (r) => r.type }];

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="grid g-4">
        <StatTile label="Firms tracked" value={String(F.length)} sub="across the ecosystem" />
        <StatTile label="Est. capital deployed" value={"$" + agg.capital.toFixed(0) + "B"} sub="trailing 12 months" delta="+18%" deltaGood />
        <StatTile label="Transactions (12mo)" value={String(agg.deals)} sub="tracked deals" delta="+9%" deltaGood />
        <StatTile label="Hyperscaler demand" value="AI-led" sub="structural tailwind" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <Card title="Most active firms" sub="Relative activity score, trailing 12 months">
          <RankBars items={agg.rank} valueFmt={(v) => String(v)} />
        </Card>
        <Card title="Ecosystem composition" sub="Firms by type">
          <Donut data={agg.donut} centerValue={String(F.length)} centerLabel="firms" size={168} />
        </Card>
      </div>

      <DataTable<Firm>
        rows={F}
        columns={columns}
        facets={facets}
        initialSort={{ key: "activityScore", dir: "desc" }}
        getSearchText={(r) => `${r.name} ${r.type} ${r.ticker || ""} ${r.activeMarkets.join(" ")} ${r.note}`}
        searchPlaceholder="Search firms, tickers, markets…"
        rightActions={(f) => (<button className="btn btn-sm" onClick={() => exportRows(f.map((x) => ({ Firm: x.name, Type: x.type, Ticker: x.ticker, HQ: x.hqMarket, ActivityScore: x.activityScore, Deals12M: x.dealsL12M, CapitalB: x.capitalDeployedB, Markets: x.activeMarkets.join("; "), Note: x.note })), "meridian-firms.xlsx", "Firms")}><Icon name="download" size={15} /> Export</button>)}
      />
    </div>
  );
};
