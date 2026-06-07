import type {
  IncomeEmploymentContext,
  IncomeMinijobType,
  IncomeStudentEmploymentMode
} from "../types";

export type IncomeTaxRuleStatus = "locked" | "partially_enabled" | "enabled";

export interface IncomeTaxRuleConfig {
  minijobMonthlyLimit: number;
  minijobAnnualLimit: number;
  volunteerAllowance: number;
  trainerAllowance: number;
  sideIncomeFullReliefLimit: number;
  shortTermEmploymentDaysLimit: number;
  shortTermEmploymentMonthsLimit: number;
  minijobCommercialEmployeeRvPercent: number;
  minijobPrivateHouseholdEmployeeRvPercent: number;
}

export interface IncomeTaxRuleInput {
  label: string;
  annualAmount: number | null;
  monthlyAmount?: number | null;
  year: number;
  aggregatedSideIncome?: number | null;
  employmentContext?: IncomeEmploymentContext | null;
  minijobType?: IncomeMinijobType | null;
  considerPensionInsurance?: boolean | null;
  isRvExempt?: boolean | null;
  shortTermEmploymentDays?: number | null;
  shortTermEmploymentMonths?: number | null;
  studentEmploymentMode?: IncomeStudentEmploymentMode | null;
  requiresManualTaxReview?: boolean | null;
}

export interface IncomeTaxRuleResult {
  taxFieldsEnabled: boolean;
  contributionFieldsEnabled: boolean;
  taxableAmount: number;
  contributionRelevantAmount: number;
  status: IncomeTaxRuleStatus;
  reasonKey: string;
  warningKey?: string;
  estimatedEmployeePensionContribution?: number;
}

export const taxRuleConfig: Record<number, IncomeTaxRuleConfig> = {
  2026: {
    minijobMonthlyLimit: 603,
    minijobAnnualLimit: 7236,
    volunteerAllowance: 960,
    trainerAllowance: 3300,
    sideIncomeFullReliefLimit: 410,
    shortTermEmploymentDaysLimit: 70,
    shortTermEmploymentMonthsLimit: 3,
    minijobCommercialEmployeeRvPercent: 3.6,
    minijobPrivateHouseholdEmployeeRvPercent: 13.6
  }
};

export const INCOME_TAX_RULE_LABEL_ALIASES: Record<string, string> = {
  child_job: "child_youth_jobs",
  childjobs: "child_youth_jobs",
  child_youth_job: "child_youth_jobs",
  childyouthjob: "child_youth_jobs",
  childyouthjobs: "child_youth_jobs",
  kinderjugendjobs: "child_youth_jobs",
  kinderundjugendjobs: "child_youth_jobs",
  newspaper_delivery: "child_youth_jobs",
  newspaperdelivery: "child_youth_jobs",
  pupil_job: "child_youth_jobs",
  pupiljob: "child_youth_jobs",
  student_job: "child_youth_jobs",
  studentjob: "child_youth_jobs",
  student_newspaper_delivery: "child_youth_jobs",
  studentnewspaperdelivery: "child_youth_jobs",
  zeitungaustragen: "child_youth_jobs",
  garage: "garage_parking_rental",
  garageparkingrental: "garage_parking_rental",
  garagestellplatz: "garage_parking_rental",
  garageundstellplatz: "garage_parking_rental",
  parking_rental: "garage_parking_rental",
  parkingrental: "garage_parking_rental",
  stellplatz: "garage_parking_rental",
  mini_job: "minijob",
  minijob: "minijob",
  online_sale: "online_sales",
  online_sales: "online_sales",
  onlinesale: "online_sales",
  onlinesales: "online_sales",
  onlineverkauf: "online_sales",
  onlineverkaeufe: "online_sales",
  onlineverkaufe: "online_sales",
  insurance_payout: "insurance_payouts",
  insurance_payouts: "insurance_payouts",
  insurancepayout: "insurance_payouts",
  insurancepayouts: "insurance_payouts",
  versicherungsauszahlung: "insurance_payouts",
  versicherungsauszahlungen: "insurance_payouts",
  versicherungserstattung: "insurance_payouts",
  versicherungserstattungen: "insurance_payouts",
  severance: "severance_payment",
  trainer: "trainer_allowance",
  trainer_allowance: "trainer_allowance",
  trainerallowance: "trainer_allowance",
  uebungsleiter: "trainer_allowance",
  uebungsleiterpauschale: "trainer_allowance",
  volunteer: "volunteer_allowance",
  volunteer_allowance: "volunteer_allowance",
  volunteerallowance: "volunteer_allowance",
  ehrenamt: "volunteer_allowance",
  ehrenamtspauschale: "volunteer_allowance"
};

