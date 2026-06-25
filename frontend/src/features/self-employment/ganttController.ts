import { businessIdeaCanvasNodeText } from "../../domain/businessIdeaCanvas";
import {
  SELF_EMPLOYMENT_EISENHOWER_QUADRANTS,
  buildSelfEmploymentProjectGantt,
  normalizeSelfEmploymentGanttPlan,
  normalizedGanttLabelId,
  orderedGanttLabels,
  selfEmploymentEisenhowerQuadrantDetails,
  selfEmploymentGanttLabelColor,
  visibleSelfEmploymentGanttRows,
  type SelfEmploymentGanttSummary
} from "../../domain/selfEmploymentGantt";
import { clamp, escapeHtml, intNumber } from "../../lib/format";
import type {
  BusinessIdeaCanvasShape,
  JsonCanvasNode,
  SelfEmploymentGanttCardPlan,
  SelfEmploymentGanttPhase,
  SelfEmploymentGanttTodo,
  SelfEmploymentProject
} from "../../types";
import { selfEmploymentUiState } from "./uiState";

interface SelfEmploymentGanttContext {
  selectedProjectId(): string;
  projectById(projectId: string): SelfEmploymentProject | null;
  updateProject(projectId: string, updater: (project: SelfEmploymentProject) => SelfEmploymentProject, renderAfterUpdate: boolean): void;
  renderAll(): void;
}

let ganttContext: SelfEmploymentGanttContext | null = null;

export function configureSelfEmploymentGantt(context: SelfEmploymentGanttContext): void {
  ganttContext = context;
}

function context(): SelfEmploymentGanttContext {
  if (!ganttContext) throw new Error("Self-employment Gantt context has not been configured.");
  return ganttContext;
}

const SELF_EMPLOYMENT_GANTT_POPOVER_MARGIN_PX = 12;
const SELF_EMPLOYMENT_GANTT_POPOVER_GAP_PX = 8;
const SELF_EMPLOYMENT_GANTT_POPOVER_WIDTH_PX = 560;
const SELF_EMPLOYMENT_GANTT_POPOVER_ESTIMATED_HEIGHT_PX = 420;
const SELF_EMPLOYMENT_GANTT_MIN_LABEL_WIDTH_PERCENT = 5.5;
const SELF_EMPLOYMENT_GANTT_MIN_CARD_WIDTH_PERCENT = 3.5;

function selfEmploymentGanttPopoverPosition(trigger: HTMLElement): { top: number; left: number } {
  const rect = trigger.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || SELF_EMPLOYMENT_GANTT_POPOVER_WIDTH_PX;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || SELF_EMPLOYMENT_GANTT_POPOVER_ESTIMATED_HEIGHT_PX;
  const popoverWidth = Math.min(
    SELF_EMPLOYMENT_GANTT_POPOVER_WIDTH_PX,
    Math.max(0, viewportWidth - SELF_EMPLOYMENT_GANTT_POPOVER_MARGIN_PX * 2)
  );
  const popoverHeight = Math.min(
    SELF_EMPLOYMENT_GANTT_POPOVER_ESTIMATED_HEIGHT_PX,
    Math.max(0, viewportHeight - SELF_EMPLOYMENT_GANTT_POPOVER_MARGIN_PX * 2)
  );
  const left = clamp(
    Math.round(rect.left),
    SELF_EMPLOYMENT_GANTT_POPOVER_MARGIN_PX,
    Math.max(SELF_EMPLOYMENT_GANTT_POPOVER_MARGIN_PX, viewportWidth - popoverWidth - SELF_EMPLOYMENT_GANTT_POPOVER_MARGIN_PX)
  );
  const belowTop = Math.round(rect.bottom + SELF_EMPLOYMENT_GANTT_POPOVER_GAP_PX);
  const aboveTop = Math.round(rect.top - popoverHeight - SELF_EMPLOYMENT_GANTT_POPOVER_GAP_PX);
  const fitsBelow = belowTop + popoverHeight <= viewportHeight - SELF_EMPLOYMENT_GANTT_POPOVER_MARGIN_PX;
  const maxTop = Math.max(SELF_EMPLOYMENT_GANTT_POPOVER_MARGIN_PX, viewportHeight - popoverHeight - SELF_EMPLOYMENT_GANTT_POPOVER_MARGIN_PX);
  return {
    top: clamp(fitsBelow ? belowTop : aboveTop, SELF_EMPLOYMENT_GANTT_POPOVER_MARGIN_PX, maxTop),
    left
  };
}

