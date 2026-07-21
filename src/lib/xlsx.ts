import * as XLSX from "xlsx";

// Export an array of flat objects to an .xlsx file (single sheet).
export function exportRows(rows: Record<string, any>[], filename: string, sheetName = "Data") {
  const ws = XLSX.utils.json_to_sheet(rows);
  autoWidth(ws, rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
}

// Export a multi-sheet workbook.
export function exportWorkbook(sheets: { name: string; rows: Record<string, any>[] }[], filename: string) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{}]);
    autoWidth(ws, s.rows);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename);
}

function autoWidth(ws: XLSX.WorkSheet, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  ws["!cols"] = keys.map((k) => {
    const max = Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length));
    return { wch: Math.min(40, Math.max(10, max + 2)) };
  });
}

// Parse an uploaded file → array of row objects (first sheet).
export async function importFile(file: File): Promise<Record<string, any>[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: null });
}

// Download a blank template with the given headers + one example row.
export function downloadTemplate(headers: string[], example: Record<string, any>, filename: string) {
  const rows = [example];
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  autoWidth(ws, rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, filename);
}
