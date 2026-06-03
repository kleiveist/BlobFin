import { describe, expect, it } from "vitest";

import { renderAppShell } from "../views/templates";
import {
  paidLoanCostForYear,
  realEstatePopupHeading,
  realEstateRepaymentSegments,
  realEstateTrendSegments,
  renderCombinedWealthChart,
  renderCombinedWealthYearDetail,
  renderRealEstateRepaymentChart,
  renderRealEstateTrendChart
} from "../views/wealthCharts";
import type { CombinedWealthYear, RealEstateFinancingYear } from "../types";

const additionalBreakdown = {
  withdrawalGain: 0,
  depotSavingsRate: 0,
  legacySavingsRate: 0,
  netGain: 0,
  totalAdditionalRepayment: 0
};

const realEstateYear: RealEstateFinancingYear = {
  year: 2026,
  propertyValue: 300000,
  loanStart: 220000,
  interestPaid: 7000,
  interestDue: 7000,
  interestShortfall: 0,
  monthlyPaymentFromSavings: 12000,
  monthlyPaymentFromWithdrawalGain: 0,
  monthlyPaymentAvailable: 12000,
  principalFromMonthlyPayment: 8000,
  principalPaid: 8000,
  specialRepayment: 0,
  additionalRepayment: 0,
  additionalRepaymentBreakdown: additionalBreakdown,
  loanEnd: 212000,
  loanCostPaidToDate: 15000,
  loanCostRemaining: 225000,
  propertyEquity: 88000,
  netPropertyWealth: 88000
};

const combinedYear: CombinedWealthYear = {
  year: 2026,
  cashValue: 10000,
  depotValue: 20000,
  depotBreakdown: [{ id: "standard", label: "Depot", value: 20000 }],
  withdrawalImpact: 0,
  redirectedCashRepayment: 0,
  redirectedDepotRepayment: 0,
  pensionIncome: 0,
  pensionConsumed: 0,
  pensionConsumedValue: 0,
  pensionSaved: 0,
  pensionSavingsValue: 0,
  depotTaxValue: 0,
  pensionTaxValue: 0,
  taxValue: 0,
  cumulativeTaxValue: 0,
  propertyValue: 300000,
  propertyDebt: 212000,
  propertyLoanStart: 220000,
  propertyEquity: 88000,
  totalGrossAssets: 330000,
  totalDebt: 212000,
  totalNetWealth: 118000
};

