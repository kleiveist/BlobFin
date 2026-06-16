import type { InvestmentSettings, PositionCostBreakdownItem, PositionTableFilterColumn, PositionTableFilterOperator, PositionTableView, ReservePosition } from "../../types";
import { clamp, escapeHtml, money, numberValue } from "../../lib/format";
import { createId, defaultInvestmentSettingsForNewAccount } from "../../data/defaults";
import { cssEscape } from "./runtimeDom";
import { defaultPositionIconForPosition, normalizePositionIcon, POSITION_ICONS, positionIconSvg } from "../../lib/positionIcons";
import { emptyPositionTableView, hasActivePositionTableView, positionTableColumnConfig, positionTableColumnsForMode, positionTableFilterChipLabel, positionTableLabelOptions, positionTableOperatorLabel, positionTableOperatorsForColumn, positionTableRows, positionTableSelectOptions, positionTableSortLabel } from "../../lib/positionTableView";
import { flowForType, isIncomePosition, isPositionType, payoutTypeForPositionTableSelection, positionCadencesForTableMode, positionFlow, positionMatchesTableCadence, type PositionTableCadence, positionTableMode, type PositionTableMode, typeForFlow, typeForPositionTableSelection } from "../../lib/positionKinds";
import { monthSelect, payoutSelect, positionIconSelect, positionTypeSelect } from "../../views/templates";
import { normalizePositionPlanningYear, planningYearOptions, positionPlanningYear, sanitizePlanningYearSelection } from "../../lib/planningYears";
import { type PositionFilterDraft, runtimeApi, runtimeHost } from "./hostContext";

export function normalizePayoutType(
  value: ReservePosition["payoutType"],
  flow: ReservePosition["flow"],
  type: ReservePosition["type"]
): ReservePosition["payoutType"] {
  if (value === "monthly" || value === "yearly" || value === "once") return value;
  if (value === "none" && flow === "income" && type === "incomeTemporary") return value;
  if (value === "none" && flow === "expense") return value;
  if (flow === "income" && type === "incomeYearly") return "yearly";
  return "monthly";
}

export function finiteIntegerInRange(value: unknown, min: number, max: number, fallback: number): number {
  return Math.round(clamp(finiteNumber(value, fallback), min, max));
}

export function finiteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function renderPositions(): void {
  renderPositionModeControls();
  normalizeCurrentPositionTableViewColumns();
  const sourcePositions = positionTableSourcePositions();
  const basePositions = sourcePositions.filter((position) => positionTableMode(position) === runtimeHost.selectedPositionMode);
  renderPositionTableControls(basePositions, sourcePositions);
  renderPositionTableHead();
  const body = document.querySelector<HTMLTableSectionElement>("#positionsBody");
  if (!body) return;

  const view = currentPositionTableView();
  const positions = positionTableRows(sourcePositions, runtimeHost.selectedPositionMode, view);
  const isFilteredOrSorted = hasActivePositionTableView(view);
  if (!basePositions.length) {
    body.innerHTML = `
      <tr>
        <td class="position-empty" colspan="${positionTableColumnCount(runtimeHost.selectedPositionMode, activePositionCadence())}">
          Noch keine ${positionModeEmptyLabel(runtimeHost.selectedPositionMode, activePositionCadence())} angelegt.
        </td>
      </tr>
    `;
    renderPositionIconPicker();
    return;
  }

  if (!positions.length) {
    body.innerHTML = `
      <tr>
        <td class="position-empty" colspan="${positionTableColumnCount(runtimeHost.selectedPositionMode, activePositionCadence())}">
          Keine Positionen fuer aktuelle Filter.
        </td>
      </tr>
    `;
    renderPositionIconPicker();
    return;
  }

  body.innerHTML = positions
    .map((position) => {
      const isIncome = isIncomePosition(position);
      const showTypeColumn = positionTableShowsTypeColumn(runtimeHost.selectedPositionMode);
      return `
        <tr data-position-row="${position.id}">
          <td class="reorder-cell">
            ${positionDragHandle(position.id, isFilteredOrSorted)}
          </td>
          <td class="check-cell"><input type="checkbox" data-position-id="${position.id}" data-position-field="active" ${
            position.active ? "checked" : ""
          } /></td>
          <td class="check-cell"><input type="checkbox" data-position-id="${position.id}" data-position-field="visible" ${
            position.visible ? "checked" : ""
          } /></td>
          <td class="label-cell">${positionIconSelect(position)}</td>
          <td class="planning-year-cell">${positionPlanningYearSelect(position)}</td>
          <td class="name-cell"><input class="name-input" value="${escapeHtml(position.name)}" data-position-id="${
            position.id
          }" data-position-field="name" /></td>
          ${showTypeColumn ? `<td>${positionTypeSelect(position)}</td>` : ""}
          <td>${positionAmountCell(position)}</td>
          ${isIncome ? incomeDateCells(position) : expenseDateCells(position)}
          <td>${payoutSelect(position)}</td>
          ${positionTableShowsPayoutMonthColumn(position) ? `<td>${monthSelect(position.id, "payoutMonth", position.payoutMonth)}</td>` : ""}
          <td class="day-cell"><input class="small-input day-input" type="number" min="1" max="31" step="1" value="${
            position.payoutDay
          }" data-position-id="${position.id}" data-position-field="payoutDay" /></td>
          ${
            isIncome
              ? ""
              : `
          <td class="check-cell interest-toggle-cell"><input type="checkbox" data-position-id="${position.id}" data-position-field="interestBearing" ${
                  position.payoutType !== "once" && position.interestBearing ? "checked" : ""
                } ${position.payoutType !== "once" ? "" : "disabled"} /></td>
          <td class="check-cell cashback-toggle-cell"><input type="checkbox" data-position-id="${position.id}" data-position-field="cashback" ${
                  position.type === "temporary" && position.cashback ? "checked" : ""
                } ${position.type === "temporary" ? "" : "disabled"} /></td>
          `
          }
          <td><button class="icon-button danger" type="button" data-action="remove-${position.id}" aria-label="Position entfernen">x</button></td>
        </tr>
      `;
    })
    .join("");

  for (const button of body.querySelectorAll<HTMLButtonElement>("button[data-action^='remove-']")) {
    button.addEventListener("click", () => {
      const id = button.dataset.action?.replace("remove-", "");
      if (!id) return;
      removePosition(id);
      runtimeApi.renderAll();
    });
  }
  renderPositionIconPicker();
}

function showPositionIconPicker(button: HTMLButtonElement): void {
  const positionId = button.dataset.positionId;
  if (!positionId) return;
  const rect = button.getBoundingClientRect();
  const panelWidth = 320;
  const panelHeight = 360;
  const left =
    rect.right + 12 + panelWidth <= window.innerWidth
      ? rect.right + 12
      : Math.max(12, rect.left - panelWidth - 12);
  const top = Math.max(12, Math.min(rect.top, window.innerHeight - panelHeight - 12));
  runtimeHost.positionIconPicker = { positionId, top, left };
  renderPositionIconPicker();
}

function hidePositionIconPicker(): void {
  runtimeHost.positionIconPicker = null;
  renderPositionIconPicker();
}

function selectPositionIcon(positionId: string, icon: string): void {
  if (!positionId || !icon) return;
  runtimeHost.state.positions = runtimeHost.state.positions.map((position) =>
    position.id === positionId ? { ...position, icon: normalizePositionIcon(icon, position.icon) } : position
  );
  runtimeHost.positionIconPicker = null;
  runtimeApi.renderAll();
}

