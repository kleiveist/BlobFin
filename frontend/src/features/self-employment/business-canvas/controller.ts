import { createId } from "../../../data/defaults";
import {
  businessIdeaCanvasPaletteWithCustomColor,
  businessIdeaCanvasViewportForZoomAtPoint
} from "../../../domain/businessIdeaCanvas";
import type { SelfEmploymentProject } from "../../../types";
import {
  businessCanvasProjectById,
  renderAll,
  updateBusinessIdeaCanvasProject
} from "./canvasModelController";
import {
  cancelBusinessIdeaCanvasEdgeLabelEdit,
  commitBusinessIdeaCanvasEdgeLabelEdit,
  deleteBusinessIdeaCanvasSelectedEdge
} from "./edgeController";
import { businessCanvasHost } from "./host";
import {
  cancelBusinessIdeaCanvasNodeEdit,
  deleteBusinessIdeaCanvasSelectedNode,
  finishBusinessIdeaCanvasNodeEdit
} from "./nodeController";
import {
  businessIdeaCanvasSelectedIds,
  copyBusinessIdeaCanvasSelection,
  moveBusinessIdeaCanvasSelection,
  pasteBusinessIdeaCanvasClipboard,
  selectBusinessIdeaCanvasNodes
} from "./selectionController";
import { businessCanvasUiState } from "./uiState";
import { renderBusinessIdeaCanvasEditor, type BusinessIdeaCanvasRenderState } from "./view";
import {
  businessIdeaCanvasPointFromEvent,
  businessIdeaCanvasViewportPointFromEvent,
  clearBusinessIdeaCanvasConnectionPreview,
  scheduleBusinessIdeaCanvasWheelZoom
} from "./viewportController";

export {
  createBusinessIdeaCanvasEdge,
  createBusinessIdeaCanvasTextNode,
  insertBusinessIdeaCanvasNodeIntoProject,
  updateBusinessIdeaCanvasProject
} from "./canvasModelController";
export {
  businessIdeaCanvasDragNodeIdsForNode,
  finishBusinessIdeaCanvasConnectionDrag,
  finishBusinessIdeaCanvasPointer,
  hasBusinessIdeaCanvasPointerState,
  moveBusinessIdeaCanvasPointer,
  startBusinessIdeaCanvasBranchDrag,
  startBusinessIdeaCanvasPointer
} from "./dragController";
export {
  addBusinessIdeaCanvasEdge,
  businessIdeaCanvasEndpointForLineMenuEdge,
  cancelBusinessIdeaCanvasEdgeLabelEdit,
  commitBusinessIdeaCanvasEdgeLabelEdit,
  connectBusinessIdeaCanvasArmedNode,
  deleteBusinessIdeaCanvasSelectedEdge,
  editBusinessIdeaCanvasEdgeLabel,
  editSelectedBusinessIdeaCanvasEdgeLabel,
  updateBusinessIdeaCanvasEdgeLabelDraft,
  updateBusinessIdeaCanvasSelectedEdgeField
} from "./edgeController";
export {
  addBusinessIdeaCanvasGroupAtPoint,
  addBusinessIdeaCanvasNode,
  addBusinessIdeaCanvasNodeAtPoint,
  addBusinessIdeaCanvasNodeFromLine,
  createBusinessIdeaCanvasGroupFromSelection,
  deleteBusinessIdeaCanvasSelectedNode,
  duplicateBusinessIdeaCanvasSelectedNode,
  editBusinessIdeaCanvasNode,
  cancelBusinessIdeaCanvasNodeEdit,
  finishBusinessIdeaCanvasNodeEdit,
  handleBusinessIdeaCanvasDoubleClick,
  insertBusinessIdeaCanvasNode,
  updateBusinessIdeaCanvasGroupName,
  updateBusinessIdeaCanvasNodeText,
  updateBusinessIdeaCanvasSelectedNodeField
} from "./nodeController";
export {
  closeBusinessIdeaCanvasDropdowns,
  closeBusinessIdeaCanvasOverlays,
  closeBusinessIdeaCanvasPaletteEditor
} from "./overlayController";
export {
  alignBusinessIdeaCanvasSelection,
  businessIdeaCanvasSelectedIds,
  clearBusinessIdeaCanvasSelection,
  copyBusinessIdeaCanvasSelection,
  moveBusinessIdeaCanvasSelection,
  pasteBusinessIdeaCanvasClipboard,
  selectBusinessIdeaCanvasNodes
} from "./selectionController";

