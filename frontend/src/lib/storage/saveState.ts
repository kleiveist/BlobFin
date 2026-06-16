import { defaultAppState } from "../../data/defaults";
import type { AppState } from "../../types";
import { saveFallbackStateValue } from "../vault/vaultFallback";
import { stageVaultSave } from "./vaultRuntime";

export function saveState(state: AppState, storage: Storage = localStorage): void {
  saveFallbackStateValue(state, storage);
  stageVaultSave(state);
}

export function resetStoredState(storage: Storage = localStorage): AppState {
  const state = defaultAppState();
  saveState(state, storage);
  return state;
}
