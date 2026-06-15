import { createId } from "../../../data/defaults";
import {
  BUSINESS_IDEA_CANVAS_DEFAULT_VIEWPORT,
  BUSINESS_IDEA_CANVAS_ORIGIN,
  businessIdeaCanvasBoundsForNodes,
  businessIdeaCanvasEndsForDirection,
  businessIdeaCanvasNodeText,
  businessIdeaCanvasNodesInsideRect,
  businessIdeaCanvasPaletteWithCustomColor,
  businessIdeaCanvasViewportForZoomAtPoint,
  canvasAnchorPoint,
  clampBusinessIdeaCanvasNodeSize,
  createBusinessIdeaCanvasGroupMeta,
  createBusinessIdeaCanvasGroupNode,
  nearestBusinessIdeaCanvasEndpointForEdge,
  nearestBusinessIdeaCanvasNodeSide,
  snapBusinessIdeaCanvasValue
} from "../../../domain/businessIdeaCanvas";
import { normalizeSelfEmploymentGanttPlan } from "../../../domain/selfEmploymentGantt";
import { numberValue } from "../../../lib/format";
import type {
  BusinessIdeaCanvasEdgeDirection,
  BusinessIdeaCanvasNodeMeta,
  BusinessIdeaCanvasShape,
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
import { renderBusinessIdeaCanvasEditor, type BusinessIdeaCanvasRenderState } from "./view";

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

export function renderBusinessCanvas(project: SelfEmploymentProject): string {
  return renderBusinessIdeaCanvasEditor(project, businessIdeaCanvasRenderState(project.id));
}

export function closeBusinessIdeaCanvasPaletteEditor(): void {
  businessCanvasUiState.paletteEditor = null;
  renderAll();
}

export function editSelectedBusinessIdeaCanvasEdgeLabel(): void {
  const selection = businessCanvasUiState.selectedEdge;
  if (selection) editBusinessIdeaCanvasEdgeLabel(selection.projectId, selection.edgeId);
}

export function addBusinessIdeaCanvasNodeAtPoint(point: { x: number; y: number }): void {
  const projectId = businessCanvasHost().getState().selfEmployment.selectedProjectId;
  const project = businessCanvasProjectById(projectId);
  if (!project) return;
  const node = createBusinessIdeaCanvasTextNode(project, point, "Neue Karte");
  businessCanvasUiState.contextMenu = null;
  insertBusinessIdeaCanvasNode(projectId, node, true);
}

export function hasBusinessIdeaCanvasPointerState(): boolean {
  return Boolean(
    businessCanvasUiState.dragState ||
      businessCanvasUiState.connectionDragState ||
      businessCanvasUiState.selectionDragState ||
      businessCanvasUiState.panDragState
  );
}

export function businessIdeaCanvasRenderState(projectId: string): BusinessIdeaCanvasRenderState {
  return {
    selectedNodeIds: businessCanvasUiState.selectedNodeIds?.projectId === projectId ? businessCanvasUiState.selectedNodeIds.nodeIds : [],
    selectedEdgeId: businessCanvasUiState.selectedEdge?.projectId === projectId ? businessCanvasUiState.selectedEdge.edgeId : null,
    editingNodeId: businessCanvasUiState.editingNode?.projectId === projectId ? businessCanvasUiState.editingNode.nodeId : null,
    editingEdgeLabelId: businessCanvasUiState.editingEdgeLabel?.projectId === projectId ? businessCanvasUiState.editingEdgeLabel.edgeId : null,
    editingEdgeLabelDraft: businessCanvasUiState.editingEdgeLabel?.projectId === projectId ? businessCanvasUiState.editingEdgeLabel.draft : "",
    armedNodeId: businessCanvasUiState.armedConnection?.projectId === projectId ? businessCanvasUiState.armedConnection.nodeId : null,
    lineMenu: businessCanvasUiState.lineMenu?.projectId === projectId ? businessCanvasUiState.lineMenu : null,
    selectionRect: businessCanvasUiState.selectionRect?.projectId === projectId ? businessCanvasUiState.selectionRect : null,
    contextMenu: businessCanvasUiState.contextMenu?.projectId === projectId ? businessCanvasUiState.contextMenu : null,
    palettePopover: businessCanvasUiState.palettePopover?.projectId === projectId ? businessCanvasUiState.palettePopover : null,
    paletteEditor: businessCanvasUiState.paletteEditor?.projectId === projectId ? businessCanvasUiState.paletteEditor : null,
    clipboardAvailable: Boolean(businessCanvasUiState.clipboard?.nodes.length)
  };
}

export function businessIdeaCanvasSelectedIds(projectId: string): string[] {
  return businessCanvasUiState.selectedNodeIds?.projectId === projectId ? businessCanvasUiState.selectedNodeIds.nodeIds : [];
}

export function selectBusinessIdeaCanvasNodes(projectId: string, nodeIds: string[]): void {
  const uniqueIds = Array.from(new Set(nodeIds.filter(Boolean)));
  businessCanvasUiState.selectedNodeIds = uniqueIds.length ? { projectId, nodeIds: uniqueIds } : null;
  businessCanvasUiState.selectedEdge = null;
  businessCanvasUiState.editingEdgeLabel = null;
  businessCanvasUiState.contextMenu = null;
}

export function clearBusinessIdeaCanvasSelection(): void {
  businessCanvasUiState.selectedNodeIds = null;
  businessCanvasUiState.selectedEdge = null;
  businessCanvasUiState.editingNode = null;
  businessCanvasUiState.editingEdgeLabel = null;
  businessCanvasUiState.armedConnection = null;
  businessCanvasUiState.lineMenu = null;
}

export function closeBusinessIdeaCanvasOverlays(): void {
  businessCanvasUiState.contextMenu = null;
  businessCanvasUiState.palettePopover = null;
  businessCanvasUiState.paletteEditor = null;
  closeBusinessIdeaCanvasDropdowns();
}

export function closeBusinessIdeaCanvasDropdowns(except?: HTMLDetailsElement): void {
  for (const dropdown of document.querySelectorAll<HTMLDetailsElement>("[data-business-canvas-dropdown][open]")) {
    if (dropdown !== except) dropdown.open = false;
  }
}

export function updateBusinessIdeaCanvasNodeText(nodeId: string, text: string): void {
  const projectId = businessCanvasUiState.editingNode?.projectId ?? businessCanvasHost().getState().selfEmployment.selectedProjectId;
  updateBusinessIdeaCanvasProject(projectId, (project) => ({
    ...project,
    idea: project.businessIdeaCanvas.nodes[0]?.id === nodeId ? text : project.idea,
    businessIdeaCanvas: {
      ...project.businessIdeaCanvas,
      nodes: project.businessIdeaCanvas.nodes.map((node) =>
        node.id === nodeId && node.type === "text" ? { ...node, text } : node
      )
    }
  }));
}

export function updateBusinessIdeaCanvasMetaField(field: string, value: string): void {
  const projectId = businessCanvasHost().getState().selfEmployment.selectedProjectId;
  updateBusinessIdeaCanvasProject(projectId, (project) => {
    if (field !== "activeLabelId" && field !== "activePhaseId") return project;
    return {
      ...project,
      businessIdeaCanvasMeta: {
        ...project.businessIdeaCanvasMeta,
        [field]: value
      }
    };
  }, true);
}

export function updateBusinessIdeaCanvasGridField(field: string, value: string | boolean): void {
  const projectId = businessCanvasHost().getState().selfEmployment.selectedProjectId;
  updateBusinessIdeaCanvasProject(projectId, (project) => {
    if (field !== "snap") return project;
    return {
      ...project,
      businessIdeaCanvasMeta: {
        ...project.businessIdeaCanvasMeta,
        grid: {
          ...project.businessIdeaCanvasMeta.grid,
          snap: Boolean(value)
        }
      }
    };
  }, true);
}

export function updateBusinessIdeaCanvasSelectedNodeField(field: string, value: string): void {
  const selection = businessCanvasUiState.selectedNodeIds;
  if (!selection?.nodeIds.length) return;
  const selectedIds = new Set(selection.nodeIds);
  updateBusinessIdeaCanvasProject(selection.projectId, (project) => {
    const selectedNodes = project.businessIdeaCanvas.nodes.filter((node) => selectedIds.has(node.id));
    if (!selectedNodes.length) return project;
    if (field === "color") {
      const nextGroupMeta = { ...project.businessIdeaCanvasMeta.groupMeta };
      for (const node of selectedNodes) {
        if (node.type === "group" && nextGroupMeta[node.id]) {
          nextGroupMeta[node.id] = { ...nextGroupMeta[node.id], color: value };
        }
      }
      return {
        ...project,
        businessIdeaCanvas: {
          ...project.businessIdeaCanvas,
          nodes: project.businessIdeaCanvas.nodes.map((node) => (selectedIds.has(node.id) ? { ...node, color: value } : node))
        },
        businessIdeaCanvasMeta: {
          ...project.businessIdeaCanvasMeta,
          groupMeta: nextGroupMeta
        }
      };
    }
    if (field === "shape" || field === "labelId" || field === "phaseId") {
      const nextNodeMeta = { ...project.businessIdeaCanvasMeta.nodeMeta };
      for (const node of selectedNodes) {
        if (node.type === "group") continue;
        const currentMeta = nextNodeMeta[node.id] ?? {
          labelId: project.businessIdeaCanvasMeta.activeLabelId,
          phaseId: project.businessIdeaCanvasMeta.activePhaseId,
          shape: "rounded-rectangle"
        };
        nextNodeMeta[node.id] =
          field === "shape"
            ? { ...currentMeta, shape: value as BusinessIdeaCanvasShape }
            : field === "labelId"
              ? { ...currentMeta, labelId: value }
              : { ...currentMeta, phaseId: value };
      }
      return {
        ...project,
        businessIdeaCanvasMeta: {
          ...project.businessIdeaCanvasMeta,
          nodeMeta: nextNodeMeta
        }
      };
    }
    return project;
  }, true);
}

export function updateBusinessIdeaCanvasSelectedEdgeField(field: string, value: string): void {
  const selection = businessCanvasUiState.selectedEdge;
  if (!selection) return;
  updateBusinessIdeaCanvasProject(selection.projectId, (project) => ({
    ...project,
    businessIdeaCanvas: {
      ...project.businessIdeaCanvas,
      edges: project.businessIdeaCanvas.edges.map((edge) => {
        if (edge.id !== selection.edgeId) return edge;
        if (field === "label") return { ...edge, label: value.trim() || undefined };
        if (field === "direction") {
          const direction: BusinessIdeaCanvasEdgeDirection =
            value === "none" || value === "backward" || value === "both" || value === "forward" ? value : "forward";
          const ends = businessIdeaCanvasEndsForDirection(direction);
          return { ...edge, fromEnd: ends.fromEnd, toEnd: ends.toEnd };
        }
        return edge;
      })
    }
  }), true);
}

export function addBusinessIdeaCanvasNode(): void {
  const projectId = businessCanvasHost().getState().selfEmployment.selectedProjectId;
  const project = businessCanvasProjectById(projectId);
  if (!project) return;
  const node = createBusinessIdeaCanvasTextNode(project, businessIdeaCanvasVisibleTopLeft(project), "Neue Karte");
  insertBusinessIdeaCanvasNode(projectId, node, true);
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

export function duplicateBusinessIdeaCanvasSelectedNode(): void {
  if (copyBusinessIdeaCanvasSelection()) pasteBusinessIdeaCanvasClipboard();
}

export function deleteBusinessIdeaCanvasSelectedNode(): void {
  const selection = businessCanvasUiState.selectedNodeIds;
  if (!selection?.nodeIds.length) return;
  const selectedIds = new Set(selection.nodeIds);
  updateBusinessIdeaCanvasProject(selection.projectId, (project) => {
    const nextNodeMeta = { ...project.businessIdeaCanvasMeta.nodeMeta };
    const nextGroupMeta = { ...project.businessIdeaCanvasMeta.groupMeta };
    for (const nodeId of selectedIds) {
      delete nextNodeMeta[nodeId];
      delete nextGroupMeta[nodeId];
    }
    for (const [groupId, groupMeta] of Object.entries(nextGroupMeta)) {
      nextGroupMeta[groupId] = {
        ...groupMeta,
        nodeIds: groupMeta.nodeIds.filter((nodeId) => !selectedIds.has(nodeId))
      };
    }
    return {
      ...project,
      businessIdeaCanvas: {
        ...project.businessIdeaCanvas,
        nodes: project.businessIdeaCanvas.nodes.filter((node) => !selectedIds.has(node.id)),
        edges: project.businessIdeaCanvas.edges.filter(
          (edge) => !selectedIds.has(edge.fromNode) && !selectedIds.has(edge.toNode)
        )
      },
      businessIdeaCanvasMeta: {
        ...project.businessIdeaCanvasMeta,
        nodeMeta: nextNodeMeta,
        groupMeta: nextGroupMeta
      }
    };
  }, true);
  businessCanvasUiState.selectedNodeIds = null;
  businessCanvasUiState.editingNode = null;
  businessCanvasUiState.editingEdgeLabel = null;
  businessCanvasUiState.armedConnection = null;
  businessCanvasUiState.contextMenu = null;
  businessCanvasUiState.palettePopover = null;
  businessCanvasHost().clearGanttEditorForDeletedNodes(selectedIds);
}

export function deleteBusinessIdeaCanvasSelectedEdge(): void {
  const selection = businessCanvasUiState.selectedEdge;
  if (!selection) return;
  updateBusinessIdeaCanvasProject(selection.projectId, (project) => ({
    ...project,
    businessIdeaCanvas: {
      ...project.businessIdeaCanvas,
      edges: project.businessIdeaCanvas.edges.filter((edge) => edge.id !== selection.edgeId)
    }
  }), true);
  businessCanvasUiState.selectedEdge = null;
  businessCanvasUiState.editingEdgeLabel = null;
}

export function addBusinessIdeaCanvasNodeFromLine(edgeId: string): void {
  const lineMenu = businessCanvasUiState.lineMenu;
  if (!lineMenu || lineMenu.edgeId !== edgeId) return;
  const project = businessCanvasProjectById(lineMenu.projectId);
  if (!project) return;
  const endpoint = lineMenu.fromNodeId && lineMenu.fromSide
    ? { nodeId: lineMenu.fromNodeId, side: lineMenu.fromSide }
    : businessIdeaCanvasEndpointForLineMenuEdge(project, edgeId, lineMenu);
  if (!endpoint) return;
  const sourceNode = project.businessIdeaCanvas.nodes.find((nodeItem) => nodeItem.id === endpoint.nodeId);
  const nodePoint = lineMenu.fromNodeId
    ? { x: lineMenu.x - 120, y: lineMenu.y - 55 }
    : { x: lineMenu.x + 70, y: lineMenu.y + 70 };
  const node = createBusinessIdeaCanvasTextNode(project, nodePoint, "Neue Karte");
  const toSide = sourceNode ? nearestBusinessIdeaCanvasNodeSide(node, canvasAnchorPoint(sourceNode, endpoint.side)) : "left";
  businessCanvasUiState.selectedNodeIds = { projectId: project.id, nodeIds: [node.id] };
  updateBusinessIdeaCanvasProject(project.id, (item) => ({
    ...insertBusinessIdeaCanvasNodeIntoProject(item, node),
    businessIdeaCanvas: {
      ...item.businessIdeaCanvas,
      nodes: [...item.businessIdeaCanvas.nodes, node],
      edges: [
        ...item.businessIdeaCanvas.edges,
        createBusinessIdeaCanvasEdge(endpoint.nodeId, endpoint.side, node.id, toSide, "forward")
      ]
    }
  }), true);
  businessCanvasUiState.lineMenu = null;
}

export function businessIdeaCanvasEndpointForLineMenuEdge(
  project: SelfEmploymentProject,
  edgeId: string,
  point: { x: number; y: number }
): { nodeId: string; side: JsonCanvasSide } | null {
  const edge = project.businessIdeaCanvas.edges.find((item) => item.id === edgeId);
  return edge ? nearestBusinessIdeaCanvasEndpointForEdge(project.businessIdeaCanvas, edge, point) : null;
}

export function handleBusinessIdeaCanvasDoubleClick(event: MouseEvent): void {
  if (Date.now() - businessCanvasUiState.lastDragEndAt < 350) return;
  const target = event.target as HTMLElement | null;
  if (!target?.closest("[data-business-canvas-node-text], .business-canvas-group-title")) return;
  const nodeElement = target.closest<HTMLElement>("[data-business-canvas-node-id]");
  if (!nodeElement?.dataset.businessCanvasNodeId) return;
  const projectId = nodeElement.closest<HTMLElement>("[data-business-canvas-project-id]")?.dataset.businessCanvasProjectId;
  const project = projectId ? businessCanvasProjectById(projectId) : null;
  const node = project?.businessIdeaCanvas.nodes.find((item) => item.id === nodeElement.dataset.businessCanvasNodeId);
  if (!projectId || !node || node.type !== "text") return;
  event.preventDefault();
  editBusinessIdeaCanvasNode(node.id);
}

export function editBusinessIdeaCanvasNode(nodeId: string): void {
  const projectId = businessCanvasUiState.selectedNodeIds?.projectId ?? businessCanvasHost().getState().selfEmployment.selectedProjectId;
  const project = businessCanvasProjectById(projectId);
  const node = project?.businessIdeaCanvas.nodes.find((item) => item.id === nodeId);
  if (!project || !node || node.type !== "text") return;
  businessCanvasUiState.selectedNodeIds = { projectId, nodeIds: [nodeId] };
  businessCanvasUiState.selectedEdge = null;
  businessCanvasUiState.editingNode = { projectId, nodeId };
  closeBusinessIdeaCanvasOverlays();
  renderAll();
  window.setTimeout(() => {
    const editor = document.querySelector<HTMLElement>(
      `[data-business-canvas-node-text="${cssEscape(nodeId)}"]`
    );
    editor?.focus();
  }, 0);
}

export function handleBusinessIdeaCanvasContextMenu(event: MouseEvent): void {
  const target = event.target as HTMLElement | null;
  const editor = target?.closest<HTMLElement>(".business-canvas-editor");
  if (!editor) return;
  if (!target?.closest("[data-business-canvas-viewport]")) return;
  const projectId = editor.dataset.businessCanvasProjectId;
  const project = projectId ? businessCanvasProjectById(projectId) : null;
  if (!projectId || !project) return;
  event.preventDefault();
  const point = businessIdeaCanvasPointFromEvent(event, project);
  const nodeElement = target?.closest<HTMLElement>("[data-business-canvas-node-id]");
  const selectedIds = businessIdeaCanvasSelectedIds(projectId);
  if (nodeElement?.dataset.businessCanvasNodeId) {
    const nodeId = nodeElement.dataset.businessCanvasNodeId;
    const isMultiSelection = selectedIds.length >= 2 && selectedIds.includes(nodeId);
    if (!isMultiSelection) selectBusinessIdeaCanvasNodes(projectId, [nodeId]);
    businessCanvasUiState.contextMenu = {
      projectId,
      mode: isMultiSelection ? "selection" : "node",
      nodeId,
      x: event.clientX,
      y: event.clientY,
      canvasX: point.x,
      canvasY: point.y
    };
  } else {
    businessCanvasUiState.contextMenu = {
      projectId,
      mode: "canvas",
      x: event.clientX,
      y: event.clientY,
      canvasX: point.x,
      canvasY: point.y
    };
    businessCanvasUiState.selectedEdge = null;
  }
  businessCanvasUiState.palettePopover = null;
  renderAll();
}

export function handleBusinessIdeaCanvasWheel(event: WheelEvent): void {
  if (!event.ctrlKey) return;
  const target = event.target as HTMLElement | null;
  const viewport = target?.closest<HTMLElement>("[data-business-canvas-viewport]");
  const projectId = viewport?.closest<HTMLElement>("[data-business-canvas-project-id]")?.dataset.businessCanvasProjectId;
  if (!viewport || !projectId) return;
  const project = businessCanvasProjectById(projectId);
  const viewportPoint = project ? businessIdeaCanvasViewportPointFromEvent(event, projectId) : null;
  if (!project || !viewportPoint) return;
  event.preventDefault();
  const current = businessCanvasUiState.wheelZoomState?.projectId === projectId
    ? businessCanvasUiState.wheelZoomState.viewport
    : project.businessIdeaCanvasMeta.viewport;
  const delta = event.deltaY > 0 ? -0.06 : 0.06;
  const nextViewport = businessIdeaCanvasViewportForZoomAtPoint(current, viewportPoint, current.zoom + delta);
  scheduleBusinessIdeaCanvasWheelZoom(projectId, nextViewport);
}

export function handleBusinessIdeaCanvasFocusOut(event: FocusEvent): void {
  const input = (event.target as HTMLElement | null)?.closest<HTMLInputElement>("[data-business-canvas-edge-label-input]");
  if (input?.dataset.businessCanvasEdgeLabelInput) {
    commitBusinessIdeaCanvasEdgeLabelEdit();
  }
}

export function handleBusinessIdeaCanvasKeyDown(event: KeyboardEvent): void {
  const edgeLabelInput = (event.target as HTMLElement | null)?.closest<HTMLInputElement>("[data-business-canvas-edge-label-input]");
  if (edgeLabelInput && businessCanvasUiState.editingEdgeLabel) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitBusinessIdeaCanvasEdgeLabelEdit();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelBusinessIdeaCanvasEdgeLabelEdit();
      return;
    }
  }
  if (event.code === "Space" && !isBusinessIdeaCanvasEditableFocus()) {
    businessCanvasUiState.spacePressed = true;
    if (document.querySelector(".business-canvas-viewport:hover")) event.preventDefault();
  }
  if (isBusinessIdeaCanvasEditableFocus()) return;
  const hasCanvasFocus = Boolean(document.querySelector(".business-canvas-editor"));
  if (!hasCanvasFocus) return;
  const usesModifier = event.ctrlKey || event.metaKey;
  if (usesModifier && event.key.toLowerCase() === "c" && businessCanvasUiState.selectedNodeIds?.nodeIds.length) {
    event.preventDefault();
    copyBusinessIdeaCanvasSelection();
    return;
  }
  if (usesModifier && event.key.toLowerCase() === "v" && businessCanvasUiState.clipboard?.nodes.length) {
    event.preventDefault();
    pasteBusinessIdeaCanvasClipboard();
    return;
  }
  if ((event.key === "Delete" || event.key === "Backspace") && businessCanvasUiState.selectedNodeIds?.nodeIds.length) {
    event.preventDefault();
    deleteBusinessIdeaCanvasSelectedNode();
    return;
  }
  if ((event.key === "Delete" || event.key === "Backspace") && businessCanvasUiState.selectedEdge) {
    event.preventDefault();
    deleteBusinessIdeaCanvasSelectedEdge();
    return;
  }
  if (event.key === "Escape") {
    businessCanvasUiState.selectionDragState = null;
    businessCanvasUiState.selectionRect = null;
    businessCanvasUiState.contextMenu = null;
    businessCanvasUiState.palettePopover = null;
    businessCanvasUiState.paletteEditor = null;
    businessCanvasUiState.armedConnection = null;
    businessCanvasUiState.lineMenu = null;
    businessCanvasUiState.editingNode = null;
    businessCanvasUiState.editingEdgeLabel = null;
    clearBusinessIdeaCanvasConnectionPreview();
    renderAll();
  }
}

