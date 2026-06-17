import type { SelfEmploymentGanttTodoEisenhowerQuadrant } from "../../types";

export type SelfEmploymentGanttEditor =
  | { projectId: string; type: "phase"; phaseId: string; top: number; left: number }
  | { projectId: string; type: "card"; cardId: string; top: number; left: number }
  | null;

export interface SelfEmploymentUiState {
  ganttEditor: SelfEmploymentGanttEditor;
  labelPickerProjectId: string | null;
  iconPicker: { projectId: string; top: number; left: number } | null;
  taskEisenhowerFilter: "all" | SelfEmploymentGanttTodoEisenhowerQuadrant;
  kanbanPhaseFilterIds: string[];
  kanbanLabelFilterIds: string[];
  kanbanDrag: { projectId: string; cardId: string; todoId: string; status: "planned" | "in_progress" | "done" } | null;
}

export const selfEmploymentUiState: SelfEmploymentUiState = {
  ganttEditor: null,
  labelPickerProjectId: null,
  iconPicker: null,
  taskEisenhowerFilter: "all",
  kanbanPhaseFilterIds: [],
  kanbanLabelFilterIds: [],
  kanbanDrag: null
};
