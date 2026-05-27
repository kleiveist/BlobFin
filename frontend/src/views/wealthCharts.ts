import type { CombinedWealthYear, RealEstateFinancingYear } from "../types";

interface ChartRenderInput<T> {
  points: T[];
  selectedYear: number | null;
  formatMoney: (value: number) => string;
}

export function renderRealEstateRepaymentChart(input: ChartRenderInput<RealEstateFinancingYear>): string {
  if (!input.points.length) {
    return '<div class="chart-empty">Noch keine Immobilienberechnung verfuegbar.</div>';
  }

  const maxValue = Math.max(1, ...input.points.map((point) => Math.max(point.propertyValue, point.loanStart, point.loanEnd)));
  return `
    <div class="wealth-bars" role="list" aria-label="Immobilienfinanzierung je Jahr">
      ${input.points
        .map((point) => {
          const isActive = input.selectedYear === point.year;
          const debtWidth = widthPercent(point.loanEnd, maxValue);
          const equityWidth = widthPercent(point.propertyEquity, maxValue);
          const propertyWidth = widthPercent(point.propertyValue, maxValue);
          return `
            <button
              class="wealth-bar-row ${isActive ? "active" : ""}"
              type="button"
              role="listitem"
              data-action="select-real-estate-year"
              data-year="${point.year}"
            >
              <span class="wealth-bar-year">${point.year}</span>
              <span class="wealth-bar-track">
                <span class="wealth-bar-segment property" style="width:${propertyWidth}%"></span>
                <span class="wealth-bar-segment equity" style="width:${equityWidth}%"></span>
                <span class="wealth-bar-segment debt" style="width:${debtWidth}%"></span>
              </span>
              <span class="wealth-bar-value">${input.formatMoney(point.netPropertyWealth)}</span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

export function renderRealEstateTrendChart(input: ChartRenderInput<RealEstateFinancingYear>): string {
  if (!input.points.length) {
    return '<div class="chart-empty">Keine Werte fuer die Immobilienwertentwicklung vorhanden.</div>';
  }
  const maxValue = Math.max(1, ...input.points.map((point) => Math.max(point.propertyValue, point.netPropertyWealth)));
  return `
    <div class="wealth-bars" role="list" aria-label="Immobilienwertentwicklung je Jahr">
      ${input.points
        .map((point) => {
          const valueWidth = widthPercent(point.propertyValue, maxValue);
          const netWidth = widthPercent(point.netPropertyWealth, maxValue);
          return `
            <div class="wealth-bar-row static" role="listitem">
              <span class="wealth-bar-year">${point.year}</span>
              <span class="wealth-bar-track">
                <span class="wealth-bar-segment property" style="width:${valueWidth}%"></span>
                <span class="wealth-bar-segment net" style="width:${netWidth}%"></span>
              </span>
              <span class="wealth-bar-value">${input.formatMoney(point.propertyValue)}</span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

export function renderCombinedWealthChart(input: ChartRenderInput<CombinedWealthYear>): string {
  if (!input.points.length) {
    return '<div class="chart-empty">Bitte zuerst Module aktivieren und berechnen.</div>';
  }

  const maxValue = Math.max(
    1,
    ...input.points.map((point) => Math.max(point.totalGrossAssets, point.totalNetWealth, Math.abs(point.propertyDebt)))
  );

  return `
    <div class="wealth-bars" role="list" aria-label="Kombiniertes Vermoegen je Jahr">
      ${input.points
        .map((point) => {
          const isActive = input.selectedYear === point.year;
          const grossWidth = widthPercent(point.totalGrossAssets, maxValue);
          const debtWidth = widthPercent(point.totalDebt, maxValue);
          const netWidth = widthPercent(point.totalNetWealth, maxValue);
          return `
            <button
              class="wealth-bar-row ${isActive ? "active" : ""}"
              type="button"
              role="listitem"
              data-action="select-combined-wealth-year"
              data-year="${point.year}"
            >
              <span class="wealth-bar-year">${point.year}</span>
              <span class="wealth-bar-track">
                <span class="wealth-bar-segment gross" style="width:${grossWidth}%"></span>
                <span class="wealth-bar-segment debt" style="width:${debtWidth}%"></span>
                <span class="wealth-bar-segment net" style="width:${netWidth}%"></span>
              </span>
              <span class="wealth-bar-value">${input.formatMoney(point.totalNetWealth)}</span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function widthPercent(value: number, maxValue: number): number {
  if (!Number.isFinite(value) || value <= 0 || maxValue <= 0) return 0;
  return Math.max(0, Math.min(100, (value / maxValue) * 100));
}
