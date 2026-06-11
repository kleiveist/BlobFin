export type PositionFlow = "income" | "expense";
export type ExpensePositionType = "fixed" | "reserve" | "temporary" | "savings";
export type IncomePositionType = "incomeMonthly" | "incomeYearly" | "incomeTemporary";
export type PositionType = ExpensePositionType | IncomePositionType;
export type PayoutType = "none" | "monthly" | "yearly" | "once";
export type PlanningYearSelection = number | null;
export type ThemeMode = "light" | "dark";
export type InvestmentDepotKey = "standard" | "retirement" | "child";
export type CombinedWealthDepotKey = InvestmentDepotKey;
export type PositionTableMode = PositionFlow | "reserve" | "savings";
export type AppSectionId =
  | "home"
  | "income"
  | "income_planning"
  | "income_stamp_planner"
  | "planning_scenarios"
  | "real_estate_financing"
  | "statutory_pension"
  | "combined_wealth";
export type PlanningAccountType = "cost_reserve" | "annual_table" | "mixed";
export type RealEstateLocale = "de" | "en";
export type SpecialRepaymentRhythm = "none" | "monthly" | "yearly";
export type IncomePerson = "person1" | "person2" | "household";
export type IncomeYearEntrySource = "annual_statement" | "manual";
export type IncomeResolvedSource = IncomeYearEntrySource;
export type IncomeTaxAdjustmentType = "refund" | "payment";
export type IncomeEmploymentContext = "job_loss" | "earned_claim" | "other";
export type IncomeMinijobType = "commercial" | "private_household";
export type IncomeStudentEmploymentMode = "minijob" | "short_term";
export type CareerMilestoneImpact = "positive" | "negative" | "neutral";
export type IncomeProjectionMode = "off" | "historical_average" | "manual";
export type IncomePlanningCategory =
  | "salary"
  | "training_allowance"
  | "minijob"
  | "pocket_money"
  | "self_employed"
  | "freelance"
  | "side_income"
  | "online_sales"
  | "garage_parking_rental"
  | "fees"
  | "dividends"
  | "asset_income"
  | "insurance_payouts"
  | "bonus"
  | "severance_payment"
  | "volunteer_allowance"
  | "trainer_allowance"
  | "child_youth_jobs"
  | "board"
  | "office_holder"
  | "supervisory_board"
  | "other";
export type IncomePlanningWeekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";
export type IncomePlanningHabitType = "good" | "bad";
export type IncomePlanningHabitChange = "keep" | "reduce" | "replace" | "build";
export type IncomePlanningHabitStatus = "planned" | "active" | "difficult" | "stable";
export type IncomePlanningPriority = "low" | "medium" | "high";
export type IncomePlanningHabitDurationUnit = "day" | "week";
export type IncomePlanningManualBlockType = "private_commitment" | "free_time" | "buffer" | "other_event";
export type IncomePlanningWeekScenarioId = string;
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

export interface PositionCostBreakdownItem {
  id: string;
  name: string;
  amount: number | null;
}

export interface ReservePosition {
  id: string;
  planningYear?: PlanningYearSelection;
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
  costBreakdown?: PositionCostBreakdownItem[];
}

export interface PlanningSettings {
  year: number;
  monthlyNetIncome: number;
  interestRatePercent: number;
  cashbackRatePercent: number;
  endDate: string;
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
  selectedPlanningYear: PlanningYearSelection;
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
  purchaseActivated: boolean;
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
  includeStatutoryPension: boolean;
  cashAccountId: string | null;
  cashPositionIds: string[];
  depotKeys: CombinedWealthDepotKey[];
  statutoryPensionScenario: StatutoryPensionScenarioId;
  statutoryPensionMonthlyAmount: number;
  statutoryPensionSavingsRatePercent: number;
}

export type StatutoryPensionScenarioId = "pessimistic" | "base" | "optimistic";
export type StatutoryPensionIncomeMode = "constant" | "income_projection";

export interface StatutoryPensionScenarioSettings {
  retirementAge: number;
  incomeMode: StatutoryPensionIncomeMode;
  annualPensionIncreasePercent: number;
  taxRatePercent: number;
  healthInsurancePercent: number;
  careInsurancePercent: number;
}

export interface StatutoryPensionSettings {
  contributionRatePercent: number;
  averageAnnualIncome: number;
  currentPensionValue: number;
  projectionPensionValue: number;
  annualContributionCeilingGross: number;
  scenarios: Record<StatutoryPensionScenarioId, StatutoryPensionScenarioSettings>;
}

export interface IncomeYearEntry {
  id: string;
  active: boolean;
  visible: boolean;
  year: number;
  label: string;
  person: IncomePerson;
  annualNetIncome: number | null;
  annualGrossIncome: number | null;
  taxesAndDeductions: number | null;
  taxDeductionItems: IncomeTaxDeductionItems;
  taxAdjustment: IncomeTaxAdjustment;
  capitalGainsAllowance: number | null;
  capitalGainsChurchTaxEnabled: boolean;
  capitalGainsChurchTaxRatePercent: number;
  employmentContext?: IncomeEmploymentContext;
  minijobType?: IncomeMinijobType;
  considerPensionInsurance?: boolean;
  isRvExempt?: boolean;
  shortTermEmploymentDays?: number | null;
  shortTermEmploymentMonths?: number | null;
  studentEmploymentMode?: IncomeStudentEmploymentMode;
  requiresManualTaxReview?: boolean;
  employer: string;
  note: string;
  source: IncomeYearEntrySource;
}

