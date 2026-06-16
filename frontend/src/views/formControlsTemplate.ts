import { MONTHS } from "../data/defaults";
import { labelForPayout } from "../lib/format";
import { normalizePositionIcon, positionIconLabel, positionIconSvg } from "../lib/positionIcons";
import { positionFlow } from "../lib/positionKinds";
import type { InvestmentSettings, ReservePosition } from "../types";

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
  const noneLabel = position.type === "savings" ? "ohne Rhythmus" : labelForPayout("none", flow);
  if (flow === "income") {
    return `
      <select data-position-id="${position.id}" data-position-field="payoutType">
        <option value="monthly" ${position.payoutType === "monthly" ? "selected" : ""}>${labelForPayout("monthly", flow)}</option>
        <option value="yearly" ${position.payoutType === "yearly" ? "selected" : ""}>${labelForPayout("yearly", flow)}</option>
        <option value="once" ${position.payoutType === "once" ? "selected" : ""}>${labelForPayout("once", flow)}</option>
        <option value="none" ${position.payoutType === "none" ? "selected" : ""}>${labelForPayout("none", flow)}</option>
      </select>
    `;
  }

  return `
    <select data-position-id="${position.id}" data-position-field="payoutType">
      <option value="none" ${position.payoutType === "none" ? "selected" : ""}>${noneLabel}</option>
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

export function realEstateNumberField(
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

export function realEstateBooleanField(key: string, label: string): string {
  const englishLabel = realEstateEnglishLabel(key, label);
  return `
    <label class="field real-estate-toggle-field">
      <span data-real-estate-label-key="${key}" data-label-de="${label}" data-label-en="${englishLabel}">${label}</span>
      <span class="toggle-line">
        <input type="checkbox" data-real-estate-field="${key}" />
        <strong>Ja</strong>
      </span>
    </label>
  `;
}

export function realEstateAssumptionControl(
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
    purchaseActivated: "Real estate bought / purchase planned",
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

export function combinedModuleIcon(kind: "cash" | "depot" | "pension" | "property"): string {
  const paths: Record<"cash" | "depot" | "pension" | "property", string> = {
    cash: '<path d="M4 8h16v10H4z" /><path d="M7 11h3" /><path d="M14 13a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" />',
    depot: '<path d="M4 18h16" /><path d="M6 15l4-4 3 2 5-7" /><path d="M15 6h3v3" />',
    pension: '<path d="M6 19V8" /><path d="M18 19V8" /><path d="M4 19h16" /><path d="M4 8h16" /><path d="M8 13h8" />',
    property: '<path d="M4 11 12 5l8 6" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" />'
  };
  return `
    <span class="combined-module-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">${paths[kind]}</svg>
    </span>
  `;
}

export function numberField(
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

export function dateField(
  id: string,
  label: string,
  key: string,
  options: { depotScope?: string; disabled?: boolean } = {}
): string {
  const depotScopeAttr = options.depotScope ? `data-depot-scope="${options.depotScope}"` : "";
  const forceDisabled = options.disabled ? 'data-force-disabled="true"' : "";
  return `
    <label class="field" for="${id}" ${depotScopeAttr}>
      <span>${label}</span>
      <input id="${id}" type="date" data-setting="${key}" ${forceDisabled} ${options.disabled ? "disabled" : ""} />
    </label>
  `;
}

export function rangeField(
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
      <span id="${key}Label">${label}</span>
      <input type="range" min="${min}" max="${max}" step="${step}" data-investment="${key}" />
      <strong id="${key}Value">-</strong>
    </label>
  `;
}

export function retirementAgeField(): string {
  return `
    <label class="field" for="retirementAge" data-depot-scope="standard retirement">
      <span>Rentenalter</span>
      <input id="retirementAge" type="number" min="50" max="85" step="1" data-retirement-age="true" />
    </label>
  `;
}

export function chartMetric(id: string, label: string): string {
  return `
    <div class="chart-metric" id="${id}Card">
      <div class="chart-label" id="${id}Label">${label}</div>
      <div class="chart-value" id="${id}">-</div>
    </div>
  `;
}

export function withdrawalGainMetric(): string {
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

export function detailLine(label: string, id: string): string {
  return `<div class="detail-line"><span id="${id}Label">${label}</span><strong id="${id}">-</strong></div>`;
}

export function toolbarIconButton(action: string, label: string, icon: "upload" | "download" | "table"): string {
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
