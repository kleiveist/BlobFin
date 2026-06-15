import type { FeatureModule } from "../../app/contracts";
import {
  closeIncomePlanningOverlays,
  onIncomePlanningChange,
  onIncomePlanningClick,
  onIncomePlanningInput,
  onIncomePlanningPointerDown,
  onIncomePlanningWindowKeyDown,
  onIncomePlanningWindowPointerMove,
  onIncomePlanningWindowPointerUp
} from "./events";

export const incomePlanningFeature: FeatureModule = {
  id: "income-planning",
  sections: ["income_planning"],
  onInput: onIncomePlanningInput,
  onChange: onIncomePlanningChange,
  onClick: onIncomePlanningClick,
  onPointerDown: onIncomePlanningPointerDown,
  onWindowPointerMove: onIncomePlanningWindowPointerMove,
  onWindowPointerUp: onIncomePlanningWindowPointerUp,
  onWindowKeyDown: onIncomePlanningWindowKeyDown,
  closeOverlays: closeIncomePlanningOverlays
};

export {
  closeIncomePlanningDialog,
  closeIncomeStampPlannerDialog,
  configureIncomePlanningHost,
  incomePlanningModelForActiveWeek,
  renderIncomePlanning,
  renderIncomeStampPlanner,
  startIncomePlanningCurrentTimeTicker
} from "./controller";

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
