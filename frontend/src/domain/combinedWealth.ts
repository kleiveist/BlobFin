import type {
  AssetProjection,
  CombinedWealthDepotKey,
  CombinedWealthToggles,
  CombinedWealthYear,
  RealEstateFinancingYear
} from "../types";

export interface CombinedWealthDepotProjection {
  id: CombinedWealthDepotKey;
  label: string;
  projection: AssetProjection;
  birthYear: number;
}

export interface CombinedWealthPensionInput {
  enabled: boolean;
  retirementYear: number;
  monthlyAmount: number;
  annualTax: number;
  savingsRatePercent: number;
}

interface BuildCombinedWealthSeriesInput {
  startYear: number;
  horizonYears: number;
  cashStartValue: number;
  yearlyCashDelta: number;
  yearlyCashDeltas?: number[];
  realEstateSaleYear?: number | null;
  realEstateEstimatedSaleValue?: number | null;
  realEstateEquityCapital?: number;
  realEstateStartValue?: number;
  depotProjection?: AssetProjection;
  sharedDepotProjection?: AssetProjection;
  depotBirthYear?: number;
  sharedDepotBirthYear?: number;
  depotProjections?: CombinedWealthDepotProjection[];
  pension?: CombinedWealthPensionInput;
  realEstateYears: RealEstateFinancingYear[];
  toggles: CombinedWealthToggles;
}

