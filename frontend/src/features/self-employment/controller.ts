import { createId, defaultSelfEmploymentState } from "../../data/defaults";
import {
  businessIdeaCanvasNodeText,
  defaultBusinessIdeaCanvasForProject
} from "../../domain/businessIdeaCanvas";
import {
  buildSelfEmploymentProjectGantt,
  normalizeSelfEmploymentGanttPlan,
  normalizedGanttLabelId,
  orderedGanttLabels,
  visibleSelfEmploymentGanttRows,
  type SelfEmploymentGanttSummary
} from "../../domain/selfEmploymentGantt";
import { calculateReserveSummary } from "../../domain/reserveCalculator";
import type { IncomePlanningModel } from "../../domain/incomePlanning";
import { clamp, escapeHtml, intNumber, money } from "../../lib/format";
import { normalizePositionIcon, POSITION_ICONS, positionIconSvg } from "../../lib/positionIcons";
import type {
  AppState,
  BusinessIdeaCanvasShape,
  JsonCanvasNode,
  PlanningSettings,
  ReservePosition,
  SelfEmploymentFeasibility,
  SelfEmploymentGanttCardPlan,
  SelfEmploymentGanttPhase,
  SelfEmploymentGanttStartMode,
  SelfEmploymentInvoice,
  SelfEmploymentProject,
  SelfEmploymentProjectStatus,
  SelfEmploymentRiskLevel,
  SelfEmploymentRoadmapAreaId,
  SelfEmploymentTask
} from "../../types";
import { renderBusinessCanvas } from "./business-canvas";
import { SELF_EMPLOYMENT_LABEL_OPTIONS, SELF_EMPLOYMENT_ROADMAP_AREAS } from "./config";
import { selfEmploymentUiState } from "./uiState";

interface SelfEmploymentHost {
  getState(): AppState;
  syncStoreState(): void;
  persistCurrentState(): void;
  renderAll(): void;
  incomePlanningModelForActiveWeek(): IncomePlanningModel;
  activePlanningSettings(): PlanningSettings;
  activePlanningPositions(): ReservePosition[];
}

let host: SelfEmploymentHost;

export function configureSelfEmploymentHost(nextHost: SelfEmploymentHost): void {
  host = nextHost;
}

function requireSelfEmploymentHost(): void {
  if (!host) throw new Error("Self-employment feature host has not been configured.");
}

