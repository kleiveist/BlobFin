import type { FeatureModule } from "../../app/contracts";

export const planningFeature: FeatureModule = {
  id: "planning",
  sections: ["planning_scenarios"]
};

export type { PlanningAccount, PlanningAccountType, PlanningSettings, PlanningYearSelection } from "./model";
