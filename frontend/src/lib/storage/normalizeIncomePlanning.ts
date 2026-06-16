import { createId, defaultIncomePlanningState } from "../../data/defaults";
import {
  buildDefaultIncomePlanningSleepSlots,
  buildIncomePlanningManualBlock,
  buildIncomePlanningWorkBlock,
  defaultIncomePlanningAssumptions,
  INCOME_PLANNING_CATEGORY_IDS,
  INCOME_PLANNING_WEEK_SCENARIO_IDS,
  incomePlanningCategoryConfig,
  incomePlanningDefaultManualColor,
  incomePlanningDefaultManualIcon,
  incomePlanningDefaultWorkColor,
  incomePlanningSleepSlotDurationMinutes,
  incomePlanningStripSlotPause,
  isIncomePlanningHabitChange,
  isIncomePlanningHabitDurationUnit,
  isIncomePlanningHabitStatus,
  isIncomePlanningHabitType,
  isIncomePlanningManualBlockType,
  isIncomePlanningPriority,
  isIncomePlanningWeekScenarioId,
  isIncomePlanningWeekday
} from "../../domain/incomePlanning";
import { normalizeIncomeTaxRuleLabel } from "../../domain/incomeTaxRules";
import { normalizePositionIcon } from "../positionIcons";
import type {
  IncomePlanningAssumptions,
  IncomePlanningCalendarStamp,
  IncomePlanningCategory,
  IncomePlanningHabit,
  IncomePlanningManualBlock,
  IncomePlanningPlannedStamp,
  IncomePlanningSleepSlot,
  IncomePlanningSlot,
  IncomePlanningState,
  IncomePlanningWeekScenario,
  IncomePlanningWeekScenarioAssignment,
  IncomePlanningWeekScenarioId,
  IncomePlanningWorkBlock
} from "../../types";
import { booleanOrDefault, clampNumber, isRecord, numberOrDefault } from "./validators";

export function normalizeIncomePlanningState(value: unknown): IncomePlanningState {
  const fallback = defaultIncomePlanningState();
  if (!isRecord(value)) return fallback;
  const weekScenarios = Array.isArray(value.weekScenarios)
    ? normalizeIncomePlanningWeekScenarios(value.weekScenarios)
    : fallback.weekScenarios;
  const allowedScenarioIds = incomePlanningAllowedScenarioIds(weekScenarios);
  const workBlocks = Array.isArray(value.workBlocks)
    ? value.workBlocks
        .map((block) => normalizeIncomePlanningWorkBlock(block, allowedScenarioIds))
        .filter((block): block is IncomePlanningWorkBlock => block !== null)
    : Array.isArray(value.sources)
      ? value.sources
          .map((source) => normalizeLegacyIncomePlanningSource(source, allowedScenarioIds))
          .filter((block): block is IncomePlanningWorkBlock => block !== null)
      : fallback.workBlocks;
  const manualBlocks = Array.isArray(value.manualBlocks)
    ? value.manualBlocks
        .map((block) => normalizeIncomePlanningManualBlock(block, allowedScenarioIds))
        .filter((block): block is IncomePlanningManualBlock => block !== null)
    : isRecord(value.assumptions)
      ? migrateIncomePlanningAssumptionBlocks(value.assumptions)
      : fallback.manualBlocks;
  return {
    workBlocks,
    habits: Array.isArray(value.habits)
      ? value.habits
          .map((habit) => normalizeIncomePlanningHabit(habit, allowedScenarioIds))
          .filter((habit): habit is IncomePlanningHabit => habit !== null)
      : fallback.habits,
    manualBlocks,
    calendarStamps: Array.isArray(value.calendarStamps)
      ? value.calendarStamps
          .map((stamp) => normalizeIncomePlanningCalendarStamp(stamp, allowedScenarioIds))
          .filter((stamp): stamp is IncomePlanningCalendarStamp => stamp !== null)
      : fallback.calendarStamps,
    plannedStamps: Array.isArray(value.plannedStamps)
      ? value.plannedStamps
          .map((stamp) => normalizeIncomePlanningPlannedStamp(stamp, allowedScenarioIds))
          .filter((stamp): stamp is IncomePlanningPlannedStamp => stamp !== null)
      : fallback.plannedStamps,
    weekScenarios,
    weekScenarioAssignments: Array.isArray(value.weekScenarioAssignments)
      ? normalizeIncomePlanningWeekScenarioAssignments(value.weekScenarioAssignments, allowedScenarioIds)
      : fallback.weekScenarioAssignments,
    assumptions: normalizeIncomePlanningAssumptions(value.assumptions, allowedScenarioIds)
  };
}

