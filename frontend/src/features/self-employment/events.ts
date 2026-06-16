import type { AppContext } from "../../app/contracts";
import { selfEmploymentUiState } from "./uiState";
import {
  addSelfEmploymentContact,
  addSelfEmploymentInvoice,
  addSelfEmploymentProject,
  addSelfEmploymentTask,
  deleteSelfEmploymentProject,
  hideSelfEmploymentIconPicker,
  removeSelfEmploymentCollectionItem,
  renameSelfEmploymentProject,
  selectSelfEmploymentIcon,
  selectSelfEmploymentProject,
  selectSelfEmploymentRoadmapArea,
  selfEmploymentControlValue,
  showSelfEmploymentIconPicker,
  toggleSelfEmploymentLabelPicker,
  toggleSelfEmploymentProjectLabel,
  updateSelfEmploymentCollectionItemField,
  updateSelfEmploymentGanttCardField,
  updateSelfEmploymentGanttPhaseField,
  updateSelfEmploymentProjectField,
  updateSelfEmploymentProjectListField
} from "./controller";
import {
  closeSelfEmploymentGanttEditor,
  openSelfEmploymentGanttCardEditor,
  openSelfEmploymentGanttPhaseEditor,
  toggleSelfEmploymentGanttPhaseFilter
} from "./ganttController";

export function onSelfEmploymentInput(event: Event, context: AppContext): boolean | void {
  const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  if (!target) return;

  if (target.dataset.selfEmploymentGanttPhaseField && target.dataset.selfEmploymentProjectId && target.dataset.selfEmploymentGanttPhaseId) {
    updateSelfEmploymentGanttPhaseField(
      target.dataset.selfEmploymentProjectId,
      target.dataset.selfEmploymentGanttPhaseId,
      target.dataset.selfEmploymentGanttPhaseField,
      selfEmploymentControlValue(target),
      false
    );
    return true;
  }
  if (target.dataset.selfEmploymentGanttCardField && target.dataset.selfEmploymentProjectId && target.dataset.selfEmploymentGanttCardId) {
    updateSelfEmploymentGanttCardField(
      target.dataset.selfEmploymentProjectId,
      target.dataset.selfEmploymentGanttCardId,
      target.dataset.selfEmploymentGanttCardField,
      selfEmploymentControlValue(target),
      false
    );
    return true;
  }
  if (target.dataset.selfEmploymentField) {
    updateSelfEmploymentProjectField(
      target.dataset.selfEmploymentProjectId || context.store.getState().selfEmployment.selectedProjectId,
      target.dataset.selfEmploymentField,
      target.value,
      false
    );
    return true;
  }
  if (target.dataset.selfEmploymentListField) {
    updateSelfEmploymentProjectListField(
      target.dataset.selfEmploymentProjectId || context.store.getState().selfEmployment.selectedProjectId,
      target.dataset.selfEmploymentListField,
      target.value,
      false
    );
    return true;
  }
  if (target.dataset.selfEmploymentCollection && target.dataset.selfEmploymentItemId && target.dataset.selfEmploymentItemField) {
    updateSelfEmploymentCollectionItemField(
      target.dataset.selfEmploymentProjectId || context.store.getState().selfEmployment.selectedProjectId,
      target.dataset.selfEmploymentCollection,
      target.dataset.selfEmploymentItemId,
      target.dataset.selfEmploymentItemField,
      target.value,
      false
    );
    return true;
  }
}

export function onSelfEmploymentChange(event: Event, context: AppContext): boolean | void {
  const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  if (!target) return;

  if (target.dataset.selfEmploymentField) {
    updateSelfEmploymentProjectField(
      target.dataset.selfEmploymentProjectId || context.store.getState().selfEmployment.selectedProjectId,
      target.dataset.selfEmploymentField,
      target.value,
      true
    );
    return true;
  }
  if (target.dataset.selfEmploymentListField) {
    updateSelfEmploymentProjectListField(
      target.dataset.selfEmploymentProjectId || context.store.getState().selfEmployment.selectedProjectId,
      target.dataset.selfEmploymentListField,
      target.value,
      true
    );
    return true;
  }
  if (target.dataset.selfEmploymentCollection && target.dataset.selfEmploymentItemId && target.dataset.selfEmploymentItemField) {
    updateSelfEmploymentCollectionItemField(
      target.dataset.selfEmploymentProjectId || context.store.getState().selfEmployment.selectedProjectId,
      target.dataset.selfEmploymentCollection,
      target.dataset.selfEmploymentItemId,
      target.dataset.selfEmploymentItemField,
      target.value,
      true
    );
    return true;
  }
}

