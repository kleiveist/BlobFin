import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultAppState } from "../data/defaults";
import { getVaultStatus, initializeStorage, loadState, normalizeStoredState, saveState, selectVault } from "../lib/storage";
import { readVaultFallbackMetadata, saveVaultFallbackMetadata } from "../lib/vault/vaultFallback";
import { createVaultManifest, parseVaultManifest } from "../lib/vault/vaultManifest";
import { deserializeVaultState, serializeVaultState } from "../lib/vault/vaultSerializer";
import { createVaultSnapshot, joinVaultPath, manifestPath, profilePath, readVault, readVaultState, writeVaultState } from "../lib/vault/vaultStorage";

const tauriInvokeMock = vi.hoisted(() => vi.fn());
const dialogOpenMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: tauriInvokeMock
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: dialogOpenMock
}));

const STORAGE_KEY = "blobfin.reserveCalculator.v1";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

class MemoryVaultFiles {
  private values = new Map<string, string>();

  async invoke(command: string, args: Record<string, unknown>): Promise<unknown> {
    const path = String(args.path ?? "");
    if (command === "vault_read_text_file") return this.values.get(path) ?? null;
    if (command === "vault_write_text_file") {
      this.values.set(path, String(args.contents ?? ""));
      return undefined;
    }
    if (command === "vault_create_dir_all") return undefined;
    if (command === "vault_list_project_canvas_files") return this.listProjectCanvasFiles(path);
    if (command === "vault_list_project_dirs") return this.listProjectDirs(path);
    if (command === "vault_remove_dir_all") {
      this.removeDirAll(path);
      return undefined;
    }
    throw new Error(`Unexpected vault command: ${command}`);
  }

  readJson(path: string): unknown {
    const contents = this.values.get(path);
    if (!contents) throw new Error(`Missing memory vault file: ${path}`);
    return JSON.parse(contents);
  }

  readText(path: string): string | null {
    return this.values.get(path) ?? null;
  }

  has(path: string): boolean {
    return this.values.has(path);
  }

  writeJson(path: string, value: unknown): void {
    this.values.set(path, `${JSON.stringify(value, null, 2)}\n`);
  }

  private listProjectCanvasFiles(path: string): string[] {
    const prefix = `${path.replace(/[\\/]+$/, "")}/`;
    return Array.from(this.values.keys())
      .filter((item) => item.startsWith(prefix) && item.endsWith(".canvas"))
      .map((item) => item.slice(prefix.length))
      .filter((item) => item.split(/[\\/]/).length === 2)
      .sort();
  }

  private listProjectDirs(path: string): string[] {
    const prefix = `${path.replace(/[\\/]+$/, "")}/`;
    const dirs = new Set<string>();
    for (const item of this.values.keys()) {
      if (!item.startsWith(prefix)) continue;
      const [projectId] = item.slice(prefix.length).split(/[\\/]/);
      if (projectId) dirs.add(projectId);
    }
    return [...dirs].sort();
  }

  private removeDirAll(path: string): void {
    const prefix = `${path.replace(/[\\/]+$/, "")}/`;
    for (const item of [...this.values.keys()]) {
      if (item === path || item.startsWith(prefix)) this.values.delete(item);
    }
  }
}

function useMemoryVaultFiles(): MemoryVaultFiles {
  const vault = new MemoryVaultFiles();
  tauriInvokeMock.mockImplementation((command: string, args: Record<string, unknown>) => vault.invoke(command, args ?? {}));
  return vault;
}

afterEach(() => {
  tauriInvokeMock.mockReset();
  dialogOpenMock.mockReset();
  vi.unstubAllGlobals();
});

