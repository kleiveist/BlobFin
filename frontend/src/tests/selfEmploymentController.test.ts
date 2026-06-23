import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultAppState } from "../data/defaults";
import type { IncomePlanningModel } from "../domain/incomePlanning";
import { normalizeSelfEmploymentGanttPlan } from "../domain/selfEmploymentGantt";
import {
  addSelfEmploymentProject,
  configureSelfEmploymentHost,
  deleteSelfEmploymentProject,
  renderSelfEmploymentDashboard,
  renameSelfEmploymentProject,
  toggleSelfEmploymentDashboardProject,
  toggleSelfEmploymentProjectLabel,
  updateSelfEmploymentProject,
  updateSelfEmploymentProjectField
} from "../features/self-employment/controller";
import { onSelfEmploymentChange, onSelfEmploymentClick } from "../features/self-employment/events";
import {
  evaluateSelfEmploymentProject,
  selfEmploymentProjectIsActive,
  selfEmploymentStatusFromValue
} from "../features/self-employment/feasibilityController";
import { selfEmploymentProjectDetails } from "../features/self-employment/renderProjectDetails";
import { selfEmploymentUiState } from "../features/self-employment/uiState";

afterEach(() => {
  selfEmploymentUiState.kanbanSelectedCard = null;
  selfEmploymentUiState.kanbanDrag = null;
  selfEmploymentUiState.taskContextPopup = null;
  selfEmploymentUiState.projectListPopupOpen = false;
  selfEmploymentUiState.projectListExpandedProjectId = null;
  selfEmploymentUiState.billingTabByProjectId = {};
  selfEmploymentUiState.offerOverviewProjectId = null;
  selfEmploymentUiState.taskEisenhowerFilter = "all";
  selfEmploymentUiState.kanbanPhaseFilterIds = [];
  selfEmploymentUiState.kanbanLabelFilterIds = [];
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("self employment controller persistence", () => {
  it("syncs project collection changes before rendering", () => {
    const host = configureFakeSelfEmploymentHost();

    addSelfEmploymentProject();
    const createdProjectId = host.state.selfEmployment.selectedProjectId;

    expect(host.calls).toEqual(["sync", "render"]);
    expect(host.state.selfEmployment.projects.some((project) => project.id === createdProjectId)).toBe(true);

    host.clearCalls();
    vi.stubGlobal("window", { prompt: vi.fn(() => "Umbenannt"), confirm: vi.fn(() => true) });
    renameSelfEmploymentProject(createdProjectId);

    expect(host.calls).toEqual(["sync", "render"]);
    expect(host.state.selfEmployment.projects.find((project) => project.id === createdProjectId)?.name).toBe("Umbenannt");

    host.clearCalls();
    toggleSelfEmploymentProjectLabel(createdProjectId, "Kunde");

    expect(host.calls).toEqual(["sync", "render"]);
    expect(host.state.selfEmployment.projects.find((project) => project.id === createdProjectId)?.labels).toEqual(["Kunde"]);

    host.clearCalls();
    deleteSelfEmploymentProject(createdProjectId);

    expect(host.calls).toEqual(["sync", "render"]);
    expect(host.state.selfEmployment.projects.some((project) => project.id === createdProjectId)).toBe(false);
  });

  it("syncs project updates before direct persistence", () => {
    const host = configureFakeSelfEmploymentHost();
    const projectId = host.state.selfEmployment.projects[0].id;

    updateSelfEmploymentProject(projectId, (project) => ({ ...project, name: "Direkt persistiert" }), false);

    expect(host.calls).toEqual(["sync", "persist"]);
    expect(host.state.selfEmployment.projects[0].name).toBe("Direkt persistiert");
  });

  it("toggles kanban card selection by clicking a card", () => {
    const host = configureFakeSelfEmploymentHost();
    const project = host.state.selfEmployment.projects[0];
    const plan = project.gantt.cardPlans.find((item) => item.todos.length > 0)!;
    const todo = plan.todos[0];
    const scheduler = { request: vi.fn() };
    const card = fakeKanbanCard(project.id, plan.cardId, todo.id);

    onSelfEmploymentClick(fakeMouseEvent(card), fakeAppContext(host.state, scheduler));

    expect(selfEmploymentUiState.kanbanSelectedCard).toEqual({ projectId: project.id, cardId: plan.cardId, todoId: todo.id });
    expect(scheduler.request).toHaveBeenCalledTimes(1);

    onSelfEmploymentClick(fakeMouseEvent(card), fakeAppContext(host.state, scheduler));

    expect(selfEmploymentUiState.kanbanSelectedCard).toBeNull();
    expect(scheduler.request).toHaveBeenCalledTimes(2);
  });

  it("moves the selected kanban card when clicking a target column", () => {
    const host = configureFakeSelfEmploymentHost();
    const project = host.state.selfEmployment.projects[0];
    const plan = project.gantt.cardPlans.find((item) => item.todos.length > 0)!;
    const todo = plan.todos[0];
    selfEmploymentUiState.kanbanSelectedCard = { projectId: project.id, cardId: plan.cardId, todoId: todo.id };

    const event = fakeMouseEvent(fakeKanbanColumn(project.id, "in_progress"));
    onSelfEmploymentClick(event, fakeAppContext(host.state, { request: vi.fn() }));

    const updatedTodo = host.state.selfEmployment.projects[0].gantt.cardPlans
      .find((item) => item.cardId === plan.cardId)
      ?.todos.find((item) => item.id === todo.id);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(updatedTodo?.status).toBe("in_progress");
    expect(updatedTodo?.completed).toBe(false);
    expect(host.calls).toEqual(["sync", "render"]);
  });

  it("opens the related todo popup with ctrl-click while normal clicks still select cards", () => {
    const host = configureFakeSelfEmploymentHost();
    const project = host.state.selfEmployment.projects[0];
    const plan = project.gantt.cardPlans.find((item) => item.todos.length > 0)!;
    const todo = plan.todos[0];
    const scheduler = { request: vi.fn() };
    const card = fakeKanbanCard(project.id, plan.cardId, todo.id);

    onSelfEmploymentClick(fakeMouseEvent(card, { ctrlKey: true, button: 0, clientX: 440, clientY: 120 }), fakeAppContext(host.state, scheduler));

    expect(selfEmploymentUiState.taskContextPopup).toMatchObject({ projectId: project.id, cardId: plan.cardId, todoId: todo.id });
    expect(selfEmploymentUiState.kanbanSelectedCard).toEqual({ projectId: project.id, cardId: plan.cardId, todoId: todo.id });
    expect(scheduler.request).toHaveBeenCalledTimes(1);

    onSelfEmploymentClick(fakeMouseEvent(card), fakeAppContext(host.state, scheduler));

    expect(selfEmploymentUiState.taskContextPopup).toBeNull();
    expect(scheduler.request).toHaveBeenCalledTimes(2);
  });

  it("renders related todos in the popup and excludes todos from other cards", () => {
    const host = configureFakeSelfEmploymentHost();
    const project = projectWithRelatedTodos(host.state);
    selfEmploymentUiState.taskContextPopup = {
      projectId: project.id,
      cardId: "card-a",
      todoId: "todo-a-2",
      left: 100,
      top: 80
    };

    const html = selfEmploymentProjectDetails(
      evaluateSelfEmploymentProject(project, { availableTimeHours: 40, availableReserve: 5000 }),
      "tasks",
      fakeIncomePlanningModel()
    );
    const popupHtml = extractTaskContextPopup(html);

    expect(popupHtml).toContain("self-employment-task-context-popup");
    expect(popupHtml).toContain("Erstes Todo");
    expect(popupHtml).toContain("Zweites Todo");
    expect(popupHtml).not.toContain("Fremdes Todo");
    expect(popupHtml).toContain('aria-current="true"');
  });

  it("jumps from the popup to another kanban todo and clears blocking filters", () => {
    vi.useFakeTimers();
    const host = configureFakeSelfEmploymentHost();
    const project = projectWithRelatedTodos(host.state);
    const scrollIntoView = vi.fn();
    const classList = { add: vi.fn(), remove: vi.fn() };
    vi.stubGlobal("document", {
      querySelector: vi.fn(() => ({ scrollIntoView, classList }))
    });
    selfEmploymentUiState.taskContextPopup = { projectId: project.id, cardId: "card-a", todoId: "todo-a-1", left: 100, top: 80 };
    selfEmploymentUiState.taskEisenhowerFilter = "important_urgent";
    selfEmploymentUiState.kanbanPhaseFilterIds = ["phase-9"];
    selfEmploymentUiState.kanbanLabelFilterIds = ["goal"];

    const scheduler = { request: vi.fn() };
    onSelfEmploymentClick(fakeMouseEvent(fakePopupTodoButton(project.id, "card-a", "todo-a-2")), fakeAppContext(host.state, scheduler));
    vi.runAllTimers();

    expect(selfEmploymentUiState.kanbanSelectedCard).toEqual({ projectId: project.id, cardId: "card-a", todoId: "todo-a-2" });
    expect(selfEmploymentUiState.taskContextPopup).toBeNull();
    expect(selfEmploymentUiState.taskEisenhowerFilter).toBe("all");
    expect(selfEmploymentUiState.kanbanPhaseFilterIds).toEqual([]);
    expect(selfEmploymentUiState.kanbanLabelFilterIds).toEqual([]);
    expect(scheduler.request).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "center", inline: "nearest", behavior: "smooth" });
    expect(classList.add).toHaveBeenCalledWith("jump-highlight");
  });

  it("rates human-capital projects as realistic without direct profit when time and benefit fit", () => {
    const project = {
      ...defaultAppState().selfEmployment.projects[0],
      projectType: "human_capital" as const,
      status: "in_progress" as const,
      name: "Uni",
      projectGoal: "Abschluss erreichen",
      motivation: "Wissen und Karriereeffekt aufbauen",
      monthlyRevenueExpected: 0,
      monthlyRunningCosts: 0,
      startCapitalRequired: 0,
      requiredHoursPerWeek: 12,
      fixedProjectHoursPerWeek: 12,
      flexibleProjectHoursPerWeek: 0
    };

    const evaluation = evaluateSelfEmploymentProject(project, { availableTimeHours: 19.4, availableReserve: 0, weeklyTimeDemand: 12 });

    expect(evaluation.feasibility).toBe("realistic");
    expect(evaluation.benefitLabel).toBe("Humankapital-Wert hoch");
    expect(evaluation.reasons.join(" ")).not.toContain("Umsatzprojekt hat noch keinen positiven Gewinn");
  });

  it("renders at most three selected active dashboard projects and keeps all projects in the list popup", () => {
    const host = configureFakeSelfEmploymentHost();
    const statuses = ["open", "in_progress", "completed", "cancelled", "in_progress"] as const;
    host.state.selfEmployment.projects = Array.from({ length: 5 }, (_, index) => ({
      ...host.state.selfEmployment.projects[0],
      id: `project-${index + 1}`,
      name: `Projekt ${index + 1}`,
      status: statuses[index],
      dashboardEnabled: true
    }));
    host.state.selfEmployment.selectedProjectId = "project-1";
    selfEmploymentUiState.projectListPopupOpen = true;
    const container = { innerHTML: "" };
    vi.stubGlobal("document", {
      querySelector: (selector: string) => (selector === "#selfEmploymentDashboard" ? container : null)
    });

    renderSelfEmploymentDashboard();

    const managementHtml = extractProjectManagement(container.innerHTML);
    expect(count(container.innerHTML, 'class="self-employment-project-card')).toBe(3);
    expect(managementHtml).toContain("Projektverwaltung");
    expect(managementHtml).toContain("Projekt anlegen");
    expect(managementHtml).toContain("Projektliste");
    expect(managementHtml.indexOf("Projekt anlegen")).toBeLessThan(managementHtml.indexOf("Projektliste"));
    expect(container.innerHTML).toContain("self-employment-project-list-popup");
    expect(container.innerHTML).toContain('aria-label="Projektliste schliessen"');
    expect(container.innerHTML).toContain("self-employment-project-list-summary");
    expect(container.innerHTML).toContain('data-action="self-employment-toggle-project-list-item"');
    expect(container.innerHTML).toContain('aria-expanded="false"');
    expect(container.innerHTML).not.toContain("self-employment-project-module-grid");
    expect(container.innerHTML).not.toContain('data-self-employment-field="module.invoices"');
    expect(container.innerHTML).not.toContain("Dashboard: aktiv");
    expect(container.innerHTML).toContain("⚪ Offen");
    expect(container.innerHTML).toContain("🔵 In Arbeit");
    expect(container.innerHTML).toContain("✔️ Erledigt");
    expect(container.innerHTML).toContain("❌ Cancel");
    expect(container.innerHTML).toContain("Projektliste");
    expect(container.innerHTML).toContain("Projekt 5");
    expect(container.innerHTML).not.toContain("Geplanter Monatsumsatz");
    expect(container.innerHTML).not.toContain("Geschaetzter Monatsgewinn");
    expect(container.innerHTML).not.toContain("Offene Investitionsluecke");
  });

  it("renders expanded project details only for the active project list item", () => {
    const host = configureFakeSelfEmploymentHost();
    host.state.selfEmployment.projects = Array.from({ length: 2 }, (_, index) => ({
      ...host.state.selfEmployment.projects[0],
      id: `project-${index + 1}`,
      name: `Projekt ${index + 1}`,
      dashboardEnabled: true
    }));
    host.state.selfEmployment.selectedProjectId = "project-1";
    selfEmploymentUiState.projectListPopupOpen = true;
    selfEmploymentUiState.projectListExpandedProjectId = "project-2";
    const container = { innerHTML: "" };
    vi.stubGlobal("document", {
      querySelector: (selector: string) => (selector === "#selfEmploymentDashboard" ? container : null)
    });

    renderSelfEmploymentDashboard();

    const collapsedItem = extractProjectListItem(container.innerHTML, "project-1");
    const expandedItem = extractProjectListItem(container.innerHTML, "project-2");
    expect(collapsedItem).toContain('aria-expanded="false"');
    expect(collapsedItem).not.toContain("self-employment-project-module-grid");
    expect(expandedItem).toContain('aria-expanded="true"');
    expect(expandedItem).toContain("self-employment-project-list-details");
    expect(expandedItem).toContain("self-employment-project-module-grid");
    expect(expandedItem).toContain('data-self-employment-field="module.metrics"');
  });

  it("toggles exactly one project list item open at a time", () => {
    const host = configureFakeSelfEmploymentHost();
    host.state.selfEmployment.projects = Array.from({ length: 2 }, (_, index) => ({
      ...host.state.selfEmployment.projects[0],
      id: `project-${index + 1}`,
      name: `Projekt ${index + 1}`
    }));
    const scheduler = { request: vi.fn() };
    vi.stubGlobal("document", {
      querySelector: () => null
    });

    onSelfEmploymentClick(fakeMouseEvent(fakeProjectListButton("self-employment-toggle-project-list-item", "project-1")), fakeAppContext(host.state, scheduler));
    expect(selfEmploymentUiState.projectListExpandedProjectId).toBe("project-1");
    expect(host.calls).toEqual([]);

    onSelfEmploymentClick(fakeMouseEvent(fakeProjectListButton("self-employment-toggle-project-list-item", "project-2")), fakeAppContext(host.state, scheduler));
    expect(selfEmploymentUiState.projectListExpandedProjectId).toBe("project-2");
    expect(host.calls).toEqual([]);

    onSelfEmploymentClick(fakeMouseEvent(fakeProjectListButton("self-employment-toggle-project-list-item", "project-2")), fakeAppContext(host.state, scheduler));
    expect(selfEmploymentUiState.projectListExpandedProjectId).toBeNull();
    expect(host.calls).toEqual([]);
  });

  it("updates project list popup fields locally without a full dashboard render", () => {
    const host = configureFakeSelfEmploymentHost();
    const projectId = host.state.selfEmployment.projects[0].id;
    selfEmploymentUiState.projectListPopupOpen = true;
    selfEmploymentUiState.projectListExpandedProjectId = projectId;
    const focus = vi.fn();
    const popup = fakeProjectListPopup(focus);
    const target = fakeProjectListSelect(projectId, "status", "completed", popup);
    vi.stubGlobal("HTMLInputElement", class HTMLInputElement {});
    vi.stubGlobal("document", {
      activeElement: target,
      querySelector: (selector: string) => (selector === ".self-employment-project-list-popup" ? popup : null)
    });

    popup.scrollTop = 180;
    onSelfEmploymentChange({ target } as unknown as Event, fakeAppContext(host.state, { request: vi.fn() }));

    expect(host.state.selfEmployment.projects[0].status).toBe("completed");
    expect(host.calls).toEqual(["sync", "persist"]);
    expect(popup.innerHTML).toContain("✔️ Erledigt");
    expect(popup.scrollTop).toBe(180);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(selfEmploymentUiState.projectListExpandedProjectId).toBe(projectId);
  });

  it("updates dashboard selection inside the project list popup without a full render", () => {
    const host = configureFakeSelfEmploymentHost();
    const projectId = host.state.selfEmployment.projects[0].id;
    host.state.selfEmployment.projects[0].dashboardEnabled = false;
    selfEmploymentUiState.projectListPopupOpen = true;
    selfEmploymentUiState.projectListExpandedProjectId = projectId;
    const popup = fakeProjectListPopup();
    vi.stubGlobal("document", {
      querySelector: (selector: string) => (selector === ".self-employment-project-list-popup" ? popup : null),
      activeElement: null
    });

    onSelfEmploymentClick(fakeMouseEvent(fakeProjectListButton("self-employment-toggle-dashboard-project", projectId)), fakeAppContext(host.state, { request: vi.fn() }));

    expect(host.state.selfEmployment.projects[0].dashboardEnabled).toBe(true);
    expect(host.calls).toEqual(["sync", "persist"]);
    expect(popup.innerHTML).toContain("Dashboard: aktiv");
    expect(popup.innerHTML).toContain("1/3 im Dashboard");
    expect(selfEmploymentUiState.projectListExpandedProjectId).toBe(projectId);
  });

  it("does not allow more than three projects to be marked for the dashboard", () => {
    const host = configureFakeSelfEmploymentHost();
    host.state.selfEmployment.projects = Array.from({ length: 4 }, (_, index) => ({
      ...host.state.selfEmployment.projects[0],
      id: `project-${index + 1}`,
      name: `Projekt ${index + 1}`,
      dashboardEnabled: index < 3
    }));

    toggleSelfEmploymentDashboardProject("project-4");

    expect(host.state.selfEmployment.projects.filter((project) => project.dashboardEnabled)).toHaveLength(3);
    expect(host.calls).toEqual([]);
  });

  it("keeps project module controls in the project list and filters the detail roadmap", () => {
    const host = configureFakeSelfEmploymentHost();
    const project = {
      ...host.state.selfEmployment.projects[0],
      enabledModules: { invoices: false, budget: false, contacts: false, profit: false, metrics: true }
    };

    const disabledHtml = selfEmploymentProjectDetails(
      evaluateSelfEmploymentProject(project, { availableTimeHours: 40, availableReserve: 5000 }),
      "budget",
      fakeIncomePlanningModel()
    );
    const enabledHtml = selfEmploymentProjectDetails(
      evaluateSelfEmploymentProject({ ...project, enabledModules: { ...project.enabledModules, budget: true } }, {
        availableTimeHours: 40,
        availableReserve: 5000
      }),
      "budget",
      fakeIncomePlanningModel()
    );

    expect(disabledHtml).not.toContain("self-employment-module-toggle-grid");
    expect(disabledHtml).not.toContain('data-self-employment-field="module.budget"');
    expect(disabledHtml).not.toContain('data-self-employment-roadmap-area="budget"');
    expect(disabledHtml).not.toContain("Budget &amp; Investitionen");
    expect(enabledHtml).toContain('data-self-employment-roadmap-area="budget"');
    expect(enabledHtml).toContain("Budget &amp; Investitionen");
  });

  it("normalizes done project status aliases and updates project modules through saved fields", () => {
    const host = configureFakeSelfEmploymentHost();
    const projectId = host.state.selfEmployment.projects[0].id;
    host.state.selfEmployment.projects[0].enabledModules.contacts = false;

    expect(selfEmploymentStatusFromValue("done", "open")).toBe("completed");

    updateSelfEmploymentProjectField(projectId, "status", "done", false);
    updateSelfEmploymentProjectField(projectId, "module.contacts", true, false);

    expect(host.state.selfEmployment.projects[0].status).toBe("completed");
    expect(host.state.selfEmployment.projects[0].enabledModules.contacts).toBe(true);
    expect(host.calls).toEqual(["sync", "persist", "sync", "persist"]);
  });

  it("excludes completed and cancelled projects from active project statistics", () => {
    const project = defaultAppState().selfEmployment.projects[0];

    expect(selfEmploymentProjectIsActive({ ...project, status: "open" })).toBe(true);
    expect(selfEmploymentProjectIsActive({ ...project, status: "in_progress" })).toBe(true);
    expect(selfEmploymentProjectIsActive({ ...project, status: "completed" })).toBe(false);
    expect(selfEmploymentProjectIsActive({ ...project, status: "cancelled" })).toBe(false);
  });

  it("renders separated offer and invoice tabs with card-based offer calculation", () => {
    const host = configureFakeSelfEmploymentHost();
    const project = {
      ...projectWithRelatedTodos(host.state),
      offerSettings: {
        ...host.state.selfEmployment.projects[0].offerSettings,
        baseHourlyRate: 60,
        usePhaseFactors: true,
        useLabelFactors: true,
        useTodoTimes: true,
        useBuffer: false,
        useRounding: false,
        taxPercent: 0
      }
    };

    const offerHtml = selfEmploymentProjectDetails(
      evaluateSelfEmploymentProject(project, { availableTimeHours: 40, availableReserve: 5000, weeklyTimeDemand: 4 }),
      "invoices",
      fakeIncomePlanningModel()
    );

    expect(offerHtml).toContain("Phasenfaktoren verwenden");
    expect(offerHtml).toContain("Labelfaktoren verwenden");
    expect(offerHtml).toContain("Angebotsuebersicht anzeigen");
    expect(offerHtml).toContain("Karte A");
    expect(offerHtml).toContain("33,60");

    selfEmploymentUiState.billingTabByProjectId = { [project.id]: "invoices" };
    const invoiceHtml = selfEmploymentProjectDetails(
      evaluateSelfEmploymentProject(project, { availableTimeHours: 40, availableReserve: 5000, weeklyTimeDemand: 4 }),
      "invoices",
      fakeIncomePlanningModel()
    );

    expect(invoiceHtml).toContain("Angebot uebernehmen");
    expect(invoiceHtml).toContain("Rechnung hinzufuegen");
    expect(invoiceHtml).toContain("Ueberfaellig");
  });
});

