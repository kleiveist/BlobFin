import { defaultInvestmentSettings } from "../../data/defaults";
import type { InvestmentDepotKey, InvestmentSettings } from "../../types";
import { booleanOrDefault, clampNumber, isRecord, numberOrDefault, stringArrayOrDefault } from "./validators";

export function normalizeInvestmentSettings(value: unknown): InvestmentSettings {
  const fallback = defaultInvestmentSettings();
  if (!isRecord(value)) return fallback;
  return {
    includedIds: stringArrayOrDefault(value.includedIds, fallback.includedIds),
    activeDepot: normalizeInvestmentDepotKey(value.activeDepot, fallback.activeDepot),
    retirementIncludedIds: stringArrayOrDefault(value.retirementIncludedIds, fallback.retirementIncludedIds),
    childIncludedIds: stringArrayOrDefault(value.childIncludedIds, fallback.childIncludedIds),
    retirementDepotEnabled: booleanOrDefault(value.retirementDepotEnabled, fallback.retirementDepotEnabled),
    retirementDepotAllowanceEnabled: booleanOrDefault(
      value.retirementDepotAllowanceEnabled,
      fallback.retirementDepotAllowanceEnabled
    ),
    retirementDepotChildren: numberOrDefault(value.retirementDepotChildren, fallback.retirementDepotChildren),
    birthYear: numberOrDefault(value.birthYear, fallback.birthYear),
    chartStartAge: numberOrDefault(value.chartStartAge, fallback.chartStartAge),
    payoutEndAge: numberOrDefault(value.payoutEndAge, fallback.payoutEndAge),
    payoutYears: numberOrDefault(value.payoutYears, fallback.payoutYears),
    percentageWithdrawalStartAge: numberOrDefault(
      value.percentageWithdrawalStartAge,
      fallback.percentageWithdrawalStartAge
    ),
    percentageWithdrawalRatePercent: numberOrDefault(
      value.percentageWithdrawalRatePercent,
      fallback.percentageWithdrawalRatePercent
    ),
    investmentReturnPercent: numberOrDefault(value.investmentReturnPercent, fallback.investmentReturnPercent),
    capitalGainsTaxPercent: numberOrDefault(value.capitalGainsTaxPercent, fallback.capitalGainsTaxPercent),
    inflationRatePercent: numberOrDefault(value.inflationRatePercent, fallback.inflationRatePercent),
    bequestReservePercent: numberOrDefault(value.bequestReservePercent, fallback.bequestReservePercent),
    retirementBirthYear: numberOrDefault(value.retirementBirthYear, fallback.retirementBirthYear),
    retirementChartStartAge: numberOrDefault(value.retirementChartStartAge, fallback.retirementChartStartAge),
    retirementPayoutEndAge: numberOrDefault(value.retirementPayoutEndAge, fallback.retirementPayoutEndAge),
    retirementPayoutYears: numberOrDefault(value.retirementPayoutYears, fallback.retirementPayoutYears),
    retirementInvestmentReturnPercent: numberOrDefault(
      value.retirementInvestmentReturnPercent,
      fallback.retirementInvestmentReturnPercent
    ),
    retirementCapitalGainsTaxPercent: numberOrDefault(
      value.retirementCapitalGainsTaxPercent,
      fallback.retirementCapitalGainsTaxPercent
    ),
    retirementIncomeTaxRatePercent: clampNumber(
      numberOrDefault(
        value.retirementIncomeTaxRatePercent ?? value.retirementCapitalGainsTaxPercent,
        fallback.retirementIncomeTaxRatePercent
      ),
      20,
      45
    ),
    retirementInflationRatePercent: numberOrDefault(
      value.retirementInflationRatePercent,
      fallback.retirementInflationRatePercent
    ),
    retirementBequestReservePercent: numberOrDefault(
      value.retirementBequestReservePercent,
      fallback.retirementBequestReservePercent
    ),
    childBirthYear: numberOrDefault(value.childBirthYear, fallback.childBirthYear),
    childChartStartAge: numberOrDefault(value.childChartStartAge, fallback.childChartStartAge),
    childPayoutAge: numberOrDefault(value.childPayoutAge, fallback.childPayoutAge),
    childInvestmentReturnPercent: numberOrDefault(
      value.childInvestmentReturnPercent,
      fallback.childInvestmentReturnPercent
    ),
    childCapitalGainsTaxPercent: numberOrDefault(
      value.childCapitalGainsTaxPercent,
      fallback.childCapitalGainsTaxPercent
    ),
    childInflationRatePercent: numberOrDefault(value.childInflationRatePercent, fallback.childInflationRatePercent),
    childBequestReservePercent: numberOrDefault(
      value.childBequestReservePercent,
      fallback.childBequestReservePercent
    )
  };
}

