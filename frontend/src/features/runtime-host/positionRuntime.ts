import { clamp } from "../../lib/format";
import type { ReservePosition } from "../../types";

export function normalizePayoutType(
  value: ReservePosition["payoutType"],
  flow: ReservePosition["flow"],
  type: ReservePosition["type"]
): ReservePosition["payoutType"] {
  if (value === "monthly" || value === "yearly" || value === "once") return value;
  if (value === "none" && flow === "income" && type === "incomeTemporary") return value;
  if (value === "none" && flow === "expense") return value;
  if (flow === "income" && type === "incomeYearly") return "yearly";
  return "monthly";
}

export function finiteIntegerInRange(value: unknown, min: number, max: number, fallback: number): number {
  return Math.round(clamp(finiteNumber(value, fallback), min, max));
}

export function finiteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
