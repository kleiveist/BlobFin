import type { AppState } from "../../types";
import type { VaultDataFileKey } from "../vault/vaultTypes";

interface AppStatePersistenceRegistration {
  defaultedBy: "defaultAppState";
  normalizedBy: "normalizeState";
  legacyNormalizedBy: "normalizeLegacyState";
  vaultFiles: VaultDataFileKey[];
  sidecars?: Array<{
    field: string;
    basePath: string;
    extension: ".canvas";
  }>;
}

export const APP_STATE_PERSISTENCE_REGISTRY = {
  theme: {
    defaultedBy: "defaultAppState",
    normalizedBy: "normalizeState",
    legacyNormalizedBy: "normalizeLegacyState",
    vaultFiles: ["settingsTheme"]
  },
  settings: {
    defaultedBy: "defaultAppState",
    normalizedBy: "normalizeState",
    legacyNormalizedBy: "normalizeLegacyState",
    vaultFiles: ["settingsBase"]
  },
  planningAccounts: {
    defaultedBy: "defaultAppState",
    normalizedBy: "normalizeState",
    legacyNormalizedBy: "normalizeLegacyState",
    vaultFiles: ["planningAccounts", "planningYearlyTables"]
  },
  ui: {
    defaultedBy: "defaultAppState",
    normalizedBy: "normalizeState",
    legacyNormalizedBy: "normalizeLegacyState",
    vaultFiles: ["settingsUi", "investmentSelections"]
  },
  realEstate: {
    defaultedBy: "defaultAppState",
    normalizedBy: "normalizeState",
    legacyNormalizedBy: "normalizeLegacyState",
    vaultFiles: ["realEstateFinancing", "realEstatePaymentSources", "realEstateScenarios"]
  },
  combinedWealth: {
    defaultedBy: "defaultAppState",
    normalizedBy: "normalizeState",
    legacyNormalizedBy: "normalizeLegacyState",
    vaultFiles: ["combinedWealth", "combinedWealthToggles"]
  },
  statutoryPension: {
    defaultedBy: "defaultAppState",
    normalizedBy: "normalizeState",
    legacyNormalizedBy: "normalizeLegacyState",
    vaultFiles: ["statutoryPension"]
  },
  incomeTracker: {
    defaultedBy: "defaultAppState",
    normalizedBy: "normalizeState",
    legacyNormalizedBy: "normalizeLegacyState",
    vaultFiles: ["incomeTracker", "incomeTaxRules", "incomeMilestones"]
  },
  incomePlanning: {
    defaultedBy: "defaultAppState",
    normalizedBy: "normalizeState",
    legacyNormalizedBy: "normalizeLegacyState",
    vaultFiles: ["incomePlanning", "timeHabits", "timeWeekScenarios", "timeStampPlanner"]
  },
  selfEmployment: {
    defaultedBy: "defaultAppState",
    normalizedBy: "normalizeState",
    legacyNormalizedBy: "normalizeLegacyState",
    vaultFiles: ["selfEmploymentState"],
    sidecars: [
      {
        field: "projects[].businessIdeaCanvasFile",
        basePath: "planning/projects/",
        extension: ".canvas"
      }
    ]
  },
  positions: {
    defaultedBy: "defaultAppState",
    normalizedBy: "normalizeState",
    legacyNormalizedBy: "normalizeLegacyState",
    vaultFiles: ["planningPositions", "planningYearlyTables"]
  },
  investmentByAccountId: {
    defaultedBy: "defaultAppState",
    normalizedBy: "normalizeState",
    legacyNormalizedBy: "normalizeLegacyState",
    vaultFiles: ["investmentDepots", "investmentAccountSettings"]
  },
  investment: {
    defaultedBy: "defaultAppState",
    normalizedBy: "normalizeState",
    legacyNormalizedBy: "normalizeLegacyState",
    vaultFiles: ["investmentAccountSettings", "investmentSelections"]
  },
  positionTableView: {
    defaultedBy: "defaultAppState",
    normalizedBy: "normalizeState",
    legacyNormalizedBy: "normalizeLegacyState",
    vaultFiles: ["planningTableViews"]
  }
} satisfies Record<keyof AppState, AppStatePersistenceRegistration>;
