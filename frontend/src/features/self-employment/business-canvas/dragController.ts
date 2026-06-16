import {
  businessIdeaCanvasNodesInsideRect,
  canvasAnchorPoint,
  clampBusinessIdeaCanvasNodeSize,
  nearestBusinessIdeaCanvasEndpointForEdge,
  nearestBusinessIdeaCanvasNodeSide,
  snapBusinessIdeaCanvasValue
} from "../../../domain/businessIdeaCanvas";
import { numberValue } from "../../../lib/format";
import type { JsonCanvasSide } from "../../../types";
import {
  businessCanvasProjectById,
  cssEscape,
  renderAll,
  updateBusinessIdeaCanvasProject
} from "./canvasModelController";
import {
  addBusinessIdeaCanvasEdge,
  connectBusinessIdeaCanvasArmedNode,
  editBusinessIdeaCanvasEdgeLabel
} from "./edgeController";
import { closeBusinessIdeaCanvasOverlays } from "./overlayController";
import {
  businessIdeaCanvasSelectedIds,
  clearBusinessIdeaCanvasSelection,
  selectBusinessIdeaCanvasNodes
} from "./selectionController";
import { businessCanvasUiState } from "./uiState";
import {
  businessIdeaCanvasConnectionTargetFromEvent,
  businessIdeaCanvasPointFromEvent,
  clearBusinessIdeaCanvasConnectionPreview,
  scheduleBusinessIdeaCanvasConnectionPreview,
  scheduleBusinessIdeaCanvasDragFrame,
  scheduleBusinessIdeaCanvasPanFrame,
  updateBusinessIdeaCanvasSelectionRectElement
} from "./viewportController";

export function hasBusinessIdeaCanvasPointerState(): boolean {
  return Boolean(
    businessCanvasUiState.dragState ||
      businessCanvasUiState.connectionDragState ||
      businessCanvasUiState.selectionDragState ||
      businessCanvasUiState.panDragState
  );
}

