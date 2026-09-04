import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isMonday,
  isValid,
  parseISO,
  startOfMonth,
} from "date-fns";

import type { Assessment } from "@/features/assessment/assessment-types";
import type { Athlete } from "@/features/athlete/athlete-types";
import type { ConditioningAssessment } from "@/features/conditioning/conditioning-types";
import type { EquipmentSetup } from "@/features/equipment/equipment-types";
import {
  loadSummary,
  nextMonthOf,
  scoreSummary,
} from "@/features/report/report-calculations";
import type {
  MonthlyPerformanceReport,
  WeeklyPerformanceReport,
} from "@/features/report/report-types";
import { planForMonth } from "@/features/training-plan/training-plan-calculations";
import type { SeasonTrainingPlan } from "@/features/training-plan/training-plan-types";

import type {
  CycleQueueState,
  CycleSourceReference,
  MonthlyAthleteCycle,
  MonthlyCycleStep,
  MonthlyCycleStepState,
  MonthlyCycleStepStatus,
} from "./monthly-cycle-types";

const unreachableStep = (step: never): never => step;

export interface CycleDomainContext {
  datedAssessments?: Assessment[];
  athlete: Athlete | undefined;
  athleteId: string;
  /** The athlete's equipment setups, any date. */
  equipmentSetups: EquipmentSetup[];
  monthlyReport: MonthlyPerformanceReport | undefined;
  /** The athlete's season plans, any span. */
  plans: SeasonTrainingPlan[];
  /** Conditioning assessments for the athlete, any date. */
  assessments: ConditioningAssessment[];
  /** Conditioning programmes for the athlete, any span. */
  programmes: ConditioningProgrammeRef[];
  weeklyReports: WeeklyPerformanceReport[];
}

/** Only the fields the lifecycle reads, so tests and callers stay lean. */
export interface ConditioningProgrammeRef {
  athleteId: string;
  endsOn: string;
  id: string;
  startsOn: string;
  status: string;
  updatedAt: string;
}

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Last calendar day of a `yyyy-MM` month, as `yyyy-MM-dd`; "" when invalid. */
export const monthEndDate = (month: string): string => {
  const first = parseISO(`${month}-01T00:00:00`);
  if (!isValid(first)) {
    return "";
  }
  return format(endOfMonth(first), "yyyy-MM-dd");
};

/**
 * Every Monday whose date falls inside the month — the weeks the coach owes a
 * report for. Four-week months are possible (28-day February starting on a
 * Monday); most months have five.
 */
export const expectedMondays = (month: string): string[] => {
  const first = parseISO(`${month}-01T00:00:00`);
  if (!isValid(first) || !/^\d{4}-\d{2}$/.test(month)) {
    return [];
  }
  const mondays: string[] = [];
  for (const day of eachDayOfInterval({
    end: endOfMonth(first),
    start: startOfMonth(first),
  })) {
    if (isMonday(day)) {
      mondays.push(format(day, "yyyy-MM-dd"));
    }
  }
  return mondays;
};

/**
 * A weekly report counts toward month coverage when the details its status
 * requires are present: scores for completed/competition, a documented reason
 * for medical leave and absence.
 */
export const weeklyReportCounts = (
  report: WeeklyPerformanceReport
): boolean => {
  if (report.status === "medical-leave" || report.status === "absent") {
    return report.absenceReason.trim().length > 0;
  }
  const { maxScore } = report;
  return (
    (report.distanceM ?? 0) > 0 &&
    (maxScore ?? 0) > 0 &&
    report.scores.length > 0 &&
    report.scores.every((score) => maxScore === undefined || score <= maxScore)
  );
};

export interface WeeklyCoverageEntry {
  counts: boolean;
  report: WeeklyPerformanceReport | undefined;
  weekStart: string;
}

