import type { AppState } from "../../types";

export const VAULT_APP_NAME = "BlobFin";
export const VAULT_VERSION = 1;
export const VAULT_PROFILE_FOLDER = ".profil";
export const VAULT_MANIFEST_FILENAME = "blobfin.json";

export type VaultStatus = "disconnected" | "connected" | "error" | "csvOnly";

export type VaultDataFileKey =
  | "settingsBase"
  | "settingsUi"
  | "settingsTheme"
  | "incomeTracker"
  | "incomeTaxRules"
  | "incomeMilestones"
  | "planningAccounts"
  | "planningPositions"
  | "planningYearlyTables"
  | "planningTableViews"
  | "investmentDepots"
  | "investmentAccountSettings"
  | "investmentSelections"
  | "realEstateFinancing"
  | "realEstatePaymentSources"
  | "realEstateScenarios"
  | "statutoryPension"
  | "combinedWealth"
  | "combinedWealthToggles"
  | "incomePlanning"
  | "timeHabits"
  | "timeWeekScenarios"
  | "timeStampPlanner"
  | "selfEmploymentState";

export interface VaultDataFiles extends Partial<Record<VaultDataFileKey, unknown>> {
  selfEmploymentCanvasFiles?: Record<string, unknown>;
  selfEmploymentProjectFiles?: Record<string, Record<string, unknown>>;
}

export interface VaultManifest {
  app: typeof VAULT_APP_NAME;
  vaultVersion: typeof VAULT_VERSION;
  createdAt: string;
  updatedAt: string;
  profileFolder: typeof VAULT_PROFILE_FOLDER;
  dataFiles: Record<VaultDataFileKey, string>;
}

export interface VaultRuntimeState {
  status: VaultStatus;
  vaultRootPath: string | null;
  profilePath: string | null;
  lastSavedAt: string | null;
  lastError: string | null;
  pendingWrites: number;
}

export interface VaultReadResult {
  manifest: VaultManifest;
  dataFiles: VaultDataFiles;
}

export interface VaultWriteResult {
  manifest: VaultManifest;
  savedAt: string;
}

export interface VaultSnapshotResult {
  backupPath: string;
  createdAt: string;
}

export interface VaultStorageAdapter {
  readState(rootPath: string): Promise<AppState>;
  writeState(rootPath: string, state: AppState): Promise<VaultWriteResult>;
  snapshot(rootPath: string): Promise<VaultSnapshotResult>;
}

export const VAULT_DATA_FILE_PATHS: Record<VaultDataFileKey, string> = {
  settingsBase: "settings/base.json",
  settingsUi: "settings/ui.json",
  settingsTheme: "settings/theme.json",
  incomeTracker: "income/tracker.json",
  incomeTaxRules: "income/tax-rules.json",
  incomeMilestones: "income/milestones.json",
  planningAccounts: "planning/accounts.json",
  planningPositions: "planning/positions.json",
  planningYearlyTables: "planning/yearly-tables.json",
  planningTableViews: "planning/table-views.json",
  investmentDepots: "investment/depots.json",
  investmentAccountSettings: "investment/account-settings.json",
  investmentSelections: "investment/selections.json",
  realEstateFinancing: "real-estate/financing.json",
  realEstatePaymentSources: "real-estate/payment-sources.json",
  realEstateScenarios: "real-estate/scenarios.json",
  statutoryPension: "pension/statutory-pension.json",
  combinedWealth: "combined-wealth/settings.json",
  combinedWealthToggles: "combined-wealth/toggles.json",
  incomePlanning: "time/income-planning.json",
  timeHabits: "time/habits.json",
  timeWeekScenarios: "time/week-scenarios.json",
  timeStampPlanner: "time/stamp-planner.json",
  selfEmploymentState: "self-employment/state.json"
};

export const VAULT_DATA_FILE_KEYS = Object.keys(VAULT_DATA_FILE_PATHS) as VaultDataFileKey[];
