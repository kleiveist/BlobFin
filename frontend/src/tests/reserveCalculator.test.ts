import { describe, expect, it } from "vitest";

import { defaultAppState } from "../data/defaults";
import { calculateReserveSummary } from "../domain/reserveCalculator";
import { exportPositionsCsv, exportYearTableCsv, parseCsv, positionsFromCsvRows } from "../lib/csv";

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
        flow: "expense",
        active: true,
        visible: true,
        name: "Annual Temp",
        type: "temporary",
        amount: 1200,
        startMonth: 1,
        endMonth: 12,
        payoutType: "yearly",
        payoutYear: state.settings.year,
        payoutMonth: 12,
        payoutDay: 31,
        interestBearing: false,
        cashback: true
      },
      {
        id: "reserve-no-cashback",
        flow: "expense",
        active: true,
        visible: true,
        name: "Reserve",
        type: "reserve",
        amount: 1200,
        startMonth: 1,
        endMonth: 12,
        payoutType: "yearly",
        payoutYear: state.settings.year,
        payoutMonth: 12,
        payoutDay: 31,
        interestBearing: false,
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
        flow: "expense",
        active: true,
        visible: true,
        name: "One Time Temp",
        type: "temporary",
        amount: 500,
        startMonth: 1,
        endMonth: 12,
        payoutType: "once",
        payoutYear: state.settings.year,
        payoutMonth: 6,
        payoutDay: 20,
        interestBearing: false,
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

  it("counts one-time payouts only in their payout year", () => {
    const state = defaultAppState();
    state.positions = [
      {
        id: "future-one-time",
        flow: "expense",
        active: true,
        visible: true,
        name: "Future One Time",
        type: "temporary",
        amount: 500,
        startMonth: 1,
        endMonth: 12,
        payoutType: "once",
        payoutYear: state.settings.year + 1,
        payoutMonth: 6,
        payoutDay: 20,
        interestBearing: false,
        cashback: true
      }
    ];

    const currentYear = calculateReserveSummary(state.settings, state.positions);
    const payoutYear = calculateReserveSummary({ ...state.settings, year: state.settings.year + 1 }, state.positions);

    expect(currentYear.totalPlannedOutflow).toBe(0);
    expect(currentYear.totalCashback).toBe(0);
    expect(payoutYear.rows[5].plannedOutflow).toBe(500);
    expect(payoutYear.totalCashback).toBe(5);
  });

  it("calculates monthly, yearly, and temporary income positions as planned income", () => {
    const state = defaultAppState();
    state.positions = [
      {
        id: "salary",
        flow: "income",
        active: true,
        visible: true,
        name: "Salary",
        type: "incomeMonthly",
        amount: 3000,
        startMonth: 1,
        endMonth: 12,
        payoutType: "monthly",
        payoutYear: state.settings.year,
        payoutMonth: 1,
        payoutDay: 1,
        interestBearing: false,
        cashback: false
      },
      {
        id: "tax-refund",
        flow: "income",
        active: true,
        visible: true,
        name: "Tax Refund",
        type: "incomeYearly",
        amount: 900,
        startMonth: 1,
        endMonth: 12,
        payoutType: "yearly",
        payoutYear: state.settings.year,
        payoutMonth: 5,
        payoutDay: 15,
        interestBearing: false,
        cashback: false
      },
      {
        id: "referral",
        flow: "income",
        active: true,
        visible: true,
        name: "Referral",
        type: "incomeTemporary",
        amount: 400,
        startMonth: 3,
        endMonth: 4,
        payoutType: "monthly",
        payoutYear: state.settings.year,
        payoutMonth: 3,
        payoutDay: 1,
        interestBearing: false,
        cashback: false
      },
      {
        id: "rent",
        flow: "expense",
        active: true,
        visible: true,
        name: "Rent",
        type: "temporary",
        amount: 1000,
        startMonth: 1,
        endMonth: 12,
        payoutType: "monthly",
        payoutYear: state.settings.year,
        payoutMonth: 1,
        payoutDay: 1,
        interestBearing: false,
        cashback: false
      }
    ];

    const summary = calculateReserveSummary(state.settings, state.positions);

    expect(summary.rows[0].plannedIncome).toBe(3000);
    expect(summary.rows[2].plannedIncome).toBe(3400);
    expect(summary.rows[4].plannedIncome).toBe(3900);
    expect(summary.rows[0].monthlyRemaining).toBe(2000);
    expect(summary.rows[4].monthlyRemaining).toBe(2900);
    expect(summary.totalPlannedIncome).toBe(37700);
    expect(summary.totalPlannedOutflow).toBe(12000);
    expect(summary.yearlyRemaining).toBe(25700);
  });

  it("calculates hidden positions without showing them in year table columns", () => {
    const state = defaultAppState();
    state.positions = state.positions.map((position) =>
      position.id === "kfz-ruecklage" ? { ...position, visible: false } : position
    );

    const summary = calculateReserveSummary(state.settings, state.positions);
    const csv = exportYearTableCsv(state.settings, state.positions);

    expect(summary.activePositions.some((position) => position.id === "kfz-ruecklage")).toBe(true);
    expect(summary.visiblePositions.some((position) => position.id === "kfz-ruecklage")).toBe(false);
    expect(summary.rows[0].values["kfz-ruecklage"]).toBe(65);
    expect(summary.rows[0].plannedOutflow).toBe(584);
    expect(csv).not.toContain("Kfz-Versicherung Ruecklage");
  });

  it("can include the max-needed column in the year table export", () => {
    const state = defaultAppState();
    const csv = exportYearTableCsv(state.settings, state.positions, true);

    expect(csv).toContain("Max. benoetigter Kontostand am Monatsanfang");
  });

  it("calculates account interest only for checked interest positions", () => {
    const state = defaultAppState();
    state.settings.interestRatePercent = 12;
    state.positions = [
      {
        id: "interest-bearing",
        flow: "expense",
        active: true,
        visible: true,
        name: "Interest Bearing",
        type: "fixed",
        amount: 1200,
        startMonth: 1,
        endMonth: 12,
        payoutType: "none",
        payoutYear: state.settings.year,
        payoutMonth: 12,
        payoutDay: 31,
        interestBearing: true,
        cashback: false
      },
      {
        id: "no-interest",
        flow: "expense",
        active: true,
        visible: true,
        name: "No Interest",
        type: "fixed",
        amount: 1200,
        startMonth: 1,
        endMonth: 12,
        payoutType: "none",
        payoutYear: state.settings.year,
        payoutMonth: 12,
        payoutDay: 31,
        interestBearing: false,
        cashback: false
      }
    ];

    const summary = calculateReserveSummary(state.settings, state.positions);

    expect(summary.rows[0].monthlyInterest).toBe(12);
    expect(summary.totalInterest).toBe(144);
  });

  it("round-trips positions through semicolon csv", () => {
    const state = defaultAppState();
    const csv = exportPositionsCsv(state.positions);
    const imported = positionsFromCsvRows(parseCsv(csv));
    const dispo = imported.find((position) => position.id !== "nettoeinkommen" && position.name === "Dispo-Reserve");

    expect(imported).toHaveLength(state.positions.length);
    expect(imported[0]).toMatchObject({
      active: true,
      visible: true,
      name: "Nettoeinkommen",
      flow: "income",
      type: "incomeMonthly",
      amount: 0
    });
    expect(dispo).toMatchObject({
      active: true,
      visible: true,
      name: "Dispo-Reserve",
      flow: "expense",
      type: "fixed",
      amount: 500,
      interestBearing: false
    });
    expect(imported[imported.length - 1]?.type).toBe("savings");
  });
});