describe("vault serializer", () => {
  it("roundtrips persisted state areas through split vault files", () => {
    const state = defaultAppState();
    state.ui.activeSection = "combined_wealth";
    state.ui.settingsVaultExpanded = true;
    state.settings.interestRatePercent = 3.25;
    state.incomePlanning.habits[0] = { ...state.incomePlanning.habits[0], name: "Training" };
    state.selfEmployment.projects[0] = { ...state.selfEmployment.projects[0], name: "Vault-Projekt" };
    state.selfEmployment.projects[0].businessIdeaCanvas = {
      ...state.selfEmployment.projects[0].businessIdeaCanvas,
      nodes: [
        ...state.selfEmployment.projects[0].businessIdeaCanvas.nodes,
        { id: "group-1", type: "group", label: "Planung", x: -40, y: -40, width: 500, height: 260, color: "5" }
      ]
    };
    state.selfEmployment.projects[0].businessIdeaCanvasMeta = {
      ...state.selfEmployment.projects[0].businessIdeaCanvasMeta,
      palette: [...state.selfEmployment.projects[0].businessIdeaCanvasMeta.palette, { id: "custom", name: "Custom", color: "#123456" }],
      groupMeta: {
        "group-1": {
          nodeIds: [state.selfEmployment.projects[0].businessIdeaCanvas.nodes[0].id],
          name: "Planung",
          color: "5",
          status: "open"
        }
      }
    };
    state.positionTableView.savings.selectedLabels = ["tag"];

    state.selfEmployment.projects[0].gantt.cardPlans[0] = {
      ...state.selfEmployment.projects[0].gantt.cardPlans[0],
      timeBudgetHours: 4,
      todos: [{ id: "vault-todo", title: "Nur Sidecar", eisenhowerQuadrant: "important_not_urgent", status: "planned", completed: false }],
      completed: false
    };
    const serialized = serializeVaultState(state);
    const serializedCanvas = serialized.selfEmploymentCanvasFiles?.["planning/projects/vault-projekt/canvas-geschaeftsidee.canvas"];
    const projectFiles = serialized.selfEmploymentProjectFiles?.["vault-projekt"];
    const loaded = normalizeStoredState(deserializeVaultState(serialized));

    expect(loaded.ui.activeSection).toBe("combined_wealth");
    expect(loaded.ui.settingsVaultExpanded).toBe(true);
    expect(loaded.settings.interestRatePercent).toBe(3.25);
    expect(loaded.incomePlanning.habits[0].name).toBe("Training");
    expect(loaded.selfEmployment.projects[0].name).toBe("Vault-Projekt");
    expect(loaded.selfEmployment.projects[0].businessIdeaCanvasMeta.palette).toContainEqual({
      id: "custom",
      name: "Custom",
      color: "#123456"
    });
    expect(loaded.selfEmployment.projects[0].businessIdeaCanvasMeta.groupMeta["group-1"]).toMatchObject({
      nodeIds: [state.selfEmployment.projects[0].businessIdeaCanvas.nodes[0].id],
      name: "Planung",
      color: "5",
      status: "open"
    });
    expect(loaded.selfEmployment.projects[0].gantt.cardPlans[0]).toMatchObject({
      timeBudgetHours: 4,
      todos: [{ id: "vault-todo", title: "Nur Sidecar", eisenhowerQuadrant: "important_not_urgent", status: "planned", completed: false }]
    });
    expect(serializedCanvas).toBeDefined();
    expect(serialized.selfEmploymentState).toEqual({
      selectedProjectId: state.selfEmployment.selectedProjectId,
      selectedRoadmapAreaId: state.selfEmployment.selectedRoadmapAreaId
    });
    expect(projectFiles?.["project.json"]).toMatchObject({ name: "Vault-Projekt", status: "in_progress" });
    expect(projectFiles?.["cards.json"]).toBeDefined();
    expect(projectFiles?.["phases.json"]).toBeDefined();
    expect(projectFiles?.["labels.json"]).toBeDefined();
    expect(projectFiles?.["todos.json"]).toBeDefined();
    expect(projectFiles?.["time.json"]).toBeDefined();
    expect(projectFiles?.["modules.json"]).toBeDefined();
    expect(projectFiles?.["kanban.json"]).toBeDefined();
    expect(projectFiles?.["gantt.json"]).toBeDefined();
    expect(projectFiles?.["offers.json"]).toBeDefined();
    expect(projectFiles?.["invoices.json"]).toBeDefined();
    expect(projectFiles?.["contacts.json"]).toBeDefined();
    expect(JSON.stringify(serializedCanvas)).not.toContain("gantt");
    expect(JSON.stringify(serializedCanvas)).not.toContain("timeBudgetHours");
    expect(loaded.positionTableView.savings.selectedLabels).toEqual(["tag"]);
  });

  it("prefers external .canvas files over the embedded self employment fallback", () => {
    const state = defaultAppState();
    const project = state.selfEmployment.projects[0];
    const externalCanvas = {
      nodes: [{ id: "external-node", type: "text", text: "Aus Canvas-Datei", x: 0, y: 0, width: 240, height: 120 }],
      edges: []
    };

    const loaded = normalizeStoredState(
      deserializeVaultState({
        selfEmploymentState: state.selfEmployment,
        selfEmploymentCanvasFiles: {
          [project.businessIdeaCanvasFile]: externalCanvas
        }
      })
    );

    expect(loaded.selfEmployment.projects[0].businessIdeaCanvas.nodes[0]).toMatchObject({
      id: "external-node",
      text: "Aus Canvas-Datei"
    });
  });

  it("prefers external .canvas files after project file rehydration", () => {
    const state = stateWithPersistentSelfEmploymentProject();
    const serialized = serializeVaultState(state);
    const staleProjectCanvas = {
      nodes: [{ id: "stale-project-file-card", type: "text", text: "Aus project files", x: 0, y: 0, width: 240, height: 120 }],
      edges: []
    };
    const externalCanvas = {
      nodes: [{ id: "external-sidecar-card", type: "text", text: "Aus Canvas-Datei", x: 0, y: 0, width: 240, height: 120 }],
      edges: []
    };

    serialized.selfEmploymentProjectFiles = {
      ...serialized.selfEmploymentProjectFiles,
      "roundtrip-projekt": {
        ...serialized.selfEmploymentProjectFiles?.["roundtrip-projekt"],
        "canvas-geschaeftsidee.canvas": staleProjectCanvas
      }
    };
    serialized.selfEmploymentCanvasFiles = {
      "planning/projects/roundtrip-projekt/canvas-geschaeftsidee.canvas": externalCanvas
    };

    const loaded = normalizeStoredState(deserializeVaultState(serialized));

    expect(loaded.selfEmployment.projects[0].businessIdeaCanvas.nodes.map((node) => node.id)).toContain("external-sidecar-card");
    expect(loaded.selfEmployment.projects[0].businessIdeaCanvas.nodes.map((node) => node.id)).not.toContain("stale-project-file-card");
  });

  it("falls back to defaults for missing optional vault files", () => {
    const state = defaultAppState();
    const loaded = normalizeStoredState(
      deserializeVaultState({
        settingsBase: { ...state.settings, cashbackRatePercent: 2.5 },
        settingsTheme: { theme: "dark" }
      })
    );

    expect(loaded.theme).toBe("dark");
    expect(loaded.settings.cashbackRatePercent).toBe(2.5);
    expect(loaded.incomePlanning.habits.length).toBeGreaterThan(0);
    expect(loaded.selfEmployment.projects.length).toBeGreaterThan(0);
  });

  it("keeps vault persistence as structured JSON data instead of CSV payloads", () => {
    const files = serializeVaultState(defaultAppState());

    expect(typeof files.planningPositions).toBe("object");
    expect(typeof files.incomePlanning).toBe("object");
    expect(JSON.stringify(files.planningPositions)).not.toContain(";");
  });
});

