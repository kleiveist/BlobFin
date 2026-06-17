import { createId } from "../../data/defaults";
import { INCOME_PLANNING_WEEK_DAYS, parseTimeMinutes } from "../../domain/incomePlanning";
import { escapeHtml, intNumber } from "../../lib/format";
import { normalizePositionIcon, POSITION_ICONS, positionIconSvg } from "../../lib/positionIcons";
import type { IncomePlanningPlannedStamp, IncomePlanningWeekday } from "../../types";
import { INCOME_PLANNING_STAMP_PRESETS } from "./config";
import { incomePlanningHostRef as host, requireIncomePlanningHost } from "./host";
import { formatIncomePlanningTime, incomePlanningHeaderIcon, incomePlanningWeekdayLabel } from "./shared";
import { incomePlanningUiState, type IncomeStampPlannerDateRange } from "./uiState";
import {
  incomePlanningDefaultScenarioIdsForNewEntry,
  incomePlanningEntryIsActiveInCurrentScenario,
  incomePlanningKnownScenarioIds,
  incomePlanningScenarioCheckboxGroup,
  incomePlanningScenarioIdsForDialog,
  incomePlanningStoredScenarioIds,
  incomePlanningWeekdayForDate,
  incomeStampPlannerAddDays,
  incomeStampPlannerCurrentWeekRange,
  incomeStampPlannerDateFromString,
  incomeStampPlannerDateString,
  incomeStampPlannerFullDateLabel,
  incomeStampPlannerMonthLabel,
  incomeStampPlannerMonthStart,
  incomeStampPlannerMonthTitle,
  incomeStampPlannerRangeLabel,
  incomeStampPlannerSameMonth,
  incomeStampPlannerShortDate,
  incomeStampPlannerTodayDateString,
  incomeStampPlannerWeekStart
} from "./weekScenarioController";

export function renderIncomeStampPlanner(): void {
  requireIncomePlanningHost();
  renderIncomeStampPlannerContent();
}

export function renderIncomeStampPlannerContent(): void {
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

export function incomePlanningPlannedStampsForCurrentWeek(day: IncomePlanningWeekday): IncomePlanningPlannedStamp[] {
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
    const date = incomeStampPlannerDateFromString(stamp.date);
    incomePlanningUiState.planningPopup = {
      view: "stamp",
      year: date?.getFullYear() ?? new Date().getFullYear()
    };
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
