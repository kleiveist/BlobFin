import {
  businessIdeaCanvasEndsForDirection,
  nearestBusinessIdeaCanvasEndpointForEdge,
  nearestBusinessIdeaCanvasNodeSide
} from "../../../domain/businessIdeaCanvas";
import type {
  BusinessIdeaCanvasEdgeDirection,
  JsonCanvasNode,
  JsonCanvasSide,
  SelfEmploymentProject
} from "../../../types";
import {
  businessCanvasProjectById,
  createBusinessIdeaCanvasEdge,
  cssEscape,
  renderAll,
  updateBusinessIdeaCanvasProject
} from "./canvasModelController";
import { closeBusinessIdeaCanvasOverlays } from "./overlayController";
import { businessCanvasUiState } from "./uiState";

export function editSelectedBusinessIdeaCanvasEdgeLabel(): void {
  const selection = businessCanvasUiState.selectedEdge;
  if (selection) editBusinessIdeaCanvasEdgeLabel(selection.projectId, selection.edgeId);
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

export function businessIdeaCanvasEndpointForLineMenuEdge(
  project: SelfEmploymentProject,
  edgeId: string,
  point: { x: number; y: number }
): { nodeId: string; side: JsonCanvasSide } | null {
  const edge = project.businessIdeaCanvas.edges.find((item) => item.id === edgeId);
  return edge ? nearestBusinessIdeaCanvasEndpointForEdge(project.businessIdeaCanvas, edge, point) : null;
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
