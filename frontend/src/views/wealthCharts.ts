import type { CombinedWealthYear, RealEstateFinancingYear } from "../types";

interface ChartRenderInput<T> {
  points: T[];
  selectedYear: number | null;
  formatMoney: (value: number) => string;
}

interface RealEstateChartOptions {
  financingEndYear?: number;
}

type RealEstateRepaymentChartInput = ChartRenderInput<RealEstateFinancingYear> & RealEstateChartOptions & {
  loanCostBasis?: number;
};

type RealEstateTrendChartInput = ChartRenderInput<RealEstateFinancingYear> & RealEstateChartOptions;

export interface VerticalBarSegment {
  className: string;
  label: string;
  value: number;
  overlay?: boolean;
}

export interface RealEstateRepaymentSegmentInput {
  point: RealEstateFinancingYear;
  totalLoanCost: number;
  paidLoanCostToDate: number;
}

export function renderRealEstateRepaymentChart(input: RealEstateRepaymentChartInput): string {
  if (!input.points.length) {
    return '<div class="chart-empty">Noch keine Immobilienberechnung verfuegbar.</div>';
  }

  const loanCostBasis = positiveBasis(input.loanCostBasis, input.points[0]?.loanStart ?? 0);
  if (!Number.isFinite(loanCostBasis) || loanCostBasis <= 0) {
    return '<div class="chart-empty">Noch kein Start-Kreditvolumen fuer die Tilgung vorhanden.</div>';
  }
  let paidLoanCostToDate = 0;
  const repaymentPoints = input.points.map((point) => {
    paidLoanCostToDate += paidLoanCostForYear(point);
    const composition = propertyComposition({
      point,
      totalLoanCost: loanCostBasis,
      paidLoanCostToDate
    });
    return {
      ...composition,
      year: point.year,
      selected: input.selectedYear === point.year,
      financingEnd: input.financingEndYear === point.year,
      action: "select-real-estate-year",
      chartKind: "repayment",
      value: composition.openLoanCost,
      valueLabel: input.formatMoney(composition.openLoanCost),
      segments: composition.segments
    };
  });
  const maxDebt = Math.max(
    loanCostBasis,
    ...input.points.map((point) => Math.max(0, point.loanStart, point.loanEnd)),
    ...repaymentPoints.map((point) => point.barTotal)
  );

  return renderVerticalChart({
    label: "Immobilienfinanzierung je Jahr",
    title: "Darlehensbetrag inkl. Zinsen, Tilgung und Zinsen je Jahr",
    maxValue: maxDebt,
    legend: [
      { className: "debt", label: "Darlehensbetrag inkl. Zinsen offen" },
      { className: "equity", label: "Getilgter Kreditanteil" },
      { className: "interest", label: "Zinsen" }
    ],
    points: repaymentPoints
  });
}

