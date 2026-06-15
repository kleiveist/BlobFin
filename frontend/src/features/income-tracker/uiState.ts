import type { IncomeAnalysisLabelDetails } from "../../domain/incomeAnalysis";
import type { IncomeYearEntry } from "./model";

export type IncomeAnalysisChartType = "pie" | "bar" | "line" | "curve";
export type IncomeAnalysisDataView = "deductions" | "social" | "taxes" | "income" | "label_distribution";
export type IncomeAnalysisYearFilter = "all" | number;

export interface IncomeAnalysisSlice {
  label: string;
  value: number;
  chartValue?: number;
  tone: string;
}

export interface IncomeAnalysisYearPoint {
  year: number;
  gross: number;
  net: number;
  deductions: number;
  taxBase: number;
  taxRefund: number;
  taxPayment: number;
  taxes: number;
  social: number;
  employerSocial: number;
}

export type IncomeAnalysisSeriesItem = {
  label: string;
  tone: string;
  values: Array<{ year: number; value: number }>;
};

export interface IncomeAnalysisModel {
  entries: IncomeYearEntry[];
  years: number[];
  labelDetails: IncomeAnalysisLabelDetails;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  taxBaseTotal: number;
  taxRefundTotal: number;
  taxPaymentTotal: number;
  taxTotal: number;
  socialTotal: number;
  employerSocialTotal: number;
  unassignedDeductions: number;
  slicesByView: Record<IncomeAnalysisDataView, IncomeAnalysisSlice[]>;
  yearPoints: IncomeAnalysisYearPoint[];
}


export interface IncomeTrackerUiState {
  taxDialogEntryId: string | null;
  analysisOpen: boolean;
  analysisChartType: IncomeAnalysisChartType;
  analysisDataView: IncomeAnalysisDataView;
  analysisYearFilter: IncomeAnalysisYearFilter;
  analysisSelectedLabels: string[];
  yearLabelPicker: { entryId: string; top: number; left: number } | null;
  milestoneTypePicker: { milestoneId: string; top: number; left: number } | null;
}

export const incomeTrackerUiState: IncomeTrackerUiState = {
  taxDialogEntryId: null,
  analysisOpen: false,
  analysisChartType: "pie",
  analysisDataView: "deductions",
  analysisYearFilter: "all",
  analysisSelectedLabels: [],
  yearLabelPicker: null,
  milestoneTypePicker: null
};
