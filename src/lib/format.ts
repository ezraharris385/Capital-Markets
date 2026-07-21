// Formatting helpers — one source of truth for how numbers render across the app.

export function fmtUSD(n: number | null | undefined, opts: { compact?: boolean; decimals?: number } = {}): string {
  if (n == null || isNaN(n as number)) return "—";
  const { compact = false, decimals } = opts;
  if (compact) return "$" + compactNum(n, decimals ?? 1);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: decimals ?? 0 }).format(n);
}

export function compactNum(n: number, decimals = 1): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e12) return sign + (abs / 1e12).toFixed(decimals) + "T";
  if (abs >= 1e9) return sign + (abs / 1e9).toFixed(decimals) + "B";
  if (abs >= 1e6) return sign + (abs / 1e6).toFixed(decimals) + "M";
  if (abs >= 1e3) return sign + (abs / 1e3).toFixed(decimals) + "K";
  return sign + abs.toFixed(0);
}

export function fmtNum(n: number | null | undefined, decimals = 0): string {
  if (n == null || isNaN(n as number)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(n);
}

export function fmtPct(n: number | null | undefined, decimals = 1): string {
  if (n == null || isNaN(n as number)) return "—";
  return n.toFixed(decimals) + "%";
}

export function fmtMW(n: number | null | undefined, decimals = 0): string {
  if (n == null || isNaN(n as number)) return "—";
  return fmtNum(n, decimals) + " MW";
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtMonthYear(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export function signed(n: number, decimals = 1): string {
  return (n >= 0 ? "+" : "") + n.toFixed(decimals);
}

export function id(prefix = "id"): string {
  return prefix + "_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}
