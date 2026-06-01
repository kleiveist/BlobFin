import "./styles.css";

import {
  createId,
  defaultAppState,
  defaultIncomeTrackerState,
  defaultInvestmentSettings,
  defaultInvestmentSettingsForNewAccount
} from "./data/defaults";
import { buildAssetProjection, payoutStartAge as calculatePayoutStartAge } from "./domain/assetProjection";
import { buildCombinedWealthSeries, combinedWealthHorizonYears } from "./domain/combinedWealth";
import {
  buildIncomeTrackerModel,
  emptyIncomeTaxAdjustment,
  emptyIncomeTaxDeductionItems,
  incomeTaxDeductionItemsTotal,
  incomeYearEntryCalculatedNetIncome,
  incomeYearEntryNetIncome,
  incomeYearEntryTaxTotal,
  incomeYearEntryTaxDeductions,
  INCOME_SOURCE_LABELS,
  type IncomeTrackerModel
} from "./domain/incomeTracker";
import { calculateRealEstateFinancing, defaultRealEstateDetailYear } from "./domain/realEstateCalculator";
import {
  investmentContributionForMonth,
  oneTimeInvestmentContributionForMonth
} from "./domain/investmentContributions";
import { RETIREMENT_DEPOT_MIN_AGE } from "./domain/retirementDepot";
import {
  calculatePlannedIncomeForSingleMonth,
  calculatePlannedOutflowForSingleMonth,
  calculateReserveSummary
} from "./domain/reserveCalculator";
import { exportPositionsCsv, exportYearTableCsv, parseCsv, positionsFromCsvRows } from "./lib/csv";
import {
  clamp,
  escapeHtml,
  intNumber,
  labelForPayout,
  labelForType,
  monthName,
  money,
  normalizeHeader,
  numberValue,
  percent
} from "./lib/format";
import {
  flowForType,
  isIncomePosition,
  isPositionType,
  positionFlow,
  positionTableMode,
  typeForFlow,
  type PositionTableMode
} from "./lib/positionKinds";
import {
  defaultPositionIconForPosition,
  normalizePositionIcon,
  POSITION_ICONS,
  positionIconSvg
} from "./lib/positionIcons";
import {
  emptyPositionTableView,
  hasActivePositionTableView,
  positionTableColumnConfig,
  positionTableColumnsForMode,
  positionTableFilterChipLabel,
  positionTableOperatorLabel,
  positionTableOperatorsForColumn,
  positionTableLabelOptions,
  positionTableRows,
  positionTableSelectOptions,
  positionTableSortLabel
} from "./lib/positionTableView";
import { loadState, resetStoredState, saveState } from "./lib/storage";
import type {
  AppSectionId,
  AppState,
  AssetProjection,
  AssetProjectionPoint,
  CareerMilestone,
  CareerMilestoneImpact,
  CombinedWealthYear,
  IncomePerson,
  IncomeProjectionMode,
  IncomeTaxAdjustmentType,
  IncomeResolvedSource,
  IncomeTaxDeductionField,
  IncomeTaxDeductionItems,
  IncomeTrackerSettings,
  IncomeYearEntry,
  IncomeYearEntrySource,
  InvestmentDepotKey,
  InvestmentSettings,
  PlanningAccount,
  PlanningSettings,
  PositionTableFilterColumn,
  PositionTableFilterOperator,
  PositionTableView,
  RealEstateFinancingSourceSchedule,
  RealEstateFinancingResult,
  RealEstateFinancingSettings,
  RealEstatePaymentSourceKind,
  ReservePosition,
  ThemeMode
} from "./types";
import { drawInvestmentChart } from "./views/investmentChart";
import { renderAccountYearTableOverview } from "./views/accountYearTables";
import {
  realEstatePopupHeading,
  realEstateRepaymentSegments,
  realEstateTrendSegments,
  renderCombinedWealthChart,
  renderCombinedWealthYearDetail,
  renderRealEstateRepaymentChart,
  renderRealEstateTrendChart
} from "./views/wealthCharts";
import { monthSelect, payoutSelect, positionIconSelect, positionTypeSelect, renderAppShell } from "./views/templates";

const root = requireRootElement();
const INTEREST_INVESTMENT_POSITION_ID = "__account-interest-investment";
const CASHBACK_INVESTMENT_POSITION_ID = "__account-cashback-investment";
const CHILD_DEPOT_MIN_PAYOUT_AGE = 18;
const CHILD_DEPOT_DEFAULT_PAYOUT_AGE = 18;
const CHILD_DEPOT_MAX_PAYOUT_AGE = 25;
const MAX_REAL_ESTATE_PROJECTION_YEARS = 80;
const INVESTMENT_DEPOTS: InvestmentDepotKey[] = ["standard", "retirement", "child"];
const APP_SECTION_IDS: AppSectionId[] = [
  "home",
  "investment_overview",
  "income_overview",
  "income_tracking",
  "income_status",
  "income_charts",
  "cost_reserve_positions",
  "year_table",
  "investment_planning",
  "real_estate_financing",
  "combined_wealth"
];
const INCOME_TAX_ADJUSTMENT_OPTIONS: Array<{ value: IncomeTaxAdjustmentType; label: string }> = [
  { value: "refund", label: "Rueckerstattung" },
  { value: "payment", label: "Nachzahlung" }
];
const INCOME_TAX_DEDUCTION_ROWS: Array<{
  field: IncomeTaxDeductionField;
  nr: string;
  label: string;
  category: "taxes" | "social" | "employer_social";
}> = [
  { field: "wageTax", nr: "4", label: "Einbehaltene Lohnsteuer von 3.", category: "taxes" },
  { field: "solidaritySurcharge", nr: "5", label: "Einbehaltener Solidaritaetszuschlag von 3.", category: "taxes" },
  { field: "churchTax", nr: "6", label: "Einbehaltene Kirchensteuer des Arbeitnehmers von 3.", category: "taxes" },
  { field: "employerPensionInsurance", nr: "22", label: "Arbeitgeberbeitraege zur gesetzlichen RV", category: "employer_social" },
  { field: "pensionInsurance", nr: "23", label: "Arbeitnehmerbeitraege zur gesetzlichen RV", category: "social" },
  { field: "healthInsurance", nr: "25", label: "Arbeitnehmerbeitraege zur gesetzlichen KV", category: "social" },
  { field: "careInsurance", nr: "26", label: "Arbeitnehmerbeitraege zur sozialen PV", category: "social" },
  { field: "unemploymentInsurance", nr: "27", label: "Arbeitnehmerbeitraege zur AV", category: "social" }
];
const INCOME_YEAR_LABEL_OPTIONS: Array<{ id: string; label: string; icon: string; description: string }> = [
  { id: "salary", label: "Gehalt", icon: "coins", description: "Regelmaessiges Arbeitsentgelt" },
  { id: "training_allowance", label: "Ausbildungsverguetung", icon: "education", description: "Verguetung waehrend Ausbildung oder dualem Studium" },
  { id: "mini_job", label: "MiniJob", icon: "wallet", description: "Geringfuegige Beschaeftigung oder kleiner Nebenjob" },
  { id: "self_employed", label: "Selbststaendigkeit", icon: "bank", description: "Einkommen aus eigener Taetigkeit" },
  { id: "freelance", label: "Freiberuflich", icon: "investment", description: "Freiberufliche oder projektbezogene Einkuenfte" },
  { id: "side_income", label: "Nebeneinkuenfte", icon: "wallet", description: "Weitere laufende Einkommensquellen" },
  { id: "fees", label: "Gagen", icon: "card", description: "Gagen, Honorare oder Auftrittserloese" },
  { id: "dividends", label: "Dividenden", icon: "investment", description: "Ausschuettungen aus Aktien oder Fonds" },
  { id: "asset_income", label: "Einnahme aus Vermoegen", icon: "bank", description: "Einnahmen aus Vermoegen, Kapital oder Besitz" },
  { id: "bonus", label: "Sonderzahlung", icon: "gift", description: "Bonus, Praemie oder Einmalzahlung" },
  { id: "severance", label: "Abfindung", icon: "shield", description: "Abfindung oder Ausgleichszahlung" },
  { id: "volunteer", label: "Ehrenamt", icon: "child", description: "Ehrenamtliche Verguetung" },
  { id: "board", label: "Vorstand", icon: "bank", description: "Vorstandsverguetung" },
  { id: "office_holder", label: "Amtstraeger", icon: "tax", description: "Verguetung fuer Amt oder Mandat" },
  { id: "supervisory_board", label: "Aufsichtsrat", icon: "investment", description: "Aufsichtsratsverguetung" },
  { id: "other", label: "Sonstiges", icon: "tag", description: "Andere Einkommensart" }
];
const CAREER_MILESTONE_TYPE_OPTIONS: Array<{ type: string; icon: string; description: string }> = [
  { type: "Ausbildung", icon: "education", description: "Ausbildung, Schule oder Qualifikation gestartet" },
  { type: "Berufsbeginn", icon: "wallet", description: "Start ins Erwerbsleben oder erster Job" },
  { type: "Jobwechsel", icon: "tag", description: "Wechsel zu einer neuen Stelle" },
  { type: "Befoerderung", icon: "investment", description: "Neue Rolle mit mehr Verantwortung" },
  { type: "Gehaltserhoehung", icon: "coins", description: "Regelmaessiges Einkommen steigt" },
  { type: "Teilzeit", icon: "calendar", description: "Reduzierte Arbeitszeit" },
  { type: "Vollzeit", icon: "calendar", description: "Rueckkehr oder Wechsel in Vollzeit" },
  { type: "Ausbildung / Studium abgeschlossen", icon: "education", description: "Abschluss mit Auswirkung auf Einkommen" },
  { type: "Elternzeit", icon: "child", description: "Familienphase mit Einkommenseffekt" },
  { type: "Selbststaendigkeit gestartet", icon: "bank", description: "Start der Selbststaendigkeit" },
  { type: "Arbeitslosigkeit", icon: "shield", description: "Unterbrechung oder Wegfall von Einkommen" },
  { type: "Arbeitgeberwechsel", icon: "tag", description: "Neuer Arbeitgeber" },
  { type: "Einmalige Sonderzahlung", icon: "gift", description: "Bonus oder Sonderzahlung" },
  { type: "Sonstiges", icon: "tag", description: "Eigener Meilenstein" }
];
const CAREER_MILESTONE_IMPACT_OPTIONS: Array<{ value: CareerMilestoneImpact; label: string }> = [
  { value: "positive", label: "positiv" },
  { value: "neutral", label: "neutral" },
  { value: "negative", label: "negativ" }
];
const INCOME_PROJECTION_MODES: IncomeProjectionMode[] = ["off", "historical_average", "manual"];
type NumericInvestmentSetting =
  | "birthYear"
  | "chartStartAge"
  | "childPayoutAge"
  | "payoutEndAge"
  | "retirementDepotChildren"
  | "percentageWithdrawalStartAge"
  | "percentageWithdrawalRatePercent"
  | "investmentReturnPercent"
  | "capitalGainsTaxPercent"
  | "inflationRatePercent"
  | "bequestReservePercent";
type ReserveChartCategory = "all" | "income" | "expense" | "reserve" | "savings";
type ReserveChartScenario = "current" | "lowerExpenses" | "raiseSavings" | "balanced";
type ReserveChartAdjustment = "none" | "down10" | "up10";
type ReserveChartStyle = "bars" | "pie";
type IncomeAnalysisChartType = "pie" | "bar" | "line" | "curve";
type IncomeAnalysisDataView = "deductions" | "social" | "taxes" | "income";
type IncomeAnalysisYearFilter = "all" | number;

interface IncomeAnalysisSlice {
  label: string;
  value: number;
  chartValue?: number;
  tone: string;
}

interface IncomeAnalysisYearPoint {
  year: number;
  gross: number;
  net: number;
  deductions: number;
  taxBase: number;
  taxRefund: number;
  taxPayment: number;
  taxes: number;
  social: number;
  employerSocial: number;
}

interface IncomeAnalysisModel {
  entries: IncomeYearEntry[];
  years: number[];
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  taxBaseTotal: number;
  taxRefundTotal: number;
  taxPaymentTotal: number;
  taxTotal: number;
  socialTotal: number;
  employerSocialTotal: number;
  unassignedDeductions: number;
  slicesByView: Record<IncomeAnalysisDataView, IncomeAnalysisSlice[]>;
  yearPoints: IncomeAnalysisYearPoint[];
}

interface ReserveChartMonth {
  month: string;
  income: number;
  expense: number;
  reserve: number;
  savings: number;
  selected: number;
}

interface ReserveChartTotals {
  income: number;
  expense: number;
  reserve: number;
  savings: number;
  remaining: number;
}

interface ReserveChartPosition {
  id: string;
  name: string;
  icon: string;
  total: number;
  category: Exclude<ReserveChartCategory, "all">;
}

interface ReserveChartModel {
  months: ReserveChartMonth[];
  totals: ReserveChartTotals;
  maxValue: number;
  positions: ReserveChartPosition[];
  insight: string;
}

interface PositionFilterDraft {
  column: PositionTableFilterColumn;
  operator: PositionTableFilterOperator;
  value: string;
}

type RealEstateField = keyof RealEstateFinancingSettings;
type CombinedToggleKey = keyof AppState["combinedWealth"];
type ExpenseSubmode = "regular" | "once";
type AccountDialogMode = "create" | "rename";
type AccountDialogState = {
  mode: AccountDialogMode;
  accountId: string | null;
  name: string;
  type: PlanningAccount["type"];
  error: string;
} | null;

let investmentAccountContextId: string | null = null;
let state = loadInitialState();
let draggedPositionId: string | null = null;
let exportStatusTimeoutId: number | undefined;
let selectedPositionMode: PositionTableMode = "expense";
let selectedExpenseSubmode: ExpenseSubmode = "regular";
let showResultMaxNeeded = false;
let reserveChartOpen = false;
let reserveChartCategory: ReserveChartCategory = "all";
let reserveChartScenario: ReserveChartScenario = "current";
let reserveChartHighlightId: string | null = null;
let reserveChartAdjustment: ReserveChartAdjustment = "none";
let reserveChartStyle: ReserveChartStyle = "bars";
let incomeTaxDialogEntryId: string | null = null;
let incomeAnalysisOpen = false;
let incomeAnalysisChartType: IncomeAnalysisChartType = "pie";
let incomeAnalysisDataView: IncomeAnalysisDataView = "deductions";
let incomeAnalysisYearFilter: IncomeAnalysisYearFilter = "all";
let incomeYearLabelPicker: { entryId: string; top: number; left: number } | null = null;
let incomeMilestoneTypePicker: { milestoneId: string; top: number; left: number } | null = null;
let positionIconPicker: { positionId: string; top: number; left: number } | null = null;
let positionFilterDrafts = createPositionFilterDrafts();
let positionFilterPopupOpen = false;
let selectedRealEstateYear: number | null = null;
let latestRealEstateResult: RealEstateFinancingResult | null = null;
let selectedCombinedWealthYear: number | null = null;
let accountDialog: AccountDialogState = null;
normalizeInvestmentBounds();
applyInitialRoute();
applyTheme();

renderShell();
bindEvents();
syncAllInputsFromState();
syncThemeControls();
renderAll();

function loadInitialState(): AppState {
  try {
    return sanitizeAppState(loadState());
  } catch (error) {
    console.warn("Stored state could not be loaded; falling back to defaults.", error);
    return sanitizeAppState(defaultAppState());
  }
}

function sanitizeAppState(appState: AppState): AppState {
  const fallbackUi = {
    activeSection: "home" as AppSectionId,
    selectedPlanningAccountId: "default-account",
    selectedInvestmentAccountId: "default-account",
    selectedRealEstateAccountIds: ["default-account"],
    selectedRealEstateWithdrawalGainAccountIds: ["default-account"],
    selectedCombinedAccountIds: ["default-account"],
    selectedCombinedLeadInvestmentAccountId: "default-account",
    settingsGrunddatenExpanded: true
  };
  const ui = appState.ui ?? fallbackUi;
  const fallbackPlanningAccounts: PlanningAccount[] = [
    {
      id: "default-account",
      name: "Standardkonto",
      type: "mixed",
      yearlyRows: appState.positions.map((position) => sanitizePosition(position, appState.settings.year))
    }
  ];
  const planningAccounts: PlanningAccount[] = appState.planningAccounts.length
    ? appState.planningAccounts.map((account) => ({
        ...account,
        yearlyRows: account.yearlyRows.map((position) => sanitizePosition(position, appState.settings.year))
      }))
    : fallbackPlanningAccounts;
  const selectedPlanningAccountId = planningAccounts.some(
    (account) => account.id === ui.selectedPlanningAccountId
  )
    ? ui.selectedPlanningAccountId
    : planningAccounts[0].id;
  const selectedInvestmentAccountId = planningAccounts.some(
    (account) => account.id === ui.selectedInvestmentAccountId
  )
    ? ui.selectedInvestmentAccountId
    : selectedPlanningAccountId;
  const accountIds = planningAccounts.map((account) => account.id);
  const selectedRealEstateAccountIds = (ui.selectedRealEstateAccountIds ?? []).filter((accountId) =>
    accountIds.includes(accountId)
  );
  const normalizedRealEstateAccountIds = selectedRealEstateAccountIds.length ? selectedRealEstateAccountIds : accountIds;
  const selectedCombinedAccountIds = (ui.selectedCombinedAccountIds ?? accountIds).filter((accountId) =>
    accountIds.includes(accountId)
  );
  const selectedCombinedLeadInvestmentAccountId = accountIds.includes(ui.selectedCombinedLeadInvestmentAccountId)
    ? ui.selectedCombinedLeadInvestmentAccountId
    : selectedInvestmentAccountId;
  const normalizedCombinedLeadInvestmentAccountId = selectedCombinedAccountIds.includes(
    selectedCombinedLeadInvestmentAccountId
  )
    ? selectedCombinedLeadInvestmentAccountId
    : selectedCombinedAccountIds[0] ?? selectedCombinedLeadInvestmentAccountId;
  const positions =
    planningAccounts.find((account) => account.id === selectedPlanningAccountId)?.yearlyRows ??
    appState.positions.map((position) => sanitizePosition(position, appState.settings.year));
  const investmentByAccountId = planningAccounts.reduce<Record<string, InvestmentSettings>>((result, account) => {
    const existing = appState.investmentByAccountId?.[account.id];
    result[account.id] =
      existing ??
      (account.id === selectedInvestmentAccountId
        ? appState.investment ?? defaultInvestmentSettings()
        : defaultInvestmentSettingsForNewAccount());
    return result;
  }, {});
  const investment = investmentByAccountId[selectedInvestmentAccountId] ?? defaultInvestmentSettingsForNewAccount();

  investmentAccountContextId = selectedInvestmentAccountId;
  return {
    ...appState,
    planningAccounts,
    ui: {
      ...fallbackUi,
      ...ui,
      selectedPlanningAccountId,
      selectedInvestmentAccountId,
      selectedRealEstateAccountIds: normalizedRealEstateAccountIds,
      selectedRealEstateWithdrawalGainAccountIds: normalizedRealEstateAccountIds,
      selectedCombinedAccountIds,
      selectedCombinedLeadInvestmentAccountId: normalizedCombinedLeadInvestmentAccountId,
      activeSection: appSectionIdFromValue(ui.activeSection) ?? "home"
    },
    positions,
    investmentByAccountId,
    investment,
    incomeTracker: appState.incomeTracker ?? defaultIncomeTrackerState()
  };
}

function requireRootElement(): HTMLDivElement {
  const element = document.querySelector<HTMLDivElement>("#app");
  if (!element) {
    throw new Error("Application root #app is missing.");
  }
  return element;
}

function renderShell(): void {
  root.innerHTML = renderAppShell();
}

function activePlanningAccount(): PlanningAccount {
  if (!state.planningAccounts.length) {
    state.planningAccounts = [
      {
        id: "default-account",
        name: "Standardkonto",
        type: "mixed",
        yearlyRows: state.positions
      }
    ];
  }
  const account =
    state.planningAccounts.find((item) => item.id === state.ui.selectedPlanningAccountId) ?? state.planningAccounts[0];
  if (!account) {
    throw new Error("No planning account available.");
  }
  if (state.ui.selectedPlanningAccountId !== account.id) {
    state.ui = { ...state.ui, selectedPlanningAccountId: account.id };
  }
  return account;
}

function planningAccountById(accountId: string): PlanningAccount | null {
  return state.planningAccounts.find((account) => account.id === accountId) ?? null;
}

function planningAccountsByIds(accountIds: string[]): PlanningAccount[] {
  if (!accountIds.length) return [];
  return accountIds
    .map((accountId) => planningAccountById(accountId))
    .filter((account): account is PlanningAccount => account !== null);
}

function selectedInvestmentPlanningAccount(): PlanningAccount {
  const selectedId = state.ui.selectedInvestmentAccountId;
  const fallbackId = state.ui.selectedPlanningAccountId;
  const account = planningAccountById(selectedId) ?? planningAccountById(fallbackId) ?? state.planningAccounts[0] ?? null;
  if (!account) {
    throw new Error("No planning account available for investment.");
  }
  if (state.ui.selectedInvestmentAccountId !== account.id) {
    state.ui = { ...state.ui, selectedInvestmentAccountId: account.id };
  }
  return account;
}

function selectedRealEstateSourceAccounts(): PlanningAccount[] {
  return planningAccountsByIds(state.ui.selectedRealEstateAccountIds);
}

function selectedRealEstateWithdrawalAccounts(): PlanningAccount[] {
  return selectedRealEstateSourceAccounts();
}

function selectedCombinedAccounts(): PlanningAccount[] {
  return planningAccountsByIds(state.ui.selectedCombinedAccountIds);
}

function selectedCombinedLeadInvestmentPlanningAccount(): PlanningAccount | null {
  const activeCombinedAccounts = selectedCombinedAccounts();
  if (!activeCombinedAccounts.length) return null;
  const leadId = state.ui.selectedCombinedLeadInvestmentAccountId;
  const lead =
    activeCombinedAccounts.find((account) => account.id === leadId) ??
    activeCombinedAccounts[0] ??
    null;
  if (!lead) return null;
  if (state.ui.selectedCombinedLeadInvestmentAccountId !== lead.id) {
    state.ui = { ...state.ui, selectedCombinedLeadInvestmentAccountId: lead.id };
  }
  return lead;
}

function synchronizeAccountScopedState(): void {
  const accountIds = state.planningAccounts.map((account) => account.id);
  if (!accountIds.length) return;

  if (investmentAccountContextId && accountIds.includes(investmentAccountContextId)) {
    state.investmentByAccountId = {
      ...state.investmentByAccountId,
      [investmentAccountContextId]: state.investment
    };
  }

  const selectedPlanningAccountId = accountIds.includes(state.ui.selectedPlanningAccountId)
    ? state.ui.selectedPlanningAccountId
    : accountIds[0];
  const selectedInvestmentAccountId = accountIds.includes(state.ui.selectedInvestmentAccountId)
    ? state.ui.selectedInvestmentAccountId
    : selectedPlanningAccountId;
  const selectedRealEstateAccountIds = state.ui.selectedRealEstateAccountIds.filter((accountId) =>
    accountIds.includes(accountId)
  );
  const normalizedRealEstateAccountIds = selectedRealEstateAccountIds.length
    ? selectedRealEstateAccountIds
    : [...accountIds];
  const selectedCombinedAccountIds = state.ui.selectedCombinedAccountIds.filter((accountId) =>
    accountIds.includes(accountId)
  );
  const selectedCombinedLeadInvestmentAccountId = accountIds.includes(state.ui.selectedCombinedLeadInvestmentAccountId)
    ? state.ui.selectedCombinedLeadInvestmentAccountId
    : selectedInvestmentAccountId;
  const normalizedCombinedLeadInvestmentAccountId = selectedCombinedAccountIds.includes(
    selectedCombinedLeadInvestmentAccountId
  )
    ? selectedCombinedLeadInvestmentAccountId
    : selectedCombinedAccountIds[0] ?? selectedCombinedLeadInvestmentAccountId;

  const investmentByAccountId = accountIds.reduce<Record<string, InvestmentSettings>>((result, accountId) => {
    result[accountId] = state.investmentByAccountId[accountId] ?? defaultInvestmentSettingsForNewAccount();
    return result;
  }, {});

  state.investmentByAccountId = investmentByAccountId;
  state.ui = {
    ...state.ui,
    selectedPlanningAccountId,
    selectedInvestmentAccountId,
    selectedRealEstateAccountIds: normalizedRealEstateAccountIds,
    selectedRealEstateWithdrawalGainAccountIds: normalizedRealEstateAccountIds,
    selectedCombinedAccountIds,
    selectedCombinedLeadInvestmentAccountId: normalizedCombinedLeadInvestmentAccountId
  };
  state.investment = state.investmentByAccountId[selectedInvestmentAccountId] ?? defaultInvestmentSettingsForNewAccount();
  investmentAccountContextId = selectedInvestmentAccountId;
}

function syncActivePlanningAccountFromPositions(): void {
  const account = activePlanningAccount();
  state.planningAccounts = state.planningAccounts.map((item) =>
    item.id === account.id ? { ...item, yearlyRows: state.positions } : item
  );
}

function syncPositionsFromActivePlanningAccount(): void {
  state.positions = activePlanningAccount().yearlyRows;
}

function appSectionIdFromValue(value: unknown): AppSectionId | null {
  return APP_SECTION_IDS.includes(value as AppSectionId) ? (value as AppSectionId) : null;
}

function sectionFromLocationHash(): AppSectionId | null {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;
  return appSectionIdFromValue(decodeURIComponent(hash));
}

function applyInitialRoute(): void {
  const section = sectionFromLocationHash() ?? "home";
  state.ui = { ...state.ui, activeSection: section };
  replaceSectionHistory(section);
}

function sectionUrl(section: AppSectionId): string {
  return `${window.location.pathname}${window.location.search}#${encodeURIComponent(section)}`;
}

function pushSectionHistory(section: AppSectionId): void {
  const hash = `#${encodeURIComponent(section)}`;
  if (window.location.hash === hash) return;
  window.history.pushState({ activeSection: section }, "", sectionUrl(section));
}

function replaceSectionHistory(section: AppSectionId): void {
  window.history.replaceState({ activeSection: section }, "", sectionUrl(section));
}

function setActiveSection(section: AppSectionId, options: { updateHistory?: boolean } = {}): void {
  const activeSection = appSectionIdFromValue(section) ?? "home";
  state.ui = { ...state.ui, activeSection };
  if (options.updateHistory !== false) {
    pushSectionHistory(activeSection);
  }
  hideThemeSettings();
}

function updateModuleVisibility(): void {
  const activeSection = state.ui.activeSection;
  for (const button of document.querySelectorAll<HTMLButtonElement>("button[data-section-id]")) {
    const sectionId = button.dataset.sectionId;
    const isActive = sectionId === activeSection;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }
  for (const section of document.querySelectorAll<HTMLElement>("[data-module-section]")) {
    const sectionId = section.dataset.moduleSection as AppSectionId | undefined;
    section.hidden = sectionId !== activeSection;
  }
}

function bindEvents(): void {
  root.addEventListener("input", (event) => {
    const target = formControl(event.target);
    if (!target) return;

    if (target.dataset.positionFilterDraft === "value") {
      updatePositionFilterDraft("value", target.value);
      return;
    }

    if (target.dataset.accountDialogField) {
      updateAccountDialogDraft(target.dataset.accountDialogField, target.value);
      return;
    }

    if (target.dataset.setting) {
      updatePlanningSetting(target.dataset.setting as keyof PlanningSettings, target.value);
      renderAll();
      return;
    }

    if (target.dataset.investment) {
      updateInvestmentSetting(target.dataset.investment as keyof InvestmentSettings, target.value);
      renderAll();
      return;
    }

    if (target.dataset.realEstateField) {
      updateRealEstateField(target.dataset.realEstateField as RealEstateField, target.value);
      renderAll();
      return;
    }

    if (target.dataset.realEstateRange) {
      updateRealEstateField(target.dataset.realEstateRange as RealEstateField, target.value);
      renderAll();
      return;
    }

    if (target.dataset.incomeCollection && target.dataset.incomeId && target.dataset.incomeField) {
      const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
      updateIncomeEntry(
        target.dataset.incomeCollection,
        target.dataset.incomeId,
        target.dataset.incomeField,
        value
      );
      renderIncomeLiveUpdate(
        target.dataset.incomeCollection,
        target.dataset.incomeId,
        target.dataset.incomeField
      );
      saveState(state);
      return;
    }

    if (target.dataset.incomeSetting) {
      updateIncomeSetting(target.dataset.incomeSetting as keyof IncomeTrackerSettings, target.value);
      renderIncomeLiveUpdate();
      saveState(state);
      return;
    }

    if (target.dataset.retirementAge) {
      updateRetirementAge(target.value);
      renderAll();
    }
  });

  root.addEventListener("change", (event) => {
    const target = formControl(event.target);
    if (!target) return;

    if (target.dataset.positionFilterDraft) {
      updatePositionFilterDraft(target.dataset.positionFilterDraft as keyof PositionFilterDraft, target.value);
      return;
    }

    if (target.dataset.accountDialogField) {
      updateAccountDialogDraft(target.dataset.accountDialogField, target.value);
      return;
    }

    if (target.dataset.realEstateField) {
      updateRealEstateField(target.dataset.realEstateField as RealEstateField, target.value);
      renderAll();
      return;
    }

    if (target.dataset.incomeCollection && target.dataset.incomeId && target.dataset.incomeField) {
      const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
      updateIncomeEntry(
        target.dataset.incomeCollection,
        target.dataset.incomeId,
        target.dataset.incomeField,
        value
      );
      renderAll();
      return;
    }

    if (target.dataset.incomeSetting) {
      updateIncomeSetting(target.dataset.incomeSetting as keyof IncomeTrackerSettings, target.value);
      renderAll();
      return;
    }

    if (target.dataset.positionId && target.dataset.positionField) {
      const value = target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value;
      updatePosition(target.dataset.positionId, target.dataset.positionField as keyof ReservePosition, value);
      renderAll();
      return;
    }

    if (target.dataset.includePosition && target instanceof HTMLInputElement) {
      toggleInvestmentPosition(target.dataset.includePosition, target.checked);
      renderAll();
      return;
    }

    if (
      target.dataset.realEstateSourcePosition &&
      target.dataset.realEstateSourceKind &&
      target instanceof HTMLInputElement
    ) {
      toggleRealEstateSourcePosition(
        target.dataset.realEstateSourceKind as RealEstatePaymentSourceKind,
        target.dataset.realEstateSourcePosition,
        target.checked
      );
      renderAll();
      return;
    }

    if (target.dataset.combinedToggle && target instanceof HTMLInputElement) {
      updateCombinedToggle(target.dataset.combinedToggle as CombinedToggleKey, target.checked);
      renderAll();
      return;
    }

    if (target.id === "positionsCsvImport" && target instanceof HTMLInputElement) {
      void importPositionsFromFile(target.files?.[0]);
      target.value = "";
    }

    if (target.id === "incomeCsvImport" && target instanceof HTMLInputElement) {
      void importIncomeCsvFromFile(target.files?.[0]);
      target.value = "";
    }
  });

  root.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>("button[data-action]");
    if (!button) {
      if (positionIconPicker && !target?.closest("#positionIconPicker")) {
        hidePositionIconPicker();
      }
      if (incomeYearLabelPicker && !target?.closest("#incomeYearLabelPicker")) {
        hideIncomeYearLabelPicker();
      }
      if (incomeMilestoneTypePicker && !target?.closest("#incomeMilestoneTypePicker")) {
        hideIncomeMilestoneTypePicker();
      }
      if (positionFilterPopupOpen && !target?.closest("#positionFilterPopup")) {
        hidePositionFilterPopup();
      }
      return;
    }

    event.preventDefault();
    const action = button.dataset.action;
    if (action !== "open-position-icon-picker" && action !== "select-position-icon") {
      hidePositionIconPicker();
    }
    if (action !== "open-income-year-label-picker" && action !== "select-income-year-label") {
      hideIncomeYearLabelPicker();
    }
    if (action !== "open-income-milestone-type-picker" && action !== "select-income-milestone-type") {
      hideIncomeMilestoneTypePicker();
    }
    if (positionFilterPopupOpen && action !== "toggle-position-filter" && !button.closest("#positionFilterPopup")) {
      hidePositionFilterPopup();
    }
    if (action === "add-position") addPosition();
    if (action === "reset") resetState();
    if (action === "show-income-positions") setSelectedPositionMode("income");
    if (action === "show-expense-positions") setSelectedPositionMode("expense", "regular");
    if (action === "toggle-expense-once") {
      setSelectedPositionMode("expense", selectedExpenseSubmode === "once" ? "regular" : "once");
    }
    if (action === "show-reserve-positions") setSelectedPositionMode("reserve");
    if (action === "show-savings-positions") setSelectedPositionMode("savings");
    if (action === "toggle-position-filter") togglePositionFilterPopup();
    if (action === "close-position-filter") hidePositionFilterPopup();
    if (action === "toggle-position-label-filter") togglePositionLabelFilter(button.dataset.positionLabel || "");
    if (action === "add-position-filter") addPositionTableFilter();
    if (action === "remove-position-filter") removePositionTableFilter(button.dataset.filterId || "");
    if (action === "clear-position-sort") clearPositionTableSort();
    if (action === "clear-position-table-view") clearCurrentPositionTableView();
    if (action?.startsWith("sort-position-table-")) {
      togglePositionTableSort(action.replace("sort-position-table-", "") as PositionTableFilterColumn);
    }
    if (action?.startsWith("open-section-")) {
      const section = appSectionIdFromValue(action.replace("open-section-", ""));
      if (!section) return;
      setActiveSection(section);
      renderAll();
      return;
    }
    if (action?.startsWith("income-tab-")) setIncomeInputTab(action.replace("income-tab-", ""));
    if (action === "income-add-yearly") addIncomeYearlyEntry();
    if (action === "income-add-milestone") addIncomeMilestone();
    if (action?.startsWith("income-open-tax-dialog-")) openIncomeTaxDialog(action.replace("income-open-tax-dialog-", ""));
    if (action === "income-close-tax-dialog") closeIncomeTaxDialog();
    if (action === "income-open-analysis") openIncomeAnalysisDialog();
    if (action === "income-close-analysis") closeIncomeAnalysisDialog();
    if (action?.startsWith("income-analysis-chart-")) {
      setIncomeAnalysisChartType(action.replace("income-analysis-chart-", "") as IncomeAnalysisChartType);
    }
    if (action?.startsWith("income-analysis-view-")) {
      setIncomeAnalysisDataView(action.replace("income-analysis-view-", "") as IncomeAnalysisDataView);
    }
    if (action?.startsWith("income-analysis-year-")) {
      setIncomeAnalysisYearFilter(action.replace("income-analysis-year-", ""));
    }
    if (action === "toggle-income-year-label-filter") toggleIncomeYearLabelFilter(button.dataset.incomeLabel || "");
    if (action === "income-import-csv") document.querySelector<HTMLInputElement>("#incomeCsvImport")?.click();
    if (action?.startsWith("income-remove-")) removeIncomeEntry(action);
    if (action === "income-export-csv") void exportIncomeCsv();
    if (action === "income-export-pdf") exportIncomePdf();
    if (action === "add-planning-account") addPlanningAccount();
    if (action === "rename-planning-account") renamePlanningAccount();
    if (action === "cancel-planning-account-dialog") closePlanningAccountDialog();
    if (action === "save-planning-account-dialog") savePlanningAccountDialog();
    if (action === "delete-planning-account") deletePlanningAccount();
    if (action?.startsWith("select-planning-account-")) {
      selectPlanningAccount(action.replace("select-planning-account-", ""));
    }
    if (action?.startsWith("select-investment-account-")) {
      selectInvestmentAccount(action.replace("select-investment-account-", ""));
    }
    if (action?.startsWith("toggle-real-estate-account-")) {
      toggleRealEstateSourceAccount(action.replace("toggle-real-estate-account-", ""));
    }
    if (action?.startsWith("toggle-combined-account-")) {
      toggleCombinedAccount(action.replace("toggle-combined-account-", ""));
    }
    if (action?.startsWith("select-combined-lead-account-")) {
      selectCombinedLeadInvestmentAccount(action.replace("select-combined-lead-account-", ""));
    }
    if (action === "toggle-result-max-needed") toggleResultMaxNeeded();
    if (action === "set-investment-depot-standard") setInvestmentDepot("standard");
    if (action === "set-investment-depot-retirement") setInvestmentDepot("retirement");
    if (action === "set-investment-depot-child") setInvestmentDepot("child");
    if (action === "toggle-interest-investment") toggleInterestInvestment();
    if (action === "toggle-cashback-investment") toggleCashbackInvestment();
    if (action === "toggle-real-estate-withdrawal-gain-source") toggleRealEstateWithdrawalGainSource();
    if (action === "toggle-real-estate-depot-savings-rate-source") toggleRealEstateDepotSavingsRateSource();
    if (action === "toggle-combined-module") {
      toggleCombinedModule(button.dataset.combinedToggle as CombinedToggleKey);
      renderAll();
      return;
    }
    if (action === "add-real-estate-savings-source-equityCapital") addRealEstateSavingsSource("equityCapital");
    if (action === "add-real-estate-savings-source-monthlyPayment") addRealEstateSavingsSource("monthlyPayment");
    if (action === "add-real-estate-savings-source-specialRepayment") addRealEstateSavingsSource("specialRepayment");
    if (action === "show-reserve-chart") showReserveChartPopup();
    if (action === "close-reserve-chart") hideReserveChartPopup();
    if (action?.startsWith("set-reserve-chart-category-")) {
      setReserveChartCategory(action.replace("set-reserve-chart-category-", "") as ReserveChartCategory);
    }
    if (action?.startsWith("set-reserve-chart-scenario-")) {
      setReserveChartScenario(action.replace("set-reserve-chart-scenario-", "") as ReserveChartScenario);
    }
    if (action?.startsWith("set-reserve-chart-style-")) {
      setReserveChartStyle(action.replace("set-reserve-chart-style-", "") as ReserveChartStyle);
    }
    if (action === "highlight-reserve-position") setReserveChartHighlight(button.dataset.reservePositionId || null);
    if (action === "clear-reserve-position-highlight") setReserveChartHighlight(null);
    if (action?.startsWith("set-reserve-chart-adjustment-")) {
      setReserveChartAdjustment(action.replace("set-reserve-chart-adjustment-", "") as ReserveChartAdjustment);
    }
    if (action === "close-investment-chart-popup") hideInvestmentChartPopup();
    if (action === "toggle-theme-settings") toggleThemeSettings();
    if (action === "toggle-settings-grunddaten") toggleSettingsGrunddaten();
    if (action === "close-theme-settings") hideThemeSettings();
    if (action === "open-position-icon-picker") showPositionIconPicker(button);
    if (action === "close-position-icon-picker") hidePositionIconPicker();
    if (action === "select-position-icon") {
      selectPositionIcon(button.dataset.positionId || "", button.dataset.positionIcon || "");
    }
    if (action === "open-income-year-label-picker") showIncomeYearLabelPicker(button);
    if (action === "close-income-year-label-picker") hideIncomeYearLabelPicker();
    if (action === "select-income-year-label") {
      selectIncomeYearLabel(button.dataset.incomeYearId || "", button.dataset.incomeLabel || "");
    }
    if (action === "open-income-milestone-type-picker") showIncomeMilestoneTypePicker(button);
    if (action === "close-income-milestone-type-picker") hideIncomeMilestoneTypePicker();
    if (action === "select-income-milestone-type") {
      selectIncomeMilestoneType(button.dataset.milestoneId || "", button.dataset.milestoneType || "");
    }
    if (action === "set-theme-light") setThemeMode("light");
    if (action === "set-theme-dark") setThemeMode("dark");
    if (action === "select-real-estate-year") {
      const year = numberValue(button.dataset.year || "");
      const chartKind = button.dataset.chartKind === "trend" ? "trend" : "repayment";
      setSelectedRealEstateYear(year);
      showRealEstateChartPopup(year, chartKind, event.clientX, event.clientY);
      return;
    }
    if (action === "select-combined-wealth-year") setSelectedCombinedWealthYear(numberValue(button.dataset.year || ""));
    if (action === "import-positions") document.querySelector<HTMLInputElement>("#positionsCsvImport")?.click();
    if (action === "export-positions") {
      void exportCsvFile(
        "kosten-und-ruecklagenpositionen.csv",
        exportPositionsCsv(state.positions),
        "Positionen-Export"
      );
    }
    if (action === "export-year") {
      void exportCsvFile(
        "jahreskalkulator-ruecklagen.csv",
        exportYearTableCsv(state.settings, state.positions, showResultMaxNeeded),
        "Jahrestabellen-Export"
      );
    }
  });

  root.addEventListener("dragstart", (event) => {
    if (hasActivePositionTableView(currentPositionTableView())) return;
    const handle = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-position-drag-id]");
    if (!handle) return;

    draggedPositionId = handle.dataset.positionDragId || null;
    if (!draggedPositionId) return;

    event.dataTransfer?.setData("text/plain", draggedPositionId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    handle.closest("tr")?.classList.add("dragging");
  });

  root.addEventListener("dragover", (event) => {
    if (hasActivePositionTableView(currentPositionTableView())) return;
    const row = (event.target as HTMLElement | null)?.closest<HTMLTableRowElement>("tr[data-position-row]");
    if (!row || !draggedPositionId) return;
    event.preventDefault();
    row.classList.add("drag-over");
  });

  root.addEventListener("dragleave", (event) => {
    const row = (event.target as HTMLElement | null)?.closest<HTMLTableRowElement>("tr[data-position-row]");
    row?.classList.remove("drag-over");
  });

  root.addEventListener("drop", (event) => {
    if (hasActivePositionTableView(currentPositionTableView())) return;
    const row = (event.target as HTMLElement | null)?.closest<HTMLTableRowElement>("tr[data-position-row]");
    if (!row || !draggedPositionId) return;
    event.preventDefault();

    const targetId = row.dataset.positionRow;
    if (targetId) {
      const afterTarget = event.clientY > row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2;
      reorderPosition(draggedPositionId, targetId, afterTarget);
      renderAll();
    }
    clearDragState();
  });

  root.addEventListener("dragend", clearDragState);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideThemeSettings();
      hideInvestmentChartPopup();
      hideReserveChartPopup();
      hidePositionFilterPopup();
      closePlanningAccountDialog();
      closeIncomeTaxDialog();
      closeIncomeAnalysisDialog();
      hideIncomeYearLabelPicker();
      hideIncomeMilestoneTypePicker();
    }
  });
  window.addEventListener("popstate", () => {
    const section = sectionFromLocationHash() ?? "home";
    setActiveSection(section, { updateHistory: false });
    renderAll();
  });
  window.addEventListener("resize", drawCurrentInvestmentChart);
}

