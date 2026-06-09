import { describe, expect, it } from "vitest";

import { defaultIncomePlanningState } from "../data/defaults";
import { INCOME_YEAR_LABEL_OPTIONS } from "../domain/incomeLabels";
import {
  buildIncomePlanningHabit,
  buildIncomePlanningManualBlock,
  buildIncomePlanningModel,
  buildIncomePlanningWorkBlock,
  enforceSingleActiveIncomePlanningMainJob,
  incomePlanningDefaultWorkCategory,
  incomePlanningSlotCalendarSegments,
  INCOME_PLANNING_CATEGORY_CONFIGS
} from "../domain/incomePlanning";
import { exportIncomePlanningCsv, incomePlanningFromCsvRows, parseCsv } from "../lib/csv";
import type { IncomePlanningSlot, IncomePlanningState } from "../types";

describe("income planning", () => {
  it("calculates the default time budget without income amounts", () => {
    const model = buildIncomePlanningModel(defaultIncomePlanningState());

    expect(model.grossWorkHours).toBe(51.3);
    expect(model.totalWorkHours).toBe(51.3);
    expect(model.pauseHours).toBe(0);
    expect(model.habitHours).toBe(3.5);
    expect(model.grossManualHours).toBe(34);
    expect(model.manualHours).toBe(34);
    expect(model.sleepHoursPerWeek).toBe(62.5);
    expect(model.usedHours).toBe(151.3);
    expect(model.remainingFlexibleHours).toBe(16.8);
    expect(model.conflictCount).toBe(0);
    expect(model.status).toBe("realistic");
    expect(model.warnings).toHaveLength(0);
    expect("totalMonthlyIncome" in model).toBe(false);
  });

  it("preloads the requested default work and sleep slots", () => {
    const state = defaultIncomePlanningState();
    const mainJob = state.workBlocks.find((block) => block.id === "income-plan-main-job");
    const onlineSales = state.workBlocks.find((block) => block.id === "income-plan-online-sales");
    const selfEmployment = state.workBlocks.find((block) => block.id === "income-plan-self-employment");

    expect(mainJob?.slots).toHaveLength(5);
    expect(mainJob?.slots.map((slot) => `${slot.day}:${slot.startTime}-${slot.endTime}`)).toEqual([
      "monday:06:30-16:30",
      "tuesday:06:30-16:30",
      "wednesday:06:30-16:30",
      "thursday:06:30-16:30",
      "friday:06:30-16:30"
    ]);
    expect(onlineSales?.slots.map((slot) => `${slot.day}:${slot.startTime}-${slot.endTime}`)).toEqual([
      "monday:17:00-17:25",
      "wednesday:17:00-17:25",
      "friday:17:00-17:25"
    ]);
    expect(selfEmployment).toMatchObject({ active: false, slots: [] });
    expect(state.assumptions.sleepSlots.map((slot) => `${slot.day}:${slot.startTime}-${slot.endTime}:${slot.flexible}`)).toEqual([
      "sunday:21:00-05:30:false",
      "monday:21:00-05:30:false",
      "tuesday:21:00-05:30:false",
      "wednesday:21:00-05:30:false",
      "thursday:21:00-05:30:false",
      "friday:23:00-09:00:true",
      "saturday:23:00-09:00:true"
    ]);
  });

  it("splits overnight sleep slots into calendar day segments", () => {
    const segments = incomePlanningSlotCalendarSegments({
      day: "friday",
      startTime: "23:00",
      endTime: "09:00",
      flexible: true,
      durationMinutes: 600
    });

    expect(segments).toEqual([
      { day: "friday", startMinute: 23 * 60, endMinute: 24 * 60, durationMinutes: 60 },
      { day: "saturday", startMinute: 0, endMinute: 9 * 60, durationMinutes: 9 * 60 }
    ]);
  });

  it("warns when the planned week is overbooked", () => {
    const state: IncomePlanningState = {
      ...defaultIncomePlanningState(),
      workBlocks: [
        buildIncomePlanningWorkBlock("salary", "main", { slots: [flexiblePlanningSlot("main-slot", 90)] }),
        buildIncomePlanningWorkBlock("side_income", "part-time", { slots: [flexiblePlanningSlot("side-slot", 40)] })
      ],
      habits: [],
      manualBlocks: []
    };

    const model = buildIncomePlanningModel(state);

    expect(model.totalWorkHours).toBe(130);
    expect(model.remainingFlexibleHours).toBeLessThan(0);
    expect(model.status).toBe("unrealistic");
    expect(model.warnings.join(" ")).toContain("ueberbucht");
  });

  it("represents book reading before sleep as a good daily habit", () => {
    const state: IncomePlanningState = {
      ...defaultIncomePlanningState(),
      workBlocks: [],
      manualBlocks: [],
      habits: [
        buildIncomePlanningHabit("book", {
          type: "good",
          name: "Buch lesen",
          timing: "vor dem Schlafen",
          durationMinutes: 30,
          durationUnit: "day",
          goalChange: "build",
          slots: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(
            (day, index) => ({
              id: `book-${index}`,
              day: day as IncomePlanningSlot["day"],
              startTime: "21:30",
              endTime: "22:00",
              flexible: false,
              durationMinutes: 30
            })
          )
        })
      ]
    };

    const model = buildIncomePlanningModel(state);

    expect(model.habitHours).toBe(3.5);
    expect(model.calendarEntries[0]).toMatchObject({
      day: "monday",
      startTime: "21:30",
      endTime: "22:00",
      title: "Buch lesen",
      type: "good_habit"
    });
  });

  it("marks a bad habit and replacement habit in the same slot as conflicts", () => {
    const state: IncomePlanningState = {
      ...defaultIncomePlanningState(),
      workBlocks: [],
      manualBlocks: [],
      habits: [
        buildIncomePlanningHabit("phone", {
          type: "bad",
          name: "Handy im Bett",
          replacementHabit: "Buch lesen",
          goalChange: "replace",
          slots: [
            {
              id: "phone-slot",
              day: "monday",
              startTime: "21:30",
              endTime: "22:00",
              flexible: false,
              durationMinutes: 30
            }
          ]
        })
      ]
    };

    const model = buildIncomePlanningModel(state);

    expect(model.habitHours).toBe(1);
    expect(model.conflictCount).toBe(1);
    expect(model.calendarEntries.map((entry) => entry.type).sort()).toEqual(["bad_habit", "replacement_habit"]);
    expect(model.calendarEntries.every((entry) => entry.conflict)).toBe(true);
  });

  it("does not mark flexible overlapping time blocks as conflicts", () => {
    const state: IncomePlanningState = {
      ...defaultIncomePlanningState(),
      workBlocks: [
        buildIncomePlanningWorkBlock("side_income", "one", { slots: [flexiblePlanningSlot("one-slot", 2)] }),
        buildIncomePlanningWorkBlock("self_employed", "two", { slots: [flexiblePlanningSlot("two-slot", 2)] })
      ],
      habits: [],
      manualBlocks: []
    };

    const model = buildIncomePlanningModel(state);

    expect(model.totalWorkHours).toBe(4);
    expect(model.conflictCount).toBe(0);
    expect(model.calendarEntries.every((entry) => entry.flexible)).toBe(true);
  });

  it("subtracts enabled slot pauses from net work time without counting them as conflicts", () => {
    const state: IncomePlanningState = {
      ...defaultIncomePlanningState(),
      workBlocks: [
        buildIncomePlanningWorkBlock("salary", "main", {
          slots: [
            {
              id: "main-slot",
              day: "monday",
              startTime: "06:30",
              endTime: "15:45",
              flexible: false,
              durationMinutes: 555,
              pauseEnabled: true,
              pauseStartTime: "12:00",
              pauseEndTime: "12:30",
              pauseDurationMinutes: 30
            }
          ]
        })
      ],
      habits: [],
      manualBlocks: []
    };

    const model = buildIncomePlanningModel(state);
    const pauseEntry = model.calendarEntries.find((entry) => entry.type === "pause");

    expect(model.grossWorkHours).toBe(9.3);
    expect(model.totalWorkHours).toBe(8.8);
    expect(model.pauseHours).toBe(0.5);
    expect(model.conflictCount).toBe(0);
    expect(pauseEntry).toMatchObject({
      day: "monday",
      startTime: "12:00",
      endTime: "12:30",
      slotPart: "pause",
      title: "Pause"
    });
  });

  it("keeps disabled pause values without subtracting or rendering a pause entry", () => {
    const state: IncomePlanningState = {
      ...defaultIncomePlanningState(),
      workBlocks: [
        buildIncomePlanningWorkBlock("salary", "main", {
          slots: [
            {
              id: "main-slot",
              day: "monday",
              startTime: "06:30",
              endTime: "15:45",
              flexible: false,
              durationMinutes: 555,
              pauseEnabled: false,
              pauseStartTime: "12:00",
              pauseEndTime: "12:30",
              pauseDurationMinutes: 30
            }
          ]
        })
      ],
      habits: [],
      manualBlocks: []
    };

    const model = buildIncomePlanningModel(state);

    expect(model.totalWorkHours).toBe(9.3);
    expect(model.pauseHours).toBe(0);
    expect(model.calendarEntries.some((entry) => entry.type === "pause")).toBe(false);
  });

  it("ignores pause fields on habit slots", () => {
    const state: IncomePlanningState = {
      ...defaultIncomePlanningState(),
      workBlocks: [],
      manualBlocks: [],
      habits: [
        buildIncomePlanningHabit("book", {
          slots: [
            {
              id: "book-slot",
              day: "monday",
              startTime: "21:30",
              endTime: "22:00",
              flexible: false,
              durationMinutes: 30,
              pauseEnabled: true,
              pauseStartTime: "21:40",
              pauseEndTime: "21:50",
              pauseDurationMinutes: 10
            }
          ]
        })
      ]
    };

    const model = buildIncomePlanningModel(state);

    expect(model.habitHours).toBe(0.5);
    expect(model.pauseHours).toBe(0);
    expect(model.calendarEntries.map((entry) => entry.type)).toEqual(["good_habit"]);
  });

  it("round-trips the full time budget through csv", () => {
    const state: IncomePlanningState = {
      workBlocks: [
        buildIncomePlanningWorkBlock("salary", "main", {
          name: "Fruehschicht",
          description: "Hauptjob",
          color: "#123456",
          slots: [
            {
              id: "main-slot",
              day: "monday",
              startTime: "06:30",
              endTime: "15:45",
              flexible: false,
              durationMinutes: 555,
              pauseEnabled: true,
              pauseStartTime: "12:00",
              pauseEndTime: "12:30",
              pauseDurationMinutes: 30
            }
          ]
        })
      ],
      habits: [
        buildIncomePlanningHabit("habit", {
          type: "bad",
          name: "Handy im Bett",
          timing: "abends",
          durationMinutes: 20,
          durationUnit: "day",
          goalChange: "replace",
          replacementHabit: "Buch lesen",
          status: "difficult",
          priority: "high",
          icon: "snack",
          slots: [
            {
              id: "habit-slot",
              day: "tuesday",
              startTime: "21:30",
              endTime: "21:50",
              flexible: false,
              durationMinutes: 20
            }
          ]
        })
      ],
      manualBlocks: [
        buildIncomePlanningManualBlock("free_time", "free", {
          name: "Freizeit",
          icon: "health",
          slots: [flexiblePlanningSlot("free-slot", 5)]
        })
      ],
      calendarStamps: [
        {
          id: "stamp-walk",
          day: "wednesday",
          startTime: "18:15",
          icon: "calendar",
          label: "Spaziergang"
        }
      ],
      assumptions: {
        sleepHoursPerDay: 7.5,
        sleepSlots: [
          {
            id: "sleep-slot",
            day: "sunday",
            startTime: "22:00",
            endTime: "06:00",
            flexible: false,
            durationMinutes: 480
          }
        ]
      }
    };

    const csv = exportIncomePlanningCsv(state);
    const imported = incomePlanningFromCsvRows(parseCsv(csv));

    expect(csv).toContain("Arbeit-Slot");
    expect(csv).toContain("Pause-Startzeit");
    expect(imported?.workBlocks[0]).toMatchObject({
      id: "main",
      active: true,
      category: "salary",
      name: "Fruehschicht",
      description: "Hauptjob",
      color: "#123456"
    });
    expect(imported?.workBlocks[0]?.slots[0]).toMatchObject({
      id: "main-slot",
      pauseEnabled: true,
      pauseStartTime: "12:00",
      pauseEndTime: "12:30",
      pauseDurationMinutes: 30
    });
    expect(imported?.habits[0]).toMatchObject({
      id: "habit",
      type: "bad",
      goalChange: "replace",
      replacementHabit: "Buch lesen",
      status: "difficult",
      priority: "high",
      icon: "snack"
    });
    expect(imported?.manualBlocks[0]).toMatchObject({ id: "free", icon: "health" });
    expect(imported?.manualBlocks[0]?.slots[0]).toMatchObject({ id: "free-slot", flexible: true, durationMinutes: 300 });
    expect(imported?.calendarStamps[0]).toMatchObject({
      id: "stamp-walk",
      day: "wednesday",
      startTime: "18:15",
      icon: "calendar",
      label: "Spaziergang"
    });
    expect(imported?.assumptions.sleepHoursPerDay).toBe(7.5);
    expect(imported?.assumptions.sleepSlots[0]).toMatchObject({
      id: "sleep-slot",
      day: "sunday",
      startTime: "22:00",
      endTime: "06:00",
      durationMinutes: 480
    });
  });

  it("uses the yearly income labels as work planning categories", () => {
    expect(INCOME_PLANNING_CATEGORY_CONFIGS.map((config) => config.id)).toEqual(
      INCOME_YEAR_LABEL_OPTIONS.map((option) => option.id)
    );
    expect(INCOME_PLANNING_CATEGORY_CONFIGS.map((config) => config.label)).toEqual(
      INCOME_YEAR_LABEL_OPTIONS.map((option) => option.label)
    );
  });

  it("uses side income as the default work category when a main job is active", () => {
    expect(
      incomePlanningDefaultWorkCategory([
        buildIncomePlanningWorkBlock("salary", "main", { active: true }),
        buildIncomePlanningWorkBlock("online_sales", "sales", { active: true })
      ])
    ).toBe("side_income");

    expect(incomePlanningDefaultWorkCategory([buildIncomePlanningWorkBlock("salary", "inactive", { active: false })])).toBe(
      "salary"
    );
  });

  it("keeps only the saved active main job active", () => {
    const workBlocks = [
      buildIncomePlanningWorkBlock("salary", "main-a", { active: true }),
      buildIncomePlanningWorkBlock("training_allowance", "main-b", { active: true }),
      buildIncomePlanningWorkBlock("side_income", "side", { active: true })
    ];

    const normalized = enforceSingleActiveIncomePlanningMainJob(workBlocks, "main-b");

    expect(normalized.find((block) => block.id === "main-a")?.active).toBe(false);
    expect(normalized.find((block) => block.id === "main-b")?.active).toBe(true);
    expect(normalized.find((block) => block.id === "side")?.active).toBe(true);
  });
});

function flexiblePlanningSlot(id: string, hours: number): IncomePlanningSlot {
  return {
    id,
    day: "sunday",
    startTime: "00:00",
    endTime: "00:00",
    flexible: true,
    durationMinutes: hours * 60
  };
}
