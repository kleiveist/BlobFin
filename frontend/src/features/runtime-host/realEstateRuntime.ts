import type { AssetProjection, InvestmentDepotKey, InvestmentSettings, PlanningAccount, RealEstateFinancingResult, RealEstateFinancingSettings, RealEstateFinancingSourceSchedule, RealEstatePaymentSourceKind, ReservePosition } from "../../types";
import { INVESTMENT_DEPOTS } from "../investment/config";
import { clamp, escapeHtml, intNumber, labelForType, money, numberValue, percent } from "../../lib/format";
import { defaultInvestmentSettingsForNewAccount } from "../../data/defaults";
import { defaultRealEstateDetailYear } from "../../domain/realEstateCalculator";
import { investmentContributionForMonth, oneTimeInvestmentContributionForMonth } from "../../domain/investmentContributions";
import { normalizePositionIcon, positionIconSvg } from "../../lib/positionIcons";
import { positionFlow } from "../../lib/positionKinds";
import { realEstatePopupHeading, realEstateRepaymentSegments, realEstateTrendSegments, renderRealEstateRepaymentChart, renderRealEstateTrendChart } from "../../views/wealthCharts";
import { runtimeApi, runtimeHost } from "./hostContext";
import { setInputValue, setText } from "./runtimeDom";

const MAX_REAL_ESTATE_PROJECTION_YEARS = 80;

type RealEstateField = keyof RealEstateFinancingSettings;

interface RealEstateWithdrawalProfile {
  accountId: string;
  projection: AssetProjection;
  settings: InvestmentSettings;
  withdrawalStartYear: number;
  withdrawalEndYear: number;
  withdrawalGainMonthly: number;
  depotSavingsRateMonthly: number;
  depotSavingsRateAvailable: boolean;
}

function renderRealEstateCalculations(result: RealEstateFinancingResult, chartProjectionYears: number): void {
  runtimeHost.latestRealEstateResult = result;
  const validation = document.querySelector<HTMLDivElement>("#realEstateValidation");
  if (validation) {
    if (result.validationErrors.length) {
      validation.classList.add("error");
      validation.innerHTML = result.validationErrors.map((item) => `<div>${escapeHtml(item)}</div>`).join("");
    } else {
      validation.classList.remove("error");
      validation.textContent = "Eingaben sind plausibel. Tilgungsplan wurde aktualisiert.";
    }
  }

  setText("realEstateDerivedEquityMetric", money(result.equityCapital));
  setText("realEstateDerivedMonthlyPaymentMetric", money(result.monthlyPayment));
  setText("realEstateDerivedInitialRepaymentMetric", percent(result.derivedInitialRepaymentPercent));
  setText("realEstateDerivedSpecialRepaymentMetric", money(result.annualSpecialRepayment));
  setText("realEstateTotalProjectCostMetric", money(result.totalProjectCost));
  setText("realEstateStartDebtMetric", money(result.startLoanAmount));
  setText("realEstateTotalLoanCostMetric", money(result.totalLoanCost));
  const finalLoanYear = result.years[result.years.length - 1];
  const actualFinancingStartYear =
    realEstateActualPaymentStartYear(result) ?? result.years[0]?.year ?? currentRealEstateFinancingStartYear();
  const actualFinancingStartAge = Math.max(0, actualFinancingStartYear - runtimeHost.state.investment.birthYear);
  const actualFinancingEndAge = Math.max(actualFinancingStartAge, result.financingEndYear - runtimeHost.state.investment.birthYear);
  const financingYearsText = realEstateFinancingYearsText(result);
  setText(
    "realEstateCalculatedEndAgeMetric",
    finalLoanYear && finalLoanYear.loanEnd <= 0 ? `${intNumber(actualFinancingEndAge)} Jahre` : "nicht getilgt"
  );
  setText("realEstateFinancingYearsMetric", financingYearsText);

  const chartYears = result.years.slice(0, Math.max(1, chartProjectionYears));
  runtimeHost.selectedRealEstateYear = defaultRealEstateDetailYear(chartYears, runtimeHost.selectedRealEstateYear);

  const repaymentHost = document.querySelector<HTMLDivElement>("#realEstateRepaymentChart");
  if (repaymentHost) {
    repaymentHost.innerHTML = renderRealEstateRepaymentChart({
      points: chartYears,
      selectedYear: runtimeHost.selectedRealEstateYear,
      loanCostBasis: result.totalLoanCost,
      financingEndYear: result.financingEndYear,
      formatMoney: (value) => money(value)
    });
  }

  const trendHost = document.querySelector<HTMLDivElement>("#realEstateTrendChart");
  if (trendHost) {
    trendHost.innerHTML = renderRealEstateTrendChart({
      points: chartYears,
      selectedYear: runtimeHost.selectedRealEstateYear,
      financingEndYear: result.financingEndYear,
      formatMoney: (value) => money(value)
    });
  }
}

