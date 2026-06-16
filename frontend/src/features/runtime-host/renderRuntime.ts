import { calculatePlannedOutflowForSingleMonth, calculateReserveSummary } from "../../domain/reserveCalculator";
import { calculateRealEstateFinancing } from "../../domain/realEstateCalculator";
import { clamp, escapeHtml, intNumber, money, percent } from "../../lib/format";
import { combineAssetProjections } from "./investmentProjectionRuntime";
import { defaultInvestmentSettingsForNewAccount } from "../../data/defaults";
import { renderAccountYearTableOverview } from "../../views/accountYearTables";
import { runtimeApi, runtimeHost } from "./hostContext";
import { setInputValue, setRangeLabel, setText } from "./runtimeDom";
import type { PlanningSettings, ReservePosition } from "../../types";

interface ReserveChartTotals {
  income: number;
  expense: number;
  reserve: number;
  savings: number;
  remaining: number;
}

interface ReserveChartModel {
  totals: ReserveChartTotals;
  insight: string;
}

function renderCalculations(activeReserve: ReturnType<typeof calculateReserveSummary>): void {
  const standardProjection = runtimeApi.buildDepotAssetProjection("standard");
  const retirementProjection = runtimeApi.buildDepotAssetProjection("retirement");
  const childProjection = runtimeApi.buildDepotAssetProjection("child");
  const activeDepot = runtimeApi.activeInvestmentDepot();
  const projection =
    activeDepot === "child" ? childProjection : activeDepot === "retirement" ? retirementProjection : standardProjection;
  const combinedProjection = combineAssetProjections(standardProjection, retirementProjection);
  runtimeApi.syncInvestmentProjectionLabels(activeDepot);

  setText("monthlyRateMetric", money(projection.monthlyRate));
  setText("monthlySavingsRateMetric", `${money(projection.monthlyRate)} monatlich`);
  setText("annualSavingsRateMetric", money(projection.annualSavingsRate));
  setText("wealthAtRetirementMetric", money(projection.wealthAtRetirement));
  setText("withdrawalOffsetMetric", money(projection.withdrawalRemainingSavingsMonthlyAtStart));
  setText("withdrawalGainMetric", money(projection.withdrawalGainMonthlyAtStart));
  setText("monthlyPensionMetric", money(projection.monthlyPension));
  setText("realWealthMetric", money(projection.realWealthAtRetirement));
  setText("combinedStandardWealthMetric", money(standardProjection.wealthAtRetirement));
  setText("combinedRetirementWealthMetric", money(retirementProjection.wealthAtRetirement));
  setText("combinedWealthMetric", money(combinedProjection.wealthAtRetirement));
  setText("combinedMonthlyRateMetric", money(combinedProjection.monthlyRate));
  setText("combinedMonthlyPensionMetric", money(combinedProjection.monthlyPension));
  setText("combinedRealWealthMetric", money(combinedProjection.realWealthAtRetirement));
  setText("retirementDepotFundingStatus", projection.retirementDepotAllowanceEnabled ? "Zulage ein" : "Zulage aus");
  setText("retirementDepotOwnContributionMetric", money(projection.retirementDepotAnnualOwnContribution));
  setText("retirementDepotBaseAllowanceMetric", money(projection.retirementDepotBaseAllowanceAnnual));
  setText("retirementDepotChildAllowanceMetric", money(projection.retirementDepotChildAllowanceAnnual));
  setText("retirementDepotAllowanceRateMetric", percent(projection.retirementDepotAllowanceRatePercent));
  setText("retirementDepotTotalAllowanceMetric", money(projection.retirementDepotAllowanceAnnual));
  setText("retirementDepotTotalContributionMetric", money(projection.retirementDepotAnnualContributionWithAllowance));
  setText("retirementDepotAllowanceAtRetirementMetric", money(projection.allowanceAtRetirement));

  const activeSettings = runtimeApi.depotInvestmentSettings(runtimeApi.activeInvestmentDepot());
  setRangeLabel("investmentReturnPercent", percent(activeSettings.investmentReturnPercent));
  setRangeLabel("capitalGainsTaxPercent", percent(activeSettings.capitalGainsTaxPercent));
  setRangeLabel("inflationRatePercent", percent(activeSettings.inflationRatePercent));
  setRangeLabel("bequestReservePercent", percent(activeSettings.bequestReservePercent));
  setInputValue("[data-retirement-age]", projection.retirementAge);

  setText(
    "detailContribution",
    runtimeApi.contributionDetailText(projection)
  );
  setText("detailAllowance", money(projection.allowanceAtRetirement));
  setText("detailAllowanceBasis", money(projection.allowanceBasisAtRetirement));
  setText(
    "detailCostBasis",
    money(Math.max(0, projection.costBasisAtRetirement - projection.allowanceBasisAtRetirement))
  );
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
  setText(
    "detailBequestReserve",
    `${money(projection.bequestReserveAtEnd)} (${percent(projection.bequestReservePercent)})`
  );
  setText("detailSelectedMonthlyRate", money(projection.monthlyRate));

  renderAccountYearTables();
  renderReserveChartPopup(activeReserve);
  runtimeApi.hideInvestmentChartPopup();
  runtimeApi.drawInvestmentChartWithPopup(projection);
  runtimeApi.drawInvestmentChartWithPopup(combinedProjection, "#combinedInvestmentChart", "#combinedInvestmentChartPopup");

  const financingStartYear = runtimeApi.realEstateFinancingStartYear(
    runtimeHost.state.settings.year,
    runtimeHost.state.investment.birthYear,
    runtimeHost.state.realEstate.financingStartAge
  );
  const realEstateProjectionYears = runtimeApi.currentRealEstateProjectionYears(financingStartYear, standardProjection.endAge);
  const maxRealEstateProjectionYears = runtimeApi.currentRealEstateMaximumProjectionYears(financingStartYear);
  const combinedLeadAccount = runtimeApi.selectedCombinedLeadInvestmentPlanningAccount();
  const combinedLeadSettings = combinedLeadAccount
    ? runtimeHost.state.investmentByAccountId[combinedLeadAccount.id] ?? defaultInvestmentSettingsForNewAccount()
    : null;
  const combinedStandardProjection = combinedLeadAccount
    ? runtimeApi.buildDepotAssetProjection("standard", combinedLeadAccount.id)
    : runtimeApi.combinedProjectionWithoutAccounts(standardProjection);
  const combinedRetirementProjection = combinedLeadAccount
    ? runtimeApi.buildDepotAssetProjection("retirement", combinedLeadAccount.id)
    : runtimeApi.combinedProjectionWithoutAccounts(retirementProjection);
  const combinedDepotProjections = runtimeApi.combinedDepotProjectionInputs(combinedLeadAccount);
  const combinedBirthYear = combinedLeadSettings?.birthYear ?? runtimeHost.state.settings.year;
  const combinedRetirementBirthYear = combinedLeadSettings?.retirementBirthYear ?? runtimeHost.state.settings.year;
  const combinedRealEstateStartYear = runtimeApi.realEstateFinancingStartYear(
    runtimeHost.state.settings.year,
    combinedBirthYear,
    runtimeHost.state.realEstate.financingStartAge
  );
  runtimeApi.renderStatutoryPensionCalculations(combinedBirthYear);
  const combinedRealEstateProjectionYears = runtimeApi.currentCombinedRealEstateProjectionYears(
    combinedRealEstateStartYear,
    combinedStandardProjection,
    combinedRetirementProjection,
    combinedBirthYear,
    combinedRetirementBirthYear
  );
  runtimeApi.renderRealEstateSourceLists();
  const realEstate = calculateRealEstateFinancing(
    financingStartYear,
    runtimeHost.state.realEstate,
    runtimeApi.realEstateSourceSchedule(financingStartYear, maxRealEstateProjectionYears),
    {
      projectionYears: realEstateProjectionYears,
      maxProjectionYears: maxRealEstateProjectionYears
    }
  );
  runtimeApi.renderRealEstateCalculations(realEstate, realEstateProjectionYears);
  runtimeApi.renderCombinedModuleControls();
  const combinedRealEstateActive = runtimeHost.state.realEstate.purchaseActivated && runtimeHost.state.combinedWealth.includeRealEstateFinancing;
  const combinedRealEstate = combinedRealEstateActive
    ? calculateRealEstateFinancing(
        combinedRealEstateStartYear,
        runtimeHost.state.realEstate,
        runtimeApi.realEstateSourceSchedule(
          combinedRealEstateStartYear,
          combinedRealEstateProjectionYears,
          runtimeHost.state.ui.selectedRealEstateAccountIds
        ),
        {
          projectionYears: combinedRealEstateProjectionYears,
          maxProjectionYears: combinedRealEstateProjectionYears
        }
      )
    : runtimeApi.inactiveCombinedRealEstateResult(combinedRealEstateStartYear);
  const combinedYears = runtimeApi.calculateCombinedWealthYears(
    combinedRealEstate,
    combinedDepotProjections,
    runtimeApi.combinedPensionInput(runtimeHost.latestStatutoryPensionModel, combinedBirthYear)
  );
  runtimeApi.renderCombinedWealthCalculations(combinedYears);
}

