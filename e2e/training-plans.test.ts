import { AxeBuilder } from "@axe-core/playwright";
import {
  expect as playwrightExpect,
  test as playwrightTest,
} from "@playwright/test";
import type { Page } from "@playwright/test";

import { seedCollections, writeCollections } from "./seed";
import type { SeedRecord } from "./seed";

const planWeeks = [
  ["2026-08-03", 900],
  ["2026-08-10", 1000],
  ["2026-08-17", 1100],
  ["2026-08-24", 1200],
] as const;

const seasonPlan = {
  athleteId: "seed-1",
  createdAt: "2026-07-01T00:00:00.000Z",
  endsOn: "2026-09-30",
  events: [
    {
      dateStatus: "scheduled",
      endsOn: "2026-09-20",
      id: "e1",
      location: "Pune",
      name: "National Championship",
      notes: "Primary target for the season.",
      priority: "primary",
      startsOn: "2026-09-18",
    },
    {
      dateStatus: "tbd",
      id: "e2",
      location: "",
      name: "Selection trial",
      notes: "Dates depend on the federation calendar.",
      priority: "secondary",
    },
  ],
  id: "plan-1",
  name: "Season 2026-27",
  startsOn: "2026-08-01",
  status: "active",
  strategyNotes: "Build volume through August, sharpen in September.",
  targetDistanceM: 70,
  targetScore: 660,
  updatedAt: "2026-07-01T00:00:00.000Z",
  weeks: planWeeks.map(([weekStart, arrowsPlanned], index) => ({
    arrowsPlanned,
    id: `w${index}`,
    technicalFocus: `Focus ${index + 1}`,
    trainingDaysPlanned: 6,
    weekStart,
  })),
};

const draftPlan = {
  ...seasonPlan,
  athleteId: "seed-2",
  id: "plan-2",
  name: "Winter base",
  status: "draft",
};

// Only the first three planned weeks are reported, so the fourth stays missing.
const weeklyReports = planWeeks.slice(0, 3).map(([weekStart], index) => ({
  absenceReason: "",
  actionItems: [],
  arrowsPlanned: planWeeks[index]?.[1],
  arrowsShot: 850 + index * 100,
  athleteId: "seed-1",
  createdAt: `${weekStart}T09:00:00.000Z`,
  distanceM: 70,
  id: `r${index}`,
  maxScore: 360,
  performanceNotes: "",
  scores: [320 + index, 325 + index],
  status: "completed",
  trainingDays: 5,
  trainingPlanId: "plan-1",
  trainingPlanWeekId: `w${index}`,
  updatedAt: `${weekStart}T09:00:00.000Z`,
  weekStart,
}));

const seed = (page: Page, plans: SeedRecord[], reports: SeedRecord[] = []) =>
  seedCollections(page, [
    { collection: "trainingPlans", records: plans },
    { collection: "weeklyReports", records: reports },
  ]);

/**
 * Writes the seed once, after the app has loaded, so a later reload keeps
 * whatever the test saved instead of restoring the fixture.
 */
const seedOnce = async (
  page: Page,
  plans: SeedRecord[],
  reports: SeedRecord[]
) => {
  await page.goto("/training-plans");
  await writeCollections(page, [
    { collection: "trainingPlans", records: plans },
    { collection: "weeklyReports", records: reports },
  ]);
};

/** Picks today from an open date picker, so the test never pins a date. */
const pickToday = async (page: Page, controlId: string) => {
  await page.locator(`#${controlId}`).click();
  // Closed pickers stay mounted, so only the open calendar is visible.
  await page.locator("[data-today] button:visible").first().click();
  await page.keyboard.press("Escape");
};

