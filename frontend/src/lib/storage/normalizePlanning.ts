import {
  createId,
  defaultAppUiState,
  defaultPlanningAccounts,
  defaultPlanningSettings,
  defaultInvestmentSettingsForNewAccount
} from "../../data/defaults";
import type {
  AppSectionId,
  AppUiState,
  InvestmentSettings,
  PlanningAccount,
  PlanningSettings,
  ReservePosition,
  ThemeMode
} from "../../types";
import { normalizeInvestmentSettings } from "./normalizeInvestment";
import { normalizePositions } from "./normalizePositions";
import {
  booleanOrDefault,
  isRecord,
  normalizePlanningYearSelection,
  numberOrDefault
} from "./validators";

export function normalizeThemeMode(value: unknown, fallback: ThemeMode): ThemeMode {
  return value === "dark" || value === "light" ? value : fallback;
}

export function normalizePlanningSettings(value: unknown): PlanningSettings {
  const fallback = defaultPlanningSettings();
  if (!isRecord(value)) return fallback;
  const year = numberOrDefault(value.year, fallback.year);
  return {
    year,
    monthlyNetIncome: numberOrDefault(value.monthlyNetIncome, fallback.monthlyNetIncome),
    interestRatePercent: numberOrDefault(value.interestRatePercent, fallback.interestRatePercent),
    cashbackRatePercent: numberOrDefault(value.cashbackRatePercent, fallback.cashbackRatePercent),
    endDate: normalizePlanningEndDate(value.endDate, fallback.endDate, year),
    emergencyFund: 0
  };
}

export function hasPlanningEndDate(value: unknown): boolean {
  return isRecord(value) && validPlanningEndDate(value.endDate);
}

export function normalizePlanningEndDate(value: unknown, fallback: string, minYear: number): string {
  const fallbackParts = planningEndDateParts(fallback) ?? {
    year: defaultPlanningSettings().year,
    month: 12,
    day: 31
  };
  const parsed = planningEndDateParts(value) ?? fallbackParts;
  const minimumYear = Math.round(minYear);
  if (parsed.year < minimumYear) {
    return `${clampYear(minimumYear, 2000, 2200)}-12-31`;
  }
  const year = clampYear(parsed.year, 2000, 2200);
  return `${year}-${String(parsed.month).padStart(2, "0")}-${String(parsed.day).padStart(2, "0")}`;
}

export function validPlanningEndDate(value: unknown): boolean {
  return planningEndDateParts(value) !== null;
}

