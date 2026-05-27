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
  propertyEquity: 88000,
  netPropertyWealth: 88000
};

const combinedYear: CombinedWealthYear = {
  year: 2026,
  cashValue: 10000,
  depotValue: 20000,
  withdrawalImpact: 0,
  redirectedCashRepayment: 0,
  redirectedDepotRepayment: 0,
  propertyValue: 300000,
  propertyDebt: 212000,
  propertyEquity: 88000,
  totalGrossAssets: 330000,
  totalDebt: 212000,
  totalNetWealth: 118000
};

describe("follow-up ui rendering", () => {
  it("does not render Grunddaten as a main module button", () => {
    const html = renderAppShell();

    expect(html).not.toContain('data-section-id="grunddaten"');
    expect(html).toContain("grunddatenSettingsContent");
  });

  it("renders the annual table account selector host", () => {
    const html = renderAppShell();

    expect(html).toContain('id="yearAccountSelector"');
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
    expect(html).not.toContain('data-real-estate-field="equityCapital"');
    expect(html).not.toContain('data-real-estate-field="loanAmount"');
    expect(html).not.toContain('data-real-estate-field="targetTermYears"');
    expect(html).not.toContain('data-real-estate-field="subsidyAmount"');
    expect(html).not.toContain('data-real-estate-field="remainingDebtAfterFixedInterest"');
    expect(count(html, 'data-real-estate-field="financingEndAge"')).toBe(1);
    expect(count(html, 'data-real-estate-field="plannedSaleYear"')).toBe(1);
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
    expect(count(html, 'data-real-estate-range="propertyValueGrowthPercent"')).toBe(0);
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
      points: [combinedYear],
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
    expect(`${repayment}${trend}${combined}`).not.toContain("wealth-bar-row");
  });

  it("sets the vertical chart column count for responsive fitting", () => {
    const chart = renderCombinedWealthChart({
      points: [combinedYear, { ...combinedYear, year: 2027 }],
      selectedYear: 2026,
      formatMoney: String
    });

    expect(chart).toContain('style="--wealth-chart-count:2;"');
  });

  it("exposes real estate popup segment labels", () => {
    const repaymentSegments = realEstateRepaymentSegments({
      point: realEstateYear,
      totalLoanCost: 240000,
      paidLoanCostToDate: paidLoanCostForYear(realEstateYear)
    });
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

  it("keeps the repayment chart scaled to the loan cost basis when debt grows", () => {
    const repayment = renderRealEstateRepaymentChart({
      points: [{ ...realEstateYear, loanEnd: 250000, interestDue: 12000 }],
      selectedYear: 2026,
      loanCostBasis: 240000,
      formatMoney: String
    });

    expect(repayment).toContain("240 Tsd. EUR");
    expect(repayment).toContain('wealth-column-overlay interest');
  });
});

function count(value: string, needle: string): number {
  return value.split(needle).length - 1;
}
