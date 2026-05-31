import type {
  CareerMilestone,
  IncomeResolvedSource,
  IncomeTaxDeductionField,
  IncomeTaxDeductionItems,
  IncomeTrackerState,
  IncomeYearEntry
} from "../types";

export const INCOME_SOURCE_LABELS: Record<IncomeResolvedSource, string> = {
  annual_statement: "bestaetigt durch Jahresentgeltabrechnung",
  manual: "manuell eingetragener Jahreswert"
};

export interface IncomeYearAnalysis {
  year: number;
  annualStatementNet: number | null;
  manualNet: number | null;
  annualNet: number | null;
  source: IncomeResolvedSource | null;
  ratioNet: number;
  ratioGross: number;
  netRatio: number | null;
  realNet: number | null;
  milestones: CareerMilestone[];
}

export interface IncomeProjectionPoint {
  year: number;
  value: number;
  projected: boolean;
}

export interface IncomeProjectionHorizon {
  years: number;
  year: number;
  value: number;
}

export interface IncomeProjectionModel {
  enabled: boolean;
  rate: number | null;
  modeLabel: string;
  points: IncomeProjectionPoint[];
  horizons: IncomeProjectionHorizon[];
}

export interface IncomeChartSummary {
  title: string;
  text: string;
}

export interface IncomeTrackerModel {
  years: IncomeYearAnalysis[];
  valueYears: IncomeYearAnalysis[];
  latest: IncomeYearAnalysis | null;
  previous: IncomeYearAnalysis | null;
  first: IncomeYearAnalysis | null;
  yearlyGrowthAmount: number | null;
  yearlyGrowthPercent: number | null;
  averageGrowthRate: number | null;
  bestYear: IncomeYearAnalysis | null;
  weakestYear: IncomeYearAnalysis | null;
  extraMonthlySpace: number | null;
  savingsSharePercent: number | null;
  additionalSavingsRate: number | null;
  ratioYears: IncomeYearAnalysis[];
  averageNetRatio: number | null;
  latestRatioYear: IncomeYearAnalysis | null;
  previousRatioYear: IncomeYearAnalysis | null;
  netRatioChange: number | null;
  projection: IncomeProjectionModel;
  chartSummaries: IncomeChartSummary[];
}

export interface IncomeTrackerModelOptions {
  annualInflationRatePercent?: number | null;
}

const PROJECTION_HORIZONS = [5, 10, 15] as const;
const TAX_DEDUCTION_FIELDS: IncomeTaxDeductionField[] = [
  "wageTax",
  "solidaritySurcharge",
  "churchTax",
  "pensionInsurance",
  "healthInsurance",
  "careInsurance",
  "unemploymentInsurance"
];

export function buildIncomeTrackerModel(tracker: IncomeTrackerState, options: IncomeTrackerModelOptions = {}): IncomeTrackerModel {
  const years = buildYearAnalyses(tracker);
  applyInflationValues(years, options.annualInflationRatePercent ?? null);

  const valueYears = years.filter((year) => year.annualNet !== null);
  const latest = last(valueYears);
  const previous = valueYears.length > 1 ? valueYears[valueYears.length - 2] : null;
  const first = valueYears[0] ?? null;
  const yearlyGrowthAmount = latest && previous ? latest.annualNet! - previous.annualNet! : null;
  const yearlyGrowthPercent =
    latest && previous && previous.annualNet !== null && previous.annualNet !== 0
      ? (yearlyGrowthAmount! / previous.annualNet) * 100
      : null;
  const averageGrowthRate =
    first && latest && first.year !== latest.year && first.annualNet !== null && latest.annualNet !== null && first.annualNet > 0
      ? Math.pow(latest.annualNet / first.annualNet, 1 / (latest.year - first.year)) - 1
      : null;
  const bestYear = valueYears.reduce<IncomeYearAnalysis | null>(
    (best, year) => (!best || year.annualNet! > best.annualNet! ? year : best),
    null
  );
  const weakestYear = valueYears.reduce<IncomeYearAnalysis | null>(
    (weakest, year) => (!weakest || year.annualNet! < weakest.annualNet! ? year : weakest),
    null
  );
  const extraMonthlySpace = yearlyGrowthAmount !== null ? yearlyGrowthAmount / 12 : null;
  const savingsSharePercent = tracker.settings.savingsSharePercent;
  const additionalSavingsRate =
    extraMonthlySpace !== null && savingsSharePercent !== null ? (extraMonthlySpace * savingsSharePercent) / 100 : null;
  const ratioYears = years.filter((year) => year.netRatio !== null);
  const averageNetRatio = ratioYears.length
    ? ratioYears.reduce((sum, year) => sum + year.netRatio!, 0) / ratioYears.length
    : null;
  const latestRatioYear = last(ratioYears);
  const previousRatioYear = ratioYears.length > 1 ? ratioYears[ratioYears.length - 2] : null;
  const netRatioChange =
    latestRatioYear && previousRatioYear ? latestRatioYear.netRatio! - previousRatioYear.netRatio! : null;
  const projection = buildProjection(tracker, valueYears, averageGrowthRate);

  const modelWithoutSummaries = {
    years,
    valueYears,
    latest,
    previous,
    first,
    yearlyGrowthAmount,
    yearlyGrowthPercent,
    averageGrowthRate,
    bestYear,
    weakestYear,
    extraMonthlySpace,
    savingsSharePercent,
    additionalSavingsRate,
    ratioYears,
    averageNetRatio,
    latestRatioYear,
    previousRatioYear,
    netRatioChange,
    projection,
    chartSummaries: []
  };

  return {
    ...modelWithoutSummaries,
    chartSummaries: buildChartSummaries(modelWithoutSummaries)
  };
}

