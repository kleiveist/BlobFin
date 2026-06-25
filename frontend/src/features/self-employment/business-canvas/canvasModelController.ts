import { createId } from "../../../data/defaults";
import {
  businessIdeaCanvasEndsForDirection,
  businessIdeaCanvasWithShortestEdgeSides,
  snapBusinessIdeaCanvasValue
} from "../../../domain/businessIdeaCanvas";
import { normalizeSelfEmploymentGanttPlan } from "../../../domain/selfEmploymentGantt";
import type {
  BusinessIdeaCanvasEdgeDirection,
  JsonCanvasEdge,
  JsonCanvasNode,
  JsonCanvasSide,
  SelfEmploymentProject
} from "../../../types";
import { businessCanvasHost } from "./host";

export function businessCanvasProjectById(projectId: string): SelfEmploymentProject | null {
  return businessCanvasHost().projectById(projectId);
}

export function renderAll(): void {
  businessCanvasHost().renderAll();
}

export function cssEscape(value: string): string {
  const css = (globalThis as typeof globalThis & { CSS?: { escape?: (input: string) => string } }).CSS;
  return typeof css?.escape === "function" ? css.escape(value) : value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

export function createBusinessIdeaCanvasEdge(
  fromNode: string,
  fromSide: JsonCanvasSide,
  toNode: string,
  toSide: JsonCanvasSide,
  direction: BusinessIdeaCanvasEdgeDirection
): JsonCanvasEdge {
  const ends = businessIdeaCanvasEndsForDirection(direction);
  return {
    id: createId(),
    fromNode,
    fromSide,
    fromEnd: ends.fromEnd,
    toNode,
    toSide,
    toEnd: ends.toEnd,
    label: ""
  };
}

export function createBusinessIdeaCanvasTextNode(
  project: SelfEmploymentProject,
  point: { x: number; y: number },
  text: string
): JsonCanvasNode {
  return {
    id: createId(),
    type: "text",
    text,
    x: snapBusinessIdeaCanvasValue(point.x, project.businessIdeaCanvasMeta.grid),
    y: snapBusinessIdeaCanvasValue(point.y, project.businessIdeaCanvasMeta.grid),
    width: 240,
    height: 110,
    color: project.businessIdeaCanvasMeta.labels.find((label) => label.id === project.businessIdeaCanvasMeta.activeLabelId)?.color ?? "1"
  };
}

export function insertBusinessIdeaCanvasNodeIntoProject(project: SelfEmploymentProject, node: JsonCanvasNode): SelfEmploymentProject {
  return {
    ...project,
    businessIdeaCanvas: {
      ...project.businessIdeaCanvas,
      nodes: [...project.businessIdeaCanvas.nodes, node]
    },
    businessIdeaCanvasMeta: {
      ...project.businessIdeaCanvasMeta,
      nodeMeta: {
        ...project.businessIdeaCanvasMeta.nodeMeta,
        [node.id]: {
          labelId: project.businessIdeaCanvasMeta.activeLabelId,
          phaseId: project.businessIdeaCanvasMeta.activePhaseId,
          shape: "rounded-rectangle"
        }
      }
    }
  };
}

export function updateBusinessIdeaCanvasProject(
  projectId: string,
  updater: (project: SelfEmploymentProject) => SelfEmploymentProject,
  renderAfterUpdate = false
): void {
  businessCanvasHost().updateSelfEmploymentProject(
    projectId,
    (project) => {
      const nextProject = updater(project);
      const businessIdeaCanvas = businessIdeaCanvasWithShortestEdgeSides(nextProject.businessIdeaCanvas);
      return {
        ...nextProject,
        businessIdeaCanvas,
        gantt: normalizeSelfEmploymentGanttPlan(nextProject.gantt, businessIdeaCanvas, nextProject.businessIdeaCanvasMeta)
      };
    },
    renderAfterUpdate
  );
}
