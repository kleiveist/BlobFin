import { buildIncomeAnalysisLabelDetails, type IncomeAnalysisLabelDetails, type IncomeAnalysisLabelGroup } from "../../domain/incomeAnalysis";
import { INCOME_YEAR_LABEL_OPTIONS } from "../../domain/incomeLabels";
import {
  incomeTaxDeductionItemsTotal,
  incomeYearEntryNetIncome,
  incomeYearEntryTaxDeductions,
  incomeYearEntryTaxTotal,
  type IncomeTrackerModel
} from "../../domain/incomeTracker";
import { escapeHtml, money, numberValue, percent } from "../../lib/format";
import { positionIconSvg } from "../../lib/positionIcons";
import type { IncomeYearEntry } from "../../types";
import { INCOME_TAX_DEDUCTION_ROWS } from "./config";
import {
  incomeTrackerUiState,
  type IncomeAnalysisDataView,
  type IncomeAnalysisModel,
  type IncomeAnalysisSeriesItem,
  type IncomeAnalysisSlice,
  type IncomeAnalysisYearPoint
} from "./uiState";

export function renderIncomeAnalysisDialog(model: IncomeTrackerModel, yearlyEntries: IncomeYearEntry[]): void {
  const root = document.querySelector<HTMLDivElement>("#incomeAnalysisDialogRoot");
  if (!root) return;
  if (!incomeTrackerUiState.analysisOpen) {
    root.innerHTML = "";
    return;
  }

  const analysis = buildIncomeAnalysisModel(model, yearlyEntries);
  const slices = incomeAnalysisSlices(analysis);
  const years = analysis.years;
  const distributionMode = incomeTrackerUiState.analysisDataView === "label_distribution";
  root.innerHTML = `
    <div class="income-analysis-backdrop" role="presentation">
      <div class="income-analysis-dialog${distributionMode ? " label-distribution" : ""}" role="dialog" aria-modal="true" aria-label="Weltgrafik Analyse Dashboard">
        <div class="income-analysis-head">
          <div>
            <strong>Weltgrafik</strong>
            <span>Grafik · Analyse · Dashboard · Plattform</span>
          </div>
          <button class="chart-popup-close" type="button" data-action="income-close-analysis" aria-label="Weltgrafik schliessen">x</button>
        </div>
        <div class="income-analysis-controls">
          <div class="income-analysis-switch" aria-label="Diagrammtyp">
            ${incomeAnalysisToggle("income-analysis-chart-pie", "Kreis", incomeTrackerUiState.analysisChartType === "pie")}
            ${incomeAnalysisToggle("income-analysis-chart-bar", "Balken", incomeTrackerUiState.analysisChartType === "bar")}
            ${incomeAnalysisToggle("income-analysis-chart-line", "Linie", incomeTrackerUiState.analysisChartType === "line")}
            ${incomeAnalysisToggle("income-analysis-chart-curve", "Kurve", incomeTrackerUiState.analysisChartType === "curve")}
          </div>
          <div class="income-analysis-switch" aria-label="Auswertung">
            ${incomeAnalysisToggle("income-analysis-view-deductions", "Abgabenmix", incomeTrackerUiState.analysisDataView === "deductions")}
            ${incomeAnalysisToggle("income-analysis-view-social", "Sozialabgaben", incomeTrackerUiState.analysisDataView === "social")}
            ${incomeAnalysisToggle("income-analysis-view-taxes", "Steuern", incomeTrackerUiState.analysisDataView === "taxes")}
            ${incomeAnalysisToggle("income-analysis-view-income", "Einkommen", incomeTrackerUiState.analysisDataView === "income")}
            ${incomeAnalysisToggle("income-analysis-view-label_distribution", "Einkommensverteilung", incomeTrackerUiState.analysisDataView === "label_distribution")}
          </div>
          <div class="income-analysis-switch" aria-label="Jahresfilter">
            ${incomeAnalysisToggle("income-analysis-year-all", "Alle Jahre", incomeTrackerUiState.analysisYearFilter === "all")}
            ${years.map((year) => incomeAnalysisToggle(`income-analysis-year-${year}`, String(year), incomeTrackerUiState.analysisYearFilter === year)).join("")}
          </div>
        </div>
        ${
          distributionMode
            ? renderIncomeAnalysisDistributionContent(analysis, slices)
            : `
              <div class="income-analysis-metrics">
                ${incomeAnalysisMetricCard("Bisher eingenommen", money(analysis.totalGross), "Brutto erfasst")}
                ${incomeAnalysisMetricCard("Zum Leben verfuegbar", money(analysis.totalNet), "Jahresnetto")}
                ${incomeAnalysisMetricCard("Steuern bezahlt", money(analysis.taxTotal), "inkl. Erstattung/Nachzahlung")}
                ${incomeAnalysisMetricCard("Sozialabgaben", money(analysis.socialTotal), "Arbeitnehmeranteile")}
              </div>
              <div class="income-analysis-layout">
                <section class="income-analysis-chart-card">
                  ${renderIncomeAnalysisChart(analysis, slices)}
                </section>
                <section class="income-analysis-detail-card">
                  <h3>${escapeHtml(incomeAnalysisViewTitle())}</h3>
                  <div class="income-analysis-detail-body">
                    <div class="income-analysis-breakdown">
                      ${slices.length ? slices.map((slice) => incomeAnalysisBreakdownLine(slice, analysis.totalGross)).join("") : incomeAnalysisEmpty("Keine Werte fuer diese Auswahl.")}
                    </div>
                  </div>
                  <div class="income-analysis-total">
                    <span>Abgabenquote ohne Arbeitgeber</span>
                    <strong>${analysis.totalGross > 0 ? percent((analysis.totalDeductions / analysis.totalGross) * 100) : "-"}</strong>
                  </div>
                </section>
              </div>
            `
        }
      </div>
    </div>
  `;
}

