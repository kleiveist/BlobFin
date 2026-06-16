import { createId } from "../../../data/defaults";
import {
  businessIdeaCanvasBoundsForNodes,
  snapBusinessIdeaCanvasValue
} from "../../../domain/businessIdeaCanvas";
import type { BusinessIdeaCanvasNodeMeta } from "../../../types";
import {
  businessCanvasProjectById,
  renderAll,
  updateBusinessIdeaCanvasProject
} from "./canvasModelController";
import { businessCanvasHost } from "./host";
import { businessCanvasUiState } from "./uiState";

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
