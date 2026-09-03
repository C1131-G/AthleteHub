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

bunDescribe("local database backend", () => {
  let temporaryDirectory: string;
  let database: DatabaseContext;

  bunBeforeEach(async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "athletehub-"));
    database = await createDatabaseContext({
      databaseUrl: `file:${path.join(temporaryDirectory, "athletehub.db")}`,
    });
  });

  bunAfterEach(async () => {
    await database.close();
    try {
      await rm(temporaryDirectory, {
        force: true,
        maxRetries: 10,
        recursive: true,
        retryDelay: 100,
      });
    } catch {
      // Windows can release the SQLite file handle after the test process exits.
    }
  });

  bunTest("creates a database that survives reopening", async () => {
    bunExpect(await database.healthCheck()).toEqual({ status: "ready" });
    await database.createTestRecord({ id: "probe-1", label: "first save" });
    bunExpect(await database.listTestRecords()).toEqual([
      { id: "probe-1", label: "first save" },
    ]);

    await database.close();
    database = await createDatabaseContext({
      databaseUrl: `file:${path.join(temporaryDirectory, "athletehub.db")}`,
    });

    bunExpect(await database.listTestRecords()).toEqual([
      { id: "probe-1", label: "first save" },
    ]);
  });

  bunTest("rolls back all writes when a transaction fails", async () => {
    await bunExpect(
      database.runTransaction(async (transaction) => {
        await transaction.createTestRecord({
          id: "probe-2",
          label: "rolled back",
        });
        throw new Error("abort transaction");
      })
    ).rejects.toThrow("abort transaction");

    bunExpect(await database.listTestRecords()).toEqual([]);
  });
});
