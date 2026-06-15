import { numberValue } from "../../../lib/format";
import {
  addBusinessIdeaCanvasGroupAtPoint,
  addBusinessIdeaCanvasNode,
  addBusinessIdeaCanvasNodeAtPoint,
  addBusinessIdeaCanvasNodeFromLine,
  alignBusinessIdeaCanvasSelection,
  applyBusinessIdeaCanvasPaletteColor,
  armBusinessIdeaCanvasConnection,
  closeBusinessIdeaCanvasDropdowns,
  closeBusinessIdeaCanvasOverlays,
  closeBusinessIdeaCanvasPaletteEditor,
  copyBusinessIdeaCanvasSelection,
  createBusinessIdeaCanvasGroupFromSelection,
  deleteBusinessIdeaCanvasSelectedEdge,
  deleteBusinessIdeaCanvasSelectedNode,
  duplicateBusinessIdeaCanvasSelectedNode,
  editBusinessIdeaCanvasNode,
  editSelectedBusinessIdeaCanvasEdgeLabel,
  finishBusinessIdeaCanvasPointer,
  handleBusinessIdeaCanvasContextMenu,
  handleBusinessIdeaCanvasDoubleClick,
  handleBusinessIdeaCanvasFocusOut,
  handleBusinessIdeaCanvasKeyDown,
  handleBusinessIdeaCanvasKeyUp,
  handleBusinessIdeaCanvasWheel,
  moveBusinessIdeaCanvasPointer,
  openBusinessIdeaCanvasPalette,
  openBusinessIdeaCanvasPaletteEditor,
  pasteBusinessIdeaCanvasClipboard,
  resetBusinessIdeaCanvasView,
  saveBusinessIdeaCanvasPaletteColor,
  startBusinessIdeaCanvasPointer,
  updateBusinessIdeaCanvasEdgeLabelDraft,
  updateBusinessIdeaCanvasGridField,
  updateBusinessIdeaCanvasMetaField,
  updateBusinessIdeaCanvasNodeText,
  updateBusinessIdeaCanvasPaletteDraft,
  updateBusinessIdeaCanvasSelectedEdgeField,
  updateBusinessIdeaCanvasSelectedNodeField,
  zoomBusinessIdeaCanvas
} from "./controller";

export function handleBusinessCanvasInput(event: Event): boolean {
  const canvasTextTarget = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-business-canvas-node-text]");
  if (canvasTextTarget?.dataset.businessCanvasNodeText) {
    updateBusinessIdeaCanvasNodeText(canvasTextTarget.dataset.businessCanvasNodeText, canvasTextTarget.textContent ?? "");
    return true;
  }

  const canvasPaletteTarget = (event.target as HTMLElement | null)?.closest<HTMLInputElement>(
    "[data-business-canvas-palette-field]"
  );
  if (canvasPaletteTarget?.dataset.businessCanvasPaletteField) {
    updateBusinessIdeaCanvasPaletteDraft(canvasPaletteTarget.dataset.businessCanvasPaletteField, canvasPaletteTarget.value);
    return true;
  }

  const edgeLabelInput = (event.target as HTMLElement | null)?.closest<HTMLInputElement>(
    "[data-business-canvas-edge-label-input]"
  );
  if (edgeLabelInput?.dataset.businessCanvasEdgeLabelInput) {
    updateBusinessIdeaCanvasEdgeLabelDraft(edgeLabelInput.dataset.businessCanvasEdgeLabelInput, edgeLabelInput.value);
    return true;
  }

  return false;
}