playwrightTest.describe("training plans", () => {
  // The app no longer invents a roster, and the form needs an athlete to
  // default to, so every test starts from a seeded one.
  playwrightTest.beforeEach(async ({ page }) => {
    await seedCollections(page, []);
  });

  playwrightTest("creates a plan from the form", async ({ page }) => {
    await page.goto("/training-plans/new");
    await page.locator("#plan-name").fill("Autumn build");
    await pickToday(page, "plan-starts-on");
    await pickToday(page, "plan-ends-on");

    const week = page.getByRole("group", { name: "Week 1" });
    await week.getByLabel("Week start").click();
    await page.locator("[data-today] button:visible").first().click();
    await page.keyboard.press("Escape");
    await week.getByLabel("Arrows planned").fill("1200");
    await week.getByLabel("Training days").fill("6");
    await playwrightExpect(week).toContainText("200 per training day");

    await page.getByRole("button", { name: "Save plan" }).click();

    await playwrightExpect(
      page.getByRole("heading", { name: "Autumn build" })
    ).toBeVisible();
    await playwrightExpect(page).toHaveURL(/\/training-plans\/[\w-]+$/);
    await playwrightExpect(
      page.getByText("1,200 arrows", { exact: true })
    ).toBeVisible();
  });

  playwrightTest("links every error to its control", async ({ page }) => {
    await page.goto("/training-plans/new");
    await page.getByRole("button", { name: "Save plan" }).click();

    const summary = page.locator("#plan-error-summary");
    await playwrightExpect(summary).toContainText(
      "Check the plan before saving"
    );
    await playwrightExpect(summary).toContainText("Name the season plan.");

    const name = page.locator("#plan-name");
    await playwrightExpect(name).toBeFocused();
    await playwrightExpect(name).toHaveAttribute("aria-invalid", "true");
    await playwrightExpect(name).toHaveAttribute(
      "aria-errormessage",
      "plan-name-error"
    );
    await playwrightExpect(page.locator("#plan-name-error")).toHaveText(
      "Name the season plan."
    );
  });

  playwrightTest(
    "edits a plan and keeps it after a reload",
    async ({ page }) => {
      await seedOnce(page, [seasonPlan], weeklyReports);
      await page.goto("/training-plans/plan-1/edit");

      await page.locator("#plan-name").fill("Season 2026-27 revised");
      await page.locator("#week-w0-arrows").fill("950");
      await page.getByRole("button", { name: "Save plan" }).click();

      await playwrightExpect(
        page.getByRole("heading", { name: "Season 2026-27 revised" })
      ).toBeVisible();

      await page.reload();
      await playwrightExpect(
        page.getByRole("heading", { name: "Season 2026-27 revised" })
      ).toBeVisible();
      await playwrightExpect(
        page.getByRole("rowheader", { name: "2026-08-03" })
      ).toBeVisible();
      await playwrightExpect(page.getByText("4,250 arrows")).toBeVisible();
    }
  );

  playwrightTest(
    "shows planned weeks with no report as missing",
    async ({ page }) => {
      await seed(page, [seasonPlan], weeklyReports);
      await page.goto("/training-plans/plan-1");

      await playwrightExpect(page.getByText("4,200 arrows")).toBeVisible();
      await playwrightExpect(
        page.getByText("1 weeks without a report")
      ).toBeVisible();

      const row = page.getByRole("row", { name: /2026-08-24/ });
      await playwrightExpect(row).toContainText("No report yet");
      await playwrightExpect(row).toContainText("Not recorded");
    }
  );

  playwrightTest(
    "exposes exact chart data beside each chart",
    async ({ page }) => {
      await seed(page, [seasonPlan], weeklyReports);
      await page.goto("/training-plans/plan-1");

      const charts = page.getByText("Show exact chart data");
      await playwrightExpect(charts).toHaveCount(2);
      await charts.first().click();
      await charts.last().click();

      const tables = page.getByRole("table", { name: "Exact chart data" });
      const plannedVsActual = tables.filter({ hasText: "Planned (arrows)" });
      await playwrightExpect(
        plannedVsActual.getByRole("row", { name: /2026-08-24/ })
      ).toContainText("Not recorded");

      const targets = tables.filter({ hasText: "Weekly target (arrows)" });
      await playwrightExpect(
        targets.getByRole("row", { name: /2026-08-03/ })
      ).toContainText("150");
    }
  );

  playwrightTest(
    "filters the plan list and clears the filters",
    async ({ page }) => {
      await seed(page, [seasonPlan, draftPlan]);
      await page.goto("/training-plans");
      await playwrightExpect(page.getByRole("row")).toHaveCount(3);

      await page.getByLabel("Search plans").fill("Winter");
      await playwrightExpect(page.getByRole("row")).toHaveCount(2);
      await playwrightExpect(
        page.getByRole("rowheader", { name: "Winter base" })
      ).toBeVisible();

      await page.getByRole("button", { name: "Clear filters" }).click();
      await playwrightExpect(page.getByRole("row")).toHaveCount(3);
    }
  );

  playwrightTest("keeps a status filter in the URL", async ({ page }) => {
    await seed(page, [seasonPlan, draftPlan]);
    await page.goto("/training-plans?status=draft");
    await playwrightExpect(page.getByRole("row")).toHaveCount(2);
    await playwrightExpect(page.getByLabel("Status")).toContainText("Draft");
  });

  playwrightTest(
    "moves between plan tabs with the keyboard",
    async ({ page }) => {
      await seed(page, [seasonPlan], weeklyReports);
      await page.goto("/training-plans/plan-1");

      const progression = page.getByRole("tab", { name: /Weekly progression/ });
      await progression.focus();
      await page.keyboard.press("ArrowRight");

      const events = page.getByRole("tab", { name: /Events/ });
      await playwrightExpect(events).toBeFocused();
      // Roving focus first, then explicit activation.
      await page.keyboard.press("Enter");
      await playwrightExpect(events).toHaveAttribute("aria-selected", "true");
      await playwrightExpect(
        page.getByRole("button", { name: /National Championship/ })
      ).toBeVisible();
    }
  );

  playwrightTest(
    "has no axe violations on the plan routes",
    async ({ page }) => {
      await seed(page, [seasonPlan], weeklyReports);

      const axeOn = async (path: string) => {
        await page.goto(path);
        await playwrightExpect(
          page.getByRole("heading", { level: 1 })
        ).toBeVisible();
        const results = await new AxeBuilder({ page }).analyze();
        return results.violations;
      };

      // One page object cannot visit three routes at once, so these run in turn.
      const list = await axeOn("/training-plans");
      const form = await axeOn("/training-plans/new");
      const preview = await axeOn("/training-plans/plan-1");

      playwrightExpect(list, "axe violations on /training-plans").toEqual([]);
      playwrightExpect(form, "axe violations on /training-plans/new").toEqual(
        []
      );
      playwrightExpect(
        preview,
        "axe violations on /training-plans/plan-1"
      ).toEqual([]);
    }
  );
});
