import type {
  AdditionalRepaymentYearBreakdown,
  RealEstateFinancingMonth,
  RealEstateFinancingResult,
  RealEstateFinancingSettings,
  RealEstateFinancingSourceSchedule,
  RealEstateFinancingYear,
} from "../types";

const MAX_FINANCING_YEARS = 80;

export function validateRealEstateSettings(settings: RealEstateFinancingSettings): string[] {
  const errors: string[] = [];
  if (settings.purchasePrice <= 0) errors.push("Kaufpreis muss groesser als 0 sein.");
  if (settings.interestRatePercent < 0) errors.push("Zinssatz darf nicht negativ sein.");
  if (settings.propertyValueGrowthPercent < 0) errors.push("Immobilienwertsteigerung darf nicht negativ sein.");
  if (settings.equityCapital < 0) errors.push("Eigenkapital darf nicht negativ sein.");
  if (settings.loanAmount < 0) errors.push("Darlehensbetrag darf nicht negativ sein.");
  if (settings.financingStartAge < 0) errors.push("Finanzierung ab Alter darf nicht negativ sein.");
  if (settings.financingYears <= 0 && settings.targetTermYears <= 0) {
    errors.push("Finanzierungszeitraum oder Ziel-Laufzeit muss groesser als 0 sein.");
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

export function deriveLoanAmount(settings: RealEstateFinancingSettings): number {
  if (settings.loanAmount > 0) return roundMoney(settings.loanAmount);
  return roundMoney(Math.max(0, totalProjectCost(settings) - settings.equityCapital));
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
  sourceSchedule: RealEstateFinancingSourceSchedule = emptySourceSchedule()
): RealEstateFinancingResult {
  const validationErrors = validateRealEstateSettings(settings);
  const projectCost = totalProjectCost(settings);
  const loanAmount = deriveLoanAmount(settings);
  const financingYears = clampYears(settings.financingYears || settings.targetTermYears || 0);
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

  for (let yearIndex = 0; yearIndex < financingYears; yearIndex += 1) {
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

    for (let month = 1; month <= 12; month += 1) {
      const scheduleIndex = yearIndex * 12 + month - 1;
      const monthLoanStart = roundMoney(remainingDebt);

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

      const monthlyPaymentFromSavings = sourceValue(sourceSchedule.monthlyPaymentSavings, scheduleIndex);
      const monthlyPaymentFromWithdrawalGain = sourceValue(sourceSchedule.withdrawalGainPayments, scheduleIndex);
      const monthlyPaymentAvailable = roundMoney(monthlyPaymentFromSavings + monthlyPaymentFromWithdrawalGain);
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

      const specialPaymentAvailable = sourceValue(sourceSchedule.specialRepayments, scheduleIndex);
      const specialInterestPayment = roundMoney(Math.min(specialPaymentAvailable, interestShortfall));
      interestPaid = roundMoney(interestPaid + specialInterestPayment);
      interestShortfall = roundMoney(interestShortfall - specialInterestPayment);
      const specialPrincipalBudget = interestShortfall > 0 ? 0 : roundMoney(specialPaymentAvailable - specialInterestPayment);
      const specialRepayment = roundMoney(Math.min(specialPrincipalBudget, remainingDebt));
      remainingDebt = roundMoney(remainingDebt - specialRepayment);

      interestDueYear += interestDue;
      interestPaidYear += interestPaid;
      interestShortfallYear += interestShortfall;
      monthlyPaymentFromSavingsYear += monthlyPaymentFromSavings;
      monthlyPaymentFromWithdrawalGainYear += monthlyPaymentFromWithdrawalGain;
      monthlyPaymentAvailableYear += monthlyPaymentAvailable;
      principalFromMonthlyPaymentYear += principalPaid;
      principalPaidYear += principalPaid;
      specialRepaymentYear += specialRepayment;
      withdrawalGainPaymentUsedYear += withdrawalShare;

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
        additionalRepayment: withdrawalShare,
        loanEnd: roundMoney(remainingDebt)
      });
    }

    const propertyValue = projectedPropertyValue(startPropertyValue, growthRate, yearIndex + 1);
    const loanEnd = roundMoney(remainingDebt);
    const propertyEquity = roundMoney(Math.max(0, propertyValue - loanEnd));
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
      additionalRepayment: roundMoney(withdrawalGainPaymentUsedYear),
      additionalRepaymentBreakdown: withdrawalGainYearBreakdown(withdrawalGainPaymentUsedYear),
      loanEnd,
      propertyEquity,
      netPropertyWealth
    });
  }

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
    monthlyPayment: roundMoney(firstMonthlyPayment),
    derivedInitialRepaymentPercent,
    annualSpecialRepayment: roundMoney(firstYearSpecialRepayment),
    effectivePropertyStartValue: startPropertyValue,
    totalProjectCost: projectCost,
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

function withdrawalGainYearBreakdown(withdrawalGain: number): AdditionalRepaymentYearBreakdown {
  return {
    withdrawalGain: roundMoney(withdrawalGain),
    depotSavingsRate: 0,
    legacySavingsRate: 0,
    netGain: 0,
    totalAdditionalRepayment: roundMoney(withdrawalGain)
  };
}

function emptySourceSchedule(): RealEstateFinancingSourceSchedule {
  return {
    monthlyPaymentSavings: [],
    withdrawalGainPayments: [],
    specialRepayments: []
  };
}

function sourceMonthlyPayment(schedule: RealEstateFinancingSourceSchedule, index: number): number {
  return roundMoney(sourceValue(schedule.monthlyPaymentSavings, index) + sourceValue(schedule.withdrawalGainPayments, index));
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

function clampYears(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.max(1, Math.min(MAX_FINANCING_YEARS, Math.round(value)));
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