function selfEmploymentGanttEditorPosition(trigger: HTMLElement): { top: number; left: number } {
  const editor = selfEmploymentUiState.ganttEditor;
  if (editor && trigger.closest("[data-self-employment-gantt-popover]")) {
    return { top: editor.top, left: editor.left };
  }
  return selfEmploymentGanttPopoverPosition(trigger);
}

export function openSelfEmploymentGanttPhaseEditor(button: HTMLButtonElement): void {
  selfEmploymentUiState.ganttEditor = {
    projectId: button.dataset.selfEmploymentProjectId || context().selectedProjectId(),
    type: "phase",
    phaseId: button.dataset.selfEmploymentGanttPhaseId || "",
    ...selfEmploymentGanttEditorPosition(button)
  };
  context().renderAll();
}

export function openSelfEmploymentGanttCardEditor(button: HTMLButtonElement): void {
  selfEmploymentUiState.ganttEditor = {
    projectId: button.dataset.selfEmploymentProjectId || context().selectedProjectId(),
    type: "card",
    cardId: button.dataset.selfEmploymentGanttCardId || "",
    phaseId: button.dataset.selfEmploymentGanttPhaseId || undefined,
    labelId: button.dataset.selfEmploymentGanttLabelId || undefined,
    ...selfEmploymentGanttEditorPosition(button)
  };
  context().renderAll();
}

export function openSelfEmploymentGanttLabelEditor(button: HTMLButtonElement): void {
  selfEmploymentUiState.ganttEditor = {
    projectId: button.dataset.selfEmploymentProjectId || context().selectedProjectId(),
    type: "label",
    phaseId: button.dataset.selfEmploymentGanttPhaseId || "",
    labelId: button.dataset.selfEmploymentGanttLabelId || "",
    ...selfEmploymentGanttEditorPosition(button)
  };
  context().renderAll();
}

export function closeSelfEmploymentGanttEditor(): void {
  if (!selfEmploymentUiState.ganttEditor) return;
  selfEmploymentUiState.ganttEditor = null;
  document.querySelector<HTMLElement>("[data-self-employment-gantt-popover]")?.remove();
}

export function selfEmploymentGanttPhaseFilterIds(project: SelfEmploymentProject): string[] {
  const selectedIds = new Set(project.ganttPhaseFilterIds);
  return [...project.businessIdeaCanvasMeta.phases]
    .sort((a, b) => a.order - b.order)
    .map((phase) => phase.id)
    .filter((phaseId) => selectedIds.has(phaseId));
}

export function toggleSelfEmploymentGanttPhaseFilter(projectId: string, phaseId: string): void {
  const project = context().projectById(projectId);
  const phaseIds = project
    ? [...project.businessIdeaCanvasMeta.phases].sort((a, b) => a.order - b.order).map((phase) => phase.id)
    : [];
  if (!project || !phaseIds.includes(phaseId)) return;
  const selectedIds = new Set(selfEmploymentGanttPhaseFilterIds(project));
  if (selectedIds.has(phaseId)) {
    selectedIds.delete(phaseId);
  } else {
    selectedIds.add(phaseId);
  }
  const ganttPhaseFilterIds = phaseIds.filter((id) => selectedIds.has(id));
  context().updateProject(projectId, (item) => ({ ...item, ganttPhaseFilterIds }), true);
}

export function renderSelfEmploymentProjectGantt(project: SelfEmploymentProject): string {
  const summary = buildSelfEmploymentProjectGantt(project);
  const selectedPhaseIds = selfEmploymentGanttPhaseFilterIds(project);
  const visibleRows = visibleSelfEmploymentGanttRows(summary, selectedPhaseIds);
  const cardCount = project.businessIdeaCanvas.nodes.filter((node) => node.type !== "group").length;
  const activeRows = summary.rows.filter((row) => row.enabled && row.scheduledHours > 0).length;
  return `
    <div class="self-employment-project-gantt">
      <div class="self-employment-project-gantt-summary">
        <span><b>${escapeHtml(hoursLabel(summary.totalScheduledHours))}</b> geplant</span>
        <span><b>${escapeHtml(intNumber(cardCount))}</b> Karten</span>
        <span><b>${escapeHtml(hoursLabel(summary.projectSpanHours))}</b> Projektspanne</span>
        <span><b>${escapeHtml(intNumber(activeRows))}</b> aktive Phasen</span>
      </div>
      <div class="self-employment-project-gantt-head" aria-hidden="true">
        <span>Phase</span>
        <span>Stunden</span>
        <span>Projekt-Gantt</span>
      </div>
      <div class="self-employment-project-gantt-rows">
        ${visibleRows.map((row) => renderSelfEmploymentProjectGanttRow(project, row)).join("")}
      </div>
      ${renderSelfEmploymentGanttEditor(project, summary)}
    </div>
  `;
}

