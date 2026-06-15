import {
  addIncomeMilestone,
  addIncomeYearlyEntry,
  closeIncomeAnalysisDialog,
  closeIncomeTaxDialog,
  exportIncomeCsv,
  exportIncomePdf,
  exportIncomePlanningCsvFile,
  hideIncomeMilestoneTypePicker,
  hideIncomeYearLabelPicker,
  importIncomeCsvFromFile,
  importIncomePlanningCsvFromFile,
  openIncomeAnalysisDialog,
  openIncomeTaxDialog,
  removeIncomeEntry,
  selectIncomeMilestoneType,
  selectIncomeYearLabel,
  setIncomeAnalysisChartType,
  setIncomeAnalysisDataView,
  setIncomeAnalysisYearFilter,
  setIncomeInputTab,
  showIncomeMilestoneTypePicker,
  showIncomeYearLabelPicker,
  toggleIncomeAnalysisLabel,
  toggleIncomeYearLabelFilter,
  updateIncomeEntry,
  updateIncomeSetting
} from "./controller";
import type { IncomeAnalysisChartType, IncomeAnalysisDataView } from "./uiState";
import type { IncomeTrackerSettings } from "./model";
import { incomeTrackerUiState } from "./uiState";

export function onIncomeTrackerInput(event: Event): boolean | void {
  const target = formControl(event.target);
  if (!target) return;
  if (target.dataset.incomeCollection && target.dataset.incomeId && target.dataset.incomeField) {
    const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
    updateIncomeEntry(target.dataset.incomeCollection, target.dataset.incomeId, target.dataset.incomeField, value, "live");
    return true;
  }
  if (target.dataset.incomeSetting) {
    updateIncomeSetting(target.dataset.incomeSetting as keyof IncomeTrackerSettings, target.value, "live");
    return true;
  }
}

export function onIncomeTrackerChange(event: Event): boolean | void {
  const target = formControl(event.target);
  if (!target) return;
  if (target.dataset.incomeCollection && target.dataset.incomeId && target.dataset.incomeField) {
    const value = target instanceof HTMLInputElement && target.type === "checkbox" ? String(target.checked) : target.value;
    updateIncomeEntry(target.dataset.incomeCollection, target.dataset.incomeId, target.dataset.incomeField, value, "full");
    return true;
  }
  if (target.dataset.incomeSetting) {
    updateIncomeSetting(target.dataset.incomeSetting as keyof IncomeTrackerSettings, target.value, "full");
    return true;
  }
  if (target.id === "incomeCsvImport" && target instanceof HTMLInputElement) {
    void importIncomeCsvFromFile(target.files?.[0]);
    target.value = "";
    return true;
  }
  if (target.id === "incomePlanningCsvImport" && target instanceof HTMLInputElement) {
    void importIncomePlanningCsvFromFile(target.files?.[0]);
    target.value = "";
    return true;
  }
}

