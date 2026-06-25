import type { AppContext } from "../../app/contracts";
import { selfEmploymentEisenhowerQuadrantFromValue } from "../../domain/selfEmploymentGantt";
import { selfEmploymentUiState } from "./uiState";
import {
  addSelfEmploymentContact,
  addSelfEmploymentInvoice,
  addSelfEmploymentProject,
  addSelfEmploymentGanttTodo,
  deleteSelfEmploymentProject,
  hideSelfEmploymentIconPicker,
  removeSelfEmploymentGanttTodo,
  removeSelfEmploymentCollectionItem,
  renameSelfEmploymentProject,
  refreshSelfEmploymentProjectListPopup,
  selectSelfEmploymentBillingTab,
  selectSelfEmploymentIcon,
  selectSelfEmploymentProject,
  selectSelfEmploymentRoadmapArea,
  selfEmploymentControlValue,
  showSelfEmploymentIconPicker,
  toggleSelfEmploymentDashboardProject,
  toggleSelfEmploymentLabelPicker,
  toggleSelfEmploymentOfferOverview,
  toggleSelfEmploymentProjectListItem,
  toggleSelfEmploymentProjectListPopup,
  toggleSelfEmploymentProjectLabel,
  toggleSelfEmploymentTimeSource,
  updateSelfEmploymentCollectionItemField,
  updateSelfEmploymentGanttCardField,
  updateSelfEmploymentGanttPhaseField,
  updateSelfEmploymentGanttTodoEisenhowerQuadrant,
  updateSelfEmploymentGanttTodoField,
  updateSelfEmploymentGanttTodoStatus,
  updateSelfEmploymentProjectField,
  updateSelfEmploymentProjectListField
} from "./controller";
import {
  closeSelfEmploymentGanttEditor,
  openSelfEmploymentGanttCardEditor,
  openSelfEmploymentGanttLabelEditor,
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
      target instanceof HTMLInputElement && target.type === "checkbox"
    );
    return true;
  }
  if (target.dataset.selfEmploymentGanttCardField && target.dataset.selfEmploymentProjectId && target.dataset.selfEmploymentGanttCardId) {
    updateSelfEmploymentGanttCardField(
      target.dataset.selfEmploymentProjectId,
      target.dataset.selfEmploymentGanttCardId,
      target.dataset.selfEmploymentGanttCardField,
      selfEmploymentControlValue(target),
      target instanceof HTMLInputElement && target.type === "checkbox"
    );
    return true;
  }
  if (
    target.dataset.selfEmploymentGanttTodoField &&
    target.dataset.selfEmploymentProjectId &&
    target.dataset.selfEmploymentGanttCardId &&
    target.dataset.selfEmploymentGanttTodoId
  ) {
    updateSelfEmploymentGanttTodoField(
      target.dataset.selfEmploymentProjectId,
      target.dataset.selfEmploymentGanttCardId,
      target.dataset.selfEmploymentGanttTodoId,
      target.dataset.selfEmploymentGanttTodoField,
      selfEmploymentControlValue(target),
      target instanceof HTMLInputElement && target.type === "checkbox"
    );
    return true;
  }
  if (target.dataset.selfEmploymentField) {
    updateSelfEmploymentProjectField(
      target.dataset.selfEmploymentProjectId || context.store.getState().selfEmployment.selectedProjectId,
      target.dataset.selfEmploymentField,
      selfEmploymentControlValue(target),
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
  if (target.dataset.selfEmploymentTimeSourceOwnerType && target.dataset.selfEmploymentTimeSourceOwnerId) {
    if (!(target instanceof HTMLInputElement)) return false;
    const ownerType = target.dataset.selfEmploymentTimeSourceOwnerType === "habit" ? "habit" : "work";
    toggleSelfEmploymentTimeSource(
      target.dataset.selfEmploymentProjectId || context.store.getState().selfEmployment.selectedProjectId,
      ownerType,
      target.dataset.selfEmploymentTimeSourceOwnerId,
      target.checked
    );
    return true;
  }
}

export function onSelfEmploymentChange(event: Event, context: AppContext): boolean | void {
  const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  if (!target) return;
  const inProjectListPopup = isInsideSelfEmploymentProjectListPopup(target);

  if (target.dataset.selfEmploymentField) {
    updateSelfEmploymentProjectField(
      target.dataset.selfEmploymentProjectId || context.store.getState().selfEmployment.selectedProjectId,
      target.dataset.selfEmploymentField,
      selfEmploymentControlValue(target),
      !inProjectListPopup
    );
    if (inProjectListPopup) refreshSelfEmploymentProjectListPopup();
    return true;
  }
  if (target.dataset.selfEmploymentListField) {
    updateSelfEmploymentProjectListField(
      target.dataset.selfEmploymentProjectId || context.store.getState().selfEmployment.selectedProjectId,
      target.dataset.selfEmploymentListField,
      target.value,
      !inProjectListPopup
    );
    if (inProjectListPopup) refreshSelfEmploymentProjectListPopup();
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
  const kanbanCard = target?.closest<HTMLElement>("[data-self-employment-kanban-card]");
  const kanbanColumn = target?.closest<HTMLElement>(".self-employment-kanban-column[data-self-employment-kanban-status]");

  if (!button && kanbanCard) {
    event.preventDefault();
    if (event.ctrlKey && event.button === 0) {
      openSelfEmploymentTaskContextPopup(kanbanCard, event, context);
      return true;
    }
    selfEmploymentUiState.taskContextPopup = null;
    toggleSelfEmploymentKanbanCardSelection(kanbanCard, context);
    return true;
  }

  if (!button && kanbanColumn) {
    const moved = moveSelectedSelfEmploymentKanbanCardToColumn(kanbanColumn);
    if (moved) {
      event.preventDefault();
      return true;
    }
  }

  if (!button) {
    const closed = closeSelfEmploymentOverlaysForTarget(target);
    if (closed) {
      context.scheduler.request();
      return true;
    }
    return;
  }

  const action = button.dataset.action;
  const inProjectListPopup = isInsideSelfEmploymentProjectListPopup(button);
  const closedByButtonOutsideClick =
    selfEmploymentUiState.projectListPopupOpen &&
    action !== "self-employment-toggle-project-list" &&
    !button.closest(".self-employment-project-list-popup");
  if (closedByButtonOutsideClick) {
    selfEmploymentUiState.projectListPopupOpen = false;
    selfEmploymentUiState.projectListExpandedProjectId = null;
  }
  if (selfEmploymentUiState.ganttEditor && !isSelfEmploymentGanttAction(action) && !button.closest("[data-self-employment-gantt-popover]")) {
    closeSelfEmploymentGanttEditor();
  }
  if (!isSelfEmploymentIconAction(action) && !button.closest("#selfEmploymentIconPicker")) {
    hideSelfEmploymentIconPicker();
  }

  if (!action || (!action.startsWith("self-employment-") && action !== "self-employment-gantt-close-editor")) {
    if (closedByButtonOutsideClick) context.scheduler.request();
    return;
  }

  event.preventDefault();
  if (action === "self-employment-add-project") addSelfEmploymentProject();
  if (action === "self-employment-toggle-project-list") toggleSelfEmploymentProjectListPopup();
  if (action === "self-employment-close-project-list") toggleSelfEmploymentProjectListPopup(false);
  if (action === "self-employment-toggle-project-list-item") {
    toggleSelfEmploymentProjectListItem(button.dataset.selfEmploymentProjectId || "");
  }
  if (action === "self-employment-toggle-dashboard-project") {
    const changed = toggleSelfEmploymentDashboardProject(button.dataset.selfEmploymentProjectId || "", !inProjectListPopup);
    if (changed && inProjectListPopup) refreshSelfEmploymentProjectListPopup();
  }
  if (action === "self-employment-select-project") selectSelfEmploymentProject(button.dataset.selfEmploymentProjectId || "");
  if (action === "self-employment-select-roadmap-area") selectSelfEmploymentRoadmapArea(button.dataset.selfEmploymentRoadmapArea || "");
  if (action === "self-employment-select-billing-tab") {
    selectSelfEmploymentBillingTab(
      button.dataset.selfEmploymentProjectId || context.store.getState().selfEmployment.selectedProjectId,
      button.dataset.selfEmploymentBillingTab === "invoices" ? "invoices" : "offers"
    );
  }
  if (action === "self-employment-toggle-offer-overview") {
    toggleSelfEmploymentOfferOverview(button.dataset.selfEmploymentProjectId || context.store.getState().selfEmployment.selectedProjectId);
  }
  if (action === "self-employment-close-offer-overview") {
    toggleSelfEmploymentOfferOverview(button.dataset.selfEmploymentProjectId || context.store.getState().selfEmployment.selectedProjectId, false);
  }
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
  if (action === "self-employment-set-task-eisenhower-filter") {
    selfEmploymentUiState.taskEisenhowerFilter = selfEmploymentTaskEisenhowerFilterFromValue(button.dataset.selfEmploymentTaskEisenhowerFilter);
    context.scheduler.request();
  }
  if (action === "self-employment-toggle-kanban-phase-filter") {
    selfEmploymentUiState.kanbanPhaseFilterIds = toggledSelfEmploymentFilterValues(
      selfEmploymentUiState.kanbanPhaseFilterIds,
      button.dataset.selfEmploymentKanbanPhaseId || ""
    );
    context.scheduler.request();
  }
  if (action === "self-employment-toggle-kanban-label-filter") {
    selfEmploymentUiState.kanbanLabelFilterIds = toggledSelfEmploymentFilterValues(
      selfEmploymentUiState.kanbanLabelFilterIds,
      button.dataset.selfEmploymentKanbanLabelId || ""
    );
    context.scheduler.request();
  }
  if (action === "self-employment-close-task-context-popup") {
    selfEmploymentUiState.taskContextPopup = null;
    context.scheduler.request();
  }
  if (action === "self-employment-jump-kanban-todo") {
    jumpToSelfEmploymentKanbanTodo(button, context);
  }
  if (action === "self-employment-add-contact") addSelfEmploymentContact(button.dataset.selfEmploymentProjectId || "");
  if (action === "self-employment-remove-contact") {
    removeSelfEmploymentCollectionItem(button.dataset.selfEmploymentProjectId || "", "contacts", button.dataset.selfEmploymentItemId || "");
  }
  if (action === "self-employment-add-invoice") addSelfEmploymentInvoice(button.dataset.selfEmploymentProjectId || "");
  if (action === "self-employment-remove-invoice") {
    removeSelfEmploymentCollectionItem(button.dataset.selfEmploymentProjectId || "", "invoices", button.dataset.selfEmploymentItemId || "");
  }
  if (action === "self-employment-gantt-add-todo") {
    addSelfEmploymentGanttTodo(
      button.dataset.selfEmploymentProjectId || context.store.getState().selfEmployment.selectedProjectId,
      button.dataset.selfEmploymentGanttCardId || "",
      button.dataset.selfEmploymentGanttTodoId || ""
    );
  }
  if (action === "self-employment-gantt-remove-todo") {
    removeSelfEmploymentGanttTodo(
      button.dataset.selfEmploymentProjectId || context.store.getState().selfEmployment.selectedProjectId,
      button.dataset.selfEmploymentGanttCardId || "",
      button.dataset.selfEmploymentGanttTodoId || ""
    );
  }
  if (action === "self-employment-set-gantt-todo-eisenhower") {
    updateSelfEmploymentGanttTodoEisenhowerQuadrant(
      button.dataset.selfEmploymentProjectId || context.store.getState().selfEmployment.selectedProjectId,
      button.dataset.selfEmploymentGanttCardId || "",
      button.dataset.selfEmploymentGanttTodoId || "",
      selfEmploymentEisenhowerQuadrantFromValue(button.dataset.selfEmploymentEisenhowerQuadrant)
    );
  }
  if (action === "self-employment-set-kanban-status") {
    updateSelfEmploymentGanttTodoStatus(
      button.dataset.selfEmploymentProjectId || context.store.getState().selfEmployment.selectedProjectId,
      button.dataset.selfEmploymentGanttCardId || "",
      button.dataset.selfEmploymentGanttTodoId || "",
      selfEmploymentKanbanStatusFromValue(button.dataset.selfEmploymentKanbanStatus)
    );
  }
  if (action === "self-employment-toggle-gantt-phase-filter") {
    toggleSelfEmploymentGanttPhaseFilter(
      button.dataset.selfEmploymentProjectId || context.store.getState().selfEmployment.selectedProjectId,
      button.dataset.selfEmploymentGanttPhaseId || ""
    );
  }
  if (action === "self-employment-gantt-open-phase") openSelfEmploymentGanttPhaseEditor(button);
  if (action === "self-employment-gantt-open-label") openSelfEmploymentGanttLabelEditor(button);
  if (action === "self-employment-gantt-open-card") openSelfEmploymentGanttCardEditor(button);
  if (action === "self-employment-gantt-close-editor") closeSelfEmploymentGanttEditor();
  return true;
}

export function onSelfEmploymentDragStart(event: DragEvent, context: AppContext): boolean | void {
  const card = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-self-employment-kanban-card]");
  if (!card) return;
  const projectId = card.dataset.selfEmploymentProjectId || context.store.getState().selfEmployment.selectedProjectId;
  const cardId = card.dataset.selfEmploymentGanttCardId || "";
  const todoId = card.dataset.selfEmploymentGanttTodoId || "";
  const status = selfEmploymentKanbanStatusFromValue(card.dataset.selfEmploymentKanbanStatus);
  if (!projectId || !cardId || !todoId) return;
  selfEmploymentUiState.kanbanDrag = { projectId, cardId, todoId, status };
  event.dataTransfer?.setData("text/plain", `${projectId}:${cardId}:${todoId}`);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  card.classList.add("dragging");
  return true;
}

export function onSelfEmploymentDragOver(event: DragEvent): boolean | void {
  if (!selfEmploymentUiState.kanbanDrag) return;
  const column = selfEmploymentKanbanColumnFromEvent(event);
  if (!column) return;
  event.preventDefault();
  column.classList.add("drag-over");
  return true;
}

export function onSelfEmploymentDragLeave(event: DragEvent): boolean | void {
  const column = selfEmploymentKanbanColumnFromEvent(event);
  column?.classList.remove("drag-over");
}

export function onSelfEmploymentDrop(event: DragEvent): boolean | void {
  const column = selfEmploymentKanbanColumnFromEvent(event);
  const drag = selfEmploymentUiState.kanbanDrag;
  if (!column || !drag) return;
  event.preventDefault();
  const status = selfEmploymentKanbanStatusFromValue(column.dataset.selfEmploymentKanbanStatus);
  updateSelfEmploymentGanttTodoStatus(drag.projectId, drag.cardId, drag.todoId, status);
  clearSelfEmploymentKanbanDragState();
  return true;
}

export function onSelfEmploymentDragEnd(): boolean | void {
  if (!selfEmploymentUiState.kanbanDrag) return;
  clearSelfEmploymentKanbanDragState();
  return true;
}

export function onSelfEmploymentWindowKeyDown(event: KeyboardEvent): boolean | void {
  if (event.key !== "Escape") return;
  closeSelfEmploymentOverlays();
}

export function closeSelfEmploymentOverlays(): void {
  hideSelfEmploymentIconPicker();
  closeSelfEmploymentGanttEditor();
  closeSelfEmploymentTaskContextPopup();
  selfEmploymentUiState.projectListPopupOpen = false;
  selfEmploymentUiState.projectListExpandedProjectId = null;
  selfEmploymentUiState.offerOverviewProjectId = null;
  if (typeof document !== "undefined") {
    document.querySelector<HTMLElement>(".self-employment-project-list-popup")?.remove();
    document.querySelector<HTMLElement>(".self-employment-offer-overview-popup")?.remove();
  }
}

function closeSelfEmploymentOverlaysForTarget(target: HTMLElement | null): boolean {
  let closed = false;
  if (selfEmploymentUiState.iconPicker && !target?.closest("#selfEmploymentIconPicker")) {
    hideSelfEmploymentIconPicker();
    closed = true;
  }
  if (selfEmploymentUiState.ganttEditor && !target?.closest("[data-self-employment-gantt-popover]")) {
    closeSelfEmploymentGanttEditor();
    closed = true;
  }
  if (selfEmploymentUiState.taskContextPopup && !target?.closest("[data-self-employment-task-context-popup]")) {
    closeSelfEmploymentTaskContextPopup();
    closed = true;
  }
  if (selfEmploymentUiState.projectListPopupOpen && !target?.closest(".self-employment-project-list-popup")) {
    selfEmploymentUiState.projectListPopupOpen = false;
    selfEmploymentUiState.projectListExpandedProjectId = null;
    if (typeof document !== "undefined") document.querySelector<HTMLElement>(".self-employment-project-list-popup")?.remove();
    closed = true;
  }
  if (selfEmploymentUiState.offerOverviewProjectId && !target?.closest(".self-employment-offer-overview-popup")) {
    selfEmploymentUiState.offerOverviewProjectId = null;
    if (typeof document !== "undefined") document.querySelector<HTMLElement>(".self-employment-offer-overview-popup")?.remove();
    closed = true;
  }
  return closed;
}

function isInsideSelfEmploymentProjectListPopup(target: HTMLElement | null): boolean {
  return Boolean(target?.closest(".self-employment-project-list-popup"));
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
    action === "self-employment-gantt-open-label" ||
    action === "self-employment-gantt-open-card" ||
    action === "self-employment-gantt-close-editor"
  );
}

