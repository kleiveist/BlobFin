import { MONTHS } from "../data/defaults";
import { isExpensePosition, isIncomePosition } from "../lib/positionKinds";
import type { MonthlyReserveRow, PlanningSettings, ReservePosition, ReserveSummary } from "../types";

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function isActiveInMonth(position: ReservePosition, monthNumber: number): boolean {
  return position.active && monthNumber >= Number(position.startMonth) && monthNumber <= Number(position.endMonth);
}

export function isSavingsActiveInMonth(position: ReservePosition, year: number, monthNumber: number): boolean {
  if (!position.active || position.type !== "savings") return false;
  const startYear = Number(position.payoutYear || year);
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

export function isOneTimePayoutInMonth(position: ReservePosition, year: number, monthNumber: number): boolean {
  return (
    position.active &&
    position.payoutType === "once" &&
    Number(position.payoutYear) === year &&
    Number(position.payoutMonth) === monthNumber
  );
}

function calculateYearlyReserveCycleBalance(position: ReservePosition, monthNumber: number): number {
  const payoutMonth = Number(position.payoutMonth);
  const cycleMonth = ((monthNumber - payoutMonth + 11) % 12) + 1;
  return Number(position.amount) * cycleMonth;
}

export function calculatePositionValueAtMonthStart(
  position: ReservePosition,
  year: number,
  monthNumber: number
): number {
  if (isIncomePosition(position)) return 0;
  if (position.type === "savings") {
    if (!isSavingsActiveInMonth(position, year, monthNumber)) return 0;
    return position.payoutType === "once" ? 0 : Number(position.amount);
  }
  if (!isActiveInMonth(position, monthNumber)) return 0;

  if (position.payoutType === "once") return 0;
  if (position.type === "fixed") return Number(position.amount);
  if (position.type === "temporary") return Number(position.amount);
  if (position.type === "reserve" && position.payoutType === "yearly") {
    return calculateYearlyReserveCycleBalance(position, monthNumber);
  }

  let balance = 0;
  for (let month = 1; month <= monthNumber; month += 1) {
    if (isActiveInMonth(position, month)) balance += Number(position.amount);
    if (position.payoutType === "monthly" && isActiveInMonth(position, month)) balance = 0;
    if (isSingleMonthPayout(position) && month < monthNumber && isPayoutMonth(position, month)) {
      balance = 0;
    }
  }

  return balance;
}

export function calculatePositionEndOfMonthPermanent(position: ReservePosition, monthNumber: number): number {
  if (isIncomePosition(position)) return 0;
  if (!position.active) return 0;
  if (position.payoutType === "once") return 0;

  if (position.type === "fixed") {
    return isActiveInMonth(position, monthNumber) ? Number(position.amount) : 0;
  }
  if (position.type === "temporary" || position.type === "savings") return 0;
  if (position.type === "reserve" && position.payoutType === "yearly" && isActiveInMonth(position, monthNumber)) {
    return isPayoutMonth(position, monthNumber) ? 0 : calculateYearlyReserveCycleBalance(position, monthNumber);
  }

  let balance = 0;
  for (let month = 1; month <= monthNumber; month += 1) {
    if (isActiveInMonth(position, month)) balance += Number(position.amount);
    if (position.payoutType === "monthly" && isActiveInMonth(position, month)) balance = 0;
    if (isSingleMonthPayout(position) && isPayoutMonth(position, month) && month <= monthNumber) {
      balance = 0;
    }
  }

  return balance;
}

export function calculateInterestForSingleMonth(
  position: ReservePosition,
  year: number,
  monthNumber: number,
  annualRate: number
): number {
  if (isIncomePosition(position)) return 0;
  if (!position.active || !position.interestBearing) return 0;
  if (position.type === "savings" && !isSavingsActiveInMonth(position, year, monthNumber)) return 0;
  if (position.type !== "savings" && !isActiveInMonth(position, monthNumber)) return 0;
  if (position.payoutType === "once") return 0;

  const monthIndex = monthNumber - 1;
  const dim = daysInMonth(year, monthIndex);

  if (position.type === "fixed") return (Number(position.amount) * annualRate) / 12;

  if (position.type === "temporary" || position.type === "savings") {
    const payoutDay = Math.max(1, Math.min(Number(position.payoutDay || dim), dim));
    return (Number(position.amount) * annualRate * payoutDay) / 365;
  }

  const balance = calculatePositionValueAtMonthStart(position, year, monthNumber);
  let daysHeld = dim;
  if (position.payoutType === "monthly") daysHeld = Math.max(1, Math.min(Number(position.payoutDay || dim), dim));
  if (isSingleMonthPayout(position) && isPayoutMonth(position, monthNumber)) {
    daysHeld = Math.max(1, Math.min(Number(position.payoutDay || dim), dim));
  }
  return (balance * annualRate * daysHeld) / 365;
}

export function calculateInterestForPosition(position: ReservePosition, year: number, annualRate: number): number {
  let interest = 0;
  for (let month = 1; month <= 12; month += 1) {
    interest += calculateInterestForSingleMonth(position, year, month, annualRate);
  }
  return interest;
}

export function calculateCashbackForPosition(position: ReservePosition, year: number, cashbackRate: number): number {
  let cashback = 0;
  for (let month = 1; month <= 12; month += 1) {
    cashback += calculateCashbackForSingleMonth(position, year, month, cashbackRate);
  }
  return cashback;
}

export function calculateCashbackForSingleMonth(
  position: ReservePosition,
  year: number,
  monthNumber: number,
  cashbackRate: number
): number {
  if (isIncomePosition(position)) return 0;
  if (!position.active || !position.cashback || position.type !== "temporary") return 0;
  if (position.payoutType === "once") {
    return isOneTimePayoutInMonth(position, year, monthNumber) ? Number(position.amount) * cashbackRate : 0;
  }
  if (!isActiveInMonth(position, monthNumber)) return 0;
  if (position.payoutType === "monthly") return Number(position.amount) * cashbackRate;
  if (position.payoutType === "yearly" && isPayoutMonth(position, monthNumber)) {
    return Number(position.amount) * cashbackRate;
  }

  return 0;
}

export function calculatePlannedOutflowForSingleMonth(
  position: ReservePosition,
  year: number,
  monthNumber: number
): number {
  if (!position.active || isIncomePosition(position) || position.type === "fixed") return 0;
  if (position.payoutType === "once") {
    return isOneTimePayoutInMonth(position, year, monthNumber) ? Number(position.amount) : 0;
  }
  if (position.type === "savings") {
    if (!isSavingsActiveInMonth(position, year, monthNumber)) return 0;
    return position.payoutType === "yearly" && !isPayoutMonth(position, monthNumber) ? 0 : Number(position.amount);
  }
  if (!isActiveInMonth(position, monthNumber)) return 0;
  if (position.type === "reserve") return Number(position.amount);
  if (position.payoutType === "yearly") return isPayoutMonth(position, monthNumber) ? Number(position.amount) : 0;
  return Number(position.amount);
}

export function calculatePlannedIncomeForSingleMonth(
  position: ReservePosition,
  year: number,
  monthNumber: number
): number {
  if (!position.active || !isIncomePosition(position)) return 0;
  if (position.payoutType === "once") {
    return isOneTimePayoutInMonth(position, year, monthNumber) ? Number(position.amount) : 0;
  }
  if (!isIncomeActiveInMonth(position, year, monthNumber)) return 0;
  if (position.payoutType === "yearly" || position.type === "incomeYearly") {
    return isPayoutMonth(position, monthNumber) ? Number(position.amount) : 0;
  }
  return Number(position.amount);
}

function isIncomeActiveInMonth(position: ReservePosition, year: number, monthNumber: number): boolean {
  if (!isActiveInMonth(position, monthNumber)) return false;
  const payoutYear = Number(position.payoutYear || year);
  if (position.type === "incomeTemporary" || position.payoutType === "none") return year === payoutYear;
  return year >= payoutYear;
}

function isSingleMonthPayout(position: ReservePosition): boolean {
  return position.payoutType === "yearly" || position.payoutType === "once";
}

function isPayoutMonth(position: ReservePosition, monthNumber: number): boolean {
  return Number(position.payoutMonth) === monthNumber;
}

function normalizedPositionName(name: string): string {
  return name
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function reserveCoversExpenseInMonth(position: ReservePosition, year: number, monthNumber: number): boolean {
  if (!position.active || position.type !== "reserve") return false;
  if (position.payoutType === "monthly") return isActiveInMonth(position, monthNumber);
  if (position.payoutType === "yearly") return isActiveInMonth(position, monthNumber) && isPayoutMonth(position, monthNumber);
  if (position.payoutType === "once") return isOneTimePayoutInMonth(position, year, monthNumber);
  return false;
}

function reserveFundedExpenseNamesForMonth(
  positions: ReservePosition[],
  year: number,
  monthNumber: number
): Set<string> {
  return new Set(
    positions
      .filter((position) => reserveCoversExpenseInMonth(position, year, monthNumber))
      .map((position) => normalizedPositionName(position.name))
      .filter(Boolean)
  );
}

function isReserveFundedExpense(position: ReservePosition, reserveFundedExpenseNames: Set<string>): boolean {
  return (
    isExpensePosition(position) &&
    position.type === "temporary" &&
    reserveFundedExpenseNames.has(normalizedPositionName(position.name))
  );
}

export function calculateMonthlyRows(settings: PlanningSettings, positions: ReservePosition[]): MonthlyReserveRow[] {
  const rows: MonthlyReserveRow[] = [];
  const annualRate = settings.interestRatePercent / 100;
  const cashbackRate = settings.cashbackRatePercent / 100;

  for (let month = 1; month <= 12; month += 1) {
    const reserveFundedExpenseNames = reserveFundedExpenseNamesForMonth(positions, settings.year, month);
    const values: Record<string, number> = {};
    let plannedIncome = 0;
    let maxNeeded = 0;
    let plannedOutflow = 0;
    let permanentAfterMonthlyOutflows = 0;
    let monthlyInterest = 0;
    let monthlyCashback = 0;

    for (const position of positions) {
      if (!position.active) {
        values[position.id] = 0;
        continue;
      }

      const income = calculatePlannedIncomeForSingleMonth(position, settings.year, month);
      const value = isIncomePosition(position)
        ? income
        : calculatePositionValueAtMonthStart(position, settings.year, month);
      values[position.id] = value;
      plannedIncome += income;
      if (isExpensePosition(position)) maxNeeded += value;
      const outflow = calculatePlannedOutflowForSingleMonth(position, settings.year, month);
      plannedOutflow += isReserveFundedExpense(position, reserveFundedExpenseNames) ? 0 : outflow;
      permanentAfterMonthlyOutflows += calculatePositionEndOfMonthPermanent(position, month);
      monthlyInterest += calculateInterestForSingleMonth(position, settings.year, month, annualRate);
      monthlyCashback += calculateCashbackForSingleMonth(position, settings.year, month, cashbackRate);
    }

    rows.push({
      monthNumber: month,
      month: MONTHS[month - 1],
      values,
      plannedIncome,
      maxNeeded,
      plannedOutflow,
      monthlyRemaining: plannedIncome - plannedOutflow,
      permanentAfterMonthlyOutflows,
      monthlyInterest,
      monthlyCashback
    });
  }

  return rows;
}

export function calculateYearTableFooterValue(position: ReservePosition, rows: MonthlyReserveRow[], year: number): number {
  if (isIncomePosition(position)) {
    return rows.reduce((sum, row) => sum + (row.values[position.id] || 0), 0);
  }
  if (position.type === "reserve") {
    return rows.reduce((sum, row) => sum + calculatePlannedOutflowForSingleMonth(position, year, row.monthNumber), 0);
  }
  return rows[11]?.values[position.id] || 0;
}

export function calculateReserveSummary(settings: PlanningSettings, positions: ReservePosition[]): ReserveSummary {
  const rows = calculateMonthlyRows(settings, positions);
  const activePositions = positions.filter((position) => position.active && position.payoutType !== "once");
  const visiblePositions = activePositions.filter((position) => position.visible);
  const maxRow = rows.reduce((best, row) => (row.maxNeeded > best.maxNeeded ? row : best), rows[0]);
  const minRemainingRow = rows.reduce(
    (lowest, row) => (row.monthlyRemaining < lowest.monthlyRemaining ? row : lowest),
    rows[0]
  );
  const annualRate = settings.interestRatePercent / 100;
  const totalInterest = positions.reduce(
    (sum, position) => sum + calculateInterestForPosition(position, settings.year, annualRate),
    0
  );
  const totalCashback = rows.reduce((sum, row) => sum + row.monthlyCashback, 0);
  const totalPlannedIncome = rows.reduce((sum, row) => sum + row.plannedIncome, 0);
  const totalPlannedOutflow = rows.reduce((sum, row) => sum + row.plannedOutflow, 0);
  const yearlyRemaining = totalPlannedIncome - totalPlannedOutflow;
  const yearEndBalance = rows[11]?.permanentAfterMonthlyOutflows || 0;

  return {
    rows,
    activePositions,
    visiblePositions,
    maxRow,
    minRemainingRow,
    totalPlannedIncome,
    totalPlannedOutflow,
    yearlyRemaining,
    totalInterest,
    totalCashback,
    yearEndBalance,
    maxNeededWithEmergencyFund: maxRow.maxNeeded + settings.emergencyFund
  };
}