export function planningEndDateParts(value: unknown): { year: number; month: number; day: number } | null {
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

export function planningEndDateFromInvestment(investment: InvestmentSettings, fallbackYear: number): string {
  const endYear = Math.max(
    Math.round(fallbackYear),
    Math.round(numberOrDefault(investment.birthYear, fallbackYear) + numberOrDefault(investment.payoutEndAge, 0))
  );
  return `${clampYear(endYear, 2000, 2200)}-12-31`;
}

export function clampYear(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function normalizePlanningAccounts(
  value: unknown,
  fallbackPositions: ReservePosition[],
  fallbackYear: number
): PlanningAccount[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [fallbackPlanningAccount(fallbackPositions)];
  }

  const accounts = value
    .map((item) => normalizePlanningAccount(item, fallbackYear))
    .filter((account): account is PlanningAccount => account !== null);

  if (accounts.length === 0) {
    return [fallbackPlanningAccount(fallbackPositions)];
  }
  return accounts;
}

export function normalizePlanningAccount(value: unknown, fallbackYear: number): PlanningAccount | null {
  if (!isRecord(value)) return null;
  const sourceRows = value.yearlyRows ?? value.positions;
  const yearlyRows =
    Array.isArray(sourceRows) && sourceRows.length === 0
      ? []
      : normalizePositions(sourceRows, defaultPlanningAccounts()[0].yearlyRows, fallbackYear);
  return {
    id: String(value.id || createId()),
    name: String(value.name || "Konto"),
    type: normalizePlanningAccountType(value.type),
    yearlyRows,
    metadata: isRecord(value.metadata) ? value.metadata : undefined
  };
}

export function normalizePlanningAccountType(value: unknown): PlanningAccount["type"] {
  if (value === "cost_reserve" || value === "annual_table" || value === "mixed") return value;
  return "mixed";
}

export function normalizeAppUiState(value: unknown, accounts: PlanningAccount[]): AppUiState {
  const fallback = defaultAppUiState();
  const firstAccountId = accounts[0]?.id ?? fallback.selectedPlanningAccountId;
  const accountIds = accounts.map((account) => account.id);
  if (!isRecord(value)) {
    return {
      ...fallback,
      selectedPlanningYear: fallback.selectedPlanningYear,
      selectedPlanningAccountId: firstAccountId,
      selectedInvestmentAccountId: firstAccountId,
      selectedRealEstateAccountIds: accountIds,
      selectedRealEstateWithdrawalGainAccountIds: accountIds,
      selectedCombinedAccountIds: accountIds,
      selectedCombinedLeadInvestmentAccountId: firstAccountId
    };
  }

  const selectedPlanningAccountId = String(value.selectedPlanningAccountId || firstAccountId);
  const planningAccountExists = accounts.some((account) => account.id === selectedPlanningAccountId);
  const normalizedPlanningAccountId = planningAccountExists ? selectedPlanningAccountId : firstAccountId;
  const selectedInvestmentAccountId = String(value.selectedInvestmentAccountId || normalizedPlanningAccountId);
  const investmentAccountExists = accounts.some((account) => account.id === selectedInvestmentAccountId);
  const normalizedInvestmentAccountId = investmentAccountExists
    ? selectedInvestmentAccountId
    : normalizedPlanningAccountId;
  const selectedRealEstateAccountIds = normalizeSelectedAccountIds(value.selectedRealEstateAccountIds, accountIds, accountIds);
  const selectedCombinedAccountIds = normalizeSelectedAccountIds(value.selectedCombinedAccountIds, accountIds, accountIds);
  const selectedCombinedLeadInvestmentAccountId = String(
    value.selectedCombinedLeadInvestmentAccountId || normalizedInvestmentAccountId
  );
  const leadInCombinedSelection = selectedCombinedAccountIds.includes(selectedCombinedLeadInvestmentAccountId);
  const normalizedCombinedLeadInvestmentAccountId = leadInCombinedSelection
    ? selectedCombinedLeadInvestmentAccountId
    : selectedCombinedAccountIds[0] ?? normalizedInvestmentAccountId;

  return {
    activeSection: normalizeAppSectionId(value.activeSection, fallback.activeSection),
    selectedPlanningYear: normalizePlanningYearSelection(value.selectedPlanningYear, fallback.selectedPlanningYear),
    selectedPlanningAccountId: normalizedPlanningAccountId,
    selectedInvestmentAccountId: normalizedInvestmentAccountId,
    selectedRealEstateAccountIds,
    selectedRealEstateWithdrawalGainAccountIds: selectedRealEstateAccountIds,
    selectedCombinedAccountIds,
    selectedCombinedLeadInvestmentAccountId: normalizedCombinedLeadInvestmentAccountId,
    settingsVaultExpanded: booleanOrDefault(value.settingsVaultExpanded, fallback.settingsVaultExpanded),
    settingsGrunddatenExpanded: booleanOrDefault(
      value.settingsGrunddatenExpanded,
      fallback.settingsGrunddatenExpanded
    )
  };
}

export function normalizeSelectedAccountIds(value: unknown, accountIds: string[], fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const selected = value
    .map((item) => String(item))
    .filter((accountId, index, items) => items.indexOf(accountId) === index && accountIds.includes(accountId));
  return selected;
}

export function normalizeInvestmentByAccountId(
  value: unknown,
  accounts: PlanningAccount[],
  primaryInvestment: InvestmentSettings,
  primaryAccountId: string
): Record<string, InvestmentSettings> {
  const byAccount = isRecord(value) ? value : null;
  const normalized: Record<string, InvestmentSettings> = {};

  for (const account of accounts) {
    const storedInvestment = byAccount?.[account.id];
    normalized[account.id] = isRecord(storedInvestment)
      ? normalizeInvestmentSettings(storedInvestment)
      : account.id === primaryAccountId
        ? primaryInvestment
        : defaultInvestmentSettingsForNewAccount();
  }

  if (!normalized[primaryAccountId]) {
    normalized[primaryAccountId] = primaryInvestment;
  }

  return normalized;
}

export function investmentForAccount(
  investmentsByAccount: Record<string, InvestmentSettings>,
  accountId: string
): InvestmentSettings {
  return investmentsByAccount[accountId] ?? defaultInvestmentSettingsForNewAccount();
}

export function normalizeAppSectionId(value: unknown, fallback: AppSectionId): AppSectionId {
  if (value === "grunddaten") {
    return "home";
  }
  if (
    value === "income" ||
    value === "income_tracking" ||
    value === "income_status" ||
    value === "income_charts" ||
    value === "income_overview"
  ) {
    return "income";
  }
  if (
    value === "planning_scenarios" ||
    value === "cost_reserve_positions" ||
    value === "year_table" ||
    value === "investment_planning" ||
    value === "investment_overview"
  ) {
    return "planning_scenarios";
  }
  if (value === "self_employment" || value === "self_employment_dashboard") {
    return "project_dashboard";
  }
  if (
    value === "home" ||
    value === "income_planning" ||
    value === "project_dashboard" ||
    value === "self_employment_overview" ||
    value === "business_foundation_dashboard" ||
    value === "real_estate_financing" ||
    value === "statutory_pension" ||
    value === "combined_wealth"
  ) {
    return value;
  }
  if (value === "income_stamp_planner") {
    return "income_planning";
  }
  return fallback;
}

export function positionsForPlanningAccount(
  accounts: PlanningAccount[],
  selectedPlanningAccountId: string,
  fallbackPositions: ReservePosition[]
): ReservePosition[] {
  return accounts.find((account) => account.id === selectedPlanningAccountId)?.yearlyRows ?? fallbackPositions;
}

export function fallbackPlanningAccount(positions: ReservePosition[]): PlanningAccount {
  return {
    ...defaultPlanningAccounts()[0],
    yearlyRows: positions
  };
}
