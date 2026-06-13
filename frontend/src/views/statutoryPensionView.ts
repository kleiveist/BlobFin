import { STATUTORY_PENSION_DEDUCTION_PERCENT_MAX, type StatutoryPensionModel } from "../domain/statutoryPension";
import { escapeHtml, intNumber, money, percent } from "../lib/format";
import type { StatutoryPensionScenarioId, StatutoryPensionSettings } from "../types";

export function renderStatutoryPensionHtml(
  model: StatutoryPensionModel,
  settings: StatutoryPensionSettings,
  derivedSourceYear: number | null = null
): string {
  const hasContributions = model.totalContribution > 0;
  const derivedSourceLabel = derivedSourceYear === null ? "" : intNumber(derivedSourceYear);
  return `
    <div class="statutory-pension-section">
      <div class="statutory-pension-head">
        <div>
          <p class="eyebrow">Altersvorsorge</p>
          <h3>Gesetzliche Rente</h3>
          <p>Aus den aktiven Jahreswerten und den erfassten RV-Beitraegen im Einkommenstracker abgeleitet.</p>
        </div>
        <div class="statutory-pension-basis-grid">
          ${statutoryPensionNumberField("contributionRatePercent", "Beitragssatz %", settings.contributionRatePercent, 0.1)}
          ${statutoryPensionReadonlyField("Durchschnittsentgelt", money(settings.averageAnnualIncome), derivedSourceLabel)}
          ${statutoryPensionNumberField("currentPensionValue", "Rentenwert aktuell", settings.currentPensionValue, 0.01)}
          ${statutoryPensionNumberField("projectionPensionValue", "Rentenwert Prognose", settings.projectionPensionValue, 0.01)}
          ${statutoryPensionReadonlyField("BBG Brutto/Jahr", money(settings.annualContributionCeilingGross), derivedSourceLabel)}
        </div>
      </div>
      ${
        hasContributions
          ? `
        <div class="statutory-pension-metrics">
          ${statutoryPensionMetric("Du gezahlt", money(model.employeeContributionTotal))}
          ${statutoryPensionMetric("Arbeitgeber gezahlt", money(model.employerContributionTotal))}
          ${statutoryPensionMetric("Gesamtbeitrag Rentenversicherung", money(model.totalContribution))}
          ${statutoryPensionMetric("Bisherige Rentenpunkte", statutoryPensionDecimal(model.pensionPoints, 2))}
          ${statutoryPensionMetric("Monatsrente aktuell", money(model.currentMonthlyPension))}
          ${statutoryPensionMetric("Monatsrente Prognosewert", money(model.projectedMonthlyPensionTodayValue))}
        </div>
        <div class="statutory-pension-formula">
          <strong>Rechenweg letztes Beitragsjahr</strong>
          <span>${escapeHtml(money(model.contributionYears.at(-1)?.totalContribution ?? 0))} / ${escapeHtml(
            percent(settings.contributionRatePercent)
          )} = ${escapeHtml(money(model.latestRelevantGrossIncome))} brutto/Jahr</span>
          <span>${escapeHtml(money(model.latestRelevantGrossIncome))} / ${escapeHtml(
            money(settings.averageAnnualIncome)
          )} = ${escapeHtml(statutoryPensionDecimal(model.latestPensionPointsPerYear, 2))} Rentenpunkte pro Jahr</span>
          <span>${escapeHtml(statutoryPensionDecimal(model.latestPensionPointsPerYear, 2))} Punkte x ${escapeHtml(
            money(settings.projectionPensionValue)
          )} = ca. ${escapeHtml(money(model.latestMonthlyPensionIncrease))} mehr Monatsrente brutto</span>
        </div>
        <div class="statutory-pension-scenarios">
          ${model.scenarios.map(statutoryPensionScenarioCard).join("")}
        </div>
        ${statutoryPensionScenarioOverlayChart(model)}
        ${statutoryPensionAnnualYearChart(model)}
      `
          : `<div class="chart-empty statutory-pension-empty">
        Noch keine RV-Beitraege vorhanden. Erfasse im Jahresnettoeinkommen unter Steuer- und Abgabenpositionen Arbeitnehmer- und Arbeitgeberbeitraege zur Rentenversicherung.
      </div>`
      }
    </div>
  `;
}

