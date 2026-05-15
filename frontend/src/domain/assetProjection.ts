import { annuityPayment } from "./investmentCalculator";
import { selectedMonthlyPattern } from "./investmentContributions";
import type { AssetProjection, AssetProjectionPoint, InvestmentSettings, ReservePosition } from "../types";

interface SavingSnapshot {
  grossBalance: number;
  contribution: number;
  withdrawals: number;
  growth: number;
  tax: number;
  netBalance: number;
  realNetBalance: number;
  inflationFactor: number;
}

export function payoutStartAge(settings: InvestmentSettings): number {
  return Math.max(0, settings.payoutEndAge - settings.payoutYears);
}

export function buildAssetProjection(
  year: number,
  positions: ReservePosition[],
  settings: InvestmentSettings
): AssetProjection {
  const ageToday = Math.max(0, year - settings.birthYear);
  const retirementAge = payoutStartAge(settings);
  const startAge = Math.min(settings.chartStartAge, retirementAge);
  const endAge = Math.max(settings.payoutEndAge, retirementAge + 1);
  const monthlyPattern = selectedMonthlyPattern(positions, settings);
  const monthlyRate = monthlyPattern.reduce((sum, value) => sum + value, 0) / 12;
  const annualSavingsRate = monthlyRate * 12;
  const annualReturn = settings.investmentReturnPercent / 100;
  const monthlyReturn = (1 + annualReturn) ** (1 / 12) - 1;
  const retirementSnapshot = savingSnapshot(monthlyPattern, monthlyReturn, settings, ageToday, retirementAge);
  const payoutMonths = Math.max(1, Math.round((endAge - retirementAge) * 12));
  const monthlyPension = annuityPayment(retirementSnapshot.netBalance, monthlyReturn, payoutMonths);
  const realMonthlyPension =
    retirementSnapshot.inflationFactor > 0 ? monthlyPension / retirementSnapshot.inflationFactor : monthlyPension;
  const percentageBase = snapshotAtAge(
    monthlyPattern,
    monthlyReturn,
    monthlyPension,
    settings,
    ageToday,
    retirementAge,
    Math.max(settings.percentageWithdrawalStartAge, ageToday),
    retirementSnapshot.netBalance
  );
  const percentageWithdrawalMonthlyAtStart =
    percentageBase.netBalance * (settings.percentageWithdrawalRatePercent / 100) / 12;
  const percentageWithdrawalAnnualAtStart = percentageWithdrawalMonthlyAtStart * 12;

  const points: AssetProjectionPoint[] = [];

  for (let age = startAge; age <= endAge; age += 1) {
    const snapshot = snapshotAtAge(
      monthlyPattern,
      monthlyReturn,
      monthlyPension,
      settings,
      ageToday,
      retirementAge,
      age,
      retirementSnapshot.netBalance
    );
    points.push(pointFromSnapshot(age, age > retirementAge ? "payout" : "saving", snapshot));
  }

  return {
    points,
    monthlyRate,
    annualSavingsRate,
    monthlyPension,
    realMonthlyPension,
    percentageWithdrawalMonthlyAtStart,
    percentageWithdrawalAnnualAtStart,
    withdrawalGainMonthlyAtStart: percentageWithdrawalMonthlyAtStart,
    percentageWithdrawalStartAge: settings.percentageWithdrawalStartAge,
    percentageWithdrawalRatePercent: settings.percentageWithdrawalRatePercent,
    retirementAge,
    endAge,
    ageToday,
    savingMonths: Math.max(0, Math.round((retirementAge - ageToday) * 12)),
    totalContribution: retirementSnapshot.contribution,
    grossWealthAtRetirement: retirementSnapshot.grossBalance,
    growthAtRetirement: retirementSnapshot.growth,
    taxAtRetirement: retirementSnapshot.tax,
    inflationFactorAtRetirement: retirementSnapshot.inflationFactor,
    wealthAtRetirement: retirementSnapshot.netBalance,
    realWealthAtRetirement: retirementSnapshot.realNetBalance
  };
}

function snapshotAtAge(
  monthlyPattern: number[],
  monthlyReturn: number,
  monthlyPension: number,
  settings: InvestmentSettings,
  ageToday: number,
  retirementAge: number,
  targetAge: number,
  retirementNetBalance: number
): SavingSnapshot {
  if (targetAge <= retirementAge) {
    return savingSnapshot(monthlyPattern, monthlyReturn, settings, ageToday, targetAge);
  }

  return payoutSnapshot(
    retirementNetBalance,
    monthlyReturn,
    monthlyPension,
    settings,
    ageToday,
    retirementAge,
    targetAge
  );
}

