import { AxeBuilder } from "@axe-core/playwright";
import {
  expect as playwrightExpect,
  test as playwrightTest,
} from "@playwright/test";

playwrightTest.describe("settings", () => {
  playwrightTest(
    "exposes preferences, theme, and backups accessibly",
    async ({ page }) => {
      await page.goto("/settings");
      await playwrightExpect(page.getByText("Preferences")).toBeVisible();
      await playwrightExpect(
        page.getByLabel("Ranking distance (m)")
      ).toBeVisible();
      await playwrightExpect(
        page.getByRole("button", { name: "Switch to light theme" })
      ).toBeVisible();

      const results = await new AxeBuilder({ page }).analyze();
      playwrightExpect(results.violations).toEqual([]);
    }
  );
});
