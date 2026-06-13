export const APP_STORAGE_KEY = "blobfin.reserveCalculator.v1";
export const LEGACY_APP_STORAGE_KEY = "jahreskalkulatorState";
export const VAULT_FALLBACK_METADATA_KEY = "blobfin.vault.v1";

export interface VaultFallbackMetadata {
  vaultRootPath: string;
  updatedAt: string;
}

export function readFallbackStateValue(storage: Storage): unknown | null {
  const saved = storage.getItem(APP_STORAGE_KEY);
  if (saved) return JSON.parse(saved);

  const legacy = storage.getItem(LEGACY_APP_STORAGE_KEY);
  if (legacy) return JSON.parse(legacy);

  return null;
}

export function saveFallbackStateValue(value: unknown, storage: Storage): void {
  storage.setItem(APP_STORAGE_KEY, JSON.stringify(value));
}

export function readVaultFallbackMetadata(storage: Storage): VaultFallbackMetadata | null {
  const saved = storage.getItem(VAULT_FALLBACK_METADATA_KEY);
  if (!saved) return null;
  const parsed = JSON.parse(saved);
  if (!isRecord(parsed) || typeof parsed.vaultRootPath !== "string" || !parsed.vaultRootPath) return null;
  return {
    vaultRootPath: parsed.vaultRootPath,
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString()
  };
}

export function saveVaultFallbackMetadata(vaultRootPath: string, storage: Storage): VaultFallbackMetadata {
  const metadata = {
    vaultRootPath,
    updatedAt: new Date().toISOString()
  };
  storage.setItem(VAULT_FALLBACK_METADATA_KEY, JSON.stringify(metadata));
  return metadata;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
