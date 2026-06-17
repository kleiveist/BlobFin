import type { FeatureModule } from "../app/contracts";
import { combinedWealthFeature } from "./combined-wealth";
import { incomePlanningFeature } from "./income-planning";
import { incomeTrackerFeature } from "./income-tracker";
import { investmentFeature } from "./investment";
import { planningFeature } from "./planning";
import { positionsFeature } from "./positions";
import { realEstateFeature } from "./real-estate";
import { selfEmploymentFeature } from "./self-employment";
import { businessCanvasFeature } from "./self-employment/business-canvas";
import { settingsFeature } from "./settings";
import { statutoryPensionFeature } from "./statutory-pension";

export const featureModules: readonly FeatureModule[] = [
  settingsFeature,
  planningFeature,
  positionsFeature,
  investmentFeature,
  incomeTrackerFeature,
  incomePlanningFeature,
  selfEmploymentFeature,
  businessCanvasFeature,
  realEstateFeature,
  statutoryPensionFeature,
  combinedWealthFeature
];
