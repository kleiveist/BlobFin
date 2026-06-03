import { describe, expect, it } from "vitest";

import { defaultStatutoryPensionSettings } from "../data/defaults";
import {
  buildStatutoryPensionModel,
  statutoryPensionTaxableSharePercent,
  statutoryPensionContributionYears
} from "../domain/statutoryPension";
import { emptyIncomeTaxAdjustment, emptyIncomeTaxDeductionItems } from "../domain/incomeTracker";
import type { IncomeTrackerState, IncomeYearEntry } from "../types";
import { renderAppShell } from "../views/templates";
import {
  renderStatutoryPensionHtml,
  renderStatutoryPensionProjectionYearPopupHtml,
  renderStatutoryPensionTaxPopupHtml,
  renderStatutoryPensionYearPopupHtml
} from "../views/statutoryPensionView";

function yearlyEntry(overrides: Partial<IncomeYearEntry> = {}): IncomeYearEntry {
  return {
    id: "income-2026",
    active: true,
    visible: true,
    year: 2026,
    label: "salary",
    person: "household",
    annualNetIncome: null,
    annualGrossIncome: 55400,
    taxesAndDeductions: null,
    taxDeductionItems: emptyIncomeTaxDeductionItems(),
    taxAdjustment: emptyIncomeTaxAdjustment(),
    capitalGainsAllowance: null,
    capitalGainsChurchTaxEnabled: false,
    capitalGainsChurchTaxRatePercent: 9,
    employer: "",
    note: "",
    source: "annual_statement",
    ...overrides
  };
}

function tracker(entries: IncomeYearEntry[]): IncomeTrackerState {
  return {
    yearlyEntries: entries,
    milestones: [],
    settings: {
      activeInputTab: "yearly",
      projectionMode: "off",
      manualGrowthRatePercent: null,
      savingsSharePercent: null,
      selectedYearlyLabels: []
    }
  };
}

function count(value: string, needle: string): number {
  return value.split(needle).length - 1;
}

