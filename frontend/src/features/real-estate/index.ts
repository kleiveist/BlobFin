import type { FeatureModule } from "../../app/contracts";

export const realEstateFeature: FeatureModule = {
  id: "real-estate",
  sections: ["real_estate_financing"]
};

export type {
  AdditionalRepaymentBreakdown,
  AdditionalRepaymentYearBreakdown,
  RealEstateFinancingResult,
  RealEstateFinancingSettings,
  RealEstateFinancingSourceSchedule,
  RealEstateFinancingYear,
  RealEstateLocale,
  RealEstatePaymentSourceKind,
  RepaymentSourceToggle,
  RepaymentSourceToggleKey,
  RepaymentSourceValues,
  SpecialRepaymentRhythm
} from "./model";
