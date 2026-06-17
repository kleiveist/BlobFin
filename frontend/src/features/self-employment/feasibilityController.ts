import { clamp, money } from "../../lib/format";
import { normalizeSelfEmploymentGanttPlan } from "../../domain/selfEmploymentGantt";
import type {
  SelfEmploymentFeasibility,
  SelfEmploymentInvoice,
  SelfEmploymentProject,
  SelfEmploymentProjectStatus,
  SelfEmploymentRiskLevel,
  SelfEmploymentRoadmapAreaId,
  SelfEmploymentTask
} from "../../types";
import { SELF_EMPLOYMENT_ROADMAP_AREAS } from "./config";

export interface SelfEmploymentProjectEvaluation {
  project: SelfEmploymentProject;
  feasibility: SelfEmploymentFeasibility;
  reasons: string[];
  availableTimeHours: number;
  availableReserve: number;
  fundingGap: number;
  monthlyProfitBeforeReserve: number;
  monthlyProfitAfterReserve: number;
  effectiveHourlyValue: number;
  openInvoiceAmount: number;
  openTaskHours: number;
}

export function evaluateSelfEmploymentProject(
  project: SelfEmploymentProject,
  context: { availableTimeHours: number; availableReserve: number }
): SelfEmploymentProjectEvaluation {
  const availableReserve = Math.max(0, project.availableReserveOverride ?? context.availableReserve);
  const fundingGap = Math.max(0, project.startCapitalRequired - availableReserve);
  const monthlyProfitBeforeReserve = project.monthlyRevenueExpected - project.monthlyRunningCosts;
  const monthlyProfitAfterReserve = monthlyProfitBeforeReserve * (1 - project.taxReservePercent / 100);
  const monthlyWorkHours = Math.max(0, project.monthlyWorkHours || project.requiredHoursPerWeek * 4);
  const effectiveHourlyValue = monthlyWorkHours > 0 ? monthlyProfitAfterReserve / monthlyWorkHours : 0;
  const openInvoiceAmount = project.invoices
    .filter((invoice) => invoice.status !== "paid")
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const gantt = normalizeSelfEmploymentGanttPlan(project.gantt, project.businessIdeaCanvas, project.businessIdeaCanvasMeta);
  const openTasks = gantt.cardPlans.flatMap((plan) => {
    const todoHours = plan.todos.length > 0 ? plan.timeBudgetHours / plan.todos.length : plan.timeBudgetHours;
    return plan.todos.filter((todo) => !todo.completed).map((todo) => ({ todo, hours: todoHours }));
  });
  const openTaskHours = openTasks.reduce((sum, task) => sum + task.hours, 0);
  const reasons: string[] = [];

  if (project.requiredHoursPerWeek > context.availableTimeHours) {
    reasons.push(
      `Zeitbedarf liegt ${hoursLabel(project.requiredHoursPerWeek - context.availableTimeHours)} ueber der freien Reserve.`
    );
  }
  if (fundingGap > 0) reasons.push(`Startkapital-Luecke von ${money(fundingGap)} offen.`);
  if (monthlyProfitAfterReserve <= 0) reasons.push("Gewinn nach Ruecklage/Steuer ist nicht positiv.");
  if (openTasks.length > 6 || openTaskHours > project.requiredHoursPerWeek * 2) {
    reasons.push("Aufgabenmenge ist fuer die aktuelle Wochenzeit hoch.");
  }
  if (project.risk === "high") reasons.push("Risiko ist hoch eingestuft.");

  const feasibility =
    project.requiredHoursPerWeek > context.availableTimeHours ||
    fundingGap > Math.max(500, project.startCapitalRequired * 0.4) ||
    monthlyProfitAfterReserve <= 0
      ? "unrealistic"
      : project.requiredHoursPerWeek > context.availableTimeHours * 0.85 ||
          fundingGap > 0 ||
          project.risk === "high" ||
          openTaskHours > project.requiredHoursPerWeek
        ? "borderline"
        : "realistic";

  return {
    project,
    feasibility,
    reasons: reasons.length ? reasons : ["Zeit, Kapital und Gewinnannahmen passen zur aktuellen Planung."],
    availableTimeHours: context.availableTimeHours,
    availableReserve,
    fundingGap,
    monthlyProfitBeforeReserve,
    monthlyProfitAfterReserve,
    effectiveHourlyValue,
    openInvoiceAmount,
    openTaskHours
  };
}

