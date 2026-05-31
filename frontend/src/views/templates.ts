import { MONTHS } from "../data/defaults";
import { labelForPayout } from "../lib/format";
import { normalizePositionIcon, positionIconLabel, positionIconSvg } from "../lib/positionIcons";
import { positionFlow } from "../lib/positionKinds";
import type { InvestmentSettings, ReservePosition } from "../types";

export function renderAppShell(): string {
  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">BlobFin Planung</p>
        <h1>Modularer Finanzplaner fuer Konten, Investment und Immobilien</h1>
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
          <div id="themeSettingsPanel" class="settings-popover" role="dialog" aria-label="Darstellung und Grunddaten" hidden>
            <div class="settings-popover-head">
              <strong>Settings</strong>
              <button class="chart-popup-close" type="button" data-action="close-theme-settings" aria-label="Einstellungen schliessen">x</button>
            </div>
            <button class="settings-accordion-toggle" type="button" data-action="toggle-settings-grunddaten" aria-expanded="true" aria-controls="grunddatenSettingsContent">
              Grunddaten
            </button>
            <div id="grunddatenSettingsContent" class="settings-accordion-content">
              <div class="field-grid settings-field-grid">
                ${numberField("year", "Jahr", "setting", "year", { min: 2000, max: 2100, step: 1 })}
                ${numberField("interestRatePercent", "Jahreszins Konto in %", "setting", "interestRatePercent", { min: 0, step: 0.01 })}
                ${numberField("cashbackRatePercent", "Cashback in %", "setting", "cashbackRatePercent", { min: 0, step: 0.01 })}
              </div>
            </div>
            <div class="settings-popover-subhead"><strong>Darstellung</strong></div>
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
      <section class="module-launcher panel" aria-label="Hauptbereiche">
        <div class="section-heading">
          <h2>Bereiche</h2>
        </div>
        <div class="module-launcher-grid">
          ${moduleCardButton("income_tracking", "Jahresnettoeinkommen", "Einkommen erfassen und auswerten")}
          ${moduleCardButton("cost_reserve_positions", "Kosten- und Ruecklagenpositionen", "kontobasiert bearbeiten")}
          ${moduleCardButton("year_table", "Jahrestabelle", "aktives Konto analysieren")}
          ${moduleCardButton("investment_planning", "Investment- und Auszahlungsplanung", "Depot, Entnahme, Annahmen")}
          ${moduleCardButton("real_estate_financing", "Immobilienfinanzierung", "Kredit, Tilgung, Wertentwicklung")}
          ${moduleCardButton("combined_wealth", "Vermoegensvarianten / Kombination", "Module zusammenfuehren")}
        </div>
      </section>

      <section class="panel account-panel" data-module-section="cost_reserve_positions">
        <div class="section-heading">
          <h2>Konto-Module</h2>
          <div class="button-row">
            <button class="button" type="button" data-action="add-planning-account">Konto hinzufuegen</button>
            <button class="button secondary" type="button" data-action="rename-planning-account">Umbenennen</button>
            <button class="button danger" type="button" data-action="delete-planning-account">Loeschen</button>
          </div>
        </div>
        <div id="planningAccountCards" class="planning-account-cards"></div>
        <p id="planningAccountSummary" class="planning-account-summary">-</p>
        <div id="planningAccountDialogHost"></div>
      </section>

      <section class="panel" data-module-section="cost_reserve_positions">
        <div class="toolbar">
          <div class="section-heading position-toolbar-heading">
            <h2>Kosten- und Ruecklagenpositionen</h2>
            <div class="position-mode-stack">
              <div class="position-mode-switch position-table-switch" role="tablist" aria-label="Positionstabelle">
                <button class="position-mode-button" type="button" data-action="show-income-positions" aria-pressed="false">Einnahmen</button>
                <button class="position-mode-button" type="button" data-action="show-expense-positions" aria-pressed="true">Ausgaben</button>
                <button class="position-mode-button" type="button" data-action="show-reserve-positions" aria-pressed="false">Ruecklagen</button>
                <button class="position-mode-button" type="button" data-action="show-savings-positions" aria-pressed="false">Sparen</button>
              </div>
              <div id="expenseSubmodeSwitchHost" class="expense-submode-switch-host"></div>
            </div>
          </div>
          <div class="button-row">
            <button class="button" id="addPositionButton" type="button" data-action="add-position">Ausgabe hinzufuegen</button>
            ${toolbarIconButton("import-positions", "CSV importieren", "upload")}
            ${toolbarIconButton("export-positions", "CSV exportieren", "download")}
            ${toolbarIconButton("export-year", "Jahrestabelle exportieren", "table")}
            <button
              class="button secondary position-filter-toggle"
              type="button"
              data-action="toggle-position-filter"
              aria-controls="positionFilterPopup"
              aria-expanded="false"
            >Filter</button>
            <input class="visually-hidden" id="positionsCsvImport" type="file" accept=".csv,text/csv" />
            <span id="exportStatus" class="export-status" aria-live="polite"></span>
          </div>
        </div>
        <div id="positionTableControls" class="position-table-controls"></div>
        <div class="table-wrap position-table-wrap">
          <table class="position-table">
            <thead id="positionsHead"></thead>
            <tbody id="positionsBody"></tbody>
          </table>
        </div>
        <div id="positionIconPicker" class="position-icon-picker" role="dialog" aria-label="Positionslabel auswaehlen" hidden></div>
      </section>

      <section class="panel result-panel" data-module-section="year_table">
        <div class="section-heading result-table-heading">
          <h2>Jahrestabellen pro Konto <span id="activeYearAccountName"></span></h2>
          <div class="result-header-actions">
            <div id="yearAccountSelector" class="year-account-selector" aria-label="Aktives Konto fuer Grafik Bearbeitung Export"></div>
            <div class="position-mode-switch result-column-switch" role="group" aria-label="Jahrestabellen-Spalten">
              <button class="position-mode-button" type="button" data-action="toggle-result-max-needed" aria-pressed="false">
                Max. Bedarf Monatsanfang
              </button>
            </div>
            <button class="button secondary" type="button" data-action="show-reserve-chart">Grafik anzeigen</button>
          </div>
        </div>
        <div id="reserveChartPopup" class="reserve-chart-popup" role="dialog" aria-label="Einnahmen Ausgaben Sparrate Grafik" hidden></div>
        <div id="accountYearTableOverview" class="account-year-table-overview"></div>
      </section>

      <section class="panel income-tracker-panel" data-module-section="income_tracking">
        <div class="section-heading income-tracker-heading">
          <div>
            <h2>Jahresnettoeinkommen-Tracker</h2>
            <p class="planning-account-summary">
              Jahreswerte, Meilensteine und explizite Annahmen werden getrennt gepflegt.
            </p>
          </div>
          <div class="button-row">
            ${toolbarIconButton("income-import-csv", "CSV importieren", "upload")}
            ${toolbarIconButton("income-export-csv", "CSV exportieren", "download")}
            <button class="button" type="button" data-action="income-export-pdf">PDF-Auswertung</button>
          </div>
        </div>

        <div id="incomeMetricGrid" class="income-metric-grid"></div>

        <div class="income-tracker-grid">
          <section class="income-card income-input-card">
            <div class="position-mode-switch income-tab-switch" role="tablist" aria-label="Einkommen Eingaben">
              <button class="position-mode-button" type="button" data-action="income-tab-yearly" aria-pressed="true">
                Jahreswerte
              </button>
              <button class="position-mode-button" type="button" data-action="income-tab-milestones" aria-pressed="false">
                Meilensteine
              </button>
              <button class="position-mode-button" type="button" data-action="income-tab-settings" aria-pressed="false">
                Annahmen
              </button>
              <button class="position-mode-button" type="button" data-action="income-open-analysis" aria-label="Weltgrafik Analyse Dashboard oeffnen">
                Weltgrafik
              </button>
            </div>

            <div id="incomeYearlyTab" class="income-tab-panel">
              <div id="incomeYearLabelFilters" class="position-label-filter-row income-label-filter-row"></div>
              <div class="table-wrap">
                <table class="income-table">
                  <thead>
                    <tr>
                      <th>Label</th>
                      <th>Jahr</th>
                      <th>Jahresnetto</th>
                      <th>Jahresbrutto</th>
                      <th>Steuer / Abgaben</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody id="incomeYearlyRows"></tbody>
                </table>
              </div>
              <div class="button-row">
                <button class="button" type="button" data-action="income-add-yearly">Jahreswert hinzufuegen</button>
              </div>
            </div>

            <div id="incomeMilestonesTab" class="income-tab-panel" hidden>
              <div class="table-wrap">
                <table class="income-table">
                  <thead>
                    <tr>
                      <th>Datum</th>
                      <th>Typ</th>
                      <th>Beschreibung</th>
                      <th>Einfluss</th>
                      <th>Verknuepftes Jahr</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody id="incomeMilestoneRows"></tbody>
                </table>
              </div>
              <div class="button-row">
                <button class="button" type="button" data-action="income-add-milestone">Meilenstein hinzufuegen</button>
              </div>
            </div>

            <div id="incomeSettingsTab" class="income-tab-panel" hidden>
              <div class="field-grid wide">
                <label class="field">
                  <span>Projektion</span>
                  <select data-income-setting="projectionMode">
                    <option value="off">Deaktiviert</option>
                    <option value="historical_average">Historische Wachstumsrate verwenden</option>
                    <option value="manual">Manuelle Wachstumsrate verwenden</option>
                  </select>
                </label>
                <label class="field">
                  <span>Manuelle Wachstumsrate p. a. in %</span>
                  <input type="number" step="0.1" data-income-setting="manualGrowthRatePercent" />
                </label>
                <label class="field">
                  <span>Anteil fuer Sparrate / Rate in %</span>
                  <input type="number" min="0" max="100" step="1" data-income-setting="savingsSharePercent" />
                </label>
                <div class="field">
                  <span>Jahresinflation aus Konto</span>
                  <strong id="incomeGeneralInflationRate">-</strong>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside class="income-card income-insights-card">
          <h3>Automatische Aussagen</h3>
          <div id="incomeInsights" class="income-insight-list"></div>
        </aside>

        <div class="income-status-grid">
          <section class="income-card">
            <h3>Jahreswerte und Quellenstatus</h3>
            <div class="table-wrap">
              <table class="income-table income-status-table">
                <thead>
                  <tr>
                    <th>Jahr</th>
                    <th>Genutztes Jahresnetto</th>
                    <th>Status</th>
                    <th>Jahresentgeltabrechnung</th>
                    <th>Manuell</th>
                    <th>Nettoquote</th>
                    <th>Realwert</th>
                    <th>Meilensteine</th>
                  </tr>
                </thead>
                <tbody id="incomeYearStatusRows"></tbody>
              </table>
            </div>
          </section>
        </div>

        <div class="income-chart-grid">
          <section class="income-card">
            <h3>Jahresnettoeinkommen</h3>
            <div id="incomeAnnualChart" class="income-chart-host"></div>
          </section>
          <section class="income-card">
            <h3>Jaehrlicher Zuwachs</h3>
            <div id="incomeGrowthChart" class="income-chart-host"></div>
          </section>
          <section class="income-card">
            <h3>Nettoquote</h3>
            <div id="incomeRatioChart" class="income-chart-host"></div>
          </section>
          <section class="income-card">
            <h3>Nominal vs. inflationsbereinigt</h3>
            <div id="incomeInflationChart" class="income-chart-host"></div>
          </section>
          <section class="income-card">
            <h3>Zukunftsprojektion</h3>
            <div id="incomeProjectionChart" class="income-chart-host"></div>
          </section>
        </div>

        <p id="incomeExportStatus" class="export-status" aria-live="polite"></p>
        <input class="visually-hidden" id="incomeCsvImport" type="file" accept=".csv,text/csv" />
        <div id="incomeTaxDialogRoot"></div>
        <div id="incomeAnalysisDialogRoot"></div>
        <div id="incomeYearLabelPicker" class="position-icon-picker income-year-label-picker" role="dialog" aria-label="Einkommenslabel auswaehlen" hidden></div>
        <div id="incomeMilestoneTypePicker" class="position-icon-picker income-milestone-type-picker" role="dialog" aria-label="Meilenstein-Typ auswaehlen" hidden></div>
      </section>

      <section class="panel investment-panel" data-module-section="investment_planning">
        <div class="section-heading">
          <h2>Investment- und Auszahlungsplanung</h2>
        </div>
        <div class="investment-account-module">
          <h3>Konto-Module</h3>
          <div id="investmentAccountSelector" class="planning-account-cards" aria-label="Konto fuer Investmentplanung"></div>
        </div>
        <div class="section-heading investment-heading">
          <div class="investment-depot-switch-wrap">
            <span class="planning-account-summary">Depot-Varianten</span>
          </div>
          <div class="position-mode-switch investment-depot-switch" role="tablist" aria-label="Depot-Auswahl">
            <button class="position-mode-button" type="button" data-action="set-investment-depot-standard" aria-pressed="true">Depot</button>
            <button class="position-mode-button" type="button" data-action="set-investment-depot-retirement" aria-pressed="false" aria-label="Altersvorsorge-depot">
              <span>Altersvorsorge-</span>
              <span>depot</span>
            </button>
            <button class="position-mode-button" type="button" data-action="set-investment-depot-child" aria-pressed="false">Kinderdepot</button>
          </div>
        </div>
        <div class="investment-grid">
          <div class="investment-selector">
            <h3>Investierbare Positionen</h3>
            <div class="include-special-toggles">
              <button class="include-transfer-toggle" type="button" data-action="toggle-interest-investment" aria-pressed="false">
                <span>Zinsen</span>
                <strong id="interestInvestmentAmount">-</strong>
              </button>
              <button class="include-transfer-toggle" type="button" data-action="toggle-cashback-investment" aria-pressed="false">
                <span>Cashback</span>
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
                ${numberField("childPayoutAge", "Auszahlungsalter", "investment", "childPayoutAge", {
                  min: 18,
                  max: 25,
                  step: 1,
                  depotScope: "child"
                })}
                ${numberField("payoutEndAge", "Endalter", "investment", "payoutEndAge", { min: 70, max: 110, step: 1, depotScope: "standard retirement" })}
                ${numberField("retirementDepotChildren", "Kindergeldberechtigte Kinder", "investment", "retirementDepotChildren", { min: 0, max: 20, step: 1, depotScope: "retirement" })}
                ${numberField("percentageWithdrawalStartAge", "Entnahme ab Alter", "investment", "percentageWithdrawalStartAge", { min: 0, max: 110, step: 1, depotScope: "standard" })}
                ${numberField("percentageWithdrawalRatePercent", "Prozent-Entnahme p. a.", "investment", "percentageWithdrawalRatePercent", { min: 0, max: 20, step: 0.1, depotScope: "standard" })}
              </div>
              <div class="investment-range-panel">
                ${rangeField("investmentReturnPercent", "Jaehrliche Rendite", 0, 30, 0.1)}
                ${rangeField("capitalGainsTaxPercent", "Kapitalertragsteuer auf Wertzuwachs", 0, 50, 0.1)}
                ${rangeField("inflationRatePercent", "Inflation pro Jahr", 1, 10, 0.1)}
                ${rangeField("bequestReservePercent", "Reserve/Erbe vom Maximalvermoegen", 0, 50, 0.5, { depotScope: "standard retirement" })}
              </div>
            </div>
          </div>

          <div class="investment-visual">
            <section class="investment-chart-card" aria-label="Anlageentwicklung Grafik">
              <div class="investment-chart-header">
                <div class="investment-chart-title" id="investmentActiveDepotTitle">Anlageentwicklung Depot</div>
                <div class="investment-chart-metrics">
                  ${chartMetric("monthlyRateMetric", "Monatliche Investmentrate")}
                  ${chartMetric("wealthAtRetirementMetric", "Vermoegen zur Rente")}
                  ${withdrawalGainMetric()}
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
              <div class="retirement-depot-funding" id="retirementDepotFunding" aria-label="Foerderung">
                <div class="retirement-depot-funding-head">
                  <span>Foerderung</span>
                  <strong id="retirementDepotFundingStatus">Aktiv nach Reformlogik ab 2027</strong>
                </div>
                <div class="retirement-depot-funding-grid">
                  ${chartMetric("retirementDepotOwnContributionMetric", "Eigenbeitrag p. a.")}
                  ${chartMetric("retirementDepotBaseAllowanceMetric", "Grundzulage p. a.")}
                  ${chartMetric("retirementDepotChildAllowanceMetric", "Kinderzulage p. a.")}
                  ${chartMetric("retirementDepotAllowanceRateMetric", "Foerderquote")}
                  ${chartMetric("retirementDepotTotalAllowanceMetric", "Zulagen p. a.")}
                  ${chartMetric("retirementDepotTotalContributionMetric", "Gesamt im Depot p. a.")}
                  ${chartMetric("retirementDepotAllowanceAtRetirementMetric", "Zulagen bis Rente")}
                </div>
              </div>
              <div class="investment-statistics">
                <div class="detail-list" aria-label="Berechnungsdetails">
                ${detailLine("Eingezahlter Eigenbeitrag", "detailContribution")}
                ${detailLine("Eingepreiste Zulagen", "detailAllowance")}
                ${detailLine("Verbleibende Zulagen", "detailAllowanceBasis")}
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
                ${detailLine("Reserve/Erbe zum Endalter", "detailBequestReserve")}
                ${detailLine("Gewaehlte Monatsrate", "detailSelectedMonthlyRate")}
                </div>
              </div>
            </section>
            <section class="investment-chart-card combined-investment-card" id="combinedInvestmentCard" aria-label="Gemeinsame Anlageentwicklung">
              <div class="investment-chart-header">
                <div class="investment-chart-title">Gemeinsame Anlageentwicklung</div>
                <div class="investment-chart-metrics">
                  ${chartMetric("combinedStandardWealthMetric", "Depot zur Rente")}
                  ${chartMetric("combinedRetirementWealthMetric", "Altersvorsorgedepot zur Rente")}
                  ${chartMetric("combinedWealthMetric", "Gesamt zur Rente")}
                  ${chartMetric("combinedMonthlyRateMetric", "Monatliche Rate gesamt")}
                  ${chartMetric("combinedMonthlyPensionMetric", "Monatliche Rente gesamt")}
                  ${chartMetric("combinedRealWealthMetric", "Reales Vermoegen gesamt")}
                </div>
              </div>
              <canvas id="combinedInvestmentChart"></canvas>
              <div id="combinedInvestmentChartPopup" class="investment-chart-popup" role="dialog" aria-label="Balkendetails gemeinsam" hidden></div>
              <div class="investment-legend">
                <span class="legend-item"><span class="legend-dot grey"></span> Eigenbeitrag</span>
                <span class="legend-item"><span class="legend-dot orange"></span> Zulagen</span>
                <span class="legend-item"><span class="legend-dot green"></span> Wertzuwachs</span>
                <span class="legend-item"><span class="legend-dot purple"></span> Restguthaben (Auszahlung)</span>
                <span class="legend-item"><span class="legend-dot red"></span> Kapitalertragsteuer</span>
                <span class="legend-item"><span class="legend-dash"></span> Normales Depot</span>
              </div>
            </section>
          </div>
        </div>
      </section>

      <section class="panel real-estate-panel" data-module-section="real_estate_financing">
        <div class="section-heading">
          <h2>Immobilienfinanzierung</h2>
          <div class="real-estate-heading-controls">
            <div class="real-estate-account-modules">
              <div class="real-estate-account-module">
                <h3>Konten fuer Sparquellen und Entnahme-Zugewinn</h3>
                <div id="realEstateAccountSelector" class="planning-account-cards" aria-label="Konten fuer Immobilien Sparquellen und Entnahme-Zugewinn"></div>
                <small class="real-estate-locale-default" aria-label="Standardsprache">DE</small>
              </div>
            </div>
          </div>
        </div>

        <div class="real-estate-grid">
          <section class="real-estate-card">
            <h3>Immobilien-Eckdaten</h3>
            <p class="planning-account-summary">Hilfetext: Kaufpreis ist Pflicht. Kaufnebenkosten beeinflussen den effektiven Kapitalbedarf.</p>
            <div class="field-grid wide">
              ${realEstateNumberField("purchasePrice", "Kaufpreis Immobilie")}
              ${realEstateNumberField("constructionOrRenovationCosts", "Bau-/Renovierungskosten")}
              ${realEstateNumberField("landCosts", "Grundstueckskosten")}
              ${realEstateNumberField("additionalPurchaseCosts", "Kaufnebenkosten")}
              ${realEstateNumberField("notaryCosts", "Notarkosten")}
              ${realEstateNumberField("landRegistryCosts", "Grundbuchkosten")}
              ${realEstateNumberField("brokerCosts", "Maklerkosten")}
              ${realEstateNumberField("transferTax", "Grunderwerbsteuer")}
              ${realEstateNumberField("modernizationReserve", "Modernisierungsreserve")}
              ${realEstateNumberField("movingAndSetupCosts", "Umzug/Einrichtung")}
              ${realEstateNumberField("safetyBuffer", "Sicherheitsbuffer")}
            </div>
            <div class="chart-inline-metrics">
              ${chartMetric("realEstateTotalProjectCostMetric", "Gesamtkosten")}
              ${chartMetric("realEstateStartDebtMetric", "Startschuld")}
              ${chartMetric("realEstateTotalLoanCostMetric", "Darlehensbetrag inkl. Zinsen")}
            </div>
          </section>

          <section class="real-estate-card">
            <h3>Finanzierungsdaten</h3>
            <p class="planning-account-summary">Hilfetext: Eigenkapital, Monatsrate, Anfangstilgung und Sondertilgung werden aus echten Sparpositionen abgeleitet.</p>
            <div class="field-grid wide">
              ${realEstateNumberField("financingStartAge", "Finanzierung ab Alter", { step: 1 })}
              ${realEstateNumberField("plannedSaleYear", "Verkaufsjahr", { step: 1, nullable: true })}
            </div>
            <div class="real-estate-slider-grid">
              ${realEstateAssumptionControl("interestRatePercent", "Zinssatz", 0, 10, 0.05)}
            </div>
            <div class="chart-inline-metrics">
              ${chartMetric("realEstateCalculatedEndAgeMetric", "Bezahlt bis Alter")}
              ${chartMetric("realEstateFinancingYearsMetric", "Finanzierungszeitraum")}
              ${chartMetric("realEstateDerivedEquityMetric", "Eigenkapital")}
              ${chartMetric("realEstateDerivedMonthlyPaymentMetric", "Monatsrate")}
              ${chartMetric("realEstateDerivedInitialRepaymentMetric", "Anfangstilgung")}
              ${chartMetric("realEstateDerivedSpecialRepaymentMetric", "Sondertilgung p. a.")}
            </div>
          </section>

          <section class="real-estate-card">
            <h3>Tilgungsquellen</h3>
            <p class="planning-account-summary">Nur ausgewaehlte Sparpositionen und optionaler Entnahme-Zugewinn koennen die Finanzierung bedienen.</p>
            <div class="include-special-toggles">
              <button class="include-transfer-toggle" type="button" data-action="toggle-real-estate-withdrawal-gain-source" aria-pressed="false">
                <span>Entnahme-Zugewinn</span>
                <strong id="realEstateWithdrawalGainSourceAmount">-</strong>
              </button>
              <button class="include-transfer-toggle" type="button" data-action="toggle-real-estate-depot-savings-rate-source" aria-pressed="false">
                <span>Depot-Sparrate mit tilgen</span>
                <strong id="realEstateDepotSavingsRateSourceAmount">-</strong>
              </button>
            </div>
            <div class="real-estate-source-grid">
              <div>
                <h3>Eigenkapital</h3>
                <div id="realEstateEquityCapitalSourceList" class="include-list"></div>
              </div>
              <div>
                <h3>Monatsrate</h3>
                <div id="realEstateMonthlyPaymentSourceList" class="include-list"></div>
              </div>
              <div>
                <h3>Sondertilgung</h3>
                <div id="realEstateSpecialRepaymentSourceList" class="include-list"></div>
              </div>
            </div>
          </section>

          <section class="real-estate-card real-estate-chart-card">
            <h3>Tilgung und Vermoegen</h3>
            <div id="realEstateValidation" class="validation-box" aria-live="polite"></div>
            <div id="realEstateRepaymentChart" class="wealth-chart-host"></div>
            <h3>Immobilienwertentwicklung</h3>
            <div id="realEstateTrendChart" class="wealth-chart-host"></div>
            <div id="realEstateChartPopup" class="investment-chart-popup" role="dialog" aria-label="Immobilien-Balkendetails" hidden></div>
          </section>
        </div>
      </section>

      <section class="panel combined-wealth-panel" data-module-section="combined_wealth">
        <div class="section-heading">
          <h2>Vermoegensvarianten / Kombination</h2>
        </div>
        <div class="combined-wealth-grid">
          <section class="combined-wealth-card">
            <div class="combined-account-modules">
              <div class="combined-account-module">
                <h3>Konten aktivieren</h3>
                <div id="combinedAccountSelector" class="planning-account-cards" aria-label="Aktive Konten fuer Kombination"></div>
              </div>
              <div class="combined-account-module">
                <h3>Kombi-Leitkonto (Depot/Entnahme)</h3>
                <div
                  id="combinedLeadInvestmentAccountSelector"
                  class="planning-account-cards"
                  aria-label="Leitkonto fuer Depot und Entnahme in Kombination"
                ></div>
              </div>
            </div>
          </section>
          <section class="combined-wealth-card">
            <h3>Module aktivieren</h3>
            <div class="combined-toggle-grid">
              ${combinedToggle("includeCashPositions", "Cash-/Kontopositionen", "Beruecksichtigt liquide Konten und laufende Ruecklagen.")}
              ${combinedToggle("includeCostReserveAccounts", "Kosten-/Ruecklagenkonten", "Fuehrt geplante Kosten- und Reservekonten in der Kombination mit.")}
              ${combinedToggle("includeAnnualTableAccounts", "Jahrestabellenkonten", "Nimmt jahresbasierte Konten aus den Tabellen in den Pfad auf.")}
              ${combinedToggle("includeDepotDevelopment", "Depot-/Investmententwicklung", "Zeigt das Standarddepot mit Sparrate, Wachstum und Entnahmen.")}
              ${combinedToggle("includeSharedDepotDevelopment", "Gemeinsame Anlageentwicklung", "Addiert die gemeinsame Anlageentwicklung zum Standarddepot.")}
              ${combinedToggle("includeWithdrawals", "Auszahlungs-/Entnahmeplanung", "Spiegelt geplante Entnahmen als Liquiditaetseffekt im Gesamtpfad.")}
              ${combinedToggle("includeRealEstateFinancing", "Immobilienfinanzierung", "Beruecksichtigt Darlehen und Tilgungsquellen der Immobilie.")}
              ${combinedToggle("includeRealEstateValueTrend", "Immobilienwertentwicklung", "Fuehrt den Immobilienwert bis zum Endjahr oder Verkaufsjahr fort.")}
            </div>
          </section>
          <section class="combined-wealth-card">
            <h3>Kombinierter Vermoegenspfad</h3>
            <div id="combinedWealthChart" class="wealth-chart-host"></div>
            <div id="combinedWealthYearDetail" class="wealth-detail-box"></div>
          </section>
        </div>
      </section>
    </main>
  `;
}

export function positionTypeSelect(position: ReservePosition): string {
  const flow = positionFlow(position);
  if (flow === "income") {
    return `
      <select data-position-id="${position.id}" data-position-field="type">
        <option value="incomeMonthly" ${position.type === "incomeMonthly" ? "selected" : ""}>Monatliches Einkommen</option>
        <option value="incomeYearly" ${position.type === "incomeYearly" ? "selected" : ""}>Jaehrliche Einnahme</option>
        <option value="incomeTemporary" ${position.type === "incomeTemporary" ? "selected" : ""}>Temporaere Einnahme</option>
      </select>
    `;
  }

  if (position.type === "savings") {
    return `
      <select data-position-id="${position.id}" data-position-field="type">
        <option value="savings" ${position.type === "savings" ? "selected" : ""}>Sparrate</option>
      </select>
    `;
  }

  if (position.type === "fixed" || position.type === "reserve") {
    return `
      <select data-position-id="${position.id}" data-position-field="type">
        <option value="fixed" ${position.type === "fixed" ? "selected" : ""}>Fixbestand</option>
        <option value="reserve" ${position.type === "reserve" ? "selected" : ""}>Monatliche Ruecklage</option>
      </select>
    `;
  }

  return `
    <select data-position-id="${position.id}" data-position-field="type">
      <option value="temporary" ${position.type === "temporary" ? "selected" : ""}>Temporaer</option>
    </select>
  `;
}

export function positionIconSelect(position: ReservePosition): string {
  const icon = normalizePositionIcon(position.icon);
  const label = positionIconLabel(icon);
  return `
    <button
      class="position-label-button"
      type="button"
      data-action="open-position-icon-picker"
      data-position-id="${position.id}"
      title="${label}"
      aria-label="Positionslabel: ${label}"
      aria-haspopup="dialog"
    >
      ${positionIconSvg(icon)}
    </button>
  `;
}

export function payoutSelect(position: ReservePosition): string {
  const flow = positionFlow(position);
  if (flow === "income") {
    return `
      <select data-position-id="${position.id}" data-position-field="payoutType">
        <option value="monthly" ${position.payoutType === "monthly" ? "selected" : ""}>${labelForPayout("monthly", flow)}</option>
        <option value="yearly" ${position.payoutType === "yearly" ? "selected" : ""}>${labelForPayout("yearly", flow)}</option>
        <option value="once" ${position.payoutType === "once" ? "selected" : ""}>${labelForPayout("once", flow)}</option>
      </select>
    `;
  }

  return `
    <select data-position-id="${position.id}" data-position-field="payoutType">
      <option value="none" ${position.payoutType === "none" ? "selected" : ""}>${labelForPayout("none", flow)}</option>
      <option value="monthly" ${position.payoutType === "monthly" ? "selected" : ""}>${labelForPayout("monthly", flow)}</option>
      <option value="yearly" ${position.payoutType === "yearly" ? "selected" : ""}>${labelForPayout("yearly", flow)}</option>
      <option value="once" ${position.payoutType === "once" ? "selected" : ""}>${labelForPayout("once", flow)}</option>
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

function moduleCardButton(id: string, label: string, subtitle: string): string {
  return `
    <button
      class="module-card-button"
      type="button"
      data-action="open-section-${id}"
      data-section-id="${id}"
      aria-pressed="false"
    >
      <strong>${label}</strong>
      <small>${subtitle}</small>
    </button>
  `;
}

function realEstateNumberField(
  key: string,
  label: string,
  options: { step?: number; nullable?: boolean } = {}
): string {
  const englishLabel = realEstateEnglishLabel(key, label);
  return `
    <label class="field" for="propertyFinancing.${key}">
      <span data-real-estate-label-key="${key}" data-label-de="${label}" data-label-en="${englishLabel}">${label}</span>
      <input
        id="propertyFinancing.${key}"
        type="number"
        min="0"
        step="${options.step ?? 0.01}"
        data-real-estate-field="${key}"
        ${options.nullable ? 'placeholder="optional"' : ""}
      />
    </label>
  `;
}

function realEstateAssumptionControl(
  key: string,
  label: string,
  min: number,
  max: number,
  step: number
): string {
  const englishLabel = realEstateEnglishLabel(key, label);
  return `
    <label class="range-field assumption-control" for="propertyFinancing.${key}">
      <span data-real-estate-label-key="${key}" data-label-de="${label}" data-label-en="${englishLabel}">${label}</span>
      <input type="range" min="${min}" max="${max}" step="${step}" data-real-estate-range="${key}" />
      <strong id="realEstate${capitalize(key)}Value">-</strong>
    </label>
  `;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function realEstateEnglishLabel(key: string, fallback: string): string {
  const labels: Record<string, string> = {
    purchasePrice: "Property purchase price",
    constructionOrRenovationCosts: "Construction/renovation costs",
    landCosts: "Land costs",
    additionalPurchaseCosts: "Additional purchase costs",
    notaryCosts: "Notary costs",
    landRegistryCosts: "Land registry costs",
    brokerCosts: "Broker costs",
    transferTax: "Transfer tax",
    modernizationReserve: "Modernization reserve",
    movingAndSetupCosts: "Moving/setup costs",
    safetyBuffer: "Safety buffer",
    equityCapital: "Equity capital",
    loanAmount: "Loan amount",
    interestRatePercent: "Interest rate in %",
    initialRepaymentPercent: "Initial repayment in %",
    targetTermYears: "Target term (years)",
    financingStartAge: "Financing start age",
    financingEndAge: "Paid off by age",
    financingYears: "Financing period (years)",
    plannedSaleYear: "Sale year",
    specialRepaymentAmount: "Special repayment amount",
    monthlyPayment: "Monthly payment",
    propertyValueGrowthPercent: "Property value growth in %",
    inflationRatePercent: "Inflation in %"
  };
  return labels[key] ?? fallback;
}

function combinedToggle(key: string, label: string, description: string): string {
  return `
    <button
      class="combined-toggle-item"
      type="button"
      data-action="toggle-combined-module"
      data-combined-toggle="${key}"
      aria-pressed="false"
    >
      <span class="combined-toggle-copy">
        <strong>${label}</strong>
        <small>${description}</small>
      </span>
      <span class="combined-toggle-status" data-combined-toggle-status>Aus</span>
    </button>
  `;
}

function numberField(
  id: string,
  label: string,
  scope: "setting" | "investment",
  key: string,
  options: { min: number; max?: number; step: number; depotScope?: string }
): string {
  const dataAttr = scope === "setting" ? `data-setting="${key}"` : `data-investment="${key}"`;
  const depotScopeAttr = options.depotScope ? `data-depot-scope="${options.depotScope}"` : "";
  return `
    <label class="field" for="${id}" ${depotScopeAttr}>
      <span>${label}</span>
      <input id="${id}" type="number" min="${options.min}" ${options.max ? `max="${options.max}"` : ""} step="${
        options.step
      }" ${dataAttr} />
    </label>
  `;
}

function rangeField(
  key: keyof InvestmentSettings,
  label: string,
  min: number,
  max: number,
  step: number,
  options: { depotScope?: string } = {}
): string {
  const depotScopeAttr = options.depotScope ? `data-depot-scope="${options.depotScope}"` : "";
  return `
    <label class="range-field" ${depotScopeAttr}>
      <span>${label}</span>
      <input type="range" min="${min}" max="${max}" step="${step}" data-investment="${key}" />
      <strong id="${key}Value">-</strong>
    </label>
  `;
}

function retirementAgeField(): string {
  return `
    <label class="field" for="retirementAge" data-depot-scope="standard retirement">
      <span>Rentenalter</span>
      <input id="retirementAge" type="number" min="50" max="85" step="1" data-retirement-age="true" />
    </label>
  `;
}

function chartMetric(id: string, label: string): string {
  return `
    <div class="chart-metric" id="${id}Card">
      <div class="chart-label" id="${id}Label">${label}</div>
      <div class="chart-value" id="${id}">-</div>
    </div>
  `;
}

function withdrawalGainMetric(): string {
  return `
    <div class="chart-metric chart-metric-split" id="withdrawalGainMetricCard">
      <div class="chart-label" id="withdrawalGainMetricLabel">Monatlicher Zugewinn durch Entnahme</div>
      <div class="chart-split-values">
        <div class="chart-split-item">
          <span id="withdrawalOffsetMetricLabel">Kumulierte Sparrate</span>
          <strong id="withdrawalOffsetMetric">-</strong>
        </div>
        <div class="chart-split-item">
          <span id="withdrawalNetMetricLabel">Netto</span>
          <strong id="withdrawalGainMetric">-</strong>
        </div>
      </div>
    </div>
  `;
}

function detailLine(label: string, id: string): string {
  return `<div class="detail-line"><span id="${id}Label">${label}</span><strong id="${id}">-</strong></div>`;
}

function toolbarIconButton(action: string, label: string, icon: "upload" | "download" | "table"): string {
  return `
    <button
      class="icon-button toolbar-icon-button"
      type="button"
      data-action="${action}"
      aria-label="${label}"
      title="${label}"
    >
      ${toolbarIcon(icon)}
    </button>
  `;
}

function toolbarIcon(icon: "upload" | "download" | "table"): string {
  const paths = {
    upload: '<path d="M12 17V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /><path d="M5 16v4" /><path d="M19 16v4" />',
    download:
      '<path d="M12 4v13" /><path d="m7 12 5 5 5-5" /><path d="M5 20h14" /><path d="M5 16v4" /><path d="M19 16v4" />',
    table:
      '<rect x="4" y="5" width="16" height="14" rx="2" /><path d="M4 10h16" /><path d="M9 5v14" /><path d="M15 5v14" /><path d="M4 15h16" />'
  };

  return `
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      ${paths[icon]}
    </svg>
  `;
}