function selfEmploymentTaskEisenhowerFilterFromValue(value: unknown): typeof selfEmploymentUiState.taskEisenhowerFilter {
  return value === "all" ? "all" : selfEmploymentEisenhowerQuadrantFromValue(value);
}

function toggledSelfEmploymentFilterValues(values: string[], value: string): string[] {
  if (!value) return values;
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function selfEmploymentKanbanStatusFromValue(value: unknown): "planned" | "in_progress" | "done" {
  if (value === "done" || value === "in_progress") return value;
  return "planned";
}

function toggleSelfEmploymentKanbanCardSelection(card: HTMLElement, context: AppContext): void {
  const projectId = card.dataset.selfEmploymentProjectId || context.store.getState().selfEmployment.selectedProjectId;
  const cardId = card.dataset.selfEmploymentGanttCardId || "";
  const todoId = card.dataset.selfEmploymentGanttTodoId || "";
  if (!projectId || !cardId || !todoId) return;
  const selected = selfEmploymentUiState.kanbanSelectedCard;
  selfEmploymentUiState.kanbanSelectedCard =
    selected?.projectId === projectId && selected.cardId === cardId && selected.todoId === todoId
      ? null
      : { projectId, cardId, todoId };
  context.scheduler.request();
}

function openSelfEmploymentTaskContextPopup(card: HTMLElement, event: MouseEvent, context: AppContext): void {
  const projectId = card.dataset.selfEmploymentProjectId || context.store.getState().selfEmployment.selectedProjectId;
  const cardId = card.dataset.selfEmploymentGanttCardId || "";
  const todoId = card.dataset.selfEmploymentGanttTodoId || "";
  if (!projectId || !cardId || !todoId) return;
  const position = selfEmploymentPopupPosition(card, event);
  selfEmploymentUiState.taskContextPopup = {
    projectId,
    cardId,
    todoId,
    ...position
  };
  selfEmploymentUiState.kanbanSelectedCard = { projectId, cardId, todoId };
  context.scheduler.request();
}

function jumpToSelfEmploymentKanbanTodo(button: HTMLButtonElement, context: AppContext): void {
  const projectId = button.dataset.selfEmploymentProjectId || context.store.getState().selfEmployment.selectedProjectId;
  const cardId = button.dataset.selfEmploymentGanttCardId || "";
  const todoId = button.dataset.selfEmploymentGanttTodoId || "";
  if (!projectId || !cardId || !todoId) return;
  selfEmploymentUiState.kanbanSelectedCard = { projectId, cardId, todoId };
  selfEmploymentUiState.taskContextPopup = null;
  selfEmploymentUiState.taskEisenhowerFilter = "all";
  selfEmploymentUiState.kanbanPhaseFilterIds = [];
  selfEmploymentUiState.kanbanLabelFilterIds = [];
  context.scheduler.request();
  globalThis.setTimeout(() => scrollSelfEmploymentKanbanTodoIntoView(projectId, cardId, todoId), 0);
}

function selfEmploymentPopupPosition(card: HTMLElement, event: MouseEvent): { left: number; top: number } {
  const rect = card.getBoundingClientRect?.();
  const viewportWidth = typeof window === "undefined" ? 1200 : window.innerWidth || 1200;
  const viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight || 800;
  const left = Math.round(Math.max(12, Math.min(event.clientX || rect?.left || 12, viewportWidth - 340)));
  const top = Math.round(Math.max(12, Math.min((rect?.top ?? event.clientY) + 12, viewportHeight - 420)));
  return { left, top };
}

function scrollSelfEmploymentKanbanTodoIntoView(projectId: string, cardId: string, todoId: string): void {
  if (typeof document === "undefined") return;
  const selector = `[data-self-employment-kanban-todo-key="${cssEscape(`${projectId}:${cardId}:${todoId}`)}"]`;
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) return;
  element.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  element.classList.add("jump-highlight");
  globalThis.setTimeout(() => element.classList.remove("jump-highlight"), 900);
}

