import { createId, defaultSelfEmploymentState } from "../../data/defaults";
import {
  businessIdeaCanvasFilePath,
  defaultBusinessIdeaCanvasForProject,
  normalizeBusinessIdeaCanvas,
  normalizeBusinessIdeaCanvasMeta
} from "../../domain/businessIdeaCanvas";
import { normalizeSelfEmploymentGanttPlan } from "../../domain/selfEmploymentGantt";
import { normalizePositionIcon } from "../positionIcons";
import type {
  BusinessIdeaCanvasMeta,
  SelfEmploymentContact,
  SelfEmploymentContactStatus,
  SelfEmploymentInvoice,
  SelfEmploymentInvoiceStatus,
  SelfEmploymentOfferSettings,
  SelfEmploymentProject,
  SelfEmploymentProjectModules,
  SelfEmploymentProjectStatus,
  SelfEmploymentProjectType,
  SelfEmploymentProjectTimeSource,
  SelfEmploymentRiskLevel,
  SelfEmploymentRoadmapAreaId,
  SelfEmploymentState,
  SelfEmploymentTask,
  SelfEmploymentTaskPriority,
  SelfEmploymentTaskStatus
} from "../../types";
import {
  clampNumber,
  isRecord,
  nullableNumberOrDefault,
  numberOrDefault,
  stringArrayOrDefault
} from "./validators";

export function normalizeSelfEmploymentState(value: unknown): SelfEmploymentState {
  const fallback = defaultSelfEmploymentState();
  if (!isRecord(value)) return fallback;
  const projects = Array.isArray(value.projects)
    ? value.projects
        .map(normalizeSelfEmploymentProject)
        .filter((project): project is SelfEmploymentProject => project !== null)
    : fallback.projects;
  const normalizedProjects = projects;
  const selectedProjectId = String(value.selectedProjectId || normalizedProjects[0]?.id || "");
  return {
    selectedProjectId: normalizedProjects.some((project) => project.id === selectedProjectId)
      ? selectedProjectId
      : normalizedProjects[0]?.id ?? "",
    selectedRoadmapAreaId: normalizeSelfEmploymentRoadmapAreaId(value.selectedRoadmapAreaId, fallback.selectedRoadmapAreaId),
    projects: normalizedProjects
  };
}

