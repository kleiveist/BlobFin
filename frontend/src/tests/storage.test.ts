import { describe, expect, it } from "vitest";

import { defaultAppState } from "../data/defaults";
import { loadState, saveState } from "../lib/storage";

const STORAGE_KEY = "blobfin.reserveCalculator.v1";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("storage", () => {
  it("starts new app state on the visual landing page", () => {
    const state = defaultAppState();

    expect(state.ui.activeSection).toBe("home");
  });

  it("starts with a global planning end date in the base settings", () => {
    const state = defaultAppState();

    expect(state.settings.endDate).toBe("2088-12-31");
  });

  it("does not activate real estate purchase by default", () => {
    const state = defaultAppState();

    expect(state.realEstate.purchaseActivated).toBe(false);
  });

  it("keeps a saved global planning end date", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    state.settings.endDate = "2044-06-30";

    saveState(state, storage);
    const loaded = loadState(storage);

    expect(loaded.settings.endDate).toBe("2044-06-30");
  });

  it("migrates missing global planning end date from investment end age", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    const legacyState = {
      ...state,
      settings: {
        year: state.settings.year,
        monthlyNetIncome: state.settings.monthlyNetIncome,
        interestRatePercent: state.settings.interestRatePercent,
        cashbackRatePercent: state.settings.cashbackRatePercent,
        emergencyFund: state.settings.emergencyFund
      },
      investment: {
        ...state.investment,
        birthYear: 1980,
        payoutEndAge: 90
      }
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(legacyState));

    const loaded = loadState(storage);

    expect(loaded.settings.endDate).toBe("2070-12-31");
  });

  it("persists combined app section ids", () => {
    const storage = new MemoryStorage();

    for (const section of ["income", "planning_scenarios", "real_estate_financing", "combined_wealth", "statutory_pension"] as const) {
      const state = defaultAppState();
      state.ui.activeSection = section;

      saveState(state, storage);
      const loaded = loadState(storage);

      expect(loaded.ui.activeSection).toBe(section);
    }
  });

  it("maps old income page section ids to the combined income page", () => {
    const storage = new MemoryStorage();

    for (const section of ["income_tracking", "income_status", "income_charts", "income_overview"]) {
      const state = {
        ...defaultAppState(),
        ui: { ...defaultAppState().ui, activeSection: section }
      };
      storage.setItem(STORAGE_KEY, JSON.stringify(state));

      const loaded = loadState(storage);

      expect(loaded.ui.activeSection).toBe("income");
    }
  });

  it("maps old planning page section ids to the combined planning page", () => {
    const storage = new MemoryStorage();

    for (const section of ["cost_reserve_positions", "year_table", "investment_planning", "investment_overview"]) {
      const state = {
        ...defaultAppState(),
        ui: { ...defaultAppState().ui, activeSection: section }
      };
      storage.setItem(STORAGE_KEY, JSON.stringify(state));

      const loaded = loadState(storage);

      expect(loaded.ui.activeSection).toBe("planning_scenarios");
    }
  });

  it("migrates saved app state without position table view settings", () => {
    const storage = new MemoryStorage();
    const legacyState: Partial<ReturnType<typeof defaultAppState>> = { ...defaultAppState() };
    delete legacyState.positionTableView;
    storage.setItem(STORAGE_KEY, JSON.stringify(legacyState));

    const loaded = loadState(storage);

    expect(loaded.positionTableView.expense).toEqual({ filters: [], sort: null, selectedLabels: [] });
    expect(loaded.positionTableView.income).toEqual({ filters: [], sort: null, selectedLabels: [] });
  });

  it("migrates saved table view settings without label quick filters", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    const legacyState = {
      ...state,
      positionTableView: {
        ...state.positionTableView,
        expense: {
          filters: [{ id: "monthly", column: "payoutType", operator: "eq", value: "monthly" }],
          sort: { column: "amount", direction: "desc" }
        }
      }
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(legacyState));

    const loaded = loadState(storage);

    expect(loaded.positionTableView.expense.selectedLabels).toEqual([]);
  });

  it("persists position table filters, sorting, and label quick filters", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    state.positionTableView.expense = {
      filters: [{ id: "monthly", column: "payoutType", operator: "eq", value: "monthly" }],
      sort: { column: "amount", direction: "desc" },
      selectedLabels: ["car", "tax"]
    };

    saveState(state, storage);
    const loaded = loadState(storage);

    expect(loaded.positionTableView.expense).toEqual(state.positionTableView.expense);
  });

  it("migrates legacy positions into a default planning account", () => {
    const storage = new MemoryStorage();
    const legacyState = {
      ...defaultAppState(),
      planningAccounts: undefined
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(legacyState));

    const loaded = loadState(storage);

    expect(loaded.planningAccounts.length).toBeGreaterThan(0);
    expect(loaded.planningAccounts[0].yearlyRows.length).toBeGreaterThan(0);
    expect(loaded.positions).toEqual(loaded.planningAccounts[0].yearlyRows);
  });

  it("loads cost breakdown totals for one-time income and expense positions", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    const base = state.positions[0];
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        planningAccounts: undefined,
        positions: [
          {
            ...base,
            id: "expense-once-details",
            flow: "expense",
            type: "temporary",
            payoutType: "once",
            amount: 1,
            costBreakdown: [
              { id: "rent", name: "Miete", amount: 500 },
              { id: "food", name: "Lebensmittel", amount: 150 }
            ]
          },
          {
            ...base,
            id: "income-once-details",
            flow: "income",
            type: "incomeTemporary",
            payoutType: "once",
            amount: 1,
            costBreakdown: [
              { id: "bonus", name: "Bonus", amount: 900 },
              { id: "refund", name: "Rueckerstattung", amount: 100 }
            ]
          }
        ]
      })
    );

    const loaded = loadState(storage);

    expect(loaded.positions.find((position) => position.id === "expense-once-details")?.amount).toBe(650);
    expect(loaded.positions.find((position) => position.id === "expense-once-details")?.costBreakdown).toHaveLength(2);
    expect(loaded.positions.find((position) => position.id === "income-once-details")?.amount).toBe(1000);
    expect(loaded.positions.find((position) => position.id === "income-once-details")?.costBreakdown).toHaveLength(2);
  });

  it("migrates legacy global investment settings into account-specific settings", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    const firstAccount = state.planningAccounts[0];
    const secondAccount = {
      id: "konto-2",
      name: "Konto 2",
      type: "mixed" as const,
      yearlyRows: []
    };
    const legacyState = {
      ...state,
      planningAccounts: [firstAccount, secondAccount],
      ui: {
        ...state.ui,
        selectedPlanningAccountId: firstAccount.id,
        selectedInvestmentAccountId: firstAccount.id
      },
      investmentByAccountId: undefined,
      investment: {
        ...state.investment,
        includedIds: ["legacy-investment-id"],
        retirementIncludedIds: ["legacy-retirement-id"],
        childIncludedIds: ["legacy-child-id"]
      }
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(legacyState));

    const loaded = loadState(storage);

    expect(loaded.investmentByAccountId[firstAccount.id].includedIds).toEqual(["legacy-investment-id"]);
    expect(loaded.investmentByAccountId[firstAccount.id].retirementIncludedIds).toEqual(["legacy-retirement-id"]);
    expect(loaded.investmentByAccountId[firstAccount.id].childIncludedIds).toEqual(["legacy-child-id"]);
    expect(loaded.investmentByAccountId[secondAccount.id].includedIds).toEqual([]);
    expect(loaded.investmentByAccountId[secondAccount.id].retirementIncludedIds).toEqual([]);
    expect(loaded.investmentByAccountId[secondAccount.id].childIncludedIds).toEqual([]);
  });

  it("normalizes invalid account selectors in ui state", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    const onlyAccountId = state.planningAccounts[0].id;
    const invalidUiState = {
      ...state,
      ui: {
        ...state.ui,
        selectedPlanningAccountId: "missing-planning-account",
        selectedInvestmentAccountId: "missing-investment-account",
        selectedRealEstateAccountIds: ["missing-real-estate-account", onlyAccountId],
        selectedRealEstateWithdrawalGainAccountIds: ["missing-withdrawal-account"],
        selectedCombinedAccountIds: ["missing-combined-account"],
        selectedCombinedLeadInvestmentAccountId: "missing-combined-lead"
      }
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(invalidUiState));

    const loaded = loadState(storage);

    expect(loaded.ui.selectedPlanningAccountId).toBe(onlyAccountId);
    expect(loaded.ui.selectedInvestmentAccountId).toBe(onlyAccountId);
    expect(loaded.ui.selectedRealEstateAccountIds).toEqual([onlyAccountId]);
    expect(loaded.ui.selectedRealEstateWithdrawalGainAccountIds).toEqual([onlyAccountId]);
    expect(loaded.ui.selectedCombinedAccountIds).toEqual([]);
    expect(loaded.ui.selectedCombinedLeadInvestmentAccountId).toBe(onlyAccountId);
  });

  it("keeps real estate source and withdrawal account selections synchronized", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    const migratedStateWithoutNewField = {
      ...state,
      realEstate: {
        ...state.realEstate,
        includeWithdrawalGainAsPaymentSource: true
      },
      ui: {
        activeSection: state.ui.activeSection,
        selectedPlanningAccountId: state.ui.selectedPlanningAccountId,
        selectedInvestmentAccountId: state.ui.selectedInvestmentAccountId,
        selectedRealEstateAccountIds: state.ui.selectedRealEstateAccountIds,
        settingsGrunddatenExpanded: state.ui.settingsGrunddatenExpanded
      }
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(migratedStateWithoutNewField));

    const loaded = loadState(storage);

    expect(loaded.realEstate.includeWithdrawalGainAsPaymentSource).toBe(true);
    expect(loaded.ui.selectedRealEstateWithdrawalGainAccountIds).toEqual(loaded.ui.selectedRealEstateAccountIds);
    expect(loaded.ui.selectedCombinedAccountIds).toEqual(state.planningAccounts.map((account) => account.id));
    expect(loaded.ui.selectedCombinedLeadInvestmentAccountId).toBe(loaded.ui.selectedInvestmentAccountId);
  });

  it("does not activate real estate purchase when saved states miss the activation flag", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    const legacyRealEstate = { ...state.realEstate };
    delete (legacyRealEstate as Partial<typeof legacyRealEstate>).purchaseActivated;
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        realEstate: legacyRealEstate
      })
    );

    const loaded = loadState(storage);

    expect(loaded.realEstate.purchaseActivated).toBe(false);
  });

  it("uses the new combined module defaults when saved values are missing", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        combinedWealth: {}
      })
    );

    const loaded = loadState(storage);

    expect(loaded.combinedWealth.includeCashPositions).toBe(true);
    expect(loaded.combinedWealth.includeCostReserveAccounts).toBe(false);
    expect(loaded.combinedWealth.includeAnnualTableAccounts).toBe(false);
    expect(loaded.combinedWealth.includeDepotDevelopment).toBe(true);
    expect(loaded.combinedWealth.includeSharedDepotDevelopment).toBe(false);
    expect(loaded.combinedWealth.includeWithdrawals).toBe(false);
    expect(loaded.combinedWealth.includeRealEstateFinancing).toBe(true);
    expect(loaded.combinedWealth.includeRealEstateValueTrend).toBe(false);
  });

  it("uses default statutory pension settings when saved values are missing", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    const legacyState = { ...state };
    delete (legacyState as Partial<typeof state>).statutoryPension;
    storage.setItem(STORAGE_KEY, JSON.stringify(legacyState));

    const loaded = loadState(storage);

    expect(loaded.statutoryPension.contributionRatePercent).toBe(18.6);
    expect(loaded.statutoryPension.averageAnnualIncome).toBe(51944);
    expect(loaded.statutoryPension.scenarios.pessimistic.incomeMode).toBe("constant");
    expect(loaded.statutoryPension.scenarios.pessimistic.taxRatePercent).toBe(12.52);
    expect(loaded.statutoryPension.scenarios.pessimistic.healthInsurancePercent).toBe(13.75);
    expect(loaded.statutoryPension.scenarios.pessimistic.careInsurancePercent).toBe(9.2);
    expect(loaded.statutoryPension.scenarios.base.incomeMode).toBe("income_projection");
    expect(loaded.statutoryPension.scenarios.base.taxRatePercent).toBe(9.52);
    expect(loaded.statutoryPension.scenarios.base.healthInsurancePercent).toBe(10.75);
    expect(loaded.statutoryPension.scenarios.base.careInsurancePercent).toBe(6.2);
    expect(loaded.statutoryPension.scenarios.optimistic.retirementAge).toBe(72);
    expect(loaded.statutoryPension.scenarios.optimistic.taxRatePercent).toBe(7.52);
    expect(loaded.statutoryPension.scenarios.optimistic.healthInsurancePercent).toBe(8.75);
    expect(loaded.statutoryPension.scenarios.optimistic.careInsurancePercent).toBe(4.2);
  });

  it("adds new statutory pension deduction fallbacks to saved scenarios", () => {
    const storage = new MemoryStorage();
    const legacyState = defaultAppState();
    delete (legacyState.statutoryPension.scenarios.pessimistic as Partial<
      typeof legacyState.statutoryPension.scenarios.pessimistic
    >).taxRatePercent;
    delete (legacyState.statutoryPension.scenarios.pessimistic as Partial<
      typeof legacyState.statutoryPension.scenarios.pessimistic
    >).healthInsurancePercent;
    delete (legacyState.statutoryPension.scenarios.pessimistic as Partial<
      typeof legacyState.statutoryPension.scenarios.pessimistic
    >).careInsurancePercent;
    delete (legacyState.statutoryPension.scenarios.base as Partial<
      typeof legacyState.statutoryPension.scenarios.base
    >).taxRatePercent;
    delete (legacyState.statutoryPension.scenarios.base as Partial<
      typeof legacyState.statutoryPension.scenarios.base
    >).healthInsurancePercent;
    delete (legacyState.statutoryPension.scenarios.base as Partial<
      typeof legacyState.statutoryPension.scenarios.base
    >).careInsurancePercent;
    storage.setItem(STORAGE_KEY, JSON.stringify(legacyState));

    const loaded = loadState(storage);

    expect(loaded.statutoryPension.scenarios.pessimistic.taxRatePercent).toBe(12.52);
    expect(loaded.statutoryPension.scenarios.pessimistic.healthInsurancePercent).toBe(13.75);
    expect(loaded.statutoryPension.scenarios.pessimistic.careInsurancePercent).toBe(9.2);
    expect(loaded.statutoryPension.scenarios.base.taxRatePercent).toBe(9.52);
    expect(loaded.statutoryPension.scenarios.base.healthInsurancePercent).toBe(10.75);
    expect(loaded.statutoryPension.scenarios.base.careInsurancePercent).toBe(6.2);
    expect(loaded.statutoryPension.scenarios.optimistic.taxRatePercent).toBe(7.52);
  });

  it("prefills statutory pension deductions from defaults when saved social deductions are empty", () => {
    const storage = new MemoryStorage();
    const legacyState = defaultAppState();
    legacyState.statutoryPension.scenarios.optimistic = {
      ...legacyState.statutoryPension.scenarios.optimistic,
      taxRatePercent: 6,
      healthInsurancePercent: 0,
      careInsurancePercent: 0
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(legacyState));

    const loaded = loadState(storage);

    expect(loaded.statutoryPension.scenarios.optimistic.taxRatePercent).toBe(7.52);
    expect(loaded.statutoryPension.scenarios.optimistic.healthInsurancePercent).toBe(8.75);
    expect(loaded.statutoryPension.scenarios.optimistic.careInsurancePercent).toBe(4.2);
  });

  it("persists statutory pension scenario settings", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    state.statutoryPension.contributionRatePercent = 19;
    state.statutoryPension.scenarios.base = {
      retirementAge: 70,
      incomeMode: "constant",
      annualPensionIncreasePercent: 1.5,
      taxRatePercent: 18,
      healthInsurancePercent: 9,
      careInsurancePercent: 4
    };

    saveState(state, storage);
    const loaded = loadState(storage);

    expect(loaded.statutoryPension.contributionRatePercent).toBe(19);
    expect(loaded.statutoryPension.scenarios.base.retirementAge).toBe(70);
    expect(loaded.statutoryPension.scenarios.base.incomeMode).toBe("constant");
    expect(loaded.statutoryPension.scenarios.base.annualPensionIncreasePercent).toBe(1.5);
    expect(loaded.statutoryPension.scenarios.base.taxRatePercent).toBe(15);
    expect(loaded.statutoryPension.scenarios.base.healthInsurancePercent).toBe(9);
    expect(loaded.statutoryPension.scenarios.base.careInsurancePercent).toBe(4);
  });

  it("adds missing income yearly entry defaults to saved yearly entries", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        incomeTracker: {
          ...state.incomeTracker,
          settings: {
            ...state.incomeTracker.settings,
            selectedYearlyLabels: ["student_newspaper_delivery"]
          },
          yearlyEntries: [
            {
              id: "legacy-income",
              year: 2026,
              label: "student_newspaper_delivery",
              person: "household",
              annualNetIncome: null,
              annualGrossIncome: 50000,
              taxesAndDeductions: null,
              taxDeductionItems: {
                wageTax: 3000,
                solidaritySurcharge: null,
                churchTax: null,
                pensionInsurance: null,
                healthInsurance: null,
                careInsurance: null,
                unemploymentInsurance: null,
                employerPensionInsurance: null
              },
              employer: "",
              note: "",
              source: "annual_statement"
            }
          ]
        }
      })
    );

    const loaded = loadState(storage);

    expect(loaded.incomeTracker.yearlyEntries[0].active).toBe(true);
    expect(loaded.incomeTracker.yearlyEntries[0].visible).toBe(true);
    expect(loaded.incomeTracker.yearlyEntries[0].label).toBe("child_youth_jobs");
    expect(loaded.incomeTracker.settings.selectedYearlyLabels).toEqual(["child_youth_jobs"]);
    expect(loaded.incomeTracker.yearlyEntries[0].taxAdjustment).toEqual({ type: "refund", amount: null });
    expect(loaded.incomeTracker.yearlyEntries[0].capitalGainsAllowance).toBe(null);
    expect(loaded.incomeTracker.yearlyEntries[0].capitalGainsChurchTaxEnabled).toBe(false);
    expect(loaded.incomeTracker.yearlyEntries[0].capitalGainsChurchTaxRatePercent).toBe(9);
    expect(loaded.incomeTracker.yearlyEntries[0].taxDeductionItems.capitalGainsTax).toBe(null);
    expect(loaded.incomeTracker.yearlyEntries[0].taxDeductionItems.capitalGainsSolidaritySurcharge).toBe(null);
    expect(loaded.incomeTracker.yearlyEntries[0].taxDeductionItems.capitalGainsChurchTax).toBe(null);
    expect(loaded.incomeTracker.yearlyEntries[0].employmentContext).toBe("job_loss");
    expect(loaded.incomeTracker.yearlyEntries[0].minijobType).toBe("commercial");
    expect(loaded.incomeTracker.yearlyEntries[0].considerPensionInsurance).toBe(false);
    expect(loaded.incomeTracker.yearlyEntries[0].isRvExempt).toBe(false);
    expect(loaded.incomeTracker.yearlyEntries[0].studentEmploymentMode).toBe("minijob");
    expect(loaded.incomeTracker.yearlyEntries[0].requiresManualTaxReview).toBe(false);
  });

  it("loads saved capital gains tax fields", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        incomeTracker: {
          ...state.incomeTracker,
          yearlyEntries: [
            {
              id: "capital-income",
              active: true,
              visible: true,
              year: 2026,
              label: "dividends",
              person: "household",
              annualNetIncome: null,
              annualGrossIncome: 250,
              taxesAndDeductions: 52.75,
              taxDeductionItems: {
                wageTax: null,
                solidaritySurcharge: null,
                churchTax: null,
                capitalGainsTax: 50,
                capitalGainsSolidaritySurcharge: 2.75,
                capitalGainsChurchTax: 0,
                pensionInsurance: null,
                healthInsurance: null,
                careInsurance: null,
                unemploymentInsurance: null,
                employerPensionInsurance: null
              },
              taxAdjustment: { type: "refund", amount: null },
              capitalGainsAllowance: 50,
              capitalGainsChurchTaxEnabled: true,
              capitalGainsChurchTaxRatePercent: 8,
              employer: "",
              note: "",
              source: "annual_statement"
            }
          ]
        }
      })
    );

    const loaded = loadState(storage);

    expect(loaded.incomeTracker.yearlyEntries[0].capitalGainsAllowance).toBe(50);
    expect(loaded.incomeTracker.yearlyEntries[0].capitalGainsChurchTaxEnabled).toBe(true);
    expect(loaded.incomeTracker.yearlyEntries[0].capitalGainsChurchTaxRatePercent).toBe(8);
    expect(loaded.incomeTracker.yearlyEntries[0].taxDeductionItems.capitalGainsTax).toBe(50);
    expect(loaded.incomeTracker.yearlyEntries[0].taxDeductionItems.capitalGainsSolidaritySurcharge).toBe(2.75);
    expect(loaded.incomeTracker.yearlyEntries[0].taxDeductionItems.capitalGainsChurchTax).toBe(0);
  });
});
