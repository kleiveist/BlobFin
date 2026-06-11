import "./styles.css";

import {
  createId,
  defaultAppState,
  defaultCombinedWealthToggles,
  defaultIncomePlanningState,
  defaultIncomeTrackerState,
  defaultInvestmentSettings,
  defaultInvestmentSettingsForNewAccount
} from "./data/defaults";
import { buildAssetProjection, payoutStartAge as calculatePayoutStartAge } from "./domain/assetProjection";
import {
  buildCombinedWealthSeries,
  combinedWealthHorizonYears,
  type CombinedWealthDepotProjection
} from "./domain/combinedWealth";
import {
  buildIncomeAnalysisLabelDetails,
  type IncomeAnalysisLabelDetails,
  type IncomeAnalysisLabelGroup
} from "./domain/incomeAnalysis";
import { INCOME_YEAR_LABEL_OPTIONS } from "./domain/incomeLabels";
import {
  buildIncomePlanningHabit,
  buildIncomePlanningManualBlock,
  buildIncomePlanningModel,
  buildIncomePlanningWorkBlock,
  enforceSingleActiveIncomePlanningMainJob,
  INCOME_PLANNING_CATEGORY_CONFIGS,
  INCOME_PLANNING_WEEK_DAYS,
  incomePlanningDefaultWorkCategory,
  incomePlanningCategoryConfig,
  incomePlanningDefaultManualColor,
  incomePlanningDefaultManualIcon,
  incomePlanningDefaultWorkColor,
  incomePlanningEntryActiveInScenario,
  incomePlanningWeekScenarioConfigs,
  incomePlanningWeekScenarioConfig,
  incomePlanningAverageSleepHours,
  incomePlanningSlotGrossDurationMinutes,
  incomePlanningSlotNetDurationMinutes,
  incomePlanningSlotPauseDurationMinutes,
  incomePlanningSleepSlotDurationMinutes,
  incomePlanningSlotCalendarSegments,
  incomePlanningStripSlotPause,
  parseTimeMinutes,
  type IncomePlanningCalendarEntry,
  type IncomePlanningModel,
  type IncomePlanningPlannerEntryType
} from "./domain/incomePlanning";
import {
  buildIncomeChartModel,
  buildIncomeTrackerModel,
  applyCapitalGainsTaxToEntries,
  capitalGainsTaxBreakdown,
  CAPITAL_GAINS_ALLOWANCE_LIMIT,
  DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT,
  emptyIncomeTaxAdjustment,
  emptyIncomeTaxDeductionItems,
  incomeTaxDeductionItemsTotal,
  incomeYearEntryCalculatedNetIncome,
  incomeYearEntryNetIncome,
  incomeYearEntryTaxTotal,
  incomeYearEntryTaxDeductions,
  INCOME_SOURCE_LABELS,
  type IncomeTrackerModel
} from "./domain/incomeTracker";
import {
  SIDE_INCOME_TAX_RULE_LABELS,
  evaluateIncomeTaxAndContributionRules,
  isCapitalGainsTaxRuleLabel,
  normalizeIncomeTaxRuleLabel,
  taxRuleConfigForYear,
  type IncomeTaxRuleResult
} from "./domain/incomeTaxRules";
import {
  buildStatutoryPensionModel,
  STATUTORY_PENSION_DEDUCTION_PERCENT_MAX,
  type StatutoryPensionModel
} from "./domain/statutoryPension";
import { calculateRealEstateFinancing, defaultRealEstateDetailYear } from "./domain/realEstateCalculator";
import {
  buildAnnualInvestmentTransferPositions,
  investmentSavingsSelectionSummary,
  investmentContributionForMonth,
  oneTimeInvestmentContributionForMonth,
  selectableInvestmentSavingsPositions,
  selectedSavingsContributionForProjectionYear,
  type AnnualInvestmentTransferKind,
  type AnnualInvestmentTransferPositionOptions
} from "./domain/investmentContributions";
import { RETIREMENT_DEPOT_MIN_AGE } from "./domain/retirementDepot";
import {
  calculatePlannedOutflowForSingleMonth,
  calculateReserveSummary
} from "./domain/reserveCalculator";
import {
  exportIncomePlanningCsv,
  exportPositionsCsv,
  exportYearTableCsv,
  incomePlanningFromCsvRows,
  parseCsv,
  positionsFromCsvRows
} from "./lib/csv";
import {
  clamp,
  escapeHtml,
  intNumber,
  labelForPayout,
  labelForType,
  monthName,
  money,
  normalizeHeader,
  numberValue,
  percent
} from "./lib/format";
import {
  flowForType,
  isIncomePosition,
  isPositionType,
  payoutTypeForPositionTableSelection,
  positionCadencesForTableMode,
  positionFlow,
  positionMatchesTableCadence,
  positionTableMode,
  typeForPositionTableSelection,
  typeForFlow,
  type PositionTableCadence,
  type PositionTableMode
} from "./lib/positionKinds";
import {
  defaultPositionIconForPosition,
  normalizePositionIcon,
  POSITION_ICONS,
  positionIconSvg
} from "./lib/positionIcons";
import {
  emptyPositionTableView,
  hasActivePositionTableView,
  positionTableColumnConfig,
  positionTableColumnsForMode,
  positionTableFilterChipLabel,
  positionTableOperatorLabel,
  positionTableOperatorsForColumn,
  positionTableLabelOptions,
  positionTableRows,
  positionTableSelectOptions,
  positionTableSortLabel
} from "./lib/positionTableView";
import {
  normalizePositionPlanningYear,
  planningYearOptions,
  positionPlanningYear,
  positionsForPlanningYear,
  sanitizePlanningYearSelection
} from "./lib/planningYears";
import { loadState, resetStoredState, saveState } from "./lib/storage";
import type {
  AppSectionId,
  AppState,
  AssetProjection,
  AssetProjectionPoint,
  CareerMilestone,
  CareerMilestoneImpact,
  CombinedWealthDepotKey,
  CombinedWealthYear,
  IncomePerson,
  IncomeProjectionMode,
  IncomeEmploymentContext,
  IncomeMinijobType,
  IncomeStudentEmploymentMode,
  IncomeTaxAdjustmentType,
  IncomeResolvedSource,
  IncomeTaxDeductionField,
  IncomeTaxDeductionItems,
  IncomePlanningAssumptions,
  IncomePlanningCalendarStamp,
  IncomePlanningCategory,
  IncomePlanningHabit,
  IncomePlanningManualBlock,
  IncomePlanningManualBlockType,
  IncomePlanningPlannedStamp,
  IncomePlanningSleepSlot,
  IncomePlanningSlot,
  IncomePlanningWeekScenario,
  IncomePlanningWeekScenarioId,
  IncomePlanningWeekday,
  IncomePlanningWorkBlock,
  IncomeTrackerSettings,
  IncomeYearEntry,
  IncomeYearEntrySource,
  InvestmentDepotKey,
  InvestmentSettings,
  PlanningAccount,
  PlanningSettings,
  PlanningYearSelection,
  PositionCostBreakdownItem,
  PositionTableFilterColumn,
  PositionTableFilterOperator,
  PositionTableView,
  RealEstateFinancingSourceSchedule,
  RealEstateFinancingResult,
  RealEstateFinancingSettings,
  RealEstatePaymentSourceKind,
  ReservePosition,
  StatutoryPensionScenarioId,
  ThemeMode
} from "./types";
import { drawInvestmentChart } from "./views/investmentChart";
import { renderAccountYearTableOverview } from "./views/accountYearTables";
import {
  realEstatePopupHeading,
  realEstateRepaymentSegments,
  realEstateTrendSegments,
  type CombinedWealthLineId,
  type CombinedWealthLineVisibility,
  renderCombinedWealthChart,
  renderCombinedWealthLifeSummary,
  renderCombinedWealthPopup,
  renderRealEstateRepaymentChart,
  renderRealEstateTrendChart
} from "./views/wealthCharts";
import { monthSelect, payoutSelect, positionIconSelect, positionTypeSelect, renderAppShell } from "./views/templates";
import {
  renderStatutoryPensionHtml,
  renderStatutoryPensionProjectionYearPopupHtml,
  renderStatutoryPensionTaxPopupHtml,
  renderStatutoryPensionYearPopupHtml
} from "./views/statutoryPensionView";

const root = requireRootElement();
const INTEREST_INVESTMENT_POSITION_ID = "__account-interest-investment";
const CASHBACK_INVESTMENT_POSITION_ID = "__account-cashback-investment";
let annualInvestmentTransferCache = new WeakMap<ReservePosition[], Map<string, ReservePosition[]>>();
const depotAssetProjectionCache = new Map<string, AssetProjection>();
const FORM_RENDER_DEBOUNCE_MS = 40;
const CHILD_DEPOT_MIN_PAYOUT_AGE = 18;
const CHILD_DEPOT_DEFAULT_PAYOUT_AGE = 18;
const CHILD_DEPOT_MAX_PAYOUT_AGE = 25;
const MAX_REAL_ESTATE_PROJECTION_YEARS = 80;
const INVESTMENT_DEPOTS: InvestmentDepotKey[] = ["standard", "retirement", "child"];
const COMBINED_DEPOTS: Array<{ key: CombinedWealthDepotKey; label: string }> = [
  { key: "standard", label: "Depot" },
  { key: "retirement", label: "Altersvorsorgedepot" },
  { key: "child", label: "Kinderdepot" }
];
const APP_SECTION_IDS: AppSectionId[] = [
  "home",
  "income",
  "income_planning",
  "income_stamp_planner",
  "planning_scenarios",
  "real_estate_financing",
  "statutory_pension",
  "combined_wealth"
];
const INCOME_TAX_ADJUSTMENT_OPTIONS: Array<{ value: IncomeTaxAdjustmentType; label: string }> = [
  { value: "refund", label: "Rueckerstattung" },
  { value: "payment", label: "Nachzahlung" }
];
type IncomeTaxDeductionCategory = "taxes" | "social" | "employer_social";
const INCOME_TAX_DEDUCTION_ROWS: Array<{
  field: IncomeTaxDeductionField;
  nr: string;
  label: string;
  category: IncomeTaxDeductionCategory;
  capitalOnly?: boolean;
}> = [
  { field: "wageTax", nr: "4", label: "Einbehaltene Lohnsteuer von 3.", category: "taxes" },
  { field: "solidaritySurcharge", nr: "5", label: "Einbehaltener Solidaritaetszuschlag von 3.", category: "taxes" },
  { field: "churchTax", nr: "6", label: "Einbehaltene Kirchensteuer des Arbeitnehmers von 3.", category: "taxes" },
  { field: "capitalGainsTax", nr: "KAP", label: "Kapitalertragsteuer", category: "taxes", capitalOnly: true },
  {
    field: "capitalGainsSolidaritySurcharge",
    nr: "KAP",
    label: "Solidaritaetszuschlag zur Kapitalertragsteuer",
    category: "taxes",
    capitalOnly: true
  },
  {
    field: "capitalGainsChurchTax",
    nr: "KAP",
    label: "Kirchensteuer zur Kapitalertragsteuer",
    category: "taxes",
    capitalOnly: true
  },
  { field: "employerPensionInsurance", nr: "22", label: "Arbeitgeberbeitraege zur gesetzlichen RV", category: "employer_social" },
  { field: "pensionInsurance", nr: "23", label: "Arbeitnehmerbeitraege zur gesetzlichen RV", category: "social" },
  { field: "healthInsurance", nr: "25", label: "Arbeitnehmerbeitraege zur gesetzlichen KV", category: "social" },
  { field: "careInsurance", nr: "26", label: "Arbeitnehmerbeitraege zur sozialen PV", category: "social" },
  { field: "unemploymentInsurance", nr: "27", label: "Arbeitnehmerbeitraege zur AV", category: "social" }
];
const INCOME_EMPLOYMENT_CONTEXT_OPTIONS: Array<{ value: IncomeEmploymentContext; label: string }> = [
  { value: "job_loss", label: "Verlust des Arbeitsplatzes" },
  { value: "earned_claim", label: "Bereits entstandener Anspruch" },
  { value: "other", label: "Andere Abgeltung" }
];
const INCOME_MINIJOB_TYPE_OPTIONS: Array<{ value: IncomeMinijobType; label: string }> = [
  { value: "commercial", label: "Gewerblicher Minijob" },
  { value: "private_household", label: "Privathaushalt" }
];
const INCOME_STUDENT_EMPLOYMENT_MODE_OPTIONS: Array<{ value: IncomeStudentEmploymentMode; label: string }> = [
  { value: "minijob", label: "Minijob" },
  { value: "short_term", label: "Kurzfristige Beschaeftigung" }
];
const CAPITAL_GAINS_CHURCH_TAX_RATE_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 9, label: "9%" },
  { value: 8, label: "8%" }
];
const CAREER_MILESTONE_TYPE_OPTIONS: Array<{ type: string; icon: string; description: string }> = [
  { type: "Ausbildung", icon: "education", description: "Ausbildung, Schule oder Qualifikation gestartet" },
  { type: "Berufsbeginn", icon: "wallet", description: "Start ins Erwerbsleben oder erster Job" },
  { type: "Jobwechsel", icon: "tag", description: "Wechsel zu einer neuen Stelle" },
  { type: "Befoerderung", icon: "investment", description: "Neue Rolle mit mehr Verantwortung" },
  { type: "Gehaltserhoehung", icon: "coins", description: "Regelmaessiges Einkommen steigt" },
  { type: "Teilzeit", icon: "calendar", description: "Reduzierte Arbeitszeit" },
  { type: "Vollzeit", icon: "calendar", description: "Rueckkehr oder Wechsel in Vollzeit" },
  { type: "Ausbildung / Studium abgeschlossen", icon: "education", description: "Abschluss mit Auswirkung auf Einkommen" },
  { type: "Elternzeit", icon: "child", description: "Familienphase mit Einkommenseffekt" },
  { type: "Selbststaendigkeit gestartet", icon: "bank", description: "Start der Selbststaendigkeit" },
  { type: "Arbeitslosigkeit", icon: "shield", description: "Unterbrechung oder Wegfall von Einkommen" },
  { type: "Arbeitgeberwechsel", icon: "tag", description: "Neuer Arbeitgeber" },
  { type: "Einmalige Sonderzahlung", icon: "gift", description: "Bonus oder Sonderzahlung" },
  { type: "Sonstiges", icon: "tag", description: "Eigener Meilenstein" }
];
const CAREER_MILESTONE_IMPACT_OPTIONS: Array<{ value: CareerMilestoneImpact; label: string }> = [
  { value: "positive", label: "positiv" },
  { value: "neutral", label: "neutral" },
  { value: "negative", label: "negativ" }
];
const INCOME_PLANNING_COLOR_OPTIONS = [
  "#8a5a2b",
  "#2f6fb0",
  "#5f7f4f",
  "#b8860b",
  "#7d6bb3",
  "#c76f4c",
  "#6f7785",
  "#4e9f6d"
];
const INCOME_PLANNING_STAMP_PRESETS: Array<{ label: string; icon: string }> = [
  { label: "Wandern", icon: "hiking" },
  { label: "Laufen", icon: "running" },
  { label: "Workout", icon: "dumbbell" },
  { label: "Spaziergang", icon: "health" },
  { label: "Fernstudium", icon: "education" },
  { label: "Arbeitsweg", icon: "car" }
];
const INCOME_PROJECTION_MODES: IncomeProjectionMode[] = ["off", "historical_average", "manual"];
type NumericPlanningSetting = Exclude<keyof PlanningSettings, "endDate">;
type NumericInvestmentSetting =
  | "birthYear"
  | "chartStartAge"
  | "childPayoutAge"
  | "payoutEndAge"
  | "retirementDepotChildren"
  | "percentageWithdrawalStartAge"
  | "percentageWithdrawalRatePercent"
  | "investmentReturnPercent"
  | "capitalGainsTaxPercent"
  | "inflationRatePercent"
  | "bequestReservePercent";
type IncomeAnalysisChartType = "pie" | "bar" | "line" | "curve";
type IncomeAnalysisDataView = "deductions" | "social" | "taxes" | "income" | "label_distribution";
type IncomeAnalysisYearFilter = "all" | number;

interface IncomeAnalysisSlice {
  label: string;
  value: number;
  chartValue?: number;
  tone: string;
}

interface IncomeAnalysisYearPoint {
  year: number;
  gross: number;
  net: number;
  deductions: number;
  taxBase: number;
  taxRefund: number;
  taxPayment: number;
  taxes: number;
  social: number;
  employerSocial: number;
}

type IncomeAnalysisSeriesItem = {
  label: string;
  tone: string;
  values: Array<{ year: number; value: number }>;
};

interface IncomeAnalysisModel {
  entries: IncomeYearEntry[];
  years: number[];
  labelDetails: IncomeAnalysisLabelDetails;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  taxBaseTotal: number;
  taxRefundTotal: number;
  taxPaymentTotal: number;
  taxTotal: number;
  socialTotal: number;
  employerSocialTotal: number;
  unassignedDeductions: number;
  slicesByView: Record<IncomeAnalysisDataView, IncomeAnalysisSlice[]>;
  yearPoints: IncomeAnalysisYearPoint[];
}

interface ReserveChartTotals {
  income: number;
  expense: number;
  reserve: number;
  savings: number;
  remaining: number;
}

interface ReserveChartModel {
  totals: ReserveChartTotals;
  insight: string;
}

interface PositionFilterDraft {
  column: PositionTableFilterColumn;
  operator: PositionTableFilterOperator;
  value: string;
}

type RealEstateField = keyof RealEstateFinancingSettings;
type CombinedToggleKey = {
  [Key in keyof AppState["combinedWealth"]]: AppState["combinedWealth"][Key] extends boolean ? Key : never;
}[keyof AppState["combinedWealth"]];
type CombinedNumberKey = "statutoryPensionMonthlyAmount" | "statutoryPensionSavingsRatePercent";
type AccountDialogMode = "create" | "rename";
type AccountDialogState = {
  mode: AccountDialogMode;
  accountId: string | null;
  name: string;
  type: PlanningAccount["type"];
  error: string;
} | null;
type IncomePlanningOwnerType = "work" | "habit" | "manual" | "assumption";
type IncomePlanningDialogMode = "create" | "edit" | "create_slot";
type IncomeStampPlannerDateRange = { start: Date; end: Date; year: number; month: number };
interface IncomePlanningSleepSlotGroup {
  id: string;
  fromDay: IncomePlanningWeekday;
  toDay: IncomePlanningWeekday;
  startTime: string;
  endTime: string;
  flexible: boolean;
  durationMinutes: number;
  scenarioIds: IncomePlanningWeekScenarioId[];
  slotIds: Partial<Record<IncomePlanningWeekday, string>>;
}
type IncomePlanningDialogState = {
  mode: IncomePlanningDialogMode;
  ownerType: IncomePlanningOwnerType;
  ownerId: string | null;
  slotId: string | null;
  active: boolean;
  category: IncomePlanningCategory;
  manualType: IncomePlanningManualBlockType;
  habitType: IncomePlanningHabit["type"];
  habitDurationUnit: IncomePlanningHabit["durationUnit"];
  habitGoalChange: IncomePlanningHabit["goalChange"];
  habitStatus: IncomePlanningHabit["status"];
  priority: IncomePlanningHabit["priority"];
  name: string;
  description: string;
  color: string;
  habitIcon: string;
  manualIcon: string;
  timing: string;
  habitDurationMinutes: number;
  replacementHabit: string;
  sleepHoursPerDay: number;
  sleepSlotGroups: IncomePlanningSleepSlotGroup[];
  day: IncomePlanningWeekday;
  toDay: IncomePlanningWeekday;
  startTime: string;
  endTime: string;
  flexible: boolean;
  slotDurationMinutes: number;
  pauseEnabled: boolean;
  pauseStartTime: string;
  pauseEndTime: string;
  pauseDurationMinutes: number;
  scenarioIds: IncomePlanningWeekScenarioId[];
  error: string;
} | null;
interface IncomePlanningCalendarBackgroundEntry {
  id: string;
  day: IncomePlanningWeekday;
  startMinute: number;
  endMinute: number;
  title: string;
  label: string;
  detail: string;
  icon: string;
  type: IncomePlanningPlannerEntryType | "sleep";
  flexible: boolean;
  color?: string;
  sleepGroupId?: string;
}
type IncomePlanningDragMode = "move" | "resize-start" | "resize-end";
type IncomePlanningDragState = {
  ownerType: Exclude<IncomePlanningOwnerType, "assumption">;
  ownerId: string;
  slotId: string;
  slotPart: "main" | "pause";
  mode: IncomePlanningDragMode;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  originalDay: IncomePlanningWeekday;
  originalStartMinute: number;
  originalEndMinute: number;
  dayWidth: number;
  columnHeight: number;
  element: HTMLElement;
  moved: boolean;
} | null;
type IncomePlanningSleepDragState = {
  groupId: string;
  group: IncomePlanningSleepSlotGroup;
  pointerId: number;
  startClientY: number;
  originalStartMinute: number;
  durationMinutes: number;
  overnight: boolean;
  columnHeight: number;
  elements: HTMLElement[];
  moved: boolean;
} | null;
type IncomePlanningStampDragState = {
  stampId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  originalDay: IncomePlanningWeekday;
  originalStartMinute: number;
  dayWidth: number;
  columnHeight: number;
  element: HTMLElement;
  moved: boolean;
} | null;
type IncomePlanningPlannedStampDragState = {
  stampId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  originalDate: string;
  originalStartMinute: number;
  dayWidth: number;
  columnHeight: number;
  element: HTMLElement;
  moved: boolean;
} | null;
type IncomeStampPlannerStampDragState = {
  stampId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  element: HTMLElement;
  moved: boolean;
} | null;

let investmentAccountContextId: string | null = null;
let state = loadInitialState();
let draggedPositionId: string | null = null;
let exportStatusTimeoutId: number | undefined;
let selectedPositionMode: PositionTableMode = "expense";
let selectedIncomeCadence: PositionTableCadence = "monthly";
let selectedExpenseCadence: PositionTableCadence = "monthly";
let selectedReserveCadence: PositionTableCadence = "fixed";
let selectedSavingsCadence: PositionTableCadence = "monthly";
let showResultMaxNeeded = false;
let incomeTaxDialogEntryId: string | null = null;
let positionCostDialogId: string | null = null;
let incomeAnalysisOpen = false;
let incomeAnalysisChartType: IncomeAnalysisChartType = "pie";
let incomeAnalysisDataView: IncomeAnalysisDataView = "deductions";
let incomeAnalysisYearFilter: IncomeAnalysisYearFilter = "all";
let incomeAnalysisSelectedLabels: string[] = [];
let incomeYearLabelPicker: { entryId: string; top: number; left: number } | null = null;
let incomePlanningDialog: IncomePlanningDialogState = null;
let incomePlanningDragState: IncomePlanningDragState = null;
let incomePlanningSleepDragState: IncomePlanningSleepDragState = null;
let incomePlanningStampDragState: IncomePlanningStampDragState = null;
let incomePlanningPlannedStampDragState: IncomePlanningPlannedStampDragState = null;
let incomePlanningSuppressNextCalendarClick = false;
let incomePlanningHabitIconPicker: { top: number; left: number } | null = null;
let incomePlanningStampPicker: {
  stampId: string | null;
  day: IncomePlanningWeekday;
  startTime: string;
  icon: string;
  label: string;
  scenarioIds: IncomePlanningWeekScenarioId[];
  top: number;
  left: number;
} | null = null;
let incomePlanningStampMenu: { stampId: string; top: number; left: number } | null = null;
let incomePlanningWeekCursor = incomeStampPlannerWeekStart(new Date());
let incomeStampPlannerMonthCursor = incomeStampPlannerMonthStart(new Date());
let incomeStampPlannerStampDragState: IncomeStampPlannerStampDragState = null;
let incomeStampPlannerSuppressNextClick = false;
let incomeStampPlannerDialog: {
  stampId: string | null;
  date: string;
  startTime: string;
  icon: string;
  label: string;
  description: string;
  scenarioIds: IncomePlanningWeekScenarioId[];
  error: string;
} | null = null;
let incomePlanningWeekScenarioDialog: { label: string; error: string } | null = null;
let incomePlanningCurrentTimeTimerId: number | null = null;
let incomeMilestoneTypePicker: { milestoneId: string; top: number; left: number } | null = null;
let positionIconPicker: { positionId: string; top: number; left: number } | null = null;
let positionFilterDrafts = createPositionFilterDrafts();
let positionFilterPopupOpen = false;
let selectedRealEstateYear: number | null = null;
let latestRealEstateResult: RealEstateFinancingResult | null = null;
let selectedCombinedWealthYear: number | null = null;
let latestCombinedWealthYears: CombinedWealthYear[] = [];
let combinedCashPopupAccountId: string | null = null;
let investmentIncludePopupOpen = false;
let renderAllTimer: number | null = null;
let renderAllRunning = false;
let combinedWealthLineVisibility: CombinedWealthLineVisibility = {
  pensionConsumedCumulative: true,
  taxCumulative: true,
  propertyValue: true,
  propertyDebt: true
};
let latestStatutoryPensionModel: StatutoryPensionModel | null = null;
let statutoryPensionTaxPopupScenarioId: StatutoryPensionScenarioId | null = null;
let accountDialog: AccountDialogState = null;
normalizeInvestmentBounds();
applyInitialRoute();
applyTheme();

renderShell();
bindEvents();
startIncomePlanningCurrentTimeTicker();
syncAllInputsFromState();
syncThemeControls();
renderAll();

function loadInitialState(): AppState {
  try {
    return sanitizeAppState(loadState());
  } catch (error) {
    console.warn("Stored state could not be loaded; falling back to defaults.", error);
    return sanitizeAppState(defaultAppState());
  }
}

function sanitizeAppState(appState: AppState): AppState {
  const fallbackUi = {
    activeSection: "home" as AppSectionId,
    selectedPlanningYear: null as PlanningYearSelection,
    selectedPlanningAccountId: "default-account",
    selectedInvestmentAccountId: "default-account",
    selectedRealEstateAccountIds: ["default-account"],
    selectedRealEstateWithdrawalGainAccountIds: ["default-account"],
    selectedCombinedAccountIds: ["default-account"],
    selectedCombinedLeadInvestmentAccountId: "default-account",
    settingsGrunddatenExpanded: true
  };
  const ui = appState.ui ?? fallbackUi;
  const fallbackPlanningAccounts: PlanningAccount[] = [
    {
      id: "default-account",
      name: "Standardkonto",
      type: "mixed",
      yearlyRows: appState.positions.map((position) => sanitizePosition(position, appState.settings.year))
    }
  ];
  const planningAccounts: PlanningAccount[] = appState.planningAccounts.length
    ? appState.planningAccounts.map((account) => ({
        ...account,
        yearlyRows: account.yearlyRows.map((position) => sanitizePosition(position, appState.settings.year))
      }))
    : fallbackPlanningAccounts;
  const selectedPlanningAccountId = planningAccounts.some(
    (account) => account.id === ui.selectedPlanningAccountId
  )
    ? ui.selectedPlanningAccountId
    : planningAccounts[0].id;
  const selectedInvestmentAccountId = planningAccounts.some(
    (account) => account.id === ui.selectedInvestmentAccountId
  )
    ? ui.selectedInvestmentAccountId
    : selectedPlanningAccountId;
  const accountIds = planningAccounts.map((account) => account.id);
  const selectedRealEstateAccountIds = (ui.selectedRealEstateAccountIds ?? []).filter((accountId) =>
    accountIds.includes(accountId)
  );
  const normalizedRealEstateAccountIds = selectedRealEstateAccountIds.length ? selectedRealEstateAccountIds : accountIds;
  const selectedCombinedAccountIds = (ui.selectedCombinedAccountIds ?? accountIds).filter((accountId) =>
    accountIds.includes(accountId)
  );
  const selectedCombinedLeadInvestmentAccountId = accountIds.includes(ui.selectedCombinedLeadInvestmentAccountId)
    ? ui.selectedCombinedLeadInvestmentAccountId
    : selectedInvestmentAccountId;
  const normalizedCombinedLeadInvestmentAccountId = accountIds.includes(selectedCombinedLeadInvestmentAccountId)
    ? selectedCombinedLeadInvestmentAccountId
    : selectedInvestmentAccountId;
  const positions =
    planningAccounts.find((account) => account.id === selectedPlanningAccountId)?.yearlyRows ??
    appState.positions.map((position) => sanitizePosition(position, appState.settings.year));
  const investmentByAccountId = planningAccounts.reduce<Record<string, InvestmentSettings>>((result, account) => {
    const existing = appState.investmentByAccountId?.[account.id];
    result[account.id] =
      existing ??
      (account.id === selectedInvestmentAccountId
        ? appState.investment ?? defaultInvestmentSettings()
        : defaultInvestmentSettingsForNewAccount());
    return result;
  }, {});
  const investment = investmentByAccountId[selectedInvestmentAccountId] ?? defaultInvestmentSettingsForNewAccount();
  const incomeTracker = appState.incomeTracker ?? defaultIncomeTrackerState();
  const incomePlanning = appState.incomePlanning ?? defaultIncomePlanningState();

  investmentAccountContextId = selectedInvestmentAccountId;
  return {
    ...appState,
    planningAccounts,
    ui: {
      ...fallbackUi,
      ...ui,
      selectedPlanningAccountId,
      selectedInvestmentAccountId,
      selectedRealEstateAccountIds: normalizedRealEstateAccountIds,
      selectedRealEstateWithdrawalGainAccountIds: normalizedRealEstateAccountIds,
      selectedCombinedAccountIds,
      selectedCombinedLeadInvestmentAccountId: normalizedCombinedLeadInvestmentAccountId,
      selectedPlanningYear: sanitizePlanningYearSelection(ui.selectedPlanningYear, appState.settings.year),
      activeSection: appSectionIdFromValue(ui.activeSection) ?? "home"
    },
    combinedWealth: normalizeCombinedWealthState(
      appState.combinedWealth,
      accountIds,
      selectedInvestmentAccountId
    ),
    positions,
    investmentByAccountId,
    investment,
    incomePlanning,
    incomeTracker: {
      ...incomeTracker,
      yearlyEntries: sanitizeIncomeYearEntriesWithTaxRules(incomeTracker.yearlyEntries)
    }
  };
}

function normalizeCombinedWealthState(
  combinedWealth: AppState["combinedWealth"] | undefined,
  accountIds: string[],
  fallbackAccountId: string
): AppState["combinedWealth"] {
  const fallback = defaultCombinedWealthToggles();
  const source = combinedWealth ?? fallback;
  const cashAccountId =
    source.cashAccountId && accountIds.includes(source.cashAccountId) ? source.cashAccountId : fallbackAccountId;
  const depotKeys = Array.from(
    new Set(
      (source.depotKeys?.length ? source.depotKeys : fallback.depotKeys).filter((key): key is CombinedWealthDepotKey =>
        COMBINED_DEPOTS.some((depot) => depot.key === key)
      )
    )
  );
  return {
    ...fallback,
    ...source,
    cashAccountId,
    cashPositionIds: Array.from(new Set(source.cashPositionIds ?? fallback.cashPositionIds)),
    depotKeys: depotKeys.length ? depotKeys : fallback.depotKeys,
    statutoryPensionScenario: statutoryPensionScenarioIdFromValue(source.statutoryPensionScenario) ?? "base",
    statutoryPensionMonthlyAmount: Math.max(0, Number(source.statutoryPensionMonthlyAmount) || 0),
    statutoryPensionSavingsRatePercent: clamp(Number(source.statutoryPensionSavingsRatePercent) || 0, 0, 100)
  };
}

function requireRootElement(): HTMLDivElement {
  const element = document.querySelector<HTMLDivElement>("#app");
  if (!element) {
    throw new Error("Application root #app is missing.");
  }
  return element;
}

function renderShell(): void {
  root.innerHTML = renderAppShell();
}

function activePlanningAccount(): PlanningAccount {
  if (!state.planningAccounts.length) {
    state.planningAccounts = [
      {
        id: "default-account",
        name: "Standardkonto",
        type: "mixed",
        yearlyRows: state.positions
      }
    ];
  }
  const account =
    state.planningAccounts.find((item) => item.id === state.ui.selectedPlanningAccountId) ?? state.planningAccounts[0];
  if (!account) {
    throw new Error("No planning account available.");
  }
  if (state.ui.selectedPlanningAccountId !== account.id) {
    state.ui = { ...state.ui, selectedPlanningAccountId: account.id };
  }
  return account;
}

function planningAccountById(accountId: string): PlanningAccount | null {
  return state.planningAccounts.find((account) => account.id === accountId) ?? null;
}

function planningAccountsByIds(accountIds: string[]): PlanningAccount[] {
  if (!accountIds.length) return [];
  return accountIds
    .map((accountId) => planningAccountById(accountId))
    .filter((account): account is PlanningAccount => account !== null);
}

function selectedInvestmentPlanningAccount(): PlanningAccount {
  const selectedId = state.ui.selectedInvestmentAccountId;
  const fallbackId = state.ui.selectedPlanningAccountId;
  const account = planningAccountById(selectedId) ?? planningAccountById(fallbackId) ?? state.planningAccounts[0] ?? null;
  if (!account) {
    throw new Error("No planning account available for investment.");
  }
  if (state.ui.selectedInvestmentAccountId !== account.id) {
    state.ui = { ...state.ui, selectedInvestmentAccountId: account.id };
  }
  return account;
}

function selectedRealEstateSourceAccounts(): PlanningAccount[] {
  return planningAccountsByIds(state.ui.selectedRealEstateAccountIds);
}

function selectedRealEstateWithdrawalAccounts(): PlanningAccount[] {
  return selectedRealEstateSourceAccounts();
}

function selectedCombinedCashPlanningAccount(): PlanningAccount | null {
  const account =
    (state.combinedWealth.cashAccountId ? planningAccountById(state.combinedWealth.cashAccountId) : null) ??
    planningAccountById(state.ui.selectedPlanningAccountId) ??
    state.planningAccounts[0] ??
    null;
  if (account && state.combinedWealth.cashAccountId !== account.id) {
    state.combinedWealth = { ...state.combinedWealth, cashAccountId: account.id };
  }
  return account;
}

function selectedCombinedLeadInvestmentPlanningAccount(): PlanningAccount | null {
  const leadId = state.ui.selectedCombinedLeadInvestmentAccountId;
  const lead =
    planningAccountById(leadId) ??
    planningAccountById(state.ui.selectedInvestmentAccountId) ??
    state.planningAccounts[0] ??
    null;
  if (!lead) return null;
  if (state.ui.selectedCombinedLeadInvestmentAccountId !== lead.id) {
    state.ui = { ...state.ui, selectedCombinedLeadInvestmentAccountId: lead.id };
  }
  return lead;
}

function normalizeActivePlanningYear(): void {
  const selectedPlanningYear = sanitizePlanningYearSelection(state.ui.selectedPlanningYear, state.settings.year);
  if (selectedPlanningYear !== state.ui.selectedPlanningYear) {
    state.ui = { ...state.ui, selectedPlanningYear };
  }
}

function activePlanningYear(): PlanningYearSelection {
  return sanitizePlanningYearSelection(state.ui.selectedPlanningYear, state.settings.year);
}

function activePlanningSettings(): PlanningSettings {
  return {
    ...state.settings,
    year: activePlanningYear() ?? state.settings.year
  };
}

function activePlanningYearLabel(): string {
  const year = activePlanningYear();
  return year === null ? "Start" : String(year);
}

function activePlanningPositions(): ReservePosition[] {
  return positionsForPlanningYear(state.positions, activePlanningYear());
}

function planningAccountForActiveYear(account: PlanningAccount): PlanningAccount {
  return {
    ...account,
    yearlyRows: positionsForPlanningYear(account.yearlyRows, activePlanningYear())
  };
}

function planningAccountsForActiveYear(): PlanningAccount[] {
  return state.planningAccounts.map(planningAccountForActiveYear);
}

function synchronizeAccountScopedState(): void {
  const accountIds = state.planningAccounts.map((account) => account.id);
  if (!accountIds.length) return;

  if (investmentAccountContextId && accountIds.includes(investmentAccountContextId)) {
    state.investmentByAccountId = {
      ...state.investmentByAccountId,
      [investmentAccountContextId]: state.investment
    };
  }

  const selectedPlanningAccountId = accountIds.includes(state.ui.selectedPlanningAccountId)
    ? state.ui.selectedPlanningAccountId
    : accountIds[0];
  const selectedInvestmentAccountId = accountIds.includes(state.ui.selectedInvestmentAccountId)
    ? state.ui.selectedInvestmentAccountId
    : selectedPlanningAccountId;
  const selectedRealEstateAccountIds = state.ui.selectedRealEstateAccountIds.filter((accountId) =>
    accountIds.includes(accountId)
  );
  const normalizedRealEstateAccountIds = selectedRealEstateAccountIds.length
    ? selectedRealEstateAccountIds
    : [...accountIds];
  const selectedCombinedAccountIds = state.ui.selectedCombinedAccountIds.filter((accountId) =>
    accountIds.includes(accountId)
  );
  const selectedCombinedLeadInvestmentAccountId = accountIds.includes(state.ui.selectedCombinedLeadInvestmentAccountId)
    ? state.ui.selectedCombinedLeadInvestmentAccountId
    : selectedInvestmentAccountId;
  const normalizedCombinedLeadInvestmentAccountId = accountIds.includes(selectedCombinedLeadInvestmentAccountId)
    ? selectedCombinedLeadInvestmentAccountId
    : selectedInvestmentAccountId;

  const investmentByAccountId = accountIds.reduce<Record<string, InvestmentSettings>>((result, accountId) => {
    result[accountId] = state.investmentByAccountId[accountId] ?? defaultInvestmentSettingsForNewAccount();
    return result;
  }, {});

  state.investmentByAccountId = investmentByAccountId;
  state.ui = {
    ...state.ui,
    selectedPlanningAccountId,
    selectedInvestmentAccountId,
    selectedRealEstateAccountIds: normalizedRealEstateAccountIds,
    selectedRealEstateWithdrawalGainAccountIds: normalizedRealEstateAccountIds,
    selectedCombinedAccountIds,
    selectedCombinedLeadInvestmentAccountId: normalizedCombinedLeadInvestmentAccountId
  };
  state.combinedWealth = normalizeCombinedWealthState(
    state.combinedWealth,
    accountIds,
    normalizedCombinedLeadInvestmentAccountId
  );
  state.investment = state.investmentByAccountId[selectedInvestmentAccountId] ?? defaultInvestmentSettingsForNewAccount();
  investmentAccountContextId = selectedInvestmentAccountId;
}

function syncActivePlanningAccountFromPositions(): void {
  const account = activePlanningAccount();
  state.planningAccounts = state.planningAccounts.map((item) =>
    item.id === account.id ? { ...item, yearlyRows: state.positions } : item
  );
}

function syncPositionsFromActivePlanningAccount(): void {
  state.positions = activePlanningAccount().yearlyRows;
}

function appSectionIdFromValue(value: unknown): AppSectionId | null {
  if (typeof value !== "string") return null;
  if (
    value === "income_tracking" ||
    value === "income_status" ||
    value === "income_charts" ||
    value === "income_overview"
  ) {
    return "income";
  }
  if (
    value === "cost_reserve_positions" ||
    value === "year_table" ||
    value === "investment_planning" ||
    value === "investment_overview"
  ) {
    return "planning_scenarios";
  }
  return APP_SECTION_IDS.includes(value as AppSectionId) ? (value as AppSectionId) : null;
}

function sectionFromLocationHash(): AppSectionId | null {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;
  return appSectionIdFromValue(decodeURIComponent(hash));
}

function applyInitialRoute(): void {
  const section = sectionFromLocationHash() ?? "home";
  state.ui = { ...state.ui, activeSection: section };
  replaceSectionHistory(section);
}

function sectionUrl(section: AppSectionId): string {
  return `${window.location.pathname}${window.location.search}#${encodeURIComponent(section)}`;
}

function pushSectionHistory(section: AppSectionId): void {
  const hash = `#${encodeURIComponent(section)}`;
  if (window.location.hash === hash) return;
  window.history.pushState({ activeSection: section }, "", sectionUrl(section));
}

function replaceSectionHistory(section: AppSectionId): void {
  window.history.replaceState({ activeSection: section }, "", sectionUrl(section));
}

function setActiveSection(section: AppSectionId, options: { updateHistory?: boolean } = {}): void {
  const activeSection = appSectionIdFromValue(section) ?? "home";
  state.ui = { ...state.ui, activeSection };
  if (options.updateHistory !== false) {
    pushSectionHistory(activeSection);
  }
  hideThemeSettings();
  hideStatutoryPensionTaxPopup();
}

function updateModuleVisibility(): void {
  const activeSection = state.ui.activeSection;
  for (const button of document.querySelectorAll<HTMLButtonElement>("button[data-section-id]")) {
    const sectionId = button.dataset.sectionId;
    const isActive = sectionId === activeSection;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }
  for (const section of document.querySelectorAll<HTMLElement>("[data-module-section]")) {
    const sectionId = section.dataset.moduleSection as AppSectionId | undefined;
    section.hidden = sectionId !== activeSection;
  }
}

function bindEvents(): void {
  root.addEventListener("input", (event) => {
    const target = formControl(event.target);
    if (!target) return;

    if (target.dataset.positionFilterDraft === "value") {
      updatePositionFilterDraft("value", target.value);
      return;
    }

    if (target.dataset.accountDialogField) {
      updateAccountDialogDraft(target.dataset.accountDialogField, target.value);
      return;
    }

    if (target.dataset.setting) {
      if (isDeferredModelInput(target)) return;
      updatePlanningSetting(target.dataset.setting as keyof PlanningSettings, target.value);
      requestRenderAll();
      return;
    }

    if (target.dataset.investment) {
      if (isDeferredModelInput(target)) return;
      updateInvestmentSetting(target.dataset.investment as keyof InvestmentSettings, target.value);
      requestRenderAll();
      return;
    }

    if (target.dataset.realEstateField) {
      const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
      updateRealEstateField(target.dataset.realEstateField as RealEstateField, value);
      requestRenderAll();
      return;
    }

    if (target.dataset.realEstateRange) {
      updateRealEstateField(target.dataset.realEstateRange as RealEstateField, target.value);
      requestRenderAll();
      return;
    }

    if (target.dataset.combinedNumber) {
      updateCombinedNumber(target.dataset.combinedNumber as CombinedNumberKey, target.value);
      saveState(state);
      return;
    }

    if (target.dataset.incomeCollection && target.dataset.incomeId && target.dataset.incomeField) {
      const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
      updateIncomeEntry(
        target.dataset.incomeCollection,
        target.dataset.incomeId,
        target.dataset.incomeField,
        value
      );
      renderIncomeLiveUpdate(
        target.dataset.incomeCollection,
        target.dataset.incomeId,
        target.dataset.incomeField
      );
      saveState(state);
      return;
    }

    if (target.dataset.incomeSetting) {
      updateIncomeSetting(target.dataset.incomeSetting as keyof IncomeTrackerSettings, target.value);
      renderIncomeLiveUpdate();
      saveState(state);
      return;
    }

    if (handleIncomePlanningControl(target, "live")) {
      return;
    }

    if (target.dataset.incomePlanningStampField) {
      updateIncomePlanningStampPickerDraft(target.dataset.incomePlanningStampField, target.value);
      return;
    }

    if (target.dataset.incomeStampPlannerField) {
      updateIncomeStampPlannerDialogDraft(target.dataset.incomeStampPlannerField, target.value);
      return;
    }

    if (target.dataset.positionCostPositionId && target.dataset.positionCostItemId && target.dataset.positionCostField) {
      updatePositionCostBreakdownItem(
        target.dataset.positionCostPositionId,
        target.dataset.positionCostItemId,
        target.dataset.positionCostField,
        target.value
      );
      renderPositions();
      renderPositionCostDialogTotals(target.dataset.positionCostPositionId);
      saveState(state);
      return;
    }

    if (target.dataset.statutoryPensionScenario && target.dataset.statutoryPensionScenarioField) {
      updateStatutoryPensionScenarioField(
        target.dataset.statutoryPensionScenario as StatutoryPensionScenarioId,
        target.dataset.statutoryPensionScenarioField,
        target.value
      );
      syncStatutoryPensionRangeLabel(target);
      saveState(state);
      return;
    }

    if (target.dataset.retirementAge) {
      if (isDeferredModelInput(target)) return;
      updateRetirementAge(target.value);
      requestRenderAll();
    }
  });

  root.addEventListener("change", (event) => {
    const target = formControl(event.target);
    if (!target) return;

    if (target.dataset.positionFilterDraft) {
      updatePositionFilterDraft(target.dataset.positionFilterDraft as keyof PositionFilterDraft, target.value);
      return;
    }

    if (target.dataset.accountDialogField) {
      updateAccountDialogDraft(target.dataset.accountDialogField, target.value);
      return;
    }

    if (target.dataset.setting) {
      const field = target.dataset.setting as keyof PlanningSettings;
      updatePlanningSetting(field, target.value);
      syncCommittedPlanningSettingInput(target, field);
      requestRenderAll();
      return;
    }

    if (target.dataset.investment) {
      const field = target.dataset.investment as keyof InvestmentSettings;
      updateInvestmentSetting(field, target.value);
      syncCommittedInvestmentSettingInput(target, field);
      requestRenderAll();
      return;
    }

    if (target.dataset.retirementAge) {
      updateRetirementAge(target.value);
      syncCommittedRetirementAgeInput(target);
      requestRenderAll();
      return;
    }

    if (target.dataset.realEstateField) {
      const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
      updateRealEstateField(target.dataset.realEstateField as RealEstateField, value);
      requestRenderAll();
      return;
    }

    if (target.dataset.incomeCollection && target.dataset.incomeId && target.dataset.incomeField) {
      const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
      updateIncomeEntry(
        target.dataset.incomeCollection,
        target.dataset.incomeId,
        target.dataset.incomeField,
        value
      );
      requestRenderAll();
      return;
    }

    if (target.dataset.incomeSetting) {
      updateIncomeSetting(target.dataset.incomeSetting as keyof IncomeTrackerSettings, target.value);
      requestRenderAll();
      return;
    }

    if (handleIncomePlanningControl(target, "full")) {
      return;
    }

    if (target.dataset.incomePlanningStampField) {
      updateIncomePlanningStampPickerDraft(target.dataset.incomePlanningStampField, target.value);
      return;
    }

    if (target.dataset.incomeStampPlannerField) {
      updateIncomeStampPlannerDialogDraft(target.dataset.incomeStampPlannerField, target.value);
      return;
    }

    if (target.dataset.positionCostPositionId && target.dataset.positionCostItemId && target.dataset.positionCostField) {
      updatePositionCostBreakdownItem(
        target.dataset.positionCostPositionId,
        target.dataset.positionCostItemId,
        target.dataset.positionCostField,
        target.value
      );
      requestRenderAll();
      return;
    }

    if (target.dataset.positionId && target.dataset.positionField) {
      const value = target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value;
      updatePosition(target.dataset.positionId, target.dataset.positionField as keyof ReservePosition, value);
      requestRenderAll();
      return;
    }

    if (target.dataset.includePosition && target instanceof HTMLInputElement) {
      toggleInvestmentPosition(target.dataset.includePosition, target.checked);
      renderInvestmentSelectionChange();
      return;
    }

    if (target.dataset.combinedCashPosition && target instanceof HTMLInputElement) {
      toggleCombinedCashPosition(target.dataset.combinedCashPosition, target.checked);
      requestRenderAll();
      return;
    }

    if (
      target.dataset.realEstateSourcePosition &&
      target.dataset.realEstateSourceKind &&
      target instanceof HTMLInputElement
    ) {
      toggleRealEstateSourcePosition(
        target.dataset.realEstateSourceKind as RealEstatePaymentSourceKind,
        target.dataset.realEstateSourcePosition,
        target.checked
      );
      requestRenderAll();
      return;
    }

    if (target.dataset.combinedToggle && target instanceof HTMLInputElement) {
      updateCombinedToggle(target.dataset.combinedToggle as CombinedToggleKey, target.checked);
      requestRenderAll();
      return;
    }

    if (target.dataset.combinedNumber) {
      updateCombinedNumber(target.dataset.combinedNumber as CombinedNumberKey, target.value);
      requestRenderAll();
      return;
    }

    if (target.dataset.statutoryPensionField) {
      updateStatutoryPensionField(target.dataset.statutoryPensionField, target.value);
      requestRenderAll();
      return;
    }

    if (target.dataset.statutoryPensionScenario && target.dataset.statutoryPensionScenarioField) {
      updateStatutoryPensionScenarioField(
        target.dataset.statutoryPensionScenario as StatutoryPensionScenarioId,
        target.dataset.statutoryPensionScenarioField,
        target.value
      );
      requestRenderAll();
      return;
    }

    if (target.id === "positionsCsvImport" && target instanceof HTMLInputElement) {
      void importPositionsFromFile(target.files?.[0]);
      target.value = "";
    }

    if (target.id === "incomeCsvImport" && target instanceof HTMLInputElement) {
      void importIncomeCsvFromFile(target.files?.[0]);
      target.value = "";
    }

    if (target.id === "incomePlanningCsvImport" && target instanceof HTMLInputElement) {
      void importIncomePlanningCsvFromFile(target.files?.[0]);
      target.value = "";
    }
  });

  root.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const statutoryPensionProjectionButton = target?.closest<HTMLButtonElement>(
      "button[data-statutory-pension-projection-year]"
    );
    if (statutoryPensionProjectionButton) {
      event.preventDefault();
      showStatutoryPensionProjectionYearPopup(
        numberValue(statutoryPensionProjectionButton.dataset.statutoryPensionProjectionYear || ""),
        event.clientX,
        event.clientY
      );
      return;
    }
    const statutoryPensionYearButton = target?.closest<HTMLButtonElement>("button[data-statutory-pension-year]");
    if (statutoryPensionYearButton) {
      event.preventDefault();
      showStatutoryPensionYearPopup(
        numberValue(statutoryPensionYearButton.dataset.statutoryPensionYear || ""),
        event.clientX,
        event.clientY
      );
      return;
    }
    if (incomePlanningSuppressNextCalendarClick) {
      incomePlanningSuppressNextCalendarClick = false;
      return;
    }
    if (incomeStampPlannerSuppressNextClick) {
      incomeStampPlannerSuppressNextClick = false;
      return;
    }
    const calendarDay = target?.closest<HTMLElement>("[data-income-planning-calendar-day]");
    const calendarStampButton = target?.closest<HTMLButtonElement>("[data-income-planning-calendar-stamp]");
    const plannedStampButton = target?.closest<HTMLButtonElement>("[data-income-stamp-planner-calendar-stamp]");
    if (calendarDay && plannedStampButton) {
      event.preventDefault();
      openIncomeStampPlannerDialogForEdit(plannedStampButton.dataset.incomeStampPlannerStampId || "", {
        switchToPlanner: true
      });
      return;
    }
    if (calendarDay && event.ctrlKey && calendarStampButton) {
      event.preventDefault();
      openIncomePlanningStampPickerForEdit(calendarStampButton.dataset.incomePlanningStampId || "", event.clientX, event.clientY);
      return;
    }
    if (
      calendarDay &&
      event.ctrlKey &&
      !target?.closest("[data-income-planning-calendar-block]") &&
      !target?.closest("[data-income-planning-calendar-background]") &&
      !target?.closest("[data-income-planning-calendar-stamp]") &&
      !target?.closest("[data-income-stamp-planner-calendar-stamp]")
    ) {
      event.preventDefault();
      openIncomePlanningStampPickerFromCalendar(calendarDay, event.clientX, event.clientY);
      return;
    }
    if (calendarDay && target?.closest("[data-income-planning-calendar-background]")) {
      event.preventDefault();
      return;
    }
    if (
      calendarDay &&
      !target?.closest("[data-income-planning-calendar-block]") &&
      !target?.closest("[data-income-planning-calendar-stamp]") &&
      !target?.closest("[data-income-stamp-planner-calendar-stamp]")
    ) {
      event.preventDefault();
      openIncomePlanningDialogFromCalendar(calendarDay, event.clientY);
      return;
    }
    const button = target?.closest<HTMLButtonElement>("button[data-action]");
    if (!button) {
      if (positionIconPicker && !target?.closest("#positionIconPicker")) {
        hidePositionIconPicker();
      }
      if (incomePlanningHabitIconPicker && !target?.closest("#incomePlanningHabitIconPicker")) {
        hideIncomePlanningHabitIconPicker();
      }
      if (incomePlanningStampPicker && !target?.closest("#incomePlanningStampPicker")) {
        hideIncomePlanningStampPicker();
      }
      if (incomePlanningStampMenu && !target?.closest("#incomePlanningStampMenu")) {
        hideIncomePlanningStampMenu();
      }
      if (incomeYearLabelPicker && !target?.closest("#incomeYearLabelPicker")) {
        hideIncomeYearLabelPicker();
      }
      if (incomeMilestoneTypePicker && !target?.closest("#incomeMilestoneTypePicker")) {
        hideIncomeMilestoneTypePicker();
      }
      if (positionFilterPopupOpen && !target?.closest("#positionFilterPopup")) {
        hidePositionFilterPopup();
      }
      if (!target?.closest("#statutoryPensionYearPopup")) {
        hideStatutoryPensionYearPopup();
      }
      if (!target?.closest("#statutoryPensionProjectionYearPopup")) {
        hideStatutoryPensionProjectionYearPopup();
      }
      if (!target?.closest("#combinedWealthChartPopup")) {
        hideCombinedWealthPopup();
      }
      if (target?.id === "combinedCashPositionPopup" || !target?.closest("#combinedCashPositionPopup")) {
        hideCombinedCashPositionPopup();
      }
      if (
        investmentIncludePopupOpen &&
        !target?.closest("#investmentIncludePopup") &&
        !target?.closest("[data-action='toggle-investment-include-popup']")
      ) {
        hideInvestmentIncludePopup();
      }
      if (!target?.closest("#baseDataPopup")) {
        hideBaseDataPopup();
      }
      return;
    }

    event.preventDefault();
    const action = button.dataset.action;
    if (action !== "open-position-icon-picker" && action !== "select-position-icon") {
      hidePositionIconPicker();
    }
    if (
      action !== "open-income-planning-icon-picker" &&
      action !== "select-income-planning-icon" &&
      action !== "close-income-planning-icon-picker"
    ) {
      hideIncomePlanningHabitIconPicker();
    }
    if (
      action !== "income-planning-open-stamp-menu" &&
      action !== "income-planning-edit-stamp" &&
      action !== "income-planning-save-stamp" &&
      action !== "income-planning-delete-stamp" &&
      action !== "income-planning-close-stamp-picker" &&
      action !== "income-planning-close-stamp-menu" &&
      action !== "select-income-planning-stamp-preset" &&
      action !== "select-income-planning-stamp-icon" &&
      !button.closest("#incomePlanningStampPicker") &&
      !button.closest("#incomePlanningStampMenu")
    ) {
      hideIncomePlanningStampPicker();
      hideIncomePlanningStampMenu();
    }
    if (action !== "open-income-year-label-picker" && action !== "select-income-year-label") {
      hideIncomeYearLabelPicker();
    }
    if (action !== "open-income-milestone-type-picker" && action !== "select-income-milestone-type") {
      hideIncomeMilestoneTypePicker();
    }
    if (positionFilterPopupOpen && action !== "toggle-position-filter" && !button.closest("#positionFilterPopup")) {
      hidePositionFilterPopup();
    }
    if (action !== "close-statutory-pension-year-popup" && !button.closest("#statutoryPensionYearPopup")) {
      hideStatutoryPensionYearPopup();
    }
    if (action !== "close-statutory-pension-projection-popup" && !button.closest("#statutoryPensionProjectionYearPopup")) {
      hideStatutoryPensionProjectionYearPopup();
    }
    if (action !== "close-combined-wealth-popup" && !button.closest("#combinedWealthChartPopup")) {
      hideCombinedWealthPopup();
    }
    if (
      action !== "close-combined-cash-position-popup" &&
      !action?.startsWith("select-combined-cash-account-") &&
      !button.closest("#combinedCashPositionPopup")
    ) {
      hideCombinedCashPositionPopup();
    }
    if (
      investmentIncludePopupOpen &&
      action !== "toggle-investment-include-popup" &&
      action !== "close-investment-include-popup" &&
      !button.closest("#investmentIncludePopup")
    ) {
      hideInvestmentIncludePopup();
    }
    if (
      action !== "open-base-data-popup" &&
      action !== "close-base-data-popup" &&
      !button.closest("#baseDataPopup")
    ) {
      hideBaseDataPopup();
    }
    if (action === "add-position") addPosition();
    if (action === "reset") resetState();
    if (action === "select-planning-year") {
      setSelectedPlanningYear(button.dataset.planningYear || "start");
      return;
    }
    if (action === "show-income-positions") setSelectedPositionMode("income");
    if (action === "show-expense-positions") setSelectedPositionMode("expense");
    if (action?.startsWith("set-position-cadence-")) {
      setSelectedPositionCadence(action.replace("set-position-cadence-", "") as PositionTableCadence);
    }
    if (action?.startsWith("open-position-cost-dialog-")) {
      openPositionCostDialog(action.replace("open-position-cost-dialog-", ""));
    }
    if (action === "close-position-cost-dialog") closePositionCostDialog();
    if (action === "add-position-cost-item") addPositionCostBreakdownItem(button.dataset.positionId || "");
    if (action === "remove-position-cost-item") {
      removePositionCostBreakdownItem(button.dataset.positionId || "", button.dataset.positionCostItemId || "");
    }
    if (action === "show-reserve-positions") setSelectedPositionMode("reserve");
    if (action === "show-savings-positions") setSelectedPositionMode("savings");
    if (action === "toggle-position-filter") togglePositionFilterPopup();
    if (action === "close-position-filter") hidePositionFilterPopup();
    if (action === "toggle-position-label-filter") togglePositionLabelFilter(button.dataset.positionLabel || "");
    if (action === "add-position-filter") addPositionTableFilter();
    if (action === "remove-position-filter") removePositionTableFilter(button.dataset.filterId || "");
    if (action === "clear-position-sort") clearPositionTableSort();
    if (action === "clear-position-table-view") clearCurrentPositionTableView();
    if (action?.startsWith("sort-position-table-")) {
      togglePositionTableSort(action.replace("sort-position-table-", "") as PositionTableFilterColumn);
    }
    if (action?.startsWith("open-section-")) {
      const section = appSectionIdFromValue(action.replace("open-section-", ""));
      if (!section) return;
      setActiveSection(section);
      renderAll();
      return;
    }
    if (action?.startsWith("income-tab-")) setIncomeInputTab(action.replace("income-tab-", ""));
    if (action === "income-add-yearly") addIncomeYearlyEntry();
    if (action === "income-add-milestone") addIncomeMilestone();
    if (action?.startsWith("income-open-tax-dialog-")) openIncomeTaxDialog(action.replace("income-open-tax-dialog-", ""));
    if (action === "income-close-tax-dialog") closeIncomeTaxDialog();
    if (action === "income-open-analysis") openIncomeAnalysisDialog();
    if (action === "income-close-analysis") closeIncomeAnalysisDialog();
    if (action?.startsWith("income-analysis-chart-")) {
      setIncomeAnalysisChartType(action.replace("income-analysis-chart-", "") as IncomeAnalysisChartType);
    }
    if (action?.startsWith("income-analysis-view-")) {
      setIncomeAnalysisDataView(action.replace("income-analysis-view-", "") as IncomeAnalysisDataView);
    }
    if (action?.startsWith("income-analysis-year-")) {
      setIncomeAnalysisYearFilter(action.replace("income-analysis-year-", ""));
    }
    if (action === "toggle-income-analysis-label") toggleIncomeAnalysisLabel(button.dataset.incomeAnalysisLabel || "");
    if (action === "toggle-income-year-label-filter") toggleIncomeYearLabelFilter(button.dataset.incomeLabel || "");
    if (action === "income-import-csv") document.querySelector<HTMLInputElement>("#incomeCsvImport")?.click();
    if (action?.startsWith("income-remove-")) removeIncomeEntry(action);
    if (action === "income-export-csv") void exportIncomeCsv();
    if (action === "income-export-pdf") exportIncomePdf();
    if (action === "income-planning-import-csv") document.querySelector<HTMLInputElement>("#incomePlanningCsvImport")?.click();
    if (action === "income-planning-export-csv") void exportIncomePlanningCsvFile();
    if (action === "income-planning-add-work-block") openIncomePlanningDialog("work", "create");
    if (action === "income-planning-remove-work-block") {
      removeIncomePlanningWorkBlock(button.dataset.incomePlanningWorkId || "");
    }
    if (action === "income-planning-add-habit") openIncomePlanningDialog("habit", "create");
    if (action === "income-planning-remove-habit") removeIncomePlanningHabit(button.dataset.incomePlanningHabitId || "");
    if (action === "income-planning-add-manual-block") openIncomePlanningDialog("manual", "create");
    if (action === "income-planning-remove-manual-block") {
      removeIncomePlanningManualBlock(button.dataset.incomePlanningManualId || "");
    }
    if (action === "income-planning-add-slot") {
      openIncomePlanningDialog(
        incomePlanningOwnerTypeFromValue(button.dataset.incomePlanningOwnerType),
        "create_slot",
        button.dataset.incomePlanningOwnerId || null
      );
    }
    if (action === "income-planning-remove-slot") {
      removeIncomePlanningSlot(
        button.dataset.incomePlanningOwnerType || "",
        button.dataset.incomePlanningOwnerId || "",
        button.dataset.incomePlanningSlotId || ""
      );
    }
    if (action === "income-planning-edit-assumption") openIncomePlanningDialog("assumption", "edit");
    if (action === "income-planning-add-sleep-slot") addIncomePlanningDialogSleepSlot();
    if (action === "income-planning-remove-sleep-slot") removeIncomePlanningDialogSleepSlot(button.dataset.incomePlanningSleepSlotGroupId || "");
    if (action === "income-planning-open-block") {
      openIncomePlanningDialog(
        incomePlanningOwnerTypeFromValue(button.dataset.incomePlanningOwnerType),
        "edit",
        button.dataset.incomePlanningOwnerId || null,
        button.dataset.incomePlanningSlotId || null
      );
    }
    if (action === "income-planning-close-dialog") closeIncomePlanningDialog();
    if (action === "income-planning-save-dialog") saveIncomePlanningDialog();
    if (action === "income-planning-delete-dialog-slot") deleteIncomePlanningDialogSlot();
    if (action === "income-planning-set-dialog-color") {
      updateIncomePlanningDialogDraft("color", button.dataset.incomePlanningColor || "");
      renderIncomePlanningDialog();
    }
    if (action === "open-income-planning-icon-picker") showIncomePlanningHabitIconPicker(button);
    if (action === "close-income-planning-icon-picker") hideIncomePlanningHabitIconPicker();
    if (action === "select-income-planning-icon") {
      selectIncomePlanningHabitIcon(button.dataset.incomePlanningIcon || "");
    }
    if (action === "income-planning-open-stamp-menu") {
      openIncomePlanningStampMenu(button.dataset.incomePlanningStampId || "", event.clientX, event.clientY);
    }
    if (action === "income-planning-edit-stamp") {
      openIncomePlanningStampPickerForEdit(button.dataset.incomePlanningStampId || "", event.clientX, event.clientY);
    }
    if (action === "income-planning-close-stamp-picker") hideIncomePlanningStampPicker();
    if (action === "income-planning-close-stamp-menu") hideIncomePlanningStampMenu();
    if (action === "select-income-planning-stamp-icon") {
      selectIncomePlanningStampIcon(button.dataset.incomePlanningStampIcon || "");
    }
    if (action === "select-income-planning-stamp-preset") {
      selectIncomePlanningStampPreset(button.dataset.incomePlanningStampLabel || "", button.dataset.incomePlanningStampIcon || "");
    }
    if (action === "income-planning-save-stamp") saveIncomePlanningStampPicker();
    if (action === "income-planning-delete-stamp") deleteIncomePlanningStamp(button.dataset.incomePlanningStampId || "");
    if (action === "income-planning-prev-week") showPreviousIncomePlanningWeek();
    if (action === "income-planning-next-week") showNextIncomePlanningWeek();
    if (action === "income-planning-current-week") showCurrentIncomePlanningWeek();
    if (action?.startsWith("select-income-planning-week-scenario-")) {
      setIncomePlanningWeekScenario(action.replace("select-income-planning-week-scenario-", ""));
    }
    if (action === "income-planning-open-week-scenario-dialog") openIncomePlanningWeekScenarioDialog();
    if (action === "income-planning-close-week-scenario-dialog") closeIncomePlanningWeekScenarioDialog();
    if (action === "income-planning-save-week-scenario") saveIncomePlanningWeekScenarioDialog();
    if (action === "income-stamp-planner-add") openIncomeStampPlannerDialogForDate();
    if (action === "income-stamp-planner-add-date") {
      openIncomeStampPlannerDialogForDate(button.dataset.incomeStampPlannerDate || "");
    }
    if (action === "income-stamp-planner-edit") {
      openIncomeStampPlannerDialogForEdit(button.dataset.incomeStampPlannerStampId || "");
    }
    if (action === "income-stamp-planner-close-dialog") closeIncomeStampPlannerDialog();
    if (action === "income-stamp-planner-save") saveIncomeStampPlannerDialog();
    if (action === "income-stamp-planner-delete") deleteIncomeStampPlannerStamp();
    if (action === "select-income-stamp-planner-icon") {
      selectIncomeStampPlannerIcon(button.dataset.incomeStampPlannerIcon || "");
    }
    if (action === "select-income-stamp-planner-preset") {
      selectIncomeStampPlannerPreset(button.dataset.incomeStampPlannerLabel || "", button.dataset.incomeStampPlannerIcon || "");
    }
    if (action === "income-stamp-planner-prev-month") showPreviousIncomeStampPlannerMonth();
    if (action === "income-stamp-planner-next-month") showNextIncomeStampPlannerMonth();
    if (action === "income-stamp-planner-current-month") showCurrentIncomeStampPlannerMonth();
    if (action === "add-planning-account") addPlanningAccount();
    if (action === "rename-planning-account") renamePlanningAccount();
    if (action === "cancel-planning-account-dialog") closePlanningAccountDialog();
    if (action === "save-planning-account-dialog") savePlanningAccountDialog();
    if (action === "delete-planning-account") deletePlanningAccount();
    if (action?.startsWith("select-planning-account-")) {
      selectPlanningAccount(action.replace("select-planning-account-", ""));
    }
    if (action?.startsWith("select-investment-account-")) {
      selectInvestmentAccount(action.replace("select-investment-account-", ""));
    }
    if (action?.startsWith("toggle-real-estate-account-")) {
      toggleRealEstateSourceAccount(action.replace("toggle-real-estate-account-", ""));
    }
    if (action?.startsWith("toggle-combined-account-")) {
      toggleCombinedAccount(action.replace("toggle-combined-account-", ""));
    }
    if (action?.startsWith("select-combined-cash-account-")) {
      selectCombinedCashAccount(action.replace("select-combined-cash-account-", ""));
      renderAll();
      return;
    }
    if (action?.startsWith("select-combined-lead-account-")) {
      selectCombinedLeadInvestmentAccount(action.replace("select-combined-lead-account-", ""));
    }
    if (action === "toggle-combined-depot") {
      toggleCombinedDepot(button.dataset.combinedDepot as CombinedWealthDepotKey | undefined);
      renderAll();
      return;
    }
    if (action === "select-combined-pension-scenario") {
      selectCombinedPensionScenario(button.dataset.combinedPensionScenario as StatutoryPensionScenarioId | undefined);
      renderAll();
      return;
    }
    if (action === "toggle-result-max-needed") toggleResultMaxNeeded();
    if (action === "set-investment-depot-standard") setInvestmentDepot("standard");
    if (action === "set-investment-depot-retirement") setInvestmentDepot("retirement");
    if (action === "set-investment-depot-child") setInvestmentDepot("child");
    if (action === "toggle-interest-investment") toggleInterestInvestment();
    if (action === "toggle-cashback-investment") toggleCashbackInvestment();
    if (action === "toggle-investment-include-popup") toggleInvestmentIncludePopup();
    if (action === "close-investment-include-popup") hideInvestmentIncludePopup();
    if (action === "toggle-real-estate-withdrawal-gain-source") toggleRealEstateWithdrawalGainSource();
    if (action === "toggle-real-estate-depot-savings-rate-source") toggleRealEstateDepotSavingsRateSource();
    if (action === "toggle-combined-module") {
      toggleCombinedModule(button.dataset.combinedToggle as CombinedToggleKey);
      renderAll();
      return;
    }
    if (action === "add-real-estate-savings-source-equityCapital") addRealEstateSavingsSource("equityCapital");
    if (action === "add-real-estate-savings-source-monthlyPayment") addRealEstateSavingsSource("monthlyPayment");
    if (action === "add-real-estate-savings-source-specialRepayment") addRealEstateSavingsSource("specialRepayment");
    if (action === "close-investment-chart-popup") hideInvestmentChartPopup();
    if (action === "close-statutory-pension-year-popup") hideStatutoryPensionYearPopup();
    if (action === "close-statutory-pension-projection-popup") hideStatutoryPensionProjectionYearPopup();
    if (action === "close-combined-wealth-popup") hideCombinedWealthPopup();
    if (action === "close-combined-cash-position-popup") hideCombinedCashPositionPopup();
    if (action === "open-statutory-pension-tax-popup") {
      openStatutoryPensionTaxPopup(button.dataset.statutoryPensionScenario as StatutoryPensionScenarioId);
      return;
    }
    if (action === "close-statutory-pension-tax-popup") {
      closeStatutoryPensionTaxPopup();
      return;
    }
    if (action === "toggle-theme-settings") toggleThemeSettings();
    if (action === "toggle-settings-grunddaten") toggleSettingsGrunddaten();
    if (action === "close-theme-settings") hideThemeSettings();
    if (action === "open-base-data-popup") openBaseDataPopup();
    if (action === "close-base-data-popup") hideBaseDataPopup();
    if (action === "open-position-icon-picker") showPositionIconPicker(button);
    if (action === "close-position-icon-picker") hidePositionIconPicker();
    if (action === "select-position-icon") {
      selectPositionIcon(button.dataset.positionId || "", button.dataset.positionIcon || "");
    }
    if (action === "open-income-year-label-picker") showIncomeYearLabelPicker(button);
    if (action === "close-income-year-label-picker") hideIncomeYearLabelPicker();
    if (action === "select-income-year-label") {
      selectIncomeYearLabel(button.dataset.incomeYearId || "", button.dataset.incomeLabel || "");
    }
    if (action === "open-income-milestone-type-picker") showIncomeMilestoneTypePicker(button);
    if (action === "close-income-milestone-type-picker") hideIncomeMilestoneTypePicker();
    if (action === "select-income-milestone-type") {
      selectIncomeMilestoneType(button.dataset.milestoneId || "", button.dataset.milestoneType || "");
    }
    if (action === "set-theme-light") setThemeMode("light");
    if (action === "set-theme-dark") setThemeMode("dark");
    if (action === "select-real-estate-year") {
      const year = numberValue(button.dataset.year || "");
      const chartKind = button.dataset.chartKind === "trend" ? "trend" : "repayment";
      setSelectedRealEstateYear(year);
      showRealEstateChartPopup(year, chartKind, event.clientX, event.clientY);
      return;
    }
    if (action === "toggle-combined-wealth-line") {
      toggleCombinedWealthLine(button.dataset.combinedWealthLine as CombinedWealthLineId | undefined);
      return;
    }
    if (action === "select-combined-wealth-year") {
      const year = numberValue(button.dataset.year || "");
      selectCombinedWealthYearWithPopup(year, event.clientX, event.clientY);
      return;
    }
    if (action === "import-positions") document.querySelector<HTMLInputElement>("#positionsCsvImport")?.click();
    if (action === "export-positions") {
      void exportCsvFile(
        "kosten-und-ruecklagenpositionen.csv",
        exportPositionsCsv(state.positions),
        "Positionen-Export"
      );
    }
    if (action === "export-year") {
      void exportCsvFile(
        "jahreskalkulator-ruecklagen.csv",
        exportYearTableCsv(activePlanningSettings(), activePlanningPositions(), showResultMaxNeeded),
        "Jahrestabellen-Export"
      );
    }
  });

  root.addEventListener("dragstart", (event) => {
    if (hasActivePositionTableView(currentPositionTableView())) return;
    const handle = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-position-drag-id]");
    if (!handle) return;

    draggedPositionId = handle.dataset.positionDragId || null;
    if (!draggedPositionId) return;

    event.dataTransfer?.setData("text/plain", draggedPositionId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    handle.closest("tr")?.classList.add("dragging");
  });

  root.addEventListener("dragover", (event) => {
    if (hasActivePositionTableView(currentPositionTableView())) return;
    const row = (event.target as HTMLElement | null)?.closest<HTMLTableRowElement>("tr[data-position-row]");
    if (!row || !draggedPositionId) return;
    event.preventDefault();
    row.classList.add("drag-over");
  });

  root.addEventListener("dragleave", (event) => {
    const row = (event.target as HTMLElement | null)?.closest<HTMLTableRowElement>("tr[data-position-row]");
    row?.classList.remove("drag-over");
  });

  root.addEventListener("drop", (event) => {
    if (hasActivePositionTableView(currentPositionTableView())) return;
    const row = (event.target as HTMLElement | null)?.closest<HTMLTableRowElement>("tr[data-position-row]");
    if (!row || !draggedPositionId) return;
    event.preventDefault();

    const targetId = row.dataset.positionRow;
    if (targetId) {
      const afterTarget = event.clientY > row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2;
      reorderPosition(draggedPositionId, targetId, afterTarget);
      renderAll();
    }
    clearDragState();
  });

  root.addEventListener("dragend", clearDragState);
  root.addEventListener("pointerdown", startIncomePlanningCalendarDrag);
  window.addEventListener("pointermove", moveIncomePlanningCalendarDrag);
  window.addEventListener("pointerup", finishIncomePlanningCalendarDrag);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideThemeSettings();
      hideInvestmentChartPopup();
      hideCombinedWealthPopup();
      hideCombinedCashPositionPopup();
      hideBaseDataPopup();
      hideStatutoryPensionYearPopup();
      hideStatutoryPensionProjectionYearPopup();
      closeStatutoryPensionTaxPopup();
      hideInvestmentIncludePopup();
      hidePositionFilterPopup();
      hideIncomePlanningStampPicker();
      hideIncomePlanningStampMenu();
      closePlanningAccountDialog();
      closeIncomeTaxDialog();
      closeIncomeAnalysisDialog();
      closeIncomePlanningDialog();
      hideIncomeYearLabelPicker();
      hideIncomeMilestoneTypePicker();
    }
  });
  window.addEventListener("popstate", () => {
    const section = sectionFromLocationHash() ?? "home";
    setActiveSection(section, { updateHistory: false });
    renderAll();
  });
  window.addEventListener("resize", drawCurrentInvestmentChart);
}

function requestRenderAll(): void {
  if (renderAllTimer !== null) window.clearTimeout(renderAllTimer);
  renderAllTimer = window.setTimeout(() => {
    renderAllTimer = null;
    renderAll();
  }, FORM_RENDER_DEBOUNCE_MS);
}

function startIncomePlanningCurrentTimeTicker(): void {
  if (incomePlanningCurrentTimeTimerId !== null) return;
  incomePlanningCurrentTimeTimerId = window.setInterval(() => {
    if (state.ui.activeSection !== "income_planning") return;
    renderIncomePlanningSummary();
  }, 60 * 1000);
}

function clearInvestmentProjectionCaches(): void {
  annualInvestmentTransferCache = new WeakMap();
  depotAssetProjectionCache.clear();
}

function renderAll(): void {
  if (renderAllRunning) {
    requestRenderAll();
    return;
  }
  if (renderAllTimer !== null) {
    window.clearTimeout(renderAllTimer);
    renderAllTimer = null;
  }
  clearInvestmentProjectionCaches();
  renderAllRunning = true;
  try {
    syncActivePlanningAccountFromPositions();
    syncPositionsFromActivePlanningAccount();
    normalizeActivePlanningYear();
    synchronizeAccountScopedState();
    normalizeInvestmentBounds();
    normalizeInvestmentDepotSelections();
    normalizeInvestmentSelectionIds();
    normalizeRealEstateSourceIds();
    normalizeCombinedCashPositionIds();
    state.investmentByAccountId = {
      ...state.investmentByAccountId,
      [state.ui.selectedInvestmentAccountId]: state.investment
    };
    updateModuleVisibility();
    renderPlanningAccounts();
    renderPlanningYearNavigation();
    const planningSettings = activePlanningSettings();
    const activeReserve = calculateReserveSummary(planningSettings, activePlanningPositions());
    renderPositions();
    renderPositionCostDialog();
    renderInvestmentIncludeList();
    renderCalculations(activeReserve);
    syncPlanningInputsFromState();
    syncRealEstateInputsFromState();
    syncCombinedToggleInputsFromState();
    syncInvestmentInputsFromState();
    syncSettingsAccordionState();
    renderIncomeTracker();
    renderIncomePlanning();
    renderIncomeStampPlanner();
    saveState(state);
  } finally {
    renderAllRunning = false;
  }
}

function renderCalculations(activeReserve: ReturnType<typeof calculateReserveSummary>): void {
  const standardProjection = buildDepotAssetProjection("standard");
  const retirementProjection = buildDepotAssetProjection("retirement");
  const childProjection = buildDepotAssetProjection("child");
  const activeDepot = activeInvestmentDepot();
  const projection =
    activeDepot === "child" ? childProjection : activeDepot === "retirement" ? retirementProjection : standardProjection;
  const combinedProjection = combineAssetProjections(standardProjection, retirementProjection);
  syncInvestmentProjectionLabels(activeDepot);

  setText("monthlyRateMetric", money(projection.monthlyRate));
  setText("monthlySavingsRateMetric", `${money(projection.monthlyRate)} monatlich`);
  setText("annualSavingsRateMetric", money(projection.annualSavingsRate));
  setText("wealthAtRetirementMetric", money(projection.wealthAtRetirement));
  setText("withdrawalOffsetMetric", money(projection.withdrawalRemainingSavingsMonthlyAtStart));
  setText("withdrawalGainMetric", money(projection.withdrawalGainMonthlyAtStart));
  setText("monthlyPensionMetric", money(projection.monthlyPension));
  setText("realWealthMetric", money(projection.realWealthAtRetirement));
  setText("combinedStandardWealthMetric", money(standardProjection.wealthAtRetirement));
  setText("combinedRetirementWealthMetric", money(retirementProjection.wealthAtRetirement));
  setText("combinedWealthMetric", money(combinedProjection.wealthAtRetirement));
  setText("combinedMonthlyRateMetric", money(combinedProjection.monthlyRate));
  setText("combinedMonthlyPensionMetric", money(combinedProjection.monthlyPension));
  setText("combinedRealWealthMetric", money(combinedProjection.realWealthAtRetirement));
  setText("retirementDepotFundingStatus", "Aktiv nach Reformlogik ab 2027");
  setText("retirementDepotOwnContributionMetric", money(projection.retirementDepotAnnualOwnContribution));
  setText("retirementDepotBaseAllowanceMetric", money(projection.retirementDepotBaseAllowanceAnnual));
  setText("retirementDepotChildAllowanceMetric", money(projection.retirementDepotChildAllowanceAnnual));
  setText("retirementDepotAllowanceRateMetric", percent(projection.retirementDepotAllowanceRatePercent));
  setText("retirementDepotTotalAllowanceMetric", money(projection.retirementDepotAllowanceAnnual));
  setText("retirementDepotTotalContributionMetric", money(projection.retirementDepotAnnualContributionWithAllowance));
  setText("retirementDepotAllowanceAtRetirementMetric", money(projection.allowanceAtRetirement));

  const activeSettings = depotInvestmentSettings(activeInvestmentDepot());
  setRangeLabel("investmentReturnPercent", percent(activeSettings.investmentReturnPercent));
  setRangeLabel("capitalGainsTaxPercent", percent(activeSettings.capitalGainsTaxPercent));
  setRangeLabel("inflationRatePercent", percent(activeSettings.inflationRatePercent));
  setRangeLabel("bequestReservePercent", percent(activeSettings.bequestReservePercent));
  setInputValue("[data-retirement-age]", projection.retirementAge);

  setText(
    "detailContribution",
    contributionDetailText(projection)
  );
  setText("detailAllowance", money(projection.allowanceAtRetirement));
  setText("detailAllowanceBasis", money(projection.allowanceBasisAtRetirement));
  setText(
    "detailCostBasis",
    money(Math.max(0, projection.costBasisAtRetirement - projection.allowanceBasisAtRetirement))
  );
  setText("detailGrowth", money(projection.growthAtRetirement));
  setText("detailGrossWealth", money(projection.grossWealthAtRetirement));
  setText("detailTax", projection.taxAtRetirement > 0 ? `-${money(projection.taxAtRetirement)}` : money(0));
  setText(
    "detailUnrealizedTax",
    projection.unrealizedTaxAtRetirement > 0 ? `-${money(projection.unrealizedTaxAtRetirement)}` : money(0)
  );
  setText("detailLiquidationWealth", money(projection.netWealthAfterFullTaxAtRetirement));
  setText("detailNetWealth", money(projection.wealthAtRetirement));
  setText("detailInflationFactor", `${projection.inflationFactorAtRetirement.toFixed(2).replace(".", ",")}x`);
  setText("detailRealWealth", money(projection.realWealthAtRetirement));
  setText("detailAnnualSavingsRate", money(projection.annualSavingsRate));
  setText("detailAgeToday", `${intNumber(projection.ageToday)} Jahre`);
  setText("detailPayoutStartAge", `${intNumber(projection.retirementAge)} Jahre`);
  setText("detailPercentageWithdrawalStartAge", `${intNumber(projection.percentageWithdrawalStartAge)} Jahre`);
  setText("detailPercentageWithdrawalRate", percent(projection.percentageWithdrawalRatePercent));
  setText("detailPercentageWithdrawalMonthly", money(projection.percentageWithdrawalMonthlyAtStart));
  setText("detailPercentageWithdrawalAnnual", money(projection.percentageWithdrawalAnnualAtStart));
  setText("detailSavingMonths", `${intNumber(projection.savingMonths)} Monate`);
  setText("detailMonthlyPension", money(projection.monthlyPension));
  setText("detailRealMonthlyPension", money(projection.realMonthlyPension));
  setText(
    "detailBequestReserve",
    `${money(projection.bequestReserveAtEnd)} (${percent(projection.bequestReservePercent)})`
  );
  setText("detailSelectedMonthlyRate", money(projection.monthlyRate));

  renderAccountYearTables();
  renderReserveChartPopup(activeReserve);
  hideInvestmentChartPopup();
  drawInvestmentChartWithPopup(projection);
  drawInvestmentChartWithPopup(combinedProjection, "#combinedInvestmentChart", "#combinedInvestmentChartPopup");

  const financingStartYear = realEstateFinancingStartYear(
    state.settings.year,
    state.investment.birthYear,
    state.realEstate.financingStartAge
  );
  const realEstateProjectionYears = currentRealEstateProjectionYears(financingStartYear, standardProjection.endAge);
  const maxRealEstateProjectionYears = currentRealEstateMaximumProjectionYears(financingStartYear);
  const combinedLeadAccount = selectedCombinedLeadInvestmentPlanningAccount();
  const combinedLeadSettings = combinedLeadAccount
    ? state.investmentByAccountId[combinedLeadAccount.id] ?? defaultInvestmentSettingsForNewAccount()
    : null;
  const combinedStandardProjection = combinedLeadAccount
    ? buildDepotAssetProjection("standard", combinedLeadAccount.id)
    : combinedProjectionWithoutAccounts(standardProjection);
  const combinedRetirementProjection = combinedLeadAccount
    ? buildDepotAssetProjection("retirement", combinedLeadAccount.id)
    : combinedProjectionWithoutAccounts(retirementProjection);
  const combinedDepotProjections = combinedDepotProjectionInputs(combinedLeadAccount);
  const combinedBirthYear = combinedLeadSettings?.birthYear ?? state.settings.year;
  const combinedRetirementBirthYear = combinedLeadSettings?.retirementBirthYear ?? state.settings.year;
  const combinedRealEstateStartYear = realEstateFinancingStartYear(
    state.settings.year,
    combinedBirthYear,
    state.realEstate.financingStartAge
  );
  renderStatutoryPensionCalculations(combinedBirthYear);
  const combinedRealEstateProjectionYears = currentCombinedRealEstateProjectionYears(
    combinedRealEstateStartYear,
    combinedStandardProjection,
    combinedRetirementProjection,
    combinedBirthYear,
    combinedRetirementBirthYear
  );
  renderRealEstateSourceLists();
  const realEstate = calculateRealEstateFinancing(
    financingStartYear,
    state.realEstate,
    realEstateSourceSchedule(financingStartYear, maxRealEstateProjectionYears),
    {
      projectionYears: realEstateProjectionYears,
      maxProjectionYears: maxRealEstateProjectionYears
    }
  );
  renderRealEstateCalculations(realEstate, realEstateProjectionYears);
  renderCombinedModuleControls();
  const combinedRealEstateActive = state.realEstate.purchaseActivated && state.combinedWealth.includeRealEstateFinancing;
  const combinedRealEstate = combinedRealEstateActive
    ? calculateRealEstateFinancing(
        combinedRealEstateStartYear,
        state.realEstate,
        realEstateSourceSchedule(
          combinedRealEstateStartYear,
          combinedRealEstateProjectionYears,
          state.ui.selectedRealEstateAccountIds
        ),
        {
          projectionYears: combinedRealEstateProjectionYears,
          maxProjectionYears: combinedRealEstateProjectionYears
        }
      )
    : inactiveCombinedRealEstateResult(combinedRealEstateStartYear);
  const combinedYears = calculateCombinedWealthYears(
    combinedRealEstate,
    combinedDepotProjections,
    combinedPensionInput(latestStatutoryPensionModel, combinedBirthYear)
  );
  renderCombinedWealthCalculations(combinedYears);
}

function syncInvestmentProjectionLabels(depot: InvestmentDepotKey): void {
  const isChild = depot === "child";
  setSectionHidden("#combinedInvestmentCard", isChild);
  setSectionHidden("#withdrawalGainMetricCard", isChild);
  setSectionHidden("#monthlyPensionMetricCard", isChild);
  setText("wealthAtRetirementMetricLabel", isChild ? "Vermoegen zur Auszahlung" : "Vermoegen zur Rente");
  setText("monthlyPensionMetricLabel", isChild ? "Monatliche Auszahlung netto" : "Monatliche Rente netto");
  setText("realWealthMetricLabel", isChild ? "Reales Vermoegen zur Auszahlung" : "Reales Vermoegen zur Rente");
  setText("detailAgeTodayLabel", isChild ? "Alter des Kindes heute" : "Alter heute");
  setText("detailTaxLabel", isChild ? "Realisierte Steuern bis Auszahlung" : "Realisierte Steuern bis Rente");
  setText(
    "detailUnrealizedTaxLabel",
    isChild ? "Offene Steuer bei Verkauf zur Auszahlung" : "Offene Steuer bei Verkauf zur Rente"
  );
  setText("detailPayoutStartAgeLabel", isChild ? "Auszahlung ab Alter" : "Gleichmaessige Entnahme ab Alter");
  setText(
    "detailMonthlyPensionLabel",
    isChild ? "Monatliche Auszahlung netto" : "Monatliche gleichmaessige Entnahme netto"
  );
  setText(
    "detailRealMonthlyPensionLabel",
    isChild ? "Monatliche Auszahlung real" : "Monatliche gleichmaessige Entnahme real"
  );
  setText("detailBequestReserveLabel", isChild ? "Reserve zum Auszahlungsalter" : "Reserve/Erbe zum Enddatum");
}

function renderIncomeTracker(): void {
  const panel = document.querySelector<HTMLElement>('[data-module-section="income"]');
  if (!panel) return;
  const model = incomeTrackerModel();
  renderIncomeTabs();
  renderIncomeYearLabelFilters();
  renderIncomeRows();
  renderIncomeSettingControls();
  renderIncomeMetricGrid(model);
  renderIncomeInsights(model);
  renderIncomeYearStatusRows(model);
  renderIncomeCharts(model);
  renderIncomeTaxDialog();
  renderIncomeAnalysisDialog(model);
  renderIncomeYearLabelPicker();
  renderIncomeMilestoneTypePicker();
}

function renderIncomePlanning(): void {
  const panel = document.querySelector<HTMLElement>('[data-module-section="income_planning"]');
  if (!panel) return;
  const activeWeekModel = incomePlanningModelForActiveWeek();
  renderIncomePlanningSources();
  renderIncomePlanningCareerLife(activeWeekModel);
  renderIncomePlanningAssumptions();
  renderIncomePlanningManualBlocks();
  renderIncomePlanningHabits();
  renderIncomePlanningCalendarStamps();
  renderIncomePlanningSummary(activeWeekModel);
  renderIncomePlanningDialog();
  renderIncomePlanningWeekScenarioDialog();
  renderIncomePlanningHabitIconPicker();
  renderIncomePlanningStampPicker();
  renderIncomePlanningStampMenu();
}

function renderIncomeStampPlanner(): void {
  const panel = document.querySelector<HTMLElement>('[data-module-section="income_stamp_planner"]');
  if (!panel) return;
  renderIncomeStampPlannerControls();
  renderIncomeStampPlannerGrid();
  renderIncomeStampPlannerDialog();
}

function renderIncomeStampPlannerControls(): void {
  const host = document.querySelector<HTMLDivElement>("#incomeStampPlannerControls");
  if (!host) return;
  const range = incomeStampPlannerDateRange();
  const stamps = incomeStampPlannerVisibleStamps(range);
  const isCurrentMonth = incomeStampPlannerSameMonth(incomeStampPlannerMonthCursor, new Date());
  host.innerHTML = `
    <div class="income-stamp-planner-control-stack">
      <div class="income-stamp-planner-month-nav" role="group" aria-label="Stempel-Planer Monat">
        <button class="income-stamp-planner-month-button" type="button" data-action="income-stamp-planner-prev-month" aria-label="Vorherigen Monat anzeigen" title="Zurueck">
          ${incomePlanningHeaderIcon("chevron-left")}
        </button>
        <strong id="incomeStampPlannerMonthLabel" class="income-stamp-planner-month-label">${escapeHtml(
          incomeStampPlannerMonthTitle(range)
        )}</strong>
        <button class="income-stamp-planner-month-button" type="button" data-action="income-stamp-planner-next-month" aria-label="Naechsten Monat anzeigen" title="Weiter">
          ${incomePlanningHeaderIcon("chevron-right")}
        </button>
        ${
          isCurrentMonth
            ? ""
            : '<button class="income-stamp-planner-today-button" type="button" data-action="income-stamp-planner-current-month">Heute</button>'
        }
      </div>
      <div class="income-stamp-planner-range">
        <strong>${intNumber(stamps.length)} geplant</strong>
        <span>${escapeHtml(incomeStampPlannerRangeLabel(range))}</span>
      </div>
    </div>
  `;
}

function renderIncomeStampPlannerGrid(): void {
  const host = document.querySelector<HTMLDivElement>("#incomeStampPlannerGrid");
  if (!host) return;
  const range = incomeStampPlannerDateRange();
  const weeks = incomeStampPlannerWeeks(range);
  host.innerHTML = `
    <div class="income-stamp-planner-calendar" data-income-stamp-planner-calendar>
      <div class="income-stamp-planner-weekday-row">
        <span></span>
        ${INCOME_PLANNING_WEEK_DAYS.map((day) => `<strong>${escapeHtml(incomePlanningWeekdayLabel(day))}</strong>`).join("")}
      </div>
      <div class="income-stamp-planner-week-list">
        ${weeks.map((week) => incomeStampPlannerWeekRow(week, range)).join("")}
      </div>
    </div>
  `;
}

function incomeStampPlannerWeekRow(weekStart: Date, range: IncomeStampPlannerDateRange): string {
  const days = Array.from({ length: 7 }, (_, index) => incomeStampPlannerAddDays(weekStart, index));
  const weekEnd = days[6];
  return `
    <div class="income-stamp-planner-week">
      <div class="income-stamp-planner-week-label">
        <strong>Woche</strong>
        <span>${escapeHtml(`${incomeStampPlannerShortDate(weekStart)}-${incomeStampPlannerShortDate(weekEnd)}`)}</span>
      </div>
      ${days.map((day) => incomeStampPlannerDayCell(day, range)).join("")}
    </div>
  `;
}

function incomeStampPlannerDayCell(day: Date, range: IncomeStampPlannerDateRange): string {
  const date = incomeStampPlannerDateString(day);
  const today = date === incomeStampPlannerTodayDateString();
  const outsideMonth = day.getFullYear() !== range.year || day.getMonth() !== range.month;
  const stamps = outsideMonth ? [] : incomeStampPlannerStampsForDate(date);
  const classes = ["income-stamp-planner-day", today ? "today" : "", outsideMonth ? "outside-month" : "", stamps.length ? "has-stamps" : ""]
    .filter(Boolean)
    .join(" ");
  return `
    <div class="${escapeHtml(classes)}" data-income-stamp-planner-date="${escapeHtml(date)}">
      <div class="income-stamp-planner-day-head">
        <time datetime="${escapeHtml(date)}">
          <strong>${intNumber(day.getDate())}</strong>
          <span>${escapeHtml(incomeStampPlannerMonthLabel(day))}</span>
        </time>
        <button
          class="income-stamp-planner-day-add"
          type="button"
          data-action="income-stamp-planner-add-date"
          data-income-stamp-planner-date="${escapeHtml(date)}"
          aria-label="Stempel fuer ${escapeHtml(incomeStampPlannerFullDateLabel(date))} planen"
          title="Stempel planen"
          ${outsideMonth ? "disabled" : ""}
        >+</button>
      </div>
      <div class="income-stamp-planner-day-stamps">
        ${stamps.map(incomeStampPlannerStampButton).join("")}
      </div>
    </div>
  `;
}

function incomeStampPlannerStampButton(stamp: IncomePlanningPlannedStamp): string {
  const icon = normalizePositionIcon(stamp.icon, "calendar");
  return `
    <button
      class="income-stamp-planner-stamp"
      type="button"
      data-action="income-stamp-planner-edit"
      data-income-stamp-planner-stamp="true"
      data-income-stamp-planner-stamp-id="${escapeHtml(stamp.id)}"
      title="${escapeHtml(`${stamp.label} · ${incomeStampPlannerFullDateLabel(stamp.date)} · ${stamp.startTime}`)}"
    >
      ${positionIconSvg(icon, "position-icon-svg income-planning-type-icon")}
      <span>${escapeHtml(stamp.label)}</span>
      <small>${escapeHtml(stamp.startTime)}</small>
    </button>
  `;
}

function renderIncomeStampPlannerDialog(): void {
  const root = document.querySelector<HTMLDivElement>("#incomeStampPlannerDialogRoot");
  if (!root) return;
  if (!incomeStampPlannerDialog) {
    root.innerHTML = "";
    return;
  }
  const draft = incomeStampPlannerDialog;
  const currentIcon = normalizePositionIcon(draft.icon, "calendar");
  root.innerHTML = `
    <div class="income-planning-dialog-backdrop" role="presentation">
      <div class="income-planning-dialog income-stamp-planner-dialog" role="dialog" aria-modal="true" aria-label="Geplanten Stempel bearbeiten">
        <div class="income-tax-dialog-head">
          <div>
            <strong>${draft.stampId ? "Stempel bearbeiten" : "Stempel planen"}</strong>
            <span>${escapeHtml(incomeStampPlannerFullDateLabel(draft.date))}</span>
          </div>
          <button class="chart-popup-close" type="button" data-action="income-stamp-planner-close-dialog" aria-label="Stempel-Planer Dialog schliessen">x</button>
        </div>
        <div class="income-planning-dialog-grid basis">
          <label class="field">
            <span>Label</span>
            <input type="text" value="${escapeHtml(draft.label)}" data-income-stamp-planner-field="label" />
          </label>
          <label class="field">
            <span>Projekt / Notiz</span>
            <input type="text" value="${escapeHtml(draft.description)}" data-income-stamp-planner-field="description" />
          </label>
          <label class="field compact">
            <span>Datum</span>
            <input type="date" value="${escapeHtml(draft.date)}" data-income-stamp-planner-field="date" />
          </label>
          <label class="field compact">
            <span>Zeit</span>
            <input type="time" value="${escapeHtml(draft.startTime)}" data-income-stamp-planner-field="startTime" />
          </label>
        </div>
        <div class="income-planning-stamp-presets" aria-label="Stempel-Labels">
          ${INCOME_PLANNING_STAMP_PRESETS.map((preset) => {
            const presetIcon = normalizePositionIcon(preset.icon, "calendar");
            const active = draft.label === preset.label && currentIcon === presetIcon;
            return `
              <button
                class="income-planning-stamp-preset ${active ? "active" : ""}"
                type="button"
                data-action="select-income-stamp-planner-preset"
                data-income-stamp-planner-label="${escapeHtml(preset.label)}"
                data-income-stamp-planner-icon="${escapeHtml(preset.icon)}"
                aria-pressed="${active}"
              >
                ${positionIconSvg(preset.icon, "position-icon-svg income-planning-type-icon")}
                <span>${escapeHtml(preset.label)}</span>
              </button>
            `;
          }).join("")}
        </div>
        <div class="position-icon-picker-grid compact income-stamp-planner-icon-grid">
          ${POSITION_ICONS.map((icon) => {
            const active = icon.id === currentIcon;
            return `
              <button
                class="position-icon-option ${active ? "active" : ""}"
                type="button"
                data-action="select-income-stamp-planner-icon"
                data-income-stamp-planner-icon="${icon.id}"
                aria-pressed="${active}"
                title="${escapeHtml(icon.label)}"
              >
                ${positionIconSvg(icon.id)}
                <span>${escapeHtml(icon.label)}</span>
              </button>
            `;
          }).join("")}
        </div>
        <section class="income-planning-dialog-section">
          <strong>Wochenszenarien</strong>
          ${incomePlanningScenarioCheckboxGroup({
            selectedIds: draft.scenarioIds,
            dataAttribute: "data-income-stamp-planner-scenario-id"
          })}
        </section>
        ${draft.error ? `<div class="income-planning-warning high">${escapeHtml(draft.error)}</div>` : ""}
        <div class="income-planning-dialog-actions">
          ${draft.stampId ? `<button class="button danger" type="button" data-action="income-stamp-planner-delete">Loeschen</button>` : ""}
          <button class="button secondary" type="button" data-action="income-stamp-planner-close-dialog">Abbrechen</button>
          <button class="button" type="button" data-action="income-stamp-planner-save" aria-label="Geplanten Stempel speichern">Speichern</button>
        </div>
      </div>
    </div>
  `;
}

function incomeStampPlannerDateRange(): IncomeStampPlannerDateRange {
  const monthStart = incomeStampPlannerMonthStart(incomeStampPlannerMonthCursor);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  return {
    start: incomeStampPlannerWeekStart(monthStart),
    end: incomeStampPlannerAddDays(incomeStampPlannerWeekStart(monthEnd), 6),
    year: monthStart.getFullYear(),
    month: monthStart.getMonth()
  };
}

function incomeStampPlannerVisibleStamps(range: IncomeStampPlannerDateRange): IncomePlanningPlannedStamp[] {
  return [...(state.incomePlanning.plannedStamps ?? [])]
    .filter((stamp) => {
      const date = incomeStampPlannerDateFromString(stamp.date);
      if (!date) return false;
      return date.getFullYear() === range.year && date.getMonth() === range.month;
    })
    .sort(compareIncomePlanningPlannedStamps);
}

function incomeStampPlannerWeeks(range: IncomeStampPlannerDateRange): Date[] {
  const weeks: Date[] = [];
  for (let cursor = range.start; cursor.getTime() <= range.end.getTime(); cursor = incomeStampPlannerAddDays(cursor, 7)) {
    weeks.push(cursor);
  }
  return weeks;
}

function incomeStampPlannerStampsForDate(date: string): IncomePlanningPlannedStamp[] {
  return [...(state.incomePlanning.plannedStamps ?? [])]
    .filter((stamp) => stamp.date === date)
    .sort(compareIncomePlanningPlannedStamps);
}

function incomePlanningPlannedStampsForCurrentWeek(day: IncomePlanningWeekday): IncomePlanningPlannedStamp[] {
  const range = incomeStampPlannerCurrentWeekRange();
  return [...(state.incomePlanning.plannedStamps ?? [])]
    .filter((stamp) => {
      const date = incomeStampPlannerDateFromString(stamp.date);
      if (!date) return false;
      return (
        date.getTime() >= range.start.getTime() &&
        date.getTime() <= range.end.getTime() &&
        incomePlanningWeekdayForDate(date) === day &&
        incomePlanningEntryIsActiveInCurrentScenario(stamp)
      );
    })
    .sort(compareIncomePlanningPlannedStamps);
}

function compareIncomePlanningPlannedStamps(first: IncomePlanningPlannedStamp, second: IncomePlanningPlannedStamp): number {
  return (
    first.date.localeCompare(second.date, "de") ||
    first.startTime.localeCompare(second.startTime, "de") ||
    first.label.localeCompare(second.label, "de") ||
    first.id.localeCompare(second.id, "de")
  );
}

function incomePlanningModelForActiveWeek(): IncomePlanningModel {
  return buildIncomePlanningModel(state.incomePlanning, { scenarioId: incomePlanningActiveWeekScenarioId() });
}

function incomePlanningWeekScenarioOptions(): ReturnType<typeof incomePlanningWeekScenarioConfigs> {
  return incomePlanningWeekScenarioConfigs(state.incomePlanning.weekScenarios ?? []);
}

function incomePlanningKnownScenarioIds(): IncomePlanningWeekScenarioId[] {
  return incomePlanningWeekScenarioOptions().map((scenario) => scenario.id);
}

function incomePlanningActiveWeekScenarioId(): IncomePlanningWeekScenarioId {
  const weekStartDate = incomePlanningActiveWeekStartDate();
  const assignedScenarioId = (state.incomePlanning.weekScenarioAssignments ?? []).find(
    (assignment) => assignment.weekStartDate === weekStartDate
  )?.scenarioId;
  return incomePlanningKnownScenarioIds().includes(assignedScenarioId ?? "") ? assignedScenarioId ?? "normal" : "normal";
}

function incomePlanningActiveWeekStartDate(): string {
  return incomeStampPlannerDateString(incomePlanningWeekCursor);
}

function incomePlanningActiveWeekRange(): { start: Date; end: Date } {
  const start = incomeStampPlannerWeekStart(incomePlanningWeekCursor);
  return { start, end: incomeStampPlannerAddDays(start, 6) };
}

function incomeStampPlannerCurrentWeekRange(): { start: Date; end: Date } {
  return incomePlanningActiveWeekRange();
}

function incomePlanningIsCurrentWeek(): boolean {
  return incomeStampPlannerDateString(incomeStampPlannerWeekStart(new Date())) === incomePlanningActiveWeekStartDate();
}

function showPreviousIncomePlanningWeek(): void {
  incomePlanningWeekCursor = incomeStampPlannerAddDays(incomePlanningWeekCursor, -7);
  renderIncomePlanning();
}

function showNextIncomePlanningWeek(): void {
  incomePlanningWeekCursor = incomeStampPlannerAddDays(incomePlanningWeekCursor, 7);
  renderIncomePlanning();
}

function showCurrentIncomePlanningWeek(): void {
  incomePlanningWeekCursor = incomeStampPlannerWeekStart(new Date());
  renderIncomePlanning();
}

function setIncomePlanningWeekScenario(value: string): void {
  if (!incomePlanningKnownScenarioIds().includes(value)) return;
  const weekStartDate = incomePlanningActiveWeekStartDate();
  const assignments = (state.incomePlanning.weekScenarioAssignments ?? []).filter(
    (assignment) => assignment.weekStartDate !== weekStartDate
  );
  state.incomePlanning = {
    ...state.incomePlanning,
    weekScenarioAssignments:
      value === "normal"
        ? assignments
        : [...assignments, { weekStartDate, scenarioId: value }].sort((first, second) =>
            first.weekStartDate.localeCompare(second.weekStartDate)
          )
  };
  renderIncomePlanning();
  saveState(state);
}

function openIncomePlanningWeekScenarioDialog(): void {
  incomePlanningWeekScenarioDialog = { label: "", error: "" };
  renderIncomePlanningWeekScenarioDialog();
}

function closeIncomePlanningWeekScenarioDialog(): void {
  incomePlanningWeekScenarioDialog = null;
  renderIncomePlanningWeekScenarioDialog();
}

function updateIncomePlanningWeekScenarioDialogDraft(field: string, value: string): void {
  if (!incomePlanningWeekScenarioDialog || field !== "label") return;
  incomePlanningWeekScenarioDialog = { ...incomePlanningWeekScenarioDialog, label: value, error: "" };
}

function saveIncomePlanningWeekScenarioDialog(): void {
  if (!incomePlanningWeekScenarioDialog) return;
  const label = incomePlanningWeekScenarioDialog.label.trim().replace(/\s+/g, " ");
  if (!label) {
    incomePlanningWeekScenarioDialog = { ...incomePlanningWeekScenarioDialog, error: "Bitte ein Szenario-Label eingeben." };
    renderIncomePlanningWeekScenarioDialog();
    return;
  }
  const duplicate = incomePlanningWeekScenarioOptions().some(
    (scenario) => scenario.label.trim().toLowerCase() === label.toLowerCase()
  );
  if (duplicate) {
    incomePlanningWeekScenarioDialog = { ...incomePlanningWeekScenarioDialog, error: "Dieses Wochenszenario existiert bereits." };
    renderIncomePlanningWeekScenarioDialog();
    return;
  }

  const scenario: IncomePlanningWeekScenario = {
    id: `week-scenario-${createId()}`,
    label
  };
  state.incomePlanning = {
    ...state.incomePlanning,
    weekScenarios: [...(state.incomePlanning.weekScenarios ?? []), scenario]
  };
  incomePlanningWeekScenarioDialog = null;
  setIncomePlanningWeekScenario(scenario.id);
}

function renderIncomePlanningWeekScenarioDialog(): void {
  const root = document.querySelector<HTMLDivElement>("#incomePlanningDialogRoot");
  if (!root || incomePlanningDialog) return;
  if (!incomePlanningWeekScenarioDialog) {
    root.innerHTML = "";
    return;
  }
  root.innerHTML = `
    <div class="income-planning-dialog-backdrop" role="presentation">
      <div class="income-planning-dialog" role="dialog" aria-modal="true" aria-label="Wochenszenario hinzufuegen">
        <div class="income-tax-dialog-head">
          <div>
            <strong>Wochenszenario hinzufuegen</strong>
            <span>Eigenes Label fuer Wochenmodus</span>
          </div>
          <div class="income-planning-header-actions">
            <button class="income-planning-header-icon-button" type="button" data-action="income-planning-close-week-scenario-dialog" aria-label="Dialog schliessen" title="Schliessen">x</button>
            <button class="income-planning-header-icon-button" type="button" data-action="income-planning-save-week-scenario" aria-label="Wochenszenario speichern" title="Speichern">
              ${incomePlanningHeaderIcon("save")}
            </button>
          </div>
        </div>
        ${incomePlanningWeekScenarioDialog.error ? `<div class="income-planning-warning unrealistic"><strong>Fehler</strong><span>${escapeHtml(incomePlanningWeekScenarioDialog.error)}</span></div>` : ""}
        <section class="income-planning-dialog-section">
          <strong>Label</strong>
          <label class="field">
            <span>Name</span>
            <input type="text" value="${escapeHtml(incomePlanningWeekScenarioDialog.label)}" data-income-planning-week-scenario-dialog-field="label" />
          </label>
        </section>
        <div class="button-row income-planning-dialog-actions">
          <button class="button secondary" type="button" data-action="income-planning-close-week-scenario-dialog">Abbrechen</button>
          <button class="button" type="button" data-action="income-planning-save-week-scenario">Speichern</button>
        </div>
      </div>
    </div>
  `;
}

function incomePlanningScenarioIdsForDialog(scenarioIds: IncomePlanningWeekScenarioId[] | undefined): IncomePlanningWeekScenarioId[] {
  const knownIds = incomePlanningKnownScenarioIds();
  if (!scenarioIds?.length) return knownIds;
  const selected = scenarioIds.filter((scenarioId) => knownIds.includes(scenarioId));
  return selected.length ? Array.from(new Set(selected)) : knownIds;
}

function incomePlanningDefaultScenarioIdsForNewEntry(): IncomePlanningWeekScenarioId[] {
  const activeScenarioId = incomePlanningActiveWeekScenarioId();
  return incomePlanningKnownScenarioIds().includes(activeScenarioId) ? [activeScenarioId] : ["normal"];
}

function incomePlanningStoredScenarioIds(
  scenarioIds: IncomePlanningWeekScenarioId[]
): IncomePlanningWeekScenarioId[] | undefined {
  const knownIds = incomePlanningKnownScenarioIds();
  const selected = Array.from(new Set(scenarioIds.filter((scenarioId) => knownIds.includes(scenarioId))));
  if (!selected.length || selected.length === knownIds.length) return undefined;
  return selected;
}

function incomePlanningEntryIsActiveInCurrentScenario(entry: { scenarioIds?: IncomePlanningWeekScenarioId[] }): boolean {
  return incomePlanningEntryActiveInScenario(entry, incomePlanningActiveWeekScenarioId());
}

function incomePlanningWeekdayForDate(date: Date): IncomePlanningWeekday {
  const index = (date.getDay() + 6) % 7;
  return INCOME_PLANNING_WEEK_DAYS[index] ?? "monday";
}

function incomeStampPlannerRangeLabel(range: IncomeStampPlannerDateRange): string {
  return `${monthName(range.month + 1)} ${range.year}`;
}

function incomeStampPlannerMonthTitle(range: IncomeStampPlannerDateRange): string {
  return `${monthName(range.month + 1)} ${range.year}`;
}

function incomeStampPlannerFullDateLabel(value: string): string {
  const date = incomeStampPlannerDateFromString(value);
  if (!date) return "ungueltiges Datum";
  return `${incomePlanningWeekdayLabel(incomePlanningWeekdayForDate(date))}, ${incomeStampPlannerShortDate(date)}${date.getFullYear()}`;
}

function incomeStampPlannerMonthLabel(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
}

function incomeStampPlannerShortDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.`;
}

function incomeStampPlannerTodayDateString(): string {
  return incomeStampPlannerDateString(new Date());
}

function incomeStampPlannerDateString(date: Date): string {
  const local = incomeStampPlannerStartOfDay(date);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
}

function incomeStampPlannerDateFromString(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return incomeStampPlannerStartOfDay(date);
}

function incomeStampPlannerStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function incomeStampPlannerMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function incomeStampPlannerWeekStart(date: Date): Date {
  const start = incomeStampPlannerStartOfDay(date);
  const offset = (start.getDay() + 6) % 7;
  return incomeStampPlannerAddDays(start, -offset);
}

function incomeStampPlannerAddDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function incomeStampPlannerSameMonth(first: Date, second: Date): boolean {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth();
}

function showPreviousIncomeStampPlannerMonth(): void {
  incomeStampPlannerMonthCursor = new Date(
    incomeStampPlannerMonthCursor.getFullYear(),
    incomeStampPlannerMonthCursor.getMonth() - 1,
    1
  );
  renderIncomeStampPlanner();
}

function showNextIncomeStampPlannerMonth(): void {
  incomeStampPlannerMonthCursor = new Date(
    incomeStampPlannerMonthCursor.getFullYear(),
    incomeStampPlannerMonthCursor.getMonth() + 1,
    1
  );
  renderIncomeStampPlanner();
}

function showCurrentIncomeStampPlannerMonth(): void {
  incomeStampPlannerMonthCursor = incomeStampPlannerMonthStart(new Date());
  renderIncomeStampPlanner();
}

function openIncomeStampPlannerDialogForDate(date: string = incomeStampPlannerTodayDateString()): void {
  const normalizedDate = incomeStampPlannerDateFromString(date) ? date : incomeStampPlannerTodayDateString();
  incomeStampPlannerDialog = {
    stampId: null,
    date: normalizedDate,
    startTime: "09:00",
    icon: "calendar",
    label: "Stempel",
    description: "",
    scenarioIds: incomePlanningDefaultScenarioIdsForNewEntry(),
    error: ""
  };
  renderIncomeStampPlannerDialog();
}

function openIncomeStampPlannerDialogForEdit(stampId: string, options: { switchToPlanner?: boolean } = {}): void {
  const stamp = (state.incomePlanning.plannedStamps ?? []).find((item) => item.id === stampId);
  if (!stamp) return;
  incomeStampPlannerDialog = {
    stampId: stamp.id,
    date: stamp.date,
    startTime: stamp.startTime,
    icon: normalizePositionIcon(stamp.icon, "calendar"),
    label: stamp.label,
    description: stamp.description,
    scenarioIds: incomePlanningScenarioIdsForDialog(stamp.scenarioIds),
    error: ""
  };
  if (options.switchToPlanner) {
    setActiveSection("income_stamp_planner");
    renderAll();
    return;
  }
  renderIncomeStampPlannerDialog();
}

function closeIncomeStampPlannerDialog(): void {
  incomeStampPlannerDialog = null;
  renderIncomeStampPlannerDialog();
}

function updateIncomeStampPlannerDialogDraft(field: string, value: string): void {
  if (!incomeStampPlannerDialog) return;
  if (field === "label") {
    incomeStampPlannerDialog = { ...incomeStampPlannerDialog, label: value, error: "" };
  } else if (field === "description") {
    incomeStampPlannerDialog = { ...incomeStampPlannerDialog, description: value, error: "" };
  } else if (field === "date") {
    incomeStampPlannerDialog = { ...incomeStampPlannerDialog, date: value, error: "" };
  } else if (field === "startTime") {
    incomeStampPlannerDialog = { ...incomeStampPlannerDialog, startTime: value, error: "" };
  }
}

function selectIncomeStampPlannerIcon(icon: string): void {
  if (!incomeStampPlannerDialog) return;
  incomeStampPlannerDialog = { ...incomeStampPlannerDialog, icon: normalizePositionIcon(icon, "calendar"), error: "" };
  renderIncomeStampPlannerDialog();
}

function selectIncomeStampPlannerPreset(label: string, icon: string): void {
  if (!incomeStampPlannerDialog) return;
  const preset = INCOME_PLANNING_STAMP_PRESETS.find((item) => item.label === label) ?? {
    label: label.trim() || "Stempel",
    icon
  };
  incomeStampPlannerDialog = {
    ...incomeStampPlannerDialog,
    label: preset.label,
    icon: normalizePositionIcon(preset.icon, "calendar"),
    error: ""
  };
  renderIncomeStampPlannerDialog();
}

function updateIncomeStampPlannerScenarioSelection(scenarioId: string, checked: boolean): void {
  if (!incomeStampPlannerDialog || !incomePlanningKnownScenarioIds().includes(scenarioId)) return;
  const selected = new Set(incomeStampPlannerDialog.scenarioIds);
  if (checked) selected.add(scenarioId);
  else selected.delete(scenarioId);
  incomeStampPlannerDialog = { ...incomeStampPlannerDialog, scenarioIds: Array.from(selected), error: "" };
  renderIncomeStampPlannerDialog();
}

function saveIncomeStampPlannerDialog(): void {
  if (!incomeStampPlannerDialog) return;
  const draft = incomeStampPlannerDialog;
  if (!incomeStampPlannerDateFromString(draft.date)) {
    incomeStampPlannerDialog = { ...draft, error: "Bitte ein gueltiges Datum auswaehlen." };
    renderIncomeStampPlannerDialog();
    return;
  }
  if (!draft.scenarioIds.length) {
    incomeStampPlannerDialog = { ...draft, error: "Bitte mindestens ein Wochenszenario auswaehlen." };
    renderIncomeStampPlannerDialog();
    return;
  }
  const startTime = formatIncomePlanningTime(parseTimeMinutes(draft.startTime) ?? 9 * 60);
  const stamp: IncomePlanningPlannedStamp = {
    id: draft.stampId ?? createId(),
    date: draft.date,
    startTime,
    icon: normalizePositionIcon(draft.icon, "calendar"),
    label: draft.label.trim() || "Stempel",
    description: draft.description.trim(),
    scenarioIds: incomePlanningStoredScenarioIds(draft.scenarioIds)
  };
  const plannedStamps = state.incomePlanning.plannedStamps ?? [];
  const exists = plannedStamps.some((item) => item.id === stamp.id);
  state.incomePlanning = {
    ...state.incomePlanning,
    plannedStamps: exists
      ? plannedStamps.map((item) => (item.id === stamp.id ? stamp : item))
      : [...plannedStamps, stamp]
  };
  const savedDate = incomeStampPlannerDateFromString(stamp.date);
  if (savedDate) {
    incomeStampPlannerMonthCursor = incomeStampPlannerMonthStart(savedDate);
  }
  incomeStampPlannerDialog = null;
  renderAll();
}

function deleteIncomeStampPlannerStamp(stampId: string | null = incomeStampPlannerDialog?.stampId ?? null): void {
  if (!stampId) return;
  const plannedStamps = state.incomePlanning.plannedStamps ?? [];
  state.incomePlanning = {
    ...state.incomePlanning,
    plannedStamps: plannedStamps.filter((stamp) => stamp.id !== stampId)
  };
  incomeStampPlannerDialog = null;
  renderAll();
}

function renderIncomePlanningSummary(model = incomePlanningModelForActiveWeek()): void {
  renderIncomePlanningMetrics(model);
  renderIncomePlanningWarnings(model);
  renderIncomePlanningTimeCharts(model);
  renderIncomePlanningCareerLife(model);
  renderIncomePlanningScenarios(model);
}

function renderIncomePlanningMetrics(model: IncomePlanningModel): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningMetricGrid");
  if (!host) return;
  host.innerHTML = `
    ${incomePlanningMetric("Arbeitszeit", `${hoursLabel(model.totalWorkHours)} / Woche`, `${hoursLabel(model.grossWorkHours)} brutto`, model.status)}
    ${incomePlanningMetric("Pausen", `${hoursLabel(model.pauseHours)} / Woche`, "separat von Arbeits-/Zeitbloecken", model.pauseHours > 0 ? "realistic" : model.status)}
    ${incomePlanningMetric("Habit-Zeit", `${hoursLabel(model.habitHours)} / Woche`, `${model.activeHabits.length} aktive Habits`, model.status)}
    ${incomePlanningMetric("Privat/Freizeit/Puffer", `${hoursLabel(model.manualHours)} / Woche`, `${model.activeManualBlocks.length} Zeitbloecke`, model.status)}
    ${incomePlanningMetric("Verplante Woche", `${hoursLabel(model.usedHours)} / Woche`, "inklusive Schlaf", model.status)}
    ${incomePlanningMetric("Freie Reserve", `${hoursLabel(model.remainingFlexibleHours)} / Woche`, "nach allen Zeitbloecken", model.remainingFlexibleHours < 0 ? "unrealistic" : model.status)}
    ${incomePlanningMetric("Konflikte", String(model.conflictCount), "Ueberschneidungen im Kalender", model.conflictCount > 0 ? "high" : "realistic")}
    ${incomePlanningMetric("Belastung", incomePlanningStatusLabel(model.status), `${hoursLabel(model.usedHours)} von 168h verplant`, model.status)}
  `;
}

function incomePlanningMetric(
  label: string,
  value: string,
  detail: string,
  status: IncomePlanningModel["status"]
): string {
  return `
    <article class="metric-card income-planning-metric ${escapeHtml(status)}">
      <span class="metric-label">${escapeHtml(label)}</span>
      <strong class="metric-value">${escapeHtml(value)}</strong>
      <small class="metric-detail">${escapeHtml(detail)}</small>
    </article>
  `;
}

function renderIncomePlanningWarnings(model: IncomePlanningModel): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningWarnings");
  if (!host) return;
  host.innerHTML = model.warnings.length
    ? model.warnings
        .map(
          (warning) => `
            <div class="income-planning-warning ${escapeHtml(model.status)}">
              <strong>${escapeHtml(incomePlanningStatusLabel(model.status))}</strong>
              <span>${escapeHtml(warning)}</span>
            </div>
          `
        )
        .join("")
    : `
      <div class="income-planning-warning realistic">
        <strong>Realistisch</strong>
        <span>Die Kombination passt in die aktuelle Zeitplanung.</span>
      </div>
    `;
}

interface IncomePlanningTimeSegment {
  label: string;
  value: number;
  color: string;
}

function renderIncomePlanningTimeCharts(model: IncomePlanningModel): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningTimeCharts");
  if (!host) return;
  const remaining = Math.max(0, model.remainingFlexibleHours);
  host.innerHTML = `
    ${incomePlanningDonutChart(
      "Wochenzeit",
      hoursLabel(model.usedHours),
      "verplant von 168 h",
      [
        { label: "Verplant", value: Math.min(168, Math.max(0, model.usedHours)), color: "var(--accent)" },
        { label: "Freie Reserve", value: remaining, color: "var(--row-border)" }
      ],
      168
    )}
    ${incomePlanningDonutChart(
      "Verbrauchte Wochenzeit",
      hoursLabel(model.usedHours),
      "Aufteilung der Woche",
      [
        { label: "Arbeitszeit", value: model.totalWorkHours, color: "#2e7d58" },
        { label: "Pausen", value: model.pauseHours, color: "#6f7785" },
        { label: "Habits", value: model.habitHours, color: "#8f5aa8" },
        { label: "Schlaf", value: model.sleepHoursPerWeek, color: "#4f6f9f" },
        { label: "Privat/Freizeit/Puffer", value: model.manualHours, color: "#b8860b" },
        { label: "Reserve", value: remaining, color: "var(--row-border)" }
      ],
      168
    )}
  `;
}

function incomePlanningDonutChart(
  title: string,
  value: string,
  detail: string,
  segments: IncomePlanningTimeSegment[],
  total: number
): string {
  const visibleSegments = segments.filter((segment) => segment.value > 0);
  const gradient = incomePlanningDonutGradient(visibleSegments, total);
  return `
    <article class="income-planning-time-chart">
      <div class="income-planning-donut" style="background: ${gradient}">
        <span>
          <strong>${escapeHtml(value)}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
      </div>
      <div class="income-planning-time-chart-copy">
        <strong>${escapeHtml(title)}</strong>
        <div class="income-planning-time-legend">
          ${visibleSegments.map((segment) => incomePlanningTimeLegendItem(segment, total)).join("")}
        </div>
      </div>
    </article>
  `;
}

function incomePlanningTimeLegendItem(segment: IncomePlanningTimeSegment, total: number): string {
  const share = total > 0 ? (segment.value / total) * 100 : 0;
  return `
    <span class="income-planning-time-legend-item">
      <i style="background: ${segment.color}"></i>
      <span>${escapeHtml(segment.label)}</span>
      <strong>${hoursLabel(segment.value)} · ${escapeHtml(percent(share))}</strong>
    </span>
  `;
}

function incomePlanningDonutGradient(segments: IncomePlanningTimeSegment[], total: number): string {
  if (!segments.length || total <= 0) return "conic-gradient(var(--row-border) 0deg 360deg)";
  let cursor = 0;
  const stops = segments.map((segment, index) => {
    const next = index === segments.length - 1 ? 360 : Math.min(360, cursor + (Math.max(0, segment.value) / total) * 360);
    const stop = `${segment.color} ${cursor.toFixed(2)}deg ${next.toFixed(2)}deg`;
    cursor = next;
    return stop;
  });
  if (cursor < 360) stops.push(`var(--row-border) ${cursor.toFixed(2)}deg 360deg`);
  return `conic-gradient(${stops.join(", ")})`;
}

function renderIncomePlanningSources(): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningWorkBlocks");
  if (!host) return;
  host.innerHTML = state.incomePlanning.workBlocks.length
    ? state.incomePlanning.workBlocks.map(incomePlanningWorkBlockRow).join("")
    : '<div class="chart-empty">Noch keine Arbeitszeit geplant.</div>';
}

function incomePlanningWorkBlockRow(workBlock: IncomePlanningWorkBlock): string {
  const model = buildIncomePlanningModel(state.incomePlanning);
  const hours = incomePlanningOwnerHours(model, workBlock.id);
  const pauseHours = slotsPauseHours(workBlock.slots);
  const config = incomePlanningCategoryConfig(workBlock.category);
  return `
    <article class="income-planning-block-card compact work ${workBlock.active ? "active" : ""}" style="${incomePlanningColorStyle(workBlock.color ?? incomePlanningDefaultWorkColor(workBlock.category))}">
      <div class="income-planning-work-card-main">
        <div class="income-planning-work-title">
          ${incomePlanningTypeLabel(config.label, config.icon)}
          <strong>${escapeHtml(workBlock.name)}</strong>
          <small>${escapeHtml(workBlock.description || `${hoursLabel(hours)} netto · ${hoursLabel(slotsGrossHours(workBlock.slots))} brutto`)}</small>
        </div>
        <div class="income-planning-work-hours">
          <strong>${escapeHtml(hoursLabel(hours))}</strong>
          <span>${escapeHtml(pauseHours > 0 ? `${hoursLabel(pauseHours)} Pause` : "pro Woche")}</span>
        </div>
        <div class="button-row">
          <button class="button secondary" type="button" data-action="income-planning-open-block" data-income-planning-owner-type="work" data-income-planning-owner-id="${escapeHtml(
            workBlock.id
          )}" data-income-planning-slot-id="${escapeHtml(workBlock.slots[0]?.id ?? "")}">Bearbeiten</button>
          <button class="icon-button danger" type="button" data-action="income-planning-remove-work-block" data-income-planning-work-id="${escapeHtml(
            workBlock.id
          )}" aria-label="Arbeitsblock entfernen">x</button>
        </div>
      </div>
      ${incomePlanningSlotSummary("work", workBlock.id, workBlock.slots)}
    </article>
  `;
}

function incomePlanningTypeLabel(label: string, icon: string): string {
  return `
    <span class="income-planning-type-label">
      ${positionIconSvg(icon, "position-icon-svg income-planning-type-icon")}
      <span>${escapeHtml(label)}</span>
    </span>
  `;
}

function incomePlanningSlotSummary(ownerType: string, ownerId: string, slots: IncomePlanningSlot[]): string {
  const addChip = incomePlanningSlotAddChip(ownerType, ownerId);
  return `
    <div class="income-planning-slot-summary">
      ${slots.length
        ? `${slots.map((slot) => incomePlanningSlotChip(ownerType, ownerId, slot)).join("")}${addChip}`
        : '<div class="chart-empty">Noch keine Wochen-Slots geplant.</div>'}
      ${slots.length ? "" : addChip}
    </div>
  `;
}

function incomePlanningSlotChip(ownerType: string, ownerId: string, slot: IncomePlanningSlot): string {
  const duration = incomePlanningSlotGrossDurationMinutes(slot);
  const visualRange = incomePlanningVisualRangeFromTimes(slot.startTime, slot.endTime, duration);
  const timeLabel = slot.flexible
    ? `flexibel · ${formatIncomePlanningTime(visualRange.startMinute)}-${formatIncomePlanningTime(visualRange.endMinute)} · ${minutesLabel(
        duration
      )}`
    : `${slot.startTime}-${slot.endTime}`;
  const pauseLabel =
    ownerType !== "habit" && slot.pauseEnabled && slot.pauseStartTime && slot.pauseEndTime
      ? `<small>Pause ${escapeHtml(slot.pauseStartTime)}-${escapeHtml(slot.pauseEndTime)}</small>`
      : "";
  return `
    <button class="income-planning-slot-chip ${slot.flexible ? "flexible" : ""}" type="button" data-action="income-planning-open-block" data-income-planning-owner-type="${escapeHtml(
      ownerType
    )}" data-income-planning-owner-id="${escapeHtml(ownerId)}" data-income-planning-slot-id="${escapeHtml(slot.id)}">
      <strong>${escapeHtml(incomePlanningWeekdayLabel(slot.day))}</strong>
      <span>${escapeHtml(timeLabel)}</span>
      ${pauseLabel}
    </button>
  `;
}

function incomePlanningSlotAddChip(ownerType: string, ownerId: string): string {
  return `
    <button class="income-planning-slot-chip add" type="button" data-action="income-planning-add-slot" data-income-planning-owner-type="${escapeHtml(
      ownerType
    )}" data-income-planning-owner-id="${escapeHtml(ownerId)}">
      <strong>+</strong>
      <span>Wochen-Slot</span>
    </button>
  `;
}

function renderIncomePlanningAssumptions(): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningAssumptions");
  if (!host) return;
  const assumptions = state.incomePlanning.assumptions;
  const sleepHours = incomePlanningAverageSleepHours(assumptions);
  const sleepWeekHours = hoursLabel(assumptions.sleepSlots.reduce((sum, slot) => sum + incomePlanningSleepSlotDurationMinutes(slot), 0) / 60);
  const sleepGroupCount = incomePlanningSleepSlotGroupsFromSlots(assumptions.sleepSlots).length;
  host.innerHTML = `
    <article class="income-planning-block-card compact active">
      <div class="income-planning-compact-head">
        <div>
          <span>Zeitannahme</span>
          <strong>Schlaf</strong>
          <small>${hoursLabel(sleepHours)} pro Tag · ${sleepWeekHours} / Woche · ${intNumber(sleepGroupCount)} Schlafzeiten</small>
        </div>
        <button class="button secondary" type="button" data-action="income-planning-edit-assumption">Bearbeiten</button>
      </div>
    </article>
  `;
}

function renderIncomePlanningManualBlocks(): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningManualBlocks");
  if (!host) return;
  host.innerHTML = state.incomePlanning.manualBlocks.length
    ? state.incomePlanning.manualBlocks.map(incomePlanningManualBlockRow).join("")
    : '<div class="chart-empty">Noch keine privaten Zeitbloecke geplant.</div>';
}

function incomePlanningManualBlockRow(block: IncomePlanningManualBlock): string {
  const pauseHours = slotsPauseHours(block.slots);
  const icon = normalizePositionIcon(block.icon, incomePlanningDefaultManualIcon(block.type));
  return `
    <article class="income-planning-block-card compact ${block.active ? "active" : ""}" style="${incomePlanningColorStyle(block.color ?? incomePlanningDefaultManualColor(block.type))}">
      <div class="income-planning-compact-head">
        <div>
          <span>${positionIconSvg(icon, "position-icon-svg income-planning-type-icon")} ${escapeHtml(incomePlanningManualBlockTypeLabel(block.type))}</span>
          <strong>${escapeHtml(block.name)}</strong>
          <small>${escapeHtml(block.description || `${hoursLabel(slotsHours(block.slots))} / Woche${pauseHours > 0 ? ` · ${hoursLabel(pauseHours)} Pause` : ""}`)}</small>
        </div>
        <div class="button-row">
          <button class="button secondary" type="button" data-action="income-planning-open-block" data-income-planning-owner-type="manual" data-income-planning-owner-id="${escapeHtml(
            block.id
          )}" data-income-planning-slot-id="${escapeHtml(block.slots[0]?.id ?? "")}">Bearbeiten</button>
          <button class="icon-button danger" type="button" data-action="income-planning-remove-manual-block" data-income-planning-manual-id="${escapeHtml(
            block.id
          )}" aria-label="Zeitblock entfernen">x</button>
        </div>
      </div>
      ${incomePlanningSlotSummary("manual", block.id, block.slots)}
    </article>
  `;
}

function renderIncomePlanningHabits(): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningHabits");
  if (!host) return;
  host.innerHTML = state.incomePlanning.habits.length
    ? state.incomePlanning.habits.map(incomePlanningHabitRow).join("")
    : '<div class="chart-empty">Noch keine Habits geplant.</div>';
}

function incomePlanningHabitRow(habit: IncomePlanningHabit): string {
  const icon = normalizePositionIcon(habit.icon, habit.type === "bad" ? "snack" : "book");
  return `
    <article class="income-planning-block-card compact habit ${habit.active ? "active" : ""}">
      <div class="income-planning-compact-head">
        <div>
          <span>${positionIconSvg(icon, "position-icon-svg income-planning-type-icon")} ${habit.type === "good" ? "Gute Habit" : "Schlechte Habit"} · ${escapeHtml(incomePlanningHabitChangeLabel(habit.goalChange))}</span>
          <strong>${escapeHtml(habit.name)}</strong>
          <small>${escapeHtml(`${habit.timing || "ohne Zeitpunkt"} · ${habit.durationMinutes} min/${habit.durationUnit === "day" ? "Tag" : "Woche"}`)}</small>
        </div>
        <div class="button-row">
          <button class="button secondary" type="button" data-action="income-planning-open-block" data-income-planning-owner-type="habit" data-income-planning-owner-id="${escapeHtml(
            habit.id
          )}" data-income-planning-slot-id="${escapeHtml(habit.slots[0]?.id ?? "")}">Bearbeiten</button>
          <button class="icon-button danger" type="button" data-action="income-planning-remove-habit" data-income-planning-habit-id="${escapeHtml(
            habit.id
          )}" aria-label="Habit entfernen">x</button>
        </div>
      </div>
      ${incomePlanningSlotSummary("habit", habit.id, habit.slots)}
    </article>
  `;
}

function renderIncomePlanningCalendarStamps(): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningCalendarStamps");
  if (!host) return;
  const stamps = [...state.incomePlanning.calendarStamps].sort(compareIncomePlanningCalendarStamps);
  host.innerHTML = `
    <div class="income-planning-stamp-list-head">
      <strong>Stempel</strong>
      <span>${intNumber(stamps.length)} im Kalender</span>
    </div>
    ${
      stamps.length
        ? stamps.map(incomePlanningCalendarStampListRow).join("")
        : '<div class="chart-empty">Strg+Klick im Kalender setzt Icon-Stempel.</div>'
    }
  `;
}

function incomePlanningCalendarStampListRow(stamp: IncomePlanningCalendarStamp): string {
  const icon = normalizePositionIcon(stamp.icon, "calendar");
  return `
    <button class="income-planning-stamp-list-row" type="button" data-action="income-planning-edit-stamp" data-income-planning-stamp-id="${escapeHtml(stamp.id)}">
      ${positionIconSvg(icon, "position-icon-svg income-planning-type-icon")}
      <span>${escapeHtml(stamp.label)}</span>
      <small>${escapeHtml(`${incomePlanningWeekdayLabel(stamp.day)} · ${stamp.startTime}`)}</small>
    </button>
  `;
}

function compareIncomePlanningCalendarStamps(first: IncomePlanningCalendarStamp, second: IncomePlanningCalendarStamp): number {
  const dayDiff = incomePlanningWeekdayIndex(first.day) - incomePlanningWeekdayIndex(second.day);
  if (dayDiff !== 0) return dayDiff;
  return first.startTime.localeCompare(second.startTime, "de");
}

function renderIncomePlanningCareerLife(model: IncomePlanningModel): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningCareerLife");
  if (!host) return;
  const block = model.careerWorkBlocks[0];
  if (!block) {
    host.innerHTML = '<div class="chart-empty">Kein aktiver Hauptjob geplant.</div>';
    return;
  }
  const config = incomePlanningCategoryConfig(block.category);
  const hours = incomePlanningOwnerHours(model, block.id);
  const pauseHours = slotsPauseHours(block.slots);
  host.innerHTML = `
    <article class="income-planning-career-item" style="${incomePlanningColorStyle(block.color ?? incomePlanningDefaultWorkColor(block.category))}">
      <div class="income-planning-career-main">
        ${incomePlanningTypeLabel(config.label, config.icon)}
        <strong>${escapeHtml(block.name)}</strong>
        <small>${escapeHtml(block.description || `${intNumber(block.slots.length)} Slot${block.slots.length === 1 ? "" : "s"} · ${hoursLabel(slotsGrossHours(block.slots))} brutto`)}</small>
      </div>
      <div class="income-planning-career-stats">
        <strong>${escapeHtml(hoursLabel(hours))}</strong>
        <span>${escapeHtml(pauseHours > 0 ? `${hoursLabel(pauseHours)} Pause` : "netto/Woche")}</span>
      </div>
      <button class="button secondary" type="button" data-action="income-planning-open-block" data-income-planning-owner-type="work" data-income-planning-owner-id="${escapeHtml(
        block.id
      )}" data-income-planning-slot-id="${escapeHtml(block.slots[0]?.id ?? "")}">Bearbeiten</button>
    </article>
  `;
}

function renderIncomePlanningScenarios(model: IncomePlanningModel): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningWeeklyPlanner");
  if (!host) return;
  const graphicEntries = model.calendarEntries.filter((entry) => !entry.invalid);
  const backgroundEntries = incomePlanningCalendarBackgroundEntries();
  const flexibleCount = graphicEntries.filter((entry) => entry.flexible).length;
  const currentTime = incomePlanningIsCurrentWeek() ? incomePlanningCurrentTimeMarker() : null;
  const weekRange = incomePlanningActiveWeekRange();
  const scenario = incomePlanningWeekScenarioConfig(model.scenarioId, state.incomePlanning.weekScenarios ?? []);
  host.innerHTML = `
    <div class="income-planning-calendar" data-income-planning-calendar>
      <div class="income-planning-week-toolbar">
        <div class="income-planning-week-nav" role="group" aria-label="Kalenderwoche">
          <button class="income-stamp-planner-month-button" type="button" data-action="income-planning-prev-week" aria-label="Vorherige Woche" title="Vorherige Woche">
            ${incomePlanningHeaderIcon("chevron-left")}
          </button>
          <div class="income-planning-week-label">
            <span>Woche</span>
            <strong>${escapeHtml(`${incomeStampPlannerShortDate(weekRange.start)}-${incomeStampPlannerShortDate(weekRange.end)}${weekRange.end.getFullYear()}`)}</strong>
          </div>
          <button class="income-stamp-planner-month-button" type="button" data-action="income-planning-next-week" aria-label="Naechste Woche" title="Naechste Woche">
            ${incomePlanningHeaderIcon("chevron-right")}
          </button>
          ${
            incomePlanningIsCurrentWeek()
              ? ""
              : '<button class="income-stamp-planner-today-button" type="button" data-action="income-planning-current-week">Heute</button>'
          }
        </div>
        <div class="income-planning-week-range">
          <strong>${escapeHtml(model.scenarioLabel)}</strong>
          <span>${escapeHtml(scenario.description)}</span>
        </div>
      </div>
      <div class="income-planning-week-scenario" aria-label="Wochenszenario">
        <div>
          <span>Wochenszenario</span>
          <strong>${escapeHtml(model.scenarioLabel)}</strong>
          <small>${escapeHtml(scenario.description)}</small>
        </div>
        <div class="income-planning-week-scenario-options" role="group" aria-label="Wochenszenario auswaehlen">
          ${incomePlanningWeekScenarioOptions().map((option) => incomePlanningWeekScenarioButton(option.id, model.scenarioId)).join("")}
          <button
            class="income-planning-week-scenario-button add"
            type="button"
            data-action="income-planning-open-week-scenario-dialog"
            aria-label="Wochenszenario hinzufuegen"
            title="Wochenszenario hinzufuegen"
          >
            <span>+</span>
          </button>
        </div>
      </div>
      <div class="income-planning-calendar-head">
        <span></span>
        ${INCOME_PLANNING_WEEK_DAYS.map((day) => `<strong>${escapeHtml(incomePlanningWeekdayLabel(day))}</strong>`).join("")}
      </div>
      <div class="income-planning-calendar-body">
        <div class="income-planning-calendar-axis" aria-hidden="true">
          ${Array.from({ length: 25 }, (_, hour) => `<span style="--hour:${hour}">${String(hour).padStart(2, "0")}:00</span>`).join("")}
        </div>
        <div id="incomePlanningCalendarDays" class="income-planning-calendar-days">
          ${INCOME_PLANNING_WEEK_DAYS.map((day) => incomePlanningCalendarDayColumn(day, graphicEntries, backgroundEntries, currentTime)).join("")}
        </div>
      </div>
      <div class="income-planning-calendar-note">
        <span>${intNumber(graphicEntries.length)} Zeitbloecke in der Grafik</span>
        <span>${intNumber(flexibleCount)} flexible Zeitbloecke</span>
        <span>${intNumber(incomePlanningSleepSlotsForActiveScenario().length)} Schlafhorizonte im Hintergrund</span>
        ${currentTime ? `<span>Ist-Zeit ${escapeHtml(currentTime.label)}</span>` : ""}
      </div>
    </div>
  `;
}

function incomePlanningWeekScenarioButton(
  scenarioId: IncomePlanningWeekScenarioId,
  activeScenarioId: IncomePlanningWeekScenarioId
): string {
  const scenario = incomePlanningWeekScenarioConfig(scenarioId, state.incomePlanning.weekScenarios ?? []);
  const active = scenarioId === activeScenarioId;
  return `
    <button
      class="income-planning-week-scenario-button ${active ? "active" : ""}"
      type="button"
      data-action="select-income-planning-week-scenario-${scenarioId}"
      aria-pressed="${active}"
      title="${escapeHtml(scenario.description)}"
    >
      ${positionIconSvg(scenario.icon, "position-icon-svg income-planning-type-icon")}
      <span>${escapeHtml(scenario.label)}</span>
    </button>
  `;
}

function incomePlanningCalendarDayColumn(
  day: IncomePlanningWeekday,
  entries: IncomePlanningCalendarEntry[],
  backgroundEntries: IncomePlanningCalendarBackgroundEntry[],
  currentTime: { day: IncomePlanningWeekday; minute: number; label: string } | null
): string {
  const dayEntries = entries.filter((entry) => entry.day === day);
  const dayBackgrounds = backgroundEntries.filter((entry) => entry.day === day);
  const dayStamps = state.incomePlanning.calendarStamps
    .filter((stamp) => stamp.day === day && incomePlanningEntryIsActiveInCurrentScenario(stamp))
    .sort(compareIncomePlanningCalendarStamps);
  const plannedStamps = incomePlanningPlannedStampsForCurrentWeek(day);
  return `
    <div class="income-planning-calendar-day-column" data-income-planning-calendar-day="${escapeHtml(day)}" aria-label="${escapeHtml(
      incomePlanningWeekdayLabel(day)
    )}">
      <div class="income-planning-calendar-hour-lines" aria-hidden="true">
        ${Array.from({ length: 24 }, (_, hour) => `<i style="--hour:${hour}"></i>`).join("")}
      </div>
      ${dayBackgrounds.map(incomePlanningCalendarBackgroundBlock).join("")}
      ${dayEntries.map(incomePlanningCalendarEntryBlock).join("")}
      ${dayStamps.map(incomePlanningCalendarStampMarker).join("")}
      ${plannedStamps.map(incomePlanningPlannedStampMarker).join("")}
      ${currentTime?.day === day ? incomePlanningCurrentTimeLine(currentTime.minute, currentTime.label) : ""}
    </div>
  `;
}

function incomePlanningCalendarBackgroundEntries(): IncomePlanningCalendarBackgroundEntry[] {
  const sleepEntries = incomePlanningSleepSlotGroupsFromSlots(incomePlanningSleepSlotsForActiveScenario()).flatMap(
    incomePlanningSleepBackgroundEntries
  );
  return sleepEntries;
}

function incomePlanningSleepSlotsForActiveScenario(): IncomePlanningSleepSlot[] {
  return state.incomePlanning.assumptions.sleepSlots.filter(incomePlanningEntryIsActiveInCurrentScenario);
}

function incomePlanningSleepBackgroundEntries(group: IncomePlanningSleepSlotGroup): IncomePlanningCalendarBackgroundEntry[] {
  const slots = incomePlanningSleepSlotsFromDialogGroups([group]);
  return slots.flatMap((slot) => incomePlanningSleepSlotBackgroundEntries(slot, group.id, group.flexible, group.durationMinutes));
}

function incomePlanningSleepSlotBackgroundEntries(
  slot: IncomePlanningSleepSlot,
  groupId: string,
  flexible: boolean,
  durationMinutes: number
): IncomePlanningCalendarBackgroundEntry[] {
  const segments = incomePlanningSlotCalendarSegments(slot);
  return segments.map((segment, index) => ({
    id: `${slot.id}:sleep:${index}`,
    day: segment.day,
    startMinute: segment.startMinute,
    endMinute: segment.endMinute,
    title: "Schlaf",
    label: "Schlaf",
    detail: flexible ? `flexibel · ${minutesLabel(durationMinutes)}` : `${slot.startTime}-${slot.endTime}`,
    icon: "health",
    type: "sleep",
    flexible,
    sleepGroupId: groupId
  }));
}

function incomePlanningCalendarBackgroundBlock(entry: IncomePlanningCalendarBackgroundEntry): string {
  const start = clamp(entry.startMinute, 0, 24 * 60);
  const end = clamp(entry.endMinute, start + 15, 24 * 60);
  const top = (start / (24 * 60)) * 100;
  const height = ((end - start) / (24 * 60)) * 100;
  const classes = [
    "income-planning-calendar-background",
    `type-${entry.type}`,
    entry.flexible ? "flexible" : ""
  ]
    .filter(Boolean)
    .join(" ");
  return `
    <div
      class="${escapeHtml(classes)}"
      style="--top:${top.toFixed(3)}%; --height:${height.toFixed(3)}%; ${entry.color ? incomePlanningColorStyle(entry.color) : ""}"
      data-income-planning-calendar-background="true"
      data-income-planning-background-entry-id="${escapeHtml(entry.id)}"
      ${entry.sleepGroupId ? `data-income-planning-sleep-group-id="${escapeHtml(entry.sleepGroupId)}"` : ""}
      aria-hidden="true"
      title="${escapeHtml(`${entry.title} · ${entry.detail}`)}"
    >
      <span class="income-planning-calendar-label">
        ${positionIconSvg(entry.icon, "position-icon-svg income-planning-calendar-icon")}
        <span>${escapeHtml(entry.label)}</span>
      </span>
      <strong>${escapeHtml(entry.title)}</strong>
      <small>${escapeHtml(entry.detail)}</small>
    </div>
  `;
}

function incomePlanningCalendarEntryBlock(entry: IncomePlanningCalendarEntry): string {
  const meta = incomePlanningCalendarEntryMeta(entry);
  const color = incomePlanningCalendarEntryColor(entry);
  const range = incomePlanningCalendarEntryVisualRange(entry);
  const start = range.startMinute;
  const end = range.endMinute;
  const top = (start / (24 * 60)) * 100;
  const height = ((end - start) / (24 * 60)) * 100;
  const isHabitEntry = entry.type === "good_habit" || entry.type === "bad_habit" || entry.type === "replacement_habit";
  const classes = [
    "income-planning-calendar-block",
    `type-${entry.type}`,
    entry.flexible ? "flexible" : "",
    entry.conflict ? "conflict" : "",
    entry.durationMinutes <= 30 ? "short" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const ownerType = incomePlanningOwnerTypeForEntry(entry);
  return `
    <button
      class="${escapeHtml(classes)}"
      type="button"
      data-action="income-planning-open-block"
      data-income-planning-calendar-block="true"
      data-income-planning-owner-type="${escapeHtml(ownerType)}"
      data-income-planning-owner-id="${escapeHtml(entry.ownerId)}"
      data-income-planning-slot-id="${escapeHtml(entry.slotId)}"
      data-income-planning-slot-part="${escapeHtml(entry.slotPart)}"
      style="--top:${top.toFixed(3)}%; --height:${height.toFixed(3)}%; --start-minute:${start}; --duration-minutes:${end - start}; ${incomePlanningColorStyle(color)}"
      title="${escapeHtml(`${incomePlanningEntryTime(entry)} · ${entry.title}${isHabitEntry ? "" : ` · ${meta.label}`} · ${incomePlanningPlannerTypeLabel(entry.type)}`)}"
    >
      <span class="income-planning-calendar-resize top" data-income-planning-resize="start" aria-hidden="true"></span>
      <span class="income-planning-calendar-label">
        ${positionIconSvg(meta.icon, "position-icon-svg income-planning-calendar-icon")}
        <span>${escapeHtml(isHabitEntry ? entry.title : meta.label)}</span>
      </span>
      ${isHabitEntry ? "" : `<strong>${escapeHtml(entry.title)}</strong>`}
      <small>${escapeHtml(incomePlanningEntryTime(entry))}</small>
      ${isHabitEntry ? "" : `<em>${escapeHtml(incomePlanningPlannerTypeLabel(entry.type))}</em>`}
      <span class="income-planning-calendar-resize bottom" data-income-planning-resize="end" aria-hidden="true"></span>
    </button>
  `;
}

function incomePlanningCalendarEntryVisualRange(entry: IncomePlanningCalendarEntry): { startMinute: number; endMinute: number } {
  return incomePlanningVisualRangeFromTimes(entry.startTime, entry.endTime, entry.durationMinutes);
}

function incomePlanningVisualRangeFromTimes(
  startTime: string,
  endTime: string,
  durationMinutes: number
): { startMinute: number; endMinute: number } {
  const parsedStart = parseTimeMinutes(startTime);
  const parsedEnd = parseTimeMinutes(endTime);
  const startMinute = clamp(parsedStart ?? 0, 0, 23 * 60 + 45);
  if (parsedEnd !== null && parsedEnd > startMinute) {
    return { startMinute, endMinute: clamp(parsedEnd, startMinute + 15, 24 * 60) };
  }
  const duration = clamp(Math.round(durationMinutes || 60), 15, 24 * 60 - startMinute);
  return { startMinute, endMinute: startMinute + duration };
}

function incomePlanningCalendarStampMarker(stamp: IncomePlanningCalendarStamp): string {
  const start = clamp(parseTimeMinutes(stamp.startTime) ?? 0, 0, 24 * 60);
  const top = (start / (24 * 60)) * 100;
  const icon = normalizePositionIcon(stamp.icon, "calendar");
  return `
    <button
      class="income-planning-calendar-stamp"
      type="button"
      data-action="income-planning-open-stamp-menu"
      data-income-planning-calendar-stamp="true"
      data-income-planning-stamp-id="${escapeHtml(stamp.id)}"
      style="--top:${top.toFixed(3)}%;"
      title="${escapeHtml(`${stamp.label} · ${stamp.startTime}`)}"
    >
      ${positionIconSvg(icon, "position-icon-svg income-planning-calendar-icon")}
      <span>${escapeHtml(stamp.label)}</span>
    </button>
  `;
}

function incomePlanningPlannedStampMarker(stamp: IncomePlanningPlannedStamp): string {
  const start = clamp(parseTimeMinutes(stamp.startTime) ?? 0, 0, 24 * 60);
  const top = (start / (24 * 60)) * 100;
  const icon = normalizePositionIcon(stamp.icon, "calendar");
  return `
    <button
      class="income-planning-calendar-stamp planned"
      type="button"
      data-action="income-stamp-planner-edit"
      data-income-stamp-planner-calendar-stamp="true"
      data-income-stamp-planner-stamp-id="${escapeHtml(stamp.id)}"
      style="--top:${top.toFixed(3)}%;"
      title="${escapeHtml(`${stamp.label} · ${incomeStampPlannerFullDateLabel(stamp.date)} · ${stamp.startTime}`)}"
    >
      ${positionIconSvg(icon, "position-icon-svg income-planning-calendar-icon")}
      <span>${escapeHtml(stamp.label)}</span>
    </button>
  `;
}

function incomePlanningCurrentTimeLine(minute: number, label: string): string {
  const top = (clamp(minute, 0, 24 * 60) / (24 * 60)) * 100;
  return `
    <div class="income-planning-current-time-line" style="--top:${top.toFixed(3)}%;" aria-label="Ist-Zeit ${escapeHtml(label)}">
      <span>Ist-Zeit ${escapeHtml(label)}</span>
    </div>
  `;
}

function incomePlanningCurrentTimeMarker(): { day: IncomePlanningWeekday; minute: number; label: string } {
  const now = new Date();
  const dayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const minute = now.getHours() * 60 + now.getMinutes();
  return {
    day: INCOME_PLANNING_WEEK_DAYS[dayIndex] ?? "monday",
    minute,
    label: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  };
}

function incomePlanningCalendarEntryMeta(entry: IncomePlanningCalendarEntry): { label: string; icon: string } {
  if (entry.type === "pause") return { label: "Pause", icon: "calendar" };
  const workBlock = state.incomePlanning.workBlocks.find((block) => block.id === entry.ownerId);
  if (workBlock && (entry.type === "career" || entry.type === "side_work")) {
    const config = incomePlanningCategoryConfig(workBlock.category);
    return { label: config.label, icon: config.icon };
  }
  const habit = state.incomePlanning.habits.find((item) => item.id === entry.ownerId);
  if (entry.type === "good_habit") return { label: entry.title, icon: normalizePositionIcon(habit?.icon, "book") };
  if (entry.type === "bad_habit") return { label: entry.title, icon: normalizePositionIcon(habit?.icon, "snack") };
  if (entry.type === "replacement_habit") return { label: entry.title, icon: "gift" };
  const manualBlock = state.incomePlanning.manualBlocks.find((block) => block.id === entry.ownerId);
  if (manualBlock) {
    return {
      label: incomePlanningManualBlockTypeLabel(manualBlock.type),
      icon: normalizePositionIcon(manualBlock.icon, incomePlanningDefaultManualIcon(manualBlock.type))
    };
  }
  return { label: incomePlanningPlannerTypeLabel(entry.type), icon: "calendar" };
}

function incomePlanningCalendarEntryColor(entry: IncomePlanningCalendarEntry): string {
  if (entry.type === "pause") return "#6f7785";
  const workBlock = state.incomePlanning.workBlocks.find((block) => block.id === entry.ownerId);
  if (workBlock && (entry.type === "career" || entry.type === "side_work")) {
    return normalizeIncomePlanningColor(workBlock.color, incomePlanningDefaultWorkColor(workBlock.category));
  }
  const manualBlock = state.incomePlanning.manualBlocks.find((block) => block.id === entry.ownerId);
  if (manualBlock) return normalizeIncomePlanningColor(manualBlock.color, incomePlanningDefaultManualColor(manualBlock.type));
  if (entry.type === "good_habit") return "#4e9f6d";
  if (entry.type === "bad_habit") return "#b94646";
  if (entry.type === "replacement_habit") return "#8f5aa8";
  return "#6f7785";
}

function incomePlanningEntryTime(entry: IncomePlanningCalendarEntry): string {
  if (entry.flexible) {
    const range = incomePlanningCalendarEntryVisualRange(entry);
    return `flexibel · ${formatIncomePlanningTime(range.startMinute)}-${formatIncomePlanningTime(range.endMinute)} · ${minutesLabel(
      entry.durationMinutes
    )}`;
  }
  return `${entry.startTime}-${entry.endTime}`;
}

function incomePlanningManualBlockTypeOptions(): Array<{ value: IncomePlanningManualBlockType; label: string }> {
  return [
    { value: "private_commitment", label: "Private Verpflichtung" },
    { value: "free_time", label: "Freizeit" },
    { value: "buffer", label: "Puffer" },
    { value: "other_event", label: "Sonstiges Ereignis" }
  ];
}

function incomePlanningCategoryOptions(): Array<{ value: string; label: string }> {
  return INCOME_PLANNING_CATEGORY_CONFIGS.map((config) => ({ value: config.id, label: config.label }));
}

function incomePlanningWeekdayOptionItems(): Array<{ value: string; label: string }> {
  return INCOME_PLANNING_WEEK_DAYS.map((day) => ({ value: day, label: incomePlanningWeekdayLabel(day) }));
}

function incomePlanningHabitTypeOptions(): Array<{ value: string; label: string }> {
  return [
    { value: "good", label: "Gute Habit" },
    { value: "bad", label: "Schlechte Habit" }
  ];
}

function incomePlanningHabitDurationUnitOptions(): Array<{ value: string; label: string }> {
  return [
    { value: "day", label: "Tag" },
    { value: "week", label: "Woche" }
  ];
}

function incomePlanningHabitChangeOptions(): Array<{ value: string; label: string }> {
  return [
    { value: "keep", label: "Beibehalten" },
    { value: "reduce", label: "Reduzieren" },
    { value: "replace", label: "Ersetzen" },
    { value: "build", label: "Aufbauen" }
  ];
}

function incomePlanningHabitStatusOptions(): Array<{ value: string; label: string }> {
  return [
    { value: "planned", label: "Geplant" },
    { value: "active", label: "Aktiv" },
    { value: "difficult", label: "Schwierig" },
    { value: "stable", label: "Stabil" }
  ];
}

function incomePlanningPriorityOptions(): Array<{ value: string; label: string }> {
  return [
    { value: "low", label: "Niedrig" },
    { value: "medium", label: "Mittel" },
    { value: "high", label: "Hoch" }
  ];
}

function incomePlanningWeekdayLabel(day: IncomePlanningWeekday): string {
  if (day === "monday") return "Montag";
  if (day === "tuesday") return "Dienstag";
  if (day === "wednesday") return "Mittwoch";
  if (day === "thursday") return "Donnerstag";
  if (day === "friday") return "Freitag";
  if (day === "saturday") return "Samstag";
  return "Sonntag";
}

function incomePlanningWeekdayFromValue(value: unknown): IncomePlanningWeekday | null {
  return INCOME_PLANNING_WEEK_DAYS.includes(value as IncomePlanningWeekday) ? (value as IncomePlanningWeekday) : null;
}

function incomePlanningWeekdayIndex(day: IncomePlanningWeekday): number {
  return INCOME_PLANNING_WEEK_DAYS.indexOf(day);
}

function incomePlanningWeekdayByIndex(index: number): IncomePlanningWeekday {
  return INCOME_PLANNING_WEEK_DAYS[clamp(Math.round(index), 0, INCOME_PLANNING_WEEK_DAYS.length - 1)];
}

function incomePlanningPlannerTypeLabel(type: IncomePlanningPlannerEntryType): string {
  if (type === "career") return "Hauptjob";
  if (type === "side_work") return "Nebentaetigkeit";
  if (type === "pause") return "Pause";
  if (type === "private_commitment") return "Private Verpflichtung";
  if (type === "free_time") return "Freizeit";
  if (type === "buffer") return "Puffer";
  if (type === "good_habit") return "Gute Habit";
  if (type === "bad_habit") return "Schlechte Habit";
  if (type === "replacement_habit") return "Ersatz-Habit";
  return "Sonstiges";
}

function incomePlanningManualBlockTypeLabel(type: IncomePlanningManualBlockType): string {
  return incomePlanningManualBlockTypeOptions().find((option) => option.value === type)?.label ?? "Sonstiges Ereignis";
}

function incomePlanningHabitChangeLabel(value: IncomePlanningHabit["goalChange"]): string {
  return incomePlanningHabitChangeOptions().find((option) => option.value === value)?.label ?? "Beibehalten";
}

function incomePlanningOwnerTypeForEntry(entry: IncomePlanningCalendarEntry): Exclude<IncomePlanningOwnerType, "assumption"> {
  if (entry.type === "career" || entry.type === "side_work") return "work";
  if (entry.type === "good_habit" || entry.type === "bad_habit" || entry.type === "replacement_habit") return "habit";
  if (entry.type === "pause") return incomePlanningOwnerTypeForId(entry.ownerId);
  return "manual";
}

function incomePlanningOwnerTypeForId(ownerId: string): Exclude<IncomePlanningOwnerType, "assumption"> {
  if (state.incomePlanning.workBlocks.some((block) => block.id === ownerId)) return "work";
  if (state.incomePlanning.habits.some((habit) => habit.id === ownerId)) return "habit";
  return "manual";
}

function incomePlanningOwnerTypeFromValue(value: unknown): Exclude<IncomePlanningOwnerType, "assumption"> {
  if (value === "work" || value === "habit" || value === "manual") return value;
  return "manual";
}

function incomePlanningOwnerHours(model: IncomePlanningModel, ownerId: string): number {
  const workBlock = state.incomePlanning.workBlocks.find((block) => block.id === ownerId);
  if (workBlock) return slotsHours(workBlock.slots);
  const manualBlock = state.incomePlanning.manualBlocks.find((block) => block.id === ownerId);
  if (manualBlock) return slotsHours(manualBlock.slots);
  const minutes = model.calendarEntries
    .filter((entry) => entry.ownerId === ownerId && entry.type !== "pause")
    .reduce((sum, entry) => sum + entry.durationMinutes, 0);
  return Math.round((minutes / 60 + Number.EPSILON) * 10) / 10;
}

function slotsHours(slots: IncomePlanningSlot[]): number {
  const minutes = slots.reduce((sum, slot) => sum + incomePlanningSlotNetDurationMinutes(slot), 0);
  return Math.round((minutes / 60 + Number.EPSILON) * 10) / 10;
}

function slotsGrossHours(slots: IncomePlanningSlot[]): number {
  const minutes = slots.reduce((sum, slot) => sum + incomePlanningSlotGrossDurationMinutes(slot), 0);
  return Math.round((minutes / 60 + Number.EPSILON) * 10) / 10;
}

function slotsPauseHours(slots: IncomePlanningSlot[]): number {
  const minutes = slots.reduce((sum, slot) => sum + incomePlanningSlotPauseDurationMinutes(slot), 0);
  return Math.round((minutes / 60 + Number.EPSILON) * 10) / 10;
}

function normalizeIncomePlanningColor(value: unknown, fallback = "#6f7785"): string {
  const color = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : fallback;
}

function incomePlanningColorStyle(color: string): string {
  const normalized = normalizeIncomePlanningColor(color);
  return `--entry-color:${normalized}; --entry-bg:${hexToRgba(normalized, 0.14)};`;
}

function hexToRgba(color: string, alpha: number): string {
  const normalized = normalizeIncomePlanningColor(color);
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${clamp(alpha, 0, 1)})`;
}

function snapIncomePlanningMinute(value: number): number {
  return Math.round(value / 15) * 15;
}

function formatIncomePlanningTime(value: number): string {
  const normalized = clamp(Math.round(value), 0, 24 * 60 - 1);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function incomePlanningStatusLabel(status: IncomePlanningModel["status"]): string {
  if (status === "unrealistic") return "Unrealistisch";
  if (status === "high") return "Hohe Belastung";
  return "Realistisch";
}

function hoursLabel(value: number): string {
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value)} h`;
}

function minutesLabel(value: number): string {
  if (value >= 60) return hoursLabel(Math.round((value / 60 + Number.EPSILON) * 10) / 10);
  return `${intNumber(value)} min`;
}

function renderIncomePlanningDialog(): void {
  const root = document.querySelector<HTMLDivElement>("#incomePlanningDialogRoot");
  if (!root) return;
  if (!incomePlanningDialog) {
    root.innerHTML = "";
    return;
  }
  root.innerHTML = `
    <div class="income-planning-dialog-backdrop" role="presentation">
      <div class="income-planning-dialog" role="dialog" aria-modal="true" aria-label="Zeitblock bearbeiten">
        <div class="income-tax-dialog-head">
          <div>
            <strong>${escapeHtml(incomePlanningDialogTitle(incomePlanningDialog))}</strong>
            <span>${escapeHtml(incomePlanningDialogSubtitle(incomePlanningDialog))}</span>
          </div>
          ${incomePlanningDialogHeaderActions(incomePlanningDialog)}
        </div>
        ${incomePlanningDialog.error ? `<div class="income-planning-warning unrealistic"><strong>Fehler</strong><span>${escapeHtml(incomePlanningDialog.error)}</span></div>` : ""}
        ${
          incomePlanningDialog.ownerType === "assumption"
            ? incomePlanningAssumptionDialogFields(incomePlanningDialog)
            : incomePlanningBlockDialogFields(incomePlanningDialog)
        }
        <div class="button-row income-planning-dialog-actions">
          <button class="button secondary" type="button" data-action="income-planning-close-dialog">Abbrechen</button>
          <button class="button" type="button" data-action="income-planning-save-dialog">Speichern</button>
        </div>
      </div>
    </div>
  `;
}

function incomePlanningDialogHeaderActions(dialog: NonNullable<IncomePlanningDialogState>): string {
  const deleteButton = incomePlanningDialogCanDeleteSlot(dialog)
    ? `
      <button
        class="income-planning-header-icon-button danger"
        type="button"
        data-action="income-planning-delete-dialog-slot"
        aria-label="Aktuellen Wochen-Slot loeschen"
        title="Aktuellen Wochen-Slot loeschen"
      >
        ${incomePlanningHeaderIcon("trash")}
      </button>
    `
    : "";
  return `
    <div class="income-planning-header-actions">
      <button class="income-planning-header-icon-button" type="button" data-action="income-planning-close-dialog" aria-label="Zeitbudget-Dialog schliessen" title="Schliessen">x</button>
      <button class="income-planning-header-icon-button" type="button" data-action="income-planning-save-dialog" aria-label="Zeitbudget speichern" title="Speichern">
        ${incomePlanningHeaderIcon("save")}
      </button>
      ${deleteButton}
    </div>
  `;
}

function incomePlanningDialogCanDeleteSlot(dialog: NonNullable<IncomePlanningDialogState>): boolean {
  if (dialog.ownerType === "assumption" || !dialog.ownerId || !dialog.slotId) return false;
  if (dialog.mode !== "edit" && dialog.mode !== "create_slot") return false;
  return Boolean(incomePlanningSlotById(dialog.ownerType, dialog.ownerId, dialog.slotId));
}

function incomePlanningDialogTitle(dialog: NonNullable<IncomePlanningDialogState>): string {
  if (dialog.ownerType === "assumption") return "Zeitannahme bearbeiten";
  if (dialog.ownerType === "work" && dialog.mode === "create") return "Neuer Taetigkeitsblock";
  if (dialog.ownerType === "manual" && dialog.mode === "create") return "Neuer Zeitblock";
  if (dialog.ownerType === "habit" && dialog.mode === "create") return "Neue Habit";
  if (dialog.mode === "create_slot") return "Slot hinzufuegen";
  if (dialog.ownerType === "work") return "Taetigkeitsblock bearbeiten";
  if (dialog.ownerType === "habit") return "Habit bearbeiten";
  return "Zeitblock bearbeiten";
}

function incomePlanningDialogSubtitle(dialog: NonNullable<IncomePlanningDialogState>): string {
  if (dialog.ownerType === "work") return "Arbeit und Nebentaetigkeiten";
  if (dialog.ownerType === "habit") return "Habit";
  if (dialog.ownerType === "manual") return "Private Zeit, Freizeit, Puffer oder Ereignis";
  return "Schlaf wird als Wochenzeit beruecksichtigt";
}

function incomePlanningAssumptionDialogFields(dialog: NonNullable<IncomePlanningDialogState>): string {
  const sleepSlots = incomePlanningSleepSlotsFromDialogGroups(dialog.sleepSlotGroups);
  const averageSleepHours = incomePlanningAverageSleepHours({ sleepHoursPerDay: dialog.sleepHoursPerDay, sleepSlots });
  return `
    <section class="income-planning-dialog-section">
      <strong>Basis</strong>
      <div class="income-planning-dialog-grid single">
        <label class="field">
          <span>Schlaf pro Tag</span>
          <input type="number" min="0" max="24" step="0.5" value="${averageSleepHours}" disabled />
        </label>
      </div>
    </section>
    <section class="income-planning-dialog-section">
      <div class="income-planning-dialog-section-head">
        <strong>Schlafzeiten</strong>
        <button class="button secondary" type="button" data-action="income-planning-add-sleep-slot">Schlafzeit hinzufuegen</button>
      </div>
      <div class="income-planning-sleep-slot-list">
        ${dialog.sleepSlotGroups.length
          ? dialog.sleepSlotGroups.map(incomePlanningSleepSlotGroupDialogRow).join("")
          : '<div class="chart-empty">Noch keine Schlafzeiten geplant.</div>'}
      </div>
    </section>
  `;
}

function incomePlanningSleepSlotGroupDialogRow(group: IncomePlanningSleepSlotGroup): string {
  return `
    <div class="income-planning-sleep-slot-row">
      ${incomePlanningSleepSlotGroupSelectField(group.id, "fromDay", "Von", incomePlanningWeekdayOptionItems(), group.fromDay)}
      ${incomePlanningSleepSlotGroupSelectField(group.id, "toDay", "Bis", incomePlanningWeekdayOptionItems(), group.toDay)}
      <label class="income-planning-source-active">
        <input type="checkbox" ${group.flexible ? "checked" : ""} data-income-planning-sleep-slot-group-id="${escapeHtml(group.id)}" data-income-planning-sleep-slot-group-field="flexible" />
        <span>Flexibel</span>
      </label>
      <label class="field compact">
        <span>Start</span>
        <input type="time" value="${escapeHtml(group.startTime)}" data-income-planning-sleep-slot-group-id="${escapeHtml(group.id)}" data-income-planning-sleep-slot-group-field="startTime" />
      </label>
      <label class="field compact">
        <span>Ende</span>
        <input type="time" value="${escapeHtml(group.endTime)}" data-income-planning-sleep-slot-group-id="${escapeHtml(group.id)}" data-income-planning-sleep-slot-group-field="endTime" />
      </label>
      <label class="field compact">
        <span>Minuten</span>
        <input type="number" min="15" max="10080" step="15" value="${group.durationMinutes}" data-income-planning-sleep-slot-group-id="${escapeHtml(group.id)}" data-income-planning-sleep-slot-group-field="durationMinutes" />
      </label>
      <button class="icon-button danger" type="button" data-action="income-planning-remove-sleep-slot" data-income-planning-sleep-slot-group-id="${escapeHtml(
        group.id
      )}" aria-label="Schlafzeit entfernen">x</button>
      ${incomePlanningScenarioCheckboxGroup({
        selectedIds: group.scenarioIds,
        dataAttribute: "data-income-planning-sleep-scenario-id",
        groupId: group.id
      })}
    </div>
  `;
}

function incomePlanningSleepSlotGroupSelectField(
  groupId: string,
  field: string,
  label: string,
  options: Array<{ value: string; label: string }>,
  selected: string
): string {
  return `
    <label class="field compact">
      <span>${escapeHtml(label)}</span>
      <select data-income-planning-sleep-slot-group-id="${escapeHtml(groupId)}" data-income-planning-sleep-slot-group-field="${escapeHtml(field)}">
        ${options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === selected ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
      </select>
    </label>
  `;
}

function incomePlanningBlockDialogFields(dialog: NonNullable<IncomePlanningDialogState>): string {
  const isHabit = dialog.ownerType === "habit";
  return `
    <section class="income-planning-dialog-section">
      <strong>Basis</strong>
      <div class="income-planning-dialog-grid basis">
        <label class="income-planning-source-active">
          <input type="checkbox" ${dialog.active ? "checked" : ""} data-income-planning-dialog-field="active" />
          <span>Aktiv</span>
        </label>
        <label class="field">
          <span>Name</span>
          <input type="text" value="${escapeHtml(dialog.name)}" data-income-planning-dialog-field="name" />
        </label>
        <label class="field">
          <span>Beschreibung</span>
          <input type="text" value="${escapeHtml(dialog.description)}" data-income-planning-dialog-field="description" />
        </label>
        ${isHabit ? incomePlanningIconDialogField(dialog) : incomePlanningColorDialogField(dialog)}
        ${dialog.ownerType === "manual" ? incomePlanningIconDialogField(dialog) : ""}
      </div>
    </section>
    <section class="income-planning-dialog-section">
      <strong>${isHabit ? "Art und Ziel" : "Art"}</strong>
      <div class="income-planning-dialog-grid">
        ${dialog.ownerType === "work" ? incomePlanningDialogSelectField("category", "Arbeitsart", incomePlanningCategoryOptions(), dialog.category) : ""}
        ${dialog.ownerType === "manual" ? incomePlanningDialogSelectField("manualType", "Typ", incomePlanningManualBlockTypeOptions(), dialog.manualType) : ""}
        ${isHabit ? incomePlanningDialogSelectField("habitType", "Habit-Art", incomePlanningHabitTypeOptions(), dialog.habitType) : ""}
        ${
          isHabit
            ? `
              ${incomePlanningDialogSelectField("habitGoalChange", "Zielaenderung", incomePlanningHabitChangeOptions(), dialog.habitGoalChange)}
              ${incomePlanningDialogSelectField("habitStatus", "Status", incomePlanningHabitStatusOptions(), dialog.habitStatus)}
              ${incomePlanningDialogSelectField("priority", "Prioritaet", incomePlanningPriorityOptions(), dialog.priority)}
              <label class="field">
                <span>Ersatz-Habit</span>
                <input type="text" value="${escapeHtml(dialog.replacementHabit)}" data-income-planning-dialog-field="replacementHabit" />
              </label>
              <label class="field">
                <span>Zeitname</span>
                <input type="text" value="${escapeHtml(dialog.timing)}" data-income-planning-dialog-field="timing" />
              </label>
              <label class="field compact">
                <span>Habit-Dauer</span>
                <input type="number" min="0" max="1440" step="5" value="${dialog.habitDurationMinutes}" data-income-planning-dialog-field="habitDurationMinutes" />
              </label>
              ${incomePlanningDialogSelectField("habitDurationUnit", "Einheit", incomePlanningHabitDurationUnitOptions(), dialog.habitDurationUnit)}
            `
            : ""
        }
      </div>
    </section>
    ${incomePlanningDialogScenarioFields(dialog)}
    <section class="income-planning-dialog-section income-planning-dialog-slot">
      <strong>Wochen-Slot</strong>
      <div class="income-planning-dialog-grid slot">
        ${incomePlanningDialogSelectField("day", "Von", incomePlanningWeekdayOptionItems(), dialog.day)}
        ${incomePlanningDialogSelectField("toDay", "Bis", incomePlanningWeekdayOptionItems(), dialog.toDay)}
        <label class="income-planning-source-active">
          <input type="checkbox" ${dialog.flexible ? "checked" : ""} data-income-planning-dialog-field="flexible" />
          <span>Flexibel</span>
        </label>
        <label class="field compact">
          <span>Start</span>
          <input type="time" value="${escapeHtml(dialog.startTime)}" data-income-planning-dialog-field="startTime" />
        </label>
        <label class="field compact">
          <span>Ende</span>
          <input type="time" value="${escapeHtml(dialog.endTime)}" data-income-planning-dialog-field="endTime" />
        </label>
        <label class="field compact">
          <span>Minuten</span>
          <input type="number" min="15" max="10080" step="15" value="${dialog.slotDurationMinutes}" disabled aria-label="Automatisch berechnete Slot-Minuten" />
        </label>
        ${isHabit ? "" : incomePlanningPauseDialogFields(dialog)}
      </div>
    </section>
  `;
}

function incomePlanningDialogScenarioFields(dialog: NonNullable<IncomePlanningDialogState>): string {
  if (dialog.ownerType === "assumption") return "";
  return `
    <section class="income-planning-dialog-section">
      <strong>Wochenszenarien</strong>
      ${incomePlanningScenarioCheckboxGroup({
        selectedIds: dialog.scenarioIds,
        dataAttribute: "data-income-planning-dialog-scenario-id"
      })}
    </section>
  `;
}

function incomePlanningColorDialogField(dialog: NonNullable<IncomePlanningDialogState>): string {
  const color = normalizeIncomePlanningColor(dialog.color, dialog.ownerType === "work" ? incomePlanningDefaultWorkColor(dialog.category) : incomePlanningDefaultManualColor(dialog.manualType));
  return `
    <div class="field income-planning-color-field">
      <span>Farbe</span>
      <div class="income-planning-color-control">
        <input type="color" value="${escapeHtml(color)}" data-income-planning-dialog-field="color" aria-label="Blockfarbe" />
        <div class="income-planning-color-swatches" aria-label="Farbauswahl">
          ${INCOME_PLANNING_COLOR_OPTIONS.map(
            (option) => `
              <button
                class="income-planning-color-swatch ${option === color ? "active" : ""}"
                type="button"
                style="--entry-color:${option}; --entry-bg:${hexToRgba(option, 0.18)};"
                data-action="income-planning-set-dialog-color"
                data-income-planning-color="${escapeHtml(option)}"
                aria-label="Farbe ${escapeHtml(option)}"
                aria-pressed="${option === color}"
              ></button>
            `
          ).join("")}
        </div>
      </div>
    </div>
  `;
}

function incomePlanningIconDialogField(dialog: NonNullable<IncomePlanningDialogState>): string {
  const fallback = dialog.ownerType === "manual" ? incomePlanningDefaultManualIcon(dialog.manualType) : dialog.habitType === "bad" ? "snack" : "book";
  const icon = normalizePositionIcon(dialog.ownerType === "manual" ? dialog.manualIcon : dialog.habitIcon, fallback);
  const label = POSITION_ICONS.find((item) => item.id === icon)?.label ?? "Icon";
  return `
    <div class="field income-planning-icon-field">
      <span>Icon</span>
      <button class="income-planning-icon-button" type="button" data-action="open-income-planning-icon-picker" title="Icon auswaehlen">
        ${positionIconSvg(icon, "position-icon-svg income-planning-type-icon")}
        <span>${escapeHtml(label)}</span>
      </button>
    </div>
  `;
}

function incomePlanningPauseDialogFields(dialog: NonNullable<IncomePlanningDialogState>): string {
  return `
    <label class="income-planning-source-active income-planning-pause-toggle">
      <input type="checkbox" ${dialog.pauseEnabled ? "checked" : ""} data-income-planning-dialog-field="pauseEnabled" />
      <span>Pause</span>
    </label>
    ${
      dialog.pauseEnabled
        ? `
          <label class="field compact">
            <span>Pause Start</span>
            <input type="time" value="${escapeHtml(dialog.pauseStartTime)}" data-income-planning-dialog-field="pauseStartTime" />
          </label>
          <label class="field compact">
            <span>Pause Ende</span>
            <input type="time" value="${escapeHtml(dialog.pauseEndTime)}" data-income-planning-dialog-field="pauseEndTime" />
          </label>
          <label class="field compact">
            <span>Pause Minuten</span>
            <input type="number" min="0" max="10080" step="5" value="${dialog.pauseDurationMinutes}" data-income-planning-dialog-field="pauseDurationMinutes" />
          </label>
        `
        : ""
    }
  `;
}

function incomePlanningScenarioCheckboxGroup(input: {
  selectedIds: IncomePlanningWeekScenarioId[];
  dataAttribute: string;
  groupId?: string;
}): string {
  const options = incomePlanningWeekScenarioOptions();
  const selected = new Set(input.selectedIds);
  return `
    <div class="income-planning-week-scenario-options compact" role="group" aria-label="Szenario-Aktivierung">
      ${options.map((scenario) => {
        const checked = selected.has(scenario.id);
        return `
          <label class="income-planning-source-active income-planning-scenario-checkbox">
            <input
              type="checkbox"
              ${checked ? "checked" : ""}
              ${input.groupId ? `data-income-planning-sleep-slot-group-id="${escapeHtml(input.groupId)}"` : ""}
              ${input.dataAttribute}="${escapeHtml(scenario.id)}"
            />
            <span>${escapeHtml(scenario.label)}</span>
          </label>
        `;
      }).join("")}
    </div>
  `;
}

function incomePlanningDialogSelectField(
  field: string,
  label: string,
  options: Array<{ value: string; label: string }>,
  selected: string
): string {
  return `
    <label class="field compact">
      <span>${escapeHtml(label)}</span>
      <select data-income-planning-dialog-field="${escapeHtml(field)}">
        ${options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === selected ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
      </select>
    </label>
  `;
}

function openIncomePlanningDialog(
  ownerType: IncomePlanningOwnerType,
  mode: IncomePlanningDialogMode,
  ownerId: string | null = null,
  slotId: string | null = null,
  slotSeed?: Partial<IncomePlanningSlot>
): void {
  const draft = incomePlanningDialogDraft(ownerType, mode, ownerId, slotId, slotSeed);
  if (!draft) return;
  incomePlanningDialog = draft;
  renderIncomePlanningDialog();
}

function openIncomePlanningDialogFromCalendar(dayColumn: HTMLElement, clientY: number): void {
  const day = incomePlanningWeekdayFromValue(dayColumn.dataset.incomePlanningCalendarDay) ?? "monday";
  const rect = dayColumn.getBoundingClientRect();
  const minute = snapIncomePlanningMinute(((clientY - rect.top) / Math.max(1, rect.height)) * 24 * 60);
  const maxEndMinute = 23 * 60 + 45;
  const startMinute = clamp(minute, 0, maxEndMinute - 15);
  const endMinute = Math.min(maxEndMinute, startMinute + 60);
  openIncomePlanningDialog("manual", "create", null, null, {
    day,
    startTime: formatIncomePlanningTime(startMinute),
    endTime: formatIncomePlanningTime(endMinute),
    flexible: false,
    durationMinutes: endMinute - startMinute
  });
}

function openIncomePlanningStampPickerFromCalendar(dayColumn: HTMLElement, clientX: number, clientY: number): void {
  const day = incomePlanningWeekdayFromValue(dayColumn.dataset.incomePlanningCalendarDay) ?? "monday";
  const rect = dayColumn.getBoundingClientRect();
  const minute = snapIncomePlanningMinute(((clientY - rect.top) / Math.max(1, rect.height)) * 24 * 60);
  const position = incomePlanningPopupPosition(clientX, clientY, 480, 620);
  incomePlanningStampMenu = null;
  incomePlanningStampPicker = {
    stampId: null,
    day,
    startTime: formatIncomePlanningTime(clamp(minute, 0, 23 * 60 + 45)),
    icon: "calendar",
    label: "Stempel",
    scenarioIds: incomePlanningDefaultScenarioIdsForNewEntry(),
    ...position
  };
  renderIncomePlanningStampPicker();
  renderIncomePlanningStampMenu();
}

function openIncomePlanningStampPickerForEdit(stampId: string, clientX: number, clientY: number): void {
  const stamp = state.incomePlanning.calendarStamps.find((item) => item.id === stampId);
  if (!stamp) return;
  const position = incomePlanningPopupPosition(clientX, clientY, 480, 620);
  incomePlanningStampMenu = null;
  incomePlanningStampPicker = {
    stampId: stamp.id,
    day: stamp.day,
    startTime: stamp.startTime,
    icon: normalizePositionIcon(stamp.icon, "calendar"),
    label: stamp.label,
    scenarioIds: incomePlanningScenarioIdsForDialog(stamp.scenarioIds),
    ...position
  };
  renderIncomePlanningStampPicker();
  renderIncomePlanningStampMenu();
}

function openIncomePlanningStampMenu(stampId: string, clientX: number, clientY: number): void {
  if (!state.incomePlanning.calendarStamps.some((stamp) => stamp.id === stampId)) return;
  incomePlanningStampPicker = null;
  incomePlanningStampMenu = { stampId, ...incomePlanningPopupPosition(clientX, clientY, 220, 160) };
  renderIncomePlanningStampPicker();
  renderIncomePlanningStampMenu();
}

function incomePlanningPopupPosition(
  clientX: number,
  clientY: number,
  panelWidth: number,
  panelHeight: number
): { top: number; left: number } {
  return {
    left: Math.max(12, Math.min(clientX + 12, window.innerWidth - panelWidth - 12)),
    top: Math.max(12, Math.min(clientY + 12, window.innerHeight - panelHeight - 12))
  };
}

function incomePlanningDialogDraft(
  ownerType: IncomePlanningOwnerType,
  mode: IncomePlanningDialogMode,
  ownerId: string | null,
  slotId: string | null,
  slotSeed?: Partial<IncomePlanningSlot>
): IncomePlanningDialogState {
  const workBlock = ownerType === "work" ? state.incomePlanning.workBlocks.find((block) => block.id === ownerId) : null;
  const manualBlock = ownerType === "manual" ? state.incomePlanning.manualBlocks.find((block) => block.id === ownerId) : null;
  const habit = ownerType === "habit" ? state.incomePlanning.habits.find((item) => item.id === ownerId) : null;
  const fallbackWorkCategory = incomePlanningDefaultWorkCategory(state.incomePlanning.workBlocks);
  const fallbackWork = buildIncomePlanningWorkBlock(fallbackWorkCategory, "dialog-work");
  const fallbackManual = buildIncomePlanningManualBlock("other_event", "dialog-manual");
  const fallbackHabit = buildIncomePlanningHabit("dialog-habit");
  const sourceSlots =
    ownerType === "work"
      ? workBlock?.slots ?? fallbackWork.slots
      : ownerType === "manual"
        ? manualBlock?.slots ?? fallbackManual.slots
        : ownerType === "habit"
          ? habit?.slots ?? fallbackHabit.slots
          : [];
  const slot =
    ownerType === "assumption"
      ? defaultIncomePlanningSlot("manual")
      : {
          ...defaultIncomePlanningSlot(ownerType),
          ...(mode === "create_slot" ? {} : sourceSlots.find((item) => item.id === slotId) ?? sourceSlots[0]),
          ...slotSeed
        };
  const slotRange = mode === "create_slot" ? { fromDay: slot.day, toDay: slot.day } : incomePlanningSlotRangeForSlots(sourceSlots, slot);
  const slotVisualRange = incomePlanningVisualRangeFromTimes(slot.startTime, slot.endTime, slot.durationMinutes);
  return {
    mode,
    ownerType,
    ownerId,
    slotId: mode === "create_slot" ? null : slot.id,
    active: workBlock?.active ?? manualBlock?.active ?? habit?.active ?? true,
    category: workBlock?.category ?? fallbackWork.category,
    manualType: manualBlock?.type ?? "other_event",
    habitType: habit?.type ?? fallbackHabit.type,
    habitDurationUnit: habit?.durationUnit ?? fallbackHabit.durationUnit,
    habitGoalChange: habit?.goalChange ?? fallbackHabit.goalChange,
    habitStatus: habit?.status ?? fallbackHabit.status,
    priority: habit?.priority ?? fallbackHabit.priority,
    name: workBlock?.name ?? manualBlock?.name ?? habit?.name ?? (ownerType === "manual" ? fallbackManual.name : ownerType === "habit" ? fallbackHabit.name : fallbackWork.name),
    description: workBlock?.description ?? manualBlock?.description ?? habit?.description ?? "",
    color:
      ownerType === "work"
        ? normalizeIncomePlanningColor(workBlock?.color, incomePlanningDefaultWorkColor(workBlock?.category ?? fallbackWork.category))
        : normalizeIncomePlanningColor(manualBlock?.color, incomePlanningDefaultManualColor(manualBlock?.type ?? "other_event")),
    habitIcon: normalizePositionIcon(
      habit?.icon,
      (habit?.type ?? fallbackHabit.type) === "bad" ? "snack" : (fallbackHabit.icon ?? "book")
    ),
    manualIcon: normalizePositionIcon(manualBlock?.icon, incomePlanningDefaultManualIcon(manualBlock?.type ?? "other_event")),
    timing: habit?.timing ?? fallbackHabit.timing,
    habitDurationMinutes: habit?.durationMinutes ?? fallbackHabit.durationMinutes,
    replacementHabit: habit?.replacementHabit ?? "",
    sleepHoursPerDay: state.incomePlanning.assumptions.sleepHoursPerDay,
    sleepSlotGroups: incomePlanningSleepSlotGroupsFromSlots(state.incomePlanning.assumptions.sleepSlots),
    day: slotRange.fromDay,
    toDay: slotRange.toDay,
    startTime: slot.startTime,
    endTime: slot.endTime,
    flexible: slot.flexible,
    slotDurationMinutes: slotVisualRange.endMinute - slotVisualRange.startMinute,
    pauseEnabled:
      ownerType !== "habit" &&
      Boolean(slot.pauseEnabled ?? (slot.pauseDurationMinutes && slot.pauseStartTime && slot.pauseEndTime)),
    pauseStartTime: slot.pauseStartTime ?? "12:00",
    pauseEndTime: slot.pauseEndTime ?? "12:30",
    pauseDurationMinutes: slot.pauseDurationMinutes ?? 0,
    scenarioIds:
      ownerType === "assumption"
        ? []
        : mode === "create" || mode === "create_slot"
          ? incomePlanningDefaultScenarioIdsForNewEntry()
          : incomePlanningScenarioIdsForDialog(workBlock?.scenarioIds ?? manualBlock?.scenarioIds ?? habit?.scenarioIds),
    error: ""
  };
}

function incomePlanningSlotRangeForSlots(
  slots: IncomePlanningSlot[],
  selectedSlot: IncomePlanningSlot
): { fromDay: IncomePlanningWeekday; toDay: IncomePlanningWeekday } {
  const matchingDays = slots
    .filter(
      (slot) =>
        slot.startTime === selectedSlot.startTime &&
        slot.endTime === selectedSlot.endTime &&
        slot.flexible === selectedSlot.flexible &&
        slot.durationMinutes === selectedSlot.durationMinutes &&
        Boolean(slot.pauseEnabled) === Boolean(selectedSlot.pauseEnabled) &&
        (slot.pauseStartTime ?? "") === (selectedSlot.pauseStartTime ?? "") &&
        (slot.pauseEndTime ?? "") === (selectedSlot.pauseEndTime ?? "") &&
        (slot.pauseDurationMinutes ?? 0) === (selectedSlot.pauseDurationMinutes ?? 0)
    )
    .map((slot) => slot.day);
  const rangeDays = INCOME_PLANNING_WEEK_DAYS.filter((day) => matchingDays.includes(day));
  if (!rangeDays.length) {
    return { fromDay: selectedSlot.day, toDay: selectedSlot.day };
  }
  return { fromDay: rangeDays[0], toDay: rangeDays[rangeDays.length - 1] };
}

function updateIncomePlanningDialogDraft(field: string, value: string): void {
  if (!incomePlanningDialog) return;
  const numericFields = new Set(["habitDurationMinutes", "slotDurationMinutes", "sleepHoursPerDay", "pauseDurationMinutes"]);
  const booleanFields = new Set(["active", "flexible", "pauseEnabled"]);
  const nextDraft = {
    ...incomePlanningDialog,
    [field]: booleanFields.has(field)
      ? value === "true"
      : numericFields.has(field)
        ? numberValue(value)
        : field === "color"
          ? normalizeIncomePlanningColor(value, incomePlanningDialog.color)
          : value,
    error: ""
  } as NonNullable<IncomePlanningDialogState>;
  incomePlanningDialog = incomePlanningDialogWithAutoSlotDuration(nextDraft);
}

function updateIncomePlanningDialogScenarioSelection(scenarioId: string, checked: boolean): void {
  if (!incomePlanningDialog || !incomePlanningKnownScenarioIds().includes(scenarioId)) return;
  const selected = new Set(incomePlanningDialog.scenarioIds);
  if (checked) selected.add(scenarioId);
  else selected.delete(scenarioId);
  incomePlanningDialog = { ...incomePlanningDialog, scenarioIds: Array.from(selected), error: "" };
  renderIncomePlanningDialog();
}

function incomePlanningDialogWithAutoSlotDuration(
  draft: NonNullable<IncomePlanningDialogState>
): NonNullable<IncomePlanningDialogState> {
  const start = parseTimeMinutes(draft.startTime);
  const end = parseTimeMinutes(draft.endTime);
  if (start !== null && end !== null && end > start) {
    return { ...draft, slotDurationMinutes: end - start };
  }
  return draft;
}

function addIncomePlanningDialogSleepSlot(): void {
  if (!incomePlanningDialog || incomePlanningDialog.ownerType !== "assumption") return;
  const group = normalizeIncomePlanningDialogSleepSlotGroup({
    id: createId(),
    fromDay: "monday",
    toDay: "friday",
    startTime: "21:00",
    endTime: "05:30",
    flexible: false,
    durationMinutes: 8.5 * 60,
    scenarioIds: incomePlanningDefaultScenarioIdsForNewEntry(),
    slotIds: {}
  });
  incomePlanningDialog = {
    ...incomePlanningDialog,
    sleepSlotGroups: [...incomePlanningDialog.sleepSlotGroups, group],
    error: ""
  };
  renderIncomePlanningDialog();
}

function removeIncomePlanningDialogSleepSlot(groupId: string): void {
  if (!incomePlanningDialog || incomePlanningDialog.ownerType !== "assumption" || !groupId) return;
  incomePlanningDialog = {
    ...incomePlanningDialog,
    sleepSlotGroups: incomePlanningDialog.sleepSlotGroups.filter((group) => group.id !== groupId),
    error: ""
  };
  renderIncomePlanningDialog();
}

function updateIncomePlanningDialogSleepSlotGroup(groupId: string, field: keyof IncomePlanningSleepSlotGroup, value: string): void {
  if (!incomePlanningDialog || incomePlanningDialog.ownerType !== "assumption" || !groupId) return;
  incomePlanningDialog = {
    ...incomePlanningDialog,
    sleepSlotGroups: incomePlanningDialog.sleepSlotGroups.map((group) =>
      group.id === groupId ? normalizeIncomePlanningDialogSleepSlotGroup(updateIncomePlanningSleepSlotGroupField(group, field, value)) : group
    ),
    error: ""
  };
  renderIncomePlanningDialog();
}

function updateIncomePlanningSleepSlotGroupField(
  group: IncomePlanningSleepSlotGroup,
  field: keyof IncomePlanningSleepSlotGroup,
  value: string
): IncomePlanningSleepSlotGroup {
  if (field === "fromDay" && isIncomePlanningWeekday(value)) return { ...group, fromDay: value };
  if (field === "toDay" && isIncomePlanningWeekday(value)) return { ...group, toDay: value };
  if (field === "flexible") return { ...group, flexible: value === "true" };
  if (field === "startTime") return { ...group, startTime: value };
  if (field === "endTime") return { ...group, endTime: value };
  if (field === "durationMinutes") return { ...group, durationMinutes: Math.round(clamp(numberValue(value), 15, 10080)) };
  return group;
}

function updateIncomePlanningDialogSleepSlotGroupScenario(groupId: string, scenarioId: string, checked: boolean): void {
  if (!incomePlanningDialog || incomePlanningDialog.ownerType !== "assumption" || !incomePlanningKnownScenarioIds().includes(scenarioId)) return;
  incomePlanningDialog = {
    ...incomePlanningDialog,
    sleepSlotGroups: incomePlanningDialog.sleepSlotGroups.map((group) => {
      if (group.id !== groupId) return group;
      const selected = new Set(group.scenarioIds);
      if (checked) selected.add(scenarioId);
      else selected.delete(scenarioId);
      return { ...group, scenarioIds: Array.from(selected) };
    }),
    error: ""
  };
  renderIncomePlanningDialog();
}

function normalizeIncomePlanningDialogSleepSlot(slot: IncomePlanningSleepSlot): IncomePlanningSleepSlot {
  const durationMinutes = slot.flexible
    ? Math.round(clamp(slot.durationMinutes, 15, 10080))
    : incomePlanningSleepSlotDurationMinutes(slot);
  return {
    ...slot,
    durationMinutes
  };
}

function normalizeIncomePlanningDialogSleepSlotGroup(group: IncomePlanningSleepSlotGroup): IncomePlanningSleepSlotGroup {
  const durationMinutes = group.flexible
    ? Math.round(clamp(group.durationMinutes, 15, 10080))
    : incomePlanningSleepSlotDurationMinutes({
        id: group.id,
        day: group.fromDay,
        startTime: group.startTime,
        endTime: group.endTime,
        flexible: false,
        durationMinutes: group.durationMinutes
      });
  return {
    ...group,
    durationMinutes
  };
}

function incomePlanningSleepSlotGroupsFromSlots(slots: IncomePlanningSleepSlot[]): IncomePlanningSleepSlotGroup[] {
  const groups: IncomePlanningSleepSlotGroup[] = [];
  for (const rawSlot of slots) {
    const slot = normalizeIncomePlanningDialogSleepSlot(rawSlot);
    const last = groups[groups.length - 1];
    if (last && incomePlanningSleepSlotGroupMatchesSlot(last, slot) && incomePlanningNextWeekday(last.toDay) === slot.day) {
      last.toDay = slot.day;
      last.slotIds = { ...last.slotIds, [slot.day]: slot.id };
    } else {
      groups.push({
        id: slot.id || createId(),
        fromDay: slot.day,
        toDay: slot.day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        flexible: slot.flexible,
        durationMinutes: slot.durationMinutes,
        scenarioIds: incomePlanningScenarioIdsForDialog(slot.scenarioIds),
        slotIds: { [slot.day]: slot.id }
      });
    }
  }
  return groups;
}

function incomePlanningSleepSlotGroupMatchesSlot(group: IncomePlanningSleepSlotGroup, slot: IncomePlanningSleepSlot): boolean {
  return (
    group.startTime === slot.startTime &&
    group.endTime === slot.endTime &&
    group.flexible === slot.flexible &&
    group.durationMinutes === slot.durationMinutes &&
    scenarioIdsEqual(group.scenarioIds, incomePlanningScenarioIdsForDialog(slot.scenarioIds))
  );
}

function incomePlanningSleepSlotsFromDialogGroups(groups: IncomePlanningSleepSlotGroup[]): IncomePlanningSleepSlot[] {
  return groups.flatMap((group) =>
    incomePlanningSleepSlotGroupDays(group).map((day) =>
      normalizeIncomePlanningDialogSleepSlot({
        id: group.slotIds[day] ?? `${group.id}-${day}`,
        day,
        startTime: group.startTime,
        endTime: group.endTime,
        flexible: group.flexible,
        durationMinutes: group.durationMinutes,
        scenarioIds: incomePlanningStoredScenarioIds(group.scenarioIds)
      })
    )
  );
}

function scenarioIdsEqual(first: IncomePlanningWeekScenarioId[], second: IncomePlanningWeekScenarioId[]): boolean {
  if (first.length !== second.length) return false;
  const firstSet = new Set(first);
  return second.every((scenarioId) => firstSet.has(scenarioId));
}

function incomePlanningSleepSlotGroupDays(group: IncomePlanningSleepSlotGroup): IncomePlanningWeekday[] {
  const days: IncomePlanningWeekday[] = [];
  const startIndex = incomePlanningWeekdayIndex(group.fromDay);
  for (let offset = 0; offset < INCOME_PLANNING_WEEK_DAYS.length; offset += 1) {
    const day = INCOME_PLANNING_WEEK_DAYS[(startIndex + offset) % INCOME_PLANNING_WEEK_DAYS.length];
    days.push(day);
    if (day === group.toDay) break;
  }
  return days;
}

function incomePlanningNextWeekday(day: IncomePlanningWeekday): IncomePlanningWeekday {
  return INCOME_PLANNING_WEEK_DAYS[(incomePlanningWeekdayIndex(day) + 1) % INCOME_PLANNING_WEEK_DAYS.length];
}

function closeIncomePlanningDialog(): void {
  incomePlanningDialog = null;
  incomePlanningHabitIconPicker = null;
  renderIncomePlanningDialog();
  renderIncomePlanningHabitIconPicker();
}

function deleteIncomePlanningDialogSlot(): void {
  if (!incomePlanningDialog || !incomePlanningDialogCanDeleteSlot(incomePlanningDialog)) return;
  const ownerType = incomePlanningDialog.ownerType;
  const ownerId = incomePlanningDialog.ownerId ?? "";
  const slotId = incomePlanningDialog.slotId ?? "";
  incomePlanningDialog = null;
  incomePlanningHabitIconPicker = null;
  removeIncomePlanningSlot(ownerType, ownerId, slotId);
  renderIncomePlanningHabitIconPicker();
}

function saveIncomePlanningDialog(): void {
  if (!incomePlanningDialog) return;
  const draft = incomePlanningDialog;
  if (draft.ownerType === "assumption") {
    if (draft.sleepSlotGroups.some((group) => !group.scenarioIds.length)) {
      incomePlanningDialog = { ...draft, error: "Bitte pro Schlafzeit mindestens ein Wochenszenario auswaehlen." };
      renderIncomePlanningDialog();
      return;
    }
    const sleepSlots = incomePlanningSleepSlotsFromDialogGroups(draft.sleepSlotGroups);
    state.incomePlanning = {
      ...state.incomePlanning,
      assumptions: {
        ...state.incomePlanning.assumptions,
        sleepHoursPerDay: clamp(incomePlanningAverageSleepHours({ sleepHoursPerDay: draft.sleepHoursPerDay, sleepSlots }), 0, 24),
        sleepSlots
      }
    };
    closeIncomePlanningDialog();
    renderIncomePlanning();
    saveState(state);
    return;
  }

  const dialogSlots = incomePlanningSlotsFromDialog(draft);
  if (!dialogSlots.length) {
    incomePlanningDialog = { ...draft, error: "Start und Ende muessen innerhalb desselben Tages liegen und mindestens 15 Minuten Abstand haben." };
    renderIncomePlanningDialog();
    return;
  }
  if (!draft.scenarioIds.length) {
    incomePlanningDialog = { ...draft, error: "Bitte mindestens ein Wochenszenario auswaehlen." };
    renderIncomePlanningDialog();
    return;
  }

  if (draft.mode === "create") {
    createIncomePlanningOwnerFromDialog(draft, dialogSlots);
  } else {
    applyIncomePlanningDialogOwnerFields(draft);
    updateIncomePlanningOwnerSlots(draft.ownerType, draft.ownerId ?? "", (slots) =>
      incomePlanningApplyDialogSlots(draft, slots, dialogSlots)
    );
  }
  closeIncomePlanningDialog();
  renderIncomePlanning();
  saveState(state);
}

function incomePlanningSlotsFromDialog(draft: NonNullable<IncomePlanningDialogState>): IncomePlanningSlot[] {
  const start = parseTimeMinutes(draft.startTime);
  const end = parseTimeMinutes(draft.endTime);
  if (start === null || end === null || end - start < 15) return [];
  const durationMinutes = end - start;
  const pause = incomePlanningPauseFromDialog(draft);
  const slots = incomePlanningDayRange(draft.day, draft.toDay).map((day, index) => ({
    id: draft.day === draft.toDay && index === 0 ? draft.slotId || createId() : createId(),
    day,
    startTime: draft.startTime,
    endTime: draft.endTime,
    flexible: draft.flexible,
    durationMinutes,
    ...pause
  }));
  return draft.ownerType === "habit" ? slots.map(incomePlanningStripSlotPause) : slots;
}

function incomePlanningPauseFromDialog(draft: NonNullable<IncomePlanningDialogState>): Partial<IncomePlanningSlot> {
  if (draft.ownerType === "habit") return {};
  const durationMinutes = Math.round(clamp(draft.pauseDurationMinutes, 0, 10080));
  const start = parseTimeMinutes(draft.pauseStartTime);
  const end = parseTimeMinutes(draft.pauseEndTime);
  const validClockPause = start !== null && end !== null && end > start;
  const calculatedDuration = validClockPause ? end - start : durationMinutes;
  return {
    pauseEnabled: draft.pauseEnabled,
    pauseStartTime: draft.pauseStartTime,
    pauseEndTime: draft.pauseEndTime,
    pauseDurationMinutes: calculatedDuration
  };
}

function incomePlanningApplyDialogSlots(
  draft: NonNullable<IncomePlanningDialogState>,
  existingSlots: IncomePlanningSlot[],
  newSlots: IncomePlanningSlot[]
): IncomePlanningSlot[] {
  if (draft.day !== draft.toDay) {
    return draft.mode === "create_slot" ? [...existingSlots, ...newSlots] : newSlots;
  }
  const slot = newSlots[0];
  if (!slot) return existingSlots;
  if (draft.slotId) return existingSlots.map((item) => (item.id === draft.slotId ? slot : item));
  return [...existingSlots, { ...slot, id: createId() }];
}

function incomePlanningDayRange(fromDay: IncomePlanningWeekday, toDay: IncomePlanningWeekday): IncomePlanningWeekday[] {
  const days: IncomePlanningWeekday[] = [];
  const startIndex = incomePlanningWeekdayIndex(fromDay);
  for (let offset = 0; offset < INCOME_PLANNING_WEEK_DAYS.length; offset += 1) {
    const day = INCOME_PLANNING_WEEK_DAYS[(startIndex + offset) % INCOME_PLANNING_WEEK_DAYS.length];
    days.push(day);
    if (day === toDay) break;
  }
  return days;
}

function createIncomePlanningOwnerFromDialog(draft: NonNullable<IncomePlanningDialogState>, slots: IncomePlanningSlot[]): void {
  if (draft.ownerType === "work") {
    const id = createId();
    state.incomePlanning = {
      ...state.incomePlanning,
      workBlocks: [
        ...state.incomePlanning.workBlocks,
        buildIncomePlanningWorkBlock(draft.category, id, {
          active: draft.active,
          name: draft.name || incomePlanningCategoryConfig(draft.category).defaultName,
          description: draft.description,
          color: normalizeIncomePlanningColor(draft.color, incomePlanningDefaultWorkColor(draft.category)),
          slots,
          scenarioIds: incomePlanningStoredScenarioIds(draft.scenarioIds)
        })
      ]
    };
    enforceIncomePlanningMainJob(id);
  }
  if (draft.ownerType === "manual") {
    state.incomePlanning = {
      ...state.incomePlanning,
      manualBlocks: [
        ...state.incomePlanning.manualBlocks,
        buildIncomePlanningManualBlock(draft.manualType, createId(), {
          active: draft.active,
          name: draft.name || incomePlanningManualBlockTypeLabel(draft.manualType),
          description: draft.description,
          color: normalizeIncomePlanningColor(draft.color, incomePlanningDefaultManualColor(draft.manualType)),
          icon: normalizePositionIcon(draft.manualIcon, incomePlanningDefaultManualIcon(draft.manualType)),
          slots,
          scenarioIds: incomePlanningStoredScenarioIds(draft.scenarioIds)
        })
      ]
    };
  }
  if (draft.ownerType === "habit") {
    state.incomePlanning = {
      ...state.incomePlanning,
      habits: [
        ...state.incomePlanning.habits,
        buildIncomePlanningHabit(createId(), {
          active: draft.active,
          type: draft.habitType,
          name: draft.name || "Habit",
          description: draft.description,
          icon: normalizePositionIcon(draft.habitIcon, draft.habitType === "bad" ? "snack" : "book"),
          timing: draft.timing,
          durationMinutes: clamp(Math.round(draft.habitDurationMinutes), 0, 1440),
          durationUnit: draft.habitDurationUnit,
          goalChange: draft.habitGoalChange,
          replacementHabit: draft.replacementHabit,
          status: draft.habitStatus,
          priority: draft.priority,
          slots,
          scenarioIds: incomePlanningStoredScenarioIds(draft.scenarioIds)
        })
      ]
    };
  }
}

function applyIncomePlanningDialogOwnerFields(draft: NonNullable<IncomePlanningDialogState>): void {
  if (!draft.ownerId) return;
  if (draft.ownerType === "work") {
    state.incomePlanning = {
      ...state.incomePlanning,
    workBlocks: state.incomePlanning.workBlocks.map((block) =>
      block.id === draft.ownerId
        ? {
            ...block,
            active: draft.active,
            category: draft.category,
            name: draft.name,
            description: draft.description,
            color: normalizeIncomePlanningColor(draft.color, incomePlanningDefaultWorkColor(draft.category)),
            scenarioIds: incomePlanningStoredScenarioIds(draft.scenarioIds)
          }
        : block
      )
    };
    enforceIncomePlanningMainJob(draft.ownerId);
  }
  if (draft.ownerType === "manual") {
    state.incomePlanning = {
      ...state.incomePlanning,
    manualBlocks: state.incomePlanning.manualBlocks.map((block) =>
      block.id === draft.ownerId
        ? {
            ...block,
            active: draft.active,
            type: draft.manualType,
            name: draft.name,
            description: draft.description,
            color: normalizeIncomePlanningColor(draft.color, incomePlanningDefaultManualColor(draft.manualType)),
            icon: normalizePositionIcon(draft.manualIcon, incomePlanningDefaultManualIcon(draft.manualType)),
            scenarioIds: incomePlanningStoredScenarioIds(draft.scenarioIds)
          }
        : block
      )
    };
  }
  if (draft.ownerType === "habit") {
    state.incomePlanning = {
      ...state.incomePlanning,
      habits: state.incomePlanning.habits.map((habit) =>
        habit.id === draft.ownerId
          ? {
              ...habit,
              active: draft.active,
              type: draft.habitType,
              name: draft.name,
              description: draft.description,
              icon: normalizePositionIcon(draft.habitIcon, draft.habitType === "bad" ? "snack" : "book"),
              timing: draft.timing,
              durationMinutes: clamp(Math.round(draft.habitDurationMinutes), 0, 1440),
              durationUnit: draft.habitDurationUnit,
              goalChange: draft.habitGoalChange,
              replacementHabit: draft.replacementHabit,
              status: draft.habitStatus,
              priority: draft.priority,
              scenarioIds: incomePlanningStoredScenarioIds(draft.scenarioIds)
            }
          : habit
      )
    };
  }
}

function enforceIncomePlanningMainJob(primaryId: string | null): void {
  if (!primaryId) return;
  state.incomePlanning = {
    ...state.incomePlanning,
    workBlocks: enforceSingleActiveIncomePlanningMainJob(state.incomePlanning.workBlocks, primaryId)
  };
}

function handleIncomePlanningControl(
  target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  renderMode: "live" | "full" = "full"
): boolean {
  if (target.dataset.incomePlanningWeekScenarioDialogField) {
    updateIncomePlanningWeekScenarioDialogDraft(target.dataset.incomePlanningWeekScenarioDialogField, target.value);
    return true;
  }

  if (target.dataset.incomePlanningDialogScenarioId) {
    if (!(target instanceof HTMLInputElement)) return false;
    updateIncomePlanningDialogScenarioSelection(target.dataset.incomePlanningDialogScenarioId, target.checked);
    return true;
  }

  if (target.dataset.incomePlanningStampScenarioId) {
    if (!(target instanceof HTMLInputElement)) return false;
    updateIncomePlanningStampScenarioSelection(target.dataset.incomePlanningStampScenarioId, target.checked);
    return true;
  }

  if (target.dataset.incomeStampPlannerScenarioId) {
    if (!(target instanceof HTMLInputElement)) return false;
    updateIncomeStampPlannerScenarioSelection(target.dataset.incomeStampPlannerScenarioId, target.checked);
    return true;
  }

  if (target.dataset.incomePlanningSleepSlotGroupId && target.dataset.incomePlanningSleepScenarioId) {
    if (!(target instanceof HTMLInputElement)) return false;
    updateIncomePlanningDialogSleepSlotGroupScenario(
      target.dataset.incomePlanningSleepSlotGroupId,
      target.dataset.incomePlanningSleepScenarioId,
      target.checked
    );
    return true;
  }

  if (target.dataset.incomePlanningSleepSlotGroupId && target.dataset.incomePlanningSleepSlotGroupField) {
    const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
    updateIncomePlanningDialogSleepSlotGroup(
      target.dataset.incomePlanningSleepSlotGroupId,
      target.dataset.incomePlanningSleepSlotGroupField as keyof IncomePlanningSleepSlotGroup,
      value
    );
    return true;
  }

  if (target.dataset.incomePlanningDialogField) {
    const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
    const field = target.dataset.incomePlanningDialogField;
    updateIncomePlanningDialogDraft(field, value);
    if (["pauseEnabled", "startTime", "endTime", "flexible", "pauseStartTime", "pauseEndTime"].includes(field)) {
      renderIncomePlanningDialog();
    }
    return true;
  }

  if (target.dataset.incomePlanningAssumption) {
    updateIncomePlanningAssumption(
      target.dataset.incomePlanningAssumption as keyof IncomePlanningAssumptions,
      target.value
    );
    if (renderMode === "live") renderIncomePlanningSummary();
    else renderIncomePlanning();
    saveState(state);
    return true;
  }

  if (target.dataset.incomePlanningWorkId && target.dataset.incomePlanningWorkField) {
    const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
    updateIncomePlanningWorkBlock(
      target.dataset.incomePlanningWorkId,
      target.dataset.incomePlanningWorkField as keyof IncomePlanningWorkBlock,
      value
    );
    if (renderMode === "live") renderIncomePlanningSummary();
    else renderIncomePlanning();
    saveState(state);
    return true;
  }

  if (target.dataset.incomePlanningHabitId && target.dataset.incomePlanningHabitField) {
    const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
    updateIncomePlanningHabit(
      target.dataset.incomePlanningHabitId,
      target.dataset.incomePlanningHabitField as keyof IncomePlanningHabit,
      value
    );
    if (renderMode === "live") renderIncomePlanningSummary();
    else renderIncomePlanning();
    saveState(state);
    return true;
  }

  if (target.dataset.incomePlanningManualId && target.dataset.incomePlanningManualField) {
    const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
    updateIncomePlanningManualBlock(
      target.dataset.incomePlanningManualId,
      target.dataset.incomePlanningManualField as keyof IncomePlanningManualBlock,
      value
    );
    if (renderMode === "live") renderIncomePlanningSummary();
    else renderIncomePlanning();
    saveState(state);
    return true;
  }

  if (
    target.dataset.incomePlanningOwnerType &&
    target.dataset.incomePlanningOwnerId &&
    target.dataset.incomePlanningSlotId &&
    target.dataset.incomePlanningSlotField
  ) {
    const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
    updateIncomePlanningSlot(
      target.dataset.incomePlanningOwnerType,
      target.dataset.incomePlanningOwnerId,
      target.dataset.incomePlanningSlotId,
      target.dataset.incomePlanningSlotField as keyof IncomePlanningSlot,
      value
    );
    if (renderMode === "live") renderIncomePlanningSummary();
    else renderIncomePlanning();
    saveState(state);
    return true;
  }

  return false;
}

function removeIncomePlanningWorkBlock(workBlockId: string): void {
  if (!workBlockId) return;
  state.incomePlanning = {
    ...state.incomePlanning,
    workBlocks: state.incomePlanning.workBlocks.filter((block) => block.id !== workBlockId)
  };
  renderIncomePlanning();
  saveState(state);
}

function removeIncomePlanningHabit(habitId: string): void {
  if (!habitId) return;
  state.incomePlanning = {
    ...state.incomePlanning,
    habits: state.incomePlanning.habits.filter((habit) => habit.id !== habitId)
  };
  renderIncomePlanning();
  saveState(state);
}

function removeIncomePlanningManualBlock(blockId: string): void {
  if (!blockId) return;
  state.incomePlanning = {
    ...state.incomePlanning,
    manualBlocks: state.incomePlanning.manualBlocks.filter((block) => block.id !== blockId)
  };
  renderIncomePlanning();
  saveState(state);
}

function removeIncomePlanningSlot(ownerType: string, ownerId: string, slotId: string): void {
  if (!ownerType || !ownerId || !slotId) return;
  updateIncomePlanningOwnerSlots(ownerType, ownerId, (slots) => slots.filter((slot) => slot.id !== slotId));
  renderIncomePlanning();
  saveState(state);
}

function updateIncomePlanningAssumption(field: keyof IncomePlanningAssumptions, value: string): void {
  if (field !== "sleepHoursPerDay") return;
  state.incomePlanning = {
    ...state.incomePlanning,
    assumptions: {
      ...state.incomePlanning.assumptions,
      sleepHoursPerDay: Math.max(0, numberValue(value))
    }
  };
}

function updateIncomePlanningWorkBlock(
  workBlockId: string,
  field: keyof IncomePlanningWorkBlock,
  value: string
): void {
  state.incomePlanning = {
    ...state.incomePlanning,
    workBlocks: state.incomePlanning.workBlocks.map((workBlock) => {
      if (workBlock.id !== workBlockId) return workBlock;
      if (field === "active") return { ...workBlock, active: value === "true" };
      if (field === "category") {
        const category = isIncomePlanningCategory(value) ? value : workBlock.category;
        return {
          ...workBlock,
          category,
          color: normalizeIncomePlanningColor(workBlock.color, incomePlanningDefaultWorkColor(category))
        };
      }
      if (field === "name") return { ...workBlock, name: value };
      if (field === "description") return { ...workBlock, description: value };
      if (field === "color") return { ...workBlock, color: normalizeIncomePlanningColor(value, workBlock.color ?? incomePlanningDefaultWorkColor(workBlock.category)) };
      return workBlock;
    })
  };
}

function updateIncomePlanningHabit(habitId: string, field: keyof IncomePlanningHabit, value: string): void {
  state.incomePlanning = {
    ...state.incomePlanning,
    habits: state.incomePlanning.habits.map((habit) => {
      if (habit.id !== habitId) return habit;
      if (field === "active") return { ...habit, active: value === "true" };
      if (field === "type" && isIncomePlanningHabitType(value)) return { ...habit, type: value };
      if (field === "name") return { ...habit, name: value };
      if (field === "description") return { ...habit, description: value };
      if (field === "icon") return { ...habit, icon: normalizePositionIcon(value, habit.type === "bad" ? "snack" : "book") };
      if (field === "timing") return { ...habit, timing: value };
      if (field === "durationMinutes") return { ...habit, durationMinutes: Math.round(clamp(numberValue(value), 0, 1440)) };
      if (field === "durationUnit" && isIncomePlanningHabitDurationUnit(value)) return { ...habit, durationUnit: value };
      if (field === "goalChange" && isIncomePlanningHabitChange(value)) return { ...habit, goalChange: value };
      if (field === "replacementHabit") return { ...habit, replacementHabit: value };
      if (field === "status" && isIncomePlanningHabitStatus(value)) return { ...habit, status: value };
      if (field === "priority" && isIncomePlanningPriority(value)) return { ...habit, priority: value };
      return habit;
    })
  };
}

function updateIncomePlanningManualBlock(
  blockId: string,
  field: keyof IncomePlanningManualBlock,
  value: string
): void {
  state.incomePlanning = {
    ...state.incomePlanning,
    manualBlocks: state.incomePlanning.manualBlocks.map((block) => {
      if (block.id !== blockId) return block;
      if (field === "active") return { ...block, active: value === "true" };
      if (field === "type" && isIncomePlanningManualBlockType(value)) return { ...block, type: value };
      if (field === "name") return { ...block, name: value };
      if (field === "description") return { ...block, description: value };
      if (field === "color") return { ...block, color: normalizeIncomePlanningColor(value, block.color ?? incomePlanningDefaultManualColor(block.type)) };
      if (field === "icon") return { ...block, icon: normalizePositionIcon(value, incomePlanningDefaultManualIcon(block.type)) };
      return block;
    })
  };
}

function updateIncomePlanningSlot(
  ownerType: string,
  ownerId: string,
  slotId: string,
  field: keyof IncomePlanningSlot,
  value: string
): void {
  updateIncomePlanningOwnerSlots(ownerType, ownerId, (slots) =>
    slots.map((slot) => {
      if (slot.id !== slotId) return slot;
      return normalizeIncomePlanningSlotAfterEdit(updateIncomePlanningSlotField(slot, field, value));
    })
  );
}

function updateIncomePlanningSlotField(slot: IncomePlanningSlot, field: keyof IncomePlanningSlot, value: string): IncomePlanningSlot {
  if (field === "day" && isIncomePlanningWeekday(value)) return { ...slot, day: value };
  if (field === "flexible") return { ...slot, flexible: value === "true" };
  if (field === "startTime") return { ...slot, startTime: value };
  if (field === "endTime") return { ...slot, endTime: value };
  if (field === "durationMinutes") return { ...slot, durationMinutes: Math.round(clamp(numberValue(value), 0, 10080)) };
  if (field === "pauseEnabled") return { ...slot, pauseEnabled: value === "true" };
  if (field === "pauseStartTime") return { ...slot, pauseStartTime: value };
  if (field === "pauseEndTime") return { ...slot, pauseEndTime: value };
  if (field === "pauseDurationMinutes") return { ...slot, pauseDurationMinutes: Math.round(clamp(numberValue(value), 0, 10080)) };
  return slot;
}

function normalizeIncomePlanningSlotAfterEdit(slot: IncomePlanningSlot): IncomePlanningSlot {
  const normalizedPause = normalizeIncomePlanningSlotPause(slot);
  const start = parseTimeMinutes(normalizedPause.startTime);
  const end = parseTimeMinutes(normalizedPause.endTime);
  if (start !== null && end !== null && end > start) {
    return { ...normalizedPause, durationMinutes: end - start };
  }
  return normalizedPause;
}

function normalizeIncomePlanningSlotPause(slot: IncomePlanningSlot): IncomePlanningSlot {
  const pauseEnabled = Boolean(slot.pauseEnabled);
  const pauseDurationMinutes = Math.round(clamp(slot.pauseDurationMinutes ?? 0, 0, 10080));
  if (!slot.pauseStartTime || !slot.pauseEndTime) return { ...slot, pauseEnabled: false };
  const start = parseTimeMinutes(slot.pauseStartTime);
  const end = parseTimeMinutes(slot.pauseEndTime);
  if (start === null || end === null || end <= start) return { ...slot, pauseEnabled, pauseDurationMinutes };
  return { ...slot, pauseEnabled, pauseDurationMinutes: end - start };
}

function updateIncomePlanningOwnerSlots(
  ownerType: string,
  ownerId: string,
  updater: (slots: IncomePlanningSlot[]) => IncomePlanningSlot[]
): void {
  if (ownerType === "work") {
    state.incomePlanning = {
      ...state.incomePlanning,
      workBlocks: state.incomePlanning.workBlocks.map((block) =>
        block.id === ownerId ? { ...block, slots: updater(block.slots) } : block
      )
    };
  }
  if (ownerType === "habit") {
    state.incomePlanning = {
      ...state.incomePlanning,
      habits: state.incomePlanning.habits.map((habit) =>
        habit.id === ownerId ? { ...habit, slots: updater(habit.slots).map(incomePlanningStripSlotPause) } : habit
      )
    };
  }
  if (ownerType === "manual") {
    state.incomePlanning = {
      ...state.incomePlanning,
      manualBlocks: state.incomePlanning.manualBlocks.map((block) =>
        block.id === ownerId ? { ...block, slots: updater(block.slots) } : block
      )
    };
  }
}

function defaultIncomePlanningSlot(ownerType: string): IncomePlanningSlot {
  const isHabit = ownerType === "habit";
  const isManual = ownerType === "manual";
  return {
    id: createId(),
    day: isManual ? "sunday" : "monday",
    startTime: isHabit ? "21:30" : "18:00",
    endTime: isHabit ? "22:00" : "19:00",
    flexible: isManual,
    durationMinutes: isHabit ? 30 : 60
  };
}

function startIncomePlanningCalendarDrag(event: PointerEvent): void {
  const target = event.target as HTMLElement | null;
  const plannerStamp = target?.closest<HTMLElement>("[data-income-stamp-planner-stamp]");
  if (plannerStamp && plannerStamp.closest("[data-income-stamp-planner-calendar]")) {
    startIncomeStampPlannerStampDrag(event, plannerStamp);
    return;
  }
  const plannedStamp = target?.closest<HTMLElement>("[data-income-stamp-planner-calendar-stamp]");
  if (plannedStamp) {
    startIncomePlanningPlannedStampCalendarDrag(event, plannedStamp);
    return;
  }
  const stamp = target?.closest<HTMLElement>("[data-income-planning-calendar-stamp]");
  if (stamp) {
    startIncomePlanningStampCalendarDrag(event, stamp);
    return;
  }
  const sleepBlock = target?.closest<HTMLElement>("[data-income-planning-sleep-group-id]");
  if (sleepBlock) {
    startIncomePlanningSleepCalendarDrag(event, sleepBlock);
    return;
  }
  const block = target?.closest<HTMLElement>("[data-income-planning-calendar-block]");
  if (!block) return;
  const ownerType = incomePlanningOwnerTypeFromValue(block.dataset.incomePlanningOwnerType);
  const ownerId = block.dataset.incomePlanningOwnerId || "";
  const slotId = block.dataset.incomePlanningSlotId || "";
  const slotPart = block.dataset.incomePlanningSlotPart === "pause" ? "pause" : "main";
  const slot = incomePlanningSlotById(ownerType, ownerId, slotId);
  const column = block.closest<HTMLElement>("[data-income-planning-calendar-day]");
  const days = document.querySelector<HTMLElement>("#incomePlanningCalendarDays");
  if (!ownerId || !slotId || !slot || !column || !days) return;
  const range =
    slotPart === "pause"
      ? incomePlanningVisualRangeFromTimes(slot.pauseStartTime ?? "", slot.pauseEndTime ?? "", slot.pauseDurationMinutes ?? 30)
      : incomePlanningVisualRangeFromTimes(slot.startTime, slot.endTime, slot.durationMinutes);
  if (range.endMinute <= range.startMinute) return;
  const resizeHandle = target?.closest<HTMLElement>("[data-income-planning-resize]");
  incomePlanningDragState = {
    ownerType,
    ownerId,
    slotId,
    slotPart,
    mode: resizeHandle?.dataset.incomePlanningResize === "start" ? "resize-start" : resizeHandle?.dataset.incomePlanningResize === "end" ? "resize-end" : "move",
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    originalDay: slot.day,
    originalStartMinute: range.startMinute,
    originalEndMinute: range.endMinute,
    dayWidth: Math.max(1, days.getBoundingClientRect().width / 7),
    columnHeight: Math.max(1, column.getBoundingClientRect().height),
    element: block,
    moved: false
  };
  block.classList.add("dragging");
  block.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function startIncomePlanningStampCalendarDrag(event: PointerEvent, stampElement: HTMLElement): void {
  const stampId = stampElement.dataset.incomePlanningStampId || "";
  const stamp = state.incomePlanning.calendarStamps.find((item) => item.id === stampId);
  const column = stampElement.closest<HTMLElement>("[data-income-planning-calendar-day]");
  const days = document.querySelector<HTMLElement>("#incomePlanningCalendarDays");
  if (!stampId || !stamp || !column || !days) return;
  incomePlanningStampDragState = {
    stampId,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    originalDay: stamp.day,
    originalStartMinute: parseTimeMinutes(stamp.startTime) ?? 0,
    dayWidth: Math.max(1, days.getBoundingClientRect().width / 7),
    columnHeight: Math.max(1, column.getBoundingClientRect().height),
    element: stampElement,
    moved: false
  };
  stampElement.classList.add("dragging");
  stampElement.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function startIncomePlanningPlannedStampCalendarDrag(event: PointerEvent, stampElement: HTMLElement): void {
  const stampId = stampElement.dataset.incomeStampPlannerStampId || "";
  const stamp = (state.incomePlanning.plannedStamps ?? []).find((item) => item.id === stampId);
  const column = stampElement.closest<HTMLElement>("[data-income-planning-calendar-day]");
  const days = document.querySelector<HTMLElement>("#incomePlanningCalendarDays");
  if (!stampId || !stamp || !incomeStampPlannerDateFromString(stamp.date) || !column || !days) return;
  incomePlanningPlannedStampDragState = {
    stampId,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    originalDate: stamp.date,
    originalStartMinute: parseTimeMinutes(stamp.startTime) ?? 0,
    dayWidth: Math.max(1, days.getBoundingClientRect().width / 7),
    columnHeight: Math.max(1, column.getBoundingClientRect().height),
    element: stampElement,
    moved: false
  };
  stampElement.classList.add("dragging");
  stampElement.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function startIncomeStampPlannerStampDrag(event: PointerEvent, stampElement: HTMLElement): void {
  const stampId = stampElement.dataset.incomeStampPlannerStampId || "";
  const stamp = (state.incomePlanning.plannedStamps ?? []).find((item) => item.id === stampId);
  if (!stampId || !stamp || !incomeStampPlannerDateFromString(stamp.date)) return;
  incomeStampPlannerStampDragState = {
    stampId,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    element: stampElement,
    moved: false
  };
  stampElement.classList.add("dragging");
  stampElement.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function moveIncomePlanningCalendarDrag(event: PointerEvent): void {
  if (incomePlanningPlannedStampDragState && event.pointerId === incomePlanningPlannedStampDragState.pointerId) {
    const next = incomePlanningPlannedStampDragPreview(event);
    incomePlanningPlannedStampDragState.moved =
      incomePlanningPlannedStampDragState.moved ||
      Math.abs(event.clientX - incomePlanningPlannedStampDragState.startClientX) > 3 ||
      Math.abs(event.clientY - incomePlanningPlannedStampDragState.startClientY) > 3;
    const top = (next.startMinute / (24 * 60)) * 100;
    incomePlanningPlannedStampDragState.element.style.setProperty("--top", `${top.toFixed(3)}%`);
    event.preventDefault();
    return;
  }
  if (incomeStampPlannerStampDragState && event.pointerId === incomeStampPlannerStampDragState.pointerId) {
    incomeStampPlannerStampDragState.moved =
      incomeStampPlannerStampDragState.moved ||
      Math.abs(event.clientX - incomeStampPlannerStampDragState.startClientX) > 3 ||
      Math.abs(event.clientY - incomeStampPlannerStampDragState.startClientY) > 3;
    if (incomeStampPlannerStampDragState.moved) {
      const deltaX = event.clientX - incomeStampPlannerStampDragState.startClientX;
      const deltaY = event.clientY - incomeStampPlannerStampDragState.startClientY;
      incomeStampPlannerStampDragState.element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }
    event.preventDefault();
    return;
  }
  if (incomePlanningStampDragState && event.pointerId === incomePlanningStampDragState.pointerId) {
    const next = incomePlanningStampDragPreview(event);
    incomePlanningStampDragState.moved =
      incomePlanningStampDragState.moved ||
      Math.abs(event.clientX - incomePlanningStampDragState.startClientX) > 3 ||
      Math.abs(event.clientY - incomePlanningStampDragState.startClientY) > 3;
    const top = (next.startMinute / (24 * 60)) * 100;
    incomePlanningStampDragState.element.style.setProperty("--top", `${top.toFixed(3)}%`);
    event.preventDefault();
    return;
  }
  if (incomePlanningSleepDragState && event.pointerId === incomePlanningSleepDragState.pointerId) {
    const next = incomePlanningSleepDragPreview(event);
    incomePlanningSleepDragState.moved =
      incomePlanningSleepDragState.moved ||
      Math.abs(event.clientY - incomePlanningSleepDragState.startClientY) > 3;
    applyIncomePlanningSleepDragPreview(next);
    event.preventDefault();
    return;
  }
  if (!incomePlanningDragState || event.pointerId !== incomePlanningDragState.pointerId) return;
  const next = incomePlanningDragPreview(event);
  incomePlanningDragState.moved =
    incomePlanningDragState.moved ||
    Math.abs(event.clientX - incomePlanningDragState.startClientX) > 3 ||
    Math.abs(event.clientY - incomePlanningDragState.startClientY) > 3;
  const top = (next.startMinute / (24 * 60)) * 100;
  const height = ((next.endMinute - next.startMinute) / (24 * 60)) * 100;
  incomePlanningDragState.element.style.setProperty("--top", `${top.toFixed(3)}%`);
  incomePlanningDragState.element.style.setProperty("--height", `${height.toFixed(3)}%`);
  incomePlanningDragState.element.style.setProperty("--start-minute", String(next.startMinute));
  incomePlanningDragState.element.style.setProperty("--duration-minutes", String(next.endMinute - next.startMinute));
  event.preventDefault();
}

function finishIncomePlanningCalendarDrag(event: PointerEvent): void {
  if (incomePlanningPlannedStampDragState && event.pointerId === incomePlanningPlannedStampDragState.pointerId) {
    const dragState = incomePlanningPlannedStampDragState;
    const next = incomePlanningPlannedStampDragPreview(event);
    dragState.element.classList.remove("dragging");
    dragState.element.releasePointerCapture?.(event.pointerId);
    incomePlanningPlannedStampDragState = null;
    if (dragState.moved) {
      updateIncomePlanningPlannedStampAfterCalendarDrag(dragState.stampId, next);
      const savedDate = incomeStampPlannerDateFromString(next.date);
      if (savedDate) {
        incomeStampPlannerMonthCursor = incomeStampPlannerMonthStart(savedDate);
      }
      renderAll();
      saveState(state);
      incomePlanningSuppressNextCalendarClick = true;
    }
    return;
  }
  if (incomeStampPlannerStampDragState && event.pointerId === incomeStampPlannerStampDragState.pointerId) {
    const dragState = incomeStampPlannerStampDragState;
    const nextDate = incomeStampPlannerDateFromPointer(event.clientX, event.clientY);
    dragState.element.classList.remove("dragging");
    dragState.element.style.transform = "";
    dragState.element.releasePointerCapture?.(event.pointerId);
    incomeStampPlannerStampDragState = null;
    if (dragState.moved) {
      if (nextDate) {
        updateIncomeStampPlannerStampAfterPlannerDrag(dragState.stampId, nextDate);
        const savedDate = incomeStampPlannerDateFromString(nextDate);
        if (savedDate) {
          incomeStampPlannerMonthCursor = incomeStampPlannerMonthStart(savedDate);
        }
        renderAll();
        saveState(state);
      }
      incomeStampPlannerSuppressNextClick = true;
    }
    return;
  }
  if (incomePlanningStampDragState && event.pointerId === incomePlanningStampDragState.pointerId) {
    const dragState = incomePlanningStampDragState;
    const next = incomePlanningStampDragPreview(event);
    dragState.element.classList.remove("dragging");
    dragState.element.releasePointerCapture?.(event.pointerId);
    incomePlanningStampDragState = null;
    if (dragState.moved) {
      updateIncomePlanningStampAfterCalendarDrag(dragState.stampId, next);
      renderIncomePlanning();
      saveState(state);
      incomePlanningSuppressNextCalendarClick = true;
    }
    return;
  }
  if (incomePlanningSleepDragState && event.pointerId === incomePlanningSleepDragState.pointerId) {
    const dragState = incomePlanningSleepDragState;
    const next = incomePlanningSleepDragPreview(event);
    dragState.elements.forEach((element) => {
      element.classList.remove("dragging");
      element.releasePointerCapture?.(event.pointerId);
    });
    incomePlanningSleepDragState = null;
    if (dragState.moved) {
      updateIncomePlanningSleepGroupTime(dragState.groupId, next.startMinute, next.endMinute);
      renderIncomePlanning();
      saveState(state);
      incomePlanningSuppressNextCalendarClick = true;
    }
    return;
  }
  if (!incomePlanningDragState || event.pointerId !== incomePlanningDragState.pointerId) return;
  const dragState = incomePlanningDragState;
  const next = incomePlanningDragPreview(event);
  dragState.element.classList.remove("dragging");
  dragState.element.releasePointerCapture?.(event.pointerId);
  incomePlanningDragState = null;
  if (dragState.moved) {
    if (dragState.slotPart === "pause") {
      updateIncomePlanningPauseAfterCalendarDrag(dragState, next);
    } else {
      updateIncomePlanningMainSlotAfterCalendarDrag(dragState, next);
    }
    renderIncomePlanning();
    saveState(state);
    incomePlanningSuppressNextCalendarClick = true;
  }
}

function incomePlanningStampDragPreview(event: PointerEvent): { day: IncomePlanningWeekday; startMinute: number } {
  if (!incomePlanningStampDragState) return { day: "monday", startMinute: 0 };
  const verticalDelta = snapIncomePlanningMinute(
    ((event.clientY - incomePlanningStampDragState.startClientY) / incomePlanningStampDragState.columnHeight) * 24 * 60
  );
  const dayDelta = Math.round(
    (event.clientX - incomePlanningStampDragState.startClientX) / incomePlanningStampDragState.dayWidth
  );
  return {
    day: incomePlanningWeekdayByIndex(incomePlanningWeekdayIndex(incomePlanningStampDragState.originalDay) + dayDelta),
    startMinute: clamp(
      snapIncomePlanningMinute(incomePlanningStampDragState.originalStartMinute + verticalDelta),
      0,
      23 * 60 + 45
    )
  };
}

function incomePlanningPlannedStampDragPreview(event: PointerEvent): { date: string; startMinute: number } {
  if (!incomePlanningPlannedStampDragState) return { date: incomeStampPlannerTodayDateString(), startMinute: 0 };
  const originalDate =
    incomeStampPlannerDateFromString(incomePlanningPlannedStampDragState.originalDate) ??
    incomeStampPlannerStartOfDay(new Date());
  const verticalDelta = snapIncomePlanningMinute(
    ((event.clientY - incomePlanningPlannedStampDragState.startClientY) /
      incomePlanningPlannedStampDragState.columnHeight) *
      24 *
      60
  );
  const dayDelta = Math.round(
    (event.clientX - incomePlanningPlannedStampDragState.startClientX) /
      incomePlanningPlannedStampDragState.dayWidth
  );
  const weekRange = incomeStampPlannerCurrentWeekRange();
  const nextDate = incomeStampPlannerClampDate(
    incomeStampPlannerAddDays(originalDate, dayDelta),
    weekRange.start,
    weekRange.end
  );
  return {
    date: incomeStampPlannerDateString(nextDate),
    startMinute: clamp(
      snapIncomePlanningMinute(incomePlanningPlannedStampDragState.originalStartMinute + verticalDelta),
      0,
      23 * 60 + 45
    )
  };
}

function updateIncomePlanningStampAfterCalendarDrag(
  stampId: string,
  next: { day: IncomePlanningWeekday; startMinute: number }
): void {
  state.incomePlanning = {
    ...state.incomePlanning,
    calendarStamps: state.incomePlanning.calendarStamps.map((stamp) =>
      stamp.id === stampId ? { ...stamp, day: next.day, startTime: formatIncomePlanningTime(next.startMinute) } : stamp
    )
  };
}

function updateIncomePlanningPlannedStampAfterCalendarDrag(
  stampId: string,
  next: { date: string; startMinute: number }
): void {
  state.incomePlanning = {
    ...state.incomePlanning,
    plannedStamps: (state.incomePlanning.plannedStamps ?? []).map((stamp) =>
      stamp.id === stampId ? { ...stamp, date: next.date, startTime: formatIncomePlanningTime(next.startMinute) } : stamp
    )
  };
}

function updateIncomeStampPlannerStampAfterPlannerDrag(stampId: string, date: string): void {
  state.incomePlanning = {
    ...state.incomePlanning,
    plannedStamps: (state.incomePlanning.plannedStamps ?? []).map((stamp) =>
      stamp.id === stampId ? { ...stamp, date } : stamp
    )
  };
}

function incomeStampPlannerDateFromPointer(clientX: number, clientY: number): string | null {
  const target = document.elementFromPoint(clientX, clientY);
  const day = target?.closest<HTMLElement>("[data-income-stamp-planner-date]");
  const date = day?.dataset.incomeStampPlannerDate || "";
  return incomeStampPlannerDateFromString(date) ? date : null;
}

function incomeStampPlannerClampDate(date: Date, min: Date, max: Date): Date {
  if (date.getTime() < min.getTime()) return incomeStampPlannerStartOfDay(min);
  if (date.getTime() > max.getTime()) return incomeStampPlannerStartOfDay(max);
  return incomeStampPlannerStartOfDay(date);
}

function updateIncomePlanningPauseAfterCalendarDrag(
  dragState: NonNullable<IncomePlanningDragState>,
  next: { day: IncomePlanningWeekday; startMinute: number; endMinute: number }
): void {
  updateIncomePlanningOwnerSlots(dragState.ownerType, dragState.ownerId, (slots) =>
    slots.map((slot) => {
      if (slot.id !== dragState.slotId) return slot;
      const clamped = incomePlanningClampedPauseRange(slot, next.startMinute, next.endMinute);
      return normalizeIncomePlanningSlotAfterEdit({
        ...slot,
        pauseEnabled: true,
        pauseStartTime: formatIncomePlanningTime(clamped.startMinute),
        pauseEndTime: formatIncomePlanningTime(clamped.endMinute),
        pauseDurationMinutes: clamped.endMinute - clamped.startMinute
      });
    })
  );
}

function updateIncomePlanningMainSlotAfterCalendarDrag(
  dragState: NonNullable<IncomePlanningDragState>,
  next: { day: IncomePlanningWeekday; startMinute: number; endMinute: number }
): void {
  updateIncomePlanningOwnerSlots(dragState.ownerType, dragState.ownerId, (slots) =>
    slots.map((slot) => {
      if (slot.id !== dragState.slotId) return slot;
      const updated: IncomePlanningSlot = {
        ...slot,
        day: next.day,
        startTime: formatIncomePlanningTime(next.startMinute),
        endTime: formatIncomePlanningTime(next.endMinute),
        durationMinutes: next.endMinute - next.startMinute
      };
      return normalizeIncomePlanningSlotAfterEdit(incomePlanningSlotWithClampedPause(updated, dragState, next));
    })
  );
}

function incomePlanningClampedPauseRange(
  slot: IncomePlanningSlot,
  pauseStartMinute: number,
  pauseEndMinute: number
): { startMinute: number; endMinute: number } {
  const slotStart = parseTimeMinutes(slot.startTime);
  const slotEnd = parseTimeMinutes(slot.endTime);
  if (slotStart === null || slotEnd === null || slotEnd <= slotStart) {
    return { startMinute: pauseStartMinute, endMinute: pauseEndMinute };
  }
  const duration = Math.min(Math.max(15, pauseEndMinute - pauseStartMinute), slotEnd - slotStart);
  const startMinute = clamp(pauseStartMinute, slotStart, Math.max(slotStart, slotEnd - duration));
  return { startMinute, endMinute: startMinute + duration };
}

function incomePlanningSlotWithClampedPause(
  slot: IncomePlanningSlot,
  dragState: NonNullable<IncomePlanningDragState>,
  next: { startMinute: number; endMinute: number }
): IncomePlanningSlot {
  if (!slot.pauseEnabled || !slot.pauseStartTime || !slot.pauseEndTime) return slot;
  const pauseStart = parseTimeMinutes(slot.pauseStartTime);
  const pauseEnd = parseTimeMinutes(slot.pauseEndTime);
  if (pauseStart === null || pauseEnd === null || pauseEnd <= pauseStart) return slot;
  const pauseDuration = Math.min(pauseEnd - pauseStart, Math.max(0, next.endMinute - next.startMinute));
  const shiftedPauseStart = dragState.mode === "move" ? pauseStart + (next.startMinute - dragState.originalStartMinute) : pauseStart;
  const clampedPauseStart = clamp(
    snapIncomePlanningMinute(shiftedPauseStart),
    next.startMinute,
    Math.max(next.startMinute, next.endMinute - pauseDuration)
  );
  return {
    ...slot,
    pauseStartTime: formatIncomePlanningTime(clampedPauseStart),
    pauseEndTime: formatIncomePlanningTime(clampedPauseStart + pauseDuration),
    pauseDurationMinutes: pauseDuration
  };
}

function incomePlanningDragPreview(event: PointerEvent): {
  day: IncomePlanningWeekday;
  startMinute: number;
  endMinute: number;
} {
  if (!incomePlanningDragState) {
    return { day: "monday", startMinute: 0, endMinute: 15 };
  }
  const verticalDelta = snapIncomePlanningMinute(
    ((event.clientY - incomePlanningDragState.startClientY) / incomePlanningDragState.columnHeight) * 24 * 60
  );
  const dayDelta = Math.round((event.clientX - incomePlanningDragState.startClientX) / incomePlanningDragState.dayWidth);
  const duration = incomePlanningDragState.originalEndMinute - incomePlanningDragState.originalStartMinute;
  if (incomePlanningDragState.mode === "resize-start") {
    const startMinute = clamp(
      snapIncomePlanningMinute(incomePlanningDragState.originalStartMinute + verticalDelta),
      0,
      incomePlanningDragState.originalEndMinute - 15
    );
    return { day: incomePlanningDragState.originalDay, startMinute, endMinute: incomePlanningDragState.originalEndMinute };
  }
  if (incomePlanningDragState.mode === "resize-end") {
    const maxEndMinute = 23 * 60 + 45;
    const endMinute = clamp(
      snapIncomePlanningMinute(incomePlanningDragState.originalEndMinute + verticalDelta),
      incomePlanningDragState.originalStartMinute + 15,
      maxEndMinute
    );
    return { day: incomePlanningDragState.originalDay, startMinute: incomePlanningDragState.originalStartMinute, endMinute };
  }
  const maxEndMinute = 23 * 60 + 45;
  const startMinute = clamp(
    snapIncomePlanningMinute(incomePlanningDragState.originalStartMinute + verticalDelta),
    0,
    Math.max(0, maxEndMinute - duration)
  );
  const day = incomePlanningWeekdayByIndex(incomePlanningWeekdayIndex(incomePlanningDragState.originalDay) + dayDelta);
  return { day, startMinute, endMinute: startMinute + duration };
}

function startIncomePlanningSleepCalendarDrag(event: PointerEvent, block: HTMLElement): void {
  const groupId = block.dataset.incomePlanningSleepGroupId || "";
  const group = incomePlanningSleepSlotGroupsFromSlots(state.incomePlanning.assumptions.sleepSlots).find((item) => item.id === groupId);
  const column = block.closest<HTMLElement>("[data-income-planning-calendar-day]");
  if (!groupId || !group || !column) return;
  const startMinute = parseTimeMinutes(group.startTime);
  const endMinute = parseTimeMinutes(group.endTime);
  if (startMinute === null || endMinute === null) return;
  const durationMinutes = incomePlanningSleepClockDurationMinutes(startMinute, endMinute, group.durationMinutes);
  const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-income-planning-sleep-group-id]")).filter(
    (element) => element.dataset.incomePlanningSleepGroupId === groupId
  );
  incomePlanningSleepDragState = {
    groupId,
    group,
    pointerId: event.pointerId,
    startClientY: event.clientY,
    originalStartMinute: startMinute,
    durationMinutes,
    overnight: endMinute <= startMinute,
    columnHeight: Math.max(1, column.getBoundingClientRect().height),
    elements,
    moved: false
  };
  elements.forEach((element) => element.classList.add("dragging"));
  block.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function incomePlanningSleepDragPreview(event: PointerEvent): { startMinute: number; endMinute: number } {
  if (!incomePlanningSleepDragState) return { startMinute: 21 * 60, endMinute: 5 * 60 + 30 };
  const verticalDelta = snapIncomePlanningMinute(
    ((event.clientY - incomePlanningSleepDragState.startClientY) / incomePlanningSleepDragState.columnHeight) * 24 * 60
  );
  const duration = clamp(incomePlanningSleepDragState.durationMinutes, 15, 23 * 60 + 45);
  const minStart = incomePlanningSleepDragState.overnight ? Math.max(0, 24 * 60 - duration + 15) : 0;
  const maxStart = incomePlanningSleepDragState.overnight ? 23 * 60 + 45 : Math.max(0, 24 * 60 - duration);
  const startMinute = clamp(
    snapIncomePlanningMinute(incomePlanningSleepDragState.originalStartMinute + verticalDelta),
    minStart,
    maxStart
  );
  return {
    startMinute,
    endMinute: (startMinute + duration) % (24 * 60)
  };
}

function applyIncomePlanningSleepDragPreview(next: { startMinute: number; endMinute: number }): void {
  if (!incomePlanningSleepDragState) return;
  const previewGroup = normalizeIncomePlanningDialogSleepSlotGroup({
    ...incomePlanningSleepDragState.group,
    startTime: formatIncomePlanningTime(next.startMinute),
    endTime: formatIncomePlanningTime(next.endMinute)
  });
  const entries = new Map(incomePlanningSleepBackgroundEntries(previewGroup).map((entry) => [entry.id, entry]));
  incomePlanningSleepDragState.elements.forEach((element) => {
    const entry = entries.get(element.dataset.incomePlanningBackgroundEntryId || "");
    if (!entry) return;
    const start = clamp(entry.startMinute, 0, 24 * 60);
    const end = clamp(entry.endMinute, start + 15, 24 * 60);
    const top = (start / (24 * 60)) * 100;
    const height = ((end - start) / (24 * 60)) * 100;
    element.style.setProperty("--top", `${top.toFixed(3)}%`);
    element.style.setProperty("--height", `${height.toFixed(3)}%`);
  });
}

function updateIncomePlanningSleepGroupTime(groupId: string, startMinute: number, endMinute: number): void {
  const groups = incomePlanningSleepSlotGroupsFromSlots(state.incomePlanning.assumptions.sleepSlots).map((group) =>
    group.id === groupId
      ? normalizeIncomePlanningDialogSleepSlotGroup({
          ...group,
          startTime: formatIncomePlanningTime(startMinute),
          endTime: formatIncomePlanningTime(endMinute)
        })
      : group
  );
  const sleepSlots = incomePlanningSleepSlotsFromDialogGroups(groups);
  state.incomePlanning = {
    ...state.incomePlanning,
    assumptions: {
      ...state.incomePlanning.assumptions,
      sleepHoursPerDay: clamp(incomePlanningAverageSleepHours({ sleepHoursPerDay: state.incomePlanning.assumptions.sleepHoursPerDay, sleepSlots }), 0, 24),
      sleepSlots
    }
  };
}

function incomePlanningSleepClockDurationMinutes(startMinute: number, endMinute: number, fallbackDurationMinutes: number): number {
  if (endMinute > startMinute) return endMinute - startMinute;
  if (endMinute < startMinute) return 24 * 60 - startMinute + endMinute;
  return clamp(Math.round(fallbackDurationMinutes), 15, 23 * 60 + 45);
}

function incomePlanningSlotById(
  ownerType: Exclude<IncomePlanningOwnerType, "assumption">,
  ownerId: string,
  slotId: string
): IncomePlanningSlot | null {
  const owner =
    ownerType === "work"
      ? state.incomePlanning.workBlocks.find((block) => block.id === ownerId)
      : ownerType === "habit"
        ? state.incomePlanning.habits.find((habit) => habit.id === ownerId)
        : state.incomePlanning.manualBlocks.find((block) => block.id === ownerId);
  return owner?.slots.find((slot) => slot.id === slotId) ?? null;
}

function isIncomePlanningCategory(value: unknown): value is IncomePlanningCategory {
  return INCOME_PLANNING_CATEGORY_CONFIGS.some((config) => config.id === value);
}

function isIncomePlanningWeekday(value: unknown): value is IncomePlanningWeekday {
  return INCOME_PLANNING_WEEK_DAYS.includes(value as IncomePlanningWeekday);
}

function isIncomePlanningHabitType(value: unknown): value is IncomePlanningHabit["type"] {
  return value === "good" || value === "bad";
}

function isIncomePlanningHabitDurationUnit(value: unknown): value is IncomePlanningHabit["durationUnit"] {
  return value === "day" || value === "week";
}

function isIncomePlanningHabitChange(value: unknown): value is IncomePlanningHabit["goalChange"] {
  return value === "keep" || value === "reduce" || value === "replace" || value === "build";
}

function isIncomePlanningHabitStatus(value: unknown): value is IncomePlanningHabit["status"] {
  return value === "planned" || value === "active" || value === "difficult" || value === "stable";
}

function isIncomePlanningPriority(value: unknown): value is IncomePlanningHabit["priority"] {
  return value === "low" || value === "medium" || value === "high";
}

function isIncomePlanningManualBlockType(value: unknown): value is IncomePlanningManualBlockType {
  return value === "private_commitment" || value === "free_time" || value === "buffer" || value === "other_event";
}

function incomeTrackerModel(): IncomeTrackerModel {
  return buildIncomeTrackerModel(state.incomeTracker, {
    annualInflationRatePercent: incomeGeneralInflationRatePercent()
  });
}

function incomeChartModel(): IncomeTrackerModel {
  return buildIncomeChartModel(state.incomeTracker, {
    annualInflationRatePercent: incomeGeneralInflationRatePercent()
  });
}

function incomeGeneralInflationRatePercent(): number {
  return depotInvestmentSettings(activeInvestmentDepot()).inflationRatePercent;
}

function incomeTaxRuleForEntry(
  entry: IncomeYearEntry,
  entries: IncomeYearEntry[] = state.incomeTracker.yearlyEntries
): IncomeTaxRuleResult {
  const annualAmount = incomeYearEntryRuleAmount(entry);
  return evaluateIncomeTaxAndContributionRules({
    label: incomeYearLabel(entry.label),
    annualAmount,
    monthlyAmount: annualAmount / 12,
    year: entry.year,
    aggregatedSideIncome: incomeAggregatedSideIncome(entry, entries),
    employmentContext: entry.employmentContext,
    minijobType: entry.minijobType,
    considerPensionInsurance: entry.considerPensionInsurance,
    isRvExempt: entry.isRvExempt,
    shortTermEmploymentDays: entry.shortTermEmploymentDays,
    shortTermEmploymentMonths: entry.shortTermEmploymentMonths,
    studentEmploymentMode: entry.studentEmploymentMode,
    requiresManualTaxReview: entry.requiresManualTaxReview
  });
}

function incomeYearEntryRuleAmount(entry: IncomeYearEntry): number {
  return Math.max(0, numberValue(entry.annualGrossIncome ?? entry.annualNetIncome));
}

function incomeAggregatedSideIncome(entry: IncomeYearEntry, entries: IncomeYearEntry[]): number {
  return entries
    .filter((item) => item.year === entry.year && (item.active || item.id === entry.id))
    .filter((item) => SIDE_INCOME_TAX_RULE_LABELS.has(incomeYearLabel(item.label)))
    .reduce((sum, item) => sum + incomeYearEntryRuleAmount(item), 0);
}

function incomeTaxCategoryEnabled(rule: IncomeTaxRuleResult, category: IncomeTaxDeductionCategory): boolean {
  return category === "taxes" ? rule.taxFieldsEnabled : rule.contributionFieldsEnabled;
}

function incomeTaxDialogCanOpen(entry: IncomeYearEntry, rule = incomeTaxRuleForEntry(entry)): boolean {
  return rule.status !== "locked" || incomeYearLabel(entry.label) === "minijob";
}

function incomeTaxDeductionRowEnabled(
  entry: IncomeYearEntry,
  rule: IncomeTaxRuleResult,
  row: (typeof INCOME_TAX_DEDUCTION_ROWS)[number]
): boolean {
  const capitalRow = incomeTaxDeductionRowIsCapital(row);
  if (isCapitalGainsTaxRuleLabel(incomeYearLabel(entry.label))) return capitalRow;
  if (capitalRow) return false;
  if (!incomeTaxCategoryEnabled(rule, row.category)) return false;
  const minijobRvOnly =
    !rule.taxFieldsEnabled &&
    rule.contributionFieldsEnabled &&
    Boolean(entry.considerPensionInsurance) &&
    !entry.isRvExempt &&
    (incomeYearLabel(entry.label) === "minijob" ||
      (incomeYearLabel(entry.label) === "student_newspaper_delivery" &&
        (entry.studentEmploymentMode ?? "minijob") === "minijob"));
  if (!minijobRvOnly) return true;
  return row.field === "pensionInsurance";
}

function incomeTaxDeductionRowIsCapital(row: (typeof INCOME_TAX_DEDUCTION_ROWS)[number]): boolean {
  return Boolean(row.capitalOnly);
}

function incomeCapitalGainsAllowanceUsedBefore(entry: IncomeYearEntry, entries: IncomeYearEntry[] = state.incomeTracker.yearlyEntries): number {
  let used = 0;
  for (const item of entries) {
    if (item.id === entry.id) break;
    if (!item.active || item.year !== entry.year || !isCapitalGainsTaxRuleLabel(incomeYearLabel(item.label))) continue;
    used += numberValue(item.capitalGainsAllowance);
  }
  return clamp(roundCurrency(used), 0, CAPITAL_GAINS_ALLOWANCE_LIMIT);
}

function incomeCapitalGainsAllowanceRemainingBefore(entry: IncomeYearEntry, entries: IncomeYearEntry[] = state.incomeTracker.yearlyEntries): number {
  return roundCurrency(CAPITAL_GAINS_ALLOWANCE_LIMIT - incomeCapitalGainsAllowanceUsedBefore(entry, entries));
}

function sanitizeIncomeYearEntriesWithTaxRules(entries: IncomeYearEntry[]): IncomeYearEntry[] {
  const capitalSanitizedEntries = applyCapitalGainsTaxToEntries(entries);
  return capitalSanitizedEntries.map((entry) => sanitizeIncomeYearEntryWithTaxRules(entry, capitalSanitizedEntries));
}

function sanitizeIncomeYearEntryWithTaxRules(
  entry: IncomeYearEntry,
  entries: IncomeYearEntry[]
): IncomeYearEntry {
  if (isCapitalGainsTaxRuleLabel(incomeYearLabel(entry.label))) {
    return entry;
  }

  const rule = incomeTaxRuleForEntry(entry, entries);
  const grossLocked = rule.status === "locked";
  if (rule.taxFieldsEnabled && rule.contributionFieldsEnabled && !grossLocked) return entry;
  const taxDeductionItems = { ...entry.taxDeductionItems };
  for (const row of INCOME_TAX_DEDUCTION_ROWS) {
    if (!incomeTaxDeductionRowEnabled(entry, rule, row)) {
      taxDeductionItems[row.field] = null;
    }
  }
  return {
    ...entry,
    annualGrossIncome: grossLocked ? null : entry.annualGrossIncome,
    taxDeductionItems,
    taxAdjustment: rule.taxFieldsEnabled ? entry.taxAdjustment : emptyIncomeTaxAdjustment(),
    taxesAndDeductions: incomeTaxDeductionItemsTotal(taxDeductionItems)
  };
}

function capitalGainsChurchTaxRate(value: number | null | undefined): number {
  return value === 8 ? 8 : DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT;
}

function roundCurrency(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function renderIncomeLiveUpdate(collection?: string, id?: string, field?: string): void {
  const model = incomeTrackerModel();
  if (collection === "yearlyEntries" && id) {
    renderIncomeYearlyNetCell(id, field);
    renderIncomeYearlyGrossCell(id);
    renderIncomeYearlyTaxButton(id);
    if (incomeTaxDialogEntryId === id && incomeTaxRuleStructuralField(field)) {
      renderIncomeTaxDialog();
    } else {
      renderIncomeTaxDialogTotals(id);
    }
  }
  renderIncomeMetricGrid(model);
  renderIncomeInsights(model);
  renderIncomeYearStatusRows(model);
  renderIncomeCharts(model);
  renderIncomeAnalysisDialog(model);
}

function incomeTaxRuleStructuralField(field: string | undefined): boolean {
  if (!field) return false;
  return (
    field === "year" ||
    field === "active" ||
    field === "label" ||
    field === "annualGrossIncome" ||
    field === "annualNetIncome" ||
    field === "employmentContext" ||
    field === "minijobType" ||
    field === "considerPensionInsurance" ||
    field === "isRvExempt" ||
    field === "shortTermEmploymentDays" ||
    field === "shortTermEmploymentMonths" ||
    field === "studentEmploymentMode" ||
    field === "requiresManualTaxReview" ||
    field === "capitalGainsChurchTaxEnabled" ||
    field === "capitalGainsChurchTaxRatePercent"
  );
}

function renderIncomeYearlyNetCell(id: string, changedField?: string): void {
  const entry = state.incomeTracker.yearlyEntries.find((item) => item.id === id);
  const input = document.querySelector<HTMLInputElement>(`[data-income-year-net="${cssEscape(id)}"]`);
  if (!entry || !input) return;
  const calculatedNet = incomeYearEntryCalculatedNetIncome(entry);
  const netValue = incomeYearEntryNetIncome(entry);
  input.disabled = calculatedNet !== null;
  if (changedField === "annualNetIncome" && calculatedNet === null && document.activeElement === input) return;
  input.value = netValue === null ? "" : String(netValue);
}

function renderIncomeYearlyGrossCell(id: string): void {
  const entry = state.incomeTracker.yearlyEntries.find((item) => item.id === id);
  const input = document.querySelector<HTMLInputElement>(`[data-income-year-gross="${cssEscape(id)}"]`);
  if (!entry || !input) return;
  const rule = incomeTaxRuleForEntry(entry);
  const locked = rule.status === "locked";
  const title = locked ? incomeTaxRuleTooltipText(rule) : "";
  const cell = input.closest<HTMLTableCellElement>("[data-income-year-gross-cell]");
  input.disabled = locked;
  input.title = title;
  input.value = locked || entry.annualGrossIncome === null ? "" : String(entry.annualGrossIncome);
  if (cell) cell.title = title;
}

function renderIncomeYearlyTaxButton(id: string): void {
  const entry = state.incomeTracker.yearlyEntries.find((item) => item.id === id);
  const value = document.querySelector<HTMLElement>(`[data-income-year-tax-total="${cssEscape(id)}"]`);
  if (!entry || !value) return;
  const taxDeductions = incomeYearEntryTaxDeductions(entry);
  const rule = incomeTaxRuleForEntry(entry);
  const locked = rule.status === "locked";
  const canOpen = incomeTaxDialogCanOpen(entry, rule);
  const button = value.closest<HTMLButtonElement>(".income-tax-button");
  const cell = value.closest<HTMLTableCellElement>("[data-income-year-tax-cell]");
  const label = button?.querySelector("span");
  const title = locked ? incomeTaxButtonTooltipText(entry, rule) : "";
  value.textContent = locked && canOpen ? "Optionen" : locked ? "Gesperrt" : taxDeductions === null ? "Eintragen" : money(taxDeductions);
  if (cell) cell.title = title;
  if (button) {
    button.disabled = !canOpen;
    button.title = title;
    button.dataset.action = canOpen ? `income-open-tax-dialog-${entry.id}` : "";
    button.classList.toggle("locked", locked);
    button.classList.toggle("partial", rule.status === "partially_enabled");
  }
  if (label) {
    label.textContent = locked && canOpen ? "RV moeglich" : locked ? "Nicht moeglich" : rule.status === "partially_enabled" ? "Teilweise" : "Details";
  }
}

function renderIncomeTaxDialogTotals(id: string): void {
  if (incomeTaxDialogEntryId !== id) return;
  const entry = state.incomeTracker.yearlyEntries.find((item) => item.id === id);
  if (!entry) return;
  const taxTotal = incomeTaxDeductionCategoryTotal(entry, "taxes");
  const socialTotal = incomeTaxDeductionCategoryTotal(entry, "social");
  const employerSocialTotal = incomeTaxDeductionCategoryTotal(entry, "employer_social");
  const total = incomeYearEntryTaxDeductions(entry);
  setText("incomeTaxDialogTaxesTotal", money(taxTotal));
  setText("incomeTaxDialogSocialTotal", money(socialTotal));
  setText("incomeTaxDialogEmployerSocialTotal", money(employerSocialTotal));
  setText("incomeTaxDialogGrandTotal", total === null ? "-" : money(total));
}

function renderIncomeTabs(): void {
  const activeTab = state.incomeTracker.settings.activeInputTab;
  for (const tab of ["yearly", "milestones", "settings"] as const) {
    const button = document.querySelector<HTMLButtonElement>(`[data-action="income-tab-${tab}"]`);
    if (button) {
      button.classList.toggle("active", tab === activeTab);
      button.setAttribute("aria-pressed", String(tab === activeTab));
    }
  }
  setSectionHidden("#incomeYearlyTab", activeTab !== "yearly");
  setSectionHidden("#incomeMilestonesTab", activeTab !== "milestones");
  setSectionHidden("#incomeSettingsTab", activeTab !== "settings");
}

function renderIncomeRows(): void {
  renderIncomeYearlyRows();
  renderIncomeMilestoneRows();
}

function renderIncomeYearLabelFilters(): void {
  const host = document.querySelector<HTMLDivElement>("#incomeYearLabelFilters");
  if (!host) return;
  const selected = new Set(state.incomeTracker.settings.selectedYearlyLabels.map(incomeYearLabel));
  const options = INCOME_YEAR_LABEL_OPTIONS;
  host.innerHTML = `
    ${options
      .map((option) => {
        const active = selected.has(option.id);
        return `
          <button
            class="position-label-filter-button${active ? " active" : ""}"
            type="button"
            data-action="toggle-income-year-label-filter"
            data-income-label="${escapeHtml(option.id)}"
            aria-pressed="${active}"
            aria-label="Label ${escapeHtml(option.label)} ${active ? "deaktivieren" : "aktivieren"}"
            title="${escapeHtml(option.label)}"
          >
            ${positionIconSvg(option.icon)}
          </button>
        `;
      })
      .join("")}
  `;
}

function renderIncomeYearlyRows(): void {
  const body = document.querySelector<HTMLTableSectionElement>("#incomeYearlyRows");
  if (!body) return;
  if (!state.incomeTracker.yearlyEntries.length) {
    body.innerHTML = `<tr><td class="position-empty" colspan="8">Noch keine Jahreswerte eingetragen.</td></tr>`;
    return;
  }
  const rows = incomeFilteredYearEntries();
  if (!rows.length) {
    body.innerHTML = `<tr><td class="position-empty" colspan="8">Keine Jahreswerte fuer diese Labelauswahl.</td></tr>`;
    return;
  }
  body.innerHTML = rows
    .map((entry) => {
      const calculatedNet = incomeYearEntryCalculatedNetIncome(entry);
      const rule = incomeTaxRuleForEntry(entry);
      const grossLocked = rule.status === "locked";
      const lockedTooltip = grossLocked ? incomeTaxRuleTooltipText(rule) : "";
      const netIncome = incomeYearEntryNetIncome(entry);
      return `
      <tr>
        <td class="check-cell income-year-flag-cell">${incomeCheckboxInput(
          "yearlyEntries",
          entry.id,
          "active",
          entry.active,
          "Jahreswert aktiv"
        )}</td>
        <td class="check-cell income-year-flag-cell">${incomeCheckboxInput(
          "yearlyEntries",
          entry.id,
          "visible",
          entry.visible,
          "Jahreswert in Grafiken sichtbar"
        )}</td>
        <td class="income-year-label-cell">${incomeYearLabelButton(entry)}</td>
        <td>${incomeNumberInput("yearlyEntries", entry.id, "year", entry.year, { min: 1900, max: 2200, step: 1 })}</td>
        <td>${incomeNumberInput("yearlyEntries", entry.id, "annualNetIncome", netIncome, {
          min: 0,
          disabled: calculatedNet !== null,
          extraAttribute: `data-income-year-net="${escapeHtml(entry.id)}"`
        })}</td>
        <td data-income-year-gross-cell="${escapeHtml(entry.id)}" title="${escapeHtml(lockedTooltip)}">${incomeNumberInput("yearlyEntries", entry.id, "annualGrossIncome", grossLocked ? null : entry.annualGrossIncome, {
          min: 0,
          disabled: grossLocked,
          title: lockedTooltip,
          extraAttribute: `data-income-year-gross="${escapeHtml(entry.id)}"`
        })}</td>
        <td data-income-year-tax-cell="${escapeHtml(entry.id)}" title="${escapeHtml(lockedTooltip)}">${incomeTaxDeductionsButton(entry, rule)}</td>
        <td><button class="icon-button danger" type="button" data-action="income-remove-yearly-${entry.id}" aria-label="Jahreswert entfernen">x</button></td>
      </tr>
    `;
    })
    .join("");
}

function renderIncomeTaxDialog(): void {
  const root = document.querySelector<HTMLDivElement>("#incomeTaxDialogRoot");
  if (!root) return;
  const entry = state.incomeTracker.yearlyEntries.find((item) => item.id === incomeTaxDialogEntryId);
  if (!entry) {
    root.innerHTML = "";
    incomeTaxDialogEntryId = null;
    return;
  }

  const taxTotal = incomeTaxDeductionCategoryTotal(entry, "taxes");
  const socialTotal = incomeTaxDeductionCategoryTotal(entry, "social");
  const employerSocialTotal = incomeTaxDeductionCategoryTotal(entry, "employer_social");
  const total = incomeYearEntryTaxDeductions(entry);
  const rule = incomeTaxRuleForEntry(entry);
  const capitalMode = isCapitalGainsTaxRuleLabel(incomeYearLabel(entry.label));
  root.innerHTML = `
    <div class="income-tax-dialog-backdrop" role="presentation">
      <div class="income-tax-dialog" role="dialog" aria-modal="true" aria-label="Steuer- und Abgabenpositionen">
        <div class="income-tax-dialog-head">
          <div>
            <strong>Steuer- und Abgabenpositionen</strong>
            <span>${escapeHtml(String(entry.year))} · ${escapeHtml(incomeYearLabelMeta(entry.label).label)}</span>
          </div>
          <button class="chart-popup-close" type="button" data-action="income-close-tax-dialog" aria-label="Dialog schliessen">x</button>
        </div>
        ${incomeTaxRulePanel(entry, rule)}
        ${incomeTaxRuleContextControls(entry)}
        ${
          capitalMode
            ? incomeCapitalGainsTaxSection(entry)
            : `<div class="table-wrap">
          <table class="income-table income-tax-table">
            <thead>
              <tr>
                <th>Nr.</th>
                <th>Text</th>
                <th>Betrag</th>
              </tr>
            </thead>
            <tbody>
              ${INCOME_TAX_DEDUCTION_ROWS.filter((row) => !incomeTaxDeductionRowIsCapital(row)).map(
                (row) => {
                  const enabled = incomeTaxDeductionRowEnabled(entry, rule, row);
                  const lockedReason = enabled ? "" : incomeTaxLockedRowReason(entry, row, rule);
                  return `
                  <tr class="${enabled ? "" : "income-tax-row-locked"}" title="${escapeHtml(lockedReason)}">
                    <td class="numeric-cell">${escapeHtml(row.nr)}</td>
                    <td>
                      ${escapeHtml(row.label)}
                      ${enabled ? "" : `<small>${escapeHtml(lockedReason)}</small>`}
                    </td>
                    <td>${incomeNumberInput("yearlyEntries", entry.id, `taxDeductionItems.${row.field}`, entry.taxDeductionItems[row.field], {
                      min: 0,
                      disabled: !enabled,
                      title: lockedReason
                    })}</td>
                  </tr>
                `;
                }
              ).join("")}
            </tbody>
          </table>
        </div>`
        }
        <div class="income-tax-summary">
          <div>
            <span>Kategorie</span>
            <strong>Summe</strong>
          </div>
          <div>
            <span>Steuern</span>
            <strong id="incomeTaxDialogTaxesTotal">${money(taxTotal)}</strong>
          </div>
          ${
            capitalMode
              ? ""
              : `<div>
            <span>Sozialversicherung Arbeitnehmer</span>
            <strong id="incomeTaxDialogSocialTotal">${money(socialTotal)}</strong>
          </div>
          <div>
            <span>Sozialversicherung Arbeitgeber</span>
            <strong id="incomeTaxDialogEmployerSocialTotal">${money(employerSocialTotal)}</strong>
          </div>`
          }
          <div class="total">
            <span>Gesamt ohne Arbeitgeber</span>
            <strong id="incomeTaxDialogGrandTotal">${total === null ? "-" : money(total)}</strong>
          </div>
        </div>
        ${
          capitalMode
            ? ""
            : `<div class="income-tax-adjustment ${rule.taxFieldsEnabled ? "" : "locked"}">
          <div>
            <strong>Steuernachzahlung oder Rueckerstattung</strong>
            <span>${escapeHtml(
              rule.taxFieldsEnabled
                ? "Dieser Wert wird in der Weltgrafik bei Abgabenmix, Steuern und Einkommen beruecksichtigt."
                : incomeTaxLockedCategoryReason("taxes", rule)
            )}</span>
          </div>
          <div class="income-tax-adjustment-options" role="radiogroup" aria-label="Art der Steuerkorrektur">
            ${INCOME_TAX_ADJUSTMENT_OPTIONS.map(
              (option) => `
                <label>
                  <input
                    type="radio"
                    name="income-tax-adjustment-${escapeHtml(entry.id)}"
                    value="${escapeHtml(option.value)}"
                    ${entry.taxAdjustment.type === option.value ? "checked" : ""}
                    data-income-collection="yearlyEntries"
                    data-income-id="${escapeHtml(entry.id)}"
                    data-income-field="taxAdjustment.type"
                    ${rule.taxFieldsEnabled ? "" : "disabled"}
                  />
                  <span>${escapeHtml(option.label)}</span>
                </label>
              `
            ).join("")}
          </div>
          <div class="income-tax-adjustment-amount">
            <span>Betrag</span>
            ${incomeNumberInput("yearlyEntries", entry.id, "taxAdjustment.amount", entry.taxAdjustment.amount, {
              min: 0,
              disabled: !rule.taxFieldsEnabled
            })}
          </div>
        </div>`
        }
        <div class="button-row">
          <button class="button" type="button" data-action="income-close-tax-dialog">Fertig</button>
        </div>
      </div>
    </div>
  `;
}

function incomeCapitalGainsTaxSection(entry: IncomeYearEntry): string {
  const breakdown = capitalGainsTaxBreakdown(entry);
  const remainingBefore = incomeCapitalGainsAllowanceRemainingBefore(entry);
  const enteredAllowance = numberValue(entry.capitalGainsAllowance);
  const remainingAfter = Math.max(0, remainingBefore - (entry.active ? enteredAllowance : 0));
  const allowanceMax = entry.active ? Math.max(0, remainingBefore) : CAPITAL_GAINS_ALLOWANCE_LIMIT;
  const allowanceLocked = entry.active && allowanceMax <= 0 && enteredAllowance <= 0;
  const allowanceTitle = allowanceLocked
    ? "Der Sparer-Pauschbetrag ist fuer dieses Jahr bereits durch vorherige Kapitalpositionen verbraucht."
    : `Maximal verfuegbar fuer diesen Eintrag: ${money(allowanceMax)}.`;
  return `
    <section class="income-capital-tax-panel">
      <div class="income-capital-tax-head">
        <div>
          <strong>Kapitalertragsteuer</strong>
          <span>Sparer-Pauschbetrag wird pro Jahr bis ${money(CAPITAL_GAINS_ALLOWANCE_LIMIT)} in Eintragsreihenfolge verbraucht.</span>
        </div>
        <strong>${money(breakdown.totalTax)}</strong>
      </div>
      <div class="income-capital-tax-controls">
        <label>
          <span>Geltend gemachter Freibetrag</span>
          ${incomeNumberInput("yearlyEntries", entry.id, "capitalGainsAllowance", entry.capitalGainsAllowance, {
            min: 0,
            max: allowanceMax,
            disabled: allowanceLocked,
            title: allowanceTitle
          })}
          <small>${escapeHtml(allowanceTitle)}</small>
        </label>
        ${incomeInlineCheckbox(entry, "capitalGainsChurchTaxEnabled", Boolean(entry.capitalGainsChurchTaxEnabled), "Kirchensteuerpflichtig")}
        <label>
          <span>Kirchensteuersatz</span>
          ${incomeSelect(
            "yearlyEntries",
            entry.id,
            "capitalGainsChurchTaxRatePercent",
            CAPITAL_GAINS_CHURCH_TAX_RATE_OPTIONS,
            capitalGainsChurchTaxRate(entry.capitalGainsChurchTaxRatePercent)
          )}
        </label>
      </div>
      <div class="income-capital-tax-grid">
        ${incomeCapitalTaxMetric("Kapitalertrag", money(breakdown.capitalIncome))}
        ${incomeCapitalTaxMetric("Verbrauch vor diesem Eintrag", money(CAPITAL_GAINS_ALLOWANCE_LIMIT - remainingBefore))}
        ${incomeCapitalTaxMetric("Verbleibend nach diesem Eintrag", money(remainingAfter))}
        ${incomeCapitalTaxMetric("Steuerpflichtiger Betrag", money(breakdown.taxableAmount))}
        ${incomeCapitalTaxMetric("Kapitalertragsteuer", money(breakdown.capitalGainsTax))}
        ${incomeCapitalTaxMetric("Solidaritaetszuschlag", money(breakdown.solidaritySurcharge))}
        ${incomeCapitalTaxMetric("Kirchensteuer", money(breakdown.churchTax))}
        ${incomeCapitalTaxMetric("Gesamtsteuer", money(breakdown.totalTax))}
      </div>
    </section>
  `;
}

function incomeCapitalTaxMetric(label: string, value: string): string {
  return `
    <div class="income-capital-tax-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function incomeTaxRulePanel(entry: IncomeYearEntry, rule: IncomeTaxRuleResult): string {
  const config = taxRuleConfigForYear(entry.year);
  const label = incomeYearLabel(entry.label);
  const warning = rule.warningKey ? incomeTaxRuleWarningText(rule.warningKey) : "";
  const badgeText =
    rule.status === "enabled"
      ? "Manuelle Steuer-/Abgabenposition moeglich"
      : rule.status === "partially_enabled"
        ? "Teilweise freigegeben"
        : "Gesperrt";
  return `
    <section class="income-tax-rule-panel ${escapeHtml(rule.status)}">
      <div class="income-tax-rule-main">
        <span class="income-tax-rule-badge">${escapeHtml(badgeText)}</span>
        <strong>${escapeHtml(incomeTaxRuleReasonText(rule.reasonKey))}</strong>
        ${warning ? `<p>${escapeHtml(warning)}</p>` : ""}
      </div>
      <div class="income-tax-rule-facts">
        <span>Steuerlich relevant: <strong>${money(rule.taxableAmount)}</strong></span>
        <span>Beitragsrelevant: <strong>${money(rule.contributionRelevantAmount)}</strong></span>
        ${rule.estimatedEmployeePensionContribution !== undefined ? `<span>Geschaetzter RV-Eigenanteil: <strong>${money(rule.estimatedEmployeePensionContribution)}</strong></span>` : ""}
        ${label === "minijob" || label === "student_newspaper_delivery" ? `<span>Minijob-Grenze ${entry.year}: <strong>${money(config.minijobMonthlyLimit)} / Monat</strong></span>` : ""}
        ${label === "volunteer_allowance" ? `<span>Ehrenamtspauschale ${entry.year}: <strong>${money(config.volunteerAllowance)} / Jahr</strong></span>` : ""}
        ${label === "trainer_allowance" ? `<span>Übungsleiterpauschale ${entry.year}: <strong>${money(config.trainerAllowance)} / Jahr</strong></span>` : ""}
        ${isCapitalGainsTaxRuleLabel(label) ? `<span>Sparer-Pauschbetrag ${entry.year}: <strong>${money(CAPITAL_GAINS_ALLOWANCE_LIMIT)} / Jahr</strong></span>` : ""}
      </div>
    </section>
  `;
}

function incomeTaxRuleContextControls(entry: IncomeYearEntry): string {
  const label = incomeYearLabel(entry.label);
  const controls: string[] = [];

  if (label === "severance_payment") {
    controls.push(`
      <label>
        <span>Abfindungskontext</span>
        ${incomeSelect("yearlyEntries", entry.id, "employmentContext", INCOME_EMPLOYMENT_CONTEXT_OPTIONS, entry.employmentContext ?? "job_loss")}
      </label>
    `);
  }

  if (label === "student_newspaper_delivery") {
    controls.push(`
      <label>
        <span>Beschaeftigungsmodus</span>
        ${incomeSelect(
          "yearlyEntries",
          entry.id,
          "studentEmploymentMode",
          INCOME_STUDENT_EMPLOYMENT_MODE_OPTIONS,
          entry.studentEmploymentMode ?? "minijob"
        )}
      </label>
    `);
  }

  const usesMinijobControls =
    label === "minijob" || (label === "student_newspaper_delivery" && (entry.studentEmploymentMode ?? "minijob") === "minijob");
  if (usesMinijobControls) {
    controls.push(`
      <label>
        <span>Minijob-Art</span>
        ${incomeSelect("yearlyEntries", entry.id, "minijobType", INCOME_MINIJOB_TYPE_OPTIONS, entry.minijobType ?? "commercial")}
      </label>
      ${incomeInlineCheckbox(entry, "considerPensionInsurance", Boolean(entry.considerPensionInsurance), "Rentenversicherungspflicht beruecksichtigen")}
      ${incomeInlineCheckbox(entry, "isRvExempt", Boolean(entry.isRvExempt), "Von Rentenversicherungspflicht befreit")}
    `);
  }

  if (label === "student_newspaper_delivery" && (entry.studentEmploymentMode ?? "minijob") === "short_term") {
    controls.push(`
      <label>
        <span>Arbeitstage im Kalenderjahr</span>
        ${incomeNumberInput("yearlyEntries", entry.id, "shortTermEmploymentDays", entry.shortTermEmploymentDays ?? null, {
          min: 0,
          step: 1
        })}
      </label>
      <label>
        <span>Monate im Kalenderjahr</span>
        ${incomeNumberInput("yearlyEntries", entry.id, "shortTermEmploymentMonths", entry.shortTermEmploymentMonths ?? null, {
          min: 0,
          step: 1
        })}
      </label>
      ${incomeInlineCheckbox(entry, "requiresManualTaxReview", Boolean(entry.requiresManualTaxReview), "Manuelle steuerliche Pruefung erforderlich")}
    `);
  }

  if (!controls.length) return "";
  return `<section class="income-tax-context-controls">${controls.join("")}</section>`;
}

function incomeInlineCheckbox(entry: IncomeYearEntry, field: string, checked: boolean, label: string): string {
  return `
    <label class="income-tax-inline-checkbox">
      ${incomeCheckboxInput("yearlyEntries", entry.id, field, checked, label)}
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

function incomeTaxLockedCategoryReason(category: IncomeTaxDeductionCategory, rule: IncomeTaxRuleResult): string {
  if (category === "taxes" && !rule.taxFieldsEnabled) return "Steuerfelder sind fuer dieses Label gesperrt.";
  if (category !== "taxes" && !rule.contributionFieldsEnabled) return "Sozialabgabenfelder sind fuer dieses Label gesperrt.";
  return "";
}

function incomeTaxLockedRowReason(
  entry: IncomeYearEntry,
  row: (typeof INCOME_TAX_DEDUCTION_ROWS)[number],
  rule: IncomeTaxRuleResult
): string {
  const categoryReason = incomeTaxLockedCategoryReason(row.category, rule);
  if (categoryReason) return categoryReason;
  if (
    !rule.taxFieldsEnabled &&
    rule.contributionFieldsEnabled &&
    Boolean(entry.considerPensionInsurance) &&
    !entry.isRvExempt
  ) {
    return "Nur der Arbeitnehmerbeitrag zur gesetzlichen RV ist freigegeben.";
  }
  return "Dieses Feld ist fuer die aktuelle Regel gesperrt.";
}

function incomeTaxRuleReasonText(reasonKey: string): string {
  const textByKey: Record<string, string> = {
    "incomeTaxRules.default.enabled": "Normale Steuer- und Abgabenpositionen sind freigegeben.",
    "incomeTaxRules.pocketMoney.locked": "Taschengeld wird nicht als Arbeitslohn behandelt.",
    "incomeTaxRules.childYouthJobs.locked": "Kinder- und Jugendjobs wie Zeitung austragen werden hier nicht als lohnsteuerpflichtiger Arbeitslohn gefuehrt.",
    "incomeTaxRules.onlineSales.locked": "Online-Verkaeufe werden hier nicht als steuer- oder beitragspflichtiger Arbeitslohn gefuehrt.",
    "incomeTaxRules.insurancePayouts.locked": "Versicherungsauszahlungen werden hier nicht als steuer- oder beitragspflichtiger Arbeitslohn gefuehrt.",
    "incomeTaxRules.severance.jobLoss": "Abfindungen wegen Verlust des Arbeitsplatzes bleiben fuer Sozialabgaben gesperrt.",
    "incomeTaxRules.severance.earnedClaim": "Zahlungen fuer bereits entstandene Ansprueche sind zur manuellen Pruefung freigegeben.",
    "incomeTaxRules.garage.locked": "Nebeneinkuenfte liegen innerhalb der konfigurierten Freigrenze.",
    "incomeTaxRules.garage.sideIncomeExceeded": "Schwelle ueberschritten - manuelle Steuerposition moeglich.",
    "incomeTaxRules.capitalGains.enabled": "Kapitalertraege werden ueber Sparer-Pauschbetrag, Kapitalertragsteuer, Soli und optionale Kirchensteuer berechnet.",
    "incomeTaxRules.volunteer.locked": "Bis zur Ehrenamtspauschale ist keine Steuer-/Abgabenposition erforderlich.",
    "incomeTaxRules.volunteer.allowanceExceeded": "Ehrenamtspauschale ueberschritten - nur der Mehrbetrag ist steuerlich relevant.",
    "incomeTaxRules.trainer.locked": "Bis zum Übungsleiterfreibetrag ist keine Steuer-/Abgabenposition erforderlich.",
    "incomeTaxRules.trainer.allowanceExceeded": "Übungsleiterfreibetrag überschritten - nur der Mehrbetrag ist steuerlich relevant.",
    "incomeTaxRules.minijob.locked": "Pauschale Besteuerung angenommen; Steuer- und Sozialabgabenfelder bleiben gesperrt.",
    "incomeTaxRules.minijob.rvExempt": "Befreiung von der Rentenversicherungspflicht ist gesetzt.",
    "incomeTaxRules.minijob.rvActive": "Rentenversicherungspflicht ist aktiv; Sozialabgaben koennen erfasst werden.",
    "incomeTaxRules.minijob.annualLimitExceeded": "Minijob-Jahresgrenze ueberschritten - manuelle Pruefung noetig.",
    "incomeTaxRules.studentNewspaper.minijob": "Schuelerjob wird nach Minijob-Regeln bewertet.",
    "incomeTaxRules.studentNewspaper.shortTermLocked": "Kurzfristige Beschaeftigung liegt innerhalb der konfigurierten Dauergrenzen.",
    "incomeTaxRules.studentNewspaper.shortTermTaxReview": "Kurzfristige Beschaeftigung mit manueller steuerlicher Pruefung.",
    "incomeTaxRules.studentNewspaper.shortTermLimitExceeded": "Dauergrenze ueberschritten - Steuer- und Abgabenpositionen sind freigegeben."
  };
  return textByKey[reasonKey] ?? "Regelstatus wurde angewendet.";
}

function incomeTaxRuleWarningText(warningKey: string): string {
  const textByKey: Record<string, string> = {
    "incomeTaxRules.severance.warning": "Zahlungen fuer bereits entstandene Ansprueche koennen abweichend beitragspflichtig sein.",
    "incomeTaxRules.garage.general": "Einnahmen aus Garage oder Stellplatz werden als Vermietung/Verpachtung behandelt. Die 410 EUR sind kein eigener Garage-Freibetrag, sondern nur die aggregierte Nebeneinkuenfte-Pruefung.",
    "incomeTaxRules.volunteer.warningAllowanceExceeded": "Nur der uebersteigende Betrag ist gesondert zu pruefen.",
    "incomeTaxRules.trainer.warningAllowanceExceeded": "Nur der übersteigende Betrag ist gesondert zu pruefen.",
    "incomeTaxRules.minijob.warningAnnualLimitExceeded": "Die Minijob-Grenze wird jahresbezogen geprueft; einzelne Monatsabweichungen koennen zulaessig sein.",
    "incomeTaxRules.minijob.monthlyLimitNote": "Einzelne Monatsueberschreitungen koennen zulaessig sein, solange die Jahresgrenze eingehalten wird.",
    "incomeTaxRules.studentNewspaper.warningShortTermLimitExceeded": "Zeitung austragen wird separat gefuehrt; je nach Ausgestaltung gelten Minijob- oder Kurzfristigkeitsregeln."
  };
  return textByKey[warningKey] ?? "";
}

function incomeTaxRuleTooltipText(rule: IncomeTaxRuleResult): string {
  const reason = incomeTaxRuleReasonText(rule.reasonKey);
  const warning = rule.warningKey ? incomeTaxRuleWarningText(rule.warningKey) : "";
  return warning ? `${reason} ${warning}` : reason;
}

function incomeTaxButtonTooltipText(entry: IncomeYearEntry, rule: IncomeTaxRuleResult): string {
  const text = incomeTaxRuleTooltipText(rule);
  if (rule.status === "locked" && incomeYearLabel(entry.label) === "minijob") {
    return `${text} Rentenversicherungspflicht kann im Dialog aktiviert werden.`;
  }
  return text;
}

function renderIncomeAnalysisDialog(model: IncomeTrackerModel = incomeTrackerModel()): void {
  const root = document.querySelector<HTMLDivElement>("#incomeAnalysisDialogRoot");
  if (!root) return;
  if (!incomeAnalysisOpen) {
    root.innerHTML = "";
    return;
  }

  const analysis = buildIncomeAnalysisModel(model);
  const slices = incomeAnalysisSlices(analysis);
  const years = analysis.years;
  const distributionMode = incomeAnalysisDataView === "label_distribution";
  root.innerHTML = `
    <div class="income-analysis-backdrop" role="presentation">
      <div class="income-analysis-dialog${distributionMode ? " label-distribution" : ""}" role="dialog" aria-modal="true" aria-label="Weltgrafik Analyse Dashboard">
        <div class="income-analysis-head">
          <div>
            <strong>Weltgrafik</strong>
            <span>Grafik · Analyse · Dashboard · Plattform</span>
          </div>
          <button class="chart-popup-close" type="button" data-action="income-close-analysis" aria-label="Weltgrafik schliessen">x</button>
        </div>
        <div class="income-analysis-controls">
          <div class="income-analysis-switch" aria-label="Diagrammtyp">
            ${incomeAnalysisToggle("income-analysis-chart-pie", "Kreis", incomeAnalysisChartType === "pie")}
            ${incomeAnalysisToggle("income-analysis-chart-bar", "Balken", incomeAnalysisChartType === "bar")}
            ${incomeAnalysisToggle("income-analysis-chart-line", "Linie", incomeAnalysisChartType === "line")}
            ${incomeAnalysisToggle("income-analysis-chart-curve", "Kurve", incomeAnalysisChartType === "curve")}
          </div>
          <div class="income-analysis-switch" aria-label="Auswertung">
            ${incomeAnalysisToggle("income-analysis-view-deductions", "Abgabenmix", incomeAnalysisDataView === "deductions")}
            ${incomeAnalysisToggle("income-analysis-view-social", "Sozialabgaben", incomeAnalysisDataView === "social")}
            ${incomeAnalysisToggle("income-analysis-view-taxes", "Steuern", incomeAnalysisDataView === "taxes")}
            ${incomeAnalysisToggle("income-analysis-view-income", "Einkommen", incomeAnalysisDataView === "income")}
            ${incomeAnalysisToggle("income-analysis-view-label_distribution", "Einkommensverteilung", incomeAnalysisDataView === "label_distribution")}
          </div>
          <div class="income-analysis-switch" aria-label="Jahresfilter">
            ${incomeAnalysisToggle("income-analysis-year-all", "Alle Jahre", incomeAnalysisYearFilter === "all")}
            ${years.map((year) => incomeAnalysisToggle(`income-analysis-year-${year}`, String(year), incomeAnalysisYearFilter === year)).join("")}
          </div>
        </div>
        ${
          distributionMode
            ? renderIncomeAnalysisDistributionContent(analysis, slices)
            : `
              <div class="income-analysis-metrics">
                ${incomeAnalysisMetricCard("Bisher eingenommen", money(analysis.totalGross), "Brutto erfasst")}
                ${incomeAnalysisMetricCard("Zum Leben verfuegbar", money(analysis.totalNet), "Jahresnetto")}
                ${incomeAnalysisMetricCard("Steuern bezahlt", money(analysis.taxTotal), "inkl. Erstattung/Nachzahlung")}
                ${incomeAnalysisMetricCard("Sozialabgaben", money(analysis.socialTotal), "Arbeitnehmeranteile")}
              </div>
              <div class="income-analysis-layout">
                <section class="income-analysis-chart-card">
                  ${renderIncomeAnalysisChart(analysis, slices)}
                </section>
                <section class="income-analysis-detail-card">
                  <h3>${escapeHtml(incomeAnalysisViewTitle())}</h3>
                  <div class="income-analysis-detail-body">
                    <div class="income-analysis-breakdown">
                      ${slices.length ? slices.map((slice) => incomeAnalysisBreakdownLine(slice, analysis.totalGross)).join("") : incomeAnalysisEmpty("Keine Werte fuer diese Auswahl.")}
                    </div>
                  </div>
                  <div class="income-analysis-total">
                    <span>Abgabenquote ohne Arbeitgeber</span>
                    <strong>${analysis.totalGross > 0 ? percent((analysis.totalDeductions / analysis.totalGross) * 100) : "-"}</strong>
                  </div>
                </section>
              </div>
            `
        }
      </div>
    </div>
  `;
}

function renderIncomeAnalysisDistributionContent(analysis: IncomeAnalysisModel, slices: IncomeAnalysisSlice[]): string {
  return `
    <div class="income-analysis-distribution-layout">
      <div class="income-analysis-distribution-main">
        <section class="income-analysis-chart-card income-analysis-distribution-chart">
          ${renderIncomeAnalysisChart(analysis, slices)}
        </section>
        ${renderIncomeAnalysisLabelFilter(analysis.labelDetails)}
      </div>
      ${renderIncomeAnalysisDistributionDetail(analysis.labelDetails)}
    </div>
  `;
}

function renderIncomeAnalysisDistributionDetail(details: IncomeAnalysisLabelDetails): string {
  return `
    <section class="income-analysis-detail-card income-analysis-distribution-detail">
      <h3>Einkommen</h3>
      <div class="income-analysis-detail-body income-analysis-label-income-list">
        ${
          details.availableGroups.length
            ? details.availableGroups.map(renderIncomeAnalysisLabelIncomeCard).join("")
            : incomeAnalysisEmpty("Keine sichtbaren Labels fuer diese Auswahl.")
        }
      </div>
    </section>
  `;
}

function renderIncomeAnalysisLabelIncomeCard(group: IncomeAnalysisLabelGroup): string {
  return `
    <article class="income-analysis-label-income-card">
      <span>${escapeHtml(group.labelText)}</span>
      <strong>${escapeHtml(money(group.net))}</strong>
    </article>
  `;
}

function renderIncomeAnalysisLabelFilter(details: IncomeAnalysisLabelDetails): string {
  if (!details.availableLabels.length) {
    return `
      <section class="income-analysis-label-filter-card">
        ${incomeAnalysisEmpty("Keine sichtbaren Labels fuer diese Auswahl.")}
      </section>
    `;
  }

  const selected = new Set(details.selectedLabels);
  return `
    <section class="income-analysis-label-filter-card" aria-label="Label-Auswahl">
      <div class="income-analysis-label-filter-row" aria-label="Label-Filter">
        ${details.availableLabels
          .map((label) => {
            const active = selected.has(label.id);
            return `
              <button
                class="position-label-filter-button income-analysis-label-filter-button${active ? " active" : ""}"
                type="button"
                data-action="toggle-income-analysis-label"
                data-income-analysis-label="${escapeHtml(label.id)}"
                aria-pressed="${active}"
                aria-label="Label ${escapeHtml(label.label)} ${active ? "deaktivieren" : "aktivieren"}"
                title="${escapeHtml(label.label)}"
              >
                ${positionIconSvg(label.icon)}
              </button>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function incomeAnalysisToggle(action: string, label: string, active: boolean): string {
  return `
    <button class="income-analysis-toggle${active ? " active" : ""}" type="button" data-action="${escapeHtml(action)}" aria-pressed="${active}">
      ${escapeHtml(label)}
    </button>
  `;
}

function incomeAnalysisMetricCard(label: string, value: string, detail: string): string {
  return `
    <article>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>
  `;
}

function incomeAnalysisBreakdownLine(slice: IncomeAnalysisSlice, totalGross: number): string {
  const share = totalGross > 0 ? (slice.value / totalGross) * 100 : 0;
  return `
    <div class="income-analysis-line">
      <span><i class="${escapeHtml(slice.tone)}"></i>${escapeHtml(slice.label)}</span>
      <strong>${escapeHtml(money(slice.value))}</strong>
      <small>${escapeHtml(percent(share))}</small>
    </div>
  `;
}

function renderIncomeAnalysisChart(analysis: IncomeAnalysisModel, slices: IncomeAnalysisSlice[]): string {
  if (!analysis.entries.length) return incomeAnalysisEmpty("Noch keine Jahreswerte fuer die Weltgrafik.");
  if (incomeAnalysisChartType === "pie") return renderIncomeAnalysisPie(analysis, slices);
  if (incomeAnalysisChartType === "bar") return renderIncomeAnalysisBars(slices);
  return renderIncomeAnalysisLineChart(analysis, incomeAnalysisChartType === "curve");
}

function renderIncomeAnalysisPie(analysis: IncomeAnalysisModel, slices: IncomeAnalysisSlice[]): string {
  const visible = slices.filter(incomeAnalysisSliceHasDisplayValue);
  if (!visible.length) return incomeAnalysisEmpty("Keine aufgeteilten Werte vorhanden.");
  const visibleTotal = visible.reduce((sum, slice) => sum + incomeAnalysisSliceChartValue(slice), 0);
  const ownTotal =
    incomeAnalysisDataView === "social"
      ? analysis.socialTotal
      : incomeAnalysisDataView === "deductions"
        ? analysis.totalDeductions
        : incomeAnalysisDataView === "taxes"
          ? analysis.taxTotal
          : visibleTotal;
  let cursor = 0;
  const gradient = visible
    .map((slice) => {
      const start = cursor;
      cursor += (incomeAnalysisSliceChartValue(slice) / Math.max(1, visibleTotal)) * 100;
      return `${incomeAnalysisToneColor(slice.tone)} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
    })
    .join(", ");
  const employerNote =
    (incomeAnalysisDataView === "social" || incomeAnalysisDataView === "deductions") && analysis.employerSocialTotal > 0
      ? `<small>Arbeitgeber separat ${escapeHtml(money(analysis.employerSocialTotal))}</small>`
      : "";
  return `
    <div class="income-analysis-pie-wrap">
      <div class="income-analysis-pie" style="background: conic-gradient(${gradient})">
        <strong>${escapeHtml(money(ownTotal))}</strong>
        <span>${escapeHtml(incomeAnalysisViewTitle())}</span>
        ${employerNote}
      </div>
    </div>
  `;
}

function renderIncomeAnalysisBars(slices: IncomeAnalysisSlice[]): string {
  const visible = slices.filter(incomeAnalysisSliceHasDisplayValue);
  if (!visible.length) return incomeAnalysisEmpty("Keine aufgeteilten Werte vorhanden.");
  const maxValue = Math.max(1, ...visible.map(incomeAnalysisSliceChartValue));
  return `
    <div class="income-analysis-bars">
      ${visible
        .map((slice) => {
          const height = Math.max(4, Math.round((incomeAnalysisSliceChartValue(slice) / maxValue) * 100));
          return `
            <div class="income-analysis-bar-column">
              <div><i class="${escapeHtml(slice.tone)}" style="height:${height}%"></i></div>
              <span>${escapeHtml(slice.label)}</span>
              <strong>${escapeHtml(money(slice.value))}</strong>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function incomeAnalysisSliceChartValue(slice: IncomeAnalysisSlice): number {
  return Math.abs(slice.chartValue ?? slice.value);
}

function incomeAnalysisSliceHasDisplayValue(slice: IncomeAnalysisSlice): boolean {
  return incomeAnalysisSliceChartValue(slice) >= 0.005;
}

function renderIncomeAnalysisLineChart(analysis: IncomeAnalysisModel, curved: boolean): string {
  const points =
    incomeAnalysisYearFilter === "all"
      ? analysis.yearPoints
      : analysis.yearPoints.filter((point) => point.year === incomeAnalysisYearFilter);
  const series = incomeAnalysisSeries(analysis, points);
  const years = incomeAnalysisSeriesYears(series);
  if (!years.length || !series.length) return incomeAnalysisEmpty("Keine Jahresentwicklung fuer diese Auswahl.");
  const values = series.flatMap((item) => item.values.map((point) => point.value));
  const maxValue = Math.max(1, ...values);
  const minYear = years[0] ?? 0;
  const maxYear = years[years.length - 1] ?? minYear;
  const width = 720;
  const height = 270;
  const left = 54;
  const right = width - 24;
  const top = 24;
  const bottom = height - 42;
  const xForYear = (year: number): number =>
    minYear === maxYear ? left + (right - left) / 2 : left + ((year - minYear) / (maxYear - minYear)) * (right - left);
  const yForValue = (value: number): number => bottom - (value / maxValue) * (bottom - top);
  return `
    <div class="income-analysis-svg-wrap">
      <svg class="income-analysis-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Wertentwicklung">
        <path class="axis" d="M${left} ${top}V${bottom}H${right}" />
        <path class="grid" d="M${left} ${(top + bottom) / 2}H${right}" />
        ${series
          .map((item) => {
            const coords = item.values.map((point) => ({ x: xForYear(point.year), y: yForValue(point.value) }));
            const path = curved ? curvedPath(coords) : linePath(coords);
            return `
              <path class="series ${escapeHtml(item.tone)}" d="${path}" />
              ${coords.map((point) => `<circle class="series-point ${escapeHtml(item.tone)}" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4" />`).join("")}
            `;
          })
          .join("")}
        ${years
          .map((year) => `<text x="${xForYear(year)}" y="${bottom + 24}" text-anchor="middle">${year}</text>`)
          .join("")}
      </svg>
      <div class="income-analysis-legend">
        ${series.map((item) => `<span><i class="${escapeHtml(item.tone)}"></i>${escapeHtml(item.label)}</span>`).join("")}
      </div>
    </div>
  `;
}

function incomeAnalysisEmpty(message: string): string {
  return `<div class="income-analysis-empty">${escapeHtml(message)}</div>`;
}

function incomeAnalysisToneColor(tone: string): string {
  const colors: Record<string, string> = {
    tax: "#b42318",
    social: "#3366cc",
    net: "#11795f",
    gross: "#64748b",
    deduction: "#b87514",
    employer: "#0f766e",
    gold: "#b87514",
    blue: "#1d4ed8",
    care: "#7c3aed",
    danger: "#b42318",
    refund: "#11795f",
    unassigned: "#737373"
  };
  return colors[tone] ?? "#1f7a68";
}

function incomeAnalysisLabelTone(index: number): string {
  const tones = ["net", "gross", "deduction", "tax", "social", "gold", "blue", "care", "employer", "unassigned"];
  return tones[index % tones.length];
}

function incomeAnalysisSlices(analysis: IncomeAnalysisModel): IncomeAnalysisSlice[] {
  return analysis.slicesByView[incomeAnalysisDataView].filter(incomeAnalysisSliceHasDisplayValue);
}

function incomeAnalysisSeries(analysis: IncomeAnalysisModel, points: IncomeAnalysisYearPoint[]): IncomeAnalysisSeriesItem[] {
  if (incomeAnalysisDataView === "label_distribution") return incomeAnalysisLabelSeries(analysis.labelDetails);
  const seriesByView: Record<Exclude<IncomeAnalysisDataView, "label_distribution">, Array<{ key: keyof IncomeAnalysisYearPoint; label: string; tone: string }>> = {
    deductions: [
      { key: "taxes", label: "Steuern", tone: "tax" },
      { key: "social", label: "Sozialabgaben", tone: "social" },
      { key: "employerSocial", label: "Arbeitgeberanteil", tone: "employer" },
      { key: "deductions", label: "Abgaben gesamt", tone: "deduction" }
    ],
    social: [
      { key: "social", label: "Arbeitnehmer", tone: "social" },
      { key: "employerSocial", label: "Arbeitgeber", tone: "employer" }
    ],
    taxes: [
      { key: "taxBase", label: "Steuerbasis", tone: "gross" },
      { key: "taxRefund", label: "Steuerrueckerstattung", tone: "refund" },
      { key: "taxPayment", label: "Steuernachzahlung", tone: "danger" },
      { key: "taxes", label: "Steuern netto", tone: "tax" }
    ],
    income: [
      { key: "gross", label: "Brutto", tone: "gross" },
      { key: "net", label: "Netto", tone: "net" },
      { key: "deductions", label: "Abgaben", tone: "deduction" }
    ]
  };
  const series = seriesByView[incomeAnalysisDataView]
    .map((item) => ({
      label: item.label,
      tone: item.tone,
      values: points.map((point) => ({ year: point.year, value: Number(point[item.key]) || 0 }))
    }));
  const hasPositiveTaxSeries = incomeAnalysisDataView === "taxes" && series.some((item) => item.values.some((point) => point.value > 0));
  return series.filter(
    (item) =>
      item.values.some((point) => point.value > 0) ||
      (hasPositiveTaxSeries && item.label === "Steuern netto")
  );
}

function incomeAnalysisLabelSeries(details: IncomeAnalysisLabelDetails): IncomeAnalysisSeriesItem[] {
  const years = incomeAnalysisSeriesYears([{ label: "", tone: "", values: details.yearPoints.map((point) => ({ year: point.year, value: point.net })) }]);
  return details.groups
    .map((group, index) => {
      const pointByYear = new Map(
        details.yearPoints
          .filter((point) => point.label === group.label)
          .map((point) => [point.year, point.net] as const)
      );
      return {
        label: group.labelText,
        tone: incomeAnalysisLabelTone(index),
        values: years.map((year) => ({ year, value: pointByYear.get(year) ?? 0 }))
      };
    })
    .filter((item) => item.values.some((point) => point.value > 0));
}

function incomeAnalysisSeriesYears(series: IncomeAnalysisSeriesItem[]): number[] {
  return [...new Set(series.flatMap((item) => item.values.map((point) => point.year)))].sort((a, b) => a - b);
}

function linePath(points: Array<{ x: number; y: number }>): string {
  if (!points.length) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function curvedPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return linePath(points);
  return points
    .map((point, index) => {
      if (index === 0) return `M${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
      const previous = points[index - 1];
      const controlX = (previous.x + point.x) / 2;
      return `C${controlX.toFixed(1)} ${previous.y.toFixed(1)}, ${controlX.toFixed(1)} ${point.y.toFixed(1)}, ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    })
    .join(" ");
}

function incomeAnalysisEntryTaxBase(entry: IncomeYearEntry): number {
  if (incomeTaxDeductionItemsTotal(entry.taxDeductionItems) === null) return numberValue(entry.taxesAndDeductions);
  return INCOME_TAX_DEDUCTION_ROWS.filter((row) => row.category === "taxes").reduce(
    (sum, row) => sum + numberValue(entry.taxDeductionItems[row.field]),
    0
  );
}

function incomeAnalysisTaxAdjustmentTotals(entries: IncomeYearEntry[]): { refund: number; payment: number } {
  return entries.reduce(
    (totals, entry) => {
      const amount = Math.max(0, numberValue(entry.taxAdjustment.amount));
      if (amount <= 0) return totals;
      if (entry.taxAdjustment.type === "payment") {
        totals.payment += amount;
      } else {
        totals.refund += amount;
      }
      return totals;
    },
    { refund: 0, payment: 0 }
  );
}

function buildIncomeAnalysisModel(model: IncomeTrackerModel): IncomeAnalysisModel {
  const activeEntries = incomeActiveYearEntries();
  const years = [...new Set(incomeVisibleYearEntries(activeEntries).map((entry) => entry.year))].sort((a, b) => a - b);
  if (incomeAnalysisYearFilter !== "all" && !years.includes(incomeAnalysisYearFilter)) {
    incomeAnalysisYearFilter = "all";
  }
  const entries = activeEntries.filter((entry) =>
    incomeAnalysisYearFilter === "all" ? true : entry.year === incomeAnalysisYearFilter
  );
  const visibleEntries = incomeVisibleYearEntries(entries);
  const totalNet = entries.reduce((sum, entry) => sum + numberValue(incomeYearEntryNetIncome(entry)), 0);
  const totalDeductions = entries.reduce((sum, entry) => sum + numberValue(incomeYearEntryTaxDeductions(entry)), 0);
  const totalGross = entries.reduce((sum, entry) => sum + incomeAnalysisGross(entry), 0);
  const taxSlices = incomeAnalysisTaxRows(visibleEntries, "taxes");
  const socialSlices = incomeAnalysisTaxRows(visibleEntries, "social");
  const employerSocialSlices = incomeAnalysisTaxRows(visibleEntries, "employer_social");
  const labelDetails = buildIncomeAnalysisLabelDetails(
    state.incomeTracker.yearlyEntries,
    INCOME_YEAR_LABEL_OPTIONS,
    incomeAnalysisSelectedLabels,
    incomeAnalysisYearFilter
  );
  incomeAnalysisSelectedLabels = labelDetails.selectedLabels;
  const taxBaseTotal = entries.reduce((sum, entry) => sum + incomeAnalysisEntryTaxBase(entry), 0);
  const { refund: taxRefundTotal, payment: taxPaymentTotal } = incomeAnalysisTaxAdjustmentTotals(entries);
  const taxTotal = entries.reduce((sum, entry) => sum + incomeYearEntryTaxTotal(entry), 0);
  const socialTotal = incomeAnalysisTaxRows(entries, "social").reduce((sum, slice) => sum + slice.value, 0);
  const employerSocialTotal = incomeAnalysisTaxRows(entries, "employer_social").reduce((sum, slice) => sum + slice.value, 0);
  const unassignedDeductions = Math.max(0, totalDeductions - taxTotal - socialTotal);
  const deductionSlices = [
    { label: "Steuern", value: taxTotal, tone: "tax" },
    { label: "Sozialabgaben", value: socialTotal, tone: "social" },
    { label: "Arbeitgeberanteil", value: employerSocialTotal, tone: "employer" },
    { label: "Nicht aufgeteilt", value: unassignedDeductions, tone: "unassigned" }
  ];
  const incomeSlices = [
    { label: "Zum Leben verfuegbar", value: totalNet, tone: "net" },
    { label: "Steuern bezahlt", value: taxTotal, tone: "tax" },
    { label: "Sozialabgaben", value: socialTotal, tone: "social" },
    { label: "Nicht aufgeteilt", value: unassignedDeductions, tone: "unassigned" }
  ];
  const labelDistributionSlices = labelDetails.groups.map((group, index) => ({
    label: group.labelText,
    value: group.net,
    tone: incomeAnalysisLabelTone(index)
  }));
  return {
    entries,
    years,
    labelDetails,
    totalGross,
    totalNet,
    totalDeductions,
    taxBaseTotal,
    taxRefundTotal,
    taxPaymentTotal,
    taxTotal,
    socialTotal,
    employerSocialTotal,
    unassignedDeductions,
    slicesByView: {
      deductions: deductionSlices,
      social: [...socialSlices, ...employerSocialSlices],
      taxes: taxSlices,
      income: incomeSlices,
      label_distribution: labelDistributionSlices
    },
    yearPoints: buildIncomeAnalysisYearPoints(model)
  };
}

function incomeAnalysisTaxRows(entries: IncomeYearEntry[], category: "taxes" | "social" | "employer_social"): IncomeAnalysisSlice[] {
  const tones =
    category === "taxes"
      ? ["tax", "gold", "danger"]
      : category === "employer_social"
        ? ["employer"]
        : ["social", "blue", "care", "unassigned"];
  const slices: IncomeAnalysisSlice[] = INCOME_TAX_DEDUCTION_ROWS.filter((row) => row.category === category)
    .map((row, index) => ({
      label: incomeAnalysisTaxRowLabel(row),
      value: entries.reduce((sum, entry) => sum + numberValue(entry.taxDeductionItems[row.field]), 0),
      tone: tones[index % tones.length]
    }))
    .filter((slice) => slice.value > 0);
  if (category === "taxes") {
    const detailedTaxTotal = slices.reduce((sum, slice) => sum + slice.value, 0);
    const fallbackTaxBase = entries.reduce((sum, entry) => sum + incomeAnalysisEntryTaxBase(entry), 0) - detailedTaxTotal;
    if (fallbackTaxBase > 0.005) {
      slices.unshift({
        label: "Steuerbasis",
        value: fallbackTaxBase,
        tone: "gross"
      });
    }
    const { refund, payment } = incomeAnalysisTaxAdjustmentTotals(entries);
    if (refund > 0) {
      slices.push({
        label: "Steuerrueckerstattung",
        value: -refund,
        chartValue: refund,
        tone: "refund"
      });
    }
    if (payment > 0) {
      slices.push({
        label: "Steuernachzahlung",
        value: payment,
        chartValue: payment,
        tone: "danger"
      });
    }
  }
  return slices;
}

function buildIncomeAnalysisYearPoints(model: IncomeTrackerModel): IncomeAnalysisYearPoint[] {
  return model.valueYears.map((year) => {
    const entries = incomeActiveYearEntries().filter((entry) => entry.year === year.year);
    const { refund: taxRefund, payment: taxPayment } = incomeAnalysisTaxAdjustmentTotals(entries);
    const taxes = entries.reduce((sum, entry) => sum + incomeYearEntryTaxTotal(entry), 0);
    const social = incomeAnalysisTaxRows(entries, "social").reduce((sum, slice) => sum + slice.value, 0);
    const employerSocial = incomeAnalysisTaxRows(entries, "employer_social").reduce((sum, slice) => sum + slice.value, 0);
    const deductions = entries.reduce((sum, entry) => sum + numberValue(incomeYearEntryTaxDeductions(entry)), 0);
    return {
      year: year.year,
      gross: entries.reduce((sum, entry) => sum + incomeAnalysisGross(entry), 0),
      net: year.annualNet ?? 0,
      deductions,
      taxBase: entries.reduce((sum, entry) => sum + incomeAnalysisEntryTaxBase(entry), 0),
      taxRefund,
      taxPayment,
      taxes,
      social,
      employerSocial
    };
  });
}

function incomeAnalysisTaxRowLabel(row: (typeof INCOME_TAX_DEDUCTION_ROWS)[number]): string {
  const label = row.label.replace(/^.*?\s/, "");
  if (row.field === "pensionInsurance") return `${label} (Arbeitnehmer)`;
  if (row.field === "employerPensionInsurance") return `${label} (Arbeitgeber)`;
  return label;
}

function incomeAnalysisGross(entry: IncomeYearEntry): number {
  const gross = numberValue(entry.annualGrossIncome);
  if (gross > 0) return gross;
  return numberValue(incomeYearEntryNetIncome(entry)) + numberValue(incomeYearEntryTaxDeductions(entry));
}

function incomeAnalysisViewTitle(): string {
  if (incomeAnalysisDataView === "social") return "Sozialabgaben";
  if (incomeAnalysisDataView === "taxes") return "Steuern";
  if (incomeAnalysisDataView === "income") return "Einkommen und Abgaben";
  if (incomeAnalysisDataView === "label_distribution") return "Einkommensverteilung";
  return "Abgabenmix";
}

function renderIncomeMilestoneRows(): void {
  const body = document.querySelector<HTMLTableSectionElement>("#incomeMilestoneRows");
  if (!body) return;
  if (!state.incomeTracker.milestones.length) {
    body.innerHTML = `<tr><td class="position-empty" colspan="6">Noch keine Karriere-Meilensteine eingetragen.</td></tr>`;
    return;
  }
  body.innerHTML = incomeSortedMilestones()
    .map(
      (entry) => `
      <tr>
        <td><input type="month" value="${escapeHtml(entry.date)}" data-income-collection="milestones" data-income-id="${entry.id}" data-income-field="date" /></td>
        <td>${incomeMilestoneTypeButton(entry)}</td>
        <td>${incomeTextInput("milestones", entry.id, "description", entry.description)}</td>
        <td>${incomeSelect("milestones", entry.id, "impact", CAREER_MILESTONE_IMPACT_OPTIONS, entry.impact)}</td>
        <td>${incomeNumberInput("milestones", entry.id, "linkedYear", entry.linkedYear, { min: 1900, max: 2200, step: 1 })}</td>
        <td><button class="icon-button danger" type="button" data-action="income-remove-milestone-${entry.id}" aria-label="Meilenstein entfernen">x</button></td>
      </tr>
    `
    )
    .join("");
}

function incomeSortedYearEntries(): IncomeYearEntry[] {
  return [...state.incomeTracker.yearlyEntries].sort(
    (first, second) =>
      first.year - second.year ||
      incomeYearLabelMeta(first.label).label.localeCompare(incomeYearLabelMeta(second.label).label, "de") ||
      first.id.localeCompare(second.id)
  );
}

function incomeFilteredYearEntries(): IncomeYearEntry[] {
  const selected = new Set(state.incomeTracker.settings.selectedYearlyLabels.map(incomeYearLabel));
  const entries = incomeSortedYearEntries();
  if (!selected.size) return entries;
  return entries.filter((entry) => selected.has(incomeYearLabel(entry.label)));
}

function incomeActiveYearEntries(): IncomeYearEntry[] {
  return state.incomeTracker.yearlyEntries.filter((entry) => entry.active);
}

function incomeVisibleYearEntries(entries: IncomeYearEntry[]): IncomeYearEntry[] {
  return entries.filter((entry) => entry.visible);
}

function incomeSortedMilestones(): CareerMilestone[] {
  return [...state.incomeTracker.milestones].sort((first, second) => {
    const firstYear = first.linkedYear ?? incomeYearFromDate(first.date) ?? 9999;
    const secondYear = second.linkedYear ?? incomeYearFromDate(second.date) ?? 9999;
    return firstYear - secondYear || first.date.localeCompare(second.date) || first.id.localeCompare(second.id);
  });
}

function renderIncomeSettingControls(): void {
  const settings = state.incomeTracker.settings;
  setInputValue('[data-income-setting="projectionMode"]', settings.projectionMode);
  setInputValue('[data-income-setting="manualGrowthRatePercent"]', settings.manualGrowthRatePercent ?? "");
  setInputValue('[data-income-setting="savingsSharePercent"]', settings.savingsSharePercent ?? "");
  const manualGrowth = document.querySelector<HTMLInputElement>('[data-income-setting="manualGrowthRatePercent"]');
  if (manualGrowth) manualGrowth.disabled = settings.projectionMode !== "manual";
  setText("incomeGeneralInflationRate", percent(incomeGeneralInflationRatePercent()));
}

function renderIncomeMetricGrid(model: IncomeTrackerModel): void {
  const host = document.querySelector<HTMLDivElement>("#incomeMetricGrid");
  if (!host) return;
  const projection5 = incomeProjectionHorizon(model, 5);
  const metrics = [
    {
      label: "Aktuelles Jahresnetto",
      value: model.latest && model.latest.annualNet !== null ? money(model.latest.annualNet) : "Keine Daten",
      detail: model.latest?.source ? `${model.latest.year} | ${INCOME_SOURCE_LABELS[model.latest.source]}` : "Noch kein Jahreswert"
    },
    {
      label: "Durchschnitt Monatsnetto",
      value: model.latest && model.latest.annualNet !== null ? money(model.latest.annualNet / 12) : "Keine Daten",
      detail: "aktuelles Jahresnetto / 12"
    },
    {
      label: "Jahreszuwachs",
      value: model.yearlyGrowthAmount !== null ? signedMoney(model.yearlyGrowthAmount) : "Keine Daten",
      detail: model.yearlyGrowthPercent !== null ? signedPercent(model.yearlyGrowthPercent) : "Mindestens zwei Jahre noetig"
    },
    {
      label: "Monatlicher Spielraum",
      value: model.extraMonthlySpace !== null ? signedMoney(model.extraMonthlySpace) : "Keine Daten",
      detail: "Jahreszuwachs / 12"
    },
    {
      label: "Nettoquote",
      value:
        model.latestRatioYear && model.latestRatioYear.netRatio !== null
          ? percent(model.latestRatioYear.netRatio)
          : "Keine Daten",
      detail: model.averageNetRatio !== null ? `Ø ${percent(model.averageNetRatio)}` : "Jahresbrutto erforderlich"
    },
    {
      label: "Projektion in 5 Jahren",
      value: projection5 ? money(projection5.value) : "Deaktiviert",
      detail: projection5 && model.projection.rate !== null ? `${projection5.year} | ${percent(model.projection.rate * 100)}` : "explizite Annahme erforderlich"
    }
  ];
  host.innerHTML = metrics.map((metric) => incomeMetricCard(metric.label, metric.value, metric.detail)).join("");
}

function renderIncomeInsights(model: IncomeTrackerModel): void {
  const host = document.querySelector<HTMLDivElement>("#incomeInsights");
  if (!host) return;
  const insights: Array<{ tone: "normal" | "warning" | "danger"; text: string }> = [];
  if (!model.valueYears.length) {
    insights.push({
      tone: "warning",
      text: "Noch keine Einkommen eingetragen. Kennzahlen und Diagramme bleiben leer, bis Jahreswerte vorhanden sind."
    });
  }
  if (model.latest && model.latest.annualNet !== null && model.latest.source) {
    insights.push({
      tone: "normal",
      text: `Aktueller Jahreswert: ${money(model.latest.annualNet)} fuer ${model.latest.year}. Quelle: ${INCOME_SOURCE_LABELS[model.latest.source]}.`
    });
  }
  if (model.yearlyGrowthAmount !== null && model.previous) {
    insights.push({
      tone: model.yearlyGrowthAmount < 0 ? "danger" : "normal",
      text: `Veraenderung gegenueber ${model.previous.year}: ${signedMoney(model.yearlyGrowthAmount)} (${signedPercent(
        model.yearlyGrowthPercent ?? 0
      )}).`
    });
  }
  if (model.extraMonthlySpace !== null) {
    insights.push({
      tone: model.extraMonthlySpace < 0 ? "danger" : "normal",
      text: `Das entspricht ${signedMoney(model.extraMonthlySpace)} zusaetzlichem monatlichem Spielraum.`
    });
  }
  if (model.additionalSavingsRate !== null && model.savingsSharePercent !== null) {
    insights.push({
      tone: model.additionalSavingsRate < 0 ? "danger" : "normal",
      text: `Bei ${percent(model.savingsSharePercent)} Anteil koennte die Sparrate oder tragbare Rate um ${signedMoney(
        model.additionalSavingsRate
      )} pro Monat steigen.`
    });
  }
  if (model.latestRatioYear && model.latestRatioYear.netRatio !== null) {
    insights.push({
      tone: "normal",
      text: `Nettoquote ${model.latestRatioYear.year}: ${percent(model.latestRatioYear.netRatio)}.`
    });
  }
  if (model.averageNetRatio !== null) {
    insights.push({ tone: "normal", text: `Durchschnittliche Nettoquote: ${percent(model.averageNetRatio)}.` });
  }
  if (model.netRatioChange !== null && model.previousRatioYear && Math.abs(model.netRatioChange) >= 5) {
    insights.push({
      tone: "warning",
      text: `Die Nettoquote hat sich gegenueber ${model.previousRatioYear.year} um ${signedPercentagePoints(
        model.netRatioChange
      )} veraendert.`
    });
  }
  if (model.previous && model.previous.realNet !== null && model.latest && model.latest.realNet !== null) {
    const realGrowth = model.latest.realNet - model.previous.realNet;
    insights.push({
      tone: realGrowth < 0 ? "warning" : "normal",
      text: `Inflationsbereinigt hat sich dein Einkommen gegenueber ${model.previous.year} um ${signedMoney(realGrowth)} veraendert.`
    });
    if ((model.yearlyGrowthAmount ?? 0) > 0 && realGrowth <= 0) {
      insights.push({
        tone: "warning",
        text: "Nominal steigt das Einkommen, real stagniert oder sinkt es auf Basis der allgemeinen Jahresinflation."
      });
    }
  }
  if (model.bestYear && model.weakestYear && model.bestYear.year !== model.weakestYear.year) {
    insights.push({
      tone: "normal",
      text: `Bestes Jahr: ${model.bestYear.year} mit ${money(model.bestYear.annualNet ?? 0)}. Schwaechstes Jahr: ${model.weakestYear.year} mit ${money(
        model.weakestYear.annualNet ?? 0
      )}.`
    });
  }
  const projection5 = incomeProjectionHorizon(model, 5);
  const projection10 = incomeProjectionHorizon(model, 10);
  if (projection5 && projection10) {
    insights.push({
      tone: "warning",
      text: `Projektion (${model.projection.modeLabel}): ${money(projection5.value)} in 5 Jahren und ${money(
        projection10.value
      )} in 10 Jahren.`
    });
  } else if (model.projection.enabled && model.projection.rate === null) {
    insights.push({
      tone: "warning",
      text: "Projektion ist aktiviert, aber es fehlt eine nutzbare Wachstumsrate oder ausreichend Historie."
    });
  }
  host.innerHTML = insights.map((insight) => `<div class="income-insight ${insight.tone}">${escapeHtml(insight.text)}</div>`).join("");
}

function renderIncomeYearStatusRows(model: IncomeTrackerModel): void {
  const body = document.querySelector<HTMLTableSectionElement>("#incomeYearStatusRows");
  if (!body) return;
  if (!model.years.length) {
    body.innerHTML = `<tr><td class="position-empty" colspan="8">Noch keine Jahreswerte vorhanden.</td></tr>`;
    return;
  }
  body.innerHTML = model.years
    .map(
      (year) => `
      <tr>
        <td>${year.year}</td>
        <td class="numeric-cell">${year.annualNet !== null ? money(year.annualNet) : "-"}</td>
        <td>${year.source ? incomeSourceBadge(year.source) : '<span class="status-pill muted">nur Meilenstein</span>'}</td>
        <td class="numeric-cell">${year.annualStatementNet !== null ? money(year.annualStatementNet) : "-"}</td>
        <td class="numeric-cell">${year.manualNet !== null ? money(year.manualNet) : "-"}</td>
        <td class="numeric-cell">${year.netRatio !== null ? percent(year.netRatio) : "-"}</td>
        <td class="numeric-cell">${year.realNet !== null ? money(year.realNet) : "-"}</td>
        <td>${incomeMilestoneBadges(year.milestones)}</td>
      </tr>
    `
    )
    .join("");
}

function incomeMilestoneBadges(milestones: CareerMilestone[]): string {
  if (!milestones.length) return "-";
  return `<div class="income-milestone-badges">${milestones.map(incomeMilestoneTypeBadge).join("")}</div>`;
}

function renderIncomeCharts(model: IncomeTrackerModel): void {
  const visibleChartModel = incomeChartModel();
  setIncomeChart("incomeAnnualChart", renderIncomeAnnualChart(visibleChartModel));
  setIncomeChart("incomeGrowthChart", renderIncomeGrowthChart(visibleChartModel));
  setIncomeChart("incomeInflationChart", renderIncomeInflationChart(visibleChartModel));
  setIncomeChart("incomeRatioChart", renderIncomeRatioChart(visibleChartModel));
  setIncomeChart("incomeProjectionChart", renderIncomeProjectionChart(model));
}

function renderIncomeAnnualChart(model: IncomeTrackerModel): string {
  if (!model.valueYears.length) return incomeChartEmpty("Noch keine Jahreswerte.");
  const items = model.valueYears
    .map((year) => {
      const segments = incomeAnnualChartSegments(year);
      const value = segments.reduce((sum, segment) => sum + segment.value, 0);
      if (value < 0.005) return null;
      return {
        label: String(year.year),
        value,
        detail: year.source ? INCOME_SOURCE_LABELS[year.source] : "",
        tone: year.source === "annual_statement" ? "accent" : year.source === "manual" ? "gold" : "blue",
        markerHtml: incomeMilestoneChartMarkers(year.milestones),
        segments
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  if (!items.length) return incomeChartEmpty("Keine sichtbaren Jahreswerte.");
  const maxValue = Math.max(1, ...items.map((item) => item.value));
  return incomeStackedBarChart(items, maxValue);
}

function incomeMilestoneChartMarkers(milestones: CareerMilestone[]): string {
  if (!milestones.length) return "";
  return `
    <div class="income-chart-milestone-markers">
      ${milestones
        .slice(0, 4)
        .map((milestone) => {
          const meta = incomeMilestoneTypeMeta(milestone.type);
          return `<span title="${escapeHtml(meta.type)}">${positionIconSvg(meta.icon)}</span>`;
        })
        .join("")}
    </div>
  `;
}

function incomeAnnualChartSegments(year: IncomeTrackerModel["years"][number]): Array<{ value: number; label: string; tone: string }> {
  const contributingEntries = incomeActiveYearEntries()
    .filter((entry) => {
      if (!entry.visible) return false;
      if (entry.year !== year.year) return false;
      if (year.source === "annual_statement") return entry.source === "annual_statement";
      if (year.source === "manual") return entry.source === "manual";
      return false;
    })
    .map((entry, index) => ({
      value: incomeYearEntryNetIncome(entry) ?? 0,
      label: incomeYearLabelMeta(entry.label).label,
      tone: `segment-${index % 5}`
    }))
    .filter((segment) => segment.value > 0);

  return contributingEntries;
}

function renderIncomeGrowthChart(model: IncomeTrackerModel): string {
  const values = model.valueYears.slice(1).map((year, index) => ({
    label: String(year.year),
    value: (year.annualNet ?? 0) - (model.valueYears[index].annualNet ?? 0),
    detail: `gegenueber ${model.valueYears[index].year}`,
    tone: (year.annualNet ?? 0) >= (model.valueYears[index].annualNet ?? 0) ? "good" : "danger",
    marker: ""
  }));
  if (!values.length) return incomeChartEmpty("Mindestens zwei Jahreswerte noetig.");
  const maxValue = Math.max(1, ...values.map((item) => Math.abs(item.value)));
  return incomeBarChart(values, maxValue, true);
}

function renderIncomeInflationChart(model: IncomeTrackerModel): string {
  const points = model.valueYears.filter((year) => year.realNet !== null);
  if (!points.length) return incomeChartEmpty("Keine Jahreswerte fuer Inflationsbereinigung.");
  const maxValue = Math.max(1, ...points.flatMap((year) => [year.annualNet ?? 0, year.realNet ?? 0]));
  return `
    <div class="income-grouped-chart">
      ${points
        .map(
          (year) => `
        <div class="income-group">
          <div class="income-paired-bars">
            ${incomeMiniBar(year.annualNet ?? 0, maxValue, "blue", "Nominal")}
            ${incomeMiniBar(year.realNet ?? 0, maxValue, "gold", "Real")}
          </div>
          <span>${year.year}</span>
          <div class="income-inflation-values">
            <small><b>Nominal</b>${escapeHtml(money(year.annualNet ?? 0))}</small>
            <small><b>Real</b>${escapeHtml(money(year.realNet ?? 0))}</small>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
    <div class="income-chart-legend"><span class="blue"></span>Nominal <span class="gold"></span>Real</div>
  `;
}

function renderIncomeRatioChart(model: IncomeTrackerModel): string {
  if (!model.ratioYears.length) return incomeChartEmpty("Keine Brutto-/Netto-Kombination vorhanden.");
  const maxValue = Math.max(100, ...model.ratioYears.map((year) => year.netRatio ?? 0));
  return incomeBarChart(
    model.ratioYears.map((year) => ({
      label: String(year.year),
      value: year.netRatio ?? 0,
      detail: "Nettoquote",
      tone: "accent",
      marker: ""
    })),
    maxValue,
    false,
    (value) => percent(value)
  );
}

function renderIncomeProjectionChart(model: IncomeTrackerModel): string {
  if (state.incomeTracker.settings.projectionMode === "off") return incomeChartEmpty("Projektion ist deaktiviert.");
  if (!model.projection.points.length) return incomeChartEmpty("Keine nutzbare Projektionsrate vorhanden.");
  const maxValue = Math.max(1, ...model.projection.points.map((point) => point.value), ...model.valueYears.map((year) => year.annualNet ?? 0));
  const items = model.projection.points.map((point) => {
    const offset = point.year - (model.latest?.year ?? point.year);
      return {
        label: String(point.year),
        value: point.value,
        detail: incomeProjectionPointDetail(offset),
        tone: offset < 0 ? "blue" : point.projected ? "warning" : "accent",
        marker: ""
      };
  });
  return `
    <div class="income-projection-chart">
      ${incomeBarChart(items, maxValue)}
      ${incomeProjectionGrowthArrows(model)}
    </div>
  `;
}

function incomeProjectionPointDetail(offsetYears: number): string {
  if (offsetYears === 0) return "Ist";
  return "";
}

function incomeProjectionGrowthArrows(model: IncomeTrackerModel): string {
  const points = model.projection.points;
  const currentYear = model.latest?.year ?? null;
  if (currentYear === null || points.length < 3) return "";
  const transitions = [
    { fromOffset: -10, toOffset: -5 },
    { fromOffset: -5, toOffset: 0 },
    { fromOffset: 0, toOffset: 5 },
    { fromOffset: 5, toOffset: 10 },
    { fromOffset: 10, toOffset: 15 }
  ];
  const arrows = transitions
    .map((transition) => {
      const fromIndex = points.findIndex((point) => point.year === currentYear + transition.fromOffset);
      const toIndex = points.findIndex((point) => point.year === currentYear + transition.toOffset);
      const from = points[fromIndex];
      const to = points[toIndex];
      if (fromIndex < 0 || toIndex < 0 || toIndex <= fromIndex || !from || !to || from.value <= 0) return "";
      const growthPercent = ((to.value - from.value) / from.value) * 100;
      return `
        <span class="income-projection-growth-arrow" style="grid-column: ${fromIndex + 1}">
          <b>${escapeHtml(signedPercent(growthPercent))}</b>
        </span>
      `;
    })
    .join("");
  if (!arrows.trim()) return "";
  return `<div class="income-projection-growth-row" style="--income-projection-gap-count: ${Math.max(1, points.length - 1)}">${arrows}</div>`;
}

function setIncomeChart(id: string, html: string): void {
  const host = document.querySelector<HTMLDivElement>(`#${id}`);
  if (host) host.innerHTML = html;
}

function incomeBarChart(
  items: Array<{ label: string; value: number; detail: string; tone: string; marker: string }>,
  maxValue: number,
  signed = false,
  formatter: (value: number) => string = money
): string {
  return `
    <div class="income-bar-chart" style="--income-bar-count: ${Math.max(1, items.length)}">
      ${items
        .map((item) => {
          const height = Math.max(3, Math.round((Math.abs(item.value) / Math.max(1, maxValue)) * 100));
          const negative = item.value < 0 ? " negative" : "";
          return `
            <div class="income-bar-column">
              <div class="income-bar-track">
                ${item.marker ? `<span class="income-chart-marker">${escapeHtml(item.marker)}</span>` : ""}
                <i class="income-bar ${escapeHtml(item.tone)}${negative}" style="height: ${height}%"></i>
              </div>
              <span>${escapeHtml(item.label)}</span>
              <strong>${signed ? signedMoney(item.value) : escapeHtml(formatter(item.value))}</strong>
              <small>${escapeHtml(item.detail)}</small>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function incomeStackedBarChart(
  items: Array<{
    label: string;
    value: number;
    detail: string;
    tone: string;
    markerHtml: string;
    segments: Array<{ value: number; label: string; tone: string }>;
  }>,
  maxValue: number
): string {
  return `
    <div class="income-bar-chart" style="--income-bar-count: ${Math.max(1, items.length)}">
      ${items
        .map((item) => {
          const totalHeight = Math.max(3, Math.round((Math.abs(item.value) / Math.max(1, maxValue)) * 100));
          const segments = item.segments.length
            ? item.segments
            : [{ value: item.value, label: item.detail, tone: item.tone }];
          return `
            <div class="income-bar-column">
              <div class="income-bar-track">
                ${item.markerHtml}
                <div class="income-bar-stack" style="height: ${totalHeight}%">
                  ${segments
                    .map((segment) => {
                      const height = Math.max(3, Math.round((segment.value / Math.max(1, item.value)) * 100));
                      return `<i class="income-bar-segment ${escapeHtml(segment.tone)}" style="height: ${height}%" title="${escapeHtml(
                        `${segment.label}: ${money(segment.value)}`
                      )}"></i>`;
                    })
                    .join("")}
                </div>
              </div>
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(money(item.value))}</strong>
              <small>${escapeHtml(segments.length > 1 ? `${segments.length} Eintraege` : item.detail)}</small>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function incomeMiniBar(value: number, maxValue: number, tone: string, label: string): string {
  const height = Math.max(3, Math.round((value / Math.max(1, maxValue)) * 100));
  return `<i class="income-bar ${escapeHtml(tone)}" style="height: ${height}%" title="${escapeHtml(label)} ${escapeHtml(money(value))}"></i>`;
}

function incomeChartEmpty(message: string): string {
  return `<div class="chart-empty">${escapeHtml(message)}</div>`;
}

function incomeMetricCard(label: string, value: string, detail: string): string {
  return `
    <article class="metric-card income-metric-card">
      <span class="metric-label">${escapeHtml(label)}</span>
      <strong class="metric-value">${escapeHtml(value)}</strong>
      <small class="metric-detail">${escapeHtml(detail)}</small>
    </article>
  `;
}

function incomeSourceBadge(source: IncomeResolvedSource): string {
  const tone = source === "manual" ? " warning" : "";
  return `<span class="status-pill${tone}">${escapeHtml(INCOME_SOURCE_LABELS[source])}</span>`;
}

function incomeYearLabel(value: string | undefined): string {
  const normalized = normalizeIncomeTaxRuleLabel(String(value ?? "").trim());
  if (INCOME_YEAR_LABEL_OPTIONS.some((option) => option.id === normalized)) return normalized;
  const byLabel = INCOME_YEAR_LABEL_OPTIONS.find((option) => incomeLabelKey(option.label) === incomeLabelKey(normalized));
  return byLabel?.id ?? "salary";
}

function incomeYearLabelMeta(value: string | undefined): { id: string; label: string; icon: string; description: string } {
  return INCOME_YEAR_LABEL_OPTIONS.find((option) => option.id === incomeYearLabel(value)) ?? INCOME_YEAR_LABEL_OPTIONS[0];
}

function incomeLabelKey(value: string): string {
  return normalizeHeader(value);
}

function incomeYearFromDate(value: string): number | null {
  const match = value.match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
}

function incomeProjectionHorizon(model: IncomeTrackerModel, years: number): IncomeTrackerModel["projection"]["horizons"][number] | null {
  return model.projection.horizons.find((item) => item.years === years) ?? null;
}

function incomeSelect<T extends string | number>(
  collection: string,
  id: string,
  field: string,
  options: Array<{ value: T; label: string }>,
  selected: T | string | number | null
): string {
  return `
    <select data-income-collection="${collection}" data-income-id="${id}" data-income-field="${field}">
      ${options
        .map(
          (option) =>
            `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(selected) ? "selected" : ""}>${escapeHtml(
              option.label
            )}</option>`
        )
        .join("")}
    </select>
  `;
}

function incomeNumberInput(
  collection: string,
  id: string,
  field: string,
  value: number | null,
  options: { min?: number; max?: number; step?: number; disabled?: boolean; title?: string; extraAttribute?: string } = {}
): string {
  return `
    <input
      type="number"
      value="${value ?? ""}"
      ${options.min !== undefined ? `min="${options.min}"` : ""}
      ${options.max !== undefined ? `max="${options.max}"` : ""}
      step="${options.step ?? 0.01}"
      ${options.disabled ? "disabled" : ""}
      ${options.title ? `title="${escapeHtml(options.title)}"` : ""}
      ${options.extraAttribute ?? ""}
      data-income-collection="${collection}"
      data-income-id="${id}"
      data-income-field="${field}"
    />
  `;
}

function incomeTextInput(collection: string, id: string, field: string, value: string): string {
  return `<input type="text" value="${escapeHtml(value)}" data-income-collection="${collection}" data-income-id="${id}" data-income-field="${field}" />`;
}

function incomeCheckboxInput(collection: string, id: string, field: string, checked: boolean, label: string): string {
  return `
    <input
      type="checkbox"
      ${checked ? "checked" : ""}
      data-income-collection="${collection}"
      data-income-id="${id}"
      data-income-field="${field}"
      aria-label="${escapeHtml(label)}"
    />
  `;
}

function incomeTaxDeductionsButton(entry: IncomeYearEntry, rule = incomeTaxRuleForEntry(entry)): string {
  const taxDeductions = incomeYearEntryTaxDeductions(entry);
  const locked = rule.status === "locked";
  const canOpen = incomeTaxDialogCanOpen(entry, rule);
  const stateLabel =
    locked && canOpen ? "RV moeglich" : locked ? "Nicht moeglich" : rule.status === "partially_enabled" ? "Teilweise" : "Details";
  const mainLabel = locked && canOpen ? "Optionen" : locked ? "Gesperrt" : taxDeductions === null ? "Eintragen" : money(taxDeductions);
  const lockedTooltip = locked ? incomeTaxButtonTooltipText(entry, rule) : "";
  return `
    <button
      class="income-tax-button ${locked ? "locked" : rule.status === "partially_enabled" ? "partial" : ""}"
      type="button"
      ${canOpen ? `data-action="income-open-tax-dialog-${escapeHtml(entry.id)}"` : "disabled"}
      ${lockedTooltip ? `title="${escapeHtml(lockedTooltip)}"` : ""}
      aria-label="${locked && canOpen ? `Steuer- und Abgabenoptionen bearbeiten: ${escapeHtml(lockedTooltip)}` : locked ? `Steuer- und Abgabenpositionen gesperrt: ${escapeHtml(lockedTooltip)}` : "Steuer- und Abgabenpositionen bearbeiten"}"
    >
      <strong data-income-year-tax-total="${escapeHtml(entry.id)}">${escapeHtml(mainLabel)}</strong>
      <span>${escapeHtml(stateLabel)}</span>
    </button>
  `;
}

function incomeYearLabelButton(entry: IncomeYearEntry): string {
  const meta = incomeYearLabelMeta(entry.label);
  return `
    <div class="income-year-label-display">
      <button
        class="position-label-button income-year-label-button"
        type="button"
        data-action="open-income-year-label-picker"
        data-income-year-id="${escapeHtml(entry.id)}"
        title="${escapeHtml(meta.description)}"
        aria-label="Einkommenslabel: ${escapeHtml(meta.label)}"
        aria-haspopup="dialog"
      >
        ${positionIconSvg(meta.icon)}
      </button>
      <span class="income-year-label-text">${escapeHtml(meta.label)}</span>
    </div>
  `;
}

function incomeMilestoneTypeButton(entry: CareerMilestone): string {
  const meta = incomeMilestoneTypeMeta(entry.type);
  return `
    <button
      class="income-milestone-type-button"
      type="button"
      data-action="open-income-milestone-type-picker"
      data-milestone-id="${escapeHtml(entry.id)}"
      aria-label="Meilenstein-Typ auswaehlen"
      title="${escapeHtml(meta.description)}"
    >
      ${positionIconSvg(meta.icon)}
      <span>${escapeHtml(meta.type)}</span>
    </button>
  `;
}

function incomeMilestoneTypeBadge(entry: CareerMilestone): string {
  const meta = incomeMilestoneTypeMeta(entry.type);
  return `
    <span class="income-milestone-badge" title="${escapeHtml(meta.description)}">
      ${positionIconSvg(meta.icon)}
      <span>${escapeHtml(meta.type)}</span>
    </span>
  `;
}

function incomeMilestoneTypeMeta(type: string): { type: string; icon: string; description: string } {
  return (
    CAREER_MILESTONE_TYPE_OPTIONS.find((option) => option.type === type) ?? {
      type: type || "Sonstiges",
      icon: "tag",
      description: "Eigener Meilenstein"
    }
  );
}

function setIncomeInputTab(value: string): void {
  if (value !== "yearly" && value !== "milestones" && value !== "settings") return;
  state.incomeTracker = {
    ...state.incomeTracker,
    settings: { ...state.incomeTracker.settings, activeInputTab: value }
  };
  renderAll();
}

function openIncomeTaxDialog(id: string): void {
  const entry = state.incomeTracker.yearlyEntries.find((item) => item.id === id);
  if (!entry || !incomeTaxDialogCanOpen(entry)) return;
  incomeTaxDialogEntryId = id;
  renderIncomeTaxDialog();
}

function closeIncomeTaxDialog(): void {
  if (!incomeTaxDialogEntryId) return;
  incomeTaxDialogEntryId = null;
  renderIncomeTaxDialog();
}

function openIncomeAnalysisDialog(): void {
  incomeAnalysisSelectedLabels = [];
  incomeAnalysisOpen = true;
  renderIncomeAnalysisDialog();
}

function closeIncomeAnalysisDialog(): void {
  if (!incomeAnalysisOpen) return;
  incomeAnalysisOpen = false;
  incomeAnalysisSelectedLabels = [];
  renderIncomeAnalysisDialog();
}

function setIncomeAnalysisChartType(value: IncomeAnalysisChartType): void {
  if (value !== "pie" && value !== "bar" && value !== "line" && value !== "curve") return;
  incomeAnalysisChartType = value;
  renderIncomeAnalysisDialog();
}

function setIncomeAnalysisDataView(value: IncomeAnalysisDataView): void {
  if (
    value !== "deductions" &&
    value !== "social" &&
    value !== "taxes" &&
    value !== "income" &&
    value !== "label_distribution"
  ) {
    return;
  }
  incomeAnalysisDataView = value;
  renderIncomeAnalysisDialog();
}

function setIncomeAnalysisYearFilter(value: string): void {
  incomeAnalysisYearFilter = value === "all" ? "all" : incomeInteger(value, state.settings.year);
  renderIncomeAnalysisDialog();
}

function toggleIncomeAnalysisLabel(label: string): void {
  const normalized = incomeYearLabel(label);
  const details = buildIncomeAnalysisLabelDetails(
    state.incomeTracker.yearlyEntries,
    INCOME_YEAR_LABEL_OPTIONS,
    incomeAnalysisSelectedLabels,
    incomeAnalysisYearFilter
  );
  const availableLabels = new Set(details.availableLabels.map((option) => option.id));
  if (!availableLabels.has(normalized)) return;
  const selected = new Set(details.selectedLabels);
  if (selected.has(normalized)) selected.delete(normalized);
  else selected.add(normalized);
  incomeAnalysisSelectedLabels = INCOME_YEAR_LABEL_OPTIONS.map((option) => option.id).filter((option) =>
    selected.has(option)
  );
  renderIncomeAnalysisDialog();
}

function toggleIncomeYearLabelFilter(label: string): void {
  const normalized = incomeYearLabel(label);
  const selected = new Set(state.incomeTracker.settings.selectedYearlyLabels.map(incomeYearLabel));
  if (selected.has(normalized)) selected.delete(normalized);
  else selected.add(normalized);
  state.incomeTracker = {
    ...state.incomeTracker,
    settings: { ...state.incomeTracker.settings, selectedYearlyLabels: Array.from(selected) }
  };
  renderIncomeYearLabelFilters();
  renderIncomeYearlyRows();
  saveState(state);
}

function addIncomeYearlyEntry(): void {
  state.incomeTracker = {
    ...state.incomeTracker,
    yearlyEntries: [
      ...state.incomeTracker.yearlyEntries,
      {
        id: createId(),
        active: true,
        visible: true,
        year: state.settings.year,
        label: "salary",
        person: "household",
        annualNetIncome: null,
        annualGrossIncome: null,
        taxesAndDeductions: null,
        taxDeductionItems: emptyIncomeTaxDeductionItems(),
        taxAdjustment: emptyIncomeTaxAdjustment(),
        capitalGainsAllowance: null,
        capitalGainsChurchTaxEnabled: false,
        capitalGainsChurchTaxRatePercent: DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT,
        employmentContext: "job_loss",
        minijobType: "commercial",
        considerPensionInsurance: false,
        isRvExempt: false,
        shortTermEmploymentDays: null,
        shortTermEmploymentMonths: null,
        studentEmploymentMode: "minijob",
        requiresManualTaxReview: false,
        employer: "",
        note: "",
        source: "annual_statement"
      }
    ]
  };
  renderAll();
}

function addIncomeMilestone(): void {
  state.incomeTracker = {
    ...state.incomeTracker,
    milestones: [
      ...state.incomeTracker.milestones,
      {
        id: createId(),
        date: "",
        type: "Gehaltserhoehung",
        description: "",
        impact: "positive",
        linkedYear: state.settings.year
      }
    ]
  };
  renderAll();
}

function removeIncomeEntry(action: string): void {
  if (action.startsWith("income-remove-yearly-")) {
    const id = action.replace("income-remove-yearly-", "");
    const yearlyEntries = state.incomeTracker.yearlyEntries.filter((entry) => entry.id !== id);
    state.incomeTracker = {
      ...state.incomeTracker,
      yearlyEntries: sanitizeIncomeYearEntriesWithTaxRules(yearlyEntries)
    };
  } else if (action.startsWith("income-remove-milestone-")) {
    const id = action.replace("income-remove-milestone-", "");
    state.incomeTracker = {
      ...state.incomeTracker,
      milestones: state.incomeTracker.milestones.filter((entry) => entry.id !== id)
    };
  }
  renderAll();
}

function updateIncomeEntry(collection: string, id: string, field: string, value: string): void {
  if (collection === "yearlyEntries") {
    const yearlyEntries = state.incomeTracker.yearlyEntries.map((entry) =>
      entry.id === id ? updateIncomeYearEntry(entry, field, value) : entry
    );
    state.incomeTracker = {
      ...state.incomeTracker,
      yearlyEntries: sanitizeIncomeYearEntriesWithTaxRules(yearlyEntries)
    };
    return;
  }
  if (collection === "milestones") {
    state.incomeTracker = {
      ...state.incomeTracker,
      milestones: state.incomeTracker.milestones.map((entry) =>
        entry.id === id ? updateIncomeMilestoneEntry(entry, field, value) : entry
      )
    };
    return;
  }
}

function updateIncomeYearEntry(entry: IncomeYearEntry, field: string, value: string): IncomeYearEntry {
  if (field === "active") return { ...entry, active: value === "true" };
  if (field === "visible") return { ...entry, visible: value === "true" };
  if (field === "year") return { ...entry, year: incomeInteger(value, state.settings.year) };
  if (field === "label") return { ...entry, label: incomeYearLabel(value) };
  if (field === "person") return { ...entry, person: incomePerson(value) };
  if (field === "source") return { ...entry, source: incomeYearSource(value) };
  if (field === "employmentContext") return { ...entry, employmentContext: incomeEmploymentContext(value) };
  if (field === "minijobType") return { ...entry, minijobType: incomeMinijobType(value) };
  if (field === "considerPensionInsurance") return { ...entry, considerPensionInsurance: value === "true" };
  if (field === "isRvExempt") return { ...entry, isRvExempt: value === "true" };
  if (field === "shortTermEmploymentDays") return { ...entry, shortTermEmploymentDays: nullableInputNumber(value) };
  if (field === "shortTermEmploymentMonths") return { ...entry, shortTermEmploymentMonths: nullableInputNumber(value) };
  if (field === "studentEmploymentMode") return { ...entry, studentEmploymentMode: incomeStudentEmploymentMode(value) };
  if (field === "requiresManualTaxReview") return { ...entry, requiresManualTaxReview: value === "true" };
  if (field === "employer") return { ...entry, employer: value };
  if (field === "note") return { ...entry, note: value };
  if (field === "annualNetIncome") return { ...entry, annualNetIncome: nullableInputNumber(value) };
  if (field === "annualGrossIncome") return { ...entry, annualGrossIncome: nullableInputNumber(value) };
  if (field === "taxesAndDeductions") return { ...entry, taxesAndDeductions: nullableInputNumber(value) };
  if (field === "taxAdjustment.type") {
    return { ...entry, taxAdjustment: { ...entry.taxAdjustment, type: incomeTaxAdjustmentType(value) } };
  }
  if (field === "taxAdjustment.amount") {
    return { ...entry, taxAdjustment: { ...entry.taxAdjustment, amount: nullableInputNumber(value) } };
  }
  if (field === "capitalGainsAllowance") return { ...entry, capitalGainsAllowance: nullableInputNumber(value) };
  if (field === "capitalGainsChurchTaxEnabled") return { ...entry, capitalGainsChurchTaxEnabled: value === "true" };
  if (field === "capitalGainsChurchTaxRatePercent") {
    return { ...entry, capitalGainsChurchTaxRatePercent: capitalGainsChurchTaxRate(nullableInputNumber(value)) };
  }
  if (field.startsWith("taxDeductionItems.")) {
    const itemField = field.replace("taxDeductionItems.", "");
    if (!isIncomeTaxDeductionField(itemField)) return entry;
    const taxDeductionItems = {
      ...entry.taxDeductionItems,
      [itemField]: nullableInputNumber(value)
    };
    return {
      ...entry,
      taxDeductionItems,
      taxesAndDeductions: incomeTaxDeductionItemsTotal(taxDeductionItems)
    };
  }
  return entry;
}

function isIncomeTaxDeductionField(value: string): value is IncomeTaxDeductionField {
  return INCOME_TAX_DEDUCTION_ROWS.some((row) => row.field === value);
}

function incomeTaxDeductionCategoryTotal(entry: IncomeYearEntry, category: IncomeTaxDeductionCategory): number {
  if (category === "taxes") return incomeYearEntryTaxTotal(entry);
  return INCOME_TAX_DEDUCTION_ROWS.filter((row) => row.category === category).reduce(
    (sum, row) => sum + numberValue(entry.taxDeductionItems[row.field]),
    0
  );
}

function updateIncomeMilestoneEntry(
  entry: CareerMilestone,
  field: string,
  value: string
): CareerMilestone {
  if (field === "impact") return { ...entry, impact: incomeMilestoneImpact(value) };
  if (field === "linkedYear") return { ...entry, linkedYear: value.trim() === "" ? null : incomeInteger(value, state.settings.year) };
  if (field === "date") return { ...entry, date: value };
  if (field === "type") return { ...entry, type: value };
  if (field === "description") return { ...entry, description: value };
  return entry;
}

function updateIncomeSetting(field: keyof IncomeTrackerSettings, value: string): void {
  const settings = state.incomeTracker.settings;
  if (field === "projectionMode") {
    state.incomeTracker = {
      ...state.incomeTracker,
      settings: { ...settings, projectionMode: incomeProjectionMode(value) }
    };
    return;
  }
  if (field === "activeInputTab") return;
  if (field === "manualGrowthRatePercent") {
    state.incomeTracker = {
      ...state.incomeTracker,
      settings: { ...settings, manualGrowthRatePercent: nullableInputNumber(value) }
    };
  } else if (field === "savingsSharePercent") {
    state.incomeTracker = {
      ...state.incomeTracker,
      settings: { ...settings, savingsSharePercent: nullableInputNumber(value) }
    };
  }
}

async function importIncomeCsvFromFile(file: File | undefined): Promise<void> {
  if (!file) return;
  const text = await file.text();
  const imported = incomeTrackerEntriesFromCsvRows(parseCsv(text));
  const importedCount = imported.yearlyEntries.length + imported.milestones.length;
  if (!importedCount) {
    window.alert("Keine gueltigen Einkommen-CSV-Daten gefunden.");
    return;
  }

  state.incomeTracker = {
    ...state.incomeTracker,
    yearlyEntries: sanitizeIncomeYearEntriesWithTaxRules(imported.yearlyEntries),
    milestones: imported.milestones,
    settings: {
      ...state.incomeTracker.settings,
      activeInputTab: imported.yearlyEntries.length ? "yearly" : imported.milestones.length ? "milestones" : "settings"
    }
  };
  renderAll();
  showIncomeExportStatus(`${importedCount} Eintraege aus CSV importiert.`);
}

async function exportIncomeCsv(): Promise<void> {
  const model = incomeTrackerModel();
  await exportCsvFile("jahresnettoeinkommen.csv", incomeTrackerCsv(model), "Einkommen-CSV");
  showIncomeExportStatus("CSV-Export wurde erstellt.");
}

async function importIncomePlanningCsvFromFile(file: File | undefined): Promise<void> {
  if (!file) return;
  const text = await file.text();
  const imported = incomePlanningFromCsvRows(parseCsv(text));
  if (!imported) {
    window.alert("Keine gueltigen Zeitbudget-CSV-Daten gefunden.");
    return;
  }

  const importedCount =
    imported.workBlocks.length +
    imported.habits.length +
    imported.manualBlocks.length +
    imported.calendarStamps.length +
    imported.plannedStamps.length +
    imported.assumptions.sleepSlots.length;
  state.incomePlanning = imported;
  closeIncomePlanningDialog();
  closeIncomeStampPlannerDialog();
  renderAll();
  showIncomePlanningExportStatus(`${importedCount} Zeitbudget-Eintraege aus CSV importiert.`);
}

async function exportIncomePlanningCsvFile(): Promise<void> {
  await exportCsvFile(
    "zeitbudget-und-habits.csv",
    exportIncomePlanningCsv(state.incomePlanning),
    "Zeitbudget-CSV",
    showIncomePlanningExportStatus
  );
}

function exportIncomePdf(): void {
  const model = incomeTrackerModel();
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    showIncomeExportStatus("PDF-Auswertung konnte nicht geoeffnet werden.");
    return;
  }
  reportWindow.document.open();
  reportWindow.document.write(incomePdfHtml(model));
  reportWindow.document.close();
  reportWindow.focus();
  window.setTimeout(() => reportWindow.print(), 250);
  showIncomeExportStatus("PDF-Auswertung wurde im Druckdialog vorbereitet.");
}

function incomeTrackerCsv(model: IncomeTrackerModel): string {
  const rows: string[][] = [["section", "id", "year", "month", "person", "field", "value", "source"]];
  for (const entry of state.incomeTracker.yearlyEntries) {
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "active", String(entry.active), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "visible", String(entry.visible), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "label", entry.label, entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "annualNetIncome", csvValue(incomeYearEntryNetIncome(entry)), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "annualGrossIncome", csvValue(entry.annualGrossIncome), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "taxesAndDeductions", csvValue(entry.taxesAndDeductions), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "taxAdjustmentType", entry.taxAdjustment.type, entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "taxAdjustmentAmount", csvValue(entry.taxAdjustment.amount), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "capitalGainsAllowance", csvValue(entry.capitalGainsAllowance), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "capitalGainsChurchTaxEnabled", String(entry.capitalGainsChurchTaxEnabled), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "capitalGainsChurchTaxRatePercent", csvValue(entry.capitalGainsChurchTaxRatePercent), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "employmentContext", entry.employmentContext ?? "job_loss", entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "minijobType", entry.minijobType ?? "commercial", entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "considerPensionInsurance", String(Boolean(entry.considerPensionInsurance)), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "isRvExempt", String(Boolean(entry.isRvExempt)), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "shortTermEmploymentDays", csvValue(entry.shortTermEmploymentDays ?? null), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "shortTermEmploymentMonths", csvValue(entry.shortTermEmploymentMonths ?? null), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "studentEmploymentMode", entry.studentEmploymentMode ?? "minijob", entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "requiresManualTaxReview", String(Boolean(entry.requiresManualTaxReview)), entry.source]);
    for (const row of INCOME_TAX_DEDUCTION_ROWS) {
      rows.push([
        "yearly_tax_detail",
        entry.id,
        String(entry.year),
        "",
        entry.person,
        `${row.nr} ${row.label}`,
        csvValue(entry.taxDeductionItems[row.field]),
        entry.source
      ]);
    }
  }
  for (const entry of state.incomeTracker.milestones) {
    rows.push(["milestone", entry.id, String(entry.linkedYear ?? ""), entry.date, "", entry.type, entry.impact, ""]);
    rows.push(["milestone", entry.id, String(entry.linkedYear ?? ""), entry.date, "", "description", entry.description, ""]);
  }
  for (const year of model.years) {
    rows.push(["calculated", "", String(year.year), "", "", "annualNet", csvValue(year.annualNet), year.source ?? ""]);
    rows.push(["calculated", "", String(year.year), "", "", "netRatio", csvValue(year.netRatio), "gross_net"]);
    rows.push(["calculated", "", String(year.year), "", "", "realNet", csvValue(year.realNet), "general_inflation"]);
  }
  for (const item of model.chartSummaries) {
    rows.push(["chart_summary", "", "", "", "", item.title, item.text, "calculated"]);
  }
  rows.push(["data_basis", "", "", "", "", "Hinweis", "Nur Nutzereingaben, berechnete Werte und aktivierte Annahmen.", ""]);
  return rows.map((row) => row.map(incomeCsvCell).join(";")).join("\n");
}

function incomeTrackerEntriesFromCsvRows(rows: string[][]): {
  yearlyEntries: IncomeYearEntry[];
  milestones: CareerMilestone[];
} {
  const emptyImport = { yearlyEntries: [], milestones: [] };
  if (!rows.length) return emptyImport;

  const header = rows[0].map((value) => value.trim().replace(/^\uFEFF/, "").toLowerCase());
  const hasHeader = header.includes("section") && header.includes("field");
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const get = (row: string[], names: string[], fallbackIndex: number): string => {
    if (hasHeader) {
      for (const name of names) {
        const index = header.indexOf(name);
        if (index >= 0) return row[index] ?? "";
      }
    }
    return fallbackIndex >= 0 ? row[fallbackIndex] ?? "" : "";
  };

  const yearlyEntries = new Map<string, IncomeYearEntry>();
  const milestones = new Map<string, CareerMilestone>();

  dataRows.forEach((row, index) => {
    const section = get(row, ["section"], 0).trim().toLowerCase();
    const sourceId = get(row, ["id"], 1).trim();
    const rowKey = sourceId || String(index);
    const field = get(row, ["field"], 5).trim();
    const fieldKey = field.toLowerCase();
    const value = get(row, ["value"], 6).trim();
    const yearValue = get(row, ["year"], 2).trim();
    const monthValue = get(row, ["month"], 3).trim();
    const personValue = get(row, ["person"], 4).trim();
    const sourceValue = get(row, ["source"], 7).trim();

    if (section === "yearly" || section === "yearly_tax_detail") {
      const key = `yearly-${rowKey}`;
      const entry =
        yearlyEntries.get(key) ??
        ({
          id: createId(),
          active: true,
          visible: true,
          year: incomeCsvYear(yearValue, state.settings.year),
          label: "salary",
          person: incomePerson(personValue),
          annualNetIncome: null,
          annualGrossIncome: null,
          taxesAndDeductions: null,
          taxDeductionItems: emptyIncomeTaxDeductionItems(),
          taxAdjustment: emptyIncomeTaxAdjustment(),
          capitalGainsAllowance: null,
          capitalGainsChurchTaxEnabled: false,
          capitalGainsChurchTaxRatePercent: DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT,
          employmentContext: "job_loss",
          minijobType: "commercial",
          considerPensionInsurance: false,
          isRvExempt: false,
          shortTermEmploymentDays: null,
          shortTermEmploymentMonths: null,
          studentEmploymentMode: "minijob",
          requiresManualTaxReview: false,
          employer: "",
          note: "",
          source: incomeYearSource(sourceValue)
        } satisfies IncomeYearEntry);
      entry.year = incomeCsvYear(yearValue, entry.year);
      entry.person = incomePerson(personValue || entry.person);
      entry.source = incomeYearSource(sourceValue || entry.source);
      if (section === "yearly_tax_detail") {
        const taxField = incomeTaxDeductionFieldFromCsv(field);
        if (taxField) {
          entry.taxDeductionItems = { ...entry.taxDeductionItems, [taxField]: incomeCsvNumber(value) };
          entry.taxesAndDeductions = incomeTaxDeductionItemsTotal(entry.taxDeductionItems);
        }
      } else if (fieldKey === "active") {
        entry.active = incomeCsvBoolean(value, true);
      } else if (fieldKey === "visible") {
        entry.visible = incomeCsvBoolean(value, true);
      } else if (fieldKey === "annualnetincome") {
        entry.annualNetIncome = incomeCsvNumber(value);
      } else if (fieldKey === "label") {
        entry.label = incomeYearLabel(value);
      } else if (fieldKey === "annualgrossincome") {
        entry.annualGrossIncome = incomeCsvNumber(value);
      } else if (fieldKey === "taxesanddeductions") {
        entry.taxesAndDeductions = incomeCsvNumber(value);
      } else if (fieldKey === "taxadjustmenttype") {
        entry.taxAdjustment = { ...entry.taxAdjustment, type: incomeTaxAdjustmentType(value) };
      } else if (fieldKey === "taxadjustmentamount") {
        entry.taxAdjustment = { ...entry.taxAdjustment, amount: incomeCsvNumber(value) };
      } else if (fieldKey === "capitalgainsallowance") {
        entry.capitalGainsAllowance = incomeCsvNumber(value);
      } else if (fieldKey === "capitalgainschurchtaxenabled") {
        entry.capitalGainsChurchTaxEnabled = incomeCsvBoolean(value, false);
      } else if (fieldKey === "capitalgainschurchtaxratepercent") {
        entry.capitalGainsChurchTaxRatePercent = capitalGainsChurchTaxRate(incomeCsvNumber(value));
      } else if (fieldKey === "employmentcontext") {
        entry.employmentContext = incomeEmploymentContext(value);
      } else if (fieldKey === "minijobtype") {
        entry.minijobType = incomeMinijobType(value);
      } else if (fieldKey === "considerpensioninsurance") {
        entry.considerPensionInsurance = incomeCsvBoolean(value, false);
      } else if (fieldKey === "isrvexempt") {
        entry.isRvExempt = incomeCsvBoolean(value, false);
      } else if (fieldKey === "shorttermemploymentdays") {
        entry.shortTermEmploymentDays = incomeCsvNumber(value);
      } else if (fieldKey === "shorttermemploymentmonths") {
        entry.shortTermEmploymentMonths = incomeCsvNumber(value);
      } else if (fieldKey === "studentemploymentmode") {
        entry.studentEmploymentMode = incomeStudentEmploymentMode(value);
      } else if (fieldKey === "requiresmanualtaxreview") {
        entry.requiresManualTaxReview = incomeCsvBoolean(value, false);
      } else if (fieldKey === "employer") {
        entry.employer = value;
      }
      yearlyEntries.set(key, entry);
      return;
    }

    if (section === "milestone") {
      const key = `milestone-${rowKey}`;
      const entry =
        milestones.get(key) ??
        ({
          id: createId(),
          date: monthValue,
          type: "Sonstiges",
          description: "",
          impact: "positive",
          linkedYear: incomeCsvYearOrNull(yearValue)
        } satisfies CareerMilestone);
      entry.date = monthValue || entry.date;
      entry.linkedYear = incomeCsvYearOrNull(yearValue) ?? entry.linkedYear;
      if (fieldKey === "description") {
        entry.description = value;
      } else if (field) {
        entry.type = field;
        entry.impact = incomeMilestoneImpact(value);
      }
      milestones.set(key, entry);
      return;
    }

  });

  return {
    yearlyEntries: Array.from(yearlyEntries.values()).filter(incomeCsvYearlyEntryHasData),
    milestones: Array.from(milestones.values()).filter((entry) => entry.date || entry.description || entry.type !== "Sonstiges")
  };
}

function incomeCsvYearlyEntryHasData(entry: IncomeYearEntry): boolean {
  return (
    entry.annualNetIncome !== null ||
    entry.annualGrossIncome !== null ||
    entry.taxesAndDeductions !== null ||
    entry.capitalGainsAllowance !== null ||
    entry.capitalGainsChurchTaxEnabled ||
    incomeTaxDeductionItemsTotal(entry.taxDeductionItems) !== null ||
    incomeTaxDeductionItemsHaveData(entry.taxDeductionItems) ||
    entry.taxAdjustment.amount !== null
  );
}

function incomeTaxDeductionItemsHaveData(items: IncomeTaxDeductionItems): boolean {
  return INCOME_TAX_DEDUCTION_ROWS.some((row) => items[row.field] !== null && items[row.field] !== undefined);
}

function incomeCsvNumber(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  const cleaned = text.replace(/[^\d,.-]/g, "");
  const normalized = cleaned.includes(",") ? cleaned.replaceAll(".", "").replace(",", ".") : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function incomeCsvBoolean(value: string, fallback: boolean): boolean {
  const text = normalizeHeader(value);
  if (!text) return fallback;
  if (["true", "1", "ja", "yes", "aktiv", "sichtbar"].includes(text)) return true;
  if (["false", "0", "nein", "no", "inaktiv", "aus", "unsichtbar"].includes(text)) return false;
  return fallback;
}

function incomeCsvYear(value: string, fallback: number): number {
  const parsed = incomeCsvNumber(value);
  return parsed === null ? fallback : clamp(Math.round(parsed), 1900, 2200);
}

function incomeCsvYearOrNull(value: string): number | null {
  const parsed = incomeCsvNumber(value);
  return parsed === null ? null : clamp(Math.round(parsed), 1900, 2200);
}

function incomeTaxDeductionFieldFromCsv(value: string): IncomeTaxDeductionField | null {
  const text = value.toLowerCase();
  if (text.includes("kirchensteuer zur kapitalertragsteuer")) return "capitalGainsChurchTax";
  if (text.includes("solidar") && text.includes("kapitalertragsteuer")) return "capitalGainsSolidaritySurcharge";
  if (text.includes("kapitalertragsteuer")) return "capitalGainsTax";
  if (text.startsWith("4 ") || text.includes("lohnsteuer")) return "wageTax";
  if (text.startsWith("5 ") || text.includes("solidar")) return "solidaritySurcharge";
  if (text.startsWith("6 ") || text.includes("kirchensteuer")) return "churchTax";
  if (text.startsWith("22 ") || text.includes("arbeitgeber")) return "employerPensionInsurance";
  if (text.startsWith("23 ") || text.includes(" rv") || text.includes("renten")) return "pensionInsurance";
  if (text.startsWith("25 ") || text.includes(" kv") || text.includes("kranken")) return "healthInsurance";
  if (text.startsWith("26 ") || text.includes(" pv") || text.includes("pflege")) return "careInsurance";
  if (text.startsWith("27 ") || text.includes(" av") || text.includes("arbeitslosen")) return "unemploymentInsurance";
  return null;
}

function incomePdfHtml(model: IncomeTrackerModel): string {
  const yearlyInputRows = state.incomeTracker.yearlyEntries
    .map(
      (entry) => `
      <tr>
        <td>${entry.active ? "Ja" : "Nein"}</td>
        <td>${entry.visible ? "Ja" : "Nein"}</td>
        <td>${entry.year}</td>
        <td>${escapeHtml(incomeYearLabelMeta(entry.label).label)}</td>
        <td>${incomeYearEntryNetIncome(entry) !== null ? money(incomeYearEntryNetIncome(entry) ?? 0) : "-"}</td>
        <td>${entry.annualGrossIncome !== null ? money(entry.annualGrossIncome) : "-"}</td>
        <td>${incomeYearEntryTaxDeductions(entry) !== null ? money(incomeYearEntryTaxDeductions(entry) ?? 0) : "-"}</td>
        <td>${escapeHtml(INCOME_SOURCE_LABELS[entry.source])}</td>
      </tr>`
    )
    .join("");
  const milestoneRows = state.incomeTracker.milestones
    .map(
      (entry) => `
      <tr>
        <td>${escapeHtml(entry.date)}</td>
        <td>${escapeHtml(entry.type)}</td>
        <td>${escapeHtml(entry.impact)}</td>
        <td>${entry.linkedYear ?? "-"}</td>
        <td>${escapeHtml(entry.description)}</td>
      </tr>`
    )
    .join("");
  const yearRows = model.years
    .map(
      (year) => `
      <tr>
        <td>${year.year}</td>
        <td>${year.annualNet !== null ? money(year.annualNet) : "-"}</td>
        <td>${year.source ? INCOME_SOURCE_LABELS[year.source] : "nur Meilenstein"}</td>
        <td>${year.netRatio !== null ? percent(year.netRatio) : "-"}</td>
        <td>${year.realNet !== null ? money(year.realNet) : "-"}</td>
      </tr>`
    )
    .join("");
  const projectionRows = model.projection.horizons
    .map((item) => `<tr><td>${item.years} Jahre</td><td>${item.year}</td><td>${money(item.value)}</td></tr>`)
    .join("");
  return `<!doctype html>
    <html lang="de">
      <head>
        <meta charset="utf-8" />
        <title>Jahresnettoeinkommen Auswertung</title>
        <style>
          body { color: #1f2528; font-family: Arial, sans-serif; line-height: 1.45; margin: 32px; }
          h1 { margin-bottom: 4px; }
          h2 { font-size: 18px; margin-top: 28px; }
          table { border-collapse: collapse; font-size: 13px; margin-top: 10px; width: 100%; }
          th, td { border-bottom: 1px solid #d8d0c2; padding: 7px; text-align: left; }
          th { background: #f0ece3; }
          .note { color: #687071; }
        </style>
      </head>
      <body>
        <h1>Jahresnettoeinkommen Auswertung</h1>
        <p class="note">Erstellt am ${escapeHtml(new Date().toLocaleString("de-DE"))}. Datenbasis: Nur Nutzereingaben, berechnete Werte und aktivierte Annahmen.</p>
        <h2>Diagrammzusammenfassung</h2>
        <ul>${model.chartSummaries.map((item) => `<li><strong>${escapeHtml(item.title)}:</strong> ${escapeHtml(item.text)}</li>`).join("")}</ul>
        <h2>Jahreswerte</h2>
        <table>
          <thead><tr><th>Aktiv</th><th>View</th><th>Jahr</th><th>Label</th><th>Jahresnetto</th><th>Jahresbrutto</th><th>Steuer / Abgaben</th><th>Status</th></tr></thead>
          <tbody>${yearlyInputRows || '<tr><td colspan="8">Keine Jahreswerte vorhanden.</td></tr>'}</tbody>
        </table>
        <h2>Karriere-Meilensteine</h2>
        <table>
          <thead><tr><th>Datum</th><th>Typ</th><th>Einfluss</th><th>Jahr</th><th>Beschreibung</th></tr></thead>
          <tbody>${milestoneRows || '<tr><td colspan="5">Keine Meilensteine vorhanden.</td></tr>'}</tbody>
        </table>
        <h2>Berechnete Jahreswerte</h2>
        <table>
          <thead><tr><th>Jahr</th><th>Jahresnetto</th><th>Status</th><th>Nettoquote</th><th>Realwert</th></tr></thead>
          <tbody>${yearRows || '<tr><td colspan="5">Keine Jahreswerte vorhanden.</td></tr>'}</tbody>
        </table>
        <h2>Projektion</h2>
        <table>
          <thead><tr><th>Horizont</th><th>Jahr</th><th>Prognostiziertes Jahresnetto</th></tr></thead>
          <tbody>${projectionRows || '<tr><td colspan="3">Keine Projektion aktiviert oder keine Projektionsrate verfuegbar.</td></tr>'}</tbody>
        </table>
      </body>
    </html>`;
}

function nullableInputNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function incomeInteger(value: string, fallback: number): number {
  const parsed = nullableInputNumber(value);
  return parsed === null ? fallback : Math.round(parsed);
}

function incomePerson(value: string): IncomePerson {
  if (value === "person1" || value === "person2" || value === "household") return value;
  return "household";
}

function incomeYearSource(value: string): IncomeYearEntrySource {
  return value === "manual" ? "manual" : "annual_statement";
}

function incomeEmploymentContext(value: string): IncomeEmploymentContext {
  if (value === "earned_claim" || value === "other") return value;
  return "job_loss";
}

function incomeMinijobType(value: string): IncomeMinijobType {
  return value === "private_household" ? "private_household" : "commercial";
}

function incomeStudentEmploymentMode(value: string): IncomeStudentEmploymentMode {
  return value === "short_term" ? "short_term" : "minijob";
}

function incomeTaxAdjustmentType(value: string): IncomeTaxAdjustmentType {
  return value === "payment" ? "payment" : "refund";
}

function incomeMilestoneImpact(value: string): CareerMilestoneImpact {
  if (value === "negative" || value === "neutral" || value === "positive") return value;
  return "positive";
}

function incomeProjectionMode(value: string): IncomeProjectionMode {
  return INCOME_PROJECTION_MODES.includes(value as IncomeProjectionMode) ? (value as IncomeProjectionMode) : "off";
}

function signedMoney(value: number): string {
  return `${value > 0 ? "+" : ""}${money(value)}`;
}

function signedPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${percent(value)}`;
}

function signedPercentagePoints(value: number): string {
  const formatted = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
  return `${value > 0 ? "+" : ""}${formatted} Prozentpunkte`;
}

function csvValue(value: number | string | null): string {
  return value === null ? "" : String(value);
}

function incomeCsvCell(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function cssEscape(value: string): string {
  const css = (globalThis as typeof globalThis & { CSS?: { escape?: (input: string) => string } }).CSS;
  return typeof css?.escape === "function" ? css.escape(value) : value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function showIncomeExportStatus(message: string): void {
  const status = document.querySelector<HTMLParagraphElement>("#incomeExportStatus");
  if (status) status.textContent = message;
  if (exportStatusTimeoutId) window.clearTimeout(exportStatusTimeoutId);
  exportStatusTimeoutId = window.setTimeout(() => {
    if (status) status.textContent = "";
    exportStatusTimeoutId = undefined;
  }, 3500);
}

function showIncomePlanningExportStatus(message: string): void {
  const status = document.querySelector<HTMLSpanElement>("#incomePlanningExportStatus");
  if (status) status.textContent = message;
  if (exportStatusTimeoutId) window.clearTimeout(exportStatusTimeoutId);
  exportStatusTimeoutId = window.setTimeout(() => {
    if (status) status.textContent = "";
    exportStatusTimeoutId = undefined;
  }, 3500);
}

function renderRealEstateCalculations(result: RealEstateFinancingResult, chartProjectionYears: number): void {
  latestRealEstateResult = result;
  const validation = document.querySelector<HTMLDivElement>("#realEstateValidation");
  if (validation) {
    if (result.validationErrors.length) {
      validation.classList.add("error");
      validation.innerHTML = result.validationErrors.map((item) => `<div>${escapeHtml(item)}</div>`).join("");
    } else {
      validation.classList.remove("error");
      validation.textContent = "Eingaben sind plausibel. Tilgungsplan wurde aktualisiert.";
    }
  }

  setText("realEstateDerivedEquityMetric", money(result.equityCapital));
  setText("realEstateDerivedMonthlyPaymentMetric", money(result.monthlyPayment));
  setText("realEstateDerivedInitialRepaymentMetric", percent(result.derivedInitialRepaymentPercent));
  setText("realEstateDerivedSpecialRepaymentMetric", money(result.annualSpecialRepayment));
  setText("realEstateTotalProjectCostMetric", money(result.totalProjectCost));
  setText("realEstateStartDebtMetric", money(result.startLoanAmount));
  setText("realEstateTotalLoanCostMetric", money(result.totalLoanCost));
  const finalLoanYear = result.years[result.years.length - 1];
  const actualFinancingStartYear =
    realEstateActualPaymentStartYear(result) ?? result.years[0]?.year ?? currentRealEstateFinancingStartYear();
  const actualFinancingStartAge = Math.max(0, actualFinancingStartYear - state.investment.birthYear);
  const actualFinancingEndAge = Math.max(actualFinancingStartAge, result.financingEndYear - state.investment.birthYear);
  const financingYearsText = realEstateFinancingYearsText(result);
  setText(
    "realEstateCalculatedEndAgeMetric",
    finalLoanYear && finalLoanYear.loanEnd <= 0 ? `${intNumber(actualFinancingEndAge)} Jahre` : "nicht getilgt"
  );
  setText("realEstateFinancingYearsMetric", financingYearsText);

  const chartYears = result.years.slice(0, Math.max(1, chartProjectionYears));
  selectedRealEstateYear = defaultRealEstateDetailYear(chartYears, selectedRealEstateYear);

  const repaymentHost = document.querySelector<HTMLDivElement>("#realEstateRepaymentChart");
  if (repaymentHost) {
    repaymentHost.innerHTML = renderRealEstateRepaymentChart({
      points: chartYears,
      selectedYear: selectedRealEstateYear,
      loanCostBasis: result.totalLoanCost,
      financingEndYear: result.financingEndYear,
      formatMoney: (value) => money(value)
    });
  }

  const trendHost = document.querySelector<HTMLDivElement>("#realEstateTrendChart");
  if (trendHost) {
    trendHost.innerHTML = renderRealEstateTrendChart({
      points: chartYears,
      selectedYear: selectedRealEstateYear,
      financingEndYear: result.financingEndYear,
      formatMoney: (value) => money(value)
    });
  }
}

function realEstateFinancingStartYear(currentYear: number, birthYear: number, financingStartAge: number): number {
  if (!Number.isFinite(financingStartAge) || financingStartAge <= 0) return currentYear;
  const targetAgeYear = birthYear + Math.floor(financingStartAge);
  return Math.max(currentYear, targetAgeYear);
}

function currentRealEstateFinancingStartYear(): number {
  return realEstateFinancingStartYear(state.settings.year, state.investment.birthYear, state.realEstate.financingStartAge);
}

function realEstateActualPaymentStartYear(result: RealEstateFinancingResult): number | null {
  const firstPaymentMonth = result.months.find((month) => {
    return month.interestPaid + month.principalPaid + month.specialRepayment > 0;
  });
  return firstPaymentMonth?.year ?? null;
}

function realEstateFinancingYearsText(result: RealEstateFinancingResult | null): string {
  if (!result) return "-";
  const actualFinancingStartYear =
    realEstateActualPaymentStartYear(result) ?? result.years[0]?.year ?? currentRealEstateFinancingStartYear();
  const actualFinancingStartAge = Math.max(0, actualFinancingStartYear - state.investment.birthYear);
  const actualFinancingEndAge = Math.max(actualFinancingStartAge, result.financingEndYear - state.investment.birthYear);
  return `${intNumber(actualFinancingStartAge)} -> ${intNumber(actualFinancingEndAge)} | ${intNumber(result.financingYears)} Jahre`;
}

function currentRealEstateProjectionYears(startYear: number, investmentEndAge: number): number {
  const investmentEndYear = state.investment.birthYear + Math.floor(investmentEndAge);
  const saleYear = state.realEstate.plannedSaleYear;
  const rawProjectionEndYear = saleYear !== null && saleYear >= startYear ? Math.round(saleYear) : investmentEndYear;
  const projectionEndYear = Math.min(rawProjectionEndYear, planningEndYear());
  return clamp(Math.round(projectionEndYear - startYear + 1), 1, 80);
}

function currentRealEstateMaximumProjectionYears(startYear: number): number {
  const saleYear = state.realEstate.plannedSaleYear;
  const globalProjectionYears = clamp(
    Math.round(planningEndYear() - startYear + 1),
    1,
    MAX_REAL_ESTATE_PROJECTION_YEARS
  );
  if (saleYear !== null && saleYear >= startYear) {
    return Math.min(clamp(Math.round(saleYear - startYear + 1), 1, MAX_REAL_ESTATE_PROJECTION_YEARS), globalProjectionYears);
  }
  return globalProjectionYears;
}

function currentCombinedRealEstateProjectionYears(
  startYear: number,
  standardProjection: AssetProjection,
  retirementProjection: AssetProjection,
  standardBirthYear: number,
  retirementBirthYear: number
): number {
  const standardEndYear = standardBirthYear + Math.floor(standardProjection.endAge);
  const retirementEndYear = retirementBirthYear + Math.floor(retirementProjection.endAge);
  const combinedEndYear = Math.max(standardEndYear, retirementEndYear);
  const saleYear = state.realEstate.plannedSaleYear;
  const rawProjectionEndYear =
    saleYear !== null && saleYear >= startYear ? Math.min(Math.round(saleYear), combinedEndYear) : combinedEndYear;
  const projectionEndYear = Math.min(rawProjectionEndYear, planningEndYear());
  return clamp(Math.round(projectionEndYear - startYear + 1), 1, 80);
}

function combinedProjectionWithoutAccounts(baseProjection: AssetProjection): AssetProjection {
  return {
    ...baseProjection,
    points: [],
    monthlyRate: 0,
    annualSavingsRate: 0,
    monthlyPension: 0,
    realMonthlyPension: 0,
    percentageWithdrawalMonthlyAtStart: 0,
    percentageWithdrawalAnnualAtStart: 0,
    withdrawalRemainingSavingsMonthlyAtStart: 0,
    withdrawalGainMonthlyAtStart: 0,
    endAge: 0,
    retirementAge: 0
  };
}

function realEstateDepotSavingsRateAvailable(standardProjection: AssetProjection): boolean {
  return (
    state.realEstate.includeWithdrawalGainAsPaymentSource &&
    standardProjection.monthlyRate > 0 &&
    standardProjection.percentageWithdrawalMonthlyAtStart > standardProjection.monthlyRate
  );
}

function realEstateWithdrawalStartYear(standardProjection: AssetProjection, settings: InvestmentSettings): number {
  return settings.birthYear + Math.floor(standardProjection.percentageWithdrawalStartAge);
}

interface RealEstateWithdrawalProfile {
  accountId: string;
  projection: AssetProjection;
  settings: InvestmentSettings;
  withdrawalStartYear: number;
  withdrawalEndYear: number;
  withdrawalGainMonthly: number;
  depotSavingsRateMonthly: number;
  depotSavingsRateAvailable: boolean;
}

function realEstateWithdrawalProfiles(accountIds: string[] | null = null): RealEstateWithdrawalProfile[] {
  const withdrawalAccounts = accountIds ? planningAccountsByIds(accountIds) : selectedRealEstateWithdrawalAccounts();
  return withdrawalAccounts.map((account) => {
    const settings = state.investmentByAccountId[account.id] ?? defaultInvestmentSettingsForNewAccount();
    const projection = buildDepotAssetProjection("standard", account.id);
    const withdrawalStartYear = realEstateWithdrawalStartYear(projection, settings);
    const withdrawalEndYear = Math.min(planningEndYear(), settings.birthYear + Math.floor(projection.endAge));
    const depotSavingsRateAvailable = realEstateDepotSavingsRateAvailable(projection);
    return {
      accountId: account.id,
      projection,
      settings,
      withdrawalStartYear,
      withdrawalEndYear,
      withdrawalGainMonthly: Math.max(0, projection.withdrawalGainMonthlyAtStart),
      depotSavingsRateMonthly: depotSavingsRateAvailable ? Math.max(0, projection.monthlyRate) : 0,
      depotSavingsRateAvailable
    };
  });
}

function realEstateSourceSchedule(
  startYear: number,
  projectionYears: number,
  accountIds = state.ui.selectedRealEstateAccountIds
): RealEstateFinancingSourceSchedule {
  const monthCount = Math.max(12, Math.min(80, Math.round(projectionYears || 1)) * 12);
  const sourceAccounts = planningAccountsByIds(accountIds);
  const equityPositions = selectedRealEstateSourcePositions("equityCapital", sourceAccounts);
  const monthlyPositions = selectedRealEstateSourcePositions("monthlyPayment", sourceAccounts);
  const specialPositions = selectedRealEstateSourcePositions("specialRepayment", sourceAccounts);
  const equityCapital = equityPositions.reduce((sum, position) => {
    return sum + (position.payoutType === "once" && position.payoutYear <= startYear ? Number(position.amount) : 0);
  }, 0);
  const monthlyPaymentSavings: number[] = [];
  const withdrawalGainPayments: number[] = [];
  const specialRepayments: number[] = [];
  const withdrawalProfiles = realEstateWithdrawalProfiles(accountIds);
  const depotSavingsRatePayments: number[] = [];

  for (let index = 0; index < monthCount; index += 1) {
    const year = startYear + Math.floor(index / 12);
    const month = (index % 12) + 1;
    monthlyPaymentSavings.push(
      monthlyPositions.reduce((sum, position) => sum + investmentContributionForMonth(position, year, month), 0)
    );
    const withdrawalGain = state.realEstate.includeWithdrawalGainAsPaymentSource
      ? withdrawalProfiles.reduce((sum, profile) => {
          const activeYear = year >= profile.withdrawalStartYear && year <= profile.withdrawalEndYear;
          return sum + (activeYear ? profile.withdrawalGainMonthly : 0);
        }, 0)
      : 0;
    const depotSavingsRate = state.realEstate.repaymentSources.useDepotSavingsRateAsRepayment
      ? withdrawalProfiles.reduce((sum, profile) => {
          const activeYear = year >= profile.withdrawalStartYear && year <= profile.withdrawalEndYear;
          return sum + (activeYear ? profile.depotSavingsRateMonthly : 0);
        }, 0)
      : 0;
    withdrawalGainPayments.push(withdrawalGain);
    depotSavingsRatePayments.push(depotSavingsRate);
    specialRepayments.push(
      specialPositions.reduce((sum, position) => {
        return (
          sum +
          (position.payoutType === "once"
            ? oneTimeInvestmentContributionForMonth(position, year, month)
            : investmentContributionForMonth(position, year, month))
        );
      }, 0)
    );
  }

  return { equityCapital, monthlyPaymentSavings, withdrawalGainPayments, depotSavingsRatePayments, specialRepayments };
}

function selectedRealEstateSourcePositions(
  kind: RealEstatePaymentSourceKind,
  sourceAccounts = selectedRealEstateSourceAccounts()
): ReservePosition[] {
  const positions = sourceAccounts.flatMap((account) => account.yearlyRows);
  const selectedIds = new Set(realEstateSourceIds(kind));
  return positions.filter(
    (position) =>
      position.active &&
      position.type === "savings" &&
      positionFlow(position) === "expense" &&
      selectedIds.has(position.id)
  );
}

function selectedCombinedCashPositions(account = selectedCombinedCashPlanningAccount()): ReservePosition[] {
  if (!account) return [];
  const selectedIds = new Set(state.combinedWealth.cashPositionIds);
  return combinedCashSelectablePositions(account).filter((position) => selectedIds.has(position.id));
}

function combinedCashSelectablePositions(account = selectedCombinedCashPlanningAccount()): ReservePosition[] {
  if (!account) return [];
  const blockedIds = combinedCashBlockedPositionIds();
  return account.yearlyRows.filter(
    (position) =>
      position.active &&
      position.type === "savings" &&
      positionFlow(position) === "expense" &&
      !blockedIds.has(position.id)
  );
}

function combinedCashBlockedPositionIds(): Set<string> {
  return new Set([...investmentSelectedPositionIds(), ...realEstateSelectedSourceIds()]);
}

function combinedCashSelectedPositionIds(): Set<string> {
  return new Set(state.combinedWealth.cashPositionIds);
}

function calculateCombinedWealthYears(
  realEstate: RealEstateFinancingResult,
  depotProjections: CombinedWealthDepotProjection[],
  pension: ReturnType<typeof combinedPensionInput>
): CombinedWealthYear[] {
  const depotEndYear = depotProjections.reduce(
    (maxYear, depot) => Math.max(maxYear, depot.birthYear + depot.projection.endAge),
    state.settings.year
  );
  const pensionEndYear = pension.enabled ? pension.retirementYear + 35 : state.settings.year;
  const realEstateEndYear = realEstate.years.at(-1)?.year ?? state.settings.year;
  const horizonYears = combinedWealthHorizonYears(
    state.settings.year,
    Math.max(depotEndYear, realEstateEndYear),
    pensionEndYear,
    planningEndYear()
  );

  const cashContribution = combinedCashContribution(horizonYears, selectedCombinedCashPlanningAccount());

  return buildCombinedWealthSeries({
    startYear: state.settings.year,
    horizonYears,
    cashStartValue: cashContribution.cashStartValue,
    yearlyCashDelta: cashContribution.yearlyCashDelta,
    yearlyCashDeltas: cashContribution.yearlyCashDeltas,
    realEstateSaleYear: state.realEstate.purchaseActivated && state.combinedWealth.includeRealEstateFinancing
      ? state.realEstate.plannedSaleYear
      : null,
    realEstateEstimatedSaleValue: state.realEstate.estimatedSaleValue,
    realEstateEquityCapital: realEstate.equityCapital,
    realEstateStartValue: realEstate.effectivePropertyStartValue,
    depotProjections,
    pension,
    realEstateYears: realEstate.years,
    toggles: state.combinedWealth
  });
}

function inactiveCombinedRealEstateResult(startYear: number): RealEstateFinancingResult {
  return {
    years: [],
    months: [],
    startLoanAmount: 0,
    equityCapital: 0,
    monthlyPayment: 0,
    derivedInitialRepaymentPercent: 0,
    annualSpecialRepayment: 0,
    effectivePropertyStartValue: 0,
    totalProjectCost: 0,
    totalInterestDue: 0,
    totalInterestPaid: 0,
    totalInterestShortfall: 0,
    totalLoanCost: 0,
    financingYears: 0,
    projectionYears: 0,
    financingEndYear: startYear,
    projectionEndYear: startYear,
    validationErrors: []
  };
}

function combinedDepotProjectionInputs(account: PlanningAccount | null): CombinedWealthDepotProjection[] {
  if (!account) return [];
  return selectedCombinedDepotKeys().map((key) => {
    const projection = buildDepotAssetProjection(key, account.id);
    const settings = depotInvestmentSettingsForAccount(key, account.id);
    return {
      id: key,
      label: depotLabel(key),
      projection,
      birthYear: settings.birthYear
    };
  });
}

function combinedPensionInput(model: StatutoryPensionModel | null, birthYear: number): {
  enabled: boolean;
  retirementYear: number;
  monthlyAmount: number;
  annualTax: number;
  savingsRatePercent: number;
} {
  const scenarioId = state.combinedWealth.statutoryPensionScenario;
  const scenario = model?.scenarios.find((item) => item.id === scenarioId);
  const scenarioSettings = state.statutoryPension.scenarios[scenarioId];
  const retirementYear = scenario?.retirementYear ?? birthYear + scenarioSettings.retirementAge;
  const scenarioNetPension = Math.max(0, scenario?.netMonthlyPension ?? 0);
  const pensionTaxScale =
    scenarioNetPension > 0 ? state.combinedWealth.statutoryPensionMonthlyAmount / scenarioNetPension : 0;
  return {
    enabled: state.combinedWealth.includeStatutoryPension,
    retirementYear,
    monthlyAmount: state.combinedWealth.statutoryPensionMonthlyAmount,
    annualTax: Math.max(0, scenario?.incomeTaxMonthly ?? 0) * Math.max(0, pensionTaxScale) * 12,
    savingsRatePercent: state.combinedWealth.statutoryPensionSavingsRatePercent
  };
}

function combinedCashContribution(horizonYears: number, account: PlanningAccount | null): {
  cashStartValue: number;
  yearlyCashDelta: number;
  yearlyCashDeltas: number[];
} {
  const cashStartValue = 0;
  const yearlyCashDeltas = Array.from({ length: Math.max(1, horizonYears) }, () => 0);

  if (account && state.combinedWealth.includeCashPositions) {
    const selectedPositions = selectedCombinedCashPositions(account);
    const selectedIds = state.combinedWealth.cashPositionIds;
    for (let yearOffset = 0; yearOffset < yearlyCashDeltas.length; yearOffset += 1) {
      yearlyCashDeltas[yearOffset] = selectedSavingsContributionForProjectionYear(
        selectedPositions,
        selectedIds,
        state.settings.year,
        yearOffset
      );
    }
  }

  const yearlyCashDelta = yearlyCashDeltas[0] ?? 0;
  if (!Number.isFinite(cashStartValue) || !Number.isFinite(yearlyCashDelta)) {
    return { cashStartValue: 0, yearlyCashDelta: 0, yearlyCashDeltas };
  }

  return { cashStartValue, yearlyCashDelta, yearlyCashDeltas };
}

function renderCombinedWealthCalculations(years: CombinedWealthYear[]): void {
  latestCombinedWealthYears = years;
  if (!selectedCombinedWealthYear && years.length) {
    selectedCombinedWealthYear = years[years.length - 1].year;
  }
  if (selectedCombinedWealthYear && !years.some((entry) => entry.year === selectedCombinedWealthYear)) {
    selectedCombinedWealthYear = years[years.length - 1]?.year ?? null;
  }

  const chartHost = document.querySelector<HTMLDivElement>("#combinedWealthChart");
  if (chartHost) {
    chartHost.innerHTML = renderCombinedWealthChart({
      points: years,
      selectedYear: selectedCombinedWealthYear,
      lineVisibility: combinedWealthLineVisibility,
      formatMoney: (value) => money(value)
    });
  }

  const detail = document.querySelector<HTMLDivElement>("#combinedWealthLifeSummary");
  if (!detail) return;
  detail.innerHTML = renderCombinedWealthLifeSummary({
    points: years,
    taxesAndDeductions: combinedTaxesAndDeductions(years),
    formatMoney: (value) => money(value),
    formatInt: (value) => intNumber(value)
  });
}

function combinedTaxesAndDeductions(years: CombinedWealthYear[]): number {
  if (!years.length) return 0;
  const startYear = years[0].year;
  const endYear = years[years.length - 1].year;
  return state.incomeTracker.yearlyEntries.reduce((sum, entry) => {
    if (!entry.active || entry.year < startYear || entry.year > endYear) return sum;
    return sum + incomeYearEntryTaxTotal(entry);
  }, 0);
}

function toggleCombinedWealthLine(lineId: CombinedWealthLineId | undefined): void {
  if (!lineId || !(lineId in combinedWealthLineVisibility)) return;
  combinedWealthLineVisibility = {
    ...combinedWealthLineVisibility,
    [lineId]: !combinedWealthLineVisibility[lineId]
  };
  renderCombinedWealthCalculations(latestCombinedWealthYears);
}

function renderStatutoryPensionCalculations(birthYear: number): void {
  const host = document.querySelector<HTMLDivElement>("#statutoryPensionSection");
  if (!host) return;
  hideStatutoryPensionYearPopup();
  hideStatutoryPensionProjectionYearPopup();
  const model = buildStatutoryPensionModel({
    tracker: state.incomeTracker,
    settings: state.statutoryPension,
    currentYear: state.settings.year,
    birthYear
  });
  latestStatutoryPensionModel = model;
  host.innerHTML = renderStatutoryPensionHtml(model, state.statutoryPension);
  renderStatutoryPensionTaxPopup(model);
}

function renderStatutoryPensionTaxPopup(model: StatutoryPensionModel): void {
  const host = document.querySelector<HTMLDivElement>("#statutoryPensionTaxPopup");
  if (!host) return;
  if (!statutoryPensionTaxPopupScenarioId) {
    host.innerHTML = "";
    host.hidden = true;
    return;
  }
  const html = renderStatutoryPensionTaxPopupHtml(model, statutoryPensionTaxPopupScenarioId);
  if (!html) {
    hideStatutoryPensionTaxPopup();
    return;
  }
  host.innerHTML = html;
  host.hidden = false;
}

function renderPositions(): void {
  renderPositionModeControls();
  normalizeCurrentPositionTableViewColumns();
  const sourcePositions = positionTableSourcePositions();
  const basePositions = sourcePositions.filter((position) => positionTableMode(position) === selectedPositionMode);
  renderPositionTableControls(basePositions, sourcePositions);
  renderPositionTableHead();
  const body = document.querySelector<HTMLTableSectionElement>("#positionsBody");
  if (!body) return;

  const view = currentPositionTableView();
  const positions = positionTableRows(sourcePositions, selectedPositionMode, view);
  const isFilteredOrSorted = hasActivePositionTableView(view);
  if (!basePositions.length) {
    body.innerHTML = `
      <tr>
        <td class="position-empty" colspan="${positionTableColumnCount(selectedPositionMode, activePositionCadence())}">
          Noch keine ${positionModeEmptyLabel(selectedPositionMode, activePositionCadence())} angelegt.
        </td>
      </tr>
    `;
    renderPositionIconPicker();
    return;
  }

  if (!positions.length) {
    body.innerHTML = `
      <tr>
        <td class="position-empty" colspan="${positionTableColumnCount(selectedPositionMode, activePositionCadence())}">
          Keine Positionen fuer aktuelle Filter.
        </td>
      </tr>
    `;
    renderPositionIconPicker();
    return;
  }

  body.innerHTML = positions
    .map((position) => {
      const isIncome = isIncomePosition(position);
      const showTypeColumn = positionTableShowsTypeColumn(selectedPositionMode);
      return `
        <tr data-position-row="${position.id}">
          <td class="reorder-cell">
            ${positionDragHandle(position.id, isFilteredOrSorted)}
          </td>
          <td class="check-cell"><input type="checkbox" data-position-id="${position.id}" data-position-field="active" ${
            position.active ? "checked" : ""
          } /></td>
          <td class="check-cell"><input type="checkbox" data-position-id="${position.id}" data-position-field="visible" ${
            position.visible ? "checked" : ""
          } /></td>
          <td class="label-cell">${positionIconSelect(position)}</td>
          <td class="planning-year-cell">${positionPlanningYearSelect(position)}</td>
          <td class="name-cell"><input class="name-input" value="${escapeHtml(position.name)}" data-position-id="${
            position.id
          }" data-position-field="name" /></td>
          ${showTypeColumn ? `<td>${positionTypeSelect(position)}</td>` : ""}
          <td>${positionAmountCell(position)}</td>
          ${isIncome ? incomeDateCells(position) : expenseDateCells(position)}
          <td>${payoutSelect(position)}</td>
          ${positionTableShowsPayoutMonthColumn(position) ? `<td>${monthSelect(position.id, "payoutMonth", position.payoutMonth)}</td>` : ""}
          <td class="day-cell"><input class="small-input day-input" type="number" min="1" max="31" step="1" value="${
            position.payoutDay
          }" data-position-id="${position.id}" data-position-field="payoutDay" /></td>
          ${
            isIncome
              ? ""
              : `
          <td class="check-cell interest-toggle-cell"><input type="checkbox" data-position-id="${position.id}" data-position-field="interestBearing" ${
                  position.payoutType !== "once" && position.interestBearing ? "checked" : ""
                } ${position.payoutType !== "once" ? "" : "disabled"} /></td>
          <td class="check-cell cashback-toggle-cell"><input type="checkbox" data-position-id="${position.id}" data-position-field="cashback" ${
                  position.type === "temporary" && position.cashback ? "checked" : ""
                } ${position.type === "temporary" ? "" : "disabled"} /></td>
          `
          }
          <td><button class="icon-button danger" type="button" data-action="remove-${position.id}" aria-label="Position entfernen">x</button></td>
        </tr>
      `;
    })
    .join("");

  for (const button of body.querySelectorAll<HTMLButtonElement>("button[data-action^='remove-']")) {
    button.addEventListener("click", () => {
      const id = button.dataset.action?.replace("remove-", "");
      if (!id) return;
      removePosition(id);
      renderAll();
    });
  }
  renderPositionIconPicker();
}

function renderPlanningAccounts(): void {
  const cards = document.querySelector<HTMLDivElement>("#planningAccountCards");
  const summary = document.querySelector<HTMLParagraphElement>("#planningAccountSummary");
  const yearAccountName = document.querySelector<HTMLSpanElement>("#activeYearAccountName");
  const yearSelector = document.querySelector<HTMLDivElement>("#yearAccountSelector");
  const investmentSelector = document.querySelector<HTMLDivElement>("#investmentAccountSelector");
  const realEstateAccountSelector = document.querySelector<HTMLDivElement>("#realEstateAccountSelector");
  const combinedAccountSelector = document.querySelector<HTMLDivElement>("#combinedAccountSelector");
  const combinedLeadAccountSelector = document.querySelector<HTMLDivElement>("#combinedLeadInvestmentAccountSelector");
  if (!cards || !summary || !yearAccountName) return;

  const activeAccount = activePlanningAccount();
  const totalsByType = state.planningAccounts.reduce(
    (accumulator, account) => {
      if (account.type === "cost_reserve") accumulator.costReserve += 1;
      else if (account.type === "annual_table") accumulator.annualTable += 1;
      else accumulator.mixed += 1;
      return accumulator;
    },
    { costReserve: 0, annualTable: 0, mixed: 0 }
  );

  cards.innerHTML = state.planningAccounts
    .map((account) => {
      const isActive = account.id === activeAccount.id;
      return `
        <button
          class="planning-account-card ${isActive ? "active" : ""}"
          type="button"
          data-action="select-planning-account-${account.id}"
          aria-pressed="${isActive}"
        >
          <strong>${escapeHtml(account.name)}</strong>
          <small>${escapeHtml(account.type)}</small>
          <small>${intNumber(account.yearlyRows.length)} Positionen</small>
        </button>
      `;
    })
    .join("");

  if (yearSelector) {
    yearSelector.innerHTML = state.planningAccounts.length
      ? state.planningAccounts
          .map((account) => {
            const isActive = account.id === activeAccount.id;
            return `
              <button
                class="position-mode-button ${isActive ? "active" : ""}"
                type="button"
                data-action="select-planning-account-${account.id}"
                aria-pressed="${isActive}"
              >${escapeHtml(account.name)}</button>
            `;
          })
          .join("")
      : '<span class="chart-empty">Noch kein Konto vorhanden.</span>';
  }

  if (investmentSelector) {
    investmentSelector.innerHTML = state.planningAccounts.length
      ? state.planningAccounts
          .map((account) => {
            const isActive = account.id === state.ui.selectedInvestmentAccountId;
            return `
              <button
                class="planning-account-card ${isActive ? "active" : ""}"
                type="button"
                data-action="select-investment-account-${account.id}"
                aria-pressed="${isActive}"
              >
                <strong>${escapeHtml(account.name)}</strong>
                <small>${escapeHtml(account.type)}</small>
                <small>${intNumber(account.yearlyRows.length)} Positionen</small>
              </button>
            `;
          })
          .join("")
      : '<span class="chart-empty">Noch kein Konto vorhanden.</span>';
  }

  if (realEstateAccountSelector) {
    realEstateAccountSelector.innerHTML = state.planningAccounts.length
      ? state.planningAccounts
          .map((account) => {
            const active = state.ui.selectedRealEstateAccountIds.includes(account.id);
            return `
              <button
                class="planning-account-card ${active ? "active" : ""}"
                type="button"
                data-action="toggle-real-estate-account-${account.id}"
                aria-pressed="${active}"
              >
                <strong>${escapeHtml(account.name)}</strong>
                <small>${escapeHtml(account.type)}</small>
                <small>${intNumber(account.yearlyRows.length)} Positionen</small>
              </button>
            `;
          })
          .join("")
      : '<span class="chart-empty">Noch kein Konto vorhanden.</span>';
  }

  if (combinedAccountSelector) {
    combinedAccountSelector.innerHTML = state.planningAccounts.length
      ? state.planningAccounts
          .map((account) => {
            const active = state.ui.selectedCombinedAccountIds.includes(account.id);
            return `
              <button
                class="planning-account-card ${active ? "active" : ""}"
                type="button"
                data-action="toggle-combined-account-${account.id}"
                aria-pressed="${active}"
              >
                <strong>${escapeHtml(account.name)}</strong>
                <small>${escapeHtml(account.type)}</small>
                <small>${intNumber(account.yearlyRows.length)} Positionen</small>
              </button>
            `;
          })
          .join("")
      : '<span class="chart-empty">Noch kein Konto vorhanden.</span>';
  }

  if (combinedLeadAccountSelector) {
    combinedLeadAccountSelector.innerHTML = state.planningAccounts.length
      ? state.planningAccounts
          .map((account) => {
            const active = state.ui.selectedCombinedLeadInvestmentAccountId === account.id;
            return `
              <button
                class="planning-account-card ${active ? "active" : ""}"
                type="button"
                data-action="select-combined-lead-account-${account.id}"
                aria-pressed="${active}"
              >
                <strong>${escapeHtml(account.name)}</strong>
                <small>${escapeHtml(account.type)}</small>
                <small>${intNumber(account.yearlyRows.length)} Positionen</small>
              </button>
            `;
          })
          .join("")
      : '<span class="chart-empty">Noch kein Konto vorhanden.</span>';
  }

  summary.textContent = `Konten gesamt: ${state.planningAccounts.length} | mixed: ${totalsByType.mixed} | cost_reserve: ${totalsByType.costReserve} | annual_table: ${totalsByType.annualTable}`;
  yearAccountName.textContent = `(aktiv: ${activeAccount.name}, ${activePlanningYearLabel()})`;
  renderPlanningAccountDialog();
}

function renderPlanningYearNavigation(): void {
  const host = document.querySelector<HTMLDivElement>("#planningYearNavigation");
  const label = document.querySelector<HTMLSpanElement>("#planningYearActiveLabel");
  if (!host) return;

  const selectedYear = activePlanningYear();
  const currentYear = new Date().getFullYear();
  const yearButtons = planningYearOptions(state.settings.year)
    .map((year) => {
      const active = selectedYear === year;
      const current = currentYear === year;
      return `
        <button
          class="planning-year-button ${active ? "active" : ""} ${current ? "current" : ""}"
          type="button"
          data-action="select-planning-year"
          data-planning-year="${year}"
          aria-pressed="${active}"
        >${year}</button>
      `;
    })
    .join("");

  host.innerHTML = `
    <button
      class="planning-year-button ${selectedYear === null ? "active" : ""}"
      type="button"
      data-action="select-planning-year"
      data-planning-year="start"
      aria-pressed="${selectedYear === null}"
    >Start</button>
    ${yearButtons}
  `;
  if (label) label.textContent = activePlanningYearLabel();
}

function renderCombinedModuleControls(): void {
  const cashSelector = document.querySelector<HTMLDivElement>("#combinedCashAccountSelector");
  const leadSelector = document.querySelector<HTMLDivElement>("#combinedLeadInvestmentAccountSelector");
  const depotSelector = document.querySelector<HTMLDivElement>("#combinedDepotSelector");
  const pensionSelector = document.querySelector<HTMLDivElement>("#combinedPensionScenarioSelector");
  const cashAccount = selectedCombinedCashPlanningAccount();

  if (cashSelector) {
    cashSelector.innerHTML = state.planningAccounts.length
      ? orderedCombinedCashAccounts(cashAccount)
          .map((account) => {
            const active = cashAccount?.id === account.id;
            return `
              <button
                class="planning-account-card ${active ? "active" : ""}"
                type="button"
                data-action="select-combined-cash-account-${account.id}"
                aria-pressed="${active}"
                aria-haspopup="dialog"
              >
                <strong>${escapeHtml(account.name)}</strong>
                <small>${escapeHtml(account.type)}</small>
                <small>${intNumber(account.yearlyRows.length)} Positionen</small>
              </button>
            `;
          })
          .join("")
      : '<span class="chart-empty">Noch kein Konto vorhanden.</span>';
  }

  if (leadSelector) {
    const leadAccount = selectedCombinedLeadInvestmentPlanningAccount();
    leadSelector.innerHTML = state.planningAccounts.length
      ? state.planningAccounts
          .map((account) => {
            const active = leadAccount?.id === account.id;
            return `
              <button
                class="planning-account-card ${active ? "active" : ""}"
                type="button"
                data-action="select-combined-lead-account-${account.id}"
                aria-pressed="${active}"
              >
                <strong>${escapeHtml(account.name)}</strong>
                <small>${escapeHtml(account.type)}</small>
                <small>${intNumber(account.yearlyRows.length)} Positionen</small>
              </button>
            `;
          })
          .join("")
      : '<span class="chart-empty">Noch kein Konto vorhanden.</span>';
  }

  if (depotSelector) {
    const selectedKeys = new Set(selectedCombinedDepotKeys());
    const leadAccount = selectedCombinedLeadInvestmentPlanningAccount();
    depotSelector.innerHTML = leadAccount
      ? COMBINED_DEPOTS.map(({ key, label }) => {
          const active = selectedKeys.has(key);
          const settings = depotInvestmentSettingsForAccount(key, leadAccount.id);
          return `
            <button
              class="combined-depot-option ${active ? "active" : ""}"
              type="button"
              data-action="toggle-combined-depot"
              data-combined-depot="${key}"
              aria-pressed="${active}"
            >
              <strong>${escapeHtml(label)}</strong>
              <span>${intNumber(settings.includedIds.length)} Positionen</span>
            </button>
          `;
        }).join("")
      : '<span class="chart-empty">Kein Leitkonto vorhanden.</span>';
  }

  if (pensionSelector) {
    const selectedScenario = state.combinedWealth.statutoryPensionScenario;
    const scenarioById = new Map((latestStatutoryPensionModel?.scenarios ?? []).map((scenario) => [scenario.id, scenario]));
    pensionSelector.innerHTML = (["pessimistic", "base", "optimistic"] as const)
      .map((scenarioId) => {
        const scenario = scenarioById.get(scenarioId);
        const active = selectedScenario === scenarioId;
        return `
          <button
            class="combined-pension-scenario ${active ? "active" : ""}"
            type="button"
            data-action="select-combined-pension-scenario"
            data-combined-pension-scenario="${scenarioId}"
            aria-pressed="${active}"
          >
            <strong>${escapeHtml(scenario?.label ?? pensionScenarioLabel(scenarioId))}</strong>
            <span>${escapeHtml(scenario ? `${money(scenario.netMonthlyPension)} netto/Monat` : "Keine Prognose")}</span>
            <small>Rentenalter ${escapeHtml(String(scenario?.retirementAge ?? state.statutoryPension.scenarios[scenarioId].retirementAge))}</small>
          </button>
        `;
      })
      .join("");
  }

  const cashPreview = combinedCashContribution(1, cashAccount);
  setText("combinedCashSourceMetric", cashAccount?.name ?? "-");
  setText("combinedCashRateMetric", money(cashPreview.yearlyCashDelta));
  setText(
    "combinedRealEstateActivationMetric",
    state.realEstate.purchaseActivated
      ? state.realEstate.plannedSaleYear
        ? `aktiv bis Verkauf ${intNumber(state.realEstate.plannedSaleYear)}`
        : "aktiv"
      : "Kauf nicht aktiviert"
  );
  setText(
    "combinedRealEstateFinancingYearsMetric",
    state.realEstate.purchaseActivated ? realEstateFinancingYearsText(latestRealEstateResult) : "-"
  );
  setInputValue('[data-combined-number="statutoryPensionMonthlyAmount"]', state.combinedWealth.statutoryPensionMonthlyAmount);
  setInputValue(
    '[data-combined-number="statutoryPensionSavingsRatePercent"]',
    state.combinedWealth.statutoryPensionSavingsRatePercent
  );
  renderCombinedCashPositionPopup();
}

function orderedCombinedCashAccounts(activeAccount: PlanningAccount | null): PlanningAccount[] {
  if (!activeAccount) return state.planningAccounts;
  return [activeAccount, ...state.planningAccounts.filter((account) => account.id !== activeAccount.id)];
}

function renderCombinedCashPositionPopup(): void {
  const popup = document.querySelector<HTMLDivElement>("#combinedCashPositionPopup");
  if (!popup) return;
  const account = combinedCashPopupAccountId ? planningAccountById(combinedCashPopupAccountId) : null;
  if (!account) {
    popup.hidden = true;
    popup.innerHTML = "";
    return;
  }

  const positions = combinedCashSelectablePositions(account);
  const selectedIds = new Set(state.combinedWealth.cashPositionIds);
  const selectedCount = positions.filter((position) => selectedIds.has(position.id)).length;
  const positionList = positions.length
    ? positions
        .map((position) => {
          const checked = selectedIds.has(position.id) ? "checked" : "";
          return `
            <label class="include-item combined-cash-position-item">
              <input type="checkbox" data-combined-cash-position="${position.id}" ${checked} />
              <span class="include-icon">${positionIconSvg(normalizePositionIcon(position.icon))}</span>
              <span>
                <span class="include-name">${escapeHtml(position.name)}</span>
                <span class="include-amount">${escapeHtml(investmentPositionSubtitle(position))}</span>
              </span>
            </label>
          `;
        })
        .join("")
    : '<div class="include-empty">Keine freien investierbaren Positionen in diesem Konto.</div>';

  popup.innerHTML = `
    <div class="combined-cash-position-dialog">
      <div class="chart-popup-head">
        <div>
          <span>Cash aus Konto</span>
          <strong>${escapeHtml(account.name)}</strong>
        </div>
        <button class="chart-popup-close" type="button" data-action="close-combined-cash-position-popup" aria-label="Popup schliessen">x</button>
      </div>
      <div class="include-list combined-cash-position-list">${positionList}</div>
      <div class="combined-cash-position-actions">
        <span>${intNumber(selectedCount)} aktiv</span>
        <button class="button" type="button" data-action="close-combined-cash-position-popup">Fertig</button>
      </div>
    </div>
  `;
  popup.hidden = false;
}

function addPlanningAccount(): void {
  accountDialog = {
    mode: "create",
    accountId: null,
    name: `Konto ${state.planningAccounts.length + 1}`,
    type: "mixed",
    error: ""
  };
  renderPlanningAccountDialog();
}

function renamePlanningAccount(): void {
  const account = activePlanningAccount();
  accountDialog = {
    mode: "rename",
    accountId: account.id,
    name: account.name,
    type: account.type,
    error: ""
  };
  renderPlanningAccountDialog();
}

function updateAccountDialogDraft(field: string, value: string): void {
  if (!accountDialog) return;
  if (field === "type") {
    accountDialog = {
      ...accountDialog,
      type: value === "cost_reserve" || value === "annual_table" || value === "mixed" ? value : accountDialog.type,
      error: ""
    };
    return;
  }
  if (field === "name") {
    accountDialog = { ...accountDialog, name: value, error: "" };
  }
}

function closePlanningAccountDialog(): void {
  accountDialog = null;
  renderPlanningAccountDialog();
}

function savePlanningAccountDialog(): void {
  if (!accountDialog) return;
  const name = accountDialog.name.trim();
  if (!name) {
    accountDialog = { ...accountDialog, error: "Bitte einen Kontonamen eingeben." };
    renderPlanningAccountDialog();
    return;
  }

  if (accountDialog.mode === "rename" && accountDialog.accountId) {
    state.planningAccounts = state.planningAccounts.map((item) =>
      item.id === accountDialog?.accountId ? { ...item, name, type: accountDialog.type } : item
    );
    accountDialog = null;
    renderAll();
    return;
  }

  const account: PlanningAccount = {
    id: createId(),
    name,
    type: accountDialog.type,
    yearlyRows: []
  };
  syncActivePlanningAccountFromPositions();
  state.planningAccounts = [...state.planningAccounts, account];
  state.investmentByAccountId = {
    ...state.investmentByAccountId,
    [account.id]: defaultInvestmentSettingsForNewAccount()
  };
  state.ui = {
    ...state.ui,
    selectedPlanningAccountId: account.id,
    selectedInvestmentAccountId: account.id,
    selectedRealEstateAccountIds: Array.from(new Set([...state.ui.selectedRealEstateAccountIds, account.id])),
    selectedRealEstateWithdrawalGainAccountIds: Array.from(new Set([...state.ui.selectedRealEstateAccountIds, account.id])),
    selectedCombinedAccountIds: Array.from(new Set([...state.ui.selectedCombinedAccountIds, account.id]))
  };
  state.positions = account.yearlyRows;
  accountDialog = null;
  renderAll();
}

function renderPlanningAccountDialog(): void {
  const host = document.querySelector<HTMLDivElement>("#planningAccountDialogHost");
  if (!host) return;
  if (!accountDialog) {
    host.innerHTML = "";
    return;
  }
  host.innerHTML = `
    <div class="account-dialog-backdrop" role="presentation">
      <div class="account-dialog" role="dialog" aria-modal="true" aria-label="Konto bearbeiten">
        <div class="settings-popover-head">
          <strong>${accountDialog.mode === "create" ? "Neues Konto" : "Konto bearbeiten"}</strong>
          <button class="chart-popup-close" type="button" data-action="cancel-planning-account-dialog" aria-label="Konto-Dialog schliessen">x</button>
        </div>
        <div class="field-grid">
          <label class="field">
            <span>Kontoname</span>
            <input type="text" value="${escapeHtml(accountDialog.name)}" data-account-dialog-field="name" />
          </label>
          <label class="field">
            <span>Kontotyp</span>
            <select data-account-dialog-field="type">
              <option value="mixed" ${accountDialog.type === "mixed" ? "selected" : ""}>Gemischt</option>
              <option value="cost_reserve" ${accountDialog.type === "cost_reserve" ? "selected" : ""}>Kosten/Ruecklagen</option>
              <option value="annual_table" ${accountDialog.type === "annual_table" ? "selected" : ""}>Jahrestabelle</option>
            </select>
          </label>
        </div>
        ${accountDialog.error ? `<div class="validation-box error">${escapeHtml(accountDialog.error)}</div>` : ""}
        <div class="button-row">
          <button class="button secondary" type="button" data-action="cancel-planning-account-dialog">Abbrechen</button>
          <button class="button" type="button" data-action="save-planning-account-dialog">Speichern</button>
        </div>
      </div>
    </div>
  `;
}

function deletePlanningAccount(): void {
  if (state.planningAccounts.length <= 1) {
    window.alert("Mindestens ein Konto muss bestehen bleiben.");
    return;
  }
  const account = activePlanningAccount();
  const confirmed = window.confirm(`Konto '${account.name}' wirklich loeschen?`);
  if (!confirmed) return;
  state.planningAccounts = state.planningAccounts.filter((item) => item.id !== account.id);
  const nextPlanningAccountId = state.planningAccounts[0].id;
  const nextRealEstateAccountIds = state.ui.selectedRealEstateAccountIds.filter((accountId) => accountId !== account.id);
  const nextCombinedAccountIds = state.ui.selectedCombinedAccountIds.filter((accountId) => accountId !== account.id);
  const nextInvestmentByAccountId = { ...state.investmentByAccountId };
  delete nextInvestmentByAccountId[account.id];
  state.investmentByAccountId = nextInvestmentByAccountId;
  state.ui = {
    ...state.ui,
    selectedPlanningAccountId: nextPlanningAccountId,
    selectedInvestmentAccountId:
      state.ui.selectedInvestmentAccountId === account.id ? nextPlanningAccountId : state.ui.selectedInvestmentAccountId,
    selectedRealEstateAccountIds: nextRealEstateAccountIds,
    selectedRealEstateWithdrawalGainAccountIds: nextRealEstateAccountIds,
    selectedCombinedAccountIds: nextCombinedAccountIds
  };
  syncPositionsFromActivePlanningAccount();
  renderAll();
}

function selectPlanningAccount(accountId: string): void {
  if (!accountId || accountId === state.ui.selectedPlanningAccountId) return;
  if (!state.planningAccounts.some((account) => account.id === accountId)) return;
  syncActivePlanningAccountFromPositions();
  state.ui = { ...state.ui, selectedPlanningAccountId: accountId };
  syncPositionsFromActivePlanningAccount();
  renderAll();
}

function selectInvestmentAccount(accountId: string): void {
  if (!accountId || accountId === state.ui.selectedInvestmentAccountId) return;
  if (!state.planningAccounts.some((account) => account.id === accountId)) return;
  state.ui = { ...state.ui, selectedInvestmentAccountId: accountId };
  hideInvestmentIncludePopup();
  renderAll();
}

function toggleRealEstateSourceAccount(accountId: string): void {
  if (!accountId || !state.planningAccounts.some((account) => account.id === accountId)) return;
  const selected = new Set(state.ui.selectedRealEstateAccountIds);
  if (selected.has(accountId)) selected.delete(accountId);
  else selected.add(accountId);
  const selectedIds = Array.from(selected);
  state.ui = {
    ...state.ui,
    selectedRealEstateAccountIds: selectedIds,
    selectedRealEstateWithdrawalGainAccountIds: selectedIds
  };
  resetRealEstateDetailSelection();
  renderAll();
}

function toggleCombinedAccount(accountId: string): void {
  if (!accountId || !state.planningAccounts.some((account) => account.id === accountId)) return;
  const selected = new Set(state.ui.selectedCombinedAccountIds);
  if (selected.has(accountId)) selected.delete(accountId);
  else selected.add(accountId);
  state.ui = {
    ...state.ui,
    selectedCombinedAccountIds: Array.from(selected)
  };
  renderAll();
}

function selectCombinedLeadInvestmentAccount(accountId: string): void {
  if (!accountId || !state.planningAccounts.some((account) => account.id === accountId)) return;
  if (state.ui.selectedCombinedLeadInvestmentAccountId === accountId) return;
  state.ui = { ...state.ui, selectedCombinedLeadInvestmentAccountId: accountId };
  renderAll();
}

function showIncomeYearLabelPicker(button: HTMLButtonElement): void {
  const entryId = button.dataset.incomeYearId;
  if (!entryId) return;
  const rect = button.getBoundingClientRect();
  const panelWidth = 500;
  const panelHeight = 420;
  const left =
    rect.right + 12 + panelWidth <= window.innerWidth
      ? rect.right + 12
      : Math.max(12, rect.left - panelWidth - 12);
  const top = Math.max(12, Math.min(rect.top, window.innerHeight - panelHeight - 12));
  incomeYearLabelPicker = { entryId, top, left };
  renderIncomeYearLabelPicker();
}

function hideIncomeYearLabelPicker(): void {
  incomeYearLabelPicker = null;
  renderIncomeYearLabelPicker();
}

function selectIncomeYearLabel(entryId: string, label: string): void {
  if (!entryId || !label) return;
  const yearlyEntries = state.incomeTracker.yearlyEntries.map((entry) =>
    entry.id === entryId ? { ...entry, label: incomeYearLabel(label) } : entry
  );
  state.incomeTracker = {
    ...state.incomeTracker,
    yearlyEntries: sanitizeIncomeYearEntriesWithTaxRules(yearlyEntries)
  };
  incomeYearLabelPicker = null;
  renderAll();
}

function renderIncomeYearLabelPicker(): void {
  const picker = document.querySelector<HTMLDivElement>("#incomeYearLabelPicker");
  if (!picker) return;
  if (!incomeYearLabelPicker) {
    picker.hidden = true;
    return;
  }

  const entry = state.incomeTracker.yearlyEntries.find((item) => item.id === incomeYearLabelPicker?.entryId);
  if (!entry) {
    picker.hidden = true;
    incomeYearLabelPicker = null;
    return;
  }

  picker.style.top = `${incomeYearLabelPicker.top}px`;
  picker.style.left = `${incomeYearLabelPicker.left}px`;
  picker.innerHTML = `
    <div class="position-icon-picker-head">
      <span>Einkommenslabel</span>
      <button class="icon-button" type="button" data-action="close-income-year-label-picker" aria-label="Labelauswahl schliessen">x</button>
    </div>
    <div class="position-icon-picker-grid income-year-label-grid">
      ${INCOME_YEAR_LABEL_OPTIONS.map((option) => {
        const active = option.id === incomeYearLabel(entry.label);
        return `
          <button
            class="position-icon-option income-year-label-option ${active ? "active" : ""}"
            type="button"
            data-action="select-income-year-label"
            data-income-year-id="${entry.id}"
            data-income-label="${escapeHtml(option.id)}"
            aria-pressed="${active}"
            title="${escapeHtml(option.description)}"
          >
            ${positionIconSvg(option.icon)}
            <span>${escapeHtml(option.label)}</span>
            <small>${escapeHtml(option.description)}</small>
          </button>
        `;
      }).join("")}
    </div>
  `;
  picker.hidden = false;
}

function showIncomeMilestoneTypePicker(button: HTMLButtonElement): void {
  const milestoneId = button.dataset.milestoneId;
  if (!milestoneId) return;
  const rect = button.getBoundingClientRect();
  const panelWidth = 360;
  const panelHeight = 420;
  const left =
    rect.right + 12 + panelWidth <= window.innerWidth
      ? rect.right + 12
      : Math.max(12, rect.left - panelWidth - 12);
  const top = Math.max(12, Math.min(rect.top, window.innerHeight - panelHeight - 12));
  incomeMilestoneTypePicker = { milestoneId, top, left };
  renderIncomeMilestoneTypePicker();
}

function hideIncomeMilestoneTypePicker(): void {
  incomeMilestoneTypePicker = null;
  renderIncomeMilestoneTypePicker();
}

function selectIncomeMilestoneType(milestoneId: string, type: string): void {
  if (!milestoneId || !type) return;
  state.incomeTracker = {
    ...state.incomeTracker,
    milestones: state.incomeTracker.milestones.map((milestone) =>
      milestone.id === milestoneId ? { ...milestone, type } : milestone
    )
  };
  incomeMilestoneTypePicker = null;
  renderAll();
}

function renderIncomeMilestoneTypePicker(): void {
  const picker = document.querySelector<HTMLDivElement>("#incomeMilestoneTypePicker");
  if (!picker) return;
  if (!incomeMilestoneTypePicker) {
    picker.hidden = true;
    return;
  }

  const milestone = state.incomeTracker.milestones.find((item) => item.id === incomeMilestoneTypePicker?.milestoneId);
  if (!milestone) {
    picker.hidden = true;
    incomeMilestoneTypePicker = null;
    return;
  }

  picker.style.top = `${incomeMilestoneTypePicker.top}px`;
  picker.style.left = `${incomeMilestoneTypePicker.left}px`;
  picker.innerHTML = `
    <div class="position-icon-picker-head">
      <span>Meilenstein-Typ</span>
      <button class="icon-button" type="button" data-action="close-income-milestone-type-picker" aria-label="Typauswahl schliessen">x</button>
    </div>
    <div class="position-icon-picker-grid income-milestone-type-grid">
      ${CAREER_MILESTONE_TYPE_OPTIONS.map((option) => {
        const active = option.type === milestone.type;
        return `
          <button
            class="position-icon-option income-milestone-type-option ${active ? "active" : ""}"
            type="button"
            data-action="select-income-milestone-type"
            data-milestone-id="${milestone.id}"
            data-milestone-type="${escapeHtml(option.type)}"
            aria-pressed="${active}"
            title="${escapeHtml(option.description)}"
          >
            ${positionIconSvg(option.icon)}
            <span>${escapeHtml(option.type)}</span>
            <small>${escapeHtml(option.description)}</small>
          </button>
        `;
      }).join("")}
    </div>
  `;
  picker.hidden = false;
}

function showIncomePlanningHabitIconPicker(button: HTMLButtonElement): void {
  if (!incomePlanningDialog || (incomePlanningDialog.ownerType !== "habit" && incomePlanningDialog.ownerType !== "manual")) return;
  const rect = button.getBoundingClientRect();
  const panelWidth = 320;
  const panelHeight = 360;
  const left =
    rect.right + 12 + panelWidth <= window.innerWidth
      ? rect.right + 12
      : Math.max(12, rect.left - panelWidth - 12);
  const top = Math.max(12, Math.min(rect.top, window.innerHeight - panelHeight - 12));
  incomePlanningHabitIconPicker = { top, left };
  renderIncomePlanningHabitIconPicker();
}

function hideIncomePlanningHabitIconPicker(): void {
  incomePlanningHabitIconPicker = null;
  renderIncomePlanningHabitIconPicker();
}

function selectIncomePlanningHabitIcon(icon: string): void {
  if (!incomePlanningDialog || (incomePlanningDialog.ownerType !== "habit" && incomePlanningDialog.ownerType !== "manual")) return;
  const fallback =
    incomePlanningDialog.ownerType === "manual"
      ? incomePlanningDefaultManualIcon(incomePlanningDialog.manualType)
      : incomePlanningDialog.habitType === "bad"
        ? "snack"
        : "book";
  const normalizedIcon = normalizePositionIcon(icon, fallback);
  incomePlanningDialog = {
    ...incomePlanningDialog,
    habitIcon: incomePlanningDialog.ownerType === "habit" ? normalizedIcon : incomePlanningDialog.habitIcon,
    manualIcon: incomePlanningDialog.ownerType === "manual" ? normalizedIcon : incomePlanningDialog.manualIcon,
    error: ""
  };
  incomePlanningHabitIconPicker = null;
  renderIncomePlanningDialog();
  renderIncomePlanningHabitIconPicker();
}

function renderIncomePlanningHabitIconPicker(): void {
  const picker = document.querySelector<HTMLDivElement>("#incomePlanningHabitIconPicker");
  if (!picker) return;
  if (
    !incomePlanningHabitIconPicker ||
    !incomePlanningDialog ||
    (incomePlanningDialog.ownerType !== "habit" && incomePlanningDialog.ownerType !== "manual")
  ) {
    picker.hidden = true;
    return;
  }

  const fallback =
    incomePlanningDialog.ownerType === "manual"
      ? incomePlanningDefaultManualIcon(incomePlanningDialog.manualType)
      : incomePlanningDialog.habitType === "bad"
        ? "snack"
        : "book";
  const currentIcon = normalizePositionIcon(
    incomePlanningDialog.ownerType === "manual" ? incomePlanningDialog.manualIcon : incomePlanningDialog.habitIcon,
    fallback
  );
  const title = incomePlanningDialog.ownerType === "manual" ? "Zeitblock-Icon" : "Habit-Icon";
  picker.style.top = `${incomePlanningHabitIconPicker.top}px`;
  picker.style.left = `${incomePlanningHabitIconPicker.left}px`;
  picker.innerHTML = `
    <div class="position-icon-picker-head">
      <span>${escapeHtml(title)}</span>
      <button class="icon-button" type="button" data-action="close-income-planning-icon-picker" aria-label="Iconauswahl schliessen">x</button>
    </div>
    <div class="position-icon-picker-grid">
      ${POSITION_ICONS.map((icon) => {
        const active = icon.id === currentIcon;
        return `
          <button
            class="position-icon-option ${active ? "active" : ""}"
            type="button"
            data-action="select-income-planning-icon"
            data-income-planning-icon="${icon.id}"
            aria-pressed="${active}"
            title="${escapeHtml(icon.label)}"
          >
            ${positionIconSvg(icon.id)}
            <span>${escapeHtml(icon.label)}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
  picker.hidden = false;
}

function hideIncomePlanningStampPicker(): void {
  incomePlanningStampPicker = null;
  renderIncomePlanningStampPicker();
}

function hideIncomePlanningStampMenu(): void {
  incomePlanningStampMenu = null;
  renderIncomePlanningStampMenu();
}

function updateIncomePlanningStampPickerDraft(field: string, value: string): void {
  if (!incomePlanningStampPicker) return;
  if (field === "label") {
    incomePlanningStampPicker = { ...incomePlanningStampPicker, label: value };
    return;
  }
  if (field === "startTime") {
    incomePlanningStampPicker = { ...incomePlanningStampPicker, startTime: value };
    return;
  }
  if (field === "day" && isIncomePlanningWeekday(value)) {
    incomePlanningStampPicker = { ...incomePlanningStampPicker, day: value };
  }
}

function selectIncomePlanningStampIcon(icon: string): void {
  if (!incomePlanningStampPicker) return;
  incomePlanningStampPicker = { ...incomePlanningStampPicker, icon: normalizePositionIcon(icon, "calendar") };
  renderIncomePlanningStampPicker();
}

function selectIncomePlanningStampPreset(label: string, icon: string): void {
  if (!incomePlanningStampPicker) return;
  const preset = INCOME_PLANNING_STAMP_PRESETS.find((item) => item.label === label) ?? {
    label: label.trim() || "Stempel",
    icon
  };
  incomePlanningStampPicker = {
    ...incomePlanningStampPicker,
    label: preset.label,
    icon: normalizePositionIcon(preset.icon, "calendar")
  };
  renderIncomePlanningStampPicker();
}

function updateIncomePlanningStampScenarioSelection(scenarioId: string, checked: boolean): void {
  if (!incomePlanningStampPicker || !incomePlanningKnownScenarioIds().includes(scenarioId)) return;
  const selected = new Set(incomePlanningStampPicker.scenarioIds);
  if (checked) selected.add(scenarioId);
  else selected.delete(scenarioId);
  incomePlanningStampPicker = { ...incomePlanningStampPicker, scenarioIds: Array.from(selected) };
  renderIncomePlanningStampPicker();
}

function saveIncomePlanningStampPicker(): void {
  if (!incomePlanningStampPicker) return;
  if (!incomePlanningStampPicker.scenarioIds.length) return;
  const label = incomePlanningStampPicker.label.trim() || "Stempel";
  const startTime = formatIncomePlanningTime(parseTimeMinutes(incomePlanningStampPicker.startTime) ?? 9 * 60);
  const stamp: IncomePlanningCalendarStamp = {
    id: incomePlanningStampPicker.stampId ?? createId(),
    day: incomePlanningStampPicker.day,
    startTime,
    icon: normalizePositionIcon(incomePlanningStampPicker.icon, "calendar"),
    label,
    scenarioIds: incomePlanningStoredScenarioIds(incomePlanningStampPicker.scenarioIds)
  };
  const exists = state.incomePlanning.calendarStamps.some((item) => item.id === stamp.id);
  state.incomePlanning = {
    ...state.incomePlanning,
    calendarStamps: exists
      ? state.incomePlanning.calendarStamps.map((item) => (item.id === stamp.id ? stamp : item))
      : [...state.incomePlanning.calendarStamps, stamp]
  };
  incomePlanningStampPicker = null;
  renderIncomePlanning();
  saveState(state);
}

function deleteIncomePlanningStamp(stampId: string): void {
  if (!stampId) return;
  state.incomePlanning = {
    ...state.incomePlanning,
    calendarStamps: state.incomePlanning.calendarStamps.filter((stamp) => stamp.id !== stampId)
  };
  incomePlanningStampPicker = null;
  incomePlanningStampMenu = null;
  renderIncomePlanning();
  saveState(state);
}

function renderIncomePlanningStampPicker(): void {
  const picker = document.querySelector<HTMLDivElement>("#incomePlanningStampPicker");
  if (!picker) return;
  if (!incomePlanningStampPicker) {
    picker.hidden = true;
    return;
  }
  const draft = incomePlanningStampPicker;
  const currentIcon = normalizePositionIcon(draft.icon, "calendar");
  picker.style.top = `${draft.top}px`;
  picker.style.left = `${draft.left}px`;
  picker.innerHTML = `
    <div class="position-icon-picker-head">
      <span>${draft.stampId ? "Stempel bearbeiten" : "Stempel setzen"}</span>
      ${incomePlanningStampPickerHeaderActions(draft)}
    </div>
    <div class="income-planning-stamp-form">
      <label class="field">
        <span>Label</span>
        <input type="text" value="${escapeHtml(draft.label)}" data-income-planning-stamp-field="label" />
      </label>
      <div class="income-planning-stamp-time-grid">
        ${incomePlanningStampSelectField("day", "Tag", incomePlanningWeekdayOptionItems(), draft.day)}
        <label class="field compact">
          <span>Zeit</span>
          <input type="time" value="${escapeHtml(draft.startTime)}" data-income-planning-stamp-field="startTime" />
        </label>
      </div>
    </div>
    <div class="income-planning-stamp-presets" aria-label="Stempel-Labels">
      ${INCOME_PLANNING_STAMP_PRESETS.map((preset) => {
        const active = draft.label === preset.label && currentIcon === normalizePositionIcon(preset.icon, "calendar");
        return `
          <button
            class="income-planning-stamp-preset ${active ? "active" : ""}"
            type="button"
            data-action="select-income-planning-stamp-preset"
            data-income-planning-stamp-label="${escapeHtml(preset.label)}"
            data-income-planning-stamp-icon="${escapeHtml(preset.icon)}"
            aria-pressed="${active}"
          >
            ${positionIconSvg(preset.icon, "position-icon-svg income-planning-type-icon")}
            <span>${escapeHtml(preset.label)}</span>
          </button>
        `;
      }).join("")}
    </div>
    <div class="position-icon-picker-grid compact">
      ${POSITION_ICONS.map((icon) => {
        const active = icon.id === currentIcon;
        return `
          <button
            class="position-icon-option ${active ? "active" : ""}"
            type="button"
            data-action="select-income-planning-stamp-icon"
            data-income-planning-stamp-icon="${icon.id}"
            aria-pressed="${active}"
            title="${escapeHtml(icon.label)}"
          >
            ${positionIconSvg(icon.id)}
            <span>${escapeHtml(icon.label)}</span>
          </button>
        `;
      }).join("")}
    </div>
    ${incomePlanningScenarioCheckboxGroup({
      selectedIds: draft.scenarioIds,
      dataAttribute: "data-income-planning-stamp-scenario-id"
    })}
    <div class="button-row income-planning-stamp-actions">
      <button class="button secondary" type="button" data-action="income-planning-close-stamp-picker">Abbrechen</button>
      <button class="button" type="button" data-action="income-planning-save-stamp">Speichern</button>
    </div>
  `;
  picker.hidden = false;
}

function incomePlanningStampPickerHeaderActions(draft: NonNullable<typeof incomePlanningStampPicker>): string {
  const deleteButton = draft.stampId
    ? `
      <button
        class="income-planning-header-icon-button danger"
        type="button"
        data-action="income-planning-delete-stamp"
        data-income-planning-stamp-id="${escapeHtml(draft.stampId)}"
        aria-label="Stempel loeschen"
        title="Loeschen"
      >
        ${incomePlanningHeaderIcon("trash")}
      </button>
    `
    : "";
  return `
    <div class="income-planning-header-actions">
      <button class="income-planning-header-icon-button" type="button" data-action="income-planning-close-stamp-picker" aria-label="Stempel-Picker schliessen" title="Schliessen">x</button>
      <button class="income-planning-header-icon-button" type="button" data-action="income-planning-save-stamp" aria-label="Stempel speichern" title="Speichern">
        ${incomePlanningHeaderIcon("save")}
      </button>
      ${deleteButton}
    </div>
  `;
}

function incomePlanningHeaderIcon(icon: "save" | "trash" | "chevron-left" | "chevron-right"): string {
  const paths: Record<"save" | "trash" | "chevron-left" | "chevron-right", string> = {
    save: '<path d="M5 4h12l2 2v14H5V4Z"/><path d="M8 4v6h8V4"/><path d="M8 17h8"/>',
    trash: '<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
    "chevron-left": '<path d="m15 18-6-6 6-6"/>',
    "chevron-right": '<path d="m9 18 6-6-6-6"/>'
  };
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      ${paths[icon]}
    </svg>
  `;
}

function incomePlanningStampSelectField(
  field: string,
  label: string,
  options: Array<{ value: string; label: string }>,
  selected: string
): string {
  return `
    <label class="field compact">
      <span>${escapeHtml(label)}</span>
      <select data-income-planning-stamp-field="${escapeHtml(field)}">
        ${options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === selected ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
      </select>
    </label>
  `;
}

function renderIncomePlanningStampMenu(): void {
  const menu = document.querySelector<HTMLDivElement>("#incomePlanningStampMenu");
  if (!menu) return;
  if (!incomePlanningStampMenu) {
    menu.hidden = true;
    return;
  }
  const stamp = state.incomePlanning.calendarStamps.find((item) => item.id === incomePlanningStampMenu?.stampId);
  if (!stamp) {
    menu.hidden = true;
    return;
  }
  menu.style.top = `${incomePlanningStampMenu.top}px`;
  menu.style.left = `${incomePlanningStampMenu.left}px`;
  menu.innerHTML = `
    <div class="position-icon-picker-head">
      <span>${escapeHtml(stamp.label)}</span>
      <button class="icon-button" type="button" data-action="income-planning-close-stamp-menu" aria-label="Stempel-Menue schliessen">x</button>
    </div>
    <div class="income-planning-stamp-menu-actions">
      <button class="button secondary" type="button" data-action="income-planning-edit-stamp" data-income-planning-stamp-id="${escapeHtml(stamp.id)}">Bearbeiten</button>
      <button class="button danger" type="button" data-action="income-planning-delete-stamp" data-income-planning-stamp-id="${escapeHtml(stamp.id)}">Loeschen</button>
    </div>
  `;
  menu.hidden = false;
}

function showPositionIconPicker(button: HTMLButtonElement): void {
  const positionId = button.dataset.positionId;
  if (!positionId) return;
  const rect = button.getBoundingClientRect();
  const panelWidth = 320;
  const panelHeight = 360;
  const left =
    rect.right + 12 + panelWidth <= window.innerWidth
      ? rect.right + 12
      : Math.max(12, rect.left - panelWidth - 12);
  const top = Math.max(12, Math.min(rect.top, window.innerHeight - panelHeight - 12));
  positionIconPicker = { positionId, top, left };
  renderPositionIconPicker();
}

function hidePositionIconPicker(): void {
  positionIconPicker = null;
  renderPositionIconPicker();
}

function selectPositionIcon(positionId: string, icon: string): void {
  if (!positionId || !icon) return;
  state.positions = state.positions.map((position) =>
    position.id === positionId ? { ...position, icon: normalizePositionIcon(icon, position.icon) } : position
  );
  positionIconPicker = null;
  renderAll();
}

function renderPositionIconPicker(): void {
  const picker = document.querySelector<HTMLDivElement>("#positionIconPicker");
  if (!picker) return;
  if (!positionIconPicker) {
    picker.hidden = true;
    return;
  }

  const position = state.positions.find((item) => item.id === positionIconPicker?.positionId);
  if (!position) {
    picker.hidden = true;
    positionIconPicker = null;
    return;
  }

  const currentIcon = normalizePositionIcon(position.icon);
  picker.style.top = `${positionIconPicker.top}px`;
  picker.style.left = `${positionIconPicker.left}px`;
  picker.innerHTML = `
    <div class="position-icon-picker-head">
      <span>Label auswaehlen</span>
      <button class="icon-button" type="button" data-action="close-position-icon-picker" aria-label="Labelauswahl schliessen">x</button>
    </div>
    <div class="position-icon-picker-grid">
      ${POSITION_ICONS.map((icon) => {
        const active = icon.id === currentIcon;
        return `
          <button
            class="position-icon-option ${active ? "active" : ""}"
            type="button"
            data-action="select-position-icon"
            data-position-id="${position.id}"
            data-position-icon="${icon.id}"
            aria-pressed="${active}"
            title="${escapeHtml(icon.label)}"
          >
            ${positionIconSvg(icon.id)}
            <span>${escapeHtml(icon.label)}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
  picker.hidden = false;
}

function openPositionCostDialog(positionId: string): void {
  const position = state.positions.find((item) => item.id === positionId);
  if (!position || !positionCostBreakdownEligible(position)) return;
  positionCostDialogId = positionId;
  if (!position.costBreakdown?.length) {
    state.positions = state.positions.map((item) =>
      item.id === positionId ? { ...item, costBreakdown: [emptyPositionCostBreakdownItem()] } : item
    );
  }
  renderAll();
}

function closePositionCostDialog(): void {
  positionCostDialogId = null;
  renderPositionCostDialog();
}

function renderPositionCostDialog(): void {
  const root = document.querySelector<HTMLDivElement>("#positionCostDialogRoot");
  if (!root) return;
  const position = state.positions.find((item) => item.id === positionCostDialogId);
  if (!position || !positionCostBreakdownEligible(position)) {
    root.innerHTML = "";
    positionCostDialogId = null;
    return;
  }

  const items = position.costBreakdown?.length ? position.costBreakdown : [emptyPositionCostBreakdownItem()];
  const total = positionCostBreakdownTotal(items);
  root.innerHTML = `
    <div class="position-cost-dialog-backdrop" role="presentation">
      <div class="position-cost-dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(
        positionCostDialogTitle(position)
      )}">
        <div class="income-tax-dialog-head">
          <div>
            <strong>${escapeHtml(positionCostDialogTitle(position))}</strong>
            <span>${escapeHtml(position.name)} · ${escapeHtml(positionCadenceButtonLabel(position.payoutType))}</span>
          </div>
          <button class="chart-popup-close" type="button" data-action="close-position-cost-dialog" aria-label="Betragsdetails schliessen">x</button>
        </div>
        <div class="table-wrap">
          <table class="position-cost-table">
            <thead>
              <tr>
                <th>Position</th>
                <th>Betrag</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item) => positionCostBreakdownRow(position.id, item)).join("")}
            </tbody>
          </table>
        </div>
        <div class="position-cost-summary">
          <span>Summe</span>
          <strong data-position-cost-total="${escapeHtml(position.id)}">${total === null ? "-" : money(total)}</strong>
        </div>
        <div class="button-row">
          <button class="button secondary" type="button" data-action="add-position-cost-item" data-position-id="${escapeHtml(
            position.id
          )}">${escapeHtml(positionCostAddButtonLabel(position))}</button>
          <button class="button" type="button" data-action="close-position-cost-dialog">Fertig</button>
        </div>
      </div>
    </div>
  `;
}

function positionCostBreakdownRow(positionId: string, item: PositionCostBreakdownItem): string {
  return `
    <tr>
      <td>
        <input
          class="position-cost-name-input"
          value="${escapeHtml(item.name)}"
          data-position-cost-position-id="${escapeHtml(positionId)}"
          data-position-cost-item-id="${escapeHtml(item.id)}"
          data-position-cost-field="name"
          placeholder="z. B. Lebensunterhalt"
        />
      </td>
      <td>
        <input
          class="small-input amount-input"
          type="number"
          min="0"
          step="0.01"
          value="${item.amount === null ? "" : item.amount}"
          data-position-cost-position-id="${escapeHtml(positionId)}"
          data-position-cost-item-id="${escapeHtml(item.id)}"
          data-position-cost-field="amount"
        />
      </td>
      <td>
        <button
          class="icon-button danger"
          type="button"
          data-action="remove-position-cost-item"
          data-position-id="${escapeHtml(positionId)}"
          data-position-cost-item-id="${escapeHtml(item.id)}"
          aria-label="Kostenposition entfernen"
        >x</button>
      </td>
    </tr>
  `;
}

function positionCostDialogTitle(position: ReservePosition): string {
  return positionFlow(position) === "income" ? "Einnahmendetails" : "Kostenaufschluesselung";
}

function positionCostAddButtonLabel(position: ReservePosition): string {
  return positionFlow(position) === "income" ? "Einnahmeposition hinzufuegen" : "Kostenposition hinzufuegen";
}

function renderPositionCostDialogTotals(positionId: string): void {
  const position = state.positions.find((item) => item.id === positionId);
  const value = document.querySelector<HTMLElement>(`[data-position-cost-total="${cssEscape(positionId)}"]`);
  if (!position || !value) return;
  const total = positionCostBreakdownTotal(position.costBreakdown);
  value.textContent = total === null ? "-" : money(total);
}

function emptyPositionCostBreakdownItem(): PositionCostBreakdownItem {
  return { id: createId(), name: "", amount: null };
}

function addPositionCostBreakdownItem(positionId: string): void {
  if (!positionId) return;
  state.positions = state.positions.map((position) => {
    if (position.id !== positionId || !positionCostBreakdownEligible(position)) return position;
    return {
      ...position,
      costBreakdown: [...(position.costBreakdown ?? []), emptyPositionCostBreakdownItem()]
    };
  });
  renderAll();
}

function removePositionCostBreakdownItem(positionId: string, itemId: string): void {
  if (!positionId || !itemId) return;
  state.positions = state.positions.map((position) => {
    if (position.id !== positionId) return position;
    const costBreakdown = (position.costBreakdown ?? []).filter((item) => item.id !== itemId);
    const nextCostBreakdown =
      positionCostDialogId === positionId && costBreakdown.length === 0
        ? [emptyPositionCostBreakdownItem()]
        : costBreakdown;
    return positionWithCostBreakdownAmount({ ...position, costBreakdown: nextCostBreakdown });
  });
  renderAll();
}

function updatePositionCostBreakdownItem(positionId: string, itemId: string, field: string, value: string): void {
  if (!positionId || !itemId) return;
  state.positions = state.positions.map((position) => {
    if (position.id !== positionId) return position;
    const costBreakdown = (position.costBreakdown?.length ? position.costBreakdown : [emptyPositionCostBreakdownItem()]).map(
      (item) => {
        if (item.id !== itemId) return item;
        if (field === "name") return { ...item, name: value };
        if (field === "amount") {
          return { ...item, amount: value.trim() === "" ? null : Math.max(0, numberValue(value)) };
        }
        return item;
      }
    );
    return positionWithCostBreakdownAmount({ ...position, costBreakdown });
  });
}

function positionWithCostBreakdownAmount(position: ReservePosition): ReservePosition {
  const costBreakdown = normalizePositionCostBreakdown(position.costBreakdown);
  const total = positionCostBreakdownTotal(costBreakdown);
  return {
    ...position,
    amount: total === null ? position.amount : total,
    costBreakdown: costBreakdown.length ? costBreakdown : undefined
  };
}

function renderPositionModeControls(): void {
  for (const mode of ["income", "expense", "reserve", "savings"] as PositionTableMode[]) {
    const button = document.querySelector<HTMLButtonElement>(`[data-action='show-${mode}-positions']`);
    if (!button) continue;
    const active = selectedPositionMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  const cadenceHost = document.querySelector<HTMLDivElement>("#positionCadenceSwitchHost");
  if (cadenceHost) {
    const cadences = positionCadencesForTableMode(selectedPositionMode);
    const activeCadence = activePositionCadence();
    cadenceHost.innerHTML = cadences.length
      ? `
        <div class="position-cadence-label">Rhythmus</div>
        <div class="position-mode-switch position-cadence-switch" role="group" aria-label="${positionCadenceGroupLabel(
          selectedPositionMode
        )}">
          ${cadences
            .map((cadence) => {
              const active = activeCadence === cadence;
              return `
                <button
                  class="position-mode-button ${active ? "active" : ""}"
                  type="button"
                  data-action="set-position-cadence-${cadence}"
                  aria-pressed="${active}"
                >${escapeHtml(positionCadenceButtonLabel(cadence))}</button>
              `;
            })
            .join("")}
        </div>
      `
      : "";
  }
  const addButton = document.querySelector<HTMLButtonElement>("#addPositionButton");
  if (addButton) {
    addButton.textContent = addPositionButtonLabel(selectedPositionMode, activePositionCadence());
  }
}

function renderPositionTableControls(basePositions: ReservePosition[], sourcePositions: ReservePosition[]): void {
  const wrapper = document.querySelector<HTMLDivElement>("#positionTableControls");
  if (!wrapper) return;
  syncPositionFilterToggle();
  const view = currentPositionTableView();
  const draft = normalizedPositionFilterDraft();
  const cadence = activePositionCadence();
  const columns = positionTableColumnsForMode(selectedPositionMode, cadence);
  const selectedConfig = positionTableColumnConfig(selectedPositionMode, draft.column, cadence) ?? columns[0];
  const operators = positionTableOperatorsForColumn(selectedPositionMode, selectedConfig.column, cadence);
  const options = positionTableSelectOptions(selectedPositionMode, selectedConfig.column, sourcePositions);
  const labelOptions = positionTableLabelOptions(sourcePositions, selectedPositionMode);
  const active = hasActivePositionTableView(view);
  const visibleCount = positionTableRows(sourcePositions, selectedPositionMode, view).length;

  wrapper.innerHTML = `
    <div class="position-table-view-row">
      <div class="position-view-chips" aria-live="polite">
        ${view.filters.map(positionFilterChip).join("")}
        ${view.sort ? positionSortChip(view.sort) : ""}
      </div>
      <span class="position-view-count">${visibleCount} von ${basePositions.length}</span>
    </div>
    ${labelOptions.length ? positionLabelFilterRow(labelOptions, view.selectedLabels) : ""}
    ${
      positionFilterPopupOpen
        ? `
    <div id="positionFilterPopup" class="position-filter-popup" role="dialog" aria-label="Positionsfilter">
      <div class="position-filter-popup-head">
        <strong>Filter</strong>
        <button class="chart-popup-close" type="button" data-action="close-position-filter" aria-label="Filter schliessen">x</button>
      </div>
      <div class="position-filter-builder">
        <label class="filter-field">
          <span>Spalte</span>
          <select data-position-filter-draft="column">
            ${columns
              .map(
                (column) =>
                  `<option value="${column.column}" ${column.column === selectedConfig.column ? "selected" : ""}>${escapeHtml(
                    column.label
                  )}</option>`
              )
              .join("")}
          </select>
        </label>
        <label class="filter-field operator">
          <span>Operator</span>
          <select data-position-filter-draft="operator">
            ${operators
              .map(
                (operator) =>
                  `<option value="${operator}" ${operator === draft.operator ? "selected" : ""}>${escapeHtml(
                    positionTableOperatorLabel(operator)
                  )}</option>`
              )
              .join("")}
          </select>
        </label>
        <label class="filter-field value">
          <span>Wert</span>
          ${positionFilterValueControl(selectedConfig.kind, draft.value, options)}
        </label>
        <button class="button secondary" type="button" data-action="add-position-filter">Filter setzen</button>
        <button class="button secondary" type="button" data-action="clear-position-table-view" ${
          active ? "" : "disabled"
        }>
          Zuruecksetzen
        </button>
      </div>
    </div>
        `
        : ""
    }
  `;
}

function positionLabelFilterRow(
  labels: Array<{ value: string; label: string }>,
  selectedLabels: string[]
): string {
  const selected = new Set(selectedLabels.map((label) => normalizePositionIcon(label)));
  return `
    <div class="position-label-filter-row" aria-label="Label-Schnellfilter">
      ${labels
        .map((label) => {
          const active = selected.has(label.value);
          return `
            <button
              class="position-label-filter-button ${active ? "active" : ""}"
              type="button"
              data-action="toggle-position-label-filter"
              data-position-label="${escapeHtml(label.value)}"
              aria-pressed="${active}"
              aria-label="Label ${escapeHtml(label.label)} ${active ? "deaktivieren" : "aktivieren"}"
              title="${escapeHtml(label.label)}"
            >
              ${positionIconSvg(label.value)}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function syncPositionFilterToggle(): void {
  const button = document.querySelector<HTMLButtonElement>("[data-action='toggle-position-filter']");
  if (!button) return;
  button.classList.toggle("active", positionFilterPopupOpen);
  button.setAttribute("aria-expanded", String(positionFilterPopupOpen));
}

function positionFilterValueControl(
  kind: "text" | "select" | "number",
  value: string,
  options: Array<{ value: string; label: string }>
): string {
  if (kind === "select") {
    return `
      <select data-position-filter-draft="value">
        <option value="">Auswaehlen</option>
        ${options
          .map(
            (option) =>
              `<option value="${escapeHtml(option.value)}" ${option.value === value ? "selected" : ""}>${escapeHtml(
                option.label
              )}</option>`
          )
          .join("")}
      </select>
    `;
  }

  if (kind === "number") {
    return `<input type="number" step="0.01" value="${escapeHtml(value)}" data-position-filter-draft="value" />`;
  }

  return `<input type="search" value="${escapeHtml(value)}" data-position-filter-draft="value" />`;
}

function positionFilterChip(filter: PositionTableView["filters"][number]): string {
  return `
    <button
      class="position-view-chip"
      type="button"
      data-action="remove-position-filter"
      data-filter-id="${escapeHtml(filter.id)}"
      aria-label="Filter entfernen: ${escapeHtml(positionTableFilterChipLabel(selectedPositionMode, filter))}"
    >
      <span>${escapeHtml(positionTableFilterChipLabel(selectedPositionMode, filter))}</span>
      <strong aria-hidden="true">x</strong>
    </button>
  `;
}

function positionSortChip(sort: NonNullable<PositionTableView["sort"]>): string {
  return `
    <button
      class="position-view-chip sort"
      type="button"
      data-action="clear-position-sort"
      aria-label="Sortierung entfernen: ${escapeHtml(positionTableSortLabel(selectedPositionMode, sort))}"
    >
      <span>${escapeHtml(positionTableSortLabel(selectedPositionMode, sort))}</span>
      <strong aria-hidden="true">x</strong>
    </button>
  `;
}

function renderPositionTableHead(): void {
  const head = document.querySelector<HTMLTableSectionElement>("#positionsHead");
  if (!head) return;
  const hideIncomeMonthRange = positionTableHidesIncomeMonthRange();
  const hideExpenseMonthRange = positionTableHidesExpenseMonthRange();
  const expenseOnce = selectedPositionMode === "expense" && activePositionCadence() === "once";
  const savingsWithoutRhythm = selectedPositionMode === "savings" && activePositionCadence() === "none";
  const dateHeaders =
    hideIncomeMonthRange || hideExpenseMonthRange
      ? ""
      : expenseOnce
      ? positionSortableHeader("payoutYear", "Abgangsjahr")
      : savingsWithoutRhythm
      ? [
          positionSortableHeader("payoutYear", "Jahr"),
          positionSortableHeader("startMonth", "Start"),
          positionSortableHeader("endMonth", "Ende")
        ].join("")
      : selectedPositionMode === "savings"
      ? [
          positionSortableHeader(
            "payoutYear",
            '<span class="split-header">Fix-Start<span>Abgangsjahr</span></span>'
          ),
          positionSortableHeader(
            "startMonth",
            '<span class="split-header">Fix-Ende<span>Anfang Monat</span></span>'
          )
        ].join("")
      : [positionSortableHeader("startMonth", "Start"), positionSortableHeader("endMonth", "Ende")].join("");
  const timingLabel =
    selectedPositionMode === "income" ? "Eingang" : selectedPositionMode === "savings" ? "Transfer" : "Abgang";
  const monthLabel =
    selectedPositionMode === "income"
      ? "Eingangsmonat"
      : selectedPositionMode === "savings"
        ? "Transfermonat"
        : "Abgangsmonat";
  head.innerHTML = `
    <tr>
      <th class="reorder-col"></th>
      ${positionSortableHeader("active", "Aktiv", "check-col")}
      ${positionSortableHeader("visible", "View", "check-col")}
      ${positionSortableHeader("label", "Label", "label-col")}
      <th class="planning-year-col">Planung</th>
      ${positionSortableHeader("name", "Name", "name-col")}
      ${positionTableShowsTypeColumn(selectedPositionMode) ? positionSortableHeader("type", "Art") : ""}
      ${positionSortableHeader("amount", "Betrag", "amount-col")}
      ${dateHeaders}
      ${selectedPositionMode === "income" ? positionSortableHeader("payoutYear", "Jahr") : ""}
      ${positionSortableHeader("payoutType", timingLabel)}
      ${savingsWithoutRhythm ? "" : positionSortableHeader("payoutMonth", monthLabel)}
      ${positionSortableHeader("payoutDay", "Tag", "day-col")}
      ${
        selectedPositionMode !== "income"
          ? `${positionSortableHeader("interestBearing", "Zins", "interest-toggle-col")}${positionSortableHeader(
              "cashback",
              "Cashb.",
              "cashback-toggle-col"
            )}`
          : ""
      }
      <th></th>
    </tr>
  `;
}

function positionSortableHeader(column: PositionTableFilterColumn, label: string, className = ""): string {
  const view = currentPositionTableView();
  const direction = view.sort?.column === column ? view.sort.direction : null;
  const ariaSort = direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none";
  const indicator = direction === "asc" ? "^" : direction === "desc" ? "v" : "";
  const classes = ["sortable-col", className].filter(Boolean).join(" ");
  return `
    <th class="${classes}" aria-sort="${ariaSort}">
      <button class="table-sort-button ${direction ? "active" : ""}" type="button" data-action="sort-position-table-${column}">
        <span>${label}</span>
        <span class="sort-indicator" aria-hidden="true">${indicator}</span>
      </button>
    </th>
  `;
}

function positionTableColumnCount(mode: PositionTableMode, cadence: PositionTableCadence | null = null): number {
  let count = 10;
  if (positionTableShowsTypeColumn(mode)) count += 1;
  if (mode === "income") count += cadence === null || cadence === "none" ? 3 : 1;
  else if (mode === "expense" && (cadence === "monthly" || cadence === "yearly")) count += 0;
  else if (mode === "expense" && cadence === "once") count += 1;
  else count += mode === "savings" && cadence === "none" ? 3 : 2;
  if (!(mode === "savings" && cadence === "none")) count += 1;
  if (mode !== "income") count += 2;
  return count;
}

function positionTableShowsTypeColumn(mode: PositionTableMode): boolean {
  return mode === "reserve";
}

function positionTableHidesIncomeMonthRange(): boolean {
  return selectedPositionMode === "income" && activePositionCadence() !== "none";
}

function positionTableHidesExpenseMonthRange(): boolean {
  return selectedPositionMode === "expense" && ["monthly", "yearly"].includes(String(activePositionCadence()));
}

function positionTableShowsPayoutMonthColumn(position: ReservePosition): boolean {
  return !(selectedPositionMode === "savings" && position.type === "savings" && position.payoutType === "none");
}

function positionPlanningYearSelect(position: ReservePosition): string {
  const planningYear = positionPlanningYear(position);
  const startOption =
    position.payoutType === "once"
      ? ""
      : `<option value="start" ${planningYear === null ? "selected" : ""}>Start</option>`;
  return `
    <select class="planning-year-select" data-position-id="${escapeHtml(position.id)}" data-position-field="planningYear" aria-label="Planungsjahr">
      ${startOption}
      ${planningYearOptions(state.settings.year)
        .map(
          (year) =>
            `<option value="${year}" ${planningYear === year ? "selected" : ""}>${year}</option>`
        )
        .join("")}
    </select>
  `;
}

function positionAmountCell(position: ReservePosition): string {
  if (!positionCostBreakdownEligible(position)) {
    return `<input class="small-input amount-input" type="number" min="0" step="0.01" value="${position.amount}" data-position-id="${position.id}" data-position-field="amount" />`;
  }

  const total = positionCostBreakdownTotal(position.costBreakdown);
  if (total !== null) {
    return `
      <button
        class="position-cost-button locked"
        type="button"
        data-action="open-position-cost-dialog-${escapeHtml(position.id)}"
        aria-haspopup="dialog"
        aria-label="Betragsdetails bearbeiten"
      >
        <strong>${money(total)}</strong>
        <span>Details</span>
      </button>
    `;
  }

  return `
    <div class="position-amount-detail-cell">
      <input class="small-input amount-input" type="number" min="0" step="0.01" value="${
        position.amount
      }" data-position-id="${position.id}" data-position-field="amount" />
      <button
        class="position-cost-mini-button"
        type="button"
        data-action="open-position-cost-dialog-${escapeHtml(position.id)}"
        aria-haspopup="dialog"
        aria-label="Betragsdetails bearbeiten"
      >Details</button>
    </div>
  `;
}

function positionCostBreakdownEligible(position: ReservePosition): boolean {
  const mode = positionTableMode(position);
  return (mode === "expense" || mode === "income") && selectedPositionMode === mode && positionAllowsCostBreakdown(position);
}

function positionAllowsCostBreakdown(position: ReservePosition): boolean {
  return positionCostBreakdownAllowed(positionFlow(position), position.type, position.payoutType);
}

function positionCostBreakdownAllowed(
  flow: ReservePosition["flow"],
  type: ReservePosition["type"],
  payoutType: ReservePosition["payoutType"]
): boolean {
  if (flow === "expense" && type === "temporary") {
    return payoutType === "monthly" || payoutType === "yearly" || payoutType === "once";
  }
  return flow === "income" && type === "incomeTemporary" && payoutType === "once";
}

function positionCostBreakdownTotal(items: PositionCostBreakdownItem[] | undefined): number | null {
  if (!items?.some((item) => item.amount !== null)) return null;
  return items.reduce((sum, item) => sum + Math.max(0, Number(item.amount ?? 0)), 0);
}

function normalizePositionCostBreakdown(items: PositionCostBreakdownItem[] | undefined): PositionCostBreakdownItem[] {
  if (!items?.length) return [];
  return items.map((item) => ({
    id: String(item.id || createId()),
    name: String(item.name ?? ""),
    amount: item.amount === null || item.amount === undefined ? null : Math.max(0, Number(item.amount) || 0)
  }));
}

function positionDragHandle(positionId: string, locked: boolean): string {
  if (locked) {
    return `
      <button
        class="drag-handle disabled"
        type="button"
        disabled
        aria-label="Reihenfolge bei Filter oder Sortierung gesperrt"
        title="Filter oder Sortierung zuruecksetzen, um zu verschieben"
      >:::</button>
    `;
  }
  return `<button class="drag-handle" type="button" draggable="true" data-position-drag-id="${positionId}" aria-label="Position verschieben" title="Position verschieben">:::</button>`;
}

function currentPositionTableView(): PositionTableView {
  return state.positionTableView[selectedPositionMode] ?? emptyPositionTableView();
}

function normalizeCurrentPositionTableViewColumns(): void {
  const cadence = activePositionCadence();
  const availableColumns = new Set(
    positionTableColumnsForMode(selectedPositionMode, cadence).map((config) => config.column)
  );
  updateCurrentPositionTableView((view) => ({
    ...view,
    filters: view.filters.filter((filter) => availableColumns.has(filter.column)),
    sort: view.sort && availableColumns.has(view.sort.column) ? view.sort : null
  }));
}

function updateCurrentPositionTableView(updater: (view: PositionTableView) => PositionTableView): void {
  state = {
    ...state,
    positionTableView: {
      ...state.positionTableView,
      [selectedPositionMode]: updater(currentPositionTableView())
    }
  };
}

function createPositionFilterDrafts(): Record<PositionTableMode, PositionFilterDraft> {
  return {
    income: defaultPositionFilterDraft("income"),
    expense: defaultPositionFilterDraft("expense"),
    reserve: defaultPositionFilterDraft("reserve"),
    savings: defaultPositionFilterDraft("savings")
  };
}

function defaultPositionFilterDraft(mode: PositionTableMode): PositionFilterDraft {
  const column = positionTableColumnsForMode(mode).find((config) => config.column === "name")?.column ?? "name";
  return {
    column,
    operator: positionTableOperatorsForColumn(mode, column)[0],
    value: ""
  };
}

function normalizedPositionFilterDraft(): PositionFilterDraft {
  const draft = positionFilterDrafts[selectedPositionMode] ?? defaultPositionFilterDraft(selectedPositionMode);
  const cadence = activePositionCadence();
  const config = positionTableColumnConfig(selectedPositionMode, draft.column, cadence);
  const column = config ? draft.column : "name";
  const operators = positionTableOperatorsForColumn(selectedPositionMode, column, cadence);
  const operator = operators.includes(draft.operator) ? draft.operator : operators[0];
  const normalized = { column, operator, value: draft.value };
  positionFilterDrafts = {
    ...positionFilterDrafts,
    [selectedPositionMode]: normalized
  };
  return normalized;
}

function updatePositionFilterDraft(field: keyof PositionFilterDraft, value: string): void {
  const current = normalizedPositionFilterDraft();
  if (field === "column") {
    const column = value as PositionTableFilterColumn;
    const cadence = activePositionCadence();
    const nextColumn = positionTableColumnConfig(selectedPositionMode, column, cadence) ? column : current.column;
    positionFilterDrafts = {
      ...positionFilterDrafts,
      [selectedPositionMode]: {
        column: nextColumn,
        operator: positionTableOperatorsForColumn(selectedPositionMode, nextColumn, cadence)[0],
        value: ""
      }
    };
    renderPositions();
    return;
  }

  if (field === "operator") {
    const operator = value as PositionTableFilterOperator;
    const operators = positionTableOperatorsForColumn(
      selectedPositionMode,
      current.column,
      activePositionCadence()
    );
    positionFilterDrafts = {
      ...positionFilterDrafts,
      [selectedPositionMode]: {
        ...current,
        operator: operators.includes(operator) ? operator : operators[0]
      }
    };
    return;
  }

  positionFilterDrafts = {
    ...positionFilterDrafts,
    [selectedPositionMode]: { ...current, value }
  };
}

function addPositionTableFilter(): void {
  const draft = currentPositionFilterDraftFromControls();
  const value = String(draft.value).trim();
  if (!value) return;
  updateCurrentPositionTableView((view) => ({
    ...view,
    filters: [...view.filters, { id: createId(), column: draft.column, operator: draft.operator, value }]
  }));
  positionFilterDrafts = {
    ...positionFilterDrafts,
    [selectedPositionMode]: { ...draft, value: "" }
  };
  renderPositions();
  saveState(state);
}

function currentPositionFilterDraftFromControls(): PositionFilterDraft {
  const draft = normalizedPositionFilterDraft();
  const columnInput = document.querySelector<HTMLSelectElement>('[data-position-filter-draft="column"]');
  const operatorInput = document.querySelector<HTMLSelectElement>('[data-position-filter-draft="operator"]');
  const valueInput = document.querySelector<HTMLInputElement | HTMLSelectElement>('[data-position-filter-draft="value"]');
  const column = (columnInput?.value || draft.column) as PositionTableFilterColumn;
  const cadence = activePositionCadence();
  const nextColumn = positionTableColumnConfig(selectedPositionMode, column, cadence) ? column : draft.column;
  const operators = positionTableOperatorsForColumn(selectedPositionMode, nextColumn, cadence);
  const operator = (operatorInput?.value || draft.operator) as PositionTableFilterOperator;
  return {
    column: nextColumn,
    operator: operators.includes(operator) ? operator : operators[0],
    value: valueInput?.value ?? draft.value
  };
}

function removePositionTableFilter(filterId: string): void {
  updateCurrentPositionTableView((view) => ({
    ...view,
    filters: view.filters.filter((filter) => filter.id !== filterId)
  }));
  renderPositions();
  saveState(state);
}

function clearPositionTableSort(): void {
  updateCurrentPositionTableView((view) => ({ ...view, sort: null }));
  renderPositions();
  saveState(state);
}

function clearCurrentPositionTableView(): void {
  updateCurrentPositionTableView(() => emptyPositionTableView());
  renderPositions();
  saveState(state);
}

function togglePositionLabelFilter(label: string): void {
  const normalizedLabel = normalizePositionIcon(label);
  updateCurrentPositionTableView((view) => {
    const selected = new Set(view.selectedLabels.map((item) => normalizePositionIcon(item)));
    if (selected.has(normalizedLabel)) selected.delete(normalizedLabel);
    else selected.add(normalizedLabel);
    return { ...view, selectedLabels: Array.from(selected) };
  });
  renderPositions();
  saveState(state);
}

function togglePositionFilterPopup(): void {
  positionFilterPopupOpen = !positionFilterPopupOpen;
  renderPositions();
}

function hidePositionFilterPopup(): void {
  if (!positionFilterPopupOpen) return;
  positionFilterPopupOpen = false;
  renderPositions();
}

function togglePositionTableSort(column: PositionTableFilterColumn): void {
  if (!positionTableColumnConfig(selectedPositionMode, column, activePositionCadence())) return;
  updateCurrentPositionTableView((view) => {
    if (view.sort?.column !== column) return { ...view, sort: { column, direction: "asc" } };
    if (view.sort.direction === "asc") return { ...view, sort: { column, direction: "desc" } };
    return { ...view, sort: null };
  });
  renderPositions();
  saveState(state);
}

function activePositionCadence(): PositionTableCadence | null {
  if (selectedPositionMode === "income") return selectedIncomeCadence;
  if (selectedPositionMode === "expense") return selectedExpenseCadence;
  if (selectedPositionMode === "reserve") return selectedReserveCadence;
  if (selectedPositionMode === "savings") return selectedSavingsCadence;
  return null;
}

function positionCadenceButtonLabel(cadence: PositionTableCadence): string {
  if (cadence === "fixed") return "Fixbestand";
  if (cadence === "monthly") return "Monatlich";
  if (cadence === "yearly") return "Jaehrlich";
  if (cadence === "once") return "Einmalig";
  return "Ohne Rhythmus";
}

function positionCadenceGroupLabel(mode: PositionTableMode): string {
  if (mode === "income") return "Einnahmen-Rhythmus";
  if (mode === "reserve") return "Ruecklagen-Vorauswahl";
  if (mode === "savings") return "Sparen-Rhythmus";
  return "Ausgaben-Rhythmus";
}

function positionModeEmptyLabel(mode: PositionTableMode, cadence: PositionTableCadence | null = null): string {
  if (mode === "income") {
    if (cadence === "yearly") return "jaehrliche Einnahmen";
    if (cadence === "once") return "einmalige Einnahmen";
    if (cadence === "none") return "Einnahmen ohne Rhythmus";
    return "monatliche Einnahmen";
  }
  if (mode === "reserve") {
    if (cadence === "fixed") return "Fixbestaende";
    return "monatliche Ruecklagen";
  }
  if (mode === "savings") {
    if (cadence === "yearly") return "jaehrliche Sparpositionen";
    if (cadence === "once") return "einmalige Sparpositionen";
    if (cadence === "none") return "Sparpositionen ohne Rhythmus";
    return "monatliche Sparpositionen";
  }
  if (cadence === "yearly") return "jaehrliche Ausgaben";
  if (cadence === "once") return "einmalige Ausgaben";
  if (cadence === "none") return "Ausgaben ohne Rhythmus";
  return "monatliche Ausgaben";
}

function addPositionButtonLabel(mode: PositionTableMode, cadence: PositionTableCadence | null = null): string {
  if (mode === "income") {
    if (cadence === "yearly") return "Jaehrliche Einnahme hinzufuegen";
    if (cadence === "once") return "Einmalige Einnahme hinzufuegen";
    if (cadence === "none") return "Einnahme ohne Rhythmus hinzufuegen";
    return "Monatliche Einnahme hinzufuegen";
  }
  if (mode === "reserve") return cadence === "fixed" ? "Fixbestand hinzufuegen" : "Monatliche Ruecklage hinzufuegen";
  if (mode === "savings") {
    if (cadence === "yearly") return "Jaehrliche Sparposition hinzufuegen";
    if (cadence === "once") return "Einmalige Sparposition hinzufuegen";
    if (cadence === "none") return "Sparposition ohne Rhythmus hinzufuegen";
    return "Monatliche Sparposition hinzufuegen";
  }
  if (cadence === "yearly") return "Jaehrliche Ausgabe hinzufuegen";
  if (cadence === "once") return "Einmalige Ausgabe hinzufuegen";
  if (cadence === "none") return "Ausgabe ohne Rhythmus hinzufuegen";
  return "Monatliche Ausgabe hinzufuegen";
}

function newPositionName(mode: PositionTableMode, cadence: PositionTableCadence | null = null): string {
  if (mode === "income") {
    if (cadence === "yearly") return "Neue jaehrliche Einnahme";
    if (cadence === "once") return "Neue einmalige Einnahme";
    if (cadence === "none") return "Neue Einnahme ohne Rhythmus";
    return "Neue monatliche Einnahme";
  }
  if (mode === "reserve") return cadence === "fixed" ? "Neuer Fixbestand" : "Neue monatliche Ruecklage";
  if (mode === "savings") {
    if (cadence === "yearly") return "Neue jaehrliche Sparposition";
    if (cadence === "once") return "Neue einmalige Sparposition";
    if (cadence === "none") return "Neue Sparposition ohne Rhythmus";
    return "Neue monatliche Sparposition";
  }
  if (cadence === "yearly") return "Neue jaehrliche Ausgabe";
  if (cadence === "once") return "Neue einmalige Ausgabe";
  if (cadence === "none") return "Neue Ausgabe ohne Rhythmus";
  return "Neue monatliche Ausgabe";
}

function renderAccountYearTables(): void {
  const host = document.querySelector<HTMLDivElement>("#accountYearTableOverview");
  const toggleButton = document.querySelector<HTMLButtonElement>("[data-action='toggle-result-max-needed']");
  if (toggleButton) {
    toggleButton.classList.toggle("active", showResultMaxNeeded);
    toggleButton.setAttribute("aria-pressed", String(showResultMaxNeeded));
  }
  if (!host) return;
  host.innerHTML = renderAccountYearTableOverview({
    accounts: planningAccountsForActiveYear(),
    settings: activePlanningSettings(),
    activeAccountId: state.ui.selectedPlanningAccountId,
    showMaxNeeded: showResultMaxNeeded
  });
}

function renderReserveChartPopup(summary: ReturnType<typeof calculateReserveSummary>): void {
  const popup = document.querySelector<HTMLDivElement>("#reserveChartPopup");
  if (!popup) return;

  const model = buildReserveChartModel(summary);
  popup.innerHTML = `
    ${reservePieChart(model)}
    <div class="reserve-chart-legend">
      <span><i class="legend-dot green"></i>Einnahmen</span>
      <span><i class="legend-dot red"></i>Ausgaben</span>
      <span><i class="legend-dot orange"></i>Ruecklagen</span>
      <span><i class="legend-dot purple"></i>Sparen</span>
    </div>
    <div class="reserve-chart-insight">${escapeHtml(model.insight)}</div>
  `;
  popup.hidden = false;
}

function buildReserveChartModel(summary: ReturnType<typeof calculateReserveSummary>): ReserveChartModel {
  const chartPositions = activePlanningPositions();
  const chartSettings = activePlanningSettings();
  const totals = summary.rows.reduce<ReserveChartTotals>((sum, row) => {
    const reserves = chartPositions.reduce((sum, position) => {
      return position.type === "reserve"
        ? sum + calculatePlannedOutflowForSingleMonth(position, chartSettings.year, row.monthNumber)
        : sum;
    }, 0);
    const savings = chartPositions.reduce((sum, position) => {
      return position.type === "savings"
        ? sum + calculatePlannedOutflowForSingleMonth(position, chartSettings.year, row.monthNumber)
        : sum;
    }, 0);
    const income = Math.max(0, row.plannedIncome);
    const expense = Math.max(0, row.plannedOutflow - reserves - savings);
    const reserve = Math.max(0, reserves);
    const saving = Math.max(0, savings);
    return {
      income: sum.income + income,
      expense: sum.expense + expense,
      reserve: sum.reserve + reserve,
      savings: sum.savings + saving,
      remaining: sum.remaining + income - expense - reserve - saving
    };
  }, { income: 0, expense: 0, reserve: 0, savings: 0, remaining: 0 });

  return {
    totals,
    insight: reserveChartInsight(totals)
  };
}

function reservePieChart(model: ReserveChartModel): string {
  const segments = reservePieSegments(model.totals);
  const savingsRate = model.totals.income > 0 ? model.totals.savings / model.totals.income : 0;
  const background = reservePieBackground(segments);
  return `
    <div class="reserve-pie-layout" aria-label="Kreisdiagramm">
      <div class="reserve-pie" style="background: ${background}">
        <div class="reserve-pie-center">
          <span>Einnahmen</span>
          <strong>${money(model.totals.income)}</strong>
          <small>Sparquote ${percent(savingsRate * 100)}</small>
        </div>
      </div>
      <div class="reserve-pie-details">
        ${reservePieField("income", "Einnahmen", model.totals.income, "Bezugswert")}
        ${reservePieField("expense", "Ausgaben", model.totals.expense, "Anteil am Einkommen")}
        ${reservePieField("reserve", "Ruecklagen", model.totals.reserve, "Anteil am Einkommen")}
        ${reservePieField("savings", "Sparrate", model.totals.savings, `Sparquote ${percent(savingsRate * 100)}`)}
        ${reservePieField(
          model.totals.remaining >= 0 ? "remaining" : "deficit",
          model.totals.remaining >= 0 ? "Uebrig" : "Fehlbetrag",
          Math.abs(model.totals.remaining),
          model.totals.remaining >= 0 ? "freier Spielraum" : "Optimierungsbedarf"
        )}
      </div>
    </div>
  `;
}

function reservePieSegments(totals: ReserveChartTotals): Array<{ key: string; value: number; color: string }> {
  const remaining = Math.max(0, totals.remaining);
  const deficit = Math.max(0, -totals.remaining);
  return [
    { key: "expense", value: totals.expense, color: "var(--danger)" },
    { key: "reserve", value: totals.reserve, color: "var(--reserve)" },
    { key: "savings", value: totals.savings, color: "var(--accent)" },
    { key: "remaining", value: remaining, color: "var(--good)" },
    { key: "deficit", value: deficit, color: "var(--gold)" }
  ].filter((segment) => segment.value > 0.01);
}

function reservePieBackground(segments: Array<{ key: string; value: number; color: string }>): string {
  if (!segments.length) return "var(--surface-muted)";
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let cursor = 0;
  const stops = segments.map((segment) => {
    const start = cursor;
    cursor += (segment.value / total) * 360;
    return `${segment.color} ${start.toFixed(1)}deg ${cursor.toFixed(1)}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

function reservePieField(key: string, label: string, value: number, detail: string): string {
  return `
    <div class="reserve-pie-field ${escapeHtml(key)}">
      <span>${escapeHtml(label)}</span>
      <strong>${money(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </div>
  `;
}

function reserveChartInsight(totals: ReserveChartTotals): string {
  const savingsRate = totals.income > 0 ? totals.savings / totals.income : 0;
  if (totals.income <= 0) return "Keine Einnahmen im Jahr: zuerst Einnahmepositionen pruefen oder ergaenzen.";
  if (totals.remaining < 0) {
    return `Jahresrest ist negativ: ${money(Math.abs(totals.remaining))} Fehlbetrag.`;
  }
  if (savingsRate < 0.15) {
    return `Sparquote ${percent(savingsRate * 100)} bei ${money(totals.remaining)} freiem Jahresrest.`;
  }
  return `Sparquote ${percent(savingsRate * 100)} bei ${money(totals.remaining)} freiem Jahresrest.`;
}

function renderInvestmentIncludeList(): void {
  const list = document.querySelector<HTMLDivElement>("#investmentIncludeList");
  if (!list) return;

  const depot = activeInvestmentDepot();
  const settings = depotInvestmentSettings(depot);
  const investmentAccount = selectedInvestmentPlanningAccount();
  const otherDepots = otherInvestmentDepots(depot);
  const blockedInterestDepot = otherDepots.find((item) => depotInvestmentSettings(item).includeAccountInterest);
  const blockedCashbackDepot = otherDepots.find((item) => depotInvestmentSettings(item).includeAccountCashback);
  const currentInterestTransfer = currentAnnualInvestmentTransferAmount(
    investmentAccount.yearlyRows,
    "interest",
    settings
  );
  const currentCashbackTransfer = currentAnnualInvestmentTransferAmount(
    investmentAccount.yearlyRows,
    "cashback",
    settings
  );
  const interestButton = document.querySelector<HTMLButtonElement>("[data-action='toggle-interest-investment']");
  if (interestButton) {
    const blocked = Boolean(blockedInterestDepot);
    interestButton.classList.toggle("active", settings.includeAccountInterest);
    interestButton.disabled = blocked;
    interestButton.classList.toggle("blocked", blocked);
    interestButton.setAttribute("aria-pressed", String(settings.includeAccountInterest));
  }
  const cashbackButton = document.querySelector<HTMLButtonElement>("[data-action='toggle-cashback-investment']");
  if (cashbackButton) {
    const blocked = Boolean(blockedCashbackDepot);
    cashbackButton.classList.toggle("active", settings.includeAccountCashback);
    cashbackButton.disabled = blocked;
    cashbackButton.classList.toggle("blocked", blocked);
    cashbackButton.setAttribute("aria-pressed", String(settings.includeAccountCashback));
  }
  setText(
    "interestInvestmentAmount",
    blockedInterestDepot
      ? `belegt im ${depotLabel(blockedInterestDepot)}`
      : `${money(currentInterestTransfer)} jaehrlich aus Jahrestabelle`
  );
  setText(
    "cashbackInvestmentAmount",
    blockedCashbackDepot
      ? `belegt im ${depotLabel(blockedCashbackDepot)}`
      : `${money(currentCashbackTransfer)} jaehrlich aus Jahrestabelle`
  );

  const savingsPositions = selectableInvestmentSavingsPositions(investmentAccount.yearlyRows);
  if (!savingsPositions.length) {
    list.innerHTML = `<div class="include-empty">Keine Sparrate angelegt.</div>`;
    hideInvestmentIncludePopup();
    return;
  }

  const visibleSavingsPositions = visibleInvestmentSavingsPositions(savingsPositions, settings, otherDepots);
  if (!visibleSavingsPositions.length) {
    list.innerHTML = `<div class="include-empty">Alle Sparraten sind in anderen Depots eingeplant.</div>`;
    hideInvestmentIncludePopup();
    return;
  }

  const selection = investmentSavingsSelectionSummary(visibleSavingsPositions, settings.includedIds, state.settings.year);
  list.innerHTML = investmentIncludeSummaryButton(visibleSavingsPositions.length, selection);
  renderInvestmentIncludePopup(visibleSavingsPositions, settings);
}

function visibleInvestmentSavingsPositions(
  savingsPositions: ReservePosition[],
  settings: InvestmentSettings,
  otherDepots: InvestmentDepotKey[]
): ReservePosition[] {
  const blockedPositionIds = new Set(otherDepots.flatMap((item) => depotInvestmentSettings(item).includedIds));
  return savingsPositions.filter(
    (position) => !blockedPositionIds.has(position.id) || settings.includedIds.includes(position.id)
  );
}

function renderInvestmentSelectionChange(): void {
  clearInvestmentProjectionCaches();
  const investmentAccount = selectedInvestmentPlanningAccount();
  state.investmentByAccountId = {
    ...state.investmentByAccountId,
    [investmentAccount.id]: state.investment
  };
  investmentAccountContextId = investmentAccount.id;

  const activeReserve = calculateReserveSummary(activePlanningSettings(), activePlanningPositions());

  syncInvestmentIncludeSelectionState();
  renderCalculations(activeReserve);
  saveState(state);
}

function syncInvestmentIncludeSelectionState(): void {
  const depot = activeInvestmentDepot();
  const settings = depotInvestmentSettings(depot);
  const positions = visibleInvestmentSavingsPositions(
    selectableInvestmentSavingsPositions(selectedInvestmentPlanningAccount().yearlyRows),
    settings,
    otherInvestmentDepots(depot)
  );
  if (!positions.length) return;

  const selection = investmentSavingsSelectionSummary(positions, settings.includedIds, state.settings.year);
  const summaryText = `${intNumber(selection.selectedCount)} aktiv · ${money(selection.yearlyAmount)} jaehrlich`;
  const countText = `${intNumber(positions.length)} verfuegbar`;
  const summaryButton = document.querySelector<HTMLButtonElement>("[data-action='toggle-investment-include-popup']");
  if (summaryButton) {
    summaryButton.classList.toggle("active", selection.selectedCount > 0);
    summaryButton.setAttribute("aria-expanded", String(investmentIncludePopupOpen));
    const summaryValue = summaryButton.querySelector("strong");
    const summaryCount = summaryButton.querySelector("small");
    if (summaryValue) summaryValue.textContent = summaryText;
    if (summaryCount) summaryCount.textContent = countText;
  }

  const popup = document.querySelector<HTMLDivElement>("#investmentIncludePopup");
  if (!popup || popup.hidden) return;
  const popupValue = popup.querySelector(".chart-popup-head strong");
  const popupCount = popup.querySelector(".investment-include-actions span");
  if (popupValue) popupValue.textContent = summaryText;
  if (popupCount) popupCount.textContent = countText;

  const blockedRealEstateIds = realEstateSelectedSourceIds();
  const blockedCashIds = combinedCashSelectedPositionIds();
  for (const input of popup.querySelectorAll<HTMLInputElement>("[data-include-position]")) {
    const id = input.dataset.includePosition ?? "";
    const blocked = blockedRealEstateIds.has(id) || blockedCashIds.has(id);
    input.checked = settings.includedIds.includes(id);
    input.disabled = blocked;
    input.closest(".include-item")?.classList.toggle("blocked", blocked);
  }
}

function investmentIncludeSummaryButton(
  totalCount: number,
  selection: { selectedCount: number; yearlyAmount: number }
): string {
  const active = selection.selectedCount > 0;
  return `
    <button
      class="investment-include-summary-button ${active ? "active" : ""}"
      type="button"
      data-action="toggle-investment-include-popup"
      aria-expanded="${investmentIncludePopupOpen}"
      aria-controls="investmentIncludePopup"
    >
      <span>Sparraten auswaehlen</span>
      <strong>${intNumber(selection.selectedCount)} aktiv · ${money(selection.yearlyAmount)} jaehrlich</strong>
      <small>${intNumber(totalCount)} verfuegbar</small>
    </button>
  `;
}

function renderInvestmentIncludePopup(positions: ReservePosition[], settings: InvestmentSettings): void {
  const popup = document.querySelector<HTMLDivElement>("#investmentIncludePopup");
  if (!popup) return;
  if (!investmentIncludePopupOpen) {
    popup.hidden = true;
    popup.innerHTML = "";
    return;
  }

  const selection = investmentSavingsSelectionSummary(positions, settings.includedIds, state.settings.year);
  popup.innerHTML = `
    <div class="investment-include-dialog">
      <div class="chart-popup-head">
        <div>
          <span>Investierbare Positionen</span>
          <strong>${intNumber(selection.selectedCount)} aktiv · ${money(selection.yearlyAmount)} jaehrlich</strong>
        </div>
        <button class="chart-popup-close" type="button" data-action="close-investment-include-popup" aria-label="Popup schliessen">x</button>
      </div>
      <div class="include-list investment-include-position-list">${investmentIncludePositionRows(positions, settings)}</div>
      <div class="investment-include-actions">
        <span>${intNumber(positions.length)} verfuegbar</span>
        <button class="button" type="button" data-action="close-investment-include-popup">Fertig</button>
      </div>
    </div>
  `;
  popup.hidden = false;
}

function investmentIncludePositionRows(positions: ReservePosition[], settings: InvestmentSettings): string {
  const blockedRealEstateIds = realEstateSelectedSourceIds();
  const blockedCashIds = combinedCashSelectedPositionIds();
  return positions
    .map((position) => {
      const checked = settings.includedIds.includes(position.id) ? "checked" : "";
      const blockedByRealEstate = blockedRealEstateIds.has(position.id);
      const blockedByCash = blockedCashIds.has(position.id);
      const disabled = blockedByRealEstate || blockedByCash ? "disabled" : "";
      const blockedClass = blockedByRealEstate || blockedByCash ? "blocked" : "";
      const subtitle = blockedByRealEstate
        ? "belegt in Immobilienfinanzierung"
        : blockedByCash
          ? "belegt im Cash-Modul"
          : investmentPositionSubtitle(position);
      return `
        <label class="include-item ${blockedClass}">
          <input type="checkbox" data-include-position="${position.id}" ${checked} ${disabled} />
          <span class="include-icon">${positionIconSvg(normalizePositionIcon(position.icon))}</span>
          <span>
            <span class="include-name">${escapeHtml(position.name)}</span>
            <span class="include-amount">${escapeHtml(subtitle)}</span>
          </span>
        </label>
      `;
    })
    .join("");
}

function investmentPositionSubtitle(position: ReservePosition): string {
  const amount = investmentPositionAmountText(position);
  return `${amount} | ${labelForType(position.type)} | Abgang ${labelForPayout(position.payoutType, positionFlow(position))}`;
}

function investmentPositionAmountText(position: ReservePosition): string {
  if (position.payoutType === "once") {
    return `${money(position.amount)} einmalig (${monthName(position.payoutMonth)} ${intNumber(position.payoutYear)})`;
  }
  if (position.type === "savings" && position.payoutType === "none") {
    return `${money(position.amount)} ohne Rhythmus (${monthName(position.startMonth)} bis ${monthName(
      position.endMonth
    )} ${intNumber(position.payoutYear)})`;
  }
  const startText =
    position.type === "savings" ? ` ab ${monthName(position.startMonth)} ${intNumber(position.payoutYear)}` : "";
  if (position.payoutType === "yearly") {
    return `${money(position.amount)} jaehrlich (${monthName(position.payoutMonth)})${startText}`;
  }
  return `${money(position.amount)} monatlich${startText}`;
}

function renderRealEstateSourceLists(): void {
  renderRealEstateSourceList("equityCapital", "#realEstateEquityCapitalSourceList");
  renderRealEstateSourceList("monthlyPayment", "#realEstateMonthlyPaymentSourceList");
  renderRealEstateSourceList("specialRepayment", "#realEstateSpecialRepaymentSourceList");

  const withdrawalProfiles = realEstateWithdrawalProfiles();
  const monthlyWithdrawalGain = withdrawalProfiles.reduce((sum, profile) => sum + profile.withdrawalGainMonthly, 0);
  const savingsRateProfiles = withdrawalProfiles.filter((profile) => profile.depotSavingsRateAvailable);
  const monthlyDepotSavingsRate = savingsRateProfiles.reduce((sum, profile) => sum + profile.depotSavingsRateMonthly, 0);
  const withdrawalAccountLabel = withdrawalProfiles.length
    ? ` aus ${intNumber(withdrawalProfiles.length)} Konto${withdrawalProfiles.length === 1 ? "" : "en"}`
    : "";

  const toggle = document.querySelector<HTMLButtonElement>("[data-action='toggle-real-estate-withdrawal-gain-source']");
  if (toggle) {
    toggle.classList.toggle("active", state.realEstate.includeWithdrawalGainAsPaymentSource);
    toggle.setAttribute("aria-pressed", String(state.realEstate.includeWithdrawalGainAsPaymentSource));
  }
  setText(
    "realEstateWithdrawalGainSourceAmount",
    `${money(monthlyWithdrawalGain)} monatlich${withdrawalAccountLabel}`
  );

  const savingsRateToggle = document.querySelector<HTMLButtonElement>(
    "[data-action='toggle-real-estate-depot-savings-rate-source']"
  );
  const savingsRateAvailable = savingsRateProfiles.length > 0 && monthlyDepotSavingsRate > 0;
  const savingsRateActive = state.realEstate.repaymentSources.useDepotSavingsRateAsRepayment && savingsRateAvailable;
  if (savingsRateToggle) {
    savingsRateToggle.classList.toggle("active", savingsRateActive);
    savingsRateToggle.classList.toggle("blocked", !savingsRateAvailable);
    savingsRateToggle.disabled = !savingsRateAvailable;
    savingsRateToggle.setAttribute("aria-pressed", String(savingsRateActive));
  }
  setText(
    "realEstateDepotSavingsRateSourceAmount",
    savingsRateAvailable
      ? `${money(monthlyDepotSavingsRate)} monatlich aus ${intNumber(savingsRateProfiles.length)} Konto${
          savingsRateProfiles.length === 1 ? "" : "en"
        }`
      : "nicht verfuegbar"
  );
}

function renderRealEstateSourceList(kind: RealEstatePaymentSourceKind, selector: string): void {
  const host = document.querySelector<HTMLDivElement>(selector);
  if (!host) return;

  const savingsPositions = selectedRealEstateSourceAccounts().flatMap((account) =>
    account.yearlyRows
      .filter((position) => {
        return (
          position.active &&
          position.type === "savings" &&
          positionFlow(position) === "expense" &&
          (kind === "equityCapital"
            ? position.payoutType === "once"
            : kind === "specialRepayment" || position.payoutType !== "once")
        );
      })
      .map((position) => ({ accountName: account.name, position }))
  );

  if (!savingsPositions.length) {
    host.innerHTML = `
      <div class="include-empty">Keine passende Sparposition angelegt.</div>
      <button class="button secondary" type="button" data-action="add-real-estate-savings-source-${kind}">
        Sparposition anlegen
      </button>
    `;
    return;
  }

  const selectedIds = new Set(realEstateSourceIds(kind));
  const financingStartYear = currentRealEstateFinancingStartYear();
  const blockedCashIds = combinedCashSelectedPositionIds();
  const blockedByOtherRealEstate = otherRealEstateSourceKinds(kind).reduce((blockedIds, otherKind) => {
    for (const id of realEstateSourceIds(otherKind)) blockedIds.add(id);
    return blockedIds;
  }, new Set<string>());

  host.innerHTML = savingsPositions
    .map(({ accountName, position }) => {
      const blockedDepot = blockedInvestmentDepotForPosition(position.id);
      const blockedByRealEstate = blockedByOtherRealEstate.has(position.id);
      const blockedByCash = blockedCashIds.has(position.id);
      const blockedByTiming = kind === "equityCapital" && position.payoutYear > financingStartYear;
      const blocked = Boolean(blockedDepot) || blockedByRealEstate || blockedByCash || blockedByTiming;
      const checked = selectedIds.has(position.id) ? "checked" : "";
      const disabled = blocked ? "disabled" : "";
      const blockedText = blockedDepot
        ? `belegt im ${depotLabel(blockedDepot)}`
        : blockedByRealEstate
          ? "bereits in anderer Immobilienquelle"
          : blockedByCash
            ? "belegt im Cash-Modul"
            : blockedByTiming
              ? `erst nach Finanzierungsstart ${financingStartYear} verfuegbar`
              : `${realEstatePositionSubtitle(position)} | Konto ${accountName}`;
      return `
        <label class="include-item ${blocked ? "blocked" : ""}">
          <input
            type="checkbox"
            data-real-estate-source-kind="${kind}"
            data-real-estate-source-position="${position.id}"
            ${checked}
            ${disabled}
          />
          <span class="include-icon">${positionIconSvg(normalizePositionIcon(position.icon))}</span>
          <span>
            <span class="include-name">${escapeHtml(position.name)} <span class="muted">(${escapeHtml(accountName)})</span></span>
            <span class="include-amount">${escapeHtml(blockedText)}</span>
          </span>
        </label>
      `;
    })
    .join("");
}

function realEstatePositionSubtitle(position: ReservePosition): string {
  return `${investmentPositionAmountText(position)} | ${labelForType(position.type)}`;
}

function realEstateSourceIds(kind: RealEstatePaymentSourceKind): string[] {
  if (kind === "equityCapital") return state.realEstate.equityCapitalSourceIds;
  if (kind === "monthlyPayment") return state.realEstate.monthlyPaymentSourceIds;
  return state.realEstate.specialRepaymentSourceIds;
}

function realEstateSelectedSourceIds(): Set<string> {
  return new Set([
    ...state.realEstate.equityCapitalSourceIds,
    ...state.realEstate.monthlyPaymentSourceIds,
    ...state.realEstate.specialRepaymentSourceIds
  ]);
}

function otherRealEstateSourceKinds(kind: RealEstatePaymentSourceKind): RealEstatePaymentSourceKind[] {
  return (["equityCapital", "monthlyPayment", "specialRepayment"] as RealEstatePaymentSourceKind[]).filter(
    (item) => item !== kind
  );
}

function realEstateSourceField(kind: RealEstatePaymentSourceKind): keyof RealEstateFinancingSettings {
  if (kind === "equityCapital") return "equityCapitalSourceIds";
  if (kind === "monthlyPayment") return "monthlyPaymentSourceIds";
  return "specialRepaymentSourceIds";
}

function blockedInvestmentDepotForPosition(positionId: string): InvestmentDepotKey | null {
  for (const settings of investmentSettingsForBlocking()) {
    const depot = INVESTMENT_DEPOTS.find((item) =>
      depotInvestmentSettingsForBase(item, settings).includedIds.includes(positionId)
    );
    if (depot) return depot;
  }
  return null;
}

function investmentSelectedPositionIds(): Set<string> {
  const ids = new Set<string>();
  for (const settings of investmentSettingsForBlocking()) {
    for (const depot of INVESTMENT_DEPOTS) {
      for (const id of depotInvestmentSettingsForBase(depot, settings).includedIds) ids.add(id);
    }
  }
  return ids;
}

function investmentSettingsForBlocking(): InvestmentSettings[] {
  const settings = [state.investment, ...Object.values(state.investmentByAccountId)];
  return Array.from(new Set(settings));
}

function expenseDateCells(position: ReservePosition): string {
  if (position.type === "savings") return savingsDateCells(position);
  if (position.type === "fixed") return monthRangeDateCells(position);
  if (positionTableHidesExpenseMonthRange()) return "";

  if (position.payoutType === "once") {
    return `
      <td>
        <input class="small-input payout-year-input" type="number" min="2000" max="2200" step="1" value="${
          position.payoutYear
        }" data-position-id="${position.id}" data-position-field="payoutYear" />
      </td>
    `;
  }
  return monthRangeDateCells(position);
}

function monthRangeDateCells(position: ReservePosition): string {
  return `
    <td>${monthSelect(position.id, "startMonth", position.startMonth)}</td>
    <td>${monthSelect(position.id, "endMonth", position.endMonth)}</td>
  `;
}

function savingsDateCells(position: ReservePosition): string {
  if (position.payoutType === "none") {
    return `
      <td>
        <input class="small-input payout-year-input" type="number" min="2000" max="2200" step="1" value="${
          position.payoutYear
        }" data-position-id="${position.id}" data-position-field="payoutYear" />
      </td>
      <td>${monthSelect(position.id, "startMonth", position.startMonth)}</td>
      <td>${monthSelect(position.id, "endMonth", position.endMonth)}</td>
    `;
  }

  return `
    <td>
      <div class="date-detail-cell">
        <input class="small-input payout-year-input" type="number" min="2000" max="2200" step="1" value="${
          position.payoutYear
        }" data-position-id="${position.id}" data-position-field="payoutYear" />
      </div>
    </td>
    <td>
      <div class="date-detail-cell">
        ${monthSelect(position.id, "startMonth", position.startMonth)}
      </div>
    </td>
  `;
}

function incomeDateCells(position: ReservePosition): string {
  if (positionTableHidesIncomeMonthRange()) {
    return `
      <td>
        <input class="small-input payout-year-input" type="number" min="2000" max="2200" step="1" value="${
          position.payoutYear
        }" data-position-id="${position.id}" data-position-field="payoutYear" />
      </td>
    `;
  }

  const disabled = position.payoutType === "once";
  return `
    <td>${monthSelect(position.id, "startMonth", position.startMonth, disabled)}</td>
    <td>${monthSelect(position.id, "endMonth", position.endMonth, disabled)}</td>
    <td>
      <input class="small-input payout-year-input" type="number" min="2000" max="2200" step="1" value="${
        position.payoutYear
      }" data-position-id="${position.id}" data-position-field="payoutYear" />
    </td>
  `;
}

function syncAllInputsFromState(): void {
  syncPlanningInputsFromState();
  syncRealEstateInputsFromState();
  syncCombinedToggleInputsFromState();
  syncInvestmentInputsFromState();
  syncThemeControls();
}

function syncPlanningInputsFromState(): void {
  for (const key of Object.keys(state.settings) as Array<keyof PlanningSettings>) {
    setInputValue(`[data-setting="${key}"]`, state.settings[key]);
  }
}

function syncInvestmentInputsFromState(): void {
  syncInvestmentInputBounds();
  const depot = activeInvestmentDepot();
  const settings = investmentSettingsWithGlobalEndDate(depotInvestmentSettings(depot));
  for (const key of inputInvestmentFields()) {
    setInputValue(`[data-investment="${key}"]`, settings[key]);
  }
  setInputValue("[data-retirement-age]", calculatePayoutStartAge(settings));
  syncInvestmentDepotTabs();
  syncRetirementDepotControls();
}

function syncInvestmentInputBounds(): void {
  const depot = activeInvestmentDepot();
  const settings = investmentSettingsWithGlobalEndDate(depotInvestmentSettings(depot));
  const retirementAge = calculatePayoutStartAge(settings);
  const chartStartAge = settings.chartStartAge;
  const retirementMin = RETIREMENT_DEPOT_MIN_AGE;
  const retirementMax = retirementAgeMaxForPayoutEndAge(settings.payoutEndAge);
  setInputBounds(
    '[data-investment="birthYear"]',
    depot === "child" ? childBirthYearMin() : investmentMin("birthYear"),
    depot === "child" ? state.settings.year : investmentMax("birthYear")
  );
  setInputBounds(
    '[data-investment="chartStartAge"]',
    investmentMin("chartStartAge"),
    Math.min(investmentMax("chartStartAge"), retirementAge)
  );
  setInputBounds('[data-investment="percentageWithdrawalStartAge"]', chartStartAge, retirementAge);
  setInputBounds("[data-retirement-age]", retirementMin, retirementMax);
  setInputBounds(
    '[data-investment="childPayoutAge"]',
    investmentMin("childPayoutAge"),
    investmentMax("childPayoutAge")
  );
}

function syncRetirementDepotControls(): void {
  const depot = activeInvestmentDepot();
  const isStandard = depot === "standard";
  const isRetirement = depot === "retirement";
  const isChild = depot === "child";
  syncDepotScopedInvestmentFields(depot);
  setSectionHidden("#retirementDepotFunding", !isRetirement);
  setDetailLineHidden("detailAllowance", !isRetirement);
  setDetailLineHidden("detailAllowanceBasis", !isRetirement);
  setDetailLineHidden("detailPercentageWithdrawalStartAge", !isStandard);
  setDetailLineHidden("detailPercentageWithdrawalRate", !isStandard);
  setDetailLineHidden("detailPercentageWithdrawalMonthly", !isStandard);
  setDetailLineHidden("detailPercentageWithdrawalAnnual", !isStandard);
  setDetailLineHidden("detailMonthlyPension", isChild);
  setDetailLineHidden("detailRealMonthlyPension", isChild);
  setDetailLineHidden("detailBequestReserve", isChild);
  setSectionHidden("#combinedInvestmentCard", isChild);
  setSectionHidden("#monthlyPensionMetricCard", isChild);
}

function syncInvestmentDepotTabs(): void {
  const active = activeInvestmentDepot();
  for (const depot of INVESTMENT_DEPOTS) {
    const button = document.querySelector<HTMLButtonElement>(`[data-action="set-investment-depot-${depot}"]`);
    if (!button) continue;
    button.classList.toggle("active", depot === active);
    button.setAttribute("aria-pressed", String(depot === active));
  }
  setText(
    "investmentActiveDepotTitle",
    active === "child"
      ? "Anlageentwicklung Kinderdepot"
      : active === "retirement"
        ? "Anlageentwicklung Altersvorsorgedepot"
        : "Anlageentwicklung Depot"
  );
}

function syncRealEstateInputsFromState(): void {
  if (state.realEstate.locale !== "de") {
    state.realEstate = { ...state.realEstate, locale: "de" };
  }
  const realEstate = state.realEstate;
  syncRealEstateLocaleLabels("de");

  for (const [field, value] of Object.entries(realEstate)) {
    const selector = `[data-real-estate-field="${field}"]`;
    if (field === "specialRepaymentRhythm") {
      const control = document.querySelector<HTMLSelectElement>(selector);
      if (control) control.value = String(value);
      continue;
    }
    if (field === "purchaseActivated") {
      const control = document.querySelector<HTMLInputElement>(selector);
      if (control) control.checked = Boolean(value);
      continue;
    }
    if (
      field === "locale" ||
      field === "repaymentSources" ||
      field === "equityCapitalSourceIds" ||
      field === "monthlyPaymentSourceIds" ||
      field === "specialRepaymentSourceIds" ||
      field === "includeWithdrawalGainAsPaymentSource"
    ) {
      continue;
    }
    if (value === null) {
      const control = document.querySelector<HTMLInputElement>(selector);
      if (control) control.value = "";
      continue;
    }
    setInputValue(selector, value as number | string);
  }

  const ranges: Array<RealEstateField> = ["interestRatePercent", "propertyValueGrowthPercent"];
  for (const field of ranges) {
    setInputValue(`[data-real-estate-range="${field}"]`, state.realEstate[field] as number);
  }

  setText("realEstateInterestRatePercentValue", percent(realEstate.interestRatePercent));
  setText("realEstatePropertyValueGrowthPercentValue", percent(realEstate.propertyValueGrowthPercent));
}

function syncRealEstateLocaleLabels(locale: RealEstateFinancingSettings["locale"]): void {
  for (const label of document.querySelectorAll<HTMLElement>("[data-real-estate-label-key]")) {
    const de = label.dataset.labelDe ?? label.textContent ?? "";
    const en = label.dataset.labelEn ?? de;
    label.textContent = locale === "en" ? en : de;
  }
}

function syncCombinedToggleInputsFromState(): void {
  for (const [key, value] of Object.entries(state.combinedWealth)) {
    if (typeof value !== "boolean") continue;
    const control = document.querySelector<HTMLElement>(`[data-combined-toggle="${key}"]`);
    const card = document.querySelector<HTMLElement>(`[data-combined-module-card="${key}"]`);
    const purchaseMissing = key === "includeRealEstateFinancing" && value && !state.realEstate.purchaseActivated;
    const effectiveValue = purchaseMissing ? false : value;
    card?.classList.toggle("active", effectiveValue);
    if (!control) continue;
    if (control instanceof HTMLInputElement) {
      control.checked = effectiveValue;
      continue;
    }
    control.classList.toggle("active", effectiveValue);
    control.classList.toggle("blocked", purchaseMissing);
    control.setAttribute("aria-pressed", String(effectiveValue));
    const status = control.querySelector<HTMLElement>("[data-combined-toggle-status]");
    if (status) status.textContent = purchaseMissing ? "Kauf aus" : value ? "Aktiv" : "Aus";
  }
}

function updateRealEstateField(field: RealEstateField, value: string): void {
  if (
    field === "locale" ||
    field === "repaymentSources" ||
    field === "equityCapitalSourceIds" ||
    field === "monthlyPaymentSourceIds" ||
    field === "specialRepaymentSourceIds" ||
    field === "includeWithdrawalGainAsPaymentSource"
  ) {
    return;
  }
  if (field === "purchaseActivated") {
    state.realEstate = {
      ...state.realEstate,
      purchaseActivated: value === "true"
    };
    resetRealEstateDetailSelection();
    return;
  }
  if (field === "specialRepaymentRhythm") {
    if (value === "none" || value === "monthly" || value === "yearly") {
      state.realEstate = {
        ...state.realEstate,
        specialRepaymentRhythm: value as RealEstateFinancingSettings["specialRepaymentRhythm"]
      };
    }
    return;
  }

  const nullableFields = new Set<RealEstateField>([
    "plannedSaleYear",
    "estimatedSaleValue",
    "targetFullRepaymentYear",
    "manualFuturePropertyValue"
  ]);
  const parsed = numberValue(value);
  const nextRealEstate = {
    ...state.realEstate,
    [field]: nullableFields.has(field) && value.trim() === "" ? null : Math.max(0, parsed)
  } as RealEstateFinancingSettings;
  state.realEstate = nextRealEstate;
  resetRealEstateDetailSelection();
}

function updateCombinedToggle(key: CombinedToggleKey, checked: boolean): void {
  if (key === "includeRealEstateFinancing" && checked && !state.realEstate.purchaseActivated) {
    state.realEstate = {
      ...state.realEstate,
      purchaseActivated: true
    };
  }
  state.combinedWealth = {
    ...state.combinedWealth,
    [key]: checked
  } as AppState["combinedWealth"];
}

function updateCombinedNumber(key: CombinedNumberKey, value: string): void {
  const parsed = numberValue(value);
  state.combinedWealth = {
    ...state.combinedWealth,
    [key]: key === "statutoryPensionSavingsRatePercent" ? clamp(parsed, 0, 100) : Math.max(0, parsed)
  };
}

function updateStatutoryPensionField(field: string, value: string): void {
  if (
    field !== "contributionRatePercent" &&
    field !== "averageAnnualIncome" &&
    field !== "currentPensionValue" &&
    field !== "projectionPensionValue" &&
    field !== "annualContributionCeilingGross"
  ) {
    return;
  }
  state.statutoryPension = {
    ...state.statutoryPension,
    [field]: Math.max(0, numberValue(value))
  };
}

function updateStatutoryPensionScenarioField(
  scenarioId: StatutoryPensionScenarioId,
  field: string,
  value: string
): void {
  if (!(scenarioId in state.statutoryPension.scenarios)) return;
  const scenario = state.statutoryPension.scenarios[scenarioId];
  const nextScenario = { ...scenario };
  if (field === "retirementAge") {
    nextScenario.retirementAge = clamp(Math.round(numberValue(value)), 67, 72);
  } else if (field === "annualPensionIncreasePercent") {
    nextScenario.annualPensionIncreasePercent = clamp(numberValue(value), 0.1, 2);
  } else if (field === "taxRatePercent") {
    nextScenario.taxRatePercent = clamp(numberValue(value), 0, STATUTORY_PENSION_DEDUCTION_PERCENT_MAX);
  } else if (field === "healthInsurancePercent") {
    nextScenario.healthInsurancePercent = clamp(numberValue(value), 0, STATUTORY_PENSION_DEDUCTION_PERCENT_MAX);
  } else if (field === "careInsurancePercent") {
    nextScenario.careInsurancePercent = clamp(numberValue(value), 0, STATUTORY_PENSION_DEDUCTION_PERCENT_MAX);
  } else if (field === "incomeMode") {
    nextScenario.incomeMode = value === "constant" ? "constant" : "income_projection";
  } else {
    return;
  }
  state.statutoryPension = {
    ...state.statutoryPension,
    scenarios: {
      ...state.statutoryPension.scenarios,
      [scenarioId]: nextScenario
    }
  };
}

function syncStatutoryPensionRangeLabel(input: HTMLInputElement | HTMLSelectElement): void {
  const scenarioId = statutoryPensionScenarioIdFromValue(input.dataset.statutoryPensionScenario);
  const field = input.dataset.statutoryPensionScenarioField;
  const scenario = scenarioId ? state.statutoryPension.scenarios[scenarioId] : null;
  const label = input.parentElement?.querySelector<HTMLElement>("strong");
  if (!scenario || !field || !label) return;
  if (field === "retirementAge") {
    label.textContent = String(scenario.retirementAge);
    return;
  }
  if (
    field === "annualPensionIncreasePercent" ||
    field === "taxRatePercent" ||
    field === "healthInsurancePercent" ||
    field === "careInsurancePercent"
  ) {
    label.textContent = percent(scenario[field]);
  }
}

function toggleCombinedModule(key: CombinedToggleKey | undefined): void {
  if (!key || typeof state.combinedWealth[key] !== "boolean") return;
  updateCombinedToggle(key, !state.combinedWealth[key]);
}

function selectCombinedCashAccount(accountId: string): void {
  const account = planningAccountById(accountId);
  if (!account) return;
  const selectableIds = new Set(combinedCashSelectablePositions(account).map((position) => position.id));
  combinedCashPopupAccountId = accountId;
  state.combinedWealth = {
    ...state.combinedWealth,
    cashAccountId: accountId,
    cashPositionIds: state.combinedWealth.cashPositionIds.filter((id) => selectableIds.has(id))
  };
}

function toggleCombinedCashPosition(id: string, checked: boolean): void {
  const account = selectedCombinedCashPlanningAccount();
  if (!account) return;
  const selectableIds = new Set(combinedCashSelectablePositions(account).map((position) => position.id));
  if (checked && !selectableIds.has(id)) return;
  const selectedIds = new Set(state.combinedWealth.cashPositionIds.filter((item) => selectableIds.has(item)));
  if (checked) selectedIds.add(id);
  else selectedIds.delete(id);
  state.combinedWealth = {
    ...state.combinedWealth,
    cashPositionIds: Array.from(selectedIds)
  };
}

function selectedCombinedDepotKeys(): CombinedWealthDepotKey[] {
  const keys = state.combinedWealth.depotKeys.filter((key): key is CombinedWealthDepotKey =>
    COMBINED_DEPOTS.some((depot) => depot.key === key)
  );
  if (keys.length) return keys;
  state.combinedWealth = { ...state.combinedWealth, depotKeys: ["standard"] };
  return ["standard"];
}

function toggleCombinedDepot(depot: CombinedWealthDepotKey | undefined): void {
  if (!depot || !COMBINED_DEPOTS.some((item) => item.key === depot)) return;
  const selected = new Set(selectedCombinedDepotKeys());
  if (selected.has(depot)) {
    if (selected.size === 1) return;
    selected.delete(depot);
  } else {
    selected.add(depot);
  }
  state.combinedWealth = {
    ...state.combinedWealth,
    depotKeys: Array.from(selected)
  };
}

function selectCombinedPensionScenario(scenarioId: StatutoryPensionScenarioId | undefined): void {
  const id = statutoryPensionScenarioIdFromValue(scenarioId);
  if (!id) return;
  const scenario = latestStatutoryPensionModel?.scenarios.find((item) => item.id === id);
  state.combinedWealth = {
    ...state.combinedWealth,
    statutoryPensionScenario: id,
    statutoryPensionMonthlyAmount: scenario?.netMonthlyPension ?? state.combinedWealth.statutoryPensionMonthlyAmount
  };
}

function toggleRealEstateSourcePosition(kind: RealEstatePaymentSourceKind, id: string, checked: boolean): void {
  if (checked && blockedInvestmentDepotForPosition(id)) return;
  if (checked && combinedCashSelectedPositionIds().has(id)) return;
  if (checked && otherRealEstateSourceKinds(kind).some((otherKind) => realEstateSourceIds(otherKind).includes(id))) return;

  const currentIds = new Set(realEstateSourceIds(kind));
  if (checked) currentIds.add(id);
  else currentIds.delete(id);

  state.realEstate = {
    ...state.realEstate,
    [realEstateSourceField(kind)]: Array.from(currentIds)
  };
  resetRealEstateDetailSelection();
}

function toggleRealEstateWithdrawalGainSource(): void {
  state.realEstate = {
    ...state.realEstate,
    includeWithdrawalGainAsPaymentSource: !state.realEstate.includeWithdrawalGainAsPaymentSource
  };
  resetRealEstateDetailSelection();
  renderAll();
}

function toggleRealEstateDepotSavingsRateSource(): void {
  state.realEstate = {
    ...state.realEstate,
    repaymentSources: {
      ...state.realEstate.repaymentSources,
      useDepotSavingsRateAsRepayment: !state.realEstate.repaymentSources.useDepotSavingsRateAsRepayment
    }
  };
  resetRealEstateDetailSelection();
  renderAll();
}

function addRealEstateSavingsSource(kind: RealEstatePaymentSourceKind): void {
  setActiveSection("planning_scenarios");
  selectedPositionMode = "savings";
  const id = addPosition();
  const activeAccountId = activePlanningAccount().id;
  const selectedIds = Array.from(new Set([...state.ui.selectedRealEstateAccountIds, activeAccountId]));
  state.ui = {
    ...state.ui,
    selectedRealEstateAccountIds: selectedIds,
    selectedRealEstateWithdrawalGainAccountIds: selectedIds
  };
  if (kind === "equityCapital") {
    const financingStartYear = currentRealEstateFinancingStartYear();
    state.positions = state.positions.map((position) =>
      position.id === id
        ? sanitizePosition(
            {
              ...position,
              name: "Eigenkapital Immobilie",
              payoutType: "once",
              payoutYear: financingStartYear,
              payoutMonth: 1,
              payoutDay: 1
            },
            state.settings.year
          )
        : position
    );
  }
  toggleRealEstateSourcePosition(kind, id, true);
  renderAll();
}

function setSelectedRealEstateYear(year: number): void {
  selectedRealEstateYear = Number.isFinite(year) && year > 0 ? year : null;
  renderAll();
}

function resetRealEstateDetailSelection(): void {
  selectedRealEstateYear = null;
}

function toggleSettingsGrunddaten(): void {
  state.ui = { ...state.ui, settingsGrunddatenExpanded: !state.ui.settingsGrunddatenExpanded };
  syncSettingsAccordionState();
  saveState(state);
}

function syncSettingsAccordionState(): void {
  const content = document.querySelector<HTMLDivElement>("#grunddatenSettingsContent");
  const button = document.querySelector<HTMLButtonElement>("[data-action='toggle-settings-grunddaten']");
  if (content) content.hidden = !state.ui.settingsGrunddatenExpanded;
  if (button) button.setAttribute("aria-expanded", String(state.ui.settingsGrunddatenExpanded));
}

function updatePlanningSetting(field: keyof PlanningSettings, value: string): void {
  if (field === "endDate") {
    state.settings = {
      ...state.settings,
      endDate: normalizePlanningEndDate(value, state.settings.year)
    };
    return;
  }

  state.settings = {
    ...state.settings,
    [field]: planningSettingNumberValue(field, value)
  };
  state.settings = {
    ...state.settings,
    endDate: normalizePlanningEndDate(state.settings.endDate, state.settings.year)
  };
}

function planningSettingNumberValue(field: NumericPlanningSetting, value: string): number {
  const numericValue = clamp(numberValue(value), settingMin(field), settingMax(field));
  return field === "year" ? Math.round(numericValue) : numericValue;
}

function normalizePlanningEndDate(value: unknown, minYear: number): string {
  const fallbackYear = clamp(Math.round(minYear), settingMin("year"), 2200);
  const parsed = planningDateParts(value);
  if (!parsed) return `${fallbackYear}-12-31`;
  if (parsed.year < fallbackYear) return `${fallbackYear}-12-31`;
  const year = clamp(parsed.year, settingMin("year"), 2200);
  return `${year}-${String(parsed.month).padStart(2, "0")}-${String(parsed.day).padStart(2, "0")}`;
}

function planningDateParts(value: unknown): { year: number; month: number; day: number } | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { year: Math.round(value), month: 12, day: 31 };
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const yearOnly = /^(\d{4})$/.exec(trimmed);
  if (yearOnly) {
    return { year: Number(yearOnly[1]), month: 12, day: 31 };
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  const maxDay = new Date(year, month, 0).getDate();
  if (day < 1 || day > maxDay) return null;
  return { year, month, day };
}

function planningEndYear(): number {
  return planningDateParts(state.settings.endDate)?.year ?? state.settings.year;
}

function planningEndAgeForBirthYear(birthYear: number): number {
  return clamp(planningEndYear() - Math.round(birthYear), 0, investmentMax("payoutEndAge"));
}

function updateInvestmentSetting(field: keyof InvestmentSettings, value: string): void {
  if (!isNumericInvestmentSetting(field)) return;
  const depot = activeInvestmentDepot();
  if (field === "payoutEndAge") {
    updateSharedPayoutEndAge(value);
    return;
  }

  updateDepotInvestmentSettings(depot, numericInvestmentPatch(field, numericInvestmentValue(field, value)));
  normalizeInvestmentBounds();
}

function updateSharedPayoutEndAge(value: string): void {
  const payoutEndAge = clamp(numberValue(value), investmentMin("payoutEndAge"), investmentMax("payoutEndAge"));
  const retirementAge = clampRetirementAge(currentSharedRetirementAge(), payoutEndAge);
  const payoutYears = payoutYearsForRetirementAge(payoutEndAge, retirementAge);
  state.investment = {
    ...state.investment,
    payoutEndAge,
    retirementPayoutEndAge: payoutEndAge,
    payoutYears,
    retirementPayoutYears: payoutYears
  };
  normalizeInvestmentBounds();
}

function currentSharedRetirementAge(): number {
  return Math.max(
    RETIREMENT_DEPOT_MIN_AGE,
    calculatePayoutStartAge(investmentSettingsWithGlobalEndDate(depotInvestmentSettings("standard"))),
    calculatePayoutStartAge(investmentSettingsWithGlobalEndDate(depotInvestmentSettings("retirement")))
  );
}

function clampRetirementAge(retirementAge: number, payoutEndAge: number): number {
  return clamp(retirementAge, RETIREMENT_DEPOT_MIN_AGE, retirementAgeMaxForPayoutEndAge(payoutEndAge));
}

function retirementAgeMaxForPayoutEndAge(payoutEndAge: number): number {
  return Math.max(RETIREMENT_DEPOT_MIN_AGE, Math.min(85, payoutEndAge - investmentMin("payoutYears")));
}

function payoutYearsForRetirementAge(payoutEndAge: number, retirementAge: number): number {
  return clamp(payoutEndAge - retirementAge, investmentMin("payoutYears"), investmentMax("payoutYears"));
}

function isNumericInvestmentSetting(field: keyof InvestmentSettings): field is NumericInvestmentSetting {
  return inputInvestmentFields().includes(field as NumericInvestmentSetting);
}

function inputInvestmentFields(): NumericInvestmentSetting[] {
  return [
    "birthYear",
    "chartStartAge",
    "childPayoutAge",
    "payoutEndAge",
    "retirementDepotChildren",
    "percentageWithdrawalStartAge",
    "percentageWithdrawalRatePercent",
    "investmentReturnPercent",
    "capitalGainsTaxPercent",
    "inflationRatePercent",
    "bequestReservePercent"
  ];
}

function numericInvestmentValue(field: NumericInvestmentSetting, value: string): number {
  const min = field === "birthYear" && activeInvestmentDepot() === "child" ? childBirthYearMin() : investmentMin(field);
  const max = field === "birthYear" && activeInvestmentDepot() === "child" ? state.settings.year : investmentMax(field);
  const nextValue = clamp(numberValue(value), min, max);
  return field === "retirementDepotChildren" || field === "childPayoutAge" ? Math.floor(nextValue) : nextValue;
}

function childBirthYearMin(): number {
  return childBirthYearMinForPayoutAge(state.investment.childPayoutAge);
}

function childBirthYearMinForPayoutAge(payoutAge: number): number {
  return Math.max(investmentMin("birthYear"), state.settings.year - clampChildPayoutAge(payoutAge));
}

function clampChildPayoutAge(value: number): number {
  return clamp(value, investmentMin("childPayoutAge"), investmentMax("childPayoutAge"));
}

function numericInvestmentPatch(field: NumericInvestmentSetting, value: number): Partial<InvestmentSettings> {
  switch (field) {
    case "birthYear":
      return { birthYear: value };
    case "chartStartAge":
      return { chartStartAge: value };
    case "childPayoutAge":
      return { childPayoutAge: value };
    case "payoutEndAge":
      return { payoutEndAge: value };
    case "retirementDepotChildren":
      return { retirementDepotChildren: value };
    case "percentageWithdrawalStartAge":
      return { percentageWithdrawalStartAge: value };
    case "percentageWithdrawalRatePercent":
      return { percentageWithdrawalRatePercent: value };
    case "investmentReturnPercent":
      return { investmentReturnPercent: value };
    case "capitalGainsTaxPercent":
      return { capitalGainsTaxPercent: value };
    case "inflationRatePercent":
      return { inflationRatePercent: value };
    case "bequestReservePercent":
      return { bequestReservePercent: value };
  }
  return {};
}

function setInvestmentDepot(depot: InvestmentDepotKey): void {
  if (state.investment.activeDepot === depot) return;
  state.investment = {
    ...state.investment,
    activeDepot: depot
  };
  hideInvestmentChartPopup();
  hideInvestmentIncludePopup();
  renderAll();
}

function toggleInvestmentIncludePopup(): void {
  investmentIncludePopupOpen = !investmentIncludePopupOpen;
  renderAll();
}

function activeInvestmentDepot(): InvestmentDepotKey {
  return INVESTMENT_DEPOTS.includes(state.investment.activeDepot) ? state.investment.activeDepot : "standard";
}

function otherInvestmentDepots(depot: InvestmentDepotKey): InvestmentDepotKey[] {
  return INVESTMENT_DEPOTS.filter((item) => item !== depot);
}

function depotLabel(depot: InvestmentDepotKey): string {
  if (depot === "child") return "Kinderdepot";
  return depot === "standard" ? "Depot" : "Altersvorsorgedepot";
}

function depotInvestmentSettings(depot: InvestmentDepotKey): InvestmentSettings {
  return depotInvestmentSettingsForBase(depot, state.investment);
}

function depotInvestmentSettingsForAccount(depot: InvestmentDepotKey, accountId: string): InvestmentSettings {
  const settings = state.investmentByAccountId[accountId] ?? defaultInvestmentSettingsForNewAccount();
  return depotInvestmentSettingsForBase(depot, settings);
}

function depotInvestmentSettingsForBase(depot: InvestmentDepotKey, settings: InvestmentSettings): InvestmentSettings {
  if (depot === "standard") {
    return {
      ...settings,
      activeDepot: "standard",
      retirementDepotEnabled: false,
      retirementDepotChildren: 0
    };
  }

  if (depot === "child") {
    const childPayoutAge = clampChildPayoutAge(settings.childPayoutAge);
    return {
      ...settings,
      activeDepot: "child",
      includedIds: settings.childIncludedIds,
      includeAccountInterest: settings.childIncludeAccountInterest,
      includeAccountCashback: settings.childIncludeAccountCashback,
      retirementDepotEnabled: false,
      retirementDepotChildren: 0,
      birthYear: settings.childBirthYear,
      chartStartAge: settings.childChartStartAge,
      childPayoutAge,
      payoutEndAge: childPayoutAge,
      payoutYears: 0,
      percentageWithdrawalStartAge: childPayoutAge,
      percentageWithdrawalRatePercent: 0,
      investmentReturnPercent: settings.childInvestmentReturnPercent,
      capitalGainsTaxPercent: settings.childCapitalGainsTaxPercent,
      inflationRatePercent: settings.childInflationRatePercent,
      bequestReservePercent: settings.childBequestReservePercent
    };
  }

  return {
    ...settings,
    activeDepot: "retirement",
    retirementDepotEnabled: true,
    includedIds: settings.retirementIncludedIds,
    includeAccountInterest: settings.retirementIncludeAccountInterest,
    includeAccountCashback: settings.retirementIncludeAccountCashback,
    birthYear: settings.retirementBirthYear,
    chartStartAge: settings.retirementChartStartAge,
    payoutEndAge: settings.retirementPayoutEndAge,
    payoutYears: settings.retirementPayoutYears,
    percentageWithdrawalStartAge: settings.retirementPayoutEndAge - settings.retirementPayoutYears,
    percentageWithdrawalRatePercent: 0,
    investmentReturnPercent: settings.retirementInvestmentReturnPercent,
    capitalGainsTaxPercent: settings.retirementCapitalGainsTaxPercent,
    inflationRatePercent: settings.retirementInflationRatePercent,
    bequestReservePercent: settings.retirementBequestReservePercent
  };
}

function updateDepotInvestmentSettings(depot: InvestmentDepotKey, updates: Partial<InvestmentSettings>): void {
  const payoutEndAge = updates.payoutEndAge ?? state.investment.payoutEndAge;
  if (depot === "standard") {
    state.investment = {
      ...state.investment,
      ...updates,
      payoutEndAge,
      retirementPayoutEndAge: payoutEndAge
    };
    return;
  }

  if (depot === "child") {
    state.investment = {
      ...state.investment,
      childBirthYear: updates.birthYear ?? state.investment.childBirthYear,
      childChartStartAge: updates.chartStartAge ?? state.investment.childChartStartAge,
      childPayoutAge: updates.childPayoutAge ?? state.investment.childPayoutAge,
      childInvestmentReturnPercent:
        updates.investmentReturnPercent ?? state.investment.childInvestmentReturnPercent,
      childCapitalGainsTaxPercent:
        updates.capitalGainsTaxPercent ?? state.investment.childCapitalGainsTaxPercent,
      childInflationRatePercent: updates.inflationRatePercent ?? state.investment.childInflationRatePercent,
      childBequestReservePercent: updates.bequestReservePercent ?? state.investment.childBequestReservePercent
    };
    return;
  }

  state.investment = {
    ...state.investment,
    payoutEndAge,
    retirementDepotChildren: updates.retirementDepotChildren ?? state.investment.retirementDepotChildren,
    retirementBirthYear: updates.birthYear ?? state.investment.retirementBirthYear,
    retirementChartStartAge: updates.chartStartAge ?? state.investment.retirementChartStartAge,
    retirementPayoutEndAge: payoutEndAge,
    retirementPayoutYears: updates.payoutYears ?? state.investment.retirementPayoutYears,
    retirementInvestmentReturnPercent:
      updates.investmentReturnPercent ?? state.investment.retirementInvestmentReturnPercent,
    retirementCapitalGainsTaxPercent:
      updates.capitalGainsTaxPercent ?? state.investment.retirementCapitalGainsTaxPercent,
    retirementInflationRatePercent: updates.inflationRatePercent ?? state.investment.retirementInflationRatePercent,
    retirementBequestReservePercent:
      updates.bequestReservePercent ?? state.investment.retirementBequestReservePercent
  };
}

function updateRetirementAge(value: string): void {
  const standardPayoutEndAge = numericInvestmentValue(
    "payoutEndAge",
    String(Math.max(investmentMin("payoutEndAge"), planningEndAgeForBirthYear(state.investment.birthYear)))
  );
  const retirementPayoutEndAge = numericInvestmentValue(
    "payoutEndAge",
    String(Math.max(investmentMin("payoutEndAge"), planningEndAgeForBirthYear(state.investment.retirementBirthYear)))
  );
  const retirementAge = clamp(
    numberValue(value),
    RETIREMENT_DEPOT_MIN_AGE,
    Math.min(
      retirementAgeMaxForPayoutEndAge(standardPayoutEndAge),
      retirementAgeMaxForPayoutEndAge(retirementPayoutEndAge)
    )
  );
  const payoutYears = payoutYearsForRetirementAge(standardPayoutEndAge, retirementAge);
  const retirementPayoutYears = payoutYearsForRetirementAge(retirementPayoutEndAge, retirementAge);
  state.investment = {
    ...state.investment,
    payoutEndAge: standardPayoutEndAge,
    retirementPayoutEndAge,
    payoutYears,
    retirementPayoutYears
  };
  normalizeInvestmentBounds();
}

function updatePosition(id: string, field: keyof ReservePosition, value: string | boolean): void {
  state.positions = state.positions.map((position) => {
    if (position.id !== id) return position;
    const next: ReservePosition = { ...position };

    switch (field) {
      case "active":
        next.active = Boolean(value);
        break;
      case "visible":
        next.visible = Boolean(value);
        break;
      case "interestBearing":
        next.interestBearing = positionFlow(next) === "expense" && next.payoutType !== "once" && Boolean(value);
        break;
      case "cashback":
        next.cashback = positionFlow(next) === "expense" && next.type === "temporary" && Boolean(value);
        break;
      case "planningYear":
        next.planningYear = sanitizePlanningYearSelection(value, state.settings.year);
        if (next.payoutType === "once") {
          const nextPlanningYear =
            next.planningYear ?? normalizePositionPlanningYear(next.payoutYear) ?? state.settings.year;
          next.planningYear = nextPlanningYear;
          next.payoutYear = nextPlanningYear;
        }
        break;
      case "amount":
      case "startMonth":
      case "endMonth":
      case "payoutYear":
      case "payoutMonth":
      case "payoutDay":
        next[field] = numberValue(String(value));
        if (field === "payoutYear" && next.payoutType === "once") {
          next.planningYear = normalizePositionPlanningYear(next.payoutYear);
        }
        break;
      case "type":
        if (isPositionType(value)) {
          next.type = value;
          next.flow = flowForType(value);
          if (next.flow === "income") {
            next.interestBearing = false;
            next.cashback = false;
            if (value === "incomeMonthly") next.payoutType = "monthly";
            if (value === "incomeYearly") next.payoutType = "yearly";
          }
          if (next.flow === "expense" && next.type !== "temporary") next.cashback = false;
        }
        break;
      case "payoutType":
        if (value === "none" || value === "monthly" || value === "yearly" || value === "once") {
          next.payoutType = value;
          if (positionFlow(next) === "income" && value === "none") next.type = "incomeTemporary";
          if (next.payoutType === "once") {
            next.payoutYear =
              normalizePositionPlanningYear(next.planningYear) ?? Number(next.payoutYear || state.settings.year);
            next.planningYear = normalizePositionPlanningYear(next.payoutYear);
            if (next.type !== "savings") {
              next.startMonth = next.payoutMonth;
              next.endMonth = next.payoutMonth;
            }
            next.interestBearing = false;
          }
        }
        break;
      case "name":
        next.name = String(value);
        break;
      case "icon":
        next.icon = normalizePositionIcon(value, defaultPositionIconForPosition(next));
        break;
      case "flow":
        if (value === "income" || value === "expense") {
          next.flow = value;
          next.type = value === "income" ? "incomeMonthly" : "temporary";
          next.icon = defaultPositionIconForPosition(next);
          next.interestBearing = false;
          next.cashback = false;
        }
        break;
      case "id":
        break;
    }

    if ((next.type !== "savings" || next.payoutType === "none") && next.startMonth > next.endMonth) {
      const startMonth = next.startMonth;
      next.startMonth = next.endMonth;
      next.endMonth = startMonth;
    }

    if (next.payoutType === "once") {
      const payoutYear = normalizePositionPlanningYear(next.payoutYear) ?? state.settings.year;
      next.payoutYear = payoutYear;
      next.planningYear = payoutYear;
      if (next.type !== "savings") {
        next.startMonth = next.payoutMonth;
        next.endMonth = next.payoutMonth;
      }
      next.interestBearing = false;
    }

    if (positionFlow(next) === "income") {
      next.interestBearing = false;
      next.cashback = false;
      if (next.payoutType === "none") next.type = "incomeTemporary";
    }

    return sanitizePosition(next, state.settings.year);
  });
}

function sanitizePosition(position: ReservePosition, fallbackYear: number): ReservePosition {
  const requestedFlow = positionFlow(position);
  const type = typeForFlow(position.type, requestedFlow);
  const flow = flowForType(type);
  const payoutType = normalizePayoutType(position.payoutType, flow, type);
  const payoutYear = finiteIntegerInRange(position.payoutYear, 2000, 2200, fallbackYear);
  const planningYear =
    payoutType === "once"
      ? normalizePositionPlanningYear(payoutYear)
      : normalizePositionPlanningYear(position.planningYear);
  const payoutMonth = finiteIntegerInRange(position.payoutMonth, 1, 12, 12);
  const costBreakdown = normalizePositionCostBreakdown(position.costBreakdown);
  const canUseCostBreakdown = positionCostBreakdownAllowed(flow, type, payoutType);
  const costBreakdownTotal = canUseCostBreakdown ? positionCostBreakdownTotal(costBreakdown) : null;
  let startMonth = finiteIntegerInRange(position.startMonth, 1, 12, 1);
  let endMonth = finiteIntegerInRange(position.endMonth, 1, 12, 12);

  if ((type !== "savings" || payoutType === "none") && startMonth > endMonth) {
    const previousStart = startMonth;
    startMonth = endMonth;
    endMonth = previousStart;
  }

  if (payoutType === "once" && type !== "savings") {
    startMonth = payoutMonth;
    endMonth = payoutMonth;
  }

  const isIncome = flow === "income";
  return {
    ...position,
    id: String(position.id || createId()),
    planningYear,
    flow,
    active: Boolean(position.active),
    visible: Boolean(position.visible),
    name: String(position.name || "Position"),
    icon: normalizePositionIcon(position.icon, defaultPositionIconForPosition({ ...position, flow, type })),
    type,
    amount: costBreakdownTotal === null ? Math.max(0, finiteNumber(position.amount, 0)) : costBreakdownTotal,
    startMonth,
    endMonth,
    payoutType,
    payoutYear,
    payoutMonth,
    payoutDay: finiteIntegerInRange(position.payoutDay, 1, 31, 31),
    interestBearing: !isIncome && payoutType !== "once" && Boolean(position.interestBearing),
    cashback: !isIncome && type === "temporary" && Boolean(position.cashback),
    costBreakdown: canUseCostBreakdown && costBreakdown.length ? costBreakdown : undefined
  };
}

function normalizePayoutType(
  value: ReservePosition["payoutType"],
  flow: ReservePosition["flow"],
  type: ReservePosition["type"]
): ReservePosition["payoutType"] {
  if (value === "monthly" || value === "yearly" || value === "once") return value;
  if (value === "none" && flow === "income" && type === "incomeTemporary") return value;
  if (value === "none" && flow === "expense") return value;
  if (flow === "income" && type === "incomeYearly") return "yearly";
  return "monthly";
}

function finiteIntegerInRange(value: unknown, min: number, max: number, fallback: number): number {
  return Math.round(clamp(finiteNumber(value, fallback), min, max));
}

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function addPosition(): string {
  const cadence = activePositionCadence();
  const type = typeForPositionTableSelection(selectedPositionMode, cadence);
  const payoutType = payoutTypeForPositionTableSelection(selectedPositionMode, cadence);
  const flow = flowForType(type);
  const isIncome = flow === "income";
  const isOnce = payoutType === "once";
  const name = newPositionName(selectedPositionMode, cadence);
  const payoutMonth = isIncome ? 1 : 12;
  const startMonth = isOnce ? payoutMonth : 1;
  const endMonth = isOnce ? payoutMonth : 12;
  const id = createId();
  const selectedPlanningYear = activePlanningYear();
  const payoutYear = selectedPlanningYear ?? state.settings.year;
  const planningYear = isOnce ? payoutYear : selectedPlanningYear;
  state.positions = [
    ...state.positions,
    {
      id,
      planningYear,
      flow,
      active: true,
      visible: true,
      name,
      icon: defaultPositionIconForPosition({ flow, type, name }),
      type,
      amount: 0,
      startMonth,
      endMonth,
      payoutType,
      payoutYear,
      payoutMonth,
      payoutDay: isIncome ? 1 : 14,
      interestBearing: false,
      cashback: false
    }
  ];
  renderAll();

  window.setTimeout(() => {
    const inputs = document.querySelectorAll<HTMLInputElement>("#positionsBody .name-input");
    const lastInput = inputs[inputs.length - 1];
    lastInput?.focus();
    lastInput?.select();
  }, 0);

  return id;
}

function removePosition(id: string): void {
  const accountId = activePlanningAccount().id;
  state.positions = state.positions.filter((position) => position.id !== id);
  const settings = state.investmentByAccountId[accountId] ?? defaultInvestmentSettingsForNewAccount();
  const nextSettings: InvestmentSettings = {
    ...settings,
    includedIds: settings.includedIds.filter((item) => item !== id),
    retirementIncludedIds: settings.retirementIncludedIds.filter((item) => item !== id),
    childIncludedIds: settings.childIncludedIds.filter((item) => item !== id)
  };
  state.investmentByAccountId = {
    ...state.investmentByAccountId,
    [accountId]: nextSettings
  };
  if (state.ui.selectedInvestmentAccountId === accountId) {
    state.investment = nextSettings;
  }
  state.realEstate = {
    ...state.realEstate,
    equityCapitalSourceIds: state.realEstate.equityCapitalSourceIds.filter((item) => item !== id),
    monthlyPaymentSourceIds: state.realEstate.monthlyPaymentSourceIds.filter((item) => item !== id),
    specialRepaymentSourceIds: state.realEstate.specialRepaymentSourceIds.filter((item) => item !== id)
  };
  state.combinedWealth = {
    ...state.combinedWealth,
    cashPositionIds: state.combinedWealth.cashPositionIds.filter((item) => item !== id)
  };
}

function toggleInvestmentPosition(id: string, checked: boolean): void {
  const depot = activeInvestmentDepot();
  if (checked && realEstateSelectedSourceIds().has(id)) {
    return;
  }
  if (checked && combinedCashSelectedPositionIds().has(id)) {
    return;
  }
  if (checked && otherInvestmentDepots(depot).some((item) => depotInvestmentSettings(item).includedIds.includes(id))) {
    return;
  }
  const includedIds = new Set(depotInvestmentSettings(depot).includedIds);
  if (checked) includedIds.add(id);
  else includedIds.delete(id);
  if (depot === "standard") {
    state.investment = { ...state.investment, includedIds: Array.from(includedIds) };
    return;
  }
  if (depot === "child") {
    state.investment = { ...state.investment, childIncludedIds: Array.from(includedIds) };
    return;
  }
  state.investment = { ...state.investment, retirementIncludedIds: Array.from(includedIds) };
}

function toggleInterestInvestment(): void {
  const depot = activeInvestmentDepot();
  if (
    !depotInvestmentSettings(depot).includeAccountInterest &&
    otherInvestmentDepots(depot).some((item) => depotInvestmentSettings(item).includeAccountInterest)
  ) {
    return;
  }
  if (depot === "standard") {
    state.investment = { ...state.investment, includeAccountInterest: !state.investment.includeAccountInterest };
  } else if (depot === "child") {
    state.investment = {
      ...state.investment,
      childIncludeAccountInterest: !state.investment.childIncludeAccountInterest
    };
  } else {
    state.investment = {
      ...state.investment,
      retirementIncludeAccountInterest: !state.investment.retirementIncludeAccountInterest
    };
  }
  renderAll();
}

function toggleCashbackInvestment(): void {
  const depot = activeInvestmentDepot();
  if (
    !depotInvestmentSettings(depot).includeAccountCashback &&
    otherInvestmentDepots(depot).some((item) => depotInvestmentSettings(item).includeAccountCashback)
  ) {
    return;
  }
  if (depot === "standard") {
    state.investment = { ...state.investment, includeAccountCashback: !state.investment.includeAccountCashback };
  } else if (depot === "child") {
    state.investment = {
      ...state.investment,
      childIncludeAccountCashback: !state.investment.childIncludeAccountCashback
    };
  } else {
    state.investment = {
      ...state.investment,
      retirementIncludeAccountCashback: !state.investment.retirementIncludeAccountCashback
    };
  }
  renderAll();
}

function toggleResultMaxNeeded(): void {
  showResultMaxNeeded = !showResultMaxNeeded;
  renderAll();
}

function setSelectedPositionMode(mode: PositionTableMode): void {
  selectedPositionMode = mode;
  renderPositions();
}

function setSelectedPlanningYear(value: string): void {
  state.ui = {
    ...state.ui,
    selectedPlanningYear: sanitizePlanningYearSelection(value, state.settings.year)
  };
  positionCostDialogId = null;
  renderAll();
}

function setSelectedPositionCadence(cadence: PositionTableCadence): void {
  const cadences = positionCadencesForTableMode(selectedPositionMode);
  if (!cadences.includes(cadence)) return;
  if (selectedPositionMode === "income") selectedIncomeCadence = cadence;
  if (selectedPositionMode === "expense") selectedExpenseCadence = cadence;
  if (selectedPositionMode === "reserve") selectedReserveCadence = cadence;
  if (selectedPositionMode === "savings") selectedSavingsCadence = cadence;
  renderPositions();
}

function positionTableSourcePositions(): ReservePosition[] {
  const cadence = activePositionCadence();
  return activePlanningPositions().filter((position) => {
    if (positionTableMode(position) !== selectedPositionMode) return false;
    return positionMatchesTableCadence(position, selectedPositionMode, cadence);
  });
}

function reorderPosition(sourceId: string, targetId: string, afterTarget: boolean): void {
  if (sourceId === targetId) return;

  const moved = state.positions.find((position) => position.id === sourceId);
  if (!moved) return;

  const withoutMoved = state.positions.filter((position) => position.id !== sourceId);
  const targetIndex = withoutMoved.findIndex((position) => position.id === targetId);
  if (targetIndex < 0) return;

  const insertIndex = afterTarget ? targetIndex + 1 : targetIndex;
  withoutMoved.splice(insertIndex, 0, moved);
  state.positions = withoutMoved;
}

function resetState(): void {
  const confirmed = window.confirm("Moechtest du wirklich alle Grunddaten, Positionen und Investment-Einstellungen zuruecksetzen?");
  if (!confirmed) return;
  state = resetStoredState();
  state.investmentByAccountId = {
    [state.ui.selectedInvestmentAccountId]: defaultInvestmentSettings()
  };
  state.investment = state.investmentByAccountId[state.ui.selectedInvestmentAccountId];
  investmentAccountContextId = state.ui.selectedInvestmentAccountId;
  selectedRealEstateYear = null;
  selectedCombinedWealthYear = null;
  applyTheme();
  syncAllInputsFromState();
  hideThemeSettings();
  hideBaseDataPopup();
  renderAll();
}

function setThemeMode(theme: ThemeMode): void {
  state = { ...state, theme };
  applyTheme();
  syncThemeControls();
  saveState(state);
  drawCurrentInvestmentChart();
}

function applyTheme(): void {
  document.documentElement.dataset.theme = state.theme;
  const metaThemeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.content = state.theme === "dark" ? "#101412" : "#f7f4ed";
  }
}

function toggleThemeSettings(): void {
  const panel = document.querySelector<HTMLDivElement>("#themeSettingsPanel");
  if (!panel) return;
  panel.hidden = !panel.hidden;
  if (!panel.hidden) {
    hideBaseDataPopup();
    syncSettingsAccordionState();
  }
  syncThemeControls();
}

function hideThemeSettings(): void {
  const panel = document.querySelector<HTMLDivElement>("#themeSettingsPanel");
  if (panel) panel.hidden = true;
  syncThemeControls();
  updateModuleVisibility();
}

function openBaseDataPopup(): void {
  const popup = document.querySelector<HTMLDivElement>("#baseDataPopup");
  if (!popup) return;
  hideThemeSettings();
  syncPlanningInputsFromState();
  popup.hidden = false;
}

function hideBaseDataPopup(): void {
  const popup = document.querySelector<HTMLDivElement>("#baseDataPopup");
  if (popup) popup.hidden = true;
}

function syncThemeControls(): void {
  const panel = document.querySelector<HTMLDivElement>("#themeSettingsPanel");
  const button = document.querySelector<HTMLButtonElement>("[data-action='toggle-theme-settings']");
  if (button) button.setAttribute("aria-expanded", String(Boolean(panel && !panel.hidden)));
  for (const option of document.querySelectorAll<HTMLButtonElement>(".theme-option[data-action]")) {
    const isActive =
      (option.dataset.action === "set-theme-light" && state.theme === "light") ||
      (option.dataset.action === "set-theme-dark" && state.theme === "dark");
    option.classList.toggle("active", isActive);
    option.setAttribute("aria-pressed", String(isActive));
  }
  syncSettingsAccordionState();
}

async function importPositionsFromFile(file: File | undefined): Promise<void> {
  if (!file) return;
  const text = await file.text();
  const imported = positionsFromCsvRows(parseCsv(text));
  if (!imported.length) {
    window.alert("Keine gueltigen Positionen gefunden.");
    return;
  }

  state.positions = imported;
  syncActivePlanningAccountFromPositions();
  const activeAccountId = activePlanningAccount().id;
  const availablePositions = activePlanningAccount().yearlyRows;
  const settings = state.investmentByAccountId[activeAccountId] ?? defaultInvestmentSettingsForNewAccount();
  const selectablePositionIds = new Set(
    availablePositions
      .filter((position) => position.active && position.type === "savings" && positionFlow(position) === "expense")
      .map((position) => position.id)
  );
  const nextSettings: InvestmentSettings = {
    ...settings,
    includedIds: settings.includedIds.filter((id) => selectablePositionIds.has(id)),
    retirementIncludedIds: settings.retirementIncludedIds.filter((id) => selectablePositionIds.has(id)),
    childIncludedIds: settings.childIncludedIds.filter((id) => selectablePositionIds.has(id))
  };
  state.investmentByAccountId = {
    ...state.investmentByAccountId,
    [activeAccountId]: nextSettings
  };
  if (state.ui.selectedInvestmentAccountId === activeAccountId) {
    state.investment = nextSettings;
  }
  state.realEstate = {
    ...state.realEstate,
    equityCapitalSourceIds: state.realEstate.equityCapitalSourceIds.filter((id) =>
      availablePositions.some(
        (position) =>
          position.id === id && position.active && position.type === "savings" && positionFlow(position) === "expense"
      )
    ),
    monthlyPaymentSourceIds: state.realEstate.monthlyPaymentSourceIds.filter((id) =>
      availablePositions.some(
        (position) =>
          position.id === id && position.active && position.type === "savings" && positionFlow(position) === "expense"
      )
    ),
    specialRepaymentSourceIds: state.realEstate.specialRepaymentSourceIds.filter((id) =>
      availablePositions.some(
        (position) =>
          position.id === id && position.active && position.type === "savings" && positionFlow(position) === "expense"
      )
    )
  };
  renderAll();
}

async function exportCsvFile(
  filename: string,
  text: string,
  label: string,
  showStatus: (message: string) => void = showExportStatus
): Promise<void> {
  const contents = csvFileContents(text);
  const nativeResult = await saveCsvWithNativeDialog(filename, contents, showStatus);

  if (nativeResult === "saved") {
    showStatus(`${label} wurde gespeichert.`);
    return;
  }

  if (nativeResult === "cancelled") {
    showStatus(`${label} wurde abgebrochen.`);
    return;
  }

  downloadText(filename, contents);
  showStatus(
    nativeResult === "failed" ? `${label} wurde als Download gestartet.` : `${label} wurde gestartet.`
  );
}

async function saveCsvWithNativeDialog(
  filename: string,
  contents: string,
  showStatus: (message: string) => void
): Promise<"saved" | "cancelled" | "unavailable" | "failed"> {
  if (!isTauriRuntime()) return "unavailable";

  showStatus("Speichern-Dialog wird geoeffnet...");
  try {
    const [{ save }, { invoke }] = await Promise.all([import("@tauri-apps/plugin-dialog"), import("@tauri-apps/api/core")]);
    const selectedPath = await save({
      title: "CSV exportieren",
      defaultPath: filename,
      filters: [{ name: "CSV", extensions: ["csv"] }]
    });

    if (!selectedPath) return "cancelled";
    await invoke("write_csv_file", { path: ensureCsvExtension(selectedPath), contents });
    return "saved";
  } catch (error) {
    console.error("Native CSV export failed; falling back to browser download.", error);
    return "failed";
  }
}

function isTauriRuntime(): boolean {
  return Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

function csvFileContents(text: string): string {
  const content = text.endsWith("\n") ? text : `${text}\n`;
  return `\uFEFF${content}`;
}

function ensureCsvExtension(path: string): string {
  return path.toLowerCase().endsWith(".csv") ? path : `${path}.csv`;
}

function downloadText(filename: string, contents: string, type = "text/csv;charset=utf-8"): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

function showExportStatus(message: string): void {
  const status = document.querySelector<HTMLSpanElement>("#exportStatus");
  if (!status) return;
  status.textContent = message;
  if (exportStatusTimeoutId) window.clearTimeout(exportStatusTimeoutId);
  exportStatusTimeoutId = window.setTimeout(() => {
    status.textContent = "";
    exportStatusTimeoutId = undefined;
  }, 3500);
}

function formControl(target: EventTarget | null): HTMLInputElement | HTMLSelectElement | null {
  if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) return target;
  return null;
}

function isDeferredModelInput(target: HTMLInputElement | HTMLSelectElement): boolean {
  return target instanceof HTMLInputElement && (target.type === "number" || target.type === "date");
}

function syncCommittedPlanningSettingInput(
  target: HTMLInputElement | HTMLSelectElement,
  field: keyof PlanningSettings
): void {
  if (!isDeferredModelInput(target)) return;
  target.value = String(state.settings[field]);
}

function syncCommittedInvestmentSettingInput(
  target: HTMLInputElement | HTMLSelectElement,
  field: keyof InvestmentSettings
): void {
  if (!isDeferredModelInput(target) || !isNumericInvestmentSetting(field)) return;
  const settings = investmentSettingsWithGlobalEndDate(depotInvestmentSettings(activeInvestmentDepot()));
  target.value = String(settings[field]);
}

function syncCommittedRetirementAgeInput(target: HTMLInputElement | HTMLSelectElement): void {
  if (!isDeferredModelInput(target)) return;
  const settings = investmentSettingsWithGlobalEndDate(depotInvestmentSettings(activeInvestmentDepot()));
  target.value = String(calculatePayoutStartAge(settings));
}

function setText(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function setRangeLabel(key: keyof InvestmentSettings, value: string): void {
  setText(`${key}Value`, value);
}

function setInputValue(selector: string, value: number | string | string[]): void {
  for (const input of document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(selector)) {
    if (input === document.activeElement && isDeferredModelInput(input)) continue;
    input.value = String(value);
  }
}

function setInputBounds(selector: string, min: number, max: number): void {
  const input = document.querySelector<HTMLInputElement>(selector);
  if (!input) return;
  input.min = String(min);
  input.max = String(max);
}

function syncDepotScopedInvestmentFields(activeDepot: InvestmentDepotKey): void {
  for (const wrapper of document.querySelectorAll<HTMLElement>("[data-depot-scope]")) {
    const scopes = (wrapper.dataset.depotScope ?? "").split(/\s+/).filter(Boolean);
    const hidden = !scopes.includes(activeDepot);
    wrapper.hidden = hidden;
    for (const control of wrapper.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLButtonElement | HTMLTextAreaElement
    >("input, select, button, textarea")) {
      control.disabled = hidden || control.dataset.forceDisabled === "true";
    }
  }
}

function setSectionHidden(selector: string, hidden: boolean): void {
  const element = document.querySelector<HTMLElement>(selector);
  if (element) element.hidden = hidden;
}

function setDetailLineHidden(id: string, hidden: boolean): void {
  const wrapper = document.getElementById(id)?.closest<HTMLElement>(".detail-line");
  if (wrapper) wrapper.hidden = hidden;
}

function drawCurrentInvestmentChart(): void {
  const investmentAccount = selectedInvestmentPlanningAccount();
  const projection = buildDepotAssetProjection(activeInvestmentDepot(), investmentAccount.id);
  const combinedProjection = combineAssetProjections(
    buildDepotAssetProjection("standard", investmentAccount.id),
    buildDepotAssetProjection("retirement", investmentAccount.id)
  );
  hideInvestmentChartPopup();
  drawInvestmentChartWithPopup(projection);
  drawInvestmentChartWithPopup(combinedProjection, "#combinedInvestmentChart", "#combinedInvestmentChartPopup");
}

function contributionDetailText(projection: AssetProjection): string {
  const recurringContribution = projection.recurringContributionAtRetirement;
  const oneTimeContribution = projection.oneTimeContributionAtRetirement;
  if (oneTimeContribution > 0.01) {
    return `${money(projection.totalContribution)} (${money(recurringContribution)} regelmaessig + ${money(
      oneTimeContribution
    )} einmalig)`;
  }
  return `${money(projection.totalContribution)} (${money(recurringContribution)} regelmaessig)`;
}

function drawInvestmentChartWithPopup(
  projection: AssetProjection,
  canvasSelector = "#investmentChart",
  popupSelector = "#investmentChartPopup"
): void {
  drawInvestmentChart(document.querySelector<HTMLCanvasElement>(canvasSelector), projection, (selection) => {
    showInvestmentChartPopup(projection, selection.point, selection.clientX, selection.clientY, popupSelector);
  });
}

function showInvestmentChartPopup(
  projection: AssetProjection,
  point: AssetProjectionPoint,
  clientX: number,
  clientY: number,
  popupSelector = "#investmentChartPopup"
): void {
  const popup = document.querySelector<HTMLDivElement>(popupSelector);
  const card = popup?.closest<HTMLElement>(".investment-chart-card");
  if (!popup || !card) return;

  const allowance = Math.min(Math.max(0, point.netBalance), Math.max(0, point.allowance));
  const eigenbeitrag = Math.min(
    Math.max(0, point.netBalance - allowance),
    Math.max(0, point.costBasis - allowance)
  );
  const tax = Math.max(0, point.periodTax);
  const growth = Math.max(0, Math.max(0, point.netBalance - eigenbeitrag - allowance) - tax);
  const payoutBalance = point.phase === "payout" ? Math.max(0, point.netBalance) : 0;
  const year = state.settings.year + Math.round(point.age - projection.ageToday);

  popup.innerHTML = `
    <div class="chart-popup-head">
      <div>
        <span>Balkendetails</span>
        <strong>Alter ${intNumber(point.age)} | Jahr ${intNumber(year)}</strong>
      </div>
      <button class="chart-popup-close" type="button" data-action="close-investment-chart-popup" aria-label="Popup schliessen">x</button>
    </div>
    <div class="chart-popup-list">
      ${chartPopupLine("grey", "Eigenbeitrag", money(eigenbeitrag))}
      ${chartPopupLine("orange", "Zulagen", money(allowance))}
      ${chartPopupLine("green", "Wertzuwachs", money(growth))}
      ${chartPopupLine("purple", "Restguthaben (Auszahlung)", money(payoutBalance))}
      ${chartPopupLine("red", "Kapitalertragsteuer", tax > 0 ? `-${money(tax)}` : money(0))}
      ${chartPopupTotalLine("Gesamtkapital", money(Math.max(0, point.netBalance)))}
    </div>
  `;

  popup.hidden = false;
  positionChartPopup(popup, card, clientX, clientY);
}

function showRealEstateChartPopup(
  year: number,
  chartKind: "repayment" | "trend",
  clientX: number,
  clientY: number
): void {
  const result = latestRealEstateResult;
  const point = result?.years.find((entry) => entry.year === year);
  const popup = document.querySelector<HTMLDivElement>("#realEstateChartPopup");
  const card = popup?.closest<HTMLElement>(".real-estate-chart-card");
  if (!result || !point || !popup || !card) return;

  const initialPropertyValue = Math.max(0, result.years[0]?.propertyValue ?? 0);
  const repaymentGroup = chartPopupSection("Tilgung und Kredit", [
    ...realEstateRepaymentSegments({ point }).map((segment) =>
      chartPopupLine(segment.className, segment.label, money(segment.value))
    ),
    chartPopupLine("gross", "Darlehensbetrag inkl. Zinsen", money(result.totalLoanCost))
  ]);
  const trendGroup = chartPopupSection("Immobilienwertentwicklung", [
    ...realEstateTrendSegments(point, initialPropertyValue).map((segment) =>
      chartPopupLine(segment.className, segment.label, money(segment.value))
    ),
    chartPopupTotalLine("Immobilienwert", money(point.propertyValue))
  ]);
  const groups = chartKind === "trend" ? [trendGroup, repaymentGroup] : [repaymentGroup, trendGroup];
  const title = chartKind === "trend" ? "Immobilienwertentwicklung" : "Tilgung und Vermoegen";

  popup.innerHTML = `
    <div class="chart-popup-head">
      <div>
        <span>${title}</span>
        <strong>${realEstatePopupHeading(point.year - state.investment.birthYear, point.year, intNumber)}</strong>
      </div>
      <button class="chart-popup-close" type="button" data-action="close-investment-chart-popup" aria-label="Popup schliessen">x</button>
    </div>
    <div class="chart-popup-list">
      ${groups.join("")}
    </div>
  `;

  popup.hidden = false;
  positionChartPopup(popup, card, clientX, clientY);
}

function selectCombinedWealthYearWithPopup(year: number, clientX: number, clientY: number): void {
  selectedCombinedWealthYear = Number.isFinite(year) && year > 0 ? year : null;
  renderCombinedWealthCalculations(latestCombinedWealthYears);
  showCombinedWealthPopup(year, clientX, clientY);
}

function showCombinedWealthPopup(year: number, clientX: number, clientY: number): void {
  const point = latestCombinedWealthYears.find((entry) => entry.year === year);
  const popup = document.querySelector<HTMLDivElement>("#combinedWealthChartPopup");
  const card = popup?.closest<HTMLElement>(".combined-chart-card");
  if (!point || !popup || !card) return;

  popup.innerHTML = renderCombinedWealthPopup({
    selected: point,
    finalYear: latestCombinedWealthYears.at(-1) ?? point,
    formatMoney: (value) => money(value),
    formatInt: (value) => intNumber(value)
  });
  popup.hidden = false;
  positionChartPopup(popup, card, clientX, clientY);
}

function showStatutoryPensionYearPopup(year: number, clientX: number, clientY: number): void {
  const point = latestStatutoryPensionModel?.annualPensionYears.find((entry) => entry.year === year);
  const popup = document.querySelector<HTMLDivElement>("#statutoryPensionYearPopup");
  const card = popup?.closest<HTMLElement>(".statutory-pension-year-chart");
  if (!point || !popup || !card) return;

  popup.innerHTML = renderStatutoryPensionYearPopupHtml(point);
  popup.hidden = false;
  positionChartPopup(popup, card, clientX, clientY);
}

function showStatutoryPensionProjectionYearPopup(year: number, clientX: number, clientY: number): void {
  const point = latestStatutoryPensionModel?.projectedAnnualPensionYears.find((entry) => entry.year === year);
  const popup = document.querySelector<HTMLDivElement>("#statutoryPensionProjectionYearPopup");
  const card = popup?.closest<HTMLElement>(".statutory-pension-year-chart");
  if (!point || !popup || !card) return;

  popup.innerHTML = renderStatutoryPensionProjectionYearPopupHtml(point);
  popup.hidden = false;
  positionChartPopup(popup, card, clientX, clientY);
}

function positionChartPopup(popup: HTMLDivElement, card: HTMLElement, clientX: number, clientY: number): void {
  popup.style.left = "12px";
  popup.style.top = "12px";
  const cardRect = card.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();
  const left = clamp(clientX - cardRect.left + 14, 12, Math.max(12, cardRect.width - popupRect.width - 12));
  const top = clamp(clientY - cardRect.top + 14, 12, Math.max(12, cardRect.height - popupRect.height - 12));
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

function chartPopupLine(color: string, label: string, value: string): string {
  return `
    <div class="chart-popup-line">
      <span><i class="chart-popup-dot ${escapeHtml(color)}"></i>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function chartPopupTotalLine(label: string, value: string): string {
  return `
    <div class="chart-popup-line chart-popup-total">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function chartPopupSection(title: string, lines: string[]): string {
  return `
    <div class="chart-popup-section">
      <div class="chart-popup-section-title">${escapeHtml(title)}</div>
      ${lines.join("")}
    </div>
  `;
}

function hideInvestmentChartPopup(): void {
  for (const popup of document.querySelectorAll<HTMLDivElement>(
    "#investmentChartPopup, #combinedInvestmentChartPopup, #realEstateChartPopup"
  )) {
    popup.hidden = true;
  }
}

function hideCombinedWealthPopup(): void {
  const popup = document.querySelector<HTMLDivElement>("#combinedWealthChartPopup");
  if (popup) popup.hidden = true;
}

function hideCombinedCashPositionPopup(): void {
  combinedCashPopupAccountId = null;
  const popup = document.querySelector<HTMLDivElement>("#combinedCashPositionPopup");
  if (popup) popup.hidden = true;
}

function hideInvestmentIncludePopup(): void {
  investmentIncludePopupOpen = false;
  const popup = document.querySelector<HTMLDivElement>("#investmentIncludePopup");
  if (popup) popup.hidden = true;
  document
    .querySelector<HTMLButtonElement>("[data-action='toggle-investment-include-popup']")
    ?.setAttribute("aria-expanded", "false");
}

function hideStatutoryPensionYearPopup(): void {
  const popup = document.querySelector<HTMLDivElement>("#statutoryPensionYearPopup");
  if (popup) popup.hidden = true;
}

function hideStatutoryPensionProjectionYearPopup(): void {
  const popup = document.querySelector<HTMLDivElement>("#statutoryPensionProjectionYearPopup");
  if (popup) popup.hidden = true;
}

function openStatutoryPensionTaxPopup(value: string | undefined): void {
  const scenarioId = statutoryPensionScenarioIdFromValue(value);
  if (!scenarioId) return;
  statutoryPensionTaxPopupScenarioId = scenarioId;
  renderAll();
}

function closeStatutoryPensionTaxPopup(): void {
  hideStatutoryPensionTaxPopup();
}

function hideStatutoryPensionTaxPopup(): void {
  statutoryPensionTaxPopupScenarioId = null;
  const host = document.querySelector<HTMLDivElement>("#statutoryPensionTaxPopup");
  if (!host) return;
  host.innerHTML = "";
  host.hidden = true;
}

function statutoryPensionScenarioIdFromValue(value: string | undefined): StatutoryPensionScenarioId | null {
  if (value === "pessimistic" || value === "base" || value === "optimistic") return value;
  return null;
}

function pensionScenarioLabel(scenarioId: StatutoryPensionScenarioId): string {
  if (scenarioId === "pessimistic") return "Pessimistisch";
  if (scenarioId === "optimistic") return "Optimistisch";
  return "Basis";
}

function buildDepotAssetProjection(depot: InvestmentDepotKey, accountId = selectedInvestmentPlanningAccount().id): AssetProjection {
  const cacheKey = `${depot}:${accountId}`;
  const cachedProjection = depotAssetProjectionCache.get(cacheKey);
  if (cachedProjection) return cachedProjection;

  const account = planningAccountById(accountId) ?? selectedInvestmentPlanningAccount();
  const settings = investmentSettingsWithGlobalEndDate(depotInvestmentSettingsForAccount(depot, accountId));
  const virtualPositions = annualTransferInvestmentPositions(account.yearlyRows, settings);
  const includedIds = new Set(settings.includedIds);
  for (const position of virtualPositions) {
    includedIds.add(position.id);
  }
  const projection = buildAssetProjection(state.settings.year, [...account.yearlyRows, ...virtualPositions], {
    ...settings,
    includedIds: Array.from(includedIds)
  });
  depotAssetProjectionCache.set(cacheKey, projection);
  return projection;
}

function annualTransferInvestmentPositions(
  positions: ReservePosition[],
  settings: InvestmentSettings
): ReservePosition[] {
  const endYear = investmentProjectionEndYear(settings);
  const cacheKey = [
    "combined",
    state.settings.year,
    endYear,
    state.settings.interestRatePercent,
    state.settings.cashbackRatePercent,
    settings.includeAccountInterest ? "interest" : "no-interest",
    settings.includeAccountCashback ? "cashback" : "no-cashback"
  ].join("|");
  const positionsCache = annualInvestmentTransferPositionsCacheFor(positions);
  const cachedPositions = positionsCache.get(cacheKey);
  if (cachedPositions) return cachedPositions;

  const transferPositions: ReservePosition[] = [];
  if (settings.includeAccountInterest) {
    transferPositions.push(
      ...cachedAnnualInvestmentTransferPositions({
        baseId: INTEREST_INVESTMENT_POSITION_ID,
        name: "Zinsen aus Jahrestabelle",
        icon: "interest",
        kind: "interest",
        settings: state.settings,
        positions,
        startYear: state.settings.year,
        endYear
      })
    );
  }
  if (settings.includeAccountCashback) {
    transferPositions.push(
      ...cachedAnnualInvestmentTransferPositions({
        baseId: CASHBACK_INVESTMENT_POSITION_ID,
        name: "Cashback aus Jahrestabelle",
        icon: "cashback",
        kind: "cashback",
        settings: state.settings,
        positions,
        startYear: state.settings.year,
        endYear
      })
    );
  }
  positionsCache.set(cacheKey, transferPositions);
  return transferPositions;
}

function investmentProjectionEndYear(settings: InvestmentSettings): number {
  return Math.max(state.settings.year, Math.round(settings.birthYear + settings.payoutEndAge));
}

function currentAnnualInvestmentTransferAmount(
  positions: ReservePosition[],
  kind: AnnualInvestmentTransferKind,
  settings: InvestmentSettings
): number {
  const endYear = investmentProjectionEndYear(investmentSettingsWithGlobalEndDate(settings));
  const transfer = cachedAnnualInvestmentTransferPositions({
    baseId: kind === "interest" ? INTEREST_INVESTMENT_POSITION_ID : CASHBACK_INVESTMENT_POSITION_ID,
    name: kind === "interest" ? "Zinsen aus Jahrestabelle" : "Cashback aus Jahrestabelle",
    icon: kind,
    kind,
    settings: state.settings,
    positions,
    startYear: state.settings.year,
    endYear
  }).find((position) => position.payoutYear === state.settings.year);
  return transfer?.amount ?? 0;
}

function cachedAnnualInvestmentTransferPositions(
  options: AnnualInvestmentTransferPositionOptions
): ReservePosition[] {
  const cacheKey = [
    options.baseId,
    options.kind,
    options.settings.year,
    options.settings.interestRatePercent,
    options.settings.cashbackRatePercent,
    Math.round(options.startYear),
    Math.round(options.endYear)
  ].join("|");
  const positionsCache = annualInvestmentTransferPositionsCacheFor(options.positions);
  const cachedPositions = positionsCache.get(cacheKey);
  if (cachedPositions) return cachedPositions;

  const transferPositions = buildAnnualInvestmentTransferPositions(options);
  positionsCache.set(cacheKey, transferPositions);
  return transferPositions;
}

function annualInvestmentTransferPositionsCacheFor(
  positions: ReservePosition[]
): Map<string, ReservePosition[]> {
  let positionsCache = annualInvestmentTransferCache.get(positions);
  if (!positionsCache) {
    positionsCache = new Map();
    annualInvestmentTransferCache.set(positions, positionsCache);
  }
  return positionsCache;
}

function investmentSettingsWithGlobalEndDate(settings: InvestmentSettings): InvestmentSettings {
  if (settings.activeDepot === "child") return settings;
  const payoutEndAge = planningEndAgeForBirthYear(settings.birthYear);
  const preferredPayoutStartAge = Math.max(0, settings.payoutEndAge - settings.payoutYears);
  const payoutYears = Math.max(
    0,
    Math.min(investmentMax("payoutYears"), Math.round(payoutEndAge - preferredPayoutStartAge))
  );
  return {
    ...settings,
    payoutEndAge,
    retirementPayoutEndAge: payoutEndAge,
    payoutYears,
    retirementPayoutYears: payoutYears
  };
}

function combineAssetProjections(standard: AssetProjection, retirement: AssetProjection): AssetProjection {
  const pointsByAge = new Map<number, { standard?: AssetProjectionPoint; retirement?: AssetProjectionPoint }>();
  for (const point of standard.points) {
    pointsByAge.set(point.age, { ...(pointsByAge.get(point.age) ?? {}), standard: point });
  }
  for (const point of retirement.points) {
    pointsByAge.set(point.age, { ...(pointsByAge.get(point.age) ?? {}), retirement: point });
  }

  const ages = Array.from(pointsByAge.keys()).sort((left, right) => left - right);
  const points = ages.map((age) => {
    const pair = pointsByAge.get(age) ?? {};
    return sumProjectionPoint(age, pair.standard, pair.retirement);
  });

  return {
    ...standard,
    points,
    monthlyRate: standard.monthlyRate + retirement.monthlyRate,
    annualSavingsRate: standard.annualSavingsRate + retirement.annualSavingsRate,
    retirementDepotEnabled: retirement.retirementDepotEnabled,
    retirementDepotAnnualOwnContribution: retirement.retirementDepotAnnualOwnContribution,
    retirementDepotBaseAllowanceAnnual: retirement.retirementDepotBaseAllowanceAnnual,
    retirementDepotChildAllowanceAnnual: retirement.retirementDepotChildAllowanceAnnual,
    retirementDepotAllowanceAnnual: retirement.retirementDepotAllowanceAnnual,
    retirementDepotAllowanceRatePercent: retirement.retirementDepotAllowanceRatePercent,
    retirementDepotAnnualContributionWithAllowance: retirement.retirementDepotAnnualContributionWithAllowance,
    retirementDepotChildren: retirement.retirementDepotChildren,
    monthlyPension: standard.monthlyPension + retirement.monthlyPension,
    realMonthlyPension: standard.realMonthlyPension + retirement.realMonthlyPension,
    bequestReservePercent: Math.max(standard.bequestReservePercent, retirement.bequestReservePercent),
    bequestReserveAtEnd: standard.bequestReserveAtEnd + retirement.bequestReserveAtEnd,
    percentageWithdrawalMonthlyAtStart:
      standard.percentageWithdrawalMonthlyAtStart + retirement.percentageWithdrawalMonthlyAtStart,
    percentageWithdrawalAnnualAtStart:
      standard.percentageWithdrawalAnnualAtStart + retirement.percentageWithdrawalAnnualAtStart,
    withdrawalRemainingSavingsMonthlyAtStart:
      standard.withdrawalRemainingSavingsMonthlyAtStart + retirement.withdrawalRemainingSavingsMonthlyAtStart,
    withdrawalGainMonthlyAtStart: standard.withdrawalGainMonthlyAtStart + retirement.withdrawalGainMonthlyAtStart,
    retirementAge: Math.max(standard.retirementAge, retirement.retirementAge),
    endAge: Math.max(standard.endAge, retirement.endAge),
    ageToday: Math.min(standard.ageToday, retirement.ageToday),
    savingMonths: standard.savingMonths + retirement.savingMonths,
    totalContribution: standard.totalContribution + retirement.totalContribution,
    recurringContributionAtRetirement:
      standard.recurringContributionAtRetirement + retirement.recurringContributionAtRetirement,
    oneTimeContributionAtRetirement:
      standard.oneTimeContributionAtRetirement + retirement.oneTimeContributionAtRetirement,
    grossWealthAtRetirement: standard.grossWealthAtRetirement + retirement.grossWealthAtRetirement,
    growthAtRetirement: standard.growthAtRetirement + retirement.growthAtRetirement,
    taxAtRetirement: standard.taxAtRetirement + retirement.taxAtRetirement,
    taxAtEnd: standard.taxAtEnd + retirement.taxAtEnd,
    costBasisAtRetirement: standard.costBasisAtRetirement + retirement.costBasisAtRetirement,
    allowanceAtRetirement: standard.allowanceAtRetirement + retirement.allowanceAtRetirement,
    allowanceBasisAtRetirement: standard.allowanceBasisAtRetirement + retirement.allowanceBasisAtRetirement,
    unrealizedTaxAtRetirement: standard.unrealizedTaxAtRetirement + retirement.unrealizedTaxAtRetirement,
    netWealthAfterFullTaxAtRetirement:
      standard.netWealthAfterFullTaxAtRetirement + retirement.netWealthAfterFullTaxAtRetirement,
    inflationFactorAtRetirement: Math.max(standard.inflationFactorAtRetirement, retirement.inflationFactorAtRetirement),
    wealthAtRetirement: standard.wealthAtRetirement + retirement.wealthAtRetirement,
    realWealthAtRetirement: standard.realWealthAtRetirement + retirement.realWealthAtRetirement
  };
}

function sumProjectionPoint(
  age: number,
  standard: AssetProjectionPoint | undefined,
  retirement: AssetProjectionPoint | undefined
): AssetProjectionPoint {
  return {
    age,
    phase: standard?.phase === "payout" || retirement?.phase === "payout" ? "payout" : "saving",
    grossBalance: (standard?.grossBalance ?? 0) + (retirement?.grossBalance ?? 0),
    contribution: (standard?.contribution ?? 0) + (retirement?.contribution ?? 0),
    costBasis: (standard?.costBasis ?? 0) + (retirement?.costBasis ?? 0),
    allowance: (standard?.allowance ?? 0) + (retirement?.allowance ?? 0),
    growth: (standard?.growth ?? 0) + (retirement?.growth ?? 0),
    tax: (standard?.tax ?? 0) + (retirement?.tax ?? 0),
    periodTax: (standard?.periodTax ?? 0) + (retirement?.periodTax ?? 0),
    netBalance: (standard?.netBalance ?? 0) + (retirement?.netBalance ?? 0),
    realNetBalance: (standard?.realNetBalance ?? 0) + (retirement?.realNetBalance ?? 0),
    normalDepot: (standard?.normalDepot ?? 0) + (retirement?.normalDepot ?? 0)
  };
}

function clearDragState(): void {
  draggedPositionId = null;
  for (const row of root.querySelectorAll("tr.dragging, tr.drag-over")) {
    row.classList.remove("dragging", "drag-over");
  }
}

function normalizeInvestmentBounds(): void {
  let nextInvestment = {
    ...state.investment,
    retirementDepotChildren: numericInvestmentValue(
      "retirementDepotChildren",
      String(state.investment.retirementDepotChildren)
    )
  };
  nextInvestment.activeDepot = INVESTMENT_DEPOTS.includes(nextInvestment.activeDepot)
    ? nextInvestment.activeDepot
    : "standard";
  const standardPayoutEndAge = numericInvestmentValue(
    "payoutEndAge",
    String(Math.max(investmentMin("payoutEndAge"), planningEndAgeForBirthYear(nextInvestment.birthYear)))
  );
  const retirementPayoutEndAge = numericInvestmentValue(
    "payoutEndAge",
    String(Math.max(investmentMin("payoutEndAge"), planningEndAgeForBirthYear(nextInvestment.retirementBirthYear)))
  );
  nextInvestment = {
    ...nextInvestment,
    payoutEndAge: standardPayoutEndAge,
    retirementPayoutEndAge
  };
  const sharedRetirementAge = clampRetirementAge(
    Math.max(
      RETIREMENT_DEPOT_MIN_AGE,
      nextInvestment.payoutEndAge - nextInvestment.payoutYears,
      nextInvestment.retirementPayoutEndAge - nextInvestment.retirementPayoutYears
    ),
    Math.min(standardPayoutEndAge, retirementPayoutEndAge)
  );
  const standardPayoutYears = payoutYearsForRetirementAge(standardPayoutEndAge, sharedRetirementAge);
  const retirementPayoutYears = payoutYearsForRetirementAge(retirementPayoutEndAge, sharedRetirementAge);
  nextInvestment = {
    ...nextInvestment,
    payoutYears: standardPayoutYears,
    retirementPayoutYears
  };

  const standardRetirementAge = calculatePayoutStartAge({
    ...nextInvestment,
    retirementDepotEnabled: false,
    retirementDepotChildren: 0
  });
  const standardChartStartAge = clamp(
    nextInvestment.chartStartAge,
    investmentMin("chartStartAge"),
    Math.min(investmentMax("chartStartAge"), standardRetirementAge)
  );
  const retirementSettings = {
    ...nextInvestment,
    includedIds: nextInvestment.retirementIncludedIds,
    includeAccountInterest: nextInvestment.retirementIncludeAccountInterest,
    includeAccountCashback: nextInvestment.retirementIncludeAccountCashback,
    retirementDepotEnabled: true,
    birthYear: nextInvestment.retirementBirthYear,
    chartStartAge: nextInvestment.retirementChartStartAge,
    payoutEndAge: nextInvestment.retirementPayoutEndAge,
    payoutYears: nextInvestment.retirementPayoutYears,
    percentageWithdrawalStartAge: nextInvestment.retirementPayoutEndAge - nextInvestment.retirementPayoutYears,
    percentageWithdrawalRatePercent: 0,
    investmentReturnPercent: nextInvestment.retirementInvestmentReturnPercent,
    capitalGainsTaxPercent: nextInvestment.retirementCapitalGainsTaxPercent,
    inflationRatePercent: nextInvestment.retirementInflationRatePercent,
    bequestReservePercent: nextInvestment.retirementBequestReservePercent
  };
  const retirementAge = calculatePayoutStartAge(retirementSettings);
  const retirementChartStartAge = clamp(
    nextInvestment.retirementChartStartAge,
    investmentMin("chartStartAge"),
    Math.min(investmentMax("chartStartAge"), retirementAge)
  );
  const rawChildPayoutAge = Number.isFinite(nextInvestment.childPayoutAge)
    ? nextInvestment.childPayoutAge
    : CHILD_DEPOT_DEFAULT_PAYOUT_AGE;
  const childPayoutAge = clampChildPayoutAge(rawChildPayoutAge);
  const childBirthYear = clamp(
    nextInvestment.childBirthYear,
    childBirthYearMinForPayoutAge(childPayoutAge),
    state.settings.year
  );
  const childChartStartAge = clamp(
    nextInvestment.childChartStartAge,
    investmentMin("chartStartAge"),
    childPayoutAge
  );
  state.investment = {
    ...nextInvestment,
    payoutEndAge: standardPayoutEndAge,
    retirementPayoutEndAge,
    chartStartAge: standardChartStartAge,
    percentageWithdrawalStartAge: clamp(
      nextInvestment.percentageWithdrawalStartAge,
      standardChartStartAge,
      standardRetirementAge
    ),
    retirementChartStartAge,
    childBirthYear,
    childChartStartAge,
    childPayoutAge,
    retirementDepotChildren: numericInvestmentValue(
      "retirementDepotChildren",
      String(nextInvestment.retirementDepotChildren)
    ),
    bequestReservePercent: numericInvestmentValue(
      "bequestReservePercent",
      String(nextInvestment.bequestReservePercent)
    ),
    retirementBequestReservePercent: numericInvestmentValue(
      "bequestReservePercent",
      String(nextInvestment.retirementBequestReservePercent)
    ),
    childInvestmentReturnPercent: clamp(
      nextInvestment.childInvestmentReturnPercent,
      investmentMin("investmentReturnPercent"),
      investmentMax("investmentReturnPercent")
    ),
    childCapitalGainsTaxPercent: clamp(
      nextInvestment.childCapitalGainsTaxPercent,
      investmentMin("capitalGainsTaxPercent"),
      investmentMax("capitalGainsTaxPercent")
    ),
    childInflationRatePercent: clamp(
      nextInvestment.childInflationRatePercent,
      investmentMin("inflationRatePercent"),
      investmentMax("inflationRatePercent")
    ),
    childBequestReservePercent: clamp(
      nextInvestment.childBequestReservePercent,
      investmentMin("bequestReservePercent"),
      investmentMax("bequestReservePercent")
    )
  };
}

function normalizeInvestmentDepotSelections(): void {
  const standardIds = new Set(state.investment.includedIds);
  const retirementIds = state.investment.retirementIncludedIds.filter((id) => !standardIds.has(id));
  const adultIds = new Set([...standardIds, ...retirementIds]);
  const childIds = state.investment.childIncludedIds.filter((id) => !adultIds.has(id));
  state.investment = {
    ...state.investment,
    retirementIncludedIds: retirementIds,
    childIncludedIds: childIds,
    retirementIncludeAccountInterest:
      state.investment.includeAccountInterest ? false : state.investment.retirementIncludeAccountInterest,
    retirementIncludeAccountCashback:
      state.investment.includeAccountCashback ? false : state.investment.retirementIncludeAccountCashback,
    childIncludeAccountInterest:
      state.investment.includeAccountInterest || state.investment.retirementIncludeAccountInterest
        ? false
        : state.investment.childIncludeAccountInterest,
    childIncludeAccountCashback:
      state.investment.includeAccountCashback || state.investment.retirementIncludeAccountCashback
        ? false
        : state.investment.childIncludeAccountCashback
  };
}

function normalizeInvestmentSelectionIds(): void {
  const selectableIds = new Set(
    selectedInvestmentPlanningAccount()
      .yearlyRows.filter(
        (position) => position.active && position.type === "savings" && positionFlow(position) === "expense"
      )
      .map((position) => position.id)
  );
  state.investment = {
    ...state.investment,
    includedIds: state.investment.includedIds.filter((id) => selectableIds.has(id)),
    retirementIncludedIds: state.investment.retirementIncludedIds.filter((id) => selectableIds.has(id)),
    childIncludedIds: state.investment.childIncludedIds.filter((id) => selectableIds.has(id))
  };
}

function normalizeRealEstateSourceIds(): void {
  const selectedAccounts = selectedRealEstateSourceAccounts();
  const savingsPositions = selectedAccounts.flatMap((account) =>
    account.yearlyRows.filter(
      (position) => position.active && position.type === "savings" && positionFlow(position) === "expense"
    )
  );
  const financingStartYear = currentRealEstateFinancingStartYear();
  const equitySelectableIds = new Set(
    savingsPositions
      .filter((position) => position.payoutType === "once" && position.payoutYear <= financingStartYear)
      .map((position) => position.id)
  );
  const monthlySelectableIds = new Set(
    savingsPositions.filter((position) => position.payoutType !== "once").map((position) => position.id)
  );
  const specialSelectableIds = new Set(savingsPositions.map((position) => position.id));
  const blockedByInvestment = new Set([
    ...state.investment.includedIds,
    ...state.investment.retirementIncludedIds,
    ...state.investment.childIncludedIds
  ]);
  const equityCapitalSourceIds = state.realEstate.equityCapitalSourceIds.filter(
    (id) => equitySelectableIds.has(id) && !blockedByInvestment.has(id)
  );
  const equityIds = new Set(equityCapitalSourceIds);
  const monthlyPaymentSourceIds = state.realEstate.monthlyPaymentSourceIds.filter(
    (id) => monthlySelectableIds.has(id) && !blockedByInvestment.has(id) && !equityIds.has(id)
  );
  const monthlyIds = new Set(monthlyPaymentSourceIds);
  const specialRepaymentSourceIds = state.realEstate.specialRepaymentSourceIds.filter(
    (id) => specialSelectableIds.has(id) && !blockedByInvestment.has(id) && !equityIds.has(id) && !monthlyIds.has(id)
  );
  state.realEstate = {
    ...state.realEstate,
    equityCapitalSourceIds,
    monthlyPaymentSourceIds,
    specialRepaymentSourceIds
  };
}

function normalizeCombinedCashPositionIds(): void {
  const account = selectedCombinedCashPlanningAccount();
  if (!account) {
    state.combinedWealth = { ...state.combinedWealth, cashPositionIds: [] };
    return;
  }

  const selectableIds = new Set(combinedCashSelectablePositions(account).map((position) => position.id));
  const cashPositionIds = Array.from(new Set(state.combinedWealth.cashPositionIds)).filter((id) =>
    selectableIds.has(id)
  );
  state.combinedWealth = {
    ...state.combinedWealth,
    cashPositionIds
  };
}

function settingMin(field: keyof PlanningSettings): number {
  if (field === "year") return 2000;
  return 0;
}

function settingMax(field: keyof PlanningSettings): number {
  if (field === "year") return 2100;
  return Number.MAX_SAFE_INTEGER;
}

function investmentMin(field: keyof InvestmentSettings): number {
  if (field === "chartStartAge") return 0;
  if (field === "birthYear") return 1962;
  if (field === "childPayoutAge") return CHILD_DEPOT_MIN_PAYOUT_AGE;
  if (field === "payoutEndAge") return 70;
  if (field === "percentageWithdrawalStartAge") return 0;
  if (field === "retirementDepotChildren") return 0;
  if (field === "payoutYears") return 1;
  if (field === "inflationRatePercent") return 1;
  return 0;
}

function investmentMax(field: keyof InvestmentSettings): number {
  if (field === "chartStartAge") return 80;
  if (field === "birthYear") return 2009;
  if (field === "childPayoutAge") return CHILD_DEPOT_MAX_PAYOUT_AGE;
  if (field === "payoutEndAge") return 110;
  if (field === "percentageWithdrawalStartAge") return 110;
  if (field === "percentageWithdrawalRatePercent") return 20;
  if (field === "retirementDepotChildren") return 20;
  if (field === "payoutYears") return 50;
  if (field === "investmentReturnPercent") return 30;
  if (field === "capitalGainsTaxPercent") return 50;
  if (field === "inflationRatePercent") return 10;
  if (field === "bequestReservePercent") return 50;
  return Number.MAX_SAFE_INTEGER;
}
