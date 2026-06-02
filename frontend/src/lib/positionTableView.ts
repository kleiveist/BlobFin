import { MONTHS } from "../data/defaults";
import { labelForPayout, labelForType, normalizeHeader, numberValue } from "./format";
import { normalizePositionIcon, positionIconLabel } from "./positionIcons";
import { positionMatchesTableCadence, positionTableMode, type PositionTableCadence, type PositionTableMode } from "./positionKinds";
import type {
  PositionTableFilter,
  PositionTableFilterColumn,
  PositionTableFilterOperator,
  PositionTableSort,
  PositionTableView,
  ReservePosition
} from "../types";

export const POSITION_TABLE_MODES: PositionTableMode[] = ["income", "expense", "reserve", "savings"];
export const POSITION_TABLE_FILTER_COLUMNS: PositionTableFilterColumn[] = [
  "active",
  "visible",
  "label",
  "name",
  "type",
  "amount",
  "startMonth",
  "endMonth",
  "payoutYear",
  "payoutType",
  "payoutMonth",
  "payoutDay",
  "interestBearing",
  "cashback"
];
export const POSITION_TABLE_FILTER_OPERATORS: PositionTableFilterOperator[] = ["contains", "eq", "gte", "lte"];

export type PositionTableFilterKind = "text" | "select" | "number";

export interface PositionTableColumnConfig {
  column: PositionTableFilterColumn;
  label: string;
  kind: PositionTableFilterKind;
}

export interface PositionTableSelectOption {
  value: string;
  label: string;
}

export function emptyPositionTableView(): PositionTableView {
  return { filters: [], sort: null, selectedLabels: [] };
}

export function positionTableColumnsForMode(mode: PositionTableMode): PositionTableColumnConfig[] {
  const timingLabel = mode === "income" ? "Eingang" : mode === "savings" ? "Transfer" : "Abgang";
  const monthLabel = mode === "income" ? "Eingangsmonat" : mode === "savings" ? "Transfermonat" : "Abgangsmonat";
  const configs: PositionTableColumnConfig[] = [
    { column: "active", label: "Aktiv", kind: "select" },
    { column: "visible", label: "View", kind: "select" },
    { column: "label", label: "Label", kind: "select" },
    { column: "name", label: "Name", kind: "text" }
  ];
  if (mode === "income" || mode === "reserve") {
    configs.push({ column: "type", label: "Art", kind: "select" });
  }
  configs.push({ column: "amount", label: "Betrag", kind: "number" });

  if (mode === "savings") {
    configs.push(
      { column: "payoutYear", label: "Abgangsjahr", kind: "number" },
      { column: "startMonth", label: "Anfang Monat", kind: "select" }
    );
  } else {
    configs.push(
      { column: "startMonth", label: "Start", kind: "select" },
      { column: "endMonth", label: "Ende", kind: "select" }
    );
    configs.push({
      column: "payoutYear",
      label: mode === "income" ? "Jahr" : "Abgangsjahr",
      kind: "number"
    });
  }

  configs.push(
    { column: "payoutType", label: timingLabel, kind: "select" },
    { column: "payoutMonth", label: monthLabel, kind: "select" },
    { column: "payoutDay", label: "Tag", kind: "number" }
  );

  if (mode !== "income") {
    configs.push(
      { column: "interestBearing", label: "Zins", kind: "select" },
      { column: "cashback", label: "Cashb.", kind: "select" }
    );
  }

  return configs;
}

export function positionTableColumnConfig(
  mode: PositionTableMode,
  column: PositionTableFilterColumn
): PositionTableColumnConfig | undefined {
  return positionTableColumnsForMode(mode).find((config) => config.column === column);
}

export function positionTableOperatorsForColumn(
  mode: PositionTableMode,
  column: PositionTableFilterColumn
): PositionTableFilterOperator[] {
  const kind = positionTableColumnConfig(mode, column)?.kind;
  if (kind === "text") return ["contains"];
  if (kind === "number") return ["eq", "gte", "lte"];
  return ["eq"];
}

export function isPositionTableMode(value: unknown): value is PositionTableMode {
  return POSITION_TABLE_MODES.includes(value as PositionTableMode);
}

export function isPositionTableColumn(value: unknown): value is PositionTableFilterColumn {
  return POSITION_TABLE_FILTER_COLUMNS.includes(value as PositionTableFilterColumn);
}

