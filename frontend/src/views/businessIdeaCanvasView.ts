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
  fromNodeId?: string;
  fromSide?: JsonCanvasSide;
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
  editingEdgeLabelId: string | null;
  editingEdgeLabelDraft: string;
  armedNodeId: string | null;
  lineMenu: BusinessIdeaCanvasLineMenuState | null;
  selectionRect: BusinessIdeaCanvasSelectionRectState | null;
  contextMenu: BusinessIdeaCanvasContextMenuState | null;
  palettePopover: BusinessIdeaCanvasPalettePopoverState | null;
  paletteEditor: BusinessIdeaCanvasPaletteEditorState | null;
  clipboardAvailable: boolean;
}

const BUSINESS_CANVAS_SHAPE_OPTIONS: Array<{ value: BusinessIdeaCanvasShape; icon: string; label: string }> = [
  { value: "rectangle", icon: "▭", label: "Rechteck" },
  { value: "diamond", icon: "◆", label: "Raute" },
  { value: "ellipse", icon: "⬭", label: "Ellipse" },
  { value: "rectangle", icon: "▢", label: "Eckig" },
  { value: "rounded-rectangle", icon: "▣", label: "Abgerundet" }
];
const BUSINESS_CANVAS_EDGE_DIRECTION_OPTIONS: Array<{ value: BusinessIdeaCanvasEdgeDirection; icon: string; label: string }> = [
  { value: "none", icon: "⋯", label: "Gestrichelt" },
  { value: "forward", icon: "→", label: "Pfeil vorwaerts" },
  { value: "backward", icon: "←", label: "Pfeil rueckwaerts" },
  { value: "both", icon: "↔", label: "Beidseitig" }
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
            ${lineMenu}
          </div>
        </div>
        <div class="business-canvas-toolbar-layer" data-business-canvas-toolbar-layer>
          ${renderBusinessIdeaCanvasNodeToolbar(project, renderState)}
          ${renderBusinessIdeaCanvasMultiToolbar(project, renderState)}
          ${renderBusinessIdeaCanvasEdgeToolbar(project, renderState)}
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
          ${renderLabelDropdown(meta.labels, meta.activeLabelId, "meta", "activeLabelId", "Aktives Label")}
        </div>
        <div class="business-canvas-compact-field">
          <span>Phase</span>
          ${renderPhaseDropdown(orderedPhases(meta), meta.activePhaseId, "meta", "activePhaseId", "Aktive Phase")}
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
      data-business-canvas-svg
      aria-label="Canvas-Verbindungen"
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
  const geometry = edgeGeometry(from, to, fromSide, toSide);
  const direction = businessIdeaCanvasDirectionFromEdge(edge);
  const selected = renderState.selectedEdgeId === edge.id;
  const labelText = renderState.editingEdgeLabelId === edge.id ? renderState.editingEdgeLabelDraft : edge.label ?? "";
  const shouldRenderLabel = Boolean(labelText) || selected;
  const labelWidth = edgeLabelWidth(labelText || "Label");
  return `
    <g class="business-canvas-edge-group${selected ? " selected" : ""}" data-business-canvas-edge-id="${escapeHtml(edge.id)}">
      <path class="business-canvas-edge-hit" d="${geometry.path}" data-business-canvas-edge-hit="${escapeHtml(edge.id)}"></path>
      <path
        class="business-canvas-edge-line business-canvas-edge-direction-${direction}"
        d="${geometry.path}"
        ${edge.fromEnd === "arrow" ? 'marker-start="url(#businessCanvasArrow)"' : ""}
        ${(edge.toEnd ?? "arrow") === "arrow" ? 'marker-end="url(#businessCanvasArrow)"' : ""}
      ></path>
      <circle
        class="business-canvas-edge-branch"
        cx="${geometry.label.x}"
        cy="${geometry.label.y}"
        r="7"
        data-business-canvas-edge-branch="${escapeHtml(edge.id)}"
        data-business-canvas-branch-x="${geometry.label.x - BUSINESS_IDEA_CANVAS_ORIGIN}"
        data-business-canvas-branch-y="${geometry.label.y - BUSINESS_IDEA_CANVAS_ORIGIN}"
      ></circle>
      ${
        shouldRenderLabel
          ? renderBusinessIdeaCanvasEdgeLabel(edge.id, labelText, renderState.editingEdgeLabelId === edge.id, geometry.label, labelWidth)
          : ""
      }
    </g>
  `;
}