export function handleBusinessCanvasChange(event: Event): boolean {
  const target = (event.target as HTMLElement | null)?.closest<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    "input, select, textarea"
  );
  if (!target) return false;

  if (target.dataset.businessCanvasMetaField) {
    updateBusinessIdeaCanvasMetaField(target.dataset.businessCanvasMetaField, target.value);
    return true;
  }

  if (target.dataset.businessCanvasGridField) {
    updateBusinessIdeaCanvasGridField(
      target.dataset.businessCanvasGridField,
      target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value
    );
    return true;
  }

  if (target.dataset.businessCanvasSelectedNodeField) {
    updateBusinessIdeaCanvasSelectedNodeField(target.dataset.businessCanvasSelectedNodeField, target.value);
    return true;
  }

  if (target.dataset.businessCanvasSelectedEdgeField) {
    updateBusinessIdeaCanvasSelectedEdgeField(target.dataset.businessCanvasSelectedEdgeField, target.value);
    return true;
  }

  return false;
}

export function handleBusinessCanvasClick(event: MouseEvent): boolean {
  const target = event.target as HTMLElement | null;
  const canvasDropdown = target?.closest<HTMLDetailsElement>("[data-business-canvas-dropdown]");
  const button = target?.closest<HTMLButtonElement>("button[data-action]");

  if (canvasDropdown) {
    closeBusinessIdeaCanvasDropdowns(canvasDropdown);
  } else {
    closeBusinessIdeaCanvasDropdowns();
  }

  if (!button) return false;

  const action = button.dataset.action;
  if (!action?.startsWith("business-canvas-")) return false;

  event.preventDefault();
  if (action === "business-canvas-set-meta-field") {
    updateBusinessIdeaCanvasMetaField(button.dataset.businessCanvasMetaField || "", button.dataset.businessCanvasMetaValue || "");
    return true;
  }
  if (action === "business-canvas-set-selected-node-field") {
    updateBusinessIdeaCanvasSelectedNodeField(
      button.dataset.businessCanvasSelectedNodeField || "",
      button.dataset.businessCanvasSelectedNodeValue || ""
    );
    return true;
  }
  if (action === "business-canvas-set-selected-edge-field") {
    updateBusinessIdeaCanvasSelectedEdgeField(
      button.dataset.businessCanvasSelectedEdgeField || "",
      button.dataset.businessCanvasSelectedEdgeValue || ""
    );
    return true;
  }
  if (action === "business-canvas-add-node") {
    addBusinessIdeaCanvasNode();
    return true;
  }
  if (action === "business-canvas-zoom-in") {
    zoomBusinessIdeaCanvas(0.1);
    return true;
  }
  if (action === "business-canvas-zoom-out") {
    zoomBusinessIdeaCanvas(-0.1);
    return true;
  }
  if (action === "business-canvas-reset-view") {
    resetBusinessIdeaCanvasView();
    return true;
  }
  if (action === "business-canvas-start-connect-node") {
    armBusinessIdeaCanvasConnection();
    return true;
  }
  if (action === "business-canvas-duplicate-node") {
    duplicateBusinessIdeaCanvasSelectedNode();
    return true;
  }
  if (action === "business-canvas-delete-node") {
    deleteBusinessIdeaCanvasSelectedNode();
    return true;
  }
  if (action === "business-canvas-delete-edge") {
    deleteBusinessIdeaCanvasSelectedEdge();
    return true;
  }
  if (action === "business-canvas-edit-edge-label") {
    editSelectedBusinessIdeaCanvasEdgeLabel();
    return true;
  }
  if (action === "business-canvas-add-node-from-line") {
    addBusinessIdeaCanvasNodeFromLine(button.dataset.businessCanvasEdgeId || "");
    return true;
  }
  if (action === "business-canvas-context-add-node") {
    addBusinessIdeaCanvasNodeAtPoint({
      x: numberValue(button.dataset.businessCanvasX),
      y: numberValue(button.dataset.businessCanvasY)
    });
    return true;
  }
  if (action === "business-canvas-context-add-group") {
    addBusinessIdeaCanvasGroupAtPoint({
      x: numberValue(button.dataset.businessCanvasX),
      y: numberValue(button.dataset.businessCanvasY)
    });
    return true;
  }
  if (action === "business-canvas-copy-selection") {
    copyBusinessIdeaCanvasSelection();
    return true;
  }
  if (action === "business-canvas-paste-selection") {
    const hasPoint = button.dataset.businessCanvasX !== undefined && button.dataset.businessCanvasY !== undefined;
    pasteBusinessIdeaCanvasClipboard(
      hasPoint ? { x: numberValue(button.dataset.businessCanvasX), y: numberValue(button.dataset.businessCanvasY) } : undefined
    );
    return true;
  }
  if (action === "business-canvas-create-group") {
    createBusinessIdeaCanvasGroupFromSelection();
    return true;
  }
  if (action === "business-canvas-open-palette") {
    openBusinessIdeaCanvasPalette(button);
    return true;
  }
  if (action === "business-canvas-apply-palette-color") {
    applyBusinessIdeaCanvasPaletteColor(button.dataset.businessCanvasColor || "1");
    return true;
  }
  if (action === "business-canvas-open-palette-editor") {
    openBusinessIdeaCanvasPaletteEditor();
    return true;
  }
  if (action === "business-canvas-save-palette-color") {
    saveBusinessIdeaCanvasPaletteColor();
    return true;
  }
  if (action === "business-canvas-close-palette-editor") {
    closeBusinessIdeaCanvasPaletteEditor();
    return true;
  }
  if (action === "business-canvas-edit-node") {
    editBusinessIdeaCanvasNode(button.dataset.businessCanvasNodeId || "");
    return true;
  }
  if (action === "business-canvas-align-left") {
    alignBusinessIdeaCanvasSelection("left");
    return true;
  }
  if (action === "business-canvas-align-top") {
    alignBusinessIdeaCanvasSelection("top");
    return true;
  }

  return false;
}

