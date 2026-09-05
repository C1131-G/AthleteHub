import {
  addDays,
  addMonths,
  format,
  isValid,
  parseISO,
  startOfWeek,
} from "date-fns";

import type { ArcherySession } from "../session/session-types";
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

export interface SessionWeekSummary {
  arrowsShot: number;
  /** The latest session's distance, so mixed-distance weeks stay honest. */
  distanceM: number | undefined;
  trainingDays: number;
}

/**
 * Buckets a session date into its report week. The week-start day follows the
 * app preference (Monday by default, matching the report calendar).
 */
export const sessionWeekStart = (date: string, weekStartsOn: 0 | 1 | 6 = 1) =>
  format(startOfWeek(parseISO(date), { weekStartsOn }), "yyyy-MM-dd");

/**
 * Completed sessions inside the athlete's week, for pre-filling a weekly
 * report. Drafts never count, and a session without an arrow total falls back
 * to its ends. Scores are deliberately excluded: the report caps them at four
 * and the coach owns which ones count.
 */
export const sessionSummaryForWeek = (
  sessions: ArcherySession[],
  athleteId: string,
  weekStart: string
): SessionWeekSummary => {
  const weekEnd = format(addDays(parseISO(weekStart), 6), "yyyy-MM-dd");
  const inWeek = sessions
    .filter(
      (entry) =>
        entry.athleteId === athleteId &&
        entry.status === "complete" &&
        entry.date >= weekStart &&
        entry.date <= weekEnd
    )
    .toSorted((a, b) => a.date.localeCompare(b.date));
  const arrowsShot = inWeek.reduce(
    (total, entry) =>
      total +
      (entry.actualArrows ??
        entry.ends.reduce((endTotal, end) => endTotal + end.arrowCount, 0)),
    0
  );
  return {
    arrowsShot,
    distanceM: inWeek.at(-1)?.format.distanceM,
    trainingDays: new Set(inWeek.map((entry) => entry.date)).size,
  };
};

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export const monthLabel = (month: string) => {
  if (!MONTH_PATTERN.test(month)) {
    return month;
  }
  const parsed = parseISO(`${month}-01`);
  return isValid(parsed) ? format(parsed, "MMMM yyyy") : month;
};

/** The month a report's "next month plan" applies to. */
export const nextMonthOf = (month: string) => {
  if (!MONTH_PATTERN.test(month)) {
    return "";
  }
  const parsed = parseISO(`${month}-01`);
  return isValid(parsed) ? format(addMonths(parsed, 1), "yyyy-MM") : "";
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
