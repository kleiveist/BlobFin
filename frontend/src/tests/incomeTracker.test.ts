import { describe, expect, it } from "vitest";

import {
  applyCapitalGainsTaxToEntries,
  applyCapitalGainsTaxToEntry,
  buildIncomeChartModel,
  buildIncomeTrackerModel,
  emptyIncomeTaxAdjustment,
  emptyIncomeTaxDeductionItems,
  incomeYearEntryCalculatedNetIncome,
  incomeYearEntryTaxDeductions,
  incomeYearEntryTaxTotal
} from "../domain/incomeTracker";
import {
  evaluateIncomeTaxAndContributionRules,
  taxRuleConfig
} from "../domain/incomeTaxRules";
import type { IncomeTrackerState, IncomeYearEntry } from "../types";

function yearlyEntry(overrides: Partial<IncomeYearEntry> = {}): IncomeYearEntry {
  return {
    id: "income-2026",
    active: true,
    visible: true,
    year: 2026,
    label: "salary",
    person: "household",
    annualNetIncome: null,
    annualGrossIncome: 50000,
    taxesAndDeductions: null,
    taxDeductionItems: {
      ...emptyIncomeTaxDeductionItems(),
      wageTax: 3000,
      healthInsurance: 2000
    },
    taxAdjustment: emptyIncomeTaxAdjustment(),
    capitalGainsAllowance: null,
    capitalGainsChurchTaxEnabled: false,
    capitalGainsChurchTaxRatePercent: 9,
    employmentContext: "job_loss",
    minijobType: "commercial",
    considerPensionInsurance: false,
    isRvExempt: false,
    shortTermEmploymentDays: null,
    shortTermEmploymentMonths: null,
    studentEmploymentMode: "minijob",
    requiresManualTaxReview: false,
    employer: "",
    note: "",
    source: "annual_statement",
    ...overrides
  };
}

describe("income tracker tax adjustment", () => {
  it("deducts a tax refund from taxes, deductions and calculated net income", () => {
    const entry = yearlyEntry({ taxAdjustment: { type: "refund", amount: 500 } });

    expect(incomeYearEntryTaxTotal(entry)).toBe(2500);
    expect(incomeYearEntryTaxDeductions(entry)).toBe(4500);
    expect(incomeYearEntryCalculatedNetIncome(entry)).toBe(45500);
  });

  it("adds a tax payment to taxes, deductions and calculated net income", () => {
    const entry = yearlyEntry({ taxAdjustment: { type: "payment", amount: 700 } });

    expect(incomeYearEntryTaxTotal(entry)).toBe(3700);
    expect(incomeYearEntryTaxDeductions(entry)).toBe(5700);
    expect(incomeYearEntryCalculatedNetIncome(entry)).toBe(44300);
  });

  it("uses the adjusted net income in the yearly model", () => {
    const tracker: IncomeTrackerState = {
      yearlyEntries: [yearlyEntry({ taxAdjustment: { type: "refund", amount: 500 } })],
      milestones: [],
      settings: {
        activeInputTab: "yearly",
        projectionMode: "off",
        manualGrowthRatePercent: null,
        savingsSharePercent: null,
        selectedYearlyLabels: []
      }
    };

    const model = buildIncomeTrackerModel(tracker);

    expect(model.latest?.annualNet).toBe(45500);
  });

  it("excludes inactive entries from the yearly model", () => {
    const tracker: IncomeTrackerState = {
      yearlyEntries: [
        yearlyEntry({ id: "active-income", year: 2025, annualGrossIncome: 40000 }),
        yearlyEntry({ id: "inactive-income", active: false, year: 2026, annualGrossIncome: 80000 })
      ],
      milestones: [],
      settings: {
        activeInputTab: "yearly",
        projectionMode: "off",
        manualGrowthRatePercent: null,
        savingsSharePercent: null,
        selectedYearlyLabels: []
      }
    };

    const model = buildIncomeTrackerModel(tracker);

    expect(model.valueYears.map((year) => year.year)).toEqual([2025]);
    expect(model.latest?.annualNet).toBe(35000);
  });

  it("keeps invisible entries in the yearly model totals", () => {
    const tracker: IncomeTrackerState = {
      yearlyEntries: [yearlyEntry({ visible: false, taxAdjustment: { type: "refund", amount: 500 } })],
      milestones: [],
      settings: {
        activeInputTab: "yearly",
        projectionMode: "off",
        manualGrowthRatePercent: null,
        savingsSharePercent: null,
        selectedYearlyLabels: []
      }
    };

    const model = buildIncomeTrackerModel(tracker);

    expect(model.latest?.annualNet).toBe(45500);
  });

  it("excludes invisible entries from the income chart model", () => {
    const tracker: IncomeTrackerState = {
      yearlyEntries: [
        yearlyEntry({ id: "visible-income", year: 2025, annualGrossIncome: 40000 }),
        yearlyEntry({ id: "hidden-income", visible: false, year: 2026, annualGrossIncome: 80000 })
      ],
      milestones: [],
      settings: {
        activeInputTab: "yearly",
        projectionMode: "off",
        manualGrowthRatePercent: null,
        savingsSharePercent: null,
        selectedYearlyLabels: []
      }
    };

    const model = buildIncomeTrackerModel(tracker);
    const chartModel = buildIncomeChartModel(tracker, { annualInflationRatePercent: 2 });

    expect(model.valueYears.map((year) => year.year)).toEqual([2025, 2026]);
    expect(chartModel.valueYears.map((year) => year.year)).toEqual([2025]);
    expect(chartModel.ratioYears.map((year) => year.year)).toEqual([2025]);
  });
});

