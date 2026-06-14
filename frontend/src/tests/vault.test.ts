import { describe, expect, it } from "vitest";

import { defaultAppState } from "../data/defaults";
import { getVaultStatus, initializeStorage, loadState, normalizeStoredState, saveState } from "../lib/storage";
import { readVaultFallbackMetadata, saveVaultFallbackMetadata } from "../lib/vault/vaultFallback";
import { createVaultManifest, parseVaultManifest } from "../lib/vault/vaultManifest";
import { deserializeVaultState, serializeVaultState } from "../lib/vault/vaultSerializer";

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

    const loaded = normalizeStoredState(deserializeVaultState(serializeVaultState(state)));

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