export function normalizeIncomePlanningWorkBlock(
  value: unknown,
  allowedScenarioIds: Set<IncomePlanningWeekScenarioId>
): IncomePlanningWorkBlock | null {
  if (!isRecord(value)) return null;
  const category = normalizeIncomePlanningCategory(value.category);
  const id = String(value.id || createId());
  const fallback = buildIncomePlanningWorkBlock(category, id);
  const legacyScenarioIds = normalizeIncomePlanningScenarioIds(value.scenarioIds, allowedScenarioIds);
  return {
    id,
    active: booleanOrDefault(value.active, true),
    category,
    name: String(value.name || fallback.name),
    description: String(value.description || ""),
    color: normalizeIncomePlanningColor(value.color, fallback.color ?? incomePlanningDefaultWorkColor(category)),
    slots: normalizeIncomePlanningSlots(
      value.slots,
      fallback.slots,
      "sunday",
      60,
      allowedScenarioIds,
      legacyScenarioIds
    )
  };
}

export function normalizeLegacyIncomePlanningSource(
  value: unknown,
  allowedScenarioIds: Set<IncomePlanningWeekScenarioId>
): IncomePlanningWorkBlock | null {
  if (!isRecord(value)) return null;
  const category = normalizeIncomePlanningCategory(value.category);
  const id = String(value.id || createId());
  const config = incomePlanningCategoryConfig(category);
  const fallbackHours = config.defaultSlots.reduce((sum, slot) => sum + slot.durationMinutes, 0) / 60;
  const hoursPerWeek = clampNumber(numberOrDefault(value.hoursPerWeek, fallbackHours), 0, 168);
  const scenarioIds = normalizeIncomePlanningScenarioIds(value.scenarioIds, allowedScenarioIds);
  return buildIncomePlanningWorkBlock(category, id, {
    active: booleanOrDefault(value.active, true),
    name: String(value.name || config.defaultName),
    description: "",
    slots: [
      {
        id: `${id}-legacy-slot`,
        day: "sunday",
        startTime: "00:00",
        endTime: "00:00",
        flexible: true,
        durationMinutes: Math.round(hoursPerWeek * 60),
        scenarioIds
      }
    ]
  });
}

export function normalizeIncomePlanningHabit(
  value: unknown,
  allowedScenarioIds: Set<IncomePlanningWeekScenarioId>
): IncomePlanningHabit | null {
  if (!isRecord(value)) return null;
  const fallback = defaultIncomePlanningState().habits[0];
  const durationMinutes = Math.round(clampNumber(numberOrDefault(value.durationMinutes, fallback.durationMinutes), 0, 1440));
  const type = isIncomePlanningHabitType(value.type) ? value.type : fallback.type;
  const legacyScenarioIds = normalizeIncomePlanningScenarioIds(value.scenarioIds, allowedScenarioIds);
  return {
    id: String(value.id || createId()),
    active: booleanOrDefault(value.active, true),
    type,
    name: String(value.name || fallback.name),
    description: String(value.description || ""),
    timing: String(value.timing || ""),
    durationMinutes,
    durationUnit: isIncomePlanningHabitDurationUnit(value.durationUnit) ? value.durationUnit : fallback.durationUnit,
    goalChange: isIncomePlanningHabitChange(value.goalChange) ? value.goalChange : fallback.goalChange,
    replacementHabit: String(value.replacementHabit || ""),
    status: isIncomePlanningHabitStatus(value.status) ? value.status : fallback.status,
    priority: isIncomePlanningPriority(value.priority) ? value.priority : fallback.priority,
    icon: normalizePositionIcon(value.icon, type === "bad" ? "snack" : "book"),
    slots: normalizeIncomePlanningSlots(
      value.slots,
      fallback.slots,
      "sunday",
      durationMinutes,
      allowedScenarioIds,
      legacyScenarioIds,
      true
    )
  };
}

