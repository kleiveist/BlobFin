import type {
  AdditionalRepaymentBreakdown,
  AdditionalRepaymentYearBreakdown,
  RealEstateFinancingMonth,
  RealEstateFinancingResult,
  RealEstateFinancingSettings,
  RealEstateFinancingYear,
  RepaymentSourceValues
} from "../types";

const MAX_FINANCING_YEARS = 80;

export function validateRealEstateSettings(settings: RealEstateFinancingSettings): string[] {
  const errors: string[] = [];
  if (settings.purchasePrice <= 0) errors.push("Kaufpreis muss groesser als 0 sein.");
  if (settings.interestRatePercent < 0) errors.push("Zinssatz darf nicht negativ sein.");
  if (settings.initialRepaymentPercent < 0) errors.push("Anfangstilgung darf nicht negativ sein.");
  if (settings.monthlyPayment < 0) errors.push("Monatsrate darf nicht negativ sein.");
  if (settings.specialRepaymentAmount < 0) errors.push("Sondertilgung darf nicht negativ sein.");
  if (settings.propertyValueGrowthPercent < 0) errors.push("Immobilienwertsteigerung darf nicht negativ sein.");
  if (settings.equityCapital < 0) errors.push("Eigenkapital darf nicht negativ sein.");
  if (settings.loanAmount < 0) errors.push("Darlehensbetrag darf nicht negativ sein.");
  if (settings.financingStartAge < 0) errors.push("Finanzierung ab Alter darf nicht negativ sein.");
  if (settings.financingYears <= 0 && settings.targetTermYears <= 0) {
    errors.push("Finanzierungszeitraum oder Ziel-Laufzeit muss groesser als 0 sein.");
  }
  if (settings.maxMonthlyBurden > 0 && settings.targetMonthlyBurden > settings.maxMonthlyBurden) {
    errors.push("Ziel-Monatsbelastung darf die maximale Monatsbelastung nicht ueberschreiten.");
  }
  return errors;
}

export function totalProjectCost(settings: RealEstateFinancingSettings): number {
  return roundMoney(
    settings.purchasePrice +
      settings.constructionOrRenovationCosts +
      settings.landCosts +
      settings.additionalPurchaseCosts +
      settings.notaryCosts +
      settings.landRegistryCosts +
      settings.brokerCosts +
      settings.transferTax +
      settings.modernizationReserve +
      settings.movingAndSetupCosts +
      settings.safetyBuffer
  );
}

export function deriveLoanAmount(settings: RealEstateFinancingSettings): number {
  if (settings.loanAmount > 0) return roundMoney(settings.loanAmount);
  return roundMoney(Math.max(0, totalProjectCost(settings) - settings.equityCapital - settings.subsidyAmount));
}

export function deriveMonthlyPayment(settings: RealEstateFinancingSettings, loanAmount: number): number {
  if (settings.monthlyPayment > 0) return roundMoney(settings.monthlyPayment);
  const annualRatePercent = Math.max(0, settings.interestRatePercent + settings.initialRepaymentPercent);
  return roundMoney((loanAmount * annualRatePercent) / 100 / 12);
}

const RATE_LINKED_MONTHLY_PAYMENT_FIELDS = new Set<keyof RealEstateFinancingSettings>([
  "purchasePrice",
  "constructionOrRenovationCosts",
  "landCosts",
  "additionalPurchaseCosts",
  "notaryCosts",
  "landRegistryCosts",
  "brokerCosts",
  "transferTax",
  "modernizationReserve",
  "movingAndSetupCosts",
  "safetyBuffer",
  "equityCapital",
  "loanAmount",
  "interestRatePercent",
  "initialRepaymentPercent",
  "subsidyAmount"
]);

export function deriveRateLinkedMonthlyPayment(settings: RealEstateFinancingSettings): number {
  const loanAmount = deriveLoanAmount(settings);
  const annualRatePercent = Math.max(0, settings.interestRatePercent + settings.initialRepaymentPercent);
  return roundMoney((loanAmount * annualRatePercent) / 100 / 12);
}

