import { createId, defaultIncomePlanningState, defaultPlanningSettings, MONTHS } from "../data/defaults";
import {
  buildIncomePlanningHabit,
  buildIncomePlanningManualBlock,
  buildIncomePlanningWorkBlock,
  incomePlanningAverageSleepHours,
  incomePlanningDefaultManualColor,
  incomePlanningDefaultManualIcon,
  incomePlanningDefaultWorkColor,
  incomePlanningStripSlotPause,
  INCOME_PLANNING_WEEK_SCENARIO_IDS,
  INCOME_PLANNING_CATEGORY_CONFIGS,
  isIncomePlanningHabitChange,
  isIncomePlanningHabitDurationUnit,
  isIncomePlanningHabitStatus,
  isIncomePlanningHabitType,
  isIncomePlanningManualBlockType,
  isIncomePlanningPriority,
  isIncomePlanningWeekScenarioId,
  isIncomePlanningWeekday
} from "../domain/incomePlanning";
import { calculateMonthlyRows } from "../domain/reserveCalculator";
import {
  cleanText,
  clamp,
  formatCsvNumber,
  labelForPayout,
  labelForFlow,
  labelForType,
  monthName,
  normalizeHeader
} from "./format";
import { defaultPositionIconForPosition, normalizePositionIcon, positionIconLabel } from "./positionIcons";
import { flowForType, isIncomeType, typeForFlow } from "./positionKinds";
import { positionPlanningYear } from "./planningYears";
import type {
  IncomePlanningCategory,
  IncomePlanningCalendarStamp,
  IncomePlanningHabit,
  IncomePlanningHabitDurationUnit,
  IncomePlanningManualBlock,
  IncomePlanningManualBlockType,
  IncomePlanningPlannedStamp,
  IncomePlanningSleepSlot,
  IncomePlanningSlot,
  IncomePlanningState,
  IncomePlanningWeekScenario,
  IncomePlanningWeekScenarioAssignment,
  IncomePlanningWeekScenarioId,
  IncomePlanningWorkBlock,
  PlanningSettings,
  PayoutType,
  PositionCostBreakdownItem,
  PositionFlow,
  PositionType,
  ReservePosition
} from "../types";

