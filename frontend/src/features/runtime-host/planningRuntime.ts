import type { PlanningAccount, PlanningSettings } from "../../types";
import { clamp, escapeHtml, intNumber, numberValue } from "../../lib/format";
import { createId, defaultInvestmentSettingsForNewAccount } from "../../data/defaults";
import { planningYearOptions } from "../../lib/planningYears";
import { runtimeApi, runtimeHost } from "./hostContext";

type NumericPlanningSetting = Exclude<keyof PlanningSettings, "endDate">;

export function planningSettingNumberValue(field: NumericPlanningSetting, value: string): number {
  const numericValue = clamp(numberValue(value), settingMin(field), settingMax(field));
  return field === "year" ? Math.round(numericValue) : numericValue;
}

export function normalizePlanningEndDate(value: unknown, minYear: number): string {
  const fallbackYear = clamp(Math.round(minYear), settingMin("year"), 2200);
  const parsed = planningDateParts(value);
  if (!parsed) return `${fallbackYear}-12-31`;
  if (parsed.year < fallbackYear) return `${fallbackYear}-12-31`;
  const year = clamp(parsed.year, settingMin("year"), 2200);
  return `${year}-${String(parsed.month).padStart(2, "0")}-${String(parsed.day).padStart(2, "0")}`;
}

