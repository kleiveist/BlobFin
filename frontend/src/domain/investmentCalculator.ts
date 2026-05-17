import { selectedInvestmentContributionForProjectionMonth, selectedMonthlyPattern } from "./investmentContributions";
import { RETIREMENT_DEPOT_MIN_AGE, retirementDepotAllowanceForProjectionMonth } from "./retirementDepot";
import type { InvestmentResult, InvestmentSettings, ReservePosition } from "../types";

export function annuityPayment(presentValue: number, monthlyRate: number, monthsCount: number): number {
  if (monthsCount <= 0) return 0;
  if (monthlyRate <= 0) return presentValue / monthsCount;
  return (presentValue * monthlyRate) / (1 - (1 + monthlyRate) ** -monthsCount);
}

export function calculateInvestmentResult(
  year: number,
  positions: ReservePosition[],
  settings: InvestmentSettings
): InvestmentResult {
  const ageToday = Math.max(0, year - settings.birthYear);
  const payoutYears = Math.min(settings.payoutYears, settings.payoutEndAge);
  const rawPayoutStartAge = Math.max(0, settings.payoutEndAge - payoutYears);
  const payoutStartAge = settings.retirementDepotEnabled
    ? Math.max(RETIREMENT_DEPOT_MIN_AGE, rawPayoutStartAge)
    : rawPayoutStartAge;
  const effectivePayoutYears = Math.max(1, settings.payoutEndAge - payoutStartAge);
  const yearsUntilPayout = Math.max(0, payoutStartAge - ageToday);
  const savingMonths = Math.max(0, Math.round(yearsUntilPayout * 12));
  const payoutMonths = Math.max(1, Math.round(effectivePayoutYears * 12));

  const monthlyPattern = selectedMonthlyPattern(positions, settings, year);
  const averageMonthlyContribution = monthlyPattern.reduce((sum, value) => sum + value, 0) / 12;
  const annualReturn = settings.investmentReturnPercent / 100;
  const monthlyReturn = (1 + annualReturn) ** (1 / 12) - 1;
  let grossWealth = 0;
  let totalContribution = 0;
  let totalAllowance = 0;

  for (let index = 0; index < savingMonths; index += 1) {
    const contribution = selectedInvestmentContributionForProjectionMonth(positions, settings, year, index);
    const allowance = retirementDepotAllowanceForProjectionMonth(positions, settings, year, index);
    grossWealth = grossWealth * (1 + monthlyReturn) + contribution + allowance;
    totalContribution += contribution;
    totalAllowance += allowance;
  }

  const growth = Math.max(0, grossWealth - totalContribution - totalAllowance);
  const tax = growth * (settings.capitalGainsTaxPercent / 100);
  const netWealth = Math.max(0, grossWealth - tax);
  const inflationFactor = (1 + settings.inflationRatePercent / 100) ** yearsUntilPayout;
  const realWealth = inflationFactor > 0 ? netWealth / inflationFactor : netWealth;
  const monthlyPensionNet = annuityPayment(netWealth, monthlyReturn, payoutMonths);
  const realMonthlyPension = inflationFactor > 0 ? monthlyPensionNet / inflationFactor : monthlyPensionNet;

  return {
    ageToday,
    payoutStartAge,
    yearsUntilPayout,
    savingMonths,
    payoutMonths,
    averageMonthlyContribution,
    totalContribution,
    grossWealth,
    growth,
    tax,
    netWealth,
    inflationFactor,
    realWealth,
    monthlyPensionNet,
    realMonthlyPension
  };
}
