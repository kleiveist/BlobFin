import { describe, expect, it } from "vitest";

import { defaultAppState } from "../data/defaults";
import {
  calculateRealEstateFinancing,
  defaultRealEstateDetailYear,
  deriveInitialRepaymentPercentFromPayment,
  deriveLoanAmount,
  validateRealEstateSettings
} from "../domain/realEstateCalculator";
import type { RealEstateFinancingSettings, RealEstateFinancingSourceSchedule } from "../types";

function schedule(
  monthlyPaymentSavings: number[],
  specialRepayments: number[] = [],
  withdrawalGainPayments: number[] = [],
  equityCapital = 0,
  depotSavingsRatePayments?: number[]
): RealEstateFinancingSourceSchedule {
  return { equityCapital, monthlyPaymentSavings, specialRepayments, withdrawalGainPayments, depotSavingsRatePayments };
}

function repeated(value: number, count = 240): number[] {
  return Array.from({ length: count }, () => value);
}

function expectedFixedTotalLoanCost(loanAmount: number, interestRatePercent: number, financingYears: number): number {
  const monthlyRate = Math.max(0, interestRatePercent) / 100 / 12;
  if (loanAmount <= 0) return 0;
  if (monthlyRate <= 0) return roundTestMoney(loanAmount);
  return roundTestMoney(loanAmount * (1 + monthlyRate) ** (financingYears * 12));
}

function roundTestMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function projectSettings(
  projectCost: number,
  overrides: Partial<RealEstateFinancingSettings> = {}
): RealEstateFinancingSettings {
  const state = defaultAppState();
  return {
    ...state.realEstate,
    purchasePrice: projectCost,
    constructionOrRenovationCosts: 0,
    landCosts: 0,
    additionalPurchaseCosts: 0,
    notaryCosts: 0,
    landRegistryCosts: 0,
    brokerCosts: 0,
    transferTax: 0,
    modernizationReserve: 0,
    movingAndSetupCosts: 0,
    safetyBuffer: 0,
    loanAmount: 0,
    ...overrides
  };
}

