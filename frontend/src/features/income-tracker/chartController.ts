import { INCOME_YEAR_LABEL_OPTIONS } from "../../domain/incomeLabels";
import { INCOME_SOURCE_LABELS, incomeYearEntryNetIncome, type IncomeTrackerModel } from "../../domain/incomeTracker";
import { normalizeIncomeTaxRuleLabel } from "../../domain/incomeTaxRules";
import { escapeHtml, money, normalizeHeader, percent } from "../../lib/format";
import { positionIconSvg } from "../../lib/positionIcons";
import type { CareerMilestone, IncomeProjectionMode, IncomeYearEntry } from "../../types";
import { CAREER_MILESTONE_TYPE_OPTIONS } from "./config";
import { signedMoney, signedPercent } from "./exportController";

export function renderIncomeCharts(
  model: IncomeTrackerModel,
  visibleChartModel: IncomeTrackerModel,
  entries: IncomeYearEntry[],
  projectionMode: IncomeProjectionMode
): void {
  setIncomeChart("incomeAnnualChart", renderIncomeAnnualChart(visibleChartModel, entries));
  setIncomeChart("incomeGrowthChart", renderIncomeGrowthChart(visibleChartModel));
  setIncomeChart("incomeInflationChart", renderIncomeInflationChart(visibleChartModel));
  setIncomeChart("incomeRatioChart", renderIncomeRatioChart(visibleChartModel));
  setIncomeChart("incomeProjectionChart", renderIncomeProjectionChart(model, projectionMode));
}

