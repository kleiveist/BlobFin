import { renderAppShell } from "../views/templates";

export function renderShell(root: HTMLElement): void {
  root.innerHTML = renderAppShell();
}
