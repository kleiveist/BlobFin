import {
  businessIdeaCanvasFilePath,
  defaultBusinessIdeaCanvasForProject,
  normalizeBusinessIdeaCanvas,
  normalizeBusinessIdeaCanvasMeta,
  serializeBusinessIdeaCanvas
} from "../../domain/businessIdeaCanvas";
import { normalizeSelfEmploymentGanttPlan } from "../../domain/selfEmploymentGantt";
import { normalizeSelfEmploymentProject } from "../storage/normalizeSelfEmployment";
import type {
  BusinessIdeaCanvas,
  BusinessIdeaCanvasMeta,
  SelfEmploymentGanttPlan,
  SelfEmploymentProject,
  SelfEmploymentState
} from "../../types";

export const SELF_EMPLOYMENT_PROJECT_FILE_NAMES = [
  "project.json",
  "canvas-geschaeftsidee.canvas",
  "cards.json",
  "phases.json",
  "labels.json",
  "todos.json",
  "time.json",
  "modules.json",
  "kanban.json",
  "gantt.json",
  "offers.json",
  "invoices.json",
  "contacts.json"
] as const;

export type SelfEmploymentProjectFileName = (typeof SELF_EMPLOYMENT_PROJECT_FILE_NAMES)[number];
export type SelfEmploymentProjectFiles = Partial<Record<SelfEmploymentProjectFileName, unknown>>;
export type SelfEmploymentProjectFilesById = Record<string, SelfEmploymentProjectFiles>;

export function serializeSelfEmploymentProjectFiles(project: SelfEmploymentProject): SelfEmploymentProjectFiles {
  const cardPlansById = new Map(project.gantt.cardPlans.map((plan) => [plan.cardId, plan]));
  return {
    "project.json": {
      id: project.id,
      name: project.name,
      icon: project.icon,
      labels: project.labels,
      status: project.status,
      dashboardEnabled: project.dashboardEnabled,
      projectType: project.projectType,
      priority: project.priority,
      idea: project.idea,
      problem: project.problem,
      targetGroup: project.targetGroup,
      revenueModel: project.revenueModel,
      risk: project.risk,
      motivation: project.motivation,
      projectGoal: project.projectGoal,
      milestones: project.milestones,
      startDate: project.startDate,
      plannedDurationWeeks: project.plannedDurationWeeks,
      nextSteps: project.nextSteps,
      dependencies: project.dependencies,
      startCapitalRequired: project.startCapitalRequired,
      availableReserveOverride: project.availableReserveOverride,
      monthlyRevenueExpected: project.monthlyRevenueExpected,
      monthlyRunningCosts: project.monthlyRunningCosts,
      oneTimeCosts: project.oneTimeCosts,
      taxReservePercent: project.taxReservePercent,
      monthlyWorkHours: project.monthlyWorkHours,
      businessIdeaCanvasFile: businessIdeaCanvasFilePath(project.id),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    },
    "canvas-geschaeftsidee.canvas": serializeBusinessIdeaCanvas(project.businessIdeaCanvas),
    "cards.json": {
      cards: project.businessIdeaCanvas.nodes.map((node, index) => {
        const plan = cardPlansById.get(node.id);
        const meta = project.businessIdeaCanvasMeta.nodeMeta[node.id];
        return {
          ...node,
          sortOrder: index,
          phaseId: meta?.phaseId ?? null,
          labelId: meta?.labelId ?? null,
          shape: meta?.shape ?? null,
          status: plan?.completed ? "completed" : "open",
          linkedTodoIds: plan?.todos.map((todo) => todo.id) ?? [],
          timeBudgetHours: plan?.timeBudgetHours ?? 0
        };
      }),
      nodeMeta: project.businessIdeaCanvasMeta.nodeMeta,
      groupMeta: project.businessIdeaCanvasMeta.groupMeta
    },
    "phases.json": {
      phases: project.businessIdeaCanvasMeta.phases.map((phase) => ({
        ...phase,
        factor: offerPhaseFactor(phase.name, phase.order),
        active: true
      })),
      activePhaseId: project.businessIdeaCanvasMeta.activePhaseId,
      ganttPhases: project.gantt.phases
    },
    "labels.json": {
      projectLabels: project.labels,
      labels: project.businessIdeaCanvasMeta.labels.map((label) => ({
        ...label,
        type: "canvas",
        factor: offerLabelFactor(label.id),
        active: true
      })),
      activeLabelId: project.businessIdeaCanvasMeta.activeLabelId,
      palette: project.businessIdeaCanvasMeta.palette
    },
    "todos.json": {
      cardTodos: project.gantt.cardPlans.map((plan) => ({
        cardId: plan.cardId,
        todos: plan.todos
      })),
      tasks: project.tasks
    },
    "time.json": {
      requiredHoursPerWeek: project.requiredHoursPerWeek,
      fixedProjectHoursPerWeek: project.fixedProjectHoursPerWeek,
      flexibleProjectHoursPerWeek: project.flexibleProjectHoursPerWeek,
      linkedHabits: project.linkedHabits,
      blockingHabits: project.blockingHabits,
      weekScenario: project.weekScenario,
      monthlyWorkHours: project.monthlyWorkHours,
      timeSources: project.timeSources,
      cardTimeBudgets: project.gantt.cardPlans.map((plan) => ({
        cardId: plan.cardId,
        timeBudgetHours: plan.timeBudgetHours
      }))
    },
    "modules.json": project.enabledModules,
    "kanban.json": {
      cards: project.gantt.cardPlans.map((plan) => ({
        cardId: plan.cardId,
        completed: plan.completed,
        todos: plan.todos.map((todo, index) => ({
          todoId: todo.id,
          column: todo.status,
          sortOrder: index
        }))
      }))
    },
    "gantt.json": {
      gantt: project.gantt,
      ganttPhaseFilterIds: project.ganttPhaseFilterIds
    },
    "offers.json": {
      offerSettings: project.offerSettings
    },
    "invoices.json": {
      invoices: project.invoices
    },
    "contacts.json": {
      contacts: project.contacts
    }
  };
}

