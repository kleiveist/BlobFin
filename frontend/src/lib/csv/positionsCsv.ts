import { createId, defaultPlanningSettings, MONTHS } from "../../data/defaults";
import { calculateMonthlyRows } from "../../domain/reserveCalculator";
import {
  cleanText,
  clamp,
  formatCsvNumber,
  labelForPayout,
  labelForFlow,
  labelForType,
  monthName,
  normalizeHeader
} from "../format";
import { defaultPositionIconForPosition, normalizePositionIcon, positionIconLabel } from "../positionIcons";
import { flowForType, isIncomeType, typeForFlow } from "../positionKinds";
import { positionPlanningYear } from "../planningYears";
import type {
  PlanningSettings,
  PayoutType,
  PositionCostBreakdownItem,
  PositionFlow,
  PositionType,
  ReservePosition
} from "../../types";
import { csvCell, parseMoneyValue } from "./parse";

type CsvRowGetter = (row: string[], keys: string[], fallbackIndex: number) => string;
type PositionCsvRowKind = "position" | "detail" | "unknown";

export function positionsFromCsvRows(rows: string[][]): ReservePosition[] {
  if (!rows.length) return [];

  const header = rows[0].map(normalizeHeader);
  const hasHeader =
    header.includes("name") ||
    header.includes("betrag") ||
    header.includes("art") ||
    header.includes("detailbetrag");
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const get = (row: string[], keys: string[], fallbackIndex: number): string => {
    if (hasHeader) {
      for (const key of keys) {
        const index = header.indexOf(key);
        if (index >= 0) return row[index] ?? "";
      }
    }
    return fallbackIndex >= 0 ? row[fallbackIndex] ?? "" : "";
  };

  const imported: Array<{ groupKey: string; position: ReservePosition }> = [];
  const detailsByGroupKey = new Map<string, PositionCostBreakdownItem[]>();

  for (const row of dataRows) {
    const rowKind = parsePositionCsvRowKind(get(row, ["datensatz", "zeilentyp", "csvtyp", "csvzeilentyp"], -1));
    const groupKey = positionCsvGroupKey(row, get);
    const detailItem = parsePositionCsvDetailItem(row, get);
    if (detailItem) {
      const details = detailsByGroupKey.get(groupKey) ?? [];
      details.push(detailItem);
      detailsByGroupKey.set(groupKey, details);
    }
    if (rowKind === "detail") continue;

    const position = parsePositionCsvPosition(row, get);
    if (!position) continue;
    imported.push({ groupKey, position });
  }

  return imported.map(({ groupKey, position }) => {
    const costBreakdown = normalizePositionCostBreakdown(detailsByGroupKey.get(groupKey));
    if (!positionCostBreakdownAllowed(position.flow, position.type, position.payoutType) || !costBreakdown.length) {
      return position;
    }

    const total = positionCostBreakdownTotal(costBreakdown);
    return {
      ...position,
      amount: total === null ? position.amount : total,
      costBreakdown
    };
  });
}

export function exportPositionsCsv(positions: ReservePosition[]): string {
  const rows = [
    [
      "Aktiv",
      "View",
      "Richtung",
      "Label",
      "Name",
      "Art",
      "Betrag",
      "Startmonat",
      "Endmonat",
      "Abgang",
      "Abgangsjahr",
      "Abgangsmonat",
      "Abgangstag",
      "Zinsen",
      "Cashback",
      "Planungsjahr",
      "Datensatz",
      "Positions-ID",
      "Detail-Nr",
      "Detailname",
      "Detailbetrag"
    ]
  ];

  for (const position of positions) {
    const costBreakdown = normalizePositionCostBreakdown(position.costBreakdown);
    const canExportDetails = positionCostBreakdownAllowed(position.flow, position.type, position.payoutType);
    const total = canExportDetails ? positionCostBreakdownTotal(costBreakdown) : null;
    const amount = total === null ? position.amount : total;
    const baseRow = positionCsvBaseRow(position, amount);

    rows.push([...baseRow, "Position", position.id, "", "", ""]);

    if (!canExportDetails) continue;
    costBreakdown.forEach((item, index) => {
      rows.push([
        ...baseRow,
        "Detail",
        position.id,
        String(index + 1),
        item.name,
        item.amount === null ? "" : formatCsvNumber(item.amount)
      ]);
    });
  }

  return rows.map((row) => row.map(csvCell).join(";")).join("\n");
}

