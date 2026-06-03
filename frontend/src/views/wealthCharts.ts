import type { CombinedWealthYear, RealEstateFinancingYear } from "../types";
import { escapeHtml } from "../lib/format";

interface ChartRenderInput<T> {
  points: T[];
  selectedYear: number | null;
  formatMoney: (value: number) => string;
}

export type CombinedWealthLineId = "pensionConsumedCumulative" | "taxCumulative";
export type CombinedWealthLineVisibility = Record<CombinedWealthLineId, boolean>;

interface CombinedWealthChartInput extends ChartRenderInput<CombinedWealthYear> {
  lineVisibility?: CombinedWealthLineVisibility;
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

interface VerticalChartPoint {
  year: number;
  selected: boolean;
  financingEnd?: boolean;
  action: string;
  chartKind?: string;
  value: number;
  valueLabel: string;
  barTotal: number;
  segments: VerticalBarSegment[];
}

interface VerticalChartLine {
  className: string;
  label: string;
  points: Array<{ year: number; value: number; valueLabel: string }>;
}

export interface RealEstateRepaymentSegmentInput {
  point: RealEstateFinancingYear;
  totalLoanCost?: number;
  paidLoanCostToDate?: number;
}

export function renderRealEstateRepaymentChart(input: RealEstateRepaymentChartInput): string {
  if (!input.points.length) {
    return '<div class="chart-empty">Noch keine Immobilienberechnung verfuegbar.</div>';
  }

  const loanCostBasis = positiveBasis(input.loanCostBasis, input.points[0]?.loanStart ?? 0);
  if (!Number.isFinite(loanCostBasis) || loanCostBasis <= 0) {
    return '<div class="chart-empty">Noch kein Start-Kreditvolumen fuer die Tilgung vorhanden.</div>';
  }
  const repaymentPoints = input.points.map((point) => {
    const composition = propertyComposition({ point, totalLoanCost: loanCostBasis });
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

export function renderCombinedWealthChart(input: CombinedWealthChartInput): string {
  if (!input.points.length) {
    return '<div class="chart-empty">Bitte zuerst Module aktivieren und berechnen.</div>';
  }

  const selectedPoint =
    input.points.find((point) => point.year === input.selectedYear) ?? input.points[input.points.length - 1];
  const startYear = input.points[0]?.year ?? 0;
  const tickYears = new Set(
    input.points
      .filter((point) => (point.year - startYear) % 15 === 0)
      .map((point) => point.year)
  );
  const lineVisibility = input.lineVisibility ?? {
    pensionConsumedCumulative: true,
    taxCumulative: true
  };
  const showPropertyValueLine = input.points.some((point) => point.propertyValue > 0);
  const showPropertyDebtLine = input.points.some((point) => point.propertyDebt > 0);
  const maxValue = Math.max(
    1,
    ...input.points.map(
      (point) =>
        Math.max(
          Math.max(0, point.cashValue) +
            Math.max(0, point.depotValue) +
            Math.max(0, point.pensionConsumed) +
            Math.max(0, point.pensionSavingsValue) +
            Math.max(0, point.taxValue) +
            Math.max(0, point.propertyEquity),
          Math.max(0, point.pensionConsumedValue),
          Math.max(0, point.cumulativeTaxValue),
          Math.max(0, point.totalNetWealth),
          Math.max(0, point.propertyValue),
          Math.max(0, point.propertyDebt)
        )
    )
  );

  return renderVerticalChart({
    label: "Kombiniertes Vermoegen je Jahr",
    chartClassName: "combined-wealth-vertical-chart",
    header: `
      <div class="combined-wealth-summary">
        <div class="combined-wealth-summary-values">
          ${renderCombinedSummaryValue("Cash", selectedPoint.cashValue, input.formatMoney)}
          ${renderCombinedSummaryValue("Depot", selectedPoint.depotValue, input.formatMoney)}
          ${renderCombinedSummaryValue("Rente p.a.", selectedPoint.pensionIncome, input.formatMoney)}
          ${renderCombinedSummaryValue("Rentensparen", selectedPoint.pensionSavingsValue, input.formatMoney)}
          ${renderCombinedSummaryValue("Steuern", selectedPoint.taxValue, input.formatMoney)}
          ${renderCombinedSummaryValue("Immobilienwert", selectedPoint.propertyValue, input.formatMoney)}
          ${renderCombinedSummaryValue("Immobilienschuld", selectedPoint.propertyDebt, input.formatMoney)}
          ${renderCombinedSummaryValue("Immobilien-Eigenkapital", selectedPoint.propertyEquity, input.formatMoney)}
          ${renderCombinedSummaryValue("Nettovermoegen", selectedPoint.totalNetWealth, input.formatMoney)}
        </div>
        <div class="combined-wealth-line-controls" aria-label="Kumulierte Linien">
          ${renderCombinedLineToggle({
            id: "pensionConsumedCumulative",
            className: "pension-consumed-cumulative",
            label: "Verbrauchte Rente kumuliert",
            value: selectedPoint.pensionConsumedValue,
            active: lineVisibility.pensionConsumedCumulative,
            formatMoney: input.formatMoney
          })}
          ${renderCombinedLineToggle({
            id: "taxCumulative",
            className: "tax-cumulative",
            label: "Steuern kumuliert",
            value: selectedPoint.cumulativeTaxValue,
            active: lineVisibility.taxCumulative,
            formatMoney: input.formatMoney
          })}
        </div>
      </div>
    `,
    footer: `
      <div class="combined-wealth-ticks" aria-hidden="true" style="--wealth-chart-count:${Math.max(1, input.points.length)};">
        ${input.points
          .map((point) => `
            <span class="combined-wealth-tick${tickYears.has(point.year) ? " visible" : ""}">
              ${tickYears.has(point.year) ? point.year : ""}
            </span>
          `)
          .join("")}
      </div>
    `,
    maxValue,
    showColumnValue: false,
    showColumnYear: false,
    showXAxisLabel: false,
    legend: [
      { className: "cash", label: "Cash" },
      { className: "depot", label: "Depot" },
      { className: "pension-consumed", label: "Verbrauchte Rente" },
      { className: "pension", label: "Gesparte Rente" },
      { className: "tax", label: "Steuern" },
      { className: "equity", label: "Immobilien-Eigenkapital" },
      ...(showPropertyValueLine ? [{ className: "property", label: "Immobilienwert brutto" }] : []),
      ...(showPropertyDebtLine ? [{ className: "debt", label: "Immobilienschuld" }] : [])
    ],
    lines: [
      showPropertyValueLine ? {
        className: "property",
        label: "Immobilienwert brutto",
        points: input.points.map((point) => ({
          year: point.year,
          value: Math.max(0, point.propertyValue),
          valueLabel: input.formatMoney(point.propertyValue)
        }))
      } : null,
      showPropertyDebtLine ? {
        className: "debt",
        label: "Immobilienschuld",
        points: input.points.map((point) => ({
          year: point.year,
          value: Math.max(0, point.propertyDebt),
          valueLabel: input.formatMoney(point.propertyDebt)
        }))
      } : null,
      lineVisibility.pensionConsumedCumulative ? {
        className: "pension-consumed-cumulative",
        label: "Verbrauchte Rente kumuliert",
        points: input.points.map((point) => ({
          year: point.year,
          value: Math.max(0, point.pensionConsumedValue),
          valueLabel: input.formatMoney(point.pensionConsumedValue)
        }))
      } : null,
      lineVisibility.taxCumulative ? {
        className: "tax-cumulative",
        label: "Steuern kumuliert",
        points: input.points.map((point) => ({
          year: point.year,
          value: Math.max(0, point.cumulativeTaxValue),
          valueLabel: input.formatMoney(point.cumulativeTaxValue)
        }))
      } : null
    ].filter((line): line is VerticalChartLine => Boolean(line)),
    points: input.points.map((point) => ({
      year: point.year,
      selected: input.selectedYear === point.year,
      action: "select-combined-wealth-year",
      value: point.totalNetWealth,
      valueLabel: input.formatMoney(point.totalNetWealth),
      barTotal:
        Math.max(0, point.cashValue) +
        Math.max(0, point.depotValue) +
        Math.max(0, point.pensionConsumed) +
        Math.max(0, point.pensionSavingsValue) +
        Math.max(0, point.taxValue) +
        Math.max(0, point.propertyEquity),
      segments: [
        { className: "equity", label: "Immobilien-Eigenkapital", value: Math.max(0, point.propertyEquity) },
        { className: "cash", label: "Cash", value: Math.max(0, point.cashValue) },
        { className: "depot", label: "Depot", value: Math.max(0, point.depotValue) },
        { className: "pension-consumed", label: "Verbrauchte Rente", value: Math.max(0, point.pensionConsumed) },
        { className: "pension", label: "Gesparte Rente", value: Math.max(0, point.pensionSavingsValue) },
        { className: "tax", label: "Steuern", value: Math.max(0, point.taxValue) }
      ]
    }))
  });
}

export function renderCombinedWealthLifeSummary(input: {
  points: CombinedWealthYear[];
  taxesAndDeductions: number;
  formatMoney: (value: number) => string;
  formatInt: (value: number) => string;
}): string {
  if (!input.points.length) {
    return "<div class='chart-empty'>Bitte zuerst Module aktivieren und berechnen.</div>";
  }

  const firstYear = input.points[0];
  const finalYear = input.points[input.points.length - 1];
  const pensionConsumed = sum(input.points.map((point) => point.pensionConsumed));
  const pensionSaved = sum(input.points.map((point) => point.pensionSaved));
  const firstDebt = firstYear.propertyLoanStart || firstYear.propertyDebt;
  const repaidPropertyDebt = Math.max(0, firstDebt - finalYear.propertyDebt);
  const depotDevelopment = finalYear.depotValue - firstYear.depotValue;
  const cashDevelopment = finalYear.cashValue - firstYear.cashValue;
  const totalTaxesAndDeductions = input.taxesAndDeductions + finalYear.cumulativeTaxValue;

  return `
    <div class="combined-life-summary">
      <div class="combined-life-summary-head">
        <span>Lebenszusammenfassung</span>
        <strong>${input.formatInt(firstYear.year)} bis ${input.formatInt(finalYear.year)}</strong>
      </div>
      ${wealthDetailLine("Bruttovermoegen inkl. Immobilienwert", input.formatMoney(finalYear.totalGrossAssets))}
      ${wealthDetailLine("Verbrauchte Rentenzahlungen", input.formatMoney(pensionConsumed))}
      ${wealthDetailLine("Gesparte Rentenanteile", input.formatMoney(pensionSaved))}
      ${wealthDetailLine("Gezahlte Steuern und Abgaben", input.formatMoney(totalTaxesAndDeductions))}
      ${wealthDetailLine("Getilgte Immobilienschulden", input.formatMoney(repaidPropertyDebt))}
      ${wealthDetailLine("Verbleibende Immobilienschuld", input.formatMoney(finalYear.propertyDebt))}
      ${wealthDetailLine("Immobilien-Eigenkapital", input.formatMoney(finalYear.propertyEquity))}
      ${wealthDetailLine("Depotentwicklung", input.formatMoney(depotDevelopment))}
      ${wealthDetailLine("Cashentwicklung", input.formatMoney(cashDevelopment))}
      ${wealthDetailLine("Voraussichtliches Nettovermoegen am Ende", input.formatMoney(finalYear.totalNetWealth))}
      ${wealthDetailLine("Voraussichtliches Erbe an Nachkommen", input.formatMoney(finalYear.totalNetWealth))}
    </div>
  `;
}

export function renderCombinedWealthPopup(input: {
  selected: CombinedWealthYear | null;
  finalYear: CombinedWealthYear | null;
  formatMoney: (value: number) => string;
  formatInt: (value: number) => string;
}): string {
  if (!input.selected) {
    return "<div class='chart-empty'>Bitte zuerst Module aktivieren und berechnen.</div>";
  }

  return `
    <div class="chart-popup-head">
      <div>
        <span>Kombinierter Vermoegenspfad</span>
        <strong>Jahr ${input.formatInt(input.selected.year)}</strong>
      </div>
      <button class="chart-popup-close" type="button" data-action="close-combined-wealth-popup" aria-label="Popup schliessen">x</button>
    </div>
    <div class="chart-popup-list">
      ${chartPopupLine("cash", "Cash", input.formatMoney(input.selected.cashValue))}
      ${chartPopupLine("depot", "Depot", input.formatMoney(input.selected.depotValue))}
      ${chartPopupLine("pension-consumed", "Verbrauchte Rente", input.formatMoney(input.selected.pensionConsumed))}
      ${chartPopupLine("pension", "Gesparte Rente", input.formatMoney(input.selected.pensionSavingsValue))}
      ${chartPopupLine("tax", "Steuern", input.formatMoney(input.selected.taxValue))}
      ${chartPopupLine("property", "Immobilienwert", input.formatMoney(input.selected.propertyValue))}
      ${chartPopupLine("debt", "Immobilienschuld", input.formatMoney(input.selected.propertyDebt))}
      ${chartPopupLine("equity", "Immobilien-Eigenkapital", input.formatMoney(input.selected.propertyEquity))}
      ${chartPopupLine("net", "Nettovermoegen", input.formatMoney(input.selected.totalNetWealth))}
    </div>
  `;
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
    ${wealthDetailLine("Gesparte Rentenanteile", input.formatMoney(input.selected.pensionSavingsValue))}
    ${wealthDetailLine("Verbrauchte Rente im Jahr", input.formatMoney(input.selected.pensionConsumed))}
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
  chartClassName?: string;
  title?: string;
  header?: string;
  footer?: string;
  maxValue: number;
  showColumnValue?: boolean;
  showColumnYear?: boolean;
  showXAxisLabel?: boolean;
  legend: Array<{ className: string; label: string }>;
  lines?: VerticalChartLine[];
  points: VerticalChartPoint[];
}): string {
  const columnCount = Math.max(1, input.points.length);
  const showColumnValue = input.showColumnValue ?? true;
  const showColumnYear = input.showColumnYear ?? true;
  const showXAxisLabel = input.showXAxisLabel ?? true;
  const chartClassName = ["wealth-vertical-chart", input.chartClassName].filter(Boolean).join(" ");

  return `
    <div class="${chartClassName}" aria-label="${input.label}">
      ${input.title ? `<h3 class="wealth-chart-title">${input.title}</h3>` : ""}
      ${input.header ?? ""}
      <div class="wealth-y-axis" aria-hidden="true">
        <span>${formatAxis(input.maxValue)}</span>
        <span>${formatAxis(input.maxValue / 2)}</span>
        <span>0 EUR</span>
      </div>
      <div class="wealth-plot" role="list" style="--wealth-chart-count:${columnCount};">
        ${input.points.map((point) => renderVerticalBar(point, input.maxValue, showColumnValue, showColumnYear)).join("")}
        ${(input.lines ?? []).map((line) => renderLineOverlay(line, input.maxValue)).join("")}
      </div>
      ${showXAxisLabel ? '<div class="wealth-x-axis" aria-hidden="true">Jahr</div>' : ""}
      ${input.footer ?? ""}
      <div class="wealth-legend">
        ${input.legend
          .map((item) => `<span class="legend-item"><span class="legend-dot ${item.className}"></span>${item.label}</span>`)
          .join("")}
      </div>
    </div>
  `;
}

function wealthDetailLine(label: string, value: string): string {
  return `<div class="detail-line"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderVerticalBar(
  point: VerticalChartPoint,
  maxValue: number,
  showValue: boolean,
  showYear: boolean
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
      ${showValue ? `<span class="wealth-column-value">${point.valueLabel}</span>` : ""}
      <span class="wealth-column-track">
        <span class="wealth-column-fill" style="height:${barHeight}%">
          ${point.segments.filter((segment) => !segment.overlay).map((segment) => renderSegment(segment, point.barTotal)).join("")}
          ${point.segments.filter((segment) => segment.overlay).map((segment) => renderOverlaySegment(segment, point.barTotal)).join("")}
        </span>
      </span>
      ${showYear ? `<span class="wealth-column-year">${point.year}</span>` : ""}
    </button>
  `;
}

function renderCombinedSummaryValue(
  label:
    | "Cash"
    | "Depot"
    | "Rente p.a."
    | "Rentensparen"
    | "Steuern"
    | "Immobilienwert"
    | "Immobilienschuld"
    | "Immobilien-Eigenkapital"
    | "Nettovermoegen",
  value: number,
  formatMoney: (value: number) => string
): string {
  return `
    <div class="combined-wealth-summary-item">
      <span class="combined-wealth-summary-label">${label}</span>
      <strong class="combined-wealth-summary-value">${formatMoney(value)}</strong>
    </div>
  `;
}

function renderCombinedLineToggle(input: {
  id: CombinedWealthLineId;
  className: string;
  label: string;
  value: number;
  active: boolean;
  formatMoney: (value: number) => string;
}): string {
  return `
    <button
      class="combined-wealth-line-toggle ${input.active ? "active" : ""}"
      type="button"
      data-action="toggle-combined-wealth-line"
      data-combined-wealth-line="${input.id}"
      aria-pressed="${input.active}"
    >
      <span class="combined-wealth-line-label">
        <i class="combined-wealth-line-dot ${escapeHtml(input.className)}"></i>${escapeHtml(input.label)}
      </span>
      <strong>${input.formatMoney(input.value)}</strong>
    </button>
  `;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}

function chartPopupLine(color: string, label: string, value: string): string {
  return `
    <div class="chart-popup-line">
      <span><i class="chart-popup-dot ${escapeHtml(color)}"></i>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
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

function renderLineOverlay(line: VerticalChartLine, maxValue: number): string {
  const points = line.points.map((point, index) => {
    const x = ((index + 0.5) / line.points.length) * 100;
    const y = 100 - heightPercent(point.value, maxValue);
    return `${roundChartCoordinate(x)},${roundChartCoordinate(y)}`;
  });
  if (!points.length) return "";

  return `
    <svg class="wealth-line-overlay ${escapeHtml(line.className)}" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <title>${escapeHtml(line.label)}</title>
      <polyline points="${points.join(" ")}"></polyline>
    </svg>
  `;
}

function heightPercent(value: number, maxValue: number): number {
  if (!Number.isFinite(value) || value <= 0 || maxValue <= 0) return 0;
  return Math.max(0, Math.min(100, (value / maxValue) * 100));
}

function roundChartCoordinate(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function propertyComposition(input: RealEstateRepaymentSegmentInput): {
  barTotal: number;
  openLoanCost: number;
  segments: VerticalBarSegment[];
} {
  const segments = realEstateRepaymentSegments(input);
  const openLoanCost = segments.find((segment) => segment.className === "debt")?.value ?? 0;
  const paidLoanCost = segments.find((segment) => segment.className === "equity")?.value ?? 0;
  const totalLoanCost = Math.max(0, input.totalLoanCost ?? openLoanCost + paidLoanCost);
  const barTotal = Math.max(totalLoanCost, openLoanCost + paidLoanCost);
  return {
    barTotal,
    openLoanCost,
    segments
  };
}

export function realEstateRepaymentSegments(input: RealEstateRepaymentSegmentInput): VerticalBarSegment[] {
  const pointTotalLoanCost = Math.max(0, (input.point.loanCostPaidToDate ?? 0) + (input.point.loanCostRemaining ?? 0));
  const totalLoanCost = Math.max(0, input.totalLoanCost ?? pointTotalLoanCost);
  const paidLoanCostToDate = Math.max(0, input.point.loanCostPaidToDate ?? input.paidLoanCostToDate ?? 0);
  const fallbackOpenLoanCost = Math.max(0, totalLoanCost - Math.min(totalLoanCost, paidLoanCostToDate));
  const openLoanCost = Math.max(0, input.point.loanCostRemaining ?? fallbackOpenLoanCost);
  const paidLoanCost = Math.max(
    0,
    Math.min(totalLoanCost, input.point.loanCostPaidToDate ?? totalLoanCost - openLoanCost)
  );
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
