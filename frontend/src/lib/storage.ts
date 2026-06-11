import {
  createId,
  defaultAppUiState,
  defaultAppState,
  defaultCombinedWealthToggles,
  defaultIncomePlanningState,
  defaultIncomeTrackerState,
  defaultInvestmentSettings,
  defaultInvestmentSettingsForNewAccount,
  defaultPlanningAccounts,
  defaultPlanningSettings,
  defaultPositionTableViewState,
  defaultRealEstateFinancingSettings,
  defaultRepaymentSourceToggles,
  defaultStatutoryPensionSettings
} from "../data/defaults";
import { DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT } from "../domain/incomeTracker";
import {
  buildDefaultIncomePlanningSleepSlots,
  buildIncomePlanningManualBlock,
  buildIncomePlanningWorkBlock,
  defaultIncomePlanningAssumptions,
  INCOME_PLANNING_CATEGORY_IDS,
  incomePlanningCategoryConfig,
  incomePlanningDefaultManualColor,
  incomePlanningDefaultManualIcon,
  incomePlanningDefaultWorkColor,
  incomePlanningSleepSlotDurationMinutes,
  incomePlanningStripSlotPause,
  isIncomePlanningHabitChange,
  isIncomePlanningHabitDurationUnit,
  isIncomePlanningHabitStatus,
  isIncomePlanningHabitType,
  isIncomePlanningManualBlockType,
  isIncomePlanningPriority,
  isIncomePlanningWeekScenarioId,
  isIncomePlanningWeekday
} from "../domain/incomePlanning";
import { normalizeIncomeTaxRuleLabel } from "../domain/incomeTaxRules";
import { STATUTORY_PENSION_DEDUCTION_PERCENT_MAX } from "../domain/statutoryPension";
import { defaultPositionIconForPosition, normalizePositionIcon } from "./positionIcons";
import { flowForType, isIncomeType, isPositionType, typeForFlow } from "./positionKinds";
import {
  isPositionTableColumn,
  isPositionTableColumnInMode,
  isPositionTableMode,
  isPositionTableOperator,
  positionTableOperatorsForColumn
} from "./positionTableView";
import type {
  AppSectionId,
  AppState,
  AppUiState,
  CareerMilestone,
  CareerMilestoneImpact,
  CombinedWealthDepotKey,
  CombinedWealthToggles,
  IncomePlanningAssumptions,
  IncomePlanningCalendarStamp,
  IncomePlanningCategory,
  IncomePlanningHabit,
  IncomePlanningManualBlock,
  IncomePlanningPlannedStamp,
  IncomePlanningSleepSlot,
  IncomePlanningSlot,
  IncomePlanningState,
  IncomePlanningWeekScenarioAssignment,
  IncomePlanningWorkBlock,
  IncomePerson,
  IncomeProjectionMode,
  IncomeEmploymentContext,
  IncomeMinijobType,
  IncomeStudentEmploymentMode,
  IncomeTaxAdjustment,
  IncomeTaxAdjustmentType,
  IncomeTaxDeductionField,
  IncomeTaxDeductionItems,
  IncomeTrackerSettings,
  IncomeTrackerState,
  IncomeYearEntry,
  IncomeYearEntrySource,
  InvestmentDepotKey,
  InvestmentSettings,
  PlanningAccount,
  PlanningSettings,
  PositionCostBreakdownItem,
  PositionTableFilter,
  PositionTableMode,
  PositionTableView,
  PositionTableViewState,
  PositionFlow,
  RealEstateFinancingSettings,
  RepaymentSourceToggle,
  ReservePosition,
  StatutoryPensionIncomeMode,
  StatutoryPensionScenarioId,
  StatutoryPensionScenarioSettings,
  StatutoryPensionSettings,
  ThemeMode
} from "../types";

const STORAGE_KEY = "blobfin.reserveCalculator.v1";
const INCOME_TAX_DEDUCTION_FIELDS: IncomeTaxDeductionField[] = [
  "wageTax",
  "solidaritySurcharge",
  "churchTax",
  "capitalGainsTax",
  "capitalGainsSolidaritySurcharge",
  "capitalGainsChurchTax",
  "pensionInsurance",
  "healthInsurance",
  "careInsurance",
  "unemploymentInsurance",
  "employerPensionInsurance"
];
const LEGACY_STORAGE_KEY = "jahreskalkulatorState";

export function loadState(storage: Storage = localStorage): AppState {
  const saved = storage.getItem(STORAGE_KEY);
  if (saved) {
    return normalizeState(JSON.parse(saved));
  }

  const legacy = storage.getItem(LEGACY_STORAGE_KEY);
  if (legacy) {
    return normalizeLegacyState(JSON.parse(legacy));
  }

  return defaultAppState();
}

