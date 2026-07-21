import React from "react";

// Minimal inline icon set (stroke-based). Keeps the bundle dependency-free.
const P: Record<string, React.ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>,
  pipeline: <><path d="M3 6h13"/><path d="M3 12h9"/><path d="M3 18h15"/><circle cx="19" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="21" cy="18" r="2"/></>,
  comps: <><path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/></>,
  markets: <><path d="M3 21h18"/><path d="M5 21V10l4-3 4 3 6-4v15"/><path d="M9 21v-5M13 21v-8"/></>,
  firms: <><rect x="3" y="4" width="8" height="16" rx="1"/><rect x="13" y="9" width="8" height="11" rx="1"/><path d="M6 8h2M6 12h2M6 16h2M16 13h2M16 17h2"/></>,
  capital: <><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.2c0-1.2 1.1-1.9 2.5-1.9s2.4.7 2.4 1.8c0 2.6-4.9 1.5-4.9 4.1 0 1.2 1.1 1.9 2.5 1.9s2.5-.7 2.5-1.9"/></>,
  costs: <><path d="M3 3v18h18"/><rect x="6" y="12" width="3" height="6"/><rect x="11" y="8" width="3" height="10"/><rect x="16" y="5" width="3" height="13"/></>,
  underwrite: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></>,
  ai: <><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><circle cx="18" cy="17" r="1.6"/><circle cx="6" cy="16" r="1.2"/></>,
  data: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7.7 1.6 1.6 0 01-3.2 0 1.6 1.6 0 00-2.7-.7l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.6 1.6 0 004.6 15a1.6 1.6 0 00-1.5-1H3a2 2 0 010-4h.1A1.6 1.6 0 004.6 9a1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 014 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1h.1a2 2 0 010 4h-.1a1.6 1.6 0 00-1.5 1z"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
  upload: <><path d="M12 15V4M8 8l4-4 4 4"/><path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3"/></>,
  download: <><path d="M12 4v11M8 11l4 4 4-4"/><path d="M4 19h16"/></>,
  refresh: <><path d="M20 11a8 8 0 10-.5 4"/><path d="M20 4v5h-5"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  send: <><path d="M4 12l16-7-7 16-2.5-6.5z"/></>,
  x: <><path d="M6 6l12 12M18 6L6 18"/></>,
  up: <><path d="M12 19V5M6 11l6-6 6 6"/></>,
  down: <><path d="M12 5v14M6 13l6 6 6-6"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></>,
  moon: <><path d="M21 12.8A8 8 0 1111.2 3a6.3 6.3 0 009.8 9.8z"/></>,
  check: <><path d="M20 6L9 17l-5-5"/></>,
  filter: <><path d="M3 5h18l-7 8v5l-4 2v-7z"/></>,
  bolt: <><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></>,
  link: <><path d="M9 15l6-6"/><path d="M11 6l1-1a4 4 0 015.7 5.7l-2 2"/><path d="M13 18l-1 1a4 4 0 01-5.7-5.7l2-2"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/></>,
  building: <><rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/></>,
  globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/></>,
  layers: <><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/></>,
  trend: <><path d="M3 17l6-6 4 4 8-8"/><path d="M21 7v5h-5"/></>,
  chevron: <><path d="M9 6l6 6-6 6"/></>,
  spark: <><path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5z"/></>,
  redress: <><path d="M12 3a9 9 0 100 18 9 9 0 000-18z"/><path d="M12 8v4l3 2"/><path d="M3.5 8.5A9 9 0 0112 3"/></>,
};

export function Icon({ name, size = 18, className, style }: { name: string; size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      {P[name] ?? P.info}
    </svg>
  );
}
