import {
  BUSINESS_IDEA_CANVAS_COLOR_OPTIONS,
  BUSINESS_IDEA_CANVAS_HEIGHT,
  BUSINESS_IDEA_CANVAS_ORIGIN,
  BUSINESS_IDEA_CANVAS_WIDTH,
  businessIdeaCanvasBoundsForNodes,
  businessIdeaCanvasCardNodes,
  businessIdeaCanvasDirectionFromEdge,
  businessIdeaCanvasGanttRows,
  businessIdeaCanvasNodeText,
  businessIdeaCanvasPaletteRows,
  canvasAnchorPoint
} from "../domain/businessIdeaCanvas";
import { escapeHtml, intNumber } from "../lib/format";
import type {
  BusinessIdeaCanvasEdgeDirection,
  BusinessIdeaCanvasMeta,
  BusinessIdeaCanvasPaletteColor,
  BusinessIdeaCanvasShape,
  JsonCanvasEdge,
  JsonCanvasNode,
  JsonCanvasSide,
  SelfEmploymentProject
} from "../types";

export interface BusinessIdeaCanvasLineMenuState {
  projectId: string;
  edgeId: string;
  x: number;
  y: number;
}

export interface BusinessIdeaCanvasSelectionRectState {
  projectId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BusinessIdeaCanvasContextMenuState {
  projectId: string;
  mode: "canvas" | "node" | "selection";
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
  nodeId?: string;
}

export interface BusinessIdeaCanvasPalettePopoverState {
  projectId: string;
  x: number;
  y: number;
  targetNodeIds: string[];
}

export interface BusinessIdeaCanvasPaletteEditorState {
  projectId: string;
  name: string;
  color: string;
  error?: string;
}

export interface BusinessIdeaCanvasRenderState {
  selectedNodeIds: string[];
  selectedEdgeId: string | null;
  editingNodeId: string | null;
  armedNodeId: string | null;
  lineMenu: BusinessIdeaCanvasLineMenuState | null;
  selectionRect: BusinessIdeaCanvasSelectionRectState | null;
  contextMenu: BusinessIdeaCanvasContextMenuState | null;
  palettePopover: BusinessIdeaCanvasPalettePopoverState | null;
  paletteEditor: BusinessIdeaCanvasPaletteEditorState | null;
  clipboardAvailable: boolean;
}

const BUSINESS_CANVAS_SHAPE_OPTIONS: Array<{ id: BusinessIdeaCanvasShape; icon: string; label: string }> = [
  { id: "rectangle", icon: "▢", label: "Rechteck" },
  { id: "rounded-rectangle", icon: "▣", label: "Abgerundet" },
  { id: "ellipse", icon: "⬭", label: "Ellipse" },
  { id: "diamond", icon: "◆", label: "Raute" }
];

export function renderBusinessIdeaCanvasEditor(
  project: SelfEmploymentProject,
  renderState: BusinessIdeaCanvasRenderState
): string {
  const meta = project.businessIdeaCanvasMeta;
  const viewport = meta.viewport;
  const groupNodes = project.businessIdeaCanvas.nodes.filter((node) => node.type === "group");
  const cardNodes = project.businessIdeaCanvas.nodes.filter((node) => node.type !== "group");
  const lineMenu =
    renderState.lineMenu?.projectId === project.id
      ? renderBusinessIdeaCanvasLineMenu(project.id, renderState.lineMenu)
      : "";
  return `
    <div class="business-canvas-editor" data-business-canvas-project-id="${escapeHtml(project.id)}">
      ${renderBusinessIdeaCanvasTopToolbar(project, renderState)}
      <div class="business-canvas-workbench">
        <div
          class="business-canvas-viewport"
          data-business-canvas-viewport
          style="--grid-size:${meta.grid.size}px;"
        >
          <div
            class="business-canvas-content"
            data-business-canvas-content
            style="width:${BUSINESS_IDEA_CANVAS_WIDTH}px;height:${BUSINESS_IDEA_CANVAS_HEIGHT}px;transform:translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom});"
          >
            ${groupNodes.map((node) => renderBusinessIdeaCanvasNode(project, node, renderState)).join("")}
            ${renderBusinessIdeaCanvasSvg(project, renderState)}
            ${cardNodes.map((node) => renderBusinessIdeaCanvasNode(project, node, renderState)).join("")}
            ${renderBusinessIdeaCanvasSelectionRect(renderState)}
            ${renderBusinessIdeaCanvasNodeToolbar(project, renderState)}
            ${renderBusinessIdeaCanvasMultiToolbar(project, renderState)}
            ${renderBusinessIdeaCanvasEdgeToolbar(project, renderState)}
            ${lineMenu}
          </div>
        </div>
        ${renderBusinessIdeaCanvasGantt(project)}
      </div>
      ${renderBusinessIdeaCanvasContextMenu(project, renderState)}
      ${renderBusinessIdeaCanvasPalettePopover(project, renderState)}
      ${renderBusinessIdeaCanvasPaletteEditor(renderState)}
    </div>
  `;
}

function renderBusinessIdeaCanvasTopToolbar(project: SelfEmploymentProject, renderState: BusinessIdeaCanvasRenderState): string {
  const meta = project.businessIdeaCanvasMeta;
  return `
    <div class="business-canvas-topbar" aria-label="Canvas-Toolbar">
      <div class="business-canvas-topbar-group">
        <button class="button mini" type="button" data-action="business-canvas-add-node">Karte hinzufuegen</button>
        <button class="button mini secondary" type="button" data-action="business-canvas-paste-selection" ${renderState.clipboardAvailable ? "" : "disabled"}>Einfuegen</button>
        <button class="button mini secondary" type="button" data-action="business-canvas-zoom-out" aria-label="Verkleinern">-</button>
        <button class="button mini secondary" type="button" data-action="business-canvas-zoom-in" aria-label="Vergroessern">+</button>
        <button class="button mini secondary" type="button" data-action="business-canvas-reset-view">Reset</button>
      </div>
      <div class="business-canvas-topbar-group">
        <div class="business-canvas-compact-field">
          <span>Label</span>
          <div class="business-canvas-chip-group business-canvas-label-chip-group" role="group" aria-label="Aktives Label">
            ${renderLabelButtons(meta.labels, meta.activeLabelId, "meta", "activeLabelId")}
          </div>
        </div>
        <div class="business-canvas-compact-field">
          <span>Phase</span>
          <div class="business-canvas-chip-group business-canvas-phase-chip-group" role="group" aria-label="Aktive Phase">
            ${renderPhaseButtons(orderedPhases(meta), meta.activePhaseId, "meta", "activePhaseId")}
          </div>
        </div>
        <label class="business-canvas-toggle">
          <input type="checkbox" data-business-canvas-grid-field="snap" ${meta.grid.snap ? "checked" : ""} />
          <span>Snap</span>
        </label>
      </div>
    </div>
  `;
}

function renderBusinessIdeaCanvasSvg(
  project: SelfEmploymentProject,
  renderState: BusinessIdeaCanvasRenderState
): string {
  return `
    <svg
      class="business-canvas-edges"
      width="${BUSINESS_IDEA_CANVAS_WIDTH}"
      height="${BUSINESS_IDEA_CANVAS_HEIGHT}"
      viewBox="0 0 ${BUSINESS_IDEA_CANVAS_WIDTH} ${BUSINESS_IDEA_CANVAS_HEIGHT}"
      aria-hidden="true"
    >
      <defs>
        <marker id="businessCanvasArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z"></path>
        </marker>
      </defs>
      ${project.businessIdeaCanvas.edges.map((edge) => renderBusinessIdeaCanvasEdge(project, edge, renderState)).join("")}
    </svg>
  `;
}

function renderBusinessIdeaCanvasEdge(
  project: SelfEmploymentProject,
  edge: JsonCanvasEdge,
  renderState: BusinessIdeaCanvasRenderState
): string {
  const fromNode = project.businessIdeaCanvas.nodes.find((node) => node.id === edge.fromNode);
  const toNode = project.businessIdeaCanvas.nodes.find((node) => node.id === edge.toNode);
  if (!fromNode || !toNode) return "";
  const fromSide = edge.fromSide ?? "right";
  const toSide = edge.toSide ?? "left";
  const from = toSvgPoint(canvasAnchorPoint(fromNode, fromSide));
  const to = toSvgPoint(canvasAnchorPoint(toNode, toSide));
  const path = edgePath(from, to, fromSide, toSide);
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const direction = businessIdeaCanvasDirectionFromEdge(edge);
  const selected = renderState.selectedEdgeId === edge.id;
  return `
    <g class="business-canvas-edge-group${selected ? " selected" : ""}" data-business-canvas-edge-id="${escapeHtml(edge.id)}">
      <path class="business-canvas-edge-hit" d="${path}" data-business-canvas-edge-hit="${escapeHtml(edge.id)}"></path>
      <path
        class="business-canvas-edge-line business-canvas-edge-direction-${direction}"
        d="${path}"
        ${edge.fromEnd === "arrow" ? 'marker-start="url(#businessCanvasArrow)"' : ""}
        ${(edge.toEnd ?? "arrow") === "arrow" ? 'marker-end="url(#businessCanvasArrow)"' : ""}
      ></path>
      ${
        edge.label
          ? `<text class="business-canvas-edge-label" x="${mid.x}" y="${mid.y - 8}" data-business-canvas-edge-label="${escapeHtml(
              edge.id
            )}">${escapeHtml(edge.label)}</text>`
          : ""
      }
      <circle
        class="business-canvas-edge-branch"
        cx="${mid.x}"
        cy="${mid.y}"
        r="7"
        data-business-canvas-edge-branch="${escapeHtml(edge.id)}"
        data-business-canvas-branch-x="${mid.x - BUSINESS_IDEA_CANVAS_ORIGIN}"
        data-business-canvas-branch-y="${mid.y - BUSINESS_IDEA_CANVAS_ORIGIN}"
      ></circle>
    </g>
  `;
}

function renderBusinessIdeaCanvasNode(
  project: SelfEmploymentProject,
  node: JsonCanvasNode,
  renderState: BusinessIdeaCanvasRenderState
): string {
  const meta = project.businessIdeaCanvasMeta.nodeMeta[node.id];
  const selected = renderState.selectedNodeIds.includes(node.id);
  const editing = renderState.editingNodeId === node.id;
  const armed = renderState.armedNodeId === node.id;
  const label = project.businessIdeaCanvasMeta.labels.find((item) => item.id === meta?.labelId);
  const phase = project.businessIdeaCanvasMeta.phases.find((item) => item.id === meta?.phaseId);
  const shape = node.type === "group" ? "rectangle" : meta?.shape ?? "rounded-rectangle";
  const colorClass = businessIdeaColorClass(node.color);
  const text = businessIdeaCanvasNodeText(node);
  const isSingleCardSelection = selected && renderState.selectedNodeIds.length === 1 && node.type !== "group";
  return `
    <article
      class="business-canvas-node ${node.type === "group" ? "business-canvas-group-node" : ""} business-canvas-shape-${shape} ${colorClass}${selected ? " selected" : ""}${editing ? " editing" : ""}${armed ? " armed" : ""}"
      data-business-canvas-node-id="${escapeHtml(node.id)}"
      data-business-canvas-node-kind="${node.type === "group" ? "group" : "card"}"
      style="left:${node.x + BUSINESS_IDEA_CANVAS_ORIGIN}px;top:${node.y + BUSINESS_IDEA_CANVAS_ORIGIN}px;width:${node.width}px;height:${node.height}px;${businessIdeaColorStyle(
        node.color
      )}"
      tabindex="0"
    >
      ${
        node.type === "group"
          ? `<div class="business-canvas-group-title">${escapeHtml(text)}</div>`
          : `<div class="business-canvas-node-badges">
              <span>${escapeHtml(label?.name ?? "Idee")}</span>
              <span class="business-canvas-phase-badge" title="${escapeHtml(phase?.name ?? "Phase 1")}">${escapeHtml(
                phaseBadgeLabel(phase?.order ?? 1)
              )}</span>
            </div>
            <div
              class="business-canvas-node-text"
              data-business-canvas-node-text="${escapeHtml(node.id)}"
              ${editing && node.type === "text" ? 'contenteditable="true" spellcheck="true"' : ""}
            >${escapeHtml(text)}</div>`
      }
      ${isSingleCardSelection ? renderBusinessIdeaCanvasAnchors(node.id) : ""}
      ${selected ? `<span class="business-canvas-resize-handle" data-business-canvas-resize="${escapeHtml(node.id)}"></span>` : ""}
    </article>
  `;
}

function renderBusinessIdeaCanvasAnchors(nodeId: string): string {
  const sides: JsonCanvasSide[] = ["top", "right", "bottom", "left"];
  return sides
    .map(
      (side) => `
        <span
          class="business-canvas-anchor ${side}"
          data-business-canvas-anchor="${side}"
          data-business-canvas-anchor-node-id="${escapeHtml(nodeId)}"
          aria-hidden="true"
        ></span>
      `
    )
    .join("");
}

function renderBusinessIdeaCanvasSelectionRect(renderState: BusinessIdeaCanvasRenderState): string {
  const rect = renderState.selectionRect;
  if (!rect) return "";
  const left = rect.width < 0 ? rect.x + rect.width : rect.x;
  const top = rect.height < 0 ? rect.y + rect.height : rect.y;
  return `
    <div
      class="business-canvas-selection-rect"
      style="left:${left + BUSINESS_IDEA_CANVAS_ORIGIN}px;top:${top + BUSINESS_IDEA_CANVAS_ORIGIN}px;width:${Math.abs(
        rect.width
      )}px;height:${Math.abs(rect.height)}px;"
      data-business-canvas-selection-rect
    ></div>
  `;
}

function renderBusinessIdeaCanvasNodeToolbar(
  project: SelfEmploymentProject,
  renderState: BusinessIdeaCanvasRenderState
): string {
  if (renderState.selectedNodeIds.length !== 1) return "";
  const selectedNode = project.businessIdeaCanvas.nodes.find((node) => node.id === renderState.selectedNodeIds[0]);
  if (!selectedNode) return "";
  const meta = project.businessIdeaCanvasMeta;
  const nodeMeta = meta.nodeMeta[selectedNode.id];
  const left = Math.max(0, selectedNode.x + BUSINESS_IDEA_CANVAS_ORIGIN);
  const top = Math.max(0, selectedNode.y + BUSINESS_IDEA_CANVAS_ORIGIN - 50);
  if (selectedNode.type === "group") {
    return `
      <div class="business-canvas-node-toolbar" style="left:${left}px;top:${top}px;" data-business-canvas-node-toolbar>
        ${renderPaletteButton([selectedNode.id], selectedNode.color)}
        <button class="icon-button danger" type="button" data-action="business-canvas-delete-node" title="Loeschen" aria-label="Loeschen">x</button>
      </div>
    `;
  }
  return `
    <div class="business-canvas-node-toolbar" style="left:${left}px;top:${top}px;" data-business-canvas-node-toolbar>
      ${renderPaletteButton([selectedNode.id], selectedNode.color)}
      <div class="business-canvas-icon-segment" role="group" aria-label="Form">
        ${renderShapeButtons(nodeMeta?.shape ?? "rounded-rectangle")}
      </div>
      <div class="business-canvas-chip-group business-canvas-label-chip-group" role="group" aria-label="Label">
        ${renderLabelButtons(meta.labels, nodeMeta?.labelId ?? meta.activeLabelId, "node", "labelId")}
      </div>
      <div class="business-canvas-chip-group business-canvas-phase-chip-group" role="group" aria-label="Phase">
        ${renderPhaseButtons(orderedPhases(meta), nodeMeta?.phaseId ?? meta.activePhaseId, "node", "phaseId")}
      </div>
      <button class="icon-button" type="button" data-action="business-canvas-start-connect-node" title="Verbindung starten" aria-label="Verbindung starten">+</button>
      <button class="icon-button" type="button" data-action="business-canvas-copy-selection" title="Kopieren" aria-label="Kopieren">C</button>
      <button class="icon-button" type="button" data-action="business-canvas-duplicate-node" title="Duplizieren" aria-label="Duplizieren">::</button>
      <button class="icon-button danger" type="button" data-action="business-canvas-delete-node" title="Loeschen" aria-label="Loeschen">x</button>
    </div>
  `;
}

function renderBusinessIdeaCanvasMultiToolbar(
  project: SelfEmploymentProject,
  renderState: BusinessIdeaCanvasRenderState
): string {
  if (renderState.selectedNodeIds.length < 2) return "";
  const nodes = project.businessIdeaCanvas.nodes.filter((node) => renderState.selectedNodeIds.includes(node.id));
  const bounds = businessIdeaCanvasBoundsForNodes(nodes);
  if (!bounds) return "";
  const left = Math.max(0, bounds.x + BUSINESS_IDEA_CANVAS_ORIGIN);
  const top = Math.max(0, bounds.y + BUSINESS_IDEA_CANVAS_ORIGIN - 50);
  return `
    <div class="business-canvas-multi-toolbar" style="left:${left}px;top:${top}px;" data-business-canvas-multi-toolbar>
      <strong>${intNumber(nodes.length)}</strong>
      <button class="icon-button" type="button" data-action="business-canvas-copy-selection" title="Kopieren" aria-label="Kopieren">C</button>
      <button class="icon-button" type="button" data-action="business-canvas-paste-selection" ${renderState.clipboardAvailable ? "" : "disabled"} title="Einfuegen" aria-label="Einfuegen">V</button>
      <button class="icon-button" type="button" data-action="business-canvas-create-group" title="Gruppe erstellen" aria-label="Gruppe erstellen">G</button>
      ${renderPaletteButton(renderState.selectedNodeIds, nodes[0]?.color)}
      <button class="icon-button" type="button" data-action="business-canvas-align-left" title="Links ausrichten" aria-label="Links ausrichten">|</button>
      <button class="icon-button" type="button" data-action="business-canvas-align-top" title="Oben ausrichten" aria-label="Oben ausrichten">_</button>
      <button class="icon-button danger" type="button" data-action="business-canvas-delete-node" title="Loeschen" aria-label="Loeschen">x</button>
    </div>
  `;
}

function renderShapeButtons(selectedShape: BusinessIdeaCanvasShape): string {
  return BUSINESS_CANVAS_SHAPE_OPTIONS.map(
    (shape) => `
      <button
        class="business-canvas-icon-choice${shape.id === selectedShape ? " active" : ""}"
        type="button"
        data-action="business-canvas-set-selected-node-field"
        data-business-canvas-selected-node-field="shape"
        data-business-canvas-selected-node-value="${escapeHtml(shape.id)}"
        title="${escapeHtml(shape.label)}"
        aria-label="${escapeHtml(shape.label)}"
        aria-pressed="${shape.id === selectedShape}"
      >${escapeHtml(shape.icon)}</button>
    `
  ).join("");
}

function renderLabelButtons(
  labels: BusinessIdeaCanvasMeta["labels"],
  selectedLabelId: string,
  target: "meta" | "node",
  field: "activeLabelId" | "labelId"
): string {
  return labels
    .map((label) => {
      const selected = label.id === selectedLabelId;
      return `
        <button
          class="business-canvas-label-chip ${businessIdeaColorClass(label.color)}${selected ? " active" : ""}"
          type="button"
          data-action="${target === "meta" ? "business-canvas-set-meta-field" : "business-canvas-set-selected-node-field"}"
          ${
            target === "meta"
              ? `data-business-canvas-meta-field="${escapeHtml(field)}" data-business-canvas-meta-value="${escapeHtml(label.id)}"`
              : `data-business-canvas-selected-node-field="${escapeHtml(field)}" data-business-canvas-selected-node-value="${escapeHtml(label.id)}"`
          }
          title="${escapeHtml(label.name)}"
          aria-label="${escapeHtml(label.name)}"
          aria-pressed="${selected}"
          style="${businessIdeaColorStyle(label.color)}"
        >
          <span class="business-canvas-label-dot" aria-hidden="true"></span>
          <span>${escapeHtml(label.name)}</span>
        </button>
      `;
    })
    .join("");
}

function renderPhaseButtons(
  phases: BusinessIdeaCanvasMeta["phases"],
  selectedPhaseId: string,
  target: "meta" | "node",
  field: "activePhaseId" | "phaseId"
): string {
  return phases
    .map((phase) => {
      const selected = phase.id === selectedPhaseId;
      const label = phaseBadgeLabel(phase.order);
      return `
        <button
          class="business-canvas-phase-badge-button${selected ? " active" : ""}"
          type="button"
          data-action="${target === "meta" ? "business-canvas-set-meta-field" : "business-canvas-set-selected-node-field"}"
          ${
            target === "meta"
              ? `data-business-canvas-meta-field="${escapeHtml(field)}" data-business-canvas-meta-value="${escapeHtml(phase.id)}"`
              : `data-business-canvas-selected-node-field="${escapeHtml(field)}" data-business-canvas-selected-node-value="${escapeHtml(phase.id)}"`
          }
          title="${escapeHtml(phase.name)}"
          aria-label="${escapeHtml(phase.name)}"
          aria-pressed="${selected}"
        >${escapeHtml(label)}</button>
      `;
    })
    .join("");
}

function renderPaletteButton(nodeIds: string[], color: string | undefined): string {
  return `
    <button
      class="icon-button business-canvas-color-button"
      type="button"
      data-action="business-canvas-open-palette"
      data-business-canvas-palette-node-ids="${escapeHtml(nodeIds.join(","))}"
      title="Farbe"
      aria-label="Farbe"
    >
      <span class="business-canvas-color-dot ${businessIdeaColorClass(color)}" style="${businessIdeaColorStyle(color)}"></span>
    </button>
  `;
}

function renderBusinessIdeaCanvasEdgeToolbar(
  project: SelfEmploymentProject,
  renderState: BusinessIdeaCanvasRenderState
): string {
  const edge = project.businessIdeaCanvas.edges.find((item) => item.id === renderState.selectedEdgeId);
  if (!edge) return "";
  const fromNode = project.businessIdeaCanvas.nodes.find((node) => node.id === edge.fromNode);
  const toNode = project.businessIdeaCanvas.nodes.find((node) => node.id === edge.toNode);
  if (!fromNode || !toNode) return "";
  const from = canvasAnchorPoint(fromNode, edge.fromSide ?? "right");
  const to = canvasAnchorPoint(toNode, edge.toSide ?? "left");
  const left = (from.x + to.x) / 2 + BUSINESS_IDEA_CANVAS_ORIGIN + 12;
  const top = (from.y + to.y) / 2 + BUSINESS_IDEA_CANVAS_ORIGIN + 12;
  return `
    <div class="business-canvas-edge-toolbar" style="left:${left}px;top:${top}px;" data-business-canvas-edge-toolbar>
      <input
        type="text"
        value="${escapeHtml(edge.label ?? "")}"
        aria-label="Verbindungslabel"
        data-business-canvas-selected-edge-field="label"
      />
      <select aria-label="Pfeilrichtung" data-business-canvas-selected-edge-field="direction">
        ${businessIdeaCanvasDirectionOptions(businessIdeaCanvasDirectionFromEdge(edge))}
      </select>
      <button class="icon-button danger" type="button" data-action="business-canvas-delete-edge" aria-label="Verbindung loeschen" title="Verbindung loeschen">x</button>
    </div>
  `;
}

function renderBusinessIdeaCanvasLineMenu(projectId: string, lineMenu: BusinessIdeaCanvasLineMenuState): string {
  return `
    <div class="business-canvas-line-menu" style="left:${lineMenu.x + BUSINESS_IDEA_CANVAS_ORIGIN + 12}px;top:${lineMenu.y + BUSINESS_IDEA_CANVAS_ORIGIN + 12}px;">
      <button
        class="button mini"
        type="button"
        data-action="business-canvas-add-node-from-line"
        data-business-canvas-project-id="${escapeHtml(projectId)}"
        data-business-canvas-edge-id="${escapeHtml(lineMenu.edgeId)}"
      >Karte hinzufuegen</button>
    </div>
  `;
}

function renderBusinessIdeaCanvasContextMenu(project: SelfEmploymentProject, renderState: BusinessIdeaCanvasRenderState): string {
  const menu = renderState.contextMenu;
  if (!menu || menu.projectId !== project.id) return "";
  const isSelection = menu.mode === "selection";
  const isNode = menu.mode === "node";
  return `
    <div class="business-canvas-context-menu" style="left:${menu.x}px;top:${menu.y}px;" data-business-canvas-context-menu>
      ${
        isSelection
          ? `
            ${renderContextMenuButton("business-canvas-copy-selection", "⧉", "Auswahl kopieren")}
            ${renderContextMenuButton("business-canvas-create-group", "▦", "Gruppe erstellen")}
            ${renderContextMenuButton("business-canvas-open-palette", "🎨", "Farbe aendern")}
            ${renderContextMenuButton("business-canvas-delete-node", "🗑", "Auswahl loeschen", "", true)}
          `
          : isNode
            ? `
              ${renderContextMenuButton(
                "business-canvas-edit-node",
                "✎",
                "Bearbeiten",
                `data-business-canvas-node-id="${escapeHtml(menu.nodeId ?? "")}"`
              )}
              ${renderContextMenuButton("business-canvas-copy-selection", "⧉", "Kopieren")}
              ${renderContextMenuButton("business-canvas-open-palette", "🎨", "Farbe aendern")}
              ${renderContextMenuButton("business-canvas-delete-node", "🗑", "Loeschen", "", true)}
            `
            : `
              ${renderContextMenuButton(
                "business-canvas-context-add-node",
                "＋",
                "Neue Karte",
                `data-business-canvas-x="${menu.canvasX}" data-business-canvas-y="${menu.canvasY}"`
              )}
              ${renderContextMenuButton(
                "business-canvas-context-add-group",
                "▦",
                "Neue Gruppe",
                `data-business-canvas-x="${menu.canvasX}" data-business-canvas-y="${menu.canvasY}"`
              )}
              ${renderContextMenuButton(
                "business-canvas-paste-selection",
                "⧉",
                "Einfuegen",
                `data-business-canvas-x="${menu.canvasX}" data-business-canvas-y="${menu.canvasY}" ${renderState.clipboardAvailable ? "" : "disabled"}`
              )}
            `
      }
    </div>
  `;
}

function renderContextMenuButton(action: string, icon: string, label: string, attributes = "", danger = false): string {
  return `
    <button class="${danger ? "danger" : ""}" type="button" data-action="${escapeHtml(action)}" ${attributes}>
      <span class="business-canvas-context-menu-icon" aria-hidden="true">${escapeHtml(icon)}</span>
      <span>${escapeHtml(label)}</span>
    </button>
  `;
}

function renderBusinessIdeaCanvasPalettePopover(project: SelfEmploymentProject, renderState: BusinessIdeaCanvasRenderState): string {
  const popover = renderState.palettePopover;
  if (!popover || popover.projectId !== project.id) return "";
  const palette = businessIdeaCanvasPaletteRows(project.businessIdeaCanvasMeta.palette);
  return `
    <div class="business-canvas-palette-popover" style="left:${popover.x}px;top:${popover.y}px;" data-business-canvas-palette-popover>
      <div class="business-canvas-palette-row business-canvas-palette-row-standard" data-business-canvas-palette-row="standard">
        ${renderPaletteSwatches(palette.standard)}
      </div>
      ${
        palette.visibleCustom.length
          ? `<div class="business-canvas-palette-row business-canvas-palette-row-custom" data-business-canvas-palette-row="custom">
              ${renderPaletteSwatches(palette.visibleCustom)}
            </div>`
          : ""
      }
      <button class="button mini secondary" type="button" data-action="business-canvas-open-palette-editor">Palette bearbeiten</button>
    </div>
  `;
}

function renderPaletteSwatches(colors: BusinessIdeaCanvasPaletteColor[]): string {
  return colors
    .map(
      (item) => `
        <button
          class="business-canvas-palette-swatch ${businessIdeaColorClass(item.color)}"
          type="button"
          data-action="business-canvas-apply-palette-color"
          data-business-canvas-color="${escapeHtml(item.color)}"
          title="${escapeHtml(item.name)}"
          aria-label="${escapeHtml(item.name)}"
          style="${businessIdeaColorStyle(item.color)}"
        ></button>
      `
    )
    .join("");
}

function renderBusinessIdeaCanvasPaletteEditor(renderState: BusinessIdeaCanvasRenderState): string {
  const editor = renderState.paletteEditor;
  if (!editor) return "";
  return `
    <div class="business-canvas-palette-editor" data-business-canvas-palette-editor>
      <label class="business-canvas-compact-field">
        <span>Name</span>
        <input type="text" value="${escapeHtml(editor.name)}" data-business-canvas-palette-field="name" />
      </label>
      <label class="business-canvas-compact-field">
        <span>Farbe</span>
        <input type="color" value="${escapeHtml(editor.color.startsWith("#") ? editor.color : "#64748b")}" data-business-canvas-palette-field="color" />
      </label>
      ${editor.error ? `<p class="business-canvas-palette-error">${escapeHtml(editor.error)}</p>` : ""}
      <div class="business-canvas-palette-editor-actions">
        <button class="button mini" type="button" data-action="business-canvas-save-palette-color">Speichern</button>
        <button class="button mini secondary" type="button" data-action="business-canvas-close-palette-editor">Schliessen</button>
      </div>
    </div>
  `;
}

function renderBusinessIdeaCanvasGantt(project: SelfEmploymentProject): string {
  const rows = businessIdeaCanvasGanttRows(project.businessIdeaCanvas, project.businessIdeaCanvasMeta);
  return `
    <aside class="business-canvas-gantt" aria-label="Gantt-Auswertung">
      <div class="business-canvas-gantt-head">
        <h4>Gantt-Auswertung</h4>
        <span>${intNumber(businessIdeaCanvasCardNodes(project.businessIdeaCanvas).length)} Karten</span>
      </div>
      <div class="business-canvas-gantt-rows">
        ${rows
          .map(
            (row) => `
              <div class="business-canvas-gantt-row">
                <span class="business-canvas-gantt-phase">${escapeHtml(row.phaseName)}</span>
                <div class="business-canvas-gantt-bar">
                  ${
                    row.count
                      ? `<span
                          class="business-canvas-gantt-fill"
                          style="width:${Math.max(0, row.ratio * 100)}%;--business-canvas-gantt-color:${escapeHtml(row.phaseColor)};"
                          title="${escapeHtml(`${row.phaseName}: ${row.count}`)}"
                        ></span>`
                      : `<span class="business-canvas-gantt-empty"></span>`
                  }
                </div>
                <strong>${intNumber(row.count)}</strong>
              </div>
            `
          )
          .join("")}
      </div>
    </aside>
  `;
}

function option(value: string, label: string, selectedValue: string): string {
  return `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function orderedPhases(meta: BusinessIdeaCanvasMeta): BusinessIdeaCanvasMeta["phases"] {
  return [...meta.phases].sort((a, b) => a.order - b.order);
}

