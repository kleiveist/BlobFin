import { businessIdeaCanvasCardNodes, businessIdeaCanvasNodeText } from "./businessIdeaCanvas";
import { INCOME_PLANNING_WEEK_DAYS, type IncomePlanningModel } from "./incomePlanning";
import type {
  BusinessIdeaCanvas,
  BusinessIdeaCanvasLabel,
  BusinessIdeaCanvasMeta,
  BusinessIdeaCanvasPhase,
  IncomePlanningWeekday,
  JsonCanvasNode,
  SelfEmploymentGanttCardPlan,
  SelfEmploymentGanttTodoEisenhowerQuadrant,
  SelfEmploymentGanttPhase,
  SelfEmploymentGanttPlan,
  SelfEmploymentGanttStartMode,
  SelfEmploymentGanttTodo,
  SelfEmploymentProject
} from "../types";

export const SELF_EMPLOYMENT_GANTT_DEFAULT_TIME_BUDGET_HOURS = 1;
export const SELF_EMPLOYMENT_GANTT_LABEL_ORDER = ["idea", "knowledge", "start", "implementation", "goal"] as const;
export const SELF_EMPLOYMENT_GANTT_LABEL_COLORS: Record<(typeof SELF_EMPLOYMENT_GANTT_LABEL_ORDER)[number], string> = {
  idea: "#b42318",
  knowledge: "#eab308",
  start: "#1f7a68",
  implementation: "#b87514",
  goal: "#2563eb"
};
export const SELF_EMPLOYMENT_EISENHOWER_QUADRANTS: SelfEmploymentGanttTodoEisenhowerQuadrant[] = [
  "important_urgent",
  "important_not_urgent",
  "not_important_urgent",
  "not_important_not_urgent"
];

const SELF_EMPLOYMENT_EISENHOWER_DETAILS: Record<
  SelfEmploymentGanttTodoEisenhowerQuadrant,
  { label: string; meaning: string; action: string; shortLabel: string }
> = {
  important_urgent: {
    label: "Wichtig + dringend",
    meaning: "Muss sofort passieren",
    action: "Jetzt erledigen",
    shortLabel: "Jetzt"
  },
  important_not_urgent: {
    label: "Wichtig + nicht dringend",
    meaning: "Strategisch relevant, aber planbar",
    action: "Terminieren / einplanen",
    shortLabel: "Planen"
  },
  not_important_urgent: {
    label: "Nicht wichtig + dringend",
    meaning: "Stoert oder kommt von aussen",
    action: "Delegieren / begrenzen",
    shortLabel: "Begrenzen"
  },
  not_important_not_urgent: {
    label: "Nicht wichtig + nicht dringend",
    meaning: "Kaum Nutzen, kein Zeitdruck",
    action: "Loeschen / spaeter pruefen",
    shortLabel: "Pruefen"
  }
};

const SELF_EMPLOYMENT_EISENHOWER_RANK: Record<SelfEmploymentGanttTodoEisenhowerQuadrant, number> = {
  important_urgent: 0,
  important_not_urgent: 1,
  not_important_urgent: 2,
  not_important_not_urgent: 3
};

export type SelfEmploymentGanttLabelId = (typeof SELF_EMPLOYMENT_GANTT_LABEL_ORDER)[number];

