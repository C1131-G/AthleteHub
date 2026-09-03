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

bunDescribe("owner authentication", () => {
  bunBeforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "athletehub-auth-"));
    database = await createDatabaseContext({
      databaseUrl: `file:${path.join(directory, "athletehub.db")}`,
    });
    auth = createAuthService(database);
  });

  bunAfterEach(async () => {
    await database.close();
    await removeDirectory(directory);
  });

  bunTest("allows setup once and authenticates with the password", async () => {
    const setup = await auth.setup({
      email: "owner@example.com",
      password: "correct horse battery staple",
    });

    bunExpect(setup.recoveryCode).toMatch(/^[A-Z0-9-]{19}$/);
    const status = await auth.status();
    bunExpect(status.configured).toBe(true);
    const loginResult = await auth.login({
      email: "owner@example.com",
      password: "correct horse battery staple",
    });
    bunExpect(loginResult.authenticated).toBe(true);
    bunExpect(auth.isAuthenticated()).toBe(true);
    bunExpect(
      auth.setup({
        email: "another@example.com",
        password: "another password",
      })
    ).rejects.toMatchObject({ code: "ALREADY_CONFIGURED" });
  });

  bunTest(
    "rejects incorrect credentials and protects private calls while locked",
    async () => {
      await auth.setup({
        email: "owner@example.com",
        password: "password one",
      });
      await auth.logout();

      bunExpect(
        auth.login({
          email: "owner@example.com",
          password: "wrong password",
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
      bunExpect(auth.login({ email: "not-an-email" })).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
      }),
    ])
  );

  bunTest(
    "recovery resets access without changing persisted records",
    async () => {
      const setup = await auth.setup({
        email: "owner@example.com",
        password: "password one",
      });
      await database.createTestRecord({
        id: "athlete-1",
        label: "Athlete One",
      });

      const recovered = await auth.recover({
        email: "owner@example.com",
        newPassword: "password two",
        recoveryCode: setup.recoveryCode,
      });

      bunExpect(recovered.authenticated).toBe(true);
      const records = await database.listTestRecords();
      bunExpect(records.map((record) => record.id)).toEqual(["athlete-1"]);
      await auth.logout();
      bunExpect(
        auth.login({
          email: "owner@example.com",
          password: "password two",
        })
      ).resolves.toMatchObject({ authenticated: true });
    }
  );
});
