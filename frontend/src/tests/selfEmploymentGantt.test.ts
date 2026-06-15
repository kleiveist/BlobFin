import { describe, expect, it } from "vitest";

import { defaultAppState } from "../data/defaults";
import {
  buildSelfEmploymentProjectGantt,
  normalizeSelfEmploymentGanttPlan,
  orderedGanttLabels,
  visibleSelfEmploymentGanttRows
} from "../domain/selfEmploymentGantt";
import { normalizeBusinessIdeaCanvasMeta, parseBusinessIdeaCanvasFile } from "../domain/businessIdeaCanvas";
import type { SelfEmploymentProject } from "../types";

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

    expect(gantt.cardPlans).toEqual([{ cardId: "a", timeBudgetHours: 4, startDate: null, note: "" }]);
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
});

function projectWithCanvas(input: {
  nodes: Array<{ id: string; type: "text"; text: string; x: number; y: number; width: number; height: number }>;
  nodeMeta: Record<string, { labelId: string; phaseId: string; shape: "rounded-rectangle" }>;
  cardPlans: Array<{ cardId: string; timeBudgetHours: number; startDate: string | null; note: string }>;
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