export function saveState(state: AppState, storage: Storage = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetStoredState(storage: Storage = localStorage): AppState {
  const state = defaultAppState();
  saveState(state, storage);
  return state;
}

function normalizeState(value: unknown): AppState {
  const fallback = defaultAppState();
  if (!isRecord(value)) return fallback;
  let settings = normalizePlanningSettings(value.settings);
  const legacyPositions = migrateMonthlyNetIncomePosition(
    settings,
    normalizePositions(value.positions, fallback.positions, settings.year)
  );
  const planningAccounts = normalizePlanningAccounts(value.planningAccounts, legacyPositions, settings.year);
  const ui = normalizeAppUiState(value.ui, planningAccounts);
  const positions = positionsForPlanningAccount(planningAccounts, ui.selectedPlanningAccountId, legacyPositions);
  let combinedWealth = normalizeCombinedWealthToggles(value.combinedWealth);
  const realEstate = normalizeRealEstatePurchaseActivation(
    normalizeRealEstateFinancingSettings(value.realEstate),
    combinedWealth
  );
  const normalizedInvestment = normalizeInvestmentSettings(value.investment);
  if (!hasPlanningEndDate(value.settings)) {
    settings = {
      ...settings,
      endDate: planningEndDateFromInvestment(normalizedInvestment, settings.year)
    };
  }
  const investmentByAccountId = normalizeInvestmentByAccountId(
    value.investmentByAccountId,
    planningAccounts,
    normalizedInvestment,
    ui.selectedInvestmentAccountId
  );
  const investment = investmentForAccount(investmentByAccountId, ui.selectedInvestmentAccountId);
  combinedWealth = normalizeCombinedCashPositionIds(
    combinedWealth,
    planningAccounts,
    realEstate,
    investmentByAccountId
  );

  return {
    theme: normalizeThemeMode(value.theme, fallback.theme),
    settings: { ...settings, monthlyNetIncome: 0 },
    planningAccounts,
    ui,
    realEstate,
    combinedWealth,
    statutoryPension: normalizeStatutoryPensionSettings(value.statutoryPension),
    incomeTracker: normalizeIncomeTrackerState(value.incomeTracker),
    incomePlanning: normalizeIncomePlanningState(value.incomePlanning),
    positions,
    investmentByAccountId,
    investment,
    positionTableView: normalizePositionTableViewState(value.positionTableView)
  };
}

function normalizeLegacyState(value: unknown): AppState {
  const fallback = defaultAppState();
  if (!isRecord(value)) return fallback;
  const investment = normalizeLegacyInvestmentSettings(value.investmentSettings);
  const year = numberOrDefault(value.year, fallback.settings.year);
  const settings = {
    ...defaultPlanningSettings(),
    year,
    monthlyNetIncome: numberOrDefault(value.monthlyNetIncome, fallback.settings.monthlyNetIncome),
    interestRatePercent: numberOrDefault(value.interestRate, fallback.settings.interestRatePercent),
    cashbackRatePercent: numberOrDefault(value.cashbackRate, fallback.settings.cashbackRatePercent),
    endDate: normalizePlanningEndDate(value.endDate, planningEndDateFromInvestment(investment, year), year),
    emergencyFund: 0
  };
  const legacyPositions = migrateMonthlyNetIncomePosition(
    settings,
    normalizePositions(value.positions, fallback.positions, settings.year)
  );
  const planningAccounts = normalizePlanningAccounts(undefined, legacyPositions, settings.year);
  const ui = normalizeAppUiState(undefined, planningAccounts);
  const positions = positionsForPlanningAccount(planningAccounts, ui.selectedPlanningAccountId, legacyPositions);
  const investmentByAccountId = normalizeInvestmentByAccountId(
    undefined,
    planningAccounts,
    investment,
    ui.selectedInvestmentAccountId
  );

  return {
    theme: normalizeThemeMode(value.theme, fallback.theme),
    settings: { ...settings, monthlyNetIncome: 0 },
    planningAccounts,
    ui,
    realEstate: defaultRealEstateFinancingSettings(),
    combinedWealth: defaultCombinedWealthToggles(),
    statutoryPension: defaultStatutoryPensionSettings(),
    incomeTracker: defaultIncomeTrackerState(),
    incomePlanning: defaultIncomePlanningState(),
    positions,
    investmentByAccountId,
    investment,
    positionTableView: defaultPositionTableViewState()
  };
}

function normalizePositionTableViewState(value: unknown): PositionTableViewState {
  const fallback = defaultPositionTableViewState();
  if (!isRecord(value)) return fallback;
  return {
    income: normalizePositionTableView("income", value.income),
    expense: normalizePositionTableView("expense", value.expense),
    reserve: normalizePositionTableView("reserve", value.reserve),
    savings: normalizePositionTableView("savings", value.savings)
  };
}

function normalizePositionTableView(mode: PositionTableMode, value: unknown): PositionTableView {
  if (!isRecord(value)) return { filters: [], sort: null, selectedLabels: [] };
  const filters = Array.isArray(value.filters)
    ? value.filters
        .map((item) => normalizePositionTableFilter(mode, item))
        .filter((filter): filter is PositionTableFilter => filter !== null)
    : [];
  const sort = normalizePositionTableSort(mode, value.sort);
  return { filters, sort, selectedLabels: normalizeSelectedPositionLabels(value.selectedLabels) };
}

function normalizeSelectedPositionLabels(value: unknown): string[] {
  return Array.from(new Set(stringArrayOrDefault(value, []).map((label) => normalizePositionIcon(label))));
}

function normalizePositionTableFilter(mode: PositionTableMode, value: unknown): PositionTableFilter | null {
  if (!isRecord(value)) return null;
  if (!isPositionTableMode(mode) || !isPositionTableColumn(value.column)) return null;
  if (!isPositionTableColumnInMode(mode, value.column)) return null;
  if (!isPositionTableOperator(value.operator)) return null;
  if (!positionTableOperatorsForColumn(mode, value.column).includes(value.operator)) return null;
  const filterValue = String(value.value ?? "").trim();
  if (!filterValue) return null;
  return {
    id: String(value.id || createId()),
    column: value.column,
    operator: value.operator,
    value: filterValue
  };
}

function normalizePositionTableSort(mode: PositionTableMode, value: unknown): PositionTableView["sort"] {
  if (!isRecord(value)) return null;
  if (!isPositionTableColumn(value.column) || !isPositionTableColumnInMode(mode, value.column)) return null;
  if (value.direction !== "asc" && value.direction !== "desc") return null;
  return {
    column: value.column,
    direction: value.direction
  };
}

function normalizeThemeMode(value: unknown, fallback: ThemeMode): ThemeMode {
  return value === "dark" || value === "light" ? value : fallback;
}

function normalizePlanningSettings(value: unknown): PlanningSettings {
  const fallback = defaultPlanningSettings();
  if (!isRecord(value)) return fallback;
  const year = numberOrDefault(value.year, fallback.year);
  return {
    year,
    monthlyNetIncome: numberOrDefault(value.monthlyNetIncome, fallback.monthlyNetIncome),
    interestRatePercent: numberOrDefault(value.interestRatePercent, fallback.interestRatePercent),
    cashbackRatePercent: numberOrDefault(value.cashbackRatePercent, fallback.cashbackRatePercent),
    endDate: normalizePlanningEndDate(value.endDate, fallback.endDate, year),
    emergencyFund: 0
  };
}

function hasPlanningEndDate(value: unknown): boolean {
  return isRecord(value) && validPlanningEndDate(value.endDate);
}

function normalizePlanningEndDate(value: unknown, fallback: string, minYear: number): string {
  const fallbackParts = planningEndDateParts(fallback) ?? {
    year: defaultPlanningSettings().year,
    month: 12,
    day: 31
  };
  const parsed = planningEndDateParts(value) ?? fallbackParts;
  const minimumYear = Math.round(minYear);
  if (parsed.year < minimumYear) {
    return `${clampYear(minimumYear, 2000, 2200)}-12-31`;
  }
  const year = clampYear(parsed.year, 2000, 2200);
  return `${year}-${String(parsed.month).padStart(2, "0")}-${String(parsed.day).padStart(2, "0")}`;
}

function validPlanningEndDate(value: unknown): boolean {
  return planningEndDateParts(value) !== null;
}

function planningEndDateParts(value: unknown): { year: number; month: number; day: number } | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { year: Math.round(value), month: 12, day: 31 };
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const yearOnly = /^(\d{4})$/.exec(trimmed);
  if (yearOnly) {
    return { year: Number(yearOnly[1]), month: 12, day: 31 };
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  const maxDay = new Date(year, month, 0).getDate();
  if (day < 1 || day > maxDay) return null;
  return { year, month, day };
}

function planningEndDateFromInvestment(investment: InvestmentSettings, fallbackYear: number): string {
  const endYear = Math.max(
    Math.round(fallbackYear),
    Math.round(numberOrDefault(investment.birthYear, fallbackYear) + numberOrDefault(investment.payoutEndAge, 0))
  );
  return `${clampYear(endYear, 2000, 2200)}-12-31`;
}

function clampYear(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizePlanningAccounts(
  value: unknown,
  fallbackPositions: ReservePosition[],
  fallbackYear: number
): PlanningAccount[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [fallbackPlanningAccount(fallbackPositions)];
  }

  const accounts = value
    .map((item) => normalizePlanningAccount(item, fallbackYear))
    .filter((account): account is PlanningAccount => account !== null);

  if (accounts.length === 0) {
    return [fallbackPlanningAccount(fallbackPositions)];
  }
  return accounts;
}

function normalizePlanningAccount(value: unknown, fallbackYear: number): PlanningAccount | null {
  if (!isRecord(value)) return null;
  const sourceRows = value.yearlyRows ?? value.positions;
  const yearlyRows =
    Array.isArray(sourceRows) && sourceRows.length === 0
      ? []
      : normalizePositions(sourceRows, defaultPlanningAccounts()[0].yearlyRows, fallbackYear);
  return {
    id: String(value.id || createId()),
    name: String(value.name || "Konto"),
    type: normalizePlanningAccountType(value.type),
    yearlyRows,
    metadata: isRecord(value.metadata) ? value.metadata : undefined
  };
}

function normalizePlanningAccountType(value: unknown): PlanningAccount["type"] {
  if (value === "cost_reserve" || value === "annual_table" || value === "mixed") return value;
  return "mixed";
}

function normalizeAppUiState(value: unknown, accounts: PlanningAccount[]): AppUiState {
  const fallback = defaultAppUiState();
  const firstAccountId = accounts[0]?.id ?? fallback.selectedPlanningAccountId;
  const accountIds = accounts.map((account) => account.id);
  if (!isRecord(value)) {
    return {
      ...fallback,
      selectedPlanningYear: fallback.selectedPlanningYear,
      selectedPlanningAccountId: firstAccountId,
      selectedInvestmentAccountId: firstAccountId,
      selectedRealEstateAccountIds: accountIds,
      selectedRealEstateWithdrawalGainAccountIds: accountIds,
      selectedCombinedAccountIds: accountIds,
      selectedCombinedLeadInvestmentAccountId: firstAccountId
    };
  }

  const selectedPlanningAccountId = String(value.selectedPlanningAccountId || firstAccountId);
  const planningAccountExists = accounts.some((account) => account.id === selectedPlanningAccountId);
  const normalizedPlanningAccountId = planningAccountExists ? selectedPlanningAccountId : firstAccountId;
  const selectedInvestmentAccountId = String(value.selectedInvestmentAccountId || normalizedPlanningAccountId);
  const investmentAccountExists = accounts.some((account) => account.id === selectedInvestmentAccountId);
  const normalizedInvestmentAccountId = investmentAccountExists
    ? selectedInvestmentAccountId
    : normalizedPlanningAccountId;
  const selectedRealEstateAccountIds = normalizeSelectedAccountIds(value.selectedRealEstateAccountIds, accountIds, accountIds);
  const selectedCombinedAccountIds = normalizeSelectedAccountIds(value.selectedCombinedAccountIds, accountIds, accountIds);
  const selectedCombinedLeadInvestmentAccountId = String(
    value.selectedCombinedLeadInvestmentAccountId || normalizedInvestmentAccountId
  );
  const leadInCombinedSelection = selectedCombinedAccountIds.includes(selectedCombinedLeadInvestmentAccountId);
  const normalizedCombinedLeadInvestmentAccountId = leadInCombinedSelection
    ? selectedCombinedLeadInvestmentAccountId
    : selectedCombinedAccountIds[0] ?? normalizedInvestmentAccountId;

  return {
    activeSection: normalizeAppSectionId(value.activeSection, fallback.activeSection),
    selectedPlanningYear: normalizePlanningYearSelection(value.selectedPlanningYear, fallback.selectedPlanningYear),
    selectedPlanningAccountId: normalizedPlanningAccountId,
    selectedInvestmentAccountId: normalizedInvestmentAccountId,
    selectedRealEstateAccountIds,
    selectedRealEstateWithdrawalGainAccountIds: selectedRealEstateAccountIds,
    selectedCombinedAccountIds,
    selectedCombinedLeadInvestmentAccountId: normalizedCombinedLeadInvestmentAccountId,
    settingsGrunddatenExpanded: booleanOrDefault(
      value.settingsGrunddatenExpanded,
      fallback.settingsGrunddatenExpanded
    )
  };
}

function normalizeSelectedAccountIds(value: unknown, accountIds: string[], fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const selected = value
    .map((item) => String(item))
    .filter((accountId, index, items) => items.indexOf(accountId) === index && accountIds.includes(accountId));
  return selected;
}

function normalizePlanningYearSelection(value: unknown, fallback: number | null): number | null {
  if (value === null || value === undefined || value === "" || value === "start") return null;
  const parsed = Math.round(numberOrDefault(value, Number.NaN));
  return Number.isFinite(parsed) && parsed >= 2000 && parsed <= 2200 ? parsed : fallback;
}

function normalizeInvestmentByAccountId(
  value: unknown,
  accounts: PlanningAccount[],
  primaryInvestment: InvestmentSettings,
  primaryAccountId: string
): Record<string, InvestmentSettings> {
  const byAccount = isRecord(value) ? value : null;
  const normalized: Record<string, InvestmentSettings> = {};

  for (const account of accounts) {
    const storedInvestment = byAccount?.[account.id];
    normalized[account.id] = isRecord(storedInvestment)
      ? normalizeInvestmentSettings(storedInvestment)
      : account.id === primaryAccountId
        ? primaryInvestment
        : defaultInvestmentSettingsForNewAccount();
  }

  if (!normalized[primaryAccountId]) {
    normalized[primaryAccountId] = primaryInvestment;
  }

  return normalized;
}

function investmentForAccount(
  investmentsByAccount: Record<string, InvestmentSettings>,
  accountId: string
): InvestmentSettings {
  return investmentsByAccount[accountId] ?? defaultInvestmentSettingsForNewAccount();
}

function normalizeAppSectionId(value: unknown, fallback: AppSectionId): AppSectionId {
  if (value === "grunddaten") {
    return "home";
  }
  if (
    value === "income" ||
    value === "income_tracking" ||
    value === "income_status" ||
    value === "income_charts" ||
    value === "income_overview"
  ) {
    return "income";
  }
  if (
    value === "planning_scenarios" ||
    value === "cost_reserve_positions" ||
    value === "year_table" ||
    value === "investment_planning" ||
    value === "investment_overview"
  ) {
    return "planning_scenarios";
  }
  if (
    value === "home" ||
    value === "income_planning" ||
    value === "income_stamp_planner" ||
    value === "real_estate_financing" ||
    value === "statutory_pension" ||
    value === "combined_wealth"
  ) {
    return value;
  }
  return fallback;
}

function positionsForPlanningAccount(
  accounts: PlanningAccount[],
  selectedPlanningAccountId: string,
  fallbackPositions: ReservePosition[]
): ReservePosition[] {
  return accounts.find((account) => account.id === selectedPlanningAccountId)?.yearlyRows ?? fallbackPositions;
}

function fallbackPlanningAccount(positions: ReservePosition[]): PlanningAccount {
  return {
    ...defaultPlanningAccounts()[0],
    yearlyRows: positions
  };
}

function normalizeRealEstateFinancingSettings(value: unknown): RealEstateFinancingSettings {
  const fallback = defaultRealEstateFinancingSettings();
  if (!isRecord(value)) return fallback;
  const financingStartAge = numberOrDefault(value.financingStartAge, fallback.financingStartAge);
  const financingYears = numberOrDefault(value.financingYears, fallback.financingYears);
  const legacyEndAge = financingStartAge > 0 ? financingStartAge + financingYears : fallback.financingEndAge;
  return {
    locale: "de",
    purchaseActivated: booleanOrDefault(value.purchaseActivated, fallback.purchaseActivated),
    purchasePrice: numberOrDefault(value.purchasePrice, fallback.purchasePrice),
    constructionOrRenovationCosts: numberOrDefault(
      value.constructionOrRenovationCosts,
      fallback.constructionOrRenovationCosts
    ),
    landCosts: numberOrDefault(value.landCosts, fallback.landCosts),
    additionalPurchaseCosts: numberOrDefault(value.additionalPurchaseCosts, fallback.additionalPurchaseCosts),
    notaryCosts: numberOrDefault(value.notaryCosts, fallback.notaryCosts),
    landRegistryCosts: numberOrDefault(value.landRegistryCosts, fallback.landRegistryCosts),
    brokerCosts: numberOrDefault(value.brokerCosts, fallback.brokerCosts),
    transferTax: numberOrDefault(value.transferTax, fallback.transferTax),
    modernizationReserve: numberOrDefault(value.modernizationReserve, fallback.modernizationReserve),
    movingAndSetupCosts: numberOrDefault(value.movingAndSetupCosts, fallback.movingAndSetupCosts),
    safetyBuffer: numberOrDefault(value.safetyBuffer, fallback.safetyBuffer),
    equityCapital: numberOrDefault(value.equityCapital, fallback.equityCapital),
    loanAmount: numberOrDefault(value.loanAmount, fallback.loanAmount),
    interestRatePercent: numberOrDefault(value.interestRatePercent, fallback.interestRatePercent),
    initialRepaymentPercent: numberOrDefault(value.initialRepaymentPercent, fallback.initialRepaymentPercent),
    monthlyPayment: numberOrDefault(value.monthlyPayment, fallback.monthlyPayment),
    fixedInterestYears: numberOrDefault(value.fixedInterestYears, fallback.fixedInterestYears),
    targetTermYears: numberOrDefault(value.targetTermYears, fallback.targetTermYears),
    specialRepaymentAmount: numberOrDefault(value.specialRepaymentAmount, fallback.specialRepaymentAmount),
    specialRepaymentRhythm: normalizeSpecialRepaymentRhythm(
      value.specialRepaymentRhythm,
      fallback.specialRepaymentRhythm
    ),
    remainingDebtAfterFixedInterest: numberOrDefault(
      value.remainingDebtAfterFixedInterest,
      fallback.remainingDebtAfterFixedInterest
    ),
    financingStartAge,
    financingEndAge: numberOrDefault(value.financingEndAge, legacyEndAge),
    plannedSaleYear: nullableNumberOrDefault(value.plannedSaleYear, fallback.plannedSaleYear),
    estimatedSaleValue: nullableNumberOrDefault(value.estimatedSaleValue, fallback.estimatedSaleValue),
    targetFullRepaymentYear: nullableNumberOrDefault(value.targetFullRepaymentYear, fallback.targetFullRepaymentYear),
    targetMonthlyBurden: numberOrDefault(value.targetMonthlyBurden, fallback.targetMonthlyBurden),
    maxMonthlyBurden: numberOrDefault(value.maxMonthlyBurden, fallback.maxMonthlyBurden),
    subsidyAmount: numberOrDefault(value.subsidyAmount, fallback.subsidyAmount),
    propertyValueGrowthPercent: numberOrDefault(value.propertyValueGrowthPercent, fallback.propertyValueGrowthPercent),
    inflationRatePercent: numberOrDefault(value.inflationRatePercent, fallback.inflationRatePercent),
    financingYears,
    manualFuturePropertyValue: nullableNumberOrDefault(value.manualFuturePropertyValue, fallback.manualFuturePropertyValue),
    repaymentSources: normalizeRepaymentSourceToggles(value.repaymentSources),
    equityCapitalSourceIds: stringArrayOrDefault(value.equityCapitalSourceIds, fallback.equityCapitalSourceIds),
    monthlyPaymentSourceIds: stringArrayOrDefault(value.monthlyPaymentSourceIds, fallback.monthlyPaymentSourceIds),
    specialRepaymentSourceIds: stringArrayOrDefault(value.specialRepaymentSourceIds, fallback.specialRepaymentSourceIds),
    includeWithdrawalGainAsPaymentSource: booleanOrDefault(
      value.includeWithdrawalGainAsPaymentSource,
      fallback.includeWithdrawalGainAsPaymentSource
    )
  };
}

function normalizeRealEstatePurchaseActivation(
  realEstate: RealEstateFinancingSettings,
  combinedWealth: CombinedWealthToggles
): RealEstateFinancingSettings {
  if (realEstate.purchaseActivated || !combinedWealth.includeRealEstateFinancing) return realEstate;
  return hasCustomRealEstateScenario(realEstate) ? { ...realEstate, purchaseActivated: true } : realEstate;
}

function hasCustomRealEstateScenario(realEstate: RealEstateFinancingSettings): boolean {
  const fallback = defaultRealEstateFinancingSettings();
  const numericFields: Array<keyof RealEstateFinancingSettings> = [
    "purchasePrice",
    "constructionOrRenovationCosts",
    "landCosts",
    "additionalPurchaseCosts",
    "notaryCosts",
    "landRegistryCosts",
    "brokerCosts",
    "transferTax",
    "modernizationReserve",
    "movingAndSetupCosts",
    "safetyBuffer",
    "interestRatePercent",
    "financingStartAge",
    "propertyValueGrowthPercent"
  ];
  const numericChanged = numericFields.some((field) => Number(realEstate[field]) !== Number(fallback[field]));
  return (
    numericChanged ||
    realEstate.plannedSaleYear !== fallback.plannedSaleYear ||
    realEstate.estimatedSaleValue !== fallback.estimatedSaleValue ||
    realEstate.equityCapitalSourceIds.length > 0 ||
    realEstate.monthlyPaymentSourceIds.length > 0 ||
    realEstate.specialRepaymentSourceIds.length > 0 ||
    realEstate.includeWithdrawalGainAsPaymentSource ||
    realEstate.repaymentSources.useDepotSavingsRateAsRepayment ||
    realEstate.repaymentSources.useLegacySavingsRateAsRepayment ||
    realEstate.repaymentSources.useNetGainAsRepayment ||
    realEstate.repaymentSources.useWithdrawalGainAsRepayment
  );
}

function normalizeRepaymentSourceToggles(value: unknown): RepaymentSourceToggle {
  const fallback = defaultRepaymentSourceToggles();
  if (!isRecord(value)) return fallback;
  return {
    useWithdrawalGainAsRepayment: booleanOrDefault(
      value.useWithdrawalGainAsRepayment,
      fallback.useWithdrawalGainAsRepayment
    ),
    useDepotSavingsRateAsRepayment: booleanOrDefault(
      value.useDepotSavingsRateAsRepayment,
      fallback.useDepotSavingsRateAsRepayment
    ),
    useLegacySavingsRateAsRepayment: booleanOrDefault(
      value.useLegacySavingsRateAsRepayment,
      fallback.useLegacySavingsRateAsRepayment
    ),
    useNetGainAsRepayment: booleanOrDefault(value.useNetGainAsRepayment, fallback.useNetGainAsRepayment),
    onlyUsePositiveValues: booleanOrDefault(value.onlyUsePositiveValues, fallback.onlyUsePositiveValues)
  };
}

function normalizeCombinedWealthToggles(value: unknown): CombinedWealthToggles {
  const fallback = defaultCombinedWealthToggles();
  if (!isRecord(value)) return fallback;
  return {
    includeCashPositions: booleanOrDefault(value.includeCashPositions, fallback.includeCashPositions),
    includeCostReserveAccounts: booleanOrDefault(
      value.includeCostReserveAccounts,
      fallback.includeCostReserveAccounts
    ),
    includeAnnualTableAccounts: booleanOrDefault(value.includeAnnualTableAccounts, fallback.includeAnnualTableAccounts),
    includeDepotDevelopment: booleanOrDefault(value.includeDepotDevelopment, fallback.includeDepotDevelopment),
    includeSharedDepotDevelopment: booleanOrDefault(
      value.includeSharedDepotDevelopment,
      fallback.includeSharedDepotDevelopment
    ),
    includeWithdrawals: booleanOrDefault(value.includeWithdrawals, fallback.includeWithdrawals),
    includeRealEstateFinancing: booleanOrDefault(value.includeRealEstateFinancing, fallback.includeRealEstateFinancing),
    includeRealEstateValueTrend: booleanOrDefault(value.includeRealEstateValueTrend, fallback.includeRealEstateValueTrend),
    includeStatutoryPension: booleanOrDefault(value.includeStatutoryPension, fallback.includeStatutoryPension),
    cashAccountId: typeof value.cashAccountId === "string" && value.cashAccountId.trim() ? value.cashAccountId : fallback.cashAccountId,
    cashPositionIds: Array.from(new Set(stringArrayOrDefault(value.cashPositionIds, fallback.cashPositionIds))),
    depotKeys: normalizeCombinedWealthDepotKeys(value.depotKeys, fallback.depotKeys),
    statutoryPensionScenario: normalizeStatutoryPensionScenarioId(
      value.statutoryPensionScenario,
      fallback.statutoryPensionScenario
    ),
    statutoryPensionMonthlyAmount: Math.max(
      0,
      numberOrDefault(value.statutoryPensionMonthlyAmount, fallback.statutoryPensionMonthlyAmount)
    ),
    statutoryPensionSavingsRatePercent: clampNumber(
      numberOrDefault(value.statutoryPensionSavingsRatePercent, fallback.statutoryPensionSavingsRatePercent),
      0,
      100
    )
  };
}

function normalizeCombinedWealthDepotKeys(
  value: unknown,
  fallback: CombinedWealthDepotKey[]
): CombinedWealthDepotKey[] {
  const keys = stringArrayOrDefault(value, fallback).filter(
    (key): key is CombinedWealthDepotKey => key === "standard" || key === "retirement" || key === "child"
  );
  return Array.from(new Set(keys)).length ? Array.from(new Set(keys)) : fallback;
}

function normalizeCombinedCashPositionIds(
  combinedWealth: CombinedWealthToggles,
  planningAccounts: PlanningAccount[],
  realEstate: RealEstateFinancingSettings,
  investmentByAccountId: Record<string, InvestmentSettings>
): CombinedWealthToggles {
  const account =
    planningAccounts.find((item) => item.id === combinedWealth.cashAccountId) ?? planningAccounts[0] ?? null;
  if (!account) return { ...combinedWealth, cashPositionIds: [] };

  const blockedIds = new Set<string>([
    ...realEstate.equityCapitalSourceIds,
    ...realEstate.monthlyPaymentSourceIds,
    ...realEstate.specialRepaymentSourceIds
  ]);
  for (const settings of Object.values(investmentByAccountId)) {
    for (const id of settings.includedIds) blockedIds.add(id);
    for (const id of settings.retirementIncludedIds) blockedIds.add(id);
    for (const id of settings.childIncludedIds) blockedIds.add(id);
  }

  const selectableIds = new Set(
    account.yearlyRows
      .filter(
        (position) =>
          position.active &&
          position.type === "savings" &&
          position.flow === "expense" &&
          !blockedIds.has(position.id)
      )
      .map((position) => position.id)
  );
  const cashPositionIds = Array.from(new Set(combinedWealth.cashPositionIds)).filter((id) => selectableIds.has(id));
  return { ...combinedWealth, cashPositionIds };
}

function normalizeStatutoryPensionScenarioId(
  value: unknown,
  fallback: StatutoryPensionScenarioId
): StatutoryPensionScenarioId {
  return value === "pessimistic" || value === "base" || value === "optimistic" ? value : fallback;
}

function normalizeStatutoryPensionSettings(value: unknown): StatutoryPensionSettings {
  const fallback = defaultStatutoryPensionSettings();
  if (!isRecord(value)) return fallback;
  return {
    contributionRatePercent: statutoryPensionNumberOrFallback(
      value.contributionRatePercent,
      fallback.contributionRatePercent
    ),
    averageAnnualIncome: statutoryPensionNumberOrFallback(value.averageAnnualIncome, fallback.averageAnnualIncome),
    currentPensionValue: statutoryPensionNumberOrFallback(value.currentPensionValue, fallback.currentPensionValue),
    projectionPensionValue: statutoryPensionNumberOrFallback(
      value.projectionPensionValue,
      fallback.projectionPensionValue
    ),
    annualContributionCeilingGross: statutoryPensionNumberOrFallback(
      value.annualContributionCeilingGross,
      fallback.annualContributionCeilingGross
    ),
    scenarios: {
      pessimistic: normalizeStatutoryPensionScenario(value.scenarios, "pessimistic", fallback.scenarios.pessimistic),
      base: normalizeStatutoryPensionScenario(value.scenarios, "base", fallback.scenarios.base),
      optimistic: normalizeStatutoryPensionScenario(value.scenarios, "optimistic", fallback.scenarios.optimistic)
    }
  };
}

function normalizeStatutoryPensionScenario(
  scenarios: unknown,
  id: StatutoryPensionScenarioId,
  fallback: StatutoryPensionScenarioSettings
): StatutoryPensionScenarioSettings {
  const value = isRecord(scenarios) && isRecord(scenarios[id]) ? scenarios[id] : {};
  const useDeductionFallbacks = statutoryPensionUsesDeductionFallbacks(value);
  return {
    retirementAge: clampNumber(statutoryPensionNumberOrFallback(value.retirementAge, fallback.retirementAge), 67, 72),
    incomeMode: normalizeStatutoryPensionIncomeMode(value.incomeMode, fallback.incomeMode),
    annualPensionIncreasePercent: clampNumber(
      statutoryPensionNumberOrFallback(
        value.annualPensionIncreasePercent,
        fallback.annualPensionIncreasePercent
      ),
      0.1,
      2
    ),
    taxRatePercent: clampNumber(
      useDeductionFallbacks
        ? fallback.taxRatePercent
        : statutoryPensionNumberOrFallback(value.taxRatePercent, fallback.taxRatePercent),
      0,
      STATUTORY_PENSION_DEDUCTION_PERCENT_MAX
    ),
    healthInsurancePercent: clampNumber(
      useDeductionFallbacks
        ? fallback.healthInsurancePercent
        : statutoryPensionNumberOrFallback(value.healthInsurancePercent, fallback.healthInsurancePercent),
      0,
      STATUTORY_PENSION_DEDUCTION_PERCENT_MAX
    ),
    careInsurancePercent: clampNumber(
      useDeductionFallbacks
        ? fallback.careInsurancePercent
        : statutoryPensionNumberOrFallback(value.careInsurancePercent, fallback.careInsurancePercent),
      0,
      STATUTORY_PENSION_DEDUCTION_PERCENT_MAX
    )
  };
}

function statutoryPensionNumberOrFallback(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === "") return fallback;
  return numberOrDefault(value, fallback);
}

