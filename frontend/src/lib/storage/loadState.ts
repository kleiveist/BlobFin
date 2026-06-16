import { defaultAppState } from "../../data/defaults";
import type { AppState } from "../../types";
import { APP_STORAGE_KEY as STORAGE_KEY, readFallbackStateValue } from "../vault/vaultFallback";
import { normalizeLegacyState, normalizeState } from "./normalizeState";

export function loadState(storage: Storage = localStorage): AppState {
  const saved = readFallbackStateValue(storage);
  if (!saved) return defaultAppState();
  return storage.getItem(STORAGE_KEY) ? normalizeState(saved) : normalizeLegacyState(saved);
}
