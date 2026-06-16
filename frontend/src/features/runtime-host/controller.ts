import {
  createId,
  defaultAppState,
  defaultIncomePlanningState,
  defaultIncomeTrackerState,
  defaultInvestmentSettings,
  defaultInvestmentSettingsForNewAccount,
  defaultSelfEmploymentState
} from "../../data/defaults";
import type { AppContext, RenderScheduler } from "../../app/contracts";
import type { FeatureModule } from "../../app/contracts";
import { bindAppEvents } from "../../app/events";
import { createRenderScheduler } from "../../app/renderScheduler";
import { appSectionIdFromValue } from "../../app/router";
import { renderShell } from "../../app/shell";
import { buildAssetProjection, payoutStartAge as calculatePayoutStartAge } from "../../domain/assetProjection";
import {
  buildCombinedWealthSeries,
  combinedWealthHorizonYears,
  type CombinedWealthDepotProjection
} from "../../domain/combinedWealth";
import {
  buildStatutoryPensionModel,
  STATUTORY_PENSION_DEDUCTION_PERCENT_MAX,
  statutoryPensionDerivedSettingsFromLatestContribution,
  type StatutoryPensionModel
} from "../../domain/statutoryPension";
import { calculateRealEstateFinancing, defaultRealEstateDetailYear } from "../../domain/realEstateCalculator";
import {
  investmentSavingsSelectionSummary,
  investmentContributionForMonth,
  oneTimeInvestmentContributionForMonth,
  selectableInvestmentSavingsPositions,
  selectedSavingsContributionForProjectionYear
} from "../../domain/investmentContributions";
import { incomeYearEntryTaxTotal } from "../../domain/incomeTracker";
import { RETIREMENT_DEPOT_MIN_AGE } from "../../domain/retirementDepot";
import {
  calculatePlannedOutflowForSingleMonth,
  calculateReserveSummary
} from "../../domain/reserveCalculator";
import {
  exportPositionsCsv,
  exportYearTableCsv,
  parseCsv,
  positionsFromCsvRows
} from "../../lib/csv";
import {
  clamp,
  escapeHtml,
  intNumber,
  labelForPayout,
  labelForType,
  monthName,
  money,
  numberValue,
  percent
} from "../../lib/format";
import {
  flowForType,
  isIncomePosition,
  isPositionType,
  payoutTypeForPositionTableSelection,
  positionCadencesForTableMode,
  positionFlow,
  positionMatchesTableCadence,
  positionTableMode,
  typeForPositionTableSelection,
  typeForFlow,
  type PositionTableCadence,
  type PositionTableMode
} from "../../lib/positionKinds";
import {
  defaultPositionIconForPosition,
  normalizePositionIcon,
  POSITION_ICONS,
  positionIconSvg
} from "../../lib/positionIcons";
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
} from "../../lib/positionTableView";
import {
  normalizePositionPlanningYear,
  planningYearOptions,
  positionPlanningYear,
  positionsForPlanningYearWithMonthlySavingsCarryover,
  sanitizePlanningYearSelection
} from "../../lib/planningYears";
import {
  createVault,
  flushVaultSave,
  getVaultStatus,
  initializeStorage,
  reloadFromVault,
  resetStoredState,
  selectVault,
  snapshotVault
} from "../../lib/storage";
import type {
  AppSectionId,
  AppState,
  AssetProjection,
  AssetProjectionPoint,
  CombinedWealthDepotKey,
  CombinedWealthYear,
  InvestmentDepotKey,
  InvestmentSettings,
  PlanningAccount,
  PlanningSettings,
  PlanningYearSelection,
  PositionCostBreakdownItem,
  PositionTableFilterColumn,
  PositionTableFilterOperator,
  PositionTableView,
  RealEstateFinancingSourceSchedule,
  RealEstateFinancingResult,
  RealEstateFinancingSettings,
  RealEstatePaymentSourceKind,
  ReservePosition,
  StatutoryPensionScenarioId,
  ThemeMode
} from "../../types";
import { drawInvestmentChart } from "../../views/investmentChart";
import { renderAccountYearTableOverview } from "../../views/accountYearTables";
import {
  realEstatePopupHeading,
  realEstateRepaymentSegments,
  realEstateTrendSegments,
  type CombinedWealthLineId,
  type CombinedWealthLineVisibility,
  renderCombinedWealthChart,
  renderCombinedWealthLifeSummary,
  renderCombinedWealthPopup,
  renderRealEstateRepaymentChart,
  renderRealEstateTrendChart
} from "../../views/wealthCharts";
import { monthSelect, payoutSelect, positionIconSelect, positionTypeSelect } from "../../views/templates";
import {
  renderStatutoryPensionHtml,
  renderStatutoryPensionProjectionYearPopupHtml,
  renderStatutoryPensionTaxPopupHtml,
  renderStatutoryPensionYearPopupHtml
} from "../../views/statutoryPensionView";
import {
  configureIncomeTrackerHost,
  renderIncomeTracker,
  sanitizeIncomeYearEntriesWithTaxRules
} from "../income-tracker";
import {
  configureIncomePlanningHost,
  incomePlanningModelForActiveWeek,
  renderIncomePlanning,
  renderIncomeStampPlanner,
  startIncomePlanningCurrentTimeTicker
} from "../income-planning";
import {
  clearSelfEmploymentGanttEditorForDeletedNodes,
  configureSelfEmploymentHost,
  renderSelfEmploymentDashboard,
  renderSelfEmploymentIconPicker,
  selfEmploymentProjectById,
  updateSelfEmploymentProject
} from "../self-employment";
import { configureBusinessCanvasHost } from "../self-employment/business-canvas";
import { INVESTMENT_DEPOTS } from "../investment/config";
import { COMBINED_DEPOTS } from "../combined-wealth/config";
import {
  csvFileContents,
  cssEscape,
  downloadText,
  ensureCsvExtension,
  formControl,
  isDeferredModelInput,
  isTauriRuntime,
  setDetailLineHidden,
  setInputBounds,
  setInputValue,
  setRangeLabel,
  setSectionHidden,
  setText
} from "./runtimeDom";
import {
  CHILD_DEPOT_DEFAULT_PAYOUT_AGE,
  clampRetirementAge,
  combineAssetProjections,
  investmentMax,
  investmentMaxForDepot,
  investmentMin,
  investmentMinForDepot,
  payoutYearsForRetirementAge,
  retirementAgeMaxForPayoutEndAge
} from "./investmentRuntime";
import {
  normalizePlanningEndDate,
  planningDateParts,
  planningSettingNumberValue
} from "./planningRuntime";
import {
  finiteIntegerInRange,
  finiteNumber,
  normalizePayoutType
} from "./positionRuntime";
import {
  normalizeCombinedWealthState,
  statutoryPensionScenarioIdFromValue
} from "./stateRuntime";

let root: HTMLDivElement;
let appContext: AppContext;
let renderScheduler: RenderScheduler;
const depotAssetProjectionCache = new Map<string, AssetProjection>();
const MAX_REAL_ESTATE_PROJECTION_YEARS = 80;
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
interface ReserveChartTotals {
  income: number;
  expense: number;
  reserve: number;
  savings: number;
  remaining: number;
}

interface ReserveChartModel {
  totals: ReserveChartTotals;
  insight: string;
}

interface PositionFilterDraft {
  column: PositionTableFilterColumn;
  operator: PositionTableFilterOperator;
  value: string;
}

type RealEstateField = keyof RealEstateFinancingSettings;
type CombinedToggleKey = {
  [Key in keyof AppState["combinedWealth"]]: AppState["combinedWealth"][Key] extends boolean ? Key : never;
}[keyof AppState["combinedWealth"]];
type CombinedNumberKey = "statutoryPensionMonthlyAmount" | "statutoryPensionSavingsRatePercent";
type AccountDialogMode = "create" | "rename";
type AccountDialogState = {
  mode: AccountDialogMode;
  accountId: string | null;
  name: string;
  type: PlanningAccount["type"];
  error: string;
} | null;
let state = defaultAppState();
let draggedPositionId: string | null = null;
let exportStatusTimeoutId: number | undefined;
let selectedPositionMode: PositionTableMode = "expense";
let selectedIncomeCadence: PositionTableCadence = "monthly";
let selectedExpenseCadence: PositionTableCadence = "monthly";
let selectedReserveCadence: PositionTableCadence = "fixed";
let selectedSavingsCadence: PositionTableCadence = "monthly";
let showResultMaxNeeded = false;
let positionCostDialogId: string | null = null;
let positionIconPicker: { positionId: string; top: number; left: number } | null = null;
let positionFilterDrafts = createPositionFilterDrafts();
let positionFilterPopupOpen = false;
let selectedRealEstateYear: number | null = null;
let latestRealEstateResult: RealEstateFinancingResult | null = null;
let selectedCombinedWealthYear: number | null = null;
let latestCombinedWealthYears: CombinedWealthYear[] = [];
let combinedCashPopupAccountId: string | null = null;
let investmentIncludePopupOpen = false;
let investmentAccountContextId: string | null = null;
let renderAllRunning = false;
let combinedWealthLineVisibility: CombinedWealthLineVisibility = {
  pensionConsumedCumulative: true,
  taxCumulative: true,
  propertyValue: true,
  propertyDebt: true
};
let latestStatutoryPensionModel: StatutoryPensionModel | null = null;
let statutoryPensionTaxPopupScenarioId: StatutoryPensionScenarioId | null = null;
let accountDialog: AccountDialogState = null;

export async function startAppController(context: AppContext, features: readonly FeatureModule[]): Promise<void> {
  appContext = context;
  root = context.root;
  renderScheduler = createRenderScheduler(renderAll);
  appContext.scheduler = renderScheduler;
  appContext.store.subscribe((nextState) => {
    state = nextState;
  });
  configureIncomeTrackerHost({
    getState: () => appContext.store.getState(),
    persistCurrentState,
    renderAll,
    exportCsvFile
  });
  configureIncomePlanningHost({
    getState: () => appContext.store.getState(),
    persistCurrentState,
    renderAll,
    setActiveSection
  });
  configureSelfEmploymentHost({
    getState: () => appContext.store.getState(),
    syncStoreState,
    persistCurrentState,
    renderAll,
    incomePlanningModelForActiveWeek,
    activePlanningSettings,
    activePlanningPositions
  });
  configureBusinessCanvasHost({
    getState: () => appContext.store.getState(),
    projectById: selfEmploymentProjectById,
    updateSelfEmploymentProject,
    clearGanttEditorForDeletedNodes: clearSelfEmploymentGanttEditorForDeletedNodes,
    renderAll
  });
  await bootstrapApp(features);
}

async function bootstrapApp(features: readonly FeatureModule[]): Promise<void> {
  state = sanitizeAppState(defaultAppState());
  syncStoreState();
  applyInitialRoute();
  applyTheme();
  renderShell(root);
  updateModuleVisibility();
  bindEvents(features);
  try {
    state = await loadInitialState();
    syncStoreState();
    normalizeInvestmentBounds();
    applyInitialRoute();
    applyTheme();
    startIncomePlanningCurrentTimeTicker();
    syncAllInputsFromState();
    syncThemeControls();
    renderAll();
  } catch (error) {
    renderStartupError(error);
  }
}

function syncStoreState(): void {
  appContext.store.replaceState(state, { notify: false });
}

function persistCurrentState(): void {
  syncStoreState();
  appContext.store.persistNow();
}

async function loadInitialState(): Promise<AppState> {
  try {
    return sanitizeAppState(await initializeStorage());
  } catch (error) {
    console.warn("Stored state could not be loaded; falling back to defaults.", error);
    return sanitizeAppState(defaultAppState());
  }
}

function renderStartupError(error: unknown): void {
  console.error("BlobFin startup failed.", error);
  const message = error instanceof Error ? error.message : String(error);
  root.innerHTML = `
    <main class="app-main">
      <section class="panel" data-module-section="home">
        <div class="section-heading">
          <div>
            <p class="eyebrow">BlobFin konnte nicht gestartet werden</p>
            <h1>Beim Initialisieren ist ein Fehler aufgetreten.</h1>
            <p>${escapeHtml(message)}</p>
          </div>
        </div>
      </section>
    </main>
  `;
}

function sanitizeAppState(appState: AppState): AppState {
  const fallbackUi = {
    activeSection: "home" as AppSectionId,
    selectedPlanningYear: null as PlanningYearSelection,
    selectedPlanningAccountId: "default-account",
    selectedInvestmentAccountId: "default-account",
    selectedRealEstateAccountIds: ["default-account"],
    selectedRealEstateWithdrawalGainAccountIds: ["default-account"],
    selectedCombinedAccountIds: ["default-account"],
    selectedCombinedLeadInvestmentAccountId: "default-account",
    settingsVaultExpanded: false,
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
  const normalizedCombinedLeadInvestmentAccountId = accountIds.includes(selectedCombinedLeadInvestmentAccountId)
    ? selectedCombinedLeadInvestmentAccountId
    : selectedInvestmentAccountId;
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
  const incomeTracker = appState.incomeTracker ?? defaultIncomeTrackerState();
  const incomePlanning = appState.incomePlanning ?? defaultIncomePlanningState();
  const selfEmployment = appState.selfEmployment ?? defaultSelfEmploymentState();

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
      selectedPlanningYear: sanitizePlanningYearSelection(ui.selectedPlanningYear, appState.settings.year),
      activeSection: appSectionIdFromValue(ui.activeSection) ?? "home"
    },
    combinedWealth: normalizeCombinedWealthState(
      appState.combinedWealth,
      accountIds,
      selectedInvestmentAccountId
    ),
    positions,
    investmentByAccountId,
    investment,
    incomePlanning,
    selfEmployment,
    incomeTracker: {
      ...incomeTracker,
      yearlyEntries: sanitizeIncomeYearEntriesWithTaxRules(incomeTracker.yearlyEntries)
    }
  };
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

function selectedCombinedCashPlanningAccount(): PlanningAccount | null {
  const account =
    (state.combinedWealth.cashAccountId ? planningAccountById(state.combinedWealth.cashAccountId) : null) ??
    planningAccountById(state.ui.selectedPlanningAccountId) ??
    state.planningAccounts[0] ??
    null;
  if (account && state.combinedWealth.cashAccountId !== account.id) {
    state.combinedWealth = { ...state.combinedWealth, cashAccountId: account.id };
  }
  return account;
}

function selectedCombinedLeadInvestmentPlanningAccount(): PlanningAccount | null {
  const leadId = state.ui.selectedCombinedLeadInvestmentAccountId;
  const lead =
    planningAccountById(leadId) ??
    planningAccountById(state.ui.selectedInvestmentAccountId) ??
    state.planningAccounts[0] ??
    null;
  if (!lead) return null;
  if (state.ui.selectedCombinedLeadInvestmentAccountId !== lead.id) {
    state.ui = { ...state.ui, selectedCombinedLeadInvestmentAccountId: lead.id };
  }
  return lead;
}

function normalizeActivePlanningYear(): void {
  const selectedPlanningYear = sanitizePlanningYearSelection(state.ui.selectedPlanningYear, state.settings.year);
  if (selectedPlanningYear !== state.ui.selectedPlanningYear) {
    state.ui = { ...state.ui, selectedPlanningYear };
  }
}

function activePlanningYear(): PlanningYearSelection {
  return sanitizePlanningYearSelection(state.ui.selectedPlanningYear, state.settings.year);
}

function activePlanningSettings(): PlanningSettings {
  return {
    ...state.settings,
    year: activePlanningYear() ?? state.settings.year
  };
}

function activePlanningYearLabel(): string {
  const year = activePlanningYear();
  return year === null ? "Start" : String(year);
}

function activePlanningPositions(): ReservePosition[] {
  return positionsForPlanningYearWithMonthlySavingsCarryover(
    state.positions,
    activePlanningYear(),
    state.settings.year
  );
}

function planningAccountForActiveYear(account: PlanningAccount): PlanningAccount {
  return {
    ...account,
    yearlyRows: positionsForPlanningYearWithMonthlySavingsCarryover(
      account.yearlyRows,
      activePlanningYear(),
      state.settings.year
    )
  };
}