function statutoryPensionUsesDeductionFallbacks(value: Record<string, unknown>): boolean {
  return (
    statutoryPensionSavedNumber(value.healthInsurancePercent) === 0 &&
    statutoryPensionSavedNumber(value.careInsurancePercent) === 0
  );
}

function statutoryPensionSavedNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeStatutoryPensionIncomeMode(
  value: unknown,
  fallback: StatutoryPensionIncomeMode
): StatutoryPensionIncomeMode {
  return value === "constant" || value === "income_projection" ? value : fallback;
}

function normalizeIncomePlanningState(value: unknown): IncomePlanningState {
  const fallback = defaultIncomePlanningState();
  if (!isRecord(value)) return fallback;
  const workBlocks = Array.isArray(value.workBlocks)
    ? value.workBlocks
        .map(normalizeIncomePlanningWorkBlock)
        .filter((block): block is IncomePlanningWorkBlock => block !== null)
    : Array.isArray(value.sources)
      ? value.sources
          .map(normalizeLegacyIncomePlanningSource)
          .filter((block): block is IncomePlanningWorkBlock => block !== null)
      : fallback.workBlocks;
  const manualBlocks = Array.isArray(value.manualBlocks)
    ? value.manualBlocks
        .map(normalizeIncomePlanningManualBlock)
        .filter((block): block is IncomePlanningManualBlock => block !== null)
    : isRecord(value.assumptions)
      ? migrateIncomePlanningAssumptionBlocks(value.assumptions)
      : fallback.manualBlocks;
  return {
    workBlocks,
    habits: Array.isArray(value.habits)
      ? value.habits.map(normalizeIncomePlanningHabit).filter((habit): habit is IncomePlanningHabit => habit !== null)
      : fallback.habits,
    manualBlocks,
    calendarStamps: Array.isArray(value.calendarStamps)
      ? value.calendarStamps
          .map(normalizeIncomePlanningCalendarStamp)
          .filter((stamp): stamp is IncomePlanningCalendarStamp => stamp !== null)
      : fallback.calendarStamps,
    plannedStamps: Array.isArray(value.plannedStamps)
      ? value.plannedStamps
          .map(normalizeIncomePlanningPlannedStamp)
          .filter((stamp): stamp is IncomePlanningPlannedStamp => stamp !== null)
      : fallback.plannedStamps,
    weekScenarioAssignments: Array.isArray(value.weekScenarioAssignments)
      ? normalizeIncomePlanningWeekScenarioAssignments(value.weekScenarioAssignments)
      : fallback.weekScenarioAssignments,
    assumptions: normalizeIncomePlanningAssumptions(value.assumptions)
  };
}

