import * as XLSX from "xlsx";

/**
 * Parse a CSV / XLS / XLSX buffer into { sheetName, headers, rows }.
 * Rows are plain objects keyed by (de-duplicated) header names.
 */
export function parseSpreadsheet(buffer, maxRows = 50000) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("The file has no sheets.");

  const raw = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  });
  if (raw.length < 2) throw new Error("The sheet needs a header row and at least one data row.");
  if (raw.length - 1 > maxRows) {
    throw new Error(`Sheet has ${raw.length - 1} rows; the limit is ${maxRows}.`);
  }

  const headers = normalizeHeaders(raw[0]);
  const rows = raw.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = normalizeCell(cells[i]);
    });
    return obj;
  });

  return { sheetName, headers, rows };
}

export function normalizeHeaders(cells) {
  const seen = new Map();
  return cells.map((cell, i) => {
    let name = String(cell ?? "").trim() || `column_${i + 1}`;
    // MongoDB field names must not contain "." or start with "$"
    name = name.replace(/\./g, "_").replace(/^\$/, "_");
    const count = seen.get(name) || 0;
    seen.set(name, count + 1);
    return count ? `${name}_${count + 1}` : name;
  });
}

function normalizeCell(value) {
  if (value === undefined || value === "") return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") {
    const t = value.trim();
    return t === "" ? null : t;
  }
  return value;
}
