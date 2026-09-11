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
import { removeDirectory } from "../../lib/test/temp-database";
import { createAthleteService } from "../athlete/athlete-service";
import { createMonthlyCycleService } from "../monthly-cycle/monthly-cycle-service";
import {
  blankCycleSteps,
  pendingStepState,
} from "../monthly-cycle/monthly-cycle-types";
import type { MonthlyCycleInput } from "../monthly-cycle/monthly-cycle-types";
import { createMonthlyReportService } from "../report/monthly-report-service";
import { createMonthlyDraft } from "../report/report-calculations";
import type { WeeklyPerformanceReportInput } from "../report/report-types";
import { createWeeklyReportService } from "../report/weekly-report-service";
import { createTrainingPlanService } from "../training-plan/training-plan-service";
import type { SeasonTrainingPlanInput } from "../training-plan/training-plan-types";

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

const cycleInput = (
  overrides: Partial<MonthlyCycleInput> = {}
): MonthlyCycleInput => ({
  athleteId: "athlete-1",
  lastVisitedStep: "profile",
  month: "2026-08",
  status: "not-started",
  steps: blankCycleSteps(),
  ...overrides,
});

const planInput = (overrides: Partial<SeasonTrainingPlanInput> = {}) => ({
  athleteId: "a1",
  endsOn: "2026-12-31",
  events: [],
  name: "Season A",
  startsOn: "2026-01-05",
  status: "draft" as const,
  strategyNotes: "",
  weeks: [
    {
      arrowsPlanned: 1000,
      id: "w1",
      technicalFocus: "Release",
      trainingDaysPlanned: 5,
      weekStart: "2026-01-05",
    },
  ],
  ...overrides,
});

bunDescribe("migrated collection services", () => {
  let directory: string;
  let database: DatabaseContext;

  bunBeforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), "athlete360-coll-"));
    database = await createDatabaseContext({
      databaseUrl: `file:${path.join(directory, "athlete360.db")}`,
    });
  });

  bunAfterEach(async () => {
    await database.close();
    await removeDirectory(directory);
  });

  bunTest("keeps one weekly entry per athlete and week", async () => {
    const service = createWeeklyReportService(database.collections);
    const first = await service.create(weeklyInput());
    bunExpect(first.status).toBe("saved");

    const duplicate = await service.create(weeklyInput());
    bunExpect(duplicate.status).toBe("duplicate");
    bunExpect(await service.list()).toHaveLength(1);

    // A different week for the same athlete is not a duplicate.
    const next = await service.create(weeklyInput({ weekStart: "2026-03-09" }));
    bunExpect(next.status).toBe("saved");
  });

  bunTest("keeps one monthly report per athlete and month", async () => {
    const service = createMonthlyReportService(database.collections);
    const draft = createMonthlyDraft("a1", "2026-03");
    const created = await service.create(draft);
    bunExpect(created.status).toBe("saved");
    const duplicate = await service.create(draft);
    bunExpect(duplicate.status).toBe("duplicate");
    bunExpect(await service.list()).toHaveLength(1);
  });

  bunTest("keeps one cycle per athlete and month", async () => {
    const service = createMonthlyCycleService(database.collections);
    const created = await service.create(cycleInput());
    bunExpect(created.status).toBe("saved");
    const duplicate = await service.create(cycleInput());
    bunExpect(duplicate.status).toBe("duplicate");
    bunExpect(await service.list()).toHaveLength(1);
  });

  bunTest("scopes a list to one athlete", async () => {
    const service = createWeeklyReportService(database.collections);
    await service.create(weeklyInput({ athleteId: "a1" }));
    await service.create(weeklyInput({ athleteId: "a2" }));

    bunExpect(await service.list()).toHaveLength(2);
    bunExpect(await service.list({ athleteId: "a2" })).toHaveLength(1);
  });

  bunTest("archives and restores without deleting the record", async () => {
    const service = createWeeklyReportService(database.collections);
    const created = await service.create(weeklyInput());
    if (created.status !== "saved") {
      throw new Error("expected saved");
    }

    await service.archive(created.record.id);
    bunExpect(await service.list()).toEqual([]);
    bunExpect(await service.list({ includeArchived: true })).toHaveLength(1);

    await service.restore(created.record.id);
    bunExpect(await service.list()).toHaveLength(1);
  });

  bunTest("rejects input that does not validate", async () => {
    const service = createTrainingPlanService(database.collections);
    const result = await service.create({ name: "" });
    bunExpect(result.status).toBe("invalid");
  });

  bunTest("reports a missing record instead of creating one", async () => {
    const service = createWeeklyReportService(database.collections);
    const result = await service.update("missing", weeklyInput());
    bunExpect(result.status).toBe("not-found");
  });
});

