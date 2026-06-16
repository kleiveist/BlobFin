export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function numberOrDefault(value: unknown, fallback: number): number {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function nullableNumberOrDefault(value: unknown, fallback: number | null): number | null {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function stringArrayOrDefault(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.map(String);
}

export function booleanOrDefault(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

export function normalizePlanningYearSelection(value: unknown, fallback: number | null): number | null {
  if (value === null || value === undefined || value === "" || value === "start") return null;
  const parsed = Math.round(numberOrDefault(value, Number.NaN));
  return Number.isFinite(parsed) && parsed >= 2000 && parsed <= 2200 ? parsed : fallback;
}

export function arrayOrEmpty(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
