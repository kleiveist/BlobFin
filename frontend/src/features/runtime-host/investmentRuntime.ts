import type { AssetProjection, AssetProjectionPoint, InvestmentDepotKey, InvestmentSettings, PlanningAccount, PlanningSettings, ReservePosition } from "../../types";
import { INVESTMENT_DEPOTS } from "../investment/config";
import { RETIREMENT_DEPOT_MIN_AGE } from "../../domain/retirementDepot";
import { buildAssetProjection, payoutStartAge as calculatePayoutStartAge } from "../../domain/assetProjection";
import { calculateReserveSummary } from "../../domain/reserveCalculator";
import { clamp, escapeHtml, intNumber, labelForPayout, labelForType, money, monthName, numberValue } from "../../lib/format";
import { defaultInvestmentSettingsForNewAccount } from "../../data/defaults";
import { drawInvestmentChart } from "../../views/investmentChart";
import { investmentSavingsSelectionSummary, selectableInvestmentSavingsPositions } from "../../domain/investmentContributions";
import { isDeferredModelInput, setDetailLineHidden, setInputBounds, setInputValue, setSectionHidden, setText } from "./runtimeDom";
import { normalizePlanningEndDate, planningDateParts, planningSettingNumberValue } from "./planningRuntime";
import { normalizePositionIcon, positionIconSvg } from "../../lib/positionIcons";
import { positionFlow } from "../../lib/positionKinds";
import { runtimeApi, runtimeHost } from "./hostContext";
import { combineAssetProjections } from "./investmentProjectionRuntime";

export const CHILD_DEPOT_DEFAULT_PAYOUT_AGE = 18;

export function clampRetirementAge(retirementAge: number, payoutEndAge: number): number {
  return clamp(retirementAge, RETIREMENT_DEPOT_MIN_AGE, retirementAgeMaxForPayoutEndAge(payoutEndAge));
}

export function retirementAgeMaxForPayoutEndAge(payoutEndAge: number): number {
  return Math.max(RETIREMENT_DEPOT_MIN_AGE, Math.min(85, payoutEndAge - investmentMin("payoutYears")));
}

export function payoutYearsForRetirementAge(payoutEndAge: number, retirementAge: number): number {
  return clamp(payoutEndAge - retirementAge, investmentMin("payoutYears"), investmentMax("payoutYears"));
}

export function investmentMinForDepot(field: keyof InvestmentSettings, depot: InvestmentDepotKey): number {
  if (field === "capitalGainsTaxPercent" && depot === "retirement") return 20;
  return investmentMin(field);
}

export function investmentMaxForDepot(field: keyof InvestmentSettings, depot: InvestmentDepotKey): number {
  if (field === "capitalGainsTaxPercent" && depot === "retirement") return 45;
  return investmentMax(field);
}

export function investmentMin(field: keyof InvestmentSettings): number {
  if (field === "chartStartAge") return 0;
  if (field === "birthYear") return 1962;
  if (field === "childPayoutAge") return 18;
  if (field === "payoutEndAge") return 70;
  if (field === "percentageWithdrawalStartAge") return 0;
  if (field === "retirementDepotChildren") return 0;
  if (field === "payoutYears") return 1;
  if (field === "inflationRatePercent") return 1;
  return 0;
}

export function investmentMax(field: keyof InvestmentSettings): number {
  if (field === "chartStartAge") return 80;
  if (field === "birthYear") return 2009;
  if (field === "childPayoutAge") return 25;
  if (field === "payoutEndAge") return 110;
  if (field === "percentageWithdrawalStartAge") return 110;
  if (field === "percentageWithdrawalRatePercent") return 20;
  if (field === "retirementDepotChildren") return 20;
  if (field === "payoutYears") return 50;
  if (field === "investmentReturnPercent") return 30;
  if (field === "capitalGainsTaxPercent") return 50;
  if (field === "inflationRatePercent") return 10;
  if (field === "bequestReservePercent") return 50;
  return Number.MAX_SAFE_INTEGER;
}

type NumericInvestmentSetting =
  | "birthYear"
  | "chartStartAge"
  | "childPayoutAge"
  | "payoutEndAge"
  | "retirementDepotChildren"
  | "percentageWithdrawalStartAge"
  | "percentageWithdrawalRatePercent"
  | "investmentReturnPercent"
  | "capitalGainsTaxPercent"
  | "inflationRatePercent"
  | "bequestReservePercent";

function syncInvestmentProjectionLabels(depot: InvestmentDepotKey): void {
  const isChild = depot === "child";
  setSectionHidden("#combinedInvestmentCard", isChild);
  setSectionHidden("#withdrawalGainMetricCard", isChild);
  setSectionHidden("#monthlyPensionMetricCard", isChild);
  setText("wealthAtRetirementMetricLabel", isChild ? "Vermoegen zur Auszahlung" : "Vermoegen zur Rente");
  setText("monthlyPensionMetricLabel", isChild ? "Monatliche Auszahlung netto" : "Monatliche Rente netto");
  setText("realWealthMetricLabel", isChild ? "Reales Vermoegen zur Auszahlung" : "Reales Vermoegen zur Rente");
  setText("detailAgeTodayLabel", isChild ? "Alter des Kindes heute" : "Alter heute");
  setText("detailTaxLabel", isChild ? "Realisierte Steuern bis Auszahlung" : "Realisierte Steuern bis Rente");
  setText(
    "detailUnrealizedTaxLabel",
    isChild ? "Offene Steuer bei Verkauf zur Auszahlung" : "Offene Steuer bei Verkauf zur Rente"
  );
  setText("detailPayoutStartAgeLabel", isChild ? "Auszahlung ab Alter" : "Gleichmaessige Entnahme ab Alter");
  setText(
    "detailMonthlyPensionLabel",
    isChild ? "Monatliche Auszahlung netto" : "Monatliche gleichmaessige Entnahme netto"
  );
  setText(
    "detailRealMonthlyPensionLabel",
    isChild ? "Monatliche Auszahlung real" : "Monatliche gleichmaessige Entnahme real"
  );
  setText("detailBequestReserveLabel", isChild ? "Reserve zum Auszahlungsalter" : "Reserve/Erbe zum Enddatum");
}

