import { AxeBuilder } from "@axe-core/playwright";
import {
  expect as playwrightExpect,
  test as playwrightTest,
} from "@playwright/test";

playwrightTest.describe("reporting workspace", () => {
  playwrightTest(
    "dashboard exposes filters, chart data, and no axe violations",
    async ({ page }) => {
      await page.goto("/dashboard");
      await playwrightExpect(
        page.getByRole("heading", { name: "Performance dashboard" })
      ).toBeVisible();
      await playwrightExpect(
        page.getByLabel("Athlete", { exact: true })
      ).toBeVisible();
      await playwrightExpect(page.getByText("Score trend")).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      playwrightExpect(results.violations).toEqual([]);
    }
  );

  playwrightTest("reports page preserves URL filters", async ({ page }) => {
    await page.goto("/reports?month=2026-07&tab=monthly");
    await playwrightExpect(
      page.getByRole("tab", { name: /Monthly reports/ })
    ).toHaveAttribute("aria-selected", "true");
    await playwrightExpect(page.locator("#report-month")).toHaveValue(
      "2026-07"
    );
  });
});
