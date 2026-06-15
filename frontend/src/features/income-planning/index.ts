import type { FeatureModule } from "../../app/contracts";

export const incomePlanningFeature: FeatureModule = {
  id: "income-planning",
  sections: ["income_planning"]
};

export type {
  IncomePlanningAssumptions,
  IncomePlanningCalendarStamp,
  IncomePlanningCategory,
  IncomePlanningHabit,
  IncomePlanningManualBlock,
  IncomePlanningManualBlockType,
  IncomePlanningPlannedStamp,
  IncomePlanningPriority,
  IncomePlanningSleepSlot,
  IncomePlanningSlot,
  IncomePlanningState,
  IncomePlanningWeekScenario,
  IncomePlanningWeekScenarioId,
  IncomePlanningWeekday,
  IncomePlanningWorkBlock
} from "./model";