function renderInvestmentIncludeList(): void {
  const list = document.querySelector<HTMLDivElement>("#investmentIncludeList");
  if (!list) return;

  const depot = activeInvestmentDepot();
  const settings = depotInvestmentSettings(depot);
  const investmentAccount = runtimeApi.selectedInvestmentPlanningAccount();
  const otherDepots = otherInvestmentDepots(depot);

  const savingsPositions = selectableInvestmentSavingsPositions(investmentAccount.yearlyRows);
  if (!savingsPositions.length) {
    list.innerHTML = `<div class="include-empty">Keine Sparrate angelegt.</div>`;
    runtimeApi.hideInvestmentIncludePopup();
    return;
  }

  const visibleSavingsPositions = visibleInvestmentSavingsPositions(savingsPositions, settings, otherDepots);
  if (!visibleSavingsPositions.length) {
    list.innerHTML = `<div class="include-empty">Alle Sparraten sind in anderen Depots eingeplant.</div>`;
    runtimeApi.hideInvestmentIncludePopup();
    return;
  }

  const selection = investmentSavingsSelectionSummary(visibleSavingsPositions, settings.includedIds, runtimeHost.state.settings.year);
  list.innerHTML = investmentIncludeSummaryButton(visibleSavingsPositions.length, selection);
  renderInvestmentIncludePopup(visibleSavingsPositions, settings);
}

function visibleInvestmentSavingsPositions(
  savingsPositions: ReservePosition[],
  settings: InvestmentSettings,
  otherDepots: InvestmentDepotKey[]
): ReservePosition[] {
  const blockedPositionIds = new Set(otherDepots.flatMap((item) => depotInvestmentSettings(item).includedIds));
  return savingsPositions.filter(
    (position) => !blockedPositionIds.has(position.id) || settings.includedIds.includes(position.id)
  );
}

function renderInvestmentSelectionChange(): void {
  runtimeApi.clearInvestmentProjectionCaches();
  const investmentAccount = runtimeApi.selectedInvestmentPlanningAccount();
  runtimeHost.state.investmentByAccountId = {
    ...runtimeHost.state.investmentByAccountId,
    [investmentAccount.id]: runtimeHost.state.investment
  };
  runtimeHost.investmentAccountContextId = investmentAccount.id;

  const activeReserve = calculateReserveSummary(runtimeApi.activePlanningSettings(), runtimeApi.activePlanningPositions());

  syncInvestmentIncludeSelectionState();
  runtimeApi.renderCalculations(activeReserve);
  runtimeApi.persistCurrentState();
}

function syncInvestmentIncludeSelectionState(): void {
  const depot = activeInvestmentDepot();
  const settings = depotInvestmentSettings(depot);
  const positions = visibleInvestmentSavingsPositions(
    selectableInvestmentSavingsPositions(runtimeApi.selectedInvestmentPlanningAccount().yearlyRows),
    settings,
    otherInvestmentDepots(depot)
  );
  if (!positions.length) return;

  const selection = investmentSavingsSelectionSummary(positions, settings.includedIds, runtimeHost.state.settings.year);
  const summaryText = `${intNumber(selection.selectedCount)} aktiv · ${money(selection.yearlyAmount)} jaehrlich`;
  const countText = `${intNumber(positions.length)} verfuegbar`;
  const summaryButton = document.querySelector<HTMLButtonElement>("[data-action='toggle-investment-include-popup']");
  if (summaryButton) {
    summaryButton.classList.toggle("active", selection.selectedCount > 0);
    summaryButton.setAttribute("aria-expanded", String(runtimeHost.investmentIncludePopupOpen));
    const summaryValue = summaryButton.querySelector("strong");
    const summaryCount = summaryButton.querySelector("small");
    if (summaryValue) summaryValue.textContent = summaryText;
    if (summaryCount) summaryCount.textContent = countText;
  }

  const popup = document.querySelector<HTMLDivElement>("#investmentIncludePopup");
  if (!popup || popup.hidden) return;
  const popupValue = popup.querySelector(".chart-popup-head strong");
  const popupCount = popup.querySelector(".investment-include-actions span");
  if (popupValue) popupValue.textContent = summaryText;
  if (popupCount) popupCount.textContent = countText;

  const blockedRealEstateIds = runtimeApi.realEstateSelectedSourceIds();
  const blockedCashIds = runtimeApi.combinedCashSelectedPositionIds();
  for (const input of popup.querySelectorAll<HTMLInputElement>("[data-include-position]")) {
    const id = input.dataset.includePosition ?? "";
    const blocked = blockedRealEstateIds.has(id) || blockedCashIds.has(id);
    input.checked = settings.includedIds.includes(id);
    input.disabled = blocked;
    input.closest(".include-item")?.classList.toggle("blocked", blocked);
  }
}

function investmentIncludeSummaryButton(
  totalCount: number,
  selection: { selectedCount: number; yearlyAmount: number }
): string {
  const active = selection.selectedCount > 0;
  return `
    <button
      class="investment-include-summary-button ${active ? "active" : ""}"
      type="button"
      data-action="toggle-investment-include-popup"
      aria-expanded="${runtimeHost.investmentIncludePopupOpen}"
      aria-controls="investmentIncludePopup"
    >
      <span>Sparraten auswaehlen</span>
      <strong>${intNumber(selection.selectedCount)} aktiv · ${money(selection.yearlyAmount)} jaehrlich</strong>
      <small>${intNumber(totalCount)} verfuegbar</small>
    </button>
  `;
}

function renderInvestmentIncludePopup(positions: ReservePosition[], settings: InvestmentSettings): void {
  const popup = document.querySelector<HTMLDivElement>("#investmentIncludePopup");
  if (!popup) return;
  if (!runtimeHost.investmentIncludePopupOpen) {
    popup.hidden = true;
    popup.innerHTML = "";
    return;
  }

  const selection = investmentSavingsSelectionSummary(positions, settings.includedIds, runtimeHost.state.settings.year);
  popup.innerHTML = `
    <div class="investment-include-dialog">
      <div class="chart-popup-head">
        <div>
          <span>Investierbare Positionen</span>
          <strong>${intNumber(selection.selectedCount)} aktiv · ${money(selection.yearlyAmount)} jaehrlich</strong>
        </div>
        <button class="chart-popup-close" type="button" data-action="close-investment-include-popup" aria-label="Popup schliessen">x</button>
      </div>
      <div class="include-list investment-include-position-list">${investmentIncludePositionRows(positions, settings)}</div>
      <div class="investment-include-actions">
        <span>${intNumber(positions.length)} verfuegbar</span>
        <button class="button" type="button" data-action="close-investment-include-popup">Fertig</button>
      </div>
    </div>
  `;
  popup.hidden = false;
}

