import { initializeStorage, saveState } from "../../lib/storage";
import type { AppState } from "../../types";

export async function loadPersistedAppState(): Promise<AppState> {
  return initializeStorage();
}

export function persistAppState(state: AppState): void {
  saveState(state);
}
