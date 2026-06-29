/// <reference types="vite/client" />

import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import mainSource from "../main.ts?raw";
import { defaultAppState } from "../data/defaults";
import { bindAppEvents } from "../app/events";
import { appSectionIdFromValue, createAppRouter, sectionFromLocationHash } from "../app/router";
import { createRenderScheduler, DEFAULT_RENDER_DEBOUNCE_MS } from "../app/renderScheduler";
import { createAppStore } from "../app/store/appStore";
import { configureRouteRuntime } from "../features/runtime-host/routeRuntime";
import { runtimeApi, runtimeHost } from "../features/runtime-host/hostContext";
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
    expect(appSectionIdFromValue("income_stamp_planner")).toBe("income_planning");
    expect(appSectionIdFromValue("project_dashboard")).toBe("project_dashboard");
    expect(appSectionIdFromValue("self_employment")).toBe("project_dashboard");
    expect(appSectionIdFromValue("self_employment_dashboard")).toBe("project_dashboard");
    expect(appSectionIdFromValue("self_employment_overview")).toBe("self_employment_overview");
    expect(appSectionIdFromValue("business_foundation_dashboard")).toBe("business_foundation_dashboard");
    expect(appSectionIdFromValue("year_table")).toBe("planning_scenarios");
    expect(appSectionIdFromValue("investment_overview")).toBe("planning_scenarios");
    expect(appSectionIdFromValue("unknown")).toBeNull();
    expect(sectionFromLocationHash("#income_charts")).toBe("income");
    expect(sectionFromLocationHash("#income_stamp_planner")).toBe("income_planning");
    expect(sectionFromLocationHash("#self_employment_dashboard")).toBe("project_dashboard");
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
      "self-employment",
      "business-canvas",
      "real-estate",
      "statutory-pension",
      "combined-wealth"
    ]);
    expect(featureModules.flatMap((feature) => feature.sections ?? [])).toContain("combined_wealth");
    expect(featureModules.flatMap((feature) => feature.sections ?? [])).toContain("project_dashboard");
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

  it("disables the global home return button only on the landing page", () => {
    const initialState = runtimeHost.state;
    const attributes = new Map<string, string>();
    const homeReturnButton = {
      disabled: false,
      setAttribute: (name: string, value: string) => attributes.set(name, value)
    } as unknown as HTMLButtonElement;
    const sectionButton = {
      dataset: { sectionId: "income" },
      classList: { toggle: vi.fn() },
      setAttribute: vi.fn()
    } as unknown as HTMLButtonElement;
    const homeSection = { dataset: { moduleSection: "home" }, hidden: false } as unknown as HTMLElement;
    const incomeSection = { dataset: { moduleSection: "income" }, hidden: true } as unknown as HTMLElement;

    vi.stubGlobal("document", {
      querySelectorAll: (selector: string) => {
        if (selector === "button[data-home-return-button]") return [homeReturnButton];
        if (selector === "button[data-section-id]") return [sectionButton];
        if (selector === "[data-module-section]") return [homeSection, incomeSection];
        return [];
      }
    });

    configureRouteRuntime();
    runtimeHost.state = { ...defaultAppState(), ui: { ...defaultAppState().ui, activeSection: "home" } };
    runtimeApi.updateModuleVisibility();

    expect(homeReturnButton.disabled).toBe(true);
    expect(attributes.get("aria-disabled")).toBe("true");

    runtimeHost.state = { ...defaultAppState(), ui: { ...defaultAppState().ui, activeSection: "income" } };
    runtimeApi.updateModuleVisibility();

    expect(homeReturnButton.disabled).toBe(false);
    expect(attributes.get("aria-disabled")).toBe("false");
    runtimeHost.state = initialState;
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
