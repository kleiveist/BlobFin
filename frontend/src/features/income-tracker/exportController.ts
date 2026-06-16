import { createId } from "../../data/defaults";
import { INCOME_YEAR_LABEL_OPTIONS } from "../../domain/incomeLabels";
import {
  DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT,
  emptyIncomeTaxAdjustment,
  emptyIncomeTaxDeductionItems,
  incomeYearEntryNetIncome,
  incomeYearEntryTaxDeductions,
  incomeTaxDeductionItemsTotal,
  type IncomeTrackerModel,
  INCOME_SOURCE_LABELS
} from "../../domain/incomeTracker";
import { normalizeIncomeTaxRuleLabel } from "../../domain/incomeTaxRules";
import { exportIncomePlanningCsv, incomePlanningFromCsvRows, parseCsv } from "../../lib/csv";
import { clamp, escapeHtml, money, normalizeHeader, percent } from "../../lib/format";
import type {
  AppState,
  CareerMilestone,
  CareerMilestoneImpact,
  IncomeEmploymentContext,
  IncomeMinijobType,
  IncomePerson,
  IncomeProjectionMode,
  IncomeStudentEmploymentMode,
  IncomeTaxAdjustmentType,
  IncomeTaxDeductionField,
  IncomeTaxDeductionItems,
  IncomeYearEntry,
  IncomeYearEntrySource
} from "../../types";
import { closeIncomePlanningDialog, closeIncomeStampPlannerDialog } from "../income-planning";
import {
  INCOME_PROJECTION_MODES,
  INCOME_TAX_DEDUCTION_ROWS
} from "./config";

export interface IncomeTrackerExportContext {
  getState(): AppState;
  renderAll(): void;
  exportCsvFile(fileName: string, contents: string, label: string, showStatus?: (message: string) => void): Promise<void>;
  incomeTrackerModel(): IncomeTrackerModel;
  sanitizeIncomeYearEntriesWithTaxRules(entries: IncomeYearEntry[]): IncomeYearEntry[];
}

let exportStatusTimeoutId: number | undefined;

export async function importIncomeCsvFromFileWithContext(file: File | undefined, context: IncomeTrackerExportContext): Promise<void> {
  if (!file) return;
  const text = await file.text();
  const imported = incomeTrackerEntriesFromCsvRows(parseCsv(text), context);
  const importedCount = imported.yearlyEntries.length + imported.milestones.length;
  if (!importedCount) {
    window.alert("Keine gueltigen Einkommen-CSV-Daten gefunden.");
    return;
  }

  context.getState().incomeTracker = {
    ...context.getState().incomeTracker,
    yearlyEntries: context.sanitizeIncomeYearEntriesWithTaxRules(imported.yearlyEntries),
    milestones: imported.milestones,
    settings: {
      ...context.getState().incomeTracker.settings,
      activeInputTab: imported.yearlyEntries.length ? "yearly" : imported.milestones.length ? "milestones" : "settings"
    }
  };
  context.renderAll();
  showIncomeExportStatus(`${importedCount} Eintraege aus CSV importiert.`);
}

export async function exportIncomeCsvWithContext(context: IncomeTrackerExportContext): Promise<void> {
  const model = context.incomeTrackerModel();
  await context.exportCsvFile("jahresnettoeinkommen.csv", incomeTrackerCsv(model, context), "Einkommen-CSV");
  showIncomeExportStatus("CSV-Export wurde erstellt.");
}

export async function importIncomePlanningCsvFromFileWithContext(file: File | undefined, context: IncomeTrackerExportContext): Promise<void> {
  if (!file) return;
  const text = await file.text();
  const imported = incomePlanningFromCsvRows(parseCsv(text));
  if (!imported) {
    window.alert("Keine gueltigen Zeitbudget-CSV-Daten gefunden.");
    return;
  }

  const importedCount =
    imported.workBlocks.length +
    imported.habits.length +
    imported.manualBlocks.length +
    imported.calendarStamps.length +
    imported.plannedStamps.length +
    imported.assumptions.sleepSlots.length;
  context.getState().incomePlanning = imported;
  closeIncomePlanningDialog();
  closeIncomeStampPlannerDialog();
  context.renderAll();
  showIncomePlanningExportStatus(`${importedCount} Zeitbudget-Eintraege aus CSV importiert.`);
}

