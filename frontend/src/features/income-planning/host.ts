import type { AppSectionId, AppState } from "../../types";

export interface IncomePlanningHost {
  getState(): AppState;
  persistCurrentState(): void;
  renderAll(): void;
  setActiveSection(section: AppSectionId): void;
}

let configuredHost: IncomePlanningHost | null = null;

export function configureIncomePlanningHost(nextHost: IncomePlanningHost): void {
  configuredHost = nextHost;
}

export function requireIncomePlanningHost(): IncomePlanningHost {
  if (!configuredHost) throw new Error("Income planning feature host has not been configured.");
  return configuredHost;
}

export const incomePlanningHostRef: IncomePlanningHost = {
  getState: () => requireIncomePlanningHost().getState(),
  persistCurrentState: () => requireIncomePlanningHost().persistCurrentState(),
  renderAll: () => requireIncomePlanningHost().renderAll(),
  setActiveSection: (section) => requireIncomePlanningHost().setActiveSection(section)
};
