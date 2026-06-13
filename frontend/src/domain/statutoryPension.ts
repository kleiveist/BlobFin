import type {
  IncomeTrackerState,
  IncomeYearEntry,
  StatutoryPensionScenarioId,
  StatutoryPensionScenarioSettings,
  StatutoryPensionSettings
} from "../types";
import { buildIncomeTrackerModel } from "./incomeTracker";
import { isCapitalGainsTaxRuleLabel } from "./incomeTaxRules";

export interface StatutoryPensionContributionYear {
  year: number;
  employeeContribution: number;
  employerContribution: number;
  totalContribution: number;
  relevantGrossIncome: number;
  pensionPoints: number;
}

export interface StatutoryPensionAnnualPensionYear extends StatutoryPensionContributionYear {
  grossMonthlyPension: number;
  taxableSharePercent: number;
  incomeTaxMonthly: number;
  healthInsuranceMonthly: number;
  careInsuranceMonthly: number;
  netMonthlyPension: number;
}

export interface StatutoryPensionProjectedScenarioYear {
  scenarioId: StatutoryPensionScenarioId;
  label: string;
  year: number;
  age: number;
  yearsFromToday: number;
  retirementAge: number;
  retirementYear: number;
  projectedGrossIncome: number;
  employeeContribution: number;
  employerContribution: number;
  totalContribution: number;
  pensionPoints: number;
  projectedAdditionalPoints: number;
  projectedTotalPoints: number;
  projectedPensionValue: number;
  grossMonthlyPension: number;
  taxableSharePercent: number;
  taxRatePercent: number;
  healthInsurancePercent: number;
  careInsurancePercent: number;
  incomeTaxMonthly: number;
  healthInsuranceMonthly: number;
  careInsuranceMonthly: number;
  totalDeductionsMonthly: number;
  netMonthlyPension: number;
  fallbackToConstantIncome: boolean;
  afterRetirementYear: boolean;
}

export interface StatutoryPensionProjectedAnnualPensionYear {
  year: number;
  age: number;
  scenarios: Record<StatutoryPensionScenarioId, StatutoryPensionProjectedScenarioYear>;
}

export interface StatutoryPensionScenarioResult {
  id: StatutoryPensionScenarioId;
  label: string;
  retirementAge: number;
  retirementYear: number;
  incomeMode: StatutoryPensionScenarioSettings["incomeMode"];
  annualPensionIncreasePercent: number;
  projectedPensionValue: number;
  projectedAdditionalPoints: number;
  projectedTotalPoints: number;
  projectedMonthlyPension: number;
  grossMonthlyPension: number;
  taxableSharePercent: number;
  taxRatePercent: number;
  healthInsurancePercent: number;
  careInsurancePercent: number;
  incomeTaxMonthly: number;
  healthInsuranceMonthly: number;
  careInsuranceMonthly: number;
  totalDeductionsMonthly: number;
  netMonthlyPension: number;
  fallbackToConstantIncome: boolean;
}

export interface StatutoryPensionModel {
  employeeContributionTotal: number;
  employerContributionTotal: number;
  totalContribution: number;
  latestRelevantGrossIncome: number;
  latestPensionPointsPerYear: number;
  latestMonthlyPensionIncrease: number;
  pensionPoints: number;
  currentMonthlyPension: number;
  projectedMonthlyPensionTodayValue: number;
  contributionYears: StatutoryPensionContributionYear[];
  annualPensionYears: StatutoryPensionAnnualPensionYear[];
  projectedAnnualPensionYears: StatutoryPensionProjectedAnnualPensionYear[];
  scenarios: StatutoryPensionScenarioResult[];
}

export interface StatutoryPensionDerivedSettings {
  settings: StatutoryPensionSettings;
  sourceYear: number | null;
}

interface StatutoryPensionReferenceValues {
  averageAnnualIncome: number;
  annualContributionCeilingGross: number;
}

const SCENARIO_LABELS: Record<StatutoryPensionScenarioId, string> = {
  pessimistic: "Pessimistisch",
  base: "Basis",
  optimistic: "Optimistisch"
};
export const STATUTORY_PENSION_DEDUCTION_PERCENT_MAX = 15;

const STATUTORY_PENSION_REFERENCE_VALUES_BY_YEAR: Record<number, StatutoryPensionReferenceValues> = {
  2024: {
    averageAnnualIncome: 47085,
    annualContributionCeilingGross: 90600
  },
  2025: {
    averageAnnualIncome: 50493,
    annualContributionCeilingGross: 96600
  },
  2026: {
    averageAnnualIncome: 51944,
    annualContributionCeilingGross: 101400
  }
};