function normalizeIncomePlanningWorkBlock(value: unknown): IncomePlanningWorkBlock | null {
  if (!isRecord(value)) return null;
  const category = normalizeIncomePlanningCategory(value.category);
  const id = String(value.id || createId());
  const fallback = buildIncomePlanningWorkBlock(category, id);
  return {
    id,
    active: booleanOrDefault(value.active, true),
    category,
    name: String(value.name || fallback.name),
    description: String(value.description || ""),
    color: normalizeIncomePlanningColor(value.color, fallback.color ?? incomePlanningDefaultWorkColor(category)),
    slots: Array.isArray(value.slots)
      ? value.slots.map((slotValue) => normalizeIncomePlanningSlot(slotValue, "sunday", 60)).filter(isSlot)
      : fallback.slots
  };
}

function normalizeLegacyIncomePlanningSource(value: unknown): IncomePlanningWorkBlock | null {
  if (!isRecord(value)) return null;
  const category = normalizeIncomePlanningCategory(value.category);
  const id = String(value.id || createId());
  const config = incomePlanningCategoryConfig(category);
  const fallbackHours = config.defaultSlots.reduce((sum, slot) => sum + slot.durationMinutes, 0) / 60;
  const hoursPerWeek = clampNumber(numberOrDefault(value.hoursPerWeek, fallbackHours), 0, 168);
  return buildIncomePlanningWorkBlock(category, id, {
    active: booleanOrDefault(value.active, true),
    name: String(value.name || config.defaultName),
    description: "",
    slots: [
      {
        id: `${id}-legacy-slot`,
        day: "sunday",
        startTime: "00:00",
        endTime: "00:00",
        flexible: true,
        durationMinutes: Math.round(hoursPerWeek * 60)
      }
    ]
  });
}

