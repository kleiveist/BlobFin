import { businessCanvasUiState } from "./uiState";
import { renderAll } from "./canvasModelController";

export function closeBusinessIdeaCanvasPaletteEditor(): void {
  businessCanvasUiState.paletteEditor = null;
  renderAll();
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