function planningAccountsForActiveYear(): PlanningAccount[] {
  return state.planningAccounts.map(planningAccountForActiveYear);
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
  const normalizedCombinedLeadInvestmentAccountId = accountIds.includes(selectedCombinedLeadInvestmentAccountId)
    ? selectedCombinedLeadInvestmentAccountId
    : selectedInvestmentAccountId;

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
  state.combinedWealth = normalizeCombinedWealthState(
    state.combinedWealth,
    accountIds,
    normalizedCombinedLeadInvestmentAccountId
  );
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

function applyInitialRoute(): void {
  const section = appContext.router.currentSection() ?? "home";
  state.ui = { ...state.ui, activeSection: section };
  appContext.router.replaceSection(section);
}

function setActiveSection(section: AppSectionId, options: { updateHistory?: boolean } = {}): void {
  const activeSection = appContext.router.sectionFromValue(section) ?? "home";
  state.ui = { ...state.ui, activeSection };
  if (options.updateHistory !== false) {
    appContext.router.pushSection(activeSection);
  }
  hideThemeSettings();
  hideStatutoryPensionTaxPopup();
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

function bindEvents(features: readonly FeatureModule[]): void {
  bindAppEvents(appContext, features, {
    onInput: handleAppInput,
    onChange: handleAppChange,
    onClick: handleAppClick,
    onWindowKeyDown: handleAppWindowKeyDown
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
  appContext.router.subscribe((nextSection) => {
    const section = nextSection ?? "home";
    setActiveSection(section, { updateHistory: false });
    renderAll();
  });
  window.addEventListener("resize", drawCurrentInvestmentChart);
}

function handleAppInput(event: Event): boolean | void {
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
      if (isDeferredModelInput(target)) return;
      updatePlanningSetting(target.dataset.setting as keyof PlanningSettings, target.value);
      requestRenderAll();
      return;
    }

    if (target.dataset.investment) {
      if (isDeferredModelInput(target)) return;
      updateInvestmentSetting(target.dataset.investment as keyof InvestmentSettings, target.value);
      requestRenderAll();
      return;
    }

    if (target.dataset.realEstateField) {
      const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
      updateRealEstateField(target.dataset.realEstateField as RealEstateField, value);
      requestRenderAll();
      return;
    }

    if (target.dataset.realEstateRange) {
      updateRealEstateField(target.dataset.realEstateRange as RealEstateField, target.value);
      requestRenderAll();
      return;
    }

    if (target.dataset.combinedNumber) {
      updateCombinedNumber(target.dataset.combinedNumber as CombinedNumberKey, target.value);
      persistCurrentState();
      return;
    }

    if (target.dataset.positionCostPositionId && target.dataset.positionCostItemId && target.dataset.positionCostField) {
      updatePositionCostBreakdownItem(
        target.dataset.positionCostPositionId,
        target.dataset.positionCostItemId,
        target.dataset.positionCostField,
        target.value
      );
      renderPositions();
      renderPositionCostDialogTotals(target.dataset.positionCostPositionId);
      persistCurrentState();
      return;
    }

    if (target.dataset.statutoryPensionScenario && target.dataset.statutoryPensionScenarioField) {
      updateStatutoryPensionScenarioField(
        target.dataset.statutoryPensionScenario as StatutoryPensionScenarioId,
        target.dataset.statutoryPensionScenarioField,
        target.value
      );
      syncStatutoryPensionRangeLabel(target);
      persistCurrentState();
      return;
    }

    if (target.dataset.retirementAge) {
      if (isDeferredModelInput(target)) return;
      updateRetirementAge(target.value);
      requestRenderAll();
    }
}

function handleAppChange(event: Event): boolean | void {
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

    if (target.dataset.setting) {
      const field = target.dataset.setting as keyof PlanningSettings;
      updatePlanningSetting(field, target.value);
      syncCommittedPlanningSettingInput(target, field);
      requestRenderAll();
      return;
    }

    if (target.dataset.investment) {
      const field = target.dataset.investment as keyof InvestmentSettings;
      updateInvestmentSetting(field, target.value);
      syncCommittedInvestmentSettingInput(target, field);
      requestRenderAll();
      return;
    }

    if (target.dataset.retirementAge) {
      updateRetirementAge(target.value);
      syncCommittedRetirementAgeInput(target);
      requestRenderAll();
      return;
    }

    if (target.dataset.realEstateField) {
      const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
      updateRealEstateField(target.dataset.realEstateField as RealEstateField, value);
      requestRenderAll();
      return;
    }

    if (target.dataset.positionCostPositionId && target.dataset.positionCostItemId && target.dataset.positionCostField) {
      updatePositionCostBreakdownItem(
        target.dataset.positionCostPositionId,
        target.dataset.positionCostItemId,
        target.dataset.positionCostField,
        target.value
      );
      requestRenderAll();
      return;
    }

    if (target.dataset.positionId && target.dataset.positionField) {
      const value = target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value;
      updatePosition(target.dataset.positionId, target.dataset.positionField as keyof ReservePosition, value);
      requestRenderAll();
      return;
    }

    if (target.dataset.includePosition && target instanceof HTMLInputElement) {
      toggleInvestmentPosition(target.dataset.includePosition, target.checked);
      renderInvestmentSelectionChange();
      return;
    }

    if (target.dataset.combinedCashPosition && target instanceof HTMLInputElement) {
      toggleCombinedCashPosition(target.dataset.combinedCashPosition, target.checked);
      requestRenderAll();
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
      requestRenderAll();
      return;
    }

    if (target.dataset.combinedToggle && target instanceof HTMLInputElement) {
      updateCombinedToggle(target.dataset.combinedToggle as CombinedToggleKey, target.checked);
      requestRenderAll();
      return;
    }

    if (target.dataset.combinedNumber) {
      updateCombinedNumber(target.dataset.combinedNumber as CombinedNumberKey, target.value);
      requestRenderAll();
      return;
    }

    if (target.dataset.statutoryPensionField) {
      updateStatutoryPensionField(target.dataset.statutoryPensionField, target.value);
      requestRenderAll();
      return;
    }

    if (target.dataset.statutoryPensionScenario && target.dataset.statutoryPensionScenarioField) {
      updateStatutoryPensionScenarioField(
        target.dataset.statutoryPensionScenario as StatutoryPensionScenarioId,
        target.dataset.statutoryPensionScenarioField,
        target.value
      );
      requestRenderAll();
      return;
    }

    if (target.id === "positionsCsvImport" && target instanceof HTMLInputElement) {
      void importPositionsFromFile(target.files?.[0]);
      target.value = "";
    }

}

function handleAppClick(event: MouseEvent): boolean | void {
    const target = event.target as HTMLElement | null;
    const statutoryPensionProjectionButton = target?.closest<HTMLButtonElement>(
      "button[data-statutory-pension-projection-year]"
    );
    if (statutoryPensionProjectionButton) {
      event.preventDefault();
      showStatutoryPensionProjectionYearPopup(
        numberValue(statutoryPensionProjectionButton.dataset.statutoryPensionProjectionYear || ""),
        event.clientX,
        event.clientY
      );
      return;
    }
    const statutoryPensionYearButton = target?.closest<HTMLButtonElement>("button[data-statutory-pension-year]");
    if (statutoryPensionYearButton) {
      event.preventDefault();
      showStatutoryPensionYearPopup(
        numberValue(statutoryPensionYearButton.dataset.statutoryPensionYear || ""),
        event.clientX,
        event.clientY
      );
      return;
    }
    const button = target?.closest<HTMLButtonElement>("button[data-action]");
    if (!button) {
      if (positionIconPicker && !target?.closest("#positionIconPicker")) {
        hidePositionIconPicker();
      }
      if (positionFilterPopupOpen && !target?.closest("#positionFilterPopup")) {
        hidePositionFilterPopup();
      }
      if (!target?.closest("#statutoryPensionYearPopup")) {
        hideStatutoryPensionYearPopup();
      }
      if (!target?.closest("#statutoryPensionProjectionYearPopup")) {
        hideStatutoryPensionProjectionYearPopup();
      }
      if (!target?.closest("#combinedWealthChartPopup")) {
        hideCombinedWealthPopup();
      }
      if (target?.id === "combinedCashPositionPopup" || !target?.closest("#combinedCashPositionPopup")) {
        hideCombinedCashPositionPopup();
      }
      if (
        investmentIncludePopupOpen &&
        !target?.closest("#investmentIncludePopup") &&
        !target?.closest("[data-action='toggle-investment-include-popup']")
      ) {
        hideInvestmentIncludePopup();
      }
      if (!target?.closest("#baseDataPopup")) {
        hideBaseDataPopup();
      }
      return;
    }

    event.preventDefault();
    const action = button.dataset.action;
    if (action !== "open-position-icon-picker" && action !== "select-position-icon") {
      hidePositionIconPicker();
    }
    if (positionFilterPopupOpen && action !== "toggle-position-filter" && !button.closest("#positionFilterPopup")) {
      hidePositionFilterPopup();
    }
    if (action !== "close-statutory-pension-year-popup" && !button.closest("#statutoryPensionYearPopup")) {
      hideStatutoryPensionYearPopup();
    }
    if (action !== "close-statutory-pension-projection-popup" && !button.closest("#statutoryPensionProjectionYearPopup")) {
      hideStatutoryPensionProjectionYearPopup();
    }
    if (action !== "close-combined-wealth-popup" && !button.closest("#combinedWealthChartPopup")) {
      hideCombinedWealthPopup();
    }
    if (
      action !== "close-combined-cash-position-popup" &&
      !action?.startsWith("select-combined-cash-account-") &&
      !button.closest("#combinedCashPositionPopup")
    ) {
      hideCombinedCashPositionPopup();
    }
    if (
      investmentIncludePopupOpen &&
      action !== "toggle-investment-include-popup" &&
      action !== "close-investment-include-popup" &&
      !button.closest("#investmentIncludePopup")
    ) {
      hideInvestmentIncludePopup();
    }
    if (
      action !== "open-base-data-popup" &&
      action !== "close-base-data-popup" &&
      !button.closest("#baseDataPopup")
    ) {
      hideBaseDataPopup();
    }
    if (action === "add-position") addPosition();
    if (action === "reset") resetState();
    if (action === "select-planning-year") {
      setSelectedPlanningYear(button.dataset.planningYear || "start");
      return;
    }
    if (action === "show-income-positions") setSelectedPositionMode("income");
    if (action === "show-expense-positions") setSelectedPositionMode("expense");
    if (action?.startsWith("set-position-cadence-")) {
      setSelectedPositionCadence(action.replace("set-position-cadence-", "") as PositionTableCadence);
    }
    if (action?.startsWith("open-position-cost-dialog-")) {
      openPositionCostDialog(action.replace("open-position-cost-dialog-", ""));
    }
    if (action === "close-position-cost-dialog") closePositionCostDialog();
    if (action === "add-position-cost-item") addPositionCostBreakdownItem(button.dataset.positionId || "");
    if (action === "remove-position-cost-item") {
      removePositionCostBreakdownItem(button.dataset.positionId || "", button.dataset.positionCostItemId || "");
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
    if (action?.startsWith("select-combined-cash-account-")) {
      selectCombinedCashAccount(action.replace("select-combined-cash-account-", ""));
      renderAll();
      return;
    }
    if (action?.startsWith("select-combined-lead-account-")) {
      selectCombinedLeadInvestmentAccount(action.replace("select-combined-lead-account-", ""));
    }
    if (action === "toggle-combined-depot") {
      toggleCombinedDepot(button.dataset.combinedDepot as CombinedWealthDepotKey | undefined);
      renderAll();
      return;
    }
    if (action === "select-combined-pension-scenario") {
      selectCombinedPensionScenario(button.dataset.combinedPensionScenario as StatutoryPensionScenarioId | undefined);
      renderAll();
      return;
    }
    if (action === "toggle-result-max-needed") toggleResultMaxNeeded();
    if (action === "set-investment-depot-standard") setInvestmentDepot("standard");
    if (action === "set-investment-depot-retirement") setInvestmentDepot("retirement");
    if (action === "set-investment-depot-child") setInvestmentDepot("child");
    if (action === "toggle-retirement-depot-allowance") {
      toggleRetirementDepotAllowance();
      return;
    }
    if (action === "toggle-investment-include-popup") toggleInvestmentIncludePopup();
    if (action === "close-investment-include-popup") hideInvestmentIncludePopup();
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
    if (action === "close-investment-chart-popup") hideInvestmentChartPopup();
    if (action === "close-statutory-pension-year-popup") hideStatutoryPensionYearPopup();
    if (action === "close-statutory-pension-projection-popup") hideStatutoryPensionProjectionYearPopup();
    if (action === "close-combined-wealth-popup") hideCombinedWealthPopup();
    if (action === "close-combined-cash-position-popup") hideCombinedCashPositionPopup();
    if (action === "open-statutory-pension-tax-popup") {
      openStatutoryPensionTaxPopup(button.dataset.statutoryPensionScenario as StatutoryPensionScenarioId);
      return;
    }
    if (action === "close-statutory-pension-tax-popup") {
      closeStatutoryPensionTaxPopup();
      return;
    }
    if (action === "toggle-theme-settings") toggleThemeSettings();
    if (action === "toggle-settings-vault") toggleSettingsVault();
    if (action === "vault-select") {
      void handleVaultSelect();
      return;
    }
    if (action === "vault-create") {
      void handleVaultCreate();
      return;
    }
    if (action === "vault-save-now") {
      void handleVaultSaveNow();
      return;
    }
    if (action === "vault-reload") {
      void handleVaultReload();
      return;
    }
    if (action === "vault-snapshot") {
      void handleVaultSnapshot();
      return;
    }
    if (action === "toggle-settings-grunddaten") toggleSettingsGrunddaten();
    if (action === "close-theme-settings") hideThemeSettings();
    if (action === "open-base-data-popup") openBaseDataPopup();
    if (action === "close-base-data-popup") hideBaseDataPopup();
    if (action === "open-position-icon-picker") showPositionIconPicker(button);
    if (action === "close-position-icon-picker") hidePositionIconPicker();
    if (action === "select-position-icon") {
      selectPositionIcon(button.dataset.positionId || "", button.dataset.positionIcon || "");
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
    if (action === "toggle-combined-wealth-line") {
      toggleCombinedWealthLine(button.dataset.combinedWealthLine as CombinedWealthLineId | undefined);
      return;
    }
    if (action === "select-combined-wealth-year") {
      const year = numberValue(button.dataset.year || "");
      selectCombinedWealthYearWithPopup(year, event.clientX, event.clientY);
      return;
    }
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
        exportYearTableCsv(activePlanningSettings(), activePlanningPositions(), showResultMaxNeeded),
        "Jahrestabellen-Export"
      );
    }
}

function handleAppWindowKeyDown(event: KeyboardEvent): boolean | void {
  if (event.key === "Escape") {
    hideThemeSettings();
    hideInvestmentChartPopup();
    hideCombinedWealthPopup();
    hideCombinedCashPositionPopup();
    hideBaseDataPopup();
    hideStatutoryPensionYearPopup();
    hideStatutoryPensionProjectionYearPopup();
    closeStatutoryPensionTaxPopup();
    hideInvestmentIncludePopup();
    hidePositionFilterPopup();
    closePlanningAccountDialog();
  }
}

function requestRenderAll(): void {
  renderScheduler.request();
}

function clearInvestmentProjectionCaches(): void {
  depotAssetProjectionCache.clear();
}

function renderAll(): void {
  if (renderAllRunning) {
    requestRenderAll();
    return;
  }
  renderScheduler.cancel();
  clearInvestmentProjectionCaches();
  renderAllRunning = true;
  try {
    syncActivePlanningAccountFromPositions();
    syncPositionsFromActivePlanningAccount();
    normalizeActivePlanningYear();
    synchronizeAccountScopedState();
    normalizeInvestmentBounds();
    normalizeInvestmentDepotSelections();
    normalizeInvestmentSelectionIds();
    normalizeRealEstateSourceIds();
    normalizeCombinedCashPositionIds();
    state.investmentByAccountId = {
      ...state.investmentByAccountId,
      [state.ui.selectedInvestmentAccountId]: state.investment
    };
    updateModuleVisibility();
    renderPlanningAccounts();
    renderPlanningYearNavigation();
    const planningSettings = activePlanningSettings();
    const activeReserve = calculateReserveSummary(planningSettings, activePlanningPositions());
    renderPositions();
    renderPositionCostDialog();
    renderInvestmentIncludeList();
    renderCalculations(activeReserve);
    renderSelfEmploymentDashboard();
    renderSelfEmploymentIconPicker();
    syncPlanningInputsFromState();
    syncRealEstateInputsFromState();
    syncCombinedToggleInputsFromState();
    syncInvestmentInputsFromState();
    syncSettingsAccordionState();
    renderIncomeTracker();
    renderIncomePlanning();
    renderIncomeStampPlanner();
    persistCurrentState();
  } finally {
    renderAllRunning = false;
  }
}

function renderCalculations(activeReserve: ReturnType<typeof calculateReserveSummary>): void {
  const standardProjection = buildDepotAssetProjection("standard");
  const retirementProjection = buildDepotAssetProjection("retirement");
  const childProjection = buildDepotAssetProjection("child");
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
  setText("retirementDepotFundingStatus", projection.retirementDepotAllowanceEnabled ? "Zulage ein" : "Zulage aus");
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
    ? buildDepotAssetProjection("standard", combinedLeadAccount.id)
    : combinedProjectionWithoutAccounts(standardProjection);
  const combinedRetirementProjection = combinedLeadAccount
    ? buildDepotAssetProjection("retirement", combinedLeadAccount.id)
    : combinedProjectionWithoutAccounts(retirementProjection);
  const combinedDepotProjections = combinedDepotProjectionInputs(combinedLeadAccount);
  const combinedBirthYear = combinedLeadSettings?.birthYear ?? state.settings.year;
  const combinedRetirementBirthYear = combinedLeadSettings?.retirementBirthYear ?? state.settings.year;
  const combinedRealEstateStartYear = realEstateFinancingStartYear(
    state.settings.year,
    combinedBirthYear,
    state.realEstate.financingStartAge
  );
  renderStatutoryPensionCalculations(combinedBirthYear);
  const combinedRealEstateProjectionYears = currentCombinedRealEstateProjectionYears(
    combinedRealEstateStartYear,
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
  renderCombinedModuleControls();
  const combinedRealEstateActive = state.realEstate.purchaseActivated && state.combinedWealth.includeRealEstateFinancing;
  const combinedRealEstate = combinedRealEstateActive
    ? calculateRealEstateFinancing(
        combinedRealEstateStartYear,
        state.realEstate,
        realEstateSourceSchedule(
          combinedRealEstateStartYear,
          combinedRealEstateProjectionYears,
          state.ui.selectedRealEstateAccountIds
        ),
        {
          projectionYears: combinedRealEstateProjectionYears,
          maxProjectionYears: combinedRealEstateProjectionYears
        }
      )
    : inactiveCombinedRealEstateResult(combinedRealEstateStartYear);
  const combinedYears = calculateCombinedWealthYears(
    combinedRealEstate,
    combinedDepotProjections,
    combinedPensionInput(latestStatutoryPensionModel, combinedBirthYear)
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
  setText("detailBequestReserveLabel", isChild ? "Reserve zum Auszahlungsalter" : "Reserve/Erbe zum Enddatum");
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
  const financingYearsText = realEstateFinancingYearsText(result);
  setText(
    "realEstateCalculatedEndAgeMetric",
    finalLoanYear && finalLoanYear.loanEnd <= 0 ? `${intNumber(actualFinancingEndAge)} Jahre` : "nicht getilgt"
  );
  setText("realEstateFinancingYearsMetric", financingYearsText);

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

function realEstateFinancingYearsText(result: RealEstateFinancingResult | null): string {
  if (!result) return "-";
  const actualFinancingStartYear =
    realEstateActualPaymentStartYear(result) ?? result.years[0]?.year ?? currentRealEstateFinancingStartYear();
  const actualFinancingStartAge = Math.max(0, actualFinancingStartYear - state.investment.birthYear);
  const actualFinancingEndAge = Math.max(actualFinancingStartAge, result.financingEndYear - state.investment.birthYear);
  return `${intNumber(actualFinancingStartAge)} -> ${intNumber(actualFinancingEndAge)} | ${intNumber(result.financingYears)} Jahre`;
}

function currentRealEstateProjectionYears(startYear: number, investmentEndAge: number): number {
  const investmentEndYear = state.investment.birthYear + Math.floor(investmentEndAge);
  const saleYear = state.realEstate.plannedSaleYear;
  const rawProjectionEndYear = saleYear !== null && saleYear >= startYear ? Math.round(saleYear) : investmentEndYear;
  const projectionEndYear = Math.min(rawProjectionEndYear, planningEndYear());
  return clamp(Math.round(projectionEndYear - startYear + 1), 1, 80);
}

function currentRealEstateMaximumProjectionYears(startYear: number): number {
  const saleYear = state.realEstate.plannedSaleYear;
  const globalProjectionYears = clamp(
    Math.round(planningEndYear() - startYear + 1),
    1,
    MAX_REAL_ESTATE_PROJECTION_YEARS
  );
  if (saleYear !== null && saleYear >= startYear) {
    return Math.min(clamp(Math.round(saleYear - startYear + 1), 1, MAX_REAL_ESTATE_PROJECTION_YEARS), globalProjectionYears);
  }
  return globalProjectionYears;
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
  const rawProjectionEndYear =
    saleYear !== null && saleYear >= startYear ? Math.min(Math.round(saleYear), combinedEndYear) : combinedEndYear;
  const projectionEndYear = Math.min(rawProjectionEndYear, planningEndYear());
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
    const projection = buildDepotAssetProjection("standard", account.id);
    const withdrawalStartYear = realEstateWithdrawalStartYear(projection, settings);
    const withdrawalEndYear = Math.min(planningEndYear(), settings.birthYear + Math.floor(projection.endAge));
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

function selectedCombinedCashPositions(account = selectedCombinedCashPlanningAccount()): ReservePosition[] {
  if (!account) return [];
  const selectedIds = new Set(state.combinedWealth.cashPositionIds);
  return combinedCashSelectablePositions(account).filter((position) => selectedIds.has(position.id));
}

function combinedCashSelectablePositions(account = selectedCombinedCashPlanningAccount()): ReservePosition[] {
  if (!account) return [];
  const blockedIds = combinedCashBlockedPositionIds();
  return account.yearlyRows.filter(
    (position) =>
      position.active &&
      position.type === "savings" &&
      positionFlow(position) === "expense" &&
      !blockedIds.has(position.id)
  );
}

function combinedCashBlockedPositionIds(): Set<string> {
  return new Set([...investmentSelectedPositionIds(), ...realEstateSelectedSourceIds()]);
}

function combinedCashSelectedPositionIds(): Set<string> {
  return new Set(state.combinedWealth.cashPositionIds);
}

function calculateCombinedWealthYears(
  realEstate: RealEstateFinancingResult,
  depotProjections: CombinedWealthDepotProjection[],
  pension: ReturnType<typeof combinedPensionInput>
): CombinedWealthYear[] {
  const depotEndYear = depotProjections.reduce(
    (maxYear, depot) => Math.max(maxYear, depot.birthYear + depot.projection.endAge),
    state.settings.year
  );
  const pensionEndYear = pension.enabled ? pension.retirementYear + 35 : state.settings.year;
  const realEstateEndYear = realEstate.years.at(-1)?.year ?? state.settings.year;
  const horizonYears = combinedWealthHorizonYears(
    state.settings.year,
    Math.max(depotEndYear, realEstateEndYear),
    pensionEndYear,
    planningEndYear()
  );

  const cashContribution = combinedCashContribution(horizonYears, selectedCombinedCashPlanningAccount());

  return buildCombinedWealthSeries({
    startYear: state.settings.year,
    horizonYears,
    cashStartValue: cashContribution.cashStartValue,
    yearlyCashDelta: cashContribution.yearlyCashDelta,
    yearlyCashDeltas: cashContribution.yearlyCashDeltas,
    realEstateSaleYear: state.realEstate.purchaseActivated && state.combinedWealth.includeRealEstateFinancing
      ? state.realEstate.plannedSaleYear
      : null,
    realEstateEstimatedSaleValue: state.realEstate.estimatedSaleValue,
    realEstateEquityCapital: realEstate.equityCapital,
    realEstateStartValue: realEstate.effectivePropertyStartValue,
    depotProjections,
    pension,
    realEstateYears: realEstate.years,
    toggles: state.combinedWealth
  });
}

function inactiveCombinedRealEstateResult(startYear: number): RealEstateFinancingResult {
  return {
    years: [],
    months: [],
    startLoanAmount: 0,
    equityCapital: 0,
    monthlyPayment: 0,
    derivedInitialRepaymentPercent: 0,
    annualSpecialRepayment: 0,
    effectivePropertyStartValue: 0,
    totalProjectCost: 0,
    totalInterestDue: 0,
    totalInterestPaid: 0,
    totalInterestShortfall: 0,
    totalLoanCost: 0,
    financingYears: 0,
    projectionYears: 0,
    financingEndYear: startYear,
    projectionEndYear: startYear,
    validationErrors: []
  };
}

function combinedDepotProjectionInputs(account: PlanningAccount | null): CombinedWealthDepotProjection[] {
  if (!account) return [];
  return selectedCombinedDepotKeys().map((key) => {
    const projection = buildDepotAssetProjection(key, account.id);
    const settings = depotInvestmentSettingsForAccount(key, account.id);
    return {
      id: key,
      label: depotLabel(key),
      projection,
      birthYear: settings.birthYear
    };
  });
}

function combinedPensionInput(model: StatutoryPensionModel | null, birthYear: number): {
  enabled: boolean;
  retirementYear: number;
  monthlyAmount: number;
  annualTax: number;
  savingsRatePercent: number;
} {
  const scenarioId = state.combinedWealth.statutoryPensionScenario;
  const scenario = model?.scenarios.find((item) => item.id === scenarioId);
  const scenarioSettings = state.statutoryPension.scenarios[scenarioId];
  const retirementYear = scenario?.retirementYear ?? birthYear + scenarioSettings.retirementAge;
  const scenarioNetPension = Math.max(0, scenario?.netMonthlyPension ?? 0);
  const pensionTaxScale =
    scenarioNetPension > 0 ? state.combinedWealth.statutoryPensionMonthlyAmount / scenarioNetPension : 0;
  return {
    enabled: state.combinedWealth.includeStatutoryPension,
    retirementYear,
    monthlyAmount: state.combinedWealth.statutoryPensionMonthlyAmount,
    annualTax: Math.max(0, scenario?.incomeTaxMonthly ?? 0) * Math.max(0, pensionTaxScale) * 12,
    savingsRatePercent: state.combinedWealth.statutoryPensionSavingsRatePercent
  };
}

function combinedCashContribution(horizonYears: number, account: PlanningAccount | null): {
  cashStartValue: number;
  yearlyCashDelta: number;
  yearlyCashDeltas: number[];
} {
  const cashStartValue = 0;
  const yearlyCashDeltas = Array.from({ length: Math.max(1, horizonYears) }, () => 0);

  if (account && state.combinedWealth.includeCashPositions) {
    const selectedPositions = selectedCombinedCashPositions(account);
    const selectedIds = state.combinedWealth.cashPositionIds;
    for (let yearOffset = 0; yearOffset < yearlyCashDeltas.length; yearOffset += 1) {
      yearlyCashDeltas[yearOffset] = selectedSavingsContributionForProjectionYear(
        selectedPositions,
        selectedIds,
        state.settings.year,
        yearOffset
      );
    }
  }

  const yearlyCashDelta = yearlyCashDeltas[0] ?? 0;
  if (!Number.isFinite(cashStartValue) || !Number.isFinite(yearlyCashDelta)) {
    return { cashStartValue: 0, yearlyCashDelta: 0, yearlyCashDeltas };
  }

  return { cashStartValue, yearlyCashDelta, yearlyCashDeltas };
}

function renderCombinedWealthCalculations(years: CombinedWealthYear[]): void {
  latestCombinedWealthYears = years;
  if (!selectedCombinedWealthYear && years.length) {
    selectedCombinedWealthYear = years[years.length - 1].year;
  }
  if (selectedCombinedWealthYear && !years.some((entry) => entry.year === selectedCombinedWealthYear)) {
    selectedCombinedWealthYear = years[years.length - 1]?.year ?? null;
  }

  const chartHost = document.querySelector<HTMLDivElement>("#combinedWealthChart");
  if (chartHost) {
    chartHost.innerHTML = renderCombinedWealthChart({
      points: years,
      selectedYear: selectedCombinedWealthYear,
      lineVisibility: combinedWealthLineVisibility,
      formatMoney: (value) => money(value)
    });
  }

  const detail = document.querySelector<HTMLDivElement>("#combinedWealthLifeSummary");
  if (!detail) return;
  detail.innerHTML = renderCombinedWealthLifeSummary({
    points: years,
    taxesAndDeductions: combinedTaxesAndDeductions(years),
    formatMoney: (value) => money(value),
    formatInt: (value) => intNumber(value)
  });
}

function combinedTaxesAndDeductions(years: CombinedWealthYear[]): number {
  if (!years.length) return 0;
  const startYear = years[0].year;
  const endYear = years[years.length - 1].year;
  return state.incomeTracker.yearlyEntries.reduce((sum, entry) => {
    if (!entry.active || entry.year < startYear || entry.year > endYear) return sum;
    return sum + incomeYearEntryTaxTotal(entry);
  }, 0);
}

function toggleCombinedWealthLine(lineId: CombinedWealthLineId | undefined): void {
  if (!lineId || !(lineId in combinedWealthLineVisibility)) return;
  combinedWealthLineVisibility = {
    ...combinedWealthLineVisibility,
    [lineId]: !combinedWealthLineVisibility[lineId]
  };
  renderCombinedWealthCalculations(latestCombinedWealthYears);
}

function renderStatutoryPensionCalculations(birthYear: number): void {
  const host = document.querySelector<HTMLDivElement>("#statutoryPensionSection");
  if (!host) return;
  hideStatutoryPensionYearPopup();
  hideStatutoryPensionProjectionYearPopup();
  const statutoryPensionDerivedSettings = statutoryPensionDerivedSettingsFromLatestContribution(
    state.incomeTracker,
    state.statutoryPension
  );
  const model = buildStatutoryPensionModel({
    tracker: state.incomeTracker,
    settings: statutoryPensionDerivedSettings.settings,
    currentYear: state.settings.year,
    birthYear
  });
  latestStatutoryPensionModel = model;
  host.innerHTML = renderStatutoryPensionHtml(model, statutoryPensionDerivedSettings.settings, statutoryPensionDerivedSettings.sourceYear);
  renderStatutoryPensionTaxPopup(model);
}

function renderStatutoryPensionTaxPopup(model: StatutoryPensionModel): void {
  const host = document.querySelector<HTMLDivElement>("#statutoryPensionTaxPopup");
  if (!host) return;
  if (!statutoryPensionTaxPopupScenarioId) {
    host.innerHTML = "";
    host.hidden = true;
    return;
  }
  const html = renderStatutoryPensionTaxPopupHtml(model, statutoryPensionTaxPopupScenarioId);
  if (!html) {
    hideStatutoryPensionTaxPopup();
    return;
  }
  host.innerHTML = html;
  host.hidden = false;
}

function renderPositions(): void {
  renderPositionModeControls();
  normalizeCurrentPositionTableViewColumns();
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
        <td class="position-empty" colspan="${positionTableColumnCount(selectedPositionMode, activePositionCadence())}">
          Noch keine ${positionModeEmptyLabel(selectedPositionMode, activePositionCadence())} angelegt.
        </td>
      </tr>
    `;
    renderPositionIconPicker();
    return;
  }

  if (!positions.length) {
    body.innerHTML = `
      <tr>
        <td class="position-empty" colspan="${positionTableColumnCount(selectedPositionMode, activePositionCadence())}">
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
      const showTypeColumn = positionTableShowsTypeColumn(selectedPositionMode);
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
          <td class="planning-year-cell">${positionPlanningYearSelect(position)}</td>
          <td class="name-cell"><input class="name-input" value="${escapeHtml(position.name)}" data-position-id="${
            position.id
          }" data-position-field="name" /></td>
          ${showTypeColumn ? `<td>${positionTypeSelect(position)}</td>` : ""}
          <td>${positionAmountCell(position)}</td>
          ${isIncome ? incomeDateCells(position) : expenseDateCells(position)}
          <td>${payoutSelect(position)}</td>
          ${positionTableShowsPayoutMonthColumn(position) ? `<td>${monthSelect(position.id, "payoutMonth", position.payoutMonth)}</td>` : ""}
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
    combinedLeadAccountSelector.innerHTML = state.planningAccounts.length
      ? state.planningAccounts
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
      : '<span class="chart-empty">Noch kein Konto vorhanden.</span>';
  }

  summary.textContent = `Konten gesamt: ${state.planningAccounts.length} | mixed: ${totalsByType.mixed} | cost_reserve: ${totalsByType.costReserve} | annual_table: ${totalsByType.annualTable}`;
  yearAccountName.textContent = `(aktiv: ${activeAccount.name}, ${activePlanningYearLabel()})`;
  renderPlanningAccountDialog();
}

function renderPlanningYearNavigation(): void {
  const host = document.querySelector<HTMLDivElement>("#planningYearNavigation");
  const label = document.querySelector<HTMLSpanElement>("#planningYearActiveLabel");
  if (!host) return;

  const selectedYear = activePlanningYear();
  const currentYear = new Date().getFullYear();
  const yearButtons = planningYearOptions(state.settings.year)
    .map((year) => {
      const active = selectedYear === year;
      const current = currentYear === year;
      return `
        <button
          class="planning-year-button ${active ? "active" : ""} ${current ? "current" : ""}"
          type="button"
          data-action="select-planning-year"
          data-planning-year="${year}"
          aria-pressed="${active}"
        >${year}</button>
      `;
    })
    .join("");

  host.innerHTML = `
    <button
      class="planning-year-button ${selectedYear === null ? "active" : ""}"
      type="button"
      data-action="select-planning-year"
      data-planning-year="start"
      aria-pressed="${selectedYear === null}"
    >Start</button>
    ${yearButtons}
  `;
  if (label) label.textContent = activePlanningYearLabel();
}

function renderCombinedModuleControls(): void {
  const cashSelector = document.querySelector<HTMLDivElement>("#combinedCashAccountSelector");
  const leadSelector = document.querySelector<HTMLDivElement>("#combinedLeadInvestmentAccountSelector");
  const depotSelector = document.querySelector<HTMLDivElement>("#combinedDepotSelector");
  const pensionSelector = document.querySelector<HTMLDivElement>("#combinedPensionScenarioSelector");
  const cashAccount = selectedCombinedCashPlanningAccount();

  if (cashSelector) {
    cashSelector.innerHTML = state.planningAccounts.length
      ? orderedCombinedCashAccounts(cashAccount)
          .map((account) => {
            const active = cashAccount?.id === account.id;
            return `
              <button
                class="planning-account-card ${active ? "active" : ""}"
                type="button"
                data-action="select-combined-cash-account-${account.id}"
                aria-pressed="${active}"
                aria-haspopup="dialog"
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

  if (leadSelector) {
    const leadAccount = selectedCombinedLeadInvestmentPlanningAccount();
    leadSelector.innerHTML = state.planningAccounts.length
      ? state.planningAccounts
          .map((account) => {
            const active = leadAccount?.id === account.id;
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
      : '<span class="chart-empty">Noch kein Konto vorhanden.</span>';
  }

  if (depotSelector) {
    const selectedKeys = new Set(selectedCombinedDepotKeys());
    const leadAccount = selectedCombinedLeadInvestmentPlanningAccount();
    depotSelector.innerHTML = leadAccount
      ? COMBINED_DEPOTS.map(({ key, label }) => {
          const active = selectedKeys.has(key);
          const settings = depotInvestmentSettingsForAccount(key, leadAccount.id);
          return `
            <button
              class="combined-depot-option ${active ? "active" : ""}"
              type="button"
              data-action="toggle-combined-depot"
              data-combined-depot="${key}"
              aria-pressed="${active}"
            >
              <strong>${escapeHtml(label)}</strong>
              <span>${intNumber(settings.includedIds.length)} Positionen</span>
            </button>
          `;
        }).join("")
      : '<span class="chart-empty">Kein Leitkonto vorhanden.</span>';
  }

  if (pensionSelector) {
    const selectedScenario = state.combinedWealth.statutoryPensionScenario;
    const scenarioById = new Map((latestStatutoryPensionModel?.scenarios ?? []).map((scenario) => [scenario.id, scenario]));
    pensionSelector.innerHTML = (["pessimistic", "base", "optimistic"] as const)
      .map((scenarioId) => {
        const scenario = scenarioById.get(scenarioId);
        const active = selectedScenario === scenarioId;
        return `
          <button
            class="combined-pension-scenario ${active ? "active" : ""}"
            type="button"
            data-action="select-combined-pension-scenario"
            data-combined-pension-scenario="${scenarioId}"
            aria-pressed="${active}"
          >
            <strong>${escapeHtml(scenario?.label ?? pensionScenarioLabel(scenarioId))}</strong>
            <span>${escapeHtml(scenario ? `${money(scenario.netMonthlyPension)} netto/Monat` : "Keine Prognose")}</span>
            <small>Rentenalter ${escapeHtml(String(scenario?.retirementAge ?? state.statutoryPension.scenarios[scenarioId].retirementAge))}</small>
          </button>
        `;
      })
      .join("");
  }

  const cashPreview = combinedCashContribution(1, cashAccount);
  setText("combinedCashSourceMetric", cashAccount?.name ?? "-");
  setText("combinedCashRateMetric", money(cashPreview.yearlyCashDelta));
  setText(
    "combinedRealEstateActivationMetric",
    state.realEstate.purchaseActivated
      ? state.realEstate.plannedSaleYear
        ? `aktiv bis Verkauf ${intNumber(state.realEstate.plannedSaleYear)}`
        : "aktiv"
      : "Kauf nicht aktiviert"
  );
  setText(
    "combinedRealEstateFinancingYearsMetric",
    state.realEstate.purchaseActivated ? realEstateFinancingYearsText(latestRealEstateResult) : "-"
  );
  setInputValue('[data-combined-number="statutoryPensionMonthlyAmount"]', state.combinedWealth.statutoryPensionMonthlyAmount);
  setInputValue(
    '[data-combined-number="statutoryPensionSavingsRatePercent"]',
    state.combinedWealth.statutoryPensionSavingsRatePercent
  );
  renderCombinedCashPositionPopup();
}

function orderedCombinedCashAccounts(activeAccount: PlanningAccount | null): PlanningAccount[] {
  if (!activeAccount) return state.planningAccounts;
  return [activeAccount, ...state.planningAccounts.filter((account) => account.id !== activeAccount.id)];
}

function renderCombinedCashPositionPopup(): void {
  const popup = document.querySelector<HTMLDivElement>("#combinedCashPositionPopup");
  if (!popup) return;
  const account = combinedCashPopupAccountId ? planningAccountById(combinedCashPopupAccountId) : null;
  if (!account) {
    popup.hidden = true;
    popup.innerHTML = "";
    return;
  }

  const positions = combinedCashSelectablePositions(account);
  const selectedIds = new Set(state.combinedWealth.cashPositionIds);
  const selectedCount = positions.filter((position) => selectedIds.has(position.id)).length;
  const positionList = positions.length
    ? positions
        .map((position) => {
          const checked = selectedIds.has(position.id) ? "checked" : "";
          return `
            <label class="include-item combined-cash-position-item">
              <input type="checkbox" data-combined-cash-position="${position.id}" ${checked} />
              <span class="include-icon">${positionIconSvg(normalizePositionIcon(position.icon))}</span>
              <span>
                <span class="include-name">${escapeHtml(position.name)}</span>
                <span class="include-amount">${escapeHtml(investmentPositionSubtitle(position))}</span>
              </span>
            </label>
          `;
        })
        .join("")
    : '<div class="include-empty">Keine freien investierbaren Positionen in diesem Konto.</div>';

  popup.innerHTML = `
    <div class="combined-cash-position-dialog">
      <div class="chart-popup-head">
        <div>
          <span>Cash aus Konto</span>
          <strong>${escapeHtml(account.name)}</strong>
        </div>
        <button class="chart-popup-close" type="button" data-action="close-combined-cash-position-popup" aria-label="Popup schliessen">x</button>
      </div>
      <div class="include-list combined-cash-position-list">${positionList}</div>
      <div class="combined-cash-position-actions">
        <span>${intNumber(selectedCount)} aktiv</span>
        <button class="button" type="button" data-action="close-combined-cash-position-popup">Fertig</button>
      </div>
    </div>
  `;
  popup.hidden = false;
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
  hideInvestmentIncludePopup();
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
  if (state.ui.selectedCombinedLeadInvestmentAccountId === accountId) return;
  state.ui = { ...state.ui, selectedCombinedLeadInvestmentAccountId: accountId };
  renderAll();
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

function openPositionCostDialog(positionId: string): void {
  const position = state.positions.find((item) => item.id === positionId);
  if (!position || !positionCostBreakdownEligible(position)) return;
  positionCostDialogId = positionId;
  if (!position.costBreakdown?.length) {
    state.positions = state.positions.map((item) =>
      item.id === positionId ? { ...item, costBreakdown: [emptyPositionCostBreakdownItem()] } : item
    );
  }
  renderAll();
}

function closePositionCostDialog(): void {
  positionCostDialogId = null;
  renderPositionCostDialog();
}

function renderPositionCostDialog(): void {
  const root = document.querySelector<HTMLDivElement>("#positionCostDialogRoot");
  if (!root) return;
  const position = state.positions.find((item) => item.id === positionCostDialogId);
  if (!position || !positionCostBreakdownEligible(position)) {
    root.innerHTML = "";
    positionCostDialogId = null;
    return;
  }

  const items = position.costBreakdown?.length ? position.costBreakdown : [emptyPositionCostBreakdownItem()];
  const total = positionCostBreakdownTotal(items);
  root.innerHTML = `
    <div class="position-cost-dialog-backdrop" role="presentation">
      <div class="position-cost-dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(
        positionCostDialogTitle(position)
      )}">
        <div class="income-tax-dialog-head">
          <div>
            <strong>${escapeHtml(positionCostDialogTitle(position))}</strong>
            <span>${escapeHtml(position.name)} · ${escapeHtml(positionCadenceButtonLabel(position.payoutType))}</span>
          </div>
          <button class="chart-popup-close" type="button" data-action="close-position-cost-dialog" aria-label="Betragsdetails schliessen">x</button>
        </div>
        <div class="table-wrap">
          <table class="position-cost-table">
            <thead>
              <tr>
                <th>Position</th>
                <th>Betrag</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item) => positionCostBreakdownRow(position.id, item)).join("")}
            </tbody>
          </table>
        </div>
        <div class="position-cost-summary">
          <span>Summe</span>
          <strong data-position-cost-total="${escapeHtml(position.id)}">${total === null ? "-" : money(total)}</strong>
        </div>
        <div class="button-row">
          <button class="button secondary" type="button" data-action="add-position-cost-item" data-position-id="${escapeHtml(
            position.id
          )}">${escapeHtml(positionCostAddButtonLabel(position))}</button>
          <button class="button" type="button" data-action="close-position-cost-dialog">Fertig</button>
        </div>
      </div>
    </div>
  `;
}

function positionCostBreakdownRow(positionId: string, item: PositionCostBreakdownItem): string {
  return `
    <tr>
      <td>
        <input
          class="position-cost-name-input"
          value="${escapeHtml(item.name)}"
          data-position-cost-position-id="${escapeHtml(positionId)}"
          data-position-cost-item-id="${escapeHtml(item.id)}"
          data-position-cost-field="name"
          placeholder="z. B. Lebensunterhalt"
        />
      </td>
      <td>
        <input
          class="small-input amount-input"
          type="number"
          min="0"
          step="0.01"
          value="${item.amount === null ? "" : item.amount}"
          data-position-cost-position-id="${escapeHtml(positionId)}"
          data-position-cost-item-id="${escapeHtml(item.id)}"
          data-position-cost-field="amount"
        />
      </td>
      <td>
        <button
          class="icon-button danger"
          type="button"
          data-action="remove-position-cost-item"
          data-position-id="${escapeHtml(positionId)}"
          data-position-cost-item-id="${escapeHtml(item.id)}"
          aria-label="Kostenposition entfernen"
        >x</button>
      </td>
    </tr>
  `;
}

function positionCostDialogTitle(position: ReservePosition): string {
  return positionFlow(position) === "income" ? "Einnahmendetails" : "Kostenaufschluesselung";
}

function positionCostAddButtonLabel(position: ReservePosition): string {
  return positionFlow(position) === "income" ? "Einnahmeposition hinzufuegen" : "Kostenposition hinzufuegen";
}

function renderPositionCostDialogTotals(positionId: string): void {
  const position = state.positions.find((item) => item.id === positionId);
  const value = document.querySelector<HTMLElement>(`[data-position-cost-total="${cssEscape(positionId)}"]`);
  if (!position || !value) return;
  const total = positionCostBreakdownTotal(position.costBreakdown);
  value.textContent = total === null ? "-" : money(total);
}

function emptyPositionCostBreakdownItem(): PositionCostBreakdownItem {
  return { id: createId(), name: "", amount: null };
}

function addPositionCostBreakdownItem(positionId: string): void {
  if (!positionId) return;
  state.positions = state.positions.map((position) => {
    if (position.id !== positionId || !positionCostBreakdownEligible(position)) return position;
    return {
      ...position,
      costBreakdown: [...(position.costBreakdown ?? []), emptyPositionCostBreakdownItem()]
    };
  });
  renderAll();
}

function removePositionCostBreakdownItem(positionId: string, itemId: string): void {
  if (!positionId || !itemId) return;
  state.positions = state.positions.map((position) => {
    if (position.id !== positionId) return position;
    const costBreakdown = (position.costBreakdown ?? []).filter((item) => item.id !== itemId);
    const nextCostBreakdown =
      positionCostDialogId === positionId && costBreakdown.length === 0
        ? [emptyPositionCostBreakdownItem()]
        : costBreakdown;
    return positionWithCostBreakdownAmount({ ...position, costBreakdown: nextCostBreakdown });
  });
  renderAll();
}

function updatePositionCostBreakdownItem(positionId: string, itemId: string, field: string, value: string): void {
  if (!positionId || !itemId) return;
  state.positions = state.positions.map((position) => {
    if (position.id !== positionId) return position;
    const costBreakdown = (position.costBreakdown?.length ? position.costBreakdown : [emptyPositionCostBreakdownItem()]).map(
      (item) => {
        if (item.id !== itemId) return item;
        if (field === "name") return { ...item, name: value };
        if (field === "amount") {
          return { ...item, amount: value.trim() === "" ? null : Math.max(0, numberValue(value)) };
        }
        return item;
      }
    );
    return positionWithCostBreakdownAmount({ ...position, costBreakdown });
  });
}

function positionWithCostBreakdownAmount(position: ReservePosition): ReservePosition {
  const costBreakdown = normalizePositionCostBreakdown(position.costBreakdown);
  const total = positionCostBreakdownTotal(costBreakdown);
  return {
    ...position,
    amount: total === null ? position.amount : total,
    costBreakdown: costBreakdown.length ? costBreakdown : undefined
  };
}

function renderPositionModeControls(): void {
  for (const mode of ["income", "expense", "reserve", "savings"] as PositionTableMode[]) {
    const button = document.querySelector<HTMLButtonElement>(`[data-action='show-${mode}-positions']`);
    if (!button) continue;
    const active = selectedPositionMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  const cadenceHost = document.querySelector<HTMLDivElement>("#positionCadenceSwitchHost");
  if (cadenceHost) {
    const cadences = positionCadencesForTableMode(selectedPositionMode);
    const activeCadence = activePositionCadence();
    cadenceHost.innerHTML = cadences.length
      ? `
        <div class="position-cadence-label">Rhythmus</div>
        <div class="position-mode-switch position-cadence-switch" role="group" aria-label="${positionCadenceGroupLabel(
          selectedPositionMode
        )}">
          ${cadences
            .map((cadence) => {
              const active = activeCadence === cadence;
              return `
                <button
                  class="position-mode-button ${active ? "active" : ""}"
                  type="button"
                  data-action="set-position-cadence-${cadence}"
                  aria-pressed="${active}"
                >${escapeHtml(positionCadenceButtonLabel(cadence))}</button>
              `;
            })
            .join("")}
        </div>
      `
      : "";
  }
  const addButton = document.querySelector<HTMLButtonElement>("#addPositionButton");
  if (addButton) {
    addButton.textContent = addPositionButtonLabel(selectedPositionMode, activePositionCadence());
  }
}

function renderPositionTableControls(basePositions: ReservePosition[], sourcePositions: ReservePosition[]): void {
  const wrapper = document.querySelector<HTMLDivElement>("#positionTableControls");
  if (!wrapper) return;
  syncPositionFilterToggle();
  const view = currentPositionTableView();
  const draft = normalizedPositionFilterDraft();
  const cadence = activePositionCadence();
  const columns = positionTableColumnsForMode(selectedPositionMode, cadence);
  const selectedConfig = positionTableColumnConfig(selectedPositionMode, draft.column, cadence) ?? columns[0];
  const operators = positionTableOperatorsForColumn(selectedPositionMode, selectedConfig.column, cadence);
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
  const hideIncomeMonthRange = positionTableHidesIncomeMonthRange();
  const hideExpenseMonthRange = positionTableHidesExpenseMonthRange();
  const expenseOnce = selectedPositionMode === "expense" && activePositionCadence() === "once";
  const savingsWithoutRhythm = selectedPositionMode === "savings" && activePositionCadence() === "none";
  const dateHeaders =
    hideIncomeMonthRange || hideExpenseMonthRange
      ? ""
      : expenseOnce
      ? positionSortableHeader("payoutYear", "Abgangsjahr")
      : savingsWithoutRhythm
      ? [
          positionSortableHeader("payoutYear", "Jahr"),
          positionSortableHeader("startMonth", "Start"),
          positionSortableHeader("endMonth", "Ende")
        ].join("")
      : selectedPositionMode === "savings"
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
      <th class="planning-year-col">Planung</th>
      ${positionSortableHeader("name", "Name", "name-col")}
      ${positionTableShowsTypeColumn(selectedPositionMode) ? positionSortableHeader("type", "Art") : ""}
      ${positionSortableHeader("amount", "Betrag", "amount-col")}
      ${dateHeaders}
      ${selectedPositionMode === "income" ? positionSortableHeader("payoutYear", "Jahr") : ""}
      ${positionSortableHeader("payoutType", timingLabel)}
      ${savingsWithoutRhythm ? "" : positionSortableHeader("payoutMonth", monthLabel)}
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

function positionTableColumnCount(mode: PositionTableMode, cadence: PositionTableCadence | null = null): number {
  let count = 10;
  if (positionTableShowsTypeColumn(mode)) count += 1;
  if (mode === "income") count += cadence === null || cadence === "none" ? 3 : 1;
  else if (mode === "expense" && (cadence === "monthly" || cadence === "yearly")) count += 0;
  else if (mode === "expense" && cadence === "once") count += 1;
  else count += mode === "savings" && cadence === "none" ? 3 : 2;
  if (!(mode === "savings" && cadence === "none")) count += 1;
  if (mode !== "income") count += 2;
  return count;
}

function positionTableShowsTypeColumn(mode: PositionTableMode): boolean {
  return mode === "reserve";
}

function positionTableHidesIncomeMonthRange(): boolean {
  return selectedPositionMode === "income" && activePositionCadence() !== "none";
}

function positionTableHidesExpenseMonthRange(): boolean {
  return selectedPositionMode === "expense" && ["monthly", "yearly"].includes(String(activePositionCadence()));
}

function positionTableShowsPayoutMonthColumn(position: ReservePosition): boolean {
  return !(selectedPositionMode === "savings" && position.type === "savings" && position.payoutType === "none");
}

function positionPlanningYearSelect(position: ReservePosition): string {
  const planningYear = positionPlanningYear(position);
  const startOption =
    position.payoutType === "once"
      ? ""
      : `<option value="start" ${planningYear === null ? "selected" : ""}>Start</option>`;
  return `
    <select class="planning-year-select" data-position-id="${escapeHtml(position.id)}" data-position-field="planningYear" aria-label="Planungsjahr">
      ${startOption}
      ${planningYearOptions(state.settings.year)
        .map(
          (year) =>
            `<option value="${year}" ${planningYear === year ? "selected" : ""}>${year}</option>`
        )
        .join("")}
    </select>
  `;
}

function positionAmountCell(position: ReservePosition): string {
  if (!positionCostBreakdownEligible(position)) {
    return `<input class="small-input amount-input" type="number" min="0" step="0.01" value="${position.amount}" data-position-id="${position.id}" data-position-field="amount" />`;
  }

  const total = positionCostBreakdownTotal(position.costBreakdown);
  if (total !== null) {
    return `
      <button
        class="position-cost-button locked"
        type="button"
        data-action="open-position-cost-dialog-${escapeHtml(position.id)}"
        aria-haspopup="dialog"
        aria-label="Betragsdetails bearbeiten"
      >
        <strong>${money(total)}</strong>
        <span>Details</span>
      </button>
    `;
  }

  return `
    <div class="position-amount-detail-cell">
      <input class="small-input amount-input" type="number" min="0" step="0.01" value="${
        position.amount
      }" data-position-id="${position.id}" data-position-field="amount" />
      <button
        class="position-cost-mini-button"
        type="button"
        data-action="open-position-cost-dialog-${escapeHtml(position.id)}"
        aria-haspopup="dialog"
        aria-label="Betragsdetails bearbeiten"
      >Details</button>
    </div>
  `;
}

function positionCostBreakdownEligible(position: ReservePosition): boolean {
  const mode = positionTableMode(position);
  return (mode === "expense" || mode === "income") && selectedPositionMode === mode && positionAllowsCostBreakdown(position);
}

function positionAllowsCostBreakdown(position: ReservePosition): boolean {
  return positionCostBreakdownAllowed(positionFlow(position), position.type, position.payoutType);
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

function positionCostBreakdownTotal(items: PositionCostBreakdownItem[] | undefined): number | null {
  if (!items?.some((item) => item.amount !== null)) return null;
  return items.reduce((sum, item) => sum + Math.max(0, Number(item.amount ?? 0)), 0);
}

function normalizePositionCostBreakdown(items: PositionCostBreakdownItem[] | undefined): PositionCostBreakdownItem[] {
  if (!items?.length) return [];
  return items.map((item) => ({
    id: String(item.id || createId()),
    name: String(item.name ?? ""),
    amount: item.amount === null || item.amount === undefined ? null : Math.max(0, Number(item.amount) || 0)
  }));
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

function normalizeCurrentPositionTableViewColumns(): void {
  const cadence = activePositionCadence();
  const availableColumns = new Set(
    positionTableColumnsForMode(selectedPositionMode, cadence).map((config) => config.column)
  );
  updateCurrentPositionTableView((view) => ({
    ...view,
    filters: view.filters.filter((filter) => availableColumns.has(filter.column)),
    sort: view.sort && availableColumns.has(view.sort.column) ? view.sort : null
  }));
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
  const cadence = activePositionCadence();
  const config = positionTableColumnConfig(selectedPositionMode, draft.column, cadence);
  const column = config ? draft.column : "name";
  const operators = positionTableOperatorsForColumn(selectedPositionMode, column, cadence);
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
    const cadence = activePositionCadence();
    const nextColumn = positionTableColumnConfig(selectedPositionMode, column, cadence) ? column : current.column;
    positionFilterDrafts = {
      ...positionFilterDrafts,
      [selectedPositionMode]: {
        column: nextColumn,
        operator: positionTableOperatorsForColumn(selectedPositionMode, nextColumn, cadence)[0],
        value: ""
      }
    };
    renderPositions();
    return;
  }

  if (field === "operator") {
    const operator = value as PositionTableFilterOperator;
    const operators = positionTableOperatorsForColumn(
      selectedPositionMode,
      current.column,
      activePositionCadence()
    );
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
  persistCurrentState();
}

function currentPositionFilterDraftFromControls(): PositionFilterDraft {
  const draft = normalizedPositionFilterDraft();
  const columnInput = document.querySelector<HTMLSelectElement>('[data-position-filter-draft="column"]');
  const operatorInput = document.querySelector<HTMLSelectElement>('[data-position-filter-draft="operator"]');
  const valueInput = document.querySelector<HTMLInputElement | HTMLSelectElement>('[data-position-filter-draft="value"]');
  const column = (columnInput?.value || draft.column) as PositionTableFilterColumn;
  const cadence = activePositionCadence();
  const nextColumn = positionTableColumnConfig(selectedPositionMode, column, cadence) ? column : draft.column;
  const operators = positionTableOperatorsForColumn(selectedPositionMode, nextColumn, cadence);
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
  persistCurrentState();
}

function clearPositionTableSort(): void {
  updateCurrentPositionTableView((view) => ({ ...view, sort: null }));
  renderPositions();
  persistCurrentState();
}

function clearCurrentPositionTableView(): void {
  updateCurrentPositionTableView(() => emptyPositionTableView());
  renderPositions();
  persistCurrentState();
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
  persistCurrentState();
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
  if (!positionTableColumnConfig(selectedPositionMode, column, activePositionCadence())) return;
  updateCurrentPositionTableView((view) => {
    if (view.sort?.column !== column) return { ...view, sort: { column, direction: "asc" } };
    if (view.sort.direction === "asc") return { ...view, sort: { column, direction: "desc" } };
    return { ...view, sort: null };
  });
  renderPositions();
  persistCurrentState();
}

function activePositionCadence(): PositionTableCadence | null {
  if (selectedPositionMode === "income") return selectedIncomeCadence;
  if (selectedPositionMode === "expense") return selectedExpenseCadence;
  if (selectedPositionMode === "reserve") return selectedReserveCadence;
  if (selectedPositionMode === "savings") return selectedSavingsCadence;
  return null;
}

function positionCadenceButtonLabel(cadence: PositionTableCadence): string {
  if (cadence === "fixed") return "Fixbestand";
  if (cadence === "monthly") return "Monatlich";
  if (cadence === "yearly") return "Jaehrlich";
  if (cadence === "once") return "Einmalig";
  return "Ohne Rhythmus";
}

function positionCadenceGroupLabel(mode: PositionTableMode): string {
  if (mode === "income") return "Einnahmen-Rhythmus";
  if (mode === "reserve") return "Ruecklagen-Vorauswahl";
  if (mode === "savings") return "Sparen-Rhythmus";
  return "Ausgaben-Rhythmus";
}

function positionModeEmptyLabel(mode: PositionTableMode, cadence: PositionTableCadence | null = null): string {
  if (mode === "income") {
    if (cadence === "yearly") return "jaehrliche Einnahmen";
    if (cadence === "once") return "einmalige Einnahmen";
    if (cadence === "none") return "Einnahmen ohne Rhythmus";
    return "monatliche Einnahmen";
  }
  if (mode === "reserve") {
    if (cadence === "fixed") return "Fixbestaende";
    return "monatliche Ruecklagen";
  }
  if (mode === "savings") {
    if (cadence === "yearly") return "jaehrliche Sparpositionen";
    if (cadence === "once") return "einmalige Sparpositionen";
    if (cadence === "none") return "Sparpositionen ohne Rhythmus";
    return "monatliche Sparpositionen";
  }
  if (cadence === "yearly") return "jaehrliche Ausgaben";
  if (cadence === "once") return "einmalige Ausgaben";
  if (cadence === "none") return "Ausgaben ohne Rhythmus";
  return "monatliche Ausgaben";
}

function addPositionButtonLabel(mode: PositionTableMode, cadence: PositionTableCadence | null = null): string {
  if (mode === "income") {
    if (cadence === "yearly") return "Jaehrliche Einnahme hinzufuegen";
    if (cadence === "once") return "Einmalige Einnahme hinzufuegen";
    if (cadence === "none") return "Einnahme ohne Rhythmus hinzufuegen";
    return "Monatliche Einnahme hinzufuegen";
  }
  if (mode === "reserve") return cadence === "fixed" ? "Fixbestand hinzufuegen" : "Monatliche Ruecklage hinzufuegen";
  if (mode === "savings") {
    if (cadence === "yearly") return "Jaehrliche Sparposition hinzufuegen";
    if (cadence === "once") return "Einmalige Sparposition hinzufuegen";
    if (cadence === "none") return "Sparposition ohne Rhythmus hinzufuegen";
    return "Monatliche Sparposition hinzufuegen";
  }
  if (cadence === "yearly") return "Jaehrliche Ausgabe hinzufuegen";
  if (cadence === "once") return "Einmalige Ausgabe hinzufuegen";
  if (cadence === "none") return "Ausgabe ohne Rhythmus hinzufuegen";
  return "Monatliche Ausgabe hinzufuegen";
}

function newPositionName(mode: PositionTableMode, cadence: PositionTableCadence | null = null): string {
  if (mode === "income") {
    if (cadence === "yearly") return "Neue jaehrliche Einnahme";
    if (cadence === "once") return "Neue einmalige Einnahme";
    if (cadence === "none") return "Neue Einnahme ohne Rhythmus";
    return "Neue monatliche Einnahme";
  }
  if (mode === "reserve") return cadence === "fixed" ? "Neuer Fixbestand" : "Neue monatliche Ruecklage";
  if (mode === "savings") {
    if (cadence === "yearly") return "Neue jaehrliche Sparposition";
    if (cadence === "once") return "Neue einmalige Sparposition";
    if (cadence === "none") return "Neue Sparposition ohne Rhythmus";
    return "Neue monatliche Sparposition";
  }
  if (cadence === "yearly") return "Neue jaehrliche Ausgabe";
  if (cadence === "once") return "Neue einmalige Ausgabe";
  if (cadence === "none") return "Neue Ausgabe ohne Rhythmus";
  return "Neue monatliche Ausgabe";
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
    accounts: planningAccountsForActiveYear(),
    settings: activePlanningSettings(),
    activeAccountId: state.ui.selectedPlanningAccountId,
    showMaxNeeded: showResultMaxNeeded
  });
}

function renderReserveChartPopup(summary: ReturnType<typeof calculateReserveSummary>): void {
  const popup = document.querySelector<HTMLDivElement>("#reserveChartPopup");
  if (!popup) return;

  const model = buildReserveChartModel(summary);
  popup.innerHTML = `
    ${reservePieChart(model)}
    <div class="reserve-chart-legend">
      <span><i class="legend-dot green"></i>Einnahmen</span>
      <span><i class="legend-dot red"></i>Ausgaben</span>
      <span><i class="legend-dot orange"></i>Ruecklagen</span>
      <span><i class="legend-dot blue"></i>Sparen</span>
    </div>
    <div class="reserve-chart-insight">${escapeHtml(model.insight)}</div>
  `;
  popup.hidden = false;
}

function buildReserveChartModel(summary: ReturnType<typeof calculateReserveSummary>): ReserveChartModel {
  const chartPositions = activePlanningPositions();
  const chartSettings = activePlanningSettings();
  const totals = summary.rows.reduce<ReserveChartTotals>((sum, row) => {
    const reserves = chartPositions.reduce((sum, position) => {
      return position.type === "reserve"
        ? sum + calculatePlannedOutflowForSingleMonth(position, chartSettings.year, row.monthNumber)
        : sum;
    }, 0);
    const savings = chartPositions.reduce((sum, position) => {
      return position.type === "savings"
        ? sum + calculatePlannedOutflowForSingleMonth(position, chartSettings.year, row.monthNumber)
        : sum;
    }, 0);
    const income = Math.max(0, row.plannedIncome);
    const expense = Math.max(0, row.plannedOutflow - reserves - savings);
    const reserve = Math.max(0, reserves);
    const saving = Math.max(0, savings);
    return {
      income: sum.income + income,
      expense: sum.expense + expense,
      reserve: sum.reserve + reserve,
      savings: sum.savings + saving,
      remaining: sum.remaining + income - expense - reserve - saving
    };
  }, { income: 0, expense: 0, reserve: 0, savings: 0, remaining: 0 });

  return {
    totals,
    insight: reserveChartInsight(totals)
  };
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
    { key: "savings", value: totals.savings, color: "var(--reserve-chart-savings)" },
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
  return `
    <div class="reserve-pie-field ${escapeHtml(key)}">
      <span>${escapeHtml(label)}</span>
      <strong>${money(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </div>
  `;
}

function reserveChartInsight(totals: ReserveChartTotals): string {
  const savingsRate = totals.income > 0 ? totals.savings / totals.income : 0;
  if (totals.income <= 0) return "Keine Einnahmen im Jahr: zuerst Einnahmepositionen pruefen oder ergaenzen.";
  if (totals.remaining < 0) {
    return `Jahresrest ist negativ: ${money(Math.abs(totals.remaining))} Fehlbetrag.`;
  }
  if (savingsRate < 0.15) {
    return `Sparquote ${percent(savingsRate * 100)} bei ${money(totals.remaining)} freiem Jahresrest.`;
  }
  return `Sparquote ${percent(savingsRate * 100)} bei ${money(totals.remaining)} freiem Jahresrest.`;
}

function renderInvestmentIncludeList(): void {
  const list = document.querySelector<HTMLDivElement>("#investmentIncludeList");
  if (!list) return;

  const depot = activeInvestmentDepot();
  const settings = depotInvestmentSettings(depot);
  const investmentAccount = selectedInvestmentPlanningAccount();
  const otherDepots = otherInvestmentDepots(depot);

  const savingsPositions = selectableInvestmentSavingsPositions(investmentAccount.yearlyRows);
  if (!savingsPositions.length) {
    list.innerHTML = `<div class="include-empty">Keine Sparrate angelegt.</div>`;
    hideInvestmentIncludePopup();
    return;
  }

  const visibleSavingsPositions = visibleInvestmentSavingsPositions(savingsPositions, settings, otherDepots);
  if (!visibleSavingsPositions.length) {
    list.innerHTML = `<div class="include-empty">Alle Sparraten sind in anderen Depots eingeplant.</div>`;
    hideInvestmentIncludePopup();
    return;
  }

  const selection = investmentSavingsSelectionSummary(visibleSavingsPositions, settings.includedIds, state.settings.year);
  list.innerHTML = investmentIncludeSummaryButton(visibleSavingsPositions.length, selection);
  renderInvestmentIncludePopup(visibleSavingsPositions, settings);
}

function visibleInvestmentSavingsPositions(
  savingsPositions: ReservePosition[],
  settings: InvestmentSettings,
  otherDepots: InvestmentDepotKey[]
): ReservePosition[] {
  const blockedPositionIds = new Set(otherDepots.flatMap((item) => depotInvestmentSettings(item).includedIds));
  return savingsPositions.filter(
    (position) => !blockedPositionIds.has(position.id) || settings.includedIds.includes(position.id)
  );
}

function renderInvestmentSelectionChange(): void {
  clearInvestmentProjectionCaches();
  const investmentAccount = selectedInvestmentPlanningAccount();
  state.investmentByAccountId = {
    ...state.investmentByAccountId,
    [investmentAccount.id]: state.investment
  };
  investmentAccountContextId = investmentAccount.id;

  const activeReserve = calculateReserveSummary(activePlanningSettings(), activePlanningPositions());

  syncInvestmentIncludeSelectionState();
  renderCalculations(activeReserve);
  persistCurrentState();
}

function syncInvestmentIncludeSelectionState(): void {
  const depot = activeInvestmentDepot();
  const settings = depotInvestmentSettings(depot);
  const positions = visibleInvestmentSavingsPositions(
    selectableInvestmentSavingsPositions(selectedInvestmentPlanningAccount().yearlyRows),
    settings,
    otherInvestmentDepots(depot)
  );
  if (!positions.length) return;

  const selection = investmentSavingsSelectionSummary(positions, settings.includedIds, state.settings.year);
  const summaryText = `${intNumber(selection.selectedCount)} aktiv · ${money(selection.yearlyAmount)} jaehrlich`;
  const countText = `${intNumber(positions.length)} verfuegbar`;
  const summaryButton = document.querySelector<HTMLButtonElement>("[data-action='toggle-investment-include-popup']");
  if (summaryButton) {
    summaryButton.classList.toggle("active", selection.selectedCount > 0);
    summaryButton.setAttribute("aria-expanded", String(investmentIncludePopupOpen));
    const summaryValue = summaryButton.querySelector("strong");
    const summaryCount = summaryButton.querySelector("small");
    if (summaryValue) summaryValue.textContent = summaryText;
    if (summaryCount) summaryCount.textContent = countText;
  }

  const popup = document.querySelector<HTMLDivElement>("#investmentIncludePopup");
  if (!popup || popup.hidden) return;
  const popupValue = popup.querySelector(".chart-popup-head strong");
  const popupCount = popup.querySelector(".investment-include-actions span");
  if (popupValue) popupValue.textContent = summaryText;
  if (popupCount) popupCount.textContent = countText;

  const blockedRealEstateIds = realEstateSelectedSourceIds();
  const blockedCashIds = combinedCashSelectedPositionIds();
  for (const input of popup.querySelectorAll<HTMLInputElement>("[data-include-position]")) {
    const id = input.dataset.includePosition ?? "";
    const blocked = blockedRealEstateIds.has(id) || blockedCashIds.has(id);
    input.checked = settings.includedIds.includes(id);
    input.disabled = blocked;
    input.closest(".include-item")?.classList.toggle("blocked", blocked);
  }
}

function investmentIncludeSummaryButton(
  totalCount: number,
  selection: { selectedCount: number; yearlyAmount: number }
): string {
  const active = selection.selectedCount > 0;
  return `
    <button
      class="investment-include-summary-button ${active ? "active" : ""}"
      type="button"
      data-action="toggle-investment-include-popup"
      aria-expanded="${investmentIncludePopupOpen}"
      aria-controls="investmentIncludePopup"
    >
      <span>Sparraten auswaehlen</span>
      <strong>${intNumber(selection.selectedCount)} aktiv · ${money(selection.yearlyAmount)} jaehrlich</strong>
      <small>${intNumber(totalCount)} verfuegbar</small>
    </button>
  `;
}

function renderInvestmentIncludePopup(positions: ReservePosition[], settings: InvestmentSettings): void {
  const popup = document.querySelector<HTMLDivElement>("#investmentIncludePopup");
  if (!popup) return;
  if (!investmentIncludePopupOpen) {
    popup.hidden = true;
    popup.innerHTML = "";
    return;
  }

  const selection = investmentSavingsSelectionSummary(positions, settings.includedIds, state.settings.year);
  popup.innerHTML = `
    <div class="investment-include-dialog">
      <div class="chart-popup-head">
        <div>
          <span>Investierbare Positionen</span>
          <strong>${intNumber(selection.selectedCount)} aktiv · ${money(selection.yearlyAmount)} jaehrlich</strong>
        </div>
        <button class="chart-popup-close" type="button" data-action="close-investment-include-popup" aria-label="Popup schliessen">x</button>
      </div>
      <div class="include-list investment-include-position-list">${investmentIncludePositionRows(positions, settings)}</div>
      <div class="investment-include-actions">
        <span>${intNumber(positions.length)} verfuegbar</span>
        <button class="button" type="button" data-action="close-investment-include-popup">Fertig</button>
      </div>
    </div>
  `;
  popup.hidden = false;
}

function investmentIncludePositionRows(positions: ReservePosition[], settings: InvestmentSettings): string {
  const blockedRealEstateIds = realEstateSelectedSourceIds();
  const blockedCashIds = combinedCashSelectedPositionIds();
  return positions
    .map((position) => {
      const checked = settings.includedIds.includes(position.id) ? "checked" : "";
      const blockedByRealEstate = blockedRealEstateIds.has(position.id);
      const blockedByCash = blockedCashIds.has(position.id);
      const disabled = blockedByRealEstate || blockedByCash ? "disabled" : "";
      const blockedClass = blockedByRealEstate || blockedByCash ? "blocked" : "";
      const subtitle = blockedByRealEstate
        ? "belegt in Immobilienfinanzierung"
        : blockedByCash
          ? "belegt im Cash-Modul"
          : investmentPositionSubtitle(position);
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
  if (position.type === "savings" && position.payoutType === "none") {
    return `${money(position.amount)} ohne Rhythmus (${monthName(position.startMonth)} bis ${monthName(
      position.endMonth
    )} ${intNumber(position.payoutYear)})`;
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
  const blockedCashIds = combinedCashSelectedPositionIds();
  const blockedByOtherRealEstate = otherRealEstateSourceKinds(kind).reduce((blockedIds, otherKind) => {
    for (const id of realEstateSourceIds(otherKind)) blockedIds.add(id);
    return blockedIds;
  }, new Set<string>());

  host.innerHTML = savingsPositions
    .map(({ accountName, position }) => {
      const blockedDepot = blockedInvestmentDepotForPosition(position.id);
      const blockedByRealEstate = blockedByOtherRealEstate.has(position.id);
      const blockedByCash = blockedCashIds.has(position.id);
      const blockedByTiming = kind === "equityCapital" && position.payoutYear > financingStartYear;
      const blocked = Boolean(blockedDepot) || blockedByRealEstate || blockedByCash || blockedByTiming;
      const checked = selectedIds.has(position.id) ? "checked" : "";
      const disabled = blocked ? "disabled" : "";
      const blockedText = blockedDepot
        ? `belegt im ${depotLabel(blockedDepot)}`
        : blockedByRealEstate
          ? "bereits in anderer Immobilienquelle"
          : blockedByCash
            ? "belegt im Cash-Modul"
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
  for (const settings of investmentSettingsForBlocking()) {
    const depot = INVESTMENT_DEPOTS.find((item) =>
      depotInvestmentSettingsForBase(item, settings).includedIds.includes(positionId)
    );
    if (depot) return depot;
  }
  return null;
}

function investmentSelectedPositionIds(): Set<string> {
  const ids = new Set<string>();
  for (const settings of investmentSettingsForBlocking()) {
    for (const depot of INVESTMENT_DEPOTS) {
      for (const id of depotInvestmentSettingsForBase(depot, settings).includedIds) ids.add(id);
    }
  }
  return ids;
}

function investmentSettingsForBlocking(): InvestmentSettings[] {
  const settings = [state.investment, ...Object.values(state.investmentByAccountId)];
  return Array.from(new Set(settings));
}

function expenseDateCells(position: ReservePosition): string {
  if (position.type === "savings") return savingsDateCells(position);
  if (position.type === "fixed") return monthRangeDateCells(position);
  if (positionTableHidesExpenseMonthRange()) return "";

  if (position.payoutType === "once") {
    return `
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
  if (position.payoutType === "none") {
    return `
      <td>
        <input class="small-input payout-year-input" type="number" min="2000" max="2200" step="1" value="${
          position.payoutYear
        }" data-position-id="${position.id}" data-position-field="payoutYear" />
      </td>
      <td>${monthSelect(position.id, "startMonth", position.startMonth)}</td>
      <td>${monthSelect(position.id, "endMonth", position.endMonth)}</td>
    `;
  }

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
  if (positionTableHidesIncomeMonthRange()) {
    return `
      <td>
        <input class="small-input payout-year-input" type="number" min="2000" max="2200" step="1" value="${
          position.payoutYear
        }" data-position-id="${position.id}" data-position-field="payoutYear" />
      </td>
    `;
  }

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
  syncPlanningInputsFromState();
  syncRealEstateInputsFromState();
  syncCombinedToggleInputsFromState();
  syncInvestmentInputsFromState();
  syncThemeControls();
}

function syncPlanningInputsFromState(): void {
  for (const key of Object.keys(state.settings) as Array<keyof PlanningSettings>) {
    setInputValue(`[data-setting="${key}"]`, state.settings[key]);
  }
}

function syncInvestmentInputsFromState(): void {
  syncInvestmentInputBounds();
  const depot = activeInvestmentDepot();
  const settings = investmentSettingsWithGlobalEndDate(depotInvestmentSettings(depot));
  for (const key of inputInvestmentFields()) {
    setInputValue(`[data-investment="${key}"]`, settings[key]);
  }
  setInputValue("[data-retirement-age]", calculatePayoutStartAge(settings));
  syncInvestmentDepotTabs();
  syncRetirementDepotControls();
}

function syncInvestmentInputBounds(): void {
  const depot = activeInvestmentDepot();
  const settings = investmentSettingsWithGlobalEndDate(depotInvestmentSettings(depot));
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
  setInputBounds(
    '[data-investment="capitalGainsTaxPercent"]',
    investmentMinForDepot("capitalGainsTaxPercent", depot),
    investmentMaxForDepot("capitalGainsTaxPercent", depot)
  );
  syncInvestmentTaxControl(depot);
}

function syncRetirementDepotControls(): void {
  const depot = activeInvestmentDepot();
  const isStandard = depot === "standard";
  const isRetirement = depot === "retirement";
  const isChild = depot === "child";
  syncDepotScopedInvestmentFields(depot);
  syncRetirementDepotAllowanceToggle();
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

function syncInvestmentTaxControl(depot: InvestmentDepotKey): void {
  const label = document.getElementById("capitalGainsTaxPercentLabel");
  if (label) {
    label.textContent =
      depot === "retirement" ? "individueller Einkommensteuersatz nach § 22 Nr. 5 EStG" : "Kapitalertragsteuer";
  }
  for (const legend of document.querySelectorAll<HTMLElement>("[data-investment-tax-legend]")) {
    legend.textContent =
      legend.dataset.investmentTaxLegend === "combined"
        ? "Steuern"
        : depot === "retirement"
          ? "Einkommensteuer"
          : "Kapitalertragsteuer";
  }
}

function syncRetirementDepotAllowanceToggle(): void {
  const enabled = state.investment.retirementDepotAllowanceEnabled;
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    '[data-action="toggle-retirement-depot-allowance"]'
  )) {
    button.classList.toggle("active", enabled);
    button.setAttribute("aria-pressed", String(enabled));
    button.textContent = enabled ? "Zulage ein" : "Zulage aus";
  }
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
    if (field === "purchaseActivated") {
      const control = document.querySelector<HTMLInputElement>(selector);
      if (control) control.checked = Boolean(value);
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

  const ranges: Array<RealEstateField> = ["interestRatePercent", "propertyValueGrowthPercent"];
  for (const field of ranges) {
    setInputValue(`[data-real-estate-range="${field}"]`, state.realEstate[field] as number);
  }

  setText("realEstateInterestRatePercentValue", percent(realEstate.interestRatePercent));
  setText("realEstatePropertyValueGrowthPercentValue", percent(realEstate.propertyValueGrowthPercent));
}

function syncRealEstateLocaleLabels(locale: RealEstateFinancingSettings["locale"]): void {
  for (const label of document.querySelectorAll<HTMLElement>("[data-real-estate-label-key]")) {
    const de = label.dataset.labelDe ?? label.textContent ?? "";
    const en = label.dataset.labelEn ?? de;
    label.textContent = locale === "en" ? en : de;
  }
}

function syncCombinedToggleInputsFromState(): void {
  for (const [key, value] of Object.entries(state.combinedWealth)) {
    if (typeof value !== "boolean") continue;
    const control = document.querySelector<HTMLElement>(`[data-combined-toggle="${key}"]`);
    const card = document.querySelector<HTMLElement>(`[data-combined-module-card="${key}"]`);
    const purchaseMissing = key === "includeRealEstateFinancing" && value && !state.realEstate.purchaseActivated;
    const effectiveValue = purchaseMissing ? false : value;
    card?.classList.toggle("active", effectiveValue);
    if (!control) continue;
    if (control instanceof HTMLInputElement) {
      control.checked = effectiveValue;
      continue;
    }
    control.classList.toggle("active", effectiveValue);
    control.classList.toggle("blocked", purchaseMissing);
    control.setAttribute("aria-pressed", String(effectiveValue));
    const status = control.querySelector<HTMLElement>("[data-combined-toggle-status]");
    if (status) status.textContent = purchaseMissing ? "Kauf aus" : value ? "Aktiv" : "Aus";
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
  if (field === "purchaseActivated") {
    state.realEstate = {
      ...state.realEstate,
      purchaseActivated: value === "true"
    };
    resetRealEstateDetailSelection();
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
  if (key === "includeRealEstateFinancing" && checked && !state.realEstate.purchaseActivated) {
    state.realEstate = {
      ...state.realEstate,
      purchaseActivated: true
    };
  }
  state.combinedWealth = {
    ...state.combinedWealth,
    [key]: checked
  } as AppState["combinedWealth"];
}

function updateCombinedNumber(key: CombinedNumberKey, value: string): void {
  const parsed = numberValue(value);
  state.combinedWealth = {
    ...state.combinedWealth,
    [key]: key === "statutoryPensionSavingsRatePercent" ? clamp(parsed, 0, 100) : Math.max(0, parsed)
  };
}

function updateStatutoryPensionField(field: string, value: string): void {
  if (
    field !== "contributionRatePercent" &&
    field !== "currentPensionValue" &&
    field !== "projectionPensionValue"
  ) {
    return;
  }
  state.statutoryPension = {
    ...state.statutoryPension,
    [field]: Math.max(0, numberValue(value))
  };
}

function updateStatutoryPensionScenarioField(
  scenarioId: StatutoryPensionScenarioId,
  field: string,
  value: string
): void {
  if (!(scenarioId in state.statutoryPension.scenarios)) return;
  const scenario = state.statutoryPension.scenarios[scenarioId];
  const nextScenario = { ...scenario };
  if (field === "retirementAge") {
    nextScenario.retirementAge = clamp(Math.round(numberValue(value)), 67, 72);
  } else if (field === "annualPensionIncreasePercent") {
    nextScenario.annualPensionIncreasePercent = clamp(numberValue(value), 0.1, 2);
  } else if (field === "taxRatePercent") {
    nextScenario.taxRatePercent = clamp(numberValue(value), 0, STATUTORY_PENSION_DEDUCTION_PERCENT_MAX);
  } else if (field === "healthInsurancePercent") {
    nextScenario.healthInsurancePercent = clamp(numberValue(value), 0, STATUTORY_PENSION_DEDUCTION_PERCENT_MAX);
  } else if (field === "careInsurancePercent") {
    nextScenario.careInsurancePercent = clamp(numberValue(value), 0, STATUTORY_PENSION_DEDUCTION_PERCENT_MAX);
  } else if (field === "incomeMode") {
    nextScenario.incomeMode = value === "constant" ? "constant" : "income_projection";
  } else {
    return;
  }
  state.statutoryPension = {
    ...state.statutoryPension,
    scenarios: {
      ...state.statutoryPension.scenarios,
      [scenarioId]: nextScenario
    }
  };
}

function syncStatutoryPensionRangeLabel(input: HTMLInputElement | HTMLSelectElement): void {
  const scenarioId = statutoryPensionScenarioIdFromValue(input.dataset.statutoryPensionScenario);
  const field = input.dataset.statutoryPensionScenarioField;
  const scenario = scenarioId ? state.statutoryPension.scenarios[scenarioId] : null;
  const label = input.parentElement?.querySelector<HTMLElement>("strong");
  if (!scenario || !field || !label) return;
  if (field === "retirementAge") {
    label.textContent = String(scenario.retirementAge);
    return;
  }
  if (
    field === "annualPensionIncreasePercent" ||
    field === "taxRatePercent" ||
    field === "healthInsurancePercent" ||
    field === "careInsurancePercent"
  ) {
    label.textContent = percent(scenario[field]);
  }
}

function toggleCombinedModule(key: CombinedToggleKey | undefined): void {
  if (!key || typeof state.combinedWealth[key] !== "boolean") return;
  updateCombinedToggle(key, !state.combinedWealth[key]);
}

function selectCombinedCashAccount(accountId: string): void {
  const account = planningAccountById(accountId);
  if (!account) return;
  const selectableIds = new Set(combinedCashSelectablePositions(account).map((position) => position.id));
  combinedCashPopupAccountId = accountId;
  state.combinedWealth = {
    ...state.combinedWealth,
    cashAccountId: accountId,
    cashPositionIds: state.combinedWealth.cashPositionIds.filter((id) => selectableIds.has(id))
  };
}

function toggleCombinedCashPosition(id: string, checked: boolean): void {
  const account = selectedCombinedCashPlanningAccount();
  if (!account) return;
  const selectableIds = new Set(combinedCashSelectablePositions(account).map((position) => position.id));
  if (checked && !selectableIds.has(id)) return;
  const selectedIds = new Set(state.combinedWealth.cashPositionIds.filter((item) => selectableIds.has(item)));
  if (checked) selectedIds.add(id);
  else selectedIds.delete(id);
  state.combinedWealth = {
    ...state.combinedWealth,
    cashPositionIds: Array.from(selectedIds)
  };
}

function selectedCombinedDepotKeys(): CombinedWealthDepotKey[] {
  const keys = state.combinedWealth.depotKeys.filter((key): key is CombinedWealthDepotKey =>
    COMBINED_DEPOTS.some((depot) => depot.key === key)
  );
  if (keys.length) return keys;
  state.combinedWealth = { ...state.combinedWealth, depotKeys: ["standard"] };
  return ["standard"];
}

function toggleCombinedDepot(depot: CombinedWealthDepotKey | undefined): void {
  if (!depot || !COMBINED_DEPOTS.some((item) => item.key === depot)) return;
  const selected = new Set(selectedCombinedDepotKeys());
  if (selected.has(depot)) {
    if (selected.size === 1) return;
    selected.delete(depot);
  } else {
    selected.add(depot);
  }
  state.combinedWealth = {
    ...state.combinedWealth,
    depotKeys: Array.from(selected)
  };
}

function selectCombinedPensionScenario(scenarioId: StatutoryPensionScenarioId | undefined): void {
  const id = statutoryPensionScenarioIdFromValue(scenarioId);
  if (!id) return;
  const scenario = latestStatutoryPensionModel?.scenarios.find((item) => item.id === id);
  state.combinedWealth = {
    ...state.combinedWealth,
    statutoryPensionScenario: id,
    statutoryPensionMonthlyAmount: scenario?.netMonthlyPension ?? state.combinedWealth.statutoryPensionMonthlyAmount
  };
}

function toggleRealEstateSourcePosition(kind: RealEstatePaymentSourceKind, id: string, checked: boolean): void {
  if (checked && blockedInvestmentDepotForPosition(id)) return;
  if (checked && combinedCashSelectedPositionIds().has(id)) return;
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
  setActiveSection("planning_scenarios");
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

function toggleSettingsGrunddaten(): void {
  state.ui = { ...state.ui, settingsGrunddatenExpanded: !state.ui.settingsGrunddatenExpanded };
  syncSettingsAccordionState();
  persistCurrentState();
}

function toggleSettingsVault(): void {
  state.ui = { ...state.ui, settingsVaultExpanded: !state.ui.settingsVaultExpanded };
  syncSettingsAccordionState();
  persistCurrentState();
}

async function handleVaultSelect(): Promise<void> {
  setVaultStatusDetail("Vault-Auswahl wird geoeffnet...");
  await selectVault(state);
  syncVaultControls();
}

async function handleVaultCreate(): Promise<void> {
  setVaultStatusDetail("Vault-Ordner wird vorbereitet...");
  await createVault(state);
  syncVaultControls();
}

async function handleVaultSaveNow(): Promise<void> {
  setVaultStatusDetail("Vault wird gespeichert...");
  persistCurrentState();
  await flushVaultSave(state);
  syncVaultControls();
}

async function handleVaultReload(): Promise<void> {
  setVaultStatusDetail("Vault wird geladen...");
  const loadedState = await reloadFromVault();
  if (!loadedState) {
    syncVaultControls();
    return;
  }

  state = sanitizeAppState(loadedState);
  investmentAccountContextId = state.ui.selectedInvestmentAccountId;
  selectedRealEstateYear = null;
  selectedCombinedWealthYear = null;
  applyTheme();
  syncAllInputsFromState();
  renderAll();
}

async function handleVaultSnapshot(): Promise<void> {
  setVaultStatusDetail("Snapshot wird erstellt...");
  const result = await snapshotVault();
  syncVaultControls(result ? `Snapshot erstellt: ${result.backupPath}` : undefined);
}

function syncSettingsAccordionState(): void {
  const vaultContent = document.querySelector<HTMLDivElement>("#vaultSettingsContent");
  const vaultButton = document.querySelector<HTMLButtonElement>("[data-action='toggle-settings-vault']");
  if (vaultContent) vaultContent.hidden = !state.ui.settingsVaultExpanded;
  if (vaultButton) vaultButton.setAttribute("aria-expanded", String(state.ui.settingsVaultExpanded));

  const content = document.querySelector<HTMLDivElement>("#grunddatenSettingsContent");
  const button = document.querySelector<HTMLButtonElement>("[data-action='toggle-settings-grunddaten']");
  if (content) content.hidden = !state.ui.settingsGrunddatenExpanded;
  if (button) button.setAttribute("aria-expanded", String(state.ui.settingsGrunddatenExpanded));
  syncVaultControls();
}

function syncVaultControls(detailOverride?: string): void {
  const vault = getVaultStatus();
  const statusText = vaultStatusLabel(vault.status);
  const detail =
    detailOverride ??
    (vault.pendingWrites > 0
      ? "Speichern laeuft..."
      : vault.status === "error"
        ? vault.lastError || "Vault-Fehler."
        : vault.status === "connected"
          ? vault.lastSavedAt
            ? `Zuletzt gespeichert: ${formatVaultTimestamp(vault.lastSavedAt)}`
            : "Verbunden."
          : vault.status === "csvOnly"
            ? "Vault ist nur in der Tauri-Desktop-App verfuegbar."
            : "Kein Vault verbunden.");

  setText("vaultActivePath", vault.vaultRootPath || "-");
  setText("vaultStatusText", statusText);
  setText("vaultStatusDetail", detail);

  const tauriVaultAvailable = vault.status !== "csvOnly";
  const hasVaultPath = Boolean(vault.vaultRootPath);
  setButtonDisabled("[data-action='vault-select']", !tauriVaultAvailable);
  setButtonDisabled("[data-action='vault-create']", !tauriVaultAvailable);
  setButtonDisabled("[data-action='vault-save-now']", !tauriVaultAvailable || !hasVaultPath || vault.pendingWrites > 0);
  setButtonDisabled("[data-action='vault-reload']", !tauriVaultAvailable || !hasVaultPath);
  setButtonDisabled("[data-action='vault-snapshot']", !tauriVaultAvailable || !hasVaultPath || vault.pendingWrites > 0);
}

function setVaultStatusDetail(message: string): void {
  setText("vaultStatusDetail", message);
}

function vaultStatusLabel(status: ReturnType<typeof getVaultStatus>["status"]): string {
  if (status === "connected") return "Verbunden";
  if (status === "error") return "Fehler";
  if (status === "csvOnly") return "Nur CSV-Modus";
  return "Nicht verbunden";
}

function formatVaultTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("de-DE");
}

function setButtonDisabled(selector: string, disabled: boolean): void {
  const button = document.querySelector<HTMLButtonElement>(selector);
  if (button) button.disabled = disabled;
}

function updatePlanningSetting(field: keyof PlanningSettings, value: string): void {
  if (field === "endDate") {
    state.settings = {
      ...state.settings,
      endDate: normalizePlanningEndDate(value, state.settings.year)
    };
    return;
  }

  state.settings = {
    ...state.settings,
    [field]: planningSettingNumberValue(field, value)
  };
  state.settings = {
    ...state.settings,
    endDate: normalizePlanningEndDate(state.settings.endDate, state.settings.year)
  };
}

function planningEndYear(): number {
  return planningDateParts(state.settings.endDate)?.year ?? state.settings.year;
}

function planningEndAgeForBirthYear(birthYear: number): number {
  return clamp(planningEndYear() - Math.round(birthYear), 0, investmentMax("payoutEndAge"));
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
    calculatePayoutStartAge(investmentSettingsWithGlobalEndDate(depotInvestmentSettings("standard"))),
    calculatePayoutStartAge(investmentSettingsWithGlobalEndDate(depotInvestmentSettings("retirement")))
  );
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
  const depot = activeInvestmentDepot();
  const min = field === "birthYear" && depot === "child" ? childBirthYearMin() : investmentMinForDepot(field, depot);
  const max = field === "birthYear" && depot === "child" ? state.settings.year : investmentMaxForDepot(field, depot);
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
  hideInvestmentIncludePopup();
  renderAll();
}

function toggleInvestmentIncludePopup(): void {
  investmentIncludePopupOpen = !investmentIncludePopupOpen;
  renderAll();
}

function toggleRetirementDepotAllowance(): void {
  state.investment = {
    ...state.investment,
    retirementDepotAllowanceEnabled: !state.investment.retirementDepotAllowanceEnabled
  };
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
      retirementDepotAllowanceEnabled: false,
      retirementDepotChildren: 0
    };
  }

  if (depot === "child") {
    const childPayoutAge = clampChildPayoutAge(settings.childPayoutAge);
    return {
      ...settings,
      activeDepot: "child",
      includedIds: settings.childIncludedIds,
      retirementDepotEnabled: false,
      retirementDepotAllowanceEnabled: false,
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
    retirementDepotAllowanceEnabled: settings.retirementDepotAllowanceEnabled,
    includedIds: settings.retirementIncludedIds,
    birthYear: settings.retirementBirthYear,
    chartStartAge: settings.retirementChartStartAge,
    payoutEndAge: settings.retirementPayoutEndAge,
    payoutYears: settings.retirementPayoutYears,
    percentageWithdrawalStartAge: settings.retirementPayoutEndAge - settings.retirementPayoutYears,
    percentageWithdrawalRatePercent: 0,
    investmentReturnPercent: settings.retirementInvestmentReturnPercent,
    capitalGainsTaxPercent: settings.retirementIncomeTaxRatePercent,
    retirementIncomeTaxRatePercent: settings.retirementIncomeTaxRatePercent,
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
    retirementDepotAllowanceEnabled:
      updates.retirementDepotAllowanceEnabled ?? state.investment.retirementDepotAllowanceEnabled,
    retirementDepotChildren: updates.retirementDepotChildren ?? state.investment.retirementDepotChildren,
    retirementBirthYear: updates.birthYear ?? state.investment.retirementBirthYear,
    retirementChartStartAge: updates.chartStartAge ?? state.investment.retirementChartStartAge,
    retirementPayoutEndAge: payoutEndAge,
    retirementPayoutYears: updates.payoutYears ?? state.investment.retirementPayoutYears,
    retirementInvestmentReturnPercent:
      updates.investmentReturnPercent ?? state.investment.retirementInvestmentReturnPercent,
    retirementIncomeTaxRatePercent:
      updates.capitalGainsTaxPercent ?? state.investment.retirementIncomeTaxRatePercent,
    retirementInflationRatePercent: updates.inflationRatePercent ?? state.investment.retirementInflationRatePercent,
    retirementBequestReservePercent:
      updates.bequestReservePercent ?? state.investment.retirementBequestReservePercent
  };
}

function updateRetirementAge(value: string): void {
  const standardPayoutEndAge = numericInvestmentValue(
    "payoutEndAge",
    String(Math.max(investmentMin("payoutEndAge"), planningEndAgeForBirthYear(state.investment.birthYear)))
  );
  const retirementPayoutEndAge = numericInvestmentValue(
    "payoutEndAge",
    String(Math.max(investmentMin("payoutEndAge"), planningEndAgeForBirthYear(state.investment.retirementBirthYear)))
  );
  const retirementAge = clamp(
    numberValue(value),
    RETIREMENT_DEPOT_MIN_AGE,
    Math.min(
      retirementAgeMaxForPayoutEndAge(standardPayoutEndAge),
      retirementAgeMaxForPayoutEndAge(retirementPayoutEndAge)
    )
  );
  const payoutYears = payoutYearsForRetirementAge(standardPayoutEndAge, retirementAge);
  const retirementPayoutYears = payoutYearsForRetirementAge(retirementPayoutEndAge, retirementAge);
  state.investment = {
    ...state.investment,
    payoutEndAge: standardPayoutEndAge,
    retirementPayoutEndAge,
    payoutYears,
    retirementPayoutYears
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
      case "planningYear":
        next.planningYear = sanitizePlanningYearSelection(value, state.settings.year);
        if (next.payoutType === "once") {
          const nextPlanningYear =
            next.planningYear ?? normalizePositionPlanningYear(next.payoutYear) ?? state.settings.year;
          next.planningYear = nextPlanningYear;
          next.payoutYear = nextPlanningYear;
        }
        break;
      case "amount":
      case "startMonth":
      case "endMonth":
      case "payoutYear":
      case "payoutMonth":
      case "payoutDay":
        next[field] = numberValue(String(value));
        if (field === "payoutYear" && next.payoutType === "once") {
          next.planningYear = normalizePositionPlanningYear(next.payoutYear);
        }
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
          }
          if (next.flow === "expense" && next.type !== "temporary") next.cashback = false;
        }
        break;
      case "payoutType":
        if (value === "none" || value === "monthly" || value === "yearly" || value === "once") {
          next.payoutType = value;
          if (positionFlow(next) === "income" && value === "none") next.type = "incomeTemporary";
          if (next.payoutType === "once") {
            next.payoutYear =
              normalizePositionPlanningYear(next.planningYear) ?? Number(next.payoutYear || state.settings.year);
            next.planningYear = normalizePositionPlanningYear(next.payoutYear);
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

    if ((next.type !== "savings" || next.payoutType === "none") && next.startMonth > next.endMonth) {
      const startMonth = next.startMonth;
      next.startMonth = next.endMonth;
      next.endMonth = startMonth;
    }

    if (next.payoutType === "once") {
      const payoutYear = normalizePositionPlanningYear(next.payoutYear) ?? state.settings.year;
      next.payoutYear = payoutYear;
      next.planningYear = payoutYear;
      if (next.type !== "savings") {
        next.startMonth = next.payoutMonth;
        next.endMonth = next.payoutMonth;
      }
      next.interestBearing = false;
    }

    if (positionFlow(next) === "income") {
      next.interestBearing = false;
      next.cashback = false;
      if (next.payoutType === "none") next.type = "incomeTemporary";
    }

    return sanitizePosition(next, state.settings.year);
  });
}