function normalizeIncomePlanningHabit(value: unknown): IncomePlanningHabit | null {
  if (!isRecord(value)) return null;
  const fallback = defaultIncomePlanningState().habits[0];
  const durationMinutes = Math.round(clampNumber(numberOrDefault(value.durationMinutes, fallback.durationMinutes), 0, 1440));
  const type = isIncomePlanningHabitType(value.type) ? value.type : fallback.type;
  return {
    id: String(value.id || createId()),
    active: booleanOrDefault(value.active, true),
    type,
    name: String(value.name || fallback.name),
    description: String(value.description || ""),
    timing: String(value.timing || ""),
    durationMinutes,
    durationUnit: isIncomePlanningHabitDurationUnit(value.durationUnit) ? value.durationUnit : fallback.durationUnit,
    goalChange: isIncomePlanningHabitChange(value.goalChange) ? value.goalChange : fallback.goalChange,
    replacementHabit: String(value.replacementHabit || ""),
    status: isIncomePlanningHabitStatus(value.status) ? value.status : fallback.status,
    priority: isIncomePlanningPriority(value.priority) ? value.priority : fallback.priority,
    icon: normalizePositionIcon(value.icon, type === "bad" ? "snack" : "book"),
    slots: Array.isArray(value.slots)
      ? value.slots
          .map((slotValue) => normalizeIncomePlanningSlot(slotValue, "sunday", durationMinutes))
          .filter(isSlot)
          .map(incomePlanningStripSlotPause)
      : fallback.slots
  };
}

function normalizeIncomePlanningManualBlock(value: unknown): IncomePlanningManualBlock | null {
  if (!isRecord(value)) return null;
  const type = isIncomePlanningManualBlockType(value.type) ? value.type : "other_event";
  const fallback = buildIncomePlanningManualBlock(type, String(value.id || createId()));
  return {
    id: fallback.id,
    active: booleanOrDefault(value.active, true),
    type,
    name: String(value.name || fallback.name),
    description: String(value.description || ""),
    color: normalizeIncomePlanningColor(value.color, fallback.color ?? incomePlanningDefaultManualColor(type)),
    icon: normalizePositionIcon(value.icon, incomePlanningDefaultManualIcon(type)),
    slots: Array.isArray(value.slots)
      ? value.slots.map((slotValue) => normalizeIncomePlanningSlot(slotValue, "sunday", 60)).filter(isSlot)
      : fallback.slots
  };
}

function normalizeIncomePlanningCalendarStamp(value: unknown): IncomePlanningCalendarStamp | null {
  if (!isRecord(value)) return null;
  const label = String(value.label || "").trim();
  return {
    id: String(value.id || createId()),
    day: isIncomePlanningWeekday(value.day) ? value.day : "monday",
    startTime: normalizeIncomePlanningTime(value.startTime, "09:00"),
    icon: normalizePositionIcon(value.icon, "calendar"),
    label: label || "Stempel"
  };
}

function normalizeIncomePlanningPlannedStamp(value: unknown): IncomePlanningPlannedStamp | null {
  if (!isRecord(value)) return null;
  const label = String(value.label || "").trim();
  return {
    id: String(value.id || createId()),
    date: normalizeIncomePlanningDate(value.date, todayLocalDateString()),
    startTime: normalizeIncomePlanningTime(value.startTime, "09:00"),
    icon: normalizePositionIcon(value.icon, "calendar"),
    label: label || "Stempel",
    description: String(value.description || "")
  };
}

function normalizeIncomePlanningWeekScenarioAssignments(values: unknown[]): IncomePlanningWeekScenarioAssignment[] {
  const assignments = new Map<string, IncomePlanningWeekScenarioAssignment>();
  for (const value of values) {
    const assignment = normalizeIncomePlanningWeekScenarioAssignment(value);
    if (assignment) assignments.set(assignment.weekStartDate, assignment);
  }
  return Array.from(assignments.values()).sort((first, second) => first.weekStartDate.localeCompare(second.weekStartDate));
}

function normalizeIncomePlanningWeekScenarioAssignment(value: unknown): IncomePlanningWeekScenarioAssignment | null {
  if (!isRecord(value)) return null;
  if (!isIncomePlanningWeekScenarioId(value.scenarioId) || value.scenarioId === "normal") return null;
  const weekStartDate = normalizeIncomePlanningWeekStartDate(value.weekStartDate);
  return weekStartDate ? { weekStartDate, scenarioId: value.scenarioId } : null;
}

function normalizeIncomePlanningSlot(
  value: unknown,
  fallbackDay: IncomePlanningSlot["day"],
  fallbackDurationMinutes: number
): IncomePlanningSlot | null {
  if (!isRecord(value)) return null;
  const startTime = normalizeIncomePlanningTime(value.startTime, "09:00");
  const endTime = normalizeIncomePlanningTime(value.endTime, "10:00");
  const startMinutes = timeMinutes(String(value.startTime || ""));
  const endMinutes = timeMinutes(String(value.endTime || ""));
  const clockDuration = startMinutes !== null && endMinutes !== null && endMinutes > startMinutes ? endMinutes - startMinutes : null;
  const storedDuration = Math.round(
    clampNumber(numberOrDefault(value.durationMinutes, fallbackDuration(startTime, endTime, fallbackDurationMinutes)), 0, 168 * 60)
  );
  const normalizedSlot: IncomePlanningSlot = {
    id: String(value.id || createId()),
    day: isIncomePlanningWeekday(value.day) ? value.day : fallbackDay,
    startTime,
    endTime,
    flexible: booleanOrDefault(value.flexible, false),
    durationMinutes: clockDuration ?? storedDuration
  };
  const pauseStartTime = "pauseStartTime" in value ? normalizeIncomePlanningTime(value.pauseStartTime, "12:00") : undefined;
  const pauseEndTime = "pauseEndTime" in value ? normalizeIncomePlanningTime(value.pauseEndTime, "12:30") : undefined;
  if (pauseStartTime === undefined || pauseEndTime === undefined) return normalizedSlot;
  const pauseDurationMinutes = Math.round(
    clampNumber(numberOrDefault(value.pauseDurationMinutes, fallbackDuration(pauseStartTime, pauseEndTime, 0)), 0, 168 * 60)
  );
  return {
    ...normalizedSlot,
    pauseEnabled: booleanOrDefault(value.pauseEnabled, pauseDurationMinutes > 0),
    pauseStartTime,
    pauseEndTime,
    pauseDurationMinutes
  };
}

function normalizeIncomePlanningColor(value: unknown, fallback: string): string {
  const color = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : fallback;
}

