import type { Athlete } from "@/features/athlete/athlete-types";
import type { EquipmentSetup } from "@/features/equipment/equipment-types";

import { loadSummary, scoreSummary } from "./report-calculations";
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
  | `/athletes/${string}/equipment/${string}`;

export interface AttentionRow {
  athlete: string;
  href: AttentionHref;
  reason: string;
}

interface DashboardInput {
  athletes: Athlete[];
  equipmentFor: (athleteId: string) => EquipmentSetup[];
  filters: DashboardFilters;
  monthly: MonthlyPerformanceReport[];
  weekly: WeeklyPerformanceReport[];
}

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
  month: string
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
  return rows;
};

/**
 * Every figure the dashboard renders, derived in one place so the view stays a
 * view and the arithmetic can be tested without a browser.
 */
export const dashboardMetrics = ({
  athletes,
  equipmentFor,
  filters,
  monthly,
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
        month
      )
    );
  }

  const chronological = monthWeekly.toSorted((a, b) =>
    a.weekStart.localeCompare(b.weekStart)
  );

  return {
    attentionRows,
    averageScoreChange: averageOf(scoreChanges),
    completionPoints: [
      { label: "Complete", value: statusCounts.complete },
      { label: "Draft", value: statusCounts.draft },
      { label: "Missing", value: statusCounts.missing },
    ],
    load: loadSummary(monthWeekly, month),
    loadPoints: chronological.map((report) => ({
      label: report.weekStart.slice(5),
      planned: report.arrowsPlanned ?? 0,
      shot: report.arrowsShot ?? 0,
    })),
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