export function exportYearTableCsv(
  settings: PlanningSettings,
  positions: ReservePosition[],
  includeMaxNeeded = false
): string {
  const rows = calculateMonthlyRows(settings, positions);
  const visiblePositions = positions.filter(
    (position) => position.active && position.visible && position.payoutType !== "once"
  );
  const csvRows = [
    [
      "Monat",
      ...visiblePositions.map((position) => position.name),
      "Einnahmen",
      "Ausgaben",
      "Netto uebrig",
      ...(includeMaxNeeded ? ["Max. benoetigter Kontostand am Monatsanfang"] : []),
      "Dauerhafter Bestand nach Abgaengen",
      "ca. Monatszins",
      "Cashback"
    ]
  ];

  for (const row of rows) {
    csvRows.push([
      row.month,
      ...visiblePositions.map((position) => formatCsvNumber(row.values[position.id] || 0)),
      formatCsvNumber(row.plannedIncome),
      formatCsvNumber(row.plannedOutflow),
      formatCsvNumber(row.monthlyRemaining),
      ...(includeMaxNeeded ? [formatCsvNumber(row.maxNeeded)] : []),
      formatCsvNumber(row.permanentAfterMonthlyOutflows),
      formatCsvNumber(row.monthlyInterest),
      formatCsvNumber(row.monthlyCashback)
    ]);
  }

  return csvRows.map((row) => row.map(csvCell).join(";")).join("\n");
}

function parsePositionCsvPosition(row: string[], get: CsvRowGetter): ReservePosition | null {
  const name = cleanText(get(row, ["name", "position"], 1));
  const amount = parseMoneyValue(get(row, ["betrag", "amount"], 3));
  if (!name) return null;
  const parsedType = parseTypeValue(get(row, ["art", "type"], 2));
  const flow = parseFlowValue(get(row, ["richtung", "flow", "typgruppe"], -1), flowForType(parsedType));
  const type = typeForFlow(parsedType, flow);
  const icon = normalizePositionIcon(
    get(row, ["label", "icon", "symbol", "bild"], -1),
    defaultPositionIconForPosition({ flow, type, name })
  );
  const planningYear = parsePlanningYearValue(get(row, ["planungsjahr", "planjahr", "planningyear"], -1));
  const exportedId = cleanText(
    get(row, ["positionsid", "positionid", "positionsschluessel", "positionkey", "csvpositionid"], -1)
  );

  const position: ReservePosition = {
    id: exportedId || createId(),
    planningYear,
    flow,
    active: parseBooleanValue(get(row, ["aktiv", "active"], 0), true),
    visible: parseBooleanValue(get(row, ["view", "visible", "sichtbar", "anzeigen"], -1), true),
    name,
    icon,
    type,
    amount,
    startMonth: parseMonthValue(get(row, ["startmonat", "anfangsmonat", "anfangmonat", "anfang", "start"], 4), 1),
    endMonth: parseMonthValue(get(row, ["endmonat", "ende", "end"], 5), 12),
    payoutType: parsePayoutValue(
      get(row, ["abgang", "eingang", "payout", "abgangsart", "zahlungsart"], 6),
      flow
    ),
    payoutYear: parseYearValue(
      get(row, ["jahr", "abgangsjahr", "eingangsjahr", "payoutyear", "year"], -1),
      defaultPlanningSettings().year
    ),
    payoutMonth: parseMonthValue(get(row, ["monat", "abgangsmonat", "eingangsmonat", "payoutmonth"], 7), 12),
    payoutDay: clamp(parseMoneyValue(get(row, ["tag", "abgangstag", "eingangstag", "payoutday"], 8)) || 31, 1, 31),
    interestBearing: parseBooleanValue(get(row, ["zinsen", "zins", "interest", "verzinsung"], -1), false),
    cashback: parseBooleanValue(get(row, ["cashback", "cashbackfrage"], 9), false)
  };
  if (position.flow === "income") {
    position.interestBearing = false;
    position.cashback = false;
    if (position.payoutType === "none" && position.type !== "incomeTemporary") {
      position.payoutType = defaultIncomePayoutType(position.type);
    }
  }
  if (position.flow === "expense" && position.type !== "temporary") position.cashback = false;
  if (position.payoutType === "once" && position.type !== "savings") {
    position.startMonth = position.payoutMonth;
    position.endMonth = position.payoutMonth;
    position.interestBearing = false;
  } else if (position.payoutType === "once") {
    position.interestBearing = false;
  }
  if (position.payoutType === "once") {
    position.planningYear = parsePlanningYearValue(position.payoutYear);
  }

  if (position.type !== "savings" && position.startMonth > position.endMonth) {
    const startMonth = position.startMonth;
    position.startMonth = position.endMonth;
    position.endMonth = startMonth;
  }

  return position;
}

