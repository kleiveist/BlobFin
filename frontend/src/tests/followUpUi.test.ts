import { describe, expect, it } from "vitest";

import { renderAppShell } from "../views/templates";
import {
  renderCombinedWealthChart,
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
  });

  it("renders real estate assumption fields as one control each", () => {
    const html = renderAppShell();

    expect(count(html, 'data-real-estate-field="interestRatePercent"')).toBe(0);
    expect(count(html, 'data-real-estate-range="interestRatePercent"')).toBe(1);
    expect(count(html, 'data-real-estate-field="monthlyPayment"')).toBe(0);
    expect(count(html, 'data-real-estate-range="monthlyPayment"')).toBe(1);
  });

  it("renders wealth charts as vertical column charts", () => {
    const repayment = renderRealEstateRepaymentChart({
      points: [realEstateYear],
      selectedYear: 2026,
      formatMoney: String
    });
    const trend = renderRealEstateTrendChart({
      points: [realEstateYear],
      selectedYear: 2026,
      formatMoney: String
    });
    const combined = renderCombinedWealthChart({
      points: [combinedYear],
      selectedYear: 2026,
      formatMoney: String
    });

    expect(repayment).toContain("wealth-vertical-chart");
    expect(trend).toContain("wealth-vertical-chart");
    expect(combined).toContain("wealth-vertical-chart");
    expect(`${repayment}${trend}${combined}`).not.toContain("wealth-bar-row");
  });
});

function count(value: string, needle: string): number {
  return value.split(needle).length - 1;
}
