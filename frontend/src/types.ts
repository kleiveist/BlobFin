export type PositionType = "fixed" | "reserve" | "temporary" | "savings";
export type PayoutType = "none" | "monthly" | "yearly" | "once";

export interface ReservePosition {
  id: string;
  active: boolean;
  visible: boolean;
  name: string;
  type: PositionType;
  amount: number;
  startMonth: number;
  endMonth: number;
  payoutType: PayoutType;
  payoutMonth: number;
  payoutDay: number;
  interestBearing: boolean;
  cashback: boolean;
}

export interface PlanningSettings {
  year: number;
  monthlyNetIncome: number;
  interestRatePercent: number;
  cashbackRatePercent: number;
  emergencyFund: number;
}

export interface InvestmentSettings {
  includedIds: string[];
  includeAccountInterest: boolean;
  includeAccountCashback: boolean;
  birthYear: number;
  chartStartAge: number;
  payoutEndAge: number;
  payoutYears: number;
  percentageWithdrawalStartAge: number;
  percentageWithdrawalRatePercent: number;
  investmentReturnPercent: number;
  capitalGainsTaxPercent: number;
  inflationRatePercent: number;
}

export interface AppState {
  settings: PlanningSettings;
  positions: ReservePosition[];
  investment: InvestmentSettings;
}

export interface MonthlyReserveRow {
  monthNumber: number;
  month: string;
  values: Record<string, number>;
  maxNeeded: number;
  plannedOutflow: number;
  monthlyRemaining: number;
  permanentAfterMonthlyOutflows: number;
  monthlyInterest: number;
  monthlyCashback: number;
}

export interface ReserveSummary {
  rows: MonthlyReserveRow[];
  activePositions: ReservePosition[];
  visiblePositions: ReservePosition[];
  maxRow: MonthlyReserveRow;
  minRemainingRow: MonthlyReserveRow;
  totalPlannedOutflow: number;
  yearlyRemaining: number;
  totalInterest: number;
  totalCashback: number;
  yearEndBalance: number;
  maxNeededWithEmergencyFund: number;
}

export interface InvestmentResult {
  ageToday: number;
  payoutStartAge: number;
  yearsUntilPayout: number;
  savingMonths: number;
  payoutMonths: number;
  averageMonthlyContribution: number;
  totalContribution: number;
  grossWealth: number;
  growth: number;
  tax: number;
  netWealth: number;
  inflationFactor: number;
  realWealth: number;
  monthlyPensionNet: number;
  realMonthlyPension: number;
}

export interface AssetProjectionPoint {
  age: number;
  phase: "saving" | "payout";
  grossBalance: number;
  contribution: number;
  costBasis: number;
  allowance: number;
  growth: number;
  tax: number;
  periodTax: number;
  netBalance: number;
  realNetBalance: number;
  normalDepot: number;
}

export interface AssetProjection {
  points: AssetProjectionPoint[];
  monthlyRate: number;
  annualSavingsRate: number;
  monthlyPension: number;
  realMonthlyPension: number;
  percentageWithdrawalMonthlyAtStart: number;
  percentageWithdrawalAnnualAtStart: number;
  withdrawalGainMonthlyAtStart: number;
  percentageWithdrawalStartAge: number;
  percentageWithdrawalRatePercent: number;
  retirementAge: number;
  endAge: number;
  ageToday: number;
  savingMonths: number;
  totalContribution: number;
  grossWealthAtRetirement: number;
  growthAtRetirement: number;
  taxAtRetirement: number;
  taxAtEnd: number;
  costBasisAtRetirement: number;
  unrealizedTaxAtRetirement: number;
  netWealthAfterFullTaxAtRetirement: number;
  inflationFactorAtRetirement: number;
  wealthAtRetirement: number;
  realWealthAtRetirement: number;
}