function renderIncomeAnalysisDistributionContent(analysis: IncomeAnalysisModel, slices: IncomeAnalysisSlice[]): string {
  return `
    <div class="income-analysis-distribution-layout">
      <div class="income-analysis-distribution-main">
        <section class="income-analysis-chart-card income-analysis-distribution-chart">
          ${renderIncomeAnalysisChart(analysis, slices)}
        </section>
        ${renderIncomeAnalysisLabelFilter(analysis.labelDetails)}
      </div>
      ${renderIncomeAnalysisDistributionDetail(analysis.labelDetails)}
    </div>
  `;
}

function renderIncomeAnalysisDistributionDetail(details: IncomeAnalysisLabelDetails): string {
  return `
    <section class="income-analysis-detail-card income-analysis-distribution-detail">
      <h3>Einkommen</h3>
      <div class="income-analysis-detail-body income-analysis-label-income-list">
        ${
          details.availableGroups.length
            ? details.availableGroups.map(renderIncomeAnalysisLabelIncomeCard).join("")
            : incomeAnalysisEmpty("Keine sichtbaren Labels fuer diese Auswahl.")
        }
      </div>
    </section>
  `;
}

function renderIncomeAnalysisLabelIncomeCard(group: IncomeAnalysisLabelGroup): string {
  return `
    <article class="income-analysis-label-income-card">
      <span>${escapeHtml(group.labelText)}</span>
      <strong>${escapeHtml(money(group.net))}</strong>
    </article>
  `;
}

