"use client";

import { z } from "zod";

import { collectionClient } from "@/lib/collection-client";
import { downloadFile } from "@/lib/csv";

import { collectionNames } from "./collection-services";
import type { CollectionName } from "./collection-services";

const BUNDLE_VERSION = 1;

const bundleSchema = z.object({
  collections: z.record(z.string(), z.array(z.unknown())),
  exportedAt: z.string(),
  version: z.literal(BUNDLE_VERSION),
});

export type BackupBundle = z.infer<typeof bundleSchema>;

export interface RestoreSummary {
  restored: number;
  skipped: number;
}

const timestamp = () =>
  new Date().toISOString().slice(0, 19).replaceAll(":", "-");

/**
 * Every collection in one versioned file. Records are written exactly as
 * stored, so a restore can put them back under their original ids and keep the
 * cross-references between reports, cycles, and assessments intact.
 */
export const buildBackupBundle = async (): Promise<BackupBundle> => {
  const entries = await Promise.all(
    collectionNames.map(async (name) => {
      const records = await collectionClient(name).list({
        includeArchived: true,
      });
      return [name, records] as const;
    })
  );
  return {
    collections: Object.fromEntries(entries),
    exportedAt: new Date().toISOString(),
    version: BUNDLE_VERSION,
  };
};

export const exportBackup = async () => {
  const bundle = await buildBackupBundle();
  downloadFile(
    `athlete360-backup-${timestamp()}.json`,
    JSON.stringify(bundle, null, 2),
    "application/json"
  );
  return bundle;
};

const isCollectionName = (value: string): value is CollectionName =>
  collectionNames.some((name) => name === value);

/**
 * Restores by id, so importing a bundle over existing data updates the records
 * it holds rather than duplicating them. Anything that no longer validates is
 * skipped and counted instead of aborting the whole restore.
 */
export const restoreBackup = async (
  contents: string
): Promise<RestoreSummary | { error: string }> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    return { error: "That file is not a readable SSAIT Athlete360 backup." };
  }
  const bundle = bundleSchema.safeParse(parsed);
  if (!bundle.success) {
    return {
      error: "That file is not an SSAIT Athlete360 backup of this version.",
    };
  }

  const counts = await Promise.all(
    Object.entries(bundle.data.collections).map(async ([name, records]) => {
      if (!isCollectionName(name)) {
        return { restored: 0, skipped: records.length };
      }
      const client = collectionClient(name);
      const results = await Promise.all(
        records.map((record) => client.importRecord(record))
      );
      const restored = results.filter(
        (result) => result.status === "saved"
      ).length;
      return { restored, skipped: results.length - restored };
    })
  );

  return {
    restored: counts.reduce((total, entry) => total + entry.restored, 0),
    skipped: counts.reduce((total, entry) => total + entry.skipped, 0),
  };
};
