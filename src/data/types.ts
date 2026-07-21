// ============================================================================
// Domain model. Every record carries `source` ("internal" | "public") so the
// dashboard can visually separate proprietary data from publicly-sourced data
// and drive the "redress / flag public info" workflow.
// ============================================================================

export type Source = "internal" | "public";

export type DealStage = "Sourcing" | "Underwriting" | "LOI" | "Under Contract" | "Closed" | "Lost";
export type DealType = "Investment Sale" | "Lease" | "Debt" | "Equity" | "Development" | "Land";
export type AssetType =
  | "Hyperscale" | "Powered Shell" | "Colocation" | "Land" | "Enterprise" | "Edge" | "Portfolio";

export interface Deal {
  id: string;
  name: string;
  market: string;
  dealType: DealType;
  assetType: AssetType;
  stage: DealStage;
  sizeMW: number;
  sf: number;             // square feet
  value: number;          // total consideration ($)
  capRate: number | null; // going-in cap rate (%)
  probability: number;    // 0-100
  broker: string;
  client: string;
  counterparty: string;
  commission: number;     // fee ($) at close
  closeDate: string;      // ISO
  source: Source;
  flagged?: boolean;      // redress: flagged for review because it uses public info
  notes: string;
}

export type CompType = "Sale" | "Lease";
export interface Comp {
  id: string;
  type: CompType;
  market: string;
  assetType: AssetType;
  date: string;
  sizeMW: number;
  sf: number;
  // Sale: price = total $, pricePerKw = $/kW ; Lease: rentPerKwMonth = $/kW/mo
  price: number | null;
  pricePerKw: number | null;
  capRate: number | null;
  rentPerKwMonth: number | null;
  partyA: string;         // buyer / tenant
  partyB: string;         // seller / landlord
  source: Source;
  citation: string;       // where a public comp came from
  verified: boolean;
  flagged?: boolean;
}

export type PowerAvail = "Constrained" | "Tight" | "Moderate" | "Ample";
export interface Market {
  id: string;
  name: string;
  region: string;
  operationalMW: number;
  underConstructionMW: number;
  plannedMW: number;
  vacancyPct: number;
  absorptionMW: number;       // trailing 12mo net absorption
  rentPerKwMonth: number;     // market avg $/kW/month
  rentYoYPct: number;
  landPerAcre: number;        // $/acre for powered/entitled land
  powerAvail: PowerAvail;
  powerCostKwh: number;       // $/kWh industrial
  preleasedPct: number;       // % of under-construction pre-leased
  tier: "Primary" | "Secondary" | "Emerging";
}

export type FirmType = "Hyperscaler" | "Colo Operator" | "Developer" | "REIT" | "Investor" | "Lender" | "Utility";
export interface Firm {
  id: string;
  name: string;
  type: FirmType;
  ticker: string | null;
  hqMarket: string;
  activeMarkets: string[];
  activityScore: number;   // 0-100 relative deal activity (trailing 12mo)
  dealsL12M: number;
  capitalDeployedB: number; // $B trailing 12mo (est.)
  note: string;
  source: Source;
}

// Time series point
export interface SeriesPoint { t: string; v: number }

export interface RateMetric {
  key: string;
  label: string;
  value: number;
  unit: "%" | "bps" | "x";
  changeBps: number;   // change vs prior period
  category: "Rates" | "Spreads" | "Cap Rates" | "Equity";
  history: SeriesPoint[];
  note?: string;
  source: Source;
}

export interface CostComponent {
  key: string;
  label: string;
  group: "Land & Sitework" | "Shell & Core" | "Electrical" | "Mechanical" | "Fit-out" | "Soft Costs";
  costPerMW: number;       // $/MW (critical IT load)
  yoyPct: number;          // inflation YoY
  note: string;
}

export interface InflationIndex {
  key: string;
  label: string;
  latest: number;          // index value or price
  unit: string;
  yoyPct: number;
  history: SeriesPoint[];
  category: "Headline" | "Construction" | "Equipment" | "Energy" | "Labor";
}

export interface AppData {
  deals: Deal[];
  comps: Comp[];
  markets: Market[];
  firms: Firm[];
  rates: RateMetric[];
  costs: CostComponent[];
  inflation: InflationIndex[];
  meta: { lastRefresh: string | null; version: number };
}
