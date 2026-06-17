import {
  addIncomePlanningDialogSleepSlot,
  closeIncomePlanningDialog,
  closeIncomePlanningPlanningPopup,
  closeIncomePlanningWeekScenarioDialog,
  closeIncomeStampPlannerDialog,
  deleteIncomePlanningDialogSlot,
  deleteIncomePlanningStamp,
  deleteIncomeStampPlannerStamp,
  finishIncomePlanningCalendarDrag,
  handleIncomePlanningControl,
  hideIncomePlanningHabitIconPicker,
  hideIncomePlanningStampMenu,
  hideIncomePlanningStampPicker,
  incomePlanningOwnerTypeFromValue,
  moveIncomePlanningCalendarDrag,
  openIncomePlanningDialog,
  openIncomePlanningDialogFromCalendar,
  openIncomePlanningPlanningPopup,
  openIncomePlanningStampMenu,
  openIncomePlanningStampPickerForEdit,
  openIncomePlanningStampPickerFromCalendar,
  openIncomePlanningWeekScenarioDialog,
  openIncomeStampPlannerDialogForDate,
  openIncomeStampPlannerDialogForEdit,
  removeIncomePlanningDialogSleepSlot,
  removeIncomePlanningHabit,
  removeIncomePlanningManualBlock,
  removeIncomePlanningSlot,
  removeIncomePlanningWorkBlock,
  saveIncomePlanningDialog,
  saveIncomePlanningStampPicker,
  saveIncomePlanningWeekScenarioDialog,
  saveIncomeStampPlannerDialog,
  selectIncomePlanningHabitIcon,
  selectIncomePlanningStampIcon,
  selectIncomePlanningStampPreset,
  selectIncomeStampPlannerIcon,
  selectIncomeStampPlannerPreset,
  setIncomePlanningPlanningPopupView,
  setIncomePlanningWeekScenario,
  showCurrentIncomePlanningWeek,
  showCurrentIncomeStampPlannerMonth,
  showIncomePlanningHabitIconPicker,
  showNextIncomePlanningPlanningPopupYear,
  showNextIncomePlanningWeek,
  showNextIncomeStampPlannerMonth,
  showPreviousIncomePlanningPlanningPopupYear,
  showPreviousIncomePlanningWeek,
  showPreviousIncomeStampPlannerMonth,
  startIncomePlanningCalendarDrag,
  updateIncomePlanningDialogDraft,
  updateIncomePlanningStampPickerDraft,
  updateIncomeStampPlannerDialogDraft
} from "./controller";
import { incomePlanningUiState } from "./uiState";

export function onIncomePlanningInput(event: Event): boolean | void {
  const target = formControl(event.target);
  if (!target) return;
  if (handleIncomePlanningControl(target, "live")) return true;
  if (target.dataset.incomePlanningStampField) {
    updateIncomePlanningStampPickerDraft(target.dataset.incomePlanningStampField, target.value);
    return true;
  }
  if (target.dataset.incomeStampPlannerField) {
    updateIncomeStampPlannerDialogDraft(target.dataset.incomeStampPlannerField, target.value);
    return true;
  }
}

export function onIncomePlanningChange(event: Event): boolean | void {
  const target = formControl(event.target);
  if (!target) return;
  if (handleIncomePlanningControl(target, "full")) return true;
  if (target.dataset.incomePlanningStampField) {
    updateIncomePlanningStampPickerDraft(target.dataset.incomePlanningStampField, target.value);
    return true;
  }
  if (target.dataset.incomeStampPlannerField) {
    updateIncomeStampPlannerDialogDraft(target.dataset.incomeStampPlannerField, target.value);
    return true;
  }
}

