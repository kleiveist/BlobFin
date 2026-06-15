export type SelfEmploymentGanttEditor =
  | { projectId: string; type: "phase"; phaseId: string; top: number; left: number }
  | { projectId: string; type: "card"; cardId: string; top: number; left: number }
  | null;

export interface SelfEmploymentUiState {
  ganttEditor: SelfEmploymentGanttEditor;
  labelPickerProjectId: string | null;
  iconPicker: { projectId: string; top: number; left: number } | null;
}

export const selfEmploymentUiState: SelfEmploymentUiState = {
  ganttEditor: null,
  labelPickerProjectId: null,
  iconPicker: null
};
