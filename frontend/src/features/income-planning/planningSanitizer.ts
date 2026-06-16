import { createId } from "../../data/defaults";
import {
  INCOME_PLANNING_CATEGORY_CONFIGS,
  INCOME_PLANNING_WEEK_DAYS,
  incomePlanningDefaultManualColor,
  incomePlanningDefaultManualIcon,
  incomePlanningDefaultWorkColor,
  incomePlanningStripSlotPause,
  parseTimeMinutes
} from "../../domain/incomePlanning";
import { clamp, numberValue } from "../../lib/format";
import { normalizePositionIcon } from "../../lib/positionIcons";
import type {
  IncomePlanningAssumptions,
  IncomePlanningCategory,
  IncomePlanningHabit,
  IncomePlanningManualBlock,
  IncomePlanningManualBlockType,
  IncomePlanningSlot,
  IncomePlanningWeekday,
  IncomePlanningWorkBlock
} from "../../types";
import { incomePlanningHostRef as host } from "./host";
import { normalizeIncomePlanningColor } from "./shared";

export function removeIncomePlanningSlot(ownerType: string, ownerId: string, slotId: string): void {
  if (!ownerType || !ownerId || !slotId) return;
  updateIncomePlanningOwnerSlots(ownerType, ownerId, (slots) => slots.filter((slot) => slot.id !== slotId));
  host.renderAll();
  host.persistCurrentState();
}

export function updateIncomePlanningAssumption(field: keyof IncomePlanningAssumptions, value: string): void {
  if (field !== "sleepHoursPerDay") return;
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    assumptions: {
      ...host.getState().incomePlanning.assumptions,
      sleepHoursPerDay: Math.max(0, numberValue(value))
    }
  };
}

export function updateIncomePlanningWorkBlock(
  workBlockId: string,
  field: keyof IncomePlanningWorkBlock,
  value: string
): void {
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    workBlocks: host.getState().incomePlanning.workBlocks.map((workBlock) => {
      if (workBlock.id !== workBlockId) return workBlock;
      if (field === "active") return { ...workBlock, active: value === "true" };
      if (field === "category") {
        const category = isIncomePlanningCategory(value) ? value : workBlock.category;
        return {
          ...workBlock,
          category,
          color: normalizeIncomePlanningColor(workBlock.color, incomePlanningDefaultWorkColor(category))
        };
      }
      if (field === "name") return { ...workBlock, name: value };
      if (field === "description") return { ...workBlock, description: value };
      if (field === "color") return { ...workBlock, color: normalizeIncomePlanningColor(value, workBlock.color ?? incomePlanningDefaultWorkColor(workBlock.category)) };
      return workBlock;
    })
  };
}

export function updateIncomePlanningHabit(habitId: string, field: keyof IncomePlanningHabit, value: string): void {
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    habits: host.getState().incomePlanning.habits.map((habit) => {
      if (habit.id !== habitId) return habit;
      if (field === "active") return { ...habit, active: value === "true" };
      if (field === "type" && isIncomePlanningHabitType(value)) return { ...habit, type: value };
      if (field === "name") return { ...habit, name: value };
      if (field === "description") return { ...habit, description: value };
      if (field === "icon") return { ...habit, icon: normalizePositionIcon(value, habit.type === "bad" ? "snack" : "book") };
      if (field === "timing") return { ...habit, timing: value };
      if (field === "durationMinutes") return { ...habit, durationMinutes: Math.round(clamp(numberValue(value), 0, 1440)) };
      if (field === "durationUnit" && isIncomePlanningHabitDurationUnit(value)) return { ...habit, durationUnit: value };
      if (field === "goalChange" && isIncomePlanningHabitChange(value)) return { ...habit, goalChange: value };
      if (field === "replacementHabit") return { ...habit, replacementHabit: value };
      if (field === "status" && isIncomePlanningHabitStatus(value)) return { ...habit, status: value };
      if (field === "priority" && isIncomePlanningPriority(value)) return { ...habit, priority: value };
      return habit;
    })
  };
}