function configureFakeSelfEmploymentHost(): {
  state: ReturnType<typeof defaultAppState>;
  calls: string[];
  clearCalls(): void;
} {
  const state = defaultAppState();
  const calls: string[] = [];
  configureSelfEmploymentHost({
    getState: () => state,
    syncStoreState: () => {
      calls.push("sync");
    },
    persistCurrentState: () => {
      calls.push("persist");
    },
    renderAll: () => {
      calls.push("render");
    },
    incomePlanningModelForActiveWeek: fakeIncomePlanningModel,
    activePlanningSettings: () => state.settings,
    activePlanningPositions: () => state.positions
  });
  return {
    state,
    calls,
    clearCalls: () => {
      calls.length = 0;
    }
  };
}

function fakeIncomePlanningModel(): IncomePlanningModel {
  return {
    activeWorkBlocks: [],
    careerWorkBlocks: [],
    activeHabits: [],
    activeManualBlocks: [],
    calendarEntries: [],
    scenarioId: "normal",
    scenarioLabel: "Normal",
    grossWorkHours: 0,
    totalWorkHours: 0,
    pauseHours: 0,
    habitHours: 0,
    grossManualHours: 0,
    manualHours: 0,
    sleepHoursPerWeek: 0,
    usedHours: 0,
    remainingFlexibleHours: 0,
    conflictCount: 0,
    invalidSlotCount: 0,
    status: "realistic",
    warnings: []
  };
}

