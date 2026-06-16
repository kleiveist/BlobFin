import { createId } from "../../data/defaults";
import type { AppState, CareerMilestone } from "../../types";
import {
  incomeInteger,
  incomeMilestoneImpact
} from "./exportController";

export interface IncomeMilestoneControllerContext {
  getState(): AppState;
  renderAll(): void;
  finishIncomeUpdate(renderMode: "none" | "live" | "full", collection?: string, id?: string, field?: string): void;
}

export function addIncomeMilestoneWithContext(context: IncomeMilestoneControllerContext): void {
  context.getState().incomeTracker = {
    ...context.getState().incomeTracker,
    milestones: [
      ...context.getState().incomeTracker.milestones,
      {
        id: createId(),
        date: "",
        type: "Gehaltserhoehung",
        description: "",
        impact: "positive",
        linkedYear: context.getState().settings.year
      }
    ]
  };
  context.renderAll();
}

export function removeIncomeMilestoneWithContext(context: IncomeMilestoneControllerContext, action: string): boolean {
  if (!action.startsWith("income-remove-milestone-")) return false;
  const id = action.replace("income-remove-milestone-", "");
  context.getState().incomeTracker = {
    ...context.getState().incomeTracker,
    milestones: context.getState().incomeTracker.milestones.filter((entry) => entry.id !== id)
  };
  return true;
}

export function updateIncomeMilestoneWithContext(
  context: IncomeMilestoneControllerContext,
  id: string,
  field: string,
  value: string,
  renderMode: "none" | "live" | "full"
): boolean {
  context.getState().incomeTracker = {
    ...context.getState().incomeTracker,
    milestones: context.getState().incomeTracker.milestones.map((entry) =>
      entry.id === id ? updateIncomeMilestoneEntry(context, entry, field, value) : entry
    )
  };
  context.finishIncomeUpdate(renderMode, "milestones", id, field);
  return true;
}

function updateIncomeMilestoneEntry(
  context: IncomeMilestoneControllerContext,
  entry: CareerMilestone,
  field: string,
  value: string
): CareerMilestone {
  if (field === "impact") return { ...entry, impact: incomeMilestoneImpact(value) };
  if (field === "linkedYear") return { ...entry, linkedYear: value.trim() === "" ? null : incomeInteger(value, context.getState().settings.year) };
  if (field === "date") return { ...entry, date: value };
  if (field === "type") return { ...entry, type: value };
  if (field === "description") return { ...entry, description: value };
  return entry;
}