export function updateIncomePlanningManualBlock(
  blockId: string,
  field: keyof IncomePlanningManualBlock,
  value: string
): void {
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    manualBlocks: host.getState().incomePlanning.manualBlocks.map((block) => {
      if (block.id !== blockId) return block;
      if (field === "active") return { ...block, active: value === "true" };
      if (field === "type" && isIncomePlanningManualBlockType(value)) return { ...block, type: value };
      if (field === "name") return { ...block, name: value };
      if (field === "description") return { ...block, description: value };
      if (field === "color") return { ...block, color: normalizeIncomePlanningColor(value, block.color ?? incomePlanningDefaultManualColor(block.type)) };
      if (field === "icon") return { ...block, icon: normalizePositionIcon(value, incomePlanningDefaultManualIcon(block.type)) };
      return block;
    })
  };
}

export function updateIncomePlanningSlotField(slot: IncomePlanningSlot, field: keyof IncomePlanningSlot, value: string): IncomePlanningSlot {
  if (field === "day" && isIncomePlanningWeekday(value)) return { ...slot, day: value };
  if (field === "flexible") return { ...slot, flexible: value === "true" };
  if (field === "startTime") return { ...slot, startTime: value };
  if (field === "endTime") return { ...slot, endTime: value };
  if (field === "durationMinutes") return { ...slot, durationMinutes: Math.round(clamp(numberValue(value), 0, 10080)) };
  if (field === "pauseEnabled") return { ...slot, pauseEnabled: value === "true" };
  if (field === "pauseStartTime") return { ...slot, pauseStartTime: value };
  if (field === "pauseEndTime") return { ...slot, pauseEndTime: value };
  return slot;
}

export function normalizeIncomePlanningSlotAfterEdit(slot: IncomePlanningSlot): IncomePlanningSlot {
  const normalizedPause = normalizeIncomePlanningSlotPause(slot);
  const start = parseTimeMinutes(normalizedPause.startTime);
  const end = parseTimeMinutes(normalizedPause.endTime);
  if (start !== null && end !== null && end > start) {
    return { ...normalizedPause, durationMinutes: end - start };
  }
  return normalizedPause;
}

export function normalizeIncomePlanningSlotPause(slot: IncomePlanningSlot): IncomePlanningSlot {
  const pauseEnabled = Boolean(slot.pauseEnabled);
  if (!slot.pauseStartTime || !slot.pauseEndTime) return { ...slot, pauseEnabled: false, pauseDurationMinutes: 0 };
  const start = parseTimeMinutes(slot.pauseStartTime);
  const end = parseTimeMinutes(slot.pauseEndTime);
  if (start === null || end === null || end <= start) return { ...slot, pauseEnabled, pauseDurationMinutes: 0 };
  return { ...slot, pauseEnabled, pauseDurationMinutes: end - start };
}

export function updateIncomePlanningOwnerSlots(
  ownerType: string,
  ownerId: string,
  updater: (slots: IncomePlanningSlot[]) => IncomePlanningSlot[]
): void {
  if (ownerType === "work") {
    host.getState().incomePlanning = {
      ...host.getState().incomePlanning,
      workBlocks: host.getState().incomePlanning.workBlocks.map((block) =>
        block.id === ownerId ? { ...block, slots: updater(block.slots) } : block
      )
    };
  }
  if (ownerType === "habit") {
    host.getState().incomePlanning = {
      ...host.getState().incomePlanning,
      habits: host.getState().incomePlanning.habits.map((habit) =>
        habit.id === ownerId ? { ...habit, slots: updater(habit.slots).map(incomePlanningStripSlotPause) } : habit
      )
    };
  }
  if (ownerType === "manual") {
    host.getState().incomePlanning = {
      ...host.getState().incomePlanning,
      manualBlocks: host.getState().incomePlanning.manualBlocks.map((block) =>
        block.id === ownerId ? { ...block, slots: updater(block.slots) } : block
      )
    };
  }
}

export function defaultIncomePlanningSlot(ownerType: string): IncomePlanningSlot {
  const isHabit = ownerType === "habit";
  const isManual = ownerType === "manual";
  return {
    id: createId(),
    day: isManual ? "sunday" : "monday",
    startTime: isHabit ? "21:30" : "18:00",
    endTime: isHabit ? "22:00" : "19:00",
    flexible: isManual,
    durationMinutes: isHabit ? 30 : 60
  };
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
