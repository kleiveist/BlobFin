import { createId } from "../../data/defaults";
import {
  buildIncomePlanningHabit,
  buildIncomePlanningManualBlock,
  buildIncomePlanningModel,
  buildIncomePlanningWorkBlock,
  enforceSingleActiveIncomePlanningMainJob,
  INCOME_PLANNING_CATEGORY_CONFIGS,
  INCOME_PLANNING_WEEK_DAYS,
  incomePlanningDefaultWorkCategory,
  incomePlanningCategoryConfig,
  incomePlanningDefaultManualColor,
  incomePlanningDefaultManualIcon,
  incomePlanningDefaultWorkColor,
  incomePlanningEntryActiveInScenario,
  incomePlanningWeekScenarioConfigs,
  incomePlanningWeekScenarioConfig,
  incomePlanningAverageSleepHours,
  incomePlanningSlotGrossDurationMinutes,
  incomePlanningSlotNetDurationMinutes,
  incomePlanningSlotPauseDurationMinutes,
  incomePlanningSleepSlotDurationMinutes,
  incomePlanningSlotCalendarSegments,
  incomePlanningStripSlotPause,
  parseTimeMinutes,
  type IncomePlanningCalendarEntry,
  type IncomePlanningModel,
  type IncomePlanningPlannerEntryType
} from "../../domain/incomePlanning";
import { clamp, escapeHtml, intNumber, monthName, numberValue, percent } from "../../lib/format";
import { normalizePositionIcon, POSITION_ICONS, positionIconSvg } from "../../lib/positionIcons";
import type { AppSectionId, AppState, IncomePlanningAssumptions, IncomePlanningCalendarStamp, IncomePlanningCategory, IncomePlanningHabit, IncomePlanningManualBlock, IncomePlanningManualBlockType, IncomePlanningPlannedStamp, IncomePlanningSleepSlot, IncomePlanningSlot, IncomePlanningWeekScenario, IncomePlanningWeekScenarioId, IncomePlanningWeekday, IncomePlanningWorkBlock } from "../../types";
import { INCOME_PLANNING_COLOR_OPTIONS, INCOME_PLANNING_STAMP_PRESETS } from "./config";
import {
  incomePlanningUiState,
  type IncomePlanningCalendarBackgroundEntry,
  type IncomePlanningDialogMode,
  type IncomePlanningDialogState,
  type IncomePlanningOwnerType,
  type IncomePlanningSleepSlotGroup,
  type IncomeStampPlannerDateRange
} from "./uiState";

interface IncomePlanningHost {
  getState(): AppState;
  persistCurrentState(): void;
  renderAll(): void;
  setActiveSection(section: AppSectionId): void;
}

let host: IncomePlanningHost;

export function configureIncomePlanningHost(nextHost: IncomePlanningHost): void {
  host = nextHost;
}

function requireIncomePlanningHost(): void {
  if (!host) throw new Error("Income planning feature host has not been configured.");
}

export function renderIncomePlanning(): void {
  requireIncomePlanningHost();
  const panel = document.querySelector<HTMLElement>('[data-module-section="income_planning"]');
  if (!panel) return;
  const activeWeekModel = incomePlanningModelForActiveWeek();
  renderIncomePlanningSources();
  renderIncomePlanningCareerLife(activeWeekModel);
  renderIncomePlanningAssumptions();
  renderIncomePlanningManualBlocks();
  renderIncomePlanningHabits();
  renderIncomePlanningCalendarStamps();
  renderIncomePlanningSummary(activeWeekModel);
  renderIncomePlanningDialog();
  renderIncomePlanningWeekScenarioDialog();
  renderIncomePlanningHabitIconPicker();
  renderIncomePlanningStampPicker();
  renderIncomePlanningStampMenu();
}

export function renderIncomeStampPlanner(): void {
  requireIncomePlanningHost();
  const panel = document.querySelector<HTMLElement>('[data-module-section="income_stamp_planner"]');
  if (!panel) return;
  renderIncomeStampPlannerControls();
  renderIncomeStampPlannerGrid();
  renderIncomeStampPlannerDialog();
}

function renderIncomeStampPlannerControls(): void {
  const host = document.querySelector<HTMLDivElement>("#incomeStampPlannerControls");
  if (!host) return;
  const range = incomeStampPlannerDateRange();
  const stamps = incomeStampPlannerVisibleStamps(range);
  const isCurrentMonth = incomeStampPlannerSameMonth(incomePlanningUiState.stampPlannerMonthCursor, new Date());
  host.innerHTML = `
    <div class="income-stamp-planner-control-stack">
      <div class="income-stamp-planner-month-nav" role="group" aria-label="Stempel-Planer Monat">
        <button class="income-stamp-planner-month-button" type="button" data-action="income-stamp-planner-prev-month" aria-label="Vorherigen Monat anzeigen" title="Zurueck">
          ${incomePlanningHeaderIcon("chevron-left")}
        </button>
        <strong id="incomeStampPlannerMonthLabel" class="income-stamp-planner-month-label">${escapeHtml(
          incomeStampPlannerMonthTitle(range)
        )}</strong>
        <button class="income-stamp-planner-month-button" type="button" data-action="income-stamp-planner-next-month" aria-label="Naechsten Monat anzeigen" title="Weiter">
          ${incomePlanningHeaderIcon("chevron-right")}
        </button>
        ${
          isCurrentMonth
            ? ""
            : '<button class="income-stamp-planner-today-button" type="button" data-action="income-stamp-planner-current-month">Heute</button>'
        }
      </div>
      <div class="income-stamp-planner-range">
        <strong>${intNumber(stamps.length)} geplant</strong>
        <span>${escapeHtml(incomeStampPlannerRangeLabel(range))}</span>
      </div>
    </div>
  `;
}

function renderIncomeStampPlannerGrid(): void {
  const host = document.querySelector<HTMLDivElement>("#incomeStampPlannerGrid");
  if (!host) return;
  const range = incomeStampPlannerDateRange();
  const weeks = incomeStampPlannerWeeks(range);
  host.innerHTML = `
    <div class="income-stamp-planner-calendar" data-income-stamp-planner-calendar>
      <div class="income-stamp-planner-weekday-row">
        <span></span>
        ${INCOME_PLANNING_WEEK_DAYS.map((day) => `<strong>${escapeHtml(incomePlanningWeekdayLabel(day))}</strong>`).join("")}
      </div>
      <div class="income-stamp-planner-week-list">
        ${weeks.map((week) => incomeStampPlannerWeekRow(week, range)).join("")}
      </div>
    </div>
  `;
}

function incomeStampPlannerWeekRow(weekStart: Date, range: IncomeStampPlannerDateRange): string {
  const days = Array.from({ length: 7 }, (_, index) => incomeStampPlannerAddDays(weekStart, index));
  const weekEnd = days[6];
  return `
    <div class="income-stamp-planner-week">
      <div class="income-stamp-planner-week-label">
        <strong>Woche</strong>
        <span>${escapeHtml(`${incomeStampPlannerShortDate(weekStart)}-${incomeStampPlannerShortDate(weekEnd)}`)}</span>
      </div>
      ${days.map((day) => incomeStampPlannerDayCell(day, range)).join("")}
    </div>
  `;
}

function incomeStampPlannerDayCell(day: Date, range: IncomeStampPlannerDateRange): string {
  const date = incomeStampPlannerDateString(day);
  const today = date === incomeStampPlannerTodayDateString();
  const outsideMonth = day.getFullYear() !== range.year || day.getMonth() !== range.month;
  const stamps = outsideMonth ? [] : incomeStampPlannerStampsForDate(date);
  const classes = ["income-stamp-planner-day", today ? "today" : "", outsideMonth ? "outside-month" : "", stamps.length ? "has-stamps" : ""]
    .filter(Boolean)
    .join(" ");
  return `
    <div class="${escapeHtml(classes)}" data-income-stamp-planner-date="${escapeHtml(date)}">
      <div class="income-stamp-planner-day-head">
        <time datetime="${escapeHtml(date)}">
          <strong>${intNumber(day.getDate())}</strong>
          <span>${escapeHtml(incomeStampPlannerMonthLabel(day))}</span>
        </time>
        <button
          class="income-stamp-planner-day-add"
          type="button"
          data-action="income-stamp-planner-add-date"
          data-income-stamp-planner-date="${escapeHtml(date)}"
          aria-label="Stempel fuer ${escapeHtml(incomeStampPlannerFullDateLabel(date))} planen"
          title="Stempel planen"
          ${outsideMonth ? "disabled" : ""}
        >+</button>
      </div>
      <div class="income-stamp-planner-day-stamps">
        ${stamps.map(incomeStampPlannerStampButton).join("")}
      </div>
    </div>
  `;
}

function incomeStampPlannerStampButton(stamp: IncomePlanningPlannedStamp): string {
  const icon = normalizePositionIcon(stamp.icon, "calendar");
  return `
    <button
      class="income-stamp-planner-stamp"
      type="button"
      data-action="income-stamp-planner-edit"
      data-income-stamp-planner-stamp="true"
      data-income-stamp-planner-stamp-id="${escapeHtml(stamp.id)}"
      title="${escapeHtml(`${stamp.label} · ${incomeStampPlannerFullDateLabel(stamp.date)} · ${stamp.startTime}`)}"
    >
      ${positionIconSvg(icon, "position-icon-svg income-planning-type-icon")}
      <span>${escapeHtml(stamp.label)}</span>
      <small>${escapeHtml(stamp.startTime)}</small>
    </button>
  `;
}

function renderIncomeStampPlannerDialog(): void {
  const root = document.querySelector<HTMLDivElement>("#incomeStampPlannerDialogRoot");
  if (!root) return;
  if (!incomePlanningUiState.stampPlannerDialog) {
    root.innerHTML = "";
    return;
  }
  const draft = incomePlanningUiState.stampPlannerDialog;
  const currentIcon = normalizePositionIcon(draft.icon, "calendar");
  root.innerHTML = `
    <div class="income-planning-dialog-backdrop" role="presentation">
      <div class="income-planning-dialog income-stamp-planner-dialog" role="dialog" aria-modal="true" aria-label="Geplanten Stempel bearbeiten">
        <div class="income-tax-dialog-head">
          <div>
            <strong>${draft.stampId ? "Stempel bearbeiten" : "Stempel planen"}</strong>
            <span>${escapeHtml(incomeStampPlannerFullDateLabel(draft.date))}</span>
          </div>
          <button class="chart-popup-close" type="button" data-action="income-stamp-planner-close-dialog" aria-label="Stempel-Planer Dialog schliessen">x</button>
        </div>
        <div class="income-planning-dialog-grid basis">
          <label class="field">
            <span>Label</span>
            <input type="text" value="${escapeHtml(draft.label)}" data-income-stamp-planner-field="label" />
          </label>
          <label class="field">
            <span>Projekt / Notiz</span>
            <input type="text" value="${escapeHtml(draft.description)}" data-income-stamp-planner-field="description" />
          </label>
          <label class="field compact">
            <span>Datum</span>
            <input type="date" value="${escapeHtml(draft.date)}" data-income-stamp-planner-field="date" />
          </label>
          <label class="field compact">
            <span>Zeit</span>
            <input type="time" value="${escapeHtml(draft.startTime)}" data-income-stamp-planner-field="startTime" />
          </label>
        </div>
        <div class="income-planning-stamp-presets" aria-label="Stempel-Labels">
          ${INCOME_PLANNING_STAMP_PRESETS.map((preset) => {
            const presetIcon = normalizePositionIcon(preset.icon, "calendar");
            const active = draft.label === preset.label && currentIcon === presetIcon;
            return `
              <button
                class="income-planning-stamp-preset ${active ? "active" : ""}"
                type="button"
                data-action="select-income-stamp-planner-preset"
                data-income-stamp-planner-label="${escapeHtml(preset.label)}"
                data-income-stamp-planner-icon="${escapeHtml(preset.icon)}"
                aria-pressed="${active}"
              >
                ${positionIconSvg(preset.icon, "position-icon-svg income-planning-type-icon")}
                <span>${escapeHtml(preset.label)}</span>
              </button>
            `;
          }).join("")}
        </div>
        <div class="position-icon-picker-grid compact income-stamp-planner-icon-grid">
          ${POSITION_ICONS.map((icon) => {
            const active = icon.id === currentIcon;
            return `
              <button
                class="position-icon-option ${active ? "active" : ""}"
                type="button"
                data-action="select-income-stamp-planner-icon"
                data-income-stamp-planner-icon="${icon.id}"
                aria-pressed="${active}"
                title="${escapeHtml(icon.label)}"
              >
                ${positionIconSvg(icon.id)}
                <span>${escapeHtml(icon.label)}</span>
              </button>
            `;
          }).join("")}
        </div>
        <section class="income-planning-dialog-section">
          <strong>Wochenszenarien</strong>
          ${incomePlanningScenarioCheckboxGroup({
            selectedIds: draft.scenarioIds,
            dataAttribute: "data-income-stamp-planner-scenario-id"
          })}
        </section>
        ${draft.error ? `<div class="income-planning-warning high">${escapeHtml(draft.error)}</div>` : ""}
        <div class="income-planning-dialog-actions">
          ${draft.stampId ? `<button class="button danger" type="button" data-action="income-stamp-planner-delete">Loeschen</button>` : ""}
          <button class="button secondary" type="button" data-action="income-stamp-planner-close-dialog">Abbrechen</button>
          <button class="button" type="button" data-action="income-stamp-planner-save" aria-label="Geplanten Stempel speichern">Speichern</button>
        </div>
      </div>
    </div>
  `;
}

function incomeStampPlannerDateRange(): IncomeStampPlannerDateRange {
  const monthStart = incomeStampPlannerMonthStart(incomePlanningUiState.stampPlannerMonthCursor);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  return {
    start: incomeStampPlannerWeekStart(monthStart),
    end: incomeStampPlannerAddDays(incomeStampPlannerWeekStart(monthEnd), 6),
    year: monthStart.getFullYear(),
    month: monthStart.getMonth()
  };
}

function incomeStampPlannerVisibleStamps(range: IncomeStampPlannerDateRange): IncomePlanningPlannedStamp[] {
  return [...(host.getState().incomePlanning.plannedStamps ?? [])]
    .filter((stamp) => {
      const date = incomeStampPlannerDateFromString(stamp.date);
      if (!date) return false;
      return date.getFullYear() === range.year && date.getMonth() === range.month;
    })
    .sort(compareIncomePlanningPlannedStamps);
}

function incomeStampPlannerWeeks(range: IncomeStampPlannerDateRange): Date[] {
  const weeks: Date[] = [];
  for (let cursor = range.start; cursor.getTime() <= range.end.getTime(); cursor = incomeStampPlannerAddDays(cursor, 7)) {
    weeks.push(cursor);
  }
  return weeks;
}

function incomeStampPlannerStampsForDate(date: string): IncomePlanningPlannedStamp[] {
  return [...(host.getState().incomePlanning.plannedStamps ?? [])]
    .filter((stamp) => stamp.date === date)
    .sort(compareIncomePlanningPlannedStamps);
}

function incomePlanningPlannedStampsForCurrentWeek(day: IncomePlanningWeekday): IncomePlanningPlannedStamp[] {
  const range = incomeStampPlannerCurrentWeekRange();
  return [...(host.getState().incomePlanning.plannedStamps ?? [])]
    .filter((stamp) => {
      const date = incomeStampPlannerDateFromString(stamp.date);
      if (!date) return false;
      return (
        date.getTime() >= range.start.getTime() &&
        date.getTime() <= range.end.getTime() &&
        incomePlanningWeekdayForDate(date) === day &&
        incomePlanningEntryIsActiveInCurrentScenario(stamp)
      );
    })
    .sort(compareIncomePlanningPlannedStamps);
}

function compareIncomePlanningPlannedStamps(first: IncomePlanningPlannedStamp, second: IncomePlanningPlannedStamp): number {
  return (
    first.date.localeCompare(second.date, "de") ||
    first.startTime.localeCompare(second.startTime, "de") ||
    first.label.localeCompare(second.label, "de") ||
    first.id.localeCompare(second.id, "de")
  );
}

export function incomePlanningModelForActiveWeek(): IncomePlanningModel {
  requireIncomePlanningHost();
  return buildIncomePlanningModel(host.getState().incomePlanning, { scenarioId: incomePlanningActiveWeekScenarioId() });
}

function incomePlanningWeekScenarioOptions(): ReturnType<typeof incomePlanningWeekScenarioConfigs> {
  return incomePlanningWeekScenarioConfigs(host.getState().incomePlanning.weekScenarios ?? []);
}

function incomePlanningKnownScenarioIds(): IncomePlanningWeekScenarioId[] {
  return incomePlanningWeekScenarioOptions().map((scenario) => scenario.id);
}

function incomePlanningActiveWeekScenarioId(): IncomePlanningWeekScenarioId {
  const weekStartDate = incomePlanningActiveWeekStartDate();
  const assignedScenarioId = (host.getState().incomePlanning.weekScenarioAssignments ?? []).find(
    (assignment) => assignment.weekStartDate === weekStartDate
  )?.scenarioId;
  return incomePlanningKnownScenarioIds().includes(assignedScenarioId ?? "") ? assignedScenarioId ?? "normal" : "normal";
}

function incomePlanningActiveWeekStartDate(): string {
  return incomeStampPlannerDateString(incomePlanningUiState.weekCursor);
}

function incomePlanningActiveWeekRange(): { start: Date; end: Date } {
  const start = incomeStampPlannerWeekStart(incomePlanningUiState.weekCursor);
  return { start, end: incomeStampPlannerAddDays(start, 6) };
}

function incomeStampPlannerCurrentWeekRange(): { start: Date; end: Date } {
  return incomePlanningActiveWeekRange();
}

function incomePlanningIsCurrentWeek(): boolean {
  return incomeStampPlannerDateString(incomeStampPlannerWeekStart(new Date())) === incomePlanningActiveWeekStartDate();
}

export function showPreviousIncomePlanningWeek(): void {
  incomePlanningUiState.weekCursor = incomeStampPlannerAddDays(incomePlanningUiState.weekCursor, -7);
  renderIncomePlanning();
}

export function showNextIncomePlanningWeek(): void {
  incomePlanningUiState.weekCursor = incomeStampPlannerAddDays(incomePlanningUiState.weekCursor, 7);
  renderIncomePlanning();
}

export function showCurrentIncomePlanningWeek(): void {
  incomePlanningUiState.weekCursor = incomeStampPlannerWeekStart(new Date());
  renderIncomePlanning();
}