describe("vault storage", () => {
  it("roundtrips self employment projects through wallet files and sidecar canvases", async () => {
    const vault = useMemoryVaultFiles();
    const rootPath = "/tmp/blobfin-vault";
    const state = stateWithPersistentSelfEmploymentProject();

    await writeVaultState(rootPath, state);
    replaceEmbeddedSelfEmploymentCanvasWithStaleData(vault, rootPath);

    const loaded = normalizeStoredState(await readVaultState(rootPath));
    const project = loaded.selfEmployment.projects.find((item) => item.id === state.selfEmployment.projects[0].id);
    const cardPlan = project?.gantt.cardPlans.find((plan) => plan.cardId === "vault-project-card");

    expect(project).toBeDefined();
    expect(loaded.selfEmployment.selectedProjectId).toBe(state.selfEmployment.projects[0].id);
    expect(loaded.selfEmployment.selectedRoadmapAreaId).toBe("planning");
    expect(project?.name).toBe("Roundtrip-Projekt");
    expect(project?.labels).toEqual(["Launch", "Kunde"]);
    expect(project?.milestones).toEqual(["Erster zahlender Kunde"]);
    expect(project?.projectGoal).toBe("Projekt im Dashboard behalten");
    expect(project?.businessIdeaCanvas.nodes.some((node) => node.id === "vault-project-card")).toBe(true);
    expect(project?.businessIdeaCanvasMeta.nodeMeta["vault-project-card"]).toEqual({
      labelId: "implementation",
      phaseId: "phase-4",
      shape: "diamond"
    });
    expect(project?.businessIdeaCanvasMeta.labels.find((label) => label.id === "implementation")?.color).toBe("6");
    expect(project?.gantt.phases.find((phase) => phase.phaseId === "phase-4")).toMatchObject({
      startMode: "after_previous_label",
      triggerPreviousPhaseId: "phase-3",
      triggerLabelId: "implementation"
    });
    expect(cardPlan).toMatchObject({
      timeBudgetHours: 6,
      todos: [
        {
          id: "todo-vault-card",
          title: "Angebotspaket pruefen",
          eisenhowerQuadrant: "important_urgent",
          status: "in_progress",
          completed: false
        }
      ]
    });
    expect(vault.readJson(joinVaultPath(profilePath(rootPath), "self-employment/state.json"))).toEqual({
      selectedProjectId: state.selfEmployment.selectedProjectId,
      selectedRoadmapAreaId: "planning"
    });
    expect(vault.readJson(joinVaultPath(profilePath(rootPath), "planning/projects/roundtrip-projekt/project.json"))).toMatchObject({
      id: "self-project-example",
      name: "Roundtrip-Projekt",
      businessIdeaCanvasFile: "planning/projects/roundtrip-projekt/canvas-geschaeftsidee.canvas",
      createdAt: expect.any(String),
      updatedAt: expect.any(String)
    });
    for (const fileName of [
      "canvas-geschaeftsidee.canvas",
      "cards.json",
      "phases.json",
      "labels.json",
      "todos.json",
      "time.json",
      "modules.json",
      "kanban.json",
      "gantt.json",
      "offers.json",
      "invoices.json",
      "contacts.json"
    ]) {
      expect(vault.has(joinVaultPath(profilePath(rootPath), "planning/projects/roundtrip-projekt", fileName))).toBe(true);
    }
  });

  it("loads an existing selected vault without overwriting project files", async () => {
    const vault = useMemoryVaultFiles();
    const storage = new MemoryStorage();
    const rootPath = "/tmp/blobfin-selected-vault";
    const localState = defaultAppState();
    localState.selfEmployment.projects[0] = {
      ...localState.selfEmployment.projects[0],
      name: "Lokaler Entwurf"
    };
    const vaultState = stateWithPersistentSelfEmploymentProject();
    const projectPath = joinVaultPath(profilePath(rootPath), "planning/projects/roundtrip-projekt/project.json");

    saveState(localState, storage);
    await writeVaultState(rootPath, vaultState);
    const projectFileBeforeSelect = vault.readText(projectPath);
    vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
    dialogOpenMock.mockResolvedValue(rootPath);

    const loaded = await selectVault(storage);

    expect(dialogOpenMock).toHaveBeenCalledWith({
      title: "Vault auswaehlen",
      directory: true,
      multiple: false,
      canCreateDirectories: true
    });
    expect(loaded?.selfEmployment.projects[0].name).toBe("Roundtrip-Projekt");
    expect(loaded?.selfEmployment.projects[0].businessIdeaCanvas.nodes.some((node) => node.id === "vault-project-card")).toBe(true);
    expect(vault.readText(projectPath)).toBe(projectFileBeforeSelect);
    expect(loadState(storage).selfEmployment.projects[0].name).toBe("Roundtrip-Projekt");
    expect(readVaultFallbackMetadata(storage)?.vaultRootPath).toBe(rootPath);
  });

  it("writes duplicate self employment project names into unique name folders", async () => {
    const vault = useMemoryVaultFiles();
    const rootPath = "/tmp/blobfin-duplicate-project-vault";
    const state = stateWithPersistentSelfEmploymentProject();
    const duplicateProject = {
      ...state.selfEmployment.projects[0],
      id: "second-project-id",
      name: state.selfEmployment.projects[0].name,
      businessIdeaCanvasFile: "planning/projects/second-project-id/canvas-geschaeftsidee.canvas"
    };
    state.selfEmployment.projects = [state.selfEmployment.projects[0], duplicateProject];

    await writeVaultState(rootPath, state);

    expect(vault.readJson(joinVaultPath(profilePath(rootPath), "planning/projects/roundtrip-projekt/project.json"))).toMatchObject({
      id: "self-project-example",
      name: "Roundtrip-Projekt"
    });
    expect(vault.readJson(joinVaultPath(profilePath(rootPath), "planning/projects/roundtrip-projekt-2/project.json"))).toMatchObject({
      id: "second-project-id",
      name: "Roundtrip-Projekt"
    });
    expect(vault.has(joinVaultPath(profilePath(rootPath), "planning/projects/self-project-example/project.json"))).toBe(false);
    expect(vault.has(joinVaultPath(profilePath(rootPath), "planning/projects/second-project-id/project.json"))).toBe(false);
  });

  it("removes deleted self employment project folders from the vault", async () => {
    const vault = useMemoryVaultFiles();
    const rootPath = "/tmp/blobfin-delete-vault";
    const state = stateWithPersistentSelfEmploymentProject();
    const secondProject = {
      ...state.selfEmployment.projects[0],
      id: "deleted-project",
      name: "Wird geloescht",
      businessIdeaCanvasFile: "planning/projects/deleted-project/canvas-geschaeftsidee.canvas"
    };
    const stateWithTwoProjects = {
      ...state,
      selfEmployment: {
        ...state.selfEmployment,
        projects: [...state.selfEmployment.projects, secondProject]
      }
    };

    await writeVaultState(rootPath, stateWithTwoProjects);
    expect(vault.has(joinVaultPath(profilePath(rootPath), "planning/projects/wird-geloescht/project.json"))).toBe(true);

    await writeVaultState(rootPath, state);
    expect(vault.has(joinVaultPath(profilePath(rootPath), "planning/projects/wird-geloescht/project.json"))).toBe(false);
    expect(vault.has(joinVaultPath(profilePath(rootPath), "planning/projects/wird-geloescht/canvas-geschaeftsidee.canvas"))).toBe(false);

    const loaded = normalizeStoredState(await readVaultState(rootPath));
    expect(loaded.selfEmployment.projects.map((project) => project.id)).toEqual(["self-project-example"]);
  });

  it("loads partial self employment project folders with safe defaults", async () => {
    const vault = useMemoryVaultFiles();
    const rootPath = "/tmp/blobfin-partial-project-vault";
    const manifest = createVaultManifest("2026-06-18T00:00:00.000Z");

    vault.writeJson(manifestPath(rootPath), manifest);
    vault.writeJson(joinVaultPath(profilePath(rootPath), manifest.dataFiles.selfEmploymentState), {
      selectedProjectId: "partial-project",
      selectedRoadmapAreaId: "planning"
    });
    vault.writeJson(joinVaultPath(profilePath(rootPath), "planning/projects/partial-project/project.json"), {
      id: "partial-project",
      name: "Teilprojekt",
      status: "open",
      projectType: "human_capital",
      priority: "medium"
    });

    const loaded = normalizeStoredState(await readVaultState(rootPath));
    const project = loaded.selfEmployment.projects[0];

    expect(project).toMatchObject({
      id: "partial-project",
      name: "Teilprojekt",
      status: "open",
      projectType: "human_capital"
    });
    expect(project.businessIdeaCanvas.nodes.length).toBeGreaterThan(0);
    expect(project.gantt.cardPlans.length).toBeGreaterThan(0);
    expect(project.enabledModules.metrics).toBe(true);
  });

  it("copies self employment project folders into vault snapshots", async () => {
    const vault = useMemoryVaultFiles();
    const rootPath = "/tmp/blobfin-snapshot-vault";
    const state = stateWithPersistentSelfEmploymentProject();

    await writeVaultState(rootPath, state);
    const snapshot = await createVaultSnapshot(rootPath);

    expect(vault.has(joinVaultPath(snapshot.backupPath, "planning/projects/roundtrip-projekt/project.json"))).toBe(true);
    expect(vault.has(joinVaultPath(snapshot.backupPath, "planning/projects/roundtrip-projekt/cards.json"))).toBe(true);
    expect(vault.has(joinVaultPath(snapshot.backupPath, "planning/projects/roundtrip-projekt/gantt.json"))).toBe(true);
    expect(vault.has(joinVaultPath(snapshot.backupPath, "planning/projects/roundtrip-projekt/invoices.json"))).toBe(true);
  });

  it("merges self employment sidecar canvases into raw vault state before normalization", async () => {
    const vault = useMemoryVaultFiles();
    const rootPath = "/tmp/blobfin-sidecar-vault";
    const state = stateWithPersistentSelfEmploymentProject();
    const project = state.selfEmployment.projects[0];
    const manifest = createVaultManifest("2026-06-18T00:00:00.000Z");
    const staleSelfEmployment = {
      ...state.selfEmployment,
      projects: state.selfEmployment.projects.map((item) => ({
        ...item,
        businessIdeaCanvas: {
          nodes: [
            {
              id: "embedded-stale-card",
              type: "text",
              text: "Veraltete eingebettete Karte",
              x: 0,
              y: 0,
              width: 160,
              height: 80
            }
          ],
          edges: []
        }
      }))
    };

    vault.writeJson(manifestPath(rootPath), manifest);
    vault.writeJson(joinVaultPath(profilePath(rootPath), manifest.dataFiles.selfEmploymentState), staleSelfEmployment);
    vault.writeJson(joinVaultPath(profilePath(rootPath), project.businessIdeaCanvasFile), project.businessIdeaCanvas);

    const result = await readVault(rootPath);
    const selfEmploymentState = result.dataFiles.selfEmploymentState as typeof state.selfEmployment;
    const mergedProject = selfEmploymentState.projects[0];

    expect(mergedProject.businessIdeaCanvas.nodes.some((node) => node.id === "vault-project-card")).toBe(true);
    expect(mergedProject.businessIdeaCanvas.nodes.some((node) => node.id === "embedded-stale-card")).toBe(false);

    const loaded = normalizeStoredState(await readVaultState(rootPath));
    expect(loaded.selfEmployment.projects[0].gantt.cardPlans.some((plan) => plan.cardId === "vault-project-card")).toBe(true);
  });

  it("recovers orphaned self employment canvas folders from planning projects", async () => {
    const vault = useMemoryVaultFiles();
    const rootPath = "/tmp/blobfin-orphaned-vault";
    const state = defaultAppState();
    const manifest = createVaultManifest("2026-06-18T00:00:00.000Z");
    const firstOrphanCanvas = {
      nodes: [
        { id: "0ef758b8-c185-4755-a14c-efa1778a0f5b-idea", type: "text", text: "Neue Geschaeftsidee", x: 0, y: 0, width: 240, height: 110 }
      ],
      edges: []
    };
    const secondOrphanCanvas = {
      nodes: [
        { id: "16f7ff8d-0885-42c5-bec4-92c6a9657625", type: "text", text: "IUFS", x: 0, y: 0, width: 240, height: 110 },
        { id: "1430e520-d8f8-4f04-b943-48624fab20d6", type: "text", text: "Semester 1", x: 260, y: 0, width: 240, height: 110 }
      ],
      edges: []
    };

    vault.writeJson(manifestPath(rootPath), manifest);
    vault.writeJson(joinVaultPath(profilePath(rootPath), manifest.dataFiles.selfEmploymentState), state.selfEmployment);
    vault.writeJson(
      joinVaultPath(profilePath(rootPath), "planning/projects/0ef758b8-c185-4755-a14c-efa1778a0f5b/canvas-geschaeftsidee.canvas"),
      firstOrphanCanvas
    );
    vault.writeJson(
      joinVaultPath(profilePath(rootPath), "planning/projects/8b304256-7dcd-4ee7-8722-bfd97ed5ebd8/canvas-geschaeftsidee.canvas"),
      secondOrphanCanvas
    );

    const loaded = normalizeStoredState(await readVaultState(rootPath));
    const projectIds = loaded.selfEmployment.projects.map((project) => project.id);
    const recoveredStudyProject = loaded.selfEmployment.projects.find((project) => project.id === "8b304256-7dcd-4ee7-8722-bfd97ed5ebd8");

    expect(projectIds).toEqual([
      "self-project-example",
      "0ef758b8-c185-4755-a14c-efa1778a0f5b",
      "8b304256-7dcd-4ee7-8722-bfd97ed5ebd8"
    ]);
    expect(recoveredStudyProject).toMatchObject({
      name: "IUFS",
      status: "open",
      labels: [],
      milestones: [],
      businessIdeaCanvasFile: "planning/projects/8b304256-7dcd-4ee7-8722-bfd97ed5ebd8/canvas-geschaeftsidee.canvas"
    });
    expect(recoveredStudyProject?.businessIdeaCanvas.nodes.map((node) => node.id)).toEqual([
      "16f7ff8d-0885-42c5-bec4-92c6a9657625",
      "1430e520-d8f8-4f04-b943-48624fab20d6"
    ]);
    expect(recoveredStudyProject?.gantt.cardPlans.map((plan) => plan.cardId)).toEqual([
      "16f7ff8d-0885-42c5-bec4-92c6a9657625",
      "1430e520-d8f8-4f04-b943-48624fab20d6"
    ]);
  });
});