function renderAccountYearTables(): void {
  const host = document.querySelector<HTMLDivElement>("#accountYearTableOverview");
  const toggleButton = document.querySelector<HTMLButtonElement>("[data-action='toggle-result-max-needed']");
  if (toggleButton) {
    toggleButton.classList.toggle("active", runtimeHost.showResultMaxNeeded);
    toggleButton.setAttribute("aria-pressed", String(runtimeHost.showResultMaxNeeded));
  }
  if (!host) return;
  host.innerHTML = renderAccountYearTableOverview({
    accounts: runtimeApi.planningAccountsForActiveYear(),
    settings: runtimeApi.activePlanningSettings(),
    activeAccountId: runtimeHost.state.ui.selectedPlanningAccountId,
    showMaxNeeded: runtimeHost.showResultMaxNeeded
  });
}

function renderReserveChartPopup(summary: ReturnType<typeof calculateReserveSummary>): void {
  const popup = document.querySelector<HTMLDivElement>("#reserveChartPopup");
  if (!popup) return;

  const model = buildReserveChartModel(summary);
  popup.innerHTML = `
    ${reservePieChart(model)}
    <div class="reserve-chart-legend">
      <span><i class="legend-dot green"></i>Einnahmen</span>
      <span><i class="legend-dot red"></i>Ausgaben</span>
      <span><i class="legend-dot orange"></i>Ruecklagen</span>
      <span><i class="legend-dot blue"></i>Sparen</span>
    </div>
    <div class="reserve-chart-insight">${escapeHtml(model.insight)}</div>
  `;
  popup.hidden = false;
}

