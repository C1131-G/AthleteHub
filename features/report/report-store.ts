import { Store } from "@tanstack/store";

import { reportRepository } from "./report-repository";
import type {
  MonthlyPerformanceReportInput,
  WeeklyPerformanceReportInput,
} from "./report-types";

interface ReportState {
  weekly: ReturnType<typeof reportRepository.listWeekly>;
  monthly: ReturnType<typeof reportRepository.listMonthly>;
  ready: boolean;
}

export const reportStore = new Store<ReportState>({
  monthly: [],
  ready: false,
  weekly: [],
});

export const hydrateReports = () => {
  reportStore.setState(() => ({
    monthly: reportRepository.listMonthly(),
    ready: true,
    weekly: reportRepository.listWeekly(),
  }));
};

const refresh = () => {
  reportStore.setState((state) => ({
    ...state,
    monthly: reportRepository.listMonthly(),
    weekly: reportRepository.listWeekly(),
  }));
};

export const createWeeklyReport = (input: WeeklyPerformanceReportInput) => {
  const report = reportRepository.createWeekly(input);
  refresh();
  return report;
};

export const updateWeeklyReport = (
  id: string,
  input: WeeklyPerformanceReportInput
) => {
  const report = reportRepository.updateWeekly(id, input);
  refresh();
  return report;
};

export const createMonthlyReport = (input: MonthlyPerformanceReportInput) => {
  const report = reportRepository.createMonthly(input);
  refresh();
  return report;
};

export const updateMonthlyReport = (
  id: string,
  input: MonthlyPerformanceReportInput
) => {
  const report = reportRepository.updateMonthly(id, input);
  refresh();
  return report;
};
