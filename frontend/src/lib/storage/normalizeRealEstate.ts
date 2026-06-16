import { defaultRealEstateFinancingSettings, defaultRepaymentSourceToggles } from "../../data/defaults";
import type { CombinedWealthToggles, RealEstateFinancingSettings, RepaymentSourceToggle } from "../../types";
import {
  booleanOrDefault,
  isRecord,
  nullableNumberOrDefault,
  numberOrDefault,
  stringArrayOrDefault
} from "./validators";

export function normalizeRealEstateFinancingSettings(value: unknown): RealEstateFinancingSettings {
  const fallback = defaultRealEstateFinancingSettings();
  if (!isRecord(value)) return fallback;
  const financingStartAge = numberOrDefault(value.financingStartAge, fallback.financingStartAge);
  const financingYears = numberOrDefault(value.financingYears, fallback.financingYears);
  const legacyEndAge = financingStartAge > 0 ? financingStartAge + financingYears : fallback.financingEndAge;
  return {
    locale: "de",
    purchaseActivated: booleanOrDefault(value.purchaseActivated, fallback.purchaseActivated),
    purchasePrice: numberOrDefault(value.purchasePrice, fallback.purchasePrice),
    constructionOrRenovationCosts: numberOrDefault(
      value.constructionOrRenovationCosts,
      fallback.constructionOrRenovationCosts
    ),
    landCosts: numberOrDefault(value.landCosts, fallback.landCosts),
    additionalPurchaseCosts: numberOrDefault(value.additionalPurchaseCosts, fallback.additionalPurchaseCosts),
    notaryCosts: numberOrDefault(value.notaryCosts, fallback.notaryCosts),
    landRegistryCosts: numberOrDefault(value.landRegistryCosts, fallback.landRegistryCosts),
    brokerCosts: numberOrDefault(value.brokerCosts, fallback.brokerCosts),
    transferTax: numberOrDefault(value.transferTax, fallback.transferTax),
    modernizationReserve: numberOrDefault(value.modernizationReserve, fallback.modernizationReserve),
    movingAndSetupCosts: numberOrDefault(value.movingAndSetupCosts, fallback.movingAndSetupCosts),
    safetyBuffer: numberOrDefault(value.safetyBuffer, fallback.safetyBuffer),
    equityCapital: numberOrDefault(value.equityCapital, fallback.equityCapital),
    loanAmount: numberOrDefault(value.loanAmount, fallback.loanAmount),
    interestRatePercent: numberOrDefault(value.interestRatePercent, fallback.interestRatePercent),
    initialRepaymentPercent: numberOrDefault(value.initialRepaymentPercent, fallback.initialRepaymentPercent),
    monthlyPayment: numberOrDefault(value.monthlyPayment, fallback.monthlyPayment),
    fixedInterestYears: numberOrDefault(value.fixedInterestYears, fallback.fixedInterestYears),
    targetTermYears: numberOrDefault(value.targetTermYears, fallback.targetTermYears),
    specialRepaymentAmount: numberOrDefault(value.specialRepaymentAmount, fallback.specialRepaymentAmount),
    specialRepaymentRhythm: normalizeSpecialRepaymentRhythm(
      value.specialRepaymentRhythm,
      fallback.specialRepaymentRhythm
    ),
    remainingDebtAfterFixedInterest: numberOrDefault(
      value.remainingDebtAfterFixedInterest,
      fallback.remainingDebtAfterFixedInterest
    ),
    financingStartAge,
    financingEndAge: numberOrDefault(value.financingEndAge, legacyEndAge),
    plannedSaleYear: nullableNumberOrDefault(value.plannedSaleYear, fallback.plannedSaleYear),
    estimatedSaleValue: nullableNumberOrDefault(value.estimatedSaleValue, fallback.estimatedSaleValue),
    targetFullRepaymentYear: nullableNumberOrDefault(value.targetFullRepaymentYear, fallback.targetFullRepaymentYear),
    targetMonthlyBurden: numberOrDefault(value.targetMonthlyBurden, fallback.targetMonthlyBurden),
    maxMonthlyBurden: numberOrDefault(value.maxMonthlyBurden, fallback.maxMonthlyBurden),
    subsidyAmount: numberOrDefault(value.subsidyAmount, fallback.subsidyAmount),
    propertyValueGrowthPercent: numberOrDefault(value.propertyValueGrowthPercent, fallback.propertyValueGrowthPercent),
    inflationRatePercent: numberOrDefault(value.inflationRatePercent, fallback.inflationRatePercent),
    financingYears,
    manualFuturePropertyValue: nullableNumberOrDefault(value.manualFuturePropertyValue, fallback.manualFuturePropertyValue),
    repaymentSources: normalizeRepaymentSourceToggles(value.repaymentSources),
    equityCapitalSourceIds: stringArrayOrDefault(value.equityCapitalSourceIds, fallback.equityCapitalSourceIds),
    monthlyPaymentSourceIds: stringArrayOrDefault(value.monthlyPaymentSourceIds, fallback.monthlyPaymentSourceIds),
    specialRepaymentSourceIds: stringArrayOrDefault(value.specialRepaymentSourceIds, fallback.specialRepaymentSourceIds),
    includeWithdrawalGainAsPaymentSource: booleanOrDefault(
      value.includeWithdrawalGainAsPaymentSource,
      fallback.includeWithdrawalGainAsPaymentSource
    )
  };
}