export interface IncomeTaxDeductionItems {
  wageTax: number | null;
  solidaritySurcharge: number | null;
  churchTax: number | null;
  capitalGainsTax: number | null;
  capitalGainsSolidaritySurcharge: number | null;
  capitalGainsChurchTax: number | null;
  pensionInsurance: number | null;
  healthInsurance: number | null;
  careInsurance: number | null;
  unemploymentInsurance: number | null;
  employerPensionInsurance: number | null;
}

export type IncomeTaxDeductionField = keyof IncomeTaxDeductionItems;

export interface IncomeTaxAdjustment {
  type: IncomeTaxAdjustmentType;
  amount: number | null;
}

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

export interface IncomePlanningSlot {
  id: string;
  day: IncomePlanningWeekday;
  startTime: string;
  endTime: string;
  flexible: boolean;
  durationMinutes: number;
  pauseEnabled?: boolean;
  pauseStartTime?: string;
  pauseEndTime?: string;
  pauseDurationMinutes?: number;
}

export interface IncomePlanningSleepSlot {
  id: string;
  day: IncomePlanningWeekday;
  startTime: string;
  endTime: string;
  flexible: boolean;
  durationMinutes: number;
  scenarioIds?: IncomePlanningWeekScenarioId[];
}

export interface IncomePlanningWorkBlock {
  id: string;
  active: boolean;
  category: IncomePlanningCategory;
  name: string;
  description: string;
  color?: string;
  slots: IncomePlanningSlot[];
  scenarioIds?: IncomePlanningWeekScenarioId[];
}

export interface IncomePlanningHabit {
  id: string;
  active: boolean;
  type: IncomePlanningHabitType;
  name: string;
  description: string;
  timing: string;
  durationMinutes: number;
  durationUnit: IncomePlanningHabitDurationUnit;
  goalChange: IncomePlanningHabitChange;
  replacementHabit: string;
  status: IncomePlanningHabitStatus;
  priority: IncomePlanningPriority;
  icon?: string;
  slots: IncomePlanningSlot[];
  scenarioIds?: IncomePlanningWeekScenarioId[];
}

export interface IncomePlanningManualBlock {
  id: string;
  active: boolean;
  type: IncomePlanningManualBlockType;
  name: string;
  description: string;
  color?: string;
  icon?: string;
  slots: IncomePlanningSlot[];
  scenarioIds?: IncomePlanningWeekScenarioId[];
}

export interface IncomePlanningCalendarStamp {
  id: string;
  day: IncomePlanningWeekday;
  startTime: string;
  icon: string;
  label: string;
  scenarioIds?: IncomePlanningWeekScenarioId[];
}

export interface IncomePlanningPlannedStamp {
  id: string;
  date: string;
  startTime: string;
  icon: string;
  label: string;
  description: string;
  scenarioIds?: IncomePlanningWeekScenarioId[];
}

export interface IncomePlanningWeekScenario {
  id: IncomePlanningWeekScenarioId;
  label: string;
}

export interface IncomePlanningWeekScenarioAssignment {
  weekStartDate: string;
  scenarioId: IncomePlanningWeekScenarioId;
}

export interface IncomePlanningAssumptions {
  sleepHoursPerDay: number;
  sleepSlots: IncomePlanningSleepSlot[];
}

export interface IncomePlanningState {
  workBlocks: IncomePlanningWorkBlock[];
  habits: IncomePlanningHabit[];
  manualBlocks: IncomePlanningManualBlock[];
  calendarStamps: IncomePlanningCalendarStamp[];
  plannedStamps: IncomePlanningPlannedStamp[];
  weekScenarios: IncomePlanningWeekScenario[];
  weekScenarioAssignments: IncomePlanningWeekScenarioAssignment[];
  assumptions: IncomePlanningAssumptions;
}

export interface CombinedWealthYear {
  year: number;
  cashValue: number;
  depotValue: number;
  depotBreakdown: Array<{ id: CombinedWealthDepotKey; label: string; value: number }>;
  withdrawalImpact: number;
  redirectedCashRepayment: number;
  redirectedDepotRepayment: number;
  pensionIncome: number;
  pensionConsumed: number;
  pensionConsumedValue: number;
  pensionSaved: number;
  pensionSavingsValue: number;
  depotTaxValue: number;
  pensionTaxValue: number;
  taxValue: number;
  cumulativeTaxValue: number;
  propertyValue: number;
  propertyDebt: number;
  propertyLoanStart: number;
  propertyEquity: number;
  propertyAssetValue: number;
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
  statutoryPension: StatutoryPensionSettings;
  incomeTracker: IncomeTrackerState;
  incomePlanning: IncomePlanningState;
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
