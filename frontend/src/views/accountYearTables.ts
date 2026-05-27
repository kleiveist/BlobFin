import { calculateReserveSummary, calculateYearTableFooterValue } from "../domain/reserveCalculator";
import { escapeHtml, intNumber, makeHeaderLabel, money } from "../lib/format";
import { normalizePositionIcon, positionIconSvg } from "../lib/positionIcons";
import type { PlanningAccount, PlanningAccountType, PlanningSettings, ReservePosition, ReserveSummary } from "../types";

export interface AccountYearTableOverviewOptions {
  accounts: PlanningAccount[];
  settings: PlanningSettings;
  activeAccountId: string;
  showMaxNeeded: boolean;
}

export function renderAccountYearTableOverview(options: AccountYearTableOverviewOptions): string {
  const { accounts, settings, activeAccountId, showMaxNeeded } = options;
  if (accounts.length === 0) {
    return '<div class="chart-empty">Noch kein Konto vorhanden.</div>';
  }

  return accounts
    .map((account) => {
      const summary = calculateReserveSummary(settings, account.yearlyRows);
      return renderAccountYearTableCard({
        account,
        summary,
        settings,
        active: account.id === activeAccountId,
        showMaxNeeded
      });
    })
    .join("");
}

interface AccountYearTableCardOptions {
  account: PlanningAccount;
  summary: ReserveSummary;
  settings: PlanningSettings;
  active: boolean;
  showMaxNeeded: boolean;
}

function renderAccountYearTableCard(options: AccountYearTableCardOptions): string {
  const { account, summary, settings, active, showMaxNeeded } = options;
  const activeBadge = active ? '<span class="account-year-table-badge">Aktiv</span>' : "";
  const activeAction = active
    ? '<span class="account-year-table-active-note">Aktives Konto fuer Grafik, Export und Bearbeitung</span>'
    : `<button class="button secondary" type="button" data-action="select-planning-account-${escapeHtml(account.id)}">Als aktiv setzen</button>`;

  return `
    <article class="account-year-table-card ${active ? "active" : ""}">
      <div class="account-year-table-head">
        <div>
          <div class="account-year-table-title">
            <h3>${escapeHtml(account.name)}</h3>
            ${activeBadge}
          </div>
          <p>${escapeHtml(accountTypeLabel(account.type))} | ${intNumber(account.yearlyRows.length)} Positionen</p>
        </div>
        <div class="account-year-table-actions">
          ${activeAction}
        </div>
      </div>
      <div class="account-year-table-metrics">
        ${accountYearMetric("Rest im Jahr", money(summary.yearlyRemaining), summary.yearlyRemaining)}
        ${accountYearMetric("Bestand Jahresende", money(summary.yearEndBalance), summary.yearEndBalance)}
        ${accountYearMetric("Zinsen", money(summary.totalInterest), summary.totalInterest)}
        ${accountYearMetric("Cashback", money(summary.totalCashback), summary.totalCashback)}
      </div>
      ${renderYearTableMarkup(summary, settings.year, showMaxNeeded)}
    </article>
  `;
}

function renderYearTableMarkup(summary: ReserveSummary, year: number, showMaxNeeded: boolean): string {
  const maxNeededHead = showMaxNeeded
    ? '<th class="result-max-needed-col"><span class="split-header">Max. Bedarf<span>Monatsanfang</span></span></th>'
    : "";
  const maxNeededFoot = showMaxNeeded ? `<th class="result-max-needed-col">${money(summary.maxRow.maxNeeded)}</th>` : "";

  return `
    <div class="table-wrap result-table-wrap account-year-table-wrap">
      <table>
        <thead>
          <tr>
            <th class="month-col">Monat</th>
            ${summary.visiblePositions.map((position) => `<th>${positionHeaderLabel(position)}</th>`).join("")}
            <th class="result-compact-col">Einnahmen</th>
            <th class="result-compact-col">Ausgaben</th>
            <th>Netto uebrig</th>
            ${maxNeededHead}
            <th class="result-permanent-col"><span class="split-header">Dauerhafter<span>Bestand</span></span></th>
            <th class="result-interest-col"><span class="split-header">ca.<span>Monatszins</span></span></th>
            <th>Cashback</th>
          </tr>
        </thead>
        <tbody>
          ${summary.rows
            .map(
              (row) => `
                <tr>
                  <td>${row.month}</td>
                  ${summary.visiblePositions.map((position) => `<td>${money(row.values[position.id] || 0)}</td>`).join("")}
                  <td class="positive result-compact-col">${money(row.plannedIncome)}</td>
                  <td class="result-compact-col">${money(row.plannedOutflow)}</td>
                  <td class="${amountClass(row.monthlyRemaining)}">${money(row.monthlyRemaining)}</td>
                  ${showMaxNeeded ? `<td class="result-max-needed-col">${money(row.maxNeeded)}</td>` : ""}
                  <td class="result-permanent-col">${money(row.permanentAfterMonthlyOutflows)}</td>
                  <td class="positive result-interest-col">${money(row.monthlyInterest)}</td>
                  <td class="positive">${money(row.monthlyCashback)}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
        <tfoot>
          <tr>
            <th>Summe / Maximum</th>
            ${summary.visiblePositions
              .map((position) => `<th>${money(positionFooterValue(position, summary, year))}</th>`)
              .join("")}
            <th class="positive result-compact-col">${money(summary.totalPlannedIncome)}</th>
            <th class="result-compact-col">${money(summary.totalPlannedOutflow)}</th>
            <th class="${amountClass(summary.yearlyRemaining)}">${money(summary.yearlyRemaining)}</th>
            ${maxNeededFoot}
            <th class="result-permanent-col">${money(summary.yearEndBalance)}</th>
            <th class="positive result-interest-col">${money(summary.totalInterest)}</th>
            <th class="positive">${money(summary.totalCashback)}</th>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

function accountYearMetric(label: string, value: string, rawValue: number): string {
  return `
    <div class="account-year-table-metric">
      <span>${label}</span>
      <strong class="${amountClass(rawValue)}">${value}</strong>
    </div>
  `;
}

function positionFooterValue(position: ReservePosition, summary: ReserveSummary, year: number): number {
  return calculateYearTableFooterValue(position, summary.rows, year);
}

function positionHeaderLabel(position: ReservePosition): string {
  return `
    <span class="result-position-heading">
      ${positionIconSvg(normalizePositionIcon(position.icon))}
      <span>${makeHeaderLabel(position.name)}</span>
    </span>
  `;
}

function amountClass(value: number): string {
  if (value < 0) return "negative";
  if (value > 0) return "positive";
  return "";
}

function accountTypeLabel(type: PlanningAccountType): string {
  if (type === "cost_reserve") return "Kosten/Ruecklagen";
  if (type === "annual_table") return "Jahrestabelle";
  return "Gemischt";
}