function renderIncomeAnalysisLabelFilter(details: IncomeAnalysisLabelDetails): string {
  if (!details.availableLabels.length) {
    return `
      <section class="income-analysis-label-filter-card">
        ${incomeAnalysisEmpty("Keine sichtbaren Labels fuer diese Auswahl.")}
      </section>
    `;
  }

  const selected = new Set(details.selectedLabels);
  return `
    <section class="income-analysis-label-filter-card" aria-label="Label-Auswahl">
      <div class="income-analysis-label-filter-row" aria-label="Label-Filter">
        ${details.availableLabels
          .map((label) => {
            const active = selected.has(label.id);
            return `
              <button
                class="position-label-filter-button income-analysis-label-filter-button${active ? " active" : ""}"
                type="button"
                data-action="toggle-income-analysis-label"
                data-income-analysis-label="${escapeHtml(label.id)}"
                aria-pressed="${active}"
                aria-label="Label ${escapeHtml(label.label)} ${active ? "deaktivieren" : "aktivieren"}"
                title="${escapeHtml(label.label)}"
              >
                ${positionIconSvg(label.icon)}
              </button>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function incomeAnalysisToggle(action: string, label: string, active: boolean): string {
  return `
    <button class="income-analysis-toggle${active ? " active" : ""}" type="button" data-action="${escapeHtml(action)}" aria-pressed="${active}">
      ${escapeHtml(label)}
    </button>
  `;
}

function incomeAnalysisMetricCard(label: string, value: string, detail: string): string {
  return `
    <article>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>
  `;
}

function incomeAnalysisBreakdownLine(slice: IncomeAnalysisSlice, totalGross: number): string {
  const share = totalGross > 0 ? (slice.value / totalGross) * 100 : 0;
  return `
    <div class="income-analysis-line">
      <span><i class="${escapeHtml(slice.tone)}"></i>${escapeHtml(slice.label)}</span>
      <strong>${escapeHtml(money(slice.value))}</strong>
      <small>${escapeHtml(percent(share))}</small>
    </div>
  `;
}

function renderIncomeAnalysisChart(analysis: IncomeAnalysisModel, slices: IncomeAnalysisSlice[]): string {
  if (!analysis.entries.length) return incomeAnalysisEmpty("Noch keine Jahreswerte fuer die Weltgrafik.");
  if (incomeTrackerUiState.analysisChartType === "pie") return renderIncomeAnalysisPie(analysis, slices);
  if (incomeTrackerUiState.analysisChartType === "bar") return renderIncomeAnalysisBars(slices);
  return renderIncomeAnalysisLineChart(analysis, incomeTrackerUiState.analysisChartType === "curve");
}

function renderIncomeAnalysisPie(analysis: IncomeAnalysisModel, slices: IncomeAnalysisSlice[]): string {
  const visible = slices.filter(incomeAnalysisSliceHasDisplayValue);
  if (!visible.length) return incomeAnalysisEmpty("Keine aufgeteilten Werte vorhanden.");
  const visibleTotal = visible.reduce((sum, slice) => sum + incomeAnalysisSliceChartValue(slice), 0);
  const ownTotal =
    incomeTrackerUiState.analysisDataView === "social"
      ? analysis.socialTotal
      : incomeTrackerUiState.analysisDataView === "deductions"
        ? analysis.totalDeductions
        : incomeTrackerUiState.analysisDataView === "taxes"
          ? analysis.taxTotal
          : visibleTotal;
  let cursor = 0;
  const gradient = visible
    .map((slice) => {
      const start = cursor;
      cursor += (incomeAnalysisSliceChartValue(slice) / Math.max(1, visibleTotal)) * 100;
      return `${incomeAnalysisToneColor(slice.tone)} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
    })
    .join(", ");
  const employerNote =
    (incomeTrackerUiState.analysisDataView === "social" || incomeTrackerUiState.analysisDataView === "deductions") && analysis.employerSocialTotal > 0
      ? `<small>Arbeitgeber separat ${escapeHtml(money(analysis.employerSocialTotal))}</small>`
      : "";
  return `
    <div class="income-analysis-pie-wrap">
      <div class="income-analysis-pie" style="background: conic-gradient(${gradient})">
        <strong>${escapeHtml(money(ownTotal))}</strong>
        <span>${escapeHtml(incomeAnalysisViewTitle())}</span>
        ${employerNote}
      </div>
    </div>
  `;
}

function renderIncomeAnalysisBars(slices: IncomeAnalysisSlice[]): string {
  const visible = slices.filter(incomeAnalysisSliceHasDisplayValue);
  if (!visible.length) return incomeAnalysisEmpty("Keine aufgeteilten Werte vorhanden.");
  const maxValue = Math.max(1, ...visible.map(incomeAnalysisSliceChartValue));
  return `
    <div class="income-analysis-bars">
      ${visible
        .map((slice) => {
          const height = Math.max(4, Math.round((incomeAnalysisSliceChartValue(slice) / maxValue) * 100));
          return `
            <div class="income-analysis-bar-column">
              <div><i class="${escapeHtml(slice.tone)}" style="height:${height}%"></i></div>
              <span>${escapeHtml(slice.label)}</span>
              <strong>${escapeHtml(money(slice.value))}</strong>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function incomeAnalysisSliceChartValue(slice: IncomeAnalysisSlice): number {
  return Math.abs(slice.chartValue ?? slice.value);
}

function incomeAnalysisSliceHasDisplayValue(slice: IncomeAnalysisSlice): boolean {
  return incomeAnalysisSliceChartValue(slice) >= 0.005;
}

function renderIncomeAnalysisLineChart(analysis: IncomeAnalysisModel, curved: boolean): string {
  const points =
    incomeTrackerUiState.analysisYearFilter === "all"
      ? analysis.yearPoints
      : analysis.yearPoints.filter((point) => point.year === incomeTrackerUiState.analysisYearFilter);
  const series = incomeAnalysisSeries(analysis, points);
  const years = incomeAnalysisSeriesYears(series);
  if (!years.length || !series.length) return incomeAnalysisEmpty("Keine Jahresentwicklung fuer diese Auswahl.");
  const values = series.flatMap((item) => item.values.map((point) => point.value));
  const maxValue = Math.max(1, ...values);
  const minYear = years[0] ?? 0;
  const maxYear = years[years.length - 1] ?? minYear;
  const width = 720;
  const height = 270;
  const left = 54;
  const right = width - 24;
  const top = 24;
  const bottom = height - 42;
  const xForYear = (year: number): number =>
    minYear === maxYear ? left + (right - left) / 2 : left + ((year - minYear) / (maxYear - minYear)) * (right - left);
  const yForValue = (value: number): number => bottom - (value / maxValue) * (bottom - top);
  return `
    <div class="income-analysis-svg-wrap">
      <svg class="income-analysis-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Wertentwicklung">
        <path class="axis" d="M${left} ${top}V${bottom}H${right}" />
        <path class="grid" d="M${left} ${(top + bottom) / 2}H${right}" />
        ${series
          .map((item) => {
            const coords = item.values.map((point) => ({ x: xForYear(point.year), y: yForValue(point.value) }));
            const path = curved ? curvedPath(coords) : linePath(coords);
            return `
              <path class="series ${escapeHtml(item.tone)}" d="${path}" />
              ${coords.map((point) => `<circle class="series-point ${escapeHtml(item.tone)}" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4" />`).join("")}
            `;
          })
          .join("")}
        ${years
          .map((year) => `<text x="${xForYear(year)}" y="${bottom + 24}" text-anchor="middle">${year}</text>`)
          .join("")}
      </svg>
      <div class="income-analysis-legend">
        ${series.map((item) => `<span><i class="${escapeHtml(item.tone)}"></i>${escapeHtml(item.label)}</span>`).join("")}
      </div>
    </div>
  `;
}

function incomeAnalysisEmpty(message: string): string {
  return `<div class="income-analysis-empty">${escapeHtml(message)}</div>`;
}

function incomeAnalysisToneColor(tone: string): string {
  const colors: Record<string, string> = {
    tax: "#b42318",
    social: "#3366cc",
    net: "#11795f",
    gross: "#64748b",
    deduction: "#b87514",
    employer: "#0f766e",
    gold: "#b87514",
    blue: "#1d4ed8",
    care: "#7c3aed",
    danger: "#b42318",
    refund: "#11795f",
    unassigned: "#737373"
  };
  return colors[tone] ?? "#1f7a68";
}

function incomeAnalysisLabelTone(index: number): string {
  const tones = ["net", "gross", "deduction", "tax", "social", "gold", "blue", "care", "employer", "unassigned"];
  return tones[index % tones.length];
}

function incomeAnalysisSlices(analysis: IncomeAnalysisModel): IncomeAnalysisSlice[] {
  return analysis.slicesByView[incomeTrackerUiState.analysisDataView].filter(incomeAnalysisSliceHasDisplayValue);
}

function incomeAnalysisSeries(analysis: IncomeAnalysisModel, points: IncomeAnalysisYearPoint[]): IncomeAnalysisSeriesItem[] {
  if (incomeTrackerUiState.analysisDataView === "label_distribution") return incomeAnalysisLabelSeries(analysis.labelDetails);
  const seriesByView: Record<Exclude<IncomeAnalysisDataView, "label_distribution">, Array<{ key: keyof IncomeAnalysisYearPoint; label: string; tone: string }>> = {
    deductions: [
      { key: "taxes", label: "Steuern", tone: "tax" },
      { key: "social", label: "Sozialabgaben", tone: "social" },
      { key: "employerSocial", label: "Arbeitgeberanteil", tone: "employer" },
      { key: "deductions", label: "Abgaben gesamt", tone: "deduction" }
    ],
    social: [
      { key: "social", label: "Arbeitnehmer", tone: "social" },
      { key: "employerSocial", label: "Arbeitgeber", tone: "employer" }
    ],
    taxes: [
      { key: "taxBase", label: "Steuerbasis", tone: "gross" },
      { key: "taxRefund", label: "Steuerrueckerstattung", tone: "refund" },
      { key: "taxPayment", label: "Steuernachzahlung", tone: "danger" },
      { key: "taxes", label: "Steuern netto", tone: "tax" }
    ],
    income: [
      { key: "gross", label: "Brutto", tone: "gross" },
      { key: "net", label: "Netto", tone: "net" },
      { key: "deductions", label: "Abgaben", tone: "deduction" }
    ]
  };
  const series = seriesByView[incomeTrackerUiState.analysisDataView]
    .map((item) => ({
      label: item.label,
      tone: item.tone,
      values: points.map((point) => ({ year: point.year, value: Number(point[item.key]) || 0 }))
    }));
  const hasPositiveTaxSeries = incomeTrackerUiState.analysisDataView === "taxes" && series.some((item) => item.values.some((point) => point.value > 0));
  return series.filter(
    (item) =>
      item.values.some((point) => point.value > 0) ||
      (hasPositiveTaxSeries && item.label === "Steuern netto")
  );
}

function incomeAnalysisLabelSeries(details: IncomeAnalysisLabelDetails): IncomeAnalysisSeriesItem[] {
  const years = incomeAnalysisSeriesYears([{ label: "", tone: "", values: details.yearPoints.map((point) => ({ year: point.year, value: point.net })) }]);
  return details.groups
    .map((group, index) => {
      const pointByYear = new Map(
        details.yearPoints
          .filter((point) => point.label === group.label)
          .map((point) => [point.year, point.net] as const)
      );
      return {
        label: group.labelText,
        tone: incomeAnalysisLabelTone(index),
        values: years.map((year) => ({ year, value: pointByYear.get(year) ?? 0 }))
      };
    })
    .filter((item) => item.values.some((point) => point.value > 0));
}

function incomeAnalysisSeriesYears(series: IncomeAnalysisSeriesItem[]): number[] {
  return [...new Set(series.flatMap((item) => item.values.map((point) => point.year)))].sort((a, b) => a - b);
}

function linePath(points: Array<{ x: number; y: number }>): string {
  if (!points.length) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function curvedPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return linePath(points);
  return points
    .map((point, index) => {
      if (index === 0) return `M${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
      const previous = points[index - 1];
      const controlX = (previous.x + point.x) / 2;
      return `C${controlX.toFixed(1)} ${previous.y.toFixed(1)}, ${controlX.toFixed(1)} ${point.y.toFixed(1)}, ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    })
    .join(" ");
}

function incomeAnalysisEntryTaxBase(entry: IncomeYearEntry): number {
  if (incomeTaxDeductionItemsTotal(entry.taxDeductionItems) === null) return numberValue(entry.taxesAndDeductions);
  return INCOME_TAX_DEDUCTION_ROWS.filter((row) => row.category === "taxes").reduce(
    (sum, row) => sum + numberValue(entry.taxDeductionItems[row.field]),
    0
  );
}

function incomeAnalysisTaxAdjustmentTotals(entries: IncomeYearEntry[]): { refund: number; payment: number } {
  return entries.reduce(
    (totals, entry) => {
      const amount = Math.max(0, numberValue(entry.taxAdjustment.amount));
      if (amount <= 0) return totals;
      if (entry.taxAdjustment.type === "payment") {
        totals.payment += amount;
      } else {
        totals.refund += amount;
      }
      return totals;
    },
    { refund: 0, payment: 0 }
  );
}

function buildIncomeAnalysisModel(model: IncomeTrackerModel, yearlyEntries: IncomeYearEntry[]): IncomeAnalysisModel {
  const activeEntries = yearlyEntries.filter((entry) => entry.active);
  const years = [...new Set(incomeVisibleYearEntries(activeEntries).map((entry) => entry.year))].sort((a, b) => a - b);
  if (incomeTrackerUiState.analysisYearFilter !== "all" && !years.includes(incomeTrackerUiState.analysisYearFilter)) {
    incomeTrackerUiState.analysisYearFilter = "all";
  }
  const entries = activeEntries.filter((entry) =>
    incomeTrackerUiState.analysisYearFilter === "all" ? true : entry.year === incomeTrackerUiState.analysisYearFilter
  );
  const visibleEntries = incomeVisibleYearEntries(entries);
  const totalNet = entries.reduce((sum, entry) => sum + numberValue(incomeYearEntryNetIncome(entry)), 0);
  const totalDeductions = entries.reduce((sum, entry) => sum + numberValue(incomeYearEntryTaxDeductions(entry)), 0);
  const totalGross = entries.reduce((sum, entry) => sum + incomeAnalysisGross(entry), 0);
  const taxSlices = incomeAnalysisTaxRows(visibleEntries, "taxes");
  const socialSlices = incomeAnalysisTaxRows(visibleEntries, "social");
  const employerSocialSlices = incomeAnalysisTaxRows(visibleEntries, "employer_social");
  const labelDetails = buildIncomeAnalysisLabelDetails(
    yearlyEntries,
    INCOME_YEAR_LABEL_OPTIONS,
    incomeTrackerUiState.analysisSelectedLabels,
    incomeTrackerUiState.analysisYearFilter
  );
  incomeTrackerUiState.analysisSelectedLabels = labelDetails.selectedLabels;
  const taxBaseTotal = entries.reduce((sum, entry) => sum + incomeAnalysisEntryTaxBase(entry), 0);
  const { refund: taxRefundTotal, payment: taxPaymentTotal } = incomeAnalysisTaxAdjustmentTotals(entries);
  const taxTotal = entries.reduce((sum, entry) => sum + incomeYearEntryTaxTotal(entry), 0);
  const socialTotal = incomeAnalysisTaxRows(entries, "social").reduce((sum, slice) => sum + slice.value, 0);
  const employerSocialTotal = incomeAnalysisTaxRows(entries, "employer_social").reduce((sum, slice) => sum + slice.value, 0);
  const unassignedDeductions = Math.max(0, totalDeductions - taxTotal - socialTotal);
  const deductionSlices = [
    { label: "Steuern", value: taxTotal, tone: "tax" },
    { label: "Sozialabgaben", value: socialTotal, tone: "social" },
    { label: "Arbeitgeberanteil", value: employerSocialTotal, tone: "employer" },
    { label: "Nicht aufgeteilt", value: unassignedDeductions, tone: "unassigned" }
  ];
  const incomeSlices = [
    { label: "Zum Leben verfuegbar", value: totalNet, tone: "net" },
    { label: "Steuern bezahlt", value: taxTotal, tone: "tax" },
    { label: "Sozialabgaben", value: socialTotal, tone: "social" },
    { label: "Nicht aufgeteilt", value: unassignedDeductions, tone: "unassigned" }
  ];
  const labelDistributionSlices = labelDetails.groups.map((group, index) => ({
    label: group.labelText,
    value: group.net,
    tone: incomeAnalysisLabelTone(index)
  }));
  return {
    entries,
    years,
    labelDetails,
    totalGross,
    totalNet,
    totalDeductions,
    taxBaseTotal,
    taxRefundTotal,
    taxPaymentTotal,
    taxTotal,
    socialTotal,
    employerSocialTotal,
    unassignedDeductions,
    slicesByView: {
      deductions: deductionSlices,
      social: [...socialSlices, ...employerSocialSlices],
      taxes: taxSlices,
      income: incomeSlices,
      label_distribution: labelDistributionSlices
    },
    yearPoints: buildIncomeAnalysisYearPoints(model, yearlyEntries)
  };
}

function incomeAnalysisTaxRows(entries: IncomeYearEntry[], category: "taxes" | "social" | "employer_social"): IncomeAnalysisSlice[] {
  const tones =
    category === "taxes"
      ? ["tax", "gold", "danger"]
      : category === "employer_social"
        ? ["employer"]
        : ["social", "blue", "care", "unassigned"];
  const slices: IncomeAnalysisSlice[] = INCOME_TAX_DEDUCTION_ROWS.filter((row) => row.category === category)
    .map((row, index) => ({
      label: incomeAnalysisTaxRowLabel(row),
      value: entries.reduce((sum, entry) => sum + numberValue(entry.taxDeductionItems[row.field]), 0),
      tone: tones[index % tones.length]
    }))
    .filter((slice) => slice.value > 0);
  if (category === "taxes") {
    const detailedTaxTotal = slices.reduce((sum, slice) => sum + slice.value, 0);
    const fallbackTaxBase = entries.reduce((sum, entry) => sum + incomeAnalysisEntryTaxBase(entry), 0) - detailedTaxTotal;
    if (fallbackTaxBase > 0.005) {
      slices.unshift({
        label: "Steuerbasis",
        value: fallbackTaxBase,
        tone: "gross"
      });
    }
    const { refund, payment } = incomeAnalysisTaxAdjustmentTotals(entries);
    if (refund > 0) {
      slices.push({
        label: "Steuerrueckerstattung",
        value: -refund,
        chartValue: refund,
        tone: "refund"
      });
    }
    if (payment > 0) {
      slices.push({
        label: "Steuernachzahlung",
        value: payment,
        chartValue: payment,
        tone: "danger"
      });
    }
  }
  return slices;
}

function buildIncomeAnalysisYearPoints(model: IncomeTrackerModel, yearlyEntries: IncomeYearEntry[]): IncomeAnalysisYearPoint[] {
  return model.valueYears.map((year) => {
    const entries = yearlyEntries.filter((entry) => entry.active && entry.year === year.year);
    const { refund: taxRefund, payment: taxPayment } = incomeAnalysisTaxAdjustmentTotals(entries);
    const taxes = entries.reduce((sum, entry) => sum + incomeYearEntryTaxTotal(entry), 0);
    const social = incomeAnalysisTaxRows(entries, "social").reduce((sum, slice) => sum + slice.value, 0);
    const employerSocial = incomeAnalysisTaxRows(entries, "employer_social").reduce((sum, slice) => sum + slice.value, 0);
    const deductions = entries.reduce((sum, entry) => sum + numberValue(incomeYearEntryTaxDeductions(entry)), 0);
    return {
      year: year.year,
      gross: entries.reduce((sum, entry) => sum + incomeAnalysisGross(entry), 0),
      net: year.annualNet ?? 0,
      deductions,
      taxBase: entries.reduce((sum, entry) => sum + incomeAnalysisEntryTaxBase(entry), 0),
      taxRefund,
      taxPayment,
      taxes,
      social,
      employerSocial
    };
  });
}

function incomeAnalysisTaxRowLabel(row: (typeof INCOME_TAX_DEDUCTION_ROWS)[number]): string {
  const label = row.label.replace(/^.*?\s/, "");
  if (row.field === "pensionInsurance") return `${label} (Arbeitnehmer)`;
  if (row.field === "employerPensionInsurance") return `${label} (Arbeitgeber)`;
  return label;
}

function incomeAnalysisGross(entry: IncomeYearEntry): number {
  const gross = numberValue(entry.annualGrossIncome);
  if (gross > 0) return gross;
  return numberValue(incomeYearEntryNetIncome(entry)) + numberValue(incomeYearEntryTaxDeductions(entry));
}

function incomeAnalysisViewTitle(): string {
  if (incomeTrackerUiState.analysisDataView === "social") return "Sozialabgaben";
  if (incomeTrackerUiState.analysisDataView === "taxes") return "Steuern";
  if (incomeTrackerUiState.analysisDataView === "income") return "Einkommen und Abgaben";
  if (incomeTrackerUiState.analysisDataView === "label_distribution") return "Einkommensverteilung";
  return "Abgabenmix";
}

function incomeVisibleYearEntries(entries: IncomeYearEntry[]): IncomeYearEntry[] {
  return entries.filter((entry) => entry.visible);
}
