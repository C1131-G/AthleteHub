import { createClient } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

import { PrismaClient } from "./generated/client";

export interface DatabaseContext {
  close: () => Promise<void>;
  createTestRecord: (input: { id: string; label: string }) => Promise<void>;
  healthCheck: () => Promise<{ status: "ready" }>;
  listTestRecords: () => Promise<{ id: string; label: string }[]>;
  owner: {
    create: (input: OwnerAccountInput) => Promise<void>;
    get: () => Promise<OwnerAccount | null>;
    update: (input: OwnerAccountUpdate) => Promise<void>;
  };
  runTransaction: (
    operation: (transaction: DatabaseContext) => Promise<void>
  ) => Promise<void>;
  sessions: {
    get: (sessionId: string) => Promise<SessionRecord | undefined>;
    listByAthlete: (athleteId: string) => Promise<SessionRecord[]>;
    save: (input: SessionRecordInput) => Promise<SessionRecord>;
  };
}

export interface SessionEndRecord {
  arrowCount: number;
  score: number;
}

export interface SessionRecord {
  actualArrows: number | null;
  athleteId: string;
  createdAt: Date;
  date: string;
  ends: SessionEndRecord[];
  equipmentSetupId: string | null;
  formatSnapshot: string;
  id: string;
  kind: string;
  notes: string;
  plannedArrows: number | null;
  status: string;
  technicalFocus: string;
  updatedAt: Date;
}

export type SessionRecordInput = Omit<
  SessionRecord,
  "createdAt" | "ends" | "updatedAt"
> & {
  ends: SessionEndRecord[];
};

export interface OwnerAccount {
  createdAt: Date;
  email: string;
  failedAttempts: number;
  id: string;
  lockedUntil: Date | null;
  passwordHash: Uint8Array<ArrayBuffer>;
  passwordSalt: Uint8Array<ArrayBuffer>;
  recoveryHash: Uint8Array<ArrayBuffer>;
  recoverySalt: Uint8Array<ArrayBuffer>;
  updatedAt: Date;
}

export interface OwnerAccountInput {
  createdAt: Date;
  email: string;
  id: string;
  passwordHash: Uint8Array<ArrayBuffer>;
  passwordSalt: Uint8Array<ArrayBuffer>;
  recoveryHash: Uint8Array<ArrayBuffer>;
  recoverySalt: Uint8Array<ArrayBuffer>;
  updatedAt: Date;
}

export interface OwnerAccountUpdate {
  failedAttempts?: number;
  lockedUntil?: Date | null;
  passwordHash?: Uint8Array<ArrayBuffer>;
  passwordSalt?: Uint8Array<ArrayBuffer>;
  recoveryHash?: Uint8Array<ArrayBuffer>;
  recoverySalt?: Uint8Array<ArrayBuffer>;
  updatedAt: Date;
}

interface OwnerUpdateData {
  failedAttempts?: number;
  lockedUntil?: Date | null;
  passwordHash?: Uint8Array<ArrayBuffer>;
  passwordSalt?: Uint8Array<ArrayBuffer>;
  recoveryHash?: Uint8Array<ArrayBuffer>;
  recoverySalt?: Uint8Array<ArrayBuffer>;
  updatedAt: Date;
}

const ownerUpdateData = (input: OwnerAccountUpdate): OwnerUpdateData => {
  const data: OwnerUpdateData = { updatedAt: input.updatedAt };
  if (input.failedAttempts !== undefined) {
    data.failedAttempts = input.failedAttempts;
  }
  if (input.lockedUntil !== undefined) {
    data.lockedUntil = input.lockedUntil;
  }
  if (input.passwordHash !== undefined) {
    data.passwordHash = input.passwordHash;
  }
  if (input.passwordSalt !== undefined) {
    data.passwordSalt = input.passwordSalt;
  }
  if (input.recoveryHash !== undefined) {
    data.recoveryHash = input.recoveryHash;
  }
  if (input.recoverySalt !== undefined) {
    data.recoverySalt = input.recoverySalt;
  }
  return data;
};

interface DatabaseOptions {
  databaseUrl: string;
}

