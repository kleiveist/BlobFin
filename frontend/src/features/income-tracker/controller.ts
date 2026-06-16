import { createId } from "../../data/defaults";
import { buildIncomeAnalysisLabelDetails } from "../../domain/incomeAnalysis";
import { INCOME_YEAR_LABEL_OPTIONS } from "../../domain/incomeLabels";
import {
  applyCapitalGainsTaxToEntries,
  buildIncomeChartModel,
  buildIncomeTrackerModel,
  capitalGainsTaxBreakdown,
  CAPITAL_GAINS_ALLOWANCE_LIMIT,
  DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT,
  emptyIncomeTaxAdjustment,
  emptyIncomeTaxDeductionItems,
  incomeTaxDeductionItemsTotal,
  incomeYearEntryCalculatedNetIncome,
  incomeYearEntryNetIncome,
  incomeYearEntryTaxDeductions,
  incomeYearEntryTaxTotal,
  INCOME_SOURCE_LABELS,
  type IncomeTrackerModel
} from "../../domain/incomeTracker";
import {
  evaluateIncomeTaxAndContributionRules,
  isCapitalGainsTaxRuleLabel,
  normalizeIncomeTaxRuleLabel,
  SIDE_INCOME_TAX_RULE_LABELS,
  taxRuleConfigForYear,
  type IncomeTaxRuleResult
} from "../../domain/incomeTaxRules";
import { clamp, escapeHtml, money, normalizeHeader, numberValue, percent } from "../../lib/format";
import { positionIconSvg } from "../../lib/positionIcons";
import type { AppState, CareerMilestone, IncomeResolvedSource, IncomeTaxDeductionField, IncomeTrackerSettings, IncomeYearEntry, InvestmentDepotKey } from "../../types";
import {
  CAPITAL_GAINS_CHURCH_TAX_RATE_OPTIONS,
  CAREER_MILESTONE_IMPACT_OPTIONS,
  CAREER_MILESTONE_TYPE_OPTIONS,
  INCOME_EMPLOYMENT_CONTEXT_OPTIONS,
  INCOME_MINIJOB_TYPE_OPTIONS,
  INCOME_STUDENT_EMPLOYMENT_MODE_OPTIONS,
  INCOME_TAX_ADJUSTMENT_OPTIONS,
  INCOME_TAX_DEDUCTION_ROWS,
  type IncomeTaxDeductionCategory
} from "./config";
import {
  incomeTrackerUiState,
  type IncomeAnalysisChartType,
  type IncomeAnalysisDataView
} from "./uiState";
import { renderIncomeAnalysisDialog } from "./renderAnalysis";
import { renderIncomeCharts } from "./chartController";
import { configureIncomeTrackerPickers, renderIncomeMilestoneTypePicker, renderIncomeYearLabelPicker } from "./labelPickerController";
import {
  exportIncomeCsvWithContext,
  exportIncomePdfWithContext,
  exportIncomePlanningCsvFileWithContext,
  cssEscape,
  incomeEmploymentContext,
  incomeInteger,
  incomeMilestoneImpact,
  incomeMinijobType,
  incomePerson,
  incomeProjectionMode,
  incomeStudentEmploymentMode,
  incomeTaxAdjustmentType,
  incomeYearSource,
  importIncomeCsvFromFileWithContext,
  importIncomePlanningCsvFromFileWithContext,
  nullableInputNumber,
  signedMoney,
  signedPercent,
  signedPercentagePoints,
  type IncomeTrackerExportContext
} from "./exportController";

interface IncomeTrackerHost {
  getState(): AppState;
  persistCurrentState(): void;
  renderAll(): void;
  exportCsvFile(fileName: string, contents: string, label: string, showStatus?: (message: string) => void): Promise<void>;
}

let host: IncomeTrackerHost;

export function configureIncomeTrackerHost(nextHost: IncomeTrackerHost): void {
  host = nextHost;
  configureIncomeTrackerPickers({ getState: () => host.getState(), renderAll: () => host.renderAll(), sanitizeIncomeYearEntriesWithTaxRules });
}

function requireIncomeTrackerHost(): void {
  if (!host) throw new Error("Income tracker feature host has not been configured.");
}

export function renderIncomeTracker(): void {
  requireIncomeTrackerHost();
  const panel = document.querySelector<HTMLElement>('[data-module-section="income"]');
  if (!panel) return;
  const model = incomeTrackerModel();
  renderIncomeTabs();
  renderIncomeYearLabelFilters();
  renderIncomeRows();
  renderIncomeSettingControls();
  renderIncomeMetricGrid(model);
  renderIncomeInsights(model);
  renderIncomeYearStatusRows(model);
  renderIncomeCharts(model, incomeChartModel(), host.getState().incomeTracker.yearlyEntries, host.getState().incomeTracker.settings.projectionMode);
  renderIncomeTaxDialog();
  renderIncomeAnalysisDialog(model, host.getState().incomeTracker.yearlyEntries);
  renderIncomeYearLabelPicker();
  renderIncomeMilestoneTypePicker();
}

function incomeTrackerModel(): IncomeTrackerModel {
  return buildIncomeTrackerModel(host.getState().incomeTracker, {
    annualInflationRatePercent: incomeGeneralInflationRatePercent()
  });
}

function incomeChartModel(): IncomeTrackerModel {
  return buildIncomeChartModel(host.getState().incomeTracker, {
    annualInflationRatePercent: incomeGeneralInflationRatePercent()
  });
}

function incomeGeneralInflationRatePercent(): number {
  const investment = host.getState().investment;
  switch (activeIncomeTrackerInvestmentDepot()) {
    case "retirement":
      return investment.retirementInflationRatePercent;
    case "child":
      return investment.childInflationRatePercent;
    case "standard":
      return investment.inflationRatePercent;
  }
}

function activeIncomeTrackerInvestmentDepot(): InvestmentDepotKey {
  const depot = host.getState().investment.activeDepot;
  return depot === "retirement" || depot === "child" ? depot : "standard";
}

function setSectionHidden(selector: string, hidden: boolean): void {
  const element = document.querySelector<HTMLElement>(selector);
  if (element) element.hidden = hidden;
}

