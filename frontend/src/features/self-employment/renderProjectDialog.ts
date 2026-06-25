import { escapeHtml } from "../../lib/format";
import type { SelfEmploymentProject } from "../../types";
import { selfEmploymentUiState } from "./uiState";

export function renderSelfEmploymentProjectRenameDialog(projects: SelfEmploymentProject[]): string {
  const dialog = selfEmploymentUiState.projectRenameDialog;
  if (!dialog) return "";
  const project = projects.find((item) => item.id === dialog.projectId);
  if (!project) {
    selfEmploymentUiState.projectRenameDialog = null;
    return "";
  }
  return `
    <div class="self-employment-project-dialog-backdrop" role="presentation">
      <section class="self-employment-project-dialog" role="dialog" aria-modal="true" aria-label="Projekt umbenennen">
        <header>
          <div>
            <span>Projekt</span>
            <strong>Umbenennen</strong>
          </div>
          <button class="icon-button" type="button" data-action="self-employment-cancel-project-rename" aria-label="Projekt-Dialog schliessen">x</button>
        </header>
        <label class="field">
          <span>Projektname</span>
          <input
            type="text"
            value="${escapeHtml(dialog.name)}"
            data-self-employment-project-rename-field="name"
            autofocus
          />
        </label>
        ${dialog.error ? `<div class="validation-box error">${escapeHtml(dialog.error)}</div>` : ""}
        <div class="button-row">
          <button class="button secondary" type="button" data-action="self-employment-cancel-project-rename">Abbrechen</button>
          <button class="button" type="button" data-action="self-employment-save-project-rename">Speichern</button>
        </div>
      </section>
    </div>
  `;
}