export function serializeSelfEmploymentProjectFilesById(state: SelfEmploymentState): SelfEmploymentProjectFilesById {
  return Object.fromEntries(state.projects.map((project) => [project.id, serializeSelfEmploymentProjectFiles(project)]));
}

export function serializeSelfEmploymentStateShell(state: SelfEmploymentState): Pick<SelfEmploymentState, "selectedProjectId" | "selectedRoadmapAreaId"> {
  return {
    selectedProjectId: state.selectedProjectId,
    selectedRoadmapAreaId: state.selectedRoadmapAreaId
  };
}

export function withSelfEmploymentProjectFiles(value: unknown, projectFilesById: unknown): unknown {
  if (!isRecord(projectFilesById)) return value;
  const projects = Object.entries(projectFilesById)
    .map(([projectId, files]) => selfEmploymentProjectFromFiles(projectId, files))
    .filter((project): project is SelfEmploymentProject => project !== null);
  if (projects.length === 0) return value;
  const source = isRecord(value) ? value : {};
  const selectedProjectId = typeof source.selectedProjectId === "string" ? source.selectedProjectId : "";
  const selectedRoadmapAreaId = typeof source.selectedRoadmapAreaId === "string" ? source.selectedRoadmapAreaId : "idea";
  return {
    selectedProjectId: projects.some((project) => project.id === selectedProjectId) ? selectedProjectId : projects[0]?.id ?? "",
    selectedRoadmapAreaId,
    projects
  };
}

export function selfEmploymentProjectFilePaths(projectFilesById: SelfEmploymentProjectFilesById): string[] {
  return Object.entries(projectFilesById).flatMap(([projectId, files]) =>
    Object.keys(files).map((fileName) => selfEmploymentProjectRelativeFilePath(projectId, fileName as SelfEmploymentProjectFileName))
  );
}

export function selfEmploymentProjectRelativeFilePath(projectId: string, fileName: SelfEmploymentProjectFileName): string {
  return `planning/projects/${safeProjectId(projectId)}/${fileName}`;
}

export function safeSelfEmploymentProjectId(value: string): string {
  return safeProjectId(value);
}

function selfEmploymentProjectFromFiles(projectId: string, filesValue: unknown): SelfEmploymentProject | null {
  if (!isRecord(filesValue)) return null;
  const projectFile = record(filesValue["project.json"]);
  if (Object.keys(projectFile).length === 0) return null;
  const id = String(projectFile.id || projectId);
  const canvas = normalizeProjectCanvas(id, filesValue["canvas-geschaeftsidee.canvas"], projectFile);
  const meta = normalizeProjectMeta(filesValue, canvas);
  const gantt = normalizeProjectGantt(filesValue, canvas, meta);
  const timeFile = record(filesValue["time.json"]);
  const todosFile = record(filesValue["todos.json"]);
  const modulesFile = record(filesValue["modules.json"]);
  const offersFile = record(filesValue["offers.json"]);
  const invoicesFile = record(filesValue["invoices.json"]);
  const contactsFile = record(filesValue["contacts.json"]);
  return normalizeSelfEmploymentProject({
    ...projectFile,
    id,
    businessIdeaCanvas: canvas,
    businessIdeaCanvasFile:
      typeof projectFile.businessIdeaCanvasFile === "string" ? projectFile.businessIdeaCanvasFile : businessIdeaCanvasFilePath(id),
    businessIdeaCanvasMeta: meta,
    gantt,
    ganttPhaseFilterIds: arrayOr(record(filesValue["gantt.json"]).ganttPhaseFilterIds, []),
    enabledModules: modulesFile,
    offerSettings: record(offersFile.offerSettings),
    invoices: arrayOr(invoicesFile.invoices, []),
    contacts: arrayOr(contactsFile.contacts, []),
    tasks: arrayOr(todosFile.tasks, []),
    requiredHoursPerWeek: timeFile.requiredHoursPerWeek ?? projectFile.requiredHoursPerWeek,
    fixedProjectHoursPerWeek: timeFile.fixedProjectHoursPerWeek ?? projectFile.fixedProjectHoursPerWeek,
    flexibleProjectHoursPerWeek: timeFile.flexibleProjectHoursPerWeek ?? projectFile.flexibleProjectHoursPerWeek,
    linkedHabits: timeFile.linkedHabits ?? projectFile.linkedHabits,
    blockingHabits: timeFile.blockingHabits ?? projectFile.blockingHabits,
    weekScenario: timeFile.weekScenario ?? projectFile.weekScenario,
    monthlyWorkHours: timeFile.monthlyWorkHours ?? projectFile.monthlyWorkHours,
    timeSources: timeFile.timeSources ?? projectFile.timeSources
  });
}

