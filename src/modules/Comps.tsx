import React, { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { DataTable, Column, Facet } from "../components/DataTable";
import { Card, StatTile, Segmented, Modal, SourceBadge } from "../components/ui";
import { Icon } from "../components/Icon";
import { fmtUSD, fmtNum } from "../lib/format";
import { exportRows } from "../lib/xlsx";
import type { Comp, CompType } from "../data/types";

export const Comps: React.FC = () => {
  const { data, setData, toast } = useStore();
  const [view, setView] = useState<"All" | CompType>("All");
  const [showRedress, setShowRedress] = useState(false);

  const rows = data.comps.filter((c) => view === "All" || c.type === view);
  const flagged = data.comps.filter((c) => c.flagged);

  const stats = useMemo(() => {
    const sales = data.comps.filter((c) => c.type === "Sale" && c.pricePerKw);
    const perKw = sales.map((c) => c.pricePerKw!).sort((a, b) => a - b);
    const medKw = perKw.length ? perKw[Math.floor(perKw.length / 2)] : 0;
    const caps = data.comps.filter((c) => c.capRate).map((c) => c.capRate!);
    const avgCap = caps.reduce((a, b) => a + b, 0) / (caps.length || 1);
    const leases = data.comps.filter((c) => c.type === "Lease" && c.rentPerKwMonth);
    const avgRent = leases.reduce((a, c) => a + c.rentPerKwMonth!, 0) / (leases.length || 1);
    const pub = data.comps.filter((c) => c.source === "public").length;
    return { medKw, avgCap, avgRent, pub, total: data.comps.length };
  }, [data.comps]);

  const columns: Column<Comp>[] = [
    { key: "type", header: "Type", render: (r) => <span className={"badge " + (r.type === "Sale" ? "badge-accent" : "badge-neutral")}>{r.type}</span>, sortValue: (r) => r.type },
    { key: "market", header: "Market", render: (r) => <span className="t-strong">{r.market}</span>, sortValue: (r) => r.market },
    { key: "assetType", header: "Asset", render: (r) => <span className="chip">{r.assetType}</span>, sortValue: (r) => r.assetType },
    { key: "date", header: "Date", render: (r) => <span className="t-mut">{new Date(r.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}</span>, sortValue: (r) => +new Date(r.date) },
    { key: "sizeMW", header: "MW", align: "right", render: (r) => r.sizeMW || "—", sortValue: (r) => r.sizeMW },
    { key: "price", header: "Price", align: "right", render: (r) => r.price ? fmtUSD(r.price, { compact: true }) : "—", sortValue: (r) => r.price ?? 0 },
    { key: "pricePerKw", header: "$/kW", align: "right", render: (r) => r.pricePerKw ? "$" + fmtNum(r.pricePerKw) : "—", sortValue: (r) => r.pricePerKw ?? 0 },
    { key: "rent", header: "$/kW/mo", align: "right", render: (r) => r.rentPerKwMonth ? "$" + r.rentPerKwMonth : "—", sortValue: (r) => r.rentPerKwMonth ?? 0 },
    { key: "capRate", header: "Cap", align: "right", render: (r) => r.capRate ? r.capRate + "%" : "—", sortValue: (r) => r.capRate ?? 0 },
    { key: "parties", header: "Parties", render: (r) => <span className="t-mut">{r.partyA} <span className="muted">←</span> {r.partyB}</span>, sortValue: (r) => r.partyA },
    { key: "source", header: "Source", render: (r) => (
      <span className="row" style={{ gap: 6 }}>
        <SourceBadge source={r.source} flagged={r.flagged} />
        {r.source === "public" && (
          <button className="btn btn-ghost btn-sm" style={{ padding: 3 }} title={r.flagged ? "Unflag" : "Flag for redress"}
            onClick={(e) => { e.stopPropagation(); toggleFlag(r.id); }}>
            <Icon name="redress" size={14} style={{ color: r.flagged ? "var(--warning)" : "var(--text-muted)" }} />
          </button>
        )}
      </span>
    ), sortValue: (r) => (r.flagged ? 0 : 1) },
  ];

  const facets: Facet<Comp>[] = [
    { key: "market", label: "Markets", accessor: (r) => r.market },
    { key: "assetType", label: "Assets", accessor: (r) => r.assetType },
    { key: "source", label: "Sources", accessor: (r) => r.source },
  ];

  const toggleFlag = (id: string) => setData((d) => ({ ...d, comps: d.comps.map((c) => c.id === id ? { ...c, flagged: !c.flagged } : c) }));
  const verify = (id: string) => { setData((d) => ({ ...d, comps: d.comps.map((c) => c.id === id ? { ...c, flagged: false, verified: true } : c) })); toast("Comp verified"); };
  const dismiss = (id: string) => { setData((d) => ({ ...d, comps: d.comps.filter((c) => c.id !== id) })); toast("Comp removed", "warn"); };

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="grid g-4">
        <StatTile label="Median sale price" value={"$" + fmtNum(stats.medKw) + "/kW"} sub="across sale comps" />
        <StatTile label="Avg cap rate" value={stats.avgCap.toFixed(2) + "%"} sub="verified transactions" />
        <StatTile label="Avg lease rate" value={"$" + stats.avgRent.toFixed(0) + "/kW/mo"} sub="lease comps" />
        <StatTile label="Public-sourced" value={`${stats.pub} / ${stats.total}`} sub="need periodic redress" />
      </div>

      {flagged.length > 0 && (
        <div className="card" style={{ borderColor: "color-mix(in srgb, var(--warning) 40%, var(--border))", background: "color-mix(in srgb, var(--warning) 7%, var(--surface-card))" }}>
          <div className="card-pad row" style={{ gap: 12 }}>
            <Icon name="redress" size={20} style={{ color: "var(--warning)" }} />
            <div>
              <div style={{ fontWeight: 640 }}>{flagged.length} public comp{flagged.length !== 1 ? "s" : ""} flagged for redress</div>
              <div className="muted" style={{ fontSize: 12.5 }}>Verify against the public source before using in a broker opinion of value.</div>
            </div>
            <div className="spacer" />
            <button className="btn btn-primary btn-sm" onClick={() => setShowRedress(true)}>Review queue</button>
          </div>
        </div>
      )}

      <div className="row"><Segmented options={[{ value: "All", label: "All" }, { value: "Sale", label: "Sales" }, { value: "Lease", label: "Leases" }]} value={view} onChange={setView} /></div>

      <DataTable<Comp>
        rows={rows}
        columns={columns}
        facets={facets}
        initialSort={{ key: "date", dir: "desc" }}
        getSearchText={(r) => `${r.market} ${r.assetType} ${r.partyA} ${r.partyB} ${r.citation} ${r.type}`}
        searchPlaceholder="Search comps, parties, markets…"
        rightActions={(f) => (
          <button className="btn btn-sm" onClick={() => exportRows(f.map(flat), "meridian-comps.xlsx", "Comps")}><Icon name="download" size={15} /> Export</button>
        )}
      />

      {showRedress && (
        <Modal title="Redress queue — verify public comps" onClose={() => setShowRedress(false)} wide>
          <div className="col" style={{ gap: 10 }}>
            {flagged.length === 0 && <div className="muted">Nothing to review. 🎉</div>}
            {flagged.map((c) => (
              <div key={c.id} className="card card-pad row" style={{ gap: 14 }}>
                <div className="col" style={{ gap: 3 }}>
                  <div style={{ fontWeight: 620 }}>{c.market} · {c.assetType} · {c.type}</div>
                  <div className="muted" style={{ fontSize: 12.5 }}>
                    {c.type === "Sale" ? `${fmtUSD(c.price || 0, { compact: true })} · $${fmtNum(c.pricePerKw || 0)}/kW · cap ${c.capRate ?? "n/a"}%` : `$${c.rentPerKwMonth}/kW/mo`}
                    {"  ·  "}Source: {c.citation}
                  </div>
                </div>
                <div className="spacer" />
                <button className="btn btn-sm" onClick={() => dismiss(c.id)}>Remove</button>
                <button className="btn btn-primary btn-sm" onClick={() => verify(c.id)}>Verify</button>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
};

function flat(c: Comp) {
  return {
    Type: c.type, Market: c.market, Asset: c.assetType, Date: c.date, MW: c.sizeMW, SF: c.sf,
    Price: c.price, PricePerKw: c.pricePerKw, RentPerKwMonth: c.rentPerKwMonth, CapRate: c.capRate,
    Buyer_Tenant: c.partyA, Seller_Landlord: c.partyB, Source: c.source, Citation: c.citation, Verified: c.verified,
  };
}