function realEstateFinancingStartYear(currentYear: number, birthYear: number, financingStartAge: number): number {
  if (!Number.isFinite(financingStartAge) || financingStartAge <= 0) return currentYear;
  const targetAgeYear = birthYear + Math.floor(financingStartAge);
  return Math.max(currentYear, targetAgeYear);
}

function currentRealEstateFinancingStartYear(): number {
  return realEstateFinancingStartYear(runtimeHost.state.settings.year, runtimeHost.state.investment.birthYear, runtimeHost.state.realEstate.financingStartAge);
}

function realEstateActualPaymentStartYear(result: RealEstateFinancingResult): number | null {
  const firstPaymentMonth = result.months.find((month) => {
    return month.interestPaid + month.principalPaid + month.specialRepayment > 0;
  });
  return firstPaymentMonth?.year ?? null;
}

function realEstateFinancingYearsText(result: RealEstateFinancingResult | null): string {
  if (!result) return "-";
  const actualFinancingStartYear =
    realEstateActualPaymentStartYear(result) ?? result.years[0]?.year ?? currentRealEstateFinancingStartYear();
  const actualFinancingStartAge = Math.max(0, actualFinancingStartYear - runtimeHost.state.investment.birthYear);
  const actualFinancingEndAge = Math.max(actualFinancingStartAge, result.financingEndYear - runtimeHost.state.investment.birthYear);
  return `${intNumber(actualFinancingStartAge)} -> ${intNumber(actualFinancingEndAge)} | ${intNumber(result.financingYears)} Jahre`;
}

function currentRealEstateProjectionYears(startYear: number, investmentEndAge: number): number {
  const investmentEndYear = runtimeHost.state.investment.birthYear + Math.floor(investmentEndAge);
  const saleYear = runtimeHost.state.realEstate.plannedSaleYear;
  const rawProjectionEndYear = saleYear !== null && saleYear >= startYear ? Math.round(saleYear) : investmentEndYear;
  const projectionEndYear = Math.min(rawProjectionEndYear, runtimeApi.planningEndYear());
  return clamp(Math.round(projectionEndYear - startYear + 1), 1, 80);
}

function currentRealEstateMaximumProjectionYears(startYear: number): number {
  const saleYear = runtimeHost.state.realEstate.plannedSaleYear;
  const globalProjectionYears = clamp(
    Math.round(runtimeApi.planningEndYear() - startYear + 1),
    1,
    MAX_REAL_ESTATE_PROJECTION_YEARS
  );
  if (saleYear !== null && saleYear >= startYear) {
    return Math.min(clamp(Math.round(saleYear - startYear + 1), 1, MAX_REAL_ESTATE_PROJECTION_YEARS), globalProjectionYears);
  }
  return globalProjectionYears;
}

function currentCombinedRealEstateProjectionYears(
  startYear: number,
  standardProjection: AssetProjection,
  retirementProjection: AssetProjection,
  standardBirthYear: number,
  retirementBirthYear: number
): number {
  const standardEndYear = standardBirthYear + Math.floor(standardProjection.endAge);
  const retirementEndYear = retirementBirthYear + Math.floor(retirementProjection.endAge);
  const combinedEndYear = Math.max(standardEndYear, retirementEndYear);
  const saleYear = runtimeHost.state.realEstate.plannedSaleYear;
  const rawProjectionEndYear =
    saleYear !== null && saleYear >= startYear ? Math.min(Math.round(saleYear), combinedEndYear) : combinedEndYear;
  const projectionEndYear = Math.min(rawProjectionEndYear, runtimeApi.planningEndYear());
  return clamp(Math.round(projectionEndYear - startYear + 1), 1, 80);
}

