import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultAppState } from "../data/defaults";
import { defaultBusinessIdeaCanvasForProject, normalizeBusinessIdeaCanvasMeta } from "../domain/businessIdeaCanvas";
import { normalizeSelfEmploymentGanttPlan } from "../domain/selfEmploymentGantt";
import {
  handleBusinessIdeaCanvasKeyDown,
  toggleBusinessIdeaCanvasGanttSummary
} from "../features/self-employment/business-canvas/controller";
import { configureBusinessCanvasHost } from "../features/self-employment/business-canvas/host";
import {
  handleBusinessIdeaCanvasDoubleClick,
  updateBusinessIdeaCanvasSelectedNodeField
} from "../features/self-employment/business-canvas/nodeController";
import { selectBusinessIdeaCanvasNodes } from "../features/self-employment/business-canvas/selectionController";
import { businessCanvasUiState } from "../features/self-employment/business-canvas/uiState";
import { renderBusinessIdeaCanvasEditor, type BusinessIdeaCanvasRenderState } from "../features/self-employment/business-canvas/view";
import type { JsonCanvasNode, SelfEmploymentProject } from "../types";

afterEach(() => {
  resetBusinessCanvasUiState();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("business canvas controller", () => {
  it("renders shared label and phase controls for multi-card selections", () => {
    const host = configureFakeBusinessCanvasHost([
      { id: "a", type: "text", text: "A", x: 0, y: 0, width: 100, height: 80 },
      { id: "b", type: "text", text: "B", x: 120, y: 20, width: 100, height: 80 }
    ]);
    host.project().businessIdeaCanvasMeta.nodeMeta.a = {
      ...host.project().businessIdeaCanvasMeta.nodeMeta.a,
      labelId: "implementation",
      phaseId: "phase-2"
    };
    host.project().businessIdeaCanvasMeta.nodeMeta.b = {
      ...host.project().businessIdeaCanvasMeta.nodeMeta.b,
      labelId: "implementation",
      phaseId: "phase-2"
    };

    const toolbar = renderSelectedMultiToolbar(host.project(), ["a", "b"]);

    expect(toolbar).toContain("business-canvas-label-dropdown");
    expect(toolbar).toContain("business-canvas-phase-dropdown");
    expect(toolbar).toContain("Umsetzung");
    expect(toolbar).toContain("business-canvas-phase-badge-button\">2");
    expect(toolbar).toContain("Phase 0");
    expect(toolbar).toContain('data-business-canvas-selected-node-value="phase-0"');
  });

  it("renders mixed label and phase states for heterogeneous multi-card selections", () => {
    const host = configureFakeBusinessCanvasHost([
      { id: "a", type: "text", text: "A", x: 0, y: 0, width: 100, height: 80 },
      { id: "b", type: "text", text: "B", x: 120, y: 20, width: 100, height: 80 }
    ]);
    host.project().businessIdeaCanvasMeta.nodeMeta.a = {
      ...host.project().businessIdeaCanvasMeta.nodeMeta.a,
      labelId: "idea",
      phaseId: "phase-1"
    };
    host.project().businessIdeaCanvasMeta.nodeMeta.b = {
      ...host.project().businessIdeaCanvasMeta.nodeMeta.b,
      labelId: "implementation",
      phaseId: "phase-2"
    };

    const toolbar = renderSelectedMultiToolbar(host.project(), ["a", "b"]);

    expect(toolbar).toContain("Gemischt");
    expect(toolbar).not.toContain(" active");
  });

  it("does not render label and phase controls for group-only selections", () => {
    const host = configureFakeBusinessCanvasHost([
      { id: "group-a", type: "group", label: "Gruppe A", x: 0, y: 0, width: 180, height: 140 },
      { id: "group-b", type: "group", label: "Gruppe B", x: 200, y: 20, width: 180, height: 140 }
    ]);

    const toolbar = renderSelectedMultiToolbar(host.project(), ["group-a", "group-b"]);

    expect(toolbar).not.toContain("business-canvas-label-dropdown");
    expect(toolbar).not.toContain("business-canvas-phase-dropdown");
  });

  it("renders completed gantt cards as completed business canvas cards", () => {
    const host = configureFakeBusinessCanvasHost([
      { id: "done-card", type: "text", text: "Fertige Karte", x: 0, y: 0, width: 100, height: 80 },
      { id: "open-card", type: "text", text: "Offene Karte", x: 120, y: 20, width: 100, height: 80 }
    ]);
    const project = host.project();
    project.gantt = normalizeSelfEmploymentGanttPlan(
      {
        cardPlans: [
          {
            cardId: "done-card",
            timeBudgetHours: 1,
            completed: true,
            todos: [{ id: "todo-done", title: "Fertig", eisenhowerQuadrant: "important_not_urgent", status: "done", completed: true }]
          },
          {
            cardId: "open-card",
            timeBudgetHours: 1,
            completed: false,
            todos: [{ id: "todo-open", title: "Offen", eisenhowerQuadrant: "important_not_urgent", status: "planned", completed: false }]
          }
        ]
      },
      project.businessIdeaCanvas,
      project.businessIdeaCanvasMeta
    );

    const html = renderBusinessIdeaCanvasEditor(project, blankBusinessIdeaCanvasRenderState());
    const completedArticle = renderBusinessCanvasNodeArticle(html, "done-card");
    const openArticle = renderBusinessCanvasNodeArticle(html, "open-card");

    expect(completedArticle).toContain(" completed");
    expect(completedArticle).toContain("business-canvas-completed-badge");
    expect(completedArticle).toContain("Erledigt");
    expect(openArticle).not.toContain("business-canvas-completed-badge");
    expect(openArticle).not.toContain(" completed");
  });

  it("does not render completed badges for open cards or groups", () => {
    const host = configureFakeBusinessCanvasHost([
      { id: "open-card", type: "text", text: "Offene Karte", x: 0, y: 0, width: 100, height: 80 },
      { id: "group", type: "group", label: "Gruppe", x: -20, y: -20, width: 260, height: 180 }
    ]);
    const project = host.project();
    project.gantt = normalizeSelfEmploymentGanttPlan(
      {
        cardPlans: [
          {
            cardId: "open-card",
            timeBudgetHours: 1,
            completed: false,
            todos: [{ id: "todo-open", title: "Offen", eisenhowerQuadrant: "important_not_urgent", status: "planned", completed: false }]
          },
          {
            cardId: "group",
            timeBudgetHours: 1,
            completed: true,
            todos: [{ id: "todo-group", title: "Gruppe", eisenhowerQuadrant: "important_not_urgent", status: "done", completed: true }]
          }
        ]
      },
      project.businessIdeaCanvas,
      project.businessIdeaCanvasMeta
    );

    const html = renderBusinessIdeaCanvasEditor(project, blankBusinessIdeaCanvasRenderState());
    const openArticle = renderBusinessCanvasNodeArticle(html, "open-card");
    const groupArticle = renderBusinessCanvasNodeArticle(html, "group");

    expect(openArticle).not.toContain("business-canvas-completed-badge");
    expect(openArticle).not.toContain(" completed");
    expect(groupArticle).not.toContain("business-canvas-completed-badge");
    expect(groupArticle).not.toContain(" completed");
  });

  it("toggles the business canvas gantt summary for the current project", () => {
    const host = configureFakeBusinessCanvasHost([
      { id: "a", type: "text", text: "A", x: 0, y: 0, width: 100, height: 80 }
    ]);

    const openHtml = renderBusinessIdeaCanvasEditor(host.project(), blankBusinessIdeaCanvasRenderState());
    expect(openHtml).not.toContain("gantt-collapsed");
    expect(openHtml).toContain("business-canvas-gantt-shell");
    expect(openHtml).toContain('aria-expanded="true"');
    expect(openHtml).toContain("&gt;</button>");
    expect(openHtml).not.toContain(">Einklappen<");
    expect(openHtml).not.toContain(">Ausklappen<");
    expect(openHtml).toContain("business-canvas-gantt-rows");

    toggleBusinessIdeaCanvasGanttSummary();
    const collapsedHtml = renderBusinessIdeaCanvasEditor(host.project(), blankBusinessIdeaCanvasRenderState());

    expect(businessCanvasUiState.collapsedGanttProjectIds).toEqual([host.projectId]);
    expect(collapsedHtml).toContain("business-canvas-workbench gantt-collapsed");
    expect(collapsedHtml).toContain("business-canvas-gantt-shell collapsed");
    expect(collapsedHtml).toContain('aria-expanded="false"');
    expect(collapsedHtml).toContain("&lt;</button>");
    expect(collapsedHtml).not.toContain("business-canvas-gantt-rows");
    expect(collapsedHtml).not.toContain(">Einklappen<");
    expect(collapsedHtml).not.toContain(">Ausklappen<");

    toggleBusinessIdeaCanvasGanttSummary();

    expect(businessCanvasUiState.collapsedGanttProjectIds).toEqual([]);
  });

  it("updates label and phase for all selected cards while leaving groups unchanged", () => {
    const host = configureFakeBusinessCanvasHost([
      { id: "a", type: "text", text: "A", x: 0, y: 0, width: 100, height: 80 },
      { id: "b", type: "text", text: "B", x: 120, y: 20, width: 100, height: 80 },
      { id: "group", type: "group", label: "Gruppe", x: -20, y: -20, width: 300, height: 160 }
    ]);
    const originalGroupMeta = { ...host.project().businessIdeaCanvasMeta.nodeMeta.group };
    selectBusinessIdeaCanvasNodes(host.projectId, ["a", "b", "group"]);

    updateBusinessIdeaCanvasSelectedNodeField("labelId", "goal");
    updateBusinessIdeaCanvasSelectedNodeField("phaseId", "phase-3");

    expect(host.project().businessIdeaCanvasMeta.nodeMeta.a).toMatchObject({ labelId: "goal", phaseId: "phase-3" });
    expect(host.project().businessIdeaCanvasMeta.nodeMeta.b).toMatchObject({ labelId: "goal", phaseId: "phase-3" });
    expect(host.project().businessIdeaCanvasMeta.nodeMeta.group).toEqual(originalGroupMeta);
  });

  it("moves the selected card with arrow keys and preserves selection", () => {
    const host = configureFakeBusinessCanvasHost([
      { id: "a", type: "text", text: "A", x: 0, y: 0, width: 100, height: 80 }
    ]);
    stubBusinessCanvasDocument(host.projectId);
    selectBusinessIdeaCanvasNodes(host.projectId, ["a"]);

    const event = keyboardEvent("ArrowRight");
    handleBusinessIdeaCanvasKeyDown(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(host.project().businessIdeaCanvas.nodes[0]).toMatchObject({ x: 10, y: 0 });
    expect(businessCanvasUiState.selectedNodeIds).toEqual({ projectId: host.projectId, nodeIds: ["a"] });
  });

  it("uses Shift for one-pixel arrow-key movement", () => {
    const host = configureFakeBusinessCanvasHost([
      { id: "a", type: "text", text: "A", x: 0, y: 0, width: 100, height: 80 }
    ]);
    stubBusinessCanvasDocument(host.projectId);
    selectBusinessIdeaCanvasNodes(host.projectId, ["a"]);

    handleBusinessIdeaCanvasKeyDown(keyboardEvent("ArrowUp", { shiftKey: true }));

    expect(host.project().businessIdeaCanvas.nodes[0]).toMatchObject({ x: 0, y: -1 });
  });

  it("moves multiple selected cards together", () => {
    const host = configureFakeBusinessCanvasHost([
      { id: "a", type: "text", text: "A", x: 0, y: 0, width: 100, height: 80 },
      { id: "b", type: "text", text: "B", x: 120, y: 20, width: 100, height: 80 }
    ]);
    stubBusinessCanvasDocument(host.projectId);
    selectBusinessIdeaCanvasNodes(host.projectId, ["a", "b"]);

    handleBusinessIdeaCanvasKeyDown(keyboardEvent("ArrowLeft"));

    expect(host.project().businessIdeaCanvas.nodes.map((node) => ({ id: node.id, x: node.x, y: node.y }))).toEqual([
      { id: "a", x: -10, y: 0 },
      { id: "b", x: 110, y: 20 }
    ]);
    expect(businessCanvasUiState.selectedNodeIds).toEqual({ projectId: host.projectId, nodeIds: ["a", "b"] });
  });

  it("does not move cards while editable fields are active", () => {
    const host = configureFakeBusinessCanvasHost([
      { id: "a", type: "text", text: "A", x: 0, y: 0, width: 100, height: 80 }
    ]);
    selectBusinessIdeaCanvasNodes(host.projectId, ["a"]);

    stubBusinessCanvasDocument(host.projectId, { tagName: "INPUT", isContentEditable: false });
    handleBusinessIdeaCanvasKeyDown(keyboardEvent("ArrowRight"));
    stubBusinessCanvasDocument(host.projectId, { tagName: "DIV", isContentEditable: true });
    handleBusinessIdeaCanvasKeyDown(keyboardEvent("ArrowRight"));

    expect(host.project().businessIdeaCanvas.nodes[0]).toMatchObject({ x: 0, y: 0 });
  });

  it("starts title editing on title double-click and selects the text", () => {
    vi.useFakeTimers();
    const host = configureFakeBusinessCanvasHost([
      { id: "a", type: "text", text: "Titel", x: 0, y: 0, width: 100, height: 80 }
    ]);
    const focus = vi.fn();
    const selectNodeContents = vi.fn();
    const removeAllRanges = vi.fn();
    const addRange = vi.fn();
    const range = { selectNodeContents } as unknown as Range;
    const titleElement = titleElementStub(host.projectId, "a", focus);
    stubBusinessCanvasDocument(host.projectId, undefined, titleElement, range);
    vi.stubGlobal("window", {
      setTimeout: (handler: () => void, timeout?: number) => setTimeout(handler, timeout),
      getSelection: () => ({ removeAllRanges, addRange })
    });

    const event = { target: titleElement, preventDefault: vi.fn() } as unknown as MouseEvent;
    handleBusinessIdeaCanvasDoubleClick(event);
    vi.runAllTimers();

    expect(event.preventDefault).toHaveBeenCalled();
    expect(businessCanvasUiState.editingNode).toEqual({ projectId: host.projectId, nodeId: "a" });
    expect(focus).toHaveBeenCalled();
    expect(selectNodeContents).toHaveBeenCalledWith(titleElement);
    expect(removeAllRanges).toHaveBeenCalled();
    expect(addRange).toHaveBeenCalledWith(range);
  });
});

function configureFakeBusinessCanvasHost(nodes: JsonCanvasNode[]): { projectId: string; project: () => SelfEmploymentProject } {
  const projectId = "project-keyboard";
  const state = defaultAppState();
  const defaults = defaultBusinessIdeaCanvasForProject(projectId);
  const canvas = { nodes, edges: [] };
  const project: SelfEmploymentProject = {
    ...state.selfEmployment.projects[0],
    id: projectId,
    businessIdeaCanvas: canvas,
    businessIdeaCanvasFile: defaults.businessIdeaCanvasFile,
    businessIdeaCanvasMeta: normalizeBusinessIdeaCanvasMeta({}, canvas, defaults.businessIdeaCanvasMeta)
  };
  state.selfEmployment = {
    ...state.selfEmployment,
    selectedProjectId: projectId,
    projects: [project]
  };
  configureBusinessCanvasHost({
    getState: () => state,
    projectById: (id) => state.selfEmployment.projects.find((item) => item.id === id) ?? null,
    updateSelfEmploymentProject: (id, updater) => {
      state.selfEmployment = {
        ...state.selfEmployment,
        projects: state.selfEmployment.projects.map((item) => (item.id === id ? updater(item) : item))
      };
    },
    clearGanttEditorForDeletedNodes: () => undefined,
    renderAll: () => undefined
  });
  return {
    projectId,
    project: () => state.selfEmployment.projects[0]
  };
}

function renderSelectedMultiToolbar(project: SelfEmploymentProject, selectedNodeIds: string[]): string {
  const html = renderBusinessIdeaCanvasEditor(project, {
    selectedNodeIds,
    selectedEdgeId: null,
    editingNodeId: null,
    editingEdgeLabelId: null,
    editingEdgeLabelDraft: "",
    armedNodeId: null,
    lineMenu: null,
    selectionRect: null,
    contextMenu: null,
    palettePopover: null,
    paletteEditor: null,
    clipboardAvailable: false,
    ganttCollapsed: businessCanvasUiState.collapsedGanttProjectIds.includes(project.id)
  } satisfies BusinessIdeaCanvasRenderState);
  const start = html.indexOf("data-business-canvas-multi-toolbar");
  if (start === -1) return "";
  return html.slice(start, start + 10000);
}

function blankBusinessIdeaCanvasRenderState(): BusinessIdeaCanvasRenderState {
  return {
    selectedNodeIds: [],
    selectedEdgeId: null,
    editingNodeId: null,
    editingEdgeLabelId: null,
    editingEdgeLabelDraft: "",
    armedNodeId: null,
    lineMenu: null,
    selectionRect: null,
    contextMenu: null,
    palettePopover: null,
    paletteEditor: null,
    clipboardAvailable: false,
    ganttCollapsed: businessCanvasUiState.collapsedGanttProjectIds.includes("project-keyboard")
  };
}

function renderBusinessCanvasNodeArticle(html: string, nodeId: string): string {
  const markerIndex = html.indexOf(`data-business-canvas-node-id="${nodeId}"`);
  if (markerIndex === -1) return "";
  const articleStart = html.lastIndexOf("<article", markerIndex);
  const articleEnd = html.indexOf("</article>", markerIndex);
  if (articleStart === -1 || articleEnd === -1) return "";
  return html.slice(articleStart, articleEnd + "</article>".length);
}

function keyboardEvent(
  key: string,
  overrides: Partial<Pick<KeyboardEvent, "shiftKey" | "ctrlKey" | "metaKey" | "altKey">> = {}
): KeyboardEvent & { preventDefault: ReturnType<typeof vi.fn> } {
  return {
    key,
    code: "",
    shiftKey: overrides.shiftKey ?? false,
    ctrlKey: overrides.ctrlKey ?? false,
    metaKey: overrides.metaKey ?? false,
    altKey: overrides.altKey ?? false,
    preventDefault: vi.fn()
  } as unknown as KeyboardEvent & { preventDefault: ReturnType<typeof vi.fn> };
}

function stubBusinessCanvasDocument(
  projectId: string,
  activeElement: { tagName: string; isContentEditable: boolean } = { tagName: "BODY", isContentEditable: false },
  titleElement?: HTMLElement,
  range?: Range
): void {
  const projectElement = {
    dataset: { businessCanvasProjectId: projectId }
  } as unknown as HTMLElement;
  vi.stubGlobal("document", {
    activeElement,
    querySelector: (selector: string) => {
      if (selector === ".business-canvas-editor") return projectElement;
      if (selector.startsWith("[data-business-canvas-node-text=")) return titleElement ?? null;
      return null;
    },
    querySelectorAll: (selector: string) => (selector === "[data-business-canvas-project-id]" ? [projectElement] : []),
    createRange: () => range
  });
}

function titleElementStub(projectId: string, nodeId: string, focus: () => void): HTMLElement {
  const projectElement = {
    dataset: { businessCanvasProjectId: projectId }
  } as unknown as HTMLElement;
  const nodeElement = {
    dataset: { businessCanvasNodeId: nodeId },
    closest: (selector: string) => (selector === "[data-business-canvas-project-id]" ? projectElement : null)
  } as unknown as HTMLElement;
  let titleElement: HTMLElement;
  titleElement = {
    dataset: { businessCanvasNodeText: nodeId },
    focus,
    closest: (selector: string) => {
      if (selector === "[data-business-canvas-node-text]") return titleElement;
      if (selector === "[data-business-canvas-node-id]") return nodeElement;
      return null;
    }
  } as unknown as HTMLElement;
  return titleElement;
}

function resetBusinessCanvasUiState(): void {
  businessCanvasUiState.selectedNodeIds = null;
  businessCanvasUiState.selectedEdge = null;
  businessCanvasUiState.editingNode = null;
  businessCanvasUiState.editingEdgeLabel = null;
  businessCanvasUiState.armedConnection = null;
  businessCanvasUiState.lineMenu = null;
  businessCanvasUiState.dragState = null;
  businessCanvasUiState.connectionDragState = null;
  businessCanvasUiState.selectionDragState = null;
  businessCanvasUiState.selectionRect = null;
  businessCanvasUiState.panDragState = null;
  businessCanvasUiState.wheelZoomState = null;
  businessCanvasUiState.contextMenu = null;
  businessCanvasUiState.palettePopover = null;
  businessCanvasUiState.paletteEditor = null;
  businessCanvasUiState.clipboard = null;
  businessCanvasUiState.collapsedGanttProjectIds = [];
  businessCanvasUiState.spacePressed = false;
  businessCanvasUiState.lastDragEndAt = 0;
}