export function normalizeSelfEmploymentProject(value: unknown): SelfEmploymentProject | null {
  if (!isRecord(value)) return null;
  const fallback = defaultSelfEmploymentState().projects[0];
  const id = String(value.id || createId());
  const legacyCanvas = defaultBusinessIdeaCanvasForProject(id, {
    idea: String(value.idea ?? ""),
    problem: String(value.problem ?? ""),
    targetGroup: String(value.targetGroup ?? ""),
    revenueModel: String(value.revenueModel ?? "")
  });
  const businessIdeaCanvas = normalizeBusinessIdeaCanvas(value.businessIdeaCanvas, legacyCanvas.businessIdeaCanvas);
  const businessIdeaCanvasMeta = normalizeBusinessIdeaCanvasMeta(
    value.businessIdeaCanvasMeta,
    businessIdeaCanvas,
    legacyCanvas.businessIdeaCanvasMeta
  );
  const gantt = normalizeSelfEmploymentGanttPlan(value.gantt, businessIdeaCanvas, businessIdeaCanvasMeta);
  const ganttPhaseFilterIds = normalizeSelfEmploymentGanttPhaseFilterIds(
    value.ganttPhaseFilterIds,
    businessIdeaCanvasMeta
  );
  return {
    id,
    name: String(value.name || "Neues Projekt"),
    icon: normalizePositionIcon(value.icon, fallback.icon),
    labels: stringArrayOrDefault(value.labels, []),
    status: normalizeSelfEmploymentProjectStatus(value.status, fallback.status),
    dashboardEnabled: typeof value.dashboardEnabled === "boolean" ? value.dashboardEnabled : false,
    projectType: normalizeSelfEmploymentProjectType(value.projectType, fallback.projectType),
    priority: normalizeSelfEmploymentTaskPriority(value.priority, fallback.priority),
    createdAt: isoStringOrDefault(value.createdAt, fallback.createdAt),
    updatedAt: isoStringOrDefault(value.updatedAt, isoStringOrDefault(value.createdAt, fallback.updatedAt)),
    enabledModules: normalizeSelfEmploymentProjectModules(
      value.enabledModules,
      normalizeSelfEmploymentProjectType(value.projectType, fallback.projectType)
    ),
    offerSettings: normalizeSelfEmploymentOfferSettings(value.offerSettings, fallback.offerSettings),
    idea: String(value.idea ?? ""),
    problem: String(value.problem ?? ""),
    targetGroup: String(value.targetGroup ?? ""),
    revenueModel: String(value.revenueModel ?? ""),
    risk: normalizeSelfEmploymentRiskLevel(value.risk, fallback.risk),
    motivation: String(value.motivation ?? ""),
    projectGoal: String(value.projectGoal ?? ""),
    milestones: stringArrayOrDefault(value.milestones, []),
    startDate: String(value.startDate ?? ""),
    plannedDurationWeeks: clampNumber(numberOrDefault(value.plannedDurationWeeks, 0), 0, 520),
    nextSteps: stringArrayOrDefault(value.nextSteps, []),
    dependencies: String(value.dependencies ?? ""),
    requiredHoursPerWeek: clampNumber(numberOrDefault(value.requiredHoursPerWeek, 0), 0, 168),
    fixedProjectHoursPerWeek: clampNumber(numberOrDefault(value.fixedProjectHoursPerWeek, 0), 0, 168),
    flexibleProjectHoursPerWeek: clampNumber(numberOrDefault(value.flexibleProjectHoursPerWeek, 0), 0, 168),
    linkedHabits: stringArrayOrDefault(value.linkedHabits, []),
    blockingHabits: stringArrayOrDefault(value.blockingHabits, []),
    weekScenario: String(value.weekScenario ?? ""),
    startCapitalRequired: clampNumber(numberOrDefault(value.startCapitalRequired, 0), 0, Number.MAX_SAFE_INTEGER),
    availableReserveOverride: nullableNumberOrDefault(value.availableReserveOverride, null),
    monthlyRevenueExpected: clampNumber(numberOrDefault(value.monthlyRevenueExpected, 0), 0, Number.MAX_SAFE_INTEGER),
    monthlyRunningCosts: clampNumber(numberOrDefault(value.monthlyRunningCosts, 0), 0, Number.MAX_SAFE_INTEGER),
    oneTimeCosts: clampNumber(numberOrDefault(value.oneTimeCosts, 0), 0, Number.MAX_SAFE_INTEGER),
    taxReservePercent: clampNumber(numberOrDefault(value.taxReservePercent, fallback.taxReservePercent), 0, 100),
    monthlyWorkHours: clampNumber(numberOrDefault(value.monthlyWorkHours, 0), 0, 744),
    timeSources: normalizeSelfEmploymentProjectTimeSources(value.timeSources),
    contacts: Array.isArray(value.contacts)
      ? value.contacts.map(normalizeSelfEmploymentContact).filter((contact): contact is SelfEmploymentContact => contact !== null)
      : [],
    invoices: Array.isArray(value.invoices)
      ? value.invoices.map(normalizeSelfEmploymentInvoice).filter((invoice): invoice is SelfEmploymentInvoice => invoice !== null)
      : [],
    tasks: Array.isArray(value.tasks)
      ? value.tasks.map(normalizeSelfEmploymentTask).filter((task): task is SelfEmploymentTask => task !== null)
      : [],
    businessIdeaCanvas,
    businessIdeaCanvasFile:
      typeof value.businessIdeaCanvasFile === "string" && isSafeSelfEmploymentCanvasPath(value.businessIdeaCanvasFile.trim())
        ? value.businessIdeaCanvasFile.trim()
        : businessIdeaCanvasFilePath(id),
    businessIdeaCanvasMeta,
    gantt,
    ganttPhaseFilterIds
  };
}