function investmentIncludePositionRows(positions: ReservePosition[], settings: InvestmentSettings): string {
  const blockedRealEstateIds = runtimeApi.realEstateSelectedSourceIds();
  const blockedCashIds = runtimeApi.combinedCashSelectedPositionIds();
  return positions
    .map((position) => {
      const checked = settings.includedIds.includes(position.id) ? "checked" : "";
      const blockedByRealEstate = blockedRealEstateIds.has(position.id);
      const blockedByCash = blockedCashIds.has(position.id);
      const disabled = blockedByRealEstate || blockedByCash ? "disabled" : "";
      const blockedClass = blockedByRealEstate || blockedByCash ? "blocked" : "";
      const subtitle = blockedByRealEstate
        ? "belegt in Immobilienfinanzierung"
        : blockedByCash
          ? "belegt im Cash-Modul"
          : investmentPositionSubtitle(position);
      return `
        <label class="include-item ${blockedClass}">
          <input type="checkbox" data-include-position="${position.id}" ${checked} ${disabled} />
          <span class="include-icon">${positionIconSvg(normalizePositionIcon(position.icon))}</span>
          <span>
            <span class="include-name">${escapeHtml(position.name)}</span>
            <span class="include-amount">${escapeHtml(subtitle)}</span>
          </span>
        </label>
      `;
    })
    .join("");
}

function investmentPositionSubtitle(position: ReservePosition): string {
  const amount = investmentPositionAmountText(position);
  return `${amount} | ${labelForType(position.type)} | Abgang ${labelForPayout(position.payoutType, positionFlow(position))}`;
}

function investmentPositionAmountText(position: ReservePosition): string {
  if (position.payoutType === "once") {
    return `${money(position.amount)} einmalig (${monthName(position.payoutMonth)} ${intNumber(position.payoutYear)})`;
  }
  if (position.type === "savings" && position.payoutType === "none") {
    return `${money(position.amount)} ohne Rhythmus (${monthName(position.startMonth)} bis ${monthName(
      position.endMonth
    )} ${intNumber(position.payoutYear)})`;
  }
  const startText =
    position.type === "savings" ? ` ab ${monthName(position.startMonth)} ${intNumber(position.payoutYear)}` : "";
  if (position.payoutType === "yearly") {
    return `${money(position.amount)} jaehrlich (${monthName(position.payoutMonth)})${startText}`;
  }
  return `${money(position.amount)} monatlich${startText}`;
}

function investmentSelectedPositionIds(): Set<string> {
  const ids = new Set<string>();
  for (const settings of investmentSettingsForBlocking()) {
    for (const depot of INVESTMENT_DEPOTS) {
      for (const id of depotInvestmentSettingsForBase(depot, settings).includedIds) ids.add(id);
    }
  }
  return ids;
}

function investmentSettingsForBlocking(): InvestmentSettings[] {
  const settings = [runtimeHost.state.investment, ...Object.values(runtimeHost.state.investmentByAccountId)];
  return Array.from(new Set(settings));
}

function syncInvestmentInputsFromState(): void {
  syncInvestmentInputBounds();
  const depot = activeInvestmentDepot();
  const settings = investmentSettingsWithGlobalEndDate(depotInvestmentSettings(depot));
  for (const key of inputInvestmentFields()) {
    setInputValue(`[data-investment="${key}"]`, settings[key]);
  }
  setInputValue("[data-retirement-age]", calculatePayoutStartAge(settings));
  syncInvestmentDepotTabs();
  syncRetirementDepotControls();
}

function syncInvestmentInputBounds(): void {
  const depot = activeInvestmentDepot();
  const settings = investmentSettingsWithGlobalEndDate(depotInvestmentSettings(depot));
  const retirementAge = calculatePayoutStartAge(settings);
  const chartStartAge = settings.chartStartAge;
  const retirementMin = RETIREMENT_DEPOT_MIN_AGE;
  const retirementMax = retirementAgeMaxForPayoutEndAge(settings.payoutEndAge);
  setInputBounds(
    '[data-investment="birthYear"]',
    depot === "child" ? childBirthYearMin() : investmentMin("birthYear"),
    depot === "child" ? runtimeHost.state.settings.year : investmentMax("birthYear")
  );
  setInputBounds(
    '[data-investment="chartStartAge"]',
    investmentMin("chartStartAge"),
    Math.min(investmentMax("chartStartAge"), retirementAge)
  );
  setInputBounds('[data-investment="percentageWithdrawalStartAge"]', chartStartAge, retirementAge);
  setInputBounds("[data-retirement-age]", retirementMin, retirementMax);
  setInputBounds(
    '[data-investment="childPayoutAge"]',
    investmentMin("childPayoutAge"),
    investmentMax("childPayoutAge")
  );
  setInputBounds(
    '[data-investment="capitalGainsTaxPercent"]',
    investmentMinForDepot("capitalGainsTaxPercent", depot),
    investmentMaxForDepot("capitalGainsTaxPercent", depot)
  );
  syncInvestmentTaxControl(depot);
}

function syncRetirementDepotControls(): void {
  const depot = activeInvestmentDepot();
  const isStandard = depot === "standard";
  const isRetirement = depot === "retirement";
  const isChild = depot === "child";
  syncDepotScopedInvestmentFields(depot);
  syncRetirementDepotAllowanceToggle();
  setSectionHidden("#retirementDepotFunding", !isRetirement);
  setDetailLineHidden("detailAllowance", !isRetirement);
  setDetailLineHidden("detailAllowanceBasis", !isRetirement);
  setDetailLineHidden("detailPercentageWithdrawalStartAge", !isStandard);
  setDetailLineHidden("detailPercentageWithdrawalRate", !isStandard);
  setDetailLineHidden("detailPercentageWithdrawalMonthly", !isStandard);
  setDetailLineHidden("detailPercentageWithdrawalAnnual", !isStandard);
  setDetailLineHidden("detailMonthlyPension", isChild);
  setDetailLineHidden("detailRealMonthlyPension", isChild);
  setDetailLineHidden("detailBequestReserve", isChild);
  setSectionHidden("#combinedInvestmentCard", isChild);
  setSectionHidden("#monthlyPensionMetricCard", isChild);
}

function syncInvestmentTaxControl(depot: InvestmentDepotKey): void {
  const label = document.getElementById("capitalGainsTaxPercentLabel");
  if (label) {
    label.textContent =
      depot === "retirement" ? "individueller Einkommensteuersatz nach § 22 Nr. 5 EStG" : "Kapitalertragsteuer";
  }
  for (const legend of document.querySelectorAll<HTMLElement>("[data-investment-tax-legend]")) {
    legend.textContent =
      legend.dataset.investmentTaxLegend === "combined"
        ? "Steuern"
        : depot === "retirement"
          ? "Einkommensteuer"
          : "Kapitalertragsteuer";
  }
}

