import { parseVaultManifest } from "./vaultManifest";
import type { VaultManifest } from "./vaultTypes";

export function migrateVaultManifest(value: unknown): VaultManifest {
  return parseVaultManifest(value);
}
