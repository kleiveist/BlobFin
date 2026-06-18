import { incomePlanningWeekScenarioConfig } from "../../domain/incomePlanning";
import { escapeHtml, intNumber } from "../../lib/format";
import { incomePlanningHostRef as host, requireIncomePlanningHost } from "./host";
import { renderIncomeStampPlannerContent } from "./stampPlannerController";
import { incomePlanningHeaderIcon } from "./shared";
import { incomePlanningUiState } from "./uiState";
import {
  incomePlanningIsoWeeksForYear,
  incomePlanningScenarioIdForWeekStart,
  incomePlanningWeekScenarioOptions,
  incomeStampPlannerShortDate,
  setIncomePlanningScenarioForWeekStart
} from "./weekScenarioController";

export function openIncomePlanningPlanningPopup(view: "year" | "stamp" = "year", year = new Date().getFullYear()): void {
  requireIncomePlanningHost();
  incomePlanningUiState.planningPopup = {
    view,
    year: normalizePlanningPopupYear(year),
    yearWeekScenarioPicker: null
  };
  renderIncomePlanningPlanningPopup();
}

export function closeIncomePlanningPlanningPopup(): void {
  incomePlanningUiState.planningPopup = null;
  renderIncomePlanningPlanningPopup();
}

export function setIncomePlanningPlanningPopupView(view: "year" | "stamp"): void {
  if (!incomePlanningUiState.planningPopup) return;
  incomePlanningUiState.planningPopup = { ...incomePlanningUiState.planningPopup, view, yearWeekScenarioPicker: null };
  renderIncomePlanningPlanningPopup();
}

export function setIncomePlanningPlanningPopupYear(value: string | number): void {
  if (!incomePlanningUiState.planningPopup) return;
  incomePlanningUiState.planningPopup = {
    ...incomePlanningUiState.planningPopup,
    year: normalizePlanningPopupYear(Number(value)),
    yearWeekScenarioPicker: null
  };
  renderIncomePlanningPlanningPopup();
}

export function showPreviousIncomePlanningPlanningPopupYear(): void {
  if (!incomePlanningUiState.planningPopup) return;
  setIncomePlanningPlanningPopupYear(incomePlanningUiState.planningPopup.year - 1);
}

export function showNextIncomePlanningPlanningPopupYear(): void {
  if (!incomePlanningUiState.planningPopup) return;
  setIncomePlanningPlanningPopupYear(incomePlanningUiState.planningPopup.year + 1);
}

export function setIncomePlanningYearWeekScenario(weekStartDate: string, scenarioId: string): void {
  const popup = incomePlanningUiState.planningPopup;
  if (!popup || popup.view !== "year") {
    setIncomePlanningScenarioForWeekStart(weekStartDate, scenarioId);
    return;
  }
  const previousPicker = popup.yearWeekScenarioPicker;
  const updated = setIncomePlanningScenarioForWeekStart(weekStartDate, scenarioId, { render: false });
  if (!updated) return;
  incomePlanningUiState.planningPopup = { ...popup, yearWeekScenarioPicker: null };
  renderIncomePlanningYearWeekRowsForDates([previousPicker, weekStartDate]);
}

export function toggleIncomePlanningYearWeekScenarioPicker(weekStartDate: string): void {
  const popup = incomePlanningUiState.planningPopup;
  if (!popup || popup.view !== "year") return;
  const previousPicker = popup.yearWeekScenarioPicker;
  const nextPicker = previousPicker === weekStartDate ? null : weekStartDate;
  incomePlanningUiState.planningPopup = {
    ...popup,
    yearWeekScenarioPicker: nextPicker
  };
  renderIncomePlanningYearWeekRowsForDates([previousPicker, nextPicker]);
}

export function renderIncomePlanningPlanningPopup(): void {
  const root = document.querySelector<HTMLDivElement>("#incomePlanningPlanningPopupRoot");
  if (!root) return;
  const previousScrollTop = root.querySelector<HTMLElement>(".income-planning-planning-popup")?.scrollTop ?? 0;
  const popup = incomePlanningUiState.planningPopup;
  if (!popup) {
    root.innerHTML = "";
    return;
  }
  root.innerHTML = `
    <div class="income-planning-dialog-backdrop" role="presentation">
      <div class="income-planning-dialog income-planning-planning-popup" role="dialog" aria-modal="true" aria-label="Jahresplanung und Stempelplaner">
        <button class="income-planning-header-icon-button income-planning-popup-close" type="button" data-action="income-planning-close-planning-popup" aria-label="Popup schliessen" title="Schliessen">x</button>
        ${popup.view === "year" ? renderIncomePlanningYearPlanningView(popup.year) : renderIncomePlanningStampPlannerView()}
      </div>
    </div>
  `;
  const nextPopup = root.querySelector<HTMLElement>(".income-planning-planning-popup");
  if (nextPopup) nextPopup.scrollTop = previousScrollTop;
  if (popup.view === "stamp") renderIncomeStampPlannerContent();
}