const migrations = [
  {
    name: "0001_initial",
    sql: [
      `CREATE TABLE IF NOT EXISTS "BackendProbe" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "label" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL
    )`,
      `CREATE TABLE IF NOT EXISTS "OwnerAccount" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL CONSTRAINT "OwnerAccount_email_key" UNIQUE,
      "passwordHash" BLOB NOT NULL,
      "passwordSalt" BLOB NOT NULL,
      "recoveryHash" BLOB NOT NULL,
      "recoverySalt" BLOB NOT NULL,
      "failedAttempts" INTEGER NOT NULL DEFAULT 0,
      "lockedUntil" DATETIME,
      "createdAt" DATETIME NOT NULL,
      "updatedAt" DATETIME NOT NULL
    )`,
    ],
  },
  {
    name: "0002_archery_sessions",
    sql: [
      `CREATE TABLE IF NOT EXISTS "ArcherySession" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "athleteId" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "kind" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "formatSnapshot" TEXT NOT NULL,
      "equipmentSetupId" TEXT,
      "plannedArrows" INTEGER,
      "actualArrows" INTEGER,
      "technicalFocus" TEXT NOT NULL,
      "notes" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL,
      "updatedAt" DATETIME NOT NULL
    )`,
      `CREATE TABLE IF NOT EXISTS "ArcheryEnd" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "sessionId" TEXT NOT NULL,
      "sequence" INTEGER NOT NULL,
      "arrowCount" INTEGER NOT NULL,
      "score" INTEGER NOT NULL,
      CONSTRAINT "ArcheryEnd_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ArcherySession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "ArcheryEnd_sessionId_sequence_key" ON "ArcheryEnd" ("sessionId", "sequence")`,
      `CREATE INDEX IF NOT EXISTS "ArcherySession_athleteId_date_idx" ON "ArcherySession" ("athleteId", "date")`,
    ],
  },
] as const;