function stateWithPersistentSelfEmploymentProject(): ReturnType<typeof defaultAppState> {
  const state = defaultAppState();
  const project = state.selfEmployment.projects[0];
  const card = {
    id: "vault-project-card",
    type: "text" as const,
    text: "Projektkarte bleibt sichtbar",
    x: 720,
    y: 220,
    width: 280,
    height: 120,
    color: "4"
  };
  const projectWithPlanning = {
    ...project,
    name: "Roundtrip-Projekt",
    labels: ["Launch", "Kunde"],
    projectGoal: "Projekt im Dashboard behalten",
    milestones: ["Erster zahlender Kunde"],
    businessIdeaCanvas: {
      ...project.businessIdeaCanvas,
      nodes: [...project.businessIdeaCanvas.nodes, card]
    },
    businessIdeaCanvasMeta: {
      ...project.businessIdeaCanvasMeta,
      labels: project.businessIdeaCanvasMeta.labels.map((label) =>
        label.id === "implementation" ? { ...label, color: "6" } : label
      ),
      activeLabelId: "implementation",
      activePhaseId: "phase-4",
      nodeMeta: {
        ...project.businessIdeaCanvasMeta.nodeMeta,
        [card.id]: {
          labelId: "implementation",
          phaseId: "phase-4",
          shape: "diamond" as const
        }
      }
    },
    gantt: {
      ...project.gantt,
      phases: project.gantt.phases.map((phase) =>
        phase.phaseId === "phase-4"
          ? {
              ...phase,
              startMode: "after_previous_label" as const,
              triggerPreviousPhaseId: "phase-3",
              triggerLabelId: "implementation"
            }
          : phase
      ),
      cardPlans: [
        ...project.gantt.cardPlans,
        {
          cardId: card.id,
          timeBudgetHours: 6,
          completed: false,
          todos: [
            {
              id: "todo-vault-card",
              title: "Angebotspaket pruefen",
              eisenhowerQuadrant: "important_urgent" as const,
              status: "in_progress" as const,
              completed: false
            }
          ]
        }
      ]
    },
    ganttPhaseFilterIds: ["phase-4"]
  };

  return {
    ...state,
    selfEmployment: {
      ...state.selfEmployment,
      selectedProjectId: project.id,
      selectedRoadmapAreaId: "planning",
      projects: [projectWithPlanning]
    }
  };
}

