import { positionFlow } from "../lib/positionKinds";
import type { InvestmentSettings, ReservePosition } from "../types";

export function investmentContributionForMonth(position: ReservePosition, year: number, month: number): number {
  if (position.payoutType === "once") return 0;
  if (!isInvestmentSavingsActiveInMonth(position, year, month)) return 0;
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
    return isOneTimeInvestmentPayoutInMonth(position, year, month) ? Number(position.amount) : 0;
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

export function investmentSavingsSelectionSummary(
  positions: ReservePosition[],
  selectedIds: string[],
  baseYear: number
): { selectedCount: number; yearlyAmount: number } {
  const selected = new Set(selectedIds);
  const savingsPositions = selectableInvestmentSavingsPositions(positions);
  return {
    selectedCount: savingsPositions.filter((position) => selected.has(position.id)).length,
    yearlyAmount: selectedSavingsContributionForProjectionYear(savingsPositions, selectedIds, baseYear, 0)
  };
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
    const startYear = investmentPositionYear(position, fallbackYear);
    return Number.isFinite(startYear) ? Math.min(earliestYear, startYear) : earliestYear;
  }, fallbackYear);
}

export function selectableInvestmentSavingsPositions(positions: ReservePosition[]): ReservePosition[] {
  return positions.filter(
    (position) => position.active && position.type === "savings" && positionFlow(position) === "expense"
  );
}

function selectedInvestmentPositions(positions: ReservePosition[], settings: InvestmentSettings): ReservePosition[] {
  return selectableInvestmentSavingsPositions(positions).filter((position) => settings.includedIds.includes(position.id));
}

function isInvestmentSavingsActiveInMonth(position: ReservePosition, year: number, monthNumber: number): boolean {
  if (!position.active || position.type !== "savings") return false;
  const startYear = investmentPositionYear(position, year);
  if (position.payoutType === "none") {
    return (
      year === startYear &&
      monthNumber >= Number(position.startMonth || 1) &&
      monthNumber <= Number(position.endMonth || 12)
    );
  }
  if (year < startYear) return false;
  return year > startYear || monthNumber >= Number(position.startMonth || 1);
}

function isOneTimeInvestmentPayoutInMonth(position: ReservePosition, year: number, monthNumber: number): boolean {
  return (
    position.active &&
    position.payoutType === "once" &&
    investmentPositionYear(position, year) === year &&
    Number(position.payoutMonth) === monthNumber
  );
}

function investmentPositionYear(position: ReservePosition, fallbackYear: number): number {
  const planningYear = Number(position.planningYear);
  if (position.planningYear !== null && position.planningYear !== undefined && Number.isFinite(planningYear)) {
    return planningYear;
  }
  const payoutYear = Number(position.payoutYear || fallbackYear);
  return Number.isFinite(payoutYear) ? payoutYear : fallbackYear;
}