export function renderStatutoryPensionYearPopupHtml(
  year: StatutoryPensionModel["annualPensionYears"][number]
): string {
  return `
    <div class="chart-popup-head">
      <div>
        <span>Beitragsjahr</span>
        <strong>${escapeHtml(intNumber(year.year))}</strong>
      </div>
      <button class="chart-popup-close" type="button" data-action="close-statutory-pension-year-popup" aria-label="Popup schliessen">x</button>
    </div>
    <div class="chart-popup-list">
      ${statutoryPensionPopupSection("Rentenanspruch", [
        statutoryPensionPopupLine("gross", "Brutto", money(year.grossMonthlyPension)),
        statutoryPensionPopupTotalLine("Netto", money(year.netMonthlyPension))
      ])}
      ${statutoryPensionPopupSection("Abzuege Basis-Szenario", [
        statutoryPensionPopupLine("red", "Besteuerungsanteil", percent(year.taxableSharePercent)),
        statutoryPensionPopupLine("red", "Steuerbetrag", money(year.incomeTaxMonthly)),
        statutoryPensionPopupLine("health", "Krankenversicherung", money(year.healthInsuranceMonthly)),
        statutoryPensionPopupLine("care", "Pflegeversicherung", money(year.careInsuranceMonthly))
      ])}
      ${statutoryPensionPopupSection("Beitraege und Punkte", [
        statutoryPensionPopupLine("purple", "Rentenpunkte", statutoryPensionDecimal(year.pensionPoints, 4)),
        statutoryPensionPopupLine("grey", "Arbeitnehmerbeitrag", money(year.employeeContribution)),
        statutoryPensionPopupLine("orange", "Arbeitgeberbeitrag", money(year.employerContribution)),
        statutoryPensionPopupLine("gross", "rentenrelevantes Brutto", money(year.relevantGrossIncome))
      ])}
    </div>
  `;
}

export function renderStatutoryPensionProjectionYearPopupHtml(
  year: StatutoryPensionModel["projectedAnnualPensionYears"][number]
): string {
  const scenarioOrder: StatutoryPensionScenarioId[] = ["pessimistic", "base", "optimistic"];
  return `
    <div class="chart-popup-head">
      <div>
        <span>Prognosejahr</span>
        <strong>${escapeHtml(intNumber(year.year))} | Alter ${escapeHtml(intNumber(year.age))}</strong>
      </div>
      <button class="chart-popup-close" type="button" data-action="close-statutory-pension-projection-popup" aria-label="Popup schliessen">x</button>
    </div>
    <div class="chart-popup-list">
      ${scenarioOrder.map((id) => statutoryPensionProjectionPopupScenario(year.scenarios[id])).join("")}
    </div>
  `;
}

function statutoryPensionAnnualYearChart(model: StatutoryPensionModel): string {
  if (!model.annualPensionYears.length) return "";
  const maxNetPension = Math.max(1, ...model.annualPensionYears.map((year) => year.netMonthlyPension));
  const columnCount = Math.max(1, model.annualPensionYears.length);
  return `
    <div class="statutory-pension-year-chart">
      <div class="statutory-pension-year-head">
        <h3>Netto-Rente nach Beitragsjahr</h3>
        <p>Einzelner Netto-Monatsanspruch je Beitragsjahr mit den Abzuegen des Basis-Szenarios.</p>
      </div>
      <div class="statutory-pension-year-grid" aria-label="Netto-Monatsrente nach Beitragsjahr">
        <div class="statutory-pension-year-y-axis" aria-hidden="true">
          <span>${escapeHtml(money(maxNetPension))}</span>
          <span>${escapeHtml(money(maxNetPension / 2))}</span>
          <span>0 EUR</span>
        </div>
        <div class="statutory-pension-year-plot-scroll">
          <div class="statutory-pension-year-plot" role="list" style="--statutory-pension-year-count:${columnCount};">
            ${model.annualPensionYears
              .map((year) => statutoryPensionAnnualYearBar(year, maxNetPension))
              .join("")}
          </div>
        </div>
        <div class="statutory-pension-year-x-axis" aria-hidden="true">Jahr</div>
        <div class="statutory-pension-year-legend" aria-hidden="true">
          <span class="legend-item"><span class="legend-dot statutory-pension-net"></span> Netto-Monatsrente</span>
        </div>
      </div>
      ${statutoryPensionProjectionYearChart(model)}
      <div id="statutoryPensionYearPopup" class="investment-chart-popup statutory-pension-year-popup" role="dialog" aria-label="Rentenjahrdetails" hidden></div>
      <div id="statutoryPensionProjectionYearPopup" class="investment-chart-popup statutory-pension-year-popup" role="dialog" aria-label="Rentenprognosedetails" hidden></div>
    </div>
  `;
}