function sanitizePosition(position: ReservePosition, fallbackYear: number): ReservePosition {
  const requestedFlow = positionFlow(position);
  const type = typeForFlow(position.type, requestedFlow);
  const flow = flowForType(type);
  const payoutType = normalizePayoutType(position.payoutType, flow, type);
  const payoutYear = finiteIntegerInRange(position.payoutYear, 2000, 2200, fallbackYear);
  const planningYear =
    payoutType === "once"
      ? normalizePositionPlanningYear(payoutYear)
      : normalizePositionPlanningYear(position.planningYear);
  const payoutMonth = finiteIntegerInRange(position.payoutMonth, 1, 12, 12);
  const costBreakdown = normalizePositionCostBreakdown(position.costBreakdown);
  const canUseCostBreakdown = positionCostBreakdownAllowed(flow, type, payoutType);
  const costBreakdownTotal = canUseCostBreakdown ? positionCostBreakdownTotal(costBreakdown) : null;
  let startMonth = finiteIntegerInRange(position.startMonth, 1, 12, 1);
  let endMonth = finiteIntegerInRange(position.endMonth, 1, 12, 12);

  if ((type !== "savings" || payoutType === "none") && startMonth > endMonth) {
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
    planningYear,
    flow,
    active: Boolean(position.active),
    visible: Boolean(position.visible),
    name: String(position.name || "Position"),
    icon: normalizePositionIcon(position.icon, defaultPositionIconForPosition({ ...position, flow, type })),
    type,
    amount: costBreakdownTotal === null ? Math.max(0, finiteNumber(position.amount, 0)) : costBreakdownTotal,
    startMonth,
    endMonth,
    payoutType,
    payoutYear,
    payoutMonth,
    payoutDay: finiteIntegerInRange(position.payoutDay, 1, 31, 31),
    interestBearing: !isIncome && payoutType !== "once" && Boolean(position.interestBearing),
    cashback: !isIncome && type === "temporary" && Boolean(position.cashback),
    costBreakdown: canUseCostBreakdown && costBreakdown.length ? costBreakdown : undefined
  };
}

