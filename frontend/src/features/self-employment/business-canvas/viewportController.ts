import {
  BUSINESS_IDEA_CANVAS_DEFAULT_VIEWPORT,
  BUSINESS_IDEA_CANVAS_ORIGIN,
  businessIdeaCanvasViewportForZoomAtPoint,
  canvasAnchorPoint,
  nearestBusinessIdeaCanvasNodeSide,
  snapBusinessIdeaCanvasValue
} from "../../../domain/businessIdeaCanvas";
import { normalizeSelfEmploymentGanttPlan } from "../../../domain/selfEmploymentGantt";
import { numberValue } from "../../../lib/format";
import type {
  BusinessIdeaCanvasViewport,
  JsonCanvasEdge,
  JsonCanvasNode,
  JsonCanvasSide,
  SelfEmploymentProject
} from "../../../types";
import { businessCanvasHost } from "./host";
import {
  businessCanvasUiState,
  type BusinessIdeaCanvasConnectionDragState,
  type BusinessIdeaCanvasDragState,
  type BusinessIdeaCanvasPanDragState
} from "./uiState";

function businessCanvasProjectById(projectId: string): SelfEmploymentProject | null {
  return businessCanvasHost().projectById(projectId);
}

function renderAll(): void {
  businessCanvasHost().renderAll();
}

