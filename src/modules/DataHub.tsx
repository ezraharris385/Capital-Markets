import React, { useRef, useState } from "react";
import { useStore } from "../lib/store";
import { Card, StatTile, Modal } from "../components/ui";
import { Icon } from "../components/Icon";
import { importFile, exportRows, exportWorkbook, downloadTemplate } from "../lib/xlsx";
import { id as genId, fmtDate } from "../lib/format";
import type { AppData, Deal, Comp } from "../data/types";
import { PROJECT_HEADERS, PROJECT_EXAMPLE, rowToProject, projectToRow, upsertProjects } from "../lib/projects";

type Target = "projects" | "deals" | "comps" | "markets" | "firms";

const TEMPLATES: Record<Target, { headers: string[]; example: Record<string, any> }> = {
  projects: { headers: PROJECT_HEADERS, example: PROJECT_EXAMPLE },
  deals: {
    headers: ["Name", "Market", "Type", "Asset", "Stage", "MW", "Value", "CapRate", "Probability", "Commission", "Client", "Counterparty", "Broker", "CloseDate", "Source", "Notes"],
    example: { Name: "Example — NoVA Powered Shell", Market: "Northern Virginia", Type: "Investment Sale", Asset: "Powered Shell", Stage: "LOI", MW: 48, Value: 360000000, CapRate: 6.2, Probability: 60, Commission: 2000000, Client: "Acme Capital", Counterparty: "Dev Co", Broker: "You", CloseDate: "2026-12-01", Source: "internal", Notes: "" },
  },
  comps: {
    headers: ["Type", "Market", "Asset", "Date", "MW", "Price", "PricePerKw", "RentPerKwMonth", "CapRate", "Buyer_Tenant", "Seller_Landlord", "Source", "Citation"],
    example: { Type: "Sale", Market: "Phoenix", Asset: "Colocation", Date: "2026-05-01", MW: 32, Price: 240000000, PricePerKw: 7500, RentPerKwMonth: "", CapRate: 6.5, Buyer_Tenant: "Buyer", Seller_Landlord: "Seller", Source: "public", Citation: "Press release" },
  },
  markets: {
    headers: ["Name", "Region", "Tier", "OperationalMW", "UnderConstructionMW", "PlannedMW", "VacancyPct", "AbsorptionMW", "RentPerKwMonth", "RentYoYPct", "LandPerAcre", "PowerAvail", "PowerCostKwh", "PreleasedPct"],
    example: { Name: "Example Market", Region: "Region", Tier: "Emerging", OperationalMW: 200, UnderConstructionMW: 100, PlannedMW: 300, VacancyPct: 5, AbsorptionMW: 60, RentPerKwMonth: 120, RentYoYPct: 7, LandPerAcre: 400000, PowerAvail: "Moderate", PowerCostKwh: 0.07, PreleasedPct: 60 },
  },
  firms: {
    headers: ["Firm", "Type", "Ticker", "HQ", "ActivityScore", "Deals12M", "CapitalB", "Markets", "Note"],
    example: { Firm: "Example Fund", Type: "Investor", Ticker: "", HQ: "New York", ActivityScore: 70, Deals12M: 12, CapitalB: 5, Markets: "Phoenix; Atlanta", Note: "Active core-plus buyer" },
  },
};

const num = (v: any) => { const n = parseFloat(String(v ?? "").replace(/[$,%]/g, "")); return isNaN(n) ? 0 : n; };
const numN = (v: any) => { const s = String(v ?? "").trim(); if (!s) return null; const n = parseFloat(s.replace(/[$,%]/g, "")); return isNaN(n) ? null : n; };

