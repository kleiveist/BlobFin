import { annuityPayment } from "./investmentCalculator";
import { selectedMonthlyPattern } from "./investmentContributions";
import type { AssetProjection, AssetProjectionPoint, InvestmentSettings, ReservePosition } from "../types";

interface SavingSnapshot {
  grossBalance: number;
  costBasis: number;
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
  const monthlyPension = solveNetMonthlyPension(
    retirementSnapshot,
    monthlyReturn,
    settings,
    retirementAge,
    endAge,
    payoutMonths
  );
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
    retirementSnapshot
  );
  const percentageWithdrawalMonthlyAtStart = netPercentageWithdrawalAtStart(percentageBase, settings);
  const percentageWithdrawalAnnualAtStart = percentageWithdrawalMonthlyAtStart * 12;

  const points: AssetProjectionPoint[] = [];
  let previousTax = 0;

  for (let age = startAge; age <= endAge; age += 1) {
    const snapshot = snapshotAtAge(
      monthlyPattern,
      monthlyReturn,
      monthlyPension,
      settings,
      ageToday,
      retirementAge,
      age,
      retirementSnapshot
    );
    points.push(pointFromSnapshot(age, age > retirementAge ? "payout" : "saving", snapshot, previousTax));
    previousTax = snapshot.tax;
  }
  const finalPoint = points[points.length - 1];

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
    taxAtEnd: finalPoint?.tax ?? retirementSnapshot.tax,
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
  retirementSnapshot: SavingSnapshot
): SavingSnapshot {
  if (targetAge <= retirementAge) {
    return savingSnapshot(monthlyPattern, monthlyReturn, settings, ageToday, targetAge);
  }

  return payoutSnapshot(
    retirementSnapshot,
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
  let costBasis = 0;
  let contribution = 0;
  let withdrawals = 0;
  let tax = 0;
  const months = Math.max(0, Math.round((targetAge - ageToday) * 12));

  for (let index = 0; index < months; index += 1) {
    const ageAtMonth = ageToday + index / 12;
    const monthlyContribution = monthlyPattern[index % 12] || 0;
    grossBalance = grossBalance * (1 + monthlyReturn) + monthlyContribution;
    costBasis += monthlyContribution;
    contribution += monthlyContribution;
    if (ageAtMonth >= settings.percentageWithdrawalStartAge) {
      const withdrawal = grossBalance * (settings.percentageWithdrawalRatePercent / 100) / 12;
      const result = applyGrossWithdrawal(grossBalance, costBasis, withdrawal, settings);
      grossBalance = result.grossBalance;
      costBasis = result.costBasis;
      withdrawals += result.netWithdrawal;
      tax += result.tax;
    }
  }

  return completeSnapshot(grossBalance, costBasis, contribution, withdrawals, tax, settings, ageToday, targetAge);
}

function payoutSnapshot(
  startSnapshot: SavingSnapshot,
  monthlyReturn: number,
  monthlyPension: number,
  settings: InvestmentSettings,
  ageToday: number,
  retirementAge: number,
  targetAge: number
): SavingSnapshot {
  let grossBalance = startSnapshot.grossBalance;
  let costBasis = startSnapshot.costBasis;
  let withdrawals = 0;
  let tax = startSnapshot.tax;
  const months = Math.max(0, Math.round((targetAge - retirementAge) * 12));

  for (let index = 0; index < months; index += 1) {
    const ageAtMonth = retirementAge + index / 12;
    grossBalance *= 1 + monthlyReturn;
    if (ageAtMonth >= settings.percentageWithdrawalStartAge) {
      const percentageWithdrawal = grossBalance * (settings.percentageWithdrawalRatePercent / 100) / 12;
      const result = applyGrossWithdrawal(grossBalance, costBasis, percentageWithdrawal, settings);
      grossBalance = result.grossBalance;
      costBasis = result.costBasis;
      withdrawals += result.netWithdrawal;
      tax += result.tax;
    }
    const result = applyNetWithdrawal(grossBalance, costBasis, monthlyPension, settings);
    grossBalance = result.grossBalance;
    costBasis = result.costBasis;
    withdrawals += result.netWithdrawal;
    tax += result.tax;
  }

  return completeSnapshot(grossBalance, costBasis, startSnapshot.contribution, withdrawals, tax, settings, ageToday, targetAge);
}

function completeSnapshot(
  grossBalance: number,
  costBasis: number,
  contribution: number,
  withdrawals: number,
  tax: number,
  settings: InvestmentSettings,
  ageToday: number,
  targetAge: number
): SavingSnapshot {
  const growth = Math.max(0, grossBalance - costBasis);
  const netBalance = Math.max(0, grossBalance);
  const yearsFromNow = Math.max(0, targetAge - ageToday);
  const inflationFactor = (1 + settings.inflationRatePercent / 100) ** yearsFromNow;
  const realNetBalance = inflationFactor > 0 ? netBalance / inflationFactor : netBalance;

  return { grossBalance, costBasis, contribution, withdrawals, growth, tax, netBalance, realNetBalance, inflationFactor };
}

function applyGrossWithdrawal(
  grossBalance: number,
  costBasis: number,
  requestedWithdrawal: number,
  settings: InvestmentSettings
): { grossBalance: number; costBasis: number; netWithdrawal: number; tax: number } {
  const grossWithdrawal = Math.min(Math.max(0, requestedWithdrawal), Math.max(0, grossBalance));
  if (grossWithdrawal <= 0 || grossBalance <= 0) {
    return { grossBalance, costBasis, netWithdrawal: 0, tax: 0 };
  }

  const growth = Math.max(0, grossBalance - costBasis);
  const gainShare = growth > 0 ? growth / grossBalance : 0;
  const taxableGain = grossWithdrawal * gainShare;
  const tax = taxableGain * (settings.capitalGainsTaxPercent / 100);
  const basisReduction = grossWithdrawal - taxableGain;
  return {
    grossBalance: Math.max(0, grossBalance - grossWithdrawal),
    costBasis: Math.max(0, costBasis - basisReduction),
    netWithdrawal: Math.max(0, grossWithdrawal - tax),
    tax
  };
}

function applyNetWithdrawal(
  grossBalance: number,
  costBasis: number,
  requestedNetWithdrawal: number,
  settings: InvestmentSettings
): { grossBalance: number; costBasis: number; netWithdrawal: number; tax: number } {
  if (requestedNetWithdrawal <= 0 || grossBalance <= 0) {
    return { grossBalance, costBasis, netWithdrawal: 0, tax: 0 };
  }
  const growth = Math.max(0, grossBalance - costBasis);
  const gainShare = growth > 0 ? growth / grossBalance : 0;
  const taxDrag = gainShare * (settings.capitalGainsTaxPercent / 100);
  const grossWithdrawal = requestedNetWithdrawal / Math.max(0.0001, 1 - taxDrag);
  return applyGrossWithdrawal(grossBalance, costBasis, grossWithdrawal, settings);
}

function solveNetMonthlyPension(
  startSnapshot: SavingSnapshot,
  monthlyReturn: number,
  settings: InvestmentSettings,
  retirementAge: number,
  endAge: number,
  payoutMonths: number
): number {
  const grossMonthlyPension = annuityPayment(startSnapshot.grossBalance, monthlyReturn, payoutMonths);
  let low = 0;
  let high = grossMonthlyPension;

  for (let index = 0; index < 48; index += 1) {
    const candidate = (low + high) / 2;
    const snapshot = payoutSnapshot(startSnapshot, monthlyReturn, candidate, settings, retirementAge, retirementAge, endAge);
    if (snapshot.grossBalance > 1) low = candidate;
    else high = candidate;
  }

  return low;
}

function netPercentageWithdrawalAtStart(snapshot: SavingSnapshot, settings: InvestmentSettings): number {
  const grossWithdrawal = snapshot.grossBalance * (settings.percentageWithdrawalRatePercent / 100) / 12;
  return applyGrossWithdrawal(snapshot.grossBalance, snapshot.costBasis, grossWithdrawal, settings).netWithdrawal;
}

function pointFromSnapshot(
  age: number,
  phase: AssetProjectionPoint["phase"],
  snapshot: SavingSnapshot,
  previousTax: number
): AssetProjectionPoint {
  return {
    age,
    phase,
    grossBalance: snapshot.grossBalance,
    contribution: snapshot.contribution,
    costBasis: snapshot.costBasis,
    allowance: 0,
    growth: snapshot.growth,
    tax: snapshot.tax,
    periodTax: Math.max(0, snapshot.tax - previousTax),
    netBalance: snapshot.netBalance,
    realNetBalance: snapshot.realNetBalance,
    normalDepot: snapshot.realNetBalance
  };
}
