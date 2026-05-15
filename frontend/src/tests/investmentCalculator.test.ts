import { describe, expect, it } from "vitest";

import { defaultAppState } from "../data/defaults";
import { buildAssetProjection } from "../domain/assetProjection";
import { calculateInvestmentResult } from "../domain/investmentCalculator";

describe("investment calculator", () => {
  it("projects the selected investment position into net payout values", () => {
    const state = defaultAppState();
    const result = calculateInvestmentResult(state.settings.year, state.positions, state.investment);

    expect(result.savingMonths).toBe(204);
    expect(result.averageMonthlyContribution).toBe(150);
    expect(result.totalContribution).toBe(30600);
    expect(result.netWealth).toBeGreaterThan(result.totalContribution);
    expect(result.monthlyPensionNet).toBeGreaterThan(0);
  });

  it("builds a chart projection from start age through payout end age", () => {
    const state = defaultAppState();
    const projection = buildAssetProjection(state.settings.year, state.positions, state.investment);

    expect(projection.points[0].age).toBe(32);
    expect(projection.retirementAge).toBe(50);
    expect(projection.endAge).toBe(95);
    expect(projection.monthlyRate).toBe(150);
    expect(projection.annualSavingsRate).toBe(1800);
    expect(projection.percentageWithdrawalStartAge).toBe(32);
    expect(projection.percentageWithdrawalRatePercent).toBe(4);
    expect(projection.wealthAtRetirement).toBeGreaterThan(40000);
    expect(projection.points.some((point) => point.phase === "payout")).toBe(true);
  });

  it("counts yearly investment positions once per year", () => {
    const state = defaultAppState();
    state.positions = state.positions.map((position) =>
      position.id === "investitionsrate"
        ? { ...position, amount: 36, payoutType: "yearly", payoutMonth: 12 }
        : position
    );
    state.investment = {
      ...state.investment,
      payoutEndAge: 95,
      payoutYears: 30,
      percentageWithdrawalRatePercent: 0,
      inflationRatePercent: 2.5
    };

    const projection = buildAssetProjection(state.settings.year, state.positions, state.investment);

    expect(projection.monthlyRate).toBe(3);
    expect(projection.annualSavingsRate).toBe(36);
    expect(projection.totalContribution).toBe(1152);
    expect(projection.wealthAtRetirement).toBeCloseTo(12650.4, 1);
    expect(projection.monthlyPension).toBeCloseTo(141.67, 1);
    expect(projection.realWealthAtRetirement).toBeCloseTo(5740.38, 1);
  });
});
