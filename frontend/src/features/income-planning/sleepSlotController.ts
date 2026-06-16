import { createId } from "../../data/defaults";
import { INCOME_PLANNING_WEEK_DAYS, incomePlanningSleepSlotDurationMinutes } from "../../domain/incomePlanning";
import { clamp } from "../../lib/format";
import type { IncomePlanningSleepSlot, IncomePlanningWeekScenarioId, IncomePlanningWeekday } from "../../types";
import type { IncomePlanningSleepSlotGroup } from "./uiState";
import {
  incomePlanningScenarioIdsForDialog,
  incomePlanningStoredScenarioIds
} from "./weekScenarioController";

export function normalizeIncomePlanningDialogSleepSlot(slot: IncomePlanningSleepSlot): IncomePlanningSleepSlot {
  const durationMinutes = slot.flexible
    ? Math.round(clamp(slot.durationMinutes, 15, 10080))
    : incomePlanningSleepSlotDurationMinutes(slot);
  return {
    ...slot,
    durationMinutes
  };
}

export function normalizeIncomePlanningDialogSleepSlotGroup(group: IncomePlanningSleepSlotGroup): IncomePlanningSleepSlotGroup {
  const durationMinutes = group.flexible
    ? Math.round(clamp(group.durationMinutes, 15, 10080))
    : incomePlanningSleepSlotDurationMinutes({
        id: group.id,
        day: group.fromDay,
        startTime: group.startTime,
        endTime: group.endTime,
        flexible: false,
        durationMinutes: group.durationMinutes
      });
  return {
    ...group,
    durationMinutes
  };
}

export function incomePlanningSleepSlotGroupsFromSlots(slots: IncomePlanningSleepSlot[]): IncomePlanningSleepSlotGroup[] {
  const groups: IncomePlanningSleepSlotGroup[] = [];
  for (const rawSlot of slots) {
    const slot = normalizeIncomePlanningDialogSleepSlot(rawSlot);
    const last = groups[groups.length - 1];
    if (last && incomePlanningSleepSlotGroupMatchesSlot(last, slot) && incomePlanningNextWeekday(last.toDay) === slot.day) {
      last.toDay = slot.day;
      last.slotIds = { ...last.slotIds, [slot.day]: slot.id };
    } else {
      groups.push({
        id: slot.id || createId(),
        fromDay: slot.day,
        toDay: slot.day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        flexible: slot.flexible,
        durationMinutes: slot.durationMinutes,
        scenarioIds: incomePlanningScenarioIdsForDialog(slot.scenarioIds),
        slotIds: { [slot.day]: slot.id }
      });
    }
  }
  return groups;
}

export function incomePlanningSleepSlotsFromDialogGroups(groups: IncomePlanningSleepSlotGroup[]): IncomePlanningSleepSlot[] {
  return groups.flatMap((group) =>
    incomePlanningSleepSlotGroupDays(group).map((day) =>
      normalizeIncomePlanningDialogSleepSlot({
        id: group.slotIds[day] ?? `${group.id}-${day}`,
        day,
        startTime: group.startTime,
        endTime: group.endTime,
        flexible: group.flexible,
        durationMinutes: group.durationMinutes,
        scenarioIds: incomePlanningStoredScenarioIds(group.scenarioIds)
      })
    )
  );
}

export function scenarioIdsEqual(first: IncomePlanningWeekScenarioId[], second: IncomePlanningWeekScenarioId[]): boolean {
  if (first.length !== second.length) return false;
  const firstSet = new Set(first);
  return second.every((scenarioId) => firstSet.has(scenarioId));
}

export function incomePlanningSleepSlotGroupDays(group: IncomePlanningSleepSlotGroup): IncomePlanningWeekday[] {
  const days: IncomePlanningWeekday[] = [];
  const startIndex = INCOME_PLANNING_WEEK_DAYS.indexOf(group.fromDay);
  for (let offset = 0; offset < INCOME_PLANNING_WEEK_DAYS.length; offset += 1) {
    const day = INCOME_PLANNING_WEEK_DAYS[(startIndex + offset) % INCOME_PLANNING_WEEK_DAYS.length];
    days.push(day);
    if (day === group.toDay) break;
  }
  return days;
}

export function incomePlanningNextWeekday(day: IncomePlanningWeekday): IncomePlanningWeekday {
  return INCOME_PLANNING_WEEK_DAYS[(INCOME_PLANNING_WEEK_DAYS.indexOf(day) + 1) % INCOME_PLANNING_WEEK_DAYS.length];
}

function incomePlanningSleepSlotGroupMatchesSlot(group: IncomePlanningSleepSlotGroup, slot: IncomePlanningSleepSlot): boolean {
  return (
    group.startTime === slot.startTime &&
    group.endTime === slot.endTime &&
    group.flexible === slot.flexible &&
    group.durationMinutes === slot.durationMinutes &&
    scenarioIdsEqual(group.scenarioIds, incomePlanningScenarioIdsForDialog(slot.scenarioIds))
  );
}
