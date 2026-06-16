import { cleanText } from "../format";

export function parseCsv(text: string): string[][] {
  const delimiter = detectCsvDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const code = text.charCodeAt(index);
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((code === 10 || code === 13) && !inQuotes) {
      if (code === 13 && text.charCodeAt(index + 1) === 10) index += 1;
      row.push(cell.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

export function detectCsvDelimiter(text: string): ";" | "," {
  let firstLine = "";
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code === 10 || code === 13) break;
    firstLine += text[index];
  }

  let semicolons = 0;
  let commas = 0;
  for (const char of firstLine) {
    if (char === ";") semicolons += 1;
    if (char === ",") commas += 1;
  }
  return semicolons >= commas ? ";" : ",";
}

export function csvCell(value: unknown): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function parseMoneyValue(value: unknown): number {
  let cleaned = cleanText(value);
  cleaned = cleaned.replaceAll("€", "").replaceAll(" ", "").replaceAll(String.fromCharCode(160), "");
  cleaned = cleaned.replaceAll(".", "").replaceAll(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseBooleanValue(value: unknown, fallback: boolean): boolean {
  const normalized = cleanText(value).toLowerCase();
  if (normalized === "") return fallback;
  if (["ja", "yes", "true", "1", "x", "aktiv"].includes(normalized)) return true;
  if (["nein", "no", "false", "0", "inaktiv"].includes(normalized)) return false;
  return fallback;
}
