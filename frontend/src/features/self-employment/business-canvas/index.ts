import type { FeatureModule } from "../../../app/contracts";
import {
  closeBusinessCanvasOverlays,
  handleBusinessCanvasChange,
  handleBusinessCanvasClick,
  handleBusinessCanvasContextMenu,
  handleBusinessCanvasDblClick,
  handleBusinessCanvasFocusOut,
  handleBusinessCanvasInput,
  handleBusinessCanvasPointerDown,
  handleBusinessCanvasWheel,
  handleBusinessCanvasWindowKeyDown,
  handleBusinessCanvasWindowKeyUp,
  handleBusinessCanvasWindowPointerMove,
  handleBusinessCanvasWindowPointerUp
} from "./events";

export { configureBusinessCanvasHost, type BusinessCanvasHost } from "./host";
export { renderBusinessCanvas } from "./controller";

export const businessCanvasFeature: FeatureModule = {
  id: "business-canvas",
  sections: ["self_employment_dashboard"],
  onInput: handleBusinessCanvasInput,
  onChange: handleBusinessCanvasChange,
  onClick: handleBusinessCanvasClick,
  onDblClick: handleBusinessCanvasDblClick,
  onContextMenu: handleBusinessCanvasContextMenu,
  onPointerDown: handleBusinessCanvasPointerDown,
  onFocusOut: handleBusinessCanvasFocusOut,
  onWheel: handleBusinessCanvasWheel,
  onWindowPointerMove: handleBusinessCanvasWindowPointerMove,
  onWindowPointerUp: handleBusinessCanvasWindowPointerUp,
  onWindowKeyDown: handleBusinessCanvasWindowKeyDown,
  onWindowKeyUp: handleBusinessCanvasWindowKeyUp,
  closeOverlays: closeBusinessCanvasOverlays
};
