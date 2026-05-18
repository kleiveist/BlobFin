import { annuityPayment } from "./investmentCalculator";
import {
  selectedInvestmentContributionForProjectionMonth,
  selectedRecurringInvestmentContributionForProjectionYear,
  selectedOneTimeInvestmentContributionForProjectionMonth,
  selectedInvestmentStartYear
} from "./investmentContributions";
import {
  calculateRetirementDepotAllowance,
  RETIREMENT_DEPOT_MIN_AGE,
  retirementDepotAllowanceForProjectionMonth
} from "./retirementDepot";
import type { AssetProjection, AssetProjectionPoint, InvestmentSettings, ReservePosition } from "../types";

interface SavingSnapshot {
  grossBalance: number;
  costBasis: number;
  contribution: number;
  recurringContribution: number;
  oneTimeContribution: number;
  allowance: number;
  allowanceBasis: number;
  withdrawals: number;
  growth: number;
  tax: number;
  netBalance: number;
  realNetBalance: number;
  inflationFactor: number;
}

export function payoutStartAge(settings: InvestmentSettings): number {
  const rawAge = Math.max(0, settings.payoutEndAge - settings.payoutYears);
  return settings.retirementDepotEnabled ? Math.max(RETIREMENT_DEPOT_MIN_AGE, rawAge) : rawAge;
}

