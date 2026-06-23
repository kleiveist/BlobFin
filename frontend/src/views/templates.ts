import {
  chartMetric,
  combinedModuleIcon,
  dateField,
  detailLine,
  numberField,
  rangeField,
  realEstateAssumptionControl,
  realEstateBooleanField,
  realEstateNumberField,
  retirementAgeField,
  toolbarIconButton,
  withdrawalGainMetric
} from "./formControlsTemplate";
import { renderHomeTemplate } from "./homeTemplate";
import { moduleTopBar } from "./moduleTopBarTemplate";

export {
  monthSelect,
  payoutSelect,
  positionIconSelect,
  positionTypeSelect
} from "./formControlsTemplate";

export function renderAppShell(): string {
  return `
    <header class="app-header">
      <div class="app-header-brand">
        <button
          class="app-home-return-button"
          type="button"
          data-action="open-section-home"
          data-home-return-button
          disabled
          aria-label="Zur Startseite"
          aria-disabled="true"
          title="Zur Startseite"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
            <path d="M11.5 5.5 5 12l6.5 6.5 1.4-1.4L8.8 13H19v-2H8.8l4.1-4.1-1.4-1.4Z" />
          </svg>
        </button>
        <div class="app-header-title">
          <p class="eyebrow">BlobFin Planung</p>
          <h1>Modularer Finanzplaner fuer Konten, Investment und Immobilien</h1>
        </div>
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
            <button class="settings-accordion-toggle" type="button" data-action="toggle-settings-vault" aria-expanded="false" aria-controls="vaultSettingsContent">
              VAULT
            </button>
            <div id="vaultSettingsContent" class="settings-accordion-content" hidden>
              <div class="vault-settings-panel">
                <div class="vault-action-grid">
                  <button class="button secondary" type="button" data-action="vault-select">Vault auswaehlen</button>
                  <button class="button secondary" type="button" data-action="vault-create">Neuen Vault erstellen</button>
                </div>
                <div class="vault-status-grid" aria-live="polite">
                  <span>Aktiver Pfad</span>
                  <strong id="vaultActivePath">-</strong>
                  <span>Status</span>
                  <strong id="vaultStatusText">Nicht verbunden</strong>
                  <span>Details</span>
                  <strong id="vaultStatusDetail">Kein Vault verbunden.</strong>
                </div>
                <div class="vault-action-grid">
                  <button class="button" type="button" data-action="vault-save-now">Jetzt speichern</button>
                  <button class="button secondary" type="button" data-action="vault-reload">Aus Vault neu laden</button>
                  <button class="button secondary" type="button" data-action="vault-snapshot">Vault sichern / Snapshot erstellen</button>
                </div>
              </div>
            </div>
            <button class="settings-accordion-toggle" type="button" data-action="toggle-settings-grunddaten" aria-expanded="true" aria-controls="grunddatenSettingsContent">
              Grunddaten
            </button>
            <div id="grunddatenSettingsContent" class="settings-accordion-content">
              <div class="field-grid settings-field-grid">
                ${numberField("settingsYear", "Jahr", "setting", "year", { min: 2000, max: 2100, step: 1 })}
                ${numberField("settingsInterestRatePercent", "Jahreszins Konto in %", "setting", "interestRatePercent", { min: 0, step: 0.01 })}
                ${numberField("settingsCashbackRatePercent", "Cashback in %", "setting", "cashbackRatePercent", { min: 0, step: 0.01 })}
                ${dateField("settingsEndDate", "Enddatum", "endDate")}
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
      ${renderHomeTemplate()}

      <section class="panel self-employment-panel" data-module-section="self_employment_dashboard">
        ${moduleTopBar("Selbststaendigkeits-Dashboard", "Projekte, Zeit, Budget und Gewinnpotenzial")}
        <div id="selfEmploymentDashboard" class="self-employment-dashboard"></div>
        <div id="selfEmploymentIconPicker" class="position-icon-picker self-employment-icon-picker" role="dialog" aria-label="Projekt-Icon auswaehlen" hidden></div>
      </section>

      <section class="panel income-planning-panel" data-module-section="income_planning">
        ${moduleTopBar("Zeitbudget & Habits", "Wochenplaner, Arbeit, Nebentaetigkeiten und Gewohnheiten")}
        <div class="section-heading income-planning-heading">
          <div>
            <h2>Zeitbudget & Habits</h2>
            <p class="planning-account-summary">
              Plane Arbeitszeit, Nebentaetigkeiten, Habits und private Zeitbloecke als Wochenbudget.
            </p>
          </div>
          <div class="button-row">
            ${toolbarIconButton("income-planning-import-csv", "CSV importieren", "upload")}
            ${toolbarIconButton("income-planning-export-csv", "CSV exportieren", "download")}
            <input class="visually-hidden" id="incomePlanningCsvImport" type="file" accept=".csv,text/csv" />
            <span id="incomePlanningExportStatus" class="export-status" aria-live="polite"></span>
          </div>
        </div>
        <section class="income-card income-planning-summary-card">
          <div id="incomePlanningMetricGrid" class="income-planning-metric-grid"></div>
          <div id="incomePlanningWarnings" class="income-planning-warnings"></div>
          <div id="incomePlanningTimeCharts" class="income-planning-time-charts"></div>
        </section>
        <section class="income-card income-planning-weekly-card">
          <div class="income-section-head income-planning-weekly-head">
            <h3>Wochenplaner / Kalender</h3>
            <p>Kompakte 7-Tage-Grafik mit 24h-Achse, Dragging und Popup-Datenerfassung.</p>
          </div>
          <div id="incomePlanningWeeklyPlanner" class="income-planning-weekly-planner"></div>
        </section>
        <section class="income-card income-planning-work-card">
          <div class="income-section-head income-planning-card-head">
            <div>
              <h3>Zeitplanung fuer Arbeit und Nebentaetigkeiten</h3>
              <p>Kompakte Uebersicht; Details und Slots werden per Popup gepflegt.</p>
            </div>
            <div class="button-row">
              <button class="button" type="button" data-action="income-planning-add-work-block">Taetigkeit hinzufuegen</button>
            </div>
          </div>
          <div id="incomePlanningWorkBlocks" class="income-planning-block-list"></div>
        </section>
        <section class="income-card income-planning-career-card">
          <div class="income-section-head">
            <h3>Berufsleben / Hauptjob</h3>
            <p>Ein aktiver Gehalts- oder Ausbildungsblock als berufliche Zeitbasis.</p>
          </div>
          <div id="incomePlanningCareerLife" class="income-planning-career-life"></div>
        </section>
        <section class="income-card income-planning-time-card">
          <div class="income-section-head income-planning-card-head">
            <div>
              <h3>Zeitannahmen</h3>
              <p>Schlaf sowie private Verpflichtungen, Freizeit, Puffer und sonstige Ereignisse.</p>
            </div>
            <button class="button secondary" type="button" data-action="income-planning-add-manual-block">Zeitblock hinzufuegen</button>
          </div>
          <div class="income-planning-time-block">
            <div class="income-planning-time-controls">
              <div id="incomePlanningAssumptions" class="income-planning-assumptions"></div>
              <div id="incomePlanningManualBlocks" class="income-planning-block-list"></div>
            </div>
          </div>
        </section>
        <section class="income-card income-planning-habits-card">
          <div class="income-section-head income-planning-card-head">
            <div>
              <h3>Habits</h3>
              <p>Gute und schlechte Gewohnheiten als planbare Zeitbloecke erfassen.</p>
            </div>
            <button class="button" type="button" data-action="income-planning-add-habit">Habit hinzufuegen</button>
          </div>
          <div class="income-planning-habit-stamp-layout">
            <div id="incomePlanningHabits" class="income-planning-block-list"></div>
            <aside id="incomePlanningCalendarStamps" class="income-planning-calendar-stamp-list" aria-label="Kalender-Stempel"></aside>
          </div>
        </section>
        <div id="incomePlanningDialogRoot"></div>
        <div id="incomePlanningPlanningPopupRoot"></div>
      </section>

      <section class="panel account-panel" data-module-section="planning_scenarios">
        ${moduleTopBar("Planungen und Szenarien", "Positionen, Jahrestabelle und Investmentplanung")}
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

      <section class="panel planning-year-panel" data-module-section="planning_scenarios">
        <div class="section-heading">
          <h2>Jahresplanung</h2>
          <span id="planningYearActiveLabel" class="planning-year-active-label">Start</span>
        </div>
        <div id="planningYearNavigation" class="planning-year-navigation" role="tablist" aria-label="Jahresplanung"></div>
      </section>

      <section class="panel" data-module-section="planning_scenarios">
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
            </div>
          </div>
          <div class="button-row">
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
        <div id="positionCadenceSwitchHost" class="position-cadence-switch-host"></div>
        <div id="positionTableControls" class="position-table-controls"></div>
        <div class="table-wrap position-table-wrap">
          <table class="position-table">
            <thead id="positionsHead"></thead>
            <tbody id="positionsBody"></tbody>
          </table>
        </div>
        <div class="button-row">
          <button class="button" id="addPositionButton" type="button" data-action="add-position">Ausgabe hinzufuegen</button>
        </div>
        <div id="positionIconPicker" class="position-icon-picker" role="dialog" aria-label="Positionslabel auswaehlen" hidden></div>
        <div id="positionCostDialogRoot"></div>
      </section>

      <section class="panel result-panel" data-module-section="planning_scenarios">
        <div class="section-heading result-table-heading">
          <h2>Jahrestabellen pro Konto <span id="activeYearAccountName"></span></h2>
          <div class="result-header-actions">
            <div id="yearAccountSelector" class="year-account-selector" aria-label="Aktives Konto fuer Grafik Bearbeitung Export"></div>
            <div class="position-mode-switch result-column-switch" role="group" aria-label="Jahrestabellen-Spalten">
              <button class="position-mode-button" type="button" data-action="toggle-result-max-needed" aria-pressed="false">
                Max. Bedarf Monatsanfang
              </button>
            </div>
          </div>
        </div>
        <div id="reserveChartPopup" class="reserve-chart-popup" aria-label="Einnahmen Ausgaben Sparrate Grafik"></div>
        <div id="accountYearTableOverview" class="account-year-table-overview"></div>
      </section>

      <section class="panel income-tracker-panel" data-module-section="income">
        ${moduleTopBar("Jahresnettoeinkommen", "Tracker, Aussagen, Status und Grafiken")}
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
          <section id="incomeTrackerInput" class="income-card income-input-card income-module-section">
            <div class="income-section-head">
              <h3>Jahresnettoeinkommen-Tracker</h3>
              <p>Hauptbereich zur Erfassung und Pflege der Einkommensdaten.</p>
            </div>
            <div class="position-mode-stack income-mode-stack">
              <div class="position-mode-switch position-table-switch income-tab-switch" role="tablist" aria-label="Einkommen Eingaben">
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
            </div>

            <div id="incomeYearlyTab" class="income-tab-panel">
              <div id="incomeYearLabelFilters" class="position-label-filter-row income-label-filter-row"></div>
              <div class="table-wrap">
                <table class="income-table income-yearly-table">
                  <thead>
                    <tr>
                      <th class="income-year-flag-col">Aktiv</th>
                      <th class="income-year-flag-col">View</th>
                      <th class="income-year-label-col">Label</th>
                      <th>Jahr</th>
                      <th>Jahresnetto</th>
                      <th>Jahresbrutto</th>
                      <th>Steuer / Abgaben</th>
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
        <p id="incomeExportStatus" class="export-status" aria-live="polite"></p>
      </section>

      <section class="panel income-tracker-panel" data-module-section="income">
        <aside id="incomeInsightsSection" class="income-card income-insights-card income-module-section">
          <div class="income-section-head">
            <h3>Automatische Aussagen</h3>
            <p>Automatisch erzeugte Bewertungstexte oberhalb der Jahreswerte.</p>
          </div>
          <div id="incomeInsights" class="income-insight-list"></div>
        </aside>

        <div id="incomeStatusSection" class="income-status-grid income-module-section">
          <section class="income-card">
            <div class="income-section-head">
              <h3>Jahreswerte und Quellenstatus</h3>
              <p>Anzeige der genutzten Jahreswerte, Quellen und Realwerte.</p>
            </div>
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
      </section>

      <section class="panel income-tracker-panel" data-module-section="income">
        <section id="incomeChartsSection" class="income-module-section income-chart-section">
          <div class="income-section-head">
            <h3>Jahresnettoeinkommen-Grafiken</h3>
            <p>Diagramme und visuelle Auswertung des Einkommensverlaufs.</p>
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
        </section>
      </section>

      <div class="income-shared-hosts">
        <input class="visually-hidden" id="incomeCsvImport" type="file" accept=".csv,text/csv" />
        <div id="incomeTaxDialogRoot"></div>
        <div id="incomeAnalysisDialogRoot"></div>
        <div id="incomeYearLabelPicker" class="position-icon-picker income-year-label-picker" role="dialog" aria-label="Einkommenslabel auswaehlen" hidden></div>
        <div id="incomeMilestoneTypePicker" class="position-icon-picker income-milestone-type-picker" role="dialog" aria-label="Meilenstein-Typ auswaehlen" hidden></div>
        <div id="incomePlanningHabitIconPicker" class="position-icon-picker income-planning-habit-icon-picker" role="dialog" aria-label="Icon auswaehlen" hidden></div>
        <div id="incomePlanningStampPicker" class="position-icon-picker income-planning-stamp-picker" role="dialog" aria-label="Kalender-Stempel bearbeiten" hidden></div>
        <div id="incomePlanningStampMenu" class="position-icon-picker income-planning-stamp-menu" role="dialog" aria-label="Kalender-Stempel-Menue" hidden></div>
      </div>

      <section class="panel investment-panel" data-module-section="planning_scenarios">
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
            <div id="investmentIncludeList" class="include-list"></div>
            <div id="investmentIncludePopup" class="investment-include-popup" role="dialog" aria-modal="true" aria-label="Investierbare Positionen auswaehlen" hidden></div>
          </div>

          <div class="investment-controls">
            <div class="investment-control-top">
              <aside class="savings-rate-card" aria-label="Sparrate">
                <div class="savings-rate-card-head">
                  <span>Jaehrliche Sparrate</span>
                  <button
                    class="savings-rate-toggle"
                    type="button"
                    data-action="toggle-retirement-depot-allowance"
                    data-depot-scope="retirement"
                    aria-pressed="true"
                  >Zulage ein</button>
                </div>
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
                ${dateField("investmentEndDate", "Enddatum", "endDate", { depotScope: "standard retirement", disabled: true })}
                ${numberField("retirementDepotChildren", "Kindergeldberechtigte Kinder", "investment", "retirementDepotChildren", { min: 0, max: 20, step: 1, depotScope: "retirement" })}
                ${numberField("percentageWithdrawalStartAge", "Entnahme ab Alter", "investment", "percentageWithdrawalStartAge", { min: 0, max: 110, step: 1, depotScope: "standard" })}
                ${numberField("percentageWithdrawalRatePercent", "Prozent-Entnahme p. a.", "investment", "percentageWithdrawalRatePercent", { min: 0, max: 20, step: 0.1, depotScope: "standard" })}
              </div>
              <div class="investment-range-panel">
                ${rangeField("investmentReturnPercent", "Jaehrliche Rendite", 0, 30, 0.1)}
                ${rangeField("capitalGainsTaxPercent", "Kapitalertragsteuer", 0, 50, 0.1)}
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
                <span class="legend-item"><span class="legend-dot red"></span> <span data-investment-tax-legend="active">Kapitalertragsteuer</span></span>
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
                ${detailLine("Reserve/Erbe zum Enddatum", "detailBequestReserve")}
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
                <span class="legend-item"><span class="legend-dot red"></span> <span data-investment-tax-legend="combined">Steuern</span></span>
                <span class="legend-item"><span class="legend-dash"></span> Normales Depot</span>
              </div>
            </section>
          </div>
        </div>
      </section>

      <section class="panel real-estate-panel" data-module-section="real_estate_financing">
        ${moduleTopBar("Immobilien", "Immobilienfinanzierung")}
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
              ${realEstateBooleanField("purchaseActivated", "Immobilie gekauft / Kauf geplant")}
            </div>
            <div class="real-estate-slider-grid two-columns">
              ${realEstateAssumptionControl("interestRatePercent", "Zinssatz", 0, 10, 0.05)}
              ${realEstateAssumptionControl("propertyValueGrowthPercent", "Immobilienwertzuwachs in % pro Jahr", 0, 10, 0.05)}
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

      <section class="panel statutory-pension-panel" data-module-section="statutory_pension">
        ${moduleTopBar("Gesetzliche Rente", "Rentenpunkte und Szenarien")}
        <div id="statutoryPensionSection">
          <div class="statutory-pension-section">
            <h2>Gesetzliche Rente</h2>
            <div class="statutory-pension-scenarios">
              <span>Pessimistisch</span>
              <span>Basis</span>
              <span>Optimistisch</span>
            </div>
          </div>
        </div>
        <div id="statutoryPensionTaxPopup" hidden></div>
      </section>

      <section class="panel combined-wealth-panel" data-module-section="combined_wealth">
        ${moduleTopBar("Vermoegen", "Vermoegensvarianten / Kombination")}
        <div class="section-heading">
          <h2>Vermoegen</h2>
        </div>
        <div class="combined-wealth-grid">
          <section class="combined-wealth-card combined-module-card-shell">
            <h3>Vermoegensmodule</h3>
            <div class="combined-module-grid">
              <article class="combined-module-card" data-combined-module-card="includeCashPositions">
                <div class="combined-module-card-head">
                  <div class="combined-module-copy">
                    ${combinedModuleIcon("cash")}
                    <span>
                      <strong>Cash aus Konto</strong>
                      <small>Das Konto grenzt freie investierbare Positionen fuer Cash-Zuwachs ein.</small>
                    </span>
                  </div>
                  <button class="combined-module-switch" type="button" data-action="toggle-combined-module" data-combined-toggle="includeCashPositions" aria-pressed="false">
                    <span data-combined-toggle-status>Aus</span>
                  </button>
                </div>
                <div id="combinedCashAccountSelector" class="planning-account-cards combined-single-selector combined-cash-account-selector" aria-label="Cash-Konto fuer Kombination"></div>
                <div id="combinedCashPositionPopup" class="combined-cash-position-popup" role="dialog" aria-modal="true" aria-label="Investierbare Cash-Positionen" hidden></div>
                <div class="combined-module-metrics">
                  <span>Datenquelle <strong id="combinedCashSourceMetric">-</strong></span>
                  <span>Cash-Zuwachs <strong id="combinedCashRateMetric">-</strong></span>
                </div>
              </article>

              <article class="combined-module-card" data-combined-module-card="includeDepotDevelopment">
                <div class="combined-module-card-head">
                  <div class="combined-module-copy">
                    ${combinedModuleIcon("depot")}
                    <span>
                      <strong>Depots</strong>
                      <small>Nur vorhandene Depotvarianten aus dem gewaehlten Konto werden kombiniert.</small>
                    </span>
                  </div>
                  <button class="combined-module-switch" type="button" data-action="toggle-combined-module" data-combined-toggle="includeDepotDevelopment" aria-pressed="false">
                    <span data-combined-toggle-status>Aus</span>
                  </button>
                </div>
                <div class="combined-account-module">
                  <span class="combined-module-label">Kombi-Leitkonto</span>
                  <div id="combinedLeadInvestmentAccountSelector" class="planning-account-cards combined-single-selector" aria-label="Leitkonto fuer Depot in Kombination"></div>
                </div>
                <div id="combinedDepotSelector" class="combined-depot-selector" aria-label="Depotauswahl fuer Kombination"></div>
              </article>

              <article class="combined-module-card" data-combined-module-card="includeStatutoryPension">
                <div class="combined-module-card-head">
                  <div class="combined-module-copy">
                    ${combinedModuleIcon("pension")}
                    <span>
                      <strong>Rente</strong>
                      <small>Ein Szenario startet ab Rentenalter; nur der Sparanteil erhoeht das Vermoegen.</small>
                    </span>
                  </div>
                  <button class="combined-module-switch" type="button" data-action="toggle-combined-module" data-combined-toggle="includeStatutoryPension" aria-pressed="false">
                    <span data-combined-toggle-status>Aus</span>
                  </button>
                </div>
                <div id="combinedPensionScenarioSelector" class="combined-pension-scenarios" aria-label="Rentenszenario fuer Kombination"></div>
                <div class="combined-pension-inputs">
                  <label>
                    <span>Monatliche Rente</span>
                    <input type="number" min="0" step="1" data-combined-number="statutoryPensionMonthlyAmount" />
                  </label>
                  <label>
                    <span>Sparanteil aus Rente %</span>
                    <input type="number" min="0" max="100" step="1" data-combined-number="statutoryPensionSavingsRatePercent" />
                  </label>
                </div>
              </article>

              <article class="combined-module-card" data-combined-module-card="includeRealEstateFinancing">
                <div class="combined-module-card-head">
                  <div class="combined-module-copy">
                    ${combinedModuleIcon("property")}
                    <span>
                      <strong>Immobilien</strong>
                      <small>Wert, Schuld und Verkaufserloes gelten nur bei aktiviertem Immobilienkauf.</small>
                    </span>
                  </div>
                  <button class="combined-module-switch" type="button" data-action="toggle-combined-module" data-combined-toggle="includeRealEstateFinancing" aria-pressed="false">
                    <span data-combined-toggle-status>Aus</span>
                  </button>
                </div>
                <div class="combined-module-metrics">
                  <span>Datenquelle <strong>Immobilienfinanzierung</strong></span>
                  <span>Status <strong id="combinedRealEstateActivationMetric">-</strong></span>
                  <span>Finanzierungszeitraum <strong id="combinedRealEstateFinancingYearsMetric">-</strong></span>
                </div>
              </article>
            </div>
          </section>
          <section class="combined-wealth-card combined-chart-card">
            <h3>Kombinierter Vermoegenspfad</h3>
            <div id="combinedWealthChart" class="wealth-chart-host"></div>
            <div id="combinedWealthChartPopup" class="investment-chart-popup combined-wealth-popup" role="dialog" aria-label="Kombinationsdetails" hidden></div>
            <div id="combinedWealthLifeSummary" class="wealth-detail-box"></div>
          </section>
        </div>
      </section>
    </main>
  `;
}