export async function exportIncomePlanningCsvFileWithContext(context: IncomeTrackerExportContext): Promise<void> {
  await context.exportCsvFile(
    "zeitbudget-und-habits.csv",
    exportIncomePlanningCsv(context.getState().incomePlanning),
    "Zeitbudget-CSV",
    showIncomePlanningExportStatus
  );
}

export function exportIncomePdfWithContext(context: IncomeTrackerExportContext): void {
  const model = context.incomeTrackerModel();
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    showIncomeExportStatus("PDF-Auswertung konnte nicht geoeffnet werden.");
    return;
  }
  reportWindow.document.open();
  reportWindow.document.write(incomePdfHtml(model, context));
  reportWindow.document.close();
  reportWindow.focus();
  window.setTimeout(() => reportWindow.print(), 250);
  showIncomeExportStatus("PDF-Auswertung wurde im Druckdialog vorbereitet.");
}

function incomeTrackerCsv(model: IncomeTrackerModel, context: IncomeTrackerExportContext): string {
  const rows: string[][] = [["section", "id", "year", "month", "person", "field", "value", "source"]];
  for (const entry of context.getState().incomeTracker.yearlyEntries) {
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "active", String(entry.active), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "visible", String(entry.visible), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "label", entry.label, entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "annualNetIncome", csvValue(incomeYearEntryNetIncome(entry)), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "annualGrossIncome", csvValue(entry.annualGrossIncome), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "taxesAndDeductions", csvValue(entry.taxesAndDeductions), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "taxAdjustmentType", entry.taxAdjustment.type, entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "taxAdjustmentAmount", csvValue(entry.taxAdjustment.amount), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "capitalGainsAllowance", csvValue(entry.capitalGainsAllowance), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "capitalGainsChurchTaxEnabled", String(entry.capitalGainsChurchTaxEnabled), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "capitalGainsChurchTaxRatePercent", csvValue(entry.capitalGainsChurchTaxRatePercent), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "employmentContext", entry.employmentContext ?? "job_loss", entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "minijobType", entry.minijobType ?? "commercial", entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "considerPensionInsurance", String(Boolean(entry.considerPensionInsurance)), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "isRvExempt", String(Boolean(entry.isRvExempt)), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "shortTermEmploymentDays", csvValue(entry.shortTermEmploymentDays ?? null), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "shortTermEmploymentMonths", csvValue(entry.shortTermEmploymentMonths ?? null), entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "studentEmploymentMode", entry.studentEmploymentMode ?? "minijob", entry.source]);
    rows.push(["yearly", entry.id, String(entry.year), "", entry.person, "requiresManualTaxReview", String(Boolean(entry.requiresManualTaxReview)), entry.source]);
    for (const row of INCOME_TAX_DEDUCTION_ROWS) {
      rows.push([
        "yearly_tax_detail",
        entry.id,
        String(entry.year),
        "",
        entry.person,
        `${row.nr} ${row.label}`,
        csvValue(entry.taxDeductionItems[row.field]),
        entry.source
      ]);
    }
  }
  for (const entry of context.getState().incomeTracker.milestones) {
    rows.push(["milestone", entry.id, String(entry.linkedYear ?? ""), entry.date, "", entry.type, entry.impact, ""]);
    rows.push(["milestone", entry.id, String(entry.linkedYear ?? ""), entry.date, "", "description", entry.description, ""]);
  }
  for (const year of model.years) {
    rows.push(["calculated", "", String(year.year), "", "", "annualNet", csvValue(year.annualNet), year.source ?? ""]);
    rows.push(["calculated", "", String(year.year), "", "", "netRatio", csvValue(year.netRatio), "gross_net"]);
    rows.push(["calculated", "", String(year.year), "", "", "realNet", csvValue(year.realNet), "general_inflation"]);
  }
  for (const item of model.chartSummaries) {
    rows.push(["chart_summary", "", "", "", "", item.title, item.text, "calculated"]);
  }
  rows.push(["data_basis", "", "", "", "", "Hinweis", "Nur Nutzereingaben, berechnete Werte und aktivierte Annahmen.", ""]);
  return rows.map((row) => row.map(incomeCsvCell).join(";")).join("\n");
}

