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
        <div class="app-settings">
          <button
            class="settings-button"
            type="button"
            data-action="toggle-theme-settings"
            aria-label="Einstellungen"
            aria-controls="themeSettingsPanel"
            aria-expanded="false"
            title="Einstellungen"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
              <path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Zm8.3 4.8c.1-.4.1-.7.1-1s0-.6-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.7-1L16 3.4h-4l-.4 2.6a7 7 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.7 7.7 0 0 0 0 2l-2 1.5 2 3.5 2.4-1c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.2 1.2-.6 1.7-1l2.4 1 2-3.5-2.2-1.5Z" />
            </svg>
          </button>
          <div id="themeSettingsPanel" class="settings-popover" role="dialog" aria-label="Darstellung" hidden>
            <div class="settings-popover-head">
              <strong>Darstellung</strong>
              <button class="chart-popup-close" type="button" data-action="close-theme-settings" aria-label="Einstellungen schliessen">x</button>
            </div>
            <div class="theme-options" role="radiogroup" aria-label="Farbmodus">
              <button class="theme-option" type="button" data-action="set-theme-light" aria-pressed="false">
                <span class="theme-swatch light"></span>
                <span>Hell</span>
              </button>
              <button class="theme-option" type="button" data-action="set-theme-dark" aria-pressed="false">
                <span class="theme-swatch dark"></span>
                <span>Dunkel</span>
              </button>
            </div>
            <div class="settings-danger-zone">
              <button class="button danger" type="button" data-action="reset">Grunddaten zuruecksetzen</button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="app-main">
      <section class="workspace-grid">
        <form class="panel settings-panel" autocomplete="off">
          <div class="section-heading">
            <h2>Grunddaten</h2>
          </div>
          <div class="field-grid settings-field-grid">
            ${numberField("year", "Jahr", "setting", "year", { min: 2000, max: 2100, step: 1 })}
            ${numberField("monthlyNetIncome", "Monatliches Nettoeinkommen", "setting", "monthlyNetIncome", { min: 0, step: 0.01 })}
            ${numberField("interestRatePercent", "Jahreszins Konto in %", "setting", "interestRatePercent", { min: 0, step: 0.01 })}
            ${numberField("cashbackRatePercent", "Cashback in %", "setting", "cashbackRatePercent", { min: 0, step: 0.01 })}
          </div>
        </form>

        <section class="panel summary-panel">
          <div class="section-heading">
            <h2>Ergebnis</h2>
          </div>
          <div class="summary-grid">
            ${metric("maxNeeded", "Max. benoetigter Kontostand", "monatlicher Spitzenbedarf", true)}
            ${metric("yearEndBalance", "Dauerhafter Bestand Jahresende", "ohne temporaere Durchlaufbetraege", false)}
            ${metric("totalInterest", "Zinsen pro Jahr", "vereinfachte Tages-/Monatslogik", false)}
            ${metric("totalCashback", "Cashback pro Jahr", "nur Positionen mit Cashback", false)}
            ${metric("minMonthlyRemaining", "Niedrigster Monatsrest", "Nettoeinkommen minus Positionen", true)}
            ${metric("yearlyRemaining", "Rest im Jahr", "Nettoeinkommen minus Positionen", false)}
            ${metric("investmentNetWealthTop", "Vermoegen fuer Auszahlung", "Steuer erst bei Entnahme", true)}
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
            <span id="exportStatus" class="export-status" aria-live="polite"></span>
          </div>
        </div>
        <div class="table-wrap position-table-wrap">
          <table class="position-table">
            <thead>
              <tr>
                <th class="reorder-col"></th>
                <th>Aktiv</th>
                <th>View</th>
                <th>Name</th>
                <th>Art</th>
                <th class="amount-col">Betrag</th>
                <th>Start</th>
                <th>Ende</th>
                <th>Abgang</th>
                <th>Abgangsmonat</th>
                <th class="day-col">Tag</th>
                <th class="interest-toggle-col">Zinsen</th>
                <th class="cashback-toggle-col">Cashback</th>
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
            <div class="include-special-toggles">
              <button class="include-transfer-toggle" type="button" data-action="toggle-interest-investment" aria-pressed="false">
                <span>Zinsen in Altersvorsorge</span>
                <strong id="interestInvestmentAmount">-</strong>
              </button>
              <button class="include-transfer-toggle" type="button" data-action="toggle-cashback-investment" aria-pressed="false">
                <span>Cashback in Altersvorsorge</span>
                <strong id="cashbackInvestmentAmount">-</strong>
              </button>
            </div>
            <div id="investmentIncludeList" class="include-list"></div>
          </div>

          <div class="investment-controls">
            <div class="investment-control-top">
              <aside class="savings-rate-card" aria-label="Sparrate">
                <span>Jaehrliche Sparrate</span>
                <strong id="annualSavingsRateMetric">-</strong>
                <small id="monthlySavingsRateMetric">-</small>
              </aside>
            </div>
            <div class="investment-control-grid">
              <div class="investment-input-grid">
                ${numberField("birthYear", "Geburtsjahr", "investment", "birthYear", { min: 1962, max: 2009, step: 1 })}
                ${numberField("chartStartAge", "Startalter Grafik", "investment", "chartStartAge", { min: 0, max: 80, step: 1 })}
                ${retirementAgeField()}
                ${numberField("payoutEndAge", "Endalter", "investment", "payoutEndAge", { min: 70, max: 110, step: 1 })}
                ${numberField("percentageWithdrawalStartAge", "Entnahme ab Alter", "investment", "percentageWithdrawalStartAge", { min: 0, max: 110, step: 1 })}
                ${numberField("percentageWithdrawalRatePercent", "Prozent-Entnahme p. a.", "investment", "percentageWithdrawalRatePercent", { min: 0, max: 20, step: 0.1 })}
              </div>
              <div class="investment-range-panel">
                ${rangeField("investmentReturnPercent", "Jaehrliche Rendite", 0, 30, 0.1)}
                ${rangeField("capitalGainsTaxPercent", "Kapitalertragsteuer auf Wertzuwachs", 0, 50, 0.1)}
                ${rangeField("inflationRatePercent", "Inflation pro Jahr", 1, 10, 0.1)}
              </div>
            </div>
          </div>

          <div class="investment-visual">
            <section class="investment-chart-card" aria-label="Anlageentwicklung Grafik">
              <div class="investment-chart-header">
                <div class="investment-chart-title">Anlageentwicklung</div>
                <div class="investment-chart-metrics">
                  ${chartMetric("monthlyRateMetric", "Monatliche Investmentrate")}
                  ${chartMetric("wealthAtRetirementMetric", "Vermoegen zur Rente")}
                  ${chartMetric("withdrawalGainMetric", "Monatlicher Zugewinn durch Entnahme")}
                  ${chartMetric("monthlyPensionMetric", "Monatliche Rente netto")}
                  ${chartMetric("realWealthMetric", "Reales Vermoegen zur Rente")}
                </div>
              </div>
              <canvas id="investmentChart"></canvas>
              <div id="investmentChartPopup" class="investment-chart-popup" role="dialog" aria-label="Balkendetails" hidden></div>
              <div class="investment-legend">
                <span class="legend-item"><span class="legend-dot grey"></span> Eigenbeitrag</span>
                <span class="legend-item"><span class="legend-dot orange"></span> Zulagen</span>
                <span class="legend-item"><span class="legend-dot green"></span> Wertzuwachs</span>
                <span class="legend-item"><span class="legend-dot purple"></span> Restguthaben (Auszahlung)</span>
                <span class="legend-item"><span class="legend-dot red"></span> Kapitalertragsteuer</span>
                <span class="legend-item"><span class="legend-dash"></span> Normales Depot</span>
              </div>
              <div class="investment-statistics">
                <div class="detail-list" aria-label="Berechnungsdetails">
                ${detailLine("Eingezahlter Eigenbeitrag", "detailContribution")}
                ${detailLine("Verbleibender Eigenbeitrag", "detailCostBasis")}
                ${detailLine("Nicht realisierter Wertzuwachs", "detailGrowth")}
                ${detailLine("Bruttovermoegen", "detailGrossWealth")}
                ${detailLine("Realisierte Steuern bis Rente", "detailTax")}
                ${detailLine("Offene Steuer bei Verkauf zur Rente", "detailUnrealizedTax")}
                ${detailLine("Depotwert nach Komplettverkauf", "detailLiquidationWealth")}
                ${detailLine("Depotwert fuer Auszahlung", "detailNetWealth")}
                ${detailLine("Inflationsfaktor", "detailInflationFactor")}
                ${detailLine("Reales Vermoegen", "detailRealWealth")}
                </div>
                <div class="detail-list" aria-label="Auszahlung">
                ${detailLine("Jaehrliche Sparrate", "detailAnnualSavingsRate")}
                ${detailLine("Alter heute", "detailAgeToday")}
                ${detailLine("Gleichmaessige Entnahme ab Alter", "detailPayoutStartAge")}
                ${detailLine("Entnahme ab Alter", "detailPercentageWithdrawalStartAge")}
                ${detailLine("Prozent-Entnahme p. a.", "detailPercentageWithdrawalRate")}
                ${detailLine("Monatliche Prozent-Entnahme", "detailPercentageWithdrawalMonthly")}
                ${detailLine("Jaehrliche Prozent-Entnahme", "detailPercentageWithdrawalAnnual")}
                ${detailLine("Ansparzeit", "detailSavingMonths")}
                ${detailLine("Monatliche gleichmaessige Entnahme netto", "detailMonthlyPension")}
                ${detailLine("Monatliche gleichmaessige Entnahme real", "detailRealMonthlyPension")}
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
      <option value="temporary" ${position.type === "temporary" ? "selected" : ""}>Temporaer</option>
      <option value="savings" ${position.type === "savings" ? "selected" : ""}>Sparrate</option>
    </select>
  `;
}

export function payoutSelect(position: ReservePosition): string {
  return `
    <select data-position-id="${position.id}" data-position-field="payoutType">
      <option value="none" ${position.payoutType === "none" ? "selected" : ""}>${labelForPayout("none")}</option>
      <option value="monthly" ${position.payoutType === "monthly" ? "selected" : ""}>${labelForPayout("monthly")}</option>
      <option value="yearly" ${position.payoutType === "yearly" ? "selected" : ""}>${labelForPayout("yearly")}</option>
      <option value="once" ${position.payoutType === "once" ? "selected" : ""}>${labelForPayout("once")}</option>
    </select>
  `;
}

export function monthSelect(id: string, field: keyof ReservePosition, value: number, disabled = false): string {
  return `
    <select data-position-id="${id}" data-position-field="${field}" ${disabled ? "disabled" : ""}>
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
