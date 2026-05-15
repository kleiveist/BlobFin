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

  if (position.type === "fixed") return Number(position.amount);
  if (position.type === "temporary") return Number(position.amount);

  let balance = 0;
  for (let month = 1; month <= monthNumber; month += 1) {
    if (isActiveInMonth(position, month)) balance += Number(position.amount);
    if (position.payoutType === "monthly" && isActiveInMonth(position, month)) balance = 0;
    if (position.payoutType === "yearly" && month < monthNumber && Number(position.payoutMonth) === month) {
      balance = 0;
    }
  }

  return balance;
}

export function calculatePositionEndOfMonthPermanent(position: ReservePosition, monthNumber: number): number {
  if (!position.active) return 0;

  if (position.type === "fixed") {
    return isActiveInMonth(position, monthNumber) ? Number(position.amount) : 0;
  }
  if (position.type === "temporary") return 0;

  let balance = 0;
  for (let month = 1; month <= monthNumber; month += 1) {
    if (isActiveInMonth(position, month)) balance += Number(position.amount);
    if (position.payoutType === "monthly" && isActiveInMonth(position, month)) balance = 0;
    if (position.payoutType === "yearly" && Number(position.payoutMonth) === month && month <= monthNumber) {
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

  const monthIndex = monthNumber - 1;
  const dim = daysInMonth(year, monthIndex);

  if (position.type === "fixed") return (Number(position.amount) * annualRate) / 12;

  if (position.type === "temporary") {
    const payoutDay = Math.max(1, Math.min(Number(position.payoutDay || dim), dim));
    return (Number(position.amount) * annualRate * payoutDay) / 365;
  }

  const balance = calculatePositionValueAtMonthStart(position, monthNumber);
  let daysHeld = dim;
  if (position.payoutType === "monthly") daysHeld = Math.max(1, Math.min(Number(position.payoutDay || dim), dim));
  if (position.payoutType === "yearly" && Number(position.payoutMonth) === monthNumber) {
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
  if (!position.active || !position.cashback) return 0;

  let eligibleVolume = 0;
  for (let month = 1; month <= 12; month += 1) {
    if (!isActiveInMonth(position, month)) continue;

    if (position.type === "temporary" && position.payoutType === "monthly") eligibleVolume += Number(position.amount);
    if (position.type === "reserve" && position.payoutType === "monthly") eligibleVolume += Number(position.amount);
    if (position.type === "reserve" && position.payoutType === "yearly" && Number(position.payoutMonth) === month) {
      eligibleVolume += calculatePositionValueAtMonthStart(position, month);
    }
  }

  return eligibleVolume * cashbackRate;
}

export function calculateMonthlyRows(settings: PlanningSettings, positions: ReservePosition[]): MonthlyReserveRow[] {
  const rows: MonthlyReserveRow[] = [];
  const annualRate = settings.interestRatePercent / 100;

  for (let month = 1; month <= 12; month += 1) {
    const values: Record<string, number> = {};
    let maxNeeded = 0;
    let permanentAfterMonthlyOutflows = 0;
    let monthlyInterest = 0;

    for (const position of positions) {
      if (!position.active) {
        values[position.id] = 0;
        continue;
      }

      const value = calculatePositionValueAtMonthStart(position, month);
      values[position.id] = value;
      maxNeeded += value;
      permanentAfterMonthlyOutflows += calculatePositionEndOfMonthPermanent(position, month);
      monthlyInterest += calculateInterestForSingleMonth(position, settings.year, month, annualRate);
    }

    rows.push({
      monthNumber: month,
      month: MONTHS[month - 1],
      values,
      maxNeeded,
      permanentAfterMonthlyOutflows,
      monthlyInterest
    });
  }

  return rows;
}

export function calculateReserveSummary(settings: PlanningSettings, positions: ReservePosition[]): ReserveSummary {
  const rows = calculateMonthlyRows(settings, positions);
  const activePositions = positions.filter((position) => position.active);
  const maxRow = rows.reduce((best, row) => (row.maxNeeded > best.maxNeeded ? row : best), rows[0]);
  const annualRate = settings.interestRatePercent / 100;
  const cashbackRate = settings.cashbackRatePercent / 100;
  const totalInterest = positions.reduce(
    (sum, position) => sum + calculateInterestForPosition(position, settings.year, annualRate),
    0
  );
  const totalCashback = positions.reduce(
    (sum, position) => sum + calculateCashbackForPosition(position, cashbackRate),
    0
  );
  const yearEndBalance = rows[11]?.permanentAfterMonthlyOutflows || 0;

  return {
    rows,
    activePositions,
    maxRow,
    totalInterest,
    totalCashback,
    yearEndBalance,
    maxNeededWithEmergencyFund: maxRow.maxNeeded + settings.emergencyFund
  };
}
