import type { Athlete } from "@/features/athlete/athlete-types";

import type { WeeklyPerformanceReport } from "./report-types";

export interface PerformanceRow {
  athleteId: string;
  athleteName: string;
  average: number;
  arrows: number;
  sessions: number;
  best: number;
  change: number | undefined;
}

const reportAverage = (report: WeeklyPerformanceReport) => {
  const arrows = report.arrowsShot ?? report.scores.length;
  return arrows
    ? report.scores.reduce((sum, score) => sum + score, 0) / arrows
    : 0;
};

export const performanceRows = (
  athletes: readonly Athlete[],
  reports: readonly WeeklyPerformanceReport[],
  from: string,
  to: string
): PerformanceRow[] => {
  return athletes.map((athlete) => {
    const rows = reports
      .filter(
        (report) =>
          report.athleteId === athlete.id &&
          report.status === "completed" &&
          report.weekStart >= from &&
          report.weekStart <= to
      )
      .toSorted((left, right) => left.weekStart.localeCompare(right.weekStart));
    const averages = rows.map(reportAverage);
    const arrows = rows.reduce(
      (sum, report) => sum + (report.arrowsShot ?? report.scores.length),
      0
    );
    const average = arrows
      ? rows.reduce(
          (sum, report) => sum + report.scores.reduce((a, b) => a + b, 0),
          0
        ) / arrows
      : 0;
    return {
      arrows,
      athleteId: athlete.id,
      athleteName: athlete.fullName,
      average,
      best: averages.length ? Math.max(...averages) : 0,
      change:
        averages.length > 1
          ? (averages.at(-1) ?? 0) - (averages.at(0) ?? 0)
          : undefined,
      sessions: rows.length,
    };
  });
};
