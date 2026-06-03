import { describe, expect, it } from "vitest";

import { defaultStatutoryPensionSettings } from "../data/defaults";
import {
  buildStatutoryPensionModel,
  statutoryPensionTaxableSharePercent,
  statutoryPensionContributionYears
} from "../domain/statutoryPension";
import { emptyIncomeTaxAdjustment, emptyIncomeTaxDeductionItems } from "../domain/incomeTracker";
import type { IncomeTrackerState, IncomeYearEntry } from "../types";
import { renderStatutoryPensionHtml } from "../views/statutoryPensionView";

function yearlyEntry(overrides: Partial<IncomeYearEntry> = {}): IncomeYearEntry {
  return {
    id: "income-2026",
    active: true,
    visible: true,
    year: 2026,
    label: "salary",
    person: "household",
    annualNetIncome: null,
    annualGrossIncome: 55400,
    taxesAndDeductions: null,
    taxDeductionItems: emptyIncomeTaxDeductionItems(),
    taxAdjustment: emptyIncomeTaxAdjustment(),
    capitalGainsAllowance: null,
    capitalGainsChurchTaxEnabled: false,
    capitalGainsChurchTaxRatePercent: 9,
    employer: "",
    note: "",
    source: "annual_statement",
    ...overrides
  };
}

function tracker(entries: IncomeYearEntry[]): IncomeTrackerState {
  return {
    yearlyEntries: entries,
    milestones: [],
    settings: {
      activeInputTab: "yearly",
      projectionMode: "off",
      manualGrowthRatePercent: null,
      savingsSharePercent: null,
      selectedYearlyLabels: []
    }
  };
}

describe("statutory pension model", () => {
  it("sums employee and employer pension contributions", () => {
    const settings = defaultStatutoryPensionSettings();
    const model = buildStatutoryPensionModel({
      tracker: tracker([
        yearlyEntry({
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 5152.2,
            employerPensionInsurance: 5152.2
          }
        })
      ]),
      settings,
      currentYear: 2026,
      birthYear: 1990
    });

    expect(model.employeeContributionTotal).toBe(5152.2);
    expect(model.employerContributionTotal).toBe(5152.2);
    expect(model.totalContribution).toBe(10304.4);
  });

  it("calculates gross income and pension points from contributions", () => {
    const settings = defaultStatutoryPensionSettings();
    const [year] = statutoryPensionContributionYears(
      [
        yearlyEntry({
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 5152.2,
            employerPensionInsurance: 5152.2
          }
        })
      ],
      settings
    );

    expect(year.relevantGrossIncome).toBeCloseTo(55400, 2);
    expect(year.pensionPoints).toBeCloseTo(1.0665, 4);
  });

  it("ignores inactive entries but includes entries hidden from charts", () => {
    const settings = defaultStatutoryPensionSettings();
    const years = statutoryPensionContributionYears(
      [
        yearlyEntry({
          id: "visible",
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 100,
            employerPensionInsurance: 100
          }
        }),
        yearlyEntry({
          id: "hidden",
          visible: false,
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 50,
            employerPensionInsurance: 50
          }
        }),
        yearlyEntry({
          id: "inactive",
          active: false,
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 500,
            employerPensionInsurance: 500
          }
        })
      ],
      settings
    );

    expect(years[0].totalContribution).toBe(300);
  });

  it("does not derive pension contributions from capital gains entries", () => {
    const settings = defaultStatutoryPensionSettings();
    const years = statutoryPensionContributionYears(
      [
        yearlyEntry({
          label: "dividends",
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 500,
            employerPensionInsurance: 500
          }
        })
      ],
      settings
    );

    expect(years).toEqual([]);
  });

  it("builds three fixed scenarios and falls back when income projection is unavailable", () => {
    const model = buildStatutoryPensionModel({
      tracker: tracker([
        yearlyEntry({
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 5152.2,
            employerPensionInsurance: 5152.2
          }
        })
      ]),
      settings: defaultStatutoryPensionSettings(),
      currentYear: 2026,
      birthYear: 1990
    });

    expect(model.scenarios.map((scenario) => scenario.id)).toEqual(["pessimistic", "base", "optimistic"]);
    expect(model.scenarios[1].fallbackToConstantIncome).toBe(true);
  });

  it("calculates the taxable pension share by retirement year", () => {
    expect(statutoryPensionTaxableSharePercent(2026)).toBe(84);
    expect(statutoryPensionTaxableSharePercent(2058)).toBe(100);
    expect(statutoryPensionTaxableSharePercent(2063)).toBe(100);
  });

  it("calculates scenario tax, health, care and net monthly pension", () => {
    const settings = defaultStatutoryPensionSettings();
    settings.scenarios.pessimistic = {
      ...settings.scenarios.pessimistic,
      retirementAge: 67,
      taxRatePercent: 20,
      healthInsurancePercent: 10,
      careInsurancePercent: 5
    };
    const model = buildStatutoryPensionModel({
      tracker: tracker([
        yearlyEntry({
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 5152.2,
            employerPensionInsurance: 5152.2
          }
        })
      ]),
      settings,
      currentYear: 2058,
      birthYear: 1991
    });
    const scenario = model.scenarios.find((item) => item.id === "pessimistic")!;

    expect(scenario.taxableSharePercent).toBe(100);
    expect(scenario.grossMonthlyPension).toBeCloseTo(scenario.projectedMonthlyPension, 2);
    expect(scenario.incomeTaxMonthly).toBeCloseTo(scenario.grossMonthlyPension * 0.2, 2);
    expect(scenario.healthInsuranceMonthly).toBeCloseTo(scenario.grossMonthlyPension * 0.1, 2);
    expect(scenario.careInsuranceMonthly).toBeCloseTo(scenario.grossMonthlyPension * 0.05, 2);
    expect(scenario.netMonthlyPension).toBeCloseTo(
      scenario.grossMonthlyPension -
        scenario.incomeTaxMonthly -
        scenario.healthInsuranceMonthly -
        scenario.careInsuranceMonthly,
      2
    );
  });

  it("renders deduction sliders, gross net legend and overlay bars", () => {
    const settings = defaultStatutoryPensionSettings();
    const model = buildStatutoryPensionModel({
      tracker: tracker([
        yearlyEntry({
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 5152.2,
            employerPensionInsurance: 5152.2
          }
        })
      ]),
      settings,
      currentYear: 2026,
      birthYear: 1990
    });
    const html = renderStatutoryPensionHtml(model, settings);

    expect(html).toContain('type="range"');
    expect(html).toContain('data-statutory-pension-scenario-field="taxRatePercent"');
    expect(html).toContain('data-statutory-pension-scenario-field="healthInsurancePercent"');
    expect(html).toContain('data-statutory-pension-scenario-field="careInsurancePercent"');
    expect(html).toContain("Monatsrente brutto");
    expect(html).toContain("Steuer:");
    expect(html).toContain("Krankenversicherung:");
    expect(html).toContain("Pflegeversicherung:");
    expect(html).toContain("Monatsrente netto");
    expect(html).toContain("Besteuerungsanteil");
    expect(html).toContain("statutory-pension-overlay-bar");
    expect(html).toContain("statutory-pension-overlay-net");
    expect(html).toContain("statutory-pension-overlay-gross");
  });
});
