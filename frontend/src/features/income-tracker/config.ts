import type { CareerMilestoneImpact, IncomeEmploymentContext, IncomeMinijobType, IncomeProjectionMode, IncomeStudentEmploymentMode, IncomeTaxAdjustmentType, IncomeTaxDeductionField } from "./model";

export const INCOME_TAX_ADJUSTMENT_OPTIONS: Array<{ value: IncomeTaxAdjustmentType; label: string }> = [
  { value: "refund", label: "Rueckerstattung" },
  { value: "payment", label: "Nachzahlung" }
];
export type IncomeTaxDeductionCategory = "taxes" | "social" | "employer_social";
export const INCOME_TAX_DEDUCTION_ROWS: Array<{
  field: IncomeTaxDeductionField;
  nr: string;
  label: string;
  category: IncomeTaxDeductionCategory;
  capitalOnly?: boolean;
}> = [
  { field: "wageTax", nr: "4", label: "Einbehaltene Lohnsteuer von 3.", category: "taxes" },
  { field: "solidaritySurcharge", nr: "5", label: "Einbehaltener Solidaritaetszuschlag von 3.", category: "taxes" },
  { field: "churchTax", nr: "6", label: "Einbehaltene Kirchensteuer des Arbeitnehmers von 3.", category: "taxes" },
  { field: "capitalGainsTax", nr: "KAP", label: "Kapitalertragsteuer", category: "taxes", capitalOnly: true },
  {
    field: "capitalGainsSolidaritySurcharge",
    nr: "KAP",
    label: "Solidaritaetszuschlag zur Kapitalertragsteuer",
    category: "taxes",
    capitalOnly: true
  },
  {
    field: "capitalGainsChurchTax",
    nr: "KAP",
    label: "Kirchensteuer zur Kapitalertragsteuer",
    category: "taxes",
    capitalOnly: true
  },
  { field: "employerPensionInsurance", nr: "22", label: "Arbeitgeberbeitraege zur gesetzlichen RV", category: "employer_social" },
  { field: "pensionInsurance", nr: "23", label: "Arbeitnehmerbeitraege zur gesetzlichen RV", category: "social" },
  { field: "healthInsurance", nr: "25", label: "Arbeitnehmerbeitraege zur gesetzlichen KV", category: "social" },
  { field: "careInsurance", nr: "26", label: "Arbeitnehmerbeitraege zur sozialen PV", category: "social" },
  { field: "unemploymentInsurance", nr: "27", label: "Arbeitnehmerbeitraege zur AV", category: "social" }
];
export const INCOME_EMPLOYMENT_CONTEXT_OPTIONS: Array<{ value: IncomeEmploymentContext; label: string }> = [
  { value: "job_loss", label: "Verlust des Arbeitsplatzes" },
  { value: "earned_claim", label: "Bereits entstandener Anspruch" },
  { value: "other", label: "Andere Abgeltung" }
];
export const INCOME_MINIJOB_TYPE_OPTIONS: Array<{ value: IncomeMinijobType; label: string }> = [
  { value: "commercial", label: "Gewerblicher Minijob" },
  { value: "private_household", label: "Privathaushalt" }
];
export const INCOME_STUDENT_EMPLOYMENT_MODE_OPTIONS: Array<{ value: IncomeStudentEmploymentMode; label: string }> = [
  { value: "minijob", label: "Minijob" },
  { value: "short_term", label: "Kurzfristige Beschaeftigung" }
];
export const CAPITAL_GAINS_CHURCH_TAX_RATE_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 9, label: "9%" },
  { value: 8, label: "8%" }
];
export const CAREER_MILESTONE_TYPE_OPTIONS: Array<{ type: string; icon: string; description: string }> = [
  { type: "Ausbildung", icon: "education", description: "Ausbildung, Schule oder Qualifikation gestartet" },
  { type: "Berufsbeginn", icon: "wallet", description: "Start ins Erwerbsleben oder erster Job" },
  { type: "Jobwechsel", icon: "tag", description: "Wechsel zu einer neuen Stelle" },
  { type: "Befoerderung", icon: "investment", description: "Neue Rolle mit mehr Verantwortung" },
  { type: "Gehaltserhoehung", icon: "coins", description: "Regelmaessiges Einkommen steigt" },
  { type: "Teilzeit", icon: "calendar", description: "Reduzierte Arbeitszeit" },
  { type: "Vollzeit", icon: "calendar", description: "Rueckkehr oder Wechsel in Vollzeit" },
  { type: "Ausbildung / Studium abgeschlossen", icon: "education", description: "Abschluss mit Auswirkung auf Einkommen" },
  { type: "Elternzeit", icon: "child", description: "Familienphase mit Einkommenseffekt" },
  { type: "Selbststaendigkeit gestartet", icon: "bank", description: "Start der Selbststaendigkeit" },
  { type: "Arbeitslosigkeit", icon: "shield", description: "Unterbrechung oder Wegfall von Einkommen" },
  { type: "Arbeitgeberwechsel", icon: "tag", description: "Neuer Arbeitgeber" },
  { type: "Einmalige Sonderzahlung", icon: "gift", description: "Bonus oder Sonderzahlung" },
  { type: "Sonstiges", icon: "tag", description: "Eigener Meilenstein" }
];
export const CAREER_MILESTONE_IMPACT_OPTIONS: Array<{ value: CareerMilestoneImpact; label: string }> = [
  { value: "positive", label: "positiv" },
  { value: "neutral", label: "neutral" },
  { value: "negative", label: "negativ" }
];
export const INCOME_PROJECTION_MODES: IncomeProjectionMode[] = ["off", "historical_average", "manual"];