function combinedProjectionWithoutAccounts(baseProjection: AssetProjection): AssetProjection {
  return {
    ...baseProjection,
    points: [],
    monthlyRate: 0,
    annualSavingsRate: 0,
    monthlyPension: 0,
    realMonthlyPension: 0,
    percentageWithdrawalMonthlyAtStart: 0,
    percentageWithdrawalAnnualAtStart: 0,
    withdrawalRemainingSavingsMonthlyAtStart: 0,
    withdrawalGainMonthlyAtStart: 0,
    endAge: 0,
    retirementAge: 0
  };
}

function realEstateDepotSavingsRateAvailable(standardProjection: AssetProjection): boolean {
  return (
    runtimeHost.state.realEstate.includeWithdrawalGainAsPaymentSource &&
    standardProjection.monthlyRate > 0 &&
    standardProjection.percentageWithdrawalMonthlyAtStart > standardProjection.monthlyRate
  );
}

function realEstateWithdrawalStartYear(standardProjection: AssetProjection, settings: InvestmentSettings): number {
  return settings.birthYear + Math.floor(standardProjection.percentageWithdrawalStartAge);
}

function realEstateWithdrawalProfiles(accountIds: string[] | null = null): RealEstateWithdrawalProfile[] {
  const withdrawalAccounts: PlanningAccount[] = accountIds
    ? runtimeApi.planningAccountsByIds(accountIds)
    : runtimeApi.selectedRealEstateWithdrawalAccounts();
  return withdrawalAccounts.map((account) => {
    const settings = runtimeHost.state.investmentByAccountId[account.id] ?? defaultInvestmentSettingsForNewAccount();
    const projection = runtimeApi.buildDepotAssetProjection("standard", account.id);
    const withdrawalStartYear = realEstateWithdrawalStartYear(projection, settings);
    const withdrawalEndYear = Math.min(runtimeApi.planningEndYear(), settings.birthYear + Math.floor(projection.endAge));
    const depotSavingsRateAvailable = realEstateDepotSavingsRateAvailable(projection);
    return {
      accountId: account.id,
      projection,
      settings,
      withdrawalStartYear,
      withdrawalEndYear,
      withdrawalGainMonthly: Math.max(0, projection.withdrawalGainMonthlyAtStart),
      depotSavingsRateMonthly: depotSavingsRateAvailable ? Math.max(0, projection.monthlyRate) : 0,
      depotSavingsRateAvailable
    };
  });
}

function realEstateSourceSchedule(
  startYear: number,
  projectionYears: number,
  accountIds = runtimeHost.state.ui.selectedRealEstateAccountIds
): RealEstateFinancingSourceSchedule {
  const monthCount = Math.max(12, Math.min(80, Math.round(projectionYears || 1)) * 12);
  const sourceAccounts = runtimeApi.planningAccountsByIds(accountIds);
  const equityPositions = selectedRealEstateSourcePositions("equityCapital", sourceAccounts);
  const monthlyPositions = selectedRealEstateSourcePositions("monthlyPayment", sourceAccounts);
  const specialPositions = selectedRealEstateSourcePositions("specialRepayment", sourceAccounts);
  const equityCapital = equityPositions.reduce((sum, position) => {
    return sum + (position.payoutType === "once" && position.payoutYear <= startYear ? Number(position.amount) : 0);
  }, 0);
  const monthlyPaymentSavings: number[] = [];
  const withdrawalGainPayments: number[] = [];
  const specialRepayments: number[] = [];
  const withdrawalProfiles = realEstateWithdrawalProfiles(accountIds);
  const depotSavingsRatePayments: number[] = [];

  for (let index = 0; index < monthCount; index += 1) {
    const year = startYear + Math.floor(index / 12);
    const month = (index % 12) + 1;
    monthlyPaymentSavings.push(
      monthlyPositions.reduce((sum, position) => sum + investmentContributionForMonth(position, year, month), 0)
    );
    const withdrawalGain = runtimeHost.state.realEstate.includeWithdrawalGainAsPaymentSource
      ? withdrawalProfiles.reduce((sum, profile) => {
          const activeYear = year >= profile.withdrawalStartYear && year <= profile.withdrawalEndYear;
          return sum + (activeYear ? profile.withdrawalGainMonthly : 0);
        }, 0)
      : 0;
    const depotSavingsRate = runtimeHost.state.realEstate.repaymentSources.useDepotSavingsRateAsRepayment
      ? withdrawalProfiles.reduce((sum, profile) => {
          const activeYear = year >= profile.withdrawalStartYear && year <= profile.withdrawalEndYear;
          return sum + (activeYear ? profile.depotSavingsRateMonthly : 0);
        }, 0)
      : 0;
    withdrawalGainPayments.push(withdrawalGain);
    depotSavingsRatePayments.push(depotSavingsRate);
    specialRepayments.push(
      specialPositions.reduce((sum, position) => {
        return (
          sum +
          (position.payoutType === "once"
            ? oneTimeInvestmentContributionForMonth(position, year, month)
            : investmentContributionForMonth(position, year, month))
        );
      }, 0)
    );
  }

  return { equityCapital, monthlyPaymentSavings, withdrawalGainPayments, depotSavingsRatePayments, specialRepayments };
}

