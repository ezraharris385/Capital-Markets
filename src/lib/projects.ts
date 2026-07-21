import type { Project, AppData } from "../data/types";
import { underwrite, UWInputs, defaultInputs } from "./underwriting";
import { id as genId } from "./format";

// ---------------------------------------------------------------------------
// Underwriting Reports ingestion.
// A project is delivered as one row in an .xlsx (the output of a separate
// underwriting engine). If the row carries computed OUTPUTS we report them
// verbatim; if it only carries INPUTS we run them through the built-in engine.
// Uploads UPSERT by `Ref` so editing the file and re-uploading updates in place.
// ---------------------------------------------------------------------------

export const PROJECT_HEADERS = [
  "Ref", "Name", "Market", "Asset", "Status", "MW", "Updated",
  // inputs
  "DevCostPerMW", "NetLeaseRateKwMonth", "OpexPct", "RentEscalatorPct",
  "StabilizedCapRate", "ExitCapRate", "HoldYears", "LTCPct", "InterestRatePct",
  // outputs (optional — leave blank to let the engine compute)
  "TotalCost", "StabilizedNOI", "YieldOnCost", "StabilizedValue", "DevelopmentProfit",
  "DevelopmentMargin", "LeveredIRR", "UnleveredIRR", "EquityMultiple", "DSCR", "DebtYield",
  "Notes",
];

export const PROJECT_EXAMPLE: Record<string, any> = {
  Ref: "NOVA-A1", Name: "Ashburn Hyperscale — Phase I", Market: "Northern Virginia", Asset: "Hyperscale",
  Status: "In Development", MW: 96, Updated: "2026-07-08",
  DevCostPerMW: 10850000, NetLeaseRateKwMonth: 95, OpexPct: 6, RentEscalatorPct: 2.5,
  StabilizedCapRate: 6.0, ExitCapRate: 6.25, HoldYears: 7, LTCPct: 55, InterestRatePct: 6.3,
  TotalCost: "", StabilizedNOI: "", YieldOnCost: "", StabilizedValue: "", DevelopmentProfit: "",
  DevelopmentMargin: "", LeveredIRR: "", UnleveredIRR: "", EquityMultiple: "", DSCR: "", DebtYield: "",
  Notes: "Leave the output columns blank to let the built-in engine compute them from inputs.",
};

const num = (v: any): number => { const n = parseFloat(String(v ?? "").replace(/[$,%]/g, "")); return isNaN(n) ? 0 : n; };
const has = (v: any) => v != null && String(v).trim() !== "";
const str = (v: any) => (v == null ? "" : String(v).trim());

export function inputsFromProject(p: Project): UWInputs {
  return {
    sizeMW: p.sizeMW,
    devCostPerMW: p.devCostPerMW ?? defaultInputs.devCostPerMW,
    leaseRateKwMonth: p.leaseRateKwMonth ?? defaultInputs.leaseRateKwMonth,
    opexPctRevenue: p.opexPctRevenue ?? defaultInputs.opexPctRevenue,
    rentEscalatorPct: p.rentEscalatorPct ?? defaultInputs.rentEscalatorPct,
    stabilizationMonths: defaultInputs.stabilizationMonths,
    stabilizedCapRate: p.stabilizedCapRate ?? defaultInputs.stabilizedCapRate,
    exitCapRate: p.exitCapRate ?? defaultInputs.exitCapRate,
    holdYears: p.holdYears ?? defaultInputs.holdYears,
    ltcPct: p.ltcPct ?? defaultInputs.ltcPct,
    interestRatePct: p.interestRatePct ?? defaultInputs.interestRatePct,
    saleCostPct: defaultInputs.saleCostPct,
  };
}

export function computeProject(inp: UWInputs, identity: Partial<Project>): Project {
  const o = underwrite(inp);
  return {
    id: identity.id || genId("prj"),
    ref: identity.ref || (identity.name || "PRJ").slice(0, 12).toUpperCase().replace(/\s+/g, "-"),
    name: identity.name || "Untitled project",
    market: identity.market || "",
    assetType: (identity.assetType as any) || "Hyperscale",
    status: (identity.status as any) || "Underwriting",
    sizeMW: inp.sizeMW,
    updated: identity.updated || new Date().toISOString().slice(0, 10),
    source: identity.source || "internal",
    notes: identity.notes || "",
    totalCost: o.totalCost, stabilizedNOI: o.stabilizedNOI, yieldOnCost: o.yieldOnCost,
    stabilizedValue: o.stabilizedValue, developmentProfit: o.developmentProfit,
    developmentMargin: o.developmentMargin, developmentSpreadBps: o.developmentSpreadBps,
    equity: o.equity, loan: o.loanAmount, dscr: o.dscr, debtYield: o.debtYield,
    leveredIRR: o.leveredIRR ?? 0, unleveredIRR: o.unleveredIRR ?? 0,
    equityMultiple: o.equityMultiple, cashFlows: o.cashFlows,
    devCostPerMW: inp.devCostPerMW, leaseRateKwMonth: inp.leaseRateKwMonth,
    opexPctRevenue: inp.opexPctRevenue, rentEscalatorPct: inp.rentEscalatorPct,
    stabilizedCapRate: inp.stabilizedCapRate, exitCapRate: inp.exitCapRate,
    holdYears: inp.holdYears, ltcPct: inp.ltcPct, interestRatePct: inp.interestRatePct,
  };
}

