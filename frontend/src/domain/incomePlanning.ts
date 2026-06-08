import { INCOME_YEAR_LABEL_OPTIONS } from "./incomeLabels";
import type {
  IncomePlanningAssumptions,
  IncomePlanningCategory,
  IncomePlanningHabit,
  IncomePlanningHabitChange,
  IncomePlanningHabitDurationUnit,
  IncomePlanningHabitStatus,
  IncomePlanningHabitType,
  IncomePlanningManualBlock,
  IncomePlanningManualBlockType,
  IncomePlanningPriority,
  IncomePlanningSleepSlot,
  IncomePlanningSlot,
  IncomePlanningState,
  IncomePlanningWeekday,
  IncomePlanningWorkBlock
} from "../types";

export const INCOME_PLANNING_WEEK_HOURS = 168;
export const INCOME_PLANNING_WEEK_MINUTES = INCOME_PLANNING_WEEK_HOURS * 60;
export const INCOME_PLANNING_WEEK_DAYS: IncomePlanningWeekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];
export const INCOME_PLANNING_CATEGORY_IDS: IncomePlanningCategory[] = INCOME_YEAR_LABEL_OPTIONS.map(
  (option) => option.id as IncomePlanningCategory
);

export interface IncomePlanningSlotTemplate {
  day: IncomePlanningWeekday;
  startTime: string;
  endTime: string;
  flexible: boolean;
  durationMinutes: number;
}

export interface IncomePlanningCategoryConfig {
  id: IncomePlanningCategory;
  label: string;
  icon: string;
  description: string;
  defaultName: string;
  defaultSlots: IncomePlanningSlotTemplate[];
}

export type IncomePlanningPlannerEntryType =
  | "career"
  | "side_work"
  | "private_commitment"
  | "free_time"
  | "buffer"
  | "good_habit"
  | "bad_habit"
  | "replacement_habit"
  | "other_event";

export interface IncomePlanningCalendarEntry {
  id: string;
  ownerId: string;
  slotId: string;
  day: IncomePlanningWeekday;
  startTime: string;
  endTime: string;
  flexible: boolean;
  durationMinutes: number;
  title: string;
  type: IncomePlanningPlannerEntryType;
  conflict: boolean;
  invalid: boolean;
  startMinute: number;
  endMinute: number;
}

export interface IncomePlanningSlotCalendarSegment {
  day: IncomePlanningWeekday;
  startMinute: number;
  endMinute: number;
  durationMinutes: number;
}

export interface IncomePlanningModel {
  activeWorkBlocks: IncomePlanningWorkBlock[];
  careerWorkBlocks: IncomePlanningWorkBlock[];
  activeHabits: IncomePlanningHabit[];
  activeManualBlocks: IncomePlanningManualBlock[];
  calendarEntries: IncomePlanningCalendarEntry[];
  totalWorkHours: number;
  habitHours: number;
  manualHours: number;
  sleepHoursPerWeek: number;
  usedHours: number;
  remainingFlexibleHours: number;
  conflictCount: number;
  invalidSlotCount: number;
  status: "realistic" | "high" | "unrealistic";
  warnings: string[];
}

type IncomePlanningCategoryOverride = Partial<Omit<IncomePlanningCategoryConfig, "id" | "label" | "icon" | "description">>;
type CalendarEntryDraft = Omit<IncomePlanningCalendarEntry, "conflict">;

const INCOME_PLANNING_DAY_INDEX: Record<IncomePlanningWeekday, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6
};

const DEFAULT_WORK_SLOTS: IncomePlanningSlotTemplate[] = [
  flexibleSlot("sunday", 4 * 60)
];

