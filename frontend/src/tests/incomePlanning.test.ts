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

    expect(model.scenarioId).toBe("normal");
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

  it("filters saved entries by week scenario without creating suggestion blocks", () => {
    const state: IncomePlanningState = {
      ...defaultIncomePlanningState(),
      weekScenarios: [{ id: "focus", label: "Fokuswoche" }],
      workBlocks: [
        buildIncomePlanningWorkBlock("salary", "all-work", { slots: [flexiblePlanningSlot("all-work-slot", 2)] }),
        buildIncomePlanningWorkBlock("self_employed", "self-work", {
          slots: [{ ...flexiblePlanningSlot("self-work-slot", 3), scenarioIds: ["self_employed"] }]
        }),
        buildIncomePlanningWorkBlock("freelance", "focus-work", {
          slots: [{ ...flexiblePlanningSlot("focus-work-slot", 4), scenarioIds: ["focus"] }]
        })
      ],
      manualBlocks: [
        buildIncomePlanningManualBlock("free_time", "normal-manual", {
          slots: [{ ...flexiblePlanningSlot("normal-manual-slot", 1), scenarioIds: ["normal"] }]
        }),
        buildIncomePlanningManualBlock("buffer", "focus-manual", {
          slots: [{ ...flexiblePlanningSlot("focus-manual-slot", 2), scenarioIds: ["focus"] }]
        })
      ],
      habits: [
        buildIncomePlanningHabit("all-habit", { slots: [flexiblePlanningSlot("all-habit-slot", 1)] }),
        buildIncomePlanningHabit("self-habit", {
          slots: [{ ...flexiblePlanningSlot("self-habit-slot", 1), scenarioIds: ["self_employed"] }]
        }),
        buildIncomePlanningHabit("focus-habit", {
          slots: [{ ...flexiblePlanningSlot("focus-habit-slot", 1), scenarioIds: ["focus"] }]
        })
      ],
      assumptions: {
        sleepHoursPerDay: 0,
        sleepSlots: [
          { ...flexiblePlanningSlot("all-sleep", 1), day: "monday" },
          { ...flexiblePlanningSlot("focus-sleep", 2), day: "tuesday", scenarioIds: ["focus"] }
        ]
      }
    };
    const snapshot = JSON.stringify(state);

    const normal = buildIncomePlanningModel(state, { scenarioId: "normal" });
    const selfEmployed = buildIncomePlanningModel(state, { scenarioId: "self_employed" });
    const focus = buildIncomePlanningModel(state, { scenarioId: "focus" });

    expect(normal.activeWorkBlocks.map((block) => block.id)).toEqual(["all-work"]);
    expect(selfEmployed.activeWorkBlocks.map((block) => block.id)).toEqual(["all-work", "self-work"]);
    expect(focus.activeWorkBlocks.map((block) => block.id)).toEqual(["all-work", "focus-work"]);
    expect(normal.activeManualBlocks.map((block) => block.id)).toEqual(["normal-manual"]);
    expect(focus.activeManualBlocks.map((block) => block.id)).toEqual(["focus-manual"]);
    expect(normal.activeHabits.map((habit) => habit.id)).toEqual(["all-habit"]);
    expect(selfEmployed.activeHabits.map((habit) => habit.id)).toEqual(["all-habit", "self-habit"]);
    expect(focus.activeHabits.map((habit) => habit.id)).toEqual(["all-habit", "focus-habit"]);
    expect(normal.sleepHoursPerWeek).toBe(1);
    expect(focus.sleepHoursPerWeek).toBe(3);
    expect(focus.scenarioLabel).toBe("Fokuswoche");
    expect([normal, selfEmployed, focus].flatMap((model) => model.calendarEntries.map((entry) => entry.type))).not.toContain(
      "scenario_suggestion"
    );
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it("renders only saved separated slots without filling weekday gaps", () => {
    const state: IncomePlanningState = {
      ...defaultIncomePlanningState(),
      workBlocks: [
        buildIncomePlanningWorkBlock("salary", "shift-work", {
          slots: [
            fixedPlanningSlot("tuesday-slot", "tuesday", "09:00", "12:00"),
            fixedPlanningSlot("wednesday-slot", "wednesday", "09:00", "12:00"),
            fixedPlanningSlot("friday-slot", "friday", "10:00", "14:00")
          ]
        })
      ],
      habits: [],
      manualBlocks: [],
      assumptions: { sleepHoursPerDay: 0, sleepSlots: [] }
    };

    const model = buildIncomePlanningModel(state);
    const workEntries = model.calendarEntries.filter((entry) => entry.ownerId === "shift-work" && entry.slotPart === "main");

    expect(workEntries.map((entry) => entry.day)).toEqual(["tuesday", "wednesday", "friday"]);
    expect(workEntries.map((entry) => entry.day)).not.toContain("thursday");
    expect(model.activeWorkBlocks[0].slots.map((slot) => slot.id)).toEqual(["tuesday-slot", "wednesday-slot", "friday-slot"]);
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

  it("does not create fallback calendar entries for habits without slots", () => {
    const state: IncomePlanningState = {
      ...defaultIncomePlanningState(),
      workBlocks: [],
      manualBlocks: [],
      habits: [
        buildIncomePlanningHabit("book", {
          name: "Buch lesen",
          durationMinutes: 30,
          durationUnit: "day",
          slots: []
        })
      ],
      assumptions: { sleepHoursPerDay: 0, sleepSlots: [] }
    };

    const model = buildIncomePlanningModel(state);

    expect(model.activeHabits).toHaveLength(0);
    expect(model.habitHours).toBe(0);
    expect(model.calendarEntries.some((entry) => entry.type === "good_habit")).toBe(false);
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
              note: "Team A",
              day: "monday",
              startTime: "06:30",
              endTime: "15:45",
              flexible: false,
              durationMinutes: 555,
              pauseEnabled: true,
              pauseStartTime: "12:00",
              pauseEndTime: "12:30",
              pauseDurationMinutes: 30,
              scenarioIds: ["self_employed", "focus"]
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
              note: "Nur kurz",
              day: "tuesday",
              startTime: "21:30",
              endTime: "21:50",
              flexible: false,
              durationMinutes: 20,
              scenarioIds: ["focus"]
            }
          ]
        })
      ],
      manualBlocks: [
        buildIncomePlanningManualBlock("free_time", "free", {
          name: "Freizeit",
          icon: "health",
          slots: [{ ...flexiblePlanningSlot("free-slot", 5), note: "Puffer", scenarioIds: ["normal"] }]
        })
      ],
      calendarStamps: [
        {
          id: "stamp-walk",
          day: "wednesday",
          startTime: "18:15",
          icon: "calendar",
          label: "Spaziergang",
          scenarioIds: ["focus"]
        }
      ],
      plannedStamps: [
        {
          id: "planned-workshop",
          date: "2026-07-15",
          startTime: "10:30",
          icon: "education",
          label: "Workshop",
          description: "Projekttermin",
          scenarioIds: ["self_employed"]
        }
      ],
      weekScenarios: [{ id: "focus", label: "Fokuswoche" }],
      weekScenarioAssignments: [
        {
          weekStartDate: "2026-07-13",
          scenarioId: "focus"
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
            durationMinutes: 480,
            scenarioIds: ["focus"]
          }
        ]
      }
    };

    const csv = exportIncomePlanningCsv(state);
    const imported = incomePlanningFromCsvRows(parseCsv(csv));

    expect(csv).toContain("Arbeit-Slot");
    expect(csv).toContain("Pause-Startzeit");
    expect(csv).toContain("Geplanter-Stempel");
    expect(csv).toContain("Wochenszenario");
    expect(csv).toContain("Wochenszenario-Label");
    expect(csv).toContain("Szenario-IDs");
    expect(csv).toContain("Slot-Notiz");
    expect(csv).toContain("Team A");
    expect(csv).toContain("Nur kurz");
    expect(imported?.workBlocks[0]).toMatchObject({
      id: "main",
      active: true,
      category: "salary",
      name: "Fruehschicht",
      description: "Hauptjob",
      color: "#123456"
    });
    expect(imported?.workBlocks[0]).not.toHaveProperty("scenarioIds");
    expect(imported?.workBlocks[0]?.slots[0]).toMatchObject({
      id: "main-slot",
      note: "Team A",
      pauseEnabled: true,
      pauseStartTime: "12:00",
      pauseEndTime: "12:30",
      pauseDurationMinutes: 30,
      scenarioIds: ["self_employed", "focus"]
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
    expect(imported?.habits[0]).not.toHaveProperty("scenarioIds");
    expect(imported?.habits[0]?.slots[0]).toMatchObject({
      id: "habit-slot",
      note: "Nur kurz",
      scenarioIds: ["focus"]
    });
    expect(imported?.manualBlocks[0]).toMatchObject({ id: "free", icon: "health" });
    expect(imported?.manualBlocks[0]).not.toHaveProperty("scenarioIds");
    expect(imported?.manualBlocks[0]?.slots[0]).toMatchObject({
      id: "free-slot",
      flexible: true,
      durationMinutes: 300,
      note: "Puffer",
      scenarioIds: ["normal"]
    });
    expect(imported?.calendarStamps[0]).toMatchObject({
      id: "stamp-walk",
      day: "wednesday",
      startTime: "18:15",
      icon: "calendar",
      label: "Spaziergang",
      scenarioIds: ["focus"]
    });
    expect(imported?.plannedStamps[0]).toMatchObject({
      id: "planned-workshop",
      date: "2026-07-15",
      startTime: "10:30",
      icon: "education",
      label: "Workshop",
      description: "Projekttermin",
      scenarioIds: ["self_employed"]
    });
    expect(imported?.weekScenarios).toEqual([{ id: "focus", label: "Fokuswoche" }]);
    expect(imported?.weekScenarioAssignments).toEqual([{ weekStartDate: "2026-07-13", scenarioId: "focus" }]);
    expect(imported?.assumptions.sleepHoursPerDay).toBe(7.5);
    expect(imported?.assumptions.sleepSlots[0]).toMatchObject({
      id: "sleep-slot",
      day: "sunday",
      startTime: "22:00",
      endTime: "06:00",
      durationMinutes: 480,
      scenarioIds: ["focus"]
    });
  });

  it("imports legacy owner scenarios onto slots without rewriting base entries", () => {
    const csv = [
      incomePlanningCsvTestRow({
        0: "Datensatz",
        1: "Block-ID",
        2: "Slot-ID",
        3: "Aktiv",
        4: "Kategorie",
        5: "Name",
        6: "Beschreibung",
        7: "Farbe",
        8: "Tag",
        9: "Startzeit",
        10: "Endzeit",
        11: "Flexibel",
        12: "Dauer-Minuten",
        13: "Pause-Aktiv",
        14: "Pause-Startzeit",
        15: "Pause-Endzeit",
        16: "Pause-Minuten",
        17: "Habit-Typ",
        18: "Habit-Timing",
        19: "Habit-Dauer-Minuten",
        20: "Habit-Dauer-Einheit",
        21: "Habit-Ziel",
        22: "Habit-Ersatz",
        23: "Habit-Status",
        24: "Habit-Prioritaet",
        25: "Icon",
        26: "Schlaf-Stunden-Pro-Tag",
        27: "Datum",
        28: "Wochenstart",
        29: "Szenario-ID",
        30: "Szenario-IDs",
        31: "Szenario-Label",
        32: "Slot-Notiz"
      }),
      incomePlanningCsvTestRow({ 0: "Arbeit", 1: "legacy-work", 4: "salary", 5: "Job", 30: "self_employed" }),
      incomePlanningCsvTestRow({
        0: "Arbeit-Slot",
        1: "legacy-work",
        2: "legacy-work-slot",
        8: "monday",
        9: "09:00",
        10: "12:00",
        11: "false",
        12: "180"
      }),
      incomePlanningCsvTestRow({
        0: "Habit",
        1: "legacy-habit",
        5: "Lesen",
        17: "good",
        18: "abends",
        19: "30",
        20: "day",
        21: "build",
        23: "planned",
        24: "medium",
        25: "book",
        30: "self_employed"
      }),
      incomePlanningCsvTestRow({
        0: "Habit-Slot",
        1: "legacy-habit",
        2: "legacy-habit-slot",
        8: "tuesday",
        9: "21:00",
        10: "21:30",
        11: "false",
        12: "30"
      }),
      incomePlanningCsvTestRow({
        0: "Zeitblock",
        1: "legacy-manual",
        4: "free_time",
        5: "Freizeit",
        30: "self_employed"
      }),
      incomePlanningCsvTestRow({
        0: "Zeitblock-Slot",
        1: "legacy-manual",
        2: "legacy-manual-slot",
        8: "friday",
        9: "18:00",
        10: "19:00",
        11: "false",
        12: "60"
      })
    ].join("\n");

    const imported = incomePlanningFromCsvRows(parseCsv(csv));

    expect(imported?.workBlocks[0]).not.toHaveProperty("scenarioIds");
    expect(imported?.workBlocks[0].slots[0].scenarioIds).toEqual(["self_employed"]);
    expect(imported?.habits[0]).not.toHaveProperty("scenarioIds");
    expect(imported?.habits[0].slots[0].scenarioIds).toEqual(["self_employed"]);
    expect(imported?.manualBlocks[0]).not.toHaveProperty("scenarioIds");
    expect(imported?.manualBlocks[0].slots[0].scenarioIds).toEqual(["self_employed"]);
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

function fixedPlanningSlot(
  id: string,
  day: IncomePlanningSlot["day"],
  startTime: string,
  endTime: string
): IncomePlanningSlot {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  return {
    id,
    day,
    startTime,
    endTime,
    flexible: false,
    durationMinutes: (endHour * 60 + endMinute) - (startHour * 60 + startMinute)
  };
}

function incomePlanningCsvTestRow(values: Partial<Record<number, string>>): string {
  const row = Array.from({ length: 33 }, () => "");
  for (const [index, value] of Object.entries(values)) {
    row[Number(index)] = value;
  }
  return row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",");
}
