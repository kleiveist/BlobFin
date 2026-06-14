import { describe, expect, it } from "vitest";

import {
  businessIdeaCanvasBoundsForNodes,
  businessIdeaCanvasDirectionFromEdge,
  businessIdeaCanvasEndsForDirection,
  businessIdeaCanvasGanttRows,
  businessIdeaCanvasNodesInsideRect,
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
    expect(defaults.businessIdeaCanvasMeta.labels.map((label) => label.name)).toEqual(["Idee", "Umsetzung", "Wissen"]);
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
    expect(phaseOne?.segments[0]).toMatchObject({ labelId: "idea", count: 1 });
    expect(phaseTwo?.count).toBe(2);
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

  it("maps zoom around a stable viewport point", () => {
    const viewport = businessIdeaCanvasViewportForZoomAtPoint({ x: 0, y: 0, zoom: 1 }, { x: 200, y: 120 }, 1.5);

    expect(viewport.zoom).toBe(1.5);
    expect((200 - viewport.x) / viewport.zoom).toBe(200);
    expect((120 - viewport.y) / viewport.zoom).toBe(120);
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
