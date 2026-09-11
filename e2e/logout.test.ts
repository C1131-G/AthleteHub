import {
  expect as playwrightExpect,
  test as playwrightTest,
} from "@playwright/test";

/**
 * In a plain browser there is no desktop bridge, so logout explains itself
 * instead of navigating: the session lives in the Electron main process, and
 * returning to the login screen is the desktop app's job. The real logout
 * round-trip is covered by the Electron-driven desktop-login spec.
 */
playwrightTest.describe("workspace logout", () => {
  playwrightTest(
    "logout without the desktop bridge explains itself and stays put",
    async ({ page }) => {
      await page.goto("/dashboard");
      await page.getByRole("button", { name: "Log out" }).first().click();
      await playwrightExpect(
        page.getByText("Open the SSAIT Athlete360 desktop app to log out.")
      ).toBeVisible();
      await playwrightExpect(page).toHaveURL(/\/dashboard/);
    }
  );
});