interface SelfEmploymentProjectEvaluation {
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

export function renderSelfEmploymentDashboard(): void {
  requireSelfEmploymentHost();
  const container = document.querySelector<HTMLDivElement>("#selfEmploymentDashboard");
  if (!container) return;
  normalizeSelfEmploymentSelection();
  const context = selfEmploymentEvaluationContext();
  const evaluations = host.getState().selfEmployment.projects.map((project) => evaluateSelfEmploymentProject(project, context));
  const selected = evaluations.find((item) => item.project.id === host.getState().selfEmployment.selectedProjectId) ?? evaluations[0];
  const totals = selfEmploymentTotals(evaluations, context.availableTimeHours);
  const projectCardsHtml = evaluations.length
    ? evaluations.map((evaluation) => selfEmploymentProjectCard(evaluation, selected?.project.id)).join("")
    : `
      <article class="self-employment-empty-card">
        <h3>Kein Projekt angelegt</h3>
        <p>Lege ein Projekt an und pflege danach Zeitbedarf, Budget, Aufgaben und Gewinnpotenzial in der Planung.</p>
      </article>
    `;
  const analysisHtml = evaluations.length
    ? `
      <section class="self-employment-analysis" aria-label="Projekt-Auswertung">
        ${selfEmploymentStatusChart(evaluations)}
        ${selfEmploymentBarChart("Zeitbedarf je Projekt", evaluations, "time")}
        ${selfEmploymentBarChart("Gewinnpotenzial je Projekt", evaluations, "profit")}
        ${selfEmploymentFeasibilityPanel(evaluations)}
      </section>
    `
    : "";
  const tablesHtml = evaluations.length
    ? `
      <section class="self-employment-tables" aria-label="Projekt-Tabellen">
        ${selfEmploymentTable("Projekte nach Risiko", ["Projekt", "Risiko", "Machbarkeit"], evaluations, riskTableRow)}
        ${selfEmploymentTable("Investitionsbedarf", ["Projekt", "Startkapital", "Luecke"], evaluations, investmentTableRow)}
        ${selfEmploymentTable("Erwarteter Gewinn", ["Projekt", "Umsatz", "Gewinn"], evaluations, profitTableRow)}
      </section>
    `
    : "";

  container.innerHTML = `
    <section class="self-employment-hero">
      <h2>Selbststaendigkeits-Dashboard</h2>
      <div class="self-employment-hero-actions">
        <button class="button" type="button" data-action="self-employment-add-project">Projekt anlegen</button>
      </div>
    </section>
    <section class="self-employment-metrics" aria-label="Projektuebergreifende Kennzahlen">
      ${selfEmploymentMetric("Aktive Projekte", intNumber(totals.activeProjects), `${intNumber(totals.totalProjects)} insgesamt`)}
      ${selfEmploymentMetric("Realistische Projekte", intNumber(totals.realisticProjects), `${intNumber(totals.unrealisticProjects)} unrealistisch`)}
      ${selfEmploymentMetric("Geplanter Monatsumsatz", money(totals.monthlyRevenue), "aus Projektannahmen")}
      ${selfEmploymentMetric("Geschaetzter Monatsgewinn", money(totals.monthlyProfit), "nach Ruecklage/Steuer")}
      ${selfEmploymentMetric("Benoetigte Projektzeit", `${hoursLabel(totals.requiredHours)} / Woche`, `${hoursLabel(totals.availableTimeHours)} freie Reserve`)}
      ${selfEmploymentMetric("Offene Investitionsluecke", money(totals.fundingGap), `${money(totals.openInvoiceAmount)} offen`)}
    </section>
    <section class="self-employment-cards" aria-label="Selbststaendigkeitsprojekte">
      ${projectCardsHtml}
    </section>
    ${analysisHtml}
    ${tablesHtml}
    ${selected ? selfEmploymentProjectDetails(selected) : ""}
  `;
}

function selfEmploymentEvaluationContext(): { availableTimeHours: number; availableReserve: number } {
  const timeModel = host.incomePlanningModelForActiveWeek();
  const reserve = calculateReserveSummary(host.activePlanningSettings(), host.activePlanningPositions());
  return {
    availableTimeHours: Math.max(0, timeModel.remainingFlexibleHours),
    availableReserve: Math.max(0, reserve.yearEndBalance - host.getState().settings.emergencyFund)
  };
}

function evaluateSelfEmploymentProject(
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
  const openTasks = project.tasks.filter((task) => task.status !== "done");
  const openTaskHours = openTasks.reduce((sum, task) => sum + task.estimatedHours, 0);
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

function selfEmploymentTotals(
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

function selfEmploymentProjectCard(evaluation: SelfEmploymentProjectEvaluation, selectedProjectId?: string): string {
  const { project } = evaluation;
  const active = project.id === selectedProjectId;
  const icon = normalizePositionIcon(project.icon, "briefcase");
  const labelChips =
    project.labels.length > 0
      ? project.labels
          .map((label) => `<span class="self-employment-label-chip">${escapeHtml(label)}</span>`)
          .join("")
      : `<span class="self-employment-label-chip muted">Ohne Label</span>`;
  return `
    <article
      class="self-employment-project-card ${escapeHtml(evaluation.feasibility)}${active ? " active" : ""}"
    >
      <div class="self-employment-project-head">
        <button
          class="self-employment-project-icon-button"
          type="button"
          data-action="self-employment-open-icon-picker"
          data-self-employment-project-id="${escapeHtml(project.id)}"
          aria-label="Projekt-Icon aendern"
          title="Projekt-Icon aendern"
        >
          ${positionIconSvg(icon, "position-icon-svg self-employment-project-icon-svg")}
        </button>
        <button
          class="self-employment-project-main"
          type="button"
          data-action="self-employment-select-project"
          data-self-employment-project-id="${escapeHtml(project.id)}"
          aria-pressed="${active}"
        >
          <span class="self-employment-project-title">
            <strong>${escapeHtml(project.name)}</strong>
          </span>
          <span>Status: ${escapeHtml(selfEmploymentStatusLabel(project.status))}</span>
          <span>Zeitbedarf: ${hoursLabel(project.requiredHoursPerWeek)} / Woche</span>
          <span>Startkapital: ${money(project.startCapitalRequired)}</span>
          <span>Gewinnpotenzial: ${money(evaluation.monthlyProfitAfterReserve)} / Monat</span>
          <span>Machbarkeit: ${escapeHtml(selfEmploymentFeasibilityLabel(evaluation.feasibility))}</span>
        </button>
      </div>
      <div class="self-employment-project-labels" aria-label="Projektlabels">${labelChips}</div>
      <div class="self-employment-project-actions">
        <button class="button mini secondary" type="button" data-action="self-employment-rename-project" data-self-employment-project-id="${escapeHtml(project.id)}">Umbenennen</button>
        <button class="button mini secondary" type="button" data-action="self-employment-toggle-label-picker" data-self-employment-project-id="${escapeHtml(project.id)}" aria-expanded="${selfEmploymentUiState.labelPickerProjectId === project.id}">Label</button>
        <button class="button mini danger" type="button" data-action="self-employment-delete-project" data-self-employment-project-id="${escapeHtml(project.id)}">Loeschen</button>
      </div>
      ${selfEmploymentUiState.labelPickerProjectId === project.id ? selfEmploymentLabelPicker(project) : ""}
    </article>
  `;
}

function selfEmploymentLabelPicker(project: SelfEmploymentProject): string {
  const options = [...new Set([...SELF_EMPLOYMENT_LABEL_OPTIONS, ...project.labels])];
  return `
    <div class="self-employment-label-picker" aria-label="Labels auswaehlen">
      ${options
        .map((label) => {
          const selected = project.labels.includes(label);
          return `
            <button
              class="self-employment-label-option${selected ? " active" : ""}"
              type="button"
              data-action="self-employment-toggle-label"
              data-self-employment-project-id="${escapeHtml(project.id)}"
              data-self-employment-label="${escapeHtml(label)}"
              aria-pressed="${selected}"
            >
              ${escapeHtml(label)}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function selfEmploymentMetric(label: string, value: string, detail: string): string {
  return `
    <article class="metric-card self-employment-metric">
      <span class="metric-label">${escapeHtml(label)}</span>
      <strong class="metric-value">${escapeHtml(value)}</strong>
      <small class="metric-detail">${escapeHtml(detail)}</small>
    </article>
  `;
}

function selfEmploymentStatusChart(evaluations: SelfEmploymentProjectEvaluation[]): string {
  const total = Math.max(1, evaluations.length);
  const realistic = evaluations.filter((evaluation) => evaluation.feasibility === "realistic").length;
  const borderline = evaluations.filter((evaluation) => evaluation.feasibility === "borderline").length;
  const realisticEnd = (realistic / total) * 100;
  const borderlineEnd = realisticEnd + (borderline / total) * 100;
  return `
    <article class="self-employment-chart-card">
      <h3>Projektstatus</h3>
      <div
        class="self-employment-donut"
        style="background: conic-gradient(var(--accent) 0 ${realisticEnd}%, var(--gold) ${realisticEnd}% ${borderlineEnd}%, var(--danger) ${borderlineEnd}% 100%)"
        aria-hidden="true"
      ></div>
      <div class="self-employment-legend">
        <span><i class="realistic"></i>Realistisch ${intNumber(realistic)}</span>
        <span><i class="borderline"></i>Grenzwertig ${intNumber(borderline)}</span>
        <span><i class="unrealistic"></i>Unrealistisch ${intNumber(total - realistic - borderline)}</span>
      </div>
    </article>
  `;
}

function selfEmploymentBarChart(
  title: string,
  evaluations: SelfEmploymentProjectEvaluation[],
  kind: "time" | "profit"
): string {
  const maxValue = Math.max(
    1,
    ...evaluations.map((evaluation) =>
      kind === "time" ? evaluation.project.requiredHoursPerWeek : Math.max(0, evaluation.monthlyProfitAfterReserve)
    )
  );
  return `
    <article class="self-employment-chart-card">
      <h3>${escapeHtml(title)}</h3>
      <div class="self-employment-bars">
        ${evaluations
          .map((evaluation) => {
            const value =
              kind === "time" ? evaluation.project.requiredHoursPerWeek : Math.max(0, evaluation.monthlyProfitAfterReserve);
            const width = Math.max(4, Math.min(100, (value / maxValue) * 100));
            return `
              <div class="self-employment-bar-row">
                <span>${escapeHtml(evaluation.project.name)}</span>
                <div><i style="width:${width}%"></i></div>
                <strong>${kind === "time" ? hoursLabel(value) : money(value)}</strong>
              </div>
            `;
          })
          .join("")}
      </div>
    </article>
  `;
}

function selfEmploymentFeasibilityPanel(evaluations: SelfEmploymentProjectEvaluation[]): string {
  return `
    <article class="self-employment-chart-card">
      <h3>Ampel Machbarkeit</h3>
      <div class="self-employment-feasibility-list">
        ${evaluations
          .map(
            (evaluation) => `
              <div class="self-employment-feasibility-item ${escapeHtml(evaluation.feasibility)}">
                <strong>${escapeHtml(evaluation.project.name)}</strong>
                <span>${escapeHtml(selfEmploymentFeasibilityLabel(evaluation.feasibility))}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </article>
  `;
}

function selfEmploymentTable(
  title: string,
  columns: string[],
  evaluations: SelfEmploymentProjectEvaluation[],
  rowRenderer: (evaluation: SelfEmploymentProjectEvaluation) => string
): string {
  return `
    <article class="self-employment-table-card">
      <h3>${escapeHtml(title)}</h3>
      <table>
        <thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
        <tbody>${evaluations.map(rowRenderer).join("")}</tbody>
      </table>
    </article>
  `;
}

function riskTableRow(evaluation: SelfEmploymentProjectEvaluation): string {
  return `
    <tr>
      <td>${escapeHtml(evaluation.project.name)}</td>
      <td>${escapeHtml(selfEmploymentRiskLabel(evaluation.project.risk))}</td>
      <td>${escapeHtml(selfEmploymentFeasibilityLabel(evaluation.feasibility))}</td>
    </tr>
  `;
}

function investmentTableRow(evaluation: SelfEmploymentProjectEvaluation): string {
  return `
    <tr>
      <td>${escapeHtml(evaluation.project.name)}</td>
      <td>${money(evaluation.project.startCapitalRequired)}</td>
      <td>${money(evaluation.fundingGap)}</td>
    </tr>
  `;
}

function profitTableRow(evaluation: SelfEmploymentProjectEvaluation): string {
  return `
    <tr>
      <td>${escapeHtml(evaluation.project.name)}</td>
      <td>${money(evaluation.project.monthlyRevenueExpected)}</td>
      <td>${money(evaluation.monthlyProfitAfterReserve)}</td>
    </tr>
  `;
}

function selfEmploymentProjectDetails(evaluation: SelfEmploymentProjectEvaluation): string {
  const { project } = evaluation;
  const selectedArea = selfEmploymentRoadmapAreaIdFromValue(host.getState().selfEmployment.selectedRoadmapAreaId) ?? "idea";
  const activeArea = SELF_EMPLOYMENT_ROADMAP_AREAS.find((area) => area.id === selectedArea) ?? SELF_EMPLOYMENT_ROADMAP_AREAS[0];
  return `
    <section class="self-employment-detail" aria-label="Projekt-Detailbereich">
      <div class="self-employment-detail-head">
        <div>
          <span class="planning-account-summary">Projekt: ${escapeHtml(project.name)}</span>
          <h2>${escapeHtml(project.idea || project.name)}</h2>
        </div>
        <span class="status-pill ${escapeHtml(evaluation.feasibility)}">${escapeHtml(
          selfEmploymentFeasibilityLabel(evaluation.feasibility)
        )}</span>
      </div>
      ${selfEmploymentRoadmap(selectedArea)}
      <article class="self-employment-roadmap-panel">
        <header>
          <div class="self-employment-roadmap-panel-title">
            ${positionIconSvg(activeArea.icon, "position-icon-svg self-employment-roadmap-panel-icon")}
            <h3>${escapeHtml(activeArea.title)}</h3>
          </div>
          ${selectedArea === "planning" ? renderSelfEmploymentGanttPhaseFilter(project) : ""}
        </header>
        ${selfEmploymentRoadmapPanel(selectedArea, evaluation)}
      </article>
    </section>
  `;
}

function renderSelfEmploymentGanttPhaseFilter(project: SelfEmploymentProject): string {
  const phases = [...project.businessIdeaCanvasMeta.phases].sort((a, b) => a.order - b.order);
  if (phases.length === 0) return "";
  const selectedIds = new Set(selfEmploymentGanttPhaseFilterIds(project));
  return `
    <div class="self-employment-gantt-phase-filter" role="toolbar" aria-label="Gantt-Phasen filtern">
      ${phases
        .map((phase) => {
          const active = selectedIds.has(phase.id);
          const phaseNumber = selfEmploymentGanttPhaseNumber(phase.id);
          return `
            <button
              class="self-employment-gantt-phase-filter-button${active ? " active" : ""}"
              type="button"
              data-action="self-employment-toggle-gantt-phase-filter"
              data-self-employment-project-id="${escapeHtml(project.id)}"
              data-self-employment-gantt-phase-id="${escapeHtml(phase.id)}"
              aria-pressed="${active}"
              aria-label="${escapeHtml(`${phase.name} ${active ? "ausblenden" : "anzeigen"}`)}"
              title="${escapeHtml(phase.name)}"
            >${escapeHtml(phaseNumber)}</button>
          `;
        })
        .join("")}
    </div>
  `;
}

function selfEmploymentRoadmap(selectedArea: SelfEmploymentRoadmapAreaId): string {
  return `
    <div class="self-employment-roadmap" aria-label="Projekt-Roadmap">
      ${SELF_EMPLOYMENT_ROADMAP_AREAS.map((area) => {
        const active = area.id === selectedArea;
        return `
          <button
            class="self-employment-roadmap-step${active ? " active" : ""}"
            type="button"
            data-action="self-employment-select-roadmap-area"
            data-self-employment-roadmap-area="${area.id}"
            aria-pressed="${active}"
          >
            ${positionIconSvg(area.icon, "position-icon-svg self-employment-roadmap-icon")}
            <span>${escapeHtml(area.title)}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function selfEmploymentRoadmapPanel(
  areaId: SelfEmploymentRoadmapAreaId,
  evaluation: SelfEmploymentProjectEvaluation
): string {
  const { project } = evaluation;
  if (areaId === "idea") {
    return renderBusinessCanvas(project);
  }
  if (areaId === "planning") {
    return renderSelfEmploymentProjectGantt(project);
  }
  if (areaId === "contacts") return selfEmploymentContactsEditor(project);
  if (areaId === "invoices") return selfEmploymentInvoicesEditor(project);
  if (areaId === "tasks") return selfEmploymentTasksEditor(project);
  if (areaId === "time") {
    return `
      <div class="self-employment-edit-grid">
        ${selfEmploymentNumberField(project, "requiredHoursPerWeek", "Projektzeit benoetigt / Woche", project.requiredHoursPerWeek, 0, 168, 0.5)}
        ${selfEmploymentReadOnlyField("Freie Reserve / Woche", `${hoursLabel(evaluation.availableTimeHours)} / Woche`)}
        ${selfEmploymentNumberField(project, "fixedProjectHoursPerWeek", "Feste Projektzeit / Woche", project.fixedProjectHoursPerWeek, 0, 168, 0.5)}
        ${selfEmploymentNumberField(project, "flexibleProjectHoursPerWeek", "Flexible Projektzeit / Woche", project.flexibleProjectHoursPerWeek, 0, 168, 0.5)}
        ${selfEmploymentListTextareaField(project, "linkedHabits", "Zugehoerige Habits", project.linkedHabits)}
        ${selfEmploymentListTextareaField(project, "blockingHabits", "Blockierende Habits", project.blockingHabits)}
        ${selfEmploymentTextField(project, "weekScenario", "Projekt-Szenario", project.weekScenario)}
        ${selfEmploymentReadOnlyField("Hinweis", evaluation.reasons[0])}
      </div>
    `;
  }
  if (areaId === "budget") {
    return `
      <div class="self-employment-edit-grid">
        ${selfEmploymentNumberField(project, "startCapitalRequired", "Benoetigtes Startkapital", project.startCapitalRequired, 0, 999999999, 50)}
        ${selfEmploymentNumberField(project, "availableReserveOverride", "Freie Ruecklage Override", project.availableReserveOverride ?? "", 0, 999999999, 50)}
        ${selfEmploymentReadOnlyField("Verfuegbare freie Ruecklage", money(evaluation.availableReserve))}
        ${selfEmploymentReadOnlyField("Offene Finanzierungsluecke", money(evaluation.fundingGap))}
        ${selfEmploymentNumberField(project, "oneTimeCosts", "Einmalige Kosten", project.oneTimeCosts, 0, 999999999, 50)}
      </div>
    `;
  }
  if (areaId === "profit") {
    return `
      <div class="self-employment-edit-grid">
        ${selfEmploymentNumberField(project, "monthlyRevenueExpected", "Umsatz / Monat", project.monthlyRevenueExpected, 0, 999999999, 50)}
        ${selfEmploymentNumberField(project, "monthlyRunningCosts", "Laufende Kosten", project.monthlyRunningCosts, 0, 999999999, 50)}
        ${selfEmploymentNumberField(project, "taxReservePercent", "Ruecklage/Steuer in %", project.taxReservePercent, 0, 100, 1)}
        ${selfEmploymentReadOnlyField("Gewinn vor Ruecklage", money(evaluation.monthlyProfitBeforeReserve))}
        ${selfEmploymentReadOnlyField("Freier Gewinn", money(evaluation.monthlyProfitAfterReserve))}
        ${selfEmploymentNumberField(project, "monthlyWorkHours", "Arbeitszeit / Monat", project.monthlyWorkHours, 0, 744, 1)}
        ${selfEmploymentReadOnlyField("Effektiver Stundenwert", money(evaluation.effectiveHourlyValue))}
      </div>
    `;
  }
  return `
    <div class="self-employment-edit-grid">
      ${selfEmploymentReadOnlyField("Machbarkeit", selfEmploymentFeasibilityLabel(evaluation.feasibility))}
      ${selfEmploymentReadOnlyField("Offene Rechnungen", money(evaluation.openInvoiceAmount))}
      ${selfEmploymentReadOnlyField("Offene Aufgabenzeit", hoursLabel(evaluation.openTaskHours))}
      ${selfEmploymentReadOnlyField("Bewertung", evaluation.reasons.join(" "))}
    </div>
  `;
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
    projectId: button.dataset.selfEmploymentProjectId || host.getState().selfEmployment.selectedProjectId,
    type: "phase",
    phaseId: button.dataset.selfEmploymentGanttPhaseId || "",
    ...selfEmploymentGanttPopoverPosition(button)
  };
  host.renderAll();
}

export function openSelfEmploymentGanttCardEditor(button: HTMLButtonElement): void {
  selfEmploymentUiState.ganttEditor = {
    projectId: button.dataset.selfEmploymentProjectId || host.getState().selfEmployment.selectedProjectId,
    type: "card",
    cardId: button.dataset.selfEmploymentGanttCardId || "",
    ...selfEmploymentGanttPopoverPosition(button)
  };
  host.renderAll();
}

export function closeSelfEmploymentGanttEditor(): void {
  if (!selfEmploymentUiState.ganttEditor) return;
  selfEmploymentUiState.ganttEditor = null;
  document.querySelector<HTMLElement>("[data-self-employment-gantt-popover]")?.remove();
}

function selfEmploymentGanttPhaseFilterIds(project: SelfEmploymentProject): string[] {
  const selectedIds = new Set(project.ganttPhaseFilterIds);
  return [...project.businessIdeaCanvasMeta.phases]
    .sort((a, b) => a.order - b.order)
    .map((phase) => phase.id)
    .filter((phaseId) => selectedIds.has(phaseId));
}

export function toggleSelfEmploymentGanttPhaseFilter(projectId: string, phaseId: string): void {
  const project = selfEmploymentProjectById(projectId);
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
  updateSelfEmploymentProject(projectId, (item) => ({ ...item, ganttPhaseFilterIds }), true);
}

function renderSelfEmploymentProjectGantt(project: SelfEmploymentProject): string {
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

function selfEmploymentGanttPhaseNumberField(
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

function selfEmploymentGanttPhaseNumber(phaseId: string): string {
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


export function selfEmploymentProjectById(projectId: string): SelfEmploymentProject | null {
  return host.getState().selfEmployment.projects.find((project) => project.id === projectId) ?? null;
}

function selfEmploymentTextField(
  project: SelfEmploymentProject,
  field: string,
  label: string,
  value: string,
  type = "text"
): string {
  return `
    <label class="field self-employment-edit-field">
      <span>${escapeHtml(label)}</span>
      <input type="${escapeHtml(type)}" value="${escapeHtml(value)}" data-self-employment-project-id="${escapeHtml(
        project.id
      )}" data-self-employment-field="${escapeHtml(field)}" />
    </label>
  `;
}

function selfEmploymentNumberField(
  project: SelfEmploymentProject,
  field: string,
  label: string,
  value: number | "",
  min: number,
  max: number,
  step: number
): string {
  return `
    <label class="field self-employment-edit-field">
      <span>${escapeHtml(label)}</span>
      <input type="number" min="${min}" max="${max}" step="${step}" value="${escapeHtml(value)}" data-self-employment-project-id="${escapeHtml(
        project.id
      )}" data-self-employment-field="${escapeHtml(field)}" />
    </label>
  `;
}

function selfEmploymentListTextareaField(
  project: SelfEmploymentProject,
  field: string,
  label: string,
  value: string[]
): string {
  return `
    <label class="field self-employment-edit-field wide">
      <span>${escapeHtml(label)}</span>
      <textarea rows="3" data-self-employment-project-id="${escapeHtml(project.id)}" data-self-employment-list-field="${escapeHtml(
        field
      )}">${escapeHtml(value.join("\n"))}</textarea>
    </label>
  `;
}

function selfEmploymentReadOnlyField(label: string, value: string): string {
  return `
    <div class="field self-employment-readonly-field">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function selfEmploymentContactsEditor(project: SelfEmploymentProject): string {
  return `
    <div class="self-employment-collection-editor">
      <div class="self-employment-collection-head">
        <span>${project.contacts.length ? `${intNumber(project.contacts.length)} Kontakte` : "Noch keine Kontakte"}</span>
        <button class="button mini secondary" type="button" data-action="self-employment-add-contact" data-self-employment-project-id="${escapeHtml(
          project.id
        )}">Kontakt hinzufuegen</button>
      </div>
      <div class="self-employment-collection-list">
        ${
          project.contacts.length
            ? project.contacts
                .map(
                  (contact) => `
                    <article class="self-employment-collection-item">
                      <header>
                        <strong>${escapeHtml(contact.name || "Kontakt")}</strong>
                        <button class="button mini danger" type="button" data-action="self-employment-remove-contact" data-self-employment-project-id="${escapeHtml(
                          project.id
                        )}" data-self-employment-item-id="${escapeHtml(contact.id)}">Loeschen</button>
                      </header>
                      <div class="self-employment-edit-grid compact">
                        ${selfEmploymentCollectionTextField(project, "contacts", contact.id, "name", "Name", contact.name)}
                        ${selfEmploymentCollectionSelectField(project, "contacts", contact.id, "status", "Status", contact.status, [
                          ["lead", "Lead"],
                          ["first_contact", "Erstkontakt"],
                          ["offer_sent", "Angebot gesendet"],
                          ["customer", "Kunde"],
                          ["paused", "Pausiert"]
                        ])}
                        ${selfEmploymentCollectionTextField(project, "contacts", contact.id, "lastContact", "Letzter Kontakt", contact.lastContact, "date")}
                        ${selfEmploymentCollectionTextField(project, "contacts", contact.id, "nextStep", "Naechster Schritt", contact.nextStep)}
                        ${selfEmploymentCollectionNumberField(project, "contacts", contact.id, "revenuePotential", "Potenzial", contact.revenuePotential, 0, 999999999, 50)}
                        ${selfEmploymentCollectionNumberField(project, "contacts", contact.id, "probabilityPercent", "Wahrscheinlichkeit in %", contact.probabilityPercent, 0, 100, 1)}
                      </div>
                    </article>
                  `
                )
                .join("")
            : `<p class="self-employment-empty-note">Kontaktliste fuer dieses Projekt anlegen</p>`
        }
      </div>
    </div>
  `;
}

