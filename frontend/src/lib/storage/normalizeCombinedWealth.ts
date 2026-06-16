import { defaultCombinedWealthToggles } from "../../data/defaults";
import type { CombinedWealthDepotKey, CombinedWealthToggles, InvestmentSettings, PlanningAccount, RealEstateFinancingSettings } from "../../types";
import { normalizeStatutoryPensionScenarioId } from "./normalizeStatutoryPension";
import { booleanOrDefault, clampNumber, isRecord, numberOrDefault, stringArrayOrDefault } from "./validators";

export function normalizeCombinedWealthToggles(value: unknown): CombinedWealthToggles {
  const fallback = defaultCombinedWealthToggles();
  if (!isRecord(value)) return fallback;
  return {
    includeCashPositions: booleanOrDefault(value.includeCashPositions, fallback.includeCashPositions),
    includeCostReserveAccounts: booleanOrDefault(
      value.includeCostReserveAccounts,
      fallback.includeCostReserveAccounts
    ),
    includeAnnualTableAccounts: booleanOrDefault(value.includeAnnualTableAccounts, fallback.includeAnnualTableAccounts),
    includeDepotDevelopment: booleanOrDefault(value.includeDepotDevelopment, fallback.includeDepotDevelopment),
    includeSharedDepotDevelopment: booleanOrDefault(
      value.includeSharedDepotDevelopment,
      fallback.includeSharedDepotDevelopment
    ),
    includeWithdrawals: booleanOrDefault(value.includeWithdrawals, fallback.includeWithdrawals),
    includeRealEstateFinancing: booleanOrDefault(value.includeRealEstateFinancing, fallback.includeRealEstateFinancing),
    includeRealEstateValueTrend: booleanOrDefault(value.includeRealEstateValueTrend, fallback.includeRealEstateValueTrend),
    includeStatutoryPension: booleanOrDefault(value.includeStatutoryPension, fallback.includeStatutoryPension),
    cashAccountId: typeof value.cashAccountId === "string" && value.cashAccountId.trim() ? value.cashAccountId : fallback.cashAccountId,
    cashPositionIds: Array.from(new Set(stringArrayOrDefault(value.cashPositionIds, fallback.cashPositionIds))),
    depotKeys: normalizeCombinedWealthDepotKeys(value.depotKeys, fallback.depotKeys),
    statutoryPensionScenario: normalizeStatutoryPensionScenarioId(
      value.statutoryPensionScenario,
      fallback.statutoryPensionScenario
    ),
    statutoryPensionMonthlyAmount: Math.max(
      0,
      numberOrDefault(value.statutoryPensionMonthlyAmount, fallback.statutoryPensionMonthlyAmount)
    ),
    statutoryPensionSavingsRatePercent: clampNumber(
      numberOrDefault(value.statutoryPensionSavingsRatePercent, fallback.statutoryPensionSavingsRatePercent),
      0,
      100
    )
  };
}

export function normalizeCombinedWealthDepotKeys(
  value: unknown,
  fallback: CombinedWealthDepotKey[]
): CombinedWealthDepotKey[] {
  const keys = stringArrayOrDefault(value, fallback).filter(
    (key): key is CombinedWealthDepotKey => key === "standard" || key === "retirement" || key === "child"
  );
  return Array.from(new Set(keys)).length ? Array.from(new Set(keys)) : fallback;
}

export function normalizeCombinedCashPositionIds(
  combinedWealth: CombinedWealthToggles,
  planningAccounts: PlanningAccount[],
  realEstate: RealEstateFinancingSettings,
  investmentByAccountId: Record<string, InvestmentSettings>
): CombinedWealthToggles {
  const account =
    planningAccounts.find((item) => item.id === combinedWealth.cashAccountId) ?? planningAccounts[0] ?? null;
  if (!account) return { ...combinedWealth, cashPositionIds: [] };

  const blockedIds = new Set<string>([
    ...realEstate.equityCapitalSourceIds,
    ...realEstate.monthlyPaymentSourceIds,
    ...realEstate.specialRepaymentSourceIds
  ]);
  for (const settings of Object.values(investmentByAccountId)) {
    for (const id of settings.includedIds) blockedIds.add(id);
    for (const id of settings.retirementIncludedIds) blockedIds.add(id);
    for (const id of settings.childIncludedIds) blockedIds.add(id);
  }

  const selectableIds = new Set(
    account.yearlyRows
      .filter(
        (position) =>
          position.active &&
          position.type === "savings" &&
          position.flow === "expense" &&
          !blockedIds.has(position.id)
      )
      .map((position) => position.id)
  );
  const cashPositionIds = Array.from(new Set(combinedWealth.cashPositionIds)).filter((id) => selectableIds.has(id));
  return { ...combinedWealth, cashPositionIds };
}
