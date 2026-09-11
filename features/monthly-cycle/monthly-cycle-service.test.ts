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
import { createMonthlyCycleService } from "./monthly-cycle-service";
import type { MonthlyCycleService } from "./monthly-cycle-service";
import { blankCycleSteps } from "./monthly-cycle-types";
import type { MonthlyCycleInput } from "./monthly-cycle-types";

let directory: string;
let database: DatabaseContext;
let service: MonthlyCycleService;

bunBeforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "athlete360-cycle-"));
  database = await createDatabaseContext({
    databaseUrl: `file:${path.join(directory, "athlete360.db")}`,
  });
  service = createMonthlyCycleService(database.collections);
});

bunAfterEach(async () => {
  await database.close();
  await removeDirectory(directory);
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

bunDescribe("monthly cycle repository", () => {
  bunTest("creates and reads a cycle", async () => {
    const result = await service.create(cycleInput());
    bunExpect(result.status).toBe("saved");
    if (result.status !== "saved") {
      return;
    }
    bunExpect(result.record.id).toBeTruthy();
    const stored = await service.get(result.record.id);
    bunExpect(stored?.month).toBe("2026-08");
    bunExpect(await service.list()).toHaveLength(1);
  });

  bunTest("enforces one cycle per athlete and month", async () => {
    await service.create(cycleInput());
    const duplicate = await service.create(cycleInput());
    bunExpect(duplicate.status).toBe("duplicate");
    bunExpect(await service.list()).toHaveLength(1);
  });

  bunTest("matching is case-insensitive on athlete id", async () => {
    await service.create(cycleInput({ athleteId: "athlete-1" }));
    const duplicate = await service.create(
      cycleInput({ athleteId: "ATHLETE-1" })
    );
    bunExpect(duplicate.status).toBe("duplicate");
  });

  bunTest("the same athlete may have cycles in different months", async () => {
    await service.create(cycleInput({ month: "2026-08" }));
    const other = await service.create(cycleInput({ month: "2026-09" }));
    bunExpect(other.status).toBe("saved");
  });

  bunTest("update preserves identity and timestamps", async () => {
    const created = await service.create(cycleInput());
    if (created.status !== "saved") {
      return;
    }
    const result = await service.update(created.record.id, {
      ...cycleInput(),
      lastVisitedStep: "weekly",
      status: "in-progress",
    });
    bunExpect(result.status).toBe("saved");
    if (result.status !== "saved") {
      return;
    }
    bunExpect(result.record.createdAt).toBe(created.record.createdAt);
    bunExpect(result.record.lastVisitedStep).toBe("weekly");
    const reread = await service.get(created.record.id);
    bunExpect(reread?.status).toBe("in-progress");
  });

  bunTest("update reports a not-found cycle", async () => {
    const result = await service.update("missing", cycleInput());
    bunExpect(result.status).toBe("not-found");
  });

  bunTest("update keeps the unique athlete-month rule", async () => {
    const first = await service.create(cycleInput());
    const second = await service.create(cycleInput({ month: "2026-09" }));
    if (first.status !== "saved" || second.status !== "saved") {
      return;
    }
    const clash = await service.update(second.record.id, {
      ...cycleInput(),
    });
    bunExpect(clash.status).toBe("duplicate");
  });
});
