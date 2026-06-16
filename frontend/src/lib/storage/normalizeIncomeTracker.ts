import { createId, defaultIncomeTrackerState, defaultPlanningSettings } from "../../data/defaults";
import { DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT } from "../../domain/incomeTracker";
import { normalizeIncomeTaxRuleLabel } from "../../domain/incomeTaxRules";
import type {
  CareerMilestone,
  CareerMilestoneImpact,
  IncomeEmploymentContext,
  IncomeMinijobType,
  IncomePerson,
  IncomeProjectionMode,
  IncomeStudentEmploymentMode,
  IncomeTaxAdjustment,
  IncomeTaxAdjustmentType,
  IncomeTaxDeductionField,
  IncomeTaxDeductionItems,
  IncomeTrackerSettings,
  IncomeTrackerState,
  IncomeYearEntry,
  IncomeYearEntrySource
} from "../../types";
import { arrayOrEmpty, booleanOrDefault, isRecord, nullableNumberOrDefault, numberOrDefault, stringArrayOrDefault } from "./validators";

const INCOME_TAX_DEDUCTION_FIELDS: IncomeTaxDeductionField[] = [
  "wageTax",
  "solidaritySurcharge",
  "churchTax",
  "capitalGainsTax",
  "capitalGainsSolidaritySurcharge",
  "capitalGainsChurchTax",
  "pensionInsurance",
  "healthInsurance",
  "careInsurance",
  "unemploymentInsurance",
  "employerPensionInsurance"
];

export function normalizeIncomeTrackerState(value: unknown): IncomeTrackerState {
  const fallback = defaultIncomeTrackerState();
  if (!isRecord(value)) return fallback;
  return {
    yearlyEntries: arrayOrEmpty(value.yearlyEntries).map(normalizeIncomeYearEntry),
    milestones: arrayOrEmpty(value.milestones).map(normalizeCareerMilestone),
    settings: normalizeIncomeTrackerSettings(value.settings)
  };
}

export function normalizeIncomeTrackerSettings(value: unknown): IncomeTrackerSettings {
  const fallback = defaultIncomeTrackerState().settings;
  if (!isRecord(value)) return fallback;
  return {
    activeInputTab: normalizeIncomeInputTab(value.activeInputTab, fallback.activeInputTab),
    projectionMode: normalizeIncomeProjectionMode(value.projectionMode, fallback.projectionMode),
    manualGrowthRatePercent: nullableNumberOrDefault(
      value.manualGrowthRatePercent,
      fallback.manualGrowthRatePercent
    ),
    savingsSharePercent: nullableNumberOrDefault(value.savingsSharePercent, fallback.savingsSharePercent),
    selectedYearlyLabels: stringArrayOrDefault(value.selectedYearlyLabels, fallback.selectedYearlyLabels).map(
      normalizeIncomeTrackerLabel
    )
  };
}

export function normalizeIncomeYearEntry(value: unknown): IncomeYearEntry {
  const entry = isRecord(value) ? value : {};
  return {
    id: String(entry.id || createId()),
    active: booleanOrDefault(entry.active, true),
    visible: booleanOrDefault(entry.visible, true),
    year: Math.round(numberOrDefault(entry.year, defaultPlanningSettings().year)),
    label: normalizeIncomeTrackerLabel(entry.label),
    person: normalizeIncomePerson(entry.person),
    annualNetIncome: nullableNumberOrDefault(entry.annualNetIncome, null),
    annualGrossIncome: nullableNumberOrDefault(entry.annualGrossIncome, null),
    taxesAndDeductions: nullableNumberOrDefault(entry.taxesAndDeductions, null),
    taxDeductionItems: normalizeIncomeTaxDeductionItems(entry.taxDeductionItems),
    taxAdjustment: normalizeIncomeTaxAdjustment(entry.taxAdjustment),
    capitalGainsAllowance: nullableNumberOrDefault(entry.capitalGainsAllowance, null),
    capitalGainsChurchTaxEnabled: booleanOrDefault(entry.capitalGainsChurchTaxEnabled, false),
    capitalGainsChurchTaxRatePercent: normalizeCapitalGainsChurchTaxRate(entry.capitalGainsChurchTaxRatePercent),
    employmentContext: normalizeIncomeEmploymentContext(entry.employmentContext),
    minijobType: normalizeIncomeMinijobType(entry.minijobType),
    considerPensionInsurance: booleanOrDefault(entry.considerPensionInsurance, false),
    isRvExempt: booleanOrDefault(entry.isRvExempt, false),
    shortTermEmploymentDays: nullableNumberOrDefault(entry.shortTermEmploymentDays, null),
    shortTermEmploymentMonths: nullableNumberOrDefault(entry.shortTermEmploymentMonths, null),
    studentEmploymentMode: normalizeIncomeStudentEmploymentMode(entry.studentEmploymentMode),
    requiresManualTaxReview: booleanOrDefault(entry.requiresManualTaxReview, false),
    employer: String(entry.employer ?? ""),
    note: String(entry.note ?? ""),
    source: normalizeIncomeYearSource(entry.source)
  };
}

