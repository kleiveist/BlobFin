import type { InvestmentSettings, PlanningAccount, PlanningSettings, ReservePosition, ThemeMode } from "../../types";
import { createVault, flushVaultSave, getVaultStatus, reloadFromVault, resetStoredState, selectVault, snapshotVault } from "../../lib/storage";
import { csvFileContents, downloadText, ensureCsvExtension, isDeferredModelInput, isTauriRuntime, setInputValue, setText } from "./runtimeDom";
import { defaultInvestmentSettings, defaultInvestmentSettingsForNewAccount } from "../../data/defaults";
import { parseCsv, positionsFromCsvRows } from "../../lib/csv";
import { positionFlow } from "../../lib/positionKinds";
import { runtimeApi, runtimeHost } from "./hostContext";

function syncAllInputsFromState(): void {
  syncPlanningInputsFromState();
  runtimeApi.syncRealEstateInputsFromState();
  runtimeApi.syncCombinedToggleInputsFromState();
  runtimeApi.syncInvestmentInputsFromState();
  syncThemeControls();
}

function syncPlanningInputsFromState(): void {
  for (const key of Object.keys(runtimeHost.state.settings) as Array<keyof PlanningSettings>) {
    setInputValue(`[data-setting="${key}"]`, runtimeHost.state.settings[key]);
  }
}

function toggleSettingsGrunddaten(): void {
  runtimeHost.state.ui = { ...runtimeHost.state.ui, settingsGrunddatenExpanded: !runtimeHost.state.ui.settingsGrunddatenExpanded };
  syncSettingsAccordionState();
  runtimeApi.persistCurrentState();
}

function toggleSettingsVault(): void {
  runtimeHost.state.ui = { ...runtimeHost.state.ui, settingsVaultExpanded: !runtimeHost.state.ui.settingsVaultExpanded };
  syncSettingsAccordionState();
  runtimeApi.persistCurrentState();
}

async function handleVaultSelect(): Promise<void> {
  setVaultStatusDetail("Vault-Auswahl wird geoeffnet...");
  await selectVault(runtimeHost.state);
  syncVaultControls();
}

async function handleVaultCreate(): Promise<void> {
  setVaultStatusDetail("Vault-Ordner wird vorbereitet...");
  await createVault(runtimeHost.state);
  syncVaultControls();
}

async function handleVaultSaveNow(): Promise<void> {
  setVaultStatusDetail("Vault wird gespeichert...");
  runtimeApi.persistCurrentState();
  await flushVaultSave(runtimeHost.state);
  syncVaultControls();
}

async function handleVaultReload(): Promise<void> {
  setVaultStatusDetail("Vault wird geladen...");
  const loadedState = await reloadFromVault();
  if (!loadedState) {
    syncVaultControls();
    return;
  }

  runtimeHost.state = runtimeApi.sanitizeAppState(loadedState);
  runtimeHost.investmentAccountContextId = runtimeHost.state.ui.selectedInvestmentAccountId;
  runtimeHost.selectedRealEstateYear = null;
  runtimeHost.selectedCombinedWealthYear = null;
  applyTheme();
  syncAllInputsFromState();
  runtimeApi.renderAll();
}

async function handleVaultSnapshot(): Promise<void> {
  setVaultStatusDetail("Snapshot wird erstellt...");
  const result = await snapshotVault();
  syncVaultControls(result ? `Snapshot erstellt: ${result.backupPath}` : undefined);
}