export function parseCsv(text: string): string[][] {
  const delimiter = detectCsvDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const code = text.charCodeAt(index);
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((code === 10 || code === 13) && !inQuotes) {
      if (code === 13 && text.charCodeAt(index + 1) === 10) index += 1;
      row.push(cell.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

export function detectCsvDelimiter(text: string): ";" | "," {
  let firstLine = "";
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code === 10 || code === 13) break;
    firstLine += text[index];
  }

  let semicolons = 0;
  let commas = 0;
  for (const char of firstLine) {
    if (char === ";") semicolons += 1;
    if (char === ",") commas += 1;
  }
  return semicolons >= commas ? ";" : ",";
}

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

const INCOME_PLANNING_CSV_HEADER = [
  "Datensatz",
  "Block-ID",
  "Slot-ID",
  "Aktiv",
  "Kategorie",
  "Name",
  "Beschreibung",
  "Farbe",
  "Tag",
  "Startzeit",
  "Endzeit",
  "Flexibel",
  "Dauer-Minuten",
  "Pause-Aktiv",
  "Pause-Startzeit",
  "Pause-Endzeit",
  "Pause-Minuten",
  "Habit-Typ",
  "Habit-Timing",
  "Habit-Dauer-Minuten",
  "Habit-Dauer-Einheit",
  "Habit-Ziel",
  "Habit-Ersatz",
  "Habit-Status",
  "Habit-Prioritaet",
  "Icon",
  "Schlaf-Stunden-Pro-Tag",
  "Datum",
  "Wochenstart",
  "Szenario-ID",
  "Szenario-IDs",
  "Szenario-Label",
  "Slot-Notiz"
];

type IncomePlanningCsvRowKind =
  | "assumptions"
  | "work"
  | "work_slot"
  | "habit"
  | "habit_slot"
  | "manual"
  | "manual_slot"
  | "stamp"
  | "planned_stamp"
  | "week_scenario"
  | "week_scenario_label"
  | "sleep"
  | "unknown";

export function exportIncomePlanningCsv(planning: IncomePlanningState): string {
  const rows = [INCOME_PLANNING_CSV_HEADER];
  rows.push(incomePlanningCsvRow("Annahmen", { 26: formatCsvNumber(planning.assumptions.sleepHoursPerDay) }));

  for (const block of planning.workBlocks) {
    rows.push(
      incomePlanningCsvRow("Arbeit", {
        1: block.id,
        3: booleanCsv(block.active),
        4: block.category,
        5: block.name,
        6: block.description,
        7: block.color ?? incomePlanningDefaultWorkColor(block.category)
      })
    );
    for (const slot of block.slots) {
      rows.push(incomePlanningCsvRow("Arbeit-Slot", { 1: block.id, ...incomePlanningSlotCsvCells(slot) }));
    }
  }

  for (const habit of planning.habits) {
    rows.push(
      incomePlanningCsvRow("Habit", {
        1: habit.id,
        3: booleanCsv(habit.active),
        5: habit.name,
        6: habit.description,
        17: habit.type,
        18: habit.timing,
        19: String(Math.round(habit.durationMinutes)),
        20: habit.durationUnit,
        21: habit.goalChange,
        22: habit.replacementHabit,
        23: habit.status,
        24: habit.priority,
        25: habit.icon ?? (habit.type === "bad" ? "snack" : "book")
      })
    );
    for (const slot of habit.slots) {
      rows.push(incomePlanningCsvRow("Habit-Slot", { 1: habit.id, ...incomePlanningSlotCsvCells(slot) }));
    }
  }

  for (const block of planning.manualBlocks) {
    rows.push(
      incomePlanningCsvRow("Zeitblock", {
        1: block.id,
        3: booleanCsv(block.active),
        4: block.type,
        5: block.name,
        6: block.description,
        7: block.color ?? incomePlanningDefaultManualColor(block.type),
        25: block.icon ?? incomePlanningDefaultManualIcon(block.type)
      })
    );
    for (const slot of block.slots) {
      rows.push(incomePlanningCsvRow("Zeitblock-Slot", { 1: block.id, ...incomePlanningSlotCsvCells(slot) }));
    }
  }

  for (const stamp of planning.calendarStamps) {
    rows.push(
      incomePlanningCsvRow("Stempel", {
        1: stamp.id,
        5: stamp.label,
        8: stamp.day,
        9: stamp.startTime,
        25: stamp.icon,
        30: formatIncomePlanningScenarioIds(stamp.scenarioIds)
      })
    );
  }

  for (const stamp of planning.plannedStamps ?? []) {
    rows.push(
      incomePlanningCsvRow("Geplanter-Stempel", {
        1: stamp.id,
        5: stamp.label,
        6: stamp.description,
        9: stamp.startTime,
        25: stamp.icon,
        27: stamp.date,
        30: formatIncomePlanningScenarioIds(stamp.scenarioIds)
      })
    );
  }

  for (const scenario of planning.weekScenarios ?? []) {
    rows.push(
      incomePlanningCsvRow("Wochenszenario-Label", {
        29: scenario.id,
        31: scenario.label
      })
    );
  }

  for (const assignment of planning.weekScenarioAssignments ?? []) {
    rows.push(
      incomePlanningCsvRow("Wochenszenario", {
        28: assignment.weekStartDate,
        29: assignment.scenarioId
      })
    );
  }

  for (const slot of planning.assumptions.sleepSlots) {
    rows.push(incomePlanningCsvRow("Schlaf", incomePlanningSleepSlotCsvCells(slot)));
  }

  return rows.map((row) => row.map(csvCell).join(";")).join("\n");
}

export function incomePlanningFromCsvRows(rows: string[][]): IncomePlanningState | null {
  if (!rows.length) return null;
  const header = rows[0].map(normalizeHeader);
  const hasHeader =
    header.includes("datensatz") ||
    header.includes("blockid") ||
    header.includes("slotid") ||
    header.includes("startzeit");
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const get: CsvRowGetter = (row, keys, fallbackIndex) => {
    if (hasHeader) {
      for (const key of keys) {
        const index = header.indexOf(key);
        if (index >= 0) return row[index] ?? "";
      }
    }
    return fallbackIndex >= 0 ? row[fallbackIndex] ?? "" : "";
  };

  const fallback = defaultIncomePlanningState();
  const workBlocks = new Map<string, IncomePlanningWorkBlock>();
  const habits = new Map<string, IncomePlanningHabit>();
  const manualBlocks = new Map<string, IncomePlanningManualBlock>();
  const slotsByOwnerId = new Map<string, IncomePlanningSlot[]>();
  const legacyScenarioIdsByOwnerId = new Map<string, IncomePlanningWeekScenarioId[]>();
  const calendarStamps: IncomePlanningCalendarStamp[] = [];
  const plannedStamps: IncomePlanningPlannedStamp[] = [];
  const weekScenarios: IncomePlanningWeekScenario[] = [];
  const weekScenarioAssignments: IncomePlanningWeekScenarioAssignment[] = [];
  const sleepSlots: IncomePlanningSleepSlot[] = [];
  let sleepHoursPerDay: number | null = null;
  let recognizedRows = 0;

  for (const row of dataRows) {
    const kind = parseIncomePlanningCsvRowKind(get(row, ["datensatz", "zeilentyp", "typ", "type"], 0));

    if (kind === "assumptions") {
      const parsedHours = parseIncomePlanningHours(get(row, ["schlafstundenprotag", "schlafstunden", "sleephoursperday"], 26));
      if (parsedHours !== null) sleepHoursPerDay = parsedHours;
      recognizedRows += 1;
      continue;
    }

    if (kind === "work") {
      const block = parseIncomePlanningWorkBlock(row, get);
      workBlocks.set(block.id, block);
      const scenarioIds = parseIncomePlanningScenarioIds(row, get);
      if (scenarioIds?.length) legacyScenarioIdsByOwnerId.set(block.id, scenarioIds);
      recognizedRows += 1;
      continue;
    }

    if (kind === "habit") {
      const habit = parseIncomePlanningHabit(row, get);
      habits.set(habit.id, habit);
      const scenarioIds = parseIncomePlanningScenarioIds(row, get);
      if (scenarioIds?.length) legacyScenarioIdsByOwnerId.set(habit.id, scenarioIds);
      recognizedRows += 1;
      continue;
    }

    if (kind === "manual") {
      const block = parseIncomePlanningManualBlock(row, get);
      manualBlocks.set(block.id, block);
      const scenarioIds = parseIncomePlanningScenarioIds(row, get);
      if (scenarioIds?.length) legacyScenarioIdsByOwnerId.set(block.id, scenarioIds);
      recognizedRows += 1;
      continue;
    }

    if (kind === "work_slot" || kind === "habit_slot" || kind === "manual_slot") {
      const ownerId = cleanText(get(row, ["blockid", "ownerid", "besitzerid"], 1));
      const slot = parseIncomePlanningCsvSlot(row, get);
      if (ownerId && slot) {
        slotsByOwnerId.set(ownerId, [...(slotsByOwnerId.get(ownerId) ?? []), slot]);
        recognizedRows += 1;
      }
      continue;
    }

    if (kind === "stamp") {
      calendarStamps.push(parseIncomePlanningCalendarStamp(row, get));
      recognizedRows += 1;
      continue;
    }

    if (kind === "planned_stamp") {
      plannedStamps.push(parseIncomePlanningPlannedStamp(row, get));
      recognizedRows += 1;
      continue;
    }

    if (kind === "week_scenario") {
      const assignment = parseIncomePlanningWeekScenarioAssignment(row, get);
      if (assignment) {
        weekScenarioAssignments.push(assignment);
        recognizedRows += 1;
      }
      continue;
    }

    if (kind === "week_scenario_label") {
      const scenario = parseIncomePlanningWeekScenario(row, get);
      if (scenario) {
        weekScenarios.push(scenario);
        recognizedRows += 1;
      }
      continue;
    }

    if (kind === "sleep") {
      const slot = parseIncomePlanningCsvSleepSlot(row, get);
      if (slot) {
        sleepSlots.push(slot);
        recognizedRows += 1;
      }
    }
  }

  if (!recognizedRows) return null;

  const normalizedWeekScenarios = normalizeIncomePlanningCsvWeekScenarios(weekScenarios);
  const allowedScenarioIds = incomePlanningCsvAllowedScenarioIds(normalizedWeekScenarios);
  const importedSleepSlots = (sleepSlots.length ? sleepSlots : fallback.assumptions.sleepSlots).map((slot) =>
    normalizeIncomePlanningCsvEntryScenarioIds(slot, allowedScenarioIds)
  );
  return {
    workBlocks: Array.from(workBlocks.values()).map((block) => ({
      ...block,
      slots: normalizeIncomePlanningCsvSlots(
        slotsByOwnerId.get(block.id) ?? [],
        allowedScenarioIds,
        legacyScenarioIdsByOwnerId.get(block.id)
      )
    })),
    habits: Array.from(habits.values()).map((habit) => ({
      ...habit,
      slots: normalizeIncomePlanningCsvSlots(
        slotsByOwnerId.get(habit.id) ?? [],
        allowedScenarioIds,
        legacyScenarioIdsByOwnerId.get(habit.id)
      ).map(incomePlanningStripSlotPause)
    })),
    manualBlocks: Array.from(manualBlocks.values()).map((block) => ({
      ...block,
      slots: normalizeIncomePlanningCsvSlots(
        slotsByOwnerId.get(block.id) ?? [],
        allowedScenarioIds,
        legacyScenarioIdsByOwnerId.get(block.id)
      )
    })),
    calendarStamps: calendarStamps.map((stamp) => normalizeIncomePlanningCsvEntryScenarioIds(stamp, allowedScenarioIds)),
    plannedStamps: plannedStamps.map((stamp) => normalizeIncomePlanningCsvEntryScenarioIds(stamp, allowedScenarioIds)),
    weekScenarios: normalizedWeekScenarios,
    weekScenarioAssignments: normalizeIncomePlanningCsvWeekScenarioAssignments(weekScenarioAssignments, allowedScenarioIds),
    assumptions: {
      sleepHoursPerDay:
        sleepHoursPerDay ?? incomePlanningAverageSleepHours({ sleepHoursPerDay: 0, sleepSlots: importedSleepSlots }),
      sleepSlots: importedSleepSlots
    }
  };
}

export function csvCell(value: unknown): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function parseMoneyValue(value: unknown): number {
  let cleaned = cleanText(value);
  cleaned = cleaned.replaceAll("€", "").replaceAll(" ", "").replaceAll(String.fromCharCode(160), "");
  cleaned = cleaned.replaceAll(".", "").replaceAll(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function incomePlanningCsvRow(kind: string, values: Partial<Record<number, string>> = {}): string[] {
  const row = Array.from({ length: INCOME_PLANNING_CSV_HEADER.length }, () => "");
  row[0] = kind;
  for (const [index, value] of Object.entries(values)) {
    if (value !== undefined) row[Number(index)] = value;
  }
  return row;
}

function incomePlanningSlotCsvCells(slot: IncomePlanningSlot): Partial<Record<number, string>> {
  return {
    2: slot.id,
    8: slot.day,
    9: slot.startTime,
    10: slot.endTime,
    11: booleanCsv(slot.flexible),
    12: String(Math.round(slot.durationMinutes)),
    13: slot.pauseEnabled === undefined ? "" : booleanCsv(slot.pauseEnabled),
    14: slot.pauseStartTime ?? "",
    15: slot.pauseEndTime ?? "",
    16: slot.pauseDurationMinutes === undefined ? "" : String(Math.round(slot.pauseDurationMinutes)),
    30: formatIncomePlanningScenarioIds(slot.scenarioIds),
    32: slot.note ?? ""
  };
}

function incomePlanningSleepSlotCsvCells(slot: IncomePlanningSleepSlot): Partial<Record<number, string>> {
  return {
    2: slot.id,
    8: slot.day,
    9: slot.startTime,
    10: slot.endTime,
    11: booleanCsv(slot.flexible),
    12: String(Math.round(slot.durationMinutes)),
    30: formatIncomePlanningScenarioIds(slot.scenarioIds)
  };
}

function formatIncomePlanningScenarioIds(scenarioIds: IncomePlanningWeekScenarioId[] | undefined): string {
  return scenarioIds?.length ? scenarioIds.join(",") : "";
}

function parseIncomePlanningCsvRowKind(value: unknown): IncomePlanningCsvRowKind {
  const normalized = normalizeHeader(value);
  if (["annahmen", "assumptions", "settings", "einstellungen"].includes(normalized)) return "assumptions";
  if (["arbeit", "taetigkeit", "tatigkeit", "work", "workblock"].includes(normalized)) return "work";
  if (["arbeitslot", "taetigkeitslot", "tatigkeitslot", "workslot"].includes(normalized)) return "work_slot";
  if (["habit", "gewohnheit"].includes(normalized)) return "habit";
  if (["habitslot", "gewohnheitslot"].includes(normalized)) return "habit_slot";
  if (["zeitblock", "manual", "manualblock", "privatezeit", "ereignis"].includes(normalized)) return "manual";
  if (["zeitblockslot", "manualslot", "ereignisslot"].includes(normalized)) return "manual_slot";
  if (["stempel", "stamp", "calendarstamp", "kalenderstempel"].includes(normalized)) return "stamp";
  if (["geplanterstempel", "geplanter-stempel", "plannedstamp", "plannedcalendarstamp"].includes(normalized)) {
    return "planned_stamp";
  }
  if (
    ["wochenszenariolabel", "wochenszenario-label", "weekscenariolabel", "weekscenario-label"].includes(normalized)
  ) {
    return "week_scenario_label";
  }
  if (["wochenszenario", "weekscenario", "weekscenarioassignment", "wochenmodus"].includes(normalized)) {
    return "week_scenario";
  }
  if (["schlaf", "sleep", "sleepslot"].includes(normalized)) return "sleep";
  return "unknown";
}

function parseIncomePlanningWorkBlock(row: string[], get: CsvRowGetter): IncomePlanningWorkBlock {
  const category = parseIncomePlanningCategory(get(row, ["kategorie", "category"], 4));
  const id = cleanText(get(row, ["blockid", "id", "ownerid"], 1)) || createId();
  const fallback = buildIncomePlanningWorkBlock(category, id, { slots: [] });
  const color = normalizeIncomePlanningCsvColor(get(row, ["farbe", "color"], 7), incomePlanningDefaultWorkColor(category));
  return {
    ...fallback,
    id,
    active: parseBooleanValue(get(row, ["aktiv", "active"], 3), fallback.active),
    category,
    name: cleanText(get(row, ["name", "titel", "title"], 5)) || fallback.name,
    description: cleanText(get(row, ["beschreibung", "description"], 6)),
    color,
    slots: []
  };
}

function parseIncomePlanningHabit(row: string[], get: CsvRowGetter): IncomePlanningHabit {
  const id = cleanText(get(row, ["blockid", "id", "ownerid"], 1)) || createId();
  const type = parseIncomePlanningHabitType(get(row, ["habittyp", "type", "habitart"], 17));
  const fallback = buildIncomePlanningHabit(id, { type, slots: [] });
  const durationUnit = parseIncomePlanningHabitDurationUnit(
    get(row, ["habitdauereinheit", "dauereinheit", "durationunit"], 20),
    fallback.durationUnit
  );
  const durationMinutes = parseIncomePlanningMinutes(
    get(row, ["habitdauerminuten", "habitdauer", "durationminutes"], 19),
    fallback.durationMinutes
  );
  return {
    ...fallback,
    id,
    active: parseBooleanValue(get(row, ["aktiv", "active"], 3), fallback.active),
    type,
    name: cleanText(get(row, ["name", "titel", "title"], 5)) || fallback.name,
    description: cleanText(get(row, ["beschreibung", "description"], 6)),
    timing: cleanText(get(row, ["habittiming", "timing", "zeitpunkt"], 18)),
    durationMinutes,
    durationUnit,
    goalChange: parseIncomePlanningHabitChange(get(row, ["habitziel", "goalchange", "ziel"], 21), fallback.goalChange),
    replacementHabit: cleanText(get(row, ["habitersatz", "replacementhabit", "ersatz"], 22)),
    status: parseIncomePlanningHabitStatus(get(row, ["habitstatus", "status"], 23), fallback.status),
    priority: parseIncomePlanningPriority(get(row, ["habitprioritaet", "priority", "prioritaet"], 24), fallback.priority),
    icon: normalizePositionIcon(get(row, ["habiticon", "icon", "symbol"], 25), type === "bad" ? "snack" : "book"),
    slots: []
  };
}

function parseIncomePlanningManualBlock(row: string[], get: CsvRowGetter): IncomePlanningManualBlock {
  const type = parseIncomePlanningManualBlockType(get(row, ["kategorie", "type", "typ"], 4));
  const id = cleanText(get(row, ["blockid", "id", "ownerid"], 1)) || createId();
  const fallback = buildIncomePlanningManualBlock(type, id, { slots: [] });
  const color = normalizeIncomePlanningCsvColor(get(row, ["farbe", "color"], 7), incomePlanningDefaultManualColor(type));
  const icon = normalizePositionIcon(get(row, ["habiticon", "icon", "symbol"], 25), incomePlanningDefaultManualIcon(type));
  return {
    ...fallback,
    id,
    active: parseBooleanValue(get(row, ["aktiv", "active"], 3), fallback.active),
    type,
    name: cleanText(get(row, ["name", "titel", "title"], 5)) || fallback.name,
    description: cleanText(get(row, ["beschreibung", "description"], 6)),
    color,
    icon,
    slots: []
  };
}

function parseIncomePlanningCalendarStamp(row: string[], get: CsvRowGetter): IncomePlanningCalendarStamp {
  const id = cleanText(get(row, ["blockid", "id", "ownerid"], 1)) || createId();
  const day = parseIncomePlanningWeekday(get(row, ["tag", "day", "wochentag"], 8), "monday");
  const startTime = parseIncomePlanningTime(get(row, ["startzeit", "start", "starttime"], 9), "09:00");
  const label = cleanText(get(row, ["name", "label", "titel", "title"], 5)) || "Stempel";
  return {
    id,
    day,
    startTime,
    icon: normalizePositionIcon(get(row, ["habiticon", "icon", "symbol"], 25), "calendar"),
    label,
    scenarioIds: parseIncomePlanningScenarioIds(row, get)
  };
}

function parseIncomePlanningPlannedStamp(row: string[], get: CsvRowGetter): IncomePlanningPlannedStamp {
  const id = cleanText(get(row, ["blockid", "id", "ownerid"], 1)) || createId();
  const date = parseIncomePlanningDate(get(row, ["datum", "date"], 27), todayLocalDateString());
  const startTime = parseIncomePlanningTime(get(row, ["startzeit", "start", "starttime"], 9), "09:00");
  const label = cleanText(get(row, ["name", "label", "titel", "title"], 5)) || "Stempel";
  return {
    id,
    date,
    startTime,
    icon: normalizePositionIcon(get(row, ["habiticon", "icon", "symbol"], 25), "calendar"),
    label,
    description: cleanText(get(row, ["beschreibung", "description"], 6)),
    scenarioIds: parseIncomePlanningScenarioIds(row, get)
  };
}

function parseIncomePlanningWeekScenario(row: string[], get: CsvRowGetter): IncomePlanningWeekScenario | null {
  const id = cleanText(get(row, ["szenarioid", "scenarioid", "id"], 29));
  const label = cleanText(get(row, ["szenariolabel", "label", "name", "titel", "title"], 31));
  if (!isIncomePlanningWeekScenarioId(id) || INCOME_PLANNING_WEEK_SCENARIO_IDS.includes(id) || !label) return null;
  return { id, label };
}

function parseIncomePlanningWeekScenarioAssignment(
  row: string[],
  get: CsvRowGetter
): IncomePlanningWeekScenarioAssignment | null {
  const weekStartDate = parseIncomePlanningWeekStartDate(
    get(row, ["wochenstart", "weekstart", "weekstartdate", "datum", "date"], 28)
  );
  const scenarioId = cleanText(get(row, ["szenarioid", "szenario", "scenarioid", "scenario", "kategorie", "category"], 29));
  if (!weekStartDate || !isIncomePlanningWeekScenarioId(scenarioId) || scenarioId === "normal") return null;
  return { weekStartDate, scenarioId };
}

function parseIncomePlanningScenarioIds(
  row: string[],
  get: CsvRowGetter
): IncomePlanningWeekScenarioId[] | undefined {
  const raw = cleanText(get(row, ["szenarioids", "szenarien", "scenarioids", "scenarios"], 30));
  if (!raw) return undefined;
  const scenarioIds = Array.from(
    new Set(
      raw
        .split(/[|,]/)
        .map((value) => value.trim())
        .filter((value): value is IncomePlanningWeekScenarioId => isIncomePlanningWeekScenarioId(value))
    )
  );
  return scenarioIds.length ? scenarioIds : undefined;
}

function parseIncomePlanningCsvSlot(row: string[], get: CsvRowGetter): IncomePlanningSlot | null {
  const id = cleanText(get(row, ["slotid", "id"], 2)) || createId();
  const note = cleanText(get(row, ["slotnotiz", "slot-notiz", "slotnote", "slot-note", "notiz", "note"], 32));
  const day = parseIncomePlanningWeekday(get(row, ["tag", "day", "wochentag"], 8), "sunday");
  const startTime = parseIncomePlanningTime(get(row, ["startzeit", "start", "starttime"], 9), "09:00");
  const endTime = parseIncomePlanningTime(get(row, ["endzeit", "ende", "end", "endtime"], 10), "10:00");
  const flexible = parseBooleanValue(get(row, ["flexibel", "flexible"], 11), false);
  const clockDuration = fallbackTimeDuration(startTime, endTime, 0);
  const parsedDurationMinutes = parseIncomePlanningMinutes(
    get(row, ["dauerminuten", "dauer", "durationminutes"], 12),
    flexible ? 60 : fallbackTimeDuration(startTime, endTime, 60)
  );
  const durationMinutes = clockDuration > 0 ? clockDuration : parsedDurationMinutes;
  const slot: IncomePlanningSlot = {
    id,
    ...(note ? { note } : {}),
    day,
    startTime,
    endTime,
    flexible,
    durationMinutes,
    scenarioIds: parseIncomePlanningScenarioIds(row, get)
  };
  const pauseEnabledRaw = get(row, ["pauseaktiv", "pauseenabled"], 13);
  const pauseStartRaw = get(row, ["pausestartzeit", "pausestart", "pausestarttime"], 14);
  const pauseEndRaw = get(row, ["pauseendzeit", "pauseende", "pauseend", "pauseendtime"], 15);
  const pauseDurationRaw = get(row, ["pauseminuten", "pausedauer", "pausedurationminutes"], 16);
  const hasPause =
    parseBooleanValue(pauseEnabledRaw, false) ||
    cleanText(pauseStartRaw) !== "" ||
    cleanText(pauseEndRaw) !== "" ||
    cleanText(pauseDurationRaw) !== "";
  if (!hasPause) return slot;
  const pauseStartTime = parseIncomePlanningTime(pauseStartRaw, "12:00");
  const pauseEndTime = parseIncomePlanningTime(pauseEndRaw, "12:30");
  const pauseDurationMinutes = parseIncomePlanningMinutes(
    pauseDurationRaw,
    fallbackTimeDuration(pauseStartTime, pauseEndTime, 0)
  );
  return {
    ...slot,
    pauseEnabled: parseBooleanValue(pauseEnabledRaw, pauseDurationMinutes > 0),
    pauseStartTime,
    pauseEndTime,
    pauseDurationMinutes
  };
}

function parseIncomePlanningCsvSleepSlot(row: string[], get: CsvRowGetter): IncomePlanningSleepSlot | null {
  const id = cleanText(get(row, ["slotid", "id"], 2)) || createId();
  const day = parseIncomePlanningWeekday(get(row, ["tag", "day", "wochentag"], 8), "sunday");
  const startTime = parseIncomePlanningTime(get(row, ["startzeit", "start", "starttime"], 9), "21:00");
  const endTime = parseIncomePlanningTime(get(row, ["endzeit", "ende", "end", "endtime"], 10), "05:30");
  const flexible = parseBooleanValue(get(row, ["flexibel", "flexible"], 11), false);
  const durationMinutes = parseIncomePlanningMinutes(
    get(row, ["dauerminuten", "dauer", "durationminutes"], 12),
    fallbackTimeDuration(startTime, endTime, 8 * 60)
  );
  return { id, day, startTime, endTime, flexible, durationMinutes, scenarioIds: parseIncomePlanningScenarioIds(row, get) };
}

function parseIncomePlanningCategory(value: unknown): IncomePlanningCategory {
  const cleaned = cleanText(value);
  return INCOME_PLANNING_CATEGORY_CONFIGS.some((config) => config.id === cleaned)
    ? (cleaned as IncomePlanningCategory)
    : "other";
}

function parseIncomePlanningWeekday(value: unknown, fallback: IncomePlanningSlot["day"]): IncomePlanningSlot["day"] {
  const cleaned = cleanText(value);
  if (isIncomePlanningWeekday(cleaned)) return cleaned;
  const normalized = normalizeHeader(value);
  const aliases: Record<string, IncomePlanningSlot["day"]> = {
    montag: "monday",
    monday: "monday",
    dienstag: "tuesday",
    tuesday: "tuesday",
    mittwoch: "wednesday",
    wednesday: "wednesday",
    donnerstag: "thursday",
    thursday: "thursday",
    freitag: "friday",
    friday: "friday",
    samstag: "saturday",
    saturday: "saturday",
    sonntag: "sunday",
    sunday: "sunday"
  };
  return aliases[normalized] ?? fallback;
}

function parseIncomePlanningTime(value: unknown, fallback: string): string {
  const cleaned = cleanText(value);
  return /^([0-1]\d|2[0-3]):([0-5]\d)$/.test(cleaned) ? cleaned : fallback;
}

function parseIncomePlanningDate(value: unknown, fallback: string): string {
  const cleaned = cleanText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return fallback;
  const [yearRaw, monthRaw, dayRaw] = cleaned.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day ? cleaned : fallback;
}

function parseIncomePlanningWeekStartDate(value: unknown): string | null {
  const cleaned = cleanText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return null;
  const [yearRaw, monthRaw, dayRaw] = cleaned.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return parsed.getDay() === 1 ? cleaned : null;
}

function normalizeIncomePlanningCsvWeekScenarioAssignments(
  assignments: IncomePlanningWeekScenarioAssignment[],
  allowedScenarioIds: Set<IncomePlanningWeekScenarioId>
): IncomePlanningWeekScenarioAssignment[] {
  const byWeek = new Map<string, IncomePlanningWeekScenarioAssignment>();
  for (const assignment of assignments) {
    if (!allowedScenarioIds.has(assignment.scenarioId)) continue;
    byWeek.set(assignment.weekStartDate, assignment);
  }
  return Array.from(byWeek.values()).sort((first, second) => first.weekStartDate.localeCompare(second.weekStartDate));
}

function normalizeIncomePlanningCsvWeekScenarios(
  scenarios: IncomePlanningWeekScenario[]
): IncomePlanningWeekScenario[] {
  const byId = new Map<IncomePlanningWeekScenarioId, IncomePlanningWeekScenario>();
  for (const scenario of scenarios) {
    const id = scenario.id.trim();
    const label = scenario.label.trim();
    if (!isIncomePlanningWeekScenarioId(id) || INCOME_PLANNING_WEEK_SCENARIO_IDS.includes(id) || !label) continue;
    byId.set(id, { id, label });
  }
  return Array.from(byId.values());
}

function incomePlanningCsvAllowedScenarioIds(
  scenarios: IncomePlanningWeekScenario[]
): Set<IncomePlanningWeekScenarioId> {
  return new Set([...INCOME_PLANNING_WEEK_SCENARIO_IDS, ...scenarios.map((scenario) => scenario.id)]);
}

function normalizeIncomePlanningCsvEntryScenarioIds<T extends { scenarioIds?: IncomePlanningWeekScenarioId[] }>(
  entry: T,
  allowedScenarioIds: Set<IncomePlanningWeekScenarioId>
): T {
  const scenarioIds = normalizeIncomePlanningCsvScenarioIds(entry.scenarioIds, allowedScenarioIds);
  if (scenarioIds) return { ...entry, scenarioIds };
  const { scenarioIds: _scenarioIds, ...rest } = entry;
  return rest as T;
}

function normalizeIncomePlanningCsvSlots(
  slots: IncomePlanningSlot[],
  allowedScenarioIds: Set<IncomePlanningWeekScenarioId>,
  legacyScenarioIds: IncomePlanningWeekScenarioId[] | undefined
): IncomePlanningSlot[] {
  const normalizedLegacyScenarioIds = normalizeIncomePlanningCsvScenarioIds(legacyScenarioIds, allowedScenarioIds);
  return slots.map((slot) => {
    const normalizedSlot = normalizeIncomePlanningCsvEntryScenarioIds(slot, allowedScenarioIds);
    if (normalizedSlot.scenarioIds?.length || !normalizedLegacyScenarioIds?.length) return normalizedSlot;
    return { ...normalizedSlot, scenarioIds: normalizedLegacyScenarioIds };
  });
}

function normalizeIncomePlanningCsvScenarioIds(
  scenarioIds: IncomePlanningWeekScenarioId[] | undefined,
  allowedScenarioIds: Set<IncomePlanningWeekScenarioId>
): IncomePlanningWeekScenarioId[] | undefined {
  if (!scenarioIds?.length) return undefined;
  const normalized = Array.from(
    new Set(
      scenarioIds.filter(
        (scenarioId): scenarioId is IncomePlanningWeekScenarioId =>
          isIncomePlanningWeekScenarioId(scenarioId) && allowedScenarioIds.has(scenarioId)
      )
    )
  );
  return normalized.length > 0 && normalized.length < allowedScenarioIds.size ? normalized : undefined;
}

function todayLocalDateString(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseIncomePlanningMinutes(value: unknown, fallback: number): number {
  if (cleanText(value) === "") return Math.max(0, Math.round(fallback));
  return Math.round(clamp(parseMoneyValue(value), 0, 168 * 60));
}

function parseIncomePlanningHours(value: unknown): number | null {
  if (cleanText(value) === "") return null;
  return clamp(parseMoneyValue(value), 0, 24);
}

function parseIncomePlanningHabitType(value: unknown): IncomePlanningHabit["type"] {
  const cleaned = cleanText(value);
  return isIncomePlanningHabitType(cleaned) ? cleaned : "good";
}

function parseIncomePlanningHabitDurationUnit(
  value: unknown,
  fallback: IncomePlanningHabitDurationUnit
): IncomePlanningHabitDurationUnit {
  const cleaned = cleanText(value);
  return isIncomePlanningHabitDurationUnit(cleaned) ? cleaned : fallback;
}

function parseIncomePlanningHabitChange(
  value: unknown,
  fallback: IncomePlanningHabit["goalChange"]
): IncomePlanningHabit["goalChange"] {
  const cleaned = cleanText(value);
  return isIncomePlanningHabitChange(cleaned) ? cleaned : fallback;
}

function parseIncomePlanningHabitStatus(
  value: unknown,
  fallback: IncomePlanningHabit["status"]
): IncomePlanningHabit["status"] {
  const cleaned = cleanText(value);
  return isIncomePlanningHabitStatus(cleaned) ? cleaned : fallback;
}

function parseIncomePlanningPriority(
  value: unknown,
  fallback: IncomePlanningHabit["priority"]
): IncomePlanningHabit["priority"] {
  const cleaned = cleanText(value);
  return isIncomePlanningPriority(cleaned) ? cleaned : fallback;
}

function parseIncomePlanningManualBlockType(value: unknown): IncomePlanningManualBlockType {
  const cleaned = cleanText(value);
  return isIncomePlanningManualBlockType(cleaned) ? cleaned : "other_event";
}

function normalizeIncomePlanningCsvColor(value: unknown, fallback: string): string {
  const cleaned = cleanText(value);
  return /^#[0-9a-fA-F]{6}$/.test(cleaned) ? cleaned.toLowerCase() : fallback;
}

function fallbackTimeDuration(startTime: string, endTime: string, fallback: number): number {
  const start = timeMinutes(startTime);
  const end = timeMinutes(endTime);
  if (start === null || end === null) return fallback;
  if (end > start) return end - start;
  if (end < start) return 24 * 60 - start + end;
  return fallback;
}

function timeMinutes(value: string): number | null {
  const match = /^([0-1]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function booleanCsv(value: boolean): string {
  return value ? "Ja" : "Nein";
}

type CsvRowGetter = (row: string[], keys: string[], fallbackIndex: number) => string;
type PositionCsvRowKind = "position" | "detail" | "unknown";

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