export function buildCombinedWealthSeries(input: BuildCombinedWealthSeriesInput): CombinedWealthYear[] {
  const years: CombinedWealthYear[] = [];
  const realEstateByYear = new Map<number, RealEstateFinancingYear>(
    input.realEstateYears.map((entry) => [entry.year, entry])
  );
  const depotInputs = combinedDepotInputs(input);
  const depotMaps = depotInputs.map((depot) => ({
    ...depot,
    valuesByYear: projectionValueByYear(depot.projection, depot.birthYear, "netBalance"),
    taxByYear: projectionValueByYear(depot.projection, depot.birthYear, "periodTax")
  }));

  let withdrawalImpact = 0;
  let redirectedCashRepayment = 0;
  let redirectedDepotRepayment = 0;
  let depotCashDrawdown = 0;
  let cumulativeCashValue = input.cashStartValue;
  let cumulativePensionConsumed = 0;
  let cumulativePensionSavings = 0;
  let cumulativeTaxValue = 0;
  let cumulativePropertyPrincipalPaid = 0;
  const realEstateStartValue = realEstateStartValueForInput(input);
  const realEstateEquityCapital = realEstateEquityCapitalForInput(input, realEstateStartValue);

  for (let yearOffset = 0; yearOffset < input.horizonYears; yearOffset += 1) {
    const year = input.startYear + yearOffset;
    if (yearOffset > 0) {
      cumulativeCashValue = roundMoney(cumulativeCashValue + cashDeltaForYearOffset(input, yearOffset));
    }
    const realEstate = realEstateByYear.get(year);
    const realEstateSaleActive = realEstateSaleActiveForYear(input, realEstate, year);
    const realEstateSaleProceeds = realEstateSaleActive ? realEstateSaleProceedsForYear(input, realEstate) : 0;
    if (realEstateSaleProceeds !== 0) {
      cumulativeCashValue = roundMoney(cumulativeCashValue + realEstateSaleProceeds);
    }
    const realEstateActiveForYear = input.toggles.includeRealEstateFinancing && !realEstateSoldByYear(input, year);
    const allocation = realEstateActiveForYear ? realEstate?.additionalRepaymentBreakdown : undefined;
    redirectedCashRepayment = roundMoney(
      redirectedCashRepayment + (allocation?.withdrawalGain ?? 0) + (allocation?.legacySavingsRate ?? 0) + (allocation?.netGain ?? 0)
    );
    redirectedDepotRepayment = roundMoney(redirectedDepotRepayment + (allocation?.depotSavingsRate ?? 0));
    if (realEstateActiveForYear && realEstate) {
      cumulativePropertyPrincipalPaid = roundMoney(
        cumulativePropertyPrincipalPaid + realEstatePrincipalPaidForYear(realEstate)
      );
    }

    const rawCashValue = input.toggles.includeCashPositions
      ? roundMoney(cumulativeCashValue - redirectedCashRepayment)
      : 0;
    const standardDepotBeforeCashDrawdown = roundMoney(
      (depotMaps[depotRepaymentTargetIndex(depotMaps)]?.valuesByYear.get(year) ?? 0) -
        redirectedDepotRepayment -
        depotCashDrawdown
    );
    const cashDeficit = Math.max(0, -rawCashValue);
    const cashDrawdown = input.toggles.includeDepotDevelopment && depotMaps.length > 0
      ? roundMoney(Math.min(cashDeficit, Math.max(0, standardDepotBeforeCashDrawdown)))
      : 0;
    depotCashDrawdown = roundMoney(depotCashDrawdown + cashDrawdown);
    const cashValue = input.toggles.includeCashPositions ? roundMoney(rawCashValue + cashDrawdown) : 0;
    if (input.toggles.includeCashPositions && cashDrawdown > 0) {
      cumulativeCashValue = roundMoney(cumulativeCashValue + cashDrawdown);
    }

    const repaymentTargetIndex = depotRepaymentTargetIndex(depotMaps);
    const depotBreakdown = input.toggles.includeDepotDevelopment
      ? depotMaps.map((depot, index) => {
          const redirectedRepayment = index === repaymentTargetIndex ? redirectedDepotRepayment : 0;
          const cashDrawdownForDepot = index === repaymentTargetIndex ? depotCashDrawdown : 0;
          return {
            id: depot.id,
            label: depot.label,
            value: roundMoney((depot.valuesByYear.get(year) ?? 0) - redirectedRepayment - cashDrawdownForDepot)
          };
        })
      : [];
    const depotValue = roundMoney(depotBreakdown.reduce((sum, depot) => sum + depot.value, 0));

    if (input.toggles.includeWithdrawals && (input.depotProjection || depotInputs[0]?.projection)) {
      withdrawalImpact = roundMoney(
        withdrawalImpact +
          yearlyWithdrawalImpactForYear(
            input.depotProjection ?? depotInputs[0]?.projection,
            input.depotBirthYear ?? depotInputs[0]?.birthYear ?? input.startYear,
            year
          )
      );
    } else {
      withdrawalImpact = 0;
    }

    const pensionIncome = annualPensionIncomeForYear(input.pension, year);
    const pensionSaved = roundMoney((pensionIncome * pensionSavingsRate(input.pension)) / 100);
    const pensionConsumed = roundMoney(Math.max(0, pensionIncome - pensionSaved));
    cumulativePensionConsumed = roundMoney(cumulativePensionConsumed + pensionConsumed);
    cumulativePensionSavings = roundMoney(cumulativePensionSavings + pensionSaved);

    const depotTaxValue = input.toggles.includeDepotDevelopment
      ? roundMoney(depotMaps.reduce((sum, depot) => sum + (depot.taxByYear.get(year) ?? 0), 0))
      : 0;
    const pensionTaxValue = annualPensionTaxForYear(input.pension, year);
    const taxValue = roundMoney(depotTaxValue + pensionTaxValue);
    cumulativeTaxValue = roundMoney(cumulativeTaxValue + taxValue);

    const propertyValue =
      realEstateActiveForYear && (input.toggles.includeRealEstateValueTrend || input.toggles.includeRealEstateFinancing)
        ? roundMoney(realEstate?.propertyValue ?? 0)
        : 0;
    const propertyDebt = realEstateActiveForYear ? roundMoney(realEstate?.loanEnd ?? 0) : 0;
    const propertyLoanStart = realEstateActiveForYear ? roundMoney(realEstate?.loanStart ?? 0) : 0;
    const propertyEquity = roundMoney(propertyValue - propertyDebt);
    const propertyAssetValue =
      realEstateActiveForYear && realEstate
        ? bookedPropertyAssetValue({
            propertyValue,
            startValue: realEstateStartValue,
            equityCapital: realEstateEquityCapital,
            cumulativePrincipalPaid: cumulativePropertyPrincipalPaid
          })
        : 0;

    const totalGrossAssets = roundMoney(
      Math.max(0, cashValue) + Math.max(0, depotValue) + Math.max(0, propertyValue) + Math.max(0, cumulativePensionSavings)
    );
    const totalDebt = roundMoney(Math.max(0, propertyDebt));
    const totalNetWealth = roundMoney(
      cashValue + depotValue + propertyAssetValue + withdrawalImpact + cumulativePensionSavings
    );

    years.push({
      year,
      cashValue,
      depotValue,
      depotBreakdown,
      withdrawalImpact,
      redirectedCashRepayment,
      redirectedDepotRepayment,
      pensionIncome,
      pensionConsumed,
      pensionConsumedValue: cumulativePensionConsumed,
      pensionSaved,
      pensionSavingsValue: cumulativePensionSavings,
      depotTaxValue,
      pensionTaxValue,
      taxValue,
      cumulativeTaxValue,
      propertyValue,
      propertyDebt,
      propertyLoanStart,
      propertyEquity,
      propertyAssetValue,
      totalGrossAssets,
      totalDebt,
      totalNetWealth
    });
  }

  return years;
}

