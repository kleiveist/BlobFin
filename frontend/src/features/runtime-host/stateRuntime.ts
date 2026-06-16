import { defaultCombinedWealthToggles } from "../../data/defaults";
import { clamp } from "../../lib/format";
import type { AppState, CombinedWealthDepotKey, StatutoryPensionScenarioId } from "../../types";
import { COMBINED_DEPOTS } from "../combined-wealth/config";

export function normalizeCombinedWealthState(
  combinedWealth: AppState["combinedWealth"] | undefined,
  accountIds: string[],
  fallbackAccountId: string
): AppState["combinedWealth"] {
  const fallback = defaultCombinedWealthToggles();
  const source = combinedWealth ?? fallback;
  const cashAccountId =
    source.cashAccountId && accountIds.includes(source.cashAccountId) ? source.cashAccountId : fallbackAccountId;
  const depotKeys = Array.from(
    new Set(
      (source.depotKeys?.length ? source.depotKeys : fallback.depotKeys).filter((key): key is CombinedWealthDepotKey =>
        COMBINED_DEPOTS.some((depot) => depot.key === key)
      )
    )
  );
  return {
    ...fallback,
    ...source,
    cashAccountId,
    cashPositionIds: Array.from(new Set(source.cashPositionIds ?? fallback.cashPositionIds)),
    depotKeys: depotKeys.length ? depotKeys : fallback.depotKeys,
    statutoryPensionScenario: statutoryPensionScenarioIdFromValue(source.statutoryPensionScenario) ?? "base",
    statutoryPensionMonthlyAmount: Math.max(0, Number(source.statutoryPensionMonthlyAmount) || 0),
    statutoryPensionSavingsRatePercent: clamp(Number(source.statutoryPensionSavingsRatePercent) || 0, 0, 100)
  };
}

export function statutoryPensionScenarioIdFromValue(value: string | undefined): StatutoryPensionScenarioId | null {
  if (value === "pessimistic" || value === "base" || value === "optimistic") return value;
  return null;
}