export function normalizeRealEstatePurchaseActivation(
  realEstate: RealEstateFinancingSettings,
  combinedWealth: CombinedWealthToggles
): RealEstateFinancingSettings {
  if (realEstate.purchaseActivated || !combinedWealth.includeRealEstateFinancing) return realEstate;
  return hasCustomRealEstateScenario(realEstate) ? { ...realEstate, purchaseActivated: true } : realEstate;
}

export function hasCustomRealEstateScenario(realEstate: RealEstateFinancingSettings): boolean {
  const fallback = defaultRealEstateFinancingSettings();
  const numericFields: Array<keyof RealEstateFinancingSettings> = [
    "purchasePrice",
    "constructionOrRenovationCosts",
    "landCosts",
    "additionalPurchaseCosts",
    "notaryCosts",
    "landRegistryCosts",
    "brokerCosts",
    "transferTax",
    "modernizationReserve",
    "movingAndSetupCosts",
    "safetyBuffer",
    "interestRatePercent",
    "financingStartAge",
    "propertyValueGrowthPercent"
  ];
  const numericChanged = numericFields.some((field) => Number(realEstate[field]) !== Number(fallback[field]));
  return (
    numericChanged ||
    realEstate.plannedSaleYear !== fallback.plannedSaleYear ||
    realEstate.estimatedSaleValue !== fallback.estimatedSaleValue ||
    realEstate.equityCapitalSourceIds.length > 0 ||
    realEstate.monthlyPaymentSourceIds.length > 0 ||
    realEstate.specialRepaymentSourceIds.length > 0 ||
    realEstate.includeWithdrawalGainAsPaymentSource ||
    realEstate.repaymentSources.useDepotSavingsRateAsRepayment ||
    realEstate.repaymentSources.useLegacySavingsRateAsRepayment ||
    realEstate.repaymentSources.useNetGainAsRepayment ||
    realEstate.repaymentSources.useWithdrawalGainAsRepayment
  );
}

export function normalizeRepaymentSourceToggles(value: unknown): RepaymentSourceToggle {
  const fallback = defaultRepaymentSourceToggles();
  if (!isRecord(value)) return fallback;
  return {
    useWithdrawalGainAsRepayment: booleanOrDefault(
      value.useWithdrawalGainAsRepayment,
      fallback.useWithdrawalGainAsRepayment
    ),
    useDepotSavingsRateAsRepayment: booleanOrDefault(
      value.useDepotSavingsRateAsRepayment,
      fallback.useDepotSavingsRateAsRepayment
    ),
    useLegacySavingsRateAsRepayment: booleanOrDefault(
      value.useLegacySavingsRateAsRepayment,
      fallback.useLegacySavingsRateAsRepayment
    ),
    useNetGainAsRepayment: booleanOrDefault(value.useNetGainAsRepayment, fallback.useNetGainAsRepayment),
    onlyUsePositiveValues: booleanOrDefault(value.onlyUsePositiveValues, fallback.onlyUsePositiveValues)
  };
}

export function normalizeSpecialRepaymentRhythm(
  value: unknown,
  fallback: RealEstateFinancingSettings["specialRepaymentRhythm"]
): RealEstateFinancingSettings["specialRepaymentRhythm"] {
  return value === "none" || value === "monthly" || value === "yearly" ? value : fallback;
}
