import type { AppState } from "../../types";

export type AppStateUpdater = (state: AppState) => AppState;

export function patchAppState(patch: Partial<AppState>): AppStateUpdater {
  return (state) => ({ ...state, ...patch });
}