function replaceEmbeddedSelfEmploymentCanvasWithStaleData(vault: MemoryVaultFiles, rootPath: string): void {
  const path = joinVaultPath(profilePath(rootPath), "self-employment/state.json");
  const selfEmploymentState = vault.readJson(path) as ReturnType<typeof defaultAppState>["selfEmployment"];
  if (!Array.isArray(selfEmploymentState.projects)) return;
  vault.writeJson(path, {
    ...selfEmploymentState,
    projects: selfEmploymentState.projects.map((project) => ({
      ...project,
      businessIdeaCanvas: {
        nodes: [
          {
            id: "embedded-stale-card",
            type: "text",
            text: "Veraltete eingebettete Karte",
            x: 0,
            y: 0,
            width: 160,
            height: 80
          }
        ],
        edges: []
      }
    }))
  });
}

describe("vault manifest", () => {
  it("creates a BlobFin vault manifest with versioned data file paths", () => {
    const manifest = createVaultManifest("2026-06-13T00:00:00.000Z");

    expect(manifest.app).toBe("BlobFin");
    expect(manifest.vaultVersion).toBe(1);
    expect(manifest.profileFolder).toBe(".profil");
    expect(manifest.dataFiles.settingsBase).toBe("settings/base.json");
    expect(manifest.dataFiles.selfEmploymentState).toBe("self-employment/state.json");
  });

  it("rejects unsupported newer vault versions without crashing callers", () => {
    const manifest = createVaultManifest();

    expect(() => parseVaultManifest({ ...manifest, vaultVersion: 99 })).toThrow(/Vault-Version 99/);
  });
});

describe("vault fallback", () => {
  it("stores the active vault path as local fallback metadata", () => {
    const storage = new MemoryStorage();

    saveVaultFallbackMetadata("/tmp/blobfin-vault", storage);

    expect(readVaultFallbackMetadata(storage)?.vaultRootPath).toBe("/tmp/blobfin-vault");
  });

  it("uses csv-only mode when no Tauri runtime is available", async () => {
    const storage = new MemoryStorage();
    const state = await initializeStorage(storage);

    expect(state.ui.activeSection).toBe("home");
    expect(getVaultStatus().status).toBe("csvOnly");
  });

  it("keeps LocalStorage persistence available without a vault", () => {
    const storage = new MemoryStorage();
    const state = defaultAppState();
    state.ui.settingsVaultExpanded = true;

    saveState(state, storage);

    expect(storage.getItem(STORAGE_KEY)).toBeTruthy();
    expect(loadState(storage).ui.settingsVaultExpanded).toBe(true);
  });
});
