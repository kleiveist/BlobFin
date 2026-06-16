import type { AppState, CombinedWealthDepotKey, CombinedWealthYear, PlanningAccount, RealEstateFinancingResult, ReservePosition, StatutoryPensionScenarioId } from "../../types";
import type { StatutoryPensionModel } from "../../domain/statutoryPension";
import { COMBINED_DEPOTS } from "../combined-wealth/config";
import { buildCombinedWealthSeries, type CombinedWealthDepotProjection, combinedWealthHorizonYears } from "../../domain/combinedWealth";
import { clamp, escapeHtml, intNumber, money, numberValue } from "../../lib/format";
import { incomeYearEntryTaxTotal } from "../../domain/incomeTracker";
import { normalizePositionIcon, positionIconSvg } from "../../lib/positionIcons";
import { positionFlow } from "../../lib/positionKinds";
import { runtimeApi, runtimeHost } from "./hostContext";
import { selectedSavingsContributionForProjectionYear } from "../../domain/investmentContributions";
import { setInputValue, setText } from "./runtimeDom";
import { statutoryPensionScenarioIdFromValue } from "./stateRuntime";
import { type CombinedWealthLineId, renderCombinedWealthChart, renderCombinedWealthLifeSummary, renderCombinedWealthPopup } from "../../views/wealthCharts";

type CombinedToggleKey = {
  [Key in keyof AppState["combinedWealth"]]: AppState["combinedWealth"][Key] extends boolean ? Key : never;
}[keyof AppState["combinedWealth"]];

type CombinedNumberKey = "statutoryPensionMonthlyAmount" | "statutoryPensionSavingsRatePercent";

function selectedCombinedCashPositions(account: PlanningAccount | null = runtimeApi.selectedCombinedCashPlanningAccount()): ReservePosition[] {
  if (!account) return [];
  const selectedIds = new Set(runtimeHost.state.combinedWealth.cashPositionIds);
  return combinedCashSelectablePositions(account).filter((position) => selectedIds.has(position.id));
}

function combinedCashSelectablePositions(account: PlanningAccount | null = runtimeApi.selectedCombinedCashPlanningAccount()): ReservePosition[] {
  if (!account) return [];
  const blockedIds = combinedCashBlockedPositionIds();
  return account.yearlyRows.filter(
    (position) =>
      position.active &&
      position.type === "savings" &&
      positionFlow(position) === "expense" &&
      !blockedIds.has(position.id)
  );
}

function combinedCashBlockedPositionIds(): Set<string> {
  return new Set([...runtimeApi.investmentSelectedPositionIds(), ...runtimeApi.realEstateSelectedSourceIds()]);
}

function combinedCashSelectedPositionIds(): Set<string> {
  return new Set(runtimeHost.state.combinedWealth.cashPositionIds);
}

function calculateCombinedWealthYears(
  realEstate: RealEstateFinancingResult,
  depotProjections: CombinedWealthDepotProjection[],
  pension: ReturnType<typeof combinedPensionInput>
): CombinedWealthYear[] {
  const depotEndYear = depotProjections.reduce(
    (maxYear, depot) => Math.max(maxYear, depot.birthYear + depot.projection.endAge),
    runtimeHost.state.settings.year
  );
  const pensionEndYear = pension.enabled ? pension.retirementYear + 35 : runtimeHost.state.settings.year;
  const realEstateEndYear = realEstate.years.at(-1)?.year ?? runtimeHost.state.settings.year;
  const horizonYears = combinedWealthHorizonYears(
    runtimeHost.state.settings.year,
    Math.max(depotEndYear, realEstateEndYear),
    pensionEndYear,
    runtimeApi.planningEndYear()
  );

  const cashContribution = combinedCashContribution(horizonYears, runtimeApi.selectedCombinedCashPlanningAccount());

  return buildCombinedWealthSeries({
    startYear: runtimeHost.state.settings.year,
    horizonYears,
    cashStartValue: cashContribution.cashStartValue,
    yearlyCashDelta: cashContribution.yearlyCashDelta,
    yearlyCashDeltas: cashContribution.yearlyCashDeltas,
    realEstateSaleYear: runtimeHost.state.realEstate.purchaseActivated && runtimeHost.state.combinedWealth.includeRealEstateFinancing
      ? runtimeHost.state.realEstate.plannedSaleYear
      : null,
    realEstateEstimatedSaleValue: runtimeHost.state.realEstate.estimatedSaleValue,
    realEstateEquityCapital: realEstate.equityCapital,
    realEstateStartValue: realEstate.effectivePropertyStartValue,
    depotProjections,
    pension,
    realEstateYears: realEstate.years,
    toggles: runtimeHost.state.combinedWealth
  });
}

