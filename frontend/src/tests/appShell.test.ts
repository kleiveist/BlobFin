/// <reference types="vite/client" />

import { describe, expect, it } from "vitest";

import mainSource from "../main.ts?raw";
import { defaultAppState } from "../data/defaults";
import { appSectionIdFromValue, createAppRouter, sectionFromLocationHash } from "../app/router";
import { createRenderScheduler, DEFAULT_RENDER_DEBOUNCE_MS } from "../app/renderScheduler";
import { createAppStore } from "../app/store/appStore";
import { featureModules } from "../features";
import type { AppState } from "../types";

describe("app shell", () => {
  it("keeps main.ts as a bootstrap-only entry point", () => {
    expect(mainSource).toContain('import "./styles.css";');
    expect(mainSource).toContain('import { bootstrapApp } from "./app/bootstrap";');
    expect(mainSource).toContain('void bootstrapApp("#app");');
    expect(mainSource).not.toContain("function bindEvents");
    expect(mainSource).not.toContain("function renderAll");
  });

  it("normalizes current route section ids and aliases", () => {
    expect(appSectionIdFromValue("income")).toBe("income");
    expect(appSectionIdFromValue("income_tracking")).toBe("income");
    expect(appSectionIdFromValue("year_table")).toBe("planning_scenarios");
    expect(appSectionIdFromValue("investment_overview")).toBe("planning_scenarios");
    expect(appSectionIdFromValue("unknown")).toBeNull();
    expect(sectionFromLocationHash("#income_charts")).toBe("income");
    expect(sectionFromLocationHash("#real_estate_financing")).toBe("real_estate_financing");
    expect(sectionFromLocationHash("")).toBeNull();
  });

  it("registers feature-sliced module entrypoints", () => {
    expect(featureModules.map((feature) => feature.id)).toEqual([
      "settings",
      "planning",
      "positions",
      "investment",
      "income-tracker",
      "income-planning",
      "income-stamp-planner",
      "self-employment",
      "real-estate",
      "statutory-pension",
      "combined-wealth"
    ]);
    expect(featureModules.flatMap((feature) => feature.sections ?? [])).toContain("combined_wealth");
  });

  it("pushes and replaces section history through the app router", () => {
    const pushedUrls: string[] = [];
    const replacedUrls: string[] = [];
    const listeners = new Set<() => void>();
    const location = { hash: "", pathname: "/planner", search: "?profile=default" };
    const routerWindow = {
      location,
      history: {
        pushState: (_state: unknown, _title: string, url?: string | URL | null) => {
          pushedUrls.push(String(url));
          location.hash = String(url).replace(/^.*#/, "#");
        },
        replaceState: (_state: unknown, _title: string, url?: string | URL | null) => {
          replacedUrls.push(String(url));
          location.hash = String(url).replace(/^.*#/, "#");
        }
      },
      addEventListener: (_type: "popstate", listener: () => void) => {
        listeners.add(listener);
      },
      removeEventListener: (_type: "popstate", listener: () => void) => {
        listeners.delete(listener);
      }
    };
    const router = createAppRouter(routerWindow);

    router.pushSection("income");
    router.replaceSection("combined_wealth");

    expect(pushedUrls).toEqual(["/planner?profile=default#income"]);
    expect(replacedUrls).toEqual(["/planner?profile=default#combined_wealth"]);
    expect(router.currentSection()).toBe("combined_wealth");
  });

  it("debounces and flushes full renders", () => {
    let renderCount = 0;
    let pendingHandler: (() => void) | null = null;
    let clearedHandle: number | null = null;
    const scheduler = createRenderScheduler(
      () => {
        renderCount += 1;
      },
      DEFAULT_RENDER_DEBOUNCE_MS,
      {
        setTimeout: (handler, timeout) => {
          expect(timeout).toBe(DEFAULT_RENDER_DEBOUNCE_MS);
          pendingHandler = handler;
          return 1;
        },
        clearTimeout: (handle) => {
          clearedHandle = handle;
          pendingHandler = null;
        }
      }
    );
    const firePendingHandler = (): void => {
      const handler = pendingHandler;
      if (!handler) throw new Error("Expected a pending render handler.");
      handler();
    };

    scheduler.request();
    expect(scheduler.isPending()).toBe(true);
    scheduler.request();
    expect(clearedHandle).toBe(1);
    firePendingHandler();

    expect(renderCount).toBe(1);
    expect(scheduler.isPending()).toBe(false);
  });

  it("updates, notifies, and persists through AppStore", () => {
    const initialState = defaultAppState();
    const persistedStates: AppState[] = [];
    const store = createAppStore(initialState, (state) => persistedStates.push(state));
    const observedThemes: string[] = [];
    const unsubscribe = store.subscribe((state) => observedThemes.push(state.theme));

    store.replaceState({ ...initialState, theme: "dark" }, { persist: true });
    store.update((state) => ({ ...state, theme: "light" }), { notify: false });
    store.persistNow();
    unsubscribe();
    store.replaceState({ ...store.getState(), theme: "dark" });

    expect(store.getState().theme).toBe("dark");
    expect(observedThemes).toEqual(["dark"]);
    expect(persistedStates.map((state) => state.theme)).toEqual(["dark", "light"]);
  });
});
