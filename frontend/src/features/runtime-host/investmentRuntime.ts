import { RETIREMENT_DEPOT_MIN_AGE } from "../../domain/retirementDepot";
import { clamp } from "../../lib/format";
import type { AssetProjection, AssetProjectionPoint, InvestmentDepotKey, InvestmentSettings } from "../../types";

export const CHILD_DEPOT_DEFAULT_PAYOUT_AGE = 18;

export function combineAssetProjections(standard: AssetProjection, retirement: AssetProjection): AssetProjection {
  const pointsByAge = new Map<number, { standard?: AssetProjectionPoint; retirement?: AssetProjectionPoint }>();
  for (const point of standard.points) {
    pointsByAge.set(point.age, { ...(pointsByAge.get(point.age) ?? {}), standard: point });
  }
  for (const point of retirement.points) {
    pointsByAge.set(point.age, { ...(pointsByAge.get(point.age) ?? {}), retirement: point });
  }

  const ages = Array.from(pointsByAge.keys()).sort((left, right) => left - right);
  const points = ages.map((age) => {
    const pair = pointsByAge.get(age) ?? {};
    return sumProjectionPoint(age, pair.standard, pair.retirement);
  });

  return {
    ...standard,
    points,
    monthlyRate: standard.monthlyRate + retirement.monthlyRate,
    annualSavingsRate: standard.annualSavingsRate + retirement.annualSavingsRate,
    retirementDepotEnabled: retirement.retirementDepotEnabled,
    retirementDepotAllowanceEnabled: retirement.retirementDepotAllowanceEnabled,
    retirementDepotAnnualOwnContribution: retirement.retirementDepotAnnualOwnContribution,
    retirementDepotBaseAllowanceAnnual: retirement.retirementDepotBaseAllowanceAnnual,
    retirementDepotChildAllowanceAnnual: retirement.retirementDepotChildAllowanceAnnual,
    retirementDepotAllowanceAnnual: retirement.retirementDepotAllowanceAnnual,
    retirementDepotAllowanceRatePercent: retirement.retirementDepotAllowanceRatePercent,
    retirementDepotAnnualContributionWithAllowance: retirement.retirementDepotAnnualContributionWithAllowance,
    retirementDepotChildren: retirement.retirementDepotChildren,
    monthlyPension: standard.monthlyPension + retirement.monthlyPension,
    realMonthlyPension: standard.realMonthlyPension + retirement.realMonthlyPension,
    bequestReservePercent: Math.max(standard.bequestReservePercent, retirement.bequestReservePercent),
    bequestReserveAtEnd: standard.bequestReserveAtEnd + retirement.bequestReserveAtEnd,
    percentageWithdrawalMonthlyAtStart:
      standard.percentageWithdrawalMonthlyAtStart + retirement.percentageWithdrawalMonthlyAtStart,
    percentageWithdrawalAnnualAtStart:
      standard.percentageWithdrawalAnnualAtStart + retirement.percentageWithdrawalAnnualAtStart,
    withdrawalRemainingSavingsMonthlyAtStart:
      standard.withdrawalRemainingSavingsMonthlyAtStart + retirement.withdrawalRemainingSavingsMonthlyAtStart,
    withdrawalGainMonthlyAtStart: standard.withdrawalGainMonthlyAtStart + retirement.withdrawalGainMonthlyAtStart,
    retirementAge: Math.max(standard.retirementAge, retirement.retirementAge),
    endAge: Math.max(standard.endAge, retirement.endAge),
    ageToday: Math.min(standard.ageToday, retirement.ageToday),
    savingMonths: standard.savingMonths + retirement.savingMonths,
    totalContribution: standard.totalContribution + retirement.totalContribution,
    recurringContributionAtRetirement:
      standard.recurringContributionAtRetirement + retirement.recurringContributionAtRetirement,
    oneTimeContributionAtRetirement:
      standard.oneTimeContributionAtRetirement + retirement.oneTimeContributionAtRetirement,
    grossWealthAtRetirement: standard.grossWealthAtRetirement + retirement.grossWealthAtRetirement,
    growthAtRetirement: standard.growthAtRetirement + retirement.growthAtRetirement,
    taxAtRetirement: standard.taxAtRetirement + retirement.taxAtRetirement,
    taxAtEnd: standard.taxAtEnd + retirement.taxAtEnd,
    costBasisAtRetirement: standard.costBasisAtRetirement + retirement.costBasisAtRetirement,
    allowanceAtRetirement: standard.allowanceAtRetirement + retirement.allowanceAtRetirement,
    allowanceBasisAtRetirement: standard.allowanceBasisAtRetirement + retirement.allowanceBasisAtRetirement,
    unrealizedTaxAtRetirement: standard.unrealizedTaxAtRetirement + retirement.unrealizedTaxAtRetirement,
    netWealthAfterFullTaxAtRetirement:
      standard.netWealthAfterFullTaxAtRetirement + retirement.netWealthAfterFullTaxAtRetirement,
    inflationFactorAtRetirement: Math.max(standard.inflationFactorAtRetirement, retirement.inflationFactorAtRetirement),
    wealthAtRetirement: standard.wealthAtRetirement + retirement.wealthAtRetirement,
    realWealthAtRetirement: standard.realWealthAtRetirement + retirement.realWealthAtRetirement
  };
}

