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
import { createSessionService } from "./session-service";
import type { SessionService } from "./session-service";

bunDescribe("archery sessions", () => {
  let directory: string;
  let database: DatabaseContext;
  let service: SessionService;

  bunBeforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), "athletehub-session-"));
    database = await createDatabaseContext({
      databaseUrl: `file:${path.join(directory, "athletehub.db")}`,
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
      { arrowCount: 6, score: 48 },
      { arrowCount: 6, score: 51 },
    ]);

    await database.close();
    database = await createDatabaseContext({
      databaseUrl: `file:${path.join(directory, "athletehub.db")}`,
    });
    service = createSessionService(database.sessions);
    const sessions = await service.listByAthlete("athlete-1");
    bunExpect(sessions[0]?.status).toBe("complete");
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
