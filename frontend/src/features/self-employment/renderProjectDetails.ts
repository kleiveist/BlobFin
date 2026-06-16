import { escapeHtml, intNumber, money } from "../../lib/format";
import { positionIconSvg } from "../../lib/positionIcons";
import type { SelfEmploymentProject, SelfEmploymentRoadmapAreaId } from "../../types";
import { renderBusinessCanvas } from "./business-canvas";
import type { SelfEmploymentProjectEvaluation } from "./feasibilityController";
import {
  hoursLabel,
  selfEmploymentFeasibilityLabel,
  selfEmploymentRoadmapAreaIdFromValue
} from "./feasibilityController";
import { SELF_EMPLOYMENT_ROADMAP_AREAS } from "./config";
import {
  renderSelfEmploymentProjectGantt,
  selfEmploymentGanttPhaseFilterIds,
  selfEmploymentGanttPhaseNumber
} from "./ganttController";

export function selfEmploymentProjectDetails(
  evaluation: SelfEmploymentProjectEvaluation,
  selectedRoadmapAreaId: unknown
): string {
  const { project } = evaluation;
  const selectedArea = selfEmploymentRoadmapAreaIdFromValue(selectedRoadmapAreaId) ?? "idea";
  const activeArea = SELF_EMPLOYMENT_ROADMAP_AREAS.find((area) => area.id === selectedArea) ?? SELF_EMPLOYMENT_ROADMAP_AREAS[0];
  return `
    <section class="self-employment-detail" aria-label="Projekt-Detailbereich">
      <div class="self-employment-detail-head">
        <div>
          <span class="planning-account-summary">Projekt: ${escapeHtml(project.name)}</span>
          <h2>${escapeHtml(project.idea || project.name)}</h2>
        </div>
        <span class="status-pill ${escapeHtml(evaluation.feasibility)}">${escapeHtml(
          selfEmploymentFeasibilityLabel(evaluation.feasibility)
        )}</span>
      </div>
      ${selfEmploymentRoadmap(selectedArea)}
      <article class="self-employment-roadmap-panel">
        <header>
          <div class="self-employment-roadmap-panel-title">
            ${positionIconSvg(activeArea.icon, "position-icon-svg self-employment-roadmap-panel-icon")}
            <h3>${escapeHtml(activeArea.title)}</h3>
          </div>
          ${selectedArea === "planning" ? renderSelfEmploymentGanttPhaseFilter(project) : ""}
        </header>
        ${selfEmploymentRoadmapPanel(selectedArea, evaluation)}
      </article>
    </section>
  `;
}

function renderSelfEmploymentGanttPhaseFilter(project: SelfEmploymentProject): string {
  const phases = [...project.businessIdeaCanvasMeta.phases].sort((a, b) => a.order - b.order);
  if (phases.length === 0) return "";
  const selectedIds = new Set(selfEmploymentGanttPhaseFilterIds(project));
  return `
    <div class="self-employment-gantt-phase-filter" role="toolbar" aria-label="Gantt-Phasen filtern">
      ${phases
        .map((phase) => {
          const active = selectedIds.has(phase.id);
          const phaseNumber = selfEmploymentGanttPhaseNumber(phase.id);
          return `
            <button
              class="self-employment-gantt-phase-filter-button${active ? " active" : ""}"
              type="button"
              data-action="self-employment-toggle-gantt-phase-filter"
              data-self-employment-project-id="${escapeHtml(project.id)}"
              data-self-employment-gantt-phase-id="${escapeHtml(phase.id)}"
              aria-pressed="${active}"
              aria-label="${escapeHtml(`${phase.name} ${active ? "ausblenden" : "anzeigen"}`)}"
              title="${escapeHtml(phase.name)}"
            >${escapeHtml(phaseNumber)}</button>
          `;
        })
        .join("")}
    </div>
  `;
}