export function handleBusinessIdeaCanvasKeyUp(event: KeyboardEvent): void {
  if (event.code === "Space") businessCanvasUiState.spacePressed = false;
}

export function isBusinessIdeaCanvasEditableFocus(): boolean {
  const active = document.activeElement as HTMLElement | null;
  if (!active) return false;
  const tagName = active.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || active.isContentEditable;
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

export function connectBusinessIdeaCanvasArmedNode(project: SelfEmploymentProject, targetNode: JsonCanvasNode, point: { x: number; y: number }): void {
  const armed = businessCanvasUiState.armedConnection;
  if (!armed || armed.projectId !== project.id || targetNode.type === "group" || armed.nodeId === targetNode.id) return;
  addBusinessIdeaCanvasEdge(project.id, armed.nodeId, armed.side, targetNode.id, nearestBusinessIdeaCanvasNodeSide(targetNode, point), "forward");
  businessCanvasUiState.armedConnection = null;
}

export function editBusinessIdeaCanvasEdgeLabel(projectId: string, edgeId: string): void {
  const project = businessCanvasProjectById(projectId);
  const edge = project?.businessIdeaCanvas.edges.find((item) => item.id === edgeId);
  if (!project || !edge) return;
  const currentLabel = edge.label ?? "";
  businessCanvasUiState.selectedNodeIds = null;
  businessCanvasUiState.selectedEdge = { projectId, edgeId };
  businessCanvasUiState.editingNode = null;
  businessCanvasUiState.editingEdgeLabel = { projectId, edgeId, draft: currentLabel };
  businessCanvasUiState.lineMenu = null;
  closeBusinessIdeaCanvasOverlays();
  renderAll();
  window.setTimeout(() => {
    const input = document.querySelector<HTMLInputElement>(
      `[data-business-canvas-edge-label-input="${cssEscape(edgeId)}"]`
    );
    input?.focus();
    input?.select();
  }, 0);
}

export function updateBusinessIdeaCanvasEdgeLabelDraft(edgeId: string, value: string): void {
  if (!businessCanvasUiState.editingEdgeLabel || businessCanvasUiState.editingEdgeLabel.edgeId !== edgeId) return;
  businessCanvasUiState.editingEdgeLabel = {
    ...businessCanvasUiState.editingEdgeLabel,
    draft: value
  };
}

export function commitBusinessIdeaCanvasEdgeLabelEdit(): void {
  const edit = businessCanvasUiState.editingEdgeLabel;
  if (!edit) return;
  const label = edit.draft.trim();
  businessCanvasUiState.editingEdgeLabel = null;
  updateBusinessIdeaCanvasProject(edit.projectId, (item) => ({
    ...item,
    businessIdeaCanvas: {
      ...item.businessIdeaCanvas,
      edges: item.businessIdeaCanvas.edges.map((canvasEdge) =>
        canvasEdge.id === edit.edgeId ? { ...canvasEdge, label: label || undefined } : canvasEdge
      )
    }
  }), true);
}

export function cancelBusinessIdeaCanvasEdgeLabelEdit(): void {
  if (!businessCanvasUiState.editingEdgeLabel) return;
  businessCanvasUiState.editingEdgeLabel = null;
  renderAll();
}

export function insertBusinessIdeaCanvasNode(projectId: string, node: JsonCanvasNode, renderAfterUpdate: boolean): void {
  businessCanvasUiState.selectedNodeIds = { projectId, nodeIds: [node.id] };
  businessCanvasUiState.selectedEdge = null;
  updateBusinessIdeaCanvasProject(projectId, (project) => insertBusinessIdeaCanvasNodeIntoProject(project, node), renderAfterUpdate);
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

export function addBusinessIdeaCanvasGroupAtPoint(point: { x: number; y: number }): void {
  const projectId = businessCanvasHost().getState().selfEmployment.selectedProjectId;
  const project = businessCanvasProjectById(projectId);
  if (!project) return;
  const groupId = createId();
  const groupNode: JsonCanvasNode = {
    id: groupId,
    type: "group",
    label: "Neue Gruppe",
    x: snapBusinessIdeaCanvasValue(point.x, project.businessIdeaCanvasMeta.grid),
    y: snapBusinessIdeaCanvasValue(point.y, project.businessIdeaCanvasMeta.grid),
    width: 320,
    height: 220,
    color: "4"
  };
  businessCanvasUiState.selectedNodeIds = { projectId, nodeIds: [groupId] };
  businessCanvasUiState.selectedEdge = null;
  updateBusinessIdeaCanvasProject(projectId, (item) => ({
    ...item,
    businessIdeaCanvas: {
      ...item.businessIdeaCanvas,
      nodes: [...item.businessIdeaCanvas.nodes, groupNode]
    },
    businessIdeaCanvasMeta: {
      ...item.businessIdeaCanvasMeta,
      groupMeta: {
        ...item.businessIdeaCanvasMeta.groupMeta,
        [groupId]: { nodeIds: [], name: "Neue Gruppe", color: "4" }
      }
    }
  }), true);
}

export function createBusinessIdeaCanvasGroupFromSelection(): void {
  const selection = businessCanvasUiState.selectedNodeIds;
  if (!selection?.nodeIds.length) return;
  const project = businessCanvasProjectById(selection.projectId);
  if (!project) return;
  const selectedIds = new Set(selection.nodeIds);
  const nodes = project.businessIdeaCanvas.nodes.filter((node) => node.type !== "group" && selectedIds.has(node.id));
  if (nodes.length < 2) return;
  const groupId = createId();
  const groupName = `Gruppe ${Object.keys(project.businessIdeaCanvasMeta.groupMeta).length + 1}`;
  const groupNode = createBusinessIdeaCanvasGroupNode(groupId, nodes, groupName, "4");
  if (!groupNode) return;
  businessCanvasUiState.selectedNodeIds = { projectId: project.id, nodeIds: [groupId] };
  updateBusinessIdeaCanvasProject(project.id, (item) => ({
    ...item,
    businessIdeaCanvas: {
      ...item.businessIdeaCanvas,
      nodes: [...item.businessIdeaCanvas.nodes, groupNode]
    },
    businessIdeaCanvasMeta: {
      ...item.businessIdeaCanvasMeta,
      groupMeta: {
        ...item.businessIdeaCanvasMeta.groupMeta,
        [groupId]: createBusinessIdeaCanvasGroupMeta(groupNode, nodes.map((node) => node.id), groupName)
      }
    }
  }), true);
}

export function copyBusinessIdeaCanvasSelection(): boolean {
  const selection = businessCanvasUiState.selectedNodeIds;
  if (!selection?.nodeIds.length) return false;
  const project = businessCanvasProjectById(selection.projectId);
  if (!project) return false;
  const selectedIds = new Set(selection.nodeIds);
  const nodes = project.businessIdeaCanvas.nodes
    .filter((node) => node.type !== "group" && selectedIds.has(node.id))
    .map((node) => ({ ...node }));
  if (!nodes.length) {
    businessCanvasUiState.clipboard = null;
    businessCanvasUiState.contextMenu = null;
    renderAll();
    return false;
  }
  const nodeMeta: Record<string, BusinessIdeaCanvasNodeMeta> = {};
  for (const node of nodes) {
    nodeMeta[node.id] = {
      ...(project.businessIdeaCanvasMeta.nodeMeta[node.id] ?? {
        labelId: project.businessIdeaCanvasMeta.activeLabelId,
        phaseId: project.businessIdeaCanvasMeta.activePhaseId,
        shape: "rounded-rectangle"
      })
    };
  }
  businessCanvasUiState.clipboard = { nodes, nodeMeta };
  businessCanvasUiState.contextMenu = null;
  renderAll();
  return true;
}

export function pasteBusinessIdeaCanvasClipboard(point?: { x: number; y: number }): void {
  const projectId = businessCanvasHost().getState().selfEmployment.selectedProjectId;
  const project = businessCanvasProjectById(projectId);
  if (!project || !businessCanvasUiState.clipboard?.nodes.length) return;
  const bounds = businessIdeaCanvasBoundsForNodes(businessCanvasUiState.clipboard.nodes);
  const offsetX = point && bounds ? point.x - bounds.x : 24;
  const offsetY = point && bounds ? point.y - bounds.y : 24;
  const idMap = new Map<string, string>();
  const nodes = businessCanvasUiState.clipboard.nodes.map((node) => {
    const id = createId();
    idMap.set(node.id, id);
    return {
      ...node,
      id,
      x: snapBusinessIdeaCanvasValue(node.x + offsetX, project.businessIdeaCanvasMeta.grid),
      y: snapBusinessIdeaCanvasValue(node.y + offsetY, project.businessIdeaCanvasMeta.grid)
    };
  });
  const nextNodeMeta: Record<string, BusinessIdeaCanvasNodeMeta> = {};
  for (const node of businessCanvasUiState.clipboard.nodes) {
    const id = idMap.get(node.id);
    if (!id) continue;
    nextNodeMeta[id] = {
      ...(businessCanvasUiState.clipboard.nodeMeta[node.id] ?? {
        labelId: project.businessIdeaCanvasMeta.activeLabelId,
        phaseId: project.businessIdeaCanvasMeta.activePhaseId,
        shape: "rounded-rectangle"
      })
    };
  }
  businessCanvasUiState.selectedNodeIds = { projectId, nodeIds: nodes.map((node) => node.id) };
  businessCanvasUiState.selectedEdge = null;
  businessCanvasUiState.contextMenu = null;
  businessCanvasUiState.palettePopover = null;
  updateBusinessIdeaCanvasProject(projectId, (item) => ({
    ...item,
    businessIdeaCanvas: {
      ...item.businessIdeaCanvas,
      nodes: [...item.businessIdeaCanvas.nodes, ...nodes]
    },
    businessIdeaCanvasMeta: {
      ...item.businessIdeaCanvasMeta,
      nodeMeta: {
        ...item.businessIdeaCanvasMeta.nodeMeta,
        ...nextNodeMeta
      }
    }
  }), true);
}

export function alignBusinessIdeaCanvasSelection(axis: "left" | "top"): void {
  const selection = businessCanvasUiState.selectedNodeIds;
  if (!selection?.nodeIds.length) return;
  const project = businessCanvasProjectById(selection.projectId);
  if (!project) return;
  const selectedIds = new Set(selection.nodeIds);
  const nodes = project.businessIdeaCanvas.nodes.filter((node) => selectedIds.has(node.id));
  if (nodes.length < 2) return;
  const value = axis === "left" ? Math.min(...nodes.map((node) => node.x)) : Math.min(...nodes.map((node) => node.y));
  updateBusinessIdeaCanvasProject(selection.projectId, (item) => ({
    ...item,
    businessIdeaCanvas: {
      ...item.businessIdeaCanvas,
      nodes: item.businessIdeaCanvas.nodes.map((node) =>
        selectedIds.has(node.id) ? { ...node, ...(axis === "left" ? { x: value } : { y: value }) } : node
      )
    }
  }), true);
}

export function openBusinessIdeaCanvasPalette(button: HTMLElement): void {
  const projectId = button.closest<HTMLElement>("[data-business-canvas-project-id]")?.dataset.businessCanvasProjectId;
  if (!projectId) return;
  const idsFromButton = (button.dataset.businessCanvasPaletteNodeIds || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const targetNodeIds = idsFromButton.length ? idsFromButton : businessIdeaCanvasSelectedIds(projectId);
  if (!targetNodeIds.length) return;
  const rect = button.getBoundingClientRect();
  businessCanvasUiState.palettePopover = {
    projectId,
    targetNodeIds,
    x: Math.round(rect.left),
    y: Math.round(rect.bottom + 6)
  };
  businessCanvasUiState.contextMenu = null;
  renderAll();
}

export function applyBusinessIdeaCanvasPaletteColor(color: string): void {
  const popover = businessCanvasUiState.palettePopover;
  const projectId = popover?.projectId ?? businessCanvasHost().getState().selfEmployment.selectedProjectId;
  const targetNodeIds = popover?.targetNodeIds.length ? popover.targetNodeIds : businessIdeaCanvasSelectedIds(projectId);
  if (!targetNodeIds.length) return;
  const selectedIds = new Set(targetNodeIds);
  updateBusinessIdeaCanvasProject(projectId, (project) => {
    const nextGroupMeta = { ...project.businessIdeaCanvasMeta.groupMeta };
    for (const node of project.businessIdeaCanvas.nodes) {
      if (node.type === "group" && selectedIds.has(node.id) && nextGroupMeta[node.id]) {
        nextGroupMeta[node.id] = { ...nextGroupMeta[node.id], color };
      }
    }
    return {
      ...project,
      businessIdeaCanvas: {
        ...project.businessIdeaCanvas,
        nodes: project.businessIdeaCanvas.nodes.map((node) => (selectedIds.has(node.id) ? { ...node, color } : node))
      },
      businessIdeaCanvasMeta: {
        ...project.businessIdeaCanvasMeta,
        groupMeta: nextGroupMeta
      }
    };
  }, true);
  businessCanvasUiState.palettePopover = null;
}

export function openBusinessIdeaCanvasPaletteEditor(): void {
  const projectId = businessCanvasUiState.palettePopover?.projectId ?? businessCanvasHost().getState().selfEmployment.selectedProjectId;
  businessCanvasUiState.paletteEditor = {
    projectId,
    name: "Neue Farbe",
    color: "#64748b"
  };
  renderAll();
}

export function updateBusinessIdeaCanvasPaletteDraft(field: string, value: string): void {
  if (!businessCanvasUiState.paletteEditor) return;
  if (field !== "name" && field !== "color") return;
  businessCanvasUiState.paletteEditor = {
    ...businessCanvasUiState.paletteEditor,
    [field]: value,
    error: undefined
  };
}

export function saveBusinessIdeaCanvasPaletteColor(): void {
  const editor = businessCanvasUiState.paletteEditor;
  if (!editor) return;
  const name = editor.name.trim();
  const color = editor.color.trim();
  if (!name || !/^#[0-9a-fA-F]{6}$/.test(color)) {
    businessCanvasUiState.paletteEditor = { ...editor, error: "Name und Hex-Farbe werden benoetigt." };
    renderAll();
    return;
  }
  updateBusinessIdeaCanvasProject(editor.projectId, (project) => ({
    ...project,
    businessIdeaCanvasMeta: {
      ...project.businessIdeaCanvasMeta,
      palette: businessIdeaCanvasPaletteWithCustomColor(project.businessIdeaCanvasMeta.palette, { id: createId(), name, color })
    }
  }), true);
  businessCanvasUiState.paletteEditor = null;
}

export function addBusinessIdeaCanvasEdge(
  projectId: string,
  fromNode: string,
  fromSide: JsonCanvasSide,
  toNode: string,
  toSide: JsonCanvasSide,
  direction: BusinessIdeaCanvasEdgeDirection
): void {
  updateBusinessIdeaCanvasProject(projectId, (project) => ({
    ...project,
    businessIdeaCanvas: {
      ...project.businessIdeaCanvas,
      edges: [
        ...project.businessIdeaCanvas.edges,
        createBusinessIdeaCanvasEdge(fromNode, fromSide, toNode, toSide, direction)
      ]
    }
  }), true);
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

export function updateBusinessIdeaCanvasProject(
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
