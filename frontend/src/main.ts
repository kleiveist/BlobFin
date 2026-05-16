import "./styles.css";

import { createId, defaultAppState, defaultInvestmentSettings } from "./data/defaults";
import { buildAssetProjection, payoutStartAge as calculatePayoutStartAge } from "./domain/assetProjection";
import { calculateReserveSummary } from "./domain/reserveCalculator";
import { exportPositionsCsv, exportYearTableCsv, parseCsv, positionsFromCsvRows } from "./lib/csv";
import {
  clamp,
  escapeHtml,
  intNumber,
  labelForPayout,
  labelForType,
  makeHeaderLabel,
  monthName,
  money,
  numberValue,
  percent
} from "./lib/format";
import { loadState, resetStoredState, saveState } from "./lib/storage";
import type {
  AppState,
  AssetProjection,
  AssetProjectionPoint,
  InvestmentSettings,
  PlanningSettings,
  ReservePosition,
  ThemeMode
} from "./types";
import { drawInvestmentChart } from "./views/investmentChart";
import { monthSelect, payoutSelect, positionTypeSelect, renderAppShell } from "./views/templates";

const root = requireRootElement();
const INTEREST_INVESTMENT_POSITION_ID = "__account-interest-investment";
const CASHBACK_INVESTMENT_POSITION_ID = "__account-cashback-investment";

let state = loadInitialState();
let draggedPositionId: string | null = null;
normalizeInvestmentBounds();
applyTheme();

renderShell();
bindEvents();
syncAllInputsFromState();
syncThemeControls();
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
    if (action === "toggle-interest-investment") toggleInterestInvestment();
    if (action === "toggle-cashback-investment") toggleCashbackInvestment();
    if (action === "close-investment-chart-popup") hideInvestmentChartPopup();
    if (action === "toggle-theme-settings") toggleThemeSettings();
    if (action === "close-theme-settings") hideThemeSettings();
    if (action === "set-theme-light") setThemeMode("light");
    if (action === "set-theme-dark") setThemeMode("dark");
    if (action === "import-positions") document.querySelector<HTMLInputElement>("#positionsCsvImport")?.click();
    if (action === "export-positions") downloadText("kosten-und-ruecklagenpositionen.csv", exportPositionsCsv(state.positions));
    if (action === "export-year") downloadText("jahreskalkulator-ruecklagen.csv", exportYearTableCsv(state.settings, state.positions));
  });

  root.addEventListener("dragstart", (event) => {
    const handle = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-position-drag-id]");
    if (!handle) return;

    draggedPositionId = handle.dataset.positionDragId || null;
    if (!draggedPositionId) return;

    event.dataTransfer?.setData("text/plain", draggedPositionId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    handle.closest("tr")?.classList.add("dragging");
  });

  root.addEventListener("dragover", (event) => {
    const row = (event.target as HTMLElement | null)?.closest<HTMLTableRowElement>("tr[data-position-row]");
    if (!row || !draggedPositionId) return;
    event.preventDefault();
    row.classList.add("drag-over");
  });

  root.addEventListener("dragleave", (event) => {
    const row = (event.target as HTMLElement | null)?.closest<HTMLTableRowElement>("tr[data-position-row]");
    row?.classList.remove("drag-over");
  });

  root.addEventListener("drop", (event) => {
    const row = (event.target as HTMLElement | null)?.closest<HTMLTableRowElement>("tr[data-position-row]");
    if (!row || !draggedPositionId) return;
    event.preventDefault();

    const targetId = row.dataset.positionRow;
    if (targetId) {
      const afterTarget = event.clientY > row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2;
      reorderPosition(draggedPositionId, targetId, afterTarget);
      renderAll();
    }
    clearDragState();
  });

  root.addEventListener("dragend", clearDragState);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideThemeSettings();
      hideInvestmentChartPopup();
    }
  });
  window.addEventListener("resize", drawCurrentInvestmentChart);
}