function buildReserveChartModel(summary: ReturnType<typeof calculateReserveSummary>): ReserveChartModel {
  const chartPositions: ReservePosition[] = runtimeApi.activePlanningPositions();
  const chartSettings: PlanningSettings = runtimeApi.activePlanningSettings();
  const totals = summary.rows.reduce<ReserveChartTotals>((sum, row) => {
    const reserves = chartPositions.reduce((sum, position) => {
      return position.type === "reserve"
        ? sum + calculatePlannedOutflowForSingleMonth(position, chartSettings.year, row.monthNumber)
        : sum;
    }, 0);
    const savings = chartPositions.reduce((sum, position) => {
      return position.type === "savings"
        ? sum + calculatePlannedOutflowForSingleMonth(position, chartSettings.year, row.monthNumber)
        : sum;
    }, 0);
    const income = Math.max(0, row.plannedIncome);
    const expense = Math.max(0, row.plannedOutflow - reserves - savings);
    const reserve = Math.max(0, reserves);
    const saving = Math.max(0, savings);
    return {
      income: sum.income + income,
      expense: sum.expense + expense,
      reserve: sum.reserve + reserve,
      savings: sum.savings + saving,
      remaining: sum.remaining + income - expense - reserve - saving
    };
  }, { income: 0, expense: 0, reserve: 0, savings: 0, remaining: 0 });

  return {
    totals,
    insight: reserveChartInsight(totals)
  };
}

