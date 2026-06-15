import type { AppState, SelfEmploymentProject } from "../../../types";

export interface BusinessCanvasHost {
  getState(): AppState;
  projectById(projectId: string): SelfEmploymentProject | null;
  updateSelfEmploymentProject(
    projectId: string,
    updater: (project: SelfEmploymentProject) => SelfEmploymentProject,
    renderAfterUpdate: boolean
  ): void;
  clearGanttEditorForDeletedNodes(nodeIds: Set<string>): void;
  renderAll(): void;
}

let currentHost: BusinessCanvasHost | null = null;

export function configureBusinessCanvasHost(host: BusinessCanvasHost): void {
  currentHost = host;
}

export function businessCanvasHost(): BusinessCanvasHost {
  if (!currentHost) {
    throw new Error("Business canvas host has not been configured.");
  }
  return currentHost;
}
