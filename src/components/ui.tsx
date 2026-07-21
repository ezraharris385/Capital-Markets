import React from "react";
import { Icon } from "./Icon";
import { Sparkline } from "./charts";
import type { Source } from "../data/types";

export function Card({ title, sub, actions, children, pad = true, className = "" }:
  { title?: string; sub?: string; actions?: React.ReactNode; children: React.ReactNode; pad?: boolean; className?: string }) {
  return (
    <div className={"card " + className}>
      {(title || actions) && (
        <div className="card-head">
          <div>
            {title && <div className="card-title">{title}</div>}
            {sub && <div className="card-sub">{sub}</div>}
          </div>
          {actions && <div className="spacer" />}
          {actions}
        </div>
      )}
      <div className={pad ? "card-pad" : ""} style={pad && (title || actions) ? { paddingTop: 12 } : undefined}>{children}</div>
    </div>
  );
}

export function StatTile({ label, value, delta, deltaGood, sub, spark, sparkColor }:
  { label: string; value: string; delta?: string; deltaGood?: boolean; sub?: string; spark?: number[]; sparkColor?: string }) {
  const up = delta?.trim().startsWith("+") || delta?.trim().startsWith("▲");
  const good = deltaGood ?? up;
  return (
    <div className="card stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-row">
        {delta && <span className={"stat-delta " + (good ? "up" : "down")}>
          <Icon name={up ? "up" : "down"} size={13} /> {delta}
        </span>}
        {sub && <span className="stat-sub">{sub}</span>}
      </div>
      {spark && <div className="stat-spark"><Sparkline data={spark} color={sparkColor || (good ? "var(--up)" : "var(--down)")} width={84} height={26} /></div>}
    </div>
  );
}

export function SourceBadge({ source, flagged }: { source: Source; flagged?: boolean }) {
  return (
    <span className="row" style={{ gap: 6 }}>
      <span className={"badge " + (source === "public" ? "badge-neutral" : "badge-accent")}>
        {source === "public" ? "Public" : "Internal"}
      </span>
      {flagged && <span className="badge badge-warn" title="Flagged for redress — verify public data">⚑ Review</span>}
    </span>
  );
}

export function Delta({ v, suffix = "", goodUp = true, bps = false, decimals = 1 }:
  { v: number; suffix?: string; goodUp?: boolean; bps?: boolean; decimals?: number }) {
  const good = goodUp ? v >= 0 : v <= 0;
  const txt = (v >= 0 ? "+" : "") + (bps ? Math.round(v) + " bps" : v.toFixed(decimals) + suffix);
  return <span className={"stat-delta " + (good ? "up" : "down")} style={{ fontSize: "inherit" }}>
    <Icon name={v >= 0 ? "up" : "down"} size={12} /> {txt}
  </span>;
}

export function Segmented<T extends string>({ options, value, onChange }:
  { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? "active" : ""} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function PillTabs<T extends string>({ options, value, onChange }:
  { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="pill-tabs">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? "active" : ""} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = "Search…" }:
  { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="search">
      <Icon name="search" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value && <button className="btn-ghost" style={{ padding: 2, display: "flex" }} onClick={() => onChange("")}><Icon name="x" size={14} /></button>}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={wide ? { width: "min(880px, 95vw)" } : undefined} onClick={(e) => e.stopPropagation()}>
        <div className="card-head" style={{ padding: "18px 22px 8px", alignItems: "center" }}>
          <div className="card-title" style={{ fontSize: 16 }}>{title}</div>
          <div className="spacer" />
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div style={{ padding: "8px 22px 22px" }}>{children}</div>
      </div>
    </div>
  );
}

export function Drawer({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="card-head" style={{ padding: "18px 22px 12px", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
          <div className="card-title" style={{ fontSize: 16 }}>{title}</div>
          <div className="spacer" />
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div style={{ padding: "18px 22px", overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)" }}>{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ msg, icon = "search" }: { msg: string; icon?: string }) {
  return <div className="empty"><Icon name={icon} size={34} /><div>{msg}</div></div>;
}

export function powerBadge(avail: string) {
  const map: Record<string, string> = { Constrained: "badge-crit", Tight: "badge-serious", Moderate: "badge-warn", Ample: "badge-good" };
  return <span className={"badge " + (map[avail] || "badge-neutral")}>{avail}</span>;
}

export function stageBadge(stage: string) {
  const map: Record<string, string> = {
    "Closed": "badge-good", "Under Contract": "badge-accent", "LOI": "badge-warn",
    "Underwriting": "badge-neutral", "Sourcing": "badge-neutral", "Lost": "badge-crit",
  };
  return <span className={"badge " + (map[stage] || "badge-neutral")}>{stage}</span>;
}