export const createDatabaseContext = async ({
  databaseUrl,
}: DatabaseOptions): Promise<DatabaseContext> => {
  const migrationClient = createClient({ url: databaseUrl });
  await migrationClient.execute(
    `CREATE TABLE IF NOT EXISTS "_athletehub_migrations" (
      "name" TEXT NOT NULL PRIMARY KEY,
      "appliedAt" TEXT NOT NULL
    )`
  );

  const applyMigration = async (index: number): Promise<void> => {
    const migration = migrations[index];
    if (!migration) {
      return;
    }

    const applied = await migrationClient.execute({
      args: [migration.name],
      sql: `SELECT "name" FROM "_athletehub_migrations" WHERE "name" = ?`,
    });
    if (applied.rows.length === 0) {
      await migrationClient.batch([
        ...migration.sql,
        {
          args: [migration.name, new Date().toISOString()],
          sql: `INSERT INTO "_athletehub_migrations" ("name", "appliedAt") VALUES (?, ?)`,
        },
      ]);
    }

    await applyMigration(index + 1);
  };
  await applyMigration(0);
  migrationClient.close();

  const adapter = new PrismaLibSql({ url: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  const createTestRecord = async (input: { id: string; label: string }) => {
    await prisma.backendProbe.create({
      data: { createdAt: new Date(), ...input },
    });
  };

  const listTestRecords = () =>
    prisma.backendProbe.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, label: true },
    });

  const readSession = async (
    sessionId: string
  ): Promise<SessionRecord | undefined> => {
    const record = await prisma.archerySession.findUnique({
      include: { ends: { orderBy: { sequence: "asc" } } },
      where: { id: sessionId },
    });
    return record
      ? {
          ...record,
          ends: record.ends.map(({ arrowCount, score }) => ({
            arrowCount,
            score,
          })),
        }
      : undefined;
  };

  const listSessions = async (athleteId: string): Promise<SessionRecord[]> => {
    const records = await prisma.archerySession.findMany({
      include: { ends: { orderBy: { sequence: "asc" } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      where: { athleteId },
    });
    return records.map((record) => ({
      ...record,
      ends: record.ends.map(({ arrowCount, score }) => ({ arrowCount, score })),
    }));
  };

  const saveSession = async (
    input: SessionRecordInput
  ): Promise<SessionRecord> => {
    const now = new Date();
    const record = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.archerySession.findUnique({
        where: { id: input.id },
      });
      if (existing) {
        await transaction.archerySession.update({
          data: {
            actualArrows: input.actualArrows,
            date: input.date,
            equipmentSetupId: input.equipmentSetupId,
            formatSnapshot: input.formatSnapshot,
            kind: input.kind,
            notes: input.notes,
            plannedArrows: input.plannedArrows,
            status: input.status,
            technicalFocus: input.technicalFocus,
            updatedAt: now,
          },
          where: { id: input.id },
        });
        await transaction.archeryEnd.deleteMany({
          where: { sessionId: input.id },
        });
        await Promise.all(
          input.ends.map((end, index) =>
            transaction.archeryEnd.create({
              data: {
                ...end,
                id: `${input.id}-end-${index + 1}`,
                sequence: index + 1,
                sessionId: input.id,
              },
            })
          )
        );
      } else {
        await transaction.archerySession.create({
          data: {
            actualArrows: input.actualArrows,
            athleteId: input.athleteId,
            createdAt: now,
            date: input.date,
            ends: {
              create: input.ends.map((end, index) => ({
                ...end,
                id: `${input.id}-end-${index + 1}`,
                sequence: index + 1,
              })),
            },
            equipmentSetupId: input.equipmentSetupId,
            formatSnapshot: input.formatSnapshot,
            id: input.id,
            kind: input.kind,
            notes: input.notes,
            plannedArrows: input.plannedArrows,
            status: input.status,
            technicalFocus: input.technicalFocus,
            updatedAt: now,
          },
        });
      }
      return transaction.archerySession.findUniqueOrThrow({
        include: { ends: { orderBy: { sequence: "asc" } } },
        where: { id: input.id },
      });
    });
    return {
      ...record,
      ends: record.ends.map(({ arrowCount, score }) => ({ arrowCount, score })),
    };
  };

  const context: DatabaseContext = {
    close: () => prisma.$disconnect(),
    createTestRecord,
    healthCheck: async () => {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ready" };
    },
    listTestRecords,
    owner: {
      create: async (input) => {
        await prisma.ownerAccount.create({ data: { ...input } });
      },
      get: () => prisma.ownerAccount.findFirst(),
      update: async (input) => {
        const owner = await prisma.ownerAccount.findFirstOrThrow();
        await prisma.ownerAccount.update({
          data: ownerUpdateData(input),
          where: { id: owner.id },
        });
      },
    },
    runTransaction: async (operation) => {
      await prisma.$transaction(async (transaction) => {
        const transactionalContext: DatabaseContext = {
          ...context,
          createTestRecord: async (input) => {
            await transaction.backendProbe.create({
              data: { createdAt: new Date(), ...input },
            });
          },
          owner: {
            create: async (input) => {
              await transaction.ownerAccount.create({ data: { ...input } });
            },
            get: () => transaction.ownerAccount.findFirst(),
            update: async (input) => {
              const owner = await transaction.ownerAccount.findFirstOrThrow();
              await transaction.ownerAccount.update({
                data: ownerUpdateData(input),
                where: { id: owner.id },
              });
            },
          },
          sessions: {
            get: async (sessionId) => {
              const record = await transaction.archerySession.findUnique({
                include: { ends: { orderBy: { sequence: "asc" } } },
                where: { id: sessionId },
              });
              return record
                ? {
                    ...record,
                    ends: record.ends.map(({ arrowCount, score }) => ({
                      arrowCount,
                      score,
                    })),
                  }
                : undefined;
            },
            listByAthlete: async (athleteId) => {
              const records = await transaction.archerySession.findMany({
                include: { ends: { orderBy: { sequence: "asc" } } },
                orderBy: [{ date: "desc" }, { createdAt: "desc" }],
                where: { athleteId },
              });
              return records.map((record) => ({
                ...record,
                ends: record.ends.map(({ arrowCount, score }) => ({
                  arrowCount,
                  score,
                })),
              }));
            },
            save: async (input) => {
              const now = new Date();
              const existing = await transaction.archerySession.findUnique({
                select: { id: true },
                where: { id: input.id },
              });
              if (existing) {
                await transaction.archeryEnd.deleteMany({
                  where: { sessionId: input.id },
                });
                await transaction.archerySession.update({
                  data: {
                    ...input,
                    ends: {
                      create: input.ends.map((end, index) => ({
                        ...end,
                        id: `${input.id}-end-${index + 1}`,
                        sequence: index + 1,
                      })),
                    },
                    updatedAt: now,
                  },
                  where: { id: input.id },
                });
              } else {
                await transaction.archerySession.create({
                  data: {
                    ...input,
                    createdAt: now,
                    ends: {
                      create: input.ends.map((end, index) => ({
                        ...end,
                        id: `${input.id}-end-${index + 1}`,
                        sequence: index + 1,
                      })),
                    },
                    updatedAt: now,
                  },
                });
              }
              const record = await transaction.archerySession.findUniqueOrThrow(
                {
                  include: { ends: { orderBy: { sequence: "asc" } } },
                  where: { id: input.id },
                }
              );
              return {
                ...record,
                ends: record.ends.map(({ arrowCount, score }) => ({
                  arrowCount,
                  score,
                })),
              };
            },
          },
        };
        await operation(transactionalContext);
      });
    },
    sessions: {
      get: readSession,
      listByAthlete: listSessions,
      save: saveSession,
    },
  };

  return context;
};
