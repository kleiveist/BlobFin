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

afterEach(() => {
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