function syncSettingsAccordionState(): void {
  const vaultContent = document.querySelector<HTMLDivElement>("#vaultSettingsContent");
  const vaultButton = document.querySelector<HTMLButtonElement>("[data-action='toggle-settings-vault']");
  if (vaultContent) vaultContent.hidden = !runtimeHost.state.ui.settingsVaultExpanded;
  if (vaultButton) vaultButton.setAttribute("aria-expanded", String(runtimeHost.state.ui.settingsVaultExpanded));

  const content = document.querySelector<HTMLDivElement>("#grunddatenSettingsContent");
  const button = document.querySelector<HTMLButtonElement>("[data-action='toggle-settings-grunddaten']");
  if (content) content.hidden = !runtimeHost.state.ui.settingsGrunddatenExpanded;
  if (button) button.setAttribute("aria-expanded", String(runtimeHost.state.ui.settingsGrunddatenExpanded));
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

function resetState(): void {
  const confirmed = window.confirm("Moechtest du wirklich alle Grunddaten, Positionen und Investment-Einstellungen zuruecksetzen?");
  if (!confirmed) return;
  runtimeHost.state = resetStoredState();
  runtimeHost.state.investmentByAccountId = {
    [runtimeHost.state.ui.selectedInvestmentAccountId]: defaultInvestmentSettings()
  };
  runtimeHost.state.investment = runtimeHost.state.investmentByAccountId[runtimeHost.state.ui.selectedInvestmentAccountId];
  runtimeHost.investmentAccountContextId = runtimeHost.state.ui.selectedInvestmentAccountId;
  runtimeHost.selectedRealEstateYear = null;
  runtimeHost.selectedCombinedWealthYear = null;
  applyTheme();
  syncAllInputsFromState();
  hideThemeSettings();
  hideBaseDataPopup();
  runtimeApi.renderAll();
}

function setThemeMode(theme: ThemeMode): void {
  runtimeHost.state = { ...runtimeHost.state, theme };
  applyTheme();
  syncThemeControls();
  runtimeApi.persistCurrentState();
  runtimeApi.drawCurrentInvestmentChart();
}

function applyTheme(): void {
  document.documentElement.dataset.theme = runtimeHost.state.theme;
  const metaThemeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.content = runtimeHost.state.theme === "dark" ? "#101412" : "#f7f4ed";
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
  runtimeApi.updateModuleVisibility();
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
      (option.dataset.action === "set-theme-light" && runtimeHost.state.theme === "light") ||
      (option.dataset.action === "set-theme-dark" && runtimeHost.state.theme === "dark");
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

  runtimeHost.state.positions = imported;
  runtimeApi.syncActivePlanningAccountFromPositions();
  const activeAccount: PlanningAccount = runtimeApi.activePlanningAccount();
  const activeAccountId = activeAccount.id;
  const availablePositions: ReservePosition[] = activeAccount.yearlyRows;
  const settings = runtimeHost.state.investmentByAccountId[activeAccountId] ?? defaultInvestmentSettingsForNewAccount();
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
  runtimeHost.state.investmentByAccountId = {
    ...runtimeHost.state.investmentByAccountId,
    [activeAccountId]: nextSettings
  };
  if (runtimeHost.state.ui.selectedInvestmentAccountId === activeAccountId) {
    runtimeHost.state.investment = nextSettings;
  }
  runtimeHost.state.realEstate = {
    ...runtimeHost.state.realEstate,
    equityCapitalSourceIds: runtimeHost.state.realEstate.equityCapitalSourceIds.filter((id) =>
      availablePositions.some(
        (position) =>
          position.id === id && position.active && position.type === "savings" && positionFlow(position) === "expense"
      )
    ),
    monthlyPaymentSourceIds: runtimeHost.state.realEstate.monthlyPaymentSourceIds.filter((id) =>
      availablePositions.some(
        (position) =>
          position.id === id && position.active && position.type === "savings" && positionFlow(position) === "expense"
      )
    ),
    specialRepaymentSourceIds: runtimeHost.state.realEstate.specialRepaymentSourceIds.filter((id) =>
      availablePositions.some(
        (position) =>
          position.id === id && position.active && position.type === "savings" && positionFlow(position) === "expense"
      )
    )
  };
  runtimeApi.renderAll();
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
  if (runtimeHost.exportStatusTimeoutId) window.clearTimeout(runtimeHost.exportStatusTimeoutId);
  runtimeHost.exportStatusTimeoutId = window.setTimeout(() => {
    status.textContent = "";
    runtimeHost.exportStatusTimeoutId = undefined;
  }, 3500);
}

function syncCommittedPlanningSettingInput(
  target: HTMLInputElement | HTMLSelectElement,
  field: keyof PlanningSettings
): void {
  if (!isDeferredModelInput(target)) return;
  target.value = String(runtimeHost.state.settings[field]);
}

export function configureSettingsRuntime(): void {
  Object.assign(runtimeApi, {
    syncAllInputsFromState,
    syncPlanningInputsFromState,
    toggleSettingsGrunddaten,
    toggleSettingsVault,
    handleVaultSelect,
    handleVaultCreate,
    handleVaultSaveNow,
    handleVaultReload,
    handleVaultSnapshot,
    syncSettingsAccordionState,
    syncVaultControls,
    setVaultStatusDetail,
    vaultStatusLabel,
    formatVaultTimestamp,
    setButtonDisabled,
    resetState,
    setThemeMode,
    applyTheme,
    toggleThemeSettings,
    hideThemeSettings,
    openBaseDataPopup,
    hideBaseDataPopup,
    syncThemeControls,
    importPositionsFromFile,
    exportCsvFile,
    saveCsvWithNativeDialog,
    showExportStatus,
    syncCommittedPlanningSettingInput
  });
}
