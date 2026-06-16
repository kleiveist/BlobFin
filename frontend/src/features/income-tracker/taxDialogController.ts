import { INCOME_YEAR_LABEL_OPTIONS } from "../../domain/incomeLabels";
import {
  applyCapitalGainsTaxToEntries,
  capitalGainsTaxBreakdown,
  CAPITAL_GAINS_ALLOWANCE_LIMIT,
  DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT,
  emptyIncomeTaxAdjustment,
  incomeTaxDeductionItemsTotal,
  incomeYearEntryTaxDeductions,
  incomeYearEntryTaxTotal
} from "../../domain/incomeTracker";
import {
  evaluateIncomeTaxAndContributionRules,
  isCapitalGainsTaxRuleLabel,
  normalizeIncomeTaxRuleLabel,
  SIDE_INCOME_TAX_RULE_LABELS,
  taxRuleConfigForYear,
  type IncomeTaxRuleResult
} from "../../domain/incomeTaxRules";
import { clamp, escapeHtml, money, normalizeHeader, numberValue } from "../../lib/format";
import type { IncomeYearEntry } from "../../types";
import {
  CAPITAL_GAINS_CHURCH_TAX_RATE_OPTIONS,
  INCOME_EMPLOYMENT_CONTEXT_OPTIONS,
  INCOME_MINIJOB_TYPE_OPTIONS,
  INCOME_STUDENT_EMPLOYMENT_MODE_OPTIONS,
  INCOME_TAX_ADJUSTMENT_OPTIONS,
  INCOME_TAX_DEDUCTION_ROWS,
  type IncomeTaxDeductionCategory
} from "./config";
import { cssEscape } from "./exportController";
import { incomeTrackerUiState } from "./uiState";

interface IncomeNumberInputOptions {
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  title?: string;
  extraAttribute?: string;
}

interface IncomeTaxDialogContext {
  getEntries(): IncomeYearEntry[];
  setText(id: string, value: string): void;
  incomeNumberInput(collection: string, id: string, field: string, value: number | null, options?: IncomeNumberInputOptions): string;
  incomeSelect<T extends string | number>(
    collection: string,
    id: string,
    field: string,
    options: Array<{ value: T; label: string }>,
    selected: T | string | number | null
  ): string;
  incomeCheckboxInput(collection: string, id: string, field: string, checked: boolean, label: string): string;
}

let taxDialogContext: IncomeTaxDialogContext | null = null;

export function configureIncomeTaxDialogController(context: IncomeTaxDialogContext): void {
  taxDialogContext = context;
}

function context(): IncomeTaxDialogContext {
  if (!taxDialogContext) throw new Error("Income tax dialog controller has not been configured.");
  return taxDialogContext;
}

