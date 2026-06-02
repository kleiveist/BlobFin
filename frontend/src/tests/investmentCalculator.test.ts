import { describe, expect, it } from "vitest";

import { defaultAppState } from "../data/defaults";
import { buildAssetProjection } from "../domain/assetProjection";
import { calculateInvestmentResult } from "../domain/investmentCalculator";
import { calculateRetirementDepotAllowance } from "../domain/retirementDepot";

describe("investment calculator", () => {
  it("calculates the retirement depot allowance tiers and child allowance", () => {
    expect(calculateRetirementDepotAllowance(119, 2)).toMatchObject({
      baseAllowance: 0,
      childAllowance: 0,
      totalAllowance: 0,
      allowanceRatePercent: 0
    });
    expect(calculateRetirementDepotAllowance(360, 0)).toMatchObject({
      baseAllowance: 180,
      childAllowance: 0,
      totalAllowance: 180,
      allowanceRatePercent: 50
    });
    expect(calculateRetirementDepotAllowance(1800, 0)).toMatchObject({
      baseAllowance: 540,
      childAllowance: 0,
      totalAllowance: 540,
      allowanceRatePercent: 30
    });
    expect(calculateRetirementDepotAllowance(300, 2)).toMatchObject({
      baseAllowance: 150,
      childAllowance: 600,
      totalAllowance: 750,
      allowanceRatePercent: 250
    });
  });

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
    expect(projection.withdrawalRemainingSavingsMonthlyAtStart).toBeCloseTo(
      Math.max(0, projection.monthlyRate - projection.percentageWithdrawalMonthlyAtStart)
    );
    expect(projection.withdrawalGainMonthlyAtStart).toBeCloseTo(
      Math.max(0, projection.percentageWithdrawalMonthlyAtStart - projection.monthlyRate)
    );
    expect(projection.wealthAtRetirement).toBeGreaterThan(40000);
    expect(projection.points.some((point) => point.phase === "payout")).toBe(true);
  });

  it("adds retirement depot allowances and enforces retirement age 65", () => {
    const state = defaultAppState();
    state.investment = {
      ...state.investment,
      retirementDepotEnabled: true,
      percentageWithdrawalStartAge: 32,
      percentageWithdrawalRatePercent: 4
    };

    const projection = buildAssetProjection(state.settings.year, state.positions, state.investment);

    expect(projection.retirementAge).toBe(65);
    expect(projection.savingMonths).toBe(384);
    expect(projection.retirementDepotAnnualOwnContribution).toBe(1800);
    expect(projection.retirementDepotBaseAllowanceAnnual).toBe(540);
    expect(projection.retirementDepotAllowanceRatePercent).toBe(30);
    expect(projection.allowanceAtRetirement).toBeCloseTo(17280, 2);
    expect(projection.percentageWithdrawalRatePercent).toBe(0);
    expect(projection.percentageWithdrawalMonthlyAtStart).toBe(0);
    expect(projection.taxAtRetirement).toBe(0);
    expect(projection.wealthAtRetirement).toBeGreaterThan(projection.totalContribution);
    expect(projection.points.some((point) => point.allowance > 0)).toBe(true);
  });

  it("uses the first active contribution year for retirement depot annual allowance metrics", () => {
    const state = defaultAppState();
    state.positions = state.positions.map((position) =>
      position.id === "investitionsrate" ? { ...position, payoutYear: state.settings.year + 1 } : position
    );
    state.investment = {
      ...state.investment,
      retirementDepotEnabled: true
    };

    const projection = buildAssetProjection(state.settings.year, state.positions, state.investment);

    expect(projection.monthlyRate).toBe(150);
    expect(projection.annualSavingsRate).toBe(1800);
    expect(projection.retirementDepotAnnualOwnContribution).toBe(1800);
    expect(projection.retirementDepotBaseAllowanceAnnual).toBe(540);
    expect(projection.retirementDepotAllowanceRatePercent).toBe(30);
    expect(projection.allowanceAtRetirement).toBeGreaterThan(0);
  });

  it("does not show negative withdrawal gain values", () => {
    const state = defaultAppState();
    state.positions = state.positions.map((position) =>
      position.id === "investitionsrate" ? { ...position, amount: 2000 } : position
    );

    const projection = buildAssetProjection(state.settings.year, state.positions, state.investment);

    expect(projection.percentageWithdrawalMonthlyAtStart - projection.monthlyRate).toBeLessThan(0);
    expect(projection.withdrawalRemainingSavingsMonthlyAtStart).toBeCloseTo(
      projection.monthlyRate - projection.percentageWithdrawalMonthlyAtStart
    );
    expect(projection.withdrawalGainMonthlyAtStart).toBe(0);
  });

  it("uses net withdrawals only after the selected monthly rate is fully offset", () => {
    const state = defaultAppState();
    state.positions = state.positions.map((position) =>
      position.id === "investitionsrate" ? { ...position, amount: 50 } : position
    );
    state.investment = {
      ...state.investment,
      percentageWithdrawalStartAge: state.investment.payoutEndAge - state.investment.payoutYears
    };

    const projection = buildAssetProjection(state.settings.year, state.positions, state.investment);

    expect(projection.percentageWithdrawalMonthlyAtStart).toBeGreaterThan(projection.monthlyRate);
    expect(projection.withdrawalRemainingSavingsMonthlyAtStart).toBe(0);
    expect(projection.withdrawalGainMonthlyAtStart).toBeCloseTo(
      projection.percentageWithdrawalMonthlyAtStart - projection.monthlyRate
    );
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
      inflationRatePercent: 2.5,
      bequestReservePercent: 0
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

  it("holds back the configured reserve for inheritance or longevity", () => {
    const state = defaultAppState();
    state.investment = {
      ...state.investment,
      payoutEndAge: 82,
      payoutYears: 20,
      percentageWithdrawalRatePercent: 0,
      investmentReturnPercent: 5,
      bequestReservePercent: 10
    };

    const projection = buildAssetProjection(state.settings.year, state.positions, state.investment);
    const noReserveProjection = buildAssetProjection(state.settings.year, state.positions, {
      ...state.investment,
      bequestReservePercent: 0
    });
    const finalPoint = projection.points[projection.points.length - 1];

    expect(projection.bequestReservePercent).toBe(10);
    expect(projection.monthlyPension).toBeLessThan(noReserveProjection.monthlyPension);
    expect(projection.bequestReserveAtEnd).toBeCloseTo(finalPoint.netBalance, 2);
    expect(projection.bequestReserveAtEnd).toBeCloseTo(projection.wealthAtRetirement * 0.1, 0);
  });

  it("keeps a child depot as an accumulation-only projection until payout age", () => {
    const state = defaultAppState();
    state.investment = {
      ...state.investment,
      birthYear: state.settings.year,
      chartStartAge: 0,
      payoutEndAge: 18,
      payoutYears: 0,
      percentageWithdrawalStartAge: 18,
      percentageWithdrawalRatePercent: 0,
      investmentReturnPercent: 7,
      capitalGainsTaxPercent: 26.5,
      inflationRatePercent: 2.7,
      bequestReservePercent: 10
    };

    const projection = buildAssetProjection(state.settings.year, state.positions, state.investment);

    expect(projection.points[0].age).toBe(0);
    expect(projection.retirementAge).toBe(18);
    expect(projection.endAge).toBe(18);
    expect(projection.points.every((point) => point.phase === "saving")).toBe(true);
    expect(projection.monthlyPension).toBe(0);
    expect(projection.realMonthlyPension).toBe(0);
    expect(projection.bequestReserveAtEnd).toBeCloseTo(projection.wealthAtRetirement * 0.1, 2);
  });

  it("supports child depot payout ages up to 25", () => {
    const state = defaultAppState();
    state.investment = {
      ...state.investment,
      birthYear: state.settings.year,
      chartStartAge: 0,
      payoutEndAge: 25,
      payoutYears: 0,
      percentageWithdrawalStartAge: 25,
      percentageWithdrawalRatePercent: 0
    };

    const projection = buildAssetProjection(state.settings.year, state.positions, state.investment);

    expect(projection.retirementAge).toBe(25);
    expect(projection.endAge).toBe(25);
    expect(projection.points[projection.points.length - 1].age).toBe(25);
    expect(projection.points.every((point) => point.phase === "saving")).toBe(true);
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

    expect(currentYear.monthlyRate).toBe(60);
    expect(currentYear.annualSavingsRate).toBe(720);
    expect(startYear.monthlyRate).toBe(60);
    expect(laterYear.monthlyRate).toBe(120);
  });

  it("includes recurring investment contributions that started before the planning year", () => {
    const state = defaultAppState();
    state.positions = state.positions.map((position) =>
      position.id === "investitionsrate"
        ? { ...position, amount: 100, payoutYear: state.settings.year - 3, startMonth: 1 }
        : position
    );
    state.investment = {
      ...state.investment,
      percentageWithdrawalRatePercent: 0
    };

    const projection = buildAssetProjection(state.settings.year, state.positions, state.investment);
    const currentAgePoint = projection.points.find((point) => point.age === projection.ageToday);

    expect(projection.annualSavingsRate).toBe(1200);
    expect(projection.savingMonths).toBe(240);
    expect(projection.totalContribution).toBe(24000);
    expect(currentAgePoint?.contribution).toBe(3600);
    expect(projection.wealthAtRetirement).toBeGreaterThan(24000);
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

  it("treats savings without rhythm as one-time contributions in their configured year range", () => {
    const state = defaultAppState();
    state.positions = state.positions.map((position) =>
      position.id === "investitionsrate"
        ? {
            ...position,
            amount: 50,
            startMonth: 1,
            endMonth: 6,
            payoutType: "none",
            payoutYear: state.settings.year
          }
        : position
    );
    state.investment = {
      ...state.investment,
      percentageWithdrawalRatePercent: 0
    };

    const projection = buildAssetProjection(state.settings.year, state.positions, state.investment);

    expect(projection.monthlyRate).toBe(0);
    expect(projection.annualSavingsRate).toBe(0);
    expect(projection.totalContribution).toBe(300);
    expect(projection.recurringContributionAtRetirement).toBe(0);
    expect(projection.oneTimeContributionAtRetirement).toBe(300);
  });

  it("includes one-time investment contributions paid before the planning year", () => {
    const state = defaultAppState();
    state.positions = state.positions.map((position) =>
      position.id === "investitionsrate"
        ? { ...position, amount: 5000, payoutType: "once", payoutYear: state.settings.year - 3, payoutMonth: 6 }
        : position
    );
    state.investment = {
      ...state.investment,
      percentageWithdrawalRatePercent: 0
    };

    const projection = buildAssetProjection(state.settings.year, state.positions, state.investment);
    const currentAgePoint = projection.points.find((point) => point.age === projection.ageToday);

    expect(projection.monthlyRate).toBe(0);
    expect(projection.annualSavingsRate).toBe(0);
    expect(projection.totalContribution).toBe(5000);
    expect(projection.oneTimeContributionAtRetirement).toBe(5000);
    expect(currentAgePoint?.contribution).toBe(5000);
    expect(projection.wealthAtRetirement).toBeGreaterThan(5000);
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