function renderAll(): void {
  syncActivePlanningAccountFromPositions();
  syncPositionsFromActivePlanningAccount();
  synchronizeAccountScopedState();
  normalizeInvestmentBounds();
  normalizeInvestmentDepotSelections();
  normalizeInvestmentSelectionIds();
  normalizeRealEstateSourceIds();
  state.investmentByAccountId = {
    ...state.investmentByAccountId,
    [state.ui.selectedInvestmentAccountId]: state.investment
  };
  updateModuleVisibility();
  renderPlanningAccounts();
  const investmentAccount = selectedInvestmentPlanningAccount();
  const reserve = calculateReserveSummary(state.settings, investmentAccount.yearlyRows);
  const activeReserve = calculateReserveSummary(state.settings, state.positions);
  renderPositions();
  renderInvestmentIncludeList(reserve);
  renderCalculations(reserve, activeReserve);
  syncRealEstateInputsFromState();
  syncCombinedToggleInputsFromState();
  syncInvestmentInputsFromState();
  syncSettingsAccordionState();
  renderIncomeTracker();
  saveState(state);
}

function renderCalculations(
  reserve: ReturnType<typeof calculateReserveSummary>,
  activeReserve: ReturnType<typeof calculateReserveSummary>
): void {
  const standardProjection = buildDepotAssetProjection(reserve, "standard");
  const retirementProjection = buildDepotAssetProjection(reserve, "retirement");
  const childProjection = buildDepotAssetProjection(reserve, "child");
  const activeDepot = activeInvestmentDepot();
  const projection =
    activeDepot === "child" ? childProjection : activeDepot === "retirement" ? retirementProjection : standardProjection;
  const combinedProjection = combineAssetProjections(standardProjection, retirementProjection);
  syncInvestmentProjectionLabels(activeDepot);

  setText("monthlyRateMetric", money(projection.monthlyRate));
  setText("monthlySavingsRateMetric", `${money(projection.monthlyRate)} monatlich`);
  setText("annualSavingsRateMetric", money(projection.annualSavingsRate));
  setText("wealthAtRetirementMetric", money(projection.wealthAtRetirement));
  setText("withdrawalOffsetMetric", money(projection.withdrawalRemainingSavingsMonthlyAtStart));
  setText("withdrawalGainMetric", money(projection.withdrawalGainMonthlyAtStart));
  setText("monthlyPensionMetric", money(projection.monthlyPension));
  setText("realWealthMetric", money(projection.realWealthAtRetirement));
  setText("combinedStandardWealthMetric", money(standardProjection.wealthAtRetirement));
  setText("combinedRetirementWealthMetric", money(retirementProjection.wealthAtRetirement));
  setText("combinedWealthMetric", money(combinedProjection.wealthAtRetirement));
  setText("combinedMonthlyRateMetric", money(combinedProjection.monthlyRate));
  setText("combinedMonthlyPensionMetric", money(combinedProjection.monthlyPension));
  setText("combinedRealWealthMetric", money(combinedProjection.realWealthAtRetirement));
  setText("retirementDepotFundingStatus", "Aktiv nach Reformlogik ab 2027");
  setText("retirementDepotOwnContributionMetric", money(projection.retirementDepotAnnualOwnContribution));
  setText("retirementDepotBaseAllowanceMetric", money(projection.retirementDepotBaseAllowanceAnnual));
  setText("retirementDepotChildAllowanceMetric", money(projection.retirementDepotChildAllowanceAnnual));
  setText("retirementDepotAllowanceRateMetric", percent(projection.retirementDepotAllowanceRatePercent));
  setText("retirementDepotTotalAllowanceMetric", money(projection.retirementDepotAllowanceAnnual));
  setText("retirementDepotTotalContributionMetric", money(projection.retirementDepotAnnualContributionWithAllowance));
  setText("retirementDepotAllowanceAtRetirementMetric", money(projection.allowanceAtRetirement));

  const activeSettings = depotInvestmentSettings(activeInvestmentDepot());
  setRangeLabel("investmentReturnPercent", percent(activeSettings.investmentReturnPercent));
  setRangeLabel("capitalGainsTaxPercent", percent(activeSettings.capitalGainsTaxPercent));
  setRangeLabel("inflationRatePercent", percent(activeSettings.inflationRatePercent));
  setRangeLabel("bequestReservePercent", percent(activeSettings.bequestReservePercent));
  setInputValue("[data-retirement-age]", projection.retirementAge);

  setText(
    "detailContribution",
    contributionDetailText(projection)
  );
  setText("detailAllowance", money(projection.allowanceAtRetirement));
  setText("detailAllowanceBasis", money(projection.allowanceBasisAtRetirement));
  setText(
    "detailCostBasis",
    money(Math.max(0, projection.costBasisAtRetirement - projection.allowanceBasisAtRetirement))
  );
  setText("detailGrowth", money(projection.growthAtRetirement));
  setText("detailGrossWealth", money(projection.grossWealthAtRetirement));
  setText("detailTax", projection.taxAtRetirement > 0 ? `-${money(projection.taxAtRetirement)}` : money(0));
  setText(
    "detailUnrealizedTax",
    projection.unrealizedTaxAtRetirement > 0 ? `-${money(projection.unrealizedTaxAtRetirement)}` : money(0)
  );
  setText("detailLiquidationWealth", money(projection.netWealthAfterFullTaxAtRetirement));
  setText("detailNetWealth", money(projection.wealthAtRetirement));
  setText("detailInflationFactor", `${projection.inflationFactorAtRetirement.toFixed(2).replace(".", ",")}x`);
  setText("detailRealWealth", money(projection.realWealthAtRetirement));
  setText("detailAnnualSavingsRate", money(projection.annualSavingsRate));
  setText("detailAgeToday", `${intNumber(projection.ageToday)} Jahre`);
  setText("detailPayoutStartAge", `${intNumber(projection.retirementAge)} Jahre`);
  setText("detailPercentageWithdrawalStartAge", `${intNumber(projection.percentageWithdrawalStartAge)} Jahre`);
  setText("detailPercentageWithdrawalRate", percent(projection.percentageWithdrawalRatePercent));
  setText("detailPercentageWithdrawalMonthly", money(projection.percentageWithdrawalMonthlyAtStart));
  setText("detailPercentageWithdrawalAnnual", money(projection.percentageWithdrawalAnnualAtStart));
  setText("detailSavingMonths", `${intNumber(projection.savingMonths)} Monate`);
  setText("detailMonthlyPension", money(projection.monthlyPension));
  setText("detailRealMonthlyPension", money(projection.realMonthlyPension));
  setText(
    "detailBequestReserve",
    `${money(projection.bequestReserveAtEnd)} (${percent(projection.bequestReservePercent)})`
  );
  setText("detailSelectedMonthlyRate", money(projection.monthlyRate));

  renderAccountYearTables();
  renderReserveChartPopup(activeReserve);
  hideInvestmentChartPopup();
  drawInvestmentChartWithPopup(projection);
  drawInvestmentChartWithPopup(combinedProjection, "#combinedInvestmentChart", "#combinedInvestmentChartPopup");

  const financingStartYear = realEstateFinancingStartYear(
    state.settings.year,
    state.investment.birthYear,
    state.realEstate.financingStartAge
  );
  const realEstateProjectionYears = currentRealEstateProjectionYears(financingStartYear, standardProjection.endAge);
  const maxRealEstateProjectionYears = currentRealEstateMaximumProjectionYears(financingStartYear);
  const combinedLeadAccount = selectedCombinedLeadInvestmentPlanningAccount();
  const combinedLeadSettings = combinedLeadAccount
    ? state.investmentByAccountId[combinedLeadAccount.id] ?? defaultInvestmentSettingsForNewAccount()
    : null;
  const combinedStandardProjection = combinedLeadAccount
    ? buildDepotAssetProjection(calculateReserveSummary(state.settings, combinedLeadAccount.yearlyRows), "standard", combinedLeadAccount.id)
    : combinedProjectionWithoutAccounts(standardProjection);
  const combinedRetirementProjection = combinedLeadAccount
    ? buildDepotAssetProjection(
        calculateReserveSummary(state.settings, combinedLeadAccount.yearlyRows),
        "retirement",
        combinedLeadAccount.id
      )
    : combinedProjectionWithoutAccounts(retirementProjection);
  const combinedBirthYear = combinedLeadSettings?.birthYear ?? state.settings.year;
  const combinedRetirementBirthYear = combinedLeadSettings?.retirementBirthYear ?? state.settings.year;
  const combinedRealEstateProjectionYears = currentCombinedRealEstateProjectionYears(
    financingStartYear,
    combinedStandardProjection,
    combinedRetirementProjection,
    combinedBirthYear,
    combinedRetirementBirthYear
  );
  renderRealEstateSourceLists();
  const realEstate = calculateRealEstateFinancing(
    financingStartYear,
    state.realEstate,
    realEstateSourceSchedule(financingStartYear, maxRealEstateProjectionYears),
    {
      projectionYears: realEstateProjectionYears,
      maxProjectionYears: maxRealEstateProjectionYears
    }
  );
  renderRealEstateCalculations(realEstate, realEstateProjectionYears);
  const combinedRealEstate = calculateRealEstateFinancing(
    financingStartYear,
    state.realEstate,
    realEstateSourceSchedule(financingStartYear, combinedRealEstateProjectionYears, state.ui.selectedCombinedAccountIds),
    {
      projectionYears: combinedRealEstateProjectionYears,
      maxProjectionYears: combinedRealEstateProjectionYears
    }
  );
  const combinedYears = calculateCombinedWealthYears(
    combinedStandardProjection,
    combinedRetirementProjection,
    combinedRealEstate,
    combinedBirthYear,
    combinedRetirementBirthYear
  );
  renderCombinedWealthCalculations(combinedYears);
}

function syncInvestmentProjectionLabels(depot: InvestmentDepotKey): void {
  const isChild = depot === "child";
  setSectionHidden("#combinedInvestmentCard", isChild);
  setSectionHidden("#withdrawalGainMetricCard", isChild);
  setSectionHidden("#monthlyPensionMetricCard", isChild);
  setText("wealthAtRetirementMetricLabel", isChild ? "Vermoegen zur Auszahlung" : "Vermoegen zur Rente");
  setText("monthlyPensionMetricLabel", isChild ? "Monatliche Auszahlung netto" : "Monatliche Rente netto");
  setText("realWealthMetricLabel", isChild ? "Reales Vermoegen zur Auszahlung" : "Reales Vermoegen zur Rente");
  setText("detailAgeTodayLabel", isChild ? "Alter des Kindes heute" : "Alter heute");
  setText("detailTaxLabel", isChild ? "Realisierte Steuern bis Auszahlung" : "Realisierte Steuern bis Rente");
  setText(
    "detailUnrealizedTaxLabel",
    isChild ? "Offene Steuer bei Verkauf zur Auszahlung" : "Offene Steuer bei Verkauf zur Rente"
  );
  setText("detailPayoutStartAgeLabel", isChild ? "Auszahlung ab Alter" : "Gleichmaessige Entnahme ab Alter");
  setText(
    "detailMonthlyPensionLabel",
    isChild ? "Monatliche Auszahlung netto" : "Monatliche gleichmaessige Entnahme netto"
  );
  setText(
    "detailRealMonthlyPensionLabel",
    isChild ? "Monatliche Auszahlung real" : "Monatliche gleichmaessige Entnahme real"
  );
  setText("detailBequestReserveLabel", isChild ? "Reserve zum Auszahlungsalter" : "Reserve/Erbe zum Endalter");
}

function renderIncomeTracker(): void {
  const panel = document.querySelector<HTMLElement>('[data-module-section="income_tracking"]');
  if (!panel) return;
  const model = incomeTrackerModel();
  renderIncomeTabs();
  renderIncomeYearLabelFilters();
  renderIncomeRows();
  renderIncomeSettingControls();
  renderIncomeMetricGrid(model);
  renderIncomeInsights(model);
  renderIncomeYearStatusRows(model);
  renderIncomeCharts(model);
  renderIncomeTaxDialog();
  renderIncomeAnalysisDialog(model);
  renderIncomeYearLabelPicker();
  renderIncomeMilestoneTypePicker();
}

function incomeTrackerModel(): IncomeTrackerModel {
  return buildIncomeTrackerModel(state.incomeTracker, {
    annualInflationRatePercent: incomeGeneralInflationRatePercent()
  });
}

function incomeGeneralInflationRatePercent(): number {
  return depotInvestmentSettings(activeInvestmentDepot()).inflationRatePercent;
}

function renderIncomeLiveUpdate(collection?: string, id?: string, field?: string): void {
  const model = incomeTrackerModel();
  if (collection === "yearlyEntries" && id) {
    renderIncomeYearlyNetCell(id, field);
    renderIncomeYearlyTaxButton(id);
    renderIncomeTaxDialogTotals(id);
  }
  renderIncomeMetricGrid(model);
  renderIncomeInsights(model);
  renderIncomeYearStatusRows(model);
  renderIncomeCharts(model);
  renderIncomeAnalysisDialog(model);
}

function renderIncomeYearlyNetCell(id: string, changedField?: string): void {
  const entry = state.incomeTracker.yearlyEntries.find((item) => item.id === id);
  const input = document.querySelector<HTMLInputElement>(`[data-income-year-net="${cssEscape(id)}"]`);
  if (!entry || !input) return;
  const calculatedNet = incomeYearEntryCalculatedNetIncome(entry);
  const netValue = incomeYearEntryNetIncome(entry);
  input.disabled = calculatedNet !== null;
  if (changedField === "annualNetIncome" && calculatedNet === null && document.activeElement === input) return;
  input.value = netValue === null ? "" : String(netValue);
}

function renderIncomeYearlyTaxButton(id: string): void {
  const entry = state.incomeTracker.yearlyEntries.find((item) => item.id === id);
  const value = document.querySelector<HTMLElement>(`[data-income-year-tax-total="${cssEscape(id)}"]`);
  if (!entry || !value) return;
  const taxDeductions = incomeYearEntryTaxDeductions(entry);
  value.textContent = taxDeductions === null ? "Eintragen" : money(taxDeductions);
}

function renderIncomeTaxDialogTotals(id: string): void {
  if (incomeTaxDialogEntryId !== id) return;
  const entry = state.incomeTracker.yearlyEntries.find((item) => item.id === id);
  if (!entry) return;
  const taxTotal = incomeTaxDeductionCategoryTotal(entry, "taxes");
  const socialTotal = incomeTaxDeductionCategoryTotal(entry, "social");
  const employerSocialTotal = incomeTaxDeductionCategoryTotal(entry, "employer_social");
  const total = incomeYearEntryTaxDeductions(entry);
  setText("incomeTaxDialogTaxesTotal", money(taxTotal));
  setText("incomeTaxDialogSocialTotal", money(socialTotal));
  setText("incomeTaxDialogEmployerSocialTotal", money(employerSocialTotal));
  setText("incomeTaxDialogGrandTotal", total === null ? "-" : money(total));
}

function renderIncomeTabs(): void {
  const activeTab = state.incomeTracker.settings.activeInputTab;
  for (const tab of ["yearly", "milestones", "settings"] as const) {
    const button = document.querySelector<HTMLButtonElement>(`[data-action="income-tab-${tab}"]`);
    if (button) {
      button.classList.toggle("active", tab === activeTab);
      button.setAttribute("aria-pressed", String(tab === activeTab));
    }
  }
  setSectionHidden("#incomeYearlyTab", activeTab !== "yearly");
  setSectionHidden("#incomeMilestonesTab", activeTab !== "milestones");
  setSectionHidden("#incomeSettingsTab", activeTab !== "settings");
}

function renderIncomeRows(): void {
  renderIncomeYearlyRows();
  renderIncomeMilestoneRows();
}

function renderIncomeYearLabelFilters(): void {
  const host = document.querySelector<HTMLDivElement>("#incomeYearLabelFilters");
  if (!host) return;
  const selected = new Set(state.incomeTracker.settings.selectedYearlyLabels.map(incomeYearLabel));
  const options = INCOME_YEAR_LABEL_OPTIONS;
  host.innerHTML = `
    ${options
      .map((option) => {
        const active = selected.has(option.id);
        return `
          <button
            class="position-label-filter-button${active ? " active" : ""}"
            type="button"
            data-action="toggle-income-year-label-filter"
            data-income-label="${escapeHtml(option.id)}"
            aria-pressed="${active}"
            aria-label="Label ${escapeHtml(option.label)} ${active ? "deaktivieren" : "aktivieren"}"
            title="${escapeHtml(option.label)}"
          >
            ${positionIconSvg(option.icon)}
          </button>
        `;
      })
      .join("")}
  `;
}

function renderIncomeYearlyRows(): void {
  const body = document.querySelector<HTMLTableSectionElement>("#incomeYearlyRows");
  if (!body) return;
  if (!state.incomeTracker.yearlyEntries.length) {
    body.innerHTML = `<tr><td class="position-empty" colspan="8">Noch keine Jahreswerte eingetragen.</td></tr>`;
    return;
  }
  const rows = incomeFilteredYearEntries();
  if (!rows.length) {
    body.innerHTML = `<tr><td class="position-empty" colspan="8">Keine Jahreswerte fuer diese Labelauswahl.</td></tr>`;
    return;
  }
  body.innerHTML = rows
    .map((entry) => {
      const calculatedNet = incomeYearEntryCalculatedNetIncome(entry);
      const netIncome = incomeYearEntryNetIncome(entry);
      return `
      <tr>
        <td class="check-cell income-year-flag-cell">${incomeCheckboxInput(
          "yearlyEntries",
          entry.id,
          "active",
          entry.active,
          "Jahreswert aktiv"
        )}</td>
        <td class="check-cell income-year-flag-cell">${incomeCheckboxInput(
          "yearlyEntries",
          entry.id,
          "visible",
          entry.visible,
          "Jahreswert in Grafiken sichtbar"
        )}</td>
        <td class="income-year-label-cell">${incomeYearLabelButton(entry)}</td>
        <td>${incomeNumberInput("yearlyEntries", entry.id, "year", entry.year, { min: 1900, max: 2200, step: 1 })}</td>
        <td>${incomeNumberInput("yearlyEntries", entry.id, "annualNetIncome", netIncome, {
          min: 0,
          disabled: calculatedNet !== null,
          extraAttribute: `data-income-year-net="${escapeHtml(entry.id)}"`
        })}</td>
        <td>${incomeNumberInput("yearlyEntries", entry.id, "annualGrossIncome", entry.annualGrossIncome, { min: 0 })}</td>
        <td>${incomeTaxDeductionsButton(entry)}</td>
        <td><button class="icon-button danger" type="button" data-action="income-remove-yearly-${entry.id}" aria-label="Jahreswert entfernen">x</button></td>
      </tr>
    `;
    })
    .join("");
}

function renderIncomeTaxDialog(): void {
  const root = document.querySelector<HTMLDivElement>("#incomeTaxDialogRoot");
  if (!root) return;
  const entry = state.incomeTracker.yearlyEntries.find((item) => item.id === incomeTaxDialogEntryId);
  if (!entry) {
    root.innerHTML = "";
    incomeTaxDialogEntryId = null;
    return;
  }

  const taxTotal = incomeTaxDeductionCategoryTotal(entry, "taxes");
  const socialTotal = incomeTaxDeductionCategoryTotal(entry, "social");
  const employerSocialTotal = incomeTaxDeductionCategoryTotal(entry, "employer_social");
  const total = incomeYearEntryTaxDeductions(entry);
  root.innerHTML = `
    <div class="income-tax-dialog-backdrop" role="presentation">
      <div class="income-tax-dialog" role="dialog" aria-modal="true" aria-label="Steuer- und Abgabenpositionen">
        <div class="income-tax-dialog-head">
          <div>
            <strong>Steuer- und Abgabenpositionen</strong>
            <span>${escapeHtml(String(entry.year))} · ${escapeHtml(incomeYearLabelMeta(entry.label).label)}</span>
          </div>
          <button class="chart-popup-close" type="button" data-action="income-close-tax-dialog" aria-label="Dialog schliessen">x</button>
        </div>
        <div class="table-wrap">
          <table class="income-table income-tax-table">
            <thead>
              <tr>
                <th>Nr.</th>
                <th>Text</th>
                <th>Betrag</th>
              </tr>
            </thead>
            <tbody>
              ${INCOME_TAX_DEDUCTION_ROWS.map(
                (row) => `
                  <tr>
                    <td class="numeric-cell">${escapeHtml(row.nr)}</td>
                    <td>${escapeHtml(row.label)}</td>
                    <td>${incomeNumberInput("yearlyEntries", entry.id, `taxDeductionItems.${row.field}`, entry.taxDeductionItems[row.field], {
                      min: 0
                    })}</td>
                  </tr>
                `
              ).join("")}
            </tbody>
          </table>
        </div>
        <div class="income-tax-summary">
          <div>
            <span>Kategorie</span>
            <strong>Summe</strong>
          </div>
          <div>
            <span>Steuern</span>
            <strong id="incomeTaxDialogTaxesTotal">${money(taxTotal)}</strong>
          </div>
          <div>
            <span>Sozialversicherung Arbeitnehmer</span>
            <strong id="incomeTaxDialogSocialTotal">${money(socialTotal)}</strong>
          </div>
          <div>
            <span>Sozialversicherung Arbeitgeber</span>
            <strong id="incomeTaxDialogEmployerSocialTotal">${money(employerSocialTotal)}</strong>
          </div>
          <div class="total">
            <span>Gesamt ohne Arbeitgeber</span>
            <strong id="incomeTaxDialogGrandTotal">${total === null ? "-" : money(total)}</strong>
          </div>
        </div>
        <div class="income-tax-adjustment">
          <div>
            <strong>Steuernachzahlung oder Rueckerstattung</strong>
            <span>Dieser Wert wird in der Weltgrafik bei Abgabenmix, Steuern und Einkommen beruecksichtigt.</span>
          </div>
          <div class="income-tax-adjustment-options" role="radiogroup" aria-label="Art der Steuerkorrektur">
            ${INCOME_TAX_ADJUSTMENT_OPTIONS.map(
              (option) => `
                <label>
                  <input
                    type="radio"
                    name="income-tax-adjustment-${escapeHtml(entry.id)}"
                    value="${escapeHtml(option.value)}"
                    ${entry.taxAdjustment.type === option.value ? "checked" : ""}
                    data-income-collection="yearlyEntries"
                    data-income-id="${escapeHtml(entry.id)}"
                    data-income-field="taxAdjustment.type"
                  />
                  <span>${escapeHtml(option.label)}</span>
                </label>
              `
            ).join("")}
          </div>
          <div class="income-tax-adjustment-amount">
            <span>Betrag</span>
            ${incomeNumberInput("yearlyEntries", entry.id, "taxAdjustment.amount", entry.taxAdjustment.amount, { min: 0 })}
          </div>
        </div>
        <div class="button-row">
          <button class="button" type="button" data-action="income-close-tax-dialog">Fertig</button>
        </div>
      </div>
    </div>
  `;
}

function renderIncomeAnalysisDialog(model: IncomeTrackerModel = incomeTrackerModel()): void {
  const root = document.querySelector<HTMLDivElement>("#incomeAnalysisDialogRoot");
  if (!root) return;
  if (!incomeAnalysisOpen) {
    root.innerHTML = "";
    return;
  }

  const analysis = buildIncomeAnalysisModel(model);
  const slices = incomeAnalysisSlices(analysis);
  const years = analysis.years;
  root.innerHTML = `
    <div class="income-analysis-backdrop" role="presentation">
      <div class="income-analysis-dialog" role="dialog" aria-modal="true" aria-label="Weltgrafik Analyse Dashboard">
        <div class="income-analysis-head">
          <div>
            <strong>Weltgrafik</strong>
            <span>Grafik · Analyse · Dashboard · Plattform</span>
          </div>
          <button class="chart-popup-close" type="button" data-action="income-close-analysis" aria-label="Weltgrafik schliessen">x</button>
        </div>
        <div class="income-analysis-controls">
          <div class="income-analysis-switch" aria-label="Diagrammtyp">
            ${incomeAnalysisToggle("income-analysis-chart-pie", "Kreis", incomeAnalysisChartType === "pie")}
            ${incomeAnalysisToggle("income-analysis-chart-bar", "Balken", incomeAnalysisChartType === "bar")}
            ${incomeAnalysisToggle("income-analysis-chart-line", "Linie", incomeAnalysisChartType === "line")}
            ${incomeAnalysisToggle("income-analysis-chart-curve", "Kurve", incomeAnalysisChartType === "curve")}
          </div>
          <div class="income-analysis-switch" aria-label="Auswertung">
            ${incomeAnalysisToggle("income-analysis-view-deductions", "Abgabenmix", incomeAnalysisDataView === "deductions")}
            ${incomeAnalysisToggle("income-analysis-view-social", "Sozialabgaben", incomeAnalysisDataView === "social")}
            ${incomeAnalysisToggle("income-analysis-view-taxes", "Steuern", incomeAnalysisDataView === "taxes")}
            ${incomeAnalysisToggle("income-analysis-view-income", "Einkommen", incomeAnalysisDataView === "income")}
          </div>
          <div class="income-analysis-switch" aria-label="Jahresfilter">
            ${incomeAnalysisToggle("income-analysis-year-all", "Alle Jahre", incomeAnalysisYearFilter === "all")}
            ${years.map((year) => incomeAnalysisToggle(`income-analysis-year-${year}`, String(year), incomeAnalysisYearFilter === year)).join("")}
          </div>
        </div>
        <div class="income-analysis-metrics">
          ${incomeAnalysisMetricCard("Bisher eingenommen", money(analysis.totalGross), "Brutto erfasst")}
          ${incomeAnalysisMetricCard("Zum Leben verfuegbar", money(analysis.totalNet), "Jahresnetto")}
          ${incomeAnalysisMetricCard("Steuern bezahlt", money(analysis.taxTotal), "inkl. Erstattung/Nachzahlung")}
          ${incomeAnalysisMetricCard("Sozialabgaben", money(analysis.socialTotal), "Arbeitnehmeranteile")}
        </div>
        <div class="income-analysis-layout">
          <section class="income-analysis-chart-card">
            ${renderIncomeAnalysisChart(analysis, slices)}
          </section>
          <section class="income-analysis-detail-card">
            <h3>${escapeHtml(incomeAnalysisViewTitle())}</h3>
            <div class="income-analysis-breakdown">
              ${slices.length ? slices.map((slice) => incomeAnalysisBreakdownLine(slice, analysis.totalGross)).join("") : incomeAnalysisEmpty("Keine Werte fuer diese Auswahl.")}
            </div>
            <div class="income-analysis-total">
              <span>Abgabenquote ohne Arbeitgeber</span>
              <strong>${analysis.totalGross > 0 ? percent((analysis.totalDeductions / analysis.totalGross) * 100) : "-"}</strong>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

function incomeAnalysisToggle(action: string, label: string, active: boolean): string {
  return `
    <button class="income-analysis-toggle${active ? " active" : ""}" type="button" data-action="${escapeHtml(action)}" aria-pressed="${active}">
      ${escapeHtml(label)}
    </button>
  `;
}

function incomeAnalysisMetricCard(label: string, value: string, detail: string): string {
  return `
    <article>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>
  `;
}

function incomeAnalysisBreakdownLine(slice: IncomeAnalysisSlice, totalGross: number): string {
  const share = totalGross > 0 ? (slice.value / totalGross) * 100 : 0;
  return `
    <div class="income-analysis-line">
      <span><i class="${escapeHtml(slice.tone)}"></i>${escapeHtml(slice.label)}</span>
      <strong>${escapeHtml(money(slice.value))}</strong>
      <small>${escapeHtml(percent(share))}</small>
    </div>
  `;
}

function renderIncomeAnalysisChart(analysis: IncomeAnalysisModel, slices: IncomeAnalysisSlice[]): string {
  if (!analysis.entries.length) return incomeAnalysisEmpty("Noch keine Jahreswerte fuer die Weltgrafik.");
  if (incomeAnalysisChartType === "pie") return renderIncomeAnalysisPie(analysis, slices);
  if (incomeAnalysisChartType === "bar") return renderIncomeAnalysisBars(slices);
  return renderIncomeAnalysisLineChart(analysis, incomeAnalysisChartType === "curve");
}

function renderIncomeAnalysisPie(analysis: IncomeAnalysisModel, slices: IncomeAnalysisSlice[]): string {
  const visible = slices.filter(incomeAnalysisSliceHasDisplayValue);
  if (!visible.length) return incomeAnalysisEmpty("Keine aufgeteilten Werte vorhanden.");
  const visibleTotal = visible.reduce((sum, slice) => sum + incomeAnalysisSliceChartValue(slice), 0);
  const ownTotal =
    incomeAnalysisDataView === "social"
      ? analysis.socialTotal
      : incomeAnalysisDataView === "deductions"
        ? analysis.totalDeductions
        : incomeAnalysisDataView === "taxes"
          ? analysis.taxTotal
          : visibleTotal;
  let cursor = 0;
  const gradient = visible
    .map((slice) => {
      const start = cursor;
      cursor += (incomeAnalysisSliceChartValue(slice) / Math.max(1, visibleTotal)) * 100;
      return `${incomeAnalysisToneColor(slice.tone)} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
    })
    .join(", ");
  const employerNote =
    (incomeAnalysisDataView === "social" || incomeAnalysisDataView === "deductions") && analysis.employerSocialTotal > 0
      ? `<small>Arbeitgeber separat ${escapeHtml(money(analysis.employerSocialTotal))}</small>`
      : "";
  return `
    <div class="income-analysis-pie-wrap">
      <div class="income-analysis-pie" style="background: conic-gradient(${gradient})">
        <strong>${escapeHtml(money(ownTotal))}</strong>
        <span>${escapeHtml(incomeAnalysisViewTitle())}</span>
        ${employerNote}
      </div>
    </div>
  `;
}

