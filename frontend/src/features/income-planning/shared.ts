import {
  INCOME_PLANNING_CATEGORY_CONFIGS,
  INCOME_PLANNING_WEEK_DAYS,
  incomePlanningDefaultManualColor,
  incomePlanningDefaultManualIcon,
  incomePlanningDefaultWorkColor,
  incomePlanningSlotGrossDurationMinutes,
  incomePlanningSlotNetDurationMinutes,
  incomePlanningSlotPauseDurationMinutes,
  parseTimeMinutes,
  type IncomePlanningModel,
  type IncomePlanningPlannerEntryType
} from "../../domain/incomePlanning";
import { clamp, intNumber } from "../../lib/format";
import type {
  IncomePlanningCategory,
  IncomePlanningHabit,
  IncomePlanningManualBlockType,
  IncomePlanningSlot,
  IncomePlanningWeekday
} from "../../types";
import type { IncomePlanningOwnerType } from "./uiState";

export function incomePlanningManualBlockTypeOptions(): Array<{ value: IncomePlanningManualBlockType; label: string }> {
  return [
    { value: "private_commitment", label: "Private Verpflichtung" },
    { value: "free_time", label: "Freizeit" },
    { value: "buffer", label: "Puffer" },
    { value: "other_event", label: "Sonstiges Ereignis" }
  ];
}

export function incomePlanningCategoryOptions(): Array<{ value: string; label: string }> {
  return INCOME_PLANNING_CATEGORY_CONFIGS.map((config) => ({ value: config.id, label: config.label }));
}

export function incomePlanningWeekdayOptionItems(): Array<{ value: string; label: string }> {
  return INCOME_PLANNING_WEEK_DAYS.map((day) => ({ value: day, label: incomePlanningWeekdayLabel(day) }));
}

export function incomePlanningHabitTypeOptions(): Array<{ value: string; label: string }> {
  return [
    { value: "good", label: "Gute Habit" },
    { value: "bad", label: "Schlechte Habit" }
  ];
}

export function incomePlanningHabitDurationUnitOptions(): Array<{ value: string; label: string }> {
  return [
    { value: "day", label: "Tag" },
    { value: "week", label: "Woche" }
  ];
}

export function incomePlanningHabitChangeOptions(): Array<{ value: string; label: string }> {
  return [
    { value: "keep", label: "Beibehalten" },
    { value: "reduce", label: "Reduzieren" },
    { value: "replace", label: "Ersetzen" },
    { value: "build", label: "Aufbauen" }
  ];
}

export function incomePlanningHabitStatusOptions(): Array<{ value: string; label: string }> {
  return [
    { value: "planned", label: "Geplant" },
    { value: "active", label: "Aktiv" },
    { value: "difficult", label: "Schwierig" },
    { value: "stable", label: "Stabil" }
  ];
}

export function incomePlanningPriorityOptions(): Array<{ value: string; label: string }> {
  return [
    { value: "low", label: "Niedrig" },
    { value: "medium", label: "Mittel" },
    { value: "high", label: "Hoch" }
  ];
}

export function incomePlanningWeekdayLabel(day: IncomePlanningWeekday): string {
  if (day === "monday") return "Montag";
  if (day === "tuesday") return "Dienstag";
  if (day === "wednesday") return "Mittwoch";
  if (day === "thursday") return "Donnerstag";
  if (day === "friday") return "Freitag";
  if (day === "saturday") return "Samstag";
  return "Sonntag";
}

export function incomePlanningWeekdayFromValue(value: unknown): IncomePlanningWeekday | null {
  return INCOME_PLANNING_WEEK_DAYS.includes(value as IncomePlanningWeekday) ? (value as IncomePlanningWeekday) : null;
}

export function incomePlanningWeekdayIndex(day: IncomePlanningWeekday): number {
  return INCOME_PLANNING_WEEK_DAYS.indexOf(day);
}

export function incomePlanningWeekdayByIndex(index: number): IncomePlanningWeekday {
  return INCOME_PLANNING_WEEK_DAYS[clamp(Math.round(index), 0, INCOME_PLANNING_WEEK_DAYS.length - 1)];
}

export function incomePlanningPlannerTypeLabel(type: IncomePlanningPlannerEntryType): string {
  if (type === "career") return "Hauptjob";
  if (type === "side_work") return "Nebentaetigkeit";
  if (type === "pause") return "Pause";
  if (type === "private_commitment") return "Private Verpflichtung";
  if (type === "free_time") return "Freizeit";
  if (type === "buffer") return "Puffer";
  if (type === "good_habit") return "Gute Habit";
  if (type === "bad_habit") return "Schlechte Habit";
  if (type === "replacement_habit") return "Ersatz-Habit";
  return "Sonstiges";
}

export function incomePlanningManualBlockTypeLabel(type: IncomePlanningManualBlockType): string {
  return incomePlanningManualBlockTypeOptions().find((option) => option.value === type)?.label ?? "Sonstiges Ereignis";
}

export function incomePlanningHabitChangeLabel(value: IncomePlanningHabit["goalChange"]): string {
  return incomePlanningHabitChangeOptions().find((option) => option.value === value)?.label ?? "Beibehalten";
}

export function incomePlanningOwnerTypeFromValue(value: unknown): Exclude<IncomePlanningOwnerType, "assumption"> {
  if (value === "work" || value === "habit" || value === "manual") return value;
  return "manual";
}