function planningPopupTab(view: "year" | "stamp", label: string, activeView: "year" | "stamp"): string {
  const active = view === activeView;
  return `
    <button
      class="income-planning-popup-tab${active ? " active" : ""}"
      type="button"
      role="tab"
      data-action="income-planning-planning-popup-${view}"
      aria-selected="${active}"
    >${escapeHtml(label)}</button>
  `;
}

function renderPlanningPopupViewSwitch(activeView: "year" | "stamp"): string {
  return `
    <div class="income-planning-popup-view-switcher" role="tablist" aria-label="Planungsansicht">
      ${planningPopupTab("year", "Jahresplanung", activeView)}
      ${planningPopupTab("stamp", "Stempelplaner", activeView)}
    </div>
  `;
}

function renderIncomePlanningYearPlanningView(year: number): string {
  const weeks = incomePlanningIsoWeeksForYear(year);
  const scenarios = incomePlanningWeekScenarioOptions();
  const activePicker = incomePlanningUiState.planningPopup?.yearWeekScenarioPicker ?? null;
  return `
    <section class="income-planning-year-view" aria-label="Jahresplanung">
      <div class="income-section-head income-planning-card-head income-planning-popup-top-row income-planning-year-popup-head">
        <div class="income-planning-popup-title-stack">
          <div>
            <h3>Jahresplanung</h3>
            <p>Kalenderwochen und Wochenszenarien fuer ${escapeHtml(String(year))}.</p>
          </div>
          <div class="income-planning-year-toolbar">
            <div class="income-stamp-planner-month-nav" role="group" aria-label="Jahr auswaehlen">
              <button class="income-stamp-planner-month-button" type="button" data-action="income-planning-planning-popup-prev-year" aria-label="Vorheriges Jahr" title="Vorheriges Jahr">
                ${incomePlanningHeaderIcon("chevron-left")}
              </button>
              <label class="field compact income-planning-year-field">
                <span>Jahr</span>
                <input type="number" min="2000" max="2100" step="1" value="${escapeHtml(String(year))}" data-income-planning-planning-popup-year />
              </label>
              <button class="income-stamp-planner-month-button" type="button" data-action="income-planning-planning-popup-next-year" aria-label="Naechstes Jahr" title="Naechstes Jahr">
                ${incomePlanningHeaderIcon("chevron-right")}
              </button>
            </div>
            <div class="income-planning-year-summary">
              <strong>${intNumber(weeks.length)} Kalenderwochen</strong>
              <span>Nicht gesetzte Wochen nutzen ${escapeHtml(incomePlanningWeekScenarioConfig("normal", host.getState().incomePlanning.weekScenarios ?? []).label)}.</span>
            </div>
          </div>
        </div>
        ${renderPlanningPopupViewSwitch("year")}
        ${renderIncomePlanningScenarioLegend(scenarios)}
      </div>
      <div class="income-planning-year-week-list income-planning-year-week-grid" data-income-planning-year-week-list>
        ${weeks.map((week) => renderIncomePlanningYearWeekRow(week, scenarios, activePicker === week.weekStartDate)).join("")}
      </div>
    </section>
  `;
}

function renderIncomePlanningYearWeekRowsForDates(weekStartDates: Array<string | null>): void {
  const popup = incomePlanningUiState.planningPopup;
  if (!popup || popup.view !== "year") return;
  const weeks = incomePlanningIsoWeeksForYear(popup.year);
  const scenarios = incomePlanningWeekScenarioOptions();
  const uniqueWeekStartDates = Array.from(new Set(weekStartDates.filter((value): value is string => Boolean(value))));
  preserveIncomePlanningPlanningPopupScroll(() => {
    uniqueWeekStartDates.forEach((weekStartDate) => {
      const row = incomePlanningYearWeekRowElement(weekStartDate);
      const week = weeks.find((entry) => entry.weekStartDate === weekStartDate);
      if (!row || !week) return;
      row.outerHTML = renderIncomePlanningYearWeekRow(
        week,
        scenarios,
        incomePlanningUiState.planningPopup?.yearWeekScenarioPicker === week.weekStartDate
      );
    });
  });
}

function incomePlanningYearWeekRowElement(weekStartDate: string): HTMLElement | null {
  const rows = document.querySelectorAll<HTMLElement>("[data-income-planning-year-week-row]");
  return Array.from(rows).find((row) => row.dataset.incomePlanningYearWeekRow === weekStartDate) ?? null;
}

function preserveIncomePlanningPlanningPopupScroll(render: () => void): void {
  const popup = document.querySelector<HTMLElement>(".income-planning-planning-popup");
  const scrollTop = popup?.scrollTop ?? 0;
  render();
  if (popup) popup.scrollTop = scrollTop;
}

