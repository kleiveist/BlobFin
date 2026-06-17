import { escapeHtml, intNumber, money, percent } from "../../lib/format";
import { positionIconSvg } from "../../lib/positionIcons";
import type { SelfEmploymentProject, SelfEmploymentRoadmapAreaId } from "../../types";
import type { IncomePlanningModel } from "../../domain/incomePlanning";
import {
  buildSelfEmploymentProjectWorkPlan,
  type SelfEmploymentProjectWorkPlan,
  type SelfEmploymentProjectWorkPlanTask
} from "../../domain/selfEmploymentGantt";
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
  selectedRoadmapAreaId: unknown,
  incomePlanningModel: IncomePlanningModel
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
        ${selfEmploymentRoadmapPanel(selectedArea, evaluation, incomePlanningModel)}
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
  evaluation: SelfEmploymentProjectEvaluation,
  incomePlanningModel: IncomePlanningModel
): string {
  const { project } = evaluation;
  const workPlan = buildSelfEmploymentProjectWorkPlan(project, incomePlanningModel);
  if (areaId === "idea") {
    return renderBusinessCanvas(project);
  }
  if (areaId === "planning") {
    return renderSelfEmploymentProjectGantt(project);
  }
  if (areaId === "contacts") return selfEmploymentContactsEditor(project);
  if (areaId === "invoices") return selfEmploymentInvoicesEditor(project);
  if (areaId === "tasks") return selfEmploymentTasksDashboard(workPlan);
  if (areaId === "time") {
    return selfEmploymentTimeDashboard(project, workPlan, evaluation);
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

function selfEmploymentTasksDashboard(workPlan: SelfEmploymentProjectWorkPlan): string {
  const openTasks = workPlan.tasks.filter((task) => !task.completed);
  const doneTasks = workPlan.tasks.filter((task) => task.completed);
  const overdueTasks = openTasks.filter((task) => task.overdue);
  return `
    <div class="self-employment-task-dashboard">
      <div class="self-employment-dashboard-metrics">
        ${selfEmploymentDashboardMetric("Offen", intNumber(openTasks.length), hoursLabel(workPlan.openHours))}
        ${selfEmploymentDashboardMetric("Erledigt", intNumber(doneTasks.length), hoursLabel(workPlan.completedHours))}
        ${selfEmploymentDashboardMetric("Ueberfaellig", intNumber(overdueTasks.length), overdueTasks.length ? "Handlungsbedarf" : "im Plan")}
        ${selfEmploymentDashboardMetric("Wochenkontingent", hoursLabel(workPlan.availableHoursPerWeek), workPlan.endDate ?? "kein Enddatum")}
      </div>
      ${workPlan.bottlenecks.length ? selfEmploymentBottlenecks(workPlan.bottlenecks) : ""}
      <section class="self-employment-dashboard-section">
        <header>
          <strong>Tagesplanung</strong>
          <span>${escapeHtml(workPlan.endDate ? `bis ${selfEmploymentDateLabel(workPlan.endDate)}` : "nicht berechenbar")}</span>
        </header>
        <div class="self-employment-workday-list">
          ${
            workPlan.days.length
              ? workPlan.days.map(selfEmploymentWorkPlanDay).join("")
              : `<p class="self-employment-empty-note">Keine Tagesplanung ohne offene Todos und Zeitkontingent.</p>`
          }
        </div>
      </section>
      <section class="self-employment-dashboard-section">
        <header>
          <strong>Aufgaben nach Prioritaet</strong>
          <span>${escapeHtml(`${intNumber(workPlan.tasks.length)} Todos aus Karten`)}</span>
        </header>
        <div class="self-employment-task-list">
          ${
            workPlan.tasks.length
              ? workPlan.tasks.map(selfEmploymentTaskDashboardItem).join("")
              : `<p class="self-employment-empty-note">Noch keine Karten-Todos vorhanden.</p>`
          }
        </div>
      </section>
    </div>
  `;
}

function selfEmploymentTimeDashboard(
  project: SelfEmploymentProject,
  workPlan: SelfEmploymentProjectWorkPlan,
  evaluation: SelfEmploymentProjectEvaluation
): string {
  return `
    <div class="self-employment-time-dashboard">
      <div class="self-employment-edit-grid">
        ${selfEmploymentTextField(project, "startDate", "Startdatum", project.startDate, "date")}
        ${selfEmploymentReadOnlyField("Errechnetes Enddatum", workPlan.endDate ? selfEmploymentDateLabel(workPlan.endDate) : "Nicht berechenbar")}
        ${selfEmploymentReadOnlyField("Verbleibende Tage", workPlan.remainingDays === null ? "Nicht berechenbar" : intNumber(workPlan.remainingDays))}
        ${selfEmploymentReadOnlyField("Freie Reserve / Woche", `${hoursLabel(evaluation.availableTimeHours)} / Woche`)}
      </div>
      <div class="self-employment-dashboard-metrics">
        ${selfEmploymentDashboardMetric("Projektfortschritt", percent(workPlan.progressPercent), `${hoursLabel(workPlan.completedHours)} erledigt`)}
        ${selfEmploymentDashboardMetric("Geplanter Fortschritt", percent(workPlan.plannedProgressPercent), "nach Startdatum")}
        ${selfEmploymentDashboardMetric("Gesamtstunden", hoursLabel(workPlan.totalHours), `${hoursLabel(workPlan.openHours)} offen`)}
        ${selfEmploymentDashboardMetric("Verfuegbar / Woche", hoursLabel(workPlan.availableHoursPerWeek), `${intNumber(workPlan.sources.filter((source) => source.selected).length)} Quellen`)}
        ${selfEmploymentDashboardMetric("Groesstes Label", workPlan.largestLabel?.labelName ?? "Keins", workPlan.largestLabel ? hoursLabel(workPlan.largestLabel.totalHours) : "0 h")}
        ${selfEmploymentDashboardMetric("Karten mit Aufwand", workPlan.largestCards[0]?.title ?? "Keine", workPlan.largestCards[0] ? hoursLabel(workPlan.largestCards[0].totalHours) : "0 h")}
      </div>
      ${workPlan.bottlenecks.length ? selfEmploymentBottlenecks(workPlan.bottlenecks) : ""}
      <section class="self-employment-dashboard-section">
        <header>
          <strong>Zeitquellen</strong>
          <span>${escapeHtml(workPlan.availableHoursPerWeek > 0 ? `${hoursLabel(workPlan.availableHoursPerWeek)} ausgewaehlt` : "keine Stunden ausgewaehlt")}</span>
        </header>
        <div class="self-employment-time-source-list">
          ${
            workPlan.sources.length
              ? workPlan.sources.map((source) => selfEmploymentTimeSource(project, source)).join("")
              : `<p class="self-employment-empty-note">Aktive Work- oder Habit-Zeitbloecke im Wochenplaner anlegen.</p>`
          }
        </div>
      </section>
      <section class="self-employment-dashboard-section">
        <header>
          <strong>Label-Zeitverteilung</strong>
          <span>${escapeHtml(hoursLabel(workPlan.totalHours))}</span>
        </header>
        <div class="self-employment-label-time-list">
          ${
            workPlan.labelHours.length
              ? workPlan.labelHours.map((label) => selfEmploymentLabelTimeRow(label, workPlan.totalHours)).join("")
              : `<p class="self-employment-empty-note">Noch keine Kartenstunden vorhanden.</p>`
          }
        </div>
      </section>
      <section class="self-employment-dashboard-section">
        <header>
          <strong>Groesste Karten</strong>
          <span>nach Aufwand</span>
        </header>
        <div class="self-employment-task-list">
          ${
            workPlan.largestCards.length
              ? workPlan.largestCards
                  .map(
                    (card) => `
                      <article class="self-employment-task-dashboard-item" style="--self-employment-gantt-color:${escapeHtml(card.labelColor)};">
                        <span class="self-employment-task-label">${escapeHtml(card.labelName)}</span>
                        <strong>${escapeHtml(card.title)}</strong>
                        <small>${escapeHtml(`${hoursLabel(card.totalHours)} · ${percent(card.progressPercent)}`)}</small>
                      </article>
                    `
                  )
                  .join("")
              : `<p class="self-employment-empty-note">Keine Karten mit Aufwand vorhanden.</p>`
          }
        </div>
      </section>
    </div>
  `;
}

function selfEmploymentDashboardMetric(label: string, value: string, detail: string): string {
  return `
    <article class="self-employment-dashboard-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>
  `;
}

function selfEmploymentBottlenecks(items: string[]): string {
  return `
    <div class="self-employment-bottleneck-list">
      ${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function selfEmploymentWorkPlanDay(day: SelfEmploymentProjectWorkPlan["days"][number]): string {
  return `
    <article class="self-employment-workday-card">
      <header>
        <strong>${escapeHtml(selfEmploymentDateLabel(day.date))}</strong>
        <span>${escapeHtml(`${hoursLabel(day.plannedHours)} / ${hoursLabel(day.capacityHours)}`)}</span>
      </header>
      <div class="self-employment-task-list compact">
        ${day.tasks.map(selfEmploymentTaskDashboardItem).join("")}
      </div>
    </article>
  `;
}

function selfEmploymentTaskDashboardItem(task: SelfEmploymentProjectWorkPlanTask): string {
  return `
    <article class="self-employment-task-dashboard-item${task.completed ? " completed" : ""}${task.overdue ? " overdue" : ""}" style="--self-employment-gantt-color:${escapeHtml(task.labelColor)};">
      <span class="self-employment-task-label">${escapeHtml(task.labelName)}</span>
      <strong>${escapeHtml(task.title)}</strong>
      <small>${escapeHtml(`${selfEmploymentPriorityLabel(task.priority)} · ${hoursLabel(task.hours)} · ${task.plannedDate ? selfEmploymentDateLabel(task.plannedDate) : "erledigt"}`)}</small>
      <span>${escapeHtml(task.cardTitle)}</span>
    </article>
  `;
}

function selfEmploymentTimeSource(
  project: SelfEmploymentProject,
  source: SelfEmploymentProjectWorkPlan["sources"][number]
): string {
  return `
    <label class="self-employment-time-source">
      <input
        type="checkbox"
        ${source.selected ? "checked" : ""}
        data-self-employment-project-id="${escapeHtml(project.id)}"
        data-self-employment-time-source-owner-type="${escapeHtml(source.ownerType)}"
        data-self-employment-time-source-owner-id="${escapeHtml(source.ownerId)}"
      />
      <span>
        <strong>${escapeHtml(source.name)}</strong>
        <small>${escapeHtml(`${source.ownerType === "work" ? "Work" : "Habit"} · ${hoursLabel(source.hoursPerWeek)} / Woche`)}</small>
      </span>
    </label>
  `;
}

function selfEmploymentLabelTimeRow(
  label: SelfEmploymentProjectWorkPlan["labelHours"][number],
  totalHours: number
): string {
  const width = totalHours > 0 ? Math.round((label.totalHours / totalHours) * 1000) / 10 : 0;
  return `
    <article class="self-employment-label-time-row" style="--self-employment-gantt-color:${escapeHtml(label.labelColor)};">
      <div>
        <strong>${escapeHtml(label.labelName)}</strong>
        <span>${escapeHtml(`${hoursLabel(label.completedHours)} erledigt · ${hoursLabel(label.openHours)} offen`)}</span>
      </div>
      <div class="self-employment-label-time-bar" aria-hidden="true">
        <span style="width:${escapeHtml(width)}%;"></span>
      </div>
      <small>${escapeHtml(`${hoursLabel(label.totalHours)} · ${width.toLocaleString("de-DE")} %`)}</small>
    </article>
  `;
}

function selfEmploymentPriorityLabel(priority: SelfEmploymentProjectWorkPlanTask["priority"]): string {
  if (priority === "high") return "Hoch";
  if (priority === "low") return "Niedrig";
  return "Mittel";
}

function selfEmploymentDateLabel(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return `${match[3]}.${match[2]}.${match[1]}`;
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