describe("follow-up ui rendering", () => {
  it("renders a visual landing page with the four combined module entries", () => {
    const html = renderAppShell();

    expect(html).toContain('data-module-section="home"');
    expect(html).toContain('id="landingTitle"');
    expect(html).toContain("BlobFin");
    expect(html).not.toContain('data-module-section="income_overview"');
    expect(html).not.toContain('data-module-section="investment_overview"');
    expect(html).toContain('data-action="open-section-income"');
    expect(html).toContain('data-action="open-section-planning_scenarios"');
    expect(html).toContain('data-action="open-section-real_estate_financing"');
    expect(html).toContain('data-action="open-section-combined_wealth"');
    expect(html).toContain('data-action="open-section-statutory_pension"');
    expect(html).not.toContain('data-action="open-section-income_tracking"');
    expect(html).not.toContain('data-action="open-section-income_status"');
    expect(html).not.toContain('data-action="open-section-income_charts"');
    expect(html).not.toContain('data-action="open-section-cost_reserve_positions"');
    expect(html).not.toContain('data-action="open-section-year_table"');
    expect(html).not.toContain('data-action="open-section-investment_planning"');
    expect(count(html, 'class="overview-card module-overview-card"')).toBe(5);
    expect(html.indexOf("Jahresnettoeinkommen")).toBeLessThan(html.indexOf("Gesetzliche Rente"));
    expect(html.indexOf("Gesetzliche Rente")).toBeLessThan(html.indexOf("Planungen und Szenarien"));
    expect(html).toContain("Jahresnettoeinkommen");
    expect(html).toContain("Planungen und Szenarien");
    expect(html).toContain("Immobilien");
    expect(html).toContain("Vermoegen");
    expect(html).toContain("Vermoegen oeffnen");
    expect(html).toContain("Gesetzliche Rente");
    expect(html).toContain("Rente oeffnen");
    expect(html).not.toContain("Vermoegen und Altersvorsorge");
    expect(html).not.toContain("Vorsorge oeffnen");
  });

  it("structures income as one combined page with insights before status", () => {
    const html = renderAppShell();
    const insightsIndex = html.indexOf('id="incomeInsightsSection"');
    const statusIndex = html.indexOf('id="incomeStatusSection"');

    expect(html).not.toContain('data-action="scroll-income-section"');
    expect(count(html, 'data-module-section="income"')).toBeGreaterThanOrEqual(3);
    expect(html).not.toContain('data-module-section="income_status"');
    expect(html).not.toContain('data-module-section="income_charts"');
    expect(html).not.toContain('data-module-section="income_tracking"');
    expect(html).toContain('id="incomeTrackerInput"');
    expect(html).toContain('id="incomeChartsSection"');
    expect(html).toContain("Jahresnettoeinkommen-Grafiken");
    expect(insightsIndex).toBeGreaterThan(-1);
    expect(statusIndex).toBeGreaterThan(-1);
    expect(insightsIndex).toBeLessThan(statusIndex);
  });

  it("structures planning as one combined page", () => {
    const html = renderAppShell();

    expect(count(html, 'data-module-section="planning_scenarios"')).toBeGreaterThanOrEqual(3);
    expect(html).not.toContain('data-module-section="cost_reserve_positions"');
    expect(html).not.toContain('data-module-section="year_table"');
    expect(html).not.toContain('data-module-section="investment_planning"');
    expect(html).toContain("Kosten- und Ruecklagenpositionen");
    expect(html).toContain("Jahrestabellen pro Konto");
    expect(html).toContain("Investment- und Auszahlungsplanung");
  });

  it("renders statutory pension as its own page outside combined wealth", () => {
    const html = renderAppShell();
    const statutoryPageIndex = html.indexOf('data-module-section="statutory_pension"');
    const pensionIndex = html.indexOf('id="statutoryPensionSection"');
    const combinedIndex = html.indexOf('data-module-section="combined_wealth"');
    const accountsIndex = html.indexOf("Cash aus Konto");
    const modulesIndex = html.indexOf("Vermoegensmodule");
    const chartIndex = html.indexOf('id="combinedWealthChart"');

    expect(statutoryPageIndex).toBeGreaterThan(-1);
    expect(pensionIndex).toBeGreaterThan(-1);
    expect(combinedIndex).toBeGreaterThan(-1);
    expect(accountsIndex).toBeGreaterThan(-1);
    expect(modulesIndex).toBeGreaterThan(-1);
    expect(chartIndex).toBeGreaterThan(-1);
    expect(statutoryPageIndex).toBeLessThan(pensionIndex);
    expect(pensionIndex).toBeLessThan(combinedIndex);
    expect(combinedIndex).toBeLessThan(accountsIndex);
    expect(combinedIndex).toBeLessThan(modulesIndex);
    expect(combinedIndex).toBeLessThan(chartIndex);
    expect(html).toContain("Gesetzliche Rente");
    expect(html).toContain("Pessimistisch");
    expect(html).toContain("Basis");
    expect(html).toContain("Optimistisch");
  });

  it("renders the world graphic action inside the combined income page", () => {
    const html = renderAppShell();

    expect(count(html, 'data-action="income-open-analysis"')).toBe(1);
    expect(html).toContain("Weltgrafik");
  });

  it("does not render Grunddaten as a main module button", () => {
    const html = renderAppShell();

    expect(html).not.toContain('data-section-id="grunddaten"');
    expect(html).toContain("grunddatenSettingsContent");
  });

  it("renders the start page base data popup and read-only investment end date", () => {
    const html = renderAppShell();

    expect(html).toContain('data-action="open-base-data-popup"');
    expect(html).toContain('id="baseDataPopup"');
    expect(html).toContain('data-action="close-base-data-popup"');
    expect(count(html, 'data-setting="year"')).toBeGreaterThanOrEqual(2);
    expect(count(html, 'data-setting="interestRatePercent"')).toBeGreaterThanOrEqual(2);
    expect(count(html, 'data-setting="cashbackRatePercent"')).toBeGreaterThanOrEqual(2);
    expect(count(html, 'data-setting="endDate"')).toBeGreaterThanOrEqual(3);
    expect(html).toContain('id="investmentEndDate"');
    expect(html).toContain('data-force-disabled="true"');
    expect(html).not.toContain('data-investment="payoutEndAge"');
  });

  it("renders the position cadence switch host in the cost reserve section", () => {
    const html = renderAppShell();

    expect(html).toContain('id="positionCadenceSwitchHost"');
    expect(html).toContain('data-action="show-expense-positions"');
    expect(html).not.toContain('id="expenseSubmodeSwitchHost"');
    expect(html).not.toContain('data-action="show-expense-regular"');
    expect(html).not.toContain('data-action="show-expense-once"');
  });

  it("renders the annual table account selector host", () => {
    const html = renderAppShell();

    expect(html).toContain('id="yearAccountSelector"');
    expect(html).toContain('id="investmentAccountSelector"');
    expect(html).toContain('id="realEstateAccountSelector"');
    expect(html).not.toContain('id="realEstateWithdrawalAccountSelector"');
    expect(html).toContain("Konten fuer Sparquellen und Entnahme-Zugewinn");
    expect(html).toContain('class="real-estate-locale-default"');
    expect(html).not.toContain('data-action="set-real-estate-locale-en"');
    expect(html).toContain('id="combinedCashAccountSelector"');
    expect(html).toContain('id="combinedLeadInvestmentAccountSelector"');
    expect(html).toContain('id="combinedDepotSelector"');
    expect(html).toContain('id="combinedPensionScenarioSelector"');
    expect(html).toContain('id="combinedWealthLifeSummary"');
    expect(html).toContain("Kombi-Leitkonto");
    expect(html).toContain('id="accountYearTableOverview"');
    expect(html).not.toContain('id="resultHead"');
  });

  it("does not render the top Ergebnis metric panel", () => {
    const html = renderAppShell();

    expect(html).not.toContain('class="panel summary-panel"');
    expect(html).not.toContain('id="maxNeeded"');
    expect(html).not.toContain('id="investmentNetWealthTop"');
    expect(html).not.toContain("Max. benoetigter Kontostand");
    expect(html).not.toContain("Vermoegen fuer Auszahlung");
  });

  it("renders real estate assumption fields as one control each", () => {
    const html = renderAppShell();

    expect(html).not.toContain("Strategie und Annahmen");
    expect(count(html, 'data-real-estate-field="purchaseActivated"')).toBe(1);
    expect(html).toContain("Immobilie gekauft / Kauf geplant");
    expect(html).toContain('id="combinedRealEstateActivationMetric"');
    expect(html).not.toContain('data-real-estate-field="equityCapital"');
    expect(html).not.toContain('data-real-estate-field="loanAmount"');
    expect(html).not.toContain('data-real-estate-field="targetTermYears"');
    expect(html).not.toContain('data-real-estate-field="subsidyAmount"');
    expect(html).not.toContain('data-real-estate-field="remainingDebtAfterFixedInterest"');
    expect(count(html, 'data-real-estate-field="financingEndAge"')).toBe(0);
    expect(count(html, 'data-real-estate-field="plannedSaleYear"')).toBe(1);
    expect(html).toContain('id="realEstateCalculatedEndAgeMetric"');
    expect(html).toContain("Bezahlt bis Alter");
    expect(count(html, 'data-real-estate-field="interestRatePercent"')).toBe(0);
    expect(count(html, 'data-real-estate-range="interestRatePercent"')).toBe(1);
    expect(count(html, 'data-real-estate-field="monthlyPayment"')).toBe(0);
    expect(count(html, 'data-real-estate-range="monthlyPayment"')).toBe(0);
    expect(count(html, 'data-real-estate-range="initialRepaymentPercent"')).toBe(0);
    expect(count(html, 'data-real-estate-range="specialRepaymentAmount"')).toBe(0);
    expect(html).toContain('id="realEstateEquityCapitalSourceList"');
    expect(html).toContain('id="realEstateMonthlyPaymentSourceList"');
    expect(html).toContain('id="realEstateSpecialRepaymentSourceList"');
    expect(html).toContain('data-action="toggle-real-estate-depot-savings-rate-source"');
    expect(html).toContain('data-action="toggle-combined-module"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).not.toContain('type="checkbox" data-combined-toggle');
    expect(html).not.toContain('id="realEstateLoanMetric"');
    expect(html).not.toContain('id="realEstateMonthlyRateMetric"');
    expect(html).not.toContain('id="realEstatePropertyValueMetric"');
    expect(html).not.toContain('id="realEstatePropertyEquityMetric"');
    expect(count(html, 'data-real-estate-field="propertyValueGrowthPercent"')).toBe(0);
    expect(count(html, 'data-real-estate-range="propertyValueGrowthPercent"')).toBe(1);
    expect(html).toContain("Immobilienwertzuwachs in % pro Jahr");
    expect(count(html, 'data-real-estate-field="inflationRatePercent"')).toBe(0);
    expect(count(html, 'data-real-estate-range="inflationRatePercent"')).toBe(0);
    expect(html).toContain('id="realEstateChartPopup"');
    expect(html).not.toContain('id="realEstateYearDetail"');
  });

  it("renders wealth charts as vertical column charts", () => {
    const repayment = renderRealEstateRepaymentChart({
      points: [realEstateYear],
      selectedYear: 2026,
      loanCostBasis: 240000,
      financingEndYear: 2026,
      formatMoney: String
    });
    const trend = renderRealEstateTrendChart({
      points: [realEstateYear],
      selectedYear: 2026,
      financingEndYear: 2026,
      formatMoney: String
    });
    const combined = renderCombinedWealthChart({
      points: [{
        ...combinedYear,
        pensionIncome: 12000,
        pensionConsumed: 12000,
        pensionConsumedValue: 24000,
        taxValue: 900,
        cumulativeTaxValue: 1800
      }],
      selectedYear: 2026,
      formatMoney: String
    });

    expect(repayment).toContain("wealth-vertical-chart");
    expect(repayment).toContain("Darlehensbetrag inkl. Zinsen, Tilgung und Zinsen je Jahr");
    expect(repayment).toContain('data-chart-kind="repayment"');
    expect(repayment).toContain('style="--wealth-chart-count:1;"');
    expect(repayment).toContain("240 Tsd. EUR");
    expect(repayment).toContain('data-financing-end="true"');
    expect(repayment).toContain("financing-end");
    expect(trend).toContain("wealth-vertical-chart");
    expect(trend).toContain('data-chart-kind="trend"');
    expect(trend).toContain('data-financing-end="true"');
    expect(combined).toContain("wealth-vertical-chart");
    expect(combined).toContain("Verbrauchte Rente");
    expect(combined).toContain("wealth-column-segment pension-consumed");
    expect(combined).toContain("Verbrauchte Rente kumuliert");
    expect(combined).toContain('data-action="toggle-combined-wealth-line"');
    expect(combined).toContain('data-combined-wealth-line="pensionConsumedCumulative"');
    expect(combined).toContain("wealth-line-overlay pension-consumed-cumulative");
    expect(combined).toContain("Steuern");
    expect(combined).toContain("wealth-column-segment tax");
    expect(combined).toContain("Steuern kumuliert");
    expect(combined).toContain('data-combined-wealth-line="taxCumulative"');
    expect(combined).toContain("wealth-line-overlay tax-cumulative");
    expect(combined).not.toContain("legend-dot pension-consumed-cumulative");
    expect(combined).not.toContain("legend-dot tax-cumulative");
    expect(combined).toContain("Immobilien-Eigenkapital");
    expect(combined).toContain("Immobilienschuld");
    expect(combined).toContain("Nettovermoegen");
    expect(combined).toContain("wealth-column-segment equity");
    expect(combined).toContain("wealth-line-overlay property");
    expect(combined).toContain("wealth-line-overlay debt");
    expect(combined).toContain("Immobilienwert brutto");
    expect(combined).not.toContain("wealth-column-segment property");
    expect(combined.indexOf("wealth-column-segment equity")).toBeLessThan(
      combined.indexOf("wealth-column-segment cash")
    );
    expect(`${repayment}${trend}${combined}`).not.toContain("wealth-bar-row");
  });

  it("can render the combined wealth chart with cumulative lines switched off", () => {
    const chart = renderCombinedWealthChart({
      points: [{ ...combinedYear, pensionConsumedValue: 24000, cumulativeTaxValue: 1800 }],
      selectedYear: 2026,
      lineVisibility: {
        pensionConsumedCumulative: false,
        taxCumulative: false
      },
      formatMoney: String
    });

    expect(chart).toContain('aria-pressed="false"');
    expect(chart).not.toContain("wealth-line-overlay pension-consumed-cumulative");
    expect(chart).not.toContain("wealth-line-overlay tax-cumulative");
  });

  it("sets the vertical chart column count for responsive fitting", () => {
    const chart = renderCombinedWealthChart({
      points: [combinedYear, { ...combinedYear, year: 2027 }],
      selectedYear: 2026,
      formatMoney: String
    });

    expect(chart).toContain('style="--wealth-chart-count:2;"');
  });

  it("renders the combined wealth chart with section header values and 15-year ticks", () => {
    const points: CombinedWealthYear[] = Array.from({ length: 33 }, (_, index) => ({
      ...combinedYear,
      year: 2026 + index,
      cashValue: 10000 + index * 100,
      depotValue: 20000 + index * 200,
      propertyValue: 300000 + index * 1000,
      totalGrossAssets: 330000 + index * 1300
    }));
    const chart = renderCombinedWealthChart({
      points,
      selectedYear: 2029,
      formatMoney: (value) => `${value} EUR`
    });
    const compact = chart.replace(/\s+/g, " ");

    expect(chart).toContain("combined-wealth-summary");
    expect(chart).toContain("combined-wealth-summary-label");
    expect(compact).toContain('class="combined-wealth-summary-label">Cash</span>');
    expect(compact).toContain('class="combined-wealth-summary-value">10300 EUR</strong>');
    expect(compact).toContain('class="combined-wealth-summary-value">20600 EUR</strong>');
    expect(compact).toContain('class="combined-wealth-summary-label">Nettovermoegen</span>');
    expect(compact).not.toContain('class="combined-wealth-summary-label">Immobilienwert</span>');
    expect(chart).toContain("wealth-line-overlay property");
    expect(chart).toContain("Immobilienwert brutto");
    expect(chart).not.toContain("wealth-column-value");
    expect(chart).not.toContain("wealth-column-year");
    expect(chart).not.toContain('class="wealth-x-axis"');
    expect(chart).toContain("combined-wealth-ticks");
    expect(count(chart, "combined-wealth-tick visible")).toBe(3);
    expect(compact).toContain('class="combined-wealth-tick visible"> 2026 </span>');
    expect(compact).toContain('class="combined-wealth-tick visible"> 2041 </span>');
    expect(compact).toContain('class="combined-wealth-tick visible"> 2056 </span>');
    expect(compact).not.toContain('class="combined-wealth-tick visible"> 2058 </span>');
    expect(count(chart, 'data-action="select-combined-wealth-year"')).toBe(33);
  });

  it("exposes real estate popup segment labels", () => {
    const repaymentSegments = realEstateRepaymentSegments({ point: realEstateYear, totalLoanCost: 240000 });
    const repaymentLabels = repaymentSegments.map((segment) => segment.label);
    const trendLabels = realEstateTrendSegments(realEstateYear, realEstateYear.propertyValue).map(
      (segment) => segment.label
    );

    expect(repaymentLabels).toEqual(["Darlehensbetrag inkl. Zinsen offen", "Getilgter Kreditanteil", "Zinsen"]);
    expect(repaymentLabels).not.toContain("Restschuld");
    expect(repaymentSegments.find((segment) => segment.label === "Darlehensbetrag inkl. Zinsen offen")?.value).toBe(
      225000
    );
    expect(repaymentSegments.find((segment) => segment.label === "Getilgter Kreditanteil")?.value).toBe(15000);
    expect(trendLabels).toEqual(["Ausgangswert", "Wertentwicklung"]);
    expect([...repaymentLabels, "Darlehensbetrag inkl. Zinsen", ...trendLabels, "Immobilienwert"]).toContain(
      "Darlehensbetrag inkl. Zinsen"
    );
  });

  it("adds yearly interest and principal to the paid loan cost", () => {
    expect(paidLoanCostForYear(realEstateYear)).toBe(15000);
  });

  it("does not leave an open loan cost when the calculated loan cost is fully repaid", () => {
    const repaymentSegments = realEstateRepaymentSegments({
      point: { ...realEstateYear, loanEnd: 0, loanCostPaidToDate: 240000, loanCostRemaining: 0 },
      totalLoanCost: 240000
    });

    expect(repaymentSegments.find((segment) => segment.label === "Darlehensbetrag inkl. Zinsen offen")?.value).toBe(0);
    expect(repaymentSegments.find((segment) => segment.label === "Getilgter Kreditanteil")?.value).toBe(240000);
  });

  it("uses the calculated open loan cost without a debt-zero override", () => {
    const repaymentSegments = realEstateRepaymentSegments({
      point: { ...realEstateYear, loanEnd: 0, loanCostPaidToDate: 15000, loanCostRemaining: 225000 },
      totalLoanCost: 240000
    });

    expect(repaymentSegments.find((segment) => segment.label === "Darlehensbetrag inkl. Zinsen offen")?.value).toBe(
      225000
    );
    expect(repaymentSegments.find((segment) => segment.label === "Getilgter Kreditanteil")?.value).toBe(15000);
  });

  it("formats real estate popup headings with age and year", () => {
    expect(realEstatePopupHeading(45, 2026)).toBe("Alter 45 | Jahr 2026");
  });

  it("renders combined inheritance from the final chart year", () => {
    const detail = renderCombinedWealthYearDetail({
      selected: combinedYear,
      finalYear: { ...combinedYear, year: 2028, totalNetWealth: 155000 },
      formatMoney: (value) => `${value} EUR`,
      formatInt: String
    });

    expect(detail).toContain("Erbe an Nachkommen");
    expect(detail).toContain("155000 EUR");
  });

  it("renders an empty real estate repayment chart without a start loan", () => {
    const repayment = renderRealEstateRepaymentChart({
      points: [{ ...realEstateYear, loanStart: 0, loanEnd: 0, principalPaid: 0, netPropertyWealth: 300000 }],
      selectedYear: 2026,
      formatMoney: String
    });

    expect(repayment).toContain("Noch kein Start-Kreditvolumen");
    expect(repayment).not.toContain("wealth-column-segment equity");
  });

  it("scales the repayment chart above the loan cost basis when real debt grows", () => {
    const repayment = renderRealEstateRepaymentChart({
      points: [{ ...realEstateYear, loanEnd: 250000, interestDue: 12000, loanCostRemaining: 225000 }],
      selectedYear: 2026,
      loanCostBasis: 240000,
      formatMoney: String
    });

    expect(repayment).toContain("250 Tsd. EUR");
    expect(repayment).toContain('wealth-column-overlay interest');
  });
});

function count(value: string, needle: string): number {
  return value.split(needle).length - 1;
}
