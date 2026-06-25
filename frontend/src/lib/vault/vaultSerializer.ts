import { defaultAppState } from "../../data/defaults";
import { serializeBusinessIdeaCanvas } from "../../domain/businessIdeaCanvas";
import type { AppState, IncomePlanningState, IncomeTrackerState } from "../../types";
import {
  serializeSelfEmploymentProjectFilesById,
  serializeSelfEmploymentStateShell,
  withSelfEmploymentProjectFiles
} from "./selfEmploymentProjectFiles";
import type { VaultDataFiles } from "./vaultTypes";

export function serializeVaultState(state: AppState): VaultDataFiles {
  const selfEmploymentProjectFiles = serializeSelfEmploymentProjectFilesById(state.selfEmployment);
  const projectsById = new Map(state.selfEmployment.projects.map((project) => [project.id, project]));
  return {
    settingsBase: state.settings,
    settingsUi: state.ui,
    settingsTheme: { theme: state.theme },
    incomeTracker: {
      yearlyEntries: state.incomeTracker.yearlyEntries,
      settings: state.incomeTracker.settings
    },
    incomeTaxRules: { settings: state.incomeTracker.settings },
    incomeMilestones: { milestones: state.incomeTracker.milestones },
    planningAccounts: { planningAccounts: state.planningAccounts },
    planningPositions: { positions: state.positions },
    planningYearlyTables: {
      planningAccounts: state.planningAccounts.map((account) => ({
        id: account.id,
        yearlyRows: account.yearlyRows
      }))
    },
    planningTableViews: { positionTableView: state.positionTableView },
    investmentDepots: { investmentByAccountId: state.investmentByAccountId },
    investmentAccountSettings: {
      investment: state.investment,
      investmentByAccountId: state.investmentByAccountId
    },
    investmentSelections: {
      selectedInvestmentAccountId: state.ui.selectedInvestmentAccountId,
      investment: state.investment
    },
    realEstateFinancing: state.realEstate,
    realEstatePaymentSources: {
      repaymentSources: state.realEstate.repaymentSources,
      equityCapitalSourceIds: state.realEstate.equityCapitalSourceIds,
      monthlyPaymentSourceIds: state.realEstate.monthlyPaymentSourceIds,
      specialRepaymentSourceIds: state.realEstate.specialRepaymentSourceIds,
      includeWithdrawalGainAsPaymentSource: state.realEstate.includeWithdrawalGainAsPaymentSource
    },
    realEstateScenarios: {
      purchaseActivated: state.realEstate.purchaseActivated,
      plannedSaleYear: state.realEstate.plannedSaleYear,
      estimatedSaleValue: state.realEstate.estimatedSaleValue,
      targetFullRepaymentYear: state.realEstate.targetFullRepaymentYear
    },
    statutoryPension: state.statutoryPension,
    combinedWealth: state.combinedWealth,
    combinedWealthToggles: state.combinedWealth,
    incomePlanning: {
      workBlocks: state.incomePlanning.workBlocks,
      manualBlocks: state.incomePlanning.manualBlocks,
      assumptions: state.incomePlanning.assumptions
    },
    timeHabits: { habits: state.incomePlanning.habits },
    timeWeekScenarios: {
      weekScenarios: state.incomePlanning.weekScenarios,
      weekScenarioAssignments: state.incomePlanning.weekScenarioAssignments
    },
    timeStampPlanner: {
      calendarStamps: state.incomePlanning.calendarStamps,
      plannedStamps: state.incomePlanning.plannedStamps
    },
    selfEmploymentState: serializeSelfEmploymentStateShell(state.selfEmployment),
    selfEmploymentProjectFiles,
    selfEmploymentCanvasFiles: Object.fromEntries(
      Object.values(selfEmploymentProjectFiles).flatMap((files) => {
        const projectFile = record(files["project.json"]);
        const project = typeof projectFile.id === "string" ? projectsById.get(projectFile.id) : null;
        const businessIdeaCanvasFile = projectFile.businessIdeaCanvasFile;
        if (!project || typeof businessIdeaCanvasFile !== "string") return [];
        return [[businessIdeaCanvasFile, serializeBusinessIdeaCanvas(project.businessIdeaCanvas)]];
      })
    )
  };
}