export const DataHub: React.FC = () => {
  const { data, setData, resetData, loadDemo, toast } = useStore();
  const [target, setTarget] = useState<Target>("deals");
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const counts = {
    projects: data.projects.length, deals: data.deals.length, comps: data.comps.length,
    markets: data.markets.length, firms: data.firms.length,
    public: data.deals.filter((d) => d.source === "public").length + data.comps.filter((c) => c.source === "public").length,
    flagged: data.deals.filter((d) => d.flagged).length + data.comps.filter((c) => c.flagged).length,
  };

  const onFile = async (f: File) => {
    try {
      const rows = await importFile(f);
      if (!rows.length) { toast("No rows found in file", "warn"); return; }
      setData((d) => applyImport(d, target, rows));
      toast(`Imported ${rows.length} ${target} record${rows.length !== 1 ? "s" : ""}`);
    } catch (e: any) {
      toast("Import failed: " + (e.message || "bad file"), "err");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const exportAll = () => {
    exportWorkbook([
      { name: "Projects", rows: data.projects.map(projectToRow) },
      { name: "DealFlow", rows: data.deals.map(dealFlat) },
      { name: "Comps", rows: data.comps.map(compFlat) },
      { name: "Markets", rows: data.markets as any },
      { name: "Firms", rows: data.firms.map((f) => ({ ...f, activeMarkets: f.activeMarkets.join("; ") })) },
      { name: "Rates", rows: data.rates.map((r) => ({ Metric: r.label, Value: r.value, Unit: r.unit, ChangeBps: r.changeBps, Category: r.category })) },
      { name: "Costs", rows: data.costs },
      { name: "Inflation", rows: data.inflation.map((i) => ({ Index: i.label, Latest: i.latest, Unit: i.unit, YoY: i.yoyPct, Category: i.category })) },
    ], "meridian-full-export.xlsx");
    toast("Full workbook exported");
  };

  // Editable "data pack": current data in the exact template layout, one sheet
  // per dataset. Edit any sheet, re-upload it to the matching target to update.
  const exportDataPack = () => {
    exportWorkbook([
      { name: "Projects", rows: data.projects.length ? data.projects.map(projectToRow) : [PROJECT_EXAMPLE] },
      { name: "DealFlow", rows: data.deals.map(dealFlat) },
      { name: "Comps", rows: data.comps.map(compFlat) },
      { name: "Markets", rows: data.markets as any },
      { name: "Firms", rows: data.firms.map((f) => ({ ...f, activeMarkets: f.activeMarkets.join("; ") })) },
    ], "meridian-data-pack.xlsx");
    toast("Editable data pack exported");
  };

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="grid g-6">
        <StatTile label="Projects" value={String(counts.projects)} />
        <StatTile label="Deal flow" value={String(counts.deals)} />
        <StatTile label="Comps" value={String(counts.comps)} />
        <StatTile label="Markets" value={String(counts.markets)} />
        <StatTile label="Firms" value={String(counts.firms)} />
        <StatTile label="Flagged (redress)" value={String(counts.flagged)} />
      </div>

      <div className="grid g-2">
        <Card title="Import from Excel" sub="Upload a file that matches a template. Re-uploading updates existing rows in place.">
          <div className="col" style={{ gap: 14 }}>
            <label className="field">Target dataset
              <select className="select" value={target} onChange={(e) => setTarget(e.target.value as Target)}>
                <option value="projects">Underwriting projects</option>
                <option value="deals">Deal flow / CRM</option>
                <option value="comps">Comparables</option>
                <option value="markets">Markets</option>
                <option value="firms">Firms</option>
              </select>
            </label>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn btn-primary" onClick={() => fileRef.current?.click()}><Icon name="upload" size={16} /> Choose file</button>
              <button className="btn" onClick={() => downloadTemplate(TEMPLATES[target].headers, TEMPLATES[target].example, `meridian-${target}-template.xlsx`)}><Icon name="download" size={15} /> Download template</button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            </div>
            <div className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
              <Icon name="info" size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
              These are the standard files that keep the dashboard updated. Edit one in Excel and re-upload — rows are matched by their key ({target === "projects" ? "Ref" : target === "deals" ? "Name" : "Name"}) and <strong>updated in place</strong>, new rows added. Numbers can include $ , % — they're cleaned automatically. Underwriting projects with blank output columns are computed by the built-in engine.
            </div>
          </div>
        </Card>

        <Card title="Export & standard files" sub="Your editable data pack keeps everything in sync — export, edit, re-upload.">
          <div className="wrap" style={{ gap: 10 }}>
            <button className="btn btn-primary" onClick={exportDataPack}><Icon name="layers" size={15} /> Editable data pack</button>
            <button className="btn" onClick={() => exportRows(data.projects.map(projectToRow), "meridian-projects.xlsx", "Projects")}><Icon name="download" size={15} /> Projects</button>
            <button className="btn" onClick={() => exportRows(data.deals.map(dealFlat), "meridian-dealflow.xlsx", "DealFlow")}><Icon name="download" size={15} /> Deal flow</button>
            <button className="btn" onClick={() => exportRows(data.comps.map(compFlat), "meridian-comps.xlsx", "Comps")}><Icon name="download" size={15} /> Comps</button>
            <button className="btn" onClick={() => exportRows(data.markets as any, "meridian-markets.xlsx", "Markets")}><Icon name="download" size={15} /> Markets</button>
            <button className="btn" onClick={() => exportRows(data.firms.map((f) => ({ ...f, activeMarkets: f.activeMarkets.join("; ") })) as any, "meridian-firms.xlsx", "Firms")}><Icon name="download" size={15} /> Firms</button>
            <button className="btn" onClick={exportAll}><Icon name="download" size={15} /> Full snapshot</button>
          </div>
          <div className="hr" style={{ margin: "16px 0" }} />
          <div className="kv">
            <span className="k">Storage</span><span className="v" style={{ fontWeight: 500 }}>Local-first (this browser)</span>
            <span className="k">Last public refresh</span><span className="v" style={{ fontWeight: 500 }}>{data.meta.lastRefresh ? fmtDate(data.meta.lastRefresh) : "—"}</span>
          </div>
        </Card>
      </div>

      <Card title="Redress center" sub="Records sourced from public information that should be verified before use">
        <RedressList />
      </Card>

      <Card title="Data controls" sub="Local-first: your data lives in this browser and never leaves it unless you export or connect a key.">
        <div className="col" style={{ gap: 14 }}>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-primary" onClick={() => { loadDemo(); toast("Demo portfolio loaded"); }}><Icon name="spark" size={15} /> Load demo data</button>
            <span className="muted" style={{ fontSize: 12.5 }}>Fills the underwriting portfolio and deal flow with realistic fake records — perfect for showing it off. Public market data is already populated.</span>
          </div>
          <div className="hr" />
          <div className="row" style={{ gap: 10 }}>
            <button className="btn" style={{ color: "var(--down)" }} onClick={() => setConfirmReset(true)}><Icon name="refresh" size={15} /> Clear to empty</button>
            <span className="muted" style={{ fontSize: 12.5 }}>Removes all your project & uploaded data, keeping only the public market intelligence. Export first to keep your edits.</span>
          </div>
        </div>
      </Card>

      {confirmReset && (
        <Modal title="Clear to empty?" onClose={() => setConfirmReset(false)}>
          <p className="muted" style={{ fontSize: 13.5 }}>This removes all your projects and uploaded records, keeping only the publicly-sourced market intelligence. This cannot be undone.</p>
          <div className="row" style={{ justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <button className="btn btn-sm" onClick={() => setConfirmReset(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" style={{ background: "var(--critical)", color: "#fff" }} onClick={() => { resetData(); setConfirmReset(false); toast("Cleared to empty", "warn"); }}>Clear</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

function RedressList() {
  const { data, setData, toast } = useStore();
  const flaggedComps = data.comps.filter((c) => c.flagged);
  const flaggedDeals = data.deals.filter((d) => d.flagged);
  if (!flaggedComps.length && !flaggedDeals.length)
    return <div className="row" style={{ gap: 8, color: "var(--text-muted)", fontSize: 13 }}><Icon name="check" size={16} style={{ color: "var(--up)" }} /> Nothing flagged — all public records reviewed.</div>;
  return (
    <div className="col" style={{ gap: 8 }}>
      {flaggedComps.map((c) => (
        <div key={c.id} className="row" style={{ gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
          <Icon name="redress" size={16} style={{ color: "var(--warning)" }} />
          <span style={{ fontSize: 13 }}><strong>Comp</strong> · {c.market} · {c.type} · {c.citation}</span>
          <div className="spacer" />
          <button className="btn btn-sm" onClick={() => { setData((d) => ({ ...d, comps: d.comps.map((x) => x.id === c.id ? { ...x, flagged: false, verified: true } : x) })); toast("Verified"); }}>Verify</button>
        </div>
      ))}
      {flaggedDeals.map((c) => (
        <div key={c.id} className="row" style={{ gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
          <Icon name="redress" size={16} style={{ color: "var(--warning)" }} />
          <span style={{ fontSize: 13 }}><strong>Deal</strong> · {c.name}</span>
          <div className="spacer" />
          <button className="btn btn-sm" onClick={() => { setData((d) => ({ ...d, deals: d.deals.map((x) => x.id === c.id ? { ...x, flagged: false } : x) })); toast("Cleared"); }}>Clear</button>
        </div>
      ))}
    </div>
  );
}

// ---- import mappers ----
// Upsert by a case-insensitive key; matching rows update in place, new rows prepend.
function upsertBy<T extends { id: string }>(existing: T[], incoming: T[], keyOf: (x: T) => string): T[] {
  const out = [...existing];
  for (const item of incoming) {
    const k = keyOf(item).toLowerCase();
    const idx = k ? out.findIndex((x) => keyOf(x).toLowerCase() === k) : -1;
    if (idx >= 0) out[idx] = { ...item, id: out[idx].id };
    else out.unshift(item);
  }
  return out;
}

function applyImport(d: AppData, target: Target, rows: Record<string, any>[]): AppData {
  if (target === "projects") {
    const mapped = rows.filter((r) => r.Name || r.Ref).map(rowToProject);
    return { ...d, projects: upsertProjects(d.projects, mapped) };
  }
  if (target === "deals") {
    const mapped: Deal[] = rows.map((r) => ({
      id: genId("d"), name: str(r.Name || r.name), market: str(r.Market), dealType: (str(r.Type) || "Investment Sale") as any,
      assetType: (str(r.Asset) || "Hyperscale") as any, stage: (str(r.Stage) || "Sourcing") as any, sizeMW: num(r.MW),
      sf: num(r.SF), value: num(r.Value), capRate: numN(r.CapRate), probability: num(r.Probability) || 25,
      broker: str(r.Broker) || "You", client: str(r.Client), counterparty: str(r.Counterparty), commission: num(r.Commission),
      closeDate: str(r.CloseDate) || new Date().toISOString().slice(0, 10), source: (str(r.Source) || "internal") as any, notes: str(r.Notes),
    }));
    return { ...d, deals: upsertBy(d.deals, mapped, (x) => x.name) };
  }
  if (target === "comps") {
    const mapped: Comp[] = rows.map((r) => ({
      id: genId("c"), type: (str(r.Type) || "Sale") as any, market: str(r.Market), assetType: (str(r.Asset) || "Hyperscale") as any,
      date: str(r.Date) || new Date().toISOString().slice(0, 10), sizeMW: num(r.MW), sf: num(r.SF), price: numN(r.Price),
      pricePerKw: numN(r.PricePerKw), capRate: numN(r.CapRate), rentPerKwMonth: numN(r.RentPerKwMonth),
      partyA: str(r.Buyer_Tenant), partyB: str(r.Seller_Landlord), source: (str(r.Source) || "public") as any,
      citation: str(r.Citation), verified: false, flagged: str(r.Source) === "public",
    }));
    return { ...d, comps: [...mapped, ...d.comps] };
  }
  if (target === "markets") {
    const mapped = rows.map((r) => ({
      id: genId("mkt"), name: str(r.Name), region: str(r.Region), tier: (str(r.Tier) || "Emerging") as any,
      operationalMW: num(r.OperationalMW), underConstructionMW: num(r.UnderConstructionMW), plannedMW: num(r.PlannedMW),
      vacancyPct: num(r.VacancyPct), absorptionMW: num(r.AbsorptionMW), rentPerKwMonth: num(r.RentPerKwMonth),
      rentYoYPct: num(r.RentYoYPct), landPerAcre: num(r.LandPerAcre), powerAvail: (str(r.PowerAvail) || "Moderate") as any,
      powerCostKwh: num(r.PowerCostKwh), preleasedPct: num(r.PreleasedPct),
    }));
    return { ...d, markets: upsertBy(d.markets, mapped, (x) => x.name) };
  }
  const mapped = rows.map((r) => ({
    id: genId("f"), name: str(r.Firm || r.Name), type: (str(r.Type) || "Investor") as any, ticker: str(r.Ticker) || null,
    hqMarket: str(r.HQ), activeMarkets: str(r.Markets).split(/[;,]/).map((x) => x.trim()).filter(Boolean),
    activityScore: num(r.ActivityScore), dealsL12M: num(r.Deals12M), capitalDeployedB: num(r.CapitalB), note: str(r.Note), source: "public" as const,
  }));
  return { ...d, firms: upsertBy(d.firms, mapped, (x) => x.name) };
}
const str = (v: any) => (v == null ? "" : String(v).trim());

function dealFlat(d: Deal) {
  return { Name: d.name, Market: d.market, Type: d.dealType, Asset: d.assetType, Stage: d.stage, MW: d.sizeMW, Value: d.value, CapRate: d.capRate, Probability: d.probability, Commission: d.commission, Client: d.client, Counterparty: d.counterparty, Broker: d.broker, CloseDate: d.closeDate, Source: d.source, Notes: d.notes };
}
function compFlat(c: Comp) {
  return { Type: c.type, Market: c.market, Asset: c.assetType, Date: c.date, MW: c.sizeMW, Price: c.price, PricePerKw: c.pricePerKw, RentPerKwMonth: c.rentPerKwMonth, CapRate: c.capRate, Buyer_Tenant: c.partyA, Seller_Landlord: c.partyB, Source: c.source, Citation: c.citation, Verified: c.verified };
}
