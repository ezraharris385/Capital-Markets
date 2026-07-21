import React, { useLayoutEffect, useRef, useState, useCallback } from "react";

export const SERIES = ["var(--s1)","var(--s2)","var(--s3)","var(--s4)","var(--s5)","var(--s6)","var(--s7)","var(--s8)"];

// ---- responsive width measurement (crisp text, no viewBox blur) ----
function useMeasure(): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0].contentRect.width;
      if (cw > 0) setW(Math.round(cw));
    });
    ro.observe(el);
    setW(Math.round(el.getBoundingClientRect().width) || 600);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// ---- shared floating tooltip ----
interface TT { x: number; y: number; node: React.ReactNode }
function useTooltip() {
  const [tt, setTt] = useState<TT | null>(null);
  const show = useCallback((e: React.MouseEvent, node: React.ReactNode) => {
    setTt({ x: e.clientX, y: e.clientY, node });
  }, []);
  const hide = useCallback(() => setTt(null), []);
  const el = tt ? (
    <div className="viz-tooltip" style={{ left: tt.x, top: tt.y }}>{tt.node}</div>
  ) : null;
  return { show, hide, el };
}

function TTRow({ color, k, v, line }: { color?: string; k: string; v: string; line?: boolean }) {
  return (
    <div className="tt-row">
      {color && (line
        ? <span className="legend-line" style={{ background: color }} />
        : <span className="tooltip-dot" style={{ background: color }} />)}
      <span className="k">{k}</span><span className="v">{v}</span>
    </div>
  );
}

function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.5; v += step) ticks.push(v);
  return ticks;
}

// ============================================================================
// Sparkline
// ============================================================================
export function Sparkline({ data, color = "var(--accent)", width = 96, height = 30, fill = true }:
  { data: number[]; color?: string; width?: number; height?: number; fill?: boolean }) {
  if (!data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const rng = max - min || 1;
  const pad = 2;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / rng) * (height - pad * 2);
    return [x, y];
  });
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = `${d} L ${pts[pts.length - 1][0].toFixed(1)} ${height} L ${pts[0][0].toFixed(1)} ${height} Z`;
  const gid = "sg" + Math.abs(data[0] * 1000 | 0) + data.length;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.22" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.4} fill={color} />
    </svg>
  );
}

// ============================================================================
// Line / Area chart (multi-series, crosshair tooltip)
// ============================================================================
export interface LineSeries { name: string; color: string; data: number[] }
export function LineChart({ labels, series, height = 240, area = false, yFmt = (v: number) => String(Math.round(v)), valueSuffix = "" }:
  { labels: string[]; series: LineSeries[]; height?: number; area?: boolean; yFmt?: (v: number) => string; valueSuffix?: string }) {
  const [ref, W] = useMeasure();
  const { show, hide, el } = useTooltip();
  const [hoverI, setHoverI] = useState<number | null>(null);
  const padL = 46, padR = 16, padT = 12, padB = 26;
  const w = Math.max(W, 240);
  const iw = w - padL - padR, ih = height - padT - padB;
  const all = series.flatMap((s) => s.data);
  let min = Math.min(...all), max = Math.max(...all);
  const span = max - min || 1;
  min = min - span * 0.08; max = max + span * 0.08;
  const ticks = niceTicksRange(min, max, 4);
  const n = labels.length;
  const X = (i: number) => padL + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const Y = (v: number) => padT + (1 - (v - min) / (max - min)) * ih;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rx = e.clientX - rect.left;
    let i = Math.round(((rx - padL) / iw) * (n - 1));
    i = Math.max(0, Math.min(n - 1, i));
    setHoverI(i);
    show(e, <div>
      <div className="tt-title">{labels[i]}</div>
      {series.map((s) => <TTRow key={s.name} color={s.color} line k={s.name} v={yFmt(s.data[i]) + valueSuffix} />)}
    </div>);
  };
  const onLeave = () => { hide(); setHoverI(null); };

  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg width={w} height={height} onMouseMove={onMove} onMouseLeave={onLeave} style={{ display: "block" }}>
        {ticks.map((t, k) => (
          <g key={k}>
            <line x1={padL} x2={w - padR} y1={Y(t)} y2={Y(t)} stroke="var(--grid)" strokeWidth={1} />
            <text x={padL - 8} y={Y(t) + 3.5} textAnchor="end" fontSize={10.5} fill="var(--text-muted)" style={{ fontVariantNumeric: "tabular-nums" }}>{yFmt(t)}</text>
          </g>
        ))}
        {labels.map((lb, i) => (i % Math.ceil(n / 8) === 0 || i === n - 1) && (
          <text key={i} x={X(i)} y={height - 8} textAnchor="middle" fontSize={10.5} fill="var(--text-muted)">{lb}</text>
        ))}
        {hoverI != null && <line x1={X(hoverI)} x2={X(hoverI)} y1={padT} y2={padT + ih} stroke="var(--border-strong)" strokeWidth={1} />}
        {series.map((s) => {
          const dd = s.data.map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1)).join(" ");
          const areaD = `${dd} L ${X(n - 1).toFixed(1)} ${padT + ih} L ${X(0).toFixed(1)} ${padT + ih} Z`;
          const gid = "la" + s.name.replace(/\W/g, "");
          return (
            <g key={s.name}>
              {area && <>
                <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.16" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                </linearGradient></defs>
                <path d={areaD} fill={`url(#${gid})`} />
              </>}
              <path d={dd} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={X(n - 1)} cy={Y(s.data[n - 1])} r={4} fill={s.color} stroke="var(--surface-card)" strokeWidth={2} />
              {hoverI != null && <circle cx={X(hoverI)} cy={Y(s.data[hoverI])} r={4} fill={s.color} stroke="var(--surface-card)" strokeWidth={2} />}
            </g>
          );
        })}
      </svg>
      {el}
    </div>
  );
}

