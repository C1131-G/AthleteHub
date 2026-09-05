import { sessionWeekStart } from "@/features/report/report-calculations";
import type { WeeklyPerformanceReport } from "@/features/report/report-types";
import type { ArcherySession } from "@/features/session/session-types";

import type { SeasonTrainingPlan } from "./training-plan-types";

export interface PlanWeekProgress {
  /** `undefined` means no weekly report exists yet, which is not the same as 0. */
  actualArrows: number | undefined;
  actualTrainingDays: number | undefined;
  arrowsPerTrainingDay: number;
  plannedArrows: number;
  reportId: string | undefined;
  technicalFocus: string;
  trainingDaysPlanned: number;
  variance: number | undefined;
  weekStart: string;
}

export interface PlanTotals {
  actualArrows: number;
  completion: number;
  missingWeeks: number;
  plannedArrows: number;
  recordedWeeks: number;
  variance: number;
}

/**
 * One row per planned week, whether or not a weekly report exists for it. Weeks
 * with no report keep `undefined` actuals so the views can show them as missing
 * instead of dropping them or reading them as zero.
 */
export const planWeekProgress = (
  plan: SeasonTrainingPlan,
  weekly: WeeklyPerformanceReport[],
  sessions: ArcherySession[] = []
): PlanWeekProgress[] => {
  const byWeekStart = new Map<string, WeeklyPerformanceReport>();
  for (const report of weekly) {
    if (report.athleteId === plan.athleteId) {
      byWeekStart.set(report.weekStart, report);
    }
  }
  // Recorded sessions own their week; the typed figure usually came from the
  // same sessions via pre-fill, so it only applies where sessions are absent.
  const sessionArrowsByWeek = new Map<string, number>();
  for (const session of sessions) {
    if (session.athleteId !== plan.athleteId || session.status !== "complete") {
      continue;
    }
    const arrows =
      session.actualArrows ??
      session.ends.reduce((total, end) => total + end.arrowCount, 0);
    if (!arrows) {
      continue;
    }
    const weekStart = sessionWeekStart(session.date);
    sessionArrowsByWeek.set(
      weekStart,
      (sessionArrowsByWeek.get(weekStart) ?? 0) + arrows
    );
  }
  return plan.weeks
    .toSorted((a, b) => a.weekStart.localeCompare(b.weekStart))
    .map((week) => {
      const report = byWeekStart.get(week.weekStart);
      const actualArrows =
        sessionArrowsByWeek.get(week.weekStart) ?? report?.arrowsShot;
      return {
        actualArrows,
        actualTrainingDays: report?.trainingDays,
        arrowsPerTrainingDay: week.trainingDaysPlanned
          ? week.arrowsPlanned / week.trainingDaysPlanned
          : 0,
        plannedArrows: week.arrowsPlanned,
        reportId: report?.id,
        technicalFocus: week.technicalFocus,
        trainingDaysPlanned: week.trainingDaysPlanned,
        variance:
          actualArrows === undefined
            ? undefined
            : actualArrows - week.arrowsPlanned,
        weekStart: week.weekStart,
      };
    });
};

export const planTotals = (progress: PlanWeekProgress[]): PlanTotals => {
  let actualArrows = 0;
  let plannedArrows = 0;
  let missingWeeks = 0;
  for (const week of progress) {
    plannedArrows += week.plannedArrows;
    if (week.actualArrows === undefined) {
      missingWeeks += 1;
    } else {
      actualArrows += week.actualArrows;
    }
  }
  return {
    actualArrows,
    completion: plannedArrows ? (actualArrows / plannedArrows) * 100 : 0,
    missingWeeks,
    plannedArrows,
    recordedWeeks: progress.length - missingWeeks,
    variance: actualArrows - plannedArrows,
  };
};

export const monthlyPlannedTotals = (plan: SeasonTrainingPlan) => {
  const months = new Map<string, { plannedArrows: number; weeks: number }>();
  for (const week of plan.weeks) {
    const month = week.weekStart.slice(0, 7);
    const current = months.get(month) ?? { plannedArrows: 0, weeks: 0 };
    months.set(month, {
      plannedArrows: current.plannedArrows + week.arrowsPlanned,
      weeks: current.weeks + 1,
    });
  }
  return [...months.entries()]
    .map(([month, totals]) => ({ month, ...totals }))
    .toSorted((a, b) => a.month.localeCompare(b.month));
};