export function combinedWealthHorizonYears(
  startYear: number,
  standardEndYear: number,
  retirementEndYear: number,
  planningEndYear?: number
): number {
  const rawEndYear = Math.max(startYear, standardEndYear, retirementEndYear);
  const endYear = Number.isFinite(planningEndYear)
    ? Math.min(rawEndYear, Math.max(startYear, Math.round(planningEndYear as number)))
    : rawEndYear;
  return Math.max(1, Math.round(endYear - startYear + 1));
}

function cashDeltaForYearOffset(input: BuildCombinedWealthSeriesInput, yearOffset: number): number {
  const value = input.yearlyCashDeltas?.[yearOffset] ?? input.yearlyCashDelta;
  return Number.isFinite(value) ? roundMoney(value) : 0;
}

function realEstateStartValueForInput(input: BuildCombinedWealthSeriesInput): number {
  if (Number.isFinite(input.realEstateStartValue) && (input.realEstateStartValue ?? 0) > 0) {
    return roundMoney(Math.max(0, input.realEstateStartValue ?? 0));
  }
  return roundMoney(firstRealEstateYear(input)?.propertyValue ?? 0);
}

function realEstateEquityCapitalForInput(input: BuildCombinedWealthSeriesInput, startValue: number): number {
  if (Number.isFinite(input.realEstateEquityCapital) && (input.realEstateEquityCapital ?? 0) > 0) {
    return roundMoney(Math.max(0, input.realEstateEquityCapital ?? 0));
  }
  const firstYear = firstRealEstateYear(input);
  if (!firstYear) return 0;
  return roundMoney(Math.min(Math.max(0, startValue), Math.max(0, firstYear.propertyValue - firstYear.loanStart)));
}

function firstRealEstateYear(input: BuildCombinedWealthSeriesInput): RealEstateFinancingYear | undefined {
  return input.realEstateYears.find((entry) => entry.propertyValue > 0 || entry.loanStart > 0 || entry.loanEnd > 0);
}

function realEstatePrincipalPaidForYear(year: RealEstateFinancingYear): number {
  const reportedPrincipal = Math.max(0, year.principalPaid);
  if (reportedPrincipal > 0) return roundMoney(reportedPrincipal);
  return roundMoney(Math.max(0, year.loanStart - year.loanEnd));
}

function bookedPropertyAssetValue(input: {
  propertyValue: number;
  startValue: number;
  equityCapital: number;
  cumulativePrincipalPaid: number;
}): number {
  const startValue = Math.max(0, input.startValue);
  const bookedBaseValue = Math.min(
    startValue,
    Math.max(0, input.equityCapital) + Math.max(0, input.cumulativePrincipalPaid)
  );
  const propertyValueGrowth = Math.max(0, input.propertyValue - startValue);
  return roundMoney(bookedBaseValue + propertyValueGrowth);
}

