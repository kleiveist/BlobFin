import { defaultAppState } from "../../data/defaults";
import type { AppState } from "../../types";
import { normalizeCombinedCashPositionIds, normalizeCombinedWealthToggles } from "./normalizeCombinedWealth";
import { normalizeIncomePlanningState } from "./normalizeIncomePlanning";
import { normalizeIncomeTrackerState } from "./normalizeIncomeTracker";
import { normalizeInvestmentSettings } from "./normalizeInvestment";
import { normalizeLegacyState } from "./legacyMigration";
import {
  hasPlanningEndDate,
  investmentForAccount,
  normalizeAppUiState,
  normalizeInvestmentByAccountId,
  normalizePlanningAccounts,
  normalizePlanningSettings,
  normalizeThemeMode,
  planningEndDateFromInvestment,
  positionsForPlanningAccount
} from "./normalizePlanning";
import { normalizePositionTableViewState } from "./normalizePositionTable";
import { migrateMonthlyNetIncomePosition, normalizePositions } from "./normalizePositions";
import { normalizeRealEstateFinancingSettings, normalizeRealEstatePurchaseActivation } from "./normalizeRealEstate";
import { normalizeSelfEmploymentState } from "./normalizeSelfEmployment";
import { normalizeStatutoryPensionSettings } from "./normalizeStatutoryPension";
import { isRecord } from "./validators";

export function normalizeState(value: unknown): AppState {
  const fallback = defaultAppState();
  if (!isRecord(value)) return fallback;
  let settings = normalizePlanningSettings(value.settings);
  const legacyPositions = migrateMonthlyNetIncomePosition(
    settings,
    normalizePositions(value.positions, fallback.positions, settings.year)
  );
  const planningAccounts = normalizePlanningAccounts(value.planningAccounts, legacyPositions, settings.year);
  const ui = normalizeAppUiState(value.ui, planningAccounts);
  const positions = positionsForPlanningAccount(planningAccounts, ui.selectedPlanningAccountId, legacyPositions);
  let combinedWealth = normalizeCombinedWealthToggles(value.combinedWealth);
  const realEstate = normalizeRealEstatePurchaseActivation(
    normalizeRealEstateFinancingSettings(value.realEstate),
    combinedWealth
  );
  const normalizedInvestment = normalizeInvestmentSettings(value.investment);
  if (!hasPlanningEndDate(value.settings)) {
    settings = {
      ...settings,
      endDate: planningEndDateFromInvestment(normalizedInvestment, settings.year)
    };
  }
  const investmentByAccountId = normalizeInvestmentByAccountId(
    value.investmentByAccountId,
    planningAccounts,
    normalizedInvestment,
    ui.selectedInvestmentAccountId
  );
  const investment = investmentForAccount(investmentByAccountId, ui.selectedInvestmentAccountId);
  combinedWealth = normalizeCombinedCashPositionIds(
    combinedWealth,
    planningAccounts,
    realEstate,
    investmentByAccountId
  );

  return {
    theme: normalizeThemeMode(value.theme, fallback.theme),
    settings: { ...settings, monthlyNetIncome: 0 },
    planningAccounts,
    ui,
    realEstate,
    combinedWealth,
    statutoryPension: normalizeStatutoryPensionSettings(value.statutoryPension),
    incomeTracker: normalizeIncomeTrackerState(value.incomeTracker),
    incomePlanning: normalizeIncomePlanningState(value.incomePlanning),
    selfEmployment: normalizeSelfEmploymentState(value.selfEmployment),
    positions,
    investmentByAccountId,
    investment,
    positionTableView: normalizePositionTableViewState(value.positionTableView)
  };
}

export function normalizeStoredState(value: unknown): AppState {
  return normalizeState(value);
}

export { normalizeLegacyState };
