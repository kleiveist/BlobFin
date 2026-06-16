Markdown-Scan – Root: /home/kleif/Projects/BlobFin/frontend/src
Erzeugt: 2026-06-16T14:52:25
Einstellungen: content=snippet, snippet_chars=800, toc_depth=3, types=.css, .ts, .tsx, .json

=== Dateien ===

📁 .
  📝 main.ts
     Pfad: 📝 main.ts
     Größe: 1.94 KB (1991 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 42, Wörter: 254, Zeichen: 1991
     Inhalt (Auszug): renderBootstrapStatus("JavaScript gestartet", "App-Module werden geladen.");

  📝 types.ts
     Pfad: 📝 types.ts
     Größe: 26.03 KB (26651 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 952, Wörter: 1882, Zeichen: 26651
     Inhalt (Auszug): export type PositionFlow = "income" | "expense"; export type ExpensePositionType = "fixed" | "reserve" | "temporary" | "savings"; export type IncomePositionType = "incomeMonthly" | "incomeYearly" | "incomeTemporary"; export type PositionType = ExpensePositionType | IncomePositionType; export type PayoutType = "none" | "monthly" | "yearly" | "once"; export type PlanningYearSelection = number | null; export type ThemeMode = "light" | "dark"; export type InvestmentDepotKey = "standard" | "retirement" | "child"; export type CombinedWealthDepotKey = InvestmentDepotKey; export type PositionTableMode = PositionFlow | "reserve" | "savings"; export type AppSectionId = | "home" | "income" | "income_planning" | "income_stamp_planner" | "self_employment_dashboard" | "planning_scenarios" | "real_estate …

  📝 vite-env.d.ts
     Pfad: 📝 vite-env.d.ts
     Größe: 38 B (38 B)
     Geändert: 2026-05-26T11:38:31
     Überschriften: 0, Zeilen: 1, Wörter: 4, Zeichen: 38
     Inhalt (Auszug): /// <reference types="vite/client" />


📁 api
  📝 backendClient.ts
     Pfad: 📁 api / 📝 backendClient.ts
     Größe: 975 B (975 B)
     Geändert: 2026-05-26T11:38:31
     Überschriften: 0, Zeilen: 29, Wörter: 110, Zeichen: 975
     Inhalt (Auszug): const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";


📁 app
  📝 appController.ts
     Pfad: 📁 app / 📝 appController.ts
     Größe: 315 B (315 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 6, Wörter: 27, Zeichen: 315
     Inhalt (Auszug): import type { AppContext, FeatureModule } from "./contracts"; import { startAppController as startControllerRuntime } from "./controllerRuntime";

  📝 bootstrap.ts
     Pfad: 📁 app / 📝 bootstrap.ts
     Größe: 1.03 KB (1054 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 33, Wörter: 93, Zeichen: 1054
     Inhalt (Auszug): import type { AppContext } from "./contracts"; import { startAppController } from "./appController"; import { featureModules } from "../features"; import { createAppRouter } from "./router"; import { createRenderScheduler } from "./renderScheduler"; import { createAppStore } from "./store/appStore";

  📝 contracts.ts
     Pfad: 📁 app / 📝 contracts.ts
     Größe: 2.20 KB (2249 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 61, Wörter: 208, Zeichen: 2249
     Inhalt (Auszug): import type { AppSectionId, AppState } from "../types";

  📝 controllerRuntime.ts
     Pfad: 📁 app / 📝 controllerRuntime.ts
     Größe: 322 B (322 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 6, Wörter: 29, Zeichen: 322
     Inhalt (Auszug): import type { AppContext, FeatureModule } from "./contracts"; import { startAppController as startRuntimeFeatureHost } from "../features/runtime-host";

  📝 events.ts
     Pfad: 📁 app / 📝 events.ts
     Größe: 3.09 KB (3162 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 79, Wörter: 294, Zeichen: 3162
     Inhalt (Auszug): import type { AppContext, FeatureModule } from "./contracts";

  📝 renderScheduler.ts
     Pfad: 📁 app / 📝 renderScheduler.ts
     Größe: 1.23 KB (1259 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 57, Wörter: 104, Zeichen: 1259
     Inhalt (Auszug): import type { RenderScheduler } from "./contracts";

  📝 router.ts
     Pfad: 📁 app / 📝 router.ts
     Größe: 3.12 KB (3193 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 87, Wörter: 244, Zeichen: 3193
     Inhalt (Auszug): import type { AppRouteListener, AppRouter } from "./contracts"; import type { AppSectionId } from "../types";

  📝 shell.ts
     Pfad: 📁 app / 📝 shell.ts
     Größe: 148 B (148 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 5, Wörter: 14, Zeichen: 148
     Inhalt (Auszug): import { renderAppShell } from "../views/templates";


📁 app/store
  📝 actions.ts
     Pfad: 📁 app / 📁 store / 📝 actions.ts
     Größe: 231 B (231 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 7, Wörter: 22, Zeichen: 231
     Inhalt (Auszug): import type { AppState } from "../../types";

  📝 appStore.ts
     Pfad: 📁 app / 📁 store / 📝 appStore.ts
     Größe: 1.17 KB (1195 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 42, Wörter: 102, Zeichen: 1195
     Inhalt (Auszug): import { defaultAppState } from "../../data/defaults"; import type { AppStateListener, AppStore, AppStoreWriteOptions } from "../contracts"; import type { AppState } from "../../types"; import { persistAppState } from "./persistence";

  📝 migrations.ts
     Pfad: 📁 app / 📁 store / 📝 migrations.ts
     Größe: 204 B (204 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 6, Wörter: 19, Zeichen: 204
     Inhalt (Auszug): import { normalizeStoredState } from "../../lib/storage"; import type { AppState } from "../../types";

  📝 persistence.ts
     Pfad: 📁 app / 📁 store / 📝 persistence.ts
     Größe: 291 B (291 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 10, Wörter: 27, Zeichen: 291
     Inhalt (Auszug): import { initializeStorage, saveState } from "../../lib/storage"; import type { AppState } from "../../types";

  📝 selectors.ts
     Pfad: 📁 app / 📁 store / 📝 selectors.ts
     Größe: 259 B (259 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 9, Wörter: 26, Zeichen: 259
     Inhalt (Auszug): import type { AppSectionId, AppState, AppUiState } from "../../types";


📁 data
  📝 defaults.ts
     Pfad: 📁 data / 📝 defaults.ts
     Größe: 15.06 KB (15422 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 538, Wörter: 1054, Zeichen: 15422
     Inhalt (Auszug): import type { AppState, AppUiState, CombinedWealthToggles, IncomePlanningState, IncomeTrackerState, InvestmentSettings, PlanningAccount, PlanningSettings, PositionTableViewState, RealEstateFinancingSettings, RepaymentSourceToggle, ReservePosition, SelfEmploymentState, StatutoryPensionSettings } from "../types"; import { buildDefaultIncomePlanningSleepSlots, buildIncomePlanningHabit, buildIncomePlanningManualBlock, buildIncomePlanningWorkBlock, incomePlanningAverageSleepHours } from "../domain/incomePlanning"; import { defaultBusinessIdeaCanvasForProject } from "../domain/businessIdeaCanvas"; import { defaultSelfEmploymentGanttPlan } from "../domain/selfEmploymentGantt";


📁 domain
  📝 assetProjection.ts
     Pfad: 📁 domain / 📝 assetProjection.ts
     Größe: 21.68 KB (22202 B)
     Geändert: 2026-06-15T06:25:48
     Überschriften: 0, Zeilen: 643, Wörter: 1605, Zeichen: 22202
     Inhalt (Auszug): import { annuityPayment } from "./investmentCalculator"; import { selectedInvestmentContributionForProjectionMonth, selectedRecurringInvestmentContributionForProjectionYear, selectedOneTimeInvestmentContributionForProjectionMonth, selectedInvestmentStartYear } from "./investmentContributions"; import { calculateRetirementDepotAllowance, RETIREMENT_DEPOT_MIN_AGE, retirementDepotAllowanceForProjectionMonth } from "./retirementDepot"; import type { AssetProjection, AssetProjectionPoint, InvestmentSettings, ReservePosition } from "../types";

  📝 businessIdeaCanvas.ts
     Pfad: 📁 domain / 📝 businessIdeaCanvas.ts
     Größe: 28.77 KB (29458 B)
     Geändert: 2026-06-15T06:31:10
     Überschriften: 0, Zeilen: 774, Wörter: 3001, Zeichen: 29458
     Inhalt (Auszug): import type { BusinessIdeaCanvas, BusinessIdeaCanvasEdgeDirection, BusinessIdeaCanvasGroupMeta, BusinessIdeaCanvasGrid, BusinessIdeaCanvasLabel, BusinessIdeaCanvasMeta, BusinessIdeaCanvasNodeMeta, BusinessIdeaCanvasPaletteColor, BusinessIdeaCanvasPhase, BusinessIdeaCanvasShape, BusinessIdeaCanvasViewport, JsonCanvasEdge, JsonCanvasEnd, JsonCanvasNode, JsonCanvasSide } from "../types";

  📝 combinedWealth.ts
     Pfad: 📁 domain / 📝 combinedWealth.ts
     Größe: 14.12 KB (14462 B)
     Geändert: 2026-06-08T06:22:01
     Überschriften: 0, Zeilen: 357, Wörter: 1140, Zeichen: 14462
     Inhalt (Auszug): import type { AssetProjection, CombinedWealthDepotKey, CombinedWealthToggles, CombinedWealthYear, RealEstateFinancingYear } from "../types";

  📝 incomeAnalysis.ts
     Pfad: 📁 domain / 📝 incomeAnalysis.ts
     Größe: 6.28 KB (6431 B)
     Geändert: 2026-06-02T10:38:56
     Überschriften: 0, Zeilen: 199, Wörter: 559, Zeichen: 6431
     Inhalt (Auszug): import type { IncomePerson, IncomeResolvedSource, IncomeYearEntry } from "../types"; import { incomeTaxDeductionItemsSocialTotal, incomeYearEntryNetIncome, incomeYearEntryTaxDeductions, incomeYearEntryTaxTotal } from "./incomeTracker";

  📝 incomeLabels.ts
     Pfad: 📁 domain / 📝 incomeLabels.ts
     Größe: 2.92 KB (2988 B)
     Geändert: 2026-06-08T06:22:01
     Überschriften: 0, Zeilen: 31, Wörter: 272, Zeichen: 2987
     Inhalt (Auszug): export interface IncomeYearLabelOption { id: string; label: string; icon: string; description: string; }

  📝 incomePlanning.ts
     Pfad: 📁 domain / 📝 incomePlanning.ts
     Größe: 32.31 KB (33085 B)
     Geändert: 2026-06-15T06:25:48
     Überschriften: 0, Zeilen: 909, Wörter: 2809, Zeichen: 33085
     Inhalt (Auszug): import { INCOME_YEAR_LABEL_OPTIONS } from "./incomeLabels"; import type { IncomePlanningAssumptions, IncomePlanningCategory, IncomePlanningHabit, IncomePlanningHabitChange, IncomePlanningHabitDurationUnit, IncomePlanningHabitStatus, IncomePlanningHabitType, IncomePlanningManualBlock, IncomePlanningManualBlockType, IncomePlanningPriority, IncomePlanningSleepSlot, IncomePlanningSlot, IncomePlanningState, IncomePlanningWeekScenario, IncomePlanningWeekScenarioId, IncomePlanningWeekday, IncomePlanningWorkBlock } from "../types";

  📝 incomeTaxRules.ts
     Pfad: 📁 domain / 📝 incomeTaxRules.ts
     Größe: 12.22 KB (12517 B)
     Geändert: 2026-06-08T06:22:01
     Überschriften: 0, Zeilen: 372, Wörter: 851, Zeichen: 12513
     Inhalt (Auszug): import type { IncomeEmploymentContext, IncomeMinijobType, IncomeStudentEmploymentMode } from "../types";

  📝 incomeTracker.ts
     Pfad: 📁 domain / 📝 incomeTracker.ts
     Größe: 21.00 KB (21508 B)
     Geändert: 2026-06-02T08:11:29
     Überschriften: 0, Zeilen: 592, Wörter: 1773, Zeichen: 21508
     Inhalt (Auszug): import type { CareerMilestone, IncomeResolvedSource, IncomeTaxDeductionField, IncomeTaxDeductionItems, IncomeTaxAdjustment, IncomeTrackerState, IncomeYearEntry } from "../types"; import { isCapitalGainsTaxRuleLabel } from "./incomeTaxRules";

  📝 investmentCalculator.ts
     Pfad: 📁 domain / 📝 investmentCalculator.ts
     Größe: 3.62 KB (3711 B)
     Geändert: 2026-06-15T06:25:48
     Überschriften: 0, Zeilen: 91, Wörter: 304, Zeichen: 3711
     Inhalt (Auszug): import { selectedInvestmentContributionForProjectionMonth, selectedInvestmentStartYear, selectedMonthlyPattern } from "./investmentContributions"; import { RETIREMENT_DEPOT_MIN_AGE, retirementDepotAllowanceForProjectionMonth } from "./retirementDepot"; import type { InvestmentResult, InvestmentSettings, ReservePosition } from "../types";

  📝 investmentContributions.ts
     Pfad: 📁 domain / 📝 investmentContributions.ts
     Größe: 7.13 KB (7306 B)
     Geändert: 2026-06-15T06:25:48
     Überschriften: 0, Zeilen: 202, Wörter: 600, Zeichen: 7306
     Inhalt (Auszug): import { positionFlow } from "../lib/positionKinds"; import type { InvestmentSettings, ReservePosition } from "../types";

  📝 realEstateCalculator.ts
     Pfad: 📁 domain / 📝 realEstateCalculator.ts
     Größe: 16.30 KB (16696 B)
     Geändert: 2026-05-28T06:40:57
     Überschriften: 0, Zeilen: 390, Wörter: 1225, Zeichen: 16696
     Inhalt (Auszug): import type { AdditionalRepaymentYearBreakdown, RealEstateFinancingMonth, RealEstateFinancingResult, RealEstateFinancingSettings, RealEstateFinancingSourceSchedule, RealEstateFinancingYear, } from "../types";

  📝 reserveCalculator.ts
     Pfad: 📁 domain / 📝 reserveCalculator.ts
     Größe: 13.58 KB (13908 B)
     Geändert: 2026-06-11T08:48:49
     Überschriften: 0, Zeilen: 349, Wörter: 1282, Zeichen: 13908
     Inhalt (Auszug): import { MONTHS } from "../data/defaults"; import { isExpensePosition, isIncomePosition } from "../lib/positionKinds"; import type { MonthlyReserveRow, PlanningSettings, ReservePosition, ReserveSummary } from "../types";

  📝 retirementDepot.ts
     Pfad: 📁 domain / 📝 retirementDepot.ts
     Größe: 3.13 KB (3210 B)
     Geändert: 2026-06-15T06:25:48
     Überschriften: 0, Zeilen: 90, Wörter: 207, Zeichen: 3210
     Inhalt (Auszug): import { selectedInvestmentContributionForProjectionMonth, selectedInvestmentContributionForProjectionYear } from "./investmentContributions"; import type { InvestmentSettings, ReservePosition } from "../types";

  📝 selfEmploymentGantt.ts
     Pfad: 📁 domain / 📝 selfEmploymentGantt.ts
     Größe: 12.71 KB (13020 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 329, Wörter: 1133, Zeichen: 13020
     Inhalt (Auszug): import { businessIdeaCanvasCardNodes, businessIdeaCanvasNodeText } from "./businessIdeaCanvas"; import type { BusinessIdeaCanvas, BusinessIdeaCanvasLabel, BusinessIdeaCanvasMeta, BusinessIdeaCanvasPhase, JsonCanvasNode, SelfEmploymentGanttCardPlan, SelfEmploymentGanttPhase, SelfEmploymentGanttPlan, SelfEmploymentGanttStartMode, SelfEmploymentProject } from "../types";

  📝 statutoryPension.ts
     Pfad: 📁 domain / 📝 statutoryPension.ts
     Größe: 21.01 KB (21514 B)
     Geändert: 2026-06-15T06:25:48
     Überschriften: 0, Zeilen: 550, Wörter: 1503, Zeichen: 21514
     Inhalt (Auszug): import type { IncomeTrackerState, IncomeYearEntry, StatutoryPensionScenarioId, StatutoryPensionScenarioSettings, StatutoryPensionSettings } from "../types"; import { buildIncomeTrackerModel } from "./incomeTracker"; import { isCapitalGainsTaxRuleLabel } from "./incomeTaxRules";


📁 features
  📝 index.ts
     Pfad: 📁 features / 📝 index.ts
     Größe: 1.05 KB (1077 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 28, Wörter: 82, Zeichen: 1077
     Inhalt (Auszug): import type { FeatureModule } from "../app/contracts"; import { combinedWealthFeature } from "./combined-wealth"; import { incomePlanningFeature } from "./income-planning"; import { incomeStampPlannerFeature } from "./income-stamp-planner"; import { incomeTrackerFeature } from "./income-tracker"; import { investmentFeature } from "./investment"; import { planningFeature } from "./planning"; import { positionsFeature } from "./positions"; import { realEstateFeature } from "./real-estate"; import { selfEmploymentFeature } from "./self-employment"; import { businessCanvasFeature } from "./self-employment/business-canvas"; import { settingsFeature } from "./settings"; import { statutoryPensionFeature } from "./statutory-pension";


📁 features/combined-wealth
  📝 config.ts
     Pfad: 📁 features / 📁 combined-wealth / 📝 config.ts
     Größe: 282 B (282 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 7, Wörter: 25, Zeichen: 282
     Inhalt (Auszug): import type { CombinedWealthDepotKey } from "./model";

  📝 index.ts
     Pfad: 📁 features / 📁 combined-wealth / 📝 index.ts
     Größe: 272 B (272 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 8, Wörter: 22, Zeichen: 272
     Inhalt (Auszug): import type { FeatureModule } from "../../app/contracts";

  📝 model.ts
     Pfad: 📁 features / 📁 combined-wealth / 📝 model.ts
     Größe: 102 B (102 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 1, Wörter: 7, Zeichen: 102
     Inhalt (Auszug): export type { CombinedWealthDepotKey, CombinedWealthToggles, CombinedWealthYear } from "../../types";

  📝 styles.css
     Pfad: 📁 features / 📁 combined-wealth / 📝 styles.css
     Größe: 19.55 KB (20016 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 1050, Wörter: 2666, Zeichen: 20016
     Inhalt (Auszug): .combined-toggle-grid { display: grid; gap: 10px; }


📁 features/income-planning
  📝 actions.ts
     Pfad: 📁 features / 📁 income-planning / 📝 actions.ts
     Größe: 1.53 KB (1571 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 46, Wörter: 47, Zeichen: 1571
     Inhalt (Auszug): export { addIncomePlanningDialogSleepSlot, closeIncomePlanningDialog, closeIncomePlanningWeekScenarioDialog, closeIncomeStampPlannerDialog, deleteIncomePlanningDialogSlot, deleteIncomePlanningStamp, deleteIncomeStampPlannerStamp, hideIncomePlanningHabitIconPicker, hideIncomePlanningStampMenu, hideIncomePlanningStampPicker, openIncomePlanningDialog, openIncomePlanningDialogFromCalendar, openIncomePlanningStampMenu, openIncomePlanningStampPickerForEdit, openIncomePlanningStampPickerFromCalendar, openIncomePlanningWeekScenarioDialog, openIncomeStampPlannerDialogForDate, openIncomeStampPlannerDialogForEdit, removeIncomePlanningDialogSleepSlot, removeIncomePlanningHabit, removeIncomePlanningManualBlock, removeIncomePlanningSlot, removeIncomePlanningWorkBlock, saveIncomePlanningDialog, saveIncom …

  📝 calendarDragController.ts
     Pfad: 📁 features / 📁 income-planning / 📝 calendarDragController.ts
     Größe: 30.45 KB (31179 B)
     Geändert: 2026-06-16T08:38:22
     Überschriften: 0, Zeilen: 674, Wörter: 2450, Zeichen: 31179
     Inhalt (Auszug): import { incomePlanningAverageSleepHours, incomePlanningStripSlotPause, parseTimeMinutes } from "../../domain/incomePlanning"; import { clamp } from "../../lib/format"; import type { IncomePlanningSlot, IncomePlanningWeekday } from "../../types"; import { incomePlanningHostRef as host } from "./host"; import { incomePlanningSleepBackgroundEntries } from "./renderController"; import { incomePlanningSleepSlotGroupsFromSlots, incomePlanningSleepSlotsFromDialogGroups, normalizeIncomePlanningDialogSleepSlotGroup } from "./sleepSlotController"; import { formatIncomePlanningTime, incomePlanningOwnerTypeFromValue, incomePlanningVisualRangeFromTimes, incomePlanningWeekdayByIndex, incomePlanningWeekdayIndex, snapIncomePlanningMinute } from "./shared"; import { incomePlanningUiState, type IncomePlann …

  📝 config.ts
     Pfad: 📁 features / 📁 income-planning / 📝 config.ts
     Größe: 496 B (496 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 19, Wörter: 43, Zeichen: 496
     Inhalt (Auszug): export const INCOME_PLANNING_COLOR_OPTIONS = [ "#8a5a2b", "#2f6fb0", "#5f7f4f", "#b8860b", "#7d6bb3", "#c76f4c", "#6f7785", "#4e9f6d" ];

  📝 controller.ts
     Pfad: 📁 features / 📁 income-planning / 📝 controller.ts
     Größe: 15.50 KB (15877 B)
     Geändert: 2026-06-16T12:57:29
     Überschriften: 0, Zeilen: 424, Wörter: 1036, Zeichen: 15877
     Inhalt (Auszug): import { buildIncomePlanningModel, incomePlanningDefaultManualIcon, type IncomePlanningModel } from "../../domain/incomePlanning"; import { escapeHtml } from "../../lib/format"; import { normalizePositionIcon, POSITION_ICONS, positionIconSvg } from "../../lib/positionIcons"; import type { IncomePlanningAssumptions, IncomePlanningHabit, IncomePlanningManualBlock, IncomePlanningSlot, IncomePlanningWorkBlock } from "../../types"; import { incomePlanningHostRef as host, requireIncomePlanningHost } from "./host"; import { renderIncomePlanningAssumptions, renderIncomePlanningCalendarStamps, renderIncomePlanningCareerLife, renderIncomePlanningHabits, renderIncomePlanningManualBlocks, renderIncomePlanningSources, renderIncomePlanningSummary } from "./renderController"; import { renderIncomePlannin …

  📝 dialogController.ts
     Pfad: 📁 features / 📁 income-planning / 📝 dialogController.ts
     Größe: 40.93 KB (41909 B)
     Geändert: 2026-06-16T12:57:08
     Überschriften: 0, Zeilen: 950, Wörter: 3392, Zeichen: 41909
     Inhalt (Auszug): import { createId } from "../../data/defaults"; import { buildIncomePlanningHabit, buildIncomePlanningManualBlock, buildIncomePlanningWorkBlock, enforceSingleActiveIncomePlanningMainJob, incomePlanningAverageSleepHours, incomePlanningCategoryConfig, incomePlanningDefaultManualColor, incomePlanningDefaultManualIcon, incomePlanningDefaultWorkCategory, incomePlanningDefaultWorkColor, incomePlanningStripSlotPause, parseTimeMinutes } from "../../domain/incomePlanning"; import { clamp, escapeHtml, numberValue } from "../../lib/format"; import { normalizePositionIcon, POSITION_ICONS, positionIconSvg } from "../../lib/positionIcons"; import type { IncomePlanningSlot } from "../../types"; import { INCOME_PLANNING_COLOR_OPTIONS } from "./config"; import { incomePlanningHostRef as host } from "./host …

  📝 events.ts
     Pfad: 📁 features / 📁 income-planning / 📝 events.ts
     Größe: 13.59 KB (13913 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 286, Wörter: 1060, Zeichen: 13913
     Inhalt (Auszug): import { addIncomePlanningDialogSleepSlot, closeIncomePlanningDialog, closeIncomePlanningWeekScenarioDialog, closeIncomeStampPlannerDialog, deleteIncomePlanningDialogSlot, deleteIncomePlanningStamp, deleteIncomeStampPlannerStamp, finishIncomePlanningCalendarDrag, handleIncomePlanningControl, hideIncomePlanningHabitIconPicker, hideIncomePlanningStampMenu, hideIncomePlanningStampPicker, incomePlanningOwnerTypeFromValue, moveIncomePlanningCalendarDrag, openIncomePlanningDialog, openIncomePlanningDialogFromCalendar, openIncomePlanningStampMenu, openIncomePlanningStampPickerForEdit, openIncomePlanningStampPickerFromCalendar, openIncomePlanningWeekScenarioDialog, openIncomeStampPlannerDialogForDate, openIncomeStampPlannerDialogForEdit, removeIncomePlanningDialogSleepSlot, removeIncomePlanningHab …

  📝 host.ts
     Pfad: 📁 features / 📁 income-planning / 📝 host.ts
     Größe: 933 B (933 B)
     Geändert: 2026-06-16T08:22:06
     Überschriften: 0, Zeilen: 26, Wörter: 69, Zeichen: 933
     Inhalt (Auszug): import type { AppSectionId, AppState } from "../../types";

  📝 index.ts
     Pfad: 📁 features / 📁 income-planning / 📝 index.ts
     Größe: 1.46 KB (1499 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 52, Wörter: 71, Zeichen: 1499
     Inhalt (Auszug): import type { FeatureModule } from "../../app/contracts"; import { closeIncomePlanningOverlays, onIncomePlanningChange, onIncomePlanningClick, onIncomePlanningInput, onIncomePlanningPointerDown, onIncomePlanningWindowKeyDown, onIncomePlanningWindowPointerMove, onIncomePlanningWindowPointerUp } from "./events";

  📝 model.ts
     Pfad: 📁 features / 📁 income-planning / 📝 model.ts
     Größe: 448 B (448 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 17, Wörter: 19, Zeichen: 448
     Inhalt (Auszug): export type { IncomePlanningAssumptions, IncomePlanningCalendarStamp, IncomePlanningCategory, IncomePlanningHabit, IncomePlanningManualBlock, IncomePlanningManualBlockType, IncomePlanningPlannedStamp, IncomePlanningPriority, IncomePlanningSleepSlot, IncomePlanningSlot, IncomePlanningState, IncomePlanningWeekScenario, IncomePlanningWeekScenarioId, IncomePlanningWeekday, IncomePlanningWorkBlock } from "../../types";

  📝 planningSanitizer.ts
     Pfad: 📁 features / 📁 income-planning / 📝 planningSanitizer.ts
     Größe: 9.53 KB (9760 B)
     Geändert: 2026-06-16T12:55:40
     Überschriften: 0, Zeilen: 217, Wörter: 837, Zeichen: 9760
     Inhalt (Auszug): import { createId } from "../../data/defaults"; import { INCOME_PLANNING_CATEGORY_CONFIGS, INCOME_PLANNING_WEEK_DAYS, incomePlanningDefaultManualColor, incomePlanningDefaultManualIcon, incomePlanningDefaultWorkColor, incomePlanningStripSlotPause, parseTimeMinutes } from "../../domain/incomePlanning"; import { clamp, numberValue } from "../../lib/format"; import { normalizePositionIcon } from "../../lib/positionIcons"; import type { IncomePlanningAssumptions, IncomePlanningCategory, IncomePlanningHabit, IncomePlanningManualBlock, IncomePlanningManualBlockType, IncomePlanningSlot, IncomePlanningWeekday, IncomePlanningWorkBlock } from "../../types"; import { incomePlanningHostRef as host } from "./host"; import { normalizeIncomePlanningColor } from "./shared";

  📝 renderController.ts
     Pfad: 📁 features / 📁 income-planning / 📝 renderController.ts
     Größe: 43.51 KB (44557 B)
     Geändert: 2026-06-16T08:32:12
     Überschriften: 0, Zeilen: 963, Wörter: 4083, Zeichen: 44535
     Inhalt (Auszug): import { buildIncomePlanningModel, INCOME_PLANNING_WEEK_DAYS, incomePlanningAverageSleepHours, incomePlanningCategoryConfig, incomePlanningDefaultManualColor, incomePlanningDefaultManualIcon, incomePlanningDefaultWorkColor, incomePlanningSlotCalendarSegments, incomePlanningSlotGrossDurationMinutes, incomePlanningSlotNetDurationMinutes, incomePlanningSlotPauseDurationMinutes, incomePlanningSleepSlotDurationMinutes, incomePlanningWeekScenarioConfig, parseTimeMinutes, type IncomePlanningCalendarEntry, type IncomePlanningModel, type IncomePlanningPlannerEntryType } from "../../domain/incomePlanning"; import { clamp, escapeHtml, intNumber, percent } from "../../lib/format"; import { normalizePositionIcon, positionIconSvg } from "../../lib/positionIcons"; import type { IncomePlanningCalendarStam …

  📝 selectors.ts
     Pfad: 📁 features / 📁 income-planning / 📝 selectors.ts
     Größe: 65 B (65 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 1, Wörter: 4, Zeichen: 65
     Inhalt (Auszug): export { incomePlanningModelForActiveWeek } from "./controller";

  📝 shared.ts
     Pfad: 📁 features / 📁 income-planning / 📝 shared.ts
     Größe: 10.21 KB (10459 B)
     Geändert: 2026-06-16T08:24:11
     Überschriften: 0, Zeilen: 259, Wörter: 978, Zeichen: 10459
     Inhalt (Auszug): import { INCOME_PLANNING_CATEGORY_CONFIGS, INCOME_PLANNING_WEEK_DAYS, incomePlanningDefaultManualColor, incomePlanningDefaultManualIcon, incomePlanningDefaultWorkColor, incomePlanningSlotGrossDurationMinutes, incomePlanningSlotNetDurationMinutes, incomePlanningSlotPauseDurationMinutes, parseTimeMinutes, type IncomePlanningModel, type IncomePlanningPlannerEntryType } from "../../domain/incomePlanning"; import { clamp, intNumber } from "../../lib/format"; import type { IncomePlanningCategory, IncomePlanningHabit, IncomePlanningManualBlockType, IncomePlanningSlot, IncomePlanningWeekday } from "../../types"; import type { IncomePlanningOwnerType } from "./uiState";

  📝 sleepSlotController.ts
     Pfad: 📁 features / 📁 income-planning / 📝 sleepSlotController.ts
     Größe: 4.17 KB (4270 B)
     Geändert: 2026-06-16T08:28:35
     Überschriften: 0, Zeilen: 108, Wörter: 326, Zeichen: 4270
     Inhalt (Auszug): import { createId } from "../../data/defaults"; import { INCOME_PLANNING_WEEK_DAYS, incomePlanningSleepSlotDurationMinutes } from "../../domain/incomePlanning"; import { clamp } from "../../lib/format"; import type { IncomePlanningSleepSlot, IncomePlanningWeekScenarioId, IncomePlanningWeekday } from "../../types"; import type { IncomePlanningSleepSlotGroup } from "./uiState"; import { incomePlanningScenarioIdsForDialog, incomePlanningStoredScenarioIds } from "./weekScenarioController";

  📝 stampPlannerController.ts
     Pfad: 📁 features / 📁 income-planning / 📝 stampPlannerController.ts
     Größe: 19.86 KB (20334 B)
     Geändert: 2026-06-16T08:26:53
     Überschriften: 0, Zeilen: 463, Wörter: 1653, Zeichen: 20332
     Inhalt (Auszug): import { createId } from "../../data/defaults"; import { INCOME_PLANNING_WEEK_DAYS, parseTimeMinutes } from "../../domain/incomePlanning"; import { escapeHtml, intNumber } from "../../lib/format"; import { normalizePositionIcon, POSITION_ICONS, positionIconSvg } from "../../lib/positionIcons"; import type { IncomePlanningPlannedStamp, IncomePlanningWeekday } from "../../types"; import { INCOME_PLANNING_STAMP_PRESETS } from "./config"; import { incomePlanningHostRef as host, requireIncomePlanningHost } from "./host"; import { formatIncomePlanningTime, incomePlanningHeaderIcon, incomePlanningWeekdayLabel } from "./shared"; import { incomePlanningUiState, type IncomeStampPlannerDateRange } from "./uiState"; import { incomePlanningDefaultScenarioIdsForNewEntry, incomePlanningEntryIsActiveInCur …

  📝 stampPopupController.ts
     Pfad: 📁 features / 📁 income-planning / 📝 stampPopupController.ts
     Größe: 10.97 KB (11230 B)
     Geändert: 2026-06-16T08:36:00
     Überschriften: 0, Zeilen: 269, Wörter: 1043, Zeichen: 11230
     Inhalt (Auszug): import { createId } from "../../data/defaults"; import { parseTimeMinutes } from "../../domain/incomePlanning"; import { escapeHtml } from "../../lib/format"; import { normalizePositionIcon, POSITION_ICONS, positionIconSvg } from "../../lib/positionIcons"; import type { IncomePlanningCalendarStamp } from "../../types"; import { INCOME_PLANNING_STAMP_PRESETS } from "./config"; import { incomePlanningHostRef as host } from "./host"; import { formatIncomePlanningTime, incomePlanningWeekdayOptionItems, isIncomePlanningWeekday } from "./shared"; import { incomePlanningUiState } from "./uiState"; import { incomePlanningKnownScenarioIds, incomePlanningScenarioCheckboxGroup, incomePlanningStoredScenarioIds } from "./weekScenarioController";

  📝 styles.css
     Pfad: 📁 features / 📁 income-planning / 📝 styles.css
     Größe: 30 B (30 B)
     Geändert: 2026-06-16T08:05:16
     Überschriften: 0, Zeilen: 1, Wörter: 4, Zeichen: 30
     Inhalt (Auszug): @import "./styles/index.css";

  📝 uiState.ts
     Pfad: 📁 features / 📁 income-planning / 📝 uiState.ts
     Größe: 6.02 KB (6163 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 212, Wörter: 496, Zeichen: 6163
     Inhalt (Auszug): import type { IncomePlanningPlannerEntryType } from "../../domain/incomePlanning"; import type { IncomePlanningCategory, IncomePlanningHabit, IncomePlanningManualBlockType, IncomePlanningWeekScenarioId, IncomePlanningWeekday } from "./model";

  📝 view.ts
     Pfad: 📁 features / 📁 income-planning / 📝 view.ts
     Größe: 212 B (212 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 8, Wörter: 9, Zeichen: 212
     Inhalt (Auszug): export { renderIncomePlanning, renderIncomePlanningDialog, renderIncomePlanningStampMenu, renderIncomePlanningStampPicker, renderIncomePlanningSummary, renderIncomeStampPlanner } from "./controller";

  📝 weekScenarioController.ts
     Pfad: 📁 features / 📁 income-planning / 📝 weekScenarioController.ts
     Größe: 12.47 KB (12773 B)
     Geändert: 2026-06-16T08:25:25
     Überschriften: 0, Zeilen: 291, Wörter: 1032, Zeichen: 12773
     Inhalt (Auszug): import { createId } from "../../data/defaults"; import { INCOME_PLANNING_WEEK_DAYS, incomePlanningEntryActiveInScenario, incomePlanningWeekScenarioConfig, incomePlanningWeekScenarioConfigs } from "../../domain/incomePlanning"; import { escapeHtml, monthName } from "../../lib/format"; import type { IncomePlanningWeekScenario, IncomePlanningWeekScenarioId, IncomePlanningWeekday } from "../../types"; import { incomePlanningHostRef as host } from "./host"; import { incomePlanningHeaderIcon, incomePlanningWeekdayLabel } from "./shared"; import { incomePlanningUiState } from "./uiState";


📁 features/income-planning/styles
  📝 calendar.css
     Pfad: 📁 features / 📁 income-planning / 📁 styles / 📝 calendar.css
     Größe: 11.88 KB (12162 B)
     Geändert: 2026-06-16T08:05:16
     Überschriften: 0, Zeilen: 556, Wörter: 1692, Zeichen: 12162
     Inhalt (Auszug): .income-planning-work-hours span, .income-planning-career-stats span { color: var(--muted); font-size: 0.68rem; font-weight: 850; }

  📝 dialogs.css
     Pfad: 📁 features / 📁 income-planning / 📁 styles / 📝 dialogs.css
     Größe: 4.82 KB (4940 B)
     Geändert: 2026-06-16T08:05:16
     Überschriften: 0, Zeilen: 224, Wörter: 684, Zeichen: 4940
     Inhalt (Auszug): .income-planning-calendar-block strong, .income-planning-calendar-block small, .income-planning-calendar-block em { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  📝 habits.css
     Pfad: 📁 features / 📁 income-planning / 📁 styles / 📝 habits.css
     Größe: 1.26 KB (1293 B)
     Geändert: 2026-06-16T08:05:16
     Überschriften: 0, Zeilen: 56, Wörter: 185, Zeichen: 1293
     Inhalt (Auszug): .income-planning-icon-button:hover { border-color: var(--accent); background: var(--accent-soft); }

  📝 index.css
     Pfad: 📁 features / 📁 income-planning / 📁 styles / 📝 index.css
     Größe: 151 B (151 B)
     Geändert: 2026-06-16T08:05:16
     Überschriften: 0, Zeilen: 6, Wörter: 18, Zeichen: 151
     Inhalt (Auszug): @import "./layout.css"; @import "./calendar.css"; @import "./dialogs.css"; @import "./stamps.css"; @import "./habits.css"; @import "./responsive.css";

  📝 layout.css
     Pfad: 📁 features / 📁 income-planning / 📁 styles / 📝 layout.css
     Größe: 10.82 KB (11078 B)
     Geändert: 2026-06-16T08:05:16
     Titel: incomePlanningWorkBlocks.income-planning-block-list {
     Überschriften: 2, Zeilen: 562, Wörter: 1490, Zeichen: 11078
     Inhalt (Auszug): .income-planning-header-actions { display: inline-flex; align-items: center; gap: 6px; }

  📝 responsive.css
     Pfad: 📁 features / 📁 income-planning / 📁 styles / 📝 responsive.css
     Größe: 1.35 KB (1382 B)
     Geändert: 2026-06-16T08:05:16
     Überschriften: 0, Zeilen: 66, Wörter: 184, Zeichen: 1382
     Inhalt (Auszug): .income-planning-source-row .income-planning-hours-field { min-width: 72px; }

  📝 stamps.css
     Pfad: 📁 features / 📁 income-planning / 📁 styles / 📝 stamps.css
     Größe: 2.55 KB (2610 B)
     Geändert: 2026-06-16T08:05:16
     Überschriften: 0, Zeilen: 129, Wörter: 350, Zeichen: 2610
     Inhalt (Auszug): .income-planning-dialog-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; align-items: end; }


📁 features/income-stamp-planner
  📝 index.ts
     Pfad: 📁 features / 📁 income-stamp-planner / 📝 index.ts
     Größe: 277 B (277 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 8, Wörter: 22, Zeichen: 277
     Inhalt (Auszug): import type { FeatureModule } from "../../app/contracts";

  📝 model.ts
     Pfad: 📁 features / 📁 income-stamp-planner / 📝 model.ts
     Größe: 93 B (93 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 1, Wörter: 6, Zeichen: 93
     Inhalt (Auszug): export type { IncomePlanningPlannedStamp, IncomePlanningWeekScenarioId } from "../../types";

  📝 styles.css
     Pfad: 📁 features / 📁 income-stamp-planner / 📝 styles.css
     Größe: 5.35 KB (5482 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 277, Wörter: 755, Zeichen: 5482
     Inhalt (Auszug): .income-stamp-planner-card { overflow: hidden; }


📁 features/income-tracker
  📝 actions.ts
     Pfad: 📁 features / 📁 income-tracker / 📝 actions.ts
     Größe: 768 B (768 B)
     Geändert: 2026-06-16T08:14:33
     Überschriften: 0, Zeilen: 30, Wörter: 32, Zeichen: 768
     Inhalt (Auszug): export { addIncomeMilestone, addIncomeYearlyEntry, closeIncomeAnalysisDialog, closeIncomeTaxDialog, exportIncomeCsv, exportIncomePdf, exportIncomePlanningCsvFile, importIncomeCsvFromFile, importIncomePlanningCsvFromFile, openIncomeAnalysisDialog, openIncomeTaxDialog, removeIncomeEntry, setIncomeAnalysisChartType, setIncomeAnalysisDataView, setIncomeAnalysisYearFilter, setIncomeInputTab, toggleIncomeAnalysisLabel, toggleIncomeYearLabelFilter, updateIncomeEntry, updateIncomeSetting } from "./controller"; export { hideIncomeMilestoneTypePicker, hideIncomeYearLabelPicker, selectIncomeMilestoneType, selectIncomeYearLabel, showIncomeMilestoneTypePicker, showIncomeYearLabelPicker } from "./labelPickerController";

  📝 chartController.ts
     Pfad: 📁 features / 📁 income-tracker / 📝 chartController.ts
     Größe: 12.37 KB (12670 B)
     Geändert: 2026-06-16T08:12:53
     Überschriften: 0, Zeilen: 302, Wörter: 1224, Zeichen: 12670
     Inhalt (Auszug): import { INCOME_YEAR_LABEL_OPTIONS } from "../../domain/incomeLabels"; import { INCOME_SOURCE_LABELS, incomeYearEntryNetIncome, type IncomeTrackerModel } from "../../domain/incomeTracker"; import { normalizeIncomeTaxRuleLabel } from "../../domain/incomeTaxRules"; import { escapeHtml, money, normalizeHeader, percent } from "../../lib/format"; import { positionIconSvg } from "../../lib/positionIcons"; import type { CareerMilestone, IncomeProjectionMode, IncomeYearEntry } from "../../types"; import { CAREER_MILESTONE_TYPE_OPTIONS } from "./config"; import { signedMoney, signedPercent } from "./exportController";

  📝 config.ts
     Pfad: 📁 features / 📁 income-tracker / 📝 config.ts
     Größe: 4.58 KB (4685 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 77, Wörter: 410, Zeichen: 4685
     Inhalt (Auszug): import type { CareerMilestoneImpact, IncomeEmploymentContext, IncomeMinijobType, IncomeProjectionMode, IncomeStudentEmploymentMode, IncomeTaxAdjustmentType, IncomeTaxDeductionField } from "./model";

  📝 controller.ts
     Pfad: 📁 features / 📁 income-tracker / 📝 controller.ts
     Größe: 34.63 KB (35460 B)
     Geändert: 2026-06-16T11:42:26
     Überschriften: 0, Zeilen: 890, Wörter: 3039, Zeichen: 35459
     Inhalt (Auszug): import { buildIncomeAnalysisLabelDetails } from "../../domain/incomeAnalysis"; import { INCOME_YEAR_LABEL_OPTIONS } from "../../domain/incomeLabels"; import { buildIncomeChartModel, buildIncomeTrackerModel, incomeYearEntryCalculatedNetIncome, incomeYearEntryNetIncome, INCOME_SOURCE_LABELS, type IncomeTrackerModel } from "../../domain/incomeTracker"; import { normalizeIncomeTaxRuleLabel } from "../../domain/incomeTaxRules"; import { escapeHtml, money, normalizeHeader, percent } from "../../lib/format"; import { positionIconSvg } from "../../lib/positionIcons"; import type { AppState, CareerMilestone, IncomeResolvedSource, IncomeTrackerSettings, IncomeYearEntry, InvestmentDepotKey } from "../../types"; import { CAREER_MILESTONE_IMPACT_OPTIONS, CAREER_MILESTONE_TYPE_OPTIONS } from "./config";

  📝 entriesController.ts
     Pfad: 📁 features / 📁 income-tracker / 📝 entriesController.ts
     Größe: 6.52 KB (6674 B)
     Geändert: 2026-06-16T11:33:27
     Überschriften: 0, Zeilen: 150, Wörter: 495, Zeichen: 6674
     Inhalt (Auszug): import { createId } from "../../data/defaults"; import { DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT, emptyIncomeTaxAdjustment, emptyIncomeTaxDeductionItems, incomeTaxDeductionItemsTotal } from "../../domain/incomeTracker"; import type { AppState, IncomeTaxDeductionField, IncomeYearEntry } from "../../types"; import { INCOME_TAX_DEDUCTION_ROWS } from "./config"; import { incomeEmploymentContext, incomeInteger, incomeMinijobType, incomePerson, incomeStudentEmploymentMode, incomeTaxAdjustmentType, incomeYearSource, nullableInputNumber } from "./exportController";

  📝 events.ts
     Pfad: 📁 features / 📁 income-tracker / 📝 events.ts
     Größe: 7.55 KB (7730 B)
     Geändert: 2026-06-16T08:14:26
     Überschriften: 0, Zeilen: 158, Wörter: 687, Zeichen: 7730
     Inhalt (Auszug): import { addIncomeMilestone, addIncomeYearlyEntry, closeIncomeAnalysisDialog, closeIncomeTaxDialog, exportIncomeCsv, exportIncomePdf, exportIncomePlanningCsvFile, importIncomeCsvFromFile, importIncomePlanningCsvFromFile, openIncomeAnalysisDialog, openIncomeTaxDialog, removeIncomeEntry, setIncomeAnalysisChartType, setIncomeAnalysisDataView, setIncomeAnalysisYearFilter, setIncomeInputTab, toggleIncomeAnalysisLabel, toggleIncomeYearLabelFilter, updateIncomeEntry, updateIncomeSetting } from "./controller"; import { hideIncomeMilestoneTypePicker, hideIncomeYearLabelPicker, selectIncomeMilestoneType, selectIncomeYearLabel, showIncomeMilestoneTypePicker, showIncomeYearLabelPicker } from "./labelPickerController"; import type { IncomeAnalysisChartType, IncomeAnalysisDataView } from "./uiState"; im …

  📝 exportController.ts
     Pfad: 📁 features / 📁 income-tracker / 📝 exportController.ts
     Größe: 26.59 KB (27224 B)
     Geändert: 2026-06-16T08:11:39
     Überschriften: 0, Zeilen: 588, Wörter: 2489, Zeichen: 27224
     Inhalt (Auszug): import { createId } from "../../data/defaults"; import { INCOME_YEAR_LABEL_OPTIONS } from "../../domain/incomeLabels"; import { DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT, emptyIncomeTaxAdjustment, emptyIncomeTaxDeductionItems, incomeYearEntryNetIncome, incomeYearEntryTaxDeductions, incomeTaxDeductionItemsTotal, type IncomeTrackerModel, INCOME_SOURCE_LABELS } from "../../domain/incomeTracker"; import { normalizeIncomeTaxRuleLabel } from "../../domain/incomeTaxRules"; import { exportIncomePlanningCsv, incomePlanningFromCsvRows, parseCsv } from "../../lib/csv"; import { clamp, escapeHtml, money, normalizeHeader, percent } from "../../lib/format"; import type { AppState, CareerMilestone, CareerMilestoneImpact, IncomeEmploymentContext, IncomeMinijobType, IncomePerson, IncomeProjectionMode,

  📝 index.ts
     Pfad: 📁 features / 📁 income-tracker / 📝 index.ts
     Größe: 1.16 KB (1190 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 48, Wörter: 64, Zeichen: 1190
     Inhalt (Auszug): import type { FeatureModule } from "../../app/contracts"; import { closeIncomeTrackerOverlays, onIncomeTrackerChange, onIncomeTrackerClick, onIncomeTrackerInput, onIncomeTrackerWindowKeyDown } from "./events";

  📝 labelPickerController.ts
     Pfad: 📁 features / 📁 income-tracker / 📝 labelPickerController.ts
     Größe: 7.25 KB (7426 B)
     Geändert: 2026-06-16T08:14:18
     Überschriften: 0, Zeilen: 192, Wörter: 665, Zeichen: 7426
     Inhalt (Auszug): import { INCOME_YEAR_LABEL_OPTIONS } from "../../domain/incomeLabels"; import { normalizeIncomeTaxRuleLabel } from "../../domain/incomeTaxRules"; import { escapeHtml, normalizeHeader } from "../../lib/format"; import { positionIconSvg } from "../../lib/positionIcons"; import type { AppState, IncomeYearEntry } from "../../types"; import { CAREER_MILESTONE_TYPE_OPTIONS } from "./config"; import { incomeTrackerUiState } from "./uiState";

  📝 milestoneController.ts
     Pfad: 📁 features / 📁 income-tracker / 📝 milestoneController.ts
     Größe: 2.41 KB (2472 B)
     Geändert: 2026-06-16T11:33:27
     Überschriften: 0, Zeilen: 71, Wörter: 211, Zeichen: 2472
     Inhalt (Auszug): import { createId } from "../../data/defaults"; import type { AppState, CareerMilestone } from "../../types"; import { incomeInteger, incomeMilestoneImpact } from "./exportController";

  📝 model.ts
     Pfad: 📁 features / 📁 income-tracker / 📝 model.ts
     Größe: 417 B (417 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 18, Wörter: 20, Zeichen: 417
     Inhalt (Auszug): export type { CareerMilestone, CareerMilestoneImpact, IncomeEmploymentContext, IncomeMinijobType, IncomePerson, IncomeProjectionMode, IncomeResolvedSource, IncomeStudentEmploymentMode, IncomeTaxAdjustment, IncomeTaxAdjustmentType, IncomeTaxDeductionField, IncomeTaxDeductionItems, IncomeTrackerSettings, IncomeTrackerState, IncomeYearEntry, IncomeYearEntrySource } from "../../types";

  📝 renderAnalysis.ts
     Pfad: 📁 features / 📁 income-tracker / 📝 renderAnalysis.ts
     Größe: 27.00 KB (27647 B)
     Geändert: 2026-06-16T08:08:12
     Überschriften: 0, Zeilen: 615, Wörter: 2415, Zeichen: 27644
     Inhalt (Auszug): import { buildIncomeAnalysisLabelDetails, type IncomeAnalysisLabelDetails, type IncomeAnalysisLabelGroup } from "../../domain/incomeAnalysis"; import { INCOME_YEAR_LABEL_OPTIONS } from "../../domain/incomeLabels"; import { incomeTaxDeductionItemsTotal, incomeYearEntryNetIncome, incomeYearEntryTaxDeductions, incomeYearEntryTaxTotal, type IncomeTrackerModel } from "../../domain/incomeTracker"; import { escapeHtml, money, numberValue, percent } from "../../lib/format"; import { positionIconSvg } from "../../lib/positionIcons"; import type { IncomeYearEntry } from "../../types"; import { INCOME_TAX_DEDUCTION_ROWS } from "./config"; import { incomeTrackerUiState, type IncomeAnalysisDataView, type IncomeAnalysisModel, type IncomeAnalysisSeriesItem, type IncomeAnalysisSlice, type IncomeAnalysisYe …

  📝 selectors.ts
     Pfad: 📁 features / 📁 income-tracker / 📝 selectors.ts
     Größe: 70 B (70 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 1, Wörter: 4, Zeichen: 70
     Inhalt (Auszug): export { sanitizeIncomeYearEntriesWithTaxRules } from "./controller";

  📝 styles.css
     Pfad: 📁 features / 📁 income-tracker / 📝 styles.css
     Größe: 30 B (30 B)
     Geändert: 2026-06-16T08:05:16
     Überschriften: 0, Zeilen: 1, Wörter: 4, Zeichen: 30
     Inhalt (Auszug): @import "./styles/index.css";

  📝 taxDialogController.ts
     Pfad: 📁 features / 📁 income-tracker / 📝 taxDialogController.ts
     Größe: 31.21 KB (31963 B)
     Geändert: 2026-06-16T11:38:37
     Überschriften: 0, Zeilen: 679, Wörter: 2580, Zeichen: 31957
     Inhalt (Auszug): import { INCOME_YEAR_LABEL_OPTIONS } from "../../domain/incomeLabels"; import { applyCapitalGainsTaxToEntries, capitalGainsTaxBreakdown, CAPITAL_GAINS_ALLOWANCE_LIMIT, DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT, emptyIncomeTaxAdjustment, incomeTaxDeductionItemsTotal, incomeYearEntryTaxDeductions, incomeYearEntryTaxTotal } from "../../domain/incomeTracker"; import { evaluateIncomeTaxAndContributionRules, isCapitalGainsTaxRuleLabel, normalizeIncomeTaxRuleLabel, SIDE_INCOME_TAX_RULE_LABELS, taxRuleConfigForYear, type IncomeTaxRuleResult } from "../../domain/incomeTaxRules"; import { clamp, escapeHtml, money, normalizeHeader, numberValue } from "../../lib/format"; import type { IncomeYearEntry } from "../../types"; import { CAPITAL_GAINS_CHURCH_TAX_RATE_OPTIONS, INCOME_EMPLOYMENT_CONTEXT_OP …

  📝 uiState.ts
     Pfad: 📁 features / 📁 income-tracker / 📝 uiState.ts
     Größe: 2.01 KB (2063 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 73, Wörter: 164, Zeichen: 2063
     Inhalt (Auszug): import type { IncomeAnalysisLabelDetails } from "../../domain/incomeAnalysis"; import type { IncomeYearEntry } from "./model";

  📝 view.ts
     Pfad: 📁 features / 📁 income-tracker / 📝 view.ts
     Größe: 162 B (162 B)
     Geändert: 2026-06-16T08:14:55
     Überschriften: 0, Zeilen: 7, Wörter: 9, Zeichen: 162
     Inhalt (Auszug): export { renderIncomeTracker } from "./controller"; export { renderIncomeMilestoneTypePicker, renderIncomeYearLabelPicker } from "./labelPickerController";


📁 features/income-tracker/styles
  📝 analysis.css
     Pfad: 📁 features / 📁 income-tracker / 📁 styles / 📝 analysis.css
     Größe: 11.14 KB (11411 B)
     Geändert: 2026-06-16T08:05:16
     Überschriften: 0, Zeilen: 594, Wörter: 1520, Zeichen: 11411
     Inhalt (Auszug): .income-analysis-backdrop { position: fixed; z-index: 48; inset: 0; display: grid; place-items: center; background: rgba(31, 37, 40, 0.38); padding: 16px; }

  📝 charts.css
     Pfad: 📁 features / 📁 income-tracker / 📁 styles / 📝 charts.css
     Größe: 4.23 KB (4329 B)
     Geändert: 2026-06-16T08:05:16
     Überschriften: 0, Zeilen: 240, Wörter: 576, Zeichen: 4329
     Inhalt (Auszug): .income-chart-host { min-height: 230px; border: 1px solid var(--row-border); border-radius: 8px; background: var(--surface); padding: 10px; }

  📝 index.css
     Pfad: 📁 features / 📁 income-tracker / 📁 styles / 📝 index.css
     Größe: 103 B (103 B)
     Geändert: 2026-06-16T08:05:16
     Überschriften: 0, Zeilen: 4, Wörter: 13, Zeichen: 103
     Inhalt (Auszug): @import "./tracker.css"; @import "./tax-dialog.css"; @import "./charts.css"; @import "./analysis.css";

  📝 tax-dialog.css
     Pfad: 📁 features / 📁 income-tracker / 📁 styles / 📝 tax-dialog.css
     Größe: 8.51 KB (8716 B)
     Geändert: 2026-06-16T08:05:16
     Überschriften: 0, Zeilen: 466, Wörter: 1200, Zeichen: 8716
     Inhalt (Auszug): .income-tax-dialog-backdrop { position: fixed; z-index: 45; inset: 0; display: grid; place-items: center; background: rgba(31, 37, 40, 0.35); padding: 16px; }

  📝 tracker.css
     Pfad: 📁 features / 📁 income-tracker / 📁 styles / 📝 tracker.css
     Größe: 4.47 KB (4575 B)
     Geändert: 2026-06-16T08:05:16
     Überschriften: 0, Zeilen: 259, Wörter: 620, Zeichen: 4575
     Inhalt (Auszug): .income-module-section { scroll-margin-top: 16px; }


📁 features/investment
  📝 config.ts
     Pfad: 📁 features / 📁 investment / 📝 config.ts
     Größe: 144 B (144 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 3, Wörter: 12, Zeichen: 144
     Inhalt (Auszug): import type { InvestmentDepotKey } from "./model";

  📝 index.ts
     Pfad: 📁 features / 📁 investment / 📝 index.ts
     Größe: 296 B (296 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 8, Wörter: 23, Zeichen: 296
     Inhalt (Auszug): import type { FeatureModule } from "../../app/contracts";

  📝 model.ts
     Pfad: 📁 features / 📁 investment / 📝 model.ts
     Größe: 132 B (132 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 1, Wörter: 9, Zeichen: 132
     Inhalt (Auszug): export type { AssetProjection, AssetProjectionPoint, InvestmentDepotKey, InvestmentResult, InvestmentSettings } from "../../types";

  📝 styles.css
     Pfad: 📁 features / 📁 investment / 📝 styles.css
     Größe: 11.11 KB (11380 B)
     Geändert: 2026-06-16T06:28:47
     Titel: investmentChart,
     Überschriften: 2, Zeilen: 653, Wörter: 1492, Zeichen: 11380
     Inhalt (Auszug): .investment-grid { display: grid; grid-template-columns: minmax(360px, 0.62fr) minmax(0, 1.38fr); gap: 18px; align-items: start; }


📁 features/planning
  📝 index.ts
     Pfad: 📁 features / 📁 planning / 📝 index.ts
     Größe: 274 B (274 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 8, Wörter: 22, Zeichen: 274
     Inhalt (Auszug): import type { FeatureModule } from "../../app/contracts";

  📝 model.ts
     Pfad: 📁 features / 📁 planning / 📝 model.ts
     Größe: 114 B (114 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 1, Wörter: 8, Zeichen: 114
     Inhalt (Auszug): export type { PlanningAccount, PlanningAccountType, PlanningSettings, PlanningYearSelection } from "../../types";

  📝 styles.css
     Pfad: 📁 features / 📁 planning / 📝 styles.css
     Größe: 6.09 KB (6241 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 354, Wörter: 845, Zeichen: 6241
     Inhalt (Auszug): .planning-year-panel { display: grid; gap: 12px; }


📁 features/positions
  📝 index.ts
     Pfad: 📁 features / 📁 positions / 📝 index.ts
     Größe: 448 B (448 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 21, Wörter: 30, Zeichen: 448
     Inhalt (Auszug): import type { FeatureModule } from "../../app/contracts";

  📝 model.ts
     Pfad: 📁 features / 📁 positions / 📝 model.ts
     Größe: 286 B (286 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 14, Wörter: 16, Zeichen: 286
     Inhalt (Auszug): export type { ExpensePositionType, IncomePositionType, PayoutType, PositionCostBreakdownItem, PositionFlow, PositionTableFilter, PositionTableMode, PositionTableSort, PositionTableView, PositionTableViewState, PositionType, ReservePosition } from "../../types";

  📝 styles.css
     Pfad: 📁 features / 📁 positions / 📝 styles.css
     Größe: 9.89 KB (10125 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 600, Wörter: 1348, Zeichen: 10125
     Inhalt (Auszug): .position-mode-switch { display: inline-flex; min-height: 38px; overflow: hidden; border: 1px solid var(--border); border-radius: 6px; background: var(--surface-soft); }


📁 features/real-estate
  📝 index.ts
     Pfad: 📁 features / 📁 real-estate / 📝 index.ts
     Größe: 550 B (550 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 21, Wörter: 31, Zeichen: 550
     Inhalt (Auszug): import type { FeatureModule } from "../../app/contracts";

  📝 model.ts
     Pfad: 📁 features / 📁 real-estate / 📝 model.ts
     Größe: 382 B (382 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 14, Wörter: 16, Zeichen: 382
     Inhalt (Auszug): export type { AdditionalRepaymentBreakdown, AdditionalRepaymentYearBreakdown, RealEstateFinancingResult, RealEstateFinancingSettings, RealEstateFinancingSourceSchedule, RealEstateFinancingYear, RealEstateLocale, RealEstatePaymentSourceKind, RepaymentSourceToggle, RepaymentSourceToggleKey, RepaymentSourceValues, SpecialRepaymentRhythm } from "../../types";

  📝 styles.css
     Pfad: 📁 features / 📁 real-estate / 📝 styles.css
     Größe: 2.96 KB (3031 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 163, Wörter: 408, Zeichen: 3031
     Inhalt (Auszug): .real-estate-heading-controls { display: grid; gap: 8px; justify-items: stretch; width: min(100%, 860px); }


📁 features/runtime-host
  📝 combinedWealthRuntime.ts
     Pfad: 📁 features / 📁 runtime-host / 📝 combinedWealthRuntime.ts
     Größe: 24.73 KB (25325 B)
     Geändert: 2026-06-16T13:59:58
     Überschriften: 0, Zeilen: 591, Wörter: 1975, Zeichen: 25325
     Inhalt (Auszug): import type { AppState, CombinedWealthDepotKey, CombinedWealthYear, PlanningAccount, RealEstateFinancingResult, ReservePosition, StatutoryPensionScenarioId } from "../../types"; import type { StatutoryPensionModel } from "../../domain/statutoryPension"; import { COMBINED_DEPOTS } from "../combined-wealth/config"; import { buildCombinedWealthSeries, type CombinedWealthDepotProjection, combinedWealthHorizonYears } from "../../domain/combinedWealth"; import { clamp, escapeHtml, intNumber, money, numberValue } from "../../lib/format"; import { incomeYearEntryTaxTotal } from "../../domain/incomeTracker"; import { normalizePositionIcon, positionIconSvg } from "../../lib/positionIcons"; import { positionFlow } from "../../lib/positionKinds"; import { runtimeApi, runtimeHost } from "./hostContext" …

  📝 controller.ts
     Pfad: 📁 features / 📁 runtime-host / 📝 controller.ts
     Größe: 30.65 KB (31389 B)
     Geändert: 2026-06-16T14:04:22
     Überschriften: 0, Zeilen: 752, Wörter: 2387, Zeichen: 31389
     Inhalt (Auszug): import { defaultAppState } from "../../data/defaults"; import type { AppContext } from "../../app/contracts"; import type { FeatureModule } from "../../app/contracts"; import { bindAppEvents } from "../../app/events"; import { createRenderScheduler } from "../../app/renderScheduler"; import { appSectionIdFromValue } from "../../app/router"; import { renderShell } from "../../app/shell"; import { calculateReserveSummary } from "../../domain/reserveCalculator"; import { exportPositionsCsv, exportYearTableCsv } from "../../lib/csv"; import { escapeHtml, numberValue } from "../../lib/format"; import type { PositionTableCadence } from "../../lib/positionKinds"; import { hasActivePositionTableView } from "../../lib/positionTableView"; import { initializeStorage } from "../../lib/storage"; import …

  📝 hostContext.ts
     Pfad: 📁 features / 📁 runtime-host / 📝 hostContext.ts
     Größe: 3.41 KB (3490 B)
     Geändert: 2026-06-16T13:47:47
     Überschriften: 0, Zeilen: 99, Wörter: 279, Zeichen: 3490
     Inhalt (Auszug): import { defaultAppState } from "../../data/defaults"; import type { AppContext, RenderScheduler } from "../../app/contracts"; import type { AppState, AssetProjection, CombinedWealthYear, PlanningAccount, PositionTableFilterColumn, PositionTableFilterOperator, RealEstateFinancingResult, StatutoryPensionScenarioId } from "../../types"; import type { CombinedWealthLineVisibility } from "../../views/wealthCharts"; import type { PositionTableCadence, PositionTableMode } from "../../lib/positionKinds";

  📝 incomeRuntime.ts
     Pfad: 📁 features / 📁 runtime-host / 📝 incomeRuntime.ts
     Größe: 1.06 KB (1085 B)
     Geändert: 2026-06-16T14:03:41
     Überschriften: 0, Zeilen: 40, Wörter: 64, Zeichen: 1085
     Inhalt (Auszug): import { configureIncomeTrackerHost, renderIncomeTracker } from "../income-tracker"; import { configureIncomePlanningHost, renderIncomePlanning, renderIncomeStampPlanner, startIncomePlanningCurrentTimeTicker } from "../income-planning"; import { runtimeApi, runtimeHost } from "./hostContext";

  📝 index.ts
     Pfad: 📁 features / 📁 runtime-host / 📝 index.ts
     Größe: 51 B (51 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 1, Wörter: 4, Zeichen: 51
     Inhalt (Auszug): export { startAppController } from "./controller";

  📝 investmentRuntime.ts
     Pfad: 📁 features / 📁 runtime-host / 📝 investmentRuntime.ts
     Größe: 52.30 KB (53558 B)
     Geändert: 2026-06-16T14:00:36
     Überschriften: 0, Zeilen: 1227, Wörter: 3758, Zeichen: 53554
     Inhalt (Auszug): import type { AssetProjection, AssetProjectionPoint, InvestmentDepotKey, InvestmentSettings, PlanningAccount, PlanningSettings, ReservePosition } from "../../types"; import { INVESTMENT_DEPOTS } from "../investment/config"; import { RETIREMENT_DEPOT_MIN_AGE } from "../../domain/retirementDepot"; import { buildAssetProjection, payoutStartAge as calculatePayoutStartAge } from "../../domain/assetProjection"; import { calculateReserveSummary } from "../../domain/reserveCalculator"; import { clamp, escapeHtml, intNumber, labelForPayout, labelForType, money, monthName, numberValue } from "../../lib/format"; import { defaultInvestmentSettingsForNewAccount } from "../../data/defaults"; import { drawInvestmentChart } from "../../views/investmentChart"; import { investmentSavingsSelectionSummary, se …

  📝 pensionRuntime.ts
     Pfad: 📁 features / 📁 runtime-host / 📝 pensionRuntime.ts
     Größe: 7.39 KB (7568 B)
     Geändert: 2026-06-16T13:57:53
     Überschriften: 0, Zeilen: 184, Wörter: 539, Zeichen: 7568
     Inhalt (Auszug): import type { StatutoryPensionScenarioId } from "../../types"; import { buildStatutoryPensionModel, STATUTORY_PENSION_DEDUCTION_PERCENT_MAX, statutoryPensionDerivedSettingsFromLatestContribution, type StatutoryPensionModel } from "../../domain/statutoryPension"; import { clamp, numberValue, percent } from "../../lib/format"; import { renderStatutoryPensionHtml, renderStatutoryPensionProjectionYearPopupHtml, renderStatutoryPensionTaxPopupHtml, renderStatutoryPensionYearPopupHtml } from "../../views/statutoryPensionView"; import { runtimeApi, runtimeHost } from "./hostContext"; import { statutoryPensionScenarioIdFromValue } from "./stateRuntime";

  📝 planningRuntime.ts
     Pfad: 📁 features / 📁 runtime-host / 📝 planningRuntime.ts
     Größe: 19.00 KB (19453 B)
     Geändert: 2026-06-16T13:57:53
     Überschriften: 0, Zeilen: 461, Wörter: 1641, Zeichen: 19453
     Inhalt (Auszug): import type { PlanningAccount, PlanningSettings } from "../../types"; import { clamp, escapeHtml, intNumber, numberValue } from "../../lib/format"; import { createId, defaultInvestmentSettingsForNewAccount } from "../../data/defaults"; import { planningYearOptions } from "../../lib/planningYears"; import { runtimeApi, runtimeHost } from "./hostContext";

  📝 positionRuntime.ts
     Pfad: 📁 features / 📁 runtime-host / 📝 positionRuntime.ts
     Größe: 60.62 KB (62070 B)
     Geändert: 2026-06-16T14:00:46
     Überschriften: 0, Zeilen: 1528, Wörter: 5145, Zeichen: 62069
     Inhalt (Auszug): import type { InvestmentSettings, PositionCostBreakdownItem, PositionTableFilterColumn, PositionTableFilterOperator, PositionTableView, ReservePosition } from "../../types"; import { clamp, escapeHtml, money, numberValue } from "../../lib/format"; import { createId, defaultInvestmentSettingsForNewAccount } from "../../data/defaults"; import { cssEscape } from "./runtimeDom"; import { defaultPositionIconForPosition, normalizePositionIcon, POSITION_ICONS, positionIconSvg } from "../../lib/positionIcons"; import { emptyPositionTableView, hasActivePositionTableView, positionTableColumnConfig, positionTableColumnsForMode, positionTableFilterChipLabel, positionTableLabelOptions, positionTableOperatorLabel, positionTableOperatorsForColumn, positionTableRows, positionTableSelectOptions, positionTa …

  📝 realEstateRuntime.ts
     Pfad: 📁 features / 📁 runtime-host / 📝 realEstateRuntime.ts
     Größe: 31.13 KB (31878 B)
     Geändert: 2026-06-16T14:00:12
     Überschriften: 0, Zeilen: 728, Wörter: 2340, Zeichen: 31878
     Inhalt (Auszug): import type { AssetProjection, InvestmentDepotKey, InvestmentSettings, PlanningAccount, RealEstateFinancingResult, RealEstateFinancingSettings, RealEstateFinancingSourceSchedule, RealEstatePaymentSourceKind, ReservePosition } from "../../types"; import { INVESTMENT_DEPOTS } from "../investment/config"; import { clamp, escapeHtml, intNumber, labelForType, money, numberValue, percent } from "../../lib/format"; import { defaultInvestmentSettingsForNewAccount } from "../../data/defaults"; import { defaultRealEstateDetailYear } from "../../domain/realEstateCalculator"; import { investmentContributionForMonth, oneTimeInvestmentContributionForMonth } from "../../domain/investmentContributions"; import { normalizePositionIcon, positionIconSvg } from "../../lib/positionIcons"; import { positionFlow …

  📝 renderRuntime.ts
     Pfad: 📁 features / 📁 runtime-host / 📝 renderRuntime.ts
     Größe: 17.64 KB (18065 B)
     Geändert: 2026-06-16T14:00:26
     Überschriften: 0, Zeilen: 372, Wörter: 1395, Zeichen: 18065
     Inhalt (Auszug): import { calculatePlannedOutflowForSingleMonth, calculateReserveSummary } from "../../domain/reserveCalculator"; import { calculateRealEstateFinancing } from "../../domain/realEstateCalculator"; import { clamp, escapeHtml, intNumber, money, percent } from "../../lib/format"; import { combineAssetProjections } from "./investmentRuntime"; import { defaultInvestmentSettingsForNewAccount } from "../../data/defaults"; import { renderAccountYearTableOverview } from "../../views/accountYearTables"; import { runtimeApi, runtimeHost } from "./hostContext"; import { setInputValue, setRangeLabel, setText } from "./runtimeDom"; import type { PlanningSettings, ReservePosition } from "../../types";

  📝 routeRuntime.ts
     Pfad: 📁 features / 📁 runtime-host / 📝 routeRuntime.ts
     Größe: 15.00 KB (15359 B)
     Geändert: 2026-06-16T13:57:53
     Überschriften: 0, Zeilen: 360, Wörter: 1034, Zeichen: 15359
     Inhalt (Auszug): import type { AppSectionId, AppState, InvestmentSettings, PlanningAccount, PlanningSettings, PlanningYearSelection, ReservePosition } from "../../types"; import { appSectionIdFromValue } from "../../app/router"; import { defaultIncomePlanningState, defaultIncomeTrackerState, defaultInvestmentSettings, defaultInvestmentSettingsForNewAccount, defaultSelfEmploymentState } from "../../data/defaults"; import { normalizeCombinedWealthState } from "./stateRuntime"; import { positionsForPlanningYearWithMonthlySavingsCarryover, sanitizePlanningYearSelection } from "../../lib/planningYears"; import { runtimeApi, runtimeHost } from "./hostContext"; import { sanitizeIncomeYearEntriesWithTaxRules } from "../income-tracker";

  📝 runtimeDom.ts
     Pfad: 📁 features / 📁 runtime-host / 📝 runtimeDom.ts
     Größe: 2.72 KB (2782 B)
     Geändert: 2026-06-16T11:52:47
     Überschriften: 0, Zeilen: 75, Wörter: 298, Zeichen: 2782
     Inhalt (Auszug): export function isTauriRuntime(): boolean { return Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__); }

  📝 selfEmploymentRuntime.ts
     Pfad: 📁 features / 📁 runtime-host / 📝 selfEmploymentRuntime.ts
     Größe: 1.36 KB (1391 B)
     Geändert: 2026-06-16T14:03:57
     Überschriften: 0, Zeilen: 42, Wörter: 74, Zeichen: 1391
     Inhalt (Auszug): import { clearSelfEmploymentGanttEditorForDeletedNodes, configureSelfEmploymentHost, renderSelfEmploymentDashboard, renderSelfEmploymentIconPicker, selfEmploymentProjectById, updateSelfEmploymentProject } from "../self-employment"; import { configureBusinessCanvasHost } from "../self-employment/business-canvas"; import { incomePlanningModelForActiveWeek } from "../income-planning"; import { runtimeApi, runtimeHost } from "./hostContext";

  📝 settingsRuntime.ts
     Pfad: 📁 features / 📁 runtime-host / 📝 settingsRuntime.ts
     Größe: 14.04 KB (14374 B)
     Geändert: 2026-06-16T14:00:59
     Überschriften: 0, Zeilen: 377, Wörter: 1161, Zeichen: 14374
     Inhalt (Auszug): import type { InvestmentSettings, PlanningAccount, PlanningSettings, ReservePosition, ThemeMode } from "../../types"; import { createVault, flushVaultSave, getVaultStatus, reloadFromVault, resetStoredState, selectVault, snapshotVault } from "../../lib/storage"; import { csvFileContents, downloadText, ensureCsvExtension, isDeferredModelInput, isTauriRuntime, setInputValue, setText } from "./runtimeDom"; import { defaultInvestmentSettings, defaultInvestmentSettingsForNewAccount } from "../../data/defaults"; import { parseCsv, positionsFromCsvRows } from "../../lib/csv"; import { positionFlow } from "../../lib/positionKinds"; import { runtimeApi, runtimeHost } from "./hostContext";

  📝 stateRuntime.ts
     Pfad: 📁 features / 📁 runtime-host / 📝 stateRuntime.ts
     Größe: 1.67 KB (1707 B)
     Geändert: 2026-06-16T11:56:10
     Überschriften: 0, Zeilen: 37, Wörter: 137, Zeichen: 1707
     Inhalt (Auszug): import { defaultCombinedWealthToggles } from "../../data/defaults"; import { clamp } from "../../lib/format"; import type { AppState, CombinedWealthDepotKey, StatutoryPensionScenarioId } from "../../types"; import { COMBINED_DEPOTS } from "../combined-wealth/config";


📁 features/self-employment
  📝 actions.ts
     Pfad: 📁 features / 📁 self-employment / 📝 actions.ts
     Größe: 668 B (668 B)
     Geändert: 2026-06-16T08:18:40
     Überschriften: 0, Zeilen: 20, Wörter: 24, Zeichen: 668
     Inhalt (Auszug): export { addSelfEmploymentContact, addSelfEmploymentInvoice, addSelfEmploymentProject, addSelfEmploymentTask, deleteSelfEmploymentProject, renameSelfEmploymentProject, selectSelfEmploymentIcon, selectSelfEmploymentProject, selectSelfEmploymentRoadmapArea, toggleSelfEmploymentLabelPicker, toggleSelfEmploymentProjectLabel, updateSelfEmploymentCollectionItemField, updateSelfEmploymentGanttCardField, updateSelfEmploymentGanttPhaseField, updateSelfEmploymentProject, updateSelfEmploymentProjectField, updateSelfEmploymentProjectListField } from "./controller"; export { toggleSelfEmploymentGanttPhaseFilter } from "./ganttController";

  📝 config.ts
     Pfad: 📁 features / 📁 self-employment / 📝 config.ts
     Größe: 933 B (933 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 28, Wörter: 84, Zeichen: 933
     Inhalt (Auszug): import type { SelfEmploymentRoadmapAreaId } from "./model";

  📝 controller.ts
     Pfad: 📁 features / 📁 self-employment / 📝 controller.ts
     Größe: 28.80 KB (29494 B)
     Geändert: 2026-06-16T12:51:27
     Überschriften: 0, Zeilen: 733, Wörter: 2271, Zeichen: 29494
     Inhalt (Auszug): import { createId, defaultSelfEmploymentState } from "../../data/defaults"; import { defaultBusinessIdeaCanvasForProject } from "../../domain/businessIdeaCanvas"; import { normalizeSelfEmploymentGanttPlan, normalizedGanttLabelId, orderedGanttLabels } from "../../domain/selfEmploymentGantt"; import { calculateReserveSummary } from "../../domain/reserveCalculator"; import type { IncomePlanningModel } from "../../domain/incomePlanning"; import { escapeHtml, intNumber, money } from "../../lib/format"; import { normalizePositionIcon, POSITION_ICONS, positionIconSvg } from "../../lib/positionIcons"; import type { AppState, BusinessIdeaCanvasShape, PlanningSettings, ReservePosition, SelfEmploymentGanttStartMode, SelfEmploymentProject } from "../../types"; import { selfEmploymentUiState } from "./ …

  📝 events.ts
     Pfad: 📁 features / 📁 self-employment / 📝 events.ts
     Größe: 8.90 KB (9114 B)
     Geändert: 2026-06-16T08:18:30
     Überschriften: 0, Zeilen: 213, Wörter: 665, Zeichen: 9114
     Inhalt (Auszug): import type { AppContext } from "../../app/contracts"; import { selfEmploymentUiState } from "./uiState"; import { addSelfEmploymentContact, addSelfEmploymentInvoice, addSelfEmploymentProject, addSelfEmploymentTask, deleteSelfEmploymentProject, hideSelfEmploymentIconPicker, removeSelfEmploymentCollectionItem, renameSelfEmploymentProject, selectSelfEmploymentIcon, selectSelfEmploymentProject, selectSelfEmploymentRoadmapArea, selfEmploymentControlValue, showSelfEmploymentIconPicker, toggleSelfEmploymentLabelPicker, toggleSelfEmploymentProjectLabel, updateSelfEmploymentCollectionItemField, updateSelfEmploymentGanttCardField, updateSelfEmploymentGanttPhaseField, updateSelfEmploymentProjectField, updateSelfEmploymentProjectListField } from "./controller"; import { closeSelfEmploymentGanttEditor …

  📝 feasibilityController.ts
     Pfad: 📁 features / 📁 self-employment / 📝 feasibilityController.ts
     Größe: 8.02 KB (8214 B)
     Geändert: 2026-06-16T12:45:58
     Überschriften: 0, Zeilen: 208, Wörter: 661, Zeichen: 8214
     Inhalt (Auszug): import { clamp, money } from "../../lib/format"; import type { SelfEmploymentFeasibility, SelfEmploymentInvoice, SelfEmploymentProject, SelfEmploymentProjectStatus, SelfEmploymentRiskLevel, SelfEmploymentRoadmapAreaId, SelfEmploymentTask } from "../../types"; import { SELF_EMPLOYMENT_ROADMAP_AREAS } from "./config";

  📝 ganttController.ts
     Pfad: 📁 features / 📁 self-employment / 📝 ganttController.ts
     Größe: 20.73 KB (21226 B)
     Geändert: 2026-06-16T08:19:10
     Überschriften: 0, Zeilen: 501, Wörter: 1888, Zeichen: 21225
     Inhalt (Auszug): import { businessIdeaCanvasNodeText } from "../../domain/businessIdeaCanvas"; import { buildSelfEmploymentProjectGantt, normalizeSelfEmploymentGanttPlan, normalizedGanttLabelId, orderedGanttLabels, visibleSelfEmploymentGanttRows, type SelfEmploymentGanttSummary } from "../../domain/selfEmploymentGantt"; import { clamp, escapeHtml, intNumber } from "../../lib/format"; import type { BusinessIdeaCanvasShape, JsonCanvasNode, SelfEmploymentGanttCardPlan, SelfEmploymentGanttPhase, SelfEmploymentProject } from "../../types"; import { selfEmploymentUiState } from "./uiState";

  📝 index.ts
     Pfad: 📁 features / 📁 self-employment / 📝 index.ts
     Größe: 1.49 KB (1521 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 56, Wörter: 72, Zeichen: 1521
     Inhalt (Auszug): import type { FeatureModule } from "../../app/contracts"; import { closeSelfEmploymentOverlays, onSelfEmploymentChange, onSelfEmploymentClick, onSelfEmploymentInput, onSelfEmploymentWindowKeyDown } from "./events";

  📝 model.ts
     Pfad: 📁 features / 📁 self-employment / 📝 model.ts
     Größe: 735 B (735 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 28, Wörter: 30, Zeichen: 735
     Inhalt (Auszug): export type { BusinessIdeaCanvas, BusinessIdeaCanvasEdgeDirection, BusinessIdeaCanvasMeta, BusinessIdeaCanvasNodeMeta, BusinessIdeaCanvasShape, BusinessIdeaCanvasViewport, JsonCanvasEdge, JsonCanvasNode, JsonCanvasSide, SelfEmploymentContact, SelfEmploymentContactStatus, SelfEmploymentFeasibility, SelfEmploymentGanttCardPlan, SelfEmploymentGanttPhase, SelfEmploymentGanttPlan, SelfEmploymentGanttStartMode, SelfEmploymentInvoice, SelfEmploymentInvoiceStatus, SelfEmploymentProject, SelfEmploymentProjectStatus, SelfEmploymentRiskLevel, SelfEmploymentRoadmapAreaId, SelfEmploymentState, SelfEmploymentTask, SelfEmploymentTaskPriority, SelfEmploymentTaskStatus } from "../../types";

  📝 renderFeasibility.ts
     Pfad: 📁 features / 📁 self-employment / 📝 renderFeasibility.ts
     Größe: 5.00 KB (5124 B)
     Geändert: 2026-06-16T12:46:30
     Überschriften: 0, Zeilen: 141, Wörter: 451, Zeichen: 5124
     Inhalt (Auszug): import { escapeHtml, intNumber, money } from "../../lib/format"; import type { SelfEmploymentProjectEvaluation } from "./feasibilityController"; import { hoursLabel, selfEmploymentFeasibilityLabel, selfEmploymentRiskLabel } from "./feasibilityController";

  📝 renderProjectCards.ts
     Pfad: 📁 features / 📁 self-employment / 📝 renderProjectCards.ts
     Größe: 4.21 KB (4312 B)
     Geändert: 2026-06-16T12:47:00
     Überschriften: 0, Zeilen: 89, Wörter: 395, Zeichen: 4312
     Inhalt (Auszug): import { escapeHtml, money } from "../../lib/format"; import { normalizePositionIcon, positionIconSvg } from "../../lib/positionIcons"; import type { SelfEmploymentProject } from "../../types"; import type { SelfEmploymentProjectEvaluation } from "./feasibilityController"; import { hoursLabel, selfEmploymentFeasibilityLabel, selfEmploymentStatusLabel } from "./feasibilityController"; import { SELF_EMPLOYMENT_LABEL_OPTIONS } from "./config"; import { selfEmploymentUiState } from "./uiState";

  📝 renderProjectDetails.ts
     Pfad: 📁 features / 📁 self-employment / 📝 renderProjectDetails.ts
     Größe: 19.33 KB (19789 B)
     Geändert: 2026-06-16T12:48:34
     Überschriften: 0, Zeilen: 430, Wörter: 1632, Zeichen: 19789
     Inhalt (Auszug): import { escapeHtml, intNumber, money } from "../../lib/format"; import { positionIconSvg } from "../../lib/positionIcons"; import type { SelfEmploymentProject, SelfEmploymentRoadmapAreaId } from "../../types"; import { renderBusinessCanvas } from "./business-canvas"; import type { SelfEmploymentProjectEvaluation } from "./feasibilityController"; import { hoursLabel, selfEmploymentFeasibilityLabel, selfEmploymentRoadmapAreaIdFromValue } from "./feasibilityController"; import { SELF_EMPLOYMENT_ROADMAP_AREAS } from "./config"; import { renderSelfEmploymentProjectGantt, selfEmploymentGanttPhaseFilterIds, selfEmploymentGanttPhaseNumber } from "./ganttController";

  📝 selectors.ts
     Pfad: 📁 features / 📁 self-employment / 📝 selectors.ts
     Größe: 58 B (58 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 1, Wörter: 4, Zeichen: 58
     Inhalt (Auszug): export { selfEmploymentProjectById } from "./controller";

  📝 styles.css
     Pfad: 📁 features / 📁 self-employment / 📝 styles.css
     Größe: 15.99 KB (16377 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 817, Wörter: 2166, Zeichen: 16377
     Inhalt (Auszug): .self-employment-dashboard { display: grid; gap: 16px; }

  📝 uiState.ts
     Pfad: 📁 features / 📁 self-employment / 📝 uiState.ts
     Größe: 550 B (550 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 16, Wörter: 50, Zeichen: 550
     Inhalt (Auszug): export type SelfEmploymentGanttEditor = | { projectId: string; type: "phase"; phaseId: string; top: number; left: number } | { projectId: string; type: "card"; cardId: string; top: number; left: number } | null;

  📝 view.ts
     Pfad: 📁 features / 📁 self-employment / 📝 view.ts
     Größe: 94 B (94 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 1, Wörter: 5, Zeichen: 94
     Inhalt (Auszug): export { renderSelfEmploymentDashboard, renderSelfEmploymentIconPicker } from "./controller";


📁 features/self-employment/business-canvas
  📝 canvasModelController.ts
     Pfad: 📁 features / 📁 self-employment / 📁 business-canvas / 📝 canvasModelController.ts
     Größe: 3.03 KB (3102 B)
     Geändert: 2026-06-16T11:23:40
     Überschriften: 0, Zeilen: 103, Wörter: 230, Zeichen: 3102
     Inhalt (Auszug): import { createId } from "../../../data/defaults"; import { businessIdeaCanvasEndsForDirection, snapBusinessIdeaCanvasValue } from "../../../domain/businessIdeaCanvas"; import { normalizeSelfEmploymentGanttPlan } from "../../../domain/selfEmploymentGantt"; import type { BusinessIdeaCanvasEdgeDirection, JsonCanvasEdge, JsonCanvasNode, JsonCanvasSide, SelfEmploymentProject } from "../../../types"; import { businessCanvasHost } from "./host";

  📝 controller.ts
     Pfad: 📁 features / 📁 self-employment / 📁 business-canvas / 📝 controller.ts
     Größe: 14.41 KB (14757 B)
     Geändert: 2026-06-16T11:29:42
     Überschriften: 0, Zeilen: 359, Wörter: 1039, Zeichen: 14757
     Inhalt (Auszug): import { createId } from "../../../data/defaults"; import { businessIdeaCanvasPaletteWithCustomColor, businessIdeaCanvasViewportForZoomAtPoint } from "../../../domain/businessIdeaCanvas"; import type { SelfEmploymentProject } from "../../../types"; import { businessCanvasProjectById, renderAll, updateBusinessIdeaCanvasProject } from "./canvasModelController"; import { cancelBusinessIdeaCanvasEdgeLabelEdit, commitBusinessIdeaCanvasEdgeLabelEdit, deleteBusinessIdeaCanvasSelectedEdge } from "./edgeController"; import { businessCanvasHost } from "./host"; import { deleteBusinessIdeaCanvasSelectedNode } from "./nodeController"; import { businessIdeaCanvasSelectedIds, copyBusinessIdeaCanvasSelection, pasteBusinessIdeaCanvasClipboard, selectBusinessIdeaCanvasNodes } from "./selectionController";

  📝 dragController.ts
     Pfad: 📁 features / 📁 self-employment / 📁 business-canvas / 📝 dragController.ts
     Größe: 18.21 KB (18648 B)
     Geändert: 2026-06-16T11:27:35
     Überschriften: 0, Zeilen: 441, Wörter: 1521, Zeichen: 18648
     Inhalt (Auszug): import { businessIdeaCanvasNodesInsideRect, canvasAnchorPoint, clampBusinessIdeaCanvasNodeSize, nearestBusinessIdeaCanvasEndpointForEdge, nearestBusinessIdeaCanvasNodeSide, snapBusinessIdeaCanvasValue } from "../../../domain/businessIdeaCanvas"; import { numberValue } from "../../../lib/format"; import type { JsonCanvasSide } from "../../../types"; import { businessCanvasProjectById, cssEscape, renderAll, updateBusinessIdeaCanvasProject } from "./canvasModelController"; import { addBusinessIdeaCanvasEdge, connectBusinessIdeaCanvasArmedNode, editBusinessIdeaCanvasEdgeLabel } from "./edgeController"; import { closeBusinessIdeaCanvasOverlays } from "./overlayController"; import { businessIdeaCanvasSelectedIds, clearBusinessIdeaCanvasSelection, selectBusinessIdeaCanvasNodes } from "./selection …

  📝 edgeController.ts
     Pfad: 📁 features / 📁 self-employment / 📁 business-canvas / 📝 edgeController.ts
     Größe: 5.49 KB (5623 B)
     Geändert: 2026-06-16T11:24:49
     Überschriften: 0, Zeilen: 148, Wörter: 422, Zeichen: 5623
     Inhalt (Auszug): import { businessIdeaCanvasEndsForDirection, nearestBusinessIdeaCanvasEndpointForEdge, nearestBusinessIdeaCanvasNodeSide } from "../../../domain/businessIdeaCanvas"; import type { BusinessIdeaCanvasEdgeDirection, JsonCanvasNode, JsonCanvasSide, SelfEmploymentProject } from "../../../types"; import { businessCanvasProjectById, createBusinessIdeaCanvasEdge, cssEscape, renderAll, updateBusinessIdeaCanvasProject } from "./canvasModelController"; import { closeBusinessIdeaCanvasOverlays } from "./overlayController"; import { businessCanvasUiState } from "./uiState";

  📝 events.ts
     Pfad: 📁 features / 📁 self-employment / 📁 business-canvas / 📝 events.ts
     Größe: 10.07 KB (10312 B)
     Geändert: 2026-06-16T07:58:41
     Überschriften: 0, Zeilen: 301, Wörter: 774, Zeichen: 10312
     Inhalt (Auszug): import { numberValue } from "../../../lib/format"; import { addBusinessIdeaCanvasGroupAtPoint, addBusinessIdeaCanvasNode, addBusinessIdeaCanvasNodeAtPoint, addBusinessIdeaCanvasNodeFromLine, alignBusinessIdeaCanvasSelection, applyBusinessIdeaCanvasPaletteColor, closeBusinessIdeaCanvasDropdowns, closeBusinessIdeaCanvasOverlays, closeBusinessIdeaCanvasPaletteEditor, copyBusinessIdeaCanvasSelection, createBusinessIdeaCanvasGroupFromSelection, deleteBusinessIdeaCanvasSelectedEdge, deleteBusinessIdeaCanvasSelectedNode, duplicateBusinessIdeaCanvasSelectedNode, editBusinessIdeaCanvasNode, editSelectedBusinessIdeaCanvasEdgeLabel, finishBusinessIdeaCanvasPointer, handleBusinessIdeaCanvasContextMenu, handleBusinessIdeaCanvasDoubleClick, handleBusinessIdeaCanvasFocusOut, handleBusinessIdeaCanvasKeyDo …

  📝 host.ts
     Pfad: 📁 features / 📁 self-employment / 📁 business-canvas / 📝 host.ts
     Größe: 787 B (787 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 26, Wörter: 64, Zeichen: 787
     Inhalt (Auszug): import type { AppState, SelfEmploymentProject } from "../../../types";

  📝 index.ts
     Pfad: 📁 features / 📁 self-employment / 📁 business-canvas / 📝 index.ts
     Größe: 1.36 KB (1392 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 37, Wörter: 67, Zeichen: 1392
     Inhalt (Auszug): import type { FeatureModule } from "../../../app/contracts"; import { closeBusinessCanvasOverlays, handleBusinessCanvasChange, handleBusinessCanvasClick, handleBusinessCanvasContextMenu, handleBusinessCanvasDblClick, handleBusinessCanvasFocusOut, handleBusinessCanvasInput, handleBusinessCanvasPointerDown, handleBusinessCanvasWheel, handleBusinessCanvasWindowKeyDown, handleBusinessCanvasWindowKeyUp, handleBusinessCanvasWindowPointerMove, handleBusinessCanvasWindowPointerUp } from "./events";

  📝 nodeController.ts
     Pfad: 📁 features / 📁 self-employment / 📁 business-canvas / 📝 nodeController.ts
     Größe: 12.08 KB (12370 B)
     Geändert: 2026-06-16T11:30:07
     Überschriften: 0, Zeilen: 293, Wörter: 968, Zeichen: 12370
     Inhalt (Auszug): import { createId } from "../../../data/defaults"; import { canvasAnchorPoint, createBusinessIdeaCanvasGroupMeta, createBusinessIdeaCanvasGroupNode, nearestBusinessIdeaCanvasNodeSide, snapBusinessIdeaCanvasValue } from "../../../domain/businessIdeaCanvas"; import type { BusinessIdeaCanvasShape, JsonCanvasNode } from "../../../types"; import { businessCanvasProjectById, createBusinessIdeaCanvasEdge, createBusinessIdeaCanvasTextNode, cssEscape, insertBusinessIdeaCanvasNodeIntoProject, renderAll, updateBusinessIdeaCanvasProject } from "./canvasModelController"; import { businessIdeaCanvasEndpointForLineMenuEdge } from "./edgeController"; import { businessCanvasHost } from "./host"; import { closeBusinessIdeaCanvasOverlays } from "./overlayController"; import { copyBusinessIdeaCanvasSelection,

  📝 overlayController.ts
     Pfad: 📁 features / 📁 self-employment / 📁 business-canvas / 📝 overlayController.ts
     Größe: 727 B (727 B)
     Geändert: 2026-06-16T11:23:40
     Überschriften: 0, Zeilen: 20, Wörter: 54, Zeichen: 727
     Inhalt (Auszug): import { businessCanvasUiState } from "./uiState"; import { renderAll } from "./canvasModelController";

  📝 selectionController.ts
     Pfad: 📁 features / 📁 self-employment / 📁 business-canvas / 📝 selectionController.ts
     Größe: 5.29 KB (5422 B)
     Geändert: 2026-06-16T11:24:14
     Überschriften: 0, Zeilen: 135, Wörter: 456, Zeichen: 5422
     Inhalt (Auszug): import { createId } from "../../../data/defaults"; import { businessIdeaCanvasBoundsForNodes, snapBusinessIdeaCanvasValue } from "../../../domain/businessIdeaCanvas"; import type { BusinessIdeaCanvasNodeMeta } from "../../../types"; import { businessCanvasProjectById, renderAll, updateBusinessIdeaCanvasProject } from "./canvasModelController"; import { businessCanvasHost } from "./host"; import { businessCanvasUiState } from "./uiState";

  📝 styles.css
     Pfad: 📁 features / 📁 self-employment / 📁 business-canvas / 📝 styles.css
     Größe: 19.04 KB (19496 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 913, Wörter: 2592, Zeichen: 19496
     Inhalt (Auszug): .business-canvas-editor { display: grid; gap: 12px; min-width: 0; }

  📝 uiState.ts
     Pfad: 📁 features / 📁 self-employment / 📁 business-canvas / 📝 uiState.ts
     Größe: 3.62 KB (3708 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 121, Wörter: 292, Zeichen: 3708
     Inhalt (Auszug): import type { BusinessIdeaCanvasNodeMeta, BusinessIdeaCanvasViewport, JsonCanvasNode, JsonCanvasSide } from "../../../types"; import type { BusinessIdeaCanvasContextMenuState, BusinessIdeaCanvasLineMenuState, BusinessIdeaCanvasPaletteEditorState, BusinessIdeaCanvasPalettePopoverState, BusinessIdeaCanvasSelectionRectState } from "./view";

  📝 view.ts
     Pfad: 📁 features / 📁 self-employment / 📁 business-canvas / 📝 view.ts
     Größe: 39.32 KB (40266 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 909, Wörter: 3910, Zeichen: 40220
     Inhalt (Auszug): import { BUSINESS_IDEA_CANVAS_COLOR_OPTIONS, BUSINESS_IDEA_CANVAS_HEIGHT, BUSINESS_IDEA_CANVAS_ORIGIN, BUSINESS_IDEA_CANVAS_WIDTH, businessIdeaCanvasBoundsForNodes, businessIdeaCanvasCardNodes, businessIdeaCanvasDirectionFromEdge, businessIdeaCanvasGanttRows, businessIdeaCanvasNodeText, businessIdeaCanvasPaletteRows, canvasAnchorPoint } from "../../../domain/businessIdeaCanvas"; import { escapeHtml, intNumber } from "../../../lib/format"; import type { BusinessIdeaCanvasEdgeDirection, BusinessIdeaCanvasMeta, BusinessIdeaCanvasPaletteColor, BusinessIdeaCanvasShape, JsonCanvasEdge, JsonCanvasNode, JsonCanvasSide, SelfEmploymentProject } from "../../../types";

  📝 viewportController.ts
     Pfad: 📁 features / 📁 self-employment / 📁 business-canvas / 📝 viewportController.ts
     Größe: 20.88 KB (21379 B)
     Geändert: 2026-06-16T07:57:43
     Überschriften: 0, Zeilen: 488, Wörter: 1992, Zeichen: 21379
     Inhalt (Auszug): import { BUSINESS_IDEA_CANVAS_DEFAULT_VIEWPORT, BUSINESS_IDEA_CANVAS_ORIGIN, businessIdeaCanvasViewportForZoomAtPoint, canvasAnchorPoint, nearestBusinessIdeaCanvasNodeSide, snapBusinessIdeaCanvasValue } from "../../../domain/businessIdeaCanvas"; import { normalizeSelfEmploymentGanttPlan } from "../../../domain/selfEmploymentGantt"; import { numberValue } from "../../../lib/format"; import type { BusinessIdeaCanvasViewport, JsonCanvasEdge, JsonCanvasNode, JsonCanvasSide, SelfEmploymentProject } from "../../../types"; import { businessCanvasHost } from "./host"; import { businessCanvasUiState, type BusinessIdeaCanvasConnectionDragState, type BusinessIdeaCanvasDragState, type BusinessIdeaCanvasPanDragState } from "./uiState";


📁 features/settings
  📝 index.ts
     Pfad: 📁 features / 📁 settings / 📝 index.ts
     Größe: 200 B (200 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 7, Wörter: 19, Zeichen: 200
     Inhalt (Auszug): import type { FeatureModule } from "../../app/contracts";

  📝 model.ts
     Pfad: 📁 features / 📁 settings / 📝 model.ts
     Größe: 76 B (76 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 1, Wörter: 7, Zeichen: 76
     Inhalt (Auszug): export type { AppUiState, PlanningSettings, ThemeMode } from "../../types";

  📝 styles.css
     Pfad: 📁 features / 📁 settings / 📝 styles.css
     Größe: 3.00 KB (3076 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 165, Wörter: 409, Zeichen: 3076
     Inhalt (Auszug): .app-settings { position: relative; }


📁 features/statutory-pension
  📝 index.ts
     Pfad: 📁 features / 📁 statutory-pension / 📝 index.ts
     Größe: 335 B (335 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 13, Wörter: 23, Zeichen: 335
     Inhalt (Auszug): import type { FeatureModule } from "../../app/contracts";

  📝 model.ts
     Pfad: 📁 features / 📁 statutory-pension / 📝 model.ts
     Größe: 159 B (159 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 6, Wörter: 8, Zeichen: 159
     Inhalt (Auszug): export type { StatutoryPensionIncomeMode, StatutoryPensionScenarioId, StatutoryPensionScenarioSettings, StatutoryPensionSettings } from "../../types";

  📝 styles.css
     Pfad: 📁 features / 📁 statutory-pension / 📝 styles.css
     Größe: 12.25 KB (12544 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 633, Wörter: 1647, Zeichen: 12544
     Inhalt (Auszug): .statutory-pension-panel { display: grid; gap: 12px; }


📁 lib
  📝 csv.ts
     Pfad: 📁 lib / 📝 csv.ts
     Größe: 279 B (279 B)
     Geändert: 2026-06-16T11:50:08
     Überschriften: 0, Zeilen: 3, Wörter: 21, Zeichen: 279
     Inhalt (Auszug): export { csvCell, detectCsvDelimiter, parseCsv, parseMoneyValue } from "./csv/parse"; export { exportPositionsCsv, exportYearTableCsv, positionsFromCsvRows } from "./csv/positionsCsv"; export { exportIncomePlanningCsv, incomePlanningFromCsvRows } from "./csv/incomePlanningCsv";

  📝 format.ts
     Pfad: 📁 lib / 📝 format.ts
     Größe: 3.08 KB (3155 B)
     Geändert: 2026-06-03T06:42:40
     Überschriften: 0, Zeilen: 95, Wörter: 343, Zeichen: 3151
     Inhalt (Auszug): import { MONTHS } from "../data/defaults"; import type { PayoutType, PositionFlow, PositionType } from "../types";

  📝 planningYears.ts
     Pfad: 📁 lib / 📝 planningYears.ts
     Größe: 2.41 KB (2463 B)
     Geändert: 2026-06-15T09:33:06
     Überschriften: 0, Zeilen: 60, Wörter: 200, Zeichen: 2463
     Inhalt (Auszug): import { defaultPlanningSettings } from "../data/defaults"; import type { PlanningYearSelection, ReservePosition } from "../types";

  📝 positionIcons.ts
     Pfad: 📁 lib / 📝 positionIcons.ts
     Größe: 11.56 KB (11834 B)
     Geändert: 2026-06-09T12:50:48
     Überschriften: 0, Zeilen: 294, Wörter: 2139, Zeichen: 11834
     Inhalt (Auszug): import { normalizeHeader } from "./format"; import { positionFlow } from "./positionKinds"; import type { ReservePosition } from "../types";

  📝 positionKinds.ts
     Pfad: 📁 lib / 📝 positionKinds.ts
     Größe: 4.52 KB (4632 B)
     Geändert: 2026-06-03T06:42:40
     Überschriften: 0, Zeilen: 117, Wörter: 403, Zeichen: 4632
     Inhalt (Auszug): import type { ExpensePositionType, IncomePositionType, PayoutType, PositionFlow, PositionTableMode, PositionType, ReservePosition } from "../types";

  📝 positionTableView.ts
     Pfad: 📁 lib / 📝 positionTableView.ts
     Größe: 13.28 KB (13597 B)
     Geändert: 2026-06-03T06:42:40
     Überschriften: 0, Zeilen: 376, Wörter: 1165, Zeichen: 13597
     Inhalt (Auszug): import { MONTHS } from "../data/defaults"; import { labelForPayout, labelForType, normalizeHeader, numberValue } from "./format"; import { normalizePositionIcon, positionIconLabel } from "./positionIcons"; import { positionMatchesTableCadence, positionTableMode, type PositionTableCadence, type PositionTableMode } from "./positionKinds"; import type { PositionTableFilter, PositionTableFilterColumn, PositionTableFilterOperator, PositionTableSort, PositionTableView, ReservePosition } from "../types";

  📝 storage.ts
     Pfad: 📁 lib / 📝 storage.ts
     Größe: 33 B (33 B)
     Geändert: 2026-06-16T08:03:25
     Überschriften: 0, Zeilen: 1, Wörter: 4, Zeichen: 33
     Inhalt (Auszug): export * from "./storage/index";


📁 lib/csv
  📝 incomePlanningCsv.ts
     Pfad: 📁 lib / 📁 csv / 📝 incomePlanningCsv.ts
     Größe: 31.26 KB (32006 B)
     Geändert: 2026-06-16T11:50:47
     Überschriften: 0, Zeilen: 839, Wörter: 2742, Zeichen: 32006
     Inhalt (Auszug): import { createId, defaultIncomePlanningState } from "../../data/defaults"; import { buildIncomePlanningHabit, buildIncomePlanningManualBlock, buildIncomePlanningWorkBlock, incomePlanningAverageSleepHours, incomePlanningDefaultManualColor, incomePlanningDefaultManualIcon, incomePlanningDefaultWorkColor, incomePlanningStripSlotPause, INCOME_PLANNING_WEEK_SCENARIO_IDS, INCOME_PLANNING_CATEGORY_CONFIGS, isIncomePlanningHabitChange, isIncomePlanningHabitDurationUnit, isIncomePlanningHabitStatus, isIncomePlanningHabitType, isIncomePlanningManualBlockType, isIncomePlanningPriority, isIncomePlanningWeekScenarioId, isIncomePlanningWeekday } from "../../domain/incomePlanning"; import { cleanText, clamp, formatCsvNumber, normalizeHeader } from "../format"; import { normalizePositionIcon } from "../p …

  📝 parse.ts
     Pfad: 📁 lib / 📁 csv / 📝 parse.ts
     Größe: 2.30 KB (2352 B)
     Geändert: 2026-06-16T11:50:38
     Überschriften: 0, Zeilen: 83, Wörter: 251, Zeichen: 2350
     Inhalt (Auszug): import { cleanText } from "../format";

  📝 positionsCsv.ts
     Pfad: 📁 lib / 📁 csv / 📝 positionsCsv.ts
     Größe: 16.11 KB (16497 B)
     Geändert: 2026-06-16T11:50:08
     Überschriften: 0, Zeilen: 459, Wörter: 1451, Zeichen: 16497
     Inhalt (Auszug): import { createId, defaultPlanningSettings, MONTHS } from "../../data/defaults"; import { calculateMonthlyRows } from "../../domain/reserveCalculator"; import { cleanText, clamp, formatCsvNumber, labelForPayout, labelForFlow, labelForType, monthName, normalizeHeader } from "../format"; import { defaultPositionIconForPosition, normalizePositionIcon, positionIconLabel } from "../positionIcons"; import { flowForType, isIncomeType, typeForFlow } from "../positionKinds"; import { positionPlanningYear } from "../planningYears"; import type { PlanningSettings, PayoutType, PositionCostBreakdownItem, PositionFlow, PositionType, ReservePosition } from "../../types"; import { csvCell, parseMoneyValue } from "./parse";


📁 lib/storage
  📝 index.ts
     Pfad: 📁 lib / 📁 storage / 📝 index.ts
     Größe: 313 B (313 B)
     Geändert: 2026-06-16T08:03:25
     Überschriften: 0, Zeilen: 12, Wörter: 23, Zeichen: 313
     Inhalt (Auszug): export { loadState } from "./loadState"; export { normalizeStoredState } from "./normalizeState"; export { saveState, resetStoredState } from "./saveState"; export { createVault, flushVaultSave, getVaultStatus, initializeStorage, reloadFromVault, selectVault, snapshotVault } from "./vaultRuntime";

  📝 legacyMigration.ts
     Pfad: 📁 lib / 📁 storage / 📝 legacyMigration.ts
     Größe: 2.72 KB (2784 B)
     Geändert: 2026-06-16T08:03:25
     Überschriften: 0, Zeilen: 70, Wörter: 172, Zeichen: 2784
     Inhalt (Auszug): import { defaultAppState, defaultCombinedWealthToggles, defaultIncomePlanningState, defaultIncomeTrackerState, defaultPositionTableViewState, defaultRealEstateFinancingSettings, defaultSelfEmploymentState, defaultStatutoryPensionSettings, defaultPlanningSettings } from "../../data/defaults"; import type { AppState } from "../../types"; import { normalizeLegacyInvestmentSettings } from "./normalizeInvestment"; import { normalizeAppUiState, normalizePlanningAccounts, normalizePlanningEndDate, normalizeThemeMode, planningEndDateFromInvestment, positionsForPlanningAccount, normalizeInvestmentByAccountId } from "./normalizePlanning"; import { migrateMonthlyNetIncomePosition, normalizePositions } from "./normalizePositions"; import { isRecord, numberOrDefault } from "./validators";

  📝 loadState.ts
     Pfad: 📁 lib / 📁 storage / 📝 loadState.ts
     Größe: 526 B (526 B)
     Geändert: 2026-06-16T08:03:25
     Überschriften: 0, Zeilen: 10, Wörter: 46, Zeichen: 526
     Inhalt (Auszug): import { defaultAppState } from "../../data/defaults"; import type { AppState } from "../../types"; import { APP_STORAGE_KEY as STORAGE_KEY, readFallbackStateValue } from "../vault/vaultFallback"; import { normalizeLegacyState, normalizeState } from "./normalizeState";

  📝 normalizeCombinedWealth.ts
     Pfad: 📁 lib / 📁 storage / 📝 normalizeCombinedWealth.ts
     Größe: 4.18 KB (4281 B)
     Geändert: 2026-06-16T08:03:25
     Überschriften: 0, Zeilen: 88, Wörter: 300, Zeichen: 4281
     Inhalt (Auszug): import { defaultCombinedWealthToggles } from "../../data/defaults"; import type { CombinedWealthDepotKey, CombinedWealthToggles, InvestmentSettings, PlanningAccount, RealEstateFinancingSettings } from "../../types"; import { normalizeStatutoryPensionScenarioId } from "./normalizeStatutoryPension"; import { booleanOrDefault, clampNumber, isRecord, numberOrDefault, stringArrayOrDefault } from "./validators";

  📝 normalizeIncomePlanning.ts
     Pfad: 📁 lib / 📁 storage / 📝 normalizeIncomePlanning.ts
     Größe: 21.58 KB (22095 B)
     Geändert: 2026-06-16T08:03:25
     Überschriften: 0, Zeilen: 529, Wörter: 1783, Zeichen: 22091
     Inhalt (Auszug): import { createId, defaultIncomePlanningState } from "../../data/defaults"; import { buildDefaultIncomePlanningSleepSlots, buildIncomePlanningManualBlock, buildIncomePlanningWorkBlock, defaultIncomePlanningAssumptions, INCOME_PLANNING_CATEGORY_IDS, INCOME_PLANNING_WEEK_SCENARIO_IDS, incomePlanningCategoryConfig, incomePlanningDefaultManualColor, incomePlanningDefaultManualIcon, incomePlanningDefaultWorkColor, incomePlanningSleepSlotDurationMinutes, incomePlanningStripSlotPause, isIncomePlanningHabitChange, isIncomePlanningHabitDurationUnit, isIncomePlanningHabitStatus, isIncomePlanningHabitType, isIncomePlanningManualBlockType, isIncomePlanningPriority, isIncomePlanningWeekScenarioId, isIncomePlanningWeekday } from "../../domain/incomePlanning"; import { normalizeIncomeTaxRuleLabel } from …

  📝 normalizeIncomeTracker.ts
     Pfad: 📁 lib / 📁 storage / 📝 normalizeIncomeTracker.ts
     Größe: 7.52 KB (7698 B)
     Geändert: 2026-06-16T08:03:25
     Überschriften: 0, Zeilen: 186, Wörter: 528, Zeichen: 7698
     Inhalt (Auszug): import { createId, defaultIncomeTrackerState, defaultPlanningSettings } from "../../data/defaults"; import { DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT } from "../../domain/incomeTracker"; import { normalizeIncomeTaxRuleLabel } from "../../domain/incomeTaxRules"; import type { CareerMilestone, CareerMilestoneImpact, IncomeEmploymentContext, IncomeMinijobType, IncomePerson, IncomeProjectionMode, IncomeStudentEmploymentMode, IncomeTaxAdjustment, IncomeTaxAdjustmentType, IncomeTaxDeductionField, IncomeTaxDeductionItems, IncomeTrackerSettings, IncomeTrackerState, IncomeYearEntry, IncomeYearEntrySource } from "../../types"; import { arrayOrEmpty, booleanOrDefault, isRecord, nullableNumberOrDefault, numberOrDefault, stringArrayOrDefault } from "./validators";

  📝 normalizeInvestment.ts
     Pfad: 📁 lib / 📁 storage / 📝 normalizeInvestment.ts
     Größe: 8.54 KB (8750 B)
     Geändert: 2026-06-16T08:03:25
     Überschriften: 0, Zeilen: 164, Wörter: 490, Zeichen: 8750
     Inhalt (Auszug): import { defaultInvestmentSettings } from "../../data/defaults"; import type { InvestmentDepotKey, InvestmentSettings } from "../../types"; import { booleanOrDefault, clampNumber, isRecord, numberOrDefault, stringArrayOrDefault } from "./validators";

  📝 normalizePlanning.ts
     Pfad: 📁 lib / 📁 storage / 📝 normalizePlanning.ts
     Größe: 10.23 KB (10480 B)
     Geändert: 2026-06-16T08:03:52
     Überschriften: 0, Zeilen: 281, Wörter: 812, Zeichen: 10480
     Inhalt (Auszug): import { createId, defaultAppUiState, defaultPlanningAccounts, defaultPlanningSettings, defaultInvestmentSettingsForNewAccount } from "../../data/defaults"; import type { AppSectionId, AppUiState, InvestmentSettings, PlanningAccount, PlanningSettings, ReservePosition, ThemeMode } from "../../types"; import { normalizeInvestmentSettings } from "./normalizeInvestment"; import { normalizePositions } from "./normalizePositions"; import { booleanOrDefault, isRecord, normalizePlanningYearSelection, numberOrDefault } from "./validators";

  📝 normalizePositions.ts
     Pfad: 📁 lib / 📁 storage / 📝 normalizePositions.ts
     Größe: 6.78 KB (6938 B)
     Geändert: 2026-06-16T08:03:25
     Überschriften: 0, Zeilen: 178, Wörter: 579, Zeichen: 6938
     Inhalt (Auszug): import { createId, defaultPlanningSettings } from "../../data/defaults"; import { defaultPositionIconForPosition, normalizePositionIcon } from "../positionIcons"; import { flowForType, isIncomeType, isPositionType, typeForFlow } from "../positionKinds"; import type { PlanningSettings, PositionCostBreakdownItem, PositionFlow, ReservePosition } from "../../types"; import { booleanOrDefault, isRecord, nullableNumberOrDefault, numberOrDefault, normalizePlanningYearSelection } from "./validators";

  📝 normalizePositionTable.ts
     Pfad: 📁 lib / 📁 storage / 📝 normalizePositionTable.ts
     Größe: 2.76 KB (2823 B)
     Geändert: 2026-06-16T08:03:25
     Überschriften: 0, Zeilen: 63, Wörter: 241, Zeichen: 2823
     Inhalt (Auszug): import { createId, defaultPositionTableViewState } from "../../data/defaults"; import { normalizePositionIcon } from "../positionIcons"; import { isPositionTableColumn, isPositionTableColumnInMode, isPositionTableMode, isPositionTableOperator, positionTableOperatorsForColumn } from "../positionTableView"; import type { PositionTableFilter, PositionTableMode, PositionTableView, PositionTableViewState } from "../../types"; import { isRecord, stringArrayOrDefault } from "./validators";

  📝 normalizeRealEstate.ts
     Pfad: 📁 lib / 📁 storage / 📝 normalizeRealEstate.ts
     Größe: 7.34 KB (7518 B)
     Geändert: 2026-06-16T08:03:25
     Überschriften: 0, Zeilen: 141, Wörter: 442, Zeichen: 7518
     Inhalt (Auszug): import { defaultRealEstateFinancingSettings, defaultRepaymentSourceToggles } from "../../data/defaults"; import type { CombinedWealthToggles, RealEstateFinancingSettings, RepaymentSourceToggle } from "../../types"; import { booleanOrDefault, isRecord, nullableNumberOrDefault, numberOrDefault, stringArrayOrDefault } from "./validators";

  📝 normalizeSelfEmployment.ts
     Pfad: 📁 lib / 📁 storage / 📝 normalizeSelfEmployment.ts
     Größe: 9.88 KB (10114 B)
     Geändert: 2026-06-16T08:03:25
     Überschriften: 0, Zeilen: 247, Wörter: 773, Zeichen: 10114
     Inhalt (Auszug): import { createId, defaultSelfEmploymentState } from "../../data/defaults"; import { businessIdeaCanvasFilePath, defaultBusinessIdeaCanvasForProject, normalizeBusinessIdeaCanvas, normalizeBusinessIdeaCanvasMeta } from "../../domain/businessIdeaCanvas"; import { normalizeSelfEmploymentGanttPlan } from "../../domain/selfEmploymentGantt"; import { normalizePositionIcon } from "../positionIcons"; import type { BusinessIdeaCanvasMeta, SelfEmploymentContact, SelfEmploymentContactStatus, SelfEmploymentInvoice, SelfEmploymentInvoiceStatus, SelfEmploymentProject, SelfEmploymentProjectStatus, SelfEmploymentRiskLevel, SelfEmploymentRoadmapAreaId, SelfEmploymentState, SelfEmploymentTask, SelfEmploymentTaskPriority, SelfEmploymentTaskStatus } from "../../types"; import { clampNumber, isRecord, nullable …

  📝 normalizeState.ts
     Pfad: 📁 lib / 📁 storage / 📝 normalizeState.ts
     Größe: 3.46 KB (3548 B)
     Geändert: 2026-06-16T08:03:25
     Überschriften: 0, Zeilen: 85, Wörter: 218, Zeichen: 3548
     Inhalt (Auszug): import { defaultAppState } from "../../data/defaults"; import type { AppState } from "../../types"; import { normalizeCombinedCashPositionIds, normalizeCombinedWealthToggles } from "./normalizeCombinedWealth"; import { normalizeIncomePlanningState } from "./normalizeIncomePlanning"; import { normalizeIncomeTrackerState } from "./normalizeIncomeTracker"; import { normalizeInvestmentSettings } from "./normalizeInvestment"; import { normalizeLegacyState } from "./legacyMigration"; import { hasPlanningEndDate, investmentForAccount, normalizeAppUiState, normalizeInvestmentByAccountId, normalizePlanningAccounts, normalizePlanningSettings, normalizeThemeMode, planningEndDateFromInvestment, positionsForPlanningAccount } from "./normalizePlanning"; import { normalizePositionTableViewState } from ". …

  📝 normalizeStatutoryPension.ts
     Pfad: 📁 lib / 📁 storage / 📝 normalizeStatutoryPension.ts
     Größe: 4.33 KB (4438 B)
     Geändert: 2026-06-16T08:03:25
     Überschriften: 0, Zeilen: 109, Wörter: 275, Zeichen: 4438
     Inhalt (Auszug): import { defaultStatutoryPensionSettings } from "../../data/defaults"; import { STATUTORY_PENSION_DEDUCTION_PERCENT_MAX } from "../../domain/statutoryPension"; import type { StatutoryPensionIncomeMode, StatutoryPensionScenarioId, StatutoryPensionScenarioSettings, StatutoryPensionSettings } from "../../types"; import { clampNumber, isRecord, numberOrDefault } from "./validators";

  📝 saveState.ts
     Pfad: 📁 lib / 📁 storage / 📝 saveState.ts
     Größe: 529 B (529 B)
     Geändert: 2026-06-16T08:03:25
     Überschriften: 0, Zeilen: 15, Wörter: 48, Zeichen: 529
     Inhalt (Auszug): import { defaultAppState } from "../../data/defaults"; import type { AppState } from "../../types"; import { saveFallbackStateValue } from "../vault/vaultFallback"; import { stageVaultSave } from "./vaultRuntime";

  📝 storageKeys.ts
     Pfad: 📁 lib / 📁 storage / 📝 storageKeys.ts
     Größe: 73 B (73 B)
     Geändert: 2026-06-16T08:03:25
     Überschriften: 0, Zeilen: 1, Wörter: 7, Zeichen: 73
     Inhalt (Auszug): export { APP_STORAGE_KEY as STORAGE_KEY } from "../vault/vaultFallback";

  📝 validators.ts
     Pfad: 📁 lib / 📁 storage / 📝 validators.ts
     Größe: 1.49 KB (1523 B)
     Geändert: 2026-06-16T08:03:25
     Überschriften: 0, Zeilen: 38, Wörter: 167, Zeichen: 1523
     Inhalt (Auszug): export function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }

  📝 vaultRuntime.ts
     Pfad: 📁 lib / 📁 storage / 📝 vaultRuntime.ts
     Größe: 6.70 KB (6861 B)
     Geändert: 2026-06-16T08:03:25
     Überschriften: 0, Zeilen: 227, Wörter: 550, Zeichen: 6861
     Inhalt (Auszug): import { defaultAppState } from "../../data/defaults"; import type { AppState } from "../../types"; import { readVaultFallbackMetadata, saveFallbackStateValue, saveVaultFallbackMetadata } from "../vault/vaultFallback"; import { createVaultSnapshot, isVaultRuntimeAvailable, pickVaultDirectory, profilePath as vaultProfilePath, readVaultState, writeVaultState } from "../vault/vaultStorage"; import type { VaultRuntimeState, VaultSnapshotResult } from "../vault/vaultTypes"; import { loadState } from "./loadState"; import { normalizeState } from "./normalizeState";


📁 lib/vault
  📝 vaultFallback.ts
     Pfad: 📁 lib / 📁 vault / 📝 vaultFallback.ts
     Größe: 1.59 KB (1628 B)
     Geändert: 2026-06-15T06:25:48
     Überschriften: 0, Zeilen: 46, Wörter: 155, Zeichen: 1628
     Inhalt (Auszug): export const APP_STORAGE_KEY = "blobfin.reserveCalculator.v1"; export const LEGACY_APP_STORAGE_KEY = "jahreskalkulatorState"; export const VAULT_FALLBACK_METADATA_KEY = "blobfin.vault.v1";

  📝 vaultManifest.ts
     Pfad: 📁 lib / 📁 vault / 📝 vaultManifest.ts
     Größe: 1.91 KB (1951 B)
     Geändert: 2026-06-15T06:25:48
     Überschriften: 0, Zeilen: 63, Wörter: 173, Zeichen: 1951
     Inhalt (Auszug): import { VAULT_APP_NAME, VAULT_DATA_FILE_PATHS, VAULT_PROFILE_FOLDER, VAULT_VERSION, type VaultDataFileKey, type VaultManifest } from "./vaultTypes";

  📝 vaultMigration.ts
     Pfad: 📁 lib / 📁 vault / 📝 vaultMigration.ts
     Größe: 214 B (214 B)
     Geändert: 2026-06-15T06:25:48
     Überschriften: 0, Zeilen: 6, Wörter: 18, Zeichen: 214
     Inhalt (Auszug): import { parseVaultManifest } from "./vaultManifest"; import type { VaultManifest } from "./vaultTypes";

  📝 vaultSerializer.ts
     Pfad: 📁 lib / 📁 vault / 📝 vaultSerializer.ts
     Größe: 7.83 KB (8017 B)
     Geändert: 2026-06-15T06:25:48
     Überschriften: 0, Zeilen: 171, Wörter: 583, Zeichen: 8017
     Inhalt (Auszug): import { defaultAppState } from "../../data/defaults"; import { serializeBusinessIdeaCanvas } from "../../domain/businessIdeaCanvas"; import type { AppState, IncomePlanningState, IncomeTrackerState } from "../../types"; import type { VaultDataFiles } from "./vaultTypes";

  📝 vaultStorage.ts
     Pfad: 📁 lib / 📁 vault / 📝 vaultStorage.ts
     Größe: 8.17 KB (8370 B)
     Geändert: 2026-06-15T06:25:48
     Überschriften: 0, Zeilen: 215, Wörter: 759, Zeichen: 8370
     Inhalt (Auszug): import type { AppState } from "../../types"; import { parseBusinessIdeaCanvasFile, serializeBusinessIdeaCanvas } from "../../domain/businessIdeaCanvas"; import { createVaultManifest, updateVaultManifestTimestamp } from "./vaultManifest"; import { migrateVaultManifest } from "./vaultMigration"; import { deserializeVaultState, serializeVaultState } from "./vaultSerializer"; import { VAULT_DATA_FILE_KEYS, VAULT_MANIFEST_FILENAME, VAULT_PROFILE_FOLDER, type VaultDataFiles, type VaultManifest, type VaultReadResult, type VaultSnapshotResult, type VaultWriteResult } from "./vaultTypes";

  📝 vaultTypes.ts
     Pfad: 📁 lib / 📁 vault / 📝 vaultTypes.ts
     Größe: 3.24 KB (3321 B)
     Geändert: 2026-06-15T06:25:48
     Überschriften: 0, Zeilen: 106, Wörter: 273, Zeichen: 3321
     Inhalt (Auszug): import type { AppState } from "../../types";


📁 styles
  📝 base.css
     Pfad: 📁 styles / 📝 base.css
     Größe: 227 B (227 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 18, Wörter: 30, Zeichen: 227
     Inhalt (Auszug): body { margin: 0; background: var(--page); color: var(--text); font-family: "Manrope", "Avenir Next", "Segoe UI", sans-serif; line-height: 1.45; }

  📝 index.css
     Pfad: 📁 styles / 📝 index.css
     Größe: 1.29 KB (1322 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 27, Wörter: 158, Zeichen: 1322
     Inhalt (Auszug): @layer tokens, reset, base, layout, components, features, utilities, responsive;

  📝 layout.css
     Pfad: 📁 styles / 📝 layout.css
     Größe: 9.05 KB (9268 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 546, Wörter: 1238, Zeichen: 9268
     Inhalt (Auszug): .app-header { display: flex; align-items: end; justify-content: space-between; gap: 24px; max-width: 1680px; margin: 0 auto; padding: 30px 20px 16px; }

  📝 reset.css
     Pfad: 📁 styles / 📝 reset.css
     Größe: 75 B (75 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 8, Wörter: 8, Zeichen: 75
     Inhalt (Auszug): box-sizing: border-box; }

  📝 responsive.css
     Pfad: 📁 styles / 📝 responsive.css
     Größe: 7.94 KB (8130 B)
     Geändert: 2026-06-16T06:28:47
     Titel: investmentChart,
     Überschriften: 4, Zeilen: 438, Wörter: 967, Zeichen: 8130
     Inhalt (Auszug): @media (max-width: 1240px) { .investment-grid { grid-template-columns: 1fr; } }

  📝 tokens.css
     Pfad: 📁 styles / 📝 tokens.css
     Größe: 1.35 KB (1383 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 58, Wörter: 171, Zeichen: 1383
     Inhalt (Auszug): :root { color-scheme: light;

  📝 utilities.css
     Pfad: 📁 styles / 📝 utilities.css
     Größe: 169 B (169 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 11, Wörter: 23, Zeichen: 169
     Inhalt (Auszug): .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }


📁 styles/components
  📝 buttons.css
     Pfad: 📁 styles / 📁 components / 📝 buttons.css
     Größe: 1.41 KB (1440 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 90, Wörter: 181, Zeichen: 1440
     Inhalt (Auszug): .button { display: inline-flex; align-items: center; justify-content: center; min-height: 38px; border-radius: 6px; background: var(--accent); color: #fff; padding: 9px 12px; font-weight: 800; cursor: pointer; }

  📝 details.css
     Pfad: 📁 styles / 📁 components / 📝 details.css
     Größe: 1.34 KB (1375 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 81, Wörter: 182, Zeichen: 1375
     Inhalt (Auszug): .include-item { display: grid; grid-template-columns: auto 34px minmax(0, 1fr); gap: 10px; align-items: center; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-soft); padding: 10px; }

  📝 fields.css
     Pfad: 📁 styles / 📁 components / 📝 fields.css
     Größe: 1.27 KB (1301 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 79, Wörter: 175, Zeichen: 1301
     Inhalt (Auszug): .field-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }

  📝 popovers.css
     Pfad: 📁 styles / 📁 components / 📝 popovers.css
     Größe: 2.46 KB (2524 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 142, Wörter: 350, Zeichen: 2524
     Inhalt (Auszug): .position-icon-picker { position: fixed; z-index: 120; width: min(320px, calc(100vw - 24px)); max-height: min(360px, calc(100vh - 24px)); overflow: auto; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); box-shadow: 0 18px 44px rgba(31, 37, 40, 0.2); padding: 10px; }


📁 tests
  📝 accountYearTables.test.ts
     Pfad: 📁 tests / 📝 accountYearTables.test.ts
     Größe: 3.33 KB (3411 B)
     Geändert: 2026-06-08T06:22:01
     Überschriften: 0, Zeilen: 119, Wörter: 353, Zeichen: 3411
     Inhalt (Auszug): import { describe, expect, it } from "vitest";

  📝 appShell.test.ts
     Pfad: 📁 tests / 📝 appShell.test.ts
     Größe: 8.19 KB (8383 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 235, Wörter: 709, Zeichen: 8383
     Inhalt (Auszug): /// <reference types="vite/client" />

  📝 architectureGuards.test.ts
     Pfad: 📁 tests / 📝 architectureGuards.test.ts
     Größe: 9.01 KB (9227 B)
     Geändert: 2026-06-16T14:02:20
     Überschriften: 0, Zeilen: 259, Wörter: 949, Zeichen: 9227
     Inhalt (Auszug): /// <reference types="vite/client" />

  📝 businessIdeaCanvas.test.ts
     Pfad: 📁 tests / 📝 businessIdeaCanvas.test.ts
     Größe: 12.01 KB (12296 B)
     Geändert: 2026-06-15T06:25:48
     Überschriften: 0, Zeilen: 344, Wörter: 1243, Zeichen: 12296
     Inhalt (Auszug): import { describe, expect, it } from "vitest";

  📝 combinedWealth.test.ts
     Pfad: 📁 tests / 📝 combinedWealth.test.ts
     Größe: 32.17 KB (32940 B)
     Geändert: 2026-06-15T06:25:48
     Überschriften: 0, Zeilen: 1013, Wörter: 2546, Zeichen: 32940
     Inhalt (Auszug): import { describe, expect, it } from "vitest";

  📝 followUpUi.test.ts
     Pfad: 📁 tests / 📝 followUpUi.test.ts
     Größe: 52.24 KB (53493 B)
     Geändert: 2026-06-16T14:05:09
     Überschriften: 0, Zeilen: 922, Wörter: 4948, Zeichen: 53491
     Inhalt (Auszug): /// <reference types="vite/client" />

  📝 incomeAnalysis.test.ts
     Pfad: 📁 tests / 📝 incomeAnalysis.test.ts
     Größe: 6.05 KB (6197 B)
     Geändert: 2026-06-02T10:39:01
     Überschriften: 0, Zeilen: 186, Wörter: 543, Zeichen: 6197
     Inhalt (Auszug): import { describe, expect, it } from "vitest";

  📝 incomePlanning.test.ts
     Pfad: 📁 tests / 📝 incomePlanning.test.ts
     Größe: 25.31 KB (25914 B)
     Geändert: 2026-06-15T06:25:48
     Überschriften: 0, Zeilen: 766, Wörter: 2289, Zeichen: 25914
     Inhalt (Auszug): import { describe, expect, it } from "vitest";

  📝 incomeTracker.test.ts
     Pfad: 📁 tests / 📝 incomeTracker.test.ts
     Größe: 15.68 KB (16058 B)
     Geändert: 2026-06-08T06:22:01
     Überschriften: 0, Zeilen: 449, Wörter: 1325, Zeichen: 16057
     Inhalt (Auszug): import { describe, expect, it } from "vitest";

  📝 investmentCalculator.test.ts
     Pfad: 📁 tests / 📝 investmentCalculator.test.ts
     Größe: 21.55 KB (22064 B)
     Geändert: 2026-06-15T06:25:48
     Überschriften: 0, Zeilen: 532, Wörter: 1946, Zeichen: 22064
     Inhalt (Auszug): import { describe, expect, it } from "vitest";

  📝 investmentContributions.test.ts
     Pfad: 📁 tests / 📝 investmentContributions.test.ts
     Größe: 4.65 KB (4757 B)
     Geändert: 2026-06-15T06:25:48
     Überschriften: 0, Zeilen: 104, Wörter: 419, Zeichen: 4757
     Inhalt (Auszug): import { describe, expect, it } from "vitest";

  📝 nodeFs.d.ts
     Pfad: 📁 tests / 📝 nodeFs.d.ts
     Größe: 107 B (107 B)
     Geändert: 2026-06-15T06:32:11
     Überschriften: 0, Zeilen: 3, Wörter: 13, Zeichen: 107
     Inhalt (Auszug): declare module "node:fs" { export function readFileSync(path: string | URL, encoding: "utf8"): string; }

  📝 planningYears.test.ts
     Pfad: 📁 tests / 📝 planningYears.test.ts
     Größe: 4.19 KB (4288 B)
     Geändert: 2026-06-15T09:34:50
     Überschriften: 0, Zeilen: 119, Wörter: 410, Zeichen: 4288
     Inhalt (Auszug): import { describe, expect, it } from "vitest";

  📝 positionTableView.test.ts
     Pfad: 📁 tests / 📝 positionTableView.test.ts
     Größe: 15.30 KB (15666 B)
     Geändert: 2026-06-09T12:52:21
     Überschriften: 0, Zeilen: 339, Wörter: 1412, Zeichen: 15666
     Inhalt (Auszug): import { describe, expect, it } from "vitest";

  📝 realEstateCalculator.test.ts
     Pfad: 📁 tests / 📝 realEstateCalculator.test.ts
     Größe: 17.64 KB (18063 B)
     Geändert: 2026-05-28T06:40:57
     Überschriften: 0, Zeilen: 487, Wörter: 1665, Zeichen: 18063
     Inhalt (Auszug): import { describe, expect, it } from "vitest";

  📝 reserveCalculator.test.ts
     Pfad: 📁 tests / 📝 reserveCalculator.test.ts
     Größe: 24.00 KB (24581 B)
     Geändert: 2026-06-11T08:49:03
     Überschriften: 0, Zeilen: 714, Wörter: 2417, Zeichen: 24581
     Inhalt (Auszug): import { describe, expect, it } from "vitest";

  📝 selfEmploymentGantt.test.ts
     Pfad: 📁 tests / 📝 selfEmploymentGantt.test.ts
     Größe: 10.20 KB (10449 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 250, Wörter: 1052, Zeichen: 10449
     Inhalt (Auszug): import { describe, expect, it } from "vitest";

  📝 statutoryPension.test.ts
     Pfad: 📁 tests / 📝 statutoryPension.test.ts
     Größe: 20.86 KB (21356 B)
     Geändert: 2026-06-15T06:25:48
     Überschriften: 0, Zeilen: 604, Wörter: 1634, Zeichen: 21356
     Inhalt (Auszug): import { describe, expect, it } from "vitest";

  📝 storage.test.ts
     Pfad: 📁 tests / 📝 storage.test.ts
     Größe: 45.00 KB (46081 B)
     Geändert: 2026-06-16T06:28:47
     Überschriften: 0, Zeilen: 1272, Wörter: 3898, Zeichen: 46081
     Inhalt (Auszug): import { describe, expect, it } from "vitest";

  📝 vault.test.ts
     Pfad: 📁 tests / 📝 vault.test.ts
     Größe: 7.19 KB (7363 B)
     Geändert: 2026-06-15T06:25:48
     Überschriften: 0, Zeilen: 192, Wörter: 717, Zeichen: 7363
     Inhalt (Auszug): import { describe, expect, it } from "vitest";


📁 views
  📝 accountYearTables.ts
     Pfad: 📁 views / 📝 accountYearTables.ts
     Größe: 6.79 KB (6952 B)
     Geändert: 2026-05-27T14:39:12
     Überschriften: 0, Zeilen: 166, Wörter: 643, Zeichen: 6952
     Inhalt (Auszug): import { calculateReserveSummary, calculateYearTableFooterValue } from "../domain/reserveCalculator"; import { escapeHtml, intNumber, makeHeaderLabel, money } from "../lib/format"; import { normalizePositionIcon, positionIconSvg } from "../lib/positionIcons"; import type { PlanningAccount, PlanningAccountType, PlanningSettings, ReservePosition, ReserveSummary } from "../types";

  📝 formControlsTemplate.ts
     Pfad: 📁 views / 📝 formControlsTemplate.ts
     Größe: 11.83 KB (12119 B)
     Geändert: 2026-06-16T11:46:38
     Überschriften: 0, Zeilen: 317, Wörter: 1292, Zeichen: 12119
     Inhalt (Auszug): import { MONTHS } from "../data/defaults"; import { labelForPayout } from "../lib/format"; import { normalizePositionIcon, positionIconLabel, positionIconSvg } from "../lib/positionIcons"; import { positionFlow } from "../lib/positionKinds"; import type { InvestmentSettings, ReservePosition } from "../types";

  📝 homeTemplate.ts
     Pfad: 📁 views / 📝 homeTemplate.ts
     Größe: 10.53 KB (10785 B)
     Geändert: 2026-06-16T11:46:38
     Überschriften: 0, Zeilen: 290, Wörter: 1090, Zeichen: 10785
     Inhalt (Auszug): import { dateField, numberField } from "./formControlsTemplate";

  📝 investmentChart.ts
     Pfad: 📁 views / 📝 investmentChart.ts
     Größe: 14.51 KB (14860 B)
     Geändert: 2026-05-26T11:38:31
     Überschriften: 0, Zeilen: 473, Wörter: 1513, Zeichen: 14860
     Inhalt (Auszug): import type { AssetProjection, AssetProjectionPoint } from "../types";

  📝 moduleTopBarTemplate.ts
     Pfad: 📁 views / 📝 moduleTopBarTemplate.ts
     Größe: 841 B (841 B)
     Geändert: 2026-06-16T11:46:38
     Überschriften: 0, Zeilen: 25, Wörter: 82, Zeichen: 841
     Inhalt (Auszug): export interface ModuleTopBarAction { label: string; action: string; className?: string; }

  📝 statutoryPensionView.ts
     Pfad: 📁 views / 📝 statutoryPensionView.ts
     Größe: 24.80 KB (25400 B)
     Geändert: 2026-06-15T06:25:48
     Überschriften: 0, Zeilen: 545, Wörter: 2179, Zeichen: 25400
     Inhalt (Auszug): import { STATUTORY_PENSION_DEDUCTION_PERCENT_MAX, type StatutoryPensionModel } from "../domain/statutoryPension"; import { escapeHtml, intNumber, money, percent } from "../lib/format"; import type { StatutoryPensionScenarioId, StatutoryPensionSettings } from "../types";

  📝 templates.ts
     Pfad: 📁 views / 📝 templates.ts
     Größe: 48.94 KB (50110 B)
     Geändert: 2026-06-16T11:47:37
     Überschriften: 0, Zeilen: 887, Wörter: 4609, Zeichen: 50110
     Inhalt (Auszug): import { chartMetric, combinedModuleIcon, dateField, detailLine, numberField, rangeField, realEstateAssumptionControl, realEstateBooleanField, realEstateNumberField, retirementAgeField, toolbarIconButton, withdrawalGainMetric } from "./formControlsTemplate"; import { renderHomeTemplate } from "./homeTemplate"; import { moduleTopBar } from "./moduleTopBarTemplate";

  📝 wealthCharts.ts
     Pfad: 📁 views / 📝 wealthCharts.ts
     Größe: 25.24 KB (25846 B)
     Geändert: 2026-06-08T14:28:59
     Überschriften: 0, Zeilen: 649, Wörter: 2367, Zeichen: 25846
     Inhalt (Auszug): import type { CombinedWealthYear, RealEstateFinancingYear } from "../types"; import { escapeHtml } from "../lib/format";


=== Ordnerbaum (Quelle, nur ausgewählte Typen) ===

📁 .
├── 📁 .summary
│   └── 📝 index.json
├── 📁 api
│   └── 📝 backendClient.ts
├── 📁 app
│   ├── 📁 store
│   │   ├── 📝 actions.ts
│   │   ├── 📝 appStore.ts
│   │   ├── 📝 migrations.ts
│   │   ├── 📝 persistence.ts
│   │   └── 📝 selectors.ts
│   ├── 📝 appController.ts
│   ├── 📝 bootstrap.ts
│   ├── 📝 contracts.ts
│   ├── 📝 controllerRuntime.ts
│   ├── 📝 events.ts
│   ├── 📝 renderScheduler.ts
│   ├── 📝 router.ts
│   └── 📝 shell.ts
├── 📁 assets
│   └── 📁 pdf-export
├── 📁 data
│   └── 📝 defaults.ts
├── 📁 domain
│   ├── 📝 assetProjection.ts
│   ├── 📝 businessIdeaCanvas.ts
│   ├── 📝 combinedWealth.ts
│   ├── 📝 incomeAnalysis.ts
│   ├── 📝 incomeLabels.ts
│   ├── 📝 incomePlanning.ts
│   ├── 📝 incomeTaxRules.ts
│   ├── 📝 incomeTracker.ts
│   ├── 📝 investmentCalculator.ts
│   ├── 📝 investmentContributions.ts
│   ├── 📝 realEstateCalculator.ts
│   ├── 📝 reserveCalculator.ts
│   ├── 📝 retirementDepot.ts
│   ├── 📝 selfEmploymentGantt.ts
│   └── 📝 statutoryPension.ts
├── 📁 features
│   ├── 📁 combined-wealth
│   │   ├── 📝 config.ts
│   │   ├── 📝 index.ts
│   │   ├── 📝 model.ts
│   │   └── 📝 styles.css
│   ├── 📁 income-planning
│   │   ├── 📁 styles
│   │   │   ├── 📝 calendar.css
│   │   │   ├── 📝 dialogs.css
│   │   │   ├── 📝 habits.css
│   │   │   ├── 📝 index.css
│   │   │   ├── 📝 layout.css
│   │   │   ├── 📝 responsive.css
│   │   │   └── 📝 stamps.css
│   │   ├── 📝 actions.ts
│   │   ├── 📝 calendarDragController.ts
│   │   ├── 📝 config.ts
│   │   ├── 📝 controller.ts
│   │   ├── 📝 dialogController.ts
│   │   ├── 📝 events.ts
│   │   ├── 📝 host.ts
│   │   ├── 📝 index.ts
│   │   ├── 📝 model.ts
│   │   ├── 📝 planningSanitizer.ts
│   │   ├── 📝 renderController.ts
│   │   ├── 📝 selectors.ts
│   │   ├── 📝 shared.ts
│   │   ├── 📝 sleepSlotController.ts
│   │   ├── 📝 stampPlannerController.ts
│   │   ├── 📝 stampPopupController.ts
│   │   ├── 📝 styles.css
│   │   ├── 📝 uiState.ts
│   │   ├── 📝 view.ts
│   │   └── 📝 weekScenarioController.ts
│   ├── 📁 income-stamp-planner
│   │   ├── 📝 index.ts
│   │   ├── 📝 model.ts
│   │   └── 📝 styles.css
│   ├── 📁 income-tracker
│   │   ├── 📁 styles
│   │   │   ├── 📝 analysis.css
│   │   │   ├── 📝 charts.css
│   │   │   ├── 📝 index.css
│   │   │   ├── 📝 tax-dialog.css
│   │   │   └── 📝 tracker.css
│   │   ├── 📝 actions.ts
│   │   ├── 📝 chartController.ts
│   │   ├── 📝 config.ts
│   │   ├── 📝 controller.ts
│   │   ├── 📝 entriesController.ts
│   │   ├── 📝 events.ts
│   │   ├── 📝 exportController.ts
│   │   ├── 📝 index.ts
│   │   ├── 📝 labelPickerController.ts
│   │   ├── 📝 milestoneController.ts
│   │   ├── 📝 model.ts
│   │   ├── 📝 renderAnalysis.ts
│   │   ├── 📝 selectors.ts
│   │   ├── 📝 styles.css
│   │   ├── 📝 taxDialogController.ts
│   │   ├── 📝 uiState.ts
│   │   └── 📝 view.ts
│   ├── 📁 investment
│   │   ├── 📝 config.ts
│   │   ├── 📝 index.ts
│   │   ├── 📝 model.ts
│   │   └── 📝 styles.css
│   ├── 📁 planning
│   │   ├── 📝 index.ts
│   │   ├── 📝 model.ts
│   │   └── 📝 styles.css
│   ├── 📁 positions
│   │   ├── 📝 index.ts
│   │   ├── 📝 model.ts
│   │   └── 📝 styles.css
│   ├── 📁 real-estate
│   │   ├── 📝 index.ts
│   │   ├── 📝 model.ts
│   │   └── 📝 styles.css
│   ├── 📁 runtime-host
│   │   ├── 📝 combinedWealthRuntime.ts
│   │   ├── 📝 controller.ts
│   │   ├── 📝 hostContext.ts
│   │   ├── 📝 incomeRuntime.ts
│   │   ├── 📝 index.ts
│   │   ├── 📝 investmentRuntime.ts
│   │   ├── 📝 pensionRuntime.ts
│   │   ├── 📝 planningRuntime.ts
│   │   ├── 📝 positionRuntime.ts
│   │   ├── 📝 realEstateRuntime.ts
│   │   ├── 📝 renderRuntime.ts
│   │   ├── 📝 routeRuntime.ts
│   │   ├── 📝 runtimeDom.ts
│   │   ├── 📝 selfEmploymentRuntime.ts
│   │   ├── 📝 settingsRuntime.ts
│   │   └── 📝 stateRuntime.ts
│   ├── 📁 self-employment
│   │   ├── 📁 business-canvas
│   │   │   ├── 📝 canvasModelController.ts
│   │   │   ├── 📝 controller.ts
│   │   │   ├── 📝 dragController.ts
│   │   │   ├── 📝 edgeController.ts
│   │   │   ├── 📝 events.ts
│   │   │   ├── 📝 host.ts
│   │   │   ├── 📝 index.ts
│   │   │   ├── 📝 nodeController.ts
│   │   │   ├── 📝 overlayController.ts
│   │   │   ├── 📝 selectionController.ts
│   │   │   ├── 📝 styles.css
│   │   │   ├── 📝 uiState.ts
│   │   │   ├── 📝 view.ts
│   │   │   └── 📝 viewportController.ts
│   │   ├── 📝 actions.ts
│   │   ├── 📝 config.ts
│   │   ├── 📝 controller.ts
│   │   ├── 📝 events.ts
│   │   ├── 📝 feasibilityController.ts
│   │   ├── 📝 ganttController.ts
│   │   ├── 📝 index.ts
│   │   ├── 📝 model.ts
│   │   ├── 📝 renderFeasibility.ts
│   │   ├── 📝 renderProjectCards.ts
│   │   ├── 📝 renderProjectDetails.ts
│   │   ├── 📝 selectors.ts
│   │   ├── 📝 styles.css
│   │   ├── 📝 uiState.ts
│   │   └── 📝 view.ts
│   ├── 📁 settings
│   │   ├── 📝 index.ts
│   │   ├── 📝 model.ts
│   │   └── 📝 styles.css
│   ├── 📁 statutory-pension
│   │   ├── 📝 index.ts
│   │   ├── 📝 model.ts
│   │   └── 📝 styles.css
│   └── 📝 index.ts
├── 📁 lib
│   ├── 📁 csv
│   │   ├── 📝 incomePlanningCsv.ts
│   │   ├── 📝 parse.ts
│   │   └── 📝 positionsCsv.ts
│   ├── 📁 storage
│   │   ├── 📝 index.ts
│   │   ├── 📝 legacyMigration.ts
│   │   ├── 📝 loadState.ts
│   │   ├── 📝 normalizeCombinedWealth.ts
│   │   ├── 📝 normalizeIncomePlanning.ts
│   │   ├── 📝 normalizeIncomeTracker.ts
│   │   ├── 📝 normalizeInvestment.ts
│   │   ├── 📝 normalizePlanning.ts
│   │   ├── 📝 normalizePositions.ts
│   │   ├── 📝 normalizePositionTable.ts
│   │   ├── 📝 normalizeRealEstate.ts
│   │   ├── 📝 normalizeSelfEmployment.ts
│   │   ├── 📝 normalizeState.ts
│   │   ├── 📝 normalizeStatutoryPension.ts
│   │   ├── 📝 saveState.ts
│   │   ├── 📝 storageKeys.ts
│   │   ├── 📝 validators.ts
│   │   └── 📝 vaultRuntime.ts
│   ├── 📁 vault
│   │   ├── 📝 vaultFallback.ts
│   │   ├── 📝 vaultManifest.ts
│   │   ├── 📝 vaultMigration.ts
│   │   ├── 📝 vaultSerializer.ts
│   │   ├── 📝 vaultStorage.ts
│   │   └── 📝 vaultTypes.ts
│   ├── 📝 csv.ts
│   ├── 📝 format.ts
│   ├── 📝 planningYears.ts
│   ├── 📝 positionIcons.ts
│   ├── 📝 positionKinds.ts
│   ├── 📝 positionTableView.ts
│   └── 📝 storage.ts
├── 📁 styles
│   ├── 📁 components
│   │   ├── 📝 buttons.css
│   │   ├── 📝 details.css
│   │   ├── 📝 fields.css
│   │   └── 📝 popovers.css
│   ├── 📝 base.css
│   ├── 📝 index.css
│   ├── 📝 layout.css
│   ├── 📝 reset.css
│   ├── 📝 responsive.css
│   ├── 📝 tokens.css
│   └── 📝 utilities.css
├── 📁 tests
│   ├── 📝 accountYearTables.test.ts
│   ├── 📝 appShell.test.ts
│   ├── 📝 architectureGuards.test.ts
│   ├── 📝 businessIdeaCanvas.test.ts
│   ├── 📝 combinedWealth.test.ts
│   ├── 📝 followUpUi.test.ts
│   ├── 📝 incomeAnalysis.test.ts
│   ├── 📝 incomePlanning.test.ts
│   ├── 📝 incomeTracker.test.ts
│   ├── 📝 investmentCalculator.test.ts
│   ├── 📝 investmentContributions.test.ts
│   ├── 📝 nodeFs.d.ts
│   ├── 📝 planningYears.test.ts
│   ├── 📝 positionTableView.test.ts
│   ├── 📝 realEstateCalculator.test.ts
│   ├── 📝 reserveCalculator.test.ts
│   ├── 📝 selfEmploymentGantt.test.ts
│   ├── 📝 statutoryPension.test.ts
│   ├── 📝 storage.test.ts
│   └── 📝 vault.test.ts
├── 📁 views
│   ├── 📝 accountYearTables.ts
│   ├── 📝 formControlsTemplate.ts
│   ├── 📝 homeTemplate.ts
│   ├── 📝 investmentChart.ts
│   ├── 📝 moduleTopBarTemplate.ts
│   ├── 📝 statutoryPensionView.ts
│   ├── 📝 templates.ts
│   └── 📝 wealthCharts.ts
├── 📝 main.ts
├── 📝 types.ts
└── 📝 vite-env.d.ts

=== Ordnerbaum (Ausgabeordner) ===

📁 .
└── 📝 index.json