function inactiveCombinedRealEstateResult(startYear: number): RealEstateFinancingResult {
  return {
    years: [],
    months: [],
    startLoanAmount: 0,
    equityCapital: 0,
    monthlyPayment: 0,
    derivedInitialRepaymentPercent: 0,
    annualSpecialRepayment: 0,
    effectivePropertyStartValue: 0,
    totalProjectCost: 0,
    totalInterestDue: 0,
    totalInterestPaid: 0,
    totalInterestShortfall: 0,
    totalLoanCost: 0,
    financingYears: 0,
    projectionYears: 0,
    financingEndYear: startYear,
    projectionEndYear: startYear,
    validationErrors: []
  };
}

function combinedDepotProjectionInputs(account: PlanningAccount | null): CombinedWealthDepotProjection[] {
  if (!account) return [];
  return selectedCombinedDepotKeys().map((key) => {
    const projection = runtimeApi.buildDepotAssetProjection(key, account.id);
    const settings = runtimeApi.depotInvestmentSettingsForAccount(key, account.id);
    return {
      id: key,
      label: runtimeApi.depotLabel(key),
      projection,
      birthYear: settings.birthYear
    };
  });
}

function combinedPensionInput(model: StatutoryPensionModel | null, birthYear: number): {
  enabled: boolean;
  retirementYear: number;
  monthlyAmount: number;
  annualTax: number;
  savingsRatePercent: number;
} {
  const scenarioId = runtimeHost.state.combinedWealth.statutoryPensionScenario;
  const scenario = model?.scenarios.find((item) => item.id === scenarioId);
  const scenarioSettings = runtimeHost.state.statutoryPension.scenarios[scenarioId];
  const retirementYear = scenario?.retirementYear ?? birthYear + scenarioSettings.retirementAge;
  const scenarioNetPension = Math.max(0, scenario?.netMonthlyPension ?? 0);
  const pensionTaxScale =
    scenarioNetPension > 0 ? runtimeHost.state.combinedWealth.statutoryPensionMonthlyAmount / scenarioNetPension : 0;
  return {
    enabled: runtimeHost.state.combinedWealth.includeStatutoryPension,
    retirementYear,
    monthlyAmount: runtimeHost.state.combinedWealth.statutoryPensionMonthlyAmount,
    annualTax: Math.max(0, scenario?.incomeTaxMonthly ?? 0) * Math.max(0, pensionTaxScale) * 12,
    savingsRatePercent: runtimeHost.state.combinedWealth.statutoryPensionSavingsRatePercent
  };
}

