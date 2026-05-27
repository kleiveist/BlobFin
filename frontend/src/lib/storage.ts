import {
  createId,
  defaultAppUiState,
  defaultAppState,
  defaultCombinedWealthToggles,
  defaultInvestmentSettings,
  defaultPlanningAccounts,
  defaultPlanningSettings,
  defaultPositionTableViewState,
  defaultRealEstateFinancingSettings,
  defaultRepaymentSourceToggles
} from "../data/defaults";
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
  CombinedWealthToggles,
  InvestmentDepotKey,
  InvestmentSettings,
  PlanningAccount,
  PlanningSettings,
  PositionTableFilter,
  PositionTableMode,
  PositionTableView,
  PositionTableViewState,
  PositionFlow,
  RealEstateFinancingSettings,
  RepaymentSourceToggle,
  ReservePosition,
  ThemeMode
} from "../types";

const STORAGE_KEY = "blobfin.reserveCalculator.v1";
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
  const settings = normalizePlanningSettings(value.settings);
  const legacyPositions = migrateMonthlyNetIncomePosition(
    settings,
    normalizePositions(value.positions, fallback.positions, settings.year)
  );
  const planningAccounts = normalizePlanningAccounts(value.planningAccounts, legacyPositions, settings.year);
  const ui = normalizeAppUiState(value.ui, planningAccounts);
  const positions = positionsForPlanningAccount(planningAccounts, ui.selectedPlanningAccountId, legacyPositions);

  return {
    theme: normalizeThemeMode(value.theme, fallback.theme),
    settings: { ...settings, monthlyNetIncome: 0 },
    planningAccounts,
    ui,
    realEstate: normalizeRealEstateFinancingSettings(value.realEstate),
    combinedWealth: normalizeCombinedWealthToggles(value.combinedWealth),
    positions,
    investment: normalizeInvestmentSettings(value.investment),
    positionTableView: normalizePositionTableViewState(value.positionTableView)
  };
}

function normalizeLegacyState(value: unknown): AppState {
  const fallback = defaultAppState();
  if (!isRecord(value)) return fallback;
  const settings = {
    ...defaultPlanningSettings(),
    year: numberOrDefault(value.year, fallback.settings.year),
    monthlyNetIncome: numberOrDefault(value.monthlyNetIncome, fallback.settings.monthlyNetIncome),
    interestRatePercent: numberOrDefault(value.interestRate, fallback.settings.interestRatePercent),
    cashbackRatePercent: numberOrDefault(value.cashbackRate, fallback.settings.cashbackRatePercent),
    emergencyFund: 0
  };
  const legacyPositions = migrateMonthlyNetIncomePosition(
    settings,
    normalizePositions(value.positions, fallback.positions, settings.year)
  );
  const planningAccounts = normalizePlanningAccounts(undefined, legacyPositions, settings.year);
  const ui = normalizeAppUiState(undefined, planningAccounts);
  const positions = positionsForPlanningAccount(planningAccounts, ui.selectedPlanningAccountId, legacyPositions);

  return {
    theme: normalizeThemeMode(value.theme, fallback.theme),
    settings: { ...settings, monthlyNetIncome: 0 },
    planningAccounts,
    ui,
    realEstate: defaultRealEstateFinancingSettings(),
    combinedWealth: defaultCombinedWealthToggles(),
    positions,
    investment: normalizeLegacyInvestmentSettings(value.investmentSettings),
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
  return {
    year: numberOrDefault(value.year, fallback.year),
    monthlyNetIncome: numberOrDefault(value.monthlyNetIncome, fallback.monthlyNetIncome),
    interestRatePercent: numberOrDefault(value.interestRatePercent, fallback.interestRatePercent),
    cashbackRatePercent: numberOrDefault(value.cashbackRatePercent, fallback.cashbackRatePercent),
    emergencyFund: 0
  };
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
  if (!isRecord(value)) {
    return { ...fallback, selectedPlanningAccountId: firstAccountId };
  }

  const selectedPlanningAccountId = String(value.selectedPlanningAccountId || firstAccountId);
  const accountExists = accounts.some((account) => account.id === selectedPlanningAccountId);
  return {
    activeSection: normalizeAppSectionId(value.activeSection, fallback.activeSection),
    selectedPlanningAccountId: accountExists ? selectedPlanningAccountId : firstAccountId,
    settingsGrunddatenExpanded: booleanOrDefault(
      value.settingsGrunddatenExpanded,
      fallback.settingsGrunddatenExpanded
    )
  };
}

function normalizeAppSectionId(value: unknown, fallback: AppSectionId): AppSectionId {
  if (value === "grunddaten") {
    return "cost_reserve_positions";
  }
  if (
    value === "cost_reserve_positions" ||
    value === "year_table" ||
    value === "investment_planning" ||
    value === "real_estate_financing" ||
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
    locale: value.locale === "en" ? "en" : "de",
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
    includeRealEstateValueTrend: booleanOrDefault(value.includeRealEstateValueTrend, fallback.includeRealEstateValueTrend)
  };
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
      const position: ReservePosition = {
        id: String(item.id || createId()),
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
        cashback: flow === "expense" && Boolean(item.cashback) && type === "temporary"
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
      if (position.flow === "income") {
        position.interestBearing = false;
        position.cashback = false;
        if (position.payoutType === "none") position.payoutType = defaultIncomePayoutType(position.type);
      }
      return position;
    })
    .filter((position): position is ReservePosition => position !== null);
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
