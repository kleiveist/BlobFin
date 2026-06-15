import { defaultPlanningSettings } from "../data/defaults";
import type { PlanningYearSelection, ReservePosition } from "../types";

export const PLANNING_YEAR_HORIZON = 15;

export function planningYearOptions(startYear = defaultPlanningSettings().year): number[] {
  const firstYear = Math.round(Number(startYear) || defaultPlanningSettings().year);
  return Array.from({ length: PLANNING_YEAR_HORIZON + 1 }, (_, index) => firstYear + index);
}

export function sanitizePlanningYearSelection(
  value: unknown,
  startYear = defaultPlanningSettings().year
): PlanningYearSelection {
  if (value === null || value === undefined || value === "" || value === "start") return null;
  const parsed = Math.round(Number(String(value).replace(",", ".")));
  if (!Number.isFinite(parsed)) return null;
  return planningYearOptions(startYear).includes(parsed) ? parsed : null;
}

export function normalizePositionPlanningYear(value: unknown): PlanningYearSelection {
  if (value === null || value === undefined || value === "" || value === "start") return null;
  const parsed = Math.round(Number(String(value).replace(",", ".")));
  return Number.isFinite(parsed) && parsed >= 2000 && parsed <= 2200 ? parsed : null;
}

export function positionPlanningYear(position: ReservePosition): PlanningYearSelection {
  if (position.payoutType === "once") return normalizePositionPlanningYear(position.payoutYear);
  return normalizePositionPlanningYear(position.planningYear);
}

export function positionsForPlanningYear(
  positions: ReservePosition[],
  selectedYear: PlanningYearSelection
): ReservePosition[] {
  return positions.filter((position) => positionPlanningYear(position) === selectedYear);
}

export function positionsForPlanningYearWithMonthlySavingsCarryover(
  positions: ReservePosition[],
  selectedYear: PlanningYearSelection,
  startYear = defaultPlanningSettings().year
): ReservePosition[] {
  return positions.filter(
    (position) =>
      positionPlanningYear(position) === selectedYear ||
      isMonthlySavingsCarryoverPosition(position, selectedYear, startYear)
  );
}

function isMonthlySavingsCarryoverPosition(
  position: ReservePosition,
  selectedYear: PlanningYearSelection,
  startYear: number
): boolean {
  if (selectedYear === null) return false;
  if (position.type !== "savings" || position.payoutType !== "monthly") return false;
  const firstYear = positionPlanningYear(position) ?? startYear;
  return firstYear <= selectedYear;
}
