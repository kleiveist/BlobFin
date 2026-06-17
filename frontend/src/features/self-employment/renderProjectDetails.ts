import { escapeHtml, intNumber, money, percent } from "../../lib/format";
import { positionIconSvg } from "../../lib/positionIcons";
import type { SelfEmploymentProject, SelfEmploymentRoadmapAreaId } from "../../types";
import type { IncomePlanningModel } from "../../domain/incomePlanning";
import {
  buildSelfEmploymentProjectWorkPlan,
  type SelfEmploymentProjectWorkPlan,
  type SelfEmploymentProjectWorkPlanTask
} from "../../domain/selfEmploymentGantt";
import { selfEmploymentUiState } from "./uiState";
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
  if (areaId === "tasks") return selfEmploymentTasksDashboard(project, workPlan);
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

function selfEmploymentTasksDashboard(project: SelfEmploymentProject, workPlan: SelfEmploymentProjectWorkPlan): string {
  const openTasks = workPlan.tasks.filter((task) => !task.completed);
  const doneTasks = workPlan.tasks.filter((task) => task.completed);
  const overdueTasks = openTasks.filter((task) => task.overdue);
  const priorityFilter = selfEmploymentUiState.taskPriorityFilter;
  const visibleTasks = priorityFilter === "all" ? workPlan.tasks : workPlan.tasks.filter((task) => task.priority === priorityFilter);
  return `
    <div class="self-employment-task-dashboard">
      <div class="self-employment-dashboard-metrics">
        ${selfEmploymentDashboardMetric("Offen", intNumber(openTasks.length), hoursLabel(workPlan.openHours))}
        ${selfEmploymentDashboardMetric("Erledigt", intNumber(doneTasks.length), hoursLabel(workPlan.completedHours))}
        ${selfEmploymentDashboardMetric("Ueberfaellig", intNumber(overdueTasks.length), overdueTasks.length ? "Handlungsbedarf" : "im Plan")}
        ${selfEmploymentDashboardMetric("Wochenkontingent", hoursLabel(workPlan.availableHoursPerWeek), workPlan.endDate ?? "kein Enddatum")}
      </div>
      ${workPlan.bottlenecks.length ? selfEmploymentBottlenecks(workPlan.bottlenecks) : ""}
      ${selfEmploymentPriorityRosette(workPlan, priorityFilter)}
      <section class="self-employment-dashboard-section self-employment-kanban-section">
        <header>
          <strong>Kanban Dashboard</strong>
          <span>${escapeHtml(`${intNumber(visibleTasks.length)} sichtbare Todos`)}</span>
        </header>
        <div class="self-employment-kanban-board">
          ${selfEmploymentKanbanColumn(project, "planned", "Geplant", visibleTasks)}
          ${selfEmploymentKanbanColumn(project, "in_progress", "In Arbeit", visibleTasks)}
          ${selfEmploymentKanbanColumn(project, "done", "Erledigt", visibleTasks)}
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
        ${selfEmploymentNeededWeeksMetric(workPlan)}
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
        ${selfEmploymentLabelTimeCharts(workPlan)}
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

function selfEmploymentNeededWeeksMetric(workPlan: SelfEmploymentProjectWorkPlan): string {
  if (workPlan.openHours <= 0) return selfEmploymentDashboardMetric("Benoetigte Wochen", "0 Wochen", "alles erledigt");
  if (workPlan.availableHoursPerWeek <= 0) {
    return selfEmploymentDashboardMetric("Benoetigte Wochen", "Nicht berechenbar", `${hoursLabel(workPlan.openHours)} offen`);
  }
  const weeks = Math.ceil((workPlan.openHours / workPlan.availableHoursPerWeek) * 10) / 10;
  return selfEmploymentDashboardMetric("Benoetigte Wochen", `${formatSelfEmploymentWeeks(weeks)} Wochen`, `${hoursLabel(workPlan.openHours)} offen`);
}

function formatSelfEmploymentWeeks(value: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value);
}

function selfEmploymentBottlenecks(items: string[]): string {
  return `
    <div class="self-employment-bottleneck-list">
      ${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function selfEmploymentPriorityRosette(
  workPlan: SelfEmploymentProjectWorkPlan,
  activeFilter: typeof selfEmploymentUiState.taskPriorityFilter
): string {
  const options: Array<{ value: typeof selfEmploymentUiState.taskPriorityFilter; label: string; className: string }> = [
    { value: "all", label: "Alle", className: "all" },
    { value: "high", label: "Hoch", className: "high" },
    { value: "medium", label: "Mittel", className: "medium" },
    { value: "low", label: "Niedrig", className: "low" }
  ];
  return `
    <section class="self-employment-dashboard-section self-employment-priority-panel">
      <header>
        <strong>Aufgaben nach Prioritaet</strong>
        <span>${escapeHtml(`${intNumber(workPlan.tasks.length)} Todos aus Karten`)}</span>
      </header>
      <div class="self-employment-priority-rosette" role="toolbar" aria-label="Aufgaben nach Prioritaet filtern">
        ${options
          .map((option) => {
            const count = option.value === "all" ? workPlan.tasks.length : workPlan.tasks.filter((task) => task.priority === option.value).length;
            const active = activeFilter === option.value;
            return `
              <button
                class="self-employment-priority-node ${option.className}${active ? " active" : ""}"
                type="button"
                data-action="self-employment-set-task-priority-filter"
                data-self-employment-task-priority-filter="${escapeHtml(option.value)}"
                aria-pressed="${active}"
              >
                <span>${escapeHtml(option.label)}</span>
                <strong>${escapeHtml(intNumber(count))}</strong>
              </button>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function selfEmploymentKanbanColumn(
  project: SelfEmploymentProject,
  status: SelfEmploymentProjectWorkPlanTask["status"],
  label: string,
  tasks: SelfEmploymentProjectWorkPlanTask[]
): string {
  const columnTasks = selfEmploymentSortKanbanTasks(tasks.filter((task) => task.status === status));
  return `
    <section class="self-employment-kanban-column" data-self-employment-kanban-status="${escapeHtml(status)}" aria-label="${escapeHtml(label)}">
      <header>
        <strong><span aria-hidden="true">${escapeHtml(selfEmploymentKanbanStatusIcon(status))}</span>${escapeHtml(label)}</strong>
        <span>${escapeHtml(intNumber(columnTasks.length))}</span>
      </header>
      <div class="self-employment-kanban-column-list">
        ${
          columnTasks.length
            ? columnTasks.map((task) => selfEmploymentKanbanTaskCard(project, task)).join("")
            : `<p class="self-employment-empty-note">Keine Todos</p>`
        }
      </div>
    </section>
  `;
}

function selfEmploymentKanbanStatusIcon(status: SelfEmploymentProjectWorkPlanTask["status"]): string {
  if (status === "in_progress") return "🟦";
  if (status === "done") return "✅";
  return "⬜";
}

function selfEmploymentKanbanTaskCard(project: SelfEmploymentProject, task: SelfEmploymentProjectWorkPlanTask): string {
  return `
    <article
      class="self-employment-task-dashboard-item${task.completed ? " completed" : ""}${task.overdue ? " overdue" : ""}"
      style="--self-employment-gantt-color:${escapeHtml(task.labelColor)};"
      draggable="true"
      data-self-employment-kanban-card="true"
      data-self-employment-project-id="${escapeHtml(project.id)}"
      data-self-employment-gantt-card-id="${escapeHtml(task.cardId)}"
      data-self-employment-gantt-todo-id="${escapeHtml(task.todoId)}"
      data-self-employment-kanban-status="${escapeHtml(task.status)}"
    >
      <div class="self-employment-task-dashboard-item-head">
        <span class="self-employment-task-label">${escapeHtml(task.labelName)}</span>
        <span class="self-employment-priority-pill ${escapeHtml(task.priority)}">${escapeHtml(selfEmploymentPriorityLabel(task.priority))}</span>
      </div>
      <strong>${escapeHtml(task.title)}</strong>
      <small>${escapeHtml(`${hoursLabel(task.hours)} · ${task.plannedDate ? selfEmploymentDateLabel(task.plannedDate) : "ohne Tagesplan"}`)}</small>
      <span>${escapeHtml(task.cardTitle)}</span>
      <div class="self-employment-kanban-card-actions" role="group" aria-label="Todo-Status setzen">
        ${selfEmploymentKanbanStatusButton(project, task, "planned", "Geplant")}
        ${selfEmploymentKanbanStatusButton(project, task, "in_progress", "In Arbeit")}
        ${selfEmploymentKanbanStatusButton(project, task, "done", "Erledigt")}
      </div>
    </article>
  `;
}

function selfEmploymentKanbanStatusButton(
  project: SelfEmploymentProject,
  task: SelfEmploymentProjectWorkPlanTask,
  status: SelfEmploymentProjectWorkPlanTask["status"],
  label: string
): string {
  const active = task.status === status;
  return `
    <button
      class="self-employment-kanban-status-button${active ? " active" : ""}"
      type="button"
      data-action="self-employment-set-kanban-status"
      data-self-employment-project-id="${escapeHtml(project.id)}"
      data-self-employment-gantt-card-id="${escapeHtml(task.cardId)}"
      data-self-employment-gantt-todo-id="${escapeHtml(task.todoId)}"
      data-self-employment-kanban-status="${escapeHtml(status)}"
      aria-pressed="${active}"
    >${escapeHtml(label)}</button>
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

function selfEmploymentLabelTimeCharts(workPlan: SelfEmploymentProjectWorkPlan): string {
  if (!workPlan.labelHours.length) return `<p class="self-employment-empty-note">Noch keine Kartenstunden vorhanden.</p>`;
  return `
    <div class="self-employment-label-chart-grid">
      <article class="self-employment-label-chart-card">
        <strong>Kreis</strong>
        ${selfEmploymentLabelDonutChart(workPlan)}
      </article>
      <article class="self-employment-label-chart-card">
        <strong>Balken</strong>
        <div class="self-employment-label-bar-chart">
          ${workPlan.labelHours.map((label) => selfEmploymentLabelBar(label, workPlan.totalHours)).join("")}
        </div>
      </article>
      <article class="self-employment-label-chart-card">
        <strong>Erledigt / Offen</strong>
        <div class="self-employment-label-progress-chart">
          ${workPlan.labelHours.map(selfEmploymentLabelProgressBar).join("")}
        </div>
      </article>
    </div>
  `;
}

function selfEmploymentLabelDonutChart(workPlan: SelfEmploymentProjectWorkPlan): string {
  const circumference = 100;
  let offset = 25;
  const circles = workPlan.labelHours
    .map((label) => {
      const share = workPlan.totalHours > 0 ? (label.totalHours / workPlan.totalHours) * circumference : 0;
      const circle = `
        <circle
          r="15.9"
          cx="20"
          cy="20"
          fill="none"
          stroke="${escapeHtml(label.labelColor)}"
          stroke-width="7"
          stroke-dasharray="${share} ${circumference - share}"
          stroke-dashoffset="${offset}"
        />`;
      offset -= share;
      return circle;
    })
    .join("");
  return `
    <div class="self-employment-label-donut">
      <svg viewBox="0 0 40 40" role="img" aria-label="Label-Zeitverteilung Kreisdiagramm">
        <circle r="15.9" cx="20" cy="20" fill="none" stroke="var(--surface-muted)" stroke-width="7" />
        ${circles}
      </svg>
      <div class="self-employment-label-donut-legend">
        ${workPlan.labelHours
          .map(
            (label) => `
              <span style="--self-employment-gantt-color:${escapeHtml(label.labelColor)};">
                <i></i>${escapeHtml(label.labelName)} ${escapeHtml(hoursLabel(label.totalHours))}
              </span>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function selfEmploymentLabelBar(label: SelfEmploymentProjectWorkPlan["labelHours"][number], totalHours: number): string {
  const width = totalHours > 0 ? Math.round((label.totalHours / totalHours) * 1000) / 10 : 0;
  return `
    <div class="self-employment-label-bar-row" style="--self-employment-gantt-color:${escapeHtml(label.labelColor)};">
      <span>${escapeHtml(label.labelName)}</span>
      <div><i style="width:${escapeHtml(width)}%;"></i></div>
      <strong>${escapeHtml(hoursLabel(label.totalHours))}</strong>
    </div>
  `;
}

function selfEmploymentLabelProgressBar(label: SelfEmploymentProjectWorkPlan["labelHours"][number]): string {
  const doneWidth = label.totalHours > 0 ? Math.round((label.completedHours / label.totalHours) * 1000) / 10 : 0;
  return `
    <div class="self-employment-label-progress-row" style="--self-employment-gantt-color:${escapeHtml(label.labelColor)};">
      <span>${escapeHtml(label.labelName)}</span>
      <div>
        <i class="done" style="width:${escapeHtml(doneWidth)}%;"></i>
        <i class="open" style="width:${escapeHtml(Math.max(0, 100 - doneWidth))}%;"></i>
      </div>
      <small>${escapeHtml(`${hoursLabel(label.completedHours)} / ${hoursLabel(label.openHours)}`)}</small>
    </div>
  `;
}

function selfEmploymentSortKanbanTasks(tasks: SelfEmploymentProjectWorkPlanTask[]): SelfEmploymentProjectWorkPlanTask[] {
  const priorityOrder: Record<SelfEmploymentProjectWorkPlanTask["priority"], number> = { high: 0, medium: 1, low: 2 };
  return [...tasks].sort((first, second) => {
    if (first.status === "planned" && second.status === "planned") {
      if (first.plannedDate && second.plannedDate && first.plannedDate !== second.plannedDate) return first.plannedDate.localeCompare(second.plannedDate);
      if (first.plannedDate !== second.plannedDate) return first.plannedDate ? -1 : 1;
    }
    const priorityDiff = priorityOrder[first.priority] - priorityOrder[second.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return first.title.localeCompare(second.title, "de");
  });
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
