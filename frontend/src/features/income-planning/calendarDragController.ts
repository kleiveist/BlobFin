import {
  incomePlanningAverageSleepHours,
  incomePlanningStripSlotPause,
  parseTimeMinutes
} from "../../domain/incomePlanning";
import { clamp } from "../../lib/format";
import type { IncomePlanningSlot, IncomePlanningWeekday } from "../../types";
import { incomePlanningHostRef as host } from "./host";
import { incomePlanningSleepBackgroundEntries } from "./renderController";
import {
  incomePlanningSleepSlotGroupsFromSlots,
  incomePlanningSleepSlotsFromDialogGroups,
  normalizeIncomePlanningDialogSleepSlotGroup
} from "./sleepSlotController";
import {
  formatIncomePlanningTime,
  incomePlanningOwnerTypeFromValue,
  incomePlanningVisualRangeFromTimes,
  incomePlanningWeekdayByIndex,
  incomePlanningWeekdayIndex,
  snapIncomePlanningMinute
} from "./shared";
import { incomePlanningUiState, type IncomePlanningDragState, type IncomePlanningOwnerType } from "./uiState";
import {
  incomeStampPlannerAddDays,
  incomeStampPlannerCurrentWeekRange,
  incomeStampPlannerDateFromString,
  incomeStampPlannerDateString,
  incomeStampPlannerMonthStart,
  incomeStampPlannerStartOfDay,
  incomeStampPlannerTodayDateString
} from "./weekScenarioController";