export function deriveInitialRepaymentPercentFromMonthlyPayment(settings: RealEstateFinancingSettings): number {
  const loanAmount = deriveLoanAmount(settings);
  if (loanAmount <= 0 || settings.monthlyPayment <= 0) return 0;
  const totalAnnualRatePercent = (settings.monthlyPayment * 12 / loanAmount) * 100;
  return roundMoney(Math.max(0, totalAnnualRatePercent - settings.interestRatePercent));
}

export function linkRealEstateFinancingInput(
  settings: RealEstateFinancingSettings,
  changedField: keyof RealEstateFinancingSettings
): RealEstateFinancingSettings {
  if (changedField === "monthlyPayment") {
    return {
      ...settings,
      initialRepaymentPercent: deriveInitialRepaymentPercentFromMonthlyPayment(settings)
    };
  }

  if (RATE_LINKED_MONTHLY_PAYMENT_FIELDS.has(changedField)) {
    return {
      ...settings,
      monthlyPayment: deriveRateLinkedMonthlyPayment(settings)
    };
  }

  return settings;
}

export function calculateRealEstateFinancing(
  startYear: number,
  settings: RealEstateFinancingSettings,
  repaymentSourceValues: RepaymentSourceValues = emptyRepaymentSourceValues()
): RealEstateFinancingResult {
  const validationErrors = validateRealEstateSettings(settings);
  const projectCost = totalProjectCost(settings);
  const loanAmount = deriveLoanAmount(settings);
  const monthlyPayment = deriveMonthlyPayment(settings, loanAmount);
  const financingYears = clampYears(settings.financingYears || settings.targetTermYears || 0);
  const monthlyRate = Math.max(0, settings.interestRatePercent) / 100 / 12;
  const growthRate = Math.max(0, settings.propertyValueGrowthPercent) / 100;
  const startPropertyValue = Math.max(0, settings.purchasePrice + settings.constructionOrRenovationCosts + settings.landCosts);
  const additionalMonthlyRepayment = buildAdditionalRepaymentBreakdown(
    settings,
    repaymentSourceValues
  );

  const years: RealEstateFinancingYear[] = [];
  const months: RealEstateFinancingMonth[] = [];

  let remainingDebt = loanAmount;
  let soldProperty = false;

  for (let yearIndex = 0; yearIndex < financingYears; yearIndex += 1) {
    const year = startYear + yearIndex;
    const loanStart = roundMoney(remainingDebt);
    let interestPaidYear = 0;
    let principalPaidYear = 0;
    let specialRepaymentYear = 0;
    let additionalRepaymentYear = 0;
    let additionalRepaymentBreakdownYear = emptyYearBreakdown();

    for (let month = 1; month <= 12; month += 1) {
      const monthLoanStart = roundMoney(remainingDebt);

      if (remainingDebt <= 0 || soldProperty) {
        months.push({
          year,
          month,
          loanStart: monthLoanStart,
          interestPaid: 0,
          principalPaid: 0,
          specialRepayment: 0,
          additionalRepayment: 0,
          loanEnd: 0
        });
        remainingDebt = 0;
        continue;
      }

      const interestPaid = roundMoney(remainingDebt * monthlyRate);
      const effectivePayment = monthlyRate > 0 ? Math.max(monthlyPayment, interestPaid) : monthlyPayment;
      const principalPaid = roundMoney(Math.min(Math.max(0, effectivePayment - interestPaid), remainingDebt));
      remainingDebt = roundMoney(remainingDebt - principalPaid);

      let additionalRepayment = 0;
      if (remainingDebt > 0 && additionalMonthlyRepayment.totalAdditionalMonthlyRepayment > 0) {
        const applied = applyAdditionalRepayment(additionalMonthlyRepayment, remainingDebt);
        additionalRepayment = applied.totalAdditionalRepayment;
        additionalRepaymentBreakdownYear = addYearBreakdown(additionalRepaymentBreakdownYear, applied);
        remainingDebt = roundMoney(remainingDebt - additionalRepayment);
      }

      let specialRepayment = 0;
      if (remainingDebt > 0) {
        const isSpecialRepaymentDue =
          settings.specialRepaymentRhythm === "monthly" ||
          (settings.specialRepaymentRhythm === "yearly" && month === 12);
        if (isSpecialRepaymentDue) {
          specialRepayment = roundMoney(Math.min(settings.specialRepaymentAmount, remainingDebt));
          remainingDebt = roundMoney(remainingDebt - specialRepayment);
        }
      }

      interestPaidYear += interestPaid;
      principalPaidYear += principalPaid;
      additionalRepaymentYear += additionalRepayment;
      specialRepaymentYear += specialRepayment;

      months.push({
        year,
        month,
        loanStart: monthLoanStart,
        interestPaid,
        principalPaid,
        specialRepayment,
        additionalRepayment,
        loanEnd: roundMoney(remainingDebt)
      });
    }

    let propertyValue = 0;
    const debtBeforeSaleClearance = remainingDebt;
    let isSaleYear = false;
    if (!soldProperty) {
      propertyValue = projectedPropertyValue(startPropertyValue, growthRate, yearIndex + 1, financingYears, settings);
      if (settings.plannedSaleYear !== null && year === settings.plannedSaleYear) {
        isSaleYear = true;
        if (settings.estimatedSaleValue !== null && settings.estimatedSaleValue > 0) {
          propertyValue = roundMoney(settings.estimatedSaleValue);
        }
      }
    }

    const effectiveDebtForYear = isSaleYear ? debtBeforeSaleClearance : remainingDebt;
    const loanEnd = roundMoney(isSaleYear ? 0 : soldProperty ? 0 : remainingDebt);
    const propertyEquity = roundMoney(Math.max(0, propertyValue - effectiveDebtForYear));
    const netPropertyWealth = roundMoney(propertyValue - effectiveDebtForYear);

    years.push({
      year,
      propertyValue,
      loanStart,
      interestPaid: roundMoney(interestPaidYear),
      principalPaid: roundMoney(principalPaidYear),
      specialRepayment: roundMoney(specialRepaymentYear),
      additionalRepayment: roundMoney(additionalRepaymentYear),
      additionalRepaymentBreakdown: roundYearBreakdown(additionalRepaymentBreakdownYear),
      loanEnd,
      propertyEquity,
      netPropertyWealth
    });

    if (isSaleYear) {
      soldProperty = true;
      remainingDebt = 0;
    } else if (soldProperty) {
      remainingDebt = 0;
    }
  }

  if (settings.remainingDebtAfterFixedInterest > 0 && settings.fixedInterestYears > 0) {
    const fixingYear = startYear + settings.fixedInterestYears - 1;
    const match = years.find((entry) => entry.year === fixingYear);
    if (match) {
      match.loanEnd = roundMoney(settings.remainingDebtAfterFixedInterest);
      match.propertyEquity = roundMoney(Math.max(0, match.propertyValue - match.loanEnd));
      match.netPropertyWealth = roundMoney(match.propertyValue - match.loanEnd);
    }
  }

  return {
    years,
    months,
    startLoanAmount: loanAmount,
    monthlyPayment,
    effectivePropertyStartValue: startPropertyValue,
    totalProjectCost: projectCost,
    validationErrors
  };
}

