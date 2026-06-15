import { createId } from "../../data/defaults";
import { buildIncomeAnalysisLabelDetails, type IncomeAnalysisLabelDetails, type IncomeAnalysisLabelGroup } from "../../domain/incomeAnalysis";
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
import { exportIncomePlanningCsv, incomePlanningFromCsvRows, parseCsv } from "../../lib/csv";
import { clamp, escapeHtml, money, numberValue, percent } from "../../lib/format";
import { positionIconSvg } from "../../lib/positionIcons";
import type { AppState, CareerMilestone, CareerMilestoneImpact, IncomeEmploymentContext, IncomeMinijobType, IncomePerson, IncomeProjectionMode, IncomeResolvedSource, IncomeStudentEmploymentMode, IncomeTaxAdjustmentType, IncomeTaxDeductionField, IncomeTaxDeductionItems, IncomeTrackerSettings, IncomeYearEntry, IncomeYearEntrySource } from "../../types";
import { closeIncomePlanningDialog, closeIncomeStampPlannerDialog } from "../income-planning";
import {
  CAPITAL_GAINS_CHURCH_TAX_RATE_OPTIONS,
  CAREER_MILESTONE_IMPACT_OPTIONS,
  CAREER_MILESTONE_TYPE_OPTIONS,
  INCOME_EMPLOYMENT_CONTEXT_OPTIONS,
  INCOME_MINIJOB_TYPE_OPTIONS,
  INCOME_PROJECTION_MODES,
  INCOME_STUDENT_EMPLOYMENT_MODE_OPTIONS,
  INCOME_TAX_ADJUSTMENT_OPTIONS,
  INCOME_TAX_DEDUCTION_ROWS,
  type IncomeTaxDeductionCategory
} from "./config";
import {
  incomeTrackerUiState,
  type IncomeAnalysisChartType,
  type IncomeAnalysisDataView,
  type IncomeAnalysisModel,
  type IncomeAnalysisSeriesItem,
  type IncomeAnalysisSlice,
  type IncomeAnalysisYearPoint
} from "./uiState";

interface IncomeTrackerHost {
  getState(): AppState;
  persistCurrentState(): void;
  renderAll(): void;
  exportCsvFile(fileName: string, contents: string, label: string, showStatus?: (message: string) => void): Promise<void>;
}

let host: IncomeTrackerHost;
let exportStatusTimeoutId: number | undefined;

