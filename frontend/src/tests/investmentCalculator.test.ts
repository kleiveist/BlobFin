import { describe, expect, it } from "vitest";

import { defaultAppState } from "../data/defaults";
import { buildAssetProjection } from "../domain/assetProjection";
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

  it("builds a chart projection from start age through payout end age", () => {
    const state = defaultAppState();
    const projection = buildAssetProjection(state.settings.year, state.positions, state.investment);

    expect(projection.points[0].age).toBe(18);
    expect(projection.retirementAge).toBe(65);
    expect(projection.endAge).toBe(95);
    expect(projection.monthlyRate).toBe(150);
    expect(projection.wealthAtRetirement).toBeGreaterThan(60000);
    expect(projection.points.some((point) => point.phase === "payout")).toBe(true);
  });
});
