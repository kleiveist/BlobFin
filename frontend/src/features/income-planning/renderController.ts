import {
  buildIncomePlanningModel,
  INCOME_PLANNING_WEEK_DAYS,
  incomePlanningAverageSleepHours,
  incomePlanningCategoryConfig,
  incomePlanningDefaultManualColor,
  incomePlanningDefaultManualIcon,
  incomePlanningDefaultWorkColor,
  incomePlanningSlotCalendarSegments,
  incomePlanningSlotGrossDurationMinutes,
  incomePlanningSlotNetDurationMinutes,
  incomePlanningSlotPauseDurationMinutes,
  incomePlanningSleepSlotDurationMinutes,
  incomePlanningWeekScenarioConfig,
  parseTimeMinutes,
  type IncomePlanningCalendarEntry,
  type IncomePlanningModel,
  type IncomePlanningPlannerEntryType
} from "../../domain/incomePlanning";
import { clamp, escapeHtml, intNumber, percent } from "../../lib/format";
import { normalizePositionIcon, positionIconSvg } from "../../lib/positionIcons";
import type {
  IncomePlanningCalendarStamp,
  IncomePlanningHabit,
  IncomePlanningManualBlock,
  IncomePlanningManualBlockType,
  IncomePlanningPlannedStamp,
  IncomePlanningSleepSlot,
  IncomePlanningSlot,
  IncomePlanningWeekScenarioId,
  IncomePlanningWeekday,
  IncomePlanningWorkBlock
} from "../../types";
import { incomePlanningHostRef as host } from "./host";
import {
  incomePlanningSleepSlotGroupsFromSlots,
  incomePlanningSleepSlotsFromDialogGroups
} from "./sleepSlotController";
import { incomePlanningPlannedStampsForCurrentWeek } from "./stampPlannerController";
import { incomePlanningHeaderIcon } from "./shared";
import {
  type IncomePlanningCalendarBackgroundEntry,
  type IncomePlanningOwnerType,
  type IncomePlanningSleepSlotGroup
} from "./uiState";
import {
  incomePlanningActiveWeekRange,
  incomePlanningActiveWeekScenarioId,
  incomePlanningEntryIsActiveInCurrentScenario,
  incomePlanningIsCurrentWeek,
  incomePlanningWeekScenarioOptions,
  incomeStampPlannerFullDateLabel,
  incomeStampPlannerShortDate
} from "./weekScenarioController";

function incomePlanningModelForActiveWeek(): IncomePlanningModel {
  return buildIncomePlanningModel(host.getState().incomePlanning, { scenarioId: incomePlanningActiveWeekScenarioId() });
}

export function renderIncomePlanningSummary(model = incomePlanningModelForActiveWeek()): void {
  renderIncomePlanningMetrics(model);
  renderIncomePlanningWarnings(model);
  renderIncomePlanningTimeCharts(model);
  renderIncomePlanningCareerLife(model);
  renderIncomePlanningScenarios(model);
}

function renderIncomePlanningMetrics(model: IncomePlanningModel): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningMetricGrid");
  if (!host) return;
  host.innerHTML = `
    ${incomePlanningMetric("Arbeitszeit", `${hoursLabel(model.totalWorkHours)} / Woche`, `${hoursLabel(model.grossWorkHours)} brutto`, model.status)}
    ${incomePlanningMetric("Pausen", `${hoursLabel(model.pauseHours)} / Woche`, "separat von Arbeits-/Zeitbloecken", model.pauseHours > 0 ? "realistic" : model.status)}
    ${incomePlanningMetric("Habit-Zeit", `${hoursLabel(model.habitHours)} / Woche`, `${model.activeHabits.length} aktive Habits`, model.status)}
    ${incomePlanningMetric("Privat/Freizeit/Puffer", `${hoursLabel(model.manualHours)} / Woche`, `${model.activeManualBlocks.length} Zeitbloecke`, model.status)}
    ${incomePlanningMetric("Verplante Woche", `${hoursLabel(model.usedHours)} / Woche`, "inklusive Schlaf", model.status)}
    ${incomePlanningMetric("Freie Reserve", `${hoursLabel(model.remainingFlexibleHours)} / Woche`, "nach allen Zeitbloecken", model.remainingFlexibleHours < 0 ? "unrealistic" : model.status)}
    ${incomePlanningMetric("Konflikte", String(model.conflictCount), "Ueberschneidungen im Kalender", model.conflictCount > 0 ? "high" : "realistic")}
    ${incomePlanningMetric("Belastung", incomePlanningStatusLabel(model.status), `${hoursLabel(model.usedHours)} von 168h verplant`, model.status)}
  `;
}

function incomePlanningMetric(
  label: string,
  value: string,
  detail: string,
  status: IncomePlanningModel["status"]
): string {
  return `
    <article class="metric-card income-planning-metric ${escapeHtml(status)}">
      <span class="metric-label">${escapeHtml(label)}</span>
      <strong class="metric-value">${escapeHtml(value)}</strong>
      <small class="metric-detail">${escapeHtml(detail)}</small>
    </article>
  `;
}

function renderIncomePlanningWarnings(model: IncomePlanningModel): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningWarnings");
  if (!host) return;
  host.innerHTML = model.warnings.length
    ? model.warnings
        .map(
          (warning) => `
            <div class="income-planning-warning ${escapeHtml(model.status)}">
              <strong>${escapeHtml(incomePlanningStatusLabel(model.status))}</strong>
              <span>${escapeHtml(warning)}</span>
            </div>
          `
        )
        .join("")
    : `
      <div class="income-planning-warning realistic">
        <strong>Realistisch</strong>
        <span>Die Kombination passt in die aktuelle Zeitplanung.</span>
      </div>
    `;
}

interface IncomePlanningTimeSegment {
  label: string;
  value: number;
  color: string;
}