function incomeTrackerEntriesFromCsvRows(rows: string[][], context: IncomeTrackerExportContext): {
  yearlyEntries: IncomeYearEntry[];
  milestones: CareerMilestone[];
} {
  const emptyImport = { yearlyEntries: [], milestones: [] };
  if (!rows.length) return emptyImport;

  const header = rows[0].map((value) => value.trim().replace(/^\uFEFF/, "").toLowerCase());
  const hasHeader = header.includes("section") && header.includes("field");
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const get = (row: string[], names: string[], fallbackIndex: number): string => {
    if (hasHeader) {
      for (const name of names) {
        const index = header.indexOf(name);
        if (index >= 0) return row[index] ?? "";
      }
    }
    return fallbackIndex >= 0 ? row[fallbackIndex] ?? "" : "";
  };

  const yearlyEntries = new Map<string, IncomeYearEntry>();
  const milestones = new Map<string, CareerMilestone>();

  dataRows.forEach((row, index) => {
    const section = get(row, ["section"], 0).trim().toLowerCase();
    const sourceId = get(row, ["id"], 1).trim();
    const rowKey = sourceId || String(index);
    const field = get(row, ["field"], 5).trim();
    const fieldKey = field.toLowerCase();
    const value = get(row, ["value"], 6).trim();
    const yearValue = get(row, ["year"], 2).trim();
    const monthValue = get(row, ["month"], 3).trim();
    const personValue = get(row, ["person"], 4).trim();
    const sourceValue = get(row, ["source"], 7).trim();

    if (section === "yearly" || section === "yearly_tax_detail") {
      const key = `yearly-${rowKey}`;
      const entry =
        yearlyEntries.get(key) ??
        ({
          id: createId(),
          active: true,
          visible: true,
          year: incomeCsvYear(yearValue, context.getState().settings.year),
          label: "salary",
          person: incomePerson(personValue),
          annualNetIncome: null,
          annualGrossIncome: null,
          taxesAndDeductions: null,
          taxDeductionItems: emptyIncomeTaxDeductionItems(),
          taxAdjustment: emptyIncomeTaxAdjustment(),
          capitalGainsAllowance: null,
          capitalGainsChurchTaxEnabled: false,
          capitalGainsChurchTaxRatePercent: DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT,
          employmentContext: "job_loss",
          minijobType: "commercial",
          considerPensionInsurance: false,
          isRvExempt: false,
          shortTermEmploymentDays: null,
          shortTermEmploymentMonths: null,
          studentEmploymentMode: "minijob",
          requiresManualTaxReview: false,
          employer: "",
          note: "",
          source: incomeYearSource(sourceValue)
        } satisfies IncomeYearEntry);
      entry.year = incomeCsvYear(yearValue, entry.year);
      entry.person = incomePerson(personValue || entry.person);
      entry.source = incomeYearSource(sourceValue || entry.source);
      if (section === "yearly_tax_detail") {
        const taxField = incomeTaxDeductionFieldFromCsv(field);
        if (taxField) {
          entry.taxDeductionItems = { ...entry.taxDeductionItems, [taxField]: incomeCsvNumber(value) };
          entry.taxesAndDeductions = incomeTaxDeductionItemsTotal(entry.taxDeductionItems);
        }
      } else if (fieldKey === "active") {
        entry.active = incomeCsvBoolean(value, true);
      } else if (fieldKey === "visible") {
        entry.visible = incomeCsvBoolean(value, true);
      } else if (fieldKey === "annualnetincome") {
        entry.annualNetIncome = incomeCsvNumber(value);
      } else if (fieldKey === "label") {
        entry.label = incomeYearLabel(value);
      } else if (fieldKey === "annualgrossincome") {
        entry.annualGrossIncome = incomeCsvNumber(value);
      } else if (fieldKey === "taxesanddeductions") {
        entry.taxesAndDeductions = incomeCsvNumber(value);
      } else if (fieldKey === "taxadjustmenttype") {
        entry.taxAdjustment = { ...entry.taxAdjustment, type: incomeTaxAdjustmentType(value) };
      } else if (fieldKey === "taxadjustmentamount") {
        entry.taxAdjustment = { ...entry.taxAdjustment, amount: incomeCsvNumber(value) };
      } else if (fieldKey === "capitalgainsallowance") {
        entry.capitalGainsAllowance = incomeCsvNumber(value);
      } else if (fieldKey === "capitalgainschurchtaxenabled") {
        entry.capitalGainsChurchTaxEnabled = incomeCsvBoolean(value, false);
      } else if (fieldKey === "capitalgainschurchtaxratepercent") {
        entry.capitalGainsChurchTaxRatePercent = capitalGainsChurchTaxRate(incomeCsvNumber(value));
      } else if (fieldKey === "employmentcontext") {
        entry.employmentContext = incomeEmploymentContext(value);
      } else if (fieldKey === "minijobtype") {
        entry.minijobType = incomeMinijobType(value);
      } else if (fieldKey === "considerpensioninsurance") {
        entry.considerPensionInsurance = incomeCsvBoolean(value, false);
      } else if (fieldKey === "isrvexempt") {
        entry.isRvExempt = incomeCsvBoolean(value, false);
      } else if (fieldKey === "shorttermemploymentdays") {
        entry.shortTermEmploymentDays = incomeCsvNumber(value);
      } else if (fieldKey === "shorttermemploymentmonths") {
        entry.shortTermEmploymentMonths = incomeCsvNumber(value);
      } else if (fieldKey === "studentemploymentmode") {
        entry.studentEmploymentMode = incomeStudentEmploymentMode(value);
      } else if (fieldKey === "requiresmanualtaxreview") {
        entry.requiresManualTaxReview = incomeCsvBoolean(value, false);
      } else if (fieldKey === "employer") {
        entry.employer = value;
      }
      yearlyEntries.set(key, entry);
      return;
    }

    if (section === "milestone") {
      const key = `milestone-${rowKey}`;
      const entry =
        milestones.get(key) ??
        ({
          id: createId(),
          date: monthValue,
          type: "Sonstiges",
          description: "",
          impact: "positive",
          linkedYear: incomeCsvYearOrNull(yearValue)
        } satisfies CareerMilestone);
      entry.date = monthValue || entry.date;
      entry.linkedYear = incomeCsvYearOrNull(yearValue) ?? entry.linkedYear;
      if (fieldKey === "description") {
        entry.description = value;
      } else if (field) {
        entry.type = field;
        entry.impact = incomeMilestoneImpact(value);
      }
      milestones.set(key, entry);
      return;
    }

  });

  return {
    yearlyEntries: Array.from(yearlyEntries.values()).filter(incomeCsvYearlyEntryHasData),
    milestones: Array.from(milestones.values()).filter((entry) => entry.date || entry.description || entry.type !== "Sonstiges")
  };
}