function fakeAppContext(
  state: ReturnType<typeof defaultAppState>,
  scheduler: { request: () => void }
): Parameters<typeof onSelfEmploymentClick>[1] {
  return {
    store: { getState: () => state },
    scheduler
  } as Parameters<typeof onSelfEmploymentClick>[1];
}

function fakeMouseEvent(
  target: HTMLElement,
  overrides: Partial<Pick<MouseEvent, "ctrlKey" | "button" | "clientX" | "clientY">> = {}
): MouseEvent & { preventDefault: ReturnType<typeof vi.fn> } {
  return {
    target,
    ctrlKey: overrides.ctrlKey ?? false,
    button: overrides.button ?? 0,
    clientX: overrides.clientX ?? 0,
    clientY: overrides.clientY ?? 0,
    preventDefault: vi.fn()
  } as unknown as MouseEvent & { preventDefault: ReturnType<typeof vi.fn> };
}

function fakeKanbanCard(projectId: string, cardId: string, todoId: string): HTMLElement {
  const card = {
    dataset: {
      selfEmploymentProjectId: projectId,
      selfEmploymentGanttCardId: cardId,
      selfEmploymentGanttTodoId: todoId
    },
    getBoundingClientRect: () => ({ left: 420, top: 90, right: 620, bottom: 150, width: 200, height: 60 }),
    closest: (selector: string) => (selector === "[data-self-employment-kanban-card]" ? card : null)
  } as unknown as HTMLElement;
  return card;
}

