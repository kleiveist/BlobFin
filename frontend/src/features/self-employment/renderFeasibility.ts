import { escapeHtml, intNumber, money } from "../../lib/format";
import type { SelfEmploymentProjectEvaluation } from "./feasibilityController";
import {
  hoursLabel,
  selfEmploymentFeasibilityLabel,
  selfEmploymentRiskLabel
} from "./feasibilityController";

export function selfEmploymentMetric(label: string, value: string, detail: string): string {
  return `
    <article class="metric-card self-employment-metric">
      <span class="metric-label">${escapeHtml(label)}</span>
      <strong class="metric-value">${escapeHtml(value)}</strong>
      <small class="metric-detail">${escapeHtml(detail)}</small>
    </article>
  `;
}

export function selfEmploymentStatusChart(evaluations: SelfEmploymentProjectEvaluation[]): string {
  const total = Math.max(1, evaluations.length);
  const realistic = evaluations.filter((evaluation) => evaluation.feasibility === "realistic").length;
  const borderline = evaluations.filter((evaluation) => evaluation.feasibility === "borderline").length;
  const realisticEnd = (realistic / total) * 100;
  const borderlineEnd = realisticEnd + (borderline / total) * 100;
  return `
    <article class="self-employment-chart-card">
      <h3>Projektstatus</h3>
      <div
        class="self-employment-donut"
        style="background: conic-gradient(var(--accent) 0 ${realisticEnd}%, var(--gold) ${realisticEnd}% ${borderlineEnd}%, var(--danger) ${borderlineEnd}% 100%)"
        aria-hidden="true"
      ></div>
      <div class="self-employment-legend">
        <span><i class="realistic"></i>Realistisch ${intNumber(realistic)}</span>
        <span><i class="borderline"></i>Grenzwertig ${intNumber(borderline)}</span>
        <span><i class="unrealistic"></i>Unrealistisch ${intNumber(total - realistic - borderline)}</span>
      </div>
    </article>
  `;
}

export function selfEmploymentBarChart(
  title: string,
  evaluations: SelfEmploymentProjectEvaluation[],
  kind: "time" | "profit"
): string {
  const maxValue = Math.max(
    1,
    ...evaluations.map((evaluation) =>
      kind === "time" ? evaluation.weeklyTimeDemand : Math.max(0, evaluation.monthlyProfitAfterReserve)
    )
  );
  return `
    <article class="self-employment-chart-card">
      <h3>${escapeHtml(title)}</h3>
      <div class="self-employment-bars">
        ${evaluations
          .map((evaluation) => {
            const value =
              kind === "time" ? evaluation.weeklyTimeDemand : Math.max(0, evaluation.monthlyProfitAfterReserve);
            const width = Math.max(4, Math.min(100, (value / maxValue) * 100));
            return `
              <div class="self-employment-bar-row">
                <span>${escapeHtml(evaluation.project.name)}</span>
                <div><i style="width:${width}%"></i></div>
                <strong>${kind === "time" ? hoursLabel(value) : money(value)}</strong>
              </div>
            `;
          })
          .join("")}
      </div>
    </article>
  `;
}

export function selfEmploymentFeasibilityPanel(evaluations: SelfEmploymentProjectEvaluation[]): string {
  return `
    <article class="self-employment-chart-card">
      <h3>Ampel Machbarkeit</h3>
      <div class="self-employment-feasibility-list">
        ${evaluations
          .map(
            (evaluation) => `
              <div class="self-employment-feasibility-item ${escapeHtml(evaluation.feasibility)}">
                <strong>${escapeHtml(evaluation.project.name)}</strong>
                <span>${escapeHtml(selfEmploymentFeasibilityLabel(evaluation.feasibility))}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </article>
  `;
}

export function selfEmploymentTable(
  title: string,
  columns: string[],
  evaluations: SelfEmploymentProjectEvaluation[],
  rowRenderer: (evaluation: SelfEmploymentProjectEvaluation) => string
): string {
  return `
    <article class="self-employment-table-card">
      <h3>${escapeHtml(title)}</h3>
      <table>
        <thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
        <tbody>${evaluations.map(rowRenderer).join("")}</tbody>
      </table>
    </article>
  `;
}

export function riskTableRow(evaluation: SelfEmploymentProjectEvaluation): string {
  return `
    <tr>
      <td>${escapeHtml(evaluation.project.name)}</td>
      <td>${escapeHtml(selfEmploymentRiskLabel(evaluation.project.risk))}</td>
      <td>${escapeHtml(selfEmploymentFeasibilityLabel(evaluation.feasibility))}</td>
    </tr>
  `;
}

export function investmentTableRow(evaluation: SelfEmploymentProjectEvaluation): string {
  return `
    <tr>
      <td>${escapeHtml(evaluation.project.name)}</td>
      <td>${money(evaluation.project.startCapitalRequired)}</td>
      <td>${money(evaluation.fundingGap)}</td>
    </tr>
  `;
}

export function profitTableRow(evaluation: SelfEmploymentProjectEvaluation): string {
  return `
    <tr>
      <td>${escapeHtml(evaluation.project.name)}</td>
      <td>${money(evaluation.project.monthlyRevenueExpected)}</td>
      <td>${money(evaluation.monthlyProfitAfterReserve)}</td>
    </tr>
  `;
}
