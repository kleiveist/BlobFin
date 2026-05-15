import { MONTHS } from "../data/defaults";
import { labelForPayout } from "../lib/format";
import type { InvestmentSettings, ReservePosition } from "../types";

export function renderAppShell(): string {
  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">BlobFin Planung</p>
        <h1>Jahreskalkulator fuer Ruecklagen und Investment</h1>
      </div>
      <div class="header-actions">
        <button class="button secondary" type="button" data-action="reset">Grunddaten zuruecksetzen</button>
      </div>
    </header>

    <main class="app-main">
      <section class="workspace-grid">
        <form class="panel settings-panel" autocomplete="off">
          <div class="section-heading">
            <h2>Grunddaten</h2>
          </div>
          <div class="field-grid">
            ${numberField("year", "Jahr", "setting", "year", { min: 2000, max: 2100, step: 1 })}
            ${numberField("interestRatePercent", "Jahreszins Konto in %", "setting", "interestRatePercent", { min: 0, step: 0.01 })}
            ${numberField("cashbackRatePercent", "Cashback in %", "setting", "cashbackRatePercent", { min: 0, step: 0.01 })}
            ${numberField("emergencyFund", "Notgroschen separat", "setting", "emergencyFund", { min: 0, step: 1 })}
          </div>
        </form>

        <section class="panel summary-panel">
          <div class="section-heading">
            <h2>Ergebnis</h2>
          </div>
          <div class="summary-grid">
            ${metric("maxNeeded", "Max. benoetigter Kontostand", "ohne Notgroschen", true)}
            ${metric("maxNeededWithEmergencyFund", "Kontoziel inkl. Notgroschen", "Arbeitswert fuer Liquiditaet", true)}
            ${metric("yearEndBalance", "Dauerhafter Bestand Jahresende", "ohne temporaere Durchlaufbetraege", false)}
            ${metric("totalInterest", "Zinsen pro Jahr", "vereinfachte Tages-/Monatslogik", false)}
            ${metric("totalCashback", "Cashback pro Jahr", "nur Positionen mit Cashback", false)}
            ${metric("investmentNetWealthTop", "Vermoegen fuer Auszahlung", "nach Kapitalertragsteuer", true)}
            ${metric("investmentMonthlyPensionTop", "Monatliche Rente netto", "vereinfachte Entnahme", true)}
            ${metric("investmentRealWealthTop", "Reales Vermoegen", "inflationsbereinigt", false)}
          </div>
        </section>
      </section>

      <section class="panel">
        <div class="toolbar">
          <div class="section-heading">
            <h2>Kosten- und Ruecklagenpositionen</h2>
          </div>
          <div class="button-row">
            <button class="button" type="button" data-action="add-position">Position hinzufuegen</button>
            <button class="button secondary" type="button" data-action="import-positions">Positionen importieren</button>
            <button class="button secondary" type="button" data-action="export-positions">Positionen exportieren</button>
            <button class="button secondary" type="button" data-action="export-year">Jahrestabelle exportieren</button>
            <input class="visually-hidden" id="positionsCsvImport" type="file" accept=".csv,text/csv" />
          </div>
        </div>
        <div class="table-wrap position-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Aktiv</th>
                <th>Name</th>
                <th>Art</th>
                <th>Betrag</th>
                <th>Start</th>
                <th>Ende</th>
                <th>Abgang</th>
                <th>Abgangsmonat</th>
                <th>Tag</th>
                <th>Cashback</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="positionsBody"></tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <div class="section-heading">
          <h2>Jahrestabelle</h2>
        </div>
        <div class="table-wrap result-table-wrap">
          <table>
            <thead id="resultHead"></thead>
            <tbody id="resultBody"></tbody>
            <tfoot id="resultFoot"></tfoot>
          </table>
        </div>
      </section>

      <section class="panel investment-panel">
        <div class="section-heading">
          <h2>Investment- und Auszahlungsplanung</h2>
        </div>
        <div class="investment-grid">
          <div class="investment-selector">
            <h3>Investierbare Positionen</h3>
            <div id="investmentIncludeList" class="include-list"></div>
          </div>

          <div class="investment-controls">
            <div class="field-grid wide">
              ${numberField("birthYear", "Geburtsjahr", "investment", "birthYear", { min: 1962, max: 2009, step: 1 })}
              ${numberField("chartStartAge", "Startalter Grafik", "investment", "chartStartAge", { min: 0, max: 80, step: 1 })}
              ${retirementAgeField()}
              ${numberField("payoutEndAge", "Endalter", "investment", "payoutEndAge", { min: 70, max: 110, step: 1 })}
              ${withdrawalModeField()}
            </div>
            ${rangeField("investmentReturnPercent", "Jaehrliche Rendite", 0, 30, 0.1)}
            ${rangeField("capitalGainsTaxPercent", "Kapitalertragsteuer auf Wertzuwachs", 0, 50, 0.1)}
            ${rangeField("inflationRatePercent", "Inflation pro Jahr", 1, 10, 0.1)}
          </div>

          <div class="investment-visual">
            <section class="investment-chart-card" aria-label="Anlageentwicklung Grafik">
              <div class="investment-chart-header">
                <div class="investment-chart-title">Anlageentwicklung</div>
                <div class="investment-chart-metrics">
                  ${chartMetric("monthlyRateMetric", "Monatliche Investmentrate")}
                  ${chartMetric("wealthAtRetirementMetric", "Vermoegen zur Rente")}
                  ${chartMetric("monthlyPensionMetric", "Monatliche Rente netto")}
                  ${chartMetric("realWealthMetric", "Reales Vermoegen zur Rente")}
                </div>
              </div>
              <canvas id="investmentChart"></canvas>
              <div class="investment-legend">
                <span class="legend-item"><span class="legend-dot grey"></span> Eigenbeitrag</span>
                <span class="legend-item"><span class="legend-dot orange"></span> Zulagen</span>
                <span class="legend-item"><span class="legend-dot green"></span> Wertzuwachs</span>
                <span class="legend-item"><span class="legend-dot purple"></span> Restguthaben (Auszahlung)</span>
                <span class="legend-item"><span class="legend-dash"></span> Normales Depot</span>
              </div>
              <div class="investment-statistics">
                <div class="detail-list" aria-label="Berechnungsdetails">
                ${detailLine("Eigenbeitrag", "detailContribution")}
                ${detailLine("Wertzuwachs", "detailGrowth")}
                ${detailLine("Bruttovermoegen", "detailGrossWealth")}
                ${detailLine("Steuern", "detailTax")}
                ${detailLine("Vermoegen fuer Auszahlung", "detailNetWealth")}
                ${detailLine("Inflationsfaktor", "detailInflationFactor")}
                ${detailLine("Reales Vermoegen", "detailRealWealth")}
                </div>
                <div class="detail-list" aria-label="Auszahlung">
                ${detailLine("Alter heute", "detailAgeToday")}
                ${detailLine("Start Auszahlung", "detailPayoutStartAge")}
                ${detailLine("Ansparzeit", "detailSavingMonths")}
                ${detailLine("Monatliche Rente netto", "detailMonthlyPension")}
                ${detailLine("Monatliche Rente real", "detailRealMonthlyPension")}
                ${detailLine("Gewaehlte Monatsrate", "detailSelectedMonthlyRate")}
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  `;
}

export function positionTypeSelect(position: ReservePosition): string {
  return `
    <select data-position-id="${position.id}" data-position-field="type">
      <option value="fixed" ${position.type === "fixed" ? "selected" : ""}>Fixbestand</option>
      <option value="reserve" ${position.type === "reserve" ? "selected" : ""}>Monatliche Ruecklage</option>
      <option value="temporary" ${position.type === "temporary" ? "selected" : ""}>Temporaer monatlich</option>
    </select>
  `;
}

export function payoutSelect(position: ReservePosition): string {
  return `
    <select data-position-id="${position.id}" data-position-field="payoutType">
      <option value="none" ${position.payoutType === "none" ? "selected" : ""}>${labelForPayout("none")}</option>
      <option value="monthly" ${position.payoutType === "monthly" ? "selected" : ""}>${labelForPayout("monthly")}</option>
      <option value="yearly" ${position.payoutType === "yearly" ? "selected" : ""}>${labelForPayout("yearly")}</option>
    </select>
  `;
}

export function monthSelect(id: string, field: keyof ReservePosition, value: number): string {
  return `
    <select data-position-id="${id}" data-position-field="${field}">
      ${MONTHS.map((name, index) => {
        const month = index + 1;
        return `<option value="${month}" ${Number(value) === month ? "selected" : ""}>${name}</option>`;
      }).join("")}
    </select>
  `;
}

function numberField(
  id: string,
  label: string,
  scope: "setting" | "investment",
  key: string,
  options: { min: number; max?: number; step: number }
): string {
  const dataAttr = scope === "setting" ? `data-setting="${key}"` : `data-investment="${key}"`;
  return `
    <label class="field" for="${id}">
      <span>${label}</span>
      <input id="${id}" type="number" min="${options.min}" ${options.max ? `max="${options.max}"` : ""} step="${
        options.step
      }" ${dataAttr} />
    </label>
  `;
}

function rangeField(key: keyof InvestmentSettings, label: string, min: number, max: number, step: number): string {
  return `
    <label class="range-field">
      <span>${label}</span>
      <input type="range" min="${min}" max="${max}" step="${step}" data-investment="${key}" />
      <strong id="${key}Value">-</strong>
    </label>
  `;
}

function retirementAgeField(): string {
  return `
    <label class="field" for="retirementAge">
      <span>Rentenalter</span>
      <input id="retirementAge" type="number" min="50" max="85" step="1" data-retirement-age="true" />
    </label>
  `;
}

function withdrawalModeField(): string {
  return `
    <label class="field" for="withdrawalMode">
      <span>Auszahlung</span>
      <select id="withdrawalMode" data-investment="withdrawalMode">
        <option value="annuity">gleichmaessige Entnahme bis Endalter</option>
        <option value="fourPercent">4-%-Regel pro Jahr</option>
      </select>
    </label>
  `;
}

function chartMetric(id: string, label: string): string {
  return `
    <div class="chart-metric">
      <div class="chart-label">${label}</div>
      <div class="chart-value" id="${id}">-</div>
    </div>
  `;
}

function metric(id: string, label: string, hint: string, strong: boolean): string {
  return `
    <article class="metric ${strong ? "strong" : ""}">
      <span>${label}</span>
      <strong id="${id}">-</strong>
      <small id="${id}Hint">${hint}</small>
    </article>
  `;
}

function detailLine(label: string, id: string): string {
  return `<div class="detail-line"><span>${label}</span><strong id="${id}">-</strong></div>`;
}