export function buildAssetProjection(
  year: number,
  positions: ReservePosition[],
  settings: InvestmentSettings
): AssetProjection {
  const ageToday = Math.max(0, year - settings.birthYear);
  const simulationStartYear = Math.max(
    settings.birthYear,
    Math.min(year, selectedInvestmentStartYear(positions, settings, year))
  );
  const simulationStartAge = Math.max(0, simulationStartYear - settings.birthYear);
  const retirementAge = payoutStartAge(settings);
  const startAge = Math.min(settings.chartStartAge, retirementAge);
  const hasPayoutPhase = settings.payoutYears > 0 && settings.payoutEndAge > retirementAge;
  const endAge = hasPayoutPhase ? Math.max(settings.payoutEndAge, retirementAge + 1) : retirementAge;
  const savingMonths = Math.max(0, Math.round((retirementAge - simulationStartAge) * 12));
  const contributionDisplayYearIndex = firstRecurringContributionYearIndex(
    positions,
    settings,
    simulationStartYear,
    savingMonths
  );
  const annualSavingsRate = selectedRecurringInvestmentContributionForProjectionYear(
    positions,
    settings,
    simulationStartYear,
    contributionDisplayYearIndex
  );
  const monthlyRate = annualSavingsRate / 12;
  const retirementDepotAnnualOwnContribution = annualSavingsRate;
  const retirementDepotAllowance = settings.retirementDepotEnabled
    ? calculateRetirementDepotAllowance(retirementDepotAnnualOwnContribution, settings.retirementDepotChildren)
    : calculateRetirementDepotAllowance(0, 0);
  const annualReturn = settings.investmentReturnPercent / 100;
  const monthlyReturn = (1 + annualReturn) ** (1 / 12) - 1;
  const retirementSnapshot = savingSnapshot(
    positions,
    monthlyReturn,
    settings,
    simulationStartYear,
    simulationStartAge,
    ageToday,
    retirementAge
  );
  const payoutMonths = hasPayoutPhase ? Math.max(1, Math.round((endAge - retirementAge) * 12)) : 0;
  const monthlyPension = hasPayoutPhase
    ? solveNetMonthlyPension(
        retirementSnapshot,
        positions,
        simulationStartYear,
        monthlyReturn,
        settings,
        simulationStartAge,
        ageToday,
        retirementAge,
        endAge,
        payoutMonths
      )
    : 0;
  const realMonthlyPension =
    retirementSnapshot.inflationFactor > 0 ? monthlyPension / retirementSnapshot.inflationFactor : monthlyPension;
  const percentageBase = snapshotAtAge(
    positions,
    simulationStartYear,
    monthlyReturn,
    monthlyPension,
    settings,
    simulationStartAge,
    ageToday,
    retirementAge,
    Math.max(percentageWithdrawalStartAge(settings), ageToday),
    retirementSnapshot
  );
  const percentageWithdrawalMonthlyAtStart = netPercentageWithdrawalAtStart(percentageBase, settings);
  const percentageWithdrawalAnnualAtStart = percentageWithdrawalMonthlyAtStart * 12;
  const withdrawalRemainingSavingsMonthlyAtStart = Math.max(0, monthlyRate - percentageWithdrawalMonthlyAtStart);
  const withdrawalGainMonthlyAtStart = Math.max(0, percentageWithdrawalMonthlyAtStart - monthlyRate);
  const reservePercent = bequestReservePercent(settings);

  const points: AssetProjectionPoint[] = [];
  let previousTax = 0;

  for (let age = startAge; age <= endAge; age += 1) {
    const snapshot = snapshotAtAge(
      positions,
      simulationStartYear,
      monthlyReturn,
      monthlyPension,
      settings,
      simulationStartAge,
      ageToday,
      retirementAge,
      age,
      retirementSnapshot
    );
    points.push(pointFromSnapshot(age, age > retirementAge ? "payout" : "saving", snapshot, previousTax));
    previousTax = snapshot.tax;
  }
  const finalPoint = points[points.length - 1];
  const unrealizedTaxAtRetirement = taxForUnrealizedGrowth(retirementSnapshot, settings);
  const bequestReserveAtEnd = hasPayoutPhase
    ? finalPoint?.netBalance ?? 0
    : retirementSnapshot.netBalance * (reservePercent / 100);

  return {
    points,
    monthlyRate,
    annualSavingsRate,
    retirementDepotEnabled: settings.retirementDepotEnabled,
    retirementDepotAnnualOwnContribution: retirementDepotAllowance.annualOwnContribution,
    retirementDepotBaseAllowanceAnnual: retirementDepotAllowance.baseAllowance,
    retirementDepotChildAllowanceAnnual: retirementDepotAllowance.childAllowance,
    retirementDepotAllowanceAnnual: retirementDepotAllowance.totalAllowance,
    retirementDepotAllowanceRatePercent: retirementDepotAllowance.allowanceRatePercent,
    retirementDepotAnnualContributionWithAllowance: retirementDepotAllowance.annualContributionWithAllowance,
    retirementDepotChildren: settings.retirementDepotChildren,
    monthlyPension,
    realMonthlyPension,
    bequestReservePercent: reservePercent,
    bequestReserveAtEnd,
    percentageWithdrawalMonthlyAtStart,
    percentageWithdrawalAnnualAtStart,
    withdrawalRemainingSavingsMonthlyAtStart,
    withdrawalGainMonthlyAtStart,
    percentageWithdrawalStartAge: percentageWithdrawalStartAge(settings),
    percentageWithdrawalRatePercent: percentageWithdrawalRatePercent(settings),
    retirementAge,
    endAge,
    ageToday,
    savingMonths,
    totalContribution: retirementSnapshot.contribution,
    recurringContributionAtRetirement: retirementSnapshot.recurringContribution,
    oneTimeContributionAtRetirement: retirementSnapshot.oneTimeContribution,
    grossWealthAtRetirement: retirementSnapshot.grossBalance,
    growthAtRetirement: retirementSnapshot.growth,
    taxAtRetirement: retirementSnapshot.tax,
    taxAtEnd: finalPoint?.tax ?? retirementSnapshot.tax,
    costBasisAtRetirement: retirementSnapshot.costBasis,
    allowanceAtRetirement: retirementSnapshot.allowance,
    allowanceBasisAtRetirement: retirementSnapshot.allowanceBasis,
    unrealizedTaxAtRetirement,
    netWealthAfterFullTaxAtRetirement: Math.max(0, retirementSnapshot.netBalance - unrealizedTaxAtRetirement),
    inflationFactorAtRetirement: retirementSnapshot.inflationFactor,
    wealthAtRetirement: retirementSnapshot.netBalance,
    realWealthAtRetirement: retirementSnapshot.realNetBalance
  };
}

