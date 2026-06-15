import type { FeatureModule } from "../../app/contracts";

export const settingsFeature: FeatureModule = {
  id: "settings"
};

export type { AppUiState, PlanningSettings, ThemeMode } from "./model";