function renderSelfEmploymentProjectGanttRow(project: SelfEmploymentProject, row: SelfEmploymentGanttSummary["rows"][number]): string {
  const phaseNumber = selfEmploymentGanttPhaseNumber(row.phaseId);
  const labelSegments = row.labels
    .filter((label) => row.enabled && label.totalHours > 0)
    .map((label) => renderSelfEmploymentProjectGanttLabel(project, row, label))
    .join("");
  const emptyState = row.enabled ? "Keine Karten in dieser Phase" : "Phase inaktiv";
  const startLabel = row.startMode === "after_previous_label"
    ? `ab ${selfEmploymentGanttLabelName(project, row.triggerLabelId)}`
    : "manueller Start";
  return `
    <section class="self-employment-project-gantt-row${row.enabled ? "" : " disabled"}">
      <button
        class="self-employment-project-gantt-phase"
        type="button"
        data-action="self-employment-gantt-open-phase"
        data-self-employment-project-id="${escapeHtml(project.id)}"
        data-self-employment-gantt-phase-id="${escapeHtml(row.phaseId)}"
      >
        <span class="self-employment-project-gantt-phase-badge">${escapeHtml(phaseNumber)}</span>
        <span>
          <strong>${escapeHtml(row.phaseName)}</strong>
          <small>${escapeHtml(startLabel)}</small>
        </span>
      </button>
      <span class="self-employment-project-gantt-hours">
        <strong>${escapeHtml(hoursLabel(row.cardHours))}</strong>
        <small>${row.enabled ? "aktiv" : "inaktiv"}</small>
      </span>
      <div class="self-employment-project-gantt-track" aria-label="${escapeHtml(`${row.phaseName}: ${hoursLabel(row.cardHours)}`)}">
        ${labelSegments || `<span class="self-employment-project-gantt-empty">${escapeHtml(emptyState)}</span>`}
      </div>
    </section>
  `;
}

function renderSelfEmploymentProjectGanttLabel(
  project: SelfEmploymentProject,
  row: SelfEmploymentGanttSummary["rows"][number],
  label: SelfEmploymentGanttSummary["rows"][number]["labels"][number]
): string {
  const left = selfEmploymentGanttPercent(label.startPercent);
  const width = selfEmploymentGanttPercent(label.widthPercent);
  const condensed = selfEmploymentGanttLabelIsCondensed(label);
  const progressPercent = selfEmploymentGanttLabelProgressPercent(label);
  const progressStyle = selfEmploymentGanttProgressPercent(progressPercent);
  const cards = label.cards
    .map((card) => {
      const cardWidth = selfEmploymentGanttPercent(card.widthPercent);
      const cardProgress = selfEmploymentGanttProgressPercent(card.progressPercent);
      return `
        <button
          class="self-employment-project-gantt-card${card.completed ? " completed" : ""}"
          type="button"
          style="flex-basis: ${cardWidth}%; --self-employment-gantt-card-progress-percent: ${cardProgress}%;"
          data-action="self-employment-gantt-open-card"
          data-self-employment-project-id="${escapeHtml(project.id)}"
          data-self-employment-gantt-card-id="${escapeHtml(card.cardId)}"
          data-self-employment-gantt-phase-id="${escapeHtml(row.phaseId)}"
          data-self-employment-gantt-label-id="${escapeHtml(label.labelId)}"
          title="${escapeHtml(`${card.title} · ${hoursLabel(card.timeBudgetHours)}`)}"
        >
          <span>${escapeHtml(card.title)}</span>
          <small>${escapeHtml(`${hoursLabel(card.timeBudgetHours)} · ${Math.round(card.progressPercent)} %`)}</small>
        </button>
      `;
    })
    .join("");
  return `
    <div
      class="self-employment-project-gantt-label${condensed ? " condensed" : ""}"
      style="left: ${left}%; width: ${width}%; --self-employment-gantt-color: ${escapeHtml(selfEmploymentGanttLabelColor(label.labelId))}; --self-employment-gantt-progress-percent: ${progressStyle}%;"
      title="${escapeHtml(`${label.labelName}: ${hoursLabel(label.totalHours)}`)}"
    >
      <button
        class="self-employment-project-gantt-label-condensed"
        type="button"
        data-action="self-employment-gantt-open-label"
        data-self-employment-project-id="${escapeHtml(project.id)}"
        data-self-employment-gantt-phase-id="${escapeHtml(row.phaseId)}"
        data-self-employment-gantt-label-id="${escapeHtml(label.labelId)}"
        aria-label="${escapeHtml(`${label.labelName} Detailansicht oeffnen`)}"
      >
        <span>${escapeHtml(`${label.labelName} · ${hoursLabel(label.totalHours)}`)}</span>
        <small>${escapeHtml(`${intNumber(progressPercent)} % erledigt · ${intNumber(label.cards.length)} Karten`)}</small>
      </button>
      <div class="self-employment-project-gantt-label-standard">
        <div class="self-employment-project-gantt-label-head">
          <span>${escapeHtml(label.labelName)}</span>
          <strong>${escapeHtml(hoursLabel(label.totalHours))}</strong>
        </div>
        <div class="self-employment-project-gantt-cards">
          ${cards}
        </div>
      </div>
    </div>
  `;
}

