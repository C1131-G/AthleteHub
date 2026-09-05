import { createClient } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

import { createCollections } from "./collections";
import type { Collections } from "./collections";
import { PrismaClient } from "./generated/client";
import {
  createSessionAccessors,
  listSessionRecords,
  readSessionRecord,
  saveSessionRecord,
} from "./sessions";

export interface DatabaseContext {
  close: () => Promise<void>;
  collections: Collections;
  createTestRecord: (input: { id: string; label: string }) => Promise<void>;
  healthCheck: () => Promise<{ status: "ready" }>;
  listTestRecords: () => Promise<{ id: string; label: string }[]>;
  owner: {
    create: (input: OwnerAccountInput) => Promise<void>;
    get: () => Promise<OwnerAccount | null>;
    update: (input: OwnerAccountUpdate) => Promise<void>;
  };
  runTransaction: <TResult>(
    operation: (transaction: DatabaseContext) => Promise<TResult>
  ) => Promise<TResult>;
  sessions: {
    get: (sessionId: string) => Promise<SessionRecord | undefined>;
    listAll: () => Promise<SessionRecord[]>;
    listByAthlete: (athleteId: string) => Promise<SessionRecord[]>;
    save: (input: SessionRecordInput) => Promise<SessionRecord>;
  };
}

export interface SessionArrowRecord {
  score: number;
  // Normalised -1…1 on the target face; null when the arrow was scored but
  // never plotted.
  x: number | null;
  y: number | null;
}

export interface SessionEndRecord {
  arrowCount: number;
  // Ordered by sequence; empty when the end was recorded without plotting.
  arrows: SessionArrowRecord[];
  score: number;
}

export interface SessionRecord {
  actualArrows: number | null;
  athleteId: string;
  createdAt: Date;
  date: string;
  durationMin: number | null;
  ends: SessionEndRecord[];
  equipmentSetupId: string | null;
  formatSnapshot: string;
  id: string;
  kind: string;
  notes: string;
  plannedArrows: number | null;
  rpe: number | null;
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
  failedAttempts: number;
  id: string;
  lockedUntil: Date | null;
  passwordHash: Uint8Array<ArrayBuffer>;
  passwordSalt: Uint8Array<ArrayBuffer>;
  recoveryHash: Uint8Array<ArrayBuffer>;
  recoverySalt: Uint8Array<ArrayBuffer>;
  updatedAt: Date;
  username: string;
}