function selfEmploymentInvoicesEditor(project: SelfEmploymentProject): string {
  return `
    <div class="self-employment-collection-editor">
      <div class="self-employment-collection-head">
        <span>${project.invoices.length ? `${intNumber(project.invoices.length)} Angebote / Rechnungen` : "Noch keine Angebote"}</span>
        <button class="button mini secondary" type="button" data-action="self-employment-add-invoice" data-self-employment-project-id="${escapeHtml(
          project.id
        )}">Angebot hinzufuegen</button>
      </div>
      <div class="self-employment-collection-list">
        ${
          project.invoices.length
            ? project.invoices
                .map(
                  (invoice) => `
                    <article class="self-employment-collection-item">
                      <header>
                        <strong>${escapeHtml(invoice.label || "Angebot / Rechnung")}</strong>
                        <button class="button mini danger" type="button" data-action="self-employment-remove-invoice" data-self-employment-project-id="${escapeHtml(
                          project.id
                        )}" data-self-employment-item-id="${escapeHtml(invoice.id)}">Loeschen</button>
                      </header>
                      <div class="self-employment-edit-grid compact">
                        ${selfEmploymentCollectionTextField(project, "invoices", invoice.id, "label", "Bezeichnung", invoice.label)}
                        ${selfEmploymentCollectionSelectField(project, "invoices", invoice.id, "status", "Status", invoice.status, [
                          ["offer_open", "Angebot offen"],
                          ["offer_accepted", "Angebot angenommen"],
                          ["invoice_created", "Rechnung erstellt"],
                          ["paid", "Bezahlt"]
                        ])}
                        ${selfEmploymentCollectionTextField(project, "invoices", invoice.id, "dueDate", "Zieldatum", invoice.dueDate, "date")}
                        ${selfEmploymentCollectionNumberField(project, "invoices", invoice.id, "amount", "Betrag", invoice.amount, 0, 999999999, 50)}
                      </div>
                    </article>
                  `
                )
                .join("")
            : `<p class="self-employment-empty-note">Offene Angebote und Rechnungen erscheinen hier</p>`
        }
      </div>
    </div>
  `;
}

