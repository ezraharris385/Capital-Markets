import React, { useMemo, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { Card, StatTile, Modal, Segmented } from "../components/ui";
import { ColumnChart, Sparkline } from "../components/charts";
import { Icon } from "../components/Icon";
import { fmtUSD, fmtPct, compactNum, gainColor, fmtMW } from "../lib/format";
import { importFile, exportRows, downloadTemplate } from "../lib/xlsx";
import { PROJECT_HEADERS, PROJECT_EXAMPLE, rowToProject, projectToRow, upsertProjects } from "../lib/projects";
import type { Project, ProjectStatus } from "../data/types";

const STATUSES: ProjectStatus[] = ["Underwriting", "Approved", "In Development", "Stabilized", "On Hold", "Sold"];

function statusBadge(s: ProjectStatus) {
  const map: Record<ProjectStatus, string> = {
    "Stabilized": "badge-good", "In Development": "badge-accent", "Approved": "badge-good",
    "Underwriting": "badge-neutral", "On Hold": "badge-warn", "Sold": "badge-neutral",
  };
  return <span className={"badge " + map[s]}>{s}</span>;
}

export const Projects: React.FC = () => {
  const { data, setData, loadDemo, toast } = useStore();
  const P = data.projects;
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState<Project | null>(null);
  const [filter, setFilter] = useState<"All" | ProjectStatus>("All");

  const roll = useMemo(() => {
    const cost = P.reduce((a, p) => a + p.totalCost, 0);
    const value = P.reduce((a, p) => a + p.stabilizedValue, 0);
    const profit = P.reduce((a, p) => a + p.developmentProfit, 0);
    const equity = P.reduce((a, p) => a + p.equity, 0);
    const mw = P.reduce((a, p) => a + p.sizeMW, 0);
    const yoc = cost > 0 ? P.reduce((a, p) => a + p.yieldOnCost * p.totalCost, 0) / cost : 0;
    const irr = equity > 0 ? P.reduce((a, p) => a + p.leveredIRR * p.equity, 0) / equity : 0;
    return { cost, value, profit, equity, mw, yoc, irr };
  }, [P]);

  const shown = filter === "All" ? P : P.filter((p) => p.status === filter);

  const onFile = async (f: File) => {
    try {
      const rows = await importFile(f);
      const parsed = rows.filter((r) => r.Name || r.Ref).map(rowToProject);
      if (!parsed.length) { toast("No project rows found", "warn"); return; }
      setData((d) => ({ ...d, projects: upsertProjects(d.projects, parsed) }));
      toast(`Loaded ${parsed.length} project underwriting report${parsed.length !== 1 ? "s" : ""}`);
    } catch (e: any) {
      toast("Import failed: " + (e.message || "bad file"), "err");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const remove = (p: Project) => { setData((d) => ({ ...d, projects: d.projects.filter((x) => x.id !== p.id) })); setOpen(null); toast("Project removed", "warn"); };
  const setStatus = (p: Project, s: ProjectStatus) => setData((d) => ({ ...d, projects: d.projects.map((x) => x.id === p.id ? { ...x, status: s } : x) }));

  return (
    <div className="col" style={{ gap: 16 }}>
      {/* Portfolio rollup */}
      {P.length > 0 && (
      <div className="grid g-6">
        <div className="card stat" style={{ background: "linear-gradient(160deg, var(--brand-deep-2), var(--surface-card) 72%)" }}>
          <div className="stat-label" style={{ color: "#bfe3d3" }}>Portfolio value</div>
          <div className="stat-value" style={{ fontSize: 24 }}>{fmtUSD(roll.value, { compact: true })}</div>
          <div className="stat-sub">{fmtMW(roll.mw)} · {P.length} projects</div>
        </div>
        <StatTile label="Total dev cost" value={fmtUSD(roll.cost, { compact: true })} sub="all-in basis" />
        <div className="card stat">
          <div className="stat-label">Value created</div>
          <div className="stat-value" style={{ fontSize: 24, color: gainColor(roll.profit) }}>{fmtUSD(roll.profit, { compact: true })}</div>
          <div className="stat-sub">development profit</div>
        </div>
        <StatTile label="Avg yield-on-cost" value={fmtPct(roll.yoc, 2)} sub="cost-weighted" />
        <StatTile label="Portfolio IRR" value={fmtPct(roll.irr, 1)} sub="equity-weighted, levered" />
        <StatTile label="Equity at work" value={fmtUSD(roll.equity, { compact: true })} sub="across projects" />
      </div>
      )}

      {/* Controls */}
      <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
        <Segmented<"All" | ProjectStatus>
          options={[{ value: "All", label: "All" }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
          value={filter} onChange={setFilter} />
        <div className="spacer" />
        <button className="btn btn-sm" onClick={() => downloadTemplate(PROJECT_HEADERS, PROJECT_EXAMPLE, "meridian-underwriting-template.xlsx")}><Icon name="download" size={15} /> Template</button>
        <button className="btn btn-sm" onClick={() => exportRows(P.map(projectToRow), "meridian-projects.xlsx", "Projects")}><Icon name="download" size={15} /> Export</button>
        <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}><Icon name="upload" size={15} /> Upload underwriting</button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </div>

      {/* Project cards */}
      {shown.length === 0 ? (
        <Card>
          <div className="empty" style={{ padding: "52px 20px" }}>
            <Icon name="underwrite" size={34} />
            <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginTop: 6 }}>No projects yet — starts at zero</div>
            <div style={{ fontSize: 12.5, marginTop: 4, maxWidth: 460, marginInline: "auto", lineHeight: 1.6 }}>
              Download the template, paste in your underwriting engine's outputs (or just the inputs and the built-in engine will compute them), then upload. Each project becomes a report card that rolls into the Overview.
            </div>
            <div className="row" style={{ justifyContent: "center", gap: 10, marginTop: 16 }}>
              <button className="btn btn-sm" onClick={() => downloadTemplate(PROJECT_HEADERS, PROJECT_EXAMPLE, "meridian-underwriting-template.xlsx")}><Icon name="download" size={15} /> Template</button>
              <button className="btn btn-sm" onClick={() => fileRef.current?.click()}><Icon name="upload" size={15} /> Upload underwriting</button>
              <button className="btn btn-primary btn-sm" onClick={() => { loadDemo(); toast("Demo portfolio loaded"); }}><Icon name="spark" size={15} /> Load demo data</button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid g-3">
          {shown.map((p) => (
            <button key={p.id} className="card" style={{ textAlign: "left", cursor: "pointer", padding: 0, overflow: "hidden" }} onClick={() => setOpen(p)}>
              <div className="card-pad" style={{ paddingBottom: 12 }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ fontWeight: 660, fontSize: 14.5, letterSpacing: "-0.01em" }}>{p.name}</div>
                  {statusBadge(p.status)}
                </div>
                <div className="row" style={{ gap: 6, marginTop: 6 }}>
                  <span className="chip">{p.market}</span>
                  <span className="chip">{fmtMW(p.sizeMW)}</span>
                  <span className="chip">{p.assetType}</span>
                </div>
              </div>
              <div style={{ height: 1, background: "var(--border)" }} />
              <div className="card-pad" style={{ paddingTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 10px" }}>
                <Metric label="Yield on cost" value={fmtPct(p.yieldOnCost, 2)} accent />
                <Metric label="Levered IRR" value={fmtPct(p.leveredIRR, 1)} accent />
                <Metric label="Equity multiple" value={p.equityMultiple.toFixed(2) + "x"} />
                <Metric label="Dev profit" value={fmtUSD(p.developmentProfit, { compact: true })} color={gainColor(p.developmentProfit)} />
              </div>
              <div className="card-pad" style={{ paddingTop: 0 }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <span className="muted" style={{ fontSize: 11 }}>Dev spread {Math.round(p.developmentSpreadBps)} bps</span>
                  <Sparkline data={p.cashFlows.map((c) => c)} color={gainColor(p.developmentProfit)} width={92} height={26} fill={false} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && <ProjectDetail p={open} onClose={() => setOpen(null)} onDelete={remove} onStatus={setStatus} />}
    </div>
  );
};

function Metric({ label, value, accent, color }: { label: string; value: string; accent?: boolean; color?: string }) {
  return (
    <div className="col" style={{ gap: 1 }}>
      <span className="muted" style={{ fontSize: 10.5 }}>{label}</span>
      <span style={{ fontWeight: 680, fontSize: 17, color: color || (accent ? "var(--accent)" : "var(--text-primary)") }}>{value}</span>
    </div>
  );
}

function ProjectDetail({ p, onClose, onDelete, onStatus }: { p: Project; onClose: () => void; onDelete: (p: Project) => void; onStatus: (p: Project, s: ProjectStatus) => void }) {
  return (
    <Modal title={p.name} onClose={onClose} wide>
      <div className="col" style={{ gap: 16 }}>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <span className="chip">{p.market}</span>
          <span className="chip">{fmtMW(p.sizeMW)}</span>
          <span className="chip">{p.assetType}</span>
          <span className="chip">Updated {p.updated}</span>
          <div className="spacer" />
          <select className="select" style={{ width: "auto" }} value={p.status} onChange={(e) => onStatus(p, e.target.value as ProjectStatus)}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="grid g-4">
          <BigMetric label="Yield on cost" value={fmtPct(p.yieldOnCost, 2)} accent />
          <BigMetric label="Levered IRR" value={fmtPct(p.leveredIRR, 1)} accent />
          <BigMetric label="Equity multiple" value={p.equityMultiple.toFixed(2) + "x"} />
          <BigMetric label="Development profit" value={fmtUSD(p.developmentProfit, { compact: true })} color={gainColor(p.developmentProfit)} />
        </div>

        <div className="grid g-3">
          <Card title="Value creation"><KV rows={[
            ["Total dev cost", fmtUSD(p.totalCost, { compact: true })],
            ["Stabilized NOI", fmtUSD(p.stabilizedNOI, { compact: true })],
            ["Stabilized value", fmtUSD(p.stabilizedValue, { compact: true })],
            ["Dev margin", fmtPct(p.developmentMargin, 1)],
            ["Dev spread", Math.round(p.developmentSpreadBps) + " bps"],
          ]} profitRow={["Dev profit", p.developmentProfit]} /></Card>
          <Card title="Returns"><KV rows={[
            ["Levered IRR", fmtPct(p.leveredIRR, 1)],
            ["Unlevered IRR", fmtPct(p.unleveredIRR, 1)],
            ["Equity multiple", p.equityMultiple.toFixed(2) + "x"],
            ["Equity", fmtUSD(p.equity, { compact: true })],
            ["Hold period", (p.holdYears ?? "—") + " yrs"],
          ]} /></Card>
          <Card title="Debt & assumptions"><KV rows={[
            ["Loan", fmtUSD(p.loan, { compact: true })],
            ["LTC", (p.ltcPct ?? "—") + "%"],
            ["DSCR", p.dscr.toFixed(2) + "x"],
            ["Debt yield", fmtPct(p.debtYield, 1)],
            ["Net rent", p.leaseRateKwMonth ? "$" + p.leaseRateKwMonth + "/kW/mo" : "—"],
          ]} /></Card>
        </div>

        <Card title="Equity cash flows" sub="Levered distributions by hold year (Year 0 = equity outlay)">
          <ColumnChart labels={p.cashFlows.map((_, i) => "Y" + i)} values={p.cashFlows}
            barColors={p.cashFlows.map((v) => v < 0 ? "var(--down)" : "var(--up)")}
            valueFmt={(v) => (v < 0 ? "-$" : "$") + compactNum(Math.abs(v), 0)} height={200} />
        </Card>

        {p.notes && <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>{p.notes}</div>}

        <div className="row">
          <button className="btn btn-ghost btn-sm" style={{ color: "var(--down)" }} onClick={() => onDelete(p)}>Delete project</button>
          <div className="spacer" />
          <button className="btn btn-primary btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}

function BigMetric({ label, value, accent, color }: { label: string; value: string; accent?: boolean; color?: string }) {
  return (
    <div className="card stat" style={accent ? { border: "1px solid var(--accent-dim)", background: "color-mix(in srgb, var(--accent) 6%, var(--surface-card))" } : undefined}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ fontSize: 22, color: color || (accent ? "var(--accent)" : undefined) }}>{value}</div>
    </div>
  );
}

function KV({ rows, profitRow }: { rows: [string, string][]; profitRow?: [string, number] }) {
  return (
    <div className="kv">
      {rows.map(([k, v]) => <React.Fragment key={k}><span className="k">{k}</span><span className="v">{v}</span></React.Fragment>)}
      {profitRow && <><span className="k">{profitRow[0]}</span><span className="v" style={{ color: gainColor(profitRow[1]) }}>{fmtUSD(profitRow[1], { compact: true })}</span></>}
    </div>
  );
}