export interface OwnerAccountInput {
  createdAt: Date;
  id: string;
  passwordHash: Uint8Array<ArrayBuffer>;
  passwordSalt: Uint8Array<ArrayBuffer>;
  recoveryHash: Uint8Array<ArrayBuffer>;
  recoverySalt: Uint8Array<ArrayBuffer>;
  updatedAt: Date;
  username: string;
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
  {
    name: "0003_owner_username",
    sql: [
      `ALTER TABLE "OwnerAccount" RENAME COLUMN "email" TO "username"`,
      `DELETE FROM "OwnerAccount" WHERE "username" LIKE '%@%'`,
    ],
  },
  {
    name: "0004_collections",
    sql: [
      `CREATE TABLE IF NOT EXISTS "Athlete" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "code" TEXT NOT NULL,
      "fullName" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "dateOfBirth" TEXT NOT NULL,
      "profileSnapshot" TEXT NOT NULL,
      "archivedAt" DATETIME,
      "createdAt" DATETIME NOT NULL,
      "updatedAt" DATETIME NOT NULL
    )`,
      `CREATE INDEX IF NOT EXISTS "Athlete_archivedAt_fullName_idx" ON "Athlete" ("archivedAt", "fullName")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Athlete_code_key" ON "Athlete" ("code") WHERE "archivedAt" IS NULL`,
      `CREATE TABLE IF NOT EXISTS "EquipmentSetup" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "athleteId" TEXT NOT NULL,
      "recordedAt" TEXT NOT NULL,
      "itemsSnapshot" TEXT NOT NULL,
      "archivedAt" DATETIME,
      "createdAt" DATETIME NOT NULL,
      "updatedAt" DATETIME NOT NULL
    )`,
      `CREATE INDEX IF NOT EXISTS "EquipmentSetup_athleteId_recordedAt_idx" ON "EquipmentSetup" ("athleteId", "recordedAt")`,
      `CREATE TABLE IF NOT EXISTS "WeeklyReport" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "athleteId" TEXT NOT NULL,
      "weekStart" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "reportSnapshot" TEXT NOT NULL,
      "archivedAt" DATETIME,
      "createdAt" DATETIME NOT NULL,
      "updatedAt" DATETIME NOT NULL
    )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyReport_athleteId_weekStart_key" ON "WeeklyReport" ("athleteId", "weekStart") WHERE "archivedAt" IS NULL`,
      `CREATE TABLE IF NOT EXISTS "MonthlyReport" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "athleteId" TEXT NOT NULL,
      "month" TEXT NOT NULL,
      "reportSnapshot" TEXT NOT NULL,
      "archivedAt" DATETIME,
      "createdAt" DATETIME NOT NULL,
      "updatedAt" DATETIME NOT NULL
    )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyReport_athleteId_month_key" ON "MonthlyReport" ("athleteId", "month") WHERE "archivedAt" IS NULL`,
      `CREATE TABLE IF NOT EXISTS "Assessment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "athleteId" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "weeklyReportId" TEXT,
      "payloadSnapshot" TEXT NOT NULL,
      "archivedAt" DATETIME,
      "createdAt" DATETIME NOT NULL,
      "updatedAt" DATETIME NOT NULL
    )`,
      `CREATE INDEX IF NOT EXISTS "Assessment_athleteId_date_idx" ON "Assessment" ("athleteId", "date")`,
      `CREATE TABLE IF NOT EXISTS "ConditioningAssessment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "athleteId" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "resultsSnapshot" TEXT NOT NULL,
      "archivedAt" DATETIME,
      "createdAt" DATETIME NOT NULL,
      "updatedAt" DATETIME NOT NULL
    )`,
      `CREATE INDEX IF NOT EXISTS "ConditioningAssessment_athleteId_date_idx" ON "ConditioningAssessment" ("athleteId", "date")`,
      `CREATE TABLE IF NOT EXISTS "ConditioningProgramme" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "athleteId" TEXT NOT NULL,
      "startDate" TEXT NOT NULL,
      "endDate" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "phasesSnapshot" TEXT NOT NULL,
      "archivedAt" DATETIME,
      "createdAt" DATETIME NOT NULL,
      "updatedAt" DATETIME NOT NULL
    )`,
      `CREATE INDEX IF NOT EXISTS "ConditioningProgramme_athleteId_startDate_idx" ON "ConditioningProgramme" ("athleteId", "startDate")`,
      `CREATE TABLE IF NOT EXISTS "TrainingPlan" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "athleteId" TEXT NOT NULL,
      "seasonStart" TEXT NOT NULL,
      "seasonEnd" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "planSnapshot" TEXT NOT NULL,
      "archivedAt" DATETIME,
      "createdAt" DATETIME NOT NULL,
      "updatedAt" DATETIME NOT NULL
    )`,
      `CREATE INDEX IF NOT EXISTS "TrainingPlan_athleteId_seasonStart_idx" ON "TrainingPlan" ("athleteId", "seasonStart")`,
      `CREATE TABLE IF NOT EXISTS "MonthlyCycle" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "athleteId" TEXT NOT NULL,
      "month" TEXT NOT NULL,
      "completedAt" DATETIME,
      "stepsSnapshot" TEXT NOT NULL,
      "archivedAt" DATETIME,
      "createdAt" DATETIME NOT NULL,
      "updatedAt" DATETIME NOT NULL
    )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyCycle_athleteId_month_key" ON "MonthlyCycle" ("athleteId", "month") WHERE "archivedAt" IS NULL`,
    ],
  },
  {
    name: "0005_partial_unique_keys",
    sql: [
      // An archived record must not keep reserving its code, week, or month;
      // SQLite cannot drop an inline UNIQUE, so Athlete is rebuilt.
      `CREATE TABLE IF NOT EXISTS "Athlete_new" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "code" TEXT NOT NULL,
      "fullName" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "dateOfBirth" TEXT NOT NULL,
      "profileSnapshot" TEXT NOT NULL,
      "archivedAt" DATETIME,
      "createdAt" DATETIME NOT NULL,
      "updatedAt" DATETIME NOT NULL
    )`,
      `INSERT OR IGNORE INTO "Athlete_new" SELECT "id", "code", "fullName", "category", "status", "dateOfBirth", "profileSnapshot", "archivedAt", "createdAt", "updatedAt" FROM "Athlete"`,
      `DROP TABLE "Athlete"`,
      `ALTER TABLE "Athlete_new" RENAME TO "Athlete"`,
      `CREATE INDEX IF NOT EXISTS "Athlete_archivedAt_fullName_idx" ON "Athlete" ("archivedAt", "fullName")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Athlete_code_key" ON "Athlete" ("code") WHERE "archivedAt" IS NULL`,
      `DROP INDEX IF EXISTS "WeeklyReport_athleteId_weekStart_key"`,
      `CREATE UNIQUE INDEX "WeeklyReport_athleteId_weekStart_key" ON "WeeklyReport" ("athleteId", "weekStart") WHERE "archivedAt" IS NULL`,
      `DROP INDEX IF EXISTS "MonthlyReport_athleteId_month_key"`,
      `CREATE UNIQUE INDEX "MonthlyReport_athleteId_month_key" ON "MonthlyReport" ("athleteId", "month") WHERE "archivedAt" IS NULL`,
      `DROP INDEX IF EXISTS "MonthlyCycle_athleteId_month_key"`,
      `CREATE UNIQUE INDEX "MonthlyCycle_athleteId_month_key" ON "MonthlyCycle" ("athleteId", "month") WHERE "archivedAt" IS NULL`,
    ],
  },
  {
    name: "0006_archery_arrows",
    sql: [
      `CREATE TABLE IF NOT EXISTS "ArcheryArrow" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "endId" TEXT NOT NULL,
      "sequence" INTEGER NOT NULL,
      "score" INTEGER NOT NULL,
      "x" REAL,
      "y" REAL,
      CONSTRAINT "ArcheryArrow_endId_fkey" FOREIGN KEY ("endId") REFERENCES "ArcheryEnd" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "ArcheryArrow_endId_sequence_key" ON "ArcheryArrow" ("endId", "sequence")`,
      `CREATE INDEX IF NOT EXISTS "ArcheryArrow_endId_idx" ON "ArcheryArrow" ("endId")`,
    ],
  },
  {
    name: "0007_sight_marks",
    sql: [
      `CREATE TABLE IF NOT EXISTS "SightMark" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "athleteId" TEXT NOT NULL,
      "bow" TEXT NOT NULL,
      "arrow" TEXT NOT NULL,
      "distanceM" REAL NOT NULL,
      "mark" TEXT NOT NULL,
      "note" TEXT NOT NULL,
      "snapshot" TEXT NOT NULL,
      "archivedAt" DATETIME,
      "createdAt" DATETIME NOT NULL,
      "updatedAt" DATETIME NOT NULL
    )`,
      // One active mark per athlete/bow/arrow/distance: archiving a mark must
      // free its distance for a replacement, so the unique key is partial.
      `CREATE UNIQUE INDEX IF NOT EXISTS "SightMark_athleteId_bow_arrow_distanceM_key" ON "SightMark" ("athleteId", "bow", "arrow", "distanceM") WHERE "archivedAt" IS NULL`,
      `CREATE INDEX IF NOT EXISTS "SightMark_athleteId_bow_arrow_idx" ON "SightMark" ("athleteId", "bow", "arrow")`,
    ],
  },
  {
    // Session load arrives after every existing session, so both columns are
    // nullable: a session logged in a hurry must still save.
    name: "0008_session_load",
    sql: [
      `ALTER TABLE "ArcherySession" ADD COLUMN "durationMin" INTEGER`,
      `ALTER TABLE "ArcherySession" ADD COLUMN "rpe" INTEGER`,
    ],
  },
  {
    name: "0009_wellness",
    sql: [
      `CREATE TABLE IF NOT EXISTS "WellnessEntry" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "athleteId" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "sleep" INTEGER NOT NULL,
      "soreness" INTEGER NOT NULL,
      "fatigue" INTEGER NOT NULL,
      "stress" INTEGER NOT NULL,
      "mood" INTEGER NOT NULL,
      "note" TEXT NOT NULL,
      "snapshot" TEXT NOT NULL,
      "archivedAt" DATETIME,
      "createdAt" DATETIME NOT NULL,
      "updatedAt" DATETIME NOT NULL
    )`,
      // One live entry per athlete and date; archiving frees the date.
      `CREATE UNIQUE INDEX IF NOT EXISTS "WellnessEntry_athleteId_date_key" ON "WellnessEntry" ("athleteId", "date") WHERE "archivedAt" IS NULL`,
      `CREATE INDEX IF NOT EXISTS "WellnessEntry_athleteId_date_idx" ON "WellnessEntry" ("athleteId", "date")`,
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

  // One round trip up front instead of a SELECT per migration on every launch.
  const ledger = await migrationClient.execute(
    `SELECT "name" FROM "_athletehub_migrations"`
  );
  const appliedNames = new Set(ledger.rows.map((row) => String(row.name)));

  const applyMigration = async (index: number): Promise<void> => {
    const migration = migrations[index];
    if (!migration) {
      return;
    }

    if (!appliedNames.has(migration.name)) {
      await migrationClient.batch([
        ...migration.sql,
        {
          args: [migration.name, new Date().toISOString()],
          sql: `INSERT INTO "_athletehub_migrations" ("name", "appliedAt") VALUES (?, ?)`,
        },
      ]);
      appliedNames.add(migration.name);
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

  const readSession = (sessionId: string) =>
    readSessionRecord(prisma, sessionId);

  const listSessions = (athleteId: string) =>
    listSessionRecords(prisma, athleteId);

  const listAllSessions = () => listSessionRecords(prisma);

  const saveSession = (input: SessionRecordInput) =>
    prisma.$transaction((transaction) => saveSessionRecord(transaction, input));

  const context: DatabaseContext = {
    close: () => prisma.$disconnect(),
    collections: createCollections(prisma),
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
    runTransaction: (operation) =>
      prisma.$transaction((transaction) => {
        const transactionalContext: DatabaseContext = {
          ...context,
          collections: createCollections(transaction),
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
          sessions: createSessionAccessors(transaction),
        };
        return operation(transactionalContext);
      }),
    sessions: {
      get: readSession,
      listAll: listAllSessions,
      listByAthlete: listSessions,
      save: saveSession,
    },
  };

  return context;
};
