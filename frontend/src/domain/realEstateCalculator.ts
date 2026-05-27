import type {
  RealEstateFinancingMonth,
  RealEstateFinancingResult,
  RealEstateFinancingSettings,
  RealEstateFinancingYear
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

export function calculateRealEstateFinancing(
  startYear: number,
  settings: RealEstateFinancingSettings
): RealEstateFinancingResult {
  const validationErrors = validateRealEstateSettings(settings);
  const projectCost = totalProjectCost(settings);
  const loanAmount = deriveLoanAmount(settings);
  const monthlyPayment = deriveMonthlyPayment(settings, loanAmount);
  const financingYears = clampYears(settings.financingYears || settings.targetTermYears || 0);
  const monthlyRate = Math.max(0, settings.interestRatePercent) / 100 / 12;
  const growthRate = Math.max(0, settings.propertyValueGrowthPercent) / 100;
  const startPropertyValue = Math.max(0, settings.purchasePrice + settings.constructionOrRenovationCosts + settings.landCosts);

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
          loanEnd: 0
        });
        remainingDebt = 0;
        continue;
      }

      const interestPaid = roundMoney(remainingDebt * monthlyRate);
      const effectivePayment = monthlyRate > 0 ? Math.max(monthlyPayment, interestPaid) : monthlyPayment;
      const principalPaid = roundMoney(Math.min(Math.max(0, effectivePayment - interestPaid), remainingDebt));
      remainingDebt = roundMoney(remainingDebt - principalPaid);

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
      specialRepaymentYear += specialRepayment;

      months.push({
        year,
        month,
        loanStart: monthLoanStart,
        interestPaid,
        principalPaid,
        specialRepayment,
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