function statutoryPensionAnnualYearBar(
  year: StatutoryPensionModel["annualPensionYears"][number],
  maxNetPension: number
): string {
  const height = year.netMonthlyPension > 0 ? Math.max(2, (year.netMonthlyPension / maxNetPension) * 100) : 0;
  const valueLabel = money(year.netMonthlyPension);
  return `
    <button
      class="statutory-pension-year-bar"
      type="button"
      role="listitem"
      data-statutory-pension-year="${escapeHtml(String(year.year))}"
      title="${escapeHtml(`${year.year}: ${valueLabel}`)}"
    >
      <span class="statutory-pension-year-value">${escapeHtml(valueLabel)}</span>
      <span class="statutory-pension-year-track">
        <span class="statutory-pension-year-fill" style="height:${height.toFixed(2)}%;"></span>
      </span>
      <span class="statutory-pension-year-label">${escapeHtml(String(year.year))}</span>
    </button>
  `;
}

function statutoryPensionProjectionYearChart(model: StatutoryPensionModel): string {
  if (!model.projectedAnnualPensionYears.length) return "";
  const scenarioValues = model.projectedAnnualPensionYears.flatMap((year) =>
    Object.values(year.scenarios).map((scenario) => scenario.netMonthlyPension)
  );
  const maxNetPension = Math.max(1, ...scenarioValues);
  const columnCount = Math.max(1, model.projectedAnnualPensionYears.length);
  return `
    <div class="statutory-pension-projection-chart">
      <div class="statutory-pension-year-head">
        <h3>Prognose von heute bis Rentenalter</h3>
        <p>Die drei Szenarien werden je Jahr ueberlappend gezeigt: pessimistisch vorne, Basis und optimistisch dahinter.</p>
      </div>
      <div class="statutory-pension-year-grid" aria-label="Netto-Monatsrente als Prognose bis zum Rentenalter">
        <div class="statutory-pension-year-y-axis" aria-hidden="true">
          <span>${escapeHtml(money(maxNetPension))}</span>
          <span>${escapeHtml(money(maxNetPension / 2))}</span>
          <span>0 EUR</span>
        </div>
        <div class="statutory-pension-year-plot-scroll">
          <div class="statutory-pension-projection-plot" role="list" style="--statutory-pension-year-count:${columnCount};">
            ${model.projectedAnnualPensionYears
              .map((year) => statutoryPensionProjectionYearBar(year, maxNetPension))
              .join("")}
          </div>
        </div>
        <div class="statutory-pension-year-x-axis" aria-hidden="true">Jahr</div>
        <div class="statutory-pension-year-legend" aria-hidden="true">
          <span class="legend-item"><span class="legend-dot pessimistic"></span>Pessimistisch</span>
          <span class="legend-item"><span class="legend-dot base"></span>Basis</span>
          <span class="legend-item"><span class="legend-dot optimistic"></span>Optimistisch</span>
        </div>
      </div>
    </div>
  `;
}

function statutoryPensionProjectionYearBar(
  year: StatutoryPensionModel["projectedAnnualPensionYears"][number],
  maxNetPension: number
): string {
  const visualOrder: StatutoryPensionScenarioId[] = ["optimistic", "base", "pessimistic"];
  const label = `${year.year}: Pessimistisch ${money(year.scenarios.pessimistic.netMonthlyPension)}, Basis ${money(
    year.scenarios.base.netMonthlyPension
  )}, Optimistisch ${money(year.scenarios.optimistic.netMonthlyPension)}`;
  const maxYearValue = Math.max(...Object.values(year.scenarios).map((scenario) => scenario.netMonthlyPension));
  return `
    <button
      class="statutory-pension-projection-year-bar"
      type="button"
      role="listitem"
      data-statutory-pension-projection-year="${escapeHtml(String(year.year))}"
      title="${escapeHtml(label)}"
      aria-label="${escapeHtml(label)}"
    >
      <span class="statutory-pension-year-value">${escapeHtml(money(maxYearValue))}</span>
      <span class="statutory-pension-projection-track">
        ${visualOrder.map((id) => statutoryPensionProjectionScenarioBar(id, year.scenarios[id], maxNetPension)).join("")}
      </span>
      <span class="statutory-pension-year-label">${escapeHtml(String(year.year))}</span>
    </button>
  `;
}

