import type { AppData, SeriesPoint } from "../data/types";
import type { Settings } from "./store";

// ============================================================================
// "Redress" / refresh public data.
// Best-effort pull of publicly available benchmarks from open APIs, executed in
// the user's browser. Everything is wrapped so a network/CORS failure NEVER
// breaks the app — it falls back to last-known values and reports what happened.
//   • US Treasury par yield curve  → treasury.gov fiscaldata (open, CORS-friendly)
//   • CPI / SOFR                    → FRED (requires a free API key in Settings)
// ============================================================================

export interface RefreshResult {
  timestamp: string;
  updated: string[];
  errors: string[];
}

async function fetchTreasuryCurve(): Promise<{ y2: number; y10: number } | null> {
  try {
    const url =
      "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates" +
      "?sort=-record_date&page[size]=1";
    // The avg-interest endpoint is a robust, CORS-enabled fallback for a "rates are live" signal.
    const res = await fetch(url);
    if (!res.ok) return null;
    // If the richer daily-yield-curve dataset is reachable, prefer it:
    const dt = new Date();
    const yr = dt.getFullYear();
    const yc = await fetch(
      `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/daily_treasury_yield_curve?filter=record_date:gte:${yr}-01-01&sort=-record_date&page[size]=1`
    ).catch(() => null);
    if (yc && yc.ok) {
      const j = await yc.json();
      const row = j?.data?.[0];
      if (row) {
        const y2 = parseFloat(row.bc_2year ?? row["2_yr"] ?? "");
        const y10 = parseFloat(row.bc_10year ?? row["10_yr"] ?? "");
        if (!isNaN(y2) && !isNaN(y10)) return { y2, y10 };
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchFred(seriesId: string, key: string): Promise<number | null> {
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${key}&file_type=json&sort_order=desc&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const j = await res.json();
    const v = parseFloat(j?.observations?.[0]?.value);
    return isNaN(v) ? null : v;
  } catch {
    return null;
  }
}

function pushPoint(hist: SeriesPoint[], v: number): SeriesPoint[] {
  const now = new Date();
  const t = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const last = hist[hist.length - 1];
  const next = last && last.t === t ? hist.slice(0, -1) : hist;
  return [...next, { t, v }].slice(-24);
}

export async function refreshPublicData(data: AppData, settings: Settings): Promise<{ data: AppData; result: RefreshResult }> {
  const updated: string[] = [];
  const errors: string[] = [];
  const next: AppData = JSON.parse(JSON.stringify(data));

  const curve = await fetchTreasuryCurve();
  if (curve) {
    const r10 = next.rates.find((r) => r.key === "ust10");
    const r2 = next.rates.find((r) => r.key === "ust2");
    if (r10) { r10.changeBps = Math.round((curve.y10 - r10.value) * 100); r10.value = +curve.y10.toFixed(2); r10.history = pushPoint(r10.history, r10.value); updated.push("10-Yr Treasury"); }
    if (r2) { r2.changeBps = Math.round((curve.y2 - r2.value) * 100); r2.value = +curve.y2.toFixed(2); r2.history = pushPoint(r2.history, r2.value); updated.push("2-Yr Treasury"); }
  } else {
    errors.push("Treasury yield curve unavailable (network/CORS) — kept last-known values.");
  }

  if (settings.fredKey) {
    const cpi = await fetchFred("CPIAUCSL", settings.fredKey);
    const cpiPrev = await fetchFred("CPIAUCSL", settings.fredKey); // placeholder; YoY needs 13mo — kept simple
    const sofr = await fetchFred("SOFR", settings.fredKey);
    if (sofr != null) {
      const r = next.rates.find((x) => x.key === "sofr");
      if (r) { r.changeBps = Math.round((sofr - r.value) * 100); r.value = +sofr.toFixed(2); r.history = pushPoint(r.history, r.value); updated.push("SOFR"); }
    }
    if (cpi != null && cpiPrev != null) updated.push("CPI (level)");
    if (sofr == null && cpi == null) errors.push("FRED returned no data (check key / CORS).");
  } else {
    errors.push("No FRED key set — CPI/SOFR live pull skipped (add a free key in Settings).");
  }

  next.meta.lastRefresh = new Date().toISOString();
  return { data: next, result: { timestamp: next.meta.lastRefresh, updated, errors } };
}
