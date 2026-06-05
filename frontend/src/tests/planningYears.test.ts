import { describe, expect, it } from "vitest";

import { planningYearOptions, positionsForPlanningYear, sanitizePlanningYearSelection } from "../lib/planningYears";
import type { ReservePosition } from "../types";

describe("planning years", () => {
  it("builds start-year navigation through fifteen future years", () => {
    const years = planningYearOptions(2026);

    expect(years.at(0)).toBe(2026);
    expect(years.at(-1)).toBe(2041);
    expect(years).toHaveLength(16);
  });

  it("keeps start and concrete yearly positions strictly separated", () => {
    const positions = [
      position("start", null),
      position("year-2026", 2026),
      position("year-2033", 2033)
    ];

    expect(positionsForPlanningYear(positions, null).map((item) => item.id)).toEqual(["start"]);
    expect(positionsForPlanningYear(positions, 2026).map((item) => item.id)).toEqual(["year-2026"]);
    expect(positionsForPlanningYear(positions, 2033).map((item) => item.id)).toEqual(["year-2033"]);
  });

  it("uses the payout year as planning year for one-time positions", () => {
    const positions = [
      position("stale-start", null, "once", 2033),
      position("stale-year", 2026, "once", 2033),
      position("monthly-2026", 2026)
    ];

    expect(positionsForPlanningYear(positions, null).map((item) => item.id)).toEqual([]);
    expect(positionsForPlanningYear(positions, 2026).map((item) => item.id)).toEqual(["monthly-2026"]);
    expect(positionsForPlanningYear(positions, 2033).map((item) => item.id)).toEqual(["stale-start", "stale-year"]);
  });

  it("accepts only start or years inside the visible planning horizon", () => {
    expect(sanitizePlanningYearSelection("start", 2026)).toBeNull();
    expect(sanitizePlanningYearSelection("2033", 2026)).toBe(2033);
    expect(sanitizePlanningYearSelection("2042", 2026)).toBeNull();
  });
});

function position(
  id: string,
  planningYear: number | null,
  payoutType: ReservePosition["payoutType"] = "monthly",
  payoutYear = 2026
): ReservePosition {
  return {
    id,
    planningYear,
    flow: "expense",
    active: true,
    visible: true,
    name: id,
    type: "temporary",
    amount: 1,
    startMonth: 1,
    endMonth: 12,
    payoutType,
    payoutYear,
    payoutMonth: 12,
    payoutDay: 31,
    interestBearing: false,
    cashback: false
  };
}
