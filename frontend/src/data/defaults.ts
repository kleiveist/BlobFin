import type { AppState, InvestmentSettings, PlanningSettings, ReservePosition } from "../types";

export const MONTHS = [
  "Januar",
  "Februar",
  "Maerz",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember"
] as const;

export function createId(): string {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `pos-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultPlanningSettings(): PlanningSettings {
  return {
    year: 2026,
    interestRatePercent: 2,
    cashbackRatePercent: 1,
    emergencyFund: 3000
  };
}

export function defaultPositions(): ReservePosition[] {
  return [
    {
      id: "dispo-reserve",
      active: true,
      name: "Dispo-Reserve",
      type: "fixed",
      amount: 500,
      startMonth: 1,
      endMonth: 12,
      payoutType: "none",
      payoutMonth: 12,
      payoutDay: 31,
      cashback: false
    },
    {
      id: "kfz-ruecklage",
      active: true,
      name: "Kfz-Versicherung Ruecklage",
      type: "reserve",
      amount: 65,
      startMonth: 1,
      endMonth: 12,
      payoutType: "yearly",
      payoutMonth: 12,
      payoutDay: 31,
      cashback: false
    },
    {
      id: "katzen-ruecklage",
      active: true,
      name: "Katzenversicherung Ruecklage",
      type: "reserve",
      amount: 45,
      startMonth: 1,
      endMonth: 12,
      payoutType: "none",
      payoutMonth: 12,
      payoutDay: 31,
      cashback: false
    },
    {
      id: "uni-gebuehr",
      active: true,
      name: "Uni-Gebuehr",
      type: "temporary",
      amount: 324,
      startMonth: 1,
      endMonth: 12,
      payoutType: "monthly",
      payoutMonth: 12,
      payoutDay: 29,
      cashback: true
    },
    {
      id: "investitionsrate",
      active: true,
      name: "Investitionsrate",
      type: "temporary",
      amount: 150,
      startMonth: 1,
      endMonth: 12,
      payoutType: "monthly",
      payoutMonth: 12,
      payoutDay: 14,
      cashback: false
    }
  ];
}

export function defaultInvestmentSettings(): InvestmentSettings {
  return {
    includedIds: ["investitionsrate"],
    birthYear: 1993,
    chartStartAge: 32,
    payoutEndAge: 95,
    payoutYears: 45,
    percentageWithdrawalStartAge: 32,
    percentageWithdrawalRatePercent: 4,
    investmentReturnPercent: 14,
    capitalGainsTaxPercent: 26.375,
    inflationRatePercent: 2
  };
}

export function defaultAppState(): AppState {
  return {
    settings: defaultPlanningSettings(),
    positions: defaultPositions(),
    investment: defaultInvestmentSettings()
  };
}