function positionCsvBaseRow(position: ReservePosition, amount: number): string[] {
  return [
    position.active ? "Ja" : "Nein",
    position.visible ? "Ja" : "Nein",
    labelForFlow(position.flow),
    positionIconLabel(normalizePositionIcon(position.icon)),
    position.name,
    labelForType(position.type),
    formatCsvNumber(amount),
    monthName(position.startMonth),
    monthName(position.endMonth),
    labelForPayout(position.payoutType, position.flow),
    String(position.payoutYear),
    monthName(position.payoutMonth),
    String(position.payoutDay),
    position.interestBearing ? "Ja" : "Nein",
    position.cashback ? "Ja" : "Nein",
    formatPlanningYearCsv(positionPlanningYear(position))
  ];
}

function positionCsvGroupKey(row: string[], get: CsvRowGetter): string {
  const positionId = cleanText(
    get(row, ["positionsid", "positionid", "positionsschluessel", "positionkey", "csvpositionid"], -1)
  );
  if (positionId) return `id:${positionId}`;

  const parsedType = parseTypeValue(get(row, ["art", "type"], 2));
  const flow = parseFlowValue(get(row, ["richtung", "flow", "typgruppe"], -1), flowForType(parsedType));
  const type = typeForFlow(parsedType, flow);
  const payoutType = parsePayoutValue(
    get(row, ["abgang", "eingang", "payout", "abgangsart", "zahlungsart"], 6),
    flow
  );
  return [
    "position",
    cleanText(get(row, ["name", "position"], 1)),
    flow,
    type,
    formatCsvNumber(parseMoneyValue(get(row, ["betrag", "amount"], 3))),
    parseMonthValue(get(row, ["startmonat", "anfangsmonat", "anfangmonat", "anfang", "start"], 4), 1),
    parseMonthValue(get(row, ["endmonat", "ende", "end"], 5), 12),
    payoutType,
    parseYearValue(
      get(row, ["jahr", "abgangsjahr", "eingangsjahr", "payoutyear", "year"], -1),
      defaultPlanningSettings().year
    ),
    parseMonthValue(get(row, ["monat", "abgangsmonat", "eingangsmonat", "payoutmonth"], 7), 12),
    parsePlanningYearValue(get(row, ["planungsjahr", "planjahr", "planningyear"], -1)) ?? "start"
  ].join("|");
}

function parsePositionCsvRowKind(value: unknown): PositionCsvRowKind {
  const normalized = normalizeHeader(value);
  if (["position", "hauptposition", "main", "mainposition"].includes(normalized)) return "position";
  if (["detail", "details", "detailzeile", "einzelposition", "aufschluesselung"].includes(normalized)) return "detail";
  return "unknown";
}

function parsePositionCsvDetailItem(row: string[], get: CsvRowGetter): PositionCostBreakdownItem | null {
  const name = cleanText(
    get(row, ["detailname", "detailposition", "detailbezeichnung", "kostenposition", "einnahmeposition"], -1)
  );
  const rawAmount = get(row, ["detailbetrag", "detailamount", "einzelbetrag", "kostenbetrag", "einnahmebetrag"], -1);
  const hasAmount = cleanText(rawAmount) !== "";
  if (!name && !hasAmount) return null;

  return {
    id: createId(),
    name,
    amount: hasAmount ? Math.max(0, parseMoneyValue(rawAmount)) : null
  };
}

function normalizePositionCostBreakdown(
  items: PositionCostBreakdownItem[] | undefined
): PositionCostBreakdownItem[] {
  if (!items?.length) return [];
  return items
    .map((item) => {
      const name = String(item.name ?? "").trim();
      const amount =
        item.amount === null || item.amount === undefined ? null : Math.max(0, Number(item.amount) || 0);
      if (!name && amount === null) return null;
      return {
        id: String(item.id || createId()),
        name,
        amount
      };
    })
    .filter((item): item is PositionCostBreakdownItem => item !== null);
}

function positionCostBreakdownTotal(items: PositionCostBreakdownItem[] | undefined): number | null {
  if (!items?.some((item) => item.amount !== null)) return null;
  return items.reduce((sum, item) => sum + Math.max(0, Number(item.amount ?? 0)), 0);
}

