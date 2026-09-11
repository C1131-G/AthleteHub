import {
  afterEach as bunAfterEach,
  beforeEach as bunBeforeEach,
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createDatabaseContext } from "../../electron/backend";
import type { DatabaseContext } from "../../electron/backend";
import { createWellnessService } from "./wellness-service";
import type { WellnessService } from "./wellness-service";

const entryInput = (date: string, overrides = {}) => ({
  athleteId: "athlete-1",
  date,
  fatigue: 4,
  mood: 7,
  note: "",
  sleep: 8,
  soreness: 3,
  stress: 2,
  ...overrides,
});

bunDescribe("wellness collection", () => {
  let directory: string;
  let database: DatabaseContext;
  let service: WellnessService;

  bunBeforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), "athlete360-wellness-"));
    database = await createDatabaseContext({
      databaseUrl: `file:${path.join(directory, "athlete360.db")}`,
    });
    service = createWellnessService(database.collections);
  });

  bunAfterEach(async () => {
    await database.close();
    try {
      await rm(directory, { force: true, maxRetries: 10, recursive: true });
    } catch {
      // Windows can release the SQLite file handle after the test exits.
    }
  });

  bunTest("saves, reads, and lists entries newest first", async () => {
    await service.create(entryInput("2026-09-01"));
    await service.create(entryInput("2026-09-05"));

    const listed = await service.list();
    bunExpect(listed.map((entry) => entry.date)).toEqual([
      "2026-09-05",
      "2026-09-01",
    ]);
    bunExpect(listed[0]?.sleep).toBe(8);
  });

  bunTest("rejects a second live entry for the same date", async () => {
    await bunExpect(
      service.create(entryInput("2026-09-01"))
    ).resolves.toMatchObject({ status: "saved" });
    await bunExpect(
      service.create(entryInput("2026-09-01"))
    ).resolves.toMatchObject({ status: "duplicate" });
  });

  bunTest("archiving frees the date for a re-recorded entry", async () => {
    const first = await service.create(entryInput("2026-09-01", { sleep: 5 }));
    bunExpect(first.status).toBe("saved");
    const stored = await service.list();
    await service.archive(stored[0]?.id ?? "");

    // The exact bug class from Phase 1: the archived entry must not keep
    // reserving the date.
    const reRecorded = await service.create(
      entryInput("2026-09-01", { sleep: 9 })
    );
    bunExpect(reRecorded.status).toBe("saved");
    const after = await service.list();
    bunExpect(after.length).toBe(1);
    bunExpect(after[0]?.sleep).toBe(9);
  });

  bunTest("survives reopening", async () => {
    await service.create(entryInput("2026-09-01"));
    await database.close();
    database = await createDatabaseContext({
      databaseUrl: `file:${path.join(directory, "athlete360.db")}`,
    });
    service = createWellnessService(database.collections);
    const reloaded = await service.list();
    bunExpect(reloaded.length).toBe(1);
  });
});