function cssEscape(value: string): string {
  const css = (globalThis as typeof globalThis & { CSS?: { escape?: (input: string) => string } }).CSS;
  return typeof css?.escape === "function" ? css.escape(value) : value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function updateBusinessIdeaCanvasProject(
  projectId: string,
  updater: (project: SelfEmploymentProject) => SelfEmploymentProject,
  renderAfterUpdate = false
): void {
  businessCanvasHost().updateSelfEmploymentProject(
    projectId,
    (project) => {
      const nextProject = updater(project);
      return {
        ...nextProject,
        gantt: normalizeSelfEmploymentGanttPlan(nextProject.gantt, nextProject.businessIdeaCanvas, nextProject.businessIdeaCanvasMeta)
      };
    },
    renderAfterUpdate
  );
}

export function zoomBusinessIdeaCanvas(delta: number): void {
  cancelBusinessIdeaCanvasWheelZoom();
  const projectId = businessCanvasHost().getState().selfEmployment.selectedProjectId;
  const viewportElement = document.querySelector<HTMLElement>(
    `[data-business-canvas-project-id="${cssEscape(projectId)}"] [data-business-canvas-viewport]`
  );
  const rect = viewportElement?.getBoundingClientRect();
  updateBusinessIdeaCanvasProject(projectId, (project) => {
    const viewport = project.businessIdeaCanvasMeta.viewport;
    const nextZoom = Math.min(2, Math.max(0.4, Number((viewport.zoom + delta).toFixed(2))));
    const nextViewport = rect
      ? businessIdeaCanvasViewportForZoomAtPoint(viewport, { x: rect.width / 2, y: rect.height / 2 }, nextZoom)
      : { ...viewport, zoom: nextZoom };
    return {
      ...project,
      businessIdeaCanvasMeta: {
        ...project.businessIdeaCanvasMeta,
        viewport: nextViewport
      }
    };
  }, true);
}

export function resetBusinessIdeaCanvasView(): void {
  cancelBusinessIdeaCanvasWheelZoom();
  updateBusinessIdeaCanvasProject(businessCanvasHost().getState().selfEmployment.selectedProjectId, (project) => ({
    ...project,
    businessIdeaCanvasMeta: {
      ...project.businessIdeaCanvasMeta,
      viewport: { ...BUSINESS_IDEA_CANVAS_DEFAULT_VIEWPORT }
    }
  }), true);
}

export function armBusinessIdeaCanvasConnection(): void {
  const selection = businessCanvasUiState.selectedNodeIds;
  if (!selection?.nodeIds.length) return;
  const project = businessCanvasProjectById(selection.projectId);
  const nodeId = selection.nodeIds[0];
  const node = project?.businessIdeaCanvas.nodes.find((item) => item.id === nodeId);
  if (!node || node.type === "group") return;
  businessCanvasUiState.armedConnection = { projectId: selection.projectId, nodeId, side: "right" };
  businessCanvasUiState.lineMenu = null;
  renderAll();
}

export function cancelBusinessIdeaCanvasWheelZoom(): void {
  if (!businessCanvasUiState.wheelZoomState) return;
  if (businessCanvasUiState.wheelZoomState.frameId !== null) window.cancelAnimationFrame(businessCanvasUiState.wheelZoomState.frameId);
  if (businessCanvasUiState.wheelZoomState.commitTimerId !== null) window.clearTimeout(businessCanvasUiState.wheelZoomState.commitTimerId);
  businessCanvasUiState.wheelZoomState = null;
}

export function scheduleBusinessIdeaCanvasWheelZoom(projectId: string, viewport: BusinessIdeaCanvasViewport): void {
  if (businessCanvasUiState.wheelZoomState && businessCanvasUiState.wheelZoomState.projectId !== projectId) {
    if (businessCanvasUiState.wheelZoomState.frameId !== null) window.cancelAnimationFrame(businessCanvasUiState.wheelZoomState.frameId);
    if (businessCanvasUiState.wheelZoomState.commitTimerId !== null) window.clearTimeout(businessCanvasUiState.wheelZoomState.commitTimerId);
    businessCanvasUiState.wheelZoomState = null;
  }
  if (!businessCanvasUiState.wheelZoomState) {
    businessCanvasUiState.wheelZoomState = { projectId, viewport, frameId: null, commitTimerId: null };
  }
  businessCanvasUiState.wheelZoomState.viewport = viewport;
  if (businessCanvasUiState.wheelZoomState.frameId === null) {
    businessCanvasUiState.wheelZoomState.frameId = window.requestAnimationFrame(() => {
      const zoomState = businessCanvasUiState.wheelZoomState;
      if (!zoomState || zoomState.projectId !== projectId) return;
      zoomState.frameId = null;
      applyBusinessIdeaCanvasViewportTransform(projectId, zoomState.viewport);
    });
  }
  if (businessCanvasUiState.wheelZoomState.commitTimerId !== null) {
    window.clearTimeout(businessCanvasUiState.wheelZoomState.commitTimerId);
  }
  businessCanvasUiState.wheelZoomState.commitTimerId = window.setTimeout(() => commitBusinessIdeaCanvasWheelZoom(projectId), 140);
}

export function commitBusinessIdeaCanvasWheelZoom(projectId: string): void {
  const zoomState = businessCanvasUiState.wheelZoomState;
  if (!zoomState || zoomState.projectId !== projectId) return;
  if (zoomState.frameId !== null) window.cancelAnimationFrame(zoomState.frameId);
  if (zoomState.commitTimerId !== null) window.clearTimeout(zoomState.commitTimerId);
  const viewport = zoomState.viewport;
  businessCanvasUiState.wheelZoomState = null;
  updateBusinessIdeaCanvasProject(projectId, (project) => ({
    ...project,
    businessIdeaCanvasMeta: {
      ...project.businessIdeaCanvasMeta,
      viewport
    }
  }), true);
}

export function scheduleBusinessIdeaCanvasPanFrame(drag: NonNullable<BusinessIdeaCanvasPanDragState>): void {
  if (drag.frameId !== null) return;
  drag.frameId = window.requestAnimationFrame(() => {
    const activeDrag = businessCanvasUiState.panDragState;
    if (!activeDrag || activeDrag.projectId !== drag.projectId || activeDrag.pointerId !== drag.pointerId) return;
    activeDrag.frameId = null;
    const project = businessCanvasProjectById(activeDrag.projectId);
    if (!project) return;
    applyBusinessIdeaCanvasViewportTransform(activeDrag.projectId, {
      ...project.businessIdeaCanvasMeta.viewport,
      x: Math.round(activeDrag.previewX),
      y: Math.round(activeDrag.previewY)
    });
  });
}

export function scheduleBusinessIdeaCanvasDragFrame(drag: NonNullable<BusinessIdeaCanvasDragState>): void {
  if (drag.frameId !== null) return;
  drag.frameId = window.requestAnimationFrame(() => {
    const activeDrag = businessCanvasUiState.dragState;
    if (!activeDrag || activeDrag.projectId !== drag.projectId || activeDrag.pointerId !== drag.pointerId) return;
    activeDrag.frameId = null;
    const project = businessCanvasProjectById(activeDrag.projectId);
    if (!project) return;
    applyBusinessIdeaCanvasDragPreview(project, activeDrag);
  });
}

export function scheduleBusinessIdeaCanvasConnectionPreview(drag: NonNullable<BusinessIdeaCanvasConnectionDragState>): void {
  if (drag.frameId !== null) return;
  drag.frameId = window.requestAnimationFrame(() => {
    const activeDrag = businessCanvasUiState.connectionDragState;
    if (!activeDrag || activeDrag.projectId !== drag.projectId || activeDrag.pointerId !== drag.pointerId) return;
    activeDrag.frameId = null;
    const project = businessCanvasProjectById(activeDrag.projectId);
    if (!project) return;
    applyBusinessIdeaCanvasConnectionPreview(project, activeDrag);
  });
}

export function applyBusinessIdeaCanvasConnectionPreview(
  project: SelfEmploymentProject,
  drag: NonNullable<BusinessIdeaCanvasConnectionDragState>
): void {
  const svg = document.querySelector<SVGSVGElement>(
    `[data-business-canvas-project-id="${cssEscape(project.id)}"] [data-business-canvas-svg]`
  );
  if (!svg) return;
  let group = svg.querySelector<SVGGElement>(".business-canvas-connection-preview");
  if (!group) {
    group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add("business-canvas-connection-preview");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.classList.add("business-canvas-connection-preview-line");
    path.setAttribute("marker-end", "url(#businessCanvasArrow)");
    group.append(path);
    svg.append(group);
  }
  const targetSide = drag.previewTargetSide ?? nearestBusinessIdeaCanvasSideForPreview(drag.startPoint, drag.previewPoint);
  const path = group.querySelector<SVGPathElement>(".business-canvas-connection-preview-line");
  path?.setAttribute(
    "d",
    businessIdeaCanvasLiveEdgePath(
      businessIdeaCanvasSvgPoint(drag.startPoint),
      businessIdeaCanvasSvgPoint(drag.previewPoint),
      drag.fromSide,
      targetSide
    )
  );
  updateBusinessIdeaCanvasConnectionTargetHighlight(project.id, drag.previewTargetNodeId);
}

export function clearBusinessIdeaCanvasConnectionPreview(projectId?: string): void {
  const scope = projectId
    ? document.querySelector<HTMLElement>(`[data-business-canvas-project-id="${cssEscape(projectId)}"]`)
    : document;
  scope?.querySelectorAll(".business-canvas-connection-preview").forEach((element) => element.remove());
  scope?.querySelectorAll(".business-canvas-node.connection-target").forEach((element) => {
    element.classList.remove("connection-target");
  });
}

export function updateBusinessIdeaCanvasConnectionTargetHighlight(projectId: string, targetNodeId: string | null): void {
  const rootElement = document.querySelector<HTMLElement>(`[data-business-canvas-project-id="${cssEscape(projectId)}"]`);
  if (!rootElement) return;
  rootElement.querySelectorAll(".business-canvas-node.connection-target").forEach((element) => {
    if (element.getAttribute("data-business-canvas-node-id") !== targetNodeId) {
      element.classList.remove("connection-target");
    }
  });
  if (!targetNodeId) return;
  rootElement
    .querySelector<HTMLElement>(`[data-business-canvas-node-id="${cssEscape(targetNodeId)}"]`)
    ?.classList.add("connection-target");
}

export function applyBusinessIdeaCanvasViewportTransform(projectId: string, viewport: BusinessIdeaCanvasViewport): void {
  const content = document.querySelector<HTMLElement>(
    `[data-business-canvas-project-id="${cssEscape(projectId)}"] [data-business-canvas-content]`
  );
  if (!content) return;
  content.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;
}

export function applyBusinessIdeaCanvasDragPreview(
  project: SelfEmploymentProject,
  drag: NonNullable<BusinessIdeaCanvasDragState>
): void {
  for (const [nodeId, preview] of Object.entries(drag.previewNodes)) {
    const element = drag.elements[nodeId];
    if (!element) continue;
    element.style.left = `${preview.x + BUSINESS_IDEA_CANVAS_ORIGIN}px`;
    element.style.top = `${preview.y + BUSINESS_IDEA_CANVAS_ORIGIN}px`;
    element.style.width = `${preview.width}px`;
    element.style.height = `${preview.height}px`;
  }
  updateBusinessIdeaCanvasLiveEdges(project, drag.previewNodes);
}

export function updateBusinessIdeaCanvasLiveEdges(
  project: SelfEmploymentProject,
  previewNodes: Record<string, { x: number; y: number; width: number; height: number }>
): void {
  const previewIds = new Set(Object.keys(previewNodes));
  const nodesById = new Map(project.businessIdeaCanvas.nodes.map((node) => [node.id, node]));
  for (const edge of project.businessIdeaCanvas.edges) {
    if (!previewIds.has(edge.fromNode) && !previewIds.has(edge.toNode)) continue;
    const fromBase = nodesById.get(edge.fromNode);
    const toBase = nodesById.get(edge.toNode);
    if (!fromBase || !toBase) continue;
    const fromNode = { ...fromBase, ...(previewNodes[fromBase.id] ?? {}) } as JsonCanvasNode;
    const toNode = { ...toBase, ...(previewNodes[toBase.id] ?? {}) } as JsonCanvasNode;
    const geometry = businessIdeaCanvasLiveEdgeGeometry(edge, fromNode, toNode);
    const edgeGroup = document.querySelector<SVGGElement>(
      `[data-business-canvas-project-id="${cssEscape(project.id)}"] [data-business-canvas-edge-id="${cssEscape(edge.id)}"]`
    );
    const hit = edgeGroup?.querySelector<SVGPathElement>(".business-canvas-edge-hit");
    const line = edgeGroup?.querySelector<SVGPathElement>(".business-canvas-edge-line");
    const label = edgeGroup?.querySelector<SVGForeignObjectElement>(".business-canvas-edge-label-foreign");
    const branch = edgeGroup?.querySelector<SVGCircleElement>(".business-canvas-edge-branch");
    hit?.setAttribute("d", geometry.path);
    line?.setAttribute("d", geometry.path);
    if (label) {
      const width = numberValue(label.getAttribute("data-business-canvas-edge-label-width"));
      label.setAttribute("x", String(geometry.label.x - (width || 58) / 2));
      label.setAttribute("y", String(geometry.label.y - 14));
    }
    branch?.setAttribute("cx", String(geometry.label.x));
    branch?.setAttribute("cy", String(geometry.label.y));
    if (branch) {
      branch.dataset.businessCanvasBranchX = String(geometry.label.x - BUSINESS_IDEA_CANVAS_ORIGIN);
      branch.dataset.businessCanvasBranchY = String(geometry.label.y - BUSINESS_IDEA_CANVAS_ORIGIN);
    }
  }
}

export function businessIdeaCanvasLiveEdgeGeometry(
  edge: JsonCanvasEdge,
  fromNode: JsonCanvasNode,
  toNode: JsonCanvasNode
): { path: string; label: { x: number; y: number } } {
  const fromSide = edge.fromSide ?? "right";
  const toSide = edge.toSide ?? "left";
  const from = businessIdeaCanvasSvgPoint(canvasAnchorPoint(fromNode, fromSide));
  const to = businessIdeaCanvasSvgPoint(canvasAnchorPoint(toNode, toSide));
  return businessIdeaCanvasLiveEdgeGeometryForPoints(from, to, fromSide, toSide);
}

export function businessIdeaCanvasSvgPoint(point: { x: number; y: number }): { x: number; y: number } {
  return {
    x: point.x + BUSINESS_IDEA_CANVAS_ORIGIN,
    y: point.y + BUSINESS_IDEA_CANVAS_ORIGIN
  };
}

export function businessIdeaCanvasLiveEdgePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromSide: JsonCanvasSide,
  toSide: JsonCanvasSide
): string {
  return businessIdeaCanvasLiveEdgeGeometryForPoints(from, to, fromSide, toSide).path;
}

