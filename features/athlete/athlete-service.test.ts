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
import { createAthleteService } from "./athlete-service";
import type { AthleteService } from "./athlete-service";
import type { AthleteInput } from "./athlete-types";

const athleteInput = (overrides: Partial<AthleteInput> = {}): AthleteInput => ({
  athleteId: "AH-500",
  category: "recurve",
  dateOfBirth: "2004-06-15",
  equipmentNotes: "",
  fullName: "New Archer",
  status: "active",
  technicalFocus: "Release",
  ...overrides,
});

bunDescribe("athlete service", () => {
  let directory: string;
  let database: DatabaseContext;
  let service: AthleteService;
  const databaseUrl = () => `file:${path.join(directory, "athlete360.db")}`;

  bunBeforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), "athlete360-athlete-"));
    database = await createDatabaseContext({ databaseUrl: databaseUrl() });
    service = createAthleteService(database.collections);
  });

  bunAfterEach(async () => {
    await database.close();
    await removeDirectory(directory);
  });

  bunTest("starts empty rather than seeding a fabricated roster", async () => {
    bunExpect(await service.list()).toEqual([]);
  });

  bunTest("creates an athlete and reads it back", async () => {
    const created = await service.create(athleteInput());
    if (created.status !== "saved") {
      throw new Error(`expected saved, got ${created.status}`);
    }
    bunExpect(created.record.createdAt).toBe(created.record.updatedAt);
    const stored = await service.get(created.record.id);
    bunExpect(stored?.fullName).toBe("New Archer");
  });

  bunTest("rejects input that does not parse", async () => {
    const result = await service.create({ fullName: "" });
    bunExpect(result.status).toBe("invalid");
  });

  bunTest("rejects a second athlete reusing an athlete ID", async () => {
    await service.create(athleteInput());
    const duplicate = await service.create(
      athleteInput({ fullName: "Someone Else" })
    );
    bunExpect(duplicate.status).toBe("duplicate");
  });

  bunTest("updates an athlete and keeps its identity", async () => {
    const created = await service.create(athleteInput());
    if (created.status !== "saved") {
      throw new Error("expected saved");
    }
    const updated = await service.update(
      created.record.id,
      athleteInput({ fullName: "Renamed Archer" })
    );
    if (updated.status !== "saved") {
      throw new Error("expected saved");
    }
    bunExpect(updated.record.id).toBe(created.record.id);
    bunExpect(updated.record.createdAt).toBe(created.record.createdAt);
    bunExpect(await service.list()).toHaveLength(1);
  });

  bunTest("reports a missing athlete instead of creating one", async () => {
    bunExpect(await service.get("missing")).toBeUndefined();
    const result = await service.update("missing", athleteInput());
    bunExpect(result.status).toBe("not-found");
  });

  bunTest(
    "archiving hides an athlete and restoring brings it back",
    async () => {
      const created = await service.create(athleteInput());
      if (created.status !== "saved") {
        throw new Error("expected saved");
      }
      await service.archive(created.record.id);
      bunExpect(await service.list()).toEqual([]);
      bunExpect(await service.list({ includeArchived: true })).toHaveLength(1);

      await service.restore(created.record.id);
      bunExpect(await service.list()).toHaveLength(1);
    }
  );

  bunTest("drops an unreadable record without losing the rest", async () => {
    await service.create(athleteInput());
    await database.collections.athletes.save({
      category: "recurve",
      code: "AH-BROKEN",
      dateOfBirth: "2004-06-15",
      fullName: "Corrupt Row",
      id: "broken",
      snapshot: "{ not json",
      status: "active",
    });

    // One unreadable row must not discard the rest of the roster.
    bunExpect(await service.list()).toHaveLength(1);
  });

  bunTest("survives reopening the database", async () => {
    await service.create(athleteInput());
    await database.close();
    database = await createDatabaseContext({ databaseUrl: databaseUrl() });
    service = createAthleteService(database.collections);
    bunExpect(await service.list()).toHaveLength(1);
  });
});
