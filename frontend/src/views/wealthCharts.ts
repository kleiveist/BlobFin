import type { CombinedWealthYear, RealEstateFinancingYear } from "../types";

interface ChartRenderInput<T> {
  points: T[];
  selectedYear: number | null;
  formatMoney: (value: number) => string;
}

interface VerticalBarSegment {
  className: string;
  label: string;
  value: number;
}

export function renderRealEstateRepaymentChart(input: ChartRenderInput<RealEstateFinancingYear>): string {
  if (!input.points.length) {
    return '<div class="chart-empty">Noch keine Immobilienberechnung verfuegbar.</div>';
  }

  const maxValue = Math.max(
    1,
    ...input.points.map((point) =>
      Math.max(point.propertyValue, point.loanStart, point.loanEnd, point.principalPaid + point.additionalRepayment)
    )
  );

  return renderVerticalChart({
    label: "Immobilienfinanzierung je Jahr",
    maxValue,
    points: input.points.map((point) => ({
      year: point.year,
      selected: input.selectedYear === point.year,
      action: "select-real-estate-year",
      value: point.netPropertyWealth,
      valueLabel: input.formatMoney(point.netPropertyWealth),
      segments: [
        { className: "property", label: "Immobilienwert", value: point.propertyValue },
        { className: "equity", label: "Tilgung plus Eigenkapital", value: point.propertyEquity },
        { className: "debt", label: "Restschuld", value: point.loanEnd }
      ]
    }))
  });
}

export function renderRealEstateTrendChart(input: ChartRenderInput<RealEstateFinancingYear>): string {
  if (!input.points.length) {
    return '<div class="chart-empty">Keine Werte fuer die Immobilienwertentwicklung vorhanden.</div>';
  }
  const maxValue = Math.max(1, ...input.points.map((point) => Math.max(point.propertyValue, point.netPropertyWealth)));
  return renderVerticalChart({
    label: "Immobilienwertentwicklung je Jahr",
    maxValue,
    points: input.points.map((point) => ({
      year: point.year,
      selected: input.selectedYear === point.year,
      action: "select-real-estate-year",
      value: point.propertyValue,
      valueLabel: input.formatMoney(point.propertyValue),
      segments: [
        { className: "property", label: "Immobilienwert", value: point.propertyValue },
        { className: "net", label: "Netto-Immobilienvermoegen", value: point.netPropertyWealth }
      ]
    }))
  });
}

export function renderCombinedWealthChart(input: ChartRenderInput<CombinedWealthYear>): string {
  if (!input.points.length) {
    return '<div class="chart-empty">Bitte zuerst Module aktivieren und berechnen.</div>';
  }

  const maxValue = Math.max(
    1,
    ...input.points.map((point) =>
      Math.max(
        point.totalGrossAssets,
        point.totalNetWealth,
        point.cashValue,
        point.depotValue,
        point.propertyValue,
        Math.abs(point.totalDebt)
      )
    )
  );

  return renderVerticalChart({
    label: "Kombiniertes Vermoegen je Jahr",
    maxValue,
    points: input.points.map((point) => ({
      year: point.year,
      selected: input.selectedYear === point.year,
      action: "select-combined-wealth-year",
      value: point.totalNetWealth,
      valueLabel: input.formatMoney(point.totalNetWealth),
      segments: [
        { className: "cash", label: "Cash", value: point.cashValue },
        { className: "depot", label: "Depot", value: point.depotValue },
        { className: "property", label: "Immobilienwert", value: point.propertyValue },
        { className: "debt", label: "Immobilienschuld", value: point.totalDebt },
        { className: "net", label: "Nettovermoegen", value: point.totalNetWealth }
      ]
    }))
  });
}

function renderVerticalChart(input: {
  label: string;
  maxValue: number;
  points: Array<{
    year: number;
    selected: boolean;
    action: string;
    value: number;
    valueLabel: string;
    segments: VerticalBarSegment[];
  }>;
}): string {
  return `
    <div class="wealth-vertical-chart" aria-label="${input.label}">
      <div class="wealth-y-axis" aria-hidden="true">
        <span>${formatAxis(input.maxValue)}</span>
        <span>${formatAxis(input.maxValue / 2)}</span>
        <span>0 EUR</span>
      </div>
      <div class="wealth-plot" role="list">
        ${input.points.map((point) => renderVerticalBar(point, input.maxValue)).join("")}
      </div>
      <div class="wealth-x-axis" aria-hidden="true">Jahr</div>
    </div>
  `;
}

function renderVerticalBar(
  point: {
    year: number;
    selected: boolean;
    action: string;
    value: number;
    valueLabel: string;
    segments: VerticalBarSegment[];
  },
  maxValue: number
): string {
  return `
    <button
      class="wealth-column-button ${point.selected ? "active" : ""}"
      type="button"
      role="listitem"
      data-action="${point.action}"
      data-year="${point.year}"
      title="${point.year}: ${point.valueLabel}"
    >
      <span class="wealth-column-value">${point.valueLabel}</span>
      <span class="wealth-column-track">
        ${point.segments.map((segment) => renderSegment(segment, maxValue)).join("")}
      </span>
      <span class="wealth-column-year">${point.year}</span>
    </button>
  `;
}

function renderSegment(segment: VerticalBarSegment, maxValue: number): string {
  const height = heightPercent(segment.value, maxValue);
  return `
    <span
      class="wealth-column-segment ${segment.className}"
      style="height:${height}%"
      title="${segment.label}"
    ></span>
  `;
}

function heightPercent(value: number, maxValue: number): number {
  if (!Number.isFinite(value) || value <= 0 || maxValue <= 0) return 0;
  return Math.max(0, Math.min(100, (value / maxValue) * 100));
}

function formatAxis(value: number): string {
  if (value >= 1000000) return `${Math.round(value / 100000) / 10} Mio. EUR`;
  if (value >= 1000) return `${Math.round(value / 1000)} Tsd. EUR`;
  return `${Math.round(value)} EUR`;
}