function renderPositionIconPicker(): void {
  const picker = document.querySelector<HTMLDivElement>("#positionIconPicker");
  if (!picker) return;
  if (!runtimeHost.positionIconPicker) {
    picker.hidden = true;
    return;
  }

  const position = runtimeHost.state.positions.find((item) => item.id === runtimeHost.positionIconPicker?.positionId);
  if (!position) {
    picker.hidden = true;
    runtimeHost.positionIconPicker = null;
    return;
  }

  const currentIcon = normalizePositionIcon(position.icon);
  picker.style.top = `${runtimeHost.positionIconPicker.top}px`;
  picker.style.left = `${runtimeHost.positionIconPicker.left}px`;
  picker.innerHTML = `
    <div class="position-icon-picker-head">
      <span>Label auswaehlen</span>
      <button class="icon-button" type="button" data-action="close-position-icon-picker" aria-label="Labelauswahl schliessen">x</button>
    </div>
    <div class="position-icon-picker-grid">
      ${POSITION_ICONS.map((icon) => {
        const active = icon.id === currentIcon;
        return `
          <button
            class="position-icon-option ${active ? "active" : ""}"
            type="button"
            data-action="select-position-icon"
            data-position-id="${position.id}"
            data-position-icon="${icon.id}"
            aria-pressed="${active}"
            title="${escapeHtml(icon.label)}"
          >
            ${positionIconSvg(icon.id)}
            <span>${escapeHtml(icon.label)}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
  picker.hidden = false;
}

function openPositionCostDialog(positionId: string): void {
  const position = runtimeHost.state.positions.find((item) => item.id === positionId);
  if (!position || !positionCostBreakdownEligible(position)) return;
  runtimeHost.positionCostDialogId = positionId;
  if (!position.costBreakdown?.length) {
    runtimeHost.state.positions = runtimeHost.state.positions.map((item) =>
      item.id === positionId ? { ...item, costBreakdown: [emptyPositionCostBreakdownItem()] } : item
    );
  }
  runtimeApi.renderAll();
}

function closePositionCostDialog(): void {
  runtimeHost.positionCostDialogId = null;
  renderPositionCostDialog();
}

function renderPositionCostDialog(): void {
  const dialogRoot = document.querySelector<HTMLDivElement>("#positionCostDialogRoot");
  if (!dialogRoot) return;
  const position = runtimeHost.state.positions.find((item) => item.id === runtimeHost.positionCostDialogId);
  if (!position || !positionCostBreakdownEligible(position)) {
    dialogRoot.innerHTML = "";
    runtimeHost.positionCostDialogId = null;
    return;
  }

  const items = position.costBreakdown?.length ? position.costBreakdown : [emptyPositionCostBreakdownItem()];
  const total = positionCostBreakdownTotal(items);
  dialogRoot.innerHTML = `
    <div class="position-cost-dialog-backdrop" role="presentation">
      <div class="position-cost-dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(
        positionCostDialogTitle(position)
      )}">
        <div class="income-tax-dialog-head">
          <div>
            <strong>${escapeHtml(positionCostDialogTitle(position))}</strong>
            <span>${escapeHtml(position.name)} · ${escapeHtml(positionCadenceButtonLabel(position.payoutType))}</span>
          </div>
          <button class="chart-popup-close" type="button" data-action="close-position-cost-dialog" aria-label="Betragsdetails schliessen">x</button>
        </div>
        <div class="table-wrap">
          <table class="position-cost-table">
            <thead>
              <tr>
                <th>Position</th>
                <th>Betrag</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item) => positionCostBreakdownRow(position.id, item)).join("")}
            </tbody>
          </table>
        </div>
        <div class="position-cost-summary">
          <span>Summe</span>
          <strong data-position-cost-total="${escapeHtml(position.id)}">${total === null ? "-" : money(total)}</strong>
        </div>
        <div class="button-row">
          <button class="button secondary" type="button" data-action="add-position-cost-item" data-position-id="${escapeHtml(
            position.id
          )}">${escapeHtml(positionCostAddButtonLabel(position))}</button>
          <button class="button" type="button" data-action="close-position-cost-dialog">Fertig</button>
        </div>
      </div>
    </div>
  `;
}

function positionCostBreakdownRow(positionId: string, item: PositionCostBreakdownItem): string {
  return `
    <tr>
      <td>
        <input
          class="position-cost-name-input"
          value="${escapeHtml(item.name)}"
          data-position-cost-position-id="${escapeHtml(positionId)}"
          data-position-cost-item-id="${escapeHtml(item.id)}"
          data-position-cost-field="name"
          placeholder="z. B. Lebensunterhalt"
        />
      </td>
      <td>
        <input
          class="small-input amount-input"
          type="number"
          min="0"
          step="0.01"
          value="${item.amount === null ? "" : item.amount}"
          data-position-cost-position-id="${escapeHtml(positionId)}"
          data-position-cost-item-id="${escapeHtml(item.id)}"
          data-position-cost-field="amount"
        />
      </td>
      <td>
        <button
          class="icon-button danger"
          type="button"
          data-action="remove-position-cost-item"
          data-position-id="${escapeHtml(positionId)}"
          data-position-cost-item-id="${escapeHtml(item.id)}"
          aria-label="Kostenposition entfernen"
        >x</button>
      </td>
    </tr>
  `;
}

function positionCostDialogTitle(position: ReservePosition): string {
  return positionFlow(position) === "income" ? "Einnahmendetails" : "Kostenaufschluesselung";
}

function positionCostAddButtonLabel(position: ReservePosition): string {
  return positionFlow(position) === "income" ? "Einnahmeposition hinzufuegen" : "Kostenposition hinzufuegen";
}

function renderPositionCostDialogTotals(positionId: string): void {
  const position = runtimeHost.state.positions.find((item) => item.id === positionId);
  const value = document.querySelector<HTMLElement>(`[data-position-cost-total="${cssEscape(positionId)}"]`);
  if (!position || !value) return;
  const total = positionCostBreakdownTotal(position.costBreakdown);
  value.textContent = total === null ? "-" : money(total);
}

function emptyPositionCostBreakdownItem(): PositionCostBreakdownItem {
  return { id: createId(), name: "", amount: null };
}

function addPositionCostBreakdownItem(positionId: string): void {
  if (!positionId) return;
  runtimeHost.state.positions = runtimeHost.state.positions.map((position) => {
    if (position.id !== positionId || !positionCostBreakdownEligible(position)) return position;
    return {
      ...position,
      costBreakdown: [...(position.costBreakdown ?? []), emptyPositionCostBreakdownItem()]
    };
  });
  runtimeApi.renderAll();
}

function removePositionCostBreakdownItem(positionId: string, itemId: string): void {
  if (!positionId || !itemId) return;
  runtimeHost.state.positions = runtimeHost.state.positions.map((position) => {
    if (position.id !== positionId) return position;
    const costBreakdown = (position.costBreakdown ?? []).filter((item) => item.id !== itemId);
    const nextCostBreakdown =
      runtimeHost.positionCostDialogId === positionId && costBreakdown.length === 0
        ? [emptyPositionCostBreakdownItem()]
        : costBreakdown;
    return positionWithCostBreakdownAmount({ ...position, costBreakdown: nextCostBreakdown });
  });
  runtimeApi.renderAll();
}

function updatePositionCostBreakdownItem(positionId: string, itemId: string, field: string, value: string): void {
  if (!positionId || !itemId) return;
  runtimeHost.state.positions = runtimeHost.state.positions.map((position) => {
    if (position.id !== positionId) return position;
    const costBreakdown = (position.costBreakdown?.length ? position.costBreakdown : [emptyPositionCostBreakdownItem()]).map(
      (item) => {
        if (item.id !== itemId) return item;
        if (field === "name") return { ...item, name: value };
        if (field === "amount") {
          return { ...item, amount: value.trim() === "" ? null : Math.max(0, numberValue(value)) };
        }
        return item;
      }
    );
    return positionWithCostBreakdownAmount({ ...position, costBreakdown });
  });
}

