import { defaultStatutoryPensionSettings } from "../../data/defaults";
import { STATUTORY_PENSION_DEDUCTION_PERCENT_MAX } from "../../domain/statutoryPension";
import type {
  StatutoryPensionIncomeMode,
  StatutoryPensionScenarioId,
  StatutoryPensionScenarioSettings,
  StatutoryPensionSettings
} from "../../types";
import { clampNumber, isRecord, numberOrDefault } from "./validators";

export function normalizeStatutoryPensionScenarioId(
  value: unknown,
  fallback: StatutoryPensionScenarioId
): StatutoryPensionScenarioId {
  return value === "pessimistic" || value === "base" || value === "optimistic" ? value : fallback;
}

export function normalizeStatutoryPensionSettings(value: unknown): StatutoryPensionSettings {
  const fallback = defaultStatutoryPensionSettings();
  if (!isRecord(value)) return fallback;
  return {
    contributionRatePercent: statutoryPensionNumberOrFallback(
      value.contributionRatePercent,
      fallback.contributionRatePercent
    ),
    averageAnnualIncome: statutoryPensionNumberOrFallback(value.averageAnnualIncome, fallback.averageAnnualIncome),
    currentPensionValue: statutoryPensionNumberOrFallback(value.currentPensionValue, fallback.currentPensionValue),
    projectionPensionValue: statutoryPensionNumberOrFallback(
      value.projectionPensionValue,
      fallback.projectionPensionValue
    ),
    annualContributionCeilingGross: statutoryPensionNumberOrFallback(
      value.annualContributionCeilingGross,
      fallback.annualContributionCeilingGross
    ),
    scenarios: {
      pessimistic: normalizeStatutoryPensionScenario(value.scenarios, "pessimistic", fallback.scenarios.pessimistic),
      base: normalizeStatutoryPensionScenario(value.scenarios, "base", fallback.scenarios.base),
      optimistic: normalizeStatutoryPensionScenario(value.scenarios, "optimistic", fallback.scenarios.optimistic)
    }
  };
}

export function normalizeStatutoryPensionScenario(
  scenarios: unknown,
  id: StatutoryPensionScenarioId,
  fallback: StatutoryPensionScenarioSettings
): StatutoryPensionScenarioSettings {
  const value = isRecord(scenarios) && isRecord(scenarios[id]) ? scenarios[id] : {};
  const useDeductionFallbacks = statutoryPensionUsesDeductionFallbacks(value);
  return {
    retirementAge: clampNumber(statutoryPensionNumberOrFallback(value.retirementAge, fallback.retirementAge), 67, 72),
    incomeMode: normalizeStatutoryPensionIncomeMode(value.incomeMode, fallback.incomeMode),
    annualPensionIncreasePercent: clampNumber(
      statutoryPensionNumberOrFallback(
        value.annualPensionIncreasePercent,
        fallback.annualPensionIncreasePercent
      ),
      0.1,
      2
    ),
    taxRatePercent: clampNumber(
      useDeductionFallbacks
        ? fallback.taxRatePercent
        : statutoryPensionNumberOrFallback(value.taxRatePercent, fallback.taxRatePercent),
      0,
      STATUTORY_PENSION_DEDUCTION_PERCENT_MAX
    ),
    healthInsurancePercent: clampNumber(
      useDeductionFallbacks
        ? fallback.healthInsurancePercent
        : statutoryPensionNumberOrFallback(value.healthInsurancePercent, fallback.healthInsurancePercent),
      0,
      STATUTORY_PENSION_DEDUCTION_PERCENT_MAX
    ),
    careInsurancePercent: clampNumber(
      useDeductionFallbacks
        ? fallback.careInsurancePercent
        : statutoryPensionNumberOrFallback(value.careInsurancePercent, fallback.careInsurancePercent),
      0,
      STATUTORY_PENSION_DEDUCTION_PERCENT_MAX
    )
  };
}

export function statutoryPensionNumberOrFallback(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === "") return fallback;
  return numberOrDefault(value, fallback);
}

export function statutoryPensionUsesDeductionFallbacks(value: Record<string, unknown>): boolean {
  return (
    statutoryPensionSavedNumber(value.healthInsurancePercent) === 0 &&
    statutoryPensionSavedNumber(value.careInsurancePercent) === 0
  );
}

export function statutoryPensionSavedNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeStatutoryPensionIncomeMode(
  value: unknown,
  fallback: StatutoryPensionIncomeMode
): StatutoryPensionIncomeMode {
  return value === "constant" || value === "income_projection" ? value : fallback;
}
