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

  it("persists combined app section ids", () => {
    const storage = new MemoryStorage();

    for (const section of ["income", "planning_scenarios"] as const) {
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
    expect(loaded.incomeTracker.yearlyEntries[0].employmentContext).toBe("job_loss");
    expect(loaded.incomeTracker.yearlyEntries[0].minijobType).toBe("commercial");
    expect(loaded.incomeTracker.yearlyEntries[0].considerPensionInsurance).toBe(false);
    expect(loaded.incomeTracker.yearlyEntries[0].isRvExempt).toBe(false);
    expect(loaded.incomeTracker.yearlyEntries[0].studentEmploymentMode).toBe("minijob");
    expect(loaded.incomeTracker.yearlyEntries[0].requiresManualTaxReview).toBe(false);
  });
});
