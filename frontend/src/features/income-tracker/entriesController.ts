import { createId } from "../../data/defaults";
import {
  DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT,
  emptyIncomeTaxAdjustment,
  emptyIncomeTaxDeductionItems,
  incomeTaxDeductionItemsTotal
} from "../../domain/incomeTracker";
import type { AppState, IncomeTaxDeductionField, IncomeYearEntry } from "../../types";
import { INCOME_TAX_DEDUCTION_ROWS } from "./config";
import {
  incomeEmploymentContext,
  incomeInteger,
  incomeMinijobType,
  incomePerson,
  incomeStudentEmploymentMode,
  incomeTaxAdjustmentType,
  incomeYearSource,
  nullableInputNumber
} from "./exportController";

export interface IncomeEntriesControllerContext {
  getState(): AppState;
  renderAll(): void;
  sanitizeIncomeYearEntriesWithTaxRules(entries: IncomeYearEntry[]): IncomeYearEntry[];
  finishIncomeUpdate(renderMode: "none" | "live" | "full", collection?: string, id?: string, field?: string): void;
  incomeYearLabel(value: string | undefined): string;
  capitalGainsChurchTaxRate(value: number | null | undefined): number;
}

export function addIncomeYearlyEntryWithContext(context: IncomeEntriesControllerContext): void {
  context.getState().incomeTracker = {
    ...context.getState().incomeTracker,
    yearlyEntries: [
      ...context.getState().incomeTracker.yearlyEntries,
      {
        id: createId(),
        active: true,
        visible: true,
        year: context.getState().settings.year,
        label: "salary",
        person: "household",
        annualNetIncome: null,
        annualGrossIncome: null,
        taxesAndDeductions: null,
        taxDeductionItems: emptyIncomeTaxDeductionItems(),
        taxAdjustment: emptyIncomeTaxAdjustment(),
        capitalGainsAllowance: null,
        capitalGainsChurchTaxEnabled: false,
        capitalGainsChurchTaxRatePercent: DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT,
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
        source: "annual_statement"
      }
    ]
  };
  context.renderAll();
}

export function removeIncomeYearlyEntryWithContext(context: IncomeEntriesControllerContext, action: string): boolean {
  if (!action.startsWith("income-remove-yearly-")) return false;
  const id = action.replace("income-remove-yearly-", "");
  const yearlyEntries = context.getState().incomeTracker.yearlyEntries.filter((entry) => entry.id !== id);
  context.getState().incomeTracker = {
    ...context.getState().incomeTracker,
    yearlyEntries: context.sanitizeIncomeYearEntriesWithTaxRules(yearlyEntries)
  };
  return true;
}

export function updateIncomeYearlyEntryWithContext(
  context: IncomeEntriesControllerContext,
  id: string,
  field: string,
  value: string,
  renderMode: "none" | "live" | "full"
): boolean {
  const yearlyEntries = context.getState().incomeTracker.yearlyEntries.map((entry) =>
    entry.id === id ? updateIncomeYearEntry(context, entry, field, value) : entry
  );
  context.getState().incomeTracker = {
    ...context.getState().incomeTracker,
    yearlyEntries: context.sanitizeIncomeYearEntriesWithTaxRules(yearlyEntries)
  };
  context.finishIncomeUpdate(renderMode, "yearlyEntries", id, field);
  return true;
}

function updateIncomeYearEntry(
  context: IncomeEntriesControllerContext,
  entry: IncomeYearEntry,
  field: string,
  value: string
): IncomeYearEntry {
  if (field === "active") return { ...entry, active: value === "true" };
  if (field === "visible") return { ...entry, visible: value === "true" };
  if (field === "year") return { ...entry, year: incomeInteger(value, context.getState().settings.year) };
  if (field === "label") return { ...entry, label: context.incomeYearLabel(value) };
  if (field === "person") return { ...entry, person: incomePerson(value) };
  if (field === "source") return { ...entry, source: incomeYearSource(value) };
  if (field === "employmentContext") return { ...entry, employmentContext: incomeEmploymentContext(value) };
  if (field === "minijobType") return { ...entry, minijobType: incomeMinijobType(value) };
  if (field === "considerPensionInsurance") return { ...entry, considerPensionInsurance: value === "true" };
  if (field === "isRvExempt") return { ...entry, isRvExempt: value === "true" };
  if (field === "shortTermEmploymentDays") return { ...entry, shortTermEmploymentDays: nullableInputNumber(value) };
  if (field === "shortTermEmploymentMonths") return { ...entry, shortTermEmploymentMonths: nullableInputNumber(value) };
  if (field === "studentEmploymentMode") return { ...entry, studentEmploymentMode: incomeStudentEmploymentMode(value) };
  if (field === "requiresManualTaxReview") return { ...entry, requiresManualTaxReview: value === "true" };
  if (field === "employer") return { ...entry, employer: value };
  if (field === "note") return { ...entry, note: value };
  if (field === "annualNetIncome") return { ...entry, annualNetIncome: nullableInputNumber(value) };
  if (field === "annualGrossIncome") return { ...entry, annualGrossIncome: nullableInputNumber(value) };
  if (field === "taxesAndDeductions") return { ...entry, taxesAndDeductions: nullableInputNumber(value) };
  if (field === "taxAdjustment.type") {
    return { ...entry, taxAdjustment: { ...entry.taxAdjustment, type: incomeTaxAdjustmentType(value) } };
  }
  if (field === "taxAdjustment.amount") {
    return { ...entry, taxAdjustment: { ...entry.taxAdjustment, amount: nullableInputNumber(value) } };
  }
  if (field === "capitalGainsAllowance") return { ...entry, capitalGainsAllowance: nullableInputNumber(value) };
  if (field === "capitalGainsChurchTaxEnabled") return { ...entry, capitalGainsChurchTaxEnabled: value === "true" };
  if (field === "capitalGainsChurchTaxRatePercent") {
    return { ...entry, capitalGainsChurchTaxRatePercent: context.capitalGainsChurchTaxRate(nullableInputNumber(value)) };
  }
  if (field.startsWith("taxDeductionItems.")) {
    const itemField = field.replace("taxDeductionItems.", "");
    if (!isIncomeTaxDeductionField(itemField)) return entry;
    const taxDeductionItems = {
      ...entry.taxDeductionItems,
      [itemField]: nullableInputNumber(value)
    };
    return {
      ...entry,
      taxDeductionItems,
      taxesAndDeductions: incomeTaxDeductionItemsTotal(taxDeductionItems)
    };
  }
  return entry;
}

function isIncomeTaxDeductionField(value: string): value is IncomeTaxDeductionField {
  return INCOME_TAX_DEDUCTION_ROWS.some((row) => row.field === value);
}