export function slotsHours(slots: IncomePlanningSlot[]): number {
  const minutes = slots.reduce((sum, slot) => sum + incomePlanningSlotNetDurationMinutes(slot), 0);
  return Math.round((minutes / 60 + Number.EPSILON) * 10) / 10;
}

export function slotsGrossHours(slots: IncomePlanningSlot[]): number {
  const minutes = slots.reduce((sum, slot) => sum + incomePlanningSlotGrossDurationMinutes(slot), 0);
  return Math.round((minutes / 60 + Number.EPSILON) * 10) / 10;
}

export function slotsPauseHours(slots: IncomePlanningSlot[]): number {
  const minutes = slots.reduce((sum, slot) => sum + incomePlanningSlotPauseDurationMinutes(slot), 0);
  return Math.round((minutes / 60 + Number.EPSILON) * 10) / 10;
}

export function normalizeIncomePlanningColor(value: unknown, fallback = "#6f7785"): string {
  const color = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : fallback;
}

export function incomePlanningColorStyle(color: string): string {
  const normalized = normalizeIncomePlanningColor(color);
  return `--entry-color:${normalized}; --entry-bg:${hexToRgba(normalized, 0.14)};`;
}

export function hexToRgba(color: string, alpha: number): string {
  const normalized = normalizeIncomePlanningColor(color);
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${clamp(alpha, 0, 1)})`;
}

export function snapIncomePlanningMinute(value: number): number {
  return Math.round(value / 15) * 15;
}

export function formatIncomePlanningTime(value: number): string {
  const normalized = clamp(Math.round(value), 0, 24 * 60 - 1);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function incomePlanningVisualRangeFromTimes(
  startTime: string,
  endTime: string,
  durationMinutes: number
): { startMinute: number; endMinute: number } {
  const parsedStart = parseTimeMinutes(startTime);
  const parsedEnd = parseTimeMinutes(endTime);
  const startMinute = clamp(parsedStart ?? 0, 0, 23 * 60 + 45);
  if (parsedEnd !== null && parsedEnd > startMinute) {
    return { startMinute, endMinute: clamp(parsedEnd, startMinute + 15, 24 * 60) };
  }
  const duration = clamp(Math.round(durationMinutes || 60), 15, 24 * 60 - startMinute);
  return { startMinute, endMinute: startMinute + duration };
}

export function incomePlanningStatusLabel(status: IncomePlanningModel["status"]): string {
  if (status === "unrealistic") return "Unrealistisch";
  if (status === "high") return "Hohe Belastung";
  return "Realistisch";
}

export function hoursLabel(value: number): string {
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value)} h`;
}

export function minutesLabel(value: number): string {
  if (value >= 60) return hoursLabel(Math.round((value / 60 + Number.EPSILON) * 10) / 10);
  return `${intNumber(value)} min`;
}

export function incomePlanningHeaderIcon(icon: "save" | "trash" | "chevron-left" | "chevron-right"): string {
  const paths: Record<"save" | "trash" | "chevron-left" | "chevron-right", string> = {
    save: '<path d="M5 4h12l2 2v14H5V4Z"/><path d="M8 4v6h8V4"/><path d="M8 17h8"/>',
    trash: '<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
    "chevron-left": '<path d="m15 18-6-6 6-6"/>',
    "chevron-right": '<path d="m9 18 6-6-6-6"/>'
  };
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      ${paths[icon]}
    </svg>
  `;
}

export function isIncomePlanningCategory(value: unknown): value is IncomePlanningCategory {
  return INCOME_PLANNING_CATEGORY_CONFIGS.some((config) => config.id === value);
}

export function isIncomePlanningWeekday(value: unknown): value is IncomePlanningWeekday {
  return INCOME_PLANNING_WEEK_DAYS.includes(value as IncomePlanningWeekday);
}

export function isIncomePlanningHabitType(value: unknown): value is IncomePlanningHabit["type"] {
  return value === "good" || value === "bad";
}

export function isIncomePlanningHabitDurationUnit(value: unknown): value is IncomePlanningHabit["durationUnit"] {
  return value === "day" || value === "week";
}

export function isIncomePlanningHabitChange(value: unknown): value is IncomePlanningHabit["goalChange"] {
  return value === "keep" || value === "reduce" || value === "replace" || value === "build";
}

export function isIncomePlanningHabitStatus(value: unknown): value is IncomePlanningHabit["status"] {
  return value === "planned" || value === "active" || value === "difficult" || value === "stable";
}

export function isIncomePlanningPriority(value: unknown): value is IncomePlanningHabit["priority"] {
  return value === "low" || value === "medium" || value === "high";
}

export function isIncomePlanningManualBlockType(value: unknown): value is IncomePlanningManualBlockType {
  return value === "private_commitment" || value === "free_time" || value === "buffer" || value === "other_event";
}

export function incomePlanningDefaultColorForOwner(
  ownerType: Exclude<IncomePlanningOwnerType, "assumption">,
  category: IncomePlanningCategory,
  manualType: IncomePlanningManualBlockType
): string {
  return ownerType === "work" ? incomePlanningDefaultWorkColor(category) : incomePlanningDefaultManualColor(manualType);
}

export function incomePlanningDefaultIconForManual(type: IncomePlanningManualBlockType): string {
  return incomePlanningDefaultManualIcon(type);
}