export function buildAdditionalRepaymentBreakdown(
  settings: RealEstateFinancingSettings,
  values: RepaymentSourceValues
): AdditionalRepaymentBreakdown {
  const normalize = (value: number): number => {
    if (!Number.isFinite(value)) return 0;
    return settings.repaymentSources.onlyUsePositiveValues ? Math.max(0, value) : value;
  };
  const withdrawalGain = settings.repaymentSources.useWithdrawalGainAsRepayment
    ? normalize(values.withdrawalGain)
    : 0;
  const depotSavingsRate = settings.repaymentSources.useDepotSavingsRateAsRepayment
    ? normalize(values.depotSavingsRate)
    : 0;
  const legacySavingsRate = settings.repaymentSources.useLegacySavingsRateAsRepayment
    ? normalize(values.legacySavingsRate)
    : 0;
  const netGain = settings.repaymentSources.useNetGainAsRepayment ? normalize(values.netGain) : 0;
  const totalAdditionalMonthlyRepayment = roundMoney(
    Math.max(0, withdrawalGain + depotSavingsRate + legacySavingsRate + netGain)
  );
  return {
    withdrawalGain: roundMoney(withdrawalGain),
    depotSavingsRate: roundMoney(depotSavingsRate),
    legacySavingsRate: roundMoney(legacySavingsRate),
    netGain: roundMoney(netGain),
    totalAdditionalMonthlyRepayment
  };
}