export function startBusinessIdeaCanvasPointer(event: PointerEvent): void {
  const target = event.target as HTMLElement | null;
  if (!target?.closest(".business-canvas-editor")) return;
  const isCanvasControl = Boolean(
    target.closest(
      "[contenteditable='true'], [data-business-canvas-edge-label-input], [data-business-canvas-node-toolbar], [data-business-canvas-multi-toolbar], .business-canvas-topbar, [data-business-canvas-edge-toolbar], .business-canvas-line-menu, [data-business-canvas-context-menu], [data-business-canvas-palette-popover], [data-business-canvas-palette-editor]"
    )
  );
  if (isCanvasControl) return;

  const projectId = target.closest<HTMLElement>("[data-business-canvas-project-id]")?.dataset.businessCanvasProjectId;
  if (!projectId) return;
  const project = businessCanvasProjectById(projectId);
  if (!project) return;

  const viewportElement = target.closest<HTMLElement>("[data-business-canvas-viewport]");
  if ((event.button === 1 || (event.button === 0 && businessCanvasUiState.spacePressed)) && viewportElement) {
    event.preventDefault();
    businessCanvasUiState.panDragState = {
      projectId,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originalX: project.businessIdeaCanvasMeta.viewport.x,
      originalY: project.businessIdeaCanvasMeta.viewport.y,
      previewX: project.businessIdeaCanvasMeta.viewport.x,
      previewY: project.businessIdeaCanvasMeta.viewport.y,
      frameId: null,
      moved: false
    };
    viewportElement.classList.add("panning");
    viewportElement.setPointerCapture?.(event.pointerId);
    closeBusinessIdeaCanvasOverlays();
    return;
  }

  if (event.button !== 0) return;

  const branch = target.closest<SVGCircleElement>("[data-business-canvas-edge-branch]");
  if (branch?.dataset.businessCanvasEdgeBranch) {
    startBusinessIdeaCanvasBranchDrag(event, projectId, branch);
    return;
  }

  const anchor = target.closest<HTMLElement>("[data-business-canvas-anchor]");
  if (anchor?.dataset.businessCanvasAnchorNodeId && anchor.dataset.businessCanvasAnchor) {
    const node = businessCanvasProjectById(projectId)?.businessIdeaCanvas.nodes.find(
      (item) => item.id === anchor.dataset.businessCanvasAnchorNodeId
    );
    if (!node) return;
    event.preventDefault();
    businessCanvasUiState.connectionDragState = {
      projectId,
      pointerId: event.pointerId,
      fromNodeId: node.id,
      fromSide: anchor.dataset.businessCanvasAnchor as JsonCanvasSide,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPoint: canvasAnchorPoint(node, anchor.dataset.businessCanvasAnchor as JsonCanvasSide),
      lineMenuPoint: null,
      lineMenuEdgeId: null,
      previewPoint: canvasAnchorPoint(node, anchor.dataset.businessCanvasAnchor as JsonCanvasSide),
      previewTargetNodeId: null,
      previewTargetSide: null,
      frameId: null,
      moved: false
    };
    anchor.setPointerCapture?.(event.pointerId);
    return;
  }

  const resizeHandle = target.closest<HTMLElement>("[data-business-canvas-resize]");
  const nodeElement = target.closest<HTMLElement>("[data-business-canvas-node-id]");
  if (nodeElement?.dataset.businessCanvasNodeId) {
    const nodeId = nodeElement.dataset.businessCanvasNodeId;
    const node = project?.businessIdeaCanvas.nodes.find((item) => item.id === nodeId);
    if (!project || !node) return;
    if (businessCanvasUiState.armedConnection && businessCanvasUiState.armedConnection.projectId === projectId && !resizeHandle) {
      connectBusinessIdeaCanvasArmedNode(project, node, businessIdeaCanvasPointFromEvent(event, project));
      return;
    }
    event.preventDefault();
    const currentSelection = businessIdeaCanvasSelectedIds(projectId);
    if ((event.shiftKey || event.metaKey) && !resizeHandle) {
      const nextSelection = currentSelection.includes(nodeId)
        ? currentSelection.filter((item) => item !== nodeId)
        : [...currentSelection, nodeId];
      selectBusinessIdeaCanvasNodes(projectId, nextSelection);
      businessCanvasUiState.editingNode = null;
      businessCanvasUiState.lineMenu = null;
      renderAll();
      return;
    }
    const dragNodeIds =
      resizeHandle || !currentSelection.includes(nodeId) ? [nodeId] : currentSelection.filter((item) => Boolean(item));
    selectBusinessIdeaCanvasNodes(projectId, dragNodeIds);
    businessCanvasUiState.selectedEdge = null;
    businessCanvasUiState.lineMenu = null;
    businessCanvasUiState.palettePopover = null;
    businessCanvasUiState.contextMenu = null;
    const originalNodes: Record<string, { x: number; y: number; width: number; height: number }> = {};
    const elements: Record<string, HTMLElement> = {};
    for (const item of project.businessIdeaCanvas.nodes) {
      if (!dragNodeIds.includes(item.id)) continue;
      originalNodes[item.id] = { x: item.x, y: item.y, width: item.width, height: item.height };
      const element =
        item.id === nodeId
          ? nodeElement
          : document.querySelector<HTMLElement>(
              `[data-business-canvas-project-id="${cssEscape(projectId)}"] [data-business-canvas-node-id="${cssEscape(item.id)}"]`
            );
      if (element) {
        elements[item.id] = element;
        element.classList.add("dragging");
      }
    }
    businessCanvasUiState.dragState = {
      projectId,
      nodeIds: dragNodeIds,
      mode: resizeHandle ? "resize" : "move",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originalNodes,
      elements,
      previewNodes: { ...originalNodes },
      frameId: null,
      moved: false
    };
    nodeElement.setPointerCapture?.(event.pointerId);
    return;
  }

  const edgeHit = target.closest<HTMLElement>("[data-business-canvas-edge-hit], [data-business-canvas-edge-label]");
  const edgeId = edgeHit?.dataset.businessCanvasEdgeHit || edgeHit?.dataset.businessCanvasEdgeLabel;
  if (edgeId) {
    event.preventDefault();
    businessCanvasUiState.selectedNodeIds = null;
    businessCanvasUiState.editingNode = null;
    businessCanvasUiState.selectedEdge = { projectId, edgeId };
    businessCanvasUiState.lineMenu = null;
    closeBusinessIdeaCanvasOverlays();
    if (edgeHit?.dataset.businessCanvasEdgeLabel) {
      editBusinessIdeaCanvasEdgeLabel(projectId, edgeId);
    } else {
      renderAll();
    }
    return;
  }

  if (viewportElement) {
    event.preventDefault();
    const startPoint = businessIdeaCanvasPointFromEvent(event, project);
    businessCanvasUiState.selectionDragState = {
      projectId,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPoint,
      currentPoint: startPoint,
      moved: false
    };
    businessCanvasUiState.selectionRect = { projectId, x: startPoint.x, y: startPoint.y, width: 0, height: 0 };
    businessCanvasUiState.selectedNodeIds = null;
    businessCanvasUiState.selectedEdge = null;
    businessCanvasUiState.editingNode = null;
    businessCanvasUiState.armedConnection = null;
    businessCanvasUiState.lineMenu = null;
    closeBusinessIdeaCanvasOverlays();
    viewportElement.setPointerCapture?.(event.pointerId);
    renderAll();
  }
}

