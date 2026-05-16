import { createId, defaultAppState, defaultInvestmentSettings, defaultPlanningSettings } from "../data/defaults";
import type { AppState, InvestmentSettings, PlanningSettings, ReservePosition, ThemeMode } from "../types";

const STORAGE_KEY = "blobfin.reserveCalculator.v1";
const LEGACY_STORAGE_KEY = "jahreskalkulatorState";

export function loadState(storage: Storage = localStorage): AppState {
  const saved = storage.getItem(STORAGE_KEY);
  if (saved) {
    return normalizeState(JSON.parse(saved));
  }

  const legacy = storage.getItem(LEGACY_STORAGE_KEY);
  if (legacy) {
    return normalizeLegacyState(JSON.parse(legacy));
  }

  return defaultAppState();
}

export function saveState(state: AppState, storage: Storage = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetStoredState(storage: Storage = localStorage): AppState {
  const state = defaultAppState();
  saveState(state, storage);
  return state;
}

function normalizeState(value: unknown): AppState {
  const fallback = defaultAppState();
  if (!isRecord(value)) return fallback;
  const settings = normalizePlanningSettings(value.settings);

  return {
    theme: normalizeThemeMode(value.theme, fallback.theme),
    settings,
    positions: normalizePositions(value.positions, fallback.positions, settings.year),
    investment: normalizeInvestmentSettings(value.investment)
  };
}

function normalizeLegacyState(value: unknown): AppState {
  const fallback = defaultAppState();
  if (!isRecord(value)) return fallback;
  const settings = {
    ...defaultPlanningSettings(),
    year: numberOrDefault(value.year, fallback.settings.year),
    monthlyNetIncome: numberOrDefault(value.monthlyNetIncome, fallback.settings.monthlyNetIncome),
    interestRatePercent: numberOrDefault(value.interestRate, fallback.settings.interestRatePercent),
    cashbackRatePercent: numberOrDefault(value.cashbackRate, fallback.settings.cashbackRatePercent),
    emergencyFund: 0
  };

  return {
    theme: normalizeThemeMode(value.theme, fallback.theme),
    settings,
    positions: normalizePositions(value.positions, fallback.positions, settings.year),
    investment: normalizeLegacyInvestmentSettings(value.investmentSettings)
  };
}

function normalizeThemeMode(value: unknown, fallback: ThemeMode): ThemeMode {
  return value === "dark" || value === "light" ? value : fallback;
}

function normalizePlanningSettings(value: unknown): PlanningSettings {
  const fallback = defaultPlanningSettings();
  if (!isRecord(value)) return fallback;
  return {
    year: numberOrDefault(value.year, fallback.year),
    monthlyNetIncome: numberOrDefault(value.monthlyNetIncome, fallback.monthlyNetIncome),
    interestRatePercent: numberOrDefault(value.interestRatePercent, fallback.interestRatePercent),
    cashbackRatePercent: numberOrDefault(value.cashbackRatePercent, fallback.cashbackRatePercent),
    emergencyFund: 0
  };
}

function normalizeInvestmentSettings(value: unknown): InvestmentSettings {
  const fallback = defaultInvestmentSettings();
  if (!isRecord(value)) return fallback;
  return {
    includedIds: stringArrayOrDefault(value.includedIds, fallback.includedIds),
    includeAccountInterest: booleanOrDefault(value.includeAccountInterest, fallback.includeAccountInterest),
    includeAccountCashback: booleanOrDefault(value.includeAccountCashback, fallback.includeAccountCashback),
    birthYear: numberOrDefault(value.birthYear, fallback.birthYear),
    chartStartAge: numberOrDefault(value.chartStartAge, fallback.chartStartAge),
    payoutEndAge: numberOrDefault(value.payoutEndAge, fallback.payoutEndAge),
    payoutYears: numberOrDefault(value.payoutYears, fallback.payoutYears),
    percentageWithdrawalStartAge: numberOrDefault(
      value.percentageWithdrawalStartAge,
      fallback.percentageWithdrawalStartAge
    ),
    percentageWithdrawalRatePercent: numberOrDefault(
      value.percentageWithdrawalRatePercent,
      fallback.percentageWithdrawalRatePercent
    ),
    investmentReturnPercent: numberOrDefault(value.investmentReturnPercent, fallback.investmentReturnPercent),
    capitalGainsTaxPercent: numberOrDefault(value.capitalGainsTaxPercent, fallback.capitalGainsTaxPercent),
    inflationRatePercent: numberOrDefault(value.inflationRatePercent, fallback.inflationRatePercent)
  };
}

function normalizeLegacyInvestmentSettings(value: unknown): InvestmentSettings {
  const fallback = defaultInvestmentSettings();
  if (!isRecord(value)) return fallback;
  return {
    includedIds: stringArrayOrDefault(value.includedIds, fallback.includedIds),
    includeAccountInterest: booleanOrDefault(value.includeAccountInterest, fallback.includeAccountInterest),
    includeAccountCashback: booleanOrDefault(value.includeAccountCashback, fallback.includeAccountCashback),
    birthYear: numberOrDefault(value.birthYear, fallback.birthYear),
    chartStartAge: numberOrDefault(value.chartStartAge, fallback.chartStartAge),
    payoutEndAge: numberOrDefault(value.payoutEndAge, fallback.payoutEndAge),
    payoutYears: numberOrDefault(value.payoutYears, fallback.payoutYears),
    percentageWithdrawalStartAge: numberOrDefault(
      value.percentageWithdrawalStartAge,
      fallback.percentageWithdrawalStartAge
    ),
    percentageWithdrawalRatePercent: numberOrDefault(
      value.percentageWithdrawalRatePercent,
      fallback.percentageWithdrawalRatePercent
    ),
    investmentReturnPercent: numberOrDefault(value.investmentReturn, fallback.investmentReturnPercent),
    capitalGainsTaxPercent: numberOrDefault(value.capitalGainsTax, fallback.capitalGainsTaxPercent),
    inflationRatePercent: numberOrDefault(value.inflationRate, fallback.inflationRatePercent)
  };
}

function normalizePositions(
  value: unknown,
  fallback: ReservePosition[],
  fallbackPayoutYear = defaultPlanningSettings().year
): ReservePosition[] {
  if (!Array.isArray(value) || value.length === 0) return fallback;

  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const type = normalizePositionType(item.type);
      const position: ReservePosition = {
        id: String(item.id || createId()),
        active: booleanOrDefault(item.active, true),
        visible: booleanOrDefault(item.visible ?? item.view, true),
        name: String(item.name || "Position"),
        type,
        amount: numberOrDefault(item.amount, 0),
        startMonth: numberOrDefault(item.startMonth, 1),
        endMonth: numberOrDefault(item.endMonth, 12),
        payoutType:
          item.payoutType === "monthly" || item.payoutType === "yearly" || item.payoutType === "once"
            ? item.payoutType
            : "none",
        payoutYear: numberOrDefault(item.payoutYear ?? item.year, fallbackPayoutYear),
        payoutMonth: numberOrDefault(item.payoutMonth, 12),
        payoutDay: numberOrDefault(item.payoutDay, 31),
        interestBearing: booleanOrDefault(item.interestBearing ?? item.interest, false),
        cashback: Boolean(item.cashback) && type === "temporary"
      };
      if (position.id === "investitionsrate" && position.type === "temporary") {
        position.type = "savings";
        position.cashback = false;
      }
      if (position.payoutType === "once") {
        position.startMonth = position.payoutMonth;
        position.endMonth = position.payoutMonth;
        position.interestBearing = false;
      }
      return position;
    })
    .filter((position): position is ReservePosition => position !== null);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function numberOrDefault(value: unknown, fallback: number): number {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringArrayOrDefault(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.map(String);
}

function booleanOrDefault(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

function normalizePositionType(value: unknown): ReservePosition["type"] {
  if (value === "fixed" || value === "reserve" || value === "temporary" || value === "savings") return value;
  return "reserve";
}
