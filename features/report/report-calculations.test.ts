import {
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import type { ArcherySession } from "../session/session-types";
import {
  loadSummary,
  scoreSummary,
  sessionSummaryForWeek,
} from "./report-calculations";
import type { WeeklyPerformanceReport } from "./report-types";

const weekly = (
  overrides: Partial<WeeklyPerformanceReport>
): WeeklyPerformanceReport => ({
  absenceReason: "",
  actionItems: [],
  athleteId: "athlete-1",
  createdAt: "2026-07-01T00:00:00.000Z",
  id: crypto.randomUUID(),
  performanceNotes: "",
  scores: [80, 90],
  status: "completed",
  updatedAt: "2026-07-01T00:00:00.000Z",
  weekStart: "2026-07-06",
  ...overrides,
});

bunDescribe("report calculations", () => {
  bunTest("keeps score averages grouped by distance", () => {
    const result = scoreSummary(
      [
        weekly({ distanceM: 18, scores: [80, 90] }),
        weekly({ distanceM: 70, scores: [60, 70] }),
      ],
      "2026-07"
    );
    bunExpect(result).toEqual([
      { average: 85, distanceM: 18, rounds: 2, total: 170 },
      { average: 65, distanceM: 70, rounds: 2, total: 130 },
    ]);
  });

  bunTest("calculates planned and shot load", () => {
    bunExpect(
      loadSummary(
        [
          weekly({ arrowsPlanned: 100, arrowsShot: 80 }),
          weekly({
            arrowsPlanned: 50,
            arrowsShot: 50,
            weekStart: "2026-07-13",
          }),
        ],
        "2026-07"
      )
    ).toEqual({ completion: 86.66666666666667, planned: 150, shot: 130 });
  });
});

const session = (overrides: Partial<ArcherySession>): ArcherySession => ({
  athleteId: "athlete-1",
  createdAt: "2026-09-01T00:00:00.000Z",
  date: "2026-09-02",
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
  updatedAt: "2026-09-01T00:00:00.000Z",
  ...overrides,
});

bunDescribe("session week summary", () => {
  bunTest("counts completed sessions inside the week", () => {
    bunExpect(
      sessionSummaryForWeek(
        [
          session({ actualArrows: 30, date: "2026-09-02" }),
          session({
            actualArrows: 60,
            date: "2026-09-05",
            format: {
              arrowsPerEnd: 6,
              bowCategory: "recurve",
              distanceM: 18,
              indoor: true,
              maxScorePerArrow: 10,
              targetFaceCm: 40,
            },
          }),
          session({ actualArrows: 999, date: "2026-09-03", status: "draft" }),
          session({
            actualArrows: 999,
            athleteId: "athlete-2",
            date: "2026-09-04",
          }),
          session({ actualArrows: 999, date: "2026-08-25" }),
        ],
        "athlete-1",
        "2026-09-01"
      )
    ).toEqual({ arrowsShot: 90, distanceM: 18, trainingDays: 2 });
  });

  bunTest("falls back to end totals when actualArrows is absent", () => {
    bunExpect(
      sessionSummaryForWeek(
        [
          session({
            date: "2026-09-02",
            ends: [
              { arrowCount: 6, score: 48 },
              { arrowCount: 6, score: 51 },
            ],
          }),
        ],
        "athlete-1",
        "2026-09-01"
      )
    ).toEqual({ arrowsShot: 12, distanceM: 70, trainingDays: 1 });
  });

  bunTest("summarises an empty week as zero", () => {
    bunExpect(sessionSummaryForWeek([], "athlete-1", "2026-09-01")).toEqual({
      arrowsShot: 0,
      distanceM: undefined,
      trainingDays: 0,
    });
  });
});