function normalizeIncomePlanningAssumptions(value: unknown): IncomePlanningAssumptions {
  const fallback = defaultIncomePlanningAssumptions();
  const assumptions = isRecord(value) ? value : {};
  const sleepSlots = Array.isArray(assumptions.sleepSlots)
    ? assumptions.sleepSlots
        .map((slotValue, index) => normalizeIncomePlanningSleepSlot(slotValue, fallback.sleepSlots[index] ?? fallback.sleepSlots[0]))
        .filter((slot): slot is IncomePlanningSleepSlot => slot !== null)
    : buildDefaultIncomePlanningSleepSlots();
  return {
    sleepHoursPerDay: clampNumber(numberOrDefault(assumptions.sleepHoursPerDay, fallback.sleepHoursPerDay), 0, 24),
    sleepSlots: sleepSlots.length ? sleepSlots : fallback.sleepSlots
  };
}

function normalizeIncomePlanningSleepSlot(
  value: unknown,
  fallback: IncomePlanningSleepSlot | undefined
): IncomePlanningSleepSlot | null {
  if (!isRecord(value)) return fallback ?? null;
  const fallbackSlot = fallback ?? buildDefaultIncomePlanningSleepSlots()[0];
  const startTime = normalizeIncomePlanningTime(value.startTime, fallbackSlot.startTime);
  const endTime = normalizeIncomePlanningTime(value.endTime, fallbackSlot.endTime);
  const slot = {
    id: String(value.id || createId()),
    day: isIncomePlanningWeekday(value.day) ? value.day : fallbackSlot.day,
    startTime,
    endTime,
    flexible: booleanOrDefault(value.flexible, fallbackSlot.flexible),
    durationMinutes: Math.round(clampNumber(numberOrDefault(value.durationMinutes, fallbackSlot.durationMinutes), 0, 168 * 60))
  };
  return {
    ...slot,
    durationMinutes: slot.flexible ? slot.durationMinutes : incomePlanningSleepSlotDurationMinutes(slot)
  };
}

function migrateIncomePlanningAssumptionBlocks(value: Record<string, unknown>): IncomePlanningManualBlock[] {
  const freeTimeMinutes = Math.round(clampNumber(numberOrDefault(value.freeTimeHoursPerDay, 2), 0, 24) * 7 * 60);
  const privateMinutes = Math.round(clampNumber(numberOrDefault(value.privateCommitmentsHoursPerWeek, 12), 0, 168) * 60);
  const bufferMinutes = Math.round(clampNumber(numberOrDefault(value.weeklyBufferHours, 8), 0, 168) * 60);
  return [
    buildIncomePlanningManualBlock("private_commitment", "income-plan-private-commitments", {
      slots: [legacyFlexibleIncomePlanningSlot("income-plan-private-commitments-slot", privateMinutes)]
    }),
    buildIncomePlanningManualBlock("free_time", "income-plan-free-time", {
      slots: [legacyFlexibleIncomePlanningSlot("income-plan-free-time-slot", freeTimeMinutes)]
    }),
    buildIncomePlanningManualBlock("buffer", "income-plan-weekly-buffer", {
      slots: [legacyFlexibleIncomePlanningSlot("income-plan-weekly-buffer-slot", bufferMinutes)]
    })
  ];
}

function legacyFlexibleIncomePlanningSlot(id: string, durationMinutes: number): IncomePlanningSlot {
  return {
    id,
    day: "sunday",
    startTime: "00:00",
    endTime: "00:00",
    flexible: true,
    durationMinutes
  };
}

function isSlot(value: IncomePlanningSlot | null): value is IncomePlanningSlot {
  return value !== null;
}

function normalizeIncomePlanningTime(value: unknown, fallback: string): string {
  const time = String(value || "");
  return /^([0-1]\d|2[0-3]):([0-5]\d)$/.test(time) ? time : fallback;
}

function normalizeIncomePlanningDate(value: unknown, fallback: string): string {
  const date = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fallback;
  const [yearRaw, monthRaw, dayRaw] = date.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day ? date : fallback;
}

function normalizeIncomePlanningWeekStartDate(value: unknown): string | null {
  const date = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [yearRaw, monthRaw, dayRaw] = date.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return parsed.getDay() === 1 ? date : null;
}

