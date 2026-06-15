import type {
  BusinessIdeaCanvasNodeMeta,
  BusinessIdeaCanvasViewport,
  JsonCanvasNode,
  JsonCanvasSide
} from "../../../types";
import type {
  BusinessIdeaCanvasContextMenuState,
  BusinessIdeaCanvasLineMenuState,
  BusinessIdeaCanvasPaletteEditorState,
  BusinessIdeaCanvasPalettePopoverState,
  BusinessIdeaCanvasSelectionRectState
} from "./view";

export type BusinessIdeaCanvasDragState = {
  projectId: string;
  nodeIds: string[];
  mode: "move" | "resize";
  pointerId: number;
  startClientX: number;
  startClientY: number;
  originalNodes: Record<string, { x: number; y: number; width: number; height: number }>;
  elements: Record<string, HTMLElement>;
  previewNodes: Record<string, { x: number; y: number; width: number; height: number }>;
  frameId: number | null;
  moved: boolean;
} | null;

export type BusinessIdeaCanvasConnectionDragState = {
  projectId: string;
  pointerId: number;
  fromNodeId: string;
  fromSide: JsonCanvasSide;
  startClientX: number;
  startClientY: number;
  startPoint: { x: number; y: number };
  lineMenuPoint: { x: number; y: number } | null;
  lineMenuEdgeId: string | null;
  previewPoint: { x: number; y: number };
  previewTargetNodeId: string | null;
  previewTargetSide: JsonCanvasSide | null;
  frameId: number | null;
  moved: boolean;
} | null;

export type BusinessIdeaCanvasSelectionDragState = {
  projectId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPoint: { x: number; y: number };
  currentPoint: { x: number; y: number };
  moved: boolean;
} | null;

export type BusinessIdeaCanvasPanDragState = {
  projectId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  originalX: number;
  originalY: number;
  previewX: number;
  previewY: number;
  frameId: number | null;
  moved: boolean;
} | null;

export type BusinessIdeaCanvasWheelZoomState = {
  projectId: string;
  viewport: BusinessIdeaCanvasViewport;
  frameId: number | null;
  commitTimerId: number | null;
} | null;

export type BusinessIdeaCanvasClipboardState = {
  nodes: JsonCanvasNode[];
  nodeMeta: Record<string, BusinessIdeaCanvasNodeMeta>;
} | null;

export interface BusinessIdeaCanvasUiState {
  selectedNodeIds: { projectId: string; nodeIds: string[] } | null;
  selectedEdge: { projectId: string; edgeId: string } | null;
  editingNode: { projectId: string; nodeId: string } | null;
  editingEdgeLabel: { projectId: string; edgeId: string; draft: string } | null;
  armedConnection: { projectId: string; nodeId: string; side: JsonCanvasSide } | null;
  lineMenu: BusinessIdeaCanvasLineMenuState | null;
  dragState: BusinessIdeaCanvasDragState;
  connectionDragState: BusinessIdeaCanvasConnectionDragState;
  selectionDragState: BusinessIdeaCanvasSelectionDragState;
  selectionRect: BusinessIdeaCanvasSelectionRectState | null;
  panDragState: BusinessIdeaCanvasPanDragState;
  wheelZoomState: BusinessIdeaCanvasWheelZoomState;
  contextMenu: BusinessIdeaCanvasContextMenuState | null;
  palettePopover: BusinessIdeaCanvasPalettePopoverState | null;
  paletteEditor: BusinessIdeaCanvasPaletteEditorState | null;
  clipboard: BusinessIdeaCanvasClipboardState;
  spacePressed: boolean;
  lastDragEndAt: number;
}

export const businessCanvasUiState: BusinessIdeaCanvasUiState = {
  selectedNodeIds: null,
  selectedEdge: null,
  editingNode: null,
  editingEdgeLabel: null,
  armedConnection: null,
  lineMenu: null,
  dragState: null,
  connectionDragState: null,
  selectionDragState: null,
  selectionRect: null,
  panDragState: null,
  wheelZoomState: null,
  contextMenu: null,
  palettePopover: null,
  paletteEditor: null,
  clipboard: null,
  spacePressed: false,
  lastDragEndAt: 0
};
