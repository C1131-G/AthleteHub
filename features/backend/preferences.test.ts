import {
  afterEach as bunAfterEach,
  beforeEach as bunBeforeEach,
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";
import { writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  DEFAULT_PREFERENCES,
  readPreferencesFile,
  writePreferencesFile,
} from "../../electron/preferences";

let directory: string;
let filePath: string;

bunBeforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "athlete360-prefs-"));
  filePath = path.join(directory, "preferences.json");
});

bunAfterEach(async () => {
  try {
    await rm(directory, { force: true, recursive: true });
  } catch {
    // Windows can release the file handle after the test exits.
  }
});

bunDescribe("app preferences", () => {
  bunTest("falls back to defaults when no file exists", () => {
    bunExpect(readPreferencesFile(filePath)).toEqual(DEFAULT_PREFERENCES);
  });

  bunTest("falls back per field on corrupt JSON or invalid values", () => {
    writeFileSync(filePath, "{ not json", "utf-8");
    bunExpect(readPreferencesFile(filePath)).toEqual(DEFAULT_PREFERENCES);

    writeFileSync(
      filePath,
      JSON.stringify({
        backupCount: 0,
        rankingDistance: -5,
        weekStartsOn: 4,
      }),
      "utf-8"
    );
    bunExpect(readPreferencesFile(filePath)).toEqual(DEFAULT_PREFERENCES);
  });

  bunTest("keeps valid values and defaults the rest", () => {
    writeFileSync(
      filePath,
      JSON.stringify({ backupCount: 12, weekStartsOn: 6 }),
      "utf-8"
    );
    bunExpect(readPreferencesFile(filePath)).toEqual({
      backupCount: 12,
      rankingDistance: 70,
      weekStartsOn: 6,
    });
  });

  bunTest("write merges a partial over stored values", () => {
    writePreferencesFile(filePath, { rankingDistance: 50 });
    bunExpect(readPreferencesFile(filePath)).toEqual({
      ...DEFAULT_PREFERENCES,
      rankingDistance: 50,
    });

    writePreferencesFile(filePath, { backupCount: 3 });
    bunExpect(readPreferencesFile(filePath)).toEqual({
      backupCount: 3,
      rankingDistance: 50,
      weekStartsOn: 1,
    });
  });

  bunTest("write rejects invalid values by falling back to defaults", () => {
    writePreferencesFile(filePath, { backupCount: 99 });
    bunExpect(readPreferencesFile(filePath).backupCount).toBe(7);
  });
});
