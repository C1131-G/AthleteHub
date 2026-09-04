import type { Athlete } from "@/features/athlete/athlete-types";
import { conditioningAttentionRows } from "@/features/conditioning/conditioning-attention";
import type {
  ConditioningAssessment,
  ConditioningProgramme,
} from "@/features/conditioning/conditioning-types";
import type { EquipmentSetup } from "@/features/equipment/equipment-types";
import type { ArcherySession } from "@/features/session/session-types";
import type { SeasonTrainingPlan } from "@/features/training-plan/training-plan-types";

import {
  averageOf,
  byDistance,
  latestSetup,
  openRequirementCount,
  scoreChangesFor,
} from "./dashboard-attention";
import { loadPointsFor } from "./dashboard-load";
import { scoreSummary, sessionWeekStart } from "./report-calculations";
import type {
  MonthlyPerformanceReport,
  WeeklyPerformanceReport,
} from "./report-types";

export interface DashboardFilters {
  athleteId: string;
  category: string;
  month: string;
  rankingDistance: number;
  status: string;
}

/** The routes an attention row can point at, typed for `next/link`. */
type AttentionHref =
  | `/reports?athleteId=${string}`
  | `/reports?athleteId=${string}&tab=monthly`
  | `/reports/weekly/new?athleteId=${string}&month=${string}`
  | `/athletes/${string}/equipment/${string}`
  | `/conditioning?athleteId=${string}`
  | `/sessions?athleteId=${string}`;

export interface AttentionRow {
  athlete: string;
  href: AttentionHref;
  reason: string;
}

interface DashboardInput {
  athletes: Athlete[];
  conditioningAssessments: ConditioningAssessment[];
  conditioningProgrammes: ConditioningProgramme[];
  equipmentFor: (athleteId: string) => EquipmentSetup[];
  filters: DashboardFilters;
  monthly: MonthlyPerformanceReport[];
  plans: SeasonTrainingPlan[];
  sessionsFor: (athleteId: string) => ArcherySession[];
  weekly: WeeklyPerformanceReport[];
}

const sessionAttentionRows = (
  athlete: Athlete,
  sessions: ArcherySession[],
  weekly: WeeklyPerformanceReport[]
): AttentionRow[] => {
  const reportedWeeks = new Set(weekly.map((report) => report.weekStart));
  const unreported = sessions.some(
    (session) => !reportedWeeks.has(sessionWeekStart(session.date))
  );
  return unreported
    ? [
        {
          athlete: athlete.fullName,
          href: `/sessions?athleteId=${athlete.id}`,
          reason: "Unreported sessions",
        },
      ]
    : [];
};

const attentionFor = (
  athlete: Athlete,
  weekly: WeeklyPerformanceReport[],
  monthly: MonthlyPerformanceReport[],
  setup: EquipmentSetup | undefined,
  month: string,
  conditioningAssessments: ConditioningAssessment[],
  conditioningProgrammes: ConditioningProgramme[],
  sessions: ArcherySession[]
): AttentionRow[] => {
  const rows: AttentionRow[] = [];
  const add = (reason: string, href: AttentionHref) =>
    rows.push({ athlete: athlete.fullName, href, reason });

  if (weekly.length === 0) {
    add(
      "Weekly entry missing",
      `/reports/weekly/new?athleteId=${athlete.id}&month=${month}`
    );
  }
  if (weekly.some((report) => report.status === "medical-leave")) {
    add("Medical leave", `/reports?athleteId=${athlete.id}`);
  }
  if (scoreChangesFor(weekly).some((delta) => delta < 0)) {
    add("Score decline", `/reports?athleteId=${athlete.id}`);
  }
  if (monthly.some((report) => report.status === "draft")) {
    add(
      "Monthly report incomplete",
      `/reports?athleteId=${athlete.id}&tab=monthly`
    );
  }
  if (setup && openRequirementCount(setup) > 0) {
    add(
      "Equipment requirement open",
      `/athletes/${athlete.id}/equipment/${setup.id}`
    );
  }
  rows.push(
    ...conditioningAttentionRows(
      athlete,
      conditioningAssessments,
      conditioningProgrammes,
      month
    ).map((row) => ({
      athlete: athlete.fullName,
      href: row.href,
      reason: row.reason,
    })),
    ...sessionAttentionRows(athlete, sessions, weekly)
  );
  return rows;
};