function combinedCashContribution(horizonYears: number, account: PlanningAccount | null): {
  cashStartValue: number;
  yearlyCashDelta: number;
  yearlyCashDeltas: number[];
} {
  const cashStartValue = 0;
  const yearlyCashDeltas = Array.from({ length: Math.max(1, horizonYears) }, () => 0);

  if (account && runtimeHost.state.combinedWealth.includeCashPositions) {
    const selectedPositions = selectedCombinedCashPositions(account);
    const selectedIds = runtimeHost.state.combinedWealth.cashPositionIds;
    for (let yearOffset = 0; yearOffset < yearlyCashDeltas.length; yearOffset += 1) {
      yearlyCashDeltas[yearOffset] = selectedSavingsContributionForProjectionYear(
        selectedPositions,
        selectedIds,
        runtimeHost.state.settings.year,
        yearOffset
      );
    }
  }

  const yearlyCashDelta = yearlyCashDeltas[0] ?? 0;
  if (!Number.isFinite(cashStartValue) || !Number.isFinite(yearlyCashDelta)) {
    return { cashStartValue: 0, yearlyCashDelta: 0, yearlyCashDeltas };
  }

  return { cashStartValue, yearlyCashDelta, yearlyCashDeltas };
}

function renderCombinedWealthCalculations(years: CombinedWealthYear[]): void {
  runtimeHost.latestCombinedWealthYears = years;
  if (!runtimeHost.selectedCombinedWealthYear && years.length) {
    runtimeHost.selectedCombinedWealthYear = years[years.length - 1].year;
  }
  if (runtimeHost.selectedCombinedWealthYear && !years.some((entry) => entry.year === runtimeHost.selectedCombinedWealthYear)) {
    runtimeHost.selectedCombinedWealthYear = years[years.length - 1]?.year ?? null;
  }

  const chartHost = document.querySelector<HTMLDivElement>("#combinedWealthChart");
  if (chartHost) {
    chartHost.innerHTML = renderCombinedWealthChart({
      points: years,
      selectedYear: runtimeHost.selectedCombinedWealthYear,
      lineVisibility: runtimeHost.combinedWealthLineVisibility,
      formatMoney: (value) => money(value)
    });
  }

  const detail = document.querySelector<HTMLDivElement>("#combinedWealthLifeSummary");
  if (!detail) return;
  detail.innerHTML = renderCombinedWealthLifeSummary({
    points: years,
    taxesAndDeductions: combinedTaxesAndDeductions(years),
    formatMoney: (value) => money(value),
    formatInt: (value) => intNumber(value)
  });
}

function combinedTaxesAndDeductions(years: CombinedWealthYear[]): number {
  if (!years.length) return 0;
  const startYear = years[0].year;
  const endYear = years[years.length - 1].year;
  return runtimeHost.state.incomeTracker.yearlyEntries.reduce((sum, entry) => {
    if (!entry.active || entry.year < startYear || entry.year > endYear) return sum;
    return sum + incomeYearEntryTaxTotal(entry);
  }, 0);
}

function toggleCombinedWealthLine(lineId: CombinedWealthLineId | undefined): void {
  if (!lineId || !(lineId in runtimeHost.combinedWealthLineVisibility)) return;
  runtimeHost.combinedWealthLineVisibility = {
    ...runtimeHost.combinedWealthLineVisibility,
    [lineId]: !runtimeHost.combinedWealthLineVisibility[lineId]
  };
  renderCombinedWealthCalculations(runtimeHost.latestCombinedWealthYears);
}