function selectedRealEstateSourcePositions(
  kind: RealEstatePaymentSourceKind,
  sourceAccounts: PlanningAccount[] = runtimeApi.selectedRealEstateSourceAccounts()
): ReservePosition[] {
  const positions = sourceAccounts.flatMap((account) => account.yearlyRows);
  const selectedIds = new Set(realEstateSourceIds(kind));
  return positions.filter(
    (position) =>
      position.active &&
      position.type === "savings" &&
      positionFlow(position) === "expense" &&
      selectedIds.has(position.id)
  );
}

function renderRealEstateSourceLists(): void {
  renderRealEstateSourceList("equityCapital", "#realEstateEquityCapitalSourceList");
  renderRealEstateSourceList("monthlyPayment", "#realEstateMonthlyPaymentSourceList");
  renderRealEstateSourceList("specialRepayment", "#realEstateSpecialRepaymentSourceList");

  const withdrawalProfiles = realEstateWithdrawalProfiles();
  const monthlyWithdrawalGain = withdrawalProfiles.reduce((sum, profile) => sum + profile.withdrawalGainMonthly, 0);
  const savingsRateProfiles = withdrawalProfiles.filter((profile) => profile.depotSavingsRateAvailable);
  const monthlyDepotSavingsRate = savingsRateProfiles.reduce((sum, profile) => sum + profile.depotSavingsRateMonthly, 0);
  const withdrawalAccountLabel = withdrawalProfiles.length
    ? ` aus ${intNumber(withdrawalProfiles.length)} Konto${withdrawalProfiles.length === 1 ? "" : "en"}`
    : "";

  const toggle = document.querySelector<HTMLButtonElement>("[data-action='toggle-real-estate-withdrawal-gain-source']");
  if (toggle) {
    toggle.classList.toggle("active", runtimeHost.state.realEstate.includeWithdrawalGainAsPaymentSource);
    toggle.setAttribute("aria-pressed", String(runtimeHost.state.realEstate.includeWithdrawalGainAsPaymentSource));
  }
  setText(
    "realEstateWithdrawalGainSourceAmount",
    `${money(monthlyWithdrawalGain)} monatlich${withdrawalAccountLabel}`
  );

  const savingsRateToggle = document.querySelector<HTMLButtonElement>(
    "[data-action='toggle-real-estate-depot-savings-rate-source']"
  );
  const savingsRateAvailable = savingsRateProfiles.length > 0 && monthlyDepotSavingsRate > 0;
  const savingsRateActive = runtimeHost.state.realEstate.repaymentSources.useDepotSavingsRateAsRepayment && savingsRateAvailable;
  if (savingsRateToggle) {
    savingsRateToggle.classList.toggle("active", savingsRateActive);
    savingsRateToggle.classList.toggle("blocked", !savingsRateAvailable);
    savingsRateToggle.disabled = !savingsRateAvailable;
    savingsRateToggle.setAttribute("aria-pressed", String(savingsRateActive));
  }
  setText(
    "realEstateDepotSavingsRateSourceAmount",
    savingsRateAvailable
      ? `${money(monthlyDepotSavingsRate)} monatlich aus ${intNumber(savingsRateProfiles.length)} Konto${
          savingsRateProfiles.length === 1 ? "" : "en"
        }`
      : "nicht verfuegbar"
  );
}