const INCOME_PLANNING_CATEGORY_OVERRIDES: Partial<Record<IncomePlanningCategory, IncomePlanningCategoryOverride>> = {
  salary: {
    defaultName: "Gehalt",
    defaultSlots: [
      timedSlot("monday", "06:30", "16:30"),
      timedSlot("tuesday", "06:30", "16:30"),
      timedSlot("wednesday", "06:30", "16:30"),
      timedSlot("thursday", "06:30", "16:30"),
      timedSlot("friday", "06:30", "16:30")
    ]
  },
  training_allowance: {
    defaultName: "Ausbildung",
    defaultSlots: [
      timedSlot("monday", "08:00", "15:00"),
      timedSlot("tuesday", "08:00", "15:00"),
      timedSlot("wednesday", "08:00", "15:00"),
      timedSlot("thursday", "08:00", "15:00"),
      timedSlot("friday", "08:00", "15:00")
    ]
  },
  minijob: {
    defaultName: "Nebenjob",
    defaultSlots: [timedSlot("saturday", "10:00", "14:00"), timedSlot("sunday", "10:00", "14:00")]
  },
  self_employed: {
    defaultName: "Nebenberufliche Selbststaendigkeit",
    defaultSlots: []
  },
  freelance: {
    defaultName: "Freiberufliche Arbeit",
    defaultSlots: [timedSlot("tuesday", "18:00", "21:00"), timedSlot("thursday", "18:00", "21:00")]
  },
  side_income: {
    defaultName: "Nebentaetigkeit",
    defaultSlots: [timedSlot("monday", "18:00", "20:00"), timedSlot("wednesday", "18:00", "20:00")]
  },
  online_sales: {
    defaultName: "Online-Verkaeufe",
    defaultSlots: [
      timedSlot("monday", "17:00", "17:25"),
      timedSlot("wednesday", "17:00", "17:25"),
      timedSlot("friday", "17:00", "17:25")
    ]
  },
  garage_parking_rental: {
    defaultName: "Verwaltung Stellplatz",
    defaultSlots: [flexibleSlot("sunday", 60)]
  },
  dividends: {
    defaultName: "Investmentpflege",
    defaultSlots: [flexibleSlot("sunday", 30)]
  },
  asset_income: {
    defaultName: "Vermoegensverwaltung",
    defaultSlots: [flexibleSlot("sunday", 60)]
  },
  bonus: {
    defaultName: "Sonderaufgabe",
    defaultSlots: []
  },
  severance_payment: {
    defaultName: "Uebergangsplanung",
    defaultSlots: [flexibleSlot("sunday", 60)]
  },
  child_youth_jobs: {
    defaultName: "Kinder- oder Jugendjob",
    defaultSlots: [timedSlot("saturday", "10:00", "12:00")]
  },
  board: {
    defaultName: "Beirat",
    defaultSlots: [flexibleSlot("wednesday", 2 * 60)]
  },
  office_holder: {
    defaultName: "Amt",
    defaultSlots: [flexibleSlot("wednesday", 2 * 60)]
  },
  supervisory_board: {
    defaultName: "Aufsichtsrat",
    defaultSlots: [flexibleSlot("wednesday", 2 * 60)]
  },
  other: {
    defaultName: "Sonstige Arbeit",
    defaultSlots: DEFAULT_WORK_SLOTS
  }
};

export const INCOME_PLANNING_CATEGORY_CONFIGS: IncomePlanningCategoryConfig[] = INCOME_YEAR_LABEL_OPTIONS.map(
  (option) => {
    const overrides = INCOME_PLANNING_CATEGORY_OVERRIDES[option.id as IncomePlanningCategory] ?? {};
    return {
      id: option.id as IncomePlanningCategory,
      label: option.label,
      icon: option.icon,
      description: option.description,
      defaultName: overrides.defaultName ?? `${option.label} planen`,
      defaultSlots: overrides.defaultSlots ?? DEFAULT_WORK_SLOTS
    };
  }
);

export function incomePlanningCategoryConfig(category: IncomePlanningCategory): IncomePlanningCategoryConfig {
  return INCOME_PLANNING_CATEGORY_CONFIGS.find((config) => config.id === category) ?? INCOME_PLANNING_CATEGORY_CONFIGS[0];
}

export function isIncomePlanningMainJobCategory(category: IncomePlanningCategory): boolean {
  return category === "salary" || category === "training_allowance";
}