function renderIncomeAnalysisBars(slices: IncomeAnalysisSlice[]): string {
  const visible = slices.filter(incomeAnalysisSliceHasDisplayValue);
  if (!visible.length) return incomeAnalysisEmpty("Keine aufgeteilten Werte vorhanden.");
  const maxValue = Math.max(1, ...visible.map(incomeAnalysisSliceChartValue));
  return `
    <div class="income-analysis-bars">
      ${visible
        .map((slice) => {
          const height = Math.max(4, Math.round((incomeAnalysisSliceChartValue(slice) / maxValue) * 100));
          return `
            <div class="income-analysis-bar-column">
              <div><i class="${escapeHtml(slice.tone)}" style="height:${height}%"></i></div>
              <span>${escapeHtml(slice.label)}</span>
              <strong>${escapeHtml(money(slice.value))}</strong>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function incomeAnalysisSliceChartValue(slice: IncomeAnalysisSlice): number {
  return Math.abs(slice.chartValue ?? slice.value);
}

function incomeAnalysisSliceHasDisplayValue(slice: IncomeAnalysisSlice): boolean {
  return incomeAnalysisSliceChartValue(slice) >= 0.005;
}

function renderIncomeAnalysisLineChart(analysis: IncomeAnalysisModel, curved: boolean): string {
  const points =
    incomeAnalysisYearFilter === "all"
      ? analysis.yearPoints
      : analysis.yearPoints.filter((point) => point.year === incomeAnalysisYearFilter);
  const series = incomeAnalysisSeries(points);
  if (!points.length || !series.length) return incomeAnalysisEmpty("Keine Jahresentwicklung fuer diese Auswahl.");
  const values = series.flatMap((item) => item.values.map((point) => point.value));
  const maxValue = Math.max(1, ...values);
  const minYear = points[0]?.year ?? 0;
  const maxYear = points[points.length - 1]?.year ?? minYear;
  const width = 720;
  const height = 270;
  const left = 54;
  const right = width - 24;
  const top = 24;
  const bottom = height - 42;
  const xForYear = (year: number): number =>
    minYear === maxYear ? left + (right - left) / 2 : left + ((year - minYear) / (maxYear - minYear)) * (right - left);
  const yForValue = (value: number): number => bottom - (value / maxValue) * (bottom - top);
  return `
    <div class="income-analysis-svg-wrap">
      <svg class="income-analysis-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Wertentwicklung">
        <path class="axis" d="M${left} ${top}V${bottom}H${right}" />
        <path class="grid" d="M${left} ${(top + bottom) / 2}H${right}" />
        ${series
          .map((item) => {
            const coords = item.values.map((point) => ({ x: xForYear(point.year), y: yForValue(point.value) }));
            const path = curved ? curvedPath(coords) : linePath(coords);
            return `
              <path class="series ${escapeHtml(item.tone)}" d="${path}" />
              ${coords.map((point) => `<circle class="series-point ${escapeHtml(item.tone)}" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4" />`).join("")}
            `;
          })
          .join("")}
        ${points
          .map((point) => `<text x="${xForYear(point.year)}" y="${bottom + 24}" text-anchor="middle">${point.year}</text>`)
          .join("")}
      </svg>
      <div class="income-analysis-legend">
        ${series.map((item) => `<span><i class="${escapeHtml(item.tone)}"></i>${escapeHtml(item.label)}</span>`).join("")}
      </div>
    </div>
  `;
}

function incomeAnalysisEmpty(message: string): string {
  return `<div class="income-analysis-empty">${escapeHtml(message)}</div>`;
}

function incomeAnalysisToneColor(tone: string): string {
  const colors: Record<string, string> = {
    tax: "#b42318",
    social: "#3366cc",
    net: "#11795f",
    gross: "#64748b",
    deduction: "#b87514",
    employer: "#0f766e",
    gold: "#b87514",
    blue: "#1d4ed8",
    care: "#7c3aed",
    danger: "#b42318",
    refund: "#11795f",
    unassigned: "#737373"
  };
  return colors[tone] ?? "#1f7a68";
}

function incomeAnalysisSlices(analysis: IncomeAnalysisModel): IncomeAnalysisSlice[] {
  return analysis.slicesByView[incomeAnalysisDataView].filter(incomeAnalysisSliceHasDisplayValue);
}

function incomeAnalysisSeries(points: IncomeAnalysisYearPoint[]): Array<{ label: string; tone: string; values: Array<{ year: number; value: number }> }> {
  const seriesByView: Record<IncomeAnalysisDataView, Array<{ key: keyof IncomeAnalysisYearPoint; label: string; tone: string }>> = {
    deductions: [
      { key: "taxes", label: "Steuern", tone: "tax" },
      { key: "social", label: "Sozialabgaben", tone: "social" },
      { key: "employerSocial", label: "Arbeitgeberanteil", tone: "employer" },
      { key: "deductions", label: "Abgaben gesamt", tone: "deduction" }
    ],
    social: [
      { key: "social", label: "Arbeitnehmer", tone: "social" },
      { key: "employerSocial", label: "Arbeitgeber", tone: "employer" }
    ],
    taxes: [
      { key: "taxBase", label: "Steuerbasis", tone: "gross" },
      { key: "taxRefund", label: "Steuerrueckerstattung", tone: "refund" },
      { key: "taxPayment", label: "Steuernachzahlung", tone: "danger" },
      { key: "taxes", label: "Steuern netto", tone: "tax" }
    ],
    income: [
      { key: "gross", label: "Brutto", tone: "gross" },
      { key: "net", label: "Netto", tone: "net" },
      { key: "deductions", label: "Abgaben", tone: "deduction" }
    ]
  };
  const series = seriesByView[incomeAnalysisDataView]
    .map((item) => ({
      label: item.label,
      tone: item.tone,
      values: points.map((point) => ({ year: point.year, value: Number(point[item.key]) || 0 }))
    }));
  const hasPositiveTaxSeries = incomeAnalysisDataView === "taxes" && series.some((item) => item.values.some((point) => point.value > 0));
  return series.filter(
    (item) =>
      item.values.some((point) => point.value > 0) ||
      (hasPositiveTaxSeries && item.label === "Steuern netto")
  );
}

function linePath(points: Array<{ x: number; y: number }>): string {
  if (!points.length) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function curvedPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return linePath(points);
  return points
    .map((point, index) => {
      if (index === 0) return `M${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
      const previous = points[index - 1];
      const controlX = (previous.x + point.x) / 2;
      return `C${controlX.toFixed(1)} ${previous.y.toFixed(1)}, ${controlX.toFixed(1)} ${point.y.toFixed(1)}, ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    })
    .join(" ");
}

function incomeAnalysisEntryTaxBase(entry: IncomeYearEntry): number {
  if (incomeTaxDeductionItemsTotal(entry.taxDeductionItems) === null) return numberValue(entry.taxesAndDeductions);
  return INCOME_TAX_DEDUCTION_ROWS.filter((row) => row.category === "taxes").reduce(
    (sum, row) => sum + numberValue(entry.taxDeductionItems[row.field]),
    0
  );
}

function incomeAnalysisTaxAdjustmentTotals(entries: IncomeYearEntry[]): { refund: number; payment: number } {
  return entries.reduce(
    (totals, entry) => {
      const amount = Math.max(0, numberValue(entry.taxAdjustment.amount));
      if (amount <= 0) return totals;
      if (entry.taxAdjustment.type === "payment") {
        totals.payment += amount;
      } else {
        totals.refund += amount;
      }
      return totals;
    },
    { refund: 0, payment: 0 }
  );
}

function buildIncomeAnalysisModel(model: IncomeTrackerModel): IncomeAnalysisModel {
  const activeEntries = incomeActiveYearEntries();
  const years = [...new Set(incomeVisibleYearEntries(activeEntries).map((entry) => entry.year))].sort((a, b) => a - b);
  if (incomeAnalysisYearFilter !== "all" && !years.includes(incomeAnalysisYearFilter)) {
    incomeAnalysisYearFilter = "all";
  }
  const entries = activeEntries.filter((entry) =>
    incomeAnalysisYearFilter === "all" ? true : entry.year === incomeAnalysisYearFilter
  );
  const visibleEntries = incomeVisibleYearEntries(entries);
  const totalNet = entries.reduce((sum, entry) => sum + numberValue(incomeYearEntryNetIncome(entry)), 0);
  const totalDeductions = entries.reduce((sum, entry) => sum + numberValue(incomeYearEntryTaxDeductions(entry)), 0);
  const totalGross = entries.reduce((sum, entry) => sum + incomeAnalysisGross(entry), 0);
  const taxSlices = incomeAnalysisTaxRows(visibleEntries, "taxes");
  const socialSlices = incomeAnalysisTaxRows(visibleEntries, "social");
  const employerSocialSlices = incomeAnalysisTaxRows(visibleEntries, "employer_social");
  const taxBaseTotal = entries.reduce((sum, entry) => sum + incomeAnalysisEntryTaxBase(entry), 0);
  const { refund: taxRefundTotal, payment: taxPaymentTotal } = incomeAnalysisTaxAdjustmentTotals(entries);
  const taxTotal = entries.reduce((sum, entry) => sum + incomeYearEntryTaxTotal(entry), 0);
  const socialTotal = incomeAnalysisTaxRows(entries, "social").reduce((sum, slice) => sum + slice.value, 0);
  const employerSocialTotal = incomeAnalysisTaxRows(entries, "employer_social").reduce((sum, slice) => sum + slice.value, 0);
  const unassignedDeductions = Math.max(0, totalDeductions - taxTotal - socialTotal);
  const deductionSlices = [
    { label: "Steuern", value: taxTotal, tone: "tax" },
    { label: "Sozialabgaben", value: socialTotal, tone: "social" },
    { label: "Arbeitgeberanteil", value: employerSocialTotal, tone: "employer" },
    { label: "Nicht aufgeteilt", value: unassignedDeductions, tone: "unassigned" }
  ];
  const incomeSlices = [
    { label: "Zum Leben verfuegbar", value: totalNet, tone: "net" },
    { label: "Steuern bezahlt", value: taxTotal, tone: "tax" },
    { label: "Sozialabgaben", value: socialTotal, tone: "social" },
    { label: "Nicht aufgeteilt", value: unassignedDeductions, tone: "unassigned" }
  ];
  return {
    entries,
    years,
    totalGross,
    totalNet,
    totalDeductions,
    taxBaseTotal,
    taxRefundTotal,
    taxPaymentTotal,
    taxTotal,
    socialTotal,
    employerSocialTotal,
    unassignedDeductions,
    slicesByView: {
      deductions: deductionSlices,
      social: [...socialSlices, ...employerSocialSlices],
      taxes: taxSlices,
      income: incomeSlices
    },
    yearPoints: buildIncomeAnalysisYearPoints(model)
  };
}

function incomeAnalysisTaxRows(entries: IncomeYearEntry[], category: "taxes" | "social" | "employer_social"): IncomeAnalysisSlice[] {
  const tones =
    category === "taxes"
      ? ["tax", "gold", "danger"]
      : category === "employer_social"
        ? ["employer"]
        : ["social", "blue", "care", "unassigned"];
  const slices: IncomeAnalysisSlice[] = INCOME_TAX_DEDUCTION_ROWS.filter((row) => row.category === category)
    .map((row, index) => ({
      label: incomeAnalysisTaxRowLabel(row),
      value: entries.reduce((sum, entry) => sum + numberValue(entry.taxDeductionItems[row.field]), 0),
      tone: tones[index % tones.length]
    }))
    .filter((slice) => slice.value > 0);
  if (category === "taxes") {
    const detailedTaxTotal = slices.reduce((sum, slice) => sum + slice.value, 0);
    const fallbackTaxBase = entries.reduce((sum, entry) => sum + incomeAnalysisEntryTaxBase(entry), 0) - detailedTaxTotal;
    if (fallbackTaxBase > 0.005) {
      slices.unshift({
        label: "Steuerbasis",
        value: fallbackTaxBase,
        tone: "gross"
      });
    }
    const { refund, payment } = incomeAnalysisTaxAdjustmentTotals(entries);
    if (refund > 0) {
      slices.push({
        label: "Steuerrueckerstattung",
        value: -refund,
        chartValue: refund,
        tone: "refund"
      });
    }
    if (payment > 0) {
      slices.push({
        label: "Steuernachzahlung",
        value: payment,
        chartValue: payment,
        tone: "danger"
      });
    }
  }
  return slices;
}

function buildIncomeAnalysisYearPoints(model: IncomeTrackerModel): IncomeAnalysisYearPoint[] {
  return model.valueYears.map((year) => {
    const entries = incomeActiveYearEntries().filter((entry) => entry.year === year.year);
    const { refund: taxRefund, payment: taxPayment } = incomeAnalysisTaxAdjustmentTotals(entries);
    const taxes = entries.reduce((sum, entry) => sum + incomeYearEntryTaxTotal(entry), 0);
    const social = incomeAnalysisTaxRows(entries, "social").reduce((sum, slice) => sum + slice.value, 0);
    const employerSocial = incomeAnalysisTaxRows(entries, "employer_social").reduce((sum, slice) => sum + slice.value, 0);
    const deductions = entries.reduce((sum, entry) => sum + numberValue(incomeYearEntryTaxDeductions(entry)), 0);
    return {
      year: year.year,
      gross: entries.reduce((sum, entry) => sum + incomeAnalysisGross(entry), 0),
      net: year.annualNet ?? 0,
      deductions,
      taxBase: entries.reduce((sum, entry) => sum + incomeAnalysisEntryTaxBase(entry), 0),
      taxRefund,
      taxPayment,
      taxes,
      social,
      employerSocial
    };
  });
}

function incomeAnalysisTaxRowLabel(row: (typeof INCOME_TAX_DEDUCTION_ROWS)[number]): string {
  const label = row.label.replace(/^.*?\s/, "");
  if (row.field === "pensionInsurance") return `${label} (Arbeitnehmer)`;
  if (row.field === "employerPensionInsurance") return `${label} (Arbeitgeber)`;
  return label;
}

function incomeAnalysisGross(entry: IncomeYearEntry): number {
  const gross = numberValue(entry.annualGrossIncome);
  if (gross > 0) return gross;
  return numberValue(incomeYearEntryNetIncome(entry)) + numberValue(incomeYearEntryTaxDeductions(entry));
}

function incomeAnalysisViewTitle(): string {
  if (incomeAnalysisDataView === "social") return "Sozialabgaben";
  if (incomeAnalysisDataView === "taxes") return "Steuern";
  if (incomeAnalysisDataView === "income") return "Einkommen und Abgaben";
  return "Abgabenmix";
}

function renderIncomeMilestoneRows(): void {
  const body = document.querySelector<HTMLTableSectionElement>("#incomeMilestoneRows");
  if (!body) return;
  if (!state.incomeTracker.milestones.length) {
    body.innerHTML = `<tr><td class="position-empty" colspan="6">Noch keine Karriere-Meilensteine eingetragen.</td></tr>`;
    return;
  }
  body.innerHTML = incomeSortedMilestones()
    .map(
      (entry) => `
      <tr>
        <td><input type="month" value="${escapeHtml(entry.date)}" data-income-collection="milestones" data-income-id="${entry.id}" data-income-field="date" /></td>
        <td>${incomeMilestoneTypeButton(entry)}</td>
        <td>${incomeTextInput("milestones", entry.id, "description", entry.description)}</td>
        <td>${incomeSelect("milestones", entry.id, "impact", CAREER_MILESTONE_IMPACT_OPTIONS, entry.impact)}</td>
        <td>${incomeNumberInput("milestones", entry.id, "linkedYear", entry.linkedYear, { min: 1900, max: 2200, step: 1 })}</td>
        <td><button class="icon-button danger" type="button" data-action="income-remove-milestone-${entry.id}" aria-label="Meilenstein entfernen">x</button></td>
      </tr>
    `
    )
    .join("");
}

function incomeSortedYearEntries(): IncomeYearEntry[] {
  return [...state.incomeTracker.yearlyEntries].sort(
    (first, second) =>
      first.year - second.year ||
      incomeYearLabelMeta(first.label).label.localeCompare(incomeYearLabelMeta(second.label).label, "de") ||
      first.id.localeCompare(second.id)
  );
}

function incomeFilteredYearEntries(): IncomeYearEntry[] {
  const selected = new Set(state.incomeTracker.settings.selectedYearlyLabels.map(incomeYearLabel));
  const entries = incomeSortedYearEntries();
  if (!selected.size) return entries;
  return entries.filter((entry) => selected.has(incomeYearLabel(entry.label)));
}

function incomeActiveYearEntries(): IncomeYearEntry[] {
  return state.incomeTracker.yearlyEntries.filter((entry) => entry.active);
}

function incomeVisibleYearEntries(entries: IncomeYearEntry[]): IncomeYearEntry[] {
  return entries.filter((entry) => entry.visible);
}

function incomeSortedMilestones(): CareerMilestone[] {
  return [...state.incomeTracker.milestones].sort((first, second) => {
    const firstYear = first.linkedYear ?? incomeYearFromDate(first.date) ?? 9999;
    const secondYear = second.linkedYear ?? incomeYearFromDate(second.date) ?? 9999;
    return firstYear - secondYear || first.date.localeCompare(second.date) || first.id.localeCompare(second.id);
  });
}

function renderIncomeSettingControls(): void {
  const settings = state.incomeTracker.settings;
  setInputValue('[data-income-setting="projectionMode"]', settings.projectionMode);
  setInputValue('[data-income-setting="manualGrowthRatePercent"]', settings.manualGrowthRatePercent ?? "");
  setInputValue('[data-income-setting="savingsSharePercent"]', settings.savingsSharePercent ?? "");
  const manualGrowth = document.querySelector<HTMLInputElement>('[data-income-setting="manualGrowthRatePercent"]');
  if (manualGrowth) manualGrowth.disabled = settings.projectionMode !== "manual";
  setText("incomeGeneralInflationRate", percent(incomeGeneralInflationRatePercent()));
}

function renderIncomeMetricGrid(model: IncomeTrackerModel): void {
  const host = document.querySelector<HTMLDivElement>("#incomeMetricGrid");
  if (!host) return;
  const projection5 = incomeProjectionHorizon(model, 5);
  const metrics = [
    {
      label: "Aktuelles Jahresnetto",
      value: model.latest && model.latest.annualNet !== null ? money(model.latest.annualNet) : "Keine Daten",
      detail: model.latest?.source ? `${model.latest.year} | ${INCOME_SOURCE_LABELS[model.latest.source]}` : "Noch kein Jahreswert"
    },
    {
      label: "Durchschnitt Monatsnetto",
      value: model.latest && model.latest.annualNet !== null ? money(model.latest.annualNet / 12) : "Keine Daten",
      detail: "aktuelles Jahresnetto / 12"
    },
    {
      label: "Jahreszuwachs",
      value: model.yearlyGrowthAmount !== null ? signedMoney(model.yearlyGrowthAmount) : "Keine Daten",
      detail: model.yearlyGrowthPercent !== null ? signedPercent(model.yearlyGrowthPercent) : "Mindestens zwei Jahre noetig"
    },
    {
      label: "Monatlicher Spielraum",
      value: model.extraMonthlySpace !== null ? signedMoney(model.extraMonthlySpace) : "Keine Daten",
      detail: "Jahreszuwachs / 12"
    },
    {
      label: "Nettoquote",
      value:
        model.latestRatioYear && model.latestRatioYear.netRatio !== null
          ? percent(model.latestRatioYear.netRatio)
          : "Keine Daten",
      detail: model.averageNetRatio !== null ? `Ø ${percent(model.averageNetRatio)}` : "Jahresbrutto erforderlich"
    },
    {
      label: "Projektion in 5 Jahren",
      value: projection5 ? money(projection5.value) : "Deaktiviert",
      detail: projection5 && model.projection.rate !== null ? `${projection5.year} | ${percent(model.projection.rate * 100)}` : "explizite Annahme erforderlich"
    }
  ];
  host.innerHTML = metrics.map((metric) => incomeMetricCard(metric.label, metric.value, metric.detail)).join("");
}

function renderIncomeInsights(model: IncomeTrackerModel): void {
  const host = document.querySelector<HTMLDivElement>("#incomeInsights");
  if (!host) return;
  const insights: Array<{ tone: "normal" | "warning" | "danger"; text: string }> = [];
  if (!model.valueYears.length) {
    insights.push({
      tone: "warning",
      text: "Noch keine Einkommen eingetragen. Kennzahlen und Diagramme bleiben leer, bis Jahreswerte vorhanden sind."
    });
  }
  if (model.latest && model.latest.annualNet !== null && model.latest.source) {
    insights.push({
      tone: "normal",
      text: `Aktueller Jahreswert: ${money(model.latest.annualNet)} fuer ${model.latest.year}. Quelle: ${INCOME_SOURCE_LABELS[model.latest.source]}.`
    });
  }
  if (model.yearlyGrowthAmount !== null && model.previous) {
    insights.push({
      tone: model.yearlyGrowthAmount < 0 ? "danger" : "normal",
      text: `Veraenderung gegenueber ${model.previous.year}: ${signedMoney(model.yearlyGrowthAmount)} (${signedPercent(
        model.yearlyGrowthPercent ?? 0
      )}).`
    });
  }
  if (model.extraMonthlySpace !== null) {
    insights.push({
      tone: model.extraMonthlySpace < 0 ? "danger" : "normal",
      text: `Das entspricht ${signedMoney(model.extraMonthlySpace)} zusaetzlichem monatlichem Spielraum.`
    });
  }
  if (model.additionalSavingsRate !== null && model.savingsSharePercent !== null) {
    insights.push({
      tone: model.additionalSavingsRate < 0 ? "danger" : "normal",
      text: `Bei ${percent(model.savingsSharePercent)} Anteil koennte die Sparrate oder tragbare Rate um ${signedMoney(
        model.additionalSavingsRate
      )} pro Monat steigen.`
    });
  }
  if (model.latestRatioYear && model.latestRatioYear.netRatio !== null) {
    insights.push({
      tone: "normal",
      text: `Nettoquote ${model.latestRatioYear.year}: ${percent(model.latestRatioYear.netRatio)}.`
    });
  }
  if (model.averageNetRatio !== null) {
    insights.push({ tone: "normal", text: `Durchschnittliche Nettoquote: ${percent(model.averageNetRatio)}.` });
  }
  if (model.netRatioChange !== null && model.previousRatioYear && Math.abs(model.netRatioChange) >= 5) {
    insights.push({
      tone: "warning",
      text: `Die Nettoquote hat sich gegenueber ${model.previousRatioYear.year} um ${signedPercentagePoints(
        model.netRatioChange
      )} veraendert.`
    });
  }
  if (model.previous && model.previous.realNet !== null && model.latest && model.latest.realNet !== null) {
    const realGrowth = model.latest.realNet - model.previous.realNet;
    insights.push({
      tone: realGrowth < 0 ? "warning" : "normal",
      text: `Inflationsbereinigt hat sich dein Einkommen gegenueber ${model.previous.year} um ${signedMoney(realGrowth)} veraendert.`
    });
    if ((model.yearlyGrowthAmount ?? 0) > 0 && realGrowth <= 0) {
      insights.push({
        tone: "warning",
        text: "Nominal steigt das Einkommen, real stagniert oder sinkt es auf Basis der allgemeinen Jahresinflation."
      });
    }
  }
  if (model.bestYear && model.weakestYear && model.bestYear.year !== model.weakestYear.year) {
    insights.push({
      tone: "normal",
      text: `Bestes Jahr: ${model.bestYear.year} mit ${money(model.bestYear.annualNet ?? 0)}. Schwaechstes Jahr: ${model.weakestYear.year} mit ${money(
        model.weakestYear.annualNet ?? 0
      )}.`
    });
  }
  const projection5 = incomeProjectionHorizon(model, 5);
  const projection10 = incomeProjectionHorizon(model, 10);
  if (projection5 && projection10) {
    insights.push({
      tone: "warning",
      text: `Projektion (${model.projection.modeLabel}): ${money(projection5.value)} in 5 Jahren und ${money(
        projection10.value
      )} in 10 Jahren.`
    });
  } else if (model.projection.enabled && model.projection.rate === null) {
    insights.push({
      tone: "warning",
      text: "Projektion ist aktiviert, aber es fehlt eine nutzbare Wachstumsrate oder ausreichend Historie."
    });
  }
  host.innerHTML = insights.map((insight) => `<div class="income-insight ${insight.tone}">${escapeHtml(insight.text)}</div>`).join("");
}

function renderIncomeYearStatusRows(model: IncomeTrackerModel): void {
  const body = document.querySelector<HTMLTableSectionElement>("#incomeYearStatusRows");
  if (!body) return;
  if (!model.years.length) {
    body.innerHTML = `<tr><td class="position-empty" colspan="8">Noch keine Jahreswerte vorhanden.</td></tr>`;
    return;
  }
  body.innerHTML = model.years
    .map(
      (year) => `
      <tr>
        <td>${year.year}</td>
        <td class="numeric-cell">${year.annualNet !== null ? money(year.annualNet) : "-"}</td>
        <td>${year.source ? incomeSourceBadge(year.source) : '<span class="status-pill muted">nur Meilenstein</span>'}</td>
        <td class="numeric-cell">${year.annualStatementNet !== null ? money(year.annualStatementNet) : "-"}</td>
        <td class="numeric-cell">${year.manualNet !== null ? money(year.manualNet) : "-"}</td>
        <td class="numeric-cell">${year.netRatio !== null ? percent(year.netRatio) : "-"}</td>
        <td class="numeric-cell">${year.realNet !== null ? money(year.realNet) : "-"}</td>
        <td>${incomeMilestoneBadges(year.milestones)}</td>
      </tr>
    `
    )
    .join("");
}

function incomeMilestoneBadges(milestones: CareerMilestone[]): string {
  if (!milestones.length) return "-";
  return `<div class="income-milestone-badges">${milestones.map(incomeMilestoneTypeBadge).join("")}</div>`;
}

function renderIncomeCharts(model: IncomeTrackerModel): void {
  setIncomeChart("incomeAnnualChart", renderIncomeAnnualChart(model));
  setIncomeChart("incomeGrowthChart", renderIncomeGrowthChart(model));
  setIncomeChart("incomeInflationChart", renderIncomeInflationChart(model));
  setIncomeChart("incomeRatioChart", renderIncomeRatioChart(model));
  setIncomeChart("incomeProjectionChart", renderIncomeProjectionChart(model));
}

function renderIncomeAnnualChart(model: IncomeTrackerModel): string {
  if (!model.valueYears.length) return incomeChartEmpty("Noch keine Jahreswerte.");
  const items = model.valueYears
    .map((year) => {
      const segments = incomeAnnualChartSegments(year);
      const value = segments.reduce((sum, segment) => sum + segment.value, 0);
      if (value < 0.005) return null;
      return {
        label: String(year.year),
        value,
        detail: year.source ? INCOME_SOURCE_LABELS[year.source] : "",
        tone: year.source === "annual_statement" ? "accent" : year.source === "manual" ? "gold" : "blue",
        markerHtml: incomeMilestoneChartMarkers(year.milestones),
        segments
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  if (!items.length) return incomeChartEmpty("Keine sichtbaren Jahreswerte.");
  const maxValue = Math.max(1, ...items.map((item) => item.value));
  return incomeStackedBarChart(items, maxValue);
}

function incomeMilestoneChartMarkers(milestones: CareerMilestone[]): string {
  if (!milestones.length) return "";
  return `
    <div class="income-chart-milestone-markers">
      ${milestones
        .slice(0, 4)
        .map((milestone) => {
          const meta = incomeMilestoneTypeMeta(milestone.type);
          return `<span title="${escapeHtml(meta.type)}">${positionIconSvg(meta.icon)}</span>`;
        })
        .join("")}
    </div>
  `;
}

function incomeAnnualChartSegments(year: IncomeTrackerModel["years"][number]): Array<{ value: number; label: string; tone: string }> {
  const contributingEntries = incomeActiveYearEntries()
    .filter((entry) => {
      if (!entry.visible) return false;
      if (entry.year !== year.year) return false;
      if (year.source === "annual_statement") return entry.source === "annual_statement";
      if (year.source === "manual") return entry.source === "manual";
      return false;
    })
    .map((entry, index) => ({
      value: incomeYearEntryNetIncome(entry) ?? 0,
      label: incomeYearLabelMeta(entry.label).label,
      tone: `segment-${index % 5}`
    }))
    .filter((segment) => segment.value > 0);

  return contributingEntries;
}

function renderIncomeGrowthChart(model: IncomeTrackerModel): string {
  const values = model.valueYears.slice(1).map((year, index) => ({
    label: String(year.year),
    value: (year.annualNet ?? 0) - (model.valueYears[index].annualNet ?? 0),
    detail: `gegenueber ${model.valueYears[index].year}`,
    tone: (year.annualNet ?? 0) >= (model.valueYears[index].annualNet ?? 0) ? "good" : "danger",
    marker: ""
  }));
  if (!values.length) return incomeChartEmpty("Mindestens zwei Jahreswerte noetig.");
  const maxValue = Math.max(1, ...values.map((item) => Math.abs(item.value)));
  return incomeBarChart(values, maxValue, true);
}

function renderIncomeInflationChart(model: IncomeTrackerModel): string {
  const points = model.valueYears.filter((year) => year.realNet !== null);
  if (!points.length) return incomeChartEmpty("Keine Jahreswerte fuer Inflationsbereinigung.");
  const maxValue = Math.max(1, ...points.flatMap((year) => [year.annualNet ?? 0, year.realNet ?? 0]));
  return `
    <div class="income-grouped-chart">
      ${points
        .map(
          (year) => `
        <div class="income-group">
          <div class="income-paired-bars">
            ${incomeMiniBar(year.annualNet ?? 0, maxValue, "blue", "Nominal")}
            ${incomeMiniBar(year.realNet ?? 0, maxValue, "gold", "Real")}
          </div>
          <span>${year.year}</span>
          <div class="income-inflation-values">
            <small><b>Nominal</b>${escapeHtml(money(year.annualNet ?? 0))}</small>
            <small><b>Real</b>${escapeHtml(money(year.realNet ?? 0))}</small>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
    <div class="income-chart-legend"><span class="blue"></span>Nominal <span class="gold"></span>Real</div>
  `;
}

function renderIncomeRatioChart(model: IncomeTrackerModel): string {
  if (!model.ratioYears.length) return incomeChartEmpty("Keine Brutto-/Netto-Kombination vorhanden.");
  const maxValue = Math.max(100, ...model.ratioYears.map((year) => year.netRatio ?? 0));
  return incomeBarChart(
    model.ratioYears.map((year) => ({
      label: String(year.year),
      value: year.netRatio ?? 0,
      detail: "Nettoquote",
      tone: "accent",
      marker: ""
    })),
    maxValue,
    false,
    (value) => percent(value)
  );
}

function renderIncomeProjectionChart(model: IncomeTrackerModel): string {
  if (state.incomeTracker.settings.projectionMode === "off") return incomeChartEmpty("Projektion ist deaktiviert.");
  if (!model.projection.points.length) return incomeChartEmpty("Keine nutzbare Projektionsrate vorhanden.");
  const maxValue = Math.max(1, ...model.projection.points.map((point) => point.value), ...model.valueYears.map((year) => year.annualNet ?? 0));
  const items = model.projection.points.map((point) => {
    const offset = point.year - (model.latest?.year ?? point.year);
      return {
        label: String(point.year),
        value: point.value,
        detail: incomeProjectionPointDetail(offset),
        tone: offset < 0 ? "blue" : point.projected ? "warning" : "accent",
        marker: ""
      };
  });
  return `
    <div class="income-projection-chart">
      ${incomeBarChart(items, maxValue)}
      ${incomeProjectionGrowthArrows(model)}
    </div>
  `;
}

function incomeProjectionPointDetail(offsetYears: number): string {
  if (offsetYears === 0) return "Ist";
  return "";
}

function incomeProjectionGrowthArrows(model: IncomeTrackerModel): string {
  const points = model.projection.points;
  const currentYear = model.latest?.year ?? null;
  if (currentYear === null || points.length < 3) return "";
  const transitions = [
    { fromOffset: -10, toOffset: -5 },
    { fromOffset: -5, toOffset: 0 },
    { fromOffset: 0, toOffset: 5 },
    { fromOffset: 5, toOffset: 10 },
    { fromOffset: 10, toOffset: 15 }
  ];
  const arrows = transitions
    .map((transition) => {
      const fromIndex = points.findIndex((point) => point.year === currentYear + transition.fromOffset);
      const toIndex = points.findIndex((point) => point.year === currentYear + transition.toOffset);
      const from = points[fromIndex];
      const to = points[toIndex];
      if (fromIndex < 0 || toIndex < 0 || toIndex <= fromIndex || !from || !to || from.value <= 0) return "";
      const growthPercent = ((to.value - from.value) / from.value) * 100;
      return `
        <span class="income-projection-growth-arrow" style="grid-column: ${fromIndex + 1}">
          <b>${escapeHtml(signedPercent(growthPercent))}</b>
        </span>
      `;
    })
    .join("");
  if (!arrows.trim()) return "";
  return `<div class="income-projection-growth-row" style="--income-projection-gap-count: ${Math.max(1, points.length - 1)}">${arrows}</div>`;
}

function setIncomeChart(id: string, html: string): void {
  const host = document.querySelector<HTMLDivElement>(`#${id}`);
  if (host) host.innerHTML = html;
}

function incomeBarChart(
  items: Array<{ label: string; value: number; detail: string; tone: string; marker: string }>,
  maxValue: number,
  signed = false,
  formatter: (value: number) => string = money
): string {
  return `
    <div class="income-bar-chart" style="--income-bar-count: ${Math.max(1, items.length)}">
      ${items
        .map((item) => {
          const height = Math.max(3, Math.round((Math.abs(item.value) / Math.max(1, maxValue)) * 100));
          const negative = item.value < 0 ? " negative" : "";
          return `
            <div class="income-bar-column">
              <div class="income-bar-track">
                ${item.marker ? `<span class="income-chart-marker">${escapeHtml(item.marker)}</span>` : ""}
                <i class="income-bar ${escapeHtml(item.tone)}${negative}" style="height: ${height}%"></i>
              </div>
              <span>${escapeHtml(item.label)}</span>
              <strong>${signed ? signedMoney(item.value) : escapeHtml(formatter(item.value))}</strong>
              <small>${escapeHtml(item.detail)}</small>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function incomeStackedBarChart(
  items: Array<{
    label: string;
    value: number;
    detail: string;
    tone: string;
    markerHtml: string;
    segments: Array<{ value: number; label: string; tone: string }>;
  }>,
  maxValue: number
): string {
  return `
    <div class="income-bar-chart" style="--income-bar-count: ${Math.max(1, items.length)}">
      ${items
        .map((item) => {
          const totalHeight = Math.max(3, Math.round((Math.abs(item.value) / Math.max(1, maxValue)) * 100));
          const segments = item.segments.length
            ? item.segments
            : [{ value: item.value, label: item.detail, tone: item.tone }];
          return `
            <div class="income-bar-column">
              <div class="income-bar-track">
                ${item.markerHtml}
                <div class="income-bar-stack" style="height: ${totalHeight}%">
                  ${segments
                    .map((segment) => {
                      const height = Math.max(3, Math.round((segment.value / Math.max(1, item.value)) * 100));
                      return `<i class="income-bar-segment ${escapeHtml(segment.tone)}" style="height: ${height}%" title="${escapeHtml(
                        `${segment.label}: ${money(segment.value)}`
                      )}"></i>`;
                    })
                    .join("")}
                </div>
              </div>
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(money(item.value))}</strong>
              <small>${escapeHtml(segments.length > 1 ? `${segments.length} Eintraege` : item.detail)}</small>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function incomeMiniBar(value: number, maxValue: number, tone: string, label: string): string {
  const height = Math.max(3, Math.round((value / Math.max(1, maxValue)) * 100));
  return `<i class="income-bar ${escapeHtml(tone)}" style="height: ${height}%" title="${escapeHtml(label)} ${escapeHtml(money(value))}"></i>`;
}

function incomeChartEmpty(message: string): string {
  return `<div class="chart-empty">${escapeHtml(message)}</div>`;
}

function incomeMetricCard(label: string, value: string, detail: string): string {
  return `
    <article class="metric-card income-metric-card">
      <span class="metric-label">${escapeHtml(label)}</span>
      <strong class="metric-value">${escapeHtml(value)}</strong>
      <small class="metric-detail">${escapeHtml(detail)}</small>
    </article>
  `;
}

function incomeSourceBadge(source: IncomeResolvedSource): string {
  const tone = source === "manual" ? " warning" : "";
  return `<span class="status-pill${tone}">${escapeHtml(INCOME_SOURCE_LABELS[source])}</span>`;
}

function incomeYearLabel(value: string | undefined): string {
  const normalized = String(value ?? "").trim();
  if (INCOME_YEAR_LABEL_OPTIONS.some((option) => option.id === normalized)) return normalized;
  const byLabel = INCOME_YEAR_LABEL_OPTIONS.find((option) => incomeLabelKey(option.label) === incomeLabelKey(normalized));
  return byLabel?.id ?? "salary";
}

function incomeYearLabelMeta(value: string | undefined): { id: string; label: string; icon: string; description: string } {
  return INCOME_YEAR_LABEL_OPTIONS.find((option) => option.id === incomeYearLabel(value)) ?? INCOME_YEAR_LABEL_OPTIONS[0];
}

function incomeLabelKey(value: string): string {
  return normalizeHeader(value);
}

function incomeYearFromDate(value: string): number | null {
  const match = value.match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
}

function incomeProjectionHorizon(model: IncomeTrackerModel, years: number): IncomeTrackerModel["projection"]["horizons"][number] | null {
  return model.projection.horizons.find((item) => item.years === years) ?? null;
}

function incomeSelect<T extends string | number>(
  collection: string,
  id: string,
  field: string,
  options: Array<{ value: T; label: string }>,
  selected: T | string | number | null
): string {
  return `
    <select data-income-collection="${collection}" data-income-id="${id}" data-income-field="${field}">
      ${options
        .map(
          (option) =>
            `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(selected) ? "selected" : ""}>${escapeHtml(
              option.label
            )}</option>`
        )
        .join("")}
    </select>
  `;
}

function incomeNumberInput(
  collection: string,
  id: string,
  field: string,
  value: number | null,
  options: { min?: number; max?: number; step?: number; disabled?: boolean; extraAttribute?: string } = {}
): string {
  return `
    <input
      type="number"
      value="${value ?? ""}"
      ${options.min !== undefined ? `min="${options.min}"` : ""}
      ${options.max !== undefined ? `max="${options.max}"` : ""}
      step="${options.step ?? 0.01}"
      ${options.disabled ? "disabled" : ""}
      ${options.extraAttribute ?? ""}
      data-income-collection="${collection}"
      data-income-id="${id}"
      data-income-field="${field}"
    />
  `;
}

function incomeTextInput(collection: string, id: string, field: string, value: string): string {
  return `<input type="text" value="${escapeHtml(value)}" data-income-collection="${collection}" data-income-id="${id}" data-income-field="${field}" />`;
}

function incomeCheckboxInput(collection: string, id: string, field: string, checked: boolean, label: string): string {
  return `
    <input
      type="checkbox"
      ${checked ? "checked" : ""}
      data-income-collection="${collection}"
      data-income-id="${id}"
      data-income-field="${field}"
      aria-label="${escapeHtml(label)}"
    />
  `;
}

function incomeTaxDeductionsButton(entry: IncomeYearEntry): string {
  const taxDeductions = incomeYearEntryTaxDeductions(entry);
  return `
    <button
      class="income-tax-button"
      type="button"
      data-action="income-open-tax-dialog-${escapeHtml(entry.id)}"
      aria-label="Steuer- und Abgabenpositionen bearbeiten"
    >
      <strong data-income-year-tax-total="${escapeHtml(entry.id)}">${taxDeductions === null ? "Eintragen" : money(taxDeductions)}</strong>
      <span>Details</span>
    </button>
  `;
}

function incomeYearLabelButton(entry: IncomeYearEntry): string {
  const meta = incomeYearLabelMeta(entry.label);
  return `
    <div class="income-year-label-display">
      <button
        class="position-label-button income-year-label-button"
        type="button"
        data-action="open-income-year-label-picker"
        data-income-year-id="${escapeHtml(entry.id)}"
        title="${escapeHtml(meta.description)}"
        aria-label="Einkommenslabel: ${escapeHtml(meta.label)}"
        aria-haspopup="dialog"
      >
        ${positionIconSvg(meta.icon)}
      </button>
      <span class="income-year-label-text">${escapeHtml(meta.label)}</span>
    </div>
  `;
}

function incomeMilestoneTypeButton(entry: CareerMilestone): string {
  const meta = incomeMilestoneTypeMeta(entry.type);
  return `
    <button
      class="income-milestone-type-button"
      type="button"
      data-action="open-income-milestone-type-picker"
      data-milestone-id="${escapeHtml(entry.id)}"
      aria-label="Meilenstein-Typ auswaehlen"
      title="${escapeHtml(meta.description)}"
    >
      ${positionIconSvg(meta.icon)}
      <span>${escapeHtml(meta.type)}</span>
    </button>
  `;
}

function incomeMilestoneTypeBadge(entry: CareerMilestone): string {
  const meta = incomeMilestoneTypeMeta(entry.type);
  return `
    <span class="income-milestone-badge" title="${escapeHtml(meta.description)}">
      ${positionIconSvg(meta.icon)}
      <span>${escapeHtml(meta.type)}</span>
    </span>
  `;
}

function incomeMilestoneTypeMeta(type: string): { type: string; icon: string; description: string } {
  return (
    CAREER_MILESTONE_TYPE_OPTIONS.find((option) => option.type === type) ?? {
      type: type || "Sonstiges",
      icon: "tag",
      description: "Eigener Meilenstein"
    }
  );
}

function setIncomeInputTab(value: string): void {
  if (value !== "yearly" && value !== "milestones" && value !== "settings") return;
  state.incomeTracker = {
    ...state.incomeTracker,
    settings: { ...state.incomeTracker.settings, activeInputTab: value }
  };
  renderAll();
}

function openIncomeTaxDialog(id: string): void {
  if (!state.incomeTracker.yearlyEntries.some((entry) => entry.id === id)) return;
  incomeTaxDialogEntryId = id;
  renderIncomeTaxDialog();
}

function closeIncomeTaxDialog(): void {
  if (!incomeTaxDialogEntryId) return;
  incomeTaxDialogEntryId = null;
  renderIncomeTaxDialog();
}

function openIncomeAnalysisDialog(): void {
  incomeAnalysisOpen = true;
  renderIncomeAnalysisDialog();
}

function closeIncomeAnalysisDialog(): void {
  if (!incomeAnalysisOpen) return;
  incomeAnalysisOpen = false;
  renderIncomeAnalysisDialog();
}

function setIncomeAnalysisChartType(value: IncomeAnalysisChartType): void {
  if (value !== "pie" && value !== "bar" && value !== "line" && value !== "curve") return;
  incomeAnalysisChartType = value;
  renderIncomeAnalysisDialog();
}

function setIncomeAnalysisDataView(value: IncomeAnalysisDataView): void {
  if (value !== "deductions" && value !== "social" && value !== "taxes" && value !== "income") return;
  incomeAnalysisDataView = value;
  renderIncomeAnalysisDialog();
}

function setIncomeAnalysisYearFilter(value: string): void {
  incomeAnalysisYearFilter = value === "all" ? "all" : incomeInteger(value, state.settings.year);
  renderIncomeAnalysisDialog();
}

function toggleIncomeYearLabelFilter(label: string): void {
  const normalized = incomeYearLabel(label);
  const selected = new Set(state.incomeTracker.settings.selectedYearlyLabels.map(incomeYearLabel));
  if (selected.has(normalized)) selected.delete(normalized);
  else selected.add(normalized);
  state.incomeTracker = {
    ...state.incomeTracker,
    settings: { ...state.incomeTracker.settings, selectedYearlyLabels: Array.from(selected) }
  };
  renderIncomeYearLabelFilters();
  renderIncomeYearlyRows();
  saveState(state);
}

function addIncomeYearlyEntry(): void {
  state.incomeTracker = {
    ...state.incomeTracker,
    yearlyEntries: [
      ...state.incomeTracker.yearlyEntries,
      {
        id: createId(),
        active: true,
        visible: true,
        year: state.settings.year,
        label: "salary",
        person: "household",
        annualNetIncome: null,
        annualGrossIncome: null,
        taxesAndDeductions: null,
        taxDeductionItems: emptyIncomeTaxDeductionItems(),
        taxAdjustment: emptyIncomeTaxAdjustment(),
        employer: "",
        note: "",
        source: "annual_statement"
      }
    ]
  };
  renderAll();
}

function addIncomeMilestone(): void {
  state.incomeTracker = {
    ...state.incomeTracker,
    milestones: [
      ...state.incomeTracker.milestones,
      {
        id: createId(),
        date: "",
        type: "Gehaltserhoehung",
        description: "",
        impact: "positive",
        linkedYear: state.settings.year
      }
    ]
  };
  renderAll();
}

function removeIncomeEntry(action: string): void {
  if (action.startsWith("income-remove-yearly-")) {
    const id = action.replace("income-remove-yearly-", "");
    state.incomeTracker = {
      ...state.incomeTracker,
      yearlyEntries: state.incomeTracker.yearlyEntries.filter((entry) => entry.id !== id)
    };
  } else if (action.startsWith("income-remove-milestone-")) {
    const id = action.replace("income-remove-milestone-", "");
    state.incomeTracker = {
      ...state.incomeTracker,
      milestones: state.incomeTracker.milestones.filter((entry) => entry.id !== id)
    };
  }
  renderAll();
}

function updateIncomeEntry(collection: string, id: string, field: string, value: string): void {
  if (collection === "yearlyEntries") {
    state.incomeTracker = {
      ...state.incomeTracker,
      yearlyEntries: state.incomeTracker.yearlyEntries.map((entry) =>
        entry.id === id ? updateIncomeYearEntry(entry, field, value) : entry
      )
    };
    return;
  }
  if (collection === "milestones") {
    state.incomeTracker = {
      ...state.incomeTracker,
      milestones: state.incomeTracker.milestones.map((entry) =>
        entry.id === id ? updateIncomeMilestoneEntry(entry, field, value) : entry
      )
    };
    return;
  }
}

function updateIncomeYearEntry(entry: IncomeYearEntry, field: string, value: string): IncomeYearEntry {
  if (field === "active") return { ...entry, active: value === "true" };
  if (field === "visible") return { ...entry, visible: value === "true" };
  if (field === "year") return { ...entry, year: incomeInteger(value, state.settings.year) };
  if (field === "label") return { ...entry, label: incomeYearLabel(value) };
  if (field === "person") return { ...entry, person: incomePerson(value) };
  if (field === "source") return { ...entry, source: incomeYearSource(value) };
  if (field === "employer") return { ...entry, employer: value };
  if (field === "note") return { ...entry, note: value };
  if (field === "annualNetIncome") return { ...entry, annualNetIncome: nullableInputNumber(value) };
  if (field === "annualGrossIncome") return { ...entry, annualGrossIncome: nullableInputNumber(value) };
  if (field === "taxesAndDeductions") return { ...entry, taxesAndDeductions: nullableInputNumber(value) };
  if (field === "taxAdjustment.type") {
    return { ...entry, taxAdjustment: { ...entry.taxAdjustment, type: incomeTaxAdjustmentType(value) } };
  }
  if (field === "taxAdjustment.amount") {
    return { ...entry, taxAdjustment: { ...entry.taxAdjustment, amount: nullableInputNumber(value) } };
  }
  if (field.startsWith("taxDeductionItems.")) {
    const itemField = field.replace("taxDeductionItems.", "");
    if (!isIncomeTaxDeductionField(itemField)) return entry;
    const taxDeductionItems = {
      ...entry.taxDeductionItems,
      [itemField]: nullableInputNumber(value)
    };
    return {
      ...entry,
      taxDeductionItems,
      taxesAndDeductions: incomeTaxDeductionItemsTotal(taxDeductionItems)
    };
  }
  return entry;
}

function isIncomeTaxDeductionField(value: string): value is IncomeTaxDeductionField {
  return INCOME_TAX_DEDUCTION_ROWS.some((row) => row.field === value);
}

function incomeTaxDeductionCategoryTotal(entry: IncomeYearEntry, category: "taxes" | "social" | "employer_social"): number {
  if (category === "taxes") return incomeYearEntryTaxTotal(entry);
  return INCOME_TAX_DEDUCTION_ROWS.filter((row) => row.category === category).reduce(
    (sum, row) => sum + numberValue(entry.taxDeductionItems[row.field]),
    0
  );
}

function updateIncomeMilestoneEntry(
  entry: CareerMilestone,
  field: string,
  value: string
): CareerMilestone {
  if (field === "impact") return { ...entry, impact: incomeMilestoneImpact(value) };
  if (field === "linkedYear") return { ...entry, linkedYear: value.trim() === "" ? null : incomeInteger(value, state.settings.year) };
  if (field === "date") return { ...entry, date: value };
  if (field === "type") return { ...entry, type: value };
  if (field === "description") return { ...entry, description: value };
  return entry;
}

function updateIncomeSetting(field: keyof IncomeTrackerSettings, value: string): void {
  const settings = state.incomeTracker.settings;
  if (field === "projectionMode") {
    state.incomeTracker = {
      ...state.incomeTracker,
      settings: { ...settings, projectionMode: incomeProjectionMode(value) }
    };
    return;
  }
  if (field === "activeInputTab") return;
  if (field === "manualGrowthRatePercent") {
    state.incomeTracker = {
      ...state.incomeTracker,
      settings: { ...settings, manualGrowthRatePercent: nullableInputNumber(value) }
    };
  } else if (field === "savingsSharePercent") {
    state.incomeTracker = {
      ...state.incomeTracker,
      settings: { ...settings, savingsSharePercent: nullableInputNumber(value) }
    };
  }
}

async function importIncomeCsvFromFile(file: File | undefined): Promise<void> {
  if (!file) return;
  const text = await file.text();
  const imported = incomeTrackerEntriesFromCsvRows(parseCsv(text));
  const importedCount = imported.yearlyEntries.length + imported.milestones.length;
  if (!importedCount) {
    window.alert("Keine gueltigen Einkommen-CSV-Daten gefunden.");
    return;
  }

  state.incomeTracker = {
    ...state.incomeTracker,
    yearlyEntries: [...state.incomeTracker.yearlyEntries, ...imported.yearlyEntries],
    milestones: [...state.incomeTracker.milestones, ...imported.milestones],
    settings: {
      ...state.incomeTracker.settings,
      activeInputTab: imported.yearlyEntries.length ? "yearly" : imported.milestones.length ? "milestones" : "settings"
    }
  };
  renderAll();
  showIncomeExportStatus(`${importedCount} Eintraege aus CSV importiert.`);
}

async function exportIncomeCsv(): Promise<void> {
  const model = incomeTrackerModel();
  await exportCsvFile("jahresnettoeinkommen.csv", incomeTrackerCsv(model), "Einkommen-CSV");
  showIncomeExportStatus("CSV-Export wurde erstellt.");
}

function exportIncomePdf(): void {
  const model = incomeTrackerModel();
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    showIncomeExportStatus("PDF-Auswertung konnte nicht geoeffnet werden.");
    return;
  }
  reportWindow.document.open();
  reportWindow.document.write(incomePdfHtml(model));
  reportWindow.document.close();
  reportWindow.focus();
  window.setTimeout(() => reportWindow.print(), 250);
  showIncomeExportStatus("PDF-Auswertung wurde im Druckdialog vorbereitet.");
}

function incomeTrackerCsv(model: IncomeTrackerModel): string {
  const rows: string[][] = [["section", "id", "year", "month", "person", "field", "value", "source"]];
  for (const entry of state.incomeTracker.yearlyEntries) {
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "active", String(entry.active), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "visible", String(entry.visible), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "label", entry.label, entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "annualNetIncome", csvValue(incomeYearEntryNetIncome(entry)), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "annualGrossIncome", csvValue(entry.annualGrossIncome), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "taxesAndDeductions", csvValue(entry.taxesAndDeductions), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "taxAdjustmentType", entry.taxAdjustment.type, entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "taxAdjustmentAmount", csvValue(entry.taxAdjustment.amount), entry.source]);
    for (const row of INCOME_TAX_DEDUCTION_ROWS) {
      rows.push([
        "yearly_tax_detail",
        entry.id,
        String(entry.year),
        "",
        entry.person,
        `${row.nr} ${row.label}`,
        csvValue(entry.taxDeductionItems[row.field]),
        entry.source
      ]);
    }
  }
  for (const entry of state.incomeTracker.milestones) {
    rows.push(["milestone", entry.id, String(entry.linkedYear ?? ""), entry.date, "", entry.type, entry.impact, ""]);
    rows.push(["milestone", entry.id, String(entry.linkedYear ?? ""), entry.date, "", "description", entry.description, ""]);
  }
  for (const year of model.years) {
    rows.push(["calculated", "", String(year.year), "", "", "annualNet", csvValue(year.annualNet), year.source ?? ""]);
    rows.push(["calculated", "", String(year.year), "", "", "netRatio", csvValue(year.netRatio), "gross_net"]);
    rows.push(["calculated", "", String(year.year), "", "", "realNet", csvValue(year.realNet), "general_inflation"]);
  }
  for (const item of model.chartSummaries) {
    rows.push(["chart_summary", "", "", "", "", item.title, item.text, "calculated"]);
  }
  rows.push(["data_basis", "", "", "", "", "Hinweis", "Nur Nutzereingaben, berechnete Werte und aktivierte Annahmen.", ""]);
  return rows.map((row) => row.map(incomeCsvCell).join(";")).join("\n");
}

function incomeTrackerEntriesFromCsvRows(rows: string[][]): {
  yearlyEntries: IncomeYearEntry[];
  milestones: CareerMilestone[];
} {
  const emptyImport = { yearlyEntries: [], milestones: [] };
  if (!rows.length) return emptyImport;

  const header = rows[0].map((value) => value.trim().replace(/^\uFEFF/, "").toLowerCase());
  const hasHeader = header.includes("section") && header.includes("field");
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const get = (row: string[], names: string[], fallbackIndex: number): string => {
    if (hasHeader) {
      for (const name of names) {
        const index = header.indexOf(name);
        if (index >= 0) return row[index] ?? "";
      }
    }
    return fallbackIndex >= 0 ? row[fallbackIndex] ?? "" : "";
  };

  const yearlyEntries = new Map<string, IncomeYearEntry>();
  const milestones = new Map<string, CareerMilestone>();

  dataRows.forEach((row, index) => {
    const section = get(row, ["section"], 0).trim().toLowerCase();
    const sourceId = get(row, ["id"], 1).trim();
    const rowKey = sourceId || String(index);
    const field = get(row, ["field"], 5).trim();
    const fieldKey = field.toLowerCase();
    const value = get(row, ["value"], 6).trim();
    const yearValue = get(row, ["year"], 2).trim();
    const monthValue = get(row, ["month"], 3).trim();
    const personValue = get(row, ["person"], 4).trim();
    const sourceValue = get(row, ["source"], 7).trim();

    if (section === "yearly" || section === "yearly_tax_detail") {
      const key = `yearly-${rowKey}`;
      const entry =
        yearlyEntries.get(key) ??
        ({
          id: createId(),
          active: true,
          visible: true,
          year: incomeCsvYear(yearValue, state.settings.year),
          label: "salary",
          person: incomePerson(personValue),
          annualNetIncome: null,
          annualGrossIncome: null,
          taxesAndDeductions: null,
          taxDeductionItems: emptyIncomeTaxDeductionItems(),
          taxAdjustment: emptyIncomeTaxAdjustment(),
          employer: "",
          note: "",
          source: incomeYearSource(sourceValue)
        } satisfies IncomeYearEntry);
      entry.year = incomeCsvYear(yearValue, entry.year);
      entry.person = incomePerson(personValue || entry.person);
      entry.source = incomeYearSource(sourceValue || entry.source);
      if (section === "yearly_tax_detail") {
        const taxField = incomeTaxDeductionFieldFromCsv(field);
        if (taxField) {
          entry.taxDeductionItems = { ...entry.taxDeductionItems, [taxField]: incomeCsvNumber(value) };
          entry.taxesAndDeductions = incomeTaxDeductionItemsTotal(entry.taxDeductionItems);
        }
      } else if (fieldKey === "active") {
        entry.active = incomeCsvBoolean(value, true);
      } else if (fieldKey === "visible") {
        entry.visible = incomeCsvBoolean(value, true);
      } else if (fieldKey === "annualnetincome") {
        entry.annualNetIncome = incomeCsvNumber(value);
      } else if (fieldKey === "label") {
        entry.label = incomeYearLabel(value);
      } else if (fieldKey === "annualgrossincome") {
        entry.annualGrossIncome = incomeCsvNumber(value);
      } else if (fieldKey === "taxesanddeductions") {
        entry.taxesAndDeductions = incomeCsvNumber(value);
      } else if (fieldKey === "taxadjustmenttype") {
        entry.taxAdjustment = { ...entry.taxAdjustment, type: incomeTaxAdjustmentType(value) };
      } else if (fieldKey === "taxadjustmentamount") {
        entry.taxAdjustment = { ...entry.taxAdjustment, amount: incomeCsvNumber(value) };
      } else if (fieldKey === "employer") {
        entry.employer = value;
      }
      yearlyEntries.set(key, entry);
      return;
    }

    if (section === "milestone") {
      const key = `milestone-${rowKey}`;
      const entry =
        milestones.get(key) ??
        ({
          id: createId(),
          date: monthValue,
          type: "Sonstiges",
          description: "",
          impact: "positive",
          linkedYear: incomeCsvYearOrNull(yearValue)
        } satisfies CareerMilestone);
      entry.date = monthValue || entry.date;
      entry.linkedYear = incomeCsvYearOrNull(yearValue) ?? entry.linkedYear;
      if (fieldKey === "description") {
        entry.description = value;
      } else if (field) {
        entry.type = field;
        entry.impact = incomeMilestoneImpact(value);
      }
      milestones.set(key, entry);
      return;
    }

  });

  return {
    yearlyEntries: Array.from(yearlyEntries.values()).filter(incomeCsvYearlyEntryHasData),
    milestones: Array.from(milestones.values()).filter((entry) => entry.date || entry.description || entry.type !== "Sonstiges")
  };
}

function incomeCsvYearlyEntryHasData(entry: IncomeYearEntry): boolean {
  return (
    entry.annualNetIncome !== null ||
    entry.annualGrossIncome !== null ||
    entry.taxesAndDeductions !== null ||
    incomeTaxDeductionItemsTotal(entry.taxDeductionItems) !== null ||
    incomeTaxDeductionItemsHaveData(entry.taxDeductionItems) ||
    entry.taxAdjustment.amount !== null
  );
}

function incomeTaxDeductionItemsHaveData(items: IncomeTaxDeductionItems): boolean {
  return INCOME_TAX_DEDUCTION_ROWS.some((row) => items[row.field] !== null && items[row.field] !== undefined);
}

function incomeCsvNumber(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  const cleaned = text.replace(/[^\d,.-]/g, "");
  const normalized = cleaned.includes(",") ? cleaned.replaceAll(".", "").replace(",", ".") : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function incomeCsvBoolean(value: string, fallback: boolean): boolean {
  const text = normalizeHeader(value);
  if (!text) return fallback;
  if (["true", "1", "ja", "yes", "aktiv", "sichtbar"].includes(text)) return true;
  if (["false", "0", "nein", "no", "inaktiv", "aus", "unsichtbar"].includes(text)) return false;
  return fallback;
}

function incomeCsvYear(value: string, fallback: number): number {
  const parsed = incomeCsvNumber(value);
  return parsed === null ? fallback : clamp(Math.round(parsed), 1900, 2200);
}

function incomeCsvYearOrNull(value: string): number | null {
  const parsed = incomeCsvNumber(value);
  return parsed === null ? null : clamp(Math.round(parsed), 1900, 2200);
}

function incomeTaxDeductionFieldFromCsv(value: string): IncomeTaxDeductionField | null {
  const text = value.toLowerCase();
  if (text.startsWith("4 ") || text.includes("lohnsteuer")) return "wageTax";
  if (text.startsWith("5 ") || text.includes("solidar")) return "solidaritySurcharge";
  if (text.startsWith("6 ") || text.includes("kirchensteuer")) return "churchTax";
  if (text.startsWith("22 ") || text.includes("arbeitgeber")) return "employerPensionInsurance";
  if (text.startsWith("23 ") || text.includes(" rv") || text.includes("renten")) return "pensionInsurance";
  if (text.startsWith("25 ") || text.includes(" kv") || text.includes("kranken")) return "healthInsurance";
  if (text.startsWith("26 ") || text.includes(" pv") || text.includes("pflege")) return "careInsurance";
  if (text.startsWith("27 ") || text.includes(" av") || text.includes("arbeitslosen")) return "unemploymentInsurance";
  return null;
}

function incomePdfHtml(model: IncomeTrackerModel): string {
  const yearlyInputRows = state.incomeTracker.yearlyEntries
    .map(
      (entry) => `
      <tr>
        <td>${entry.active ? "Ja" : "Nein"}</td>
        <td>${entry.visible ? "Ja" : "Nein"}</td>
        <td>${entry.year}</td>
        <td>${escapeHtml(incomeYearLabelMeta(entry.label).label)}</td>
        <td>${incomeYearEntryNetIncome(entry) !== null ? money(incomeYearEntryNetIncome(entry) ?? 0) : "-"}</td>
        <td>${entry.annualGrossIncome !== null ? money(entry.annualGrossIncome) : "-"}</td>
        <td>${incomeYearEntryTaxDeductions(entry) !== null ? money(incomeYearEntryTaxDeductions(entry) ?? 0) : "-"}</td>
        <td>${escapeHtml(INCOME_SOURCE_LABELS[entry.source])}</td>
      </tr>`
    )
    .join("");
  const milestoneRows = state.incomeTracker.milestones
    .map(
      (entry) => `
      <tr>
        <td>${escapeHtml(entry.date)}</td>
        <td>${escapeHtml(entry.type)}</td>
        <td>${escapeHtml(entry.impact)}</td>
        <td>${entry.linkedYear ?? "-"}</td>
        <td>${escapeHtml(entry.description)}</td>
      </tr>`
    )
    .join("");
  const yearRows = model.years
    .map(
      (year) => `
      <tr>
        <td>${year.year}</td>
        <td>${year.annualNet !== null ? money(year.annualNet) : "-"}</td>
        <td>${year.source ? INCOME_SOURCE_LABELS[year.source] : "nur Meilenstein"}</td>
        <td>${year.netRatio !== null ? percent(year.netRatio) : "-"}</td>
        <td>${year.realNet !== null ? money(year.realNet) : "-"}</td>
      </tr>`
    )
    .join("");
  const projectionRows = model.projection.horizons
    .map((item) => `<tr><td>${item.years} Jahre</td><td>${item.year}</td><td>${money(item.value)}</td></tr>`)
    .join("");
  return `<!doctype html>
    <html lang="de">
      <head>
        <meta charset="utf-8" />
        <title>Jahresnettoeinkommen Auswertung</title>
        <style>
          body { color: #1f2528; font-family: Arial, sans-serif; line-height: 1.45; margin: 32px; }
          h1 { margin-bottom: 4px; }
          h2 { font-size: 18px; margin-top: 28px; }
          table { border-collapse: collapse; font-size: 13px; margin-top: 10px; width: 100%; }
          th, td { border-bottom: 1px solid #d8d0c2; padding: 7px; text-align: left; }
          th { background: #f0ece3; }
          .note { color: #687071; }
        </style>
      </head>
      <body>
        <h1>Jahresnettoeinkommen Auswertung</h1>
        <p class="note">Erstellt am ${escapeHtml(new Date().toLocaleString("de-DE"))}. Datenbasis: Nur Nutzereingaben, berechnete Werte und aktivierte Annahmen.</p>
        <h2>Diagrammzusammenfassung</h2>
        <ul>${model.chartSummaries.map((item) => `<li><strong>${escapeHtml(item.title)}:</strong> ${escapeHtml(item.text)}</li>`).join("")}</ul>
        <h2>Jahreswerte</h2>
        <table>
          <thead><tr><th>Aktiv</th><th>View</th><th>Jahr</th><th>Label</th><th>Jahresnetto</th><th>Jahresbrutto</th><th>Steuer / Abgaben</th><th>Status</th></tr></thead>
          <tbody>${yearlyInputRows || '<tr><td colspan="8">Keine Jahreswerte vorhanden.</td></tr>'}</tbody>
        </table>
        <h2>Karriere-Meilensteine</h2>
        <table>
          <thead><tr><th>Datum</th><th>Typ</th><th>Einfluss</th><th>Jahr</th><th>Beschreibung</th></tr></thead>
          <tbody>${milestoneRows || '<tr><td colspan="5">Keine Meilensteine vorhanden.</td></tr>'}</tbody>
        </table>
        <h2>Berechnete Jahreswerte</h2>
        <table>
          <thead><tr><th>Jahr</th><th>Jahresnetto</th><th>Status</th><th>Nettoquote</th><th>Realwert</th></tr></thead>
          <tbody>${yearRows || '<tr><td colspan="5">Keine Jahreswerte vorhanden.</td></tr>'}</tbody>
        </table>
        <h2>Projektion</h2>
        <table>
          <thead><tr><th>Horizont</th><th>Jahr</th><th>Prognostiziertes Jahresnetto</th></tr></thead>
          <tbody>${projectionRows || '<tr><td colspan="3">Keine Projektion aktiviert oder keine Projektionsrate verfuegbar.</td></tr>'}</tbody>
        </table>
      </body>
    </html>`;
}

function nullableInputNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function incomeInteger(value: string, fallback: number): number {
  const parsed = nullableInputNumber(value);
  return parsed === null ? fallback : Math.round(parsed);
}

function incomePerson(value: string): IncomePerson {
  if (value === "person1" || value === "person2" || value === "household") return value;
  return "household";
}

function incomeYearSource(value: string): IncomeYearEntrySource {
  return value === "manual" ? "manual" : "annual_statement";
}

function incomeTaxAdjustmentType(value: string): IncomeTaxAdjustmentType {
  return value === "payment" ? "payment" : "refund";
}

function incomeMilestoneImpact(value: string): CareerMilestoneImpact {
  if (value === "negative" || value === "neutral" || value === "positive") return value;
  return "positive";
}

function incomeProjectionMode(value: string): IncomeProjectionMode {
  return INCOME_PROJECTION_MODES.includes(value as IncomeProjectionMode) ? (value as IncomeProjectionMode) : "off";
}

function signedMoney(value: number): string {
  return `${value > 0 ? "+" : ""}${money(value)}`;
}

function signedPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${percent(value)}`;
}

function signedPercentagePoints(value: number): string {
  const formatted = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
  return `${value > 0 ? "+" : ""}${formatted} Prozentpunkte`;
}

function csvValue(value: number | string | null): string {
  return value === null ? "" : String(value);
}

function incomeCsvCell(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function cssEscape(value: string): string {
  const css = (globalThis as typeof globalThis & { CSS?: { escape?: (input: string) => string } }).CSS;
  return typeof css?.escape === "function" ? css.escape(value) : value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function showIncomeExportStatus(message: string): void {
  const status = document.querySelector<HTMLParagraphElement>("#incomeExportStatus");
  if (status) status.textContent = message;
  if (exportStatusTimeoutId) window.clearTimeout(exportStatusTimeoutId);
  exportStatusTimeoutId = window.setTimeout(() => {
    if (status) status.textContent = "";
    exportStatusTimeoutId = undefined;
  }, 3500);
}

function renderRealEstateCalculations(result: RealEstateFinancingResult, chartProjectionYears: number): void {
  latestRealEstateResult = result;
  const validation = document.querySelector<HTMLDivElement>("#realEstateValidation");
  if (validation) {
    if (result.validationErrors.length) {
      validation.classList.add("error");
      validation.innerHTML = result.validationErrors.map((item) => `<div>${escapeHtml(item)}</div>`).join("");
    } else {
      validation.classList.remove("error");
      validation.textContent = "Eingaben sind plausibel. Tilgungsplan wurde aktualisiert.";
    }
  }

  setText("realEstateDerivedEquityMetric", money(result.equityCapital));
  setText("realEstateDerivedMonthlyPaymentMetric", money(result.monthlyPayment));
  setText("realEstateDerivedInitialRepaymentMetric", percent(result.derivedInitialRepaymentPercent));
  setText("realEstateDerivedSpecialRepaymentMetric", money(result.annualSpecialRepayment));
  setText("realEstateTotalProjectCostMetric", money(result.totalProjectCost));
  setText("realEstateStartDebtMetric", money(result.startLoanAmount));
  setText("realEstateTotalLoanCostMetric", money(result.totalLoanCost));
  const finalLoanYear = result.years[result.years.length - 1];
  const actualFinancingStartYear =
    realEstateActualPaymentStartYear(result) ?? result.years[0]?.year ?? currentRealEstateFinancingStartYear();
  const actualFinancingStartAge = Math.max(0, actualFinancingStartYear - state.investment.birthYear);
  const actualFinancingEndAge = Math.max(actualFinancingStartAge, result.financingEndYear - state.investment.birthYear);
  setText(
    "realEstateCalculatedEndAgeMetric",
    finalLoanYear && finalLoanYear.loanEnd <= 0 ? `${intNumber(actualFinancingEndAge)} Jahre` : "nicht getilgt"
  );
  setText(
    "realEstateFinancingYearsMetric",
    `${intNumber(actualFinancingStartAge)} -> ${intNumber(actualFinancingEndAge)} | ${intNumber(result.financingYears)} Jahre`
  );

  const chartYears = result.years.slice(0, Math.max(1, chartProjectionYears));
  selectedRealEstateYear = defaultRealEstateDetailYear(chartYears, selectedRealEstateYear);

  const repaymentHost = document.querySelector<HTMLDivElement>("#realEstateRepaymentChart");
  if (repaymentHost) {
    repaymentHost.innerHTML = renderRealEstateRepaymentChart({
      points: chartYears,
      selectedYear: selectedRealEstateYear,
      loanCostBasis: result.totalLoanCost,
      financingEndYear: result.financingEndYear,
      formatMoney: (value) => money(value)
    });
  }

  const trendHost = document.querySelector<HTMLDivElement>("#realEstateTrendChart");
  if (trendHost) {
    trendHost.innerHTML = renderRealEstateTrendChart({
      points: chartYears,
      selectedYear: selectedRealEstateYear,
      financingEndYear: result.financingEndYear,
      formatMoney: (value) => money(value)
    });
  }
}

function realEstateFinancingStartYear(currentYear: number, birthYear: number, financingStartAge: number): number {
  if (!Number.isFinite(financingStartAge) || financingStartAge <= 0) return currentYear;
  const targetAgeYear = birthYear + Math.floor(financingStartAge);
  return Math.max(currentYear, targetAgeYear);
}

function currentRealEstateFinancingStartYear(): number {
  return realEstateFinancingStartYear(state.settings.year, state.investment.birthYear, state.realEstate.financingStartAge);
}

function realEstateActualPaymentStartYear(result: RealEstateFinancingResult): number | null {
  const firstPaymentMonth = result.months.find((month) => {
    return month.interestPaid + month.principalPaid + month.specialRepayment > 0;
  });
  return firstPaymentMonth?.year ?? null;
}

function currentRealEstateProjectionYears(startYear: number, investmentEndAge: number): number {
  const investmentEndYear = state.investment.birthYear + Math.floor(investmentEndAge);
  const saleYear = state.realEstate.plannedSaleYear;
  const projectionEndYear = saleYear !== null && saleYear >= startYear ? Math.round(saleYear) : investmentEndYear;
  return clamp(Math.round(projectionEndYear - startYear + 1), 1, 80);
}

function currentRealEstateMaximumProjectionYears(startYear: number): number {
  const saleYear = state.realEstate.plannedSaleYear;
  if (saleYear !== null && saleYear >= startYear) {
    return clamp(Math.round(saleYear - startYear + 1), 1, MAX_REAL_ESTATE_PROJECTION_YEARS);
  }
  return MAX_REAL_ESTATE_PROJECTION_YEARS;
}

function currentCombinedRealEstateProjectionYears(
  startYear: number,
  standardProjection: AssetProjection,
  retirementProjection: AssetProjection,
  standardBirthYear: number,
  retirementBirthYear: number
): number {
  const standardEndYear = standardBirthYear + Math.floor(standardProjection.endAge);
  const retirementEndYear = retirementBirthYear + Math.floor(retirementProjection.endAge);
  const combinedEndYear = Math.max(standardEndYear, retirementEndYear);
  const saleYear = state.realEstate.plannedSaleYear;
  const projectionEndYear =
    saleYear !== null && saleYear >= startYear ? Math.min(Math.round(saleYear), combinedEndYear) : combinedEndYear;
  return clamp(Math.round(projectionEndYear - startYear + 1), 1, 80);
}

function combinedProjectionWithoutAccounts(baseProjection: AssetProjection): AssetProjection {
  return {
    ...baseProjection,
    points: [],
    monthlyRate: 0,
    annualSavingsRate: 0,
    monthlyPension: 0,
    realMonthlyPension: 0,
    percentageWithdrawalMonthlyAtStart: 0,
    percentageWithdrawalAnnualAtStart: 0,
    withdrawalRemainingSavingsMonthlyAtStart: 0,
    withdrawalGainMonthlyAtStart: 0,
    endAge: 0,
    retirementAge: 0
  };
}

function realEstateDepotSavingsRateAvailable(standardProjection: AssetProjection): boolean {
  return (
    state.realEstate.includeWithdrawalGainAsPaymentSource &&
    standardProjection.monthlyRate > 0 &&
    standardProjection.percentageWithdrawalMonthlyAtStart > standardProjection.monthlyRate
  );
}

function realEstateWithdrawalStartYear(standardProjection: AssetProjection, settings: InvestmentSettings): number {
  return settings.birthYear + Math.floor(standardProjection.percentageWithdrawalStartAge);
}

interface RealEstateWithdrawalProfile {
  accountId: string;
  projection: AssetProjection;
  settings: InvestmentSettings;
  withdrawalStartYear: number;
  withdrawalEndYear: number;
  withdrawalGainMonthly: number;
  depotSavingsRateMonthly: number;
  depotSavingsRateAvailable: boolean;
}

function realEstateWithdrawalProfiles(accountIds: string[] | null = null): RealEstateWithdrawalProfile[] {
  const withdrawalAccounts = accountIds ? planningAccountsByIds(accountIds) : selectedRealEstateWithdrawalAccounts();
  return withdrawalAccounts.map((account) => {
    const settings = state.investmentByAccountId[account.id] ?? defaultInvestmentSettingsForNewAccount();
    const reserve = calculateReserveSummary(state.settings, account.yearlyRows);
    const projection = buildDepotAssetProjection(reserve, "standard", account.id);
    const withdrawalStartYear = realEstateWithdrawalStartYear(projection, settings);
    const withdrawalEndYear = settings.birthYear + Math.floor(projection.endAge);
    const depotSavingsRateAvailable = realEstateDepotSavingsRateAvailable(projection);
    return {
      accountId: account.id,
      projection,
      settings,
      withdrawalStartYear,
      withdrawalEndYear,
      withdrawalGainMonthly: Math.max(0, projection.withdrawalGainMonthlyAtStart),
      depotSavingsRateMonthly: depotSavingsRateAvailable ? Math.max(0, projection.monthlyRate) : 0,
      depotSavingsRateAvailable
    };
  });
}

function realEstateSourceSchedule(
  startYear: number,
  projectionYears: number,
  accountIds = state.ui.selectedRealEstateAccountIds
): RealEstateFinancingSourceSchedule {
  const monthCount = Math.max(12, Math.min(80, Math.round(projectionYears || 1)) * 12);
  const sourceAccounts = planningAccountsByIds(accountIds);
  const equityPositions = selectedRealEstateSourcePositions("equityCapital", sourceAccounts);
  const monthlyPositions = selectedRealEstateSourcePositions("monthlyPayment", sourceAccounts);
  const specialPositions = selectedRealEstateSourcePositions("specialRepayment", sourceAccounts);
  const equityCapital = equityPositions.reduce((sum, position) => {
    return sum + (position.payoutType === "once" && position.payoutYear <= startYear ? Number(position.amount) : 0);
  }, 0);
  const monthlyPaymentSavings: number[] = [];
  const withdrawalGainPayments: number[] = [];
  const specialRepayments: number[] = [];
  const withdrawalProfiles = realEstateWithdrawalProfiles(accountIds);
  const depotSavingsRatePayments: number[] = [];

  for (let index = 0; index < monthCount; index += 1) {
    const year = startYear + Math.floor(index / 12);
    const month = (index % 12) + 1;
    monthlyPaymentSavings.push(
      monthlyPositions.reduce((sum, position) => sum + investmentContributionForMonth(position, year, month), 0)
    );
    const withdrawalGain = state.realEstate.includeWithdrawalGainAsPaymentSource
      ? withdrawalProfiles.reduce((sum, profile) => {
          const activeYear = year >= profile.withdrawalStartYear && year <= profile.withdrawalEndYear;
          return sum + (activeYear ? profile.withdrawalGainMonthly : 0);
        }, 0)
      : 0;
    const depotSavingsRate = state.realEstate.repaymentSources.useDepotSavingsRateAsRepayment
      ? withdrawalProfiles.reduce((sum, profile) => {
          const activeYear = year >= profile.withdrawalStartYear && year <= profile.withdrawalEndYear;
          return sum + (activeYear ? profile.depotSavingsRateMonthly : 0);
        }, 0)
      : 0;
    withdrawalGainPayments.push(withdrawalGain);
    depotSavingsRatePayments.push(depotSavingsRate);
    specialRepayments.push(
      specialPositions.reduce((sum, position) => {
        return (
          sum +
          (position.payoutType === "once"
            ? oneTimeInvestmentContributionForMonth(position, year, month)
            : investmentContributionForMonth(position, year, month))
        );
      }, 0)
    );
  }

  return { equityCapital, monthlyPaymentSavings, withdrawalGainPayments, depotSavingsRatePayments, specialRepayments };
}

function selectedRealEstateSourcePositions(
  kind: RealEstatePaymentSourceKind,
  sourceAccounts = selectedRealEstateSourceAccounts()
): ReservePosition[] {
  const positions = sourceAccounts.flatMap((account) => account.yearlyRows);
  const selectedIds = new Set(realEstateSourceIds(kind));
  return positions.filter(
    (position) =>
      position.active &&
      position.type === "savings" &&
      positionFlow(position) === "expense" &&
      selectedIds.has(position.id)
  );
}

function calculateCombinedWealthYears(
  standardProjection: AssetProjection,
  retirementProjection: AssetProjection,
  realEstate: RealEstateFinancingResult,
  standardBirthYear: number,
  retirementBirthYear: number
): CombinedWealthYear[] {
  const standardEndYear = standardBirthYear + standardProjection.endAge;
  const retirementEndYear = retirementBirthYear + retirementProjection.endAge;
  const horizonYears = combinedWealthHorizonYears(state.settings.year, standardEndYear, retirementEndYear);

  const cashContribution = combinedCashContribution(horizonYears, selectedCombinedAccounts());

  return buildCombinedWealthSeries({
    startYear: state.settings.year,
    horizonYears,
    cashStartValue: cashContribution.cashStartValue,
    yearlyCashDelta: cashContribution.yearlyCashDelta,
    yearlyCashDeltas: cashContribution.yearlyCashDeltas,
    depotProjection: standardProjection,
    sharedDepotProjection: retirementProjection,
    depotBirthYear: standardBirthYear,
    sharedDepotBirthYear: retirementBirthYear,
    realEstateYears: realEstate.years,
    toggles: state.combinedWealth
  });
}

function combinedCashContribution(horizonYears: number, accounts: PlanningAccount[]): {
  cashStartValue: number;
  yearlyCashDelta: number;
  yearlyCashDeltas: number[];
} {
  let cashStartValue = 0;
  let yearlyCashDelta = 0;
  const yearlyCashDeltas = Array.from({ length: Math.max(1, horizonYears) }, () => 0);

  for (const account of accounts) {
    if (!includeAccountInCombinedCashContribution(account.type)) continue;
    for (let yearOffset = 0; yearOffset < yearlyCashDeltas.length; yearOffset += 1) {
      const summary = calculateReserveSummary(
        { ...state.settings, year: state.settings.year + yearOffset },
        account.yearlyRows
      );
      if (yearOffset === 0) {
        cashStartValue += summary.yearEndBalance;
        yearlyCashDelta += summary.yearlyRemaining;
      }
      yearlyCashDeltas[yearOffset] += summary.yearlyRemaining;
    }
  }

  if (!Number.isFinite(cashStartValue) || !Number.isFinite(yearlyCashDelta)) {
    return { cashStartValue: 0, yearlyCashDelta: 0, yearlyCashDeltas };
  }

  return { cashStartValue, yearlyCashDelta, yearlyCashDeltas };
}

function includeAccountInCombinedCashContribution(accountType: PlanningAccount["type"]): boolean {
  if (accountType === "mixed") return state.combinedWealth.includeCashPositions;
  if (accountType === "cost_reserve") return state.combinedWealth.includeCostReserveAccounts;
  return state.combinedWealth.includeAnnualTableAccounts;
}

function renderCombinedWealthCalculations(years: CombinedWealthYear[]): void {
  if (!selectedCombinedWealthYear && years.length) {
    selectedCombinedWealthYear = years[years.length - 1].year;
  }
  if (selectedCombinedWealthYear && !years.some((entry) => entry.year === selectedCombinedWealthYear)) {
    selectedCombinedWealthYear = years[years.length - 1]?.year ?? null;
  }
  const selected = years.find((entry) => entry.year === selectedCombinedWealthYear) ?? years[years.length - 1] ?? null;

  const chartHost = document.querySelector<HTMLDivElement>("#combinedWealthChart");
  if (chartHost) {
    chartHost.innerHTML = renderCombinedWealthChart({
      points: years,
      selectedYear: selectedCombinedWealthYear,
      formatMoney: (value) => money(value)
    });
  }

  const detail = document.querySelector<HTMLDivElement>("#combinedWealthYearDetail");
  if (!detail) return;
  detail.innerHTML = renderCombinedWealthYearDetail({
    selected,
    finalYear: years[years.length - 1] ?? null,
    formatMoney: (value) => money(value),
    formatInt: (value) => intNumber(value)
  });
}

function renderPositions(): void {
  renderPositionModeControls();
  const sourcePositions = positionTableSourcePositions();
  const basePositions = sourcePositions.filter((position) => positionTableMode(position) === selectedPositionMode);
  renderPositionTableControls(basePositions, sourcePositions);
  renderPositionTableHead();
  const body = document.querySelector<HTMLTableSectionElement>("#positionsBody");
  if (!body) return;

  const view = currentPositionTableView();
  const positions = positionTableRows(sourcePositions, selectedPositionMode, view);
  const isFilteredOrSorted = hasActivePositionTableView(view);
  if (!basePositions.length) {
    body.innerHTML = `
      <tr>
        <td class="position-empty" colspan="${positionTableColumnCount(selectedPositionMode)}">
          Noch keine ${positionModeEmptyLabel(selectedPositionMode, selectedExpenseSubmode)} angelegt.
        </td>
      </tr>
    `;
    renderPositionIconPicker();
    return;
  }

  if (!positions.length) {
    body.innerHTML = `
      <tr>
        <td class="position-empty" colspan="${positionTableColumnCount(selectedPositionMode)}">
          Keine Positionen fuer aktuelle Filter.
        </td>
      </tr>
    `;
    renderPositionIconPicker();
    return;
  }

  body.innerHTML = positions
    .map((position) => {
      const isIncome = isIncomePosition(position);
      return `
        <tr data-position-row="${position.id}">
          <td class="reorder-cell">
            ${positionDragHandle(position.id, isFilteredOrSorted)}
          </td>
          <td class="check-cell"><input type="checkbox" data-position-id="${position.id}" data-position-field="active" ${
            position.active ? "checked" : ""
          } /></td>
          <td class="check-cell"><input type="checkbox" data-position-id="${position.id}" data-position-field="visible" ${
            position.visible ? "checked" : ""
          } /></td>
          <td class="label-cell">${positionIconSelect(position)}</td>
          <td class="name-cell"><input class="name-input" value="${escapeHtml(position.name)}" data-position-id="${
            position.id
          }" data-position-field="name" /></td>
          <td>${positionTypeSelect(position)}</td>
          <td><input class="small-input amount-input" type="number" min="0" step="0.01" value="${position.amount}" data-position-id="${
            position.id
          }" data-position-field="amount" /></td>
          ${isIncome ? incomeDateCells(position) : expenseDateCells(position)}
          <td>${payoutSelect(position)}</td>
          <td>${monthSelect(position.id, "payoutMonth", position.payoutMonth)}</td>
          <td class="day-cell"><input class="small-input day-input" type="number" min="1" max="31" step="1" value="${
            position.payoutDay
          }" data-position-id="${position.id}" data-position-field="payoutDay" /></td>
          ${
            isIncome
              ? ""
              : `
          <td class="check-cell interest-toggle-cell"><input type="checkbox" data-position-id="${position.id}" data-position-field="interestBearing" ${
                  position.payoutType !== "once" && position.interestBearing ? "checked" : ""
                } ${position.payoutType !== "once" ? "" : "disabled"} /></td>
          <td class="check-cell cashback-toggle-cell"><input type="checkbox" data-position-id="${position.id}" data-position-field="cashback" ${
                  position.type === "temporary" && position.cashback ? "checked" : ""
                } ${position.type === "temporary" ? "" : "disabled"} /></td>
          `
          }
          <td><button class="icon-button danger" type="button" data-action="remove-${position.id}" aria-label="Position entfernen">x</button></td>
        </tr>
      `;
    })
    .join("");

  for (const button of body.querySelectorAll<HTMLButtonElement>("button[data-action^='remove-']")) {
    button.addEventListener("click", () => {
      const id = button.dataset.action?.replace("remove-", "");
      if (!id) return;
      removePosition(id);
      renderAll();
    });
  }
  renderPositionIconPicker();
}

function renderPlanningAccounts(): void {
  const cards = document.querySelector<HTMLDivElement>("#planningAccountCards");
  const summary = document.querySelector<HTMLParagraphElement>("#planningAccountSummary");
  const yearAccountName = document.querySelector<HTMLSpanElement>("#activeYearAccountName");
  const yearSelector = document.querySelector<HTMLDivElement>("#yearAccountSelector");
  const investmentSelector = document.querySelector<HTMLDivElement>("#investmentAccountSelector");
  const realEstateAccountSelector = document.querySelector<HTMLDivElement>("#realEstateAccountSelector");
  const combinedAccountSelector = document.querySelector<HTMLDivElement>("#combinedAccountSelector");
  const combinedLeadAccountSelector = document.querySelector<HTMLDivElement>("#combinedLeadInvestmentAccountSelector");
  if (!cards || !summary || !yearAccountName) return;

  const activeAccount = activePlanningAccount();
  const totalsByType = state.planningAccounts.reduce(
    (accumulator, account) => {
      if (account.type === "cost_reserve") accumulator.costReserve += 1;
      else if (account.type === "annual_table") accumulator.annualTable += 1;
      else accumulator.mixed += 1;
      return accumulator;
    },
    { costReserve: 0, annualTable: 0, mixed: 0 }
  );

  cards.innerHTML = state.planningAccounts
    .map((account) => {
      const isActive = account.id === activeAccount.id;
      return `
        <button
          class="planning-account-card ${isActive ? "active" : ""}"
          type="button"
          data-action="select-planning-account-${account.id}"
          aria-pressed="${isActive}"
        >
          <strong>${escapeHtml(account.name)}</strong>
          <small>${escapeHtml(account.type)}</small>
          <small>${intNumber(account.yearlyRows.length)} Positionen</small>
        </button>
      `;
    })
    .join("");

  if (yearSelector) {
    yearSelector.innerHTML = state.planningAccounts.length
      ? state.planningAccounts
          .map((account) => {
            const isActive = account.id === activeAccount.id;
            return `
              <button
                class="position-mode-button ${isActive ? "active" : ""}"
                type="button"
                data-action="select-planning-account-${account.id}"
                aria-pressed="${isActive}"
              >${escapeHtml(account.name)}</button>
            `;
          })
          .join("")
      : '<span class="chart-empty">Noch kein Konto vorhanden.</span>';
  }

  if (investmentSelector) {
    investmentSelector.innerHTML = state.planningAccounts.length
      ? state.planningAccounts
          .map((account) => {
            const isActive = account.id === state.ui.selectedInvestmentAccountId;
            return `
              <button
                class="planning-account-card ${isActive ? "active" : ""}"
                type="button"
                data-action="select-investment-account-${account.id}"
                aria-pressed="${isActive}"
              >
                <strong>${escapeHtml(account.name)}</strong>
                <small>${escapeHtml(account.type)}</small>
                <small>${intNumber(account.yearlyRows.length)} Positionen</small>
              </button>
            `;
          })
          .join("")
      : '<span class="chart-empty">Noch kein Konto vorhanden.</span>';
  }

  if (realEstateAccountSelector) {
    realEstateAccountSelector.innerHTML = state.planningAccounts.length
      ? state.planningAccounts
          .map((account) => {
            const active = state.ui.selectedRealEstateAccountIds.includes(account.id);
            return `
              <button
                class="planning-account-card ${active ? "active" : ""}"
                type="button"
                data-action="toggle-real-estate-account-${account.id}"
                aria-pressed="${active}"
              >
                <strong>${escapeHtml(account.name)}</strong>
                <small>${escapeHtml(account.type)}</small>
                <small>${intNumber(account.yearlyRows.length)} Positionen</small>
              </button>
            `;
          })
          .join("")
      : '<span class="chart-empty">Noch kein Konto vorhanden.</span>';
  }

  if (combinedAccountSelector) {
    combinedAccountSelector.innerHTML = state.planningAccounts.length
      ? state.planningAccounts
          .map((account) => {
            const active = state.ui.selectedCombinedAccountIds.includes(account.id);
            return `
              <button
                class="planning-account-card ${active ? "active" : ""}"
                type="button"
                data-action="toggle-combined-account-${account.id}"
                aria-pressed="${active}"
              >
                <strong>${escapeHtml(account.name)}</strong>
                <small>${escapeHtml(account.type)}</small>
                <small>${intNumber(account.yearlyRows.length)} Positionen</small>
              </button>
            `;
          })
          .join("")
      : '<span class="chart-empty">Noch kein Konto vorhanden.</span>';
  }

  if (combinedLeadAccountSelector) {
    const activeCombinedAccounts = selectedCombinedAccounts();
    combinedLeadAccountSelector.innerHTML = activeCombinedAccounts.length
      ? activeCombinedAccounts
          .map((account) => {
            const active = state.ui.selectedCombinedLeadInvestmentAccountId === account.id;
            return `
              <button
                class="planning-account-card ${active ? "active" : ""}"
                type="button"
                data-action="select-combined-lead-account-${account.id}"
                aria-pressed="${active}"
              >
                <strong>${escapeHtml(account.name)}</strong>
                <small>${escapeHtml(account.type)}</small>
                <small>${intNumber(account.yearlyRows.length)} Positionen</small>
              </button>
            `;
          })
          .join("")
      : '<span class="chart-empty">Kein aktives Konto ausgewaehlt.</span>';
  }

  summary.textContent = `Konten gesamt: ${state.planningAccounts.length} | mixed: ${totalsByType.mixed} | cost_reserve: ${totalsByType.costReserve} | annual_table: ${totalsByType.annualTable}`;
  yearAccountName.textContent = `(aktiv: ${activeAccount.name})`;
  renderPlanningAccountDialog();
}

function addPlanningAccount(): void {
  accountDialog = {
    mode: "create",
    accountId: null,
    name: `Konto ${state.planningAccounts.length + 1}`,
    type: "mixed",
    error: ""
  };
  renderPlanningAccountDialog();
}

function renamePlanningAccount(): void {
  const account = activePlanningAccount();
  accountDialog = {
    mode: "rename",
    accountId: account.id,
    name: account.name,
    type: account.type,
    error: ""
  };
  renderPlanningAccountDialog();
}

function updateAccountDialogDraft(field: string, value: string): void {
  if (!accountDialog) return;
  if (field === "type") {
    accountDialog = {
      ...accountDialog,
      type: value === "cost_reserve" || value === "annual_table" || value === "mixed" ? value : accountDialog.type,
      error: ""
    };
    return;
  }
  if (field === "name") {
    accountDialog = { ...accountDialog, name: value, error: "" };
  }
}

function closePlanningAccountDialog(): void {
  accountDialog = null;
  renderPlanningAccountDialog();
}

function savePlanningAccountDialog(): void {
  if (!accountDialog) return;
  const name = accountDialog.name.trim();
  if (!name) {
    accountDialog = { ...accountDialog, error: "Bitte einen Kontonamen eingeben." };
    renderPlanningAccountDialog();
    return;
  }

  if (accountDialog.mode === "rename" && accountDialog.accountId) {
    state.planningAccounts = state.planningAccounts.map((item) =>
      item.id === accountDialog?.accountId ? { ...item, name, type: accountDialog.type } : item
    );
    accountDialog = null;
    renderAll();
    return;
  }

  const account: PlanningAccount = {
    id: createId(),
    name,
    type: accountDialog.type,
    yearlyRows: []
  };
  syncActivePlanningAccountFromPositions();
  state.planningAccounts = [...state.planningAccounts, account];
  state.investmentByAccountId = {
    ...state.investmentByAccountId,
    [account.id]: defaultInvestmentSettingsForNewAccount()
  };
  state.ui = {
    ...state.ui,
    selectedPlanningAccountId: account.id,
    selectedInvestmentAccountId: account.id,
    selectedRealEstateAccountIds: Array.from(new Set([...state.ui.selectedRealEstateAccountIds, account.id])),
    selectedRealEstateWithdrawalGainAccountIds: Array.from(new Set([...state.ui.selectedRealEstateAccountIds, account.id])),
    selectedCombinedAccountIds: Array.from(new Set([...state.ui.selectedCombinedAccountIds, account.id]))
  };
  state.positions = account.yearlyRows;
  accountDialog = null;
  renderAll();
}

function renderPlanningAccountDialog(): void {
  const host = document.querySelector<HTMLDivElement>("#planningAccountDialogHost");
  if (!host) return;
  if (!accountDialog) {
    host.innerHTML = "";
    return;
  }
  host.innerHTML = `
    <div class="account-dialog-backdrop" role="presentation">
      <div class="account-dialog" role="dialog" aria-modal="true" aria-label="Konto bearbeiten">
        <div class="settings-popover-head">
          <strong>${accountDialog.mode === "create" ? "Neues Konto" : "Konto bearbeiten"}</strong>
          <button class="chart-popup-close" type="button" data-action="cancel-planning-account-dialog" aria-label="Konto-Dialog schliessen">x</button>
        </div>
        <div class="field-grid">
          <label class="field">
            <span>Kontoname</span>
            <input type="text" value="${escapeHtml(accountDialog.name)}" data-account-dialog-field="name" />
          </label>
          <label class="field">
            <span>Kontotyp</span>
            <select data-account-dialog-field="type">
              <option value="mixed" ${accountDialog.type === "mixed" ? "selected" : ""}>Gemischt</option>
              <option value="cost_reserve" ${accountDialog.type === "cost_reserve" ? "selected" : ""}>Kosten/Ruecklagen</option>
              <option value="annual_table" ${accountDialog.type === "annual_table" ? "selected" : ""}>Jahrestabelle</option>
            </select>
          </label>
        </div>
        ${accountDialog.error ? `<div class="validation-box error">${escapeHtml(accountDialog.error)}</div>` : ""}
        <div class="button-row">
          <button class="button secondary" type="button" data-action="cancel-planning-account-dialog">Abbrechen</button>
          <button class="button" type="button" data-action="save-planning-account-dialog">Speichern</button>
        </div>
      </div>
    </div>
  `;
}

function deletePlanningAccount(): void {
  if (state.planningAccounts.length <= 1) {
    window.alert("Mindestens ein Konto muss bestehen bleiben.");
    return;
  }
  const account = activePlanningAccount();
  const confirmed = window.confirm(`Konto '${account.name}' wirklich loeschen?`);
  if (!confirmed) return;
  state.planningAccounts = state.planningAccounts.filter((item) => item.id !== account.id);
  const nextPlanningAccountId = state.planningAccounts[0].id;
  const nextRealEstateAccountIds = state.ui.selectedRealEstateAccountIds.filter((accountId) => accountId !== account.id);
  const nextCombinedAccountIds = state.ui.selectedCombinedAccountIds.filter((accountId) => accountId !== account.id);
  const nextInvestmentByAccountId = { ...state.investmentByAccountId };
  delete nextInvestmentByAccountId[account.id];
  state.investmentByAccountId = nextInvestmentByAccountId;
  state.ui = {
    ...state.ui,
    selectedPlanningAccountId: nextPlanningAccountId,
    selectedInvestmentAccountId:
      state.ui.selectedInvestmentAccountId === account.id ? nextPlanningAccountId : state.ui.selectedInvestmentAccountId,
    selectedRealEstateAccountIds: nextRealEstateAccountIds,
    selectedRealEstateWithdrawalGainAccountIds: nextRealEstateAccountIds,
    selectedCombinedAccountIds: nextCombinedAccountIds
  };
  syncPositionsFromActivePlanningAccount();
  renderAll();
}

function selectPlanningAccount(accountId: string): void {
  if (!accountId || accountId === state.ui.selectedPlanningAccountId) return;
  if (!state.planningAccounts.some((account) => account.id === accountId)) return;
  syncActivePlanningAccountFromPositions();
  state.ui = { ...state.ui, selectedPlanningAccountId: accountId };
  syncPositionsFromActivePlanningAccount();
  renderAll();
}

function selectInvestmentAccount(accountId: string): void {
  if (!accountId || accountId === state.ui.selectedInvestmentAccountId) return;
  if (!state.planningAccounts.some((account) => account.id === accountId)) return;
  state.ui = { ...state.ui, selectedInvestmentAccountId: accountId };
  renderAll();
}

function toggleRealEstateSourceAccount(accountId: string): void {
  if (!accountId || !state.planningAccounts.some((account) => account.id === accountId)) return;
  const selected = new Set(state.ui.selectedRealEstateAccountIds);
  if (selected.has(accountId)) selected.delete(accountId);
  else selected.add(accountId);
  const selectedIds = Array.from(selected);
  state.ui = {
    ...state.ui,
    selectedRealEstateAccountIds: selectedIds,
    selectedRealEstateWithdrawalGainAccountIds: selectedIds
  };
  resetRealEstateDetailSelection();
  renderAll();
}

function toggleCombinedAccount(accountId: string): void {
  if (!accountId || !state.planningAccounts.some((account) => account.id === accountId)) return;
  const selected = new Set(state.ui.selectedCombinedAccountIds);
  if (selected.has(accountId)) selected.delete(accountId);
  else selected.add(accountId);
  state.ui = {
    ...state.ui,
    selectedCombinedAccountIds: Array.from(selected)
  };
  renderAll();
}

function selectCombinedLeadInvestmentAccount(accountId: string): void {
  if (!accountId || !state.planningAccounts.some((account) => account.id === accountId)) return;
  if (!state.ui.selectedCombinedAccountIds.includes(accountId)) return;
  if (state.ui.selectedCombinedLeadInvestmentAccountId === accountId) return;
  state.ui = { ...state.ui, selectedCombinedLeadInvestmentAccountId: accountId };
  renderAll();
}

function showIncomeYearLabelPicker(button: HTMLButtonElement): void {
  const entryId = button.dataset.incomeYearId;
  if (!entryId) return;
  const rect = button.getBoundingClientRect();
  const panelWidth = 360;
  const panelHeight = 420;
  const left =
    rect.right + 12 + panelWidth <= window.innerWidth
      ? rect.right + 12
      : Math.max(12, rect.left - panelWidth - 12);
  const top = Math.max(12, Math.min(rect.top, window.innerHeight - panelHeight - 12));
  incomeYearLabelPicker = { entryId, top, left };
  renderIncomeYearLabelPicker();
}

function hideIncomeYearLabelPicker(): void {
  incomeYearLabelPicker = null;
  renderIncomeYearLabelPicker();
}

function selectIncomeYearLabel(entryId: string, label: string): void {
  if (!entryId || !label) return;
  state.incomeTracker = {
    ...state.incomeTracker,
    yearlyEntries: state.incomeTracker.yearlyEntries.map((entry) =>
      entry.id === entryId ? { ...entry, label: incomeYearLabel(label) } : entry
    )
  };
  incomeYearLabelPicker = null;
  renderAll();
}

function renderIncomeYearLabelPicker(): void {
  const picker = document.querySelector<HTMLDivElement>("#incomeYearLabelPicker");
  if (!picker) return;
  if (!incomeYearLabelPicker) {
    picker.hidden = true;
    return;
  }

  const entry = state.incomeTracker.yearlyEntries.find((item) => item.id === incomeYearLabelPicker?.entryId);
  if (!entry) {
    picker.hidden = true;
    incomeYearLabelPicker = null;
    return;
  }

  picker.style.top = `${incomeYearLabelPicker.top}px`;
  picker.style.left = `${incomeYearLabelPicker.left}px`;
  picker.innerHTML = `
    <div class="position-icon-picker-head">
      <span>Einkommenslabel</span>
      <button class="icon-button" type="button" data-action="close-income-year-label-picker" aria-label="Labelauswahl schliessen">x</button>
    </div>
    <div class="position-icon-picker-grid income-year-label-grid">
      ${INCOME_YEAR_LABEL_OPTIONS.map((option) => {
        const active = option.id === incomeYearLabel(entry.label);
        return `
          <button
            class="position-icon-option income-year-label-option ${active ? "active" : ""}"
            type="button"
            data-action="select-income-year-label"
            data-income-year-id="${entry.id}"
            data-income-label="${escapeHtml(option.id)}"
            aria-pressed="${active}"
            title="${escapeHtml(option.description)}"
          >
            ${positionIconSvg(option.icon)}
            <span>${escapeHtml(option.label)}</span>
            <small>${escapeHtml(option.description)}</small>
          </button>
        `;
      }).join("")}
    </div>
  `;
  picker.hidden = false;
}

function showIncomeMilestoneTypePicker(button: HTMLButtonElement): void {
  const milestoneId = button.dataset.milestoneId;
  if (!milestoneId) return;
  const rect = button.getBoundingClientRect();
  const panelWidth = 360;
  const panelHeight = 420;
  const left =
    rect.right + 12 + panelWidth <= window.innerWidth
      ? rect.right + 12
      : Math.max(12, rect.left - panelWidth - 12);
  const top = Math.max(12, Math.min(rect.top, window.innerHeight - panelHeight - 12));
  incomeMilestoneTypePicker = { milestoneId, top, left };
  renderIncomeMilestoneTypePicker();
}

function hideIncomeMilestoneTypePicker(): void {
  incomeMilestoneTypePicker = null;
  renderIncomeMilestoneTypePicker();
}

function selectIncomeMilestoneType(milestoneId: string, type: string): void {
  if (!milestoneId || !type) return;
  state.incomeTracker = {
    ...state.incomeTracker,
    milestones: state.incomeTracker.milestones.map((milestone) =>
      milestone.id === milestoneId ? { ...milestone, type } : milestone
    )
  };
  incomeMilestoneTypePicker = null;
  renderAll();
}

function renderIncomeMilestoneTypePicker(): void {
  const picker = document.querySelector<HTMLDivElement>("#incomeMilestoneTypePicker");
  if (!picker) return;
  if (!incomeMilestoneTypePicker) {
    picker.hidden = true;
    return;
  }

  const milestone = state.incomeTracker.milestones.find((item) => item.id === incomeMilestoneTypePicker?.milestoneId);
  if (!milestone) {
    picker.hidden = true;
    incomeMilestoneTypePicker = null;
    return;
  }

  picker.style.top = `${incomeMilestoneTypePicker.top}px`;
  picker.style.left = `${incomeMilestoneTypePicker.left}px`;
  picker.innerHTML = `
    <div class="position-icon-picker-head">
      <span>Meilenstein-Typ</span>
      <button class="icon-button" type="button" data-action="close-income-milestone-type-picker" aria-label="Typauswahl schliessen">x</button>
    </div>
    <div class="position-icon-picker-grid income-milestone-type-grid">
      ${CAREER_MILESTONE_TYPE_OPTIONS.map((option) => {
        const active = option.type === milestone.type;
        return `
          <button
            class="position-icon-option income-milestone-type-option ${active ? "active" : ""}"
            type="button"
            data-action="select-income-milestone-type"
            data-milestone-id="${milestone.id}"
            data-milestone-type="${escapeHtml(option.type)}"
            aria-pressed="${active}"
            title="${escapeHtml(option.description)}"
          >
            ${positionIconSvg(option.icon)}
            <span>${escapeHtml(option.type)}</span>
            <small>${escapeHtml(option.description)}</small>
          </button>
        `;
      }).join("")}
    </div>
  `;
  picker.hidden = false;
}

function showPositionIconPicker(button: HTMLButtonElement): void {
  const positionId = button.dataset.positionId;
  if (!positionId) return;
  const rect = button.getBoundingClientRect();
  const panelWidth = 320;
  const panelHeight = 360;
  const left =
    rect.right + 12 + panelWidth <= window.innerWidth
      ? rect.right + 12
      : Math.max(12, rect.left - panelWidth - 12);
  const top = Math.max(12, Math.min(rect.top, window.innerHeight - panelHeight - 12));
  positionIconPicker = { positionId, top, left };
  renderPositionIconPicker();
}

function hidePositionIconPicker(): void {
  positionIconPicker = null;
  renderPositionIconPicker();
}

function selectPositionIcon(positionId: string, icon: string): void {
  if (!positionId || !icon) return;
  state.positions = state.positions.map((position) =>
    position.id === positionId ? { ...position, icon: normalizePositionIcon(icon, position.icon) } : position
  );
  positionIconPicker = null;
  renderAll();
}

function renderPositionIconPicker(): void {
  const picker = document.querySelector<HTMLDivElement>("#positionIconPicker");
  if (!picker) return;
  if (!positionIconPicker) {
    picker.hidden = true;
    return;
  }

  const position = state.positions.find((item) => item.id === positionIconPicker?.positionId);
  if (!position) {
    picker.hidden = true;
    positionIconPicker = null;
    return;
  }

  const currentIcon = normalizePositionIcon(position.icon);
  picker.style.top = `${positionIconPicker.top}px`;
  picker.style.left = `${positionIconPicker.left}px`;
  picker.innerHTML = `
    <div class="position-icon-picker-head">
      <span>Label auswaehlen</span>
      <button class="icon-button" type="button" data-action="close-position-icon-picker" aria-label="Labelauswahl schliessen">x</button>
    </div>
    <div class="position-icon-picker-grid">
      ${POSITION_ICONS.map((icon) => {
        const active = icon.id === currentIcon;
        return `
          <button
            class="position-icon-option ${active ? "active" : ""}"
            type="button"
            data-action="select-position-icon"
            data-position-id="${position.id}"
            data-position-icon="${icon.id}"
            aria-pressed="${active}"
            title="${escapeHtml(icon.label)}"
          >
            ${positionIconSvg(icon.id)}
            <span>${escapeHtml(icon.label)}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
  picker.hidden = false;
}

function renderPositionModeControls(): void {
  for (const mode of ["income", "expense", "reserve", "savings"] as PositionTableMode[]) {
    const button = document.querySelector<HTMLButtonElement>(`[data-action='show-${mode}-positions']`);
    if (!button) continue;
    const active = selectedPositionMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  const expenseSubmodeHost = document.querySelector<HTMLDivElement>("#expenseSubmodeSwitchHost");
  if (expenseSubmodeHost) {
    if (selectedPositionMode !== "expense") {
      expenseSubmodeHost.innerHTML = "";
    } else {
      expenseSubmodeHost.innerHTML = `
        <div class="position-mode-switch expense-submode-switch" role="group" aria-label="Ausgaben-Unteransicht">
          <button class="position-mode-button ${selectedExpenseSubmode === "once" ? "active" : ""}" type="button" data-action="toggle-expense-once" aria-pressed="${selectedExpenseSubmode === "once"}">Einmalig</button>
        </div>
      `;
    }
  }
  const addButton = document.querySelector<HTMLButtonElement>("#addPositionButton");
  if (addButton) {
    addButton.textContent = addPositionButtonLabel(selectedPositionMode, selectedExpenseSubmode);
  }
}

function renderPositionTableControls(basePositions: ReservePosition[], sourcePositions: ReservePosition[]): void {
  const wrapper = document.querySelector<HTMLDivElement>("#positionTableControls");
  if (!wrapper) return;
  syncPositionFilterToggle();
  const view = currentPositionTableView();
  const draft = normalizedPositionFilterDraft();
  const columns = positionTableColumnsForMode(selectedPositionMode);
  const selectedConfig = positionTableColumnConfig(selectedPositionMode, draft.column) ?? columns[0];
  const operators = positionTableOperatorsForColumn(selectedPositionMode, selectedConfig.column);
  const options = positionTableSelectOptions(selectedPositionMode, selectedConfig.column, sourcePositions);
  const labelOptions = positionTableLabelOptions(sourcePositions, selectedPositionMode);
  const active = hasActivePositionTableView(view);
  const visibleCount = positionTableRows(sourcePositions, selectedPositionMode, view).length;

  wrapper.innerHTML = `
    <div class="position-table-view-row">
      <div class="position-view-chips" aria-live="polite">
        ${view.filters.map(positionFilterChip).join("")}
        ${view.sort ? positionSortChip(view.sort) : ""}
      </div>
      <span class="position-view-count">${visibleCount} von ${basePositions.length}</span>
    </div>
    ${labelOptions.length ? positionLabelFilterRow(labelOptions, view.selectedLabels) : ""}
    ${
      positionFilterPopupOpen
        ? `
    <div id="positionFilterPopup" class="position-filter-popup" role="dialog" aria-label="Positionsfilter">
      <div class="position-filter-popup-head">
        <strong>Filter</strong>
        <button class="chart-popup-close" type="button" data-action="close-position-filter" aria-label="Filter schliessen">x</button>
      </div>
      <div class="position-filter-builder">
        <label class="filter-field">
          <span>Spalte</span>
          <select data-position-filter-draft="column">
            ${columns
              .map(
                (column) =>
                  `<option value="${column.column}" ${column.column === selectedConfig.column ? "selected" : ""}>${escapeHtml(
                    column.label
                  )}</option>`
              )
              .join("")}
          </select>
        </label>
        <label class="filter-field operator">
          <span>Operator</span>
          <select data-position-filter-draft="operator">
            ${operators
              .map(
                (operator) =>
                  `<option value="${operator}" ${operator === draft.operator ? "selected" : ""}>${escapeHtml(
                    positionTableOperatorLabel(operator)
                  )}</option>`
              )
              .join("")}
          </select>
        </label>
        <label class="filter-field value">
          <span>Wert</span>
          ${positionFilterValueControl(selectedConfig.kind, draft.value, options)}
        </label>
        <button class="button secondary" type="button" data-action="add-position-filter">Filter setzen</button>
        <button class="button secondary" type="button" data-action="clear-position-table-view" ${
          active ? "" : "disabled"
        }>
          Zuruecksetzen
        </button>
      </div>
    </div>
        `
        : ""
    }
  `;
}

function positionLabelFilterRow(
  labels: Array<{ value: string; label: string }>,
  selectedLabels: string[]
): string {
  const selected = new Set(selectedLabels.map((label) => normalizePositionIcon(label)));
  return `
    <div class="position-label-filter-row" aria-label="Label-Schnellfilter">
      ${labels
        .map((label) => {
          const active = selected.has(label.value);
          return `
            <button
              class="position-label-filter-button ${active ? "active" : ""}"
              type="button"
              data-action="toggle-position-label-filter"
              data-position-label="${escapeHtml(label.value)}"
              aria-pressed="${active}"
              aria-label="Label ${escapeHtml(label.label)} ${active ? "deaktivieren" : "aktivieren"}"
              title="${escapeHtml(label.label)}"
            >
              ${positionIconSvg(label.value)}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function syncPositionFilterToggle(): void {
  const button = document.querySelector<HTMLButtonElement>("[data-action='toggle-position-filter']");
  if (!button) return;
  button.classList.toggle("active", positionFilterPopupOpen);
  button.setAttribute("aria-expanded", String(positionFilterPopupOpen));
}

function positionFilterValueControl(
  kind: "text" | "select" | "number",
  value: string,
  options: Array<{ value: string; label: string }>
): string {
  if (kind === "select") {
    return `
      <select data-position-filter-draft="value">
        <option value="">Auswaehlen</option>
        ${options
          .map(
            (option) =>
              `<option value="${escapeHtml(option.value)}" ${option.value === value ? "selected" : ""}>${escapeHtml(
                option.label
              )}</option>`
          )
          .join("")}
      </select>
    `;
  }

  if (kind === "number") {
    return `<input type="number" step="0.01" value="${escapeHtml(value)}" data-position-filter-draft="value" />`;
  }

  return `<input type="search" value="${escapeHtml(value)}" data-position-filter-draft="value" />`;
}

function positionFilterChip(filter: PositionTableView["filters"][number]): string {
  return `
    <button
      class="position-view-chip"
      type="button"
      data-action="remove-position-filter"
      data-filter-id="${escapeHtml(filter.id)}"
      aria-label="Filter entfernen: ${escapeHtml(positionTableFilterChipLabel(selectedPositionMode, filter))}"
    >
      <span>${escapeHtml(positionTableFilterChipLabel(selectedPositionMode, filter))}</span>
      <strong aria-hidden="true">x</strong>
    </button>
  `;
}

function positionSortChip(sort: NonNullable<PositionTableView["sort"]>): string {
  return `
    <button
      class="position-view-chip sort"
      type="button"
      data-action="clear-position-sort"
      aria-label="Sortierung entfernen: ${escapeHtml(positionTableSortLabel(selectedPositionMode, sort))}"
    >
      <span>${escapeHtml(positionTableSortLabel(selectedPositionMode, sort))}</span>
      <strong aria-hidden="true">x</strong>
    </button>
  `;
}

function renderPositionTableHead(): void {
  const head = document.querySelector<HTMLTableSectionElement>("#positionsHead");
  if (!head) return;
  const dateHeaders =
    selectedPositionMode === "savings"
      ? [
          positionSortableHeader(
            "payoutYear",
            '<span class="split-header">Fix-Start<span>Abgangsjahr</span></span>'
          ),
          positionSortableHeader(
            "startMonth",
            '<span class="split-header">Fix-Ende<span>Anfang Monat</span></span>'
          )
        ].join("")
      : [positionSortableHeader("startMonth", "Start"), positionSortableHeader("endMonth", "Ende")].join("");
  const timingLabel =
    selectedPositionMode === "income" ? "Eingang" : selectedPositionMode === "savings" ? "Transfer" : "Abgang";
  const monthLabel =
    selectedPositionMode === "income"
      ? "Eingangsmonat"
      : selectedPositionMode === "savings"
        ? "Transfermonat"
        : "Abgangsmonat";
  head.innerHTML = `
    <tr>
      <th class="reorder-col"></th>
      ${positionSortableHeader("active", "Aktiv", "check-col")}
      ${positionSortableHeader("visible", "View", "check-col")}
      ${positionSortableHeader("label", "Label", "label-col")}
      ${positionSortableHeader("name", "Name", "name-col")}
      ${positionSortableHeader("type", "Art")}
      ${positionSortableHeader("amount", "Betrag", "amount-col")}
      ${dateHeaders}
      ${selectedPositionMode === "income" ? positionSortableHeader("payoutYear", "Jahr") : ""}
      ${positionSortableHeader("payoutType", timingLabel)}
      ${positionSortableHeader("payoutMonth", monthLabel)}
      ${positionSortableHeader("payoutDay", "Tag", "day-col")}
      ${
        selectedPositionMode !== "income"
          ? `${positionSortableHeader("interestBearing", "Zins", "interest-toggle-col")}${positionSortableHeader(
              "cashback",
              "Cashb.",
              "cashback-toggle-col"
            )}`
          : ""
      }
      <th></th>
    </tr>
  `;
}

function positionSortableHeader(column: PositionTableFilterColumn, label: string, className = ""): string {
  const view = currentPositionTableView();
  const direction = view.sort?.column === column ? view.sort.direction : null;
  const ariaSort = direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none";
  const indicator = direction === "asc" ? "^" : direction === "desc" ? "v" : "";
  const classes = ["sortable-col", className].filter(Boolean).join(" ");
  return `
    <th class="${classes}" aria-sort="${ariaSort}">
      <button class="table-sort-button ${direction ? "active" : ""}" type="button" data-action="sort-position-table-${column}">
        <span>${label}</span>
        <span class="sort-indicator" aria-hidden="true">${indicator}</span>
      </button>
    </th>
  `;
}

function positionTableColumnCount(mode: PositionTableMode): number {
  return mode === "income" ? 14 : 15;
}

function positionDragHandle(positionId: string, locked: boolean): string {
  if (locked) {
    return `
      <button
        class="drag-handle disabled"
        type="button"
        disabled
        aria-label="Reihenfolge bei Filter oder Sortierung gesperrt"
        title="Filter oder Sortierung zuruecksetzen, um zu verschieben"
      >:::</button>
    `;
  }
  return `<button class="drag-handle" type="button" draggable="true" data-position-drag-id="${positionId}" aria-label="Position verschieben" title="Position verschieben">:::</button>`;
}

function currentPositionTableView(): PositionTableView {
  return state.positionTableView[selectedPositionMode] ?? emptyPositionTableView();
}

function updateCurrentPositionTableView(updater: (view: PositionTableView) => PositionTableView): void {
  state = {
    ...state,
    positionTableView: {
      ...state.positionTableView,
      [selectedPositionMode]: updater(currentPositionTableView())
    }
  };
}

function createPositionFilterDrafts(): Record<PositionTableMode, PositionFilterDraft> {
  return {
    income: defaultPositionFilterDraft("income"),
    expense: defaultPositionFilterDraft("expense"),
    reserve: defaultPositionFilterDraft("reserve"),
    savings: defaultPositionFilterDraft("savings")
  };
}

function defaultPositionFilterDraft(mode: PositionTableMode): PositionFilterDraft {
  const column = positionTableColumnsForMode(mode).find((config) => config.column === "name")?.column ?? "name";
  return {
    column,
    operator: positionTableOperatorsForColumn(mode, column)[0],
    value: ""
  };
}

function normalizedPositionFilterDraft(): PositionFilterDraft {
  const draft = positionFilterDrafts[selectedPositionMode] ?? defaultPositionFilterDraft(selectedPositionMode);
  const config = positionTableColumnConfig(selectedPositionMode, draft.column);
  const column = config ? draft.column : "name";
  const operators = positionTableOperatorsForColumn(selectedPositionMode, column);
  const operator = operators.includes(draft.operator) ? draft.operator : operators[0];
  const normalized = { column, operator, value: draft.value };
  positionFilterDrafts = {
    ...positionFilterDrafts,
    [selectedPositionMode]: normalized
  };
  return normalized;
}

function updatePositionFilterDraft(field: keyof PositionFilterDraft, value: string): void {
  const current = normalizedPositionFilterDraft();
  if (field === "column") {
    const column = value as PositionTableFilterColumn;
    const nextColumn = positionTableColumnConfig(selectedPositionMode, column) ? column : current.column;
    positionFilterDrafts = {
      ...positionFilterDrafts,
      [selectedPositionMode]: {
        column: nextColumn,
        operator: positionTableOperatorsForColumn(selectedPositionMode, nextColumn)[0],
        value: ""
      }
    };
    renderPositions();
    return;
  }

  if (field === "operator") {
    const operator = value as PositionTableFilterOperator;
    const operators = positionTableOperatorsForColumn(selectedPositionMode, current.column);
    positionFilterDrafts = {
      ...positionFilterDrafts,
      [selectedPositionMode]: {
        ...current,
        operator: operators.includes(operator) ? operator : operators[0]
      }
    };
    return;
  }

  positionFilterDrafts = {
    ...positionFilterDrafts,
    [selectedPositionMode]: { ...current, value }
  };
}

function addPositionTableFilter(): void {
  const draft = currentPositionFilterDraftFromControls();
  const value = String(draft.value).trim();
  if (!value) return;
  updateCurrentPositionTableView((view) => ({
    ...view,
    filters: [...view.filters, { id: createId(), column: draft.column, operator: draft.operator, value }]
  }));
  positionFilterDrafts = {
    ...positionFilterDrafts,
    [selectedPositionMode]: { ...draft, value: "" }
  };
  renderPositions();
  saveState(state);
}

function currentPositionFilterDraftFromControls(): PositionFilterDraft {
  const draft = normalizedPositionFilterDraft();
  const columnInput = document.querySelector<HTMLSelectElement>('[data-position-filter-draft="column"]');
  const operatorInput = document.querySelector<HTMLSelectElement>('[data-position-filter-draft="operator"]');
  const valueInput = document.querySelector<HTMLInputElement | HTMLSelectElement>('[data-position-filter-draft="value"]');
  const column = (columnInput?.value || draft.column) as PositionTableFilterColumn;
  const nextColumn = positionTableColumnConfig(selectedPositionMode, column) ? column : draft.column;
  const operators = positionTableOperatorsForColumn(selectedPositionMode, nextColumn);
  const operator = (operatorInput?.value || draft.operator) as PositionTableFilterOperator;
  return {
    column: nextColumn,
    operator: operators.includes(operator) ? operator : operators[0],
    value: valueInput?.value ?? draft.value
  };
}

function removePositionTableFilter(filterId: string): void {
  updateCurrentPositionTableView((view) => ({
    ...view,
    filters: view.filters.filter((filter) => filter.id !== filterId)
  }));
  renderPositions();
  saveState(state);
}

function clearPositionTableSort(): void {
  updateCurrentPositionTableView((view) => ({ ...view, sort: null }));
  renderPositions();
  saveState(state);
}

function clearCurrentPositionTableView(): void {
  updateCurrentPositionTableView(() => emptyPositionTableView());
  renderPositions();
  saveState(state);
}

function togglePositionLabelFilter(label: string): void {
  const normalizedLabel = normalizePositionIcon(label);
  updateCurrentPositionTableView((view) => {
    const selected = new Set(view.selectedLabels.map((item) => normalizePositionIcon(item)));
    if (selected.has(normalizedLabel)) selected.delete(normalizedLabel);
    else selected.add(normalizedLabel);
    return { ...view, selectedLabels: Array.from(selected) };
  });
  renderPositions();
  saveState(state);
}

function togglePositionFilterPopup(): void {
  positionFilterPopupOpen = !positionFilterPopupOpen;
  renderPositions();
}

function hidePositionFilterPopup(): void {
  if (!positionFilterPopupOpen) return;
  positionFilterPopupOpen = false;
  renderPositions();
}

function togglePositionTableSort(column: PositionTableFilterColumn): void {
  if (!positionTableColumnConfig(selectedPositionMode, column)) return;
  updateCurrentPositionTableView((view) => {
    if (view.sort?.column !== column) return { ...view, sort: { column, direction: "asc" } };
    if (view.sort.direction === "asc") return { ...view, sort: { column, direction: "desc" } };
    return { ...view, sort: null };
  });
  renderPositions();
  saveState(state);
}

function positionModeEmptyLabel(mode: PositionTableMode, expenseSubmode: ExpenseSubmode = "regular"): string {
  if (mode === "income") return "Einnahmen";
  if (mode === "reserve") return "Ruecklagen";
  if (mode === "savings") return "Sparpositionen";
  if (expenseSubmode === "once") return "einmalige Ausgaben";
  return "Ausgaben";
}

function addPositionButtonLabel(mode: PositionTableMode, expenseSubmode: ExpenseSubmode = "regular"): string {
  if (mode === "income") return "Einnahme hinzufuegen";
  if (mode === "reserve") return "Ruecklage hinzufuegen";
  if (mode === "savings") return "Sparposition hinzufuegen";
  if (expenseSubmode === "once") return "Einmalige Ausgabe hinzufuegen";
  return "Ausgabe hinzufuegen";
}

function renderAccountYearTables(): void {
  const host = document.querySelector<HTMLDivElement>("#accountYearTableOverview");
  const toggleButton = document.querySelector<HTMLButtonElement>("[data-action='toggle-result-max-needed']");
  if (toggleButton) {
    toggleButton.classList.toggle("active", showResultMaxNeeded);
    toggleButton.setAttribute("aria-pressed", String(showResultMaxNeeded));
  }
  if (!host) return;
  host.innerHTML = renderAccountYearTableOverview({
    accounts: state.planningAccounts,
    settings: state.settings,
    activeAccountId: state.ui.selectedPlanningAccountId,
    showMaxNeeded: showResultMaxNeeded
  });
}

function renderReserveChartPopup(summary: ReturnType<typeof calculateReserveSummary>): void {
  const popup = document.querySelector<HTMLDivElement>("#reserveChartPopup");
  if (!popup) return;
  if (!reserveChartOpen) {
    popup.hidden = true;
    return;
  }

  const model = buildReserveChartModel(summary);
  popup.innerHTML = `
    <div class="reserve-chart-head">
      <div>
        <span>Positionsgrafik</span>
        <strong>Einnahmen, Ausgaben, Ruecklagen und Sparrate</strong>
      </div>
      <div class="reserve-chart-head-actions">
        <div class="reserve-chart-style-switch" role="group" aria-label="Grafikstil">
          ${reserveChartToggle("style", "bars", "Balken", reserveChartStyle)}
          ${reserveChartToggle("style", "pie", "Kreis", reserveChartStyle)}
        </div>
        <button class="chart-popup-close" type="button" data-action="close-reserve-chart" aria-label="Grafik schliessen">x</button>
      </div>
    </div>
    <div class="reserve-chart-controls" aria-label="Darstellung">
      ${reserveChartToggle("category", "all", "Alle", reserveChartCategory)}
      ${reserveChartToggle("category", "income", "Einnahmen", reserveChartCategory)}
      ${reserveChartToggle("category", "expense", "Ausgaben", reserveChartCategory)}
      ${reserveChartToggle("category", "reserve", "Ruecklagen", reserveChartCategory)}
      ${reserveChartToggle("category", "savings", "Sparen", reserveChartCategory)}
    </div>
    <div class="reserve-chart-controls scenario" aria-label="Szenario">
      ${reserveChartToggle("scenario", "current", "Ist", reserveChartScenario)}
      ${reserveChartToggle("scenario", "lowerExpenses", "Ausgaben -10%", reserveChartScenario)}
      ${reserveChartToggle("scenario", "raiseSavings", "Sparen +10%", reserveChartScenario)}
      ${reserveChartToggle("scenario", "balanced", "Beides", reserveChartScenario)}
    </div>
    <div class="reserve-chart-summary">
      ${reserveChartStat("Einnahmen", model.totals.income, "income")}
      ${reserveChartStat("Ausgaben", model.totals.expense, "expense")}
      ${reserveChartStat("Ruecklagen", model.totals.reserve, "reserve")}
      ${reserveChartStat("Sparrate", model.totals.savings, "savings")}
      ${reserveChartStat("Uebrig", model.totals.remaining, model.totals.remaining >= 0 ? "income" : "expense")}
    </div>
    ${reserveChartGraphic(model)}
    <div class="reserve-chart-legend">
      <span><i class="legend-dot green"></i>Einnahmen</span>
      <span><i class="legend-dot red"></i>Ausgaben</span>
      <span><i class="legend-dot orange"></i>Ruecklagen</span>
      <span><i class="legend-dot purple"></i>Sparen</span>
      ${reserveChartHighlightId ? '<span><i class="legend-dot gold"></i>Markierte Position</span>' : ""}
    </div>
    <div class="reserve-chart-insight">${escapeHtml(model.insight)}</div>
    <div class="reserve-chart-positions">
      <div class="reserve-chart-subhead">
        <strong>Positionen hervorheben</strong>
        ${
          reserveChartHighlightId
            ? '<button class="button secondary mini" type="button" data-action="clear-reserve-position-highlight">Auswahl loeschen</button>'
            : ""
        }
      </div>
      ${
        reserveChartHighlightId
          ? `<div class="reserve-chart-controls reserve-chart-adjustment" aria-label="Markierte Position simulieren">
              ${reserveChartToggle("adjustment", "none", "Ist", reserveChartAdjustment)}
              ${reserveChartToggle("adjustment", "down10", "Position -10%", reserveChartAdjustment)}
              ${reserveChartToggle("adjustment", "up10", "Position +10%", reserveChartAdjustment)}
            </div>`
          : ""
      }
      <div class="reserve-chart-position-grid">
        ${model.positions.map(reserveChartPositionButton).join("")}
      </div>
    </div>
  `;
  popup.hidden = false;
}

function buildReserveChartModel(summary: ReturnType<typeof calculateReserveSummary>): ReserveChartModel {
  const factors = reserveChartScenarioFactors();
  const months = summary.rows.map((row) => {
    const reserves = state.positions.reduce((sum, position) => {
      return position.type === "reserve"
        ? sum + calculatePlannedOutflowForSingleMonth(position, state.settings.year, row.monthNumber)
        : sum;
    }, 0);
    const savings = state.positions.reduce((sum, position) => {
      return position.type === "savings"
        ? sum + calculatePlannedOutflowForSingleMonth(position, state.settings.year, row.monthNumber)
        : sum;
    }, 0);
    const selectedBase = reserveChartHighlightId
      ? reservePositionMonthValue(reserveChartHighlightId, row.monthNumber)
      : 0;
    const selected = reserveChartAdjustedValue(selectedBase);
    const selectedDelta = selected - selectedBase;
    const selectedCategory = reserveChartHighlightId ? reserveHighlightedPositionCategory() : null;
    const income = row.plannedIncome + (selectedCategory === "income" ? selectedDelta : 0);
    const expense =
      Math.max(0, row.plannedOutflow - reserves - savings) * factors.expense +
      (selectedCategory === "expense" ? selectedDelta : 0);
    const displayReserve = reserves + (selectedCategory === "reserve" ? selectedDelta : 0);
    const displaySavings = savings * factors.savings + (selectedCategory === "savings" ? selectedDelta : 0);
    return {
      month: row.month,
      income: Math.max(0, income),
      expense: Math.max(0, expense),
      reserve: Math.max(0, displayReserve),
      savings: Math.max(0, displaySavings),
      selected
    };
  });
  const totals = months.reduce(
    (sum, month) => ({
      income: sum.income + month.income,
      expense: sum.expense + month.expense,
      reserve: sum.reserve + month.reserve,
      savings: sum.savings + month.savings,
      remaining: sum.remaining + month.income - month.expense - month.reserve - month.savings
    }),
    { income: 0, expense: 0, reserve: 0, savings: 0, remaining: 0 }
  );
  const maxValue = Math.max(
    1,
    ...months.flatMap((month) => [month.income, month.expense, month.reserve, month.savings, month.selected])
  );

  return {
    months,
    totals,
    maxValue,
    positions: reserveChartPositions(),
    insight: reserveChartInsight(totals, summary)
  };
}

function reserveChartGraphic(model: ReserveChartModel): string {
  return reserveChartStyle === "pie" ? reservePieChart(model) : reserveBarChart(model);
}

function reserveBarChart(model: ReserveChartModel): string {
  return `
    <div class="reserve-chart-plot" aria-label="Monatsvergleich">
      ${model.months
        .map(
          (month) => `
        <div class="reserve-chart-month">
          <div class="reserve-chart-bars">
            ${reserveChartBar("income", month.income, model.maxValue)}
            ${reserveChartBar("expense", month.expense, model.maxValue)}
            ${reserveChartBar("reserve", month.reserve, model.maxValue)}
            ${reserveChartBar("savings", month.savings, model.maxValue)}
            ${month.selected > 0 ? reserveChartSelectedBar(month.selected, model.maxValue) : ""}
          </div>
          <span>${escapeHtml(month.month.slice(0, 3))}</span>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function reservePieChart(model: ReserveChartModel): string {
  const segments = reservePieSegments(model.totals);
  const savingsRate = model.totals.income > 0 ? model.totals.savings / model.totals.income : 0;
  const background = reservePieBackground(segments);
  return `
    <div class="reserve-pie-layout" aria-label="Kreisdiagramm">
      <div class="reserve-pie" style="background: ${background}">
        <div class="reserve-pie-center">
          <span>Einnahmen</span>
          <strong>${money(model.totals.income)}</strong>
          <small>Sparquote ${percent(savingsRate * 100)}</small>
        </div>
      </div>
      <div class="reserve-pie-details">
        ${reservePieField("income", "Einnahmen", model.totals.income, "Bezugswert")}
        ${reservePieField("expense", "Ausgaben", model.totals.expense, "Anteil am Einkommen")}
        ${reservePieField("reserve", "Ruecklagen", model.totals.reserve, "Anteil am Einkommen")}
        ${reservePieField("savings", "Sparrate", model.totals.savings, `Sparquote ${percent(savingsRate * 100)}`)}
        ${reservePieField(
          model.totals.remaining >= 0 ? "remaining" : "deficit",
          model.totals.remaining >= 0 ? "Uebrig" : "Fehlbetrag",
          Math.abs(model.totals.remaining),
          model.totals.remaining >= 0 ? "freier Spielraum" : "Optimierungsbedarf"
        )}
      </div>
    </div>
  `;
}

function reservePieSegments(totals: ReserveChartTotals): Array<{ key: string; value: number; color: string }> {
  const remaining = Math.max(0, totals.remaining);
  const deficit = Math.max(0, -totals.remaining);
  return [
    { key: "expense", value: totals.expense, color: "var(--danger)" },
    { key: "reserve", value: totals.reserve, color: "var(--reserve)" },
    { key: "savings", value: totals.savings, color: "var(--accent)" },
    { key: "remaining", value: remaining, color: "var(--good)" },
    { key: "deficit", value: deficit, color: "var(--gold)" }
  ].filter((segment) => segment.value > 0.01);
}

function reservePieBackground(segments: Array<{ key: string; value: number; color: string }>): string {
  if (!segments.length) return "var(--surface-muted)";
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let cursor = 0;
  const stops = segments.map((segment) => {
    const start = cursor;
    cursor += (segment.value / total) * 360;
    return `${segment.color} ${start.toFixed(1)}deg ${cursor.toFixed(1)}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

function reservePieField(key: string, label: string, value: number, detail: string): string {
  const action =
    key === "income" || key === "expense" || key === "reserve" || key === "savings"
      ? `data-action="set-reserve-chart-category-${key}"`
      : "";
  const active =
    key === reserveChartCategory || (key === "remaining" && reserveChartCategory === "all") ? " active" : "";
  return `
    <button class="reserve-pie-field ${escapeHtml(key)}${active}" type="button" ${action}>
      <span>${escapeHtml(label)}</span>
      <strong>${money(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </button>
  `;
}

function reserveChartScenarioFactors(): { expense: number; savings: number } {
  if (reserveChartScenario === "lowerExpenses") return { expense: 0.9, savings: 1 };
  if (reserveChartScenario === "raiseSavings") return { expense: 1, savings: 1.1 };
  if (reserveChartScenario === "balanced") return { expense: 0.9, savings: 1.1 };
  return { expense: 1, savings: 1 };
}

function reserveChartInsight(totals: ReserveChartTotals, summary: ReturnType<typeof calculateReserveSummary>): string {
  const savingsRate = totals.income > 0 ? totals.savings / totals.income : 0;
  if (reserveChartScenario !== "current") {
    const delta = totals.remaining - summary.yearlyRemaining;
    return `Szenario nur fuer diese Grafik: Jahresrest ${money(totals.remaining)} (${delta >= 0 ? "+" : ""}${money(
      delta
    )} gegenueber Ist).`;
  }
  if (reserveChartHighlightId && reserveChartAdjustment !== "none") {
    return `Markierte Position wird nur in dieser Grafik simuliert. Neuer Jahresrest: ${money(totals.remaining)}.`;
  }
  if (totals.income <= 0) return "Keine Einnahmen im Jahr: zuerst Einnahmepositionen pruefen oder ergaenzen.";
  if (totals.remaining < 0) {
    return `Jahresrest ist negativ. Markiere die groessten Ausgaben und teste das Szenario Ausgaben -10%.`;
  }
  if (savingsRate < 0.15) {
    return `Sparquote ${percent(savingsRate * 100)}. Pruefe, ob freie Reste oder grosse Ausgaben in Sparen verschoben werden koennen.`;
  }
  return `Sparquote ${percent(savingsRate * 100)} bei ${money(totals.remaining)} freiem Jahresrest. Optimierung: schwache Monate gezielt ausgleichen.`;
}

function reserveChartPositions(): ReserveChartPosition[] {
  return state.positions
    .map((position) => {
      const category = reservePositionCategory(position);
      const total = reservePositionYearValue(position);
      return { id: position.id, name: position.name, icon: normalizePositionIcon(position.icon), total, category };
    })
    .filter((position) => position.total > 0.01)
    .filter((position) => reserveChartCategory === "all" || position.category === reserveChartCategory)
    .sort((first, second) => second.total - first.total)
    .slice(0, 9);
}

function reservePositionCategory(position: ReservePosition): Exclude<ReserveChartCategory, "all"> {
  if (isIncomePosition(position)) return "income";
  if (position.type === "reserve") return "reserve";
  if (position.type === "savings") return "savings";
  return "expense";
}

function reserveHighlightedPositionCategory(): Exclude<ReserveChartCategory, "all"> | null {
  const position = state.positions.find((item) => item.id === reserveChartHighlightId);
  return position ? reservePositionCategory(position) : null;
}

function reservePositionYearValue(position: ReservePosition): number {
  let total = 0;
  for (let month = 1; month <= 12; month += 1) {
    total += reservePositionMonthValue(position.id, month);
  }
  return total;
}

function reservePositionMonthValue(positionId: string, month: number): number {
  const position = state.positions.find((item) => item.id === positionId);
  if (!position) return 0;
  if (isIncomePosition(position)) {
    return calculatePlannedIncomeForSingleMonth(position, state.settings.year, month);
  }
  return calculatePlannedOutflowForSingleMonth(position, state.settings.year, month);
}

function reserveChartAdjustedValue(value: number): number {
  if (reserveChartAdjustment === "down10") return value * 0.9;
  if (reserveChartAdjustment === "up10") return value * 1.1;
  return value;
}

function reserveChartToggle(
  group: "category" | "scenario" | "adjustment" | "style",
  value: string,
  label: string,
  activeValue: string
): string {
  return `
    <button
      class="reserve-chart-toggle ${value === activeValue ? "active" : ""}"
      type="button"
      data-action="set-reserve-chart-${group}-${value}"
      aria-pressed="${value === activeValue}"
    >${escapeHtml(label)}</button>
  `;
}

function reserveChartStat(label: string, value: number, tone: string): string {
  return `
    <div class="reserve-chart-stat ${escapeHtml(tone)}">
      <span>${escapeHtml(label)}</span>
      <strong>${money(value)}</strong>
    </div>
  `;
}

function reserveChartBar(category: Exclude<ReserveChartCategory, "all">, value: number, maxValue: number): string {
  const height = reserveChartBarHeight(value, maxValue);
  const muted = reserveChartCategory !== "all" && reserveChartCategory !== category ? " muted" : "";
  return `<i class="reserve-chart-bar ${category}${muted}" style="height: ${height}%"></i>`;
}

function reserveChartSelectedBar(value: number, maxValue: number): string {
  return `<i class="reserve-chart-bar selected" style="height: ${reserveChartBarHeight(value, maxValue)}%"></i>`;
}

function reserveChartBarHeight(value: number, maxValue: number): number {
  return Math.round(clamp((value / Math.max(1, maxValue)) * 100, 2, 100));
}

function reserveChartPositionButton(position: ReserveChartPosition): string {
  const active = reserveChartHighlightId === position.id;
  return `
    <button
      class="reserve-chart-position ${position.category} ${active ? "active" : ""}"
      type="button"
      data-action="highlight-reserve-position"
      data-reserve-position-id="${escapeHtml(position.id)}"
      aria-pressed="${active}"
    >
      <span class="reserve-chart-position-title">
        ${positionIconSvg(position.icon)}
        <span>${escapeHtml(position.name)}</span>
      </span>
      <strong>${money(position.total)}</strong>
      <small>${labelForType(state.positions.find((item) => item.id === position.id)?.type || "temporary")}</small>
    </button>
  `;
}

function renderInvestmentIncludeList(summary: ReturnType<typeof calculateReserveSummary>): void {
  const list = document.querySelector<HTMLDivElement>("#investmentIncludeList");
  if (!list) return;

  const depot = activeInvestmentDepot();
  const settings = depotInvestmentSettings(depot);
  const otherDepots = otherInvestmentDepots(depot);
  const blockedInterestDepot = otherDepots.find((item) => depotInvestmentSettings(item).includeAccountInterest);
  const blockedCashbackDepot = otherDepots.find((item) => depotInvestmentSettings(item).includeAccountCashback);
  const interestButton = document.querySelector<HTMLButtonElement>("[data-action='toggle-interest-investment']");
  if (interestButton) {
    const blocked = Boolean(blockedInterestDepot);
    interestButton.classList.toggle("active", settings.includeAccountInterest);
    interestButton.disabled = blocked;
    interestButton.classList.toggle("blocked", blocked);
    interestButton.setAttribute("aria-pressed", String(settings.includeAccountInterest));
  }
  const cashbackButton = document.querySelector<HTMLButtonElement>("[data-action='toggle-cashback-investment']");
  if (cashbackButton) {
    const blocked = Boolean(blockedCashbackDepot);
    cashbackButton.classList.toggle("active", settings.includeAccountCashback);
    cashbackButton.disabled = blocked;
    cashbackButton.classList.toggle("blocked", blocked);
    cashbackButton.setAttribute("aria-pressed", String(settings.includeAccountCashback));
  }
  setText(
    "interestInvestmentAmount",
    blockedInterestDepot
      ? `belegt im ${depotLabel(blockedInterestDepot)}`
      : `${money(summary.totalInterest)} jaehrlich aus Jahrestabelle`
  );
  setText(
    "cashbackInvestmentAmount",
    blockedCashbackDepot
      ? `belegt im ${depotLabel(blockedCashbackDepot)}`
      : `${money(summary.totalCashback)} jaehrlich aus Jahrestabelle`
  );

  const savingsPositions = selectedInvestmentPlanningAccount().yearlyRows.filter(
    (position) => position.active && position.type === "savings" && positionFlow(position) === "expense"
  );
  if (!savingsPositions.length) {
    list.innerHTML = `<div class="include-empty">Keine Sparrate angelegt.</div>`;
    return;
  }

  const blockedPositionIds = new Set(otherDepots.flatMap((item) => depotInvestmentSettings(item).includedIds));
  const blockedRealEstateIds = realEstateSelectedSourceIds();
  const visibleSavingsPositions = savingsPositions.filter(
    (position) => !blockedPositionIds.has(position.id) || settings.includedIds.includes(position.id)
  );
  if (!visibleSavingsPositions.length) {
    list.innerHTML = `<div class="include-empty">Alle Sparraten sind in anderen Depots eingeplant.</div>`;
    return;
  }

  list.innerHTML = visibleSavingsPositions
    .map((position) => {
      const checked = settings.includedIds.includes(position.id) ? "checked" : "";
      const blockedByRealEstate = blockedRealEstateIds.has(position.id);
      const disabled = blockedByRealEstate ? "disabled" : "";
      const blockedClass = blockedByRealEstate ? "blocked" : "";
      const subtitle = blockedByRealEstate ? "belegt in Immobilienfinanzierung" : investmentPositionSubtitle(position);
      return `
        <label class="include-item ${blockedClass}">
          <input type="checkbox" data-include-position="${position.id}" ${checked} ${disabled} />
          <span class="include-icon">${positionIconSvg(normalizePositionIcon(position.icon))}</span>
          <span>
            <span class="include-name">${escapeHtml(position.name)}</span>
            <span class="include-amount">${escapeHtml(subtitle)}</span>
          </span>
        </label>
      `;
    })
    .join("");
}

function investmentPositionSubtitle(position: ReservePosition): string {
  const amount = investmentPositionAmountText(position);
  return `${amount} | ${labelForType(position.type)} | Abgang ${labelForPayout(position.payoutType, positionFlow(position))}`;
}

function investmentPositionAmountText(position: ReservePosition): string {
  if (position.payoutType === "once") {
    return `${money(position.amount)} einmalig (${monthName(position.payoutMonth)} ${intNumber(position.payoutYear)})`;
  }
  const startText =
    position.type === "savings" ? ` ab ${monthName(position.startMonth)} ${intNumber(position.payoutYear)}` : "";
  if (position.payoutType === "yearly") {
    return `${money(position.amount)} jaehrlich (${monthName(position.payoutMonth)})${startText}`;
  }
  return `${money(position.amount)} monatlich${startText}`;
}

function renderRealEstateSourceLists(): void {
  renderRealEstateSourceList("equityCapital", "#realEstateEquityCapitalSourceList");
  renderRealEstateSourceList("monthlyPayment", "#realEstateMonthlyPaymentSourceList");
  renderRealEstateSourceList("specialRepayment", "#realEstateSpecialRepaymentSourceList");

  const withdrawalProfiles = realEstateWithdrawalProfiles();
  const monthlyWithdrawalGain = withdrawalProfiles.reduce((sum, profile) => sum + profile.withdrawalGainMonthly, 0);
  const savingsRateProfiles = withdrawalProfiles.filter((profile) => profile.depotSavingsRateAvailable);
  const monthlyDepotSavingsRate = savingsRateProfiles.reduce((sum, profile) => sum + profile.depotSavingsRateMonthly, 0);
  const withdrawalAccountLabel = withdrawalProfiles.length
    ? ` aus ${intNumber(withdrawalProfiles.length)} Konto${withdrawalProfiles.length === 1 ? "" : "en"}`
    : "";

  const toggle = document.querySelector<HTMLButtonElement>("[data-action='toggle-real-estate-withdrawal-gain-source']");
  if (toggle) {
    toggle.classList.toggle("active", state.realEstate.includeWithdrawalGainAsPaymentSource);
    toggle.setAttribute("aria-pressed", String(state.realEstate.includeWithdrawalGainAsPaymentSource));
  }
  setText(
    "realEstateWithdrawalGainSourceAmount",
    `${money(monthlyWithdrawalGain)} monatlich${withdrawalAccountLabel}`
  );

  const savingsRateToggle = document.querySelector<HTMLButtonElement>(
    "[data-action='toggle-real-estate-depot-savings-rate-source']"
  );
  const savingsRateAvailable = savingsRateProfiles.length > 0 && monthlyDepotSavingsRate > 0;
  const savingsRateActive = state.realEstate.repaymentSources.useDepotSavingsRateAsRepayment && savingsRateAvailable;
  if (savingsRateToggle) {
    savingsRateToggle.classList.toggle("active", savingsRateActive);
    savingsRateToggle.classList.toggle("blocked", !savingsRateAvailable);
    savingsRateToggle.disabled = !savingsRateAvailable;
    savingsRateToggle.setAttribute("aria-pressed", String(savingsRateActive));
  }
  setText(
    "realEstateDepotSavingsRateSourceAmount",
    savingsRateAvailable
      ? `${money(monthlyDepotSavingsRate)} monatlich aus ${intNumber(savingsRateProfiles.length)} Konto${
          savingsRateProfiles.length === 1 ? "" : "en"
        }`
      : "nicht verfuegbar"
  );
}

function renderRealEstateSourceList(kind: RealEstatePaymentSourceKind, selector: string): void {
  const host = document.querySelector<HTMLDivElement>(selector);
  if (!host) return;

  const savingsPositions = selectedRealEstateSourceAccounts().flatMap((account) =>
    account.yearlyRows
      .filter((position) => {
        return (
          position.active &&
          position.type === "savings" &&
          positionFlow(position) === "expense" &&
          (kind === "equityCapital"
            ? position.payoutType === "once"
            : kind === "specialRepayment" || position.payoutType !== "once")
        );
      })
      .map((position) => ({ accountName: account.name, position }))
  );

  if (!savingsPositions.length) {
    host.innerHTML = `
      <div class="include-empty">Keine passende Sparposition angelegt.</div>
      <button class="button secondary" type="button" data-action="add-real-estate-savings-source-${kind}">
        Sparposition anlegen
      </button>
    `;
    return;
  }

  const selectedIds = new Set(realEstateSourceIds(kind));
  const financingStartYear = currentRealEstateFinancingStartYear();
  const blockedByOtherRealEstate = otherRealEstateSourceKinds(kind).reduce((blockedIds, otherKind) => {
    for (const id of realEstateSourceIds(otherKind)) blockedIds.add(id);
    return blockedIds;
  }, new Set<string>());

  host.innerHTML = savingsPositions
    .map(({ accountName, position }) => {
      const blockedDepot = blockedInvestmentDepotForPosition(position.id);
      const blockedByRealEstate = blockedByOtherRealEstate.has(position.id);
      const blockedByTiming = kind === "equityCapital" && position.payoutYear > financingStartYear;
      const blocked = Boolean(blockedDepot) || blockedByRealEstate || blockedByTiming;
      const checked = selectedIds.has(position.id) ? "checked" : "";
      const disabled = blocked ? "disabled" : "";
      const blockedText = blockedDepot
        ? `belegt im ${depotLabel(blockedDepot)}`
        : blockedByRealEstate
          ? "bereits in anderer Immobilienquelle"
          : blockedByTiming
            ? `erst nach Finanzierungsstart ${financingStartYear} verfuegbar`
            : `${realEstatePositionSubtitle(position)} | Konto ${accountName}`;
      return `
        <label class="include-item ${blocked ? "blocked" : ""}">
          <input
            type="checkbox"
            data-real-estate-source-kind="${kind}"
            data-real-estate-source-position="${position.id}"
            ${checked}
            ${disabled}
          />
          <span class="include-icon">${positionIconSvg(normalizePositionIcon(position.icon))}</span>
          <span>
            <span class="include-name">${escapeHtml(position.name)} <span class="muted">(${escapeHtml(accountName)})</span></span>
            <span class="include-amount">${escapeHtml(blockedText)}</span>
          </span>
        </label>
      `;
    })
    .join("");
}

function realEstatePositionSubtitle(position: ReservePosition): string {
  return `${investmentPositionAmountText(position)} | ${labelForType(position.type)}`;
}

function realEstateSourceIds(kind: RealEstatePaymentSourceKind): string[] {
  if (kind === "equityCapital") return state.realEstate.equityCapitalSourceIds;
  if (kind === "monthlyPayment") return state.realEstate.monthlyPaymentSourceIds;
  return state.realEstate.specialRepaymentSourceIds;
}

function realEstateSelectedSourceIds(): Set<string> {
  return new Set([
    ...state.realEstate.equityCapitalSourceIds,
    ...state.realEstate.monthlyPaymentSourceIds,
    ...state.realEstate.specialRepaymentSourceIds
  ]);
}

function otherRealEstateSourceKinds(kind: RealEstatePaymentSourceKind): RealEstatePaymentSourceKind[] {
  return (["equityCapital", "monthlyPayment", "specialRepayment"] as RealEstatePaymentSourceKind[]).filter(
    (item) => item !== kind
  );
}

function realEstateSourceField(kind: RealEstatePaymentSourceKind): keyof RealEstateFinancingSettings {
  if (kind === "equityCapital") return "equityCapitalSourceIds";
  if (kind === "monthlyPayment") return "monthlyPaymentSourceIds";
  return "specialRepaymentSourceIds";
}

function blockedInvestmentDepotForPosition(positionId: string): InvestmentDepotKey | null {
  return INVESTMENT_DEPOTS.find((depot) => depotInvestmentSettings(depot).includedIds.includes(positionId)) ?? null;
}

function expenseDateCells(position: ReservePosition): string {
  if (position.type === "savings") return savingsDateCells(position);
  if (position.type === "fixed") return monthRangeDateCells(position);

  if (position.payoutType === "once") {
    return `
      <td class="once-year-label">Abgangsjahr</td>
      <td>
        <input class="small-input payout-year-input" type="number" min="2000" max="2200" step="1" value="${
          position.payoutYear
        }" data-position-id="${position.id}" data-position-field="payoutYear" />
      </td>
    `;
  }
  return monthRangeDateCells(position);
}

function monthRangeDateCells(position: ReservePosition): string {
  return `
    <td>${monthSelect(position.id, "startMonth", position.startMonth)}</td>
    <td>${monthSelect(position.id, "endMonth", position.endMonth)}</td>
  `;
}

function savingsDateCells(position: ReservePosition): string {
  return `
    <td>
      <div class="date-detail-cell">
        <input class="small-input payout-year-input" type="number" min="2000" max="2200" step="1" value="${
          position.payoutYear
        }" data-position-id="${position.id}" data-position-field="payoutYear" />
      </div>
    </td>
    <td>
      <div class="date-detail-cell">
        ${monthSelect(position.id, "startMonth", position.startMonth)}
      </div>
    </td>
  `;
}

function incomeDateCells(position: ReservePosition): string {
  const disabled = position.payoutType === "once";
  return `
    <td>${monthSelect(position.id, "startMonth", position.startMonth, disabled)}</td>
    <td>${monthSelect(position.id, "endMonth", position.endMonth, disabled)}</td>
    <td>
      <input class="small-input payout-year-input" type="number" min="2000" max="2200" step="1" value="${
        position.payoutYear
      }" data-position-id="${position.id}" data-position-field="payoutYear" />
    </td>
  `;
}

function syncAllInputsFromState(): void {
  for (const key of Object.keys(state.settings) as Array<keyof PlanningSettings>) {
    setInputValue(`[data-setting="${key}"]`, state.settings[key]);
  }
  syncRealEstateInputsFromState();
  syncCombinedToggleInputsFromState();
  syncInvestmentInputsFromState();
  syncThemeControls();
}

function syncInvestmentInputsFromState(): void {
  syncInvestmentInputBounds();
  const depot = activeInvestmentDepot();
  const settings = depotInvestmentSettings(depot);
  for (const key of inputInvestmentFields()) {
    setInputValue(`[data-investment="${key}"]`, settings[key]);
  }
  setInputValue("[data-retirement-age]", calculatePayoutStartAge(settings));
  syncInvestmentDepotTabs();
  syncRetirementDepotControls();
}

function syncInvestmentInputBounds(): void {
  const depot = activeInvestmentDepot();
  const settings = depotInvestmentSettings(depot);
  const retirementAge = calculatePayoutStartAge(settings);
  const chartStartAge = settings.chartStartAge;
  const retirementMin = RETIREMENT_DEPOT_MIN_AGE;
  const retirementMax = retirementAgeMaxForPayoutEndAge(settings.payoutEndAge);
  setInputBounds(
    '[data-investment="birthYear"]',
    depot === "child" ? childBirthYearMin() : investmentMin("birthYear"),
    depot === "child" ? state.settings.year : investmentMax("birthYear")
  );
  setInputBounds(
    '[data-investment="chartStartAge"]',
    investmentMin("chartStartAge"),
    Math.min(investmentMax("chartStartAge"), retirementAge)
  );
  setInputBounds('[data-investment="percentageWithdrawalStartAge"]', chartStartAge, retirementAge);
  setInputBounds("[data-retirement-age]", retirementMin, retirementMax);
  setInputBounds(
    '[data-investment="childPayoutAge"]',
    investmentMin("childPayoutAge"),
    investmentMax("childPayoutAge")
  );
}

function syncRetirementDepotControls(): void {
  const depot = activeInvestmentDepot();
  const isStandard = depot === "standard";
  const isRetirement = depot === "retirement";
  const isChild = depot === "child";
  syncDepotScopedInvestmentFields(depot);
  setSectionHidden("#retirementDepotFunding", !isRetirement);
  setDetailLineHidden("detailAllowance", !isRetirement);
  setDetailLineHidden("detailAllowanceBasis", !isRetirement);
  setDetailLineHidden("detailPercentageWithdrawalStartAge", !isStandard);
  setDetailLineHidden("detailPercentageWithdrawalRate", !isStandard);
  setDetailLineHidden("detailPercentageWithdrawalMonthly", !isStandard);
  setDetailLineHidden("detailPercentageWithdrawalAnnual", !isStandard);
  setDetailLineHidden("detailMonthlyPension", isChild);
  setDetailLineHidden("detailRealMonthlyPension", isChild);
  setDetailLineHidden("detailBequestReserve", isChild);
  setSectionHidden("#combinedInvestmentCard", isChild);
  setSectionHidden("#monthlyPensionMetricCard", isChild);
}

function syncInvestmentDepotTabs(): void {
  const active = activeInvestmentDepot();
  for (const depot of INVESTMENT_DEPOTS) {
    const button = document.querySelector<HTMLButtonElement>(`[data-action="set-investment-depot-${depot}"]`);
    if (!button) continue;
    button.classList.toggle("active", depot === active);
    button.setAttribute("aria-pressed", String(depot === active));
  }
  setText(
    "investmentActiveDepotTitle",
    active === "child"
      ? "Anlageentwicklung Kinderdepot"
      : active === "retirement"
        ? "Anlageentwicklung Altersvorsorgedepot"
        : "Anlageentwicklung Depot"
  );
}

function syncRealEstateInputsFromState(): void {
  if (state.realEstate.locale !== "de") {
    state.realEstate = { ...state.realEstate, locale: "de" };
  }
  const realEstate = state.realEstate;
  syncRealEstateLocaleLabels("de");

  for (const [field, value] of Object.entries(realEstate)) {
    const selector = `[data-real-estate-field="${field}"]`;
    if (field === "specialRepaymentRhythm") {
      const control = document.querySelector<HTMLSelectElement>(selector);
      if (control) control.value = String(value);
      continue;
    }
    if (
      field === "locale" ||
      field === "repaymentSources" ||
      field === "equityCapitalSourceIds" ||
      field === "monthlyPaymentSourceIds" ||
      field === "specialRepaymentSourceIds" ||
      field === "includeWithdrawalGainAsPaymentSource"
    ) {
      continue;
    }
    if (value === null) {
      const control = document.querySelector<HTMLInputElement>(selector);
      if (control) control.value = "";
      continue;
    }
    setInputValue(selector, value as number | string);
  }

  const ranges: Array<RealEstateField> = ["interestRatePercent"];
  for (const field of ranges) {
    setInputValue(`[data-real-estate-range="${field}"]`, state.realEstate[field] as number);
  }

  setText("realEstateInterestRatePercentValue", percent(realEstate.interestRatePercent));
}

function syncRealEstateLocaleLabels(locale: RealEstateFinancingSettings["locale"]): void {
  for (const label of document.querySelectorAll<HTMLElement>("[data-real-estate-label-key]")) {
    const de = label.dataset.labelDe ?? label.textContent ?? "";
    const en = label.dataset.labelEn ?? de;
    label.textContent = locale === "en" ? en : de;
  }
}

function syncCombinedToggleInputsFromState(): void {
  for (const [key, value] of Object.entries(state.combinedWealth) as Array<[CombinedToggleKey, boolean]>) {
    const control = document.querySelector<HTMLElement>(`[data-combined-toggle="${key}"]`);
    if (!control) continue;
    if (control instanceof HTMLInputElement) {
      control.checked = value;
      continue;
    }
    control.classList.toggle("active", value);
    control.setAttribute("aria-pressed", String(value));
    const status = control.querySelector<HTMLElement>("[data-combined-toggle-status]");
    if (status) status.textContent = value ? "Aktiv" : "Aus";
  }
}

function updateRealEstateField(field: RealEstateField, value: string): void {
  if (
    field === "locale" ||
    field === "repaymentSources" ||
    field === "equityCapitalSourceIds" ||
    field === "monthlyPaymentSourceIds" ||
    field === "specialRepaymentSourceIds" ||
    field === "includeWithdrawalGainAsPaymentSource"
  ) {
    return;
  }
  if (field === "specialRepaymentRhythm") {
    if (value === "none" || value === "monthly" || value === "yearly") {
      state.realEstate = {
        ...state.realEstate,
        specialRepaymentRhythm: value as RealEstateFinancingSettings["specialRepaymentRhythm"]
      };
    }
    return;
  }

  const nullableFields = new Set<RealEstateField>([
    "plannedSaleYear",
    "estimatedSaleValue",
    "targetFullRepaymentYear",
    "manualFuturePropertyValue"
  ]);
  const parsed = numberValue(value);
  const nextRealEstate = {
    ...state.realEstate,
    [field]: nullableFields.has(field) && value.trim() === "" ? null : Math.max(0, parsed)
  } as RealEstateFinancingSettings;
  state.realEstate = nextRealEstate;
  resetRealEstateDetailSelection();
}

function updateCombinedToggle(key: CombinedToggleKey, checked: boolean): void {
  state.combinedWealth = {
    ...state.combinedWealth,
    [key]: checked
  } as AppState["combinedWealth"];
}

function toggleCombinedModule(key: CombinedToggleKey | undefined): void {
  if (!key || !(key in state.combinedWealth)) return;
  updateCombinedToggle(key, !state.combinedWealth[key]);
}

function toggleRealEstateSourcePosition(kind: RealEstatePaymentSourceKind, id: string, checked: boolean): void {
  if (checked && blockedInvestmentDepotForPosition(id)) return;
  if (checked && otherRealEstateSourceKinds(kind).some((otherKind) => realEstateSourceIds(otherKind).includes(id))) return;

  const currentIds = new Set(realEstateSourceIds(kind));
  if (checked) currentIds.add(id);
  else currentIds.delete(id);

  state.realEstate = {
    ...state.realEstate,
    [realEstateSourceField(kind)]: Array.from(currentIds)
  };
  resetRealEstateDetailSelection();
}

function toggleRealEstateWithdrawalGainSource(): void {
  state.realEstate = {
    ...state.realEstate,
    includeWithdrawalGainAsPaymentSource: !state.realEstate.includeWithdrawalGainAsPaymentSource
  };
  resetRealEstateDetailSelection();
  renderAll();
}

function toggleRealEstateDepotSavingsRateSource(): void {
  state.realEstate = {
    ...state.realEstate,
    repaymentSources: {
      ...state.realEstate.repaymentSources,
      useDepotSavingsRateAsRepayment: !state.realEstate.repaymentSources.useDepotSavingsRateAsRepayment
    }
  };
  resetRealEstateDetailSelection();
  renderAll();
}

function addRealEstateSavingsSource(kind: RealEstatePaymentSourceKind): void {
  setActiveSection("cost_reserve_positions");
  selectedPositionMode = "savings";
  const id = addPosition();
  const activeAccountId = activePlanningAccount().id;
  const selectedIds = Array.from(new Set([...state.ui.selectedRealEstateAccountIds, activeAccountId]));
  state.ui = {
    ...state.ui,
    selectedRealEstateAccountIds: selectedIds,
    selectedRealEstateWithdrawalGainAccountIds: selectedIds
  };
  if (kind === "equityCapital") {
    const financingStartYear = currentRealEstateFinancingStartYear();
    state.positions = state.positions.map((position) =>
      position.id === id
        ? sanitizePosition(
            {
              ...position,
              name: "Eigenkapital Immobilie",
              payoutType: "once",
              payoutYear: financingStartYear,
              payoutMonth: 1,
              payoutDay: 1
            },
            state.settings.year
          )
        : position
    );
  }
  toggleRealEstateSourcePosition(kind, id, true);
  renderAll();
}

function setSelectedRealEstateYear(year: number): void {
  selectedRealEstateYear = Number.isFinite(year) && year > 0 ? year : null;
  renderAll();
}

function resetRealEstateDetailSelection(): void {
  selectedRealEstateYear = null;
}

function setSelectedCombinedWealthYear(year: number): void {
  selectedCombinedWealthYear = Number.isFinite(year) && year > 0 ? year : null;
  renderAll();
}

function toggleSettingsGrunddaten(): void {
  state.ui = { ...state.ui, settingsGrunddatenExpanded: !state.ui.settingsGrunddatenExpanded };
  syncSettingsAccordionState();
  saveState(state);
}

function syncSettingsAccordionState(): void {
  const content = document.querySelector<HTMLDivElement>("#grunddatenSettingsContent");
  const button = document.querySelector<HTMLButtonElement>("[data-action='toggle-settings-grunddaten']");
  if (content) content.hidden = !state.ui.settingsGrunddatenExpanded;
  if (button) button.setAttribute("aria-expanded", String(state.ui.settingsGrunddatenExpanded));
}

function updatePlanningSetting(field: keyof PlanningSettings, value: string): void {
  state.settings = {
    ...state.settings,
    [field]: clamp(numberValue(value), settingMin(field), settingMax(field))
  };
}

function updateInvestmentSetting(field: keyof InvestmentSettings, value: string): void {
  if (!isNumericInvestmentSetting(field)) return;
  const depot = activeInvestmentDepot();
  if (field === "payoutEndAge") {
    updateSharedPayoutEndAge(value);
    return;
  }

  updateDepotInvestmentSettings(depot, numericInvestmentPatch(field, numericInvestmentValue(field, value)));
  normalizeInvestmentBounds();
}

function updateSharedPayoutEndAge(value: string): void {
  const payoutEndAge = clamp(numberValue(value), investmentMin("payoutEndAge"), investmentMax("payoutEndAge"));
  const retirementAge = clampRetirementAge(currentSharedRetirementAge(), payoutEndAge);
  const payoutYears = payoutYearsForRetirementAge(payoutEndAge, retirementAge);
  state.investment = {
    ...state.investment,
    payoutEndAge,
    retirementPayoutEndAge: payoutEndAge,
    payoutYears,
    retirementPayoutYears: payoutYears
  };
  normalizeInvestmentBounds();
}

function currentSharedRetirementAge(): number {
  return Math.max(
    RETIREMENT_DEPOT_MIN_AGE,
    calculatePayoutStartAge(depotInvestmentSettings("standard")),
    calculatePayoutStartAge(depotInvestmentSettings("retirement"))
  );
}

function clampRetirementAge(retirementAge: number, payoutEndAge: number): number {
  return clamp(retirementAge, RETIREMENT_DEPOT_MIN_AGE, retirementAgeMaxForPayoutEndAge(payoutEndAge));
}

function retirementAgeMaxForPayoutEndAge(payoutEndAge: number): number {
  return Math.max(RETIREMENT_DEPOT_MIN_AGE, Math.min(85, payoutEndAge - investmentMin("payoutYears")));
}

function payoutYearsForRetirementAge(payoutEndAge: number, retirementAge: number): number {
  return clamp(payoutEndAge - retirementAge, investmentMin("payoutYears"), investmentMax("payoutYears"));
}

function isNumericInvestmentSetting(field: keyof InvestmentSettings): field is NumericInvestmentSetting {
  return inputInvestmentFields().includes(field as NumericInvestmentSetting);
}

function inputInvestmentFields(): NumericInvestmentSetting[] {
  return [
    "birthYear",
    "chartStartAge",
    "childPayoutAge",
    "payoutEndAge",
    "retirementDepotChildren",
    "percentageWithdrawalStartAge",
    "percentageWithdrawalRatePercent",
    "investmentReturnPercent",
    "capitalGainsTaxPercent",
    "inflationRatePercent",
    "bequestReservePercent"
  ];
}

function numericInvestmentValue(field: NumericInvestmentSetting, value: string): number {
  const min = field === "birthYear" && activeInvestmentDepot() === "child" ? childBirthYearMin() : investmentMin(field);
  const max = field === "birthYear" && activeInvestmentDepot() === "child" ? state.settings.year : investmentMax(field);
  const nextValue = clamp(numberValue(value), min, max);
  return field === "retirementDepotChildren" || field === "childPayoutAge" ? Math.floor(nextValue) : nextValue;
}

function childBirthYearMin(): number {
  return childBirthYearMinForPayoutAge(state.investment.childPayoutAge);
}

function childBirthYearMinForPayoutAge(payoutAge: number): number {
  return Math.max(investmentMin("birthYear"), state.settings.year - clampChildPayoutAge(payoutAge));
}

function clampChildPayoutAge(value: number): number {
  return clamp(value, investmentMin("childPayoutAge"), investmentMax("childPayoutAge"));
}

function numericInvestmentPatch(field: NumericInvestmentSetting, value: number): Partial<InvestmentSettings> {
  switch (field) {
    case "birthYear":
      return { birthYear: value };
    case "chartStartAge":
      return { chartStartAge: value };
    case "childPayoutAge":
      return { childPayoutAge: value };
    case "payoutEndAge":
      return { payoutEndAge: value };
    case "retirementDepotChildren":
      return { retirementDepotChildren: value };
    case "percentageWithdrawalStartAge":
      return { percentageWithdrawalStartAge: value };
    case "percentageWithdrawalRatePercent":
      return { percentageWithdrawalRatePercent: value };
    case "investmentReturnPercent":
      return { investmentReturnPercent: value };
    case "capitalGainsTaxPercent":
      return { capitalGainsTaxPercent: value };
    case "inflationRatePercent":
      return { inflationRatePercent: value };
    case "bequestReservePercent":
      return { bequestReservePercent: value };
  }
  return {};
}

function setInvestmentDepot(depot: InvestmentDepotKey): void {
  if (state.investment.activeDepot === depot) return;
  state.investment = {
    ...state.investment,
    activeDepot: depot
  };
  hideInvestmentChartPopup();
  renderAll();
}

function activeInvestmentDepot(): InvestmentDepotKey {
  return INVESTMENT_DEPOTS.includes(state.investment.activeDepot) ? state.investment.activeDepot : "standard";
}

function otherInvestmentDepots(depot: InvestmentDepotKey): InvestmentDepotKey[] {
  return INVESTMENT_DEPOTS.filter((item) => item !== depot);
}

function depotLabel(depot: InvestmentDepotKey): string {
  if (depot === "child") return "Kinderdepot";
  return depot === "standard" ? "Depot" : "Altersvorsorgedepot";
}

function depotInvestmentSettings(depot: InvestmentDepotKey): InvestmentSettings {
  return depotInvestmentSettingsForBase(depot, state.investment);
}

function depotInvestmentSettingsForAccount(depot: InvestmentDepotKey, accountId: string): InvestmentSettings {
  const settings = state.investmentByAccountId[accountId] ?? defaultInvestmentSettingsForNewAccount();
  return depotInvestmentSettingsForBase(depot, settings);
}

function depotInvestmentSettingsForBase(depot: InvestmentDepotKey, settings: InvestmentSettings): InvestmentSettings {
  if (depot === "standard") {
    return {
      ...settings,
      activeDepot: "standard",
      retirementDepotEnabled: false,
      retirementDepotChildren: 0
    };
  }

  if (depot === "child") {
    const childPayoutAge = clampChildPayoutAge(settings.childPayoutAge);
    return {
      ...settings,
      activeDepot: "child",
      includedIds: settings.childIncludedIds,
      includeAccountInterest: settings.childIncludeAccountInterest,
      includeAccountCashback: settings.childIncludeAccountCashback,
      retirementDepotEnabled: false,
      retirementDepotChildren: 0,
      birthYear: settings.childBirthYear,
      chartStartAge: settings.childChartStartAge,
      childPayoutAge,
      payoutEndAge: childPayoutAge,
      payoutYears: 0,
      percentageWithdrawalStartAge: childPayoutAge,
      percentageWithdrawalRatePercent: 0,
      investmentReturnPercent: settings.childInvestmentReturnPercent,
      capitalGainsTaxPercent: settings.childCapitalGainsTaxPercent,
      inflationRatePercent: settings.childInflationRatePercent,
      bequestReservePercent: settings.childBequestReservePercent
    };
  }

  return {
    ...settings,
    activeDepot: "retirement",
    retirementDepotEnabled: true,
    includedIds: settings.retirementIncludedIds,
    includeAccountInterest: settings.retirementIncludeAccountInterest,
    includeAccountCashback: settings.retirementIncludeAccountCashback,
    birthYear: settings.retirementBirthYear,
    chartStartAge: settings.retirementChartStartAge,
    payoutEndAge: settings.payoutEndAge,
    payoutYears: settings.retirementPayoutYears,
    percentageWithdrawalStartAge: settings.payoutEndAge - settings.retirementPayoutYears,
    percentageWithdrawalRatePercent: 0,
    investmentReturnPercent: settings.retirementInvestmentReturnPercent,
    capitalGainsTaxPercent: settings.retirementCapitalGainsTaxPercent,
    inflationRatePercent: settings.retirementInflationRatePercent,
    bequestReservePercent: settings.retirementBequestReservePercent
  };
}

function updateDepotInvestmentSettings(depot: InvestmentDepotKey, updates: Partial<InvestmentSettings>): void {
  const payoutEndAge = updates.payoutEndAge ?? state.investment.payoutEndAge;
  if (depot === "standard") {
    state.investment = {
      ...state.investment,
      ...updates,
      payoutEndAge,
      retirementPayoutEndAge: payoutEndAge
    };
    return;
  }

  if (depot === "child") {
    state.investment = {
      ...state.investment,
      childBirthYear: updates.birthYear ?? state.investment.childBirthYear,
      childChartStartAge: updates.chartStartAge ?? state.investment.childChartStartAge,
      childPayoutAge: updates.childPayoutAge ?? state.investment.childPayoutAge,
      childInvestmentReturnPercent:
        updates.investmentReturnPercent ?? state.investment.childInvestmentReturnPercent,
      childCapitalGainsTaxPercent:
        updates.capitalGainsTaxPercent ?? state.investment.childCapitalGainsTaxPercent,
      childInflationRatePercent: updates.inflationRatePercent ?? state.investment.childInflationRatePercent,
      childBequestReservePercent: updates.bequestReservePercent ?? state.investment.childBequestReservePercent
    };
    return;
  }

  state.investment = {
    ...state.investment,
    payoutEndAge,
    retirementDepotChildren: updates.retirementDepotChildren ?? state.investment.retirementDepotChildren,
    retirementBirthYear: updates.birthYear ?? state.investment.retirementBirthYear,
    retirementChartStartAge: updates.chartStartAge ?? state.investment.retirementChartStartAge,
    retirementPayoutEndAge: payoutEndAge,
    retirementPayoutYears: updates.payoutYears ?? state.investment.retirementPayoutYears,
    retirementInvestmentReturnPercent:
      updates.investmentReturnPercent ?? state.investment.retirementInvestmentReturnPercent,
    retirementCapitalGainsTaxPercent:
      updates.capitalGainsTaxPercent ?? state.investment.retirementCapitalGainsTaxPercent,
    retirementInflationRatePercent: updates.inflationRatePercent ?? state.investment.retirementInflationRatePercent,
    retirementBequestReservePercent:
      updates.bequestReservePercent ?? state.investment.retirementBequestReservePercent
  };
}

function updateRetirementAge(value: string): void {
  const payoutEndAge = state.investment.payoutEndAge;
  const retirementAge = clampRetirementAge(numberValue(value), payoutEndAge);
  const payoutYears = payoutYearsForRetirementAge(payoutEndAge, retirementAge);
  state.investment = {
    ...state.investment,
    retirementPayoutEndAge: payoutEndAge,
    payoutYears,
    retirementPayoutYears: payoutYears
  };
  normalizeInvestmentBounds();
}

function updatePosition(id: string, field: keyof ReservePosition, value: string | boolean): void {
  state.positions = state.positions.map((position) => {
    if (position.id !== id) return position;
    const next: ReservePosition = { ...position };

    switch (field) {
      case "active":
        next.active = Boolean(value);
        break;
      case "visible":
        next.visible = Boolean(value);
        break;
      case "interestBearing":
        next.interestBearing = positionFlow(next) === "expense" && next.payoutType !== "once" && Boolean(value);
        break;
      case "cashback":
        next.cashback = positionFlow(next) === "expense" && next.type === "temporary" && Boolean(value);
        break;
      case "amount":
      case "startMonth":
      case "endMonth":
      case "payoutYear":
      case "payoutMonth":
      case "payoutDay":
        next[field] = numberValue(String(value));
        break;
      case "type":
        if (isPositionType(value)) {
          next.type = value;
          next.flow = flowForType(value);
          if (next.flow === "income") {
            next.interestBearing = false;
            next.cashback = false;
            if (value === "incomeMonthly") next.payoutType = "monthly";
            if (value === "incomeYearly") next.payoutType = "yearly";
            if (value === "incomeTemporary" && next.payoutType === "none") next.payoutType = "monthly";
          }
          if (next.flow === "expense" && next.type !== "temporary") next.cashback = false;
        }
        break;
      case "payoutType":
        if (value === "none" || value === "monthly" || value === "yearly" || value === "once") {
          next.payoutType = positionFlow(next) === "income" && value === "none" ? "monthly" : value;
          if (next.payoutType === "once") {
            next.payoutYear = Number(next.payoutYear || state.settings.year);
            if (next.type !== "savings") {
              next.startMonth = next.payoutMonth;
              next.endMonth = next.payoutMonth;
            }
            next.interestBearing = false;
          }
        }
        break;
      case "name":
        next.name = String(value);
        break;
      case "icon":
        next.icon = normalizePositionIcon(value, defaultPositionIconForPosition(next));
        break;
      case "flow":
        if (value === "income" || value === "expense") {
          next.flow = value;
          next.type = value === "income" ? "incomeMonthly" : "temporary";
          next.icon = defaultPositionIconForPosition(next);
          next.interestBearing = false;
          next.cashback = false;
        }
        break;
      case "id":
        break;
    }

    if (next.type !== "savings" && next.startMonth > next.endMonth) {
      const startMonth = next.startMonth;
      next.startMonth = next.endMonth;
      next.endMonth = startMonth;
    }

    if (next.payoutType === "once") {
      if (next.type !== "savings") {
        next.startMonth = next.payoutMonth;
        next.endMonth = next.payoutMonth;
      }
      next.interestBearing = false;
    }

    if (positionFlow(next) === "income") {
      next.interestBearing = false;
      next.cashback = false;
      if (next.payoutType === "none") next.payoutType = "monthly";
    }

    return sanitizePosition(next, state.settings.year);
  });
}

function sanitizePosition(position: ReservePosition, fallbackYear: number): ReservePosition {
  const requestedFlow = positionFlow(position);
  const type = typeForFlow(position.type, requestedFlow);
  const flow = flowForType(type);
  const payoutType = normalizePayoutType(position.payoutType, flow, type);
  const payoutMonth = finiteIntegerInRange(position.payoutMonth, 1, 12, 12);
  let startMonth = finiteIntegerInRange(position.startMonth, 1, 12, 1);
  let endMonth = finiteIntegerInRange(position.endMonth, 1, 12, 12);

  if (type !== "savings" && startMonth > endMonth) {
    const previousStart = startMonth;
    startMonth = endMonth;
    endMonth = previousStart;
  }

  if (payoutType === "once" && type !== "savings") {
    startMonth = payoutMonth;
    endMonth = payoutMonth;
  }

  const isIncome = flow === "income";
  return {
    ...position,
    id: String(position.id || createId()),
    flow,
    active: Boolean(position.active),
    visible: Boolean(position.visible),
    name: String(position.name || "Position"),
    icon: normalizePositionIcon(position.icon, defaultPositionIconForPosition({ ...position, flow, type })),
    type,
    amount: Math.max(0, finiteNumber(position.amount, 0)),
    startMonth,
    endMonth,
    payoutType,
    payoutYear: finiteIntegerInRange(position.payoutYear, 2000, 2200, fallbackYear),
    payoutMonth,
    payoutDay: finiteIntegerInRange(position.payoutDay, 1, 31, 31),
    interestBearing: !isIncome && payoutType !== "once" && Boolean(position.interestBearing),
    cashback: !isIncome && type === "temporary" && Boolean(position.cashback)
  };
}

function normalizePayoutType(
  value: ReservePosition["payoutType"],
  flow: ReservePosition["flow"],
  type: ReservePosition["type"]
): ReservePosition["payoutType"] {
  if (value === "monthly" || value === "yearly" || value === "once") return value;
  if (value === "none" && flow === "expense") return value;
  if (flow === "income" && type === "incomeYearly") return "yearly";
  return "monthly";
}

function finiteIntegerInRange(value: unknown, min: number, max: number, fallback: number): number {
  return Math.round(clamp(finiteNumber(value, fallback), min, max));
}

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function addPosition(): string {
  const isIncome = selectedPositionMode === "income";
  const isReserve = selectedPositionMode === "reserve";
  const isSavings = selectedPositionMode === "savings";
  const isExpenseOnce = selectedPositionMode === "expense" && selectedExpenseSubmode === "once";
  const flow = isIncome ? "income" : "expense";
  const name = isIncome
    ? "Neue Einnahme"
    : isReserve
      ? "Neue Ruecklage"
      : isSavings
        ? "Neue Sparrate"
        : isExpenseOnce
          ? "Neue Einmalige Ausgabe"
          : "Neue Ausgabe";
  const type = isIncome ? "incomeMonthly" : isReserve ? "reserve" : isSavings ? "savings" : "temporary";
  const payoutType: ReservePosition["payoutType"] = isExpenseOnce ? "once" : "monthly";
  const payoutMonth = isIncome ? 1 : 12;
  const startMonth = isExpenseOnce ? payoutMonth : 1;
  const endMonth = isExpenseOnce ? payoutMonth : 12;
  const id = createId();
  state.positions = [
    ...state.positions,
    {
      id,
      flow,
      active: true,
      visible: true,
      name,
      icon: defaultPositionIconForPosition({ flow, type, name }),
      type,
      amount: 0,
      startMonth,
      endMonth,
      payoutType,
      payoutYear: state.settings.year,
      payoutMonth,
      payoutDay: isIncome ? 1 : 14,
      interestBearing: false,
      cashback: false
    }
  ];
  renderAll();

  window.setTimeout(() => {
    const inputs = document.querySelectorAll<HTMLInputElement>("#positionsBody .name-input");
    const lastInput = inputs[inputs.length - 1];
    lastInput?.focus();
    lastInput?.select();
  }, 0);

  return id;
}

function removePosition(id: string): void {
  const accountId = activePlanningAccount().id;
  state.positions = state.positions.filter((position) => position.id !== id);
  const settings = state.investmentByAccountId[accountId] ?? defaultInvestmentSettingsForNewAccount();
  const nextSettings: InvestmentSettings = {
    ...settings,
    includedIds: settings.includedIds.filter((item) => item !== id),
    retirementIncludedIds: settings.retirementIncludedIds.filter((item) => item !== id),
    childIncludedIds: settings.childIncludedIds.filter((item) => item !== id)
  };
  state.investmentByAccountId = {
    ...state.investmentByAccountId,
    [accountId]: nextSettings
  };
  if (state.ui.selectedInvestmentAccountId === accountId) {
    state.investment = nextSettings;
  }
  state.realEstate = {
    ...state.realEstate,
    equityCapitalSourceIds: state.realEstate.equityCapitalSourceIds.filter((item) => item !== id),
    monthlyPaymentSourceIds: state.realEstate.monthlyPaymentSourceIds.filter((item) => item !== id),
    specialRepaymentSourceIds: state.realEstate.specialRepaymentSourceIds.filter((item) => item !== id)
  };
}

function toggleInvestmentPosition(id: string, checked: boolean): void {
  const depot = activeInvestmentDepot();
  if (checked && realEstateSelectedSourceIds().has(id)) {
    return;
  }
  if (checked && otherInvestmentDepots(depot).some((item) => depotInvestmentSettings(item).includedIds.includes(id))) {
    return;
  }
  const includedIds = new Set(depotInvestmentSettings(depot).includedIds);
  if (checked) includedIds.add(id);
  else includedIds.delete(id);
  if (depot === "standard") {
    state.investment = { ...state.investment, includedIds: Array.from(includedIds) };
    return;
  }
  if (depot === "child") {
    state.investment = { ...state.investment, childIncludedIds: Array.from(includedIds) };
    return;
  }
  state.investment = { ...state.investment, retirementIncludedIds: Array.from(includedIds) };
}

function toggleInterestInvestment(): void {
  const depot = activeInvestmentDepot();
  if (
    !depotInvestmentSettings(depot).includeAccountInterest &&
    otherInvestmentDepots(depot).some((item) => depotInvestmentSettings(item).includeAccountInterest)
  ) {
    return;
  }
  if (depot === "standard") {
    state.investment = { ...state.investment, includeAccountInterest: !state.investment.includeAccountInterest };
  } else if (depot === "child") {
    state.investment = {
      ...state.investment,
      childIncludeAccountInterest: !state.investment.childIncludeAccountInterest
    };
  } else {
    state.investment = {
      ...state.investment,
      retirementIncludeAccountInterest: !state.investment.retirementIncludeAccountInterest
    };
  }
  renderAll();
}

function toggleCashbackInvestment(): void {
  const depot = activeInvestmentDepot();
  if (
    !depotInvestmentSettings(depot).includeAccountCashback &&
    otherInvestmentDepots(depot).some((item) => depotInvestmentSettings(item).includeAccountCashback)
  ) {
    return;
  }
  if (depot === "standard") {
    state.investment = { ...state.investment, includeAccountCashback: !state.investment.includeAccountCashback };
  } else if (depot === "child") {
    state.investment = {
      ...state.investment,
      childIncludeAccountCashback: !state.investment.childIncludeAccountCashback
    };
  } else {
    state.investment = {
      ...state.investment,
      retirementIncludeAccountCashback: !state.investment.retirementIncludeAccountCashback
    };
  }
  renderAll();
}

function toggleResultMaxNeeded(): void {
  showResultMaxNeeded = !showResultMaxNeeded;
  renderAll();
}

function showReserveChartPopup(): void {
  reserveChartOpen = true;
  renderReserveChartPopup(calculateReserveSummary(state.settings, state.positions));
}

function hideReserveChartPopup(): void {
  reserveChartOpen = false;
  const popup = document.querySelector<HTMLDivElement>("#reserveChartPopup");
  if (popup) popup.hidden = true;
}

function setReserveChartCategory(category: ReserveChartCategory): void {
  if (!["all", "income", "expense", "reserve", "savings"].includes(category)) return;
  reserveChartCategory = category;
  reserveChartHighlightId = null;
  reserveChartAdjustment = "none";
  showReserveChartPopup();
}

function setReserveChartScenario(scenario: ReserveChartScenario): void {
  if (!["current", "lowerExpenses", "raiseSavings", "balanced"].includes(scenario)) return;
  reserveChartScenario = scenario;
  showReserveChartPopup();
}

function setReserveChartStyle(style: ReserveChartStyle): void {
  if (!["bars", "pie"].includes(style)) return;
  reserveChartStyle = style;
  showReserveChartPopup();
}

function setReserveChartHighlight(positionId: string | null): void {
  if (reserveChartHighlightId !== positionId) reserveChartAdjustment = "none";
  reserveChartHighlightId = positionId;
  showReserveChartPopup();
}

function setReserveChartAdjustment(adjustment: ReserveChartAdjustment): void {
  if (!["none", "down10", "up10"].includes(adjustment)) return;
  reserveChartAdjustment = adjustment;
  showReserveChartPopup();
}

function setSelectedPositionMode(mode: PositionTableMode, expenseSubmode?: ExpenseSubmode): void {
  selectedPositionMode = mode;
  if (mode !== "expense") {
    selectedExpenseSubmode = "regular";
  } else if (expenseSubmode) {
    selectedExpenseSubmode = expenseSubmode;
  }
  renderPositions();
}

function positionTableSourcePositions(): ReservePosition[] {
  if (selectedPositionMode !== "expense") return state.positions;
  return state.positions.filter((position) => {
    if (positionTableMode(position) !== "expense") return false;
    if (selectedExpenseSubmode === "once") return position.payoutType === "once";
    return position.payoutType !== "once";
  });
}

function reorderPosition(sourceId: string, targetId: string, afterTarget: boolean): void {
  if (sourceId === targetId) return;

  const moved = state.positions.find((position) => position.id === sourceId);
  if (!moved) return;

  const withoutMoved = state.positions.filter((position) => position.id !== sourceId);
  const targetIndex = withoutMoved.findIndex((position) => position.id === targetId);
  if (targetIndex < 0) return;

  const insertIndex = afterTarget ? targetIndex + 1 : targetIndex;
  withoutMoved.splice(insertIndex, 0, moved);
  state.positions = withoutMoved;
}

function resetState(): void {
  const confirmed = window.confirm("Moechtest du wirklich alle Grunddaten, Positionen und Investment-Einstellungen zuruecksetzen?");
  if (!confirmed) return;
  state = resetStoredState();
  state.investmentByAccountId = {
    [state.ui.selectedInvestmentAccountId]: defaultInvestmentSettings()
  };
  state.investment = state.investmentByAccountId[state.ui.selectedInvestmentAccountId];
  investmentAccountContextId = state.ui.selectedInvestmentAccountId;
  selectedRealEstateYear = null;
  selectedCombinedWealthYear = null;
  applyTheme();
  syncAllInputsFromState();
  hideThemeSettings();
  renderAll();
}

function setThemeMode(theme: ThemeMode): void {
  state = { ...state, theme };
  applyTheme();
  syncThemeControls();
  saveState(state);
  drawCurrentInvestmentChart();
}

function applyTheme(): void {
  document.documentElement.dataset.theme = state.theme;
  const metaThemeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.content = state.theme === "dark" ? "#101412" : "#f7f4ed";
  }
}

function toggleThemeSettings(): void {
  const panel = document.querySelector<HTMLDivElement>("#themeSettingsPanel");
  if (!panel) return;
  panel.hidden = !panel.hidden;
  if (!panel.hidden) {
    syncSettingsAccordionState();
  }
  syncThemeControls();
}

function hideThemeSettings(): void {
  const panel = document.querySelector<HTMLDivElement>("#themeSettingsPanel");
  if (panel) panel.hidden = true;
  syncThemeControls();
  updateModuleVisibility();
}

function syncThemeControls(): void {
  const panel = document.querySelector<HTMLDivElement>("#themeSettingsPanel");
  const button = document.querySelector<HTMLButtonElement>("[data-action='toggle-theme-settings']");
  if (button) button.setAttribute("aria-expanded", String(Boolean(panel && !panel.hidden)));
  for (const option of document.querySelectorAll<HTMLButtonElement>(".theme-option[data-action]")) {
    const isActive =
      (option.dataset.action === "set-theme-light" && state.theme === "light") ||
      (option.dataset.action === "set-theme-dark" && state.theme === "dark");
    option.classList.toggle("active", isActive);
    option.setAttribute("aria-pressed", String(isActive));
  }
  syncSettingsAccordionState();
}

async function importPositionsFromFile(file: File | undefined): Promise<void> {
  if (!file) return;
  const text = await file.text();
  const imported = positionsFromCsvRows(parseCsv(text));
  if (!imported.length) {
    window.alert("Keine gueltigen Positionen gefunden.");
    return;
  }

  state.positions = imported;
  syncActivePlanningAccountFromPositions();
  const activeAccountId = activePlanningAccount().id;
  const availablePositions = activePlanningAccount().yearlyRows;
  const settings = state.investmentByAccountId[activeAccountId] ?? defaultInvestmentSettingsForNewAccount();
  const selectablePositionIds = new Set(
    availablePositions
      .filter((position) => position.active && position.type === "savings" && positionFlow(position) === "expense")
      .map((position) => position.id)
  );
  const nextSettings: InvestmentSettings = {
    ...settings,
    includedIds: settings.includedIds.filter((id) => selectablePositionIds.has(id)),
    retirementIncludedIds: settings.retirementIncludedIds.filter((id) => selectablePositionIds.has(id)),
    childIncludedIds: settings.childIncludedIds.filter((id) => selectablePositionIds.has(id))
  };
  state.investmentByAccountId = {
    ...state.investmentByAccountId,
    [activeAccountId]: nextSettings
  };
  if (state.ui.selectedInvestmentAccountId === activeAccountId) {
    state.investment = nextSettings;
  }
  state.realEstate = {
    ...state.realEstate,
    equityCapitalSourceIds: state.realEstate.equityCapitalSourceIds.filter((id) =>
      availablePositions.some(
        (position) =>
          position.id === id && position.active && position.type === "savings" && positionFlow(position) === "expense"
      )
    ),
    monthlyPaymentSourceIds: state.realEstate.monthlyPaymentSourceIds.filter((id) =>
      availablePositions.some(
        (position) =>
          position.id === id && position.active && position.type === "savings" && positionFlow(position) === "expense"
      )
    ),
    specialRepaymentSourceIds: state.realEstate.specialRepaymentSourceIds.filter((id) =>
      availablePositions.some(
        (position) =>
          position.id === id && position.active && position.type === "savings" && positionFlow(position) === "expense"
      )
    )
  };
  renderAll();
}

async function exportCsvFile(filename: string, text: string, label: string): Promise<void> {
  const contents = csvFileContents(text);
  const nativeResult = await saveCsvWithNativeDialog(filename, contents);

  if (nativeResult === "saved") {
    showExportStatus(`${label} wurde gespeichert.`);
    return;
  }

  if (nativeResult === "cancelled") {
    showExportStatus(`${label} wurde abgebrochen.`);
    return;
  }

  downloadText(filename, contents);
  showExportStatus(
    nativeResult === "failed" ? `${label} wurde als Download gestartet.` : `${label} wurde gestartet.`
  );
}

async function saveCsvWithNativeDialog(filename: string, contents: string): Promise<"saved" | "cancelled" | "unavailable" | "failed"> {
  if (!isTauriRuntime()) return "unavailable";

  showExportStatus("Speichern-Dialog wird geoeffnet...");
  try {
    const [{ save }, { invoke }] = await Promise.all([import("@tauri-apps/plugin-dialog"), import("@tauri-apps/api/core")]);
    const selectedPath = await save({
      title: "CSV exportieren",
      defaultPath: filename,
      filters: [{ name: "CSV", extensions: ["csv"] }]
    });

    if (!selectedPath) return "cancelled";
    await invoke("write_csv_file", { path: ensureCsvExtension(selectedPath), contents });
    return "saved";
  } catch (error) {
    console.error("Native CSV export failed; falling back to browser download.", error);
    return "failed";
  }
}

function isTauriRuntime(): boolean {
  return Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

function csvFileContents(text: string): string {
  const content = text.endsWith("\n") ? text : `${text}\n`;
  return `\uFEFF${content}`;
}

function ensureCsvExtension(path: string): string {
  return path.toLowerCase().endsWith(".csv") ? path : `${path}.csv`;
}

function downloadText(filename: string, contents: string, type = "text/csv;charset=utf-8"): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

function showExportStatus(message: string): void {
  const status = document.querySelector<HTMLSpanElement>("#exportStatus");
  if (!status) return;
  status.textContent = message;
  if (exportStatusTimeoutId) window.clearTimeout(exportStatusTimeoutId);
  exportStatusTimeoutId = window.setTimeout(() => {
    status.textContent = "";
    exportStatusTimeoutId = undefined;
  }, 3500);
}

function formControl(target: EventTarget | null): HTMLInputElement | HTMLSelectElement | null {
  if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) return target;
  return null;
}

function setText(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function setRangeLabel(key: keyof InvestmentSettings, value: string): void {
  setText(`${key}Value`, value);
}

function setInputValue(selector: string, value: number | string | string[]): void {
  const input = document.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
  if (input) input.value = String(value);
}

function setInputBounds(selector: string, min: number, max: number): void {
  const input = document.querySelector<HTMLInputElement>(selector);
  if (!input) return;
  input.min = String(min);
  input.max = String(max);
}

function syncDepotScopedInvestmentFields(activeDepot: InvestmentDepotKey): void {
  for (const wrapper of document.querySelectorAll<HTMLElement>("[data-depot-scope]")) {
    const scopes = (wrapper.dataset.depotScope ?? "").split(/\s+/).filter(Boolean);
    const hidden = !scopes.includes(activeDepot);
    wrapper.hidden = hidden;
    for (const control of wrapper.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLButtonElement | HTMLTextAreaElement
    >("input, select, button, textarea")) {
      control.disabled = hidden || control.dataset.forceDisabled === "true";
    }
  }
}

function setSectionHidden(selector: string, hidden: boolean): void {
  const element = document.querySelector<HTMLElement>(selector);
  if (element) element.hidden = hidden;
}

function setDetailLineHidden(id: string, hidden: boolean): void {
  const wrapper = document.getElementById(id)?.closest<HTMLElement>(".detail-line");
  if (wrapper) wrapper.hidden = hidden;
}

function drawCurrentInvestmentChart(): void {
  const investmentAccount = selectedInvestmentPlanningAccount();
  const reserve = calculateReserveSummary(state.settings, investmentAccount.yearlyRows);
  const projection = buildDepotAssetProjection(reserve, activeInvestmentDepot(), investmentAccount.id);
  const combinedProjection = combineAssetProjections(
    buildDepotAssetProjection(reserve, "standard", investmentAccount.id),
    buildDepotAssetProjection(reserve, "retirement", investmentAccount.id)
  );
  hideInvestmentChartPopup();
  drawInvestmentChartWithPopup(projection);
  drawInvestmentChartWithPopup(combinedProjection, "#combinedInvestmentChart", "#combinedInvestmentChartPopup");
}

function contributionDetailText(projection: AssetProjection): string {
  const recurringContribution = projection.recurringContributionAtRetirement;
  const oneTimeContribution = projection.oneTimeContributionAtRetirement;
  if (oneTimeContribution > 0.01) {
    return `${money(projection.totalContribution)} (${money(recurringContribution)} regelmaessig + ${money(
      oneTimeContribution
    )} einmalig)`;
  }
  return `${money(projection.totalContribution)} (${money(recurringContribution)} regelmaessig)`;
}

function drawInvestmentChartWithPopup(
  projection: AssetProjection,
  canvasSelector = "#investmentChart",
  popupSelector = "#investmentChartPopup"
): void {
  drawInvestmentChart(document.querySelector<HTMLCanvasElement>(canvasSelector), projection, (selection) => {
    showInvestmentChartPopup(projection, selection.point, selection.clientX, selection.clientY, popupSelector);
  });
}

function showInvestmentChartPopup(
  projection: AssetProjection,
  point: AssetProjectionPoint,
  clientX: number,
  clientY: number,
  popupSelector = "#investmentChartPopup"
): void {
  const popup = document.querySelector<HTMLDivElement>(popupSelector);
  const card = popup?.closest<HTMLElement>(".investment-chart-card");
  if (!popup || !card) return;

  const allowance = Math.min(Math.max(0, point.netBalance), Math.max(0, point.allowance));
  const eigenbeitrag = Math.min(
    Math.max(0, point.netBalance - allowance),
    Math.max(0, point.costBasis - allowance)
  );
  const tax = Math.max(0, point.periodTax);
  const growth = Math.max(0, Math.max(0, point.netBalance - eigenbeitrag - allowance) - tax);
  const payoutBalance = point.phase === "payout" ? Math.max(0, point.netBalance) : 0;
  const year = state.settings.year + Math.round(point.age - projection.ageToday);

  popup.innerHTML = `
    <div class="chart-popup-head">
      <div>
        <span>Balkendetails</span>
        <strong>Alter ${intNumber(point.age)} | Jahr ${intNumber(year)}</strong>
      </div>
      <button class="chart-popup-close" type="button" data-action="close-investment-chart-popup" aria-label="Popup schliessen">x</button>
    </div>
    <div class="chart-popup-list">
      ${chartPopupLine("grey", "Eigenbeitrag", money(eigenbeitrag))}
      ${chartPopupLine("orange", "Zulagen", money(allowance))}
      ${chartPopupLine("green", "Wertzuwachs", money(growth))}
      ${chartPopupLine("purple", "Restguthaben (Auszahlung)", money(payoutBalance))}
      ${chartPopupLine("red", "Kapitalertragsteuer", tax > 0 ? `-${money(tax)}` : money(0))}
      ${chartPopupTotalLine("Gesamtkapital", money(Math.max(0, point.netBalance)))}
    </div>
  `;

  popup.hidden = false;
  positionChartPopup(popup, card, clientX, clientY);
}

function showRealEstateChartPopup(
  year: number,
  chartKind: "repayment" | "trend",
  clientX: number,
  clientY: number
): void {
  const result = latestRealEstateResult;
  const point = result?.years.find((entry) => entry.year === year);
  const popup = document.querySelector<HTMLDivElement>("#realEstateChartPopup");
  const card = popup?.closest<HTMLElement>(".real-estate-chart-card");
  if (!result || !point || !popup || !card) return;

  const initialPropertyValue = Math.max(0, result.years[0]?.propertyValue ?? 0);
  const repaymentGroup = chartPopupSection("Tilgung und Kredit", [
    ...realEstateRepaymentSegments({ point }).map((segment) =>
      chartPopupLine(segment.className, segment.label, money(segment.value))
    ),
    chartPopupLine("gross", "Darlehensbetrag inkl. Zinsen", money(result.totalLoanCost))
  ]);
  const trendGroup = chartPopupSection("Immobilienwertentwicklung", [
    ...realEstateTrendSegments(point, initialPropertyValue).map((segment) =>
      chartPopupLine(segment.className, segment.label, money(segment.value))
    ),
    chartPopupTotalLine("Immobilienwert", money(point.propertyValue))
  ]);
  const groups = chartKind === "trend" ? [trendGroup, repaymentGroup] : [repaymentGroup, trendGroup];
  const title = chartKind === "trend" ? "Immobilienwertentwicklung" : "Tilgung und Vermoegen";

  popup.innerHTML = `
    <div class="chart-popup-head">
      <div>
        <span>${title}</span>
        <strong>${realEstatePopupHeading(point.year - state.investment.birthYear, point.year, intNumber)}</strong>
      </div>
      <button class="chart-popup-close" type="button" data-action="close-investment-chart-popup" aria-label="Popup schliessen">x</button>
    </div>
    <div class="chart-popup-list">
      ${groups.join("")}
    </div>
  `;

  popup.hidden = false;
  positionChartPopup(popup, card, clientX, clientY);
}

function positionChartPopup(popup: HTMLDivElement, card: HTMLElement, clientX: number, clientY: number): void {
  popup.style.left = "12px";
  popup.style.top = "12px";
  const cardRect = card.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();
  const left = clamp(clientX - cardRect.left + 14, 12, Math.max(12, cardRect.width - popupRect.width - 12));
  const top = clamp(clientY - cardRect.top + 14, 12, Math.max(12, cardRect.height - popupRect.height - 12));
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

function chartPopupLine(color: string, label: string, value: string): string {
  return `
    <div class="chart-popup-line">
      <span><i class="chart-popup-dot ${escapeHtml(color)}"></i>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function chartPopupTotalLine(label: string, value: string): string {
  return `
    <div class="chart-popup-line chart-popup-total">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function chartPopupSection(title: string, lines: string[]): string {
  return `
    <div class="chart-popup-section">
      <div class="chart-popup-section-title">${escapeHtml(title)}</div>
      ${lines.join("")}
    </div>
  `;
}

function hideInvestmentChartPopup(): void {
  for (const popup of document.querySelectorAll<HTMLDivElement>(
    "#investmentChartPopup, #combinedInvestmentChartPopup, #realEstateChartPopup"
  )) {
    popup.hidden = true;
  }
}

function buildDepotAssetProjection(
  summary: ReturnType<typeof calculateReserveSummary>,
  depot: InvestmentDepotKey,
  accountId = selectedInvestmentPlanningAccount().id
): AssetProjection {
  return buildAssetProjection(
    state.settings.year,
    investmentPositionsForProjection(summary, depot, accountId),
    investmentSettingsForProjection(summary, depot, accountId)
  );
}

function investmentPositionsForProjection(
  summary: ReturnType<typeof calculateReserveSummary>,
  depot: InvestmentDepotKey,
  accountId: string
): ReservePosition[] {
  const account = planningAccountById(accountId) ?? selectedInvestmentPlanningAccount();
  const settings = depotInvestmentSettingsForAccount(depot, accountId);
  const virtualPositions: ReservePosition[] = [];
  if (settings.includeAccountInterest && summary.totalInterest > 0) {
    virtualPositions.push(
      virtualInvestmentPosition(INTEREST_INVESTMENT_POSITION_ID, "Zinsen aus Jahrestabelle", summary.totalInterest)
    );
  }
  if (settings.includeAccountCashback && summary.totalCashback > 0) {
    virtualPositions.push(
      virtualInvestmentPosition(CASHBACK_INVESTMENT_POSITION_ID, "Cashback aus Jahrestabelle", summary.totalCashback)
    );
  }
  return [...account.yearlyRows, ...virtualPositions];
}

function investmentSettingsForProjection(
  summary: ReturnType<typeof calculateReserveSummary>,
  depot: InvestmentDepotKey,
  accountId: string
): InvestmentSettings {
  const settings = depotInvestmentSettingsForAccount(depot, accountId);
  const includedIds = new Set(settings.includedIds);
  if (settings.includeAccountInterest && summary.totalInterest > 0) {
    includedIds.add(INTEREST_INVESTMENT_POSITION_ID);
  }
  if (settings.includeAccountCashback && summary.totalCashback > 0) {
    includedIds.add(CASHBACK_INVESTMENT_POSITION_ID);
  }
  return {
    ...settings,
    includedIds: Array.from(includedIds)
  };
}

function combineAssetProjections(standard: AssetProjection, retirement: AssetProjection): AssetProjection {
  const pointsByAge = new Map<number, { standard?: AssetProjectionPoint; retirement?: AssetProjectionPoint }>();
  for (const point of standard.points) {
    pointsByAge.set(point.age, { ...(pointsByAge.get(point.age) ?? {}), standard: point });
  }
  for (const point of retirement.points) {
    pointsByAge.set(point.age, { ...(pointsByAge.get(point.age) ?? {}), retirement: point });
  }

  const ages = Array.from(pointsByAge.keys()).sort((left, right) => left - right);
  const points = ages.map((age) => {
    const pair = pointsByAge.get(age) ?? {};
    return sumProjectionPoint(age, pair.standard, pair.retirement);
  });

  return {
    ...standard,
    points,
    monthlyRate: standard.monthlyRate + retirement.monthlyRate,
    annualSavingsRate: standard.annualSavingsRate + retirement.annualSavingsRate,
    retirementDepotEnabled: retirement.retirementDepotEnabled,
    retirementDepotAnnualOwnContribution: retirement.retirementDepotAnnualOwnContribution,
    retirementDepotBaseAllowanceAnnual: retirement.retirementDepotBaseAllowanceAnnual,
    retirementDepotChildAllowanceAnnual: retirement.retirementDepotChildAllowanceAnnual,
    retirementDepotAllowanceAnnual: retirement.retirementDepotAllowanceAnnual,
    retirementDepotAllowanceRatePercent: retirement.retirementDepotAllowanceRatePercent,
    retirementDepotAnnualContributionWithAllowance: retirement.retirementDepotAnnualContributionWithAllowance,
    retirementDepotChildren: retirement.retirementDepotChildren,
    monthlyPension: standard.monthlyPension + retirement.monthlyPension,
    realMonthlyPension: standard.realMonthlyPension + retirement.realMonthlyPension,
    bequestReservePercent: Math.max(standard.bequestReservePercent, retirement.bequestReservePercent),
    bequestReserveAtEnd: standard.bequestReserveAtEnd + retirement.bequestReserveAtEnd,
    percentageWithdrawalMonthlyAtStart:
      standard.percentageWithdrawalMonthlyAtStart + retirement.percentageWithdrawalMonthlyAtStart,
    percentageWithdrawalAnnualAtStart:
      standard.percentageWithdrawalAnnualAtStart + retirement.percentageWithdrawalAnnualAtStart,
    withdrawalRemainingSavingsMonthlyAtStart:
      standard.withdrawalRemainingSavingsMonthlyAtStart + retirement.withdrawalRemainingSavingsMonthlyAtStart,
    withdrawalGainMonthlyAtStart: standard.withdrawalGainMonthlyAtStart + retirement.withdrawalGainMonthlyAtStart,
    retirementAge: Math.max(standard.retirementAge, retirement.retirementAge),
    endAge: Math.max(standard.endAge, retirement.endAge),
    ageToday: Math.min(standard.ageToday, retirement.ageToday),
    savingMonths: standard.savingMonths + retirement.savingMonths,
    totalContribution: standard.totalContribution + retirement.totalContribution,
    recurringContributionAtRetirement:
      standard.recurringContributionAtRetirement + retirement.recurringContributionAtRetirement,
    oneTimeContributionAtRetirement:
      standard.oneTimeContributionAtRetirement + retirement.oneTimeContributionAtRetirement,
    grossWealthAtRetirement: standard.grossWealthAtRetirement + retirement.grossWealthAtRetirement,
    growthAtRetirement: standard.growthAtRetirement + retirement.growthAtRetirement,
    taxAtRetirement: standard.taxAtRetirement + retirement.taxAtRetirement,
    taxAtEnd: standard.taxAtEnd + retirement.taxAtEnd,
    costBasisAtRetirement: standard.costBasisAtRetirement + retirement.costBasisAtRetirement,
    allowanceAtRetirement: standard.allowanceAtRetirement + retirement.allowanceAtRetirement,
    allowanceBasisAtRetirement: standard.allowanceBasisAtRetirement + retirement.allowanceBasisAtRetirement,
    unrealizedTaxAtRetirement: standard.unrealizedTaxAtRetirement + retirement.unrealizedTaxAtRetirement,
    netWealthAfterFullTaxAtRetirement:
      standard.netWealthAfterFullTaxAtRetirement + retirement.netWealthAfterFullTaxAtRetirement,
    inflationFactorAtRetirement: Math.max(standard.inflationFactorAtRetirement, retirement.inflationFactorAtRetirement),
    wealthAtRetirement: standard.wealthAtRetirement + retirement.wealthAtRetirement,
    realWealthAtRetirement: standard.realWealthAtRetirement + retirement.realWealthAtRetirement
  };
}

function sumProjectionPoint(
  age: number,
  standard: AssetProjectionPoint | undefined,
  retirement: AssetProjectionPoint | undefined
): AssetProjectionPoint {
  return {
    age,
    phase: standard?.phase === "payout" || retirement?.phase === "payout" ? "payout" : "saving",
    grossBalance: (standard?.grossBalance ?? 0) + (retirement?.grossBalance ?? 0),
    contribution: (standard?.contribution ?? 0) + (retirement?.contribution ?? 0),
    costBasis: (standard?.costBasis ?? 0) + (retirement?.costBasis ?? 0),
    allowance: (standard?.allowance ?? 0) + (retirement?.allowance ?? 0),
    growth: (standard?.growth ?? 0) + (retirement?.growth ?? 0),
    tax: (standard?.tax ?? 0) + (retirement?.tax ?? 0),
    periodTax: (standard?.periodTax ?? 0) + (retirement?.periodTax ?? 0),
    netBalance: (standard?.netBalance ?? 0) + (retirement?.netBalance ?? 0),
    realNetBalance: (standard?.realNetBalance ?? 0) + (retirement?.realNetBalance ?? 0),
    normalDepot: (standard?.normalDepot ?? 0) + (retirement?.normalDepot ?? 0)
  };
}

function virtualInvestmentPosition(id: string, name: string, amount: number): ReservePosition {
  return {
    id,
    flow: "expense",
    active: true,
    name,
    icon: id === INTEREST_INVESTMENT_POSITION_ID ? "interest" : "cashback",
    type: "savings",
    amount,
    startMonth: 1,
    endMonth: 12,
    payoutType: "yearly",
    payoutYear: state.settings.year,
    payoutMonth: 12,
    payoutDay: 31,
    visible: false,
    interestBearing: false,
    cashback: false
  };
}

function clearDragState(): void {
  draggedPositionId = null;
  for (const row of root.querySelectorAll("tr.dragging, tr.drag-over")) {
    row.classList.remove("dragging", "drag-over");
  }
}

function normalizeInvestmentBounds(): void {
  let nextInvestment = {
    ...state.investment,
    retirementDepotChildren: numericInvestmentValue(
      "retirementDepotChildren",
      String(state.investment.retirementDepotChildren)
    )
  };
  nextInvestment.activeDepot = INVESTMENT_DEPOTS.includes(nextInvestment.activeDepot)
    ? nextInvestment.activeDepot
    : "standard";
  const payoutEndAgeSource =
    nextInvestment.activeDepot === "retirement" ? nextInvestment.retirementPayoutEndAge : nextInvestment.payoutEndAge;
  const sharedPayoutEndAge = numericInvestmentValue(
    "payoutEndAge",
    String(payoutEndAgeSource)
  );
  nextInvestment = {
    ...nextInvestment,
    payoutEndAge: sharedPayoutEndAge,
    retirementPayoutEndAge: sharedPayoutEndAge
  };
  const sharedRetirementAge = clampRetirementAge(
    Math.max(
      RETIREMENT_DEPOT_MIN_AGE,
      nextInvestment.payoutEndAge - nextInvestment.payoutYears,
      nextInvestment.payoutEndAge - nextInvestment.retirementPayoutYears
    ),
    sharedPayoutEndAge
  );
  const sharedPayoutYears = payoutYearsForRetirementAge(sharedPayoutEndAge, sharedRetirementAge);
  nextInvestment = {
    ...nextInvestment,
    payoutYears: sharedPayoutYears,
    retirementPayoutYears: sharedPayoutYears
  };

  const standardRetirementAge = calculatePayoutStartAge({
    ...nextInvestment,
    retirementDepotEnabled: false,
    retirementDepotChildren: 0
  });
  const standardChartStartAge = clamp(
    nextInvestment.chartStartAge,
    investmentMin("chartStartAge"),
    Math.min(investmentMax("chartStartAge"), standardRetirementAge)
  );
  const retirementSettings = {
    ...nextInvestment,
    includedIds: nextInvestment.retirementIncludedIds,
    includeAccountInterest: nextInvestment.retirementIncludeAccountInterest,
    includeAccountCashback: nextInvestment.retirementIncludeAccountCashback,
    retirementDepotEnabled: true,
    birthYear: nextInvestment.retirementBirthYear,
    chartStartAge: nextInvestment.retirementChartStartAge,
    payoutEndAge: nextInvestment.payoutEndAge,
    payoutYears: nextInvestment.retirementPayoutYears,
    percentageWithdrawalStartAge: nextInvestment.payoutEndAge - nextInvestment.retirementPayoutYears,
    percentageWithdrawalRatePercent: 0,
    investmentReturnPercent: nextInvestment.retirementInvestmentReturnPercent,
    capitalGainsTaxPercent: nextInvestment.retirementCapitalGainsTaxPercent,
    inflationRatePercent: nextInvestment.retirementInflationRatePercent,
    bequestReservePercent: nextInvestment.retirementBequestReservePercent
  };
  const retirementAge = calculatePayoutStartAge(retirementSettings);
  const retirementChartStartAge = clamp(
    nextInvestment.retirementChartStartAge,
    investmentMin("chartStartAge"),
    Math.min(investmentMax("chartStartAge"), retirementAge)
  );
  const rawChildPayoutAge = Number.isFinite(nextInvestment.childPayoutAge)
    ? nextInvestment.childPayoutAge
    : CHILD_DEPOT_DEFAULT_PAYOUT_AGE;
  const childPayoutAge = clampChildPayoutAge(rawChildPayoutAge);
  const childBirthYear = clamp(
    nextInvestment.childBirthYear,
    childBirthYearMinForPayoutAge(childPayoutAge),
    state.settings.year
  );
  const childChartStartAge = clamp(
    nextInvestment.childChartStartAge,
    investmentMin("chartStartAge"),
    childPayoutAge
  );
  state.investment = {
    ...nextInvestment,
    payoutEndAge: sharedPayoutEndAge,
    retirementPayoutEndAge: sharedPayoutEndAge,
    chartStartAge: standardChartStartAge,
    percentageWithdrawalStartAge: clamp(
      nextInvestment.percentageWithdrawalStartAge,
      standardChartStartAge,
      standardRetirementAge
    ),
    retirementChartStartAge,
    childBirthYear,
    childChartStartAge,
    childPayoutAge,
    retirementDepotChildren: numericInvestmentValue(
      "retirementDepotChildren",
      String(nextInvestment.retirementDepotChildren)
    ),
    bequestReservePercent: numericInvestmentValue(
      "bequestReservePercent",
      String(nextInvestment.bequestReservePercent)
    ),
    retirementBequestReservePercent: numericInvestmentValue(
      "bequestReservePercent",
      String(nextInvestment.retirementBequestReservePercent)
    ),
    childInvestmentReturnPercent: clamp(
      nextInvestment.childInvestmentReturnPercent,
      investmentMin("investmentReturnPercent"),
      investmentMax("investmentReturnPercent")
    ),
    childCapitalGainsTaxPercent: clamp(
      nextInvestment.childCapitalGainsTaxPercent,
      investmentMin("capitalGainsTaxPercent"),
      investmentMax("capitalGainsTaxPercent")
    ),
    childInflationRatePercent: clamp(
      nextInvestment.childInflationRatePercent,
      investmentMin("inflationRatePercent"),
      investmentMax("inflationRatePercent")
    ),
    childBequestReservePercent: clamp(
      nextInvestment.childBequestReservePercent,
      investmentMin("bequestReservePercent"),
      investmentMax("bequestReservePercent")
    )
  };
}

function normalizeInvestmentDepotSelections(): void {
  const standardIds = new Set(state.investment.includedIds);
  const retirementIds = state.investment.retirementIncludedIds.filter((id) => !standardIds.has(id));
  const adultIds = new Set([...standardIds, ...retirementIds]);
  const childIds = state.investment.childIncludedIds.filter((id) => !adultIds.has(id));
  state.investment = {
    ...state.investment,
    retirementIncludedIds: retirementIds,
    childIncludedIds: childIds,
    retirementIncludeAccountInterest:
      state.investment.includeAccountInterest ? false : state.investment.retirementIncludeAccountInterest,
    retirementIncludeAccountCashback:
      state.investment.includeAccountCashback ? false : state.investment.retirementIncludeAccountCashback,
    childIncludeAccountInterest:
      state.investment.includeAccountInterest || state.investment.retirementIncludeAccountInterest
        ? false
        : state.investment.childIncludeAccountInterest,
    childIncludeAccountCashback:
      state.investment.includeAccountCashback || state.investment.retirementIncludeAccountCashback
        ? false
        : state.investment.childIncludeAccountCashback
  };
}

function normalizeInvestmentSelectionIds(): void {
  const selectableIds = new Set(
    selectedInvestmentPlanningAccount()
      .yearlyRows.filter(
        (position) => position.active && position.type === "savings" && positionFlow(position) === "expense"
      )
      .map((position) => position.id)
  );
  state.investment = {
    ...state.investment,
    includedIds: state.investment.includedIds.filter((id) => selectableIds.has(id)),
    retirementIncludedIds: state.investment.retirementIncludedIds.filter((id) => selectableIds.has(id)),
    childIncludedIds: state.investment.childIncludedIds.filter((id) => selectableIds.has(id))
  };
}

function normalizeRealEstateSourceIds(): void {
  const selectedAccounts = selectedRealEstateSourceAccounts();
  const savingsPositions = selectedAccounts.flatMap((account) =>
    account.yearlyRows.filter(
      (position) => position.active && position.type === "savings" && positionFlow(position) === "expense"
    )
  );
  const financingStartYear = currentRealEstateFinancingStartYear();
  const equitySelectableIds = new Set(
    savingsPositions
      .filter((position) => position.payoutType === "once" && position.payoutYear <= financingStartYear)
      .map((position) => position.id)
  );
  const monthlySelectableIds = new Set(
    savingsPositions.filter((position) => position.payoutType !== "once").map((position) => position.id)
  );
  const specialSelectableIds = new Set(savingsPositions.map((position) => position.id));
  const blockedByInvestment = new Set([
    ...state.investment.includedIds,
    ...state.investment.retirementIncludedIds,
    ...state.investment.childIncludedIds
  ]);
  const equityCapitalSourceIds = state.realEstate.equityCapitalSourceIds.filter(
    (id) => equitySelectableIds.has(id) && !blockedByInvestment.has(id)
  );
  const equityIds = new Set(equityCapitalSourceIds);
  const monthlyPaymentSourceIds = state.realEstate.monthlyPaymentSourceIds.filter(
    (id) => monthlySelectableIds.has(id) && !blockedByInvestment.has(id) && !equityIds.has(id)
  );
  const monthlyIds = new Set(monthlyPaymentSourceIds);
  const specialRepaymentSourceIds = state.realEstate.specialRepaymentSourceIds.filter(
    (id) => specialSelectableIds.has(id) && !blockedByInvestment.has(id) && !equityIds.has(id) && !monthlyIds.has(id)
  );
  state.realEstate = {
    ...state.realEstate,
    equityCapitalSourceIds,
    monthlyPaymentSourceIds,
    specialRepaymentSourceIds
  };
}

function settingMin(field: keyof PlanningSettings): number {
  if (field === "year") return 2000;
  return 0;
}

function settingMax(field: keyof PlanningSettings): number {
  if (field === "year") return 2100;
  return Number.MAX_SAFE_INTEGER;
}

function investmentMin(field: keyof InvestmentSettings): number {
  if (field === "chartStartAge") return 0;
  if (field === "birthYear") return 1962;
  if (field === "childPayoutAge") return CHILD_DEPOT_MIN_PAYOUT_AGE;
  if (field === "payoutEndAge") return 70;
  if (field === "percentageWithdrawalStartAge") return 0;
  if (field === "retirementDepotChildren") return 0;
  if (field === "payoutYears") return 1;
  if (field === "inflationRatePercent") return 1;
  return 0;
}

function investmentMax(field: keyof InvestmentSettings): number {
  if (field === "chartStartAge") return 80;
  if (field === "birthYear") return 2009;
  if (field === "childPayoutAge") return CHILD_DEPOT_MAX_PAYOUT_AGE;
  if (field === "payoutEndAge") return 110;
  if (field === "percentageWithdrawalStartAge") return 110;
  if (field === "percentageWithdrawalRatePercent") return 20;
  if (field === "retirementDepotChildren") return 20;
  if (field === "payoutYears") return 50;
  if (field === "investmentReturnPercent") return 30;
  if (field === "capitalGainsTaxPercent") return 50;
  if (field === "inflationRatePercent") return 10;
  if (field === "bequestReservePercent") return 50;
  return Number.MAX_SAFE_INTEGER;
}
