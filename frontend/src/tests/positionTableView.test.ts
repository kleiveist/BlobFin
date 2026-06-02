import { describe, expect, it } from "vitest";

import { defaultAppState, defaultPositionTableViewState } from "../data/defaults";
import {
  payoutTypeForPositionTableSelection,
  positionCadencesForTableMode,
  typeForPositionTableSelection
} from "../lib/positionKinds";
import { positionTableColumnsForMode, positionTableRows } from "../lib/positionTableView";
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

function incomePosition(id: string, updates: Partial<ReservePosition> = {}): ReservePosition {
  return {
    id,
    flow: "income",
    active: true,
    visible: true,
    name: id,
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
    cashback: false,
    ...updates
  };
}

function view(overrides: Partial<PositionTableView>): PositionTableView {
  return { filters: [], sort: null, selectedLabels: [], ...overrides };
}

describe("position table view", () => {
  it("only exposes the type column for sections with multiple position types", () => {
    const columnNames = (mode: Parameters<typeof positionTableColumnsForMode>[0]) =>
      positionTableColumnsForMode(mode).map((column) => column.column);

    expect(columnNames("income")).toContain("type");
    expect(columnNames("reserve")).toContain("type");
    expect(columnNames("expense")).not.toContain("type");
    expect(columnNames("savings")).not.toContain("type");
    expect(columnNames("savings")).toContain("endMonth");
  });

  it("filters expenses by monthly payout cadence", () => {
    const state = defaultAppState();
    state.positionTableView.expense = view({
      filters: [{ id: "monthly", column: "payoutType", operator: "eq", value: "monthly" }]
    });

    const rows = positionTableRows(state.positions, "expense", state.positionTableView.expense);

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((position) => position.payoutType === "monthly")).toBe(true);
  });

  it("filters income rows by payout cadence", () => {
    const positions = [
      incomePosition("monthly", { payoutType: "monthly", type: "incomeMonthly" }),
      incomePosition("yearly", { payoutType: "yearly", type: "incomeYearly" }),
      incomePosition("once", { payoutType: "once", type: "incomeTemporary" }),
      incomePosition("none", { payoutType: "none", type: "incomeTemporary" })
    ];

    expect(positionTableRows(positions, "income", view({}), "monthly").map((position) => position.id)).toEqual(["monthly"]);
    expect(positionTableRows(positions, "income", view({}), "yearly").map((position) => position.id)).toEqual(["yearly"]);
    expect(positionTableRows(positions, "income", view({}), "once").map((position) => position.id)).toEqual(["once"]);
    expect(positionTableRows(positions, "income", view({}), "none").map((position) => position.id)).toEqual(["none"]);
  });

  it("filters expense rows by payout cadence including no rhythm", () => {
    const positions = [
      expensePosition("monthly", { payoutType: "monthly" }),
      expensePosition("yearly", { payoutType: "yearly" }),
      expensePosition("once", { payoutType: "once" }),
      expensePosition("none", { payoutType: "none" })
    ];

    expect(positionTableRows(positions, "expense", view({}), "monthly").map((position) => position.id)).toEqual(["monthly"]);
    expect(positionTableRows(positions, "expense", view({}), "yearly").map((position) => position.id)).toEqual(["yearly"]);
    expect(positionTableRows(positions, "expense", view({}), "once").map((position) => position.id)).toEqual(["once"]);
    expect(positionTableRows(positions, "expense", view({}), "none").map((position) => position.id)).toEqual(["none"]);
  });

  it("exposes cadence subviews for all position sections", () => {
    expect(positionCadencesForTableMode("income")).toEqual(["monthly", "yearly", "once", "none"]);
    expect(positionCadencesForTableMode("expense")).toEqual(["monthly", "yearly", "once", "none"]);
    expect(positionCadencesForTableMode("reserve")).toEqual(["fixed", "monthly"]);
    expect(positionCadencesForTableMode("savings")).toEqual(["monthly", "yearly", "once", "none"]);
  });

  it("filters reserve rows by fixed or reserve type", () => {
    const positions = [
      expensePosition("fixed", { type: "fixed", payoutType: "none" }),
      expensePosition("reserve-yearly", { type: "reserve", payoutType: "yearly" }),
      expensePosition("expense", { type: "temporary", payoutType: "monthly" })
    ];

    expect(positionTableRows(positions, "reserve", view({}), "fixed").map((position) => position.id)).toEqual(["fixed"]);
    expect(positionTableRows(positions, "reserve", view({}), "monthly").map((position) => position.id)).toEqual([
      "reserve-yearly"
    ]);
  });

  it("filters savings rows by payout cadence", () => {
    const positions = [
      expensePosition("monthly", { type: "savings", payoutType: "monthly" }),
      expensePosition("yearly", { type: "savings", payoutType: "yearly" }),
      expensePosition("once", { type: "savings", payoutType: "once" }),
      expensePosition("none", { type: "savings", payoutType: "none" })
    ];

    expect(positionTableRows(positions, "savings", view({}), "monthly").map((position) => position.id)).toEqual([
      "monthly"
    ]);
    expect(positionTableRows(positions, "savings", view({}), "yearly").map((position) => position.id)).toEqual([
      "yearly"
    ]);
    expect(positionTableRows(positions, "savings", view({}), "once").map((position) => position.id)).toEqual(["once"]);
    expect(positionTableRows(positions, "savings", view({}), "none").map((position) => position.id)).toEqual(["none"]);
  });

  it("maps new positions to the active table section and cadence", () => {
    expect(typeForPositionTableSelection("income", "monthly")).toBe("incomeMonthly");
    expect(payoutTypeForPositionTableSelection("income", "monthly")).toBe("monthly");
    expect(typeForPositionTableSelection("income", "yearly")).toBe("incomeYearly");
    expect(payoutTypeForPositionTableSelection("income", "yearly")).toBe("yearly");
    expect(typeForPositionTableSelection("income", "once")).toBe("incomeTemporary");
    expect(payoutTypeForPositionTableSelection("income", "once")).toBe("once");
    expect(typeForPositionTableSelection("income", "none")).toBe("incomeTemporary");
    expect(payoutTypeForPositionTableSelection("income", "none")).toBe("none");
    expect(typeForPositionTableSelection("expense", "none")).toBe("temporary");
    expect(payoutTypeForPositionTableSelection("expense", "none")).toBe("none");
    expect(typeForPositionTableSelection("reserve", "fixed")).toBe("fixed");
    expect(payoutTypeForPositionTableSelection("reserve", "fixed")).toBe("none");
    expect(typeForPositionTableSelection("reserve", "monthly")).toBe("reserve");
    expect(payoutTypeForPositionTableSelection("reserve", "monthly")).toBe("monthly");
    expect(typeForPositionTableSelection("savings", "yearly")).toBe("savings");
    expect(payoutTypeForPositionTableSelection("savings", "yearly")).toBe("yearly");
    expect(typeForPositionTableSelection("savings", "none")).toBe("savings");
    expect(payoutTypeForPositionTableSelection("savings", "none")).toBe("none");
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
