import { describe, expect, it } from "vitest";

import { defaultAppState, defaultPositionTableViewState } from "../data/defaults";
import { positionTableRows } from "../lib/positionTableView";
import type { PositionTableView, ReservePosition } from "../types";

function expensePosition(id: string, updates: Partial<ReservePosition> = {}): ReservePosition {
  return {
    id,
    flow: "expense",
    active: true,
    visible: true,
    name: id,
    icon: "receipt",
    type: "temporary",
    amount: 0,
    startMonth: 1,
    endMonth: 12,
    payoutType: "monthly",
    payoutYear: 2026,
    payoutMonth: 12,
    payoutDay: 31,
    interestBearing: false,
    cashback: false,
    ...updates
  };
}

function view(overrides: Partial<PositionTableView>): PositionTableView {
  return { filters: [], sort: null, selectedLabels: [], ...overrides };
}

describe("position table view", () => {
  it("filters expenses by monthly payout cadence", () => {
    const state = defaultAppState();
    state.positionTableView.expense = view({
      filters: [{ id: "monthly", column: "payoutType", operator: "eq", value: "monthly" }]
    });

    const rows = positionTableRows(state.positions, "expense", state.positionTableView.expense);

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((position) => position.payoutType === "monthly")).toBe(true);
  });

  it("filters label values through the existing icon labels", () => {
    const state = defaultAppState();
    state.positionTableView.reserve = view({
      filters: [{ id: "car", column: "label", operator: "eq", value: "car" }]
    });

    const rows = positionTableRows(state.positions, "reserve", state.positionTableView.reserve);

    expect(rows.map((position) => position.name)).toEqual(["Kfz-Versicherung Ruecklage"]);
  });

  it("shows all section rows when no label quick filter is active", () => {
    const positions = [
      expensePosition("car", { icon: "car" }),
      expensePosition("home", { icon: "home" })
    ];

    const rows = positionTableRows(positions, "expense", view({ selectedLabels: [] }));

    expect(rows.map((position) => position.id)).toEqual(["car", "home"]);
  });

  it("filters rows by one or more active label quick filters", () => {
    const positions = [
      expensePosition("car", { icon: "car" }),
      expensePosition("home", { icon: "home" }),
      expensePosition("tax", { icon: "tax" })
    ];

    const carRows = positionTableRows(positions, "expense", view({ selectedLabels: ["car"] }));
    const multipleRows = positionTableRows(positions, "expense", view({ selectedLabels: ["car", "tax"] }));

    expect(carRows.map((position) => position.id)).toEqual(["car"]);
    expect(multipleRows.map((position) => position.id)).toEqual(["car", "tax"]);
  });

  it("combines label quick filters with popup filters and sorting", () => {
    const positions = [
      expensePosition("low-car", { icon: "car", amount: 20 }),
      expensePosition("high-car", { icon: "car", amount: 120 }),
      expensePosition("high-home", { icon: "home", amount: 200 })
    ];

    const rows = positionTableRows(
      positions,
      "expense",
      view({
        selectedLabels: ["car"],
        filters: [{ id: "amount", column: "amount", operator: "gte", value: "50" }],
        sort: { column: "amount", direction: "desc" }
      })
    );

    expect(rows.map((position) => position.id)).toEqual(["high-car"]);
  });

  it("sorts amount, name, month, and checkbox columns while keeping ties stable", () => {
    const positions = [
      expensePosition("a", { name: "Beta", amount: 100, active: false, payoutMonth: 6 }),
      expensePosition("b", { name: "Alpha", amount: 50, active: true, payoutMonth: 3 }),
      expensePosition("c", { name: "Gamma", amount: 75, active: false, payoutMonth: 9 })
    ];

    expect(positionTableRows(positions, "expense", view({ sort: { column: "amount", direction: "asc" } })).map((p) => p.id)).toEqual([
      "b",
      "c",
      "a"
    ]);
    expect(positionTableRows(positions, "expense", view({ sort: { column: "name", direction: "asc" } })).map((p) => p.id)).toEqual([
      "b",
      "a",
      "c"
    ]);
    expect(
      positionTableRows(positions, "expense", view({ sort: { column: "payoutMonth", direction: "desc" } })).map((p) => p.id)
    ).toEqual(["c", "a", "b"]);
    expect(positionTableRows(positions, "expense", view({ sort: { column: "active", direction: "asc" } })).map((p) => p.id)).toEqual([
      "a",
      "c",
      "b"
    ]);
  });

  it("keeps filters scoped to their own section", () => {
    const state = defaultAppState();
    state.positionTableView.expense = view({
      filters: [{ id: "uni", column: "name", operator: "contains", value: "Uni" }]
    });

    const expenseRows = positionTableRows(state.positions, "expense", state.positionTableView.expense);
    const incomeRows = positionTableRows(state.positions, "income", state.positionTableView.income);

    expect(expenseRows.map((position) => position.id)).toEqual(["uni-gebuehr"]);
    expect(incomeRows.map((position) => position.id)).toEqual(["nettoeinkommen"]);
  });

  it("resets filters and sorting through the default table view state", () => {
    const state = defaultAppState();
    state.positionTableView.expense = view({
      filters: [{ id: "amount", column: "amount", operator: "gte", value: "100" }],
      sort: { column: "name", direction: "desc" },
      selectedLabels: ["car"]
    });

    state.positionTableView.expense = defaultPositionTableViewState().expense;

    expect(state.positionTableView.expense).toEqual({ filters: [], sort: null, selectedLabels: [] });
  });
});