export function isPositionTableOperator(value: unknown): value is PositionTableFilterOperator {
  return POSITION_TABLE_FILTER_OPERATORS.includes(value as PositionTableFilterOperator);
}

export function isPositionTableColumnInMode(
  mode: PositionTableMode,
  column: PositionTableFilterColumn
): boolean {
  return Boolean(positionTableColumnConfig(mode, column));
}

export function positionTableRows(
  positions: ReservePosition[],
  mode: PositionTableMode,
  view: PositionTableView,
  cadence: PositionTableCadence | null = null
): ReservePosition[] {
  const baseRows = positions.filter(
    (position) => positionTableMode(position) === mode && positionMatchesTableCadence(position, mode, cadence)
  );
  const selectedLabels = new Set(view.selectedLabels.map((label) => normalizePositionIcon(label)));
  const labelRows = selectedLabels.size
    ? baseRows.filter((position) => selectedLabels.has(normalizePositionIcon(position.icon)))
    : baseRows;
  const filteredRows = labelRows.filter((position) =>
    view.filters.every((filter) => positionMatchesFilter(position, mode, filter))
  );
  if (!view.sort) return filteredRows;
  return sortPositionRows(filteredRows, mode, view.sort);
}

export function hasActivePositionTableView(view: PositionTableView): boolean {
  return view.filters.length > 0 || view.sort !== null || view.selectedLabels.length > 0;
}

export function positionTableLabelOptions(positions: ReservePosition[], mode: PositionTableMode): PositionTableSelectOption[] {
  return positionLabelOptions(positions, mode);
}

export function positionTableSelectOptions(
  mode: PositionTableMode,
  column: PositionTableFilterColumn,
  positions: ReservePosition[]
): PositionTableSelectOption[] {
  if (column === "active") {
    return [
      { value: "true", label: "Aktiv" },
      { value: "false", label: "Inaktiv" }
    ];
  }
  if (column === "visible") {
    return [
      { value: "true", label: "Sichtbar" },
      { value: "false", label: "Ausgeblendet" }
    ];
  }
  if (column === "interestBearing" || column === "cashback") {
    return [
      { value: "true", label: "Ja" },
      { value: "false", label: "Nein" }
    ];
  }
  if (column === "startMonth" || column === "endMonth" || column === "payoutMonth") {
    return MONTHS.map((label, index) => ({ value: String(index + 1), label }));
  }
  if (column === "type") return positionTypeOptionsForMode(mode);
  if (column === "payoutType") return payoutTypeOptionsForMode(mode);
  if (column === "label") return positionLabelOptions(positions, mode);
  return [];
}

export function positionTableFilterChipLabel(mode: PositionTableMode, filter: PositionTableFilter): string {
  const columnLabel = positionTableColumnConfig(mode, filter.column)?.label ?? filter.column;
  const valueLabel = positionTableValueLabel(mode, filter.column, filter.value);
  return `${columnLabel} ${positionTableOperatorLabel(filter.operator)} ${valueLabel}`;
}

export function positionTableSortLabel(mode: PositionTableMode, sort: PositionTableSort): string {
  const columnLabel = positionTableColumnConfig(mode, sort.column)?.label ?? sort.column;
  return `${columnLabel} ${sort.direction === "asc" ? "aufsteigend" : "absteigend"}`;
}

export function positionTableOperatorLabel(operator: PositionTableFilterOperator): string {
  if (operator === "contains") return "enthaelt";
  if (operator === "gte") return ">=";
  if (operator === "lte") return "<=";
  return "=";
}

function positionMatchesFilter(
  position: ReservePosition,
  mode: PositionTableMode,
  filter: PositionTableFilter
): boolean {
  const config = positionTableColumnConfig(mode, filter.column);
  if (!config) return true;

  if (config.kind === "text") {
    return normalizeHeader(positionTableRawFilterValue(position, filter.column)).includes(normalizeHeader(filter.value));
  }

  if (config.kind === "number") {
    const current = Number(positionTableRawFilterValue(position, filter.column));
    const expected = numberValue(filter.value);
    if (filter.operator === "gte") return current >= expected;
    if (filter.operator === "lte") return current <= expected;
    return current === expected;
  }

  return String(positionTableRawFilterValue(position, filter.column)) === filter.value;
}

