import { createId, defaultIncomePlanningState } from "../../data/defaults";
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
} from "../../domain/incomePlanning";
import { cleanText, clamp, formatCsvNumber, normalizeHeader } from "../format";
import { normalizePositionIcon } from "../positionIcons";
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
  IncomePlanningWorkBlock
} from "../../types";
import { csvCell, parseBooleanValue, parseMoneyValue } from "./parse";

type CsvRowGetter = (row: string[], keys: string[], fallbackIndex: number) => string;

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
