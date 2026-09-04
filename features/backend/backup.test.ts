import {
  describe as bunDescribe,
  expect as bunExpect,
  mock as bunMock,
  test as bunTest,
} from "bun:test";

import type { ListOptions } from "../../electron/collections";
import { buildBackupBundle, exportBackup, restoreBackup } from "./backup";
import { collectionNames } from "./collection-services";

const listCalls: { name: string; options: ListOptions | undefined }[] = [];
const downloads: { contents: string; filename: string; type: string }[] = [];
const stored = new Map<string, unknown[]>();
const rejectedPayloads = new Set<string>();

bunMock.module("@/lib/collection-client", () => ({
  collectionClient: (name: string) => ({
    importRecord: (record: unknown) => {
      if (rejectedPayloads.has(JSON.stringify(record))) {
        return Promise.resolve({
          fieldErrors: { form: "rejected" },
          status: "invalid",
        });
      }
      return Promise.resolve({ record, status: "saved" });
    },
    list: (options?: ListOptions) => {
      listCalls.push({ name, options });
      return Promise.resolve(stored.get(name) ?? []);
    },
  }),
}));

bunMock.module("@/lib/csv", () => ({
  downloadFile: (filename: string, contents: string, type: string) => {
    downloads.push({ contents, filename, type });
  },
}));

const resetFakes = () => {
  listCalls.length = 0;
  downloads.length = 0;
  stored.clear();
  rejectedPayloads.clear();
};

bunDescribe("buildBackupBundle", () => {
  bunTest("gathers every collection including archived records", async () => {
    resetFakes();
    stored.set("athletes", [{ id: "a1" }]);

    const bundle = await buildBackupBundle();

    bunExpect(bundle.version).toBe(1);
    bunExpect(Number.isNaN(Date.parse(bundle.exportedAt))).toBe(false);
    bunExpect(Object.keys(bundle.collections).toSorted()).toEqual(
      [...collectionNames].toSorted()
    );
    bunExpect(bundle.collections["athletes"]).toEqual([{ id: "a1" }]);
    for (const name of collectionNames) {
      const callsForCollection = listCalls.filter(
        (call) => call.name === name && call.options?.includeArchived === true
      );
      bunExpect(callsForCollection).toHaveLength(1);
    }
  });
});

bunDescribe("exportBackup", () => {
  bunTest("downloads the bundle as a timestamped json file", async () => {
    resetFakes();

    const bundle = await exportBackup();

    bunExpect(downloads).toHaveLength(1);
    const [download] = downloads;
    bunExpect(download?.filename).toMatch(/^athletehub-backup-.+\.json$/);
    bunExpect(download?.type).toBe("application/json");
    bunExpect(JSON.parse(download?.contents ?? "")).toEqual(bundle);
  });
});

bunDescribe("restoreBackup", () => {
  bunTest("rejects files that are not readable backups", async () => {
    resetFakes();

    bunExpect(await restoreBackup("not json")).toEqual({
      error: "That file is not a readable AthleteHub backup.",
    });
  });

  bunTest("rejects backups of another version", async () => {
    resetFakes();

    bunExpect(
      await restoreBackup(
        JSON.stringify({
          collections: {},
          exportedAt: new Date().toISOString(),
          version: 999,
        })
      )
    ).toEqual({
      error: "That file is not an AthleteHub backup of this version.",
    });
  });

  bunTest("skips unknown collections without touching clients", async () => {
    resetFakes();
    const callsBefore = listCalls.length;

    const result = await restoreBackup(
      JSON.stringify({
        collections: { nope: [{ id: "x" }] },
        exportedAt: new Date().toISOString(),
        version: 1,
      })
    );

    bunExpect(result).toEqual({ restored: 0, skipped: 1 });
    bunExpect(listCalls.length).toBe(callsBefore);
  });

  bunTest("restores known records and counts the skipped ones", async () => {
    resetFakes();
    const rejected = { id: "bad" };
    rejectedPayloads.add(JSON.stringify(rejected));

    const result = await restoreBackup(
      JSON.stringify({
        collections: { athletes: [{ id: "a1" }, rejected] },
        exportedAt: new Date().toISOString(),
        version: 1,
      })
    );

    bunExpect(result).toEqual({ restored: 1, skipped: 1 });
  });
});