export function businessIdeaCanvasLiveEdgeGeometryForPoints(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromSide: JsonCanvasSide,
  toSide: JsonCanvasSide
): { path: string; label: { x: number; y: number } } {
  const distance = Math.max(80, Math.min(220, Math.abs(to.x - from.x) * 0.45 + Math.abs(to.y - from.y) * 0.25));
  const fromControl = businessIdeaCanvasLiveControlPoint(from, fromSide, distance);
  const toControl = businessIdeaCanvasLiveControlPoint(to, toSide, distance);
  return {
    path: `M ${from.x} ${from.y} C ${fromControl.x} ${fromControl.y}, ${toControl.x} ${toControl.y}, ${to.x} ${to.y}`,
    label: businessIdeaCanvasCubicPointAtHalfLength(from, fromControl, toControl, to)
  };
}

export function businessIdeaCanvasLiveControlPoint(
  point: { x: number; y: number },
  side: JsonCanvasSide,
  distance: number
): { x: number; y: number } {
  if (side === "top") return { x: point.x, y: point.y - distance };
  if (side === "right") return { x: point.x + distance, y: point.y };
  if (side === "bottom") return { x: point.x, y: point.y + distance };
  return { x: point.x - distance, y: point.y };
}

export function businessIdeaCanvasCubicPointAtHalfLength(
  start: { x: number; y: number },
  controlA: { x: number; y: number },
  controlB: { x: number; y: number },
  end: { x: number; y: number }
): { x: number; y: number } {
  const samples = 24;
  const points = Array.from({ length: samples + 1 }, (_, index) =>
    businessIdeaCanvasCubicPoint(start, controlA, controlB, end, index / samples)
  );
  const distances = points.slice(1).map((point, index) => Math.hypot(point.x - points[index].x, point.y - points[index].y));
  const total = distances.reduce((sum, distance) => sum + distance, 0);
  if (!Number.isFinite(total) || total <= 0) return businessIdeaCanvasCubicPoint(start, controlA, controlB, end, 0.5);
  const target = total / 2;
  let walked = 0;
  for (let index = 1; index < points.length; index += 1) {
    const segment = distances[index - 1] ?? 0;
    if (walked + segment >= target) {
      const ratio = segment > 0 ? (target - walked) / segment : 0;
      return {
        x: points[index - 1].x + (points[index].x - points[index - 1].x) * ratio,
        y: points[index - 1].y + (points[index].y - points[index - 1].y) * ratio
      };
    }
    walked += segment;
  }
  return businessIdeaCanvasCubicPoint(start, controlA, controlB, end, 0.5);
}

