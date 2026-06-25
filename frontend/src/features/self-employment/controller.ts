import { createId, defaultSelfEmploymentState } from "../../data/defaults";
import { defaultBusinessIdeaCanvasForProject } from "../../domain/businessIdeaCanvas";
import {
  buildSelfEmploymentProjectWorkPlan,
  normalizeSelfEmploymentGanttPlan,
  normalizedGanttLabelId,
  orderedGanttLabels,
  selfEmploymentEisenhowerQuadrantFromValue
} from "../../domain/selfEmploymentGantt";
import { calculateReserveSummary } from "../../domain/reserveCalculator";
import type { IncomePlanningModel } from "../../domain/incomePlanning";
import { escapeHtml, intNumber } from "../../lib/format";
import { normalizePositionIcon, POSITION_ICONS, positionIconSvg } from "../../lib/positionIcons";
import type {
  AppState,
  BusinessIdeaCanvasShape,
  PlanningSettings,
  SelfEmploymentGanttTodoEisenhowerQuadrant,
  ReservePosition,
  SelfEmploymentGanttTodoStatus,
  SelfEmploymentGanttTodo,
  SelfEmploymentGanttStartMode,
  SelfEmploymentProject,
  SelfEmploymentProjectModules,
  SelfEmploymentProjectType
} from "../../types";
import { selfEmploymentUiState } from "./uiState";
import { configureSelfEmploymentGantt } from "./ganttController";
import {
  evaluateSelfEmploymentProject,
  selfEmploymentPriorityLabel,
  selfEmploymentContactStatusFromValue,
  selfEmploymentInvoiceStatusFromValue,
  selfEmploymentNumberValue,
  selfEmploymentProjectIsActive,
  selfEmploymentProjectTypeFromValue,
  selfEmploymentProjectTypeLabel,
  selfEmploymentRiskFromValue,
  selfEmploymentRoadmapAreaIdFromValue,
  selfEmploymentStatusFromValue,
  selfEmploymentStatusLabel,
  selfEmploymentTaskPriorityFromValue,
  selfEmploymentTaskStatusFromValue,
  selfEmploymentTextToList,
  selfEmploymentTotals
} from "./feasibilityController";
import { selfEmploymentProjectCard } from "./renderProjectCards";
import {
  investmentTableRow,
  profitTableRow,
  riskTableRow,
  selfEmploymentBarChart,
  selfEmploymentFeasibilityPanel,
  selfEmploymentMetric,
  selfEmploymentStatusChart,
  selfEmploymentTable
} from "./renderFeasibility";
import { selfEmploymentProjectDetails } from "./renderProjectDetails";

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
  configureSelfEmploymentGantt({
    selectedProjectId: () => host.getState().selfEmployment.selectedProjectId,
    projectById: selfEmploymentProjectById,
    updateProject: updateSelfEmploymentProject,
    renderAll: () => host.renderAll()
  });
}

function requireSelfEmploymentHost(): void {
  if (!host) throw new Error("Self-employment feature host has not been configured.");
}

interface SelfEmploymentCommitOptions {
  render?: boolean;
  persist?: boolean;
}

function commitSelfEmploymentState(
  nextSelfEmployment: AppState["selfEmployment"],
  options: SelfEmploymentCommitOptions = {}
): void {
  host.getState().selfEmployment = nextSelfEmployment;
  host.syncStoreState();
  if (options.render) {
    host.renderAll();
    return;
  }
  if (options.persist) host.persistCurrentState();
}

