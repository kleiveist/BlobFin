import { escapeHtml, money } from "../../lib/format";
import { normalizePositionIcon, positionIconSvg } from "../../lib/positionIcons";
import type { SelfEmploymentProject } from "../../types";
import type { SelfEmploymentProjectEvaluation } from "./feasibilityController";
import {
  hoursLabel,
  selfEmploymentFeasibilityLabel,
  selfEmploymentStatusLabel
} from "./feasibilityController";
import { SELF_EMPLOYMENT_LABEL_OPTIONS } from "./config";
import { selfEmploymentUiState } from "./uiState";

export function selfEmploymentProjectCard(evaluation: SelfEmploymentProjectEvaluation, selectedProjectId?: string): string {
  const { project } = evaluation;
  const active = project.id === selectedProjectId;
  const icon = normalizePositionIcon(project.icon, "briefcase");
  const labelChips =
    project.labels.length > 0
      ? project.labels
          .map((label) => `<span class="self-employment-label-chip">${escapeHtml(label)}</span>`)
          .join("")
      : `<span class="self-employment-label-chip muted">Ohne Label</span>`;
  return `
    <article
      class="self-employment-project-card ${escapeHtml(evaluation.feasibility)}${active ? " active" : ""}"
    >
      <div class="self-employment-project-head">
        <button
          class="self-employment-project-icon-button"
          type="button"
          data-action="self-employment-open-icon-picker"
          data-self-employment-project-id="${escapeHtml(project.id)}"
          aria-label="Projekt-Icon aendern"
          title="Projekt-Icon aendern"
        >
          ${positionIconSvg(icon, "position-icon-svg self-employment-project-icon-svg")}
        </button>
        <button
          class="self-employment-project-main"
          type="button"
          data-action="self-employment-select-project"
          data-self-employment-project-id="${escapeHtml(project.id)}"
          aria-pressed="${active}"
        >
          <span class="self-employment-project-title">
            <strong>${escapeHtml(project.name)}</strong>
          </span>
          <span>Status: ${escapeHtml(selfEmploymentStatusLabel(project.status))}</span>
          <span>Zeitbedarf: ${hoursLabel(project.requiredHoursPerWeek)} / Woche</span>
          <span>Startkapital: ${money(project.startCapitalRequired)}</span>
          <span>Gewinnpotenzial: ${money(evaluation.monthlyProfitAfterReserve)} / Monat</span>
          <span>Machbarkeit: ${escapeHtml(selfEmploymentFeasibilityLabel(evaluation.feasibility))}</span>
        </button>
      </div>
      <div class="self-employment-project-labels" aria-label="Projektlabels">${labelChips}</div>
      <div class="self-employment-project-actions">
        <button class="button mini secondary" type="button" data-action="self-employment-rename-project" data-self-employment-project-id="${escapeHtml(project.id)}">Umbenennen</button>
        <button class="button mini secondary" type="button" data-action="self-employment-toggle-label-picker" data-self-employment-project-id="${escapeHtml(project.id)}" aria-expanded="${selfEmploymentUiState.labelPickerProjectId === project.id}">Label</button>
        <button class="button mini danger" type="button" data-action="self-employment-delete-project" data-self-employment-project-id="${escapeHtml(project.id)}">Loeschen</button>
      </div>
      ${selfEmploymentUiState.labelPickerProjectId === project.id ? selfEmploymentLabelPicker(project) : ""}
    </article>
  `;
}

function selfEmploymentLabelPicker(project: SelfEmploymentProject): string {
  const options = [...new Set([...SELF_EMPLOYMENT_LABEL_OPTIONS, ...project.labels])];
  return `
    <div class="self-employment-label-picker" aria-label="Labels auswaehlen">
      ${options
        .map((label) => {
          const selected = project.labels.includes(label);
          return `
            <button
              class="self-employment-label-option${selected ? " active" : ""}"
              type="button"
              data-action="self-employment-toggle-label"
              data-self-employment-project-id="${escapeHtml(project.id)}"
              data-self-employment-label="${escapeHtml(label)}"
              aria-pressed="${selected}"
            >
              ${escapeHtml(label)}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}
