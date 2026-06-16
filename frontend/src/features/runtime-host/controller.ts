import { defaultAppState } from "../../data/defaults";
import type { AppContext } from "../../app/contracts";
import type { FeatureModule } from "../../app/contracts";
import { bindAppEvents } from "../../app/events";
import { createRenderScheduler } from "../../app/renderScheduler";
import { appSectionIdFromValue } from "../../app/router";
import { renderShell } from "../../app/shell";
import { calculateReserveSummary } from "../../domain/reserveCalculator";
import { exportPositionsCsv, exportYearTableCsv } from "../../lib/csv";
import { escapeHtml, numberValue } from "../../lib/format";
import type { PositionTableCadence } from "../../lib/positionKinds";
import { hasActivePositionTableView } from "../../lib/positionTableView";
import { initializeStorage } from "../../lib/storage";
import type { AppState, CombinedWealthDepotKey, InvestmentSettings, PlanningSettings, PositionTableFilterColumn, RealEstateFinancingSettings, RealEstatePaymentSourceKind, ReservePosition, StatutoryPensionScenarioId } from "../../types";
import type { CombinedWealthLineId } from "../../views/wealthCharts";
import { formControl, isDeferredModelInput } from "./runtimeDom";
import { type PositionFilterDraft, runtimeApi, runtimeHost } from "./hostContext";
import { configureRouteRuntime } from "./routeRuntime";
import { configureRenderRuntime } from "./renderRuntime";
import { configureRealEstateRuntime } from "./realEstateRuntime";
import { configureCombinedWealthRuntime } from "./combinedWealthRuntime";
import { configurePensionRuntime } from "./pensionRuntime";
import { configurePlanningAccountsRuntime } from "./planningRuntime";
import { configurePositionTableRuntime } from "./positionRuntime";
import { configurePositionStateRuntime } from "./positionStateRuntime";
import { configureInvestmentUiRuntime } from "./investmentRuntime";
import { configureSettingsRuntime } from "./settingsRuntime";
import { configureIncomeRuntime } from "./incomeRuntime";
import { configureSelfEmploymentRuntime } from "./selfEmploymentRuntime";

type RealEstateField = keyof RealEstateFinancingSettings;
type CombinedToggleKey = {
  [Key in keyof AppState["combinedWealth"]]: AppState["combinedWealth"][Key] extends boolean ? Key : never;
}[keyof AppState["combinedWealth"]];
type CombinedNumberKey = "statutoryPensionMonthlyAmount" | "statutoryPensionSavingsRatePercent";

function configureControllerRuntime(): void {
  Object.assign(runtimeApi, {
    startAppController,
    bootstrapApp,
    syncStoreState,
    persistCurrentState,
    loadInitialState,
    renderStartupError,
    bindEvents,
    handleAppInput,
    handleAppChange,
    handleAppClick,
    handleAppWindowKeyDown,
    requestRenderAll,
    clearInvestmentProjectionCaches,
    renderAll,
    hideInvestmentChartPopup,
    hideInvestmentIncludePopup
  });
}

export async function startAppController(context: AppContext, features: readonly FeatureModule[]): Promise<void> {
  runtimeHost.appContext = context;
  runtimeHost.root = context.root;
  runtimeHost.renderScheduler = createRenderScheduler(renderAll);
  runtimeHost.appContext.scheduler = runtimeHost.renderScheduler;
  configureRouteRuntime();
  configureRenderRuntime();
  configureRealEstateRuntime();
  configureCombinedWealthRuntime();
  configurePensionRuntime();
  configurePlanningAccountsRuntime();
  configurePositionStateRuntime();
  configurePositionTableRuntime();
  configureInvestmentUiRuntime();
  configureSettingsRuntime();
  configureControllerRuntime();
  configureIncomeRuntime(persistCurrentState, renderAll);
  configureSelfEmploymentRuntime(syncStoreState, persistCurrentState, renderAll);
  runtimeHost.appContext.store.subscribe((nextState) => {
    runtimeHost.state = nextState;
  });
  await bootstrapApp(features);
}

