import type { FeatureModule } from "../../app/contracts";

export const combinedWealthFeature: FeatureModule = {
  id: "combined-wealth",
  sections: ["combined_wealth"]
};

export type { CombinedWealthDepotKey, CombinedWealthToggles, CombinedWealthYear } from "./model";
