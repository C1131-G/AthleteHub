import {
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import type { Athlete } from "@/features/athlete/athlete-types";
import type { ConditioningAssessment } from "@/features/conditioning/conditioning-types";
import type { EquipmentSetup } from "@/features/equipment/equipment-types";
import type { WeeklyPerformanceReport } from "@/features/report/report-types";
import type { ArcherySession } from "@/features/session/session-types";
import type { SeasonTrainingPlan } from "@/features/training-plan/training-plan-types";

import {
  conditioningCoverageFor,
  coveringPlanForNextMonth,
  currentSourcesFor,
  deriveCycleView,
  expectedMondays,
  monthlyAverageFor,
  monthEndDate,
  nextIncompleteAthlete,
  overdueAthletes,
  setupEffectiveBy,
  sourcesMatch,
  weeklyCoverageFor,
  weeklyReportCounts,
} from "./monthly-cycle-lifecycle";
import type {
  CycleDomainContext,
  ConditioningProgrammeRef,
} from "./monthly-cycle-lifecycle";
import { blankCycleSteps } from "./monthly-cycle-types";
import type { MonthlyAthleteCycle } from "./monthly-cycle-types";

bunDescribe("expected mondays", () => {
  bunTest("finds four mondays in a four-monday month", () => {
    bunExpect(expectedMondays("2026-02")).toEqual([
      "2026-02-02",
      "2026-02-09",
      "2026-02-16",
      "2026-02-23",
    ]);
  });

  bunTest("finds five mondays in a five-monday month", () => {
    bunExpect(expectedMondays("2026-08")).toEqual([
      "2026-08-03",
      "2026-08-10",
      "2026-08-17",
      "2026-08-24",
      "2026-08-31",
    ]);
  });

  bunTest("returns nothing for a malformed month", () => {
    bunExpect(expectedMondays("2026-13")).toEqual([]);
    bunExpect(expectedMondays("september")).toEqual([]);
  });

  bunTest("resolves the last day of the month", () => {
    bunExpect(monthEndDate("2026-02")).toBe("2026-02-28");
    bunExpect(monthEndDate("2026-08")).toBe("2026-08-31");
    bunExpect(monthEndDate("bad")).toBe("");
  });
});

const weeklyReport = (
  overrides: Partial<WeeklyPerformanceReport> = {}
): WeeklyPerformanceReport => ({
  absenceReason: "",
  actionItems: [],
  arrowsPlanned: 900,
  arrowsShot: 850,
  athleteId: "athlete-1",
  createdAt: "2026-08-03T09:00:00.000Z",
  distanceM: 70,
  id: "week-1",
  maxScore: 360,
  performanceNotes: "",
  scores: [300, 310],
  status: "completed",
  trainingDays: 5,
  updatedAt: "2026-08-03T09:00:00.000Z",
  weekStart: "2026-08-03",
  ...overrides,
});

bunDescribe("weekly report coverage", () => {
  bunTest("counts a completed report with scores", () => {
    bunExpect(weeklyReportCounts(weeklyReport())).toBe(true);
  });

  bunTest("does not count a completed report without scores", () => {
    bunExpect(weeklyReportCounts(weeklyReport({ scores: [] }))).toBe(false);
  });

  bunTest("does not count scores above the maximum", () => {
    bunExpect(weeklyReportCounts(weeklyReport({ scores: [300, 400] }))).toBe(
      false
    );
  });

  bunTest("requires a reason for medical leave", () => {
    bunExpect(
      weeklyReportCounts(
        weeklyReport({ absenceReason: "", status: "medical-leave" })
      )
    ).toBe(false);
    bunExpect(
      weeklyReportCounts(
        weeklyReport({ absenceReason: "Flu", status: "medical-leave" })
      )
    ).toBe(true);
  });

  bunTest("requires a reason for absence", () => {
    bunExpect(
      weeklyReportCounts(
        weeklyReport({ absenceReason: "Travel", status: "absent" })
      )
    ).toBe(true);
  });

  bunTest("covers every expected monday for the athlete", () => {
    const coverage = weeklyCoverageFor(
      [
        weeklyReport(),
        weeklyReport({
          athleteId: "athlete-2",
          id: "week-other",
          weekStart: "2026-08-03",
        }),
        weeklyReport({ id: "week-2", weekStart: "2026-08-10" }),
      ],
      "athlete-1",
      "2026-08"
    );
    bunExpect(coverage).toHaveLength(5);
    bunExpect(coverage[0]?.counts).toBe(true);
    bunExpect(coverage[1]?.counts).toBe(true);
    bunExpect(coverage[2]?.counts).toBe(false);
  });

  bunTest("the newest report for a week wins", () => {
    const coverage = weeklyCoverageFor(
      [
        weeklyReport({ id: "old", updatedAt: "2026-08-03T08:00:00.000Z" }),
        weeklyReport({
          id: "newest",
          scores: [],
          updatedAt: "2026-08-03T10:00:00.000Z",
        }),
      ],
      "athlete-1",
      "2026-08"
    );
    bunExpect(coverage[0]?.report?.id).toBe("newest");
    bunExpect(coverage[0]?.counts).toBe(false);
  });
});

const equipmentSetup = (
  overrides: Partial<EquipmentSetup> = {}
): EquipmentSetup => ({
  athleteId: "athlete-1",
  coachNotes: "",
  createdAt: "2026-08-01T00:00:00.000Z",
  id: "setup-1",
  items: [],
  recordedAt: "2026-08-01",
  updatedAt: "2026-08-01T00:00:00.000Z",
  ...overrides,
});

bunDescribe("equipment effective date", () => {
  const setups = [
    equipmentSetup({ id: "june", recordedAt: "2026-06-15" }),
    equipmentSetup({ id: "august", recordedAt: "2026-08-20" }),
    equipmentSetup({ id: "september", recordedAt: "2026-09-05" }),
  ];

  bunTest("picks the latest setup recorded by the month end", () => {
    const effective = setupEffectiveBy(setups, "2026-08-31");
    bunExpect(effective?.id).toBe("august");
  });

  bunTest("ignores setups recorded after the date", () => {
    const effective = setupEffectiveBy(setups, "2026-07-31");
    bunExpect(effective?.id).toBe("june");
  });

  bunTest("returns nothing before any setup", () => {
    bunExpect(setupEffectiveBy(setups, "2026-01-31")).toBeUndefined();
  });
});

const seasonPlan = (
  overrides: Partial<SeasonTrainingPlan> = {}
): SeasonTrainingPlan => ({
  athleteId: "athlete-1",
  createdAt: "2026-08-01T00:00:00.000Z",
  endsOn: "2026-10-31",
  events: [],
  id: "plan-1",
  name: "Season",
  startsOn: "2026-08-01",
  status: "active",
  strategyNotes: "",
  updatedAt: "2026-08-01T00:00:00.000Z",
  weeks: [],
  ...overrides,
});

bunDescribe("training plan coverage", () => {
  bunTest("finds the plan covering the following month", () => {
    const plan = coveringPlanForNextMonth(
      [seasonPlan()],
      "athlete-1",
      "2026-08"
    );
    bunExpect(plan?.id).toBe("plan-1");
  });

  bunTest("ignores plans that end before the following month", () => {
    const plan = coveringPlanForNextMonth(
      [seasonPlan({ endsOn: "2026-08-31" })],
      "athlete-1",
      "2026-08"
    );
    bunExpect(plan).toBeUndefined();
  });

  bunTest("ignores other athletes' plans", () => {
    const plan = coveringPlanForNextMonth(
      [seasonPlan({ athleteId: "athlete-2" })],
      "athlete-1",
      "2026-08"
    );
    bunExpect(plan).toBeUndefined();
  });
});

const assessment = (
  overrides: Partial<ConditioningAssessment> = {}
): ConditioningAssessment => ({
  assessedOn: "2026-08-12",
  athleteId: "athlete-1",
  coachSummary: "",
  createdAt: "2026-08-12T00:00:00.000Z",
  developmentAreas: [],
  id: "assessment-1",
  recommendations: [],
  restrictionNotes: "",
  results: [],
  status: "completed",
  strengths: [],
  updatedAt: "2026-08-12T00:00:00.000Z",
  ...overrides,
});

const programme = (overrides: Partial<ConditioningProgrammeRef> = {}) => ({
  athleteId: "athlete-1",
  endsOn: "2026-10-15",
  id: "programme-1",
  startsOn: "2026-09-01",
  status: "active",
  updatedAt: "2026-09-01T00:00:00.000Z",
  ...overrides,
});

bunDescribe("conditioning coverage", () => {
  bunTest("finds an assessment dated within the month", () => {
    const coverage = conditioningCoverageFor(
      [assessment()],
      [programme()],
      "athlete-1",
      "2026-08"
    );
    bunExpect(coverage.assessment?.id).toBe("assessment-1");
    bunExpect(coverage.programme?.id).toBe("programme-1");
  });

  bunTest("ignores assessments from other months", () => {
    const coverage = conditioningCoverageFor(
      [assessment({ assessedOn: "2026-07-12" })],
      [],
      "athlete-1",
      "2026-08"
    );
    bunExpect(coverage.assessment).toBeUndefined();
  });

  bunTest("requires the programme to cover the following month", () => {
    const coverage = conditioningCoverageFor(
      [assessment()],
      [programme({ endsOn: "2026-08-31" })],
      "athlete-1",
      "2026-08"
    );
    bunExpect(coverage.programme).toBeUndefined();
  });
});

bunDescribe("stale source detection", () => {
  bunTest("matching sources are not stale", () => {
    bunExpect(
      sourcesMatch([{ id: "a", updatedAt: "1" }], [{ id: "a", updatedAt: "1" }])
    ).toBe(true);
  });

  bunTest("a changed version is stale", () => {
    bunExpect(
      sourcesMatch([{ id: "a", updatedAt: "1" }], [{ id: "a", updatedAt: "2" }])
    ).toBe(false);
  });

  bunTest("a removed record is stale", () => {
    bunExpect(sourcesMatch([{ id: "a", updatedAt: "1" }], [])).toBe(false);
  });

  bunTest("new data after a no-source confirmation is stale", () => {
    bunExpect(sourcesMatch([], [{ id: "a", updatedAt: "1" }])).toBe(false);
  });
});

const athlete = (overrides: Partial<Athlete> = {}): Athlete => ({
  armSpanCm: 180,
  athleteId: "AH-001",
  category: "recurve",
  createdAt: "2026-08-01T00:00:00.000Z",
  dateOfBirth: "2005-04-01",
  equipmentNotes: "",
  fullName: "Jatin Kumar",
  heightCm: 178,
  id: "athlete-1",
  status: "active",
  technicalFocus: "",
  updatedAt: "2026-08-01T00:00:00.000Z",
  weightKg: 70,
  ...overrides,
});

const cycle = (
  overrides: Partial<MonthlyAthleteCycle> = {}
): MonthlyAthleteCycle => ({
  athleteId: "athlete-1",
  createdAt: "2026-08-01T00:00:00.000Z",
  id: "cycle-1",
  lastVisitedStep: "profile",
  month: "2026-08",
  status: "in-progress",
  steps: blankCycleSteps(),
  updatedAt: "2026-08-01T00:00:00.000Z",
  ...overrides,
});

const context = (
  overrides: Partial<CycleDomainContext> = {}
): CycleDomainContext => ({
  assessments: [],
  athlete: athlete(),
  athleteId: "athlete-1",
  equipmentSetups: [],
  monthlyReport: undefined,
  plans: [],
  programmes: [],
  sessions: [],
  weeklyReports: [],
  ...overrides,
});

const trainingSession = (
  overrides: Partial<ArcherySession> = {}
): ArcherySession => ({
  athleteId: "athlete-1",
  createdAt: "2026-08-05T00:00:00.000Z",
  date: "2026-08-05",
  ends: [],
  format: {
    arrowsPerEnd: 6,
    bowCategory: "recurve",
    distanceM: 70,
    indoor: false,
    maxScorePerArrow: 10,
    targetFaceCm: 122,
  },
  id: "s1",
  kind: "practice",
  notes: "",
  status: "complete",
  technicalFocus: "",
  updatedAt: "2026-08-05T00:00:00.000Z",
  ...overrides,
});

bunDescribe("derive cycle view", () => {
  bunTest("a fresh cycle starts at profile with zero progress", () => {
    const view = deriveCycleView(cycle({ month: "2026-09" }), context());
    bunExpect(view.currentStep).toBe("profile");
    bunExpect(view.nextOpenStep).toBe("profile");
    bunExpect(view.percent).toBe(0);
    bunExpect(view.queueState).toBe("in-progress");
    bunExpect(view.steps.profile?.blockers).toEqual([]);
  });

  bunTest("a referenced record changed after confirmation is stale", () => {
    const confirmed = cycle({
      steps: {
        ...blankCycleSteps(),
        profile: {
          sources: [{ id: "athlete-1", updatedAt: "2026-08-01T00:00:00.000Z" }],
          status: "complete",
        },
      },
    });
    const stale = deriveCycleView(
      confirmed,
      context({ athlete: athlete({ updatedAt: "2026-08-05T00:00:00.000Z" }) })
    );
    bunExpect(stale.steps.profile?.status).toBe("stale");
    bunExpect(stale.queueState).toBe("needs-attention");

    const fresh = deriveCycleView(confirmed, context());
    bunExpect(fresh.steps.profile?.status).toBe("complete");
    bunExpect(fresh.percent).toBe(14);
  });

  bunTest("progress counts completed and excepted steps", () => {
    const steps = blankCycleSteps();
    steps.profile.status = "complete";
    steps.profile.sources = [
      { id: "athlete-1", updatedAt: "2026-08-01T00:00:00.000Z" },
    ];
    steps.equipment.status = "exception";
    const view = deriveCycleView(cycle({ steps }), context());
    bunExpect(view.percent).toBe(29);
  });

  bunTest("a past uncovered monday needs attention", () => {
    const view = deriveCycleView(
      cycle(),
      context({
        weeklyReports: [weeklyReport({ id: "r1", weekStart: "2026-08-03" })],
      })
    );
    bunExpect(view.queueState).toBe("needs-attention");
  });

  bunTest("weekly blockers name the missing weeks", () => {
    const view = deriveCycleView(cycle(), context());
    bunExpect(view.steps.weekly?.blockers?.[0]).toContain("5 of 5");
  });

  bunTest("the weekly step watches sessions in the month", () => {
    const sources = currentSourcesFor(
      "weekly",
      context({ sessions: [trainingSession()] }),
      "2026-08"
    );
    bunExpect(sources).toContainEqual({
      id: "s1",
      updatedAt: "2026-08-05T00:00:00.000Z",
    });
  });

  bunTest("sessions outside the month do not touch the weekly step", () => {
    const sources = currentSourcesFor(
      "weekly",
      context({
        sessions: [trainingSession({ date: "2026-09-02", id: "s2" })],
      }),
      "2026-08"
    );
    bunExpect(sources).toEqual([]);
  });

  bunTest(
    "a new session after confirmation makes the weekly step stale",
    () => {
      const confirmed = cycle({
        steps: {
          ...blankCycleSteps(),
          weekly: { sources: [], status: "complete" },
        },
      });
      const edited = deriveCycleView(
        confirmed,
        context({ sessions: [trainingSession()] })
      );
      bunExpect(edited.steps.weekly?.status).toBe("stale");

      const reconfirmed = cycle({
        steps: {
          ...blankCycleSteps(),
          weekly: {
            sources: [{ id: "s1", updatedAt: "2026-08-05T00:00:00.000Z" }],
            status: "complete",
          },
        },
      });
      const fresh = deriveCycleView(
        reconfirmed,
        context({ sessions: [trainingSession()] })
      );
      bunExpect(fresh.steps.weekly?.status).toBe("complete");
    }
  );
});

bunDescribe("next incomplete athlete", () => {
  const athletes = [
    athlete({ id: "a1" }),
    athlete({ id: "a2", status: "medical-leave" }),
    athlete({ id: "a3" }),
    athlete({ id: "a4" }),
  ];

  bunTest("skips complete cycles and the cycle just completed", () => {
    const cycles = [
      cycle({ athleteId: "a1", id: "c1", status: "complete" }),
      cycle({ athleteId: "a3", id: "c3" }),
    ];
    bunExpect(nextIncompleteAthlete(athletes, cycles, "2026-08")).toBe(
      athletes[2]
    );
    bunExpect(nextIncompleteAthlete(athletes, cycles, "2026-08", "c1")).toBe(
      athletes[2]
    );
  });

  bunTest("matching is case-insensitive on athlete id", () => {
    const cycles = [cycle({ athleteId: "A1", id: "c1", status: "complete" })];
    bunExpect(nextIncompleteAthlete(athletes, cycles, "2026-08")).toBe(
      athletes[2]
    );
  });

  bunTest("returns nothing when everyone is complete", () => {
    const cycles = athletes.map((entry, index) =>
      cycle({ athleteId: entry.id, id: `c${index}`, status: "complete" })
    );
    bunExpect(
      nextIncompleteAthlete(athletes, cycles, "2026-08")
    ).toBeUndefined();
  });
});

bunDescribe("monthly averages", () => {
  bunTest("derives distance-separated scores, load, and attendance", () => {
    const summary = monthlyAverageFor(
      [
        weeklyReport({ scores: [300, 320] }),
        weeklyReport({ distanceM: 50, id: "r2", weekStart: "2026-08-10" }),
        weeklyReport({
          absenceReason: "Travel",
          arrowsShot: 0,
          distanceM: undefined,
          id: "r3",
          scores: [],
          status: "absent",
          trainingDays: 0,
          weekStart: "2026-08-17",
        }),
      ],
      "athlete-1",
      "2026-08"
    );
    bunExpect(summary.scoring).toHaveLength(2);
    const seventy = summary.scoring.find((entry) => entry.distanceM === 70);
    bunExpect(seventy?.total).toBe(620);
    bunExpect(seventy?.rounds).toBe(2);
    bunExpect(summary.load.planned).toBe(2700);
    bunExpect(summary.load.shot).toBe(1700);
    bunExpect(summary.attendanceDays).toBe(10);
  });

  bunTest("ignores other athletes and other months", () => {
    const summary = monthlyAverageFor(
      [
        weeklyReport({ athleteId: "athlete-2" }),
        weeklyReport({ weekStart: "2026-09-07" }),
      ],
      "athlete-1",
      "2026-08"
    );
    bunExpect(summary.scoring).toEqual([]);
    bunExpect(summary.load.planned).toBe(0);
  });

  bunDescribe("overdue athletes", () => {
    const roster = [
      athlete({ fullName: "A", id: "athlete-1" }),
      athlete({ fullName: "B", id: "athlete-2" }),
      athlete({ fullName: "C", id: "athlete-3", status: "inactive" }),
    ];

    bunTest(
      "lists active athletes whose current-month cycle is incomplete",
      () => {
        const cycles = [
          cycle({
            athleteId: "athlete-1",
            id: "c1",
            month: "2026-07",
            status: "complete",
          }),
          cycle({
            athleteId: "athlete-2",
            id: "c2",
            month: "2026-07",
            status: "in-progress",
          }),
        ];
        const overdue = overdueAthletes(roster, cycles, "2026-07", "2026-07");
        bunExpect(overdue.map((entry) => entry.id)).toEqual(["athlete-2"]);
      }
    );

    bunTest("an in-progress cycle stays overdue however far it got", () => {
      const cycles = [
        cycle({
          athleteId: "athlete-1",
          id: "c1",
          month: "2026-07",
          status: "in-progress",
        }),
      ];
      const overdue = overdueAthletes(roster, cycles, "2026-07", "2026-07");
      // An in-progress cycle is not finished: athletes 1 and 2 are both
      // overdue, and the inactive athlete 3 stays out of the reminders.
      bunExpect(overdue.map((entry) => entry.id)).toEqual([
        "athlete-1",
        "athlete-2",
      ]);
    });

    bunTest("past months stay overdue without a complete cycle", () => {
      const overdue = overdueAthletes(roster, [], "2026-06", "2026-07");
      bunExpect(overdue.map((entry) => entry.id)).toEqual([
        "athlete-1",
        "athlete-2",
      ]);
    });

    bunTest("future months are never overdue", () => {
      bunExpect(overdueAthletes(roster, [], "2026-08", "2026-07")).toEqual([]);
    });
  });
});
