import { createId, defaultPositionTableViewState } from "../../data/defaults";
import { normalizePositionIcon } from "../positionIcons";
import {
  isPositionTableColumn,
  isPositionTableColumnInMode,
  isPositionTableMode,
  isPositionTableOperator,
  positionTableOperatorsForColumn
} from "../positionTableView";
import type { PositionTableFilter, PositionTableMode, PositionTableView, PositionTableViewState } from "../../types";
import { isRecord, stringArrayOrDefault } from "./validators";

export function normalizePositionTableViewState(value: unknown): PositionTableViewState {
  const fallback = defaultPositionTableViewState();
  if (!isRecord(value)) return fallback;
  return {
    income: normalizePositionTableView("income", value.income),
    expense: normalizePositionTableView("expense", value.expense),
    reserve: normalizePositionTableView("reserve", value.reserve),
    savings: normalizePositionTableView("savings", value.savings)
  };
}

export function normalizePositionTableView(mode: PositionTableMode, value: unknown): PositionTableView {
  if (!isRecord(value)) return { filters: [], sort: null, selectedLabels: [] };
  const filters = Array.isArray(value.filters)
    ? value.filters
        .map((item) => normalizePositionTableFilter(mode, item))
        .filter((filter): filter is PositionTableFilter => filter !== null)
    : [];
  const sort = normalizePositionTableSort(mode, value.sort);
  return { filters, sort, selectedLabels: normalizeSelectedPositionLabels(value.selectedLabels) };
}

export function normalizeSelectedPositionLabels(value: unknown): string[] {
  return Array.from(new Set(stringArrayOrDefault(value, []).map((label) => normalizePositionIcon(label))));
}

export function normalizePositionTableFilter(mode: PositionTableMode, value: unknown): PositionTableFilter | null {
  if (!isRecord(value)) return null;
  if (!isPositionTableMode(mode) || !isPositionTableColumn(value.column)) return null;
  if (!isPositionTableColumnInMode(mode, value.column)) return null;
  if (!isPositionTableOperator(value.operator)) return null;
  if (!positionTableOperatorsForColumn(mode, value.column).includes(value.operator)) return null;
  const filterValue = String(value.value ?? "").trim();
  if (!filterValue) return null;
  return {
    id: String(value.id || createId()),
    column: value.column,
    operator: value.operator,
    value: filterValue
  };
}

export function normalizePositionTableSort(mode: PositionTableMode, value: unknown): PositionTableView["sort"] {
  if (!isRecord(value)) return null;
  if (!isPositionTableColumn(value.column) || !isPositionTableColumnInMode(mode, value.column)) return null;
  if (value.direction !== "asc" && value.direction !== "desc") return null;
  return {
    column: value.column,
    direction: value.direction
  };
}