function niceTicksRange(min: number, max: number, count: number): number[] {
  const range = max - min || 1;
  const raw = range / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max; v += step) ticks.push(+v.toFixed(6));
  return ticks;
}

// ============================================================================
// Column chart (single series, vertical bars, hover)
// ============================================================================
export function ColumnChart({ labels, values, color = "var(--s1)", height = 240, valueFmt = (v: number) => String(v), barColors }:
  { labels: string[]; values: number[]; color?: string; height?: number; valueFmt?: (v: number) => string; barColors?: string[] }) {
  const [ref, W] = useMeasure();
  const { show, hide, el } = useTooltip();
  const padL = 46, padR = 14, padT = 12, padB = 30;
  const w = Math.max(W, 240);
  const iw = w - padL - padR, ih = height - padT - padB;
  const max = Math.max(...values, 0);
  const ticks = niceTicks(max, 4);
  const top = ticks[ticks.length - 1] || 1;
  const n = values.length;
  const band = iw / n;
  const bw = Math.min(24, band * 0.62);
  const Y = (v: number) => padT + (1 - v / top) * ih;
  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg width={w} height={height} style={{ display: "block" }}>
        {ticks.map((t, k) => (
          <g key={k}>
            <line x1={padL} x2={w - padR} y1={Y(t)} y2={Y(t)} stroke="var(--grid)" strokeWidth={1} />
            <text x={padL - 8} y={Y(t) + 3.5} textAnchor="end" fontSize={10.5} fill="var(--text-muted)" style={{ fontVariantNumeric: "tabular-nums" }}>{valueFmt(t)}</text>
          </g>
        ))}
        {values.map((v, i) => {
          const x = padL + band * i + (band - bw) / 2;
          const h = Math.max(0, (v / top) * ih);
          const y = padT + ih - h;
          const c = barColors ? barColors[i] : color;
          return (
            <g key={i}
              onMouseMove={(e) => show(e, <div><div className="tt-title">{labels[i]}</div><TTRow color={c} k="Value" v={valueFmt(v)} /></div>)}
              onMouseLeave={hide}>
              <rect x={x} y={padT} width={bw} height={ih} fill="transparent" />
              <rect x={x} y={y} width={bw} height={h} rx={4} fill={c} />
              <rect x={x} y={Math.min(y + h - 4, padT + ih - 0.5)} width={bw} height={Math.min(4, h)} fill={c} />
              <text x={x + bw / 2} y={height - 10} textAnchor="middle" fontSize={10.5} fill="var(--text-muted)">{labels[i]}</text>
            </g>
          );
        })}
      </svg>
      {el}
    </div>
  );
}

// ============================================================================
// Horizontal ranking bars (value at tip)
// ============================================================================
export function RankBars({ items, height, valueFmt = (v: number) => String(v), color = "var(--accent)" }:
  { items: { label: string; value: number; color?: string; sub?: string }[]; height?: number; valueFmt?: (v: number) => string; color?: string }) {
  const [ref, W] = useMeasure();
  const { show, hide, el } = useTooltip();
  const rowH = 34;
  const h = height ?? items.length * rowH + 8;
  const labelW = 132;
  const w = Math.max(W, 260);
  const valW = 66;
  const trackW = w - labelW - valW - 8;
  const max = Math.max(...items.map((i) => i.value), 0) || 1;
  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg width={w} height={h} style={{ display: "block" }}>
        {items.map((it, i) => {
          const y = i * rowH + 6;
          const bw = Math.max(2, (it.value / max) * trackW);
          const c = it.color || color;
          return (
            <g key={i} onMouseMove={(e) => show(e, <div><div className="tt-title">{it.label}</div><TTRow color={c} k={it.sub || "Value"} v={valueFmt(it.value)} /></div>)} onMouseLeave={hide}>
              <text x={0} y={y + rowH / 2 - 2} fontSize={12} fill="var(--text-secondary)" dominantBaseline="middle">{it.label.length > 19 ? it.label.slice(0, 18) + "…" : it.label}</text>
              <rect x={labelW} y={y + 4} width={trackW} height={rowH - 16} rx={4} fill="var(--surface-3)" />
              <rect x={labelW} y={y + 4} width={bw} height={rowH - 16} rx={4} fill={c} />
              <text x={labelW + trackW + valW} y={y + rowH / 2 - 2} textAnchor="end" fontSize={12} fill="var(--text-primary)" dominantBaseline="middle" style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{valueFmt(it.value)}</text>
            </g>
          );
        })}
      </svg>
      {el}
    </div>
  );
}

