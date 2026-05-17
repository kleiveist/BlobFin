import {
  selectedInvestmentContributionForProjectionMonth,
  selectedInvestmentContributionForProjectionYear
} from "./investmentContributions";
import type { InvestmentSettings, ReservePosition } from "../types";

export const RETIREMENT_DEPOT_MIN_AGE = 65;
const MINIMUM_ANNUAL_CONTRIBUTION_FOR_ALLOWANCE = 120;
const BASE_ALLOWANCE_FIRST_TIER_LIMIT = 360;
const BASE_ALLOWANCE_SECOND_TIER_LIMIT = 1800;
const BASE_ALLOWANCE_FIRST_TIER_RATE = 0.5;
const BASE_ALLOWANCE_SECOND_TIER_RATE = 0.25;
const CHILD_ALLOWANCE_LIMIT = 300;

export interface RetirementDepotAllowance {
  annualOwnContribution: number;
  baseAllowance: number;
  childAllowance: number;
  totalAllowance: number;
  allowanceRatePercent: number;
  annualContributionWithAllowance: number;
}

export function calculateRetirementDepotAllowance(
  annualOwnContribution: number,
  childrenCount: number
): RetirementDepotAllowance {
  const ownContribution = Math.max(0, Number(annualOwnContribution) || 0);
  const children = Math.max(0, Math.floor(Number(childrenCount) || 0));
  if (ownContribution < MINIMUM_ANNUAL_CONTRIBUTION_FOR_ALLOWANCE) {
    return allowanceBreakdown(ownContribution, 0, 0);
  }

  const firstTierContribution = Math.min(ownContribution, BASE_ALLOWANCE_FIRST_TIER_LIMIT);
  const secondTierContribution = Math.min(
    Math.max(0, ownContribution - BASE_ALLOWANCE_FIRST_TIER_LIMIT),
    BASE_ALLOWANCE_SECOND_TIER_LIMIT - BASE_ALLOWANCE_FIRST_TIER_LIMIT
  );
  const baseAllowance =
    firstTierContribution * BASE_ALLOWANCE_FIRST_TIER_RATE +
    secondTierContribution * BASE_ALLOWANCE_SECOND_TIER_RATE;
  const childAllowance = Math.min(ownContribution, CHILD_ALLOWANCE_LIMIT) * children;

  return allowanceBreakdown(ownContribution, baseAllowance, childAllowance);
}

export function retirementDepotAllowanceForProjectionMonth(
  positions: ReservePosition[],
  settings: InvestmentSettings,
  baseYear: number,
  projectionMonthIndex: number
): number {
  if (!settings.retirementDepotEnabled) return 0;

  const monthlyOwnContribution = selectedInvestmentContributionForProjectionMonth(
    positions,
    settings,
    baseYear,
    projectionMonthIndex
  );
  if (monthlyOwnContribution <= 0) return 0;

  const projectionYearIndex = Math.floor(projectionMonthIndex / 12);
  const annualOwnContribution = selectedInvestmentContributionForProjectionYear(
    positions,
    settings,
    baseYear,
    projectionYearIndex
  );
  if (annualOwnContribution <= 0) return 0;

  const allowance = calculateRetirementDepotAllowance(annualOwnContribution, settings.retirementDepotChildren);
  return allowance.totalAllowance * (monthlyOwnContribution / annualOwnContribution);
}

function allowanceBreakdown(
  annualOwnContribution: number,
  baseAllowance: number,
  childAllowance: number
): RetirementDepotAllowance {
  const totalAllowance = baseAllowance + childAllowance;
  return {
    annualOwnContribution,
    baseAllowance,
    childAllowance,
    totalAllowance,
    allowanceRatePercent: annualOwnContribution > 0 ? (totalAllowance / annualOwnContribution) * 100 : 0,
    annualContributionWithAllowance: annualOwnContribution + totalAllowance
  };
}