function syncRetirementDepotAllowanceToggle(): void {
  const enabled = runtimeHost.state.investment.retirementDepotAllowanceEnabled;
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    '[data-action="toggle-retirement-depot-allowance"]'
  )) {
    button.classList.toggle("active", enabled);
    button.setAttribute("aria-pressed", String(enabled));
    button.textContent = enabled ? "Zulage ein" : "Zulage aus";
  }
}

function syncInvestmentDepotTabs(): void {
  const active = activeInvestmentDepot();
  for (const depot of INVESTMENT_DEPOTS) {
    const button = document.querySelector<HTMLButtonElement>(`[data-action="set-investment-depot-${depot}"]`);
    if (!button) continue;
    button.classList.toggle("active", depot === active);
    button.setAttribute("aria-pressed", String(depot === active));
  }
  setText(
    "investmentActiveDepotTitle",
    active === "child"
      ? "Anlageentwicklung Kinderdepot"
      : active === "retirement"
        ? "Anlageentwicklung Altersvorsorgedepot"
        : "Anlageentwicklung Depot"
  );
}

function updatePlanningSetting(field: keyof PlanningSettings, value: string): void {
  if (field === "endDate") {
    runtimeHost.state.settings = {
      ...runtimeHost.state.settings,
      endDate: normalizePlanningEndDate(value, runtimeHost.state.settings.year)
    };
    return;
  }

  runtimeHost.state.settings = {
    ...runtimeHost.state.settings,
    [field]: planningSettingNumberValue(field, value)
  };
  runtimeHost.state.settings = {
    ...runtimeHost.state.settings,
    endDate: normalizePlanningEndDate(runtimeHost.state.settings.endDate, runtimeHost.state.settings.year)
  };
}

function planningEndYear(): number {
  return planningDateParts(runtimeHost.state.settings.endDate)?.year ?? runtimeHost.state.settings.year;
}

function planningEndAgeForBirthYear(birthYear: number): number {
  return clamp(planningEndYear() - Math.round(birthYear), 0, investmentMax("payoutEndAge"));
}

function updateInvestmentSetting(field: keyof InvestmentSettings, value: string): void {
  if (!isNumericInvestmentSetting(field)) return;
  const depot = activeInvestmentDepot();
  if (field === "payoutEndAge") {
    updateSharedPayoutEndAge(value);
    return;
  }

  updateDepotInvestmentSettings(depot, numericInvestmentPatch(field, numericInvestmentValue(field, value)));
  normalizeInvestmentBounds();
}

function updateSharedPayoutEndAge(value: string): void {
  const payoutEndAge = clamp(numberValue(value), investmentMin("payoutEndAge"), investmentMax("payoutEndAge"));
  const retirementAge = clampRetirementAge(currentSharedRetirementAge(), payoutEndAge);
  const payoutYears = payoutYearsForRetirementAge(payoutEndAge, retirementAge);
  runtimeHost.state.investment = {
    ...runtimeHost.state.investment,
    payoutEndAge,
    retirementPayoutEndAge: payoutEndAge,
    payoutYears,
    retirementPayoutYears: payoutYears
  };
  normalizeInvestmentBounds();
}

function currentSharedRetirementAge(): number {
  return Math.max(
    RETIREMENT_DEPOT_MIN_AGE,
    calculatePayoutStartAge(investmentSettingsWithGlobalEndDate(depotInvestmentSettings("standard"))),
    calculatePayoutStartAge(investmentSettingsWithGlobalEndDate(depotInvestmentSettings("retirement")))
  );
}

function isNumericInvestmentSetting(field: keyof InvestmentSettings): field is NumericInvestmentSetting {
  return inputInvestmentFields().includes(field as NumericInvestmentSetting);
}

function inputInvestmentFields(): NumericInvestmentSetting[] {
  return [
    "birthYear",
    "chartStartAge",
    "childPayoutAge",
    "payoutEndAge",
    "retirementDepotChildren",
    "percentageWithdrawalStartAge",
    "percentageWithdrawalRatePercent",
    "investmentReturnPercent",
    "capitalGainsTaxPercent",
    "inflationRatePercent",
    "bequestReservePercent"
  ];
}

function numericInvestmentValue(field: NumericInvestmentSetting, value: string): number {
  const depot = activeInvestmentDepot();
  const min = field === "birthYear" && depot === "child" ? childBirthYearMin() : investmentMinForDepot(field, depot);
  const max = field === "birthYear" && depot === "child" ? runtimeHost.state.settings.year : investmentMaxForDepot(field, depot);
  const nextValue = clamp(numberValue(value), min, max);
  return field === "retirementDepotChildren" || field === "childPayoutAge" ? Math.floor(nextValue) : nextValue;
}

function childBirthYearMin(): number {
  return childBirthYearMinForPayoutAge(runtimeHost.state.investment.childPayoutAge);
}

function childBirthYearMinForPayoutAge(payoutAge: number): number {
  return Math.max(investmentMin("birthYear"), runtimeHost.state.settings.year - clampChildPayoutAge(payoutAge));
}

function clampChildPayoutAge(value: number): number {
  return clamp(value, investmentMin("childPayoutAge"), investmentMax("childPayoutAge"));
}

function numericInvestmentPatch(field: NumericInvestmentSetting, value: number): Partial<InvestmentSettings> {
  switch (field) {
    case "birthYear":
      return { birthYear: value };
    case "chartStartAge":
      return { chartStartAge: value };
    case "childPayoutAge":
      return { childPayoutAge: value };
    case "payoutEndAge":
      return { payoutEndAge: value };
    case "retirementDepotChildren":
      return { retirementDepotChildren: value };
    case "percentageWithdrawalStartAge":
      return { percentageWithdrawalStartAge: value };
    case "percentageWithdrawalRatePercent":
      return { percentageWithdrawalRatePercent: value };
    case "investmentReturnPercent":
      return { investmentReturnPercent: value };
    case "capitalGainsTaxPercent":
      return { capitalGainsTaxPercent: value };
    case "inflationRatePercent":
      return { inflationRatePercent: value };
    case "bequestReservePercent":
      return { bequestReservePercent: value };
  }
  return {};
}

function setInvestmentDepot(depot: InvestmentDepotKey): void {
  if (runtimeHost.state.investment.activeDepot === depot) return;
  runtimeHost.state.investment = {
    ...runtimeHost.state.investment,
    activeDepot: depot
  };
  runtimeApi.hideInvestmentChartPopup();
  runtimeApi.hideInvestmentIncludePopup();
  runtimeApi.renderAll();
}

