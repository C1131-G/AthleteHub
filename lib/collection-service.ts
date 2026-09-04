import type { CollectionRow, ListOptions } from "../electron/collections";
import {
  duplicateResult,
  invalidResult,
  isUniqueViolation,
  notFoundResult,
} from "./service-result";
import type { MutationFailure } from "./service-result";

export type CollectionMutationResult<TRecord> =
  | { record: TRecord; status: "saved" }
  | MutationFailure;

/**
 * The one shape every migrated collection exposes. Features that used to hold
 * two collections in a single repository (reports, conditioning) are two
 * services now, so this interface fits all of them and the IPC layer can
 * register their channels from a list instead of by hand.
 */
export interface CollectionService<TRecord> {
  archive: (id: string) => Promise<CollectionMutationResult<TRecord>>;
  create: (input: unknown) => Promise<CollectionMutationResult<TRecord>>;
  get: (id: string) => Promise<TRecord | undefined>;
  /**
   * Writes a complete record, keeping the id and timestamps it already has.
   * Used only by the one-time import of legacy localStorage data: the
   * cross-references between records (a report's source ids, an assessment's
   * weekly report) are stored ids, so re-keying on import would break them.
   */
  importRecord: (record: unknown) => Promise<CollectionMutationResult<TRecord>>;
  list: (options?: ListOptions) => Promise<TRecord[]>;
  restore: (id: string) => Promise<CollectionMutationResult<TRecord>>;
  update: (
    id: string,
    input: unknown
  ) => Promise<CollectionMutationResult<TRecord>>;
}

interface SchemaLike<T> {
  safeParse: (value: unknown) =>
    | { data: T; success: true }
    | {
        error: { issues: readonly { message: string; path: PropertyKey[] }[] };
        success: false;
      };
}

export interface RecordIdentity {
  createdAt: string;
  id: string;
  updatedAt: string;
}

export interface CollectionServiceConfig<TRecord, TInput> {
  archive: (id: string) => Promise<void>;
  /** Shown when the database rejects a write that breaks a unique index. */
  duplicateFieldErrors: Record<string, string>;
  get: (id: string) => Promise<CollectionRow | undefined>;
  /**
   * Rules that span records and so cannot live in the schema — one active
   * training plan per athlete, no overlapping active programmes, a
   * case-insensitive athlete match. Receives the record about to be written
   * and every other record already stored.
   */
  guard?: (
    candidate: TRecord,
    others: TRecord[]
  ) => MutationFailure | undefined;
  inputSchema: SchemaLike<TInput>;
  list: (options?: ListOptions) => Promise<CollectionRow[]>;
  /** Builds a new record from validated input and a fresh identity. */
  make: (input: TInput, identity: RecordIdentity) => TRecord;
  /** Applies validated input to an existing record, preserving its identity. */
  merge: (existing: TRecord, input: TInput, updatedAt: string) => TRecord;
  /** Reads a record's id, so the guard can exclude the record being updated. */
  identify: (record: TRecord) => string;
  /**
   * Trims and orders validated input before it is stored. Applied between two
   * validation passes: the first rejects structurally wrong input, the second
   * catches fields that normalising emptied — a name of only spaces has to
   * fail, not be saved blank.
   */
  normalize?: (input: TInput) => TInput;
  notFoundMessage: string;
  recordSchema: SchemaLike<TRecord>;
  restore: (id: string) => Promise<void>;
  save: (record: TRecord) => Promise<CollectionRow>;
}

export const createCollectionService = <TRecord, TInput>(
  config: CollectionServiceConfig<TRecord, TInput>
): CollectionService<TRecord> => {
  /**
   * The snapshot is the record. A row whose snapshot no longer parses is
   * dropped rather than thrown, so one unreadable row cannot empty the
   * collection — the behaviour the localStorage repositories had.
   */
  const decode = (row: CollectionRow | undefined): TRecord | undefined => {
    if (!row) {
      return;
    }
    try {
      const parsed: unknown = JSON.parse(row.snapshot);
      const result = config.recordSchema.safeParse(parsed);
      return result.success ? result.data : undefined;
    } catch (error) {
      if (error instanceof SyntaxError) {
        return;
      }
      throw error;
    }
  };

  /**
   * Only live records. An archived one must not reserve a name, code, week, or
   * month, or archiving it would make that value unusable for good.
   */
  const readAll = async (): Promise<TRecord[]> => {
    const rows = await config.list();
    return rows.flatMap((row) => {
      const record = decode(row);
      return record ? [record] : [];
    });
  };

  const persist = async (
    record: TRecord
  ): Promise<CollectionMutationResult<TRecord>> => {
    if (config.guard) {
      const stored = await readAll();
      const others = stored.filter(
        (entry) => config.identify(entry) !== config.identify(record)
      );
      const failure = config.guard(record, others);
      if (failure) {
        return failure;
      }
    }
    try {
      const saved = decode(await config.save(record));
      return saved
        ? { record: saved, status: "saved" }
        : notFoundResult("The record could not be read after saving.");
    } catch (error) {
      if (isUniqueViolation(error)) {
        return duplicateResult(config.duplicateFieldErrors);
      }
      throw error;
    }
  };

  const setArchived = async (
    id: string,
    archived: boolean
  ): Promise<CollectionMutationResult<TRecord>> => {
    const existing = decode(await config.get(id));
    if (!existing) {
      return notFoundResult(config.notFoundMessage);
    }
    await (archived ? config.archive(id) : config.restore(id));
    return { record: existing, status: "saved" };
  };

  const validate = (
    value: unknown
  ): { data: TInput; ok: true } | { failure: MutationFailure; ok: false } => {
    const parsed = config.inputSchema.safeParse(value);
    if (!parsed.success) {
      return { failure: invalidResult(parsed.error), ok: false };
    }
    if (!config.normalize) {
      return { data: parsed.data, ok: true };
    }
    const reparsed = config.inputSchema.safeParse(
      config.normalize(parsed.data)
    );
    return reparsed.success
      ? { data: reparsed.data, ok: true }
      : { failure: invalidResult(reparsed.error), ok: false };
  };

  return {
    archive: (id) => setArchived(id, true),
    create: async (input) => {
      const validated = validate(input);
      if (!validated.ok) {
        return validated.failure;
      }
      const now = new Date().toISOString();
      return await persist(
        config.make(validated.data, {
          createdAt: now,
          id: crypto.randomUUID(),
          updatedAt: now,
        })
      );
    },
    get: async (id) => decode(await config.get(id)),
    importRecord: async (record) => {
      const parsed = config.recordSchema.safeParse(record);
      return parsed.success
        ? await persist(parsed.data)
        : invalidResult(parsed.error);
    },
    list: async (options) => {
      const rows = await config.list(options);
      return rows.flatMap((row) => {
        const record = decode(row);
        return record ? [record] : [];
      });
    },
    restore: (id) => setArchived(id, false),
    update: async (id, input) => {
      const validated = validate(input);
      if (!validated.ok) {
        return validated.failure;
      }
      const existing = decode(await config.get(id));
      if (!existing) {
        return notFoundResult(config.notFoundMessage);
      }
      return await persist(
        config.merge(existing, validated.data, new Date().toISOString())
      );
    },
  };
};
