import { INCOME_YEAR_LABEL_OPTIONS } from "../../domain/incomeLabels";
import { normalizeIncomeTaxRuleLabel } from "../../domain/incomeTaxRules";
import { escapeHtml, normalizeHeader } from "../../lib/format";
import { positionIconSvg } from "../../lib/positionIcons";
import type { AppState, IncomeYearEntry } from "../../types";
import { CAREER_MILESTONE_TYPE_OPTIONS } from "./config";
import { incomeTrackerUiState } from "./uiState";

interface IncomeTrackerPickerContext {
  getState(): AppState;
  renderAll(): void;
  sanitizeIncomeYearEntriesWithTaxRules(entries: IncomeYearEntry[]): IncomeYearEntry[];
}

let pickerContext: IncomeTrackerPickerContext | null = null;

export function configureIncomeTrackerPickers(context: IncomeTrackerPickerContext): void {
  pickerContext = context;
}

function context(): IncomeTrackerPickerContext {
  if (!pickerContext) throw new Error("Income tracker picker context has not been configured.");
  return pickerContext;
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
  const yearlyEntries = context().getState().incomeTracker.yearlyEntries.map((entry) =>
    entry.id === entryId ? { ...entry, label: incomeYearLabel(label) } : entry
  );
  context().getState().incomeTracker = {
    ...context().getState().incomeTracker,
    yearlyEntries: context().sanitizeIncomeYearEntriesWithTaxRules(yearlyEntries)
  };
  incomeTrackerUiState.yearLabelPicker = null;
  context().renderAll();
}

export function renderIncomeYearLabelPicker(): void {
  const picker = document.querySelector<HTMLDivElement>("#incomeYearLabelPicker");
  if (!picker) return;
  if (!incomeTrackerUiState.yearLabelPicker) {
    picker.hidden = true;
    return;
  }

  const entry = context().getState().incomeTracker.yearlyEntries.find((item) => item.id === incomeTrackerUiState.yearLabelPicker?.entryId);
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
  context().getState().incomeTracker = {
    ...context().getState().incomeTracker,
    milestones: context().getState().incomeTracker.milestones.map((milestone) =>
      milestone.id === milestoneId ? { ...milestone, type } : milestone
    )
  };
  incomeTrackerUiState.milestoneTypePicker = null;
  context().renderAll();
}

export function renderIncomeMilestoneTypePicker(): void {
  const picker = document.querySelector<HTMLDivElement>("#incomeMilestoneTypePicker");
  if (!picker) return;
  if (!incomeTrackerUiState.milestoneTypePicker) {
    picker.hidden = true;
    return;
  }

  const milestone = context().getState().incomeTracker.milestones.find((item) => item.id === incomeTrackerUiState.milestoneTypePicker?.milestoneId);
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

function incomeYearLabel(value: string | undefined): string {
  const normalized = normalizeIncomeTaxRuleLabel(String(value ?? "").trim());
  if (INCOME_YEAR_LABEL_OPTIONS.some((option) => option.id === normalized)) return normalized;
  const byLabel = INCOME_YEAR_LABEL_OPTIONS.find((option) => incomeLabelKey(option.label) === incomeLabelKey(normalized));
  return byLabel?.id ?? "salary";
}

function incomeLabelKey(value: string): string {
  return normalizeHeader(value);
}