export const CAPITAL_GAINS_TAX_RULE_LABELS = new Set(["dividends", "asset_income"]);

export const SIDE_INCOME_TAX_RULE_LABELS = new Set([
  "garage_parking_rental",
  "side_income",
  "fees",
  "freelance",
  "self_employed",
  "board",
  "office_holder",
  "supervisory_board"
]);

const DEFAULT_CONFIG_YEAR = 2026;

export function evaluateIncomeTaxAndContributionRules(input: IncomeTaxRuleInput): IncomeTaxRuleResult {
  const label = normalizeIncomeTaxRuleLabel(input.label);
  const annualAmount = positiveNumber(input.annualAmount);
  const monthlyAmount = positiveNumber(input.monthlyAmount ?? annualAmount / 12);
  const config = taxRuleConfigForYear(input.year);

  if (label === "pocket_money") {
    return locked("incomeTaxRules.pocketMoney.locked");
  }

  if (label === "child_youth_jobs") {
    return locked("incomeTaxRules.childYouthJobs.locked");
  }

  if (label === "online_sales") {
    return locked("incomeTaxRules.onlineSales.locked");
  }

  if (label === "insurance_payouts") {
    return locked("incomeTaxRules.insurancePayouts.locked");
  }

  if (isCapitalGainsTaxRuleLabel(label)) {
    return {
      taxFieldsEnabled: true,
      contributionFieldsEnabled: false,
      taxableAmount: annualAmount,
      contributionRelevantAmount: 0,
      status: "partially_enabled",
      reasonKey: "incomeTaxRules.capitalGains.enabled"
    };
  }

  if (label === "severance_payment") {
    const socialEnabled = input.employmentContext === "earned_claim";
    return {
      taxFieldsEnabled: true,
      contributionFieldsEnabled: socialEnabled,
      taxableAmount: annualAmount,
      contributionRelevantAmount: socialEnabled ? annualAmount : 0,
      status: socialEnabled ? "enabled" : "partially_enabled",
      reasonKey: socialEnabled ? "incomeTaxRules.severance.earnedClaim" : "incomeTaxRules.severance.jobLoss",
      warningKey: "incomeTaxRules.severance.warning"
    };
  }

  if (label === "garage_parking_rental") {
    const sideIncome = positiveNumber(input.aggregatedSideIncome ?? annualAmount);
    if (sideIncome <= config.sideIncomeFullReliefLimit) {
      return {
        ...locked("incomeTaxRules.garage.locked"),
        warningKey: "incomeTaxRules.garage.general"
      };
    }
    return {
      taxFieldsEnabled: true,
      contributionFieldsEnabled: false,
      taxableAmount: annualAmount,
      contributionRelevantAmount: 0,
      status: "partially_enabled",
      reasonKey: "incomeTaxRules.garage.sideIncomeExceeded",
      warningKey: "incomeTaxRules.garage.general"
    };
  }

  if (label === "volunteer_allowance") {
    return allowanceResult(annualAmount, config.volunteerAllowance, "incomeTaxRules.volunteer");
  }

  if (label === "trainer_allowance") {
    return allowanceResult(annualAmount, config.trainerAllowance, "incomeTaxRules.trainer");
  }

  if (label === "minijob") {
    return minijobResult(input, annualAmount, monthlyAmount, config);
  }

  if (label === "student_newspaper_delivery") {
    if ((input.studentEmploymentMode ?? "minijob") === "short_term") {
      return shortTermEmploymentResult(input, annualAmount, config);
    }
    return {
      ...minijobResult(input, annualAmount, monthlyAmount, config),
      reasonKey: "incomeTaxRules.studentNewspaper.minijob"
    };
  }

  return {
    taxFieldsEnabled: true,
    contributionFieldsEnabled: true,
    taxableAmount: annualAmount,
    contributionRelevantAmount: annualAmount,
    status: "enabled",
    reasonKey: "incomeTaxRules.default.enabled"
  };
}

export function normalizeIncomeTaxRuleLabel(label: string | undefined): string {
  const normalized = String(label ?? "").trim();
  const key = incomeTaxRuleLabelKey(normalized);
  return INCOME_TAX_RULE_LABEL_ALIASES[normalized] ?? INCOME_TAX_RULE_LABEL_ALIASES[key] ?? normalized;
}

export function isCapitalGainsTaxRuleLabel(label: string | undefined): boolean {
  return CAPITAL_GAINS_TAX_RULE_LABELS.has(normalizeIncomeTaxRuleLabel(label));
}

function incomeTaxRuleLabelKey(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .replace(/[^a-z0-9]/g, "");
}

