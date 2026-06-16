import { createId, defaultPlanningSettings } from "../../data/defaults";
import { defaultPositionIconForPosition, normalizePositionIcon } from "../positionIcons";
import { flowForType, isIncomeType, isPositionType, typeForFlow } from "../positionKinds";
import type { PlanningSettings, PositionCostBreakdownItem, PositionFlow, ReservePosition } from "../../types";
import { booleanOrDefault, isRecord, nullableNumberOrDefault, numberOrDefault, normalizePlanningYearSelection } from "./validators";

export function normalizePositions(
  value: unknown,
  fallback: ReservePosition[],
  fallbackPayoutYear = defaultPlanningSettings().year
): ReservePosition[] {
  if (!Array.isArray(value) || value.length === 0) return fallback;

  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const rawType = normalizePositionType(item.type);
      const flow = normalizePositionFlow(item.flow ?? item.direction ?? item.category, flowForType(rawType));
      const type = typeForFlow(rawType, flow);
      const name = String(item.name || "Position");
      const costBreakdown = normalizePositionCostBreakdown(item.costBreakdown);
      const planningYear = normalizePlanningYearSelection(item.planningYear ?? item.planYear, null);
      const position: ReservePosition = {
        id: String(item.id || createId()),
        planningYear,
        flow,
        active: booleanOrDefault(item.active, true),
        visible: booleanOrDefault(item.visible ?? item.view, true),
        name,
        icon: normalizePositionIcon(
          item.icon ?? item.labelIcon ?? item.label,
          defaultPositionIconForPosition({ flow, type, name })
        ),
        type,
        amount: numberOrDefault(item.amount, 0),
        startMonth: numberOrDefault(item.startMonth, 1),
        endMonth: numberOrDefault(item.endMonth, 12),
        payoutType:
          item.payoutType === "monthly" || item.payoutType === "yearly" || item.payoutType === "once"
            ? item.payoutType
            : "none",
        payoutYear: numberOrDefault(item.payoutYear ?? item.year, fallbackPayoutYear),
        payoutMonth: numberOrDefault(item.payoutMonth, 12),
        payoutDay: numberOrDefault(item.payoutDay, 31),
        interestBearing: flow === "expense" && booleanOrDefault(item.interestBearing ?? item.interest, false),
        cashback: flow === "expense" && Boolean(item.cashback) && type === "temporary",
        ...(costBreakdown.length ? { costBreakdown } : {})
      };
      if (position.id === "investitionsrate" && position.type === "temporary") {
        position.type = "savings";
        position.cashback = false;
      }
      if (position.payoutType === "once" && position.type !== "savings") {
        position.startMonth = position.payoutMonth;
        position.endMonth = position.payoutMonth;
        position.interestBearing = false;
      } else if (position.payoutType === "once") {
        position.interestBearing = false;
      }
      if (position.payoutType === "once") {
        position.planningYear = normalizePlanningYearSelection(position.payoutYear, null);
      }
      if (position.flow === "income") {
        position.interestBearing = false;
        position.cashback = false;
        if (position.payoutType === "none" && position.type !== "incomeTemporary") {
          position.payoutType = defaultIncomePayoutType(position.type);
        }
      }
      if (!positionCostBreakdownAllowed(position.flow, position.type, position.payoutType)) {
        position.costBreakdown = undefined;
      }
      const breakdownTotal = positionCostBreakdownTotal(position.costBreakdown);
      if (breakdownTotal !== null) position.amount = breakdownTotal;
      return position;
    })
    .filter((position): position is ReservePosition => position !== null);
}

export function normalizePositionCostBreakdown(value: unknown): PositionCostBreakdownItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const name = String(item.name ?? "").trim();
      const amount = nullableNumberOrDefault(item.amount, null);
      if (!name && amount === null) return null;
      return {
        id: String(item.id || createId()),
        name,
        amount: amount === null ? null : Math.max(0, amount)
      };
    })
    .filter((item): item is PositionCostBreakdownItem => item !== null);
}

export function positionCostBreakdownTotal(items: PositionCostBreakdownItem[] | undefined): number | null {
  if (!items?.some((item) => item.amount !== null)) return null;
  return items.reduce((sum, item) => sum + Math.max(0, Number(item.amount ?? 0)), 0);
}

export function positionCostBreakdownAllowed(
  flow: ReservePosition["flow"],
  type: ReservePosition["type"],
  payoutType: ReservePosition["payoutType"]
): boolean {
  if (flow === "expense" && type === "temporary") {
    return payoutType === "monthly" || payoutType === "yearly" || payoutType === "once";
  }
  return flow === "income" && type === "incomeTemporary" && payoutType === "once";
}

export function migrateMonthlyNetIncomePosition(settings: PlanningSettings, positions: ReservePosition[]): ReservePosition[] {
  if (settings.monthlyNetIncome <= 0) {
    return positions;
  }
  const incomeIndex = positions.findIndex((position) => position.flow === "income" || isIncomeType(position.type));
  if (incomeIndex >= 0) {
    return positions.map((position, index) =>
      index === incomeIndex && position.amount === 0 ? { ...position, amount: settings.monthlyNetIncome } : position
    );
  }

  return [
    {
      id: "nettoeinkommen",
      planningYear: null,
      flow: "income",
      active: true,
      visible: true,
      name: "Nettoeinkommen",
      type: "incomeMonthly",
      amount: settings.monthlyNetIncome,
      startMonth: 1,
      endMonth: 12,
      payoutType: "monthly",
      payoutYear: settings.year,
      payoutMonth: 1,
      payoutDay: 1,
      interestBearing: false,
      cashback: false
    },
    ...positions
  ];
}

export function normalizePositionType(value: unknown): ReservePosition["type"] {
  if (isPositionType(value)) return value;
  return "reserve";
}

export function normalizePositionFlow(value: unknown, fallback: PositionFlow): PositionFlow {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (
    normalized === "income" ||
    normalized === "einnahme" ||
    normalized === "einnahmen" ||
    normalized === "einlage" ||
    normalized === "einlagen"
  ) {
    return "income";
  }
  if (
    normalized === "expense" ||
    normalized === "expenses" ||
    normalized === "ausgabe" ||
    normalized === "ausgaben" ||
    normalized === "kosten"
  ) {
    return "expense";
  }
  return fallback;
}

export function defaultIncomePayoutType(type: ReservePosition["type"]): ReservePosition["payoutType"] {
  if (type === "incomeYearly") return "yearly";
  return "monthly";
}