export interface SelfEmploymentGanttCardSegment {
  cardId: string;
  title: string;
  timeBudgetHours: number;
  widthPercent: number;
  completed: boolean;
  todoCount: number;
  completedTodoCount: number;
  progressPercent: number;
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
  startMode: SelfEmploymentGanttStartMode;
  triggerPreviousPhaseId: string | null;
  triggerLabelId: string | null;
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

export interface SelfEmploymentProjectWorkPlanTask {
  todoId: string;
  cardId: string;
  cardTitle: string;
  phaseId: string;
  phaseName: string;
  labelId: string;
  labelName: string;
  labelColor: string;
  title: string;
  eisenhowerQuadrant: SelfEmploymentGanttTodo["eisenhowerQuadrant"];
  eisenhowerMeaningLabel: string;
  eisenhowerActionLabel: string;
  status: SelfEmploymentGanttTodo["status"];
  completed: boolean;
  hours: number;
  plannedDate: string | null;
  overdue: boolean;
}

export interface SelfEmploymentProjectWorkPlanDay {
  date: string;
  capacityHours: number;
  plannedHours: number;
  tasks: SelfEmploymentProjectWorkPlanTask[];
}

export interface SelfEmploymentProjectWorkPlanSource {
  ownerType: "work" | "habit";
  ownerId: string;
  name: string;
  hoursPerWeek: number;
  selected: boolean;
}

export interface SelfEmploymentProjectWorkPlanLabelHours {
  labelId: string;
  labelName: string;
  labelColor: string;
  totalHours: number;
  completedHours: number;
  openHours: number;
}

export interface SelfEmploymentProjectWorkPlanCardEffort {
  cardId: string;
  title: string;
  labelId: string;
  labelName: string;
  labelColor: string;
  totalHours: number;
  completedHours: number;
  openHours: number;
  progressPercent: number;
}

export interface SelfEmploymentProjectWorkPlan {
  tasks: SelfEmploymentProjectWorkPlanTask[];
  days: SelfEmploymentProjectWorkPlanDay[];
  sources: SelfEmploymentProjectWorkPlanSource[];
  labelHours: SelfEmploymentProjectWorkPlanLabelHours[];
  largestLabel: SelfEmploymentProjectWorkPlanLabelHours | null;
  largestCards: SelfEmploymentProjectWorkPlanCardEffort[];
  totalHours: number;
  completedHours: number;
  openHours: number;
  progressPercent: number;
  plannedProgressPercent: number;
  availableHoursPerWeek: number;
  remainingDays: number | null;
  endDate: string | null;
  bottlenecks: string[];
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
  const cardPlans = businessIdeaCanvasCardNodes(canvas).map((node) => {
    const raw = rawCardById.get(node.id);
    return normalizeGanttCardPlan(raw, node.id, SELF_EMPLOYMENT_GANTT_DEFAULT_TIME_BUDGET_HOURS, businessIdeaCanvasNodeText(node));
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
        const plan =
          plansByCardId.get(node.id) ??
          normalizeGanttCardPlan(
            null,
            node.id,
            SELF_EMPLOYMENT_GANTT_DEFAULT_TIME_BUDGET_HOURS,
            businessIdeaCanvasNodeText(node)
          );
        const completedTodoCount = plan.todos.filter((todo) => todo.completed).length;
        return {
          cardId: node.id,
          title: businessIdeaCanvasNodeText(node),
          timeBudgetHours: plan.timeBudgetHours,
          widthPercent: 0,
          completed: plan.completed,
          todoCount: plan.todos.length,
          completedTodoCount,
          progressPercent: plan.todos.length > 0 ? (completedTodoCount / plan.todos.length) * 100 : plan.completed ? 100 : 0
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
      startMode: pending.settings.startMode,
      triggerPreviousPhaseId: pending.settings.triggerPreviousPhaseId,
      triggerLabelId: pending.settings.triggerLabelId,
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

export function selfEmploymentGanttLabelColor(labelId: string): string {
  if (isSelfEmploymentGanttLabelId(labelId)) return SELF_EMPLOYMENT_GANTT_LABEL_COLORS[labelId];
  return "#6f7785";
}

export function selfEmploymentEisenhowerQuadrantDetails(quadrant: SelfEmploymentGanttTodoEisenhowerQuadrant): {
  label: string;
  meaning: string;
  action: string;
  shortLabel: string;
} {
  return SELF_EMPLOYMENT_EISENHOWER_DETAILS[quadrant];
}

export function selfEmploymentEisenhowerQuadrantRank(quadrant: SelfEmploymentGanttTodoEisenhowerQuadrant): number {
  return SELF_EMPLOYMENT_EISENHOWER_RANK[quadrant];
}

export function selfEmploymentEisenhowerQuadrantFromValue(
  value: unknown,
  fallback: SelfEmploymentGanttTodoEisenhowerQuadrant = "important_not_urgent"
): SelfEmploymentGanttTodoEisenhowerQuadrant {
  return isSelfEmploymentEisenhowerQuadrant(value) ? value : fallback;
}

function selfEmploymentEisenhowerQuadrantFromLegacyPriority(value: unknown): SelfEmploymentGanttTodoEisenhowerQuadrant {
  if (value === "high") return "important_urgent";
  if (value === "low") return "not_important_not_urgent";
  return "important_not_urgent";
}

function isSelfEmploymentEisenhowerQuadrant(value: unknown): value is SelfEmploymentGanttTodoEisenhowerQuadrant {
  return typeof value === "string" && SELF_EMPLOYMENT_EISENHOWER_QUADRANTS.includes(value as SelfEmploymentGanttTodoEisenhowerQuadrant);
}

export function buildSelfEmploymentProjectWorkPlan(
  project: SelfEmploymentProject,
  incomePlanningModel: IncomePlanningModel,
  today: Date = new Date()
): SelfEmploymentProjectWorkPlan {
  const gantt = normalizeSelfEmploymentGanttPlan(project.gantt, project.businessIdeaCanvas, project.businessIdeaCanvasMeta);
  const labels = orderedGanttLabels(project.businessIdeaCanvasMeta);
  const labelById = new Map(labels.map((label) => [label.id, label]));
  const phases = orderedPhases(project.businessIdeaCanvasMeta);
  const phaseById = new Map(phases.map((phase) => [phase.id, phase]));
  const plansByCardId = new Map(gantt.cardPlans.map((plan) => [plan.cardId, plan]));
  const selectedSourceKeys = new Set(project.timeSources.map((source) => timeSourceKey(source.ownerType, source.ownerId)));
  const sources = buildWorkPlanSources(incomePlanningModel, selectedSourceKeys);
  const selectedActiveKeys = new Set(sources.filter((source) => source.selected).map((source) => timeSourceKey(source.ownerType, source.ownerId)));
  const capacityByDay = workPlanCapacityByDay(incomePlanningModel, selectedActiveKeys);
  const availableHoursPerWeek = roundHours([...capacityByDay.values()].reduce((sum, hours) => sum + hours, 0));
  const todayString = dateToString(startOfLocalDay(today));
  const startDate = parseLocalDate(project.startDate) ?? startOfLocalDay(today);

  const tasks = businessIdeaCanvasCardNodes(project.businessIdeaCanvas).flatMap((node) => {
    const plan = plansByCardId.get(node.id) ?? normalizeGanttCardPlan(
      null,
      node.id,
      SELF_EMPLOYMENT_GANTT_DEFAULT_TIME_BUDGET_HOURS,
      businessIdeaCanvasNodeText(node)
    );
    const nodeMeta = project.businessIdeaCanvasMeta.nodeMeta[node.id];
    const labelId = normalizedGanttLabelId(nodeMeta?.labelId ?? project.businessIdeaCanvasMeta.activeLabelId);
    const label = labelById.get(labelId) ?? labels[0] ?? CANONICAL_GANTT_LABELS[0];
    const phaseId = nodeMeta?.phaseId ?? project.businessIdeaCanvasMeta.activePhaseId;
    const phase = phaseById.get(phaseId) ?? phases[0];
    const cardTitle = businessIdeaCanvasNodeText(node).trim() || "Karte";
    const todoHours = plan.todos.length > 0 ? plan.timeBudgetHours / plan.todos.length : plan.timeBudgetHours;
    return plan.todos.map((todo) => ({
      todoId: todo.id,
      cardId: plan.cardId,
      cardTitle,
      phaseId,
      phaseName: phase?.name ?? "Phase",
      labelId: label.id,
      labelName: label.name,
      labelColor: selfEmploymentGanttLabelColor(label.id),
      title: todo.title,
      eisenhowerQuadrant: todo.eisenhowerQuadrant,
      eisenhowerMeaningLabel: selfEmploymentEisenhowerQuadrantDetails(todo.eisenhowerQuadrant).meaning,
      eisenhowerActionLabel: selfEmploymentEisenhowerQuadrantDetails(todo.eisenhowerQuadrant).action,
      status: todo.status,
      completed: todo.completed,
      hours: roundHours(todoHours),
      plannedDate: null,
      overdue: false
    }));
  });

  const scheduled = scheduleWorkPlanTasks(tasks, startDate, capacityByDay, todayString);
  const completedHours = roundHours(scheduled.tasks.filter((task) => task.completed).reduce((sum, task) => sum + task.hours, 0));
  const totalHours = roundHours(scheduled.tasks.reduce((sum, task) => sum + task.hours, 0));
  const openHours = roundHours(Math.max(0, totalHours - completedHours));
  const labelHours = buildWorkPlanLabelHours(scheduled.tasks, labels);
  const cardEfforts = buildWorkPlanCardEfforts(scheduled.tasks);
  const plannedProgressPercent = totalHours > 0
    ? Math.min(100, (workPlanElapsedCapacityHours(startDate, startOfLocalDay(today), capacityByDay) / totalHours) * 100)
    : 100;
  const bottlenecks = buildWorkPlanBottlenecks({
    selectedCount: project.timeSources.length,
    activeSelectedCount: selectedActiveKeys.size,
    availableHoursPerWeek,
    openHours
  });

  return {
    tasks: scheduled.tasks,
    days: scheduled.days,
    sources,
    labelHours,
    largestLabel: labelHours.reduce<SelfEmploymentProjectWorkPlanLabelHours | null>(
      (largest, item) => (!largest || item.totalHours > largest.totalHours ? item : largest),
      null
    ),
    largestCards: cardEfforts.sort((first, second) => second.totalHours - first.totalHours).slice(0, 3),
    totalHours,
    completedHours,
    openHours,
    progressPercent: totalHours > 0 ? (completedHours / totalHours) * 100 : 100,
    plannedProgressPercent,
    availableHoursPerWeek,
    remainingDays: scheduled.endDate ? Math.max(0, daysBetween(startOfLocalDay(today), parseLocalDate(scheduled.endDate) ?? startOfLocalDay(today))) : null,
    endDate: scheduled.endDate,
    bottlenecks
  };
}

function buildWorkPlanSources(
  model: IncomePlanningModel,
  selectedSourceKeys: Set<string>
): SelfEmploymentProjectWorkPlanSource[] {
  const workSources = model.activeWorkBlocks.map((block) => ({
    ownerType: "work" as const,
    ownerId: block.id,
    name: block.name,
    hoursPerWeek: workPlanOwnerHours(model, "work", block.id),
    selected: selectedSourceKeys.has(timeSourceKey("work", block.id))
  }));
  const habitSources = model.activeHabits.map((habit) => ({
    ownerType: "habit" as const,
    ownerId: habit.id,
    name: habit.name,
    hoursPerWeek: workPlanOwnerHours(model, "habit", habit.id),
    selected: selectedSourceKeys.has(timeSourceKey("habit", habit.id))
  }));
  return [...workSources, ...habitSources].filter((source) => source.hoursPerWeek > 0);
}

function workPlanCapacityByDay(model: IncomePlanningModel, selectedSourceKeys: Set<string>): Map<IncomePlanningWeekday, number> {
  const capacity = new Map<IncomePlanningWeekday, number>(INCOME_PLANNING_WEEK_DAYS.map((day) => [day, 0]));
  for (const entry of model.calendarEntries) {
    const ownerType = workPlanEntryOwnerType(entry.type);
    if (!ownerType || entry.type === "pause" || entry.invalid) continue;
    if (!selectedSourceKeys.has(timeSourceKey(ownerType, entry.ownerId))) continue;
    capacity.set(entry.day, roundHours((capacity.get(entry.day) ?? 0) + entry.durationMinutes / 60));
  }
  return capacity;
}

function workPlanOwnerHours(model: IncomePlanningModel, ownerType: "work" | "habit", ownerId: string): number {
  return roundHours(
    model.calendarEntries
      .filter((entry) => workPlanEntryOwnerType(entry.type) === ownerType && entry.ownerId === ownerId && entry.type !== "pause" && !entry.invalid)
      .reduce((sum, entry) => sum + entry.durationMinutes / 60, 0)
  );
}

function workPlanEntryOwnerType(type: string): "work" | "habit" | null {
  if (type === "career" || type === "side_work") return "work";
  if (type === "good_habit" || type === "bad_habit" || type === "replacement_habit") return "habit";
  return null;
}

function scheduleWorkPlanTasks(
  tasks: SelfEmploymentProjectWorkPlanTask[],
  startDate: Date,
  capacityByDay: Map<IncomePlanningWeekday, number>,
  todayString: string
): { tasks: SelfEmploymentProjectWorkPlanTask[]; days: SelfEmploymentProjectWorkPlanDay[]; endDate: string | null } {
  const weeklyCapacity = [...capacityByDay.values()].reduce((sum, hours) => sum + hours, 0);
  if (weeklyCapacity <= 0) {
    return {
      tasks: sortWorkPlanTasks(tasks),
      days: [],
      endDate: null
    };
  }

  const dayPlans = new Map<string, SelfEmploymentProjectWorkPlanDay>();
  let cursor = startOfLocalDay(startDate);
  const scheduledOpenTasks: SelfEmploymentProjectWorkPlanTask[] = [];

  for (const task of tasks.filter((item) => !item.completed).sort(compareWorkPlanEisenhower)) {
    let guard = 0;
    while (guard < 3700) {
      const dateKey = dateToString(cursor);
      const capacityHours = capacityByDay.get(weekdayForDate(cursor)) ?? 0;
      const day = dayPlans.get(dateKey);
      const usedHours = day?.plannedHours ?? 0;
      if (capacityHours > 0 && (usedHours === 0 || usedHours + task.hours <= capacityHours)) {
        const plannedTask = {
          ...task,
          plannedDate: dateKey,
          overdue: dateKey < todayString
        };
        const nextDay = day ?? { date: dateKey, capacityHours, plannedHours: 0, tasks: [] };
        nextDay.tasks = [...nextDay.tasks, plannedTask].sort(compareWorkPlanEisenhower);
        nextDay.plannedHours = roundHours(nextDay.plannedHours + task.hours);
        dayPlans.set(dateKey, nextDay);
        scheduledOpenTasks.push(plannedTask);
        if (nextDay.plannedHours >= capacityHours) cursor = addDays(cursor, 1);
        break;
      }
      cursor = addDays(cursor, 1);
      guard += 1;
    }
  }

  const completedTasks = tasks.filter((task) => task.completed).map((task) => ({ ...task, plannedDate: null, overdue: false }));
  const days = [...dayPlans.values()].sort((first, second) => first.date.localeCompare(second.date));
  return {
    tasks: sortWorkPlanTasks([...scheduledOpenTasks, ...completedTasks]),
    days,
    endDate: days[days.length - 1]?.date ?? null
  };
}

function buildWorkPlanLabelHours(
  tasks: SelfEmploymentProjectWorkPlanTask[],
  labels: BusinessIdeaCanvasLabel[]
): SelfEmploymentProjectWorkPlanLabelHours[] {
  return labels
    .map((label) => {
      const labelTasks = tasks.filter((task) => task.labelId === label.id);
      const totalHours = roundHours(labelTasks.reduce((sum, task) => sum + task.hours, 0));
      const completedHours = roundHours(labelTasks.filter((task) => task.completed).reduce((sum, task) => sum + task.hours, 0));
      return {
        labelId: label.id,
        labelName: label.name,
        labelColor: selfEmploymentGanttLabelColor(label.id),
        totalHours,
        completedHours,
        openHours: roundHours(Math.max(0, totalHours - completedHours))
      };
    })
    .filter((label) => label.totalHours > 0);
}

function buildWorkPlanCardEfforts(tasks: SelfEmploymentProjectWorkPlanTask[]): SelfEmploymentProjectWorkPlanCardEffort[] {
  const byCardId = new Map<string, SelfEmploymentProjectWorkPlanTask[]>();
  for (const task of tasks) byCardId.set(task.cardId, [...(byCardId.get(task.cardId) ?? []), task]);
  return [...byCardId.values()].map((cardTasks) => {
    const first = cardTasks[0];
    const totalHours = roundHours(cardTasks.reduce((sum, task) => sum + task.hours, 0));
    const completedHours = roundHours(cardTasks.filter((task) => task.completed).reduce((sum, task) => sum + task.hours, 0));
    return {
      cardId: first.cardId,
      title: first.cardTitle,
      labelId: first.labelId,
      labelName: first.labelName,
      labelColor: first.labelColor,
      totalHours,
      completedHours,
      openHours: roundHours(Math.max(0, totalHours - completedHours)),
      progressPercent: totalHours > 0 ? (completedHours / totalHours) * 100 : 100
    };
  });
}

function workPlanElapsedCapacityHours(startDate: Date, today: Date, capacityByDay: Map<IncomePlanningWeekday, number>): number {
  if (today < startDate) return 0;
  let total = 0;
  let cursor = startOfLocalDay(startDate);
  let guard = 0;
  while (cursor <= today && guard < 3700) {
    total += capacityByDay.get(weekdayForDate(cursor)) ?? 0;
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return roundHours(total);
}

function buildWorkPlanBottlenecks(input: {
  selectedCount: number;
  activeSelectedCount: number;
  availableHoursPerWeek: number;
  openHours: number;
}): string[] {
  const bottlenecks: string[] = [];
  if (input.selectedCount === 0) bottlenecks.push("Keine Projekt-Zeitquelle ausgewaehlt.");
  else if (input.activeSelectedCount === 0) bottlenecks.push("Ausgewaehlte Zeitquellen sind im aktiven Wochenplan nicht verfuegbar.");
  if (input.openHours > 0 && input.availableHoursPerWeek <= 0) bottlenecks.push("Offene Projektzeit kann ohne Wochenkontingent nicht geplant werden.");
  return bottlenecks;
}

function sortWorkPlanTasks(tasks: SelfEmploymentProjectWorkPlanTask[]): SelfEmploymentProjectWorkPlanTask[] {
  return [...tasks].sort((first, second) => {
    if (first.completed !== second.completed) return first.completed ? 1 : -1;
    const rankDiff = selfEmploymentEisenhowerQuadrantRank(first.eisenhowerQuadrant) - selfEmploymentEisenhowerQuadrantRank(second.eisenhowerQuadrant);
    if (rankDiff !== 0) return rankDiff;
    if (first.plannedDate && second.plannedDate && first.plannedDate !== second.plannedDate) {
      return first.plannedDate.localeCompare(second.plannedDate);
    }
    if (first.plannedDate !== second.plannedDate) return first.plannedDate ? -1 : 1;
    return first.title.localeCompare(second.title, "de");
  });
}

function compareWorkPlanEisenhower(
  first: Pick<SelfEmploymentProjectWorkPlanTask, "eisenhowerQuadrant" | "title">,
  second: Pick<SelfEmploymentProjectWorkPlanTask, "eisenhowerQuadrant" | "title">
): number {
  const rankDiff = selfEmploymentEisenhowerQuadrantRank(first.eisenhowerQuadrant) - selfEmploymentEisenhowerQuadrantRank(second.eisenhowerQuadrant);
  if (rankDiff !== 0) return rankDiff;
  return first.title.localeCompare(second.title, "de");
}

function timeSourceKey(ownerType: "work" | "habit", ownerId: string): string {
  return `${ownerType}:${ownerId}`;
}

function isSelfEmploymentGanttLabelId(value: string): value is SelfEmploymentGanttLabelId {
  return SELF_EMPLOYMENT_GANTT_LABEL_ORDER.includes(value as SelfEmploymentGanttLabelId);
}

function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : startOfLocalDay(date);
}

function dateToString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(first: Date, second: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((second.getTime() - first.getTime()) / msPerDay);
}

function weekdayForDate(date: Date): IncomePlanningWeekday {
  return INCOME_PLANNING_WEEK_DAYS[(date.getDay() + 6) % 7] ?? "monday";
}

function normalizeGanttPhase(
  raw: Record<string, unknown> | null | undefined,
  phase: BusinessIdeaCanvasPhase,
  previousPhaseId: string | null
): SelfEmploymentGanttPhase {
  const startMode: SelfEmploymentGanttStartMode = raw?.startMode === "after_previous_label" ? "after_previous_label" : "manual";
  return {
    phaseId: phase.id,
    enabled: typeof raw?.enabled === "boolean" ? raw.enabled : true,
    startMode,
    triggerPreviousPhaseId: typeof raw?.triggerPreviousPhaseId === "string" && raw.triggerPreviousPhaseId.trim()
      ? raw.triggerPreviousPhaseId.trim()
      : previousPhaseId,
    triggerLabelId: normalizedGanttLabelId(raw?.triggerLabelId || "goal")
  };
}

function normalizeGanttCardPlan(
  raw: Record<string, unknown> | null | undefined,
  cardId: string,
  defaultHours: number,
  fallbackTitle: string
): SelfEmploymentGanttCardPlan {
  const rawTodos = Array.isArray(raw?.todos) ? raw.todos.filter(isRecord) : [];
  const legacyNote = typeof raw?.note === "string" ? raw.note.trim() : "";
  const todos = rawTodos.length
    ? rawTodos.map((todo, index) => normalizeGanttTodo(todo, cardId, index, fallbackTitle))
    : [
        normalizeGanttTodo(
          {
            title: legacyNote || fallbackTitle,
            eisenhowerQuadrant: "important_not_urgent",
            completed: typeof raw?.completed === "boolean" ? raw.completed : false
          },
          cardId,
          0,
          fallbackTitle
        )
      ];
  const manuallyCompleted = raw?.completed === true;
  const normalizedTodos = manuallyCompleted ? todos.map((todo) => ({ ...todo, status: "done" as const, completed: true })) : todos;
  return {
    cardId,
    timeBudgetHours: normalizedHours(raw?.timeBudgetHours, defaultHours),
    completed: normalizedTodos.every((todo) => todo.completed),
    todos: normalizedTodos
  };
}

function normalizeGanttTodo(
  raw: Record<string, unknown>,
  cardId: string,
  index: number,
  fallbackTitle: string
): SelfEmploymentGanttTodo {
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `todo-${cardId}-${index + 1}`;
  const title = String(raw.title ?? raw.text ?? "").trim() || fallbackTitle.trim() || "Todo";
  const eisenhowerQuadrant = selfEmploymentEisenhowerQuadrantFromValue(
    raw.eisenhowerQuadrant,
    selfEmploymentEisenhowerQuadrantFromLegacyPriority(raw.priority)
  );
  const status = normalizeGanttTodoStatus(raw.status, raw.completed === true);
  return {
    id,
    title,
    eisenhowerQuadrant,
    status,
    completed: status === "done"
  };
}

function normalizeGanttTodoStatus(value: unknown, completed: boolean): SelfEmploymentGanttTodo["status"] {
  if (value === "done" || value === "in_progress" || value === "planned") return value;
  return completed ? "done" : "planned";
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

function roundHours(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