function firstRecurringContributionYearIndex(
  positions: ReservePosition[],
  settings: InvestmentSettings,
  baseYear: number,
  savingMonths: number
): number {
  const projectionYears = Math.max(0, Math.ceil(savingMonths / 12));
  for (let yearIndex = 0; yearIndex < projectionYears; yearIndex += 1) {
    const contribution = selectedRecurringInvestmentContributionForProjectionYear(
      positions,
      settings,
      baseYear,
      yearIndex
    );
    if (contribution > 0) return yearIndex;
  }
  return 0;
}

function snapshotAtAge(
  positions: ReservePosition[],
  baseYear: number,
  monthlyReturn: number,
  monthlyPension: number,
  settings: InvestmentSettings,
  simulationStartAge: number,
  ageToday: number,
  retirementAge: number,
  targetAge: number,
  retirementSnapshot: SavingSnapshot
): SavingSnapshot {
  if (targetAge <= retirementAge) {
    return savingSnapshot(positions, monthlyReturn, settings, baseYear, simulationStartAge, ageToday, targetAge);
  }

  return payoutSnapshot(
    retirementSnapshot,
    positions,
    baseYear,
    monthlyReturn,
    monthlyPension,
    settings,
    simulationStartAge,
    ageToday,
    retirementAge,
    targetAge
  );
}

function savingSnapshot(
  positions: ReservePosition[],
  monthlyReturn: number,
  settings: InvestmentSettings,
  baseYear: number,
  simulationStartAge: number,
  ageToday: number,
  targetAge: number
): SavingSnapshot {
  let grossBalance = 0;
  let costBasis = 0;
  let contribution = 0;
  let recurringContribution = 0;
  let oneTimeContribution = 0;
  let allowance = 0;
  let allowanceBasis = 0;
  let withdrawals = 0;
  let tax = 0;
  const months = Math.max(0, Math.round((targetAge - simulationStartAge) * 12));

  for (let index = 0; index < months; index += 1) {
    const ageAtMonth = simulationStartAge + index / 12;
    const monthlyContribution = selectedInvestmentContributionForProjectionMonth(positions, settings, baseYear, index);
    const monthlyOneTimeContribution = selectedOneTimeInvestmentContributionForProjectionMonth(
      positions,
      settings,
      baseYear,
      index
    );
    const monthlyRecurringContribution = Math.max(0, monthlyContribution - monthlyOneTimeContribution);
    const monthlyAllowance = retirementDepotAllowanceForProjectionMonth(positions, settings, baseYear, index);
    grossBalance = grossBalance * (1 + monthlyReturn) + monthlyContribution + monthlyAllowance;
    costBasis += monthlyContribution;
    costBasis += monthlyAllowance;
    contribution += monthlyContribution;
    recurringContribution += monthlyRecurringContribution;
    oneTimeContribution += monthlyOneTimeContribution;
    allowance += monthlyAllowance;
    allowanceBasis += monthlyAllowance;
    if (ageAtMonth >= percentageWithdrawalStartAge(settings)) {
      const withdrawal = grossBalance * (percentageWithdrawalRatePercent(settings) / 100) / 12;
      const result = applyGrossWithdrawal(grossBalance, costBasis, allowanceBasis, withdrawal, settings);
      grossBalance = result.grossBalance;
      costBasis = result.costBasis;
      allowanceBasis = result.allowanceBasis;
      withdrawals += result.netWithdrawal;
      tax += result.tax;
    }
  }

  return completeSnapshot(
    grossBalance,
    costBasis,
    contribution,
    recurringContribution,
    oneTimeContribution,
    allowance,
    allowanceBasis,
    withdrawals,
    tax,
    settings,
    ageToday,
    targetAge
  );
}