function renderCombinedModuleControls(): void {
  const cashSelector = document.querySelector<HTMLDivElement>("#combinedCashAccountSelector");
  const leadSelector = document.querySelector<HTMLDivElement>("#combinedLeadInvestmentAccountSelector");
  const depotSelector = document.querySelector<HTMLDivElement>("#combinedDepotSelector");
  const pensionSelector = document.querySelector<HTMLDivElement>("#combinedPensionScenarioSelector");
  const cashAccount = runtimeApi.selectedCombinedCashPlanningAccount();

  if (cashSelector) {
    cashSelector.innerHTML = runtimeHost.state.planningAccounts.length
      ? orderedCombinedCashAccounts(cashAccount)
          .map((account) => {
            const active = cashAccount?.id === account.id;
            return `
              <button
                class="planning-account-card ${active ? "active" : ""}"
                type="button"
                data-action="select-combined-cash-account-${account.id}"
                aria-pressed="${active}"
                aria-haspopup="dialog"
              >
                <strong>${escapeHtml(account.name)}</strong>
                <small>${escapeHtml(account.type)}</small>
                <small>${intNumber(account.yearlyRows.length)} Positionen</small>
              </button>
            `;
          })
          .join("")
      : '<span class="chart-empty">Noch kein Konto vorhanden.</span>';
  }

  if (leadSelector) {
    const leadAccount = runtimeApi.selectedCombinedLeadInvestmentPlanningAccount();
    leadSelector.innerHTML = runtimeHost.state.planningAccounts.length
      ? runtimeHost.state.planningAccounts
          .map((account) => {
            const active = leadAccount?.id === account.id;
            return `
              <button
                class="planning-account-card ${active ? "active" : ""}"
                type="button"
                data-action="select-combined-lead-account-${account.id}"
                aria-pressed="${active}"
              >
                <strong>${escapeHtml(account.name)}</strong>
                <small>${escapeHtml(account.type)}</small>
                <small>${intNumber(account.yearlyRows.length)} Positionen</small>
              </button>
            `;
          })
          .join("")
      : '<span class="chart-empty">Noch kein Konto vorhanden.</span>';
  }

  if (depotSelector) {
    const selectedKeys = new Set(selectedCombinedDepotKeys());
    const leadAccount = runtimeApi.selectedCombinedLeadInvestmentPlanningAccount();
    depotSelector.innerHTML = leadAccount
      ? COMBINED_DEPOTS.map(({ key, label }) => {
          const active = selectedKeys.has(key);
          const settings = runtimeApi.depotInvestmentSettingsForAccount(key, leadAccount.id);
          return `
            <button
              class="combined-depot-option ${active ? "active" : ""}"
              type="button"
              data-action="toggle-combined-depot"
              data-combined-depot="${key}"
              aria-pressed="${active}"
            >
              <strong>${escapeHtml(label)}</strong>
              <span>${intNumber(settings.includedIds.length)} Positionen</span>
            </button>
          `;
        }).join("")
      : '<span class="chart-empty">Kein Leitkonto vorhanden.</span>';
  }

  if (pensionSelector) {
    const selectedScenario = runtimeHost.state.combinedWealth.statutoryPensionScenario;
    const scenarioById = new Map((runtimeHost.latestStatutoryPensionModel?.scenarios ?? []).map((scenario) => [scenario.id, scenario]));
    pensionSelector.innerHTML = (["pessimistic", "base", "optimistic"] as const)
      .map((scenarioId) => {
        const scenario = scenarioById.get(scenarioId);
        const active = selectedScenario === scenarioId;
        return `
          <button
            class="combined-pension-scenario ${active ? "active" : ""}"
            type="button"
            data-action="select-combined-pension-scenario"
            data-combined-pension-scenario="${scenarioId}"
            aria-pressed="${active}"
          >
            <strong>${escapeHtml(scenario?.label ?? runtimeApi.pensionScenarioLabel(scenarioId))}</strong>
            <span>${escapeHtml(scenario ? `${money(scenario.netMonthlyPension)} netto/Monat` : "Keine Prognose")}</span>
            <small>Rentenalter ${escapeHtml(String(scenario?.retirementAge ?? runtimeHost.state.statutoryPension.scenarios[scenarioId].retirementAge))}</small>
          </button>
        `;
      })
      .join("");
  }

  const cashPreview = combinedCashContribution(1, cashAccount);
  setText("combinedCashSourceMetric", cashAccount?.name ?? "-");
  setText("combinedCashRateMetric", money(cashPreview.yearlyCashDelta));
  setText(
    "combinedRealEstateActivationMetric",
    runtimeHost.state.realEstate.purchaseActivated
      ? runtimeHost.state.realEstate.plannedSaleYear
        ? `aktiv bis Verkauf ${intNumber(runtimeHost.state.realEstate.plannedSaleYear)}`
        : "aktiv"
      : "Kauf nicht aktiviert"
  );
  setText(
    "combinedRealEstateFinancingYearsMetric",
    runtimeHost.state.realEstate.purchaseActivated ? runtimeApi.realEstateFinancingYearsText(runtimeHost.latestRealEstateResult) : "-"
  );
  setInputValue('[data-combined-number="statutoryPensionMonthlyAmount"]', runtimeHost.state.combinedWealth.statutoryPensionMonthlyAmount);
  setInputValue(
    '[data-combined-number="statutoryPensionSavingsRatePercent"]',
    runtimeHost.state.combinedWealth.statutoryPensionSavingsRatePercent
  );
  renderCombinedCashPositionPopup();
}