export function onSelfEmploymentClick(event: MouseEvent, context: AppContext): boolean | void {
  const target = event.target as HTMLElement | null;
  const button = target?.closest<HTMLButtonElement>("button[data-action]");

  if (!button) {
    closeSelfEmploymentOverlaysForTarget(target);
    return;
  }

  const action = button.dataset.action;
  if (selfEmploymentUiState.ganttEditor && !isSelfEmploymentGanttAction(action) && !button.closest("[data-self-employment-gantt-popover]")) {
    closeSelfEmploymentGanttEditor();
  }
  if (!isSelfEmploymentIconAction(action) && !button.closest("#selfEmploymentIconPicker")) {
    hideSelfEmploymentIconPicker();
  }

  if (!action || (!action.startsWith("self-employment-") && action !== "self-employment-gantt-close-editor")) return;

  event.preventDefault();
  if (action === "self-employment-add-project") addSelfEmploymentProject();
  if (action === "self-employment-select-project") selectSelfEmploymentProject(button.dataset.selfEmploymentProjectId || "");
  if (action === "self-employment-select-roadmap-area") selectSelfEmploymentRoadmapArea(button.dataset.selfEmploymentRoadmapArea || "");
  if (action === "self-employment-open-icon-picker") showSelfEmploymentIconPicker(button);
  if (action === "self-employment-close-icon-picker") hideSelfEmploymentIconPicker();
  if (action === "self-employment-select-icon") {
    selectSelfEmploymentIcon(button.dataset.selfEmploymentProjectId || "", button.dataset.selfEmploymentIcon || "");
  }
  if (action === "self-employment-rename-project") renameSelfEmploymentProject(button.dataset.selfEmploymentProjectId || "");
  if (action === "self-employment-delete-project") deleteSelfEmploymentProject(button.dataset.selfEmploymentProjectId || "");
  if (action === "self-employment-toggle-label-picker") toggleSelfEmploymentLabelPicker(button.dataset.selfEmploymentProjectId || "");
  if (action === "self-employment-toggle-label") {
    toggleSelfEmploymentProjectLabel(button.dataset.selfEmploymentProjectId || "", button.dataset.selfEmploymentLabel || "");
  }
  if (action === "self-employment-add-contact") addSelfEmploymentContact(button.dataset.selfEmploymentProjectId || "");
  if (action === "self-employment-remove-contact") {
    removeSelfEmploymentCollectionItem(button.dataset.selfEmploymentProjectId || "", "contacts", button.dataset.selfEmploymentItemId || "");
  }
  if (action === "self-employment-add-invoice") addSelfEmploymentInvoice(button.dataset.selfEmploymentProjectId || "");
  if (action === "self-employment-remove-invoice") {
    removeSelfEmploymentCollectionItem(button.dataset.selfEmploymentProjectId || "", "invoices", button.dataset.selfEmploymentItemId || "");
  }
  if (action === "self-employment-add-task") addSelfEmploymentTask(button.dataset.selfEmploymentProjectId || "");
  if (action === "self-employment-remove-task") {
    removeSelfEmploymentCollectionItem(button.dataset.selfEmploymentProjectId || "", "tasks", button.dataset.selfEmploymentItemId || "");
  }
  if (action === "self-employment-toggle-gantt-phase-filter") {
    toggleSelfEmploymentGanttPhaseFilter(
      button.dataset.selfEmploymentProjectId || context.store.getState().selfEmployment.selectedProjectId,
      button.dataset.selfEmploymentGanttPhaseId || ""
    );
  }
  if (action === "self-employment-gantt-open-phase") openSelfEmploymentGanttPhaseEditor(button);
  if (action === "self-employment-gantt-open-card") openSelfEmploymentGanttCardEditor(button);
  if (action === "self-employment-gantt-close-editor") closeSelfEmploymentGanttEditor();
  return true;
}

export function onSelfEmploymentWindowKeyDown(event: KeyboardEvent): boolean | void {
  if (event.key !== "Escape") return;
  closeSelfEmploymentOverlays();
}

export function closeSelfEmploymentOverlays(): void {
  hideSelfEmploymentIconPicker();
  closeSelfEmploymentGanttEditor();
}

function closeSelfEmploymentOverlaysForTarget(target: HTMLElement | null): void {
  if (selfEmploymentUiState.iconPicker && !target?.closest("#selfEmploymentIconPicker")) {
    hideSelfEmploymentIconPicker();
  }
  if (selfEmploymentUiState.ganttEditor && !target?.closest("[data-self-employment-gantt-popover]")) {
    closeSelfEmploymentGanttEditor();
  }
}

function isSelfEmploymentIconAction(action: string | undefined): boolean {
  return (
    action === "self-employment-open-icon-picker" ||
    action === "self-employment-select-icon" ||
    action === "self-employment-close-icon-picker"
  );
}

function isSelfEmploymentGanttAction(action: string | undefined): boolean {
  return (
    action === "self-employment-gantt-open-phase" ||
    action === "self-employment-gantt-open-card" ||
    action === "self-employment-gantt-close-editor"
  );
}
