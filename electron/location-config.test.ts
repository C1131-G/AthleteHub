import {
  afterEach as bunAfterEach,
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { readLocationConfig, writeLocationConfig } from "./location-config";

const scratchDirs: string[] = [];

const scratchFile = (name: string) => {
  const dir = mkdtempSync(path.join(tmpdir(), "athletehub-location-"));
  scratchDirs.push(dir);
  return path.join(dir, name);
};

bunAfterEach(() => {
  for (const dir of scratchDirs.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

bunDescribe("location-config", () => {
  bunTest("reports null when the file does not exist", () => {
    bunExpect(readLocationConfig(scratchFile("missing.json"))).toBeNull();
  });

  bunTest("reports null for malformed content", () => {
    const filePath = scratchFile("malformed.json");
    Bun.write(filePath, JSON.stringify({ storagePath: "" }));
    bunExpect(readLocationConfig(filePath)).toBeNull();
  });

  bunTest("writes and reads back a valid config", () => {
    const filePath = scratchFile("location.json");
    const written = writeLocationConfig(filePath, {
      backupPath: "D:/data/backups",
      storagePath: "D:/data",
    });
    bunExpect(written).toEqual({
      backupPath: "D:/data/backups",
      storagePath: "D:/data",
    });
    bunExpect(readLocationConfig(filePath)).toEqual(written);
  });

  bunTest("rejects an incomplete config on write", () => {
    const filePath = scratchFile("invalid.json");
    bunExpect(() =>
      // @ts-expect-error missing backupPath, intentionally invalid input
      writeLocationConfig(filePath, { storagePath: "D:/data" })
    ).toThrow();
  });
});
