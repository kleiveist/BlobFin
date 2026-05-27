import { describe, expect, it } from "vitest";

import { buildCombinedWealthSeries } from "../domain/combinedWealth";
import type { AssetProjection, AssetProjectionPoint, CombinedWealthToggles, RealEstateFinancingYear } from "../types";

function point(age: number, phase: AssetProjectionPoint["phase"], netBalance: number): AssetProjectionPoint {
  return {
    age,
    phase,
    grossBalance: netBalance,
    contribution: 0,
    costBasis: 0,
    allowance: 0,
    growth: 0,
    tax: 0,
    periodTax: 0,
    netBalance,
    realNetBalance: netBalance,
    normalDepot: netBalance
  };
}

function projection(points: AssetProjectionPoint[], monthlyPension = 0, retirementAge = 65): AssetProjection {
  return {
    points,
    monthlyRate: 0,
    annualSavingsRate: 0,
    retirementDepotEnabled: false,
    retirementDepotAnnualOwnContribution: 0,
    retirementDepotBaseAllowanceAnnual: 0,
    retirementDepotChildAllowanceAnnual: 0,
    retirementDepotAllowanceAnnual: 0,
    retirementDepotAllowanceRatePercent: 0,
    retirementDepotAnnualContributionWithAllowance: 0,
    retirementDepotChildren: 0,
    monthlyPension,
    realMonthlyPension: monthlyPension,
    bequestReservePercent: 0,
    bequestReserveAtEnd: 0,
    percentageWithdrawalMonthlyAtStart: 0,
    percentageWithdrawalAnnualAtStart: 0,
    withdrawalRemainingSavingsMonthlyAtStart: 0,
    withdrawalGainMonthlyAtStart: 0,
    percentageWithdrawalStartAge: retirementAge,
    percentageWithdrawalRatePercent: 0,
    retirementAge,
    endAge: points[points.length - 1]?.age ?? retirementAge,
    ageToday: points[0]?.age ?? retirementAge,
    savingMonths: 0,
    totalContribution: 0,
    recurringContributionAtRetirement: 0,
    oneTimeContributionAtRetirement: 0,
    grossWealthAtRetirement: 0,
    growthAtRetirement: 0,
    taxAtRetirement: 0,
    taxAtEnd: 0,
    costBasisAtRetirement: 0,
    allowanceAtRetirement: 0,
    allowanceBasisAtRetirement: 0,
    unrealizedTaxAtRetirement: 0,
    netWealthAfterFullTaxAtRetirement: 0,
    inflationFactorAtRetirement: 1,
    wealthAtRetirement: 0,
    realWealthAtRetirement: 0
  };
}

const defaultToggles: CombinedWealthToggles = {
  includeCashPositions: true,
  includeCostReserveAccounts: true,
  includeAnnualTableAccounts: true,
  includeDepotDevelopment: true,
  includeSharedDepotDevelopment: true,
  includeWithdrawals: true,
  includeRealEstateFinancing: true,
  includeRealEstateValueTrend: true
};

describe("combined wealth", () => {
  it("aggregates cash, depot and property values", () => {
    const depot = projection([point(30, "saving", 10000), point(31, "saving", 12000)], 0, 65);
    const shared = projection([point(30, "saving", 3000), point(31, "saving", 5000)], 0, 65);
    const realEstate: RealEstateFinancingYear[] = [
      {
        year: 2026,
        propertyValue: 300000,
        loanStart: 210000,
        interestPaid: 0,
        principalPaid: 0,
        specialRepayment: 0,
        loanEnd: 205000,
        propertyEquity: 95000,
        netPropertyWealth: 95000
      },
      {
        year: 2027,
        propertyValue: 306000,
        loanStart: 205000,
        interestPaid: 0,
        principalPaid: 0,
        specialRepayment: 0,
        loanEnd: 198000,
        propertyEquity: 108000,
        netPropertyWealth: 108000
      }
    ];

    const result = buildCombinedWealthSeries({
      startYear: 2026,
      horizonYears: 2,
      cashStartValue: 20000,
      yearlyCashDelta: 5000,
      depotProjection: depot,
      sharedDepotProjection: shared,
      depotBirthYear: 1996,
      sharedDepotBirthYear: 1996,
      realEstateYears: realEstate,
      toggles: defaultToggles
    });

    expect(result[0].cashValue).toBe(20000);
    expect(result[0].depotValue).toBe(13000);
    expect(result[0].propertyDebt).toBe(205000);
    expect(result[0].totalNetWealth).toBeGreaterThan(0);
  });

  it("can exclude real estate from combined results", () => {
    const depot = projection([point(30, "saving", 10000)], 0, 65);
    const shared = projection([point(30, "saving", 5000)], 0, 65);

    const result = buildCombinedWealthSeries({
      startYear: 2026,
      horizonYears: 1,
      cashStartValue: 0,
      yearlyCashDelta: 0,
      depotProjection: depot,
      sharedDepotProjection: shared,
      depotBirthYear: 1996,
      sharedDepotBirthYear: 1996,
      realEstateYears: [
        {
          year: 2026,
          propertyValue: 200000,
          loanStart: 150000,
          interestPaid: 0,
          principalPaid: 0,
          specialRepayment: 0,
          loanEnd: 145000,
          propertyEquity: 55000,
          netPropertyWealth: 55000
        }
      ],
      toggles: {
        ...defaultToggles,
        includeRealEstateFinancing: false,
        includeRealEstateValueTrend: false
      }
    });

    expect(result[0].propertyValue).toBe(0);
    expect(result[0].propertyDebt).toBe(0);
  });

  it("models withdrawal impact as negative liquidity effect", () => {
    const payoutProjection = projection(
      [point(30, "saving", 10000), point(31, "payout", 9000), point(32, "payout", 8000)],
      500,
      30
    );

    const withWithdrawals = buildCombinedWealthSeries({
      startYear: 2026,
      horizonYears: 3,
      cashStartValue: 0,
      yearlyCashDelta: 0,
      depotProjection: payoutProjection,
      sharedDepotProjection: projection([], 0, 65),
      depotBirthYear: 1996,
      sharedDepotBirthYear: 1996,
      realEstateYears: [],
      toggles: {
        ...defaultToggles,
        includeSharedDepotDevelopment: false,
        includeRealEstateFinancing: false,
        includeRealEstateValueTrend: false,
        includeWithdrawals: true
      }
    });

    const withoutWithdrawals = buildCombinedWealthSeries({
      startYear: 2026,
      horizonYears: 3,
      cashStartValue: 0,
      yearlyCashDelta: 0,
      depotProjection: payoutProjection,
      sharedDepotProjection: projection([], 0, 65),
      depotBirthYear: 1996,
      sharedDepotBirthYear: 1996,
      realEstateYears: [],
      toggles: {
        ...defaultToggles,
        includeSharedDepotDevelopment: false,
        includeRealEstateFinancing: false,
        includeRealEstateValueTrend: false,
        includeWithdrawals: false
      }
    });

    expect(withWithdrawals[2].withdrawalImpact).toBeLessThan(0);
    expect(withWithdrawals[2].totalNetWealth).toBeLessThan(withoutWithdrawals[2].totalNetWealth);
  });
});
