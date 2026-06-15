import type { FeatureModule } from "../../app/contracts";

export const incomeStampPlannerFeature: FeatureModule = {
  id: "income-stamp-planner",
  sections: ["income_stamp_planner"]
};

export type { IncomePlanningPlannedStamp, IncomePlanningWeekScenarioId } from "./model";
