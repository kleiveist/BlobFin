import {
  VAULT_APP_NAME,
  VAULT_DATA_FILE_PATHS,
  VAULT_PROFILE_FOLDER,
  VAULT_VERSION,
  type VaultDataFileKey,
  type VaultManifest
} from "./vaultTypes";

export function createVaultManifest(createdAt = new Date().toISOString()): VaultManifest {
  return {
    app: VAULT_APP_NAME,
    vaultVersion: VAULT_VERSION,
    createdAt,
    updatedAt: createdAt,
    profileFolder: VAULT_PROFILE_FOLDER,
    dataFiles: { ...VAULT_DATA_FILE_PATHS }
  };
}

export function updateVaultManifestTimestamp(manifest: VaultManifest, updatedAt = new Date().toISOString()): VaultManifest {
  return {
    ...manifest,
    updatedAt,
    dataFiles: { ...VAULT_DATA_FILE_PATHS, ...manifest.dataFiles }
  };
}

export function parseVaultManifest(value: unknown): VaultManifest {
  if (!isRecord(value)) {
    throw new Error("blobfin.json ist keine gueltige Manifest-Datei.");
  }
  if (value.app !== VAULT_APP_NAME) {
    throw new Error("blobfin.json gehoert nicht zu BlobFin.");
  }
  if (value.profileFolder !== VAULT_PROFILE_FOLDER) {
    throw new Error("blobfin.json verweist auf einen unerwarteten Profilordner.");
  }
  if (value.vaultVersion !== VAULT_VERSION) {
    throw new Error(`Vault-Version ${String(value.vaultVersion)} wird nicht unterstuetzt.`);
  }

  const dataFiles = isRecord(value.dataFiles) ? value.dataFiles : {};
  return {
    app: VAULT_APP_NAME,
    vaultVersion: VAULT_VERSION,
    createdAt: stringOrNow(value.createdAt),
    updatedAt: stringOrNow(value.updatedAt),
    profileFolder: VAULT_PROFILE_FOLDER,
    dataFiles: {
      ...VAULT_DATA_FILE_PATHS,
      ...(dataFiles as Partial<Record<VaultDataFileKey, string>>)
    }
  };
}

function stringOrNow(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? value : new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
