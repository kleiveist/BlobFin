import { clamp, money } from "../../lib/format";
import { normalizeSelfEmploymentGanttPlan } from "../../domain/selfEmploymentGantt";
import type {
  SelfEmploymentFeasibility,
  SelfEmploymentInvoice,
  SelfEmploymentProject,
  SelfEmploymentProjectType,
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
  weeklyTimeDemand: number;
  benefitLabel: string;
}

export function evaluateSelfEmploymentProject(
  project: SelfEmploymentProject,
  context: { availableTimeHours: number; availableReserve: number; weeklyTimeDemand?: number; openTaskHours?: number; blockingTaskCount?: number }
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
  const openTaskHours = context.openTaskHours ?? openTasks.reduce((sum, task) => sum + task.hours, 0);
  const weeklyTimeDemand = Math.max(
    0,
    context.weeklyTimeDemand ?? project.requiredHoursPerWeek ?? project.fixedProjectHoursPerWeek + project.flexibleProjectHoursPerWeek
  );
  const blockingTaskCount = context.blockingTaskCount ?? openTasks.filter((task) => task.todo.eisenhowerQuadrant === "important_urgent").length;
  const projectType = selfEmploymentProjectTypeFromValue(project.projectType);
  const needsProfit = projectType === "revenue";
  const hasStrategicBenefit =
    projectType === "human_capital" ||
    projectType === "mandatory" ||
    projectType === "strategic" ||
    Boolean(project.projectGoal.trim() || project.motivation.trim() || project.milestones.length || project.nextSteps.length);
  const hasFinancialUpside = monthlyProfitAfterReserve > 0 || project.monthlyRevenueExpected > 0;
  const hasClearBenefit = needsProfit ? hasFinancialUpside : hasStrategicBenefit || hasFinancialUpside;
  const criticalFundingGap = fundingGap > Math.max(500, project.startCapitalRequired * 0.4);
  const timeOverReserve = weeklyTimeDemand > context.availableTimeHours;
  const nearReserve = context.availableTimeHours > 0 && weeklyTimeDemand > context.availableTimeHours * 0.85;
  const reasons: string[] = [];

  if (timeOverReserve) {
    reasons.push(
      `Zeitbedarf liegt ${hoursLabel(weeklyTimeDemand - context.availableTimeHours)} ueber der freien Reserve.`
    );
  }
  if (fundingGap > 0) reasons.push(`Startkapital-Luecke von ${money(fundingGap)} offen.`);
  if (needsProfit && monthlyProfitAfterReserve <= 0) reasons.push("Umsatzprojekt hat noch keinen positiven Gewinn nach Ruecklage/Steuer.");
  if (!needsProfit && hasStrategicBenefit) {
    reasons.push(`${selfEmploymentProjectTypeLabel(projectType)} wird ueber Nutzen statt direkten Gewinn bewertet.`);
  }
  if (!hasClearBenefit) reasons.push("Nutzen, Gewinn oder strategische Relevanz sind noch nicht klar.");
  if (openTasks.length > 6 || openTaskHours > Math.max(weeklyTimeDemand, 1) * 2 || blockingTaskCount > 3) {
    reasons.push("Aufgabenmenge ist fuer die aktuelle Wochenzeit hoch.");
  }
  if (project.risk === "high") reasons.push("Risiko ist hoch eingestuft.");

  const feasibility =
    timeOverReserve ||
    criticalFundingGap ||
    (needsProfit && monthlyProfitAfterReserve <= 0) ||
    (!hasClearBenefit && openTaskHours > 0)
      ? "unrealistic"
      : nearReserve ||
          fundingGap > 0 ||
          project.risk === "high" ||
          openTaskHours > Math.max(weeklyTimeDemand, 1) ||
          blockingTaskCount > 0
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
    openTaskHours,
    weeklyTimeDemand,
    benefitLabel: hasStrategicBenefit
      ? selfEmploymentProjectTypeBenefitLabel(projectType)
      : hasFinancialUpside
        ? "finanzieller Nutzen"
        : "Nutzen offen"
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
    realisticProjects: activeEvaluations.filter((evaluation) => evaluation.feasibility === "realistic").length,
    unrealisticProjects: activeEvaluations.filter((evaluation) => evaluation.feasibility === "unrealistic").length,
    monthlyRevenue: activeEvaluations.reduce((sum, evaluation) => sum + evaluation.project.monthlyRevenueExpected, 0),
    monthlyProfit: activeEvaluations.reduce((sum, evaluation) => sum + evaluation.monthlyProfitAfterReserve, 0),
    requiredHours: activeEvaluations.reduce((sum, evaluation) => sum + evaluation.weeklyTimeDemand, 0),
    availableTimeHours,
    fundingGap: activeEvaluations.reduce((sum, evaluation) => sum + evaluation.fundingGap, 0),
    openInvoiceAmount: activeEvaluations.reduce((sum, evaluation) => sum + evaluation.openInvoiceAmount, 0)
  };
}

export function selfEmploymentProjectIsActive(project: SelfEmploymentProject): boolean {
  const status = canonicalSelfEmploymentProjectStatus(project.status);
  return status === "open" || status === "in_progress";
}

export function selfEmploymentStatusLabel(status: SelfEmploymentProjectStatus): string {
  const canonical = canonicalSelfEmploymentProjectStatus(status);
  if (canonical === "open") return "⚪ Offen";
  if (canonical === "in_progress") return "🔵 In Arbeit";
  if (canonical === "completed") return "✔️ Erledigt";
  if (canonical === "cancelled") return "❌ Cancel";
  return "⚪ Offen";
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

export function canonicalSelfEmploymentProjectStatus(status: SelfEmploymentProjectStatus): "open" | "in_progress" | "completed" | "cancelled" {
  if (status === "active" || status === "in_progress") return "in_progress";
  if (status === "completed") return "completed";
  if (status === "discarded" || status === "cancelled") return "cancelled";
  return "open";
}

export function selfEmploymentProjectTypeFromValue(value: unknown, fallback: SelfEmploymentProjectType = "revenue"): SelfEmploymentProjectType {
  return value === "revenue" ||
    value === "human_capital" ||
    value === "mandatory" ||
    value === "strategic" ||
    value === "private"
    ? value
    : fallback;
}

export function selfEmploymentProjectTypeLabel(projectType: SelfEmploymentProjectType): string {
  if (projectType === "human_capital") return "Humankapital";
  if (projectType === "mandatory") return "Pflichtprojekt";
  if (projectType === "strategic") return "Strategisch";
  if (projectType === "private") return "Privat";
  return "Umsatzprojekt";
}

export function selfEmploymentProjectTypeBenefitLabel(projectType: SelfEmploymentProjectType): string {
  if (projectType === "human_capital") return "Humankapital-Wert hoch";
  if (projectType === "mandatory") return "Pflichtnutzen wichtig";
  if (projectType === "strategic") return "strategischer Nutzen hoch";
  if (projectType === "private") return "individueller Nutzen";
  return "Gewinnpotenzial";
}

export function selfEmploymentPriorityLabel(priority: SelfEmploymentTask["priority"]): string {
  if (priority === "high") return "Hoch";
  if (priority === "low") return "Niedrig";
  return "Mittel";
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
  if (value === "done") return "completed";
  if (value === "open" || value === "in_progress" || value === "completed" || value === "cancelled") return value;
  if (value === "active") return "in_progress";
  if (value === "discarded") return "cancelled";
  if (value === "idea" || value === "review" || value === "preparation" || value === "paused") return "open";
  return fallback;
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