export function incomePlanningDefaultWorkCategory(workBlocks: IncomePlanningWorkBlock[]): IncomePlanningCategory {
  return workBlocks.some((block) => block.active && isIncomePlanningMainJobCategory(block.category)) ? "side_income" : "salary";
}

export function enforceSingleActiveIncomePlanningMainJob(
  workBlocks: IncomePlanningWorkBlock[],
  primaryId: string
): IncomePlanningWorkBlock[] {
  const primary = workBlocks.find(
    (block) => block.id === primaryId && block.active && isIncomePlanningMainJobCategory(block.category)
  );
  if (!primary) return workBlocks;
  return workBlocks.map((block) =>
    block.id !== primary.id && block.active && isIncomePlanningMainJobCategory(block.category) ? { ...block, active: false } : block
  );
}

export function buildDefaultIncomePlanningSleepSlots(): IncomePlanningSleepSlot[] {
  return [
    sleepSlot("income-plan-sleep-sunday", "sunday", "21:00", "05:30", false),
    sleepSlot("income-plan-sleep-monday", "monday", "21:00", "05:30", false),
    sleepSlot("income-plan-sleep-tuesday", "tuesday", "21:00", "05:30", false),
    sleepSlot("income-plan-sleep-wednesday", "wednesday", "21:00", "05:30", false),
    sleepSlot("income-plan-sleep-thursday", "thursday", "21:00", "05:30", false),
    sleepSlot("income-plan-sleep-friday", "friday", "23:00", "09:00", true),
    sleepSlot("income-plan-sleep-saturday", "saturday", "23:00", "09:00", true)
  ];
}

export function buildIncomePlanningWorkBlock(
  category: IncomePlanningCategory,
  id: string,
  overrides: Partial<IncomePlanningWorkBlock> = {}
): IncomePlanningWorkBlock {
  const config = incomePlanningCategoryConfig(category);
  const slots = overrides.slots ?? slotsFromTemplates(id, config.defaultSlots);
  return {
    id,
    active: true,
    category,
    name: config.defaultName,
    description: "",
    slots,
    ...overrides
  };
}

export function buildIncomePlanningHabit(
  id: string,
  overrides: Partial<IncomePlanningHabit> = {}
): IncomePlanningHabit {
  const durationMinutes = overrides.durationMinutes ?? 30;
  const durationUnit = overrides.durationUnit ?? "day";
  const slots = overrides.slots ?? dailyHabitSlots(id, durationMinutes, "21:30");
  return {
    id,
    active: true,
    type: "good",
    name: "Buch lesen",
    description: "",
    timing: "vor dem Schlafen",
    durationMinutes,
    durationUnit,
    goalChange: "build",
    replacementHabit: "",
    status: "planned",
    priority: "medium",
    slots,
    ...overrides
  };
}

export function buildIncomePlanningManualBlock(
  type: IncomePlanningManualBlockType,
  id: string,
  overrides: Partial<IncomePlanningManualBlock> = {}
): IncomePlanningManualBlock {
  const config = manualBlockDefaults(type);
  const slots = overrides.slots ?? config.slots;
  return {
    id,
    active: true,
    type,
    name: config.name,
    description: "",
    slots,
    ...overrides
  };
}