export function moveBusinessIdeaCanvasPointer(event: PointerEvent): void {
  if (businessCanvasUiState.connectionDragState && event.pointerId === businessCanvasUiState.connectionDragState.pointerId) {
    const drag = businessCanvasUiState.connectionDragState;
    const project = businessCanvasProjectById(drag.projectId);
    drag.moved =
      drag.moved ||
      Math.abs(event.clientX - drag.startClientX) > 3 ||
      Math.abs(event.clientY - drag.startClientY) > 3;
    if (!project) return;
    const targetInfo = businessIdeaCanvasConnectionTargetFromEvent(event, project, drag.fromNodeId);
    if (targetInfo) {
      drag.previewTargetNodeId = targetInfo.node.id;
      drag.previewTargetSide = targetInfo.side;
      drag.previewPoint = canvasAnchorPoint(targetInfo.node, targetInfo.side);
    } else {
      drag.previewTargetNodeId = null;
      drag.previewTargetSide = null;
      drag.previewPoint = businessIdeaCanvasPointFromEvent(event, project);
    }
    scheduleBusinessIdeaCanvasConnectionPreview(drag);
    return;
  }
  if (businessCanvasUiState.panDragState && event.pointerId === businessCanvasUiState.panDragState.pointerId) {
    const drag = businessCanvasUiState.panDragState;
    drag.previewX = drag.originalX + event.clientX - drag.startClientX;
    drag.previewY = drag.originalY + event.clientY - drag.startClientY;
    drag.moved = drag.moved || Math.abs(event.clientX - drag.startClientX) > 3 || Math.abs(event.clientY - drag.startClientY) > 3;
    scheduleBusinessIdeaCanvasPanFrame(drag);
    return;
  }
  if (businessCanvasUiState.selectionDragState && event.pointerId === businessCanvasUiState.selectionDragState.pointerId) {
    const drag = businessCanvasUiState.selectionDragState;
    const project = businessCanvasProjectById(drag.projectId);
    if (!project) return;
    const currentPoint = businessIdeaCanvasPointFromEvent(event, project);
    drag.currentPoint = currentPoint;
    drag.moved = drag.moved || Math.abs(event.clientX - drag.startClientX) > 3 || Math.abs(event.clientY - drag.startClientY) > 3;
    businessCanvasUiState.selectionRect = {
      projectId: drag.projectId,
      x: drag.startPoint.x,
      y: drag.startPoint.y,
      width: currentPoint.x - drag.startPoint.x,
      height: currentPoint.y - drag.startPoint.y
    };
    updateBusinessIdeaCanvasSelectionRectElement();
    return;
  }
  if (!businessCanvasUiState.dragState || event.pointerId !== businessCanvasUiState.dragState.pointerId) return;
  const drag = businessCanvasUiState.dragState;
  const project = businessCanvasProjectById(drag.projectId);
  if (!project) return;
  const zoom = project.businessIdeaCanvasMeta.viewport.zoom || 1;
  const deltaX = (event.clientX - drag.startClientX) / zoom;
  const deltaY = (event.clientY - drag.startClientY) / zoom;
  drag.moved = drag.moved || Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3;
  if (drag.mode === "resize") {
    const nodeId = drag.nodeIds[0];
    const original = drag.originalNodes[nodeId];
    if (!original) return;
    const size = clampBusinessIdeaCanvasNodeSize(
      snapBusinessIdeaCanvasValue(original.width + deltaX, project.businessIdeaCanvasMeta.grid),
      snapBusinessIdeaCanvasValue(original.height + deltaY, project.businessIdeaCanvasMeta.grid)
    );
    drag.previewNodes = {
      [nodeId]: { ...original, width: size.width, height: size.height }
    };
    scheduleBusinessIdeaCanvasDragFrame(drag);
    return;
  }
  const previewNodes: Record<string, { x: number; y: number; width: number; height: number }> = {};
  for (const nodeId of drag.nodeIds) {
    const original = drag.originalNodes[nodeId];
    if (!original) continue;
    const x = snapBusinessIdeaCanvasValue(original.x + deltaX, project.businessIdeaCanvasMeta.grid);
    const y = snapBusinessIdeaCanvasValue(original.y + deltaY, project.businessIdeaCanvasMeta.grid);
    previewNodes[nodeId] = { ...original, x, y };
  }
  drag.previewNodes = previewNodes;
  scheduleBusinessIdeaCanvasDragFrame(drag);
}