async function bootstrapApp(features: readonly FeatureModule[]): Promise<void> {
  runtimeHost.state = runtimeApi.sanitizeAppState(defaultAppState());
  syncStoreState();
  runtimeApi.applyInitialRoute();
  runtimeApi.applyTheme();
  renderShell(runtimeHost.root);
  runtimeApi.updateModuleVisibility();
  bindEvents(features);
  try {
    runtimeHost.state = await loadInitialState();
    syncStoreState();
    runtimeApi.normalizeInvestmentBounds();
    runtimeApi.applyInitialRoute();
    runtimeApi.applyTheme();
    runtimeApi.startIncomeRuntimeTicker();
    runtimeApi.syncAllInputsFromState();
    runtimeApi.syncThemeControls();
    renderAll();
  } catch (error) {
    renderStartupError(error);
  }
}

function syncStoreState(): void {
  runtimeHost.appContext.store.replaceState(runtimeHost.state, { notify: false });
}

function persistCurrentState(): void {
  syncStoreState();
  runtimeHost.appContext.store.persistNow();
}

async function loadInitialState(): Promise<AppState> {
  try {
    return runtimeApi.sanitizeAppState(await initializeStorage());
  } catch (error) {
    console.warn("Stored runtimeHost.state could not be loaded; falling back to defaults.", error);
    return runtimeApi.sanitizeAppState(defaultAppState());
  }
}

