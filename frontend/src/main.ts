import "./styles.css";

import { createId, defaultAppState, defaultInvestmentSettings } from "./data/defaults";
import { buildAssetProjection, payoutStartAge as calculatePayoutStartAge } from "./domain/assetProjection";
import { calculateReserveSummary } from "./domain/reserveCalculator";
import { exportPositionsCsv, exportYearTableCsv, parseCsv, positionsFromCsvRows } from "./lib/csv";
import {
  clamp,
  escapeHtml,
  intNumber,
  labelForType,
  makeHeaderLabel,
  money,
  numberValue,
  percent
} from "./lib/format";
import { loadState, resetStoredState, saveState } from "./lib/storage";
import type { AppState, InvestmentSettings, PlanningSettings, ReservePosition } from "./types";
import { drawInvestmentChart } from "./views/investmentChart";
import { monthSelect, payoutSelect, positionTypeSelect, renderAppShell } from "./views/templates";

const root = requireRootElement();

let state = loadInitialState();

renderShell();
bindEvents();
syncAllInputsFromState();
renderAll();

function loadInitialState(): AppState {
  try {
    return loadState();
  } catch (error) {
    console.warn("Stored state could not be loaded; falling back to defaults.", error);
    return defaultAppState();
  }
}

function requireRootElement(): HTMLDivElement {
  const element = document.querySelector<HTMLDivElement>("#app");
  if (!element) {
    throw new Error("Application root #app is missing.");
  }
  return element;
}

function renderShell(): void {
  root.innerHTML = renderAppShell();
}

function bindEvents(): void {
  root.addEventListener("input", (event) => {
    const target = formControl(event.target);
    if (!target) return;

    if (target.dataset.setting) {
      updatePlanningSetting(target.dataset.setting as keyof PlanningSettings, target.value);
      renderAll();
      return;
    }

    if (target.dataset.investment) {
      updateInvestmentSetting(target.dataset.investment as keyof InvestmentSettings, target.value);
      renderAll();
      return;
    }

    if (target.dataset.retirementAge) {
      updateRetirementAge(target.value);
      renderAll();
    }
  });

  root.addEventListener("change", (event) => {
    const target = formControl(event.target);
    if (!target) return;

    if (target.dataset.positionId && target.dataset.positionField) {
      const value = target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value;
      updatePosition(target.dataset.positionId, target.dataset.positionField as keyof ReservePosition, value);
      renderAll();
      return;
    }

    if (target.dataset.includePosition && target instanceof HTMLInputElement) {
      toggleInvestmentPosition(target.dataset.includePosition, target.checked);
      renderAll();
      return;
    }

    if (target.id === "positionsCsvImport" && target instanceof HTMLInputElement) {
      void importPositionsFromFile(target.files?.[0]);
      target.value = "";
    }
  });

  root.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>("button[data-action]");
    if (!button) return;

    event.preventDefault();
    const action = button.dataset.action;
    if (action === "add-position") addPosition();
    if (action === "reset") resetState();
    if (action === "import-positions") document.querySelector<HTMLInputElement>("#positionsCsvImport")?.click();
    if (action === "export-positions") downloadText("kosten-und-ruecklagenpositionen.csv", exportPositionsCsv(state.positions));
    if (action === "export-year") downloadText("jahreskalkulator-ruecklagen.csv", exportYearTableCsv(state.settings, state.positions));
  });

  window.addEventListener("resize", drawCurrentInvestmentChart);
}

function renderAll(): void {
  renderPositions();
  renderInvestmentIncludeList();
  renderCalculations();
  saveState(state);
}