function selfEmploymentGanttLabelProgressPercent(label: SelfEmploymentGanttSummary["rows"][number]["labels"][number]): number {
  if (label.totalHours <= 0) return 0;
  const completedHours = label.cards.reduce((sum, card) => sum + card.timeBudgetHours * (clamp(card.progressPercent, 0, 100) / 100), 0);
  return clamp(Math.round((completedHours / label.totalHours) * 100), 0, 100);
}

export function selfEmploymentGanttLabelIsCondensed(label: SelfEmploymentGanttSummary["rows"][number]["labels"][number]): boolean {
  if (label.cards.length === 0) return false;
  const visibleLabelWidth = selfEmploymentGanttVisibleWidthPercent(label.startPercent, label.widthPercent);
  const smallestAbsoluteCardWidth = Math.min(...label.cards.map((card) => (visibleLabelWidth * card.widthPercent) / 100));
  return (
    visibleLabelWidth < SELF_EMPLOYMENT_GANTT_MIN_LABEL_WIDTH_PERCENT ||
    smallestAbsoluteCardWidth < SELF_EMPLOYMENT_GANTT_MIN_CARD_WIDTH_PERCENT
  );
}

function selfEmploymentGanttVisibleWidthPercent(startPercent: number, widthPercent: number): number {
  const start = clamp(startPercent, 0, 100);
  const end = clamp(startPercent + widthPercent, 0, 100);
  return Math.max(0, end - start);
}

function renderSelfEmploymentGanttEditor(project: SelfEmploymentProject, summary: SelfEmploymentGanttSummary): string {
  if (selfEmploymentUiState.ganttEditor?.projectId !== project.id) return "";
  const positionAttributes = `style="left:${escapeHtml(selfEmploymentUiState.ganttEditor.left)}px;top:${escapeHtml(
    selfEmploymentUiState.ganttEditor.top
  )}px;" data-self-employment-gantt-popover`;
  if (selfEmploymentUiState.ganttEditor.type === "phase") {
    return renderSelfEmploymentGanttPhasePopover(project, summary, selfEmploymentUiState.ganttEditor.phaseId, positionAttributes);
  }
  if (selfEmploymentUiState.ganttEditor.type === "label") {
    return renderSelfEmploymentGanttLabelPopover(
      project,
      summary,
      selfEmploymentUiState.ganttEditor.phaseId,
      selfEmploymentUiState.ganttEditor.labelId,
      positionAttributes
    );
  }
  return renderSelfEmploymentGanttCardPopover(
    project,
    selfEmploymentUiState.ganttEditor.cardId,
    positionAttributes,
    selfEmploymentUiState.ganttEditor.phaseId,
    selfEmploymentUiState.ganttEditor.labelId
  );
}

