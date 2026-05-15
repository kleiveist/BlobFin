export type PositionType = "fixed" | "reserve" | "temporary";
export type PayoutType = "none" | "monthly" | "yearly";

export interface ReservePosition {
  id: string;
  active: boolean;
  name: string;
  type: PositionType;
  amount: number;
  startMonth: number;
  endMonth: number;
  payoutType: PayoutType;
  payoutMonth: number;
  payoutDay: number;
  cashback: boolean;
}

export interface PlanningSettings {
  year: number;
  interestRatePercent: number;
  cashbackRatePercent: number;
  emergencyFund: number;
}

export interface InvestmentSettings {
  includedIds: string[];
  birthYear: number;
  payoutEndAge: number;
  payoutYears: number;
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
  permanentAfterMonthlyOutflows: number;
  monthlyInterest: number;
}

export interface ReserveSummary {
  rows: MonthlyReserveRow[];
  activePositions: ReservePosition[];
  maxRow: MonthlyReserveRow;
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