function selfEmploymentTasksEditor(project: SelfEmploymentProject): string {
  return `
    <div class="self-employment-collection-editor">
      <div class="self-employment-collection-head">
        <span>${project.tasks.length ? `${intNumber(project.tasks.length)} Aufgaben` : "Noch keine Aufgaben"}</span>
        <button class="button mini secondary" type="button" data-action="self-employment-add-task" data-self-employment-project-id="${escapeHtml(
          project.id
        )}">Aufgabe hinzufuegen</button>
      </div>
      <div class="self-employment-collection-list">
        ${
          project.tasks.length
            ? project.tasks
                .map(
                  (task) => `
                    <article class="self-employment-collection-item">
                      <header>
                        <strong>${escapeHtml(task.title || "Aufgabe")}</strong>
                        <button class="button mini danger" type="button" data-action="self-employment-remove-task" data-self-employment-project-id="${escapeHtml(
                          project.id
                        )}" data-self-employment-item-id="${escapeHtml(task.id)}">Loeschen</button>
                      </header>
                      <div class="self-employment-edit-grid compact">
                        ${selfEmploymentCollectionTextField(project, "tasks", task.id, "title", "Titel", task.title)}
                        ${selfEmploymentCollectionSelectField(project, "tasks", task.id, "priority", "Prioritaet", task.priority, [
                          ["low", "Niedrig"],
                          ["medium", "Mittel"],
                          ["high", "Hoch"]
                        ])}
                        ${selfEmploymentCollectionTextField(project, "tasks", task.id, "dueDate", "Faelligkeit", task.dueDate, "date")}
                        ${selfEmploymentCollectionNumberField(project, "tasks", task.id, "estimatedHours", "Zeit in Stunden", task.estimatedHours, 0, 1000, 0.5)}
                        ${selfEmploymentCollectionSelectField(project, "tasks", task.id, "status", "Status", task.status, [
                          ["open", "Offen"],
                          ["in_progress", "In Arbeit"],
                          ["done", "Erledigt"]
                        ])}
                      </div>
                    </article>
                  `
                )
                .join("")
            : `<p class="self-employment-empty-note">Projektbezogene Aufgaben anlegen</p>`
        }
      </div>
    </div>
  `;
}

