import { MONTHS } from "../data/defaults";
import type { PayoutType, PositionType } from "../types";

export function money(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

export function intNumber(value: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(Number(value || 0));
}

export function percent(value: number | string): string {
  return `${new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(numberValue(value))} %`;
}

export function numberValue(value: number | string | null | undefined): number {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number(value || 0)));
}

export function formatCsvNumber(value: number): string {
  return Number(value || 0).toFixed(2).replace(".", ",");
}

export function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function normalizeHeader(value: unknown): string {
  let text = cleanText(value).toLowerCase();
  text = text.replaceAll("ä", "ae").replaceAll("ö", "oe").replaceAll("ü", "ue").replaceAll("ß", "ss");

  let normalized = "";
  for (const char of text) {
    const code = char.charCodeAt(0);
    const isLetter = code >= 97 && code <= 122;
    const isNumber = code >= 48 && code <= 57;
    if (isLetter || isNumber) normalized += char;
  }
  return normalized;
}

export function cleanText(value: unknown): string {
  let text = String(value ?? "").trim();
  if (text.charCodeAt(0) === 65279) text = text.slice(1);
  return text.trim();
}

export function labelForType(type: PositionType): string {
  if (type === "fixed") return "Fixbestand";
  if (type === "reserve") return "Monatliche Ruecklage";
  return "Temporaer monatlich";
}

export function labelForPayout(type: PayoutType): string {
  if (type === "monthly") return "monatlich";
  if (type === "yearly") return "jaehrlich";
  return "kein Abgang";
}

export function makeHeaderLabel(name: string): string {
  const escaped = escapeHtml(name);
  if (escaped.length <= 18) return escaped;
  return escaped.replaceAll(" ", "<br>");
}

export function monthName(monthNumber: number): string {
  return MONTHS[monthNumber - 1] ?? String(monthNumber);
}