export function onIncomePlanningClick(event: MouseEvent): boolean | void {
  const target = event.target as HTMLElement | null;
  if (incomePlanningUiState.suppressNextCalendarClick) {
    incomePlanningUiState.suppressNextCalendarClick = false;
    return true;
  }
  if (incomePlanningUiState.stampPlannerSuppressNextClick) {
    incomePlanningUiState.stampPlannerSuppressNextClick = false;
    return true;
  }

  const calendarDay = target?.closest<HTMLElement>("[data-income-planning-calendar-day]");
  const calendarStampButton = target?.closest<HTMLButtonElement>("[data-income-planning-calendar-stamp]");
  const plannedStampButton = target?.closest<HTMLButtonElement>("[data-income-stamp-planner-calendar-stamp]");
  if (calendarDay && plannedStampButton) {
    event.preventDefault();
    openIncomeStampPlannerDialogForEdit(plannedStampButton.dataset.incomeStampPlannerStampId || "", {
      switchToPlanner: true
    });
    return true;
  }
  if (calendarDay && event.ctrlKey && calendarStampButton) {
    event.preventDefault();
    openIncomePlanningStampPickerForEdit(calendarStampButton.dataset.incomePlanningStampId || "", event.clientX, event.clientY);
    return true;
  }
  if (
    calendarDay &&
    event.ctrlKey &&
    !target?.closest("[data-income-planning-calendar-block]") &&
    !target?.closest("[data-income-planning-calendar-background]") &&
    !target?.closest("[data-income-planning-calendar-stamp]") &&
    !target?.closest("[data-income-stamp-planner-calendar-stamp]")
  ) {
    event.preventDefault();
    openIncomePlanningStampPickerFromCalendar(calendarDay, event.clientX, event.clientY);
    return true;
  }
  if (calendarDay && target?.closest("[data-income-planning-calendar-background]")) {
    event.preventDefault();
    return true;
  }
  if (
    calendarDay &&
    !target?.closest("[data-income-planning-calendar-block]") &&
    !target?.closest("[data-income-planning-calendar-stamp]") &&
    !target?.closest("[data-income-stamp-planner-calendar-stamp]")
  ) {
    event.preventDefault();
    openIncomePlanningDialogFromCalendar(calendarDay, event.clientY);
    return true;
  }

  const button = target?.closest<HTMLButtonElement>("button[data-action]");
  if (!button) {
    closeIncomePlanningOverlaysForTarget(target);
    return;
  }
  const action = button.dataset.action;
  if (!isIncomePlanningAction(action)) {
    closeIncomePlanningOverlaysForButton(button, action);
    return;
  }
  if (action === "income-planning-import-csv" || action === "income-planning-export-csv") return;

  event.preventDefault();
  closeIncomePlanningOverlaysForButton(button, action);
  if (action === "income-planning-add-work-block") openIncomePlanningDialog("work", "create");
  if (action === "income-planning-remove-work-block") removeIncomePlanningWorkBlock(button.dataset.incomePlanningWorkId || "");
  if (action === "income-planning-add-habit") openIncomePlanningDialog("habit", "create");
  if (action === "income-planning-remove-habit") removeIncomePlanningHabit(button.dataset.incomePlanningHabitId || "");
  if (action === "income-planning-add-manual-block") openIncomePlanningDialog("manual", "create");
  if (action === "income-planning-remove-manual-block") removeIncomePlanningManualBlock(button.dataset.incomePlanningManualId || "");
  if (action === "income-planning-add-slot") {
    openIncomePlanningDialog(
      incomePlanningOwnerTypeFromValue(button.dataset.incomePlanningOwnerType),
      "create_slot",
      button.dataset.incomePlanningOwnerId || null
    );
  }
  if (action === "income-planning-remove-slot") {
    removeIncomePlanningSlot(
      button.dataset.incomePlanningOwnerType || "",
      button.dataset.incomePlanningOwnerId || "",
      button.dataset.incomePlanningSlotId || ""
    );
  }
  if (action === "income-planning-edit-assumption") openIncomePlanningDialog("assumption", "edit");
  if (action === "income-planning-add-sleep-slot") addIncomePlanningDialogSleepSlot();
  if (action === "income-planning-remove-sleep-slot") removeIncomePlanningDialogSleepSlot(button.dataset.incomePlanningSleepSlotGroupId || "");
  if (action === "income-planning-open-block") {
    const slotId = button.dataset.incomePlanningSlotId || null;
    openIncomePlanningDialog(
      incomePlanningOwnerTypeFromValue(button.dataset.incomePlanningOwnerType),
      slotId ? "edit_slot" : "edit",
      button.dataset.incomePlanningOwnerId || null,
      slotId
    );
  }
  if (action === "income-planning-close-dialog") closeIncomePlanningDialog();
  if (action === "income-planning-save-dialog") saveIncomePlanningDialog();
  if (action === "income-planning-delete-dialog-slot") deleteIncomePlanningDialogSlot();
  if (action === "income-planning-set-dialog-color") updateIncomePlanningDialogDraft("color", button.dataset.incomePlanningColor || "");
  if (action === "open-income-planning-icon-picker") showIncomePlanningHabitIconPicker(button);
  if (action === "close-income-planning-icon-picker") hideIncomePlanningHabitIconPicker();
  if (action === "select-income-planning-icon") selectIncomePlanningHabitIcon(button.dataset.incomePlanningIcon || "");
  if (action === "income-planning-open-stamp-menu") openIncomePlanningStampMenu(button.dataset.incomePlanningStampId || "", event.clientX, event.clientY);
  if (action === "income-planning-edit-stamp") openIncomePlanningStampPickerForEdit(button.dataset.incomePlanningStampId || "", event.clientX, event.clientY);
  if (action === "income-planning-close-stamp-picker") hideIncomePlanningStampPicker();
  if (action === "income-planning-close-stamp-menu") hideIncomePlanningStampMenu();
  if (action === "select-income-planning-stamp-icon") selectIncomePlanningStampIcon(button.dataset.incomePlanningStampIcon || "");
  if (action === "select-income-planning-stamp-preset") selectIncomePlanningStampPreset(button.dataset.incomePlanningStampLabel || "", button.dataset.incomePlanningStampIcon || "");
  if (action === "income-planning-save-stamp") saveIncomePlanningStampPicker();
  if (action === "income-planning-delete-stamp") deleteIncomePlanningStamp(button.dataset.incomePlanningStampId || "");
  if (action === "income-planning-prev-week") showPreviousIncomePlanningWeek();
  if (action === "income-planning-next-week") showNextIncomePlanningWeek();
  if (action === "income-planning-current-week") showCurrentIncomePlanningWeek();
  if (action === "income-planning-open-planning-popup-year") openIncomePlanningPlanningPopup("year");
  if (action === "income-planning-open-planning-popup-stamp") openIncomePlanningPlanningPopup("stamp");
  if (action === "income-planning-close-planning-popup") closeIncomePlanningPlanningPopup();
  if (action === "income-planning-planning-popup-year") setIncomePlanningPlanningPopupView("year");
  if (action === "income-planning-planning-popup-stamp") setIncomePlanningPlanningPopupView("stamp");
  if (action === "income-planning-planning-popup-prev-year") showPreviousIncomePlanningPlanningPopupYear();
  if (action === "income-planning-planning-popup-next-year") showNextIncomePlanningPlanningPopupYear();
  if (action?.startsWith("select-income-planning-week-scenario-")) setIncomePlanningWeekScenario(action.replace("select-income-planning-week-scenario-", ""));
  if (action === "income-planning-open-week-scenario-dialog") openIncomePlanningWeekScenarioDialog();
  if (action === "income-planning-close-week-scenario-dialog") closeIncomePlanningWeekScenarioDialog();
  if (action === "income-planning-save-week-scenario") saveIncomePlanningWeekScenarioDialog();
  if (action === "income-stamp-planner-add") openIncomeStampPlannerDialogForDate();
  if (action === "income-stamp-planner-add-date") openIncomeStampPlannerDialogForDate(button.dataset.incomeStampPlannerDate || "");
  if (action === "income-stamp-planner-edit") openIncomeStampPlannerDialogForEdit(button.dataset.incomeStampPlannerStampId || "");
  if (action === "income-stamp-planner-close-dialog") closeIncomeStampPlannerDialog();
  if (action === "income-stamp-planner-save") saveIncomeStampPlannerDialog();
  if (action === "income-stamp-planner-delete") deleteIncomeStampPlannerStamp();
  if (action === "select-income-stamp-planner-icon") selectIncomeStampPlannerIcon(button.dataset.incomeStampPlannerIcon || "");
  if (action === "select-income-stamp-planner-preset") selectIncomeStampPlannerPreset(button.dataset.incomeStampPlannerLabel || "", button.dataset.incomeStampPlannerIcon || "");
  if (action === "income-stamp-planner-prev-month") showPreviousIncomeStampPlannerMonth();
  if (action === "income-stamp-planner-next-month") showNextIncomeStampPlannerMonth();
  if (action === "income-stamp-planner-current-month") showCurrentIncomeStampPlannerMonth();
  return true;
}

