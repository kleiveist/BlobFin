import { describe, expect, it } from "vitest";

import { defaultIncomePlanningState } from "../data/defaults";
import { buildIncomePlanningModel, buildIncomePlanningSource } from "../domain/incomePlanning";
import type { IncomePlanningState } from "../types";

describe("income planning", () => {
  it("calculates the default example planning load", () => {
    const model = buildIncomePlanningModel(defaultIncomePlanningState());

    expect(model.totalWorkHours).toBe(51);
    expect(model.fixedNeedHours).toBe(83);
    expect(model.usedHours).toBe(134);
    expect(model.remainingFlexibleHours).toBe(34);
    expect(model.totalMonthlyIncome).toBe(3950);
    expect(model.status).toBe("realistic");
    expect(model.warnings).toHaveLength(0);
  });

  it("warns when the planned combination is unrealistic", () => {
    const state: IncomePlanningState = {
      ...defaultIncomePlanningState(),
      sources: [
        buildIncomePlanningSource("main_job", "main", 2026, { hoursPerWeek: 40 }),
        buildIncomePlanningSource("part_time_job", "part-time", 2026, { hoursPerWeek: 30 }),
        buildIncomePlanningSource("self_employment", "self", 2026, { hoursPerWeek: 25 })
      ]
    };

    const model = buildIncomePlanningModel(state);

    expect(model.totalWorkHours).toBe(95);
    expect(model.remainingFlexibleHours).toBeLessThan(0);
    expect(model.status).toBe("unrealistic");
    expect(model.warnings.join(" ")).toContain("zeitlich unrealistisch");
  });

  it("creates scenario steps for self employment and board advisory planning", () => {
    const state: IncomePlanningState = {
      ...defaultIncomePlanningState(),
      sources: [
        buildIncomePlanningSource("self_employment", "self", 2026),
        buildIncomePlanningSource("board_advisory", "board", 2026)
      ]
    };

    const model = buildIncomePlanningModel(state);

    expect(model.scenarios.map((scenario) => scenario.sourceId)).toEqual(["self", "board"]);
    expect(model.scenarios[0].steps).toContain("Geschaeftsidee definieren");
    expect(model.scenarios[1].steps).toContain("Netzwerk aufbauen");
    expect(model.scenarios[1].goal).toContain("Aufsichtsrat");
  });
});
