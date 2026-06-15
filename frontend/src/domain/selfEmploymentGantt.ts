import { businessIdeaCanvasCardNodes, businessIdeaCanvasNodeText } from "./businessIdeaCanvas";
import type {
  BusinessIdeaCanvas,
  BusinessIdeaCanvasLabel,
  BusinessIdeaCanvasMeta,
  BusinessIdeaCanvasPhase,
  JsonCanvasNode,
  SelfEmploymentGanttCardPlan,
  SelfEmploymentGanttPhase,
  SelfEmploymentGanttPlan,
  SelfEmploymentGanttStartMode,
  SelfEmploymentProject
} from "../types";

export const SELF_EMPLOYMENT_GANTT_DEFAULT_TIME_BUDGET_HOURS = 1;
export const SELF_EMPLOYMENT_GANTT_LABEL_ORDER = ["idea", "knowledge", "start", "implementation", "goal"] as const;

export interface SelfEmploymentGanttCardSegment {
  cardId: string;
  title: string;
  timeBudgetHours: number;
  widthPercent: number;
  startDate: string | null;
  note: string;
}

export interface SelfEmploymentGanttLabelSegment {
  labelId: string;
  labelName: string;
  color: string;
  totalHours: number;
  startHour: number;
  startPercent: number;
  widthPercent: number;
  cards: SelfEmploymentGanttCardSegment[];
}

export interface SelfEmploymentGanttPhaseRow {
  phaseId: string;
  phaseName: string;
  enabled: boolean;
  startDate: string | null;
  startMode: SelfEmploymentGanttStartMode;
  triggerPreviousPhaseId: string | null;
  triggerLabelId: string | null;
  defaultTimeBudgetHours: number;
  cardHours: number;
  scheduledHours: number;
  startHour: number;
  endHour: number;
  startPercent: number;
  widthPercent: number;
  labels: SelfEmploymentGanttLabelSegment[];
}

export interface SelfEmploymentGanttSummary {
  totalScheduledHours: number;
  totalCardHours: number;
  projectSpanHours: number;
  rows: SelfEmploymentGanttPhaseRow[];
}

interface PendingPhaseRow {
  phase: BusinessIdeaCanvasPhase;
  settings: SelfEmploymentGanttPhase;
  cardHours: number;
  labels: Array<Omit<SelfEmploymentGanttLabelSegment, "startHour" | "startPercent" | "widthPercent">>;
}

const CANONICAL_GANTT_LABELS: BusinessIdeaCanvasLabel[] = [
  { id: "idea", name: "Idee", color: "1" },
  { id: "knowledge", name: "Wissen", color: "3" },
  { id: "start", name: "Start", color: "4" },
  { id: "implementation", name: "Umsetzung", color: "2" },
  { id: "goal", name: "Ziel", color: "5" }
];

export function defaultSelfEmploymentGanttPlan(canvas: BusinessIdeaCanvas, meta: BusinessIdeaCanvasMeta): SelfEmploymentGanttPlan {
  return normalizeSelfEmploymentGanttPlan({}, canvas, meta);
}

export function normalizeSelfEmploymentGanttPlan(
  value: unknown,
  canvas: BusinessIdeaCanvas,
  meta: BusinessIdeaCanvasMeta
): SelfEmploymentGanttPlan {
  const source = isRecord(value) ? value : {};
  const rawPhases = Array.isArray(source.phases) ? source.phases.filter(isRecord) : [];
  const rawCards = Array.isArray(source.cardPlans) ? source.cardPlans.filter(isRecord) : [];
  const rawPhaseById = new Map(rawPhases.map((phase) => [String(phase.phaseId || ""), phase]));
  const rawCardById = new Map(rawCards.map((card) => [String(card.cardId || ""), card]));
  const phases = orderedPhases(meta).map((phase, index, allPhases) =>
    normalizeGanttPhase(rawPhaseById.get(phase.id), phase, allPhases[index - 1]?.id ?? null)
  );
  const phasesById = new Map(phases.map((phase) => [phase.phaseId, phase]));
  const cardPlans = businessIdeaCanvasCardNodes(canvas).map((node) => {
    const raw = rawCardById.get(node.id);
    const nodeMeta = meta.nodeMeta[node.id];
    const phaseDefault = phasesById.get(nodeMeta?.phaseId ?? meta.activePhaseId)?.defaultTimeBudgetHours
      ?? SELF_EMPLOYMENT_GANTT_DEFAULT_TIME_BUDGET_HOURS;
    return normalizeGanttCardPlan(raw, node.id, phaseDefault);
  });
  return { phases, cardPlans };
}