export function normalizeIncomePlanningManualBlock(
  value: unknown,
  allowedScenarioIds: Set<IncomePlanningWeekScenarioId>
): IncomePlanningManualBlock | null {
  if (!isRecord(value)) return null;
  const type = isIncomePlanningManualBlockType(value.type) ? value.type : "other_event";
  const fallback = buildIncomePlanningManualBlock(type, String(value.id || createId()));
  const legacyScenarioIds = normalizeIncomePlanningScenarioIds(value.scenarioIds, allowedScenarioIds);
  return {
    id: fallback.id,
    active: booleanOrDefault(value.active, true),
    type,
    name: String(value.name || fallback.name),
    description: String(value.description || ""),
    color: normalizeIncomePlanningColor(value.color, fallback.color ?? incomePlanningDefaultManualColor(type)),
    icon: normalizePositionIcon(value.icon, incomePlanningDefaultManualIcon(type)),
    slots: normalizeIncomePlanningSlots(
      value.slots,
      fallback.slots,
      "sunday",
      60,
      allowedScenarioIds,
      legacyScenarioIds
    )
  };
}

export function normalizeIncomePlanningCalendarStamp(
  value: unknown,
  allowedScenarioIds: Set<IncomePlanningWeekScenarioId>
): IncomePlanningCalendarStamp | null {
  if (!isRecord(value)) return null;
  const label = String(value.label || "").trim();
  return {
    id: String(value.id || createId()),
    day: isIncomePlanningWeekday(value.day) ? value.day : "monday",
    startTime: normalizeIncomePlanningTime(value.startTime, "09:00"),
    icon: normalizePositionIcon(value.icon, "calendar"),
    label: label || "Stempel",
    scenarioIds: normalizeIncomePlanningScenarioIds(value.scenarioIds, allowedScenarioIds)
  };
}

export function normalizeIncomePlanningPlannedStamp(
  value: unknown,
  allowedScenarioIds: Set<IncomePlanningWeekScenarioId>
): IncomePlanningPlannedStamp | null {
  if (!isRecord(value)) return null;
  const label = String(value.label || "").trim();
  return {
    id: String(value.id || createId()),
    date: normalizeIncomePlanningDate(value.date, todayLocalDateString()),
    startTime: normalizeIncomePlanningTime(value.startTime, "09:00"),
    icon: normalizePositionIcon(value.icon, "calendar"),
    label: label || "Stempel",
    description: String(value.description || ""),
    scenarioIds: normalizeIncomePlanningScenarioIds(value.scenarioIds, allowedScenarioIds)
  };
}

export function normalizeIncomePlanningWeekScenarioAssignments(
  values: unknown[],
  allowedScenarioIds: Set<IncomePlanningWeekScenarioId>
): IncomePlanningWeekScenarioAssignment[] {
  const assignments = new Map<string, IncomePlanningWeekScenarioAssignment>();
  for (const value of values) {
    const assignment = normalizeIncomePlanningWeekScenarioAssignment(value, allowedScenarioIds);
    if (assignment) assignments.set(assignment.weekStartDate, assignment);
  }
  return Array.from(assignments.values()).sort((first, second) => first.weekStartDate.localeCompare(second.weekStartDate));
}