export function buildIncomePlanningModel(state: IncomePlanningState): IncomePlanningModel {
  const activeWorkBlocks = state.workBlocks.filter((block) => block.active);
  const careerWorkBlocks = activeWorkBlocks.filter((block) => isIncomePlanningMainJobCategory(block.category));
  const activeHabits = state.habits.filter((habit) => habit.active);
  const activeManualBlocks = state.manualBlocks.filter((block) => block.active);
  const drafts = [
    ...activeWorkBlocks.flatMap(workBlockCalendarEntries),
    ...activeHabits.flatMap(habitCalendarEntries),
    ...activeManualBlocks.flatMap(manualBlockCalendarEntries)
  ];
  const conflictResult = detectConflicts(drafts);
  const calendarEntries = drafts
    .map((entry) => ({ ...entry, conflict: conflictResult.entryIds.has(entry.id) }))
    .sort(compareCalendarEntries);

  const totalWorkMinutes = sumEntryMinutes(calendarEntries, ["career", "side_work"]);
  const habitMinutes = sumEntryMinutes(calendarEntries, ["good_habit", "bad_habit", "replacement_habit"]);
  const manualMinutes = sumEntryMinutes(calendarEntries, ["private_commitment", "free_time", "buffer", "other_event"]);
  const sleepMinutes = incomePlanningSleepMinutes(state.assumptions);
  const usedMinutes = sleepMinutes + totalWorkMinutes + habitMinutes + manualMinutes;
  const remainingMinutes = INCOME_PLANNING_WEEK_MINUTES - usedMinutes;
  const nonSleepMinutes = usedMinutes - sleepMinutes;
  const totalWorkHours = minutesToHours(totalWorkMinutes);
  const usedHours = minutesToHours(usedMinutes);
  const remainingFlexibleHours = minutesToHours(remainingMinutes);
  const status =
    remainingMinutes < 0 || nonSleepMinutes > 90 * 60
      ? "unrealistic"
      : remainingMinutes < 10 * 60 || totalWorkMinutes > 55 * 60 || conflictResult.count > 0
        ? "high"
        : "realistic";
  const invalidSlotCount = calendarEntries.filter((entry) => entry.invalid).length;

  return {
    activeWorkBlocks,
    careerWorkBlocks,
    activeHabits,
    activeManualBlocks,
    calendarEntries,
    totalWorkHours,
    habitHours: minutesToHours(habitMinutes),
    manualHours: minutesToHours(manualMinutes),
    sleepHoursPerWeek: minutesToHours(sleepMinutes),
    usedHours,
    remainingFlexibleHours,
    conflictCount: conflictResult.count,
    invalidSlotCount,
    status,
    warnings: incomePlanningWarnings({
      sleepMinutes,
      status,
      remainingMinutes,
      totalWorkMinutes,
      nonSleepMinutes,
      conflictCount: conflictResult.count,
      invalidSlotCount
    })
  };
}

function workBlockCalendarEntries(block: IncomePlanningWorkBlock): CalendarEntryDraft[] {
  const type: IncomePlanningPlannerEntryType = isIncomePlanningMainJobCategory(block.category) ? "career" : "side_work";
  return block.slots.map((slot) => calendarEntryFromSlot(block.id, slot, block.name, type));
}

function habitCalendarEntries(habit: IncomePlanningHabit): CalendarEntryDraft[] {
  const slots = habit.slots.length ? habit.slots : habitFallbackSlots(habit);
  const ownType: IncomePlanningPlannerEntryType = habit.type === "good" ? "good_habit" : "bad_habit";
  const entries = slots.map((slot) => calendarEntryFromSlot(habit.id, slot, habit.name, ownType));
  if (habit.type === "bad" && habit.goalChange === "replace" && habit.replacementHabit.trim()) {
    entries.push(
      ...slots.map((slot) =>
        calendarEntryFromSlot(habit.id, slot, habit.replacementHabit.trim(), "replacement_habit", `${habit.id}:replacement`)
      )
    );
  }
  return entries;
}

function manualBlockCalendarEntries(block: IncomePlanningManualBlock): CalendarEntryDraft[] {
  return block.slots.map((slot) => calendarEntryFromSlot(block.id, slot, block.name, plannerTypeForManualBlock(block.type)));
}

function calendarEntryFromSlot(
  ownerId: string,
  slot: IncomePlanningSlot,
  title: string,
  type: IncomePlanningPlannerEntryType,
  idPrefix = ownerId
): CalendarEntryDraft {
  const startMinute = parseTimeMinutes(slot.startTime);
  const endMinute = parseTimeMinutes(slot.endTime);
  const invalid = !slot.flexible && (startMinute === null || endMinute === null || endMinute <= startMinute);
  return {
    id: `${idPrefix}:${slot.id}:${type}`,
    ownerId,
    slotId: slot.id,
    day: slot.day,
    startTime: slot.startTime,
    endTime: slot.endTime,
    flexible: slot.flexible,
    durationMinutes: slotDurationMinutes(slot),
    title,
    type,
    invalid,
    startMinute: startMinute ?? 0,
    endMinute: endMinute ?? 0
  };
}

