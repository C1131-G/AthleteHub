import { AxeBuilder } from "@axe-core/playwright";
import {
  expect as playwrightExpect,
  test as playwrightTest,
} from "@playwright/test";

/**
 * The command palette is keyboard-first by design, so the flow below uses no
 * mouse at all: Ctrl+K opens it, typing filters, arrows move the selection,
 * Enter navigates. Escape closes and the open palette stays accessible.
 */
playwrightTest.describe("command palette", () => {
  playwrightTest(
    "navigates by keyboard alone with no axe violations",
    async ({ page }) => {
      await page.goto("/dashboard");

      await page.keyboard.press("ControlOrMeta+k");
      const input = page.getByRole("textbox", {
        name: "Search commands and athletes",
      });
      await playwrightExpect(input).toBeFocused();

      await input.fill("set");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowUp");
      await page.keyboard.press("Enter");
      await playwrightExpect(page).toHaveURL(/\/settings/);

      // Reopen and scan the open palette for accessibility violations. The
      // navigation above is a full page load, so wait for the shell to attach.
      await page.waitForLoadState("networkidle");
      await page.keyboard.press("ControlOrMeta+k");
      await input.fill("");
      const results = await new AxeBuilder({ page }).analyze();
      playwrightExpect(results.violations).toEqual([]);

      await page.keyboard.press("Escape");
      await playwrightExpect(input).toBeHidden();
    }
  );
});