export function normalizeIncomePlanningWeekScenarioAssignment(
  value: unknown,
  allowedScenarioIds: Set<IncomePlanningWeekScenarioId>
): IncomePlanningWeekScenarioAssignment | null {
  if (!isRecord(value)) return null;
  if (
    !isIncomePlanningWeekScenarioId(value.scenarioId) ||
    value.scenarioId === "normal" ||
    !allowedScenarioIds.has(value.scenarioId)
  ) {
    return null;
  }
  const weekStartDate = normalizeIncomePlanningWeekStartDate(value.weekStartDate);
  return weekStartDate ? { weekStartDate, scenarioId: value.scenarioId } : null;
}

export function normalizeIncomePlanningWeekScenarios(values: unknown[]): IncomePlanningWeekScenario[] {
  const scenarios = new Map<IncomePlanningWeekScenarioId, IncomePlanningWeekScenario>();
  for (const value of values) {
    if (!isRecord(value)) continue;
    const id = String(value.id || "").trim();
    const label = String(value.label || "").trim();
    if (!isIncomePlanningWeekScenarioId(id) || INCOME_PLANNING_WEEK_SCENARIO_IDS.includes(id) || !label) continue;
    scenarios.set(id, { id, label });
  }
  return Array.from(scenarios.values());
}

export function incomePlanningAllowedScenarioIds(
  weekScenarios: IncomePlanningWeekScenario[]
): Set<IncomePlanningWeekScenarioId> {
  return new Set([...INCOME_PLANNING_WEEK_SCENARIO_IDS, ...weekScenarios.map((scenario) => scenario.id)]);
}

export function normalizeIncomePlanningScenarioIds(
  value: unknown,
  allowedScenarioIds: Set<IncomePlanningWeekScenarioId>
): IncomePlanningWeekScenarioId[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const selected = Array.from(
    new Set(
      value
        .map((scenarioId) => String(scenarioId).trim())
        .filter(
          (scenarioId): scenarioId is IncomePlanningWeekScenarioId =>
            isIncomePlanningWeekScenarioId(scenarioId) && allowedScenarioIds.has(scenarioId)
        )
    )
  );
  return selected.length > 0 && selected.length < allowedScenarioIds.size ? selected : undefined;
}

export function normalizeIncomePlanningSlot(
  value: unknown,
  fallbackDay: IncomePlanningSlot["day"],
  fallbackDurationMinutes: number,
  allowedScenarioIds: Set<IncomePlanningWeekScenarioId>
): IncomePlanningSlot | null {
  if (!isRecord(value)) return null;
  const startTime = normalizeIncomePlanningTime(value.startTime, "09:00");
  const endTime = normalizeIncomePlanningTime(value.endTime, "10:00");
  const startMinutes = timeMinutes(String(value.startTime || ""));
  const endMinutes = timeMinutes(String(value.endTime || ""));
  const clockDuration = startMinutes !== null && endMinutes !== null && endMinutes > startMinutes ? endMinutes - startMinutes : null;
  const storedDuration = Math.round(
    clampNumber(numberOrDefault(value.durationMinutes, fallbackDuration(startTime, endTime, fallbackDurationMinutes)), 0, 168 * 60)
  );
  const normalizedSlot: IncomePlanningSlot = {
    id: String(value.id || createId()),
    ...(String(value.note ?? value.slotNote ?? "").trim()
      ? { note: String(value.note ?? value.slotNote).trim() }
      : {}),
    day: isIncomePlanningWeekday(value.day) ? value.day : fallbackDay,
    startTime,
    endTime,
    flexible: booleanOrDefault(value.flexible, false),
    durationMinutes: clockDuration ?? storedDuration,
    scenarioIds: normalizeIncomePlanningScenarioIds(value.scenarioIds, allowedScenarioIds)
  };
  const pauseStartTime = "pauseStartTime" in value ? normalizeIncomePlanningTime(value.pauseStartTime, "12:00") : undefined;
  const pauseEndTime = "pauseEndTime" in value ? normalizeIncomePlanningTime(value.pauseEndTime, "12:30") : undefined;
  if (pauseStartTime === undefined || pauseEndTime === undefined) return normalizedSlot;
  const pauseDurationMinutes = Math.round(
    clampNumber(numberOrDefault(value.pauseDurationMinutes, fallbackDuration(pauseStartTime, pauseEndTime, 0)), 0, 168 * 60)
  );
  return {
    ...normalizedSlot,
    pauseEnabled: booleanOrDefault(value.pauseEnabled, pauseDurationMinutes > 0),
    pauseStartTime,
    pauseEndTime,
    pauseDurationMinutes
  };
}