// ============================================================================
// Stacked horizontal bars (composition per row) — e.g. market MW mix
// ============================================================================
export interface StackSeg { key: string; color: string }
export function StackedRows({ rows, segs, height, valueFmt = (v: number) => String(Math.round(v)) }:
  { rows: { label: string; values: Record<string, number> }[]; segs: StackSeg[]; height?: number; valueFmt?: (v: number) => string }) {
  const [ref, W] = useMeasure();
  const { show, hide, el } = useTooltip();
  const rowH = 32;
  const h = height ?? rows.length * rowH + 8;
  const labelW = 150;
  const w = Math.max(W, 280);
  const trackW = w - labelW - 10;
  const totals = rows.map((r) => segs.reduce((a, s) => a + (r.values[s.key] || 0), 0));
  const max = Math.max(...totals, 0) || 1;
  const gap = 2;
  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg width={w} height={h} style={{ display: "block" }}>
        {rows.map((r, i) => {
          const y = i * rowH + 6;
          let x = labelW;
          const total = totals[i];
          return (
            <g key={i}>
              <text x={0} y={y + (rowH - 12) / 2 + 6} fontSize={11.5} fill="var(--text-secondary)">{r.label.length > 21 ? r.label.slice(0, 20) + "…" : r.label}</text>
              {segs.map((s) => {
                const v = r.values[s.key] || 0;
                if (v <= 0) return null;
                const bw = (v / max) * trackW;
                const rect = (
                  <rect key={s.key} x={x} y={y + 4} width={Math.max(0, bw - gap)} height={rowH - 14} rx={3} fill={s.color}
                    onMouseMove={(e) => show(e, <div><div className="tt-title">{r.label}</div>{segs.map((ss) => <TTRow key={ss.key} color={ss.color} k={ss.key} v={valueFmt(r.values[ss.key] || 0)} />)}<div className="hr" style={{ margin: "5px 0" }} /><TTRow k="Total" v={valueFmt(total)} /></div>)}
                    onMouseLeave={hide} />
                );
                x += bw;
                return rect;
              })}
            </g>
          );
        })}
      </svg>
      {el}
    </div>
  );
}

// ============================================================================
// Donut (composition)
// ============================================================================
export function Donut({ data, size = 180, thickness = 26, centerLabel, centerValue }:
  { data: { label: string; value: number; color: string }[]; size?: number; thickness?: number; centerLabel?: string; centerValue?: string }) {
  const { show, hide, el } = useTooltip();
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const gapDeg = 2; // surface gap
  return (
    <div className="row" style={{ gap: 18, alignItems: "center" }}>
      <svg width={size} height={size} style={{ flex: "none" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const len = circ * frac;
          const gap = circ * (gapDeg / 360);
          const dash = `${Math.max(0, len - gap)} ${circ - Math.max(0, len - gap)}`;
          const rot = (offset / total) * 360 - 90;
          offset += d.value;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={thickness}
              strokeDasharray={dash} strokeDashoffset={0} transform={`rotate(${rot} ${cx} ${cy})`}
              onMouseMove={(e) => show(e, <div><TTRow color={d.color} k={d.label} v={`${d.value.toLocaleString()} (${(frac * 100).toFixed(0)}%)`} /></div>)}
              onMouseLeave={hide} style={{ cursor: "pointer" }} />
          );
        })}
        {centerValue && <text x={cx} y={cy - 2} textAnchor="middle" fontSize={22} fontWeight={720} fill="var(--text-primary)">{centerValue}</text>}
        {centerLabel && <text x={cx} y={cy + 16} textAnchor="middle" fontSize={11} fill="var(--text-muted)">{centerLabel}</text>}
      </svg>
      <div className="col" style={{ gap: 7 }}>
        {data.map((d, i) => (
          <div key={i} className="legend-item">
            <span className="legend-swatch" style={{ background: d.color }} />
            <span style={{ color: "var(--text-secondary)" }}>{d.label}</span>
            <span style={{ marginLeft: "auto", fontWeight: 600, fontVariantNumeric: "tabular-nums", paddingLeft: 14 }}>{((d.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
      {el}
    </div>
  );
}

// ---- legend helper ----
export function Legend({ items, line }: { items: { label: string; color: string }[]; line?: boolean }) {
  return (
    <div className="legend">
      {items.map((it) => (
        <span key={it.label} className="legend-item">
          <span className={line ? "legend-line" : "legend-swatch"} style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
