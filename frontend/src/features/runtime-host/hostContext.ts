import { defaultAppState } from "../../data/defaults";
import type { AppContext, RenderScheduler } from "../../app/contracts";
import type {
  AppState,
  AssetProjection,
  CombinedWealthYear,
  PlanningAccount,
  PositionTableFilterColumn,
  PositionTableFilterOperator,
  RealEstateFinancingResult,
  StatutoryPensionScenarioId
} from "../../types";
import type { CombinedWealthLineVisibility } from "../../views/wealthCharts";
import type { PositionTableCadence, PositionTableMode } from "../../lib/positionKinds";

export interface PositionFilterDraft {
  column: PositionTableFilterColumn;
  operator: PositionTableFilterOperator;
  value: string;
}

export type AccountDialogMode = "create" | "rename";

export type AccountDialogState = {
  mode: AccountDialogMode;
  accountId: string | null;
  name: string;
  type: PlanningAccount["type"];
  error: string;
} | null;

let rootRef!: HTMLDivElement;
let appContextRef!: AppContext;
let renderSchedulerRef!: RenderScheduler;

export const runtimeHost = {
  get root(): HTMLDivElement {
    return rootRef;
  },
  set root(value: HTMLDivElement) {
    rootRef = value;
  },
  get appContext(): AppContext {
    return appContextRef;
  },
  set appContext(value: AppContext) {
    appContextRef = value;
  },
  get renderScheduler(): RenderScheduler {
    return renderSchedulerRef;
  },
  set renderScheduler(value: RenderScheduler) {
    renderSchedulerRef = value;
  },
  depotAssetProjectionCache: new Map<string, AssetProjection>(),
  state: defaultAppState(),
  draggedPositionId: null as string | null,
  exportStatusTimeoutId: undefined as number | undefined,
  selectedPositionMode: "expense" as PositionTableMode,
  selectedIncomeCadence: "monthly" as PositionTableCadence,
  selectedExpenseCadence: "monthly" as PositionTableCadence,
  selectedReserveCadence: "fixed" as PositionTableCadence,
  selectedSavingsCadence: "monthly" as PositionTableCadence,
  showResultMaxNeeded: false,
  positionCostDialogId: null as string | null,
  positionIconPicker: null as { positionId: string; top: number; left: number } | null,
  positionFilterDrafts: {
    income: { column: "name", operator: "contains", value: "" },
    expense: { column: "name", operator: "contains", value: "" },
    reserve: { column: "name", operator: "contains", value: "" },
    savings: { column: "name", operator: "contains", value: "" }
  } as Record<PositionTableMode, PositionFilterDraft>,
  positionFilterPopupOpen: false,
  selectedRealEstateYear: null as number | null,
  latestRealEstateResult: null as RealEstateFinancingResult | null,
  selectedCombinedWealthYear: null as number | null,
  latestCombinedWealthYears: [] as CombinedWealthYear[],
  combinedCashPopupAccountId: null as string | null,
  investmentIncludePopupOpen: false,
  investmentAccountContextId: null as string | null,
  renderAllRunning: false,
  combinedWealthLineVisibility: {
    pensionConsumedCumulative: true,
    taxCumulative: true,
    propertyValue: true,
    propertyDebt: true
  } as CombinedWealthLineVisibility,
  latestStatutoryPensionModel: null as import("../../domain/statutoryPension").StatutoryPensionModel | null,
  statutoryPensionTaxPopupScenarioId: null as StatutoryPensionScenarioId | null,
  accountDialog: null as AccountDialogState
};

export type RuntimeApi = Record<string, (...args: any[]) => any>;

export const runtimeApi = {} as RuntimeApi;

export function replaceRuntimeState(nextState: AppState): void {
  runtimeHost.state = nextState;
}