export function renderRealEstateTrendChart(input: RealEstateTrendChartInput): string {
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
      financingEnd: input.financingEndYear === point.year,
      action: "select-real-estate-year",
      chartKind: "trend",
      value: point.propertyValue,
      valueLabel: input.formatMoney(point.propertyValue),
      barTotal: Math.max(0, point.propertyValue),
      segments: realEstateTrendSegments(point, initialPropertyValue)
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

export function renderCombinedWealthYearDetail(input: {
  selected: CombinedWealthYear | null;
  finalYear: CombinedWealthYear | null;
  formatMoney: (value: number) => string;
  formatInt: (value: number) => string;
}): string {
  if (!input.selected) {
    return "<div class='chart-empty'>Bitte zuerst Module aktivieren und berechnen.</div>";
  }

  const finalYear = input.finalYear ?? input.selected;

  return `
    ${wealthDetailLine("Jahr", input.formatInt(input.selected.year))}
    ${wealthDetailLine("Cash", input.formatMoney(input.selected.cashValue))}
    ${wealthDetailLine("Depot", input.formatMoney(input.selected.depotValue))}
    ${wealthDetailLine("Entnahmeeffekt", input.formatMoney(input.selected.withdrawalImpact))}
    ${wealthDetailLine("Umgeleitete Cash-Tilgung", input.formatMoney(input.selected.redirectedCashRepayment))}
    ${wealthDetailLine("Umgeleitete Depot-Tilgung", input.formatMoney(input.selected.redirectedDepotRepayment))}
    ${wealthDetailLine("Immobilienwert", input.formatMoney(input.selected.propertyValue))}
    ${wealthDetailLine("Immobilienschuld", input.formatMoney(input.selected.propertyDebt))}
    ${wealthDetailLine("Immobilien-Eigenkapital", input.formatMoney(input.selected.propertyEquity))}
    ${wealthDetailLine("Bruttovermoegen", input.formatMoney(input.selected.totalGrossAssets))}
    ${wealthDetailLine("Gesamtschulden", input.formatMoney(input.selected.totalDebt))}
    ${wealthDetailLine("Nettovermoegen", input.formatMoney(input.selected.totalNetWealth))}
    ${wealthDetailLine("Erbe an Nachkommen", input.formatMoney(finalYear.totalNetWealth))}
  `;
}

export function realEstatePopupHeading(
  age: number,
  year: number,
  formatInt: (value: number) => string = (value) => String(Math.round(value))
): string {
  return `Alter ${formatInt(age)} | Jahr ${formatInt(year)}`;
}

function renderVerticalChart(input: {
  label: string;
  title?: string;
  maxValue: number;
  legend: Array<{ className: string; label: string }>;
  points: Array<{
    year: number;
    selected: boolean;
    financingEnd?: boolean;
    action: string;
    chartKind?: string;
    value: number;
    valueLabel: string;
    barTotal: number;
    segments: VerticalBarSegment[];
  }>;
}): string {
  const columnCount = Math.max(1, input.points.length);

  return `
    <div class="wealth-vertical-chart" aria-label="${input.label}">
      ${input.title ? `<h3 class="wealth-chart-title">${input.title}</h3>` : ""}
      <div class="wealth-y-axis" aria-hidden="true">
        <span>${formatAxis(input.maxValue)}</span>
        <span>${formatAxis(input.maxValue / 2)}</span>
        <span>0 EUR</span>
      </div>
      <div class="wealth-plot" role="list" style="--wealth-chart-count:${columnCount};">
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

function wealthDetailLine(label: string, value: string): string {
  return `<div class="detail-line"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderVerticalBar(
  point: {
    year: number;
    selected: boolean;
    financingEnd?: boolean;
    action: string;
    chartKind?: string;
    value: number;
    valueLabel: string;
    barTotal: number;
    segments: VerticalBarSegment[];
  },
  maxValue: number
): string {
  const barHeight = heightPercent(point.barTotal, maxValue);
  const buttonClasses = [
    "wealth-column-button",
    point.selected ? "active" : "",
    point.financingEnd ? "financing-end" : ""
  ]
    .filter(Boolean)
    .join(" ");
  return `
    <button
      class="${buttonClasses}"
      type="button"
      role="listitem"
      data-action="${point.action}"
      data-year="${point.year}"
      ${point.chartKind ? `data-chart-kind="${point.chartKind}"` : ""}
      ${point.financingEnd ? 'data-financing-end="true"' : ""}
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

function propertyComposition(input: RealEstateRepaymentSegmentInput): {
  barTotal: number;
  openLoanCost: number;
  segments: VerticalBarSegment[];
} {
  const segments = realEstateRepaymentSegments(input);
  const openLoanCost = segments.find((segment) => segment.className === "debt")?.value ?? 0;
  const paidLoanCost = segments.find((segment) => segment.className === "equity")?.value ?? 0;
  const barTotal = Math.max(input.totalLoanCost, openLoanCost + paidLoanCost);
  return {
    barTotal,
    openLoanCost,
    segments
  };
}

export function realEstateRepaymentSegments(input: RealEstateRepaymentSegmentInput): VerticalBarSegment[] {
  const totalLoanCost = Math.max(0, input.totalLoanCost);
  const currentDebt = Math.max(0, input.point.loanEnd);
  const paidLoanCostToDate = Math.max(0, input.paidLoanCostToDate);
  const calculatedOpenLoanCost = Math.max(0, totalLoanCost - Math.min(totalLoanCost, paidLoanCostToDate));
  const openLoanCost = currentDebt <= 0 ? 0 : Math.max(calculatedOpenLoanCost, currentDebt);
  const paidLoanCost = Math.max(0, Math.min(totalLoanCost, totalLoanCost - openLoanCost));
  return [
    { className: "debt", label: "Darlehensbetrag inkl. Zinsen offen", value: openLoanCost },
    { className: "equity", label: "Getilgter Kreditanteil", value: paidLoanCost },
    { className: "interest", label: "Zinsen", value: Math.max(0, input.point.interestDue), overlay: true }
  ];
}

export function paidLoanCostForYear(point: RealEstateFinancingYear): number {
  return Math.max(0, point.interestPaid) + Math.max(0, point.principalPaid);
}

function positiveBasis(value: number | undefined, fallback: number): number {
  const candidate = Number.isFinite(value) ? Number(value) : fallback;
  return Math.max(0, candidate);
}

export function realEstateTrendSegments(point: RealEstateFinancingYear, initialPropertyValue: number): VerticalBarSegment[] {
  return [
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
  ];
}

function formatAxis(value: number): string {
  if (value >= 1000000) return `${Math.round(value / 100000) / 10} Mio. EUR`;
  if (value >= 1000) return `${Math.round(value / 1000)} Tsd. EUR`;
  return `${Math.round(value)} EUR`;
}