function toggleInvestmentIncludePopup(): void {
  runtimeHost.investmentIncludePopupOpen = !runtimeHost.investmentIncludePopupOpen;
  runtimeApi.renderAll();
}

function toggleRetirementDepotAllowance(): void {
  runtimeHost.state.investment = {
    ...runtimeHost.state.investment,
    retirementDepotAllowanceEnabled: !runtimeHost.state.investment.retirementDepotAllowanceEnabled
  };
  runtimeApi.renderAll();
}

function activeInvestmentDepot(): InvestmentDepotKey {
  return INVESTMENT_DEPOTS.includes(runtimeHost.state.investment.activeDepot) ? runtimeHost.state.investment.activeDepot : "standard";
}

function otherInvestmentDepots(depot: InvestmentDepotKey): InvestmentDepotKey[] {
  return INVESTMENT_DEPOTS.filter((item) => item !== depot);
}

function depotLabel(depot: InvestmentDepotKey): string {
  if (depot === "child") return "Kinderdepot";
  return depot === "standard" ? "Depot" : "Altersvorsorgedepot";
}

function depotInvestmentSettings(depot: InvestmentDepotKey): InvestmentSettings {
  return depotInvestmentSettingsForBase(depot, runtimeHost.state.investment);
}

function depotInvestmentSettingsForAccount(depot: InvestmentDepotKey, accountId: string): InvestmentSettings {
  const settings = runtimeHost.state.investmentByAccountId[accountId] ?? defaultInvestmentSettingsForNewAccount();
  return depotInvestmentSettingsForBase(depot, settings);
}

function depotInvestmentSettingsForBase(depot: InvestmentDepotKey, settings: InvestmentSettings): InvestmentSettings {
  if (depot === "standard") {
    return {
      ...settings,
      activeDepot: "standard",
      retirementDepotEnabled: false,
      retirementDepotAllowanceEnabled: false,
      retirementDepotChildren: 0
    };
  }

  if (depot === "child") {
    const childPayoutAge = clampChildPayoutAge(settings.childPayoutAge);
    return {
      ...settings,
      activeDepot: "child",
      includedIds: settings.childIncludedIds,
      retirementDepotEnabled: false,
      retirementDepotAllowanceEnabled: false,
      retirementDepotChildren: 0,
      birthYear: settings.childBirthYear,
      chartStartAge: settings.childChartStartAge,
      childPayoutAge,
      payoutEndAge: childPayoutAge,
      payoutYears: 0,
      percentageWithdrawalStartAge: childPayoutAge,
      percentageWithdrawalRatePercent: 0,
      investmentReturnPercent: settings.childInvestmentReturnPercent,
      capitalGainsTaxPercent: settings.childCapitalGainsTaxPercent,
      inflationRatePercent: settings.childInflationRatePercent,
      bequestReservePercent: settings.childBequestReservePercent
    };
  }

  return {
    ...settings,
    activeDepot: "retirement",
    retirementDepotEnabled: true,
    retirementDepotAllowanceEnabled: settings.retirementDepotAllowanceEnabled,
    includedIds: settings.retirementIncludedIds,
    birthYear: settings.retirementBirthYear,
    chartStartAge: settings.retirementChartStartAge,
    payoutEndAge: settings.retirementPayoutEndAge,
    payoutYears: settings.retirementPayoutYears,
    percentageWithdrawalStartAge: settings.retirementPayoutEndAge - settings.retirementPayoutYears,
    percentageWithdrawalRatePercent: 0,
    investmentReturnPercent: settings.retirementInvestmentReturnPercent,
    capitalGainsTaxPercent: settings.retirementIncomeTaxRatePercent,
    retirementIncomeTaxRatePercent: settings.retirementIncomeTaxRatePercent,
    inflationRatePercent: settings.retirementInflationRatePercent,
    bequestReservePercent: settings.retirementBequestReservePercent
  };
}

function updateDepotInvestmentSettings(depot: InvestmentDepotKey, updates: Partial<InvestmentSettings>): void {
  const payoutEndAge = updates.payoutEndAge ?? runtimeHost.state.investment.payoutEndAge;
  if (depot === "standard") {
    runtimeHost.state.investment = {
      ...runtimeHost.state.investment,
      ...updates,
      payoutEndAge,
      retirementPayoutEndAge: payoutEndAge
    };
    return;
  }

  if (depot === "child") {
    runtimeHost.state.investment = {
      ...runtimeHost.state.investment,
      childBirthYear: updates.birthYear ?? runtimeHost.state.investment.childBirthYear,
      childChartStartAge: updates.chartStartAge ?? runtimeHost.state.investment.childChartStartAge,
      childPayoutAge: updates.childPayoutAge ?? runtimeHost.state.investment.childPayoutAge,
      childInvestmentReturnPercent:
        updates.investmentReturnPercent ?? runtimeHost.state.investment.childInvestmentReturnPercent,
      childCapitalGainsTaxPercent:
        updates.capitalGainsTaxPercent ?? runtimeHost.state.investment.childCapitalGainsTaxPercent,
      childInflationRatePercent: updates.inflationRatePercent ?? runtimeHost.state.investment.childInflationRatePercent,
      childBequestReservePercent: updates.bequestReservePercent ?? runtimeHost.state.investment.childBequestReservePercent
    };
    return;
  }

  runtimeHost.state.investment = {
    ...runtimeHost.state.investment,
    payoutEndAge,
    retirementDepotAllowanceEnabled:
      updates.retirementDepotAllowanceEnabled ?? runtimeHost.state.investment.retirementDepotAllowanceEnabled,
    retirementDepotChildren: updates.retirementDepotChildren ?? runtimeHost.state.investment.retirementDepotChildren,
    retirementBirthYear: updates.birthYear ?? runtimeHost.state.investment.retirementBirthYear,
    retirementChartStartAge: updates.chartStartAge ?? runtimeHost.state.investment.retirementChartStartAge,
    retirementPayoutEndAge: payoutEndAge,
    retirementPayoutYears: updates.payoutYears ?? runtimeHost.state.investment.retirementPayoutYears,
    retirementInvestmentReturnPercent:
      updates.investmentReturnPercent ?? runtimeHost.state.investment.retirementInvestmentReturnPercent,
    retirementIncomeTaxRatePercent:
      updates.capitalGainsTaxPercent ?? runtimeHost.state.investment.retirementIncomeTaxRatePercent,
    retirementInflationRatePercent: updates.inflationRatePercent ?? runtimeHost.state.investment.retirementInflationRatePercent,
    retirementBequestReservePercent:
      updates.bequestReservePercent ?? runtimeHost.state.investment.retirementBequestReservePercent
  };
}

