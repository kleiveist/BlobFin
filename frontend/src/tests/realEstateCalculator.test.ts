import { describe, expect, it } from "vitest";

import { defaultAppState } from "../data/defaults";
import {
  calculateRealEstateFinancing,
  defaultRealEstateDetailYear,
  deriveInitialRepaymentPercentFromPayment,
  deriveLoanAmount,
  validateRealEstateSettings
} from "../domain/realEstateCalculator";
import type { RealEstateFinancingSourceSchedule } from "../types";

function schedule(
  monthlyPaymentSavings: number[],
  specialRepayments: number[] = [],
  withdrawalGainPayments: number[] = []
): RealEstateFinancingSourceSchedule {
  return { monthlyPaymentSavings, specialRepayments, withdrawalGainPayments };
}

function repeated(value: number, count = 240): number[] {
  return Array.from({ length: count }, () => value);
}

describe("real estate calculator", () => {
  it("derives a loan amount from total project cost and equity", () => {
    const state = defaultAppState();
    const settings = {
      ...state.realEstate,
      loanAmount: 0,
      purchasePrice: 300000,
      additionalPurchaseCosts: 10000,
      equityCapital: 60000,
      subsidyAmount: 5000
    };

    expect(deriveLoanAmount(settings)).toBeGreaterThan(0);
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

    const result = calculateRealEstateFinancing(state.settings.year, settings, schedule(repeated(1000, 36)));

    expect(deriveLoanAmount(settings)).toBe(250000);
    expect(result.years[0].propertyValue).toBe(300000);
    expect(result.years[0].loanEnd).toBe(238000);
    expect(result.validationErrors.join(" ")).not.toContain("Ziel-Monatsbelastung");
  });

  it("uses selected monthly savings as the only regular repayment source", () => {
    const state = defaultAppState();
    const settings = {
      ...state.realEstate,
      purchasePrice: 120000,
      loanAmount: 120000,
      interestRatePercent: 0,
      financingYears: 20
    };

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
    const settings = {
      ...state.realEstate,
      loanAmount: 120000,
      interestRatePercent: 0,
      financingYears: 5
    };

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
    const settings = {
      ...state.realEstate,
      loanAmount: 120000,
      interestRatePercent: 0,
      financingYears: 5
    };

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

  it("does not invent payments to cover interest shortfalls", () => {
    const state = defaultAppState();
    const settings = {
      ...state.realEstate,
      loanAmount: 120000,
      interestRatePercent: 12,
      financingYears: 1
    };

    const result = calculateRealEstateFinancing(state.settings.year, settings, schedule(repeated(500, 12)));

    expect(result.years[0].principalFromMonthlyPayment).toBe(0);
    expect(result.years[0].loanEnd).toBe(120000);
    expect(result.years[0].interestShortfall).toBeGreaterThan(0);
    expect(result.validationErrors.join(" ")).toContain("Zinsen nicht vollstaendig");
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
    const settings = {
      ...state.realEstate,
      loanAmount: 24000,
      interestRatePercent: 0,
      financingYears: 3
    };
    const result = calculateRealEstateFinancing(state.settings.year, settings, schedule(repeated(2000, 36)));

    expect(defaultRealEstateDetailYear(result.years, null)).toBe(state.settings.year);
    expect(defaultRealEstateDetailYear(result.years, state.settings.year + 2)).toBe(state.settings.year + 2);
  });

  it("falls back to the first calculated year when no active credit exists", () => {
    const state = defaultAppState();
    const settings = {
      ...state.realEstate,
      loanAmount: 0,
      purchasePrice: 0,
      equityCapital: 0,
      financingYears: 3
    };
    const result = calculateRealEstateFinancing(state.settings.year, settings, schedule([]));

    expect(defaultRealEstateDetailYear(result.years, null)).toBe(state.settings.year);
  });
});
