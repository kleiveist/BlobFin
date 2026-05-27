import { describe, expect, it } from "vitest";

import { defaultAppState } from "../data/defaults";
import { calculateRealEstateFinancing, deriveLoanAmount, deriveMonthlyPayment, validateRealEstateSettings } from "../domain/realEstateCalculator";

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
    expect(deriveMonthlyPayment(settings, deriveLoanAmount(settings))).toBeGreaterThan(0);
  });

  it("supports 0 percent interest and repays debt by principal", () => {
    const state = defaultAppState();
    const settings = {
      ...state.realEstate,
      purchasePrice: 120000,
      loanAmount: 120000,
      interestRatePercent: 0,
      initialRepaymentPercent: 0,
      monthlyPayment: 1000,
      financingYears: 20,
      specialRepaymentAmount: 0,
      specialRepaymentRhythm: "none" as const
    };

    const result = calculateRealEstateFinancing(state.settings.year, settings);

    expect(result.validationErrors).toEqual([]);
    expect(result.years[0].interestPaid).toBe(0);
    expect(result.years[0].principalPaid).toBeCloseTo(12000, 2);
    expect(result.years[0].loanEnd).toBeCloseTo(108000, 2);
  });

  it("applies yearly special repayments and reduces remaining debt", () => {
    const state = defaultAppState();
    const settings = {
      ...state.realEstate,
      loanAmount: 200000,
      interestRatePercent: 3,
      initialRepaymentPercent: 2,
      monthlyPayment: 900,
      financingYears: 30,
      specialRepaymentAmount: 5000,
      specialRepaymentRhythm: "yearly" as const
    };

    const withoutSpecial = calculateRealEstateFinancing(state.settings.year, {
      ...settings,
      specialRepaymentAmount: 0
    });
    const withSpecial = calculateRealEstateFinancing(state.settings.year, settings);

    expect(withSpecial.years[0].specialRepayment).toBe(5000);
    expect(withSpecial.years[4].loanEnd).toBeLessThan(withoutSpecial.years[4].loanEnd);
  });

  it("marks invalid negative values", () => {
    const state = defaultAppState();
    const errors = validateRealEstateSettings({
      ...state.realEstate,
      purchasePrice: 0,
      interestRatePercent: -1,
      initialRepaymentPercent: -2,
      monthlyPayment: -100
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(" ")).toContain("Kaufpreis");
  });
});
