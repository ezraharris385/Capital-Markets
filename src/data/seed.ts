import type {
  AppData, Deal, Comp, Market, Firm, RateMetric, CostComponent, InflationIndex, SeriesPoint, Project,
} from "./types";

// --- deterministic monthly series helper (ends at the anchor month) ---
const ANCHOR = { y: 2026, m: 7 }; // Jul 2026
function months(n: number): string[] {
  const out: string[] = [];
  let y = ANCHOR.y, m = ANCHOR.m;
  for (let i = 0; i < n; i++) {
    out.unshift(`${y}-${String(m).padStart(2, "0")}-01`);
    m--; if (m === 0) { m = 12; y--; }
  }
  return out;
}
// smooth-ish path from start->end with a gentle sinusoidal wobble (deterministic)
function series(n: number, start: number, end: number, wobble = 0, round = 2): SeriesPoint[] {
  const ts = months(n);
  return ts.map((t, i) => {
    const p = i / (n - 1);
    const base = start + (end - start) * p;
    const w = wobble * Math.sin(i * 1.7) * (1 - p * 0.4);
    return { t, v: +(base + w).toFixed(round) };
  });
}

// ============================== MARKETS =====================================
const markets: Market[] = [
  { id: "mkt_nova", name: "Northern Virginia", region: "Mid-Atlantic", operationalMW: 3620, underConstructionMW: 1410, plannedMW: 3050, vacancyPct: 0.9, absorptionMW: 528, rentPerKwMonth: 158, rentYoYPct: 9.4, landPerAcre: 2450000, powerAvail: "Constrained", powerCostKwh: 0.086, preleasedPct: 83, tier: "Primary" },
  { id: "mkt_dfw", name: "Dallas–Fort Worth", region: "South Central", operationalMW: 865, underConstructionMW: 735, plannedMW: 1640, vacancyPct: 3.1, absorptionMW: 264, rentPerKwMonth: 136, rentYoYPct: 11.2, landPerAcre: 910000, powerAvail: "Tight", powerCostKwh: 0.072, preleasedPct: 71, tier: "Primary" },
  { id: "mkt_phx", name: "Phoenix", region: "Southwest", operationalMW: 1060, underConstructionMW: 905, plannedMW: 2120, vacancyPct: 4.4, absorptionMW: 302, rentPerKwMonth: 131, rentYoYPct: 8.1, landPerAcre: 660000, powerAvail: "Tight", powerCostKwh: 0.078, preleasedPct: 69, tier: "Primary" },
  { id: "mkt_chi", name: "Chicago", region: "Midwest", operationalMW: 785, underConstructionMW: 345, plannedMW: 710, vacancyPct: 5.7, absorptionMW: 151, rentPerKwMonth: 141, rentYoYPct: 6.0, landPerAcre: 1120000, powerAvail: "Moderate", powerCostKwh: 0.089, preleasedPct: 61, tier: "Primary" },
  { id: "mkt_sv", name: "Silicon Valley", region: "West", operationalMW: 625, underConstructionMW: 185, plannedMW: 410, vacancyPct: 2.0, absorptionMW: 88, rentPerKwMonth: 176, rentYoYPct: 6.8, landPerAcre: 3250000, powerAvail: "Constrained", powerCostKwh: 0.138, preleasedPct: 76, tier: "Primary" },
  { id: "mkt_atl", name: "Atlanta", region: "Southeast", operationalMW: 730, underConstructionMW: 985, plannedMW: 1930, vacancyPct: 6.0, absorptionMW: 348, rentPerKwMonth: 126, rentYoYPct: 12.4, landPerAcre: 530000, powerAvail: "Tight", powerCostKwh: 0.068, preleasedPct: 73, tier: "Primary" },
  { id: "mkt_hil", name: "Hillsboro (Portland)", region: "Pacific NW", operationalMW: 485, underConstructionMW: 262, plannedMW: 605, vacancyPct: 3.8, absorptionMW: 121, rentPerKwMonth: 129, rentYoYPct: 7.2, landPerAcre: 785000, powerAvail: "Moderate", powerCostKwh: 0.061, preleasedPct: 64, tier: "Secondary" },
  { id: "mkt_col", name: "Columbus", region: "Midwest", operationalMW: 365, underConstructionMW: 545, plannedMW: 1310, vacancyPct: 7.4, absorptionMW: 205, rentPerKwMonth: 121, rentYoYPct: 10.1, landPerAcre: 345000, powerAvail: "Moderate", powerCostKwh: 0.070, preleasedPct: 67, tier: "Emerging" },
  { id: "mkt_slc", name: "Salt Lake City", region: "Mountain West", operationalMW: 225, underConstructionMW: 182, plannedMW: 505, vacancyPct: 5.1, absorptionMW: 72, rentPerKwMonth: 123, rentYoYPct: 6.4, landPerAcre: 415000, powerAvail: "Ample", powerCostKwh: 0.066, preleasedPct: 56, tier: "Emerging" },
  { id: "mkt_cwa", name: "Central Washington", region: "Pacific NW", operationalMW: 305, underConstructionMW: 224, plannedMW: 715, vacancyPct: 4.0, absorptionMW: 97, rentPerKwMonth: 111, rentYoYPct: 5.1, landPerAcre: 295000, powerAvail: "Ample", powerCostKwh: 0.045, preleasedPct: 59, tier: "Emerging" },
  { id: "mkt_ren", name: "Reno–Tahoe", region: "Mountain West", operationalMW: 265, underConstructionMW: 305, plannedMW: 820, vacancyPct: 6.7, absorptionMW: 112, rentPerKwMonth: 118, rentYoYPct: 8.3, landPerAcre: 365000, powerAvail: "Moderate", powerCostKwh: 0.071, preleasedPct: 61, tier: "Emerging" },
];

