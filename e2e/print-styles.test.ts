import {
  expect as playwrightExpect,
  test as playwrightTest,
} from "@playwright/test";

playwrightTest.describe("print styles", () => {
  playwrightTest("printing a report hides the app chrome", async ({ page }) => {
    await page.goto("/reports?tab=monthly");
    await playwrightExpect(
      page.getByRole("heading", { level: 1 })
    ).toBeVisible();

    // The sidebar exists on screen…
    await playwrightExpect(
      page.locator('[data-sidebar="sidebar"]').first()
    ).toBeAttached();

    // …and disappears in print media, along with the workspace header.
    await page.emulateMedia({ media: "print" });
    await playwrightExpect(
      page.locator('[data-sidebar="sidebar"]').first()
    ).toBeHidden();
    await playwrightExpect(
      page.locator('[data-slot="workspace-header"]')
    ).toBeHidden();
    await page.emulateMedia({ media: "screen" });
  });
});
