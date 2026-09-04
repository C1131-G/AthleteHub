import type { DatabaseContext, SessionRecord } from "../../electron/backend";
import { sessionFormatSchema, sessionInputSchema } from "./session-types";
import type { ArcherySession, SessionMutationResult } from "./session-types";

export interface SessionService {
  complete: (input: unknown) => Promise<SessionMutationResult>;
  get: (sessionId: string) => Promise<ArcherySession | undefined>;
  listByAthlete: (athleteId: string) => Promise<ArcherySession[]>;
  saveDraft: (input: unknown) => Promise<SessionMutationResult>;
}

const validationFailure = (error: {
  issues: { path: PropertyKey[]; message: string }[];
}) => ({
  fieldErrors: Object.fromEntries(
    error.issues.map((issue) => [issue.path.join("."), issue.message])
  ),
  status: "invalid" as const,
});

const parseFormatSnapshot = (snapshot: string) => {
  try {
    const parsed: unknown = JSON.parse(snapshot);
    const result = sessionFormatSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null;
    }
  }
};

const toSession = (
  record: SessionRecord | undefined
): ArcherySession | undefined => {
  if (!record) {
    return;
  }
  const format = parseFormatSnapshot(record.formatSnapshot);
  if (
    !format ||
    (record.kind !== "practice" && record.kind !== "competition") ||
    (record.status !== "draft" && record.status !== "complete")
  ) {
    return;
  }
  return {
    actualArrows: record.actualArrows ?? undefined,
    athleteId: record.athleteId,
    createdAt: record.createdAt.toISOString(),
    date: record.date,
    ends: record.ends.map(({ arrowCount, score }) => ({ arrowCount, score })),
    equipmentSetupId: record.equipmentSetupId ?? undefined,
    format,
    id: record.id,
    kind: record.kind,
    notes: record.notes,
    plannedArrows: record.plannedArrows ?? undefined,
    status: record.status,
    technicalFocus: record.technicalFocus,
    updatedAt: record.updatedAt.toISOString(),
  };
};

export const createSessionService = (
  sessions: DatabaseContext["sessions"]
): SessionService => {
  const save = async (
    value: unknown,
    status: ArcherySession["status"]
  ): Promise<SessionMutationResult> => {
    const parsed = sessionInputSchema.safeParse(value);
    if (!parsed.success) {
      return validationFailure(parsed.error);
    }
    const stored = await sessions.save({
      ...parsed.data,
      actualArrows:
        parsed.data.actualArrows ??
        parsed.data.ends.reduce((total, end) => total + end.arrowCount, 0),
      equipmentSetupId: parsed.data.equipmentSetupId ?? null,
      formatSnapshot: JSON.stringify(parsed.data.format),
      plannedArrows: parsed.data.plannedArrows ?? null,
      status,
    });
    const session = toSession(stored);
    return session
      ? { session, status: "saved" }
      : {
          fieldErrors: { id: "Session could not be read after saving." },
          status: "invalid",
        };
  };

  return {
    complete: (input) => save(input, "complete"),
    get: async (sessionId) => {
      const record = await sessions.get(sessionId);
      return toSession(record);
    },
    listByAthlete: async (athleteId) => {
      const records = await sessions.listByAthlete(athleteId);
      return records.flatMap((record) => {
        const session = toSession(record);
        return session ? [session] : [];
      });
    },
    saveDraft: (input) => save(input, "draft"),
  };
};