function payoutSnapshot(
  startSnapshot: SavingSnapshot,
  positions: ReservePosition[],
  baseYear: number,
  monthlyReturn: number,
  monthlyPension: number,
  settings: InvestmentSettings,
  simulationStartAge: number,
  ageToday: number,
  retirementAge: number,
  targetAge: number
): SavingSnapshot {
  let grossBalance = startSnapshot.grossBalance;
  let costBasis = startSnapshot.costBasis;
  let contribution = startSnapshot.contribution;
  let recurringContribution = startSnapshot.recurringContribution;
  let oneTimeContribution = startSnapshot.oneTimeContribution;
  let allowance = startSnapshot.allowance;
  let allowanceBasis = startSnapshot.allowanceBasis;
  let withdrawals = 0;
  let tax = startSnapshot.tax;
  const months = Math.max(0, Math.round((targetAge - retirementAge) * 12));
  const retirementMonthIndex = Math.max(0, Math.round((retirementAge - simulationStartAge) * 12));

  for (let index = 0; index < months; index += 1) {
    const ageAtMonth = retirementAge + index / 12;
    const monthlyOneTimeContribution = selectedOneTimeInvestmentContributionForProjectionMonth(
      positions,
      settings,
      baseYear,
      retirementMonthIndex + index
    );
    grossBalance *= 1 + monthlyReturn;
    grossBalance += monthlyOneTimeContribution;
    costBasis += monthlyOneTimeContribution;
    contribution += monthlyOneTimeContribution;
    oneTimeContribution += monthlyOneTimeContribution;
    if (ageAtMonth >= percentageWithdrawalStartAge(settings)) {
      const percentageWithdrawal = grossBalance * (percentageWithdrawalRatePercent(settings) / 100) / 12;
      const result = applyGrossWithdrawal(grossBalance, costBasis, allowanceBasis, percentageWithdrawal, settings);
      grossBalance = result.grossBalance;
      costBasis = result.costBasis;
      allowanceBasis = result.allowanceBasis;
      withdrawals += result.netWithdrawal;
      tax += result.tax;
    }
    const result = applyNetWithdrawal(grossBalance, costBasis, allowanceBasis, monthlyPension, settings);
    grossBalance = result.grossBalance;
    costBasis = result.costBasis;
    allowanceBasis = result.allowanceBasis;
    withdrawals += result.netWithdrawal;
    tax += result.tax;
  }

  return completeSnapshot(
    grossBalance,
    costBasis,
    contribution,
    recurringContribution,
    oneTimeContribution,
    allowance,
    allowanceBasis,
    withdrawals,
    tax,
    settings,
    ageToday,
    targetAge
  );
}

function completeSnapshot(
  grossBalance: number,
  costBasis: number,
  contribution: number,
  recurringContribution: number,
  oneTimeContribution: number,
  allowance: number,
  allowanceBasis: number,
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

  return {
    grossBalance,
    costBasis,
    contribution,
    recurringContribution,
    oneTimeContribution,
    allowance,
    allowanceBasis,
    withdrawals,
    growth,
    tax,
    netBalance,
    realNetBalance,
    inflationFactor
  };
}

function applyGrossWithdrawal(
  grossBalance: number,
  costBasis: number,
  allowanceBasis: number,
  requestedWithdrawal: number,
  settings: InvestmentSettings
): { grossBalance: number; costBasis: number; allowanceBasis: number; netWithdrawal: number; tax: number } {
  const grossWithdrawal = Math.min(Math.max(0, requestedWithdrawal), Math.max(0, grossBalance));
  if (grossWithdrawal <= 0 || grossBalance <= 0) {
    return { grossBalance, costBasis, allowanceBasis, netWithdrawal: 0, tax: 0 };
  }

  const growth = Math.max(0, grossBalance - costBasis);
  const gainShare = growth > 0 ? growth / grossBalance : 0;
  const taxableGain = grossWithdrawal * gainShare;
  const tax = taxableGain * (settings.capitalGainsTaxPercent / 100);
  const basisReduction = grossWithdrawal - taxableGain;
  const allowanceBasisReduction =
    costBasis > 0 ? Math.min(allowanceBasis, basisReduction * (allowanceBasis / costBasis)) : 0;
  return {
    grossBalance: Math.max(0, grossBalance - grossWithdrawal),
    costBasis: Math.max(0, costBasis - basisReduction),
    allowanceBasis: Math.max(0, allowanceBasis - allowanceBasisReduction),
    netWithdrawal: Math.max(0, grossWithdrawal - tax),
    tax
  };
}