function applyAdditionalRepayment(
  monthly: AdditionalRepaymentBreakdown,
  remainingDebt: number
): AdditionalRepaymentYearBreakdown {
  const requested = Math.max(0, monthly.totalAdditionalMonthlyRepayment);
  const totalAdditionalRepayment = roundMoney(Math.min(requested, remainingDebt));
  if (requested <= 0 || totalAdditionalRepayment <= 0) return emptyYearBreakdown();
  const factor = totalAdditionalRepayment / requested;
  return {
    withdrawalGain: roundMoney(Math.max(0, monthly.withdrawalGain) * factor),
    depotSavingsRate: roundMoney(Math.max(0, monthly.depotSavingsRate) * factor),
    legacySavingsRate: roundMoney(Math.max(0, monthly.legacySavingsRate) * factor),
    netGain: roundMoney(Math.max(0, monthly.netGain) * factor),
    totalAdditionalRepayment
  };
}

function emptyRepaymentSourceValues(): RepaymentSourceValues {
  return {
    withdrawalGain: 0,
    depotSavingsRate: 0,
    legacySavingsRate: 0,
    netGain: 0
  };
}

function emptyYearBreakdown(): AdditionalRepaymentYearBreakdown {
  return {
    withdrawalGain: 0,
    depotSavingsRate: 0,
    legacySavingsRate: 0,
    netGain: 0,
    totalAdditionalRepayment: 0
  };
}

function addYearBreakdown(
  left: AdditionalRepaymentYearBreakdown,
  right: AdditionalRepaymentYearBreakdown
): AdditionalRepaymentYearBreakdown {
  return {
    withdrawalGain: left.withdrawalGain + right.withdrawalGain,
    depotSavingsRate: left.depotSavingsRate + right.depotSavingsRate,
    legacySavingsRate: left.legacySavingsRate + right.legacySavingsRate,
    netGain: left.netGain + right.netGain,
    totalAdditionalRepayment: left.totalAdditionalRepayment + right.totalAdditionalRepayment
  };
}

function roundYearBreakdown(value: AdditionalRepaymentYearBreakdown): AdditionalRepaymentYearBreakdown {
  return {
    withdrawalGain: roundMoney(value.withdrawalGain),
    depotSavingsRate: roundMoney(value.depotSavingsRate),
    legacySavingsRate: roundMoney(value.legacySavingsRate),
    netGain: roundMoney(value.netGain),
    totalAdditionalRepayment: roundMoney(value.totalAdditionalRepayment)
  };
}

function projectedPropertyValue(
  startPropertyValue: number,
  growthRate: number,
  yearIndex: number,
  financingYears: number,
  settings: RealEstateFinancingSettings
): number {
  const baseValue = roundMoney(startPropertyValue * (1 + growthRate) ** yearIndex);
  const manualValue = settings.manualFuturePropertyValue;
  if (manualValue === null || manualValue <= 0 || financingYears <= 0) return baseValue;

  const interpolationWeight = Math.min(1, Math.max(0, yearIndex / financingYears));
  return roundMoney(baseValue + (manualValue - baseValue) * interpolationWeight);
}

function clampYears(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.max(1, Math.min(MAX_FINANCING_YEARS, Math.round(value)));
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