function savingSnapshot(
  monthlyPattern: number[],
  monthlyReturn: number,
  settings: InvestmentSettings,
  ageToday: number,
  targetAge: number
): SavingSnapshot {
  let grossBalance = 0;
  let contribution = 0;
  let withdrawals = 0;
  const months = Math.max(0, Math.round((targetAge - ageToday) * 12));

  for (let index = 0; index < months; index += 1) {
    const ageAtMonth = ageToday + index / 12;
    const monthlyContribution = monthlyPattern[index % 12] || 0;
    grossBalance = grossBalance * (1 + monthlyReturn) + monthlyContribution;
    contribution += monthlyContribution;
    if (ageAtMonth >= settings.percentageWithdrawalStartAge) {
      const withdrawal = grossBalance * (settings.percentageWithdrawalRatePercent / 100) / 12;
      grossBalance = Math.max(0, grossBalance - withdrawal);
      withdrawals += withdrawal;
    }
  }

  return completeSnapshot(grossBalance, contribution, withdrawals, settings, ageToday, targetAge);
}

function payoutSnapshot(
  startBalance: number,
  monthlyReturn: number,
  monthlyPension: number,
  settings: InvestmentSettings,
  ageToday: number,
  retirementAge: number,
  targetAge: number
): SavingSnapshot {
  let grossBalance = startBalance;
  let withdrawals = 0;
  const months = Math.max(0, Math.round((targetAge - retirementAge) * 12));

  for (let index = 0; index < months; index += 1) {
    const ageAtMonth = retirementAge + index / 12;
    grossBalance *= 1 + monthlyReturn;
    if (ageAtMonth >= settings.percentageWithdrawalStartAge) {
      const percentageWithdrawal = grossBalance * (settings.percentageWithdrawalRatePercent / 100) / 12;
      grossBalance = Math.max(0, grossBalance - percentageWithdrawal);
      withdrawals += percentageWithdrawal;
    }
    grossBalance = Math.max(0, grossBalance - monthlyPension);
    withdrawals += monthlyPension;
  }

  return completePostTaxSnapshot(grossBalance, withdrawals, settings, ageToday, targetAge);
}

function completeSnapshot(
  grossBalance: number,
  contribution: number,
  withdrawals: number,
  settings: InvestmentSettings,
  ageToday: number,
  targetAge: number
): SavingSnapshot {
  const growth = Math.max(0, grossBalance - contribution);
  const tax = growth * (settings.capitalGainsTaxPercent / 100);
  const netBalance = Math.max(0, grossBalance - tax);
  const yearsFromNow = Math.max(0, targetAge - ageToday);
  const inflationFactor = (1 + settings.inflationRatePercent / 100) ** yearsFromNow;
  const realNetBalance = inflationFactor > 0 ? netBalance / inflationFactor : netBalance;

  return { grossBalance, contribution, withdrawals, growth, tax, netBalance, realNetBalance, inflationFactor };
}

function completePostTaxSnapshot(
  grossBalance: number,
  withdrawals: number,
  settings: InvestmentSettings,
  ageToday: number,
  targetAge: number
): SavingSnapshot {
  const yearsFromNow = Math.max(0, targetAge - ageToday);
  const inflationFactor = (1 + settings.inflationRatePercent / 100) ** yearsFromNow;
  const realNetBalance = inflationFactor > 0 ? grossBalance / inflationFactor : grossBalance;

  return {
    grossBalance,
    contribution: 0,
    withdrawals,
    growth: 0,
    tax: 0,
    netBalance: grossBalance,
    realNetBalance,
    inflationFactor
  };
}

function pointFromSnapshot(
  age: number,
  phase: AssetProjectionPoint["phase"],
  snapshot: SavingSnapshot
): AssetProjectionPoint {
  return {
    age,
    phase,
    grossBalance: snapshot.grossBalance,
    contribution: snapshot.contribution,
    allowance: 0,
    growth: snapshot.growth,
    netBalance: snapshot.netBalance,
    realNetBalance: snapshot.realNetBalance,
    normalDepot: snapshot.realNetBalance
  };
}