export function buildStatutoryPensionModel(input: {
  tracker: IncomeTrackerState;
  settings: StatutoryPensionSettings;
  currentYear: number;
  birthYear: number;
}): StatutoryPensionModel {
  const contributionYears = statutoryPensionContributionYears(input.tracker.yearlyEntries, input.settings);
  const employeeContributionTotal = roundCents(
    contributionYears.reduce((sum, year) => sum + year.employeeContribution, 0)
  );
  const employerContributionTotal = roundCents(
    contributionYears.reduce((sum, year) => sum + year.employerContribution, 0)
  );
  const totalContribution = roundCents(employeeContributionTotal + employerContributionTotal);
  const pensionPoints = roundPrecision(contributionYears.reduce((sum, year) => sum + year.pensionPoints, 0), 4);
  const latestYear = contributionYears.at(-1) ?? null;
  const latestRelevantGrossIncome = latestYear?.relevantGrossIncome ?? 0;
  const latestPensionPointsPerYear = latestYear?.pensionPoints ?? 0;
  const latestMonthlyPensionIncrease = roundCents(latestPensionPointsPerYear * input.settings.projectionPensionValue);
  const currentMonthlyPension = roundCents(pensionPoints * input.settings.currentPensionValue);
  const projectedMonthlyPensionTodayValue = roundCents(pensionPoints * input.settings.projectionPensionValue);
  const scenarios = statutoryPensionScenarioResults({
    tracker: input.tracker,
    settings: input.settings,
    currentYear: input.currentYear,
    birthYear: input.birthYear,
    basePoints: pensionPoints,
    latestRelevantGrossIncome
  });
  const baseScenario = scenarios.find((scenario) => scenario.id === "base") ?? scenarios[0];

  return {
    employeeContributionTotal,
    employerContributionTotal,
    totalContribution,
    latestRelevantGrossIncome,
    latestPensionPointsPerYear,
    latestMonthlyPensionIncrease,
    pensionPoints,
    currentMonthlyPension,
    projectedMonthlyPensionTodayValue,
    contributionYears,
    annualPensionYears: statutoryPensionAnnualPensionYears(contributionYears, baseScenario),
    projectedAnnualPensionYears: statutoryPensionProjectedAnnualPensionYears({
      tracker: input.tracker,
      settings: input.settings,
      currentYear: input.currentYear,
      birthYear: input.birthYear,
      basePoints: pensionPoints,
      latestRelevantGrossIncome,
      scenarios
    }),
    scenarios
  };
}

export function statutoryPensionSettingsFromLatestContribution(
  tracker: IncomeTrackerState,
  settings: StatutoryPensionSettings
): StatutoryPensionSettings {
  return statutoryPensionDerivedSettingsFromLatestContribution(tracker, settings).settings;
}

export function statutoryPensionDerivedSettingsFromLatestContribution(
  tracker: IncomeTrackerState,
  settings: StatutoryPensionSettings
): StatutoryPensionDerivedSettings {
  const latestContributionEntry = tracker.yearlyEntries.reduce<IncomeYearEntry | null>((latest, entry) => {
    if (!entry.active) return latest;
    if (isCapitalGainsTaxRuleLabel(entry.label)) return latest;
    const employeeContribution = numberValue(entry.taxDeductionItems.pensionInsurance);
    const employerContribution = numberValue(entry.taxDeductionItems.employerPensionInsurance);
    if (employeeContribution + employerContribution <= 0) return latest;
    if (!latest || entry.year >= latest.year) return entry;
    return latest;
  }, null);
  if (!latestContributionEntry) return { settings, sourceYear: null };

  const referenceValues = statutoryPensionReferenceValuesForYear(latestContributionEntry.year);
  if (!referenceValues) return { settings, sourceYear: latestContributionEntry.year };

  return {
    settings: {
      ...settings,
      averageAnnualIncome: referenceValues.averageAnnualIncome,
      annualContributionCeilingGross: referenceValues.annualContributionCeilingGross
    },
    sourceYear: latestContributionEntry.year
  };
}

function statutoryPensionReferenceValuesForYear(year: number): StatutoryPensionReferenceValues | null {
  return STATUTORY_PENSION_REFERENCE_VALUES_BY_YEAR[year] ?? null;
}