function slotDurationMinutes(slot: IncomePlanningSlot): number {
  if (slot.flexible) return Math.max(0, Math.round(slot.durationMinutes));
  const start = parseTimeMinutes(slot.startTime);
  const end = parseTimeMinutes(slot.endTime);
  if (start !== null && end !== null && end > start) return end - start;
  return Math.max(0, Math.round(slot.durationMinutes));
}

export function incomePlanningSleepSlotDurationMinutes(slot: IncomePlanningSleepSlot): number {
  if (slot.flexible) return Math.max(0, Math.round(slot.durationMinutes));
  return incomePlanningSlotCalendarSegments(slot).reduce((sum, segment) => sum + segment.durationMinutes, 0);
}

export function incomePlanningSleepMinutes(assumptions: IncomePlanningAssumptions): number {
  if (assumptions.sleepSlots.length) {
    return assumptions.sleepSlots.reduce((sum, slot) => sum + incomePlanningSleepSlotDurationMinutes(slot), 0);
  }
  return Math.round(positiveNumber(assumptions.sleepHoursPerDay) * 7 * 60);
}

export function incomePlanningAverageSleepHours(assumptions: IncomePlanningAssumptions): number {
  return minutesToHours(incomePlanningSleepMinutes(assumptions) / 7);
}

export function incomePlanningSlotCalendarSegments(
  slot: Pick<IncomePlanningSleepSlot, "day" | "startTime" | "endTime" | "flexible" | "durationMinutes">
): IncomePlanningSlotCalendarSegment[] {
  const start = parseTimeMinutes(slot.startTime);
  const end = parseTimeMinutes(slot.endTime);
  if (start === null || end === null) {
    return [{ day: slot.day, startMinute: 0, endMinute: 24 * 60, durationMinutes: Math.max(0, Math.round(slot.durationMinutes)) }];
  }
  if (slot.flexible && start === end) {
    return [{ day: slot.day, startMinute: 0, endMinute: 24 * 60, durationMinutes: Math.max(0, Math.round(slot.durationMinutes)) }];
  }
  if (end > start) {
    return [{ day: slot.day, startMinute: start, endMinute: end, durationMinutes: end - start }];
  }
  return [
    { day: slot.day, startMinute: start, endMinute: 24 * 60, durationMinutes: 24 * 60 - start },
    { day: nextIncomePlanningWeekday(slot.day), startMinute: 0, endMinute: end, durationMinutes: end }
  ].filter((segment) => segment.durationMinutes > 0);
}

function habitFallbackSlots(habit: IncomePlanningHabit): IncomePlanningSlot[] {
  if (habit.durationUnit === "day") {
    return INCOME_PLANNING_WEEK_DAYS.map((day, index) => ({
      id: `${habit.id}-fallback-${index + 1}`,
      day,
      startTime: "00:00",
      endTime: "00:00",
      flexible: true,
      durationMinutes: Math.max(0, Math.round(habit.durationMinutes))
    }));
  }
  return [
    {
      id: `${habit.id}-fallback-week`,
      day: "sunday",
      startTime: "00:00",
      endTime: "00:00",
      flexible: true,
      durationMinutes: Math.max(0, Math.round(habit.durationMinutes))
    }
  ];
}

function detectConflicts(entries: CalendarEntryDraft[]): { entryIds: Set<string>; count: number } {
  const entryIds = new Set<string>();
  let count = 0;
  const timedEntries = entries.filter((entry) => !entry.flexible && !entry.invalid);
  for (let index = 0; index < timedEntries.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < timedEntries.length; nextIndex += 1) {
      const first = timedEntries[index];
      const second = timedEntries[nextIndex];
      if (first.day !== second.day) continue;
      if (first.startMinute < second.endMinute && second.startMinute < first.endMinute) {
        entryIds.add(first.id);
        entryIds.add(second.id);
        count += 1;
      }
    }
  }
  return { entryIds, count };
}