export function clampRetirementAge(retirementAge: number, payoutEndAge: number): number {
  return clamp(retirementAge, RETIREMENT_DEPOT_MIN_AGE, retirementAgeMaxForPayoutEndAge(payoutEndAge));
}

export function retirementAgeMaxForPayoutEndAge(payoutEndAge: number): number {
  return Math.max(RETIREMENT_DEPOT_MIN_AGE, Math.min(85, payoutEndAge - investmentMin("payoutYears")));
}

export function payoutYearsForRetirementAge(payoutEndAge: number, retirementAge: number): number {
  return clamp(payoutEndAge - retirementAge, investmentMin("payoutYears"), investmentMax("payoutYears"));
}

export function investmentMinForDepot(field: keyof InvestmentSettings, depot: InvestmentDepotKey): number {
  if (field === "capitalGainsTaxPercent" && depot === "retirement") return 20;
  return investmentMin(field);
}

export function investmentMaxForDepot(field: keyof InvestmentSettings, depot: InvestmentDepotKey): number {
  if (field === "capitalGainsTaxPercent" && depot === "retirement") return 45;
  return investmentMax(field);
}

export function investmentMin(field: keyof InvestmentSettings): number {
  if (field === "chartStartAge") return 0;
  if (field === "birthYear") return 1962;
  if (field === "childPayoutAge") return 18;
  if (field === "payoutEndAge") return 70;
  if (field === "percentageWithdrawalStartAge") return 0;
  if (field === "retirementDepotChildren") return 0;
  if (field === "payoutYears") return 1;
  if (field === "inflationRatePercent") return 1;
  return 0;
}

export function investmentMax(field: keyof InvestmentSettings): number {
  if (field === "chartStartAge") return 80;
  if (field === "birthYear") return 2009;
  if (field === "childPayoutAge") return 25;
  if (field === "payoutEndAge") return 110;
  if (field === "percentageWithdrawalStartAge") return 110;
  if (field === "percentageWithdrawalRatePercent") return 20;
  if (field === "retirementDepotChildren") return 20;
  if (field === "payoutYears") return 50;
  if (field === "investmentReturnPercent") return 30;
  if (field === "capitalGainsTaxPercent") return 50;
  if (field === "inflationRatePercent") return 10;
  if (field === "bequestReservePercent") return 50;
  return Number.MAX_SAFE_INTEGER;
}

function sumProjectionPoint(
  age: number,
  standard: AssetProjectionPoint | undefined,
  retirement: AssetProjectionPoint | undefined
): AssetProjectionPoint {
  return {
    age,
    phase: standard?.phase === "payout" || retirement?.phase === "payout" ? "payout" : "saving",
    grossBalance: (standard?.grossBalance ?? 0) + (retirement?.grossBalance ?? 0),
    contribution: (standard?.contribution ?? 0) + (retirement?.contribution ?? 0),
    costBasis: (standard?.costBasis ?? 0) + (retirement?.costBasis ?? 0),
    allowance: (standard?.allowance ?? 0) + (retirement?.allowance ?? 0),
    growth: (standard?.growth ?? 0) + (retirement?.growth ?? 0),
    tax: (standard?.tax ?? 0) + (retirement?.tax ?? 0),
    periodTax: (standard?.periodTax ?? 0) + (retirement?.periodTax ?? 0),
    netBalance: (standard?.netBalance ?? 0) + (retirement?.netBalance ?? 0),
    realNetBalance: (standard?.realNetBalance ?? 0) + (retirement?.realNetBalance ?? 0),
    normalDepot: (standard?.normalDepot ?? 0) + (retirement?.normalDepot ?? 0)
  };
}