function applyNetWithdrawal(
  grossBalance: number,
  costBasis: number,
  allowanceBasis: number,
  requestedNetWithdrawal: number,
  settings: InvestmentSettings
): { grossBalance: number; costBasis: number; allowanceBasis: number; netWithdrawal: number; tax: number } {
  if (requestedNetWithdrawal <= 0 || grossBalance <= 0) {
    return { grossBalance, costBasis, allowanceBasis, netWithdrawal: 0, tax: 0 };
  }
  const growth = Math.max(0, grossBalance - costBasis);
  const gainShare = growth > 0 ? growth / grossBalance : 0;
  const taxDrag = gainShare * (settings.capitalGainsTaxPercent / 100);
  const grossWithdrawal = requestedNetWithdrawal / Math.max(0.0001, 1 - taxDrag);
  return applyGrossWithdrawal(grossBalance, costBasis, allowanceBasis, grossWithdrawal, settings);
}

function solveNetMonthlyPension(
  startSnapshot: SavingSnapshot,
  positions: ReservePosition[],
  baseYear: number,
  monthlyReturn: number,
  settings: InvestmentSettings,
  simulationStartAge: number,
  ageToday: number,
  retirementAge: number,
  endAge: number,
  payoutMonths: number
): number {
  const retirementMonthIndex = Math.max(0, Math.round((retirementAge - simulationStartAge) * 12));
  let futureOneTimeContributions = 0;
  for (let index = 0; index < payoutMonths; index += 1) {
    futureOneTimeContributions += selectedOneTimeInvestmentContributionForProjectionMonth(
      positions,
      settings,
      baseYear,
      retirementMonthIndex + index
    );
  }
  const grossMonthlyPension = annuityPayment(
    startSnapshot.grossBalance + futureOneTimeContributions,
    monthlyReturn,
    payoutMonths
  );
  const targetReserve = Math.max(1, startSnapshot.grossBalance * (bequestReservePercent(settings) / 100));
  let low = 0;
  let high = grossMonthlyPension;

  for (let index = 0; index < 48; index += 1) {
    const candidate = (low + high) / 2;
    const snapshot = payoutSnapshot(
      startSnapshot,
      positions,
      baseYear,
      monthlyReturn,
      candidate,
      settings,
      simulationStartAge,
      ageToday,
      retirementAge,
      endAge
    );
    if (snapshot.grossBalance > targetReserve) low = candidate;
    else high = candidate;
  }

  return low;
}

function percentageWithdrawalStartAge(settings: InvestmentSettings): number {
  return settings.retirementDepotEnabled ? payoutStartAge(settings) : settings.percentageWithdrawalStartAge;
}

function percentageWithdrawalRatePercent(settings: InvestmentSettings): number {
  return settings.retirementDepotEnabled ? 0 : settings.percentageWithdrawalRatePercent;
}

function bequestReservePercent(settings: InvestmentSettings): number {
  return Math.min(100, Math.max(0, settings.bequestReservePercent));
}

function netPercentageWithdrawalAtStart(snapshot: SavingSnapshot, settings: InvestmentSettings): number {
  const grossWithdrawal = snapshot.grossBalance * (percentageWithdrawalRatePercent(settings) / 100) / 12;
  return applyGrossWithdrawal(
    snapshot.grossBalance,
    snapshot.costBasis,
    snapshot.allowanceBasis,
    grossWithdrawal,
    settings
  ).netWithdrawal;
}

function taxForUnrealizedGrowth(snapshot: SavingSnapshot, settings: InvestmentSettings): number {
  return Math.max(0, snapshot.growth) * (settings.capitalGainsTaxPercent / 100);
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
    allowance: snapshot.allowanceBasis,
    growth: snapshot.growth,
    tax: snapshot.tax,
    periodTax: Math.max(0, snapshot.tax - previousTax),
    netBalance: snapshot.netBalance,
    realNetBalance: snapshot.realNetBalance,
    normalDepot: snapshot.realNetBalance
  };
}
