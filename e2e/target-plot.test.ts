import { AxeBuilder } from "@axe-core/playwright";
import {
  expect as playwrightExpect,
  test as playwrightTest,
} from "@playwright/test";

/**
 * The target-face plotter is a role="application" widget that captures the
 * arrow keys, so it gets its own accessibility pass and a keyboard-only
 * interaction check: place an arrow with a click, then move it without a
 * pointer and correct its score numerically.
 */
playwrightTest(
  "target face plotting is accessible and keyboard operable",
  async ({ page }) => {
    await page.goto("/sessions/new");
    await page.getByText("Plot end 1 on the target face").click();

    const face = page.getByRole("application");
    await face.click({ position: { x: 110, y: 110 } });
    await playwrightExpect(page.getByText("1/6 arrows placed")).toBeVisible();

    // Keyboard-only adjustment: the placed arrow is selected, so the arrow
    // keys move it and the numeric field corrects its score.
    await face.press("ArrowRight");
    await face.press("Shift+ArrowUp");
    await page.getByLabel("Arrow 1 score").fill("9");

    await playwrightExpect(
      page.getByText(/Group of 1: mean radius/)
    ).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    playwrightExpect(results.violations).toEqual([]);
  }
);
