import type {
  AdditionalRepaymentYearBreakdown,
  RealEstateFinancingMonth,
  RealEstateFinancingResult,
  RealEstateFinancingSettings,
  RealEstateFinancingSourceSchedule,
  RealEstateFinancingYear,
} from "../types";

const MAX_FINANCING_YEARS = 80;

export interface RealEstateFinancingCalculationOptions {
  financingYears?: number;
  projectionYears?: number;
}

export function validateRealEstateSettings(settings: RealEstateFinancingSettings): string[] {
  const errors: string[] = [];
  if (settings.purchasePrice <= 0) errors.push("Kaufpreis muss groesser als 0 sein.");
  if (settings.interestRatePercent < 0) errors.push("Zinssatz darf nicht negativ sein.");
  if (settings.propertyValueGrowthPercent < 0) errors.push("Immobilienwertsteigerung darf nicht negativ sein.");
  if (settings.financingStartAge < 0) errors.push("Finanzierung ab Alter darf nicht negativ sein.");
  if (settings.financingEndAge <= 0) errors.push("Bezahlt bis Alter muss groesser als 0 sein.");
  if (settings.financingStartAge > 0 && settings.financingEndAge <= settings.financingStartAge) {
    errors.push("Bezahlt bis Alter muss nach dem Finanzierungsstart liegen.");
  }
  return errors;
}

export function totalProjectCost(settings: RealEstateFinancingSettings): number {
  return roundMoney(
    settings.purchasePrice +
      settings.constructionOrRenovationCosts +
      settings.landCosts +
      settings.additionalPurchaseCosts +
      settings.notaryCosts +
      settings.landRegistryCosts +
      settings.brokerCosts +
      settings.transferTax +
      settings.modernizationReserve +
      settings.movingAndSetupCosts +
      settings.safetyBuffer
  );
}

export function deriveLoanAmount(settings: RealEstateFinancingSettings, equityCapital = 0): number {
  return roundMoney(Math.max(0, totalProjectCost(settings) - equityCapital));
}

export function deriveMonthlyPayment(settings: RealEstateFinancingSettings, loanAmount: number): number {
  if (settings.monthlyPayment > 0) return roundMoney(settings.monthlyPayment);
  const annualRatePercent = Math.max(0, settings.interestRatePercent + settings.initialRepaymentPercent);
  return roundMoney((loanAmount * annualRatePercent) / 100 / 12);
}

export function deriveRateLinkedMonthlyPayment(settings: RealEstateFinancingSettings): number {
  const loanAmount = deriveLoanAmount(settings);
  const annualRatePercent = Math.max(0, settings.interestRatePercent + settings.initialRepaymentPercent);
  return roundMoney((loanAmount * annualRatePercent) / 100 / 12);
}

export function deriveInitialRepaymentPercentFromMonthlyPayment(settings: RealEstateFinancingSettings): number {
  const loanAmount = deriveLoanAmount(settings);
  return deriveInitialRepaymentPercentFromPayment(settings, loanAmount, settings.monthlyPayment);
}

export function deriveInitialRepaymentPercentFromPayment(
  settings: RealEstateFinancingSettings,
  loanAmount: number,
  monthlyPayment: number
): number {
  if (loanAmount <= 0 || monthlyPayment <= 0) return 0;
  const totalAnnualRatePercent = (monthlyPayment * 12 / loanAmount) * 100;
  return roundMoney(Math.max(0, totalAnnualRatePercent - settings.interestRatePercent));
}

export function linkRealEstateFinancingInput(
  settings: RealEstateFinancingSettings,
  changedField: keyof RealEstateFinancingSettings
): RealEstateFinancingSettings {
  void changedField;
  return settings;
}