function renderIncomePlanningTimeCharts(model: IncomePlanningModel): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningTimeCharts");
  if (!host) return;
  const remaining = Math.max(0, model.remainingFlexibleHours);
  host.innerHTML = `
    ${incomePlanningDonutChart(
      "Wochenzeit",
      hoursLabel(model.usedHours),
      "verplant von 168 h",
      [
        { label: "Verplant", value: Math.min(168, Math.max(0, model.usedHours)), color: "var(--accent)" },
        { label: "Freie Reserve", value: remaining, color: "var(--row-border)" }
      ],
      168
    )}
    ${incomePlanningDonutChart(
      "Verbrauchte Wochenzeit",
      hoursLabel(model.usedHours),
      "Aufteilung der Woche",
      [
        { label: "Arbeitszeit", value: model.totalWorkHours, color: "#2e7d58" },
        { label: "Pausen", value: model.pauseHours, color: "#6f7785" },
        { label: "Habits", value: model.habitHours, color: "#8f5aa8" },
        { label: "Schlaf", value: model.sleepHoursPerWeek, color: "#4f6f9f" },
        { label: "Privat/Freizeit/Puffer", value: model.manualHours, color: "#b8860b" },
        { label: "Reserve", value: remaining, color: "var(--row-border)" }
      ],
      168
    )}
  `;
}

function incomePlanningDonutChart(
  title: string,
  value: string,
  detail: string,
  segments: IncomePlanningTimeSegment[],
  total: number
): string {
  const visibleSegments = segments.filter((segment) => segment.value > 0);
  const gradient = incomePlanningDonutGradient(visibleSegments, total);
  return `
    <article class="income-planning-time-chart">
      <div class="income-planning-donut" style="background: ${gradient}">
        <span>
          <strong>${escapeHtml(value)}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
      </div>
      <div class="income-planning-time-chart-copy">
        <strong>${escapeHtml(title)}</strong>
        <div class="income-planning-time-legend">
          ${visibleSegments.map((segment) => incomePlanningTimeLegendItem(segment, total)).join("")}
        </div>
      </div>
    </article>
  `;
}

function incomePlanningTimeLegendItem(segment: IncomePlanningTimeSegment, total: number): string {
  const share = total > 0 ? (segment.value / total) * 100 : 0;
  return `
    <span class="income-planning-time-legend-item">
      <i style="background: ${segment.color}"></i>
      <span>${escapeHtml(segment.label)}</span>
      <strong>${hoursLabel(segment.value)} · ${escapeHtml(percent(share))}</strong>
    </span>
  `;
}

function incomePlanningDonutGradient(segments: IncomePlanningTimeSegment[], total: number): string {
  if (!segments.length || total <= 0) return "conic-gradient(var(--row-border) 0deg 360deg)";
  let cursor = 0;
  const stops = segments.map((segment, index) => {
    const next = index === segments.length - 1 ? 360 : Math.min(360, cursor + (Math.max(0, segment.value) / total) * 360);
    const stop = `${segment.color} ${cursor.toFixed(2)}deg ${next.toFixed(2)}deg`;
    cursor = next;
    return stop;
  });
  if (cursor < 360) stops.push(`var(--row-border) ${cursor.toFixed(2)}deg 360deg`);
  return `conic-gradient(${stops.join(", ")})`;
}

export function renderIncomePlanningSources(): void {
  const container = document.querySelector<HTMLDivElement>("#incomePlanningWorkBlocks");
  if (!container) return;
  const model = incomePlanningModelForActiveWeek();
  container.innerHTML = host.getState().incomePlanning.workBlocks.length
    ? host.getState().incomePlanning.workBlocks.map((workBlock) => incomePlanningWorkBlockRow(workBlock, model)).join("")
    : '<div class="chart-empty">Noch keine Arbeitszeit geplant.</div>';
}

function incomePlanningWorkBlockRow(workBlock: IncomePlanningWorkBlock, model: IncomePlanningModel): string {
  const hours = incomePlanningOwnerHours(model, workBlock.id);
  const pauseHours = slotsPauseHours(workBlock.slots);
  const config = incomePlanningCategoryConfig(workBlock.category);
  return `
    <article class="income-planning-block-card compact work ${workBlock.active ? "active" : ""}" style="${incomePlanningColorStyle(workBlock.color ?? incomePlanningDefaultWorkColor(workBlock.category))}">
      <div class="income-planning-work-card-main">
        <div class="income-planning-work-title">
          ${incomePlanningTypeLabel(config.label, config.icon)}
          <strong>${escapeHtml(workBlock.name)}</strong>
          <small>${escapeHtml(workBlock.description || `${hoursLabel(hours)} netto · ${hoursLabel(slotsGrossHours(workBlock.slots))} brutto`)}</small>
        </div>
        <div class="income-planning-work-hours">
          <strong>${escapeHtml(hoursLabel(hours))}</strong>
          <span>${escapeHtml(pauseHours > 0 ? `${hoursLabel(pauseHours)} Pause` : "pro Woche")}</span>
        </div>
        <div class="button-row">
          <button class="button secondary" type="button" data-action="income-planning-open-block" data-income-planning-owner-type="work" data-income-planning-owner-id="${escapeHtml(
            workBlock.id
          )}">Bearbeiten</button>
          <button class="icon-button danger" type="button" data-action="income-planning-remove-work-block" data-income-planning-work-id="${escapeHtml(
            workBlock.id
          )}" aria-label="Arbeitsblock entfernen">x</button>
        </div>
      </div>
      ${incomePlanningSlotSummary("work", workBlock.id, workBlock.slots)}
    </article>
  `;
}

function incomePlanningTypeLabel(label: string, icon: string): string {
  return `
    <span class="income-planning-type-label">
      ${positionIconSvg(icon, "position-icon-svg income-planning-type-icon")}
      <span>${escapeHtml(label)}</span>
    </span>
  `;
}

