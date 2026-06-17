import type { AppSectionId, AppState } from "../types";

export interface AppStore {
  getState(): AppState;
  replaceState(nextState: AppState, options?: AppStoreWriteOptions): void;
  update(updater: (currentState: AppState) => AppState, options?: AppStoreWriteOptions): void;
  subscribe(listener: AppStateListener): () => void;
  persistNow(): void;
}

export interface AppStoreWriteOptions {
  notify?: boolean;
  persist?: boolean;
}

export type AppStateListener = (state: AppState, previousState: AppState) => void;

export interface AppRouter {
  sectionFromValue(value: unknown): AppSectionId | null;
  currentSection(): AppSectionId | null;
  pushSection(section: AppSectionId): void;
  replaceSection(section: AppSectionId): void;
  subscribe(listener: AppRouteListener): () => void;
}

export type AppRouteListener = (section: AppSectionId | null) => void;

export interface RenderScheduler {
  request(): void;
  flush(): void;
  cancel(): void;
  isPending(): boolean;
}

export interface AppContext {
  root: HTMLDivElement;
  store: AppStore;
  router: AppRouter;
  scheduler: RenderScheduler;
}

export interface FeatureModule {
  id: string;
  sections?: readonly AppSectionId[];
  mount?(context: AppContext): void | Promise<void>;
  render?(context: AppContext): void;
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
  closeOverlays?(context: AppContext): void;
  dispose?(context: AppContext): void;
}
