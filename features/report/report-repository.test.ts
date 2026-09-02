import {
  beforeEach as bunBeforeEach,
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import { reportRepository } from "./report-repository";
import type { WeeklyPerformanceReportInput } from "./report-types";

const memoryStorage = () => {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
};

bunBeforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: memoryStorage(),
  });
});

const weeklyInput = (
  overrides: Partial<WeeklyPerformanceReportInput> = {}
): WeeklyPerformanceReportInput => ({
  absenceReason: "",
  actionItems: [],
  athleteId: "a1",
  distanceM: 70,
  performanceNotes: "",
  scores: [300, 310],
  status: "completed",
  weekStart: "2026-03-02",
  ...overrides,
});

bunDescribe("report repository", () => {
  bunTest("rejects a second entry for the same athlete and week", () => {
    bunExpect(reportRepository.createWeekly(weeklyInput()).status).toBe(
      "saved"
    );

    const duplicate = reportRepository.createWeekly(weeklyInput());
    bunExpect(duplicate.status).toBe("duplicate");
    bunExpect(
      duplicate.status === "duplicate" ? duplicate.fieldErrors.weekStart : ""
    ).toContain("already exists");
  });

  bunTest("keeps a same-week entry for a different athlete", () => {
    reportRepository.createWeekly(weeklyInput());
    bunExpect(
      reportRepository.createWeekly(weeklyInput({ athleteId: "a2" })).status
    ).toBe("saved");
    bunExpect(reportRepository.listWeekly()).toHaveLength(2);
  });

  bunTest("trims action items and drops the empty ones", () => {
    const result = reportRepository.createWeekly(
      weeklyInput({ actionItems: ["  raise anchor  ", "   ", ""] })
    );
    bunExpect(
      result.status === "saved" ? result.report.actionItems : []
    ).toEqual(["raise anchor"]);
  });

  bunTest("requires a reason when the athlete was absent", () => {
    const result = reportRepository.createWeekly(
      weeklyInput({ absenceReason: "  ", scores: [], status: "absent" })
    );
    bunExpect(result.status).toBe("invalid");
    bunExpect(
      result.status === "invalid" ? result.fieldErrors.absenceReason : ""
    ).toBeTruthy();
  });

  bunTest("rejects a score above the stated maximum", () => {
    const result = reportRepository.createWeekly(
      weeklyInput({ maxScore: 300, scores: [360] })
    );
    bunExpect(result.status).toBe("invalid");
    bunExpect(
      result.status === "invalid" ? result.fieldErrors.scores : ""
    ).toBeTruthy();
  });

  bunTest("lists the most recent week first", () => {
    reportRepository.createWeekly(weeklyInput({ weekStart: "2026-03-02" }));
    reportRepository.createWeekly(weeklyInput({ weekStart: "2026-03-16" }));
    reportRepository.createWeekly(weeklyInput({ weekStart: "2026-03-09" }));

    bunExpect(
      reportRepository.listWeekly().map((report) => report.weekStart)
    ).toEqual(["2026-03-16", "2026-03-09", "2026-03-02"]);
  });

  bunTest("reports not-found when updating an unknown id", () => {
    bunExpect(
      reportRepository.updateWeekly("missing", weeklyInput()).status
    ).toBe("not-found");
  });

  bunTest("skips stored records that no longer parse", () => {
    reportRepository.createWeekly(weeklyInput());
    const key = "athletehub.weekly-reports.v1";
    const stored: unknown[] = JSON.parse(
      globalThis.localStorage.getItem(key) ?? "[]"
    );
    globalThis.localStorage.setItem(
      key,
      JSON.stringify([...stored, { id: "broken" }])
    );

    // One corrupt record must not discard the rest of the history.
    bunExpect(reportRepository.listWeekly()).toHaveLength(1);
  });
});
