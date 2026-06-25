import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { defaultAppState } from "../data/defaults";
import {
  buildSelfEmploymentProjectWorkPlan,
  buildSelfEmploymentProjectGantt,
  normalizeSelfEmploymentGanttPlan,
  orderedGanttLabels,
  visibleSelfEmploymentGanttRows
} from "../domain/selfEmploymentGantt";
import { buildIncomePlanningModel } from "../domain/incomePlanning";
import { normalizeBusinessIdeaCanvasMeta, parseBusinessIdeaCanvasFile } from "../domain/businessIdeaCanvas";
import { renderSelfEmploymentProjectGantt, selfEmploymentGanttLabelIsCondensed } from "../features/self-employment/ganttController";
import { selfEmploymentUiState } from "../features/self-employment/uiState";
import type { SelfEmploymentProject } from "../types";

const selfEmploymentStylesSource = readFileSync(new URL("../features/self-employment/styles.css", import.meta.url), "utf8");

afterEach(() => {
  selfEmploymentUiState.ganttEditor = null;
});

describe("self employment project gantt", () => {
  it("normalizes canonical labels with legacy active mapped to goal", () => {
    const canvas = parseBusinessIdeaCanvasFile({
      nodes: [{ id: "a", type: "text", text: "A", x: 0, y: 0, width: 100, height: 80 }],
      edges: []
    });
    const meta = normalizeBusinessIdeaCanvasMeta(
      {
        labels: [{ id: "active", name: "Aktiv", color: "5" }],
        nodeMeta: {
          a: { labelId: "active", phaseId: "phase-1", shape: "rounded-rectangle" }
        }
      },
      canvas
    );

    expect(orderedGanttLabels(meta).map((label) => label.name)).toEqual(["Idee", "Wissen", "Start", "Umsetzung", "Ziel"]);
    expect(meta.nodeMeta.a.labelId).toBe("goal");
  });

  it("creates default one-hour card plans and ignores groups", () => {
    const canvas = parseBusinessIdeaCanvasFile({
      nodes: [
        { id: "a", type: "text", text: "A", x: 0, y: 0, width: 100, height: 80 },
        { id: "b", type: "text", text: "B", x: 140, y: 0, width: 100, height: 80 },
        { id: "group", type: "group", label: "Gruppe", x: -20, y: -20, width: 300, height: 160 }
      ],
      edges: []
    });
    const meta = normalizeBusinessIdeaCanvasMeta({}, canvas);

    const gantt = normalizeSelfEmploymentGanttPlan({}, canvas, meta);

    expect(gantt.cardPlans.map((plan) => [plan.cardId, plan.timeBudgetHours])).toEqual([
      ["a", 1],
      ["b", 1]
    ]);
  });

  it("sums label and phase hours from card budgets", () => {
    const project = projectWithCanvas({
      nodes: [
        { id: "idea", type: "text", text: "Idee", x: 0, y: 0, width: 100, height: 80 },
        { id: "knowledge", type: "text", text: "Wissen", x: 140, y: 0, width: 100, height: 80 },
        { id: "goal", type: "text", text: "Ziel", x: 280, y: 0, width: 100, height: 80 }
      ],
      nodeMeta: {
        idea: { labelId: "idea", phaseId: "phase-1", shape: "rounded-rectangle" },
        knowledge: { labelId: "knowledge", phaseId: "phase-1", shape: "rounded-rectangle" },
        goal: { labelId: "goal", phaseId: "phase-2", shape: "rounded-rectangle" }
      },
      cardPlans: [
        { cardId: "idea", timeBudgetHours: 2, startDate: null, note: "" },
        { cardId: "knowledge", timeBudgetHours: 3, startDate: null, note: "" },
        { cardId: "goal", timeBudgetHours: 5, startDate: null, note: "" }
      ]
    });

    const summary = buildSelfEmploymentProjectGantt(project);
    const phaseOne = summary.rows.find((row) => row.phaseId === "phase-1");
    const phaseTwo = summary.rows.find((row) => row.phaseId === "phase-2");

    expect(summary.totalCardHours).toBe(10);
    expect(phaseOne?.cardHours).toBe(5);
    expect(phaseOne?.labels.find((label) => label.labelId === "idea")?.totalHours).toBe(2);
    expect(phaseOne?.labels.find((label) => label.labelId === "knowledge")?.totalHours).toBe(3);
    expect(phaseTwo?.cardHours).toBe(5);
  });

  it("calculates percentage widths and dependent phase offsets", () => {
    const project = projectWithCanvas({
      nodes: [
        { id: "a", type: "text", text: "A", x: 0, y: 0, width: 100, height: 80 },
        { id: "b", type: "text", text: "B", x: 140, y: 0, width: 100, height: 80 },
        { id: "c", type: "text", text: "C", x: 280, y: 0, width: 100, height: 80 },
        { id: "d", type: "text", text: "D", x: 420, y: 0, width: 100, height: 80 }
      ],
      nodeMeta: {
        a: { labelId: "idea", phaseId: "phase-1", shape: "rounded-rectangle" },
        b: { labelId: "knowledge", phaseId: "phase-1", shape: "rounded-rectangle" },
        c: { labelId: "start", phaseId: "phase-1", shape: "rounded-rectangle" },
        d: { labelId: "goal", phaseId: "phase-2", shape: "rounded-rectangle" }
      },
      cardPlans: [
        { cardId: "a", timeBudgetHours: 2, startDate: null, note: "" },
        { cardId: "b", timeBudgetHours: 3, startDate: null, note: "" },
        { cardId: "c", timeBudgetHours: 5, startDate: null, note: "" },
        { cardId: "d", timeBudgetHours: 5, startDate: null, note: "" }
      ],
      phaseOverrides: [
        {
          phaseId: "phase-2",
          enabled: true,
          startDate: null,
          startMode: "after_previous_label",
          triggerPreviousPhaseId: "phase-1",
          triggerLabelId: "start",
          defaultTimeBudgetHours: 1
        }
      ]
    });

    const summary = buildSelfEmploymentProjectGantt(project);
    const phaseOne = summary.rows.find((row) => row.phaseId === "phase-1");
    const phaseTwo = summary.rows.find((row) => row.phaseId === "phase-2");

    expect(phaseOne?.startHour).toBe(0);
    expect(phaseOne?.widthPercent).toBeCloseTo(100);
    expect(phaseTwo?.startHour).toBe(5);
    expect(phaseTwo?.widthPercent).toBeCloseTo(50);
  });

  it("compacts filtered visible phases into a local timeline", () => {
    const project = projectWithCanvas({
      nodes: [
        { id: "p1", type: "text", text: "Phase 1", x: 0, y: 0, width: 100, height: 80 },
        { id: "p2", type: "text", text: "Phase 2", x: 140, y: 0, width: 100, height: 80 },
        { id: "p3", type: "text", text: "Phase 3", x: 280, y: 0, width: 100, height: 80 }
      ],
      nodeMeta: {
        p1: { labelId: "idea", phaseId: "phase-1", shape: "rounded-rectangle" },
        p2: { labelId: "idea", phaseId: "phase-2", shape: "rounded-rectangle" },
        p3: { labelId: "idea", phaseId: "phase-3", shape: "rounded-rectangle" }
      },
      cardPlans: [
        { cardId: "p1", timeBudgetHours: 2, startDate: null, note: "" },
        { cardId: "p2", timeBudgetHours: 3, startDate: null, note: "" },
        { cardId: "p3", timeBudgetHours: 5, startDate: null, note: "" }
      ]
    });

    const summary = buildSelfEmploymentProjectGantt(project);
    const unfilteredRows = visibleSelfEmploymentGanttRows(summary, []);
    const phaseTwoOnlyRows = visibleSelfEmploymentGanttRows(summary, ["phase-2"]);
    const phaseTwoAndThreeRows = visibleSelfEmploymentGanttRows(summary, ["phase-2", "phase-3"]);

    expect(unfilteredRows).toBe(summary.rows);
    expect(summary.projectSpanHours).toBe(10);
    expect(phaseTwoOnlyRows).toHaveLength(1);
    expect(phaseTwoOnlyRows[0].phaseId).toBe("phase-2");
    expect(phaseTwoOnlyRows[0].startPercent).toBe(0);
    expect(phaseTwoOnlyRows[0].widthPercent).toBe(100);
    expect(phaseTwoOnlyRows[0].labels.find((label) => label.labelId === "idea")?.startPercent).toBe(0);
    expect(phaseTwoOnlyRows[0].labels.find((label) => label.labelId === "idea")?.widthPercent).toBe(100);
    expect(phaseTwoAndThreeRows.map((row) => row.phaseId)).toEqual(["phase-2", "phase-3"]);
    expect(phaseTwoAndThreeRows[0].startPercent).toBe(0);
    expect(phaseTwoAndThreeRows[0].widthPercent).toBeCloseTo(37.5);
    expect(phaseTwoAndThreeRows[1].startPercent).toBeCloseTo(37.5);
    expect(phaseTwoAndThreeRows[1].widthPercent).toBeCloseTo(62.5);
  });

  it("keeps five readable gantt cards expanded", () => {
    const project = projectWithCanvas({
      nodes: Array.from({ length: 5 }, (_, index) => ({
        id: `card-${index + 1}`,
        type: "text" as const,
        text: `Karte ${index + 1}`,
        x: index * 120,
        y: 0,
        width: 100,
        height: 80
      })),
      nodeMeta: Object.fromEntries(
        Array.from({ length: 5 }, (_, index) => [
          `card-${index + 1}`,
          { labelId: "idea", phaseId: "phase-1", shape: "rounded-rectangle" as const }
        ])
      ),
      cardPlans: Array.from({ length: 5 }, (_, index) => ({
        cardId: `card-${index + 1}`,
        timeBudgetHours: 1,
        completed: index === 0
      }))
    });

    const html = renderSelfEmploymentProjectGantt(project);

    expect(html).not.toContain("self-employment-project-gantt-label condensed");
    expect(html).toContain('class="self-employment-project-gantt-card completed"');
    expect(html).toContain("--self-employment-gantt-card-progress-percent: 100%;");
    expect(html).toContain('data-self-employment-gantt-card-id="card-5"');
    expect(html).toContain("Karte 5");
  });

  it("renders unreadably narrow gantt cards as clickable label surfaces", () => {
    const project = projectWithCanvas({
      nodes: [
        { id: "large-card", type: "text", text: "Grosse Karte", x: 0, y: 0, width: 100, height: 80 },
        { id: "small-card-a", type: "text", text: "Klein A", x: 120, y: 0, width: 100, height: 80 },
        { id: "small-card-b", type: "text", text: "Klein B", x: 240, y: 0, width: 100, height: 80 }
      ],
      nodeMeta: {
        "large-card": { labelId: "idea", phaseId: "phase-1", shape: "rounded-rectangle" },
        "small-card-a": { labelId: "idea", phaseId: "phase-1", shape: "rounded-rectangle" },
        "small-card-b": { labelId: "idea", phaseId: "phase-1", shape: "rounded-rectangle" }
      },
      cardPlans: [
        { cardId: "large-card", timeBudgetHours: 94, completed: true },
        { cardId: "small-card-a", timeBudgetHours: 3 },
        { cardId: "small-card-b", timeBudgetHours: 3 }
      ]
    });

    const html = renderSelfEmploymentProjectGantt(project);

    expect(html).toContain("self-employment-project-gantt-label condensed");
    expect(html).toContain("--self-employment-gantt-progress-percent: 94%;");
    expect(html).toContain('data-action="self-employment-gantt-open-label"');
    expect(html).toContain("Idee · 100 h");
    expect(html).toContain("94 % erledigt");
  });

  it("uses muted light-theme completed colors and keeps dark-theme success contrast", () => {
    expect(selfEmploymentStylesSource).toContain("--self-employment-gantt-progress-color: #8fa39a");
    expect(selfEmploymentStylesSource).toContain("border-left-color: #6f877c");
    expect(selfEmploymentStylesSource).toContain(':root[data-theme="dark"] .self-employment-project-gantt-card.completed');
    expect(selfEmploymentStylesSource).toContain("border-left-color: #22c55e");
  });

  it("uses the same visible-width condensation rule for labels at the start and end", () => {
    const startLabel = fakeGanttLabelSegment({ startPercent: 0, widthPercent: 6 });
    const endLabel = fakeGanttLabelSegment({ startPercent: 94, widthPercent: 6 });

    expect(selfEmploymentGanttLabelIsCondensed(startLabel)).toBe(false);
    expect(selfEmploymentGanttLabelIsCondensed(endLabel)).toBe(false);
  });

  it("condenses end labels when only their clipped visible width is unreadable", () => {
    const clippedEndLabel = fakeGanttLabelSegment({ startPercent: 98, widthPercent: 8 });

    expect(selfEmploymentGanttLabelIsCondensed(clippedEndLabel)).toBe(true);
  });

  it("renders a dense label detail popup with clickable card rows", () => {
    const project = projectWithCanvas({
      nodes: [
        { id: "card-a", type: "text", text: "Erste Karte", x: 0, y: 0, width: 100, height: 80 },
        { id: "card-b", type: "text", text: "Zweite Karte", x: 120, y: 0, width: 100, height: 80 }
      ],
      nodeMeta: {
        "card-a": { labelId: "idea", phaseId: "phase-1", shape: "rounded-rectangle" },
        "card-b": { labelId: "idea", phaseId: "phase-1", shape: "rounded-rectangle" }
      },
      cardPlans: [
        { cardId: "card-a", timeBudgetHours: 2 },
        { cardId: "card-b", timeBudgetHours: 3 }
      ]
    });
    selfEmploymentUiState.ganttEditor = { projectId: project.id, type: "label", phaseId: "phase-1", labelId: "idea", top: 10, left: 20 };

    const html = renderSelfEmploymentProjectGantt(project);

    expect(html).toContain("self-employment-gantt-label-popover");
    expect(html).toContain("Erste Karte");
    expect(html).toContain("2 h");
    expect(html).toContain("0 h - 2 h");
    expect(html).toContain('data-action="self-employment-gantt-open-card"');
    expect(html).toContain('data-self-employment-gantt-phase-id="phase-1"');
    expect(html).toContain('data-self-employment-gantt-label-id="idea"');
  });

  it("renders card popovers with a stable switch back to the label popup", () => {
    const project = projectWithCanvas({
      nodes: [{ id: "card-a", type: "text", text: "Erste Karte", x: 0, y: 0, width: 100, height: 80 }],
      nodeMeta: {
        "card-a": { labelId: "idea", phaseId: "phase-1", shape: "rounded-rectangle" }
      },
      cardPlans: [{ cardId: "card-a", timeBudgetHours: 2 }]
    });
    selfEmploymentUiState.ganttEditor = {
      projectId: project.id,
      type: "card",
      cardId: "card-a",
      phaseId: "phase-1",
      labelId: "idea",
      top: 10,
      left: 20
    };

    const html = renderSelfEmploymentProjectGantt(project);

    expect(html).toContain("self-employment-gantt-card-popover");
    expect(html).toContain('style="left:20px;top:10px;"');
    expect(html).toContain('data-action="self-employment-gantt-open-label"');
    expect(html).toContain('data-self-employment-gantt-phase-id="phase-1"');
    expect(html).toContain('data-self-employment-gantt-label-id="idea"');
  });

  it("prunes stale card plans during normalization", () => {
    const canvas = parseBusinessIdeaCanvasFile({
      nodes: [
        { id: "a", type: "text", text: "A", x: 0, y: 0, width: 100, height: 80 },
        { id: "group", type: "group", label: "Gruppe", x: -20, y: -20, width: 300, height: 160 }
      ],
      edges: []
    });
    const meta = normalizeBusinessIdeaCanvasMeta({}, canvas);

    const gantt = normalizeSelfEmploymentGanttPlan(
      {
        cardPlans: [
          { cardId: "a", timeBudgetHours: 4, startDate: null, note: "" },
          { cardId: "missing", timeBudgetHours: 9, startDate: null, note: "" },
          { cardId: "group", timeBudgetHours: 9, startDate: null, note: "" }
        ]
      },
      canvas,
      meta
    );

    expect(gantt.cardPlans).toEqual([
      {
        cardId: "a",
        timeBudgetHours: 4,
        completed: false,
        todos: [{ id: "todo-a-1", title: "A", eisenhowerQuadrant: "important_not_urgent", status: "planned", completed: false }]
      }
    ]);
  });

  it("migrates legacy notes to todos and derives card completion", () => {
    const canvas = parseBusinessIdeaCanvasFile({
      nodes: [{ id: "a", type: "text", text: "A", x: 0, y: 0, width: 100, height: 80 }],
      edges: []
    });
    const meta = normalizeBusinessIdeaCanvasMeta({}, canvas);

    const gantt = normalizeSelfEmploymentGanttPlan(
      {
        phases: [{ phaseId: "phase-1", startDate: "2026-07-01", defaultTimeBudgetHours: 8 }],
        cardPlans: [{ cardId: "a", timeBudgetHours: 4, startDate: "2026-07-02", note: "Legacy Notiz", completed: true }]
      },
      canvas,
      meta
    );

    expect(gantt.phases[0]).not.toHaveProperty("startDate");
    expect(gantt.phases[0]).not.toHaveProperty("defaultTimeBudgetHours");
    expect(gantt.cardPlans[0]).toMatchObject({
      cardId: "a",
      completed: true,
      todos: [{ title: "Legacy Notiz", eisenhowerQuadrant: "important_not_urgent", status: "done", completed: true }]
    });
  });

  it("normalizes todo status, Eisenhower quadrant, and legacy priorities", () => {
    const canvas = parseBusinessIdeaCanvasFile({
      nodes: [{ id: "a", type: "text", text: "A", x: 0, y: 0, width: 100, height: 80 }],
      edges: []
    });
    const meta = normalizeBusinessIdeaCanvasMeta({}, canvas);

    const gantt = normalizeSelfEmploymentGanttPlan(
      {
        cardPlans: [
          {
            cardId: "a",
            timeBudgetHours: 4,
            todos: [
              { id: "legacy-done", title: "Legacy erledigt", priority: "high", completed: true },
              { id: "status-done", title: "Status erledigt", priority: "medium", status: "done", completed: false },
              { id: "status-progress", title: "In Arbeit", priority: "low", status: "in_progress", completed: true },
              {
                id: "quadrant-direct",
                title: "Delegieren",
                eisenhowerQuadrant: "not_important_urgent",
                status: "planned",
                completed: false
              }
            ]
          }
        ]
      },
      canvas,
      meta
    );

    expect(gantt.cardPlans[0]).toMatchObject({
      completed: false,
      todos: [
        { id: "legacy-done", eisenhowerQuadrant: "important_urgent", status: "done", completed: true },
        { id: "status-done", eisenhowerQuadrant: "important_not_urgent", status: "done", completed: true },
        { id: "status-progress", eisenhowerQuadrant: "not_important_not_urgent", status: "in_progress", completed: false },
        { id: "quadrant-direct", eisenhowerQuadrant: "not_important_urgent", status: "planned", completed: false }
      ]
    });
  });

  it("falls back to active/default phase and label for cards without metadata", () => {
    const base = defaultAppState().selfEmployment.projects[0];
    const canvas = parseBusinessIdeaCanvasFile({
      nodes: [{ id: "a", type: "text", text: "A", x: 0, y: 0, width: 100, height: 80 }],
      edges: []
    });
    const project: SelfEmploymentProject = {
      ...base,
      businessIdeaCanvas: canvas,
      businessIdeaCanvasMeta: {
        ...base.businessIdeaCanvasMeta,
        activeLabelId: "idea",
        activePhaseId: "phase-1",
        nodeMeta: {}
      },
      gantt: normalizeSelfEmploymentGanttPlan({}, canvas, {
        ...base.businessIdeaCanvasMeta,
        activeLabelId: "idea",
        activePhaseId: "phase-1",
        nodeMeta: {}
      })
    };

    const summary = buildSelfEmploymentProjectGantt(project);

    expect(summary.rows.find((row) => row.phaseId === "phase-1")?.cardHours).toBe(1);
    expect(summary.rows.find((row) => row.phaseId === "phase-1")?.labels.find((label) => label.labelId === "idea")?.totalHours).toBe(1);
  });

  it("builds a project work plan from selected weekly work and habit sources", () => {
    const state = defaultAppState();
    const project = projectWithCanvas({
      nodes: [{ id: "a", type: "text", text: "Umsetzungskarte", x: 0, y: 0, width: 100, height: 80 }],
      nodeMeta: {
        a: { labelId: "implementation", phaseId: "phase-1", shape: "rounded-rectangle" }
      },
      cardPlans: [
        {
          cardId: "a",
          timeBudgetHours: 4,
          completed: false,
          todos: [
            { id: "todo-done", title: "Erledigt", eisenhowerQuadrant: "not_important_not_urgent", status: "done", completed: true },
            { id: "todo-open", title: "Offen", eisenhowerQuadrant: "important_urgent", status: "in_progress", completed: false }
          ]
        }
      ]
    });
    const incomePlanning = {
      ...state.incomePlanning,
      workBlocks: [
        {
          id: "project-work",
          active: true,
          category: "side_income" as const,
          name: "Projektzeit",
          description: "",
          color: "#123456",
          slots: [
            {
              id: "project-work-monday",
              day: "monday" as const,
              startTime: "10:00",
              endTime: "12:00",
              flexible: false,
              durationMinutes: 120
            },
            {
              id: "project-work-wednesday",
              day: "wednesday" as const,
              startTime: "10:00",
              endTime: "11:00",
              flexible: false,
              durationMinutes: 60
            }
          ]
        }
      ],
      habits: [],
      manualBlocks: []
    };
    const model = buildIncomePlanningModel(incomePlanning);
    const plan = buildSelfEmploymentProjectWorkPlan(
      { ...project, startDate: "2026-07-06", timeSources: [{ ownerType: "work", ownerId: "project-work" }] },
      model,
      new Date(2026, 6, 7)
    );

    expect(plan.availableHoursPerWeek).toBe(3);
    expect(plan.totalHours).toBe(4);
    expect(plan.completedHours).toBe(2);
    expect(plan.openHours).toBe(2);
    expect(plan.progressPercent).toBe(50);
    expect(plan.plannedProgressPercent).toBe(50);
    expect(plan.endDate).toBe("2026-07-06");
    expect(plan.tasks.find((task) => task.todoId === "todo-open")).toMatchObject({
      plannedDate: "2026-07-06",
      overdue: true,
      eisenhowerQuadrant: "important_urgent",
      eisenhowerMeaningLabel: "Muss sofort passieren",
      eisenhowerActionLabel: "Jetzt erledigen",
      status: "in_progress"
    });
    expect(plan.labelHours).toEqual([
      {
        labelId: "implementation",
        labelName: "Umsetzung",
        labelColor: "#b87514",
        totalHours: 4,
        completedHours: 2,
        openHours: 2
      }
    ]);
  });

  it("plans multi-week work without flagging weekly capacity as a bottleneck", () => {
    const state = defaultAppState();
    const project = projectWithCanvas({
      nodes: [{ id: "a", type: "text", text: "Umsetzungskarte", x: 0, y: 0, width: 100, height: 80 }],
      nodeMeta: {
        a: { labelId: "implementation", phaseId: "phase-1", shape: "rounded-rectangle" }
      },
      cardPlans: [
        {
          cardId: "a",
          timeBudgetHours: 8,
          completed: false,
          todos: [{ id: "todo-open", title: "Offen", eisenhowerQuadrant: "important_urgent", status: "planned", completed: false }]
        }
      ]
    });
    const incomePlanning = {
      ...state.incomePlanning,
      workBlocks: [
        {
          id: "project-work",
          active: true,
          category: "side_income" as const,
          name: "Projektzeit",
          description: "",
          color: "#123456",
          slots: [
            {
              id: "project-work-monday",
              day: "monday" as const,
              startTime: "10:00",
              endTime: "13:00",
              flexible: false,
              durationMinutes: 180
            }
          ]
        }
      ],
      habits: [],
      manualBlocks: []
    };
    const plan = buildSelfEmploymentProjectWorkPlan(
      { ...project, startDate: "2026-07-06", timeSources: [{ ownerType: "work", ownerId: "project-work" }] },
      buildIncomePlanningModel(incomePlanning),
      new Date(2026, 6, 6)
    );

    expect(plan.availableHoursPerWeek).toBe(3);
    expect(plan.openHours).toBe(8);
    expect(plan.endDate).toBe("2026-07-06");
    expect(plan.bottlenecks).not.toContain("Offene Projektzeit uebersteigt das aktuelle Wochenkontingent.");
  });

  it("uses annual week scenario assignments for project end dates", () => {
    const state = defaultAppState();
    const project = projectWithCanvas({
      nodes: [{ id: "a", type: "text", text: "Umsetzungskarte", x: 0, y: 0, width: 100, height: 80 }],
      nodeMeta: {
        a: { labelId: "implementation", phaseId: "phase-1", shape: "rounded-rectangle" }
      },
      cardPlans: [
        {
          cardId: "a",
          timeBudgetHours: 10,
          completed: false,
          todos: [
            { id: "todo-one", title: "Erster Block", eisenhowerQuadrant: "important_urgent", status: "planned", completed: false },
            { id: "todo-two", title: "Zweiter Block", eisenhowerQuadrant: "important_not_urgent", status: "planned", completed: false }
          ]
        }
      ]
    });
    const incomePlanning = {
      ...state.incomePlanning,
      weekScenarioAssignments: [
        { weekStartDate: "2026-03-02", scenarioId: "self_employed" },
        { weekStartDate: "2026-03-16", scenarioId: "self_employed" }
      ],
      workBlocks: [
        {
          id: "project-work",
          active: true,
          category: "side_income" as const,
          name: "Projektzeit",
          description: "",
          color: "#123456",
          slots: [
            {
              id: "project-work-monday",
              day: "monday" as const,
              startTime: "09:00",
              endTime: "17:00",
              flexible: false,
              durationMinutes: 480,
              scenarioIds: ["self_employed"]
            }
          ]
        }
      ],
      habits: [],
      manualBlocks: []
    };
    const plan = buildSelfEmploymentProjectWorkPlan(
      { ...project, startDate: "2026-03-02", timeSources: [{ ownerType: "work", ownerId: "project-work" }] },
      buildIncomePlanningModel(incomePlanning),
      new Date(2026, 2, 2),
      incomePlanning
    );

    expect(plan.availableHoursPerWeek).toBe(8);
    expect(plan.days.map((day) => day.date)).toEqual(["2026-03-02", "2026-03-16"]);
    expect(plan.endDate).toBe("2026-03-16");
  });
});

