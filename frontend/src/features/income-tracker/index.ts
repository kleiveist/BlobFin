import type { FeatureModule } from "../../app/contracts";

export const incomeTrackerFeature: FeatureModule = {
  id: "income-tracker",
  sections: ["income"]
};

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
