import {
  afterEach as bunAfterEach,
  beforeEach as bunBeforeEach,
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createDatabaseContext } from "../../electron/backend";
import type { DatabaseContext } from "../../electron/backend";
import { statusOf } from "../../lib/test/status-of";
import { removeDirectory } from "../../lib/test/temp-database";
import type { WeeklyPerformanceReportInput } from "./report-types";
import { createWeeklyReportService } from "./weekly-report-service";
import type { WeeklyReportService } from "./weekly-report-service";

let directory: string;
let database: DatabaseContext;
let service: WeeklyReportService;

bunBeforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "athletehub-report-"));
  database = await createDatabaseContext({
    databaseUrl: `file:${path.join(directory, "athletehub.db")}`,
  });
  service = createWeeklyReportService(database.collections);
});

bunAfterEach(async () => {
  await database.close();
  await removeDirectory(directory);
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
  bunTest("rejects a second entry for the same athlete and week", async () => {
    bunExpect(await statusOf(service.create(weeklyInput()))).toBe("saved");

    const duplicate = await service.create(weeklyInput());
    bunExpect(duplicate.status).toBe("duplicate");
    bunExpect(
      duplicate.status === "duplicate" ? duplicate.fieldErrors.weekStart : ""
    ).toContain("already exists");
  });

  bunTest("keeps a same-week entry for a different athlete", async () => {
    await service.create(weeklyInput());
    bunExpect(
      await statusOf(service.create(weeklyInput({ athleteId: "a2" })))
    ).toBe("saved");
    bunExpect(await service.list()).toHaveLength(2);
  });

  bunTest("trims action items and drops the empty ones", async () => {
    const result = await service.create(
      weeklyInput({ actionItems: ["  raise anchor  ", "   ", ""] })
    );
    bunExpect(
      result.status === "saved" ? result.record.actionItems : []
    ).toEqual(["raise anchor"]);
  });

  bunTest("requires a reason when the athlete was absent", async () => {
    const result = await service.create(
      weeklyInput({ absenceReason: "  ", scores: [], status: "absent" })
    );
    bunExpect(result.status).toBe("invalid");
    bunExpect(
      result.status === "invalid" ? result.fieldErrors.absenceReason : ""
    ).toBeTruthy();
  });

  bunTest("rejects a score above the stated maximum", async () => {
    const result = await service.create(
      weeklyInput({ maxScore: 300, scores: [360] })
    );
    bunExpect(result.status).toBe("invalid");
    bunExpect(
      result.status === "invalid" ? result.fieldErrors.scores : ""
    ).toBeTruthy();
  });

  bunTest("lists the most recent week first", async () => {
    await service.create(weeklyInput({ weekStart: "2026-03-02" }));
    await service.create(weeklyInput({ weekStart: "2026-03-16" }));
    await service.create(weeklyInput({ weekStart: "2026-03-09" }));

    const reports = await service.list();
    bunExpect(reports.map((report) => report.weekStart)).toEqual([
      "2026-03-16",
      "2026-03-09",
      "2026-03-02",
    ]);
  });

  bunTest("reports not-found when updating an unknown id", async () => {
    bunExpect(await statusOf(service.update("missing", weeklyInput()))).toBe(
      "not-found"
    );
  });
});
