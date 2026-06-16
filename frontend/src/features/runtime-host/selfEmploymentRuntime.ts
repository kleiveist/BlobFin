import {
  clearSelfEmploymentGanttEditorForDeletedNodes,
  configureSelfEmploymentHost,
  renderSelfEmploymentDashboard,
  renderSelfEmploymentIconPicker,
  selfEmploymentProjectById,
  updateSelfEmploymentProject
} from "../self-employment";
import { configureBusinessCanvasHost } from "../self-employment/business-canvas";
import { incomePlanningModelForActiveWeek } from "../income-planning";
import { runtimeApi, runtimeHost } from "./hostContext";

export function configureSelfEmploymentRuntime(
  syncStoreState: () => void,
  persistCurrentState: () => void,
  renderAll: () => void
): void {
  configureSelfEmploymentHost({
    getState: () => runtimeHost.appContext.store.getState(),
    syncStoreState,
    persistCurrentState,
    renderAll,
    incomePlanningModelForActiveWeek,
    activePlanningSettings: runtimeApi.activePlanningSettings,
    activePlanningPositions: runtimeApi.activePlanningPositions
  });
  configureBusinessCanvasHost({
    getState: () => runtimeHost.appContext.store.getState(),
    projectById: selfEmploymentProjectById,
    updateSelfEmploymentProject,
    clearGanttEditorForDeletedNodes: clearSelfEmploymentGanttEditorForDeletedNodes,
    renderAll
  });
  Object.assign(runtimeApi, {
    renderSelfEmploymentRuntime
  });
}

function renderSelfEmploymentRuntime(): void {
  renderSelfEmploymentDashboard();
  renderSelfEmploymentIconPicker();
}
