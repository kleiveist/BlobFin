/// <reference types="vite/client" />

import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import mainSource from "../main.ts?raw";
import { defaultAppState } from "../data/defaults";
import { bindAppEvents } from "../app/events";
import { appSectionIdFromValue, createAppRouter, sectionFromLocationHash } from "../app/router";
import { createRenderScheduler, DEFAULT_RENDER_DEBOUNCE_MS } from "../app/renderScheduler";
import { createAppStore } from "../app/store/appStore";
import { featureModules } from "../features";
import type { AppState } from "../types";

const stylesIndexSource = readFileSync(new URL("../styles/index.css", import.meta.url), "utf8");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("app shell", () => {
  it("keeps main.ts as a bootstrap-only entry point", () => {
    expect(mainSource.split("\n").length).toBeLessThanOrEqual(50);
    expect(mainSource).toContain('import("./styles/index.css")');
    expect(mainSource).toContain('import("./app/bootstrap")');
    expect(mainSource).toContain('bootstrapApp("#app")');
    expect(mainSource).toContain("BlobFin bootstrap failed.");
    expect(mainSource).not.toContain("function bindEvents");
    expect(mainSource).not.toContain("function renderAll");
  });

  it("uses the split stylesheet entrypoint", () => {
    expect(stylesIndexSource).toContain('@import "./tokens.css" layer(tokens);');
    expect(stylesIndexSource).toContain('@import "./components/fields.css" layer(components);');
    expect(stylesIndexSource).toContain('@import "../features/income-stamp-planner/styles.css" layer(features);');
    expect(stylesIndexSource).toContain('@import "../features/self-employment/business-canvas/styles.css" layer(features);');
    expect(stylesIndexSource).not.toContain("legacy");
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
      "business-canvas",
      "real-estate",
      "statutory-pension",
      "combined-wealth"
    ]);
    expect(featureModules.flatMap((feature) => feature.sections ?? [])).toContain("combined_wealth");
  });

  it("dispatches feature events before host handlers and keeps wheel non-passive", () => {
    vi.stubGlobal("window", createWindowStub());

    const calls: string[] = [];
    const listeners = new Map<string, { listener: EventListener; options?: AddEventListenerOptions }>();
    const root = {
      addEventListener: (type: string, listener: EventListener, options?: AddEventListenerOptions) => {
        listeners.set(type, { listener, options });
      },
      removeEventListener: () => undefined
    } as unknown as HTMLDivElement;
    const context = {
      root,
      store: createAppStore(defaultAppState()),
      router: createAppRouter(createRouterWindowStub()),
      scheduler: createRenderScheduler(() => undefined)
    };

    const dispose = bindAppEvents(
      context,
      [
        {
          id: "first",
          onClick: () => {
            calls.push("feature:first");
            return true;
          },
          onWindowKeyDown: () => {
            calls.push("window:first");
            return true;
          }
        },
        {
          id: "second",
          onClick: () => {
            calls.push("feature:second");
          }
        }
      ],
      {
        onClick: () => {
          calls.push("host");
        },
        onWindowKeyDown: () => {
          calls.push("window:host");
        }
      }
    );

    listeners.get("click")?.listener(new Event("click"));
    window.dispatchEvent(new Event("keydown"));

    expect(calls).toEqual(["feature:first", "window:first"]);
    expect(listeners.get("wheel")?.options).toMatchObject({ passive: false });
    dispose();
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

function createWindowStub(): Window {
  const target = new EventTarget();
  return {
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target)
  } as Window;
}

function createRouterWindowStub() {
  return {
    location: { hash: "", pathname: "/", search: "" },
    history: {
      pushState: () => undefined,
      replaceState: () => undefined
    },
    addEventListener: () => undefined,
    removeEventListener: () => undefined
  };
}