export function deserializeVaultState(files: VaultDataFiles): AppState {
  const fallback = defaultAppState();
  const settingsTheme = record(files.settingsTheme);
  const incomeTrackerFile = record(files.incomeTracker);
  const incomeMilestonesFile = record(files.incomeMilestones);
  const planningAccountsFile = record(files.planningAccounts);
  const planningPositionsFile = record(files.planningPositions);
  const planningTableViewsFile = record(files.planningTableViews);
  const investmentDepotsFile = record(files.investmentDepots);
  const investmentSettingsFile = record(files.investmentAccountSettings);
  const incomePlanningFile = record(files.incomePlanning);
  const timeHabitsFile = record(files.timeHabits);
  const timeWeekScenariosFile = record(files.timeWeekScenarios);
  const timeStampPlannerFile = record(files.timeStampPlanner);
  const selfEmploymentStateWithProjects = withSelfEmploymentProjectFiles(
    files.selfEmploymentState,
    files.selfEmploymentProjectFiles
  );
  const selfEmploymentStateFile = withExternalSelfEmploymentCanvases(
    selfEmploymentStateWithProjects,
    files.selfEmploymentCanvasFiles
  );

  const incomeTracker: IncomeTrackerState = {
    ...fallback.incomeTracker,
    ...incomeTrackerFile,
    milestones: arrayOr(incomeMilestonesFile.milestones, arrayOr(incomeTrackerFile.milestones, fallback.incomeTracker.milestones))
  } as IncomeTrackerState;

  const incomePlanning: IncomePlanningState = {
    ...fallback.incomePlanning,
    ...incomePlanningFile,
    habits: arrayOr(timeHabitsFile.habits, fallback.incomePlanning.habits),
    weekScenarios: arrayOr(timeWeekScenariosFile.weekScenarios, fallback.incomePlanning.weekScenarios),
    weekScenarioAssignments: arrayOr(
      timeWeekScenariosFile.weekScenarioAssignments,
      fallback.incomePlanning.weekScenarioAssignments
    ),
    calendarStamps: arrayOr(timeStampPlannerFile.calendarStamps, fallback.incomePlanning.calendarStamps),
    plannedStamps: arrayOr(timeStampPlannerFile.plannedStamps, fallback.incomePlanning.plannedStamps)
  } as IncomePlanningState;

  return {
    ...fallback,
    theme: settingsTheme.theme === "dark" ? "dark" : settingsTheme.theme === "light" ? "light" : fallback.theme,
    settings: isRecord(files.settingsBase) ? (files.settingsBase as unknown as AppState["settings"]) : fallback.settings,
    ui: isRecord(files.settingsUi) ? (files.settingsUi as unknown as AppState["ui"]) : fallback.ui,
    realEstate: isRecord(files.realEstateFinancing)
      ? (files.realEstateFinancing as unknown as AppState["realEstate"])
      : fallback.realEstate,
    combinedWealth: isRecord(files.combinedWealth)
      ? (files.combinedWealth as unknown as AppState["combinedWealth"])
      : fallback.combinedWealth,
    statutoryPension: isRecord(files.statutoryPension)
      ? (files.statutoryPension as unknown as AppState["statutoryPension"])
      : fallback.statutoryPension,
    incomeTracker,
    incomePlanning,
    selfEmployment: isRecord(selfEmploymentStateFile)
      ? (selfEmploymentStateFile as unknown as AppState["selfEmployment"])
      : fallback.selfEmployment,
    planningAccounts: arrayOr(planningAccountsFile.planningAccounts, fallback.planningAccounts),
    positions: arrayOr(planningPositionsFile.positions, fallback.positions),
    investmentByAccountId: isRecord(investmentDepotsFile.investmentByAccountId)
      ? (investmentDepotsFile.investmentByAccountId as unknown as AppState["investmentByAccountId"])
      : isRecord(investmentSettingsFile.investmentByAccountId)
        ? (investmentSettingsFile.investmentByAccountId as unknown as AppState["investmentByAccountId"])
        : fallback.investmentByAccountId,
    investment: isRecord(investmentSettingsFile.investment)
      ? (investmentSettingsFile.investment as unknown as AppState["investment"])
      : fallback.investment,
    positionTableView: isRecord(planningTableViewsFile.positionTableView)
      ? (planningTableViewsFile.positionTableView as unknown as AppState["positionTableView"])
      : fallback.positionTableView
  };
}

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function withExternalSelfEmploymentCanvases(value: unknown, canvasFiles: unknown): unknown {
  if (!isRecord(value) || !isRecord(canvasFiles) || !Array.isArray(value.projects)) return value;
  return {
    ...value,
    projects: value.projects.map((project) => {
      if (!isRecord(project) || typeof project.businessIdeaCanvasFile !== "string") return project;
      const externalCanvas = canvasFiles[project.businessIdeaCanvasFile];
      return externalCanvas === undefined ? project : { ...project, businessIdeaCanvas: externalCanvas };
    })
  };
}

function arrayOr<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