function updateRetirementAge(value: string): void {
  const standardPayoutEndAge = numericInvestmentValue(
    "payoutEndAge",
    String(Math.max(investmentMin("payoutEndAge"), planningEndAgeForBirthYear(runtimeHost.state.investment.birthYear)))
  );
  const retirementPayoutEndAge = numericInvestmentValue(
    "payoutEndAge",
    String(Math.max(investmentMin("payoutEndAge"), planningEndAgeForBirthYear(runtimeHost.state.investment.retirementBirthYear)))
  );
  const retirementAge = clamp(
    numberValue(value),
    RETIREMENT_DEPOT_MIN_AGE,
    Math.min(
      retirementAgeMaxForPayoutEndAge(standardPayoutEndAge),
      retirementAgeMaxForPayoutEndAge(retirementPayoutEndAge)
    )
  );
  const payoutYears = payoutYearsForRetirementAge(standardPayoutEndAge, retirementAge);
  const retirementPayoutYears = payoutYearsForRetirementAge(retirementPayoutEndAge, retirementAge);
  runtimeHost.state.investment = {
    ...runtimeHost.state.investment,
    payoutEndAge: standardPayoutEndAge,
    retirementPayoutEndAge,
    payoutYears,
    retirementPayoutYears
  };
  normalizeInvestmentBounds();
}

function toggleInvestmentPosition(id: string, checked: boolean): void {
  const depot = activeInvestmentDepot();
  if (checked && runtimeApi.realEstateSelectedSourceIds().has(id)) {
    return;
  }
  if (checked && runtimeApi.combinedCashSelectedPositionIds().has(id)) {
    return;
  }
  if (checked && otherInvestmentDepots(depot).some((item) => depotInvestmentSettings(item).includedIds.includes(id))) {
    return;
  }
  const includedIds = new Set(depotInvestmentSettings(depot).includedIds);
  if (checked) includedIds.add(id);
  else includedIds.delete(id);
  if (depot === "standard") {
    runtimeHost.state.investment = { ...runtimeHost.state.investment, includedIds: Array.from(includedIds) };
    return;
  }
  if (depot === "child") {
    runtimeHost.state.investment = { ...runtimeHost.state.investment, childIncludedIds: Array.from(includedIds) };
    return;
  }
  runtimeHost.state.investment = { ...runtimeHost.state.investment, retirementIncludedIds: Array.from(includedIds) };
}

function toggleResultMaxNeeded(): void {
  runtimeHost.showResultMaxNeeded = !runtimeHost.showResultMaxNeeded;
  runtimeApi.renderAll();
}

function syncCommittedInvestmentSettingInput(
  target: HTMLInputElement | HTMLSelectElement,
  field: keyof InvestmentSettings
): void {
  if (!isDeferredModelInput(target) || !isNumericInvestmentSetting(field)) return;
  const settings = investmentSettingsWithGlobalEndDate(depotInvestmentSettings(activeInvestmentDepot()));
  target.value = String(settings[field]);
}

function syncCommittedRetirementAgeInput(target: HTMLInputElement | HTMLSelectElement): void {
  if (!isDeferredModelInput(target)) return;
  const settings = investmentSettingsWithGlobalEndDate(depotInvestmentSettings(activeInvestmentDepot()));
  target.value = String(calculatePayoutStartAge(settings));
}

function syncDepotScopedInvestmentFields(activeDepot: InvestmentDepotKey): void {
  for (const wrapper of document.querySelectorAll<HTMLElement>("[data-depot-scope]")) {
    const scopes = (wrapper.dataset.depotScope ?? "").split(/\s+/).filter(Boolean);
    const hidden = !scopes.includes(activeDepot);
    wrapper.hidden = hidden;
    for (const control of wrapper.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLButtonElement | HTMLTextAreaElement
    >("input, select, button, textarea")) {
      control.disabled = hidden || control.dataset.forceDisabled === "true";
    }
  }
}

function drawCurrentInvestmentChart(): void {
  const investmentAccount = runtimeApi.selectedInvestmentPlanningAccount();
  const projection = buildDepotAssetProjection(activeInvestmentDepot(), investmentAccount.id);
  const combinedProjection = combineAssetProjections(
    buildDepotAssetProjection("standard", investmentAccount.id),
    buildDepotAssetProjection("retirement", investmentAccount.id)
  );
  runtimeApi.hideInvestmentChartPopup();
  drawInvestmentChartWithPopup(projection);
  drawInvestmentChartWithPopup(combinedProjection, "#combinedInvestmentChart", "#combinedInvestmentChartPopup");
}

function contributionDetailText(projection: AssetProjection): string {
  const recurringContribution = projection.recurringContributionAtRetirement;
  const oneTimeContribution = projection.oneTimeContributionAtRetirement;
  if (oneTimeContribution > 0.01) {
    return `${money(projection.totalContribution)} (${money(recurringContribution)} regelmaessig + ${money(
      oneTimeContribution
    )} einmalig)`;
  }
  return `${money(projection.totalContribution)} (${money(recurringContribution)} regelmaessig)`;
}

function drawInvestmentChartWithPopup(
  projection: AssetProjection,
  canvasSelector = "#investmentChart",
  popupSelector = "#investmentChartPopup"
): void {
  drawInvestmentChart(document.querySelector<HTMLCanvasElement>(canvasSelector), projection, (selection) => {
    showInvestmentChartPopup(projection, selection.point, selection.clientX, selection.clientY, popupSelector);
  });
}