function fakeKanbanColumn(projectId: string, status: string): HTMLElement {
  const column = {
    dataset: {
      selfEmploymentProjectId: projectId,
      selfEmploymentKanbanStatus: status
    },
    closest: (selector: string) =>
      selector === ".self-employment-kanban-column[data-self-employment-kanban-status]" ? column : null
  } as unknown as HTMLElement;
  return column;
}

function fakePopupTodoButton(projectId: string, cardId: string, todoId: string): HTMLElement {
  let button: HTMLElement;
  button = {
    dataset: {
      action: "self-employment-jump-kanban-todo",
      selfEmploymentProjectId: projectId,
      selfEmploymentGanttCardId: cardId,
      selfEmploymentGanttTodoId: todoId
    },
    closest: (selector: string) => (selector === "button[data-action]" ? button : null)
  } as unknown as HTMLElement;
  return button;
}

function fakeProjectListButton(action: string, projectId: string): HTMLElement {
  const popup = { nodeType: 1 };
  let button: HTMLElement;
  button = {
    dataset: {
      action,
      selfEmploymentProjectId: projectId
    },
    closest: (selector: string) => {
      if (selector === "button[data-action]") return button;
      if (selector === ".self-employment-project-list-popup") return popup;
      return null;
    }
  } as unknown as HTMLElement;
  return button;
}