export function incomeYearEntryNetIncome(entry: IncomeYearEntry): number | null {
  const calculatedNet = incomeYearEntryCalculatedNetIncome(entry);
  return calculatedNet ?? (entry.annualNetIncome === null ? null : roundCents(entry.annualNetIncome));
}

export function incomeYearEntryCalculatedNetIncome(entry: IncomeYearEntry): number | null {
  const taxDeductions = incomeYearEntryTaxDeductions(entry);
  if (entry.annualGrossIncome === null || taxDeductions === null) return null;
  return roundCents(entry.annualGrossIncome - taxDeductions);
}

export function incomeYearEntryTaxDeductions(entry: IncomeYearEntry): number | null {
  const itemTotal = incomeTaxDeductionItemsTotal(entry.taxDeductionItems);
  return itemTotal ?? (entry.taxesAndDeductions === null ? null : roundCents(entry.taxesAndDeductions));
}

export function incomeTaxDeductionItemsTotal(items: IncomeTaxDeductionItems): number | null {
  const values = TAX_DEDUCTION_FIELDS.map((field) => items[field]);
  if (!values.some((value) => value !== null && value !== undefined)) return null;
  return roundCents(values.reduce((sum, value) => sum + numberValue(value), 0));
}

export function emptyIncomeTaxDeductionItems(): IncomeTaxDeductionItems {
  return {
    wageTax: null,
    solidaritySurcharge: null,
    churchTax: null,
    pensionInsurance: null,
    healthInsurance: null,
    careInsurance: null,
    unemploymentInsurance: null
  };
}

function buildYearAnalyses(tracker: IncomeTrackerState): IncomeYearAnalysis[] {
  const yearMap = new Map<number, IncomeYearAnalysis>();
  const getYear = (yearNumber: number): IncomeYearAnalysis => {
    const existing = yearMap.get(yearNumber);
    if (existing) return existing;
    const year: IncomeYearAnalysis = {
      year: yearNumber,
      annualStatementNet: null,
      manualNet: null,
      annualNet: null,
      source: null,
      ratioNet: 0,
      ratioGross: 0,
      netRatio: null,
      realNet: null,
      milestones: []
    };
    yearMap.set(yearNumber, year);
    return year;
  };

  for (const entry of tracker.yearlyEntries) {
    const netIncome = incomeYearEntryNetIncome(entry);
    if (!validYear(entry.year) || netIncome === null) continue;
    const year = getYear(entry.year);
    if (entry.source === "annual_statement") {
      year.annualStatementNet = (year.annualStatementNet ?? 0) + netIncome;
    } else {
      year.manualNet = (year.manualNet ?? 0) + netIncome;
    }
    addNetRatioBasis(year, entry, netIncome);
  }

  for (const milestone of tracker.milestones) {
    const year = milestone.linkedYear ?? yearFromDate(milestone.date);
    if (!validYear(year)) continue;
    getYear(year).milestones.push(milestone);
  }

  const years = Array.from(yearMap.values()).sort((firstYear, secondYear) => firstYear.year - secondYear.year);
  for (const year of years) {
    if (year.annualStatementNet !== null) {
      year.annualNet = year.annualStatementNet;
      year.source = "annual_statement";
    } else if (year.manualNet !== null) {
      year.annualNet = year.manualNet;
      year.source = "manual";
    }

    if (year.ratioGross > 0) {
      year.netRatio = (year.ratioNet / year.ratioGross) * 100;
    }
  }

  return years;
}

