import {
  defaultAppState,
  defaultCombinedWealthToggles,
  defaultIncomePlanningState,
  defaultIncomeTrackerState,
  defaultPositionTableViewState,
  defaultRealEstateFinancingSettings,
  defaultSelfEmploymentState,
  defaultStatutoryPensionSettings,
  defaultPlanningSettings
} from "../../data/defaults";
import type { AppState } from "../../types";
import { normalizeLegacyInvestmentSettings } from "./normalizeInvestment";
import {
  normalizeAppUiState,
  normalizePlanningAccounts,
  normalizePlanningEndDate,
  normalizeThemeMode,
  planningEndDateFromInvestment,
  positionsForPlanningAccount,
  normalizeInvestmentByAccountId
} from "./normalizePlanning";
import { migrateMonthlyNetIncomePosition, normalizePositions } from "./normalizePositions";
import { isRecord, numberOrDefault } from "./validators";

export function normalizeLegacyState(value: unknown): AppState {
  const fallback = defaultAppState();
  if (!isRecord(value)) return fallback;
  const investment = normalizeLegacyInvestmentSettings(value.investmentSettings);
  const year = numberOrDefault(value.year, fallback.settings.year);
  const settings = {
    ...defaultPlanningSettings(),
    year,
    monthlyNetIncome: numberOrDefault(value.monthlyNetIncome, fallback.settings.monthlyNetIncome),
    interestRatePercent: numberOrDefault(value.interestRate, fallback.settings.interestRatePercent),
    cashbackRatePercent: numberOrDefault(value.cashbackRate, fallback.settings.cashbackRatePercent),
    endDate: normalizePlanningEndDate(value.endDate, planningEndDateFromInvestment(investment, year), year),
    emergencyFund: 0
  };
  const legacyPositions = migrateMonthlyNetIncomePosition(
    settings,
    normalizePositions(value.positions, fallback.positions, settings.year)
  );
  const planningAccounts = normalizePlanningAccounts(undefined, legacyPositions, settings.year);
  const ui = normalizeAppUiState(undefined, planningAccounts);
  const positions = positionsForPlanningAccount(planningAccounts, ui.selectedPlanningAccountId, legacyPositions);
  const investmentByAccountId = normalizeInvestmentByAccountId(
    undefined,
    planningAccounts,
    investment,
    ui.selectedInvestmentAccountId
  );

  return {
    theme: normalizeThemeMode(value.theme, fallback.theme),
    settings: { ...settings, monthlyNetIncome: 0 },
    planningAccounts,
    ui,
    realEstate: defaultRealEstateFinancingSettings(),
    combinedWealth: defaultCombinedWealthToggles(),
    statutoryPension: defaultStatutoryPensionSettings(),
    incomeTracker: defaultIncomeTrackerState(),
    incomePlanning: defaultIncomePlanningState(),
    selfEmployment: defaultSelfEmploymentState(),
    positions,
    investmentByAccountId,
    investment,
    positionTableView: defaultPositionTableViewState()
  };
}
