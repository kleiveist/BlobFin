export function isTauriRuntime(): boolean {
  return Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

export function csvFileContents(text: string): string {
  const content = text.endsWith("\n") ? text : `${text}\n`;
  return `\uFEFF${content}`;
}

export function ensureCsvExtension(path: string): string {
  return path.toLowerCase().endsWith(".csv") ? path : `${path}.csv`;
}

export function downloadText(filename: string, contents: string, type = "text/csv;charset=utf-8"): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

export function formControl(target: EventTarget | null): HTMLInputElement | HTMLSelectElement | null {
  if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) return target;
  return null;
}

export function isDeferredModelInput(target: HTMLInputElement | HTMLSelectElement): boolean {
  return target instanceof HTMLInputElement && (target.type === "number" || target.type === "date");
}

export function setText(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

export function setRangeLabel(key: string, value: string): void {
  setText(`${key}Value`, value);
}

export function setInputValue(selector: string, value: number | string | string[]): void {
  for (const input of document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(selector)) {
    if (input === document.activeElement && isDeferredModelInput(input)) continue;
    input.value = String(value);
  }
}

export function setInputBounds(selector: string, min: number, max: number): void {
  const input = document.querySelector<HTMLInputElement>(selector);
  if (!input) return;
  input.min = String(min);
  input.max = String(max);
}

export function cssEscape(value: string): string {
  const css = (globalThis as typeof globalThis & { CSS?: { escape?: (input: string) => string } }).CSS;
  return typeof css?.escape === "function" ? css.escape(value) : value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

export function setSectionHidden(selector: string, hidden: boolean): void {
  const element = document.querySelector<HTMLElement>(selector);
  if (element) element.hidden = hidden;
}

export function setDetailLineHidden(id: string, hidden: boolean): void {
  const wrapper = document.getElementById(id)?.closest<HTMLElement>(".detail-line");
  if (wrapper) wrapper.hidden = hidden;
}