function renderSelfEmploymentGanttPhasePopover(
  project: SelfEmploymentProject,
  summary: SelfEmploymentGanttSummary,
  phaseId: string,
  positionAttributes: string
): string {
  const gantt = normalizeSelfEmploymentGanttPlan(project.gantt, project.businessIdeaCanvas, project.businessIdeaCanvasMeta);
  const phase = gantt.phases.find((item) => item.phaseId === phaseId);
  const row = summary.rows.find((item) => item.phaseId === phaseId);
  if (!phase || !row) return "";
  const phaseOptions: Array<[string, string]> = [["", "Keine"], ...selfEmploymentGanttPhaseOptions(project, phase.phaseId)];
  const labelOptions = orderedGanttLabels(project.businessIdeaCanvasMeta).map((label) => [label.id, label.name] as [string, string]);
  return `
    <div class="self-employment-gantt-popover self-employment-gantt-phase-popover" ${positionAttributes} role="dialog" aria-label="${escapeHtml(`${row.phaseName} planen`)}">
      <header>
        <strong>${escapeHtml(row.phaseName)}</strong>
        <button class="icon-button" type="button" data-action="self-employment-gantt-close-editor" aria-label="Gantt-Editor schliessen">x</button>
      </header>
      <div class="self-employment-gantt-popover-summary">
        <span>${escapeHtml(hoursLabel(row.cardHours))} Kartenzeit</span>
        <span>${escapeHtml(hoursLabel(row.scheduledHours))} geplant</span>
      </div>
      <label class="field self-employment-gantt-check">
        <span>Aktiv</span>
        <input
          type="checkbox"
          ${phase.enabled ? "checked" : ""}
          data-self-employment-project-id="${escapeHtml(project.id)}"
          data-self-employment-gantt-phase-id="${escapeHtml(phase.phaseId)}"
          data-self-employment-gantt-phase-field="enabled"
        />
      </label>
      ${selfEmploymentGanttPhaseSelectField(project.id, phase, "startMode", "Startmodus", phase.startMode, [
        ["manual", "Manuell"],
        ["after_previous_label", "Nach Label der Vorphase"]
      ])}
      ${selfEmploymentGanttPhaseSelectField(
        project.id,
        phase,
        "triggerPreviousPhaseId",
        "Vorgaengerphase",
        phase.triggerPreviousPhaseId ?? "",
        phaseOptions
      )}
      ${selfEmploymentGanttPhaseSelectField(project.id, phase, "triggerLabelId", "Start ab Label", phase.triggerLabelId ?? "goal", labelOptions)}
    </div>
  `;
}

