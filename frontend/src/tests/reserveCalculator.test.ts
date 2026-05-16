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
    expect(summary.rows[0].plannedOutflow).toBe(584);
    expect(summary.rows[0].monthlyRemaining).toBe(-584);
    expect(summary.totalPlannedOutflow).toBe(7008);
    expect(summary.yearlyRemaining).toBe(-7008);
    expect(summary.yearEndBalance).toBe(1040);
    expect(summary.rows[0].monthlyCashback).toBeCloseTo(3.24, 2);
    expect(Math.round(summary.totalCashback * 100) / 100).toBe(38.88);
    expect(summary.maxNeededWithEmergencyFund).toBe(2294);
  });

  it("only grants cashback for temporary positions with matching payout cadence", () => {
    const state = defaultAppState();
    state.positions = [
      {
        id: "annual-temp",
        active: true,
        name: "Annual Temp",
        type: "temporary",
        amount: 1200,
        startMonth: 1,
        endMonth: 12,
        payoutType: "yearly",
        payoutMonth: 12,
        payoutDay: 31,
        cashback: true
      },
      {
        id: "reserve-no-cashback",
        active: true,
        name: "Reserve",
        type: "reserve",
        amount: 1200,
        startMonth: 1,
        endMonth: 12,
        payoutType: "yearly",
        payoutMonth: 12,
        payoutDay: 31,
        cashback: true
      }
    ];

    const summary = calculateReserveSummary(state.settings, state.positions);

    expect(summary.rows[0].monthlyCashback).toBe(0);
    expect(summary.rows[11].monthlyCashback).toBe(12);
    expect(summary.totalCashback).toBe(12);
  });

  it("keeps one-time temporary payouts out of balances while counting cashback", () => {
    const state = defaultAppState();
    state.positions = [
      {
        id: "one-time-temp",
        active: true,
        name: "One Time Temp",
        type: "temporary",
        amount: 500,
        startMonth: 1,
        endMonth: 12,
        payoutType: "once",
        payoutMonth: 6,
        payoutDay: 20,
        cashback: true
      }
    ];

    const summary = calculateReserveSummary(state.settings, state.positions);

    expect(summary.activePositions).toHaveLength(0);
    expect(summary.rows[0].values["one-time-temp"]).toBe(0);
    expect(summary.rows[5].values["one-time-temp"]).toBe(0);
    expect(summary.rows[6].values["one-time-temp"]).toBe(0);
    expect(summary.maxRow.maxNeeded).toBe(0);
    expect(summary.rows[5].plannedOutflow).toBe(500);
    expect(summary.rows[5].monthlyRemaining).toBe(-500);
    expect(summary.totalPlannedOutflow).toBe(500);
    expect(summary.yearlyRemaining).toBe(-500);
    expect(summary.totalInterest).toBe(0);
    expect(summary.rows[5].monthlyCashback).toBe(5);
    expect(summary.totalCashback).toBe(5);
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
    expect(imported[imported.length - 1]?.type).toBe("savings");
  });
});
