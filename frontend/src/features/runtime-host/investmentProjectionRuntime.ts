import type { AssetProjection, AssetProjectionPoint } from "../../types";

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
