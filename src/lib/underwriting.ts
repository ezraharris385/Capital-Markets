// ============================================================================
// Data-center development & investment underwriting engine.
// All logic is deterministic and unit-testable — the single source of truth for
// the model. Spreadsheets import/export the INPUTS; the math lives here.
// ============================================================================

export interface UWInputs {
  sizeMW: number;              // critical IT load
  devCostPerMW: number;        // all-in development cost $/MW
  leaseRateKwMonth: number;    // $/kW/month (on critical load)
  opexPctRevenue: number;      // landlord opex as % of revenue (triple-net => low)
  rentEscalatorPct: number;    // annual lease escalator %
  stabilizationMonths: number; // months to reach stabilized NOI
  stabilizedCapRate: number;   // market cap for value-on-completion (%)
  exitCapRate: number;         // exit/disposition cap (%)
  holdYears: number;
  ltcPct: number;              // loan-to-cost (leverage) %
  interestRatePct: number;     // debt coupon %, interest-only
  saleCostPct: number;         // disposition cost % of gross sale
}

// Defaults are calibrated to realistic hyperscale development economics:
// ~$10.4M/MW all-in cost and a NET rent to landlord (~$80/kW/mo, excl. power
// pass-through) produce a stabilized yield-on-cost in the high-8s — in line
// with public data-center REIT development yields — not a headline gross figure.
export const defaultInputs: UWInputs = {
  sizeMW: 48,
  devCostPerMW: 10440000,
  leaseRateKwMonth: 80,     // NET rent to landlord ($/kW/mo); power is tenant-paid
  opexPctRevenue: 6,        // triple-net: minimal landlord opex
  rentEscalatorPct: 2.5,
  stabilizationMonths: 18,
  stabilizedCapRate: 6.5,
  exitCapRate: 6.75,
  holdYears: 7,
  ltcPct: 55,
  interestRatePct: 6.4,
  saleCostPct: 1.0,
};

// Headline market wholesale pricing ($/kW/mo, gross of power) → net rent to the
// landlord for underwriting. ~60% net factor reflects power/opex pass-through.
export const NET_RENT_FACTOR = 0.6;

export interface UWOutputs {
  totalCost: number;
  grossRentAnnual: number;
  stabilizedNOI: number;
  yieldOnCost: number;         // %
  stabilizedValue: number;     // NOI / stabilizedCap
  developmentProfit: number;   // value - cost
  developmentMargin: number;   // %
  developmentSpreadBps: number;// (YoC - stabilizedCap) in bps
  loanAmount: number;
  equity: number;
  annualDebtService: number;
  dscr: number;
  debtYield: number;           // %
  exitValue: number;
  netSaleProceeds: number;
  leveredIRR: number | null;   // %
  unleveredIRR: number | null; // %
  equityMultiple: number;
  profitOnCost: number;        // total profit $ over hold (levered)
  cashFlows: number[];         // levered equity CF incl. t0
}

function irr(cashflows: number[]): number | null {
  // bisection on NPV(rate)=0 over a wide bracket
  const npv = (rate: number) => cashflows.reduce((a, cf, t) => a + cf / Math.pow(1 + rate, t), 0);
  let lo = -0.9, hi = 2.0;
  const nlo = npv(lo), nhi = npv(hi);
  if (isNaN(nlo) || isNaN(nhi) || nlo * nhi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const nm = npv(mid);
    if (Math.abs(nm) < 1e-4) return mid * 100;
    if (nlo * nm < 0) hi = mid; else lo = mid;
  }
  return ((lo + hi) / 2) * 100;
}

export function underwrite(inp: UWInputs): UWOutputs {
  const kw = inp.sizeMW * 1000;
  const totalCost = inp.sizeMW * inp.devCostPerMW;
  const grossRentAnnual = inp.leaseRateKwMonth * 12 * kw;
  const stabilizedNOI = grossRentAnnual * (1 - inp.opexPctRevenue / 100);
  const yieldOnCost = (stabilizedNOI / totalCost) * 100;
  const stabilizedValue = stabilizedNOI / (inp.stabilizedCapRate / 100);
  const developmentProfit = stabilizedValue - totalCost;
  const developmentMargin = (developmentProfit / totalCost) * 100;
  const developmentSpreadBps = (yieldOnCost - inp.stabilizedCapRate) * 100;

  const loanAmount = totalCost * (inp.ltcPct / 100);
  const equity = totalCost - loanAmount;
  const annualDebtService = loanAmount * (inp.interestRatePct / 100); // interest-only
  const dscr = annualDebtService > 0 ? stabilizedNOI / annualDebtService : Infinity;
  const debtYield = loanAmount > 0 ? (stabilizedNOI / loanAmount) * 100 : Infinity;

  // NOI at exit year (escalated), exit value on forward NOI
  const esc = 1 + inp.rentEscalatorPct / 100;
  const noiAtHold = stabilizedNOI * Math.pow(esc, inp.holdYears);
  const forwardNOI = noiAtHold * esc;
  const exitValue = forwardNOI / (inp.exitCapRate / 100);
  const grossSale = exitValue;
  const netSaleProceeds = grossSale * (1 - inp.saleCostPct / 100) - loanAmount;

  // Levered equity cash flows (t0 outflow = equity; annual NOI - debt service; exit adds net sale)
  const cf: number[] = [-equity];
  for (let y = 1; y <= inp.holdYears; y++) {
    const noiY = stabilizedNOI * Math.pow(esc, y - 1);
    let flow = noiY - annualDebtService;
    if (y === inp.holdYears) flow += netSaleProceeds;
    cf.push(flow);
  }
  const leveredIRR = irr(cf);

  // Unlevered
  const ucf: number[] = [-totalCost];
  for (let y = 1; y <= inp.holdYears; y++) {
    const noiY = stabilizedNOI * Math.pow(esc, y - 1);
    let flow = noiY;
    if (y === inp.holdYears) flow += grossSale * (1 - inp.saleCostPct / 100);
    ucf.push(flow);
  }
  const unleveredIRR = irr(ucf);

  // distributions = total cash returned to equity across the hold (incl. exit)
  const distributions = cf.slice(1).reduce((a, b) => a + b, 0);
  const equityMultiple = equity > 0 ? distributions / equity : 0; // MOIC
  const profitOnCost = distributions - equity;                    // net levered profit ($)

  return {
    totalCost, grossRentAnnual, stabilizedNOI, yieldOnCost, stabilizedValue,
    developmentProfit, developmentMargin, developmentSpreadBps,
    loanAmount, equity, annualDebtService, dscr, debtYield,
    exitValue, netSaleProceeds, leveredIRR, unleveredIRR,
    equityMultiple, profitOnCost,
    cashFlows: cf,
  };
}

// Sensitivity grid: rows = exit cap rates, cols = lease rate; cell = levered IRR
export function sensitivity(base: UWInputs, capDeltas: number[], rentDeltas: number[]) {
  return capDeltas.map((dc) =>
    rentDeltas.map((dr) => {
      const out = underwrite({ ...base, exitCapRate: base.exitCapRate + dc, leaseRateKwMonth: base.leaseRateKwMonth + dr });
      return { cap: base.exitCapRate + dc, rent: base.leaseRateKwMonth + dr, irr: out.leveredIRR ?? 0, yoc: out.yieldOnCost };
    })
  );
}