function setText(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function setInputValue(selector: string, value: number | string | string[]): void {
  for (const input of document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(selector)) {
    if (input === document.activeElement) continue;
    input.value = String(value);
  }
}

function incomeTaxRuleForEntry(
  entry: IncomeYearEntry,
  entries: IncomeYearEntry[] = host.getState().incomeTracker.yearlyEntries
): IncomeTaxRuleResult {
  const annualAmount = incomeYearEntryRuleAmount(entry);
  return evaluateIncomeTaxAndContributionRules({
    label: incomeYearLabel(entry.label),
    annualAmount,
    monthlyAmount: annualAmount / 12,
    year: entry.year,
    aggregatedSideIncome: incomeAggregatedSideIncome(entry, entries),
    employmentContext: entry.employmentContext,
    minijobType: entry.minijobType,
    considerPensionInsurance: entry.considerPensionInsurance,
    isRvExempt: entry.isRvExempt,
    shortTermEmploymentDays: entry.shortTermEmploymentDays,
    shortTermEmploymentMonths: entry.shortTermEmploymentMonths,
    studentEmploymentMode: entry.studentEmploymentMode,
    requiresManualTaxReview: entry.requiresManualTaxReview
  });
}

function incomeYearEntryRuleAmount(entry: IncomeYearEntry): number {
  return Math.max(0, numberValue(entry.annualGrossIncome ?? entry.annualNetIncome));
}

function incomeAggregatedSideIncome(entry: IncomeYearEntry, entries: IncomeYearEntry[]): number {
  return entries
    .filter((item) => item.year === entry.year && (item.active || item.id === entry.id))
    .filter((item) => SIDE_INCOME_TAX_RULE_LABELS.has(incomeYearLabel(item.label)))
    .reduce((sum, item) => sum + incomeYearEntryRuleAmount(item), 0);
}

function incomeTaxCategoryEnabled(rule: IncomeTaxRuleResult, category: IncomeTaxDeductionCategory): boolean {
  return category === "taxes" ? rule.taxFieldsEnabled : rule.contributionFieldsEnabled;
}

function incomeTaxDialogCanOpen(entry: IncomeYearEntry, rule = incomeTaxRuleForEntry(entry)): boolean {
  return rule.status !== "locked" || incomeYearLabel(entry.label) === "minijob";
}

function incomeTaxDeductionRowEnabled(
  entry: IncomeYearEntry,
  rule: IncomeTaxRuleResult,
  row: (typeof INCOME_TAX_DEDUCTION_ROWS)[number]
): boolean {
  const capitalRow = incomeTaxDeductionRowIsCapital(row);
  if (isCapitalGainsTaxRuleLabel(incomeYearLabel(entry.label))) return capitalRow;
  if (capitalRow) return false;
  if (!incomeTaxCategoryEnabled(rule, row.category)) return false;
  const minijobRvOnly =
    !rule.taxFieldsEnabled &&
    rule.contributionFieldsEnabled &&
    Boolean(entry.considerPensionInsurance) &&
    !entry.isRvExempt &&
    (incomeYearLabel(entry.label) === "minijob" ||
      (incomeYearLabel(entry.label) === "student_newspaper_delivery" &&
        (entry.studentEmploymentMode ?? "minijob") === "minijob"));
  if (!minijobRvOnly) return true;
  return row.field === "pensionInsurance";
}

function incomeTaxDeductionRowIsCapital(row: (typeof INCOME_TAX_DEDUCTION_ROWS)[number]): boolean {
  return Boolean(row.capitalOnly);
}

function incomeCapitalGainsAllowanceUsedBefore(entry: IncomeYearEntry, entries: IncomeYearEntry[] = host.getState().incomeTracker.yearlyEntries): number {
  let used = 0;
  for (const item of entries) {
    if (item.id === entry.id) break;
    if (!item.active || item.year !== entry.year || !isCapitalGainsTaxRuleLabel(incomeYearLabel(item.label))) continue;
    used += numberValue(item.capitalGainsAllowance);
  }
  return clamp(roundCurrency(used), 0, CAPITAL_GAINS_ALLOWANCE_LIMIT);
}

function incomeCapitalGainsAllowanceRemainingBefore(entry: IncomeYearEntry, entries: IncomeYearEntry[] = host.getState().incomeTracker.yearlyEntries): number {
  return roundCurrency(CAPITAL_GAINS_ALLOWANCE_LIMIT - incomeCapitalGainsAllowanceUsedBefore(entry, entries));
}

export function sanitizeIncomeYearEntriesWithTaxRules(entries: IncomeYearEntry[]): IncomeYearEntry[] {
  const capitalSanitizedEntries = applyCapitalGainsTaxToEntries(entries);
  return capitalSanitizedEntries.map((entry) => sanitizeIncomeYearEntryWithTaxRules(entry, capitalSanitizedEntries));
}

function sanitizeIncomeYearEntryWithTaxRules(
  entry: IncomeYearEntry,
  entries: IncomeYearEntry[]
): IncomeYearEntry {
  if (isCapitalGainsTaxRuleLabel(incomeYearLabel(entry.label))) {
    return entry;
  }

  const rule = incomeTaxRuleForEntry(entry, entries);
  const grossLocked = rule.status === "locked";
  if (rule.taxFieldsEnabled && rule.contributionFieldsEnabled && !grossLocked) return entry;
  const taxDeductionItems = { ...entry.taxDeductionItems };
  for (const row of INCOME_TAX_DEDUCTION_ROWS) {
    if (!incomeTaxDeductionRowEnabled(entry, rule, row)) {
      taxDeductionItems[row.field] = null;
    }
  }
  return {
    ...entry,
    annualGrossIncome: grossLocked ? null : entry.annualGrossIncome,
    taxDeductionItems,
    taxAdjustment: rule.taxFieldsEnabled ? entry.taxAdjustment : emptyIncomeTaxAdjustment(),
    taxesAndDeductions: incomeTaxDeductionItemsTotal(taxDeductionItems)
  };
}

function capitalGainsChurchTaxRate(value: number | null | undefined): number {
  return value === 8 ? 8 : DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT;
}

function roundCurrency(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function renderIncomeLiveUpdate(collection?: string, id?: string, field?: string): void {
  const model = incomeTrackerModel();
  if (collection === "yearlyEntries" && id) {
    renderIncomeYearlyNetCell(id, field);
    renderIncomeYearlyGrossCell(id);
    renderIncomeYearlyTaxButton(id);
    if (incomeTrackerUiState.taxDialogEntryId === id && incomeTaxRuleStructuralField(field)) {
      renderIncomeTaxDialog();
    } else {
      renderIncomeTaxDialogTotals(id);
    }
  }
  renderIncomeMetricGrid(model);
  renderIncomeInsights(model);
  renderIncomeYearStatusRows(model);
  renderIncomeCharts(model, incomeChartModel(), host.getState().incomeTracker.yearlyEntries, host.getState().incomeTracker.settings.projectionMode);
  renderIncomeAnalysisDialog(model, host.getState().incomeTracker.yearlyEntries);
}

function incomeTaxRuleStructuralField(field: string | undefined): boolean {
  if (!field) return false;
  return (
    field === "year" ||
    field === "active" ||
    field === "label" ||
    field === "annualGrossIncome" ||
    field === "annualNetIncome" ||
    field === "employmentContext" ||
    field === "minijobType" ||
    field === "considerPensionInsurance" ||
    field === "isRvExempt" ||
    field === "shortTermEmploymentDays" ||
    field === "shortTermEmploymentMonths" ||
    field === "studentEmploymentMode" ||
    field === "requiresManualTaxReview" ||
    field === "capitalGainsChurchTaxEnabled" ||
    field === "capitalGainsChurchTaxRatePercent"
  );
}

function renderIncomeYearlyNetCell(id: string, changedField?: string): void {
  const entry = host.getState().incomeTracker.yearlyEntries.find((item) => item.id === id);
  const input = document.querySelector<HTMLInputElement>(`[data-income-year-net="${cssEscape(id)}"]`);
  if (!entry || !input) return;
  const calculatedNet = incomeYearEntryCalculatedNetIncome(entry);
  const netValue = incomeYearEntryNetIncome(entry);
  input.disabled = calculatedNet !== null;
  if (changedField === "annualNetIncome" && calculatedNet === null && document.activeElement === input) return;
  input.value = netValue === null ? "" : String(netValue);
}

function renderIncomeYearlyGrossCell(id: string): void {
  const entry = host.getState().incomeTracker.yearlyEntries.find((item) => item.id === id);
  const input = document.querySelector<HTMLInputElement>(`[data-income-year-gross="${cssEscape(id)}"]`);
  if (!entry || !input) return;
  const rule = incomeTaxRuleForEntry(entry);
  const locked = rule.status === "locked";
  const title = locked ? incomeTaxRuleTooltipText(rule) : "";
  const cell = input.closest<HTMLTableCellElement>("[data-income-year-gross-cell]");
  input.disabled = locked;
  input.title = title;
  input.value = locked || entry.annualGrossIncome === null ? "" : String(entry.annualGrossIncome);
  if (cell) cell.title = title;
}

function renderIncomeYearlyTaxButton(id: string): void {
  const entry = host.getState().incomeTracker.yearlyEntries.find((item) => item.id === id);
  const value = document.querySelector<HTMLElement>(`[data-income-year-tax-total="${cssEscape(id)}"]`);
  if (!entry || !value) return;
  const taxDeductions = incomeYearEntryTaxDeductions(entry);
  const rule = incomeTaxRuleForEntry(entry);
  const locked = rule.status === "locked";
  const canOpen = incomeTaxDialogCanOpen(entry, rule);
  const button = value.closest<HTMLButtonElement>(".income-tax-button");
  const cell = value.closest<HTMLTableCellElement>("[data-income-year-tax-cell]");
  const label = button?.querySelector("span");
  const title = locked ? incomeTaxButtonTooltipText(entry, rule) : "";
  value.textContent = locked && canOpen ? "Optionen" : locked ? "Gesperrt" : taxDeductions === null ? "Eintragen" : money(taxDeductions);
  if (cell) cell.title = title;
  if (button) {
    button.disabled = !canOpen;
    button.title = title;
    button.dataset.action = canOpen ? `income-open-tax-dialog-${entry.id}` : "";
    button.classList.toggle("locked", locked);
    button.classList.toggle("partial", rule.status === "partially_enabled");
  }
  if (label) {
    label.textContent = locked && canOpen ? "RV moeglich" : locked ? "Nicht moeglich" : rule.status === "partially_enabled" ? "Teilweise" : "Details";
  }
}

function renderIncomeTaxDialogTotals(id: string): void {
  if (incomeTrackerUiState.taxDialogEntryId !== id) return;
  const entry = host.getState().incomeTracker.yearlyEntries.find((item) => item.id === id);
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
  const activeTab = host.getState().incomeTracker.settings.activeInputTab;
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
  const container = document.querySelector<HTMLDivElement>("#incomeYearLabelFilters");
  if (!container) return;
  const selected = new Set(host.getState().incomeTracker.settings.selectedYearlyLabels.map(incomeYearLabel));
  const options = INCOME_YEAR_LABEL_OPTIONS;
  container.innerHTML = `
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
  if (!host.getState().incomeTracker.yearlyEntries.length) {
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
      const rule = incomeTaxRuleForEntry(entry);
      const grossLocked = rule.status === "locked";
      const lockedTooltip = grossLocked ? incomeTaxRuleTooltipText(rule) : "";
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
        <td data-income-year-gross-cell="${escapeHtml(entry.id)}" title="${escapeHtml(lockedTooltip)}">${incomeNumberInput("yearlyEntries", entry.id, "annualGrossIncome", grossLocked ? null : entry.annualGrossIncome, {
          min: 0,
          disabled: grossLocked,
          title: lockedTooltip,
          extraAttribute: `data-income-year-gross="${escapeHtml(entry.id)}"`
        })}</td>
        <td data-income-year-tax-cell="${escapeHtml(entry.id)}" title="${escapeHtml(lockedTooltip)}">${incomeTaxDeductionsButton(entry, rule)}</td>
        <td><button class="icon-button danger" type="button" data-action="income-remove-yearly-${entry.id}" aria-label="Jahreswert entfernen">x</button></td>
      </tr>
    `;
    })
    .join("");
}