function positionWithCostBreakdownAmount(position: ReservePosition): ReservePosition {
  const costBreakdown = normalizePositionCostBreakdown(position.costBreakdown);
  const total = positionCostBreakdownTotal(costBreakdown);
  return {
    ...position,
    amount: total === null ? position.amount : total,
    costBreakdown: costBreakdown.length ? costBreakdown : undefined
  };
}

function renderPositionModeControls(): void {
  for (const mode of ["income", "expense", "reserve", "savings"] as PositionTableMode[]) {
    const button = document.querySelector<HTMLButtonElement>(`[data-action='show-${mode}-positions']`);
    if (!button) continue;
    const active = runtimeHost.selectedPositionMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  const cadenceHost = document.querySelector<HTMLDivElement>("#positionCadenceSwitchHost");
  if (cadenceHost) {
    const cadences = positionCadencesForTableMode(runtimeHost.selectedPositionMode);
    const activeCadence = activePositionCadence();
    cadenceHost.innerHTML = cadences.length
      ? `
        <div class="position-cadence-label">Rhythmus</div>
        <div class="position-mode-switch position-cadence-switch" role="group" aria-label="${positionCadenceGroupLabel(
          runtimeHost.selectedPositionMode
        )}">
          ${cadences
            .map((cadence) => {
              const active = activeCadence === cadence;
              return `
                <button
                  class="position-mode-button ${active ? "active" : ""}"
                  type="button"
                  data-action="set-position-cadence-${cadence}"
                  aria-pressed="${active}"
                >${escapeHtml(positionCadenceButtonLabel(cadence))}</button>
              `;
            })
            .join("")}
        </div>
      `
      : "";
  }
  const addButton = document.querySelector<HTMLButtonElement>("#addPositionButton");
  if (addButton) {
    addButton.textContent = addPositionButtonLabel(runtimeHost.selectedPositionMode, activePositionCadence());
  }
}

function renderPositionTableControls(basePositions: ReservePosition[], sourcePositions: ReservePosition[]): void {
  const wrapper = document.querySelector<HTMLDivElement>("#positionTableControls");
  if (!wrapper) return;
  syncPositionFilterToggle();
  const view = currentPositionTableView();
  const draft = normalizedPositionFilterDraft();
  const cadence = activePositionCadence();
  const columns = positionTableColumnsForMode(runtimeHost.selectedPositionMode, cadence);
  const selectedConfig = positionTableColumnConfig(runtimeHost.selectedPositionMode, draft.column, cadence) ?? columns[0];
  const operators = positionTableOperatorsForColumn(runtimeHost.selectedPositionMode, selectedConfig.column, cadence);
  const options = positionTableSelectOptions(runtimeHost.selectedPositionMode, selectedConfig.column, sourcePositions);
  const labelOptions = positionTableLabelOptions(sourcePositions, runtimeHost.selectedPositionMode);
  const active = hasActivePositionTableView(view);
  const visibleCount = positionTableRows(sourcePositions, runtimeHost.selectedPositionMode, view).length;

  wrapper.innerHTML = `
    <div class="position-table-view-row">
      <div class="position-view-chips" aria-live="polite">
        ${view.filters.map(positionFilterChip).join("")}
        ${view.sort ? positionSortChip(view.sort) : ""}
      </div>
      <span class="position-view-count">${visibleCount} von ${basePositions.length}</span>
    </div>
    ${labelOptions.length ? positionLabelFilterRow(labelOptions, view.selectedLabels) : ""}
    ${
      runtimeHost.positionFilterPopupOpen
        ? `
    <div id="positionFilterPopup" class="position-filter-popup" role="dialog" aria-label="Positionsfilter">
      <div class="position-filter-popup-head">
        <strong>Filter</strong>
        <button class="chart-popup-close" type="button" data-action="close-position-filter" aria-label="Filter schliessen">x</button>
      </div>
      <div class="position-filter-builder">
        <label class="filter-field">
          <span>Spalte</span>
          <select data-position-filter-draft="column">
            ${columns
              .map(
                (column) =>
                  `<option value="${column.column}" ${column.column === selectedConfig.column ? "selected" : ""}>${escapeHtml(
                    column.label
                  )}</option>`
              )
              .join("")}
          </select>
        </label>
        <label class="filter-field operator">
          <span>Operator</span>
          <select data-position-filter-draft="operator">
            ${operators
              .map(
                (operator) =>
                  `<option value="${operator}" ${operator === draft.operator ? "selected" : ""}>${escapeHtml(
                    positionTableOperatorLabel(operator)
                  )}</option>`
              )
              .join("")}
          </select>
        </label>
        <label class="filter-field value">
          <span>Wert</span>
          ${positionFilterValueControl(selectedConfig.kind, draft.value, options)}
        </label>
        <button class="button secondary" type="button" data-action="add-position-filter">Filter setzen</button>
        <button class="button secondary" type="button" data-action="clear-position-table-view" ${
          active ? "" : "disabled"
        }>
          Zuruecksetzen
        </button>
      </div>
    </div>
        `
        : ""
    }
  `;
}

function positionLabelFilterRow(
  labels: Array<{ value: string; label: string }>,
  selectedLabels: string[]
): string {
  const selected = new Set(selectedLabels.map((label) => normalizePositionIcon(label)));
  return `
    <div class="position-label-filter-row" aria-label="Label-Schnellfilter">
      ${labels
        .map((label) => {
          const active = selected.has(label.value);
          return `
            <button
              class="position-label-filter-button ${active ? "active" : ""}"
              type="button"
              data-action="toggle-position-label-filter"
              data-position-label="${escapeHtml(label.value)}"
              aria-pressed="${active}"
              aria-label="Label ${escapeHtml(label.label)} ${active ? "deaktivieren" : "aktivieren"}"
              title="${escapeHtml(label.label)}"
            >
              ${positionIconSvg(label.value)}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function syncPositionFilterToggle(): void {
  const button = document.querySelector<HTMLButtonElement>("[data-action='toggle-position-filter']");
  if (!button) return;
  button.classList.toggle("active", runtimeHost.positionFilterPopupOpen);
  button.setAttribute("aria-expanded", String(runtimeHost.positionFilterPopupOpen));
}

function positionFilterValueControl(
  kind: "text" | "select" | "number",
  value: string,
  options: Array<{ value: string; label: string }>
): string {
  if (kind === "select") {
    return `
      <select data-position-filter-draft="value">
        <option value="">Auswaehlen</option>
        ${options
          .map(
            (option) =>
              `<option value="${escapeHtml(option.value)}" ${option.value === value ? "selected" : ""}>${escapeHtml(
                option.label
              )}</option>`
          )
          .join("")}
      </select>
    `;
  }

  if (kind === "number") {
    return `<input type="number" step="0.01" value="${escapeHtml(value)}" data-position-filter-draft="value" />`;
  }

  return `<input type="search" value="${escapeHtml(value)}" data-position-filter-draft="value" />`;
}

function positionFilterChip(filter: PositionTableView["filters"][number]): string {
  return `
    <button
      class="position-view-chip"
      type="button"
      data-action="remove-position-filter"
      data-filter-id="${escapeHtml(filter.id)}"
      aria-label="Filter entfernen: ${escapeHtml(positionTableFilterChipLabel(runtimeHost.selectedPositionMode, filter))}"
    >
      <span>${escapeHtml(positionTableFilterChipLabel(runtimeHost.selectedPositionMode, filter))}</span>
      <strong aria-hidden="true">x</strong>
    </button>
  `;
}

function positionSortChip(sort: NonNullable<PositionTableView["sort"]>): string {
  return `
    <button
      class="position-view-chip sort"
      type="button"
      data-action="clear-position-sort"
      aria-label="Sortierung entfernen: ${escapeHtml(positionTableSortLabel(runtimeHost.selectedPositionMode, sort))}"
    >
      <span>${escapeHtml(positionTableSortLabel(runtimeHost.selectedPositionMode, sort))}</span>
      <strong aria-hidden="true">x</strong>
    </button>
  `;
}

function renderPositionTableHead(): void {
  const head = document.querySelector<HTMLTableSectionElement>("#positionsHead");
  if (!head) return;
  const hideIncomeMonthRange = positionTableHidesIncomeMonthRange();
  const hideExpenseMonthRange = positionTableHidesExpenseMonthRange();
  const expenseOnce = runtimeHost.selectedPositionMode === "expense" && activePositionCadence() === "once";
  const savingsWithoutRhythm = runtimeHost.selectedPositionMode === "savings" && activePositionCadence() === "none";
  const dateHeaders =
    hideIncomeMonthRange || hideExpenseMonthRange
      ? ""
      : expenseOnce
      ? positionSortableHeader("payoutYear", "Abgangsjahr")
      : savingsWithoutRhythm
      ? [
          positionSortableHeader("payoutYear", "Jahr"),
          positionSortableHeader("startMonth", "Start"),
          positionSortableHeader("endMonth", "Ende")
        ].join("")
      : runtimeHost.selectedPositionMode === "savings"
      ? [
          positionSortableHeader(
            "payoutYear",
            '<span class="split-header">Fix-Start<span>Abgangsjahr</span></span>'
          ),
          positionSortableHeader(
            "startMonth",
            '<span class="split-header">Fix-Ende<span>Anfang Monat</span></span>'
          )
        ].join("")
      : [positionSortableHeader("startMonth", "Start"), positionSortableHeader("endMonth", "Ende")].join("");
  const timingLabel =
    runtimeHost.selectedPositionMode === "income" ? "Eingang" : runtimeHost.selectedPositionMode === "savings" ? "Transfer" : "Abgang";
  const monthLabel =
    runtimeHost.selectedPositionMode === "income"
      ? "Eingangsmonat"
      : runtimeHost.selectedPositionMode === "savings"
        ? "Transfermonat"
        : "Abgangsmonat";
  head.innerHTML = `
    <tr>
      <th class="reorder-col"></th>
      ${positionSortableHeader("active", "Aktiv", "check-col")}
      ${positionSortableHeader("visible", "View", "check-col")}
      ${positionSortableHeader("label", "Label", "label-col")}
      <th class="planning-year-col">Planung</th>
      ${positionSortableHeader("name", "Name", "name-col")}
      ${positionTableShowsTypeColumn(runtimeHost.selectedPositionMode) ? positionSortableHeader("type", "Art") : ""}
      ${positionSortableHeader("amount", "Betrag", "amount-col")}
      ${dateHeaders}
      ${runtimeHost.selectedPositionMode === "income" ? positionSortableHeader("payoutYear", "Jahr") : ""}
      ${positionSortableHeader("payoutType", timingLabel)}
      ${savingsWithoutRhythm ? "" : positionSortableHeader("payoutMonth", monthLabel)}
      ${positionSortableHeader("payoutDay", "Tag", "day-col")}
      ${
        runtimeHost.selectedPositionMode !== "income"
          ? `${positionSortableHeader("interestBearing", "Zins", "interest-toggle-col")}${positionSortableHeader(
              "cashback",
              "Cashb.",
              "cashback-toggle-col"
            )}`
          : ""
      }
      <th></th>
    </tr>
  `;
}

function positionSortableHeader(column: PositionTableFilterColumn, label: string, className = ""): string {
  const view = currentPositionTableView();
  const direction = view.sort?.column === column ? view.sort.direction : null;
  const ariaSort = direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none";
  const indicator = direction === "asc" ? "^" : direction === "desc" ? "v" : "";
  const classes = ["sortable-col", className].filter(Boolean).join(" ");
  return `
    <th class="${classes}" aria-sort="${ariaSort}">
      <button class="table-sort-button ${direction ? "active" : ""}" type="button" data-action="sort-position-table-${column}">
        <span>${label}</span>
        <span class="sort-indicator" aria-hidden="true">${indicator}</span>
      </button>
    </th>
  `;
}

function positionTableColumnCount(mode: PositionTableMode, cadence: PositionTableCadence | null = null): number {
  let count = 10;
  if (positionTableShowsTypeColumn(mode)) count += 1;
  if (mode === "income") count += cadence === null || cadence === "none" ? 3 : 1;
  else if (mode === "expense" && (cadence === "monthly" || cadence === "yearly")) count += 0;
  else if (mode === "expense" && cadence === "once") count += 1;
  else count += mode === "savings" && cadence === "none" ? 3 : 2;
  if (!(mode === "savings" && cadence === "none")) count += 1;
  if (mode !== "income") count += 2;
  return count;
}

function positionTableShowsTypeColumn(mode: PositionTableMode): boolean {
  return mode === "reserve";
}

function positionTableHidesIncomeMonthRange(): boolean {
  return runtimeHost.selectedPositionMode === "income" && activePositionCadence() !== "none";
}

function positionTableHidesExpenseMonthRange(): boolean {
  return runtimeHost.selectedPositionMode === "expense" && ["monthly", "yearly"].includes(String(activePositionCadence()));
}

function positionTableShowsPayoutMonthColumn(position: ReservePosition): boolean {
  return !(runtimeHost.selectedPositionMode === "savings" && position.type === "savings" && position.payoutType === "none");
}

function positionPlanningYearSelect(position: ReservePosition): string {
  const planningYear = positionPlanningYear(position);
  const startOption =
    position.payoutType === "once"
      ? ""
      : `<option value="start" ${planningYear === null ? "selected" : ""}>Start</option>`;
  return `
    <select class="planning-year-select" data-position-id="${escapeHtml(position.id)}" data-position-field="planningYear" aria-label="Planungsjahr">
      ${startOption}
      ${planningYearOptions(runtimeHost.state.settings.year)
        .map(
          (year) =>
            `<option value="${year}" ${planningYear === year ? "selected" : ""}>${year}</option>`
        )
        .join("")}
    </select>
  `;
}

function positionAmountCell(position: ReservePosition): string {
  if (!positionCostBreakdownEligible(position)) {
    return `<input class="small-input amount-input" type="number" min="0" step="0.01" value="${position.amount}" data-position-id="${position.id}" data-position-field="amount" />`;
  }

  const total = positionCostBreakdownTotal(position.costBreakdown);
  if (total !== null) {
    return `
      <button
        class="position-cost-button locked"
        type="button"
        data-action="open-position-cost-dialog-${escapeHtml(position.id)}"
        aria-haspopup="dialog"
        aria-label="Betragsdetails bearbeiten"
      >
        <strong>${money(total)}</strong>
        <span>Details</span>
      </button>
    `;
  }

  return `
    <div class="position-amount-detail-cell">
      <input class="small-input amount-input" type="number" min="0" step="0.01" value="${
        position.amount
      }" data-position-id="${position.id}" data-position-field="amount" />
      <button
        class="position-cost-mini-button"
        type="button"
        data-action="open-position-cost-dialog-${escapeHtml(position.id)}"
        aria-haspopup="dialog"
        aria-label="Betragsdetails bearbeiten"
      >Details</button>
    </div>
  `;
}

function positionCostBreakdownEligible(position: ReservePosition): boolean {
  const mode = positionTableMode(position);
  return (mode === "expense" || mode === "income") && runtimeHost.selectedPositionMode === mode && positionAllowsCostBreakdown(position);
}

function positionAllowsCostBreakdown(position: ReservePosition): boolean {
  return positionCostBreakdownAllowed(positionFlow(position), position.type, position.payoutType);
}

function positionCostBreakdownAllowed(
  flow: ReservePosition["flow"],
  type: ReservePosition["type"],
  payoutType: ReservePosition["payoutType"]
): boolean {
  if (flow === "expense" && type === "temporary") {
    return payoutType === "monthly" || payoutType === "yearly" || payoutType === "once";
  }
  return flow === "income" && type === "incomeTemporary" && payoutType === "once";
}

function positionCostBreakdownTotal(items: PositionCostBreakdownItem[] | undefined): number | null {
  if (!items?.some((item) => item.amount !== null)) return null;
  return items.reduce((sum, item) => sum + Math.max(0, Number(item.amount ?? 0)), 0);
}

function normalizePositionCostBreakdown(items: PositionCostBreakdownItem[] | undefined): PositionCostBreakdownItem[] {
  if (!items?.length) return [];
  return items.map((item) => ({
    id: String(item.id || createId()),
    name: String(item.name ?? ""),
    amount: item.amount === null || item.amount === undefined ? null : Math.max(0, Number(item.amount) || 0)
  }));
}

function positionDragHandle(positionId: string, locked: boolean): string {
  if (locked) {
    return `
      <button
        class="drag-handle disabled"
        type="button"
        disabled
        aria-label="Reihenfolge bei Filter oder Sortierung gesperrt"
        title="Filter oder Sortierung zuruecksetzen, um zu verschieben"
      >:::</button>
    `;
  }
  return `<button class="drag-handle" type="button" draggable="true" data-position-drag-id="${positionId}" aria-label="Position verschieben" title="Position verschieben">:::</button>`;
}

function currentPositionTableView(): PositionTableView {
  return runtimeHost.state.positionTableView[runtimeHost.selectedPositionMode] ?? emptyPositionTableView();
}

function normalizeCurrentPositionTableViewColumns(): void {
  const cadence = activePositionCadence();
  const availableColumns = new Set(
    positionTableColumnsForMode(runtimeHost.selectedPositionMode, cadence).map((config) => config.column)
  );
  updateCurrentPositionTableView((view) => ({
    ...view,
    filters: view.filters.filter((filter) => availableColumns.has(filter.column)),
    sort: view.sort && availableColumns.has(view.sort.column) ? view.sort : null
  }));
}

function updateCurrentPositionTableView(updater: (view: PositionTableView) => PositionTableView): void {
  runtimeHost.state = {
    ...runtimeHost.state,
    positionTableView: {
      ...runtimeHost.state.positionTableView,
      [runtimeHost.selectedPositionMode]: updater(currentPositionTableView())
    }
  };
}

function defaultPositionFilterDraft(mode: PositionTableMode): PositionFilterDraft {
  const column = positionTableColumnsForMode(mode).find((config) => config.column === "name")?.column ?? "name";
  return {
    column,
    operator: positionTableOperatorsForColumn(mode, column)[0],
    value: ""
  };
}

function normalizedPositionFilterDraft(): PositionFilterDraft {
  const draft = runtimeHost.positionFilterDrafts[runtimeHost.selectedPositionMode] ?? defaultPositionFilterDraft(runtimeHost.selectedPositionMode);
  const cadence = activePositionCadence();
  const config = positionTableColumnConfig(runtimeHost.selectedPositionMode, draft.column, cadence);
  const column = config ? draft.column : "name";
  const operators = positionTableOperatorsForColumn(runtimeHost.selectedPositionMode, column, cadence);
  const operator = operators.includes(draft.operator) ? draft.operator : operators[0];
  const normalized = { column, operator, value: draft.value };
  runtimeHost.positionFilterDrafts = {
    ...runtimeHost.positionFilterDrafts,
    [runtimeHost.selectedPositionMode]: normalized
  };
  return normalized;
}

function updatePositionFilterDraft(field: keyof PositionFilterDraft, value: string): void {
  const current = normalizedPositionFilterDraft();
  if (field === "column") {
    const column = value as PositionTableFilterColumn;
    const cadence = activePositionCadence();
    const nextColumn = positionTableColumnConfig(runtimeHost.selectedPositionMode, column, cadence) ? column : current.column;
    runtimeHost.positionFilterDrafts = {
      ...runtimeHost.positionFilterDrafts,
      [runtimeHost.selectedPositionMode]: {
        column: nextColumn,
        operator: positionTableOperatorsForColumn(runtimeHost.selectedPositionMode, nextColumn, cadence)[0],
        value: ""
      }
    };
    renderPositions();
    return;
  }

  if (field === "operator") {
    const operator = value as PositionTableFilterOperator;
    const operators = positionTableOperatorsForColumn(
      runtimeHost.selectedPositionMode,
      current.column,
      activePositionCadence()
    );
    runtimeHost.positionFilterDrafts = {
      ...runtimeHost.positionFilterDrafts,
      [runtimeHost.selectedPositionMode]: {
        ...current,
        operator: operators.includes(operator) ? operator : operators[0]
      }
    };
    return;
  }

  runtimeHost.positionFilterDrafts = {
    ...runtimeHost.positionFilterDrafts,
    [runtimeHost.selectedPositionMode]: { ...current, value }
  };
}

function addPositionTableFilter(): void {
  const draft = currentPositionFilterDraftFromControls();
  const value = String(draft.value).trim();
  if (!value) return;
  updateCurrentPositionTableView((view) => ({
    ...view,
    filters: [...view.filters, { id: createId(), column: draft.column, operator: draft.operator, value }]
  }));
  runtimeHost.positionFilterDrafts = {
    ...runtimeHost.positionFilterDrafts,
    [runtimeHost.selectedPositionMode]: { ...draft, value: "" }
  };
  renderPositions();
  runtimeApi.persistCurrentState();
}

function currentPositionFilterDraftFromControls(): PositionFilterDraft {
  const draft = normalizedPositionFilterDraft();
  const columnInput = document.querySelector<HTMLSelectElement>('[data-position-filter-draft="column"]');
  const operatorInput = document.querySelector<HTMLSelectElement>('[data-position-filter-draft="operator"]');
  const valueInput = document.querySelector<HTMLInputElement | HTMLSelectElement>('[data-position-filter-draft="value"]');
  const column = (columnInput?.value || draft.column) as PositionTableFilterColumn;
  const cadence = activePositionCadence();
  const nextColumn = positionTableColumnConfig(runtimeHost.selectedPositionMode, column, cadence) ? column : draft.column;
  const operators = positionTableOperatorsForColumn(runtimeHost.selectedPositionMode, nextColumn, cadence);
  const operator = (operatorInput?.value || draft.operator) as PositionTableFilterOperator;
  return {
    column: nextColumn,
    operator: operators.includes(operator) ? operator : operators[0],
    value: valueInput?.value ?? draft.value
  };
}

function removePositionTableFilter(filterId: string): void {
  updateCurrentPositionTableView((view) => ({
    ...view,
    filters: view.filters.filter((filter) => filter.id !== filterId)
  }));
  renderPositions();
  runtimeApi.persistCurrentState();
}

function clearPositionTableSort(): void {
  updateCurrentPositionTableView((view) => ({ ...view, sort: null }));
  renderPositions();
  runtimeApi.persistCurrentState();
}

function clearCurrentPositionTableView(): void {
  updateCurrentPositionTableView(() => emptyPositionTableView());
  renderPositions();
  runtimeApi.persistCurrentState();
}

function togglePositionLabelFilter(label: string): void {
  const normalizedLabel = normalizePositionIcon(label);
  updateCurrentPositionTableView((view) => {
    const selected = new Set(view.selectedLabels.map((item) => normalizePositionIcon(item)));
    if (selected.has(normalizedLabel)) selected.delete(normalizedLabel);
    else selected.add(normalizedLabel);
    return { ...view, selectedLabels: Array.from(selected) };
  });
  renderPositions();
  runtimeApi.persistCurrentState();
}

function togglePositionFilterPopup(): void {
  runtimeHost.positionFilterPopupOpen = !runtimeHost.positionFilterPopupOpen;
  renderPositions();
}

function hidePositionFilterPopup(): void {
  if (!runtimeHost.positionFilterPopupOpen) return;
  runtimeHost.positionFilterPopupOpen = false;
  renderPositions();
}

function togglePositionTableSort(column: PositionTableFilterColumn): void {
  if (!positionTableColumnConfig(runtimeHost.selectedPositionMode, column, activePositionCadence())) return;
  updateCurrentPositionTableView((view) => {
    if (view.sort?.column !== column) return { ...view, sort: { column, direction: "asc" } };
    if (view.sort.direction === "asc") return { ...view, sort: { column, direction: "desc" } };
    return { ...view, sort: null };
  });
  renderPositions();
  runtimeApi.persistCurrentState();
}

function activePositionCadence(): PositionTableCadence | null {
  if (runtimeHost.selectedPositionMode === "income") return runtimeHost.selectedIncomeCadence;
  if (runtimeHost.selectedPositionMode === "expense") return runtimeHost.selectedExpenseCadence;
  if (runtimeHost.selectedPositionMode === "reserve") return runtimeHost.selectedReserveCadence;
  if (runtimeHost.selectedPositionMode === "savings") return runtimeHost.selectedSavingsCadence;
  return null;
}

function positionCadenceButtonLabel(cadence: PositionTableCadence): string {
  if (cadence === "fixed") return "Fixbestand";
  if (cadence === "monthly") return "Monatlich";
  if (cadence === "yearly") return "Jaehrlich";
  if (cadence === "once") return "Einmalig";
  return "Ohne Rhythmus";
}

function positionCadenceGroupLabel(mode: PositionTableMode): string {
  if (mode === "income") return "Einnahmen-Rhythmus";
  if (mode === "reserve") return "Ruecklagen-Vorauswahl";
  if (mode === "savings") return "Sparen-Rhythmus";
  return "Ausgaben-Rhythmus";
}

function positionModeEmptyLabel(mode: PositionTableMode, cadence: PositionTableCadence | null = null): string {
  if (mode === "income") {
    if (cadence === "yearly") return "jaehrliche Einnahmen";
    if (cadence === "once") return "einmalige Einnahmen";
    if (cadence === "none") return "Einnahmen ohne Rhythmus";
    return "monatliche Einnahmen";
  }
  if (mode === "reserve") {
    if (cadence === "fixed") return "Fixbestaende";
    return "monatliche Ruecklagen";
  }
  if (mode === "savings") {
    if (cadence === "yearly") return "jaehrliche Sparpositionen";
    if (cadence === "once") return "einmalige Sparpositionen";
    if (cadence === "none") return "Sparpositionen ohne Rhythmus";
    return "monatliche Sparpositionen";
  }
  if (cadence === "yearly") return "jaehrliche Ausgaben";
  if (cadence === "once") return "einmalige Ausgaben";
  if (cadence === "none") return "Ausgaben ohne Rhythmus";
  return "monatliche Ausgaben";
}

function addPositionButtonLabel(mode: PositionTableMode, cadence: PositionTableCadence | null = null): string {
  if (mode === "income") {
    if (cadence === "yearly") return "Jaehrliche Einnahme hinzufuegen";
    if (cadence === "once") return "Einmalige Einnahme hinzufuegen";
    if (cadence === "none") return "Einnahme ohne Rhythmus hinzufuegen";
    return "Monatliche Einnahme hinzufuegen";
  }
  if (mode === "reserve") return cadence === "fixed" ? "Fixbestand hinzufuegen" : "Monatliche Ruecklage hinzufuegen";
  if (mode === "savings") {
    if (cadence === "yearly") return "Jaehrliche Sparposition hinzufuegen";
    if (cadence === "once") return "Einmalige Sparposition hinzufuegen";
    if (cadence === "none") return "Sparposition ohne Rhythmus hinzufuegen";
    return "Monatliche Sparposition hinzufuegen";
  }
  if (cadence === "yearly") return "Jaehrliche Ausgabe hinzufuegen";
  if (cadence === "once") return "Einmalige Ausgabe hinzufuegen";
  if (cadence === "none") return "Ausgabe ohne Rhythmus hinzufuegen";
  return "Monatliche Ausgabe hinzufuegen";
}

function newPositionName(mode: PositionTableMode, cadence: PositionTableCadence | null = null): string {
  if (mode === "income") {
    if (cadence === "yearly") return "Neue jaehrliche Einnahme";
    if (cadence === "once") return "Neue einmalige Einnahme";
    if (cadence === "none") return "Neue Einnahme ohne Rhythmus";
    return "Neue monatliche Einnahme";
  }
  if (mode === "reserve") return cadence === "fixed" ? "Neuer Fixbestand" : "Neue monatliche Ruecklage";
  if (mode === "savings") {
    if (cadence === "yearly") return "Neue jaehrliche Sparposition";
    if (cadence === "once") return "Neue einmalige Sparposition";
    if (cadence === "none") return "Neue Sparposition ohne Rhythmus";
    return "Neue monatliche Sparposition";
  }
  if (cadence === "yearly") return "Neue jaehrliche Ausgabe";
  if (cadence === "once") return "Neue einmalige Ausgabe";
  if (cadence === "none") return "Neue Ausgabe ohne Rhythmus";
  return "Neue monatliche Ausgabe";
}

function expenseDateCells(position: ReservePosition): string {
  if (position.type === "savings") return savingsDateCells(position);
  if (position.type === "fixed") return monthRangeDateCells(position);
  if (positionTableHidesExpenseMonthRange()) return "";

  if (position.payoutType === "once") {
    return `
      <td>
        <input class="small-input payout-year-input" type="number" min="2000" max="2200" step="1" value="${
          position.payoutYear
        }" data-position-id="${position.id}" data-position-field="payoutYear" />
      </td>
    `;
  }
  return monthRangeDateCells(position);
}

function monthRangeDateCells(position: ReservePosition): string {
  return `
    <td>${monthSelect(position.id, "startMonth", position.startMonth)}</td>
    <td>${monthSelect(position.id, "endMonth", position.endMonth)}</td>
  `;
}

function savingsDateCells(position: ReservePosition): string {
  if (position.payoutType === "none") {
    return `
      <td>
        <input class="small-input payout-year-input" type="number" min="2000" max="2200" step="1" value="${
          position.payoutYear
        }" data-position-id="${position.id}" data-position-field="payoutYear" />
      </td>
      <td>${monthSelect(position.id, "startMonth", position.startMonth)}</td>
      <td>${monthSelect(position.id, "endMonth", position.endMonth)}</td>
    `;
  }

  return `
    <td>
      <div class="date-detail-cell">
        <input class="small-input payout-year-input" type="number" min="2000" max="2200" step="1" value="${
          position.payoutYear
        }" data-position-id="${position.id}" data-position-field="payoutYear" />
      </div>
    </td>
    <td>
      <div class="date-detail-cell">
        ${monthSelect(position.id, "startMonth", position.startMonth)}
      </div>
    </td>
  `;
}

function incomeDateCells(position: ReservePosition): string {
  if (positionTableHidesIncomeMonthRange()) {
    return `
      <td>
        <input class="small-input payout-year-input" type="number" min="2000" max="2200" step="1" value="${
          position.payoutYear
        }" data-position-id="${position.id}" data-position-field="payoutYear" />
      </td>
    `;
  }

  const disabled = position.payoutType === "once";
  return `
    <td>${monthSelect(position.id, "startMonth", position.startMonth, disabled)}</td>
    <td>${monthSelect(position.id, "endMonth", position.endMonth, disabled)}</td>
    <td>
      <input class="small-input payout-year-input" type="number" min="2000" max="2200" step="1" value="${
        position.payoutYear
      }" data-position-id="${position.id}" data-position-field="payoutYear" />
    </td>
  `;
}

function updatePosition(id: string, field: keyof ReservePosition, value: string | boolean): void {
  runtimeHost.state.positions = runtimeHost.state.positions.map((position) => {
    if (position.id !== id) return position;
    const next: ReservePosition = { ...position };

    switch (field) {
      case "active":
        next.active = Boolean(value);
        break;
      case "visible":
        next.visible = Boolean(value);
        break;
      case "interestBearing":
        next.interestBearing = positionFlow(next) === "expense" && next.payoutType !== "once" && Boolean(value);
        break;
      case "cashback":
        next.cashback = positionFlow(next) === "expense" && next.type === "temporary" && Boolean(value);
        break;
      case "planningYear":
        next.planningYear = sanitizePlanningYearSelection(value, runtimeHost.state.settings.year);
        if (next.payoutType === "once") {
          const nextPlanningYear =
            next.planningYear ?? normalizePositionPlanningYear(next.payoutYear) ?? runtimeHost.state.settings.year;
          next.planningYear = nextPlanningYear;
          next.payoutYear = nextPlanningYear;
        }
        break;
      case "amount":
      case "startMonth":
      case "endMonth":
      case "payoutYear":
      case "payoutMonth":
      case "payoutDay":
        next[field] = numberValue(String(value));
        if (field === "payoutYear" && next.payoutType === "once") {
          next.planningYear = normalizePositionPlanningYear(next.payoutYear);
        }
        break;
      case "type":
        if (isPositionType(value)) {
          next.type = value;
          next.flow = flowForType(value);
          if (next.flow === "income") {
            next.interestBearing = false;
            next.cashback = false;
            if (value === "incomeMonthly") next.payoutType = "monthly";
            if (value === "incomeYearly") next.payoutType = "yearly";
          }
          if (next.flow === "expense" && next.type !== "temporary") next.cashback = false;
        }
        break;
      case "payoutType":
        if (value === "none" || value === "monthly" || value === "yearly" || value === "once") {
          next.payoutType = value;
          if (positionFlow(next) === "income" && value === "none") next.type = "incomeTemporary";
          if (next.payoutType === "once") {
            next.payoutYear =
              normalizePositionPlanningYear(next.planningYear) ?? Number(next.payoutYear || runtimeHost.state.settings.year);
            next.planningYear = normalizePositionPlanningYear(next.payoutYear);
            if (next.type !== "savings") {
              next.startMonth = next.payoutMonth;
              next.endMonth = next.payoutMonth;
            }
            next.interestBearing = false;
          }
        }
        break;
      case "name":
        next.name = String(value);
        break;
      case "icon":
        next.icon = normalizePositionIcon(value, defaultPositionIconForPosition(next));
        break;
      case "flow":
        if (value === "income" || value === "expense") {
          next.flow = value;
          next.type = value === "income" ? "incomeMonthly" : "temporary";
          next.icon = defaultPositionIconForPosition(next);
          next.interestBearing = false;
          next.cashback = false;
        }
        break;
      case "id":
        break;
    }

    if ((next.type !== "savings" || next.payoutType === "none") && next.startMonth > next.endMonth) {
      const startMonth = next.startMonth;
      next.startMonth = next.endMonth;
      next.endMonth = startMonth;
    }

    if (next.payoutType === "once") {
      const payoutYear = normalizePositionPlanningYear(next.payoutYear) ?? runtimeHost.state.settings.year;
      next.payoutYear = payoutYear;
      next.planningYear = payoutYear;
      if (next.type !== "savings") {
        next.startMonth = next.payoutMonth;
        next.endMonth = next.payoutMonth;
      }
      next.interestBearing = false;
    }

    if (positionFlow(next) === "income") {
      next.interestBearing = false;
      next.cashback = false;
      if (next.payoutType === "none") next.type = "incomeTemporary";
    }

    return sanitizePosition(next, runtimeHost.state.settings.year);
  });
}

function sanitizePosition(position: ReservePosition, fallbackYear: number): ReservePosition {
  const requestedFlow = positionFlow(position);
  const type = typeForFlow(position.type, requestedFlow);
  const flow = flowForType(type);
  const payoutType = normalizePayoutType(position.payoutType, flow, type);
  const payoutYear = finiteIntegerInRange(position.payoutYear, 2000, 2200, fallbackYear);
  const planningYear =
    payoutType === "once"
      ? normalizePositionPlanningYear(payoutYear)
      : normalizePositionPlanningYear(position.planningYear);
  const payoutMonth = finiteIntegerInRange(position.payoutMonth, 1, 12, 12);
  const costBreakdown = normalizePositionCostBreakdown(position.costBreakdown);
  const canUseCostBreakdown = positionCostBreakdownAllowed(flow, type, payoutType);
  const costBreakdownTotal = canUseCostBreakdown ? positionCostBreakdownTotal(costBreakdown) : null;
  let startMonth = finiteIntegerInRange(position.startMonth, 1, 12, 1);
  let endMonth = finiteIntegerInRange(position.endMonth, 1, 12, 12);

  if ((type !== "savings" || payoutType === "none") && startMonth > endMonth) {
    const previousStart = startMonth;
    startMonth = endMonth;
    endMonth = previousStart;
  }

  if (payoutType === "once" && type !== "savings") {
    startMonth = payoutMonth;
    endMonth = payoutMonth;
  }

  const isIncome = flow === "income";
  return {
    ...position,
    id: String(position.id || createId()),
    planningYear,
    flow,
    active: Boolean(position.active),
    visible: Boolean(position.visible),
    name: String(position.name || "Position"),
    icon: normalizePositionIcon(position.icon, defaultPositionIconForPosition({ ...position, flow, type })),
    type,
    amount: costBreakdownTotal === null ? Math.max(0, finiteNumber(position.amount, 0)) : costBreakdownTotal,
    startMonth,
    endMonth,
    payoutType,
    payoutYear,
    payoutMonth,
    payoutDay: finiteIntegerInRange(position.payoutDay, 1, 31, 31),
    interestBearing: !isIncome && payoutType !== "once" && Boolean(position.interestBearing),
    cashback: !isIncome && type === "temporary" && Boolean(position.cashback),
    costBreakdown: canUseCostBreakdown && costBreakdown.length ? costBreakdown : undefined
  };
}

function addPosition(): string {
  const cadence = activePositionCadence();
  const type = typeForPositionTableSelection(runtimeHost.selectedPositionMode, cadence);
  const payoutType = payoutTypeForPositionTableSelection(runtimeHost.selectedPositionMode, cadence);
  const flow = flowForType(type);
  const isIncome = flow === "income";
  const isOnce = payoutType === "once";
  const name = newPositionName(runtimeHost.selectedPositionMode, cadence);
  const payoutMonth = isIncome ? 1 : 12;
  const startMonth = isOnce ? payoutMonth : 1;
  const endMonth = isOnce ? payoutMonth : 12;
  const id = createId();
  const selectedPlanningYear = runtimeApi.activePlanningYear();
  const payoutYear = selectedPlanningYear ?? runtimeHost.state.settings.year;
  const planningYear = isOnce ? payoutYear : selectedPlanningYear;
  runtimeHost.state.positions = [
    ...runtimeHost.state.positions,
    {
      id,
      planningYear,
      flow,
      active: true,
      visible: true,
      name,
      icon: defaultPositionIconForPosition({ flow, type, name }),
      type,
      amount: 0,
      startMonth,
      endMonth,
      payoutType,
      payoutYear,
      payoutMonth,
      payoutDay: isIncome ? 1 : 14,
      interestBearing: false,
      cashback: false
    }
  ];
  runtimeApi.renderAll();

  window.setTimeout(() => {
    const inputs = document.querySelectorAll<HTMLInputElement>("#positionsBody .name-input");
    const lastInput = inputs[inputs.length - 1];
    lastInput?.focus();
    lastInput?.select();
  }, 0);

  return id;
}

function removePosition(id: string): void {
  const accountId = runtimeApi.activePlanningAccount().id;
  runtimeHost.state.positions = runtimeHost.state.positions.filter((position) => position.id !== id);
  const settings = runtimeHost.state.investmentByAccountId[accountId] ?? defaultInvestmentSettingsForNewAccount();
  const nextSettings: InvestmentSettings = {
    ...settings,
    includedIds: settings.includedIds.filter((item) => item !== id),
    retirementIncludedIds: settings.retirementIncludedIds.filter((item) => item !== id),
    childIncludedIds: settings.childIncludedIds.filter((item) => item !== id)
  };
  runtimeHost.state.investmentByAccountId = {
    ...runtimeHost.state.investmentByAccountId,
    [accountId]: nextSettings
  };
  if (runtimeHost.state.ui.selectedInvestmentAccountId === accountId) {
    runtimeHost.state.investment = nextSettings;
  }
  runtimeHost.state.realEstate = {
    ...runtimeHost.state.realEstate,
    equityCapitalSourceIds: runtimeHost.state.realEstate.equityCapitalSourceIds.filter((item) => item !== id),
    monthlyPaymentSourceIds: runtimeHost.state.realEstate.monthlyPaymentSourceIds.filter((item) => item !== id),
    specialRepaymentSourceIds: runtimeHost.state.realEstate.specialRepaymentSourceIds.filter((item) => item !== id)
  };
  runtimeHost.state.combinedWealth = {
    ...runtimeHost.state.combinedWealth,
    cashPositionIds: runtimeHost.state.combinedWealth.cashPositionIds.filter((item) => item !== id)
  };
}

function setSelectedPositionMode(mode: PositionTableMode): void {
  runtimeHost.selectedPositionMode = mode;
  renderPositions();
}

function setSelectedPlanningYear(value: string): void {
  runtimeHost.state.ui = {
    ...runtimeHost.state.ui,
    selectedPlanningYear: sanitizePlanningYearSelection(value, runtimeHost.state.settings.year)
  };
  runtimeHost.positionCostDialogId = null;
  runtimeApi.renderAll();
}

function setSelectedPositionCadence(cadence: PositionTableCadence): void {
  const cadences = positionCadencesForTableMode(runtimeHost.selectedPositionMode);
  if (!cadences.includes(cadence)) return;
  if (runtimeHost.selectedPositionMode === "income") runtimeHost.selectedIncomeCadence = cadence;
  if (runtimeHost.selectedPositionMode === "expense") runtimeHost.selectedExpenseCadence = cadence;
  if (runtimeHost.selectedPositionMode === "reserve") runtimeHost.selectedReserveCadence = cadence;
  if (runtimeHost.selectedPositionMode === "savings") runtimeHost.selectedSavingsCadence = cadence;
  renderPositions();
}

function positionTableSourcePositions(): ReservePosition[] {
  const cadence = activePositionCadence();
  const positions: ReservePosition[] = runtimeApi.activePlanningPositions();
  return positions.filter((position) => {
    if (positionTableMode(position) !== runtimeHost.selectedPositionMode) return false;
    return positionMatchesTableCadence(position, runtimeHost.selectedPositionMode, cadence);
  });
}

function reorderPosition(sourceId: string, targetId: string, afterTarget: boolean): void {
  if (sourceId === targetId) return;

  const moved = runtimeHost.state.positions.find((position) => position.id === sourceId);
  if (!moved) return;

  const withoutMoved = runtimeHost.state.positions.filter((position) => position.id !== sourceId);
  const targetIndex = withoutMoved.findIndex((position) => position.id === targetId);
  if (targetIndex < 0) return;

  const insertIndex = afterTarget ? targetIndex + 1 : targetIndex;
  withoutMoved.splice(insertIndex, 0, moved);
  runtimeHost.state.positions = withoutMoved;
}

function clearDragState(): void {
  runtimeHost.draggedPositionId = null;
  for (const row of runtimeHost.root.querySelectorAll("tr.dragging, tr.drag-over")) {
    row.classList.remove("dragging", "drag-over");
  }
}

export function configurePositionTableRuntime(): void {
  Object.assign(runtimeApi, {
    renderPositions,
    showPositionIconPicker,
    hidePositionIconPicker,
    selectPositionIcon,
    renderPositionIconPicker,
    openPositionCostDialog,
    closePositionCostDialog,
    renderPositionCostDialog,
    positionCostBreakdownRow,
    positionCostDialogTitle,
    positionCostAddButtonLabel,
    renderPositionCostDialogTotals,
    emptyPositionCostBreakdownItem,
    addPositionCostBreakdownItem,
    removePositionCostBreakdownItem,
    updatePositionCostBreakdownItem,
    positionWithCostBreakdownAmount,
    renderPositionModeControls,
    renderPositionTableControls,
    positionLabelFilterRow,
    syncPositionFilterToggle,
    positionFilterValueControl,
    positionFilterChip,
    positionSortChip,
    renderPositionTableHead,
    positionSortableHeader,
    positionTableColumnCount,
    positionTableShowsTypeColumn,
    positionTableHidesIncomeMonthRange,
    positionTableHidesExpenseMonthRange,
    positionTableShowsPayoutMonthColumn,
    positionPlanningYearSelect,
    positionAmountCell,
    positionCostBreakdownEligible,
    positionAllowsCostBreakdown,
    positionCostBreakdownAllowed,
    positionCostBreakdownTotal,
    normalizePositionCostBreakdown,
    positionDragHandle,
    currentPositionTableView,
    normalizeCurrentPositionTableViewColumns,
    updateCurrentPositionTableView,
    defaultPositionFilterDraft,
    normalizedPositionFilterDraft,
    updatePositionFilterDraft,
    addPositionTableFilter,
    currentPositionFilterDraftFromControls,
    removePositionTableFilter,
    clearPositionTableSort,
    clearCurrentPositionTableView,
    togglePositionLabelFilter,
    togglePositionFilterPopup,
    hidePositionFilterPopup,
    togglePositionTableSort,
    activePositionCadence,
    positionCadenceButtonLabel,
    positionCadenceGroupLabel,
    positionModeEmptyLabel,
    addPositionButtonLabel,
    newPositionName,
    expenseDateCells,
    monthRangeDateCells,
    savingsDateCells,
    incomeDateCells,
    updatePosition,
    sanitizePosition,
    addPosition,
    removePosition,
    setSelectedPositionMode,
    setSelectedPlanningYear,
    setSelectedPositionCadence,
    positionTableSourcePositions,
    reorderPosition,
    clearDragState
  });
}
