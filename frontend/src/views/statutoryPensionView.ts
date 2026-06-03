import type { StatutoryPensionModel } from "../domain/statutoryPension";
import { escapeHtml, money, percent } from "../lib/format";
import type { StatutoryPensionScenarioId, StatutoryPensionSettings } from "../types";

export function renderStatutoryPensionHtml(model: StatutoryPensionModel, settings: StatutoryPensionSettings): string {
  const hasContributions = model.totalContribution > 0;
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
          ${statutoryPensionNumberField("averageAnnualIncome", "Durchschnittsentgelt", settings.averageAnnualIncome, 1)}
          ${statutoryPensionNumberField("currentPensionValue", "Rentenwert aktuell", settings.currentPensionValue, 0.01)}
          ${statutoryPensionNumberField("projectionPensionValue", "Rentenwert Prognose", settings.projectionPensionValue, 0.01)}
          ${statutoryPensionNumberField("annualContributionCeilingGross", "BBG Brutto/Jahr", settings.annualContributionCeilingGross, 1)}
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
      `
          : `<div class="chart-empty statutory-pension-empty">
        Noch keine RV-Beitraege vorhanden. Erfasse im Jahresnettoeinkommen unter Steuer- und Abgabenpositionen Arbeitnehmer- und Arbeitgeberbeitraege zur Rentenversicherung.
      </div>`
      }
    </div>
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
        ${statutoryPensionScenarioRangeField(
          scenario.id,
          "taxRatePercent",
          "Steuerquote %",
          scenario.taxRatePercent,
          0.1,
          0,
          50,
          percent(scenario.taxRatePercent)
        )}
        ${statutoryPensionScenarioRangeField(
          scenario.id,
          "healthInsurancePercent",
          "Krankenversicherung %",
          scenario.healthInsurancePercent,
          0.05,
          0,
          20,
          percent(scenario.healthInsurancePercent)
        )}
        ${statutoryPensionScenarioRangeField(
          scenario.id,
          "careInsurancePercent",
          "Pflegeversicherung %",
          scenario.careInsurancePercent,
          0.05,
          0,
          10,
          percent(scenario.careInsurancePercent)
        )}
      </div>
      <div class="statutory-pension-scenario-results">
        <span>Monatsrente brutto <strong>${escapeHtml(money(scenario.grossMonthlyPension))}</strong></span>
        <span>Monatsrente netto <strong>${escapeHtml(money(scenario.netMonthlyPension))}</strong></span>
        <span>Abzuege gesamt <strong>${escapeHtml(money(scenario.totalDeductionsMonthly))}</strong></span>
        <span>Besteuerungsanteil <strong>${escapeHtml(percent(scenario.taxableSharePercent))}</strong></span>
        <span>Rentenjahr <strong>${escapeHtml(String(scenario.retirementYear))}</strong></span>
        <span>Zusatzpunkte <strong>${escapeHtml(statutoryPensionDecimal(scenario.projectedAdditionalPoints, 2))}</strong></span>
        <span>Punkte gesamt <strong>${escapeHtml(statutoryPensionDecimal(scenario.projectedTotalPoints, 2))}</strong></span>
        <span>Rentenwert dann <strong>${escapeHtml(money(scenario.projectedPensionValue))}</strong></span>
      </div>
      ${scenario.fallbackToConstantIncome ? `<small>Zukunftsprojektion ist nicht berechenbar; gleichbleibender Lohn wird genutzt.</small>` : ""}
    </article>
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
        <div class="statutory-pension-overlay-bar ${id}" style="width: ${grossWidth.toFixed(2)}%;">
          <div class="statutory-pension-overlay-net" style="width: ${netWidth.toFixed(2)}%;">
            <span>${escapeHtml(scenario.label)} netto</span>
            <strong>${escapeHtml(money(scenario.netMonthlyPension))}</strong>
          </div>
          <span class="statutory-pension-overlay-gross">Brutto ${escapeHtml(money(scenario.grossMonthlyPension))}</span>
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
        <p>Die Balken liegen uebereinander: Brutto als Hintergrund, Netto nach Steuer, Kranken- und Pflegeversicherung im Vordergrund.</p>
      </div>
      <div class="statutory-pension-overlay-chart" role="img" aria-label="Ueberlagerte Brutto- und Netto-Monatsrenten der drei Rentenszenarien">
        <div class="statutory-pension-overlay-track">${barHtml}</div>
      </div>
      <div class="statutory-pension-overlay-legend">${legendHtml}</div>
    </div>
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

function statutoryPensionDecimal(value: number, decimals: number): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(Number(value || 0));
}
