export type PositionFlow = "income" | "expense";
export type ExpensePositionType = "fixed" | "reserve" | "temporary" | "savings";
export type IncomePositionType = "incomeMonthly" | "incomeYearly" | "incomeTemporary";
export type PositionType = ExpensePositionType | IncomePositionType;
export type PayoutType = "none" | "monthly" | "yearly" | "once";
export type ThemeMode = "light" | "dark";
export type InvestmentDepotKey = "standard" | "retirement" | "child";
export type PositionTableMode = PositionFlow | "reserve" | "savings";
export type AppSectionId =
  | "grunddaten"
  | "cost_reserve_positions"
  | "year_table"
  | "income_tracking"
  | "investment_planning"
  | "real_estate_financing"
  | "combined_wealth";
export type PlanningAccountType = "cost_reserve" | "annual_table" | "mixed";
export type RealEstateLocale = "de" | "en";
export type SpecialRepaymentRhythm = "none" | "monthly" | "yearly";
export type IncomePerson = "person1" | "person2" | "household";
export type IncomeYearEntrySource = "annual_statement" | "manual";
export type IncomeResolvedSource = IncomeYearEntrySource;
export type CareerMilestoneImpact = "positive" | "negative" | "neutral";
export type IncomeProjectionMode = "off" | "historical_average" | "manual";
export type RepaymentSourceToggleKey =
  | "useWithdrawalGainAsRepayment"
  | "useDepotSavingsRateAsRepayment"
  | "useLegacySavingsRateAsRepayment"
  | "useNetGainAsRepayment"
  | "onlyUsePositiveValues";
export type RealEstatePaymentSourceKind = "equityCapital" | "monthlyPayment" | "specialRepayment";
export type PositionTableFilterColumn =
  | "active"
  | "visible"
  | "label"
  | "name"
  | "type"
  | "amount"
  | "startMonth"
  | "endMonth"
  | "payoutYear"
  | "payoutType"
  | "payoutMonth"
  | "payoutDay"
  | "interestBearing"
  | "cashback";
export type PositionTableFilterOperator = "contains" | "eq" | "gte" | "lte";
export type PositionTableSortDirection = "asc" | "desc";

export interface PositionTableFilter {
  id: string;
  column: PositionTableFilterColumn;
  operator: PositionTableFilterOperator;
  value: string;
}

export interface PositionTableSort {
  column: PositionTableFilterColumn;
  direction: PositionTableSortDirection;
}

export interface PositionTableView {
  filters: PositionTableFilter[];
  sort: PositionTableSort | null;
  selectedLabels: string[];
}

export type PositionTableViewState = Record<PositionTableMode, PositionTableView>;