export function normalizeIncomePlanningSlots(
  value: unknown,
  fallbackSlots: IncomePlanningSlot[],
  fallbackDay: IncomePlanningSlot["day"],
  fallbackDurationMinutes: number,
  allowedScenarioIds: Set<IncomePlanningWeekScenarioId>,
  legacyScenarioIds: IncomePlanningWeekScenarioId[] | undefined,
  stripPause = false
): IncomePlanningSlot[] {
  const slots = Array.isArray(value)
    ? value
        .map((slotValue) => normalizeIncomePlanningSlot(slotValue, fallbackDay, fallbackDurationMinutes, allowedScenarioIds))
        .filter(isSlot)
    : fallbackSlots;
  return slots.map((slot) => {
    const migratedSlot = slot.scenarioIds?.length || !legacyScenarioIds?.length
      ? slot
      : { ...slot, scenarioIds: legacyScenarioIds };
    return stripPause ? incomePlanningStripSlotPause(migratedSlot) : migratedSlot;
  });
}

export function normalizeIncomePlanningColor(value: unknown, fallback: string): string {
  const color = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : fallback;
}

export function normalizeIncomePlanningAssumptions(
  value: unknown,
  allowedScenarioIds: Set<IncomePlanningWeekScenarioId>
): IncomePlanningAssumptions {
  const fallback = defaultIncomePlanningAssumptions();
  const assumptions = isRecord(value) ? value : {};
  const sleepSlots = Array.isArray(assumptions.sleepSlots)
    ? assumptions.sleepSlots
        .map((slotValue, index) =>
          normalizeIncomePlanningSleepSlot(slotValue, fallback.sleepSlots[index] ?? fallback.sleepSlots[0], allowedScenarioIds)
        )
        .filter((slot): slot is IncomePlanningSleepSlot => slot !== null)
    : buildDefaultIncomePlanningSleepSlots();
  return {
    sleepHoursPerDay: clampNumber(numberOrDefault(assumptions.sleepHoursPerDay, fallback.sleepHoursPerDay), 0, 24),
    sleepSlots: sleepSlots.length ? sleepSlots : fallback.sleepSlots
  };
}

export function normalizeIncomePlanningSleepSlot(
  value: unknown,
  fallback: IncomePlanningSleepSlot | undefined,
  allowedScenarioIds: Set<IncomePlanningWeekScenarioId>
): IncomePlanningSleepSlot | null {
  if (!isRecord(value)) return fallback ?? null;
  const fallbackSlot = fallback ?? buildDefaultIncomePlanningSleepSlots()[0];
  const startTime = normalizeIncomePlanningTime(value.startTime, fallbackSlot.startTime);
  const endTime = normalizeIncomePlanningTime(value.endTime, fallbackSlot.endTime);
  const slot = {
    id: String(value.id || createId()),
    day: isIncomePlanningWeekday(value.day) ? value.day : fallbackSlot.day,
    startTime,
    endTime,
    flexible: booleanOrDefault(value.flexible, fallbackSlot.flexible),
    durationMinutes: Math.round(clampNumber(numberOrDefault(value.durationMinutes, fallbackSlot.durationMinutes), 0, 168 * 60)),
    scenarioIds: normalizeIncomePlanningScenarioIds(value.scenarioIds, allowedScenarioIds)
  };
  return {
    ...slot,
    durationMinutes: slot.flexible ? slot.durationMinutes : incomePlanningSleepSlotDurationMinutes(slot)
  };
}

