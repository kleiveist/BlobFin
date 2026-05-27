import "./styles.css";

import { createId, defaultAppState, defaultInvestmentSettings } from "./data/defaults";
import { buildAssetProjection, payoutStartAge as calculatePayoutStartAge } from "./domain/assetProjection";
import { buildCombinedWealthSeries, combinedWealthHorizonYears } from "./domain/combinedWealth";
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
  CombinedWealthYear,
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
type AccountDialogMode = "create" | "rename";
type AccountDialogState = {
  mode: AccountDialogMode;
  accountId: string | null;
  name: string;
  type: PlanningAccount["type"];
  error: string;
} | null;

let state = loadInitialState();
let draggedPositionId: string | null = null;
let exportStatusTimeoutId: number | undefined;
let selectedPositionMode: PositionTableMode = "expense";
let showResultMaxNeeded = false;
let reserveChartOpen = false;
let reserveChartCategory: ReserveChartCategory = "all";
let reserveChartScenario: ReserveChartScenario = "current";
let reserveChartHighlightId: string | null = null;
let reserveChartAdjustment: ReserveChartAdjustment = "none";
let reserveChartStyle: ReserveChartStyle = "bars";
let positionIconPicker: { positionId: string; top: number; left: number } | null = null;
let positionFilterDrafts = createPositionFilterDrafts();
let positionFilterPopupOpen = false;
let selectedRealEstateYear: number | null = null;
let latestRealEstateResult: RealEstateFinancingResult | null = null;
let selectedCombinedWealthYear: number | null = null;
let accountDialog: AccountDialogState = null;
normalizeInvestmentBounds();
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
    activeSection: "cost_reserve_positions" as AppSectionId,
    selectedPlanningAccountId: "default-account",
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
  const positions =
    planningAccounts.find((account) => account.id === selectedPlanningAccountId)?.yearlyRows ??
    appState.positions.map((position) => sanitizePosition(position, appState.settings.year));

  return {
    ...appState,
    planningAccounts,
    ui: {
      ...fallbackUi,
      ...ui,
      selectedPlanningAccountId,
      activeSection: ui.activeSection === "grunddaten" ? "cost_reserve_positions" : ui.activeSection
    },
    positions
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

function allPlanningPositions(): ReservePosition[] {
  return state.planningAccounts.flatMap((account) => account.yearlyRows);
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

function setActiveSection(section: AppSectionId): void {
  state.ui = { ...state.ui, activeSection: section };
  hideThemeSettings();
}

function updateModuleVisibility(): void {
  const activeSection = state.ui.activeSection;
  for (const button of document.querySelectorAll<HTMLButtonElement>(".module-card-button[data-section-id]")) {
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
  });

  root.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>("button[data-action]");
    if (!button) {
      if (positionIconPicker && !target?.closest("#positionIconPicker")) {
        hidePositionIconPicker();
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
    if (positionFilterPopupOpen && action !== "toggle-position-filter" && !button.closest("#positionFilterPopup")) {
      hidePositionFilterPopup();
    }
    if (action === "add-position") addPosition();
    if (action === "reset") resetState();
    if (action === "show-income-positions") setSelectedPositionMode("income");
    if (action === "show-expense-positions") setSelectedPositionMode("expense");
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
      setActiveSection(action.replace("open-section-", "") as AppSectionId);
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
    if (action === "set-theme-light") setThemeMode("light");
    if (action === "set-theme-dark") setThemeMode("dark");
    if (action === "set-real-estate-locale-de") setRealEstateLocale("de");
    if (action === "set-real-estate-locale-en") setRealEstateLocale("en");
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
    }
  });
  window.addEventListener("resize", drawCurrentInvestmentChart);
}

