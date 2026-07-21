import type { AppData } from "../data/types";
import type { Settings } from "./store";
import { fmtUSD, fmtPct, compactNum } from "./format";

// Build a compact, information-dense digest of the live in-app data so the model
// can reason across markets, pipeline, comps, rates, costs and inflation at once.
export function buildDigest(data: AppData): string {
  const d = data;
  const pipeline = d.deals.filter((x) => x.stage !== "Closed" && x.stage !== "Lost");
  const totalPipe = pipeline.reduce((a, x) => a + x.value, 0);
  const wtdPipe = pipeline.reduce((a, x) => a + x.value * (x.probability / 100), 0);
  const closed = d.deals.filter((x) => x.stage === "Closed");
  const lines: string[] = [];

  lines.push(`# PIPELINE (${pipeline.length} active deals)`);
  lines.push(`Total pipeline value ${fmtUSD(totalPipe, { compact: true })}; probability-weighted ${fmtUSD(wtdPipe, { compact: true })}; closed YTD ${closed.length} (${fmtUSD(closed.reduce((a, x) => a + x.value, 0), { compact: true })}).`);
  for (const x of d.deals) {
    lines.push(`- ${x.name} | ${x.market} | ${x.dealType}/${x.assetType} | ${x.stage} | ${fmtUSD(x.value, { compact: true })} | ${x.sizeMW}MW | cap ${x.capRate ?? "n/a"} | ${x.probability}% | broker ${x.broker} | client ${x.client}`);
  }

  lines.push(`\n# MARKETS`);
  for (const m of d.markets) {
    lines.push(`- ${m.name} (${m.tier}): op ${m.operationalMW}MW, UC ${m.underConstructionMW}MW, planned ${m.plannedMW}MW, vacancy ${m.vacancyPct}%, 12mo absorption ${m.absorptionMW}MW, rent $${m.rentPerKwMonth}/kW/mo (${m.rentYoYPct}% YoY), land ${fmtUSD(m.landPerAcre, { compact: true })}/acre, power ${m.powerAvail} @ $${m.powerCostKwh}/kWh, ${m.preleasedPct}% preleased.`);
  }

  lines.push(`\n# CAPITAL MARKETS / RATES`);
  for (const r of d.rates) {
    lines.push(`- ${r.label}: ${r.value}${r.unit} (${r.changeBps >= 0 ? "+" : ""}${r.changeBps}bps)`);
  }

  lines.push(`\n# DEVELOPMENT COST STACK ($/MW critical IT)`);
  const totalCost = d.costs.reduce((a, c) => a + c.costPerMW, 0);
  lines.push(`All-in ~${fmtUSD(totalCost, { compact: true })}/MW.`);
  for (const c of d.costs) lines.push(`- ${c.label} (${c.group}): ${fmtUSD(c.costPerMW, { compact: true })}/MW, ${c.yoyPct}% YoY.`);

  lines.push(`\n# INFLATION TRACKER`);
  for (const i of d.inflation) lines.push(`- ${i.label}: ${i.latest}${i.unit === "index" ? "" : " " + i.unit} (${i.yoyPct}% YoY).`);

  lines.push(`\n# COMPS (recent, ${d.comps.length})`);
  for (const c of d.comps.slice(0, 20)) {
    if (c.type === "Sale") lines.push(`- SALE ${c.market} ${c.assetType} ${c.date}: ${fmtUSD(c.price || 0, { compact: true })}, ${c.pricePerKw ? "$" + c.pricePerKw + "/kW" : ""} cap ${c.capRate ?? "n/a"}% (${c.source}${c.flagged ? ", FLAGGED" : ""})`);
    else lines.push(`- LEASE ${c.market} ${c.assetType} ${c.date}: $${c.rentPerKwMonth}/kW/mo (${c.source}${c.flagged ? ", FLAGGED" : ""})`);
  }

  lines.push(`\n# FIRMS (activity trailing 12mo)`);
  for (const f of d.firms) lines.push(`- ${f.name} (${f.type}${f.ticker ? ", " + f.ticker : ""}): activity ${f.activityScore}/100, ${f.dealsL12M} deals, ~$${f.capitalDeployedB}B deployed. ${f.note}`);

  return lines.join("\n");
}

const SYSTEM = `You are the Meridian Analyst — a senior capital-markets and data-center advisory analyst embedded in a CBRE broker's intelligence platform. You answer with the precision of an institutional underwriting desk.

Rules:
- Ground every answer in the DATA SNAPSHOT provided. Cite specific figures (markets, cap rates, $/kW, MW, spreads).
- When a question spans markets/topics, synthesize across them (e.g. tie rate moves to cap rates to development spread to pipeline value).
- Be decisive and quantitative. Show the quick math when it helps. Use $/kW, $/MW, MW, bps, cap rate, YoC vocabulary correctly.
- Keep answers tight and skimmable: a one-line takeaway, then bullets. Bold the key number.
- If the data doesn't contain something, say so briefly rather than inventing it. Distinguish public vs internal sourced data when relevant.
- Frame implications for a brokerage-focused broker (deal angles, who to call, pricing guidance) when useful.`;