function renderIncomePlanningYearWeekRow(
  week: ReturnType<typeof incomePlanningIsoWeeksForYear>[number],
  scenarios: ReturnType<typeof incomePlanningWeekScenarioOptions>,
  open: boolean
): string {
  const scenarioId = incomePlanningScenarioIdForWeekStart(week.weekStartDate);
  const scenario = incomePlanningWeekScenarioConfig(scenarioId, host.getState().incomePlanning.weekScenarios ?? []);
  const popoverId = incomePlanningYearWeekPopoverId(week.weekStartDate);
  return `
    <article
      class="income-planning-year-week-row${open ? " open" : ""}"
      data-income-planning-year-week-row="${escapeHtml(week.weekStartDate)}"
      style="--income-planning-scenario-color:${escapeHtml(scenario.color)};"
    >
      <button
        class="income-planning-year-week-card-button"
        type="button"
        data-action="income-planning-year-week-toggle-scenario"
        data-income-planning-year-week-start="${escapeHtml(week.weekStartDate)}"
        aria-haspopup="listbox"
        aria-expanded="${open}"
        aria-controls="${escapeHtml(popoverId)}"
      >
        <span class="income-planning-year-week-key">
          <strong>KW ${String(week.weekNumber).padStart(2, "0")}</strong>
          <span>${escapeHtml(incomePlanningYearWeekRangeLabel(week.start, week.end))}</span>
        </span>
        <span class="income-planning-year-week-scenario" aria-label="Szenario ${escapeHtml(scenario.label)}">
          <i></i>
          <span title="${escapeHtml(scenario.label)}">${escapeHtml(incomePlanningScenarioAbbreviation(scenario.label))}</span>
        </span>
      </button>
      ${open ? renderIncomePlanningYearWeekPopover(week, scenarios, scenarioId, popoverId) : ""}
    </article>
  `;
}

function renderIncomePlanningYearWeekPopover(
  week: ReturnType<typeof incomePlanningIsoWeeksForYear>[number],
  scenarios: ReturnType<typeof incomePlanningWeekScenarioOptions>,
  scenarioId: string,
  popoverId: string
): string {
  return `
    <div id="${escapeHtml(popoverId)}" class="income-planning-year-week-popover" role="listbox" aria-label="Szenario fuer KW ${String(week.weekNumber).padStart(2, "0")}">
      ${scenarios.map((option) => `
        <button
          class="income-planning-year-week-option${option.id === scenarioId ? " active" : ""}"
          type="button"
          role="option"
          aria-selected="${option.id === scenarioId}"
          data-action="income-planning-year-week-select-scenario"
          data-income-planning-year-week-start="${escapeHtml(week.weekStartDate)}"
          data-income-planning-year-week-option-id="${escapeHtml(option.id)}"
          style="--income-planning-scenario-color:${escapeHtml(option.color)};"
        >
          <i></i>
          <span>${escapeHtml(option.label)}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderIncomePlanningStampPlannerView(): string {
  const scenarios = incomePlanningWeekScenarioOptions();
  return `
    <section class="income-planning-stamp-popup-view" aria-label="Stempelplaner">
      <div class="income-section-head income-planning-card-head income-planning-popup-top-row">
        <div class="income-planning-popup-title-stack">
          <div>
            <h3>Planungsraster</h3>
            <p>Monatsuebersicht fuer einmalige Kalender-Stempel.</p>
          </div>
          <div class="income-planning-stamp-popup-controls">
            <div id="incomeStampPlannerControls" class="income-stamp-planner-controls"></div>
            <button class="button" type="button" data-action="income-stamp-planner-add">Stempel planen</button>
          </div>
        </div>
        ${renderPlanningPopupViewSwitch("stamp")}
        ${renderIncomePlanningScenarioLegend(scenarios)}
      </div>
      <div id="incomeStampPlannerGrid" class="income-stamp-planner-grid"></div>
      <div id="incomeStampPlannerDialogRoot"></div>
    </section>
  `;
}

function renderIncomePlanningScenarioLegend(scenarios: ReturnType<typeof incomePlanningWeekScenarioOptions>): string {
  return `
    <div class="income-planning-year-scenario-legend" aria-label="Wochenszenario-Farben">
      ${scenarios.map((scenario) => `
        <span style="--income-planning-scenario-color:${escapeHtml(scenario.color)}">
          <i></i>${escapeHtml(scenario.label)}
        </span>
      `).join("")}
    </div>
  `;
}

function incomePlanningScenarioAbbreviation(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return words.map((word) => word[0] ?? "").join("").slice(0, 3).toUpperCase();
  return label.trim().slice(0, 3).toUpperCase();
}

function incomePlanningYearWeekRangeLabel(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = sameYear ? incomeStampPlannerShortDate(start) : `${incomeStampPlannerShortDate(start)}${start.getFullYear()}`;
  return `${startLabel}-${incomeStampPlannerShortDate(end)}${end.getFullYear()}`;
}

function incomePlanningYearWeekPopoverId(weekStartDate: string): string {
  return `incomePlanningYearWeekScenario-${weekStartDate.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function normalizePlanningPopupYear(value: number): number {
  if (!Number.isFinite(value)) return new Date().getFullYear();
  return Math.max(2000, Math.min(2100, Math.trunc(value)));
}