// ============================== DEAL FLOW (public, announced) ===============
// Publicly announced market transactions — deal-flow reporting, not a private
// pipeline. Your own live pursuits arrive via the CRM feed (Deal Flow template).
const deals: Deal[] = [
  { id: "df1", name: "QTS Ashburn campus recapitalization", market: "Northern Virginia", dealType: "Investment Sale", assetType: "Hyperscale", stage: "Closed", sizeMW: 96, sf: 480000, value: 1104000000, capRate: 5.9, probability: 100, broker: "Market", client: "Blackstone", counterparty: "QTS", commission: 0, closeDate: "2026-06-02", source: "public", notes: "Announced recapitalization; press release + county records." },
  { id: "df2", name: "Digital Realty / CyrusOne Phoenix trade", market: "Phoenix", dealType: "Investment Sale", assetType: "Colocation", stage: "Closed", sizeMW: 32, sf: 190000, value: 246000000, capRate: 6.5, probability: 100, broker: "Market", client: "Digital Realty", counterparty: "CyrusOne", commission: 0, closeDate: "2026-04-28", source: "public", notes: "Disclosed via SEC 8-K." },
  { id: "df3", name: "Aligned Phoenix sovereign-wealth sale", market: "Phoenix", dealType: "Investment Sale", assetType: "Hyperscale", stage: "Closed", sizeMW: 84, sf: 420000, value: 714000000, capRate: 6.4, probability: 100, broker: "Market", client: "Sovereign wealth fund", counterparty: "Aligned Data Centers", commission: 0, closeDate: "2026-01-30", source: "public", notes: "Reported in trade press (DCD)." },
  { id: "df4", name: "Vantage DFW powered-shell acquisition", market: "Dallas–Fort Worth", dealType: "Investment Sale", assetType: "Powered Shell", stage: "Closed", sizeMW: 60, sf: 300000, value: 402000000, capRate: 6.3, probability: 100, broker: "Market", client: "Vantage Data Centers", counterparty: "Regional developer", commission: 0, closeDate: "2026-05-14", source: "public", notes: "Announced acquisition of powered shell." },
  { id: "df5", name: "Stack Columbus development JV (announced)", market: "Columbus", dealType: "Equity", assetType: "Hyperscale", stage: "Under Contract", sizeMW: 54, sf: 270000, value: 313000000, capRate: 7.0, probability: 90, broker: "Market", client: "Institutional JV", counterparty: "Stack Infrastructure", commission: 0, closeDate: "2026-02-27", source: "public", notes: "JV formation reported in trade press." },
];