function renderCalculations(): void {
  const reserve = calculateReserveSummary(state.settings, state.positions);
  const projection = buildAssetProjection(state.settings.year, state.positions, state.investment);

  setText("maxNeeded", money(reserve.maxRow.maxNeeded));
  setText("maxNeededHint", `${reserve.maxRow.month}, ohne Notgroschen`);
  setText("maxNeededWithEmergencyFund", money(reserve.maxNeededWithEmergencyFund));
  setText("maxNeededWithEmergencyFundHint", `${money(state.settings.emergencyFund)} Notgroschen enthalten`);
  setText("yearEndBalance", money(reserve.yearEndBalance));
  setText("totalInterest", money(reserve.totalInterest));
  setText("totalCashback", money(reserve.totalCashback));

  setText("investmentNetWealthTop", money(projection.wealthAtRetirement));
  setText("investmentMonthlyPensionTop", money(projection.monthlyPension));
  setText("investmentRealWealthTop", money(projection.realWealthAtRetirement));
  setText("monthlyRateMetric", money(projection.monthlyRate));
  setText("monthlySavingsRateMetric", `${money(projection.monthlyRate)} monatlich`);
  setText("annualSavingsRateMetric", money(projection.annualSavingsRate));
  setText("wealthAtRetirementMetric", money(projection.wealthAtRetirement));
  setText("monthlyPensionMetric", money(projection.monthlyPension));
  setText("realWealthMetric", money(projection.realWealthAtRetirement));

  setRangeLabel("investmentReturnPercent", percent(state.investment.investmentReturnPercent));
  setRangeLabel("capitalGainsTaxPercent", percent(state.investment.capitalGainsTaxPercent));
  setRangeLabel("inflationRatePercent", percent(state.investment.inflationRatePercent));
  setInputValue("[data-retirement-age]", projection.retirementAge);

  setText(
    "detailContribution",
    `${money(projection.totalContribution)} (${money(projection.monthlyRate)} x ${intNumber(
      projection.savingMonths
    )} Monate)`
  );
  setText("detailGrowth", money(projection.growthAtRetirement));
  setText("detailGrossWealth", money(projection.grossWealthAtRetirement));
  setText("detailTax", `-${money(projection.taxAtRetirement)}`);
  setText("detailNetWealth", money(projection.wealthAtRetirement));
  setText("detailInflationFactor", `${projection.inflationFactorAtRetirement.toFixed(2).replace(".", ",")}x`);
  setText("detailRealWealth", money(projection.realWealthAtRetirement));
  setText("detailAnnualSavingsRate", money(projection.annualSavingsRate));
  setText("detailAgeToday", `${intNumber(projection.ageToday)} Jahre`);
  setText("detailPayoutStartAge", `${intNumber(projection.retirementAge)} Jahre`);
  setText("detailPercentageWithdrawalStartAge", `${intNumber(projection.percentageWithdrawalStartAge)} Jahre`);
  setText("detailPercentageWithdrawalRate", percent(projection.percentageWithdrawalRatePercent));
  setText("detailPercentageWithdrawalMonthly", money(projection.percentageWithdrawalMonthlyAtStart));
  setText("detailPercentageWithdrawalAnnual", money(projection.percentageWithdrawalAnnualAtStart));
  setText("detailSavingMonths", `${intNumber(projection.savingMonths)} Monate`);
  setText("detailMonthlyPension", money(projection.monthlyPension));
  setText("detailRealMonthlyPension", money(projection.realMonthlyPension));
  setText("detailSelectedMonthlyRate", money(projection.monthlyRate));

  renderResultTable(reserve);
  drawInvestmentChart(document.querySelector<HTMLCanvasElement>("#investmentChart"), projection);
}

function renderPositions(): void {
  const body = document.querySelector<HTMLTableSectionElement>("#positionsBody");
  if (!body) return;

  body.innerHTML = state.positions
    .map((position) => {
      return `
        <tr>
          <td><input type="checkbox" data-position-id="${position.id}" data-position-field="active" ${
            position.active ? "checked" : ""
          } /></td>
          <td><input class="name-input" value="${escapeHtml(position.name)}" data-position-id="${
            position.id
          }" data-position-field="name" /></td>
          <td>${positionTypeSelect(position)}</td>
          <td><input class="small-input" type="number" min="0" step="0.01" value="${position.amount}" data-position-id="${
            position.id
          }" data-position-field="amount" /></td>
          <td>${monthSelect(position.id, "startMonth", position.startMonth)}</td>
          <td>${monthSelect(position.id, "endMonth", position.endMonth)}</td>
          <td>${payoutSelect(position)}</td>
          <td>${monthSelect(position.id, "payoutMonth", position.payoutMonth)}</td>
          <td><input class="small-input" type="number" min="1" max="31" step="1" value="${
            position.payoutDay
          }" data-position-id="${position.id}" data-position-field="payoutDay" /></td>
          <td><input type="checkbox" data-position-id="${position.id}" data-position-field="cashback" ${
            position.cashback ? "checked" : ""
          } /></td>
          <td><button class="icon-button danger" type="button" data-action="remove-${position.id}" aria-label="Position entfernen">x</button></td>
        </tr>
      `;
    })
    .join("");

  for (const button of body.querySelectorAll<HTMLButtonElement>("button[data-action^='remove-']")) {
    button.addEventListener("click", () => {
      const id = button.dataset.action?.replace("remove-", "");
      if (!id) return;
      removePosition(id);
      renderAll();
    });
  }
}