export function renderBusinessCanvas(project: SelfEmploymentProject): string {
  return renderBusinessIdeaCanvasEditor(project, businessIdeaCanvasRenderState(project.id));
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
    clipboardAvailable: Boolean(businessCanvasUiState.clipboard?.nodes.length),
    ganttCollapsed: businessCanvasUiState.collapsedGanttProjectIds.includes(projectId)
  };
}

export function toggleBusinessIdeaCanvasGanttSummary(): void {
  const projectId = businessCanvasHost().getState().selfEmployment.selectedProjectId;
  if (!projectId) return;
  businessCanvasUiState.collapsedGanttProjectIds = businessCanvasUiState.collapsedGanttProjectIds.includes(projectId)
    ? businessCanvasUiState.collapsedGanttProjectIds.filter((id) => id !== projectId)
    : [...businessCanvasUiState.collapsedGanttProjectIds, projectId];
  renderAll();
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
  const target = event.target as HTMLElement | null;
  const input = target?.closest<HTMLInputElement>("[data-business-canvas-edge-label-input]");
  if (input?.dataset.businessCanvasEdgeLabelInput) {
    commitBusinessIdeaCanvasEdgeLabelEdit();
    return;
  }
  const groupNameInput = target?.closest<HTMLInputElement>("[data-business-canvas-group-name-input]");
  if (groupNameInput?.dataset.businessCanvasGroupNameInput) {
    finishBusinessIdeaCanvasNodeEdit(groupNameInput.dataset.businessCanvasGroupNameInput, groupNameInput.value);
    return;
  }
  const nodeText = target?.closest<HTMLElement>("[data-business-canvas-node-text]");
  if (nodeText?.dataset.businessCanvasNodeText) {
    finishBusinessIdeaCanvasNodeEdit(nodeText.dataset.businessCanvasNodeText, nodeText.textContent ?? "");
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
  const groupNameInput = (event.target as HTMLElement | null)?.closest<HTMLInputElement>("[data-business-canvas-group-name-input]");
  if (groupNameInput && businessCanvasUiState.editingNode) {
    if (event.key === "Enter") {
      event.preventDefault();
      finishBusinessIdeaCanvasNodeEdit(groupNameInput.dataset.businessCanvasGroupNameInput || "", groupNameInput.value);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelBusinessIdeaCanvasNodeEdit();
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
  const arrowDelta = businessIdeaCanvasArrowKeyDelta(event.key);
  const selection = businessCanvasUiState.selectedNodeIds;
  if (arrowDelta && !usesModifier && !event.altKey && selection?.nodeIds.length) {
    if (isBusinessIdeaCanvasProjectRendered(selection.projectId)) {
      const step = event.shiftKey ? 1 : 10;
      event.preventDefault();
      moveBusinessIdeaCanvasSelection(arrowDelta.x * step, arrowDelta.y * step);
      return;
    }
  }
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

function businessIdeaCanvasArrowKeyDelta(key: string): { x: number; y: number } | null {
  if (key === "ArrowUp") return { x: 0, y: -1 };
  if (key === "ArrowDown") return { x: 0, y: 1 };
  if (key === "ArrowLeft") return { x: -1, y: 0 };
  if (key === "ArrowRight") return { x: 1, y: 0 };
  return null;
}

function isBusinessIdeaCanvasProjectRendered(projectId: string): boolean {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-business-canvas-project-id]")).some(
    (element) => element.dataset.businessCanvasProjectId === projectId
  );
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