function incomePlanningSlotSummary(ownerType: string, ownerId: string, slots: IncomePlanningSlot[]): string {
  const addChip = incomePlanningSlotAddChip(ownerType, ownerId);
  return `
    <div class="income-planning-slot-summary">
      ${slots.length
        ? `${slots.map((slot) => incomePlanningSlotChip(ownerType, ownerId, slot)).join("")}${addChip}`
        : '<div class="chart-empty">Noch keine Wochen-Slots geplant.</div>'}
      ${slots.length ? "" : addChip}
    </div>
  `;
}

function incomePlanningSlotChip(ownerType: string, ownerId: string, slot: IncomePlanningSlot): string {
  const duration = incomePlanningSlotGrossDurationMinutes(slot);
  const visualRange = incomePlanningVisualRangeFromTimes(slot.startTime, slot.endTime, duration);
  const slotNote = slot.note?.trim();
  const timeLabel = slot.flexible
    ? `flexibel · ${formatIncomePlanningTime(visualRange.startMinute)}-${formatIncomePlanningTime(visualRange.endMinute)} · ${minutesLabel(
        duration
      )}`
    : `${slot.startTime}-${slot.endTime}`;
  const pauseLabel =
    ownerType !== "habit" && slot.pauseEnabled && slot.pauseStartTime && slot.pauseEndTime
      ? `<small>Pause ${escapeHtml(slot.pauseStartTime)}-${escapeHtml(slot.pauseEndTime)}</small>`
      : "";
  const noteLabel = slotNote ? `<small>${escapeHtml(slotNote)}</small>` : "";
  return `
    <button class="income-planning-slot-chip ${slot.flexible ? "flexible" : ""}" type="button" data-action="income-planning-open-block" data-income-planning-owner-type="${escapeHtml(
      ownerType
    )}" data-income-planning-owner-id="${escapeHtml(ownerId)}" data-income-planning-slot-id="${escapeHtml(slot.id)}">
      <strong>${escapeHtml(incomePlanningWeekdayLabel(slot.day))}</strong>
      <span>${escapeHtml(timeLabel)}</span>
      ${pauseLabel}
      ${noteLabel}
    </button>
  `;
}

function incomePlanningSlotAddChip(ownerType: string, ownerId: string): string {
  return `
    <button class="income-planning-slot-chip add" type="button" data-action="income-planning-add-slot" data-income-planning-owner-type="${escapeHtml(
      ownerType
    )}" data-income-planning-owner-id="${escapeHtml(ownerId)}">
      <strong>+</strong>
      <span>Wochen-Slot</span>
    </button>
  `;
}

export function renderIncomePlanningAssumptions(): void {
  const container = document.querySelector<HTMLDivElement>("#incomePlanningAssumptions");
  if (!container) return;
  const assumptions = host.getState().incomePlanning.assumptions;
  const sleepHours = incomePlanningAverageSleepHours(assumptions);
  const sleepWeekHours = hoursLabel(assumptions.sleepSlots.reduce((sum, slot) => sum + incomePlanningSleepSlotDurationMinutes(slot), 0) / 60);
  const sleepGroupCount = incomePlanningSleepSlotGroupsFromSlots(assumptions.sleepSlots).length;
  container.innerHTML = `
    <article class="income-planning-block-card compact active">
      <div class="income-planning-compact-head">
        <div>
          <span>Zeitannahme</span>
          <strong>Schlaf</strong>
          <small>${hoursLabel(sleepHours)} pro Tag · ${sleepWeekHours} / Woche · ${intNumber(sleepGroupCount)} Schlafzeiten</small>
        </div>
        <button class="button secondary" type="button" data-action="income-planning-edit-assumption">Bearbeiten</button>
      </div>
    </article>
  `;
}

export function renderIncomePlanningManualBlocks(): void {
  const container = document.querySelector<HTMLDivElement>("#incomePlanningManualBlocks");
  if (!container) return;
  container.innerHTML = host.getState().incomePlanning.manualBlocks.length
    ? host.getState().incomePlanning.manualBlocks.map(incomePlanningManualBlockRow).join("")
    : '<div class="chart-empty">Noch keine privaten Zeitbloecke geplant.</div>';
}

function incomePlanningManualBlockRow(block: IncomePlanningManualBlock): string {
  const pauseHours = slotsPauseHours(block.slots);
  const icon = normalizePositionIcon(block.icon, incomePlanningDefaultManualIcon(block.type));
  return `
    <article class="income-planning-block-card compact ${block.active ? "active" : ""}" style="${incomePlanningColorStyle(block.color ?? incomePlanningDefaultManualColor(block.type))}">
      <div class="income-planning-compact-head">
        <div>
          <span>${positionIconSvg(icon, "position-icon-svg income-planning-type-icon")} ${escapeHtml(incomePlanningManualBlockTypeLabel(block.type))}</span>
          <strong>${escapeHtml(block.name)}</strong>
          <small>${escapeHtml(block.description || `${hoursLabel(slotsHours(block.slots))} / Woche${pauseHours > 0 ? ` · ${hoursLabel(pauseHours)} Pause` : ""}`)}</small>
        </div>
        <div class="button-row">
          <button class="button secondary" type="button" data-action="income-planning-open-block" data-income-planning-owner-type="manual" data-income-planning-owner-id="${escapeHtml(
            block.id
          )}">Bearbeiten</button>
          <button class="icon-button danger" type="button" data-action="income-planning-remove-manual-block" data-income-planning-manual-id="${escapeHtml(
            block.id
          )}" aria-label="Zeitblock entfernen">x</button>
        </div>
      </div>
      ${incomePlanningSlotSummary("manual", block.id, block.slots)}
    </article>
  `;
}

