import type { AppContext, FeatureModule } from "./contracts";
import { startAppController as startRuntimeFeatureHost } from "../features/runtime-host";

export async function startAppController(context: AppContext, features: readonly FeatureModule[]): Promise<void> {
  await startRuntimeFeatureHost(context, features);
}
