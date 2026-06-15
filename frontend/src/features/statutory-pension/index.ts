import type { FeatureModule } from "../../app/contracts";

export const statutoryPensionFeature: FeatureModule = {
  id: "statutory-pension",
  sections: ["statutory_pension"]
};

export type {
  StatutoryPensionIncomeMode,
  StatutoryPensionScenarioId,
  StatutoryPensionScenarioSettings,
  StatutoryPensionSettings
} from "./model";
