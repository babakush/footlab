// Generación de CSV compatible con Excel en español (separador ";", coma decimal, BOM UTF-8).

type Cell = string | number | boolean | null | undefined;

function escapeCell(value: Cell): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "number" ? String(value).replace(".", ",") : typeof value === "boolean" ? (value ? "sí" : "no") : String(value);
  // Evita la inyección de fórmulas al abrir el archivo en una hoja de cálculo.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[";\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCSV(headers: string[], rows: Cell[][]): string {
  return "﻿" + [headers, ...rows].map((r) => r.map(escapeCell).join(";")).join("\r\n") + "\r\n";
}