bunDescribe("cross-record rules carried over from the repositories", () => {
  let directory: string;
  let database: DatabaseContext;

  bunBeforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), "athlete360-rules-"));
    database = await createDatabaseContext({
      databaseUrl: `file:${path.join(directory, "athlete360.db")}`,
    });
  });

  bunAfterEach(async () => {
    await database.close();
    await removeDirectory(directory);
  });

  bunTest(
    "rejects a second plan with the same name for one athlete",
    async () => {
      const service = createTrainingPlanService(database.collections);
      const first = await service.create(planInput());
      bunExpect(first.status).toBe("saved");

      const duplicate = await service.create(planInput({ name: "season a" }));
      bunExpect(duplicate.status).toBe("duplicate");
    }
  );

  bunTest("allows the same plan name for a different athlete", async () => {
    const service = createTrainingPlanService(database.collections);
    await service.create(planInput());
    const other = await service.create(planInput({ athleteId: "a2" }));
    bunExpect(other.status).toBe("saved");
  });

  bunTest("allows only one active plan per athlete", async () => {
    const service = createTrainingPlanService(database.collections);
    await service.create(planInput({ status: "active" }));
    const second = await service.create(
      planInput({ name: "Season B", status: "active" })
    );
    bunExpect(second.status).toBe("duplicate");
  });

  bunTest(
    "lets an active plan stay active when it updates itself",
    async () => {
      const service = createTrainingPlanService(database.collections);
      const created = await service.create(planInput({ status: "active" }));
      if (created.status !== "saved") {
        throw new Error("expected saved");
      }
      const updated = await service.update(
        created.record.id,
        planInput({ status: "active", strategyNotes: "Adjusted" })
      );
      bunExpect(updated.status).toBe("saved");
    }
  );

  bunTest(
    "matches an existing cycle case-insensitively on athlete id",
    async () => {
      const service = createMonthlyCycleService(database.collections);
      await service.create(cycleInput({ athleteId: "Athlete-1" }));
      const duplicate = await service.create(
        cycleInput({ athleteId: "athlete-1" })
      );
      bunExpect(duplicate.status).toBe("duplicate");
    }
  );

  bunTest("fills missing cycle steps with pending state", async () => {
    const service = createMonthlyCycleService(database.collections);
    // The schema fills the missing steps; the service must persist all seven.
    const created = await service.create({
      ...cycleInput(),
      steps: { profile: pendingStepState() },
    });
    if (created.status !== "saved") {
      throw new Error("expected saved");
    }
    bunExpect(Object.keys(created.record.steps)).toHaveLength(7);
    bunExpect(created.record.steps.review.status).toBe("pending");
  });
});

bunDescribe("importing complete records", () => {
  let directory: string;
  let database: DatabaseContext;

  bunBeforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), "athlete360-import-"));
    database = await createDatabaseContext({
      databaseUrl: `file:${path.join(directory, "athlete360.db")}`,
    });
  });

  bunAfterEach(async () => {
    await database.close();
    await removeDirectory(directory);
  });

  bunTest("keeps the id and timestamps a record already has", async () => {
    const service = createWeeklyReportService(database.collections);
    const record = {
      ...weeklyInput(),
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "carried-over-id",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };

    const imported = await service.importRecord(record);
    if (imported.status !== "saved") {
      throw new Error(`expected saved, got ${imported.status}`);
    }
    // Cross-references between records are stored ids, so re-keying on import
    // would break them.
    bunExpect(imported.record.id).toBe("carried-over-id");
    bunExpect(imported.record.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  bunTest("importing the same bundle twice does not duplicate", async () => {
    const service = createWeeklyReportService(database.collections);
    const record = {
      ...weeklyInput(),
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "carried-over-id",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };

    await service.importRecord(record);
    const second = await service.importRecord(record);
    bunExpect(second.status).toBe("saved");
    bunExpect(await service.list()).toHaveLength(1);
  });

  bunTest("skips a record that no longer validates", async () => {
    const service = createWeeklyReportService(database.collections);
    const result = await service.importRecord({ id: "broken" });
    bunExpect(result.status).toBe("invalid");
    bunExpect(await service.list()).toEqual([]);
  });
});

bunDescribe("archiving releases a unique value", () => {
  let directory: string;
  let database: DatabaseContext;

  bunBeforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), "athlete360-release-"));
    database = await createDatabaseContext({
      databaseUrl: `file:${path.join(directory, "athlete360.db")}`,
    });
  });

  bunAfterEach(async () => {
    await database.close();
    await removeDirectory(directory);
  });

  bunTest(
    "a cycle can be restarted after the old one is archived",
    async () => {
      const service = createMonthlyCycleService(database.collections);
      const created = await service.create(cycleInput());
      if (created.status !== "saved") {
        throw new Error("expected saved");
      }

      await service.archive(created.record.id);
      // Archiving must not make that athlete's month unusable for good.
      const restarted = await service.create(cycleInput());
      bunExpect(restarted.status).toBe("saved");
    }
  );

  bunTest("a weekly entry can be re-entered after archiving", async () => {
    const service = createWeeklyReportService(database.collections);
    const created = await service.create(weeklyInput());
    if (created.status !== "saved") {
      throw new Error("expected saved");
    }

    await service.archive(created.record.id);
    const again = await service.create(weeklyInput());
    bunExpect(again.status).toBe("saved");
  });

  bunTest("an athlete ID frees up once the athlete is archived", async () => {
    const service = createAthleteService(database.collections);
    const input = {
      athleteId: "AH-001",
      category: "recurve",
      dateOfBirth: "2004-06-15",
      equipmentNotes: "",
      fullName: "First Archer",
      status: "active",
      technicalFocus: "Release",
    };
    const created = await service.create(input);
    if (created.status !== "saved") {
      throw new Error("expected saved");
    }

    await service.archive(created.record.id);
    const reused = await service.create({ ...input, fullName: "New Archer" });
    bunExpect(reused.status).toBe("saved");
  });
});
