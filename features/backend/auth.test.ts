import {
  afterEach as bunAfterEach,
  beforeEach as bunBeforeEach,
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createClient } from "@libsql/client";

import { createAuthService } from "../../electron/auth";
import type { AuthService } from "../../electron/auth";
import { createDatabaseContext } from "../../electron/backend";
import type { DatabaseContext } from "../../electron/backend";

let directory: string;
let database: DatabaseContext;
let auth: AuthService;

const removeDirectory = async (
  directoryPath: string,
  attempt = 0
): Promise<void> => {
  try {
    await rm(directoryPath, { force: true, recursive: true });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("EBUSY")) {
      throw error;
    }
    if (attempt >= 10) {
      return;
    }
    await Bun.sleep(25);
    await removeDirectory(directoryPath, attempt + 1);
  }
};

const seedLegacyOwner = async (databaseUrl: string) => {
  const client = createClient({ url: databaseUrl });
  await client.batch([
    `CREATE TABLE IF NOT EXISTS "_athletehub_migrations" (
      "name" TEXT NOT NULL PRIMARY KEY,
      "appliedAt" TEXT NOT NULL
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
    `INSERT INTO "_athletehub_migrations" ("name", "appliedAt")
      VALUES ('0001_initial', '2024-01-01T00:00:00.000Z')`,
    `INSERT INTO "OwnerAccount"
      ("id", "email", "passwordHash", "passwordSalt", "recoveryHash",
       "recoverySalt", "createdAt", "updatedAt")
      VALUES ('legacy', 'owner@example.com', x'00', x'00', x'00', x'00',
        '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z')`,
  ]);
  client.close();
};

bunDescribe("owner authentication", () => {
  bunBeforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "athlete360-auth-"));
    database = await createDatabaseContext({
      databaseUrl: `file:${path.join(directory, "athlete360.db")}`,
    });
    auth = createAuthService(database);
  });

  bunAfterEach(async () => {
    await database.close();
    await removeDirectory(directory);
  });

  bunTest("allows setup once and authenticates with the password", async () => {
    const setup = await auth.setup({
      password: "correct horse battery staple",
      username: "owner",
    });

    bunExpect(setup.recoveryCode).toMatch(/^[A-Z0-9-]{19}$/);
    const status = await auth.status();
    bunExpect(status.configured).toBe(true);
    const loginResult = await auth.login({
      password: "correct horse battery staple",
      username: "owner",
    });
    bunExpect(loginResult.authenticated).toBe(true);
    bunExpect(auth.isAuthenticated()).toBe(true);
    bunExpect(
      auth.setup({
        password: "another password",
        username: "another",
      })
    ).rejects.toMatchObject({ code: "ALREADY_CONFIGURED" });
  });

  bunTest(
    "rejects incorrect credentials and protects private calls while locked",
    async () => {
      await auth.setup({
        password: "password one",
        username: "owner",
      });
      await auth.logout();

      bunExpect(
        auth.login({
          password: "wrong password",
          username: "owner",
        })
      ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
      bunExpect(auth.requireSession()).rejects.toMatchObject({
        code: "UNAUTHENTICATED",
      });
    }
  );

  bunTest("rejects malformed direct calls at the service boundary", () =>
    Promise.all([
      bunExpect(auth.setup(null)).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
      }),
      bunExpect(auth.login({ username: "ab" })).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
      }),
    ])
  );

  bunTest(
    "recovery resets access without changing persisted records",
    async () => {
      const setup = await auth.setup({
        password: "password one",
        username: "owner",
      });
      await database.createTestRecord({
        id: "athlete-1",
        label: "Athlete One",
      });

      const recovered = await auth.recover({
        newPassword: "password two",
        recoveryCode: setup.recoveryCode,
        username: "owner",
      });

      bunExpect(recovered.authenticated).toBe(true);
      const records = await database.listTestRecords();
      bunExpect(records.map((record) => record.id)).toEqual(["athlete-1"]);
      await auth.logout();
      bunExpect(
        auth.login({
          password: "password two",
          username: "owner",
        })
      ).resolves.toMatchObject({ authenticated: true });
    }
  );

  bunTest(
    "changes the password only when the current one is confirmed",
    async () => {
      await auth.setup({
        password: "password one",
        username: "owner",
      });

      bunExpect(
        auth.changePassword({
          currentPassword: "wrong password",
          newPassword: "password two",
        })
      ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });

      const changed = await auth.changePassword({
        currentPassword: "password one",
        newPassword: "password two",
      });
      bunExpect(changed.success).toBe(true);

      await auth.logout();
      bunExpect(
        auth.login({ password: "password one", username: "owner" })
      ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
      bunExpect(
        auth.login({ password: "password two", username: "owner" })
      ).resolves.toMatchObject({ authenticated: true });
    }
  );

  bunTest(
    "clears an email-based owner so the install is set up again",
    async () => {
      await database.close();
      const legacyDirectory = await mkdtemp(
        path.join(tmpdir(), "athlete360-legacy-")
      );
      const legacyUrl = `file:${path.join(legacyDirectory, "athlete360.db")}`;
      await seedLegacyOwner(legacyUrl);

      const migrated = await createDatabaseContext({ databaseUrl: legacyUrl });
      const migratedAuth = createAuthService(migrated);

      bunExpect(await migrated.owner.get()).toBeNull();
      const status = await migratedAuth.status();
      bunExpect(status.configured).toBe(false);
      const setup = await migratedAuth.setup({
        password: "a fresh password",
        username: "owner",
      });
      bunExpect(setup.recoveryCode).toMatch(/^[A-Z0-9-]{19}$/);

      await migrated.close();
      await removeDirectory(legacyDirectory);
      database = await createDatabaseContext({
        databaseUrl: `file:${path.join(directory, "athlete360.db")}`,
      });
    }
  );
});