export function setIncomePlanningWeekScenario(value: string): void {
  if (!incomePlanningKnownScenarioIds().includes(value)) return;
  const weekStartDate = incomePlanningActiveWeekStartDate();
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
  renderIncomePlanning();
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

function renderIncomePlanningWeekScenarioDialog(): void {
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

function incomePlanningScenarioIdsForDialog(scenarioIds: IncomePlanningWeekScenarioId[] | undefined): IncomePlanningWeekScenarioId[] {
  const knownIds = incomePlanningKnownScenarioIds();
  if (!scenarioIds?.length) return knownIds;
  const selected = scenarioIds.filter((scenarioId) => knownIds.includes(scenarioId));
  return selected.length ? Array.from(new Set(selected)) : knownIds;
}

function incomePlanningDefaultScenarioIdsForNewEntry(): IncomePlanningWeekScenarioId[] {
  const activeScenarioId = incomePlanningActiveWeekScenarioId();
  return incomePlanningKnownScenarioIds().includes(activeScenarioId) ? [activeScenarioId] : ["normal"];
}

function incomePlanningDefaultScenarioIdsForNewSlot(): IncomePlanningWeekScenarioId[] {
  return incomePlanningKnownScenarioIds();
}

function incomePlanningStoredScenarioIds(
  scenarioIds: IncomePlanningWeekScenarioId[]
): IncomePlanningWeekScenarioId[] | undefined {
  const knownIds = incomePlanningKnownScenarioIds();
  const selected = Array.from(new Set(scenarioIds.filter((scenarioId) => knownIds.includes(scenarioId))));
  if (!selected.length || selected.length === knownIds.length) return undefined;
  return selected;
}

function incomePlanningEntryIsActiveInCurrentScenario(entry: { scenarioIds?: IncomePlanningWeekScenarioId[] }): boolean {
  return incomePlanningEntryActiveInScenario(entry, incomePlanningActiveWeekScenarioId());
}

function incomePlanningWeekdayForDate(date: Date): IncomePlanningWeekday {
  const index = (date.getDay() + 6) % 7;
  return INCOME_PLANNING_WEEK_DAYS[index] ?? "monday";
}

function incomeStampPlannerRangeLabel(range: IncomeStampPlannerDateRange): string {
  return `${monthName(range.month + 1)} ${range.year}`;
}

function incomeStampPlannerMonthTitle(range: IncomeStampPlannerDateRange): string {
  return `${monthName(range.month + 1)} ${range.year}`;
}

function incomeStampPlannerFullDateLabel(value: string): string {
  const date = incomeStampPlannerDateFromString(value);
  if (!date) return "ungueltiges Datum";
  return `${incomePlanningWeekdayLabel(incomePlanningWeekdayForDate(date))}, ${incomeStampPlannerShortDate(date)}${date.getFullYear()}`;
}

function incomeStampPlannerMonthLabel(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
}

function incomeStampPlannerShortDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.`;
}

function incomeStampPlannerTodayDateString(): string {
  return incomeStampPlannerDateString(new Date());
}

function incomeStampPlannerDateString(date: Date): string {
  const local = incomeStampPlannerStartOfDay(date);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
}

function incomeStampPlannerDateFromString(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return incomeStampPlannerStartOfDay(date);
}

function incomeStampPlannerStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function incomeStampPlannerMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function incomeStampPlannerWeekStart(date: Date): Date {
  const start = incomeStampPlannerStartOfDay(date);
  const offset = (start.getDay() + 6) % 7;
  return incomeStampPlannerAddDays(start, -offset);
}

function incomeStampPlannerAddDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function incomeStampPlannerSameMonth(first: Date, second: Date): boolean {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth();
}

export function showPreviousIncomeStampPlannerMonth(): void {
  incomePlanningUiState.stampPlannerMonthCursor = new Date(
    incomePlanningUiState.stampPlannerMonthCursor.getFullYear(),
    incomePlanningUiState.stampPlannerMonthCursor.getMonth() - 1,
    1
  );
  renderIncomeStampPlanner();
}

export function showNextIncomeStampPlannerMonth(): void {
  incomePlanningUiState.stampPlannerMonthCursor = new Date(
    incomePlanningUiState.stampPlannerMonthCursor.getFullYear(),
    incomePlanningUiState.stampPlannerMonthCursor.getMonth() + 1,
    1
  );
  renderIncomeStampPlanner();
}

export function showCurrentIncomeStampPlannerMonth(): void {
  incomePlanningUiState.stampPlannerMonthCursor = incomeStampPlannerMonthStart(new Date());
  renderIncomeStampPlanner();
}

export function openIncomeStampPlannerDialogForDate(date: string = incomeStampPlannerTodayDateString()): void {
  const normalizedDate = incomeStampPlannerDateFromString(date) ? date : incomeStampPlannerTodayDateString();
  incomePlanningUiState.stampPlannerDialog = {
    stampId: null,
    date: normalizedDate,
    startTime: "09:00",
    icon: "calendar",
    label: "Stempel",
    description: "",
    scenarioIds: incomePlanningDefaultScenarioIdsForNewEntry(),
    error: ""
  };
  renderIncomeStampPlannerDialog();
}

export function openIncomeStampPlannerDialogForEdit(stampId: string, options: { switchToPlanner?: boolean } = {}): void {
  const stamp = (host.getState().incomePlanning.plannedStamps ?? []).find((item) => item.id === stampId);
  if (!stamp) return;
  incomePlanningUiState.stampPlannerDialog = {
    stampId: stamp.id,
    date: stamp.date,
    startTime: stamp.startTime,
    icon: normalizePositionIcon(stamp.icon, "calendar"),
    label: stamp.label,
    description: stamp.description,
    scenarioIds: incomePlanningScenarioIdsForDialog(stamp.scenarioIds),
    error: ""
  };
  if (options.switchToPlanner) {
    host.setActiveSection("income_stamp_planner");
    host.renderAll();
    return;
  }
  renderIncomeStampPlannerDialog();
}

export function closeIncomeStampPlannerDialog(): void {
  incomePlanningUiState.stampPlannerDialog = null;
  renderIncomeStampPlannerDialog();
}

export function updateIncomeStampPlannerDialogDraft(field: string, value: string): void {
  if (!incomePlanningUiState.stampPlannerDialog) return;
  if (field === "label") {
    incomePlanningUiState.stampPlannerDialog = { ...incomePlanningUiState.stampPlannerDialog, label: value, error: "" };
  } else if (field === "description") {
    incomePlanningUiState.stampPlannerDialog = { ...incomePlanningUiState.stampPlannerDialog, description: value, error: "" };
  } else if (field === "date") {
    incomePlanningUiState.stampPlannerDialog = { ...incomePlanningUiState.stampPlannerDialog, date: value, error: "" };
  } else if (field === "startTime") {
    incomePlanningUiState.stampPlannerDialog = { ...incomePlanningUiState.stampPlannerDialog, startTime: value, error: "" };
  }
}

export function selectIncomeStampPlannerIcon(icon: string): void {
  if (!incomePlanningUiState.stampPlannerDialog) return;
  incomePlanningUiState.stampPlannerDialog = { ...incomePlanningUiState.stampPlannerDialog, icon: normalizePositionIcon(icon, "calendar"), error: "" };
  renderIncomeStampPlannerDialog();
}

export function selectIncomeStampPlannerPreset(label: string, icon: string): void {
  if (!incomePlanningUiState.stampPlannerDialog) return;
  const preset = INCOME_PLANNING_STAMP_PRESETS.find((item) => item.label === label) ?? {
    label: label.trim() || "Stempel",
    icon
  };
  incomePlanningUiState.stampPlannerDialog = {
    ...incomePlanningUiState.stampPlannerDialog,
    label: preset.label,
    icon: normalizePositionIcon(preset.icon, "calendar"),
    error: ""
  };
  renderIncomeStampPlannerDialog();
}

export function updateIncomeStampPlannerScenarioSelection(scenarioId: string, checked: boolean): void {
  if (!incomePlanningUiState.stampPlannerDialog || !incomePlanningKnownScenarioIds().includes(scenarioId)) return;
  const selected = new Set(incomePlanningUiState.stampPlannerDialog.scenarioIds);
  if (checked) selected.add(scenarioId);
  else selected.delete(scenarioId);
  incomePlanningUiState.stampPlannerDialog = { ...incomePlanningUiState.stampPlannerDialog, scenarioIds: Array.from(selected), error: "" };
  renderIncomeStampPlannerDialog();
}

export function saveIncomeStampPlannerDialog(): void {
  if (!incomePlanningUiState.stampPlannerDialog) return;
  const draft = incomePlanningUiState.stampPlannerDialog;
  if (!incomeStampPlannerDateFromString(draft.date)) {
    incomePlanningUiState.stampPlannerDialog = { ...draft, error: "Bitte ein gueltiges Datum auswaehlen." };
    renderIncomeStampPlannerDialog();
    return;
  }
  if (!draft.scenarioIds.length) {
    incomePlanningUiState.stampPlannerDialog = { ...draft, error: "Bitte mindestens ein Wochenszenario auswaehlen." };
    renderIncomeStampPlannerDialog();
    return;
  }
  const startTime = formatIncomePlanningTime(parseTimeMinutes(draft.startTime) ?? 9 * 60);
  const stamp: IncomePlanningPlannedStamp = {
    id: draft.stampId ?? createId(),
    date: draft.date,
    startTime,
    icon: normalizePositionIcon(draft.icon, "calendar"),
    label: draft.label.trim() || "Stempel",
    description: draft.description.trim(),
    scenarioIds: incomePlanningStoredScenarioIds(draft.scenarioIds)
  };
  const plannedStamps = host.getState().incomePlanning.plannedStamps ?? [];
  const exists = plannedStamps.some((item) => item.id === stamp.id);
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    plannedStamps: exists
      ? plannedStamps.map((item) => (item.id === stamp.id ? stamp : item))
      : [...plannedStamps, stamp]
  };
  const savedDate = incomeStampPlannerDateFromString(stamp.date);
  if (savedDate) {
    incomePlanningUiState.stampPlannerMonthCursor = incomeStampPlannerMonthStart(savedDate);
  }
  incomePlanningUiState.stampPlannerDialog = null;
  host.renderAll();
}

export function deleteIncomeStampPlannerStamp(stampId: string | null = incomePlanningUiState.stampPlannerDialog?.stampId ?? null): void {
  if (!stampId) return;
  const plannedStamps = host.getState().incomePlanning.plannedStamps ?? [];
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    plannedStamps: plannedStamps.filter((stamp) => stamp.id !== stampId)
  };
  incomePlanningUiState.stampPlannerDialog = null;
  host.renderAll();
}

export function renderIncomePlanningSummary(model = incomePlanningModelForActiveWeek()): void {
  renderIncomePlanningMetrics(model);
  renderIncomePlanningWarnings(model);
  renderIncomePlanningTimeCharts(model);
  renderIncomePlanningCareerLife(model);
  renderIncomePlanningScenarios(model);
}

function renderIncomePlanningMetrics(model: IncomePlanningModel): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningMetricGrid");
  if (!host) return;
  host.innerHTML = `
    ${incomePlanningMetric("Arbeitszeit", `${hoursLabel(model.totalWorkHours)} / Woche`, `${hoursLabel(model.grossWorkHours)} brutto`, model.status)}
    ${incomePlanningMetric("Pausen", `${hoursLabel(model.pauseHours)} / Woche`, "separat von Arbeits-/Zeitbloecken", model.pauseHours > 0 ? "realistic" : model.status)}
    ${incomePlanningMetric("Habit-Zeit", `${hoursLabel(model.habitHours)} / Woche`, `${model.activeHabits.length} aktive Habits`, model.status)}
    ${incomePlanningMetric("Privat/Freizeit/Puffer", `${hoursLabel(model.manualHours)} / Woche`, `${model.activeManualBlocks.length} Zeitbloecke`, model.status)}
    ${incomePlanningMetric("Verplante Woche", `${hoursLabel(model.usedHours)} / Woche`, "inklusive Schlaf", model.status)}
    ${incomePlanningMetric("Freie Reserve", `${hoursLabel(model.remainingFlexibleHours)} / Woche`, "nach allen Zeitbloecken", model.remainingFlexibleHours < 0 ? "unrealistic" : model.status)}
    ${incomePlanningMetric("Konflikte", String(model.conflictCount), "Ueberschneidungen im Kalender", model.conflictCount > 0 ? "high" : "realistic")}
    ${incomePlanningMetric("Belastung", incomePlanningStatusLabel(model.status), `${hoursLabel(model.usedHours)} von 168h verplant`, model.status)}
  `;
}

function incomePlanningMetric(
  label: string,
  value: string,
  detail: string,
  status: IncomePlanningModel["status"]
): string {
  return `
    <article class="metric-card income-planning-metric ${escapeHtml(status)}">
      <span class="metric-label">${escapeHtml(label)}</span>
      <strong class="metric-value">${escapeHtml(value)}</strong>
      <small class="metric-detail">${escapeHtml(detail)}</small>
    </article>
  `;
}

function renderIncomePlanningWarnings(model: IncomePlanningModel): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningWarnings");
  if (!host) return;
  host.innerHTML = model.warnings.length
    ? model.warnings
        .map(
          (warning) => `
            <div class="income-planning-warning ${escapeHtml(model.status)}">
              <strong>${escapeHtml(incomePlanningStatusLabel(model.status))}</strong>
              <span>${escapeHtml(warning)}</span>
            </div>
          `
        )
        .join("")
    : `
      <div class="income-planning-warning realistic">
        <strong>Realistisch</strong>
        <span>Die Kombination passt in die aktuelle Zeitplanung.</span>
      </div>
    `;
}

interface IncomePlanningTimeSegment {
  label: string;
  value: number;
  color: string;
}

function renderIncomePlanningTimeCharts(model: IncomePlanningModel): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningTimeCharts");
  if (!host) return;
  const remaining = Math.max(0, model.remainingFlexibleHours);
  host.innerHTML = `
    ${incomePlanningDonutChart(
      "Wochenzeit",
      hoursLabel(model.usedHours),
      "verplant von 168 h",
      [
        { label: "Verplant", value: Math.min(168, Math.max(0, model.usedHours)), color: "var(--accent)" },
        { label: "Freie Reserve", value: remaining, color: "var(--row-border)" }
      ],
      168
    )}
    ${incomePlanningDonutChart(
      "Verbrauchte Wochenzeit",
      hoursLabel(model.usedHours),
      "Aufteilung der Woche",
      [
        { label: "Arbeitszeit", value: model.totalWorkHours, color: "#2e7d58" },
        { label: "Pausen", value: model.pauseHours, color: "#6f7785" },
        { label: "Habits", value: model.habitHours, color: "#8f5aa8" },
        { label: "Schlaf", value: model.sleepHoursPerWeek, color: "#4f6f9f" },
        { label: "Privat/Freizeit/Puffer", value: model.manualHours, color: "#b8860b" },
        { label: "Reserve", value: remaining, color: "var(--row-border)" }
      ],
      168
    )}
  `;
}

function incomePlanningDonutChart(
  title: string,
  value: string,
  detail: string,
  segments: IncomePlanningTimeSegment[],
  total: number
): string {
  const visibleSegments = segments.filter((segment) => segment.value > 0);
  const gradient = incomePlanningDonutGradient(visibleSegments, total);
  return `
    <article class="income-planning-time-chart">
      <div class="income-planning-donut" style="background: ${gradient}">
        <span>
          <strong>${escapeHtml(value)}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
      </div>
      <div class="income-planning-time-chart-copy">
        <strong>${escapeHtml(title)}</strong>
        <div class="income-planning-time-legend">
          ${visibleSegments.map((segment) => incomePlanningTimeLegendItem(segment, total)).join("")}
        </div>
      </div>
    </article>
  `;
}

function incomePlanningTimeLegendItem(segment: IncomePlanningTimeSegment, total: number): string {
  const share = total > 0 ? (segment.value / total) * 100 : 0;
  return `
    <span class="income-planning-time-legend-item">
      <i style="background: ${segment.color}"></i>
      <span>${escapeHtml(segment.label)}</span>
      <strong>${hoursLabel(segment.value)} · ${escapeHtml(percent(share))}</strong>
    </span>
  `;
}

function incomePlanningDonutGradient(segments: IncomePlanningTimeSegment[], total: number): string {
  if (!segments.length || total <= 0) return "conic-gradient(var(--row-border) 0deg 360deg)";
  let cursor = 0;
  const stops = segments.map((segment, index) => {
    const next = index === segments.length - 1 ? 360 : Math.min(360, cursor + (Math.max(0, segment.value) / total) * 360);
    const stop = `${segment.color} ${cursor.toFixed(2)}deg ${next.toFixed(2)}deg`;
    cursor = next;
    return stop;
  });
  if (cursor < 360) stops.push(`var(--row-border) ${cursor.toFixed(2)}deg 360deg`);
  return `conic-gradient(${stops.join(", ")})`;
}

function renderIncomePlanningSources(): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningWorkBlocks");
  if (!host) return;
  const model = incomePlanningModelForActiveWeek();
  host.innerHTML = host.getState().incomePlanning.workBlocks.length
    ? host.getState().incomePlanning.workBlocks.map((workBlock) => incomePlanningWorkBlockRow(workBlock, model)).join("")
    : '<div class="chart-empty">Noch keine Arbeitszeit geplant.</div>';
}

function incomePlanningWorkBlockRow(workBlock: IncomePlanningWorkBlock, model: IncomePlanningModel): string {
  const hours = incomePlanningOwnerHours(model, workBlock.id);
  const pauseHours = slotsPauseHours(workBlock.slots);
  const config = incomePlanningCategoryConfig(workBlock.category);
  return `
    <article class="income-planning-block-card compact work ${workBlock.active ? "active" : ""}" style="${incomePlanningColorStyle(workBlock.color ?? incomePlanningDefaultWorkColor(workBlock.category))}">
      <div class="income-planning-work-card-main">
        <div class="income-planning-work-title">
          ${incomePlanningTypeLabel(config.label, config.icon)}
          <strong>${escapeHtml(workBlock.name)}</strong>
          <small>${escapeHtml(workBlock.description || `${hoursLabel(hours)} netto · ${hoursLabel(slotsGrossHours(workBlock.slots))} brutto`)}</small>
        </div>
        <div class="income-planning-work-hours">
          <strong>${escapeHtml(hoursLabel(hours))}</strong>
          <span>${escapeHtml(pauseHours > 0 ? `${hoursLabel(pauseHours)} Pause` : "pro Woche")}</span>
        </div>
        <div class="button-row">
          <button class="button secondary" type="button" data-action="income-planning-open-block" data-income-planning-owner-type="work" data-income-planning-owner-id="${escapeHtml(
            workBlock.id
          )}">Bearbeiten</button>
          <button class="icon-button danger" type="button" data-action="income-planning-remove-work-block" data-income-planning-work-id="${escapeHtml(
            workBlock.id
          )}" aria-label="Arbeitsblock entfernen">x</button>
        </div>
      </div>
      ${incomePlanningSlotSummary("work", workBlock.id, workBlock.slots)}
    </article>
  `;
}

function incomePlanningTypeLabel(label: string, icon: string): string {
  return `
    <span class="income-planning-type-label">
      ${positionIconSvg(icon, "position-icon-svg income-planning-type-icon")}
      <span>${escapeHtml(label)}</span>
    </span>
  `;
}

function incomePlanningSlotSummary(ownerType: string, ownerId: string, slots: IncomePlanningSlot[]): string {
  const addChip = incomePlanningSlotAddChip(ownerType, ownerId);
  return `
    <div class="income-planning-slot-summary">
      ${slots.length
        ? `${slots.map((slot) => incomePlanningSlotChip(ownerType, ownerId, slot)).join("")}${addChip}`
        : '<div class="chart-empty">Noch keine Wochen-Slots geplant.</div>'}
      ${slots.length ? "" : addChip}
    </div>
  `;
}

function incomePlanningSlotChip(ownerType: string, ownerId: string, slot: IncomePlanningSlot): string {
  const duration = incomePlanningSlotGrossDurationMinutes(slot);
  const visualRange = incomePlanningVisualRangeFromTimes(slot.startTime, slot.endTime, duration);
  const slotNote = slot.note?.trim();
  const timeLabel = slot.flexible
    ? `flexibel · ${formatIncomePlanningTime(visualRange.startMinute)}-${formatIncomePlanningTime(visualRange.endMinute)} · ${minutesLabel(
        duration
      )}`
    : `${slot.startTime}-${slot.endTime}`;
  const pauseLabel =
    ownerType !== "habit" && slot.pauseEnabled && slot.pauseStartTime && slot.pauseEndTime
      ? `<small>Pause ${escapeHtml(slot.pauseStartTime)}-${escapeHtml(slot.pauseEndTime)}</small>`
      : "";
  const noteLabel = slotNote ? `<small>${escapeHtml(slotNote)}</small>` : "";
  return `
    <button class="income-planning-slot-chip ${slot.flexible ? "flexible" : ""}" type="button" data-action="income-planning-open-block" data-income-planning-owner-type="${escapeHtml(
      ownerType
    )}" data-income-planning-owner-id="${escapeHtml(ownerId)}" data-income-planning-slot-id="${escapeHtml(slot.id)}">
      <strong>${escapeHtml(incomePlanningWeekdayLabel(slot.day))}</strong>
      <span>${escapeHtml(timeLabel)}</span>
      ${pauseLabel}
      ${noteLabel}
    </button>
  `;
}

function incomePlanningSlotAddChip(ownerType: string, ownerId: string): string {
  return `
    <button class="income-planning-slot-chip add" type="button" data-action="income-planning-add-slot" data-income-planning-owner-type="${escapeHtml(
      ownerType
    )}" data-income-planning-owner-id="${escapeHtml(ownerId)}">
      <strong>+</strong>
      <span>Wochen-Slot</span>
    </button>
  `;
}

function renderIncomePlanningAssumptions(): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningAssumptions");
  if (!host) return;
  const assumptions = host.getState().incomePlanning.assumptions;
  const sleepHours = incomePlanningAverageSleepHours(assumptions);
  const sleepWeekHours = hoursLabel(assumptions.sleepSlots.reduce((sum, slot) => sum + incomePlanningSleepSlotDurationMinutes(slot), 0) / 60);
  const sleepGroupCount = incomePlanningSleepSlotGroupsFromSlots(assumptions.sleepSlots).length;
  host.innerHTML = `
    <article class="income-planning-block-card compact active">
      <div class="income-planning-compact-head">
        <div>
          <span>Zeitannahme</span>
          <strong>Schlaf</strong>
          <small>${hoursLabel(sleepHours)} pro Tag · ${sleepWeekHours} / Woche · ${intNumber(sleepGroupCount)} Schlafzeiten</small>
        </div>
        <button class="button secondary" type="button" data-action="income-planning-edit-assumption">Bearbeiten</button>
      </div>
    </article>
  `;
}

function renderIncomePlanningManualBlocks(): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningManualBlocks");
  if (!host) return;
  host.innerHTML = host.getState().incomePlanning.manualBlocks.length
    ? host.getState().incomePlanning.manualBlocks.map(incomePlanningManualBlockRow).join("")
    : '<div class="chart-empty">Noch keine privaten Zeitbloecke geplant.</div>';
}

function incomePlanningManualBlockRow(block: IncomePlanningManualBlock): string {
  const pauseHours = slotsPauseHours(block.slots);
  const icon = normalizePositionIcon(block.icon, incomePlanningDefaultManualIcon(block.type));
  return `
    <article class="income-planning-block-card compact ${block.active ? "active" : ""}" style="${incomePlanningColorStyle(block.color ?? incomePlanningDefaultManualColor(block.type))}">
      <div class="income-planning-compact-head">
        <div>
          <span>${positionIconSvg(icon, "position-icon-svg income-planning-type-icon")} ${escapeHtml(incomePlanningManualBlockTypeLabel(block.type))}</span>
          <strong>${escapeHtml(block.name)}</strong>
          <small>${escapeHtml(block.description || `${hoursLabel(slotsHours(block.slots))} / Woche${pauseHours > 0 ? ` · ${hoursLabel(pauseHours)} Pause` : ""}`)}</small>
        </div>
        <div class="button-row">
          <button class="button secondary" type="button" data-action="income-planning-open-block" data-income-planning-owner-type="manual" data-income-planning-owner-id="${escapeHtml(
            block.id
          )}">Bearbeiten</button>
          <button class="icon-button danger" type="button" data-action="income-planning-remove-manual-block" data-income-planning-manual-id="${escapeHtml(
            block.id
          )}" aria-label="Zeitblock entfernen">x</button>
        </div>
      </div>
      ${incomePlanningSlotSummary("manual", block.id, block.slots)}
    </article>
  `;
}

function renderIncomePlanningHabits(): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningHabits");
  if (!host) return;
  host.innerHTML = host.getState().incomePlanning.habits.length
    ? host.getState().incomePlanning.habits.map(incomePlanningHabitRow).join("")
    : '<div class="chart-empty">Noch keine Habits geplant.</div>';
}

function incomePlanningHabitRow(habit: IncomePlanningHabit): string {
  const icon = normalizePositionIcon(habit.icon, habit.type === "bad" ? "snack" : "book");
  return `
    <article class="income-planning-block-card compact habit ${habit.active ? "active" : ""}">
      <div class="income-planning-compact-head">
        <div>
          <span>${positionIconSvg(icon, "position-icon-svg income-planning-type-icon")} ${habit.type === "good" ? "Gute Habit" : "Schlechte Habit"} · ${escapeHtml(incomePlanningHabitChangeLabel(habit.goalChange))}</span>
          <strong>${escapeHtml(habit.name)}</strong>
          <small>${escapeHtml(`${habit.timing || "ohne Zeitpunkt"} · ${habit.durationMinutes} min/${habit.durationUnit === "day" ? "Tag" : "Woche"}`)}</small>
        </div>
        <div class="button-row">
          <button class="button secondary" type="button" data-action="income-planning-open-block" data-income-planning-owner-type="habit" data-income-planning-owner-id="${escapeHtml(
            habit.id
          )}">Bearbeiten</button>
          <button class="icon-button danger" type="button" data-action="income-planning-remove-habit" data-income-planning-habit-id="${escapeHtml(
            habit.id
          )}" aria-label="Habit entfernen">x</button>
        </div>
      </div>
      ${incomePlanningSlotSummary("habit", habit.id, habit.slots)}
    </article>
  `;
}

function renderIncomePlanningCalendarStamps(): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningCalendarStamps");
  if (!host) return;
  const stamps = [...host.getState().incomePlanning.calendarStamps].sort(compareIncomePlanningCalendarStamps);
  host.innerHTML = `
    <div class="income-planning-stamp-list-head">
      <strong>Stempel</strong>
      <span>${intNumber(stamps.length)} im Kalender</span>
    </div>
    ${
      stamps.length
        ? stamps.map(incomePlanningCalendarStampListRow).join("")
        : '<div class="chart-empty">Strg+Klick im Kalender setzt Icon-Stempel.</div>'
    }
  `;
}

function incomePlanningCalendarStampListRow(stamp: IncomePlanningCalendarStamp): string {
  const icon = normalizePositionIcon(stamp.icon, "calendar");
  return `
    <button class="income-planning-stamp-list-row" type="button" data-action="income-planning-edit-stamp" data-income-planning-stamp-id="${escapeHtml(stamp.id)}">
      ${positionIconSvg(icon, "position-icon-svg income-planning-type-icon")}
      <span>${escapeHtml(stamp.label)}</span>
      <small>${escapeHtml(`${incomePlanningWeekdayLabel(stamp.day)} · ${stamp.startTime}`)}</small>
    </button>
  `;
}

function compareIncomePlanningCalendarStamps(first: IncomePlanningCalendarStamp, second: IncomePlanningCalendarStamp): number {
  const dayDiff = incomePlanningWeekdayIndex(first.day) - incomePlanningWeekdayIndex(second.day);
  if (dayDiff !== 0) return dayDiff;
  return first.startTime.localeCompare(second.startTime, "de");
}

function renderIncomePlanningCareerLife(model: IncomePlanningModel): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningCareerLife");
  if (!host) return;
  const block = model.careerWorkBlocks[0];
  if (!block) {
    host.innerHTML = '<div class="chart-empty">Kein aktiver Hauptjob geplant.</div>';
    return;
  }
  const config = incomePlanningCategoryConfig(block.category);
  const hours = incomePlanningOwnerHours(model, block.id);
  const pauseHours = slotsPauseHours(block.slots);
  host.innerHTML = `
    <article class="income-planning-career-item" style="${incomePlanningColorStyle(block.color ?? incomePlanningDefaultWorkColor(block.category))}">
      <div class="income-planning-career-main">
        ${incomePlanningTypeLabel(config.label, config.icon)}
        <strong>${escapeHtml(block.name)}</strong>
        <small>${escapeHtml(block.description || `${intNumber(block.slots.length)} Slot${block.slots.length === 1 ? "" : "s"} · ${hoursLabel(slotsGrossHours(block.slots))} brutto`)}</small>
      </div>
      <div class="income-planning-career-stats">
        <strong>${escapeHtml(hoursLabel(hours))}</strong>
        <span>${escapeHtml(pauseHours > 0 ? `${hoursLabel(pauseHours)} Pause` : "netto/Woche")}</span>
      </div>
      <button class="button secondary" type="button" data-action="income-planning-open-block" data-income-planning-owner-type="work" data-income-planning-owner-id="${escapeHtml(
        block.id
      )}">Bearbeiten</button>
    </article>
  `;
}

function renderIncomePlanningScenarios(model: IncomePlanningModel): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningWeeklyPlanner");
  if (!host) return;
  const graphicEntries = model.calendarEntries.filter((entry) => !entry.invalid);
  const backgroundEntries = incomePlanningCalendarBackgroundEntries();
  const flexibleCount = graphicEntries.filter((entry) => entry.flexible).length;
  const currentTime = incomePlanningIsCurrentWeek() ? incomePlanningCurrentTimeMarker() : null;
  const weekRange = incomePlanningActiveWeekRange();
  const scenario = incomePlanningWeekScenarioConfig(model.scenarioId, host.getState().incomePlanning.weekScenarios ?? []);
  host.innerHTML = `
    <div class="income-planning-calendar" data-income-planning-calendar>
      <div class="income-planning-week-toolbar">
        <div class="income-planning-week-nav" role="group" aria-label="Kalenderwoche">
          <button class="income-stamp-planner-month-button" type="button" data-action="income-planning-prev-week" aria-label="Vorherige Woche" title="Vorherige Woche">
            ${incomePlanningHeaderIcon("chevron-left")}
          </button>
          <div class="income-planning-week-label">
            <span>Woche</span>
            <strong>${escapeHtml(`${incomeStampPlannerShortDate(weekRange.start)}-${incomeStampPlannerShortDate(weekRange.end)}${weekRange.end.getFullYear()}`)}</strong>
          </div>
          <button class="income-stamp-planner-month-button" type="button" data-action="income-planning-next-week" aria-label="Naechste Woche" title="Naechste Woche">
            ${incomePlanningHeaderIcon("chevron-right")}
          </button>
          ${
            incomePlanningIsCurrentWeek()
              ? ""
              : '<button class="income-stamp-planner-today-button" type="button" data-action="income-planning-current-week">Heute</button>'
          }
        </div>
        <div class="income-planning-week-range">
          <strong>${escapeHtml(model.scenarioLabel)}</strong>
          <span>${escapeHtml(scenario.description)}</span>
        </div>
      </div>
      <div class="income-planning-week-scenario" aria-label="Wochenszenario">
        <div>
          <span>Wochenszenario</span>
          <strong>${escapeHtml(model.scenarioLabel)}</strong>
          <small>${escapeHtml(scenario.description)}</small>
        </div>
        <div class="income-planning-week-scenario-options" role="group" aria-label="Wochenszenario auswaehlen">
          ${incomePlanningWeekScenarioOptions().map((option) => incomePlanningWeekScenarioButton(option.id, model.scenarioId)).join("")}
          <button
            class="income-planning-week-scenario-button add"
            type="button"
            data-action="income-planning-open-week-scenario-dialog"
            aria-label="Wochenszenario hinzufuegen"
            title="Wochenszenario hinzufuegen"
          >
            <span>+</span>
          </button>
        </div>
      </div>
      <div class="income-planning-calendar-head">
        <span></span>
        ${INCOME_PLANNING_WEEK_DAYS.map((day) => `<strong>${escapeHtml(incomePlanningWeekdayLabel(day))}</strong>`).join("")}
      </div>
      <div class="income-planning-calendar-body">
        <div class="income-planning-calendar-axis" aria-hidden="true">
          ${Array.from({ length: 25 }, (_, hour) => `<span style="--hour:${hour}">${String(hour).padStart(2, "0")}:00</span>`).join("")}
        </div>
        <div id="incomePlanningCalendarDays" class="income-planning-calendar-days">
          ${INCOME_PLANNING_WEEK_DAYS.map((day) => incomePlanningCalendarDayColumn(day, graphicEntries, backgroundEntries, currentTime)).join("")}
        </div>
      </div>
      <div class="income-planning-calendar-note">
        <span>${intNumber(graphicEntries.length)} Zeitbloecke in der Grafik</span>
        <span>${intNumber(flexibleCount)} flexible Zeitbloecke</span>
        <span>${intNumber(incomePlanningSleepSlotsForActiveScenario().length)} Schlafhorizonte im Hintergrund</span>
        ${currentTime ? `<span>Ist-Zeit ${escapeHtml(currentTime.label)}</span>` : ""}
      </div>
    </div>
  `;
}

function incomePlanningWeekScenarioButton(
  scenarioId: IncomePlanningWeekScenarioId,
  activeScenarioId: IncomePlanningWeekScenarioId
): string {
  const scenario = incomePlanningWeekScenarioConfig(scenarioId, host.getState().incomePlanning.weekScenarios ?? []);
  const active = scenarioId === activeScenarioId;
  return `
    <button
      class="income-planning-week-scenario-button ${active ? "active" : ""}"
      type="button"
      data-action="select-income-planning-week-scenario-${scenarioId}"
      aria-pressed="${active}"
      title="${escapeHtml(scenario.description)}"
    >
      ${positionIconSvg(scenario.icon, "position-icon-svg income-planning-type-icon")}
      <span>${escapeHtml(scenario.label)}</span>
    </button>
  `;
}

function incomePlanningCalendarDayColumn(
  day: IncomePlanningWeekday,
  entries: IncomePlanningCalendarEntry[],
  backgroundEntries: IncomePlanningCalendarBackgroundEntry[],
  currentTime: { day: IncomePlanningWeekday; minute: number; label: string } | null
): string {
  const dayEntries = entries.filter((entry) => entry.day === day);
  const dayBackgrounds = backgroundEntries.filter((entry) => entry.day === day);
  const dayStamps = host.getState().incomePlanning.calendarStamps
    .filter((stamp) => stamp.day === day && incomePlanningEntryIsActiveInCurrentScenario(stamp))
    .sort(compareIncomePlanningCalendarStamps);
  const plannedStamps = incomePlanningPlannedStampsForCurrentWeek(day);
  return `
    <div class="income-planning-calendar-day-column" data-income-planning-calendar-day="${escapeHtml(day)}" aria-label="${escapeHtml(
      incomePlanningWeekdayLabel(day)
    )}">
      <div class="income-planning-calendar-hour-lines" aria-hidden="true">
        ${Array.from({ length: 24 }, (_, hour) => `<i style="--hour:${hour}"></i>`).join("")}
      </div>
      ${dayBackgrounds.map(incomePlanningCalendarBackgroundBlock).join("")}
      ${dayEntries.map(incomePlanningCalendarEntryBlock).join("")}
      ${dayStamps.map(incomePlanningCalendarStampMarker).join("")}
      ${plannedStamps.map(incomePlanningPlannedStampMarker).join("")}
      ${currentTime?.day === day ? incomePlanningCurrentTimeLine(currentTime.minute, currentTime.label) : ""}
    </div>
  `;
}

function incomePlanningCalendarBackgroundEntries(): IncomePlanningCalendarBackgroundEntry[] {
  const sleepEntries = incomePlanningSleepSlotGroupsFromSlots(incomePlanningSleepSlotsForActiveScenario()).flatMap(
    incomePlanningSleepBackgroundEntries
  );
  return sleepEntries;
}

function incomePlanningSleepSlotsForActiveScenario(): IncomePlanningSleepSlot[] {
  return host.getState().incomePlanning.assumptions.sleepSlots.filter(incomePlanningEntryIsActiveInCurrentScenario);
}

function incomePlanningSleepBackgroundEntries(group: IncomePlanningSleepSlotGroup): IncomePlanningCalendarBackgroundEntry[] {
  const slots = incomePlanningSleepSlotsFromDialogGroups([group]);
  return slots.flatMap((slot) => incomePlanningSleepSlotBackgroundEntries(slot, group.id, group.flexible, group.durationMinutes));
}

function incomePlanningSleepSlotBackgroundEntries(
  slot: IncomePlanningSleepSlot,
  groupId: string,
  flexible: boolean,
  durationMinutes: number
): IncomePlanningCalendarBackgroundEntry[] {
  const segments = incomePlanningSlotCalendarSegments(slot);
  return segments.map((segment, index) => ({
    id: `${slot.id}:sleep:${index}`,
    day: segment.day,
    startMinute: segment.startMinute,
    endMinute: segment.endMinute,
    title: "Schlaf",
    label: "Schlaf",
    detail: flexible ? `flexibel · ${minutesLabel(durationMinutes)}` : `${slot.startTime}-${slot.endTime}`,
    icon: "health",
    type: "sleep",
    flexible,
    sleepGroupId: groupId
  }));
}

function incomePlanningCalendarBackgroundBlock(entry: IncomePlanningCalendarBackgroundEntry): string {
  const start = clamp(entry.startMinute, 0, 24 * 60);
  const end = clamp(entry.endMinute, start + 15, 24 * 60);
  const top = (start / (24 * 60)) * 100;
  const height = ((end - start) / (24 * 60)) * 100;
  const classes = [
    "income-planning-calendar-background",
    `type-${entry.type}`,
    entry.flexible ? "flexible" : ""
  ]
    .filter(Boolean)
    .join(" ");
  return `
    <div
      class="${escapeHtml(classes)}"
      style="--top:${top.toFixed(3)}%; --height:${height.toFixed(3)}%; ${entry.color ? incomePlanningColorStyle(entry.color) : ""}"
      data-income-planning-calendar-background="true"
      data-income-planning-background-entry-id="${escapeHtml(entry.id)}"
      ${entry.sleepGroupId ? `data-income-planning-sleep-group-id="${escapeHtml(entry.sleepGroupId)}"` : ""}
      aria-hidden="true"
      title="${escapeHtml(`${entry.title} · ${entry.detail}`)}"
    >
      <span class="income-planning-calendar-label">
        ${positionIconSvg(entry.icon, "position-icon-svg income-planning-calendar-icon")}
        <span>${escapeHtml(entry.label)}</span>
      </span>
      <strong>${escapeHtml(entry.title)}</strong>
      <small>${escapeHtml(entry.detail)}</small>
    </div>
  `;
}

function incomePlanningCalendarEntryBlock(entry: IncomePlanningCalendarEntry): string {
  const meta = incomePlanningCalendarEntryMeta(entry);
  const color = incomePlanningCalendarEntryColor(entry);
  const range = incomePlanningCalendarEntryVisualRange(entry);
  const start = range.startMinute;
  const end = range.endMinute;
  const top = (start / (24 * 60)) * 100;
  const height = ((end - start) / (24 * 60)) * 100;
  const isHabitEntry = entry.type === "good_habit" || entry.type === "bad_habit" || entry.type === "replacement_habit";
  const classes = [
    "income-planning-calendar-block",
    `type-${entry.type}`,
    entry.flexible ? "flexible" : "",
    entry.conflict ? "conflict" : "",
    entry.durationMinutes <= 30 ? "short" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const ownerType = incomePlanningOwnerTypeForEntry(entry);
  const plannerLabel = incomePlanningPlannerTypeLabel(entry.type);
  const detailLabel = entry.detail ? `${plannerLabel} · ${entry.detail}` : plannerLabel;
  return `
    <button
      class="${escapeHtml(classes)}"
      type="button"
      data-action="income-planning-open-block"
      data-income-planning-calendar-block="true"
      data-income-planning-owner-type="${escapeHtml(ownerType)}"
      data-income-planning-owner-id="${escapeHtml(entry.ownerId)}"
      data-income-planning-slot-id="${escapeHtml(entry.slotId)}"
      data-income-planning-slot-part="${escapeHtml(entry.slotPart)}"
      style="--top:${top.toFixed(3)}%; --height:${height.toFixed(3)}%; --start-minute:${start}; --duration-minutes:${end - start}; ${incomePlanningColorStyle(color)}"
      title="${escapeHtml(`${incomePlanningEntryTime(entry)} · ${entry.title}${isHabitEntry ? "" : ` · ${meta.label}`} · ${detailLabel}`)}"
    >
      <span class="income-planning-calendar-resize top" data-income-planning-resize="start" aria-hidden="true"></span>
      <span class="income-planning-calendar-label">
        ${positionIconSvg(meta.icon, "position-icon-svg income-planning-calendar-icon")}
        <span>${escapeHtml(isHabitEntry ? entry.title : meta.label)}</span>
      </span>
      ${isHabitEntry ? "" : `<strong>${escapeHtml(entry.title)}</strong>`}
      <small>${escapeHtml(incomePlanningEntryTime(entry))}</small>
      ${isHabitEntry && !entry.detail ? "" : `<em>${escapeHtml(isHabitEntry ? entry.detail ?? "" : detailLabel)}</em>`}
      <span class="income-planning-calendar-resize bottom" data-income-planning-resize="end" aria-hidden="true"></span>
    </button>
  `;
}

function incomePlanningCalendarEntryVisualRange(entry: IncomePlanningCalendarEntry): { startMinute: number; endMinute: number } {
  return incomePlanningVisualRangeFromTimes(entry.startTime, entry.endTime, entry.durationMinutes);
}

function incomePlanningVisualRangeFromTimes(
  startTime: string,
  endTime: string,
  durationMinutes: number
): { startMinute: number; endMinute: number } {
  const parsedStart = parseTimeMinutes(startTime);
  const parsedEnd = parseTimeMinutes(endTime);
  const startMinute = clamp(parsedStart ?? 0, 0, 23 * 60 + 45);
  if (parsedEnd !== null && parsedEnd > startMinute) {
    return { startMinute, endMinute: clamp(parsedEnd, startMinute + 15, 24 * 60) };
  }
  const duration = clamp(Math.round(durationMinutes || 60), 15, 24 * 60 - startMinute);
  return { startMinute, endMinute: startMinute + duration };
}

function incomePlanningCalendarStampMarker(stamp: IncomePlanningCalendarStamp): string {
  const start = clamp(parseTimeMinutes(stamp.startTime) ?? 0, 0, 24 * 60);
  const top = (start / (24 * 60)) * 100;
  const icon = normalizePositionIcon(stamp.icon, "calendar");
  return `
    <button
      class="income-planning-calendar-stamp"
      type="button"
      data-action="income-planning-open-stamp-menu"
      data-income-planning-calendar-stamp="true"
      data-income-planning-stamp-id="${escapeHtml(stamp.id)}"
      style="--top:${top.toFixed(3)}%;"
      title="${escapeHtml(`${stamp.label} · ${stamp.startTime}`)}"
    >
      ${positionIconSvg(icon, "position-icon-svg income-planning-calendar-icon")}
      <span>${escapeHtml(stamp.label)}</span>
    </button>
  `;
}

function incomePlanningPlannedStampMarker(stamp: IncomePlanningPlannedStamp): string {
  const start = clamp(parseTimeMinutes(stamp.startTime) ?? 0, 0, 24 * 60);
  const top = (start / (24 * 60)) * 100;
  const icon = normalizePositionIcon(stamp.icon, "calendar");
  return `
    <button
      class="income-planning-calendar-stamp planned"
      type="button"
      data-action="income-stamp-planner-edit"
      data-income-stamp-planner-calendar-stamp="true"
      data-income-stamp-planner-stamp-id="${escapeHtml(stamp.id)}"
      style="--top:${top.toFixed(3)}%;"
      title="${escapeHtml(`${stamp.label} · ${incomeStampPlannerFullDateLabel(stamp.date)} · ${stamp.startTime}`)}"
    >
      ${positionIconSvg(icon, "position-icon-svg income-planning-calendar-icon")}
      <span>${escapeHtml(stamp.label)}</span>
    </button>
  `;
}

function incomePlanningCurrentTimeLine(minute: number, label: string): string {
  const top = (clamp(minute, 0, 24 * 60) / (24 * 60)) * 100;
  return `
    <div class="income-planning-current-time-line" style="--top:${top.toFixed(3)}%;" aria-label="Ist-Zeit ${escapeHtml(label)}">
      <span>Ist-Zeit ${escapeHtml(label)}</span>
    </div>
  `;
}

function incomePlanningCurrentTimeMarker(): { day: IncomePlanningWeekday; minute: number; label: string } {
  const now = new Date();
  const dayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const minute = now.getHours() * 60 + now.getMinutes();
  return {
    day: INCOME_PLANNING_WEEK_DAYS[dayIndex] ?? "monday",
    minute,
    label: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  };
}

function incomePlanningCalendarEntryMeta(entry: IncomePlanningCalendarEntry): { label: string; icon: string } {
  if (entry.type === "pause") return { label: "Pause", icon: "calendar" };
  const workBlock = host.getState().incomePlanning.workBlocks.find((block) => block.id === entry.ownerId);
  if (workBlock && (entry.type === "career" || entry.type === "side_work")) {
    const config = incomePlanningCategoryConfig(workBlock.category);
    return { label: config.label, icon: config.icon };
  }
  const habit = host.getState().incomePlanning.habits.find((item) => item.id === entry.ownerId);
  if (entry.type === "good_habit") return { label: entry.title, icon: normalizePositionIcon(habit?.icon, "book") };
  if (entry.type === "bad_habit") return { label: entry.title, icon: normalizePositionIcon(habit?.icon, "snack") };
  if (entry.type === "replacement_habit") return { label: entry.title, icon: "gift" };
  const manualBlock = host.getState().incomePlanning.manualBlocks.find((block) => block.id === entry.ownerId);
  if (manualBlock) {
    return {
      label: incomePlanningManualBlockTypeLabel(manualBlock.type),
      icon: normalizePositionIcon(manualBlock.icon, incomePlanningDefaultManualIcon(manualBlock.type))
    };
  }
  return { label: incomePlanningPlannerTypeLabel(entry.type), icon: "calendar" };
}

function incomePlanningCalendarEntryColor(entry: IncomePlanningCalendarEntry): string {
  if (entry.type === "pause") return "#6f7785";
  const workBlock = host.getState().incomePlanning.workBlocks.find((block) => block.id === entry.ownerId);
  if (workBlock && (entry.type === "career" || entry.type === "side_work")) {
    return normalizeIncomePlanningColor(workBlock.color, incomePlanningDefaultWorkColor(workBlock.category));
  }
  const manualBlock = host.getState().incomePlanning.manualBlocks.find((block) => block.id === entry.ownerId);
  if (manualBlock) return normalizeIncomePlanningColor(manualBlock.color, incomePlanningDefaultManualColor(manualBlock.type));
  if (entry.type === "good_habit") return "#4e9f6d";
  if (entry.type === "bad_habit") return "#b94646";
  if (entry.type === "replacement_habit") return "#8f5aa8";
  return "#6f7785";
}

function incomePlanningEntryTime(entry: IncomePlanningCalendarEntry): string {
  if (entry.flexible) {
    const range = incomePlanningCalendarEntryVisualRange(entry);
    return `flexibel · ${formatIncomePlanningTime(range.startMinute)}-${formatIncomePlanningTime(range.endMinute)} · ${minutesLabel(
      entry.durationMinutes
    )}`;
  }
  return `${entry.startTime}-${entry.endTime}`;
}

function incomePlanningManualBlockTypeOptions(): Array<{ value: IncomePlanningManualBlockType; label: string }> {
  return [
    { value: "private_commitment", label: "Private Verpflichtung" },
    { value: "free_time", label: "Freizeit" },
    { value: "buffer", label: "Puffer" },
    { value: "other_event", label: "Sonstiges Ereignis" }
  ];
}

function incomePlanningCategoryOptions(): Array<{ value: string; label: string }> {
  return INCOME_PLANNING_CATEGORY_CONFIGS.map((config) => ({ value: config.id, label: config.label }));
}

function incomePlanningWeekdayOptionItems(): Array<{ value: string; label: string }> {
  return INCOME_PLANNING_WEEK_DAYS.map((day) => ({ value: day, label: incomePlanningWeekdayLabel(day) }));
}

function incomePlanningHabitTypeOptions(): Array<{ value: string; label: string }> {
  return [
    { value: "good", label: "Gute Habit" },
    { value: "bad", label: "Schlechte Habit" }
  ];
}

function incomePlanningHabitDurationUnitOptions(): Array<{ value: string; label: string }> {
  return [
    { value: "day", label: "Tag" },
    { value: "week", label: "Woche" }
  ];
}

function incomePlanningHabitChangeOptions(): Array<{ value: string; label: string }> {
  return [
    { value: "keep", label: "Beibehalten" },
    { value: "reduce", label: "Reduzieren" },
    { value: "replace", label: "Ersetzen" },
    { value: "build", label: "Aufbauen" }
  ];
}

function incomePlanningHabitStatusOptions(): Array<{ value: string; label: string }> {
  return [
    { value: "planned", label: "Geplant" },
    { value: "active", label: "Aktiv" },
    { value: "difficult", label: "Schwierig" },
    { value: "stable", label: "Stabil" }
  ];
}

function incomePlanningPriorityOptions(): Array<{ value: string; label: string }> {
  return [
    { value: "low", label: "Niedrig" },
    { value: "medium", label: "Mittel" },
    { value: "high", label: "Hoch" }
  ];
}

function incomePlanningWeekdayLabel(day: IncomePlanningWeekday): string {
  if (day === "monday") return "Montag";
  if (day === "tuesday") return "Dienstag";
  if (day === "wednesday") return "Mittwoch";
  if (day === "thursday") return "Donnerstag";
  if (day === "friday") return "Freitag";
  if (day === "saturday") return "Samstag";
  return "Sonntag";
}

function incomePlanningWeekdayFromValue(value: unknown): IncomePlanningWeekday | null {
  return INCOME_PLANNING_WEEK_DAYS.includes(value as IncomePlanningWeekday) ? (value as IncomePlanningWeekday) : null;
}

function incomePlanningWeekdayIndex(day: IncomePlanningWeekday): number {
  return INCOME_PLANNING_WEEK_DAYS.indexOf(day);
}

function incomePlanningWeekdayByIndex(index: number): IncomePlanningWeekday {
  return INCOME_PLANNING_WEEK_DAYS[clamp(Math.round(index), 0, INCOME_PLANNING_WEEK_DAYS.length - 1)];
}

function incomePlanningPlannerTypeLabel(type: IncomePlanningPlannerEntryType): string {
  if (type === "career") return "Hauptjob";
  if (type === "side_work") return "Nebentaetigkeit";
  if (type === "pause") return "Pause";
  if (type === "private_commitment") return "Private Verpflichtung";
  if (type === "free_time") return "Freizeit";
  if (type === "buffer") return "Puffer";
  if (type === "good_habit") return "Gute Habit";
  if (type === "bad_habit") return "Schlechte Habit";
  if (type === "replacement_habit") return "Ersatz-Habit";
  return "Sonstiges";
}

function incomePlanningManualBlockTypeLabel(type: IncomePlanningManualBlockType): string {
  return incomePlanningManualBlockTypeOptions().find((option) => option.value === type)?.label ?? "Sonstiges Ereignis";
}

function incomePlanningHabitChangeLabel(value: IncomePlanningHabit["goalChange"]): string {
  return incomePlanningHabitChangeOptions().find((option) => option.value === value)?.label ?? "Beibehalten";
}

function incomePlanningOwnerTypeForEntry(entry: IncomePlanningCalendarEntry): Exclude<IncomePlanningOwnerType, "assumption"> {
  if (entry.type === "career" || entry.type === "side_work") return "work";
  if (entry.type === "good_habit" || entry.type === "bad_habit" || entry.type === "replacement_habit") return "habit";
  if (entry.type === "pause") return incomePlanningOwnerTypeForId(entry.ownerId);
  return "manual";
}

function incomePlanningOwnerTypeForId(ownerId: string): Exclude<IncomePlanningOwnerType, "assumption"> {
  if (host.getState().incomePlanning.workBlocks.some((block) => block.id === ownerId)) return "work";
  if (host.getState().incomePlanning.habits.some((habit) => habit.id === ownerId)) return "habit";
  return "manual";
}

export function incomePlanningOwnerTypeFromValue(value: unknown): Exclude<IncomePlanningOwnerType, "assumption"> {
  if (value === "work" || value === "habit" || value === "manual") return value;
  return "manual";
}

function incomePlanningOwnerHours(model: IncomePlanningModel, ownerId: string): number {
  const workBlock = host.getState().incomePlanning.workBlocks.find((block) => block.id === ownerId);
  if (workBlock) return slotsHours(workBlock.slots);
  const manualBlock = host.getState().incomePlanning.manualBlocks.find((block) => block.id === ownerId);
  if (manualBlock) return slotsHours(manualBlock.slots);
  const minutes = model.calendarEntries
    .filter((entry) => entry.ownerId === ownerId && entry.type !== "pause")
    .reduce((sum, entry) => sum + entry.durationMinutes, 0);
  return Math.round((minutes / 60 + Number.EPSILON) * 10) / 10;
}

function slotsHours(slots: IncomePlanningSlot[]): number {
  const minutes = slots.reduce((sum, slot) => sum + incomePlanningSlotNetDurationMinutes(slot), 0);
  return Math.round((minutes / 60 + Number.EPSILON) * 10) / 10;
}

function slotsGrossHours(slots: IncomePlanningSlot[]): number {
  const minutes = slots.reduce((sum, slot) => sum + incomePlanningSlotGrossDurationMinutes(slot), 0);
  return Math.round((minutes / 60 + Number.EPSILON) * 10) / 10;
}

function slotsPauseHours(slots: IncomePlanningSlot[]): number {
  const minutes = slots.reduce((sum, slot) => sum + incomePlanningSlotPauseDurationMinutes(slot), 0);
  return Math.round((minutes / 60 + Number.EPSILON) * 10) / 10;
}

function normalizeIncomePlanningColor(value: unknown, fallback = "#6f7785"): string {
  const color = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : fallback;
}

function incomePlanningColorStyle(color: string): string {
  const normalized = normalizeIncomePlanningColor(color);
  return `--entry-color:${normalized}; --entry-bg:${hexToRgba(normalized, 0.14)};`;
}

function hexToRgba(color: string, alpha: number): string {
  const normalized = normalizeIncomePlanningColor(color);
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${clamp(alpha, 0, 1)})`;
}

