import React, { useMemo, useState } from "react";
import { Icon } from "./Icon";
import { SearchBox, EmptyState } from "./ui";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => number | string;
  sortable?: boolean;
  width?: number | string;
}

export interface Facet<T> {
  key: string;
  label: string;
  accessor: (row: T) => string;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  getSearchText: (row: T) => string;
  facets?: Facet<T>[];
  initialSort?: { key: string; dir: "asc" | "desc" };
  onRowClick?: (row: T) => void;
  rightActions?: (filtered: T[]) => React.ReactNode;
  searchPlaceholder?: string;
  dense?: boolean;
}

export function DataTable<T extends { id: string }>(props: Props<T>) {
  const { rows, columns, getSearchText, facets = [], initialSort, onRowClick, rightActions, searchPlaceholder } = props;
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(initialSort ?? null);
  const [facetVals, setFacetVals] = useState<Record<string, string>>({});

  const facetOptions = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const f of facets) {
      const set = new Set<string>();
      for (const r of rows) { const v = f.accessor(r); if (v) set.add(v); }
      m[f.key] = Array.from(set).sort();
    }
    return m;
  }, [rows, facets]);

  const filtered = useMemo(() => {
    let out = rows;
    const ql = q.trim().toLowerCase();
    if (ql) out = out.filter((r) => getSearchText(r).toLowerCase().includes(ql));
    for (const f of facets) {
      const val = facetVals[f.key];
      if (val && val !== "__all") out = out.filter((r) => f.accessor(r) === val);
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        const sv = col.sortValue;
        out = [...out].sort((a, b) => {
          const av = sv(a), bv = sv(b);
          let cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, q, facetVals, sort, columns, facets, getSearchText]);

  const toggleSort = (key: string) => {
    setSort((s) => s && s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" });
  };

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
        <SearchBox value={q} onChange={setQ} placeholder={searchPlaceholder || "Search…"} />
        {facets.map((f) => (
          <select key={f.key} className="select" style={{ width: "auto", minWidth: 130 }}
            value={facetVals[f.key] || "__all"} onChange={(e) => setFacetVals((v) => ({ ...v, [f.key]: e.target.value }))}>
            <option value="__all">All {f.label}</option>
            {facetOptions[f.key].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        {(q || Object.values(facetVals).some((v) => v && v !== "__all")) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setQ(""); setFacetVals({}); }}>Clear</button>
        )}
        <div className="spacer" />
        <span className="muted" style={{ fontSize: 12.5 }}>{filtered.length} of {rows.length}</span>
        {rightActions && rightActions(filtered)}
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div className="table-wrap">
          <table className="dt">
            <thead>
              <tr>
                {columns.map((c) => {
                  const sortable = c.sortable !== false && !!c.sortValue;
                  const active = sort?.key === c.key;
                  return (
                    <th key={c.key} className={(c.align === "right" ? "num " : "") + (sortable ? "" : "no-sort")}
                      style={{ width: c.width }} onClick={sortable ? () => toggleSort(c.key) : undefined}>
                      {c.header}
                      {active && <span className="sort-ind">{sort!.dir === "asc" ? "▲" : "▼"}</span>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} onClick={onRowClick ? () => onRowClick(r) : undefined} style={onRowClick ? { cursor: "pointer" } : undefined}>
                  {columns.map((c) => (
                    <td key={c.key} className={c.align === "right" ? "num" : ""}>{c.render(r)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <EmptyState msg="No records match your filters." />}
      </div>
    </div>
  );
}
