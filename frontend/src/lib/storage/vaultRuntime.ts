import { defaultAppState } from "../../data/defaults";
import type { AppState } from "../../types";
import {
  readVaultFallbackMetadata,
  saveFallbackStateValue,
  saveVaultFallbackMetadata
} from "../vault/vaultFallback";
import {
  createVaultSnapshot,
  isVaultRuntimeAvailable,
  pickVaultDirectory,
  profilePath as vaultProfilePath,
  readVault,
  readVaultState,
  writeVaultState
} from "../vault/vaultStorage";
import { deserializeVaultState } from "../vault/vaultSerializer";
import type { VaultRuntimeState, VaultSnapshotResult } from "../vault/vaultTypes";
import { loadState } from "./loadState";
import { normalizeState } from "./normalizeState";

let vaultRuntimeState: VaultRuntimeState = {
  status: "disconnected",
  vaultRootPath: null,
  profilePath: null,
  lastSavedAt: null,
  lastError: null,
  pendingWrites: 0
};
let vaultPendingState: AppState | null = null;
let vaultWriteScheduled = false;
let vaultWriteQueue: Promise<void> = Promise.resolve();

export async function initializeStorage(storage: Storage = localStorage): Promise<AppState> {
  let fallback = defaultAppState();
  try {
    fallback = loadState(storage);
  } catch (error) {
    console.warn("Fallback state could not be loaded.", error);
  }
  if (!isVaultRuntimeAvailable()) {
    vaultRuntimeState = {
      status: "csvOnly",
      vaultRootPath: null,
      profilePath: null,
      lastSavedAt: null,
      lastError: null,
      pendingWrites: 0
    };
    return fallback;
  }

  const metadata = safeReadVaultFallbackMetadata(storage);
  if (!metadata) {
    vaultRuntimeState = {
      status: "disconnected",
      vaultRootPath: null,
      profilePath: null,
      lastSavedAt: null,
      lastError: null,
      pendingWrites: 0
    };
    return fallback;
  }

  try {
    const vaultState = normalizeState(await readVaultState(metadata.vaultRootPath));
    saveFallbackStateValue(vaultState, storage);
    setVaultConnected(metadata.vaultRootPath, metadata.updatedAt);
    return vaultState;
  } catch (error) {
    setVaultError(metadata.vaultRootPath, error);
    return fallback;
  }
}

export function getVaultStatus(): VaultRuntimeState {
  return { ...vaultRuntimeState };
}

export async function selectVault(storage: Storage = localStorage): Promise<AppState | null> {
  if (!isVaultRuntimeAvailable()) {
    vaultRuntimeState = {
      status: "csvOnly",
      vaultRootPath: null,
      profilePath: null,
      lastSavedAt: null,
      lastError: null,
      pendingWrites: 0
    };
    return null;
  }

  await drainVaultWriteQueue();
  const selectedPath = await pickVaultDirectory("Vault auswaehlen");
  if (!selectedPath) return null;

  try {
    const result = await readVault(selectedPath);
    const vaultState = normalizeState(deserializeVaultState(result.dataFiles));
    saveFallbackStateValue(vaultState, storage);
    saveVaultFallbackMetadata(selectedPath, storage);
    setVaultConnected(selectedPath, result.manifest.updatedAt);
    return vaultState;
  } catch (error) {
    setVaultError(selectedPath, error);
    return null;
  }
}

export async function createVault(state: AppState, storage: Storage = localStorage): Promise<VaultRuntimeState> {
  return activatePickedVault("Neuen Vault erstellen", state, storage);
}

export async function reloadFromVault(storage: Storage = localStorage): Promise<AppState | null> {
  const rootPath = vaultRuntimeState.vaultRootPath;
  if (!rootPath || vaultRuntimeState.status === "csvOnly") return null;

  try {
    const vaultState = normalizeState(await readVaultState(rootPath));
    saveFallbackStateValue(vaultState, storage);
    saveVaultFallbackMetadata(rootPath, storage);
    setVaultConnected(rootPath, vaultRuntimeState.lastSavedAt);
    return vaultState;
  } catch (error) {
    setVaultError(rootPath, error);
    return null;
  }
}