function updateIncomePlanningOwnerSlots(
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

function normalizeIncomePlanningSlotAfterEdit(slot: IncomePlanningSlot): IncomePlanningSlot {
  const normalizedPause = normalizeIncomePlanningSlotPause(slot);
  const start = parseTimeMinutes(normalizedPause.startTime);
  const end = parseTimeMinutes(normalizedPause.endTime);
  if (start !== null && end !== null && end > start) {
    return { ...normalizedPause, durationMinutes: end - start };
  }
  return normalizedPause;
}

function normalizeIncomePlanningSlotPause(slot: IncomePlanningSlot): IncomePlanningSlot {
  const pauseEnabled = Boolean(slot.pauseEnabled);
  if (!slot.pauseStartTime || !slot.pauseEndTime) return { ...slot, pauseEnabled: false, pauseDurationMinutes: 0 };
  const start = parseTimeMinutes(slot.pauseStartTime);
  const end = parseTimeMinutes(slot.pauseEndTime);
  if (start === null || end === null || end <= start) return { ...slot, pauseEnabled, pauseDurationMinutes: 0 };
  return { ...slot, pauseEnabled, pauseDurationMinutes: end - start };
}

export function startIncomePlanningCalendarDrag(event: PointerEvent): void {
  const target = event.target as HTMLElement | null;
  const plannerStamp = target?.closest<HTMLElement>("[data-income-stamp-planner-stamp]");
  if (plannerStamp && plannerStamp.closest("[data-income-stamp-planner-calendar]")) {
    startIncomeStampPlannerStampDrag(event, plannerStamp);
    return;
  }
  const plannedStamp = target?.closest<HTMLElement>("[data-income-stamp-planner-calendar-stamp]");
  if (plannedStamp) {
    startIncomePlanningPlannedStampCalendarDrag(event, plannedStamp);
    return;
  }
  const stamp = target?.closest<HTMLElement>("[data-income-planning-calendar-stamp]");
  if (stamp) {
    startIncomePlanningStampCalendarDrag(event, stamp);
    return;
  }
  const sleepBlock = target?.closest<HTMLElement>("[data-income-planning-sleep-group-id]");
  if (sleepBlock) {
    startIncomePlanningSleepCalendarDrag(event, sleepBlock);
    return;
  }
  const block = target?.closest<HTMLElement>("[data-income-planning-calendar-block]");
  if (!block) return;
  const ownerType = incomePlanningOwnerTypeFromValue(block.dataset.incomePlanningOwnerType);
  const ownerId = block.dataset.incomePlanningOwnerId || "";
  const slotId = block.dataset.incomePlanningSlotId || "";
  const slotPart = block.dataset.incomePlanningSlotPart === "pause" ? "pause" : "main";
  const slot = incomePlanningSlotById(ownerType, ownerId, slotId);
  const column = block.closest<HTMLElement>("[data-income-planning-calendar-day]");
  const days = document.querySelector<HTMLElement>("#incomePlanningCalendarDays");
  if (!ownerId || !slotId || !slot || !column || !days) return;
  const range =
    slotPart === "pause"
      ? incomePlanningVisualRangeFromTimes(slot.pauseStartTime ?? "", slot.pauseEndTime ?? "", slot.pauseDurationMinutes ?? 30)
      : incomePlanningVisualRangeFromTimes(slot.startTime, slot.endTime, slot.durationMinutes);
  if (range.endMinute <= range.startMinute) return;
  const resizeHandle = target?.closest<HTMLElement>("[data-income-planning-resize]");
  incomePlanningUiState.dragState = {
    ownerType,
    ownerId,
    slotId,
    slotPart,
    mode: resizeHandle?.dataset.incomePlanningResize === "start" ? "resize-start" : resizeHandle?.dataset.incomePlanningResize === "end" ? "resize-end" : "move",
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    originalDay: slot.day,
    originalStartMinute: range.startMinute,
    originalEndMinute: range.endMinute,
    dayWidth: Math.max(1, days.getBoundingClientRect().width / 7),
    columnHeight: Math.max(1, column.getBoundingClientRect().height),
    element: block,
    moved: false
  };
  block.classList.add("dragging");
  block.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function startIncomePlanningStampCalendarDrag(event: PointerEvent, stampElement: HTMLElement): void {
  const stampId = stampElement.dataset.incomePlanningStampId || "";
  const stamp = host.getState().incomePlanning.calendarStamps.find((item) => item.id === stampId);
  const column = stampElement.closest<HTMLElement>("[data-income-planning-calendar-day]");
  const days = document.querySelector<HTMLElement>("#incomePlanningCalendarDays");
  if (!stampId || !stamp || !column || !days) return;
  incomePlanningUiState.stampDragState = {
    stampId,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    originalDay: stamp.day,
    originalStartMinute: parseTimeMinutes(stamp.startTime) ?? 0,
    dayWidth: Math.max(1, days.getBoundingClientRect().width / 7),
    columnHeight: Math.max(1, column.getBoundingClientRect().height),
    element: stampElement,
    moved: false
  };
  stampElement.classList.add("dragging");
  stampElement.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function startIncomePlanningPlannedStampCalendarDrag(event: PointerEvent, stampElement: HTMLElement): void {
  const stampId = stampElement.dataset.incomeStampPlannerStampId || "";
  const stamp = (host.getState().incomePlanning.plannedStamps ?? []).find((item) => item.id === stampId);
  const column = stampElement.closest<HTMLElement>("[data-income-planning-calendar-day]");
  const days = document.querySelector<HTMLElement>("#incomePlanningCalendarDays");
  if (!stampId || !stamp || !incomeStampPlannerDateFromString(stamp.date) || !column || !days) return;
  incomePlanningUiState.plannedStampDragState = {
    stampId,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    originalDate: stamp.date,
    originalStartMinute: parseTimeMinutes(stamp.startTime) ?? 0,
    dayWidth: Math.max(1, days.getBoundingClientRect().width / 7),
    columnHeight: Math.max(1, column.getBoundingClientRect().height),
    element: stampElement,
    moved: false
  };
  stampElement.classList.add("dragging");
  stampElement.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function startIncomeStampPlannerStampDrag(event: PointerEvent, stampElement: HTMLElement): void {
  const stampId = stampElement.dataset.incomeStampPlannerStampId || "";
  const stamp = (host.getState().incomePlanning.plannedStamps ?? []).find((item) => item.id === stampId);
  if (!stampId || !stamp || !incomeStampPlannerDateFromString(stamp.date)) return;
  incomePlanningUiState.stampPlannerStampDragState = {
    stampId,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    element: stampElement,
    moved: false
  };
  stampElement.classList.add("dragging");
  stampElement.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

export function moveIncomePlanningCalendarDrag(event: PointerEvent): void {
  if (incomePlanningUiState.plannedStampDragState && event.pointerId === incomePlanningUiState.plannedStampDragState.pointerId) {
    const next = incomePlanningPlannedStampDragPreview(event);
    incomePlanningUiState.plannedStampDragState.moved =
      incomePlanningUiState.plannedStampDragState.moved ||
      Math.abs(event.clientX - incomePlanningUiState.plannedStampDragState.startClientX) > 3 ||
      Math.abs(event.clientY - incomePlanningUiState.plannedStampDragState.startClientY) > 3;
    const top = (next.startMinute / (24 * 60)) * 100;
    incomePlanningUiState.plannedStampDragState.element.style.setProperty("--top", `${top.toFixed(3)}%`);
    event.preventDefault();
    return;
  }
  if (incomePlanningUiState.stampPlannerStampDragState && event.pointerId === incomePlanningUiState.stampPlannerStampDragState.pointerId) {
    incomePlanningUiState.stampPlannerStampDragState.moved =
      incomePlanningUiState.stampPlannerStampDragState.moved ||
      Math.abs(event.clientX - incomePlanningUiState.stampPlannerStampDragState.startClientX) > 3 ||
      Math.abs(event.clientY - incomePlanningUiState.stampPlannerStampDragState.startClientY) > 3;
    if (incomePlanningUiState.stampPlannerStampDragState.moved) {
      const deltaX = event.clientX - incomePlanningUiState.stampPlannerStampDragState.startClientX;
      const deltaY = event.clientY - incomePlanningUiState.stampPlannerStampDragState.startClientY;
      incomePlanningUiState.stampPlannerStampDragState.element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }
    event.preventDefault();
    return;
  }
  if (incomePlanningUiState.stampDragState && event.pointerId === incomePlanningUiState.stampDragState.pointerId) {
    const next = incomePlanningStampDragPreview(event);
    incomePlanningUiState.stampDragState.moved =
      incomePlanningUiState.stampDragState.moved ||
      Math.abs(event.clientX - incomePlanningUiState.stampDragState.startClientX) > 3 ||
      Math.abs(event.clientY - incomePlanningUiState.stampDragState.startClientY) > 3;
    const top = (next.startMinute / (24 * 60)) * 100;
    incomePlanningUiState.stampDragState.element.style.setProperty("--top", `${top.toFixed(3)}%`);
    event.preventDefault();
    return;
  }
  if (incomePlanningUiState.sleepDragState && event.pointerId === incomePlanningUiState.sleepDragState.pointerId) {
    const next = incomePlanningSleepDragPreview(event);
    incomePlanningUiState.sleepDragState.moved =
      incomePlanningUiState.sleepDragState.moved ||
      Math.abs(event.clientY - incomePlanningUiState.sleepDragState.startClientY) > 3;
    applyIncomePlanningSleepDragPreview(next);
    event.preventDefault();
    return;
  }
  if (!incomePlanningUiState.dragState || event.pointerId !== incomePlanningUiState.dragState.pointerId) return;
  const next = incomePlanningDragPreview(event);
  incomePlanningUiState.dragState.moved =
    incomePlanningUiState.dragState.moved ||
    Math.abs(event.clientX - incomePlanningUiState.dragState.startClientX) > 3 ||
    Math.abs(event.clientY - incomePlanningUiState.dragState.startClientY) > 3;
  const top = (next.startMinute / (24 * 60)) * 100;
  const height = ((next.endMinute - next.startMinute) / (24 * 60)) * 100;
  incomePlanningUiState.dragState.element.style.setProperty("--top", `${top.toFixed(3)}%`);
  incomePlanningUiState.dragState.element.style.setProperty("--height", `${height.toFixed(3)}%`);
  incomePlanningUiState.dragState.element.style.setProperty("--start-minute", String(next.startMinute));
  incomePlanningUiState.dragState.element.style.setProperty("--duration-minutes", String(next.endMinute - next.startMinute));
  event.preventDefault();
}

export function finishIncomePlanningCalendarDrag(event: PointerEvent): void {
  if (incomePlanningUiState.plannedStampDragState && event.pointerId === incomePlanningUiState.plannedStampDragState.pointerId) {
    const dragState = incomePlanningUiState.plannedStampDragState;
    const next = incomePlanningPlannedStampDragPreview(event);
    dragState.element.classList.remove("dragging");
    dragState.element.releasePointerCapture?.(event.pointerId);
    incomePlanningUiState.plannedStampDragState = null;
    if (dragState.moved) {
      updateIncomePlanningPlannedStampAfterCalendarDrag(dragState.stampId, next);
      const savedDate = incomeStampPlannerDateFromString(next.date);
      if (savedDate) {
        incomePlanningUiState.stampPlannerMonthCursor = incomeStampPlannerMonthStart(savedDate);
      }
      host.renderAll();
      host.persistCurrentState();
      incomePlanningUiState.suppressNextCalendarClick = true;
    }
    return;
  }
  if (incomePlanningUiState.stampPlannerStampDragState && event.pointerId === incomePlanningUiState.stampPlannerStampDragState.pointerId) {
    const dragState = incomePlanningUiState.stampPlannerStampDragState;
    const nextDate = incomeStampPlannerDateFromPointer(event.clientX, event.clientY);
    dragState.element.classList.remove("dragging");
    dragState.element.style.transform = "";
    dragState.element.releasePointerCapture?.(event.pointerId);
    incomePlanningUiState.stampPlannerStampDragState = null;
    if (dragState.moved) {
      if (nextDate) {
        updateIncomeStampPlannerStampAfterPlannerDrag(dragState.stampId, nextDate);
        const savedDate = incomeStampPlannerDateFromString(nextDate);
        if (savedDate) {
          incomePlanningUiState.stampPlannerMonthCursor = incomeStampPlannerMonthStart(savedDate);
        }
        host.renderAll();
        host.persistCurrentState();
      }
      incomePlanningUiState.stampPlannerSuppressNextClick = true;
    }
    return;
  }
  if (incomePlanningUiState.stampDragState && event.pointerId === incomePlanningUiState.stampDragState.pointerId) {
    const dragState = incomePlanningUiState.stampDragState;
    const next = incomePlanningStampDragPreview(event);
    dragState.element.classList.remove("dragging");
    dragState.element.releasePointerCapture?.(event.pointerId);
    incomePlanningUiState.stampDragState = null;
    if (dragState.moved) {
      updateIncomePlanningStampAfterCalendarDrag(dragState.stampId, next);
      host.renderAll();
      host.persistCurrentState();
      incomePlanningUiState.suppressNextCalendarClick = true;
    }
    return;
  }
  if (incomePlanningUiState.sleepDragState && event.pointerId === incomePlanningUiState.sleepDragState.pointerId) {
    const dragState = incomePlanningUiState.sleepDragState;
    const next = incomePlanningSleepDragPreview(event);
    dragState.elements.forEach((element) => {
      element.classList.remove("dragging");
      element.releasePointerCapture?.(event.pointerId);
    });
    incomePlanningUiState.sleepDragState = null;
    if (dragState.moved) {
      updateIncomePlanningSleepGroupTime(dragState.groupId, next.startMinute, next.endMinute);
      host.renderAll();
      host.persistCurrentState();
      incomePlanningUiState.suppressNextCalendarClick = true;
    }
    return;
  }
  if (!incomePlanningUiState.dragState || event.pointerId !== incomePlanningUiState.dragState.pointerId) return;
  const dragState = incomePlanningUiState.dragState;
  const next = incomePlanningDragPreview(event);
  dragState.element.classList.remove("dragging");
  dragState.element.releasePointerCapture?.(event.pointerId);
  incomePlanningUiState.dragState = null;
  if (dragState.moved) {
    if (dragState.slotPart === "pause") {
      updateIncomePlanningPauseAfterCalendarDrag(dragState, next);
    } else {
      updateIncomePlanningMainSlotAfterCalendarDrag(dragState, next);
    }
    host.renderAll();
    host.persistCurrentState();
    incomePlanningUiState.suppressNextCalendarClick = true;
  }
}

function incomePlanningStampDragPreview(event: PointerEvent): { day: IncomePlanningWeekday; startMinute: number } {
  if (!incomePlanningUiState.stampDragState) return { day: "monday", startMinute: 0 };
  const verticalDelta = snapIncomePlanningMinute(
    ((event.clientY - incomePlanningUiState.stampDragState.startClientY) / incomePlanningUiState.stampDragState.columnHeight) * 24 * 60
  );
  const dayDelta = Math.round(
    (event.clientX - incomePlanningUiState.stampDragState.startClientX) / incomePlanningUiState.stampDragState.dayWidth
  );
  return {
    day: incomePlanningWeekdayByIndex(incomePlanningWeekdayIndex(incomePlanningUiState.stampDragState.originalDay) + dayDelta),
    startMinute: clamp(
      snapIncomePlanningMinute(incomePlanningUiState.stampDragState.originalStartMinute + verticalDelta),
      0,
      23 * 60 + 45
    )
  };
}

function incomePlanningPlannedStampDragPreview(event: PointerEvent): { date: string; startMinute: number } {
  if (!incomePlanningUiState.plannedStampDragState) return { date: incomeStampPlannerTodayDateString(), startMinute: 0 };
  const originalDate =
    incomeStampPlannerDateFromString(incomePlanningUiState.plannedStampDragState.originalDate) ??
    incomeStampPlannerStartOfDay(new Date());
  const verticalDelta = snapIncomePlanningMinute(
    ((event.clientY - incomePlanningUiState.plannedStampDragState.startClientY) /
      incomePlanningUiState.plannedStampDragState.columnHeight) *
      24 *
      60
  );
  const dayDelta = Math.round(
    (event.clientX - incomePlanningUiState.plannedStampDragState.startClientX) /
      incomePlanningUiState.plannedStampDragState.dayWidth
  );
  const weekRange = incomeStampPlannerCurrentWeekRange();
  const nextDate = incomeStampPlannerClampDate(
    incomeStampPlannerAddDays(originalDate, dayDelta),
    weekRange.start,
    weekRange.end
  );
  return {
    date: incomeStampPlannerDateString(nextDate),
    startMinute: clamp(
      snapIncomePlanningMinute(incomePlanningUiState.plannedStampDragState.originalStartMinute + verticalDelta),
      0,
      23 * 60 + 45
    )
  };
}

function updateIncomePlanningStampAfterCalendarDrag(
  stampId: string,
  next: { day: IncomePlanningWeekday; startMinute: number }
): void {
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    calendarStamps: host.getState().incomePlanning.calendarStamps.map((stamp) =>
      stamp.id === stampId ? { ...stamp, day: next.day, startTime: formatIncomePlanningTime(next.startMinute) } : stamp
    )
  };
}

function updateIncomePlanningPlannedStampAfterCalendarDrag(
  stampId: string,
  next: { date: string; startMinute: number }
): void {
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    plannedStamps: (host.getState().incomePlanning.plannedStamps ?? []).map((stamp) =>
      stamp.id === stampId ? { ...stamp, date: next.date, startTime: formatIncomePlanningTime(next.startMinute) } : stamp
    )
  };
}

function updateIncomeStampPlannerStampAfterPlannerDrag(stampId: string, date: string): void {
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    plannedStamps: (host.getState().incomePlanning.plannedStamps ?? []).map((stamp) =>
      stamp.id === stampId ? { ...stamp, date } : stamp
    )
  };
}

function incomeStampPlannerDateFromPointer(clientX: number, clientY: number): string | null {
  const target = document.elementFromPoint(clientX, clientY);
  const day = target?.closest<HTMLElement>("[data-income-stamp-planner-date]");
  const date = day?.dataset.incomeStampPlannerDate || "";
  return incomeStampPlannerDateFromString(date) ? date : null;
}

function incomeStampPlannerClampDate(date: Date, min: Date, max: Date): Date {
  if (date.getTime() < min.getTime()) return incomeStampPlannerStartOfDay(min);
  if (date.getTime() > max.getTime()) return incomeStampPlannerStartOfDay(max);
  return incomeStampPlannerStartOfDay(date);
}

function updateIncomePlanningPauseAfterCalendarDrag(
  dragState: NonNullable<IncomePlanningDragState>,
  next: { day: IncomePlanningWeekday; startMinute: number; endMinute: number }
): void {
  updateIncomePlanningOwnerSlots(dragState.ownerType, dragState.ownerId, (slots) =>
    slots.map((slot) => {
      if (slot.id !== dragState.slotId) return slot;
      const clamped = incomePlanningClampedPauseRange(slot, next.startMinute, next.endMinute);
      return normalizeIncomePlanningSlotAfterEdit({
        ...slot,
        pauseEnabled: true,
        pauseStartTime: formatIncomePlanningTime(clamped.startMinute),
        pauseEndTime: formatIncomePlanningTime(clamped.endMinute),
        pauseDurationMinutes: clamped.endMinute - clamped.startMinute
      });
    })
  );
}

function updateIncomePlanningMainSlotAfterCalendarDrag(
  dragState: NonNullable<IncomePlanningDragState>,
  next: { day: IncomePlanningWeekday; startMinute: number; endMinute: number }
): void {
  updateIncomePlanningOwnerSlots(dragState.ownerType, dragState.ownerId, (slots) =>
    slots.map((slot) => {
      if (slot.id !== dragState.slotId) return slot;
      const updated: IncomePlanningSlot = {
        ...slot,
        day: next.day,
        startTime: formatIncomePlanningTime(next.startMinute),
        endTime: formatIncomePlanningTime(next.endMinute),
        durationMinutes: next.endMinute - next.startMinute
      };
      return normalizeIncomePlanningSlotAfterEdit(incomePlanningSlotWithClampedPause(updated, dragState, next));
    })
  );
}

function incomePlanningClampedPauseRange(
  slot: IncomePlanningSlot,
  pauseStartMinute: number,
  pauseEndMinute: number
): { startMinute: number; endMinute: number } {
  const slotStart = parseTimeMinutes(slot.startTime);
  const slotEnd = parseTimeMinutes(slot.endTime);
  if (slotStart === null || slotEnd === null || slotEnd <= slotStart) {
    return { startMinute: pauseStartMinute, endMinute: pauseEndMinute };
  }
  const duration = Math.min(Math.max(15, pauseEndMinute - pauseStartMinute), slotEnd - slotStart);
  const startMinute = clamp(pauseStartMinute, slotStart, Math.max(slotStart, slotEnd - duration));
  return { startMinute, endMinute: startMinute + duration };
}

function incomePlanningSlotWithClampedPause(
  slot: IncomePlanningSlot,
  dragState: NonNullable<IncomePlanningDragState>,
  next: { startMinute: number; endMinute: number }
): IncomePlanningSlot {
  if (!slot.pauseEnabled || !slot.pauseStartTime || !slot.pauseEndTime) return slot;
  const pauseStart = parseTimeMinutes(slot.pauseStartTime);
  const pauseEnd = parseTimeMinutes(slot.pauseEndTime);
  if (pauseStart === null || pauseEnd === null || pauseEnd <= pauseStart) return slot;
  const pauseDuration = Math.min(pauseEnd - pauseStart, Math.max(0, next.endMinute - next.startMinute));
  const shiftedPauseStart = dragState.mode === "move" ? pauseStart + (next.startMinute - dragState.originalStartMinute) : pauseStart;
  const clampedPauseStart = clamp(
    snapIncomePlanningMinute(shiftedPauseStart),
    next.startMinute,
    Math.max(next.startMinute, next.endMinute - pauseDuration)
  );
  return {
    ...slot,
    pauseStartTime: formatIncomePlanningTime(clampedPauseStart),
    pauseEndTime: formatIncomePlanningTime(clampedPauseStart + pauseDuration),
    pauseDurationMinutes: pauseDuration
  };
}

function incomePlanningDragPreview(event: PointerEvent): {
  day: IncomePlanningWeekday;
  startMinute: number;
  endMinute: number;
} {
  if (!incomePlanningUiState.dragState) {
    return { day: "monday", startMinute: 0, endMinute: 15 };
  }
  const verticalDelta = snapIncomePlanningMinute(
    ((event.clientY - incomePlanningUiState.dragState.startClientY) / incomePlanningUiState.dragState.columnHeight) * 24 * 60
  );
  const dayDelta = Math.round((event.clientX - incomePlanningUiState.dragState.startClientX) / incomePlanningUiState.dragState.dayWidth);
  const duration = incomePlanningUiState.dragState.originalEndMinute - incomePlanningUiState.dragState.originalStartMinute;
  if (incomePlanningUiState.dragState.mode === "resize-start") {
    const startMinute = clamp(
      snapIncomePlanningMinute(incomePlanningUiState.dragState.originalStartMinute + verticalDelta),
      0,
      incomePlanningUiState.dragState.originalEndMinute - 15
    );
    return { day: incomePlanningUiState.dragState.originalDay, startMinute, endMinute: incomePlanningUiState.dragState.originalEndMinute };
  }
  if (incomePlanningUiState.dragState.mode === "resize-end") {
    const maxEndMinute = 23 * 60 + 45;
    const endMinute = clamp(
      snapIncomePlanningMinute(incomePlanningUiState.dragState.originalEndMinute + verticalDelta),
      incomePlanningUiState.dragState.originalStartMinute + 15,
      maxEndMinute
    );
    return { day: incomePlanningUiState.dragState.originalDay, startMinute: incomePlanningUiState.dragState.originalStartMinute, endMinute };
  }
  const maxEndMinute = 23 * 60 + 45;
  const startMinute = clamp(
    snapIncomePlanningMinute(incomePlanningUiState.dragState.originalStartMinute + verticalDelta),
    0,
    Math.max(0, maxEndMinute - duration)
  );
  const day = incomePlanningWeekdayByIndex(incomePlanningWeekdayIndex(incomePlanningUiState.dragState.originalDay) + dayDelta);
  return { day, startMinute, endMinute: startMinute + duration };
}

function startIncomePlanningSleepCalendarDrag(event: PointerEvent, block: HTMLElement): void {
  const groupId = block.dataset.incomePlanningSleepGroupId || "";
  const group = incomePlanningSleepSlotGroupsFromSlots(host.getState().incomePlanning.assumptions.sleepSlots).find((item) => item.id === groupId);
  const column = block.closest<HTMLElement>("[data-income-planning-calendar-day]");
  if (!groupId || !group || !column) return;
  const startMinute = parseTimeMinutes(group.startTime);
  const endMinute = parseTimeMinutes(group.endTime);
  if (startMinute === null || endMinute === null) return;
  const durationMinutes = incomePlanningSleepClockDurationMinutes(startMinute, endMinute, group.durationMinutes);
  const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-income-planning-sleep-group-id]")).filter(
    (element) => element.dataset.incomePlanningSleepGroupId === groupId
  );
  incomePlanningUiState.sleepDragState = {
    groupId,
    group,
    pointerId: event.pointerId,
    startClientY: event.clientY,
    originalStartMinute: startMinute,
    durationMinutes,
    overnight: endMinute <= startMinute,
    columnHeight: Math.max(1, column.getBoundingClientRect().height),
    elements,
    moved: false
  };
  elements.forEach((element) => element.classList.add("dragging"));
  block.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function incomePlanningSleepDragPreview(event: PointerEvent): { startMinute: number; endMinute: number } {
  if (!incomePlanningUiState.sleepDragState) return { startMinute: 21 * 60, endMinute: 5 * 60 + 30 };
  const verticalDelta = snapIncomePlanningMinute(
    ((event.clientY - incomePlanningUiState.sleepDragState.startClientY) / incomePlanningUiState.sleepDragState.columnHeight) * 24 * 60
  );
  const duration = clamp(incomePlanningUiState.sleepDragState.durationMinutes, 15, 23 * 60 + 45);
  const minStart = incomePlanningUiState.sleepDragState.overnight ? Math.max(0, 24 * 60 - duration + 15) : 0;
  const maxStart = incomePlanningUiState.sleepDragState.overnight ? 23 * 60 + 45 : Math.max(0, 24 * 60 - duration);
  const startMinute = clamp(
    snapIncomePlanningMinute(incomePlanningUiState.sleepDragState.originalStartMinute + verticalDelta),
    minStart,
    maxStart
  );
  return {
    startMinute,
    endMinute: (startMinute + duration) % (24 * 60)
  };
}

function applyIncomePlanningSleepDragPreview(next: { startMinute: number; endMinute: number }): void {
  if (!incomePlanningUiState.sleepDragState) return;
  const previewGroup = normalizeIncomePlanningDialogSleepSlotGroup({
    ...incomePlanningUiState.sleepDragState.group,
    startTime: formatIncomePlanningTime(next.startMinute),
    endTime: formatIncomePlanningTime(next.endMinute)
  });
  const entries = new Map(incomePlanningSleepBackgroundEntries(previewGroup).map((entry) => [entry.id, entry]));
  incomePlanningUiState.sleepDragState.elements.forEach((element) => {
    const entry = entries.get(element.dataset.incomePlanningBackgroundEntryId || "");
    if (!entry) return;
    const start = clamp(entry.startMinute, 0, 24 * 60);
    const end = clamp(entry.endMinute, start + 15, 24 * 60);
    const top = (start / (24 * 60)) * 100;
    const height = ((end - start) / (24 * 60)) * 100;
    element.style.setProperty("--top", `${top.toFixed(3)}%`);
    element.style.setProperty("--height", `${height.toFixed(3)}%`);
  });
}

function updateIncomePlanningSleepGroupTime(groupId: string, startMinute: number, endMinute: number): void {
  const groups = incomePlanningSleepSlotGroupsFromSlots(host.getState().incomePlanning.assumptions.sleepSlots).map((group) =>
    group.id === groupId
      ? normalizeIncomePlanningDialogSleepSlotGroup({
          ...group,
          startTime: formatIncomePlanningTime(startMinute),
          endTime: formatIncomePlanningTime(endMinute)
        })
      : group
  );
  const sleepSlots = incomePlanningSleepSlotsFromDialogGroups(groups);
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    assumptions: {
      ...host.getState().incomePlanning.assumptions,
      sleepHoursPerDay: clamp(incomePlanningAverageSleepHours({ sleepHoursPerDay: host.getState().incomePlanning.assumptions.sleepHoursPerDay, sleepSlots }), 0, 24),
      sleepSlots
    }
  };
}

function incomePlanningSleepClockDurationMinutes(startMinute: number, endMinute: number, fallbackDurationMinutes: number): number {
  if (endMinute > startMinute) return endMinute - startMinute;
  if (endMinute < startMinute) return 24 * 60 - startMinute + endMinute;
  return clamp(Math.round(fallbackDurationMinutes), 15, 23 * 60 + 45);
}

export function incomePlanningSlotById(
  ownerType: Exclude<IncomePlanningOwnerType, "assumption">,
  ownerId: string,
  slotId: string
): IncomePlanningSlot | null {
  const owner =
    ownerType === "work"
      ? host.getState().incomePlanning.workBlocks.find((block) => block.id === ownerId)
      : ownerType === "habit"
        ? host.getState().incomePlanning.habits.find((habit) => habit.id === ownerId)
        : host.getState().incomePlanning.manualBlocks.find((block) => block.id === ownerId);
  return owner?.slots.find((slot) => slot.id === slotId) ?? null;
}
