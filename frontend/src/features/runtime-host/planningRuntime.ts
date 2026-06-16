import { clamp, numberValue } from "../../lib/format";
import type { PlanningSettings } from "../../types";

type NumericPlanningSetting = Exclude<keyof PlanningSettings, "endDate">;

export function planningSettingNumberValue(field: NumericPlanningSetting, value: string): number {
  const numericValue = clamp(numberValue(value), settingMin(field), settingMax(field));
  return field === "year" ? Math.round(numericValue) : numericValue;
}

export function normalizePlanningEndDate(value: unknown, minYear: number): string {
  const fallbackYear = clamp(Math.round(minYear), settingMin("year"), 2200);
  const parsed = planningDateParts(value);
  if (!parsed) return `${fallbackYear}-12-31`;
  if (parsed.year < fallbackYear) return `${fallbackYear}-12-31`;
  const year = clamp(parsed.year, settingMin("year"), 2200);
  return `${year}-${String(parsed.month).padStart(2, "0")}-${String(parsed.day).padStart(2, "0")}`;
}

export function planningDateParts(value: unknown): { year: number; month: number; day: number } | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { year: Math.round(value), month: 12, day: 31 };
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const yearOnly = /^(\d{4})$/.exec(trimmed);
  if (yearOnly) {
    return { year: Number(yearOnly[1]), month: 12, day: 31 };
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  const maxDay = new Date(year, month, 0).getDate();
  if (day < 1 || day > maxDay) return null;
  return { year, month, day };
}

export function settingMin(field: keyof PlanningSettings): number {
  if (field === "year") return 2000;
  return 0;
}

export function settingMax(field: keyof PlanningSettings): number {
  if (field === "year") return 2100;
  return Number.MAX_SAFE_INTEGER;
}
