import { describe, expect, it } from "vitest";

import { defaultAppState } from "../data/defaults";
import { loadState, saveState } from "../lib/storage";

const STORAGE_KEY = "blobfin.reserveCalculator.v1";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("storage", () => {
  it("starts new app state on the visual landing page", () => {
    const state = defaultAppState();

    expect(state.ui.activeSection).toBe("home");
  });

  it("starts with a global planning end date in the base settings", () => {
    const state = defaultAppState();

    expect(state.settings.endDate).toBe("2088-12-31");
  });

  it("does not activate real estate purchase by default", () => {
    const state = defaultAppState();

    expect(state.realEstate.purchaseActivated).toBe(false);
  });

  it("keeps a saved global planning end date", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    state.settings.endDate = "2044-06-30";

    saveState(state, storage);
    const loaded = loadState(storage);

    expect(loaded.settings.endDate).toBe("2044-06-30");
  });

  it("normalizes retirement depot allowance and income tax settings", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState() as any;
    state.investment = {
      ...state.investment,
      retirementDepotAllowanceEnabled: false,
      retirementCapitalGainsTaxPercent: 18
    };
    delete state.investment.retirementIncomeTaxRatePercent;
    state.investmentByAccountId[state.ui.selectedInvestmentAccountId] = state.investment;
    storage.setItem(STORAGE_KEY, JSON.stringify(state));

    const loaded = loadState(storage);

    expect(loaded.investment.retirementDepotAllowanceEnabled).toBe(false);
    expect(loaded.investment.retirementIncomeTaxRatePercent).toBe(20);
  });

  it("migrates missing global planning end date from investment end age", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    const legacyState = {
      ...state,
      settings: {
        year: state.settings.year,
        monthlyNetIncome: state.settings.monthlyNetIncome,
        interestRatePercent: state.settings.interestRatePercent,
        cashbackRatePercent: state.settings.cashbackRatePercent,
        emergencyFund: state.settings.emergencyFund
      },
      investment: {
        ...state.investment,
        birthYear: 1980,
        payoutEndAge: 90
      }
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(legacyState));

    const loaded = loadState(storage);

    expect(loaded.settings.endDate).toBe("2070-12-31");
  });

  it("persists combined app section ids", () => {
    const storage = new MemoryStorage();

    for (const section of [
      "income",
      "income_planning",
      "income_stamp_planner",
      "self_employment_dashboard",
      "planning_scenarios",
      "real_estate_financing",
      "combined_wealth",
      "statutory_pension"
    ] as const) {
      const state = defaultAppState();
      state.ui.activeSection = section;

      saveState(state, storage);
      const loaded = loadState(storage);

      expect(loaded.ui.activeSection).toBe(section);
    }
  });

  it("starts with a self employment example project", () => {
    const state = defaultAppState();

    expect(state.selfEmployment.projects).toHaveLength(1);
    expect(state.selfEmployment.projects[0].labels).toContain("Beratung");
    expect(state.selfEmployment.projects[0].name).toBe("Beispielprojekt");
    expect(state.selfEmployment.projects[0].businessIdeaCanvasFile).toBe(
      "planning/projects/self-project-example/canvas-geschaeftsidee.canvas"
    );
    expect(state.selfEmployment.projects[0].businessIdeaCanvas.nodes.length).toBeGreaterThan(0);
    expect(state.selfEmployment.projects[0].businessIdeaCanvasMeta.phases.map((phase) => phase.name)).toContain(
      "Phase 1"
    );
    expect(state.selfEmployment.projects[0].businessIdeaCanvasMeta.phases).toHaveLength(10);
    expect(state.selfEmployment.projects[0].businessIdeaCanvasMeta.palette.length).toBeGreaterThan(0);
    expect(state.selfEmployment.projects[0].businessIdeaCanvasMeta.groupMeta).toEqual({});
    expect(state.selfEmployment.projects[0].gantt.cardPlans).toHaveLength(
      state.selfEmployment.projects[0].businessIdeaCanvas.nodes.filter((node) => node.type !== "group").length
    );
    expect(state.selfEmployment.projects[0].ganttPhaseFilterIds).toEqual([]);
    expect(state.selfEmployment.selectedProjectId).toBe(state.selfEmployment.projects[0].id);
    expect(state.selfEmployment.selectedRoadmapAreaId).toBe("idea");
  });

  it("normalizes self employment roadmap selection and project icons", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState() as any;
    delete state.selfEmployment.selectedRoadmapAreaId;
    state.selfEmployment.projects[0].icon = "does-not-exist";

    saveState(state, storage);
    const loaded = loadState(storage);

    expect(loaded.selfEmployment.selectedRoadmapAreaId).toBe("idea");
    expect(loaded.selfEmployment.projects[0].icon).toBe("briefcase");
  });

  it("migrates legacy self employment projects to a business idea canvas", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState() as any;
    delete state.selfEmployment.projects[0].businessIdeaCanvas;
    delete state.selfEmployment.projects[0].businessIdeaCanvasFile;
    delete state.selfEmployment.projects[0].businessIdeaCanvasMeta;
    state.selfEmployment.projects[0].idea = "Legacy Idee";
    storage.setItem(STORAGE_KEY, JSON.stringify(state));

    const loaded = loadState(storage);
    const project = loaded.selfEmployment.projects[0];

    expect(project.businessIdeaCanvasFile.endsWith(".canvas")).toBe(true);
    expect(project.businessIdeaCanvas.nodes[0]).toMatchObject({ type: "text", text: "Legacy Idee" });
    expect(project.businessIdeaCanvasMeta.nodeMeta[project.businessIdeaCanvas.nodes[0].id].labelId).toBe("idea");
    expect(project.businessIdeaCanvasMeta.palette.length).toBeGreaterThan(0);
    expect(project.businessIdeaCanvasMeta.groupMeta).toEqual({});
    expect(project.gantt.cardPlans.length).toBeGreaterThan(0);
  });

  it("roundtrips self employment project gantt state", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    const cardId = state.selfEmployment.projects[0].businessIdeaCanvas.nodes[0].id;
    state.selfEmployment.projects[0].ganttPhaseFilterIds = ["phase-2", "missing-phase", "phase-1"];
    state.selfEmployment.projects[0].gantt = {
      ...state.selfEmployment.projects[0].gantt,
      phases: state.selfEmployment.projects[0].gantt.phases.map((phase) =>
        phase.phaseId === "phase-2"
          ? {
              ...phase,
              startMode: "after_previous_label",
              triggerPreviousPhaseId: "phase-1",
              triggerLabelId: "goal",
              defaultTimeBudgetHours: 2
            }
          : phase
      ),
      cardPlans: state.selfEmployment.projects[0].gantt.cardPlans.map((plan) =>
        plan.cardId === cardId
          ? ({ cardId: plan.cardId, timeBudgetHours: 3.5, startDate: "2026-07-01", note: "Wichtig" } as unknown as typeof plan)
          : plan
      )
    };

    saveState(state, storage);
    const loaded = loadState(storage);
    const loadedProject = loaded.selfEmployment.projects[0];

    expect(loadedProject.gantt.phases.find((phase) => phase.phaseId === "phase-2")).toMatchObject({
      startMode: "after_previous_label",
      triggerPreviousPhaseId: "phase-1",
      triggerLabelId: "goal"
    });
    expect(loadedProject.gantt.cardPlans.find((plan) => plan.cardId === cardId)).toMatchObject({
      timeBudgetHours: 3.5,
      completed: false,
      todos: [{ id: `todo-${cardId}-1`, title: "Wichtig", eisenhowerQuadrant: "important_not_urgent", status: "planned", completed: false }]
    });
    expect(loadedProject.ganttPhaseFilterIds).toEqual(["phase-1", "phase-2"]);
  });

  it("adds missing income planning defaults to saved app state", () => {
    const storage = new MemoryStorage();
    const legacyState: Partial<ReturnType<typeof defaultAppState>> = { ...defaultAppState() };
    delete legacyState.incomePlanning;
    storage.setItem(STORAGE_KEY, JSON.stringify(legacyState));

    const loaded = loadState(storage);

    expect(loaded.incomePlanning.workBlocks.map((block) => block.category)).toEqual([
      "salary",
      "online_sales",
      "self_employed"
    ]);
    expect(loaded.incomePlanning.assumptions.sleepHoursPerDay).toBe(8.9);
    expect(loaded.incomePlanning.assumptions.sleepSlots).toHaveLength(7);
    expect(loaded.incomePlanning.manualBlocks.map((block) => block.type)).toEqual([
      "private_commitment",
      "free_time",
      "buffer"
    ]);
    expect(loaded.incomePlanning.weekScenarios).toEqual([]);
    expect(loaded.incomePlanning.plannedStamps).toEqual([]);
    expect(loaded.incomePlanning.weekScenarioAssignments).toEqual([]);
    expect(loaded.incomePlanning.habits.map((habit) => habit.name)).toContain("Buch lesen");
  });

  it("migrates legacy income planning sources to work blocks", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState() as any;
    state.incomePlanning = {
      sources: [
        { id: "main", active: true, category: "main_job", name: "Hauptjob", hoursPerWeek: 40, expectedMonthlyIncome: 3200 },
        { id: "self", active: true, category: "self_employment", name: "Selbst", hoursPerWeek: 8, expectedMonthlyIncome: 600 },
        { id: "board", active: true, category: "board_advisory", name: "Board", hoursPerWeek: 2, expectedMonthlyIncome: 200 }
      ],
      assumptions: {
        sleepHoursPerDay: 7,
        freeTimeHoursPerDay: 2,
        privateCommitmentsHoursPerWeek: 12,
        weeklyBufferHours: 8
      }
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(state));

    const loaded = loadState(storage);

    expect(loaded.incomePlanning.workBlocks.map((block) => block.category)).toEqual([
      "salary",
      "self_employed",
      "supervisory_board"
    ]);
    expect(loaded.incomePlanning.workBlocks.map((block) => block.slots[0].durationMinutes)).toEqual([
      2400,
      480,
      120
    ]);
    expect(loaded.incomePlanning.manualBlocks.map((block) => block.slots[0].durationMinutes)).toEqual([
      720,
      840,
      480
    ]);
  });

  it("normalizes income planning habit and slot values", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState() as any;
    state.incomePlanning = {
      workBlocks: [
        {
          id: "work",
          active: true,
          category: "salary",
          name: "Job",
          description: "",
          slots: [{ id: "slot", day: "bad-day", startTime: "bad", endTime: "25:00", flexible: false, durationMinutes: -10 }]
        }
      ],
      habits: [
        {
          id: "habit",
          active: true,
          type: "bad-value",
          name: "Habit",
          description: "",
          timing: "",
          durationMinutes: 9999,
          durationUnit: "bad-unit",
          goalChange: "bad-change",
          replacementHabit: "",
          status: "bad-status",
          priority: "bad-priority",
          slots: []
        }
      ],
      plannedStamps: [
        {
          id: "planned",
          date: "2026-02-03",
          startTime: "bad",
          icon: "education",
          label: "",
          description: "Projekt"
        }
      ],
      weekScenarioAssignments: [
        { weekStartDate: "2026-07-13", scenarioId: "uni" },
        { weekStartDate: "2026-07-14", scenarioId: "project" },
        { weekStartDate: "2026-07-20", scenarioId: "normal" },
        { weekStartDate: "bad-date", scenarioId: "self_employed" },
        { weekStartDate: "2026-07-13", scenarioId: "self_employed" }
      ],
      manualBlocks: [],
      assumptions: { sleepHoursPerDay: 30 }
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(state));

    const loaded = loadState(storage);

    expect(loaded.incomePlanning.workBlocks[0].slots[0]).toMatchObject({
      day: "sunday",
      startTime: "09:00",
      endTime: "10:00",
      durationMinutes: 0
    });
    expect(loaded.incomePlanning.habits[0]).toMatchObject({
      type: "good",
      durationMinutes: 1440,
      durationUnit: "day",
      goalChange: "build",
      status: "planned",
      priority: "medium"
    });
    expect(loaded.incomePlanning.assumptions.sleepHoursPerDay).toBe(24);
    expect(loaded.incomePlanning.assumptions.sleepSlots).toHaveLength(7);
    expect(loaded.incomePlanning.plannedStamps[0]).toMatchObject({
      id: "planned",
      date: "2026-02-03",
      startTime: "09:00",
      icon: "education",
      label: "Stempel",
      description: "Projekt"
    });
    expect(loaded.incomePlanning.weekScenarioAssignments).toEqual([
      { weekStartDate: "2026-07-13", scenarioId: "self_employed" }
    ]);
  });

  it("normalizes custom income planning scenarios and entry scenario filters", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState() as any;
    state.incomePlanning = {
      weekScenarios: [
        { id: "focus", label: "Fokuswoche" },
        { id: "project", label: "Altes Projekt" },
        { id: "empty-label", label: "" },
        { id: "focus", label: "Fokuswoche neu" }
      ],
      workBlocks: [
        {
          id: "work",
          active: true,
          category: "salary",
          name: "Job",
          description: "",
          scenarioIds: ["focus", "missing", "uni"],
          slots: [
            {
              id: "work-slot",
              slotNote: "Team A",
              day: "monday",
              startTime: "09:00",
              endTime: "12:00",
              flexible: false,
              durationMinutes: 180
            },
            {
              id: "work-slot-own-scenario",
              day: "tuesday",
              startTime: "09:00",
              endTime: "10:00",
              flexible: false,
              durationMinutes: 60,
              scenarioIds: ["self_employed"]
            }
          ]
        }
      ],
      habits: [
        {
          id: "habit",
          active: true,
          type: "good",
          name: "Habit",
          description: "",
          timing: "",
          durationMinutes: 30,
          durationUnit: "day",
          goalChange: "build",
          replacementHabit: "",
          status: "planned",
          priority: "medium",
          scenarioIds: ["self_employed", "project"],
          slots: [
            {
              id: "habit-slot",
              day: "wednesday",
              startTime: "21:00",
              endTime: "21:30",
              flexible: false,
              durationMinutes: 30
            }
          ]
        }
      ],
      manualBlocks: [
        {
          id: "manual",
          active: true,
          type: "free_time",
          name: "Freizeit",
          description: "",
          scenarioIds: ["normal", "self_employed", "focus"],
          slots: [
            {
              id: "manual-slot",
              day: "friday",
              startTime: "18:00",
              endTime: "19:00",
              flexible: false,
              durationMinutes: 60
            }
          ]
        }
      ],
      calendarStamps: [
        {
          id: "stamp",
          day: "monday",
          startTime: "09:00",
          icon: "calendar",
          label: "Stempel",
          scenarioIds: ["focus"]
        }
      ],
      plannedStamps: [
        {
          id: "planned",
          date: "2026-07-15",
          startTime: "10:00",
          icon: "calendar",
          label: "Termin",
          description: "",
          scenarioIds: ["focus", "bad"]
        }
      ],
      weekScenarioAssignments: [
        { weekStartDate: "2026-07-13", scenarioId: "focus" },
        { weekStartDate: "2026-07-20", scenarioId: "project" },
        { weekStartDate: "2026-07-27", scenarioId: "self_employed" }
      ],
      assumptions: {
        sleepHoursPerDay: 8,
        sleepSlots: [
          {
            id: "sleep",
            day: "monday",
            startTime: "22:00",
            endTime: "06:00",
            flexible: false,
            durationMinutes: 480,
            scenarioIds: ["focus", "missing"]
          }
        ]
      }
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(state));

    const loaded = loadState(storage);

    expect(loaded.incomePlanning.weekScenarios).toEqual([{ id: "focus", label: "Fokuswoche neu" }]);
    expect(loaded.incomePlanning.workBlocks[0]).not.toHaveProperty("scenarioIds");
    expect(loaded.incomePlanning.workBlocks[0].slots[0]).toMatchObject({
      note: "Team A",
      scenarioIds: ["focus"]
    });
    expect(loaded.incomePlanning.workBlocks[0].slots[1].scenarioIds).toEqual(["self_employed"]);
    expect(loaded.incomePlanning.habits[0]).not.toHaveProperty("scenarioIds");
    expect(loaded.incomePlanning.habits[0].slots[0].scenarioIds).toEqual(["self_employed"]);
    expect(loaded.incomePlanning.manualBlocks[0]).not.toHaveProperty("scenarioIds");
    expect(loaded.incomePlanning.manualBlocks[0].slots[0].scenarioIds).toBeUndefined();
    expect(loaded.incomePlanning.calendarStamps[0].scenarioIds).toEqual(["focus"]);
    expect(loaded.incomePlanning.plannedStamps[0].scenarioIds).toEqual(["focus"]);
    expect(loaded.incomePlanning.assumptions.sleepSlots[0].scenarioIds).toEqual(["focus"]);
    expect(loaded.incomePlanning.weekScenarioAssignments).toEqual([
      { weekStartDate: "2026-07-13", scenarioId: "focus" },
      { weekStartDate: "2026-07-27", scenarioId: "self_employed" }
    ]);
  });

  it("migrates legacy slot pauses while stripping pauses from habits", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState() as any;
    const pausedSlot = {
      id: "slot",
      day: "monday",
      startTime: "06:30",
      endTime: "15:45",
      flexible: false,
      durationMinutes: 555,
      pauseStartTime: "12:00",
      pauseEndTime: "12:30",
      pauseDurationMinutes: 30
    };
    state.incomePlanning = {
      workBlocks: [
        {
          id: "work",
          active: true,
          category: "salary",
          name: "Job",
          description: "",
          slots: [pausedSlot]
        }
      ],
      habits: [
        {
          id: "habit",
          active: true,
          type: "good",
          name: "Buch lesen",
          description: "",
          timing: "abends",
          durationMinutes: 30,
          durationUnit: "day",
          goalChange: "build",
          replacementHabit: "",
          status: "planned",
          priority: "medium",
          slots: [pausedSlot]
        }
      ],
      manualBlocks: [],
      assumptions: { sleepHoursPerDay: 8 }
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(state));

    const loaded = loadState(storage);

    expect(loaded.incomePlanning.workBlocks[0].slots[0]).toMatchObject({
      pauseEnabled: true,
      pauseStartTime: "12:00",
      pauseEndTime: "12:30",
      pauseDurationMinutes: 30
    });
    expect(loaded.incomePlanning.habits[0].slots[0]).not.toHaveProperty("pauseEnabled");
    expect(loaded.incomePlanning.habits[0].slots[0]).not.toHaveProperty("pauseStartTime");
  });

  it("maps old income page section ids to the combined income page", () => {
    const storage = new MemoryStorage();

    for (const section of ["income_tracking", "income_status", "income_charts", "income_overview"]) {
      const state = {
        ...defaultAppState(),
        ui: { ...defaultAppState().ui, activeSection: section }
      };
      storage.setItem(STORAGE_KEY, JSON.stringify(state));

      const loaded = loadState(storage);

      expect(loaded.ui.activeSection).toBe("income");
    }
  });

  it("maps old planning page section ids to the combined planning page", () => {
    const storage = new MemoryStorage();

    for (const section of ["cost_reserve_positions", "year_table", "investment_planning", "investment_overview"]) {
      const state = {
        ...defaultAppState(),
        ui: { ...defaultAppState().ui, activeSection: section }
      };
      storage.setItem(STORAGE_KEY, JSON.stringify(state));

      const loaded = loadState(storage);

      expect(loaded.ui.activeSection).toBe("planning_scenarios");
    }
  });

  it("migrates saved app state without position table view settings", () => {
    const storage = new MemoryStorage();
    const legacyState: Partial<ReturnType<typeof defaultAppState>> = { ...defaultAppState() };
    delete legacyState.positionTableView;
    storage.setItem(STORAGE_KEY, JSON.stringify(legacyState));

    const loaded = loadState(storage);

    expect(loaded.positionTableView.expense).toEqual({ filters: [], sort: null, selectedLabels: [] });
    expect(loaded.positionTableView.income).toEqual({ filters: [], sort: null, selectedLabels: [] });
  });

  it("treats saved positions without planning year as start positions", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    const legacyPositions = state.positions.map((position) => {
      const legacyPosition = { ...position };
      delete legacyPosition.planningYear;
      return legacyPosition;
    });
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        positions: legacyPositions,
        planningAccounts: state.planningAccounts.map((account) => ({
          ...account,
          yearlyRows: legacyPositions
        }))
      })
    );

    const loaded = loadState(storage);

    expect(loaded.positions.every((position) => position.planningYear === null)).toBe(true);
    expect(loaded.planningAccounts[0].yearlyRows.every((position) => position.planningYear === null)).toBe(true);
  });

  it("assigns saved one-time positions without planning year to their payout year", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    const legacyOncePosition = {
      ...state.positions[0],
      id: "legacy-once-expense",
      flow: "expense" as const,
      type: "temporary" as const,
      payoutType: "once" as const,
      payoutYear: 2033,
      payoutMonth: 6,
      startMonth: 1,
      endMonth: 12
    };
    delete legacyOncePosition.planningYear;

    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        positions: [legacyOncePosition],
        planningAccounts: state.planningAccounts.map((account) => ({
          ...account,
          yearlyRows: [legacyOncePosition]
        }))
      })
    );

    const loaded = loadState(storage);

    expect(loaded.positions[0]?.planningYear).toBe(2033);
    expect(loaded.positions[0]?.startMonth).toBe(6);
    expect(loaded.positions[0]?.endMonth).toBe(6);
    expect(loaded.planningAccounts[0].yearlyRows[0]?.planningYear).toBe(2033);
  });

  it("migrates saved table view settings without label quick filters", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    const legacyState = {
      ...state,
      positionTableView: {
        ...state.positionTableView,
        expense: {
          filters: [{ id: "monthly", column: "payoutType", operator: "eq", value: "monthly" }],
          sort: { column: "amount", direction: "desc" }
        }
      }
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(legacyState));

    const loaded = loadState(storage);

    expect(loaded.positionTableView.expense.selectedLabels).toEqual([]);
  });

  it("persists position table filters, sorting, and label quick filters", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    state.positionTableView.expense = {
      filters: [{ id: "monthly", column: "payoutType", operator: "eq", value: "monthly" }],
      sort: { column: "amount", direction: "desc" },
      selectedLabels: ["car", "tax"]
    };

    saveState(state, storage);
    const loaded = loadState(storage);

    expect(loaded.positionTableView.expense).toEqual(state.positionTableView.expense);
  });

  it("migrates legacy positions into a default planning account", () => {
    const storage = new MemoryStorage();
    const legacyState = {
      ...defaultAppState(),
      planningAccounts: undefined
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(legacyState));

    const loaded = loadState(storage);

    expect(loaded.planningAccounts.length).toBeGreaterThan(0);
    expect(loaded.planningAccounts[0].yearlyRows.length).toBeGreaterThan(0);
    expect(loaded.positions).toEqual(loaded.planningAccounts[0].yearlyRows);
  });

  it("loads cost breakdown totals for one-time income and expense positions", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    const base = state.positions[0];
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        planningAccounts: undefined,
        positions: [
          {
            ...base,
            id: "expense-once-details",
            flow: "expense",
            type: "temporary",
            payoutType: "once",
            amount: 1,
            costBreakdown: [
              { id: "rent", name: "Miete", amount: 500 },
              { id: "food", name: "Lebensmittel", amount: 150 }
            ]
          },
          {
            ...base,
            id: "income-once-details",
            flow: "income",
            type: "incomeTemporary",
            payoutType: "once",
            amount: 1,
            costBreakdown: [
              { id: "bonus", name: "Bonus", amount: 900 },
              { id: "refund", name: "Rueckerstattung", amount: 100 }
            ]
          }
        ]
      })
    );

    const loaded = loadState(storage);

    expect(loaded.positions.find((position) => position.id === "expense-once-details")?.amount).toBe(650);
    expect(loaded.positions.find((position) => position.id === "expense-once-details")?.costBreakdown).toHaveLength(2);
    expect(loaded.positions.find((position) => position.id === "income-once-details")?.amount).toBe(1000);
    expect(loaded.positions.find((position) => position.id === "income-once-details")?.costBreakdown).toHaveLength(2);
  });

  it("migrates legacy global investment settings into account-specific settings", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    const firstAccount = state.planningAccounts[0];
    const secondAccount = {
      id: "konto-2",
      name: "Konto 2",
      type: "mixed" as const,
      yearlyRows: []
    };
    const legacyState = {
      ...state,
      planningAccounts: [firstAccount, secondAccount],
      ui: {
        ...state.ui,
        selectedPlanningAccountId: firstAccount.id,
        selectedInvestmentAccountId: firstAccount.id
      },
      investmentByAccountId: undefined,
      investment: {
        ...state.investment,
        includedIds: ["legacy-investment-id"],
        retirementIncludedIds: ["legacy-retirement-id"],
        childIncludedIds: ["legacy-child-id"]
      }
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(legacyState));

    const loaded = loadState(storage);

    expect(loaded.investmentByAccountId[firstAccount.id].includedIds).toEqual(["legacy-investment-id"]);
    expect(loaded.investmentByAccountId[firstAccount.id].retirementIncludedIds).toEqual(["legacy-retirement-id"]);
    expect(loaded.investmentByAccountId[firstAccount.id].childIncludedIds).toEqual(["legacy-child-id"]);
    expect(loaded.investmentByAccountId[secondAccount.id].includedIds).toEqual([]);
    expect(loaded.investmentByAccountId[secondAccount.id].retirementIncludedIds).toEqual([]);
    expect(loaded.investmentByAccountId[secondAccount.id].childIncludedIds).toEqual([]);
  });

  it("normalizes invalid account selectors in ui state", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    const onlyAccountId = state.planningAccounts[0].id;
    const invalidUiState = {
      ...state,
      ui: {
        ...state.ui,
        selectedPlanningAccountId: "missing-planning-account",
        selectedInvestmentAccountId: "missing-investment-account",
        selectedRealEstateAccountIds: ["missing-real-estate-account", onlyAccountId],
        selectedRealEstateWithdrawalGainAccountIds: ["missing-withdrawal-account"],
        selectedCombinedAccountIds: ["missing-combined-account"],
        selectedCombinedLeadInvestmentAccountId: "missing-combined-lead"
      }
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(invalidUiState));

    const loaded = loadState(storage);

    expect(loaded.ui.selectedPlanningAccountId).toBe(onlyAccountId);
    expect(loaded.ui.selectedInvestmentAccountId).toBe(onlyAccountId);
    expect(loaded.ui.selectedRealEstateAccountIds).toEqual([onlyAccountId]);
    expect(loaded.ui.selectedRealEstateWithdrawalGainAccountIds).toEqual([onlyAccountId]);
    expect(loaded.ui.selectedCombinedAccountIds).toEqual([]);
    expect(loaded.ui.selectedCombinedLeadInvestmentAccountId).toBe(onlyAccountId);
  });

  it("keeps real estate source and withdrawal account selections synchronized", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    const migratedStateWithoutNewField = {
      ...state,
      realEstate: {
        ...state.realEstate,
        includeWithdrawalGainAsPaymentSource: true
      },
      ui: {
        activeSection: state.ui.activeSection,
        selectedPlanningAccountId: state.ui.selectedPlanningAccountId,
        selectedInvestmentAccountId: state.ui.selectedInvestmentAccountId,
        selectedRealEstateAccountIds: state.ui.selectedRealEstateAccountIds,
        settingsGrunddatenExpanded: state.ui.settingsGrunddatenExpanded
      }
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(migratedStateWithoutNewField));

    const loaded = loadState(storage);

    expect(loaded.realEstate.includeWithdrawalGainAsPaymentSource).toBe(true);
    expect(loaded.ui.selectedRealEstateWithdrawalGainAccountIds).toEqual(loaded.ui.selectedRealEstateAccountIds);
    expect(loaded.ui.selectedCombinedAccountIds).toEqual(state.planningAccounts.map((account) => account.id));
    expect(loaded.ui.selectedCombinedLeadInvestmentAccountId).toBe(loaded.ui.selectedInvestmentAccountId);
  });

  it("does not activate real estate purchase when saved states miss the activation flag", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    const legacyRealEstate = { ...state.realEstate };
    delete (legacyRealEstate as Partial<typeof legacyRealEstate>).purchaseActivated;
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        realEstate: legacyRealEstate
      })
    );

    const loaded = loadState(storage);

    expect(loaded.realEstate.purchaseActivated).toBe(false);
  });

  it("activates saved custom real estate scenarios when the combined module is enabled", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        realEstate: {
          ...state.realEstate,
          purchaseActivated: false,
          purchasePrice: state.realEstate.purchasePrice + 50000
        },
        combinedWealth: {
          ...state.combinedWealth,
          includeRealEstateFinancing: true
        }
      })
    );

    const loaded = loadState(storage);

    expect(loaded.realEstate.purchaseActivated).toBe(true);
  });

  it("uses the new combined module defaults when saved values are missing", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        combinedWealth: {}
      })
    );

    const loaded = loadState(storage);

    expect(loaded.combinedWealth.includeCashPositions).toBe(true);
    expect(loaded.combinedWealth.includeCostReserveAccounts).toBe(false);
    expect(loaded.combinedWealth.includeAnnualTableAccounts).toBe(false);
    expect(loaded.combinedWealth.includeDepotDevelopment).toBe(true);
    expect(loaded.combinedWealth.includeSharedDepotDevelopment).toBe(false);
    expect(loaded.combinedWealth.includeWithdrawals).toBe(false);
    expect(loaded.combinedWealth.includeRealEstateFinancing).toBe(false);
    expect(loaded.combinedWealth.includeRealEstateValueTrend).toBe(false);
    expect(loaded.combinedWealth.cashPositionIds).toEqual([]);
  });

  it("keeps only free selected cash positions from the selected cash account", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    const freePosition = {
      ...state.planningAccounts[0].yearlyRows.find((position) => position.id === "investitionsrate")!,
      id: "cash-free",
      name: "Cash frei"
    };
    const blockedInvestmentPosition = {
      ...freePosition,
      id: "cash-investment-blocked",
      name: "Cash Investment belegt"
    };
    const blockedRealEstatePosition = {
      ...freePosition,
      id: "cash-real-estate-blocked",
      name: "Cash Immobilie belegt"
    };
    const deletedPositionId = "cash-deleted";
    const positions = [
      ...state.planningAccounts[0].yearlyRows,
      freePosition,
      blockedInvestmentPosition,
      blockedRealEstatePosition
    ];
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        planningAccounts: [
          {
            ...state.planningAccounts[0],
            yearlyRows: positions
          }
        ],
        investment: {
          ...state.investment,
          includedIds: [blockedInvestmentPosition.id]
        },
        investmentByAccountId: {
          [state.planningAccounts[0].id]: {
            ...state.investment,
            includedIds: [blockedInvestmentPosition.id]
          }
        },
        realEstate: {
          ...state.realEstate,
          monthlyPaymentSourceIds: [blockedRealEstatePosition.id]
        },
        combinedWealth: {
          ...state.combinedWealth,
          cashPositionIds: [
            freePosition.id,
            blockedInvestmentPosition.id,
            blockedRealEstatePosition.id,
            deletedPositionId
          ]
        }
      })
    );

    const loaded = loadState(storage);

    expect(loaded.combinedWealth.cashPositionIds).toEqual([freePosition.id]);
  });

  it("uses default statutory pension settings when saved values are missing", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    const legacyState = { ...state };
    delete (legacyState as Partial<typeof state>).statutoryPension;
    storage.setItem(STORAGE_KEY, JSON.stringify(legacyState));

    const loaded = loadState(storage);

    expect(loaded.statutoryPension.contributionRatePercent).toBe(18.6);
    expect(loaded.statutoryPension.averageAnnualIncome).toBe(51944);
    expect(loaded.statutoryPension.scenarios.pessimistic.incomeMode).toBe("constant");
    expect(loaded.statutoryPension.scenarios.pessimistic.taxRatePercent).toBe(12.52);
    expect(loaded.statutoryPension.scenarios.pessimistic.healthInsurancePercent).toBe(13.75);
    expect(loaded.statutoryPension.scenarios.pessimistic.careInsurancePercent).toBe(9.2);
    expect(loaded.statutoryPension.scenarios.base.incomeMode).toBe("income_projection");
    expect(loaded.statutoryPension.scenarios.base.taxRatePercent).toBe(9.52);
    expect(loaded.statutoryPension.scenarios.base.healthInsurancePercent).toBe(10.75);
    expect(loaded.statutoryPension.scenarios.base.careInsurancePercent).toBe(6.2);
    expect(loaded.statutoryPension.scenarios.optimistic.retirementAge).toBe(72);
    expect(loaded.statutoryPension.scenarios.optimistic.taxRatePercent).toBe(7.52);
    expect(loaded.statutoryPension.scenarios.optimistic.healthInsurancePercent).toBe(8.75);
    expect(loaded.statutoryPension.scenarios.optimistic.careInsurancePercent).toBe(4.2);
  });

  it("adds new statutory pension deduction fallbacks to saved scenarios", () => {
    const storage = new MemoryStorage();
    const legacyState = defaultAppState();
    delete (legacyState.statutoryPension.scenarios.pessimistic as Partial<
      typeof legacyState.statutoryPension.scenarios.pessimistic
    >).taxRatePercent;
    delete (legacyState.statutoryPension.scenarios.pessimistic as Partial<
      typeof legacyState.statutoryPension.scenarios.pessimistic
    >).healthInsurancePercent;
    delete (legacyState.statutoryPension.scenarios.pessimistic as Partial<
      typeof legacyState.statutoryPension.scenarios.pessimistic
    >).careInsurancePercent;
    delete (legacyState.statutoryPension.scenarios.base as Partial<
      typeof legacyState.statutoryPension.scenarios.base
    >).taxRatePercent;
    delete (legacyState.statutoryPension.scenarios.base as Partial<
      typeof legacyState.statutoryPension.scenarios.base
    >).healthInsurancePercent;
    delete (legacyState.statutoryPension.scenarios.base as Partial<
      typeof legacyState.statutoryPension.scenarios.base
    >).careInsurancePercent;
    storage.setItem(STORAGE_KEY, JSON.stringify(legacyState));

    const loaded = loadState(storage);

    expect(loaded.statutoryPension.scenarios.pessimistic.taxRatePercent).toBe(12.52);
    expect(loaded.statutoryPension.scenarios.pessimistic.healthInsurancePercent).toBe(13.75);
    expect(loaded.statutoryPension.scenarios.pessimistic.careInsurancePercent).toBe(9.2);
    expect(loaded.statutoryPension.scenarios.base.taxRatePercent).toBe(9.52);
    expect(loaded.statutoryPension.scenarios.base.healthInsurancePercent).toBe(10.75);
    expect(loaded.statutoryPension.scenarios.base.careInsurancePercent).toBe(6.2);
    expect(loaded.statutoryPension.scenarios.optimistic.taxRatePercent).toBe(7.52);
  });

  it("prefills statutory pension deductions from defaults when saved social deductions are empty", () => {
    const storage = new MemoryStorage();
    const legacyState = defaultAppState();
    legacyState.statutoryPension.scenarios.optimistic = {
      ...legacyState.statutoryPension.scenarios.optimistic,
      taxRatePercent: 6,
      healthInsurancePercent: 0,
      careInsurancePercent: 0
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(legacyState));

    const loaded = loadState(storage);

    expect(loaded.statutoryPension.scenarios.optimistic.taxRatePercent).toBe(7.52);
    expect(loaded.statutoryPension.scenarios.optimistic.healthInsurancePercent).toBe(8.75);
    expect(loaded.statutoryPension.scenarios.optimistic.careInsurancePercent).toBe(4.2);
  });

  it("persists statutory pension scenario settings", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    state.statutoryPension.contributionRatePercent = 19;
    state.statutoryPension.scenarios.base = {
      retirementAge: 70,
      incomeMode: "constant",
      annualPensionIncreasePercent: 1.5,
      taxRatePercent: 18,
      healthInsurancePercent: 9,
      careInsurancePercent: 4
    };

    saveState(state, storage);
    const loaded = loadState(storage);

    expect(loaded.statutoryPension.contributionRatePercent).toBe(19);
    expect(loaded.statutoryPension.scenarios.base.retirementAge).toBe(70);
    expect(loaded.statutoryPension.scenarios.base.incomeMode).toBe("constant");
    expect(loaded.statutoryPension.scenarios.base.annualPensionIncreasePercent).toBe(1.5);
    expect(loaded.statutoryPension.scenarios.base.taxRatePercent).toBe(15);
    expect(loaded.statutoryPension.scenarios.base.healthInsurancePercent).toBe(9);
    expect(loaded.statutoryPension.scenarios.base.careInsurancePercent).toBe(4);
  });

  it("adds missing income yearly entry defaults to saved yearly entries", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        incomeTracker: {
          ...state.incomeTracker,
          settings: {
            ...state.incomeTracker.settings,
            selectedYearlyLabels: ["student_newspaper_delivery"]
          },
          yearlyEntries: [
            {
              id: "legacy-income",
              year: 2026,
              label: "student_newspaper_delivery",
              person: "household",
              annualNetIncome: null,
              annualGrossIncome: 50000,
              taxesAndDeductions: null,
              taxDeductionItems: {
                wageTax: 3000,
                solidaritySurcharge: null,
                churchTax: null,
                pensionInsurance: null,
                healthInsurance: null,
                careInsurance: null,
                unemploymentInsurance: null,
                employerPensionInsurance: null
              },
              employer: "",
              note: "",
              source: "annual_statement"
            }
          ]
        }
      })
    );

    const loaded = loadState(storage);

    expect(loaded.incomeTracker.yearlyEntries[0].active).toBe(true);
    expect(loaded.incomeTracker.yearlyEntries[0].visible).toBe(true);
    expect(loaded.incomeTracker.yearlyEntries[0].label).toBe("child_youth_jobs");
    expect(loaded.incomeTracker.settings.selectedYearlyLabels).toEqual(["child_youth_jobs"]);
    expect(loaded.incomeTracker.yearlyEntries[0].taxAdjustment).toEqual({ type: "refund", amount: null });
    expect(loaded.incomeTracker.yearlyEntries[0].capitalGainsAllowance).toBe(null);
    expect(loaded.incomeTracker.yearlyEntries[0].capitalGainsChurchTaxEnabled).toBe(false);
    expect(loaded.incomeTracker.yearlyEntries[0].capitalGainsChurchTaxRatePercent).toBe(9);
    expect(loaded.incomeTracker.yearlyEntries[0].taxDeductionItems.capitalGainsTax).toBe(null);
    expect(loaded.incomeTracker.yearlyEntries[0].taxDeductionItems.capitalGainsSolidaritySurcharge).toBe(null);
    expect(loaded.incomeTracker.yearlyEntries[0].taxDeductionItems.capitalGainsChurchTax).toBe(null);
    expect(loaded.incomeTracker.yearlyEntries[0].employmentContext).toBe("job_loss");
    expect(loaded.incomeTracker.yearlyEntries[0].minijobType).toBe("commercial");
    expect(loaded.incomeTracker.yearlyEntries[0].considerPensionInsurance).toBe(false);
    expect(loaded.incomeTracker.yearlyEntries[0].isRvExempt).toBe(false);
    expect(loaded.incomeTracker.yearlyEntries[0].studentEmploymentMode).toBe("minijob");
    expect(loaded.incomeTracker.yearlyEntries[0].requiresManualTaxReview).toBe(false);
  });

  it("normalizes online sales and insurance payout income label aliases", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        incomeTracker: {
          ...state.incomeTracker,
          settings: {
            ...state.incomeTracker.settings,
            selectedYearlyLabels: ["onlineverkauf", "versicherungsauszahlung"]
          },
          yearlyEntries: [
            {
              id: "online-sales",
              year: 2026,
              label: "onlineverkaeufe"
            },
            {
              id: "insurance-payouts",
              year: 2026,
              label: "versicherungsauszahlungen"
            }
          ]
        }
      })
    );

    const loaded = loadState(storage);

    expect(loaded.incomeTracker.settings.selectedYearlyLabels).toEqual(["online_sales", "insurance_payouts"]);
    expect(loaded.incomeTracker.yearlyEntries.map((entry) => entry.label)).toEqual([
      "online_sales",
      "insurance_payouts"
    ]);
  });

  it("loads saved capital gains tax fields", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        incomeTracker: {
          ...state.incomeTracker,
          yearlyEntries: [
            {
              id: "capital-income",
              active: true,
              visible: true,
              year: 2026,
              label: "dividends",
              person: "household",
              annualNetIncome: null,
              annualGrossIncome: 250,
              taxesAndDeductions: 52.75,
              taxDeductionItems: {
                wageTax: null,
                solidaritySurcharge: null,
                churchTax: null,
                capitalGainsTax: 50,
                capitalGainsSolidaritySurcharge: 2.75,
                capitalGainsChurchTax: 0,
                pensionInsurance: null,
                healthInsurance: null,
                careInsurance: null,
                unemploymentInsurance: null,
                employerPensionInsurance: null
              },
              taxAdjustment: { type: "refund", amount: null },
              capitalGainsAllowance: 50,
              capitalGainsChurchTaxEnabled: true,
              capitalGainsChurchTaxRatePercent: 8,
              employer: "",
              note: "",
              source: "annual_statement"
            }
          ]
        }
      })
    );

    const loaded = loadState(storage);

    expect(loaded.incomeTracker.yearlyEntries[0].capitalGainsAllowance).toBe(50);
    expect(loaded.incomeTracker.yearlyEntries[0].capitalGainsChurchTaxEnabled).toBe(true);
    expect(loaded.incomeTracker.yearlyEntries[0].capitalGainsChurchTaxRatePercent).toBe(8);
    expect(loaded.incomeTracker.yearlyEntries[0].taxDeductionItems.capitalGainsTax).toBe(50);
    expect(loaded.incomeTracker.yearlyEntries[0].taxDeductionItems.capitalGainsSolidaritySurcharge).toBe(2.75);
    expect(loaded.incomeTracker.yearlyEntries[0].taxDeductionItems.capitalGainsChurchTax).toBe(0);
  });
});
