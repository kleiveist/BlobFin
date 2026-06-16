import { createId, defaultInvestmentSettingsForNewAccount } from "../../data/defaults";
import { numberValue } from "../../lib/format";
import { normalizePositionPlanningYear, sanitizePlanningYearSelection } from "../../lib/planningYears";
import { defaultPositionIconForPosition, normalizePositionIcon } from "../../lib/positionIcons";
import { flowForType, isPositionType, payoutTypeForPositionTableSelection, positionCadencesForTableMode, positionFlow, positionMatchesTableCadence, positionTableMode, type PositionTableCadence, type PositionTableMode, typeForFlow, typeForPositionTableSelection } from "../../lib/positionKinds";
import type { InvestmentSettings, ReservePosition } from "../../types";
import { monthSelect } from "../../views/templates";
import { runtimeApi, runtimeHost } from "./hostContext";
import { finiteIntegerInRange, finiteNumber, normalizePayoutType } from "./positionRuntime";

function expenseDateCells(position: ReservePosition): string {
  if (position.type === "savings") return savingsDateCells(position);
  if (position.type === "fixed") return monthRangeDateCells(position);
  if (runtimeApi.positionTableHidesExpenseMonthRange()) return "";

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
  if (runtimeApi.positionTableHidesIncomeMonthRange()) {
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
  const costBreakdown = runtimeApi.normalizePositionCostBreakdown(position.costBreakdown);
  const canUseCostBreakdown = runtimeApi.positionCostBreakdownAllowed(flow, type, payoutType);
  const costBreakdownTotal = canUseCostBreakdown ? runtimeApi.positionCostBreakdownTotal(costBreakdown) : null;
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
  const cadence = runtimeApi.activePositionCadence();
  const type = typeForPositionTableSelection(runtimeHost.selectedPositionMode, cadence);
  const payoutType = payoutTypeForPositionTableSelection(runtimeHost.selectedPositionMode, cadence);
  const flow = flowForType(type);
  const isIncome = flow === "income";
  const isOnce = payoutType === "once";
  const name = runtimeApi.newPositionName(runtimeHost.selectedPositionMode, cadence);
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
  runtimeApi.renderPositions();
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
  runtimeApi.renderPositions();
}

function positionTableSourcePositions(): ReservePosition[] {
  const cadence = runtimeApi.activePositionCadence();
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

export function configurePositionStateRuntime(): void {
  Object.assign(runtimeApi, {
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
