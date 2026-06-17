import type { FeatureModule } from "../../app/contracts";

export const incomeStampPlannerFeature: FeatureModule = {
  id: "income-stamp-planner",
  sections: []
};

export type { IncomePlanningPlannedStamp, IncomePlanningWeekScenarioId } from "./model";
