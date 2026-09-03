import {
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import type { Athlete } from "@/features/athlete/athlete-types";
import type { SeasonTrainingPlan } from "@/features/training-plan/training-plan-types";

import { dashboardMetrics } from "./dashboard-metrics";
import type { WeeklyPerformanceReport } from "./report-types";

const athlete = (overrides: Partial<Athlete>): Athlete => ({
  athleteId: "AH-001",
  category: "recurve",
  createdAt: "2026-01-01T00:00:00.000Z",
  dateOfBirth: "2005-01-01",
  equipmentNotes: "",
  fullName: "Test Athlete",
  id: "a1",
  status: "active",
  technicalFocus: "",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const weekly = (
  overrides: Partial<WeeklyPerformanceReport>
): WeeklyPerformanceReport => ({
  absenceReason: "",
  actionItems: [],
  athleteId: "a1",
  createdAt: "2026-07-01T00:00:00.000Z",
  id: crypto.randomUUID(),
  performanceNotes: "",
  scores: [],
  status: "completed",
  updatedAt: "2026-07-01T00:00:00.000Z",
  weekStart: "2026-07-06",
  ...overrides,
});

const trainingPlan = (
  overrides: Partial<SeasonTrainingPlan> = {}
): SeasonTrainingPlan => ({
  athleteId: "a1",
  createdAt: "2026-06-01T00:00:00.000Z",
  endsOn: "2026-07-31",
  events: [],
  id: "p1",
  name: "Season 2026",
  startsOn: "2026-07-01",
  status: "active",
  strategyNotes: "",
  updatedAt: "2026-06-01T00:00:00.000Z",
  weeks: [
    {
      arrowsPlanned: 1200,
      id: "w1",
      technicalFocus: "",
      trainingDaysPlanned: 6,
      weekStart: "2026-07-06",
    },
    {
      arrowsPlanned: 1400,
      id: "w2",
      technicalFocus: "",
      trainingDaysPlanned: 6,
      weekStart: "2026-07-13",
    },
  ],
  ...overrides,
});

const run = (
  athletes: Athlete[],
  reports: WeeklyPerformanceReport[],
  filters: Partial<Parameters<typeof dashboardMetrics>[0]["filters"]> = {},
  plans: SeasonTrainingPlan[] = []
) =>
  dashboardMetrics({
    athletes,
    conditioningAssessments: [],
    conditioningProgrammes: [],
    equipmentFor: () => [],
    filters: {
      athleteId: "",
      category: "",
      month: "2026-07",
      rankingDistance: 70,
      status: "",
      ...filters,
    },
    monthly: [],
    plans,
    weekly: reports,
  });

bunDescribe("dashboard metrics", () => {
  bunTest("scopes arrow load by the category filter", () => {
    const reports = [
      weekly({ arrowsPlanned: 100, arrowsShot: 90, athleteId: "a1" }),
      weekly({ arrowsPlanned: 200, arrowsShot: 100, athleteId: "a2" }),
    ];
    const athletes = [
      athlete({ category: "recurve", id: "a1" }),
      athlete({ athleteId: "AH-002", category: "compound", id: "a2" }),
    ];

    bunExpect(run(athletes, reports).load.planned).toBe(300);
    bunExpect(
      run(athletes, reports, { category: "recurve" }).load.planned
    ).toBe(100);
  });

  bunTest("keeps score series separate per distance", () => {
    const result = run(
      [athlete({})],
      [
        weekly({ distanceM: 18, scores: [280], weekStart: "2026-07-06" }),
        weekly({ distanceM: 70, scores: [300], weekStart: "2026-07-13" }),
      ]
    );
    bunExpect(result.scoreSeries.map((series) => series.distanceM)).toEqual([
      18, 70,
    ]);
  });

  bunTest("compares score change within a distance, not across them", () => {
    // 18 m improves by 20; the 70 m entry must not be compared against it.
    const result = run(
      [athlete({})],
      [
        weekly({ distanceM: 18, scores: [280], weekStart: "2026-07-06" }),
        weekly({ distanceM: 18, scores: [300], weekStart: "2026-07-13" }),
        weekly({ distanceM: 70, scores: [100], weekStart: "2026-07-20" }),
      ]
    );
    bunExpect(result.averageScoreChange).toBe(20);
  });

  bunTest("does not flag a decline when only the distance changed", () => {
    const result = run(
      [athlete({})],
      [
        weekly({ distanceM: 18, scores: [300], weekStart: "2026-07-06" }),
        weekly({ distanceM: 70, scores: [200], weekStart: "2026-07-13" }),
      ]
    );
    bunExpect(
      result.attentionRows.some((row) => row.reason === "Score decline")
    ).toBe(false);
  });
});

bunDescribe("arrow load with a training plan", () => {
  bunTest("keeps a planned week with no report as missing, not zero", () => {
    const { loadPoints } = run(
      [athlete({})],
      [weekly({ arrowsPlanned: 1200, arrowsShot: 1100 })],
      {},
      [trainingPlan()]
    );
    bunExpect(loadPoints).toHaveLength(2);
    bunExpect(loadPoints[0]?.shot).toBe(1100);
    bunExpect(loadPoints[1]?.planned).toBe(1400);
    bunExpect(loadPoints[1]?.shot).toBeUndefined();
  });

  bunTest("prefers the report's snapshot over the current plan target", () => {
    // The plan says 1200 for this week, the report recorded 900 at the time.
    const { load, loadPoints } = run(
      [athlete({})],
      [weekly({ arrowsPlanned: 900, arrowsShot: 800 })],
      {},
      [trainingPlan()]
    );
    bunExpect(loadPoints[0]?.planned).toBe(900);
    bunExpect(load.planned).toBe(900 + 1400);
  });

  bunTest("counts planned weeks from every athlete in scope", () => {
    const { loadPoints } = run(
      [athlete({}), athlete({ athleteId: "AH-002", id: "a2" })],
      [],
      {},
      [trainingPlan(), trainingPlan({ athleteId: "a2", id: "p2" })]
    );
    bunExpect(loadPoints[0]?.planned).toBe(2400);
  });

  bunTest("ignores plans for athletes filtered out of the dashboard", () => {
    const { loadPoints } = run(
      [athlete({}), athlete({ athleteId: "AH-002", id: "a2" })],
      [],
      { athleteId: "a1" },
      [trainingPlan(), trainingPlan({ athleteId: "a2", id: "p2" })]
    );
    bunExpect(loadPoints[0]?.planned).toBe(1200);
  });

  bunTest("still reports load for entries with no plan at all", () => {
    const { load, loadPoints } = run(
      [athlete({})],
      [weekly({ arrowsPlanned: 500, arrowsShot: 400 })]
    );
    bunExpect(loadPoints).toHaveLength(1);
    bunExpect(load).toEqual({ completion: 80, planned: 500, shot: 400 });
  });
});