function selfEmploymentRoadmap(selectedArea: SelfEmploymentRoadmapAreaId): string {
  return `
    <div class="self-employment-roadmap" aria-label="Projekt-Roadmap">
      ${SELF_EMPLOYMENT_ROADMAP_AREAS.map((area) => {
        const active = area.id === selectedArea;
        return `
          <button
            class="self-employment-roadmap-step${active ? " active" : ""}"
            type="button"
            data-action="self-employment-select-roadmap-area"
            data-self-employment-roadmap-area="${area.id}"
            aria-pressed="${active}"
          >
            ${positionIconSvg(area.icon, "position-icon-svg self-employment-roadmap-icon")}
            <span>${escapeHtml(area.title)}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function selfEmploymentRoadmapPanel(
  areaId: SelfEmploymentRoadmapAreaId,
  evaluation: SelfEmploymentProjectEvaluation
): string {
  const { project } = evaluation;
  if (areaId === "idea") {
    return renderBusinessCanvas(project);
  }
  if (areaId === "planning") {
    return renderSelfEmploymentProjectGantt(project);
  }
  if (areaId === "contacts") return selfEmploymentContactsEditor(project);
  if (areaId === "invoices") return selfEmploymentInvoicesEditor(project);
  if (areaId === "tasks") return selfEmploymentTasksEditor(project);
  if (areaId === "time") {
    return `
      <div class="self-employment-edit-grid">
        ${selfEmploymentNumberField(project, "requiredHoursPerWeek", "Projektzeit benoetigt / Woche", project.requiredHoursPerWeek, 0, 168, 0.5)}
        ${selfEmploymentReadOnlyField("Freie Reserve / Woche", `${hoursLabel(evaluation.availableTimeHours)} / Woche`)}
        ${selfEmploymentNumberField(project, "fixedProjectHoursPerWeek", "Feste Projektzeit / Woche", project.fixedProjectHoursPerWeek, 0, 168, 0.5)}
        ${selfEmploymentNumberField(project, "flexibleProjectHoursPerWeek", "Flexible Projektzeit / Woche", project.flexibleProjectHoursPerWeek, 0, 168, 0.5)}
        ${selfEmploymentListTextareaField(project, "linkedHabits", "Zugehoerige Habits", project.linkedHabits)}
        ${selfEmploymentListTextareaField(project, "blockingHabits", "Blockierende Habits", project.blockingHabits)}
        ${selfEmploymentTextField(project, "weekScenario", "Projekt-Szenario", project.weekScenario)}
        ${selfEmploymentReadOnlyField("Hinweis", evaluation.reasons[0])}
      </div>
    `;
  }
  if (areaId === "budget") {
    return `
      <div class="self-employment-edit-grid">
        ${selfEmploymentNumberField(project, "startCapitalRequired", "Benoetigtes Startkapital", project.startCapitalRequired, 0, 999999999, 50)}
        ${selfEmploymentNumberField(project, "availableReserveOverride", "Freie Ruecklage Override", project.availableReserveOverride ?? "", 0, 999999999, 50)}
        ${selfEmploymentReadOnlyField("Verfuegbare freie Ruecklage", money(evaluation.availableReserve))}
        ${selfEmploymentReadOnlyField("Offene Finanzierungsluecke", money(evaluation.fundingGap))}
        ${selfEmploymentNumberField(project, "oneTimeCosts", "Einmalige Kosten", project.oneTimeCosts, 0, 999999999, 50)}
      </div>
    `;
  }
  if (areaId === "profit") {
    return `
      <div class="self-employment-edit-grid">
        ${selfEmploymentNumberField(project, "monthlyRevenueExpected", "Umsatz / Monat", project.monthlyRevenueExpected, 0, 999999999, 50)}
        ${selfEmploymentNumberField(project, "monthlyRunningCosts", "Laufende Kosten", project.monthlyRunningCosts, 0, 999999999, 50)}
        ${selfEmploymentNumberField(project, "taxReservePercent", "Ruecklage/Steuer in %", project.taxReservePercent, 0, 100, 1)}
        ${selfEmploymentReadOnlyField("Gewinn vor Ruecklage", money(evaluation.monthlyProfitBeforeReserve))}
        ${selfEmploymentReadOnlyField("Freier Gewinn", money(evaluation.monthlyProfitAfterReserve))}
        ${selfEmploymentNumberField(project, "monthlyWorkHours", "Arbeitszeit / Monat", project.monthlyWorkHours, 0, 744, 1)}
        ${selfEmploymentReadOnlyField("Effektiver Stundenwert", money(evaluation.effectiveHourlyValue))}
      </div>
    `;
  }
  return `
    <div class="self-employment-edit-grid">
      ${selfEmploymentReadOnlyField("Machbarkeit", selfEmploymentFeasibilityLabel(evaluation.feasibility))}
      ${selfEmploymentReadOnlyField("Offene Rechnungen", money(evaluation.openInvoiceAmount))}
      ${selfEmploymentReadOnlyField("Offene Aufgabenzeit", hoursLabel(evaluation.openTaskHours))}
      ${selfEmploymentReadOnlyField("Bewertung", evaluation.reasons.join(" "))}
    </div>
  `;
}

function selfEmploymentTextField(
  project: SelfEmploymentProject,
  field: string,
  label: string,
  value: string,
  type = "text"
): string {
  return `
    <label class="field self-employment-edit-field">
      <span>${escapeHtml(label)}</span>
      <input type="${escapeHtml(type)}" value="${escapeHtml(value)}" data-self-employment-project-id="${escapeHtml(
        project.id
      )}" data-self-employment-field="${escapeHtml(field)}" />
    </label>
  `;
}

function selfEmploymentNumberField(
  project: SelfEmploymentProject,
  field: string,
  label: string,
  value: number | "",
  min: number,
  max: number,
  step: number
): string {
  return `
    <label class="field self-employment-edit-field">
      <span>${escapeHtml(label)}</span>
      <input type="number" min="${min}" max="${max}" step="${step}" value="${escapeHtml(value)}" data-self-employment-project-id="${escapeHtml(
        project.id
      )}" data-self-employment-field="${escapeHtml(field)}" />
    </label>
  `;
}

function selfEmploymentListTextareaField(
  project: SelfEmploymentProject,
  field: string,
  label: string,
  value: string[]
): string {
  return `
    <label class="field self-employment-edit-field wide">
      <span>${escapeHtml(label)}</span>
      <textarea rows="3" data-self-employment-project-id="${escapeHtml(project.id)}" data-self-employment-list-field="${escapeHtml(
        field
      )}">${escapeHtml(value.join("\n"))}</textarea>
    </label>
  `;
}

function selfEmploymentReadOnlyField(label: string, value: string): string {
  return `
    <div class="field self-employment-readonly-field">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function selfEmploymentContactsEditor(project: SelfEmploymentProject): string {
  return `
    <div class="self-employment-collection-editor">
      <div class="self-employment-collection-head">
        <span>${project.contacts.length ? `${intNumber(project.contacts.length)} Kontakte` : "Noch keine Kontakte"}</span>
        <button class="button mini secondary" type="button" data-action="self-employment-add-contact" data-self-employment-project-id="${escapeHtml(
          project.id
        )}">Kontakt hinzufuegen</button>
      </div>
      <div class="self-employment-collection-list">
        ${
          project.contacts.length
            ? project.contacts
                .map(
                  (contact) => `
                    <article class="self-employment-collection-item">
                      <header>
                        <strong>${escapeHtml(contact.name || "Kontakt")}</strong>
                        <button class="button mini danger" type="button" data-action="self-employment-remove-contact" data-self-employment-project-id="${escapeHtml(
                          project.id
                        )}" data-self-employment-item-id="${escapeHtml(contact.id)}">Loeschen</button>
                      </header>
                      <div class="self-employment-edit-grid compact">
                        ${selfEmploymentCollectionTextField(project, "contacts", contact.id, "name", "Name", contact.name)}
                        ${selfEmploymentCollectionSelectField(project, "contacts", contact.id, "status", "Status", contact.status, [
                          ["lead", "Lead"],
                          ["first_contact", "Erstkontakt"],
                          ["offer_sent", "Angebot gesendet"],
                          ["customer", "Kunde"],
                          ["paused", "Pausiert"]
                        ])}
                        ${selfEmploymentCollectionTextField(project, "contacts", contact.id, "lastContact", "Letzter Kontakt", contact.lastContact, "date")}
                        ${selfEmploymentCollectionTextField(project, "contacts", contact.id, "nextStep", "Naechster Schritt", contact.nextStep)}
                        ${selfEmploymentCollectionNumberField(project, "contacts", contact.id, "revenuePotential", "Potenzial", contact.revenuePotential, 0, 999999999, 50)}
                        ${selfEmploymentCollectionNumberField(project, "contacts", contact.id, "probabilityPercent", "Wahrscheinlichkeit in %", contact.probabilityPercent, 0, 100, 1)}
                      </div>
                    </article>
                  `
                )
                .join("")
            : `<p class="self-employment-empty-note">Kontaktliste fuer dieses Projekt anlegen</p>`
        }
      </div>
    </div>
  `;
}

function selfEmploymentInvoicesEditor(project: SelfEmploymentProject): string {
  return `
    <div class="self-employment-collection-editor">
      <div class="self-employment-collection-head">
        <span>${project.invoices.length ? `${intNumber(project.invoices.length)} Angebote / Rechnungen` : "Noch keine Angebote"}</span>
        <button class="button mini secondary" type="button" data-action="self-employment-add-invoice" data-self-employment-project-id="${escapeHtml(
          project.id
        )}">Angebot hinzufuegen</button>
      </div>
      <div class="self-employment-collection-list">
        ${
          project.invoices.length
            ? project.invoices
                .map(
                  (invoice) => `
                    <article class="self-employment-collection-item">
                      <header>
                        <strong>${escapeHtml(invoice.label || "Angebot / Rechnung")}</strong>
                        <button class="button mini danger" type="button" data-action="self-employment-remove-invoice" data-self-employment-project-id="${escapeHtml(
                          project.id
                        )}" data-self-employment-item-id="${escapeHtml(invoice.id)}">Loeschen</button>
                      </header>
                      <div class="self-employment-edit-grid compact">
                        ${selfEmploymentCollectionTextField(project, "invoices", invoice.id, "label", "Bezeichnung", invoice.label)}
                        ${selfEmploymentCollectionSelectField(project, "invoices", invoice.id, "status", "Status", invoice.status, [
                          ["offer_open", "Angebot offen"],
                          ["offer_accepted", "Angebot angenommen"],
                          ["invoice_created", "Rechnung erstellt"],
                          ["paid", "Bezahlt"]
                        ])}
                        ${selfEmploymentCollectionTextField(project, "invoices", invoice.id, "dueDate", "Zieldatum", invoice.dueDate, "date")}
                        ${selfEmploymentCollectionNumberField(project, "invoices", invoice.id, "amount", "Betrag", invoice.amount, 0, 999999999, 50)}
                      </div>
                    </article>
                  `
                )
                .join("")
            : `<p class="self-employment-empty-note">Offene Angebote und Rechnungen erscheinen hier</p>`
        }
      </div>
    </div>
  `;
}

function selfEmploymentTasksEditor(project: SelfEmploymentProject): string {
  return `
    <div class="self-employment-collection-editor">
      <div class="self-employment-collection-head">
        <span>${project.tasks.length ? `${intNumber(project.tasks.length)} Aufgaben` : "Noch keine Aufgaben"}</span>
        <button class="button mini secondary" type="button" data-action="self-employment-add-task" data-self-employment-project-id="${escapeHtml(
          project.id
        )}">Aufgabe hinzufuegen</button>
      </div>
      <div class="self-employment-collection-list">
        ${
          project.tasks.length
            ? project.tasks
                .map(
                  (task) => `
                    <article class="self-employment-collection-item">
                      <header>
                        <strong>${escapeHtml(task.title || "Aufgabe")}</strong>
                        <button class="button mini danger" type="button" data-action="self-employment-remove-task" data-self-employment-project-id="${escapeHtml(
                          project.id
                        )}" data-self-employment-item-id="${escapeHtml(task.id)}">Loeschen</button>
                      </header>
                      <div class="self-employment-edit-grid compact">
                        ${selfEmploymentCollectionTextField(project, "tasks", task.id, "title", "Titel", task.title)}
                        ${selfEmploymentCollectionSelectField(project, "tasks", task.id, "priority", "Prioritaet", task.priority, [
                          ["low", "Niedrig"],
                          ["medium", "Mittel"],
                          ["high", "Hoch"]
                        ])}
                        ${selfEmploymentCollectionTextField(project, "tasks", task.id, "dueDate", "Faelligkeit", task.dueDate, "date")}
                        ${selfEmploymentCollectionNumberField(project, "tasks", task.id, "estimatedHours", "Zeit in Stunden", task.estimatedHours, 0, 1000, 0.5)}
                        ${selfEmploymentCollectionSelectField(project, "tasks", task.id, "status", "Status", task.status, [
                          ["open", "Offen"],
                          ["in_progress", "In Arbeit"],
                          ["done", "Erledigt"]
                        ])}
                      </div>
                    </article>
                  `
                )
                .join("")
            : `<p class="self-employment-empty-note">Projektbezogene Aufgaben anlegen</p>`
        }
      </div>
    </div>
  `;
}

function selfEmploymentCollectionTextField(
  project: SelfEmploymentProject,
  collection: string,
  itemId: string,
  field: string,
  label: string,
  value: string,
  type = "text"
): string {
  return `
    <label class="field self-employment-edit-field">
      <span>${escapeHtml(label)}</span>
      <input type="${escapeHtml(type)}" value="${escapeHtml(value)}" data-self-employment-project-id="${escapeHtml(
        project.id
      )}" data-self-employment-collection="${escapeHtml(collection)}" data-self-employment-item-id="${escapeHtml(
        itemId
      )}" data-self-employment-item-field="${escapeHtml(field)}" />
    </label>
  `;
}

function selfEmploymentCollectionNumberField(
  project: SelfEmploymentProject,
  collection: string,
  itemId: string,
  field: string,
  label: string,
  value: number,
  min: number,
  max: number,
  step: number
): string {
  return `
    <label class="field self-employment-edit-field">
      <span>${escapeHtml(label)}</span>
      <input type="number" min="${min}" max="${max}" step="${step}" value="${value}" data-self-employment-project-id="${escapeHtml(
        project.id
      )}" data-self-employment-collection="${escapeHtml(collection)}" data-self-employment-item-id="${escapeHtml(
        itemId
      )}" data-self-employment-item-field="${escapeHtml(field)}" />
    </label>
  `;
}

function selfEmploymentCollectionSelectField(
  project: SelfEmploymentProject,
  collection: string,
  itemId: string,
  field: string,
  label: string,
  value: string,
  options: Array<[string, string]>
): string {
  return `
    <label class="field self-employment-edit-field">
      <span>${escapeHtml(label)}</span>
      <select data-self-employment-project-id="${escapeHtml(project.id)}" data-self-employment-collection="${escapeHtml(
        collection
      )}" data-self-employment-item-id="${escapeHtml(itemId)}" data-self-employment-item-field="${escapeHtml(field)}">
        ${options.map(([optionValue, optionLabel]) => selfEmploymentOption(optionValue, optionLabel, value)).join("")}
      </select>
    </label>
  `;
}

function selfEmploymentOption(value: string, label: string, selectedValue: string): string {
  return `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(label)}</option>`;
}
