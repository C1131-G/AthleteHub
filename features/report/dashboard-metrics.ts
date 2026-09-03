import type { Athlete } from "@/features/athlete/athlete-types";
import { conditioningAttentionRows } from "@/features/conditioning/conditioning-attention";
import type {
  ConditioningAssessment,
  ConditioningProgramme,
} from "@/features/conditioning/conditioning-types";
import type { EquipmentSetup } from "@/features/equipment/equipment-types";
import type { SeasonTrainingPlan } from "@/features/training-plan/training-plan-types";

import { scoreSummary } from "./report-calculations";
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
  | `/conditioning?athleteId=${string}`;

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
  weekly: WeeklyPerformanceReport[];
}

export interface LoadPoint {
  label: string;
  planned: number;
  /** `undefined` means the week is planned but no report exists yet. */
  shot: number | undefined;
  weekStart: string;
}

// Keyed per athlete and week so two athletes planning the same week are not
// collapsed before they are summed.
const cellKey = (athleteId: string, weekStart: string) =>
  `${athleteId}|${weekStart}`;

/**
 * One point per week that was either reported or planned. A planned week with
 * no report keeps an undefined actual so the chart and its table can show it as
 * missing rather than as zero.
 */
const loadPointsFor = (
  reports: WeeklyPerformanceReport[],
  plans: SeasonTrainingPlan[],
  inScope: Set<string>,
  month: string
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
  for (const report of reports) {
    // The report's own snapshot replaces the plan target for that week, so a
    // target edited later never rewrites what was recorded at the time.
    if (report.arrowsPlanned !== undefined) {
      plannedByCell.set(cellKey(report.athleteId, report.weekStart), {
        planned: report.arrowsPlanned,
        weekStart: report.weekStart,
      });
    }
    if (report.arrowsShot !== undefined) {
      shotByWeek.set(
        report.weekStart,
        (shotByWeek.get(report.weekStart) ?? 0) + report.arrowsShot
      );
    }
  }

  const plannedByWeek = new Map<string, number>();
  for (const { planned, weekStart } of plannedByCell.values()) {
    plannedByWeek.set(weekStart, (plannedByWeek.get(weekStart) ?? 0) + planned);
  }

  const weekStarts = new Set([...plannedByWeek.keys(), ...shotByWeek.keys()]);
  return [...weekStarts]
    .toSorted((a, b) => a.localeCompare(b))
    .map((weekStart) => ({
      label: weekStart.slice(5),
      planned: plannedByWeek.get(weekStart) ?? 0,
      shot: shotByWeek.get(weekStart),
      weekStart,
    }));
};

const latestSetup = (setups: EquipmentSetup[]) =>
  setups.toSorted((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];

const openRequirementCount = (setup: EquipmentSetup | undefined) =>
  setup?.items.filter((item) => item.requirement.trim() && !item.value.trim())
    .length ?? 0;

const averageOf = (values: number[]) =>
  values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;

/** Scores at 18 m and 70 m are different scales and are never comparable. */
const byDistance = (reports: WeeklyPerformanceReport[]) => {
  const grouped = new Map<number, WeeklyPerformanceReport[]>();
  for (const report of reports) {
    if (!(report.distanceM && report.scores.length)) {
      continue;
    }
    grouped.set(report.distanceM, [
      ...(grouped.get(report.distanceM) ?? []),
      report,
    ]);
  }
  return grouped;
};

/** One delta per distance: the last week's average minus the first week's. */
const scoreChangesFor = (reports: WeeklyPerformanceReport[]) => {
  const deltas: number[] = [];
  for (const group of byDistance(reports).values()) {
    const sorted = group.toSorted((a, b) =>
      a.weekStart.localeCompare(b.weekStart)
    );
    const [first] = sorted;
    const last = sorted.at(-1);
    if (first && last && first !== last) {
      deltas.push(averageOf(last.scores) - averageOf(first.scores));
    }
  }
  return deltas;
};

const attentionFor = (
  athlete: Athlete,
  weekly: WeeklyPerformanceReport[],
  monthly: MonthlyPerformanceReport[],
  setup: EquipmentSetup | undefined,
  month: string,
  conditioningAssessments: ConditioningAssessment[],
  conditioningProgrammes: ConditioningProgramme[]
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
    }))
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
        conditioningProgrammes
      )
    );
  }

  const chronological = monthWeekly.toSorted((a, b) =>
    a.weekStart.localeCompare(b.weekStart)
  );
  const loadPoints = loadPointsFor(monthWeekly, plans, inScope, month);
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
