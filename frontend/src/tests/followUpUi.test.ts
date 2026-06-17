/// <reference types="vite/client" />

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import mainSource from "../app/appController.ts?raw";
import runtimeRenderSource from "../features/runtime-host/renderRuntime.ts?raw";
import businessCanvasControllerSource from "../features/self-employment/business-canvas/controller.ts?raw";
import businessCanvasDragControllerSource from "../features/self-employment/business-canvas/dragController.ts?raw";
import businessCanvasEdgeControllerSource from "../features/self-employment/business-canvas/edgeController.ts?raw";
import businessCanvasNodeControllerSource from "../features/self-employment/business-canvas/nodeController.ts?raw";
import businessCanvasOverlayControllerSource from "../features/self-employment/business-canvas/overlayController.ts?raw";
import businessCanvasSelectionControllerSource from "../features/self-employment/business-canvas/selectionController.ts?raw";
import businessCanvasViewportControllerSource from "../features/self-employment/business-canvas/viewportController.ts?raw";
import businessCanvasViewSource from "../features/self-employment/business-canvas/view.ts?raw";
import selfEmploymentConfigSource from "../features/self-employment/config.ts?raw";
import selfEmploymentControllerSource from "../features/self-employment/controller.ts?raw";
import selfEmploymentEventsSource from "../features/self-employment/events.ts?raw";
import selfEmploymentFeasibilityControllerSource from "../features/self-employment/feasibilityController.ts?raw";
import selfEmploymentGanttControllerSource from "../features/self-employment/ganttController.ts?raw";
import selfEmploymentRenderFeasibilitySource from "../features/self-employment/renderFeasibility.ts?raw";
import selfEmploymentRenderProjectCardsSource from "../features/self-employment/renderProjectCards.ts?raw";
import selfEmploymentRenderProjectDetailsSource from "../features/self-employment/renderProjectDetails.ts?raw";
import incomePlanningControllerSource from "../features/income-planning/controller.ts?raw";
import incomePlanningCalendarDragControllerSource from "../features/income-planning/calendarDragController.ts?raw";
import incomePlanningDialogControllerSource from "../features/income-planning/dialogController.ts?raw";
import incomePlanningSanitizerSource from "../features/income-planning/planningSanitizer.ts?raw";
import incomePlanningRenderControllerSource from "../features/income-planning/renderController.ts?raw";
import incomePlanningStampPlannerControllerSource from "../features/income-planning/stampPlannerController.ts?raw";
import incomePlanningStampPopupControllerSource from "../features/income-planning/stampPopupController.ts?raw";
import incomePlanningWeekScenarioControllerSource from "../features/income-planning/weekScenarioController.ts?raw";
import { renderAppShell } from "../views/templates";
import {
  paidLoanCostForYear,
  realEstatePopupHeading,
  realEstateRepaymentSegments,
  realEstateTrendSegments,
  renderCombinedWealthChart,
  renderCombinedWealthPopup,
  renderCombinedWealthYearDetail,
  renderRealEstateRepaymentChart,
  renderRealEstateTrendChart
} from "../views/wealthCharts";
import type { CombinedWealthYear, RealEstateFinancingYear } from "../types";

const additionalBreakdown = {
  withdrawalGain: 0,
  depotSavingsRate: 0,
  legacySavingsRate: 0,
  netGain: 0,
  totalAdditionalRepayment: 0
};

const cssSourcePaths = [
  "../styles/index.css",
  "../styles/tokens.css",
  "../styles/reset.css",
  "../styles/base.css",
  "../styles/layout.css",
  "../styles/components/fields.css",
  "../styles/components/buttons.css",
  "../styles/components/popovers.css",
  "../styles/components/details.css",
  "../styles/utilities.css",
  "../styles/responsive.css",
  "../features/settings/styles.css",
  "../features/planning/styles.css",
  "../features/positions/styles.css",
  "../features/investment/styles.css",
  "../features/real-estate/styles.css",
  "../features/statutory-pension/styles.css",
  "../features/combined-wealth/styles.css",
  "../features/income-tracker/styles.css",
  "../features/income-planning/styles.css",
  "../features/income-stamp-planner/styles.css",
  "../features/self-employment/styles.css",
  "../features/self-employment/business-canvas/styles.css"
];

const stylesSource = cssSourcePaths
  .map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))
  .join("\n");

const selfEmploymentFeatureSource = [
  selfEmploymentControllerSource,
  selfEmploymentEventsSource,
  selfEmploymentFeasibilityControllerSource,
  selfEmploymentGanttControllerSource,
  selfEmploymentRenderFeasibilitySource,
  selfEmploymentRenderProjectCardsSource,
  selfEmploymentRenderProjectDetailsSource
].join("\n");
const businessCanvasFeatureSource = [
  businessCanvasControllerSource,
  businessCanvasDragControllerSource,
  businessCanvasEdgeControllerSource,
  businessCanvasNodeControllerSource,
  businessCanvasOverlayControllerSource,
  businessCanvasSelectionControllerSource,
  businessCanvasViewportControllerSource
].join("\n");
const incomePlanningFeatureSource = [
  incomePlanningControllerSource,
  incomePlanningCalendarDragControllerSource,
  incomePlanningDialogControllerSource,
  incomePlanningSanitizerSource,
  incomePlanningRenderControllerSource,
  incomePlanningStampPlannerControllerSource,
  incomePlanningStampPopupControllerSource,
  incomePlanningWeekScenarioControllerSource
].join("\n");

const realEstateYear: RealEstateFinancingYear = {
  year: 2026,
  propertyValue: 300000,
  loanStart: 220000,
  interestPaid: 7000,
  interestDue: 7000,
  interestShortfall: 0,
  monthlyPaymentFromSavings: 12000,
  monthlyPaymentFromWithdrawalGain: 0,
  monthlyPaymentAvailable: 12000,
  principalFromMonthlyPayment: 8000,
  principalPaid: 8000,
  specialRepayment: 0,
  additionalRepayment: 0,
  additionalRepaymentBreakdown: additionalBreakdown,
  loanEnd: 212000,
  loanCostPaidToDate: 15000,
  loanCostRemaining: 225000,
  propertyEquity: 88000,
  netPropertyWealth: 88000
};

const combinedYear: CombinedWealthYear = {
  year: 2026,
  cashValue: 10000,
  depotValue: 20000,
  depotBreakdown: [{ id: "standard", label: "Depot", value: 20000 }],
  withdrawalImpact: 0,
  redirectedCashRepayment: 0,
  redirectedDepotRepayment: 0,
  pensionIncome: 0,
  pensionConsumed: 0,
  pensionConsumedValue: 0,
  pensionSaved: 0,
  pensionSavingsValue: 0,
  depotTaxValue: 0,
  pensionTaxValue: 0,
  taxValue: 0,
  cumulativeTaxValue: 0,
  propertyValue: 300000,
  propertyDebt: 212000,
  propertyLoanStart: 220000,
  propertyEquity: 88000,
  propertyAssetValue: 88000,
  totalGrossAssets: 330000,
  totalDebt: 212000,
  totalNetWealth: 118000
};