function renderIncomeTaxDialog(): void {
  const root = document.querySelector<HTMLDivElement>("#incomeTaxDialogRoot");
  if (!root) return;
  const entry = host.getState().incomeTracker.yearlyEntries.find((item) => item.id === incomeTrackerUiState.taxDialogEntryId);
  if (!entry) {
    root.innerHTML = "";
    incomeTrackerUiState.taxDialogEntryId = null;
    return;
  }

  const taxTotal = incomeTaxDeductionCategoryTotal(entry, "taxes");
  const socialTotal = incomeTaxDeductionCategoryTotal(entry, "social");
  const employerSocialTotal = incomeTaxDeductionCategoryTotal(entry, "employer_social");
  const total = incomeYearEntryTaxDeductions(entry);
  const rule = incomeTaxRuleForEntry(entry);
  const capitalMode = isCapitalGainsTaxRuleLabel(incomeYearLabel(entry.label));
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
        ${incomeTaxRulePanel(entry, rule)}
        ${incomeTaxRuleContextControls(entry)}
        ${
          capitalMode
            ? incomeCapitalGainsTaxSection(entry)
            : `<div class="table-wrap">
          <table class="income-table income-tax-table">
            <thead>
              <tr>
                <th>Nr.</th>
                <th>Text</th>
                <th>Betrag</th>
              </tr>
            </thead>
            <tbody>
              ${INCOME_TAX_DEDUCTION_ROWS.filter((row) => !incomeTaxDeductionRowIsCapital(row)).map(
                (row) => {
                  const enabled = incomeTaxDeductionRowEnabled(entry, rule, row);
                  const lockedReason = enabled ? "" : incomeTaxLockedRowReason(entry, row, rule);
                  return `
                  <tr class="${enabled ? "" : "income-tax-row-locked"}" title="${escapeHtml(lockedReason)}">
                    <td class="numeric-cell">${escapeHtml(row.nr)}</td>
                    <td>
                      ${escapeHtml(row.label)}
                      ${enabled ? "" : `<small>${escapeHtml(lockedReason)}</small>`}
                    </td>
                    <td>${incomeNumberInput("yearlyEntries", entry.id, `taxDeductionItems.${row.field}`, entry.taxDeductionItems[row.field], {
                      min: 0,
                      disabled: !enabled,
                      title: lockedReason
                    })}</td>
                  </tr>
                `;
                }
              ).join("")}
            </tbody>
          </table>
        </div>`
        }
        <div class="income-tax-summary">
          <div>
            <span>Kategorie</span>
            <strong>Summe</strong>
          </div>
          <div>
            <span>Steuern</span>
            <strong id="incomeTaxDialogTaxesTotal">${money(taxTotal)}</strong>
          </div>
          ${
            capitalMode
              ? ""
              : `<div>
            <span>Sozialversicherung Arbeitnehmer</span>
            <strong id="incomeTaxDialogSocialTotal">${money(socialTotal)}</strong>
          </div>
          <div>
            <span>Sozialversicherung Arbeitgeber</span>
            <strong id="incomeTaxDialogEmployerSocialTotal">${money(employerSocialTotal)}</strong>
          </div>`
          }
          <div class="total">
            <span>Gesamt ohne Arbeitgeber</span>
            <strong id="incomeTaxDialogGrandTotal">${total === null ? "-" : money(total)}</strong>
          </div>
        </div>
        ${
          capitalMode
            ? ""
            : `<div class="income-tax-adjustment ${rule.taxFieldsEnabled ? "" : "locked"}">
          <div>
            <strong>Steuernachzahlung oder Rueckerstattung</strong>
            <span>${escapeHtml(
              rule.taxFieldsEnabled
                ? "Dieser Wert wird in der Weltgrafik bei Abgabenmix, Steuern und Einkommen beruecksichtigt."
                : incomeTaxLockedCategoryReason("taxes", rule)
            )}</span>
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
                    ${rule.taxFieldsEnabled ? "" : "disabled"}
                  />
                  <span>${escapeHtml(option.label)}</span>
                </label>
              `
            ).join("")}
          </div>
          <div class="income-tax-adjustment-amount">
            <span>Betrag</span>
            ${incomeNumberInput("yearlyEntries", entry.id, "taxAdjustment.amount", entry.taxAdjustment.amount, {
              min: 0,
              disabled: !rule.taxFieldsEnabled
            })}
          </div>
        </div>`
        }
        <div class="button-row">
          <button class="button" type="button" data-action="income-close-tax-dialog">Fertig</button>
        </div>
      </div>
    </div>
  `;
}