function fakeProjectListSelect(projectId: string, field: string, value: string, popup: HTMLElement): HTMLSelectElement {
  const target = {
    dataset: {
      selfEmploymentProjectId: projectId,
      selfEmploymentField: field
    },
    value,
    tagName: "SELECT",
    closest: (selector: string) => (selector === ".self-employment-project-list-popup" ? popup : null)
  } as unknown as HTMLSelectElement;
  return target;
}

function fakeProjectListPopup(focus: ReturnType<typeof vi.fn> = vi.fn()): HTMLElement {
  let html = "";
  let scrollTop = 0;
  const popup = {
    get scrollTop() {
      return scrollTop;
    },
    set scrollTop(value: number) {
      scrollTop = value;
    },
    contains: () => true,
    querySelector: (selector: string) => (selector.includes('data-self-employment-field="status"') ? { focus } : null),
    get innerHTML() {
      return html;
    },
    set innerHTML(value: string) {
      html = value;
      scrollTop = 0;
    }
  } as unknown as HTMLElement;
  return popup;
}

function extractTaskContextPopup(html: string): string {
  const start = html.indexOf("self-employment-task-context-popup");
  if (start === -1) return "";
  const end = html.indexOf("</div>\n   \n    </div>", start);
  return html.slice(start, end === -1 ? start + 3000 : end);
}

