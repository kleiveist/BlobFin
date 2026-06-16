import { buildIncomeAnalysisLabelDetails } from "../../domain/incomeAnalysis";
import { INCOME_YEAR_LABEL_OPTIONS } from "../../domain/incomeLabels";
import {
  buildIncomeChartModel,
  buildIncomeTrackerModel,
  incomeYearEntryCalculatedNetIncome,
  incomeYearEntryNetIncome,
  INCOME_SOURCE_LABELS,
  type IncomeTrackerModel
} from "../../domain/incomeTracker";
import {
  normalizeIncomeTaxRuleLabel
} from "../../domain/incomeTaxRules";
import { escapeHtml, money, normalizeHeader, percent } from "../../lib/format";
import { positionIconSvg } from "../../lib/positionIcons";
import type { AppState, CareerMilestone, IncomeResolvedSource, IncomeTrackerSettings, IncomeYearEntry, InvestmentDepotKey } from "../../types";
import {
  CAREER_MILESTONE_IMPACT_OPTIONS,
  CAREER_MILESTONE_TYPE_OPTIONS
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
  incomeInteger,
  incomeProjectionMode,
  importIncomeCsvFromFileWithContext,
  importIncomePlanningCsvFromFileWithContext,
  nullableInputNumber,
  signedMoney,
  signedPercent,
  signedPercentagePoints,
  type IncomeTrackerExportContext
} from "./exportController";
import {
  addIncomeYearlyEntryWithContext,
  removeIncomeYearlyEntryWithContext,
  updateIncomeYearlyEntryWithContext,
  type IncomeEntriesControllerContext
} from "./entriesController";
import {
  addIncomeMilestoneWithContext,
  removeIncomeMilestoneWithContext,
  updateIncomeMilestoneWithContext,
  type IncomeMilestoneControllerContext
} from "./milestoneController";
import {
  capitalGainsChurchTaxRate,
  configureIncomeTaxDialogController,
  incomeTaxDialogCanOpen,
  incomeTaxDeductionsButton,
  incomeTaxRuleForEntry,
  incomeTaxRuleStructuralField,
  incomeTaxRuleTooltipText,
  renderIncomeTaxDialog,
  renderIncomeTaxDialogTotals,
  renderIncomeYearlyTaxButton,
  sanitizeIncomeYearEntriesWithTaxRules
} from "./taxDialogController";

export { sanitizeIncomeYearEntriesWithTaxRules } from "./taxDialogController";

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
  configureIncomeTaxDialogController({
    getEntries: () => host.getState().incomeTracker.yearlyEntries,
    setText,
    incomeNumberInput,
    incomeSelect,
    incomeCheckboxInput
  });
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
  addIncomeYearlyEntryWithContext(incomeEntriesControllerContext());
}

export function addIncomeMilestone(): void {
  addIncomeMilestoneWithContext(incomeMilestoneControllerContext());
}

export function removeIncomeEntry(action: string): void {
  const changed =
    removeIncomeYearlyEntryWithContext(incomeEntriesControllerContext(), action) ||
    removeIncomeMilestoneWithContext(incomeMilestoneControllerContext(), action);
  if (changed) host.renderAll();
}

export function updateIncomeEntry(
  collection: string,
  id: string,
  field: string,
  value: string,
  renderMode: "none" | "live" | "full" = "none"
): void {
  if (collection === "yearlyEntries") {
    updateIncomeYearlyEntryWithContext(incomeEntriesControllerContext(), id, field, value, renderMode);
    return;
  }
  if (collection === "milestones") {
    updateIncomeMilestoneWithContext(incomeMilestoneControllerContext(), id, field, value, renderMode);
    return;
  }
}

function incomeEntriesControllerContext(): IncomeEntriesControllerContext {
  return {
    getState: () => host.getState(),
    renderAll: () => host.renderAll(),
    sanitizeIncomeYearEntriesWithTaxRules,
    finishIncomeUpdate,
    incomeYearLabel,
    capitalGainsChurchTaxRate
  };
}

function incomeMilestoneControllerContext(): IncomeMilestoneControllerContext {
  return {
    getState: () => host.getState(),
    renderAll: () => host.renderAll(),
    finishIncomeUpdate
  };
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