function incomePlanningWarnings(input: {
  sleepMinutes: number;
  status: IncomePlanningModel["status"];
  remainingMinutes: number;
  totalWorkMinutes: number;
  nonSleepMinutes: number;
  conflictCount: number;
  invalidSlotCount: number;
}): string[] {
  const warnings: string[] = [];
  if (input.sleepMinutes / 7 / 60 < 7) {
    warnings.push("Die Schlafannahme liegt unter 7 Stunden pro Tag.");
  }
  if (input.invalidSlotCount > 0) {
    warnings.push(`${input.invalidSlotCount} Zeitblock-Eintrag ist ungueltig oder laeuft ueber Mitternacht.`);
  }
  if (input.conflictCount > 0) {
    warnings.push(`${input.conflictCount} Ueberschneidung im Wochenplaner ist markiert.`);
  }
  if (input.remainingMinutes < 0) {
    warnings.push("Die geplante Woche ist ueberbucht. Es bleibt keine freie Reserve uebrig.");
  } else if (input.status === "high") {
    warnings.push("Die Wochenbelastung ist sehr hoch. Pruefe Arbeit, Habits und Puffer gemeinsam.");
  }
  if (input.totalWorkMinutes > 55 * 60) {
    warnings.push("Die reine Arbeitszeit liegt ueber 55 Stunden pro Woche.");
  }
  if (input.nonSleepMinutes > 90 * 60) {
    warnings.push("Neben Schlaf sind mehr als 90 Stunden verplant.");
  }
  return warnings;
}

function sumEntryMinutes(entries: IncomePlanningCalendarEntry[], types: IncomePlanningPlannerEntryType[]): number {
  return entries.reduce((sum, entry) => (types.includes(entry.type) ? sum + entry.durationMinutes : sum), 0);
}

function plannerTypeForManualBlock(type: IncomePlanningManualBlockType): IncomePlanningPlannerEntryType {
  if (type === "private_commitment") return "private_commitment";
  if (type === "free_time") return "free_time";
  if (type === "buffer") return "buffer";
  return "other_event";
}

function compareCalendarEntries(first: IncomePlanningCalendarEntry, second: IncomePlanningCalendarEntry): number {
  const dayDiff = INCOME_PLANNING_DAY_INDEX[first.day] - INCOME_PLANNING_DAY_INDEX[second.day];
  if (dayDiff !== 0) return dayDiff;
  if (first.flexible !== second.flexible) return first.flexible ? 1 : -1;
  const timeDiff = first.startMinute - second.startMinute;
  if (timeDiff !== 0) return timeDiff;
  return first.title.localeCompare(second.title, "de");
}

function slotsFromTemplates(ownerId: string, templates: IncomePlanningSlotTemplate[]): IncomePlanningSlot[] {
  return templates.map((slot, index) => ({
    id: `${ownerId}-slot-${index + 1}`,
    ...slot
  }));
}

function dailyHabitSlots(ownerId: string, durationMinutes: number, startTime: string): IncomePlanningSlot[] {
  const startMinutes = parseTimeMinutes(startTime) ?? 0;
  const endTime = formatTimeMinutes(Math.min(23 * 60 + 59, startMinutes + durationMinutes));
  return INCOME_PLANNING_WEEK_DAYS.map((day, index) => ({
    id: `${ownerId}-slot-${index + 1}`,
    day,
    startTime,
    endTime,
    flexible: false,
    durationMinutes
  }));
}

function sleepSlot(
  id: string,
  day: IncomePlanningWeekday,
  startTime: string,
  endTime: string,
  flexible: boolean
): IncomePlanningSleepSlot {
  const segments = incomePlanningSlotCalendarSegments({ day, startTime, endTime, flexible: false, durationMinutes: 0 });
  const durationMinutes = segments.reduce((sum, segment) => sum + segment.durationMinutes, 0);
  return {
    id,
    day,
    startTime,
    endTime,
    flexible,
    durationMinutes
  };
}