export function statutoryPensionContributionYears(
  entries: IncomeYearEntry[],
  settings: StatutoryPensionSettings
): StatutoryPensionContributionYear[] {
  const years = new Map<number, StatutoryPensionContributionYear>();
  for (const entry of entries) {
    if (!entry.active) continue;
    if (isCapitalGainsTaxRuleLabel(entry.label)) continue;
    const employeeContribution = numberValue(entry.taxDeductionItems.pensionInsurance);
    const employerContribution = numberValue(entry.taxDeductionItems.employerPensionInsurance);
    const totalContribution = employeeContribution + employerContribution;
    if (totalContribution <= 0) continue;
    const existing = years.get(entry.year) ?? {
      year: entry.year,
      employeeContribution: 0,
      employerContribution: 0,
      totalContribution: 0,
      relevantGrossIncome: 0,
      pensionPoints: 0
    };
    existing.employeeContribution = roundCents(existing.employeeContribution + employeeContribution);
    existing.employerContribution = roundCents(existing.employerContribution + employerContribution);
    existing.totalContribution = roundCents(existing.totalContribution + totalContribution);
    existing.relevantGrossIncome = roundCents(
      Math.min(settings.annualContributionCeilingGross, existing.totalContribution / contributionRate(settings))
    );
    existing.pensionPoints = roundPrecision(existing.relevantGrossIncome / averageAnnualIncome(settings), 4);
    years.set(entry.year, existing);
  }
  return [...years.values()].sort((first, second) => first.year - second.year);
}

export function statutoryPensionAnnualPensionYears(
  contributionYears: StatutoryPensionContributionYear[],
  baseScenario: Pick<
    StatutoryPensionScenarioResult,
    "projectedPensionValue" | "taxableSharePercent" | "taxRatePercent" | "healthInsurancePercent" | "careInsurancePercent"
  >
): StatutoryPensionAnnualPensionYear[] {
  return contributionYears.map((year) => {
    const grossMonthlyPension = roundCents(year.pensionPoints * baseScenario.projectedPensionValue);
    const incomeTaxMonthly = roundCents(
      (grossMonthlyPension * baseScenario.taxableSharePercent * baseScenario.taxRatePercent) / 10000
    );
    const healthInsuranceMonthly = roundCents((grossMonthlyPension * baseScenario.healthInsurancePercent) / 100);
    const careInsuranceMonthly = roundCents((grossMonthlyPension * baseScenario.careInsurancePercent) / 100);
    const netMonthlyPension = roundCents(
      Math.max(0, grossMonthlyPension - incomeTaxMonthly - healthInsuranceMonthly - careInsuranceMonthly)
    );
    return {
      ...year,
      grossMonthlyPension,
      taxableSharePercent: baseScenario.taxableSharePercent,
      incomeTaxMonthly,
      healthInsuranceMonthly,
      careInsuranceMonthly,
      netMonthlyPension
    };
  });
}

export function statutoryPensionProjectedAnnualPensionYears(input: {
  tracker: IncomeTrackerState;
  settings: StatutoryPensionSettings;
  currentYear: number;
  birthYear: number;
  basePoints: number;
  latestRelevantGrossIncome: number;
  scenarios: StatutoryPensionScenarioResult[];
}): StatutoryPensionProjectedAnnualPensionYear[] {
  const incomeProjectionRate = trackerProjectionRate(input.tracker);
  const finalYear = Math.max(input.currentYear, ...input.scenarios.map((scenario) => scenario.retirementYear));
  const scenarioById = new Map(input.scenarios.map((scenario) => [scenario.id, scenario]));
  const years: StatutoryPensionProjectedAnnualPensionYear[] = [];

  for (let year = input.currentYear; year <= finalYear; year += 1) {
    const yearsFromToday = Math.max(0, year - input.currentYear);
    const scenarios = (["pessimistic", "base", "optimistic"] as const).reduce(
      (result, id) => {
        const scenario = scenarioById.get(id);
        if (!scenario) return result;
        result[id] = statutoryPensionProjectedScenarioYear({
          scenario,
          settings: input.settings,
          year,
          age: year - input.birthYear,
          yearsFromToday,
          incomeProjectionRate,
          basePoints: input.basePoints,
          latestRelevantGrossIncome: input.latestRelevantGrossIncome
        });
        return result;
      },
      {} as Record<StatutoryPensionScenarioId, StatutoryPensionProjectedScenarioYear>
    );
    years.push({
      year,
      age: year - input.birthYear,
      scenarios
    });
  }

  return years;
}