function showInvestmentChartPopup(
  projection: AssetProjection,
  point: AssetProjectionPoint,
  clientX: number,
  clientY: number,
  popupSelector = "#investmentChartPopup"
): void {
  const popup = document.querySelector<HTMLDivElement>(popupSelector);
  const card = popup?.closest<HTMLElement>(".investment-chart-card");
  if (!popup || !card) return;

  const allowance = Math.min(Math.max(0, point.netBalance), Math.max(0, point.allowance));
  const eigenbeitrag = Math.min(
    Math.max(0, point.netBalance - allowance),
    Math.max(0, point.costBasis - allowance)
  );
  const tax = Math.max(0, point.periodTax);
  const growth = Math.max(0, Math.max(0, point.netBalance - eigenbeitrag - allowance) - tax);
  const payoutBalance = point.phase === "payout" ? Math.max(0, point.netBalance) : 0;
  const year = runtimeHost.state.settings.year + Math.round(point.age - projection.ageToday);

  popup.innerHTML = `
    <div class="chart-popup-head">
      <div>
        <span>Balkendetails</span>
        <strong>Alter ${intNumber(point.age)} | Jahr ${intNumber(year)}</strong>
      </div>
      <button class="chart-popup-close" type="button" data-action="close-investment-chart-popup" aria-label="Popup schliessen">x</button>
    </div>
    <div class="chart-popup-list">
      ${runtimeApi.chartPopupLine("grey", "Eigenbeitrag", money(eigenbeitrag))}
      ${runtimeApi.chartPopupLine("orange", "Zulagen", money(allowance))}
      ${runtimeApi.chartPopupLine("green", "Wertzuwachs", money(growth))}
      ${runtimeApi.chartPopupLine("purple", "Restguthaben (Auszahlung)", money(payoutBalance))}
      ${runtimeApi.chartPopupLine(
        "red",
        investmentTaxLabelForProjection(projection),
        tax > 0 ? `-${money(tax)}` : money(0)
      )}
      ${runtimeApi.chartPopupTotalLine("Gesamtkapital", money(Math.max(0, point.netBalance)))}
    </div>
  `;

  popup.hidden = false;
  runtimeApi.positionChartPopup(popup, card, clientX, clientY);
}

function investmentTaxLabelForProjection(projection: AssetProjection): string {
  if (!projection.retirementDepotEnabled) return "Kapitalertragsteuer";
  if (projection.annualSavingsRate > projection.retirementDepotAnnualOwnContribution + 0.01) return "Steuern";
  return "Einkommensteuer";
}

function buildDepotAssetProjection(depot: InvestmentDepotKey, accountId = runtimeApi.selectedInvestmentPlanningAccount().id): AssetProjection {
  const cacheKey = `${depot}:${accountId}`;
  const cachedProjection = runtimeHost.depotAssetProjectionCache.get(cacheKey);
  if (cachedProjection) return cachedProjection;

  const account = runtimeApi.planningAccountById(accountId) ?? runtimeApi.selectedInvestmentPlanningAccount();
  const settings = investmentSettingsWithGlobalEndDate(depotInvestmentSettingsForAccount(depot, accountId));
  const projection = buildAssetProjection(runtimeHost.state.settings.year, account.yearlyRows, settings);
  runtimeHost.depotAssetProjectionCache.set(cacheKey, projection);
  return projection;
}

function investmentSettingsWithGlobalEndDate(settings: InvestmentSettings): InvestmentSettings {
  if (settings.activeDepot === "child") return settings;
  const payoutEndAge = planningEndAgeForBirthYear(settings.birthYear);
  const preferredPayoutStartAge = Math.max(0, settings.payoutEndAge - settings.payoutYears);
  const payoutYears = Math.max(
    0,
    Math.min(investmentMax("payoutYears"), Math.round(payoutEndAge - preferredPayoutStartAge))
  );
  return {
    ...settings,
    payoutEndAge,
    retirementPayoutEndAge: payoutEndAge,
    payoutYears,
    retirementPayoutYears: payoutYears
  };
}

function normalizeInvestmentBounds(): void {
  let nextInvestment = {
    ...runtimeHost.state.investment,
    retirementDepotChildren: numericInvestmentValue(
      "retirementDepotChildren",
      String(runtimeHost.state.investment.retirementDepotChildren)
    )
  };
  nextInvestment.activeDepot = INVESTMENT_DEPOTS.includes(nextInvestment.activeDepot)
    ? nextInvestment.activeDepot
    : "standard";
  const standardPayoutEndAge = numericInvestmentValue(
    "payoutEndAge",
    String(Math.max(investmentMin("payoutEndAge"), planningEndAgeForBirthYear(nextInvestment.birthYear)))
  );
  const retirementPayoutEndAge = numericInvestmentValue(
    "payoutEndAge",
    String(Math.max(investmentMin("payoutEndAge"), planningEndAgeForBirthYear(nextInvestment.retirementBirthYear)))
  );
  nextInvestment = {
    ...nextInvestment,
    payoutEndAge: standardPayoutEndAge,
    retirementPayoutEndAge
  };
  const sharedRetirementAge = clampRetirementAge(
    Math.max(
      RETIREMENT_DEPOT_MIN_AGE,
      nextInvestment.payoutEndAge - nextInvestment.payoutYears,
      nextInvestment.retirementPayoutEndAge - nextInvestment.retirementPayoutYears
    ),
    Math.min(standardPayoutEndAge, retirementPayoutEndAge)
  );
  const standardPayoutYears = payoutYearsForRetirementAge(standardPayoutEndAge, sharedRetirementAge);
  const retirementPayoutYears = payoutYearsForRetirementAge(retirementPayoutEndAge, sharedRetirementAge);
  nextInvestment = {
    ...nextInvestment,
    payoutYears: standardPayoutYears,
    retirementPayoutYears
  };

  const standardRetirementAge = calculatePayoutStartAge({
    ...nextInvestment,
    retirementDepotEnabled: false,
    retirementDepotChildren: 0
  });
  const standardChartStartAge = clamp(
    nextInvestment.chartStartAge,
    investmentMin("chartStartAge"),
    Math.min(investmentMax("chartStartAge"), standardRetirementAge)
  );
  const retirementSettings = {
    ...nextInvestment,
    includedIds: nextInvestment.retirementIncludedIds,
    retirementDepotEnabled: true,
    birthYear: nextInvestment.retirementBirthYear,
    chartStartAge: nextInvestment.retirementChartStartAge,
    payoutEndAge: nextInvestment.retirementPayoutEndAge,
    payoutYears: nextInvestment.retirementPayoutYears,
    percentageWithdrawalStartAge: nextInvestment.retirementPayoutEndAge - nextInvestment.retirementPayoutYears,
    percentageWithdrawalRatePercent: 0,
    investmentReturnPercent: nextInvestment.retirementInvestmentReturnPercent,
    capitalGainsTaxPercent: nextInvestment.retirementIncomeTaxRatePercent,
    retirementIncomeTaxRatePercent: nextInvestment.retirementIncomeTaxRatePercent,
    inflationRatePercent: nextInvestment.retirementInflationRatePercent,
    bequestReservePercent: nextInvestment.retirementBequestReservePercent
  };
  const retirementAge = calculatePayoutStartAge(retirementSettings);
  const retirementChartStartAge = clamp(
    nextInvestment.retirementChartStartAge,
    investmentMin("chartStartAge"),
    Math.min(investmentMax("chartStartAge"), retirementAge)
  );
  const rawChildPayoutAge = Number.isFinite(nextInvestment.childPayoutAge)
    ? nextInvestment.childPayoutAge
    : CHILD_DEPOT_DEFAULT_PAYOUT_AGE;
  const childPayoutAge = clampChildPayoutAge(rawChildPayoutAge);
  const childBirthYear = clamp(
    nextInvestment.childBirthYear,
    childBirthYearMinForPayoutAge(childPayoutAge),
    runtimeHost.state.settings.year
  );
  const childChartStartAge = clamp(
    nextInvestment.childChartStartAge,
    investmentMin("chartStartAge"),
    childPayoutAge
  );
  runtimeHost.state.investment = {
    ...nextInvestment,
    payoutEndAge: standardPayoutEndAge,
    retirementPayoutEndAge,
    chartStartAge: standardChartStartAge,
    percentageWithdrawalStartAge: clamp(
      nextInvestment.percentageWithdrawalStartAge,
      standardChartStartAge,
      standardRetirementAge
    ),
    retirementChartStartAge,
    childBirthYear,
    childChartStartAge,
    childPayoutAge,
    retirementDepotChildren: numericInvestmentValue(
      "retirementDepotChildren",
      String(nextInvestment.retirementDepotChildren)
    ),
    capitalGainsTaxPercent: clamp(
      nextInvestment.capitalGainsTaxPercent,
      investmentMinForDepot("capitalGainsTaxPercent", "standard"),
      investmentMaxForDepot("capitalGainsTaxPercent", "standard")
    ),
    retirementIncomeTaxRatePercent: clamp(
      nextInvestment.retirementIncomeTaxRatePercent,
      investmentMinForDepot("capitalGainsTaxPercent", "retirement"),
      investmentMaxForDepot("capitalGainsTaxPercent", "retirement")
    ),
    bequestReservePercent: numericInvestmentValue(
      "bequestReservePercent",
      String(nextInvestment.bequestReservePercent)
    ),
    retirementBequestReservePercent: numericInvestmentValue(
      "bequestReservePercent",
      String(nextInvestment.retirementBequestReservePercent)
    ),
    childInvestmentReturnPercent: clamp(
      nextInvestment.childInvestmentReturnPercent,
      investmentMin("investmentReturnPercent"),
      investmentMax("investmentReturnPercent")
    ),
    childCapitalGainsTaxPercent: clamp(
      nextInvestment.childCapitalGainsTaxPercent,
      investmentMin("capitalGainsTaxPercent"),
      investmentMax("capitalGainsTaxPercent")
    ),
    childInflationRatePercent: clamp(
      nextInvestment.childInflationRatePercent,
      investmentMin("inflationRatePercent"),
      investmentMax("inflationRatePercent")
    ),
    childBequestReservePercent: clamp(
      nextInvestment.childBequestReservePercent,
      investmentMin("bequestReservePercent"),
      investmentMax("bequestReservePercent")
    )
  };
}

