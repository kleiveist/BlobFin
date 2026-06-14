import type { AppState } from "../../types";
import { parseBusinessIdeaCanvasFile, serializeBusinessIdeaCanvas } from "../../domain/businessIdeaCanvas";
import { createVaultManifest, updateVaultManifestTimestamp } from "./vaultManifest";
import { migrateVaultManifest } from "./vaultMigration";
import { deserializeVaultState, serializeVaultState } from "./vaultSerializer";
import {
  VAULT_DATA_FILE_KEYS,
  VAULT_MANIFEST_FILENAME,
  VAULT_PROFILE_FOLDER,
  type VaultDataFiles,
  type VaultManifest,
  type VaultReadResult,
  type VaultSnapshotResult,
  type VaultWriteResult
} from "./vaultTypes";

export function isVaultRuntimeAvailable(): boolean {
  return Boolean((globalThis as { window?: { __TAURI_INTERNALS__?: unknown } }).window?.__TAURI_INTERNALS__);
}

export async function pickVaultDirectory(title: string): Promise<string | null> {
  if (!isVaultRuntimeAvailable()) return null;
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selectedPath = await open({
    title,
    directory: true,
    multiple: false,
    canCreateDirectories: true
  });
  return typeof selectedPath === "string" && selectedPath.length > 0 ? selectedPath : null;
}

export async function readVaultState(rootPath: string): Promise<AppState> {
  const result = await readVault(rootPath);
  return deserializeVaultState(result.dataFiles);
}

export async function readVault(rootPath: string): Promise<VaultReadResult> {
  const manifestContents = await readTextFile(manifestPath(rootPath));
  if (!manifestContents) {
    throw new Error("Im Vault fehlt .profil/blobfin.json.");
  }

  const manifest = migrateVaultManifest(parseJson(manifestContents, "blobfin.json"));
  const dataFiles: VaultDataFiles = {};

  for (const key of VAULT_DATA_FILE_KEYS) {
    const contents = await readTextFile(vaultDataFilePath(rootPath, manifest, key));
    if (!contents) continue;
    dataFiles[key] = parseJson(contents, manifest.dataFiles[key]);
  }
  dataFiles.selfEmploymentCanvasFiles = await readSelfEmploymentCanvasFiles(rootPath, dataFiles.selfEmploymentState);

  return { manifest, dataFiles };
}

export async function writeVaultState(rootPath: string, state: AppState): Promise<VaultWriteResult> {
  await ensureVaultStructure(rootPath);
  const existingManifest = await readExistingManifest(rootPath);
  const savedAt = new Date().toISOString();
  const manifest = updateVaultManifestTimestamp(existingManifest ?? createVaultManifest(savedAt), savedAt);
  const dataFiles = serializeVaultState(state);

  for (const key of VAULT_DATA_FILE_KEYS) {
    await writeJsonFile(vaultDataFilePath(rootPath, manifest, key), dataFiles[key] ?? null);
  }
  for (const project of state.selfEmployment.projects) {
    await writeJsonFile(
      joinVaultPath(profilePath(rootPath), project.businessIdeaCanvasFile),
      serializeBusinessIdeaCanvas(project.businessIdeaCanvas)
    );
  }
  await writeJsonFile(manifestPath(rootPath), manifest);

  return { manifest, savedAt };
}

export async function createVaultSnapshot(rootPath: string): Promise<VaultSnapshotResult> {
  const { manifest } = await readVault(rootPath);
  const createdAt = new Date().toISOString();
  const backupPath = joinVaultPath(profilePath(rootPath), "backups", timestampFolderName(createdAt));
  await createDirAll(backupPath);
  await copyTextFileIfExists(manifestPath(rootPath), joinVaultPath(backupPath, VAULT_MANIFEST_FILENAME));

  for (const key of VAULT_DATA_FILE_KEYS) {
    await copyTextFileIfExists(
      vaultDataFilePath(rootPath, manifest, key),
      joinVaultPath(backupPath, manifest.dataFiles[key])
    );
  }
  const dataFiles = await readVault(rootPath);
  const canvasFiles = dataFiles.dataFiles.selfEmploymentCanvasFiles ?? {};
  for (const relativePath of Object.keys(canvasFiles)) {
    await copyTextFileIfExists(
      joinVaultPath(profilePath(rootPath), relativePath),
      joinVaultPath(backupPath, relativePath)
    );
  }

  return { backupPath, createdAt };
}

