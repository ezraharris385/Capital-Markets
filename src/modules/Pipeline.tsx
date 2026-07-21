import React, { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { DataTable, Column, Facet } from "../components/DataTable";
import { Card, Drawer, stageBadge, SourceBadge } from "../components/ui";
import { Icon } from "../components/Icon";
import { fmtUSD, fmtDate } from "../lib/format";
import { exportRows } from "../lib/xlsx";
import type { Deal, DealStage, DealType, AssetType } from "../data/types";
import { id as genId } from "../lib/format";

const STAGES: DealStage[] = ["Sourcing", "Underwriting", "LOI", "Under Contract", "Closed", "Lost"];
const TYPES: DealType[] = ["Investment Sale", "Lease", "Debt", "Equity", "Development", "Land"];
const ASSETS: AssetType[] = ["Hyperscale", "Powered Shell", "Colocation", "Land", "Enterprise", "Edge", "Portfolio"];

const blank = (): Deal => ({
  id: genId("d"), name: "", market: "", dealType: "Investment Sale", assetType: "Hyperscale",
  stage: "Sourcing", sizeMW: 0, sf: 0, value: 0, capRate: null, probability: 25, broker: "You",
  client: "", counterparty: "", commission: 0, closeDate: new Date().toISOString().slice(0, 10),
  source: "internal", notes: "",
});

export const Pipeline: React.FC = () => {
  const { data, setData, toast } = useStore();
  const [edit, setEdit] = useState<Deal | null>(null);
  const [isNew, setIsNew] = useState(false);

  const active = data.deals.filter((x) => x.stage !== "Closed" && x.stage !== "Lost");
  const summary = useMemo(() => STAGES.map((s) => {
    const list = data.deals.filter((x) => x.stage === s);
    return { stage: s, count: list.length, value: list.reduce((a, x) => a + x.value, 0) };
  }), [data.deals]);

  const columns: Column<Deal>[] = [
    { key: "name", header: "Deal", render: (r) => <span className="t-strong">{r.name}</span>, sortValue: (r) => r.name, width: 260 },
    { key: "market", header: "Market", render: (r) => <span className="t-mut">{r.market}</span>, sortValue: (r) => r.market },
    { key: "dealType", header: "Type", render: (r) => <span className="chip">{r.dealType}</span>, sortValue: (r) => r.dealType },
    { key: "stage", header: "Stage", render: (r) => stageBadge(r.stage), sortValue: (r) => STAGES.indexOf(r.stage) },
    { key: "sizeMW", header: "MW", align: "right", render: (r) => r.sizeMW || "—", sortValue: (r) => r.sizeMW },
    { key: "value", header: "Value", align: "right", render: (r) => <span className="t-strong">{r.value ? fmtUSD(r.value, { compact: true }) : "—"}</span>, sortValue: (r) => r.value },
    { key: "capRate", header: "Cap", align: "right", render: (r) => r.capRate ? r.capRate + "%" : "—", sortValue: (r) => r.capRate ?? 0 },
    { key: "prob", header: "Prob", align: "right", render: (r) => (
      <span className="row" style={{ justifyContent: "flex-end", gap: 7 }}>
        <span className="meter" style={{ width: 42 }}><span style={{ width: r.probability + "%" }} /></span>
        <span className="tnum" style={{ width: 30 }}>{r.probability}%</span>
      </span>
    ), sortValue: (r) => r.probability },
    { key: "commission", header: "Fee", align: "right", render: (r) => r.commission ? fmtUSD(r.commission, { compact: true }) : "—", sortValue: (r) => r.commission },
    { key: "closeDate", header: "Close", align: "right", render: (r) => <span className="t-mut">{new Date(r.closeDate).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}</span>, sortValue: (r) => +new Date(r.closeDate) },
    { key: "source", header: "Source", render: (r) => <SourceBadge source={r.source} flagged={r.flagged} />, sortValue: (r) => r.source },
  ];

  const facets: Facet<Deal>[] = [
    { key: "market", label: "Markets", accessor: (r) => r.market },
    { key: "dealType", label: "Types", accessor: (r) => r.dealType },
    { key: "stage", label: "Stages", accessor: (r) => r.stage },
    { key: "source", label: "Sources", accessor: (r) => r.source },
  ];

  const save = () => {
    if (!edit) return;
    setData((d) => {
      const exists = d.deals.some((x) => x.id === edit.id);
      return { ...d, deals: exists ? d.deals.map((x) => (x.id === edit.id ? edit : x)) : [edit, ...d.deals] };
    });
    toast(isNew ? "Deal added" : "Deal updated");
    setEdit(null);
  };
  const remove = () => {
    if (!edit) return;
    setData((d) => ({ ...d, deals: d.deals.filter((x) => x.id !== edit.id) }));
    toast("Deal removed", "warn");
    setEdit(null);
  };

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="grid g-6">
        {summary.map((s) => (
          <div key={s.stage} className="card" style={{ padding: "13px 15px" }}>
            <div className="row" style={{ marginBottom: 6 }}>{stageBadge(s.stage)}</div>
            <div style={{ fontSize: 19, fontWeight: 700 }}>{fmtUSD(s.value, { compact: true })}</div>
            <div className="muted" style={{ fontSize: 11.5 }}>{s.count} deal{s.count !== 1 ? "s" : ""}</div>
          </div>
        ))}
      </div>

      <DataTable<Deal>
        rows={data.deals}
        columns={columns}
        facets={facets}
        initialSort={{ key: "value", dir: "desc" }}
        getSearchText={(r) => `${r.name} ${r.market} ${r.client} ${r.counterparty} ${r.broker} ${r.dealType} ${r.assetType} ${r.notes}`}
        searchPlaceholder="Search deals, clients, markets…"
        onRowClick={(r) => { setEdit({ ...r }); setIsNew(false); }}
        rightActions={(filtered) => (
          <>
            <button className="btn btn-sm" onClick={() => exportRows(filtered.map(flat), "meridian-pipeline.xlsx", "Pipeline")}>
              <Icon name="download" size={15} /> Export
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => { setEdit(blank()); setIsNew(true); }}>
              <Icon name="plus" size={15} /> Add deal
            </button>
          </>
        )}
      />

      {edit && (
        <Drawer title={isNew ? "New deal" : edit.name || "Edit deal"} onClose={() => setEdit(null)}
          footer={
            <div className="row">
              {!isNew && <button className="btn btn-ghost btn-sm" style={{ color: "var(--down)" }} onClick={remove}>Delete</button>}
              <div className="spacer" />
              <button className="btn btn-sm" onClick={() => setEdit(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={save}>Save deal</button>
            </div>
          }>
          <DealForm deal={edit} onChange={setEdit} markets={data.markets.map((m) => m.name)} />
        </Drawer>
      )}
    </div>
  );
};

function DealForm({ deal, onChange, markets }: { deal: Deal; onChange: (d: Deal) => void; markets: string[] }) {
  const set = (patch: Partial<Deal>) => onChange({ ...deal, ...patch });
  return (
    <div className="col" style={{ gap: 14 }}>
      <label className="field">Deal name<input className="input" value={deal.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Ashburn Powered Shell — Bldg D" /></label>
      <div className="grid g-2" style={{ gap: 12 }}>
        <label className="field">Market
          <input className="input" list="mkts" value={deal.market} onChange={(e) => set({ market: e.target.value })} />
          <datalist id="mkts">{markets.map((m) => <option key={m} value={m} />)}</datalist>
        </label>
        <label className="field">Stage<select className="select" value={deal.stage} onChange={(e) => set({ stage: e.target.value as DealStage })}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="field">Deal type<select className="select" value={deal.dealType} onChange={(e) => set({ dealType: e.target.value as DealType })}>{TYPES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="field">Asset type<select className="select" value={deal.assetType} onChange={(e) => set({ assetType: e.target.value as AssetType })}>{ASSETS.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="field">Size (MW)<input className="input" type="number" value={deal.sizeMW} onChange={(e) => set({ sizeMW: +e.target.value })} /></label>
        <label className="field">Value ($)<input className="input" type="number" value={deal.value} onChange={(e) => set({ value: +e.target.value })} /></label>
        <label className="field">Cap rate (%)<input className="input" type="number" step="0.1" value={deal.capRate ?? ""} onChange={(e) => set({ capRate: e.target.value === "" ? null : +e.target.value })} /></label>
        <label className="field">Probability (%)<input className="input" type="number" value={deal.probability} onChange={(e) => set({ probability: +e.target.value })} /></label>
        <label className="field">Commission ($)<input className="input" type="number" value={deal.commission} onChange={(e) => set({ commission: +e.target.value })} /></label>
        <label className="field">Close date<input className="input" type="date" value={deal.closeDate.slice(0, 10)} onChange={(e) => set({ closeDate: e.target.value })} /></label>
        <label className="field">Client<input className="input" value={deal.client} onChange={(e) => set({ client: e.target.value })} /></label>
        <label className="field">Counterparty<input className="input" value={deal.counterparty} onChange={(e) => set({ counterparty: e.target.value })} /></label>
        <label className="field">Broker<input className="input" value={deal.broker} onChange={(e) => set({ broker: e.target.value })} /></label>
        <label className="field">Source<select className="select" value={deal.source} onChange={(e) => set({ source: e.target.value as any })}><option value="internal">Internal</option><option value="public">Public</option></select></label>
      </div>
      <label className="field">Notes<textarea className="input" rows={3} value={deal.notes} onChange={(e) => set({ notes: e.target.value })} /></label>
      <label className="row" style={{ gap: 8, fontSize: 13 }}>
        <input type="checkbox" checked={!!deal.flagged} onChange={(e) => set({ flagged: e.target.checked })} />
        Flag for redress (verify public-sourced info)
      </label>
    </div>
  );
}

function flat(d: Deal) {
  return {
    Name: d.name, Market: d.market, Type: d.dealType, Asset: d.assetType, Stage: d.stage,
    MW: d.sizeMW, SF: d.sf, Value: d.value, CapRate: d.capRate, Probability: d.probability,
    Commission: d.commission, Client: d.client, Counterparty: d.counterparty, Broker: d.broker,
    CloseDate: d.closeDate, Source: d.source, Notes: d.notes,
  };
}
