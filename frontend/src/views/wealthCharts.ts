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
  overlay?: boolean;
}

export function renderRealEstateRepaymentChart(input: ChartRenderInput<RealEstateFinancingYear>): string {
  if (!input.points.length) {
    return '<div class="chart-empty">Noch keine Immobilienberechnung verfuegbar.</div>';
  }

  const startLoanAmount = Math.max(1, input.points[0]?.loanStart ?? 0);

  return renderVerticalChart({
    label: "Immobilienfinanzierung je Jahr",
    maxValue: startLoanAmount,
    legend: [
      { className: "debt", label: "Restschuld" },
      { className: "equity", label: "Getilgter Kreditanteil" },
      { className: "interest", label: "Zinsen" }
    ],
    points: input.points.map((point) => {
      const composition = propertyComposition(point, startLoanAmount);
      return {
        ...composition,
        year: point.year,
        selected: input.selectedYear === point.year,
        action: "select-real-estate-year",
        value: point.netPropertyWealth,
        valueLabel: input.formatMoney(point.netPropertyWealth),
        segments: composition.segments
      };
    })
  });
}

export function renderRealEstateTrendChart(input: ChartRenderInput<RealEstateFinancingYear>): string {
  if (!input.points.length) {
    return '<div class="chart-empty">Keine Werte fuer die Immobilienwertentwicklung vorhanden.</div>';
  }
  const maxValue = Math.max(1, ...input.points.map((point) => Math.max(0, point.propertyValue)));
  const initialPropertyValue = Math.max(0, input.points[0]?.propertyValue ?? 0);

  return renderVerticalChart({
    label: "Immobilienwertentwicklung je Jahr",
    maxValue,
    legend: [
      { className: "property", label: "Ausgangswert" },
      { className: "growth", label: "Wertentwicklung" }
    ],
    points: input.points.map((point) => ({
      year: point.year,
      selected: input.selectedYear === point.year,
      action: "select-real-estate-year",
      value: point.propertyValue,
      valueLabel: input.formatMoney(point.propertyValue),
      barTotal: Math.max(0, point.propertyValue),
      segments: [
        {
          className: "property",
          label: "Ausgangswert",
          value: Math.max(0, Math.min(point.propertyValue, initialPropertyValue))
        },
        {
          className: "growth",
          label: "Wertentwicklung",
          value: Math.max(0, point.propertyValue - initialPropertyValue)
        }
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
    ...input.points.map((point) => Math.max(0, point.cashValue) + Math.max(0, point.depotValue) + Math.max(0, point.propertyValue))
  );

  return renderVerticalChart({
    label: "Kombiniertes Vermoegen je Jahr",
    maxValue,
    legend: [
      { className: "cash", label: "Cash" },
      { className: "depot", label: "Depot" },
      { className: "property", label: "Immobilienwert" }
    ],
    points: input.points.map((point) => ({
      year: point.year,
      selected: input.selectedYear === point.year,
      action: "select-combined-wealth-year",
      value: point.totalGrossAssets,
      valueLabel: input.formatMoney(point.totalGrossAssets),
      barTotal: Math.max(0, point.cashValue) + Math.max(0, point.depotValue) + Math.max(0, point.propertyValue),
      segments: [
        { className: "cash", label: "Cash", value: Math.max(0, point.cashValue) },
        { className: "depot", label: "Depot", value: Math.max(0, point.depotValue) },
        { className: "property", label: "Immobilienwert", value: Math.max(0, point.propertyValue) }
      ]
    }))
  });
}

function renderVerticalChart(input: {
  label: string;
  maxValue: number;
  legend: Array<{ className: string; label: string }>;
  points: Array<{
    year: number;
    selected: boolean;
    action: string;
    value: number;
    valueLabel: string;
    barTotal: number;
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
      <div class="wealth-legend">
        ${input.legend
          .map((item) => `<span class="legend-item"><span class="legend-dot ${item.className}"></span>${item.label}</span>`)
          .join("")}
      </div>
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
    barTotal: number;
    segments: VerticalBarSegment[];
  },
  maxValue: number
): string {
  const barHeight = heightPercent(point.barTotal, maxValue);
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
        <span class="wealth-column-fill" style="height:${barHeight}%">
          ${point.segments.filter((segment) => !segment.overlay).map((segment) => renderSegment(segment, point.barTotal)).join("")}
          ${point.segments.filter((segment) => segment.overlay).map((segment) => renderOverlaySegment(segment, point.barTotal)).join("")}
        </span>
      </span>
      <span class="wealth-column-year">${point.year}</span>
    </button>
  `;
}

function renderOverlaySegment(segment: VerticalBarSegment, maxValue: number): string {
  const height = heightPercent(segment.value, maxValue);
  return `
    <span
      class="wealth-column-overlay ${segment.className}"
      style="height:${height}%"
      title="${segment.label}"
    ></span>
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

function propertyComposition(point: RealEstateFinancingYear, startLoanAmount: number): { barTotal: number; segments: VerticalBarSegment[] } {
  const debt = Math.max(0, Math.min(startLoanAmount, point.loanEnd));
  const equity = Math.max(0, startLoanAmount - debt);
  return {
    barTotal: startLoanAmount,
    segments: [
      { className: "debt", label: "Restschuld", value: debt },
      { className: "equity", label: "Getilgter Kreditanteil", value: equity },
      { className: "interest", label: "Zinsen", value: Math.max(0, point.interestPaid), overlay: true }
    ]
  };
}

function formatAxis(value: number): string {
  if (value >= 1000000) return `${Math.round(value / 100000) / 10} Mio. EUR`;
  if (value >= 1000) return `${Math.round(value / 1000)} Tsd. EUR`;
  return `${Math.round(value)} EUR`;
}