function renderResultTable(summary: ReturnType<typeof calculateReserveSummary>): void {
  const head = document.querySelector<HTMLTableSectionElement>("#resultHead");
  const body = document.querySelector<HTMLTableSectionElement>("#resultBody");
  const foot = document.querySelector<HTMLTableSectionElement>("#resultFoot");
  if (!head || !body || !foot) return;

  head.innerHTML = `
    <tr>
      <th class="month-col">Monat</th>
      ${summary.activePositions.map((position) => `<th>${makeHeaderLabel(position.name)}</th>`).join("")}
      <th class="highlight-col">Max. Bedarf Monatsanfang</th>
      <th>Dauerhafter Bestand</th>
      <th>ca. Monatszins</th>
    </tr>
  `;

  body.innerHTML = summary.rows
    .map((row) => {
      return `
        <tr>
          <td>${row.month}</td>
          ${summary.activePositions.map((position) => `<td>${money(row.values[position.id] || 0)}</td>`).join("")}
          <td class="highlight-col">${money(row.maxNeeded)}</td>
          <td>${money(row.permanentAfterMonthlyOutflows)}</td>
          <td class="positive">${money(row.monthlyInterest)}</td>
        </tr>
      `;
    })
    .join("");

  foot.innerHTML = `
    <tr>
      <th>Summe / Maximum</th>
      ${summary.activePositions
        .map((position) => `<th>${money(summary.rows[11]?.values[position.id] || 0)}</th>`)
        .join("")}
      <th class="highlight-col">${money(summary.maxRow.maxNeeded)}</th>
      <th>${money(summary.yearEndBalance)}</th>
      <th class="positive">${money(summary.totalInterest)}</th>
    </tr>
  `;
}

function renderInvestmentIncludeList(): void {
  const list = document.querySelector<HTMLDivElement>("#investmentIncludeList");
  if (!list) return;

  list.innerHTML = state.positions
    .map((position) => {
      const checked = state.investment.includedIds.includes(position.id) ? "checked" : "";
      const inactive = position.active ? "" : `<span class="muted">(inaktiv)</span>`;
      return `
        <label class="include-item">
          <input type="checkbox" data-include-position="${position.id}" ${checked} />
          <span>
            <span class="include-name">${escapeHtml(position.name)} ${inactive}</span>
            <span class="include-amount">${money(position.amount)} pro aktivem Monat | ${escapeHtml(
              labelForType(position.type)
            )}</span>
          </span>
        </label>
      `;
    })
    .join("");
}

function syncAllInputsFromState(): void {
  for (const key of Object.keys(state.settings) as Array<keyof PlanningSettings>) {
    setInputValue(`[data-setting="${key}"]`, state.settings[key]);
  }
  for (const key of Object.keys(state.investment) as Array<keyof InvestmentSettings>) {
    if (key === "includedIds") continue;
    setInputValue(`[data-investment="${key}"]`, state.investment[key]);
  }
  setInputValue("[data-retirement-age]", calculatePayoutStartAge(state.investment));
}

function updatePlanningSetting(field: keyof PlanningSettings, value: string): void {
  state.settings = {
    ...state.settings,
    [field]: clamp(numberValue(value), settingMin(field), settingMax(field))
  };
}

function updateInvestmentSetting(field: keyof InvestmentSettings, value: string): void {
  if (field === "includedIds") return;
  if (field === "payoutEndAge") {
    const retirementAge = calculatePayoutStartAge(state.investment);
    const payoutEndAge = clamp(numberValue(value), investmentMin(field), investmentMax(field));
    state.investment = {
      ...state.investment,
      payoutEndAge,
      payoutYears: clamp(payoutEndAge - retirementAge, 1, 50)
    };
    return;
  }

  state.investment = {
    ...state.investment,
    [field]: clamp(numberValue(value), investmentMin(field), investmentMax(field))
  };
}

function updateRetirementAge(value: string): void {
  const retirementAge = clamp(numberValue(value), 50, 85);
  state.investment = {
    ...state.investment,
    payoutYears: clamp(state.investment.payoutEndAge - retirementAge, 1, 50)
  };
}