function renderBusinessIdeaCanvasEdgeLabel(
  edgeId: string,
  label: string,
  editing: boolean,
  point: { x: number; y: number },
  width: number
): string {
  const height = 28;
  const x = point.x - width / 2;
  const y = point.y - height / 2;
  const value = label || "Label";
  return `
    <foreignObject
      class="business-canvas-edge-label-foreign"
      x="${x}"
      y="${y}"
      width="${width}"
      height="${height}"
      data-business-canvas-edge-label-width="${width}"
    >
      ${
        editing
          ? `<input
              xmlns="http://www.w3.org/1999/xhtml"
              class="business-canvas-edge-label-input"
              type="text"
              value="${escapeHtml(label)}"
              data-business-canvas-edge-label-input="${escapeHtml(edgeId)}"
              aria-label="Verbindungslabel bearbeiten"
            />`
          : `<button
              xmlns="http://www.w3.org/1999/xhtml"
              class="business-canvas-edge-label-button${label ? "" : " empty"}"
              type="button"
              data-business-canvas-edge-label="${escapeHtml(edgeId)}"
              title="Verbindungslabel bearbeiten"
              aria-label="Verbindungslabel bearbeiten"
            >${escapeHtml(value)}</button>`
      }
    </foreignObject>
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
      ${node.type !== "group" ? renderBusinessIdeaCanvasAnchors(node.id) : ""}
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
  const position = toolbarPosition(meta, selectedNode.x, selectedNode.y);
  if (selectedNode.type === "group") {
    return `
      <div class="business-canvas-node-toolbar" style="left:${position.left}px;top:${position.top}px;" data-business-canvas-node-toolbar>
        ${renderPaletteButton([selectedNode.id], selectedNode.color)}
        <button class="icon-button danger" type="button" data-action="business-canvas-delete-node" title="Loeschen" aria-label="Loeschen">x</button>
      </div>
    `;
  }
  return `
    <div class="business-canvas-node-toolbar" style="left:${position.left}px;top:${position.top}px;" data-business-canvas-node-toolbar>
      ${renderPaletteButton([selectedNode.id], selectedNode.color)}
      ${renderShapeDropdown(nodeMeta?.shape ?? "rounded-rectangle")}
      ${renderLabelDropdown(meta.labels, nodeMeta?.labelId ?? meta.activeLabelId, "node", "labelId", "Label")}
      ${renderPhaseDropdown(orderedPhases(meta), nodeMeta?.phaseId ?? meta.activePhaseId, "node", "phaseId", "Phase")}
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
  const position = toolbarPosition(project.businessIdeaCanvasMeta, bounds.x, bounds.y);
  return `
    <div class="business-canvas-multi-toolbar" style="left:${position.left}px;top:${position.top}px;" data-business-canvas-multi-toolbar>
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

function renderShapeDropdown(selectedShape: BusinessIdeaCanvasShape): string {
  const selectedIndex = Math.max(0, BUSINESS_CANVAS_SHAPE_OPTIONS.findIndex((shape) => shape.value === selectedShape));
  const selected = BUSINESS_CANVAS_SHAPE_OPTIONS[selectedIndex] ?? BUSINESS_CANVAS_SHAPE_OPTIONS[0];
  return `
    <details class="business-canvas-dropdown business-canvas-shape-dropdown" data-business-canvas-dropdown>
      <summary class="business-canvas-dropdown-trigger business-canvas-shape-trigger" title="Form" aria-label="Form">
        <span aria-hidden="true">${escapeHtml(selected.icon)}</span>
      </summary>
      <div class="business-canvas-dropdown-menu" role="menu">
        ${BUSINESS_CANVAS_SHAPE_OPTIONS.map(
          (shape, index) => `
            <button
              class="business-canvas-dropdown-option${index === selectedIndex ? " active" : ""}"
              type="button"
              data-action="business-canvas-set-selected-node-field"
              data-business-canvas-selected-node-field="shape"
              data-business-canvas-selected-node-value="${escapeHtml(shape.value)}"
              title="${escapeHtml(shape.label)}"
              aria-label="${escapeHtml(shape.label)}"
            >
              <span class="business-canvas-dropdown-option-icon" aria-hidden="true">${escapeHtml(shape.icon)}</span>
              <span>${escapeHtml(shape.label)}</span>
            </button>
          `
        ).join("")}
      </div>
    </details>
  `;
}

function renderLabelDropdown(
  labels: BusinessIdeaCanvasMeta["labels"],
  selectedLabelId: string,
  target: "meta" | "node",
  field: "activeLabelId" | "labelId",
  ariaLabel: string
): string {
  const selectedLabel = labels.find((label) => label.id === selectedLabelId) ?? labels[0];
  return `
    <details class="business-canvas-dropdown business-canvas-label-dropdown" data-business-canvas-dropdown>
      <summary
        class="business-canvas-dropdown-trigger business-canvas-label-trigger ${businessIdeaColorClass(selectedLabel?.color)}"
        title="${escapeHtml(selectedLabel?.name ?? ariaLabel)}"
        aria-label="${escapeHtml(ariaLabel)}"
        style="${businessIdeaColorStyle(selectedLabel?.color)}"
      >
        <span class="business-canvas-label-dot" aria-hidden="true"></span>
        <span>${escapeHtml(selectedLabel?.name ?? "Label")}</span>
      </summary>
      <div class="business-canvas-dropdown-menu" role="menu">
        ${labels
          .map((label) => {
            const selected = label.id === selectedLabelId;
            return `
              <button
                class="business-canvas-dropdown-option ${businessIdeaColorClass(label.color)}${selected ? " active" : ""}"
                type="button"
                data-action="${target === "meta" ? "business-canvas-set-meta-field" : "business-canvas-set-selected-node-field"}"
                ${
                  target === "meta"
                    ? `data-business-canvas-meta-field="${escapeHtml(field)}" data-business-canvas-meta-value="${escapeHtml(label.id)}"`
                    : `data-business-canvas-selected-node-field="${escapeHtml(field)}" data-business-canvas-selected-node-value="${escapeHtml(label.id)}"`
                }
                title="${escapeHtml(label.name)}"
                aria-label="${escapeHtml(label.name)}"
                style="${businessIdeaColorStyle(label.color)}"
              >
                <span class="business-canvas-label-dot" aria-hidden="true"></span>
                <span>${escapeHtml(label.name)}</span>
              </button>
            `;
          })
          .join("")}
      </div>
    </details>
  `;
}

function renderPhaseDropdown(
  phases: BusinessIdeaCanvasMeta["phases"],
  selectedPhaseId: string,
  target: "meta" | "node",
  field: "activePhaseId" | "phaseId",
  ariaLabel: string
): string {
  const selectedPhase = phases.find((phase) => phase.id === selectedPhaseId) ?? phases[0];
  return `
    <details class="business-canvas-dropdown business-canvas-phase-dropdown" data-business-canvas-dropdown>
      <summary class="business-canvas-dropdown-trigger business-canvas-phase-trigger" title="${escapeHtml(
        selectedPhase?.name ?? ariaLabel
      )}" aria-label="${escapeHtml(ariaLabel)}">
        <span class="business-canvas-phase-badge-button">${escapeHtml(phaseBadgeLabel(selectedPhase?.order ?? 1))}</span>
      </summary>
      <div class="business-canvas-dropdown-menu" role="menu">
        ${phases
          .map((phase) => {
            const selected = phase.id === selectedPhaseId;
            return `
              <button
                class="business-canvas-dropdown-option${selected ? " active" : ""}"
                type="button"
                data-action="${target === "meta" ? "business-canvas-set-meta-field" : "business-canvas-set-selected-node-field"}"
                ${
                  target === "meta"
                    ? `data-business-canvas-meta-field="${escapeHtml(field)}" data-business-canvas-meta-value="${escapeHtml(phase.id)}"`
                    : `data-business-canvas-selected-node-field="${escapeHtml(field)}" data-business-canvas-selected-node-value="${escapeHtml(phase.id)}"`
                }
                title="${escapeHtml(phase.name)}"
                aria-label="${escapeHtml(phase.name)}"
              >
                <span class="business-canvas-phase-menu-badge" aria-hidden="true">${escapeHtml(phaseBadgeLabel(phase.order))}</span>
                <span>${escapeHtml(phase.name)}</span>
              </button>
            `;
          })
          .join("")}
      </div>
    </details>
  `;
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
  const position = edgeToolbarPosition(project.businessIdeaCanvasMeta, from, to);
  const direction = businessIdeaCanvasDirectionFromEdge(edge);
  return `
    <div class="business-canvas-edge-toolbar" style="left:${position.left}px;top:${position.top}px;" data-business-canvas-edge-toolbar>
      ${renderEdgeDirectionDropdown(direction)}
      <button class="icon-button" type="button" data-action="business-canvas-edit-edge-label" title="Label bearbeiten" aria-label="Label bearbeiten">T</button>
      <button class="icon-button danger" type="button" data-action="business-canvas-delete-edge" aria-label="Verbindung loeschen" title="Verbindung loeschen">x</button>
    </div>
  `;
}

function renderEdgeDirectionDropdown(selectedDirection: BusinessIdeaCanvasEdgeDirection): string {
  const selected = BUSINESS_CANVAS_EDGE_DIRECTION_OPTIONS.find((item) => item.value === selectedDirection) ?? BUSINESS_CANVAS_EDGE_DIRECTION_OPTIONS[1];
  return `
    <details class="business-canvas-dropdown business-canvas-edge-direction-dropdown" data-business-canvas-dropdown>
      <summary class="business-canvas-dropdown-trigger business-canvas-edge-direction-trigger" title="Linientyp" aria-label="Linientyp">
        <span aria-hidden="true">${escapeHtml(selected.icon)}</span>
      </summary>
      <div class="business-canvas-dropdown-menu" role="menu">
        ${BUSINESS_CANVAS_EDGE_DIRECTION_OPTIONS.map(
          (item) => `
            <button
              class="business-canvas-dropdown-option${item.value === selectedDirection ? " active" : ""}"
              type="button"
              data-action="business-canvas-set-selected-edge-field"
              data-business-canvas-selected-edge-field="direction"
              data-business-canvas-selected-edge-value="${escapeHtml(item.value)}"
              title="${escapeHtml(item.label)}"
              aria-label="${escapeHtml(item.label)}"
            >
              <span class="business-canvas-dropdown-option-icon" aria-hidden="true">${escapeHtml(item.icon)}</span>
              <span>${escapeHtml(item.label)}</span>
            </button>
          `
        ).join("")}
      </div>
    </details>
  `;
}

function renderBusinessIdeaCanvasLineMenu(projectId: string, lineMenu: BusinessIdeaCanvasLineMenuState): string {
  return `
    <div class="business-canvas-line-menu" style="left:${lineMenu.x + BUSINESS_IDEA_CANVAS_ORIGIN + 12}px;top:${lineMenu.y + BUSINESS_IDEA_CANVAS_ORIGIN + 12}px;">
      <button
        class="business-canvas-line-menu-action"
        type="button"
        data-action="business-canvas-add-node-from-line"
        data-business-canvas-project-id="${escapeHtml(projectId)}"
        data-business-canvas-edge-id="${escapeHtml(lineMenu.edgeId)}"
      >
        <span class="business-canvas-context-menu-icon" aria-hidden="true">＋</span>
        <span>Neue Karte</span>
      </button>
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

