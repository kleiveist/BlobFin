import { escapeHtml, intNumber, money, percent } from "../../lib/format";
import { positionIconSvg } from "../../lib/positionIcons";
import type { IncomePlanningState, SelfEmploymentProject, SelfEmploymentRoadmapAreaId } from "../../types";
import type { IncomePlanningModel } from "../../domain/incomePlanning";
import {
  SELF_EMPLOYMENT_EISENHOWER_QUADRANTS,
  buildSelfEmploymentProjectWorkPlan,
  normalizeSelfEmploymentGanttPlan,
  normalizedGanttLabelId,
  orderedGanttLabels,
  selfEmploymentEisenhowerQuadrantDetails,
  selfEmploymentEisenhowerQuadrantRank,
  selfEmploymentGanttLabelColor,
  type SelfEmploymentProjectWorkPlan,
  type SelfEmploymentProjectWorkPlanTask
} from "../../domain/selfEmploymentGantt";
import { selfEmploymentUiState } from "./uiState";
import { renderBusinessCanvas } from "./business-canvas";
import type { SelfEmploymentProjectEvaluation } from "./feasibilityController";
import {
  hoursLabel,
  selfEmploymentFeasibilityLabel,
  selfEmploymentPriorityLabel,
  selfEmploymentProjectTypeBenefitLabel,
  selfEmploymentProjectTypeLabel,
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
  incomePlanningModel: IncomePlanningModel,
  incomePlanningState?: IncomePlanningState
): string {
  const { project } = evaluation;
  const activeAreas = selfEmploymentActiveRoadmapAreas(project);
  const selectedArea = selfEmploymentRoadmapAreaIdFromValue(selectedRoadmapAreaId) ?? "idea";
  const activeArea = activeAreas.find((area) => area.id === selectedArea) ?? activeAreas[0] ?? SELF_EMPLOYMENT_ROADMAP_AREAS[0];
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
      ${selfEmploymentProjectControlPanel(project)}
      ${selfEmploymentRoadmap(activeArea.id, activeAreas)}
      <article class="self-employment-roadmap-panel">
        <header>
          <div class="self-employment-roadmap-panel-title">
            ${positionIconSvg(activeArea.icon, "position-icon-svg self-employment-roadmap-panel-icon")}
            <h3>${escapeHtml(activeArea.title)}</h3>
          </div>
          ${activeArea.id === "planning" ? renderSelfEmploymentGanttPhaseFilter(project) : ""}
        </header>
        ${selfEmploymentRoadmapPanel(activeArea.id, evaluation, incomePlanningModel, incomePlanningState)}
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

function selfEmploymentRoadmap(
  selectedArea: SelfEmploymentRoadmapAreaId,
  areas: typeof SELF_EMPLOYMENT_ROADMAP_AREAS
): string {
  return `
    <div class="self-employment-roadmap" aria-label="Projekt-Roadmap">
      ${areas.map((area) => {
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

function selfEmploymentActiveRoadmapAreas(project: SelfEmploymentProject): typeof SELF_EMPLOYMENT_ROADMAP_AREAS {
  return SELF_EMPLOYMENT_ROADMAP_AREAS.filter((area) => {
    if (area.id === "contacts") return project.enabledModules.contacts;
    if (area.id === "invoices") return project.enabledModules.invoices;
    if (area.id === "budget") return project.enabledModules.budget;
    if (area.id === "profit") return project.enabledModules.profit;
    if (area.id === "metrics") return project.enabledModules.metrics;
    return true;
  });
}

function selfEmploymentProjectControlPanel(project: SelfEmploymentProject): string {
  return `
    <section class="self-employment-project-control-panel" aria-label="Projektsteuerung">
      <div class="self-employment-edit-grid compact">
        ${selfEmploymentSelectField(project, "status", "Projektstatus", project.status, [
          ["open", "⚪ Offen"],
          ["in_progress", "🔵 In Arbeit"],
          ["completed", "✔️ Erledigt"],
          ["cancelled", "❌ Cancel"]
        ])}
        ${selfEmploymentSelectField(project, "projectType", "Projektart", project.projectType, [
          ["revenue", "Umsatzprojekt"],
          ["human_capital", "Humankapital-Projekt"],
          ["mandatory", "Pflichtprojekt"],
          ["strategic", "Strategisches Projekt"],
          ["private", "Privates Projekt"]
        ])}
        ${selfEmploymentSelectField(project, "priority", "Prioritaet", project.priority, [
          ["high", "Hoch"],
          ["medium", "Mittel"],
          ["low", "Niedrig"]
        ])}
        ${selfEmploymentReadOnlyField("Status-Zusammenfassung", `${selfEmploymentProjectTypeLabel(project.projectType)} · ${selfEmploymentPriorityLabel(project.priority)}`)}
      </div>
    </section>
  `;
}

function selfEmploymentRoadmapPanel(
  areaId: SelfEmploymentRoadmapAreaId,
  evaluation: SelfEmploymentProjectEvaluation,
  incomePlanningModel: IncomePlanningModel,
  incomePlanningState?: IncomePlanningState
): string {
  const { project } = evaluation;
  const workPlan = buildSelfEmploymentProjectWorkPlan(project, incomePlanningModel, new Date(), incomePlanningState);
  if (areaId === "idea") {
    return renderBusinessCanvas(project);
  }
  if (areaId === "planning") {
    return renderSelfEmploymentProjectGantt(project);
  }
  if (areaId === "contacts") return selfEmploymentContactsEditor(project);
  if (areaId === "invoices") return selfEmploymentBillingEditor(project);
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

function selfEmploymentSelectField(
  project: SelfEmploymentProject,
  field: string,
  label: string,
  value: string,
  options: Array<[string, string]>
): string {
  return `
    <label class="field self-employment-edit-field">
      <span>${escapeHtml(label)}</span>
      <select data-self-employment-project-id="${escapeHtml(project.id)}" data-self-employment-field="${escapeHtml(field)}">
        ${options
          .map(
            ([optionValue, optionLabel]) =>
              `<option value="${escapeHtml(optionValue)}" ${optionValue === value ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`
          )
          .join("")}
      </select>
    </label>
  `;
}

function selfEmploymentCheckboxField(
  project: SelfEmploymentProject,
  field: string,
  label: string,
  checked: boolean
): string {
  return `
    <label class="self-employment-check-field">
      <input
        type="checkbox"
        ${checked ? "checked" : ""}
        data-self-employment-project-id="${escapeHtml(project.id)}"
        data-self-employment-field="${escapeHtml(field)}"
      />
      <span>${escapeHtml(label)}</span>
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

function selfEmploymentBillingEditor(project: SelfEmploymentProject): string {
  const activeTab = selfEmploymentUiState.billingTabByProjectId[project.id] ?? "offers";
  return `
    <div class="self-employment-billing-editor">
      <div class="self-employment-billing-tabs" role="tablist" aria-label="Angebote und Rechnungen">
        ${selfEmploymentBillingTab(project, "offers", "Angebote", activeTab)}
        ${selfEmploymentBillingTab(project, "invoices", "Rechnungen", activeTab)}
      </div>
      ${activeTab === "invoices" ? selfEmploymentInvoiceTool(project) : selfEmploymentOffersEditor(project)}
    </div>
  `;
}

function selfEmploymentBillingTab(
  project: SelfEmploymentProject,
  tab: "offers" | "invoices",
  label: string,
  activeTab: "offers" | "invoices"
): string {
  const active = tab === activeTab;
  return `
    <button
      class="self-employment-billing-tab${active ? " active" : ""}"
      type="button"
      role="tab"
      data-action="self-employment-select-billing-tab"
      data-self-employment-project-id="${escapeHtml(project.id)}"
      data-self-employment-billing-tab="${escapeHtml(tab)}"
      aria-selected="${active}"
    >${escapeHtml(label)}</button>
  `;
}

function selfEmploymentOffersEditor(project: SelfEmploymentProject): string {
  const calculation = selfEmploymentOfferCalculation(project);
  return `
    <div class="self-employment-offer-editor" role="tabpanel" aria-label="Angebote">
      <div class="self-employment-edit-grid compact">
        ${selfEmploymentNumberField(project, "offerBaseHourlyRate", "Basis-Stundensatz EUR / h", project.offerSettings.baseHourlyRate, 0, 100000, 1)}
        ${selfEmploymentNumberField(project, "offerBufferPercent", "Puffer in %", project.offerSettings.bufferPercent, 0, 100, 1)}
        ${selfEmploymentNumberField(project, "offerTaxPercent", "Steuer in %", project.offerSettings.taxPercent, 0, 100, 1)}
      </div>
      <div class="self-employment-offer-option-grid">
        ${selfEmploymentCheckboxField(project, "offer.usePhaseFactors", "Phasenfaktoren verwenden", project.offerSettings.usePhaseFactors)}
        ${selfEmploymentCheckboxField(project, "offer.useLabelFactors", "Labelfaktoren verwenden", project.offerSettings.useLabelFactors)}
        ${selfEmploymentCheckboxField(project, "offer.useTodoTimes", "Todo-Zeiten verwenden", project.offerSettings.useTodoTimes)}
        ${selfEmploymentCheckboxField(project, "offer.useBuffer", "Puffer verwenden", project.offerSettings.useBuffer)}
        ${selfEmploymentCheckboxField(project, "offer.useRounding", "Rundung verwenden", project.offerSettings.useRounding)}
      </div>
      <div class="self-employment-dashboard-metrics">
        ${selfEmploymentDashboardMetric("Angebotsstunden", hoursLabel(calculation.totalHours), `${intNumber(calculation.lines.length)} Kartenpositionen`)}
        ${selfEmploymentDashboardMetric("Zwischensumme", money(calculation.subtotal), "vor Puffer und Steuer")}
        ${selfEmploymentDashboardMetric("Gesamt", money(calculation.total), `${money(calculation.tax)} Steuer`)}
      </div>
      ${selfEmploymentOfferTable(calculation)}
      <button class="button secondary" type="button" data-action="self-employment-toggle-offer-overview" data-self-employment-project-id="${escapeHtml(project.id)}">Angebotsuebersicht anzeigen</button>
      ${selfEmploymentUiState.offerOverviewProjectId === project.id ? selfEmploymentOfferOverviewPopup(project, calculation) : ""}
    </div>
  `;
}

function selfEmploymentInvoiceTool(project: SelfEmploymentProject): string {
  const calculation = selfEmploymentOfferCalculation(project);
  return `
    <div class="self-employment-collection-editor" role="tabpanel" aria-label="Rechnungen">
      <div class="self-employment-collection-head">
        <span>${project.invoices.length ? `${intNumber(project.invoices.length)} Rechnungen / Angebote` : "Noch keine Rechnungen"}</span>
        <button class="button mini secondary" type="button" data-action="self-employment-add-invoice" data-self-employment-project-id="${escapeHtml(
          project.id
        )}">Rechnung hinzufuegen</button>
      </div>
      <section class="self-employment-dashboard-section">
        <header>
          <strong>Angebot uebernehmen</strong>
          <span>${escapeHtml(`${hoursLabel(calculation.totalHours)} · ${money(calculation.total)}`)}</span>
        </header>
        ${selfEmploymentOfferTable(calculation)}
      </section>
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
                          ["draft", "Entwurf"],
                          ["open", "Offen"],
                          ["paid", "Bezahlt"],
                          ["cancelled", "Storniert"],
                          ["overdue", "Ueberfaellig"]
                        ])}
                        ${selfEmploymentCollectionTextField(project, "invoices", invoice.id, "dueDate", "Zieldatum", invoice.dueDate, "date")}
                        ${selfEmploymentCollectionNumberField(project, "invoices", invoice.id, "amount", "Betrag", invoice.amount, 0, 999999999, 50)}
                      </div>
                    </article>
                  `
                )
                .join("")
            : `<p class="self-employment-empty-note">Rechnungsposten koennen aus der Angebotskalkulation abgeleitet und hier gepflegt werden.</p>`
        }
      </div>
    </div>
  `;
}

interface SelfEmploymentOfferLine {
  cardId: string;
  title: string;
  phaseName: string;
  phaseFactor: number;
  labelName: string;
  labelFactor: number;
  hours: number;
  hourlyRate: number;
  total: number;
  warning: string | null;
}

interface SelfEmploymentOfferCalculation {
  lines: SelfEmploymentOfferLine[];
  totalHours: number;
  subtotal: number;
  buffer: number;
  tax: number;
  total: number;
}

function selfEmploymentOfferCalculation(project: SelfEmploymentProject): SelfEmploymentOfferCalculation {
  const gantt = normalizeSelfEmploymentGanttPlan(project.gantt, project.businessIdeaCanvas, project.businessIdeaCanvasMeta);
  const planByCardId = new Map(gantt.cardPlans.map((plan) => [plan.cardId, plan]));
  const labels = orderedGanttLabels(project.businessIdeaCanvasMeta);
  const labelById = new Map(labels.map((label) => [label.id, label]));
  const phases = [...project.businessIdeaCanvasMeta.phases].sort((first, second) => first.order - second.order);
  const phaseById = new Map(phases.map((phase) => [phase.id, phase]));
  const lines = project.businessIdeaCanvas.nodes
    .filter((node) => node.type !== "group")
    .map((node): SelfEmploymentOfferLine => {
      const plan = planByCardId.get(node.id);
      const nodeMeta = project.businessIdeaCanvasMeta.nodeMeta[node.id];
      const labelId = normalizedGanttLabelId(nodeMeta?.labelId ?? project.businessIdeaCanvasMeta.activeLabelId);
      const label = labelById.get(labelId) ?? labels[0] ?? { id: labelId, name: labelId };
      const phase = phaseById.get(nodeMeta?.phaseId ?? project.businessIdeaCanvasMeta.activePhaseId) ?? phases[0] ?? null;
      const hours = selfEmploymentOfferCardHours(plan?.timeBudgetHours ?? 0, plan?.todos.length ?? 0, project.offerSettings.useTodoTimes);
      const phaseFactor = project.offerSettings.usePhaseFactors ? selfEmploymentOfferPhaseFactor(phase?.name ?? "", phase?.order ?? 1) : 1;
      const labelFactor = project.offerSettings.useLabelFactors ? selfEmploymentOfferLabelFactor(label.id) : 1;
      const hourlyRate = project.offerSettings.baseHourlyRate * phaseFactor * labelFactor;
      return {
        cardId: node.id,
        title: selfEmploymentCanvasNodeTitle(node),
        phaseName: phase?.name ?? "Phase",
        phaseFactor,
        labelName: label.name,
        labelFactor,
        hours,
        hourlyRate,
        total: hours * hourlyRate,
        warning: hours > 0 ? null : "Zeit fehlt"
      };
    });
  const totalHours = lines.reduce((sum, line) => sum + line.hours, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.total, 0);
  const buffer = project.offerSettings.useBuffer ? subtotal * (project.offerSettings.bufferPercent / 100) : 0;
  const taxable = subtotal + buffer;
  const tax = taxable * (project.offerSettings.taxPercent / 100);
  const rawTotal = taxable + tax;
  const total = project.offerSettings.useRounding ? Math.round(rawTotal) : rawTotal;
  return { lines, totalHours, subtotal, buffer, tax, total };
}

function selfEmploymentOfferTable(calculation: SelfEmploymentOfferCalculation): string {
  return `
    <div class="self-employment-offer-table-wrap">
      <table class="self-employment-offer-table">
        <thead>
          <tr>
            <th>Karte</th>
            <th>Phase</th>
            <th>Label</th>
            <th>Stunden</th>
            <th>Satz</th>
            <th>Kosten</th>
          </tr>
        </thead>
        <tbody>
          ${
            calculation.lines.length
              ? calculation.lines.map(selfEmploymentOfferTableRow).join("")
              : `<tr><td colspan="6">Keine Kartenpositionen vorhanden.</td></tr>`
          }
        </tbody>
      </table>
    </div>
  `;
}

function selfEmploymentOfferTableRow(line: SelfEmploymentOfferLine): string {
  return `
    <tr class="${line.warning ? "warning" : ""}">
      <td><strong>${escapeHtml(line.title)}</strong>${line.warning ? `<small>${escapeHtml(line.warning)}</small>` : ""}</td>
      <td>${escapeHtml(`${line.phaseName} · ${formatSelfEmploymentFactor(line.phaseFactor)}`)}</td>
      <td>${escapeHtml(`${line.labelName} · ${formatSelfEmploymentFactor(line.labelFactor)}`)}</td>
      <td>${escapeHtml(hoursLabel(line.hours))}</td>
      <td>${money(line.hourlyRate)}</td>
      <td>${money(line.total)}</td>
    </tr>
  `;
}

function selfEmploymentOfferOverviewPopup(
  project: SelfEmploymentProject,
  calculation: SelfEmploymentOfferCalculation
): string {
  return `
    <div class="self-employment-offer-overview-popup" role="dialog" aria-label="Angebotsuebersicht">
      <header>
        <div>
          <span>Angebotsuebersicht</span>
          <strong>${escapeHtml(project.name)}</strong>
        </div>
        <button class="icon-button" type="button" data-action="self-employment-close-offer-overview" data-self-employment-project-id="${escapeHtml(project.id)}" aria-label="Angebotsuebersicht schliessen">x</button>
      </header>
      <div class="self-employment-dashboard-metrics">
        ${selfEmploymentDashboardMetric("Kunde", project.contacts[0]?.name || project.targetGroup || "Nicht gesetzt", "aus Kontakt/Zielgruppe")}
        ${selfEmploymentDashboardMetric("Basis-Stundensatz", `${money(project.offerSettings.baseHourlyRate)} / h`, `${escapeHtml(selfEmploymentProjectTypeBenefitLabel(project.projectType))}`)}
        ${selfEmploymentDashboardMetric("Zwischensumme", money(calculation.subtotal), `${hoursLabel(calculation.totalHours)} Gesamtzeit`)}
        ${selfEmploymentDashboardMetric("Puffer", money(calculation.buffer), `${project.offerSettings.useBuffer ? project.offerSettings.bufferPercent : 0} %`)}
        ${selfEmploymentDashboardMetric("Steuer", money(calculation.tax), `${project.offerSettings.taxPercent} %`)}
        ${selfEmploymentDashboardMetric("Gesamt", money(calculation.total), project.offerSettings.useRounding ? "gerundet" : "exakt")}
      </div>
      ${selfEmploymentOfferTable(calculation)}
    </div>
  `;
}

function selfEmploymentOfferPhaseFactor(phaseName: string, order: number): number {
  const phaseNumber = Number((phaseName.match(/\d+/)?.[0] ?? "").trim());
  const normalized = Number.isFinite(phaseNumber) && phaseNumber > 0 ? phaseNumber : order;
  if (normalized <= 1) return 0.7;
  if (normalized === 2) return 1;
  return 1.2;
}

function selfEmploymentOfferLabelFactor(labelId: string): number {
  if (labelId === "idea") return 0.8;
  if (labelId === "knowledge") return 0.9;
  if (labelId === "goal") return 1.3;
  return 1;
}

function selfEmploymentOfferCardHours(timeBudgetHours: number, todoCount: number, useTodoTimes: boolean): number {
  const safeHours = Math.max(0, timeBudgetHours);
  if (!useTodoTimes || todoCount <= 0) return safeHours;
  return (safeHours / todoCount) * todoCount;
}

function selfEmploymentCanvasNodeTitle(node: SelfEmploymentProject["businessIdeaCanvas"]["nodes"][number]): string {
  if (node.type === "text") return node.text.trim() || "Karte";
  if (node.type === "file") return node.file.trim() || "Datei";
  if (node.type === "link") return node.url.trim() || "Link";
  return "Karte";
}

function formatSelfEmploymentFactor(value: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(value);
}

function selfEmploymentTasksDashboard(project: SelfEmploymentProject, workPlan: SelfEmploymentProjectWorkPlan): string {
  const openTasks = workPlan.tasks.filter((task) => !task.completed);
  const doneTasks = workPlan.tasks.filter((task) => task.completed);
  const overdueTasks = openTasks.filter((task) => task.overdue);
  const visibleTasks = selfEmploymentFilteredKanbanTasks(workPlan.tasks);
  return `
    <div class="self-employment-task-dashboard">
      <div class="self-employment-dashboard-metrics">
        ${selfEmploymentDashboardMetric("Offen", intNumber(openTasks.length), hoursLabel(workPlan.openHours))}
        ${selfEmploymentDashboardMetric("Erledigt", intNumber(doneTasks.length), hoursLabel(workPlan.completedHours))}
        ${selfEmploymentDashboardMetric("Ueberfaellig", intNumber(overdueTasks.length), overdueTasks.length ? "Handlungsbedarf" : "im Plan")}
        ${selfEmploymentDashboardMetric("Wochenkontingent", hoursLabel(workPlan.availableHoursPerWeek), workPlan.endDate ?? "kein Enddatum")}
      </div>
      ${workPlan.bottlenecks.length ? selfEmploymentBottlenecks(workPlan.bottlenecks) : ""}
      ${selfEmploymentEisenhowerMatrix(workPlan)}
      ${selfEmploymentKanbanFilters(project, workPlan)}
      <section class="self-employment-dashboard-section self-employment-kanban-section">
        <header>
          <strong>Kanban Dashboard</strong>
          <span>${escapeHtml(`${intNumber(visibleTasks.length)} / ${intNumber(workPlan.tasks.length)} Todos`)}</span>
        </header>
        <div class="self-employment-kanban-board">
          ${selfEmploymentKanbanColumn(project, "planned", "Geplant", visibleTasks)}
          ${selfEmploymentKanbanColumn(project, "in_progress", "In Arbeit", visibleTasks)}
          ${selfEmploymentKanbanColumn(project, "done", "Erledigt", visibleTasks)}
        </div>
      </section>
      ${selfEmploymentTaskContextPopup(project, workPlan)}
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

function selfEmploymentEisenhowerMatrix(workPlan: SelfEmploymentProjectWorkPlan): string {
  const activeFilter = selfEmploymentUiState.taskEisenhowerFilter;
  const allActive = activeFilter === "all";
  return `
    <section class="self-employment-dashboard-section self-employment-eisenhower-panel">
      <header>
        <strong>Eisenhower-Modell</strong>
        <span>${escapeHtml(`${intNumber(workPlan.tasks.length)} Todos aus Karten`)}</span>
      </header>
      <div class="self-employment-eisenhower-toolbar">
        <button
          class="self-employment-eisenhower-filter all${allActive ? " active" : ""}"
          type="button"
          data-action="self-employment-set-task-eisenhower-filter"
          data-self-employment-task-eisenhower-filter="all"
          aria-pressed="${allActive}"
        >Alle</button>
      </div>
      <div class="self-employment-eisenhower-matrix" role="toolbar" aria-label="Eisenhower-Quadrant filtern">
        ${SELF_EMPLOYMENT_EISENHOWER_QUADRANTS.map((quadrant) => {
          const detail = selfEmploymentEisenhowerQuadrantDetails(quadrant);
          const count = workPlan.tasks.filter((task) => task.eisenhowerQuadrant === quadrant).length;
          const active = activeFilter === quadrant;
          return `
            <button
              class="self-employment-eisenhower-node ${escapeHtml(quadrant)}${active ? " active" : ""}"
              type="button"
              data-action="self-employment-set-task-eisenhower-filter"
              data-self-employment-task-eisenhower-filter="${escapeHtml(quadrant)}"
              aria-pressed="${active}"
            >
              <span>${escapeHtml(detail.label)}</span>
              <strong>${escapeHtml(intNumber(count))}</strong>
              <small>${escapeHtml(detail.action)}</small>
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function selfEmploymentKanbanFilters(project: SelfEmploymentProject, workPlan: SelfEmploymentProjectWorkPlan): string {
  const phaseIds = new Set(workPlan.tasks.map((task) => task.phaseId));
  const labelIds = new Set(workPlan.tasks.map((task) => task.labelId));
  const phases = [...project.businessIdeaCanvasMeta.phases].sort((first, second) => first.order - second.order).filter((phase) => phaseIds.has(phase.id));
  const labels = orderedGanttLabels(project.businessIdeaCanvasMeta).filter((label) => labelIds.has(label.id));
  return `
    <section class="self-employment-dashboard-section self-employment-kanban-filter-panel">
      <header>
        <strong>Kanban-Filter</strong>
        <span>${escapeHtml(selfEmploymentKanbanFilterSummary(workPlan))}</span>
      </header>
      <div class="self-employment-kanban-filter-groups">
        <div class="self-employment-kanban-filter-group">
          <span>Phasen</span>
          <div>
            ${phases.map((phase) => selfEmploymentKanbanPhaseFilterButton(phase.id, phase.name, workPlan)).join("")}
          </div>
        </div>
        <div class="self-employment-kanban-filter-group">
          <span>Labels</span>
          <div>
            ${labels.map((label) => selfEmploymentKanbanLabelFilterButton(label.id, label.name, workPlan)).join("")}
          </div>
        </div>
      </div>
    </section>
  `;
}

function selfEmploymentKanbanPhaseFilterButton(phaseId: string, phaseName: string, workPlan: SelfEmploymentProjectWorkPlan): string {
  const active = selfEmploymentUiState.kanbanPhaseFilterIds.includes(phaseId);
  const count = workPlan.tasks.filter((task) => task.phaseId === phaseId).length;
  return `
    <button
      class="self-employment-kanban-filter-chip${active ? " active" : ""}"
      type="button"
      data-action="self-employment-toggle-kanban-phase-filter"
      data-self-employment-kanban-phase-id="${escapeHtml(phaseId)}"
      aria-pressed="${active}"
    >${escapeHtml(`${phaseName} · ${intNumber(count)}`)}</button>
  `;
}

function selfEmploymentKanbanLabelFilterButton(labelId: string, labelName: string, workPlan: SelfEmploymentProjectWorkPlan): string {
  const active = selfEmploymentUiState.kanbanLabelFilterIds.includes(labelId);
  const count = workPlan.tasks.filter((task) => task.labelId === labelId).length;
  return `
    <button
      class="self-employment-kanban-filter-chip label${active ? " active" : ""}"
      style="--self-employment-gantt-color:${escapeHtml(selfEmploymentGanttLabelColor(labelId))};"
      type="button"
      data-action="self-employment-toggle-kanban-label-filter"
      data-self-employment-kanban-label-id="${escapeHtml(labelId)}"
      aria-pressed="${active}"
    >${escapeHtml(`${labelName} · ${intNumber(count)}`)}</button>
  `;
}

function selfEmploymentKanbanFilterSummary(workPlan: SelfEmploymentProjectWorkPlan): string {
  const availablePhaseIds = new Set(workPlan.tasks.map((task) => task.phaseId));
  const availableLabelIds = new Set(workPlan.tasks.map((task) => task.labelId));
  const phaseCount = selfEmploymentUiState.kanbanPhaseFilterIds.filter((id) => availablePhaseIds.has(id)).length;
  const labelCount = selfEmploymentUiState.kanbanLabelFilterIds.filter((id) => availableLabelIds.has(id)).length;
  const parts = [
    selfEmploymentUiState.taskEisenhowerFilter === "all" ? "" : "Eisenhower",
    phaseCount ? `${intNumber(phaseCount)} Phasen` : "",
    labelCount ? `${intNumber(labelCount)} Labels` : ""
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "keine Filter";
}

function selfEmploymentFilteredKanbanTasks(tasks: SelfEmploymentProjectWorkPlanTask[]): SelfEmploymentProjectWorkPlanTask[] {
  const availablePhaseIds = new Set(tasks.map((task) => task.phaseId));
  const availableLabelIds = new Set(tasks.map((task) => task.labelId));
  const phaseIds = new Set(selfEmploymentUiState.kanbanPhaseFilterIds.filter((id) => availablePhaseIds.has(id)));
  const labelIds = new Set(selfEmploymentUiState.kanbanLabelFilterIds.filter((id) => availableLabelIds.has(id)));
  return tasks.filter((task) => {
    if (selfEmploymentUiState.taskEisenhowerFilter !== "all" && task.eisenhowerQuadrant !== selfEmploymentUiState.taskEisenhowerFilter) return false;
    if (phaseIds.size && !phaseIds.has(task.phaseId)) return false;
    if (labelIds.size && !labelIds.has(task.labelId)) return false;
    return true;
  });
}

function selfEmploymentKanbanColumn(
  project: SelfEmploymentProject,
  status: SelfEmploymentProjectWorkPlanTask["status"],
  label: string,
  tasks: SelfEmploymentProjectWorkPlanTask[]
): string {
  const columnTasks = selfEmploymentSortKanbanTasks(tasks.filter((task) => task.status === status));
  return `
    <section
      class="self-employment-kanban-column"
      data-self-employment-project-id="${escapeHtml(project.id)}"
      data-self-employment-kanban-status="${escapeHtml(status)}"
      aria-label="${escapeHtml(label)}"
    >
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
  const selected =
    selfEmploymentUiState.kanbanSelectedCard?.projectId === project.id &&
    selfEmploymentUiState.kanbanSelectedCard.cardId === task.cardId &&
    selfEmploymentUiState.kanbanSelectedCard.todoId === task.todoId;
  return `
    <article
      class="self-employment-task-dashboard-item${selected ? " selected" : ""}${task.completed ? " completed" : ""}${task.overdue ? " overdue" : ""}"
      style="--self-employment-gantt-color:${escapeHtml(task.labelColor)};"
      draggable="true"
      data-self-employment-kanban-card="true"
      data-self-employment-project-id="${escapeHtml(project.id)}"
      data-self-employment-gantt-card-id="${escapeHtml(task.cardId)}"
      data-self-employment-gantt-todo-id="${escapeHtml(task.todoId)}"
      data-self-employment-kanban-todo-key="${escapeHtml(`${project.id}:${task.cardId}:${task.todoId}`)}"
      data-self-employment-kanban-status="${escapeHtml(task.status)}"
      data-self-employment-kanban-phase-id="${escapeHtml(task.phaseId)}"
      data-self-employment-kanban-label-id="${escapeHtml(task.labelId)}"
      data-self-employment-eisenhower-quadrant="${escapeHtml(task.eisenhowerQuadrant)}"
      aria-selected="${selected}"
    >
      <div class="self-employment-task-dashboard-item-head">
        <span class="self-employment-task-label">${escapeHtml(task.labelName)}</span>
        <span class="self-employment-eisenhower-badge ${escapeHtml(task.eisenhowerQuadrant)}">${escapeHtml(selfEmploymentEisenhowerQuadrantDetails(task.eisenhowerQuadrant).label)}</span>
      </div>
      <strong>${escapeHtml(task.title)}</strong>
      <small>${escapeHtml(`${hoursLabel(task.hours)} · ${task.plannedDate ? selfEmploymentDateLabel(task.plannedDate) : "ohne Tagesplan"}`)}</small>
      <span>${escapeHtml(`${task.eisenhowerActionLabel} · ${task.cardTitle}`)}</span>
      <div class="self-employment-eisenhower-card-actions" role="group" aria-label="Eisenhower-Quadrant setzen">
        ${SELF_EMPLOYMENT_EISENHOWER_QUADRANTS.map((quadrant) => selfEmploymentKanbanEisenhowerButton(project, task, quadrant)).join("")}
      </div>
      <div class="self-employment-kanban-card-actions" role="group" aria-label="Todo-Status setzen">
        ${selfEmploymentKanbanStatusButton(project, task, "planned", "Geplant")}
        ${selfEmploymentKanbanStatusButton(project, task, "in_progress", "In Arbeit")}
        ${selfEmploymentKanbanStatusButton(project, task, "done", "Erledigt")}
      </div>
    </article>
  `;
}

function selfEmploymentTaskContextPopup(project: SelfEmploymentProject, workPlan: SelfEmploymentProjectWorkPlan): string {
  const popup = selfEmploymentUiState.taskContextPopup;
  if (!popup || popup.projectId !== project.id) return "";
  const tasks = selfEmploymentSortKanbanTasks(workPlan.tasks.filter((task) => task.cardId === popup.cardId));
  if (!tasks.length) return "";
  const activeTask = tasks.find((task) => task.todoId === popup.todoId) ?? tasks[0];
  const title = activeTask?.cardTitle ?? "Aufgabenkarte";
  return `
    <div
      class="self-employment-task-context-popup"
      style="left:${escapeHtml(popup.left)}px;top:${escapeHtml(popup.top)}px;"
      role="dialog"
      aria-label="${escapeHtml(`${title} Todos`)}"
      data-self-employment-task-context-popup
    >
      <header>
        <div>
          <span>Aufgabenkarte</span>
          <strong>${escapeHtml(title)}</strong>
        </div>
        <button class="icon-button" type="button" data-action="self-employment-close-task-context-popup" aria-label="Todo-Popup schliessen">x</button>
      </header>
      <div class="self-employment-task-context-list">
        ${tasks.map((task) => selfEmploymentTaskContextPopupItem(project, task, task.todoId === popup.todoId)).join("")}
      </div>
    </div>
  `;
}

function selfEmploymentTaskContextPopupItem(
  project: SelfEmploymentProject,
  task: SelfEmploymentProjectWorkPlanTask,
  active: boolean
): string {
  return `
    <button
      class="self-employment-task-context-item${active ? " active" : ""}${task.completed ? " completed" : ""}${task.overdue ? " overdue" : ""}"
      type="button"
      data-action="self-employment-jump-kanban-todo"
      data-self-employment-project-id="${escapeHtml(project.id)}"
      data-self-employment-gantt-card-id="${escapeHtml(task.cardId)}"
      data-self-employment-gantt-todo-id="${escapeHtml(task.todoId)}"
      style="--self-employment-gantt-color:${escapeHtml(task.labelColor)};"
      aria-current="${active ? "true" : "false"}"
    >
      <span class="self-employment-task-context-status">${escapeHtml(task.status === "done" ? "Erledigt" : task.status === "in_progress" ? "In Arbeit" : "Geplant")}</span>
      <strong>${escapeHtml(task.title)}</strong>
      <small>${escapeHtml(`${hoursLabel(task.hours)} · ${task.plannedDate ? selfEmploymentDateLabel(task.plannedDate) : "ohne Tagesplan"}`)}</small>
    </button>
  `;
}

function selfEmploymentKanbanEisenhowerButton(
  project: SelfEmploymentProject,
  task: SelfEmploymentProjectWorkPlanTask,
  quadrant: SelfEmploymentProjectWorkPlanTask["eisenhowerQuadrant"]
): string {
  const detail = selfEmploymentEisenhowerQuadrantDetails(quadrant);
  const active = task.eisenhowerQuadrant === quadrant;
  return `
    <button
      class="self-employment-eisenhower-button ${escapeHtml(quadrant)}${active ? " active" : ""}"
      type="button"
      title="${escapeHtml(`${detail.label}: ${detail.action}`)}"
      data-action="self-employment-set-gantt-todo-eisenhower"
      data-self-employment-project-id="${escapeHtml(project.id)}"
      data-self-employment-gantt-card-id="${escapeHtml(task.cardId)}"
      data-self-employment-gantt-todo-id="${escapeHtml(task.todoId)}"
      data-self-employment-eisenhower-quadrant="${escapeHtml(quadrant)}"
      aria-pressed="${active}"
    >${escapeHtml(detail.shortLabel)}</button>
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
  return [...tasks].sort((first, second) => {
    const rankDiff = selfEmploymentEisenhowerQuadrantRank(first.eisenhowerQuadrant) - selfEmploymentEisenhowerQuadrantRank(second.eisenhowerQuadrant);
    if (rankDiff !== 0) return rankDiff;
    if (first.status === "planned" && second.status === "planned") {
      if (first.plannedDate && second.plannedDate && first.plannedDate !== second.plannedDate) return first.plannedDate.localeCompare(second.plannedDate);
      if (first.plannedDate !== second.plannedDate) return first.plannedDate ? -1 : 1;
    }
    return first.title.localeCompare(second.title, "de");
  });
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