export function finishBusinessIdeaCanvasPointer(event: PointerEvent): void {
  if (businessCanvasUiState.connectionDragState && event.pointerId === businessCanvasUiState.connectionDragState.pointerId) {
    finishBusinessIdeaCanvasConnectionDrag(event);
    return;
  }
  if (businessCanvasUiState.panDragState && event.pointerId === businessCanvasUiState.panDragState.pointerId) {
    const drag = businessCanvasUiState.panDragState;
    businessCanvasUiState.panDragState = null;
    if (drag.frameId !== null) window.cancelAnimationFrame(drag.frameId);
    const viewportElement = document.querySelector<HTMLElement>(
      `[data-business-canvas-project-id="${cssEscape(drag.projectId)}"] [data-business-canvas-viewport]`
    );
    viewportElement?.classList.remove("panning");
    viewportElement?.releasePointerCapture?.(event.pointerId);
    if (!drag.moved) return;
    updateBusinessIdeaCanvasProject(drag.projectId, (project) => ({
      ...project,
      businessIdeaCanvasMeta: {
        ...project.businessIdeaCanvasMeta,
        viewport: {
          ...project.businessIdeaCanvasMeta.viewport,
          x: Math.round(drag.previewX),
          y: Math.round(drag.previewY)
        }
      }
    }), true);
    return;
  }
  if (businessCanvasUiState.selectionDragState && event.pointerId === businessCanvasUiState.selectionDragState.pointerId) {
    const drag = businessCanvasUiState.selectionDragState;
    businessCanvasUiState.selectionDragState = null;
    const rect = businessCanvasUiState.selectionRect;
    businessCanvasUiState.selectionRect = null;
    const project = businessCanvasProjectById(drag.projectId);
    if (!project || !rect || !drag.moved) {
      clearBusinessIdeaCanvasSelection();
      renderAll();
      return;
    }
    const nodeIds = businessIdeaCanvasNodesInsideRect(project.businessIdeaCanvas, rect);
    selectBusinessIdeaCanvasNodes(drag.projectId, nodeIds);
    renderAll();
    return;
  }
  if (!businessCanvasUiState.dragState || event.pointerId !== businessCanvasUiState.dragState.pointerId) return;
  const drag = businessCanvasUiState.dragState;
  const project = businessCanvasProjectById(drag.projectId);
  if (drag.frameId !== null) window.cancelAnimationFrame(drag.frameId);
  for (const element of Object.values(drag.elements)) {
    element.classList.remove("dragging");
    element.releasePointerCapture?.(event.pointerId);
  }
  businessCanvasUiState.dragState = null;
  if (!project || !drag.moved) {
    renderAll();
    return;
  }
  businessCanvasUiState.lastDragEndAt = Date.now();
  const draggedIds = new Set(drag.nodeIds);
  updateBusinessIdeaCanvasProject(drag.projectId, (item) => ({
    ...item,
    businessIdeaCanvas: {
      ...item.businessIdeaCanvas,
      nodes: item.businessIdeaCanvas.nodes.map((node) => {
        if (!draggedIds.has(node.id)) return node;
        const preview = drag.previewNodes[node.id];
        return preview ? { ...node, ...preview } : node;
      })
    }
  }), true);
}

