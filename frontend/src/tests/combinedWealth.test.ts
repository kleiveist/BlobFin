import { describe, expect, it } from "vitest";

import { buildCombinedWealthSeries, combinedWealthHorizonYears } from "../domain/combinedWealth";
import type { AssetProjection, AssetProjectionPoint, CombinedWealthToggles, RealEstateFinancingYear } from "../types";

const zeroAdditionalRepayment = {
  withdrawalGain: 0,
  depotSavingsRate: 0,
  legacySavingsRate: 0,
  netGain: 0,
  totalAdditionalRepayment: 0
};

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
  includeRealEstateValueTrend: true,
  includeStatutoryPension: false,
  cashAccountId: "default-account",
  depotKeys: ["standard", "retirement"],
  statutoryPensionScenario: "base",
  statutoryPensionMonthlyAmount: 0,
  statutoryPensionSavingsRatePercent: 0
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
        interestDue: 0,
        interestShortfall: 0,
        monthlyPaymentFromSavings: 0,
        monthlyPaymentFromWithdrawalGain: 0,
        monthlyPaymentAvailable: 0,
        principalFromMonthlyPayment: 0,
        principalPaid: 0,
        specialRepayment: 0,
        additionalRepayment: 0,
        additionalRepaymentBreakdown: zeroAdditionalRepayment,
        loanEnd: 205000,
        propertyEquity: 95000,
        netPropertyWealth: 95000
      },
      {
        year: 2027,
        propertyValue: 306000,
        loanStart: 205000,
        interestPaid: 0,
        interestDue: 0,
        interestShortfall: 0,
        monthlyPaymentFromSavings: 0,
        monthlyPaymentFromWithdrawalGain: 0,
        monthlyPaymentAvailable: 0,
        principalFromMonthlyPayment: 0,
        principalPaid: 0,
        specialRepayment: 0,
        additionalRepayment: 0,
        additionalRepaymentBreakdown: zeroAdditionalRepayment,
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

  it("adds annual depot and pension taxes and keeps a cumulative tax value", () => {
    const depot = projection(
      [
        { ...point(30, "saving", 10000), tax: 100, periodTax: 100 },
        { ...point(31, "saving", 12000), tax: 250, periodTax: 150 },
        { ...point(32, "saving", 14000), tax: 400, periodTax: 150 }
      ],
      0,
      65
    );

    const result = buildCombinedWealthSeries({
      startYear: 2026,
      horizonYears: 3,
      cashStartValue: 0,
      yearlyCashDelta: 0,
      depotProjection: depot,
      sharedDepotProjection: projection([], 0, 65),
      depotBirthYear: 1996,
      sharedDepotBirthYear: 1996,
      pension: {
        enabled: true,
        retirementYear: 2027,
        monthlyAmount: 1000,
        annualTax: 1200,
        savingsRatePercent: 25
      },
      realEstateYears: [],
      toggles: {
        ...defaultToggles,
        includeSharedDepotDevelopment: false,
        includeRealEstateFinancing: false,
        includeRealEstateValueTrend: false,
        includeStatutoryPension: true
      }
    });

    expect(result[0].depotTaxValue).toBe(100);
    expect(result[0].pensionConsumedValue).toBe(0);
    expect(result[0].pensionTaxValue).toBe(0);
    expect(result[0].taxValue).toBe(100);
    expect(result[0].cumulativeTaxValue).toBe(100);
    expect(result[1].depotTaxValue).toBe(150);
    expect(result[1].pensionConsumedValue).toBe(9000);
    expect(result[1].pensionTaxValue).toBe(1200);
    expect(result[1].taxValue).toBe(1350);
    expect(result[1].cumulativeTaxValue).toBe(1450);
    expect(result[2].depotTaxValue).toBe(150);
    expect(result[2].pensionConsumedValue).toBe(18000);
    expect(result[2].pensionTaxValue).toBe(1200);
    expect(result[2].taxValue).toBe(1350);
    expect(result[2].cumulativeTaxValue).toBe(2800);
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
          interestDue: 0,
          interestShortfall: 0,
          monthlyPaymentFromSavings: 0,
          monthlyPaymentFromWithdrawalGain: 0,
          monthlyPaymentAvailable: 0,
          principalFromMonthlyPayment: 0,
          principalPaid: 0,
          specialRepayment: 0,
          additionalRepayment: 0,
          additionalRepaymentBreakdown: zeroAdditionalRepayment,
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

  it("does not include property value from value trend without financing activation", () => {
    const result = buildCombinedWealthSeries({
      startYear: 2026,
      horizonYears: 1,
      cashStartValue: 0,
      yearlyCashDelta: 0,
      depotProjection: projection([point(30, "saving", 10000)], 0, 65),
      sharedDepotProjection: projection([], 0, 65),
      depotBirthYear: 1996,
      sharedDepotBirthYear: 1996,
      realEstateYears: [
        {
          year: 2026,
          propertyValue: 300000,
          loanStart: 200000,
          interestPaid: 0,
          interestDue: 0,
          interestShortfall: 0,
          monthlyPaymentFromSavings: 0,
          monthlyPaymentFromWithdrawalGain: 0,
          monthlyPaymentAvailable: 0,
          principalFromMonthlyPayment: 0,
          principalPaid: 0,
          specialRepayment: 0,
          additionalRepayment: 0,
          additionalRepaymentBreakdown: zeroAdditionalRepayment,
          loanEnd: 198000,
          propertyEquity: 102000,
          netPropertyWealth: 102000
        }
      ],
      toggles: {
        ...defaultToggles,
        includeSharedDepotDevelopment: false,
        includeRealEstateFinancing: false,
        includeRealEstateValueTrend: true
      }
    });

    expect(result[0].propertyValue).toBe(0);
    expect(result[0].propertyDebt).toBe(0);
    expect(result[0].totalNetWealth).toBe(10000);
  });

  it("uses the supplied real estate projection through the combined end year", () => {
    const depot = projection([point(30, "saving", 10000), point(31, "saving", 11000), point(32, "saving", 12000)], 0, 65);
    const realEstate: RealEstateFinancingYear[] = [
      {
        year: 2026,
        propertyValue: 300000,
        loanStart: 200000,
        interestPaid: 0,
        interestDue: 0,
        interestShortfall: 0,
        monthlyPaymentFromSavings: 0,
        monthlyPaymentFromWithdrawalGain: 0,
        monthlyPaymentAvailable: 0,
        principalFromMonthlyPayment: 0,
        principalPaid: 0,
        specialRepayment: 0,
        additionalRepayment: 0,
        additionalRepaymentBreakdown: zeroAdditionalRepayment,
        loanEnd: 198000,
        propertyEquity: 102000,
        netPropertyWealth: 102000
      },
      {
        year: 2027,
        propertyValue: 306000,
        loanStart: 198000,
        interestPaid: 0,
        interestDue: 0,
        interestShortfall: 0,
        monthlyPaymentFromSavings: 0,
        monthlyPaymentFromWithdrawalGain: 0,
        monthlyPaymentAvailable: 0,
        principalFromMonthlyPayment: 0,
        principalPaid: 0,
        specialRepayment: 0,
        additionalRepayment: 0,
        additionalRepaymentBreakdown: zeroAdditionalRepayment,
        loanEnd: 196000,
        propertyEquity: 110000,
        netPropertyWealth: 110000
      },
      {
        year: 2028,
        propertyValue: 312120,
        loanStart: 196000,
        interestPaid: 0,
        interestDue: 0,
        interestShortfall: 0,
        monthlyPaymentFromSavings: 0,
        monthlyPaymentFromWithdrawalGain: 0,
        monthlyPaymentAvailable: 0,
        principalFromMonthlyPayment: 0,
        principalPaid: 0,
        specialRepayment: 0,
        additionalRepayment: 0,
        additionalRepaymentBreakdown: zeroAdditionalRepayment,
        loanEnd: 194000,
        propertyEquity: 118120,
        netPropertyWealth: 118120
      }
    ];

    const result = buildCombinedWealthSeries({
      startYear: 2026,
      horizonYears: 3,
      cashStartValue: 0,
      yearlyCashDelta: 0,
      depotProjection: depot,
      sharedDepotProjection: projection([], 0, 65),
      depotBirthYear: 1996,
      sharedDepotBirthYear: 1996,
      realEstateYears: realEstate,
      toggles: {
        ...defaultToggles,
        includeSharedDepotDevelopment: false,
        includeRealEstateFinancing: true,
        includeRealEstateValueTrend: true
      }
    });

    expect(result[2].propertyValue).toBe(312120);
    expect(result[2].propertyDebt).toBe(194000);
  });

  it("drops the property from combined years after the supplied sale horizon", () => {
    const result = buildCombinedWealthSeries({
      startYear: 2026,
      horizonYears: 3,
      cashStartValue: 0,
      yearlyCashDelta: 0,
      depotProjection: projection([point(30, "saving", 10000), point(31, "saving", 11000), point(32, "saving", 12000)], 0, 65),
      sharedDepotProjection: projection([], 0, 65),
      depotBirthYear: 1996,
      sharedDepotBirthYear: 1996,
      realEstateYears: [
        {
          year: 2026,
          propertyValue: 300000,
          loanStart: 200000,
          interestPaid: 0,
          interestDue: 0,
          interestShortfall: 0,
          monthlyPaymentFromSavings: 0,
          monthlyPaymentFromWithdrawalGain: 0,
          monthlyPaymentAvailable: 0,
          principalFromMonthlyPayment: 0,
          principalPaid: 0,
          specialRepayment: 0,
          additionalRepayment: 0,
          additionalRepaymentBreakdown: zeroAdditionalRepayment,
          loanEnd: 198000,
          propertyEquity: 102000,
          netPropertyWealth: 102000
        }
      ],
      toggles: {
        ...defaultToggles,
        includeSharedDepotDevelopment: false,
        includeRealEstateFinancing: true,
        includeRealEstateValueTrend: true
      }
    });

    expect(result[0].propertyValue).toBe(300000);
    expect(result[1].propertyValue).toBe(0);
    expect(result[2].propertyValue).toBe(0);
  });

  it("does not extend the combined horizon with later real estate years", () => {
    const horizonYears = combinedWealthHorizonYears(2026, 2027, 2027);
    const result = buildCombinedWealthSeries({
      startYear: 2026,
      horizonYears,
      cashStartValue: 0,
      yearlyCashDelta: 0,
      depotProjection: projection([point(30, "saving", 10000), point(31, "saving", 11000)], 0, 65),
      sharedDepotProjection: projection([], 0, 65),
      depotBirthYear: 1996,
      sharedDepotBirthYear: 1996,
      realEstateYears: [
        {
          year: 2026,
          propertyValue: 300000,
          loanStart: 200000,
          interestPaid: 0,
          interestDue: 0,
          interestShortfall: 0,
          monthlyPaymentFromSavings: 0,
          monthlyPaymentFromWithdrawalGain: 0,
          monthlyPaymentAvailable: 0,
          principalFromMonthlyPayment: 0,
          principalPaid: 0,
          specialRepayment: 0,
          additionalRepayment: 0,
          additionalRepaymentBreakdown: zeroAdditionalRepayment,
          loanEnd: 198000,
          propertyEquity: 102000,
          netPropertyWealth: 102000
        },
        {
          year: 2028,
          propertyValue: 318000,
          loanStart: 196000,
          interestPaid: 0,
          interestDue: 0,
          interestShortfall: 0,
          monthlyPaymentFromSavings: 0,
          monthlyPaymentFromWithdrawalGain: 0,
          monthlyPaymentAvailable: 0,
          principalFromMonthlyPayment: 0,
          principalPaid: 0,
          specialRepayment: 0,
          additionalRepayment: 0,
          additionalRepaymentBreakdown: zeroAdditionalRepayment,
          loanEnd: 194000,
          propertyEquity: 124000,
          netPropertyWealth: 124000
        }
      ],
      toggles: {
        ...defaultToggles,
        includeSharedDepotDevelopment: false,
        includeRealEstateFinancing: true,
        includeRealEstateValueTrend: true
      }
    });

    expect(horizonYears).toBe(2);
    expect(result).toHaveLength(2);
    expect(result[result.length - 1].year).toBe(2027);
  });

  it("moves net property sale proceeds into cash and stops property values", () => {
    const realEstate: RealEstateFinancingYear[] = [
      {
        year: 2026,
        propertyValue: 300000,
        loanStart: 210000,
        interestPaid: 0,
        interestDue: 0,
        interestShortfall: 0,
        monthlyPaymentFromSavings: 0,
        monthlyPaymentFromWithdrawalGain: 0,
        monthlyPaymentAvailable: 0,
        principalFromMonthlyPayment: 0,
        principalPaid: 0,
        specialRepayment: 0,
        additionalRepayment: 0,
        additionalRepaymentBreakdown: zeroAdditionalRepayment,
        loanEnd: 200000,
        propertyEquity: 100000,
        netPropertyWealth: 100000
      },
      {
        year: 2027,
        propertyValue: 320000,
        loanStart: 200000,
        interestPaid: 0,
        interestDue: 0,
        interestShortfall: 0,
        monthlyPaymentFromSavings: 0,
        monthlyPaymentFromWithdrawalGain: 0,
        monthlyPaymentAvailable: 0,
        principalFromMonthlyPayment: 0,
        principalPaid: 0,
        specialRepayment: 0,
        additionalRepayment: 0,
        additionalRepaymentBreakdown: zeroAdditionalRepayment,
        loanEnd: 180000,
        propertyEquity: 140000,
        netPropertyWealth: 140000
      },
      {
        year: 2028,
        propertyValue: 340000,
        loanStart: 180000,
        interestPaid: 0,
        interestDue: 0,
        interestShortfall: 0,
        monthlyPaymentFromSavings: 0,
        monthlyPaymentFromWithdrawalGain: 0,
        monthlyPaymentAvailable: 0,
        principalFromMonthlyPayment: 0,
        principalPaid: 0,
        specialRepayment: 0,
        additionalRepayment: 0,
        additionalRepaymentBreakdown: zeroAdditionalRepayment,
        loanEnd: 160000,
        propertyEquity: 180000,
        netPropertyWealth: 180000
      }
    ];

    const result = buildCombinedWealthSeries({
      startYear: 2026,
      horizonYears: 3,
      cashStartValue: 1000,
      yearlyCashDelta: 0,
      depotProjection: projection([point(30, "saving", 10000), point(31, "saving", 11000), point(32, "saving", 12000)], 0, 65),
      sharedDepotProjection: projection([], 0, 65),
      depotBirthYear: 1996,
      sharedDepotBirthYear: 1996,
      realEstateSaleYear: 2027,
      realEstateYears: realEstate,
      toggles: {
        ...defaultToggles,
        includeSharedDepotDevelopment: false,
        includeRealEstateFinancing: true,
        includeRealEstateValueTrend: true
      }
    });

    expect(result[0].cashValue).toBe(1000);
    expect(result[0].propertyValue).toBe(300000);
    expect(result[0].propertyDebt).toBe(200000);
    expect(result[1].cashValue).toBe(141000);
    expect(result[1].propertyValue).toBe(0);
    expect(result[1].propertyDebt).toBe(0);
    expect(result[2].cashValue).toBe(141000);
    expect(result[2].propertyValue).toBe(0);
    expect(result[2].propertyDebt).toBe(0);
  });

  it("caps the combined horizon at the global planning end year", () => {
    expect(combinedWealthHorizonYears(2026, 2060, 2070, 2040)).toBe(15);
    expect(combinedWealthHorizonYears(2026, 2060, 2070, 2024)).toBe(1);
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

  it("redirects active repayment sources away from cash and depot", () => {
    const depot = projection([point(30, "saving", 12000), point(31, "saving", 24000)], 0, 65);
    const realEstate: RealEstateFinancingYear[] = [
      {
        year: 2026,
        propertyValue: 300000,
        loanStart: 200000,
        interestPaid: 0,
        interestDue: 0,
        interestShortfall: 0,
        monthlyPaymentFromSavings: 0,
        monthlyPaymentFromWithdrawalGain: 0,
        monthlyPaymentAvailable: 0,
        principalFromMonthlyPayment: 0,
        principalPaid: 0,
        specialRepayment: 0,
        additionalRepayment: 6000,
        additionalRepaymentBreakdown: {
          withdrawalGain: 1200,
          depotSavingsRate: 2400,
          legacySavingsRate: 1200,
          netGain: 1200,
          totalAdditionalRepayment: 6000
        },
        loanEnd: 194000,
        propertyEquity: 106000,
        netPropertyWealth: 106000
      }
    ];

    const result = buildCombinedWealthSeries({
      startYear: 2026,
      horizonYears: 1,
      cashStartValue: 10000,
      yearlyCashDelta: 0,
      depotProjection: depot,
      sharedDepotProjection: projection([], 0, 65),
      depotBirthYear: 1996,
      sharedDepotBirthYear: 1996,
      realEstateYears: realEstate,
      toggles: {
        ...defaultToggles,
        includeSharedDepotDevelopment: false,
        includeWithdrawals: false,
        includeRealEstateFinancing: true
      }
    });

    expect(result[0].redirectedCashRepayment).toBe(3600);
    expect(result[0].redirectedDepotRepayment).toBe(2400);
    expect(result[0].cashValue).toBe(6400);
    expect(result[0].depotValue).toBe(9600);
  });

  it("covers negative cash years from the standard depot and floors cash at zero", () => {
    const result = buildCombinedWealthSeries({
      startYear: 2026,
      horizonYears: 2,
      cashStartValue: 0,
      yearlyCashDelta: -3000,
      depotProjection: projection([point(30, "saving", 10000), point(31, "saving", 12000)], 0, 65),
      sharedDepotProjection: projection([point(30, "saving", 5000), point(31, "saving", 5000)], 0, 65),
      depotBirthYear: 1996,
      sharedDepotBirthYear: 1996,
      realEstateYears: [],
      toggles: defaultToggles
    });

    expect(result[0].cashValue).toBe(0);
    expect(result[0].depotValue).toBe(15000);
    expect(result[1].cashValue).toBe(0);
    expect(result[1].depotValue).toBe(14000);
  });

  it("uses year-specific cash deficits before drawing from the standard depot", () => {
    const result = buildCombinedWealthSeries({
      startYear: 2026,
      horizonYears: 3,
      cashStartValue: 10000,
      yearlyCashDelta: 0,
      yearlyCashDeltas: [0, -12000, 0],
      depotProjection: projection([point(30, "saving", 5000), point(31, "saving", 5000), point(32, "saving", 5000)], 0, 65),
      sharedDepotProjection: projection([point(30, "saving", 5000), point(31, "saving", 5000), point(32, "saving", 5000)], 0, 65),
      depotBirthYear: 1996,
      sharedDepotBirthYear: 1996,
      realEstateYears: [],
      toggles: defaultToggles
    });

    expect(result[0].cashValue).toBe(10000);
    expect(result[1].cashValue).toBe(0);
    expect(result[1].depotValue).toBe(8000);
    expect(result[2].cashValue).toBe(0);
    expect(result[2].depotValue).toBe(8000);
  });

  it("keeps an uncovered cash deficit visible when the standard depot is insufficient", () => {
    const result = buildCombinedWealthSeries({
      startYear: 2026,
      horizonYears: 2,
      cashStartValue: -7000,
      yearlyCashDelta: 0,
      depotProjection: projection([point(30, "saving", 5000), point(31, "saving", 6000)], 0, 65),
      sharedDepotProjection: projection([point(30, "saving", 5000), point(31, "saving", 5000)], 0, 65),
      depotBirthYear: 1996,
      sharedDepotBirthYear: 1996,
      realEstateYears: [],
      toggles: defaultToggles
    });

    expect(result[0].cashValue).toBe(-2000);
    expect(result[0].depotValue).toBe(5000);
    expect(result[1].cashValue).toBe(-1000);
    expect(result[1].depotValue).toBe(5000);
  });
});
