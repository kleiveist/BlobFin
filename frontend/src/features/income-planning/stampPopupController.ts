import { createId } from "../../data/defaults";
import { parseTimeMinutes } from "../../domain/incomePlanning";
import { escapeHtml } from "../../lib/format";
import { normalizePositionIcon, POSITION_ICONS, positionIconSvg } from "../../lib/positionIcons";
import type { IncomePlanningCalendarStamp } from "../../types";
import { INCOME_PLANNING_STAMP_PRESETS } from "./config";
import { incomePlanningHostRef as host } from "./host";
import {
  formatIncomePlanningTime,
  incomePlanningWeekdayOptionItems,
  isIncomePlanningWeekday
} from "./shared";
import { incomePlanningUiState } from "./uiState";
import {
  incomePlanningKnownScenarioIds,
  incomePlanningScenarioCheckboxGroup,
  incomePlanningStoredScenarioIds
} from "./weekScenarioController";

export function hideIncomePlanningStampPicker(): void {
  incomePlanningUiState.stampPicker = null;
  renderIncomePlanningStampPicker();
}

export function hideIncomePlanningStampMenu(): void {
  incomePlanningUiState.stampMenu = null;
  renderIncomePlanningStampMenu();
}

export function updateIncomePlanningStampPickerDraft(field: string, value: string): void {
  if (!incomePlanningUiState.stampPicker) return;
  if (field === "label") {
    incomePlanningUiState.stampPicker = { ...incomePlanningUiState.stampPicker, label: value };
    return;
  }
  if (field === "startTime") {
    incomePlanningUiState.stampPicker = { ...incomePlanningUiState.stampPicker, startTime: value };
    return;
  }
  if (field === "day" && isIncomePlanningWeekday(value)) {
    incomePlanningUiState.stampPicker = { ...incomePlanningUiState.stampPicker, day: value };
  }
}

export function selectIncomePlanningStampIcon(icon: string): void {
  if (!incomePlanningUiState.stampPicker) return;
  incomePlanningUiState.stampPicker = { ...incomePlanningUiState.stampPicker, icon: normalizePositionIcon(icon, "calendar") };
  renderIncomePlanningStampPicker();
}

export function selectIncomePlanningStampPreset(label: string, icon: string): void {
  if (!incomePlanningUiState.stampPicker) return;
  const preset = INCOME_PLANNING_STAMP_PRESETS.find((item) => item.label === label) ?? {
    label: label.trim() || "Stempel",
    icon
  };
  incomePlanningUiState.stampPicker = {
    ...incomePlanningUiState.stampPicker,
    label: preset.label,
    icon: normalizePositionIcon(preset.icon, "calendar")
  };
  renderIncomePlanningStampPicker();
}

export function updateIncomePlanningStampScenarioSelection(scenarioId: string, checked: boolean): void {
  if (!incomePlanningUiState.stampPicker || !incomePlanningKnownScenarioIds().includes(scenarioId)) return;
  const selected = new Set(incomePlanningUiState.stampPicker.scenarioIds);
  if (checked) selected.add(scenarioId);
  else selected.delete(scenarioId);
  incomePlanningUiState.stampPicker = { ...incomePlanningUiState.stampPicker, scenarioIds: Array.from(selected) };
  renderIncomePlanningStampPicker();
}

export function saveIncomePlanningStampPicker(): void {
  if (!incomePlanningUiState.stampPicker) return;
  if (!incomePlanningUiState.stampPicker.scenarioIds.length) return;
  const label = incomePlanningUiState.stampPicker.label.trim() || "Stempel";
  const startTime = formatIncomePlanningTime(parseTimeMinutes(incomePlanningUiState.stampPicker.startTime) ?? 9 * 60);
  const stamp: IncomePlanningCalendarStamp = {
    id: incomePlanningUiState.stampPicker.stampId ?? createId(),
    day: incomePlanningUiState.stampPicker.day,
    startTime,
    icon: normalizePositionIcon(incomePlanningUiState.stampPicker.icon, "calendar"),
    label,
    scenarioIds: incomePlanningStoredScenarioIds(incomePlanningUiState.stampPicker.scenarioIds)
  };
  const exists = host.getState().incomePlanning.calendarStamps.some((item) => item.id === stamp.id);
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    calendarStamps: exists
      ? host.getState().incomePlanning.calendarStamps.map((item) => (item.id === stamp.id ? stamp : item))
      : [...host.getState().incomePlanning.calendarStamps, stamp]
  };
  incomePlanningUiState.stampPicker = null;
  host.renderAll();
  host.persistCurrentState();
}

export function deleteIncomePlanningStamp(stampId: string): void {
  if (!stampId) return;
  host.getState().incomePlanning = {
    ...host.getState().incomePlanning,
    calendarStamps: host.getState().incomePlanning.calendarStamps.filter((stamp) => stamp.id !== stampId)
  };
  incomePlanningUiState.stampPicker = null;
  incomePlanningUiState.stampMenu = null;
  host.renderAll();
  host.persistCurrentState();
}

