import { describe, expect, it } from "vitest";

import { selectedSavingsContributionForProjectionYear } from "../domain/investmentContributions";
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
});
