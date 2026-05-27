import { describe, expect, it } from "vitest";

import { defaultAppState } from "../data/defaults";
import {
  calculateRealEstateFinancing,
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
});
