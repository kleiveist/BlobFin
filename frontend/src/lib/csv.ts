import { createId, MONTHS } from "../data/defaults";
import { calculateMonthlyRows } from "../domain/reserveCalculator";
import {
  cleanText,
  clamp,
  formatCsvNumber,
  labelForPayout,
  labelForType,
  monthName,
  normalizeHeader
} from "./format";
import type { PlanningSettings, PayoutType, PositionType, ReservePosition } from "../types";

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

export function positionsFromCsvRows(rows: string[][]): ReservePosition[] {
  if (!rows.length) return [];

  const header = rows[0].map(normalizeHeader);
  const hasHeader = header.includes("name") || header.includes("betrag") || header.includes("art");
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const get = (row: string[], keys: string[], fallbackIndex: number): string => {
    if (hasHeader) {
      for (const key of keys) {
        const index = header.indexOf(key);
        if (index >= 0) return row[index] ?? "";
      }
    }
    return fallbackIndex >= 0 ? row[fallbackIndex] ?? "" : "";
  };

  return dataRows
    .map((row) => {
      const name = cleanText(get(row, ["name", "position"], 1));
      const amount = parseMoneyValue(get(row, ["betrag", "amount"], 3));
      if (!name) return null;

      const position: ReservePosition = {
        id: createId(),
        active: parseBooleanValue(get(row, ["aktiv", "active"], 0), true),
        name,
        type: parseTypeValue(get(row, ["art", "type"], 2)),
        amount,
        startMonth: parseMonthValue(get(row, ["startmonat", "start"], 4), 1),
        endMonth: parseMonthValue(get(row, ["endmonat", "ende", "end"], 5), 12),
        payoutType: parsePayoutValue(get(row, ["abgang", "payout", "abgangsart"], 6)),
        payoutMonth: parseMonthValue(get(row, ["abgangsmonat", "payoutmonth"], 7), 12),
        payoutDay: clamp(parseMoneyValue(get(row, ["abgangstag", "payoutday"], 8)) || 31, 1, 31),
        cashback: parseBooleanValue(get(row, ["cashback", "cashbackfrage"], 9), false)
      };
      if (position.type !== "temporary") position.cashback = false;
      if (position.payoutType === "once") {
        position.startMonth = position.payoutMonth;
        position.endMonth = position.payoutMonth;
      }

      if (position.startMonth > position.endMonth) {
        const startMonth = position.startMonth;
        position.startMonth = position.endMonth;
        position.endMonth = startMonth;
      }

      return position;
    })
    .filter((position): position is ReservePosition => position !== null);
}

export function exportPositionsCsv(positions: ReservePosition[]): string {
  const rows = [
    ["Aktiv", "Name", "Art", "Betrag", "Startmonat", "Endmonat", "Abgang", "Abgangsmonat", "Abgangstag", "Cashback"]
  ];

  for (const position of positions) {
    rows.push([
      position.active ? "Ja" : "Nein",
      position.name,
      labelForType(position.type),
      formatCsvNumber(position.amount),
      monthName(position.startMonth),
      monthName(position.endMonth),
      labelForPayout(position.payoutType),
      monthName(position.payoutMonth),
      String(position.payoutDay),
      position.cashback ? "Ja" : "Nein"
    ]);
  }

  return rows.map((row) => row.map(csvCell).join(";")).join("\n");
}

export function exportYearTableCsv(settings: PlanningSettings, positions: ReservePosition[]): string {
  const rows = calculateMonthlyRows(settings, positions);
  const activePositions = positions.filter((position) => position.active && position.payoutType !== "once");
  const csvRows = [
    [
      "Monat",
      ...activePositions.map((position) => position.name),
      "Verplant ohne Fixbestand",
      "Netto uebrig",
      "Max. benoetigter Kontostand am Monatsanfang",
      "Dauerhafter Bestand nach Abgaengen",
      "ca. Monatszins",
      "Cashback"
    ]
  ];

  for (const row of rows) {
    csvRows.push([
      row.month,
      ...activePositions.map((position) => formatCsvNumber(row.values[position.id] || 0)),
      formatCsvNumber(row.plannedOutflow),
      formatCsvNumber(row.monthlyRemaining),
      formatCsvNumber(row.maxNeeded),
      formatCsvNumber(row.permanentAfterMonthlyOutflows),
      formatCsvNumber(row.monthlyInterest),
      formatCsvNumber(row.monthlyCashback)
    ]);
  }

  return csvRows.map((row) => row.map(csvCell).join(";")).join("\n");
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

function parseBooleanValue(value: unknown, fallback: boolean): boolean {
  const normalized = cleanText(value).toLowerCase();
  if (["ja", "yes", "true", "1", "x", "aktiv"].includes(normalized)) return true;
  if (["nein", "no", "false", "0", "inaktiv", ""].includes(normalized)) return false;
  return fallback;
}

function parseTypeValue(value: unknown): PositionType {
  const normalized = normalizeHeader(value);
  if (["fixbestand", "fixed", "fix"].includes(normalized)) return "fixed";
  if (["monatlicheruecklage", "ruecklage", "reserve", "monthlyreserve"].includes(normalized)) return "reserve";
  if (["temporaermonatlich", "temporarmonatlich", "temporary", "durchlauf"].includes(normalized)) return "temporary";
  if (["sparrate", "sparen", "saving", "savings", "investment", "investitionsrate"].includes(normalized)) {
    return "savings";
  }
  return "reserve";
}

function parsePayoutValue(value: unknown): PayoutType {
  const normalized = normalizeHeader(value);
  if (["keinabgang", "keiner", "none", "nein", ""].includes(normalized)) return "none";
  if (["monatlich", "monthly"].includes(normalized)) return "monthly";
  if (["jaehrlich", "jahrlich", "yearly", "annual"].includes(normalized)) return "yearly";
  if (["einmalig", "einmal", "once", "single", "onetime"].includes(normalized)) return "once";
  return "none";
}

function parseMonthValue(value: unknown, fallback: number): number {
  const normalized = normalizeHeader(value);
  const number = Number(normalized);
  if (Number.isFinite(number) && number >= 1 && number <= 12) return number;
  const index = MONTHS.map(normalizeHeader).indexOf(normalized);
  return index >= 0 ? index + 1 : fallback;
}