function incomeCsvYearlyEntryHasData(entry: IncomeYearEntry): boolean {
  return (
    entry.annualNetIncome !== null ||
    entry.annualGrossIncome !== null ||
    entry.taxesAndDeductions !== null ||
    entry.capitalGainsAllowance !== null ||
    entry.capitalGainsChurchTaxEnabled ||
    incomeTaxDeductionItemsTotal(entry.taxDeductionItems) !== null ||
    incomeTaxDeductionItemsHaveData(entry.taxDeductionItems) ||
    entry.taxAdjustment.amount !== null
  );
}

function incomeTaxDeductionItemsHaveData(items: IncomeTaxDeductionItems): boolean {
  return INCOME_TAX_DEDUCTION_ROWS.some((row) => items[row.field] !== null && items[row.field] !== undefined);
}

function incomeCsvNumber(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  const cleaned = text.replace(/[^\d,.-]/g, "");
  const normalized = cleaned.includes(",") ? cleaned.replaceAll(".", "").replace(",", ".") : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function incomeCsvBoolean(value: string, fallback: boolean): boolean {
  const text = normalizeHeader(value);
  if (!text) return fallback;
  if (["true", "1", "ja", "yes", "aktiv", "sichtbar"].includes(text)) return true;
  if (["false", "0", "nein", "no", "inaktiv", "aus", "unsichtbar"].includes(text)) return false;
  return fallback;
}

function incomeCsvYear(value: string, fallback: number): number {
  const parsed = incomeCsvNumber(value);
  return parsed === null ? fallback : clamp(Math.round(parsed), 1900, 2200);
}

function incomeCsvYearOrNull(value: string): number | null {
  const parsed = incomeCsvNumber(value);
  return parsed === null ? null : clamp(Math.round(parsed), 1900, 2200);
}

function incomeTaxDeductionFieldFromCsv(value: string): IncomeTaxDeductionField | null {
  const text = value.toLowerCase();
  if (text.includes("kirchensteuer zur kapitalertragsteuer")) return "capitalGainsChurchTax";
  if (text.includes("solidar") && text.includes("kapitalertragsteuer")) return "capitalGainsSolidaritySurcharge";
  if (text.includes("kapitalertragsteuer")) return "capitalGainsTax";
  if (text.startsWith("4 ") || text.includes("lohnsteuer")) return "wageTax";
  if (text.startsWith("5 ") || text.includes("solidar")) return "solidaritySurcharge";
  if (text.startsWith("6 ") || text.includes("kirchensteuer")) return "churchTax";
  if (text.startsWith("22 ") || text.includes("arbeitgeber")) return "employerPensionInsurance";
  if (text.startsWith("23 ") || text.includes(" rv") || text.includes("renten")) return "pensionInsurance";
  if (text.startsWith("25 ") || text.includes(" kv") || text.includes("kranken")) return "healthInsurance";
  if (text.startsWith("26 ") || text.includes(" pv") || text.includes("pflege")) return "careInsurance";
  if (text.startsWith("27 ") || text.includes(" av") || text.includes("arbeitslosen")) return "unemploymentInsurance";
  return null;
}

function incomePdfHtml(model: IncomeTrackerModel, context: IncomeTrackerExportContext): string {
  const yearlyInputRows = context.getState().incomeTracker.yearlyEntries
    .map(
      (entry) => `
      <tr>
        <td>${entry.active ? "Ja" : "Nein"}</td>
        <td>${entry.visible ? "Ja" : "Nein"}</td>
        <td>${entry.year}</td>
        <td>${escapeHtml(incomeYearLabelMeta(entry.label).label)}</td>
        <td>${incomeYearEntryNetIncome(entry) !== null ? money(incomeYearEntryNetIncome(entry) ?? 0) : "-"}</td>
        <td>${entry.annualGrossIncome !== null ? money(entry.annualGrossIncome) : "-"}</td>
        <td>${incomeYearEntryTaxDeductions(entry) !== null ? money(incomeYearEntryTaxDeductions(entry) ?? 0) : "-"}</td>
        <td>${escapeHtml(INCOME_SOURCE_LABELS[entry.source])}</td>
      </tr>`
    )
    .join("");
  const milestoneRows = context.getState().incomeTracker.milestones
    .map(
      (entry) => `
      <tr>
        <td>${escapeHtml(entry.date)}</td>
        <td>${escapeHtml(entry.type)}</td>
        <td>${escapeHtml(entry.impact)}</td>
        <td>${entry.linkedYear ?? "-"}</td>
        <td>${escapeHtml(entry.description)}</td>
      </tr>`
    )
    .join("");
  const yearRows = model.years
    .map(
      (year) => `
      <tr>
        <td>${year.year}</td>
        <td>${year.annualNet !== null ? money(year.annualNet) : "-"}</td>
        <td>${year.source ? INCOME_SOURCE_LABELS[year.source] : "nur Meilenstein"}</td>
        <td>${year.netRatio !== null ? percent(year.netRatio) : "-"}</td>
        <td>${year.realNet !== null ? money(year.realNet) : "-"}</td>
      </tr>`
    )
    .join("");
  const projectionRows = model.projection.horizons
    .map((item) => `<tr><td>${item.years} Jahre</td><td>${item.year}</td><td>${money(item.value)}</td></tr>`)
    .join("");
  return `<!doctype html>
    <html lang="de">
      <head>
        <meta charset="utf-8" />
        <title>Jahresnettoeinkommen Auswertung</title>
        <style>
          body { color: #1f2528; font-family: Arial, sans-serif; line-height: 1.45; margin: 32px; }
          h1 { margin-bottom: 4px; }
          h2 { font-size: 18px; margin-top: 28px; }
          table { border-collapse: collapse; font-size: 13px; margin-top: 10px; width: 100%; }
          th, td { border-bottom: 1px solid #d8d0c2; padding: 7px; text-align: left; }
          th { background: #f0ece3; }
          .note { color: #687071; }
        </style>
      </head>
      <body>
        <h1>Jahresnettoeinkommen Auswertung</h1>
        <p class="note">Erstellt am ${escapeHtml(new Date().toLocaleString("de-DE"))}. Datenbasis: Nur Nutzereingaben, berechnete Werte und aktivierte Annahmen.</p>
        <h2>Diagrammzusammenfassung</h2>
        <ul>${model.chartSummaries.map((item) => `<li><strong>${escapeHtml(item.title)}:</strong> ${escapeHtml(item.text)}</li>`).join("")}</ul>
        <h2>Jahreswerte</h2>
        <table>
          <thead><tr><th>Aktiv</th><th>View</th><th>Jahr</th><th>Label</th><th>Jahresnetto</th><th>Jahresbrutto</th><th>Steuer / Abgaben</th><th>Status</th></tr></thead>
          <tbody>${yearlyInputRows || '<tr><td colspan="8">Keine Jahreswerte vorhanden.</td></tr>'}</tbody>
        </table>
        <h2>Karriere-Meilensteine</h2>
        <table>
          <thead><tr><th>Datum</th><th>Typ</th><th>Einfluss</th><th>Jahr</th><th>Beschreibung</th></tr></thead>
          <tbody>${milestoneRows || '<tr><td colspan="5">Keine Meilensteine vorhanden.</td></tr>'}</tbody>
        </table>
        <h2>Berechnete Jahreswerte</h2>
        <table>
          <thead><tr><th>Jahr</th><th>Jahresnetto</th><th>Status</th><th>Nettoquote</th><th>Realwert</th></tr></thead>
          <tbody>${yearRows || '<tr><td colspan="5">Keine Jahreswerte vorhanden.</td></tr>'}</tbody>
        </table>
        <h2>Projektion</h2>
        <table>
          <thead><tr><th>Horizont</th><th>Jahr</th><th>Prognostiziertes Jahresnetto</th></tr></thead>
          <tbody>${projectionRows || '<tr><td colspan="3">Keine Projektion aktiviert oder keine Projektionsrate verfuegbar.</td></tr>'}</tbody>
        </table>
      </body>
    </html>`;
}

export function nullableInputNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function incomeInteger(value: string, fallback: number): number {
  const parsed = nullableInputNumber(value);
  return parsed === null ? fallback : Math.round(parsed);
}

export function incomePerson(value: string): IncomePerson {
  if (value === "person1" || value === "person2" || value === "household") return value;
  return "household";
}

export function incomeYearSource(value: string): IncomeYearEntrySource {
  return value === "manual" ? "manual" : "annual_statement";
}

export function incomeEmploymentContext(value: string): IncomeEmploymentContext {
  if (value === "earned_claim" || value === "other") return value;
  return "job_loss";
}

export function incomeMinijobType(value: string): IncomeMinijobType {
  return value === "private_household" ? "private_household" : "commercial";
}

export function incomeStudentEmploymentMode(value: string): IncomeStudentEmploymentMode {
  return value === "short_term" ? "short_term" : "minijob";
}

export function incomeTaxAdjustmentType(value: string): IncomeTaxAdjustmentType {
  return value === "payment" ? "payment" : "refund";
}

function capitalGainsChurchTaxRate(value: number | null | undefined): number {
  return value === 8 ? 8 : DEFAULT_CAPITAL_GAINS_CHURCH_TAX_RATE_PERCENT;
}

export function incomeMilestoneImpact(value: string): CareerMilestoneImpact {
  if (value === "negative" || value === "neutral" || value === "positive") return value;
  return "positive";
}

export function incomeProjectionMode(value: string): IncomeProjectionMode {
  return INCOME_PROJECTION_MODES.includes(value as IncomeProjectionMode) ? (value as IncomeProjectionMode) : "off";
}

export function signedMoney(value: number): string {
  return `${value > 0 ? "+" : ""}${money(value)}`;
}

export function signedPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${percent(value)}`;
}

export function signedPercentagePoints(value: number): string {
  const formatted = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
  return `${value > 0 ? "+" : ""}${formatted} Prozentpunkte`;
}

function csvValue(value: number | string | null): string {
  return value === null ? "" : String(value);
}

function incomeCsvCell(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function cssEscape(value: string): string {
  const css = (globalThis as typeof globalThis & { CSS?: { escape?: (input: string) => string } }).CSS;
  return typeof css?.escape === "function" ? css.escape(value) : value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

export function showIncomeExportStatus(message: string): void {
  const status = document.querySelector<HTMLParagraphElement>("#incomeExportStatus");
  if (status) status.textContent = message;
  if (exportStatusTimeoutId) window.clearTimeout(exportStatusTimeoutId);
  exportStatusTimeoutId = window.setTimeout(() => {
    if (status) status.textContent = "";
    exportStatusTimeoutId = undefined;
  }, 3500);
}

export function showIncomePlanningExportStatus(message: string): void {
  const status = document.querySelector<HTMLSpanElement>("#incomePlanningExportStatus");
  if (status) status.textContent = message;
  if (exportStatusTimeoutId) window.clearTimeout(exportStatusTimeoutId);
  exportStatusTimeoutId = window.setTimeout(() => {
    if (status) status.textContent = "";
    exportStatusTimeoutId = undefined;
  }, 3500);
}

function incomeYearLabel(value: string | undefined): string {
  const normalized = normalizeIncomeTaxRuleLabel(String(value ?? "").trim());
  if (INCOME_YEAR_LABEL_OPTIONS.some((option) => option.id === normalized)) return normalized;
  const byLabel = INCOME_YEAR_LABEL_OPTIONS.find((option) => incomeLabelKey(option.label) === incomeLabelKey(normalized));
  return byLabel?.id ?? "salary";
}

function incomeYearLabelMeta(value: string | undefined): { id: string; label: string; icon: string; description: string } {
  return INCOME_YEAR_LABEL_OPTIONS.find((option) => option.id === incomeYearLabel(value)) ?? INCOME_YEAR_LABEL_OPTIONS[0];
}

function incomeLabelKey(value: string): string {
  return normalizeHeader(value);
}
