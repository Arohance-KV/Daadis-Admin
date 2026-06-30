// RFC-4180 CSV string builder (pure). The Blob download wrapper lives in the
// component layer (DOM-only, not unit-tested).
function cell(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(rows = [], columns = []) {
  const header = columns.map((c) => cell(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => cell(row[c.key])).join(","));
  return [header, ...lines].join("\r\n");
}