export function configureIncomeTrackerHost(nextHost: IncomeTrackerHost): void {
  host = nextHost;
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
  renderIncomeCharts(model);
  renderIncomeTaxDialog();
  renderIncomeAnalysisDialog(model);
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
  return depotInvestmentSettings(activeInvestmentDepot()).inflationRatePercent;
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
  renderIncomeCharts(model);
  renderIncomeAnalysisDialog(model);
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
  const host = document.querySelector<HTMLDivElement>("#incomeYearLabelFilters");
  if (!host) return;
  const selected = new Set(host.getState().incomeTracker.settings.selectedYearlyLabels.map(incomeYearLabel));
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

function renderIncomeAnalysisDialog(model: IncomeTrackerModel = incomeTrackerModel()): void {
  const root = document.querySelector<HTMLDivElement>("#incomeAnalysisDialogRoot");
  if (!root) return;
  if (!incomeTrackerUiState.analysisOpen) {
    root.innerHTML = "";
    return;
  }

  const analysis = buildIncomeAnalysisModel(model);
  const slices = incomeAnalysisSlices(analysis);
  const years = analysis.years;
  const distributionMode = incomeTrackerUiState.analysisDataView === "label_distribution";
  root.innerHTML = `
    <div class="income-analysis-backdrop" role="presentation">
      <div class="income-analysis-dialog${distributionMode ? " label-distribution" : ""}" role="dialog" aria-modal="true" aria-label="Weltgrafik Analyse Dashboard">
        <div class="income-analysis-head">
          <div>
            <strong>Weltgrafik</strong>
            <span>Grafik · Analyse · Dashboard · Plattform</span>
          </div>
          <button class="chart-popup-close" type="button" data-action="income-close-analysis" aria-label="Weltgrafik schliessen">x</button>
        </div>
        <div class="income-analysis-controls">
          <div class="income-analysis-switch" aria-label="Diagrammtyp">
            ${incomeAnalysisToggle("income-analysis-chart-pie", "Kreis", incomeTrackerUiState.analysisChartType === "pie")}
            ${incomeAnalysisToggle("income-analysis-chart-bar", "Balken", incomeTrackerUiState.analysisChartType === "bar")}
            ${incomeAnalysisToggle("income-analysis-chart-line", "Linie", incomeTrackerUiState.analysisChartType === "line")}
            ${incomeAnalysisToggle("income-analysis-chart-curve", "Kurve", incomeTrackerUiState.analysisChartType === "curve")}
          </div>
          <div class="income-analysis-switch" aria-label="Auswertung">
            ${incomeAnalysisToggle("income-analysis-view-deductions", "Abgabenmix", incomeTrackerUiState.analysisDataView === "deductions")}
            ${incomeAnalysisToggle("income-analysis-view-social", "Sozialabgaben", incomeTrackerUiState.analysisDataView === "social")}
            ${incomeAnalysisToggle("income-analysis-view-taxes", "Steuern", incomeTrackerUiState.analysisDataView === "taxes")}
            ${incomeAnalysisToggle("income-analysis-view-income", "Einkommen", incomeTrackerUiState.analysisDataView === "income")}
            ${incomeAnalysisToggle("income-analysis-view-label_distribution", "Einkommensverteilung", incomeTrackerUiState.analysisDataView === "label_distribution")}
          </div>
          <div class="income-analysis-switch" aria-label="Jahresfilter">
            ${incomeAnalysisToggle("income-analysis-year-all", "Alle Jahre", incomeTrackerUiState.analysisYearFilter === "all")}
            ${years.map((year) => incomeAnalysisToggle(`income-analysis-year-${year}`, String(year), incomeTrackerUiState.analysisYearFilter === year)).join("")}
          </div>
        </div>
        ${
          distributionMode
            ? renderIncomeAnalysisDistributionContent(analysis, slices)
            : `
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
                  <div class="income-analysis-detail-body">
                    <div class="income-analysis-breakdown">
                      ${slices.length ? slices.map((slice) => incomeAnalysisBreakdownLine(slice, analysis.totalGross)).join("") : incomeAnalysisEmpty("Keine Werte fuer diese Auswahl.")}
                    </div>
                  </div>
                  <div class="income-analysis-total">
                    <span>Abgabenquote ohne Arbeitgeber</span>
                    <strong>${analysis.totalGross > 0 ? percent((analysis.totalDeductions / analysis.totalGross) * 100) : "-"}</strong>
                  </div>
                </section>
              </div>
            `
        }
      </div>
    </div>
  `;
}

function renderIncomeAnalysisDistributionContent(analysis: IncomeAnalysisModel, slices: IncomeAnalysisSlice[]): string {
  return `
    <div class="income-analysis-distribution-layout">
      <div class="income-analysis-distribution-main">
        <section class="income-analysis-chart-card income-analysis-distribution-chart">
          ${renderIncomeAnalysisChart(analysis, slices)}
        </section>
        ${renderIncomeAnalysisLabelFilter(analysis.labelDetails)}
      </div>
      ${renderIncomeAnalysisDistributionDetail(analysis.labelDetails)}
    </div>
  `;
}

function renderIncomeAnalysisDistributionDetail(details: IncomeAnalysisLabelDetails): string {
  return `
    <section class="income-analysis-detail-card income-analysis-distribution-detail">
      <h3>Einkommen</h3>
      <div class="income-analysis-detail-body income-analysis-label-income-list">
        ${
          details.availableGroups.length
            ? details.availableGroups.map(renderIncomeAnalysisLabelIncomeCard).join("")
            : incomeAnalysisEmpty("Keine sichtbaren Labels fuer diese Auswahl.")
        }
      </div>
    </section>
  `;
}

function renderIncomeAnalysisLabelIncomeCard(group: IncomeAnalysisLabelGroup): string {
  return `
    <article class="income-analysis-label-income-card">
      <span>${escapeHtml(group.labelText)}</span>
      <strong>${escapeHtml(money(group.net))}</strong>
    </article>
  `;
}

function renderIncomeAnalysisLabelFilter(details: IncomeAnalysisLabelDetails): string {
  if (!details.availableLabels.length) {
    return `
      <section class="income-analysis-label-filter-card">
        ${incomeAnalysisEmpty("Keine sichtbaren Labels fuer diese Auswahl.")}
      </section>
    `;
  }

  const selected = new Set(details.selectedLabels);
  return `
    <section class="income-analysis-label-filter-card" aria-label="Label-Auswahl">
      <div class="income-analysis-label-filter-row" aria-label="Label-Filter">
        ${details.availableLabels
          .map((label) => {
            const active = selected.has(label.id);
            return `
              <button
                class="position-label-filter-button income-analysis-label-filter-button${active ? " active" : ""}"
                type="button"
                data-action="toggle-income-analysis-label"
                data-income-analysis-label="${escapeHtml(label.id)}"
                aria-pressed="${active}"
                aria-label="Label ${escapeHtml(label.label)} ${active ? "deaktivieren" : "aktivieren"}"
                title="${escapeHtml(label.label)}"
              >
                ${positionIconSvg(label.icon)}
              </button>
            `;
          })
          .join("")}
      </div>
    </section>
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
  if (incomeTrackerUiState.analysisChartType === "pie") return renderIncomeAnalysisPie(analysis, slices);
  if (incomeTrackerUiState.analysisChartType === "bar") return renderIncomeAnalysisBars(slices);
  return renderIncomeAnalysisLineChart(analysis, incomeTrackerUiState.analysisChartType === "curve");
}

function renderIncomeAnalysisPie(analysis: IncomeAnalysisModel, slices: IncomeAnalysisSlice[]): string {
  const visible = slices.filter(incomeAnalysisSliceHasDisplayValue);
  if (!visible.length) return incomeAnalysisEmpty("Keine aufgeteilten Werte vorhanden.");
  const visibleTotal = visible.reduce((sum, slice) => sum + incomeAnalysisSliceChartValue(slice), 0);
  const ownTotal =
    incomeTrackerUiState.analysisDataView === "social"
      ? analysis.socialTotal
      : incomeTrackerUiState.analysisDataView === "deductions"
        ? analysis.totalDeductions
        : incomeTrackerUiState.analysisDataView === "taxes"
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
    (incomeTrackerUiState.analysisDataView === "social" || incomeTrackerUiState.analysisDataView === "deductions") && analysis.employerSocialTotal > 0
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
    incomeTrackerUiState.analysisYearFilter === "all"
      ? analysis.yearPoints
      : analysis.yearPoints.filter((point) => point.year === incomeTrackerUiState.analysisYearFilter);
  const series = incomeAnalysisSeries(analysis, points);
  const years = incomeAnalysisSeriesYears(series);
  if (!years.length || !series.length) return incomeAnalysisEmpty("Keine Jahresentwicklung fuer diese Auswahl.");
  const values = series.flatMap((item) => item.values.map((point) => point.value));
  const maxValue = Math.max(1, ...values);
  const minYear = years[0] ?? 0;
  const maxYear = years[years.length - 1] ?? minYear;
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
        ${years
          .map((year) => `<text x="${xForYear(year)}" y="${bottom + 24}" text-anchor="middle">${year}</text>`)
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

function incomeAnalysisLabelTone(index: number): string {
  const tones = ["net", "gross", "deduction", "tax", "social", "gold", "blue", "care", "employer", "unassigned"];
  return tones[index % tones.length];
}

function incomeAnalysisSlices(analysis: IncomeAnalysisModel): IncomeAnalysisSlice[] {
  return analysis.slicesByView[incomeTrackerUiState.analysisDataView].filter(incomeAnalysisSliceHasDisplayValue);
}

function incomeAnalysisSeries(analysis: IncomeAnalysisModel, points: IncomeAnalysisYearPoint[]): IncomeAnalysisSeriesItem[] {
  if (incomeTrackerUiState.analysisDataView === "label_distribution") return incomeAnalysisLabelSeries(analysis.labelDetails);
  const seriesByView: Record<Exclude<IncomeAnalysisDataView, "label_distribution">, Array<{ key: keyof IncomeAnalysisYearPoint; label: string; tone: string }>> = {
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
  const series = seriesByView[incomeTrackerUiState.analysisDataView]
    .map((item) => ({
      label: item.label,
      tone: item.tone,
      values: points.map((point) => ({ year: point.year, value: Number(point[item.key]) || 0 }))
    }));
  const hasPositiveTaxSeries = incomeTrackerUiState.analysisDataView === "taxes" && series.some((item) => item.values.some((point) => point.value > 0));
  return series.filter(
    (item) =>
      item.values.some((point) => point.value > 0) ||
      (hasPositiveTaxSeries && item.label === "Steuern netto")
  );
}

function incomeAnalysisLabelSeries(details: IncomeAnalysisLabelDetails): IncomeAnalysisSeriesItem[] {
  const years = incomeAnalysisSeriesYears([{ label: "", tone: "", values: details.yearPoints.map((point) => ({ year: point.year, value: point.net })) }]);
  return details.groups
    .map((group, index) => {
      const pointByYear = new Map(
        details.yearPoints
          .filter((point) => point.label === group.label)
          .map((point) => [point.year, point.net] as const)
      );
      return {
        label: group.labelText,
        tone: incomeAnalysisLabelTone(index),
        values: years.map((year) => ({ year, value: pointByYear.get(year) ?? 0 }))
      };
    })
    .filter((item) => item.values.some((point) => point.value > 0));
}

function incomeAnalysisSeriesYears(series: IncomeAnalysisSeriesItem[]): number[] {
  return [...new Set(series.flatMap((item) => item.values.map((point) => point.year)))].sort((a, b) => a - b);
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
  if (incomeTrackerUiState.analysisYearFilter !== "all" && !years.includes(incomeTrackerUiState.analysisYearFilter)) {
    incomeTrackerUiState.analysisYearFilter = "all";
  }
  const entries = activeEntries.filter((entry) =>
    incomeTrackerUiState.analysisYearFilter === "all" ? true : entry.year === incomeTrackerUiState.analysisYearFilter
  );
  const visibleEntries = incomeVisibleYearEntries(entries);
  const totalNet = entries.reduce((sum, entry) => sum + numberValue(incomeYearEntryNetIncome(entry)), 0);
  const totalDeductions = entries.reduce((sum, entry) => sum + numberValue(incomeYearEntryTaxDeductions(entry)), 0);
  const totalGross = entries.reduce((sum, entry) => sum + incomeAnalysisGross(entry), 0);
  const taxSlices = incomeAnalysisTaxRows(visibleEntries, "taxes");
  const socialSlices = incomeAnalysisTaxRows(visibleEntries, "social");
  const employerSocialSlices = incomeAnalysisTaxRows(visibleEntries, "employer_social");
  const labelDetails = buildIncomeAnalysisLabelDetails(
    host.getState().incomeTracker.yearlyEntries,
    INCOME_YEAR_LABEL_OPTIONS,
    incomeTrackerUiState.analysisSelectedLabels,
    incomeTrackerUiState.analysisYearFilter
  );
  incomeTrackerUiState.analysisSelectedLabels = labelDetails.selectedLabels;
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
  const labelDistributionSlices = labelDetails.groups.map((group, index) => ({
    label: group.labelText,
    value: group.net,
    tone: incomeAnalysisLabelTone(index)
  }));
  return {
    entries,
    years,
    labelDetails,
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
      income: incomeSlices,
      label_distribution: labelDistributionSlices
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
  if (incomeTrackerUiState.analysisDataView === "social") return "Sozialabgaben";
  if (incomeTrackerUiState.analysisDataView === "taxes") return "Steuern";
  if (incomeTrackerUiState.analysisDataView === "income") return "Einkommen und Abgaben";
  if (incomeTrackerUiState.analysisDataView === "label_distribution") return "Einkommensverteilung";
  return "Abgabenmix";
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

function incomeActiveYearEntries(): IncomeYearEntry[] {
  return host.getState().incomeTracker.yearlyEntries.filter((entry) => entry.active);
}

function incomeVisibleYearEntries(entries: IncomeYearEntry[]): IncomeYearEntry[] {
  return entries.filter((entry) => entry.visible);
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

function renderIncomeCharts(model: IncomeTrackerModel): void {
  const visibleChartModel = incomeChartModel();
  setIncomeChart("incomeAnnualChart", renderIncomeAnnualChart(visibleChartModel));
  setIncomeChart("incomeGrowthChart", renderIncomeGrowthChart(visibleChartModel));
  setIncomeChart("incomeInflationChart", renderIncomeInflationChart(visibleChartModel));
  setIncomeChart("incomeRatioChart", renderIncomeRatioChart(visibleChartModel));
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
  if (host.getState().incomeTracker.settings.projectionMode === "off") return incomeChartEmpty("Projektion ist deaktiviert.");
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
  renderIncomeAnalysisDialog();
}

export function closeIncomeAnalysisDialog(): void {
  if (!incomeTrackerUiState.analysisOpen) return;
  incomeTrackerUiState.analysisOpen = false;
  incomeTrackerUiState.analysisSelectedLabels = [];
  renderIncomeAnalysisDialog();
}

export function setIncomeAnalysisChartType(value: IncomeAnalysisChartType): void {
  if (value !== "pie" && value !== "bar" && value !== "line" && value !== "curve") return;
  incomeTrackerUiState.analysisChartType = value;
  renderIncomeAnalysisDialog();
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
  renderIncomeAnalysisDialog();
}

export function setIncomeAnalysisYearFilter(value: string): void {
  incomeTrackerUiState.analysisYearFilter = value === "all" ? "all" : incomeInteger(value, host.getState().settings.year);
  renderIncomeAnalysisDialog();
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
  renderIncomeAnalysisDialog();
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
  if (!file) return;
  const text = await file.text();
  const imported = incomeTrackerEntriesFromCsvRows(parseCsv(text));
  const importedCount = imported.yearlyEntries.length + imported.milestones.length;
  if (!importedCount) {
    window.alert("Keine gueltigen Einkommen-CSV-Daten gefunden.");
    return;
  }

  host.getState().incomeTracker = {
    ...host.getState().incomeTracker,
    yearlyEntries: sanitizeIncomeYearEntriesWithTaxRules(imported.yearlyEntries),
    milestones: imported.milestones,
    settings: {
      ...host.getState().incomeTracker.settings,
      activeInputTab: imported.yearlyEntries.length ? "yearly" : imported.milestones.length ? "milestones" : "settings"
    }
  };
  host.renderAll();
  showIncomeExportStatus(`${importedCount} Eintraege aus CSV importiert.`);
}

export async function exportIncomeCsv(): Promise<void> {
  const model = incomeTrackerModel();
  await host.exportCsvFile("jahresnettoeinkommen.csv", incomeTrackerCsv(model), "Einkommen-CSV");
  showIncomeExportStatus("CSV-Export wurde erstellt.");
}

export async function importIncomePlanningCsvFromFile(file: File | undefined): Promise<void> {
  if (!file) return;
  const text = await file.text();
  const imported = incomePlanningFromCsvRows(parseCsv(text));
  if (!imported) {
    window.alert("Keine gueltigen Zeitbudget-CSV-Daten gefunden.");
    return;
  }

  const importedCount =
    imported.workBlocks.length +
    imported.habits.length +
    imported.manualBlocks.length +
    imported.calendarStamps.length +
    imported.plannedStamps.length +
    imported.assumptions.sleepSlots.length;
  host.getState().incomePlanning = imported;
  closeIncomePlanningDialog();
  closeIncomeStampPlannerDialog();
  host.renderAll();
  showIncomePlanningExportStatus(`${importedCount} Zeitbudget-Eintraege aus CSV importiert.`);
}

export async function exportIncomePlanningCsvFile(): Promise<void> {
  await host.exportCsvFile(
    "zeitbudget-und-habits.csv",
    exportIncomePlanningCsv(host.getState().incomePlanning),
    "Zeitbudget-CSV",
    showIncomePlanningExportStatus
  );
}

export function exportIncomePdf(): void {
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
  for (const entry of host.getState().incomeTracker.yearlyEntries) {
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "active", String(entry.active), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "visible", String(entry.visible), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "label", entry.label, entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "annualNetIncome", csvValue(incomeYearEntryNetIncome(entry)), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "annualGrossIncome", csvValue(entry.annualGrossIncome), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "taxesAndDeductions", csvValue(entry.taxesAndDeductions), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "taxAdjustmentType", entry.taxAdjustment.type, entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "taxAdjustmentAmount", csvValue(entry.taxAdjustment.amount), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "capitalGainsAllowance", csvValue(entry.capitalGainsAllowance), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "capitalGainsChurchTaxEnabled", String(entry.capitalGainsChurchTaxEnabled), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "capitalGainsChurchTaxRatePercent", csvValue(entry.capitalGainsChurchTaxRatePercent), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "employmentContext", entry.employmentContext ?? "job_loss", entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "minijobType", entry.minijobType ?? "commercial", entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "considerPensionInsurance", String(Boolean(entry.considerPensionInsurance)), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "isRvExempt", String(Boolean(entry.isRvExempt)), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "shortTermEmploymentDays", csvValue(entry.shortTermEmploymentDays ?? null), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "shortTermEmploymentMonths", csvValue(entry.shortTermEmploymentMonths ?? null), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "studentEmploymentMode", entry.studentEmploymentMode ?? "minijob", entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "requiresManualTaxReview", String(Boolean(entry.requiresManualTaxReview)), entry.source]);
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
  for (const entry of host.getState().incomeTracker.milestones) {
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
          year: incomeCsvYear(yearValue, host.getState().settings.year),
          label: "salary",
          person: incomePerson(personValue),
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
      } else if (fieldKey === "capitalgainsallowance") {
        entry.capitalGainsAllowance = incomeCsvNumber(value);
      } else if (fieldKey === "capitalgainschurchtaxenabled") {
        entry.capitalGainsChurchTaxEnabled = incomeCsvBoolean(value, false);
      } else if (fieldKey === "capitalgainschurchtaxratepercent") {
        entry.capitalGainsChurchTaxRatePercent = capitalGainsChurchTaxRate(incomeCsvNumber(value));
      } else if (fieldKey === "employmentcontext") {
        entry.employmentContext = incomeEmploymentContext(value);
      } else if (fieldKey === "minijobtype") {
        entry.minijobType = incomeMinijobType(value);
      } else if (fieldKey === "considerpensioninsurance") {
        entry.considerPensionInsurance = incomeCsvBoolean(value, false);
      } else if (fieldKey === "isrvexempt") {
        entry.isRvExempt = incomeCsvBoolean(value, false);
      } else if (fieldKey === "shorttermemploymentdays") {
        entry.shortTermEmploymentDays = incomeCsvNumber(value);
      } else if (fieldKey === "shorttermemploymentmonths") {
        entry.shortTermEmploymentMonths = incomeCsvNumber(value);
      } else if (fieldKey === "studentemploymentmode") {
        entry.studentEmploymentMode = incomeStudentEmploymentMode(value);
      } else if (fieldKey === "requiresmanualtaxreview") {
        entry.requiresManualTaxReview = incomeCsvBoolean(value, false);
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
    entry.capitalGainsAllowance !== null ||
    entry.capitalGainsChurchTaxEnabled ||
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
  if (text.includes("kirchensteuer zur kapitalertragsteuer")) return "capitalGainsChurchTax";
  if (text.includes("solidar") && text.includes("kapitalertragsteuer")) return "capitalGainsSolidaritySurcharge";
  if (text.includes("kapitalertragsteuer")) return "capitalGainsTax";
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
  const yearlyInputRows = host.getState().incomeTracker.yearlyEntries
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
  const milestoneRows = host.getState().incomeTracker.milestones
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

function incomeEmploymentContext(value: string): IncomeEmploymentContext {
  if (value === "earned_claim" || value === "other") return value;
  return "job_loss";
}

function incomeMinijobType(value: string): IncomeMinijobType {
  return value === "private_household" ? "private_household" : "commercial";
}

function incomeStudentEmploymentMode(value: string): IncomeStudentEmploymentMode {
  return value === "short_term" ? "short_term" : "minijob";
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

export function showIncomeExportStatus(message: string): void {
  const status = document.querySelector<HTMLParagraphElement>("#incomeExportStatus");
  if (status) status.textContent = message;
  if (exportStatusTimeoutId) window.clearTimeout(exportStatusTimeoutId);
  exportStatusTimeoutId = window.setTimeout(() => {
    if (status) status.textContent = "";
    exportStatusTimeoutId = undefined;
  }, 3500);
}

export function showIncomePlanningExportStatus(message: string): void {
  const status = document.querySelector<HTMLSpanElement>("#incomePlanningExportStatus");
  if (status) status.textContent = message;
  if (exportStatusTimeoutId) window.clearTimeout(exportStatusTimeoutId);
  exportStatusTimeoutId = window.setTimeout(() => {
    if (status) status.textContent = "";
    exportStatusTimeoutId = undefined;
  }, 3500);
}


export function showIncomeYearLabelPicker(button: HTMLButtonElement): void {
  const entryId = button.dataset.incomeYearId;
  if (!entryId) return;
  const rect = button.getBoundingClientRect();
  const panelWidth = 500;
  const panelHeight = 420;
  const left =
    rect.right + 12 + panelWidth <= window.innerWidth
      ? rect.right + 12
      : Math.max(12, rect.left - panelWidth - 12);
  const top = Math.max(12, Math.min(rect.top, window.innerHeight - panelHeight - 12));
  incomeTrackerUiState.yearLabelPicker = { entryId, top, left };
  renderIncomeYearLabelPicker();
}

export function hideIncomeYearLabelPicker(): void {
  incomeTrackerUiState.yearLabelPicker = null;
  renderIncomeYearLabelPicker();
}

export function selectIncomeYearLabel(entryId: string, label: string): void {
  if (!entryId || !label) return;
  const yearlyEntries = host.getState().incomeTracker.yearlyEntries.map((entry) =>
    entry.id === entryId ? { ...entry, label: incomeYearLabel(label) } : entry
  );
  host.getState().incomeTracker = {
    ...host.getState().incomeTracker,
    yearlyEntries: sanitizeIncomeYearEntriesWithTaxRules(yearlyEntries)
  };
  incomeTrackerUiState.yearLabelPicker = null;
  host.renderAll();
}

export function renderIncomeYearLabelPicker(): void {
  const picker = document.querySelector<HTMLDivElement>("#incomeYearLabelPicker");
  if (!picker) return;
  if (!incomeTrackerUiState.yearLabelPicker) {
    picker.hidden = true;
    return;
  }

  const entry = host.getState().incomeTracker.yearlyEntries.find((item) => item.id === incomeTrackerUiState.yearLabelPicker?.entryId);
  if (!entry) {
    picker.hidden = true;
    incomeTrackerUiState.yearLabelPicker = null;
    return;
  }

  picker.style.top = `${incomeTrackerUiState.yearLabelPicker.top}px`;
  picker.style.left = `${incomeTrackerUiState.yearLabelPicker.left}px`;
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

export function showIncomeMilestoneTypePicker(button: HTMLButtonElement): void {
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
  incomeTrackerUiState.milestoneTypePicker = { milestoneId, top, left };
  renderIncomeMilestoneTypePicker();
}

export function hideIncomeMilestoneTypePicker(): void {
  incomeTrackerUiState.milestoneTypePicker = null;
  renderIncomeMilestoneTypePicker();
}

export function selectIncomeMilestoneType(milestoneId: string, type: string): void {
  if (!milestoneId || !type) return;
  host.getState().incomeTracker = {
    ...host.getState().incomeTracker,
    milestones: host.getState().incomeTracker.milestones.map((milestone) =>
      milestone.id === milestoneId ? { ...milestone, type } : milestone
    )
  };
  incomeTrackerUiState.milestoneTypePicker = null;
  host.renderAll();
}

export function renderIncomeMilestoneTypePicker(): void {
  const picker = document.querySelector<HTMLDivElement>("#incomeMilestoneTypePicker");
  if (!picker) return;
  if (!incomeTrackerUiState.milestoneTypePicker) {
    picker.hidden = true;
    return;
  }

  const milestone = host.getState().incomeTracker.milestones.find((item) => item.id === incomeTrackerUiState.milestoneTypePicker?.milestoneId);
  if (!milestone) {
    picker.hidden = true;
    incomeTrackerUiState.milestoneTypePicker = null;
    return;
  }

  picker.style.top = `${incomeTrackerUiState.milestoneTypePicker.top}px`;
  picker.style.left = `${incomeTrackerUiState.milestoneTypePicker.left}px`;
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