export function calculateRealEstateFinancing(
  startYear: number,
  settings: RealEstateFinancingSettings,
  sourceSchedule: RealEstateFinancingSourceSchedule = emptySourceSchedule(),
  options: RealEstateFinancingCalculationOptions = {}
): RealEstateFinancingResult {
  const validationErrors = validateRealEstateSettings(settings);
  const projectCost = totalProjectCost(settings);
  const equityCapital = roundMoney(Math.max(0, sourceSchedule.equityCapital));
  const loanAmount = deriveLoanAmount(settings, equityCapital);
  const financingYears = clampYears(options.financingYears ?? deriveFinancingYearsFromSettings(settings));
  const projectionYears = clampYears(Math.max(financingYears, options.projectionYears ?? financingYears));
  const monthlyRate = Math.max(0, settings.interestRatePercent) / 100 / 12;
  const growthRate = Math.max(0, settings.propertyValueGrowthPercent) / 100;
  const startPropertyValue = Math.max(0, settings.purchasePrice + settings.constructionOrRenovationCosts + settings.landCosts);
  const firstMonthlyPayment = sourceMonthlyPayment(sourceSchedule, 0);
  const firstYearSpecialRepayment = firstYearSourceTotal(sourceSchedule.specialRepayments);
  const derivedInitialRepaymentPercent = deriveInitialRepaymentPercentFromPayment(
    settings,
    loanAmount,
    firstMonthlyPayment
  );

  if (loanAmount > 0 && !hasAnyMonthlyPayment(sourceSchedule, financingYears * 12)) {
    validationErrors.push("Bitte mindestens eine Sparposition fuer die Monatsrate auswaehlen.");
  }

  const years: RealEstateFinancingYear[] = [];
  const months: RealEstateFinancingMonth[] = [];

  let remainingDebt = loanAmount;

  for (let yearIndex = 0; yearIndex < projectionYears; yearIndex += 1) {
    const year = startYear + yearIndex;
    const loanStart = roundMoney(remainingDebt);
    let interestPaidYear = 0;
    let interestDueYear = 0;
    let interestShortfallYear = 0;
    let monthlyPaymentFromSavingsYear = 0;
    let monthlyPaymentFromWithdrawalGainYear = 0;
    let monthlyPaymentAvailableYear = 0;
    let principalFromMonthlyPaymentYear = 0;
    let principalPaidYear = 0;
    let specialRepaymentYear = 0;
    let withdrawalGainPaymentUsedYear = 0;
    let depotSavingsRatePaymentUsedYear = 0;

    for (let month = 1; month <= 12; month += 1) {
      const scheduleIndex = yearIndex * 12 + month - 1;
      const monthLoanStart = roundMoney(remainingDebt);
      const activeFinancingMonth = scheduleIndex < financingYears * 12;

      if (remainingDebt <= 0) {
        months.push({
          year,
          month,
          loanStart: monthLoanStart,
          interestDue: 0,
          interestPaid: 0,
          interestShortfall: 0,
          monthlyPaymentFromSavings: 0,
          monthlyPaymentFromWithdrawalGain: 0,
          monthlyPaymentAvailable: 0,
          principalPaid: 0,
          specialRepayment: 0,
          additionalRepayment: 0,
          loanEnd: 0
        });
        remainingDebt = 0;
        continue;
      }

      const monthlyPaymentFromSavings = activeFinancingMonth ? sourceValue(sourceSchedule.monthlyPaymentSavings, scheduleIndex) : 0;
      const monthlyPaymentFromWithdrawalGain = activeFinancingMonth
        ? sourceValue(sourceSchedule.withdrawalGainPayments, scheduleIndex)
        : 0;
      const depotSavingsRatePayment = activeFinancingMonth
        ? sourceValue(sourceSchedule.depotSavingsRatePayments, scheduleIndex)
        : 0;
      const monthlyPaymentAvailable = roundMoney(
        monthlyPaymentFromSavings + monthlyPaymentFromWithdrawalGain + depotSavingsRatePayment
      );
      const interestDue = roundMoney(remainingDebt * monthlyRate);
      const maximumUsefulPayment = roundMoney(interestDue + remainingDebt);
      const usedMonthlyPayment = roundMoney(Math.min(monthlyPaymentAvailable, maximumUsefulPayment));
      let interestPaid = roundMoney(Math.min(usedMonthlyPayment, interestDue));
      let interestShortfall = roundMoney(Math.max(0, interestDue - interestPaid));
      const principalBudget = interestShortfall > 0 ? 0 : roundMoney(usedMonthlyPayment - interestPaid);
      const principalPaid = roundMoney(Math.min(Math.max(0, principalBudget), remainingDebt));
      remainingDebt = roundMoney(remainingDebt - principalPaid);
      const withdrawalShare =
        monthlyPaymentAvailable > 0 ? roundMoney(usedMonthlyPayment * (monthlyPaymentFromWithdrawalGain / monthlyPaymentAvailable)) : 0;
      const depotSavingsRateShare =
        monthlyPaymentAvailable > 0 ? roundMoney(usedMonthlyPayment * (depotSavingsRatePayment / monthlyPaymentAvailable)) : 0;

      const specialPaymentAvailable = activeFinancingMonth ? sourceValue(sourceSchedule.specialRepayments, scheduleIndex) : 0;
      const specialInterestPayment = roundMoney(Math.min(specialPaymentAvailable, interestShortfall));
      interestPaid = roundMoney(interestPaid + specialInterestPayment);
      interestShortfall = roundMoney(interestShortfall - specialInterestPayment);
      const specialPrincipalBudget = interestShortfall > 0 ? 0 : roundMoney(specialPaymentAvailable - specialInterestPayment);
      const specialRepayment = roundMoney(Math.min(specialPrincipalBudget, remainingDebt));
      remainingDebt = roundMoney(remainingDebt - specialRepayment);
      remainingDebt = roundMoney(remainingDebt + interestShortfall);

      interestDueYear += interestDue;
      interestPaidYear += interestPaid;
      interestShortfallYear += interestShortfall;
      monthlyPaymentFromSavingsYear += monthlyPaymentFromSavings;
      monthlyPaymentFromWithdrawalGainYear += monthlyPaymentFromWithdrawalGain;
      monthlyPaymentAvailableYear += monthlyPaymentAvailable;
      principalFromMonthlyPaymentYear += principalPaid;
      principalPaidYear += principalPaid + specialRepayment;
      specialRepaymentYear += specialRepayment;
      withdrawalGainPaymentUsedYear += withdrawalShare;
      depotSavingsRatePaymentUsedYear += depotSavingsRateShare;

      months.push({
        year,
        month,
        loanStart: monthLoanStart,
        interestDue,
        interestPaid,
        interestShortfall,
        monthlyPaymentFromSavings,
        monthlyPaymentFromWithdrawalGain,
        monthlyPaymentAvailable,
        principalPaid,
        specialRepayment,
        additionalRepayment: roundMoney(withdrawalShare + depotSavingsRateShare),
        loanEnd: roundMoney(remainingDebt)
      });
    }

    const propertyValue = projectedPropertyValue(startPropertyValue, growthRate, yearIndex + 1);
    const loanEnd = roundMoney(remainingDebt);
    const propertyEquity = roundMoney(propertyValue - loanEnd);
    const netPropertyWealth = roundMoney(propertyValue - loanEnd);

    years.push({
      year,
      propertyValue,
      loanStart,
      interestPaid: roundMoney(interestPaidYear),
      interestDue: roundMoney(interestDueYear),
      interestShortfall: roundMoney(interestShortfallYear),
      monthlyPaymentFromSavings: roundMoney(monthlyPaymentFromSavingsYear),
      monthlyPaymentFromWithdrawalGain: roundMoney(monthlyPaymentFromWithdrawalGainYear),
      monthlyPaymentAvailable: roundMoney(monthlyPaymentAvailableYear),
      principalFromMonthlyPayment: roundMoney(principalFromMonthlyPaymentYear),
      principalPaid: roundMoney(principalPaidYear),
      specialRepayment: roundMoney(specialRepaymentYear),
      additionalRepayment: roundMoney(withdrawalGainPaymentUsedYear + depotSavingsRatePaymentUsedYear),
      additionalRepaymentBreakdown: additionalRepaymentYearBreakdown(
        withdrawalGainPaymentUsedYear,
        depotSavingsRatePaymentUsedYear
      ),
      loanEnd,
      propertyEquity,
      netPropertyWealth
    });
  }

  const totalInterestDue = roundMoney(years.reduce((sum, entry) => sum + entry.interestDue, 0));
  const totalInterestPaid = roundMoney(years.reduce((sum, entry) => sum + entry.interestPaid, 0));
  const totalInterestShortfall = roundMoney(years.reduce((sum, entry) => sum + entry.interestShortfall, 0));
  if (totalInterestShortfall > 0) {
    validationErrors.push(
      `Die ausgewaehlten Zahlungsquellen decken die Zinsen nicht vollstaendig (${totalInterestShortfall.toFixed(2)} EUR fehlen).`
    );
  }

  return {
    years,
    months,
    startLoanAmount: loanAmount,
    equityCapital,
    monthlyPayment: roundMoney(firstMonthlyPayment),
    derivedInitialRepaymentPercent,
    annualSpecialRepayment: roundMoney(firstYearSpecialRepayment),
    effectivePropertyStartValue: startPropertyValue,
    totalProjectCost: projectCost,
    totalInterestDue,
    totalInterestPaid,
    totalInterestShortfall,
    totalLoanCost: roundMoney(loanAmount + totalInterestDue),
    financingYears,
    projectionYears,
    financingEndYear: startYear + financingYears,
    projectionEndYear: startYear + projectionYears - 1,
    validationErrors
  };
}

