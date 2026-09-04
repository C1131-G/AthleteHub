import { z } from "zod";

import type {
  Collections,
  CollectionRow,
  ListOptions,
  OwnedCollectionRow,
} from "../electron/collections";
import { readStoredArray, writeStored } from "./storage";

/**
 * A localStorage implementation of the SQLite accessor interface, used when the
 * app runs in a plain browser during development. The services run unchanged on
 * top of it, so the dev loop exercises the real validation, duplicate, and
 * archive logic instead of a parallel code path.
 *
 * This is a development convenience, not a supported storage mode: the desktop
 * app always reaches SQLite through the main process.
 */
const storedRowSchema = z.object({
  archivedAt: z.string().nullable(),
  athleteId: z.string().optional(),
  createdAt: z.string(),
  id: z.string(),
  snapshot: z.string(),
  /** Precomputed so ordering needs no knowledge of each collection's columns. */
  sortValue: z.string(),
  uniqueValue: z.string().optional(),
  updatedAt: z.string(),
});

type StoredRow = z.infer<typeof storedRowSchema>;

interface BaseSaveInput {
  id: string;
  snapshot: string;
}

interface OwnedSaveInput extends BaseSaveInput {
  athleteId: string;
}

/** Mirrors Prisma's P2002 so the services' duplicate handling is shared. */
class UniqueViolationError extends Error {
  readonly code = "P2002";

  constructor() {
    super("A record with that unique value already exists.");
    this.name = "UniqueViolationError";
  }
}

const readRows = (key: string): StoredRow[] =>
  readStoredArray(key).flatMap((value) => {
    const result = storedRowSchema.safeParse(value);
    return result.success ? [result.data] : [];
  });

const toCollectionRow = (row: StoredRow): CollectionRow => ({
  archivedAt: row.archivedAt === null ? null : new Date(row.archivedAt),
  createdAt: new Date(row.createdAt),
  id: row.id,
  snapshot: row.snapshot,
  updatedAt: new Date(row.updatedAt),
});

const toOwnedRow = (row: StoredRow): OwnedCollectionRow => ({
  ...toCollectionRow(row),
  athleteId: row.athleteId ?? "",
});

const matchesArchiveState = (
  row: StoredRow,
  options: ListOptions | undefined
) => {
  if (options?.archivedOnly) {
    return row.archivedAt !== null;
  }
  return options?.includeArchived === true || row.archivedAt === null;
};

const visible = (rows: StoredRow[], options: ListOptions | undefined) =>
  rows.filter(
    (row) =>
      matchesArchiveState(row, options) &&
      (options?.athleteId === undefined || row.athleteId === options.athleteId)
  );

interface LocalConfig<TSave extends BaseSaveInput> {
  direction: "asc" | "desc";
  key: string;
  sortValue: (input: TSave) => string;
  uniqueValue?: (input: TSave) => string;
}

const buildLocalCollection = <TSave extends BaseSaveInput>(
  config: LocalConfig<TSave>
) => {
  const order = (rows: StoredRow[]) =>
    rows.toSorted((a, b) =>
      config.direction === "asc"
        ? a.sortValue.localeCompare(b.sortValue)
        : b.sortValue.localeCompare(a.sortValue)
    );

  const setArchivedAt = (id: string, archivedAt: string | null) => {
    const rows = readRows(config.key);
    writeStored(
      config.key,
      rows.map((row) => (row.id === id ? { ...row, archivedAt } : row))
    );
  };

  return {
    archive: async (id: string) => {
      setArchivedAt(id, new Date().toISOString());
      await Promise.resolve();
    },
    find: (id: string) => readRows(config.key).find((row) => row.id === id),
    list: (options?: ListOptions) =>
      order(visible(readRows(config.key), options)),
    restore: async (id: string) => {
      setArchivedAt(id, null);
      await Promise.resolve();
    },
    write: (input: TSave, athleteId?: string): StoredRow => {
      const rows = readRows(config.key);
      const existing = rows.find((row) => row.id === input.id);
      const uniqueValue = config.uniqueValue?.(input);
      if (
        uniqueValue !== undefined &&
        rows.some(
          (row) =>
            row.uniqueValue === uniqueValue &&
            row.id !== input.id &&
            // Matches the database's partial index: archived rows release
            // their unique value.
            row.archivedAt === null
        )
      ) {
        throw new UniqueViolationError();
      }
      const now = new Date().toISOString();
      const row: StoredRow = {
        archivedAt: existing?.archivedAt ?? null,
        athleteId,
        createdAt: existing?.createdAt ?? now,
        id: input.id,
        snapshot: input.snapshot,
        sortValue: config.sortValue(input),
        uniqueValue,
        updatedAt: now,
      };
      writeStored(
        config.key,
        existing
          ? rows.map((entry) => (entry.id === row.id ? row : entry))
          : [row, ...rows]
      );
      return row;
    },
  };
};

const unowned = <TSave extends BaseSaveInput>(config: LocalConfig<TSave>) => {
  const local = buildLocalCollection(config);
  return {
    archive: local.archive,
    get: async (id: string) => {
      const row = local.find(id);
      return await Promise.resolve(row ? toCollectionRow(row) : undefined);
    },
    list: async (options?: ListOptions) =>
      await Promise.resolve(local.list(options).map(toCollectionRow)),
    restore: local.restore,
    save: async (input: TSave) =>
      await Promise.resolve(toCollectionRow(local.write(input))),
  };
};

const owned = <TSave extends OwnedSaveInput>(config: LocalConfig<TSave>) => {
  const local = buildLocalCollection(config);
  return {
    archive: local.archive,
    get: async (id: string) => {
      const row = local.find(id);
      return await Promise.resolve(row ? toOwnedRow(row) : undefined);
    },
    list: async (options?: ListOptions) =>
      await Promise.resolve(local.list(options).map(toOwnedRow)),
    restore: local.restore,
    save: async (input: TSave) =>
      await Promise.resolve(toOwnedRow(local.write(input, input.athleteId))),
  };
};

export const createLocalCollections = (): Collections => ({
  assessments: owned({
    direction: "desc",
    key: "athletehub.local.assessments",
    sortValue: (input) => input.date,
  }),
  athletes: unowned({
    direction: "asc",
    key: "athletehub.local.athletes",
    sortValue: (input) => input.fullName,
    uniqueValue: (input) => input.code,
  }),
  conditioningAssessments: owned({
    direction: "desc",
    key: "athletehub.local.conditioning-assessments",
    sortValue: (input) => input.date,
  }),
  conditioningProgrammes: owned({
    direction: "desc",
    key: "athletehub.local.conditioning-programmes",
    sortValue: (input) => input.startDate,
  }),
  equipment: owned({
    direction: "desc",
    key: "athletehub.local.equipment",
    sortValue: (input) => input.recordedAt,
  }),
  monthlyCycles: owned({
    direction: "desc",
    key: "athletehub.local.monthly-cycles",
    sortValue: (input) => input.month,
    uniqueValue: (input) => `${input.athleteId}:${input.month}`,
  }),
  monthlyReports: owned({
    direction: "desc",
    key: "athletehub.local.monthly-reports",
    sortValue: (input) => input.month,
    uniqueValue: (input) => `${input.athleteId}:${input.month}`,
  }),
  trainingPlans: owned({
    direction: "desc",
    key: "athletehub.local.training-plans",
    sortValue: (input) => input.seasonStart,
  }),
  weeklyReports: owned({
    direction: "desc",
    key: "athletehub.local.weekly-reports",
    sortValue: (input) => input.weekStart,
    uniqueValue: (input) => `${input.athleteId}:${input.weekStart}`,
  }),
});