function positionCostBreakdownAllowed(flow: PositionFlow, type: PositionType, payoutType: PayoutType): boolean {
  if (flow === "expense" && type === "temporary") {
    return payoutType === "monthly" || payoutType === "yearly" || payoutType === "once";
  }
  return flow === "income" && type === "incomeTemporary" && payoutType === "once";
}

function parseYearValue(value: unknown, fallback: number): number {
  const parsed = Math.round(parseMoneyValue(value));
  return parsed > 0 ? parsed : fallback;
}

function parsePlanningYearValue(value: unknown): number | null {
  const normalized = normalizeHeader(value);
  if (!normalized || normalized === "start") return null;
  const parsed = Math.round(parseMoneyValue(value));
  return parsed >= 2000 && parsed <= 2200 ? parsed : null;
}

function formatPlanningYearCsv(value: ReservePosition["planningYear"]): string {
  return typeof value === "number" ? String(value) : "Start";
}

function parseBooleanValue(value: unknown, fallback: boolean): boolean {
  const normalized = cleanText(value).toLowerCase();
  if (normalized === "") return fallback;
  if (["ja", "yes", "true", "1", "x", "aktiv"].includes(normalized)) return true;
  if (["nein", "no", "false", "0", "inaktiv"].includes(normalized)) return false;
  return fallback;
}

function parseTypeValue(value: unknown): PositionType {
  const normalized = normalizeHeader(value);
  if (
    ["monatlicheseinkommen", "einkommenmonatlich", "monthlyincome", "income", "nettoeinkommen"].includes(normalized)
  ) {
    return "incomeMonthly";
  }
  if (
    [
      "jaehrlicheeinnahme",
      "jahrlicheeinnahme",
      "jahreseinnahme",
      "annualincome",
      "yearlyincome",
      "steuererklaerung",
      "steuererstattung"
    ].includes(normalized)
  ) {
    return "incomeYearly";
  }
  if (
    ["temporaereeinnahme", "temporareeinnahme", "temporaryincome", "referral", "selbststaendigkeit"].includes(
      normalized
    )
  ) {
    return "incomeTemporary";
  }
  if (["fixbestand", "fixed", "fix"].includes(normalized)) return "fixed";
  if (["monatlicheruecklage", "ruecklage", "reserve", "monthlyreserve"].includes(normalized)) return "reserve";
  if (
    [
      "temporaer",
      "temporar",
      "temporaereausgabe",
      "temporareausgabe",
      "temporaermonatlich",
      "temporarmonatlich",
      "temporary",
      "temporaryexpense",
      "ausgabe",
      "ausgaben",
      "kosten",
      "expense",
      "expenses",
      "durchlauf"
    ].includes(normalized)
  ) {
    return "temporary";
  }
  if (["sparrate", "sparen", "saving", "savings", "investment", "investitionsrate"].includes(normalized)) {
    return "savings";
  }
  return "temporary";
}

function parsePayoutValue(value: unknown, flow: PositionFlow = "expense"): PayoutType {
  const normalized = normalizeHeader(value);
  if (normalized === "") return flow === "income" ? "monthly" : "none";
  if (["keinabgang", "keineingang", "keiner", "ohnerhythmus", "none", "nein"].includes(normalized)) {
    return "none";
  }
  if (["monatlich", "monthly"].includes(normalized)) return "monthly";
  if (["jaehrlich", "jahrlich", "yearly", "annual"].includes(normalized)) return "yearly";
  if (["einmalig", "einmal", "once", "single", "onetime"].includes(normalized)) return "once";
  return "none";
}

function parseFlowValue(value: unknown, fallback: PositionFlow): PositionFlow {
  const normalized = normalizeHeader(value);
  if (["einnahme", "einnahmen", "einlage", "einlagen", "income"].includes(normalized)) return "income";
  if (["ausgabe", "ausgaben", "kosten", "expense", "expenses"].includes(normalized)) return "expense";
  return fallback;
}

function defaultIncomePayoutType(type: PositionType): PayoutType {
  if (isIncomeType(type) && type === "incomeYearly") return "yearly";
  return "monthly";
}

function parseMonthValue(value: unknown, fallback: number): number {
  const normalized = normalizeHeader(value);
  const number = Number(normalized);
  if (Number.isFinite(number) && number >= 1 && number <= 12) return number;
  const index = MONTHS.map(normalizeHeader).indexOf(normalized);
  return index >= 0 ? index + 1 : fallback;
}
