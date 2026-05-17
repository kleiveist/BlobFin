import type { ExpensePositionType, IncomePositionType, PositionFlow, PositionType, ReservePosition } from "../types";

export const INCOME_POSITION_TYPES: IncomePositionType[] = ["incomeMonthly", "incomeYearly", "incomeTemporary"];
export const EXPENSE_POSITION_TYPES: ExpensePositionType[] = ["fixed", "reserve", "temporary", "savings"];
export type PositionTableMode = PositionFlow | "reserve" | "savings";

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
