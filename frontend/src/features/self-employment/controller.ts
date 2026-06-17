import { createId, defaultSelfEmploymentState } from "../../data/defaults";
import { defaultBusinessIdeaCanvasForProject } from "../../domain/businessIdeaCanvas";
import {
  normalizeSelfEmploymentGanttPlan,
  normalizedGanttLabelId,
  orderedGanttLabels,
  selfEmploymentEisenhowerQuadrantFromValue
} from "../../domain/selfEmploymentGantt";
import { calculateReserveSummary } from "../../domain/reserveCalculator";
import type { IncomePlanningModel } from "../../domain/incomePlanning";
import { escapeHtml, intNumber, money } from "../../lib/format";
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
  SelfEmploymentProject
} from "../../types";
import { selfEmploymentUiState } from "./uiState";
import { configureSelfEmploymentGantt } from "./ganttController";
import {
  evaluateSelfEmploymentProject,
  hoursLabel,
  selfEmploymentContactStatusFromValue,
  selfEmploymentInvoiceStatusFromValue,
  selfEmploymentNumberValue,
  selfEmploymentRiskFromValue,
  selfEmploymentRoadmapAreaIdFromValue,
  selfEmploymentStatusFromValue,
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
    ${selected
      ? selfEmploymentProjectDetails(
          selected,
          host.getState().selfEmployment.selectedRoadmapAreaId,
          host.incomePlanningModelForActiveWeek(),
          host.getState().incomePlanning
        )
      : ""}
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

export function selfEmploymentProjectById(projectId: string): SelfEmploymentProject | null {
  return host.getState().selfEmployment.projects.find((project) => project.id === projectId) ?? null;
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

export function selfEmploymentControlValue(target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string | boolean {
  return target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value;
}

export function clearSelfEmploymentGanttEditorForDeletedNodes(nodeIds: Set<string>): void {
  if (selfEmploymentUiState.ganttEditor?.type === "card" && nodeIds.has(selfEmploymentUiState.ganttEditor.cardId)) {
    selfEmploymentUiState.ganttEditor = null;
  }
}
