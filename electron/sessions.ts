import type {
  DatabaseContext,
  SessionRecord,
  SessionRecordInput,
} from "./backend";
import type { Prisma, PrismaClient } from "./generated/client";

/**
 * Accepts the client and the transactional client alike, so each accessor is
 * written once and `runTransaction` reuses it rather than restating it.
 */
export type SessionClient = Prisma.TransactionClient | PrismaClient;

type SessionRow = Prisma.ArcherySessionGetPayload<{
  include: { ends: { include: { arrows: { orderBy: { sequence: "asc" } } } } };
}>;

const toRecord = (row: SessionRow): SessionRecord => ({
  ...row,
  ends: row.ends.map((end) => ({
    arrowCount: end.arrowCount,
    arrows: end.arrows.map(({ score, x, y }) => ({ score, x, y })),
    score: end.score,
  })),
});

export const readSessionRecord = async (
  client: SessionClient,
  sessionId: string
): Promise<SessionRecord | undefined> => {
  const row = await client.archerySession.findUnique({
    include: {
      ends: {
        include: { arrows: { orderBy: { sequence: "asc" } } },
        orderBy: { sequence: "asc" },
      },
    },
    where: { id: sessionId },
  });
  return row ? toRecord(row) : undefined;
};

export const listSessionRecords = async (
  client: SessionClient,
  athleteId?: string
): Promise<SessionRecord[]> => {
  const rows =
    athleteId === undefined
      ? await client.archerySession.findMany({
          include: {
            ends: {
              include: { arrows: { orderBy: { sequence: "asc" } } },
              orderBy: { sequence: "asc" },
            },
          },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        })
      : await client.archerySession.findMany({
          include: {
            ends: {
              include: { arrows: { orderBy: { sequence: "asc" } } },
              orderBy: { sequence: "asc" },
            },
          },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          where: { athleteId },
        });
  return rows.map(toRecord);
};

/**
 * Creates or updates a session in place on the given client. Callers that are
 * not already inside a transaction must wrap this in one: the read, the ends
 * replacement, and the final read are only consistent together.
 */
export const saveSessionRecord = async (
  client: SessionClient,
  input: SessionRecordInput
): Promise<SessionRecord> => {
  const now = new Date();
  const ends = input.ends.map((end, index) => ({
    arrowCount: end.arrowCount,
    arrows: {
      create: end.arrows.map((arrow, arrowIndex) => ({
        id: `${input.id}-end-${index + 1}-arrow-${arrowIndex + 1}`,
        score: arrow.score,
        sequence: arrowIndex + 1,
        x: arrow.x,
        y: arrow.y,
      })),
    },
    id: `${input.id}-end-${index + 1}`,
    score: end.score,
    sequence: index + 1,
  }));

  const existing = await client.archerySession.findUnique({
    select: { athleteId: true },
    where: { id: input.id },
  });
  if (existing) {
    if (existing.athleteId !== input.athleteId) {
      throw new Error("A session cannot be moved to another athlete.");
    }
    // Ends are immutable snapshots of a shot session, so an update replaces
    // the whole set instead of diffing it.
    await client.archeryEnd.deleteMany({ where: { sessionId: input.id } });
    await client.archerySession.update({
      data: {
        actualArrows: input.actualArrows,
        date: input.date,
        durationMin: input.durationMin,
        ends: { create: ends },
        equipmentSetupId: input.equipmentSetupId,
        formatSnapshot: input.formatSnapshot,
        kind: input.kind,
        notes: input.notes,
        plannedArrows: input.plannedArrows,
        rpe: input.rpe,
        status: input.status,
        technicalFocus: input.technicalFocus,
        updatedAt: now,
      },
      where: { id: input.id },
    });
  } else {
    await client.archerySession.create({
      data: {
        actualArrows: input.actualArrows,
        athleteId: input.athleteId,
        createdAt: now,
        date: input.date,
        durationMin: input.durationMin,
        ends: { create: ends },
        equipmentSetupId: input.equipmentSetupId,
        formatSnapshot: input.formatSnapshot,
        id: input.id,
        kind: input.kind,
        notes: input.notes,
        plannedArrows: input.plannedArrows,
        rpe: input.rpe,
        status: input.status,
        technicalFocus: input.technicalFocus,
        updatedAt: now,
      },
    });
  }

  const row = await client.archerySession.findUniqueOrThrow({
    include: {
      ends: {
        include: { arrows: { orderBy: { sequence: "asc" } } },
        orderBy: { sequence: "asc" },
      },
    },
    where: { id: input.id },
  });
  return toRecord(row);
};

export const createSessionAccessors = (
  client: SessionClient
): DatabaseContext["sessions"] => ({
  get: (sessionId) => readSessionRecord(client, sessionId),
  listAll: () => listSessionRecords(client),
  listByAthlete: (athleteId) => listSessionRecords(client, athleteId),
  save: (input) => saveSessionRecord(client, input),
});
