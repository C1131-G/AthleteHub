import {
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import { loadSummary, scoreSummary } from "./report-calculations";
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