export function renderSelfEmploymentDashboard(): void {
  requireSelfEmploymentHost();
  const container = document.querySelector<HTMLDivElement>("#selfEmploymentDashboard");
  if (!container) return;
  normalizeSelfEmploymentSelection();
  const evaluations = selfEmploymentProjectEvaluations();
  const context = selfEmploymentEvaluationContext();
  const incomePlanningState = host.getState().incomePlanning;
  const incomePlanningModel = host.incomePlanningModelForActiveWeek();
  const selected = evaluations.find((item) => item.project.id === host.getState().selfEmployment.selectedProjectId) ?? evaluations[0];
  const totals = selfEmploymentTotals(evaluations, context.availableTimeHours);
  const activeEvaluations = evaluations.filter((evaluation) => selfEmploymentProjectIsActive(evaluation.project));
  const dashboardEvaluations = selfEmploymentDashboardEvaluations(activeEvaluations);
  const projectCardsHtml = dashboardEvaluations.length
    ? dashboardEvaluations.map((evaluation) => selfEmploymentProjectCard(evaluation, selected?.project.id)).join("")
    : `
      <article class="self-employment-empty-card">
        <h3>Keine Dashboard-Projekte</h3>
        <p>Markiere bis zu drei offene oder laufende Projekte in der Projektliste fuer das Dashboard.</p>
      </article>
    `;
  const analysisHtml = activeEvaluations.length
    ? `
      <section class="self-employment-analysis" aria-label="Projekt-Auswertung">
        ${selfEmploymentStatusChart(activeEvaluations)}
        ${selfEmploymentBarChart("Zeitbedarf je Projekt", activeEvaluations, "time")}
        ${selfEmploymentBarChart("Gewinnpotenzial je Projekt", activeEvaluations, "profit")}
        ${selfEmploymentFeasibilityPanel(activeEvaluations)}
      </section>
    `
    : "";
  const tablesHtml = activeEvaluations.length
    ? `
      <section class="self-employment-tables" aria-label="Projekt-Tabellen">
        ${selfEmploymentTable("Projekte nach Risiko", ["Projekt", "Risiko", "Machbarkeit"], activeEvaluations, riskTableRow)}
        ${selfEmploymentTable("Investitionsbedarf", ["Projekt", "Startkapital", "Luecke"], activeEvaluations, investmentTableRow)}
        ${selfEmploymentTable("Erwarteter Gewinn", ["Projekt", "Umsatz", "Gewinn"], activeEvaluations, profitTableRow)}
      </section>
    `
    : "";

  container.innerHTML = `
    <section class="self-employment-hero">
      <h2>Selbststaendigkeits-Dashboard</h2>
    </section>
    <section class="self-employment-project-management" aria-label="Projektverwaltung">
      <span class="self-employment-project-management-label">Projektverwaltung</span>
      <div class="self-employment-hero-actions">
        <button class="button" type="button" data-action="self-employment-add-project">Projekt anlegen</button>
        <button class="button secondary" type="button" data-action="self-employment-toggle-project-list" aria-expanded="${selfEmploymentUiState.projectListPopupOpen}">Projektliste</button>
      </div>
    </section>
    ${selfEmploymentProjectListPopup(evaluations)}
    <section class="self-employment-metrics" aria-label="Projektuebergreifende Kennzahlen">
      ${selfEmploymentMetric("Aktive Projekte", intNumber(totals.activeProjects), `${intNumber(totals.totalProjects)} insgesamt`)}${selfEmploymentMetric("Neutral", intNumber(totals.neutralProjects), "Humankapital separat")}
    </section>
    <section class="self-employment-cards" aria-label="Selbststaendigkeitsprojekte">
      ${projectCardsHtml}
    </section>
    ${analysisHtml}
    ${tablesHtml}
    ${selected
      ? selfEmploymentProjectDetails(
          selected,
          host.getState().selfEmployment.selectedRoadmapAreaId,
          incomePlanningModel,
          incomePlanningState
        )
      : ""}
  `;
}

function selfEmploymentDashboardEvaluations(evaluations: ReturnType<typeof evaluateSelfEmploymentProject>[]): ReturnType<typeof evaluateSelfEmploymentProject>[] {
  const selected = evaluations.filter((evaluation) => evaluation.project.dashboardEnabled).slice(0, 3);
  return selected.length ? selected : evaluations.slice(0, 3);
}

function selfEmploymentWeeklyTimeDemand(project: SelfEmploymentProject, availableHoursPerWeek: number): number {
  const configuredHours = project.fixedProjectHoursPerWeek + project.flexibleProjectHoursPerWeek;
  return Math.max(project.requiredHoursPerWeek, configuredHours, availableHoursPerWeek);
}

function selfEmploymentProjectEvaluations(): ReturnType<typeof evaluateSelfEmploymentProject>[] {
  const context = selfEmploymentEvaluationContext();
  const incomePlanningModel = host.incomePlanningModelForActiveWeek();
  const incomePlanningState = host.getState().incomePlanning;
  return host.getState().selfEmployment.projects.map((project) => {
    const workPlan = buildSelfEmploymentProjectWorkPlan(project, incomePlanningModel, new Date(), incomePlanningState);
    return evaluateSelfEmploymentProject(project, {
      ...context,
      weeklyTimeDemand: selfEmploymentWeeklyTimeDemand(project, workPlan.availableHoursPerWeek),
      openTaskHours: workPlan.openHours,
      blockingTaskCount: workPlan.tasks.filter((task) => !task.completed && task.eisenhowerQuadrant === "important_urgent").length
    });
  });
}

function selfEmploymentProjectListPopup(evaluations: ReturnType<typeof evaluateSelfEmploymentProject>[]): string {
  if (!selfEmploymentUiState.projectListPopupOpen) return "";
  return `
    <section class="self-employment-project-list-popup" role="dialog" aria-label="Projektliste">
      ${selfEmploymentProjectListPopupContent(evaluations)}
    </section>
  `;
}

