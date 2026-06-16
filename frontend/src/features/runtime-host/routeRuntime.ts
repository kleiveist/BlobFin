import type { AppSectionId, AppState, InvestmentSettings, PlanningAccount, PlanningSettings, PlanningYearSelection, ReservePosition } from "../../types";
import { appSectionIdFromValue } from "../../app/router";
import { defaultIncomePlanningState, defaultIncomeTrackerState, defaultInvestmentSettings, defaultInvestmentSettingsForNewAccount, defaultSelfEmploymentState } from "../../data/defaults";
import { normalizeCombinedWealthState } from "./stateRuntime";
import { positionsForPlanningYearWithMonthlySavingsCarryover, sanitizePlanningYearSelection } from "../../lib/planningYears";
import { runtimeApi, runtimeHost } from "./hostContext";
import { sanitizeIncomeYearEntriesWithTaxRules } from "../income-tracker";

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
      yearlyRows: appState.positions.map((position) => runtimeApi.sanitizePosition(position, appState.settings.year))
    }
  ];
  const planningAccounts: PlanningAccount[] = appState.planningAccounts.length
    ? appState.planningAccounts.map((account) => ({
        ...account,
        yearlyRows: account.yearlyRows.map((position) => runtimeApi.sanitizePosition(position, appState.settings.year))
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
    appState.positions.map((position) => runtimeApi.sanitizePosition(position, appState.settings.year));
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

  runtimeHost.investmentAccountContextId = selectedInvestmentAccountId;
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
  if (!runtimeHost.state.planningAccounts.length) {
    runtimeHost.state.planningAccounts = [
      {
        id: "default-account",
        name: "Standardkonto",
        type: "mixed",
        yearlyRows: runtimeHost.state.positions
      }
    ];
  }
  const account =
    runtimeHost.state.planningAccounts.find((item) => item.id === runtimeHost.state.ui.selectedPlanningAccountId) ?? runtimeHost.state.planningAccounts[0];
  if (!account) {
    throw new Error("No planning account available.");
  }
  if (runtimeHost.state.ui.selectedPlanningAccountId !== account.id) {
    runtimeHost.state.ui = { ...runtimeHost.state.ui, selectedPlanningAccountId: account.id };
  }
  return account;
}

function planningAccountById(accountId: string): PlanningAccount | null {
  return runtimeHost.state.planningAccounts.find((account) => account.id === accountId) ?? null;
}

function planningAccountsByIds(accountIds: string[]): PlanningAccount[] {
  if (!accountIds.length) return [];
  return accountIds
    .map((accountId) => planningAccountById(accountId))
    .filter((account): account is PlanningAccount => account !== null);
}

function selectedInvestmentPlanningAccount(): PlanningAccount {
  const selectedId = runtimeHost.state.ui.selectedInvestmentAccountId;
  const fallbackId = runtimeHost.state.ui.selectedPlanningAccountId;
  const account = planningAccountById(selectedId) ?? planningAccountById(fallbackId) ?? runtimeHost.state.planningAccounts[0] ?? null;
  if (!account) {
    throw new Error("No planning account available for investment.");
  }
  if (runtimeHost.state.ui.selectedInvestmentAccountId !== account.id) {
    runtimeHost.state.ui = { ...runtimeHost.state.ui, selectedInvestmentAccountId: account.id };
  }
  return account;
}

function selectedRealEstateSourceAccounts(): PlanningAccount[] {
  return planningAccountsByIds(runtimeHost.state.ui.selectedRealEstateAccountIds);
}

function selectedRealEstateWithdrawalAccounts(): PlanningAccount[] {
  return selectedRealEstateSourceAccounts();
}

function selectedCombinedCashPlanningAccount(): PlanningAccount | null {
  const account =
    (runtimeHost.state.combinedWealth.cashAccountId ? planningAccountById(runtimeHost.state.combinedWealth.cashAccountId) : null) ??
    planningAccountById(runtimeHost.state.ui.selectedPlanningAccountId) ??
    runtimeHost.state.planningAccounts[0] ??
    null;
  if (account && runtimeHost.state.combinedWealth.cashAccountId !== account.id) {
    runtimeHost.state.combinedWealth = { ...runtimeHost.state.combinedWealth, cashAccountId: account.id };
  }
  return account;
}

function selectedCombinedLeadInvestmentPlanningAccount(): PlanningAccount | null {
  const leadId = runtimeHost.state.ui.selectedCombinedLeadInvestmentAccountId;
  const lead =
    planningAccountById(leadId) ??
    planningAccountById(runtimeHost.state.ui.selectedInvestmentAccountId) ??
    runtimeHost.state.planningAccounts[0] ??
    null;
  if (!lead) return null;
  if (runtimeHost.state.ui.selectedCombinedLeadInvestmentAccountId !== lead.id) {
    runtimeHost.state.ui = { ...runtimeHost.state.ui, selectedCombinedLeadInvestmentAccountId: lead.id };
  }
  return lead;
}

function normalizeActivePlanningYear(): void {
  const selectedPlanningYear = sanitizePlanningYearSelection(runtimeHost.state.ui.selectedPlanningYear, runtimeHost.state.settings.year);
  if (selectedPlanningYear !== runtimeHost.state.ui.selectedPlanningYear) {
    runtimeHost.state.ui = { ...runtimeHost.state.ui, selectedPlanningYear };
  }
}

function activePlanningYear(): PlanningYearSelection {
  return sanitizePlanningYearSelection(runtimeHost.state.ui.selectedPlanningYear, runtimeHost.state.settings.year);
}

function activePlanningSettings(): PlanningSettings {
  return {
    ...runtimeHost.state.settings,
    year: activePlanningYear() ?? runtimeHost.state.settings.year
  };
}

function activePlanningYearLabel(): string {
  const year = activePlanningYear();
  return year === null ? "Start" : String(year);
}

function activePlanningPositions(): ReservePosition[] {
  return positionsForPlanningYearWithMonthlySavingsCarryover(
    runtimeHost.state.positions,
    activePlanningYear(),
    runtimeHost.state.settings.year
  );
}

function planningAccountForActiveYear(account: PlanningAccount): PlanningAccount {
  return {
    ...account,
    yearlyRows: positionsForPlanningYearWithMonthlySavingsCarryover(
      account.yearlyRows,
      activePlanningYear(),
      runtimeHost.state.settings.year
    )
  };
}

function planningAccountsForActiveYear(): PlanningAccount[] {
  return runtimeHost.state.planningAccounts.map(planningAccountForActiveYear);
}

function synchronizeAccountScopedState(): void {
  const accountIds = runtimeHost.state.planningAccounts.map((account) => account.id);
  if (!accountIds.length) return;

  if (runtimeHost.investmentAccountContextId && accountIds.includes(runtimeHost.investmentAccountContextId)) {
    runtimeHost.state.investmentByAccountId = {
      ...runtimeHost.state.investmentByAccountId,
      [runtimeHost.investmentAccountContextId]: runtimeHost.state.investment
    };
  }

  const selectedPlanningAccountId = accountIds.includes(runtimeHost.state.ui.selectedPlanningAccountId)
    ? runtimeHost.state.ui.selectedPlanningAccountId
    : accountIds[0];
  const selectedInvestmentAccountId = accountIds.includes(runtimeHost.state.ui.selectedInvestmentAccountId)
    ? runtimeHost.state.ui.selectedInvestmentAccountId
    : selectedPlanningAccountId;
  const selectedRealEstateAccountIds = runtimeHost.state.ui.selectedRealEstateAccountIds.filter((accountId) =>
    accountIds.includes(accountId)
  );
  const normalizedRealEstateAccountIds = selectedRealEstateAccountIds.length
    ? selectedRealEstateAccountIds
    : [...accountIds];
  const selectedCombinedAccountIds = runtimeHost.state.ui.selectedCombinedAccountIds.filter((accountId) =>
    accountIds.includes(accountId)
  );
  const selectedCombinedLeadInvestmentAccountId = accountIds.includes(runtimeHost.state.ui.selectedCombinedLeadInvestmentAccountId)
    ? runtimeHost.state.ui.selectedCombinedLeadInvestmentAccountId
    : selectedInvestmentAccountId;
  const normalizedCombinedLeadInvestmentAccountId = accountIds.includes(selectedCombinedLeadInvestmentAccountId)
    ? selectedCombinedLeadInvestmentAccountId
    : selectedInvestmentAccountId;

  const investmentByAccountId = accountIds.reduce<Record<string, InvestmentSettings>>((result, accountId) => {
    result[accountId] = runtimeHost.state.investmentByAccountId[accountId] ?? defaultInvestmentSettingsForNewAccount();
    return result;
  }, {});

  runtimeHost.state.investmentByAccountId = investmentByAccountId;
  runtimeHost.state.ui = {
    ...runtimeHost.state.ui,
    selectedPlanningAccountId,
    selectedInvestmentAccountId,
    selectedRealEstateAccountIds: normalizedRealEstateAccountIds,
    selectedRealEstateWithdrawalGainAccountIds: normalizedRealEstateAccountIds,
    selectedCombinedAccountIds,
    selectedCombinedLeadInvestmentAccountId: normalizedCombinedLeadInvestmentAccountId
  };
  runtimeHost.state.combinedWealth = normalizeCombinedWealthState(
    runtimeHost.state.combinedWealth,
    accountIds,
    normalizedCombinedLeadInvestmentAccountId
  );
  runtimeHost.state.investment = runtimeHost.state.investmentByAccountId[selectedInvestmentAccountId] ?? defaultInvestmentSettingsForNewAccount();
  runtimeHost.investmentAccountContextId = selectedInvestmentAccountId;
}

function syncActivePlanningAccountFromPositions(): void {
  const account = activePlanningAccount();
  runtimeHost.state.planningAccounts = runtimeHost.state.planningAccounts.map((item) =>
    item.id === account.id ? { ...item, yearlyRows: runtimeHost.state.positions } : item
  );
}

function syncPositionsFromActivePlanningAccount(): void {
  runtimeHost.state.positions = activePlanningAccount().yearlyRows;
}

function applyInitialRoute(): void {
  const section = runtimeHost.appContext.router.currentSection() ?? "home";
  runtimeHost.state.ui = { ...runtimeHost.state.ui, activeSection: section };
  runtimeHost.appContext.router.replaceSection(section);
}

function setActiveSection(section: AppSectionId, options: { updateHistory?: boolean } = {}): void {
  const activeSection = runtimeHost.appContext.router.sectionFromValue(section) ?? "home";
  runtimeHost.state.ui = { ...runtimeHost.state.ui, activeSection };
  if (options.updateHistory !== false) {
    runtimeHost.appContext.router.pushSection(activeSection);
  }
  runtimeApi.hideThemeSettings();
  runtimeApi.hideStatutoryPensionTaxPopup();
}

function updateModuleVisibility(): void {
  const activeSection = runtimeHost.state.ui.activeSection;
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

export function configureRouteRuntime(): void {
  Object.assign(runtimeApi, {
    sanitizeAppState,
    activePlanningAccount,
    planningAccountById,
    planningAccountsByIds,
    selectedInvestmentPlanningAccount,
    selectedRealEstateSourceAccounts,
    selectedRealEstateWithdrawalAccounts,
    selectedCombinedCashPlanningAccount,
    selectedCombinedLeadInvestmentPlanningAccount,
    normalizeActivePlanningYear,
    activePlanningYear,
    activePlanningSettings,
    activePlanningYearLabel,
    activePlanningPositions,
    planningAccountForActiveYear,
    planningAccountsForActiveYear,
    synchronizeAccountScopedState,
    syncActivePlanningAccountFromPositions,
    syncPositionsFromActivePlanningAccount,
    applyInitialRoute,
    setActiveSection,
    updateModuleVisibility
  });
}