describe("statutory pension model", () => {
  it("sums employee and employer pension contributions", () => {
    const settings = defaultStatutoryPensionSettings();
    const model = buildStatutoryPensionModel({
      tracker: tracker([
        yearlyEntry({
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 5152.2,
            employerPensionInsurance: 5152.2
          }
        })
      ]),
      settings,
      currentYear: 2026,
      birthYear: 1990
    });

    expect(model.employeeContributionTotal).toBe(5152.2);
    expect(model.employerContributionTotal).toBe(5152.2);
    expect(model.totalContribution).toBe(10304.4);
  });

  it("calculates gross income and pension points from contributions", () => {
    const settings = defaultStatutoryPensionSettings();
    const [year] = statutoryPensionContributionYears(
      [
        yearlyEntry({
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 5152.2,
            employerPensionInsurance: 5152.2
          }
        })
      ],
      settings
    );

    expect(year.relevantGrossIncome).toBeCloseTo(55400, 2);
    expect(year.pensionPoints).toBeCloseTo(1.0665, 4);
  });

  it("ignores inactive entries but includes entries hidden from charts", () => {
    const settings = defaultStatutoryPensionSettings();
    const years = statutoryPensionContributionYears(
      [
        yearlyEntry({
          id: "visible",
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 100,
            employerPensionInsurance: 100
          }
        }),
        yearlyEntry({
          id: "hidden",
          visible: false,
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 50,
            employerPensionInsurance: 50
          }
        }),
        yearlyEntry({
          id: "inactive",
          active: false,
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 500,
            employerPensionInsurance: 500
          }
        })
      ],
      settings
    );

    expect(years[0].totalContribution).toBe(300);
  });

  it("does not derive pension contributions from capital gains entries", () => {
    const settings = defaultStatutoryPensionSettings();
    const years = statutoryPensionContributionYears(
      [
        yearlyEntry({
          label: "dividends",
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 500,
            employerPensionInsurance: 500
          }
        })
      ],
      settings
    );

    expect(years).toEqual([]);
  });

  it("builds three fixed scenarios and falls back when income projection is unavailable", () => {
    const model = buildStatutoryPensionModel({
      tracker: tracker([
        yearlyEntry({
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 5152.2,
            employerPensionInsurance: 5152.2
          }
        })
      ]),
      settings: defaultStatutoryPensionSettings(),
      currentYear: 2026,
      birthYear: 1990
    });

    expect(model.scenarios.map((scenario) => scenario.id)).toEqual(["pessimistic", "base", "optimistic"]);
    expect(model.scenarios[1].fallbackToConstantIncome).toBe(true);
  });

  it("uses the planned deduction defaults for all scenarios", () => {
    const settings = defaultStatutoryPensionSettings();

    expect(settings.scenarios.optimistic.taxRatePercent).toBe(7.52);
    expect(settings.scenarios.optimistic.healthInsurancePercent).toBe(8.75);
    expect(settings.scenarios.optimistic.careInsurancePercent).toBe(4.2);
    expect(settings.scenarios.base.taxRatePercent).toBe(9.52);
    expect(settings.scenarios.base.healthInsurancePercent).toBe(10.75);
    expect(settings.scenarios.base.careInsurancePercent).toBe(6.2);
    expect(settings.scenarios.pessimistic.taxRatePercent).toBe(12.52);
    expect(settings.scenarios.pessimistic.healthInsurancePercent).toBe(13.75);
    expect(settings.scenarios.pessimistic.careInsurancePercent).toBe(9.2);
  });

  it("calculates the taxable pension share by retirement year", () => {
    expect(statutoryPensionTaxableSharePercent(2026)).toBe(84);
    expect(statutoryPensionTaxableSharePercent(2058)).toBe(100);
    expect(statutoryPensionTaxableSharePercent(2063)).toBe(100);
  });

  it("calculates scenario tax, health, care and net monthly pension", () => {
    const settings = defaultStatutoryPensionSettings();
    settings.scenarios.pessimistic = {
      ...settings.scenarios.pessimistic,
      retirementAge: 67,
      taxRatePercent: 20,
      healthInsurancePercent: 10,
      careInsurancePercent: 5
    };
    const model = buildStatutoryPensionModel({
      tracker: tracker([
        yearlyEntry({
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 5152.2,
            employerPensionInsurance: 5152.2
          }
        })
      ]),
      settings,
      currentYear: 2058,
      birthYear: 1991
    });
    const scenario = model.scenarios.find((item) => item.id === "pessimistic")!;

    expect(scenario.taxableSharePercent).toBe(100);
    expect(scenario.taxRatePercent).toBe(15);
    expect(scenario.grossMonthlyPension).toBeCloseTo(scenario.projectedMonthlyPension, 2);
    expect(scenario.incomeTaxMonthly).toBeCloseTo(scenario.grossMonthlyPension * 0.15, 2);
    expect(scenario.healthInsuranceMonthly).toBeCloseTo(scenario.grossMonthlyPension * 0.1, 2);
    expect(scenario.careInsuranceMonthly).toBeCloseTo(scenario.grossMonthlyPension * 0.05, 2);
    expect(scenario.netMonthlyPension).toBeCloseTo(
      scenario.grossMonthlyPension -
        scenario.incomeTaxMonthly -
        scenario.healthInsuranceMonthly -
        scenario.careInsuranceMonthly,
      2
    );
  });

  it("calculates annual pension years from active contribution years with base deductions", () => {
    const settings = defaultStatutoryPensionSettings();
    settings.contributionRatePercent = 20;
    settings.averageAnnualIncome = 50000;
    settings.projectionPensionValue = 50;
    settings.annualContributionCeilingGross = 100000;
    settings.scenarios.base = {
      ...settings.scenarios.base,
      retirementAge: 67,
      taxRatePercent: 20,
      healthInsurancePercent: 10,
      careInsurancePercent: 5
    };

    const model = buildStatutoryPensionModel({
      tracker: tracker([
        yearlyEntry({
          id: "inactive-2024",
          active: false,
          year: 2024,
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 5000,
            employerPensionInsurance: 5000
          }
        }),
        yearlyEntry({
          id: "capital-2025",
          label: "dividends",
          year: 2025,
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 5000,
            employerPensionInsurance: 5000
          }
        }),
        yearlyEntry({
          id: "first-rv-2026",
          year: 2026,
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 5000,
            employerPensionInsurance: 5000
          }
        }),
        yearlyEntry({
          id: "second-rv-2028",
          year: 2028,
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 2500,
            employerPensionInsurance: 2500
          }
        })
      ]),
      settings,
      currentYear: 2060,
      birthYear: 1993
    });

    expect(model.annualPensionYears.map((year) => year.year)).toEqual([2026, 2028]);
    expect(model.annualPensionYears[0]).toMatchObject({
      employeeContribution: 5000,
      employerContribution: 5000,
      totalContribution: 10000,
      relevantGrossIncome: 50000,
      pensionPoints: 1,
      grossMonthlyPension: 50,
      taxableSharePercent: 100,
      incomeTaxMonthly: 7.5,
      healthInsuranceMonthly: 5,
      careInsuranceMonthly: 2.5,
      netMonthlyPension: 35
    });
    expect(model.annualPensionYears[1]).toMatchObject({
      relevantGrossIncome: 25000,
      pensionPoints: 0.5,
      grossMonthlyPension: 25,
      netMonthlyPension: 17.5
    });
  });

  it("projects annual pension scenario years from today through the latest retirement year", () => {
    const settings = defaultStatutoryPensionSettings();
    settings.contributionRatePercent = 20;
    settings.averageAnnualIncome = 50000;
    settings.projectionPensionValue = 50;
    settings.annualContributionCeilingGross = 100000;
    settings.scenarios.pessimistic = {
      ...settings.scenarios.pessimistic,
      retirementAge: 67,
      incomeMode: "constant",
      annualPensionIncreasePercent: 0.1
    };
    settings.scenarios.base = {
      ...settings.scenarios.base,
      retirementAge: 68,
      incomeMode: "income_projection",
      annualPensionIncreasePercent: 1
    };
    settings.scenarios.optimistic = {
      ...settings.scenarios.optimistic,
      retirementAge: 69,
      incomeMode: "income_projection",
      annualPensionIncreasePercent: 2
    };
    const incomeTracker = tracker([
      yearlyEntry({
        year: 2026,
        taxDeductionItems: {
          ...emptyIncomeTaxDeductionItems(),
          pensionInsurance: 5000,
          employerPensionInsurance: 5000
        }
      })
    ]);
    incomeTracker.settings.projectionMode = "manual";
    incomeTracker.settings.manualGrowthRatePercent = 2;

    const model = buildStatutoryPensionModel({
      tracker: incomeTracker,
      settings,
      currentYear: 2026,
      birthYear: 1960
    });

    expect(model.projectedAnnualPensionYears.map((year) => year.year)).toEqual([2026, 2027, 2028, 2029]);
    expect(model.projectedAnnualPensionYears[0].scenarios.base).toMatchObject({
      year: 2026,
      age: 66,
      yearsFromToday: 0,
      projectedGrossIncome: 50000,
      pensionPoints: 0,
      projectedAdditionalPoints: 0,
      projectedTotalPoints: 1,
      projectedPensionValue: 50,
      grossMonthlyPension: 50
    });
    expect(model.projectedAnnualPensionYears[1].scenarios.pessimistic.projectedGrossIncome).toBe(50000);
    expect(model.projectedAnnualPensionYears[1].scenarios.base).toMatchObject({
      projectedGrossIncome: 51000,
      employeeContribution: 5100,
      employerContribution: 5100,
      pensionPoints: 1.02,
      projectedAdditionalPoints: 1.02,
      projectedTotalPoints: 2.02,
      projectedPensionValue: 50.5
    });
    expect(model.projectedAnnualPensionYears[3].scenarios.pessimistic.afterRetirementYear).toBe(true);
    expect(model.projectedAnnualPensionYears[3].scenarios.optimistic.afterRetirementYear).toBe(false);
  });

  it("renders tax buttons, gross net legend and separated overlay bars", () => {
    const settings = defaultStatutoryPensionSettings();
    const model = buildStatutoryPensionModel({
      tracker: tracker([
        yearlyEntry({
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 5152.2,
            employerPensionInsurance: 5152.2
          }
        })
      ]),
      settings,
      currentYear: 2026,
      birthYear: 1990
    });
    const html = renderStatutoryPensionHtml(model, settings);

    expect(html).toContain('type="range"');
    expect(html).toContain('data-action="open-statutory-pension-tax-popup"');
    expect(html).toContain('data-statutory-pension-scenario="base"');
    expect(count(html, 'data-action="open-statutory-pension-tax-popup"')).toBe(3);
    expect(html).toContain("Steuerlast");
    expect(html).not.toContain("statutory-pension-scenario-results");
    expect(html).not.toContain('data-statutory-pension-scenario-field="taxRatePercent"');
    expect(html).not.toContain('data-statutory-pension-scenario-field="healthInsurancePercent"');
    expect(html).not.toContain('data-statutory-pension-scenario-field="careInsurancePercent"');
    expect(html).toContain("Monatsrente brutto");
    expect(html).toContain("Steuer:");
    expect(html).toContain("Krankenversicherung:");
    expect(html).toContain("Pflegeversicherung:");
    expect(html).toContain("Monatsrente netto");
    expect(html).toContain("Besteuerungsanteil");
    expect(html).toContain("statutory-pension-overlay-row");
    expect(html).toContain("statutory-pension-overlay-bar");
    expect(html).toContain("statutory-pension-overlay-net");
    expect(html).toContain("statutory-pension-overlay-gross");
    expect(html).toContain("statutory-pension-overlay-gross-label");
    expect(html).toContain("Netto-Rente nach Beitragsjahr");
    expect(html).toContain("statutory-pension-year-bar");
    expect(html).toContain('data-statutory-pension-year="2026"');
    expect(html).toContain('id="statutoryPensionYearPopup"');
    expect(html).toContain("Prognose von heute bis Rentenalter");
    expect(html).toContain("statutory-pension-projection-year-bar");
    expect(html).toContain('data-statutory-pension-projection-year="2026"');
    expect(html).toContain("statutory-pension-projection-fill optimistic");
    expect(html).toContain("statutory-pension-projection-fill base");
    expect(html).toContain("statutory-pension-projection-fill pessimistic");
    expect(html).toContain('id="statutoryPensionProjectionYearPopup"');
  });

  it("renders the tax popup host and popup sliders separately", () => {
    const settings = defaultStatutoryPensionSettings();
    const model = buildStatutoryPensionModel({
      tracker: tracker([
        yearlyEntry({
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 5152.2,
            employerPensionInsurance: 5152.2
          }
        })
      ]),
      settings,
      currentYear: 2026,
      birthYear: 1990
    });
    const popup = renderStatutoryPensionTaxPopupHtml(model, "base");

    expect(renderAppShell()).toContain('id="statutoryPensionTaxPopup"');
    expect(popup).toContain("Basis");
    expect(popup).toContain("Brutto-Monatsrente");
    expect(popup).toContain("Abzuege gesamt");
    expect(popup).toContain("Netto-Monatsrente");
    expect(popup).toContain("Einkommensteuer %");
    expect(popup).toContain("Pflegeversicherung kinderlos %");
    expect(popup).toContain('data-action="close-statutory-pension-tax-popup"');
    expect(count(popup, 'max="15"')).toBe(3);
    expect(popup).toContain('data-statutory-pension-scenario-field="taxRatePercent"');
    expect(popup).toContain('data-statutory-pension-scenario-field="healthInsurancePercent"');
    expect(popup).toContain('data-statutory-pension-scenario-field="careInsurancePercent"');
  });

  it("renders annual pension year popup details", () => {
    const settings = defaultStatutoryPensionSettings();
    const model = buildStatutoryPensionModel({
      tracker: tracker([
        yearlyEntry({
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 5152.2,
            employerPensionInsurance: 5152.2
          }
        })
      ]),
      settings,
      currentYear: 2026,
      birthYear: 1990
    });
    const popup = renderStatutoryPensionYearPopupHtml(model.annualPensionYears[0]);

    expect(popup).toContain("Beitragsjahr");
    expect(popup).toContain("Brutto");
    expect(popup).toContain("Netto");
    expect(popup).toContain("Besteuerungsanteil");
    expect(popup).toContain("Steuerbetrag");
    expect(popup).toContain("Krankenversicherung");
    expect(popup).toContain("Pflegeversicherung");
    expect(popup).toContain("Rentenpunkte");
    expect(popup).toContain("Arbeitnehmerbeitrag");
    expect(popup).toContain("Arbeitgeberbeitrag");
    expect(popup).toContain("rentenrelevantes Brutto");
    expect(popup).toContain('data-action="close-statutory-pension-year-popup"');
  });

  it("renders projected annual pension year popup details for all scenarios", () => {
    const settings = defaultStatutoryPensionSettings();
    const model = buildStatutoryPensionModel({
      tracker: tracker([
        yearlyEntry({
          taxDeductionItems: {
            ...emptyIncomeTaxDeductionItems(),
            pensionInsurance: 5152.2,
            employerPensionInsurance: 5152.2
          }
        })
      ]),
      settings,
      currentYear: 2026,
      birthYear: 1990
    });
    const popup = renderStatutoryPensionProjectionYearPopupHtml(model.projectedAnnualPensionYears[0]);

    expect(popup).toContain("Prognosejahr");
    expect(popup).toContain("Pessimistisch");
    expect(popup).toContain("Basis");
    expect(popup).toContain("Optimistisch");
    expect(popup).toContain("Brutto");
    expect(popup).toContain("Netto");
    expect(popup).toContain("Steuerbetrag");
    expect(popup).toContain("Punkte gesamt");
    expect(popup).toContain("Zusatzpunkte bis Jahr");
    expect(popup).toContain("Punkte dieses Jahr");
    expect(popup).toContain("Prognose-Brutto");
    expect(popup).toContain("Arbeitnehmerbeitrag");
    expect(popup).toContain("Arbeitgeberbeitrag");
    expect(popup).toContain("Rentenwert");
    expect(popup).toContain('data-action="close-statutory-pension-projection-popup"');
  });
});