export function defaultRealEstateDetailYear(
  years: RealEstateFinancingYear[],
  selectedYear: number | null
): number | null {
  if (selectedYear !== null && years.some((entry) => entry.year === selectedYear)) return selectedYear;
  const firstActiveCreditYear = years.find((entry) => entry.loanStart > 0 || entry.loanEnd > 0 || entry.interestDue > 0);
  return firstActiveCreditYear?.year ?? years[0]?.year ?? null;
}

function additionalRepaymentYearBreakdown(withdrawalGain: number, depotSavingsRate: number): AdditionalRepaymentYearBreakdown {
  return {
    withdrawalGain: roundMoney(withdrawalGain),
    depotSavingsRate: roundMoney(depotSavingsRate),
    legacySavingsRate: 0,
    netGain: 0,
    totalAdditionalRepayment: roundMoney(withdrawalGain + depotSavingsRate)
  };
}

function emptySourceSchedule(): RealEstateFinancingSourceSchedule {
  return {
    equityCapital: 0,
    monthlyPaymentSavings: [],
    withdrawalGainPayments: [],
    specialRepayments: []
  };
}

function sourceMonthlyPayment(schedule: RealEstateFinancingSourceSchedule, index: number): number {
  return roundMoney(
    sourceValue(schedule.monthlyPaymentSavings, index) +
      sourceValue(schedule.withdrawalGainPayments, index) +
      sourceValue(schedule.depotSavingsRatePayments, index)
  );
}