function reservePieChart(model: ReserveChartModel): string {
  const segments = reservePieSegments(model.totals);
  const savingsRate = model.totals.income > 0 ? model.totals.savings / model.totals.income : 0;
  const background = reservePieBackground(segments);
  return `
    <div class="reserve-pie-layout" aria-label="Kreisdiagramm">
      <div class="reserve-pie" style="background: ${background}">
        <div class="reserve-pie-center">
          <span>Einnahmen</span>
          <strong>${money(model.totals.income)}</strong>
          <small>Sparquote ${percent(savingsRate * 100)}</small>
        </div>
      </div>
      <div class="reserve-pie-details">
        ${reservePieField("income", "Einnahmen", model.totals.income, "Bezugswert")}
        ${reservePieField("expense", "Ausgaben", model.totals.expense, "Anteil am Einkommen")}
        ${reservePieField("reserve", "Ruecklagen", model.totals.reserve, "Anteil am Einkommen")}
        ${reservePieField("savings", "Sparrate", model.totals.savings, `Sparquote ${percent(savingsRate * 100)}`)}
        ${reservePieField(
          model.totals.remaining >= 0 ? "remaining" : "deficit",
          model.totals.remaining >= 0 ? "Uebrig" : "Fehlbetrag",
          Math.abs(model.totals.remaining),
          model.totals.remaining >= 0 ? "freier Spielraum" : "Optimierungsbedarf"
        )}
      </div>
    </div>
  `;
}

function reservePieSegments(totals: ReserveChartTotals): Array<{ key: string; value: number; color: string }> {
  const remaining = Math.max(0, totals.remaining);
  const deficit = Math.max(0, -totals.remaining);
  return [
    { key: "expense", value: totals.expense, color: "var(--danger)" },
    { key: "reserve", value: totals.reserve, color: "var(--reserve)" },
    { key: "savings", value: totals.savings, color: "var(--reserve-chart-savings)" },
    { key: "remaining", value: remaining, color: "var(--good)" },
    { key: "deficit", value: deficit, color: "var(--gold)" }
  ].filter((segment) => segment.value > 0.01);
}

function reservePieBackground(segments: Array<{ key: string; value: number; color: string }>): string {
  if (!segments.length) return "var(--surface-muted)";
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let cursor = 0;
  const stops = segments.map((segment) => {
    const start = cursor;
    cursor += (segment.value / total) * 360;
    return `${segment.color} ${start.toFixed(1)}deg ${cursor.toFixed(1)}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

function reservePieField(key: string, label: string, value: number, detail: string): string {
  return `
    <div class="reserve-pie-field ${escapeHtml(key)}">
      <span>${escapeHtml(label)}</span>
      <strong>${money(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </div>
  `;
}

function reserveChartInsight(totals: ReserveChartTotals): string {
  const savingsRate = totals.income > 0 ? totals.savings / totals.income : 0;
  if (totals.income <= 0) return "Keine Einnahmen im Jahr: zuerst Einnahmepositionen pruefen oder ergaenzen.";
  if (totals.remaining < 0) {
    return `Jahresrest ist negativ: ${money(Math.abs(totals.remaining))} Fehlbetrag.`;
  }
  if (savingsRate < 0.15) {
    return `Sparquote ${percent(savingsRate * 100)} bei ${money(totals.remaining)} freiem Jahresrest.`;
  }
  return `Sparquote ${percent(savingsRate * 100)} bei ${money(totals.remaining)} freiem Jahresrest.`;
}

function positionChartPopup(popup: HTMLDivElement, card: HTMLElement, clientX: number, clientY: number): void {
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

function chartPopupTotalLine(label: string, value: string): string {
  return `
    <div class="chart-popup-line chart-popup-total">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function chartPopupSection(title: string, lines: string[]): string {
  return `
    <div class="chart-popup-section">
      <div class="chart-popup-section-title">${escapeHtml(title)}</div>
      ${lines.join("")}
    </div>
  `;
}

export function configureRenderRuntime(): void {
  Object.assign(runtimeApi, {
    renderCalculations,
    renderAccountYearTables,
    renderReserveChartPopup,
    buildReserveChartModel,
    reservePieChart,
    reservePieSegments,
    reservePieBackground,
    reservePieField,
    reserveChartInsight,
    positionChartPopup,
    chartPopupLine,
    chartPopupTotalLine,
    chartPopupSection
  });
}