function addPosition(): string {
  const cadence = activePositionCadence();
  const type = typeForPositionTableSelection(selectedPositionMode, cadence);
  const payoutType = payoutTypeForPositionTableSelection(selectedPositionMode, cadence);
  const flow = flowForType(type);
  const isIncome = flow === "income";
  const isOnce = payoutType === "once";
  const name = newPositionName(selectedPositionMode, cadence);
  const payoutMonth = isIncome ? 1 : 12;
  const startMonth = isOnce ? payoutMonth : 1;
  const endMonth = isOnce ? payoutMonth : 12;
  const id = createId();
  const selectedPlanningYear = activePlanningYear();
  const payoutYear = selectedPlanningYear ?? state.settings.year;
  const planningYear = isOnce ? payoutYear : selectedPlanningYear;
  state.positions = [
    ...state.positions,
    {
      id,
      planningYear,
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
      payoutYear,
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
  state.combinedWealth = {
    ...state.combinedWealth,
    cashPositionIds: state.combinedWealth.cashPositionIds.filter((item) => item !== id)
  };
}

function toggleInvestmentPosition(id: string, checked: boolean): void {
  const depot = activeInvestmentDepot();
  if (checked && realEstateSelectedSourceIds().has(id)) {
    return;
  }
  if (checked && combinedCashSelectedPositionIds().has(id)) {
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

function toggleResultMaxNeeded(): void {
  showResultMaxNeeded = !showResultMaxNeeded;
  renderAll();
}

function setSelectedPositionMode(mode: PositionTableMode): void {
  selectedPositionMode = mode;
  renderPositions();
}

function setSelectedPlanningYear(value: string): void {
  state.ui = {
    ...state.ui,
    selectedPlanningYear: sanitizePlanningYearSelection(value, state.settings.year)
  };
  positionCostDialogId = null;
  renderAll();
}

function setSelectedPositionCadence(cadence: PositionTableCadence): void {
  const cadences = positionCadencesForTableMode(selectedPositionMode);
  if (!cadences.includes(cadence)) return;
  if (selectedPositionMode === "income") selectedIncomeCadence = cadence;
  if (selectedPositionMode === "expense") selectedExpenseCadence = cadence;
  if (selectedPositionMode === "reserve") selectedReserveCadence = cadence;
  if (selectedPositionMode === "savings") selectedSavingsCadence = cadence;
  renderPositions();
}

function positionTableSourcePositions(): ReservePosition[] {
  const cadence = activePositionCadence();
  return activePlanningPositions().filter((position) => {
    if (positionTableMode(position) !== selectedPositionMode) return false;
    return positionMatchesTableCadence(position, selectedPositionMode, cadence);
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
  hideBaseDataPopup();
  renderAll();
}

function setThemeMode(theme: ThemeMode): void {
  state = { ...state, theme };
  applyTheme();
  syncThemeControls();
  persistCurrentState();
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
    hideBaseDataPopup();
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

function openBaseDataPopup(): void {
  const popup = document.querySelector<HTMLDivElement>("#baseDataPopup");
  if (!popup) return;
  hideThemeSettings();
  syncPlanningInputsFromState();
  popup.hidden = false;
}

function hideBaseDataPopup(): void {
  const popup = document.querySelector<HTMLDivElement>("#baseDataPopup");
  if (popup) popup.hidden = true;
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

async function exportCsvFile(
  filename: string,
  text: string,
  label: string,
  showStatus: (message: string) => void = showExportStatus
): Promise<void> {
  const contents = csvFileContents(text);
  const nativeResult = await saveCsvWithNativeDialog(filename, contents, showStatus);

  if (nativeResult === "saved") {
    showStatus(`${label} wurde gespeichert.`);
    return;
  }

  if (nativeResult === "cancelled") {
    showStatus(`${label} wurde abgebrochen.`);
    return;
  }

  downloadText(filename, contents);
  showStatus(
    nativeResult === "failed" ? `${label} wurde als Download gestartet.` : `${label} wurde gestartet.`
  );
}

async function saveCsvWithNativeDialog(
  filename: string,
  contents: string,
  showStatus: (message: string) => void
): Promise<"saved" | "cancelled" | "unavailable" | "failed"> {
  if (!isTauriRuntime()) return "unavailable";

  showStatus("Speichern-Dialog wird geoeffnet...");
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

function syncCommittedPlanningSettingInput(
  target: HTMLInputElement | HTMLSelectElement,
  field: keyof PlanningSettings
): void {
  if (!isDeferredModelInput(target)) return;
  target.value = String(state.settings[field]);
}

function syncCommittedInvestmentSettingInput(
  target: HTMLInputElement | HTMLSelectElement,
  field: keyof InvestmentSettings
): void {
  if (!isDeferredModelInput(target) || !isNumericInvestmentSetting(field)) return;
  const settings = investmentSettingsWithGlobalEndDate(depotInvestmentSettings(activeInvestmentDepot()));
  target.value = String(settings[field]);
}

function syncCommittedRetirementAgeInput(target: HTMLInputElement | HTMLSelectElement): void {
  if (!isDeferredModelInput(target)) return;
  const settings = investmentSettingsWithGlobalEndDate(depotInvestmentSettings(activeInvestmentDepot()));
  target.value = String(calculatePayoutStartAge(settings));
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

function drawCurrentInvestmentChart(): void {
  const investmentAccount = selectedInvestmentPlanningAccount();
  const projection = buildDepotAssetProjection(activeInvestmentDepot(), investmentAccount.id);
  const combinedProjection = combineAssetProjections(
    buildDepotAssetProjection("standard", investmentAccount.id),
    buildDepotAssetProjection("retirement", investmentAccount.id)
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
      ${chartPopupLine(
        "red",
        investmentTaxLabelForProjection(projection),
        tax > 0 ? `-${money(tax)}` : money(0)
      )}
      ${chartPopupTotalLine("Gesamtkapital", money(Math.max(0, point.netBalance)))}
    </div>
  `;

  popup.hidden = false;
  positionChartPopup(popup, card, clientX, clientY);
}

function investmentTaxLabelForProjection(projection: AssetProjection): string {
  if (!projection.retirementDepotEnabled) return "Kapitalertragsteuer";
  if (projection.annualSavingsRate > projection.retirementDepotAnnualOwnContribution + 0.01) return "Steuern";
  return "Einkommensteuer";
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

function selectCombinedWealthYearWithPopup(year: number, clientX: number, clientY: number): void {
  selectedCombinedWealthYear = Number.isFinite(year) && year > 0 ? year : null;
  renderCombinedWealthCalculations(latestCombinedWealthYears);
  showCombinedWealthPopup(year, clientX, clientY);
}

function showCombinedWealthPopup(year: number, clientX: number, clientY: number): void {
  const point = latestCombinedWealthYears.find((entry) => entry.year === year);
  const popup = document.querySelector<HTMLDivElement>("#combinedWealthChartPopup");
  const card = popup?.closest<HTMLElement>(".combined-chart-card");
  if (!point || !popup || !card) return;

  popup.innerHTML = renderCombinedWealthPopup({
    selected: point,
    finalYear: latestCombinedWealthYears.at(-1) ?? point,
    formatMoney: (value) => money(value),
    formatInt: (value) => intNumber(value)
  });
  popup.hidden = false;
  positionChartPopup(popup, card, clientX, clientY);
}

function showStatutoryPensionYearPopup(year: number, clientX: number, clientY: number): void {
  const point = latestStatutoryPensionModel?.annualPensionYears.find((entry) => entry.year === year);
  const popup = document.querySelector<HTMLDivElement>("#statutoryPensionYearPopup");
  const card = popup?.closest<HTMLElement>(".statutory-pension-year-chart");
  if (!point || !popup || !card) return;

  popup.innerHTML = renderStatutoryPensionYearPopupHtml(point);
  popup.hidden = false;
  positionChartPopup(popup, card, clientX, clientY);
}

function showStatutoryPensionProjectionYearPopup(year: number, clientX: number, clientY: number): void {
  const point = latestStatutoryPensionModel?.projectedAnnualPensionYears.find((entry) => entry.year === year);
  const popup = document.querySelector<HTMLDivElement>("#statutoryPensionProjectionYearPopup");
  const card = popup?.closest<HTMLElement>(".statutory-pension-year-chart");
  if (!point || !popup || !card) return;

  popup.innerHTML = renderStatutoryPensionProjectionYearPopupHtml(point);
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

function hideCombinedWealthPopup(): void {
  const popup = document.querySelector<HTMLDivElement>("#combinedWealthChartPopup");
  if (popup) popup.hidden = true;
}

function hideCombinedCashPositionPopup(): void {
  combinedCashPopupAccountId = null;
  const popup = document.querySelector<HTMLDivElement>("#combinedCashPositionPopup");
  if (popup) popup.hidden = true;
}

function hideInvestmentIncludePopup(): void {
  investmentIncludePopupOpen = false;
  const popup = document.querySelector<HTMLDivElement>("#investmentIncludePopup");
  if (popup) popup.hidden = true;
  document
    .querySelector<HTMLButtonElement>("[data-action='toggle-investment-include-popup']")
    ?.setAttribute("aria-expanded", "false");
}

function hideStatutoryPensionYearPopup(): void {
  const popup = document.querySelector<HTMLDivElement>("#statutoryPensionYearPopup");
  if (popup) popup.hidden = true;
}

function hideStatutoryPensionProjectionYearPopup(): void {
  const popup = document.querySelector<HTMLDivElement>("#statutoryPensionProjectionYearPopup");
  if (popup) popup.hidden = true;
}

function openStatutoryPensionTaxPopup(value: string | undefined): void {
  const scenarioId = statutoryPensionScenarioIdFromValue(value);
  if (!scenarioId) return;
  statutoryPensionTaxPopupScenarioId = scenarioId;
  renderAll();
}

function closeStatutoryPensionTaxPopup(): void {
  hideStatutoryPensionTaxPopup();
}

function hideStatutoryPensionTaxPopup(): void {
  statutoryPensionTaxPopupScenarioId = null;
  const host = document.querySelector<HTMLDivElement>("#statutoryPensionTaxPopup");
  if (!host) return;
  host.innerHTML = "";
  host.hidden = true;
}

function pensionScenarioLabel(scenarioId: StatutoryPensionScenarioId): string {
  if (scenarioId === "pessimistic") return "Pessimistisch";
  if (scenarioId === "optimistic") return "Optimistisch";
  return "Basis";
}

function buildDepotAssetProjection(depot: InvestmentDepotKey, accountId = selectedInvestmentPlanningAccount().id): AssetProjection {
  const cacheKey = `${depot}:${accountId}`;
  const cachedProjection = depotAssetProjectionCache.get(cacheKey);
  if (cachedProjection) return cachedProjection;

  const account = planningAccountById(accountId) ?? selectedInvestmentPlanningAccount();
  const settings = investmentSettingsWithGlobalEndDate(depotInvestmentSettingsForAccount(depot, accountId));
  const projection = buildAssetProjection(state.settings.year, account.yearlyRows, settings);
  depotAssetProjectionCache.set(cacheKey, projection);
  return projection;
}

function investmentSettingsWithGlobalEndDate(settings: InvestmentSettings): InvestmentSettings {
  if (settings.activeDepot === "child") return settings;
  const payoutEndAge = planningEndAgeForBirthYear(settings.birthYear);
  const preferredPayoutStartAge = Math.max(0, settings.payoutEndAge - settings.payoutYears);
  const payoutYears = Math.max(
    0,
    Math.min(investmentMax("payoutYears"), Math.round(payoutEndAge - preferredPayoutStartAge))
  );
  return {
    ...settings,
    payoutEndAge,
    retirementPayoutEndAge: payoutEndAge,
    payoutYears,
    retirementPayoutYears: payoutYears
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
  const standardPayoutEndAge = numericInvestmentValue(
    "payoutEndAge",
    String(Math.max(investmentMin("payoutEndAge"), planningEndAgeForBirthYear(nextInvestment.birthYear)))
  );
  const retirementPayoutEndAge = numericInvestmentValue(
    "payoutEndAge",
    String(Math.max(investmentMin("payoutEndAge"), planningEndAgeForBirthYear(nextInvestment.retirementBirthYear)))
  );
  nextInvestment = {
    ...nextInvestment,
    payoutEndAge: standardPayoutEndAge,
    retirementPayoutEndAge
  };
  const sharedRetirementAge = clampRetirementAge(
    Math.max(
      RETIREMENT_DEPOT_MIN_AGE,
      nextInvestment.payoutEndAge - nextInvestment.payoutYears,
      nextInvestment.retirementPayoutEndAge - nextInvestment.retirementPayoutYears
    ),
    Math.min(standardPayoutEndAge, retirementPayoutEndAge)
  );
  const standardPayoutYears = payoutYearsForRetirementAge(standardPayoutEndAge, sharedRetirementAge);
  const retirementPayoutYears = payoutYearsForRetirementAge(retirementPayoutEndAge, sharedRetirementAge);
  nextInvestment = {
    ...nextInvestment,
    payoutYears: standardPayoutYears,
    retirementPayoutYears
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
    retirementDepotEnabled: true,
    birthYear: nextInvestment.retirementBirthYear,
    chartStartAge: nextInvestment.retirementChartStartAge,
    payoutEndAge: nextInvestment.retirementPayoutEndAge,
    payoutYears: nextInvestment.retirementPayoutYears,
    percentageWithdrawalStartAge: nextInvestment.retirementPayoutEndAge - nextInvestment.retirementPayoutYears,
    percentageWithdrawalRatePercent: 0,
    investmentReturnPercent: nextInvestment.retirementInvestmentReturnPercent,
    capitalGainsTaxPercent: nextInvestment.retirementIncomeTaxRatePercent,
    retirementIncomeTaxRatePercent: nextInvestment.retirementIncomeTaxRatePercent,
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
    payoutEndAge: standardPayoutEndAge,
    retirementPayoutEndAge,
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
    capitalGainsTaxPercent: clamp(
      nextInvestment.capitalGainsTaxPercent,
      investmentMinForDepot("capitalGainsTaxPercent", "standard"),
      investmentMaxForDepot("capitalGainsTaxPercent", "standard")
    ),
    retirementIncomeTaxRatePercent: clamp(
      nextInvestment.retirementIncomeTaxRatePercent,
      investmentMinForDepot("capitalGainsTaxPercent", "retirement"),
      investmentMaxForDepot("capitalGainsTaxPercent", "retirement")
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
    childIncludedIds: childIds
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

function normalizeCombinedCashPositionIds(): void {
  const account = selectedCombinedCashPlanningAccount();
  if (!account) {
    state.combinedWealth = { ...state.combinedWealth, cashPositionIds: [] };
    return;
  }

  const selectableIds = new Set(combinedCashSelectablePositions(account).map((position) => position.id));
  const cashPositionIds = Array.from(new Set(state.combinedWealth.cashPositionIds)).filter((id) =>
    selectableIds.has(id)
  );
  state.combinedWealth = {
    ...state.combinedWealth,
    cashPositionIds
  };
}