// ============================== COMPS =======================================
const comps: Comp[] = [
  { id: "c1", type: "Sale", market: "Northern Virginia", assetType: "Hyperscale", date: "2026-06-02", sizeMW: 96, sf: 480000, price: 1104000000, pricePerKw: 11500, capRate: 5.9, rentPerKwMonth: null, partyA: "Blackstone", partyB: "QTS (private)", source: "public", citation: "Press release + county records", verified: true },
  { id: "c2", type: "Sale", market: "Dallas–Fort Worth", assetType: "Powered Shell", date: "2026-05-14", sizeMW: 60, sf: 300000, price: 402000000, pricePerKw: 6700, capRate: 6.3, rentPerKwMonth: null, partyA: "Vantage", partyB: "Regional developer", source: "public", citation: "Trade press (DCD)", verified: true },
  { id: "c4", type: "Sale", market: "Phoenix", assetType: "Colocation", date: "2026-04-28", sizeMW: 32, sf: 190000, price: 246000000, pricePerKw: 7700, capRate: 6.5, rentPerKwMonth: null, partyA: "Digital Realty", partyB: "CyrusOne", source: "public", citation: "SEC 8-K disclosure", verified: true },
  { id: "c5", type: "Lease", market: "Atlanta", assetType: "Hyperscale", date: "2026-05-08", sizeMW: 36, sf: 200000, price: null, pricePerKw: null, capRate: null, rentPerKwMonth: 128, partyA: "Cloud provider", partyB: "Switch", source: "public", citation: "Broker survey", verified: false, flagged: true },
  { id: "c7", type: "Sale", market: "Chicago", assetType: "Colocation", date: "2026-03-19", sizeMW: 24, sf: 160000, price: 171000000, pricePerKw: 7125, capRate: 7.2, rentPerKwMonth: null, partyA: "Core-plus fund", partyB: "Regional operator", source: "public", citation: "County deed record", verified: true },
  { id: "c8", type: "Lease", market: "Phoenix", assetType: "Colocation", date: "2026-06-11", sizeMW: 20, sf: 120000, price: null, pricePerKw: null, capRate: null, rentPerKwMonth: 133, partyA: "Enterprise", partyB: "Iron Mountain", source: "public", citation: "Tenant rep survey", verified: false, flagged: true },
  { id: "c10", type: "Sale", market: "Columbus", assetType: "Powered Shell", date: "2026-02-27", sizeMW: 54, sf: 270000, price: 313000000, pricePerKw: 5800, capRate: 7.0, rentPerKwMonth: null, partyA: "Institutional JV", partyB: "Stack Infrastructure", source: "public", citation: "Trade press", verified: true },
  { id: "c12", type: "Sale", market: "Hillsboro (Portland)", assetType: "Colocation", date: "2026-03-05", sizeMW: 28, sf: 165000, price: 205000000, pricePerKw: 7300, capRate: 6.9, rentPerKwMonth: null, partyA: "Core-plus fund", partyB: "Flexential", source: "public", citation: "CoStar", verified: true },
  { id: "c13", type: "Sale", market: "Reno–Tahoe", assetType: "Land", date: "2026-05-21", sizeMW: 0, sf: 0, price: 62000000, pricePerKw: null, capRate: null, rentPerKwMonth: null, partyA: "Developer", partyB: "Landowner", source: "public", citation: "County record", verified: true },
  { id: "c14", type: "Sale", market: "Dallas–Fort Worth", assetType: "Hyperscale", date: "2026-06-30", sizeMW: 72, sf: 360000, price: 612000000, pricePerKw: 8500, capRate: 6.2, rentPerKwMonth: null, partyA: "REIT", partyB: "Developer", source: "public", citation: "Press + records", verified: true },
  { id: "c15", type: "Lease", market: "Silicon Valley", assetType: "Colocation", date: "2026-05-16", sizeMW: 14, sf: 90000, price: null, pricePerKw: null, capRate: null, rentPerKwMonth: 188, partyA: "AI startup", partyB: "Equinix", source: "public", citation: "Broker survey", verified: false, flagged: true },
  { id: "c16", type: "Sale", market: "Phoenix", assetType: "Hyperscale", date: "2026-01-30", sizeMW: 84, sf: 420000, price: 714000000, pricePerKw: 8500, capRate: 6.4, rentPerKwMonth: null, partyA: "Sovereign wealth", partyB: "Aligned", source: "public", citation: "Trade press (DCD)", verified: true },
];