export function renderIncomePlanningHabits(): void {
  const container = document.querySelector<HTMLDivElement>("#incomePlanningHabits");
  if (!container) return;
  container.innerHTML = host.getState().incomePlanning.habits.length
    ? host.getState().incomePlanning.habits.map(incomePlanningHabitRow).join("")
    : '<div class="chart-empty">Noch keine Habits geplant.</div>';
}

function incomePlanningHabitRow(habit: IncomePlanningHabit): string {
  const icon = normalizePositionIcon(habit.icon, habit.type === "bad" ? "snack" : "book");
  return `
    <article class="income-planning-block-card compact habit ${habit.active ? "active" : ""}">
      <div class="income-planning-compact-head">
        <div>
          <span>${positionIconSvg(icon, "position-icon-svg income-planning-type-icon")} ${habit.type === "good" ? "Gute Habit" : "Schlechte Habit"} · ${escapeHtml(incomePlanningHabitChangeLabel(habit.goalChange))}</span>
          <strong>${escapeHtml(habit.name)}</strong>
          <small>${escapeHtml(`${habit.timing || "ohne Zeitpunkt"} · ${habit.durationMinutes} min/${habit.durationUnit === "day" ? "Tag" : "Woche"}`)}</small>
        </div>
        <div class="button-row">
          <button class="button secondary" type="button" data-action="income-planning-open-block" data-income-planning-owner-type="habit" data-income-planning-owner-id="${escapeHtml(
            habit.id
          )}">Bearbeiten</button>
          <button class="icon-button danger" type="button" data-action="income-planning-remove-habit" data-income-planning-habit-id="${escapeHtml(
            habit.id
          )}" aria-label="Habit entfernen">x</button>
        </div>
      </div>
      ${incomePlanningSlotSummary("habit", habit.id, habit.slots)}
    </article>
  `;
}

export function renderIncomePlanningCalendarStamps(): void {
  const container = document.querySelector<HTMLDivElement>("#incomePlanningCalendarStamps");
  if (!container) return;
  const stamps = [...host.getState().incomePlanning.calendarStamps].sort(compareIncomePlanningCalendarStamps);
  container.innerHTML = `
    <div class="income-planning-stamp-list-head">
      <strong>Stempel</strong>
      <span>${intNumber(stamps.length)} im Kalender</span>
    </div>
    ${
      stamps.length
        ? stamps.map(incomePlanningCalendarStampListRow).join("")
        : '<div class="chart-empty">Strg+Klick im Kalender setzt Icon-Stempel.</div>'
    }
  `;
}

function incomePlanningCalendarStampListRow(stamp: IncomePlanningCalendarStamp): string {
  const icon = normalizePositionIcon(stamp.icon, "calendar");
  return `
    <button class="income-planning-stamp-list-row" type="button" data-action="income-planning-edit-stamp" data-income-planning-stamp-id="${escapeHtml(stamp.id)}">
      ${positionIconSvg(icon, "position-icon-svg income-planning-type-icon")}
      <span>${escapeHtml(stamp.label)}</span>
      <small>${escapeHtml(`${incomePlanningWeekdayLabel(stamp.day)} · ${stamp.startTime}`)}</small>
    </button>
  `;
}

function compareIncomePlanningCalendarStamps(first: IncomePlanningCalendarStamp, second: IncomePlanningCalendarStamp): number {
  const dayDiff = incomePlanningWeekdayIndex(first.day) - incomePlanningWeekdayIndex(second.day);
  if (dayDiff !== 0) return dayDiff;
  return first.startTime.localeCompare(second.startTime, "de");
}

export function renderIncomePlanningCareerLife(model: IncomePlanningModel): void {
  const host = document.querySelector<HTMLDivElement>("#incomePlanningCareerLife");
  if (!host) return;
  const block = model.careerWorkBlocks[0];
  if (!block) {
    host.innerHTML = '<div class="chart-empty">Kein aktiver Hauptjob geplant.</div>';
    return;
  }
  const config = incomePlanningCategoryConfig(block.category);
  const hours = incomePlanningOwnerHours(model, block.id);
  const pauseHours = slotsPauseHours(block.slots);
  host.innerHTML = `
    <article class="income-planning-career-item" style="${incomePlanningColorStyle(block.color ?? incomePlanningDefaultWorkColor(block.category))}">
      <div class="income-planning-career-main">
        ${incomePlanningTypeLabel(config.label, config.icon)}
        <strong>${escapeHtml(block.name)}</strong>
        <small>${escapeHtml(block.description || `${intNumber(block.slots.length)} Slot${block.slots.length === 1 ? "" : "s"} · ${hoursLabel(slotsGrossHours(block.slots))} brutto`)}</small>
      </div>
      <div class="income-planning-career-stats">
        <strong>${escapeHtml(hoursLabel(hours))}</strong>
        <span>${escapeHtml(pauseHours > 0 ? `${hoursLabel(pauseHours)} Pause` : "netto/Woche")}</span>
      </div>
      <button class="button secondary" type="button" data-action="income-planning-open-block" data-income-planning-owner-type="work" data-income-planning-owner-id="${escapeHtml(
        block.id
      )}">Bearbeiten</button>
    </article>
  `;
}

