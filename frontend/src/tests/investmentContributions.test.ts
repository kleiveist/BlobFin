import { describe, expect, it } from "vitest";

import {
  investmentSavingsSelectionSummary,
  selectableInvestmentSavingsPositions,
  selectedSavingsContributionForProjectionYear
} from "../domain/investmentContributions";
import type { ReservePosition } from "../types";

function savingsPosition(values: Partial<ReservePosition> & Pick<ReservePosition, "id" | "amount">): ReservePosition {
  return {
    id: values.id,
    flow: values.flow ?? "expense",
    active: values.active ?? true,
    visible: values.visible ?? true,
    name: values.name ?? values.id,
    type: values.type ?? "savings",
    amount: values.amount,
    startMonth: values.startMonth ?? 1,
    endMonth: values.endMonth ?? 12,
    payoutType: values.payoutType ?? "monthly",
    payoutYear: values.payoutYear ?? 2026,
    payoutMonth: values.payoutMonth ?? 1,
    payoutDay: values.payoutDay ?? 1,
    interestBearing: values.interestBearing ?? false,
    cashback: values.cashback ?? false,
    ...(values.icon ? { icon: values.icon } : {}),
    ...(values.planningYear !== undefined ? { planningYear: values.planningYear } : {}),
    ...(values.costBreakdown ? { costBreakdown: values.costBreakdown } : {})
  };
}

describe("investment contributions", () => {
  it("sums selected savings contributions by cadence for each projection year", () => {
    const positions: ReservePosition[] = [
      savingsPosition({ id: "monthly", amount: 100, startMonth: 3, payoutType: "monthly" }),
      savingsPosition({ id: "yearly", amount: 500, payoutType: "yearly", payoutMonth: 4 }),
      savingsPosition({ id: "once", amount: 750, payoutType: "once", payoutYear: 2026, payoutMonth: 5 }),
      savingsPosition({ id: "none", amount: 50, payoutType: "none", startMonth: 6, endMonth: 8 }),
      savingsPosition({ id: "unselected", amount: 999 }),
      savingsPosition({ id: "inactive", amount: 999, active: false }),
      savingsPosition({ id: "income", amount: 999, flow: "income", type: "incomeMonthly" })
    ];
    const selectedIds = ["monthly", "yearly", "once", "none", "inactive", "income"];

    expect(selectedSavingsContributionForProjectionYear(positions, selectedIds, 2026, 0)).toBe(2400);
    expect(selectedSavingsContributionForProjectionYear(positions, selectedIds, 2026, 1)).toBe(1700);
  });

  it("keeps investment savings selectable across all planning years", () => {
    const positions: ReservePosition[] = [
      savingsPosition({ id: "start", amount: 100, planningYear: null }),
      savingsPosition({ id: "year-2026", amount: 100, planningYear: 2026 }),
      savingsPosition({ id: "year-2033", amount: 100, planningYear: 2033 }),
      savingsPosition({ id: "inactive", amount: 100, planningYear: 2033, active: false }),
      savingsPosition({ id: "income", amount: 100, flow: "income", type: "incomeMonthly", planningYear: 2033 })
    ];

    expect(selectableInvestmentSavingsPositions(positions).map((position) => position.id)).toEqual([
      "start",
      "year-2026",
      "year-2033"
    ]);
  });

  it("summarizes selected investment savings for the start year", () => {
    const positions: ReservePosition[] = [
      savingsPosition({ id: "monthly", amount: 100, payoutType: "monthly" }),
      savingsPosition({ id: "once", amount: 750, payoutType: "once", payoutYear: 2026, payoutMonth: 5 }),
      savingsPosition({ id: "future-once", amount: 900, payoutType: "once", payoutYear: 2033, payoutMonth: 5 }),
      savingsPosition({ id: "unselected", amount: 999 })
    ];

    expect(investmentSavingsSelectionSummary(positions, ["monthly", "once", "future-once"], 2026)).toEqual({
      selectedCount: 3,
      yearlyAmount: 1950
    });
  });
});