function renderSelfEmploymentGanttLabelPopover(
  project: SelfEmploymentProject,
  summary: SelfEmploymentGanttSummary,
  phaseId: string,
  labelId: string,
  positionAttributes: string
): string {
  const row = summary.rows.find((item) => item.phaseId === phaseId);
  const label = row?.labels.find((item) => item.labelId === labelId);
  if (!row || !label) return "";
  let cursor = label.startHour;
  const cards = label.cards.map((card) => {
    const startHour = cursor;
    const endHour = startHour + card.timeBudgetHours;
    cursor = endHour;
    return { ...card, startHour, endHour };
  });
  return `
    <div class="self-employment-gantt-popover self-employment-gantt-label-popover" ${positionAttributes} role="dialog" aria-label="${escapeHtml(`${label.labelName} Details`)}">
      <header>
        <div>
          <span>${escapeHtml(row.phaseName)}</span>
          <strong>${escapeHtml(label.labelName)}</strong>
        </div>
        <button class="icon-button" type="button" data-action="self-employment-gantt-close-editor" aria-label="Gantt-Details schliessen">x</button>
      </header>
      <div class="self-employment-gantt-popover-summary">
        <span>${escapeHtml(`${intNumber(cards.length)} Karten`)}</span>
        <span>${escapeHtml(hoursLabel(label.totalHours))}</span>
        <span>${escapeHtml(`${hoursLabel(label.startHour)} bis ${hoursLabel(label.startHour + label.totalHours)}`)}</span>
      </div>
      <div class="self-employment-gantt-label-detail-list">
        ${cards
          .map((card) =>
            renderSelfEmploymentGanttLabelDetailCard(
              project,
              row.phaseId,
              row.phaseName,
              label.labelId,
              label.labelName,
              selfEmploymentGanttLabelColor(label.labelId),
              card
            )
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderSelfEmploymentGanttLabelDetailCard(
  project: SelfEmploymentProject,
  phaseId: string,
  phaseName: string,
  labelId: string,
  labelName: string,
  labelColor: string,
  card: SelfEmploymentGanttSummary["rows"][number]["labels"][number]["cards"][number] & { startHour: number; endHour: number }
): string {
  const status = card.completed
    ? "Erledigt"
    : card.todoCount > 0
      ? `${intNumber(card.completedTodoCount)}/${intNumber(card.todoCount)} Todos`
      : "Geplant";
  return `
    <button
      class="self-employment-gantt-label-detail-card${card.completed ? " completed" : ""}"
      type="button"
      data-action="self-employment-gantt-open-card"
      data-self-employment-project-id="${escapeHtml(project.id)}"
      data-self-employment-gantt-card-id="${escapeHtml(card.cardId)}"
      data-self-employment-gantt-phase-id="${escapeHtml(phaseId)}"
      data-self-employment-gantt-label-id="${escapeHtml(labelId)}"
      style="--self-employment-gantt-color:${escapeHtml(labelColor)};"
    >
      <span class="self-employment-gantt-label-detail-title">${escapeHtml(card.title)}</span>
      <span>${escapeHtml(labelName)}</span>
      <span>${escapeHtml(phaseName)}</span>
      <span>${escapeHtml(hoursLabel(card.timeBudgetHours))}</span>
      <span>${escapeHtml(status)}</span>
      <span>${escapeHtml(`${hoursLabel(card.startHour)} - ${hoursLabel(card.endHour)}`)}</span>
    </button>
  `;
}

function renderSelfEmploymentGanttCardPopover(
  project: SelfEmploymentProject,
  cardId: string,
  positionAttributes: string,
  contextPhaseId?: string,
  contextLabelId?: string
): string {
  const node = project.businessIdeaCanvas.nodes.find((item) => item.id === cardId && item.type !== "group");
  if (!node) return "";
  const gantt = normalizeSelfEmploymentGanttPlan(project.gantt, project.businessIdeaCanvas, project.businessIdeaCanvasMeta);
  const plan = gantt.cardPlans.find((item) => item.cardId === cardId);
  if (!plan) return "";
  const nodeMeta = project.businessIdeaCanvasMeta.nodeMeta[cardId] ?? {
    labelId: project.businessIdeaCanvasMeta.activeLabelId,
    phaseId: project.businessIdeaCanvasMeta.activePhaseId,
    shape: "rounded-rectangle" as BusinessIdeaCanvasShape
  };
  const activePhaseId = contextPhaseId || nodeMeta.phaseId;
  const activeLabelId = normalizedGanttLabelId(contextLabelId || nodeMeta.labelId);
  const activeLabelName = selfEmploymentGanttLabelName(project, activeLabelId);
  const activePhaseName =
    [...project.businessIdeaCanvasMeta.phases].find((phase) => phase.id === activePhaseId)?.name ?? "Phase";
  const labelOptions = orderedGanttLabels(project.businessIdeaCanvasMeta).map((label) => [label.id, label.name] as [string, string]);
  const phaseOptions = selfEmploymentGanttPhaseOptions(project);
  const completedTodos = plan.todos.filter((todo) => todo.completed).length;
  return `
    <div class="self-employment-gantt-popover self-employment-gantt-card-popover" ${positionAttributes} role="dialog" aria-label="${escapeHtml(`${selfEmploymentGanttNodeTitle(node)} planen`)}">
      <header>
        <div class="self-employment-gantt-popover-title">
          <span>${escapeHtml(`${activePhaseName} · ${activeLabelName}`)}</span>
          <strong>${escapeHtml(selfEmploymentGanttNodeTitle(node))}</strong>
        </div>
        <div class="self-employment-gantt-popover-actions">
          <button
            class="button mini secondary"
            type="button"
            data-action="self-employment-gantt-open-label"
            data-self-employment-project-id="${escapeHtml(project.id)}"
            data-self-employment-gantt-phase-id="${escapeHtml(activePhaseId)}"
            data-self-employment-gantt-label-id="${escapeHtml(activeLabelId)}"
          >Label</button>
          <button class="icon-button" type="button" data-action="self-employment-gantt-close-editor" aria-label="Gantt-Editor schliessen">x</button>
        </div>
      </header>
      <div class="self-employment-gantt-popover-summary">
        <span>${escapeHtml(`${completedTodos}/${plan.todos.length} Todos erledigt`)}</span>
        <span>${escapeHtml(`${Math.round(plan.todos.length > 0 ? (completedTodos / plan.todos.length) * 100 : plan.completed ? 100 : 0)} % Fortschritt`)}</span>
      </div>
      ${selfEmploymentGanttCardNumberField(project.id, plan, "timeBudgetHours", "Stundenbudget", plan.timeBudgetHours)}
      ${selfEmploymentGanttCardSelectField(project.id, plan.cardId, "labelId", "Label", normalizedGanttLabelId(nodeMeta.labelId), labelOptions)}
      ${selfEmploymentGanttCardSelectField(project.id, plan.cardId, "phaseId", "Phase", nodeMeta.phaseId, phaseOptions)}
      <label class="self-employment-gantt-status-switch">
        <span>Nicht erledigt</span>
        <input
          type="checkbox"
          ${plan.completed ? "checked" : ""}
          data-self-employment-project-id="${escapeHtml(project.id)}"
          data-self-employment-gantt-card-id="${escapeHtml(plan.cardId)}"
          data-self-employment-gantt-card-field="completed"
        />
        <span>Erledigt</span>
      </label>
      <div class="self-employment-gantt-todos">
        <div class="self-employment-gantt-todos-head">
          <span>Todos</span>
          <button class="button mini secondary" type="button" data-action="self-employment-gantt-add-todo" data-self-employment-project-id="${escapeHtml(project.id)}" data-self-employment-gantt-card-id="${escapeHtml(plan.cardId)}">+</button>
        </div>
        <div class="self-employment-gantt-todo-list">
          ${plan.todos.map((todo) => selfEmploymentGanttTodoRow(project.id, plan.cardId, todo)).join("")}
        </div>
      </div>
    </div>
  `;
}

export function selfEmploymentGanttPhaseNumberField(
  projectId: string,
  phase: SelfEmploymentGanttPhase,
  field: keyof SelfEmploymentGanttPhase,
  label: string,
  value: number
): string {
  return `
    <label class="field self-employment-edit-field">
      <span>${escapeHtml(label)}</span>
      <input
        type="number"
        min="0"
        max="100000"
        step="0.25"
        value="${escapeHtml(value)}"
        data-self-employment-project-id="${escapeHtml(projectId)}"
        data-self-employment-gantt-phase-id="${escapeHtml(phase.phaseId)}"
        data-self-employment-gantt-phase-field="${escapeHtml(field)}"
      />
    </label>
  `;
}

function selfEmploymentGanttPhaseSelectField(
  projectId: string,
  phase: SelfEmploymentGanttPhase,
  field: keyof SelfEmploymentGanttPhase,
  label: string,
  value: string,
  options: Array<[string, string]>
): string {
  return `
    <label class="field self-employment-edit-field">
      <span>${escapeHtml(label)}</span>
      <select
        data-self-employment-project-id="${escapeHtml(projectId)}"
        data-self-employment-gantt-phase-id="${escapeHtml(phase.phaseId)}"
        data-self-employment-gantt-phase-field="${escapeHtml(field)}"
      >
        ${options.map(([optionValue, optionLabel]) => selfEmploymentOption(optionValue, optionLabel, value)).join("")}
      </select>
    </label>
  `;
}

function selfEmploymentGanttCardNumberField(
  projectId: string,
  plan: SelfEmploymentGanttCardPlan,
  field: keyof SelfEmploymentGanttCardPlan,
  label: string,
  value: number
): string {
  return `
    <label class="field self-employment-edit-field">
      <span>${escapeHtml(label)}</span>
      <input
        type="number"
        min="0"
        max="100000"
        step="0.25"
        value="${escapeHtml(value)}"
        data-self-employment-project-id="${escapeHtml(projectId)}"
        data-self-employment-gantt-card-id="${escapeHtml(plan.cardId)}"
        data-self-employment-gantt-card-field="${escapeHtml(field)}"
      />
    </label>
  `;
}

function selfEmploymentGanttTodoRow(projectId: string, cardId: string, todo: SelfEmploymentGanttTodo): string {
  return `
    <div class="self-employment-gantt-todo-row${todo.completed ? " completed" : ""}">
      <label class="self-employment-gantt-todo-check" title="Todo erledigt">
        <input
          type="checkbox"
          ${todo.completed ? "checked" : ""}
          data-self-employment-project-id="${escapeHtml(projectId)}"
          data-self-employment-gantt-card-id="${escapeHtml(cardId)}"
          data-self-employment-gantt-todo-id="${escapeHtml(todo.id)}"
          data-self-employment-gantt-todo-field="completed"
        />
      </label>
      <div class="self-employment-gantt-todo-body">
        <div class="self-employment-gantt-todo-meta">
          ${selfEmploymentGanttTodoEisenhowerButtons(projectId, cardId, todo)}
          <span>${escapeHtml(todo.status === "done" ? "Erledigt" : todo.status === "in_progress" ? "In Arbeit" : "Geplant")}</span>
        </div>
        <input
          type="text"
          value="${escapeHtml(todo.title)}"
          aria-label="Todo"
          data-self-employment-project-id="${escapeHtml(projectId)}"
          data-self-employment-gantt-card-id="${escapeHtml(cardId)}"
          data-self-employment-gantt-todo-id="${escapeHtml(todo.id)}"
          data-self-employment-gantt-todo-field="title"
        />
      </div>
      <div class="self-employment-gantt-todo-actions">
        <button
          class="icon-button"
          type="button"
          data-action="self-employment-gantt-add-todo"
          data-self-employment-project-id="${escapeHtml(projectId)}"
          data-self-employment-gantt-card-id="${escapeHtml(cardId)}"
          data-self-employment-gantt-todo-id="${escapeHtml(todo.id)}"
          aria-label="Todo hinzufuegen"
          title="Todo hinzufuegen"
        >+</button>
        <button
          class="icon-button danger"
          type="button"
          data-action="self-employment-gantt-remove-todo"
          data-self-employment-project-id="${escapeHtml(projectId)}"
          data-self-employment-gantt-card-id="${escapeHtml(cardId)}"
          data-self-employment-gantt-todo-id="${escapeHtml(todo.id)}"
          aria-label="Todo loeschen"
          title="Todo loeschen"
        >x</button>
      </div>
    </div>
  `;
}

function selfEmploymentGanttTodoEisenhowerButtons(projectId: string, cardId: string, todo: SelfEmploymentGanttTodo): string {
  return `
    <div class="self-employment-gantt-eisenhower-buttons" role="group" aria-label="Eisenhower-Quadrant">
      ${SELF_EMPLOYMENT_EISENHOWER_QUADRANTS.map((quadrant) => {
        const detail = selfEmploymentEisenhowerQuadrantDetails(quadrant);
        const active = todo.eisenhowerQuadrant === quadrant;
        return `
          <button
            class="self-employment-eisenhower-button ${escapeHtml(quadrant)}${active ? " active" : ""}"
            type="button"
            title="${escapeHtml(`${detail.label}: ${detail.action}`)}"
            data-action="self-employment-set-gantt-todo-eisenhower"
            data-self-employment-project-id="${escapeHtml(projectId)}"
            data-self-employment-gantt-card-id="${escapeHtml(cardId)}"
            data-self-employment-gantt-todo-id="${escapeHtml(todo.id)}"
            data-self-employment-eisenhower-quadrant="${escapeHtml(quadrant)}"
            aria-pressed="${active}"
          >${escapeHtml(detail.shortLabel)}</button>
        `;
      }).join("")}
    </div>
  `;
}

function selfEmploymentGanttCardSelectField(
  projectId: string,
  cardId: string,
  field: "labelId" | "phaseId",
  label: string,
  value: string,
  options: Array<[string, string]>
): string {
  return `
    <label class="field self-employment-edit-field">
      <span>${escapeHtml(label)}</span>
      <select
        data-self-employment-project-id="${escapeHtml(projectId)}"
        data-self-employment-gantt-card-id="${escapeHtml(cardId)}"
        data-self-employment-gantt-card-field="${escapeHtml(field)}"
      >
        ${options.map(([optionValue, optionLabel]) => selfEmploymentOption(optionValue, optionLabel, value)).join("")}
      </select>
    </label>
  `;
}

function selfEmploymentGanttPhaseOptions(project: SelfEmploymentProject, excludedPhaseId?: string): Array<[string, string]> {
  return [...project.businessIdeaCanvasMeta.phases]
    .sort((a, b) => a.order - b.order)
    .filter((phase) => phase.id !== excludedPhaseId)
    .map((phase) => [phase.id, phase.name] as [string, string]);
}

function selfEmploymentGanttLabelName(project: SelfEmploymentProject, labelId: string | null): string {
  const normalized = normalizedGanttLabelId(labelId || "goal");
  return orderedGanttLabels(project.businessIdeaCanvasMeta).find((label) => label.id === normalized)?.name ?? "Ziel";
}

function selfEmploymentGanttNodeTitle(node: JsonCanvasNode): string {
  return businessIdeaCanvasNodeText(node).trim().split("\n")[0] || "Karte";
}

export function selfEmploymentGanttPhaseNumber(phaseId: string): string {
  const match = /^phase-(\d+)$/.exec(phaseId);
  return match?.[1] ?? phaseId;
}

function selfEmploymentGanttPercent(value: number): string {
  return String(Math.round(clamp(value, 0, 100) * 1000) / 1000);
}

function selfEmploymentGanttProgressPercent(value: number): string {
  return String(Math.round(clamp(value, 0, 100) * 10) / 10);
}

function selfEmploymentOption(value: string, label: string, selectedValue: string): string {
  return `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function hoursLabel(value: number): string {
  return `${intNumber(value)} h`;
}