function orderedCombinedCashAccounts(activeAccount: PlanningAccount | null): PlanningAccount[] {
  if (!activeAccount) return runtimeHost.state.planningAccounts;
  return [activeAccount, ...runtimeHost.state.planningAccounts.filter((account) => account.id !== activeAccount.id)];
}

function renderCombinedCashPositionPopup(): void {
  const popup = document.querySelector<HTMLDivElement>("#combinedCashPositionPopup");
  if (!popup) return;
  const account = runtimeHost.combinedCashPopupAccountId ? runtimeApi.planningAccountById(runtimeHost.combinedCashPopupAccountId) : null;
  if (!account) {
    popup.hidden = true;
    popup.innerHTML = "";
    return;
  }

  const positions = combinedCashSelectablePositions(account);
  const selectedIds = new Set(runtimeHost.state.combinedWealth.cashPositionIds);
  const selectedCount = positions.filter((position) => selectedIds.has(position.id)).length;
  const positionList = positions.length
    ? positions
        .map((position) => {
          const checked = selectedIds.has(position.id) ? "checked" : "";
          return `
            <label class="include-item combined-cash-position-item">
              <input type="checkbox" data-combined-cash-position="${position.id}" ${checked} />
              <span class="include-icon">${positionIconSvg(normalizePositionIcon(position.icon))}</span>
              <span>
                <span class="include-name">${escapeHtml(position.name)}</span>
                <span class="include-amount">${escapeHtml(runtimeApi.investmentPositionSubtitle(position))}</span>
              </span>
            </label>
          `;
        })
        .join("")
    : '<div class="include-empty">Keine freien investierbaren Positionen in diesem Konto.</div>';

  popup.innerHTML = `
    <div class="combined-cash-position-dialog">
      <div class="chart-popup-head">
        <div>
          <span>Cash aus Konto</span>
          <strong>${escapeHtml(account.name)}</strong>
        </div>
        <button class="chart-popup-close" type="button" data-action="close-combined-cash-position-popup" aria-label="Popup schliessen">x</button>
      </div>
      <div class="include-list combined-cash-position-list">${positionList}</div>
      <div class="combined-cash-position-actions">
        <span>${intNumber(selectedCount)} aktiv</span>
        <button class="button" type="button" data-action="close-combined-cash-position-popup">Fertig</button>
      </div>
    </div>
  `;
  popup.hidden = false;
}

function syncCombinedToggleInputsFromState(): void {
  for (const [key, value] of Object.entries(runtimeHost.state.combinedWealth)) {
    if (typeof value !== "boolean") continue;
    const control = document.querySelector<HTMLElement>(`[data-combined-toggle="${key}"]`);
    const card = document.querySelector<HTMLElement>(`[data-combined-module-card="${key}"]`);
    const purchaseMissing = key === "includeRealEstateFinancing" && value && !runtimeHost.state.realEstate.purchaseActivated;
    const effectiveValue = purchaseMissing ? false : value;
    card?.classList.toggle("active", effectiveValue);
    if (!control) continue;
    if (control instanceof HTMLInputElement) {
      control.checked = effectiveValue;
      continue;
    }
    control.classList.toggle("active", effectiveValue);
    control.classList.toggle("blocked", purchaseMissing);
    control.setAttribute("aria-pressed", String(effectiveValue));
    const status = control.querySelector<HTMLElement>("[data-combined-toggle-status]");
    if (status) status.textContent = purchaseMissing ? "Kauf aus" : value ? "Aktiv" : "Aus";
  }
}

