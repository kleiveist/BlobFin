import type { AppState, InvestmentSettings, PlanningSettings, PositionTableViewState, ReservePosition } from "../types";

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
    monthlyNetIncome: 0,
    interestRatePercent: 2,
    cashbackRatePercent: 1,
    emergencyFund: 0
  };
}

export function defaultPositions(): ReservePosition[] {
  return [
    {
      id: "nettoeinkommen",
      flow: "income",
      active: true,
      visible: true,
      name: "Nettoeinkommen",
      icon: "wallet",
      type: "incomeMonthly",
      amount: 0,
      startMonth: 1,
      endMonth: 12,
      payoutType: "monthly",
      payoutYear: 2026,
      payoutMonth: 1,
      payoutDay: 1,
      interestBearing: false,
      cashback: false
    },
    {
      id: "dispo-reserve",
      flow: "expense",
      active: true,
      visible: true,
      name: "Dispo-Reserve",
      icon: "bank",
      type: "fixed",
      amount: 500,
      startMonth: 1,
      endMonth: 12,
      payoutType: "none",
      payoutYear: 2026,
      payoutMonth: 12,
      payoutDay: 31,
      interestBearing: false,
      cashback: false
    },
    {
      id: "kfz-ruecklage",
      flow: "expense",
      active: true,
      visible: true,
      name: "Kfz-Versicherung Ruecklage",
      icon: "car",
      type: "reserve",
      amount: 65,
      startMonth: 1,
      endMonth: 12,
      payoutType: "yearly",
      payoutYear: 2026,
      payoutMonth: 12,
      payoutDay: 31,
      interestBearing: false,
      cashback: false
    },
    {
      id: "katzen-ruecklage",
      flow: "expense",
      active: true,
      visible: true,
      name: "Katzenversicherung Ruecklage",
      icon: "pet",
      type: "reserve",
      amount: 45,
      startMonth: 1,
      endMonth: 12,
      payoutType: "none",
      payoutYear: 2026,
      payoutMonth: 12,
      payoutDay: 31,
      interestBearing: false,
      cashback: false
    },
    {
      id: "uni-gebuehr",
      flow: "expense",
      active: true,
      visible: true,
      name: "Uni-Gebuehr",
      icon: "education",
      type: "temporary",
      amount: 324,
      startMonth: 1,
      endMonth: 12,
      payoutType: "monthly",
      payoutYear: 2026,
      payoutMonth: 12,
      payoutDay: 29,
      interestBearing: false,
      cashback: true
    },
    {
      id: "investitionsrate",
      flow: "expense",
      active: true,
      visible: true,
      name: "Investitionsrate",
      icon: "investment",
      type: "savings",
      amount: 150,
      startMonth: 1,
      endMonth: 12,
      payoutType: "monthly",
      payoutYear: 2026,
      payoutMonth: 12,
      payoutDay: 14,
      interestBearing: false,
      cashback: false
    }
  ];
}

export function defaultInvestmentSettings(): InvestmentSettings {
  return {
    activeDepot: "standard",
    includedIds: ["investitionsrate"],
    includeAccountInterest: false,
    includeAccountCashback: false,
    retirementIncludedIds: [],
    retirementIncludeAccountInterest: false,
    retirementIncludeAccountCashback: false,
    childIncludedIds: [],
    childIncludeAccountInterest: false,
    childIncludeAccountCashback: false,
    retirementDepotEnabled: false,
    retirementDepotChildren: 0,
    birthYear: 1993,
    chartStartAge: 32,
    payoutEndAge: 95,
    payoutYears: 45,
    percentageWithdrawalStartAge: 32,
    percentageWithdrawalRatePercent: 4,
    investmentReturnPercent: 14,
    capitalGainsTaxPercent: 26.375,
    inflationRatePercent: 2,
    bequestReservePercent: 10,
    retirementBirthYear: 1993,
    retirementChartStartAge: 32,
    retirementPayoutEndAge: 95,
    retirementPayoutYears: 30,
    retirementInvestmentReturnPercent: 14,
    retirementCapitalGainsTaxPercent: 26.375,
    retirementInflationRatePercent: 2,
    retirementBequestReservePercent: 10,
    childBirthYear: 2026,
    childChartStartAge: 0,
    childPayoutAge: 18,
    childInvestmentReturnPercent: 7,
    childCapitalGainsTaxPercent: 26.5,
    childInflationRatePercent: 2.7,
    childBequestReservePercent: 10
  };
}

export function defaultPositionTableViewState(): PositionTableViewState {
  return {
    income: { filters: [], sort: null },
    expense: { filters: [], sort: null },
    reserve: { filters: [], sort: null },
    savings: { filters: [], sort: null }
  };
}

export function defaultAppState(): AppState {
  return {
    theme: "light",
    settings: defaultPlanningSettings(),
    positions: defaultPositions(),
    investment: defaultInvestmentSettings(),
    positionTableView: defaultPositionTableViewState()
  };
}