function toolbarPosition(meta: BusinessIdeaCanvasMeta, x: number, y: number): { left: number; top: number } {
  const viewport = meta.viewport;
  return {
    left: Math.max(8, Math.round(viewport.x + (x + BUSINESS_IDEA_CANVAS_ORIGIN) * viewport.zoom)),
    top: Math.max(8, Math.round(viewport.y + (y + BUSINESS_IDEA_CANVAS_ORIGIN) * viewport.zoom - 48))
  };
}

function edgeToolbarPosition(
  meta: BusinessIdeaCanvasMeta,
  from: { x: number; y: number },
  to: { x: number; y: number }
): { left: number; top: number } {
  const viewport = meta.viewport;
  return {
    left: Math.max(8, Math.round(viewport.x + ((from.x + to.x) / 2 + BUSINESS_IDEA_CANVAS_ORIGIN) * viewport.zoom + 12)),
    top: Math.max(8, Math.round(viewport.y + ((from.y + to.y) / 2 + BUSINESS_IDEA_CANVAS_ORIGIN) * viewport.zoom + 12))
  };
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

function edgeGeometry(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromSide: JsonCanvasSide,
  toSide: JsonCanvasSide
): { path: string; label: { x: number; y: number } } {
  const distance = Math.max(80, Math.min(220, Math.abs(to.x - from.x) * 0.45 + Math.abs(to.y - from.y) * 0.25));
  const fromControl = controlPoint(from, fromSide, distance);
  const toControl = controlPoint(to, toSide, distance);
  return {
    path: `M ${from.x} ${from.y} C ${fromControl.x} ${fromControl.y}, ${toControl.x} ${toControl.y}, ${to.x} ${to.y}`,
    label: cubicPointAtHalfLength(from, fromControl, toControl, to)
  };
}

function controlPoint(point: { x: number; y: number }, side: JsonCanvasSide, distance: number): { x: number; y: number } {
  if (side === "top") return { x: point.x, y: point.y - distance };
  if (side === "right") return { x: point.x + distance, y: point.y };
  if (side === "bottom") return { x: point.x, y: point.y + distance };
  return { x: point.x - distance, y: point.y };
}

function cubicPointAtHalfLength(
  start: { x: number; y: number },
  controlA: { x: number; y: number },
  controlB: { x: number; y: number },
  end: { x: number; y: number }
): { x: number; y: number } {
  const samples = 24;
  const points = Array.from({ length: samples + 1 }, (_, index) => cubicPoint(start, controlA, controlB, end, index / samples));
  const distances = points.slice(1).map((point, index) => pointDistance(points[index], point));
  const total = distances.reduce((sum, distance) => sum + distance, 0);
  if (!Number.isFinite(total) || total <= 0) return cubicPoint(start, controlA, controlB, end, 0.5);
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
  return cubicPoint(start, controlA, controlB, end, 0.5);
}

function cubicPoint(
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

function pointDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function edgeLabelWidth(label: string): number {
  return Math.max(58, Math.min(190, Math.round(label.length * 7.2 + 24)));
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
