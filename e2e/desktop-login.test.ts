import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  expect as playwrightExpect,
  test as playwrightTest,
  _electron,
} from "@playwright/test";
import type { Page } from "@playwright/test";

import { createAuthService } from "../electron/auth";
import { createDatabaseContext } from "../electron/backend";

/**
 * Drives the real Electron app against a scratch profile, covering the flows
 * nothing else can reach: first-run account creation on the local login
 * screen, the session surviving the navigation into the Next app, logout
 * returning to the login screen, and the main-process security boundary
 * between the login window and the data channels.
 *
 * The scratch profile points app.getPath("userData") at a throwaway directory
 * (via ATHLETEHUB_USER_DATA), so these tests never touch a real database and
 * get a predictable port. Leftover temp directories are not deleted: Windows
 * holds them briefly after the app exits.
 *
 * `--production` uses the standalone bundle the webServer already built, so
 * each test boots its own server on its own port. First launch in a scratch
 * profile pays the V8 compile-cache population, hence the raised timeouts.
 */
const USER_DATA_ENV = "ATHLETEHUB_USER_DATA";
const OWNER_CREDENTIALS = {
  password: "correct horse battery staple",
  username: "owner",
} as const;
const BOOT_BUDGET_MS = 180_000;

const newScratchUserData = () =>
  mkdtemp(path.join(tmpdir(), "athletehub-e2e-"));

const seedOwner = async (userData: string) => {
  const database = await createDatabaseContext({
    databaseUrl: `file:${path.join(userData, "athletehub.db")}`,
  });
  const auth = createAuthService(database);
  await auth.setup(OWNER_CREDENTIALS);
  await database.close();
};

const launchApp = (userData: string) =>
  _electron.launch({
    args: [path.join(process.cwd(), "electron", "main.cjs"), "--production"],
    env: { ...process.env, [USER_DATA_ENV]: userData },
  });

const runWithApp = async (
  testBody: (appWindow: Page) => Promise<void>
): Promise<void> => {
  const app = await launchApp(await newScratchUserData());
  try {
    await testBody(await app.firstWindow());
  } finally {
    await app.close();
  }
};

/**
 * Evaluates a bridge call in the page, where `api` is window.electronAPI.
 * Reports the rejection message, or "allowed" when the call succeeds.
 */
const bridgeOutcome = (call: string) =>
  `(async () => {
    const api = window.electronAPI;
    if (!api) {
      return "no bridge";
    }
    try {
      await (${call});
      return "allowed";
    } catch (error) {
      return String(error.message);
    }
  })()`;

const probeBridge = (appWindow: Page, call: string) =>
  appWindow.evaluate<string>(bridgeOutcome(call));

const loginThrough = async (appWindow: Page) => {
  // Scoped by id: the login page carries hidden setup/recovery views whose
  // fields share the labels.
  await appWindow.locator("#login-username").fill(OWNER_CREDENTIALS.username);
  await appWindow.locator("#login-password").fill(OWNER_CREDENTIALS.password);
  await appWindow.getByRole("button", { name: "Log in" }).click();
  await playwrightExpect(appWindow).toHaveURL(/\/dashboard/);
};

playwrightTest.describe("desktop login", () => {
  playwrightTest(
    "first run asks for a username and password, then shows the recovery code",
    async () => {
      playwrightTest.setTimeout(BOOT_BUDGET_MS);
      await runWithApp(async (appWindow) => {
        await playwrightExpect(appWindow.locator("#setup-view")).toBeVisible();
        await playwrightExpect(appWindow.locator("#login-view")).toBeHidden();

        await appWindow
          .locator("#setup-username")
          .fill(OWNER_CREDENTIALS.username);
        await appWindow
          .locator("#setup-password")
          .fill(OWNER_CREDENTIALS.password);
        await appWindow
          .getByLabel("Confirm password")
          .fill(OWNER_CREDENTIALS.password);
        await appWindow.getByRole("button", { name: "Create account" }).click();

        await playwrightExpect(appWindow.locator("#code-view")).toBeVisible();
        await playwrightExpect(
          appWindow.locator("#recovery-code-value")
        ).toHaveText(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

        await appWindow
          .getByRole("button", { name: "Continue to AthleteHub" })
          .click();
        await playwrightExpect(appWindow).toHaveURL(/\/dashboard/);
        // The account created on the login page is already signed in.
        playwrightExpect(
          await probeBridge(appWindow, "api.backend.sessions.listAll()")
        ).toBe("allowed");
      });
    }
  );

  playwrightTest(
    "data channels reject the login window before authentication",
    async () => {
      playwrightTest.setTimeout(BOOT_BUDGET_MS);
      await runWithApp(async (appWindow) => {
        await appWindow.waitForLoadState();

        playwrightExpect(
          await probeBridge(appWindow, "api.backend.sessions.listAll()")
        ).toContain("Untrusted renderer");
        playwrightExpect(
          await probeBridge(
            appWindow,
            "api.backend.collections.athletes.list()"
          )
        ).toContain("Untrusted renderer");
        // The photo channels are data channels too: session-gated and
        // origin-only, so the login window cannot read or write files.
        playwrightExpect(
          await probeBridge(appWindow, "api.backend.photos.read('athlete-1')")
        ).toContain("Untrusted renderer");
        playwrightExpect(
          await probeBridge(
            appWindow,
            "api.backend.photos.save({ athleteId: 'athlete-1', dataUrl: 'data:image/png;base64,AAA' })"
          )
        ).toContain("Untrusted renderer");
        // Account creation from the login window is the new contract: the
        // setup channel is how a first-time user gets an account at all.
        playwrightExpect(
          await probeBridge(
            appWindow,
            "api.backend.auth.setup({ password: 'correct horse battery staple', username: 'intruder' })"
          )
        ).toBe("allowed");
      });
    }
  );

  playwrightTest(
    "logging in from the local screen lands authenticated on the dashboard",
    async () => {
      playwrightTest.setTimeout(BOOT_BUDGET_MS);
      const userData = await newScratchUserData();
      await seedOwner(userData);
      const app = await launchApp(userData);
      try {
        const appWindow = await app.firstWindow();
        await playwrightExpect(
          appWindow.getByRole("button", { name: "Log in" })
        ).toBeEnabled();
        await loginThrough(appWindow);
        // The session must have survived loadFile → loadURL: a data call from
        // the navigated window has to succeed, not reject as unauthenticated.
        playwrightExpect(
          await probeBridge(appWindow, "api.backend.sessions.listAll()")
        ).toBe("allowed");
      } finally {
        await app.close();
      }
    }
  );

  playwrightTest("logging out returns to the local login screen", async () => {
    playwrightTest.setTimeout(BOOT_BUDGET_MS);
    const userData = await newScratchUserData();
    await seedOwner(userData);
    const app = await launchApp(userData);
    try {
      const appWindow = await app.firstWindow();
      await playwrightExpect(
        appWindow.getByRole("button", { name: "Log in" })
      ).toBeEnabled();
      await loginThrough(appWindow);

      // The sidebar button only works once React has hydrated the shell.
      await appWindow.waitForLoadState("networkidle");
      await appWindow.getByRole("button", { name: "Log out" }).first().click();
      await playwrightExpect(appWindow.locator("#login-view")).toBeVisible();
      await playwrightExpect(appWindow).not.toHaveURL(/dashboard/);
      // Back on the login page, the window is once again outside the app
      // origin: every data channel rejects before the session is even asked.
      playwrightExpect(
        await probeBridge(appWindow, "api.backend.sessions.listAll()")
      ).toContain("Untrusted renderer");
    } finally {
      await app.close();
    }
  });
});