function renderRealEstateSourceList(kind: RealEstatePaymentSourceKind, selector: string): void {
  const host = document.querySelector<HTMLDivElement>(selector);
  if (!host) return;

  const savingsPositions = (runtimeApi.selectedRealEstateSourceAccounts() as PlanningAccount[]).flatMap((account) =>
    account.yearlyRows
      .filter((position) => {
        return (
          position.active &&
          position.type === "savings" &&
          positionFlow(position) === "expense" &&
          (kind === "equityCapital"
            ? position.payoutType === "once"
            : kind === "specialRepayment" || position.payoutType !== "once")
        );
      })
      .map((position) => ({ accountName: account.name, position }))
  );

  if (!savingsPositions.length) {
    host.innerHTML = `
      <div class="include-empty">Keine passende Sparposition angelegt.</div>
      <button class="button secondary" type="button" data-action="add-real-estate-savings-source-${kind}">
        Sparposition anlegen
      </button>
    `;
    return;
  }

  const selectedIds = new Set(realEstateSourceIds(kind));
  const financingStartYear = currentRealEstateFinancingStartYear();
  const blockedCashIds = runtimeApi.combinedCashSelectedPositionIds();
  const blockedByOtherRealEstate = otherRealEstateSourceKinds(kind).reduce((blockedIds, otherKind) => {
    for (const id of realEstateSourceIds(otherKind)) blockedIds.add(id);
    return blockedIds;
  }, new Set<string>());

  host.innerHTML = savingsPositions
    .map(({ accountName, position }) => {
      const blockedDepot = blockedInvestmentDepotForPosition(position.id);
      const blockedByRealEstate = blockedByOtherRealEstate.has(position.id);
      const blockedByCash = blockedCashIds.has(position.id);
      const blockedByTiming = kind === "equityCapital" && position.payoutYear > financingStartYear;
      const blocked = Boolean(blockedDepot) || blockedByRealEstate || blockedByCash || blockedByTiming;
      const checked = selectedIds.has(position.id) ? "checked" : "";
      const disabled = blocked ? "disabled" : "";
      const blockedText = blockedDepot
        ? `belegt im ${runtimeApi.depotLabel(blockedDepot)}`
        : blockedByRealEstate
          ? "bereits in anderer Immobilienquelle"
          : blockedByCash
            ? "belegt im Cash-Modul"
            : blockedByTiming
              ? `erst nach Finanzierungsstart ${financingStartYear} verfuegbar`
              : `${realEstatePositionSubtitle(position)} | Konto ${accountName}`;
      return `
        <label class="include-item ${blocked ? "blocked" : ""}">
          <input
            type="checkbox"
            data-real-estate-source-kind="${kind}"
            data-real-estate-source-position="${position.id}"
            ${checked}
            ${disabled}
          />
          <span class="include-icon">${positionIconSvg(normalizePositionIcon(position.icon))}</span>
          <span>
            <span class="include-name">${escapeHtml(position.name)} <span class="muted">(${escapeHtml(accountName)})</span></span>
            <span class="include-amount">${escapeHtml(blockedText)}</span>
          </span>
        </label>
      `;
    })
    .join("");
}

function realEstatePositionSubtitle(position: ReservePosition): string {
  return `${runtimeApi.investmentPositionAmountText(position)} | ${labelForType(position.type)}`;
}

function realEstateSourceIds(kind: RealEstatePaymentSourceKind): string[] {
  if (kind === "equityCapital") return runtimeHost.state.realEstate.equityCapitalSourceIds;
  if (kind === "monthlyPayment") return runtimeHost.state.realEstate.monthlyPaymentSourceIds;
  return runtimeHost.state.realEstate.specialRepaymentSourceIds;
}

function realEstateSelectedSourceIds(): Set<string> {
  return new Set([
    ...runtimeHost.state.realEstate.equityCapitalSourceIds,
    ...runtimeHost.state.realEstate.monthlyPaymentSourceIds,
    ...runtimeHost.state.realEstate.specialRepaymentSourceIds
  ]);
}

function otherRealEstateSourceKinds(kind: RealEstatePaymentSourceKind): RealEstatePaymentSourceKind[] {
  return (["equityCapital", "monthlyPayment", "specialRepayment"] as RealEstatePaymentSourceKind[]).filter(
    (item) => item !== kind
  );
}

function realEstateSourceField(kind: RealEstatePaymentSourceKind): keyof RealEstateFinancingSettings {
  if (kind === "equityCapital") return "equityCapitalSourceIds";
  if (kind === "monthlyPayment") return "monthlyPaymentSourceIds";
  return "specialRepaymentSourceIds";
}

