import type { ArcherySession } from "@/features/session/session-types";
import type { SeasonTrainingPlan } from "@/features/training-plan/training-plan-types";

import { sessionWeekStart } from "./report-calculations";
import type { WeeklyPerformanceReport } from "./report-types";

export interface LoadPoint {
  label: string;
  planned: number;
  shot: number | undefined;
  weekStart: string;
}

const cellKey = (athleteId: string, weekStart: string) =>
  `${athleteId}|${weekStart}`;

const sessionArrowTotal = (session: ArcherySession) =>
  session.actualArrows ??
  session.ends.reduce((total, end) => total + end.arrowCount, 0);

export const loadPointsFor = (
  reports: WeeklyPerformanceReport[],
  plans: SeasonTrainingPlan[],
  inScope: Set<string>,
  month: string,
  sessions: ArcherySession[]
): LoadPoint[] => {
  const plannedByCell = new Map<
    string,
    { planned: number; weekStart: string }
  >();
  for (const plan of plans) {
    if (!inScope.has(plan.athleteId)) {
      continue;
    }
    for (const week of plan.weeks) {
      if (month && !week.weekStart.startsWith(month)) {
        continue;
      }
      plannedByCell.set(cellKey(plan.athleteId, week.weekStart), {
        planned: week.arrowsPlanned,
        weekStart: week.weekStart,
      });
    }
  }

  const shotByWeek = new Map<string, number>();
  const sessionShotByWeek = new Map<string, number>();
  for (const session of sessions) {
    const arrows = sessionArrowTotal(session);
    if (!arrows) {
      continue;
    }
    const weekStart = sessionWeekStart(session.date);
    sessionShotByWeek.set(
      weekStart,
      (sessionShotByWeek.get(weekStart) ?? 0) + arrows
    );
  }
  for (const report of reports) {
    if (report.arrowsPlanned !== undefined) {
      plannedByCell.set(cellKey(report.athleteId, report.weekStart), {
        planned: report.arrowsPlanned,
        weekStart: report.weekStart,
      });
    }
    if (
      report.arrowsShot !== undefined &&
      !sessionShotByWeek.has(report.weekStart)
    ) {
      shotByWeek.set(
        report.weekStart,
        (shotByWeek.get(report.weekStart) ?? 0) + report.arrowsShot
      );
    }
  }
  for (const [weekStart, shot] of sessionShotByWeek) {
    shotByWeek.set(weekStart, (shotByWeek.get(weekStart) ?? 0) + shot);
  }

  const plannedByWeek = new Map<string, number>();
  for (const { planned, weekStart } of plannedByCell.values()) {
    plannedByWeek.set(weekStart, (plannedByWeek.get(weekStart) ?? 0) + planned);
  }
  const weekStarts = new Set([...plannedByWeek.keys(), ...shotByWeek.keys()]);
  return [...weekStarts].toSorted().map((weekStart) => ({
    label: weekStart.slice(5),
    planned: plannedByWeek.get(weekStart) ?? 0,
    shot: shotByWeek.get(weekStart),
    weekStart,
  }));
};