function renderIncomePlanningScenarios(model: IncomePlanningModel): void {
  const container = document.querySelector<HTMLDivElement>("#incomePlanningWeeklyPlanner");
  if (!container) return;
  const graphicEntries = model.calendarEntries.filter((entry) => !entry.invalid);
  const backgroundEntries = incomePlanningCalendarBackgroundEntries();
  const flexibleCount = graphicEntries.filter((entry) => entry.flexible).length;
  const currentTime = incomePlanningIsCurrentWeek() ? incomePlanningCurrentTimeMarker() : null;
  const weekRange = incomePlanningActiveWeekRange();
  const scenario = incomePlanningWeekScenarioConfig(model.scenarioId, host.getState().incomePlanning.weekScenarios ?? []);
  container.innerHTML = `
    <div class="income-planning-calendar" data-income-planning-calendar>
      <div class="income-planning-week-toolbar">
        <div class="income-planning-week-nav" role="group" aria-label="Kalenderwoche">
          <button class="income-stamp-planner-month-button" type="button" data-action="income-planning-prev-week" aria-label="Vorherige Woche" title="Vorherige Woche">
            ${incomePlanningHeaderIcon("chevron-left")}
          </button>
          <div class="income-planning-week-label">
            <span>Woche</span>
            <strong>${escapeHtml(`${incomeStampPlannerShortDate(weekRange.start)}-${incomeStampPlannerShortDate(weekRange.end)}${weekRange.end.getFullYear()}`)}</strong>
          </div>
          <button class="income-stamp-planner-month-button" type="button" data-action="income-planning-next-week" aria-label="Naechste Woche" title="Naechste Woche">
            ${incomePlanningHeaderIcon("chevron-right")}
          </button>
          ${
            incomePlanningIsCurrentWeek()
              ? ""
              : '<button class="income-stamp-planner-today-button" type="button" data-action="income-planning-current-week">Heute</button>'
          }
        </div>
        <div class="income-planning-week-range">
          <strong>${escapeHtml(model.scenarioLabel)}</strong>
          <span>${escapeHtml(scenario.description)}</span>
        </div>
        <div class="income-planning-week-actions">
          <button class="button" type="button" data-action="income-planning-open-planning-popup-year">Jahresplanung</button>
          <button class="button secondary" type="button" data-action="income-planning-open-planning-popup-stamp">Stempelplaner</button>
        </div>
      </div>
      <div class="income-planning-week-scenario" aria-label="Wochenszenario">
        <div>
          <span>Wochenszenario</span>
          <strong>${escapeHtml(model.scenarioLabel)}</strong>
          <small>${escapeHtml(scenario.description)}</small>
        </div>
        <div class="income-planning-week-scenario-options" role="group" aria-label="Wochenszenario auswaehlen">
          ${incomePlanningWeekScenarioOptions().map((option) => incomePlanningWeekScenarioButton(option.id, model.scenarioId)).join("")}
          <button
            class="income-planning-week-scenario-button add"
            type="button"
            data-action="income-planning-open-week-scenario-dialog"
            aria-label="Wochenszenario hinzufuegen"
            title="Wochenszenario hinzufuegen"
          >
            <span>+</span>
          </button>
        </div>
      </div>
      <div class="income-planning-calendar-head">
        <span></span>
        ${INCOME_PLANNING_WEEK_DAYS.map((day) => `<strong>${escapeHtml(incomePlanningWeekdayLabel(day))}</strong>`).join("")}
      </div>
      <div class="income-planning-calendar-body">
        <div class="income-planning-calendar-axis" aria-hidden="true">
          ${Array.from({ length: 25 }, (_, hour) => `<span style="--hour:${hour}">${String(hour).padStart(2, "0")}:00</span>`).join("")}
        </div>
        <div id="incomePlanningCalendarDays" class="income-planning-calendar-days">
          ${INCOME_PLANNING_WEEK_DAYS.map((day) => incomePlanningCalendarDayColumn(day, graphicEntries, backgroundEntries, currentTime)).join("")}
        </div>
      </div>
      <div class="income-planning-calendar-note">
        <span>${intNumber(graphicEntries.length)} Zeitbloecke in der Grafik</span>
        <span>${intNumber(flexibleCount)} flexible Zeitbloecke</span>
        <span>${intNumber(incomePlanningSleepSlotsForActiveScenario().length)} Schlafhorizonte im Hintergrund</span>
        ${currentTime ? `<span>Ist-Zeit ${escapeHtml(currentTime.label)}</span>` : ""}
      </div>
    </div>
  `;
}

function incomePlanningWeekScenarioButton(
  scenarioId: IncomePlanningWeekScenarioId,
  activeScenarioId: IncomePlanningWeekScenarioId
): string {
  const scenario = incomePlanningWeekScenarioConfig(scenarioId, host.getState().incomePlanning.weekScenarios ?? []);
  const active = scenarioId === activeScenarioId;
  return `
    <button
      class="income-planning-week-scenario-button ${active ? "active" : ""}"
      type="button"
      data-action="select-income-planning-week-scenario-${scenarioId}"
      aria-pressed="${active}"
      title="${escapeHtml(scenario.description)}"
    >
      ${positionIconSvg(scenario.icon, "position-icon-svg income-planning-type-icon")}
      <span>${escapeHtml(scenario.label)}</span>
    </button>
  `;
}

function incomePlanningCalendarDayColumn(
  day: IncomePlanningWeekday,
  entries: IncomePlanningCalendarEntry[],
  backgroundEntries: IncomePlanningCalendarBackgroundEntry[],
  currentTime: { day: IncomePlanningWeekday; minute: number; label: string } | null
): string {
  const dayEntries = entries.filter((entry) => entry.day === day);
  const dayBackgrounds = backgroundEntries.filter((entry) => entry.day === day);
  const dayStamps = host.getState().incomePlanning.calendarStamps
    .filter((stamp) => stamp.day === day && incomePlanningEntryIsActiveInCurrentScenario(stamp))
    .sort(compareIncomePlanningCalendarStamps);
  const plannedStamps = incomePlanningPlannedStampsForCurrentWeek(day);
  return `
    <div class="income-planning-calendar-day-column" data-income-planning-calendar-day="${escapeHtml(day)}" aria-label="${escapeHtml(
      incomePlanningWeekdayLabel(day)
    )}">
      <div class="income-planning-calendar-hour-lines" aria-hidden="true">
        ${Array.from({ length: 24 }, (_, hour) => `<i style="--hour:${hour}"></i>`).join("")}
      </div>
      ${dayBackgrounds.map(incomePlanningCalendarBackgroundBlock).join("")}
      ${dayEntries.map(incomePlanningCalendarEntryBlock).join("")}
      ${dayStamps.map(incomePlanningCalendarStampMarker).join("")}
      ${plannedStamps.map(incomePlanningPlannedStampMarker).join("")}
      ${currentTime?.day === day ? incomePlanningCurrentTimeLine(currentTime.minute, currentTime.label) : ""}
    </div>
  `;
}

