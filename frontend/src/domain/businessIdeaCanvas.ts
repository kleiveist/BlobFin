import type {
  BusinessIdeaCanvas,
  BusinessIdeaCanvasEdgeDirection,
  BusinessIdeaCanvasGroupMeta,
  BusinessIdeaCanvasGrid,
  BusinessIdeaCanvasLabel,
  BusinessIdeaCanvasMeta,
  BusinessIdeaCanvasNodeMeta,
  BusinessIdeaCanvasPaletteColor,
  BusinessIdeaCanvasPhase,
  BusinessIdeaCanvasShape,
  BusinessIdeaCanvasViewport,
  JsonCanvasEdge,
  JsonCanvasEnd,
  JsonCanvasNode,
  JsonCanvasSide
} from "../types";

const DEFAULT_GRID_SIZE = 20;
const MIN_NODE_WIDTH = 100;
const MIN_NODE_HEIGHT = 60;
const MAX_PHASES = 11;
export const BUSINESS_IDEA_CANVAS_ORIGIN = 1200;
export const BUSINESS_IDEA_CANVAS_WIDTH = 2600;
export const BUSINESS_IDEA_CANVAS_HEIGHT = 1900;
export const BUSINESS_IDEA_CANVAS_COLOR_OPTIONS = ["1", "2", "3", "4", "5", "6"] as const;
export const BUSINESS_IDEA_CANVAS_DEFAULT_VIEWPORT: BusinessIdeaCanvasViewport = { x: -900, y: -1020, zoom: 1 };

const DEFAULT_LABELS: BusinessIdeaCanvasLabel[] = [
  { id: "idea", name: "Idee", color: "1" },
  { id: "knowledge", name: "Wissen", color: "3" },
  { id: "start", name: "Start", color: "4" },
  { id: "implementation", name: "Umsetzung", color: "2" },
  { id: "goal", name: "Ziel", color: "5" }
];

const DEFAULT_PALETTE: BusinessIdeaCanvasPaletteColor[] = [
  { id: "palette-1", name: "Rot", color: "1" },
  { id: "palette-2", name: "Gold", color: "2" },
  { id: "palette-3", name: "Gelb", color: "3" },
  { id: "palette-4", name: "Akzent", color: "4" },
  { id: "palette-5", name: "Blau", color: "5" },
  { id: "palette-6", name: "Violett", color: "6" }
];

const DEFAULT_PHASES: BusinessIdeaCanvasPhase[] = Array.from({ length: MAX_PHASES }, (_, index) => ({
  id: `phase-${index}`,
  name: `Phase ${index}`,
  order: index,
  startDate: null
}));

const SHAPES: BusinessIdeaCanvasShape[] = ["rounded-rectangle", "rectangle", "ellipse", "diamond"];
const SIDES: JsonCanvasSide[] = ["top", "right", "bottom", "left"];
const ENDS: JsonCanvasEnd[] = ["none", "arrow"];

export interface BusinessIdeaCanvasDefaults {
  businessIdeaCanvas: BusinessIdeaCanvas;
  businessIdeaCanvasFile: string;
  businessIdeaCanvasMeta: BusinessIdeaCanvasMeta;
}

export interface BusinessIdeaCanvasPoint {
  x: number;
  y: number;
}

export interface BusinessIdeaCanvasRect extends BusinessIdeaCanvasPoint {
  width: number;
  height: number;
}

export interface BusinessIdeaCanvasEndpoint {
  nodeId: string;
  side: JsonCanvasSide;
}

export interface BusinessIdeaCanvasGanttSegment {
  labelId: string;
  labelName: string;
  color: string;
  count: number;
  ratio: number;
}

export interface BusinessIdeaCanvasGanttRow {
  phaseId: string;
  phaseName: string;
  count: number;
  ratio: number;
  phaseColor: string;
  segments: BusinessIdeaCanvasGanttSegment[];
}

export interface BusinessIdeaCanvasPaletteRows {
  standard: BusinessIdeaCanvasPaletteColor[];
  custom: BusinessIdeaCanvasPaletteColor[];
  visibleCustom: BusinessIdeaCanvasPaletteColor[];
}

interface LegacyBusinessIdeaFields {
  idea?: string;
  problem?: string;
  targetGroup?: string;
  revenueModel?: string;
}