export function selfEmploymentTotals(
  evaluations: SelfEmploymentProjectEvaluation[],
  availableTimeHours: number
): {
  totalProjects: number;
  activeProjects: number;
  realisticProjects: number;
  unrealisticProjects: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  requiredHours: number;
  availableTimeHours: number;
  fundingGap: number;
  openInvoiceAmount: number;
} {
  const activeEvaluations = evaluations.filter((evaluation) => selfEmploymentProjectIsActive(evaluation.project));
  return {
    totalProjects: evaluations.length,
    activeProjects: activeEvaluations.length,
    realisticProjects: evaluations.filter((evaluation) => evaluation.feasibility === "realistic").length,
    unrealisticProjects: evaluations.filter((evaluation) => evaluation.feasibility === "unrealistic").length,
    monthlyRevenue: activeEvaluations.reduce((sum, evaluation) => sum + evaluation.project.monthlyRevenueExpected, 0),
    monthlyProfit: activeEvaluations.reduce((sum, evaluation) => sum + evaluation.monthlyProfitAfterReserve, 0),
    requiredHours: activeEvaluations.reduce((sum, evaluation) => sum + evaluation.project.requiredHoursPerWeek, 0),
    availableTimeHours,
    fundingGap: activeEvaluations.reduce((sum, evaluation) => sum + evaluation.fundingGap, 0),
    openInvoiceAmount: activeEvaluations.reduce((sum, evaluation) => sum + evaluation.openInvoiceAmount, 0)
  };
}

export function selfEmploymentProjectIsActive(project: SelfEmploymentProject): boolean {
  return project.status !== "completed" && project.status !== "discarded" && project.status !== "paused";
}

export function selfEmploymentStatusLabel(status: SelfEmploymentProjectStatus): string {
  const labels: Record<SelfEmploymentProjectStatus, string> = {
    idea: "Idee",
    review: "In Pruefung",
    preparation: "Vorbereitung",
    active: "Aktiv",
    paused: "Pausiert",
    completed: "Abgeschlossen",
    discarded: "Verworfen"
  };
  return labels[status];
}

export function selfEmploymentRiskLabel(risk: SelfEmploymentRiskLevel): string {
  if (risk === "low") return "Niedrig";
  if (risk === "high") return "Hoch";
  return "Mittel";
}

export function selfEmploymentFeasibilityLabel(feasibility: SelfEmploymentFeasibility): string {
  if (feasibility === "realistic") return "Realistisch";
  if (feasibility === "borderline") return "Grenzwertig";
  return "Unrealistisch";
}

export function selfEmploymentRoadmapAreaIdFromValue(value: unknown): SelfEmploymentRoadmapAreaId | null {
  return SELF_EMPLOYMENT_ROADMAP_AREAS.some((area) => area.id === value) ? (value as SelfEmploymentRoadmapAreaId) : null;
}

export function selfEmploymentNumberValue(rawValue: string, fallback: number, min: number, max: number): number {
  const parsed = Number(String(rawValue).replace(",", "."));
  return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback;
}

export function selfEmploymentTextToList(rawValue: string): string[] {
  return rawValue
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function selfEmploymentStatusFromValue(value: string, fallback: SelfEmploymentProjectStatus): SelfEmploymentProjectStatus {
  return value === "idea" ||
    value === "review" ||
    value === "preparation" ||
    value === "active" ||
    value === "paused" ||
    value === "completed" ||
    value === "discarded"
    ? value
    : fallback;
}

export function selfEmploymentRiskFromValue(value: string, fallback: SelfEmploymentRiskLevel): SelfEmploymentRiskLevel {
  return value === "low" || value === "medium" || value === "high" ? value : fallback;
}

export function selfEmploymentContactStatusFromValue(
  value: string,
  fallback: SelfEmploymentProject["contacts"][number]["status"]
): SelfEmploymentProject["contacts"][number]["status"] {
  return value === "lead" || value === "first_contact" || value === "offer_sent" || value === "customer" || value === "paused"
    ? value
    : fallback;
}

export function selfEmploymentInvoiceStatusFromValue(
  value: string,
  fallback: SelfEmploymentInvoice["status"]
): SelfEmploymentInvoice["status"] {
  return value === "offer_open" || value === "offer_accepted" || value === "invoice_created" || value === "paid"
    ? value
    : fallback;
}

export function selfEmploymentTaskPriorityFromValue(
  value: string,
  fallback: SelfEmploymentTask["priority"]
): SelfEmploymentTask["priority"] {
  return value === "low" || value === "medium" || value === "high" ? value : fallback;
}

export function selfEmploymentTaskStatusFromValue(
  value: string,
  fallback: SelfEmploymentTask["status"]
): SelfEmploymentTask["status"] {
  return value === "open" || value === "in_progress" || value === "done" ? value : fallback;
}

export function hoursLabel(value: number): string {
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value)} h`;
}
