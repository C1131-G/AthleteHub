import {
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import type { Athlete } from "@/features/athlete/athlete-types";

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

const run = (
  athletes: Athlete[],
  reports: WeeklyPerformanceReport[],
  filters: Partial<Parameters<typeof dashboardMetrics>[0]["filters"]> = {}
) =>
  dashboardMetrics({
    athletes,
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