describe("income tracker capital gains tax", () => {
  it("calculates capital gains tax and soli after the entered allowance", () => {
    const entry = applyCapitalGainsTaxToEntry(
      yearlyEntry({
        label: "dividends",
        annualGrossIncome: 250,
        capitalGainsAllowance: 50
      })
    );

    expect(entry.taxDeductionItems.capitalGainsTax).toBe(50);
    expect(entry.taxDeductionItems.capitalGainsSolidaritySurcharge).toBe(2.75);
    expect(entry.taxDeductionItems.capitalGainsChurchTax).toBe(0);
    expect(incomeYearEntryTaxDeductions(entry)).toBe(52.75);
    expect(incomeYearEntryCalculatedNetIncome(entry)).toBe(197.25);
  });

  it("allows an entered allowance above the income and produces no tax", () => {
    const entry = applyCapitalGainsTaxToEntry(
      yearlyEntry({
        label: "asset_income",
        annualGrossIncome: 445,
        capitalGainsAllowance: 500
      })
    );

    expect(entry.capitalGainsAllowance).toBe(500);
    expect(entry.taxDeductionItems.capitalGainsTax).toBe(0);
    expect(entry.taxDeductionItems.capitalGainsSolidaritySurcharge).toBe(0);
    expect(entry.taxDeductionItems.capitalGainsChurchTax).toBe(0);
    expect(incomeYearEntryTaxDeductions(entry)).toBe(0);
    expect(incomeYearEntryCalculatedNetIncome(entry)).toBe(445);
  });

  it("removes social contribution fields from capital gains entries", () => {
    const entry = applyCapitalGainsTaxToEntry(
      yearlyEntry({
        label: "dividends",
        annualGrossIncome: 1000,
        taxDeductionItems: {
          ...emptyIncomeTaxDeductionItems(),
          capitalGainsTax: 20,
          pensionInsurance: 100,
          healthInsurance: 80,
          careInsurance: 20,
          unemploymentInsurance: 10,
          employerPensionInsurance: 120
        }
      })
    );

    expect(entry.taxDeductionItems.pensionInsurance).toBeNull();
    expect(entry.taxDeductionItems.healthInsurance).toBeNull();
    expect(entry.taxDeductionItems.careInsurance).toBeNull();
    expect(entry.taxDeductionItems.unemploymentInsurance).toBeNull();
    expect(entry.taxDeductionItems.employerPensionInsurance).toBeNull();
  });

  it("calculates optional church tax with 8 and 9 percent rates", () => {
    const eightPercent = applyCapitalGainsTaxToEntry(
      yearlyEntry({
        label: "dividends",
        annualGrossIncome: 1000,
        capitalGainsChurchTaxEnabled: true,
        capitalGainsChurchTaxRatePercent: 8
      })
    );
    const ninePercent = applyCapitalGainsTaxToEntry(
      yearlyEntry({
        label: "dividends",
        annualGrossIncome: 1000,
        capitalGainsChurchTaxEnabled: true,
        capitalGainsChurchTaxRatePercent: 9
      })
    );

    expect(eightPercent.taxDeductionItems.capitalGainsTax).toBeCloseTo(245.1, 2);
    expect(eightPercent.taxDeductionItems.capitalGainsSolidaritySurcharge).toBeCloseTo(13.48, 2);
    expect(eightPercent.taxDeductionItems.capitalGainsChurchTax).toBeCloseTo(19.61, 2);
    expect(ninePercent.taxDeductionItems.capitalGainsTax).toBeCloseTo(244.5, 2);
    expect(ninePercent.taxDeductionItems.capitalGainsSolidaritySurcharge).toBeCloseTo(13.45, 2);
    expect(ninePercent.taxDeductionItems.capitalGainsChurchTax).toBeCloseTo(22.01, 2);
  });

  it("caps active capital gains allowances at 1000 EUR per year in entry order", () => {
    const entries = applyCapitalGainsTaxToEntries([
      yearlyEntry({ id: "first", label: "dividends", annualGrossIncome: 600, capitalGainsAllowance: 600 }),
      yearlyEntry({ id: "second", label: "asset_income", annualGrossIncome: 500, capitalGainsAllowance: 500 }),
      yearlyEntry({ id: "third", label: "dividends", annualGrossIncome: 100, capitalGainsAllowance: 100 })
    ]);

    expect(entries.map((entry) => entry.capitalGainsAllowance)).toEqual([600, 400, null]);
    expect(entries[1].taxDeductionItems.capitalGainsTax).toBe(25);
    expect(entries[2].taxDeductionItems.capitalGainsTax).toBe(25);
  });

  it("does not let inactive capital gains entries consume the yearly allowance", () => {
    const entries = applyCapitalGainsTaxToEntries([
      yearlyEntry({ id: "inactive", active: false, label: "dividends", annualGrossIncome: 800, capitalGainsAllowance: 800 }),
      yearlyEntry({ id: "active", label: "asset_income", annualGrossIncome: 800, capitalGainsAllowance: 800 })
    ]);

    expect(entries.map((entry) => entry.capitalGainsAllowance)).toEqual([800, 800]);
    expect(entries[1].taxDeductionItems.capitalGainsTax).toBe(0);
  });
});