export function businessIdeaCanvasCubicPoint(
  start: { x: number; y: number },
  controlA: { x: number; y: number },
  controlB: { x: number; y: number },
  end: { x: number; y: number },
  t: number
): { x: number; y: number } {
  const inverse = 1 - t;
  const a = inverse * inverse * inverse;
  const b = 3 * inverse * inverse * t;
  const c = 3 * inverse * t * t;
  const d = t * t * t;
  return {
    x: a * start.x + b * controlA.x + c * controlB.x + d * end.x,
    y: a * start.y + b * controlA.y + c * controlB.y + d * end.y
  };
}

export function businessIdeaCanvasConnectionTargetFromEvent(
  event: PointerEvent,
  project: SelfEmploymentProject,
  sourceNodeId: string
): { node: JsonCanvasNode; side: JsonCanvasSide } | null {
  const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
  const nodeElement = target?.closest<HTMLElement>("[data-business-canvas-node-id]");
  const nodeId = nodeElement?.dataset.businessCanvasNodeId;
  const node = nodeId ? project.businessIdeaCanvas.nodes.find((item) => item.id === nodeId) : null;
  if (!node || node.type === "group" || node.id === sourceNodeId) return null;
  const point = businessIdeaCanvasPointFromEvent(event, project);
  return { node, side: nearestBusinessIdeaCanvasNodeSide(node, point) };
}

