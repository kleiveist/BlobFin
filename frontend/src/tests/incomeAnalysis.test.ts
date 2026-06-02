import { describe, expect, it } from "vitest";

import {
  buildIncomeAnalysisLabelDetails,
  type IncomeAnalysisLabelOption
} from "../domain/incomeAnalysis";
import { emptyIncomeTaxAdjustment, emptyIncomeTaxDeductionItems } from "../domain/incomeTracker";
import type { IncomeYearEntry } from "../types";

const labelOptions: IncomeAnalysisLabelOption[] = [
  { id: "salary", label: "Gehalt", icon: "coins" },
  { id: "dividends", label: "Dividenden", icon: "dividend" },
  { id: "asset_income", label: "Einnahme aus Vermoegen", icon: "safe" },
  { id: "side_income", label: "Nebeneinkuenfte", icon: "income_plus" }
];

function yearlyEntry(overrides: Partial<IncomeYearEntry> = {}): IncomeYearEntry {
  return {
    id: "income-2012",
    active: true,
    visible: true,
    year: 2012,
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

describe("income analysis label details", () => {
  it("shows only active and visible labels for all years", () => {
    const details = buildIncomeAnalysisLabelDetails(
      [
        yearlyEntry({ id: "salary", label: "salary" }),
        yearlyEntry({ id: "dividends", label: "dividends", year: 2013 }),
        yearlyEntry({ id: "hidden", visible: false, label: "asset_income" }),
        yearlyEntry({ id: "inactive", active: false, label: "side_income" })
      ],
      labelOptions,
      [],
      "all"
    );

    expect(details.availableLabels.map((label) => label.id)).toEqual(["salary", "dividends"]);
    expect(details.groups.map((group) => group.label)).toEqual(["salary", "dividends"]);
  });

  it("scopes labels to a selected year", () => {
    const details = buildIncomeAnalysisLabelDetails(
      [
        yearlyEntry({ id: "salary-2012", label: "salary", year: 2012 }),
        yearlyEntry({ id: "dividends-2013", label: "dividends", year: 2013 })
      ],
      labelOptions,
      [],
      2012
    );

    expect(details.availableLabels.map((label) => label.id)).toEqual(["salary"]);
    expect(details.groups.map((group) => group.label)).toEqual(["salary"]);
  });

  it("filters resolved groups by multiple selected labels", () => {
    const details = buildIncomeAnalysisLabelDetails(
      [
        yearlyEntry({ id: "salary", label: "salary" }),
        yearlyEntry({ id: "dividends", label: "dividends" }),
        yearlyEntry({ id: "asset", label: "asset_income" })
      ],
      labelOptions,
      ["salary", "asset_income"],
      "all"
    );

    expect(details.selectedLabels).toEqual(["salary", "asset_income"]);
    expect(details.groups.map((group) => group.label)).toEqual(["salary", "asset_income"]);
    expect(details.availableGroups.map((group) => group.label)).toEqual(["salary", "dividends", "asset_income"]);
  });

  it("shows all present groups when no label is selected", () => {
    const details = buildIncomeAnalysisLabelDetails(
      [
        yearlyEntry({ id: "salary", label: "salary" }),
        yearlyEntry({ id: "dividends", label: "dividends" }),
        yearlyEntry({ id: "asset", label: "asset_income" })
      ],
      labelOptions,
      [],
      "all"
    );

    expect(details.groups.map((group) => group.label)).toEqual(["salary", "dividends", "asset_income"]);
  });

  it("drops selected labels that are no longer present in the current scope", () => {
    const details = buildIncomeAnalysisLabelDetails(
      [
        yearlyEntry({ id: "salary-2012", label: "salary", year: 2012 }),
        yearlyEntry({ id: "asset-2013", label: "asset_income", year: 2013 })
      ],
      labelOptions,
      ["salary", "asset_income"],
      2012
    );

    expect(details.selectedLabels).toEqual(["salary"]);
    expect(details.groups.map((group) => group.label)).toEqual(["salary"]);
  });

  it("calculates entry totals for resolved positions", () => {
    const details = buildIncomeAnalysisLabelDetails(
      [yearlyEntry({ label: "salary", annualGrossIncome: 50000 })],
      labelOptions,
      [],
      "all"
    );
    const entry = details.groups[0].entries[0];

    expect(entry.gross).toBe(50000);
    expect(entry.taxes).toBe(3000);
    expect(entry.social).toBe(2000);
    expect(entry.deductions).toBe(5000);
    expect(entry.net).toBe(45000);
  });

  it("builds yearly net points for label line and curve charts", () => {
    const details = buildIncomeAnalysisLabelDetails(
      [
        yearlyEntry({ id: "salary-2012", label: "salary", year: 2012, annualGrossIncome: 50000 }),
        yearlyEntry({ id: "salary-2013", label: "salary", year: 2013, annualGrossIncome: 60000 }),
        yearlyEntry({ id: "dividends-2013", label: "dividends", year: 2013, annualGrossIncome: 5000 })
      ],
      labelOptions,
      [],
      "all"
    );

    expect(
      details.yearPoints.map((point) => ({
        year: point.year,
        label: point.label,
        net: point.net
      }))
    ).toEqual([
      { year: 2012, label: "salary", net: 45000 },
      { year: 2013, label: "dividends", net: 0 },
      { year: 2013, label: "salary", net: 55000 }
    ]);
  });

  it("filters yearly label points by selected labels", () => {
    const details = buildIncomeAnalysisLabelDetails(
      [
        yearlyEntry({ id: "salary-2012", label: "salary", year: 2012 }),
        yearlyEntry({ id: "asset-2012", label: "asset_income", year: 2012, annualGrossIncome: 1000 })
      ],
      labelOptions,
      ["asset_income"],
      "all"
    );

    expect(details.yearPoints.map((point) => point.label)).toEqual(["asset_income"]);
  });
});