function addNetRatioBasis(year: IncomeYearAnalysis, entry: IncomeYearEntry, netIncome: number): void {
  if (entry.annualGrossIncome === null || entry.annualGrossIncome <= 0) return;
  year.ratioNet += netIncome;
  year.ratioGross += entry.annualGrossIncome;
}

function applyInflationValues(years: IncomeYearAnalysis[], annualInflationRatePercent: number | null): void {
  if (annualInflationRatePercent === null || !Number.isFinite(annualInflationRatePercent) || annualInflationRatePercent <= -100) return;
  const baseYear = years.find((year) => year.annualNet !== null)?.year ?? null;
  if (baseYear === null) return;
  const annualRate = annualInflationRatePercent / 100;
  for (const year of years) {
    if (year.annualNet === null) continue;
    const factor = Math.pow(1 + annualRate, year.year - baseYear);
    if (Number.isFinite(factor) && factor !== 0) {
      year.realNet = year.annualNet / factor;
    }
  }
}

function buildProjection(
  tracker: IncomeTrackerState,
  valueYears: IncomeYearAnalysis[],
  averageGrowthRate: number | null
): IncomeProjectionModel {
  const latest = last(valueYears);
  if (tracker.settings.projectionMode === "off" || !latest || latest.annualNet === null) {
    return { enabled: false, rate: null, modeLabel: "", points: [], horizons: [] };
  }

  let rate: number | null = null;
  let modeLabel = "";
  if (tracker.settings.projectionMode === "manual" && tracker.settings.manualGrowthRatePercent !== null) {
    rate = tracker.settings.manualGrowthRatePercent / 100;
    modeLabel = "manuelle Wachstumsrate";
  }
  if (tracker.settings.projectionMode === "historical_average" && averageGrowthRate !== null) {
    rate = averageGrowthRate;
    modeLabel = "historische Wachstumsrate";
  }
  if (rate === null) {
    return { enabled: true, rate: null, modeLabel, points: [], horizons: [] };
  }

  const points = Array.from({ length: 16 }, (_, offset) => ({
    year: latest.year + offset,
    value: latest.annualNet! * Math.pow(1 + rate!, offset),
    projected: offset > 0
  }));
  const horizons = PROJECTION_HORIZONS.map((years) => ({
    years,
    year: latest.year + years,
    value: latest.annualNet! * Math.pow(1 + rate!, years)
  }));
  return { enabled: true, rate, modeLabel, points, horizons };
}

function buildChartSummaries(model: Omit<IncomeTrackerModel, "chartSummaries">): IncomeChartSummary[] {
  return [
    {
      title: "Jahresnettoeinkommen",
      text: model.valueYears.length
        ? `${model.valueYears.length} Jahr(e), aktuell ${model.latest?.year} mit ${roundMoney(model.latest?.annualNet)}.`
        : "Keine Jahreswerte vorhanden."
    },
    {
      title: "Jaehrlicher Zuwachs",
      text:
        model.yearlyGrowthAmount !== null && model.previous
          ? `Letzte Veraenderung: ${roundMoney(model.yearlyGrowthAmount)} gegenueber ${model.previous.year}.`
          : "Mindestens zwei Jahreswerte noetig."
    },
    {
      title: "Inflationsbereinigung",
      text: model.valueYears.some((year) => year.realNet !== null)
        ? "Nominale und reale Werte nutzen die allgemeine Jahresinflation des Kontos."
        : "Keine realen Werte verfuegbar."
    },
    {
      title: "Nettoquote",
      text: model.ratioYears.length
        ? `${model.ratioYears.length} Jahr(e), Durchschnitt ${roundPercent(model.averageNetRatio)}.`
        : "Keine Jahre mit Brutto-/Netto-Daten."
    },
    {
      title: "Zukunftsprojektion",
      text:
        model.projection.horizons.length && model.projection.rate !== null
          ? `Aktiv mit ${roundPercent(model.projection.rate * 100)} Wachstumsannahme.`
          : "Keine aktive oder berechenbare Projektion."
    }
  ];
}

function numberValue(value: number | null): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function roundCents(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function validYear(value: number | null): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1900 && value <= 2200;
}

function yearFromDate(value: string): number | null {
  const match = value.match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
}

function last<T>(items: T[]): T | null {
  return items.length ? items[items.length - 1] : null;
}

function roundMoney(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${Math.round(value).toLocaleString("de-DE")} EUR`;
}

function roundPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}
