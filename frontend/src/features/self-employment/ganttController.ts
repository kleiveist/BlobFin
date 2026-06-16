import { businessIdeaCanvasNodeText } from "../../domain/businessIdeaCanvas";
import {
  buildSelfEmploymentProjectGantt,
  normalizeSelfEmploymentGanttPlan,
  normalizedGanttLabelId,
  orderedGanttLabels,
  visibleSelfEmploymentGanttRows,
  type SelfEmploymentGanttSummary
} from "../../domain/selfEmploymentGantt";
import { clamp, escapeHtml, intNumber } from "../../lib/format";
import type {
  BusinessIdeaCanvasShape,
  JsonCanvasNode,
  SelfEmploymentGanttCardPlan,
  SelfEmploymentGanttPhase,
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

export function openSelfEmploymentGanttPhaseEditor(button: HTMLButtonElement): void {
  selfEmploymentUiState.ganttEditor = {
    projectId: button.dataset.selfEmploymentProjectId || context().selectedProjectId(),
    type: "phase",
    phaseId: button.dataset.selfEmploymentGanttPhaseId || "",
    ...selfEmploymentGanttPopoverPosition(button)
  };
  context().renderAll();
}

export function openSelfEmploymentGanttCardEditor(button: HTMLButtonElement): void {
  selfEmploymentUiState.ganttEditor = {
    projectId: button.dataset.selfEmploymentProjectId || context().selectedProjectId(),
    type: "card",
    cardId: button.dataset.selfEmploymentGanttCardId || "",
    ...selfEmploymentGanttPopoverPosition(button)
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
    .map((label) => renderSelfEmploymentProjectGanttLabel(project, label))
    .join("");
  const emptyState = row.enabled ? "Keine Karten in dieser Phase" : "Phase inaktiv";
  const startLabel = row.startMode === "after_previous_label"
    ? `ab ${selfEmploymentGanttLabelName(project, row.triggerLabelId)}`
    : (row.startDate ? `Start ${row.startDate}` : "manueller Start");
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
  label: SelfEmploymentGanttSummary["rows"][number]["labels"][number]
): string {
  const left = selfEmploymentGanttPercent(label.startPercent);
  const width = selfEmploymentGanttPercent(label.widthPercent);
  const cards = label.cards
    .map((card) => {
      const cardWidth = selfEmploymentGanttPercent(card.widthPercent);
      return `
        <button
          class="self-employment-project-gantt-card"
          type="button"
          style="flex-basis: ${cardWidth}%;"
          data-action="self-employment-gantt-open-card"
          data-self-employment-project-id="${escapeHtml(project.id)}"
          data-self-employment-gantt-card-id="${escapeHtml(card.cardId)}"
          title="${escapeHtml(`${card.title} · ${hoursLabel(card.timeBudgetHours)}`)}"
        >
          <span>${escapeHtml(card.title)}</span>
          <small>${escapeHtml(hoursLabel(card.timeBudgetHours))}</small>
        </button>
      `;
    })
    .join("");
  return `
    <div
      class="self-employment-project-gantt-label"
      style="left: ${left}%; width: ${width}%; --self-employment-gantt-color: ${escapeHtml(selfEmploymentGanttColor(label.color))};"
      title="${escapeHtml(`${label.labelName}: ${hoursLabel(label.totalHours)}`)}"
    >
      <div class="self-employment-project-gantt-label-head">
        <span>${escapeHtml(label.labelName)}</span>
        <strong>${escapeHtml(hoursLabel(label.totalHours))}</strong>
      </div>
      <div class="self-employment-project-gantt-cards">
        ${cards}
      </div>
    </div>
  `;
}

function renderSelfEmploymentGanttEditor(project: SelfEmploymentProject, summary: SelfEmploymentGanttSummary): string {
  if (selfEmploymentUiState.ganttEditor?.projectId !== project.id) return "";
  const positionAttributes = `style="left:${escapeHtml(selfEmploymentUiState.ganttEditor.left)}px;top:${escapeHtml(
    selfEmploymentUiState.ganttEditor.top
  )}px;" data-self-employment-gantt-popover`;
  if (selfEmploymentUiState.ganttEditor.type === "phase") {
    return renderSelfEmploymentGanttPhasePopover(project, summary, selfEmploymentUiState.ganttEditor.phaseId, positionAttributes);
  }
  return renderSelfEmploymentGanttCardPopover(project, selfEmploymentUiState.ganttEditor.cardId, positionAttributes);
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
      ${selfEmploymentGanttPhaseTextField(project.id, phase, "startDate", "Startdatum", phase.startDate ?? "", "date")}
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
      ${selfEmploymentGanttPhaseNumberField(project.id, phase, "defaultTimeBudgetHours", "Default-Stunden je Karte", phase.defaultTimeBudgetHours)}
    </div>
  `;
}

function renderSelfEmploymentGanttCardPopover(project: SelfEmploymentProject, cardId: string, positionAttributes: string): string {
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
  const labelOptions = orderedGanttLabels(project.businessIdeaCanvasMeta).map((label) => [label.id, label.name] as [string, string]);
  const phaseOptions = selfEmploymentGanttPhaseOptions(project);
  return `
    <div class="self-employment-gantt-popover self-employment-gantt-card-popover" ${positionAttributes} role="dialog" aria-label="${escapeHtml(`${selfEmploymentGanttNodeTitle(node)} planen`)}">
      <header>
        <strong>${escapeHtml(selfEmploymentGanttNodeTitle(node))}</strong>
        <button class="icon-button" type="button" data-action="self-employment-gantt-close-editor" aria-label="Gantt-Editor schliessen">x</button>
      </header>
      ${selfEmploymentGanttCardNumberField(project.id, plan, "timeBudgetHours", "Stundenbudget", plan.timeBudgetHours)}
      ${selfEmploymentGanttCardTextField(project.id, plan, "startDate", "Startdatum", plan.startDate ?? "", "date")}
      ${selfEmploymentGanttCardSelectField(project.id, plan.cardId, "labelId", "Label", normalizedGanttLabelId(nodeMeta.labelId), labelOptions)}
      ${selfEmploymentGanttCardSelectField(project.id, plan.cardId, "phaseId", "Phase", nodeMeta.phaseId, phaseOptions)}
      <label class="field self-employment-edit-field wide">
        <span>Notiz</span>
        <textarea
          rows="3"
          data-self-employment-project-id="${escapeHtml(project.id)}"
          data-self-employment-gantt-card-id="${escapeHtml(plan.cardId)}"
          data-self-employment-gantt-card-field="note"
        >${escapeHtml(plan.note)}</textarea>
      </label>
    </div>
  `;
}

function selfEmploymentGanttPhaseTextField(
  projectId: string,
  phase: SelfEmploymentGanttPhase,
  field: keyof SelfEmploymentGanttPhase,
  label: string,
  value: string,
  type = "text"
): string {
  return `
    <label class="field self-employment-edit-field">
      <span>${escapeHtml(label)}</span>
      <input
        type="${escapeHtml(type)}"
        value="${escapeHtml(value)}"
        data-self-employment-project-id="${escapeHtml(projectId)}"
        data-self-employment-gantt-phase-id="${escapeHtml(phase.phaseId)}"
        data-self-employment-gantt-phase-field="${escapeHtml(field)}"
      />
    </label>
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

function selfEmploymentGanttCardTextField(
  projectId: string,
  plan: SelfEmploymentGanttCardPlan,
  field: keyof SelfEmploymentGanttCardPlan,
  label: string,
  value: string,
  type = "text"
): string {
  return `
    <label class="field self-employment-edit-field">
      <span>${escapeHtml(label)}</span>
      <input
        type="${escapeHtml(type)}"
        value="${escapeHtml(value)}"
        data-self-employment-project-id="${escapeHtml(projectId)}"
        data-self-employment-gantt-card-id="${escapeHtml(plan.cardId)}"
        data-self-employment-gantt-card-field="${escapeHtml(field)}"
      />
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

function selfEmploymentGanttColor(color: string): string {
  if (/^#[0-9a-f]{3,8}$/i.test(color)) return color;
  if (color === "1") return "var(--danger)";
  if (color === "2") return "var(--gold)";
  if (color === "3") return "#eab308";
  if (color === "4") return "var(--accent)";
  if (color === "5") return "#2563eb";
  if (color === "6") return "#7c3aed";
  return "var(--accent)";
}

function selfEmploymentOption(value: string, label: string, selectedValue: string): string {
  return `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function hoursLabel(value: number): string {
  return `${intNumber(value)} h`;
}