/**
 * Every figure the dashboard renders, derived in one place so the view stays a
 * view and the arithmetic can be tested without a browser.
 */
export const dashboardMetrics = ({
  athletes,
  conditioningAssessments,
  conditioningProgrammes,
  equipmentFor,
  filters,
  monthly,
  plans,
  sessionsFor,
  weekly,
}: DashboardInput) => {
  const { athleteId, category, month, rankingDistance, status } = filters;

  const scopedAthletes = athletes.filter(
    (athlete) =>
      (!athleteId || athlete.id === athleteId) &&
      (!category || athlete.category === category) &&
      (!status || athlete.status === status)
  );
  const inScope = new Set(scopedAthletes.map((athlete) => athlete.id));
  const monthWeekly = weekly.filter(
    (report) =>
      (!month || report.weekStart.startsWith(month)) &&
      inScope.has(report.athleteId)
  );
  const monthMonthly = monthly.filter(
    (report) =>
      (!month || report.month === month) && inScope.has(report.athleteId)
  );
  const monthSessions: ArcherySession[] = [];
  for (const athlete of scopedAthletes) {
    for (const session of sessionsFor(athlete.id)) {
      if (
        session.status === "complete" &&
        (!month || sessionWeekStart(session.date).startsWith(month))
      ) {
        monthSessions.push(session);
      }
    }
  }

  const missingReports = scopedAthletes.filter(
    (athlete) => !monthMonthly.some((report) => report.athleteId === athlete.id)
  );
  const statusCounts = {
    complete: monthMonthly.filter((report) => report.status === "complete")
      .length,
    draft: monthMonthly.filter((report) => report.status === "draft").length,
    missing: missingReports.length,
  };

  const rankingPoints = scopedAthletes
    .flatMap((athlete) => {
      const scores: number[] = [];
      for (const report of monthWeekly) {
        if (
          report.athleteId === athlete.id &&
          report.distanceM === rankingDistance
        ) {
          scores.push(...report.scores);
        }
      }
      return scores.length
        ? [{ label: athlete.fullName, value: averageOf(scores) }]
        : [];
    })
    .toSorted((a, b) => b.value - a.value);

  const scoreChanges = scopedAthletes.flatMap((athlete) =>
    scoreChangesFor(
      monthWeekly.filter((report) => report.athleteId === athlete.id)
    )
  );

  let openRequirements = 0;
  const attentionRows: AttentionRow[] = [];
  for (const athlete of scopedAthletes) {
    const setup = latestSetup(equipmentFor(athlete.id));
    openRequirements += openRequirementCount(setup);
    attentionRows.push(
      ...attentionFor(
        athlete,
        monthWeekly.filter((report) => report.athleteId === athlete.id),
        monthMonthly.filter((report) => report.athleteId === athlete.id),
        setup,
        month,
        conditioningAssessments,
        conditioningProgrammes,
        monthSessions.filter((session) => session.athleteId === athlete.id)
      )
    );
  }

  const chronological = monthWeekly.toSorted((a, b) =>
    a.weekStart.localeCompare(b.weekStart)
  );
  const loadPoints = loadPointsFor(
    monthWeekly,
    plans,
    inScope,
    month,
    monthSessions
  );
  const plannedArrows = loadPoints.reduce(
    (total, point) => total + point.planned,
    0
  );
  const shotArrows = loadPoints.reduce(
    (total, point) => total + (point.shot ?? 0),
    0
  );

  return {
    attentionRows,
    averageScoreChange: averageOf(scoreChanges),
    completionPoints: [
      { label: "Complete", value: statusCounts.complete },
      { label: "Draft", value: statusCounts.draft },
      { label: "Missing", value: statusCounts.missing },
    ],
    load: {
      completion: plannedArrows ? (shotArrows / plannedArrows) * 100 : 0,
      planned: plannedArrows,
      shot: shotArrows,
    },
    loadPoints,
    monthMonthly,
    monthWeekly,
    openRequirements,
    rankingPoints,
    scopedAthletes,
    scoreGroups: scoreSummary(monthWeekly, month),
    scoreSeries: [...byDistance(chronological).entries()]
      .map(([distanceM, reports]) => ({
        distanceM,
        points: reports.map((report) => ({
          label: report.weekStart.slice(5),
          value: averageOf(report.scores),
        })),
      }))
      .toSorted((a, b) => a.distanceM - b.distanceM),
    statusCounts,
  };
};