function normalizeProjectCanvas(id: string, value: unknown, projectFile: Record<string, unknown>): BusinessIdeaCanvas {
  const fallback = defaultBusinessIdeaCanvasForProject(id, {
    idea: String(projectFile.idea ?? projectFile.name ?? ""),
    problem: String(projectFile.problem ?? ""),
    targetGroup: String(projectFile.targetGroup ?? ""),
    revenueModel: String(projectFile.revenueModel ?? "")
  }).businessIdeaCanvas;
  return normalizeBusinessIdeaCanvas(value, fallback);
}

function normalizeProjectMeta(filesValue: Record<string, unknown>, canvas: BusinessIdeaCanvas): BusinessIdeaCanvasMeta {
  const fallback = normalizeBusinessIdeaCanvasMeta({}, canvas);
  const cardsFile = record(filesValue["cards.json"]);
  const phasesFile = record(filesValue["phases.json"]);
  const labelsFile = record(filesValue["labels.json"]);
  return normalizeBusinessIdeaCanvasMeta(
    {
      labels: arrayOr(labelsFile.labels, fallback.labels),
      phases: arrayOr(phasesFile.phases, fallback.phases),
      activeLabelId: labelsFile.activeLabelId,
      activePhaseId: phasesFile.activePhaseId,
      palette: arrayOr(labelsFile.palette, fallback.palette),
      groupMeta: record(cardsFile.groupMeta),
      nodeMeta: nodeMetaFromCards(cardsFile, canvas)
    },
    canvas,
    fallback
  );
}

function normalizeProjectGantt(
  filesValue: Record<string, unknown>,
  canvas: BusinessIdeaCanvas,
  meta: BusinessIdeaCanvasMeta
): SelfEmploymentGanttPlan {
  const ganttFile = record(filesValue["gantt.json"]);
  if (isRecord(ganttFile.gantt)) return normalizeSelfEmploymentGanttPlan(ganttFile.gantt, canvas, meta);
  const phasesFile = record(filesValue["phases.json"]);
  const todosFile = record(filesValue["todos.json"]);
  const timeFile = record(filesValue["time.json"]);
  const timeBudgets = new Map(
    arrayOr<Record<string, unknown>>(timeFile.cardTimeBudgets, []).map((item) => [String(item.cardId ?? ""), item.timeBudgetHours])
  );
  return normalizeSelfEmploymentGanttPlan(
    {
      phases: phasesFile.ganttPhases,
      cardPlans: arrayOr<Record<string, unknown>>(todosFile.cardTodos, []).map((item) => ({
        cardId: String(item.cardId ?? ""),
        timeBudgetHours: timeBudgets.get(String(item.cardId ?? "")),
        todos: item.todos
      }))
    },
    canvas,
    meta
  );
}

function nodeMetaFromCards(cardsFile: Record<string, unknown>, canvas: BusinessIdeaCanvas): unknown {
  if (isRecord(cardsFile.nodeMeta)) return cardsFile.nodeMeta;
  const cards = arrayOr<Record<string, unknown>>(cardsFile.cards, []);
  const nodeIds = new Set(canvas.nodes.map((node) => node.id));
  return Object.fromEntries(
    cards
      .filter((card) => typeof card.id === "string" && nodeIds.has(card.id))
      .map((card) => [
        String(card.id),
        {
          labelId: card.labelId,
          phaseId: card.phaseId,
          shape: card.shape
        }
      ])
  );
}

function offerPhaseFactor(name: string, order: number): number {
  const normalized = name.toLowerCase();
  if (normalized.includes("umsetzung") || order >= 4) return 1.2;
  if (normalized.includes("pruefung") || normalized.includes("validierung")) return 1.1;
  return 1;
}

function offerLabelFactor(labelId: string): number {
  if (labelId === "implementation") return 1.2;
  if (labelId === "risk") return 1.15;
  if (labelId === "goal") return 1.05;
  return 1;
}

function safeProjectId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "project";
}

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function arrayOr<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
