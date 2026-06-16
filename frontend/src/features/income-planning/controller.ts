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
  incomePlanningAverageSleepHours,
  incomePlanningStripSlotPause,
  parseTimeMinutes,
  type IncomePlanningModel,
} from "../../domain/incomePlanning";
import { clamp, escapeHtml, numberValue } from "../../lib/format";
import { normalizePositionIcon, POSITION_ICONS, positionIconSvg } from "../../lib/positionIcons";
import type { IncomePlanningAssumptions, IncomePlanningCategory, IncomePlanningHabit, IncomePlanningManualBlock, IncomePlanningManualBlockType, IncomePlanningSlot, IncomePlanningWeekday, IncomePlanningWorkBlock } from "../../types";
import { INCOME_PLANNING_COLOR_OPTIONS } from "./config";
import { incomePlanningHostRef as host, requireIncomePlanningHost } from "./host";
import { incomePlanningSlotById } from "./calendarDragController";
import {
  renderIncomePlanningAssumptions,
  renderIncomePlanningCalendarStamps,
  renderIncomePlanningCareerLife,
  renderIncomePlanningHabits,
  renderIncomePlanningManualBlocks,
  renderIncomePlanningSources,
  renderIncomePlanningSummary
} from "./renderController";
import {
  incomePlanningSleepSlotGroupsFromSlots,
  incomePlanningSleepSlotsFromDialogGroups,
  normalizeIncomePlanningDialogSleepSlotGroup
} from "./sleepSlotController";
import {
  renderIncomePlanningStampMenu,
  renderIncomePlanningStampPicker,
  updateIncomePlanningStampScenarioSelection
} from "./stampPopupController";
import {
  formatIncomePlanningTime,
  hexToRgba,
  incomePlanningCategoryOptions,
  incomePlanningHabitChangeOptions,
  incomePlanningHabitDurationUnitOptions,
  incomePlanningHabitStatusOptions,
  incomePlanningHabitTypeOptions,
  incomePlanningHeaderIcon,
  incomePlanningManualBlockTypeLabel,
  incomePlanningManualBlockTypeOptions,
  incomePlanningPriorityOptions,
  incomePlanningVisualRangeFromTimes,
  incomePlanningWeekdayFromValue,
  incomePlanningWeekdayOptionItems,
  normalizeIncomePlanningColor,
  snapIncomePlanningMinute
} from "./shared";
import { updateIncomeStampPlannerScenarioSelection } from "./stampPlannerController";
import {
  incomePlanningUiState,
  type IncomePlanningDialogMode,
  type IncomePlanningDialogState,
  type IncomePlanningOwnerType,
  type IncomePlanningSleepSlotGroup
} from "./uiState";
import {
  incomePlanningActiveWeekScenarioId,
  incomePlanningDefaultScenarioIdsForNewEntry,
  incomePlanningDefaultScenarioIdsForNewSlot,
  incomePlanningIsCurrentWeek,
  incomePlanningKnownScenarioIds,
  incomePlanningScenarioCheckboxGroup,
  incomePlanningScenarioIdsForDialog,
  incomePlanningStoredScenarioIds,
  renderIncomePlanningWeekScenarioDialog,
  updateIncomePlanningWeekScenarioDialogDraft
} from "./weekScenarioController";

export { configureIncomePlanningHost } from "./host";
export {
  finishIncomePlanningCalendarDrag,
  moveIncomePlanningCalendarDrag,
  startIncomePlanningCalendarDrag
} from "./calendarDragController";
export { incomePlanningOwnerTypeFromValue } from "./shared";
export {
  closeIncomePlanningWeekScenarioDialog,
  openIncomePlanningWeekScenarioDialog,
  saveIncomePlanningWeekScenarioDialog,
  setIncomePlanningWeekScenario,
  showCurrentIncomePlanningWeek,
  showNextIncomePlanningWeek,
  showPreviousIncomePlanningWeek,
  updateIncomePlanningWeekScenarioDialogDraft
} from "./weekScenarioController";
export {
  renderIncomePlanningAssumptions,
  renderIncomePlanningCalendarStamps,
  renderIncomePlanningCareerLife,
  renderIncomePlanningHabits,
  renderIncomePlanningManualBlocks,
  renderIncomePlanningSources,
  renderIncomePlanningSummary
} from "./renderController";
export {
  deleteIncomePlanningStamp,
  hideIncomePlanningStampMenu,
  hideIncomePlanningStampPicker,
  renderIncomePlanningStampMenu,
  renderIncomePlanningStampPicker,
  saveIncomePlanningStampPicker,
  selectIncomePlanningStampIcon,
  selectIncomePlanningStampPreset,
  updateIncomePlanningStampPickerDraft,
  updateIncomePlanningStampScenarioSelection
} from "./stampPopupController";
export {
  closeIncomeStampPlannerDialog,
  deleteIncomeStampPlannerStamp,
  openIncomeStampPlannerDialogForDate,
  openIncomeStampPlannerDialogForEdit,
  renderIncomeStampPlanner,
  saveIncomeStampPlannerDialog,
  selectIncomeStampPlannerIcon,
  selectIncomeStampPlannerPreset,
  showCurrentIncomeStampPlannerMonth,
  showNextIncomeStampPlannerMonth,
  showPreviousIncomeStampPlannerMonth,
  updateIncomeStampPlannerDialogDraft,
  updateIncomeStampPlannerScenarioSelection
} from "./stampPlannerController";

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

export function incomePlanningModelForActiveWeek(): IncomePlanningModel {
  requireIncomePlanningHost();
  return buildIncomePlanningModel(host.getState().incomePlanning, { scenarioId: incomePlanningActiveWeekScenarioId() });
}

export function startIncomePlanningCurrentTimeTicker(): void {
  requireIncomePlanningHost();
  if (incomePlanningUiState.currentTimeTimerId !== null) return;
  incomePlanningUiState.currentTimeTimerId = window.setInterval(() => {
    if (incomePlanningIsCurrentWeek()) renderIncomePlanning();
  }, 60_000);
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