export async function flushVaultSave(state: AppState, storage: Storage = localStorage): Promise<VaultRuntimeState> {
  saveFallbackStateValue(state, storage);
  const rootPath = vaultRuntimeState.vaultRootPath;
  if (!rootPath || vaultRuntimeState.status === "csvOnly") return getVaultStatus();

  vaultPendingState = state;
  queueVaultSave();
  await vaultWriteQueue;
  return getVaultStatus();
}

export async function snapshotVault(): Promise<VaultSnapshotResult | null> {
  const rootPath = vaultRuntimeState.vaultRootPath;
  if (!rootPath || vaultRuntimeState.status === "csvOnly") return null;

  try {
    return await createVaultSnapshot(rootPath);
  } catch (error) {
    setVaultError(rootPath, error);
    return null;
  }
}

export function stageVaultSave(state: AppState): void {
  if (vaultRuntimeState.status === "connected" && vaultRuntimeState.vaultRootPath) {
    vaultPendingState = state;
    queueVaultSave();
  }
}

async function activatePickedVault(
  title: string,
  state: AppState,
  storage: Storage
): Promise<VaultRuntimeState> {
  if (!isVaultRuntimeAvailable()) {
    vaultRuntimeState = {
      status: "csvOnly",
      vaultRootPath: null,
      profilePath: null,
      lastSavedAt: null,
      lastError: null,
      pendingWrites: 0
    };
    return getVaultStatus();
  }

  const selectedPath = await pickVaultDirectory(title);
  if (!selectedPath) return getVaultStatus();

  try {
    await drainVaultWriteQueue();
    const result = await writeVaultState(selectedPath, state);
    saveFallbackStateValue(state, storage);
    saveVaultFallbackMetadata(selectedPath, storage);
    setVaultConnected(selectedPath, result.savedAt);
    return getVaultStatus();
  } catch (error) {
    setVaultError(selectedPath, error);
    return getVaultStatus();
  }
}

function queueVaultSave(): void {
  if (!vaultRuntimeState.vaultRootPath || vaultRuntimeState.status === "csvOnly") return;
  vaultRuntimeState = { ...vaultRuntimeState, pendingWrites: 1 };
  if (vaultWriteScheduled) return;

  vaultWriteScheduled = true;
  vaultWriteQueue = vaultWriteQueue.then(processQueuedVaultSave);
}

async function drainVaultWriteQueue(): Promise<void> {
  while (vaultWriteScheduled) {
    await vaultWriteQueue;
  }
  if (!vaultPendingState) return;
  vaultPendingState = null;
  vaultRuntimeState = { ...vaultRuntimeState, pendingWrites: 0 };
}

async function processQueuedVaultSave(): Promise<void> {
  const rootPath = vaultRuntimeState.vaultRootPath;
  if (!rootPath) {
    vaultWriteScheduled = false;
    vaultRuntimeState = { ...vaultRuntimeState, pendingWrites: 0 };
    return;
  }

  try {
    while (vaultPendingState) {
      const stateToSave = vaultPendingState;
      vaultPendingState = null;
      const result = await writeVaultState(rootPath, stateToSave);
      setVaultConnected(rootPath, result.savedAt);
    }
  } catch (error) {
    setVaultError(rootPath, error);
  } finally {
    vaultWriteScheduled = false;
    vaultRuntimeState = { ...vaultRuntimeState, pendingWrites: vaultPendingState ? 1 : 0 };
    if (vaultPendingState && vaultRuntimeState.status === "connected") queueVaultSave();
  }
}

function setVaultConnected(rootPath: string, lastSavedAt: string | null): void {
  vaultRuntimeState = {
    status: "connected",
    vaultRootPath: rootPath,
    profilePath: vaultProfilePath(rootPath),
    lastSavedAt,
    lastError: null,
    pendingWrites: vaultPendingState || vaultWriteScheduled ? 1 : 0
  };
}

function setVaultError(rootPath: string | null, error: unknown): void {
  vaultRuntimeState = {
    status: "error",
    vaultRootPath: rootPath,
    profilePath: rootPath ? vaultProfilePath(rootPath) : null,
    lastSavedAt: vaultRuntimeState.lastSavedAt,
    lastError: error instanceof Error ? error.message : String(error),
    pendingWrites: 0
  };
}

function safeReadVaultFallbackMetadata(storage: Storage): ReturnType<typeof readVaultFallbackMetadata> {
  try {
    return readVaultFallbackMetadata(storage);
  } catch (error) {
    console.warn("Vault metadata could not be read.", error);
    return null;
  }
}