function statutoryPensionScenarioResults(input: {
  tracker: IncomeTrackerState;
  settings: StatutoryPensionSettings;
  currentYear: number;
  birthYear: number;
  basePoints: number;
  latestRelevantGrossIncome: number;
}): StatutoryPensionScenarioResult[] {
  const incomeProjectionRate = trackerProjectionRate(input.tracker);
  return (["pessimistic", "base", "optimistic"] as const).map((id) => {
    const scenario = input.settings.scenarios[id];
    const retirementAge = clamp(scenario.retirementAge, 67, 72);
    const retirementYear = input.birthYear + retirementAge;
    const futureYears = Math.max(0, retirementYear - input.currentYear);
    const useProjection = scenario.incomeMode === "income_projection" && incomeProjectionRate !== null;
    const fallbackToConstantIncome = scenario.incomeMode === "income_projection" && !useProjection;
    const projectedAdditionalPoints = projectedScenarioPoints({
      years: futureYears,
      startingGrossIncome: input.latestRelevantGrossIncome,
      incomeGrowthRate: useProjection ? incomeProjectionRate : 0,
      settings: input.settings
    });
    const projectedTotalPoints = roundPrecision(input.basePoints + projectedAdditionalPoints, 4);
    const projectedPensionValue = roundCents(
      input.settings.projectionPensionValue *
        Math.pow(1 + clamp(scenario.annualPensionIncreasePercent, 0.1, 2) / 100, futureYears)
    );
    const grossMonthlyPension = roundCents(projectedTotalPoints * projectedPensionValue);
    const taxableSharePercent = statutoryPensionTaxableSharePercent(retirementYear);
    const taxRatePercent = clamp(scenario.taxRatePercent, 0, STATUTORY_PENSION_DEDUCTION_PERCENT_MAX);
    const healthInsurancePercent = clamp(
      scenario.healthInsurancePercent,
      0,
      STATUTORY_PENSION_DEDUCTION_PERCENT_MAX
    );
    const careInsurancePercent = clamp(scenario.careInsurancePercent, 0, STATUTORY_PENSION_DEDUCTION_PERCENT_MAX);
    const incomeTaxMonthly = roundCents((grossMonthlyPension * taxableSharePercent * taxRatePercent) / 10000);
    const healthInsuranceMonthly = roundCents((grossMonthlyPension * healthInsurancePercent) / 100);
    const careInsuranceMonthly = roundCents((grossMonthlyPension * careInsurancePercent) / 100);
    const totalDeductionsMonthly = roundCents(incomeTaxMonthly + healthInsuranceMonthly + careInsuranceMonthly);
    const netMonthlyPension = roundCents(Math.max(0, grossMonthlyPension - totalDeductionsMonthly));
    return {
      id,
      label: SCENARIO_LABELS[id],
      retirementAge,
      retirementYear,
      incomeMode: scenario.incomeMode,
      annualPensionIncreasePercent: clamp(scenario.annualPensionIncreasePercent, 0.1, 2),
      projectedPensionValue,
      projectedAdditionalPoints,
      projectedTotalPoints,
      projectedMonthlyPension: grossMonthlyPension,
      grossMonthlyPension,
      taxableSharePercent,
      taxRatePercent,
      healthInsurancePercent,
      careInsurancePercent,
      incomeTaxMonthly,
      healthInsuranceMonthly,
      careInsuranceMonthly,
      totalDeductionsMonthly,
      netMonthlyPension,
      fallbackToConstantIncome
    };
  });
}

export function statutoryPensionTaxableSharePercent(retirementYear: number): number {
  if (retirementYear <= 2026) return 84;
  return Math.min(100, roundPrecision(84 + (retirementYear - 2026) * 0.5, 1));
}

