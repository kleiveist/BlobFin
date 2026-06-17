import {
  buildIncomePlanningModel,
  incomePlanningDefaultManualIcon,
  type IncomePlanningModel
} from "../../domain/incomePlanning";
import { escapeHtml } from "../../lib/format";
import { normalizePositionIcon, POSITION_ICONS, positionIconSvg } from "../../lib/positionIcons";
import type { IncomePlanningAssumptions, IncomePlanningHabit, IncomePlanningManualBlock, IncomePlanningSlot, IncomePlanningWorkBlock } from "../../types";
import { incomePlanningHostRef as host, requireIncomePlanningHost } from "./host";
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
  renderIncomePlanningStampMenu,
  renderIncomePlanningStampPicker,
  updateIncomePlanningStampScenarioSelection
} from "./stampPopupController";
import { updateIncomeStampPlannerScenarioSelection } from "./stampPlannerController";
import {
  renderIncomePlanningPlanningPopup,
  setIncomePlanningPlanningPopupYear
} from "./planningPopupController";
import {
  incomePlanningUiState,
  type IncomePlanningSleepSlotGroup
} from "./uiState";
import {
  incomePlanningActiveWeekScenarioId,
  incomePlanningIsCurrentWeek,
  renderIncomePlanningWeekScenarioDialog,
  updateIncomePlanningWeekScenarioDialogDraft
} from "./weekScenarioController";
import {
  normalizeIncomePlanningSlotAfterEdit,
  updateIncomePlanningAssumption,
  updateIncomePlanningHabit,
  updateIncomePlanningManualBlock,
  updateIncomePlanningOwnerSlots,
  updateIncomePlanningWorkBlock,
  updateIncomePlanningSlotField
} from "./planningSanitizer";
import {
  renderIncomePlanningDialog,
  updateIncomePlanningDialogDraft,
  updateIncomePlanningDialogScenarioSelection,
  updateIncomePlanningDialogSleepSlotGroup,
  updateIncomePlanningDialogSleepSlotGroupScenario
} from "./dialogController";

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
  closeIncomePlanningPlanningPopup,
  openIncomePlanningPlanningPopup,
  setIncomePlanningPlanningPopupView,
  setIncomePlanningYearWeekScenario,
  showNextIncomePlanningPlanningPopupYear,
  showPreviousIncomePlanningPlanningPopupYear,
  toggleIncomePlanningYearWeekScenarioPicker
} from "./planningPopupController";
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
export {
  addIncomePlanningDialogSleepSlot,
  closeIncomePlanningDialog,
  deleteIncomePlanningDialogSlot,
  openIncomePlanningDialog,
  openIncomePlanningDialogFromCalendar,
  openIncomePlanningStampMenu,
  openIncomePlanningStampPickerForEdit,
  openIncomePlanningStampPickerFromCalendar,
  removeIncomePlanningDialogSleepSlot,
  renderIncomePlanningDialog,
  saveIncomePlanningDialog,
  updateIncomePlanningDialogDraft,
  updateIncomePlanningDialogScenarioSelection,
  updateIncomePlanningDialogSleepSlotGroup,
  updateIncomePlanningDialogSleepSlotGroupScenario
} from "./dialogController";
export { removeIncomePlanningSlot } from "./planningSanitizer";

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
  renderIncomePlanningPlanningPopup();
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



export function handleIncomePlanningControl(
  target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  renderMode: "live" | "full" = "full"
): boolean {
  if (target.dataset.incomePlanningWeekScenarioDialogField) {
    updateIncomePlanningWeekScenarioDialogDraft(target.dataset.incomePlanningWeekScenarioDialogField, target.value);
    return true;
  }

  if (target.dataset.incomePlanningPlanningPopupYear !== undefined) {
    setIncomePlanningPlanningPopupYear(target.value);
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