export function normalizeSelfEmploymentGanttPhaseFilterIds(value: unknown, meta: BusinessIdeaCanvasMeta): string[] {
  if (!Array.isArray(value)) return [];
  const selectedIds = new Set(value.map((item) => String(item)));
  return [...meta.phases]
    .sort((a, b) => a.order - b.order)
    .map((phase) => phase.id)
    .filter((phaseId) => selectedIds.has(phaseId));
}

export function isSafeSelfEmploymentCanvasPath(value: string): boolean {
  return (
    value.endsWith(".canvas") &&
    !value.startsWith("/") &&
    !value.startsWith("\\") &&
    !value.includes("..") &&
    value.startsWith("planning/projects/")
  );
}

export function normalizeSelfEmploymentContact(value: unknown): SelfEmploymentContact | null {
  if (!isRecord(value)) return null;
  return {
    id: String(value.id || createId()),
    name: String(value.name || "Kontakt"),
    status: normalizeSelfEmploymentContactStatus(value.status, "lead"),
    lastContact: String(value.lastContact ?? ""),
    nextStep: String(value.nextStep ?? ""),
    revenuePotential: clampNumber(numberOrDefault(value.revenuePotential, 0), 0, Number.MAX_SAFE_INTEGER),
    probabilityPercent: clampNumber(numberOrDefault(value.probabilityPercent, 0), 0, 100)
  };
}

export function normalizeSelfEmploymentInvoice(value: unknown): SelfEmploymentInvoice | null {
  if (!isRecord(value)) return null;
  return {
    id: String(value.id || createId()),
    label: String(value.label || "Angebot / Rechnung"),
    status: normalizeSelfEmploymentInvoiceStatus(value.status, "offer_open"),
    dueDate: String(value.dueDate ?? ""),
    amount: clampNumber(numberOrDefault(value.amount, 0), 0, Number.MAX_SAFE_INTEGER)
  };
}

export function normalizeSelfEmploymentTask(value: unknown): SelfEmploymentTask | null {
  if (!isRecord(value)) return null;
  return {
    id: String(value.id || createId()),
    title: String(value.title || "Aufgabe"),
    priority: normalizeSelfEmploymentTaskPriority(value.priority, "medium"),
    dueDate: String(value.dueDate ?? ""),
    estimatedHours: clampNumber(numberOrDefault(value.estimatedHours, 0), 0, 1000),
    status: normalizeSelfEmploymentTaskStatus(value.status, "open")
  };
}