function blockedInvestmentDepotForPosition(positionId: string): InvestmentDepotKey | null {
  for (const settings of runtimeApi.investmentSettingsForBlocking()) {
    const depot = INVESTMENT_DEPOTS.find((item) =>
      runtimeApi.depotInvestmentSettingsForBase(item, settings).includedIds.includes(positionId)
    );
    if (depot) return depot;
  }
  return null;
}

function syncRealEstateInputsFromState(): void {
  if (runtimeHost.state.realEstate.locale !== "de") {
    runtimeHost.state.realEstate = { ...runtimeHost.state.realEstate, locale: "de" };
  }
  const realEstate = runtimeHost.state.realEstate;
  syncRealEstateLocaleLabels("de");

  for (const [field, value] of Object.entries(realEstate)) {
    const selector = `[data-real-estate-field="${field}"]`;
    if (field === "specialRepaymentRhythm") {
      const control = document.querySelector<HTMLSelectElement>(selector);
      if (control) control.value = String(value);
      continue;
    }
    if (field === "purchaseActivated") {
      const control = document.querySelector<HTMLInputElement>(selector);
      if (control) control.checked = Boolean(value);
      continue;
    }
    if (
      field === "locale" ||
      field === "repaymentSources" ||
      field === "equityCapitalSourceIds" ||
      field === "monthlyPaymentSourceIds" ||
      field === "specialRepaymentSourceIds" ||
      field === "includeWithdrawalGainAsPaymentSource"
    ) {
      continue;
    }
    if (value === null) {
      const control = document.querySelector<HTMLInputElement>(selector);
      if (control) control.value = "";
      continue;
    }
    setInputValue(selector, value as number | string);
  }

  const ranges: Array<RealEstateField> = ["interestRatePercent", "propertyValueGrowthPercent"];
  for (const field of ranges) {
    setInputValue(`[data-real-estate-range="${field}"]`, runtimeHost.state.realEstate[field] as number);
  }

  setText("realEstateInterestRatePercentValue", percent(realEstate.interestRatePercent));
  setText("realEstatePropertyValueGrowthPercentValue", percent(realEstate.propertyValueGrowthPercent));
}

function syncRealEstateLocaleLabels(locale: RealEstateFinancingSettings["locale"]): void {
  for (const label of document.querySelectorAll<HTMLElement>("[data-real-estate-label-key]")) {
    const de = label.dataset.labelDe ?? label.textContent ?? "";
    const en = label.dataset.labelEn ?? de;
    label.textContent = locale === "en" ? en : de;
  }
}

function updateRealEstateField(field: RealEstateField, value: string): void {
  if (
    field === "locale" ||
    field === "repaymentSources" ||
    field === "equityCapitalSourceIds" ||
    field === "monthlyPaymentSourceIds" ||
    field === "specialRepaymentSourceIds" ||
    field === "includeWithdrawalGainAsPaymentSource"
  ) {
    return;
  }
  if (field === "purchaseActivated") {
    runtimeHost.state.realEstate = {
      ...runtimeHost.state.realEstate,
      purchaseActivated: value === "true"
    };
    resetRealEstateDetailSelection();
    return;
  }
  if (field === "specialRepaymentRhythm") {
    if (value === "none" || value === "monthly" || value === "yearly") {
      runtimeHost.state.realEstate = {
        ...runtimeHost.state.realEstate,
        specialRepaymentRhythm: value as RealEstateFinancingSettings["specialRepaymentRhythm"]
      };
    }
    return;
  }

  const nullableFields = new Set<RealEstateField>([
    "plannedSaleYear",
    "estimatedSaleValue",
    "targetFullRepaymentYear",
    "manualFuturePropertyValue"
  ]);
  const parsed = numberValue(value);
  const nextRealEstate = {
    ...runtimeHost.state.realEstate,
    [field]: nullableFields.has(field) && value.trim() === "" ? null : Math.max(0, parsed)
  } as RealEstateFinancingSettings;
  runtimeHost.state.realEstate = nextRealEstate;
  resetRealEstateDetailSelection();
}

