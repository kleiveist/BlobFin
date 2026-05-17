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
  if (!isOneTimePayoutInMonth(position, year, month)) return 0;
  return Number(position.amount);
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

function selectedInvestmentPositions(positions: ReservePosition[], settings: InvestmentSettings): ReservePosition[] {
  return positions.filter(
    (position) =>
      position.type === "savings" &&
      positionFlow(position) === "expense" &&
      settings.includedIds.includes(position.id) &&
      position.active
  );
}