function incomeCapitalGainsTaxSection(entry: IncomeYearEntry): string {
  const breakdown = capitalGainsTaxBreakdown(entry);
  const remainingBefore = incomeCapitalGainsAllowanceRemainingBefore(entry);
  const enteredAllowance = numberValue(entry.capitalGainsAllowance);
  const remainingAfter = Math.max(0, remainingBefore - (entry.active ? enteredAllowance : 0));
  const allowanceMax = entry.active ? Math.max(0, remainingBefore) : CAPITAL_GAINS_ALLOWANCE_LIMIT;
  const allowanceLocked = entry.active && allowanceMax <= 0 && enteredAllowance <= 0;
  const allowanceTitle = allowanceLocked
    ? "Der Sparer-Pauschbetrag ist fuer dieses Jahr bereits durch vorherige Kapitalpositionen verbraucht."
    : `Maximal verfuegbar fuer diesen Eintrag: ${money(allowanceMax)}.`;
  return `
    <section class="income-capital-tax-panel">
      <div class="income-capital-tax-head">
        <div>
          <strong>Kapitalertragsteuer</strong>
          <span>Sparer-Pauschbetrag wird pro Jahr bis ${money(CAPITAL_GAINS_ALLOWANCE_LIMIT)} in Eintragsreihenfolge verbraucht.</span>
        </div>
        <strong>${money(breakdown.totalTax)}</strong>
      </div>
      <div class="income-capital-tax-controls">
        <label>
          <span>Geltend gemachter Freibetrag</span>
          ${incomeNumberInput("yearlyEntries", entry.id, "capitalGainsAllowance", entry.capitalGainsAllowance, {
            min: 0,
            max: allowanceMax,
            disabled: allowanceLocked,
            title: allowanceTitle
          })}
          <small>${escapeHtml(allowanceTitle)}</small>
        </label>
        ${incomeInlineCheckbox(entry, "capitalGainsChurchTaxEnabled", Boolean(entry.capitalGainsChurchTaxEnabled), "Kirchensteuerpflichtig")}
        <label>
          <span>Kirchensteuersatz</span>
          ${incomeSelect(
            "yearlyEntries",
            entry.id,
            "capitalGainsChurchTaxRatePercent",
            CAPITAL_GAINS_CHURCH_TAX_RATE_OPTIONS,
            capitalGainsChurchTaxRate(entry.capitalGainsChurchTaxRatePercent)
          )}
        </label>
      </div>
      <div class="income-capital-tax-grid">
        ${incomeCapitalTaxMetric("Kapitalertrag", money(breakdown.capitalIncome))}
        ${incomeCapitalTaxMetric("Verbrauch vor diesem Eintrag", money(CAPITAL_GAINS_ALLOWANCE_LIMIT - remainingBefore))}
        ${incomeCapitalTaxMetric("Verbleibend nach diesem Eintrag", money(remainingAfter))}
        ${incomeCapitalTaxMetric("Steuerpflichtiger Betrag", money(breakdown.taxableAmount))}
        ${incomeCapitalTaxMetric("Kapitalertragsteuer", money(breakdown.capitalGainsTax))}
        ${incomeCapitalTaxMetric("Solidaritaetszuschlag", money(breakdown.solidaritySurcharge))}
        ${incomeCapitalTaxMetric("Kirchensteuer", money(breakdown.churchTax))}
        ${incomeCapitalTaxMetric("Gesamtsteuer", money(breakdown.totalTax))}
      </div>
    </section>
  `;
}

