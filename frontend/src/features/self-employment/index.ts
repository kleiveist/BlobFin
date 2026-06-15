import type { FeatureModule } from "../../app/contracts";

export const selfEmploymentFeature: FeatureModule = {
  id: "self-employment",
  sections: ["self_employment_dashboard"]
};

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