export function incomeTaxRuleForEntry(
  entry: IncomeYearEntry,
  entries: IncomeYearEntry[] = context().getEntries()
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

export function incomeTaxDialogCanOpen(entry: IncomeYearEntry, rule = incomeTaxRuleForEntry(entry)): boolean {
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

function incomeCapitalGainsAllowanceUsedBefore(entry: IncomeYearEntry, entries: IncomeYearEntry[] = context().getEntries()): number {
  let used = 0;
  for (const item of entries) {
    if (item.id === entry.id) break;
    if (!item.active || item.year !== entry.year || !isCapitalGainsTaxRuleLabel(incomeYearLabel(item.label))) continue;
    used += numberValue(item.capitalGainsAllowance);
  }
  return clamp(roundCurrency(used), 0, CAPITAL_GAINS_ALLOWANCE_LIMIT);
}

function incomeCapitalGainsAllowanceRemainingBefore(entry: IncomeYearEntry, entries: IncomeYearEntry[] = context().getEntries()): number {
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

export function capitalGainsChurchTaxRate(value: number | null | undefined): number {
  return value === 8 ? 8 : DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT;
}

function roundCurrency(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function incomeTaxRuleStructuralField(field: string | undefined): boolean {
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

export function renderIncomeYearlyTaxButton(id: string): void {
  const entry = context().getEntries().find((item) => item.id === id);
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

export function renderIncomeTaxDialogTotals(id: string): void {
  if (incomeTrackerUiState.taxDialogEntryId !== id) return;
  const entry = context().getEntries().find((item) => item.id === id);
  if (!entry) return;
  const taxTotal = incomeTaxDeductionCategoryTotal(entry, "taxes");
  const socialTotal = incomeTaxDeductionCategoryTotal(entry, "social");
  const employerSocialTotal = incomeTaxDeductionCategoryTotal(entry, "employer_social");
  const total = incomeYearEntryTaxDeductions(entry);
  context().setText("incomeTaxDialogTaxesTotal", money(taxTotal));
  context().setText("incomeTaxDialogSocialTotal", money(socialTotal));
  context().setText("incomeTaxDialogEmployerSocialTotal", money(employerSocialTotal));
  context().setText("incomeTaxDialogGrandTotal", total === null ? "-" : money(total));
}

export function renderIncomeTaxDialog(): void {
  const root = document.querySelector<HTMLDivElement>("#incomeTaxDialogRoot");
  if (!root) return;
  const entry = context().getEntries().find((item) => item.id === incomeTrackerUiState.taxDialogEntryId);
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
                    <td>${context().incomeNumberInput("yearlyEntries", entry.id, `taxDeductionItems.${row.field}`, entry.taxDeductionItems[row.field], {
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
            ${context().incomeNumberInput("yearlyEntries", entry.id, "taxAdjustment.amount", entry.taxAdjustment.amount, {
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
          ${context().incomeNumberInput("yearlyEntries", entry.id, "capitalGainsAllowance", entry.capitalGainsAllowance, {
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
          ${context().incomeSelect(
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
        ${context().incomeSelect("yearlyEntries", entry.id, "employmentContext", INCOME_EMPLOYMENT_CONTEXT_OPTIONS, entry.employmentContext ?? "job_loss")}
      </label>
    `);
  }

  if (label === "student_newspaper_delivery") {
    controls.push(`
      <label>
        <span>Beschaeftigungsmodus</span>
        ${context().incomeSelect(
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
        ${context().incomeSelect("yearlyEntries", entry.id, "minijobType", INCOME_MINIJOB_TYPE_OPTIONS, entry.minijobType ?? "commercial")}
      </label>
      ${incomeInlineCheckbox(entry, "considerPensionInsurance", Boolean(entry.considerPensionInsurance), "Rentenversicherungspflicht beruecksichtigen")}
      ${incomeInlineCheckbox(entry, "isRvExempt", Boolean(entry.isRvExempt), "Von Rentenversicherungspflicht befreit")}
    `);
  }

  if (label === "student_newspaper_delivery" && (entry.studentEmploymentMode ?? "minijob") === "short_term") {
    controls.push(`
      <label>
        <span>Arbeitstage im Kalenderjahr</span>
        ${context().incomeNumberInput("yearlyEntries", entry.id, "shortTermEmploymentDays", entry.shortTermEmploymentDays ?? null, {
          min: 0,
          step: 1
        })}
      </label>
      <label>
        <span>Monate im Kalenderjahr</span>
        ${context().incomeNumberInput("yearlyEntries", entry.id, "shortTermEmploymentMonths", entry.shortTermEmploymentMonths ?? null, {
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
      ${context().incomeCheckboxInput("yearlyEntries", entry.id, field, checked, label)}
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

export function incomeTaxRuleTooltipText(rule: IncomeTaxRuleResult): string {
  const reason = incomeTaxRuleReasonText(rule.reasonKey);
  const warning = rule.warningKey ? incomeTaxRuleWarningText(rule.warningKey) : "";
  return warning ? `${reason} ${warning}` : reason;
}

export function incomeTaxButtonTooltipText(entry: IncomeYearEntry, rule: IncomeTaxRuleResult): string {
  const text = incomeTaxRuleTooltipText(rule);
  if (rule.status === "locked" && incomeYearLabel(entry.label) === "minijob") {
    return `${text} Rentenversicherungspflicht kann im Dialog aktiviert werden.`;
  }
  return text;
}

export function incomeTaxDeductionsButton(entry: IncomeYearEntry, rule = incomeTaxRuleForEntry(entry)): string {
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

export function incomeTaxDeductionCategoryTotal(entry: IncomeYearEntry, category: IncomeTaxDeductionCategory): number {
  if (category === "taxes") return incomeYearEntryTaxTotal(entry);
  return INCOME_TAX_DEDUCTION_ROWS.filter((row) => row.category === category).reduce(
    (sum, row) => sum + numberValue(entry.taxDeductionItems[row.field]),
    0
  );
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