function selfEmploymentProjectListPopupContent(evaluations: ReturnType<typeof evaluateSelfEmploymentProject>[]): string {
  const dashboardCount = evaluations.filter((evaluation) => evaluation.project.dashboardEnabled).length;
  if (
    selfEmploymentUiState.projectListExpandedProjectId &&
    !evaluations.some((evaluation) => evaluation.project.id === selfEmploymentUiState.projectListExpandedProjectId)
  ) {
    selfEmploymentUiState.projectListExpandedProjectId = null;
  }
  return `
    <header>
      <div>
        <span>Projektliste</span>
        <strong>${escapeHtml(`${intNumber(evaluations.length)} Projekte · ${intNumber(Math.min(3, dashboardCount))}/3 im Dashboard`)}</strong>
      </div>
      <button class="icon-button" type="button" data-action="self-employment-close-project-list" aria-label="Projektliste schliessen">x</button>
    </header>
    <div class="self-employment-project-list">
      ${
        evaluations.length
          ? evaluations.map((evaluation) => selfEmploymentProjectListItem(evaluation, dashboardCount)).join("")
          : `<p class="self-employment-empty-note">Noch keine Projekte vorhanden.</p>`
      }
    </div>
  `;
}

function selfEmploymentProjectListItem(evaluation: ReturnType<typeof evaluateSelfEmploymentProject>, dashboardCount: number): string {
  const project = evaluation.project;
  const dashboardDisabled = !project.dashboardEnabled && dashboardCount >= 3;
  const expanded = selfEmploymentUiState.projectListExpandedProjectId === project.id;
  return `
    <article class="self-employment-project-list-item ${escapeHtml(evaluation.feasibility)}${expanded ? " expanded" : ""}" data-self-employment-project-id="${escapeHtml(project.id)}">
      <button
        class="self-employment-project-list-summary"
        type="button"
        data-action="self-employment-toggle-project-list-item"
        data-self-employment-project-id="${escapeHtml(project.id)}"
        aria-expanded="${expanded}"
      >
        <span class="self-employment-project-list-summary-main">
          <strong>${escapeHtml(project.name)}</strong>
          <span>${escapeHtml(`${selfEmploymentStatusLabel(project.status)} · ${selfEmploymentProjectTypeLabel(project.projectType)} · ${selfEmploymentPriorityLabel(project.priority)}`)}</span>
        </span>
        <span class="self-employment-project-list-chevron" aria-hidden="true">${expanded ? "-" : "+"}</span>
      </button>
      ${expanded ? selfEmploymentProjectListItemDetails(project, dashboardDisabled) : ""}
    </article>
  `;
}