function incomePlanningCalendarBackgroundEntries(): IncomePlanningCalendarBackgroundEntry[] {
  const sleepEntries = incomePlanningSleepSlotGroupsFromSlots(incomePlanningSleepSlotsForActiveScenario()).flatMap(
    incomePlanningSleepBackgroundEntries
  );
  return sleepEntries;
}

function incomePlanningSleepSlotsForActiveScenario(): IncomePlanningSleepSlot[] {
  return host.getState().incomePlanning.assumptions.sleepSlots.filter(incomePlanningEntryIsActiveInCurrentScenario);
}

export function incomePlanningSleepBackgroundEntries(group: IncomePlanningSleepSlotGroup): IncomePlanningCalendarBackgroundEntry[] {
  const slots = incomePlanningSleepSlotsFromDialogGroups([group]);
  return slots.flatMap((slot) => incomePlanningSleepSlotBackgroundEntries(slot, group.id, group.flexible, group.durationMinutes));
}

function incomePlanningSleepSlotBackgroundEntries(
  slot: IncomePlanningSleepSlot,
  groupId: string,
  flexible: boolean,
  durationMinutes: number
): IncomePlanningCalendarBackgroundEntry[] {
  const segments = incomePlanningSlotCalendarSegments(slot);
  return segments.map((segment, index) => ({
    id: `${slot.id}:sleep:${index}`,
    day: segment.day,
    startMinute: segment.startMinute,
    endMinute: segment.endMinute,
    title: "Schlaf",
    label: "Schlaf",
    detail: flexible ? `flexibel · ${minutesLabel(durationMinutes)}` : `${slot.startTime}-${slot.endTime}`,
    icon: "health",
    type: "sleep",
    flexible,
    sleepGroupId: groupId
  }));
}

function incomePlanningCalendarBackgroundBlock(entry: IncomePlanningCalendarBackgroundEntry): string {
  const start = clamp(entry.startMinute, 0, 24 * 60);
  const end = clamp(entry.endMinute, start + 15, 24 * 60);
  const top = (start / (24 * 60)) * 100;
  const height = ((end - start) / (24 * 60)) * 100;
  const classes = [
    "income-planning-calendar-background",
    `type-${entry.type}`,
    entry.flexible ? "flexible" : ""
  ]
    .filter(Boolean)
    .join(" ");
  return `
    <div
      class="${escapeHtml(classes)}"
      style="--top:${top.toFixed(3)}%; --height:${height.toFixed(3)}%; ${entry.color ? incomePlanningColorStyle(entry.color) : ""}"
      data-income-planning-calendar-background="true"
      data-income-planning-background-entry-id="${escapeHtml(entry.id)}"
      ${entry.sleepGroupId ? `data-income-planning-sleep-group-id="${escapeHtml(entry.sleepGroupId)}"` : ""}
      aria-hidden="true"
      title="${escapeHtml(`${entry.title} · ${entry.detail}`)}"
    >
      <span class="income-planning-calendar-label">
        ${positionIconSvg(entry.icon, "position-icon-svg income-planning-calendar-icon")}
        <span>${escapeHtml(entry.label)}</span>
      </span>
      <strong>${escapeHtml(entry.title)}</strong>
      <small>${escapeHtml(entry.detail)}</small>
    </div>
  `;
}