function snapIncomePlanningMinute(value: number): number {
  return Math.round(value / 15) * 15;
}

function formatIncomePlanningTime(value: number): string {
  const normalized = clamp(Math.round(value), 0, 24 * 60 - 1);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function incomePlanningStatusLabel(status: IncomePlanningModel["status"]): string {
  if (status === "unrealistic") return "Unrealistisch";
  if (status === "high") return "Hohe Belastung";
  return "Realistisch";
}

function hoursLabel(value: number): string {
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value)} h`;
}

function minutesLabel(value: number): string {
  if (value >= 60) return hoursLabel(Math.round((value / 60 + Number.EPSILON) * 10) / 10);
  return `${intNumber(value)} min`;
}

export function renderIncomePlanningDialog(): void {
  const root = document.querySelector<HTMLDivElement>("#incomePlanningDialogRoot");
  if (!root) return;
  if (!incomePlanningUiState.dialog) {
    root.innerHTML = "";
    return;
  }
  root.innerHTML = `
    <div class="income-planning-dialog-backdrop" role="presentation">
      <div class="income-planning-dialog" role="dialog" aria-modal="true" aria-label="Zeitblock bearbeiten">
        <div class="income-tax-dialog-head">
          <div>
            <strong>${escapeHtml(incomePlanningDialogTitle(incomePlanningUiState.dialog))}</strong>
            <span>${escapeHtml(incomePlanningDialogSubtitle(incomePlanningUiState.dialog))}</span>
          </div>
          ${incomePlanningDialogHeaderActions(incomePlanningUiState.dialog)}
        </div>
        ${incomePlanningUiState.dialog.error ? `<div class="income-planning-warning unrealistic"><strong>Fehler</strong><span>${escapeHtml(incomePlanningUiState.dialog.error)}</span></div>` : ""}
        ${
          incomePlanningUiState.dialog.ownerType === "assumption"
            ? incomePlanningAssumptionDialogFields(incomePlanningUiState.dialog)
            : incomePlanningDialogIsSlotMode(incomePlanningUiState.dialog)
              ? incomePlanningSlotDialogFields(incomePlanningUiState.dialog)
            : incomePlanningBlockDialogFields(incomePlanningUiState.dialog)
        }
        <div class="button-row income-planning-dialog-actions">
          <button class="button secondary" type="button" data-action="income-planning-close-dialog">Abbrechen</button>
          <button class="button" type="button" data-action="income-planning-save-dialog">Speichern</button>
        </div>
      </div>
    </div>
  `;
}

function incomePlanningDialogHeaderActions(dialog: NonNullable<IncomePlanningDialogState>): string {
  const deleteButton = incomePlanningDialogCanDeleteSlot(dialog)
    ? `
      <button
        class="income-planning-header-icon-button danger"
        type="button"
        data-action="income-planning-delete-dialog-slot"
        aria-label="Aktuellen Wochen-Slot loeschen"
        title="Aktuellen Wochen-Slot loeschen"
      >
        ${incomePlanningHeaderIcon("trash")}
      </button>
    `
    : "";
  return `
    <div class="income-planning-header-actions">
      <button class="income-planning-header-icon-button" type="button" data-action="income-planning-close-dialog" aria-label="Zeitbudget-Dialog schliessen" title="Schliessen">x</button>
      <button class="income-planning-header-icon-button" type="button" data-action="income-planning-save-dialog" aria-label="Zeitbudget speichern" title="Speichern">
        ${incomePlanningHeaderIcon("save")}
      </button>
      ${deleteButton}
    </div>
  `;
}

function incomePlanningDialogCanDeleteSlot(dialog: NonNullable<IncomePlanningDialogState>): boolean {
  if (dialog.ownerType === "assumption" || !dialog.ownerId || !dialog.slotId) return false;
  if (dialog.mode !== "edit_slot") return false;
  return Boolean(incomePlanningSlotById(dialog.ownerType, dialog.ownerId, dialog.slotId));
}

function incomePlanningDialogIsSlotMode(dialog: NonNullable<IncomePlanningDialogState>): boolean {
  return dialog.mode === "create_slot" || dialog.mode === "edit_slot";
}

function incomePlanningDialogTitle(dialog: NonNullable<IncomePlanningDialogState>): string {
  if (dialog.ownerType === "assumption") return "Zeitannahme bearbeiten";
  if (dialog.ownerType === "work" && dialog.mode === "create") return "Neuer Taetigkeitsblock";
  if (dialog.ownerType === "manual" && dialog.mode === "create") return "Neuer Zeitblock";
  if (dialog.ownerType === "habit" && dialog.mode === "create") return "Neue Habit";
  if (dialog.mode === "create_slot") return "Slot hinzufuegen";
  if (dialog.mode === "edit_slot") return "Slot bearbeiten";
  if (dialog.ownerType === "work") return "Taetigkeitsblock bearbeiten";
  if (dialog.ownerType === "habit") return "Habit bearbeiten";
  return "Zeitblock bearbeiten";
}

function incomePlanningDialogSubtitle(dialog: NonNullable<IncomePlanningDialogState>): string {
  if (dialog.ownerType === "work") return "Arbeit und Nebentaetigkeiten";
  if (dialog.ownerType === "habit") return "Habit";
  if (dialog.ownerType === "manual") return "Private Zeit, Freizeit, Puffer oder Ereignis";
  return "Schlaf wird als Wochenzeit beruecksichtigt";
}

function incomePlanningAssumptionDialogFields(dialog: NonNullable<IncomePlanningDialogState>): string {
  const sleepSlots = incomePlanningSleepSlotsFromDialogGroups(dialog.sleepSlotGroups);
  const averageSleepHours = incomePlanningAverageSleepHours({ sleepHoursPerDay: dialog.sleepHoursPerDay, sleepSlots });
  return `
    <section class="income-planning-dialog-section">
      <strong>Basis</strong>
      <div class="income-planning-dialog-grid single">
        <label class="field">
          <span>Schlaf pro Tag</span>
          <input type="number" min="0" max="24" step="0.5" value="${averageSleepHours}" disabled />
        </label>
      </div>
    </section>
    <section class="income-planning-dialog-section">
      <div class="income-planning-dialog-section-head">
        <strong>Schlafzeiten</strong>
        <button class="button secondary" type="button" data-action="income-planning-add-sleep-slot">Schlafzeit hinzufuegen</button>
      </div>
      <div class="income-planning-sleep-slot-list">
        ${dialog.sleepSlotGroups.length
          ? dialog.sleepSlotGroups.map(incomePlanningSleepSlotGroupDialogRow).join("")
          : '<div class="chart-empty">Noch keine Schlafzeiten geplant.</div>'}
      </div>
    </section>
  `;
}

function incomePlanningSleepSlotGroupDialogRow(group: IncomePlanningSleepSlotGroup): string {
  return `
    <div class="income-planning-sleep-slot-row">
      ${incomePlanningSleepSlotGroupSelectField(group.id, "fromDay", "Von", incomePlanningWeekdayOptionItems(), group.fromDay)}
      ${incomePlanningSleepSlotGroupSelectField(group.id, "toDay", "Bis", incomePlanningWeekdayOptionItems(), group.toDay)}
      <label class="income-planning-source-active">
        <input type="checkbox" ${group.flexible ? "checked" : ""} data-income-planning-sleep-slot-group-id="${escapeHtml(group.id)}" data-income-planning-sleep-slot-group-field="flexible" />
        <span>Flexibel</span>
      </label>
      <label class="field compact">
        <span>Start</span>
        <input type="time" value="${escapeHtml(group.startTime)}" data-income-planning-sleep-slot-group-id="${escapeHtml(group.id)}" data-income-planning-sleep-slot-group-field="startTime" />
      </label>
      <label class="field compact">
        <span>Ende</span>
        <input type="time" value="${escapeHtml(group.endTime)}" data-income-planning-sleep-slot-group-id="${escapeHtml(group.id)}" data-income-planning-sleep-slot-group-field="endTime" />
      </label>
      <label class="field compact">
        <span>Minuten</span>
        <input type="number" min="15" max="10080" step="15" value="${group.durationMinutes}" data-income-planning-sleep-slot-group-id="${escapeHtml(group.id)}" data-income-planning-sleep-slot-group-field="durationMinutes" />
      </label>
      <button class="icon-button danger" type="button" data-action="income-planning-remove-sleep-slot" data-income-planning-sleep-slot-group-id="${escapeHtml(
        group.id
      )}" aria-label="Schlafzeit entfernen">x</button>
      ${incomePlanningScenarioCheckboxGroup({
        selectedIds: group.scenarioIds,
        dataAttribute: "data-income-planning-sleep-scenario-id",
        groupId: group.id
      })}
    </div>
  `;
}

function incomePlanningSleepSlotGroupSelectField(
  groupId: string,
  field: string,
  label: string,
  options: Array<{ value: string; label: string }>,
  selected: string
): string {
  return `
    <label class="field compact">
      <span>${escapeHtml(label)}</span>
      <select data-income-planning-sleep-slot-group-id="${escapeHtml(groupId)}" data-income-planning-sleep-slot-group-field="${escapeHtml(field)}">
        ${options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === selected ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
      </select>
    </label>
  `;
}

function incomePlanningBlockDialogFields(dialog: NonNullable<IncomePlanningDialogState>): string {
  const isHabit = dialog.ownerType === "habit";
  return `
    <section class="income-planning-dialog-section">
      <strong>Basis</strong>
      <div class="income-planning-dialog-grid basis">
        <label class="income-planning-source-active">
          <input type="checkbox" ${dialog.active ? "checked" : ""} data-income-planning-dialog-field="active" />
          <span>Aktiv</span>
        </label>
        <label class="field">
          <span>Name</span>
          <input type="text" value="${escapeHtml(dialog.name)}" data-income-planning-dialog-field="name" />
        </label>
        <label class="field">
          <span>Beschreibung</span>
          <input type="text" value="${escapeHtml(dialog.description)}" data-income-planning-dialog-field="description" />
        </label>
        ${isHabit ? incomePlanningIconDialogField(dialog) : incomePlanningColorDialogField(dialog)}
        ${dialog.ownerType === "manual" ? incomePlanningIconDialogField(dialog) : ""}
      </div>
    </section>
    <section class="income-planning-dialog-section">
      <strong>${isHabit ? "Art und Ziel" : "Art"}</strong>
      <div class="income-planning-dialog-grid">
        ${dialog.ownerType === "work" ? incomePlanningDialogSelectField("category", "Arbeitsart", incomePlanningCategoryOptions(), dialog.category) : ""}
        ${dialog.ownerType === "manual" ? incomePlanningDialogSelectField("manualType", "Typ", incomePlanningManualBlockTypeOptions(), dialog.manualType) : ""}
        ${isHabit ? incomePlanningDialogSelectField("habitType", "Habit-Art", incomePlanningHabitTypeOptions(), dialog.habitType) : ""}
        ${
          isHabit
            ? `
              ${incomePlanningDialogSelectField("habitGoalChange", "Zielaenderung", incomePlanningHabitChangeOptions(), dialog.habitGoalChange)}
              ${incomePlanningDialogSelectField("habitStatus", "Status", incomePlanningHabitStatusOptions(), dialog.habitStatus)}
              ${incomePlanningDialogSelectField("priority", "Prioritaet", incomePlanningPriorityOptions(), dialog.priority)}
              <label class="field">
                <span>Ersatz-Habit</span>
                <input type="text" value="${escapeHtml(dialog.replacementHabit)}" data-income-planning-dialog-field="replacementHabit" />
              </label>
              <label class="field">
                <span>Zeitname</span>
                <input type="text" value="${escapeHtml(dialog.timing)}" data-income-planning-dialog-field="timing" />
              </label>
              <label class="field compact">
                <span>Habit-Dauer</span>
                <input type="number" min="0" max="1440" step="5" value="${dialog.habitDurationMinutes}" data-income-planning-dialog-field="habitDurationMinutes" />
              </label>
              ${incomePlanningDialogSelectField("habitDurationUnit", "Einheit", incomePlanningHabitDurationUnitOptions(), dialog.habitDurationUnit)}
            `
            : ""
        }
      </div>
    </section>
  `;
}

function incomePlanningSlotDialogFields(dialog: NonNullable<IncomePlanningDialogState>): string {
  const isHabit = dialog.ownerType === "habit";
  return `
    <section class="income-planning-dialog-section income-planning-dialog-slot">
      <strong>Wochen-Slot</strong>
      <div class="income-planning-dialog-grid slot">
        <label class="field">
          <span>Slot-Notiz</span>
          <input type="text" value="${escapeHtml(dialog.slotNote)}" data-income-planning-dialog-field="slotNote" />
        </label>
        ${incomePlanningDialogSelectField("day", "Wochentag", incomePlanningWeekdayOptionItems(), dialog.day)}
        <label class="income-planning-source-active">
          <input type="checkbox" ${dialog.flexible ? "checked" : ""} data-income-planning-dialog-field="flexible" />
          <span>Flexibel</span>
        </label>
        <label class="field compact">
          <span>Start</span>
          <input type="time" value="${escapeHtml(dialog.startTime)}" data-income-planning-dialog-field="startTime" />
        </label>
        <label class="field compact">
          <span>Ende</span>
          <input type="time" value="${escapeHtml(dialog.endTime)}" data-income-planning-dialog-field="endTime" />
        </label>
        <label class="field compact">
          <span>Minuten</span>
          <input type="number" min="15" max="10080" step="15" value="${dialog.slotDurationMinutes}" disabled aria-label="Automatisch berechnete Slot-Minuten" />
        </label>
        ${isHabit ? "" : incomePlanningPauseDialogFields(dialog)}
      </div>
    </section>
    ${incomePlanningDialogScenarioFields(dialog)}
  `;
}

function incomePlanningDialogScenarioFields(dialog: NonNullable<IncomePlanningDialogState>): string {
  if (dialog.ownerType === "assumption" || !incomePlanningDialogIsSlotMode(dialog)) return "";
  return `
    <section class="income-planning-dialog-section">
      <strong>Wochenszenarien</strong>
      ${incomePlanningScenarioCheckboxGroup({
        selectedIds: dialog.scenarioIds,
        dataAttribute: "data-income-planning-dialog-scenario-id"
      })}
    </section>
  `;
}

function incomePlanningColorDialogField(dialog: NonNullable<IncomePlanningDialogState>): string {
  const color = normalizeIncomePlanningColor(dialog.color, dialog.ownerType === "work" ? incomePlanningDefaultWorkColor(dialog.category) : incomePlanningDefaultManualColor(dialog.manualType));
  return `
    <div class="field income-planning-color-field">
      <span>Farbe</span>
      <div class="income-planning-color-control">
        <input type="color" value="${escapeHtml(color)}" data-income-planning-dialog-field="color" aria-label="Blockfarbe" />
        <div class="income-planning-color-swatches" aria-label="Farbauswahl">
          ${INCOME_PLANNING_COLOR_OPTIONS.map(
            (option) => `
              <button
                class="income-planning-color-swatch ${option === color ? "active" : ""}"
                type="button"
                style="--entry-color:${option}; --entry-bg:${hexToRgba(option, 0.18)};"
                data-action="income-planning-set-dialog-color"
                data-income-planning-color="${escapeHtml(option)}"
                aria-label="Farbe ${escapeHtml(option)}"
                aria-pressed="${option === color}"
              ></button>
            `
          ).join("")}
        </div>
      </div>
    </div>
  `;
}

function incomePlanningIconDialogField(dialog: NonNullable<IncomePlanningDialogState>): string {
  const fallback = dialog.ownerType === "manual" ? incomePlanningDefaultManualIcon(dialog.manualType) : dialog.habitType === "bad" ? "snack" : "book";
  const icon = normalizePositionIcon(dialog.ownerType === "manual" ? dialog.manualIcon : dialog.habitIcon, fallback);
  const label = POSITION_ICONS.find((item) => item.id === icon)?.label ?? "Icon";
  return `
    <div class="field income-planning-icon-field">
      <span>Icon</span>
      <button class="income-planning-icon-button" type="button" data-action="open-income-planning-icon-picker" title="Icon auswaehlen">
        ${positionIconSvg(icon, "position-icon-svg income-planning-type-icon")}
        <span>${escapeHtml(label)}</span>
      </button>
    </div>
  `;
}

function incomePlanningPauseDialogFields(dialog: NonNullable<IncomePlanningDialogState>): string {
  return `
    <label class="income-planning-source-active income-planning-pause-toggle">
      <input type="checkbox" ${dialog.pauseEnabled ? "checked" : ""} data-income-planning-dialog-field="pauseEnabled" />
      <span>Pause</span>
    </label>
    ${
      dialog.pauseEnabled
        ? `
          <label class="field compact">
            <span>Pause Start</span>
            <input type="time" value="${escapeHtml(dialog.pauseStartTime)}" data-income-planning-dialog-field="pauseStartTime" />
          </label>
          <label class="field compact">
            <span>Pause Ende</span>
            <input type="time" value="${escapeHtml(dialog.pauseEndTime)}" data-income-planning-dialog-field="pauseEndTime" />
          </label>
          <label class="field compact">
            <span>Pause Minuten</span>
            <input type="number" min="0" max="10080" step="5" value="${dialog.pauseDurationMinutes}" disabled aria-label="Automatisch berechnete Pause-Minuten" />
          </label>
        `
        : ""
    }
  `;
}

function incomePlanningScenarioCheckboxGroup(input: {
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

function incomePlanningDialogSelectField(
  field: string,
  label: string,
  options: Array<{ value: string; label: string }>,
  selected: string
): string {
  return `
    <label class="field compact">
      <span>${escapeHtml(label)}</span>
      <select data-income-planning-dialog-field="${escapeHtml(field)}">
        ${options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === selected ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
      </select>
    </label>
  `;
}

export function openIncomePlanningDialog(
  ownerType: IncomePlanningOwnerType,
  mode: IncomePlanningDialogMode,
  ownerId: string | null = null,
  slotId: string | null = null,
  slotSeed?: Partial<IncomePlanningSlot>
): void {
  const draft = incomePlanningDialogDraft(ownerType, mode, ownerId, slotId, slotSeed);
  if (!draft) return;
  incomePlanningUiState.dialog = draft;
  renderIncomePlanningDialog();
}

export function openIncomePlanningDialogFromCalendar(dayColumn: HTMLElement, clientY: number): void {
  void dayColumn;
  void clientY;
  openIncomePlanningDialog("manual", "create");
}

export function openIncomePlanningStampPickerFromCalendar(dayColumn: HTMLElement, clientX: number, clientY: number): void {
  const day = incomePlanningWeekdayFromValue(dayColumn.dataset.incomePlanningCalendarDay) ?? "monday";
  const rect = dayColumn.getBoundingClientRect();
  const minute = snapIncomePlanningMinute(((clientY - rect.top) / Math.max(1, rect.height)) * 24 * 60);
  const position = incomePlanningPopupPosition(clientX, clientY, 480, 620);
  incomePlanningUiState.stampMenu = null;
  incomePlanningUiState.stampPicker = {
    stampId: null,
    day,
    startTime: formatIncomePlanningTime(clamp(minute, 0, 23 * 60 + 45)),
    icon: "calendar",
    label: "Stempel",
    scenarioIds: incomePlanningDefaultScenarioIdsForNewEntry(),
    ...position
  };
  renderIncomePlanningStampPicker();
  renderIncomePlanningStampMenu();
}

export function openIncomePlanningStampPickerForEdit(stampId: string, clientX: number, clientY: number): void {
  const stamp = host.getState().incomePlanning.calendarStamps.find((item) => item.id === stampId);
  if (!stamp) return;
  const position = incomePlanningPopupPosition(clientX, clientY, 480, 620);
  incomePlanningUiState.stampMenu = null;
  incomePlanningUiState.stampPicker = {
    stampId: stamp.id,
    day: stamp.day,
    startTime: stamp.startTime,
    icon: normalizePositionIcon(stamp.icon, "calendar"),
    label: stamp.label,
    scenarioIds: incomePlanningScenarioIdsForDialog(stamp.scenarioIds),
    ...position
  };
  renderIncomePlanningStampPicker();
  renderIncomePlanningStampMenu();
}

export function openIncomePlanningStampMenu(stampId: string, clientX: number, clientY: number): void {
  if (!host.getState().incomePlanning.calendarStamps.some((stamp) => stamp.id === stampId)) return;
  incomePlanningUiState.stampPicker = null;
  incomePlanningUiState.stampMenu = { stampId, ...incomePlanningPopupPosition(clientX, clientY, 220, 160) };
  renderIncomePlanningStampPicker();
  renderIncomePlanningStampMenu();
}

function incomePlanningPopupPosition(
  clientX: number,
  clientY: number,
  panelWidth: number,
  panelHeight: number
): { top: number; left: number } {
  return {
    left: Math.max(12, Math.min(clientX + 12, window.innerWidth - panelWidth - 12)),
    top: Math.max(12, Math.min(clientY + 12, window.innerHeight - panelHeight - 12))
  };
}

function incomePlanningDialogDraft(
  ownerType: IncomePlanningOwnerType,
  mode: IncomePlanningDialogMode,
  ownerId: string | null,
  slotId: string | null,
  slotSeed?: Partial<IncomePlanningSlot>
): IncomePlanningDialogState {
  const workBlock = ownerType === "work" ? host.getState().incomePlanning.workBlocks.find((block) => block.id === ownerId) : null;
  const manualBlock = ownerType === "manual" ? host.getState().incomePlanning.manualBlocks.find((block) => block.id === ownerId) : null;
  const habit = ownerType === "habit" ? host.getState().incomePlanning.habits.find((item) => item.id === ownerId) : null;
  const fallbackWorkCategory = incomePlanningDefaultWorkCategory(host.getState().incomePlanning.workBlocks);
  const fallbackWork = buildIncomePlanningWorkBlock(fallbackWorkCategory, "dialog-work");
  const fallbackManual = buildIncomePlanningManualBlock("other_event", "dialog-manual");
  const fallbackHabit = buildIncomePlanningHabit("dialog-habit");
  const sourceSlots =
    ownerType === "work"
      ? workBlock?.slots ?? fallbackWork.slots
      : ownerType === "manual"
        ? manualBlock?.slots ?? fallbackManual.slots
        : ownerType === "habit"
          ? habit?.slots ?? fallbackHabit.slots
          : [];
  const selectedSlot = mode === "edit_slot" ? sourceSlots.find((item) => item.id === slotId) ?? null : null;
  if (mode === "edit_slot" && !selectedSlot) return null;
  const slot =
    ownerType === "assumption"
      ? defaultIncomePlanningSlot("manual")
      : {
          ...defaultIncomePlanningSlot(ownerType),
          ...(selectedSlot ?? {}),
          ...slotSeed
        };
  const slotVisualRange = incomePlanningVisualRangeFromTimes(slot.startTime, slot.endTime, slot.durationMinutes);
  return {
    mode,
    ownerType,
    ownerId,
    slotId: mode === "edit_slot" ? slot.id : null,
    active: workBlock?.active ?? manualBlock?.active ?? habit?.active ?? true,
    category: workBlock?.category ?? fallbackWork.category,
    manualType: manualBlock?.type ?? "other_event",
    habitType: habit?.type ?? fallbackHabit.type,
    habitDurationUnit: habit?.durationUnit ?? fallbackHabit.durationUnit,
    habitGoalChange: habit?.goalChange ?? fallbackHabit.goalChange,
    habitStatus: habit?.status ?? fallbackHabit.status,
    priority: habit?.priority ?? fallbackHabit.priority,
    name: workBlock?.name ?? manualBlock?.name ?? habit?.name ?? (ownerType === "manual" ? fallbackManual.name : ownerType === "habit" ? fallbackHabit.name : fallbackWork.name),
    description: workBlock?.description ?? manualBlock?.description ?? habit?.description ?? "",
    color:
      ownerType === "work"
        ? normalizeIncomePlanningColor(workBlock?.color, incomePlanningDefaultWorkColor(workBlock?.category ?? fallbackWork.category))
        : normalizeIncomePlanningColor(manualBlock?.color, incomePlanningDefaultManualColor(manualBlock?.type ?? "other_event")),
    habitIcon: normalizePositionIcon(
      habit?.icon,
      (habit?.type ?? fallbackHabit.type) === "bad" ? "snack" : (fallbackHabit.icon ?? "book")
    ),
    manualIcon: normalizePositionIcon(manualBlock?.icon, incomePlanningDefaultManualIcon(manualBlock?.type ?? "other_event")),
    timing: habit?.timing ?? fallbackHabit.timing,
    habitDurationMinutes: habit?.durationMinutes ?? fallbackHabit.durationMinutes,
    replacementHabit: habit?.replacementHabit ?? "",
    sleepHoursPerDay: host.getState().incomePlanning.assumptions.sleepHoursPerDay,
    sleepSlotGroups: incomePlanningSleepSlotGroupsFromSlots(host.getState().incomePlanning.assumptions.sleepSlots),
    slotNote: slot.note ?? "",
    day: slot.day,
    toDay: slot.day,
    startTime: slot.startTime,
    endTime: slot.endTime,
    flexible: slot.flexible,
    slotDurationMinutes: slotVisualRange.endMinute - slotVisualRange.startMinute,
    pauseEnabled:
      ownerType !== "habit" &&
      Boolean(slot.pauseEnabled ?? (slot.pauseDurationMinutes && slot.pauseStartTime && slot.pauseEndTime)),
    pauseStartTime: slot.pauseStartTime ?? "12:00",
    pauseEndTime: slot.pauseEndTime ?? "12:30",
    pauseDurationMinutes: incomePlanningPauseDurationFromTimes(slot.pauseStartTime ?? "12:00", slot.pauseEndTime ?? "12:30"),
    scenarioIds:
      ownerType === "assumption"
        ? []
        : mode === "create_slot"
          ? incomePlanningDefaultScenarioIdsForNewSlot()
          : mode === "edit_slot"
            ? incomePlanningScenarioIdsForDialog(slot.scenarioIds)
            : [],
    error: ""
  };
}

export function updateIncomePlanningDialogDraft(field: string, value: string): void {
  if (!incomePlanningUiState.dialog) return;
  const numericFields = new Set(["habitDurationMinutes", "slotDurationMinutes", "sleepHoursPerDay"]);
  const booleanFields = new Set(["active", "flexible", "pauseEnabled"]);
  const nextDraft = {
    ...incomePlanningUiState.dialog,
    [field]: booleanFields.has(field)
      ? value === "true"
      : numericFields.has(field)
        ? numberValue(value)
        : field === "color"
          ? normalizeIncomePlanningColor(value, incomePlanningUiState.dialog.color)
          : value,
    error: ""
  } as NonNullable<IncomePlanningDialogState>;
  incomePlanningUiState.dialog = incomePlanningDialogWithAutoSlotDuration(nextDraft);
}

function updateIncomePlanningDialogScenarioSelection(scenarioId: string, checked: boolean): void {
  if (!incomePlanningUiState.dialog || !incomePlanningKnownScenarioIds().includes(scenarioId)) return;
  const selected = new Set(incomePlanningUiState.dialog.scenarioIds);
  if (checked) selected.add(scenarioId);
  else selected.delete(scenarioId);
  incomePlanningUiState.dialog = { ...incomePlanningUiState.dialog, scenarioIds: Array.from(selected), error: "" };
  renderIncomePlanningDialog();
}

function incomePlanningDialogWithAutoSlotDuration(
  draft: NonNullable<IncomePlanningDialogState>
): NonNullable<IncomePlanningDialogState> {
  const start = parseTimeMinutes(draft.startTime);
  const end = parseTimeMinutes(draft.endTime);
  const pauseStart = parseTimeMinutes(draft.pauseStartTime);
  const pauseEnd = parseTimeMinutes(draft.pauseEndTime);
  return {
    ...draft,
    slotDurationMinutes: start !== null && end !== null && end > start ? end - start : draft.slotDurationMinutes,
    pauseDurationMinutes:
      pauseStart !== null && pauseEnd !== null && pauseEnd > pauseStart
        ? pauseEnd - pauseStart
        : 0
  };
}

function incomePlanningPauseDurationFromTimes(startTime: string, endTime: string): number {
  const start = parseTimeMinutes(startTime);
  const end = parseTimeMinutes(endTime);
  return start !== null && end !== null && end > start ? end - start : 0;
}

export function addIncomePlanningDialogSleepSlot(): void {
  if (!incomePlanningUiState.dialog || incomePlanningUiState.dialog.ownerType !== "assumption") return;
  const group = normalizeIncomePlanningDialogSleepSlotGroup({
    id: createId(),
    fromDay: "monday",
    toDay: "friday",
    startTime: "21:00",
    endTime: "05:30",
    flexible: false,
    durationMinutes: 8.5 * 60,
    scenarioIds: incomePlanningDefaultScenarioIdsForNewEntry(),
    slotIds: {}
  });
  incomePlanningUiState.dialog = {
    ...incomePlanningUiState.dialog,
    sleepSlotGroups: [...incomePlanningUiState.dialog.sleepSlotGroups, group],
    error: ""
  };
  renderIncomePlanningDialog();
}

export function removeIncomePlanningDialogSleepSlot(groupId: string): void {
  if (!incomePlanningUiState.dialog || incomePlanningUiState.dialog.ownerType !== "assumption" || !groupId) return;
  incomePlanningUiState.dialog = {
    ...incomePlanningUiState.dialog,
    sleepSlotGroups: incomePlanningUiState.dialog.sleepSlotGroups.filter((group) => group.id !== groupId),
    error: ""
  };
  renderIncomePlanningDialog();
}

function updateIncomePlanningDialogSleepSlotGroup(groupId: string, field: keyof IncomePlanningSleepSlotGroup, value: string): void {
  if (!incomePlanningUiState.dialog || incomePlanningUiState.dialog.ownerType !== "assumption" || !groupId) return;
  incomePlanningUiState.dialog = {
    ...incomePlanningUiState.dialog,
    sleepSlotGroups: incomePlanningUiState.dialog.sleepSlotGroups.map((group) =>
      group.id === groupId ? normalizeIncomePlanningDialogSleepSlotGroup(updateIncomePlanningSleepSlotGroupField(group, field, value)) : group
    ),
    error: ""
  };
  renderIncomePlanningDialog();
}

function updateIncomePlanningSleepSlotGroupField(
  group: IncomePlanningSleepSlotGroup,
  field: keyof IncomePlanningSleepSlotGroup,
  value: string
): IncomePlanningSleepSlotGroup {
  if (field === "fromDay" && isIncomePlanningWeekday(value)) return { ...group, fromDay: value };
  if (field === "toDay" && isIncomePlanningWeekday(value)) return { ...group, toDay: value };
  if (field === "flexible") return { ...group, flexible: value === "true" };
  if (field === "startTime") return { ...group, startTime: value };
  if (field === "endTime") return { ...group, endTime: value };
  if (field === "durationMinutes") return { ...group, durationMinutes: Math.round(clamp(numberValue(value), 15, 10080)) };
  return group;
}

function updateIncomePlanningDialogSleepSlotGroupScenario(groupId: string, scenarioId: string, checked: boolean): void {
  if (!incomePlanningUiState.dialog || incomePlanningUiState.dialog.ownerType !== "assumption" || !incomePlanningKnownScenarioIds().includes(scenarioId)) return;
  incomePlanningUiState.dialog = {
    ...incomePlanningUiState.dialog,
    sleepSlotGroups: incomePlanningUiState.dialog.sleepSlotGroups.map((group) => {
      if (group.id !== groupId) return group;
      const selected = new Set(group.scenarioIds);
      if (checked) selected.add(scenarioId);
      else selected.delete(scenarioId);
      return { ...group, scenarioIds: Array.from(selected) };
    }),
    error: ""
  };
  renderIncomePlanningDialog();
}

function normalizeIncomePlanningDialogSleepSlot(slot: IncomePlanningSleepSlot): IncomePlanningSleepSlot {
  const durationMinutes = slot.flexible
    ? Math.round(clamp(slot.durationMinutes, 15, 10080))
    : incomePlanningSleepSlotDurationMinutes(slot);
  return {
    ...slot,
    durationMinutes
  };
}

function normalizeIncomePlanningDialogSleepSlotGroup(group: IncomePlanningSleepSlotGroup): IncomePlanningSleepSlotGroup {
  const durationMinutes = group.flexible
    ? Math.round(clamp(group.durationMinutes, 15, 10080))
    : incomePlanningSleepSlotDurationMinutes({
        id: group.id,
        day: group.fromDay,
        startTime: group.startTime,
        endTime: group.endTime,
        flexible: false,
        durationMinutes: group.durationMinutes
      });
  return {
    ...group,
    durationMinutes
  };
}

function incomePlanningSleepSlotGroupsFromSlots(slots: IncomePlanningSleepSlot[]): IncomePlanningSleepSlotGroup[] {
  const groups: IncomePlanningSleepSlotGroup[] = [];
  for (const rawSlot of slots) {
    const slot = normalizeIncomePlanningDialogSleepSlot(rawSlot);
    const last = groups[groups.length - 1];
    if (last && incomePlanningSleepSlotGroupMatchesSlot(last, slot) && incomePlanningNextWeekday(last.toDay) === slot.day) {
      last.toDay = slot.day;
      last.slotIds = { ...last.slotIds, [slot.day]: slot.id };
    } else {
      groups.push({
        id: slot.id || createId(),
        fromDay: slot.day,
        toDay: slot.day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        flexible: slot.flexible,
        durationMinutes: slot.durationMinutes,
        scenarioIds: incomePlanningScenarioIdsForDialog(slot.scenarioIds),
        slotIds: { [slot.day]: slot.id }
      });
    }
  }
  return groups;
}

function incomePlanningSleepSlotGroupMatchesSlot(group: IncomePlanningSleepSlotGroup, slot: IncomePlanningSleepSlot): boolean {
  return (
    group.startTime === slot.startTime &&
    group.endTime === slot.endTime &&
    group.flexible === slot.flexible &&
    group.durationMinutes === slot.durationMinutes &&
    scenarioIdsEqual(group.scenarioIds, incomePlanningScenarioIdsForDialog(slot.scenarioIds))
  );
}

function incomePlanningSleepSlotsFromDialogGroups(groups: IncomePlanningSleepSlotGroup[]): IncomePlanningSleepSlot[] {
  return groups.flatMap((group) =>
    incomePlanningSleepSlotGroupDays(group).map((day) =>
      normalizeIncomePlanningDialogSleepSlot({
        id: group.slotIds[day] ?? `${group.id}-${day}`,
        day,
        startTime: group.startTime,
        endTime: group.endTime,
        flexible: group.flexible,
        durationMinutes: group.durationMinutes,
        scenarioIds: incomePlanningStoredScenarioIds(group.scenarioIds)
      })
    )
  );
}

function scenarioIdsEqual(first: IncomePlanningWeekScenarioId[], second: IncomePlanningWeekScenarioId[]): boolean {
  if (first.length !== second.length) return false;
  const firstSet = new Set(first);
  return second.every((scenarioId) => firstSet.has(scenarioId));
}

function incomePlanningSleepSlotGroupDays(group: IncomePlanningSleepSlotGroup): IncomePlanningWeekday[] {
  const days: IncomePlanningWeekday[] = [];
  const startIndex = incomePlanningWeekdayIndex(group.fromDay);
  for (let offset = 0; offset < INCOME_PLANNING_WEEK_DAYS.length; offset += 1) {
    const day = INCOME_PLANNING_WEEK_DAYS[(startIndex + offset) % INCOME_PLANNING_WEEK_DAYS.length];
    days.push(day);
    if (day === group.toDay) break;
  }
  return days;
}

function incomePlanningNextWeekday(day: IncomePlanningWeekday): IncomePlanningWeekday {
  return INCOME_PLANNING_WEEK_DAYS[(incomePlanningWeekdayIndex(day) + 1) % INCOME_PLANNING_WEEK_DAYS.length];
}

export function closeIncomePlanningDialog(): void {
  incomePlanningUiState.dialog = null;
  incomePlanningUiState.habitIconPicker = null;
  renderIncomePlanningDialog();
  renderIncomePlanningHabitIconPicker();
}

export function deleteIncomePlanningDialogSlot(): void {
  if (!incomePlanningUiState.dialog || !incomePlanningDialogCanDeleteSlot(incomePlanningUiState.dialog)) return;
  const ownerType = incomePlanningUiState.dialog.ownerType;
  const ownerId = incomePlanningUiState.dialog.ownerId ?? "";
  const slotId = incomePlanningUiState.dialog.slotId ?? "";
  incomePlanningUiState.dialog = null;
  incomePlanningUiState.habitIconPicker = null;
  removeIncomePlanningSlot(ownerType, ownerId, slotId);
  renderIncomePlanningHabitIconPicker();
}

export function saveIncomePlanningDialog(): void {
  if (!incomePlanningUiState.dialog) return;
  const draft = incomePlanningUiState.dialog;
  if (draft.ownerType === "assumption") {
    if (draft.sleepSlotGroups.some((group) => !group.scenarioIds.length)) {
      incomePlanningUiState.dialog = { ...draft, error: "Bitte pro Schlafzeit mindestens ein Wochenszenario auswaehlen." };
      renderIncomePlanningDialog();
      return;
    }
    const sleepSlots = incomePlanningSleepSlotsFromDialogGroups(draft.sleepSlotGroups);
    host.getState().incomePlanning = {
      ...host.getState().incomePlanning,
      assumptions: {
        ...host.getState().incomePlanning.assumptions,
        sleepHoursPerDay: clamp(incomePlanningAverageSleepHours({ sleepHoursPerDay: draft.sleepHoursPerDay, sleepSlots }), 0, 24),
        sleepSlots
      }
    };
    closeIncomePlanningDialog();
    renderIncomePlanning();
    host.persistCurrentState();
    return;
  }

  if (!incomePlanningDialogIsSlotMode(draft)) {
    if (draft.mode === "create") createIncomePlanningOwnerFromDialog(draft, []);
    else applyIncomePlanningDialogOwnerFields(draft);
    closeIncomePlanningDialog();
    renderIncomePlanning();
    host.persistCurrentState();
    return;
  }

  const dialogSlots = incomePlanningSlotsFromDialog(draft);
  if (!dialogSlots.length) {
    incomePlanningUiState.dialog = { ...draft, error: "Start und Ende muessen innerhalb desselben Tages liegen und mindestens 15 Minuten Abstand haben." };
    renderIncomePlanningDialog();
    return;
  }
  if (!draft.scenarioIds.length) {
    incomePlanningUiState.dialog = { ...draft, error: "Bitte mindestens ein Wochenszenario auswaehlen." };
    renderIncomePlanningDialog();
    return;
  }

  updateIncomePlanningOwnerSlots(draft.ownerType, draft.ownerId ?? "", (slots) =>
    incomePlanningApplyDialogSlots(draft, slots, dialogSlots)
  );
  closeIncomePlanningDialog();
  renderIncomePlanning();
  host.persistCurrentState();
}

function incomePlanningSlotsFromDialog(draft: NonNullable<IncomePlanningDialogState>): IncomePlanningSlot[] {
  const start = parseTimeMinutes(draft.startTime);
  const end = parseTimeMinutes(draft.endTime);
  if (start === null || end === null || end - start < 15) return [];
  const durationMinutes = end - start;
  const pause = incomePlanningPauseFromDialog(draft);
  const slot: IncomePlanningSlot = {
    id: draft.slotId || createId(),
    ...(draft.slotNote.trim() ? { note: draft.slotNote.trim() } : {}),
    day: draft.day,
    startTime: draft.startTime,
    endTime: draft.endTime,
    flexible: draft.flexible,
    durationMinutes,
    scenarioIds: incomePlanningStoredScenarioIds(draft.scenarioIds),
    ...pause
  };
  return [draft.ownerType === "habit" ? incomePlanningStripSlotPause(slot) : slot];
}

function incomePlanningPauseFromDialog(draft: NonNullable<IncomePlanningDialogState>): Partial<IncomePlanningSlot> {
  if (draft.ownerType === "habit") return {};
  return {
    pauseEnabled: draft.pauseEnabled,
    pauseStartTime: draft.pauseStartTime,
    pauseEndTime: draft.pauseEndTime,
    pauseDurationMinutes: incomePlanningPauseDurationFromTimes(draft.pauseStartTime, draft.pauseEndTime)
  };
}

function incomePlanningApplyDialogSlots(
  draft: NonNullable<IncomePlanningDialogState>,
  existingSlots: IncomePlanningSlot[],
  newSlots: IncomePlanningSlot[]
): IncomePlanningSlot[] {
  const slot = newSlots[0];
  if (!slot) return existingSlots;
  if (draft.mode === "edit_slot" && draft.slotId) {
    return existingSlots.map((item) => (item.id === draft.slotId ? slot : item));
  }
  return [...existingSlots, slot];
}

function createIncomePlanningOwnerFromDialog(draft: NonNullable<IncomePlanningDialogState>, slots: IncomePlanningSlot[]): void {
  if (draft.ownerType === "work") {
    const id = createId();
    host.getState().incomePlanning = {
      ...host.getState().incomePlanning,
      workBlocks: [
        ...host.getState().incomePlanning.workBlocks,
        buildIncomePlanningWorkBlock(draft.category, id, {
          active: draft.active,
          name: draft.name || incomePlanningCategoryConfig(draft.category).defaultName,
          description: draft.description,
          color: normalizeIncomePlanningColor(draft.color, incomePlanningDefaultWorkColor(draft.category)),
          slots
        })
      ]
    };
    enforceIncomePlanningMainJob(id);
  }
  if (draft.ownerType === "manual") {
    host.getState().incomePlanning = {
      ...host.getState().incomePlanning,
      manualBlocks: [
        ...host.getState().incomePlanning.manualBlocks,
        buildIncomePlanningManualBlock(draft.manualType, createId(), {
          active: draft.active,
          name: draft.name || incomePlanningManualBlockTypeLabel(draft.manualType),
          description: draft.description,
          color: normalizeIncomePlanningColor(draft.color, incomePlanningDefaultManualColor(draft.manualType)),
          icon: normalizePositionIcon(draft.manualIcon, incomePlanningDefaultManualIcon(draft.manualType)),
          slots
        })
      ]
    };
  }
  if (draft.ownerType === "habit") {
    host.getState().incomePlanning = {
      ...host.getState().incomePlanning,
      habits: [
        ...host.getState().incomePlanning.habits,
        buildIncomePlanningHabit(createId(), {
          active: draft.active,
          type: draft.habitType,
          name: draft.name || "Habit",
          description: draft.description,
          icon: normalizePositionIcon(draft.habitIcon, draft.habitType === "bad" ? "snack" : "book"),
          timing: draft.timing,
          durationMinutes: clamp(Math.round(draft.habitDurationMinutes), 0, 1440),
          durationUnit: draft.habitDurationUnit,
          goalChange: draft.habitGoalChange,
          replacementHabit: draft.replacementHabit,
          status: draft.habitStatus,
          priority: draft.priority,
          slots
        })
      ]
    };
  }
}

function applyIncomePlanningDialogOwnerFields(draft: NonNullable<IncomePlanningDialogState>): void {
  if (!draft.ownerId) return;
  if (draft.ownerType === "work") {
    host.getState().incomePlanning = {
      ...host.getState().incomePlanning,
      workBlocks: host.getState().incomePlanning.workBlocks.map((block) =>
        block.id === draft.ownerId
          ? {
              ...block,
              active: draft.active,
              category: draft.category,
              name: draft.name,
              description: draft.description,
              color: normalizeIncomePlanningColor(draft.color, incomePlanningDefaultWorkColor(draft.category))
            }
          : block
      )
    };
    enforceIncomePlanningMainJob(draft.ownerId);
  }
  if (draft.ownerType === "manual") {
    host.getState().incomePlanning = {
      ...host.getState().incomePlanning,
      manualBlocks: host.getState().incomePlanning.manualBlocks.map((block) =>
        block.id === draft.ownerId
          ? {
              ...block,
              active: draft.active,
              type: draft.manualType,
              name: draft.name,
              description: draft.description,
              color: normalizeIncomePlanningColor(draft.color, incomePlanningDefaultManualColor(draft.manualType)),
              icon: normalizePositionIcon(draft.manualIcon, incomePlanningDefaultManualIcon(draft.manualType))
            }
          : block
      )
    };
  }
  if (draft.ownerType === "habit") {
    host.getState().incomePlanning = {
      ...host.getState().incomePlanning,
      habits: host.getState().incomePlanning.habits.map((habit) =>
        habit.id === draft.ownerId
          ? {
              ...habit,
              active: draft.active,
              type: draft.habitType,
              name: draft.name,
              description: draft.description,
              icon: normalizePositionIcon(draft.habitIcon, draft.habitType === "bad" ? "snack" : "book"),
              timing: draft.timing,
              durationMinutes: clamp(Math.round(draft.habitDurationMinutes), 0, 1440),
              durationUnit: draft.habitDurationUnit,
              goalChange: draft.habitGoalChange,
              replacementHabit: draft.replacementHabit,
              status: draft.habitStatus,
              priority: draft.priority
            }
          : habit
      )
    };
  }
}

function enforceIncomePlanningMainJob(primaryId: string | null): void {
  if (!primaryId) return;
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    workBlocks: enforceSingleActiveIncomePlanningMainJob(host.getState().incomePlanning.workBlocks, primaryId)
  };
}

export function handleIncomePlanningControl(
  target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  renderMode: "live" | "full" = "full"
): boolean {
  if (target.dataset.incomePlanningWeekScenarioDialogField) {
    updateIncomePlanningWeekScenarioDialogDraft(target.dataset.incomePlanningWeekScenarioDialogField, target.value);
    return true;
  }

  if (target.dataset.incomePlanningDialogScenarioId) {
    if (!(target instanceof HTMLInputElement)) return false;
    updateIncomePlanningDialogScenarioSelection(target.dataset.incomePlanningDialogScenarioId, target.checked);
    return true;
  }

  if (target.dataset.incomePlanningStampScenarioId) {
    if (!(target instanceof HTMLInputElement)) return false;
    updateIncomePlanningStampScenarioSelection(target.dataset.incomePlanningStampScenarioId, target.checked);
    return true;
  }

  if (target.dataset.incomeStampPlannerScenarioId) {
    if (!(target instanceof HTMLInputElement)) return false;
    updateIncomeStampPlannerScenarioSelection(target.dataset.incomeStampPlannerScenarioId, target.checked);
    return true;
  }

  if (target.dataset.incomePlanningSleepSlotGroupId && target.dataset.incomePlanningSleepScenarioId) {
    if (!(target instanceof HTMLInputElement)) return false;
    updateIncomePlanningDialogSleepSlotGroupScenario(
      target.dataset.incomePlanningSleepSlotGroupId,
      target.dataset.incomePlanningSleepScenarioId,
      target.checked
    );
    return true;
  }

  if (target.dataset.incomePlanningSleepSlotGroupId && target.dataset.incomePlanningSleepSlotGroupField) {
    const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
    updateIncomePlanningDialogSleepSlotGroup(
      target.dataset.incomePlanningSleepSlotGroupId,
      target.dataset.incomePlanningSleepSlotGroupField as keyof IncomePlanningSleepSlotGroup,
      value
    );
    return true;
  }

  if (target.dataset.incomePlanningDialogField) {
    const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
    const field = target.dataset.incomePlanningDialogField;
    updateIncomePlanningDialogDraft(field, value);
    if (["pauseEnabled", "flexible"].includes(field)) {
      renderIncomePlanningDialog();
    }
    return true;
  }

  if (target.dataset.incomePlanningAssumption) {
    updateIncomePlanningAssumption(
      target.dataset.incomePlanningAssumption as keyof IncomePlanningAssumptions,
      target.value
    );
    if (renderMode === "live") renderIncomePlanningSummary();
    else renderIncomePlanning();
    host.persistCurrentState();
    return true;
  }

  if (target.dataset.incomePlanningWorkId && target.dataset.incomePlanningWorkField) {
    const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
    updateIncomePlanningWorkBlock(
      target.dataset.incomePlanningWorkId,
      target.dataset.incomePlanningWorkField as keyof IncomePlanningWorkBlock,
      value
    );
    if (renderMode === "live") renderIncomePlanningSummary();
    else renderIncomePlanning();
    host.persistCurrentState();
    return true;
  }

  if (target.dataset.incomePlanningHabitId && target.dataset.incomePlanningHabitField) {
    const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
    updateIncomePlanningHabit(
      target.dataset.incomePlanningHabitId,
      target.dataset.incomePlanningHabitField as keyof IncomePlanningHabit,
      value
    );
    if (renderMode === "live") renderIncomePlanningSummary();
    else renderIncomePlanning();
    host.persistCurrentState();
    return true;
  }

  if (target.dataset.incomePlanningManualId && target.dataset.incomePlanningManualField) {
    const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
    updateIncomePlanningManualBlock(
      target.dataset.incomePlanningManualId,
      target.dataset.incomePlanningManualField as keyof IncomePlanningManualBlock,
      value
    );
    if (renderMode === "live") renderIncomePlanningSummary();
    else renderIncomePlanning();
    host.persistCurrentState();
    return true;
  }

  if (
    target.dataset.incomePlanningOwnerType &&
    target.dataset.incomePlanningOwnerId &&
    target.dataset.incomePlanningSlotId &&
    target.dataset.incomePlanningSlotField
  ) {
    const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
    updateIncomePlanningSlot(
      target.dataset.incomePlanningOwnerType,
      target.dataset.incomePlanningOwnerId,
      target.dataset.incomePlanningSlotId,
      target.dataset.incomePlanningSlotField as keyof IncomePlanningSlot,
      value
    );
    if (renderMode === "live") renderIncomePlanningSummary();
    else renderIncomePlanning();
    host.persistCurrentState();
    return true;
  }

  return false;
}

export function removeIncomePlanningWorkBlock(workBlockId: string): void {
  if (!workBlockId) return;
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    workBlocks: host.getState().incomePlanning.workBlocks.filter((block) => block.id !== workBlockId)
  };
  renderIncomePlanning();
  host.persistCurrentState();
}

export function removeIncomePlanningHabit(habitId: string): void {
  if (!habitId) return;
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    habits: host.getState().incomePlanning.habits.filter((habit) => habit.id !== habitId)
  };
  renderIncomePlanning();
  host.persistCurrentState();
}

export function removeIncomePlanningManualBlock(blockId: string): void {
  if (!blockId) return;
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    manualBlocks: host.getState().incomePlanning.manualBlocks.filter((block) => block.id !== blockId)
  };
  renderIncomePlanning();
  host.persistCurrentState();
}

export function removeIncomePlanningSlot(ownerType: string, ownerId: string, slotId: string): void {
  if (!ownerType || !ownerId || !slotId) return;
  updateIncomePlanningOwnerSlots(ownerType, ownerId, (slots) => slots.filter((slot) => slot.id !== slotId));
  renderIncomePlanning();
  host.persistCurrentState();
}

function updateIncomePlanningAssumption(field: keyof IncomePlanningAssumptions, value: string): void {
  if (field !== "sleepHoursPerDay") return;
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    assumptions: {
      ...host.getState().incomePlanning.assumptions,
      sleepHoursPerDay: Math.max(0, numberValue(value))
    }
  };
}

function updateIncomePlanningWorkBlock(
  workBlockId: string,
  field: keyof IncomePlanningWorkBlock,
  value: string
): void {
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    workBlocks: host.getState().incomePlanning.workBlocks.map((workBlock) => {
      if (workBlock.id !== workBlockId) return workBlock;
      if (field === "active") return { ...workBlock, active: value === "true" };
      if (field === "category") {
        const category = isIncomePlanningCategory(value) ? value : workBlock.category;
        return {
          ...workBlock,
          category,
          color: normalizeIncomePlanningColor(workBlock.color, incomePlanningDefaultWorkColor(category))
        };
      }
      if (field === "name") return { ...workBlock, name: value };
      if (field === "description") return { ...workBlock, description: value };
      if (field === "color") return { ...workBlock, color: normalizeIncomePlanningColor(value, workBlock.color ?? incomePlanningDefaultWorkColor(workBlock.category)) };
      return workBlock;
    })
  };
}

function updateIncomePlanningHabit(habitId: string, field: keyof IncomePlanningHabit, value: string): void {
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    habits: host.getState().incomePlanning.habits.map((habit) => {
      if (habit.id !== habitId) return habit;
      if (field === "active") return { ...habit, active: value === "true" };
      if (field === "type" && isIncomePlanningHabitType(value)) return { ...habit, type: value };
      if (field === "name") return { ...habit, name: value };
      if (field === "description") return { ...habit, description: value };
      if (field === "icon") return { ...habit, icon: normalizePositionIcon(value, habit.type === "bad" ? "snack" : "book") };
      if (field === "timing") return { ...habit, timing: value };
      if (field === "durationMinutes") return { ...habit, durationMinutes: Math.round(clamp(numberValue(value), 0, 1440)) };
      if (field === "durationUnit" && isIncomePlanningHabitDurationUnit(value)) return { ...habit, durationUnit: value };
      if (field === "goalChange" && isIncomePlanningHabitChange(value)) return { ...habit, goalChange: value };
      if (field === "replacementHabit") return { ...habit, replacementHabit: value };
      if (field === "status" && isIncomePlanningHabitStatus(value)) return { ...habit, status: value };
      if (field === "priority" && isIncomePlanningPriority(value)) return { ...habit, priority: value };
      return habit;
    })
  };
}

function updateIncomePlanningManualBlock(
  blockId: string,
  field: keyof IncomePlanningManualBlock,
  value: string
): void {
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    manualBlocks: host.getState().incomePlanning.manualBlocks.map((block) => {
      if (block.id !== blockId) return block;
      if (field === "active") return { ...block, active: value === "true" };
      if (field === "type" && isIncomePlanningManualBlockType(value)) return { ...block, type: value };
      if (field === "name") return { ...block, name: value };
      if (field === "description") return { ...block, description: value };
      if (field === "color") return { ...block, color: normalizeIncomePlanningColor(value, block.color ?? incomePlanningDefaultManualColor(block.type)) };
      if (field === "icon") return { ...block, icon: normalizePositionIcon(value, incomePlanningDefaultManualIcon(block.type)) };
      return block;
    })
  };
}

function updateIncomePlanningSlot(
  ownerType: string,
  ownerId: string,
  slotId: string,
  field: keyof IncomePlanningSlot,
  value: string
): void {
  updateIncomePlanningOwnerSlots(ownerType, ownerId, (slots) =>
    slots.map((slot) => {
      if (slot.id !== slotId) return slot;
      return normalizeIncomePlanningSlotAfterEdit(updateIncomePlanningSlotField(slot, field, value));
    })
  );
}

function updateIncomePlanningSlotField(slot: IncomePlanningSlot, field: keyof IncomePlanningSlot, value: string): IncomePlanningSlot {
  if (field === "day" && isIncomePlanningWeekday(value)) return { ...slot, day: value };
  if (field === "flexible") return { ...slot, flexible: value === "true" };
  if (field === "startTime") return { ...slot, startTime: value };
  if (field === "endTime") return { ...slot, endTime: value };
  if (field === "durationMinutes") return { ...slot, durationMinutes: Math.round(clamp(numberValue(value), 0, 10080)) };
  if (field === "pauseEnabled") return { ...slot, pauseEnabled: value === "true" };
  if (field === "pauseStartTime") return { ...slot, pauseStartTime: value };
  if (field === "pauseEndTime") return { ...slot, pauseEndTime: value };
  return slot;
}

function normalizeIncomePlanningSlotAfterEdit(slot: IncomePlanningSlot): IncomePlanningSlot {
  const normalizedPause = normalizeIncomePlanningSlotPause(slot);
  const start = parseTimeMinutes(normalizedPause.startTime);
  const end = parseTimeMinutes(normalizedPause.endTime);
  if (start !== null && end !== null && end > start) {
    return { ...normalizedPause, durationMinutes: end - start };
  }
  return normalizedPause;
}

function normalizeIncomePlanningSlotPause(slot: IncomePlanningSlot): IncomePlanningSlot {
  const pauseEnabled = Boolean(slot.pauseEnabled);
  if (!slot.pauseStartTime || !slot.pauseEndTime) return { ...slot, pauseEnabled: false, pauseDurationMinutes: 0 };
  const start = parseTimeMinutes(slot.pauseStartTime);
  const end = parseTimeMinutes(slot.pauseEndTime);
  if (start === null || end === null || end <= start) return { ...slot, pauseEnabled, pauseDurationMinutes: 0 };
  return { ...slot, pauseEnabled, pauseDurationMinutes: end - start };
}

function updateIncomePlanningOwnerSlots(
  ownerType: string,
  ownerId: string,
  updater: (slots: IncomePlanningSlot[]) => IncomePlanningSlot[]
): void {
  if (ownerType === "work") {
    host.getState().incomePlanning = {
      ...host.getState().incomePlanning,
      workBlocks: host.getState().incomePlanning.workBlocks.map((block) =>
        block.id === ownerId ? { ...block, slots: updater(block.slots) } : block
      )
    };
  }
  if (ownerType === "habit") {
    host.getState().incomePlanning = {
      ...host.getState().incomePlanning,
      habits: host.getState().incomePlanning.habits.map((habit) =>
        habit.id === ownerId ? { ...habit, slots: updater(habit.slots).map(incomePlanningStripSlotPause) } : habit
      )
    };
  }
  if (ownerType === "manual") {
    host.getState().incomePlanning = {
      ...host.getState().incomePlanning,
      manualBlocks: host.getState().incomePlanning.manualBlocks.map((block) =>
        block.id === ownerId ? { ...block, slots: updater(block.slots) } : block
      )
    };
  }
}

function defaultIncomePlanningSlot(ownerType: string): IncomePlanningSlot {
  const isHabit = ownerType === "habit";
  const isManual = ownerType === "manual";
  return {
    id: createId(),
    day: isManual ? "sunday" : "monday",
    startTime: isHabit ? "21:30" : "18:00",
    endTime: isHabit ? "22:00" : "19:00",
    flexible: isManual,
    durationMinutes: isHabit ? 30 : 60
  };
}

export function startIncomePlanningCalendarDrag(event: PointerEvent): void {
  const target = event.target as HTMLElement | null;
  const plannerStamp = target?.closest<HTMLElement>("[data-income-stamp-planner-stamp]");
  if (plannerStamp && plannerStamp.closest("[data-income-stamp-planner-calendar]")) {
    startIncomeStampPlannerStampDrag(event, plannerStamp);
    return;
  }
  const plannedStamp = target?.closest<HTMLElement>("[data-income-stamp-planner-calendar-stamp]");
  if (plannedStamp) {
    startIncomePlanningPlannedStampCalendarDrag(event, plannedStamp);
    return;
  }
  const stamp = target?.closest<HTMLElement>("[data-income-planning-calendar-stamp]");
  if (stamp) {
    startIncomePlanningStampCalendarDrag(event, stamp);
    return;
  }
  const sleepBlock = target?.closest<HTMLElement>("[data-income-planning-sleep-group-id]");
  if (sleepBlock) {
    startIncomePlanningSleepCalendarDrag(event, sleepBlock);
    return;
  }
  const block = target?.closest<HTMLElement>("[data-income-planning-calendar-block]");
  if (!block) return;
  const ownerType = incomePlanningOwnerTypeFromValue(block.dataset.incomePlanningOwnerType);
  const ownerId = block.dataset.incomePlanningOwnerId || "";
  const slotId = block.dataset.incomePlanningSlotId || "";
  const slotPart = block.dataset.incomePlanningSlotPart === "pause" ? "pause" : "main";
  const slot = incomePlanningSlotById(ownerType, ownerId, slotId);
  const column = block.closest<HTMLElement>("[data-income-planning-calendar-day]");
  const days = document.querySelector<HTMLElement>("#incomePlanningCalendarDays");
  if (!ownerId || !slotId || !slot || !column || !days) return;
  const range =
    slotPart === "pause"
      ? incomePlanningVisualRangeFromTimes(slot.pauseStartTime ?? "", slot.pauseEndTime ?? "", slot.pauseDurationMinutes ?? 30)
      : incomePlanningVisualRangeFromTimes(slot.startTime, slot.endTime, slot.durationMinutes);
  if (range.endMinute <= range.startMinute) return;
  const resizeHandle = target?.closest<HTMLElement>("[data-income-planning-resize]");
  incomePlanningUiState.dragState = {
    ownerType,
    ownerId,
    slotId,
    slotPart,
    mode: resizeHandle?.dataset.incomePlanningResize === "start" ? "resize-start" : resizeHandle?.dataset.incomePlanningResize === "end" ? "resize-end" : "move",
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    originalDay: slot.day,
    originalStartMinute: range.startMinute,
    originalEndMinute: range.endMinute,
    dayWidth: Math.max(1, days.getBoundingClientRect().width / 7),
    columnHeight: Math.max(1, column.getBoundingClientRect().height),
    element: block,
    moved: false
  };
  block.classList.add("dragging");
  block.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function startIncomePlanningStampCalendarDrag(event: PointerEvent, stampElement: HTMLElement): void {
  const stampId = stampElement.dataset.incomePlanningStampId || "";
  const stamp = host.getState().incomePlanning.calendarStamps.find((item) => item.id === stampId);
  const column = stampElement.closest<HTMLElement>("[data-income-planning-calendar-day]");
  const days = document.querySelector<HTMLElement>("#incomePlanningCalendarDays");
  if (!stampId || !stamp || !column || !days) return;
  incomePlanningUiState.stampDragState = {
    stampId,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    originalDay: stamp.day,
    originalStartMinute: parseTimeMinutes(stamp.startTime) ?? 0,
    dayWidth: Math.max(1, days.getBoundingClientRect().width / 7),
    columnHeight: Math.max(1, column.getBoundingClientRect().height),
    element: stampElement,
    moved: false
  };
  stampElement.classList.add("dragging");
  stampElement.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function startIncomePlanningPlannedStampCalendarDrag(event: PointerEvent, stampElement: HTMLElement): void {
  const stampId = stampElement.dataset.incomeStampPlannerStampId || "";
  const stamp = (host.getState().incomePlanning.plannedStamps ?? []).find((item) => item.id === stampId);
  const column = stampElement.closest<HTMLElement>("[data-income-planning-calendar-day]");
  const days = document.querySelector<HTMLElement>("#incomePlanningCalendarDays");
  if (!stampId || !stamp || !incomeStampPlannerDateFromString(stamp.date) || !column || !days) return;
  incomePlanningUiState.plannedStampDragState = {
    stampId,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    originalDate: stamp.date,
    originalStartMinute: parseTimeMinutes(stamp.startTime) ?? 0,
    dayWidth: Math.max(1, days.getBoundingClientRect().width / 7),
    columnHeight: Math.max(1, column.getBoundingClientRect().height),
    element: stampElement,
    moved: false
  };
  stampElement.classList.add("dragging");
  stampElement.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function startIncomeStampPlannerStampDrag(event: PointerEvent, stampElement: HTMLElement): void {
  const stampId = stampElement.dataset.incomeStampPlannerStampId || "";
  const stamp = (host.getState().incomePlanning.plannedStamps ?? []).find((item) => item.id === stampId);
  if (!stampId || !stamp || !incomeStampPlannerDateFromString(stamp.date)) return;
  incomePlanningUiState.stampPlannerStampDragState = {
    stampId,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    element: stampElement,
    moved: false
  };
  stampElement.classList.add("dragging");
  stampElement.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

export function moveIncomePlanningCalendarDrag(event: PointerEvent): void {
  if (incomePlanningUiState.plannedStampDragState && event.pointerId === incomePlanningUiState.plannedStampDragState.pointerId) {
    const next = incomePlanningPlannedStampDragPreview(event);
    incomePlanningUiState.plannedStampDragState.moved =
      incomePlanningUiState.plannedStampDragState.moved ||
      Math.abs(event.clientX - incomePlanningUiState.plannedStampDragState.startClientX) > 3 ||
      Math.abs(event.clientY - incomePlanningUiState.plannedStampDragState.startClientY) > 3;
    const top = (next.startMinute / (24 * 60)) * 100;
    incomePlanningUiState.plannedStampDragState.element.style.setProperty("--top", `${top.toFixed(3)}%`);
    event.preventDefault();
    return;
  }
  if (incomePlanningUiState.stampPlannerStampDragState && event.pointerId === incomePlanningUiState.stampPlannerStampDragState.pointerId) {
    incomePlanningUiState.stampPlannerStampDragState.moved =
      incomePlanningUiState.stampPlannerStampDragState.moved ||
      Math.abs(event.clientX - incomePlanningUiState.stampPlannerStampDragState.startClientX) > 3 ||
      Math.abs(event.clientY - incomePlanningUiState.stampPlannerStampDragState.startClientY) > 3;
    if (incomePlanningUiState.stampPlannerStampDragState.moved) {
      const deltaX = event.clientX - incomePlanningUiState.stampPlannerStampDragState.startClientX;
      const deltaY = event.clientY - incomePlanningUiState.stampPlannerStampDragState.startClientY;
      incomePlanningUiState.stampPlannerStampDragState.element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }
    event.preventDefault();
    return;
  }
  if (incomePlanningUiState.stampDragState && event.pointerId === incomePlanningUiState.stampDragState.pointerId) {
    const next = incomePlanningStampDragPreview(event);
    incomePlanningUiState.stampDragState.moved =
      incomePlanningUiState.stampDragState.moved ||
      Math.abs(event.clientX - incomePlanningUiState.stampDragState.startClientX) > 3 ||
      Math.abs(event.clientY - incomePlanningUiState.stampDragState.startClientY) > 3;
    const top = (next.startMinute / (24 * 60)) * 100;
    incomePlanningUiState.stampDragState.element.style.setProperty("--top", `${top.toFixed(3)}%`);
    event.preventDefault();
    return;
  }
  if (incomePlanningUiState.sleepDragState && event.pointerId === incomePlanningUiState.sleepDragState.pointerId) {
    const next = incomePlanningSleepDragPreview(event);
    incomePlanningUiState.sleepDragState.moved =
      incomePlanningUiState.sleepDragState.moved ||
      Math.abs(event.clientY - incomePlanningUiState.sleepDragState.startClientY) > 3;
    applyIncomePlanningSleepDragPreview(next);
    event.preventDefault();
    return;
  }
  if (!incomePlanningUiState.dragState || event.pointerId !== incomePlanningUiState.dragState.pointerId) return;
  const next = incomePlanningDragPreview(event);
  incomePlanningUiState.dragState.moved =
    incomePlanningUiState.dragState.moved ||
    Math.abs(event.clientX - incomePlanningUiState.dragState.startClientX) > 3 ||
    Math.abs(event.clientY - incomePlanningUiState.dragState.startClientY) > 3;
  const top = (next.startMinute / (24 * 60)) * 100;
  const height = ((next.endMinute - next.startMinute) / (24 * 60)) * 100;
  incomePlanningUiState.dragState.element.style.setProperty("--top", `${top.toFixed(3)}%`);
  incomePlanningUiState.dragState.element.style.setProperty("--height", `${height.toFixed(3)}%`);
  incomePlanningUiState.dragState.element.style.setProperty("--start-minute", String(next.startMinute));
  incomePlanningUiState.dragState.element.style.setProperty("--duration-minutes", String(next.endMinute - next.startMinute));
  event.preventDefault();
}

export function finishIncomePlanningCalendarDrag(event: PointerEvent): void {
  if (incomePlanningUiState.plannedStampDragState && event.pointerId === incomePlanningUiState.plannedStampDragState.pointerId) {
    const dragState = incomePlanningUiState.plannedStampDragState;
    const next = incomePlanningPlannedStampDragPreview(event);
    dragState.element.classList.remove("dragging");
    dragState.element.releasePointerCapture?.(event.pointerId);
    incomePlanningUiState.plannedStampDragState = null;
    if (dragState.moved) {
      updateIncomePlanningPlannedStampAfterCalendarDrag(dragState.stampId, next);
      const savedDate = incomeStampPlannerDateFromString(next.date);
      if (savedDate) {
        incomePlanningUiState.stampPlannerMonthCursor = incomeStampPlannerMonthStart(savedDate);
      }
      host.renderAll();
      host.persistCurrentState();
      incomePlanningUiState.suppressNextCalendarClick = true;
    }
    return;
  }
  if (incomePlanningUiState.stampPlannerStampDragState && event.pointerId === incomePlanningUiState.stampPlannerStampDragState.pointerId) {
    const dragState = incomePlanningUiState.stampPlannerStampDragState;
    const nextDate = incomeStampPlannerDateFromPointer(event.clientX, event.clientY);
    dragState.element.classList.remove("dragging");
    dragState.element.style.transform = "";
    dragState.element.releasePointerCapture?.(event.pointerId);
    incomePlanningUiState.stampPlannerStampDragState = null;
    if (dragState.moved) {
      if (nextDate) {
        updateIncomeStampPlannerStampAfterPlannerDrag(dragState.stampId, nextDate);
        const savedDate = incomeStampPlannerDateFromString(nextDate);
        if (savedDate) {
          incomePlanningUiState.stampPlannerMonthCursor = incomeStampPlannerMonthStart(savedDate);
        }
        host.renderAll();
        host.persistCurrentState();
      }
      incomePlanningUiState.stampPlannerSuppressNextClick = true;
    }
    return;
  }
  if (incomePlanningUiState.stampDragState && event.pointerId === incomePlanningUiState.stampDragState.pointerId) {
    const dragState = incomePlanningUiState.stampDragState;
    const next = incomePlanningStampDragPreview(event);
    dragState.element.classList.remove("dragging");
    dragState.element.releasePointerCapture?.(event.pointerId);
    incomePlanningUiState.stampDragState = null;
    if (dragState.moved) {
      updateIncomePlanningStampAfterCalendarDrag(dragState.stampId, next);
      renderIncomePlanning();
      host.persistCurrentState();
      incomePlanningUiState.suppressNextCalendarClick = true;
    }
    return;
  }
  if (incomePlanningUiState.sleepDragState && event.pointerId === incomePlanningUiState.sleepDragState.pointerId) {
    const dragState = incomePlanningUiState.sleepDragState;
    const next = incomePlanningSleepDragPreview(event);
    dragState.elements.forEach((element) => {
      element.classList.remove("dragging");
      element.releasePointerCapture?.(event.pointerId);
    });
    incomePlanningUiState.sleepDragState = null;
    if (dragState.moved) {
      updateIncomePlanningSleepGroupTime(dragState.groupId, next.startMinute, next.endMinute);
      renderIncomePlanning();
      host.persistCurrentState();
      incomePlanningUiState.suppressNextCalendarClick = true;
    }
    return;
  }
  if (!incomePlanningUiState.dragState || event.pointerId !== incomePlanningUiState.dragState.pointerId) return;
  const dragState = incomePlanningUiState.dragState;
  const next = incomePlanningDragPreview(event);
  dragState.element.classList.remove("dragging");
  dragState.element.releasePointerCapture?.(event.pointerId);
  incomePlanningUiState.dragState = null;
  if (dragState.moved) {
    if (dragState.slotPart === "pause") {
      updateIncomePlanningPauseAfterCalendarDrag(dragState, next);
    } else {
      updateIncomePlanningMainSlotAfterCalendarDrag(dragState, next);
    }
    renderIncomePlanning();
    host.persistCurrentState();
    incomePlanningUiState.suppressNextCalendarClick = true;
  }
}

function incomePlanningStampDragPreview(event: PointerEvent): { day: IncomePlanningWeekday; startMinute: number } {
  if (!incomePlanningUiState.stampDragState) return { day: "monday", startMinute: 0 };
  const verticalDelta = snapIncomePlanningMinute(
    ((event.clientY - incomePlanningUiState.stampDragState.startClientY) / incomePlanningUiState.stampDragState.columnHeight) * 24 * 60
  );
  const dayDelta = Math.round(
    (event.clientX - incomePlanningUiState.stampDragState.startClientX) / incomePlanningUiState.stampDragState.dayWidth
  );
  return {
    day: incomePlanningWeekdayByIndex(incomePlanningWeekdayIndex(incomePlanningUiState.stampDragState.originalDay) + dayDelta),
    startMinute: clamp(
      snapIncomePlanningMinute(incomePlanningUiState.stampDragState.originalStartMinute + verticalDelta),
      0,
      23 * 60 + 45
    )
  };
}

function incomePlanningPlannedStampDragPreview(event: PointerEvent): { date: string; startMinute: number } {
  if (!incomePlanningUiState.plannedStampDragState) return { date: incomeStampPlannerTodayDateString(), startMinute: 0 };
  const originalDate =
    incomeStampPlannerDateFromString(incomePlanningUiState.plannedStampDragState.originalDate) ??
    incomeStampPlannerStartOfDay(new Date());
  const verticalDelta = snapIncomePlanningMinute(
    ((event.clientY - incomePlanningUiState.plannedStampDragState.startClientY) /
      incomePlanningUiState.plannedStampDragState.columnHeight) *
      24 *
      60
  );
  const dayDelta = Math.round(
    (event.clientX - incomePlanningUiState.plannedStampDragState.startClientX) /
      incomePlanningUiState.plannedStampDragState.dayWidth
  );
  const weekRange = incomeStampPlannerCurrentWeekRange();
  const nextDate = incomeStampPlannerClampDate(
    incomeStampPlannerAddDays(originalDate, dayDelta),
    weekRange.start,
    weekRange.end
  );
  return {
    date: incomeStampPlannerDateString(nextDate),
    startMinute: clamp(
      snapIncomePlanningMinute(incomePlanningUiState.plannedStampDragState.originalStartMinute + verticalDelta),
      0,
      23 * 60 + 45
    )
  };
}

function updateIncomePlanningStampAfterCalendarDrag(
  stampId: string,
  next: { day: IncomePlanningWeekday; startMinute: number }
): void {
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    calendarStamps: host.getState().incomePlanning.calendarStamps.map((stamp) =>
      stamp.id === stampId ? { ...stamp, day: next.day, startTime: formatIncomePlanningTime(next.startMinute) } : stamp
    )
  };
}

function updateIncomePlanningPlannedStampAfterCalendarDrag(
  stampId: string,
  next: { date: string; startMinute: number }
): void {
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    plannedStamps: (host.getState().incomePlanning.plannedStamps ?? []).map((stamp) =>
      stamp.id === stampId ? { ...stamp, date: next.date, startTime: formatIncomePlanningTime(next.startMinute) } : stamp
    )
  };
}

function updateIncomeStampPlannerStampAfterPlannerDrag(stampId: string, date: string): void {
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    plannedStamps: (host.getState().incomePlanning.plannedStamps ?? []).map((stamp) =>
      stamp.id === stampId ? { ...stamp, date } : stamp
    )
  };
}

function incomeStampPlannerDateFromPointer(clientX: number, clientY: number): string | null {
  const target = document.elementFromPoint(clientX, clientY);
  const day = target?.closest<HTMLElement>("[data-income-stamp-planner-date]");
  const date = day?.dataset.incomeStampPlannerDate || "";
  return incomeStampPlannerDateFromString(date) ? date : null;
}

function incomeStampPlannerClampDate(date: Date, min: Date, max: Date): Date {
  if (date.getTime() < min.getTime()) return incomeStampPlannerStartOfDay(min);
  if (date.getTime() > max.getTime()) return incomeStampPlannerStartOfDay(max);
  return incomeStampPlannerStartOfDay(date);
}

function updateIncomePlanningPauseAfterCalendarDrag(
  dragState: NonNullable<IncomePlanningDragState>,
  next: { day: IncomePlanningWeekday; startMinute: number; endMinute: number }
): void {
  updateIncomePlanningOwnerSlots(dragState.ownerType, dragState.ownerId, (slots) =>
    slots.map((slot) => {
      if (slot.id !== dragState.slotId) return slot;
      const clamped = incomePlanningClampedPauseRange(slot, next.startMinute, next.endMinute);
      return normalizeIncomePlanningSlotAfterEdit({
        ...slot,
        pauseEnabled: true,
        pauseStartTime: formatIncomePlanningTime(clamped.startMinute),
        pauseEndTime: formatIncomePlanningTime(clamped.endMinute),
        pauseDurationMinutes: clamped.endMinute - clamped.startMinute
      });
    })
  );
}

function updateIncomePlanningMainSlotAfterCalendarDrag(
  dragState: NonNullable<IncomePlanningDragState>,
  next: { day: IncomePlanningWeekday; startMinute: number; endMinute: number }
): void {
  updateIncomePlanningOwnerSlots(dragState.ownerType, dragState.ownerId, (slots) =>
    slots.map((slot) => {
      if (slot.id !== dragState.slotId) return slot;
      const updated: IncomePlanningSlot = {
        ...slot,
        day: next.day,
        startTime: formatIncomePlanningTime(next.startMinute),
        endTime: formatIncomePlanningTime(next.endMinute),
        durationMinutes: next.endMinute - next.startMinute
      };
      return normalizeIncomePlanningSlotAfterEdit(incomePlanningSlotWithClampedPause(updated, dragState, next));
    })
  );
}

function incomePlanningClampedPauseRange(
  slot: IncomePlanningSlot,
  pauseStartMinute: number,
  pauseEndMinute: number
): { startMinute: number; endMinute: number } {
  const slotStart = parseTimeMinutes(slot.startTime);
  const slotEnd = parseTimeMinutes(slot.endTime);
  if (slotStart === null || slotEnd === null || slotEnd <= slotStart) {
    return { startMinute: pauseStartMinute, endMinute: pauseEndMinute };
  }
  const duration = Math.min(Math.max(15, pauseEndMinute - pauseStartMinute), slotEnd - slotStart);
  const startMinute = clamp(pauseStartMinute, slotStart, Math.max(slotStart, slotEnd - duration));
  return { startMinute, endMinute: startMinute + duration };
}

function incomePlanningSlotWithClampedPause(
  slot: IncomePlanningSlot,
  dragState: NonNullable<IncomePlanningDragState>,
  next: { startMinute: number; endMinute: number }
): IncomePlanningSlot {
  if (!slot.pauseEnabled || !slot.pauseStartTime || !slot.pauseEndTime) return slot;
  const pauseStart = parseTimeMinutes(slot.pauseStartTime);
  const pauseEnd = parseTimeMinutes(slot.pauseEndTime);
  if (pauseStart === null || pauseEnd === null || pauseEnd <= pauseStart) return slot;
  const pauseDuration = Math.min(pauseEnd - pauseStart, Math.max(0, next.endMinute - next.startMinute));
  const shiftedPauseStart = dragState.mode === "move" ? pauseStart + (next.startMinute - dragState.originalStartMinute) : pauseStart;
  const clampedPauseStart = clamp(
    snapIncomePlanningMinute(shiftedPauseStart),
    next.startMinute,
    Math.max(next.startMinute, next.endMinute - pauseDuration)
  );
  return {
    ...slot,
    pauseStartTime: formatIncomePlanningTime(clampedPauseStart),
    pauseEndTime: formatIncomePlanningTime(clampedPauseStart + pauseDuration),
    pauseDurationMinutes: pauseDuration
  };
}

function incomePlanningDragPreview(event: PointerEvent): {
  day: IncomePlanningWeekday;
  startMinute: number;
  endMinute: number;
} {
  if (!incomePlanningUiState.dragState) {
    return { day: "monday", startMinute: 0, endMinute: 15 };
  }
  const verticalDelta = snapIncomePlanningMinute(
    ((event.clientY - incomePlanningUiState.dragState.startClientY) / incomePlanningUiState.dragState.columnHeight) * 24 * 60
  );
  const dayDelta = Math.round((event.clientX - incomePlanningUiState.dragState.startClientX) / incomePlanningUiState.dragState.dayWidth);
  const duration = incomePlanningUiState.dragState.originalEndMinute - incomePlanningUiState.dragState.originalStartMinute;
  if (incomePlanningUiState.dragState.mode === "resize-start") {
    const startMinute = clamp(
      snapIncomePlanningMinute(incomePlanningUiState.dragState.originalStartMinute + verticalDelta),
      0,
      incomePlanningUiState.dragState.originalEndMinute - 15
    );
    return { day: incomePlanningUiState.dragState.originalDay, startMinute, endMinute: incomePlanningUiState.dragState.originalEndMinute };
  }
  if (incomePlanningUiState.dragState.mode === "resize-end") {
    const maxEndMinute = 23 * 60 + 45;
    const endMinute = clamp(
      snapIncomePlanningMinute(incomePlanningUiState.dragState.originalEndMinute + verticalDelta),
      incomePlanningUiState.dragState.originalStartMinute + 15,
      maxEndMinute
    );
    return { day: incomePlanningUiState.dragState.originalDay, startMinute: incomePlanningUiState.dragState.originalStartMinute, endMinute };
  }
  const maxEndMinute = 23 * 60 + 45;
  const startMinute = clamp(
    snapIncomePlanningMinute(incomePlanningUiState.dragState.originalStartMinute + verticalDelta),
    0,
    Math.max(0, maxEndMinute - duration)
  );
  const day = incomePlanningWeekdayByIndex(incomePlanningWeekdayIndex(incomePlanningUiState.dragState.originalDay) + dayDelta);
  return { day, startMinute, endMinute: startMinute + duration };
}

function startIncomePlanningSleepCalendarDrag(event: PointerEvent, block: HTMLElement): void {
  const groupId = block.dataset.incomePlanningSleepGroupId || "";
  const group = incomePlanningSleepSlotGroupsFromSlots(host.getState().incomePlanning.assumptions.sleepSlots).find((item) => item.id === groupId);
  const column = block.closest<HTMLElement>("[data-income-planning-calendar-day]");
  if (!groupId || !group || !column) return;
  const startMinute = parseTimeMinutes(group.startTime);
  const endMinute = parseTimeMinutes(group.endTime);
  if (startMinute === null || endMinute === null) return;
  const durationMinutes = incomePlanningSleepClockDurationMinutes(startMinute, endMinute, group.durationMinutes);
  const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-income-planning-sleep-group-id]")).filter(
    (element) => element.dataset.incomePlanningSleepGroupId === groupId
  );
  incomePlanningUiState.sleepDragState = {
    groupId,
    group,
    pointerId: event.pointerId,
    startClientY: event.clientY,
    originalStartMinute: startMinute,
    durationMinutes,
    overnight: endMinute <= startMinute,
    columnHeight: Math.max(1, column.getBoundingClientRect().height),
    elements,
    moved: false
  };
  elements.forEach((element) => element.classList.add("dragging"));
  block.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function incomePlanningSleepDragPreview(event: PointerEvent): { startMinute: number; endMinute: number } {
  if (!incomePlanningUiState.sleepDragState) return { startMinute: 21 * 60, endMinute: 5 * 60 + 30 };
  const verticalDelta = snapIncomePlanningMinute(
    ((event.clientY - incomePlanningUiState.sleepDragState.startClientY) / incomePlanningUiState.sleepDragState.columnHeight) * 24 * 60
  );
  const duration = clamp(incomePlanningUiState.sleepDragState.durationMinutes, 15, 23 * 60 + 45);
  const minStart = incomePlanningUiState.sleepDragState.overnight ? Math.max(0, 24 * 60 - duration + 15) : 0;
  const maxStart = incomePlanningUiState.sleepDragState.overnight ? 23 * 60 + 45 : Math.max(0, 24 * 60 - duration);
  const startMinute = clamp(
    snapIncomePlanningMinute(incomePlanningUiState.sleepDragState.originalStartMinute + verticalDelta),
    minStart,
    maxStart
  );
  return {
    startMinute,
    endMinute: (startMinute + duration) % (24 * 60)
  };
}

function applyIncomePlanningSleepDragPreview(next: { startMinute: number; endMinute: number }): void {
  if (!incomePlanningUiState.sleepDragState) return;
  const previewGroup = normalizeIncomePlanningDialogSleepSlotGroup({
    ...incomePlanningUiState.sleepDragState.group,
    startTime: formatIncomePlanningTime(next.startMinute),
    endTime: formatIncomePlanningTime(next.endMinute)
  });
  const entries = new Map(incomePlanningSleepBackgroundEntries(previewGroup).map((entry) => [entry.id, entry]));
  incomePlanningUiState.sleepDragState.elements.forEach((element) => {
    const entry = entries.get(element.dataset.incomePlanningBackgroundEntryId || "");
    if (!entry) return;
    const start = clamp(entry.startMinute, 0, 24 * 60);
    const end = clamp(entry.endMinute, start + 15, 24 * 60);
    const top = (start / (24 * 60)) * 100;
    const height = ((end - start) / (24 * 60)) * 100;
    element.style.setProperty("--top", `${top.toFixed(3)}%`);
    element.style.setProperty("--height", `${height.toFixed(3)}%`);
  });
}

function updateIncomePlanningSleepGroupTime(groupId: string, startMinute: number, endMinute: number): void {
  const groups = incomePlanningSleepSlotGroupsFromSlots(host.getState().incomePlanning.assumptions.sleepSlots).map((group) =>
    group.id === groupId
      ? normalizeIncomePlanningDialogSleepSlotGroup({
          ...group,
          startTime: formatIncomePlanningTime(startMinute),
          endTime: formatIncomePlanningTime(endMinute)
        })
      : group
  );
  const sleepSlots = incomePlanningSleepSlotsFromDialogGroups(groups);
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    assumptions: {
      ...host.getState().incomePlanning.assumptions,
      sleepHoursPerDay: clamp(incomePlanningAverageSleepHours({ sleepHoursPerDay: host.getState().incomePlanning.assumptions.sleepHoursPerDay, sleepSlots }), 0, 24),
      sleepSlots
    }
  };
}

function incomePlanningSleepClockDurationMinutes(startMinute: number, endMinute: number, fallbackDurationMinutes: number): number {
  if (endMinute > startMinute) return endMinute - startMinute;
  if (endMinute < startMinute) return 24 * 60 - startMinute + endMinute;
  return clamp(Math.round(fallbackDurationMinutes), 15, 23 * 60 + 45);
}

function incomePlanningSlotById(
  ownerType: Exclude<IncomePlanningOwnerType, "assumption">,
  ownerId: string,
  slotId: string
): IncomePlanningSlot | null {
  const owner =
    ownerType === "work"
      ? host.getState().incomePlanning.workBlocks.find((block) => block.id === ownerId)
      : ownerType === "habit"
        ? host.getState().incomePlanning.habits.find((habit) => habit.id === ownerId)
        : host.getState().incomePlanning.manualBlocks.find((block) => block.id === ownerId);
  return owner?.slots.find((slot) => slot.id === slotId) ?? null;
}

function isIncomePlanningCategory(value: unknown): value is IncomePlanningCategory {
  return INCOME_PLANNING_CATEGORY_CONFIGS.some((config) => config.id === value);
}

function isIncomePlanningWeekday(value: unknown): value is IncomePlanningWeekday {
  return INCOME_PLANNING_WEEK_DAYS.includes(value as IncomePlanningWeekday);
}

function isIncomePlanningHabitType(value: unknown): value is IncomePlanningHabit["type"] {
  return value === "good" || value === "bad";
}

function isIncomePlanningHabitDurationUnit(value: unknown): value is IncomePlanningHabit["durationUnit"] {
  return value === "day" || value === "week";
}

function isIncomePlanningHabitChange(value: unknown): value is IncomePlanningHabit["goalChange"] {
  return value === "keep" || value === "reduce" || value === "replace" || value === "build";
}

function isIncomePlanningHabitStatus(value: unknown): value is IncomePlanningHabit["status"] {
  return value === "planned" || value === "active" || value === "difficult" || value === "stable";
}

function isIncomePlanningPriority(value: unknown): value is IncomePlanningHabit["priority"] {
  return value === "low" || value === "medium" || value === "high";
}

function isIncomePlanningManualBlockType(value: unknown): value is IncomePlanningManualBlockType {
  return value === "private_commitment" || value === "free_time" || value === "buffer" || value === "other_event";
}


export function showIncomePlanningHabitIconPicker(button: HTMLButtonElement): void {
  if (!incomePlanningUiState.dialog || (incomePlanningUiState.dialog.ownerType !== "habit" && incomePlanningUiState.dialog.ownerType !== "manual")) return;
  const rect = button.getBoundingClientRect();
  const panelWidth = 320;
  const panelHeight = 360;
  const left =
    rect.right + 12 + panelWidth <= window.innerWidth
      ? rect.right + 12
      : Math.max(12, rect.left - panelWidth - 12);
  const top = Math.max(12, Math.min(rect.top, window.innerHeight - panelHeight - 12));
  incomePlanningUiState.habitIconPicker = { top, left };
  renderIncomePlanningHabitIconPicker();
}

export function hideIncomePlanningHabitIconPicker(): void {
  incomePlanningUiState.habitIconPicker = null;
  renderIncomePlanningHabitIconPicker();
}

export function selectIncomePlanningHabitIcon(icon: string): void {
  if (!incomePlanningUiState.dialog || (incomePlanningUiState.dialog.ownerType !== "habit" && incomePlanningUiState.dialog.ownerType !== "manual")) return;
  const fallback =
    incomePlanningUiState.dialog.ownerType === "manual"
      ? incomePlanningDefaultManualIcon(incomePlanningUiState.dialog.manualType)
      : incomePlanningUiState.dialog.habitType === "bad"
        ? "snack"
        : "book";
  const normalizedIcon = normalizePositionIcon(icon, fallback);
  incomePlanningUiState.dialog = {
    ...incomePlanningUiState.dialog,
    habitIcon: incomePlanningUiState.dialog.ownerType === "habit" ? normalizedIcon : incomePlanningUiState.dialog.habitIcon,
    manualIcon: incomePlanningUiState.dialog.ownerType === "manual" ? normalizedIcon : incomePlanningUiState.dialog.manualIcon,
    error: ""
  };
  incomePlanningUiState.habitIconPicker = null;
  renderIncomePlanningDialog();
  renderIncomePlanningHabitIconPicker();
}

export function renderIncomePlanningHabitIconPicker(): void {
  const picker = document.querySelector<HTMLDivElement>("#incomePlanningUiState.habitIconPicker");
  if (!picker) return;
  if (
    !incomePlanningUiState.habitIconPicker ||
    !incomePlanningUiState.dialog ||
    (incomePlanningUiState.dialog.ownerType !== "habit" && incomePlanningUiState.dialog.ownerType !== "manual")
  ) {
    picker.hidden = true;
    return;
  }

  const fallback =
    incomePlanningUiState.dialog.ownerType === "manual"
      ? incomePlanningDefaultManualIcon(incomePlanningUiState.dialog.manualType)
      : incomePlanningUiState.dialog.habitType === "bad"
        ? "snack"
        : "book";
  const currentIcon = normalizePositionIcon(
    incomePlanningUiState.dialog.ownerType === "manual" ? incomePlanningUiState.dialog.manualIcon : incomePlanningUiState.dialog.habitIcon,
    fallback
  );
  const title = incomePlanningUiState.dialog.ownerType === "manual" ? "Zeitblock-Icon" : "Habit-Icon";
  picker.style.top = `${incomePlanningUiState.habitIconPicker.top}px`;
  picker.style.left = `${incomePlanningUiState.habitIconPicker.left}px`;
  picker.innerHTML = `
    <div class="position-icon-picker-head">
      <span>${escapeHtml(title)}</span>
      <button class="icon-button" type="button" data-action="close-income-planning-icon-picker" aria-label="Iconauswahl schliessen">x</button>
    </div>
    <div class="position-icon-picker-grid">
      ${POSITION_ICONS.map((icon) => {
        const active = icon.id === currentIcon;
        return `
          <button
            class="position-icon-option ${active ? "active" : ""}"
            type="button"
            data-action="select-income-planning-icon"
            data-income-planning-icon="${icon.id}"
            aria-pressed="${active}"
            title="${escapeHtml(icon.label)}"
          >
            ${positionIconSvg(icon.id)}
            <span>${escapeHtml(icon.label)}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
  picker.hidden = false;
}

export function hideIncomePlanningStampPicker(): void {
  incomePlanningUiState.stampPicker = null;
  renderIncomePlanningStampPicker();
}

export function hideIncomePlanningStampMenu(): void {
  incomePlanningUiState.stampMenu = null;
  renderIncomePlanningStampMenu();
}

export function updateIncomePlanningStampPickerDraft(field: string, value: string): void {
  if (!incomePlanningUiState.stampPicker) return;
  if (field === "label") {
    incomePlanningUiState.stampPicker = { ...incomePlanningUiState.stampPicker, label: value };
    return;
  }
  if (field === "startTime") {
    incomePlanningUiState.stampPicker = { ...incomePlanningUiState.stampPicker, startTime: value };
    return;
  }
  if (field === "day" && isIncomePlanningWeekday(value)) {
    incomePlanningUiState.stampPicker = { ...incomePlanningUiState.stampPicker, day: value };
  }
}

export function selectIncomePlanningStampIcon(icon: string): void {
  if (!incomePlanningUiState.stampPicker) return;
  incomePlanningUiState.stampPicker = { ...incomePlanningUiState.stampPicker, icon: normalizePositionIcon(icon, "calendar") };
  renderIncomePlanningStampPicker();
}

export function selectIncomePlanningStampPreset(label: string, icon: string): void {
  if (!incomePlanningUiState.stampPicker) return;
  const preset = INCOME_PLANNING_STAMP_PRESETS.find((item) => item.label === label) ?? {
    label: label.trim() || "Stempel",
    icon
  };
  incomePlanningUiState.stampPicker = {
    ...incomePlanningUiState.stampPicker,
    label: preset.label,
    icon: normalizePositionIcon(preset.icon, "calendar")
  };
  renderIncomePlanningStampPicker();
}

export function updateIncomePlanningStampScenarioSelection(scenarioId: string, checked: boolean): void {
  if (!incomePlanningUiState.stampPicker || !incomePlanningKnownScenarioIds().includes(scenarioId)) return;
  const selected = new Set(incomePlanningUiState.stampPicker.scenarioIds);
  if (checked) selected.add(scenarioId);
  else selected.delete(scenarioId);
  incomePlanningUiState.stampPicker = { ...incomePlanningUiState.stampPicker, scenarioIds: Array.from(selected) };
  renderIncomePlanningStampPicker();
}

export function saveIncomePlanningStampPicker(): void {
  if (!incomePlanningUiState.stampPicker) return;
  if (!incomePlanningUiState.stampPicker.scenarioIds.length) return;
  const label = incomePlanningUiState.stampPicker.label.trim() || "Stempel";
  const startTime = formatIncomePlanningTime(parseTimeMinutes(incomePlanningUiState.stampPicker.startTime) ?? 9 * 60);
  const stamp: IncomePlanningCalendarStamp = {
    id: incomePlanningUiState.stampPicker.stampId ?? createId(),
    day: incomePlanningUiState.stampPicker.day,
    startTime,
    icon: normalizePositionIcon(incomePlanningUiState.stampPicker.icon, "calendar"),
    label,
    scenarioIds: incomePlanningStoredScenarioIds(incomePlanningUiState.stampPicker.scenarioIds)
  };
  const exists = host.getState().incomePlanning.calendarStamps.some((item) => item.id === stamp.id);
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    calendarStamps: exists
      ? host.getState().incomePlanning.calendarStamps.map((item) => (item.id === stamp.id ? stamp : item))
      : [...host.getState().incomePlanning.calendarStamps, stamp]
  };
  incomePlanningUiState.stampPicker = null;
  renderIncomePlanning();
  host.persistCurrentState();
}

export function deleteIncomePlanningStamp(stampId: string): void {
  if (!stampId) return;
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    calendarStamps: host.getState().incomePlanning.calendarStamps.filter((stamp) => stamp.id !== stampId)
  };
  incomePlanningUiState.stampPicker = null;
  incomePlanningUiState.stampMenu = null;
  renderIncomePlanning();
  host.persistCurrentState();
}

export function renderIncomePlanningStampPicker(): void {
  const picker = document.querySelector<HTMLDivElement>("#incomePlanningUiState.stampPicker");
  if (!picker) return;
  if (!incomePlanningUiState.stampPicker) {
    picker.hidden = true;
    return;
  }
  const draft = incomePlanningUiState.stampPicker;
  const currentIcon = normalizePositionIcon(draft.icon, "calendar");
  picker.style.top = `${draft.top}px`;
  picker.style.left = `${draft.left}px`;
  picker.innerHTML = `
    <div class="position-icon-picker-head">
      <span>${draft.stampId ? "Stempel bearbeiten" : "Stempel setzen"}</span>
      ${incomePlanningStampPickerHeaderActions(draft)}
    </div>
    <div class="income-planning-stamp-form">
      <label class="field">
        <span>Label</span>
        <input type="text" value="${escapeHtml(draft.label)}" data-income-planning-stamp-field="label" />
      </label>
      <div class="income-planning-stamp-time-grid">
        ${incomePlanningStampSelectField("day", "Tag", incomePlanningWeekdayOptionItems(), draft.day)}
        <label class="field compact">
          <span>Zeit</span>
          <input type="time" value="${escapeHtml(draft.startTime)}" data-income-planning-stamp-field="startTime" />
        </label>
      </div>
    </div>
    <div class="income-planning-stamp-presets" aria-label="Stempel-Labels">
      ${INCOME_PLANNING_STAMP_PRESETS.map((preset) => {
        const active = draft.label === preset.label && currentIcon === normalizePositionIcon(preset.icon, "calendar");
        return `
          <button
            class="income-planning-stamp-preset ${active ? "active" : ""}"
            type="button"
            data-action="select-income-planning-stamp-preset"
            data-income-planning-stamp-label="${escapeHtml(preset.label)}"
            data-income-planning-stamp-icon="${escapeHtml(preset.icon)}"
            aria-pressed="${active}"
          >
            ${positionIconSvg(preset.icon, "position-icon-svg income-planning-type-icon")}
            <span>${escapeHtml(preset.label)}</span>
          </button>
        `;
      }).join("")}
    </div>
    <div class="position-icon-picker-grid compact">
      ${POSITION_ICONS.map((icon) => {
        const active = icon.id === currentIcon;
        return `
          <button
            class="position-icon-option ${active ? "active" : ""}"
            type="button"
            data-action="select-income-planning-stamp-icon"
            data-income-planning-stamp-icon="${icon.id}"
            aria-pressed="${active}"
            title="${escapeHtml(icon.label)}"
          >
            ${positionIconSvg(icon.id)}
            <span>${escapeHtml(icon.label)}</span>
          </button>
        `;
      }).join("")}
    </div>
    ${incomePlanningScenarioCheckboxGroup({
      selectedIds: draft.scenarioIds,
      dataAttribute: "data-income-planning-stamp-scenario-id"
    })}
    <div class="button-row income-planning-stamp-actions">
      <button class="button secondary" type="button" data-action="income-planning-close-stamp-picker">Abbrechen</button>
      <button class="button" type="button" data-action="income-planning-save-stamp">Speichern</button>
    </div>
  `;
  picker.hidden = false;
}

function incomePlanningStampPickerHeaderActions(draft: NonNullable<typeof incomePlanningUiState.stampPicker>): string {
  const deleteButton = draft.stampId
    ? `
      <button
        class="income-planning-header-icon-button danger"
        type="button"
        data-action="income-planning-delete-stamp"
        data-income-planning-stamp-id="${escapeHtml(draft.stampId)}"
        aria-label="Stempel loeschen"
        title="Loeschen"
      >
        ${incomePlanningHeaderIcon("trash")}
      </button>
    `
    : "";
  return `
    <div class="income-planning-header-actions">
      <button class="income-planning-header-icon-button" type="button" data-action="income-planning-close-stamp-picker" aria-label="Stempel-Picker schliessen" title="Schliessen">x</button>
      <button class="income-planning-header-icon-button" type="button" data-action="income-planning-save-stamp" aria-label="Stempel speichern" title="Speichern">
        ${incomePlanningHeaderIcon("save")}
      </button>
      ${deleteButton}
    </div>
  `;
}

function incomePlanningHeaderIcon(icon: "save" | "trash" | "chevron-left" | "chevron-right"): string {
  const paths: Record<"save" | "trash" | "chevron-left" | "chevron-right", string> = {
    save: '<path d="M5 4h12l2 2v14H5V4Z"/><path d="M8 4v6h8V4"/><path d="M8 17h8"/>',
    trash: '<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
    "chevron-left": '<path d="m15 18-6-6 6-6"/>',
    "chevron-right": '<path d="m9 18 6-6-6-6"/>'
  };
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      ${paths[icon]}
    </svg>
  `;
}

function incomePlanningStampSelectField(
  field: string,
  label: string,
  options: Array<{ value: string; label: string }>,
  selected: string
): string {
  return `
    <label class="field compact">
      <span>${escapeHtml(label)}</span>
      <select data-income-planning-stamp-field="${escapeHtml(field)}">
        ${options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === selected ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
      </select>
    </label>
  `;
}

export function renderIncomePlanningStampMenu(): void {
  const menu = document.querySelector<HTMLDivElement>("#incomePlanningUiState.stampMenu");
  if (!menu) return;
  if (!incomePlanningUiState.stampMenu) {
    menu.hidden = true;
    return;
  }
  const stamp = host.getState().incomePlanning.calendarStamps.find((item) => item.id === incomePlanningUiState.stampMenu?.stampId);
  if (!stamp) {
    menu.hidden = true;
    return;
  }
  menu.style.top = `${incomePlanningUiState.stampMenu.top}px`;
  menu.style.left = `${incomePlanningUiState.stampMenu.left}px`;
  menu.innerHTML = `
    <div class="position-icon-picker-head">
      <span>${escapeHtml(stamp.label)}</span>
      <button class="icon-button" type="button" data-action="income-planning-close-stamp-menu" aria-label="Stempel-Menue schliessen">x</button>
    </div>
    <div class="income-planning-stamp-menu-actions">
      <button class="button secondary" type="button" data-action="income-planning-edit-stamp" data-income-planning-stamp-id="${escapeHtml(stamp.id)}">Bearbeiten</button>
      <button class="button danger" type="button" data-action="income-planning-delete-stamp" data-income-planning-stamp-id="${escapeHtml(stamp.id)}">Loeschen</button>
    </div>
  `;
  menu.hidden = false;
}