export function startBusinessIdeaCanvasBranchDrag(event: PointerEvent, projectId: string, branch: SVGCircleElement): void {
  const project = businessCanvasProjectById(projectId);
  const edgeId = branch.dataset.businessCanvasEdgeBranch || "";
  const edge = project?.businessIdeaCanvas.edges.find((item) => item.id === edgeId);
  if (!project || !edge) return;
  const point = {
    x: numberValue(branch.dataset.businessCanvasBranchX),
    y: numberValue(branch.dataset.businessCanvasBranchY)
  };
  const endpoint = nearestBusinessIdeaCanvasEndpointForEdge(project.businessIdeaCanvas, edge, point);
  if (!endpoint) return;
  event.preventDefault();
  businessCanvasUiState.connectionDragState = {
    projectId,
    pointerId: event.pointerId,
    fromNodeId: endpoint.nodeId,
    fromSide: endpoint.side,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startPoint: point,
    lineMenuPoint: point,
    lineMenuEdgeId: edgeId,
    previewPoint: point,
    previewTargetNodeId: null,
    previewTargetSide: null,
    frameId: null,
    moved: false
  };
  businessCanvasUiState.lineMenu = null;
  branch.setPointerCapture?.(event.pointerId);
}

export function finishBusinessIdeaCanvasConnectionDrag(event: PointerEvent): void {
  const drag = businessCanvasUiState.connectionDragState;
  if (!drag || event.pointerId !== drag.pointerId) return;
  businessCanvasUiState.connectionDragState = null;
  if (drag.frameId !== null) window.cancelAnimationFrame(drag.frameId);
  clearBusinessIdeaCanvasConnectionPreview(drag.projectId);
  const project = businessCanvasProjectById(drag.projectId);
  if (!project) return;
  if (!drag.moved && drag.lineMenuPoint) {
    businessCanvasUiState.lineMenu = { projectId: drag.projectId, edgeId: drag.lineMenuEdgeId ?? "", ...drag.lineMenuPoint };
    renderAll();
    return;
  }
  const eventTarget = businessIdeaCanvasConnectionTargetFromEvent(event, project, drag.fromNodeId);
  const targetNodeId = drag.previewTargetNodeId ?? eventTarget?.node.id ?? null;
  const targetNode = targetNodeId ? project.businessIdeaCanvas.nodes.find((node) => node.id === targetNodeId) : null;
  if (!targetNode || targetNode.type === "group" || targetNode.id === drag.fromNodeId) {
    if (drag.moved) {
      businessCanvasUiState.lineMenu = {
        projectId: drag.projectId,
        edgeId: "",
        x: drag.previewPoint.x,
        y: drag.previewPoint.y,
        fromNodeId: drag.fromNodeId,
        fromSide: drag.fromSide
      };
    }
    renderAll();
    return;
  }
  const toSide = drag.previewTargetNodeId === targetNode.id && drag.previewTargetSide
    ? drag.previewTargetSide
    : nearestBusinessIdeaCanvasNodeSide(targetNode, businessIdeaCanvasPointFromEvent(event, project));
  addBusinessIdeaCanvasEdge(project.id, drag.fromNodeId, drag.fromSide, targetNode.id, toSide, "forward");
}