function manualBlockDefaults(type: IncomePlanningManualBlockType): { name: string; slots: IncomePlanningSlot[] } {
  if (type === "private_commitment") {
    return { name: "Private Verpflichtungen", slots: [slot("manual-private-slot", flexibleSlot("sunday", 12 * 60))] };
  }
  if (type === "free_time") {
    return { name: "Freizeit", slots: [slot("manual-free-time-slot", flexibleSlot("sunday", 14 * 60))] };
  }
  if (type === "buffer") {
    return { name: "Wochenpuffer", slots: [slot("manual-buffer-slot", flexibleSlot("sunday", 8 * 60))] };
  }
  return { name: "Sonstiges Ereignis", slots: [slot("manual-other-slot", flexibleSlot("sunday", 60))] };
}

function timedSlot(day: IncomePlanningWeekday, startTime: string, endTime: string): IncomePlanningSlotTemplate {
  const start = parseTimeMinutes(startTime) ?? 0;
  const end = parseTimeMinutes(endTime) ?? start;
  return {
    day,
    startTime,
    endTime,
    flexible: false,
    durationMinutes: Math.max(0, end - start)
  };
}

export function flexibleSlot(day: IncomePlanningWeekday, durationMinutes: number): IncomePlanningSlotTemplate {
  return {
    day,
    startTime: "00:00",
    endTime: "00:00",
    flexible: true,
    durationMinutes
  };
}

export function slot(id: string, template: IncomePlanningSlotTemplate): IncomePlanningSlot {
  return { id, ...template };
}

export function parseTimeMinutes(value: string): number | null {
  const match = /^([0-1]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatTimeMinutes(value: number): string {
  const normalized = Math.max(0, Math.min(23 * 60 + 59, Math.round(value)));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function minutesToHours(value: number): number {
  return Math.round((value / 60 + Number.EPSILON) * 10) / 10;
}

function positiveNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function nextIncomePlanningWeekday(day: IncomePlanningWeekday): IncomePlanningWeekday {
  return INCOME_PLANNING_WEEK_DAYS[(INCOME_PLANNING_DAY_INDEX[day] + 1) % INCOME_PLANNING_WEEK_DAYS.length];
}

export function isIncomePlanningWeekday(value: unknown): value is IncomePlanningWeekday {
  return INCOME_PLANNING_WEEK_DAYS.includes(value as IncomePlanningWeekday);
}

export function isIncomePlanningHabitType(value: unknown): value is IncomePlanningHabitType {
  return value === "good" || value === "bad";
}

export function isIncomePlanningHabitChange(value: unknown): value is IncomePlanningHabitChange {
  return value === "keep" || value === "reduce" || value === "replace" || value === "build";
}

export function isIncomePlanningHabitStatus(value: unknown): value is IncomePlanningHabitStatus {
  return value === "planned" || value === "active" || value === "difficult" || value === "stable";
}

export function isIncomePlanningPriority(value: unknown): value is IncomePlanningPriority {
  return value === "low" || value === "medium" || value === "high";
}

export function isIncomePlanningHabitDurationUnit(value: unknown): value is IncomePlanningHabitDurationUnit {
  return value === "day" || value === "week";
}

export function isIncomePlanningManualBlockType(value: unknown): value is IncomePlanningManualBlockType {
  return value === "private_commitment" || value === "free_time" || value === "buffer" || value === "other_event";
}

export function defaultIncomePlanningAssumptions(overrides: Partial<IncomePlanningAssumptions> = {}): IncomePlanningAssumptions {
  const sleepSlots = overrides.sleepSlots ?? buildDefaultIncomePlanningSleepSlots();
  return {
    sleepHoursPerDay: minutesToHours(sleepSlots.reduce((sum, slot) => sum + incomePlanningSleepSlotDurationMinutes(slot), 0) / 7),
    sleepSlots,
    ...overrides
  };
}