export function normalizeSelfEmploymentProjectTimeSources(value: unknown): SelfEmploymentProjectTimeSource[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const sources: SelfEmploymentProjectTimeSource[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const ownerType = item.ownerType === "work" || item.ownerType === "habit" ? item.ownerType : null;
    const ownerId = typeof item.ownerId === "string" ? item.ownerId.trim() : "";
    if (!ownerType || !ownerId) continue;
    const key = `${ownerType}:${ownerId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({ ownerType, ownerId });
  }
  return sources;
}

export function normalizeSelfEmploymentRoadmapAreaId(
  value: unknown,
  fallback: SelfEmploymentRoadmapAreaId
): SelfEmploymentRoadmapAreaId {
  return value === "idea" ||
    value === "planning" ||
    value === "tasks" ||
    value === "time"
    ? value
    : fallback;
}

export function normalizeSelfEmploymentProjectStatus(
  value: unknown,
  fallback: SelfEmploymentProjectStatus
): SelfEmploymentProjectStatus {
  if (value === "done") return "completed";
  if (value === "open" || value === "in_progress" || value === "completed" || value === "cancelled") return value;
  if (value === "active") return "in_progress";
  if (value === "discarded") return "cancelled";
  if (value === "idea" || value === "review" || value === "preparation" || value === "paused") return "open";
  return fallback === "active" ? "in_progress" : fallback === "discarded" ? "cancelled" : fallback;
}

export function normalizeSelfEmploymentProjectType(value: unknown, fallback: SelfEmploymentProjectType): SelfEmploymentProjectType {
  return value === "revenue" ||
    value === "human_capital" ||
    value === "mandatory" ||
    value === "strategic" ||
    value === "private"
    ? value
    : fallback;
}

export function defaultSelfEmploymentModulesForType(projectType: SelfEmploymentProjectType): SelfEmploymentProjectModules {
  if (projectType === "human_capital") {
    return { invoices: false, budget: false, contacts: false, profit: false, metrics: true };
  }
  if (projectType === "mandatory") {
    return { invoices: false, budget: false, contacts: false, profit: false, metrics: false };
  }
  if (projectType === "strategic") {
    return { invoices: false, budget: true, contacts: false, profit: false, metrics: true };
  }
  if (projectType === "private") {
    return { invoices: false, budget: false, contacts: false, profit: false, metrics: true };
  }
  return { invoices: true, budget: true, contacts: true, profit: true, metrics: true };
}

export function normalizeSelfEmploymentProjectModules(
  value: unknown,
  projectType: SelfEmploymentProjectType
): SelfEmploymentProjectModules {
  const fallback = defaultSelfEmploymentModulesForType(projectType);
  if (!isRecord(value)) return fallback;
  return {
    invoices: typeof value.invoices === "boolean" ? value.invoices : fallback.invoices,
    budget: typeof value.budget === "boolean" ? value.budget : fallback.budget,
    contacts: typeof value.contacts === "boolean" ? value.contacts : fallback.contacts,
    profit: typeof value.profit === "boolean" ? value.profit : fallback.profit,
    metrics: typeof value.metrics === "boolean" ? value.metrics : fallback.metrics
  };
}

export function normalizeSelfEmploymentOfferSettings(
  value: unknown,
  fallback: SelfEmploymentOfferSettings
): SelfEmploymentOfferSettings {
  const source = isRecord(value) ? value : {};
  return {
    baseHourlyRate: clampNumber(numberOrDefault(source.baseHourlyRate, fallback.baseHourlyRate), 0, 100000),
    usePhaseFactors: typeof source.usePhaseFactors === "boolean" ? source.usePhaseFactors : fallback.usePhaseFactors,
    useLabelFactors: typeof source.useLabelFactors === "boolean" ? source.useLabelFactors : fallback.useLabelFactors,
    useTodoTimes: typeof source.useTodoTimes === "boolean" ? source.useTodoTimes : fallback.useTodoTimes,
    useBuffer: typeof source.useBuffer === "boolean" ? source.useBuffer : fallback.useBuffer,
    useRounding: typeof source.useRounding === "boolean" ? source.useRounding : fallback.useRounding,
    bufferPercent: clampNumber(numberOrDefault(source.bufferPercent, fallback.bufferPercent), 0, 100),
    taxPercent: clampNumber(numberOrDefault(source.taxPercent, fallback.taxPercent), 0, 100)
  };
}

export function normalizeSelfEmploymentRiskLevel(value: unknown, fallback: SelfEmploymentRiskLevel): SelfEmploymentRiskLevel {
  return value === "low" || value === "medium" || value === "high" ? value : fallback;
}

export function normalizeSelfEmploymentContactStatus(
  value: unknown,
  fallback: SelfEmploymentContactStatus
): SelfEmploymentContactStatus {
  if (value === "lead" || value === "first_contact" || value === "offer_sent" || value === "customer" || value === "paused") {
    return value;
  }
  return fallback;
}

export function normalizeSelfEmploymentInvoiceStatus(
  value: unknown,
  fallback: SelfEmploymentInvoiceStatus
): SelfEmploymentInvoiceStatus {
  if (
    value === "offer_open" ||
    value === "offer_accepted" ||
    value === "invoice_created" ||
    value === "draft" ||
    value === "open" ||
    value === "paid" ||
    value === "cancelled" ||
    value === "overdue"
  ) {
    return value;
  }
  return fallback;
}

export function normalizeSelfEmploymentTaskPriority(
  value: unknown,
  fallback: SelfEmploymentTaskPriority
): SelfEmploymentTaskPriority {
  return value === "low" || value === "medium" || value === "high" ? value : fallback;
}

export function normalizeSelfEmploymentTaskStatus(value: unknown, fallback: SelfEmploymentTaskStatus): SelfEmploymentTaskStatus {
  return value === "open" || value === "in_progress" || value === "done" ? value : fallback;
}

function isoStringOrDefault(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}
