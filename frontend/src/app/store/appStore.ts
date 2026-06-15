import { defaultAppState } from "../../data/defaults";
import type { AppStateListener, AppStore, AppStoreWriteOptions } from "../contracts";
import type { AppState } from "../../types";
import { persistAppState } from "./persistence";

export function createAppStore(
  initialState: AppState = defaultAppState(),
  persist: (state: AppState) => void = persistAppState
): AppStore {
  let state = initialState;
  const listeners = new Set<AppStateListener>();

  const notify = (previousState: AppState): void => {
    for (const listener of listeners) {
      listener(state, previousState);
    }
  };

  const write = (nextState: AppState, options: AppStoreWriteOptions = {}): void => {
    const previousState = state;
    state = nextState;
    if (options.persist === true) {
      persist(state);
    }
    if (options.notify !== false) {
      notify(previousState);
    }
  };

  return {
    getState: () => state,
    replaceState: write,
    update: (updater, options) => write(updater(state), options),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    persistNow: () => persist(state)
  };
}