export function planningDateParts(value: unknown): { year: number; month: number; day: number } | null {
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

export function settingMin(field: keyof PlanningSettings): number {
  if (field === "year") return 2000;
  return 0;
}

export function settingMax(field: keyof PlanningSettings): number {
  if (field === "year") return 2100;
  return Number.MAX_SAFE_INTEGER;
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

  const activeAccount = runtimeApi.activePlanningAccount();
  const totalsByType = runtimeHost.state.planningAccounts.reduce(
    (accumulator, account) => {
      if (account.type === "cost_reserve") accumulator.costReserve += 1;
      else if (account.type === "annual_table") accumulator.annualTable += 1;
      else accumulator.mixed += 1;
      return accumulator;
    },
    { costReserve: 0, annualTable: 0, mixed: 0 }
  );

  cards.innerHTML = runtimeHost.state.planningAccounts
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
    yearSelector.innerHTML = runtimeHost.state.planningAccounts.length
      ? runtimeHost.state.planningAccounts
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
    investmentSelector.innerHTML = runtimeHost.state.planningAccounts.length
      ? runtimeHost.state.planningAccounts
          .map((account) => {
            const isActive = account.id === runtimeHost.state.ui.selectedInvestmentAccountId;
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
    realEstateAccountSelector.innerHTML = runtimeHost.state.planningAccounts.length
      ? runtimeHost.state.planningAccounts
          .map((account) => {
            const active = runtimeHost.state.ui.selectedRealEstateAccountIds.includes(account.id);
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
    combinedAccountSelector.innerHTML = runtimeHost.state.planningAccounts.length
      ? runtimeHost.state.planningAccounts
          .map((account) => {
            const active = runtimeHost.state.ui.selectedCombinedAccountIds.includes(account.id);
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
    combinedLeadAccountSelector.innerHTML = runtimeHost.state.planningAccounts.length
      ? runtimeHost.state.planningAccounts
          .map((account) => {
            const active = runtimeHost.state.ui.selectedCombinedLeadInvestmentAccountId === account.id;
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

  summary.textContent = `Konten gesamt: ${runtimeHost.state.planningAccounts.length} | mixed: ${totalsByType.mixed} | cost_reserve: ${totalsByType.costReserve} | annual_table: ${totalsByType.annualTable}`;
  yearAccountName.textContent = `(aktiv: ${activeAccount.name}, ${runtimeApi.activePlanningYearLabel()})`;
  renderPlanningAccountDialog();
}

function renderPlanningYearNavigation(): void {
  const host = document.querySelector<HTMLDivElement>("#planningYearNavigation");
  const label = document.querySelector<HTMLSpanElement>("#planningYearActiveLabel");
  if (!host) return;

  const selectedYear = runtimeApi.activePlanningYear();
  const currentYear = new Date().getFullYear();
  const yearButtons = planningYearOptions(runtimeHost.state.settings.year)
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
  if (label) label.textContent = runtimeApi.activePlanningYearLabel();
}

function addPlanningAccount(): void {
  runtimeHost.accountDialog = {
    mode: "create",
    accountId: null,
    name: `Konto ${runtimeHost.state.planningAccounts.length + 1}`,
    type: "mixed",
    error: ""
  };
  renderPlanningAccountDialog();
}

function renamePlanningAccount(): void {
  const account = runtimeApi.activePlanningAccount();
  runtimeHost.accountDialog = {
    mode: "rename",
    accountId: account.id,
    name: account.name,
    type: account.type,
    error: ""
  };
  renderPlanningAccountDialog();
}

function updateAccountDialogDraft(field: string, value: string): void {
  if (!runtimeHost.accountDialog) return;
  if (field === "type") {
    runtimeHost.accountDialog = {
      ...runtimeHost.accountDialog,
      type: value === "cost_reserve" || value === "annual_table" || value === "mixed" ? value : runtimeHost.accountDialog.type,
      error: ""
    };
    return;
  }
  if (field === "name") {
    runtimeHost.accountDialog = { ...runtimeHost.accountDialog, name: value, error: "" };
  }
}

function closePlanningAccountDialog(): void {
  runtimeHost.accountDialog = null;
  renderPlanningAccountDialog();
}

function savePlanningAccountDialog(): void {
  if (!runtimeHost.accountDialog) return;
  const name = runtimeHost.accountDialog.name.trim();
  if (!name) {
    runtimeHost.accountDialog = { ...runtimeHost.accountDialog, error: "Bitte einen Kontonamen eingeben." };
    renderPlanningAccountDialog();
    return;
  }

  if (runtimeHost.accountDialog.mode === "rename" && runtimeHost.accountDialog.accountId) {
    runtimeHost.state.planningAccounts = runtimeHost.state.planningAccounts.map((item) =>
      item.id === runtimeHost.accountDialog?.accountId ? { ...item, name, type: runtimeHost.accountDialog.type } : item
    );
    runtimeHost.accountDialog = null;
    runtimeApi.renderAll();
    return;
  }

  const account: PlanningAccount = {
    id: createId(),
    name,
    type: runtimeHost.accountDialog.type,
    yearlyRows: []
  };
  runtimeApi.syncActivePlanningAccountFromPositions();
  runtimeHost.state.planningAccounts = [...runtimeHost.state.planningAccounts, account];
  runtimeHost.state.investmentByAccountId = {
    ...runtimeHost.state.investmentByAccountId,
    [account.id]: defaultInvestmentSettingsForNewAccount()
  };
  runtimeHost.state.ui = {
    ...runtimeHost.state.ui,
    selectedPlanningAccountId: account.id,
    selectedInvestmentAccountId: account.id,
    selectedRealEstateAccountIds: Array.from(new Set([...runtimeHost.state.ui.selectedRealEstateAccountIds, account.id])),
    selectedRealEstateWithdrawalGainAccountIds: Array.from(new Set([...runtimeHost.state.ui.selectedRealEstateAccountIds, account.id])),
    selectedCombinedAccountIds: Array.from(new Set([...runtimeHost.state.ui.selectedCombinedAccountIds, account.id]))
  };
  runtimeHost.state.positions = account.yearlyRows;
  runtimeHost.accountDialog = null;
  runtimeApi.renderAll();
}

function renderPlanningAccountDialog(): void {
  const host = document.querySelector<HTMLDivElement>("#planningAccountDialogHost");
  if (!host) return;
  if (!runtimeHost.accountDialog) {
    host.innerHTML = "";
    return;
  }
  host.innerHTML = `
    <div class="account-dialog-backdrop" role="presentation">
      <div class="account-dialog" role="dialog" aria-modal="true" aria-label="Konto bearbeiten">
        <div class="settings-popover-head">
          <strong>${runtimeHost.accountDialog.mode === "create" ? "Neues Konto" : "Konto bearbeiten"}</strong>
          <button class="chart-popup-close" type="button" data-action="cancel-planning-account-dialog" aria-label="Konto-Dialog schliessen">x</button>
        </div>
        <div class="field-grid">
          <label class="field">
            <span>Kontoname</span>
            <input type="text" value="${escapeHtml(runtimeHost.accountDialog.name)}" data-account-dialog-field="name" />
          </label>
          <label class="field">
            <span>Kontotyp</span>
            <select data-account-dialog-field="type">
              <option value="mixed" ${runtimeHost.accountDialog.type === "mixed" ? "selected" : ""}>Gemischt</option>
              <option value="cost_reserve" ${runtimeHost.accountDialog.type === "cost_reserve" ? "selected" : ""}>Kosten/Ruecklagen</option>
              <option value="annual_table" ${runtimeHost.accountDialog.type === "annual_table" ? "selected" : ""}>Jahrestabelle</option>
            </select>
          </label>
        </div>
        ${runtimeHost.accountDialog.error ? `<div class="validation-box error">${escapeHtml(runtimeHost.accountDialog.error)}</div>` : ""}
        <div class="button-row">
          <button class="button secondary" type="button" data-action="cancel-planning-account-dialog">Abbrechen</button>
          <button class="button" type="button" data-action="save-planning-account-dialog">Speichern</button>
        </div>
      </div>
    </div>
  `;
}

function deletePlanningAccount(): void {
  if (runtimeHost.state.planningAccounts.length <= 1) {
    window.alert("Mindestens ein Konto muss bestehen bleiben.");
    return;
  }
  const account = runtimeApi.activePlanningAccount();
  const confirmed = window.confirm(`Konto '${account.name}' wirklich loeschen?`);
  if (!confirmed) return;
  runtimeHost.state.planningAccounts = runtimeHost.state.planningAccounts.filter((item) => item.id !== account.id);
  const nextPlanningAccountId = runtimeHost.state.planningAccounts[0].id;
  const nextRealEstateAccountIds = runtimeHost.state.ui.selectedRealEstateAccountIds.filter((accountId) => accountId !== account.id);
  const nextCombinedAccountIds = runtimeHost.state.ui.selectedCombinedAccountIds.filter((accountId) => accountId !== account.id);
  const nextInvestmentByAccountId = { ...runtimeHost.state.investmentByAccountId };
  delete nextInvestmentByAccountId[account.id];
  runtimeHost.state.investmentByAccountId = nextInvestmentByAccountId;
  runtimeHost.state.ui = {
    ...runtimeHost.state.ui,
    selectedPlanningAccountId: nextPlanningAccountId,
    selectedInvestmentAccountId:
      runtimeHost.state.ui.selectedInvestmentAccountId === account.id ? nextPlanningAccountId : runtimeHost.state.ui.selectedInvestmentAccountId,
    selectedRealEstateAccountIds: nextRealEstateAccountIds,
    selectedRealEstateWithdrawalGainAccountIds: nextRealEstateAccountIds,
    selectedCombinedAccountIds: nextCombinedAccountIds
  };
  runtimeApi.syncPositionsFromActivePlanningAccount();
  runtimeApi.renderAll();
}

function selectPlanningAccount(accountId: string): void {
  if (!accountId || accountId === runtimeHost.state.ui.selectedPlanningAccountId) return;
  if (!runtimeHost.state.planningAccounts.some((account) => account.id === accountId)) return;
  runtimeApi.syncActivePlanningAccountFromPositions();
  runtimeHost.state.ui = { ...runtimeHost.state.ui, selectedPlanningAccountId: accountId };
  runtimeApi.syncPositionsFromActivePlanningAccount();
  runtimeApi.renderAll();
}

function selectInvestmentAccount(accountId: string): void {
  if (!accountId || accountId === runtimeHost.state.ui.selectedInvestmentAccountId) return;
  if (!runtimeHost.state.planningAccounts.some((account) => account.id === accountId)) return;
  runtimeHost.state.ui = { ...runtimeHost.state.ui, selectedInvestmentAccountId: accountId };
  runtimeApi.hideInvestmentIncludePopup();
  runtimeApi.renderAll();
}

function toggleRealEstateSourceAccount(accountId: string): void {
  if (!accountId || !runtimeHost.state.planningAccounts.some((account) => account.id === accountId)) return;
  const selected = new Set(runtimeHost.state.ui.selectedRealEstateAccountIds);
  if (selected.has(accountId)) selected.delete(accountId);
  else selected.add(accountId);
  const selectedIds = Array.from(selected);
  runtimeHost.state.ui = {
    ...runtimeHost.state.ui,
    selectedRealEstateAccountIds: selectedIds,
    selectedRealEstateWithdrawalGainAccountIds: selectedIds
  };
  runtimeApi.resetRealEstateDetailSelection();
  runtimeApi.renderAll();
}

function toggleCombinedAccount(accountId: string): void {
  if (!accountId || !runtimeHost.state.planningAccounts.some((account) => account.id === accountId)) return;
  const selected = new Set(runtimeHost.state.ui.selectedCombinedAccountIds);
  if (selected.has(accountId)) selected.delete(accountId);
  else selected.add(accountId);
  runtimeHost.state.ui = {
    ...runtimeHost.state.ui,
    selectedCombinedAccountIds: Array.from(selected)
  };
  runtimeApi.renderAll();
}

function selectCombinedLeadInvestmentAccount(accountId: string): void {
  if (!accountId || !runtimeHost.state.planningAccounts.some((account) => account.id === accountId)) return;
  if (runtimeHost.state.ui.selectedCombinedLeadInvestmentAccountId === accountId) return;
  runtimeHost.state.ui = { ...runtimeHost.state.ui, selectedCombinedLeadInvestmentAccountId: accountId };
  runtimeApi.renderAll();
}

export function configurePlanningAccountsRuntime(): void {
  Object.assign(runtimeApi, {
    renderPlanningAccounts,
    renderPlanningYearNavigation,
    addPlanningAccount,
    renamePlanningAccount,
    updateAccountDialogDraft,
    closePlanningAccountDialog,
    savePlanningAccountDialog,
    renderPlanningAccountDialog,
    deletePlanningAccount,
    selectPlanningAccount,
    selectInvestmentAccount,
    toggleRealEstateSourceAccount,
    toggleCombinedAccount,
    selectCombinedLeadInvestmentAccount
  });
}