function sourceValue(values: number[] | undefined, index: number): number {
  const value = values?.[index] ?? 0;
  return Number.isFinite(value) ? roundMoney(Math.max(0, value)) : 0;
}

function firstYearSourceTotal(values: number[] | undefined): number {
  let total = 0;
  for (let index = 0; index < 12; index += 1) {
    total += sourceValue(values, index);
  }
  return roundMoney(total);
}

function hasAnyMonthlyPayment(schedule: RealEstateFinancingSourceSchedule, monthCount: number): boolean {
  for (let index = 0; index < monthCount; index += 1) {
    if (sourceMonthlyPayment(schedule, index) > 0) return true;
  }
  return false;
}

function projectedPropertyValue(startPropertyValue: number, growthRate: number, yearIndex: number): number {
  return roundMoney(startPropertyValue * (1 + growthRate) ** yearIndex);
}

function deriveFinancingYearsFromSettings(settings: RealEstateFinancingSettings): number {
  if (settings.financingStartAge > 0 && settings.financingEndAge > settings.financingStartAge) {
    return settings.financingEndAge - settings.financingStartAge;
  }
  return settings.financingYears || settings.targetTermYears || 1;
}

function clampYears(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.max(1, Math.min(MAX_FINANCING_YEARS, Math.round(value)));
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