export function handleBusinessCanvasDblClick(event: MouseEvent): boolean {
  const target = event.target as HTMLElement | null;
  if (!target?.closest(".business-canvas-editor")) return false;
  handleBusinessIdeaCanvasDoubleClick(event);
  return event.defaultPrevented;
}

export function handleBusinessCanvasContextMenu(event: MouseEvent): boolean {
  const target = event.target as HTMLElement | null;
  if (!target?.closest(".business-canvas-editor")) return false;
  handleBusinessIdeaCanvasContextMenu(event);
  return event.defaultPrevented;
}

export function handleBusinessCanvasPointerDown(event: PointerEvent): boolean {
  const target = event.target as HTMLElement | null;
  if (!target?.closest(".business-canvas-editor")) return false;
  startBusinessIdeaCanvasPointer(event);
  return true;
}

export function handleBusinessCanvasFocusOut(event: FocusEvent): boolean {
  const target = event.target as HTMLElement | null;
  if (!target?.closest(".business-canvas-editor")) return false;
  handleBusinessIdeaCanvasFocusOut(event);
  return false;
}

export function handleBusinessCanvasWheel(event: WheelEvent): boolean {
  const target = event.target as HTMLElement | null;
  if (!target?.closest(".business-canvas-editor")) return false;
  handleBusinessIdeaCanvasWheel(event);
  return event.defaultPrevented;
}

export function handleBusinessCanvasWindowPointerMove(event: PointerEvent): boolean {
  moveBusinessIdeaCanvasPointer(event);
  return false;
}

export function handleBusinessCanvasWindowPointerUp(event: PointerEvent): boolean {
  finishBusinessIdeaCanvasPointer(event);
  return false;
}

export function handleBusinessCanvasWindowKeyDown(event: KeyboardEvent): boolean {
  handleBusinessIdeaCanvasKeyDown(event);
  return false;
}

export function handleBusinessCanvasWindowKeyUp(event: KeyboardEvent): boolean {
  handleBusinessIdeaCanvasKeyUp(event);
  return false;
}

export function closeBusinessCanvasOverlays(): void {
  closeBusinessIdeaCanvasOverlays();
}