function renderAll(): void {
  normalizeInvestmentBounds();
  const reserve = calculateReserveSummary(state.settings, state.positions);
  renderPositions();
  renderInvestmentIncludeList(reserve);
  renderCalculations(reserve);
  syncInvestmentInputsFromState();
  saveState(state);
}

function renderCalculations(reserve: ReturnType<typeof calculateReserveSummary>): void {
  const projection = buildCurrentAssetProjection(reserve);

  setText("maxNeeded", money(reserve.maxRow.maxNeeded));
  setText("maxNeededHint", reserve.maxRow.month);
  setText("yearEndBalance", money(reserve.yearEndBalance));
  setText("totalInterest", money(reserve.totalInterest));
  setText("totalCashback", money(reserve.totalCashback));
  setText("minMonthlyRemaining", money(reserve.minRemainingRow.monthlyRemaining));
  setText("minMonthlyRemainingHint", `${reserve.minRemainingRow.month}, ohne Fixbestand`);
  setText("yearlyRemaining", money(reserve.yearlyRemaining));
  setText("yearlyRemainingHint", `${money(reserve.totalPlannedOutflow)} verplant`);

  setText("investmentNetWealthTop", money(projection.wealthAtRetirement));
  setText("investmentMonthlyPensionTop", money(projection.monthlyPension));
  setText("investmentRealWealthTop", money(projection.realWealthAtRetirement));
  setText("monthlyRateMetric", money(projection.monthlyRate));
  setText("monthlySavingsRateMetric", `${money(projection.monthlyRate)} monatlich`);
  setText("annualSavingsRateMetric", money(projection.annualSavingsRate));
  setText("wealthAtRetirementMetric", money(projection.wealthAtRetirement));
  setText("withdrawalGainMetric", money(projection.withdrawalGainMonthlyAtStart));
  setText("monthlyPensionMetric", money(projection.monthlyPension));
  setText("realWealthMetric", money(projection.realWealthAtRetirement));

  setRangeLabel("investmentReturnPercent", percent(state.investment.investmentReturnPercent));
  setRangeLabel("capitalGainsTaxPercent", percent(state.investment.capitalGainsTaxPercent));
  setRangeLabel("inflationRatePercent", percent(state.investment.inflationRatePercent));
  setInputValue("[data-retirement-age]", projection.retirementAge);

  setText(
    "detailContribution",
    contributionDetailText(projection)
  );
  setText("detailCostBasis", money(projection.costBasisAtRetirement));
  setText("detailGrowth", money(projection.growthAtRetirement));
  setText("detailGrossWealth", money(projection.grossWealthAtRetirement));
  setText("detailTax", projection.taxAtRetirement > 0 ? `-${money(projection.taxAtRetirement)}` : money(0));
  setText(
    "detailUnrealizedTax",
    projection.unrealizedTaxAtRetirement > 0 ? `-${money(projection.unrealizedTaxAtRetirement)}` : money(0)
  );
  setText("detailLiquidationWealth", money(projection.netWealthAfterFullTaxAtRetirement));
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
  hideInvestmentChartPopup();
  drawInvestmentChartWithPopup(projection);
}