function statutoryPensionProjectedScenarioYear(input: {
  scenario: StatutoryPensionScenarioResult;
  settings: StatutoryPensionSettings;
  year: number;
  age: number;
  yearsFromToday: number;
  incomeProjectionRate: number | null;
  basePoints: number;
  latestRelevantGrossIncome: number;
}): StatutoryPensionProjectedScenarioYear {
  const useProjection = input.scenario.incomeMode === "income_projection" && input.incomeProjectionRate !== null;
  const incomeGrowthRate = useProjection ? input.incomeProjectionRate ?? 0 : 0;
  const projectedGrossIncome = projectedGrossIncomeForYear({
    yearsFromToday: input.yearsFromToday,
    startingGrossIncome: input.latestRelevantGrossIncome,
    incomeGrowthRate,
    settings: input.settings
  });
  const pensionPoints = input.yearsFromToday > 0 ? roundPrecision(projectedGrossIncome / averageAnnualIncome(input.settings), 4) : 0;
  const totalContribution = input.yearsFromToday > 0 ? roundCents(projectedGrossIncome * contributionRate(input.settings)) : 0;
  const employeeContribution = roundCents(totalContribution / 2);
  const employerContribution = roundCents(totalContribution - employeeContribution);
  const projectedAdditionalPoints = projectedScenarioPoints({
    years: input.yearsFromToday,
    startingGrossIncome: input.latestRelevantGrossIncome,
    incomeGrowthRate,
    settings: input.settings
  });
  const projectedTotalPoints = roundPrecision(input.basePoints + projectedAdditionalPoints, 4);
  const projectedPensionValue = roundCents(
    input.settings.projectionPensionValue *
      Math.pow(1 + input.scenario.annualPensionIncreasePercent / 100, input.yearsFromToday)
  );
  const grossMonthlyPension = roundCents(projectedTotalPoints * projectedPensionValue);
  const taxableSharePercent = statutoryPensionTaxableSharePercent(input.year);
  const incomeTaxMonthly = roundCents((grossMonthlyPension * taxableSharePercent * input.scenario.taxRatePercent) / 10000);
  const healthInsuranceMonthly = roundCents((grossMonthlyPension * input.scenario.healthInsurancePercent) / 100);
  const careInsuranceMonthly = roundCents((grossMonthlyPension * input.scenario.careInsurancePercent) / 100);
  const totalDeductionsMonthly = roundCents(incomeTaxMonthly + healthInsuranceMonthly + careInsuranceMonthly);
  const netMonthlyPension = roundCents(Math.max(0, grossMonthlyPension - totalDeductionsMonthly));

  return {
    scenarioId: input.scenario.id,
    label: input.scenario.label,
    year: input.year,
    age: input.age,
    yearsFromToday: input.yearsFromToday,
    retirementAge: input.scenario.retirementAge,
    retirementYear: input.scenario.retirementYear,
    projectedGrossIncome,
    employeeContribution,
    employerContribution,
    totalContribution,
    pensionPoints,
    projectedAdditionalPoints,
    projectedTotalPoints,
    projectedPensionValue,
    grossMonthlyPension,
    taxableSharePercent,
    taxRatePercent: input.scenario.taxRatePercent,
    healthInsurancePercent: input.scenario.healthInsurancePercent,
    careInsurancePercent: input.scenario.careInsurancePercent,
    incomeTaxMonthly,
    healthInsuranceMonthly,
    careInsuranceMonthly,
    totalDeductionsMonthly,
    netMonthlyPension,
    fallbackToConstantIncome: input.scenario.fallbackToConstantIncome,
    afterRetirementYear: input.year > input.scenario.retirementYear
  };
}

function projectedGrossIncomeForYear(input: {
  yearsFromToday: number;
  startingGrossIncome: number;
  incomeGrowthRate: number;
  settings: StatutoryPensionSettings;
}): number {
  if (input.startingGrossIncome <= 0) return 0;
  return roundCents(
    Math.min(
      input.settings.annualContributionCeilingGross,
      input.startingGrossIncome * Math.pow(1 + input.incomeGrowthRate, input.yearsFromToday)
    )
  );
}

function projectedScenarioPoints(input: {
  years: number;
  startingGrossIncome: number;
  incomeGrowthRate: number;
  settings: StatutoryPensionSettings;
}): number {
  let points = 0;
  for (let index = 1; index <= input.years; index += 1) {
    const grossIncome = Math.min(
      input.settings.annualContributionCeilingGross,
      input.startingGrossIncome * Math.pow(1 + input.incomeGrowthRate, index)
    );
    points += grossIncome / averageAnnualIncome(input.settings);
  }
  return roundPrecision(points, 4);
}

function trackerProjectionRate(tracker: IncomeTrackerState): number | null {
  const model = buildIncomeTrackerModel(tracker);
  if (tracker.settings.projectionMode === "manual" && tracker.settings.manualGrowthRatePercent !== null) {
    return tracker.settings.manualGrowthRatePercent / 100;
  }
  if (tracker.settings.projectionMode === "historical_average") {
    return model.averageGrowthRate;
  }
  return null;
}

function contributionRate(settings: StatutoryPensionSettings): number {
  return Math.max(0.0001, numberValue(settings.contributionRatePercent) / 100);
}

function averageAnnualIncome(settings: StatutoryPensionSettings): number {
  return Math.max(1, numberValue(settings.averageAnnualIncome));
}

function numberValue(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function roundCents(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function roundPrecision(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
