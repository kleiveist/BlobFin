import type { FeatureModule } from "../../app/contracts";
import {
  closeSelfEmploymentOverlays,
  onSelfEmploymentChange,
  onSelfEmploymentClick,
  onSelfEmploymentInput,
  onSelfEmploymentWindowKeyDown
} from "./events";

export const selfEmploymentFeature: FeatureModule = {
  id: "self-employment",
  sections: ["self_employment_dashboard"],
  onInput: onSelfEmploymentInput,
  onChange: onSelfEmploymentChange,
  onClick: onSelfEmploymentClick,
  onWindowKeyDown: onSelfEmploymentWindowKeyDown,
  closeOverlays: closeSelfEmploymentOverlays
};

export {
  clearSelfEmploymentGanttEditorForDeletedNodes,
  configureSelfEmploymentHost,
  renderSelfEmploymentDashboard,
  renderSelfEmploymentIconPicker,
  selfEmploymentProjectById,
  updateSelfEmploymentProject
} from "./controller";

export type {
  BusinessIdeaCanvas,
  BusinessIdeaCanvasEdgeDirection,
  BusinessIdeaCanvasMeta,
  BusinessIdeaCanvasNodeMeta,
  BusinessIdeaCanvasShape,
  BusinessIdeaCanvasViewport,
  JsonCanvasEdge,
  JsonCanvasNode,
  JsonCanvasSide,
  SelfEmploymentContact,
  SelfEmploymentContactStatus,
  SelfEmploymentFeasibility,
  SelfEmploymentGanttCardPlan,
  SelfEmploymentGanttPhase,
  SelfEmploymentGanttPlan,
  SelfEmploymentGanttStartMode,
  SelfEmploymentInvoice,
  SelfEmploymentInvoiceStatus,
  SelfEmploymentProject,
  SelfEmploymentProjectStatus,
  SelfEmploymentRiskLevel,
  SelfEmploymentRoadmapAreaId,
  SelfEmploymentState,
  SelfEmploymentTask,
  SelfEmploymentTaskPriority,
  SelfEmploymentTaskStatus
} from "./model";