export function profilePath(rootPath: string): string {
  return joinVaultPath(rootPath, VAULT_PROFILE_FOLDER);
}

export function manifestPath(rootPath: string): string {
  return joinVaultPath(profilePath(rootPath), VAULT_MANIFEST_FILENAME);
}

export function joinVaultPath(basePath: string, ...segments: string[]): string {
  const separator = basePath.includes("\\") && !basePath.includes("/") ? "\\" : "/";
  const cleanedBase = basePath.replace(/[\\/]+$/, "");
  const cleanedSegments = segments
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.replace(/^[\\/]+|[\\/]+$/g, ""));
  return [cleanedBase, ...cleanedSegments].join(separator);
}

async function ensureVaultStructure(rootPath: string): Promise<void> {
  await createDirAll(profilePath(rootPath));
  const directories = new Set<string>(["backups"]);
  for (const relativePath of Object.values(createVaultManifest().dataFiles)) {
    const slashIndex = Math.max(relativePath.lastIndexOf("/"), relativePath.lastIndexOf("\\"));
    if (slashIndex > 0) directories.add(relativePath.slice(0, slashIndex));
  }
  for (const directory of directories) {
    await createDirAll(joinVaultPath(profilePath(rootPath), directory));
  }
}

async function readExistingManifest(rootPath: string): Promise<VaultManifest | null> {
  const contents = await readTextFile(manifestPath(rootPath));
  if (!contents) return null;
  try {
    return migrateVaultManifest(parseJson(contents, "blobfin.json"));
  } catch (error) {
    console.warn("Existing Vault manifest could not be reused; a new manifest will be written.", error);
    return null;
  }
}

async function readSelfEmploymentCanvasFiles(
  rootPath: string,
  selfEmploymentState: unknown
): Promise<Record<string, unknown>> {
  if (!isRecord(selfEmploymentState) || !Array.isArray(selfEmploymentState.projects)) return {};
  const canvasFiles: Record<string, unknown> = {};
  for (const project of selfEmploymentState.projects) {
    if (!isRecord(project) || typeof project.businessIdeaCanvasFile !== "string") continue;
    const relativePath = project.businessIdeaCanvasFile;
    if (!isSafeRelativeCanvasPath(relativePath)) continue;
    const contents = await readTextFile(joinVaultPath(profilePath(rootPath), relativePath));
    if (!contents) continue;
    canvasFiles[relativePath] = parseBusinessIdeaCanvasFile(parseJson(contents, relativePath), relativePath);
  }
  return canvasFiles;
}

function vaultDataFilePath(rootPath: string, manifest: VaultManifest, key: keyof VaultManifest["dataFiles"]): string {
  return joinVaultPath(profilePath(rootPath), manifest.dataFiles[key]);
}

async function copyTextFileIfExists(sourcePath: string, targetPath: string): Promise<void> {
  const contents = await readTextFile(sourcePath);
  if (contents === null) return;
  await writeTextFile(targetPath, contents);
}

function parseJson(contents: string, label: string): unknown {
  try {
    return JSON.parse(contents);
  } catch (error) {
    throw new Error(`${label} enthaelt ungueltiges JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function readTextFile(path: string): Promise<string | null> {
  return await invokeCommand<string | null>("vault_read_text_file", { path });
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await writeTextFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeTextFile(path: string, contents: string): Promise<void> {
  await invokeCommand("vault_write_text_file", { path, contents });
}

async function createDirAll(path: string): Promise<void> {
  await invokeCommand("vault_create_dir_all", { path });
}

async function invokeCommand<T = void>(command: string, args: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<T>(command, args);
}

function timestampFolderName(value: string): string {
  return value.replace(/[:.]/g, "-").replace("T", "_").replace("Z", "");
}

function isSafeRelativeCanvasPath(value: string): boolean {
  return (
    value.endsWith(".canvas") &&
    value.startsWith("planning/projects/") &&
    !value.startsWith("/") &&
    !value.startsWith("\\") &&
    !value.includes("..")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