function updateCombinedToggle(key: CombinedToggleKey, checked: boolean): void {
  if (key === "includeRealEstateFinancing" && checked && !runtimeHost.state.realEstate.purchaseActivated) {
    runtimeHost.state.realEstate = {
      ...runtimeHost.state.realEstate,
      purchaseActivated: true
    };
  }
  runtimeHost.state.combinedWealth = {
    ...runtimeHost.state.combinedWealth,
    [key]: checked
  } as AppState["combinedWealth"];
}

function updateCombinedNumber(key: CombinedNumberKey, value: string): void {
  const parsed = numberValue(value);
  runtimeHost.state.combinedWealth = {
    ...runtimeHost.state.combinedWealth,
    [key]: key === "statutoryPensionSavingsRatePercent" ? clamp(parsed, 0, 100) : Math.max(0, parsed)
  };
}

function toggleCombinedModule(key: CombinedToggleKey | undefined): void {
  if (!key || typeof runtimeHost.state.combinedWealth[key] !== "boolean") return;
  updateCombinedToggle(key, !runtimeHost.state.combinedWealth[key]);
}

function selectCombinedCashAccount(accountId: string): void {
  const account = runtimeApi.planningAccountById(accountId);
  if (!account) return;
  const selectableIds = new Set(combinedCashSelectablePositions(account).map((position) => position.id));
  runtimeHost.combinedCashPopupAccountId = accountId;
  runtimeHost.state.combinedWealth = {
    ...runtimeHost.state.combinedWealth,
    cashAccountId: accountId,
    cashPositionIds: runtimeHost.state.combinedWealth.cashPositionIds.filter((id) => selectableIds.has(id))
  };
}

function toggleCombinedCashPosition(id: string, checked: boolean): void {
  const account = runtimeApi.selectedCombinedCashPlanningAccount();
  if (!account) return;
  const selectableIds = new Set(combinedCashSelectablePositions(account).map((position) => position.id));
  if (checked && !selectableIds.has(id)) return;
  const selectedIds = new Set(runtimeHost.state.combinedWealth.cashPositionIds.filter((item) => selectableIds.has(item)));
  if (checked) selectedIds.add(id);
  else selectedIds.delete(id);
  runtimeHost.state.combinedWealth = {
    ...runtimeHost.state.combinedWealth,
    cashPositionIds: Array.from(selectedIds)
  };
}

function selectedCombinedDepotKeys(): CombinedWealthDepotKey[] {
  const keys = runtimeHost.state.combinedWealth.depotKeys.filter((key): key is CombinedWealthDepotKey =>
    COMBINED_DEPOTS.some((depot) => depot.key === key)
  );
  if (keys.length) return keys;
  runtimeHost.state.combinedWealth = { ...runtimeHost.state.combinedWealth, depotKeys: ["standard"] };
  return ["standard"];
}

function toggleCombinedDepot(depot: CombinedWealthDepotKey | undefined): void {
  if (!depot || !COMBINED_DEPOTS.some((item) => item.key === depot)) return;
  const selected = new Set(selectedCombinedDepotKeys());
  if (selected.has(depot)) {
    if (selected.size === 1) return;
    selected.delete(depot);
  } else {
    selected.add(depot);
  }
  runtimeHost.state.combinedWealth = {
    ...runtimeHost.state.combinedWealth,
    depotKeys: Array.from(selected)
  };
}

