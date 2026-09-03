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
}

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
        };
        await operation(transactionalContext);
      });
    },
  };

  return context;
};
