import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultAppState } from "../data/defaults";
import type { IncomePlanningModel } from "../domain/incomePlanning";
import {
  addSelfEmploymentProject,
  configureSelfEmploymentHost,
  deleteSelfEmploymentProject,
  renameSelfEmploymentProject,
  toggleSelfEmploymentProjectLabel,
  updateSelfEmploymentProject
} from "../features/self-employment/controller";
import { onSelfEmploymentClick } from "../features/self-employment/events";
import { selfEmploymentUiState } from "../features/self-employment/uiState";

afterEach(() => {
  selfEmploymentUiState.kanbanSelectedCard = null;
  selfEmploymentUiState.kanbanDrag = null;
  vi.unstubAllGlobals();
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

function fakeMouseEvent(target: HTMLElement): MouseEvent & { preventDefault: ReturnType<typeof vi.fn> } {
  return {
    target,
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