export function onIncomeTrackerClick(event: MouseEvent): boolean | void {
  const target = event.target as HTMLElement | null;
  const button = target?.closest<HTMLButtonElement>("button[data-action]");
  if (!button) {
    if (incomeTrackerUiState.yearLabelPicker && !target?.closest("#incomeYearLabelPicker")) hideIncomeYearLabelPicker();
    if (incomeTrackerUiState.milestoneTypePicker && !target?.closest("#incomeMilestoneTypePicker")) hideIncomeMilestoneTypePicker();
    return;
  }
  const action = button.dataset.action;
  if (!isIncomeTrackerAction(action)) {
    if (action !== "open-income-year-label-picker" && action !== "select-income-year-label") hideIncomeYearLabelPicker();
    if (action !== "open-income-milestone-type-picker" && action !== "select-income-milestone-type") hideIncomeMilestoneTypePicker();
    return;
  }

  event.preventDefault();
  if (action !== "open-income-year-label-picker" && action !== "select-income-year-label") hideIncomeYearLabelPicker();
  if (action !== "open-income-milestone-type-picker" && action !== "select-income-milestone-type") hideIncomeMilestoneTypePicker();
  if (action?.startsWith("income-tab-")) setIncomeInputTab(action.replace("income-tab-", ""));
  if (action === "income-add-yearly") addIncomeYearlyEntry();
  if (action === "income-add-milestone") addIncomeMilestone();
  if (action?.startsWith("income-open-tax-dialog-")) openIncomeTaxDialog(action.replace("income-open-tax-dialog-", ""));
  if (action === "income-close-tax-dialog") closeIncomeTaxDialog();
  if (action === "income-open-analysis") openIncomeAnalysisDialog();
  if (action === "income-close-analysis") closeIncomeAnalysisDialog();
  if (action?.startsWith("income-analysis-chart-")) setIncomeAnalysisChartType(action.replace("income-analysis-chart-", "") as IncomeAnalysisChartType);
  if (action?.startsWith("income-analysis-view-")) setIncomeAnalysisDataView(action.replace("income-analysis-view-", "") as IncomeAnalysisDataView);
  if (action?.startsWith("income-analysis-year-")) setIncomeAnalysisYearFilter(action.replace("income-analysis-year-", ""));
  if (action === "toggle-income-analysis-label") toggleIncomeAnalysisLabel(button.dataset.incomeAnalysisLabel || "");
  if (action === "toggle-income-year-label-filter") toggleIncomeYearLabelFilter(button.dataset.incomeLabel || "");
  if (action === "income-import-csv") document.querySelector<HTMLInputElement>("#incomeCsvImport")?.click();
  if (action?.startsWith("income-remove-")) removeIncomeEntry(action);
  if (action === "income-export-csv") void exportIncomeCsv();
  if (action === "income-export-pdf") exportIncomePdf();
  if (action === "income-planning-import-csv") document.querySelector<HTMLInputElement>("#incomePlanningCsvImport")?.click();
  if (action === "income-planning-export-csv") void exportIncomePlanningCsvFile();
  if (action === "open-income-year-label-picker") showIncomeYearLabelPicker(button);
  if (action === "close-income-year-label-picker") hideIncomeYearLabelPicker();
  if (action === "select-income-year-label") selectIncomeYearLabel(button.dataset.incomeYearId || "", button.dataset.incomeLabel || "");
  if (action === "open-income-milestone-type-picker") showIncomeMilestoneTypePicker(button);
  if (action === "close-income-milestone-type-picker") hideIncomeMilestoneTypePicker();
  if (action === "select-income-milestone-type") selectIncomeMilestoneType(button.dataset.milestoneId || "", button.dataset.milestoneType || "");
  return true;
}

export function onIncomeTrackerWindowKeyDown(event: KeyboardEvent): boolean | void {
  if (event.key !== "Escape") return;
  closeIncomeTrackerOverlays();
}

export function closeIncomeTrackerOverlays(): void {
  closeIncomeTaxDialog();
  closeIncomeAnalysisDialog();
  hideIncomeYearLabelPicker();
  hideIncomeMilestoneTypePicker();
}

function isIncomeTrackerAction(action: string | undefined): boolean {
  if (!action) return false;
  return (
    action.startsWith("income-tab-") ||
    action.startsWith("income-add-") ||
    action.startsWith("income-open-") ||
    action.startsWith("income-close-") ||
    action.startsWith("income-analysis-") ||
    action.startsWith("income-remove-") ||
    action.startsWith("toggle-income-") ||
    action === "income-import-csv" ||
    action === "income-export-csv" ||
    action === "income-export-pdf" ||
    action === "income-planning-import-csv" ||
    action === "income-planning-export-csv" ||
    action.startsWith("open-income-year-label-picker") ||
    action.startsWith("close-income-year-label-picker") ||
    action.startsWith("select-income-year-label") ||
    action.startsWith("open-income-milestone-type-picker") ||
    action.startsWith("close-income-milestone-type-picker") ||
    action.startsWith("select-income-milestone-type")
  );
}

function formControl(target: EventTarget | null): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null {
  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement
    ? target
    : null;
}
