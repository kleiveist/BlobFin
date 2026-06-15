import type { FeatureModule } from "../../app/contracts";

export const positionsFeature: FeatureModule = {
  id: "positions",
  sections: ["planning_scenarios"]
};

export type {
  ExpensePositionType,
  IncomePositionType,
  PayoutType,
  PositionCostBreakdownItem,
  PositionFlow,
  PositionTableFilter,
  PositionTableMode,
  PositionTableSort,
  PositionTableView,
  PositionTableViewState,
  PositionType,
  ReservePosition
} from "./model";