describe("income tracker tax and contribution rules", () => {
  it("locks all tax and contribution fields for pocket money", () => {
    const rule = evaluateIncomeTaxAndContributionRules({
      label: "pocket_money",
      annualAmount: 1200,
      year: 2026
    });

    expect(rule.taxFieldsEnabled).toBe(false);
    expect(rule.contributionFieldsEnabled).toBe(false);
    expect(rule.status).toBe("locked");
  });

  it("keeps taxes enabled and social contributions disabled for severance payments", () => {
    const rule = evaluateIncomeTaxAndContributionRules({
      label: "severance_payment",
      annualAmount: 15000,
      year: 2026
    });

    expect(rule.taxFieldsEnabled).toBe(true);
    expect(rule.contributionFieldsEnabled).toBe(false);
    expect(rule.warningKey).toBe("incomeTaxRules.severance.warning");
  });

  it("uses a dedicated capital gains rule for dividends and asset income", () => {
    for (const label of ["dividends", "asset_income"]) {
      const rule = evaluateIncomeTaxAndContributionRules({
        label,
        annualAmount: 250,
        year: 2026
      });

      expect(rule.taxFieldsEnabled).toBe(true);
      expect(rule.contributionFieldsEnabled).toBe(false);
      expect(rule.reasonKey).toBe("incomeTaxRules.capitalGains.enabled");
    }
  });

  it("always locks social contributions for garage parking rental and unlocks taxes after the side-income threshold", () => {
    const below = evaluateIncomeTaxAndContributionRules({
      label: "Garage / Stellplatz",
      annualAmount: 300,
      aggregatedSideIncome: 410,
      year: 2026
    });
    const above = evaluateIncomeTaxAndContributionRules({
      label: "garage_parking_rental",
      annualAmount: 500,
      aggregatedSideIncome: 411,
      year: 2026
    });

    expect(below.taxFieldsEnabled).toBe(false);
    expect(below.contributionFieldsEnabled).toBe(false);
    expect(below.warningKey).toBe("incomeTaxRules.garage.general");
    expect(above.taxFieldsEnabled).toBe(true);
    expect(above.contributionFieldsEnabled).toBe(false);
    expect(above.warningKey).toBe("incomeTaxRules.garage.general");
  });

  it("applies the volunteer allowance and marks only the exceeding amount as taxable", () => {
    const below = evaluateIncomeTaxAndContributionRules({
      label: "Ehrenamtspauschale",
      annualAmount: 960,
      year: 2026
    });
    const above = evaluateIncomeTaxAndContributionRules({
      label: "volunteer_allowance",
      annualAmount: 1200,
      year: 2026
    });

    expect(below.taxFieldsEnabled).toBe(false);
    expect(above.taxFieldsEnabled).toBe(true);
    expect(above.contributionFieldsEnabled).toBe(false);
    expect(above.taxableAmount).toBe(240);
  });

  it("uses a separate trainer allowance", () => {
    const below = evaluateIncomeTaxAndContributionRules({
      label: "Übungsleiterpauschale",
      annualAmount: 3300,
      year: 2026
    });
    const above = evaluateIncomeTaxAndContributionRules({
      label: "trainer_allowance",
      annualAmount: 3600,
      year: 2026
    });

    expect(below.status).toBe("locked");
    expect(above.taxFieldsEnabled).toBe(true);
    expect(above.taxableAmount).toBe(300);
  });

  it("reads the 2026 minijob limits from yearly configuration and warns after annual limit overflow", () => {
    expect(taxRuleConfig[2026].minijobMonthlyLimit).toBe(603);
    expect(taxRuleConfig[2026].minijobAnnualLimit).toBe(7236);

    const below = evaluateIncomeTaxAndContributionRules({
      label: "minijob",
      annualAmount: 7236,
      year: 2026
    });
    const above = evaluateIncomeTaxAndContributionRules({
      label: "minijob",
      annualAmount: 7237,
      year: 2026
    });

    expect(below.taxFieldsEnabled).toBe(false);
    expect(below.contributionFieldsEnabled).toBe(false);
    expect(above.taxFieldsEnabled).toBe(true);
    expect(above.contributionFieldsEnabled).toBe(true);
    expect(above.warningKey).toBe("incomeTaxRules.minijob.warningAnnualLimitExceeded");
  });

  it("calculates the minijob employee pension contribution when pension insurance is active", () => {
    const commercial = evaluateIncomeTaxAndContributionRules({
      label: "minijob",
      annualAmount: 6000,
      year: 2026,
      considerPensionInsurance: true,
      isRvExempt: false,
      minijobType: "commercial"
    });
    const privateHousehold = evaluateIncomeTaxAndContributionRules({
      label: "minijob",
      annualAmount: 6000,
      year: 2026,
      considerPensionInsurance: true,
      isRvExempt: false,
      minijobType: "private_household"
    });

    expect(commercial.contributionFieldsEnabled).toBe(true);
    expect(commercial.estimatedEmployeePensionContribution).toBe(216);
    expect(privateHousehold.estimatedEmployeePensionContribution).toBe(816);
  });

  it("locks tax and contribution fields for child and youth jobs including newspaper delivery aliases", () => {
    const childYouthJob = evaluateIncomeTaxAndContributionRules({
      label: "child_youth_jobs",
      annualAmount: 5000,
      year: 2026
    });
    const oldNewspaperLabel = evaluateIncomeTaxAndContributionRules({
      label: "student_newspaper_delivery",
      annualAmount: 5000,
      year: 2026
    });

    expect(childYouthJob.taxFieldsEnabled).toBe(false);
    expect(childYouthJob.contributionFieldsEnabled).toBe(false);
    expect(childYouthJob.reasonKey).toBe("incomeTaxRules.childYouthJobs.locked");
    expect(oldNewspaperLabel.taxFieldsEnabled).toBe(false);
    expect(oldNewspaperLabel.contributionFieldsEnabled).toBe(false);
  });
});
