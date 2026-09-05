import path from "node:path";
import { pathToFileURL } from "node:url";

import { AxeBuilder } from "@axe-core/playwright";
import {
  expect as playwrightExpect,
  test as playwrightTest,
} from "@playwright/test";

/**
 * The local login screen ships in the Electron main-process folder and owns
 * the whole account surface — login, first-run setup, and recovery. It talks
 * to window.electronAPI, which a plain browser does not provide. That is the
 * degraded state these tests exercise: the login form still renders, a submit
 * surfaces a message, and the page stays accessible. The real flows are
 * covered by the Electron-driven desktop-login spec; the webServer this
 * project starts is not used by either of them, it just comes with the
 * Playwright project.
 */
const loginPageUrl = () =>
  pathToFileURL(path.join(process.cwd(), "electron", "login.html")).href;

playwrightTest.describe("local login screen", () => {
  playwrightTest(
    "renders the form with no axe violations",
    async ({ page }) => {
      await page.goto(loginPageUrl());
      await playwrightExpect(
        page.getByRole("button", { name: "Log in" })
      ).toBeEnabled();
      const results = await new AxeBuilder({ page }).analyze();
      playwrightExpect(results.violations).toEqual([]);
    }
  );

  playwrightTest(
    "degraded browser state shows the login form only, and a bridge error",
    async ({ page }) => {
      await page.goto(loginPageUrl());
      // Without the bridge the account check cannot run, so the screen keeps
      // the login form rather than guessing whether an account exists.
      await playwrightExpect(page.locator("#setup-view")).toBeHidden();
      await playwrightExpect(page.locator("#recovery-view")).toBeHidden();
      await playwrightExpect(page.locator("#login-form")).toBeVisible();
      await page.locator("#login-form").getByLabel("Username").fill("owner");
      await page
        .locator("#login-form")
        .getByLabel("Password", { exact: true })
        .fill("wrong password");
      await page.getByRole("button", { name: "Log in" }).click();
      await playwrightExpect(page.getByRole("alert")).toBeVisible();
    }
  );

  playwrightTest(
    "the password field can be revealed and hidden with the eye button",
    async ({ page }) => {
      await page.goto(loginPageUrl());
      const password = page
        .locator("#login-form")
        .getByLabel("Password", { exact: true });
      await password.fill("correct horse battery staple");
      await playwrightExpect(password).toHaveAttribute("type", "password");

      const toggle = page.getByRole("button", { name: "Show password" });
      await toggle.click();
      await playwrightExpect(password).toHaveAttribute("type", "text");
      await playwrightExpect(
        page.getByRole("button", { name: "Hide password" })
      ).toBeVisible();
      // The icon swaps to the slashed eye while the password shows. Scoped
      // to the login form: the setup and recovery views carry their own eyes.
      const loginForm = page.locator("#login-form");
      await playwrightExpect(loginForm.locator("#eye-open")).toBeHidden();
      await playwrightExpect(loginForm.locator("#eye-closed")).toBeVisible();

      await page.getByRole("button", { name: "Hide password" }).click();
      await playwrightExpect(password).toHaveAttribute("type", "password");
      await playwrightExpect(loginForm.locator("#eye-open")).toBeVisible();
      await playwrightExpect(loginForm.locator("#eye-closed")).toBeHidden();
    }
  );
});
