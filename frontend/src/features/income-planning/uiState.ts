import type { IncomePlanningPlannerEntryType } from "../../domain/incomePlanning";
import type {
  IncomePlanningCategory,
  IncomePlanningHabit,
  IncomePlanningManualBlockType,
  IncomePlanningWeekScenarioId,
  IncomePlanningWeekday
} from "./model";

export type IncomePlanningOwnerType = "work" | "habit" | "manual" | "assumption";
export type IncomePlanningDialogMode = "create" | "edit" | "create_slot" | "edit_slot";
export type IncomeStampPlannerDateRange = { start: Date; end: Date; year: number; month: number };
export interface IncomePlanningSleepSlotGroup {
  id: string;
  fromDay: IncomePlanningWeekday;
  toDay: IncomePlanningWeekday;
  startTime: string;
  endTime: string;
  flexible: boolean;
  durationMinutes: number;
  scenarioIds: IncomePlanningWeekScenarioId[];
  slotIds: Partial<Record<IncomePlanningWeekday, string>>;
}
export type IncomePlanningDialogState = {
  mode: IncomePlanningDialogMode;
  ownerType: IncomePlanningOwnerType;
  ownerId: string | null;
  slotId: string | null;
  active: boolean;
  category: IncomePlanningCategory;
  manualType: IncomePlanningManualBlockType;
  habitType: IncomePlanningHabit["type"];
  habitDurationUnit: IncomePlanningHabit["durationUnit"];
  habitGoalChange: IncomePlanningHabit["goalChange"];
  habitStatus: IncomePlanningHabit["status"];
  priority: IncomePlanningHabit["priority"];
  name: string;
  description: string;
  color: string;
  habitIcon: string;
  manualIcon: string;
  timing: string;
  habitDurationMinutes: number;
  replacementHabit: string;
  sleepHoursPerDay: number;
  sleepSlotGroups: IncomePlanningSleepSlotGroup[];
  slotNote: string;
  day: IncomePlanningWeekday;
  toDay: IncomePlanningWeekday;
  startTime: string;
  endTime: string;
  flexible: boolean;
  slotDurationMinutes: number;
  pauseEnabled: boolean;
  pauseStartTime: string;
  pauseEndTime: string;
  pauseDurationMinutes: number;
  scenarioIds: IncomePlanningWeekScenarioId[];
  error: string;
} | null;
export interface IncomePlanningCalendarBackgroundEntry {
  id: string;
  day: IncomePlanningWeekday;
  startMinute: number;
  endMinute: number;
  title: string;
  label: string;
  detail: string;
  icon: string;
  type: IncomePlanningPlannerEntryType | "sleep";
  flexible: boolean;
  color?: string;
  sleepGroupId?: string;
}
export type IncomePlanningDragMode = "move" | "resize-start" | "resize-end";
export type IncomePlanningDragState = {
  ownerType: Exclude<IncomePlanningOwnerType, "assumption">;
  ownerId: string;
  slotId: string;
  slotPart: "main" | "pause";
  mode: IncomePlanningDragMode;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  originalDay: IncomePlanningWeekday;
  originalStartMinute: number;
  originalEndMinute: number;
  dayWidth: number;
  columnHeight: number;
  element: HTMLElement;
  moved: boolean;
} | null;
export type IncomePlanningSleepDragState = {
  groupId: string;
  group: IncomePlanningSleepSlotGroup;
  pointerId: number;
  startClientY: number;
  originalStartMinute: number;
  durationMinutes: number;
  overnight: boolean;
  columnHeight: number;
  elements: HTMLElement[];
  moved: boolean;
} | null;
export type IncomePlanningStampDragState = {
  stampId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  originalDay: IncomePlanningWeekday;
  originalStartMinute: number;
  dayWidth: number;
  columnHeight: number;
  element: HTMLElement;
  moved: boolean;
} | null;
export type IncomePlanningPlannedStampDragState = {
  stampId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  originalDate: string;
  originalStartMinute: number;
  dayWidth: number;
  columnHeight: number;
  element: HTMLElement;
  moved: boolean;
} | null;
export type IncomeStampPlannerStampDragState = {
  stampId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  element: HTMLElement;
  moved: boolean;
} | null;

export interface IncomePlanningUiState {
  dialog: IncomePlanningDialogState;
  dragState: IncomePlanningDragState;
  sleepDragState: IncomePlanningSleepDragState;
  stampDragState: IncomePlanningStampDragState;
  plannedStampDragState: IncomePlanningPlannedStampDragState;
  suppressNextCalendarClick: boolean;
  habitIconPicker: { top: number; left: number } | null;
  stampPicker: {
    stampId: string | null;
    day: IncomePlanningWeekday;
    startTime: string;
    icon: string;
    label: string;
    scenarioIds: IncomePlanningWeekScenarioId[];
    top: number;
    left: number;
  } | null;
  stampMenu: { stampId: string; top: number; left: number } | null;
  weekCursor: Date;
  stampPlannerMonthCursor: Date;
  stampPlannerStampDragState: IncomeStampPlannerStampDragState;
  stampPlannerSuppressNextClick: boolean;
  stampPlannerDialog: {
    stampId: string | null;
    date: string;
    startTime: string;
    icon: string;
    label: string;
    description: string;
    scenarioIds: IncomePlanningWeekScenarioId[];
    error: string;
  } | null;
  weekScenarioDialog: { label: string; error: string } | null;
  currentTimeTimerId: number | null;
}

export const incomePlanningUiState: IncomePlanningUiState = {
  dialog: null,
  dragState: null,
  sleepDragState: null,
  stampDragState: null,
  plannedStampDragState: null,
  suppressNextCalendarClick: false,
  habitIconPicker: null,
  stampPicker: null,
  stampMenu: null,
  weekCursor: startOfWeek(new Date()),
  stampPlannerMonthCursor: startOfMonth(new Date()),
  stampPlannerStampDragState: null,
  stampPlannerSuppressNextClick: false,
  stampPlannerDialog: null,
  weekScenarioDialog: null,
  currentTimeTimerId: null
};

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function startOfWeek(value: Date): Date {
  const start = startOfDay(value);
  const dayOffset = (start.getDay() + 6) % 7;
  return addDays(start, -dayOffset);
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}
