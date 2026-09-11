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
import { createSightMarkService } from "./sight-mark-service";
import type { SightMarkService } from "./sight-mark-service";

const markInput = {
  arrow: "X10",
  athleteId: "athlete-1",
  bow: "Recurve",
  distanceM: 18,
  mark: "1.00",
  note: "",
};

const reloadedInput = {
  ...markInput,
  distanceM: 50,
  mark: "2.00",
};

bunDescribe("sight mark collection", () => {
  let directory: string;
  let database: DatabaseContext;
  let service: SightMarkService;

  bunBeforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), "athlete360-sightmark-"));
    database = await createDatabaseContext({
      databaseUrl: `file:${path.join(directory, "athlete360.db")}`,
    });
    service = createSightMarkService(database.collections);
  });

  bunAfterEach(async () => {
    await database.close();
    try {
      await rm(directory, { force: true, maxRetries: 10, recursive: true });
    } catch {
      // Windows can release the SQLite file handle after the test exits.
    }
  });

  bunTest("saves, lists, and survives reopening", async () => {
    const first = await service.create(markInput);
    bunExpect(first.status).toBe("saved");
    const second = await service.create(reloadedInput);
    bunExpect(second.status).toBe("saved");

    const listed = await service.list();
    bunExpect(listed.map((mark) => mark.distanceM)).toEqual([18, 50]);

    await database.close();
    database = await createDatabaseContext({
      databaseUrl: `file:${path.join(directory, "athlete360.db")}`,
    });
    service = createSightMarkService(database.collections);
    const reloaded = await service.list();
    bunExpect(reloaded.length).toBe(2);
  });

  bunTest(
    "rejects a duplicate live distance but allows it after archiving",
    async () => {
      await bunExpect(service.create(markInput)).resolves.toMatchObject({
        status: "saved",
      });
      // The partial unique index only covers live rows, so a second active mark
      // at the same distance is a duplicate…
      await bunExpect(service.create(markInput)).resolves.toMatchObject({
        status: "duplicate",
      });
      const first = await service.list();
      await bunExpect(
        service.archive(first[0]?.id ?? "")
      ).resolves.toBeDefined();

      // …but archiving frees the distance for a replacement.
      await bunExpect(service.create(markInput)).resolves.toMatchObject({
        status: "saved",
      });
    }
  );
});