function sortPositionRows(
  positions: ReservePosition[],
  mode: PositionTableMode,
  sort: PositionTableSort
): ReservePosition[] {
  return positions
    .map((position, index) => ({ position, index }))
    .sort((first, second) => {
      const comparison = compareSortValues(
        positionTableSortValue(first.position, mode, sort.column),
        positionTableSortValue(second.position, mode, sort.column)
      );
      if (comparison !== 0) return sort.direction === "asc" ? comparison : -comparison;
      return first.index - second.index;
    })
    .map((item) => item.position);
}

function compareSortValues(first: string | number | boolean, second: string | number | boolean): number {
  if (typeof first === "number" && typeof second === "number") return first - second;
  if (typeof first === "boolean" && typeof second === "boolean") return Number(first) - Number(second);
  return String(first).localeCompare(String(second), "de", { sensitivity: "base", numeric: true });
}

function positionTableSortValue(
  position: ReservePosition,
  mode: PositionTableMode,
  column: PositionTableFilterColumn
): string | number | boolean {
  if (!positionTableColumnConfig(mode, column)) return "";
  switch (column) {
    case "label":
      return positionIconLabel(normalizePositionIcon(position.icon));
    case "type":
      return labelForType(position.type);
    case "payoutType":
      return payoutTypeSortOrder(position.payoutType);
    case "active":
    case "visible":
    case "interestBearing":
    case "cashback":
    case "name":
    case "amount":
    case "startMonth":
    case "endMonth":
    case "payoutYear":
    case "payoutMonth":
    case "payoutDay":
      return position[column];
  }
}

function positionTableRawFilterValue(position: ReservePosition, column: PositionTableFilterColumn): string | number | boolean {
  switch (column) {
    case "label":
      return normalizePositionIcon(position.icon);
    case "type":
      return position.type;
    case "payoutType":
      return position.payoutType;
    case "active":
    case "visible":
    case "interestBearing":
    case "cashback":
    case "name":
    case "amount":
    case "startMonth":
    case "endMonth":
    case "payoutYear":
    case "payoutMonth":
    case "payoutDay":
      return position[column];
  }
}

function positionTableValueLabel(
  mode: PositionTableMode,
  column: PositionTableFilterColumn,
  value: string
): string {
  const option = positionTableSelectOptions(mode, column, []).find((item) => item.value === value);
  if (option) return option.label;
  if (column === "label") return positionIconLabel(normalizePositionIcon(value));
  if (column === "type") return labelForType(value as ReservePosition["type"]);
  if (column === "payoutType") return labelForPayout(value as ReservePosition["payoutType"], mode === "income" ? "income" : "expense");
  if (column === "startMonth" || column === "endMonth" || column === "payoutMonth") {
    return MONTHS[Number(value) - 1] ?? value;
  }
  return value;
}

function positionLabelOptions(positions: ReservePosition[], mode: PositionTableMode): PositionTableSelectOption[] {
  const iconIds = new Set(
    positions
      .filter((position) => positionTableMode(position) === mode)
      .map((position) => normalizePositionIcon(position.icon))
  );
  return Array.from(iconIds)
    .map((value) => ({ value, label: positionIconLabel(value) }))
    .sort((first, second) => first.label.localeCompare(second.label, "de", { sensitivity: "base" }));
}

function positionTypeOptionsForMode(mode: PositionTableMode): PositionTableSelectOption[] {
  const types: ReservePosition["type"][] =
    mode === "income"
      ? ["incomeMonthly", "incomeYearly", "incomeTemporary"]
      : mode === "reserve"
        ? ["fixed", "reserve"]
        : mode === "savings"
          ? ["savings"]
          : ["temporary"];
  return types.map((value) => ({ value, label: labelForType(value) }));
}

function payoutTypeOptionsForMode(mode: PositionTableMode): PositionTableSelectOption[] {
  const payoutTypes: ReservePosition["payoutType"][] =
    mode === "income" ? ["monthly", "yearly", "once", "none"] : ["none", "monthly", "yearly", "once"];
  const flow = mode === "income" ? "income" : "expense";
  return payoutTypes.map((value) => ({ value, label: labelForPayout(value, flow) }));
}

function payoutTypeSortOrder(type: ReservePosition["payoutType"]): number {
  if (type === "none") return 0;
  if (type === "monthly") return 1;
  if (type === "yearly") return 2;
  return 3;
}
