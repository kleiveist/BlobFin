import { createId } from "../../data/defaults";
import {
  INCOME_PLANNING_WEEK_DAYS,
  incomePlanningEntryActiveInScenario,
  incomePlanningWeekScenarioConfig,
  incomePlanningWeekScenarioConfigs
} from "../../domain/incomePlanning";
import { escapeHtml, monthName } from "../../lib/format";
import type { IncomePlanningState, IncomePlanningWeekScenario, IncomePlanningWeekScenarioId, IncomePlanningWeekday } from "../../types";
import { incomePlanningHostRef as host } from "./host";
import { incomePlanningHeaderIcon, incomePlanningWeekdayLabel } from "./shared";
import { incomePlanningUiState } from "./uiState";

export function incomePlanningWeekScenarioOptions(): ReturnType<typeof incomePlanningWeekScenarioConfigs> {
  return incomePlanningWeekScenarioConfigs(host.getState().incomePlanning.weekScenarios ?? []);
}

export function incomePlanningKnownScenarioIds(): IncomePlanningWeekScenarioId[] {
  return incomePlanningWeekScenarioOptions().map((scenario) => scenario.id);
}

export function incomePlanningActiveWeekScenarioId(): IncomePlanningWeekScenarioId {
  const weekStartDate = incomePlanningActiveWeekStartDate();
  return incomePlanningScenarioIdForWeekStart(weekStartDate);
}

export function incomePlanningActiveWeekStartDate(): string {
  return incomeStampPlannerDateString(incomePlanningUiState.weekCursor);
}

export function incomePlanningActiveWeekRange(): { start: Date; end: Date } {
  const start = incomeStampPlannerWeekStart(incomePlanningUiState.weekCursor);
  return { start, end: incomeStampPlannerAddDays(start, 6) };
}

export function incomeStampPlannerCurrentWeekRange(): { start: Date; end: Date } {
  return incomePlanningActiveWeekRange();
}

export function incomePlanningIsCurrentWeek(): boolean {
  return incomeStampPlannerDateString(incomeStampPlannerWeekStart(new Date())) === incomePlanningActiveWeekStartDate();
}

export function showPreviousIncomePlanningWeek(): void {
  incomePlanningUiState.weekCursor = incomeStampPlannerAddDays(incomePlanningUiState.weekCursor, -7);
  host.renderAll();
}

export function showNextIncomePlanningWeek(): void {
  incomePlanningUiState.weekCursor = incomeStampPlannerAddDays(incomePlanningUiState.weekCursor, 7);
  host.renderAll();
}

export function showCurrentIncomePlanningWeek(): void {
  incomePlanningUiState.weekCursor = incomeStampPlannerWeekStart(new Date());
  host.renderAll();
}

export function setIncomePlanningWeekScenario(value: string): void {
  setIncomePlanningScenarioForWeekStart(incomePlanningActiveWeekStartDate(), value);
}

export interface IncomePlanningIsoWeek {
  weekNumber: number;
  weekStartDate: string;
  start: Date;
  end: Date;
}

export function incomePlanningIsoWeeksForYear(year: number): IncomePlanningIsoWeek[] {
  const safeYear = Number.isFinite(year) ? Math.trunc(year) : new Date().getFullYear();
  const firstThursdayAnchor = new Date(safeYear, 0, 4);
  const weeks: IncomePlanningIsoWeek[] = [];
  for (let cursor = incomeStampPlannerWeekStart(firstThursdayAnchor), weekNumber = 1; weekNumber <= 53; cursor = incomeStampPlannerAddDays(cursor, 7), weekNumber += 1) {
    const thursday = incomeStampPlannerAddDays(cursor, 3);
    if (thursday.getFullYear() !== safeYear) break;
    weeks.push({
      weekNumber,
      weekStartDate: incomeStampPlannerDateString(cursor),
      start: cursor,
      end: incomeStampPlannerAddDays(cursor, 6)
    });
  }
  return weeks;
}

export function incomePlanningScenarioIdForWeekStart(
  weekStartDate: string,
  state: IncomePlanningState = host.getState().incomePlanning
): IncomePlanningWeekScenarioId {
  const knownIds = new Set(incomePlanningWeekScenarioConfigs(state.weekScenarios ?? []).map((scenario) => scenario.id));
  const assignedScenarioId = (state.weekScenarioAssignments ?? []).find((assignment) => assignment.weekStartDate === weekStartDate)?.scenarioId;
  return knownIds.has(assignedScenarioId ?? "") ? assignedScenarioId ?? "normal" : "normal";
}