export function defaultBusinessIdeaCanvasForProject(
  projectId: string,
  fields: LegacyBusinessIdeaFields = {}
): BusinessIdeaCanvasDefaults {
  const safeProjectId = safeIdPart(projectId || "project");
  const nodes = [
    textNode(`${safeProjectId}-idea`, fields.idea || "Neue Geschaeftsidee", -160, -70, 320, 110, "1"),
    textNode(`${safeProjectId}-problem`, fields.problem || "Problem / Bedarf", -500, 130, 280, 120, "3"),
    textNode(`${safeProjectId}-target-group`, fields.targetGroup || "Zielgruppe", -140, 150, 280, 110, "3"),
    textNode(`${safeProjectId}-revenue`, fields.revenueModel || "Einnahmemodell", 230, 130, 280, 120, "2")
  ];
  const edges: JsonCanvasEdge[] = [
    edge(`${safeProjectId}-edge-problem`, nodes[0].id, "left", nodes[1].id, "right"),
    edge(`${safeProjectId}-edge-target`, nodes[0].id, "bottom", nodes[2].id, "top"),
    edge(`${safeProjectId}-edge-revenue`, nodes[0].id, "right", nodes[3].id, "left")
  ];
  const meta = defaultBusinessIdeaCanvasMeta({ nodes, edges });
  return {
    businessIdeaCanvas: { nodes, edges },
    businessIdeaCanvasFile: businessIdeaCanvasFilePath(projectId),
    businessIdeaCanvasMeta: {
      ...meta,
      nodeMeta: {
        [nodes[0].id]: { labelId: "idea", phaseId: "phase-1", shape: "rounded-rectangle" },
        [nodes[1].id]: { labelId: "knowledge", phaseId: "phase-2", shape: "rounded-rectangle" },
        [nodes[2].id]: { labelId: "knowledge", phaseId: "phase-2", shape: "rounded-rectangle" },
        [nodes[3].id]: { labelId: "implementation", phaseId: "phase-3", shape: "rounded-rectangle" }
      }
    }
  };
}

export function businessIdeaCanvasFilePath(projectId: string): string {
  return `planning/projects/${safeIdPart(projectId || "project")}/canvas-geschaeftsidee.canvas`;
}

export function serializeBusinessIdeaCanvas(canvas: BusinessIdeaCanvas): BusinessIdeaCanvas {
  return {
    nodes: canvas.nodes.map(serializeNode),
    edges: canvas.edges.map(serializeEdge)
  };
}