// Parse one spreadsheet row → a Project (report outputs if present, else compute).
export function rowToProject(row: Record<string, any>): Project {
  const inp: UWInputs = {
    sizeMW: num(row.MW),
    devCostPerMW: has(row.DevCostPerMW) ? num(row.DevCostPerMW) : defaultInputs.devCostPerMW,
    leaseRateKwMonth: has(row.NetLeaseRateKwMonth) ? num(row.NetLeaseRateKwMonth) : defaultInputs.leaseRateKwMonth,
    opexPctRevenue: has(row.OpexPct) ? num(row.OpexPct) : defaultInputs.opexPctRevenue,
    rentEscalatorPct: has(row.RentEscalatorPct) ? num(row.RentEscalatorPct) : defaultInputs.rentEscalatorPct,
    stabilizationMonths: defaultInputs.stabilizationMonths,
    stabilizedCapRate: has(row.StabilizedCapRate) ? num(row.StabilizedCapRate) : defaultInputs.stabilizedCapRate,
    exitCapRate: has(row.ExitCapRate) ? num(row.ExitCapRate) : defaultInputs.exitCapRate,
    holdYears: has(row.HoldYears) ? num(row.HoldYears) : defaultInputs.holdYears,
    ltcPct: has(row.LTCPct) ? num(row.LTCPct) : defaultInputs.ltcPct,
    interestRatePct: has(row.InterestRatePct) ? num(row.InterestRatePct) : defaultInputs.interestRatePct,
    saleCostPct: defaultInputs.saleCostPct,
  };
  const identity: Partial<Project> = {
    ref: str(row.Ref) || undefined,
    name: str(row.Name),
    market: str(row.Market),
    assetType: (str(row.Asset) as any) || "Hyperscale",
    status: (str(row.Status) as any) || "Underwriting",
    updated: str(row.Updated) || new Date().toISOString().slice(0, 10),
    source: "internal",
    notes: str(row.Notes),
  };
  const p = computeProject(inp, identity);

  // If the engine's outputs are present in the file, report those verbatim.
  const reported: Partial<Project> = {};
  if (has(row.TotalCost)) reported.totalCost = num(row.TotalCost);
  if (has(row.StabilizedNOI)) reported.stabilizedNOI = num(row.StabilizedNOI);
  if (has(row.YieldOnCost)) reported.yieldOnCost = num(row.YieldOnCost);
  if (has(row.StabilizedValue)) reported.stabilizedValue = num(row.StabilizedValue);
  if (has(row.DevelopmentProfit)) reported.developmentProfit = num(row.DevelopmentProfit);
  if (has(row.DevelopmentMargin)) reported.developmentMargin = num(row.DevelopmentMargin);
  if (has(row.LeveredIRR)) reported.leveredIRR = num(row.LeveredIRR);
  if (has(row.UnleveredIRR)) reported.unleveredIRR = num(row.UnleveredIRR);
  if (has(row.EquityMultiple)) reported.equityMultiple = num(row.EquityMultiple);
  if (has(row.DSCR)) reported.dscr = num(row.DSCR);
  if (has(row.DebtYield)) reported.debtYield = num(row.DebtYield);
  return { ...p, ...reported };
}

export function projectToRow(p: Project): Record<string, any> {
  return {
    Ref: p.ref, Name: p.name, Market: p.market, Asset: p.assetType, Status: p.status,
    MW: p.sizeMW, Updated: p.updated,
    DevCostPerMW: p.devCostPerMW ?? "", NetLeaseRateKwMonth: p.leaseRateKwMonth ?? "",
    OpexPct: p.opexPctRevenue ?? "", RentEscalatorPct: p.rentEscalatorPct ?? "",
    StabilizedCapRate: p.stabilizedCapRate ?? "", ExitCapRate: p.exitCapRate ?? "",
    HoldYears: p.holdYears ?? "", LTCPct: p.ltcPct ?? "", InterestRatePct: p.interestRatePct ?? "",
    TotalCost: Math.round(p.totalCost), StabilizedNOI: Math.round(p.stabilizedNOI),
    YieldOnCost: +p.yieldOnCost.toFixed(2), StabilizedValue: Math.round(p.stabilizedValue),
    DevelopmentProfit: Math.round(p.developmentProfit), DevelopmentMargin: +p.developmentMargin.toFixed(1),
    LeveredIRR: +p.leveredIRR.toFixed(1), UnleveredIRR: +p.unleveredIRR.toFixed(1),
    EquityMultiple: +p.equityMultiple.toFixed(2), DSCR: +p.dscr.toFixed(2), DebtYield: +p.debtYield.toFixed(1),
    Notes: p.notes,
  };
}

// Upsert projects into the store by Ref (falls back to Name).
export function upsertProjects(existing: Project[], incoming: Project[]): Project[] {
  const out = [...existing];
  for (const p of incoming) {
    const key = (p.ref || p.name).toLowerCase();
    const idx = out.findIndex((x) => (x.ref || x.name).toLowerCase() === key);
    if (idx >= 0) out[idx] = { ...p, id: out[idx].id };
    else out.unshift(p);
  }
  return out;
}
