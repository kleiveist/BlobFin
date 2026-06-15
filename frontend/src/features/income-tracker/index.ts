import type { FeatureModule } from "../../app/contracts";
import {
  closeIncomeTrackerOverlays,
  onIncomeTrackerChange,
  onIncomeTrackerClick,
  onIncomeTrackerInput,
  onIncomeTrackerWindowKeyDown
} from "./events";

export const incomeTrackerFeature: FeatureModule = {
  id: "income-tracker",
  sections: ["income"],
  onInput: onIncomeTrackerInput,
  onChange: onIncomeTrackerChange,
  onClick: onIncomeTrackerClick,
  onWindowKeyDown: onIncomeTrackerWindowKeyDown,
  closeOverlays: closeIncomeTrackerOverlays
};

export {
  configureIncomeTrackerHost,
  exportIncomeCsv,
  exportIncomePdf,
  exportIncomePlanningCsvFile,
  importIncomeCsvFromFile,
  importIncomePlanningCsvFromFile,
  renderIncomeTracker,
  sanitizeIncomeYearEntriesWithTaxRules
} from "./controller";

export type {
  CareerMilestone,
  CareerMilestoneImpact,
  IncomeEmploymentContext,
  IncomeMinijobType,
  IncomePerson,
  IncomeProjectionMode,
  IncomeResolvedSource,
  IncomeStudentEmploymentMode,
  IncomeTaxAdjustment,
  IncomeTaxAdjustmentType,
  IncomeTaxDeductionField,
  IncomeTaxDeductionItems,
  IncomeTrackerSettings,
  IncomeTrackerState,
  IncomeYearEntry,
  IncomeYearEntrySource
} from "./model";