export const weeklyCoverageFor = (
  reports: WeeklyPerformanceReport[],
  athleteId: string,
  month: string
): WeeklyCoverageEntry[] => {
  const byWeekStart = new Map<string, WeeklyPerformanceReport[]>();
  for (const report of reports) {
    if (report.athleteId !== athleteId) {
      continue;
    }
    const existing = byWeekStart.get(report.weekStart) ?? [];
    existing.push(report);
    byWeekStart.set(report.weekStart, existing);
  }
  return expectedMondays(month).map((weekStart) => {
    const candidates = byWeekStart.get(weekStart) ?? [];
    // The most recently updated report for the week is the authoritative one.
    const [report] = candidates.toSorted((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
    return {
      counts: report ? weeklyReportCounts(report) : false,
      report,
      weekStart,
    };
  });
};

/** Latest setup recorded on or before the given date, if any. */
export const setupEffectiveBy = (
  setups: EquipmentSetup[],
  isoDate: string
): EquipmentSetup | undefined => {
  if (!isIsoDate(isoDate)) {
    return undefined;
  }
  return setups
    .filter((setup) => setup.recordedAt.slice(0, 10) <= isoDate)
    .toSorted((a, b) =>
      `${b.recordedAt}${b.createdAt}`.localeCompare(
        `${a.recordedAt}${a.createdAt}`
      )
    )[0];
};

export const coveringPlanForNextMonth = (
  plans: SeasonTrainingPlan[],
  athleteId: string,
  month: string
): SeasonTrainingPlan | undefined => {
  const next = nextMonthOf(month);
  return next ? planForMonth(plans, athleteId, next) : undefined;
};

export interface ConditioningCoverage {
  assessment: ConditioningAssessment | undefined;
  /** Programme covering the month after the cycle month. */
  programme: ConditioningProgrammeRef | undefined;
}

export const conditioningCoverageFor = (
  assessments: ConditioningAssessment[],
  programmes: ConditioningProgrammeRef[],
  athleteId: string,
  month: string
): ConditioningCoverage => {
  const next = nextMonthOf(month);
  const nextStart = next ? `${next}-01` : "";
  const nextEnd = next ? monthEndDate(next) : "";
  const monthAssessments = assessments
    .filter(
      (assessment) =>
        assessment.athleteId === athleteId &&
        assessment.assessedOn.startsWith(month)
    )
    .toSorted((a, b) => b.assessedOn.localeCompare(a.assessedOn));
  const covering = programmes
    .filter(
      (programme) =>
        programme.athleteId === athleteId &&
        programme.startsOn.slice(0, 10) <= nextStart &&
        programme.endsOn.slice(0, 10) >= nextEnd
    )
    .toSorted((a, b) => b.startsOn.localeCompare(a.startsOn));
  return {
    assessment: monthAssessments[0],
    programme: covering[0],
  };
};

export const sourceRefsFor = (
  records: Iterable<{ id: string; updatedAt: string }>
): CycleSourceReference[] =>
  [...records].map((record) => ({
    id: record.id,
    updatedAt: record.updatedAt,
  }));

/**
 * Stored references still describe the live records: same ids, same versions.
 * An empty stored list only matches an empty current list, so confirming with
 * no sources cannot be invalidated by data appearing later.
 */
export const sourcesMatch = (
  stored: CycleSourceReference[],
  current: CycleSourceReference[]
): boolean =>
  stored.length === current.length &&
  stored.every((reference) =>
    current.some(
      (live) =>
        live.id === reference.id && live.updatedAt === reference.updatedAt
    )
  );

/**
 * `stale` is never stored: a confirmed step whose referenced records changed
 * afterwards reports stale and must be reconfirmed.
 */
export const effectiveStepStatus = (
  stored: MonthlyCycleStepState,
  currentSources: CycleSourceReference[]
): MonthlyCycleStepStatus => {
  if (stored.status === "pending") {
    return "pending";
  }
  return sourcesMatch(stored.sources, currentSources) ? stored.status : "stale";
};

/** What the sources for a step would be if confirmed against live data now. */
export const currentSourcesFor = (
  step: MonthlyCycleStep,
  context: CycleDomainContext,
  month: string
): CycleSourceReference[] => {
  switch (step) {
    case "profile": {
      return context.athlete ? sourceRefsFor([context.athlete]) : [];
    }
    case "equipment": {
      const setup = setupEffectiveBy(
        context.equipmentSetups,
        monthEndDate(month)
      );
      return setup ? sourceRefsFor([setup]) : [];
    }
    case "monthly-average": {
      const covered: WeeklyPerformanceReport[] = [];
      for (const entry of weeklyCoverageFor(
        context.weeklyReports,
        context.athleteId,
        month
      )) {
        if (entry.counts && entry.report) {
          covered.push(entry.report);
        }
      }
      return sourceRefsFor([
        ...covered,
        ...(context.datedAssessments ?? []).filter((record) =>
          record.assessedOn.startsWith(month)
        ),
      ]);
    }
    case "weekly": {
      const covered: WeeklyPerformanceReport[] = [];
      for (const entry of weeklyCoverageFor(
        context.weeklyReports,
        context.athleteId,
        month
      )) {
        if (entry.counts && entry.report) {
          covered.push(entry.report);
        }
      }
      return sourceRefsFor(covered);
    }
    case "training-load": {
      const plan = coveringPlanForNextMonth(
        context.plans,
        context.athleteId,
        month
      );
      return plan ? sourceRefsFor([plan]) : [];
    }
    case "conditioning": {
      const coverage = conditioningCoverageFor(
        context.assessments,
        context.programmes,
        context.athleteId,
        month
      );
      return sourceRefsFor(
        [coverage.assessment, coverage.programme].filter(
          (record) => record !== undefined
        )
      );
    }
    case "review": {
      return context.monthlyReport
        ? sourceRefsFor([context.monthlyReport])
        : [];
    }
    // oxlint-disable-next-line eslint(no-unreachable)
    default: {
      return unreachableStep(step);
    }
  }
};

export interface CycleStepView {
  /** Human-readable reasons the step cannot be completed right now. */
  blockers: string[];
  currentSources: CycleSourceReference[];
  step: MonthlyCycleStep;
  stored: MonthlyCycleStepState;
  status: MonthlyCycleStepStatus;
}

export interface CycleView {
  currentStep: MonthlyCycleStep;
  /** First step that is not complete/exception, or undefined when done. */
  nextOpenStep: MonthlyCycleStep | undefined;
  percent: number;
  queueState: CycleQueueState;
  steps: Record<MonthlyCycleStep, CycleStepView>;
}

export const reviewBlockedBy = (
  cycle: MonthlyAthleteCycle,
  context: CycleDomainContext,
  month: string
): string[] => {
  const blockers: string[] = [];
  for (const step of [
    "profile",
    "equipment",
    "weekly",
    "monthly-average",
    "training-load",
    "conditioning",
  ] as const) {
    const stored = cycle.steps[step];
    const status = effectiveStepStatus(
      stored,
      currentSourcesFor(step, context, month)
    );
    if (status === "pending") {
      blockers.push(step);
    }
  }
  if (!context.monthlyReport || context.monthlyReport.status !== "complete") {
    blockers.push("report");
  }
  return blockers;
};

export const deriveCycleView = (
  cycle: MonthlyAthleteCycle,
  context: CycleDomainContext
): CycleView => {
  const { month } = cycle;
  const viewFor = (step: MonthlyCycleStep): CycleStepView => {
    const stored = cycle.steps[step];
    const currentSources = currentSourcesFor(step, context, month);
    return {
      blockers: blockersFor(step, stored, context, month),
      currentSources,
      status: effectiveStepStatus(stored, currentSources),
      step,
      stored,
    };
  };
  const steps = {
    conditioning: viewFor("conditioning"),
    equipment: viewFor("equipment"),
    "monthly-average": viewFor("monthly-average"),
    profile: viewFor("profile"),
    review: viewFor("review"),
    "training-load": viewFor("training-load"),
    weekly: viewFor("weekly"),
  } satisfies Record<MonthlyCycleStep, CycleStepView>;

  const order: MonthlyCycleStep[] = [
    "profile",
    "equipment",
    "weekly",
    "monthly-average",
    "training-load",
    "conditioning",
    "review",
  ];
  const nextOpenStep = order.find(
    (step) => steps[step].status === "pending" || steps[step].status === "stale"
  );
  const done = order.filter(
    (step) => steps[step].status !== "pending" && steps[step].status !== "stale"
  ).length;
  const percent = Math.round((done / order.length) * 100);

  const hasStale = order.some((step) => steps[step].status === "stale");
  const pastUncovered = weeklyCoverageFor(
    context.weeklyReports,
    cycle.athleteId,
    month
  ).some(
    (entry) =>
      !entry.counts && entry.weekStart <= format(new Date(), "yyyy-MM-dd")
  );
  let queueState: CycleQueueState = "in-progress";
  if (hasStale || pastUncovered) {
    queueState = "needs-attention";
  } else if (cycle.status === "complete") {
    queueState = "complete";
  }

  return {
    currentStep: cycle.lastVisitedStep,
    nextOpenStep,
    percent,
    queueState,
    steps,
  };
};

const profileBlockers = (context: CycleDomainContext): string[] => {
  const athleteName = context.athlete?.fullName ?? "This athlete";
  return context.athlete ? [] : [`${athleteName} could not be found.`];
};

const equipmentBlockers = (
  stored: MonthlyCycleStepState,
  context: CycleDomainContext,
  month: string
): string[] => {
  const setup = setupEffectiveBy(context.equipmentSetups, monthEndDate(month));
  if (setup || stored.status === "exception") {
    return [];
  }
  return [
    "Confirm the equipment in use, record a new setup, or document that no change was made.",
  ];
};

const weeklyBlockers = (
  stored: MonthlyCycleStepState,
  context: CycleDomainContext,
  month: string
): string[] => {
  if (stored.status === "exception") {
    return [];
  }
  const uncovered = weeklyCoverageFor(
    context.weeklyReports,
    context.athleteId,
    month
  ).filter((entry) => !entry.counts).length;
  if (uncovered === 0) {
    return [];
  }
  const total = expectedMondays(month).length;
  return [
    `${uncovered} of ${total} expected weeks ${uncovered === 1 ? "is" : "are"} not covered by a report or an exception.`,
  ];
};

const trainingLoadBlockers = (
  stored: MonthlyCycleStepState,
  context: CycleDomainContext,
  month: string
): string[] => {
  const plan = coveringPlanForNextMonth(
    context.plans,
    context.athleteId,
    month
  );
  if (plan || stored.status === "exception") {
    return [];
  }
  return [
    "A training load plan must cover the following month, or a planning exception must be documented.",
  ];
};

const conditioningBlockers = (
  stored: MonthlyCycleStepState,
  context: CycleDomainContext,
  month: string
): string[] => {
  const coverage = conditioningCoverageFor(
    context.assessments,
    context.programmes,
    context.athleteId,
    month
  );
  if (
    (coverage.assessment && coverage.programme) ||
    stored.status === "exception"
  ) {
    return [];
  }
  const gaps: string[] = [];
  if (!coverage.assessment) {
    gaps.push("a conditioning assessment dated within the month");
  }
  if (!coverage.programme) {
    gaps.push("a programme covering the following period");
  }
  return [
    `Conditioning needs ${gaps.join(" and ")}, or a documented exemption.`,
  ];
};

const blockersFor = (
  step: MonthlyCycleStep,
  stored: MonthlyCycleStepState,
  context: CycleDomainContext,
  month: string
): string[] => {
  switch (step) {
    case "conditioning": {
      return conditioningBlockers(stored, context, month);
    }
    case "equipment": {
      return equipmentBlockers(stored, context, month);
    }
    case "monthly-average": {
      return [];
    }
    case "profile": {
      return profileBlockers(context);
    }
    case "review": {
      return [];
    }
    case "training-load": {
      return trainingLoadBlockers(stored, context, month);
    }
    case "weekly": {
      return weeklyBlockers(stored, context, month);
    }
    // oxlint-disable-next-line eslint(no-unreachable)
    default: {
      return unreachableStep(step);
    }
  }
};

/**
 * The next active athlete, in roster order, without a complete cycle for the
 * month. `excludeCycleId` skips the cycle being finished just now.
 */
export const nextIncompleteAthlete = (
  athletes: Athlete[],
  cycles: MonthlyAthleteCycle[],
  month: string,
  excludeCycleId?: string
): Athlete | undefined =>
  athletes.find(
    (athlete) =>
      athlete.status === "active" &&
      !cycles.some(
        (cycle) =>
          cycle.id !== excludeCycleId &&
          cycle.athleteId.toLowerCase() === athlete.id.toLowerCase() &&
          cycle.month === month &&
          cycle.status === "complete"
      ) &&
      !cycles.some(
        (cycle) =>
          cycle.id === excludeCycleId &&
          cycle.athleteId.toLowerCase() === athlete.id.toLowerCase() &&
          cycle.month === month
      )
  );

export interface MonthlyAverageSummary {
  attendanceDays: number;
  load: { completion: number; planned: number; shot: number };
  scoring: ReturnType<typeof scoreSummary>;
}

/** Derived view data only — never persisted as another average record. */
export const monthlyAverageFor = (
  reports: WeeklyPerformanceReport[],
  athleteId: string,
  month: string
): MonthlyAverageSummary => {
  const scoped = reports.filter(
    (report) =>
      report.athleteId === athleteId && report.weekStart.startsWith(month)
  );
  const load = loadSummary(scoped, month);
  const attendanceDays = scoped.reduce(
    (total, report) => total + (report.trainingDays ?? 0),
    0
  );
  return { attendanceDays, load, scoring: scoreSummary(scoped, month) };
};
