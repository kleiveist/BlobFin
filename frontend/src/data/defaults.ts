import type {
  AppState,
  AppUiState,
  CombinedWealthToggles,
  IncomePlanningState,
  IncomeTrackerState,
  InvestmentSettings,
  PlanningAccount,
  PlanningSettings,
  PositionTableViewState,
  RealEstateFinancingSettings,
  RepaymentSourceToggle,
  ReservePosition,
  StatutoryPensionSettings
} from "../types";
import {
  buildDefaultIncomePlanningSleepSlots,
  buildIncomePlanningHabit,
  buildIncomePlanningManualBlock,
  buildIncomePlanningWorkBlock,
  incomePlanningAverageSleepHours
} from "../domain/incomePlanning";

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
    endDate: "2088-12-31",
    emergencyFund: 0
  };
}

export function defaultPositions(): ReservePosition[] {
  return [
    {
      id: "nettoeinkommen",
      planningYear: null,
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
      planningYear: null,
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
      planningYear: null,
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
      planningYear: null,
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
      planningYear: null,
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
      planningYear: null,
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
    income: { filters: [], sort: null, selectedLabels: [] },
    expense: { filters: [], sort: null, selectedLabels: [] },
    reserve: { filters: [], sort: null, selectedLabels: [] },
    savings: { filters: [], sort: null, selectedLabels: [] }
  };
}

export function defaultAppUiState(): AppUiState {
  return {
    activeSection: "home",
    selectedPlanningYear: null,
    selectedPlanningAccountId: "default-account",
    selectedInvestmentAccountId: "default-account",
    selectedRealEstateAccountIds: ["default-account"],
    selectedRealEstateWithdrawalGainAccountIds: ["default-account"],
    selectedCombinedAccountIds: ["default-account"],
    selectedCombinedLeadInvestmentAccountId: "default-account",
    settingsGrunddatenExpanded: true
  };
}

export function defaultInvestmentSettingsForNewAccount(): InvestmentSettings {
  return {
    ...defaultInvestmentSettings(),
    activeDepot: "standard",
    includedIds: [],
    includeAccountInterest: false,
    includeAccountCashback: false,
    retirementIncludedIds: [],
    retirementIncludeAccountInterest: false,
    retirementIncludeAccountCashback: false,
    childIncludedIds: [],
    childIncludeAccountInterest: false,
    childIncludeAccountCashback: false
  };
}

export function defaultPlanningAccounts(): PlanningAccount[] {
  return [
    {
      id: "default-account",
      name: "Standardkonto",
      type: "mixed",
      yearlyRows: defaultPositions()
    }
  ];
}

export function defaultRealEstateFinancingSettings(): RealEstateFinancingSettings {
  return {
    locale: "de",
    purchaseActivated: false,
    purchasePrice: 360000,
    constructionOrRenovationCosts: 0,
    landCosts: 0,
    additionalPurchaseCosts: 0,
    notaryCosts: 5000,
    landRegistryCosts: 2000,
    brokerCosts: 12000,
    transferTax: 18000,
    modernizationReserve: 10000,
    movingAndSetupCosts: 8000,
    safetyBuffer: 5000,
    equityCapital: 90000,
    loanAmount: 0,
    interestRatePercent: 3.5,
    initialRepaymentPercent: 2,
    monthlyPayment: 0,
    fixedInterestYears: 15,
    targetTermYears: 35,
    specialRepaymentAmount: 0,
    specialRepaymentRhythm: "yearly",
    remainingDebtAfterFixedInterest: 0,
    financingStartAge: 0,
    financingEndAge: 70,
    plannedSaleYear: null,
    estimatedSaleValue: null,
    targetFullRepaymentYear: null,
    targetMonthlyBurden: 1600,
    maxMonthlyBurden: 2200,
    subsidyAmount: 0,
    propertyValueGrowthPercent: 1.5,
    inflationRatePercent: 2,
    financingYears: 35,
    manualFuturePropertyValue: null,
    repaymentSources: defaultRepaymentSourceToggles(),
    equityCapitalSourceIds: [],
    monthlyPaymentSourceIds: [],
    specialRepaymentSourceIds: [],
    includeWithdrawalGainAsPaymentSource: false
  };
}

export function defaultRepaymentSourceToggles(): RepaymentSourceToggle {
  return {
    useWithdrawalGainAsRepayment: false,
    useDepotSavingsRateAsRepayment: false,
    useLegacySavingsRateAsRepayment: false,
    useNetGainAsRepayment: false,
    onlyUsePositiveValues: true
  };
}

export function defaultCombinedWealthToggles(): CombinedWealthToggles {
  return {
    includeCashPositions: true,
    includeCostReserveAccounts: false,
    includeAnnualTableAccounts: false,
    includeDepotDevelopment: true,
    includeSharedDepotDevelopment: false,
    includeWithdrawals: false,
    includeRealEstateFinancing: false,
    includeRealEstateValueTrend: false,
    includeStatutoryPension: true,
    cashAccountId: "default-account",
    cashPositionIds: [],
    depotKeys: ["standard"],
    statutoryPensionScenario: "base",
    statutoryPensionMonthlyAmount: 0,
    statutoryPensionSavingsRatePercent: 0
  };
}

export function defaultStatutoryPensionSettings(): StatutoryPensionSettings {
  return {
    contributionRatePercent: 18.6,
    averageAnnualIncome: 51944,
    currentPensionValue: 40.79,
    projectionPensionValue: 42.52,
    annualContributionCeilingGross: 101400,
    scenarios: {
      pessimistic: {
        retirementAge: 67,
        incomeMode: "constant",
        annualPensionIncreasePercent: 0.1,
        taxRatePercent: 12.52,
        healthInsurancePercent: 13.75,
        careInsurancePercent: 9.2
      },
      base: {
        retirementAge: 67,
        incomeMode: "income_projection",
        annualPensionIncreasePercent: 1,
        taxRatePercent: 9.52,
        healthInsurancePercent: 10.75,
        careInsurancePercent: 6.2
      },
      optimistic: {
        retirementAge: 72,
        incomeMode: "income_projection",
        annualPensionIncreasePercent: 2,
        taxRatePercent: 7.52,
        healthInsurancePercent: 8.75,
        careInsurancePercent: 4.2
      }
    }
  };
}

export function defaultIncomeTrackerState(): IncomeTrackerState {
  return {
    yearlyEntries: [],
    milestones: [],
    settings: {
      activeInputTab: "yearly",
      projectionMode: "off",
      manualGrowthRatePercent: null,
      savingsSharePercent: null,
      selectedYearlyLabels: []
    }
  };
}

export function defaultIncomePlanningState(): IncomePlanningState {
  const sleepSlots = buildDefaultIncomePlanningSleepSlots();
  return {
    workBlocks: [
      buildIncomePlanningWorkBlock("salary", "income-plan-main-job"),
      buildIncomePlanningWorkBlock("online_sales", "income-plan-online-sales"),
      buildIncomePlanningWorkBlock("self_employed", "income-plan-self-employment", {
        active: false,
        name: "Nebenberufliche Selbststaendigkeit",
        slots: []
      })
    ],
    habits: [
      buildIncomePlanningHabit("income-plan-book-reading"),
      buildIncomePlanningHabit("income-plan-phone-in-bed", {
        active: false,
        type: "bad",
        name: "Handy im Bett",
        description: "Scrollen direkt vor dem Schlafen.",
        timing: "vor dem Schlafen",
        goalChange: "replace",
        replacementHabit: "Buch lesen",
        status: "difficult",
        priority: "high"
      })
    ],
    manualBlocks: [
      buildIncomePlanningManualBlock("private_commitment", "income-plan-private-commitments"),
      buildIncomePlanningManualBlock("free_time", "income-plan-free-time"),
      buildIncomePlanningManualBlock("buffer", "income-plan-weekly-buffer")
    ],
    calendarStamps: [],
    assumptions: {
      sleepHoursPerDay: incomePlanningAverageSleepHours({ sleepHoursPerDay: 0, sleepSlots }),
      sleepSlots
    }
  };
}

export function defaultAppState(): AppState {
  const planningAccounts = defaultPlanningAccounts();
  const investment = defaultInvestmentSettings();
  return {
    theme: "light",
    settings: defaultPlanningSettings(),
    planningAccounts,
    ui: defaultAppUiState(),
    realEstate: defaultRealEstateFinancingSettings(),
    combinedWealth: defaultCombinedWealthToggles(),
    statutoryPension: defaultStatutoryPensionSettings(),
    incomeTracker: defaultIncomeTrackerState(),
    incomePlanning: defaultIncomePlanningState(),
    positions: planningAccounts[0].yearlyRows,
    investmentByAccountId: {
      [planningAccounts[0].id]: investment
    },
    investment,
    positionTableView: defaultPositionTableViewState()
  };
}