function statutoryPensionProjectionScenarioBar(
  id: StatutoryPensionScenarioId,
  scenario: StatutoryPensionModel["projectedAnnualPensionYears"][number]["scenarios"][StatutoryPensionScenarioId],
  maxNetPension: number
): string {
  const height = scenario.netMonthlyPension > 0 ? Math.max(2, (scenario.netMonthlyPension / maxNetPension) * 100) : 0;
  return `
    <span
      class="statutory-pension-projection-fill ${escapeHtml(id)}"
      style="height:${height.toFixed(2)}%;"
      title="${escapeHtml(`${scenario.label}: ${money(scenario.netMonthlyPension)}`)}"
    ></span>
  `;
}

function statutoryPensionScenarioCard(scenario: StatutoryPensionModel["scenarios"][number]): string {
  return `
    <article class="statutory-pension-scenario">
      <div class="statutory-pension-scenario-head">
        <strong>${escapeHtml(scenario.label)}</strong>
        <span>${escapeHtml(money(scenario.netMonthlyPension))} netto/Monat</span>
      </div>
      <div class="statutory-pension-scenario-controls">
        ${statutoryPensionScenarioRangeField(
          scenario.id,
          "retirementAge",
          "Rentenalter",
          scenario.retirementAge,
          1,
          67,
          72,
          `${scenario.retirementAge}`
        )}
        <label class="field">
          <span>Lohnbasis</span>
          <select data-statutory-pension-scenario="${escapeHtml(scenario.id)}" data-statutory-pension-scenario-field="incomeMode">
            <option value="constant" ${scenario.incomeMode === "constant" ? "selected" : ""}>Gleichbleibender Lohn</option>
            <option value="income_projection" ${scenario.incomeMode === "income_projection" ? "selected" : ""}>Zukunftsprojektion</option>
          </select>
        </label>
        ${statutoryPensionScenarioRangeField(
          scenario.id,
          "annualPensionIncreasePercent",
          "Rentenerhoehung % p. a.",
          scenario.annualPensionIncreasePercent,
          0.1,
          0.1,
          2,
          percent(scenario.annualPensionIncreasePercent)
        )}
        ${statutoryPensionScenarioTaxButton(scenario)}
      </div>
      ${scenario.fallbackToConstantIncome ? `<small>Zukunftsprojektion ist nicht berechenbar; gleichbleibender Lohn wird genutzt.</small>` : ""}
    </article>
  `;
}

export function renderStatutoryPensionTaxPopupHtml(
  model: StatutoryPensionModel,
  scenarioId: StatutoryPensionScenarioId
): string {
  const scenario = model.scenarios.find((item) => item.id === scenarioId);
  if (!scenario) return "";
  return `
    <div class="statutory-pension-tax-backdrop" role="presentation">
      <div class="statutory-pension-tax-dialog" role="dialog" aria-modal="true" aria-labelledby="statutoryPensionTaxPopupTitle">
        <div class="statutory-pension-tax-head">
          <div>
            <span>Steuerlast</span>
            <strong id="statutoryPensionTaxPopupTitle">${escapeHtml(scenario.label)}</strong>
          </div>
          <button class="chart-popup-close" type="button" data-action="close-statutory-pension-tax-popup" aria-label="Steuerlast schliessen">x</button>
        </div>
        <div class="statutory-pension-tax-summary">
          ${statutoryPensionMetric("Brutto-Monatsrente", money(scenario.grossMonthlyPension))}
          ${statutoryPensionMetric("Abzuege gesamt", money(scenario.totalDeductionsMonthly))}
          ${statutoryPensionMetric("Netto-Monatsrente", money(scenario.netMonthlyPension))}
        </div>
        <div class="statutory-pension-tax-sliders">
          ${statutoryPensionScenarioRangeField(
            scenario.id,
            "taxRatePercent",
            "Einkommensteuer %",
            scenario.taxRatePercent,
            0.1,
            0,
            STATUTORY_PENSION_DEDUCTION_PERCENT_MAX,
            percent(scenario.taxRatePercent)
          )}
          ${statutoryPensionScenarioRangeField(
            scenario.id,
            "healthInsurancePercent",
            "Krankenversicherung %",
            scenario.healthInsurancePercent,
            0.05,
            0,
            STATUTORY_PENSION_DEDUCTION_PERCENT_MAX,
            percent(scenario.healthInsurancePercent)
          )}
          ${statutoryPensionScenarioRangeField(
            scenario.id,
            "careInsurancePercent",
            "Pflegeversicherung kinderlos %",
            scenario.careInsurancePercent,
            0.05,
            0,
            STATUTORY_PENSION_DEDUCTION_PERCENT_MAX,
            percent(scenario.careInsurancePercent)
          )}
        </div>
      </div>
    </div>
  `;
}

