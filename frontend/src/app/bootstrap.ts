import type { AppContext } from "./contracts";
import { startAppController } from "./appController";
import { featureModules } from "../features";
import { createAppRouter } from "./router";
import { createRenderScheduler } from "./renderScheduler";
import { createAppStore } from "./store/appStore";

export async function bootstrapApp(rootSelector = "#app"): Promise<AppContext> {
  const root = requireRootElement(rootSelector);
  const store = createAppStore();
  const router = createAppRouter();
  const scheduler = createRenderScheduler(() => undefined);
  const context: AppContext = {
    root,
    store,
    router,
    scheduler
  };

  for (const feature of featureModules) {
    await feature.mount?.(context);
  }
  await startAppController(context, featureModules);
  return context;
}

function requireRootElement(rootSelector: string): HTMLDivElement {
  const element = document.querySelector<HTMLDivElement>(rootSelector);
  if (!element) {
    throw new Error(`Application root ${rootSelector} is missing.`);
  }
  return element;
}