export function nearestBusinessIdeaCanvasSideForPreview(
  start: { x: number; y: number },
  end: { x: number; y: number }
): JsonCanvasSide {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  if (Math.abs(deltaX) >= Math.abs(deltaY)) return deltaX >= 0 ? "left" : "right";
  return deltaY >= 0 ? "top" : "bottom";
}

export function businessIdeaCanvasPointFromEvent(event: PointerEvent | MouseEvent, project: SelfEmploymentProject): { x: number; y: number } {
  const content = document.querySelector<HTMLElement>(
    `[data-business-canvas-project-id="${cssEscape(project.id)}"] [data-business-canvas-content]`
  );
  const rect = content?.getBoundingClientRect();
  const zoom = project.businessIdeaCanvasMeta.viewport.zoom || 1;
  if (!rect) return { x: 0, y: 0 };
  return {
    x: (event.clientX - rect.left) / zoom - BUSINESS_IDEA_CANVAS_ORIGIN,
    y: (event.clientY - rect.top) / zoom - BUSINESS_IDEA_CANVAS_ORIGIN
  };
}

export function businessIdeaCanvasViewportPointFromEvent(event: WheelEvent, projectId: string): { x: number; y: number } | null {
  const viewport = document.querySelector<HTMLElement>(
    `[data-business-canvas-project-id="${cssEscape(projectId)}"] [data-business-canvas-viewport]`
  );
  const rect = viewport?.getBoundingClientRect();
  if (!rect) return null;
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

export function businessIdeaCanvasVisibleTopLeft(project: SelfEmploymentProject): { x: number; y: number } {
  return businessIdeaCanvasPointFromViewportPoint(project, { x: 32, y: 32 });
}

export function businessIdeaCanvasPointFromViewportPoint(
  project: SelfEmploymentProject,
  point: { x: number; y: number }
): { x: number; y: number } {
  const viewport = project.businessIdeaCanvasMeta.viewport;
  const zoom = viewport.zoom || 1;
  return {
    x: snapBusinessIdeaCanvasValue((point.x - viewport.x) / zoom - BUSINESS_IDEA_CANVAS_ORIGIN, project.businessIdeaCanvasMeta.grid),
    y: snapBusinessIdeaCanvasValue((point.y - viewport.y) / zoom - BUSINESS_IDEA_CANVAS_ORIGIN, project.businessIdeaCanvasMeta.grid)
  };
}

export function updateBusinessIdeaCanvasSelectionRectElement(): void {
  const rect = businessCanvasUiState.selectionRect;
  if (!rect) return;
  const element = document.querySelector<HTMLElement>(
    `[data-business-canvas-project-id="${cssEscape(rect.projectId)}"] [data-business-canvas-selection-rect]`
  );
  if (!element) {
    renderAll();
    return;
  }
  const left = rect.width < 0 ? rect.x + rect.width : rect.x;
  const top = rect.height < 0 ? rect.y + rect.height : rect.y;
  element.style.left = `${left + BUSINESS_IDEA_CANVAS_ORIGIN}px`;
  element.style.top = `${top + BUSINESS_IDEA_CANVAS_ORIGIN}px`;
  element.style.width = `${Math.abs(rect.width)}px`;
  element.style.height = `${Math.abs(rect.height)}px`;
}