export function taxRuleConfigForYear(year: number): IncomeTaxRuleConfig {
  if (taxRuleConfig[year]) return taxRuleConfig[year];
  const configuredYears = Object.keys(taxRuleConfig).map(Number).sort((first, second) => first - second);
  const previousYear = configuredYears.filter((item) => item <= year).at(-1);
  return taxRuleConfig[previousYear ?? DEFAULT_CONFIG_YEAR];
}

function minijobResult(
  input: IncomeTaxRuleInput,
  annualAmount: number,
  monthlyAmount: number,
  config: IncomeTaxRuleConfig
): IncomeTaxRuleResult {
  if (annualAmount > config.minijobAnnualLimit) {
    return {
      taxFieldsEnabled: true,
      contributionFieldsEnabled: true,
      taxableAmount: annualAmount,
      contributionRelevantAmount: annualAmount,
      status: "enabled",
      reasonKey: "incomeTaxRules.minijob.annualLimitExceeded",
      warningKey: "incomeTaxRules.minijob.warningAnnualLimitExceeded"
    };
  }

  const rvActive = Boolean(input.considerPensionInsurance) && !input.isRvExempt;
  if (rvActive) {
    const employeeRate =
      input.minijobType === "private_household"
        ? config.minijobPrivateHouseholdEmployeeRvPercent
        : config.minijobCommercialEmployeeRvPercent;
    return {
      taxFieldsEnabled: false,
      contributionFieldsEnabled: true,
      taxableAmount: 0,
      contributionRelevantAmount: annualAmount,
      status: "partially_enabled",
      reasonKey: "incomeTaxRules.minijob.rvActive",
      warningKey:
        monthlyAmount > config.minijobMonthlyLimit ? "incomeTaxRules.minijob.monthlyLimitNote" : undefined,
      estimatedEmployeePensionContribution: roundCents((annualAmount * employeeRate) / 100)
    };
  }

  return {
    taxFieldsEnabled: false,
    contributionFieldsEnabled: false,
    taxableAmount: 0,
    contributionRelevantAmount: 0,
    status: "locked",
    reasonKey: input.isRvExempt ? "incomeTaxRules.minijob.rvExempt" : "incomeTaxRules.minijob.locked",
    warningKey: monthlyAmount > config.minijobMonthlyLimit ? "incomeTaxRules.minijob.monthlyLimitNote" : undefined
  };
}

function shortTermEmploymentResult(
  input: IncomeTaxRuleInput,
  annualAmount: number,
  config: IncomeTaxRuleConfig
): IncomeTaxRuleResult {
  const days = positiveNumber(input.shortTermEmploymentDays);
  const months = positiveNumber(input.shortTermEmploymentMonths);
  const hasDuration = days > 0 || months > 0;
  const withinLimits =
    !hasDuration ||
    (days <= config.shortTermEmploymentDaysLimit && months <= config.shortTermEmploymentMonthsLimit);

  if (!withinLimits) {
    return {
      taxFieldsEnabled: true,
      contributionFieldsEnabled: true,
      taxableAmount: annualAmount,
      contributionRelevantAmount: annualAmount,
      status: "enabled",
      reasonKey: "incomeTaxRules.studentNewspaper.shortTermLimitExceeded",
      warningKey: "incomeTaxRules.studentNewspaper.warningShortTermLimitExceeded"
    };
  }

  return {
    taxFieldsEnabled: Boolean(input.requiresManualTaxReview),
    contributionFieldsEnabled: false,
    taxableAmount: input.requiresManualTaxReview ? annualAmount : 0,
    contributionRelevantAmount: 0,
    status: input.requiresManualTaxReview ? "partially_enabled" : "locked",
    reasonKey: input.requiresManualTaxReview
      ? "incomeTaxRules.studentNewspaper.shortTermTaxReview"
      : "incomeTaxRules.studentNewspaper.shortTermLocked"
  };
}

function allowanceResult(annualAmount: number, allowance: number, reasonPrefix: string): IncomeTaxRuleResult {
  if (annualAmount <= allowance) {
    return locked(`${reasonPrefix}.locked`);
  }
  return {
    taxFieldsEnabled: true,
    contributionFieldsEnabled: false,
    taxableAmount: roundCents(annualAmount - allowance),
    contributionRelevantAmount: 0,
    status: "partially_enabled",
    reasonKey: `${reasonPrefix}.allowanceExceeded`,
    warningKey: `${reasonPrefix}.warningAllowanceExceeded`
  };
}

function locked(reasonKey: string): IncomeTaxRuleResult {
  return {
    taxFieldsEnabled: false,
    contributionFieldsEnabled: false,
    taxableAmount: 0,
    contributionRelevantAmount: 0,
    status: "locked",
    reasonKey
  };
}

function positiveNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function roundCents(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}
