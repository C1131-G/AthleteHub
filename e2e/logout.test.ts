import {
  expect as playwrightExpect,
  test as playwrightTest,
} from "@playwright/test";

playwrightTest.describe("workspace logout", () => {
  playwrightTest(
    "logs out from the expanded desktop sidebar",
    async ({ page }) => {
      await page.goto("/dashboard");
      await page.getByRole("button", { name: "Log out" }).click();
      await playwrightExpect(page).toHaveURL(/\/login$/);
    }
  );

  playwrightTest(
    "logs out from the collapsed desktop sidebar",
    async ({ page }) => {
      await page.goto("/dashboard");
      await page
        .getByRole("banner")
        .getByRole("button", { name: "Toggle Sidebar" })
        .click();
      await page.getByRole("button", { name: "Log out" }).click();
      await playwrightExpect(page).toHaveURL(/\/login$/);
    }
  );
});