function phaseBadgeLabel(order: number): string {
  const normalized = Number.isFinite(order) && order > 0 ? Math.round(order) : 1;
  return String(normalized);
}

function toSvgPoint(point: { x: number; y: number }): { x: number; y: number } {
  return {
    x: point.x + BUSINESS_IDEA_CANVAS_ORIGIN,
    y: point.y + BUSINESS_IDEA_CANVAS_ORIGIN
  };
}

function edgePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromSide: JsonCanvasSide,
  toSide: JsonCanvasSide
): string {
  const distance = Math.max(80, Math.min(220, Math.abs(to.x - from.x) * 0.45 + Math.abs(to.y - from.y) * 0.25));
  const fromControl = controlPoint(from, fromSide, distance);
  const toControl = controlPoint(to, toSide, distance);
  return `M ${from.x} ${from.y} C ${fromControl.x} ${fromControl.y}, ${toControl.x} ${toControl.y}, ${to.x} ${to.y}`;
}

function controlPoint(point: { x: number; y: number }, side: JsonCanvasSide, distance: number): { x: number; y: number } {
  if (side === "top") return { x: point.x, y: point.y - distance };
  if (side === "right") return { x: point.x + distance, y: point.y };
  if (side === "bottom") return { x: point.x, y: point.y + distance };
  return { x: point.x - distance, y: point.y };
}

function businessIdeaColorClass(color: string | undefined): string {
  return color && BUSINESS_IDEA_CANVAS_COLOR_OPTIONS.includes(color as (typeof BUSINESS_IDEA_CANVAS_COLOR_OPTIONS)[number])
    ? `business-canvas-color-${color}`
    : "business-canvas-color-custom";
}

function businessIdeaColorStyle(color: string | undefined): string {
  return color && color.startsWith("#") ? `--business-canvas-custom-color:${escapeHtml(color)};` : "";
}

export function businessIdeaCanvasDirectionOptions(
  selectedValue: BusinessIdeaCanvasEdgeDirection
): string {
  return [
    option("none", "Keine Pfeile", selectedValue),
    option("forward", "Vorwaerts", selectedValue),
    option("backward", "Rueckwaerts", selectedValue),
    option("both", "Beide", selectedValue)
  ].join("");
}
