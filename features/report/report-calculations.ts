import { format, isValid, parseISO } from "date-fns";

import type {
  MonthlyPerformanceReport,
  ScoreSummary,
  WeeklyPerformanceReport,
} from "./report-types";

const sameMonth = (date: string, month: string) => date.startsWith(month);

export const scoreSummary = (
  reports: WeeklyPerformanceReport[],
  month: string
): ScoreSummary[] => {
  const grouped = new Map<number, number[]>();
  for (const report of reports) {
    if (!sameMonth(report.weekStart, month) || !report.distanceM) {
      continue;
    }
    const scores = grouped.get(report.distanceM) ?? [];
    grouped.set(report.distanceM, [...scores, ...report.scores]);
  }
  return [...grouped.entries()]
    .map(([distanceM, scores]) => ({
      average: scores.length
        ? scores.reduce((total, score) => total + score, 0) / scores.length
        : 0,
      distanceM,
      rounds: scores.length,
      total: scores.reduce((total, score) => total + score, 0),
    }))
    .toSorted((a, b) => a.distanceM - b.distanceM);
};

export const loadSummary = (
  reports: WeeklyPerformanceReport[],
  month: string
) => {
  const selected = reports.filter((report) =>
    sameMonth(report.weekStart, month)
  );
  const planned = selected.reduce(
    (total, report) => total + (report.arrowsPlanned ?? 0),
    0
  );
  const shot = selected.reduce(
    (total, report) => total + (report.arrowsShot ?? 0),
    0
  );
  return {
    completion: planned ? (shot / planned) * 100 : 0,
    planned,
    shot,
  };
};

export const reportsForAthleteMonth = (
  reports: WeeklyPerformanceReport[],
  athleteId: string,
  month: string
) =>
  reports.filter(
    (report) =>
      report.athleteId === athleteId && sameMonth(report.weekStart, month)
  );

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export const monthLabel = (month: string) => {
  if (!MONTH_PATTERN.test(month)) {
    return month;
  }
  const parsed = parseISO(`${month}-01`);
  return isValid(parsed) ? format(parsed, "MMMM yyyy") : month;
};

export const createMonthlyDraft = (
  athleteId: string,
  month: string,
  source?: MonthlyPerformanceReport
): Omit<MonthlyPerformanceReport, "id" | "createdAt" | "updatedAt"> => ({
  actionItems: source?.actionItems ?? [],
  assessments: source?.assessments ?? {
    conditioningPlan: "",
    conditioningTests: [],
    dartfishNotes: "",
    ringShotActions: [],
    ringShotStrengths: [],
  },
  athleteId,
  coachSummary: source?.coachSummary ?? "",
  exceptionReason: source?.exceptionReason ?? "",
  month,
  nextMonthPlan: source?.nextMonthPlan ?? {
    notes: "",
    weeklyArrowTargets: [],
  },
  performanceHighlights: source?.performanceHighlights ?? "",
  status: source?.status ?? "draft",
});
