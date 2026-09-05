import {
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import type { Athlete } from "@/features/athlete/athlete-types";
import type { SeasonTrainingPlan } from "@/features/training-plan/training-plan-types";

import type { ArcherySession } from "../session/session-types";
import type { Wellness } from "../wellness/wellness-types";
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

const wellness = (
  overrides: Partial<Wellness> & { date: string; sleep: number }
): Wellness => ({
  athleteId: "a1",
  createdAt: `2026-07-01T00:00:00.000Z`,
  fatigue: 8,
  id: crypto.randomUUID(),
  mood: 8,
  note: "",
  soreness: 8,
  stress: 8,
  updatedAt: "2026-07-01T00:00:00.000Z",
  ...overrides,
});

const sessionFor = (athleteId: string, score: number): ArcherySession => ({
  athleteId,
  createdAt: "2026-07-05T00:00:00.000Z",
  date: "2026-07-05",
  ends: [{ arrowCount: 6, score }],
  equipmentSetupId: undefined,
  format: {
    arrowsPerEnd: 6,
    bowCategory: "recurve",
    distanceM: 70,
    indoor: false,
    maxScorePerArrow: 10,
    roundId: undefined,
    targetFaceCm: 122,
  },
  id: `${athleteId}-s1`,
  kind: "practice",
  notes: "",
  plannedArrows: undefined,
  status: "complete",
  technicalFocus: "",
  updatedAt: "2026-07-05T00:00:00.000Z",
});

const run = (
  athletes: Athlete[],
  reports: WeeklyPerformanceReport[],
  filters: Partial<Parameters<typeof dashboardMetrics>[0]["filters"]> = {},
  plans: SeasonTrainingPlan[] = [],
  sessions: ArcherySession[] = [],
  wellnessEntries: Wellness[] = []
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
    sessionsFor: (athleteId) =>
      sessions.filter((session) => session.athleteId === athleteId),
    weekly: reports,
    wellnessFor: (athleteId) =>
      wellnessEntries.filter((entry) => entry.athleteId === athleteId),
  });

const trainingSession = (
  overrides: Partial<ArcherySession>
): ArcherySession => ({
  athleteId: "a1",
  createdAt: "2026-07-08T00:00:00.000Z",
  date: "2026-07-08",
  ends: [],
  format: {
    arrowsPerEnd: 6,
    bowCategory: "recurve",
    distanceM: 70,
    indoor: false,
    maxScorePerArrow: 10,
    targetFaceCm: 122,
  },
  id: crypto.randomUUID(),
  kind: "practice",
  notes: "",
  status: "complete",
  technicalFocus: "",
  updatedAt: "2026-07-08T00:00:00.000Z",
  ...overrides,
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

  bunTest("adds session arrows to the weekly load", () => {
    const { loadPoints } = run(
      [athlete({})],
      [],
      {},
      [trainingPlan()],
      [trainingSession({ actualArrows: 90, date: "2026-07-08" })]
    );
    bunExpect(loadPoints[0]?.weekStart).toBe("2026-07-06");
    bunExpect(loadPoints[0]?.planned).toBe(1200);
    bunExpect(loadPoints[0]?.shot).toBe(90);
  });

  bunTest("prefers recorded sessions over the typed report figure", () => {
    const { loadPoints } = run(
      [athlete({})],
      [weekly({ arrowsShot: 100, weekStart: "2026-07-06" })],
      {},
      [],
      [trainingSession({ actualArrows: 130, date: "2026-07-08" })]
    );
    bunExpect(loadPoints).toHaveLength(1);
    bunExpect(loadPoints[0]?.shot).toBe(130);
  });

  bunTest("flags weeks with sessions but no weekly report", () => {
    const { attentionRows } = run(
      [athlete({})],
      [],
      {},
      [],
      [trainingSession({ actualArrows: 90, date: "2026-07-08" })]
    );
    bunExpect(attentionRows).toContainEqual({
      athlete: "Test Athlete",
      href: "/sessions?athleteId=a1",
      reason: "Unreported sessions",
    });
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

  bunTest("an acute load spike raises an attention row", () => {
    // 28 days of 700 load (100 min × RPE 7), then a 1200/day spike week.
    const julySessions: ArcherySession[] = [];
    for (let day = 1; day <= 28; day += 1) {
      const spiked = day > 21;
      julySessions.push({
        athleteId: "a1",
        createdAt: "2026-07-01T00:00:00.000Z",
        date: `2026-07-${String(day).padStart(2, "0")}`,
        durationMin: spiked ? 150 : 100,
        ends: [],
        equipmentSetupId: undefined,
        format: {
          arrowsPerEnd: 6,
          bowCategory: "recurve",
          distanceM: 70,
          indoor: false,
          maxScorePerArrow: 10,
          roundId: undefined,
          targetFaceCm: 122,
        },
        id: `load-${day}`,
        kind: "practice",
        notes: "",
        plannedArrows: undefined,
        rpe: 7,
        status: "complete",
        technicalFocus: "",
        updatedAt: "2026-07-01T00:00:00.000Z",
      });
    }

    const spiked = run([athlete({})], [], {}, [], julySessions);
    bunExpect(
      spiked.attentionRows.some((row) => row.reason === "Load spike")
    ).toBe(true);

    // A steady week stays inside the sweet spot: no row.
    const steadySessions = julySessions.filter(
      (session) => Number(session.date.slice(-2)) <= 21
    );
    const steady = run([athlete({})], [], {}, [], steadySessions);
    bunExpect(
      steady.attentionRows.some((row) => row.reason.startsWith("Load"))
    ).toBe(false);
  });

  bunTest("a wellness drop raises an attention row", () => {
    const dropped = run(
      [athlete({})],
      [],
      {},
      [],
      [],
      [
        wellness({ date: "2026-07-20", sleep: 8 }),
        wellness({
          date: "2026-07-27",
          fatigue: 5,
          mood: 4,
          sleep: 4,
          soreness: 5,
          stress: 5,
        }),
      ]
    );
    bunExpect(
      dropped.attentionRows.some((row) => row.reason === "Wellness drop")
    ).toBe(true);

    // A small dip stays quiet.
    const stable = run(
      [athlete({})],
      [],
      {},
      [],
      [],
      [
        wellness({ date: "2026-07-20", sleep: 8 }),
        wellness({ date: "2026-07-27", sleep: 6 }),
      ]
    );
    bunExpect(
      stable.attentionRows.some((row) => row.reason === "Wellness drop")
    ).toBe(false);
  });

  bunTest("compares two athletes independently", () => {
    const second = athlete({
      athleteId: "AH-002",
      fullName: "Second",
      id: "a2",
    });
    const sessions = [sessionFor("a1", 300), sessionFor("a2", 320)];

    const reports = [
      weekly({ athleteId: "a1", distanceM: 70, scores: [300] }),
      weekly({ athleteId: "a2", distanceM: 70, scores: [320] }),
    ];
    const result = run([athlete({}), second], reports, {}, [], sessions);

    // Each athlete's ranking comes from their own reports: 320 outranks 300.
    bunExpect(result.rankingPoints.map((point) => point.label)).toEqual([
      "Second",
      "Test Athlete",
    ]);
    // Scoping to one athlete derives from that athlete's data alone.
    const onlySecond = run(
      [athlete({}), second],
      reports,
      { athleteId: "a2" },
      [],
      sessions
    );
    bunExpect(onlySecond.rankingPoints.map((point) => point.label)).toEqual([
      "Second",
    ]);
  });
});