function selfEmploymentProjectListItemDetails(project: SelfEmploymentProject, dashboardDisabled: boolean): string {
  return `
    <div class="self-employment-project-list-details">
      <div class="self-employment-project-list-fields">
        ${selfEmploymentInlineSelect(project, "status", project.status, [["open", selfEmploymentStatusLabel("open")], ["in_progress", selfEmploymentStatusLabel("in_progress")], ["completed", selfEmploymentStatusLabel("completed")], ["cancelled", selfEmploymentStatusLabel("cancelled")]])}
        ${selfEmploymentInlineSelect(project, "projectType", project.projectType, [["revenue", "Umsatzprojekt"], ["human_capital", "Humankapital"], ["mandatory", "Pflichtprojekt"], ["strategic", "Strategisch"], ["private", "Privat"]])}
        ${selfEmploymentInlineSelect(project, "priority", project.priority, [["high", "Hoch"], ["medium", "Mittel"], ["low", "Niedrig"]])}
      </div>
      <div class="self-employment-project-list-actions">
        <button
          class="button mini ${project.dashboardEnabled ? "" : "secondary"}"
          type="button"
          data-action="self-employment-toggle-dashboard-project"
          data-self-employment-project-id="${escapeHtml(project.id)}"
          aria-pressed="${project.dashboardEnabled}"
          ${dashboardDisabled ? "disabled" : ""}
        >${escapeHtml(project.dashboardEnabled ? "Dashboard: aktiv" : "Dashboard: nicht aktiv")}</button>
        <button class="button mini secondary" type="button" data-action="self-employment-select-project" data-self-employment-project-id="${escapeHtml(project.id)}">Oeffnen</button>
        <button class="button mini secondary" type="button" data-action="self-employment-rename-project" data-self-employment-project-id="${escapeHtml(project.id)}">Umbenennen</button>
      </div>
      <div class="self-employment-project-list-modules">
        <span>Module:</span>
        <div class="self-employment-project-module-grid">
          ${(["invoices", "budget", "contacts", "profit", "metrics"] as const)
            .map((module) => selfEmploymentProjectListModuleToggle(project, module, selfEmploymentModuleLabel(module)))
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function selfEmploymentProjectListModuleToggle(project: SelfEmploymentProject, module: keyof SelfEmploymentProjectModules, label: string): string {
  return `
    <label class="self-employment-check-field">
      <input type="checkbox" ${project.enabledModules[module] ? "checked" : ""} data-self-employment-project-id="${escapeHtml(project.id)}" data-self-employment-field="${escapeHtml(`module.${module}`)}" />
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

function selfEmploymentModuleLabel(module: keyof SelfEmploymentProjectModules): string {
  return { invoices: "Angebote & Rechnungen", budget: "Budget & Investitionen", contacts: "Kundenkontakte", profit: "Gewinnschaetzung", metrics: "Kennzahlen" }[module];
}

function selfEmploymentInlineSelect(
  project: SelfEmploymentProject,
  field: string,
  value: string,
  options: Array<[string, string]>
): string {
  return `
    <label class="field self-employment-inline-field">
      <select data-self-employment-project-id="${escapeHtml(project.id)}" data-self-employment-field="${escapeHtml(field)}">
        ${options.map(([optionValue, label]) => `<option value="${escapeHtml(optionValue)}" ${optionValue === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
      </select>
    </label>
  `;
}

export function refreshSelfEmploymentProjectListPopup(): void {
  if (!selfEmploymentUiState.projectListPopupOpen || typeof document === "undefined") return;
  const popup = document.querySelector<HTMLElement>(".self-employment-project-list-popup");
  if (!popup) return;
  const previousScrollTop = popup.scrollTop;
  const focusSelector = selfEmploymentProjectListFocusSelector(popup);
  popup.innerHTML = selfEmploymentProjectListPopupContent(selfEmploymentProjectEvaluations());
  popup.scrollTop = previousScrollTop;
  if (focusSelector) popup.querySelector<HTMLElement>(focusSelector)?.focus();
}

function selfEmploymentProjectListFocusSelector(popup: HTMLElement): string | null {
  if (typeof document === "undefined") return null;
  const active = document.activeElement as HTMLElement | null;
  if (!active || !popup.contains(active) || !active.dataset) return null;
  const projectId = active.dataset.selfEmploymentProjectId;
  const action = active.dataset.action;
  if (action) {
    return `button[data-action="${selfEmploymentCssAttr(action)}"]${projectId ? `[data-self-employment-project-id="${selfEmploymentCssAttr(projectId)}"]` : ""}`;
  }
  const field = active.dataset.selfEmploymentField;
  if (field) {
    const tag = active.tagName?.toLowerCase() || "select";
    return `${tag}[data-self-employment-field="${selfEmploymentCssAttr(field)}"]${
      projectId ? `[data-self-employment-project-id="${selfEmploymentCssAttr(projectId)}"]` : ""
    }`;
  }
  return null;
}

function selfEmploymentCssAttr(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function selfEmploymentEvaluationContext(): { availableTimeHours: number; availableReserve: number } {
  const timeModel = host.incomePlanningModelForActiveWeek();
  const reserve = calculateReserveSummary(host.activePlanningSettings(), host.activePlanningPositions());
  return {
    availableTimeHours: Math.max(0, timeModel.remainingFlexibleHours),
    availableReserve: Math.max(0, reserve.yearEndBalance - host.getState().settings.emergencyFund)
  };
}

export function selfEmploymentProjectById(projectId: string): SelfEmploymentProject | null {
  return host.getState().selfEmployment.projects.find((project) => project.id === projectId) ?? null;
}

function normalizeSelfEmploymentSelection(): void {
  const selectedRoadmapAreaId = selfEmploymentRoadmapAreaIdFromValue(host.getState().selfEmployment.selectedRoadmapAreaId) ?? "idea";
  if (host.getState().selfEmployment.projects.length === 0) {
    commitSelfEmploymentState({
      ...host.getState().selfEmployment,
      selectedProjectId: "",
      selectedRoadmapAreaId
    });
    return;
  }
  if (host.getState().selfEmployment.selectedRoadmapAreaId !== selectedRoadmapAreaId) {
    commitSelfEmploymentState({
      ...host.getState().selfEmployment,
      selectedRoadmapAreaId
    });
  }
  if (!host.getState().selfEmployment.projects.some((project) => project.id === host.getState().selfEmployment.selectedProjectId)) {
    commitSelfEmploymentState({
      ...host.getState().selfEmployment,
      selectedProjectId: host.getState().selfEmployment.projects[0].id
    });
  }
}

export function selectSelfEmploymentProject(projectId: string): void {
  if (!host.getState().selfEmployment.projects.some((project) => project.id === projectId)) return;
  selfEmploymentUiState.ganttEditor = null;
  selfEmploymentUiState.projectListPopupOpen = false;
  selfEmploymentUiState.projectListExpandedProjectId = null;
  commitSelfEmploymentState({
    ...host.getState().selfEmployment,
    selectedProjectId: projectId
  }, { render: true });
}

export function addSelfEmploymentProject(): void {
  const index = host.getState().selfEmployment.projects.length + 1;
  const id = createId();
  const now = new Date().toISOString();
  const canvasDefaults = defaultBusinessIdeaCanvasForProject(id, { idea: "Neue Geschaeftsidee" });
  const project: SelfEmploymentProject = {
    ...defaultSelfEmploymentState().projects[0],
    ...canvasDefaults,
    id,
    name: `Projekt ${intNumber(index)}`,
    labels: [],
    status: "open",
    dashboardEnabled: host.getState().selfEmployment.projects.filter((project) => project.dashboardEnabled).length < 3,
    projectType: "revenue",
    priority: "medium",
    createdAt: now,
    updatedAt: now,
    enabledModules: selfEmploymentDefaultModulesForType("revenue"),
    offerSettings: {
      baseHourlyRate: 60,
      usePhaseFactors: true,
      useLabelFactors: true,
      useTodoTimes: true,
      useBuffer: false,
      useRounding: false,
      bufferPercent: 10,
      taxPercent: 19
    },
    idea: "Neue Geschaeftsidee",
    problem: "",
    targetGroup: "",
    revenueModel: "",
    projectGoal: "",
    milestones: [],
    nextSteps: ["Idee pruefen", "Zeitbedarf schaetzen", "Startbudget klaeren"],
    contacts: [],
    invoices: [],
    tasks: [],
    requiredHoursPerWeek: 4,
    fixedProjectHoursPerWeek: 0,
    flexibleProjectHoursPerWeek: 4,
    startCapitalRequired: 0,
    monthlyRevenueExpected: 0,
    monthlyRunningCosts: 0,
    oneTimeCosts: 0,
    monthlyWorkHours: 16,
    timeSources: [],
    gantt: normalizeSelfEmploymentGanttPlan({}, canvasDefaults.businessIdeaCanvas, canvasDefaults.businessIdeaCanvasMeta),
    ganttPhaseFilterIds: []
  };
  commitSelfEmploymentState({
    ...host.getState().selfEmployment,
    selectedProjectId: id,
    selectedRoadmapAreaId: "idea",
    projects: [...host.getState().selfEmployment.projects, project]
  }, { render: true });
}

export function selectSelfEmploymentRoadmapArea(rawAreaId: string): void {
  const selectedRoadmapAreaId = selfEmploymentRoadmapAreaIdFromValue(rawAreaId);
  if (!selectedRoadmapAreaId) return;
  selfEmploymentUiState.ganttEditor = null;
  commitSelfEmploymentState({
    ...host.getState().selfEmployment,
    selectedRoadmapAreaId
  }, { render: true });
}

export function toggleSelfEmploymentProjectListPopup(open?: boolean): void {
  const nextOpen = open ?? !selfEmploymentUiState.projectListPopupOpen;
  selfEmploymentUiState.projectListPopupOpen = nextOpen;
  selfEmploymentUiState.projectListExpandedProjectId = null;
  host.renderAll();
}

export function toggleSelfEmploymentProjectListItem(projectId: string): void {
  if (!host.getState().selfEmployment.projects.some((project) => project.id === projectId)) return;
  selfEmploymentUiState.projectListExpandedProjectId =
    selfEmploymentUiState.projectListExpandedProjectId === projectId ? null : projectId;
  refreshSelfEmploymentProjectListPopup();
}

export function toggleSelfEmploymentDashboardProject(projectId: string, renderAfterUpdate = true): boolean {
  const projects = host.getState().selfEmployment.projects;
  const project = projects.find((item) => item.id === projectId);
  if (!project) return false;
  const enabledCount = projects.filter((item) => item.dashboardEnabled).length;
  if (!project.dashboardEnabled && enabledCount >= 3) return false;
  updateSelfEmploymentProject(projectId, (item) => ({ ...item, dashboardEnabled: !item.dashboardEnabled }), renderAfterUpdate);
  return true;
}

export function selectSelfEmploymentBillingTab(projectId: string, tab: "offers" | "invoices"): void {
  if (!host.getState().selfEmployment.projects.some((project) => project.id === projectId)) return;
  selfEmploymentUiState.billingTabByProjectId = {
    ...selfEmploymentUiState.billingTabByProjectId,
    [projectId]: tab
  };
  host.renderAll();
}

export function toggleSelfEmploymentOfferOverview(projectId: string, open?: boolean): void {
  if (open === false || selfEmploymentUiState.offerOverviewProjectId === projectId) {
    selfEmploymentUiState.offerOverviewProjectId = null;
  } else if (host.getState().selfEmployment.projects.some((project) => project.id === projectId)) {
    selfEmploymentUiState.offerOverviewProjectId = projectId;
  }
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
  commitSelfEmploymentState({
    ...host.getState().selfEmployment,
    projects: host.getState().selfEmployment.projects.map((item) => (item.id === projectId ? { ...item, name: nextName } : item))
  }, { render: true });
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
  if (selfEmploymentUiState.projectListExpandedProjectId === projectId) selfEmploymentUiState.projectListExpandedProjectId = null;
  commitSelfEmploymentState({
    ...host.getState().selfEmployment,
    selectedProjectId,
    projects
  }, { render: true });
}

export function toggleSelfEmploymentLabelPicker(projectId: string): void {
  if (!host.getState().selfEmployment.projects.some((project) => project.id === projectId)) return;
  selfEmploymentUiState.labelPickerProjectId = selfEmploymentUiState.labelPickerProjectId === projectId ? null : projectId;
  host.renderAll();
}

export function toggleSelfEmploymentProjectLabel(projectId: string, rawLabel: string): void {
  const label = rawLabel.trim();
  if (!label) return;
  commitSelfEmploymentState({
    ...host.getState().selfEmployment,
    projects: host.getState().selfEmployment.projects.map((project) => {
      if (project.id !== projectId) return project;
      const labels = project.labels.includes(label)
        ? project.labels.filter((item) => item !== label)
        : [...project.labels, label];
      return { ...project, labels };
    })
  }, { render: true });
}

export function updateSelfEmploymentProjectField(
  projectId: string,
  field: string,
  rawValue: string | boolean,
  renderAfterUpdate: boolean
): void {
  updateSelfEmploymentProject(
    projectId,
    (project) => {
      const value = String(rawValue);
      if (field === "idea") return { ...project, idea: value };
      if (field === "problem") return { ...project, problem: value };
      if (field === "targetGroup") return { ...project, targetGroup: value };
      if (field === "revenueModel") return { ...project, revenueModel: value };
      if (field === "motivation") return { ...project, motivation: value };
      if (field === "projectGoal") return { ...project, projectGoal: value };
      if (field === "startDate") return { ...project, startDate: value };
      if (field === "dependencies") return { ...project, dependencies: value };
      if (field === "weekScenario") return { ...project, weekScenario: value };
      if (field === "risk") return { ...project, risk: selfEmploymentRiskFromValue(value, project.risk) };
      if (field === "status") return { ...project, status: selfEmploymentStatusFromValue(value, project.status) };
      if (field === "projectType") {
        const projectType = selfEmploymentProjectTypeFromValue(value, project.projectType);
        return { ...project, projectType, enabledModules: selfEmploymentDefaultModulesForType(projectType) };
      }
      if (field === "priority") return { ...project, priority: selfEmploymentTaskPriorityFromValue(value, project.priority) };
      if (field.startsWith("module.")) {
        const moduleKey = field.replace("module.", "") as keyof SelfEmploymentProjectModules;
        if (!selfEmploymentModuleKeys().includes(moduleKey)) return project;
        return {
          ...project,
          enabledModules: {
            ...project.enabledModules,
            [moduleKey]: rawValue === true || value === "true"
          }
        };
      }
      if (field === "offerBaseHourlyRate") {
        return {
          ...project,
          offerSettings: {
            ...project.offerSettings,
            baseHourlyRate: selfEmploymentNumberValue(value, project.offerSettings.baseHourlyRate, 0, 100000)
          }
        };
      }
      if (field === "offerBufferPercent") {
        return {
          ...project,
          offerSettings: {
            ...project.offerSettings,
            bufferPercent: selfEmploymentNumberValue(value, project.offerSettings.bufferPercent, 0, 100)
          }
        };
      }
      if (field === "offerTaxPercent") {
        return {
          ...project,
          offerSettings: {
            ...project.offerSettings,
            taxPercent: selfEmploymentNumberValue(value, project.offerSettings.taxPercent, 0, 100)
          }
        };
      }
      if (field.startsWith("offer.")) {
        const setting = field.replace("offer.", "") as keyof SelfEmploymentProject["offerSettings"];
        if (
          setting !== "usePhaseFactors" &&
          setting !== "useLabelFactors" &&
          setting !== "useTodoTimes" &&
          setting !== "useBuffer" &&
          setting !== "useRounding"
        ) {
          return project;
        }
        return {
          ...project,
          offerSettings: {
            ...project.offerSettings,
            [setting]: rawValue === true || value === "true"
          }
        };
      }
      if (field === "availableReserveOverride") {
        return {
          ...project,
          availableReserveOverride:
            value.trim() === "" ? null : selfEmploymentNumberValue(value, project.availableReserveOverride ?? 0, 0, 999999999)
        };
      }
      if (field === "plannedDurationWeeks") {
        return { ...project, plannedDurationWeeks: selfEmploymentNumberValue(value, project.plannedDurationWeeks, 0, 520) };
      }
      if (field === "requiredHoursPerWeek") {
        return { ...project, requiredHoursPerWeek: selfEmploymentNumberValue(value, project.requiredHoursPerWeek, 0, 168) };
      }
      if (field === "fixedProjectHoursPerWeek") {
        return { ...project, fixedProjectHoursPerWeek: selfEmploymentNumberValue(value, project.fixedProjectHoursPerWeek, 0, 168) };
      }
      if (field === "flexibleProjectHoursPerWeek") {
        return { ...project, flexibleProjectHoursPerWeek: selfEmploymentNumberValue(value, project.flexibleProjectHoursPerWeek, 0, 168) };
      }
      if (field === "startCapitalRequired") {
        return { ...project, startCapitalRequired: selfEmploymentNumberValue(value, project.startCapitalRequired, 0, 999999999) };
      }
      if (field === "oneTimeCosts") {
        return { ...project, oneTimeCosts: selfEmploymentNumberValue(value, project.oneTimeCosts, 0, 999999999) };
      }
      if (field === "monthlyRevenueExpected") {
        return { ...project, monthlyRevenueExpected: selfEmploymentNumberValue(value, project.monthlyRevenueExpected, 0, 999999999) };
      }
      if (field === "monthlyRunningCosts") {
        return { ...project, monthlyRunningCosts: selfEmploymentNumberValue(value, project.monthlyRunningCosts, 0, 999999999) };
      }
      if (field === "taxReservePercent") {
        return { ...project, taxReservePercent: selfEmploymentNumberValue(value, project.taxReservePercent, 0, 100) };
      }
      if (field === "monthlyWorkHours") {
        return { ...project, monthlyWorkHours: selfEmploymentNumberValue(value, project.monthlyWorkHours, 0, 744) };
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
        if (field === "completed") {
          const completed = rawValue === true || rawValue === "true";
          return {
            ...plan,
            completed,
            todos: plan.todos.map((todo) => ({ ...todo, status: completed ? "done" : "planned", completed }))
          };
        }
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

export function updateSelfEmploymentGanttTodoField(
  projectId: string,
  cardId: string,
  todoId: string,
  field: string,
  rawValue: string | boolean,
  renderAfterUpdate: boolean
): void {
  updateSelfEmploymentProject(
    projectId,
    (project) => {
      const gantt = normalizeSelfEmploymentGanttPlan(project.gantt, project.businessIdeaCanvas, project.businessIdeaCanvasMeta);
      const cardPlans = gantt.cardPlans.map((plan) => {
        if (plan.cardId !== cardId) return plan;
        const todos = plan.todos.map((todo) => {
          if (todo.id !== todoId) return todo;
          if (field === "title") return { ...todo, title: String(rawValue) };
          if (field === "eisenhowerQuadrant") {
            return {
              ...todo,
              eisenhowerQuadrant: selfEmploymentEisenhowerQuadrantFromValue(String(rawValue), todo.eisenhowerQuadrant)
            };
          }
          if (field === "completed") return selfEmploymentGanttTodoWithStatus(todo, rawValue === true || rawValue === "true" ? "done" : "planned");
          if (field === "status") return selfEmploymentGanttTodoWithStatus(todo, selfEmploymentGanttTodoStatusFromValue(String(rawValue), todo.status));
          return todo;
        });
        return { ...plan, todos, completed: todos.every((todo) => todo.completed) };
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

export function addSelfEmploymentGanttTodo(projectId: string, cardId: string, afterTodoId = ""): void {
  updateSelfEmploymentProject(
    projectId,
    (project) => {
      const gantt = normalizeSelfEmploymentGanttPlan(project.gantt, project.businessIdeaCanvas, project.businessIdeaCanvasMeta);
      const cardPlans = gantt.cardPlans.map((plan) => {
        if (plan.cardId !== cardId) return plan;
        const todo: SelfEmploymentGanttTodo = {
          id: createId(),
          title: "Neue Aufgabe",
          eisenhowerQuadrant: "important_not_urgent",
          status: "planned",
          completed: false
        };
        const afterIndex = plan.todos.findIndex((item) => item.id === afterTodoId);
        const todos =
          afterIndex >= 0
            ? [...plan.todos.slice(0, afterIndex + 1), todo, ...plan.todos.slice(afterIndex + 1)]
            : [...plan.todos, todo];
        return { ...plan, todos, completed: false };
      });
      const nextProject = { ...project, gantt: { ...gantt, cardPlans } };
      return {
        ...nextProject,
        gantt: normalizeSelfEmploymentGanttPlan(nextProject.gantt, nextProject.businessIdeaCanvas, nextProject.businessIdeaCanvasMeta)
      };
    },
    true
  );
}

export function removeSelfEmploymentGanttTodo(projectId: string, cardId: string, todoId: string): void {
  updateSelfEmploymentProject(
    projectId,
    (project) => {
      const gantt = normalizeSelfEmploymentGanttPlan(project.gantt, project.businessIdeaCanvas, project.businessIdeaCanvasMeta);
      const cardPlans = gantt.cardPlans.map((plan) => {
        if (plan.cardId !== cardId) return plan;
        const remaining = plan.todos.filter((todo) => todo.id !== todoId);
        const todos = remaining.length
          ? remaining
          : [{
              id: createId(),
              title: "Neue Aufgabe",
              eisenhowerQuadrant: "important_not_urgent" as const,
              status: "planned" as const,
              completed: false
            }];
        return { ...plan, todos, completed: todos.every((todo) => todo.completed) };
      });
      const nextProject = { ...project, gantt: { ...gantt, cardPlans } };
      return {
        ...nextProject,
        gantt: normalizeSelfEmploymentGanttPlan(nextProject.gantt, nextProject.businessIdeaCanvas, nextProject.businessIdeaCanvasMeta)
      };
    },
    true
  );
}

export function updateSelfEmploymentGanttTodoStatus(
  projectId: string,
  cardId: string,
  todoId: string,
  status: SelfEmploymentGanttTodoStatus
): void {
  updateSelfEmploymentGanttTodoField(projectId, cardId, todoId, "status", status, true);
}

export function updateSelfEmploymentGanttTodoEisenhowerQuadrant(
  projectId: string,
  cardId: string,
  todoId: string,
  quadrant: SelfEmploymentGanttTodoEisenhowerQuadrant
): void {
  updateSelfEmploymentGanttTodoField(projectId, cardId, todoId, "eisenhowerQuadrant", quadrant, true);
}

function selfEmploymentGanttTodoWithStatus(todo: SelfEmploymentGanttTodo, status: SelfEmploymentGanttTodoStatus): SelfEmploymentGanttTodo {
  return {
    ...todo,
    status,
    completed: status === "done"
  };
}

function selfEmploymentGanttTodoStatusFromValue(value: string, fallback: SelfEmploymentGanttTodoStatus): SelfEmploymentGanttTodoStatus {
  if (value === "done" || value === "in_progress" || value === "planned") return value;
  return fallback;
}

export function toggleSelfEmploymentTimeSource(
  projectId: string,
  ownerType: "work" | "habit",
  ownerId: string,
  checked: boolean
): void {
  if (!ownerId) return;
  updateSelfEmploymentProject(
    projectId,
    (project) => {
      const sources = project.timeSources.filter((source) => !(source.ownerType === ownerType && source.ownerId === ownerId));
      return {
        ...project,
        timeSources: checked ? [...sources, { ownerType, ownerId }] : sources
      };
    },
    true
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
          label: "Neue Rechnung",
          status: "draft",
          dueDate: "",
          amount: 0
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
  const updatedAt = new Date().toISOString();
  commitSelfEmploymentState({
    ...host.getState().selfEmployment,
    projects: host.getState().selfEmployment.projects.map((project) =>
      project.id === projectId ? { ...updater(project), updatedAt } : project
    )
  }, { render: renderAfterUpdate, persist: !renderAfterUpdate });
}

export function selfEmploymentControlValue(target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string | boolean {
  return target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value;
}

function selfEmploymentDefaultModulesForType(projectType: SelfEmploymentProjectType): SelfEmploymentProjectModules {
  if (projectType === "human_capital") return { invoices: false, budget: false, contacts: false, profit: false, metrics: true };
  if (projectType === "mandatory") return { invoices: false, budget: false, contacts: false, profit: false, metrics: false };
  if (projectType === "strategic") return { invoices: false, budget: true, contacts: false, profit: false, metrics: true };
  if (projectType === "private") return { invoices: false, budget: false, contacts: false, profit: false, metrics: true };
  return { invoices: true, budget: true, contacts: true, profit: true, metrics: true };
}

function selfEmploymentModuleKeys(): Array<keyof SelfEmploymentProjectModules> {
  return ["invoices", "budget", "contacts", "profit", "metrics"];
}

export function clearSelfEmploymentGanttEditorForDeletedNodes(nodeIds: Set<string>): void {
  if (selfEmploymentUiState.ganttEditor?.type === "card" && nodeIds.has(selfEmploymentUiState.ganttEditor.cardId)) {
    selfEmploymentUiState.ganttEditor = null;
  }
}