function incomePlanningCalendarEntryBlock(entry: IncomePlanningCalendarEntry): string {
  const meta = incomePlanningCalendarEntryMeta(entry);
  const color = incomePlanningCalendarEntryColor(entry);
  const range = incomePlanningCalendarEntryVisualRange(entry);
  const start = range.startMinute;
  const end = range.endMinute;
  const top = (start / (24 * 60)) * 100;
  const height = ((end - start) / (24 * 60)) * 100;
  const isHabitEntry = entry.type === "good_habit" || entry.type === "bad_habit" || entry.type === "replacement_habit";
  const classes = [
    "income-planning-calendar-block",
    `type-${entry.type}`,
    entry.flexible ? "flexible" : "",
    entry.conflict ? "conflict" : "",
    entry.durationMinutes <= 30 ? "short" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const ownerType = incomePlanningOwnerTypeForEntry(entry);
  const plannerLabel = incomePlanningPlannerTypeLabel(entry.type);
  const detailLabel = entry.detail ? `${plannerLabel} · ${entry.detail}` : plannerLabel;
  return `
    <button
      class="${escapeHtml(classes)}"
      type="button"
      data-action="income-planning-open-block"
      data-income-planning-calendar-block="true"
      data-income-planning-owner-type="${escapeHtml(ownerType)}"
      data-income-planning-owner-id="${escapeHtml(entry.ownerId)}"
      data-income-planning-slot-id="${escapeHtml(entry.slotId)}"
      data-income-planning-slot-part="${escapeHtml(entry.slotPart)}"
      style="--top:${top.toFixed(3)}%; --height:${height.toFixed(3)}%; --start-minute:${start}; --duration-minutes:${end - start}; ${incomePlanningColorStyle(color)}"
      title="${escapeHtml(`${incomePlanningEntryTime(entry)} · ${entry.title}${isHabitEntry ? "" : ` · ${meta.label}`} · ${detailLabel}`)}"
    >
      <span class="income-planning-calendar-resize top" data-income-planning-resize="start" aria-hidden="true"></span>
      <span class="income-planning-calendar-label">
        ${positionIconSvg(meta.icon, "position-icon-svg income-planning-calendar-icon")}
        <span>${escapeHtml(isHabitEntry ? entry.title : meta.label)}</span>
      </span>
      ${isHabitEntry ? "" : `<strong>${escapeHtml(entry.title)}</strong>`}
      <small>${escapeHtml(incomePlanningEntryTime(entry))}</small>
      ${isHabitEntry && !entry.detail ? "" : `<em>${escapeHtml(isHabitEntry ? entry.detail ?? "" : detailLabel)}</em>`}
      <span class="income-planning-calendar-resize bottom" data-income-planning-resize="end" aria-hidden="true"></span>
    </button>
  `;
}

function incomePlanningCalendarEntryVisualRange(entry: IncomePlanningCalendarEntry): { startMinute: number; endMinute: number } {
  return incomePlanningVisualRangeFromTimes(entry.startTime, entry.endTime, entry.durationMinutes);
}

function incomePlanningVisualRangeFromTimes(
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

function incomePlanningCalendarStampMarker(stamp: IncomePlanningCalendarStamp): string {
  const start = clamp(parseTimeMinutes(stamp.startTime) ?? 0, 0, 24 * 60);
  const top = (start / (24 * 60)) * 100;
  const icon = normalizePositionIcon(stamp.icon, "calendar");
  return `
    <button
      class="income-planning-calendar-stamp"
      type="button"
      data-action="income-planning-open-stamp-menu"
      data-income-planning-calendar-stamp="true"
      data-income-planning-stamp-id="${escapeHtml(stamp.id)}"
      style="--top:${top.toFixed(3)}%;"
      title="${escapeHtml(`${stamp.label} · ${stamp.startTime}`)}"
    >
      ${positionIconSvg(icon, "position-icon-svg income-planning-calendar-icon")}
      <span>${escapeHtml(stamp.label)}</span>
    </button>
  `;
}

function incomePlanningPlannedStampMarker(stamp: IncomePlanningPlannedStamp): string {
  const start = clamp(parseTimeMinutes(stamp.startTime) ?? 0, 0, 24 * 60);
  const top = (start / (24 * 60)) * 100;
  const icon = normalizePositionIcon(stamp.icon, "calendar");
  return `
    <button
      class="income-planning-calendar-stamp planned"
      type="button"
      data-action="income-stamp-planner-edit"
      data-income-stamp-planner-calendar-stamp="true"
      data-income-stamp-planner-stamp-id="${escapeHtml(stamp.id)}"
      style="--top:${top.toFixed(3)}%;"
      title="${escapeHtml(`${stamp.label} · ${incomeStampPlannerFullDateLabel(stamp.date)} · ${stamp.startTime}`)}"
    >
      ${positionIconSvg(icon, "position-icon-svg income-planning-calendar-icon")}
      <span>${escapeHtml(stamp.label)}</span>
    </button>
  `;
}

function incomePlanningCurrentTimeLine(minute: number, label: string): string {
  const top = (clamp(minute, 0, 24 * 60) / (24 * 60)) * 100;
  return `
    <div class="income-planning-current-time-line" style="--top:${top.toFixed(3)}%;" aria-label="Ist-Zeit ${escapeHtml(label)}">
      <span>Ist-Zeit ${escapeHtml(label)}</span>
    </div>
  `;
}

function incomePlanningCurrentTimeMarker(): { day: IncomePlanningWeekday; minute: number; label: string } {
  const now = new Date();
  const dayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const minute = now.getHours() * 60 + now.getMinutes();
  return {
    day: INCOME_PLANNING_WEEK_DAYS[dayIndex] ?? "monday",
    minute,
    label: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  };
}

function incomePlanningCalendarEntryMeta(entry: IncomePlanningCalendarEntry): { label: string; icon: string } {
  if (entry.type === "pause") return { label: "Pause", icon: "calendar" };
  const workBlock = host.getState().incomePlanning.workBlocks.find((block) => block.id === entry.ownerId);
  if (workBlock && (entry.type === "career" || entry.type === "side_work")) {
    const config = incomePlanningCategoryConfig(workBlock.category);
    return { label: config.label, icon: config.icon };
  }
  const habit = host.getState().incomePlanning.habits.find((item) => item.id === entry.ownerId);
  if (entry.type === "good_habit") return { label: entry.title, icon: normalizePositionIcon(habit?.icon, "book") };
  if (entry.type === "bad_habit") return { label: entry.title, icon: normalizePositionIcon(habit?.icon, "snack") };
  if (entry.type === "replacement_habit") return { label: entry.title, icon: "gift" };
  const manualBlock = host.getState().incomePlanning.manualBlocks.find((block) => block.id === entry.ownerId);
  if (manualBlock) {
    return {
      label: incomePlanningManualBlockTypeLabel(manualBlock.type),
      icon: normalizePositionIcon(manualBlock.icon, incomePlanningDefaultManualIcon(manualBlock.type))
    };
  }
  return { label: incomePlanningPlannerTypeLabel(entry.type), icon: "calendar" };
}

function incomePlanningCalendarEntryColor(entry: IncomePlanningCalendarEntry): string {
  if (entry.type === "pause") return "#6f7785";
  const workBlock = host.getState().incomePlanning.workBlocks.find((block) => block.id === entry.ownerId);
  if (workBlock && (entry.type === "career" || entry.type === "side_work")) {
    return normalizeIncomePlanningColor(workBlock.color, incomePlanningDefaultWorkColor(workBlock.category));
  }
  const manualBlock = host.getState().incomePlanning.manualBlocks.find((block) => block.id === entry.ownerId);
  if (manualBlock) return normalizeIncomePlanningColor(manualBlock.color, incomePlanningDefaultManualColor(manualBlock.type));
  if (entry.type === "good_habit") return "#4e9f6d";
  if (entry.type === "bad_habit") return "#b94646";
  if (entry.type === "replacement_habit") return "#8f5aa8";
  return "#6f7785";
}

function incomePlanningEntryTime(entry: IncomePlanningCalendarEntry): string {
  if (entry.flexible) {
    const range = incomePlanningCalendarEntryVisualRange(entry);
    return `flexibel · ${formatIncomePlanningTime(range.startMinute)}-${formatIncomePlanningTime(range.endMinute)} · ${minutesLabel(
      entry.durationMinutes
    )}`;
  }
  return `${entry.startTime}-${entry.endTime}`;
}

function incomePlanningManualBlockTypeOptions(): Array<{ value: IncomePlanningManualBlockType; label: string }> {
  return [
    { value: "private_commitment", label: "Private Verpflichtung" },
    { value: "free_time", label: "Freizeit" },
    { value: "buffer", label: "Puffer" },
    { value: "other_event", label: "Sonstiges Ereignis" }
  ];
}





function incomePlanningHabitChangeOptions(): Array<{ value: string; label: string }> {
  return [
    { value: "keep", label: "Beibehalten" },
    { value: "reduce", label: "Reduzieren" },
    { value: "replace", label: "Ersetzen" },
    { value: "build", label: "Aufbauen" }
  ];
}



function incomePlanningWeekdayLabel(day: IncomePlanningWeekday): string {
  if (day === "monday") return "Montag";
  if (day === "tuesday") return "Dienstag";
  if (day === "wednesday") return "Mittwoch";
  if (day === "thursday") return "Donnerstag";
  if (day === "friday") return "Freitag";
  if (day === "saturday") return "Samstag";
  return "Sonntag";
}


function incomePlanningWeekdayIndex(day: IncomePlanningWeekday): number {
  return INCOME_PLANNING_WEEK_DAYS.indexOf(day);
}


function incomePlanningPlannerTypeLabel(type: IncomePlanningPlannerEntryType): string {
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

function incomePlanningManualBlockTypeLabel(type: IncomePlanningManualBlockType): string {
  return incomePlanningManualBlockTypeOptions().find((option) => option.value === type)?.label ?? "Sonstiges Ereignis";
}

function incomePlanningHabitChangeLabel(value: IncomePlanningHabit["goalChange"]): string {
  return incomePlanningHabitChangeOptions().find((option) => option.value === value)?.label ?? "Beibehalten";
}

function incomePlanningOwnerTypeForEntry(entry: IncomePlanningCalendarEntry): Exclude<IncomePlanningOwnerType, "assumption"> {
  if (entry.type === "career" || entry.type === "side_work") return "work";
  if (entry.type === "good_habit" || entry.type === "bad_habit" || entry.type === "replacement_habit") return "habit";
  if (entry.type === "pause") return incomePlanningOwnerTypeForId(entry.ownerId);
  return "manual";
}

function incomePlanningOwnerTypeForId(ownerId: string): Exclude<IncomePlanningOwnerType, "assumption"> {
  if (host.getState().incomePlanning.workBlocks.some((block) => block.id === ownerId)) return "work";
  if (host.getState().incomePlanning.habits.some((habit) => habit.id === ownerId)) return "habit";
  return "manual";
}

export function incomePlanningOwnerTypeFromValue(value: unknown): Exclude<IncomePlanningOwnerType, "assumption"> {
  if (value === "work" || value === "habit" || value === "manual") return value;
  return "manual";
}

function incomePlanningOwnerHours(model: IncomePlanningModel, ownerId: string): number {
  const workBlock = host.getState().incomePlanning.workBlocks.find((block) => block.id === ownerId);
  if (workBlock) return slotsHours(workBlock.slots);
  const manualBlock = host.getState().incomePlanning.manualBlocks.find((block) => block.id === ownerId);
  if (manualBlock) return slotsHours(manualBlock.slots);
  const minutes = model.calendarEntries
    .filter((entry) => entry.ownerId === ownerId && entry.type !== "pause")
    .reduce((sum, entry) => sum + entry.durationMinutes, 0);
  return Math.round((minutes / 60 + Number.EPSILON) * 10) / 10;
}

function slotsHours(slots: IncomePlanningSlot[]): number {
  const minutes = slots.reduce((sum, slot) => sum + incomePlanningSlotNetDurationMinutes(slot), 0);
  return Math.round((minutes / 60 + Number.EPSILON) * 10) / 10;
}

function slotsGrossHours(slots: IncomePlanningSlot[]): number {
  const minutes = slots.reduce((sum, slot) => sum + incomePlanningSlotGrossDurationMinutes(slot), 0);
  return Math.round((minutes / 60 + Number.EPSILON) * 10) / 10;
}

function slotsPauseHours(slots: IncomePlanningSlot[]): number {
  const minutes = slots.reduce((sum, slot) => sum + incomePlanningSlotPauseDurationMinutes(slot), 0);
  return Math.round((minutes / 60 + Number.EPSILON) * 10) / 10;
}

function normalizeIncomePlanningColor(value: unknown, fallback = "#6f7785"): string {
  const color = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : fallback;
}

function incomePlanningColorStyle(color: string): string {
  const normalized = normalizeIncomePlanningColor(color);
  return `--entry-color:${normalized}; --entry-bg:${hexToRgba(normalized, 0.14)};`;
}

function hexToRgba(color: string, alpha: number): string {
  const normalized = normalizeIncomePlanningColor(color);
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${clamp(alpha, 0, 1)})`;
}


function formatIncomePlanningTime(value: number): string {
  const normalized = clamp(Math.round(value), 0, 24 * 60 - 1);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function incomePlanningStatusLabel(status: IncomePlanningModel["status"]): string {
  if (status === "unrealistic") return "Unrealistisch";
  if (status === "high") return "Hohe Belastung";
  return "Realistisch";
}

function hoursLabel(value: number): string {
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value)} h`;
}

function minutesLabel(value: number): string {
  if (value >= 60) return hoursLabel(Math.round((value / 60 + Number.EPSILON) * 10) / 10);
  return `${intNumber(value)} min`;
}
