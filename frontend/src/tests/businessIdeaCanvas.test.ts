import { describe, expect, it } from "vitest";

import {
  businessIdeaCanvasBoundsForNodes,
  businessIdeaCanvasDirectionFromEdge,
  businessIdeaCanvasEndsForDirection,
  businessIdeaCanvasGanttRows,
  businessIdeaCanvasMoveDeltaForNodes,
  businessIdeaCanvasNodesInsideRect,
  businessIdeaCanvasPaletteRows,
  businessIdeaCanvasPaletteWithCustomColor,
  businessIdeaCanvasViewportForZoomAtPoint,
  createBusinessIdeaCanvasGroupMeta,
  createBusinessIdeaCanvasGroupNode,
  defaultBusinessIdeaCanvasForProject,
  nearestBusinessIdeaCanvasEndpointForEdge,
  normalizeBusinessIdeaCanvasMeta,
  parseBusinessIdeaCanvasFile,
  serializeBusinessIdeaCanvas
} from "../domain/businessIdeaCanvas";
import type { BusinessIdeaCanvas } from "../types";

describe("business idea canvas", () => {
  it("creates an Obsidian-compatible default canvas from legacy idea fields", () => {
    const defaults = defaultBusinessIdeaCanvasForProject("project-1", {
      idea: "Beratung",
      problem: "Zu wenig Struktur",
      targetGroup: "Solo-Selbststaendige",
      revenueModel: "Paketpreis"
    });

    expect(defaults.businessIdeaCanvasFile).toBe("planning/projects/project-1/canvas-geschaeftsidee.canvas");
    expect(defaults.businessIdeaCanvas.nodes).toHaveLength(4);
    expect(defaults.businessIdeaCanvas.edges).toHaveLength(3);
    expect(defaults.businessIdeaCanvas.nodes[0]).toMatchObject({ type: "text", text: "Beratung" });
    expect(defaults.businessIdeaCanvasMeta.labels.map((label) => label.name)).toEqual([
      "Idee",
      "Wissen",
      "Start",
      "Umsetzung",
      "Ziel"
    ]);
    expect(defaults.businessIdeaCanvasMeta.phases.map((phase) => phase.name)).toEqual([
      "Phase 1",
      "Phase 2",
      "Phase 3",
      "Phase 4",
      "Phase 5",
      "Phase 6",
      "Phase 7",
      "Phase 8",
      "Phase 9",
      "Phase 10"
    ]);
    expect(defaults.businessIdeaCanvasMeta.palette.length).toBeGreaterThan(0);
    expect(defaults.businessIdeaCanvasMeta.groupMeta).toEqual({});
  });

  it("serializes only JSON Canvas node and edge fields", () => {
    const canvas = {
      nodes: [
        {
          id: "node-1",
          type: "text",
          text: "Idee",
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          color: "1",
          phaseId: "phase-1"
        },
        {
          id: "group-1",
          type: "group",
          label: "Gruppe",
          x: -20,
          y: -20,
          width: 300,
          height: 200,
          color: "4",
          background: "asset.png",
          nodeIds: ["node-1"],
          status: "open"
        }
      ],
      edges: [
        {
          id: "edge-1",
          fromNode: "node-1",
          fromSide: "right",
          toNode: "node-1",
          toSide: "left",
          toEnd: "arrow",
          blobfinOnly: true
        }
      ]
    } as unknown as BusinessIdeaCanvas;

    const serialized = serializeBusinessIdeaCanvas(canvas);

    expect(JSON.stringify(serialized)).not.toContain("phaseId");
    expect(JSON.stringify(serialized)).not.toContain("blobfinOnly");
    expect(JSON.stringify(serialized)).not.toContain("nodeIds");
    expect(JSON.stringify(serialized)).not.toContain("status");
    expect(JSON.stringify(serialized)).not.toContain("background");
    expect(serialized.nodes[1]).toEqual({
      id: "group-1",
      type: "group",
      label: "Gruppe",
      x: -20,
      y: -20,
      width: 300,
      height: 200,
      color: "4"
    });
  });

  it("maps UI edge directions to JSON Canvas endpoint markers", () => {
    expect(businessIdeaCanvasEndsForDirection("none")).toEqual({ fromEnd: "none", toEnd: "none" });
    expect(businessIdeaCanvasEndsForDirection("forward")).toEqual({ fromEnd: "none", toEnd: "arrow" });
    expect(businessIdeaCanvasEndsForDirection("backward")).toEqual({ fromEnd: "arrow", toEnd: "none" });
    expect(businessIdeaCanvasEndsForDirection("both")).toEqual({ fromEnd: "arrow", toEnd: "arrow" });
    expect(businessIdeaCanvasDirectionFromEdge({ fromEnd: "arrow", toEnd: "none" })).toBe("backward");
  });

  it("maps a line branch point to the nearest real node endpoint", () => {
    const canvas = parseBusinessIdeaCanvasFile({
      nodes: [
        { id: "a", type: "text", text: "A", x: 0, y: 0, width: 100, height: 80 },
        { id: "b", type: "text", text: "B", x: 300, y: 0, width: 100, height: 80 }
      ],
      edges: [{ id: "e", fromNode: "a", fromSide: "right", toNode: "b", toSide: "left" }]
    });

    expect(nearestBusinessIdeaCanvasEndpointForEdge(canvas, canvas.edges[0], { x: 95, y: 40 })).toEqual({
      nodeId: "a",
      side: "right"
    });
    expect(nearestBusinessIdeaCanvasEndpointForEdge(canvas, canvas.edges[0], { x: 305, y: 40 })).toEqual({
      nodeId: "b",
      side: "left"
    });
  });

  it("derives gantt rows from sidecar phase and label metadata", () => {
    const defaults = defaultBusinessIdeaCanvasForProject("project-2");
    const rows = businessIdeaCanvasGanttRows(
      {
        ...defaults.businessIdeaCanvas,
        nodes: [
          ...defaults.businessIdeaCanvas.nodes,
          { id: "group-1", type: "group", label: "Gruppe", x: 0, y: 0, width: 400, height: 300, color: "4" }
        ]
      },
      {
        ...defaults.businessIdeaCanvasMeta,
        nodeMeta: {
          ...defaults.businessIdeaCanvasMeta.nodeMeta,
          "group-1": { labelId: "idea", phaseId: "phase-1", shape: "rectangle" }
        }
      }
    );
    const phaseOne = rows.find((row) => row.phaseId === "phase-1");
    const phaseTwo = rows.find((row) => row.phaseId === "phase-2");

    expect(phaseOne?.count).toBe(1);
    expect(phaseOne?.ratio).toBe(0.25);
    expect(phaseOne?.segments[0]).toMatchObject({ labelId: "idea", count: 1 });
    expect(phaseTwo?.count).toBe(2);
    expect(phaseTwo?.ratio).toBe(0.5);
  });

  it("scales gantt bars by cards in phase relative to all cards", () => {
    const defaults = defaultBusinessIdeaCanvasForProject("project-gantt");
    const nodes = Array.from({ length: 6 }, (_, index) => ({
      id: `node-${index + 1}`,
      type: "text" as const,
      text: `Node ${index + 1}`,
      x: index * 20,
      y: 0,
      width: 120,
      height: 80
    }));
    const meta = normalizeBusinessIdeaCanvasMeta(
      {
        nodeMeta: Object.fromEntries(
          nodes.map((node, index) => [
            node.id,
            {
              labelId: "idea",
              phaseId: index < 5 ? "phase-1" : "phase-2",
              shape: "rounded-rectangle"
            }
          ])
        )
      },
      { nodes: [...nodes, { id: "group", type: "group", label: "Gruppe", x: 0, y: 0, width: 300, height: 160 }], edges: [] },
      defaults.businessIdeaCanvasMeta
    );

    const rows = businessIdeaCanvasGanttRows(
      { nodes: [...nodes, { id: "group", type: "group", label: "Gruppe", x: 0, y: 0, width: 300, height: 160 }], edges: [] },
      meta
    );

    expect(rows.find((row) => row.phaseId === "phase-1")).toMatchObject({ count: 5, ratio: 5 / 6 });
    expect(rows.find((row) => row.phaseId === "phase-2")).toMatchObject({ count: 1, ratio: 1 / 6 });
    expect(rows.find((row) => row.phaseId === "phase-3")).toMatchObject({ count: 0, ratio: 0 });
  });

  it("creates group nodes from a selection and keeps membership in sidecar metadata", () => {
    const defaults = defaultBusinessIdeaCanvasForProject("project-3");
    const nodes = defaults.businessIdeaCanvas.nodes.slice(0, 2);
    const groupNode = createBusinessIdeaCanvasGroupNode("group-1", nodes, "Phase 1", "4");

    expect(groupNode).toMatchObject({ id: "group-1", type: "group", label: "Phase 1", color: "4" });
    expect(groupNode?.width).toBeGreaterThan(nodes[0].width);
    expect(createBusinessIdeaCanvasGroupMeta(groupNode!, nodes.map((node) => node.id))).toEqual({
      nodeIds: nodes.map((node) => node.id),
      name: "Phase 1",
      color: "4"
    });
  });

  it("finds cards fully inside a selection rectangle", () => {
    const canvas = parseBusinessIdeaCanvasFile({
      nodes: [
        { id: "a", type: "text", text: "A", x: 0, y: 0, width: 100, height: 80 },
        { id: "b", type: "text", text: "B", x: 120, y: 0, width: 100, height: 80 },
        { id: "group", type: "group", label: "Gruppe", x: -20, y: -20, width: 300, height: 140 }
      ],
      edges: []
    });

    expect(businessIdeaCanvasBoundsForNodes(canvas.nodes.slice(0, 2), 10)).toEqual({ x: -10, y: -10, width: 240, height: 100 });
    expect(businessIdeaCanvasNodesInsideRect(canvas, { x: -5, y: -5, width: 112, height: 92 })).toEqual(["a"]);
  });

  it("moves a single canvas node by the requested keyboard delta", () => {
    const canvas = parseBusinessIdeaCanvasFile({
      nodes: [{ id: "a", type: "text", text: "A", x: 0, y: 0, width: 100, height: 80 }],
      edges: []
    });

    expect(businessIdeaCanvasMoveDeltaForNodes(canvas.nodes, 10, -10)).toEqual({ x: 10, y: -10 });
  });

  it("keeps multi-selection movement relative by clamping a shared delta", () => {
    const canvas = parseBusinessIdeaCanvasFile({
      nodes: [
        { id: "a", type: "text", text: "A", x: -1190, y: 0, width: 100, height: 80 },
        { id: "b", type: "text", text: "B", x: 120, y: 20, width: 100, height: 80 }
      ],
      edges: []
    });

    const delta = businessIdeaCanvasMoveDeltaForNodes(canvas.nodes, -20, 10);
    const moved = canvas.nodes.map((node) => ({ ...node, x: node.x + delta.x, y: node.y + delta.y }));

    expect(delta).toEqual({ x: -10, y: 10 });
    expect(moved[1].x - moved[0].x).toBe(canvas.nodes[1].x - canvas.nodes[0].x);
    expect(moved[1].y - moved[0].y).toBe(canvas.nodes[1].y - canvas.nodes[0].y);
  });

  it("clamps keyboard movement to the visible canvas bounds", () => {
    const canvas = parseBusinessIdeaCanvasFile({
      nodes: [{ id: "a", type: "text", text: "A", x: 1295, y: 615, width: 100, height: 80 }],
      edges: []
    });

    expect(businessIdeaCanvasMoveDeltaForNodes(canvas.nodes, 10, 10)).toEqual({ x: 5, y: 5 });
    expect(businessIdeaCanvasMoveDeltaForNodes([{ ...canvas.nodes[0], x: -1195, y: -1195 }], -10, -10)).toEqual({
      x: -5,
      y: -5
    });
  });

  it("maps zoom around a stable viewport point", () => {
    const viewport = businessIdeaCanvasViewportForZoomAtPoint({ x: 0, y: 0, zoom: 1 }, { x: 200, y: 120 }, 1.5);

    expect(viewport.zoom).toBe(1.5);
    expect((200 - viewport.x) / viewport.zoom).toBe(200);
    expect((120 - viewport.y) / viewport.zoom).toBe(120);
  });

  it("normalizes legacy labels and phases to compact canonical values", () => {
    const canvas = parseBusinessIdeaCanvasFile({
      nodes: [{ id: "a", type: "text", text: "A", x: 0, y: 0, width: 100, height: 80 }],
      edges: []
    });
    const meta = normalizeBusinessIdeaCanvasMeta(
      {
        labels: [
          { id: "idea", name: "Ideensammlung", color: "1" },
          { id: "custom", name: "Eigen", color: "#123456" }
        ],
        phases: [
          { id: "phase-1", name: "Ideensammlung", order: 1, startDate: "2026-01-01" },
          { id: "phase-2", name: "Wissenspruefung", order: 2, startDate: null }
        ],
        nodeMeta: {
          a: { labelId: "idea", phaseId: "phase-1", shape: "rounded-rectangle" }
        }
      },
      canvas
    );

    expect(meta.labels.map((label) => label.name).slice(0, 5)).toEqual(["Idee", "Wissen", "Start", "Umsetzung", "Ziel"]);
    expect(meta.labels.map((label) => label.name)).toContain("Eigen");
    expect(meta.phases).toHaveLength(10);
    expect(meta.phases.map((phase) => phase.name)).toEqual([
      "Phase 1",
      "Phase 2",
      "Phase 3",
      "Phase 4",
      "Phase 5",
      "Phase 6",
      "Phase 7",
      "Phase 8",
      "Phase 9",
      "Phase 10"
    ]);
    expect(meta.phases[0].startDate).toBe("2026-01-01");
  });

  it("keeps standard palette first and shows newest custom colors compactly", () => {
    const defaults = defaultBusinessIdeaCanvasForProject("project-palette");
    const customColors = Array.from({ length: 7 }, (_, index) => ({
      id: `custom-${index + 1}`,
      name: `Custom ${index + 1}`,
      color: `#12345${index}`
    }));
    const palette = customColors.reduce(
      (current, color) => businessIdeaCanvasPaletteWithCustomColor(current, color),
      defaults.businessIdeaCanvasMeta.palette
    );
    const rows = businessIdeaCanvasPaletteRows(palette);

    expect(rows.standard).toHaveLength(6);
    expect(rows.visibleCustom).toHaveLength(6);
    expect(rows.visibleCustom.map((color) => color.id)).toEqual([
      "custom-7",
      "custom-6",
      "custom-5",
      "custom-4",
      "custom-3",
      "custom-2"
    ]);
    expect(rows.custom.map((color) => color.id)).toContain("custom-1");
  });

  it("normalizes legacy meta with palette and group metadata defaults", () => {
    const canvas = parseBusinessIdeaCanvasFile({
      nodes: [
        { id: "a", type: "text", text: "A", x: 0, y: 0, width: 100, height: 80 },
        { id: "group", type: "group", label: "Gruppe", x: -20, y: -20, width: 180, height: 140, color: "5" }
      ],
      edges: []
    });
    const meta = normalizeBusinessIdeaCanvasMeta(
      {
        groupMeta: {
          group: { nodeIds: ["a", "missing"], name: "Validiert", color: "6", status: "open" }
        }
      },
      canvas
    );

    expect(meta.palette.length).toBeGreaterThan(0);
    expect(meta.groupMeta.group).toMatchObject({ nodeIds: ["a"], name: "Validiert", color: "6", status: "open" });
  });

  it("rejects invalid external canvas files with clear errors", () => {
    expect(() =>
      parseBusinessIdeaCanvasFile({
        nodes: [
          { id: "a", type: "text", text: "A", x: 0, y: 0, width: 100, height: 80 },
          { id: "a", type: "text", text: "Duplicate", x: 0, y: 0, width: 100, height: 80 }
        ]
      })
    ).toThrow(/doppelte Node-IDs/);
  });
});