function todayLocalDateString(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fallbackDuration(startTime: string, endTime: string, fallback: number): number {
  const start = timeMinutes(startTime);
  const end = timeMinutes(endTime);
  return start !== null && end !== null && end > start ? end - start : fallback;
}

function timeMinutes(value: string): number | null {
  const match = /^([0-1]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function normalizeIncomePlanningCategory(value: unknown): IncomePlanningCategory {
  const raw = String(value ?? "");
  const legacyCategories: Record<string, IncomePlanningCategory> = {
    main_job: "salary",
    part_time_job: "salary",
    self_employment: "self_employed",
    small_business: "self_employed",
    rental: "garage_parking_rental",
    capital_income: "dividends",
    trainer_volunteer: "trainer_allowance",
    board_advisory: "supervisory_board",
    project_work: "freelance"
  };
  if (legacyCategories[raw]) return legacyCategories[raw];
  const normalized = normalizeIncomeTaxRuleLabel(raw);
  if (INCOME_PLANNING_CATEGORY_IDS.includes(normalized as IncomePlanningCategory)) {
    return normalized as IncomePlanningCategory;
  }
  const key = incomePlanningCategoryKey(raw);
  const labelMatch = INCOME_PLANNING_CATEGORY_IDS.find(
    (category) => incomePlanningCategoryKey(incomePlanningCategoryConfig(category).label) === key
  );
  return labelMatch ?? "other";
}

function incomePlanningCategoryKey(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeIncomeTrackerState(value: unknown): IncomeTrackerState {
  const fallback = defaultIncomeTrackerState();
  if (!isRecord(value)) return fallback;
  return {
    yearlyEntries: arrayOrEmpty(value.yearlyEntries).map(normalizeIncomeYearEntry),
    milestones: arrayOrEmpty(value.milestones).map(normalizeCareerMilestone),
    settings: normalizeIncomeTrackerSettings(value.settings)
  };
}

function normalizeIncomeTrackerSettings(value: unknown): IncomeTrackerSettings {
  const fallback = defaultIncomeTrackerState().settings;
  if (!isRecord(value)) return fallback;
  return {
    activeInputTab: normalizeIncomeInputTab(value.activeInputTab, fallback.activeInputTab),
    projectionMode: normalizeIncomeProjectionMode(value.projectionMode, fallback.projectionMode),
    manualGrowthRatePercent: nullableNumberOrDefault(
      value.manualGrowthRatePercent,
      fallback.manualGrowthRatePercent
    ),
    savingsSharePercent: nullableNumberOrDefault(value.savingsSharePercent, fallback.savingsSharePercent),
    selectedYearlyLabels: stringArrayOrDefault(value.selectedYearlyLabels, fallback.selectedYearlyLabels).map(
      normalizeIncomeTrackerLabel
    )
  };
}

function normalizeIncomeYearEntry(value: unknown): IncomeYearEntry {
  const entry = isRecord(value) ? value : {};
  return {
    id: String(entry.id || createId()),
    active: booleanOrDefault(entry.active, true),
    visible: booleanOrDefault(entry.visible, true),
    year: Math.round(numberOrDefault(entry.year, defaultPlanningSettings().year)),
    label: normalizeIncomeTrackerLabel(entry.label),
    person: normalizeIncomePerson(entry.person),
    annualNetIncome: nullableNumberOrDefault(entry.annualNetIncome, null),
    annualGrossIncome: nullableNumberOrDefault(entry.annualGrossIncome, null),
    taxesAndDeductions: nullableNumberOrDefault(entry.taxesAndDeductions, null),
    taxDeductionItems: normalizeIncomeTaxDeductionItems(entry.taxDeductionItems),
    taxAdjustment: normalizeIncomeTaxAdjustment(entry.taxAdjustment),
    capitalGainsAllowance: nullableNumberOrDefault(entry.capitalGainsAllowance, null),
    capitalGainsChurchTaxEnabled: booleanOrDefault(entry.capitalGainsChurchTaxEnabled, false),
    capitalGainsChurchTaxRatePercent: normalizeCapitalGainsChurchTaxRate(entry.capitalGainsChurchTaxRatePercent),
    employmentContext: normalizeIncomeEmploymentContext(entry.employmentContext),
    minijobType: normalizeIncomeMinijobType(entry.minijobType),
    considerPensionInsurance: booleanOrDefault(entry.considerPensionInsurance, false),
    isRvExempt: booleanOrDefault(entry.isRvExempt, false),
    shortTermEmploymentDays: nullableNumberOrDefault(entry.shortTermEmploymentDays, null),
    shortTermEmploymentMonths: nullableNumberOrDefault(entry.shortTermEmploymentMonths, null),
    studentEmploymentMode: normalizeIncomeStudentEmploymentMode(entry.studentEmploymentMode),
    requiresManualTaxReview: booleanOrDefault(entry.requiresManualTaxReview, false),
    employer: String(entry.employer ?? ""),
    note: String(entry.note ?? ""),
    source: normalizeIncomeYearSource(entry.source)
  };
}

function normalizeIncomeTaxDeductionItems(value: unknown): IncomeTaxDeductionItems {
  const item = isRecord(value) ? value : {};
  return INCOME_TAX_DEDUCTION_FIELDS.reduce<IncomeTaxDeductionItems>(
    (result, field) => ({ ...result, [field]: nullableNumberOrDefault(item[field], null) }),
    {
      wageTax: null,
      solidaritySurcharge: null,
      churchTax: null,
      capitalGainsTax: null,
      capitalGainsSolidaritySurcharge: null,
      capitalGainsChurchTax: null,
      pensionInsurance: null,
      healthInsurance: null,
      careInsurance: null,
      unemploymentInsurance: null,
      employerPensionInsurance: null
    }
  );
}

function normalizeCapitalGainsChurchTaxRate(value: unknown): number {
  return numberOrDefault(value, DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT) === 8
    ? 8
    : DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT;
}

function normalizeIncomeTaxAdjustment(value: unknown): IncomeTaxAdjustment {
  const adjustment = isRecord(value) ? value : {};
  return {
    type: normalizeIncomeTaxAdjustmentType(adjustment.type),
    amount: nullableNumberOrDefault(adjustment.amount, null)
  };
}

function normalizeIncomeTaxAdjustmentType(value: unknown): IncomeTaxAdjustmentType {
  return value === "payment" ? "payment" : "refund";
}

function normalizeCareerMilestone(value: unknown): CareerMilestone {
  const entry = isRecord(value) ? value : {};
  return {
    id: String(entry.id || createId()),
    date: String(entry.date ?? ""),
    type: String(entry.type || "Gehaltserhoehung"),
    description: String(entry.description ?? ""),
    impact: normalizeCareerMilestoneImpact(entry.impact),
    linkedYear: nullableNumberOrDefault(entry.linkedYear, null)
  };
}

function normalizeIncomePerson(value: unknown): IncomePerson {
  return value === "person1" || value === "person2" || value === "household" ? value : "household";
}

function normalizeIncomeYearSource(value: unknown): IncomeYearEntrySource {
  return value === "manual" ? "manual" : "annual_statement";
}

function normalizeIncomeTrackerLabel(value: unknown): string {
  return normalizeIncomeTaxRuleLabel(String(value ?? "salary")) || "salary";
}

function normalizeIncomeEmploymentContext(value: unknown): IncomeEmploymentContext {
  if (value === "earned_claim" || value === "other") return value;
  return "job_loss";
}

function normalizeIncomeMinijobType(value: unknown): IncomeMinijobType {
  return value === "private_household" ? "private_household" : "commercial";
}

function normalizeIncomeStudentEmploymentMode(value: unknown): IncomeStudentEmploymentMode {
  return value === "short_term" ? "short_term" : "minijob";
}

function normalizeCareerMilestoneImpact(value: unknown): CareerMilestoneImpact {
  if (value === "negative" || value === "neutral" || value === "positive") return value;
  return "positive";
}

function normalizeIncomeProjectionMode(value: unknown, fallback: IncomeProjectionMode): IncomeProjectionMode {
  if (value === "off" || value === "historical_average" || value === "manual") return value;
  return fallback;
}

function normalizeIncomeInputTab(
  value: unknown,
  fallback: IncomeTrackerSettings["activeInputTab"]
): IncomeTrackerSettings["activeInputTab"] {
  if (value === "yearly" || value === "milestones" || value === "settings") return value;
  return fallback;
}

function arrayOrEmpty(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeSpecialRepaymentRhythm(
  value: unknown,
  fallback: RealEstateFinancingSettings["specialRepaymentRhythm"]
): RealEstateFinancingSettings["specialRepaymentRhythm"] {
  return value === "none" || value === "monthly" || value === "yearly" ? value : fallback;
}

function normalizeInvestmentSettings(value: unknown): InvestmentSettings {
  const fallback = defaultInvestmentSettings();
  if (!isRecord(value)) return fallback;
  return {
    includedIds: stringArrayOrDefault(value.includedIds, fallback.includedIds),
    includeAccountInterest: booleanOrDefault(value.includeAccountInterest, fallback.includeAccountInterest),
    includeAccountCashback: booleanOrDefault(value.includeAccountCashback, fallback.includeAccountCashback),
    activeDepot: normalizeInvestmentDepotKey(value.activeDepot, fallback.activeDepot),
    retirementIncludedIds: stringArrayOrDefault(value.retirementIncludedIds, fallback.retirementIncludedIds),
    retirementIncludeAccountInterest: booleanOrDefault(
      value.retirementIncludeAccountInterest,
      fallback.retirementIncludeAccountInterest
    ),
    retirementIncludeAccountCashback: booleanOrDefault(
      value.retirementIncludeAccountCashback,
      fallback.retirementIncludeAccountCashback
    ),
    childIncludedIds: stringArrayOrDefault(value.childIncludedIds, fallback.childIncludedIds),
    childIncludeAccountInterest: booleanOrDefault(
      value.childIncludeAccountInterest,
      fallback.childIncludeAccountInterest
    ),
    childIncludeAccountCashback: booleanOrDefault(
      value.childIncludeAccountCashback,
      fallback.childIncludeAccountCashback
    ),
    retirementDepotEnabled: booleanOrDefault(value.retirementDepotEnabled, fallback.retirementDepotEnabled),
    retirementDepotChildren: numberOrDefault(value.retirementDepotChildren, fallback.retirementDepotChildren),
    birthYear: numberOrDefault(value.birthYear, fallback.birthYear),
    chartStartAge: numberOrDefault(value.chartStartAge, fallback.chartStartAge),
    payoutEndAge: numberOrDefault(value.payoutEndAge, fallback.payoutEndAge),
    payoutYears: numberOrDefault(value.payoutYears, fallback.payoutYears),
    percentageWithdrawalStartAge: numberOrDefault(
      value.percentageWithdrawalStartAge,
      fallback.percentageWithdrawalStartAge
    ),
    percentageWithdrawalRatePercent: numberOrDefault(
      value.percentageWithdrawalRatePercent,
      fallback.percentageWithdrawalRatePercent
    ),
    investmentReturnPercent: numberOrDefault(value.investmentReturnPercent, fallback.investmentReturnPercent),
    capitalGainsTaxPercent: numberOrDefault(value.capitalGainsTaxPercent, fallback.capitalGainsTaxPercent),
    inflationRatePercent: numberOrDefault(value.inflationRatePercent, fallback.inflationRatePercent),
    bequestReservePercent: numberOrDefault(value.bequestReservePercent, fallback.bequestReservePercent),
    retirementBirthYear: numberOrDefault(value.retirementBirthYear, fallback.retirementBirthYear),
    retirementChartStartAge: numberOrDefault(value.retirementChartStartAge, fallback.retirementChartStartAge),
    retirementPayoutEndAge: numberOrDefault(value.retirementPayoutEndAge, fallback.retirementPayoutEndAge),
    retirementPayoutYears: numberOrDefault(value.retirementPayoutYears, fallback.retirementPayoutYears),
    retirementInvestmentReturnPercent: numberOrDefault(
      value.retirementInvestmentReturnPercent,
      fallback.retirementInvestmentReturnPercent
    ),
    retirementCapitalGainsTaxPercent: numberOrDefault(
      value.retirementCapitalGainsTaxPercent,
      fallback.retirementCapitalGainsTaxPercent
    ),
    retirementInflationRatePercent: numberOrDefault(
      value.retirementInflationRatePercent,
      fallback.retirementInflationRatePercent
    ),
    retirementBequestReservePercent: numberOrDefault(
      value.retirementBequestReservePercent,
      fallback.retirementBequestReservePercent
    ),
    childBirthYear: numberOrDefault(value.childBirthYear, fallback.childBirthYear),
    childChartStartAge: numberOrDefault(value.childChartStartAge, fallback.childChartStartAge),
    childPayoutAge: numberOrDefault(value.childPayoutAge, fallback.childPayoutAge),
    childInvestmentReturnPercent: numberOrDefault(
      value.childInvestmentReturnPercent,
      fallback.childInvestmentReturnPercent
    ),
    childCapitalGainsTaxPercent: numberOrDefault(
      value.childCapitalGainsTaxPercent,
      fallback.childCapitalGainsTaxPercent
    ),
    childInflationRatePercent: numberOrDefault(value.childInflationRatePercent, fallback.childInflationRatePercent),
    childBequestReservePercent: numberOrDefault(
      value.childBequestReservePercent,
      fallback.childBequestReservePercent
    )
  };
}

function normalizeLegacyInvestmentSettings(value: unknown): InvestmentSettings {
  const fallback = defaultInvestmentSettings();
  if (!isRecord(value)) return fallback;
  return {
    includedIds: stringArrayOrDefault(value.includedIds, fallback.includedIds),
    includeAccountInterest: booleanOrDefault(value.includeAccountInterest, fallback.includeAccountInterest),
    includeAccountCashback: booleanOrDefault(value.includeAccountCashback, fallback.includeAccountCashback),
    activeDepot: normalizeInvestmentDepotKey(value.activeDepot, fallback.activeDepot),
    retirementIncludedIds: stringArrayOrDefault(value.retirementIncludedIds, fallback.retirementIncludedIds),
    retirementIncludeAccountInterest: booleanOrDefault(
      value.retirementIncludeAccountInterest,
      fallback.retirementIncludeAccountInterest
    ),
    retirementIncludeAccountCashback: booleanOrDefault(
      value.retirementIncludeAccountCashback,
      fallback.retirementIncludeAccountCashback
    ),
    childIncludedIds: stringArrayOrDefault(value.childIncludedIds, fallback.childIncludedIds),
    childIncludeAccountInterest: booleanOrDefault(
      value.childIncludeAccountInterest,
      fallback.childIncludeAccountInterest
    ),
    childIncludeAccountCashback: booleanOrDefault(
      value.childIncludeAccountCashback,
      fallback.childIncludeAccountCashback
    ),
    retirementDepotEnabled: booleanOrDefault(value.retirementDepotEnabled, fallback.retirementDepotEnabled),
    retirementDepotChildren: numberOrDefault(value.retirementDepotChildren, fallback.retirementDepotChildren),
    birthYear: numberOrDefault(value.birthYear, fallback.birthYear),
    chartStartAge: numberOrDefault(value.chartStartAge, fallback.chartStartAge),
    payoutEndAge: numberOrDefault(value.payoutEndAge, fallback.payoutEndAge),
    payoutYears: numberOrDefault(value.payoutYears, fallback.payoutYears),
    percentageWithdrawalStartAge: numberOrDefault(
      value.percentageWithdrawalStartAge,
      fallback.percentageWithdrawalStartAge
    ),
    percentageWithdrawalRatePercent: numberOrDefault(
      value.percentageWithdrawalRatePercent,
      fallback.percentageWithdrawalRatePercent
    ),
    investmentReturnPercent: numberOrDefault(value.investmentReturn, fallback.investmentReturnPercent),
    capitalGainsTaxPercent: numberOrDefault(value.capitalGainsTax, fallback.capitalGainsTaxPercent),
    inflationRatePercent: numberOrDefault(value.inflationRate, fallback.inflationRatePercent),
    bequestReservePercent: numberOrDefault(value.bequestReservePercent, fallback.bequestReservePercent),
    retirementBirthYear: numberOrDefault(value.retirementBirthYear, fallback.retirementBirthYear),
    retirementChartStartAge: numberOrDefault(value.retirementChartStartAge, fallback.retirementChartStartAge),
    retirementPayoutEndAge: numberOrDefault(value.retirementPayoutEndAge, fallback.retirementPayoutEndAge),
    retirementPayoutYears: numberOrDefault(value.retirementPayoutYears, fallback.retirementPayoutYears),
    retirementInvestmentReturnPercent: numberOrDefault(
      value.retirementInvestmentReturn ?? value.investmentReturn,
      fallback.retirementInvestmentReturnPercent
    ),
    retirementCapitalGainsTaxPercent: numberOrDefault(
      value.retirementCapitalGainsTax ?? value.capitalGainsTax,
      fallback.retirementCapitalGainsTaxPercent
    ),
    retirementInflationRatePercent: numberOrDefault(
      value.retirementInflationRate ?? value.inflationRate,
      fallback.retirementInflationRatePercent
    ),
    retirementBequestReservePercent: numberOrDefault(
      value.retirementBequestReservePercent ?? value.bequestReservePercent,
      fallback.retirementBequestReservePercent
    ),
    childBirthYear: numberOrDefault(value.childBirthYear, fallback.childBirthYear),
    childChartStartAge: numberOrDefault(value.childChartStartAge, fallback.childChartStartAge),
    childPayoutAge: numberOrDefault(value.childPayoutAge, fallback.childPayoutAge),
    childInvestmentReturnPercent: numberOrDefault(
      value.childInvestmentReturn ?? value.investmentReturn,
      fallback.childInvestmentReturnPercent
    ),
    childCapitalGainsTaxPercent: numberOrDefault(
      value.childCapitalGainsTax ?? value.capitalGainsTax,
      fallback.childCapitalGainsTaxPercent
    ),
    childInflationRatePercent: numberOrDefault(
      value.childInflationRate ?? value.inflationRate,
      fallback.childInflationRatePercent
    ),
    childBequestReservePercent: numberOrDefault(
      value.childBequestReservePercent ?? value.bequestReservePercent,
      fallback.childBequestReservePercent
    )
  };
}

function normalizeInvestmentDepotKey(value: unknown, fallback: InvestmentDepotKey): InvestmentDepotKey {
  return value === "child" || value === "retirement" || value === "standard" ? value : fallback;
}

function normalizePositions(
  value: unknown,
  fallback: ReservePosition[],
  fallbackPayoutYear = defaultPlanningSettings().year
): ReservePosition[] {
  if (!Array.isArray(value) || value.length === 0) return fallback;

  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const rawType = normalizePositionType(item.type);
      const flow = normalizePositionFlow(item.flow ?? item.direction ?? item.category, flowForType(rawType));
      const type = typeForFlow(rawType, flow);
      const name = String(item.name || "Position");
      const costBreakdown = normalizePositionCostBreakdown(item.costBreakdown);
      const planningYear = normalizePlanningYearSelection(item.planningYear ?? item.planYear, null);
      const position: ReservePosition = {
        id: String(item.id || createId()),
        planningYear,
        flow,
        active: booleanOrDefault(item.active, true),
        visible: booleanOrDefault(item.visible ?? item.view, true),
        name,
        icon: normalizePositionIcon(
          item.icon ?? item.labelIcon ?? item.label,
          defaultPositionIconForPosition({ flow, type, name })
        ),
        type,
        amount: numberOrDefault(item.amount, 0),
        startMonth: numberOrDefault(item.startMonth, 1),
        endMonth: numberOrDefault(item.endMonth, 12),
        payoutType:
          item.payoutType === "monthly" || item.payoutType === "yearly" || item.payoutType === "once"
            ? item.payoutType
            : "none",
        payoutYear: numberOrDefault(item.payoutYear ?? item.year, fallbackPayoutYear),
        payoutMonth: numberOrDefault(item.payoutMonth, 12),
        payoutDay: numberOrDefault(item.payoutDay, 31),
        interestBearing: flow === "expense" && booleanOrDefault(item.interestBearing ?? item.interest, false),
        cashback: flow === "expense" && Boolean(item.cashback) && type === "temporary",
        ...(costBreakdown.length ? { costBreakdown } : {})
      };
      if (position.id === "investitionsrate" && position.type === "temporary") {
        position.type = "savings";
        position.cashback = false;
      }
      if (position.payoutType === "once" && position.type !== "savings") {
        position.startMonth = position.payoutMonth;
        position.endMonth = position.payoutMonth;
        position.interestBearing = false;
      } else if (position.payoutType === "once") {
        position.interestBearing = false;
      }
      if (position.payoutType === "once") {
        position.planningYear = normalizePlanningYearSelection(position.payoutYear, null);
      }
      if (position.flow === "income") {
        position.interestBearing = false;
        position.cashback = false;
        if (position.payoutType === "none" && position.type !== "incomeTemporary") {
          position.payoutType = defaultIncomePayoutType(position.type);
        }
      }
      if (!positionCostBreakdownAllowed(position.flow, position.type, position.payoutType)) {
        position.costBreakdown = undefined;
      }
      const breakdownTotal = positionCostBreakdownTotal(position.costBreakdown);
      if (breakdownTotal !== null) position.amount = breakdownTotal;
      return position;
    })
    .filter((position): position is ReservePosition => position !== null);
}

function normalizePositionCostBreakdown(value: unknown): PositionCostBreakdownItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const name = String(item.name ?? "").trim();
      const amount = nullableNumberOrDefault(item.amount, null);
      if (!name && amount === null) return null;
      return {
        id: String(item.id || createId()),
        name,
        amount: amount === null ? null : Math.max(0, amount)
      };
    })
    .filter((item): item is PositionCostBreakdownItem => item !== null);
}