function selfEmploymentCollectionTextField(
  project: SelfEmploymentProject,
  collection: string,
  itemId: string,
  field: string,
  label: string,
  value: string,
  type = "text"
): string {
  return `
    <label class="field self-employment-edit-field">
      <span>${escapeHtml(label)}</span>
      <input type="${escapeHtml(type)}" value="${escapeHtml(value)}" data-self-employment-project-id="${escapeHtml(
        project.id
      )}" data-self-employment-collection="${escapeHtml(collection)}" data-self-employment-item-id="${escapeHtml(
        itemId
      )}" data-self-employment-item-field="${escapeHtml(field)}" />
    </label>
  `;
}

function selfEmploymentCollectionNumberField(
  project: SelfEmploymentProject,
  collection: string,
  itemId: string,
  field: string,
  label: string,
  value: number,
  min: number,
  max: number,
  step: number
): string {
  return `
    <label class="field self-employment-edit-field">
      <span>${escapeHtml(label)}</span>
      <input type="number" min="${min}" max="${max}" step="${step}" value="${value}" data-self-employment-project-id="${escapeHtml(
        project.id
      )}" data-self-employment-collection="${escapeHtml(collection)}" data-self-employment-item-id="${escapeHtml(
        itemId
      )}" data-self-employment-item-field="${escapeHtml(field)}" />
    </label>
  `;
}

function selfEmploymentCollectionSelectField(
  project: SelfEmploymentProject,
  collection: string,
  itemId: string,
  field: string,
  label: string,
  value: string,
  options: Array<[string, string]>
): string {
  return `
    <label class="field self-employment-edit-field">
      <span>${escapeHtml(label)}</span>
      <select data-self-employment-project-id="${escapeHtml(project.id)}" data-self-employment-collection="${escapeHtml(
        collection
      )}" data-self-employment-item-id="${escapeHtml(itemId)}" data-self-employment-item-field="${escapeHtml(field)}">
        ${options.map(([optionValue, optionLabel]) => selfEmploymentOption(optionValue, optionLabel, value)).join("")}
      </select>
    </label>
  `;
}