function renderPositions(): void {
  const body = document.querySelector<HTMLTableSectionElement>("#positionsBody");
  if (!body) return;

  body.innerHTML = state.positions
    .map((position) => {
      return `
        <tr data-position-row="${position.id}">
          <td class="reorder-cell">
            <button class="drag-handle" type="button" draggable="true" data-position-drag-id="${position.id}" aria-label="Position verschieben" title="Position verschieben">:::</button>
          </td>
          <td class="check-cell"><input type="checkbox" data-position-id="${position.id}" data-position-field="active" ${
            position.active ? "checked" : ""
          } /></td>
          <td class="check-cell"><input type="checkbox" data-position-id="${position.id}" data-position-field="visible" ${
            position.visible ? "checked" : ""
          } /></td>
          <td><input class="name-input" value="${escapeHtml(position.name)}" data-position-id="${
            position.id
          }" data-position-field="name" /></td>
          <td>${positionTypeSelect(position)}</td>
          <td><input class="small-input amount-input" type="number" min="0" step="0.01" value="${position.amount}" data-position-id="${
            position.id
          }" data-position-field="amount" /></td>
          ${positionDateCells(position)}
          <td>${payoutSelect(position)}</td>
          <td>${monthSelect(position.id, "payoutMonth", position.payoutMonth)}</td>
          <td><input class="small-input" type="number" min="1" max="31" step="1" value="${
            position.payoutDay
          }" data-position-id="${position.id}" data-position-field="payoutDay" /></td>
          <td class="check-cell"><input type="checkbox" data-position-id="${position.id}" data-position-field="interestBearing" ${
            position.payoutType !== "once" && position.interestBearing ? "checked" : ""
          } ${position.payoutType !== "once" ? "" : "disabled"} /></td>
          <td class="check-cell"><input type="checkbox" data-position-id="${position.id}" data-position-field="cashback" ${
            position.type === "temporary" && position.cashback ? "checked" : ""
          } ${position.type === "temporary" ? "" : "disabled"} /></td>
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
      ${summary.visiblePositions.map((position) => `<th>${makeHeaderLabel(position.name)}</th>`).join("")}
      <th>Verplant ohne Fixbestand</th>
      <th>Netto uebrig</th>
      <th class="highlight-col">Max. Bedarf Monatsanfang</th>
      <th>Dauerhafter Bestand</th>
      <th>ca. Monatszins</th>
      <th>Cashback</th>
    </tr>
  `;

  body.innerHTML = summary.rows
    .map((row) => {
      return `
        <tr>
          <td>${row.month}</td>
          ${summary.visiblePositions.map((position) => `<td>${money(row.values[position.id] || 0)}</td>`).join("")}
          <td>${money(row.plannedOutflow)}</td>
          <td class="${amountClass(row.monthlyRemaining)}">${money(row.monthlyRemaining)}</td>
          <td class="highlight-col">${money(row.maxNeeded)}</td>
          <td>${money(row.permanentAfterMonthlyOutflows)}</td>
          <td class="positive">${money(row.monthlyInterest)}</td>
          <td class="positive">${money(row.monthlyCashback)}</td>
        </tr>
      `;
    })
    .join("");

  foot.innerHTML = `
    <tr>
      <th>Summe / Maximum</th>
      ${summary.visiblePositions
        .map((position) => `<th>${money(summary.rows[11]?.values[position.id] || 0)}</th>`)
        .join("")}
      <th>${money(summary.totalPlannedOutflow)}</th>
      <th class="${amountClass(summary.yearlyRemaining)}">${money(summary.yearlyRemaining)}</th>
      <th class="highlight-col">${money(summary.maxRow.maxNeeded)}</th>
      <th>${money(summary.yearEndBalance)}</th>
      <th class="positive">${money(summary.totalInterest)}</th>
      <th class="positive">${money(summary.totalCashback)}</th>
    </tr>
  `;
}

function renderInvestmentIncludeList(summary: ReturnType<typeof calculateReserveSummary>): void {
  const list = document.querySelector<HTMLDivElement>("#investmentIncludeList");
  if (!list) return;

  const interestButton = document.querySelector<HTMLButtonElement>("[data-action='toggle-interest-investment']");
  if (interestButton) {
    interestButton.classList.toggle("active", state.investment.includeAccountInterest);
    interestButton.setAttribute("aria-pressed", String(state.investment.includeAccountInterest));
  }
  const cashbackButton = document.querySelector<HTMLButtonElement>("[data-action='toggle-cashback-investment']");
  if (cashbackButton) {
    cashbackButton.classList.toggle("active", state.investment.includeAccountCashback);
    cashbackButton.setAttribute("aria-pressed", String(state.investment.includeAccountCashback));
  }
  setText("interestInvestmentAmount", `${money(summary.totalInterest)} jaehrlich aus Jahrestabelle`);
  setText("cashbackInvestmentAmount", `${money(summary.totalCashback)} jaehrlich aus Jahrestabelle`);

  const savingsPositions = state.positions.filter((position) => position.type === "savings");
  if (!savingsPositions.length) {
    list.innerHTML = `<div class="include-empty">Keine Sparrate angelegt.</div>`;
    return;
  }

  list.innerHTML = savingsPositions
    .map((position) => {
      const checked = state.investment.includedIds.includes(position.id) ? "checked" : "";
      const inactive = position.active ? "" : `<span class="muted">(inaktiv)</span>`;
      return `
        <label class="include-item">
          <input type="checkbox" data-include-position="${position.id}" ${checked} />
          <span>
            <span class="include-name">${escapeHtml(position.name)} ${inactive}</span>
            <span class="include-amount">${escapeHtml(investmentPositionSubtitle(position))}</span>
          </span>
        </label>
      `;
    })
    .join("");
}

function investmentPositionSubtitle(position: ReservePosition): string {
  const amount = investmentPositionAmountText(position);
  return `${amount} | ${labelForType(position.type)} | Abgang ${labelForPayout(position.payoutType)}`;
}

function investmentPositionAmountText(position: ReservePosition): string {
  if (position.payoutType === "once") {
    return `${money(position.amount)} einmalig (${monthName(position.payoutMonth)} ${intNumber(position.payoutYear)})`;
  }
  if (position.payoutType === "yearly") return `${money(position.amount)} jaehrlich (${monthName(position.payoutMonth)})`;
  return `${money(position.amount)} monatlich`;
}

function positionDateCells(position: ReservePosition): string {
  if (position.payoutType === "once") {
    return `
      <td class="once-year-label">Abgangsjahr</td>
      <td>
        <input class="small-input payout-year-input" type="number" min="2000" max="2200" step="1" value="${
          position.payoutYear
        }" data-position-id="${position.id}" data-position-field="payoutYear" />
      </td>
    `;
  }
  return `
    <td>${monthSelect(position.id, "startMonth", position.startMonth)}</td>
    <td>${monthSelect(position.id, "endMonth", position.endMonth)}</td>
  `;
}

function syncAllInputsFromState(): void {
  for (const key of Object.keys(state.settings) as Array<keyof PlanningSettings>) {
    setInputValue(`[data-setting="${key}"]`, state.settings[key]);
  }
  syncInvestmentInputsFromState();
  syncThemeControls();
}

function syncInvestmentInputsFromState(): void {
  syncInvestmentInputBounds();
  for (const key of Object.keys(state.investment) as Array<keyof InvestmentSettings>) {
    if (key === "includedIds" || key === "includeAccountInterest" || key === "includeAccountCashback") continue;
    setInputValue(`[data-investment="${key}"]`, state.investment[key]);
  }
  setInputValue("[data-retirement-age]", calculatePayoutStartAge(state.investment));
}

function syncInvestmentInputBounds(): void {
  const retirementAge = calculatePayoutStartAge(state.investment);
  const chartStartAge = state.investment.chartStartAge;
  setInputBounds(
    '[data-investment="chartStartAge"]',
    investmentMin("chartStartAge"),
    Math.min(investmentMax("chartStartAge"), retirementAge)
  );
  setInputBounds('[data-investment="percentageWithdrawalStartAge"]', chartStartAge, retirementAge);
}

function updatePlanningSetting(field: keyof PlanningSettings, value: string): void {
  state.settings = {
    ...state.settings,
    [field]: clamp(numberValue(value), settingMin(field), settingMax(field))
  };
}

function updateInvestmentSetting(field: keyof InvestmentSettings, value: string): void {
  if (field === "includedIds" || field === "includeAccountInterest" || field === "includeAccountCashback") return;
  if (field === "payoutEndAge") {
    const retirementAge = calculatePayoutStartAge(state.investment);
    const payoutEndAge = clamp(numberValue(value), investmentMin(field), investmentMax(field));
    state.investment = {
      ...state.investment,
      payoutEndAge,
      payoutYears: clamp(payoutEndAge - retirementAge, 1, 50)
    };
    normalizeInvestmentBounds();
    return;
  }

  state.investment = {
    ...state.investment,
    [field]: clamp(numberValue(value), investmentMin(field), investmentMax(field))
  };
  normalizeInvestmentBounds();
}

function updateRetirementAge(value: string): void {
  const retirementAge = clamp(numberValue(value), 50, 85);
  state.investment = {
    ...state.investment,
    payoutYears: clamp(state.investment.payoutEndAge - retirementAge, 1, 50)
  };
  normalizeInvestmentBounds();
}

function updatePosition(id: string, field: keyof ReservePosition, value: string | boolean): void {
  state.positions = state.positions.map((position) => {
    if (position.id !== id) return position;
    const next: ReservePosition = { ...position };

    switch (field) {
      case "active":
        next.active = Boolean(value);
        break;
      case "visible":
        next.visible = Boolean(value);
        break;
      case "interestBearing":
        next.interestBearing = next.payoutType !== "once" && Boolean(value);
        break;
      case "cashback":
        next.cashback = next.type === "temporary" && Boolean(value);
        break;
      case "amount":
      case "startMonth":
      case "endMonth":
      case "payoutYear":
      case "payoutMonth":
      case "payoutDay":
        next[field] = numberValue(String(value));
        break;
      case "type":
        if (value === "fixed" || value === "reserve" || value === "temporary" || value === "savings") {
          next.type = value;
          if (next.type !== "temporary") next.cashback = false;
        }
        break;
      case "payoutType":
        if (value === "none" || value === "monthly" || value === "yearly" || value === "once") {
          next.payoutType = value;
          if (next.payoutType === "once") {
            next.payoutYear = Number(next.payoutYear || state.settings.year);
            next.startMonth = next.payoutMonth;
            next.endMonth = next.payoutMonth;
            next.interestBearing = false;
          }
        }
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

    if (next.payoutType === "once") {
      next.startMonth = next.payoutMonth;
      next.endMonth = next.payoutMonth;
      next.interestBearing = false;
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
      visible: true,
      name: "Neue Position",
      type: "temporary",
      amount: 0,
      startMonth: 1,
      endMonth: 12,
      payoutType: "monthly",
      payoutYear: state.settings.year,
      payoutMonth: 12,
      payoutDay: 14,
      interestBearing: false,
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

function toggleInterestInvestment(): void {
  state.investment = {
    ...state.investment,
    includeAccountInterest: !state.investment.includeAccountInterest
  };
  renderAll();
}

function toggleCashbackInvestment(): void {
  state.investment = {
    ...state.investment,
    includeAccountCashback: !state.investment.includeAccountCashback
  };
  renderAll();
}

function reorderPosition(sourceId: string, targetId: string, afterTarget: boolean): void {
  if (sourceId === targetId) return;

  const moved = state.positions.find((position) => position.id === sourceId);
  if (!moved) return;

  const withoutMoved = state.positions.filter((position) => position.id !== sourceId);
  const targetIndex = withoutMoved.findIndex((position) => position.id === targetId);
  if (targetIndex < 0) return;

  const insertIndex = afterTarget ? targetIndex + 1 : targetIndex;
  withoutMoved.splice(insertIndex, 0, moved);
  state.positions = withoutMoved;
}

function resetState(): void {
  const confirmed = window.confirm("Moechtest du wirklich alle Grunddaten, Positionen und Investment-Einstellungen zuruecksetzen?");
  if (!confirmed) return;
  state = resetStoredState();
  state.investment = defaultInvestmentSettings();
  applyTheme();
  syncAllInputsFromState();
  hideThemeSettings();
  renderAll();
}

function setThemeMode(theme: ThemeMode): void {
  state = { ...state, theme };
  applyTheme();
  syncThemeControls();
  saveState(state);
  drawCurrentInvestmentChart();
}

function applyTheme(): void {
  document.documentElement.dataset.theme = state.theme;
  const metaThemeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.content = state.theme === "dark" ? "#101412" : "#f7f4ed";
  }
}

function toggleThemeSettings(): void {
  const panel = document.querySelector<HTMLDivElement>("#themeSettingsPanel");
  if (!panel) return;
  panel.hidden = !panel.hidden;
  syncThemeControls();
}

function hideThemeSettings(): void {
  const panel = document.querySelector<HTMLDivElement>("#themeSettingsPanel");
  if (panel) panel.hidden = true;
  syncThemeControls();
}

function syncThemeControls(): void {
  const panel = document.querySelector<HTMLDivElement>("#themeSettingsPanel");
  const button = document.querySelector<HTMLButtonElement>("[data-action='toggle-theme-settings']");
  if (button) button.setAttribute("aria-expanded", String(Boolean(panel && !panel.hidden)));
  for (const option of document.querySelectorAll<HTMLButtonElement>(".theme-option[data-action]")) {
    const isActive =
      (option.dataset.action === "set-theme-light" && state.theme === "light") ||
      (option.dataset.action === "set-theme-dark" && state.theme === "dark");
    option.classList.toggle("active", isActive);
    option.setAttribute("aria-pressed", String(isActive));
  }
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
    includedIds: state.investment.includedIds.filter((id) =>
      imported.some((position) => position.id === id && position.type === "savings")
    )
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

function amountClass(value: number): string {
  if (value < 0) return "negative";
  if (value > 0) return "positive";
  return "";
}

function setInputValue(selector: string, value: number | string | string[]): void {
  const input = document.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
  if (input) input.value = String(value);
}

function setInputBounds(selector: string, min: number, max: number): void {
  const input = document.querySelector<HTMLInputElement>(selector);
  if (!input) return;
  input.min = String(min);
  input.max = String(max);
}

function drawCurrentInvestmentChart(): void {
  const reserve = calculateReserveSummary(state.settings, state.positions);
  const projection = buildCurrentAssetProjection(reserve);
  hideInvestmentChartPopup();
  drawInvestmentChartWithPopup(projection);
}

function contributionDetailText(projection: AssetProjection): string {
  const recurringContribution = projection.monthlyRate * projection.savingMonths;
  const oneTimeContribution = Math.max(0, projection.totalContribution - recurringContribution);
  if (oneTimeContribution > 0.01) {
    return `${money(projection.totalContribution)} (${money(recurringContribution)} regelmaessig + ${money(
      oneTimeContribution
    )} einmalig)`;
  }
  return `${money(projection.totalContribution)} (${money(projection.monthlyRate)} x ${intNumber(
    projection.savingMonths
  )} Monate)`;
}

function drawInvestmentChartWithPopup(projection: AssetProjection): void {
  drawInvestmentChart(document.querySelector<HTMLCanvasElement>("#investmentChart"), projection, (selection) => {
    showInvestmentChartPopup(projection, selection.point, selection.clientX, selection.clientY);
  });
}

function showInvestmentChartPopup(
  projection: AssetProjection,
  point: AssetProjectionPoint,
  clientX: number,
  clientY: number
): void {
  const popup = document.querySelector<HTMLDivElement>("#investmentChartPopup");
  const card = popup?.closest<HTMLElement>(".investment-chart-card");
  if (!popup || !card) return;

  const eigenbeitrag = Math.min(Math.max(0, point.netBalance), Math.max(0, point.costBasis));
  const tax = Math.max(0, point.periodTax);
  const growth = Math.max(0, Math.max(0, point.netBalance - eigenbeitrag) - tax);
  const payoutBalance = point.phase === "payout" ? Math.max(0, point.netBalance) : 0;
  const year = state.settings.year + Math.round(point.age - projection.ageToday);

  popup.innerHTML = `
    <div class="chart-popup-head">
      <div>
        <span>Balkendetails</span>
        <strong>Alter ${intNumber(point.age)} | Jahr ${intNumber(year)}</strong>
      </div>
      <button class="chart-popup-close" type="button" data-action="close-investment-chart-popup" aria-label="Popup schliessen">x</button>
    </div>
    <div class="chart-popup-list">
      ${chartPopupLine("grey", "Eigenbeitrag", money(eigenbeitrag))}
      ${chartPopupLine("orange", "Zulagen", money(point.allowance))}
      ${chartPopupLine("green", "Wertzuwachs", money(growth))}
      ${chartPopupLine("purple", "Restguthaben (Auszahlung)", money(payoutBalance))}
      ${chartPopupLine("red", "Kapitalertragsteuer", tax > 0 ? `-${money(tax)}` : money(0))}
    </div>
  `;

  popup.hidden = false;
  popup.style.left = "12px";
  popup.style.top = "12px";

  const cardRect = card.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();
  const left = clamp(clientX - cardRect.left + 14, 12, Math.max(12, cardRect.width - popupRect.width - 12));
  const top = clamp(clientY - cardRect.top + 14, 12, Math.max(12, cardRect.height - popupRect.height - 12));
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

function chartPopupLine(color: string, label: string, value: string): string {
  return `
    <div class="chart-popup-line">
      <span><i class="chart-popup-dot ${escapeHtml(color)}"></i>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function hideInvestmentChartPopup(): void {
  const popup = document.querySelector<HTMLDivElement>("#investmentChartPopup");
  if (!popup) return;
  popup.hidden = true;
}

function buildCurrentAssetProjection(summary: ReturnType<typeof calculateReserveSummary>) {
  return buildAssetProjection(
    state.settings.year,
    investmentPositionsForProjection(summary),
    investmentSettingsForProjection(summary)
  );
}

function investmentPositionsForProjection(summary: ReturnType<typeof calculateReserveSummary>): ReservePosition[] {
  const virtualPositions: ReservePosition[] = [];
  if (state.investment.includeAccountInterest && summary.totalInterest > 0) {
    virtualPositions.push(virtualInvestmentPosition(INTEREST_INVESTMENT_POSITION_ID, "Zinsen aus Jahrestabelle", summary.totalInterest));
  }
  if (state.investment.includeAccountCashback && summary.totalCashback > 0) {
    virtualPositions.push(
      virtualInvestmentPosition(CASHBACK_INVESTMENT_POSITION_ID, "Cashback aus Jahrestabelle", summary.totalCashback)
    );
  }
  return [...state.positions, ...virtualPositions];
}

function investmentSettingsForProjection(summary: ReturnType<typeof calculateReserveSummary>): InvestmentSettings {
  const includedIds = new Set(state.investment.includedIds);
  if (state.investment.includeAccountInterest && summary.totalInterest > 0) includedIds.add(INTEREST_INVESTMENT_POSITION_ID);
  if (state.investment.includeAccountCashback && summary.totalCashback > 0) includedIds.add(CASHBACK_INVESTMENT_POSITION_ID);
  return {
    ...state.investment,
    includedIds: Array.from(includedIds)
  };
}

function virtualInvestmentPosition(id: string, name: string, amount: number): ReservePosition {
  return {
    id,
    active: true,
    name,
    type: "savings",
    amount,
    startMonth: 1,
    endMonth: 12,
    payoutType: "yearly",
    payoutYear: state.settings.year,
    payoutMonth: 12,
    payoutDay: 31,
    visible: false,
    interestBearing: false,
    cashback: false
  };
}

function clearDragState(): void {
  draggedPositionId = null;
  for (const row of root.querySelectorAll("tr.dragging, tr.drag-over")) {
    row.classList.remove("dragging", "drag-over");
  }
}

function normalizeInvestmentBounds(): void {
  const retirementAge = calculatePayoutStartAge(state.investment);
  const chartStartAge = clamp(
    state.investment.chartStartAge,
    investmentMin("chartStartAge"),
    Math.min(investmentMax("chartStartAge"), retirementAge)
  );
  state.investment = {
    ...state.investment,
    chartStartAge,
    percentageWithdrawalStartAge: clamp(state.investment.percentageWithdrawalStartAge, chartStartAge, retirementAge)
  };
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
