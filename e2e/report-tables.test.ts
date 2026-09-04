import { AxeBuilder } from "@axe-core/playwright";
import {
  expect as playwrightExpect,
  test as playwrightTest,
} from "@playwright/test";

import { seedCollections } from "./seed";

const weeklyFixtures = Array.from({ length: 12 }, (_, index) => {
  const day = String(index + 1).padStart(2, "0");
  const timestamp = `2026-03-${day}T09:00:00.000Z`;
  return {
    absenceReason: "",
    actionItems: [],
    athleteId: `seed-${(index % 3) + 1}`,
    createdAt: timestamp,
    distanceM: 30 + index * 10,
    id: `weekly-${day}`,
    performanceNotes: "",
    scores: [300 + index, 310 + index],
    status: "completed",
    updatedAt: timestamp,
    weekStart: `2026-03-${day}`,
  };
});

playwrightTest.describe("report tables", () => {
  playwrightTest.beforeEach(async ({ page }) => {
    await seedCollections(page, [
      { collection: "weeklyReports", records: weeklyFixtures },
    ]);
  });

  playwrightTest("paginates weekly entries", async ({ page }) => {
    await page.goto("/reports?tab=weekly");
    const pagination = page.getByRole("navigation", {
      name: "Weekly entries pagination",
    });
    await playwrightExpect(pagination).toContainText("Page 1 of 2");
    await playwrightExpect(page.getByRole("row")).toHaveCount(11);

    await pagination.getByRole("button", { name: "Next" }).click();
    await playwrightExpect(pagination).toContainText("Page 2 of 2");
    await playwrightExpect(page.getByRole("row")).toHaveCount(3);
    await playwrightExpect(
      pagination.getByRole("button", { name: "Next" })
    ).toBeDisabled();
  });

  playwrightTest("sorts weekly entries by column", async ({ page }) => {
    await page.goto("/reports?tab=weekly");
    const week = page.getByRole("columnheader", { name: /^Week/ });
    await playwrightExpect(week).toHaveAttribute("aria-sort", "none");

    await week.getByRole("button").click();
    await playwrightExpect(week).toHaveAttribute("aria-sort", "ascending");
    await playwrightExpect(
      page.getByRole("rowheader", { name: "2026-03-01" })
    ).toBeVisible();

    await week.getByRole("button").click();
    await playwrightExpect(week).toHaveAttribute("aria-sort", "descending");
    await playwrightExpect(
      page.getByRole("rowheader", { name: "2026-03-12" })
    ).toBeVisible();
  });

  playwrightTest(
    "clears filters and scopes statuses to the tab",
    async ({ page }) => {
      await page.goto("/reports?status=completed&tab=weekly");
      await playwrightExpect(page.getByLabel("Status")).toContainText(
        "Completed"
      );

      await page.getByRole("tab", { name: /Monthly reports/ }).click();
      // "completed" is a weekly status, so switching tabs must drop it.
      await playwrightExpect(page.getByLabel("Status")).toContainText(
        "All statuses"
      );
      await playwrightExpect(page).toHaveURL(/tab=monthly/);
      await playwrightExpect(page).not.toHaveURL(/status=/);
    }
  );

  playwrightTest("reports page has no axe violations", async ({ page }) => {
    await page.goto("/reports?tab=weekly");
    await playwrightExpect(
      page.getByRole("columnheader", { name: /^Week/ })
    ).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    playwrightExpect(results.violations).toEqual([]);
  });
});