function positionCostBreakdownTotal(items: PositionCostBreakdownItem[] | undefined): number | null {
  if (!items?.some((item) => item.amount !== null)) return null;
  return items.reduce((sum, item) => sum + Math.max(0, Number(item.amount ?? 0)), 0);
}

function positionCostBreakdownAllowed(
  flow: ReservePosition["flow"],
  type: ReservePosition["type"],
  payoutType: ReservePosition["payoutType"]
): boolean {
  if (flow === "expense" && type === "temporary") {
    return payoutType === "monthly" || payoutType === "yearly" || payoutType === "once";
  }
  return flow === "income" && type === "incomeTemporary" && payoutType === "once";
}

function migrateMonthlyNetIncomePosition(settings: PlanningSettings, positions: ReservePosition[]): ReservePosition[] {
  if (settings.monthlyNetIncome <= 0) {
    return positions;
  }
  const incomeIndex = positions.findIndex((position) => position.flow === "income" || isIncomeType(position.type));
  if (incomeIndex >= 0) {
    return positions.map((position, index) =>
      index === incomeIndex && position.amount === 0 ? { ...position, amount: settings.monthlyNetIncome } : position
    );
  }

  return [
    {
      id: "nettoeinkommen",
      planningYear: null,
      flow: "income",
      active: true,
      visible: true,
      name: "Nettoeinkommen",
      type: "incomeMonthly",
      amount: settings.monthlyNetIncome,
      startMonth: 1,
      endMonth: 12,
      payoutType: "monthly",
      payoutYear: settings.year,
      payoutMonth: 1,
      payoutDay: 1,
      interestBearing: false,
      cashback: false
    },
    ...positions
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function numberOrDefault(value: unknown, fallback: number): number {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function nullableNumberOrDefault(value: unknown, fallback: number | null): number | null {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringArrayOrDefault(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.map(String);
}

function booleanOrDefault(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

function normalizePositionType(value: unknown): ReservePosition["type"] {
  if (isPositionType(value)) return value;
  return "reserve";
}

function normalizePositionFlow(value: unknown, fallback: PositionFlow): PositionFlow {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (
    normalized === "income" ||
    normalized === "einnahme" ||
    normalized === "einnahmen" ||
    normalized === "einlage" ||
    normalized === "einlagen"
  ) {
    return "income";
  }
  if (
    normalized === "expense" ||
    normalized === "expenses" ||
    normalized === "ausgabe" ||
    normalized === "ausgaben" ||
    normalized === "kosten"
  ) {
    return "expense";
  }
  return fallback;
}

function defaultIncomePayoutType(type: ReservePosition["type"]): ReservePosition["payoutType"] {
  if (type === "incomeYearly") return "yearly";
  return "monthly";
}