export function parseBusinessIdeaCanvasFile(value: unknown, label = "Canvas-Datei"): BusinessIdeaCanvas {
  if (!isRecord(value)) throw new Error(`${label} ist keine gueltige JSON-Canvas-Datei.`);
  const nodes = Array.isArray(value.nodes) ? value.nodes.map((node, index) => parseNode(node, `${label} node ${index + 1}`)) : [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  if (nodeIds.size !== nodes.length) throw new Error(`${label} enthaelt doppelte Node-IDs.`);
  const edges = Array.isArray(value.edges)
    ? value.edges.map((edgeValue, index) => parseEdge(edgeValue, nodeIds, `${label} edge ${index + 1}`))
    : [];
  return serializeBusinessIdeaCanvas({ nodes, edges });
}

export function normalizeBusinessIdeaCanvas(value: unknown, fallback: BusinessIdeaCanvas): BusinessIdeaCanvas {
  try {
    return parseBusinessIdeaCanvasFile(value, "Canvas");
  } catch {
    return serializeBusinessIdeaCanvas(fallback);
  }
}

export function defaultBusinessIdeaCanvasMeta(canvas: BusinessIdeaCanvas): BusinessIdeaCanvasMeta {
  const labels = DEFAULT_LABELS.map((label) => ({ ...label }));
  const phases = DEFAULT_PHASES.map((phase) => ({ ...phase }));
  const activeLabelId = labels[0]?.id ?? "idea";
  const activePhaseId = phases.find((phase) => phase.id === "phase-1")?.id ?? phases[0]?.id ?? "phase-1";
  return {
    viewport: { ...BUSINESS_IDEA_CANVAS_DEFAULT_VIEWPORT },
    grid: { size: DEFAULT_GRID_SIZE, snap: true, alignToObjects: true },
    labels,
    phases,
    activeLabelId,
    activePhaseId,
    palette: DEFAULT_PALETTE.map((color) => ({ ...color })),
    groupMeta: {},
    nodeMeta: Object.fromEntries(
      canvas.nodes.map((node) => [node.id, { labelId: activeLabelId, phaseId: activePhaseId, shape: "rounded-rectangle" }])
    )
  };
}

export function normalizeBusinessIdeaCanvasMeta(
  value: unknown,
  canvas: BusinessIdeaCanvas,
  fallback: BusinessIdeaCanvasMeta = defaultBusinessIdeaCanvasMeta(canvas)
): BusinessIdeaCanvasMeta {
  const source = isRecord(value) ? value : {};
  const labels = normalizeLabels(source.labels, fallback.labels);
  const phases = normalizePhases(source.phases, fallback.phases);
  const fallbackLabelId = labels[0]?.id ?? "idea";
  const fallbackPhaseId = phases.find((phase) => phase.id === "phase-1")?.id ?? phases[0]?.id ?? "phase-1";
  const sourceActiveLabelId = normalizeBusinessIdeaCanvasLabelId(source.activeLabelId);
  const activeLabelId = labels.some((label) => label.id === sourceActiveLabelId) ? sourceActiveLabelId : fallbackLabelId;
  const activePhaseId = phases.some((phase) => phase.id === source.activePhaseId) ? String(source.activePhaseId) : fallbackPhaseId;
  const palette = normalizePalette(source.palette, fallback.palette ?? DEFAULT_PALETTE);
  const rawMeta = isRecord(source.nodeMeta) ? source.nodeMeta : {};
  const nodeMeta: Record<string, BusinessIdeaCanvasNodeMeta> = {};

  for (const node of canvas.nodes) {
    nodeMeta[node.id] = normalizeNodeMeta(rawMeta[node.id], labels, phases, {
      labelId: activeLabelId,
      phaseId: activePhaseId,
      shape: "rounded-rectangle"
    });
  }
  const groupMeta = normalizeGroupMeta(source.groupMeta, canvas, fallback.groupMeta ?? {});

  return {
    viewport: normalizeViewport(source.viewport, fallback.viewport),
    grid: normalizeGrid(source.grid, fallback.grid),
    labels,
    phases,
    activeLabelId,
    activePhaseId,
    palette,
    groupMeta,
    nodeMeta
  };
}

export function businessIdeaCanvasNodeText(node: JsonCanvasNode): string {
  if (node.type === "text") return node.text;
  if (node.type === "file") return node.file;
  if (node.type === "link") return node.url;
  return node.label || "Gruppe";
}

export function businessIdeaCanvasEndsForDirection(
  direction: BusinessIdeaCanvasEdgeDirection
): { fromEnd: JsonCanvasEnd; toEnd: JsonCanvasEnd } {
  if (direction === "backward") return { fromEnd: "arrow", toEnd: "none" };
  if (direction === "both") return { fromEnd: "arrow", toEnd: "arrow" };
  if (direction === "none") return { fromEnd: "none", toEnd: "none" };
  return { fromEnd: "none", toEnd: "arrow" };
}

export function businessIdeaCanvasDirectionFromEdge(edgeValue: Pick<JsonCanvasEdge, "fromEnd" | "toEnd">): BusinessIdeaCanvasEdgeDirection {
  const fromEnd = edgeValue.fromEnd ?? "none";
  const toEnd = edgeValue.toEnd ?? "arrow";
  if (fromEnd === "arrow" && toEnd === "arrow") return "both";
  if (fromEnd === "arrow") return "backward";
  if (toEnd === "arrow") return "forward";
  return "none";
}

export function canvasAnchorPoint(node: JsonCanvasNode, side: JsonCanvasSide): BusinessIdeaCanvasPoint {
  if (side === "top") return { x: node.x + node.width / 2, y: node.y };
  if (side === "right") return { x: node.x + node.width, y: node.y + node.height / 2 };
  if (side === "bottom") return { x: node.x + node.width / 2, y: node.y + node.height };
  return { x: node.x, y: node.y + node.height / 2 };
}

export function nearestBusinessIdeaCanvasNodeSide(node: JsonCanvasNode, point: BusinessIdeaCanvasPoint): JsonCanvasSide {
  return SIDES.reduce((nearest, side) => {
    const current = canvasAnchorPoint(node, side);
    const best = canvasAnchorPoint(node, nearest);
    return distanceSquared(point, current) < distanceSquared(point, best) ? side : nearest;
  }, "top" as JsonCanvasSide);
}

export function shortestBusinessIdeaCanvasConnectionSides(
  fromNode: JsonCanvasNode,
  toNode: JsonCanvasNode
): { fromSide: JsonCanvasSide; toSide: JsonCanvasSide } {
  let best = {
    fromSide: "right" as JsonCanvasSide,
    toSide: "left" as JsonCanvasSide,
    distance: Number.POSITIVE_INFINITY
  };
  for (const fromSide of SIDES) {
    const fromPoint = canvasAnchorPoint(fromNode, fromSide);
    for (const toSide of SIDES) {
      const toPoint = canvasAnchorPoint(toNode, toSide);
      const distance = distanceSquared(fromPoint, toPoint);
      if (distance < best.distance) best = { fromSide, toSide, distance };
    }
  }
  return { fromSide: best.fromSide, toSide: best.toSide };
}

export function businessIdeaCanvasWithShortestEdgeSides(canvas: BusinessIdeaCanvas): BusinessIdeaCanvas {
  const nodesById = new Map(canvas.nodes.map((node) => [node.id, node]));
  return {
    ...canvas,
    edges: canvas.edges.map((edgeValue) => {
      const fromNode = nodesById.get(edgeValue.fromNode);
      const toNode = nodesById.get(edgeValue.toNode);
      if (!fromNode || !toNode) return edgeValue;
      const sides = shortestBusinessIdeaCanvasConnectionSides(fromNode, toNode);
      return {
        ...edgeValue,
        fromSide: sides.fromSide,
        toSide: sides.toSide
      };
    })
  };
}

export function nearestBusinessIdeaCanvasEndpointForEdge(
  canvas: BusinessIdeaCanvas,
  edgeValue: JsonCanvasEdge,
  point: BusinessIdeaCanvasPoint
): BusinessIdeaCanvasEndpoint | null {
  const fromNode = canvas.nodes.find((node) => node.id === edgeValue.fromNode);
  const toNode = canvas.nodes.find((node) => node.id === edgeValue.toNode);
  if (!fromNode || !toNode) return null;
  const fromSide = edgeValue.fromSide ?? "right";
  const toSide = edgeValue.toSide ?? "left";
  const fromPoint = canvasAnchorPoint(fromNode, fromSide);
  const toPoint = canvasAnchorPoint(toNode, toSide);
  return distanceSquared(point, fromPoint) <= distanceSquared(point, toPoint)
    ? { nodeId: fromNode.id, side: fromSide }
    : { nodeId: toNode.id, side: toSide };
}

export function snapBusinessIdeaCanvasValue(value: number, grid: BusinessIdeaCanvasGrid): number {
  if (!grid.snap || grid.size <= 1) return Math.round(value);
  return Math.round(value / grid.size) * grid.size;
}

export function clampBusinessIdeaCanvasNodeSize(width: number, height: number): { width: number; height: number } {
  return {
    width: Math.max(MIN_NODE_WIDTH, Math.round(width)),
    height: Math.max(MIN_NODE_HEIGHT, Math.round(height))
  };
}

export function businessIdeaCanvasMoveDeltaForNodes(
  nodes: JsonCanvasNode[],
  deltaX: number,
  deltaY: number
): BusinessIdeaCanvasPoint {
  const bounds = businessIdeaCanvasBoundsForNodes(nodes);
  if (!bounds) return { x: 0, y: 0 };
  const requestedX = finiteRoundedDelta(deltaX);
  const requestedY = finiteRoundedDelta(deltaY);
  const minX = -BUSINESS_IDEA_CANVAS_ORIGIN;
  const minY = -BUSINESS_IDEA_CANVAS_ORIGIN;
  const maxRight = BUSINESS_IDEA_CANVAS_WIDTH - BUSINESS_IDEA_CANVAS_ORIGIN;
  const maxBottom = BUSINESS_IDEA_CANVAS_HEIGHT - BUSINESS_IDEA_CANVAS_ORIGIN;
  return {
    x: clampMoveDelta(requestedX, minX - bounds.x, maxRight - (bounds.x + bounds.width)),
    y: clampMoveDelta(requestedY, minY - bounds.y, maxBottom - (bounds.y + bounds.height))
  };
}

export function businessIdeaCanvasGanttRows(
  canvas: BusinessIdeaCanvas,
  meta: BusinessIdeaCanvasMeta
): BusinessIdeaCanvasGanttRow[] {
  const labelsById = new Map(meta.labels.map((label) => [label.id, label]));
  const phases = [...meta.phases].sort((a, b) => a.order - b.order).slice(0, MAX_PHASES);
  const totalCards = businessIdeaCanvasCardNodes(canvas).length;
  return phases.map((phase, index) => {
    const counts = new Map<string, number>();
    let total = 0;
    for (const node of canvas.nodes) {
      if (node.type === "group") continue;
      const nodeMeta = meta.nodeMeta[node.id];
      if (!nodeMeta || nodeMeta.phaseId !== phase.id) continue;
      total += 1;
      counts.set(nodeMeta.labelId, (counts.get(nodeMeta.labelId) ?? 0) + 1);
    }
    const segments = Array.from(counts.entries()).map(([labelId, count]) => {
      const label = labelsById.get(labelId) ?? meta.labels[0] ?? { id: labelId, name: labelId, color: "1" };
      return {
        labelId,
        labelName: label.name,
        color: label.color,
        count,
        ratio: totalCards > 0 ? count / totalCards : 0
      };
    });
    return {
      phaseId: phase.id,
      phaseName: phase.name,
      count: total,
      ratio: totalCards > 0 ? total / totalCards : 0,
      phaseColor: businessIdeaCanvasPhaseColor(index),
      segments
    };
  });
}

export function businessIdeaCanvasCardNodes(canvas: BusinessIdeaCanvas): JsonCanvasNode[] {
  return canvas.nodes.filter((node) => node.type !== "group");
}

export function businessIdeaCanvasPaletteRows(palette: BusinessIdeaCanvasPaletteColor[]): BusinessIdeaCanvasPaletteRows {
  const normalized = normalizePalette(palette, DEFAULT_PALETTE);
  const standardIds = new Set(DEFAULT_PALETTE.map((color) => color.id));
  const standard = DEFAULT_PALETTE.map((color) => ({ ...color }));
  const custom = normalized.filter((color) => !standardIds.has(color.id)).map((color) => ({ ...color }));
  return {
    standard,
    custom,
    visibleCustom: custom.slice(0, standard.length)
  };
}

export function businessIdeaCanvasPaletteWithCustomColor(
  palette: BusinessIdeaCanvasPaletteColor[],
  color: BusinessIdeaCanvasPaletteColor
): BusinessIdeaCanvasPaletteColor[] {
  const rows = businessIdeaCanvasPaletteRows(palette);
  return [
    ...rows.standard.map((item) => ({ ...item })),
    { ...color },
    ...rows.custom.map((item) => ({ ...item }))
  ];
}

export function businessIdeaCanvasBoundsForNodes(
  nodes: JsonCanvasNode[],
  padding = 0
): BusinessIdeaCanvasRect | null {
  if (!nodes.length) return null;
  const left = Math.min(...nodes.map((node) => node.x));
  const top = Math.min(...nodes.map((node) => node.y));
  const right = Math.max(...nodes.map((node) => node.x + node.width));
  const bottom = Math.max(...nodes.map((node) => node.y + node.height));
  return {
    x: Math.round(left - padding),
    y: Math.round(top - padding),
    width: Math.round(right - left + padding * 2),
    height: Math.round(bottom - top + padding * 2)
  };
}

export function businessIdeaCanvasNodesInsideRect(canvas: BusinessIdeaCanvas, rect: BusinessIdeaCanvasRect): string[] {
  const normalized = normalizeRect(rect);
  return businessIdeaCanvasCardNodes(canvas)
    .filter(
      (node) =>
        node.x >= normalized.x &&
        node.y >= normalized.y &&
        node.x + node.width <= normalized.x + normalized.width &&
        node.y + node.height <= normalized.y + normalized.height
    )
    .map((node) => node.id);
}

export function createBusinessIdeaCanvasGroupNode(
  id: string,
  nodes: JsonCanvasNode[],
  name: string,
  color: string,
  padding = 32
): JsonCanvasNode | null {
  const bounds = businessIdeaCanvasBoundsForNodes(nodes, padding);
  if (!bounds) return null;
  return {
    id,
    type: "group",
    label: name,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    color
  };
}

export function createBusinessIdeaCanvasGroupMeta(
  groupNode: JsonCanvasNode,
  nodeIds: string[],
  fallbackName = "Gruppe"
): BusinessIdeaCanvasGroupMeta {
  return {
    nodeIds: Array.from(new Set(nodeIds)),
    name: groupNode.type === "group" ? groupNode.label || fallbackName : fallbackName,
    color: groupNode.color || "4"
  };
}

export function offsetBusinessIdeaCanvasNodes(nodes: JsonCanvasNode[], offset = 24): JsonCanvasNode[] {
  return nodes.map((node) => ({ ...node, x: node.x + offset, y: node.y + offset }));
}

export function businessIdeaCanvasViewportForZoomAtPoint(
  viewport: BusinessIdeaCanvasViewport,
  viewportPoint: BusinessIdeaCanvasPoint,
  nextZoom: number
): BusinessIdeaCanvasViewport {
  const currentZoom = viewport.zoom || 1;
  const clampedZoom = Math.min(2, Math.max(0.4, Number(nextZoom.toFixed(2))));
  const worldX = (viewportPoint.x - viewport.x) / currentZoom;
  const worldY = (viewportPoint.y - viewport.y) / currentZoom;
  return {
    x: Math.round(viewportPoint.x - worldX * clampedZoom),
    y: Math.round(viewportPoint.y - worldY * clampedZoom),
    zoom: clampedZoom
  };
}

function textNode(id: string, text: string, x: number, y: number, width: number, height: number, color: string): JsonCanvasNode {
  return { id, type: "text", text, x, y, width, height, color };
}

function edge(id: string, fromNode: string, fromSide: JsonCanvasSide, toNode: string, toSide: JsonCanvasSide): JsonCanvasEdge {
  return { id, fromNode, fromSide, fromEnd: "none", toNode, toSide, toEnd: "arrow" };
}

function parseNode(value: unknown, label: string): JsonCanvasNode {
  if (!isRecord(value)) throw new Error(`${label} ist kein gueltiger Node.`);
  const id = nonEmptyString(value.id, `${label}.id`);
  const type = normalizeNodeType(value.type, label);
  const base = {
    id,
    type,
    x: integerValue(value.x, `${label}.x`),
    y: integerValue(value.y, `${label}.y`),
    width: positiveIntegerValue(value.width, `${label}.width`),
    height: positiveIntegerValue(value.height, `${label}.height`),
    color: typeof value.color === "string" ? value.color : undefined
  };
  if (type === "text") return { ...base, type, text: String(value.text ?? "") };
  if (type === "file") return { ...base, type, file: nonEmptyString(value.file, `${label}.file`), subpath: optionalString(value.subpath) };
  if (type === "link") return { ...base, type, url: nonEmptyString(value.url, `${label}.url`) };
  return {
    ...base,
    type,
    label: optionalString(value.label),
    background: optionalString(value.background),
    backgroundStyle:
      value.backgroundStyle === "cover" || value.backgroundStyle === "ratio" || value.backgroundStyle === "repeat"
        ? value.backgroundStyle
        : undefined
  };
}

function parseEdge(value: unknown, nodeIds: Set<string>, label: string): JsonCanvasEdge {
  if (!isRecord(value)) throw new Error(`${label} ist keine gueltige Edge.`);
  const fromNode = nonEmptyString(value.fromNode, `${label}.fromNode`);
  const toNode = nonEmptyString(value.toNode, `${label}.toNode`);
  if (!nodeIds.has(fromNode)) throw new Error(`${label}.fromNode verweist auf keinen vorhandenen Node.`);
  if (!nodeIds.has(toNode)) throw new Error(`${label}.toNode verweist auf keinen vorhandenen Node.`);
  return {
    id: nonEmptyString(value.id, `${label}.id`),
    fromNode,
    fromSide: normalizeSide(value.fromSide),
    fromEnd: normalizeEnd(value.fromEnd),
    toNode,
    toSide: normalizeSide(value.toSide),
    toEnd: normalizeEnd(value.toEnd),
    color: optionalString(value.color),
    label: optionalString(value.label)
  };
}

function finiteRoundedDelta(value: number): number {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function clampMoveDelta(value: number, min: number, max: number): number {
  if (min > max) return 0;
  return Math.min(max, Math.max(min, value));
}

function serializeNode(node: JsonCanvasNode): JsonCanvasNode {
  if (node.type === "text") {
    return {
      id: node.id,
      type: "text",
      text: node.text,
      x: Math.round(node.x),
      y: Math.round(node.y),
      width: Math.max(1, Math.round(node.width)),
      height: Math.max(1, Math.round(node.height)),
      ...(node.color ? { color: node.color } : {})
    };
  }
  if (node.type === "file") {
    return {
      id: node.id,
      type: "file",
      file: node.file,
      x: Math.round(node.x),
      y: Math.round(node.y),
      width: Math.max(1, Math.round(node.width)),
      height: Math.max(1, Math.round(node.height)),
      ...(node.subpath ? { subpath: node.subpath } : {}),
      ...(node.color ? { color: node.color } : {})
    };
  }
  if (node.type === "link") {
    return {
      id: node.id,
      type: "link",
      url: node.url,
      x: Math.round(node.x),
      y: Math.round(node.y),
      width: Math.max(1, Math.round(node.width)),
      height: Math.max(1, Math.round(node.height)),
      ...(node.color ? { color: node.color } : {})
    };
  }
  return {
    id: node.id,
    type: "group",
    x: Math.round(node.x),
    y: Math.round(node.y),
    width: Math.max(1, Math.round(node.width)),
    height: Math.max(1, Math.round(node.height)),
    ...(node.label ? { label: node.label } : {}),
    ...(node.color ? { color: node.color } : {})
  };
}

function serializeEdge(edgeValue: JsonCanvasEdge): JsonCanvasEdge {
  return {
    id: edgeValue.id,
    fromNode: edgeValue.fromNode,
    ...(edgeValue.fromSide ? { fromSide: edgeValue.fromSide } : {}),
    ...(edgeValue.fromEnd ? { fromEnd: edgeValue.fromEnd } : {}),
    toNode: edgeValue.toNode,
    ...(edgeValue.toSide ? { toSide: edgeValue.toSide } : {}),
    ...(edgeValue.toEnd ? { toEnd: edgeValue.toEnd } : {}),
    ...(edgeValue.color ? { color: edgeValue.color } : {}),
    ...(edgeValue.label ? { label: edgeValue.label } : {})
  };
}

function normalizeLabels(value: unknown, fallback: BusinessIdeaCanvasLabel[]): BusinessIdeaCanvasLabel[] {
  const labels = Array.isArray(value)
    ? value
        .filter(isRecord)
        .map((item) => ({
          id: normalizeBusinessIdeaCanvasLabelId(item.id),
          name: String(item.name || "").trim(),
          color: String(item.color || "1")
        }))
        .filter((item) => item.id.length > 0 && item.name.length > 0)
    : [];
  const source = labels.length ? labels : fallback;
  const byId = new Map(source.map((label) => [normalizeBusinessIdeaCanvasLabelId(label.id), label]));
  const defaultIds = new Set([...DEFAULT_LABELS.map((label) => label.id), "active"]);
  const canonical = DEFAULT_LABELS.map((label) => ({
    ...label,
    color: byId.get(label.id)?.color ?? label.color
  }));
  const custom = source
    .map((label) => ({ ...label, id: normalizeBusinessIdeaCanvasLabelId(label.id) }))
    .filter((label) => !defaultIds.has(label.id))
    .map((label) => ({ ...label }));
  return [...canonical, ...custom];
}

function normalizePhases(value: unknown, fallback: BusinessIdeaCanvasPhase[]): BusinessIdeaCanvasPhase[] {
  const phases = Array.isArray(value)
    ? value
        .filter(isRecord)
        .map((item, index) => ({
          id: String(item.id || "").trim(),
          name: String(item.name || "").trim(),
          order: Number.isFinite(Number(item.order)) ? Number(item.order) : index + 1,
          startDate: typeof item.startDate === "string" && item.startDate.length > 0 ? item.startDate : null
        }))
        .filter((item) => item.id.length > 0 && item.name.length > 0)
        .slice(0, MAX_PHASES)
    : [];
  const source = phases.length ? phases : fallback;
  const byId = new Map(source.map((phase) => [phase.id, phase]));
  return DEFAULT_PHASES.map((phase) => ({
    ...phase,
    startDate: byId.get(phase.id)?.startDate ?? phase.startDate
  }));
}

function normalizeNodeMeta(
  value: unknown,
  labels: BusinessIdeaCanvasLabel[],
  phases: BusinessIdeaCanvasPhase[],
  fallback: BusinessIdeaCanvasNodeMeta
): BusinessIdeaCanvasNodeMeta {
  const source = isRecord(value) ? value : {};
  const sourceLabelId = normalizeBusinessIdeaCanvasLabelId(source.labelId);
  const labelId = labels.some((label) => label.id === sourceLabelId) ? sourceLabelId : fallback.labelId;
  const phaseId = phases.some((phase) => phase.id === source.phaseId) ? String(source.phaseId) : fallback.phaseId;
  const shape = SHAPES.includes(source.shape as BusinessIdeaCanvasShape)
    ? (source.shape as BusinessIdeaCanvasShape)
    : fallback.shape;
  return { labelId, phaseId, shape };
}

function normalizeBusinessIdeaCanvasLabelId(value: unknown): string {
  const labelId = String(value ?? "").trim();
  return labelId === "active" ? "goal" : labelId;
}

function normalizePalette(value: unknown, fallback: BusinessIdeaCanvasPaletteColor[]): BusinessIdeaCanvasPaletteColor[] {
  const seen = new Set<string>();
  const palette = Array.isArray(value)
    ? value
        .filter(isRecord)
        .map((item) => ({
          id: String(item.id || "").trim(),
          name: String(item.name || "").trim(),
          color: String(item.color || "").trim()
        }))
        .filter((item) => {
          if (!item.id || !item.name || !item.color || seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        })
    : [];
  const source = palette.length ? palette : fallback;
  const standardIds = new Set(DEFAULT_PALETTE.map((color) => color.id));
  const custom = source.filter((color) => !standardIds.has(color.id));
  return [...DEFAULT_PALETTE, ...custom].map((color) => ({ ...color }));
}

function normalizeGroupMeta(
  value: unknown,
  canvas: BusinessIdeaCanvas,
  fallback: Record<string, BusinessIdeaCanvasGroupMeta>
): Record<string, BusinessIdeaCanvasGroupMeta> {
  const source = isRecord(value) ? value : {};
  const cardIds = new Set(businessIdeaCanvasCardNodes(canvas).map((node) => node.id));
  const groupMeta: Record<string, BusinessIdeaCanvasGroupMeta> = {};
  for (const groupNode of canvas.nodes.filter((node) => node.type === "group")) {
    const sourceItem = source[groupNode.id];
    const fallbackItem = fallback[groupNode.id] as unknown;
    const item: Record<string, unknown> = isRecord(sourceItem)
      ? sourceItem
      : isRecord(fallbackItem)
        ? fallbackItem
        : {};
    const rawNodeIds = Array.isArray(item.nodeIds) ? item.nodeIds : [];
    const nodeIds = Array.from(new Set(rawNodeIds.map(String).filter((nodeId) => cardIds.has(nodeId))));
    const name = typeof item.name === "string" && item.name.trim() ? item.name.trim() : groupNode.label || "Gruppe";
    const color = typeof item.color === "string" && item.color.trim() ? item.color.trim() : groupNode.color || "4";
    groupMeta[groupNode.id] = {
      nodeIds,
      name,
      color,
      ...(typeof item.status === "string" && item.status.trim() ? { status: item.status.trim() } : {}),
      ...(typeof item.topic === "string" && item.topic.trim() ? { topic: item.topic.trim() } : {})
    };
  }
  return groupMeta;
}

function normalizeViewport(value: unknown, fallback: BusinessIdeaCanvasViewport): BusinessIdeaCanvasViewport {
  const source = isRecord(value) ? value : {};
  const x = finiteNumber(source.x, fallback.x);
  const y = finiteNumber(source.y, fallback.y);
  const zoom = Math.min(2, Math.max(0.4, finiteNumber(source.zoom, fallback.zoom)));
  if (x === 0 && y === 0 && zoom === 1 && fallback.x !== 0 && fallback.y !== 0) {
    return { ...fallback };
  }
  return {
    x,
    y,
    zoom
  };
}

function normalizeGrid(value: unknown, fallback: BusinessIdeaCanvasGrid): BusinessIdeaCanvasGrid {
  const source = isRecord(value) ? value : {};
  return {
    size: Math.min(80, Math.max(5, Math.round(finiteNumber(source.size, fallback.size)))),
    snap: typeof source.snap === "boolean" ? source.snap : fallback.snap,
    alignToObjects: typeof source.alignToObjects === "boolean" ? source.alignToObjects : fallback.alignToObjects
  };
}

function normalizeNodeType(value: unknown, label: string): JsonCanvasNode["type"] {
  if (value === "text" || value === "file" || value === "link" || value === "group") return value;
  throw new Error(`${label}.type ist kein unterstuetzter JSON-Canvas-Node-Typ.`);
}

function normalizeSide(value: unknown): JsonCanvasSide | undefined {
  return SIDES.includes(value as JsonCanvasSide) ? (value as JsonCanvasSide) : undefined;
}

function normalizeEnd(value: unknown): JsonCanvasEnd | undefined {
  return ENDS.includes(value as JsonCanvasEnd) ? (value as JsonCanvasEnd) : undefined;
}

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value === "string" && value.trim().length > 0) return value;
  throw new Error(`${label} fehlt oder ist leer.`);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function integerValue(value: unknown, label: string): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && Number.isInteger(parsed)) return parsed;
  throw new Error(`${label} muss eine ganze Zahl sein.`);
}

function positiveIntegerValue(value: unknown, label: string): number {
  const parsed = integerValue(value, label);
  if (parsed > 0) return parsed;
  throw new Error(`${label} muss groesser als 0 sein.`);
}

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function distanceSquared(a: BusinessIdeaCanvasPoint, b: BusinessIdeaCanvasPoint): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function businessIdeaCanvasPhaseColor(index: number): string {
  return ["#6366f1", "#0891b2", "#f97316", "#16a34a", "#ef4444", "#7c3aed"][index % 6] ?? "#6366f1";
}

function normalizeRect(rect: BusinessIdeaCanvasRect): BusinessIdeaCanvasRect {
  const x = rect.width < 0 ? rect.x + rect.width : rect.x;
  const y = rect.height < 0 ? rect.y + rect.height : rect.y;
  return {
    x,
    y,
    width: Math.abs(rect.width),
    height: Math.abs(rect.height)
  };
}

function safeIdPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "project";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
