import { MONTHS } from "../data/defaults";
import type { MonthlyReserveRow, PlanningSettings, ReservePosition, ReserveSummary } from "../types";

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function isActiveInMonth(position: ReservePosition, monthNumber: number): boolean {
  return position.active && monthNumber >= Number(position.startMonth) && monthNumber <= Number(position.endMonth);
}

export function calculatePositionValueAtMonthStart(position: ReservePosition, monthNumber: number): number {
  if (!isActiveInMonth(position, monthNumber)) return 0;

  if (position.payoutType === "once") return 0;
  if (position.type === "fixed") return Number(position.amount);
  if (position.type === "temporary" || position.type === "savings") return Number(position.amount);

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
  if (!position.active) return 0;
  if (position.payoutType === "once") return 0;

  if (position.type === "fixed") {
    return isActiveInMonth(position, monthNumber) ? Number(position.amount) : 0;
  }
  if (position.type === "temporary" || position.type === "savings") return 0;

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
  if (!position.active || !isActiveInMonth(position, monthNumber)) return 0;
  if (position.payoutType === "once") return 0;

  const monthIndex = monthNumber - 1;
  const dim = daysInMonth(year, monthIndex);

  if (position.type === "fixed") return (Number(position.amount) * annualRate) / 12;

  if (position.type === "temporary" || position.type === "savings") {
    const payoutDay = Math.max(1, Math.min(Number(position.payoutDay || dim), dim));
    return (Number(position.amount) * annualRate * payoutDay) / 365;
  }

  const balance = calculatePositionValueAtMonthStart(position, monthNumber);
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

export function calculateCashbackForPosition(position: ReservePosition, cashbackRate: number): number {
  let cashback = 0;
  for (let month = 1; month <= 12; month += 1) {
    cashback += calculateCashbackForSingleMonth(position, month, cashbackRate);
  }
  return cashback;
}

export function calculateCashbackForSingleMonth(
  position: ReservePosition,
  monthNumber: number,
  cashbackRate: number
): number {
  if (!position.active || !position.cashback || position.type !== "temporary") return 0;
  if (position.payoutType === "once") {
    return isPayoutMonth(position, monthNumber) ? Number(position.amount) * cashbackRate : 0;
  }
  if (!isActiveInMonth(position, monthNumber)) return 0;
  if (position.payoutType === "monthly") return Number(position.amount) * cashbackRate;
  if (position.payoutType === "yearly" && isPayoutMonth(position, monthNumber)) {
    return Number(position.amount) * cashbackRate;
  }

  return 0;
}

export function calculatePlannedOutflowForSingleMonth(position: ReservePosition, monthNumber: number): number {
  if (!position.active || position.type === "fixed") return 0;
  if (position.payoutType === "once") return isPayoutMonth(position, monthNumber) ? Number(position.amount) : 0;
  if (!isActiveInMonth(position, monthNumber)) return 0;
  if (position.type === "reserve") return Number(position.amount);
  if (position.payoutType === "yearly") return isPayoutMonth(position, monthNumber) ? Number(position.amount) : 0;
  return Number(position.amount);
}

function isSingleMonthPayout(position: ReservePosition): boolean {
  return position.payoutType === "yearly" || position.payoutType === "once";
}

function isPayoutMonth(position: ReservePosition, monthNumber: number): boolean {
  return Number(position.payoutMonth) === monthNumber;
}

export function calculateMonthlyRows(settings: PlanningSettings, positions: ReservePosition[]): MonthlyReserveRow[] {
  const rows: MonthlyReserveRow[] = [];
  const annualRate = settings.interestRatePercent / 100;
  const cashbackRate = settings.cashbackRatePercent / 100;

  for (let month = 1; month <= 12; month += 1) {
    const values: Record<string, number> = {};
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

      const value = calculatePositionValueAtMonthStart(position, month);
      values[position.id] = value;
      maxNeeded += value;
      plannedOutflow += calculatePlannedOutflowForSingleMonth(position, month);
      permanentAfterMonthlyOutflows += calculatePositionEndOfMonthPermanent(position, month);
      monthlyInterest += calculateInterestForSingleMonth(position, settings.year, month, annualRate);
      monthlyCashback += calculateCashbackForSingleMonth(position, month, cashbackRate);
    }

    rows.push({
      monthNumber: month,
      month: MONTHS[month - 1],
      values,
      maxNeeded,
      plannedOutflow,
      monthlyRemaining: Number(settings.monthlyNetIncome) - plannedOutflow,
      permanentAfterMonthlyOutflows,
      monthlyInterest,
      monthlyCashback
    });
  }

  return rows;
}

export function calculateReserveSummary(settings: PlanningSettings, positions: ReservePosition[]): ReserveSummary {
  const rows = calculateMonthlyRows(settings, positions);
  const activePositions = positions.filter((position) => position.active && position.payoutType !== "once");
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
  const totalPlannedOutflow = rows.reduce((sum, row) => sum + row.plannedOutflow, 0);
  const yearlyRemaining = Number(settings.monthlyNetIncome) * 12 - totalPlannedOutflow;
  const yearEndBalance = rows[11]?.permanentAfterMonthlyOutflows || 0;

  return {
    rows,
    activePositions,
    maxRow,
    minRemainingRow,
    totalPlannedOutflow,
    yearlyRemaining,
    totalInterest,
    totalCashback,
    yearEndBalance,
    maxNeededWithEmergencyFund: maxRow.maxNeeded + settings.emergencyFund
  };
}
