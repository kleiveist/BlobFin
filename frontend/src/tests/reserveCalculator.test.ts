import { describe, expect, it } from "vitest";

import { defaultAppState } from "../data/defaults";
import { calculateReserveSummary, calculateYearTableFooterValue } from "../domain/reserveCalculator";
import { exportPositionsCsv, exportYearTableCsv, parseCsv, positionsFromCsvRows } from "../lib/csv";
import { positionTableMode } from "../lib/positionKinds";
import type { ReservePosition } from "../types";

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

  it("keeps reserve positions in their own table mode", () => {
    const state = defaultAppState();

    expect(positionTableMode(state.positions.find((position) => position.id === "dispo-reserve")!)).toBe("reserve");
    expect(positionTableMode(state.positions.find((position) => position.id === "kfz-ruecklage")!)).toBe("reserve");
    expect(positionTableMode(state.positions.find((position) => position.id === "uni-gebuehr")!)).toBe("expense");
    expect(positionTableMode(state.positions.find((position) => position.id === "investitionsrate")!)).toBe("savings");
  });

  it("uses the yearly reserve sum as footer when payout happens before December", () => {
    const state = defaultAppState();
    const reserve = state.positions.find((position) => position.id === "kfz-ruecklage")!;
    reserve.payoutMonth = 9;

    const summary = calculateReserveSummary(state.settings, state.positions);

    expect(summary.rows[8].values[reserve.id]).toBe(585);
    expect(summary.rows[11].values[reserve.id]).toBe(195);
    expect(calculateYearTableFooterValue(reserve, summary.rows, state.settings.year)).toBe(780);
  });

  it("keeps reserve-funded expenses out of the remaining cashflow", () => {
    const state = defaultAppState();
    const reserve = state.positions.find((position) => position.id === "kfz-ruecklage")!;
    state.positions.push({
      ...reserve,
      id: "kfz-versicherungsrechnung",
      name: reserve.name,
      type: "temporary",
      amount: 780,
      payoutType: "yearly",
      payoutMonth: 12
    });

    const summary = calculateReserveSummary(state.settings, state.positions);

    expect(summary.rows[11].values["kfz-versicherungsrechnung"]).toBe(780);
    expect(summary.rows[11].plannedOutflow).toBe(584);
    expect(summary.rows[11].monthlyRemaining).toBe(-584);
    expect(summary.totalPlannedOutflow).toBe(7008);
    expect(summary.yearlyRemaining).toBe(-7008);
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

  it("starts recurring savings positions in their configured start year and month", () => {
    const state = defaultAppState();
    state.positions = [
      {
        id: "future-savings",
        flow: "expense",
        active: true,
        visible: true,
        name: "Future Savings",
        type: "savings",
        amount: 200,
        startMonth: 4,
        endMonth: 1,
        payoutType: "monthly",
        payoutYear: state.settings.year + 4,
        payoutMonth: 12,
        payoutDay: 14,
        interestBearing: false,
        cashback: false
      }
    ];

    const beforeStart = calculateReserveSummary(state.settings, state.positions);
    const startYear = calculateReserveSummary({ ...state.settings, year: state.settings.year + 4 }, state.positions);
    const laterYear = calculateReserveSummary({ ...state.settings, year: state.settings.year + 5 }, state.positions);

    expect(beforeStart.totalPlannedOutflow).toBe(0);
    expect(startYear.rows[2].plannedOutflow).toBe(0);
    expect(startYear.rows[3].plannedOutflow).toBe(200);
    expect(startYear.totalPlannedOutflow).toBe(1800);
    expect(laterYear.rows[0].plannedOutflow).toBe(200);
    expect(laterYear.totalPlannedOutflow).toBe(2400);
  });

  it("limits savings without rhythm to the configured year and month range", () => {
    const state = defaultAppState();
    state.positions = [
      {
        id: "limited-savings",
        flow: "expense",
        active: true,
        visible: true,
        name: "Limited Savings",
        type: "savings",
        amount: 250,
        startMonth: 1,
        endMonth: 3,
        payoutType: "none",
        payoutYear: state.settings.year,
        payoutMonth: 12,
        payoutDay: 14,
        interestBearing: false,
        cashback: false
      }
    ];

    const summary = calculateReserveSummary(state.settings, state.positions);
    const nextYear = calculateReserveSummary({ ...state.settings, year: state.settings.year + 1 }, state.positions);

    expect(summary.rows[0].plannedOutflow).toBe(250);
    expect(summary.rows[2].plannedOutflow).toBe(250);
    expect(summary.rows[3].plannedOutflow).toBe(0);
    expect(summary.totalPlannedOutflow).toBe(750);
    expect(nextYear.totalPlannedOutflow).toBe(0);
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

  it("calculates income without rhythm only in its configured year and month range", () => {
    const state = defaultAppState();
    state.positions = [
      {
        id: "three-month-income",
        flow: "income",
        active: true,
        visible: true,
        name: "Three Month Income",
        type: "incomeTemporary",
        amount: 750,
        startMonth: 3,
        endMonth: 5,
        payoutType: "none",
        payoutYear: state.settings.year,
        payoutMonth: 3,
        payoutDay: 1,
        interestBearing: false,
        cashback: false
      }
    ];

    const summary = calculateReserveSummary(state.settings, state.positions);
    const nextYear = calculateReserveSummary({ ...state.settings, year: state.settings.year + 1 }, state.positions);

    expect(summary.rows[1].plannedIncome).toBe(0);
    expect(summary.rows[2].plannedIncome).toBe(750);
    expect(summary.rows[4].plannedIncome).toBe(750);
    expect(summary.rows[5].plannedIncome).toBe(0);
    expect(summary.totalPlannedIncome).toBe(2250);
    expect(nextYear.totalPlannedIncome).toBe(0);
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
    const positions = state.positions.map((position, index) => ({
      ...position,
      planningYear: index === 1 ? 2033 : position.planningYear
    }));
    const csv = exportPositionsCsv(positions);
    const imported = positionsFromCsvRows(parseCsv(csv));
    const dispo = imported.find((position) => position.id !== "nettoeinkommen" && position.name === "Dispo-Reserve");
    const uniFee = imported.find((position) => position.name === "Uni-Gebuehr");
    const kfzReserve = imported.find((position) => position.name === "Kfz-Versicherung Ruecklage");

    expect(csv).toContain("Planungsjahr");
    expect(csv).not.toContain("Basis-ID");
    expect(csv).toContain("Temporaere Ausgabe");
    expect(csv).toContain("Auto");
    expect(imported).toHaveLength(state.positions.length);
    expect(imported[0]).toMatchObject({
      active: true,
      visible: true,
      name: "Nettoeinkommen",
      flow: "income",
      type: "incomeMonthly",
      amount: 0,
      planningYear: null
    });
    expect(dispo).toMatchObject({
      active: true,
      visible: true,
      name: "Dispo-Reserve",
      flow: "expense",
      type: "fixed",
      amount: 500,
      interestBearing: false,
      planningYear: 2033
    });
    expect(uniFee).toMatchObject({
      flow: "expense",
      type: "temporary",
      icon: "education",
      cashback: true
    });
    expect(positionTableMode(uniFee!)).toBe("expense");
    expect(kfzReserve?.icon).toBe("car");
    expect(imported[imported.length - 1]?.type).toBe("savings");
  });

  it("round-trips planning years through positions csv for all position modes and cadences", () => {
    const position = (
      id: string,
      flow: ReservePosition["flow"],
      type: ReservePosition["type"],
      payoutType: ReservePosition["payoutType"],
      planningYear: ReservePosition["planningYear"],
      payoutYear = 2026
    ): ReservePosition => ({
      id,
      planningYear,
      flow,
      active: true,
      visible: true,
      name: id,
      type,
      amount: 100,
      startMonth: 1,
      endMonth: 12,
      payoutType,
      payoutYear,
      payoutMonth: 6,
      payoutDay: 15,
      interestBearing: false,
      cashback: false
    });
    const positions: ReservePosition[] = [
      position("income-monthly-start", "income", "incomeMonthly", "monthly", null),
      position("income-yearly-2026", "income", "incomeYearly", "yearly", 2026),
      position("income-once-2033", "income", "incomeTemporary", "once", 2033, 2033),
      position("income-none-2028", "income", "incomeTemporary", "none", 2028),
      position("expense-monthly-start", "expense", "temporary", "monthly", null),
      position("expense-yearly-2026", "expense", "temporary", "yearly", 2026),
      position("expense-once-2033", "expense", "temporary", "once", 2033, 2033),
      position("expense-none-2028", "expense", "fixed", "none", 2028),
      position("reserve-monthly-2026", "expense", "reserve", "monthly", 2026),
      position("savings-monthly-start", "expense", "savings", "monthly", null),
      position("savings-once-2033", "expense", "savings", "once", 2033, 2033),
      position("savings-none-2028", "expense", "savings", "none", 2028)
    ];

    const csv = exportPositionsCsv(positions);
    const imported = positionsFromCsvRows(parseCsv(csv));

    expect(csv).toContain("Planungsjahr");
    expect(csv).toContain("Start");
    expect(csv).toContain("2026");
    expect(csv).toContain("2028");
    expect(csv).toContain("2033");
    expect(imported.map((position) => [position.id, position.planningYear])).toEqual([
      ["income-monthly-start", null],
      ["income-yearly-2026", 2026],
      ["income-once-2033", 2033],
      ["income-none-2028", 2028],
      ["expense-monthly-start", null],
      ["expense-yearly-2026", 2026],
      ["expense-once-2033", 2033],
      ["expense-none-2028", 2028],
      ["reserve-monthly-2026", 2026],
      ["savings-monthly-start", null],
      ["savings-once-2033", 2033],
      ["savings-none-2028", 2028]
    ]);
  });

  it("imports one-time csv positions without planning year into their payout year", () => {
    const csv = [
      "Name;Betrag;Art;Abgang;Abgangsjahr;Abgangsmonat",
      "Einmaliger Laptop;1200;Temporaere Ausgabe;Einmalig;2033;Juni"
    ].join("\n");

    const imported = positionsFromCsvRows(parseCsv(csv));

    expect(imported[0]).toMatchObject({
      name: "Einmaliger Laptop",
      type: "temporary",
      payoutType: "once",
      payoutYear: 2033,
      planningYear: 2033,
      startMonth: 6,
      endMonth: 6
    });
  });

  it("round-trips amount detail popup rows through positions csv", () => {
    const state = defaultAppState();
    const expenseTemplate = state.positions.find((position) => position.id === "uni-gebuehr")!;
    const incomeTemplate = state.positions.find((position) => position.id === "nettoeinkommen")!;
    const positions: ReservePosition[] = [
      {
        ...expenseTemplate,
        id: "expense-monthly-details",
        name: "Monatliche Ausgabe mit Details",
        amount: 1,
        payoutType: "monthly",
        costBreakdown: [
          { id: "streaming", name: "Streaming", amount: 20.5 },
          { id: "software", name: "Software", amount: 10 }
        ]
      },
      {
        ...expenseTemplate,
        id: "expense-yearly-details",
        name: "Jaehrliche Ausgabe mit Details",
        amount: 1,
        payoutType: "yearly",
        payoutMonth: 5,
        costBreakdown: [
          { id: "insurance", name: "Versicherung", amount: 120 },
          { id: "tax", name: "Steuer", amount: 30 }
        ]
      },
      {
        ...expenseTemplate,
        id: "expense-once-details",
        name: "Einmalige Ausgabe mit Details",
        amount: 1,
        payoutType: "once",
        payoutMonth: 8,
        costBreakdown: [
          { id: "move", name: "Umzug", amount: 1000 },
          { id: "deposit", name: "Kaution", amount: null }
        ]
      },
      {
        ...incomeTemplate,
        id: "income-once-details",
        flow: "income",
        type: "incomeTemporary",
        name: "Einmalige Einnahme mit Details",
        amount: 1,
        payoutType: "once",
        payoutMonth: 9,
        interestBearing: false,
        cashback: false,
        costBreakdown: [
          { id: "bonus", name: "Bonus", amount: 900 },
          { id: "refund", name: "Rueckerstattung", amount: 100 }
        ]
      }
    ];

    const csv = exportPositionsCsv(positions);
    const imported = positionsFromCsvRows(parseCsv(csv));
    const detailsFor = (name: string) =>
      imported.find((position) => position.name === name)?.costBreakdown?.map((item) => ({
        name: item.name,
        amount: item.amount
      }));

    expect(csv).toContain('"Detailname"');
    expect(csv).toContain('"Rueckerstattung"');
    expect(imported).toHaveLength(positions.length);
    expect(imported.find((position) => position.name === "Monatliche Ausgabe mit Details")?.amount).toBe(30.5);
    expect(imported.find((position) => position.name === "Jaehrliche Ausgabe mit Details")?.amount).toBe(150);
    expect(imported.find((position) => position.name === "Einmalige Ausgabe mit Details")?.amount).toBe(1000);
    expect(imported.find((position) => position.name === "Einmalige Einnahme mit Details")?.amount).toBe(1000);
    expect(detailsFor("Monatliche Ausgabe mit Details")).toEqual([
      { name: "Streaming", amount: 20.5 },
      { name: "Software", amount: 10 }
    ]);
    expect(detailsFor("Jaehrliche Ausgabe mit Details")).toEqual([
      { name: "Versicherung", amount: 120 },
      { name: "Steuer", amount: 30 }
    ]);
    expect(detailsFor("Einmalige Ausgabe mit Details")).toEqual([
      { name: "Umzug", amount: 1000 },
      { name: "Kaution", amount: null }
    ]);
    expect(detailsFor("Einmalige Einnahme mit Details")).toEqual([
      { name: "Bonus", amount: 900 },
      { name: "Rueckerstattung", amount: 100 }
    ]);
  });

  it("imports legacy positions csv without detail columns", () => {
    const csv = [
      "Aktiv;View;Richtung;Label;Name;Art;Betrag;Startmonat;Endmonat;Abgang;Abgangsjahr;Abgangsmonat;Abgangstag;Zinsen;Cashback",
      "Ja;Ja;Ausgabe;Auto;Legacy-Ausgabe;Temporaere Ausgabe;123,45;Januar;Dezember;monatlich;2026;Juni;15;Nein;Ja"
    ].join("\n");

    const imported = positionsFromCsvRows(parseCsv(csv));

    expect(imported).toHaveLength(1);
    expect(imported[0]).toMatchObject({
      name: "Legacy-Ausgabe",
      flow: "expense",
      type: "temporary",
      amount: 123.45,
      payoutType: "monthly",
      payoutMonth: 6,
      cashback: true
    });
    expect(imported[0]?.costBreakdown).toBeUndefined();
  });
});
