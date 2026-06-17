import type { AppRouteListener, AppRouter } from "./contracts";
import type { AppSectionId } from "../types";

const APP_SECTION_IDS: readonly AppSectionId[] = [
  "home",
  "income",
  "income_planning",
  "self_employment_dashboard",
  "planning_scenarios",
  "real_estate_financing",
  "statutory_pension",
  "combined_wealth"
];

const ROUTE_SECTION_ALIASES: Readonly<Record<string, AppSectionId>> = {
  income_tracking: "income",
  income_status: "income",
  income_charts: "income",
  income_overview: "income",
  income_stamp_planner: "income_planning",
  cost_reserve_positions: "planning_scenarios",
  year_table: "planning_scenarios",
  investment_planning: "planning_scenarios",
  investment_overview: "planning_scenarios"
};

interface RouterWindow {
  location: Pick<Location, "hash" | "pathname" | "search">;
  history: Pick<History, "pushState" | "replaceState">;
  addEventListener(type: "popstate", listener: () => void): void;
  removeEventListener(type: "popstate", listener: () => void): void;
}

export function appSectionIdFromValue(value: unknown): AppSectionId | null {
  if (typeof value !== "string") return null;
  return ROUTE_SECTION_ALIASES[value] ?? (APP_SECTION_IDS.includes(value as AppSectionId) ? (value as AppSectionId) : null);
}

export function createAppRouter(routerWindow: RouterWindow = window): AppRouter {
  const listeners = new Set<AppRouteListener>();
  const notifyListeners = (): void => {
    const section = sectionFromLocationHash(routerWindow.location.hash);
    for (const listener of listeners) {
      listener(section);
    }
  };
  const popStateListener = (): void => notifyListeners();

  return {
    sectionFromValue: appSectionIdFromValue,
    currentSection: () => sectionFromLocationHash(routerWindow.location.hash),
    pushSection: (section) => pushSectionHistory(routerWindow, section),
    replaceSection: (section) => replaceSectionHistory(routerWindow, section),
    subscribe: (listener) => {
      if (!listeners.size) {
        routerWindow.addEventListener("popstate", popStateListener);
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (!listeners.size) {
          routerWindow.removeEventListener("popstate", popStateListener);
        }
      };
    }
  };
}

export function sectionFromLocationHash(hash: string): AppSectionId | null {
  const normalizedHash = hash.replace(/^#/, "");
  if (!normalizedHash) return null;
  return appSectionIdFromValue(decodeURIComponent(normalizedHash));
}

function pushSectionHistory(routerWindow: RouterWindow, section: AppSectionId): void {
  const hash = `#${encodeURIComponent(section)}`;
  if (routerWindow.location.hash === hash) return;
  routerWindow.history.pushState({ activeSection: section }, "", sectionUrl(routerWindow, section));
}

function replaceSectionHistory(routerWindow: RouterWindow, section: AppSectionId): void {
  routerWindow.history.replaceState({ activeSection: section }, "", sectionUrl(routerWindow, section));
}

function sectionUrl(routerWindow: RouterWindow, section: AppSectionId): string {
  return `${routerWindow.location.pathname}${routerWindow.location.search}#${encodeURIComponent(section)}`;
}
