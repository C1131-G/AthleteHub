"use client";

import { collectionClient } from "@/lib/collection-client";
import { readStoredArray, writeStored } from "@/lib/storage";

import type { CollectionName } from "./collection-services";

/**
 * The localStorage keys the app wrote before collections moved to SQLite. They
 * are read once, imported, and then left in place for a release so an upgrade
 * that goes wrong can still be recovered by hand.
 */
const legacySources = [
  { key: "athletehub.athletes.v1", name: "athletes" },
  { key: "athletehub.equipment.v1", name: "equipment" },
  { key: "athletehub.weekly-reports.v1", name: "weeklyReports" },
  { key: "athletehub.monthly-reports.v1", name: "monthlyReports" },
  { key: "athletehub.assessments.v1", name: "assessments" },
  {
    key: "athletehub.conditioning-assessments.v1",
    name: "conditioningAssessments",
  },
  {
    key: "athletehub.conditioning-programmes.v1",
    name: "conditioningProgrammes",
  },
  { key: "athletehub.training-plans.v1", name: "trainingPlans" },
  { key: "athletehub.monthly-cycles.v1", name: "monthlyCycles" },
] as const satisfies readonly { key: string; name: CollectionName }[];

const MIGRATED_KEY = "athletehub.migrated.v2";

export interface CollectionImportResult {
  imported: number;
  name: CollectionName;
  /** Records that no longer parse, or that the database already holds. */
  skipped: number;
}

export interface LegacyImportSummary {
  collections: CollectionImportResult[];
  imported: number;
  skipped: number;
}

const legacyRecordCount = () =>
  legacySources.reduce(
    (total, source) => total + readStoredArray(source.key).length,
    0
  );

export const legacyImportComplete = () => {
  try {
    return globalThis.localStorage?.getItem(MIGRATED_KEY) !== null;
  } catch {
    return false;
  }
};

/** True only when there is something to import and it has not run yet. */
export const hasLegacyDataToImport = () =>
  !legacyImportComplete() && legacyRecordCount() > 0;

export const markLegacyImportComplete = () => {
  writeStored(MIGRATED_KEY, { completedAt: new Date().toISOString() });
};

/**
 * Idempotent: a record whose id is already present is written again with the
 * same id, and one that no longer validates is skipped rather than aborting
 * the rest. Running it twice imports the same data, it does not duplicate it.
 */
export const runLegacyImport = async (): Promise<LegacyImportSummary> => {
  const collections = await Promise.all(
    legacySources.map(async (source): Promise<CollectionImportResult> => {
      const client = collectionClient(source.name);
      const results = await Promise.all(
        readStoredArray(source.key).map((record) => client.importRecord(record))
      );
      const imported = results.filter(
        (result) => result.status === "saved"
      ).length;
      return {
        imported,
        name: source.name,
        skipped: results.length - imported,
      };
    })
  );

  markLegacyImportComplete();
  return {
    collections,
    imported: collections.reduce((total, entry) => total + entry.imported, 0),
    skipped: collections.reduce((total, entry) => total + entry.skipped, 0),
  };
};
