import type { AppContext, FeatureModule } from "./contracts";

export interface AppEventHandlers {
  onInput?(event: Event, context: AppContext): boolean | void;
  onChange?(event: Event, context: AppContext): boolean | void;
  onClick?(event: MouseEvent, context: AppContext): boolean | void;
  onDragStart?(event: DragEvent, context: AppContext): boolean | void;
  onDragOver?(event: DragEvent, context: AppContext): boolean | void;
  onDragLeave?(event: DragEvent, context: AppContext): boolean | void;
  onDrop?(event: DragEvent, context: AppContext): boolean | void;
  onDragEnd?(event: DragEvent, context: AppContext): boolean | void;
  onDblClick?(event: MouseEvent, context: AppContext): boolean | void;
  onContextMenu?(event: MouseEvent, context: AppContext): boolean | void;
  onPointerDown?(event: PointerEvent, context: AppContext): boolean | void;
  onFocusOut?(event: FocusEvent, context: AppContext): boolean | void;
  onWheel?(event: WheelEvent, context: AppContext): boolean | void;
  onWindowPointerMove?(event: PointerEvent, context: AppContext): boolean | void;
  onWindowPointerUp?(event: PointerEvent, context: AppContext): boolean | void;
  onWindowKeyDown?(event: KeyboardEvent, context: AppContext): boolean | void;
  onWindowKeyUp?(event: KeyboardEvent, context: AppContext): boolean | void;
}

export function bindAppEvents(
  context: AppContext,
  features: readonly FeatureModule[],
  hostHandlers: AppEventHandlers = {}
): () => void {
  const disposers: Array<() => void> = [];

  bindRoot("input", "onInput");
  bindRoot("change", "onChange");
  bindRoot("click", "onClick");
  bindRoot("dragstart", "onDragStart");
  bindRoot("dragover", "onDragOver");
  bindRoot("dragleave", "onDragLeave");
  bindRoot("drop", "onDrop");
  bindRoot("dragend", "onDragEnd");
  bindRoot("dblclick", "onDblClick");
  bindRoot("contextmenu", "onContextMenu");
  bindRoot("pointerdown", "onPointerDown");
  bindRoot("focusout", "onFocusOut");
  bindRoot("wheel", "onWheel", { passive: false });
  bindWindow("pointermove", "onWindowPointerMove");
  bindWindow("pointerup", "onWindowPointerUp");
  bindWindow("keydown", "onWindowKeyDown");
  bindWindow("keyup", "onWindowKeyUp");

  return () => {
    for (const dispose of disposers.splice(0)) {
      dispose();
    }
  };

  function bindRoot<K extends keyof AppEventHandlers>(
    type: string,
    hook: K,
    options?: AddEventListenerOptions
  ): void {
    const listener = (event: Event): void => {
      if (dispatchFeatureEvent(hook, event)) return;
      const handler = hostHandlers[hook] as ((event: Event, context: AppContext) => boolean | void) | undefined;
      handler?.(event, context);
    };
    context.root.addEventListener(type, listener, options);
    disposers.push(() => context.root.removeEventListener(type, listener, options));
  }

  function bindWindow<K extends keyof AppEventHandlers>(
    type: string,
    hook: K,
    options?: AddEventListenerOptions
  ): void {
    const listener = (event: Event): void => {
      if (dispatchFeatureEvent(hook, event)) return;
      const handler = hostHandlers[hook] as ((event: Event, context: AppContext) => boolean | void) | undefined;
      handler?.(event, context);
    };
    window.addEventListener(type, listener, options);
    disposers.push(() => window.removeEventListener(type, listener, options));
  }

  function dispatchFeatureEvent<K extends keyof AppEventHandlers>(hook: K, event: Event): boolean {
    for (const feature of features) {
      const handler = feature[hook] as ((event: Event, context: AppContext) => boolean | void) | undefined;
      if (handler?.(event, context) === true) return true;
    }
    return false;
  }
}