// ============================== FIRMS =======================================
const firms: Firm[] = [
  { id: "f1", name: "Amazon Web Services", type: "Hyperscaler", ticker: "AMZN", hqMarket: "Northern Virginia", activeMarkets: ["Northern Virginia","Phoenix","Columbus","Central Washington"], activityScore: 98, dealsL12M: 41, capitalDeployedB: 32.5, note: "Largest absorber of capacity; aggressive owned + leased build.", source: "public" },
  { id: "f2", name: "Microsoft", type: "Hyperscaler", ticker: "MSFT", hqMarket: "Central Washington", activeMarkets: ["Northern Virginia","Phoenix","Atlanta","Columbus","Silicon Valley"], activityScore: 96, dealsL12M: 38, capitalDeployedB: 29.8, note: "AI-driven expansion; multi-GW pipeline across primary + emerging.", source: "public" },
  { id: "f3", name: "Google", type: "Hyperscaler", ticker: "GOOGL", hqMarket: "Silicon Valley", activeMarkets: ["Silicon Valley","Dallas–Fort Worth","Reno–Tahoe","Columbus"], activityScore: 90, dealsL12M: 29, capitalDeployedB: 24.1, note: "Owned campuses + selective leasing; strong in low-cost power markets.", source: "public" },
  { id: "f4", name: "Meta", type: "Hyperscaler", ticker: "META", hqMarket: "Silicon Valley", activeMarkets: ["Atlanta","Reno–Tahoe","Central Washington","Salt Lake City"], activityScore: 88, dealsL12M: 24, capitalDeployedB: 22.0, note: "Massive owned build-out for AI; prioritizes power + land control.", source: "public" },
  { id: "f5", name: "Oracle", type: "Hyperscaler", ticker: "ORCL", hqMarket: "Dallas–Fort Worth", activeMarkets: ["Dallas–Fort Worth","Phoenix","Salt Lake City"], activityScore: 82, dealsL12M: 22, capitalDeployedB: 15.6, note: "OCI expansion; heavy reliance on leased hyperscale + GPU clusters.", source: "public" },
  { id: "f6", name: "Equinix", type: "REIT", ticker: "EQIX", hqMarket: "Silicon Valley", activeMarkets: ["Silicon Valley","Chicago","Northern Virginia","Dallas–Fort Worth"], activityScore: 74, dealsL12M: 18, capitalDeployedB: 6.2, note: "Interconnection-led; xScale JV for hyperscale. Premium retail colo.", source: "public" },
  { id: "f7", name: "Digital Realty", type: "REIT", ticker: "DLR", hqMarket: "Dallas–Fort Worth", activeMarkets: ["Dallas–Fort Worth","Atlanta","Phoenix","Chicago","Northern Virginia"], activityScore: 80, dealsL12M: 26, capitalDeployedB: 8.4, note: "Global platform; active seller into JVs to fund development.", source: "public" },
  { id: "f8", name: "Blackstone", type: "Investor", ticker: "BX", hqMarket: "Northern Virginia", activeMarkets: ["Northern Virginia","Phoenix","Silicon Valley","Atlanta"], activityScore: 94, dealsL12M: 31, capitalDeployedB: 27.5, note: "Owns QTS; largest DC investor. Aggressive on stabilized + development.", source: "public" },
  { id: "f9", name: "DigitalBridge", type: "Investor", ticker: "DBRG", hqMarket: "Dallas–Fort Worth", activeMarkets: ["Dallas–Fort Worth","Atlanta","Reno–Tahoe","Columbus"], activityScore: 78, dealsL12M: 20, capitalDeployedB: 11.2, note: "Digital-infra specialist; owns/controls Switch, Vantage, DataBank.", source: "public" },
  { id: "f10", name: "Aligned Data Centers", type: "Developer", ticker: null, hqMarket: "Dallas–Fort Worth", activeMarkets: ["Phoenix","Dallas–Fort Worth","Salt Lake City","Chicago"], activityScore: 84, dealsL12M: 23, capitalDeployedB: 9.1, note: "Fast-scaling developer; liquid-cooling leader. Macquarie-backed.", source: "public" },
  { id: "f11", name: "Vantage Data Centers", type: "Developer", ticker: null, hqMarket: "Silicon Valley", activeMarkets: ["Atlanta","Silicon Valley","Phoenix","Reno–Tahoe"], activityScore: 81, dealsL12M: 21, capitalDeployedB: 8.8, note: "DigitalBridge-backed; hyperscale campuses at speed.", source: "public" },
  { id: "f12", name: "QTS Data Centers", type: "Colo Operator", ticker: null, hqMarket: "Atlanta", activeMarkets: ["Atlanta","Northern Virginia","Phoenix","Chicago"], activityScore: 86, dealsL12M: 27, capitalDeployedB: 12.4, note: "Blackstone-owned; one of the fastest hyperscale developers in US.", source: "public" },
  { id: "f13", name: "CyrusOne", type: "Colo Operator", ticker: null, hqMarket: "Dallas–Fort Worth", activeMarkets: ["Dallas–Fort Worth","Northern Virginia","Phoenix","Atlanta"], activityScore: 76, dealsL12M: 19, capitalDeployedB: 7.7, note: "KKR/GIP-owned; recycling stabilized assets to fund pipeline.", source: "public" },
  { id: "f14", name: "CoreWeave", type: "Colo Operator", ticker: "CRWV", hqMarket: "Northern Virginia", activeMarkets: ["Northern Virginia","Dallas–Fort Worth","Atlanta","Salt Lake City"], activityScore: 89, dealsL12M: 25, capitalDeployedB: 14.0, note: "GPU-cloud; huge leased-capacity demand. Credit profile evolving.", source: "public" },
  { id: "f15", name: "PGIM Real Estate", type: "Lender", ticker: null, hqMarket: "Chicago", activeMarkets: ["Chicago","Northern Virginia","Dallas–Fort Worth"], activityScore: 62, dealsL12M: 14, capitalDeployedB: 4.6, note: "Active DC debt provider; life-co balance sheet, 55-65% LTV.", source: "public" },
  { id: "f16", name: "Brookfield", type: "Investor", ticker: "BN", hqMarket: "Northern Virginia", activeMarkets: ["Northern Virginia","Atlanta","Phoenix"], activityScore: 72, dealsL12M: 16, capitalDeployedB: 10.3, note: "Infra + RE capital; owns/backs multiple platforms globally.", source: "public" },
];