function toggleRealEstateSourcePosition(kind: RealEstatePaymentSourceKind, id: string, checked: boolean): void {
  if (checked && blockedInvestmentDepotForPosition(id)) return;
  if (checked && runtimeApi.combinedCashSelectedPositionIds().has(id)) return;
  if (checked && otherRealEstateSourceKinds(kind).some((otherKind) => realEstateSourceIds(otherKind).includes(id))) return;

  const currentIds = new Set(realEstateSourceIds(kind));
  if (checked) currentIds.add(id);
  else currentIds.delete(id);

  runtimeHost.state.realEstate = {
    ...runtimeHost.state.realEstate,
    [realEstateSourceField(kind)]: Array.from(currentIds)
  };
  resetRealEstateDetailSelection();
}

function toggleRealEstateWithdrawalGainSource(): void {
  runtimeHost.state.realEstate = {
    ...runtimeHost.state.realEstate,
    includeWithdrawalGainAsPaymentSource: !runtimeHost.state.realEstate.includeWithdrawalGainAsPaymentSource
  };
  resetRealEstateDetailSelection();
  runtimeApi.renderAll();
}

function toggleRealEstateDepotSavingsRateSource(): void {
  runtimeHost.state.realEstate = {
    ...runtimeHost.state.realEstate,
    repaymentSources: {
      ...runtimeHost.state.realEstate.repaymentSources,
      useDepotSavingsRateAsRepayment: !runtimeHost.state.realEstate.repaymentSources.useDepotSavingsRateAsRepayment
    }
  };
  resetRealEstateDetailSelection();
  runtimeApi.renderAll();
}

function addRealEstateSavingsSource(kind: RealEstatePaymentSourceKind): void {
  runtimeApi.setActiveSection("planning_scenarios");
  runtimeHost.selectedPositionMode = "savings";
  const id = runtimeApi.addPosition();
  const activeAccountId = runtimeApi.activePlanningAccount().id;
  const selectedIds = Array.from(new Set([...runtimeHost.state.ui.selectedRealEstateAccountIds, activeAccountId]));
  runtimeHost.state.ui = {
    ...runtimeHost.state.ui,
    selectedRealEstateAccountIds: selectedIds,
    selectedRealEstateWithdrawalGainAccountIds: selectedIds
  };
  if (kind === "equityCapital") {
    const financingStartYear = currentRealEstateFinancingStartYear();
    runtimeHost.state.positions = runtimeHost.state.positions.map((position) =>
      position.id === id
        ? runtimeApi.sanitizePosition(
            {
              ...position,
              name: "Eigenkapital Immobilie",
              payoutType: "once",
              payoutYear: financingStartYear,
              payoutMonth: 1,
              payoutDay: 1
            },
            runtimeHost.state.settings.year
          )
        : position
    );
  }
  toggleRealEstateSourcePosition(kind, id, true);
  runtimeApi.renderAll();
}

function setSelectedRealEstateYear(year: number): void {
  runtimeHost.selectedRealEstateYear = Number.isFinite(year) && year > 0 ? year : null;
  runtimeApi.renderAll();
}

function resetRealEstateDetailSelection(): void {
  runtimeHost.selectedRealEstateYear = null;
}

function showRealEstateChartPopup(
  year: number,
  chartKind: "repayment" | "trend",
  clientX: number,
  clientY: number
): void {
  const result = runtimeHost.latestRealEstateResult;
  const point = result?.years.find((entry) => entry.year === year);
  const popup = document.querySelector<HTMLDivElement>("#realEstateChartPopup");
  const card = popup?.closest<HTMLElement>(".real-estate-chart-card");
  if (!result || !point || !popup || !card) return;

  const initialPropertyValue = Math.max(0, result.years[0]?.propertyValue ?? 0);
  const repaymentGroup = runtimeApi.chartPopupSection("Tilgung und Kredit", [
    ...realEstateRepaymentSegments({ point }).map((segment) =>
      runtimeApi.chartPopupLine(segment.className, segment.label, money(segment.value))
    ),
    runtimeApi.chartPopupLine("gross", "Darlehensbetrag inkl. Zinsen", money(result.totalLoanCost))
  ]);
  const trendGroup = runtimeApi.chartPopupSection("Immobilienwertentwicklung", [
    ...realEstateTrendSegments(point, initialPropertyValue).map((segment) =>
      runtimeApi.chartPopupLine(segment.className, segment.label, money(segment.value))
    ),
    runtimeApi.chartPopupTotalLine("Immobilienwert", money(point.propertyValue))
  ]);
  const groups = chartKind === "trend" ? [trendGroup, repaymentGroup] : [repaymentGroup, trendGroup];
  const title = chartKind === "trend" ? "Immobilienwertentwicklung" : "Tilgung und Vermoegen";

  popup.innerHTML = `
    <div class="chart-popup-head">
      <div>
        <span>${title}</span>
        <strong>${realEstatePopupHeading(point.year - runtimeHost.state.investment.birthYear, point.year, intNumber)}</strong>
      </div>
      <button class="chart-popup-close" type="button" data-action="close-investment-chart-popup" aria-label="Popup schliessen">x</button>
    </div>
    <div class="chart-popup-list">
      ${groups.join("")}
    </div>
  `;

  popup.hidden = false;
  runtimeApi.positionChartPopup(popup, card, clientX, clientY);
}

