import {
  configureIncomeTrackerHost,
  renderIncomeTracker
} from "../income-tracker";
import {
  configureIncomePlanningHost,
  renderIncomePlanning,
  startIncomePlanningCurrentTimeTicker
} from "../income-planning";
import { runtimeApi, runtimeHost } from "./hostContext";

export function configureIncomeRuntime(persistCurrentState: () => void, renderAll: () => void): void {
  configureIncomeTrackerHost({
    getState: () => runtimeHost.appContext.store.getState(),
    persistCurrentState,
    renderAll,
    exportCsvFile: runtimeApi.exportCsvFile
  });
  configureIncomePlanningHost({
    getState: () => runtimeHost.appContext.store.getState(),
    persistCurrentState,
    renderAll,
    setActiveSection: runtimeApi.setActiveSection
  });
  Object.assign(runtimeApi, {
    renderIncomeRuntime,
    startIncomeRuntimeTicker
  });
}

function renderIncomeRuntime(): void {
  renderIncomeTracker();
  renderIncomePlanning();
}

function startIncomeRuntimeTicker(): void {
  startIncomePlanningCurrentTimeTicker();
}