export function buildSelfEmploymentProjectGantt(project: SelfEmploymentProject): SelfEmploymentGanttSummary {
  const gantt = normalizeSelfEmploymentGanttPlan(project.gantt, project.businessIdeaCanvas, project.businessIdeaCanvasMeta);
  const labels = orderedGanttLabels(project.businessIdeaCanvasMeta);
  const labelIds = new Set(labels.map((label) => label.id));
  const phases = orderedPhases(project.businessIdeaCanvasMeta);
  const phaseIds = new Set(phases.map((phase) => phase.id));
  const plansByCardId = new Map(gantt.cardPlans.map((plan) => [plan.cardId, plan]));
  const settingsByPhaseId = new Map(gantt.phases.map((phase) => [phase.phaseId, phase]));
  const cardsByPhaseAndLabel = new Map<string, JsonCanvasNode[]>();
  const defaultLabelId = labelIds.has(normalizedGanttLabelId(project.businessIdeaCanvasMeta.activeLabelId))
    ? normalizedGanttLabelId(project.businessIdeaCanvasMeta.activeLabelId)
    : labels[0]?.id ?? "idea";
  const defaultPhaseId = phaseIds.has(project.businessIdeaCanvasMeta.activePhaseId)
    ? project.businessIdeaCanvasMeta.activePhaseId
    : phases[0]?.id ?? "phase-1";

  for (const node of businessIdeaCanvasCardNodes(project.businessIdeaCanvas)) {
    const nodeMeta = project.businessIdeaCanvasMeta.nodeMeta[node.id];
    const labelId = normalizedGanttLabelId(nodeMeta?.labelId);
    const key = phaseLabelKey(
      nodeMeta?.phaseId && phaseIds.has(nodeMeta.phaseId) ? nodeMeta.phaseId : defaultPhaseId,
      labelIds.has(labelId) ? labelId : defaultLabelId
    );
    cardsByPhaseAndLabel.set(key, [...(cardsByPhaseAndLabel.get(key) ?? []), node]);
  }

  const pendingRows: PendingPhaseRow[] = phases.map((phase) => {
    const settings = settingsByPhaseId.get(phase.id) ?? normalizeGanttPhase(null, phase, null);
    const labelSegments = labels.map((label) => {
      const cards = cardsByPhaseAndLabel.get(phaseLabelKey(phase.id, label.id)) ?? [];
      const cardSegments = cards.map((node) => {
        const plan = plansByCardId.get(node.id) ?? normalizeGanttCardPlan(null, node.id, settings.defaultTimeBudgetHours);
        return {
          cardId: node.id,
          title: businessIdeaCanvasNodeText(node),
          timeBudgetHours: plan.timeBudgetHours,
          widthPercent: 0,
          startDate: plan.startDate,
          note: plan.note
        };
      });
      const totalHours = cardSegments.reduce((sum, card) => sum + card.timeBudgetHours, 0);
      return {
        labelId: label.id,
        labelName: label.name,
        color: label.color,
        totalHours,
        cards: cardSegments.map((card) => ({
          ...card,
          widthPercent: totalHours > 0 ? (card.timeBudgetHours / totalHours) * 100 : 0
        }))
      };
    });
    return {
      phase,
      settings,
      cardHours: labelSegments.reduce((sum, label) => sum + label.totalHours, 0),
      labels: labelSegments
    };
  });

  const builtRows: Array<Omit<SelfEmploymentGanttPhaseRow, "startPercent" | "widthPercent" | "labels"> & {
    labels: Array<Omit<SelfEmploymentGanttLabelSegment, "startPercent" | "widthPercent">>;
  }> = [];

  for (const pending of pendingRows) {
    const previousRow = builtRows[builtRows.length - 1] ?? null;
    const dependencyRow = pending.settings.startMode === "after_previous_label" && pending.settings.triggerPreviousPhaseId
      ? builtRows.find((row) => row.phaseId === pending.settings.triggerPreviousPhaseId) ?? null
      : null;
    const startHour = pending.settings.enabled
      ? dependencyStartHour(dependencyRow, pending.settings.triggerLabelId) ?? previousRow?.endHour ?? 0
      : previousRow?.endHour ?? 0;
    let labelStartHour = startHour;
    const labelsWithStarts = pending.labels.map((label) => {
      const next = { ...label, startHour: labelStartHour };
      labelStartHour += pending.settings.enabled ? label.totalHours : 0;
      return next;
    });
    const scheduledHours = pending.settings.enabled ? pending.cardHours : 0;
    builtRows.push({
      phaseId: pending.phase.id,
      phaseName: pending.phase.name,
      enabled: pending.settings.enabled,
      startDate: pending.settings.startDate,
      startMode: pending.settings.startMode,
      triggerPreviousPhaseId: pending.settings.triggerPreviousPhaseId,
      triggerLabelId: pending.settings.triggerLabelId,
      defaultTimeBudgetHours: pending.settings.defaultTimeBudgetHours,
      cardHours: pending.cardHours,
      scheduledHours,
      startHour,
      endHour: startHour + scheduledHours,
      labels: labelsWithStarts
    });
  }

  const projectSpanHours = Math.max(1, ...builtRows.map((row) => row.endHour));
  const rows = builtRows.map((row) => ({
    ...row,
    startPercent: (row.startHour / projectSpanHours) * 100,
    widthPercent: (row.scheduledHours / projectSpanHours) * 100,
    labels: row.labels.map((label) => ({
      ...label,
      startPercent: (label.startHour / projectSpanHours) * 100,
      widthPercent: row.enabled ? (label.totalHours / projectSpanHours) * 100 : 0
    }))
  }));

  return {
    totalScheduledHours: rows.reduce((sum, row) => sum + row.scheduledHours, 0),
    totalCardHours: rows.reduce((sum, row) => sum + row.cardHours, 0),
    projectSpanHours,
    rows
  };
}

