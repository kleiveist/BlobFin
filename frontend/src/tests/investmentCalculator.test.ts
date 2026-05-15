import { describe, expect, it } from "vitest";

import { defaultAppState } from "../data/defaults";
import { calculateInvestmentResult } from "../domain/investmentCalculator";

describe("investment calculator", () => {
  it("projects the selected investment position into net payout values", () => {
    const state = defaultAppState();
    const result = calculateInvestmentResult(state.settings.year, state.positions, state.investment);

    expect(result.savingMonths).toBe(228);
    expect(result.averageMonthlyContribution).toBe(150);
    expect(result.totalContribution).toBe(34200);
    expect(result.netWealth).toBeGreaterThan(result.totalContribution);
    expect(result.monthlyPensionNet).toBeGreaterThan(0);
  });
});