export function setIncomePlanningScenarioForWeekStart(weekStartDate: string, value: string): void {
  if (!incomePlanningKnownScenarioIds().includes(value)) return;
  if (!incomeStampPlannerDateFromString(weekStartDate)) return;
  const assignments = (host.getState().incomePlanning.weekScenarioAssignments ?? []).filter(
    (assignment) => assignment.weekStartDate !== weekStartDate
  );
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    weekScenarioAssignments:
      value === "normal"
        ? assignments
        : [...assignments, { weekStartDate, scenarioId: value }].sort((first, second) =>
            first.weekStartDate.localeCompare(second.weekStartDate)
          )
  };
  host.renderAll();
  host.persistCurrentState();
}

export function openIncomePlanningWeekScenarioDialog(): void {
  incomePlanningUiState.weekScenarioDialog = { label: "", error: "" };
  renderIncomePlanningWeekScenarioDialog();
}

export function closeIncomePlanningWeekScenarioDialog(): void {
  incomePlanningUiState.weekScenarioDialog = null;
  renderIncomePlanningWeekScenarioDialog();
}

export function updateIncomePlanningWeekScenarioDialogDraft(field: string, value: string): void {
  if (!incomePlanningUiState.weekScenarioDialog || field !== "label") return;
  incomePlanningUiState.weekScenarioDialog = { ...incomePlanningUiState.weekScenarioDialog, label: value, error: "" };
}

export function saveIncomePlanningWeekScenarioDialog(): void {
  if (!incomePlanningUiState.weekScenarioDialog) return;
  const label = incomePlanningUiState.weekScenarioDialog.label.trim().replace(/\s+/g, " ");
  if (!label) {
    incomePlanningUiState.weekScenarioDialog = { ...incomePlanningUiState.weekScenarioDialog, error: "Bitte ein Szenario-Label eingeben." };
    renderIncomePlanningWeekScenarioDialog();
    return;
  }
  const duplicate = incomePlanningWeekScenarioOptions().some(
    (scenario) => scenario.label.trim().toLowerCase() === label.toLowerCase()
  );
  if (duplicate) {
    incomePlanningUiState.weekScenarioDialog = { ...incomePlanningUiState.weekScenarioDialog, error: "Dieses Wochenszenario existiert bereits." };
    renderIncomePlanningWeekScenarioDialog();
    return;
  }

  const scenario: IncomePlanningWeekScenario = {
    id: `week-scenario-${createId()}`,
    label
  };
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    weekScenarios: [...(host.getState().incomePlanning.weekScenarios ?? []), scenario]
  };
  incomePlanningUiState.weekScenarioDialog = null;
  setIncomePlanningWeekScenario(scenario.id);
}

export function renderIncomePlanningWeekScenarioDialog(): void {
  const root = document.querySelector<HTMLDivElement>("#incomePlanningDialogRoot");
  if (!root || incomePlanningUiState.dialog) return;
  if (!incomePlanningUiState.weekScenarioDialog) {
    root.innerHTML = "";
    return;
  }
  root.innerHTML = `
    <div class="income-planning-dialog-backdrop" role="presentation">
      <div class="income-planning-dialog" role="dialog" aria-modal="true" aria-label="Wochenszenario hinzufuegen">
        <div class="income-tax-dialog-head">
          <div>
            <strong>Wochenszenario hinzufuegen</strong>
            <span>Eigenes Label fuer Wochenmodus</span>
          </div>
          <div class="income-planning-header-actions">
            <button class="income-planning-header-icon-button" type="button" data-action="income-planning-close-week-scenario-dialog" aria-label="Dialog schliessen" title="Schliessen">x</button>
            <button class="income-planning-header-icon-button" type="button" data-action="income-planning-save-week-scenario" aria-label="Wochenszenario speichern" title="Speichern">
              ${incomePlanningHeaderIcon("save")}
            </button>
          </div>
        </div>
        ${incomePlanningUiState.weekScenarioDialog.error ? `<div class="income-planning-warning unrealistic"><strong>Fehler</strong><span>${escapeHtml(incomePlanningUiState.weekScenarioDialog.error)}</span></div>` : ""}
        <section class="income-planning-dialog-section">
          <strong>Label</strong>
          <label class="field">
            <span>Name</span>
            <input type="text" value="${escapeHtml(incomePlanningUiState.weekScenarioDialog.label)}" data-income-planning-week-scenario-dialog-field="label" />
          </label>
        </section>
        <div class="button-row income-planning-dialog-actions">
          <button class="button secondary" type="button" data-action="income-planning-close-week-scenario-dialog">Abbrechen</button>
          <button class="button" type="button" data-action="income-planning-save-week-scenario">Speichern</button>
        </div>
      </div>
    </div>
  `;
}

