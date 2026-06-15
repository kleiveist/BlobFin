import type { RenderScheduler } from "./contracts";

export const DEFAULT_RENDER_DEBOUNCE_MS = 40;

interface RenderTimerApi {
  setTimeout(handler: () => void, timeout: number): number;
  clearTimeout(handle: number): void;
}

const defaultTimerApi: RenderTimerApi = {
  setTimeout: (handler, timeout) => globalThis.setTimeout(handler, timeout) as unknown as number,
  clearTimeout: (handle) => globalThis.clearTimeout(handle)
};

export function createRenderScheduler(
  render: () => void,
  delayMs = DEFAULT_RENDER_DEBOUNCE_MS,
  timerApi: RenderTimerApi = defaultTimerApi
): RenderScheduler {
  let pendingTimer: number | null = null;
  let running = false;

  const cancel = (): void => {
    if (pendingTimer === null) return;
    timerApi.clearTimeout(pendingTimer);
    pendingTimer = null;
  };

  const flush = (): void => {
    if (running) {
      request();
      return;
    }
    cancel();
    running = true;
    try {
      render();
    } finally {
      running = false;
    }
  };

  const request = (): void => {
    cancel();
    pendingTimer = timerApi.setTimeout(() => {
      pendingTimer = null;
      flush();
    }, delayMs);
  };

  return {
    request,
    flush,
    cancel,
    isPending: () => pendingTimer !== null
  };
}