// ============================== RATES / CAPITAL MARKETS =====================
const rates: RateMetric[] = [
  { key: "ust10", label: "10-Yr Treasury", value: 4.28, unit: "%", changeBps: -12, category: "Rates", source: "public", history: series(18, 4.55, 4.28, 0.12, 2), note: "Benchmark for long-term financing." },
  { key: "ust2", label: "2-Yr Treasury", value: 3.86, unit: "%", changeBps: -18, category: "Rates", source: "public", history: series(18, 4.35, 3.86, 0.1, 2) },
  { key: "sofr", label: "SOFR (30-day avg)", value: 4.33, unit: "%", changeBps: -25, category: "Rates", source: "public", history: series(18, 4.90, 4.33, 0.06, 2), note: "Floating-rate debt base." },
  { key: "ffr", label: "Fed Funds (upper)", value: 4.50, unit: "%", changeBps: -25, category: "Rates", source: "public", history: series(18, 5.00, 4.50, 0.02, 2) },
  { key: "bbb", label: "BBB Corp Spread", value: 128, unit: "bps", changeBps: -6, category: "Spreads", source: "public", history: series(18, 152, 128, 5, 0) },
  { key: "dcdebt", label: "DC Sr. Debt Spread", value: 178, unit: "bps", changeBps: -8, category: "Spreads", source: "public", history: series(18, 210, 178, 6, 0), note: "Over SOFR, IG-quality stabilized DC." },
  { key: "cap_stab", label: "Stabilized DC Cap Rate", value: 6.2, unit: "%", changeBps: -15, category: "Cap Rates", source: "public", history: series(18, 6.7, 6.2, 0.05, 2), note: "Single-tenant, IG, primary market." },
  { key: "cap_shell", label: "Powered Shell Cap Rate", value: 6.9, unit: "%", changeBps: -10, category: "Cap Rates", source: "public", history: series(18, 7.3, 6.9, 0.05, 2) },
  { key: "cap_colo", label: "Colocation Cap Rate", value: 7.1, unit: "%", changeBps: -12, category: "Cap Rates", source: "public", history: series(18, 7.6, 7.1, 0.05, 2) },
  { key: "yoc", label: "Development Yield-on-Cost", value: 8.6, unit: "%", changeBps: 10, category: "Equity", source: "public", history: series(18, 8.1, 8.6, 0.06, 2), note: "Untrended stabilized YoC, hyperscale BTS." },
  { key: "spread_dev", label: "Dev Spread (YoC − Cap)", value: 240, unit: "bps", changeBps: 25, category: "Equity", source: "public", history: series(18, 165, 240, 8, 0), note: "Build-to-core margin. Wider = build economics favored." },
];

