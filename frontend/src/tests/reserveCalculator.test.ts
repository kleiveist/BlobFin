import { describe, expect, it } from "vitest";

import { defaultAppState } from "../data/defaults";
import { calculateReserveSummary } from "../domain/reserveCalculator";
import { exportPositionsCsv, parseCsv, positionsFromCsvRows } from "../lib/csv";

describe("reserve calculator", () => {
  it("keeps the imported default yearly values deterministic", () => {
    const state = defaultAppState();
    const summary = calculateReserveSummary(state.settings, state.positions);

    expect(summary.rows).toHaveLength(12);
    expect(summary.maxRow.month).toBe("Dezember");
    expect(summary.maxRow.maxNeeded).toBe(2294);
    expect(summary.yearEndBalance).toBe(1040);
    expect(Math.round(summary.totalCashback * 100) / 100).toBe(38.88);
    expect(summary.maxNeededWithEmergencyFund).toBe(5294);
  });

  it("round-trips positions through semicolon csv", () => {
    const state = defaultAppState();
    const csv = exportPositionsCsv(state.positions);
    const imported = positionsFromCsvRows(parseCsv(csv));

    expect(imported).toHaveLength(state.positions.length);
    expect(imported[0]).toMatchObject({
      active: true,
      name: "Dispo-Reserve",
      type: "fixed",
      amount: 500
    });
  });
});
