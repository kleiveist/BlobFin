import { normalizeStoredState } from "../../lib/storage";
import type { AppState } from "../../types";

export function migrateAppState(value: unknown): AppState {
  return normalizeStoredState(value);
}