export function migrateIncomePlanningAssumptionBlocks(value: Record<string, unknown>): IncomePlanningManualBlock[] {
  const freeTimeMinutes = Math.round(clampNumber(numberOrDefault(value.freeTimeHoursPerDay, 2), 0, 24) * 7 * 60);
  const privateMinutes = Math.round(clampNumber(numberOrDefault(value.privateCommitmentsHoursPerWeek, 12), 0, 168) * 60);
  const bufferMinutes = Math.round(clampNumber(numberOrDefault(value.weeklyBufferHours, 8), 0, 168) * 60);
  return [
    buildIncomePlanningManualBlock("private_commitment", "income-plan-private-commitments", {
      slots: [legacyFlexibleIncomePlanningSlot("income-plan-private-commitments-slot", privateMinutes)]
    }),
    buildIncomePlanningManualBlock("free_time", "income-plan-free-time", {
      slots: [legacyFlexibleIncomePlanningSlot("income-plan-free-time-slot", freeTimeMinutes)]
    }),
    buildIncomePlanningManualBlock("buffer", "income-plan-weekly-buffer", {
      slots: [legacyFlexibleIncomePlanningSlot("income-plan-weekly-buffer-slot", bufferMinutes)]
    })
  ];
}

export function legacyFlexibleIncomePlanningSlot(id: string, durationMinutes: number): IncomePlanningSlot {
  return {
    id,
    day: "sunday",
    startTime: "00:00",
    endTime: "00:00",
    flexible: true,
    durationMinutes
  };
}

export function isSlot(value: IncomePlanningSlot | null): value is IncomePlanningSlot {
  return value !== null;
}

export function normalizeIncomePlanningTime(value: unknown, fallback: string): string {
  const time = String(value || "");
  return /^([0-1]\d|2[0-3]):([0-5]\d)$/.test(time) ? time : fallback;
}

export function normalizeIncomePlanningDate(value: unknown, fallback: string): string {
  const date = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fallback;
  const [yearRaw, monthRaw, dayRaw] = date.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day ? date : fallback;
}

export function normalizeIncomePlanningWeekStartDate(value: unknown): string | null {
  const date = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [yearRaw, monthRaw, dayRaw] = date.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return parsed.getDay() === 1 ? date : null;
}

export function todayLocalDateString(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function fallbackDuration(startTime: string, endTime: string, fallback: number): number {
  const start = timeMinutes(startTime);
  const end = timeMinutes(endTime);
  return start !== null && end !== null && end > start ? end - start : fallback;
}

export function timeMinutes(value: string): number | null {
  const match = /^([0-1]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function normalizeIncomePlanningCategory(value: unknown): IncomePlanningCategory {
  const raw = String(value ?? "");
  const legacyCategories: Record<string, IncomePlanningCategory> = {
    main_job: "salary",
    part_time_job: "salary",
    self_employment: "self_employed",
    small_business: "self_employed",
    rental: "garage_parking_rental",
    capital_income: "dividends",
    trainer_volunteer: "trainer_allowance",
    board_advisory: "supervisory_board",
    project_work: "freelance"
  };
  if (legacyCategories[raw]) return legacyCategories[raw];
  const normalized = normalizeIncomeTaxRuleLabel(raw);
  if (INCOME_PLANNING_CATEGORY_IDS.includes(normalized as IncomePlanningCategory)) {
    return normalized as IncomePlanningCategory;
  }
  const key = incomePlanningCategoryKey(raw);
  const labelMatch = INCOME_PLANNING_CATEGORY_IDS.find(
    (category) => incomePlanningCategoryKey(incomePlanningCategoryConfig(category).label) === key
  );
  return labelMatch ?? "other";
}

export function incomePlanningCategoryKey(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .replace(/[^a-z0-9]/g, "");
}