// ============================== COSTS (per MW critical IT) ==================
const costs: CostComponent[] = [
  { key: "land", label: "Land (powered/entitled)", group: "Land & Sitework", costPerMW: 380000, yoyPct: 14.0, note: "Land basis per MW; varies 5-10x by market." },
  { key: "site", label: "Sitework & Utilities", group: "Land & Sitework", costPerMW: 610000, yoyPct: 6.5, note: "Grading, on-site utility, water/fiber." },
  { key: "shell", label: "Building Shell & Core", group: "Shell & Core", costPerMW: 1180000, yoyPct: 5.2, note: "Structure, envelope, roofing." },
  { key: "substation", label: "Utility Substation / Switchgear", group: "Electrical", costPerMW: 1620000, yoyPct: 18.5, note: "Long-lead. Transformer + switchgear inflation acute." },
  { key: "gensets", label: "Generators (N+1)", group: "Electrical", costPerMW: 1090000, yoyPct: 12.0, note: "18-24 month lead times persist." },
  { key: "ups", label: "UPS & Battery", group: "Electrical", costPerMW: 880000, yoyPct: 7.8, note: "Li-ion adoption rising vs VRLA." },
  { key: "eldist", label: "Electrical Distribution", group: "Electrical", costPerMW: 790000, yoyPct: 8.4, note: "Busway, PDUs, RPP, cabling." },
  { key: "cooling", label: "Cooling Plant (chillers/CDU)", group: "Mechanical", costPerMW: 1520000, yoyPct: 9.2, note: "Liquid-cooling ready adds cost/MW but enables density." },
  { key: "airhandling", label: "Air Handling / CRAH", group: "Mechanical", costPerMW: 520000, yoyPct: 6.0, note: "" },
  { key: "fitout", label: "White-Space Fit-out", group: "Fit-out", costPerMW: 720000, yoyPct: 5.5, note: "Racks, containment, commissioning." },
  { key: "design", label: "Design / PM / Permitting", group: "Soft Costs", costPerMW: 610000, yoyPct: 4.8, note: "A&E, owner's rep, entitlement." },
  { key: "contingency", label: "Contingency", group: "Soft Costs", costPerMW: 520000, yoyPct: 5.0, note: "~5% of hard cost." },
];

// ============================== INFLATION TRACKER ==========================
const inflation: InflationIndex[] = [
  { key: "cpi", label: "CPI (headline, YoY)", latest: 3.1, unit: "% YoY", yoyPct: 3.1, category: "Headline", history: series(18, 3.4, 3.1, 0.15, 2) },
  { key: "ppi_const", label: "PPI — Construction Materials", latest: 5.8, unit: "% YoY", yoyPct: 5.8, category: "Construction", history: series(18, 4.2, 5.8, 0.3, 2) },
  { key: "steel", label: "Structural Steel Index", latest: 118.4, unit: "index", yoyPct: 6.2, category: "Construction", history: series(18, 108, 118.4, 1.4, 1) },
  { key: "copper", label: "Copper ($/lb)", latest: 4.62, unit: "$/lb", yoyPct: 11.5, category: "Equipment", history: series(18, 4.05, 4.62, 0.12, 2) },
  { key: "transformer", label: "Transformer / Switchgear Index", latest: 164.0, unit: "index", yoyPct: 18.5, category: "Equipment", history: series(18, 132, 164, 2.5, 1), },
  { key: "genset", label: "Generator Set Index", latest: 141.2, unit: "index", yoyPct: 12.0, category: "Equipment", history: series(18, 122, 141.2, 1.8, 1) },
  { key: "labor", label: "Construction Labor (ECI)", latest: 4.9, unit: "% YoY", yoyPct: 4.9, category: "Labor", history: series(18, 5.4, 4.9, 0.1, 2) },
  { key: "power", label: "Industrial Power ($/kWh)", latest: 0.083, unit: "$/kWh", yoyPct: 7.4, category: "Energy", history: series(18, 0.075, 0.083, 0.003, 3) },
];

// ============================== PROJECTS (Underwriting Reports) =============
// Empty by design. Your underwriting projects come from your engine's .xlsx
// exports — the dashboard starts at zero for project data until you upload.
const projects: Project[] = [];

export function makeSeedData(): AppData {
  return {
    deals, comps, markets, firms, rates, costs, inflation, projects,
    meta: { lastRefresh: null, version: 3 },
  };
}
