import { calculateReserveSummary } from "./reserveCalculator";
import { positionPlanningYear } from "../lib/planningYears";
import { positionFlow } from "../lib/positionKinds";
import type { InvestmentSettings, PlanningSettings, ReservePosition } from "../types";

export type AnnualInvestmentTransferKind = "interest" | "cashback";

export interface AnnualInvestmentTransferPositionOptions {
  baseId: string;
  name: string;
  icon: string;
  kind: AnnualInvestmentTransferKind;
  settings: PlanningSettings;
  positions: ReservePosition[];
  startYear: number;
  endYear: number;
}

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

export function buildAnnualInvestmentTransferPositions(
  options: AnnualInvestmentTransferPositionOptions
): ReservePosition[] {
  const startYear = Math.round(options.startYear);
  const endYear = Math.max(startYear, Math.round(options.endYear));
  const actualValuesByYear = annualInvestmentTransferValuesByYear(options);
  const positiveActualValues = Array.from(actualValuesByYear.values()).filter((value) => value > 0);
  const forecastValue = positiveActualValues.length
    ? roundMoney(positiveActualValues.reduce((sum, value) => sum + value, 0) / positiveActualValues.length)
    : 0;
  const positions: ReservePosition[] = [];

  for (let year = startYear; year <= endYear; year += 1) {
    const actualValue = actualValuesByYear.get(year);
    const amount = actualValue !== undefined && actualValue > 0 ? actualValue : forecastValue;
    if (amount <= 0) continue;
    positions.push(annualInvestmentTransferPosition(options, year, amount));
  }

  return positions;
}

function annualInvestmentTransferValuesByYear(
  options: AnnualInvestmentTransferPositionOptions
): Map<number, number> {
  const startYear = Math.round(options.startYear);
  const endYear = Math.max(startYear, Math.round(options.endYear));
  const startPositions: ReservePosition[] = [];
  const positionsByYear = new Map<number, ReservePosition[]>();
  const valuesByYear = new Map<number, number>();

  for (const position of options.positions) {
    const planningYear = positionPlanningYear(position);
    if (planningYear === null) {
      startPositions.push(position);
      continue;
    }
    if (planningYear < startYear || planningYear > endYear) continue;
    positionsByYear.set(planningYear, [...(positionsByYear.get(planningYear) ?? []), position]);
  }

  const startYearPositions = positionsByYear.get(startYear);
  if (startYearPositions?.length) {
    valuesByYear.set(startYear, annualInvestmentTransferValue(options, startYear, startYearPositions));
  } else if (startPositions.length) {
    valuesByYear.set(startYear, annualInvestmentTransferValue(options, startYear, startPositions));
  }

  for (const [year, yearlyPositions] of positionsByYear) {
    if (year === startYear) continue;
    valuesByYear.set(year, annualInvestmentTransferValue(options, year, yearlyPositions));
  }

  return valuesByYear;
}

function annualInvestmentTransferValue(
  options: AnnualInvestmentTransferPositionOptions,
  year: number,
  positions: ReservePosition[]
): number {
  const summary = calculateReserveSummary({ ...options.settings, year }, positions);
  const value = options.kind === "interest" ? summary.totalInterest : summary.totalCashback;
  return roundMoney(Math.max(0, value));
}

function annualInvestmentTransferPosition(
  options: AnnualInvestmentTransferPositionOptions,
  year: number,
  amount: number
): ReservePosition {
  return {
    id: `${options.baseId}-${year}`,
    planningYear: year,
    flow: "expense",
    active: true,
    visible: false,
    name: options.name,
    icon: options.icon,
    type: "savings",
    amount,
    startMonth: 12,
    endMonth: 12,
    payoutType: "once",
    payoutYear: year,
    payoutMonth: 12,
    payoutDay: 31,
    interestBearing: false,
    cashback: false
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

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