describe("real estate calculator", () => {
  it("derives a loan amount from total project cost and sourced equity", () => {
    const state = defaultAppState();
    const settings = {
      ...state.realEstate,
      loanAmount: 0,
      purchasePrice: 300000,
      additionalPurchaseCosts: 10000,
      equityCapital: 60000,
      subsidyAmount: 5000
    };

    expect(deriveLoanAmount(settings)).toBe(370000);
    expect(deriveLoanAmount(settings, 60000)).toBe(310000);
  });

  it("ignores removed strategy fields when deriving loan amount and yearly values", () => {
    const state = defaultAppState();
    const settings = {
      ...state.realEstate,
      purchasePrice: 300000,
      constructionOrRenovationCosts: 0,
      landCosts: 0,
      additionalPurchaseCosts: 0,
      notaryCosts: 0,
      landRegistryCosts: 0,
      brokerCosts: 0,
      transferTax: 0,
      modernizationReserve: 0,
      movingAndSetupCosts: 0,
      safetyBuffer: 0,
      equityCapital: 50000,
      loanAmount: 0,
      subsidyAmount: 100000,
      interestRatePercent: 0,
      propertyValueGrowthPercent: 0,
      financingYears: 3,
      plannedSaleYear: state.settings.year,
      estimatedSaleValue: 1,
      manualFuturePropertyValue: 999999,
      fixedInterestYears: 1,
      remainingDebtAfterFixedInterest: 99999,
      targetMonthlyBurden: 5000,
      maxMonthlyBurden: 1
    };

    const result = calculateRealEstateFinancing(state.settings.year, settings, schedule(repeated(1000, 36), [], [], 50000));

    expect(deriveLoanAmount(settings)).toBe(300000);
    expect(deriveLoanAmount(settings, 50000)).toBe(250000);
    expect(result.equityCapital).toBe(50000);
    expect(result.years[0].propertyValue).toBe(300000);
    expect(result.years[0].loanEnd).toBe(238000);
    expect(result.validationErrors.join(" ")).not.toContain("Ziel-Monatsbelastung");
  });

  it("uses selected monthly savings as the only regular repayment source", () => {
    const state = defaultAppState();
    const settings = projectSettings(120000, {
      interestRatePercent: 0,
      financingYears: 20
    });

    const result = calculateRealEstateFinancing(state.settings.year, settings, schedule(repeated(1000)));

    expect(result.validationErrors).toEqual([]);
    expect(result.monthlyPayment).toBe(1000);
    expect(result.derivedInitialRepaymentPercent).toBeCloseTo(10, 2);
    expect(result.years[0].monthlyPaymentFromSavings).toBeCloseTo(12000, 2);
    expect(result.years[0].principalFromMonthlyPayment).toBeCloseTo(12000, 2);
    expect(result.years[0].loanEnd).toBeCloseTo(108000, 2);
  });

  it("derives initial repayment percent from real source payments without extreme values", () => {
    const state = defaultAppState();
    const settings = {
      ...state.realEstate,
      loanAmount: 240000,
      interestRatePercent: 3
    };

    expect(deriveInitialRepaymentPercentFromPayment(settings, 240000, 1000)).toBeCloseTo(2, 2);
  });

  it("applies special repayments from the dedicated source schedule", () => {
    const state = defaultAppState();
    const specialRepayments = repeated(0);
    specialRepayments[2] = 2000;
    specialRepayments[11] = 5000;
    const settings = projectSettings(120000, {
      interestRatePercent: 0,
      financingYears: 5
    });

    const result = calculateRealEstateFinancing(
      state.settings.year,
      settings,
      schedule(repeated(1000), specialRepayments)
    );

    expect(result.annualSpecialRepayment).toBe(7000);
    expect(result.years[0].specialRepayment).toBe(7000);
    expect(result.years[0].loanEnd).toBeCloseTo(101000, 2);
  });

  it("adds withdrawal gain to the monthly payment only when it is in the source schedule", () => {
    const state = defaultAppState();
    const settings = projectSettings(120000, {
      interestRatePercent: 0,
      financingYears: 5
    });

    const withoutWithdrawal = calculateRealEstateFinancing(
      state.settings.year,
      settings,
      schedule(repeated(1000))
    );
    const withWithdrawal = calculateRealEstateFinancing(
      state.settings.year,
      settings,
      schedule(repeated(1000), [], repeated(250))
    );

    expect(withWithdrawal.monthlyPayment).toBe(1250);
    expect(withWithdrawal.years[0].monthlyPaymentFromWithdrawalGain).toBe(3000);
    expect(withWithdrawal.years[0].additionalRepaymentBreakdown.withdrawalGain).toBeCloseTo(3000, 2);
    expect(withWithdrawal.years[0].loanEnd).toBeLessThan(withoutWithdrawal.years[0].loanEnd);
  });

  it("tracks redirected depot savings rates separately from withdrawal gain", () => {
    const state = defaultAppState();
    const settings = projectSettings(120000, {
      interestRatePercent: 0,
      financingYears: 5
    });

    const result = calculateRealEstateFinancing(
      state.settings.year,
      settings,
      schedule(repeated(1000), [], repeated(250), 0, repeated(500))
    );

    expect(result.monthlyPayment).toBe(1750);
    expect(result.years[0].monthlyPaymentAvailable).toBe(21000);
    expect(result.years[0].additionalRepaymentBreakdown.withdrawalGain).toBeCloseTo(3000, 2);
    expect(result.years[0].additionalRepaymentBreakdown.depotSavingsRate).toBeCloseTo(6000, 2);
    expect(result.years[0].additionalRepaymentBreakdown.totalAdditionalRepayment).toBeCloseTo(9000, 2);
  });

  it("keeps redirected depot savings at zero before its schedule starts", () => {
    const state = defaultAppState();
    const depotSavingsRatePayments = [...repeated(0, 12), ...repeated(500, 12)];
    const settings = projectSettings(120000, {
      interestRatePercent: 0,
      financingYears: 2
    });

    const result = calculateRealEstateFinancing(
      state.settings.year,
      settings,
      schedule(repeated(1000, 24), [], repeated(250, 24), 0, depotSavingsRatePayments),
      { financingYears: 2, projectionYears: 2 }
    );

    expect(result.years[0].additionalRepaymentBreakdown.depotSavingsRate).toBe(0);
    expect(result.years[1].additionalRepaymentBreakdown.depotSavingsRate).toBeCloseTo(6000, 2);
  });

  it("does not invent payments to cover interest shortfalls", () => {
    const state = defaultAppState();
    const settings = projectSettings(120000, {
      interestRatePercent: 12,
      financingYears: 1
    });

    const result = calculateRealEstateFinancing(state.settings.year, settings, schedule(repeated(500, 12)));

    expect(result.years[0].principalFromMonthlyPayment).toBe(0);
    expect(result.years[0].loanEnd).toBeGreaterThan(120000);
    expect(result.years[0].interestShortfall).toBeGreaterThan(0);
    expect(result.validationErrors.join(" ")).toContain("Zinsen nicht vollstaendig");
  });

  it("uses payments above interest demand for principal repayment", () => {
    const state = defaultAppState();
    const settings = projectSettings(120000, {
      interestRatePercent: 3.7,
      financingYears: 1
    });

    const result = calculateRealEstateFinancing(state.settings.year, settings, schedule(repeated(1000, 12)));

    expect(result.years[0].interestShortfall).toBe(0);
    expect(result.years[0].principalFromMonthlyPayment).toBeGreaterThan(0);
    expect(result.years[0].loanEnd).toBeLessThan(120000);
  });

  it("capitalizes uncovered interest when no repayment is available", () => {
    const state = defaultAppState();
    const settings = projectSettings(595000, {
      interestRatePercent: 3.7,
      financingYears: 1
    });

    const result = calculateRealEstateFinancing(state.settings.year, settings, schedule(repeated(0, 12)));

    expect(result.startLoanAmount).toBe(595000);
    expect(result.years[0].interestDue).toBeGreaterThan(0);
    expect(result.years[0].interestPaid).toBe(0);
    expect(result.years[0].interestShortfall).toBeGreaterThan(0);
    expect(result.years[0].loanEnd).toBeGreaterThan(595000);
    expect(result.years[0].netPropertyWealth).toBeLessThan(0);
    expect(result.totalLoanCost).toBeGreaterThan(595000);
  });

  it("keeps total loan cost independent from repayment sources", () => {
    const state = defaultAppState();
    const settings = projectSettings(595000, {
      interestRatePercent: 3.7,
      financingYears: 25
    });

    const noRepayment = calculateRealEstateFinancing(state.settings.year, settings, schedule(repeated(0, 300)));
    const lowRepayment = calculateRealEstateFinancing(state.settings.year, settings, schedule(repeated(500, 300)));
    const highRepayment = calculateRealEstateFinancing(
      state.settings.year,
      settings,
      schedule(repeated(5000, 300), repeated(1000, 300), repeated(500, 300), 0, repeated(250, 300))
    );

    expect(noRepayment.totalLoanCost).toBe(lowRepayment.totalLoanCost);
    expect(lowRepayment.totalLoanCost).toBe(highRepayment.totalLoanCost);
    expect(noRepayment.years[0].loanEnd).toBeGreaterThan(highRepayment.years[0].loanEnd);
    expect(noRepayment.totalInterestShortfall).toBeGreaterThan(highRepayment.totalInterestShortfall);
  });

  it("calculates total loan cost from monthly compounding over the financing period", () => {
    const state = defaultAppState();
    const settings = projectSettings(595000, {
      interestRatePercent: 3.7,
      financingYears: 25
    });

    const result = calculateRealEstateFinancing(state.settings.year, settings, schedule(repeated(1000, 300)));

    expect(result.totalLoanCost).toBe(expectedFixedTotalLoanCost(595000, 3.7, 25));
    expect(result.totalLoanCost).toBeCloseTo(1498377.73, 2);
  });

  it("changes fixed total loan cost only through loan basis, interest, and financing period", () => {
    const state = defaultAppState();
    const settings = projectSettings(120000, {
      interestRatePercent: 3,
      financingStartAge: 45,
      financingEndAge: 70
    });

    const base = calculateRealEstateFinancing(state.settings.year, settings, schedule(repeated(1000, 300)));
    const higherInterest = calculateRealEstateFinancing(
      state.settings.year,
      { ...settings, interestRatePercent: 4 },
      schedule(repeated(1000, 300))
    );
    const higherProjectCost = calculateRealEstateFinancing(
      state.settings.year,
      { ...settings, purchasePrice: 140000 },
      schedule(repeated(1000, 300))
    );
    const withEquity = calculateRealEstateFinancing(
      state.settings.year,
      settings,
      schedule(repeated(1000, 300), [], [], 20000)
    );
    const shorterFinancing = calculateRealEstateFinancing(
      state.settings.year,
      { ...settings, financingEndAge: 65 },
      schedule(repeated(1000, 300))
    );

    expect(base.startLoanAmount).toBe(120000);
    expect(withEquity.startLoanAmount).toBe(100000);
    expect(higherInterest.totalLoanCost).toBeGreaterThan(base.totalLoanCost);
    expect(higherProjectCost.totalLoanCost).toBeGreaterThan(base.totalLoanCost);
    expect(withEquity.totalLoanCost).toBeLessThan(base.totalLoanCost);
    expect(shorterFinancing.totalLoanCost).toBeLessThan(base.totalLoanCost);
  });

  it("derives the financing period from start and end age", () => {
    const state = defaultAppState();
    const settings = projectSettings(120000, {
      financingStartAge: 45,
      financingEndAge: 70,
      financingYears: 99,
      interestRatePercent: 0
    });

    const result = calculateRealEstateFinancing(state.settings.year, settings, schedule(repeated(1000, 300)));

    expect(result.financingYears).toBe(25);
    expect(result.years).toHaveLength(25);
  });

  it("stops scheduled repayment after the target period and keeps interest running", () => {
    const state = defaultAppState();
    const settings = projectSettings(120000, {
      interestRatePercent: 12,
      financingYears: 1
    });

    const result = calculateRealEstateFinancing(
      state.settings.year,
      settings,
      schedule(repeated(1000, 24)),
      { financingYears: 1, projectionYears: 2 }
    );

    expect(result.years).toHaveLength(2);
    expect(result.years[1].monthlyPaymentAvailable).toBe(0);
    expect(result.years[1].interestDue).toBeGreaterThan(0);
    expect(result.years[1].loanEnd).toBeGreaterThan(result.years[0].loanEnd);
  });

  it("respects a projection horizon before the financing end year", () => {
    const state = defaultAppState();
    const settings = projectSettings(120000, {
      interestRatePercent: 3,
      financingYears: 5
    });

    const result = calculateRealEstateFinancing(
      state.settings.year,
      settings,
      schedule(repeated(1000, 60)),
      { financingYears: 5, projectionYears: 2 }
    );

    expect(result.years).toHaveLength(2);
    expect(result.financingEndYear).toBe(state.settings.year + 5);
    expect(result.projectionEndYear).toBe(state.settings.year + 1);
  });

  it("marks invalid required settings", () => {
    const state = defaultAppState();
    const errors = validateRealEstateSettings({
      ...state.realEstate,
      purchasePrice: 0,
      interestRatePercent: -1
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(" ")).toContain("Kaufpreis");
  });

  it("defaults the real estate detail year to the first active credit year", () => {
    const state = defaultAppState();
    const settings = projectSettings(24000, {
      interestRatePercent: 0,
      financingYears: 3
    });
    const result = calculateRealEstateFinancing(state.settings.year, settings, schedule(repeated(2000, 36)));

    expect(defaultRealEstateDetailYear(result.years, null)).toBe(state.settings.year);
    expect(defaultRealEstateDetailYear(result.years, state.settings.year + 2)).toBe(state.settings.year + 2);
  });

  it("falls back to the first calculated year when no active credit exists", () => {
    const state = defaultAppState();
    const settings = projectSettings(0, {
      financingYears: 3
    });
    const result = calculateRealEstateFinancing(state.settings.year, settings, schedule([]));

    expect(defaultRealEstateDetailYear(result.years, null)).toBe(state.settings.year);
  });
});