function count(value: string, needle: string): number {
  return value.split(needle).length - 1;
}

function extractProjectManagement(html: string): string {
  const start = html.indexOf("self-employment-project-management");
  if (start === -1) return "";
  const end = html.indexOf("</section>", start);
  return html.slice(start, end === -1 ? start + 1200 : end);
}

function extractProjectListItem(html: string, projectId: string): string {
  const start = html.indexOf(`data-self-employment-project-id="${projectId}"`);
  if (start === -1) return "";
  const articleStart = html.lastIndexOf("<article", start);
  const articleEnd = html.indexOf("</article>", start);
  return html.slice(articleStart === -1 ? start : articleStart, articleEnd === -1 ? start + 2000 : articleEnd);
}

function projectWithRelatedTodos(state: ReturnType<typeof defaultAppState>): ReturnType<typeof defaultAppState>["selfEmployment"]["projects"][number] {
  const project = state.selfEmployment.projects[0];
  const canvas = {
    nodes: [
      { id: "card-a", type: "text" as const, text: "Karte A", x: 0, y: 0, width: 100, height: 80 },
      { id: "card-b", type: "text" as const, text: "Karte B", x: 120, y: 0, width: 100, height: 80 }
    ],
    edges: []
  };
  const nextProject = {
    ...project,
    businessIdeaCanvas: canvas,
    businessIdeaCanvasMeta: {
      ...project.businessIdeaCanvasMeta,
      nodeMeta: {
        "card-a": { labelId: "idea", phaseId: "phase-1", shape: "rounded-rectangle" as const },
        "card-b": { labelId: "goal", phaseId: "phase-2", shape: "rounded-rectangle" as const }
      }
    }
  };
  const gantt = normalizeSelfEmploymentGanttPlan(
    {
      cardPlans: [
        {
          cardId: "card-a",
          timeBudgetHours: 4,
          completed: false,
          todos: [
            { id: "todo-a-1", title: "Erstes Todo", eisenhowerQuadrant: "important_not_urgent", status: "planned", completed: false },
            { id: "todo-a-2", title: "Zweites Todo", eisenhowerQuadrant: "important_urgent", status: "in_progress", completed: false }
          ]
        },
        {
          cardId: "card-b",
          timeBudgetHours: 2,
          completed: false,
          todos: [{ id: "todo-b-1", title: "Fremdes Todo", eisenhowerQuadrant: "important_not_urgent", status: "planned", completed: false }]
        }
      ]
    },
    nextProject.businessIdeaCanvas,
    nextProject.businessIdeaCanvasMeta
  );
  const updated = { ...nextProject, gantt };
  state.selfEmployment.projects = [updated];
  state.selfEmployment.selectedProjectId = updated.id;
  return updated;
}