describe("follow-up ui rendering", () => {
  it("keeps extracted feature event branches out of appController", () => {
    expect(mainSource.split("\n").length).toBeLessThanOrEqual(30);
    expect(mainSource).toContain("startControllerRuntime");
    expect(mainSource).not.toContain('action === "business-canvas-');
    expect(mainSource).not.toContain('action === "self-employment-');
    expect(mainSource).not.toContain('action === "income-planning-');
    expect(mainSource).not.toContain('action === "income-stamp-planner-');
    expect(mainSource).not.toContain('action?.startsWith("income-planning-');
    expect(mainSource).not.toContain('action?.startsWith("income-stamp-planner-');
    expect(mainSource).not.toContain('businessIdeaCanvasSelectedEdge');
    expect(mainSource).not.toContain('incomePlanningDialog');
    expect(mainSource).not.toContain('incomeStampPlannerDialog');
    expect(mainSource).not.toContain('selfEmploymentGanttEditor');
    expect(mainSource).not.toContain("function renderAll");
    expect(mainSource).not.toContain("function renderCalculations");
  });

  it("renders a visual landing page with the combined module entries", () => {
    const html = renderAppShell();

    expect(html).toContain('data-module-section="home"');
    expect(html).toContain('id="landingTitle"');
    expect(html).toContain("BlobFin");
    expect(html).not.toContain('data-module-section="income_overview"');
    expect(html).not.toContain('data-module-section="investment_overview"');
    expect(html).toContain('data-action="open-section-income"');
    expect(html).toContain('data-action="open-section-income_planning"');
    expect(html).toContain('data-action="open-section-income_stamp_planner"');
    expect(html).toContain('data-action="open-section-self_employment_dashboard"');
    expect(html).toContain('data-action="open-section-planning_scenarios"');
    expect(html).toContain('data-action="open-section-real_estate_financing"');
    expect(html).toContain('data-action="open-section-combined_wealth"');
    expect(html).toContain('data-action="open-section-statutory_pension"');
    expect(html).toContain('data-action="income-planning-import-csv"');
    expect(html).toContain('data-action="income-planning-export-csv"');
    expect(html).toContain('data-action="income-planning-import-csv"\n      aria-label="CSV importieren"');
    expect(html).toContain('data-action="income-planning-export-csv"\n      aria-label="CSV exportieren"');
    expect(html).toContain('id="incomePlanningCsvImport"');
    expect(html).not.toContain('data-action="open-section-income_tracking"');
    expect(html).not.toContain('data-action="open-section-income_status"');
    expect(html).not.toContain('data-action="open-section-income_charts"');
    expect(html).not.toContain('data-action="open-section-cost_reserve_positions"');
    expect(html).not.toContain('data-action="open-section-year_table"');
    expect(html).not.toContain('data-action="open-section-investment_planning"');
    expect(count(html, 'class="overview-card module-overview-card')).toBe(5);
    expect(html).not.toContain('class="overview-subcard"');
    expect(html).toContain('class="module-overview-grid landing-personal-grid"');
    const landingMainGridStart = html.indexOf('class="module-overview-grid landing-main-grid"');
    const landingPersonalGridStart = html.indexOf('class="module-overview-grid landing-personal-grid"');
    expect(landingMainGridStart).toBeGreaterThanOrEqual(0);
    expect(landingPersonalGridStart).toBeGreaterThan(landingMainGridStart);
    const landingMainGrid = html.slice(landingMainGridStart, landingPersonalGridStart);
    expect(landingMainGrid.indexOf("Jahresnettoeinkommen")).toBeLessThan(landingMainGrid.indexOf("Gesetzliche Rente"));
    expect(landingMainGrid.indexOf("Gesetzliche Rente")).toBeLessThan(landingMainGrid.indexOf("Planungen und Szenarien"));
    expect(landingMainGrid.indexOf("Planungen und Szenarien")).toBeLessThan(landingMainGrid.indexOf("Immobilien"));
    expect(landingMainGrid.indexOf("Immobilien")).toBeLessThan(landingMainGrid.indexOf("Vermoegen"));
    expect(landingPersonalGridStart).toBeLessThan(html.indexOf("Zeitbudget & Habits", landingPersonalGridStart));
    expect(html.indexOf("Zeitbudget & Habits", landingPersonalGridStart)).toBeLessThan(
      html.indexOf("Selbststaendigkeits-Dashboard", landingPersonalGridStart)
    );
    expect(html).toContain("Jahresnettoeinkommen");
    expect(html).toContain("Selbststaendigkeits-Dashboard");
    expect(html).toContain("Dashboard oeffnen");
    expect(html).toContain("Zeitbudget & Habits");
    expect(html).toContain("Wochenplaner, Arbeit und Gewohnheiten");
    expect(html).toContain("Zeitbudget planen");
    expect(html).toContain("Planungen und Szenarien");
    expect(html).toContain("Immobilien");
    expect(html).toContain("Vermoegen");
    expect(html).toContain("Vermoegen oeffnen");
    expect(html).toContain("Gesetzliche Rente");
    expect(html).toContain("Rente oeffnen");
    expect(html).not.toContain("Einkommensplanung");
    expect(html).not.toContain("Zeitbudget, Nebeneinkuenfte und Ziel-Szenarien");
    expect(html).not.toContain("Vermoegen und Altersvorsorge");
    expect(html).not.toContain("Vorsorge oeffnen");
  });

  it("renders the self employment dashboard as an independent page", () => {
    const html = renderAppShell();
    const selfEmploymentStart = html.indexOf('data-module-section="self_employment_dashboard"');
    const incomePlanningStart = html.indexOf('data-module-section="income_planning"', selfEmploymentStart);
    const selfEmploymentSection = html.slice(selfEmploymentStart, incomePlanningStart);
    const heroActionsStart = selfEmploymentFeatureSource.indexOf("self-employment-hero-actions");
    const heroActionsEnd = selfEmploymentFeatureSource.indexOf("</div>", heroActionsStart);
    const heroActionsSource = selfEmploymentFeatureSource.slice(heroActionsStart, heroActionsEnd);

    expect(selfEmploymentStart).toBeGreaterThanOrEqual(0);
    expect(incomePlanningStart).toBeGreaterThan(selfEmploymentStart);
    expect(html).toContain('data-module-section="self_employment_dashboard"');
    expect(html).toContain('id="selfEmploymentDashboard"');
    expect(html).toContain('id="selfEmploymentIconPicker"');
    expect(html).toContain("Selbststaendigkeits-Dashboard");
    expect(selfEmploymentSection).not.toContain("Projektzentrale fuer Idee, Zeit, Budget und Gewinnpotenzial");
    expect(selfEmploymentSection).toContain('data-action="open-section-home"');
    expect(selfEmploymentSection).toContain("Startseite");
    expect(selfEmploymentSection).not.toContain('data-action="open-section-income_planning"');
    expect(selfEmploymentSection).not.toContain('data-action="open-section-planning_scenarios"');
    expect(selfEmploymentFeatureSource).toContain("function renderSelfEmploymentDashboard");
    expect(selfEmploymentFeatureSource).toContain("self-employment-hero-actions");
    expect(heroActionsSource).not.toContain('data-action="open-section-home"');
    expect(selfEmploymentFeatureSource).toContain('data-action="self-employment-add-project"');
    expect(selfEmploymentFeatureSource).toContain('data-action="self-employment-select-project"');
    expect(selfEmploymentFeatureSource).toContain('data-action="self-employment-select-roadmap-area"');
    expect(selfEmploymentFeatureSource).toContain('data-action="self-employment-open-icon-picker"');
    expect(selfEmploymentFeatureSource).toContain('data-action="self-employment-select-icon"');
    expect(selfEmploymentFeatureSource).toContain('data-action="self-employment-rename-project"');
    expect(selfEmploymentFeatureSource).toContain('data-action="self-employment-delete-project"');
    expect(selfEmploymentFeatureSource).toContain('data-action="self-employment-toggle-label"');
    expect(selfEmploymentConfigSource).toContain("SELF_EMPLOYMENT_ROADMAP_AREAS");
    expect(selfEmploymentConfigSource).toContain('"Geschaeftsidee"');
    expect(selfEmploymentConfigSource).toContain('"Kennzahlen"');
    expect(selfEmploymentConfigSource.indexOf('"Projektplanung"')).toBeLessThan(selfEmploymentConfigSource.indexOf('"Aufgaben"'));
    expect(selfEmploymentConfigSource.indexOf('"Aufgaben"')).toBeLessThan(selfEmploymentConfigSource.indexOf('"Zeitmanagement & Habits"'));
    expect(selfEmploymentConfigSource.indexOf('"Zeitmanagement & Habits"')).toBeLessThan(selfEmploymentConfigSource.indexOf('"Kundenkontakte"'));
    expect(selfEmploymentConfigSource.indexOf('"Kundenkontakte"')).toBeLessThan(selfEmploymentConfigSource.indexOf('"Angebote & Rechnungen"'));
    expect(selfEmploymentFeatureSource).toContain("renderBusinessCanvas");
    expect(mainSource).not.toContain('action === "business-canvas-');
    expect(mainSource).not.toContain("businessIdeaCanvasSelectedEdge");
    expect(mainSource).not.toContain("handleBusinessIdeaCanvas");
    expect(businessCanvasFeatureSource).toContain("renderBusinessIdeaCanvasEditor");
    expect(businessCanvasFeatureSource).toContain("businessIdeaCanvasRenderState");
    expect(selfEmploymentFeatureSource).toContain("renderSelfEmploymentProjectGantt");
    expect(selfEmploymentFeatureSource).toContain("self-employment-project-gantt");
    expect(selfEmploymentFeatureSource).toContain("renderSelfEmploymentGanttPhaseFilter");
    expect(selfEmploymentFeatureSource).toContain("self-employment-roadmap-panel-title");
    expect(selfEmploymentFeatureSource).toContain("self-employment-toggle-gantt-phase-filter");
    expect(selfEmploymentFeatureSource).toContain("ganttPhaseFilterIds");
    expect(selfEmploymentFeatureSource).toContain("visibleSelfEmploymentGanttRows");
    expect(selfEmploymentFeatureSource).toContain("data-self-employment-gantt-popover");
    expect(selfEmploymentFeatureSource).toContain("self-employment-gantt-phase-popover");
    expect(selfEmploymentFeatureSource).toContain("self-employment-gantt-card-popover");
    expect(selfEmploymentFeatureSource).toContain("selfEmploymentGanttPopoverPosition");
    expect(selfEmploymentFeatureSource).toContain("closeSelfEmploymentGanttEditor");
    expect(selfEmploymentFeatureSource).toContain("data-self-employment-gantt-phase-field");
    expect(selfEmploymentFeatureSource).toContain("data-self-employment-gantt-card-field");
    expect(selfEmploymentFeatureSource).toContain("timeBudgetHours");
    expect(selfEmploymentFeatureSource).toContain("self-employment-gantt-todo-row");
    expect(selfEmploymentFeatureSource).toContain("self-employment-gantt-todo-body");
    expect(selfEmploymentFeatureSource).toContain("self-employment-kanban-board");
    expect(selfEmploymentFeatureSource).toContain("self-employment-kanban-column");
    expect(selfEmploymentFeatureSource).toContain('data-self-employment-kanban-card="true"');
    expect(selfEmploymentFeatureSource).toContain('data-action="self-employment-set-kanban-status"');
    expect(selfEmploymentFeatureSource).toContain('data-action="self-employment-set-task-eisenhower-filter"');
    expect(selfEmploymentFeatureSource).toContain('data-action="self-employment-toggle-kanban-phase-filter"');
    expect(selfEmploymentFeatureSource).toContain('data-action="self-employment-toggle-kanban-label-filter"');
    expect(selfEmploymentFeatureSource).toContain('data-action="self-employment-set-gantt-todo-eisenhower"');
    expect(selfEmploymentFeatureSource).toContain("self-employment-eisenhower-matrix");
    expect(selfEmploymentFeatureSource).toContain("self-employment-kanban-filter-chip");
    expect(selfEmploymentFeatureSource).toContain("data-self-employment-kanban-phase-id");
    expect(selfEmploymentFeatureSource).toContain("data-self-employment-kanban-label-id");
    expect(selfEmploymentFeatureSource).toContain("data-self-employment-eisenhower-quadrant");
    expect(selfEmploymentFeatureSource).toContain("SELF_EMPLOYMENT_EISENHOWER_QUADRANTS");
    expect(selfEmploymentFeatureSource).not.toContain("Aufgaben nach Prioritaet");
    expect(selfEmploymentFeatureSource).toContain("onSelfEmploymentDragStart");
    expect(selfEmploymentFeatureSource).toContain("updateSelfEmploymentGanttTodoStatus");
    expect(selfEmploymentFeatureSource).toContain("self-employment-label-chart-grid");
    expect(selfEmploymentFeatureSource).toContain("selfEmploymentLabelDonutChart");
    expect(selfEmploymentFeatureSource).toContain("Benoetigte Wochen");
    expect(selfEmploymentFeatureSource).toContain("formatSelfEmploymentWeeks");
    expect(selfEmploymentFeatureSource).not.toContain("Groesstes Label");
    expect(stylesSource).toContain(".self-employment-gantt-phase-filter-button");
    expect(stylesSource).toContain(".self-employment-gantt-phase-filter-button.active");
    expect(stylesSource).toContain(".self-employment-kanban-board");
    expect(stylesSource).toContain(".self-employment-eisenhower-matrix");
    expect(stylesSource).toContain(".self-employment-kanban-filter-chip");
    expect(stylesSource).toContain(".self-employment-label-chart-grid");
    expect(stylesSource).toContain("grid-template-columns: repeat(4, minmax(0, 1fr))");
    expect(selfEmploymentFeatureSource).not.toContain('selfEmploymentTextareaField(project, "projectGoal"');
    expect(selfEmploymentFeatureSource).not.toContain('selfEmploymentNumberField(project, "plannedDurationWeeks"');
    expect(businessCanvasViewSource).toContain('data-action="business-canvas-add-node"');
    expect(businessCanvasViewSource).toContain("business-canvas-context-menu");
    expect(businessCanvasViewSource).toContain("business-canvas-multi-toolbar");
    expect(businessCanvasViewSource).toContain("business-canvas-selection-rect");
    expect(businessCanvasViewSource).toContain("business-canvas-palette-popover");
    expect(businessCanvasViewSource).toContain('data-business-canvas-palette-row="standard"');
    expect(businessCanvasViewSource).toContain('data-business-canvas-palette-row="custom"');
    expect(businessCanvasViewSource).toContain("business-canvas-toolbar-layer");
    expect(businessCanvasViewSource).toContain("business-canvas-dropdown");
    expect(businessCanvasViewSource).toContain("business-canvas-shape-dropdown");
    expect(businessCanvasViewSource).toContain("business-canvas-label-dropdown");
    expect(businessCanvasViewSource).toContain("business-canvas-phase-dropdown");
    expect(businessCanvasViewSource).toContain("business-canvas-dropdown-menu");
    expect(businessCanvasViewSource).toContain("▭");
    expect(businessCanvasViewSource).toContain("Eckig");
    expect(businessCanvasViewSource).toContain("Phase 1");
    expect(businessCanvasViewSource).toContain("business-canvas-phase-badge-button");
    expect(businessCanvasViewSource).toContain("function phaseBadgeLabel");
    expect(businessCanvasViewSource).toContain("String(normalized)");
    expect(businessCanvasViewSource).toContain("business-canvas-context-menu-icon");
    expect(businessCanvasViewSource).toContain('data-action="business-canvas-set-selected-node-field"');
    expect(businessCanvasViewSource).toContain('data-action="business-canvas-set-selected-edge-field"');
    expect(businessCanvasViewSource).toContain('data-action="business-canvas-edit-edge-label"');
    expect(businessCanvasViewSource).toContain("business-canvas-edge-label-foreign");
    expect(businessCanvasViewSource).toContain("business-canvas-edge-label-input");
    expect(businessCanvasViewSource).toContain("business-canvas-edge-label-button");
    expect(businessCanvasViewSource).toContain("business-canvas-edge-direction-dropdown");
    expect(businessCanvasViewSource).toContain("edgeGeometry");
    expect(businessCanvasViewSource).toContain("business-canvas-set-meta-field");
    expect(businessCanvasViewSource).toContain("business-canvas-gantt");
    expect(businessCanvasViewSource).toContain("business-canvas-gantt-fill");
    expect(businessCanvasViewSource).toContain("business-canvas-gantt-empty");
    expect(stylesSource).toContain("height: clamp(460px, calc(100vh - 260px), 760px)");
    expect(stylesSource).toContain("overflow: hidden");
    expect(stylesSource).toContain("background: rgba(14, 165, 233, 0.06)");
    expect(stylesSource).toContain("pointer-events: none");
    expect(stylesSource).toContain("business-canvas-palette-row-custom");
    expect(stylesSource).toContain("grid-template-columns: 22px minmax(0, 1fr)");
    expect(stylesSource).toContain("business-canvas-toolbar-layer");
    expect(stylesSource).toContain("z-index: 110");
    expect(stylesSource).toContain("background: transparent");
    expect(stylesSource).toContain("business-canvas-edge-label-foreign");
    expect(stylesSource).toContain("business-canvas-connection-preview-line");
    expect(stylesSource).toContain("connection-target");
    expect(businessCanvasFeatureSource).toContain("requestAnimationFrame");
    expect(businessCanvasFeatureSource).toContain("scheduleBusinessIdeaCanvasWheelZoom");
    expect(businessCanvasFeatureSource).toContain("updateBusinessIdeaCanvasLiveEdges");
    expect(businessCanvasFeatureSource).toContain("scheduleBusinessIdeaCanvasConnectionPreview");
    expect(businessCanvasFeatureSource).toContain("clearBusinessIdeaCanvasConnectionPreview");
    expect(businessCanvasFeatureSource).toContain("commitBusinessIdeaCanvasEdgeLabelEdit");
    expect(businessCanvasFeatureSource).toContain("cancelBusinessIdeaCanvasEdgeLabelEdit");
    expect(businessCanvasFeatureSource).not.toContain('window.prompt("Verbindungslabel"');
    expect(businessCanvasFeatureSource).toContain("closeBusinessIdeaCanvasDropdowns");
    expect(businessCanvasFeatureSource).toContain("lastDragEndAt");
    expect(businessCanvasFeatureSource).toContain("selectedEdge");
    expect(businessCanvasFeatureSource).toContain("deleteBusinessIdeaCanvasSelectedEdge();");
    expect(selfEmploymentFeatureSource).toContain("data-self-employment-field");
    expect(selfEmploymentFeatureSource).toContain("evaluateSelfEmploymentProject");
    expect(selfEmploymentFeatureSource).toContain("selfEmploymentEvaluationContext");
  });

  it("renders the income planning dashboard as an independent page", () => {
    const html = renderAppShell();

    expect(html).toContain('data-module-section="income_planning"');
    expect(html).toContain('data-action="open-section-income_stamp_planner"');
    expect(html).toContain("Zeitbudget & Habits");
    expect(html).toContain('id="incomePlanningMetricGrid"');
    expect(html).toContain('id="incomePlanningWorkBlocks"');
    expect(html).toContain('id="incomePlanningCareerLife"');
    expect(html).toContain('id="incomePlanningAssumptions"');
    expect(html).toContain('id="incomePlanningManualBlocks"');
    expect(html).toContain('id="incomePlanningTimeCharts"');
    expect(html).toContain('id="incomePlanningHabits"');
    expect(html).toContain('id="incomePlanningCalendarStamps"');
    expect(html).toContain('id="incomePlanningWeeklyPlanner"');
    expect(html).toContain('id="incomePlanningDialogRoot"');
    expect(html).toContain('id="incomePlanningHabitIconPicker"');
    expect(html).toContain('id="incomePlanningStampPicker"');
    expect(html).toContain('id="incomePlanningStampMenu"');
    expect(html).toContain('class="income-planning-habit-stamp-layout"');
    expect(html).toContain('class="income-section-head income-planning-weekly-head"');
    expect(html).toContain("Kompakte 7-Tage-Grafik");
    expect(html).toContain("Berufsleben / Hauptjob");
    expect(html).toContain('data-action="income-planning-add-work-block"');
    expect(html).toContain('data-action="income-planning-add-habit"');
    expect(html).toContain('data-action="income-planning-add-manual-block"');
    expect(html).not.toContain('id="incomePlanningCategoryButton"');
    expect(html).not.toContain('id="incomePlanningCategoryPicker"');
    expect(html).not.toContain('data-action="open-income-planning-category-picker"');
    expect(html).not.toContain("EUR/Monat");
    expect(html).not.toContain("Monatseinkommen");
    expect(html.indexOf("Zeitbudget & Habits")).toBeLessThan(html.indexOf('id="incomePlanningMetricGrid"'));
    expect(html.indexOf('id="incomePlanningMetricGrid"')).toBeLessThan(html.indexOf('id="incomePlanningWarnings"'));
    expect(html.indexOf('id="incomePlanningWarnings"')).toBeLessThan(html.indexOf('id="incomePlanningTimeCharts"'));
    expect(html.indexOf('id="incomePlanningTimeCharts"')).toBeLessThan(html.indexOf('id="incomePlanningWeeklyPlanner"'));
    expect(html.indexOf('id="incomePlanningWeeklyPlanner"')).toBeLessThan(html.indexOf('id="incomePlanningWorkBlocks"'));
    expect(html.indexOf('id="incomePlanningWorkBlocks"')).toBeLessThan(html.indexOf('id="incomePlanningCareerLife"'));
    expect(html.indexOf('id="incomePlanningCareerLife"')).toBeLessThan(html.indexOf('id="incomePlanningAssumptions"'));
    expect(html.indexOf('id="incomePlanningAssumptions"')).toBeLessThan(html.indexOf('id="incomePlanningHabits"'));
    const incomePlanningIndex = html.indexOf('data-module-section="income_planning"');
    const stampPlannerButtonIndex = html.indexOf('data-action="open-section-income_stamp_planner"', incomePlanningIndex);
    const homeButtonIndex = html.indexOf('data-action="open-section-home"', incomePlanningIndex);
    expect(stampPlannerButtonIndex).toBeGreaterThan(incomePlanningIndex);
    expect(stampPlannerButtonIndex).toBeLessThan(homeButtonIndex);
  });

  it("wires week scenario controls into the income planning calendar", () => {
    expect(incomePlanningFeatureSource).toContain("Wochenszenario");
    expect(incomePlanningFeatureSource).toContain('data-action="income-planning-prev-week"');
    expect(incomePlanningFeatureSource).toContain('data-action="income-planning-next-week"');
    expect(incomePlanningFeatureSource).toContain('data-action="income-planning-current-week"');
    expect(incomePlanningFeatureSource).toContain("select-income-planning-week-scenario-");
    expect(incomePlanningFeatureSource).toContain("function setIncomePlanningWeekScenario");
    expect(incomePlanningFeatureSource).toContain("weekScenarioAssignments");
    expect(incomePlanningFeatureSource).toContain("weekScenarios");
    expect(incomePlanningFeatureSource).toContain("return incomePlanningActiveWeekRange();");
    expect(incomePlanningFeatureSource).toContain('data-action="income-planning-open-week-scenario-dialog"');
    expect(incomePlanningFeatureSource).toContain('data-action="income-planning-save-week-scenario"');
    expect(incomePlanningFeatureSource).toContain("data-income-planning-dialog-scenario-id");
    expect(incomePlanningFeatureSource).toContain("data-income-planning-stamp-scenario-id");
    expect(incomePlanningFeatureSource).toContain("data-income-stamp-planner-scenario-id");
    expect(incomePlanningFeatureSource).not.toContain("Uni-Woche");
    expect(incomePlanningFeatureSource).not.toContain("Projekt-Woche");
    expect(incomePlanningFeatureSource).not.toContain("scenario_suggestion");
    expect(incomePlanningFeatureSource).not.toContain("data-income-planning-scenario-suggestion");
  });

  it("renders the stamp planner as an independent page", () => {
    const html = renderAppShell();

    expect(html).toContain('data-module-section="income_stamp_planner"');
    expect(html).toContain("Stempel Planer");
    expect(html).toContain('id="incomeStampPlannerControls"');
    expect(html).toContain('id="incomeStampPlannerGrid"');
    expect(html).toContain('id="incomeStampPlannerDialogRoot"');
    expect(html).toContain('data-action="income-stamp-planner-add"');
    expect(html).toContain('data-action="open-section-income_planning"');
    expect(html).toContain("Einmalige Stempel fuer kommende Wochen");
    expect(html).toContain("Monatsuebersicht fuer einmalige Kalender-Stempel");
  });

  it("keeps income planning header icon actions wired", () => {
    expect(incomePlanningFeatureSource).toContain('data-action="income-planning-save-dialog" aria-label="Zeitbudget speichern"');
    expect(incomePlanningFeatureSource).toContain('data-action="income-planning-delete-dialog-slot"');
    expect(incomePlanningFeatureSource).toContain('data-action="income-planning-save-stamp" aria-label="Stempel speichern"');
    expect(incomePlanningFeatureSource).toContain('data-action="income-planning-delete-stamp"');
    expect(incomePlanningFeatureSource).toContain('data-income-planning-calendar-stamp="true"');
    expect(incomePlanningFeatureSource).toContain('data-action="income-stamp-planner-save" aria-label="Geplanten Stempel speichern"');
    expect(incomePlanningFeatureSource).toContain('data-action="income-stamp-planner-delete"');
    expect(incomePlanningFeatureSource).toContain('data-income-stamp-planner-calendar-stamp="true"');
    expect(incomePlanningFeatureSource).toContain('data-income-stamp-planner-stamp="true"');
    expect(incomePlanningFeatureSource).toContain('id="incomeStampPlannerMonthLabel"');
    expect(incomePlanningFeatureSource).toContain('data-action="income-stamp-planner-prev-month"');
    expect(incomePlanningFeatureSource).toContain('data-action="income-stamp-planner-next-month"');
    expect(incomePlanningFeatureSource).not.toContain('data-action="income-stamp-planner-mode-');
    expect(incomePlanningFeatureSource).toContain("function showPreviousIncomeStampPlannerMonth");
    expect(incomePlanningFeatureSource).toContain("function showNextIncomeStampPlannerMonth");
    expect(incomePlanningFeatureSource).toContain("function incomeStampPlannerVisibleStamps");
    expect(incomePlanningFeatureSource).toContain("function startIncomePlanningStampCalendarDrag");
    expect(incomePlanningFeatureSource).toContain("function updateIncomePlanningStampAfterCalendarDrag");
    expect(incomePlanningFeatureSource).toContain("function startIncomePlanningPlannedStampCalendarDrag");
    expect(incomePlanningFeatureSource).toContain("function updateIncomePlanningPlannedStampAfterCalendarDrag");
    expect(incomePlanningFeatureSource).toContain("function startIncomeStampPlannerStampDrag");
    expect(incomePlanningFeatureSource).toContain("function updateIncomeStampPlannerStampAfterPlannerDrag");
    expect(incomePlanningFeatureSource).toContain("function incomePlanningPlannedStampsForCurrentWeek");
    expect(incomePlanningFeatureSource).toContain('class="income-planning-dialog-grid basis"');
    expect(incomePlanningFeatureSource).toContain("function incomePlanningSlotDialogFields");
    expect(incomePlanningFeatureSource).toContain('data-income-planning-dialog-field="slotNote"');
    expect(incomePlanningFeatureSource).toContain("function incomePlanningDialogCanDeleteSlot");
  });

  it("structures income as one combined page with insights before status", () => {
    const html = renderAppShell();
    const insightsIndex = html.indexOf('id="incomeInsightsSection"');
    const statusIndex = html.indexOf('id="incomeStatusSection"');

    expect(html).not.toContain('data-action="scroll-income-section"');
    expect(count(html, 'data-module-section="income"')).toBeGreaterThanOrEqual(3);
    expect(html).not.toContain('data-module-section="income_status"');
    expect(html).not.toContain('data-module-section="income_charts"');
    expect(html).not.toContain('data-module-section="income_tracking"');
    expect(html).toContain('id="incomeTrackerInput"');
    expect(html).toContain('id="incomeChartsSection"');
    expect(html).toContain("Jahresnettoeinkommen-Grafiken");
    expect(insightsIndex).toBeGreaterThan(-1);
    expect(statusIndex).toBeGreaterThan(-1);
    expect(insightsIndex).toBeLessThan(statusIndex);
  });

  it("structures planning as one combined page", () => {
    const html = renderAppShell();

    expect(count(html, 'data-module-section="planning_scenarios"')).toBeGreaterThanOrEqual(3);
    expect(html).not.toContain('data-module-section="cost_reserve_positions"');
    expect(html).not.toContain('data-module-section="year_table"');
    expect(html).not.toContain('data-module-section="investment_planning"');
    expect(html.indexOf("Konto-Module")).toBeLessThan(html.indexOf("Jahresplanung"));
    expect(html.indexOf("Jahresplanung")).toBeLessThan(html.indexOf("Kosten- und Ruecklagenpositionen"));
    expect(html).toContain('id="planningYearNavigation"');
    expect(html).toContain("Kosten- und Ruecklagenpositionen");
    expect(html).toContain("Jahrestabellen pro Konto");
    expect(html).toContain("Investment- und Auszahlungsplanung");
    expect(html).toContain('id="investmentIncludeList"');
    expect(html).toContain('id="investmentIncludePopup"');
    expect(html).not.toContain('data-action="toggle-interest-investment"');
    expect(html).not.toContain('data-action="toggle-cashback-investment"');
  });

  it("keeps the account-year graphic visible as a compact pie chart", () => {
    const html = renderAppShell();

    expect(html).toContain('id="reserveChartPopup" class="reserve-chart-popup"');
    expect(html).not.toContain('data-action="show-reserve-chart"');
    expect(html).not.toContain('id="reserveChartPopup" class="reserve-chart-popup" role="dialog"');
    expect(html).not.toContain('id="reserveChartPopup" class="reserve-chart-popup" hidden');
    expect(runtimeRenderSource).toContain("function reservePieChart");
    expect(runtimeRenderSource).toContain('legend-dot blue"></i>Sparen');
    expect(runtimeRenderSource).toContain('key: "savings", value: totals.savings, color: "var(--reserve-chart-savings)"');
    expect(stylesSource).toContain("--reserve-chart-savings: #2563eb");
    expect(stylesSource).toContain(".reserve-chart-legend .legend-dot.blue");
    expect(runtimeRenderSource).not.toContain("function reserveBarChart");
    expect(runtimeRenderSource).not.toContain("reserve-chart-summary");
    expect(runtimeRenderSource).not.toContain("reserve-chart-controls");
    expect(runtimeRenderSource).not.toContain("set-reserve-chart-category");
    expect(runtimeRenderSource).not.toContain("set-reserve-chart-scenario");
    expect(runtimeRenderSource).not.toContain("set-reserve-chart-style");
    expect(runtimeRenderSource).not.toContain("close-reserve-chart");
  });

  it("renders statutory pension as its own page outside combined wealth", () => {
    const html = renderAppShell();
    const statutoryPageIndex = html.indexOf('data-module-section="statutory_pension"');
    const pensionIndex = html.indexOf('id="statutoryPensionSection"');
    const combinedIndex = html.indexOf('data-module-section="combined_wealth"');
    const accountsIndex = html.indexOf("Cash aus Konto");
    const modulesIndex = html.indexOf("Vermoegensmodule");
    const chartIndex = html.indexOf('id="combinedWealthChart"');

    expect(statutoryPageIndex).toBeGreaterThan(-1);
    expect(pensionIndex).toBeGreaterThan(-1);
    expect(combinedIndex).toBeGreaterThan(-1);
    expect(accountsIndex).toBeGreaterThan(-1);
    expect(modulesIndex).toBeGreaterThan(-1);
    expect(chartIndex).toBeGreaterThan(-1);
    expect(statutoryPageIndex).toBeLessThan(pensionIndex);
    expect(pensionIndex).toBeLessThan(combinedIndex);
    expect(combinedIndex).toBeLessThan(accountsIndex);
    expect(combinedIndex).toBeLessThan(modulesIndex);
    expect(combinedIndex).toBeLessThan(chartIndex);
    expect(html).toContain("Gesetzliche Rente");
    expect(html).toContain("Pessimistisch");
    expect(html).toContain("Basis");
    expect(html).toContain("Optimistisch");
  });

  it("renders the world graphic action inside the combined income page", () => {
    const html = renderAppShell();

    expect(count(html, 'data-action="income-open-analysis"')).toBe(1);
    expect(html).toContain("Weltgrafik");
  });

  it("does not render Grunddaten as a main module button", () => {
    const html = renderAppShell();

    expect(html).not.toContain('data-section-id="grunddaten"');
    expect(html).toContain("grunddatenSettingsContent");
  });

  it("renders the start page base data popup and read-only investment end date", () => {
    const html = renderAppShell();

    expect(html).toContain('data-action="open-base-data-popup"');
    expect(html).toContain('id="baseDataPopup"');
    expect(html).toContain('data-action="close-base-data-popup"');
    expect(count(html, 'data-setting="year"')).toBeGreaterThanOrEqual(2);
    expect(count(html, 'data-setting="interestRatePercent"')).toBeGreaterThanOrEqual(2);
    expect(count(html, 'data-setting="cashbackRatePercent"')).toBeGreaterThanOrEqual(2);
    expect(count(html, 'data-setting="endDate"')).toBeGreaterThanOrEqual(3);
    expect(html).toContain('id="investmentEndDate"');
    expect(html).toContain('data-force-disabled="true"');
    expect(html).not.toContain('data-investment="payoutEndAge"');
  });

  it("renders the position cadence switch host in the cost reserve section", () => {
    const html = renderAppShell();

    expect(html).toContain('id="positionCadenceSwitchHost"');
    expect(html).toContain('data-action="show-expense-positions"');
    expect(html).not.toContain('id="expenseSubmodeSwitchHost"');
    expect(html).not.toContain('data-action="show-expense-regular"');
    expect(html).not.toContain('data-action="show-expense-once"');
  });

  it("renders the annual table account selector host", () => {
    const html = renderAppShell();

    expect(html).toContain('id="yearAccountSelector"');
    expect(html).toContain('id="investmentAccountSelector"');
    expect(html).toContain('id="realEstateAccountSelector"');
    expect(html).not.toContain('id="realEstateWithdrawalAccountSelector"');
    expect(html).toContain("Konten fuer Sparquellen und Entnahme-Zugewinn");
    expect(html).toContain('class="real-estate-locale-default"');
    expect(html).not.toContain('data-action="set-real-estate-locale-en"');
    expect(html).toContain('id="combinedCashAccountSelector"');
    expect(html).toContain("combined-cash-account-selector");
    expect(html).not.toContain('id="combinedCashPositionSelector"');
    expect(html).toContain('id="combinedCashPositionPopup"');
    expect(html).toContain("Investierbare Cash-Positionen");
    expect(html).toContain("Cash-Zuwachs");
    expect(html).not.toContain("Cash-Sparrate");
    expect(html).toContain('id="combinedLeadInvestmentAccountSelector"');
    expect(html).toContain('id="combinedDepotSelector"');
    expect(html).toContain('id="combinedPensionScenarioSelector"');
    expect(html).toContain('id="combinedWealthLifeSummary"');
    expect(html).toContain("Kombi-Leitkonto");
    expect(html).toContain('id="accountYearTableOverview"');
    expect(html).not.toContain('id="resultHead"');
  });

  it("does not render the top Ergebnis metric panel", () => {
    const html = renderAppShell();

    expect(html).not.toContain('class="panel summary-panel"');
    expect(html).not.toContain('id="maxNeeded"');
    expect(html).not.toContain('id="investmentNetWealthTop"');
    expect(html).not.toContain("Max. benoetigter Kontostand");
    expect(html).not.toContain("Vermoegen fuer Auszahlung");
  });

  it("renders real estate assumption fields as one control each", () => {
    const html = renderAppShell();

    expect(html).not.toContain("Strategie und Annahmen");
    expect(count(html, 'data-real-estate-field="purchaseActivated"')).toBe(1);
    expect(html).toContain("Immobilie gekauft / Kauf geplant");
    expect(html).toContain('id="combinedRealEstateActivationMetric"');
    expect(html).toContain('id="combinedRealEstateFinancingYearsMetric"');
    expect(html).not.toContain('data-real-estate-field="equityCapital"');
    expect(html).not.toContain('data-real-estate-field="loanAmount"');
    expect(html).not.toContain('data-real-estate-field="targetTermYears"');
    expect(html).not.toContain('data-real-estate-field="subsidyAmount"');
    expect(html).not.toContain('data-real-estate-field="remainingDebtAfterFixedInterest"');
    expect(count(html, 'data-real-estate-field="financingEndAge"')).toBe(0);
    expect(count(html, 'data-real-estate-field="plannedSaleYear"')).toBe(1);
    expect(html).toContain('id="realEstateCalculatedEndAgeMetric"');
    expect(html).toContain("Bezahlt bis Alter");
    expect(count(html, 'data-real-estate-field="interestRatePercent"')).toBe(0);
    expect(count(html, 'data-real-estate-range="interestRatePercent"')).toBe(1);
    expect(count(html, 'data-real-estate-field="monthlyPayment"')).toBe(0);
    expect(count(html, 'data-real-estate-range="monthlyPayment"')).toBe(0);
    expect(count(html, 'data-real-estate-range="initialRepaymentPercent"')).toBe(0);
    expect(count(html, 'data-real-estate-range="specialRepaymentAmount"')).toBe(0);
    expect(html).toContain('id="realEstateEquityCapitalSourceList"');
    expect(html).toContain('id="realEstateMonthlyPaymentSourceList"');
    expect(html).toContain('id="realEstateSpecialRepaymentSourceList"');
    expect(html).toContain('data-action="toggle-real-estate-depot-savings-rate-source"');
    expect(html).toContain('data-action="toggle-combined-module"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).not.toContain('type="checkbox" data-combined-toggle');
    expect(html).not.toContain('id="realEstateLoanMetric"');
    expect(html).not.toContain('id="realEstateMonthlyRateMetric"');
    expect(html).not.toContain('id="realEstatePropertyValueMetric"');
    expect(html).not.toContain('id="realEstatePropertyEquityMetric"');
    expect(count(html, 'data-real-estate-field="propertyValueGrowthPercent"')).toBe(0);
    expect(count(html, 'data-real-estate-range="propertyValueGrowthPercent"')).toBe(1);
    expect(html).toContain("Immobilienwertzuwachs in % pro Jahr");
    expect(count(html, 'data-real-estate-field="inflationRatePercent"')).toBe(0);
    expect(count(html, 'data-real-estate-range="inflationRatePercent"')).toBe(0);
    expect(html).toContain('id="realEstateChartPopup"');
    expect(html).not.toContain('id="realEstateYearDetail"');
  });

  it("renders wealth charts as vertical column charts", () => {
    const repayment = renderRealEstateRepaymentChart({
      points: [realEstateYear],
      selectedYear: 2026,
      loanCostBasis: 240000,
      financingEndYear: 2026,
      formatMoney: String
    });
    const trend = renderRealEstateTrendChart({
      points: [realEstateYear],
      selectedYear: 2026,
      financingEndYear: 2026,
      formatMoney: String
    });
    const combined = renderCombinedWealthChart({
      points: [{
        ...combinedYear,
        pensionIncome: 12000,
        pensionConsumed: 12000,
        pensionConsumedValue: 24000,
        taxValue: 900,
        cumulativeTaxValue: 1800
      }],
      selectedYear: 2026,
      formatMoney: String
    });

    expect(repayment).toContain("wealth-vertical-chart");
    expect(repayment).toContain("Darlehensbetrag inkl. Zinsen, Tilgung und Zinsen je Jahr");
    expect(repayment).toContain('data-chart-kind="repayment"');
    expect(repayment).toContain('style="--wealth-chart-count:1;"');
    expect(repayment).toContain("240 Tsd. EUR");
    expect(repayment).toContain('data-financing-end="true"');
    expect(repayment).toContain("financing-end");
    expect(trend).toContain("wealth-vertical-chart");
    expect(trend).toContain('data-chart-kind="trend"');
    expect(trend).toContain('data-financing-end="true"');
    expect(combined).toContain("wealth-vertical-chart");
    expect(combined).toContain("Verbrauchte Rente");
    expect(combined).toContain("wealth-column-segment pension-consumed");
    expect(combined).toContain("Verbrauchte Rente kumuliert");
    expect(combined).toContain('data-action="toggle-combined-wealth-line"');
    expect(combined).toContain('data-combined-wealth-line="pensionConsumedCumulative"');
    expect(combined).toContain("wealth-line-overlay pension-consumed-cumulative");
    expect(combined).toContain("Steuern");
    expect(combined).toContain("wealth-column-segment tax");
    expect(combined).toContain("Steuern kumuliert");
    expect(combined).toContain('data-combined-wealth-line="taxCumulative"');
    expect(combined).toContain("wealth-line-overlay tax-cumulative");
    expect(combined).toContain('data-combined-wealth-line="propertyValue"');
    expect(combined).toContain('data-combined-wealth-line="propertyDebt"');
    expect(combined).not.toContain("legend-dot pension-consumed-cumulative");
    expect(combined).not.toContain("legend-dot tax-cumulative");
    expect(combined).toContain("Immobilienwert");
    expect(combined).not.toContain("Immobilien-Eigenkapital");
    expect(combined).toContain("Immobilienschuld");
    expect(combined).toContain("Nettovermoegen");
    expect(combined).toContain("wealth-column-segment equity");
    expect(combined).toContain("wealth-line-overlay property");
    expect(combined).toContain("wealth-line-overlay debt");
    expect(combined).toContain("Immobilienwert brutto");
    expect(combined).not.toContain("wealth-column-segment property");
    expect(combined.indexOf("wealth-column-segment equity")).toBeLessThan(
      combined.indexOf("wealth-column-segment cash")
    );
    expect(`${repayment}${trend}${combined}`).not.toContain("wealth-bar-row");
  });

  it("can render the combined wealth chart with reference lines switched off", () => {
    const chart = renderCombinedWealthChart({
      points: [{ ...combinedYear, pensionConsumedValue: 24000, cumulativeTaxValue: 1800 }],
      selectedYear: 2026,
      lineVisibility: {
        pensionConsumedCumulative: false,
        taxCumulative: false,
        propertyValue: false,
        propertyDebt: false
      },
      formatMoney: String
    });

    expect(chart).toContain('aria-pressed="false"');
    expect(chart).toContain('data-combined-wealth-line="propertyValue"');
    expect(chart).toContain('data-combined-wealth-line="propertyDebt"');
    expect(chart).not.toContain("wealth-line-overlay pension-consumed-cumulative");
    expect(chart).not.toContain("wealth-line-overlay tax-cumulative");
    expect(chart).not.toContain("wealth-line-overlay property");
    expect(chart).not.toContain("wealth-line-overlay debt");
  });

  it("sets the vertical chart column count for responsive fitting", () => {
    const chart = renderCombinedWealthChart({
      points: [combinedYear, { ...combinedYear, year: 2027 }],
      selectedYear: 2026,
      formatMoney: String
    });

    expect(chart).toContain('style="--wealth-chart-count:2;"');
  });

  it("renders the combined wealth chart with line controls and 15-year ticks", () => {
    const points: CombinedWealthYear[] = Array.from({ length: 33 }, (_, index) => ({
      ...combinedYear,
      year: 2026 + index,
      cashValue: 10000 + index * 100,
      depotValue: 20000 + index * 200,
      propertyValue: 300000 + index * 1000,
      totalGrossAssets: 330000 + index * 1300
    }));
    const chart = renderCombinedWealthChart({
      points,
      selectedYear: 2029,
      formatMoney: (value) => `${value} EUR`
    });
    const compact = chart.replace(/\s+/g, " ");

    expect(chart).toContain("combined-wealth-summary");
    expect(compact).toContain('class="legend-item"><span class="legend-dot cash"></span>Cash</span>');
    expect(compact).toContain('class="legend-item"><span class="legend-dot depot"></span>Depot</span>');
    expect(compact).toContain('class="legend-item"><span class="legend-dot pension-consumed"></span>Verbrauchte Rente</span>');
    expect(compact).toContain('class="legend-item"><span class="legend-dot pension"></span>Gesparte Rente</span>');
    expect(compact).toContain('class="legend-item"><span class="legend-dot tax"></span>Steuern</span>');
    expect(compact).toContain('class="legend-item"><span class="legend-dot equity"></span>Immobilienwert</span>');
    expect(chart).not.toContain("combined-wealth-summary-values");
    expect(chart).not.toContain("combined-wealth-summary-label");
    expect(chart).not.toContain("combined-wealth-summary-value");
    expect(compact).not.toContain('class="combined-wealth-summary-label">Cash</span>');
    expect(compact).not.toContain('class="combined-wealth-summary-label">Nettovermoegen</span>');
    expect(compact).not.toContain('class="combined-wealth-summary-label">Immobilienwert</span>');
    expect(chart).toContain("wealth-line-overlay property");
    expect(chart).toContain('data-combined-wealth-line="propertyValue"');
    expect(chart).toContain('data-combined-wealth-line="propertyDebt"');
    expect(chart).toContain("Immobilienwert brutto");
    expect(chart).not.toContain("Immobilien-Eigenkapital");
    expect(chart).not.toContain("wealth-column-value");
    expect(chart).not.toContain("wealth-column-year");
    expect(chart).not.toContain('class="wealth-x-axis"');
    expect(chart).toContain("combined-wealth-ticks");
    expect(count(chart, "combined-wealth-tick visible")).toBe(3);
    expect(compact).toContain('class="combined-wealth-tick visible"> 2026 </span>');
    expect(compact).toContain('class="combined-wealth-tick visible"> 2041 </span>');
    expect(compact).toContain('class="combined-wealth-tick visible"> 2056 </span>');
    expect(compact).not.toContain('class="combined-wealth-tick visible"> 2058 </span>');
    expect(count(chart, 'data-action="select-combined-wealth-year"')).toBe(33);
  });

  it("moves the yearly pension value into the combined wealth popup", () => {
    const popup = renderCombinedWealthPopup({
      selected: { ...combinedYear, pensionIncome: 12000, pensionConsumed: 9000 },
      finalYear: combinedYear,
      formatMoney: (value) => `${value} EUR`,
      formatInt: String
    });

    expect(popup).toContain("Rente p.a.");
    expect(popup).toContain("12000 EUR");
    expect(popup.indexOf("Rente p.a.")).toBeLessThan(popup.indexOf("Verbrauchte Rente"));
  });

  it("exposes real estate popup segment labels", () => {
    const repaymentSegments = realEstateRepaymentSegments({ point: realEstateYear, totalLoanCost: 240000 });
    const repaymentLabels = repaymentSegments.map((segment) => segment.label);
    const trendLabels = realEstateTrendSegments(realEstateYear, realEstateYear.propertyValue).map(
      (segment) => segment.label
    );

    expect(repaymentLabels).toEqual(["Darlehensbetrag inkl. Zinsen offen", "Getilgter Kreditanteil", "Zinsen"]);
    expect(repaymentLabels).not.toContain("Restschuld");
    expect(repaymentSegments.find((segment) => segment.label === "Darlehensbetrag inkl. Zinsen offen")?.value).toBe(
      225000
    );
    expect(repaymentSegments.find((segment) => segment.label === "Getilgter Kreditanteil")?.value).toBe(15000);
    expect(trendLabels).toEqual(["Ausgangswert", "Wertentwicklung"]);
    expect([...repaymentLabels, "Darlehensbetrag inkl. Zinsen", ...trendLabels, "Immobilienwert"]).toContain(
      "Darlehensbetrag inkl. Zinsen"
    );
  });

  it("adds yearly interest and principal to the paid loan cost", () => {
    expect(paidLoanCostForYear(realEstateYear)).toBe(15000);
  });

  it("does not leave an open loan cost when the calculated loan cost is fully repaid", () => {
    const repaymentSegments = realEstateRepaymentSegments({
      point: { ...realEstateYear, loanEnd: 0, loanCostPaidToDate: 240000, loanCostRemaining: 0 },
      totalLoanCost: 240000
    });

    expect(repaymentSegments.find((segment) => segment.label === "Darlehensbetrag inkl. Zinsen offen")?.value).toBe(0);
    expect(repaymentSegments.find((segment) => segment.label === "Getilgter Kreditanteil")?.value).toBe(240000);
  });

  it("uses the calculated open loan cost without a debt-zero override", () => {
    const repaymentSegments = realEstateRepaymentSegments({
      point: { ...realEstateYear, loanEnd: 0, loanCostPaidToDate: 15000, loanCostRemaining: 225000 },
      totalLoanCost: 240000
    });

    expect(repaymentSegments.find((segment) => segment.label === "Darlehensbetrag inkl. Zinsen offen")?.value).toBe(
      225000
    );
    expect(repaymentSegments.find((segment) => segment.label === "Getilgter Kreditanteil")?.value).toBe(15000);
  });

  it("formats real estate popup headings with age and year", () => {
    expect(realEstatePopupHeading(45, 2026)).toBe("Alter 45 | Jahr 2026");
  });

  it("renders combined inheritance from the final chart year", () => {
    const detail = renderCombinedWealthYearDetail({
      selected: combinedYear,
      finalYear: { ...combinedYear, year: 2028, totalNetWealth: 155000 },
      formatMoney: (value) => `${value} EUR`,
      formatInt: String
    });

    expect(detail).toContain("Erbe an Nachkommen");
    expect(detail).toContain("155000 EUR");
  });

  it("renders an empty real estate repayment chart without a start loan", () => {
    const repayment = renderRealEstateRepaymentChart({
      points: [{ ...realEstateYear, loanStart: 0, loanEnd: 0, principalPaid: 0, netPropertyWealth: 300000 }],
      selectedYear: 2026,
      formatMoney: String
    });

    expect(repayment).toContain("Noch kein Start-Kreditvolumen");
    expect(repayment).not.toContain("wealth-column-segment equity");
  });

  it("scales the repayment chart above the loan cost basis when real debt grows", () => {
    const repayment = renderRealEstateRepaymentChart({
      points: [{ ...realEstateYear, loanEnd: 250000, interestDue: 12000, loanCostRemaining: 225000 }],
      selectedYear: 2026,
      loanCostBasis: 240000,
      formatMoney: String
    });

    expect(repayment).toContain("250 Tsd. EUR");
    expect(repayment).toContain('wealth-column-overlay interest');
  });
});

function count(value: string, needle: string): number {
  return value.split(needle).length - 1;
}
