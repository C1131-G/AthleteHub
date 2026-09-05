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

import { createClient } from "@libsql/client";

import { createDatabaseContext } from "../../electron/backend";
import type { DatabaseContext, SessionRecord } from "../../electron/backend";

const sessionInput = (id: string) => ({
  actualArrows: 6,
  athleteId: "athlete-1",
  date: "2026-09-01",
  durationMin: 75,
  ends: [{ arrowCount: 6, arrows: [], score: 54 }],
  equipmentSetupId: null,
  formatSnapshot: JSON.stringify({
    arrowsPerEnd: 6,
    bowCategory: "recurve",
    distanceM: 70,
    indoor: false,
    maxScorePerArrow: 10,
    targetFaceCm: 122,
  }),
  id,
  kind: "practice",
  notes: "parity check",
  plannedArrows: 6,
  rpe: 6,
  status: "complete",
  technicalFocus: "alignment",
});

const comparableFields = (record: SessionRecord) => ({
  // Ids differ by construction (one row per write path); timestamps are
  // excluded so the comparison does not flake on wall-clock milliseconds.
  actualArrows: record.actualArrows,
  athleteId: record.athleteId,
  date: record.date,
  ends: record.ends,
  equipmentSetupId: record.equipmentSetupId,
  formatSnapshot: record.formatSnapshot,
  kind: record.kind,
  notes: record.notes,
  plannedArrows: record.plannedArrows,
  status: record.status,
  technicalFocus: record.technicalFocus,
});

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

  bunTest("reopening applies no migration twice", async () => {
    await database.close();
    const url = `file:${path.join(temporaryDirectory, "athletehub.db")}`;
    const raw = createClient({ url });
    const before = await raw.execute(
      `SELECT "name", "appliedAt" FROM "_athletehub_migrations"`
    );
    raw.close();

    database = await createDatabaseContext({ databaseUrl: url });
    const reopened = createClient({ url });
    const after = await reopened.execute(
      `SELECT "name", "appliedAt" FROM "_athletehub_migrations"`
    );
    reopened.close();
    bunExpect(after.rows).toEqual(before.rows);
  });

  bunTest(
    "direct and transactional session writes produce identical records",
    async () => {
      const viaDirect = await database.sessions.save(
        sessionInput("parity-direct")
      );
      const viaTransaction = await database.runTransaction((transaction) =>
        transaction.sessions.save(sessionInput("parity-transaction"))
      );
      bunExpect(comparableFields(viaTransaction)).toEqual(
        comparableFields(viaDirect)
      );
      bunExpect(await database.sessions.get("parity-transaction")).toEqual(
        viaTransaction
      );

      // The same row written through the other path stays consistent, and the
      // athlete guard holds on both paths.
      const updated = await database.runTransaction((transaction) =>
        transaction.sessions.save({
          ...sessionInput("parity-direct"),
          notes: "updated in transaction",
        })
      );
      bunExpect(updated.notes).toBe("updated in transaction");
      const storedUpdate = await database.sessions.get("parity-direct");
      bunExpect(storedUpdate?.ends).toEqual(updated.ends);
      await bunExpect(
        database.sessions.save({
          ...sessionInput("parity-direct"),
          athleteId: "athlete-2",
        })
      ).rejects.toThrow("A session cannot be moved to another athlete.");
      await bunExpect(
        database.runTransaction((transaction) =>
          transaction.sessions.save({
            ...sessionInput("parity-transaction"),
            athleteId: "athlete-2",
          })
        )
      ).rejects.toThrow("A session cannot be moved to another athlete.");
    }
  );
});