function combinedDepotInputs(input: BuildCombinedWealthSeriesInput): CombinedWealthDepotProjection[] {
  if (input.depotProjections?.length) return input.depotProjections;
  const depots: CombinedWealthDepotProjection[] = [];
  if (input.depotProjection) {
    depots.push({
      id: "standard",
      label: "Depot",
      projection: input.depotProjection,
      birthYear: input.depotBirthYear ?? input.startYear
    });
  }
  if (input.sharedDepotProjection && input.toggles.includeSharedDepotDevelopment) {
    depots.push({
      id: "retirement",
      label: "Altersvorsorgedepot",
      projection: input.sharedDepotProjection,
      birthYear: input.sharedDepotBirthYear ?? input.depotBirthYear ?? input.startYear
    });
  }
  return depots;
}

function depotRepaymentTargetIndex(depots: Array<{ id: CombinedWealthDepotKey }>): number {
  const standardIndex = depots.findIndex((depot) => depot.id === "standard");
  return standardIndex >= 0 ? standardIndex : 0;
}

function projectionValueByYear(
  projection: AssetProjection,
  birthYear: number,
  field: "netBalance" | "periodTax"
): Map<number, number> {
  const map = new Map<number, number>();
  for (const point of projection.points) {
    const year = birthYear + point.age;
    map.set(year, point[field]);
  }
  return map;
}

function yearlyWithdrawalImpactForYear(projection: AssetProjection | undefined, birthYear: number, year: number): number {
  if (!projection) return 0;
  const payoutStartYear = birthYear + projection.retirementAge + 1;
  if (year < payoutStartYear || projection.monthlyPension <= 0) return 0;
  return roundMoney(-projection.monthlyPension * 12);
}

function annualPensionIncomeForYear(pension: CombinedWealthPensionInput | undefined, year: number): number {
  if (!pension?.enabled) return 0;
  if (!Number.isFinite(pension.retirementYear) || year < Math.round(pension.retirementYear)) return 0;
  return roundMoney(Math.max(0, pension.monthlyAmount) * 12);
}

function annualPensionTaxForYear(pension: CombinedWealthPensionInput | undefined, year: number): number {
  if (!pension?.enabled) return 0;
  if (!Number.isFinite(pension.retirementYear) || year < Math.round(pension.retirementYear)) return 0;
  return roundMoney(Math.max(0, pension.annualTax));
}

function pensionSavingsRate(pension: CombinedWealthPensionInput | undefined): number {
  if (!pension?.enabled) return 0;
  return Math.max(0, Math.min(100, pension.savingsRatePercent));
}

function realEstateSaleActiveForYear(
  input: BuildCombinedWealthSeriesInput,
  realEstate: RealEstateFinancingYear | undefined,
  year: number
): realEstate is RealEstateFinancingYear {
  if (!input.toggles.includeRealEstateFinancing || !realEstate) return false;
  if (input.realEstateSaleYear === null || input.realEstateSaleYear === undefined) return false;
  return year === Math.round(input.realEstateSaleYear);
}

function realEstateSoldByYear(input: BuildCombinedWealthSeriesInput, year: number): boolean {
  if (!input.toggles.includeRealEstateFinancing) return false;
  if (input.realEstateSaleYear === null || input.realEstateSaleYear === undefined) return false;
  return year >= Math.round(input.realEstateSaleYear);
}

function realEstateSaleProceedsForYear(
  input: BuildCombinedWealthSeriesInput,
  realEstate: RealEstateFinancingYear
): number {
  const saleValue =
    input.realEstateEstimatedSaleValue !== null &&
    input.realEstateEstimatedSaleValue !== undefined &&
    Number.isFinite(input.realEstateEstimatedSaleValue)
      ? Math.max(0, input.realEstateEstimatedSaleValue)
      : Math.max(0, realEstate.propertyValue);
  return roundMoney(saleValue - Math.max(0, realEstate.loanEnd));
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