export function renderIncomePlanningStampPicker(): void {
  const picker = document.querySelector<HTMLDivElement>("#incomePlanningUiState.stampPicker");
  if (!picker) return;
  if (!incomePlanningUiState.stampPicker) {
    picker.hidden = true;
    return;
  }
  const draft = incomePlanningUiState.stampPicker;
  const currentIcon = normalizePositionIcon(draft.icon, "calendar");
  picker.style.top = `${draft.top}px`;
  picker.style.left = `${draft.left}px`;
  picker.innerHTML = `
    <div class="position-icon-picker-head">
      <span>${draft.stampId ? "Stempel bearbeiten" : "Stempel setzen"}</span>
      ${incomePlanningStampPickerHeaderActions(draft)}
    </div>
    <div class="income-planning-stamp-form">
      <label class="field">
        <span>Label</span>
        <input type="text" value="${escapeHtml(draft.label)}" data-income-planning-stamp-field="label" />
      </label>
      <div class="income-planning-stamp-time-grid">
        ${incomePlanningStampSelectField("day", "Tag", incomePlanningWeekdayOptionItems(), draft.day)}
        <label class="field compact">
          <span>Zeit</span>
          <input type="time" value="${escapeHtml(draft.startTime)}" data-income-planning-stamp-field="startTime" />
        </label>
      </div>
    </div>
    <div class="income-planning-stamp-presets" aria-label="Stempel-Labels">
      ${INCOME_PLANNING_STAMP_PRESETS.map((preset) => {
        const active = draft.label === preset.label && currentIcon === normalizePositionIcon(preset.icon, "calendar");
        return `
          <button
            class="income-planning-stamp-preset ${active ? "active" : ""}"
            type="button"
            data-action="select-income-planning-stamp-preset"
            data-income-planning-stamp-label="${escapeHtml(preset.label)}"
            data-income-planning-stamp-icon="${escapeHtml(preset.icon)}"
            aria-pressed="${active}"
          >
            ${positionIconSvg(preset.icon, "position-icon-svg income-planning-type-icon")}
            <span>${escapeHtml(preset.label)}</span>
          </button>
        `;
      }).join("")}
    </div>
    <div class="position-icon-picker-grid compact">
      ${POSITION_ICONS.map((icon) => {
        const active = icon.id === currentIcon;
        return `
          <button
            class="position-icon-option ${active ? "active" : ""}"
            type="button"
            data-action="select-income-planning-stamp-icon"
            data-income-planning-stamp-icon="${icon.id}"
            aria-pressed="${active}"
            title="${escapeHtml(icon.label)}"
          >
            ${positionIconSvg(icon.id)}
            <span>${escapeHtml(icon.label)}</span>
          </button>
        `;
      }).join("")}
    </div>
    ${incomePlanningScenarioCheckboxGroup({
      selectedIds: draft.scenarioIds,
      dataAttribute: "data-income-planning-stamp-scenario-id"
    })}
    <div class="button-row income-planning-stamp-actions">
      <button class="button secondary" type="button" data-action="income-planning-close-stamp-picker">Abbrechen</button>
      <button class="button" type="button" data-action="income-planning-save-stamp">Speichern</button>
    </div>
  `;
  picker.hidden = false;
}

function incomePlanningStampPickerHeaderActions(draft: NonNullable<typeof incomePlanningUiState.stampPicker>): string {
  const deleteButton = draft.stampId
    ? `
      <button
        class="income-planning-header-icon-button danger"
        type="button"
        data-action="income-planning-delete-stamp"
        data-income-planning-stamp-id="${escapeHtml(draft.stampId)}"
        aria-label="Stempel loeschen"
        title="Loeschen"
      >
        ${incomePlanningHeaderIcon("trash")}
      </button>
    `
    : "";
  return `
    <div class="income-planning-header-actions">
      <button class="income-planning-header-icon-button" type="button" data-action="income-planning-close-stamp-picker" aria-label="Stempel-Picker schliessen" title="Schliessen">x</button>
      <button class="income-planning-header-icon-button" type="button" data-action="income-planning-save-stamp" aria-label="Stempel speichern" title="Speichern">
        ${incomePlanningHeaderIcon("save")}
      </button>
      ${deleteButton}
    </div>
  `;
}

function incomePlanningHeaderIcon(icon: "save" | "trash" | "chevron-left" | "chevron-right"): string {
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

function incomePlanningStampSelectField(
  field: string,
  label: string,
  options: Array<{ value: string; label: string }>,
  selected: string
): string {
  return `
    <label class="field compact">
      <span>${escapeHtml(label)}</span>
      <select data-income-planning-stamp-field="${escapeHtml(field)}">
        ${options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === selected ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
      </select>
    </label>
  `;
}

export function renderIncomePlanningStampMenu(): void {
  const menu = document.querySelector<HTMLDivElement>("#incomePlanningUiState.stampMenu");
  if (!menu) return;
  if (!incomePlanningUiState.stampMenu) {
    menu.hidden = true;
    return;
  }
  const stamp = host.getState().incomePlanning.calendarStamps.find((item) => item.id === incomePlanningUiState.stampMenu?.stampId);
  if (!stamp) {
    menu.hidden = true;
    return;
  }
  menu.style.top = `${incomePlanningUiState.stampMenu.top}px`;
  menu.style.left = `${incomePlanningUiState.stampMenu.left}px`;
  menu.innerHTML = `
    <div class="position-icon-picker-head">
      <span>${escapeHtml(stamp.label)}</span>
      <button class="icon-button" type="button" data-action="income-planning-close-stamp-menu" aria-label="Stempel-Menue schliessen">x</button>
    </div>
    <div class="income-planning-stamp-menu-actions">
      <button class="button secondary" type="button" data-action="income-planning-edit-stamp" data-income-planning-stamp-id="${escapeHtml(stamp.id)}">Bearbeiten</button>
      <button class="button danger" type="button" data-action="income-planning-delete-stamp" data-income-planning-stamp-id="${escapeHtml(stamp.id)}">Loeschen</button>
    </div>
  `;
  menu.hidden = false;
}