export function onIncomePlanningPointerDown(event: PointerEvent): boolean | void {
  startIncomePlanningCalendarDrag(event);
}

export function onIncomePlanningWindowPointerMove(event: PointerEvent): boolean | void {
  moveIncomePlanningCalendarDrag(event);
}

export function onIncomePlanningWindowPointerUp(event: PointerEvent): boolean | void {
  finishIncomePlanningCalendarDrag(event);
}

export function onIncomePlanningWindowKeyDown(event: KeyboardEvent): boolean | void {
  if (event.key !== "Escape") return;
  closeIncomePlanningOverlays();
}

export function closeIncomePlanningOverlays(): void {
  hideIncomePlanningHabitIconPicker();
  hideIncomePlanningStampPicker();
  hideIncomePlanningStampMenu();
  closeIncomePlanningDialog();
  closeIncomePlanningPlanningPopup();
}

function closeIncomePlanningOverlaysForTarget(target: HTMLElement | null): void {
  if (incomePlanningUiState.habitIconPicker && !target?.closest("#incomePlanningHabitIconPicker")) hideIncomePlanningHabitIconPicker();
  if (incomePlanningUiState.stampPicker && !target?.closest("#incomePlanningStampPicker")) hideIncomePlanningStampPicker();
  if (incomePlanningUiState.stampMenu && !target?.closest("#incomePlanningStampMenu")) hideIncomePlanningStampMenu();
}

