import type { StatutoryPensionScenarioId } from "../../types";
import { buildStatutoryPensionModel, STATUTORY_PENSION_DEDUCTION_PERCENT_MAX, statutoryPensionDerivedSettingsFromLatestContribution, type StatutoryPensionModel } from "../../domain/statutoryPension";
import { clamp, numberValue, percent } from "../../lib/format";
import { renderStatutoryPensionHtml, renderStatutoryPensionProjectionYearPopupHtml, renderStatutoryPensionTaxPopupHtml, renderStatutoryPensionYearPopupHtml } from "../../views/statutoryPensionView";
import { runtimeApi, runtimeHost } from "./hostContext";
import { statutoryPensionScenarioIdFromValue } from "./stateRuntime";

function renderStatutoryPensionCalculations(birthYear: number): void {
  const host = document.querySelector<HTMLDivElement>("#statutoryPensionSection");
  if (!host) return;
  hideStatutoryPensionYearPopup();
  hideStatutoryPensionProjectionYearPopup();
  const statutoryPensionDerivedSettings = statutoryPensionDerivedSettingsFromLatestContribution(
    runtimeHost.state.incomeTracker,
    runtimeHost.state.statutoryPension
  );
  const model = buildStatutoryPensionModel({
    tracker: runtimeHost.state.incomeTracker,
    settings: statutoryPensionDerivedSettings.settings,
    currentYear: runtimeHost.state.settings.year,
    birthYear
  });
  runtimeHost.latestStatutoryPensionModel = model;
  host.innerHTML = renderStatutoryPensionHtml(model, statutoryPensionDerivedSettings.settings, statutoryPensionDerivedSettings.sourceYear);
  renderStatutoryPensionTaxPopup(model);
}

function renderStatutoryPensionTaxPopup(model: StatutoryPensionModel): void {
  const host = document.querySelector<HTMLDivElement>("#statutoryPensionTaxPopup");
  if (!host) return;
  if (!runtimeHost.statutoryPensionTaxPopupScenarioId) {
    host.innerHTML = "";
    host.hidden = true;
    return;
  }
  const html = renderStatutoryPensionTaxPopupHtml(model, runtimeHost.statutoryPensionTaxPopupScenarioId);
  if (!html) {
    hideStatutoryPensionTaxPopup();
    return;
  }
  host.innerHTML = html;
  host.hidden = false;
}

function updateStatutoryPensionField(field: string, value: string): void {
  if (
    field !== "contributionRatePercent" &&
    field !== "currentPensionValue" &&
    field !== "projectionPensionValue"
  ) {
    return;
  }
  runtimeHost.state.statutoryPension = {
    ...runtimeHost.state.statutoryPension,
    [field]: Math.max(0, numberValue(value))
  };
}

function updateStatutoryPensionScenarioField(
  scenarioId: StatutoryPensionScenarioId,
  field: string,
  value: string
): void {
  if (!(scenarioId in runtimeHost.state.statutoryPension.scenarios)) return;
  const scenario = runtimeHost.state.statutoryPension.scenarios[scenarioId];
  const nextScenario = { ...scenario };
  if (field === "retirementAge") {
    nextScenario.retirementAge = clamp(Math.round(numberValue(value)), 67, 72);
  } else if (field === "annualPensionIncreasePercent") {
    nextScenario.annualPensionIncreasePercent = clamp(numberValue(value), 0.1, 2);
  } else if (field === "taxRatePercent") {
    nextScenario.taxRatePercent = clamp(numberValue(value), 0, STATUTORY_PENSION_DEDUCTION_PERCENT_MAX);
  } else if (field === "healthInsurancePercent") {
    nextScenario.healthInsurancePercent = clamp(numberValue(value), 0, STATUTORY_PENSION_DEDUCTION_PERCENT_MAX);
  } else if (field === "careInsurancePercent") {
    nextScenario.careInsurancePercent = clamp(numberValue(value), 0, STATUTORY_PENSION_DEDUCTION_PERCENT_MAX);
  } else if (field === "incomeMode") {
    nextScenario.incomeMode = value === "constant" ? "constant" : "income_projection";
  } else {
    return;
  }
  runtimeHost.state.statutoryPension = {
    ...runtimeHost.state.statutoryPension,
    scenarios: {
      ...runtimeHost.state.statutoryPension.scenarios,
      [scenarioId]: nextScenario
    }
  };
}