function cssEscape(value: string): string {
  const css = (globalThis as typeof globalThis & { CSS?: { escape?: (input: string) => string } }).CSS;
  return typeof css?.escape === "function" ? css.escape(value) : value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function closeSelfEmploymentTaskContextPopup(): void {
  selfEmploymentUiState.taskContextPopup = null;
  if (typeof document === "undefined") return;
  document.querySelector<HTMLElement>("[data-self-employment-task-context-popup]")?.remove();
}

function moveSelectedSelfEmploymentKanbanCardToColumn(column: HTMLElement): boolean {
  const selected = selfEmploymentUiState.kanbanSelectedCard;
  if (!selected) return false;
  const projectId = column.dataset.selfEmploymentProjectId || "";
  if (projectId && projectId !== selected.projectId) return false;
  const status = selfEmploymentKanbanStatusFromValue(column.dataset.selfEmploymentKanbanStatus);
  updateSelfEmploymentGanttTodoStatus(selected.projectId, selected.cardId, selected.todoId, status);
  return true;
}

function selfEmploymentKanbanColumnFromEvent(event: DragEvent): HTMLElement | null {
  return (event.target as HTMLElement | null)?.closest<HTMLElement>(".self-employment-kanban-column[data-self-employment-kanban-status]") ?? null;
}

function clearSelfEmploymentKanbanDragState(): void {
  selfEmploymentUiState.kanbanDrag = null;
  for (const element of document.querySelectorAll(".self-employment-kanban-column.drag-over, .self-employment-task-dashboard-item.dragging")) {
    element.classList.remove("drag-over", "dragging");
  }
}