function selfEmploymentOption(value: string, label: string, selectedValue: string): string {
  return `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function normalizeSelfEmploymentSelection(): void {
  const selectedRoadmapAreaId = selfEmploymentRoadmapAreaIdFromValue(host.getState().selfEmployment.selectedRoadmapAreaId) ?? "idea";
  if (host.getState().selfEmployment.projects.length === 0) {
    host.getState().selfEmployment = {
      ...host.getState().selfEmployment,
      selectedProjectId: "",
      selectedRoadmapAreaId
    };
    return;
  }
  if (host.getState().selfEmployment.selectedRoadmapAreaId !== selectedRoadmapAreaId) {
    host.getState().selfEmployment = {
      ...host.getState().selfEmployment,
      selectedRoadmapAreaId
    };
  }
  if (!host.getState().selfEmployment.projects.some((project) => project.id === host.getState().selfEmployment.selectedProjectId)) {
    host.getState().selfEmployment = {
      ...host.getState().selfEmployment,
      selectedProjectId: host.getState().selfEmployment.projects[0].id
    };
  }
}

export function selectSelfEmploymentProject(projectId: string): void {
  if (!host.getState().selfEmployment.projects.some((project) => project.id === projectId)) return;
  selfEmploymentUiState.ganttEditor = null;
  host.getState().selfEmployment = {
    ...host.getState().selfEmployment,
    selectedProjectId: projectId
  };
  host.renderAll();
}

export function addSelfEmploymentProject(): void {
  const index = host.getState().selfEmployment.projects.length + 1;
  const id = createId();
  const canvasDefaults = defaultBusinessIdeaCanvasForProject(id, { idea: "Neue Geschaeftsidee" });
  const project: SelfEmploymentProject = {
    ...defaultSelfEmploymentState().projects[0],
    ...canvasDefaults,
    id,
    name: `Projekt ${intNumber(index)}`,
    labels: [],
    status: "idea",
    idea: "Neue Geschaeftsidee",
    problem: "",
    targetGroup: "",
    revenueModel: "",
    projectGoal: "",
    milestones: [],
    nextSteps: ["Idee pruefen", "Zeitbedarf schaetzen", "Startbudget klaeren"],
    contacts: [],
    invoices: [],
    tasks: [
      {
        id: createId(),
        title: "Projektidee konkretisieren",
        priority: "medium",
        dueDate: "",
        estimatedHours: 1,
        status: "open"
      }
    ],
    requiredHoursPerWeek: 4,
    fixedProjectHoursPerWeek: 0,
    flexibleProjectHoursPerWeek: 4,
    startCapitalRequired: 0,
    monthlyRevenueExpected: 0,
    monthlyRunningCosts: 0,
    oneTimeCosts: 0,
    monthlyWorkHours: 16,
    gantt: normalizeSelfEmploymentGanttPlan({}, canvasDefaults.businessIdeaCanvas, canvasDefaults.businessIdeaCanvasMeta),
    ganttPhaseFilterIds: []
  };
  host.getState().selfEmployment = {
    ...host.getState().selfEmployment,
    selectedProjectId: id,
    selectedRoadmapAreaId: "idea",
    projects: [...host.getState().selfEmployment.projects, project]
  };
  host.renderAll();
}

export function selectSelfEmploymentRoadmapArea(rawAreaId: string): void {
  const selectedRoadmapAreaId = selfEmploymentRoadmapAreaIdFromValue(rawAreaId);
  if (!selectedRoadmapAreaId) return;
  selfEmploymentUiState.ganttEditor = null;
  host.getState().selfEmployment = {
    ...host.getState().selfEmployment,
    selectedRoadmapAreaId
  };
  host.renderAll();
}

export function showSelfEmploymentIconPicker(button: HTMLButtonElement): void {
  const projectId = button.dataset.selfEmploymentProjectId;
  if (!projectId || !host.getState().selfEmployment.projects.some((project) => project.id === projectId)) return;
  const rect = button.getBoundingClientRect();
  const panelWidth = 320;
  const panelHeight = 360;
  const left =
    rect.right + 12 + panelWidth <= window.innerWidth
      ? rect.right + 12
      : Math.max(12, rect.left - panelWidth - 12);
  const top = Math.max(12, Math.min(rect.top, window.innerHeight - panelHeight - 12));
  selfEmploymentUiState.iconPicker = { projectId, top, left };
  renderSelfEmploymentIconPicker();
}

export function hideSelfEmploymentIconPicker(): void {
  selfEmploymentUiState.iconPicker = null;
  renderSelfEmploymentIconPicker();
}

export function selectSelfEmploymentIcon(projectId: string, icon: string): void {
  selfEmploymentUiState.iconPicker = null;
  updateSelfEmploymentProject(
    projectId,
    (project) => ({ ...project, icon: normalizePositionIcon(icon, project.icon || "briefcase") }),
    true
  );
}

export function renderSelfEmploymentIconPicker(): void {
  const picker = document.querySelector<HTMLDivElement>("#selfEmploymentUiState.iconPicker");
  if (!picker) return;
  if (!selfEmploymentUiState.iconPicker) {
    picker.hidden = true;
    return;
  }

  const project = host.getState().selfEmployment.projects.find((item) => item.id === selfEmploymentUiState.iconPicker?.projectId);
  if (!project) {
    selfEmploymentUiState.iconPicker = null;
    picker.hidden = true;
    return;
  }

  const currentIcon = normalizePositionIcon(project.icon, "briefcase");
  picker.style.top = `${selfEmploymentUiState.iconPicker.top}px`;
  picker.style.left = `${selfEmploymentUiState.iconPicker.left}px`;
  picker.innerHTML = `
    <div class="position-icon-picker-head">
      <span>Projekt-Icon</span>
      <button class="icon-button" type="button" data-action="self-employment-close-icon-picker" aria-label="Iconauswahl schliessen">x</button>
    </div>
    <div class="position-icon-picker-grid">
      ${POSITION_ICONS.map((icon) => {
        const active = icon.id === currentIcon;
        return `
          <button
            class="position-icon-option ${active ? "active" : ""}"
            type="button"
            data-action="self-employment-select-icon"
            data-self-employment-project-id="${escapeHtml(project.id)}"
            data-self-employment-icon="${escapeHtml(icon.id)}"
            aria-pressed="${active}"
            title="${escapeHtml(icon.label)}"
          >
            ${positionIconSvg(icon.id)}
            <span>${escapeHtml(icon.label)}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
  picker.hidden = false;
}

export function renameSelfEmploymentProject(projectId: string): void {
  const project = host.getState().selfEmployment.projects.find((item) => item.id === projectId);
  if (!project) return;
  const nextName = window.prompt("Projekt umbenennen", project.name)?.trim();
  if (!nextName || nextName === project.name) return;
  host.getState().selfEmployment = {
    ...host.getState().selfEmployment,
    projects: host.getState().selfEmployment.projects.map((item) => (item.id === projectId ? { ...item, name: nextName } : item))
  };
  host.renderAll();
}

export function deleteSelfEmploymentProject(projectId: string): void {
  const project = host.getState().selfEmployment.projects.find((item) => item.id === projectId);
  if (!project) return;
  if (!window.confirm(`Projekt "${project.name}" loeschen?`)) return;
  const projects = host.getState().selfEmployment.projects.filter((item) => item.id !== projectId);
  const selectedProjectId =
    host.getState().selfEmployment.selectedProjectId === projectId ? projects[0]?.id ?? "" : host.getState().selfEmployment.selectedProjectId;
  if (selfEmploymentUiState.labelPickerProjectId === projectId) selfEmploymentUiState.labelPickerProjectId = null;
  if (selfEmploymentUiState.iconPicker?.projectId === projectId) selfEmploymentUiState.iconPicker = null;
  if (selfEmploymentUiState.ganttEditor?.projectId === projectId) selfEmploymentUiState.ganttEditor = null;
  host.getState().selfEmployment = {
    ...host.getState().selfEmployment,
    selectedProjectId,
    projects
  };
  host.renderAll();
}

export function toggleSelfEmploymentLabelPicker(projectId: string): void {
  if (!host.getState().selfEmployment.projects.some((project) => project.id === projectId)) return;
  selfEmploymentUiState.labelPickerProjectId = selfEmploymentUiState.labelPickerProjectId === projectId ? null : projectId;
  host.renderAll();
}

export function toggleSelfEmploymentProjectLabel(projectId: string, rawLabel: string): void {
  const label = rawLabel.trim();
  if (!label) return;
  host.getState().selfEmployment = {
    ...host.getState().selfEmployment,
    projects: host.getState().selfEmployment.projects.map((project) => {
      if (project.id !== projectId) return project;
      const labels = project.labels.includes(label)
        ? project.labels.filter((item) => item !== label)
        : [...project.labels, label];
      return { ...project, labels };
    })
  };
  host.renderAll();
}

export function updateSelfEmploymentProjectField(
  projectId: string,
  field: string,
  rawValue: string,
  renderAfterUpdate: boolean
): void {
  updateSelfEmploymentProject(
    projectId,
    (project) => {
      if (field === "idea") return { ...project, idea: rawValue };
      if (field === "problem") return { ...project, problem: rawValue };
      if (field === "targetGroup") return { ...project, targetGroup: rawValue };
      if (field === "revenueModel") return { ...project, revenueModel: rawValue };
      if (field === "motivation") return { ...project, motivation: rawValue };
      if (field === "projectGoal") return { ...project, projectGoal: rawValue };
      if (field === "startDate") return { ...project, startDate: rawValue };
      if (field === "dependencies") return { ...project, dependencies: rawValue };
      if (field === "weekScenario") return { ...project, weekScenario: rawValue };
      if (field === "risk") return { ...project, risk: selfEmploymentRiskFromValue(rawValue, project.risk) };
      if (field === "status") return { ...project, status: selfEmploymentStatusFromValue(rawValue, project.status) };
      if (field === "availableReserveOverride") {
        return {
          ...project,
          availableReserveOverride:
            rawValue.trim() === "" ? null : selfEmploymentNumberValue(rawValue, project.availableReserveOverride ?? 0, 0, 999999999)
        };
      }
      if (field === "plannedDurationWeeks") {
        return { ...project, plannedDurationWeeks: selfEmploymentNumberValue(rawValue, project.plannedDurationWeeks, 0, 520) };
      }
      if (field === "requiredHoursPerWeek") {
        return { ...project, requiredHoursPerWeek: selfEmploymentNumberValue(rawValue, project.requiredHoursPerWeek, 0, 168) };
      }
      if (field === "fixedProjectHoursPerWeek") {
        return { ...project, fixedProjectHoursPerWeek: selfEmploymentNumberValue(rawValue, project.fixedProjectHoursPerWeek, 0, 168) };
      }
      if (field === "flexibleProjectHoursPerWeek") {
        return { ...project, flexibleProjectHoursPerWeek: selfEmploymentNumberValue(rawValue, project.flexibleProjectHoursPerWeek, 0, 168) };
      }
      if (field === "startCapitalRequired") {
        return { ...project, startCapitalRequired: selfEmploymentNumberValue(rawValue, project.startCapitalRequired, 0, 999999999) };
      }
      if (field === "oneTimeCosts") {
        return { ...project, oneTimeCosts: selfEmploymentNumberValue(rawValue, project.oneTimeCosts, 0, 999999999) };
      }
      if (field === "monthlyRevenueExpected") {
        return { ...project, monthlyRevenueExpected: selfEmploymentNumberValue(rawValue, project.monthlyRevenueExpected, 0, 999999999) };
      }
      if (field === "monthlyRunningCosts") {
        return { ...project, monthlyRunningCosts: selfEmploymentNumberValue(rawValue, project.monthlyRunningCosts, 0, 999999999) };
      }
      if (field === "taxReservePercent") {
        return { ...project, taxReservePercent: selfEmploymentNumberValue(rawValue, project.taxReservePercent, 0, 100) };
      }
      if (field === "monthlyWorkHours") {
        return { ...project, monthlyWorkHours: selfEmploymentNumberValue(rawValue, project.monthlyWorkHours, 0, 744) };
      }
      return project;
    },
    renderAfterUpdate
  );
}

export function updateSelfEmploymentProjectListField(
  projectId: string,
  field: string,
  rawValue: string,
  renderAfterUpdate: boolean
): void {
  const items = selfEmploymentTextToList(rawValue);
  updateSelfEmploymentProject(
    projectId,
    (project) => {
      if (field === "milestones") return { ...project, milestones: items };
      if (field === "nextSteps") return { ...project, nextSteps: items };
      if (field === "linkedHabits") return { ...project, linkedHabits: items };
      if (field === "blockingHabits") return { ...project, blockingHabits: items };
      return project;
    },
    renderAfterUpdate
  );
}

export function updateSelfEmploymentGanttPhaseField(
  projectId: string,
  phaseId: string,
  field: string,
  rawValue: string | boolean,
  renderAfterUpdate: boolean
): void {
  updateSelfEmploymentProject(
    projectId,
    (project) => {
      const gantt = normalizeSelfEmploymentGanttPlan(project.gantt, project.businessIdeaCanvas, project.businessIdeaCanvasMeta);
      const phaseIds = new Set(project.businessIdeaCanvasMeta.phases.map((phase) => phase.id));
      const labelIds = new Set(orderedGanttLabels(project.businessIdeaCanvasMeta).map((label) => label.id));
      const phases = gantt.phases.map((phase) => {
        if (phase.phaseId !== phaseId) return phase;
        const value = String(rawValue);
        if (field === "enabled") return { ...phase, enabled: Boolean(rawValue) };
        if (field === "startDate") return { ...phase, startDate: value.trim() || null };
        if (field === "startMode") {
          const startMode: SelfEmploymentGanttStartMode = value === "after_previous_label" ? "after_previous_label" : "manual";
          return { ...phase, startMode };
        }
        if (field === "triggerPreviousPhaseId") {
          return { ...phase, triggerPreviousPhaseId: value.trim() ? (phaseIds.has(value) ? value : phase.triggerPreviousPhaseId) : null };
        }
        if (field === "triggerLabelId") {
          const labelId = normalizedGanttLabelId(value);
          return { ...phase, triggerLabelId: labelIds.has(labelId) ? labelId : phase.triggerLabelId };
        }
        if (field === "defaultTimeBudgetHours") {
          return {
            ...phase,
            defaultTimeBudgetHours: selfEmploymentNumberValue(value, phase.defaultTimeBudgetHours, 0, 100000)
          };
        }
        return phase;
      });
      const nextProject = { ...project, gantt: { ...gantt, phases } };
      return {
        ...nextProject,
        gantt: normalizeSelfEmploymentGanttPlan(nextProject.gantt, nextProject.businessIdeaCanvas, nextProject.businessIdeaCanvasMeta)
      };
    },
    renderAfterUpdate
  );
}

export function updateSelfEmploymentGanttCardField(
  projectId: string,
  cardId: string,
  field: string,
  rawValue: string | boolean,
  renderAfterUpdate: boolean
): void {
  updateSelfEmploymentProject(
    projectId,
    (project) => {
      const node = project.businessIdeaCanvas.nodes.find((item) => item.id === cardId && item.type !== "group");
      if (!node) return project;
      const value = String(rawValue);
      if (field === "labelId" || field === "phaseId") {
        const labelIds = new Set(orderedGanttLabels(project.businessIdeaCanvasMeta).map((label) => label.id));
        const phaseIds = new Set(project.businessIdeaCanvasMeta.phases.map((phase) => phase.id));
        const currentMeta = project.businessIdeaCanvasMeta.nodeMeta[cardId] ?? {
          labelId: project.businessIdeaCanvasMeta.activeLabelId,
          phaseId: project.businessIdeaCanvasMeta.activePhaseId,
          shape: "rounded-rectangle" as BusinessIdeaCanvasShape
        };
        const nextMeta = {
          ...currentMeta,
          ...(field === "labelId" && labelIds.has(normalizedGanttLabelId(value))
            ? { labelId: normalizedGanttLabelId(value) }
            : {}),
          ...(field === "phaseId" && phaseIds.has(value) ? { phaseId: value } : {})
        };
        const nextProject = {
          ...project,
          businessIdeaCanvasMeta: {
            ...project.businessIdeaCanvasMeta,
            nodeMeta: {
              ...project.businessIdeaCanvasMeta.nodeMeta,
              [cardId]: nextMeta
            }
          }
        };
        return {
          ...nextProject,
          gantt: normalizeSelfEmploymentGanttPlan(nextProject.gantt, nextProject.businessIdeaCanvas, nextProject.businessIdeaCanvasMeta)
        };
      }
      const gantt = normalizeSelfEmploymentGanttPlan(project.gantt, project.businessIdeaCanvas, project.businessIdeaCanvasMeta);
      const cardPlans = gantt.cardPlans.map((plan) => {
        if (plan.cardId !== cardId) return plan;
        if (field === "timeBudgetHours") {
          return { ...plan, timeBudgetHours: selfEmploymentNumberValue(value, plan.timeBudgetHours, 0, 100000) };
        }
        if (field === "startDate") return { ...plan, startDate: value.trim() || null };
        if (field === "note") return { ...plan, note: value };
        return plan;
      });
      const nextProject = { ...project, gantt: { ...gantt, cardPlans } };
      return {
        ...nextProject,
        gantt: normalizeSelfEmploymentGanttPlan(nextProject.gantt, nextProject.businessIdeaCanvas, nextProject.businessIdeaCanvasMeta)
      };
    },
    renderAfterUpdate
  );
}

export function updateSelfEmploymentCollectionItemField(
  projectId: string,
  collection: string,
  itemId: string,
  field: string,
  rawValue: string,
  renderAfterUpdate: boolean
): void {
  updateSelfEmploymentProject(
    projectId,
    (project) => {
      if (collection === "contacts") {
        return {
          ...project,
          contacts: project.contacts.map((contact) => {
            if (contact.id !== itemId) return contact;
            if (field === "name") return { ...contact, name: rawValue };
            if (field === "status") return { ...contact, status: selfEmploymentContactStatusFromValue(rawValue, contact.status) };
            if (field === "lastContact") return { ...contact, lastContact: rawValue };
            if (field === "nextStep") return { ...contact, nextStep: rawValue };
            if (field === "revenuePotential") {
              return { ...contact, revenuePotential: selfEmploymentNumberValue(rawValue, contact.revenuePotential, 0, 999999999) };
            }
            if (field === "probabilityPercent") {
              return { ...contact, probabilityPercent: selfEmploymentNumberValue(rawValue, contact.probabilityPercent, 0, 100) };
            }
            return contact;
          })
        };
      }
      if (collection === "invoices") {
        return {
          ...project,
          invoices: project.invoices.map((invoice) => {
            if (invoice.id !== itemId) return invoice;
            if (field === "label") return { ...invoice, label: rawValue };
            if (field === "status") return { ...invoice, status: selfEmploymentInvoiceStatusFromValue(rawValue, invoice.status) };
            if (field === "dueDate") return { ...invoice, dueDate: rawValue };
            if (field === "amount") {
              return { ...invoice, amount: selfEmploymentNumberValue(rawValue, invoice.amount, 0, 999999999) };
            }
            return invoice;
          })
        };
      }
      if (collection === "tasks") {
        return {
          ...project,
          tasks: project.tasks.map((task) => {
            if (task.id !== itemId) return task;
            if (field === "title") return { ...task, title: rawValue };
            if (field === "priority") return { ...task, priority: selfEmploymentTaskPriorityFromValue(rawValue, task.priority) };
            if (field === "dueDate") return { ...task, dueDate: rawValue };
            if (field === "estimatedHours") {
              return { ...task, estimatedHours: selfEmploymentNumberValue(rawValue, task.estimatedHours, 0, 1000) };
            }
            if (field === "status") return { ...task, status: selfEmploymentTaskStatusFromValue(rawValue, task.status) };
            return task;
          })
        };
      }
      return project;
    },
    renderAfterUpdate
  );
}

export function addSelfEmploymentContact(projectId: string): void {
  updateSelfEmploymentProject(
    projectId,
    (project) => ({
      ...project,
      contacts: [
        ...project.contacts,
        {
          id: createId(),
          name: "Neuer Kontakt",
          status: "lead",
          lastContact: "",
          nextStep: "",
          revenuePotential: 0,
          probabilityPercent: 0
        }
      ]
    }),
    true
  );
}

export function addSelfEmploymentInvoice(projectId: string): void {
  updateSelfEmploymentProject(
    projectId,
    (project) => ({
      ...project,
      invoices: [
        ...project.invoices,
        {
          id: createId(),
          label: "Neues Angebot",
          status: "offer_open",
          dueDate: "",
          amount: 0
        }
      ]
    }),
    true
  );
}

export function addSelfEmploymentTask(projectId: string): void {
  updateSelfEmploymentProject(
    projectId,
    (project) => ({
      ...project,
      tasks: [
        ...project.tasks,
        {
          id: createId(),
          title: "Neue Aufgabe",
          priority: "medium",
          dueDate: "",
          estimatedHours: 1,
          status: "open"
        }
      ]
    }),
    true
  );
}

export function removeSelfEmploymentCollectionItem(projectId: string, collection: string, itemId: string): void {
  updateSelfEmploymentProject(
    projectId,
    (project) => {
      if (collection === "contacts") return { ...project, contacts: project.contacts.filter((item) => item.id !== itemId) };
      if (collection === "invoices") return { ...project, invoices: project.invoices.filter((item) => item.id !== itemId) };
      if (collection === "tasks") return { ...project, tasks: project.tasks.filter((item) => item.id !== itemId) };
      return project;
    },
    true
  );
}

export function updateSelfEmploymentProject(
  projectId: string,
  updater: (project: SelfEmploymentProject) => SelfEmploymentProject,
  renderAfterUpdate: boolean
): void {
  if (!projectId || !host.getState().selfEmployment.projects.some((project) => project.id === projectId)) return;
  host.getState().selfEmployment = {
    ...host.getState().selfEmployment,
    projects: host.getState().selfEmployment.projects.map((project) => (project.id === projectId ? updater(project) : project))
  };
  host.syncStoreState();
  if (renderAfterUpdate) {
    host.renderAll();
    return;
  }
  host.persistCurrentState();
}

function selfEmploymentProjectIsActive(project: SelfEmploymentProject): boolean {
  return project.status !== "completed" && project.status !== "discarded" && project.status !== "paused";
}

function selfEmploymentStatusLabel(status: SelfEmploymentProjectStatus): string {
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

function selfEmploymentRiskLabel(risk: SelfEmploymentRiskLevel): string {
  if (risk === "low") return "Niedrig";
  if (risk === "high") return "Hoch";
  return "Mittel";
}

function selfEmploymentFeasibilityLabel(feasibility: SelfEmploymentFeasibility): string {
  if (feasibility === "realistic") return "Realistisch";
  if (feasibility === "borderline") return "Grenzwertig";
  return "Unrealistisch";
}

function selfEmploymentRoadmapAreaIdFromValue(value: unknown): SelfEmploymentRoadmapAreaId | null {
  return SELF_EMPLOYMENT_ROADMAP_AREAS.some((area) => area.id === value) ? (value as SelfEmploymentRoadmapAreaId) : null;
}

function selfEmploymentNumberValue(rawValue: string, fallback: number, min: number, max: number): number {
  const parsed = Number(String(rawValue).replace(",", "."));
  return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback;
}

export function selfEmploymentControlValue(target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string | boolean {
  return target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value;
}

function selfEmploymentTextToList(rawValue: string): string[] {
  return rawValue
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function selfEmploymentStatusFromValue(value: string, fallback: SelfEmploymentProjectStatus): SelfEmploymentProjectStatus {
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

function selfEmploymentRiskFromValue(value: string, fallback: SelfEmploymentRiskLevel): SelfEmploymentRiskLevel {
  return value === "low" || value === "medium" || value === "high" ? value : fallback;
}

function selfEmploymentContactStatusFromValue(
  value: string,
  fallback: SelfEmploymentProject["contacts"][number]["status"]
): SelfEmploymentProject["contacts"][number]["status"] {
  return value === "lead" || value === "first_contact" || value === "offer_sent" || value === "customer" || value === "paused"
    ? value
    : fallback;
}

function selfEmploymentInvoiceStatusFromValue(
  value: string,
  fallback: SelfEmploymentInvoice["status"]
): SelfEmploymentInvoice["status"] {
  return value === "offer_open" || value === "offer_accepted" || value === "invoice_created" || value === "paid"
    ? value
    : fallback;
}

function selfEmploymentTaskPriorityFromValue(
  value: string,
  fallback: SelfEmploymentTask["priority"]
): SelfEmploymentTask["priority"] {
  return value === "low" || value === "medium" || value === "high" ? value : fallback;
}

function selfEmploymentTaskStatusFromValue(
  value: string,
  fallback: SelfEmploymentTask["status"]
): SelfEmploymentTask["status"] {
  return value === "open" || value === "in_progress" || value === "done" ? value : fallback;
}


export function clearSelfEmploymentGanttEditorForDeletedNodes(nodeIds: Set<string>): void {
  if (selfEmploymentUiState.ganttEditor?.type === "card" && nodeIds.has(selfEmploymentUiState.ganttEditor.cardId)) {
    selfEmploymentUiState.ganttEditor = null;
  }
}

function hoursLabel(value: number): string {
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value)} h`;
}