export interface ReservePosition {
  id: string;
  flow: PositionFlow;
  active: boolean;
  visible: boolean;
  name: string;
  icon?: string;
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

export interface PlanningAccount {
  id: string;
  name: string;
  type: PlanningAccountType;
  yearlyRows: ReservePosition[];
  metadata?: Record<string, unknown>;
}

export interface AppUiState {
  activeSection: AppSectionId;
  selectedPlanningAccountId: string;
  selectedInvestmentAccountId: string;
  selectedRealEstateAccountIds: string[];
  selectedRealEstateWithdrawalGainAccountIds: string[];
  selectedCombinedAccountIds: string[];
  selectedCombinedLeadInvestmentAccountId: string;
  settingsGrunddatenExpanded: boolean;
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
  childPayoutAge: number;
  childInvestmentReturnPercent: number;
  childCapitalGainsTaxPercent: number;
  childInflationRatePercent: number;
  childBequestReservePercent: number;
}

export interface RealEstateFinancingSettings {
  locale: RealEstateLocale;
  purchasePrice: number;
  constructionOrRenovationCosts: number;
  landCosts: number;
  additionalPurchaseCosts: number;
  notaryCosts: number;
  landRegistryCosts: number;
  brokerCosts: number;
  transferTax: number;
  modernizationReserve: number;
  movingAndSetupCosts: number;
  safetyBuffer: number;
  equityCapital: number;
  loanAmount: number;
  interestRatePercent: number;
  initialRepaymentPercent: number;
  monthlyPayment: number;
  fixedInterestYears: number;
  targetTermYears: number;
  specialRepaymentAmount: number;
  specialRepaymentRhythm: SpecialRepaymentRhythm;
  remainingDebtAfterFixedInterest: number;
  financingStartAge: number;
  financingEndAge: number;
  plannedSaleYear: number | null;
  estimatedSaleValue: number | null;
  targetFullRepaymentYear: number | null;
  targetMonthlyBurden: number;
  maxMonthlyBurden: number;
  subsidyAmount: number;
  propertyValueGrowthPercent: number;
  inflationRatePercent: number;
  financingYears: number;
  manualFuturePropertyValue: number | null;
  repaymentSources: RepaymentSourceToggle;
  equityCapitalSourceIds: string[];
  monthlyPaymentSourceIds: string[];
  specialRepaymentSourceIds: string[];
  includeWithdrawalGainAsPaymentSource: boolean;
}

export interface RepaymentSourceToggle {
  useWithdrawalGainAsRepayment: boolean;
  useDepotSavingsRateAsRepayment: boolean;
  useLegacySavingsRateAsRepayment: boolean;
  useNetGainAsRepayment: boolean;
  onlyUsePositiveValues: boolean;
}

export interface RepaymentSourceValues {
  withdrawalGain: number;
  depotSavingsRate: number;
  legacySavingsRate: number;
  netGain: number;
}

export interface AdditionalRepaymentBreakdown {
  withdrawalGain: number;
  depotSavingsRate: number;
  legacySavingsRate: number;
  netGain: number;
  totalAdditionalMonthlyRepayment: number;
}

export interface AdditionalRepaymentYearBreakdown {
  withdrawalGain: number;
  depotSavingsRate: number;
  legacySavingsRate: number;
  netGain: number;
  totalAdditionalRepayment: number;
}

export interface RealEstateFinancingSourceSchedule {
  equityCapital: number;
  monthlyPaymentSavings: number[];
  withdrawalGainPayments: number[];
  depotSavingsRatePayments?: number[];
  specialRepayments: number[];
}

export interface CombinedWealthToggles {
  includeCashPositions: boolean;
  includeCostReserveAccounts: boolean;
  includeAnnualTableAccounts: boolean;
  includeDepotDevelopment: boolean;
  includeSharedDepotDevelopment: boolean;
  includeWithdrawals: boolean;
  includeRealEstateFinancing: boolean;
  includeRealEstateValueTrend: boolean;
}

export interface IncomeYearEntry {
  id: string;
  year: number;
  label: string;
  person: IncomePerson;
  annualNetIncome: number | null;
  annualGrossIncome: number | null;
  taxesAndDeductions: number | null;
  taxDeductionItems: IncomeTaxDeductionItems;
  employer: string;
  note: string;
  source: IncomeYearEntrySource;
}

export interface IncomeTaxDeductionItems {
  wageTax: number | null;
  solidaritySurcharge: number | null;
  churchTax: number | null;
  pensionInsurance: number | null;
  healthInsurance: number | null;
  careInsurance: number | null;
  unemploymentInsurance: number | null;
  employerPensionInsurance: number | null;
}

export type IncomeTaxDeductionField = keyof IncomeTaxDeductionItems;

export interface CareerMilestone {
  id: string;
  date: string;
  type: string;
  description: string;
  impact: CareerMilestoneImpact;
  linkedYear: number | null;
}

export interface IncomeTrackerSettings {
  activeInputTab: "yearly" | "milestones" | "settings";
  projectionMode: IncomeProjectionMode;
  manualGrowthRatePercent: number | null;
  savingsSharePercent: number | null;
  selectedYearlyLabels: string[];
}

export interface IncomeTrackerState {
  yearlyEntries: IncomeYearEntry[];
  milestones: CareerMilestone[];
  settings: IncomeTrackerSettings;
}

export interface CombinedWealthYear {
  year: number;
  cashValue: number;
  depotValue: number;
  withdrawalImpact: number;
  redirectedCashRepayment: number;
  redirectedDepotRepayment: number;
  propertyValue: number;
  propertyDebt: number;
  propertyEquity: number;
  totalGrossAssets: number;
  totalDebt: number;
  totalNetWealth: number;
}

export interface AppState {
  theme: ThemeMode;
  settings: PlanningSettings;
  planningAccounts: PlanningAccount[];
  ui: AppUiState;
  realEstate: RealEstateFinancingSettings;
  combinedWealth: CombinedWealthToggles;
  incomeTracker: IncomeTrackerState;
  positions: ReservePosition[];
  investmentByAccountId: Record<string, InvestmentSettings>;
  investment: InvestmentSettings;
  positionTableView: PositionTableViewState;
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

export interface RealEstateFinancingYear {
  year: number;
  propertyValue: number;
  loanStart: number;
  interestPaid: number;
  interestDue: number;
  interestShortfall: number;
  monthlyPaymentFromSavings: number;
  monthlyPaymentFromWithdrawalGain: number;
  monthlyPaymentAvailable: number;
  principalFromMonthlyPayment: number;
  principalPaid: number;
  specialRepayment: number;
  additionalRepayment: number;
  additionalRepaymentBreakdown: AdditionalRepaymentYearBreakdown;
  loanEnd: number;
  loanCostPaidToDate?: number;
  loanCostRemaining?: number;
  propertyEquity: number;
  netPropertyWealth: number;
}

export interface RealEstateFinancingMonth {
  year: number;
  month: number;
  loanStart: number;
  interestDue: number;
  interestPaid: number;
  interestShortfall: number;
  monthlyPaymentFromSavings: number;
  monthlyPaymentFromWithdrawalGain: number;
  monthlyPaymentAvailable: number;
  principalPaid: number;
  specialRepayment: number;
  additionalRepayment: number;
  loanEnd: number;
}

export interface RealEstateFinancingResult {
  years: RealEstateFinancingYear[];
  months: RealEstateFinancingMonth[];
  startLoanAmount: number;
  equityCapital: number;
  monthlyPayment: number;
  derivedInitialRepaymentPercent: number;
  annualSpecialRepayment: number;
  effectivePropertyStartValue: number;
  totalProjectCost: number;
  totalInterestDue: number;
  totalInterestPaid: number;
  totalInterestShortfall: number;
  totalLoanCost: number;
  financingYears: number;
  projectionYears: number;
  financingEndYear: number;
  projectionEndYear: number;
  validationErrors: string[];
}
