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
    expect(projection.withdrawalGainMonthlyAtStart).toBeCloseTo(
      projection.percentageWithdrawalMonthlyAtStart - projection.monthlyRate
    );
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
    expect(projection.costBasisAtRetirement).toBe(1152);
    expect(projection.taxAtRetirement).toBe(0);
    expect(projection.unrealizedTaxAtRetirement).toBeGreaterThan(0);
    expect(projection.netWealthAfterFullTaxAtRetirement).toBeLessThan(projection.wealthAtRetirement);
    expect(projection.wealthAtRetirement).toBeCloseTo(16769.53, 1);
    expect(projection.monthlyPension).toBeCloseTo(139.98, 1);
    expect(projection.realWealthAtRetirement).toBeCloseTo(7609.52, 1);
  });

  it("starts recurring investment positions in their configured start year and month", () => {
    const state = defaultAppState();
    state.positions = state.positions.map((position) =>
      position.id === "investitionsrate"
        ? { ...position, amount: 120, startMonth: 7, endMonth: 1, payoutYear: state.settings.year + 1 }
        : position
    );

    const currentYear = buildAssetProjection(state.settings.year, state.positions, state.investment);
    const startYear = buildAssetProjection(state.settings.year + 1, state.positions, state.investment);
    const laterYear = buildAssetProjection(state.settings.year + 2, state.positions, state.investment);

    expect(currentYear.monthlyRate).toBe(0);
    expect(startYear.monthlyRate).toBe(60);
    expect(laterYear.monthlyRate).toBe(120);
  });

  it("adds one-time savings positions once without raising the annual savings rate", () => {
    const state = defaultAppState();
    state.positions = state.positions.map((position) =>
      position.id === "investitionsrate"
        ? { ...position, amount: 1200, payoutType: "once", payoutYear: state.settings.year + 2, payoutMonth: 6 }
        : position
    );
    state.investment = {
      ...state.investment,
      percentageWithdrawalRatePercent: 0
    };

    const projection = buildAssetProjection(state.settings.year, state.positions, state.investment);

    expect(projection.monthlyRate).toBe(0);
    expect(projection.annualSavingsRate).toBe(0);
    expect(projection.totalContribution).toBe(1200);
    expect(projection.wealthAtRetirement).toBeGreaterThan(1200);
  });

  it("ignores selected positions that are not marked as savings rates", () => {
    const state = defaultAppState();
    state.positions = state.positions.map((position) =>
      position.id === "investitionsrate" ? { ...position, type: "temporary" } : position
    );

    const projection = buildAssetProjection(state.settings.year, state.positions, state.investment);

    expect(projection.monthlyRate).toBe(0);
    expect(projection.annualSavingsRate).toBe(0);
  });

  it("realizes tax during saving when percentage withdrawals start before retirement", () => {
    const state = defaultAppState();
    state.positions = state.positions.map((position) =>
      position.id === "investitionsrate" ? { ...position, amount: 250 } : position
    );
    state.investment = {
      ...state.investment,
      birthYear: 1993,
      chartStartAge: 32,
      payoutEndAge: 82,
      payoutYears: 20,
      percentageWithdrawalStartAge: 51,
      percentageWithdrawalRatePercent: 3.7,
      investmentReturnPercent: 7,
      capitalGainsTaxPercent: 27.9,
      inflationRatePercent: 2.9
    };

    const projection = buildAssetProjection(state.settings.year, state.positions, state.investment);
    const firstTaxedSavingPoint = projection.points.find((point) => point.age === 52);
    const firstPayoutPoint = projection.points.find((point) => point.age === 63);

    expect(projection.retirementAge).toBe(62);
    expect(projection.taxAtRetirement).toBeGreaterThan(0);
    expect(projection.taxAtEnd).toBeGreaterThan(projection.taxAtRetirement);
    expect(firstTaxedSavingPoint?.tax).toBeGreaterThan(0);
    expect(firstTaxedSavingPoint?.periodTax).toBeGreaterThan(0);
    expect(firstPayoutPoint?.costBasis).toBeGreaterThan(0);
    expect(projection.unrealizedTaxAtRetirement).toBeCloseTo(
      projection.growthAtRetirement * (state.investment.capitalGainsTaxPercent / 100)
    );
    expect(projection.netWealthAfterFullTaxAtRetirement).toBeCloseTo(
      projection.wealthAtRetirement - projection.unrealizedTaxAtRetirement
    );
  });
});