export function normalizeIncomeTaxDeductionItems(value: unknown): IncomeTaxDeductionItems {
  const item = isRecord(value) ? value : {};
  return INCOME_TAX_DEDUCTION_FIELDS.reduce<IncomeTaxDeductionItems>(
    (result, field) => ({ ...result, [field]: nullableNumberOrDefault(item[field], null) }),
    {
      wageTax: null,
      solidaritySurcharge: null,
      churchTax: null,
      capitalGainsTax: null,
      capitalGainsSolidaritySurcharge: null,
      capitalGainsChurchTax: null,
      pensionInsurance: null,
      healthInsurance: null,
      careInsurance: null,
      unemploymentInsurance: null,
      employerPensionInsurance: null
    }
  );
}

export function normalizeCapitalGainsChurchTaxRate(value: unknown): number {
  return numberOrDefault(value, DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT) === 8
    ? 8
    : DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT;
}

export function normalizeIncomeTaxAdjustment(value: unknown): IncomeTaxAdjustment {
  const adjustment = isRecord(value) ? value : {};
  return {
    type: normalizeIncomeTaxAdjustmentType(adjustment.type),
    amount: nullableNumberOrDefault(adjustment.amount, null)
  };
}

export function normalizeIncomeTaxAdjustmentType(value: unknown): IncomeTaxAdjustmentType {
  return value === "payment" ? "payment" : "refund";
}

export function normalizeCareerMilestone(value: unknown): CareerMilestone {
  const entry = isRecord(value) ? value : {};
  return {
    id: String(entry.id || createId()),
    date: String(entry.date ?? ""),
    type: String(entry.type || "Gehaltserhoehung"),
    description: String(entry.description ?? ""),
    impact: normalizeCareerMilestoneImpact(entry.impact),
    linkedYear: nullableNumberOrDefault(entry.linkedYear, null)
  };
}

export function normalizeIncomePerson(value: unknown): IncomePerson {
  return value === "person1" || value === "person2" || value === "household" ? value : "household";
}

export function normalizeIncomeYearSource(value: unknown): IncomeYearEntrySource {
  return value === "manual" ? "manual" : "annual_statement";
}

export function normalizeIncomeTrackerLabel(value: unknown): string {
  return normalizeIncomeTaxRuleLabel(String(value ?? "salary")) || "salary";
}

export function normalizeIncomeEmploymentContext(value: unknown): IncomeEmploymentContext {
  if (value === "earned_claim" || value === "other") return value;
  return "job_loss";
}

export function normalizeIncomeMinijobType(value: unknown): IncomeMinijobType {
  return value === "private_household" ? "private_household" : "commercial";
}

export function normalizeIncomeStudentEmploymentMode(value: unknown): IncomeStudentEmploymentMode {
  return value === "short_term" ? "short_term" : "minijob";
}

export function normalizeCareerMilestoneImpact(value: unknown): CareerMilestoneImpact {
  if (value === "negative" || value === "neutral" || value === "positive") return value;
  return "positive";
}

export function normalizeIncomeProjectionMode(value: unknown, fallback: IncomeProjectionMode): IncomeProjectionMode {
  if (value === "off" || value === "historical_average" || value === "manual") return value;
  return fallback;
}

export function normalizeIncomeInputTab(
  value: unknown,
  fallback: IncomeTrackerSettings["activeInputTab"]
): IncomeTrackerSettings["activeInputTab"] {
  if (value === "yearly" || value === "milestones" || value === "settings") return value;
  return fallback;
}
