import { isActiveInMonth } from "./reserveCalculator";
import type { InvestmentSettings, ReservePosition } from "../types";

export function investmentContributionForMonth(position: ReservePosition, month: number): number {
  if (!isActiveInMonth(position, month)) return 0;
  if (position.payoutType === "yearly") return Number(position.payoutMonth) === month ? Number(position.amount) : 0;
  return Number(position.amount);
}

export function selectedMonthlyPattern(positions: ReservePosition[], settings: InvestmentSettings): number[] {
  const selectedPositions = positions.filter((position) => settings.includedIds.includes(position.id) && position.active);
  const pattern: number[] = [];

  for (let month = 1; month <= 12; month += 1) {
    pattern.push(
      selectedPositions.reduce((sum, position) => {
        return sum + investmentContributionForMonth(position, month);
      }, 0)
    );
  }

  return pattern;
}
