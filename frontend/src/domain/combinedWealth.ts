import type {
  AssetProjection,
  CombinedWealthToggles,
  CombinedWealthYear,
  RealEstateFinancingYear
} from "../types";

interface BuildCombinedWealthSeriesInput {
  startYear: number;
  horizonYears: number;
  cashStartValue: number;
  yearlyCashDelta: number;
  yearlyCashDeltas?: number[];
  depotProjection: AssetProjection;
  sharedDepotProjection: AssetProjection;
  depotBirthYear: number;
  sharedDepotBirthYear: number;
  realEstateYears: RealEstateFinancingYear[];
  toggles: CombinedWealthToggles;
}

export function buildCombinedWealthSeries(input: BuildCombinedWealthSeriesInput): CombinedWealthYear[] {
  const years: CombinedWealthYear[] = [];
  const realEstateByYear = new Map<number, RealEstateFinancingYear>(
    input.realEstateYears.map((entry) => [entry.year, entry])
  );
  const depotByYear = projectionNetByYear(input.depotProjection, input.depotBirthYear);
  const sharedDepotByYear = projectionNetByYear(input.sharedDepotProjection, input.sharedDepotBirthYear);

  let withdrawalImpact = 0;
  let redirectedCashRepayment = 0;
  let redirectedDepotRepayment = 0;
  let standardDepotCashDrawdown = 0;
  let cumulativeCashValue = input.cashStartValue;

  for (let yearOffset = 0; yearOffset < input.horizonYears; yearOffset += 1) {
    const year = input.startYear + yearOffset;
    if (yearOffset > 0) {
      cumulativeCashValue = roundMoney(cumulativeCashValue + cashDeltaForYearOffset(input, yearOffset));
    }
    const realEstate = realEstateByYear.get(year);
    const allocation = input.toggles.includeRealEstateFinancing ? realEstate?.additionalRepaymentBreakdown : undefined;
    redirectedCashRepayment = roundMoney(
      redirectedCashRepayment + (allocation?.withdrawalGain ?? 0) + (allocation?.legacySavingsRate ?? 0) + (allocation?.netGain ?? 0)
    );
    redirectedDepotRepayment = roundMoney(redirectedDepotRepayment + (allocation?.depotSavingsRate ?? 0));

    const rawCashValue = input.toggles.includeCashPositions
      ? roundMoney(cumulativeCashValue - redirectedCashRepayment)
      : 0;
    const standardDepotBeforeCashDrawdown = roundMoney(
      (depotByYear.get(year) ?? 0) - redirectedDepotRepayment - standardDepotCashDrawdown
    );
    const cashDeficit = Math.max(0, -rawCashValue);
    const cashDrawdown = input.toggles.includeDepotDevelopment
      ? roundMoney(Math.min(cashDeficit, Math.max(0, standardDepotBeforeCashDrawdown)))
      : 0;
    standardDepotCashDrawdown = roundMoney(standardDepotCashDrawdown + cashDrawdown);
    const cashValue = input.toggles.includeCashPositions ? roundMoney(rawCashValue + cashDrawdown) : 0;
    if (input.toggles.includeCashPositions && cashDrawdown > 0) {
      cumulativeCashValue = roundMoney(cumulativeCashValue + cashDrawdown);
    }

    const depotValue = input.toggles.includeDepotDevelopment
      ? roundMoney(
          (depotByYear.get(year) ?? 0) -
            redirectedDepotRepayment -
            standardDepotCashDrawdown +
            (input.toggles.includeSharedDepotDevelopment ? sharedDepotByYear.get(year) ?? 0 : 0)
        )
      : 0;

    if (input.toggles.includeWithdrawals) {
      withdrawalImpact = roundMoney(
        withdrawalImpact + yearlyWithdrawalImpactForYear(input.depotProjection, input.depotBirthYear, year)
      );
    } else {
      withdrawalImpact = 0;
    }

    const propertyValue =
      input.toggles.includeRealEstateValueTrend || input.toggles.includeRealEstateFinancing
        ? roundMoney(realEstate?.propertyValue ?? 0)
        : 0;
    const propertyDebt = input.toggles.includeRealEstateFinancing ? roundMoney(realEstate?.loanEnd ?? 0) : 0;
    const propertyEquity = roundMoney(propertyValue - propertyDebt);

    const totalGrossAssets = roundMoney(Math.max(0, cashValue) + Math.max(0, depotValue) + Math.max(0, propertyValue));
    const totalDebt = roundMoney(Math.max(0, propertyDebt));
    const totalNetWealth = roundMoney(cashValue + depotValue + Math.max(0, propertyValue) - totalDebt + withdrawalImpact);

    years.push({
      year,
      cashValue,
      depotValue,
      withdrawalImpact,
      redirectedCashRepayment,
      redirectedDepotRepayment,
      propertyValue,
      propertyDebt,
      propertyEquity,
      totalGrossAssets,
      totalDebt,
      totalNetWealth
    });
  }

  return years;
}

export function combinedWealthHorizonYears(startYear: number, standardEndYear: number, retirementEndYear: number): number {
  const endYear = Math.max(startYear, standardEndYear, retirementEndYear);
  return Math.max(1, Math.round(endYear - startYear + 1));
}

function cashDeltaForYearOffset(input: BuildCombinedWealthSeriesInput, yearOffset: number): number {
  const value = input.yearlyCashDeltas?.[yearOffset] ?? input.yearlyCashDelta;
  return Number.isFinite(value) ? roundMoney(value) : 0;
}

function projectionNetByYear(projection: AssetProjection, birthYear: number): Map<number, number> {
  const map = new Map<number, number>();
  for (const point of projection.points) {
    const year = birthYear + point.age;
    map.set(year, point.netBalance);
  }
  return map;
}

function yearlyWithdrawalImpactForYear(projection: AssetProjection, birthYear: number, year: number): number {
  const payoutStartYear = birthYear + projection.retirementAge + 1;
  if (year < payoutStartYear || projection.monthlyPension <= 0) return 0;
  return roundMoney(-projection.monthlyPension * 12);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