function renderAll(): void {
  syncActivePlanningAccountFromPositions();
  syncPositionsFromActivePlanningAccount();
  normalizeInvestmentBounds();
  normalizeInvestmentDepotSelections();
  normalizeInvestmentSelectionIds();
  normalizeRealEstateSourceIds();
  updateModuleVisibility();
  renderPlanningAccounts();
  const allPositions = allPlanningPositions();
  const reserve = calculateReserveSummary(state.settings, allPositions);
  const activeReserve = calculateReserveSummary(state.settings, state.positions);
  renderPositions();
  renderInvestmentIncludeList(reserve);
  renderCalculations(reserve, activeReserve);
  syncRealEstateInputsFromState();
  syncCombinedToggleInputsFromState();
  syncInvestmentInputsFromState();
  syncSettingsAccordionState();
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
  const combinedRealEstateProjectionYears = currentCombinedRealEstateProjectionYears(
    financingStartYear,
    standardProjection,
    retirementProjection
  );
  renderRealEstateSourceLists(standardProjection);
  const realEstate = calculateRealEstateFinancing(
    financingStartYear,
    state.realEstate,
    realEstateSourceSchedule(financingStartYear, maxRealEstateProjectionYears, standardProjection),
    {
      projectionYears: realEstateProjectionYears,
      maxProjectionYears: maxRealEstateProjectionYears
    }
  );
  renderRealEstateCalculations(realEstate);
  const combinedRealEstate =
    combinedRealEstateProjectionYears === realEstateProjectionYears &&
    combinedRealEstateProjectionYears === maxRealEstateProjectionYears
      ? realEstate
      : calculateRealEstateFinancing(
          financingStartYear,
          state.realEstate,
          realEstateSourceSchedule(financingStartYear, combinedRealEstateProjectionYears, standardProjection),
          {
            projectionYears: combinedRealEstateProjectionYears,
            maxProjectionYears: combinedRealEstateProjectionYears
          }
        );
  const combinedYears = calculateCombinedWealthYears(standardProjection, retirementProjection, combinedRealEstate);
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

function renderRealEstateCalculations(result: RealEstateFinancingResult): void {
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

  selectedRealEstateYear = defaultRealEstateDetailYear(result.years, selectedRealEstateYear);

  const repaymentHost = document.querySelector<HTMLDivElement>("#realEstateRepaymentChart");
  if (repaymentHost) {
    repaymentHost.innerHTML = renderRealEstateRepaymentChart({
      points: result.years,
      selectedYear: selectedRealEstateYear,
      loanCostBasis: result.totalLoanCost,
      financingEndYear: result.financingEndYear,
      formatMoney: (value) => money(value)
    });
  }

  const trendHost = document.querySelector<HTMLDivElement>("#realEstateTrendChart");
  if (trendHost) {
    trendHost.innerHTML = renderRealEstateTrendChart({
      points: result.years,
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
  retirementProjection: AssetProjection
): number {
  const standardEndYear = state.investment.birthYear + Math.floor(standardProjection.endAge);
  const retirementEndYear = state.investment.retirementBirthYear + Math.floor(retirementProjection.endAge);
  const combinedEndYear = Math.max(standardEndYear, retirementEndYear);
  const saleYear = state.realEstate.plannedSaleYear;
  const projectionEndYear =
    saleYear !== null && saleYear >= startYear ? Math.min(Math.round(saleYear), combinedEndYear) : combinedEndYear;
  return clamp(Math.round(projectionEndYear - startYear + 1), 1, 80);
}

function realEstateDepotSavingsRateAvailable(standardProjection: AssetProjection): boolean {
  return (
    state.realEstate.includeWithdrawalGainAsPaymentSource &&
    standardProjection.monthlyRate > 0 &&
    standardProjection.percentageWithdrawalMonthlyAtStart > standardProjection.monthlyRate
  );
}

function realEstateWithdrawalStartYear(standardProjection: AssetProjection): number {
  return state.investment.birthYear + Math.floor(standardProjection.percentageWithdrawalStartAge);
}

function realEstateSourceSchedule(
  startYear: number,
  projectionYears: number,
  standardProjection: AssetProjection
): RealEstateFinancingSourceSchedule {
  const monthCount = Math.max(12, Math.min(80, Math.round(projectionYears || 1)) * 12);
  const positions = allPlanningPositions();
  const equityPositions = selectedRealEstateSourcePositions("equityCapital", positions);
  const monthlyPositions = selectedRealEstateSourcePositions("monthlyPayment", positions);
  const specialPositions = selectedRealEstateSourcePositions("specialRepayment", positions);
  const equityCapital = equityPositions.reduce((sum, position) => {
    return sum + (position.payoutType === "once" && position.payoutYear <= startYear ? Number(position.amount) : 0);
  }, 0);
  const monthlyPaymentSavings: number[] = [];
  const withdrawalGainPayments: number[] = [];
  const specialRepayments: number[] = [];
  const withdrawalGain = state.realEstate.includeWithdrawalGainAsPaymentSource
    ? Math.max(0, standardProjection.withdrawalGainMonthlyAtStart)
    : 0;
  const useDepotSavingsRate =
    state.realEstate.repaymentSources.useDepotSavingsRateAsRepayment &&
    realEstateDepotSavingsRateAvailable(standardProjection);
  const withdrawalStartYear = realEstateWithdrawalStartYear(standardProjection);
  const withdrawalEndYear = state.investment.birthYear + Math.floor(standardProjection.endAge);
  const depotSavingsRate = useDepotSavingsRate ? Math.max(0, standardProjection.monthlyRate) : 0;
  const depotSavingsRatePayments: number[] = [];

  for (let index = 0; index < monthCount; index += 1) {
    const year = startYear + Math.floor(index / 12);
    const month = (index % 12) + 1;
    monthlyPaymentSavings.push(
      monthlyPositions.reduce((sum, position) => sum + investmentContributionForMonth(position, year, month), 0)
    );
    const activeWithdrawalYear = year >= withdrawalStartYear && year <= withdrawalEndYear;
    withdrawalGainPayments.push(activeWithdrawalYear ? withdrawalGain : 0);
    depotSavingsRatePayments.push(activeWithdrawalYear ? depotSavingsRate : 0);
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
  positions: ReservePosition[] = allPlanningPositions()
): ReservePosition[] {
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
  realEstate: RealEstateFinancingResult
): CombinedWealthYear[] {
  const standardEndYear = state.investment.birthYear + standardProjection.endAge;
  const retirementEndYear = state.investment.retirementBirthYear + retirementProjection.endAge;
  const horizonYears = combinedWealthHorizonYears(state.settings.year, standardEndYear, retirementEndYear);

  const cashContribution = combinedCashContribution(horizonYears);

  return buildCombinedWealthSeries({
    startYear: state.settings.year,
    horizonYears,
    cashStartValue: cashContribution.cashStartValue,
    yearlyCashDelta: cashContribution.yearlyCashDelta,
    yearlyCashDeltas: cashContribution.yearlyCashDeltas,
    depotProjection: standardProjection,
    sharedDepotProjection: retirementProjection,
    depotBirthYear: state.investment.birthYear,
    sharedDepotBirthYear: state.investment.retirementBirthYear,
    realEstateYears: realEstate.years,
    toggles: state.combinedWealth
  });
}

function combinedCashContribution(horizonYears: number): {
  cashStartValue: number;
  yearlyCashDelta: number;
  yearlyCashDeltas: number[];
} {
  let cashStartValue = 0;
  let yearlyCashDelta = 0;
  const yearlyCashDeltas = Array.from({ length: Math.max(1, horizonYears) }, () => 0);

  for (const account of state.planningAccounts) {
    const include =
      account.type === "cost_reserve"
        ? state.combinedWealth.includeCostReserveAccounts
        : account.type === "annual_table"
          ? state.combinedWealth.includeAnnualTableAccounts
          : state.combinedWealth.includeCostReserveAccounts || state.combinedWealth.includeAnnualTableAccounts;
    if (!include) continue;
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
    return { cashStartValue: reserveFallbackValue(), yearlyCashDelta: 0, yearlyCashDeltas };
  }

  return { cashStartValue, yearlyCashDelta, yearlyCashDeltas };
}

function reserveFallbackValue(): number {
  return calculateReserveSummary(state.settings, state.positions).yearEndBalance;
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
  const basePositions = state.positions.filter((position) => positionTableMode(position) === selectedPositionMode);
  renderPositionTableControls(basePositions);
  renderPositionTableHead();
  const body = document.querySelector<HTMLTableSectionElement>("#positionsBody");
  if (!body) return;

  const view = currentPositionTableView();
  const positions = positionTableRows(state.positions, selectedPositionMode, view);
  const isFilteredOrSorted = hasActivePositionTableView(view);
  if (!basePositions.length) {
    body.innerHTML = `
      <tr>
        <td class="position-empty" colspan="${positionTableColumnCount(selectedPositionMode)}">
          Noch keine ${positionModeEmptyLabel(selectedPositionMode)} angelegt.
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
  state.ui = { ...state.ui, selectedPlanningAccountId: account.id };
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
  state.ui = { ...state.ui, selectedPlanningAccountId: state.planningAccounts[0].id };
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
  const addButton = document.querySelector<HTMLButtonElement>("#addPositionButton");
  if (addButton) {
    addButton.textContent = addPositionButtonLabel(selectedPositionMode);
  }
}

function renderPositionTableControls(basePositions: ReservePosition[]): void {
  const wrapper = document.querySelector<HTMLDivElement>("#positionTableControls");
  if (!wrapper) return;
  syncPositionFilterToggle();
  const view = currentPositionTableView();
  const draft = normalizedPositionFilterDraft();
  const columns = positionTableColumnsForMode(selectedPositionMode);
  const selectedConfig = positionTableColumnConfig(selectedPositionMode, draft.column) ?? columns[0];
  const operators = positionTableOperatorsForColumn(selectedPositionMode, selectedConfig.column);
  const options = positionTableSelectOptions(selectedPositionMode, selectedConfig.column, state.positions);
  const labelOptions = positionTableLabelOptions(state.positions, selectedPositionMode);
  const active = hasActivePositionTableView(view);

  wrapper.innerHTML = `
    <div class="position-table-view-row">
      <div class="position-view-chips" aria-live="polite">
        ${view.filters.map(positionFilterChip).join("")}
        ${view.sort ? positionSortChip(view.sort) : ""}
      </div>
      <span class="position-view-count">${positionTableRows(state.positions, selectedPositionMode, view).length} von ${
        basePositions.length
      }</span>
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

function positionModeEmptyLabel(mode: PositionTableMode): string {
  if (mode === "income") return "Einnahmen";
  if (mode === "reserve") return "Ruecklagen";
  if (mode === "savings") return "Sparpositionen";
  return "Ausgaben";
}

function addPositionButtonLabel(mode: PositionTableMode): string {
  if (mode === "income") return "Einnahme hinzufuegen";
  if (mode === "reserve") return "Ruecklage hinzufuegen";
  if (mode === "savings") return "Sparposition hinzufuegen";
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

  const savingsPositions = allPlanningPositions().filter(
    (position) => position.type === "savings" && positionFlow(position) === "expense"
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
      const inactive = position.active ? "" : `<span class="muted">(inaktiv)</span>`;
      const disabled = blockedByRealEstate ? "disabled" : "";
      const blockedClass = blockedByRealEstate ? "blocked" : "";
      const subtitle = blockedByRealEstate ? "belegt in Immobilienfinanzierung" : investmentPositionSubtitle(position);
      return `
        <label class="include-item ${blockedClass}">
          <input type="checkbox" data-include-position="${position.id}" ${checked} ${disabled} />
          <span class="include-icon">${positionIconSvg(normalizePositionIcon(position.icon))}</span>
          <span>
            <span class="include-name">${escapeHtml(position.name)} ${inactive}</span>
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

function renderRealEstateSourceLists(standardProjection: AssetProjection): void {
  renderRealEstateSourceList("equityCapital", "#realEstateEquityCapitalSourceList");
  renderRealEstateSourceList("monthlyPayment", "#realEstateMonthlyPaymentSourceList");
  renderRealEstateSourceList("specialRepayment", "#realEstateSpecialRepaymentSourceList");

  const toggle = document.querySelector<HTMLButtonElement>("[data-action='toggle-real-estate-withdrawal-gain-source']");
  if (toggle) {
    toggle.classList.toggle("active", state.realEstate.includeWithdrawalGainAsPaymentSource);
    toggle.setAttribute("aria-pressed", String(state.realEstate.includeWithdrawalGainAsPaymentSource));
  }
  setText("realEstateWithdrawalGainSourceAmount", `${money(standardProjection.withdrawalGainMonthlyAtStart)} monatlich`);

  const savingsRateToggle = document.querySelector<HTMLButtonElement>(
    "[data-action='toggle-real-estate-depot-savings-rate-source']"
  );
  const savingsRateAvailable = realEstateDepotSavingsRateAvailable(standardProjection);
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
      ? `${money(standardProjection.monthlyRate)} monatlich ab ${intNumber(realEstateWithdrawalStartYear(standardProjection))}`
      : "nicht verfuegbar"
  );
}

function renderRealEstateSourceList(kind: RealEstatePaymentSourceKind, selector: string): void {
  const host = document.querySelector<HTMLDivElement>(selector);
  if (!host) return;

  const savingsPositions = allPlanningPositions().filter((position) => {
    return (
      position.type === "savings" &&
      positionFlow(position) === "expense" &&
      (kind === "equityCapital"
        ? position.payoutType === "once"
        : kind === "specialRepayment" || position.payoutType !== "once")
    );
  });

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
    .map((position) => {
      const blockedDepot = blockedInvestmentDepotForPosition(position.id);
      const blockedByRealEstate = blockedByOtherRealEstate.has(position.id);
      const blockedByTiming = kind === "equityCapital" && position.payoutYear > financingStartYear;
      const blocked = Boolean(blockedDepot) || blockedByRealEstate || blockedByTiming;
      const checked = selectedIds.has(position.id) ? "checked" : "";
      const disabled = blocked ? "disabled" : "";
      const inactive = position.active ? "" : `<span class="muted">(inaktiv)</span>`;
      const blockedText = blockedDepot
        ? `belegt im ${depotLabel(blockedDepot)}`
        : blockedByRealEstate
          ? "bereits in anderer Immobilienquelle"
          : blockedByTiming
            ? `erst nach Finanzierungsstart ${financingStartYear} verfuegbar`
            : realEstatePositionSubtitle(position);
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
            <span class="include-name">${escapeHtml(position.name)} ${inactive}</span>
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
  const realEstate = state.realEstate;
  syncRealEstateLocaleLabels(realEstate.locale);
  for (const locale of ["de", "en"] as const) {
    const button = document.querySelector<HTMLButtonElement>(`[data-action="set-real-estate-locale-${locale}"]`);
    if (!button) continue;
    const active = realEstate.locale === locale;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }

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

function setRealEstateLocale(locale: RealEstateFinancingSettings["locale"]): void {
  state.realEstate = { ...state.realEstate, locale };
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
  if (depot === "standard") {
    return {
      ...state.investment,
      activeDepot: "standard",
      retirementDepotEnabled: false,
      retirementDepotChildren: 0
    };
  }

  if (depot === "child") {
    const childPayoutAge = clampChildPayoutAge(state.investment.childPayoutAge);
    return {
      ...state.investment,
      activeDepot: "child",
      includedIds: state.investment.childIncludedIds,
      includeAccountInterest: state.investment.childIncludeAccountInterest,
      includeAccountCashback: state.investment.childIncludeAccountCashback,
      retirementDepotEnabled: false,
      retirementDepotChildren: 0,
      birthYear: state.investment.childBirthYear,
      chartStartAge: state.investment.childChartStartAge,
      childPayoutAge,
      payoutEndAge: childPayoutAge,
      payoutYears: 0,
      percentageWithdrawalStartAge: childPayoutAge,
      percentageWithdrawalRatePercent: 0,
      investmentReturnPercent: state.investment.childInvestmentReturnPercent,
      capitalGainsTaxPercent: state.investment.childCapitalGainsTaxPercent,
      inflationRatePercent: state.investment.childInflationRatePercent,
      bequestReservePercent: state.investment.childBequestReservePercent
    };
  }

  return {
    ...state.investment,
    activeDepot: "retirement",
    retirementDepotEnabled: true,
    includedIds: state.investment.retirementIncludedIds,
    includeAccountInterest: state.investment.retirementIncludeAccountInterest,
    includeAccountCashback: state.investment.retirementIncludeAccountCashback,
    birthYear: state.investment.retirementBirthYear,
    chartStartAge: state.investment.retirementChartStartAge,
    payoutEndAge: state.investment.payoutEndAge,
    payoutYears: state.investment.retirementPayoutYears,
    percentageWithdrawalStartAge: state.investment.payoutEndAge - state.investment.retirementPayoutYears,
    percentageWithdrawalRatePercent: 0,
    investmentReturnPercent: state.investment.retirementInvestmentReturnPercent,
    capitalGainsTaxPercent: state.investment.retirementCapitalGainsTaxPercent,
    inflationRatePercent: state.investment.retirementInflationRatePercent,
    bequestReservePercent: state.investment.retirementBequestReservePercent
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
  const flow = isIncome ? "income" : "expense";
  const name = isIncome ? "Neue Einnahme" : isReserve ? "Neue Ruecklage" : isSavings ? "Neue Sparrate" : "Neue Ausgabe";
  const type = isIncome ? "incomeMonthly" : isReserve ? "reserve" : isSavings ? "savings" : "temporary";
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
      startMonth: 1,
      endMonth: 12,
      payoutType: "monthly",
      payoutYear: state.settings.year,
      payoutMonth: isIncome ? 1 : 12,
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
  state.positions = state.positions.filter((position) => position.id !== id);
  state.investment = {
    ...state.investment,
    includedIds: state.investment.includedIds.filter((item) => item !== id),
    retirementIncludedIds: state.investment.retirementIncludedIds.filter((item) => item !== id),
    childIncludedIds: state.investment.childIncludedIds.filter((item) => item !== id)
  };
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

function setSelectedPositionMode(mode: PositionTableMode): void {
  selectedPositionMode = mode;
  renderPositions();
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
  state.investment = defaultInvestmentSettings();
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
  if (state.ui.activeSection === "grunddaten") {
    state.ui = { ...state.ui, activeSection: "cost_reserve_positions" };
  }
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
  const availablePositions = allPlanningPositions();
  state.investment = {
    ...state.investment,
    includedIds: state.investment.includedIds.filter((id) =>
      availablePositions.some(
        (position) => position.id === id && position.type === "savings" && positionFlow(position) === "expense"
      )
    ),
    retirementIncludedIds: state.investment.retirementIncludedIds.filter((id) =>
      availablePositions.some(
        (position) => position.id === id && position.type === "savings" && positionFlow(position) === "expense"
      )
    )
  };
  state.realEstate = {
    ...state.realEstate,
    equityCapitalSourceIds: state.realEstate.equityCapitalSourceIds.filter((id) =>
      availablePositions.some(
        (position) => position.id === id && position.type === "savings" && positionFlow(position) === "expense"
      )
    ),
    monthlyPaymentSourceIds: state.realEstate.monthlyPaymentSourceIds.filter((id) =>
      availablePositions.some(
        (position) => position.id === id && position.type === "savings" && positionFlow(position) === "expense"
      )
    ),
    specialRepaymentSourceIds: state.realEstate.specialRepaymentSourceIds.filter((id) =>
      availablePositions.some(
        (position) => position.id === id && position.type === "savings" && positionFlow(position) === "expense"
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

function downloadText(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
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
  const reserve = calculateReserveSummary(state.settings, allPlanningPositions());
  const projection = buildDepotAssetProjection(reserve, activeInvestmentDepot());
  const combinedProjection = combineAssetProjections(
    buildDepotAssetProjection(reserve, "standard"),
    buildDepotAssetProjection(reserve, "retirement")
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
  depot: InvestmentDepotKey
): AssetProjection {
  return buildAssetProjection(
    state.settings.year,
    investmentPositionsForProjection(summary, depot),
    investmentSettingsForProjection(summary, depot)
  );
}

function investmentPositionsForProjection(
  summary: ReturnType<typeof calculateReserveSummary>,
  depot: InvestmentDepotKey
): ReservePosition[] {
  const settings = depotInvestmentSettings(depot);
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
  return [...allPlanningPositions(), ...virtualPositions];
}

function investmentSettingsForProjection(
  summary: ReturnType<typeof calculateReserveSummary>,
  depot: InvestmentDepotKey
): InvestmentSettings {
  const settings = depotInvestmentSettings(depot);
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
    allPlanningPositions()
      .filter((position) => position.type === "savings" && positionFlow(position) === "expense")
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
  const savingsPositions = allPlanningPositions().filter(
    (position) => position.type === "savings" && positionFlow(position) === "expense"
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