export function normalizeLegacyInvestmentSettings(value: unknown): InvestmentSettings {
  const fallback = defaultInvestmentSettings();
  if (!isRecord(value)) return fallback;
  return {
    includedIds: stringArrayOrDefault(value.includedIds, fallback.includedIds),
    activeDepot: normalizeInvestmentDepotKey(value.activeDepot, fallback.activeDepot),
    retirementIncludedIds: stringArrayOrDefault(value.retirementIncludedIds, fallback.retirementIncludedIds),
    childIncludedIds: stringArrayOrDefault(value.childIncludedIds, fallback.childIncludedIds),
    retirementDepotEnabled: booleanOrDefault(value.retirementDepotEnabled, fallback.retirementDepotEnabled),
    retirementDepotAllowanceEnabled: booleanOrDefault(
      value.retirementDepotAllowanceEnabled,
      fallback.retirementDepotAllowanceEnabled
    ),
    retirementDepotChildren: numberOrDefault(value.retirementDepotChildren, fallback.retirementDepotChildren),
    birthYear: numberOrDefault(value.birthYear, fallback.birthYear),
    chartStartAge: numberOrDefault(value.chartStartAge, fallback.chartStartAge),
    payoutEndAge: numberOrDefault(value.payoutEndAge, fallback.payoutEndAge),
    payoutYears: numberOrDefault(value.payoutYears, fallback.payoutYears),
    percentageWithdrawalStartAge: numberOrDefault(
      value.percentageWithdrawalStartAge,
      fallback.percentageWithdrawalStartAge
    ),
    percentageWithdrawalRatePercent: numberOrDefault(
      value.percentageWithdrawalRatePercent,
      fallback.percentageWithdrawalRatePercent
    ),
    investmentReturnPercent: numberOrDefault(value.investmentReturn, fallback.investmentReturnPercent),
    capitalGainsTaxPercent: numberOrDefault(value.capitalGainsTax, fallback.capitalGainsTaxPercent),
    inflationRatePercent: numberOrDefault(value.inflationRate, fallback.inflationRatePercent),
    bequestReservePercent: numberOrDefault(value.bequestReservePercent, fallback.bequestReservePercent),
    retirementBirthYear: numberOrDefault(value.retirementBirthYear, fallback.retirementBirthYear),
    retirementChartStartAge: numberOrDefault(value.retirementChartStartAge, fallback.retirementChartStartAge),
    retirementPayoutEndAge: numberOrDefault(value.retirementPayoutEndAge, fallback.retirementPayoutEndAge),
    retirementPayoutYears: numberOrDefault(value.retirementPayoutYears, fallback.retirementPayoutYears),
    retirementInvestmentReturnPercent: numberOrDefault(
      value.retirementInvestmentReturn ?? value.investmentReturn,
      fallback.retirementInvestmentReturnPercent
    ),
    retirementCapitalGainsTaxPercent: numberOrDefault(
      value.retirementCapitalGainsTax ?? value.capitalGainsTax,
      fallback.retirementCapitalGainsTaxPercent
    ),
    retirementIncomeTaxRatePercent: clampNumber(
      numberOrDefault(
        value.retirementIncomeTaxRatePercent ?? value.retirementCapitalGainsTax ?? value.capitalGainsTax,
        fallback.retirementIncomeTaxRatePercent
      ),
      20,
      45
    ),
    retirementInflationRatePercent: numberOrDefault(
      value.retirementInflationRate ?? value.inflationRate,
      fallback.retirementInflationRatePercent
    ),
    retirementBequestReservePercent: numberOrDefault(
      value.retirementBequestReservePercent ?? value.bequestReservePercent,
      fallback.retirementBequestReservePercent
    ),
    childBirthYear: numberOrDefault(value.childBirthYear, fallback.childBirthYear),
    childChartStartAge: numberOrDefault(value.childChartStartAge, fallback.childChartStartAge),
    childPayoutAge: numberOrDefault(value.childPayoutAge, fallback.childPayoutAge),
    childInvestmentReturnPercent: numberOrDefault(
      value.childInvestmentReturn ?? value.investmentReturn,
      fallback.childInvestmentReturnPercent
    ),
    childCapitalGainsTaxPercent: numberOrDefault(
      value.childCapitalGainsTax ?? value.capitalGainsTax,
      fallback.childCapitalGainsTaxPercent
    ),
    childInflationRatePercent: numberOrDefault(
      value.childInflationRate ?? value.inflationRate,
      fallback.childInflationRatePercent
    ),
    childBequestReservePercent: numberOrDefault(
      value.childBequestReservePercent ?? value.bequestReservePercent,
      fallback.childBequestReservePercent
    )
  };
}

export function normalizeInvestmentDepotKey(value: unknown, fallback: InvestmentDepotKey): InvestmentDepotKey {
  return value === "child" || value === "retirement" || value === "standard" ? value : fallback;
}
