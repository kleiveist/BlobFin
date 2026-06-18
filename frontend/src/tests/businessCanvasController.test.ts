import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultAppState } from "../data/defaults";
import { defaultBusinessIdeaCanvasForProject, normalizeBusinessIdeaCanvasMeta } from "../domain/businessIdeaCanvas";
import { handleBusinessIdeaCanvasKeyDown } from "../features/self-employment/business-canvas/controller";
import { configureBusinessCanvasHost } from "../features/self-employment/business-canvas/host";
import { handleBusinessIdeaCanvasDoubleClick } from "../features/self-employment/business-canvas/nodeController";
import { selectBusinessIdeaCanvasNodes } from "../features/self-employment/business-canvas/selectionController";
import { businessCanvasUiState } from "../features/self-employment/business-canvas/uiState";
import type { JsonCanvasNode, SelfEmploymentProject } from "../types";

afterEach(() => {
  resetBusinessCanvasUiState();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("business canvas controller", () => {
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
  businessCanvasUiState.spacePressed = false;
  businessCanvasUiState.lastDragEndAt = 0;
}
