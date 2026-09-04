import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createDatabaseContext } from "../../electron/backend";
import type { DatabaseContext } from "../../electron/backend";

export interface TempDatabase {
  database: DatabaseContext;
  directory: string;
  /** Closes and reopens the same file, proving a record actually persisted. */
  reopen: () => Promise<DatabaseContext>;
}

const databaseUrlFor = (directory: string) =>
  `file:${path.join(directory, "athletehub.db")}`;

export const createTempDatabase = async (
  label: string
): Promise<TempDatabase> => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), `athletehub-${label}-`)
  );
  let database = await createDatabaseContext({
    databaseUrl: databaseUrlFor(directory),
  });
  return {
    get database() {
      return database;
    },
    directory,
    reopen: async () => {
      await database.close();
      database = await createDatabaseContext({
        databaseUrl: databaseUrlFor(directory),
      });
      return database;
    },
  };
};

/**
 * Windows keeps the SQLite file locked for a moment after the client closes,
 * so a straight `rm` in a teardown hook fails with EBUSY. Retry briefly and
 * give up quietly: a leftover temp directory must not fail the suite.
 */
export const removeDirectory = async (
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
