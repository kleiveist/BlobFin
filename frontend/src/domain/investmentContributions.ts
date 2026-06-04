import { isOneTimePayoutInMonth, isSavingsActiveInMonth } from "./reserveCalculator";
import { positionFlow } from "../lib/positionKinds";
import type { InvestmentSettings, ReservePosition } from "../types";

export function investmentContributionForMonth(position: ReservePosition, year: number, month: number): number {
  if (position.payoutType === "once") return 0;
  if (!isSavingsActiveInMonth(position, year, month)) return 0;
  if (position.payoutType === "yearly") {
    return Number(position.payoutMonth) === month ? Number(position.amount) : 0;
  }
  return Number(position.amount);
}

export function oneTimeInvestmentContributionForMonth(
  position: ReservePosition,
  year: number,
  month: number
): number {
  if (position.payoutType === "once") {
    return isOneTimePayoutInMonth(position, year, month) ? Number(position.amount) : 0;
  }
  if (position.payoutType === "none") return investmentContributionForMonth(position, year, month);
  return 0;
}

export function selectedMonthlyPattern(
  positions: ReservePosition[],
  settings: InvestmentSettings,
  year: number
): number[] {
  const selectedPositions = positions.filter(
    (position) =>
      position.type === "savings" &&
      positionFlow(position) === "expense" &&
      settings.includedIds.includes(position.id) &&
      position.active
  );
  const pattern: number[] = [];

  for (let month = 1; month <= 12; month += 1) {
    pattern.push(
      selectedPositions.reduce((sum, position) => {
        return sum + investmentContributionForMonth(position, year, month);
      }, 0)
    );
  }

  return pattern;
}

export function selectedInvestmentContributionForProjectionMonth(
  positions: ReservePosition[],
  settings: InvestmentSettings,
  baseYear: number,
  projectionMonthIndex: number
): number {
  const calendarYear = baseYear + Math.floor(projectionMonthIndex / 12);
  const month = (projectionMonthIndex % 12) + 1;
  return selectedInvestmentPositions(positions, settings).reduce((sum, position) => {
    if (position.payoutType === "once") {
      return sum + oneTimeInvestmentContributionForMonth(position, calendarYear, month);
    }
    return sum + investmentContributionForMonth(position, calendarYear, month);
  }, 0);
}

export function selectedInvestmentContributionForProjectionYear(
  positions: ReservePosition[],
  settings: InvestmentSettings,
  baseYear: number,
  projectionYearIndex: number
): number {
  const firstMonthIndex = projectionYearIndex * 12;
  let total = 0;
  for (let offset = 0; offset < 12; offset += 1) {
    total += selectedInvestmentContributionForProjectionMonth(positions, settings, baseYear, firstMonthIndex + offset);
  }
  return total;
}

export function selectedSavingsContributionForProjectionYear(
  positions: ReservePosition[],
  selectedIds: string[],
  baseYear: number,
  projectionYearIndex: number
): number {
  const selected = new Set(selectedIds);
  const calendarYear = baseYear + projectionYearIndex;
  let total = 0;
  for (let month = 1; month <= 12; month += 1) {
    total += positions.reduce((sum, position) => {
      if (
        !position.active ||
        position.type !== "savings" ||
        positionFlow(position) !== "expense" ||
        !selected.has(position.id)
      ) {
        return sum;
      }
      if (position.payoutType === "once") {
        return sum + oneTimeInvestmentContributionForMonth(position, calendarYear, month);
      }
      return sum + investmentContributionForMonth(position, calendarYear, month);
    }, 0);
  }
  return total;
}

export function selectedRecurringInvestmentContributionForProjectionYear(
  positions: ReservePosition[],
  settings: InvestmentSettings,
  baseYear: number,
  projectionYearIndex: number
): number {
  const calendarYear = baseYear + projectionYearIndex;
  let total = 0;
  for (let month = 1; month <= 12; month += 1) {
    total += selectedInvestmentPositions(positions, settings).reduce((sum, position) => {
      if (position.payoutType === "once" || position.payoutType === "none") return sum;
      return sum + investmentContributionForMonth(position, calendarYear, month);
    }, 0);
  }
  return total;
}

export function selectedOneTimeInvestmentContributionForProjectionMonth(
  positions: ReservePosition[],
  settings: InvestmentSettings,
  baseYear: number,
  projectionMonthIndex: number
): number {
  const calendarYear = baseYear + Math.floor(projectionMonthIndex / 12);
  const month = (projectionMonthIndex % 12) + 1;
  return selectedInvestmentPositions(positions, settings).reduce((sum, position) => {
    return sum + oneTimeInvestmentContributionForMonth(position, calendarYear, month);
  }, 0);
}

export function selectedInvestmentStartYear(
  positions: ReservePosition[],
  settings: InvestmentSettings,
  fallbackYear: number
): number {
  return selectedInvestmentPositions(positions, settings).reduce((earliestYear, position) => {
    const startYear = Number(position.payoutYear || fallbackYear);
    return Number.isFinite(startYear) ? Math.min(earliestYear, startYear) : earliestYear;
  }, fallbackYear);
}

function selectedInvestmentPositions(positions: ReservePosition[], settings: InvestmentSettings): ReservePosition[] {
  return positions.filter(
    (position) =>
      position.type === "savings" &&
      positionFlow(position) === "expense" &&
      settings.includedIds.includes(position.id) &&
      position.active
  );
}
