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
});
