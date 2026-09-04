import { AxeBuilder } from "@axe-core/playwright";
import {
  expect as playwrightExpect,
  test as playwrightTest,
} from "@playwright/test";

import { seedCollections } from "./seed";

playwrightTest.describe("reporting workspace", () => {
  // The app no longer invents a roster, so the forms need athletes to pick.
  playwrightTest.beforeEach(async ({ page }) => {
    await seedCollections(page, []);
  });

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
    // The month filter is a picker now, so its trigger shows a formatted label.
    await playwrightExpect(page.locator("#report-month")).toHaveText(
      "July 2026"
    );
  });

  playwrightTest(
    "links weekly report errors to their controls and focuses the first",
    async ({ page }) => {
      await page.goto("/reports/weekly/new");
      await page.getByRole("button", { name: "Save report" }).click();

      const summary = page.locator("#weekly-error-summary");
      await playwrightExpect(summary).toContainText(
        "Check the report before saving"
      );
      // The summary must lead to the control, not just name the problem.
      await playwrightExpect(
        summary.getByRole("link", { name: "Choose the week start date." })
      ).toHaveAttribute("href", "#week-start");

      const weekStart = page.locator("#week-start");
      await playwrightExpect(weekStart).toBeFocused();
      await playwrightExpect(weekStart).toHaveAttribute("aria-invalid", "true");
      await playwrightExpect(weekStart).toHaveAttribute(
        "aria-errormessage",
        "week-start-error"
      );
      await playwrightExpect(page.locator("#week-start-error")).toHaveText(
        "Choose the week start date."
      );
    }
  );

  playwrightTest(
    "shows a scoring error beside the field, not only in the summary",
    async ({ page }) => {
      await page.goto("/reports/weekly/new");
      await page.locator("#training-days").fill("9");
      await page.getByRole("button", { name: "Save report" }).click();

      const message = page.locator("#training-days-error");
      await playwrightExpect(message).toHaveText(
        "Training days must be between 0 and 7."
      );
      await playwrightExpect(page.locator("#training-days")).toHaveAttribute(
        "aria-errormessage",
        "training-days-error"
      );
    }
  );

  playwrightTest(
    "links a monthly report error to its control",
    async ({ page }) => {
      await page.goto("/reports/monthly/new");
      // The month is blank by default and would otherwise be the first error.
      // It opens on the current year, so the month button is enough.
      await page.locator("#report-month").click();
      await page.getByRole("button", { exact: true, name: "Aug" }).click();
      await page.locator("#arrow-targets").fill("1200, oops");
      await page.getByRole("button", { name: /Save/ }).click();

      const targets = page.locator("#arrow-targets");
      await playwrightExpect(targets).toBeFocused();
      await playwrightExpect(targets).toHaveAttribute("aria-invalid", "true");
      await playwrightExpect(page.locator("#arrow-targets-error")).toHaveText(
        "Weekly arrow targets must be non-negative integers."
      );
    }
  );
});