function closeIncomePlanningOverlaysForButton(button: HTMLButtonElement, action: string | undefined): void {
  if (!isIncomePlanningIconAction(action)) hideIncomePlanningHabitIconPicker();
  if (!isIncomePlanningStampPopupAction(action) && !button.closest("#incomePlanningStampPicker") && !button.closest("#incomePlanningStampMenu")) {
    hideIncomePlanningStampPicker();
    hideIncomePlanningStampMenu();
  }
}

function isIncomePlanningAction(action: string | undefined): boolean {
  return Boolean(
    action?.startsWith("income-planning-") ||
      action?.startsWith("select-income-planning-") ||
      action?.startsWith("income-stamp-planner-") ||
      action?.startsWith("select-income-stamp-planner-") ||
      action === "open-income-planning-icon-picker" ||
      action === "close-income-planning-icon-picker"
  );
}

function isIncomePlanningIconAction(action: string | undefined): boolean {
  return action === "open-income-planning-icon-picker" || action === "select-income-planning-icon" || action === "close-income-planning-icon-picker";
}

function isIncomePlanningStampPopupAction(action: string | undefined): boolean {
  return Boolean(
    action === "income-planning-open-stamp-menu" ||
      action === "income-planning-edit-stamp" ||
      action === "income-planning-save-stamp" ||
      action === "income-planning-delete-stamp" ||
      action === "income-planning-close-stamp-picker" ||
      action === "income-planning-close-stamp-menu" ||
      action === "select-income-planning-stamp-preset" ||
      action === "select-income-planning-stamp-icon"
  );
}

function formControl(target: EventTarget | null): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null {
  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement
    ? target
    : null;
}
