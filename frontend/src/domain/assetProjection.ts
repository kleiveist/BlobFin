import { isActiveInMonth } from "./reserveCalculator";
import { calculateInvestmentResult } from "./investmentCalculator";
import type { AssetProjection, AssetProjectionPoint, InvestmentSettings, ReservePosition } from "../types";

interface SavingSnapshot {
  grossBalance: number;
  contribution: number;
}

export function payoutStartAge(settings: InvestmentSettings): number {
  return Math.max(0, settings.payoutEndAge - settings.payoutYears);
}

export function selectedMonthlyPattern(positions: ReservePosition[], settings: InvestmentSettings): number[] {
  const selectedPositions = positions.filter((position) => settings.includedIds.includes(position.id) && position.active);
  const pattern: number[] = [];

  for (let month = 1; month <= 12; month += 1) {
    pattern.push(
      selectedPositions.reduce((sum, position) => {
        return isActiveInMonth(position, month) ? sum + Number(position.amount) : sum;
      }, 0)
    );
  }

  return pattern;
}

export function buildAssetProjection(
  year: number,
  positions: ReservePosition[],
  settings: InvestmentSettings
): AssetProjection {
  const investment = calculateInvestmentResult(year, positions, settings);
  const startAge = Math.min(settings.chartStartAge, investment.payoutStartAge);
  const endAge = Math.max(settings.payoutEndAge, investment.payoutStartAge + 1);
  const monthlyPattern = selectedMonthlyPattern(positions, settings);
  const monthlyRate = monthlyPattern.reduce((sum, value) => sum + value, 0) / 12;
  const annualReturn = settings.investmentReturnPercent / 100;
  const monthlyReturn = (1 + annualReturn) ** (1 / 12) - 1;
  const monthlyPension =
    settings.withdrawalMode === "fourPercent" ? (investment.netWealth * 0.04) / 12 : investment.monthlyPensionNet;

  const points: AssetProjectionPoint[] = [];

  for (let age = startAge; age <= investment.payoutStartAge; age += 1) {
    const elapsedMonths = Math.max(0, Math.min(investment.savingMonths, Math.round((age - investment.ageToday) * 12)));
    const snapshot = savingSnapshot(monthlyPattern, monthlyReturn, elapsedMonths);
    const point = savingPoint(age, snapshot, settings, investment.ageToday);

    if (age === investment.payoutStartAge) {
      point.grossBalance = investment.grossWealth;
      point.contribution = investment.totalContribution;
      point.growth = investment.growth;
      point.netBalance = investment.netWealth;
      point.realNetBalance = investment.realWealth;
      point.normalDepot = investment.realWealth;
    }

    points.push(point);
  }

  for (let age = investment.payoutStartAge + 1; age <= endAge; age += 1) {
    const payoutMonths = Math.max(0, Math.round((age - investment.payoutStartAge) * 12));
    const netBalance = payoutSnapshot(investment.netWealth, monthlyReturn, monthlyPension, payoutMonths);
    const yearsFromNow = Math.max(0, age - investment.ageToday);
    const inflationFactor = (1 + settings.inflationRatePercent / 100) ** yearsFromNow;
    const realNetBalance = inflationFactor > 0 ? netBalance / inflationFactor : netBalance;

    points.push({
      age,
      phase: "payout",
      grossBalance: netBalance,
      contribution: 0,
      allowance: 0,
      growth: 0,
      netBalance,
      realNetBalance,
      normalDepot: realNetBalance
    });
  }

  return {
    points,
    monthlyRate,
    monthlyPension,
    retirementAge: investment.payoutStartAge,
    endAge,
    ageToday: investment.ageToday,
    wealthAtRetirement: investment.netWealth,
    realWealthAtRetirement: investment.realWealth
  };
}

function savingSnapshot(monthlyPattern: number[], monthlyReturn: number, months: number): SavingSnapshot {
  let grossBalance = 0;
  let contribution = 0;

  for (let index = 0; index < months; index += 1) {
    const monthlyContribution = monthlyPattern[index % 12] || 0;
    grossBalance = grossBalance * (1 + monthlyReturn) + monthlyContribution;
    contribution += monthlyContribution;
  }

  return { grossBalance, contribution };
}

function savingPoint(
  age: number,
  snapshot: SavingSnapshot,
  settings: InvestmentSettings,
  ageToday: number
): AssetProjectionPoint {
  const growth = Math.max(0, snapshot.grossBalance - snapshot.contribution);
  const tax = growth * (settings.capitalGainsTaxPercent / 100);
  const netBalance = Math.max(0, snapshot.grossBalance - tax);
  const yearsFromNow = Math.max(0, age - ageToday);
  const inflationFactor = (1 + settings.inflationRatePercent / 100) ** yearsFromNow;
  const realNetBalance = inflationFactor > 0 ? netBalance / inflationFactor : netBalance;

  return {
    age,
    phase: "saving",
    grossBalance: snapshot.grossBalance,
    contribution: snapshot.contribution,
    allowance: 0,
    growth,
    netBalance,
    realNetBalance,
    normalDepot: realNetBalance
  };
}

function payoutSnapshot(startBalance: number, monthlyReturn: number, monthlyPension: number, months: number): number {
  let balance = startBalance;

  for (let index = 0; index < months; index += 1) {
    balance = balance * (1 + monthlyReturn) - monthlyPension;
    if (balance < 0) return 0;
  }

  return balance;
}