function incomeCapitalTaxMetric(label: string, value: string): string {
  return `
    <div class="income-capital-tax-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function incomeTaxRulePanel(entry: IncomeYearEntry, rule: IncomeTaxRuleResult): string {
  const config = taxRuleConfigForYear(entry.year);
  const label = incomeYearLabel(entry.label);
  const warning = rule.warningKey ? incomeTaxRuleWarningText(rule.warningKey) : "";
  const badgeText =
    rule.status === "enabled"
      ? "Manuelle Steuer-/Abgabenposition moeglich"
      : rule.status === "partially_enabled"
        ? "Teilweise freigegeben"
        : "Gesperrt";
  return `
    <section class="income-tax-rule-panel ${escapeHtml(rule.status)}">
      <div class="income-tax-rule-main">
        <span class="income-tax-rule-badge">${escapeHtml(badgeText)}</span>
        <strong>${escapeHtml(incomeTaxRuleReasonText(rule.reasonKey))}</strong>
        ${warning ? `<p>${escapeHtml(warning)}</p>` : ""}
      </div>
      <div class="income-tax-rule-facts">
        <span>Steuerlich relevant: <strong>${money(rule.taxableAmount)}</strong></span>
        <span>Beitragsrelevant: <strong>${money(rule.contributionRelevantAmount)}</strong></span>
        ${rule.estimatedEmployeePensionContribution !== undefined ? `<span>Geschaetzter RV-Eigenanteil: <strong>${money(rule.estimatedEmployeePensionContribution)}</strong></span>` : ""}
        ${label === "minijob" || label === "student_newspaper_delivery" ? `<span>Minijob-Grenze ${entry.year}: <strong>${money(config.minijobMonthlyLimit)} / Monat</strong></span>` : ""}
        ${label === "volunteer_allowance" ? `<span>Ehrenamtspauschale ${entry.year}: <strong>${money(config.volunteerAllowance)} / Jahr</strong></span>` : ""}
        ${label === "trainer_allowance" ? `<span>Übungsleiterpauschale ${entry.year}: <strong>${money(config.trainerAllowance)} / Jahr</strong></span>` : ""}
        ${isCapitalGainsTaxRuleLabel(label) ? `<span>Sparer-Pauschbetrag ${entry.year}: <strong>${money(CAPITAL_GAINS_ALLOWANCE_LIMIT)} / Jahr</strong></span>` : ""}
      </div>
    </section>
  `;
}

function incomeTaxRuleContextControls(entry: IncomeYearEntry): string {
  const label = incomeYearLabel(entry.label);
  const controls: string[] = [];

  if (label === "severance_payment") {
    controls.push(`
      <label>
        <span>Abfindungskontext</span>
        ${incomeSelect("yearlyEntries", entry.id, "employmentContext", INCOME_EMPLOYMENT_CONTEXT_OPTIONS, entry.employmentContext ?? "job_loss")}
      </label>
    `);
  }

  if (label === "student_newspaper_delivery") {
    controls.push(`
      <label>
        <span>Beschaeftigungsmodus</span>
        ${incomeSelect(
          "yearlyEntries",
          entry.id,
          "studentEmploymentMode",
          INCOME_STUDENT_EMPLOYMENT_MODE_OPTIONS,
          entry.studentEmploymentMode ?? "minijob"
        )}
      </label>
    `);
  }

  const usesMinijobControls =
    label === "minijob" || (label === "student_newspaper_delivery" && (entry.studentEmploymentMode ?? "minijob") === "minijob");
  if (usesMinijobControls) {
    controls.push(`
      <label>
        <span>Minijob-Art</span>
        ${incomeSelect("yearlyEntries", entry.id, "minijobType", INCOME_MINIJOB_TYPE_OPTIONS, entry.minijobType ?? "commercial")}
      </label>
      ${incomeInlineCheckbox(entry, "considerPensionInsurance", Boolean(entry.considerPensionInsurance), "Rentenversicherungspflicht beruecksichtigen")}
      ${incomeInlineCheckbox(entry, "isRvExempt", Boolean(entry.isRvExempt), "Von Rentenversicherungspflicht befreit")}
    `);
  }

  if (label === "student_newspaper_delivery" && (entry.studentEmploymentMode ?? "minijob") === "short_term") {
    controls.push(`
      <label>
        <span>Arbeitstage im Kalenderjahr</span>
        ${incomeNumberInput("yearlyEntries", entry.id, "shortTermEmploymentDays", entry.shortTermEmploymentDays ?? null, {
          min: 0,
          step: 1
        })}
      </label>
      <label>
        <span>Monate im Kalenderjahr</span>
        ${incomeNumberInput("yearlyEntries", entry.id, "shortTermEmploymentMonths", entry.shortTermEmploymentMonths ?? null, {
          min: 0,
          step: 1
        })}
      </label>
      ${incomeInlineCheckbox(entry, "requiresManualTaxReview", Boolean(entry.requiresManualTaxReview), "Manuelle steuerliche Pruefung erforderlich")}
    `);
  }

  if (!controls.length) return "";
  return `<section class="income-tax-context-controls">${controls.join("")}</section>`;
}

function incomeInlineCheckbox(entry: IncomeYearEntry, field: string, checked: boolean, label: string): string {
  return `
    <label class="income-tax-inline-checkbox">
      ${incomeCheckboxInput("yearlyEntries", entry.id, field, checked, label)}
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

function incomeTaxLockedCategoryReason(category: IncomeTaxDeductionCategory, rule: IncomeTaxRuleResult): string {
  if (category === "taxes" && !rule.taxFieldsEnabled) return "Steuerfelder sind fuer dieses Label gesperrt.";
  if (category !== "taxes" && !rule.contributionFieldsEnabled) return "Sozialabgabenfelder sind fuer dieses Label gesperrt.";
  return "";
}

function incomeTaxLockedRowReason(
  entry: IncomeYearEntry,
  row: (typeof INCOME_TAX_DEDUCTION_ROWS)[number],
  rule: IncomeTaxRuleResult
): string {
  const categoryReason = incomeTaxLockedCategoryReason(row.category, rule);
  if (categoryReason) return categoryReason;
  if (
    !rule.taxFieldsEnabled &&
    rule.contributionFieldsEnabled &&
    Boolean(entry.considerPensionInsurance) &&
    !entry.isRvExempt
  ) {
    return "Nur der Arbeitnehmerbeitrag zur gesetzlichen RV ist freigegeben.";
  }
  return "Dieses Feld ist fuer die aktuelle Regel gesperrt.";
}

function incomeTaxRuleReasonText(reasonKey: string): string {
  const textByKey: Record<string, string> = {
    "incomeTaxRules.default.enabled": "Normale Steuer- und Abgabenpositionen sind freigegeben.",
    "incomeTaxRules.pocketMoney.locked": "Taschengeld wird nicht als Arbeitslohn behandelt.",
    "incomeTaxRules.childYouthJobs.locked": "Kinder- und Jugendjobs wie Zeitung austragen werden hier nicht als lohnsteuerpflichtiger Arbeitslohn gefuehrt.",
    "incomeTaxRules.onlineSales.locked": "Online-Verkaeufe werden hier nicht als steuer- oder beitragspflichtiger Arbeitslohn gefuehrt.",
    "incomeTaxRules.insurancePayouts.locked": "Versicherungsauszahlungen werden hier nicht als steuer- oder beitragspflichtiger Arbeitslohn gefuehrt.",
    "incomeTaxRules.severance.jobLoss": "Abfindungen wegen Verlust des Arbeitsplatzes bleiben fuer Sozialabgaben gesperrt.",
    "incomeTaxRules.severance.earnedClaim": "Zahlungen fuer bereits entstandene Ansprueche sind zur manuellen Pruefung freigegeben.",
    "incomeTaxRules.garage.locked": "Nebeneinkuenfte liegen innerhalb der konfigurierten Freigrenze.",
    "incomeTaxRules.garage.sideIncomeExceeded": "Schwelle ueberschritten - manuelle Steuerposition moeglich.",
    "incomeTaxRules.capitalGains.enabled": "Kapitalertraege werden ueber Sparer-Pauschbetrag, Kapitalertragsteuer, Soli und optionale Kirchensteuer berechnet.",
    "incomeTaxRules.volunteer.locked": "Bis zur Ehrenamtspauschale ist keine Steuer-/Abgabenposition erforderlich.",
    "incomeTaxRules.volunteer.allowanceExceeded": "Ehrenamtspauschale ueberschritten - nur der Mehrbetrag ist steuerlich relevant.",
    "incomeTaxRules.trainer.locked": "Bis zum Übungsleiterfreibetrag ist keine Steuer-/Abgabenposition erforderlich.",
    "incomeTaxRules.trainer.allowanceExceeded": "Übungsleiterfreibetrag überschritten - nur der Mehrbetrag ist steuerlich relevant.",
    "incomeTaxRules.minijob.locked": "Pauschale Besteuerung angenommen; Steuer- und Sozialabgabenfelder bleiben gesperrt.",
    "incomeTaxRules.minijob.rvExempt": "Befreiung von der Rentenversicherungspflicht ist gesetzt.",
    "incomeTaxRules.minijob.rvActive": "Rentenversicherungspflicht ist aktiv; Sozialabgaben koennen erfasst werden.",
    "incomeTaxRules.minijob.annualLimitExceeded": "Minijob-Jahresgrenze ueberschritten - manuelle Pruefung noetig.",
    "incomeTaxRules.studentNewspaper.minijob": "Schuelerjob wird nach Minijob-Regeln bewertet.",
    "incomeTaxRules.studentNewspaper.shortTermLocked": "Kurzfristige Beschaeftigung liegt innerhalb der konfigurierten Dauergrenzen.",
    "incomeTaxRules.studentNewspaper.shortTermTaxReview": "Kurzfristige Beschaeftigung mit manueller steuerlicher Pruefung.",
    "incomeTaxRules.studentNewspaper.shortTermLimitExceeded": "Dauergrenze ueberschritten - Steuer- und Abgabenpositionen sind freigegeben."
  };
  return textByKey[reasonKey] ?? "Regelstatus wurde angewendet.";
}

function incomeTaxRuleWarningText(warningKey: string): string {
  const textByKey: Record<string, string> = {
    "incomeTaxRules.severance.warning": "Zahlungen fuer bereits entstandene Ansprueche koennen abweichend beitragspflichtig sein.",
    "incomeTaxRules.garage.general": "Einnahmen aus Garage oder Stellplatz werden als Vermietung/Verpachtung behandelt. Die 410 EUR sind kein eigener Garage-Freibetrag, sondern nur die aggregierte Nebeneinkuenfte-Pruefung.",
    "incomeTaxRules.volunteer.warningAllowanceExceeded": "Nur der uebersteigende Betrag ist gesondert zu pruefen.",
    "incomeTaxRules.trainer.warningAllowanceExceeded": "Nur der übersteigende Betrag ist gesondert zu pruefen.",
    "incomeTaxRules.minijob.warningAnnualLimitExceeded": "Die Minijob-Grenze wird jahresbezogen geprueft; einzelne Monatsabweichungen koennen zulaessig sein.",
    "incomeTaxRules.minijob.monthlyLimitNote": "Einzelne Monatsueberschreitungen koennen zulaessig sein, solange die Jahresgrenze eingehalten wird.",
    "incomeTaxRules.studentNewspaper.warningShortTermLimitExceeded": "Zeitung austragen wird separat gefuehrt; je nach Ausgestaltung gelten Minijob- oder Kurzfristigkeitsregeln."
  };
  return textByKey[warningKey] ?? "";
}

function incomeTaxRuleTooltipText(rule: IncomeTaxRuleResult): string {
  const reason = incomeTaxRuleReasonText(rule.reasonKey);
  const warning = rule.warningKey ? incomeTaxRuleWarningText(rule.warningKey) : "";
  return warning ? `${reason} ${warning}` : reason;
}

function incomeTaxButtonTooltipText(entry: IncomeYearEntry, rule: IncomeTaxRuleResult): string {
  const text = incomeTaxRuleTooltipText(rule);
  if (rule.status === "locked" && incomeYearLabel(entry.label) === "minijob") {
    return `${text} Rentenversicherungspflicht kann im Dialog aktiviert werden.`;
  }
  return text;
}

function renderIncomeMilestoneRows(): void {
  const body = document.querySelector<HTMLTableSectionElement>("#incomeMilestoneRows");
  if (!body) return;
  if (!host.getState().incomeTracker.milestones.length) {
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
  return [...host.getState().incomeTracker.yearlyEntries].sort(
    (first, second) =>
      first.year - second.year ||
      incomeYearLabelMeta(first.label).label.localeCompare(incomeYearLabelMeta(second.label).label, "de") ||
      first.id.localeCompare(second.id)
  );
}

function incomeFilteredYearEntries(): IncomeYearEntry[] {
  const selected = new Set(host.getState().incomeTracker.settings.selectedYearlyLabels.map(incomeYearLabel));
  const entries = incomeSortedYearEntries();
  if (!selected.size) return entries;
  return entries.filter((entry) => selected.has(incomeYearLabel(entry.label)));
}

function incomeSortedMilestones(): CareerMilestone[] {
  return [...host.getState().incomeTracker.milestones].sort((first, second) => {
    const firstYear = first.linkedYear ?? incomeYearFromDate(first.date) ?? 9999;
    const secondYear = second.linkedYear ?? incomeYearFromDate(second.date) ?? 9999;
    return firstYear - secondYear || first.date.localeCompare(second.date) || first.id.localeCompare(second.id);
  });
}

function renderIncomeSettingControls(): void {
  const settings = host.getState().incomeTracker.settings;
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
  const normalized = normalizeIncomeTaxRuleLabel(String(value ?? "").trim());
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
  options: { min?: number; max?: number; step?: number; disabled?: boolean; title?: string; extraAttribute?: string } = {}
): string {
  return `
    <input
      type="number"
      value="${value ?? ""}"
      ${options.min !== undefined ? `min="${options.min}"` : ""}
      ${options.max !== undefined ? `max="${options.max}"` : ""}
      step="${options.step ?? 0.01}"
      ${options.disabled ? "disabled" : ""}
      ${options.title ? `title="${escapeHtml(options.title)}"` : ""}
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

function incomeTaxDeductionsButton(entry: IncomeYearEntry, rule = incomeTaxRuleForEntry(entry)): string {
  const taxDeductions = incomeYearEntryTaxDeductions(entry);
  const locked = rule.status === "locked";
  const canOpen = incomeTaxDialogCanOpen(entry, rule);
  const stateLabel =
    locked && canOpen ? "RV moeglich" : locked ? "Nicht moeglich" : rule.status === "partially_enabled" ? "Teilweise" : "Details";
  const mainLabel = locked && canOpen ? "Optionen" : locked ? "Gesperrt" : taxDeductions === null ? "Eintragen" : money(taxDeductions);
  const lockedTooltip = locked ? incomeTaxButtonTooltipText(entry, rule) : "";
  return `
    <button
      class="income-tax-button ${locked ? "locked" : rule.status === "partially_enabled" ? "partial" : ""}"
      type="button"
      ${canOpen ? `data-action="income-open-tax-dialog-${escapeHtml(entry.id)}"` : "disabled"}
      ${lockedTooltip ? `title="${escapeHtml(lockedTooltip)}"` : ""}
      aria-label="${locked && canOpen ? `Steuer- und Abgabenoptionen bearbeiten: ${escapeHtml(lockedTooltip)}` : locked ? `Steuer- und Abgabenpositionen gesperrt: ${escapeHtml(lockedTooltip)}` : "Steuer- und Abgabenpositionen bearbeiten"}"
    >
      <strong data-income-year-tax-total="${escapeHtml(entry.id)}">${escapeHtml(mainLabel)}</strong>
      <span>${escapeHtml(stateLabel)}</span>
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

export function setIncomeInputTab(value: string): void {
  if (value !== "yearly" && value !== "milestones" && value !== "settings") return;
  host.getState().incomeTracker = {
    ...host.getState().incomeTracker,
    settings: { ...host.getState().incomeTracker.settings, activeInputTab: value }
  };
  host.renderAll();
}

export function openIncomeTaxDialog(id: string): void {
  const entry = host.getState().incomeTracker.yearlyEntries.find((item) => item.id === id);
  if (!entry || !incomeTaxDialogCanOpen(entry)) return;
  incomeTrackerUiState.taxDialogEntryId = id;
  renderIncomeTaxDialog();
}

export function closeIncomeTaxDialog(): void {
  if (!incomeTrackerUiState.taxDialogEntryId) return;
  incomeTrackerUiState.taxDialogEntryId = null;
  renderIncomeTaxDialog();
}

export function openIncomeAnalysisDialog(): void {
  incomeTrackerUiState.analysisSelectedLabels = [];
  incomeTrackerUiState.analysisOpen = true;
  renderIncomeAnalysisDialog(incomeTrackerModel(), host.getState().incomeTracker.yearlyEntries);
}

export function closeIncomeAnalysisDialog(): void {
  if (!incomeTrackerUiState.analysisOpen) return;
  incomeTrackerUiState.analysisOpen = false;
  incomeTrackerUiState.analysisSelectedLabels = [];
  renderIncomeAnalysisDialog(incomeTrackerModel(), host.getState().incomeTracker.yearlyEntries);
}

export function setIncomeAnalysisChartType(value: IncomeAnalysisChartType): void {
  if (value !== "pie" && value !== "bar" && value !== "line" && value !== "curve") return;
  incomeTrackerUiState.analysisChartType = value;
  renderIncomeAnalysisDialog(incomeTrackerModel(), host.getState().incomeTracker.yearlyEntries);
}

export function setIncomeAnalysisDataView(value: IncomeAnalysisDataView): void {
  if (
    value !== "deductions" &&
    value !== "social" &&
    value !== "taxes" &&
    value !== "income" &&
    value !== "label_distribution"
  ) {
    return;
  }
  incomeTrackerUiState.analysisDataView = value;
  renderIncomeAnalysisDialog(incomeTrackerModel(), host.getState().incomeTracker.yearlyEntries);
}

export function setIncomeAnalysisYearFilter(value: string): void {
  incomeTrackerUiState.analysisYearFilter = value === "all" ? "all" : incomeInteger(value, host.getState().settings.year);
  renderIncomeAnalysisDialog(incomeTrackerModel(), host.getState().incomeTracker.yearlyEntries);
}

export function toggleIncomeAnalysisLabel(label: string): void {
  const normalized = incomeYearLabel(label);
  const details = buildIncomeAnalysisLabelDetails(
    host.getState().incomeTracker.yearlyEntries,
    INCOME_YEAR_LABEL_OPTIONS,
    incomeTrackerUiState.analysisSelectedLabels,
    incomeTrackerUiState.analysisYearFilter
  );
  const availableLabels = new Set(details.availableLabels.map((option) => option.id));
  if (!availableLabels.has(normalized)) return;
  const selected = new Set(details.selectedLabels);
  if (selected.has(normalized)) selected.delete(normalized);
  else selected.add(normalized);
  incomeTrackerUiState.analysisSelectedLabels = INCOME_YEAR_LABEL_OPTIONS.map((option) => option.id).filter((option) =>
    selected.has(option)
  );
  renderIncomeAnalysisDialog(incomeTrackerModel(), host.getState().incomeTracker.yearlyEntries);
}

export function toggleIncomeYearLabelFilter(label: string): void {
  const normalized = incomeYearLabel(label);
  const selected = new Set(host.getState().incomeTracker.settings.selectedYearlyLabels.map(incomeYearLabel));
  if (selected.has(normalized)) selected.delete(normalized);
  else selected.add(normalized);
  host.getState().incomeTracker = {
    ...host.getState().incomeTracker,
    settings: { ...host.getState().incomeTracker.settings, selectedYearlyLabels: Array.from(selected) }
  };
  renderIncomeYearLabelFilters();
  renderIncomeYearlyRows();
  host.persistCurrentState();
}

export function addIncomeYearlyEntry(): void {
  host.getState().incomeTracker = {
    ...host.getState().incomeTracker,
    yearlyEntries: [
      ...host.getState().incomeTracker.yearlyEntries,
      {
        id: createId(),
        active: true,
        visible: true,
        year: host.getState().settings.year,
        label: "salary",
        person: "household",
        annualNetIncome: null,
        annualGrossIncome: null,
        taxesAndDeductions: null,
        taxDeductionItems: emptyIncomeTaxDeductionItems(),
        taxAdjustment: emptyIncomeTaxAdjustment(),
        capitalGainsAllowance: null,
        capitalGainsChurchTaxEnabled: false,
        capitalGainsChurchTaxRatePercent: DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT,
        employmentContext: "job_loss",
        minijobType: "commercial",
        considerPensionInsurance: false,
        isRvExempt: false,
        shortTermEmploymentDays: null,
        shortTermEmploymentMonths: null,
        studentEmploymentMode: "minijob",
        requiresManualTaxReview: false,
        employer: "",
        note: "",
        source: "annual_statement"
      }
    ]
  };
  host.renderAll();
}

export function addIncomeMilestone(): void {
  host.getState().incomeTracker = {
    ...host.getState().incomeTracker,
    milestones: [
      ...host.getState().incomeTracker.milestones,
      {
        id: createId(),
        date: "",
        type: "Gehaltserhoehung",
        description: "",
        impact: "positive",
        linkedYear: host.getState().settings.year
      }
    ]
  };
  host.renderAll();
}

export function removeIncomeEntry(action: string): void {
  if (action.startsWith("income-remove-yearly-")) {
    const id = action.replace("income-remove-yearly-", "");
    const yearlyEntries = host.getState().incomeTracker.yearlyEntries.filter((entry) => entry.id !== id);
    host.getState().incomeTracker = {
      ...host.getState().incomeTracker,
      yearlyEntries: sanitizeIncomeYearEntriesWithTaxRules(yearlyEntries)
    };
  } else if (action.startsWith("income-remove-milestone-")) {
    const id = action.replace("income-remove-milestone-", "");
    host.getState().incomeTracker = {
      ...host.getState().incomeTracker,
      milestones: host.getState().incomeTracker.milestones.filter((entry) => entry.id !== id)
    };
  }
  host.renderAll();
}

export function updateIncomeEntry(
  collection: string,
  id: string,
  field: string,
  value: string,
  renderMode: "none" | "live" | "full" = "none"
): void {
  if (collection === "yearlyEntries") {
    const yearlyEntries = host.getState().incomeTracker.yearlyEntries.map((entry) =>
      entry.id === id ? updateIncomeYearEntry(entry, field, value) : entry
    );
    host.getState().incomeTracker = {
      ...host.getState().incomeTracker,
      yearlyEntries: sanitizeIncomeYearEntriesWithTaxRules(yearlyEntries)
    };
    finishIncomeUpdate(renderMode, collection, id, field);
    return;
  }
  if (collection === "milestones") {
    host.getState().incomeTracker = {
      ...host.getState().incomeTracker,
      milestones: host.getState().incomeTracker.milestones.map((entry) =>
        entry.id === id ? updateIncomeMilestoneEntry(entry, field, value) : entry
      )
    };
    finishIncomeUpdate(renderMode, collection, id, field);
    return;
  }
}

function updateIncomeYearEntry(entry: IncomeYearEntry, field: string, value: string): IncomeYearEntry {
  if (field === "active") return { ...entry, active: value === "true" };
  if (field === "visible") return { ...entry, visible: value === "true" };
  if (field === "year") return { ...entry, year: incomeInteger(value, host.getState().settings.year) };
  if (field === "label") return { ...entry, label: incomeYearLabel(value) };
  if (field === "person") return { ...entry, person: incomePerson(value) };
  if (field === "source") return { ...entry, source: incomeYearSource(value) };
  if (field === "employmentContext") return { ...entry, employmentContext: incomeEmploymentContext(value) };
  if (field === "minijobType") return { ...entry, minijobType: incomeMinijobType(value) };
  if (field === "considerPensionInsurance") return { ...entry, considerPensionInsurance: value === "true" };
  if (field === "isRvExempt") return { ...entry, isRvExempt: value === "true" };
  if (field === "shortTermEmploymentDays") return { ...entry, shortTermEmploymentDays: nullableInputNumber(value) };
  if (field === "shortTermEmploymentMonths") return { ...entry, shortTermEmploymentMonths: nullableInputNumber(value) };
  if (field === "studentEmploymentMode") return { ...entry, studentEmploymentMode: incomeStudentEmploymentMode(value) };
  if (field === "requiresManualTaxReview") return { ...entry, requiresManualTaxReview: value === "true" };
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
  if (field === "capitalGainsAllowance") return { ...entry, capitalGainsAllowance: nullableInputNumber(value) };
  if (field === "capitalGainsChurchTaxEnabled") return { ...entry, capitalGainsChurchTaxEnabled: value === "true" };
  if (field === "capitalGainsChurchTaxRatePercent") {
    return { ...entry, capitalGainsChurchTaxRatePercent: capitalGainsChurchTaxRate(nullableInputNumber(value)) };
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

function incomeTaxDeductionCategoryTotal(entry: IncomeYearEntry, category: IncomeTaxDeductionCategory): number {
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
  if (field === "linkedYear") return { ...entry, linkedYear: value.trim() === "" ? null : incomeInteger(value, host.getState().settings.year) };
  if (field === "date") return { ...entry, date: value };
  if (field === "type") return { ...entry, type: value };
  if (field === "description") return { ...entry, description: value };
  return entry;
}

export function updateIncomeSetting(
  field: keyof IncomeTrackerSettings,
  value: string,
  renderMode: "none" | "live" | "full" = "none"
): void {
  const settings = host.getState().incomeTracker.settings;
  if (field === "projectionMode") {
    host.getState().incomeTracker = {
      ...host.getState().incomeTracker,
      settings: { ...settings, projectionMode: incomeProjectionMode(value) }
    };
    finishIncomeUpdate(renderMode);
    return;
  }
  if (field === "activeInputTab") return;
  if (field === "manualGrowthRatePercent") {
    host.getState().incomeTracker = {
      ...host.getState().incomeTracker,
      settings: { ...settings, manualGrowthRatePercent: nullableInputNumber(value) }
    };
  } else if (field === "savingsSharePercent") {
    host.getState().incomeTracker = {
      ...host.getState().incomeTracker,
      settings: { ...settings, savingsSharePercent: nullableInputNumber(value) }
    };
  }
  finishIncomeUpdate(renderMode);
}

function finishIncomeUpdate(
  renderMode: "none" | "live" | "full",
  collection?: string,
  id?: string,
  field?: string
): void {
  if (renderMode === "live") {
    renderIncomeLiveUpdate(collection, id, field);
    host.persistCurrentState();
    return;
  }
  if (renderMode === "full") {
    host.renderAll();
  }
}

export async function importIncomeCsvFromFile(file: File | undefined): Promise<void> {
  await importIncomeCsvFromFileWithContext(file, incomeExportContext());
}
export async function exportIncomeCsv(): Promise<void> { await exportIncomeCsvWithContext(incomeExportContext()); }
export async function importIncomePlanningCsvFromFile(file: File | undefined): Promise<void> {
  await importIncomePlanningCsvFromFileWithContext(file, incomeExportContext());
}
export async function exportIncomePlanningCsvFile(): Promise<void> { await exportIncomePlanningCsvFileWithContext(incomeExportContext()); }
export function exportIncomePdf(): void { exportIncomePdfWithContext(incomeExportContext()); }

function incomeExportContext(): IncomeTrackerExportContext {
  return { getState: () => host.getState(), renderAll: () => host.renderAll(), exportCsvFile: (fileName, contents, label, showStatus) => host.exportCsvFile(fileName, contents, label, showStatus), incomeTrackerModel, sanitizeIncomeYearEntriesWithTaxRules };
}