export function visibleSelfEmploymentGanttRows(
  summary: SelfEmploymentGanttSummary,
  selectedPhaseIds: string[]
): SelfEmploymentGanttSummary["rows"] {
  if (selectedPhaseIds.length === 0) return summary.rows;
  const selectedIds = new Set(selectedPhaseIds);
  const filteredRows = summary.rows.filter((row) => selectedIds.has(row.phaseId));
  const visibleSpanHours = Math.max(1, filteredRows.reduce((sum, row) => sum + row.scheduledHours, 0));
  let rowStartHour = 0;
  return filteredRows.map((row) => {
    const startHour = rowStartHour;
    rowStartHour += row.scheduledHours;
    let labelStartHour = startHour;
    return {
      ...row,
      startHour,
      endHour: startHour + row.scheduledHours,
      startPercent: (startHour / visibleSpanHours) * 100,
      widthPercent: (row.scheduledHours / visibleSpanHours) * 100,
      labels: row.labels.map((label) => {
        const labelStart = labelStartHour;
        labelStartHour += row.enabled ? label.totalHours : 0;
        return {
          ...label,
          startHour: labelStart,
          startPercent: (labelStart / visibleSpanHours) * 100,
          widthPercent: row.enabled ? (label.totalHours / visibleSpanHours) * 100 : 0
        };
      })
    };
  });
}

export function orderedGanttLabels(meta: BusinessIdeaCanvasMeta): BusinessIdeaCanvasLabel[] {
  const byId = new Map(meta.labels.map((label) => [normalizedGanttLabelId(label.id), label]));
  return CANONICAL_GANTT_LABELS.map((label) => ({
    ...label,
    color: byId.get(label.id)?.color ?? label.color
  }));
}

export function normalizedGanttLabelId(value: unknown): string {
  const labelId = String(value ?? "").trim();
  return labelId === "active" ? "goal" : labelId;
}

function normalizeGanttPhase(
  raw: Record<string, unknown> | null | undefined,
  phase: BusinessIdeaCanvasPhase,
  previousPhaseId: string | null
): SelfEmploymentGanttPhase {
  const startMode: SelfEmploymentGanttStartMode = raw?.startMode === "after_previous_label" ? "after_previous_label" : "manual";
  const defaultTimeBudgetHours = normalizedHours(raw?.defaultTimeBudgetHours, SELF_EMPLOYMENT_GANTT_DEFAULT_TIME_BUDGET_HOURS);
  return {
    phaseId: phase.id,
    enabled: typeof raw?.enabled === "boolean" ? raw.enabled : true,
    startDate: typeof raw?.startDate === "string" && raw.startDate.trim() ? raw.startDate.trim() : phase.startDate,
    startMode,
    triggerPreviousPhaseId: typeof raw?.triggerPreviousPhaseId === "string" && raw.triggerPreviousPhaseId.trim()
      ? raw.triggerPreviousPhaseId.trim()
      : previousPhaseId,
    triggerLabelId: normalizedGanttLabelId(raw?.triggerLabelId || "goal"),
    defaultTimeBudgetHours
  };
}

function normalizeGanttCardPlan(
  raw: Record<string, unknown> | null | undefined,
  cardId: string,
  defaultHours: number
): SelfEmploymentGanttCardPlan {
  return {
    cardId,
    timeBudgetHours: normalizedHours(raw?.timeBudgetHours, defaultHours),
    startDate: typeof raw?.startDate === "string" && raw.startDate.trim() ? raw.startDate.trim() : null,
    note: typeof raw?.note === "string" ? raw.note : ""
  };
}

function dependencyStartHour(
  row: (Omit<SelfEmploymentGanttPhaseRow, "startPercent" | "widthPercent" | "labels"> & {
    labels: Array<Omit<SelfEmploymentGanttLabelSegment, "startPercent" | "widthPercent">>;
  }) | null,
  triggerLabelId: string | null
): number | null {
  if (!row) return null;
  const trigger = normalizedGanttLabelId(triggerLabelId || "goal");
  return row.labels.find((label) => label.labelId === trigger)?.startHour ?? row.endHour;
}

function orderedPhases(meta: BusinessIdeaCanvasMeta): BusinessIdeaCanvasPhase[] {
  return [...meta.phases].sort((a, b) => a.order - b.order);
}

function phaseLabelKey(phaseId: string, labelId: string): string {
  return `${phaseId}::${labelId}`;
}

function normalizedHours(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return Math.max(0, fallback);
  return Math.max(0, Math.min(100000, parsed));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