export function incomePlanningScenarioIdsForDialog(scenarioIds: IncomePlanningWeekScenarioId[] | undefined): IncomePlanningWeekScenarioId[] {
  const knownIds = incomePlanningKnownScenarioIds();
  if (!scenarioIds?.length) return knownIds;
  const selected = scenarioIds.filter((scenarioId) => knownIds.includes(scenarioId));
  return selected.length ? Array.from(new Set(selected)) : knownIds;
}

export function incomePlanningDefaultScenarioIdsForNewEntry(): IncomePlanningWeekScenarioId[] {
  const activeScenarioId = incomePlanningActiveWeekScenarioId();
  return incomePlanningKnownScenarioIds().includes(activeScenarioId) ? [activeScenarioId] : ["normal"];
}

export function incomePlanningDefaultScenarioIdsForNewSlot(): IncomePlanningWeekScenarioId[] {
  return incomePlanningKnownScenarioIds();
}

export function incomePlanningStoredScenarioIds(
  scenarioIds: IncomePlanningWeekScenarioId[]
): IncomePlanningWeekScenarioId[] | undefined {
  const knownIds = incomePlanningKnownScenarioIds();
  const selected = Array.from(new Set(scenarioIds.filter((scenarioId) => knownIds.includes(scenarioId))));
  if (!selected.length || selected.length === knownIds.length) return undefined;
  return selected;
}

export function incomePlanningEntryIsActiveInCurrentScenario(entry: { scenarioIds?: IncomePlanningWeekScenarioId[] }): boolean {
  return incomePlanningEntryActiveInScenario(entry, incomePlanningActiveWeekScenarioId());
}

export function incomePlanningWeekdayForDate(date: Date): IncomePlanningWeekday {
  const index = (date.getDay() + 6) % 7;
  return INCOME_PLANNING_WEEK_DAYS[index] ?? "monday";
}

export function incomeStampPlannerRangeLabel(range: { month: number; year: number }): string {
  return `${monthName(range.month + 1)} ${range.year}`;
}

export function incomeStampPlannerMonthTitle(range: { month: number; year: number }): string {
  return `${monthName(range.month + 1)} ${range.year}`;
}

export function incomeStampPlannerFullDateLabel(value: string): string {
  const date = incomeStampPlannerDateFromString(value);
  if (!date) return "ungueltiges Datum";
  return `${incomePlanningWeekdayLabel(incomePlanningWeekdayForDate(date))}, ${incomeStampPlannerShortDate(date)}${date.getFullYear()}`;
}

export function incomeStampPlannerMonthLabel(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
}

export function incomeStampPlannerShortDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.`;
}

export function incomeStampPlannerTodayDateString(): string {
  return incomeStampPlannerDateString(new Date());
}

export function incomeStampPlannerDateString(date: Date): string {
  const local = incomeStampPlannerStartOfDay(date);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
}

export function incomeStampPlannerDateFromString(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return incomeStampPlannerStartOfDay(date);
}

export function incomeStampPlannerStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function incomeStampPlannerMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function incomeStampPlannerWeekStart(date: Date): Date {
  const start = incomeStampPlannerStartOfDay(date);
  const offset = (start.getDay() + 6) % 7;
  return incomeStampPlannerAddDays(start, -offset);
}

export function incomeStampPlannerAddDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function incomeStampPlannerSameMonth(first: Date, second: Date): boolean {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth();
}

export function incomePlanningScenarioCheckboxGroup(input: {
  selectedIds: IncomePlanningWeekScenarioId[];
  dataAttribute: string;
  groupId?: string;
}): string {
  const options = incomePlanningWeekScenarioOptions();
  const selected = new Set(input.selectedIds);
  return `
    <div class="income-planning-week-scenario-options compact" role="group" aria-label="Szenario-Aktivierung">
      ${options.map((scenario) => {
        const checked = selected.has(scenario.id);
        return `
          <label class="income-planning-source-active income-planning-scenario-checkbox">
            <input
              type="checkbox"
              ${checked ? "checked" : ""}
              ${input.groupId ? `data-income-planning-sleep-slot-group-id="${escapeHtml(input.groupId)}"` : ""}
              ${input.dataAttribute}="${escapeHtml(scenario.id)}"
            />
            <span>${escapeHtml(scenario.label)}</span>
          </label>
        `;
      }).join("")}
    </div>
  `;
}

export function incomePlanningActiveScenarioDescription(scenarioId = incomePlanningActiveWeekScenarioId()): string {
  return incomePlanningWeekScenarioConfig(scenarioId, host.getState().incomePlanning.weekScenarios ?? []).description;
}