function fakeGanttLabelSegment(input: { startPercent: number; widthPercent: number }): Parameters<typeof selfEmploymentGanttLabelIsCondensed>[0] {
  return {
    labelId: "idea",
    labelName: "Idee",
    color: "1",
    totalHours: 6,
    startHour: 0,
    startPercent: input.startPercent,
    widthPercent: input.widthPercent,
    cards: [
      {
        cardId: "readable-card",
        title: "Lesbare Karte",
        timeBudgetHours: 6,
        widthPercent: 100,
        completed: false,
        todoCount: 1,
        completedTodoCount: 0,
        progressPercent: 0
      }
    ]
  };
}

function projectWithCanvas(input: {
  nodes: Array<{ id: string; type: "text"; text: string; x: number; y: number; width: number; height: number }>;
  nodeMeta: Record<string, { labelId: string; phaseId: string; shape: "rounded-rectangle" }>;
  cardPlans: Array<Record<string, unknown> & { cardId: string; timeBudgetHours: number }>;
  phaseOverrides?: Array<{
    phaseId: string;
    enabled: boolean;
    startDate: string | null;
    startMode: "manual" | "after_previous_label";
    triggerPreviousPhaseId: string | null;
    triggerLabelId: string | null;
    defaultTimeBudgetHours: number;
  }>;
}): SelfEmploymentProject {
  const base = defaultAppState().selfEmployment.projects[0];
  const canvas = parseBusinessIdeaCanvasFile({ nodes: input.nodes, edges: [] });
  const meta = normalizeBusinessIdeaCanvasMeta({ nodeMeta: input.nodeMeta }, canvas, base.businessIdeaCanvasMeta);
  const gantt = normalizeSelfEmploymentGanttPlan(
    {
      phases: input.phaseOverrides,
      cardPlans: input.cardPlans
    },
    canvas,
    meta
  );
  return {
    ...base,
    businessIdeaCanvas: canvas,
    businessIdeaCanvasMeta: meta,
    gantt
  };
}