function renderStartupError(error: unknown): void {
  console.error("BlobFin startup failed.", error);
  const message = error instanceof Error ? error.message : String(error);
  runtimeHost.root.innerHTML = `
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

function bindEvents(features: readonly FeatureModule[]): void {
  bindAppEvents(runtimeHost.appContext, features, {
    onInput: handleAppInput,
    onChange: handleAppChange,
    onClick: handleAppClick,
    onWindowKeyDown: handleAppWindowKeyDown
  });
  runtimeHost.root.addEventListener("dragstart", (event) => {
    if (hasActivePositionTableView(runtimeApi.currentPositionTableView())) return;
    const handle = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-position-drag-id]");
    if (!handle) return;

    runtimeHost.draggedPositionId = handle.dataset.positionDragId || null;
    if (!runtimeHost.draggedPositionId) return;

    event.dataTransfer?.setData("text/plain", runtimeHost.draggedPositionId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    handle.closest("tr")?.classList.add("dragging");
  });

  runtimeHost.root.addEventListener("dragover", (event) => {
    if (hasActivePositionTableView(runtimeApi.currentPositionTableView())) return;
    const row = (event.target as HTMLElement | null)?.closest<HTMLTableRowElement>("tr[data-position-row]");
    if (!row || !runtimeHost.draggedPositionId) return;
    event.preventDefault();
    row.classList.add("drag-over");
  });

  runtimeHost.root.addEventListener("dragleave", (event) => {
    const row = (event.target as HTMLElement | null)?.closest<HTMLTableRowElement>("tr[data-position-row]");
    row?.classList.remove("drag-over");
  });

  runtimeHost.root.addEventListener("drop", (event) => {
    if (hasActivePositionTableView(runtimeApi.currentPositionTableView())) return;
    const row = (event.target as HTMLElement | null)?.closest<HTMLTableRowElement>("tr[data-position-row]");
    if (!row || !runtimeHost.draggedPositionId) return;
    event.preventDefault();

    const targetId = row.dataset.positionRow;
    if (targetId) {
      const afterTarget = event.clientY > row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2;
      runtimeApi.reorderPosition(runtimeHost.draggedPositionId, targetId, afterTarget);
      renderAll();
    }
    runtimeApi.clearDragState();
  });

  runtimeHost.root.addEventListener("dragend", runtimeApi.clearDragState);
  runtimeHost.appContext.router.subscribe((nextSection) => {
    const section = nextSection ?? "home";
    runtimeApi.setActiveSection(section, { updateHistory: false });
    renderAll();
  });
  window.addEventListener("resize", runtimeApi.drawCurrentInvestmentChart);
}

function handleAppInput(event: Event): boolean | void {
    const target = formControl(event.target);
    if (!target) return;

    if (target.dataset.positionFilterDraft === "value") {
      runtimeApi.updatePositionFilterDraft("value", target.value);
      return;
    }

    if (target.dataset.accountDialogField) {
      runtimeApi.updateAccountDialogDraft(target.dataset.accountDialogField, target.value);
      return;
    }

    if (target.dataset.setting) {
      if (isDeferredModelInput(target)) return;
      runtimeApi.updatePlanningSetting(target.dataset.setting as keyof PlanningSettings, target.value);
      requestRenderAll();
      return;
    }

    if (target.dataset.investment) {
      if (isDeferredModelInput(target)) return;
      runtimeApi.updateInvestmentSetting(target.dataset.investment as keyof InvestmentSettings, target.value);
      requestRenderAll();
      return;
    }

    if (target.dataset.realEstateField) {
      const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
      runtimeApi.updateRealEstateField(target.dataset.realEstateField as RealEstateField, value);
      requestRenderAll();
      return;
    }

    if (target.dataset.realEstateRange) {
      runtimeApi.updateRealEstateField(target.dataset.realEstateRange as RealEstateField, target.value);
      requestRenderAll();
      return;
    }

    if (target.dataset.combinedNumber) {
      runtimeApi.updateCombinedNumber(target.dataset.combinedNumber as CombinedNumberKey, target.value);
      persistCurrentState();
      return;
    }

    if (target.dataset.positionCostPositionId && target.dataset.positionCostItemId && target.dataset.positionCostField) {
      runtimeApi.updatePositionCostBreakdownItem(
        target.dataset.positionCostPositionId,
        target.dataset.positionCostItemId,
        target.dataset.positionCostField,
        target.value
      );
      runtimeApi.renderPositions();
      runtimeApi.renderPositionCostDialogTotals(target.dataset.positionCostPositionId);
      persistCurrentState();
      return;
    }

    if (target.dataset.statutoryPensionScenario && target.dataset.statutoryPensionScenarioField) {
      runtimeApi.updateStatutoryPensionScenarioField(
        target.dataset.statutoryPensionScenario as StatutoryPensionScenarioId,
        target.dataset.statutoryPensionScenarioField,
        target.value
      );
      runtimeApi.syncStatutoryPensionRangeLabel(target);
      persistCurrentState();
      return;
    }

    if (target.dataset.retirementAge) {
      if (isDeferredModelInput(target)) return;
      runtimeApi.updateRetirementAge(target.value);
      requestRenderAll();
    }
}

function handleAppChange(event: Event): boolean | void {
    const target = formControl(event.target);
    if (!target) return;





    if (target.dataset.positionFilterDraft) {
      runtimeApi.updatePositionFilterDraft(target.dataset.positionFilterDraft as keyof PositionFilterDraft, target.value);
      return;
    }

    if (target.dataset.accountDialogField) {
      runtimeApi.updateAccountDialogDraft(target.dataset.accountDialogField, target.value);
      return;
    }

    if (target.dataset.setting) {
      const field = target.dataset.setting as keyof PlanningSettings;
      runtimeApi.updatePlanningSetting(field, target.value);
      runtimeApi.syncCommittedPlanningSettingInput(target, field);
      requestRenderAll();
      return;
    }

    if (target.dataset.investment) {
      const field = target.dataset.investment as keyof InvestmentSettings;
      runtimeApi.updateInvestmentSetting(field, target.value);
      runtimeApi.syncCommittedInvestmentSettingInput(target, field);
      requestRenderAll();
      return;
    }

    if (target.dataset.retirementAge) {
      runtimeApi.updateRetirementAge(target.value);
      runtimeApi.syncCommittedRetirementAgeInput(target);
      requestRenderAll();
      return;
    }

    if (target.dataset.realEstateField) {
      const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
      runtimeApi.updateRealEstateField(target.dataset.realEstateField as RealEstateField, value);
      requestRenderAll();
      return;
    }

    if (target.dataset.positionCostPositionId && target.dataset.positionCostItemId && target.dataset.positionCostField) {
      runtimeApi.updatePositionCostBreakdownItem(
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
      runtimeApi.updatePosition(target.dataset.positionId, target.dataset.positionField as keyof ReservePosition, value);
      requestRenderAll();
      return;
    }

    if (target.dataset.includePosition && target instanceof HTMLInputElement) {
      runtimeApi.toggleInvestmentPosition(target.dataset.includePosition, target.checked);
      runtimeApi.renderInvestmentSelectionChange();
      return;
    }

    if (target.dataset.combinedCashPosition && target instanceof HTMLInputElement) {
      runtimeApi.toggleCombinedCashPosition(target.dataset.combinedCashPosition, target.checked);
      requestRenderAll();
      return;
    }

    if (
      target.dataset.realEstateSourcePosition &&
      target.dataset.realEstateSourceKind &&
      target instanceof HTMLInputElement
    ) {
      runtimeApi.toggleRealEstateSourcePosition(
        target.dataset.realEstateSourceKind as RealEstatePaymentSourceKind,
        target.dataset.realEstateSourcePosition,
        target.checked
      );
      requestRenderAll();
      return;
    }

    if (target.dataset.combinedToggle && target instanceof HTMLInputElement) {
      runtimeApi.updateCombinedToggle(target.dataset.combinedToggle as CombinedToggleKey, target.checked);
      requestRenderAll();
      return;
    }

    if (target.dataset.combinedNumber) {
      runtimeApi.updateCombinedNumber(target.dataset.combinedNumber as CombinedNumberKey, target.value);
      requestRenderAll();
      return;
    }

    if (target.dataset.statutoryPensionField) {
      runtimeApi.updateStatutoryPensionField(target.dataset.statutoryPensionField, target.value);
      requestRenderAll();
      return;
    }

    if (target.dataset.statutoryPensionScenario && target.dataset.statutoryPensionScenarioField) {
      runtimeApi.updateStatutoryPensionScenarioField(
        target.dataset.statutoryPensionScenario as StatutoryPensionScenarioId,
        target.dataset.statutoryPensionScenarioField,
        target.value
      );
      requestRenderAll();
      return;
    }

    if (target.id === "positionsCsvImport" && target instanceof HTMLInputElement) {
      void runtimeApi.importPositionsFromFile(target.files?.[0]);
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
      runtimeApi.showStatutoryPensionProjectionYearPopup(
        numberValue(statutoryPensionProjectionButton.dataset.statutoryPensionProjectionYear || ""),
        event.clientX,
        event.clientY
      );
      return;
    }
    const statutoryPensionYearButton = target?.closest<HTMLButtonElement>("button[data-statutory-pension-year]");
    if (statutoryPensionYearButton) {
      event.preventDefault();
      runtimeApi.showStatutoryPensionYearPopup(
        numberValue(statutoryPensionYearButton.dataset.statutoryPensionYear || ""),
        event.clientX,
        event.clientY
      );
      return;
    }
    const button = target?.closest<HTMLButtonElement>("button[data-action]");
    if (!button) {
      if (runtimeHost.positionIconPicker && !target?.closest("#positionIconPicker")) {
        runtimeApi.hidePositionIconPicker();
      }
      if (runtimeHost.positionFilterPopupOpen && !target?.closest("#positionFilterPopup")) {
        runtimeApi.hidePositionFilterPopup();
      }
      if (!target?.closest("#statutoryPensionYearPopup")) {
        runtimeApi.hideStatutoryPensionYearPopup();
      }
      if (!target?.closest("#statutoryPensionProjectionYearPopup")) {
        runtimeApi.hideStatutoryPensionProjectionYearPopup();
      }
      if (!target?.closest("#combinedWealthChartPopup")) {
        runtimeApi.hideCombinedWealthPopup();
      }
      if (target?.id === "combinedCashPositionPopup" || !target?.closest("#combinedCashPositionPopup")) {
        runtimeApi.hideCombinedCashPositionPopup();
      }
      if (
        runtimeHost.investmentIncludePopupOpen &&
        !target?.closest("#investmentIncludePopup") &&
        !target?.closest("[data-action='toggle-investment-include-popup']")
      ) {
        hideInvestmentIncludePopup();
      }
      if (!target?.closest("#baseDataPopup")) {
        runtimeApi.hideBaseDataPopup();
      }
      return;
    }

    event.preventDefault();
    const action = button.dataset.action;
    if (action !== "open-position-icon-picker" && action !== "select-position-icon") {
      runtimeApi.hidePositionIconPicker();
    }
    if (runtimeHost.positionFilterPopupOpen && action !== "toggle-position-filter" && !button.closest("#positionFilterPopup")) {
      runtimeApi.hidePositionFilterPopup();
    }
    if (action !== "close-statutory-pension-year-popup" && !button.closest("#statutoryPensionYearPopup")) {
      runtimeApi.hideStatutoryPensionYearPopup();
    }
    if (action !== "close-statutory-pension-projection-popup" && !button.closest("#statutoryPensionProjectionYearPopup")) {
      runtimeApi.hideStatutoryPensionProjectionYearPopup();
    }
    if (action !== "close-combined-wealth-popup" && !button.closest("#combinedWealthChartPopup")) {
      runtimeApi.hideCombinedWealthPopup();
    }
    if (
      action !== "close-combined-cash-position-popup" &&
      !action?.startsWith("select-combined-cash-account-") &&
      !button.closest("#combinedCashPositionPopup")
    ) {
      runtimeApi.hideCombinedCashPositionPopup();
    }
    if (
      runtimeHost.investmentIncludePopupOpen &&
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
      runtimeApi.hideBaseDataPopup();
    }
    if (action === "add-position") runtimeApi.addPosition();
    if (action === "reset") runtimeApi.resetState();
    if (action === "select-planning-year") {
      runtimeApi.setSelectedPlanningYear(button.dataset.planningYear || "start");
      return;
    }
    if (action === "show-income-positions") runtimeApi.setSelectedPositionMode("income");
    if (action === "show-expense-positions") runtimeApi.setSelectedPositionMode("expense");
    if (action?.startsWith("set-position-cadence-")) {
      runtimeApi.setSelectedPositionCadence(action.replace("set-position-cadence-", "") as PositionTableCadence);
    }
    if (action?.startsWith("open-position-cost-dialog-")) {
      runtimeApi.openPositionCostDialog(action.replace("open-position-cost-dialog-", ""));
    }
    if (action === "close-position-cost-dialog") runtimeApi.closePositionCostDialog();
    if (action === "add-position-cost-item") runtimeApi.addPositionCostBreakdownItem(button.dataset.positionId || "");
    if (action === "remove-position-cost-item") {
      runtimeApi.removePositionCostBreakdownItem(button.dataset.positionId || "", button.dataset.positionCostItemId || "");
    }
    if (action === "show-reserve-positions") runtimeApi.setSelectedPositionMode("reserve");
    if (action === "show-savings-positions") runtimeApi.setSelectedPositionMode("savings");
    if (action === "toggle-position-filter") runtimeApi.togglePositionFilterPopup();
    if (action === "close-position-filter") runtimeApi.hidePositionFilterPopup();
    if (action === "toggle-position-label-filter") runtimeApi.togglePositionLabelFilter(button.dataset.positionLabel || "");
    if (action === "add-position-filter") runtimeApi.addPositionTableFilter();
    if (action === "remove-position-filter") runtimeApi.removePositionTableFilter(button.dataset.filterId || "");
    if (action === "clear-position-sort") runtimeApi.clearPositionTableSort();
    if (action === "clear-position-table-view") runtimeApi.clearCurrentPositionTableView();
    if (action?.startsWith("sort-position-table-")) {
      runtimeApi.togglePositionTableSort(action.replace("sort-position-table-", "") as PositionTableFilterColumn);
    }
    if (action?.startsWith("open-section-")) {
      const section = appSectionIdFromValue(action.replace("open-section-", ""));
      if (!section) return;
      runtimeApi.setActiveSection(section);
      renderAll();
      return;
    }
    if (action === "add-planning-account") runtimeApi.addPlanningAccount();
    if (action === "rename-planning-account") runtimeApi.renamePlanningAccount();
    if (action === "cancel-planning-account-dialog") runtimeApi.closePlanningAccountDialog();
    if (action === "save-planning-account-dialog") runtimeApi.savePlanningAccountDialog();
    if (action === "delete-planning-account") runtimeApi.deletePlanningAccount();
    if (action?.startsWith("select-planning-account-")) {
      runtimeApi.selectPlanningAccount(action.replace("select-planning-account-", ""));
    }
    if (action?.startsWith("select-investment-account-")) {
      runtimeApi.selectInvestmentAccount(action.replace("select-investment-account-", ""));
    }
    if (action?.startsWith("toggle-real-estate-account-")) {
      runtimeApi.toggleRealEstateSourceAccount(action.replace("toggle-real-estate-account-", ""));
    }
    if (action?.startsWith("toggle-combined-account-")) {
      runtimeApi.toggleCombinedAccount(action.replace("toggle-combined-account-", ""));
    }
    if (action?.startsWith("select-combined-cash-account-")) {
      runtimeApi.selectCombinedCashAccount(action.replace("select-combined-cash-account-", ""));
      renderAll();
      return;
    }
    if (action?.startsWith("select-combined-lead-account-")) {
      runtimeApi.selectCombinedLeadInvestmentAccount(action.replace("select-combined-lead-account-", ""));
    }
    if (action === "toggle-combined-depot") {
      runtimeApi.toggleCombinedDepot(button.dataset.combinedDepot as CombinedWealthDepotKey | undefined);
      renderAll();
      return;
    }
    if (action === "select-combined-pension-scenario") {
      runtimeApi.selectCombinedPensionScenario(button.dataset.combinedPensionScenario as StatutoryPensionScenarioId | undefined);
      renderAll();
      return;
    }
    if (action === "toggle-result-max-needed") runtimeApi.toggleResultMaxNeeded();
    if (action === "set-investment-depot-standard") runtimeApi.setInvestmentDepot("standard");
    if (action === "set-investment-depot-retirement") runtimeApi.setInvestmentDepot("retirement");
    if (action === "set-investment-depot-child") runtimeApi.setInvestmentDepot("child");
    if (action === "toggle-retirement-depot-allowance") {
      runtimeApi.toggleRetirementDepotAllowance();
      return;
    }
    if (action === "toggle-investment-include-popup") runtimeApi.toggleInvestmentIncludePopup();
    if (action === "close-investment-include-popup") hideInvestmentIncludePopup();
    if (action === "toggle-real-estate-withdrawal-gain-source") runtimeApi.toggleRealEstateWithdrawalGainSource();
    if (action === "toggle-real-estate-depot-savings-rate-source") runtimeApi.toggleRealEstateDepotSavingsRateSource();
    if (action === "toggle-combined-module") {
      runtimeApi.toggleCombinedModule(button.dataset.combinedToggle as CombinedToggleKey);
      renderAll();
      return;
    }
    if (action === "add-real-estate-savings-source-equityCapital") runtimeApi.addRealEstateSavingsSource("equityCapital");
    if (action === "add-real-estate-savings-source-monthlyPayment") runtimeApi.addRealEstateSavingsSource("monthlyPayment");
    if (action === "add-real-estate-savings-source-specialRepayment") runtimeApi.addRealEstateSavingsSource("specialRepayment");
    if (action === "close-investment-chart-popup") hideInvestmentChartPopup();
    if (action === "close-statutory-pension-year-popup") runtimeApi.hideStatutoryPensionYearPopup();
    if (action === "close-statutory-pension-projection-popup") runtimeApi.hideStatutoryPensionProjectionYearPopup();
    if (action === "close-combined-wealth-popup") runtimeApi.hideCombinedWealthPopup();
    if (action === "close-combined-cash-position-popup") runtimeApi.hideCombinedCashPositionPopup();
    if (action === "open-statutory-pension-tax-popup") {
      runtimeApi.openStatutoryPensionTaxPopup(button.dataset.statutoryPensionScenario as StatutoryPensionScenarioId);
      return;
    }
    if (action === "close-statutory-pension-tax-popup") {
      runtimeApi.closeStatutoryPensionTaxPopup();
      return;
    }
    if (action === "toggle-theme-settings") runtimeApi.toggleThemeSettings();
    if (action === "toggle-settings-vault") runtimeApi.toggleSettingsVault();
    if (action === "vault-select") {
      void runtimeApi.handleVaultSelect();
      return;
    }
    if (action === "vault-create") {
      void runtimeApi.handleVaultCreate();
      return;
    }
    if (action === "vault-save-now") {
      void runtimeApi.handleVaultSaveNow();
      return;
    }
    if (action === "vault-reload") {
      void runtimeApi.handleVaultReload();
      return;
    }
    if (action === "vault-snapshot") {
      void runtimeApi.handleVaultSnapshot();
      return;
    }
    if (action === "toggle-settings-grunddaten") runtimeApi.toggleSettingsGrunddaten();
    if (action === "close-theme-settings") runtimeApi.hideThemeSettings();
    if (action === "open-base-data-popup") runtimeApi.openBaseDataPopup();
    if (action === "close-base-data-popup") runtimeApi.hideBaseDataPopup();
    if (action === "open-position-icon-picker") runtimeApi.showPositionIconPicker(button);
    if (action === "close-position-icon-picker") runtimeApi.hidePositionIconPicker();
    if (action === "select-position-icon") {
      runtimeApi.selectPositionIcon(button.dataset.positionId || "", button.dataset.positionIcon || "");
    }
    if (action === "set-theme-light") runtimeApi.setThemeMode("light");
    if (action === "set-theme-dark") runtimeApi.setThemeMode("dark");
    if (action === "select-real-estate-year") {
      const year = numberValue(button.dataset.year || "");
      const chartKind = button.dataset.chartKind === "trend" ? "trend" : "repayment";
      runtimeApi.setSelectedRealEstateYear(year);
      runtimeApi.showRealEstateChartPopup(year, chartKind, event.clientX, event.clientY);
      return;
    }
    if (action === "toggle-combined-wealth-line") {
      runtimeApi.toggleCombinedWealthLine(button.dataset.combinedWealthLine as CombinedWealthLineId | undefined);
      return;
    }
    if (action === "select-combined-wealth-year") {
      const year = numberValue(button.dataset.year || "");
      runtimeApi.selectCombinedWealthYearWithPopup(year, event.clientX, event.clientY);
      return;
    }
    if (action === "import-positions") document.querySelector<HTMLInputElement>("#positionsCsvImport")?.click();
    if (action === "export-positions") {
      void runtimeApi.exportCsvFile(
        "kosten-und-ruecklagenpositionen.csv",
        exportPositionsCsv(runtimeHost.state.positions),
        "Positionen-Export"
      );
    }
    if (action === "export-year") {
      void runtimeApi.exportCsvFile(
        "jahreskalkulator-ruecklagen.csv",
        exportYearTableCsv(runtimeApi.activePlanningSettings(), runtimeApi.activePlanningPositions(), runtimeHost.showResultMaxNeeded),
        "Jahrestabellen-Export"
      );
    }
}

function handleAppWindowKeyDown(event: KeyboardEvent): boolean | void {
  if (event.key === "Escape") {
    runtimeApi.hideThemeSettings();
    hideInvestmentChartPopup();
    runtimeApi.hideCombinedWealthPopup();
    runtimeApi.hideCombinedCashPositionPopup();
    runtimeApi.hideBaseDataPopup();
    runtimeApi.hideStatutoryPensionYearPopup();
    runtimeApi.hideStatutoryPensionProjectionYearPopup();
    runtimeApi.closeStatutoryPensionTaxPopup();
    hideInvestmentIncludePopup();
    runtimeApi.hidePositionFilterPopup();
    runtimeApi.closePlanningAccountDialog();
  }
}

function requestRenderAll(): void {
  runtimeHost.renderScheduler.request();
}

function clearInvestmentProjectionCaches(): void {
  runtimeHost.depotAssetProjectionCache.clear();
}

function renderAll(): void {
  if (runtimeHost.renderAllRunning) {
    requestRenderAll();
    return;
  }
  runtimeHost.renderScheduler.cancel();
  clearInvestmentProjectionCaches();
  runtimeHost.renderAllRunning = true;
  try {
    runtimeApi.syncActivePlanningAccountFromPositions();
    runtimeApi.syncPositionsFromActivePlanningAccount();
    runtimeApi.normalizeActivePlanningYear();
    runtimeApi.synchronizeAccountScopedState();
    runtimeApi.normalizeInvestmentBounds();
    runtimeApi.normalizeInvestmentDepotSelections();
    runtimeApi.normalizeInvestmentSelectionIds();
    runtimeApi.normalizeRealEstateSourceIds();
    runtimeApi.normalizeCombinedCashPositionIds();
    runtimeHost.state.investmentByAccountId = {
      ...runtimeHost.state.investmentByAccountId,
      [runtimeHost.state.ui.selectedInvestmentAccountId]: runtimeHost.state.investment
    };
    runtimeApi.updateModuleVisibility();
    runtimeApi.renderPlanningAccounts();
    runtimeApi.renderPlanningYearNavigation();
    const planningSettings = runtimeApi.activePlanningSettings();
    const activeReserve = calculateReserveSummary(planningSettings, runtimeApi.activePlanningPositions());
    runtimeApi.renderPositions();
    runtimeApi.renderPositionCostDialog();
    runtimeApi.renderInvestmentIncludeList();
    runtimeApi.renderCalculations(activeReserve);
    runtimeApi.renderSelfEmploymentRuntime();
    runtimeApi.syncPlanningInputsFromState();
    runtimeApi.syncRealEstateInputsFromState();
    runtimeApi.syncCombinedToggleInputsFromState();
    runtimeApi.syncInvestmentInputsFromState();
    runtimeApi.syncSettingsAccordionState();
    runtimeApi.renderIncomeRuntime();
    persistCurrentState();
  } finally {
    runtimeHost.renderAllRunning = false;
  }
}

function hideInvestmentChartPopup(): void {
  for (const popup of document.querySelectorAll<HTMLDivElement>(
    "#investmentChartPopup, #combinedInvestmentChartPopup, #realEstateChartPopup"
  )) {
    popup.hidden = true;
  }
}

function hideInvestmentIncludePopup(): void {
  runtimeHost.investmentIncludePopupOpen = false;
  const popup = document.querySelector<HTMLDivElement>("#investmentIncludePopup");
  if (popup) popup.hidden = true;
  document
    .querySelector<HTMLButtonElement>("[data-action='toggle-investment-include-popup']")
    ?.setAttribute("aria-expanded", "false");
}