function normalizeInvestmentDepotSelections(): void {
  const standardIds = new Set(runtimeHost.state.investment.includedIds);
  const retirementIds = runtimeHost.state.investment.retirementIncludedIds.filter((id) => !standardIds.has(id));
  const adultIds = new Set([...standardIds, ...retirementIds]);
  const childIds = runtimeHost.state.investment.childIncludedIds.filter((id) => !adultIds.has(id));
  runtimeHost.state.investment = {
    ...runtimeHost.state.investment,
    retirementIncludedIds: retirementIds,
    childIncludedIds: childIds
  };
}

function normalizeInvestmentSelectionIds(): void {
  const account: PlanningAccount = runtimeApi.selectedInvestmentPlanningAccount();
  const selectableIds = new Set(
    account.yearlyRows
      .filter(
        (position) => position.active && position.type === "savings" && positionFlow(position) === "expense"
      )
      .map((position) => position.id)
  );
  runtimeHost.state.investment = {
    ...runtimeHost.state.investment,
    includedIds: runtimeHost.state.investment.includedIds.filter((id) => selectableIds.has(id)),
    retirementIncludedIds: runtimeHost.state.investment.retirementIncludedIds.filter((id) => selectableIds.has(id)),
    childIncludedIds: runtimeHost.state.investment.childIncludedIds.filter((id) => selectableIds.has(id))
  };
}

export function configureInvestmentUiRuntime(): void {
  Object.assign(runtimeApi, {
    syncInvestmentProjectionLabels,
    renderInvestmentIncludeList,
    visibleInvestmentSavingsPositions,
    renderInvestmentSelectionChange,
    syncInvestmentIncludeSelectionState,
    investmentIncludeSummaryButton,
    renderInvestmentIncludePopup,
    investmentIncludePositionRows,
    investmentPositionSubtitle,
    investmentPositionAmountText,
    investmentSelectedPositionIds,
    investmentSettingsForBlocking,
    syncInvestmentInputsFromState,
    syncInvestmentInputBounds,
    syncRetirementDepotControls,
    syncInvestmentTaxControl,
    syncRetirementDepotAllowanceToggle,
    syncInvestmentDepotTabs,
    updatePlanningSetting,
    planningEndYear,
    planningEndAgeForBirthYear,
    updateInvestmentSetting,
    updateSharedPayoutEndAge,
    currentSharedRetirementAge,
    isNumericInvestmentSetting,
    inputInvestmentFields,
    numericInvestmentValue,
    childBirthYearMin,
    childBirthYearMinForPayoutAge,
    clampChildPayoutAge,
    numericInvestmentPatch,
    setInvestmentDepot,
    toggleInvestmentIncludePopup,
    toggleRetirementDepotAllowance,
    activeInvestmentDepot,
    otherInvestmentDepots,
    depotLabel,
    depotInvestmentSettings,
    depotInvestmentSettingsForAccount,
    depotInvestmentSettingsForBase,
    updateDepotInvestmentSettings,
    updateRetirementAge,
    toggleInvestmentPosition,
    toggleResultMaxNeeded,
    syncCommittedInvestmentSettingInput,
    syncCommittedRetirementAgeInput,
    syncDepotScopedInvestmentFields,
    drawCurrentInvestmentChart,
    contributionDetailText,
    drawInvestmentChartWithPopup,
    showInvestmentChartPopup,
    investmentTaxLabelForProjection,
    buildDepotAssetProjection,
    investmentSettingsWithGlobalEndDate,
    normalizeInvestmentBounds,
    normalizeInvestmentDepotSelections,
    normalizeInvestmentSelectionIds
  });
}
