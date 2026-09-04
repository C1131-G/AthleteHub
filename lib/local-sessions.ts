import { z } from "zod";

import type {
  DatabaseContext,
  SessionRecord,
  SessionRecordInput,
} from "../electron/backend";
import { readStoredArray, writeStored } from "./storage";

/**
 * A localStorage implementation of the session accessor, used when the app runs
 * in a plain browser during development. The session service runs unchanged on
 * top of it, so the dev loop exercises the real validation instead of hiding
 * the workspace behind a "desktop only" message.
 *
 * A development convenience, not a supported storage mode: the desktop app
 * always reaches SQLite through the main process.
 */
const STORAGE_KEY = "athletehub.local.sessions";

const storedSessionSchema = z.object({
  actualArrows: z.number().nullable(),
  athleteId: z.string(),
  createdAt: z.string(),
  date: z.string(),
  ends: z.array(z.object({ arrowCount: z.number(), score: z.number() })),
  equipmentSetupId: z.string().nullable(),
  formatSnapshot: z.string(),
  id: z.string(),
  kind: z.string(),
  notes: z.string(),
  plannedArrows: z.number().nullable(),
  status: z.string(),
  technicalFocus: z.string(),
  updatedAt: z.string(),
});

type StoredSession = z.infer<typeof storedSessionSchema>;

const readSessions = (): StoredSession[] =>
  readStoredArray(STORAGE_KEY).flatMap((value) => {
    const result = storedSessionSchema.safeParse(value);
    return result.success ? [result.data] : [];
  });

const toRecord = (stored: StoredSession): SessionRecord => ({
  ...stored,
  createdAt: new Date(stored.createdAt),
  updatedAt: new Date(stored.updatedAt),
});

export const createLocalSessions = (): DatabaseContext["sessions"] => ({
  get: async (sessionId) => {
    const stored = readSessions().find((session) => session.id === sessionId);
    return await Promise.resolve(stored ? toRecord(stored) : undefined);
  },
  listAll: async () => {
    const stored = readSessions().toSorted(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
    );
    return await Promise.resolve(stored.map(toRecord));
  },
  listByAthlete: async (athleteId) => {
    const stored = readSessions()
      .filter((session) => session.athleteId === athleteId)
      .toSorted(
        (a, b) =>
          b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
      );
    return await Promise.resolve(stored.map(toRecord));
  },
  save: async (input: SessionRecordInput) => {
    const sessions = readSessions();
    const existing = sessions.find((session) => session.id === input.id);
    if (existing && existing.athleteId !== input.athleteId) {
      throw new Error("A session cannot be moved to another athlete.");
    }
    const now = new Date().toISOString();
    const stored: StoredSession = {
      ...input,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    writeStored(
      STORAGE_KEY,
      existing
        ? sessions.map((session) =>
            session.id === stored.id ? stored : session
          )
        : [stored, ...sessions]
    );
    return await Promise.resolve(toRecord(stored));
  },
});
