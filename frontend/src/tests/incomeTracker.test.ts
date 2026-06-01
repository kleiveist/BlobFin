import { describe, expect, it } from "vitest";

import {
  buildIncomeTrackerModel,
  emptyIncomeTaxAdjustment,
  emptyIncomeTaxDeductionItems,
  incomeYearEntryCalculatedNetIncome,
  incomeYearEntryTaxDeductions,
  incomeYearEntryTaxTotal
} from "../domain/incomeTracker";
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
});