function selectCombinedPensionScenario(scenarioId: StatutoryPensionScenarioId | undefined): void {
  const id = statutoryPensionScenarioIdFromValue(scenarioId);
  if (!id) return;
  const scenario = runtimeHost.latestStatutoryPensionModel?.scenarios.find((item) => item.id === id);
  runtimeHost.state.combinedWealth = {
    ...runtimeHost.state.combinedWealth,
    statutoryPensionScenario: id,
    statutoryPensionMonthlyAmount: scenario?.netMonthlyPension ?? runtimeHost.state.combinedWealth.statutoryPensionMonthlyAmount
  };
}

function selectCombinedWealthYearWithPopup(year: number, clientX: number, clientY: number): void {
  runtimeHost.selectedCombinedWealthYear = Number.isFinite(year) && year > 0 ? year : null;
  renderCombinedWealthCalculations(runtimeHost.latestCombinedWealthYears);
  showCombinedWealthPopup(year, clientX, clientY);
}

function showCombinedWealthPopup(year: number, clientX: number, clientY: number): void {
  const point = runtimeHost.latestCombinedWealthYears.find((entry) => entry.year === year);
  const popup = document.querySelector<HTMLDivElement>("#combinedWealthChartPopup");
  const card = popup?.closest<HTMLElement>(".combined-chart-card");
  if (!point || !popup || !card) return;

  popup.innerHTML = renderCombinedWealthPopup({
    selected: point,
    finalYear: runtimeHost.latestCombinedWealthYears.at(-1) ?? point,
    formatMoney: (value) => money(value),
    formatInt: (value) => intNumber(value)
  });
  popup.hidden = false;
  runtimeApi.positionChartPopup(popup, card, clientX, clientY);
}

function hideCombinedWealthPopup(): void {
  const popup = document.querySelector<HTMLDivElement>("#combinedWealthChartPopup");
  if (popup) popup.hidden = true;
}

function hideCombinedCashPositionPopup(): void {
  runtimeHost.combinedCashPopupAccountId = null;
  const popup = document.querySelector<HTMLDivElement>("#combinedCashPositionPopup");
  if (popup) popup.hidden = true;
}

function normalizeCombinedCashPositionIds(): void {
  const account = runtimeApi.selectedCombinedCashPlanningAccount();
  if (!account) {
    runtimeHost.state.combinedWealth = { ...runtimeHost.state.combinedWealth, cashPositionIds: [] };
    return;
  }

  const selectableIds = new Set(combinedCashSelectablePositions(account).map((position) => position.id));
  const cashPositionIds = Array.from(new Set(runtimeHost.state.combinedWealth.cashPositionIds)).filter((id) =>
    selectableIds.has(id)
  );
  runtimeHost.state.combinedWealth = {
    ...runtimeHost.state.combinedWealth,
    cashPositionIds
  };
}

export function configureCombinedWealthRuntime(): void {
  Object.assign(runtimeApi, {
    selectedCombinedCashPositions,
    combinedCashSelectablePositions,
    combinedCashBlockedPositionIds,
    combinedCashSelectedPositionIds,
    calculateCombinedWealthYears,
    inactiveCombinedRealEstateResult,
    combinedDepotProjectionInputs,
    combinedPensionInput,
    combinedCashContribution,
    renderCombinedWealthCalculations,
    combinedTaxesAndDeductions,
    toggleCombinedWealthLine,
    renderCombinedModuleControls,
    orderedCombinedCashAccounts,
    renderCombinedCashPositionPopup,
    syncCombinedToggleInputsFromState,
    updateCombinedToggle,
    updateCombinedNumber,
    toggleCombinedModule,
    selectCombinedCashAccount,
    toggleCombinedCashPosition,
    selectedCombinedDepotKeys,
    toggleCombinedDepot,
    selectCombinedPensionScenario,
    selectCombinedWealthYearWithPopup,
    showCombinedWealthPopup,
    hideCombinedWealthPopup,
    hideCombinedCashPositionPopup,
    normalizeCombinedCashPositionIds
  });
}
