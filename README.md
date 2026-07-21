# Meridian — Capital Markets & Data-Center Brokerage Intelligence

A single, self-contained web application that tracks everything a data-center
capital-markets desk cares about — pipeline & deal flow, sale/lease comps,
market fundamentals, firm activity, rates & cap rates, construction costs &
inflation — plus a **reliable underwriting model**, an **AI analyst** that
answers questions across all of it, and **Excel import/export** throughout.

Built for desktop, dark-first, and designed to be handed to a brokerage-focused
broker who wants capital-markets intelligence without the capital-markets jargon.

---

## Quick start (see it on your computer)

```bash
npm install       # one time
npm run dev        # starts the app at http://localhost:5173
```

Open **http://localhost:5173** in your browser. That's it — it loads with a full
sample dataset so everything is populated on first run.

To make a shareable version for someone else:

```bash
npm run build      # produces a static site in ./dist
npm run preview    # serves the built site locally to check it
```

The `dist/` folder is a plain static website. To give your boss a **link**, drag
that folder onto **Vercel** (vercel.com), **Netlify** (app.netlify.com/drop), or
**Cloudflare Pages** — each gives you a URL in ~30 seconds, no account setup
required beyond a free sign-in. (Or push to GitHub and enable GitHub Pages.)

---

## What's inside

| Section | What it does |
|---|---|
| **Overview** | Executive snapshot — pipeline value, weighted pipeline, fees, market pulse (rates/caps), pipeline by stage & market, hottest markets. |
| **Deal Pipeline** | Full deal database: add/edit/delete, stage summary, probability-weighting, fees, search + filter + sort, Excel export. |
| **Comparables** | Sale & lease comps (public + internal), pricing analytics ($/kW, cap rate, $/kW/mo), and the **Redress** queue to verify public data. |
| **Markets** | Supply composition (operational / under-construction / planned MW), lease rates, land pricing, and **power availability** — the binding constraint. |
| **Firms & Activity** | Who's buying, building, leasing — hyperscalers, operators, REITs, investors, lenders — with activity scores and capital deployed. |
| **Capital Markets** | Rates, spreads, cap rates, and the **development spread** (build-to-core margin) with 18-month history. |
| **Costs & Inflation** | Development cost stack ($/MW by system) and an input-price inflation tracker (transformers, copper, gensets, labor, power). |
| **Underwriting** | Deterministic development & investment model — YoC, dev margin, levered/unlevered IRR, equity multiple, DSCR, debt yield, cash-flow chart, and a sensitivity grid. |
| **AI Analyst** | Chat that reasons across **all** the live data. Works with an Anthropic key, or in a built-in local mode with no key. |
| **Data & Sources** | Upload Excel, download templates, export any dataset or the full workbook, run the redress queue, reset data. |

---

## Design decisions (the questions you asked)

**Excel or "premade math"?** — Use Excel as the *loading dock*, not the engine.
Spreadsheet formulas break silently, can't be versioned, and can't be trusted
across files. So: **data moves in/out as `.xlsx`**, but the underwriting and
analytics **math lives in versioned, deterministic code** (`src/lib/underwriting.ts`).
Every number on the Underwriting screen is derived live and is auditable. You get
downloadable Excel templates for import and one-click export everywhere.

**Reliability of the underwriting.** The model is calibrated to realistic
hyperscale economics (≈$10.4M/MW all-in, net rent to landlord, power tenant-paid),
producing a stabilized yield-on-cost in the high-8s and a development spread that
matches what public data-center REITs report — not an inflated headline number.

**"Redress" for public info.** Every record is tagged `internal` vs `public`.
Public-sourced comps flow into a **Redress queue** where you verify them against
the source before they inform a valuation. The top-bar **Redress** button also
pulls live public benchmarks (US Treasury yield curve; CPI/SOFR with a free FRED
key) and always falls back to last-known values if a source can't be reached.

**Local-first & private.** All your data lives in *your browser* (localStorage).
Nothing leaves unless you export, refresh public data, or ask the AI. No server to
run or maintain.

**AI analyst.** Add an Anthropic API key in Settings to unlock full cross-market
reasoning (the app sends a live snapshot of your data as grounding). With no key,
a built-in local analyst still answers common questions from your data.

---

## Tech

- **React + TypeScript + Vite** — fast, static, deployable anywhere.
- **Hand-built SVG charts** following an accessible, colorblind-safe palette
  (no chart library dependency).
- **SheetJS (xlsx)** for Excel import/export.
- No backend required. No database to host.

## Configuration (Settings screen)

- **Anthropic API key** — powers the AI Analyst (`console.anthropic.com`). Stored
  only in your browser; used to call Anthropic directly from the page.
- **FRED API key** *(optional, free)* — enables live CPI/SOFR on Redress.
- **Identity** — your name and firm, shown in the sidebar.
- **Theme** — dark (default) or light.