export interface ChatMsg { role: "user" | "assistant"; content: string }

export async function askAnalyst(
  history: ChatMsg[],
  data: AppData,
  settings: Settings
): Promise<string> {
  const question = history[history.length - 1]?.content || "";
  if (!settings.anthropicKey) {
    return localAnalyst(question, data);
  }
  const digest = buildDigest(data);
  const messages = history.map((m) => ({ role: m.role, content: m.content }));
  // Prepend the data snapshot to the first user message context via system.
  const body = {
    model: settings.model || "claude-sonnet-5",
    max_tokens: 1400,
    system: SYSTEM + "\n\n===== LIVE DATA SNAPSHOT =====\n" + digest,
    messages,
  };
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": settings.anthropicKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  const text = (json.content || []).map((c: any) => c.text || "").join("").trim();
  return text || "(No response)";
}

// ---------------------------------------------------------------------------
// Local heuristic analyst — works with zero API key so the panel is always useful.
// ---------------------------------------------------------------------------
export function localAnalyst(q: string, data: AppData): string {
  const s = q.toLowerCase();
  const pipeline = data.deals.filter((x) => x.stage !== "Closed" && x.stage !== "Lost");
  const num = (n: number) => fmtUSD(n, { compact: true });

  const pick = <T,>(arr: T[], f: (x: T) => number, top = 3, asc = false) =>
    [...arr].sort((a, b) => (asc ? f(a) - f(b) : f(b) - f(a))).slice(0, top);

  if (/(pipeline|deal flow|weighted|how much.*deal)/.test(s)) {
    const total = pipeline.reduce((a, x) => a + x.value, 0);
    const wtd = pipeline.reduce((a, x) => a + x.value * x.probability / 100, 0);
    const byStage: Record<string, number> = {};
    pipeline.forEach((x) => (byStage[x.stage] = (byStage[x.stage] || 0) + x.value));
    return `**${num(total)}** across ${pipeline.length} active deals; probability-weighted **${num(wtd)}**.\n\n` +
      Object.entries(byStage).map(([k, v]) => `- ${k}: ${num(v)}`).join("\n") +
      `\n\nTop by value:\n` + pick(pipeline, (x) => x.value).map((x) => `- ${x.name} — ${num(x.value)} (${x.probability}%)`).join("\n") +
      `\n\n_Connect an Anthropic key in Settings for full cross-market analysis._`;
  }
  if (/(absorption|demand|hottest|tightest|vacancy|which market)/.test(s)) {
    const byAbs = pick(data.markets, (m) => m.absorptionMW);
    const tight = pick(data.markets, (m) => -m.vacancyPct, 3);
    return `Tightest / highest-demand markets:\n` +
      byAbs.map((m) => `- **${m.name}** — ${m.absorptionMW}MW absorbed, ${m.vacancyPct}% vacancy, $${m.rentPerKwMonth}/kW/mo (${m.rentYoYPct}% YoY), power ${m.powerAvail}`).join("\n") +
      `\n\nLowest vacancy: ${tight.map((m) => `${m.name} (${m.vacancyPct}%)`).join(", ")}.` +
      `\n\n_Connect an Anthropic key in Settings for deeper synthesis._`;
  }
  if (/(rate|cap rate|spread|treasury|debt|financing)/.test(s)) {
    return `Current capital-markets snapshot:\n` +
      data.rates.map((r) => `- ${r.label}: **${r.value}${r.unit}** (${r.changeBps >= 0 ? "+" : ""}${r.changeBps}bps)`).join("\n") +
      `\n\n_Connect an Anthropic key in Settings to interpret these against your pipeline._`;
  }
  if (/(cost|build|construction|\$\/mw|inflation|transformer|equipment)/.test(s)) {
    const total = data.costs.reduce((a, c) => a + c.costPerMW, 0);
    const hot = pick(data.costs, (c) => c.yoyPct);
    return `All-in development cost ≈ **${num(total)}/MW** critical IT load.\n\nFastest-inflating components:\n` +
      hot.map((c) => `- ${c.label}: ${c.yoyPct}% YoY (${num(c.costPerMW)}/MW)`).join("\n") +
      `\n\n_Connect an Anthropic key in Settings for scenario analysis._`;
  }
  if (/(firm|who|active|hyperscaler|buyer|investor|competitor)/.test(s)) {
    const active = pick(data.firms, (f) => f.activityScore);
    return `Most active firms (trailing 12mo):\n` +
      active.map((f) => `- **${f.name}** (${f.type}) — activity ${f.activityScore}/100, ${f.dealsL12M} deals, ~$${f.capitalDeployedB}B. ${f.note}`).join("\n") +
      `\n\n_Connect an Anthropic key in Settings for relationship-mapping._`;
  }
  return `I can analyze your live data on **pipeline & deal flow**, **market fundamentals & absorption**, **rates & cap rates**, **construction costs & inflation**, and **firm activity**.\n\nAsk me something like _"What's my weighted pipeline?"_ or _"Which markets are tightest?"_\n\n**Tip:** add an Anthropic API key in Settings to unlock full cross-market reasoning — the analyst will then combine every dataset to answer nuanced questions.`;
}