function normalizeRealEstateSourceIds(): void {
  const selectedAccounts: PlanningAccount[] = runtimeApi.selectedRealEstateSourceAccounts();
  const savingsPositions = selectedAccounts.flatMap((account) =>
    account.yearlyRows.filter(
      (position) => position.active && position.type === "savings" && positionFlow(position) === "expense"
    )
  );
  const financingStartYear = currentRealEstateFinancingStartYear();
  const equitySelectableIds = new Set(
    savingsPositions
      .filter((position) => position.payoutType === "once" && position.payoutYear <= financingStartYear)
      .map((position) => position.id)
  );
  const monthlySelectableIds = new Set(
    savingsPositions.filter((position) => position.payoutType !== "once").map((position) => position.id)
  );
  const specialSelectableIds = new Set(savingsPositions.map((position) => position.id));
  const blockedByInvestment = new Set([
    ...runtimeHost.state.investment.includedIds,
    ...runtimeHost.state.investment.retirementIncludedIds,
    ...runtimeHost.state.investment.childIncludedIds
  ]);
  const equityCapitalSourceIds = runtimeHost.state.realEstate.equityCapitalSourceIds.filter(
    (id) => equitySelectableIds.has(id) && !blockedByInvestment.has(id)
  );
  const equityIds = new Set(equityCapitalSourceIds);
  const monthlyPaymentSourceIds = runtimeHost.state.realEstate.monthlyPaymentSourceIds.filter(
    (id) => monthlySelectableIds.has(id) && !blockedByInvestment.has(id) && !equityIds.has(id)
  );
  const monthlyIds = new Set(monthlyPaymentSourceIds);
  const specialRepaymentSourceIds = runtimeHost.state.realEstate.specialRepaymentSourceIds.filter(
    (id) => specialSelectableIds.has(id) && !blockedByInvestment.has(id) && !equityIds.has(id) && !monthlyIds.has(id)
  );
  runtimeHost.state.realEstate = {
    ...runtimeHost.state.realEstate,
    equityCapitalSourceIds,
    monthlyPaymentSourceIds,
    specialRepaymentSourceIds
  };
}

export function configureRealEstateRuntime(): void {
  Object.assign(runtimeApi, {
    renderRealEstateCalculations,
    realEstateFinancingStartYear,
    currentRealEstateFinancingStartYear,
    realEstateActualPaymentStartYear,
    realEstateFinancingYearsText,
    currentRealEstateProjectionYears,
    currentRealEstateMaximumProjectionYears,
    currentCombinedRealEstateProjectionYears,
    combinedProjectionWithoutAccounts,
    realEstateDepotSavingsRateAvailable,
    realEstateWithdrawalStartYear,
    realEstateWithdrawalProfiles,
    realEstateSourceSchedule,
    selectedRealEstateSourcePositions,
    renderRealEstateSourceLists,
    renderRealEstateSourceList,
    realEstatePositionSubtitle,
    realEstateSourceIds,
    realEstateSelectedSourceIds,
    otherRealEstateSourceKinds,
    realEstateSourceField,
    blockedInvestmentDepotForPosition,
    syncRealEstateInputsFromState,
    syncRealEstateLocaleLabels,
    updateRealEstateField,
    toggleRealEstateSourcePosition,
    toggleRealEstateWithdrawalGainSource,
    toggleRealEstateDepotSavingsRateSource,
    addRealEstateSavingsSource,
    setSelectedRealEstateYear,
    resetRealEstateDetailSelection,
    showRealEstateChartPopup,
    normalizeRealEstateSourceIds
  });
}