function renderIncomeAnnualChart(model: IncomeTrackerModel, entries: IncomeYearEntry[]): string {
  if (!model.valueYears.length) return incomeChartEmpty("Noch keine Jahreswerte.");
  const items = model.valueYears
    .map((year) => {
      const segments = incomeAnnualChartSegments(year, entries);
      const value = segments.reduce((sum, segment) => sum + segment.value, 0);
      if (value < 0.005) return null;
      return {
        label: String(year.year),
        value,
        detail: year.source ? INCOME_SOURCE_LABELS[year.source] : "",
        tone: year.source === "annual_statement" ? "accent" : year.source === "manual" ? "gold" : "blue",
        markerHtml: incomeMilestoneChartMarkers(year.milestones),
        segments
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  if (!items.length) return incomeChartEmpty("Keine sichtbaren Jahreswerte.");
  const maxValue = Math.max(1, ...items.map((item) => item.value));
  return incomeStackedBarChart(items, maxValue);
}

function incomeMilestoneChartMarkers(milestones: CareerMilestone[]): string {
  if (!milestones.length) return "";
  return `
    <div class="income-chart-milestone-markers">
      ${milestones
        .slice(0, 4)
        .map((milestone) => {
          const meta = incomeMilestoneTypeMeta(milestone.type);
          return `<span title="${escapeHtml(meta.type)}">${positionIconSvg(meta.icon)}</span>`;
        })
        .join("")}
    </div>
  `;
}

function incomeAnnualChartSegments(
  year: IncomeTrackerModel["years"][number],
  entries: IncomeYearEntry[]
): Array<{ value: number; label: string; tone: string }> {
  const contributingEntries = entries
    .filter((entry) => {
      if (!entry.visible) return false;
      if (entry.year !== year.year) return false;
      if (year.source === "annual_statement") return entry.source === "annual_statement";
      if (year.source === "manual") return entry.source === "manual";
      return false;
    })
    .map((entry, index) => ({
      value: incomeYearEntryNetIncome(entry) ?? 0,
      label: incomeYearLabelMeta(entry.label).label,
      tone: `segment-${index % 5}`
    }))
    .filter((segment) => segment.value > 0);

  return contributingEntries;
}

function renderIncomeGrowthChart(model: IncomeTrackerModel): string {
  const values = model.valueYears.slice(1).map((year, index) => ({
    label: String(year.year),
    value: (year.annualNet ?? 0) - (model.valueYears[index].annualNet ?? 0),
    detail: `gegenueber ${model.valueYears[index].year}`,
    tone: (year.annualNet ?? 0) >= (model.valueYears[index].annualNet ?? 0) ? "good" : "danger",
    marker: ""
  }));
  if (!values.length) return incomeChartEmpty("Mindestens zwei Jahreswerte noetig.");
  const maxValue = Math.max(1, ...values.map((item) => Math.abs(item.value)));
  return incomeBarChart(values, maxValue, true);
}

function renderIncomeInflationChart(model: IncomeTrackerModel): string {
  const points = model.valueYears.filter((year) => year.realNet !== null);
  if (!points.length) return incomeChartEmpty("Keine Jahreswerte fuer Inflationsbereinigung.");
  const maxValue = Math.max(1, ...points.flatMap((year) => [year.annualNet ?? 0, year.realNet ?? 0]));
  return `
    <div class="income-grouped-chart">
      ${points
        .map(
          (year) => `
        <div class="income-group">
          <div class="income-paired-bars">
            ${incomeMiniBar(year.annualNet ?? 0, maxValue, "blue", "Nominal")}
            ${incomeMiniBar(year.realNet ?? 0, maxValue, "gold", "Real")}
          </div>
          <span>${year.year}</span>
          <div class="income-inflation-values">
            <small><b>Nominal</b>${escapeHtml(money(year.annualNet ?? 0))}</small>
            <small><b>Real</b>${escapeHtml(money(year.realNet ?? 0))}</small>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
    <div class="income-chart-legend"><span class="blue"></span>Nominal <span class="gold"></span>Real</div>
  `;
}

function renderIncomeRatioChart(model: IncomeTrackerModel): string {
  if (!model.ratioYears.length) return incomeChartEmpty("Keine Brutto-/Netto-Kombination vorhanden.");
  const maxValue = Math.max(100, ...model.ratioYears.map((year) => year.netRatio ?? 0));
  return incomeBarChart(
    model.ratioYears.map((year) => ({
      label: String(year.year),
      value: year.netRatio ?? 0,
      detail: "Nettoquote",
      tone: "accent",
      marker: ""
    })),
    maxValue,
    false,
    (value) => percent(value)
  );
}

function renderIncomeProjectionChart(model: IncomeTrackerModel, projectionMode: IncomeProjectionMode): string {
  if (projectionMode === "off") return incomeChartEmpty("Projektion ist deaktiviert.");
  if (!model.projection.points.length) return incomeChartEmpty("Keine nutzbare Projektionsrate vorhanden.");
  const maxValue = Math.max(1, ...model.projection.points.map((point) => point.value), ...model.valueYears.map((year) => year.annualNet ?? 0));
  const items = model.projection.points.map((point) => {
    const offset = point.year - (model.latest?.year ?? point.year);
      return {
        label: String(point.year),
        value: point.value,
        detail: incomeProjectionPointDetail(offset),
        tone: offset < 0 ? "blue" : point.projected ? "warning" : "accent",
        marker: ""
      };
  });
  return `
    <div class="income-projection-chart">
      ${incomeBarChart(items, maxValue)}
      ${incomeProjectionGrowthArrows(model)}
    </div>
  `;
}

function incomeProjectionPointDetail(offsetYears: number): string {
  if (offsetYears === 0) return "Ist";
  return "";
}

function incomeProjectionGrowthArrows(model: IncomeTrackerModel): string {
  const points = model.projection.points;
  const currentYear = model.latest?.year ?? null;
  if (currentYear === null || points.length < 3) return "";
  const transitions = [
    { fromOffset: -10, toOffset: -5 },
    { fromOffset: -5, toOffset: 0 },
    { fromOffset: 0, toOffset: 5 },
    { fromOffset: 5, toOffset: 10 },
    { fromOffset: 10, toOffset: 15 }
  ];
  const arrows = transitions
    .map((transition) => {
      const fromIndex = points.findIndex((point) => point.year === currentYear + transition.fromOffset);
      const toIndex = points.findIndex((point) => point.year === currentYear + transition.toOffset);
      const from = points[fromIndex];
      const to = points[toIndex];
      if (fromIndex < 0 || toIndex < 0 || toIndex <= fromIndex || !from || !to || from.value <= 0) return "";
      const growthPercent = ((to.value - from.value) / from.value) * 100;
      return `
        <span class="income-projection-growth-arrow" style="grid-column: ${fromIndex + 1}">
          <b>${escapeHtml(signedPercent(growthPercent))}</b>
        </span>
      `;
    })
    .join("");
  if (!arrows.trim()) return "";
  return `<div class="income-projection-growth-row" style="--income-projection-gap-count: ${Math.max(1, points.length - 1)}">${arrows}</div>`;
}

function setIncomeChart(id: string, html: string): void {
  const host = document.querySelector<HTMLDivElement>(`#${id}`);
  if (host) host.innerHTML = html;
}

function incomeBarChart(
  items: Array<{ label: string; value: number; detail: string; tone: string; marker: string }>,
  maxValue: number,
  signed = false,
  formatter: (value: number) => string = money
): string {
  return `
    <div class="income-bar-chart" style="--income-bar-count: ${Math.max(1, items.length)}">
      ${items
        .map((item) => {
          const height = Math.max(3, Math.round((Math.abs(item.value) / Math.max(1, maxValue)) * 100));
          const negative = item.value < 0 ? " negative" : "";
          return `
            <div class="income-bar-column">
              <div class="income-bar-track">
                ${item.marker ? `<span class="income-chart-marker">${escapeHtml(item.marker)}</span>` : ""}
                <i class="income-bar ${escapeHtml(item.tone)}${negative}" style="height: ${height}%"></i>
              </div>
              <span>${escapeHtml(item.label)}</span>
              <strong>${signed ? signedMoney(item.value) : escapeHtml(formatter(item.value))}</strong>
              <small>${escapeHtml(item.detail)}</small>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function incomeStackedBarChart(
  items: Array<{
    label: string;
    value: number;
    detail: string;
    tone: string;
    markerHtml: string;
    segments: Array<{ value: number; label: string; tone: string }>;
  }>,
  maxValue: number
): string {
  return `
    <div class="income-bar-chart" style="--income-bar-count: ${Math.max(1, items.length)}">
      ${items
        .map((item) => {
          const totalHeight = Math.max(3, Math.round((Math.abs(item.value) / Math.max(1, maxValue)) * 100));
          const segments = item.segments.length
            ? item.segments
            : [{ value: item.value, label: item.detail, tone: item.tone }];
          return `
            <div class="income-bar-column">
              <div class="income-bar-track">
                ${item.markerHtml}
                <div class="income-bar-stack" style="height: ${totalHeight}%">
                  ${segments
                    .map((segment) => {
                      const height = Math.max(3, Math.round((segment.value / Math.max(1, item.value)) * 100));
                      return `<i class="income-bar-segment ${escapeHtml(segment.tone)}" style="height: ${height}%" title="${escapeHtml(
                        `${segment.label}: ${money(segment.value)}`
                      )}"></i>`;
                    })
                    .join("")}
                </div>
              </div>
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(money(item.value))}</strong>
              <small>${escapeHtml(segments.length > 1 ? `${segments.length} Eintraege` : item.detail)}</small>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function incomeMiniBar(value: number, maxValue: number, tone: string, label: string): string {
  const height = Math.max(3, Math.round((value / Math.max(1, maxValue)) * 100));
  return `<i class="income-bar ${escapeHtml(tone)}" style="height: ${height}%" title="${escapeHtml(label)} ${escapeHtml(money(value))}"></i>`;
}

function incomeChartEmpty(message: string): string {
  return `<div class="chart-empty">${escapeHtml(message)}</div>`;
}

function incomeYearLabel(value: string | undefined): string {
  const normalized = normalizeIncomeTaxRuleLabel(String(value ?? "").trim());
  if (INCOME_YEAR_LABEL_OPTIONS.some((option) => option.id === normalized)) return normalized;
  const byLabel = INCOME_YEAR_LABEL_OPTIONS.find((option) => incomeLabelKey(option.label) === incomeLabelKey(normalized));
  return byLabel?.id ?? "salary";
}

function incomeYearLabelMeta(value: string | undefined): { id: string; label: string; icon: string; description: string } {
  return INCOME_YEAR_LABEL_OPTIONS.find((option) => option.id === incomeYearLabel(value)) ?? INCOME_YEAR_LABEL_OPTIONS[0];
}

function incomeLabelKey(value: string): string {
  return normalizeHeader(value);
}

function incomeMilestoneTypeMeta(type: string): { type: string; icon: string; description: string } {
  return CAREER_MILESTONE_TYPE_OPTIONS.find((option) => option.type === type) ?? CAREER_MILESTONE_TYPE_OPTIONS[0];
}