function updatePosition(id: string, field: keyof ReservePosition, value: string | boolean): void {
  state.positions = state.positions.map((position) => {
    if (position.id !== id) return position;
    const next: ReservePosition = { ...position };

    switch (field) {
      case "active":
      case "cashback":
        next[field] = Boolean(value);
        break;
      case "amount":
      case "startMonth":
      case "endMonth":
      case "payoutMonth":
      case "payoutDay":
        next[field] = numberValue(String(value));
        break;
      case "type":
        if (value === "fixed" || value === "reserve" || value === "temporary") next.type = value;
        break;
      case "payoutType":
        if (value === "none" || value === "monthly" || value === "yearly") next.payoutType = value;
        break;
      case "name":
        next.name = String(value);
        break;
      case "id":
        break;
    }

    if (next.startMonth > next.endMonth) {
      const startMonth = next.startMonth;
      next.startMonth = next.endMonth;
      next.endMonth = startMonth;
    }

    return next;
  });
}

function addPosition(): void {
  state.positions = [
    ...state.positions,
    {
      id: createId(),
      active: true,
      name: "Neue Position",
      type: "temporary",
      amount: 0,
      startMonth: 1,
      endMonth: 12,
      payoutType: "monthly",
      payoutMonth: 12,
      payoutDay: 14,
      cashback: false
    }
  ];
  renderAll();

  window.setTimeout(() => {
    const inputs = document.querySelectorAll<HTMLInputElement>("#positionsBody .name-input");
    const lastInput = inputs[inputs.length - 1];
    lastInput?.focus();
    lastInput?.select();
  }, 0);
}

function removePosition(id: string): void {
  state.positions = state.positions.filter((position) => position.id !== id);
  state.investment = {
    ...state.investment,
    includedIds: state.investment.includedIds.filter((item) => item !== id)
  };
}

function toggleInvestmentPosition(id: string, checked: boolean): void {
  const includedIds = new Set(state.investment.includedIds);
  if (checked) includedIds.add(id);
  else includedIds.delete(id);
  state.investment = { ...state.investment, includedIds: Array.from(includedIds) };
}

function resetState(): void {
  state = resetStoredState();
  state.investment = defaultInvestmentSettings();
  syncAllInputsFromState();
  renderAll();
}

async function importPositionsFromFile(file: File | undefined): Promise<void> {
  if (!file) return;
  const text = await file.text();
  const imported = positionsFromCsvRows(parseCsv(text));
  if (!imported.length) {
    window.alert("Keine gueltigen Positionen gefunden.");
    return;
  }

  state.positions = imported;
  state.investment = {
    ...state.investment,
    includedIds: state.investment.includedIds.filter((id) => imported.some((position) => position.id === id))
  };
  renderAll();
}

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function formControl(target: EventTarget | null): HTMLInputElement | HTMLSelectElement | null {
  if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) return target;
  return null;
}

function setText(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function setRangeLabel(key: keyof InvestmentSettings, value: string): void {
  setText(`${key}Value`, value);
}

function setInputValue(selector: string, value: number | string | string[]): void {
  const input = document.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
  if (input) input.value = String(value);
}

function drawCurrentInvestmentChart(): void {
  const projection = buildAssetProjection(state.settings.year, state.positions, state.investment);
  drawInvestmentChart(document.querySelector<HTMLCanvasElement>("#investmentChart"), projection);
}

function settingMin(field: keyof PlanningSettings): number {
  if (field === "year") return 2000;
  return 0;
}

function settingMax(field: keyof PlanningSettings): number {
  if (field === "year") return 2100;
  return Number.MAX_SAFE_INTEGER;
}

function investmentMin(field: keyof InvestmentSettings): number {
  if (field === "chartStartAge") return 0;
  if (field === "birthYear") return 1962;
  if (field === "payoutEndAge") return 70;
  if (field === "percentageWithdrawalStartAge") return 0;
  if (field === "payoutYears") return 1;
  if (field === "inflationRatePercent") return 1;
  return 0;
}

function investmentMax(field: keyof InvestmentSettings): number {
  if (field === "chartStartAge") return 80;
  if (field === "birthYear") return 2009;
  if (field === "payoutEndAge") return 110;
  if (field === "percentageWithdrawalStartAge") return 110;
  if (field === "percentageWithdrawalRatePercent") return 20;
  if (field === "payoutYears") return 50;
  if (field === "investmentReturnPercent") return 30;
  if (field === "capitalGainsTaxPercent") return 50;
  if (field === "inflationRatePercent") return 10;
  return Number.MAX_SAFE_INTEGER;
}
