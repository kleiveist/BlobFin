import type {
  ExpensePositionType,
  IncomePositionType,
  PayoutType,
  PositionFlow,
  PositionTableMode,
  PositionType,
  ReservePosition
} from "../types";

export type { PositionTableMode };
export type PositionTableCadence = PayoutType;

export const INCOME_POSITION_TYPES: IncomePositionType[] = ["incomeMonthly", "incomeYearly", "incomeTemporary"];
export const EXPENSE_POSITION_TYPES: ExpensePositionType[] = ["fixed", "reserve", "temporary", "savings"];
export const INCOME_POSITION_CADENCES: PositionTableCadence[] = ["monthly", "yearly", "once"];
export const EXPENSE_POSITION_CADENCES: PositionTableCadence[] = ["monthly", "yearly", "once", "none"];

export function isIncomeType(type: PositionType): type is IncomePositionType {
  return INCOME_POSITION_TYPES.includes(type as IncomePositionType);
}

export function isExpenseType(type: PositionType): type is ExpensePositionType {
  return EXPENSE_POSITION_TYPES.includes(type as ExpensePositionType);
}

export function flowForType(type: PositionType): PositionFlow {
  return isIncomeType(type) ? "income" : "expense";
}

export function positionFlow(position: Pick<ReservePosition, "flow" | "type">): PositionFlow {
  return position.flow === "income" || isIncomeType(position.type) ? "income" : "expense";
}

export function isIncomePosition(position: Pick<ReservePosition, "flow" | "type">): boolean {
  return positionFlow(position) === "income";
}

export function isExpensePosition(position: Pick<ReservePosition, "flow" | "type">): boolean {
  return positionFlow(position) === "expense";
}

export function positionTableMode(position: Pick<ReservePosition, "flow" | "type">): PositionTableMode {
  if (isIncomePosition(position)) return "income";
  if (position.type === "fixed" || position.type === "reserve") return "reserve";
  if (position.type === "savings") return "savings";
  return "expense";
}

export function positionCadencesForTableMode(mode: PositionTableMode): PositionTableCadence[] {
  if (mode === "income") return [...INCOME_POSITION_CADENCES];
  if (mode === "expense") return [...EXPENSE_POSITION_CADENCES];
  return [];
}

export function positionMatchesTableCadence(
  position: Pick<ReservePosition, "flow" | "type" | "payoutType">,
  mode: PositionTableMode,
  cadence: PositionTableCadence | null | undefined
): boolean {
  if (!cadence || (mode !== "income" && mode !== "expense")) return true;
  return positionTableMode(position) === mode && position.payoutType === cadence;
}

export function typeForPositionTableSelection(
  mode: PositionTableMode,
  cadence: PositionTableCadence | null | undefined
): PositionType {
  if (mode === "income") {
    if (cadence === "yearly") return "incomeYearly";
    if (cadence === "once") return "incomeTemporary";
    return "incomeMonthly";
  }
  if (mode === "reserve") return "reserve";
  if (mode === "savings") return "savings";
  return "temporary";
}

export function payoutTypeForPositionTableSelection(
  mode: PositionTableMode,
  cadence: PositionTableCadence | null | undefined
): PayoutType {
  if (mode === "expense" && cadence && EXPENSE_POSITION_CADENCES.includes(cadence)) return cadence;
  if (mode === "income" && cadence && INCOME_POSITION_CADENCES.includes(cadence)) return cadence;
  return "monthly";
}

export function typeForFlow(type: PositionType, flow: PositionFlow): PositionType {
  if (flow === "income") return isIncomeType(type) ? type : "incomeMonthly";
  return isExpenseType(type) ? type : "temporary";
}

export function isPositionType(value: unknown): value is PositionType {
  return (
    value === "fixed" ||
    value === "reserve" ||
    value === "temporary" ||
    value === "savings" ||
    value === "incomeMonthly" ||
    value === "incomeYearly" ||
    value === "incomeTemporary"
  );
}
