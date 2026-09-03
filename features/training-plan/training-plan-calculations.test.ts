import {
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import type { WeeklyPerformanceReport } from "@/features/report/report-types";

import {
  currentTechnicalFocus,
  monthlyPlannedTotals,
  planForMonth,
  planTotals,
  planWeekFor,
  planWeekProgress,
  weeklyArrowTargetsForMonth,
} from "./training-plan-calculations";
import type {
  SeasonTrainingPlan,
  TrainingPlanWeek,
} from "./training-plan-types";

const week = (
  weekStart: string,
  arrowsPlanned: number,
  overrides: Partial<TrainingPlanWeek> = {}
): TrainingPlanWeek => ({
  arrowsPlanned,
  id: `w-${weekStart}`,
  technicalFocus: `Focus ${weekStart}`,
  trainingDaysPlanned: 6,
  weekStart,
  ...overrides,
});

const plan = (
  overrides: Partial<SeasonTrainingPlan> = {}
): SeasonTrainingPlan => ({
  athleteId: "a1",
  createdAt: "2026-02-01T00:00:00.000Z",
  endsOn: "2026-04-30",
  events: [],
  id: "p1",
  name: "Season 2026",
  startsOn: "2026-03-01",
  status: "active",
  strategyNotes: "",
  updatedAt: "2026-02-01T00:00:00.000Z",
  weeks: [
    week("2026-03-02", 1000),
    week("2026-03-09", 1200),
    week("2026-04-06", 1400),
  ],
  ...overrides,
});

const report = (
  overrides: Partial<WeeklyPerformanceReport>
): WeeklyPerformanceReport => ({
  absenceReason: "",
  actionItems: [],
  athleteId: "a1",
  createdAt: "2026-03-02T00:00:00.000Z",
  id: "r1",
  performanceNotes: "",
  scores: [],
  status: "completed",
  updatedAt: "2026-03-02T00:00:00.000Z",
  weekStart: "2026-03-02",
  ...overrides,
});

bunDescribe("plan and report matching", () => {
  bunTest("pairs a report with its planned week", () => {
    const progress = planWeekProgress(plan(), [
      report({ arrowsShot: 900, trainingDays: 5, weekStart: "2026-03-02" }),
    ]);
    bunExpect(progress[0]?.actualArrows).toBe(900);
    bunExpect(progress[0]?.actualTrainingDays).toBe(5);
    bunExpect(progress[0]?.reportId).toBe("r1");
  });

  bunTest("ignores a report belonging to another athlete", () => {
    const progress = planWeekProgress(plan(), [
      report({ arrowsShot: 900, athleteId: "a2" }),
    ]);
    bunExpect(progress[0]?.actualArrows).toBeUndefined();
  });

  bunTest("keeps a planned week with no report as missing, not zero", () => {
    const progress = planWeekProgress(plan(), []);
    bunExpect(progress).toHaveLength(3);
    bunExpect(progress.every((item) => item.actualArrows === undefined)).toBe(
      true
    );
    bunExpect(progress.every((item) => item.variance === undefined)).toBe(true);
  });

  bunTest("orders the weeks chronologically", () => {
    const progress = planWeekProgress(
      plan({
        weeks: [week("2026-04-06", 1400), week("2026-03-02", 1000)],
      }),
      []
    );
    bunExpect(progress.map((item) => item.weekStart)).toEqual([
      "2026-03-02",
      "2026-04-06",
    ]);
  });

  bunTest("derives arrows per training day from the weekly target", () => {
    const progress = planWeekProgress(
      plan({ weeks: [week("2026-03-02", 1200, { trainingDaysPlanned: 6 })] }),
      []
    );
    bunExpect(progress[0]?.arrowsPerTrainingDay).toBe(200);
  });

  bunTest("finds the plan week a weekly report belongs to", () => {
    const match = planWeekFor([plan()], "a1", "2026-03-09");
    bunExpect(match?.week.arrowsPlanned).toBe(1200);
    bunExpect(planWeekFor([plan()], "a1", "2026-03-23")).toBeUndefined();
    bunExpect(planWeekFor([plan()], "a2", "2026-03-09")).toBeUndefined();
    bunExpect(planWeekFor([plan()], "", "2026-03-09")).toBeUndefined();
  });

  bunTest("prefers the active plan when two plans cover a week", () => {
    const match = planWeekFor(
      [
        plan({ id: "draft-plan", name: "Draft", status: "draft" }),
        plan({ id: "active-plan", name: "Active", status: "active" }),
      ],
      "a1",
      "2026-03-02"
    );
    bunExpect(match?.plan.id).toBe("active-plan");
  });
});

bunDescribe("plan totals", () => {
  bunTest("sums planned and actual arrows and reports completion", () => {
    const totals = planTotals(
      planWeekProgress(plan(), [
        report({ arrowsShot: 900, id: "r1", weekStart: "2026-03-02" }),
        report({ arrowsShot: 1300, id: "r2", weekStart: "2026-03-09" }),
      ])
    );
    bunExpect(totals.plannedArrows).toBe(3600);
    bunExpect(totals.actualArrows).toBe(2200);
    bunExpect(totals.missingWeeks).toBe(1);
    bunExpect(totals.recordedWeeks).toBe(2);
    bunExpect(Math.round(totals.completion)).toBe(61);
  });

  bunTest("reports variance per week and across the season", () => {
    const progress = planWeekProgress(plan(), [
      report({ arrowsShot: 900, weekStart: "2026-03-02" }),
    ]);
    bunExpect(progress[0]?.variance).toBe(-100);
    bunExpect(planTotals(progress).variance).toBe(900 - 3600);
  });

  bunTest("returns zero completion when nothing is planned", () => {
    bunExpect(planTotals([]).completion).toBe(0);
  });
});

bunDescribe("monthly derivation", () => {
  bunTest("totals planned arrows by month", () => {
    bunExpect(monthlyPlannedTotals(plan())).toEqual([
      { month: "2026-03", plannedArrows: 2200, weeks: 2 },
      { month: "2026-04", plannedArrows: 1400, weeks: 1 },
    ]);
  });

  bunTest("lists a month's weekly targets in order", () => {
    bunExpect(weeklyArrowTargetsForMonth(plan(), "2026-03")).toEqual([
      1000, 1200,
    ]);
    bunExpect(weeklyArrowTargetsForMonth(plan(), "2026-07")).toEqual([]);
  });

  bunTest("finds the plan covering a month, preferring the active one", () => {
    const plans = [
      plan({ id: "old", name: "Old", status: "completed" }),
      plan({ id: "current", name: "Current", status: "active" }),
    ];
    bunExpect(planForMonth(plans, "a1", "2026-03")?.id).toBe("current");
    bunExpect(planForMonth(plans, "a1", "2026-12")).toBeUndefined();
    bunExpect(planForMonth(plans, "a2", "2026-03")).toBeUndefined();
  });

  bunTest("covers a season that crosses a calendar year", () => {
    const crossYear = plan({
      endsOn: "2027-02-28",
      startsOn: "2026-11-01",
      weeks: [week("2026-12-07", 900), week("2027-01-04", 1100)],
    });
    bunExpect(planForMonth([crossYear], "a1", "2027-01")?.id).toBe("p1");
    bunExpect(weeklyArrowTargetsForMonth(crossYear, "2027-01")).toEqual([1100]);
  });
});

bunDescribe("current technical focus", () => {
  bunTest("uses the most recent week that has started", () => {
    bunExpect(currentTechnicalFocus(plan(), "2026-03-12")).toBe(
      "Focus 2026-03-09"
    );
  });

  bunTest("falls back to the first week before the season starts", () => {
    bunExpect(currentTechnicalFocus(plan(), "2026-01-01")).toBe(
      "Focus 2026-03-02"
    );
  });

  bunTest("returns an empty string when the plan has no weeks", () => {
    bunExpect(currentTechnicalFocus(plan({ weeks: [] }), "2026-03-12")).toBe(
      ""
    );
  });
});