function statutoryPensionScenarioOverlayChart(model: StatutoryPensionModel): string {
  const scenarioById = new Map(model.scenarios.map((scenario) => [scenario.id, scenario]));
  const maxMonthlyPension = Math.max(1, ...model.scenarios.map((scenario) => scenario.grossMonthlyPension));
  const visualOrder: StatutoryPensionScenarioId[] = ["optimistic", "base", "pessimistic"];
  const legendOrder: StatutoryPensionScenarioId[] = ["pessimistic", "base", "optimistic"];
  const barHtml = visualOrder
    .map((id) => {
      const scenario = scenarioById.get(id);
      if (!scenario) return "";
      const grossWidth = Math.max(8, (scenario.grossMonthlyPension / maxMonthlyPension) * 100);
      const netWidth = scenario.grossMonthlyPension > 0 ? Math.max(4, (scenario.netMonthlyPension / scenario.grossMonthlyPension) * 100) : 0;
      return `
        <div class="statutory-pension-overlay-row ${id}">
          <div class="statutory-pension-overlay-row-head">
            <strong>${escapeHtml(scenario.label)}</strong>
            <span class="statutory-pension-overlay-gross">Brutto ${escapeHtml(money(scenario.grossMonthlyPension))}</span>
          </div>
          <div class="statutory-pension-overlay-bar ${id}" style="width: ${grossWidth.toFixed(2)}%;">
            <span class="statutory-pension-overlay-gross-label">Brutto</span>
            <div class="statutory-pension-overlay-net" style="width: ${netWidth.toFixed(2)}%;">
              <span>Netto</span>
              <strong>${escapeHtml(money(scenario.netMonthlyPension))}</strong>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
  const legendHtml = legendOrder
    .map((id) => {
      const scenario = scenarioById.get(id);
      if (!scenario) return "";
      return `
        <div class="statutory-pension-overlay-legend-card ${id}">
          <strong>${escapeHtml(scenario.label)}</strong>
          <span>Monatsrente brutto: ${escapeHtml(money(scenario.grossMonthlyPension))}</span>
          <span>Steuer: ${escapeHtml(money(scenario.incomeTaxMonthly))}</span>
          <span>Krankenversicherung: ${escapeHtml(money(scenario.healthInsuranceMonthly))}</span>
          <span>Pflegeversicherung: ${escapeHtml(money(scenario.careInsuranceMonthly))}</span>
          <span>Monatsrente netto: ${escapeHtml(money(scenario.netMonthlyPension))}</span>
          <span>Punkte gesamt: ${escapeHtml(statutoryPensionDecimal(scenario.projectedTotalPoints, 2))}</span>
          <span>Zusatzpunkte: ${escapeHtml(statutoryPensionDecimal(scenario.projectedAdditionalPoints, 2))}</span>
          <span>Rentenjahr: ${escapeHtml(String(scenario.retirementYear))}</span>
          <span>Besteuerungsanteil: ${escapeHtml(percent(scenario.taxableSharePercent))}</span>
          <span>Rentenwert: ${escapeHtml(money(scenario.projectedPensionValue))}</span>
        </div>
      `;
    })
    .join("");
  return `
    <div class="statutory-pension-overlay">
      <div>
        <h3>Renten-Szenarien im Vergleich</h3>
        <p>Brutto liegt als heller Hintergrundbalken, Netto nach Steuer, Kranken- und Pflegeversicherung als kraeftiger Vorderbalken darueber.</p>
      </div>
      <div class="statutory-pension-overlay-chart" role="img" aria-label="Ueberlagerte Brutto- und Netto-Monatsrenten der drei Rentenszenarien">
        <div class="statutory-pension-overlay-track">${barHtml}</div>
      </div>
      <div class="statutory-pension-overlay-legend">${legendHtml}</div>
    </div>
  `;
}

function statutoryPensionScenarioTaxButton(scenario: StatutoryPensionModel["scenarios"][number]): string {
  return `
    <button
      class="statutory-pension-tax-button"
      type="button"
      data-action="open-statutory-pension-tax-popup"
      data-statutory-pension-scenario="${escapeHtml(scenario.id)}"
      aria-haspopup="dialog"
    >
      <span>Steuerlast</span>
      <strong>${escapeHtml(percent(statutoryPensionTaxLoadPercent(scenario)))}</strong>
    </button>
  `;
}

function statutoryPensionNumberField(
  field: keyof StatutoryPensionSettings,
  label: string,
  value: number,
  step: number
): string {
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <input type="number" min="0" step="${step}" value="${escapeHtml(String(value))}" data-statutory-pension-field="${escapeHtml(
        String(field)
      )}" />
    </label>
  `;
}

function statutoryPensionReadonlyField(label: string, value: string, source: string): string {
  return `
    <div class="field statutory-pension-readonly-field">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      ${source ? `<small>${escapeHtml(source)}</small>` : ""}
    </div>
  `;
}

function statutoryPensionScenarioRangeField(
  scenarioId: StatutoryPensionScenarioId,
  field: keyof StatutoryPensionSettings["scenarios"][StatutoryPensionScenarioId],
  label: string,
  value: number,
  step: number,
  min: number,
  max: number,
  valueLabel: string
): string {
  return `
    <label class="range-field statutory-pension-range">
      <span>${escapeHtml(label)}</span>
      <input
        type="range"
        min="${min}"
        max="${max}"
        step="${step}"
        value="${escapeHtml(String(value))}"
        data-statutory-pension-scenario="${escapeHtml(scenarioId)}"
        data-statutory-pension-scenario-field="${escapeHtml(String(field))}"
      />
      <strong>${escapeHtml(valueLabel)}</strong>
    </label>
  `;
}

function statutoryPensionMetric(label: string, value: string): string {
  return `<div class="statutory-pension-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function statutoryPensionPopupLine(color: string, label: string, value: string): string {
  return `
    <div class="chart-popup-line">
      <span><i class="chart-popup-dot ${escapeHtml(color)}"></i>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function statutoryPensionPopupTotalLine(label: string, value: string): string {
  return `
    <div class="chart-popup-line chart-popup-total">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function statutoryPensionPopupSection(title: string, lines: string[]): string {
  return `
    <div class="chart-popup-section">
      <div class="chart-popup-section-title">${escapeHtml(title)}</div>
      ${lines.join("")}
    </div>
  `;
}

function statutoryPensionProjectionPopupScenario(
  scenario: StatutoryPensionModel["projectedAnnualPensionYears"][number]["scenarios"][StatutoryPensionScenarioId]
): string {
  const retirementNote = scenario.afterRetirementYear
    ? `nach Szenario-Rentenjahr ${scenario.retirementYear}`
    : `bis Szenario-Rentenjahr ${scenario.retirementYear}`;
  return statutoryPensionPopupSection(`${scenario.label} (${retirementNote})`, [
    statutoryPensionPopupLine(scenario.scenarioId, "Brutto", money(scenario.grossMonthlyPension)),
    statutoryPensionPopupTotalLine("Netto", money(scenario.netMonthlyPension)),
    statutoryPensionPopupLine("red", "Steuerbetrag", money(scenario.incomeTaxMonthly)),
    statutoryPensionPopupLine("health", "Krankenversicherung", money(scenario.healthInsuranceMonthly)),
    statutoryPensionPopupLine("care", "Pflegeversicherung", money(scenario.careInsuranceMonthly)),
    statutoryPensionPopupLine("purple", "Punkte gesamt", statutoryPensionDecimal(scenario.projectedTotalPoints, 4)),
    statutoryPensionPopupLine("purple", "Zusatzpunkte bis Jahr", statutoryPensionDecimal(scenario.projectedAdditionalPoints, 4)),
    statutoryPensionPopupLine("purple", "Punkte dieses Jahr", statutoryPensionDecimal(scenario.pensionPoints, 4)),
    statutoryPensionPopupLine("gross", "Prognose-Brutto", money(scenario.projectedGrossIncome)),
    statutoryPensionPopupLine("grey", "Arbeitnehmerbeitrag", money(scenario.employeeContribution)),
    statutoryPensionPopupLine("orange", "Arbeitgeberbeitrag", money(scenario.employerContribution)),
    statutoryPensionPopupLine("gross", "Rentenwert", money(scenario.projectedPensionValue))
  ]);
}

function statutoryPensionTaxLoadPercent(scenario: StatutoryPensionModel["scenarios"][number]): number {
  return scenario.taxRatePercent + scenario.healthInsurancePercent + scenario.careInsurancePercent;
}

function statutoryPensionDecimal(value: number, decimals: number): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(Number(value || 0));
}