function syncStatutoryPensionRangeLabel(input: HTMLInputElement | HTMLSelectElement): void {
  const scenarioId = statutoryPensionScenarioIdFromValue(input.dataset.statutoryPensionScenario);
  const field = input.dataset.statutoryPensionScenarioField;
  const scenario = scenarioId ? runtimeHost.state.statutoryPension.scenarios[scenarioId] : null;
  const label = input.parentElement?.querySelector<HTMLElement>("strong");
  if (!scenario || !field || !label) return;
  if (field === "retirementAge") {
    label.textContent = String(scenario.retirementAge);
    return;
  }
  if (
    field === "annualPensionIncreasePercent" ||
    field === "taxRatePercent" ||
    field === "healthInsurancePercent" ||
    field === "careInsurancePercent"
  ) {
    label.textContent = percent(scenario[field]);
  }
}

function showStatutoryPensionYearPopup(year: number, clientX: number, clientY: number): void {
  const point = runtimeHost.latestStatutoryPensionModel?.annualPensionYears.find((entry) => entry.year === year);
  const popup = document.querySelector<HTMLDivElement>("#statutoryPensionYearPopup");
  const card = popup?.closest<HTMLElement>(".statutory-pension-year-chart");
  if (!point || !popup || !card) return;

  popup.innerHTML = renderStatutoryPensionYearPopupHtml(point);
  popup.hidden = false;
  runtimeApi.positionChartPopup(popup, card, clientX, clientY);
}

function showStatutoryPensionProjectionYearPopup(year: number, clientX: number, clientY: number): void {
  const point = runtimeHost.latestStatutoryPensionModel?.projectedAnnualPensionYears.find((entry) => entry.year === year);
  const popup = document.querySelector<HTMLDivElement>("#statutoryPensionProjectionYearPopup");
  const card = popup?.closest<HTMLElement>(".statutory-pension-year-chart");
  if (!point || !popup || !card) return;

  popup.innerHTML = renderStatutoryPensionProjectionYearPopupHtml(point);
  popup.hidden = false;
  runtimeApi.positionChartPopup(popup, card, clientX, clientY);
}

function hideStatutoryPensionYearPopup(): void {
  const popup = document.querySelector<HTMLDivElement>("#statutoryPensionYearPopup");
  if (popup) popup.hidden = true;
}

function hideStatutoryPensionProjectionYearPopup(): void {
  const popup = document.querySelector<HTMLDivElement>("#statutoryPensionProjectionYearPopup");
  if (popup) popup.hidden = true;
}

function openStatutoryPensionTaxPopup(value: string | undefined): void {
  const scenarioId = statutoryPensionScenarioIdFromValue(value);
  if (!scenarioId) return;
  runtimeHost.statutoryPensionTaxPopupScenarioId = scenarioId;
  runtimeApi.renderAll();
}

function closeStatutoryPensionTaxPopup(): void {
  hideStatutoryPensionTaxPopup();
}

function hideStatutoryPensionTaxPopup(): void {
  runtimeHost.statutoryPensionTaxPopupScenarioId = null;
  const host = document.querySelector<HTMLDivElement>("#statutoryPensionTaxPopup");
  if (!host) return;
  host.innerHTML = "";
  host.hidden = true;
}

function pensionScenarioLabel(scenarioId: StatutoryPensionScenarioId): string {
  if (scenarioId === "pessimistic") return "Pessimistisch";
  if (scenarioId === "optimistic") return "Optimistisch";
  return "Basis";
}

export function configurePensionRuntime(): void {
  Object.assign(runtimeApi, {
    renderStatutoryPensionCalculations,
    renderStatutoryPensionTaxPopup,
    updateStatutoryPensionField,
    updateStatutoryPensionScenarioField,
    syncStatutoryPensionRangeLabel,
    showStatutoryPensionYearPopup,
    showStatutoryPensionProjectionYearPopup,
    hideStatutoryPensionYearPopup,
    hideStatutoryPensionProjectionYearPopup,
    openStatutoryPensionTaxPopup,
    closeStatutoryPensionTaxPopup,
    hideStatutoryPensionTaxPopup,
    pensionScenarioLabel
  });
}
