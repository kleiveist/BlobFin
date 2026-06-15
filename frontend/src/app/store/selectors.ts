import type { AppSectionId, AppState, AppUiState } from "../../types";

export function selectActiveSection(state: AppState): AppSectionId {
  return state.ui.activeSection;
}

export function selectUiState(state: AppState): AppUiState {
  return state.ui;
}
