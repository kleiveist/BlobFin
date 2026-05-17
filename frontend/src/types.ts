export type PositionFlow = "income" | "expense";
export type ExpensePositionType = "fixed" | "reserve" | "temporary" | "savings";
export type IncomePositionType = "incomeMonthly" | "incomeYearly" | "incomeTemporary";
export type PositionType = ExpensePositionType | IncomePositionType;
export type PayoutType = "none" | "monthly" | "yearly" | "once";
export type ThemeMode = "light" | "dark";
export type InvestmentDepotKey = "standard" | "retirement" | "child";

export interface ReservePosition {
  id: string;
  flow: PositionFlow;
  active: boolean;
  visible: boolean;
  name: string;
  type: PositionType;
  amount: number;
  startMonth: number;
  endMonth: number;
  payoutType: PayoutType;
  payoutYear: number;
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
  activeDepot: InvestmentDepotKey;
  includedIds: string[];
  includeAccountInterest: boolean;
  includeAccountCashback: boolean;
  retirementIncludedIds: string[];
  retirementIncludeAccountInterest: boolean;
  retirementIncludeAccountCashback: boolean;
  childIncludedIds: string[];
  childIncludeAccountInterest: boolean;
  childIncludeAccountCashback: boolean;
  retirementDepotEnabled: boolean;
  retirementDepotChildren: number;
  birthYear: number;
  chartStartAge: number;
  payoutEndAge: number;
  payoutYears: number;
  percentageWithdrawalStartAge: number;
  percentageWithdrawalRatePercent: number;
  investmentReturnPercent: number;
  capitalGainsTaxPercent: number;
  inflationRatePercent: number;
  bequestReservePercent: number;
  retirementBirthYear: number;
  retirementChartStartAge: number;
  retirementPayoutEndAge: number;
  retirementPayoutYears: number;
  retirementInvestmentReturnPercent: number;
  retirementCapitalGainsTaxPercent: number;
  retirementInflationRatePercent: number;
  retirementBequestReservePercent: number;
  childBirthYear: number;
  childChartStartAge: number;
  childInvestmentReturnPercent: number;
  childCapitalGainsTaxPercent: number;
  childInflationRatePercent: number;
  childBequestReservePercent: number;
}

export interface AppState {
  theme: ThemeMode;
  settings: PlanningSettings;
  positions: ReservePosition[];
  investment: InvestmentSettings;
}

export interface MonthlyReserveRow {
  monthNumber: number;
  month: string;
  values: Record<string, number>;
  plannedIncome: number;
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
  totalPlannedIncome: number;
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
  retirementDepotEnabled: boolean;
  retirementDepotAnnualOwnContribution: number;
  retirementDepotBaseAllowanceAnnual: number;
  retirementDepotChildAllowanceAnnual: number;
  retirementDepotAllowanceAnnual: number;
  retirementDepotAllowanceRatePercent: number;
  retirementDepotAnnualContributionWithAllowance: number;
  retirementDepotChildren: number;
  monthlyPension: number;
  realMonthlyPension: number;
  bequestReservePercent: number;
  bequestReserveAtEnd: number;
  percentageWithdrawalMonthlyAtStart: number;
  percentageWithdrawalAnnualAtStart: number;
  withdrawalRemainingSavingsMonthlyAtStart: number;
  withdrawalGainMonthlyAtStart: number;
  percentageWithdrawalStartAge: number;
  percentageWithdrawalRatePercent: number;
  retirementAge: number;
  endAge: number;
  ageToday: number;
  savingMonths: number;
  totalContribution: number;
  recurringContributionAtRetirement: number;
  oneTimeContributionAtRetirement: number;
  grossWealthAtRetirement: number;
  growthAtRetirement: number;
  taxAtRetirement: number;
  taxAtEnd: number;
  costBasisAtRetirement: number;
  allowanceAtRetirement: number;
  allowanceBasisAtRetirement: number;
  unrealizedTaxAtRetirement: number;
  netWealthAfterFullTaxAtRetirement: number;
  inflationFactorAtRetirement: number;
  wealthAtRetirement: number;
  realWealthAtRetirement: number;
}
