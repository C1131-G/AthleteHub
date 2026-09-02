import { instant } from "@next/playwright";
import {
  expect as playwrightExpect,
  test as playwrightTest,
} from "@playwright/test";

playwrightTest.describe("AthleteHub instant navigation", () => {
  playwrightTest(
    "the athletes shell is served on initial load",
    async ({ page }) => {
      await instant(
        page,
        async () => {
          await page.goto("/athletes");
          await playwrightExpect(
            page.getByTestId("athletes-shell-marker")
          ).toBeVisible();
        },
        { baseURL: "http://127.0.0.1:3100" }
      );
    }
  );

  playwrightTest(
    "the new-athlete shell commits after a real link navigation",
    async ({ page }) => {
      await page.goto("/athletes");
      await instant(page, async () => {
        await page
          .getByRole("link", { exact: true, name: "Add athlete" })
          .click();
        await playwrightExpect(page).toHaveURL(/\/athletes\/new$/);
        await playwrightExpect(
          page.getByTestId("new-athlete-shell-marker")
        ).toBeVisible();
      });
    }
  );
});
