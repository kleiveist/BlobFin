import type { IncomePerson, IncomeResolvedSource, IncomeYearEntry } from "../types";
import {
  incomeTaxDeductionItemsSocialTotal,
  incomeYearEntryNetIncome,
  incomeYearEntryTaxDeductions,
  incomeYearEntryTaxTotal
} from "./incomeTracker";

export type IncomeAnalysisLabelYearFilter = "all" | number;

export interface IncomeAnalysisLabelOption {
  id: string;
  label: string;
  icon: string;
}

export interface IncomeAnalysisLabelEntry {
  id: string;
  year: number;
  label: string;
  labelText: string;
  icon: string;
  person: IncomePerson;
  source: IncomeResolvedSource;
  employer: string;
  gross: number;
  taxes: number;
  social: number;
  deductions: number;
  net: number;
}

export interface IncomeAnalysisLabelGroup {
  label: string;
  labelText: string;
  icon: string;
  entries: IncomeAnalysisLabelEntry[];
  gross: number;
  taxes: number;
  social: number;
  deductions: number;
  net: number;
}

export interface IncomeAnalysisLabelYearPoint {
  year: number;
  label: string;
  labelText: string;
  icon: string;
  gross: number;
  taxes: number;
  social: number;
  deductions: number;
  net: number;
}

export interface IncomeAnalysisLabelDetails {
  availableLabels: IncomeAnalysisLabelOption[];
  selectedLabels: string[];
  availableGroups: IncomeAnalysisLabelGroup[];
  groups: IncomeAnalysisLabelGroup[];
  yearPoints: IncomeAnalysisLabelYearPoint[];
}

export function buildIncomeAnalysisLabelDetails(
  entries: IncomeYearEntry[],
  labelOptions: readonly IncomeAnalysisLabelOption[],
  selectedLabels: readonly string[] = [],
  yearFilter: IncomeAnalysisLabelYearFilter = "all"
): IncomeAnalysisLabelDetails {
  const scopedEntries = entries.filter(
    (entry) => entry.active && entry.visible && (yearFilter === "all" || entry.year === yearFilter)
  );
  const entriesByLabel = new Map<string, IncomeYearEntry[]>();
  for (const entry of scopedEntries) {
    const labelEntries = entriesByLabel.get(entry.label) ?? [];
    labelEntries.push(entry);
    entriesByLabel.set(entry.label, labelEntries);
  }

  const availableLabels = labelOptions.filter((option) => entriesByLabel.has(option.id));
  const normalizedSelection = normalizeIncomeAnalysisLabelSelection(selectedLabels, availableLabels);
  const visibleLabelIds = new Set(
    normalizedSelection.length ? normalizedSelection : availableLabels.map((option) => option.id)
  );

  const availableGroups = availableLabels
    .map((option) => incomeAnalysisLabelGroup(option, entriesByLabel.get(option.id) ?? []))
    .filter((group) => group.entries.length > 0);
  const groups = availableGroups.filter((group) => visibleLabelIds.has(group.label));
  const yearPoints = incomeAnalysisLabelYearPoints(availableLabels, entriesByLabel, visibleLabelIds);

  return {
    availableLabels,
    selectedLabels: normalizedSelection,
    availableGroups,
    groups,
    yearPoints
  };
}

export function normalizeIncomeAnalysisLabelSelection(
  selectedLabels: readonly string[],
  availableLabels: readonly IncomeAnalysisLabelOption[]
): string[] {
  const selected = new Set(selectedLabels);
  return availableLabels.map((option) => option.id).filter((label) => selected.has(label));
}

function incomeAnalysisLabelGroup(
  option: IncomeAnalysisLabelOption,
  entries: IncomeYearEntry[]
): IncomeAnalysisLabelGroup {
  const details = [...entries]
    .sort((first, second) => first.year - second.year || first.id.localeCompare(second.id))
    .map((entry) => incomeAnalysisLabelEntry(entry, option));

  return {
    label: option.id,
    labelText: option.label,
    icon: option.icon,
    entries: details,
    gross: roundCents(details.reduce((sum, entry) => sum + entry.gross, 0)),
    taxes: roundCents(details.reduce((sum, entry) => sum + entry.taxes, 0)),
    social: roundCents(details.reduce((sum, entry) => sum + entry.social, 0)),
    deductions: roundCents(details.reduce((sum, entry) => sum + entry.deductions, 0)),
    net: roundCents(details.reduce((sum, entry) => sum + entry.net, 0))
  };
}

function incomeAnalysisLabelYearPoints(
  labelOptions: readonly IncomeAnalysisLabelOption[],
  entriesByLabel: Map<string, IncomeYearEntry[]>,
  visibleLabelIds: Set<string>
): IncomeAnalysisLabelYearPoint[] {
  return labelOptions
    .filter((option) => visibleLabelIds.has(option.id))
    .flatMap((option) => {
      const entriesByYear = new Map<number, IncomeYearEntry[]>();
      for (const entry of entriesByLabel.get(option.id) ?? []) {
        const yearEntries = entriesByYear.get(entry.year) ?? [];
        yearEntries.push(entry);
        entriesByYear.set(entry.year, yearEntries);
      }
      return [...entriesByYear.entries()]
        .sort(([firstYear], [secondYear]) => firstYear - secondYear)
        .map(([year, entries]) => {
          const group = incomeAnalysisLabelGroup(option, entries);
          return {
            year,
            label: option.id,
            labelText: option.label,
            icon: option.icon,
            gross: group.gross,
            taxes: group.taxes,
            social: group.social,
            deductions: group.deductions,
            net: group.net
          };
        });
    })
    .sort((first, second) => first.year - second.year || first.label.localeCompare(second.label));
}

function incomeAnalysisLabelEntry(
  entry: IncomeYearEntry,
  option: IncomeAnalysisLabelOption
): IncomeAnalysisLabelEntry {
  return {
    id: entry.id,
    year: entry.year,
    label: option.id,
    labelText: option.label,
    icon: option.icon,
    person: entry.person,
    source: entry.source,
    employer: entry.employer,
    gross: incomeAnalysisGross(entry),
    taxes: incomeYearEntryTaxTotal(entry),
    social: numberValue(incomeTaxDeductionItemsSocialTotal(entry.taxDeductionItems)),
    deductions: numberValue(incomeYearEntryTaxDeductions(entry)),
    net: numberValue(incomeYearEntryNetIncome(entry))
  };
}

function incomeAnalysisGross(entry: IncomeYearEntry): number {
  const gross = numberValue(entry.annualGrossIncome);
  if (gross > 0) return gross;
  return numberValue(incomeYearEntryNetIncome(entry)) + numberValue(incomeYearEntryTaxDeductions(entry));
}

function numberValue(value: number | null | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

function roundCents(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}