const overlapsMonth = (plan: SeasonTrainingPlan, month: string) =>
  plan.startsOn.slice(0, 7) <= month && plan.endsOn.slice(0, 7) >= month;

/**
 * The plan a monthly report should read its weekly targets from: the athlete's
 * active plan covering that month, falling back to any plan that covers it.
 */
export const planForMonth = (
  plans: SeasonTrainingPlan[],
  athleteId: string,
  month: string
) => {
  const covering = plans.filter(
    (plan) => plan.athleteId === athleteId && overlapsMonth(plan, month)
  );
  return covering.find((plan) => plan.status === "active") ?? covering[0];
};

export const weeklyArrowTargetsForMonth = (
  plan: SeasonTrainingPlan,
  month: string
) =>
  plan.weeks
    .filter((week) => week.weekStart.startsWith(month))
    .toSorted((a, b) => a.weekStart.localeCompare(b.weekStart))
    .map((week) => week.arrowsPlanned);

/** The plan week a weekly report belongs to, matched by athlete and week start. */
export const planWeekFor = (
  plans: SeasonTrainingPlan[],
  athleteId: string,
  weekStart: string
) => {
  if (!(athleteId && weekStart)) {
    return;
  }
  const candidates = plans.filter(
    (plan) =>
      plan.athleteId === athleteId &&
      plan.weeks.some((week) => week.weekStart === weekStart)
  );
  const plan =
    candidates.find((item) => item.status === "active") ?? candidates[0];
  const week = plan?.weeks.find((item) => item.weekStart === weekStart);
  return plan && week ? { plan, week } : undefined;
};

export const scheduledEvents = (plan: SeasonTrainingPlan) =>
  plan.events
    .filter((event) => event.dateStatus === "scheduled")
    .toSorted((a, b) => (a.startsOn ?? "").localeCompare(b.startsOn ?? ""));

export const undatedEvents = (plan: SeasonTrainingPlan) =>
  plan.events.filter((event) => event.dateStatus === "tbd");

/** The focus of the week in progress, or the next planned one. */
export const currentTechnicalFocus = (
  plan: SeasonTrainingPlan,
  today: string
) => {
  const sorted = plan.weeks.toSorted((a, b) =>
    a.weekStart.localeCompare(b.weekStart)
  );
  const started = sorted.filter((week) => week.weekStart <= today);
  const week = started.at(-1) ?? sorted[0];
  return week?.technicalFocus ?? "";
};

/**
 * The coach's competition calendar: scheduled events from every plan grouped
 * into months (ordered), plus the to-be-dated events listed by name so they
 * are not forgotten.
 */
export const competitionCalendar = (plans: SeasonTrainingPlan[]) => {
  const seen = new Set<string>();
  const scheduled: SeasonTrainingPlan["events"] = [];
  for (const plan of plans) {
    for (const event of scheduledEvents(plan)) {
      if (!seen.has(event.id)) {
        seen.add(event.id);
        scheduled.push(event);
      }
    }
  }
  scheduled.sort(
    (a, b) =>
      (a.startsOn ?? "").localeCompare(b.startsOn ?? "") ||
      a.name.localeCompare(b.name)
  );

  const months: {
    events: SeasonTrainingPlan["events"];
    month: string;
  }[] = [];
  for (const event of scheduled) {
    const month = (event.startsOn ?? "").slice(0, 7);
    const group = months.find((entry) => entry.month === month);
    if (group) {
      group.events.push(event);
    } else {
      months.push({ events: [event], month });
    }
  }

  const undated: SeasonTrainingPlan["events"] = [];
  for (const plan of plans) {
    for (const event of undatedEvents(plan)) {
      if (!seen.has(event.id)) {
        seen.add(event.id);
        undated.push(event);
      }
    }
  }
  undated.sort((a, b) => a.name.localeCompare(b.name));

  return { months, undated };
};
