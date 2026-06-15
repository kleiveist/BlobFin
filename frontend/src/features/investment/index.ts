import type { FeatureModule } from "../../app/contracts";

export const investmentFeature: FeatureModule = {
  id: "investment",
  sections: ["planning_scenarios"]
};

export type { AssetProjection, AssetProjectionPoint, InvestmentDepotKey, InvestmentResult, InvestmentSettings } from "./model";
