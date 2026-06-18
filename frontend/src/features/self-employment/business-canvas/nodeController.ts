import { createId } from "../../../data/defaults";
import {
  canvasAnchorPoint,
  createBusinessIdeaCanvasGroupMeta,
  createBusinessIdeaCanvasGroupNode,
  nearestBusinessIdeaCanvasNodeSide,
  snapBusinessIdeaCanvasValue
} from "../../../domain/businessIdeaCanvas";
import type {
  BusinessIdeaCanvasShape,
  JsonCanvasNode
} from "../../../types";
import {
  businessCanvasProjectById,
  createBusinessIdeaCanvasEdge,
  createBusinessIdeaCanvasTextNode,
  cssEscape,
  insertBusinessIdeaCanvasNodeIntoProject,
  renderAll,
  updateBusinessIdeaCanvasProject
} from "./canvasModelController";
import {
  businessIdeaCanvasEndpointForLineMenuEdge
} from "./edgeController";
import { businessCanvasHost } from "./host";
import { closeBusinessIdeaCanvasOverlays } from "./overlayController";
import {
  copyBusinessIdeaCanvasSelection,
  pasteBusinessIdeaCanvasClipboard
} from "./selectionController";
import { businessCanvasUiState } from "./uiState";
import { businessIdeaCanvasVisibleTopLeft } from "./viewportController";

export function addBusinessIdeaCanvasNodeAtPoint(point: { x: number; y: number }): void {
  const projectId = businessCanvasHost().getState().selfEmployment.selectedProjectId;
  const project = businessCanvasProjectById(projectId);
  if (!project) return;
  const node = createBusinessIdeaCanvasTextNode(project, point, "Neue Karte");
  businessCanvasUiState.contextMenu = null;
  insertBusinessIdeaCanvasNode(projectId, node, true);
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

export function addBusinessIdeaCanvasNode(): void {
  const projectId = businessCanvasHost().getState().selfEmployment.selectedProjectId;
  const project = businessCanvasProjectById(projectId);
  if (!project) return;
  const node = createBusinessIdeaCanvasTextNode(project, businessIdeaCanvasVisibleTopLeft(project), "Neue Karte");
  insertBusinessIdeaCanvasNode(projectId, node, true);
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

export function handleBusinessIdeaCanvasDoubleClick(event: MouseEvent): void {
  if (Date.now() - businessCanvasUiState.lastDragEndAt < 350) return;
  const target = event.target as HTMLElement | null;
  const textElement = target?.closest<HTMLElement>("[data-business-canvas-node-text]");
  if (!textElement?.dataset.businessCanvasNodeText) return;
  const nodeElement = textElement.closest<HTMLElement>("[data-business-canvas-node-id]");
  if (!nodeElement?.dataset.businessCanvasNodeId) return;
  const projectId = nodeElement.closest<HTMLElement>("[data-business-canvas-project-id]")?.dataset.businessCanvasProjectId;
  const project = projectId ? businessCanvasProjectById(projectId) : null;
  const node = project?.businessIdeaCanvas.nodes.find((item) => item.id === textElement.dataset.businessCanvasNodeText);
  if (!projectId || !node || node.type !== "text") return;
  event.preventDefault();
  editBusinessIdeaCanvasNode(node.id, projectId);
}

export function editBusinessIdeaCanvasNode(nodeId: string, projectIdOverride?: string): void {
  const projectId =
    projectIdOverride ?? businessCanvasUiState.selectedNodeIds?.projectId ?? businessCanvasHost().getState().selfEmployment.selectedProjectId;
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
    if (!editor) return;
    editor.focus();
    selectBusinessIdeaCanvasNodeText(editor);
  }, 0);
}

function selectBusinessIdeaCanvasNodeText(editor: HTMLElement): void {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(editor);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function insertBusinessIdeaCanvasNode(projectId: string, node: JsonCanvasNode, renderAfterUpdate: boolean): void {
  businessCanvasUiState.selectedNodeIds = { projectId, nodeIds: [node.id] };
  businessCanvasUiState.selectedEdge = null;
  updateBusinessIdeaCanvasProject(projectId, (project) => insertBusinessIdeaCanvasNodeIntoProject(project, node), renderAfterUpdate);
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
