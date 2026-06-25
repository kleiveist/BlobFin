import type { AppState } from "../../types";
import { selfEmploymentUiState } from "./uiState";

interface SelfEmploymentProjectRenameContext {
  getState(): AppState;
  commitSelfEmploymentState(nextSelfEmployment: AppState["selfEmployment"], options: { render?: boolean; persist?: boolean }): void;
  renderAll(): void;
}

let renameContext: SelfEmploymentProjectRenameContext | null = null;

export function configureSelfEmploymentProjectRename(context: SelfEmploymentProjectRenameContext): void {
  renameContext = context;
}

function context(): SelfEmploymentProjectRenameContext {
  if (!renameContext) throw new Error("Self-employment project rename context has not been configured.");
  return renameContext;
}

export function renameSelfEmploymentProject(projectId: string): void {
  const project = context().getState().selfEmployment.projects.find((item) => item.id === projectId);
  if (!project) return;
  selfEmploymentUiState.projectRenameDialog = {
    projectId,
    name: project.name,
    error: ""
  };
  selfEmploymentUiState.ganttEditor = null;
  selfEmploymentUiState.iconPicker = null;
  context().renderAll();
}

export function updateSelfEmploymentProjectRenameDraft(field: string, value: string): void {
  if (!selfEmploymentUiState.projectRenameDialog) return;
  if (field !== "name") return;
  selfEmploymentUiState.projectRenameDialog = {
    ...selfEmploymentUiState.projectRenameDialog,
    name: value,
    error: ""
  };
}

export function closeSelfEmploymentProjectRenameDialog(): void {
  if (!selfEmploymentUiState.projectRenameDialog) return;
  selfEmploymentUiState.projectRenameDialog = null;
  context().renderAll();
}

export function saveSelfEmploymentProjectRenameDialog(): void {
  const dialog = selfEmploymentUiState.projectRenameDialog;
  if (!dialog) return;
  const project = context().getState().selfEmployment.projects.find((item) => item.id === dialog.projectId);
  if (!project) {
    selfEmploymentUiState.projectRenameDialog = null;
    context().renderAll();
    return;
  }
  const nextName = dialog.name.trim();
  if (!nextName) {
    selfEmploymentUiState.projectRenameDialog = {
      ...dialog,
      error: "Bitte einen Projektnamen eingeben."
    };
    context().renderAll();
    return;
  }
  selfEmploymentUiState.projectRenameDialog = null;
  if (nextName === project.name) {
    context().renderAll();
    return;
  }
  context().commitSelfEmploymentState({
    ...context().getState().selfEmployment,
    projects: context().getState().selfEmployment.projects.map((item) =>
      item.id === dialog.projectId ? { ...item, name: nextName } : item
    )
  }, { render: true });
}
