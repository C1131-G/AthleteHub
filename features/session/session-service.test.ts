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
import type { DatabaseContext } from "../../electron/backend";
import { createSessionService } from "./session-service";
import type { SessionService } from "./session-service";
import type { SessionInput } from "./session-types";

const rosterDraft = (id: string, athleteId: string): SessionInput => ({
  athleteId,
  date: "2026-09-03",
  ends: [{ arrowCount: 6, score: 48 }],
  format: {
    arrowsPerEnd: 6,
    bowCategory: "recurve",
    distanceM: 70,
    indoor: false,
    maxScorePerArrow: 10,
    targetFaceCm: 122,
  },
  id,
  kind: "practice",
  notes: "",
  technicalFocus: "",
});

bunDescribe("archery sessions", () => {
  let directory: string;
  let database: DatabaseContext;
  let service: SessionService;

  bunBeforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), "athlete360-session-"));
    database = await createDatabaseContext({
      databaseUrl: `file:${path.join(directory, "athlete360.db")}`,
    });
    service = createSessionService(database.sessions);
  });

  bunAfterEach(async () => {
    await database.close();
    await removeDirectory(directory);
  });

  bunTest("saves ordered ends and survives reopening", async () => {
    const result = await service.complete({
      athleteId: "athlete-1",
      date: "2026-09-03",
      ends: [
        { arrowCount: 6, score: 48 },
        { arrowCount: 6, score: 51 },
      ],
      format: {
        arrowsPerEnd: 6,
        bowCategory: "recurve",
        distanceM: 70,
        indoor: false,
        maxScorePerArrow: 10,
        targetFaceCm: 122,
      },
      id: "session-1",
      kind: "practice",
      notes: "Good release quality.",
      technicalFocus: "Follow-through",
    });

    bunExpect(result.status).toBe("saved");
    const saved = await service.get("session-1");
    bunExpect(saved?.ends).toEqual([
      { arrowCount: 6, arrows: [], score: 48 },
      { arrowCount: 6, arrows: [], score: 51 },
    ]);

    await database.close();
    database = await createDatabaseContext({
      databaseUrl: `file:${path.join(directory, "athlete360.db")}`,
    });
    service = createSessionService(database.sessions);
    const sessions = await service.listByAthlete("athlete-1");
    bunExpect(sessions[0]?.status).toBe("complete");
  });

  bunTest("saves plotted arrows and survives reopening", async () => {
    const result = await service.complete({
      athleteId: "athlete-1",
      date: "2026-09-04",
      ends: [
        {
          arrowCount: 3,
          arrows: [
            { score: 10, x: 0.02, y: -0.01 },
            { score: 9, x: -0.3, y: 0.2 },
            { score: 5, x: 0.5, y: 0.5 },
          ],
          score: 24,
        },
        { arrowCount: 3, score: 21 },
      ],
      format: {
        arrowsPerEnd: 3,
        bowCategory: "recurve",
        distanceM: 70,
        indoor: false,
        maxScorePerArrow: 10,
        targetFaceCm: 122,
      },
      id: "session-arrows",
      kind: "practice",
      notes: "",
      technicalFocus: "",
    });

    bunExpect(result.status).toBe("saved");
    const saved = await service.get("session-arrows");
    bunExpect(saved?.ends).toEqual([
      {
        arrowCount: 3,
        arrows: [
          { score: 10, x: 0.02, y: -0.01 },
          { score: 9, x: -0.3, y: 0.2 },
          { score: 5, x: 0.5, y: 0.5 },
        ],
        score: 24,
      },
      // Ends recorded without plotting keep an empty, order-preserving list.
      { arrowCount: 3, arrows: [], score: 21 },
    ]);

    await database.close();
    database = await createDatabaseContext({
      databaseUrl: `file:${path.join(directory, "athlete360.db")}`,
    });
    service = createSessionService(database.sessions);
    const reloaded = await service.get("session-arrows");
    bunExpect(reloaded?.ends).toEqual(saved?.ends);
  });

  bunTest(
    "reads arrows in sequence order regardless of storage order",
    async () => {
      await service.complete({
        athleteId: "athlete-1",
        date: "2026-09-05",
        ends: [
          {
            arrowCount: 3,
            arrows: [
              { score: 10, x: 0.02, y: -0.01 },
              { score: 9, x: -0.3, y: 0.2 },
              { score: 5, x: 0.5, y: 0.5 },
            ],
            score: 24,
          },
        ],
        format: {
          arrowsPerEnd: 3,
          bowCategory: "recurve",
          distanceM: 70,
          indoor: false,
          maxScorePerArrow: 10,
          targetFaceCm: 122,
        },
        id: "session-order",
        kind: "practice",
        notes: "",
        technicalFocus: "",
      });

      // Rewrite the arrow rows in shuffled physical order, keeping every
      // stored value (including sequence) intact. SQLite is free to return
      // rowid order, so a reader that does not order by sequence would hand
      // back the shuffled third/first/second shots.
      await database.close();
      const raw = createClient({
        url: `file:${path.join(directory, "athlete360.db")}`,
      });
      await raw.batch([
        `DELETE FROM "ArcheryArrow" WHERE "endId" = 'session-order-end-1'`,
        `INSERT INTO "ArcheryArrow" ("id", "endId", "sequence", "score", "x", "y")
           VALUES ('session-order-end-1-arrow-3', 'session-order-end-1', 3, 5, 0.5, 0.5)`,
        `INSERT INTO "ArcheryArrow" ("id", "endId", "sequence", "score", "x", "y")
           VALUES ('session-order-end-1-arrow-1', 'session-order-end-1', 1, 10, 0.02, -0.01)`,
        `INSERT INTO "ArcheryArrow" ("id", "endId", "sequence", "score", "x", "y")
           VALUES ('session-order-end-1-arrow-2', 'session-order-end-1', 2, 9, -0.3, 0.2)`,
      ]);
      raw.close();

      database = await createDatabaseContext({
        databaseUrl: `file:${path.join(directory, "athlete360.db")}`,
      });
      service = createSessionService(database.sessions);
      const reloaded = await service.get("session-order");
      const firstEnd = reloaded?.ends[0];
      bunExpect(firstEnd?.arrows?.map((arrow) => arrow.score)).toEqual([
        10, 9, 5,
      ]);
      bunExpect(
        firstEnd?.arrows?.map((arrow) => (arrow.x ?? 0).toFixed(1))
      ).toEqual(["0.0", "-0.3", "0.5"]);
    }
  );

  bunTest("saves session load fields and reads them back", async () => {
    const withLoad = await service.complete({
      athleteId: "athlete-1",
      date: "2026-09-06",
      durationMin: 90,
      ends: [{ arrowCount: 6, score: 48 }],
      format: {
        arrowsPerEnd: 6,
        bowCategory: "recurve",
        distanceM: 70,
        indoor: false,
        maxScorePerArrow: 10,
        targetFaceCm: 122,
      },
      id: "session-load",
      kind: "practice",
      notes: "",
      rpe: 7,
      technicalFocus: "",
    });
    bunExpect(withLoad.status).toBe("saved");
    const loaded = await service.get("session-load");
    bunExpect(loaded?.durationMin).toBe(90);
    bunExpect(loaded?.rpe).toBe(7);

    // Pre-load sessions stay null rather than pretending to be rest days.
    await service.complete({
      athleteId: "athlete-1",
      date: "2026-09-07",
      ends: [{ arrowCount: 6, score: 50 }],
      format: {
        arrowsPerEnd: 6,
        bowCategory: "recurve",
        distanceM: 70,
        indoor: false,
        maxScorePerArrow: 10,
        targetFaceCm: 122,
      },
      id: "session-no-load",
      kind: "practice",
      notes: "",
      technicalFocus: "",
    });
    const withoutLoad = await service.get("session-no-load");
    bunExpect(withoutLoad?.durationMin ?? null).toBeNull();
    bunExpect(withoutLoad?.rpe ?? null).toBeNull();
  });

  bunTest("rejects an rpe outside the 1-10 scale", async () => {
    const base = {
      athleteId: "athlete-1",
      date: "2026-09-06",
      ends: [{ arrowCount: 6, score: 48 }],
      format: {
        arrowsPerEnd: 6,
        bowCategory: "recurve",
        distanceM: 70,
        indoor: false,
        maxScorePerArrow: 10,
        targetFaceCm: 122,
      },
      id: "session-rpe",
      kind: "practice",
      notes: "",
      technicalFocus: "",
    } satisfies SessionInput;
    const below = await service.complete({ ...base, rpe: 0 });
    bunExpect(below.status).toBe("invalid");
    const above = await service.complete({ ...base, rpe: 11 });
    bunExpect(above.status).toBe("invalid");
    const bottom = await service.complete({ ...base, rpe: 1 });
    bunExpect(bottom.status).toBe("saved");
    const top = await service.complete({ ...base, rpe: 10 });
    bunExpect(top.status).toBe("saved");
  });

  bunTest("rejects plotted arrows that do not describe the end", async () => {
    const base = {
      athleteId: "athlete-1",
      date: "2026-09-04",
      ends: [],
      format: {
        arrowsPerEnd: 3,
        bowCategory: "recurve",
        distanceM: 70,
        indoor: false,
        maxScorePerArrow: 10,
        targetFaceCm: 122,
      },
      id: "session-invalid",
      kind: "practice",
      notes: "",
      technicalFocus: "",
    } satisfies SessionInput;

    const wrongCount = await service.complete({
      ...base,
      ends: [
        {
          arrowCount: 3,
          arrows: [{ score: 10 }, { score: 9 }],
          score: 19,
        },
      ],
    });
    bunExpect(wrongCount.status).toBe("invalid");

    const wrongSum = await service.complete({
      ...base,
      ends: [
        {
          arrowCount: 3,
          arrows: [{ score: 10 }, { score: 9 }, { score: 5 }],
          score: 25,
        },
      ],
    });
    bunExpect(wrongSum.status).toBe("invalid");

    const overMax = await service.complete({
      ...base,
      ends: [
        {
          arrowCount: 3,
          arrows: [{ score: 11 }, { score: 9 }, { score: 5 }],
          score: 25,
        },
      ],
    });
    bunExpect(overMax.status).toBe("invalid");
  });

  bunTest("lists every athlete's sessions roster-wide", async () => {
    const results = await Promise.all([
      service.complete(rosterDraft("roster-1", "athlete-1")),
      service.complete(rosterDraft("roster-2", "athlete-2")),
    ]);
    for (const result of results) {
      bunExpect(result.status).toBe("saved");
    }

    const sessions = await service.listAll();
    bunExpect(sessions.map((session) => session.id).toSorted()).toEqual([
      "roster-1",
      "roster-2",
    ]);
  });

  bunTest("rejects malformed input without writing a record", async () => {
    const result = await service.complete({
      athleteId: "athlete-1",
      id: "bad",
    });
    bunExpect(result).toMatchObject({ status: "invalid" });
    const missing = await service.get("bad");
    bunExpect(missing).toBeUndefined();
  });

  bunTest(
    "rejects impossible dates and scores above the format capacity",
    async () => {
      const result = await service.complete({
        athleteId: "athlete-1",
        date: "2026-02-31",
        ends: [{ arrowCount: 6, score: 61 }],
        format: {
          arrowsPerEnd: 6,
          bowCategory: "recurve",
          distanceM: 70,
          indoor: false,
          maxScorePerArrow: 10,
          targetFaceCm: 122,
        },
        id: "invalid-session",
        kind: "practice",
        notes: "",
        technicalFocus: "",
      });

      bunExpect(result).toMatchObject({ status: "invalid" });
      bunExpect(await service.get("invalid-session")).toBeUndefined();
    }
  );

  bunTest("updates a draft without duplicating its ends", async () => {
    await service.saveDraft({
      athleteId: "athlete-1",
      date: "2026-09-03",
      ends: [{ arrowCount: 6, score: 42 }],
      format: {
        arrowsPerEnd: 6,
        bowCategory: "compound",
        distanceM: 50,
        indoor: true,
        maxScorePerArrow: 10,
        targetFaceCm: 80,
      },
      id: "session-2",
      kind: "practice",
      notes: "",
      technicalFocus: "",
    });
    await service.saveDraft({
      athleteId: "athlete-1",
      date: "2026-09-03",
      ends: [
        { arrowCount: 6, score: 45 },
        { arrowCount: 6, score: 46 },
      ],
      format: {
        arrowsPerEnd: 6,
        bowCategory: "compound",
        distanceM: 50,
        indoor: true,
        maxScorePerArrow: 10,
        targetFaceCm: 80,
      },
      id: "session-2",
      kind: "practice",
      notes: "Updated",
      technicalFocus: "",
    });
    const updated = await service.get("session-2");
    bunExpect(updated?.ends).toHaveLength(2);
  });
});

const removeDirectory = async (
  directoryPath: string,
  attempt = 0
): Promise<void> => {
  try {
    await rm(directoryPath, { force: true, recursive: true });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("EBUSY")) {
      throw error;
    }
    if (attempt >= 10) {
      return;
    }
    await Bun.sleep(25);
    await removeDirectory(directoryPath, attempt + 1);
  }
};
