import { AxeBuilder } from "@axe-core/playwright";
import {
  expect as playwrightExpect,
  test as playwrightTest,
} from "@playwright/test";

const ASSESSMENTS_KEY = "athletehub.conditioning-assessments.v1";
const PROGRAMMES_KEY = "athletehub.conditioning-programmes.v1";

const earlier = {
  assessedOn: "2026-07-05",
  athleteId: "seed-1",
  coachSummary: "Solid baseline.",
  createdAt: "2026-07-05T09:00:00.000Z",
  developmentAreas: ["Core endurance"],
  id: "assessment-earlier",
  recommendations: ["Keep the plank progression"],
  restrictionNotes: "",
  results: [
    {
      category: "muscular-endurance" as const,
      id: "r1",
      improvementDirection: "higher" as const,
      key: "push-ups",
      label: "Push-ups",
      notes: "",
      protocol: "Max reps in one minute",
      rating: "good" as const,
      unit: "repetitions" as const,
      value: 30,
    },
  ],
  status: "completed" as const,
  strengths: ["Steady shooting posture"],
  updatedAt: "2026-07-05T09:00:00.000Z",
};

const latest = {
  ...earlier,
  assessedOn: "2026-07-25",
  coachSummary: "Improvement across the board.",
  id: "assessment-latest",
  results: [
    { ...earlier.results[0], id: "r2", value: 34 },
    {
      category: "isometric" as const,
      id: "r3",
      improvementDirection: "higher" as const,
      key: "plank",
      label: "Plank",
      notes: "",
      protocol: "Hold a forearm plank for maximum time.",
      rating: "average" as const,
      unit: "seconds" as const,
      value: 95,
    },
  ],
  updatedAt: "2026-07-25T09:00:00.000Z",
};

const programme = {
  athleteId: "seed-1",
  createdAt: "2026-07-01T09:00:00.000Z",
  endsOn: "2026-07-31",
  id: "programme-1",
  objectives: ["Build aerobic base"],
  phase: "foundation" as const,
  restrictionNotes: "",
  sessions: [
    {
      endsAt: "08:00",
      exercises: [{ id: "e1", name: "Squat", notes: "", reps: 10, sets: 3 }],
      id: "s1",
      intensity: "moderate" as const,
      notes: "",
      startsAt: "07:00",
      title: "Full-body strength",
      type: "Strength",
      weekday: 1,
    },
    {
      endsAt: "09:00",
      exercises: [],
      id: "s2",
      intensity: "recovery" as const,
      notes: "Light stretching only.",
      startsAt: "08:00",
      title: "Recovery day",
      type: "Recovery",
      weekday: 0,
    },
  ],
  startsOn: "2026-07-01",
  status: "active" as const,
  title: "July foundation block",
  updatedAt: "2026-07-01T09:00:00.000Z",
};

playwrightTest.describe("conditioning workspace", () => {
  playwrightTest.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ([assessments, programmes]) => {
        if (!window.localStorage.getItem(String(assessments[0]))) {
          window.localStorage.setItem(
            String(assessments[0]),
            JSON.stringify(assessments[1])
          );
        }
        if (!window.localStorage.getItem(String(programmes[0]))) {
          window.localStorage.setItem(
            String(programmes[0]),
            JSON.stringify(programmes[1])
          );
        }
      },
      [
        [ASSESSMENTS_KEY, [earlier, latest]],
        [PROGRAMMES_KEY, [programme]],
      ] as const
    );
  });

  playwrightTest(
    "lists assessments with filters and zero axe violations",
    async ({ page }) => {
      await page.goto("/conditioning?athleteId=seed-1");
      await playwrightExpect(
        page.getByRole("heading", { name: "Strength & conditioning" })
      ).toBeVisible();
      await playwrightExpect(
        page.getByRole("tab", { name: /Assessments \(2\)/ })
      ).toBeVisible();
      await playwrightExpect(
        page.getByRole("rowheader", { name: "25 Jul 2026" })
      ).toBeVisible();

      await page.goto("/conditioning?athleteId=seed-1&assessmentStatus=absent");
      await playwrightExpect(
        page.getByText(/No assessments match/)
      ).toBeVisible();

      const results = await new AxeBuilder({ page }).analyze();
      playwrightExpect(results.violations).toEqual([]);
    }
  );

  playwrightTest(
    "shows previous values and change indicators",
    async ({ page }) => {
      await page.goto("/conditioning/assessments/assessment-latest");
      await playwrightExpect(
        page.getByRole("heading", { name: /2026-07-25/ })
      ).toBeVisible();
      await playwrightExpect(page.getByText("Better")).toBeVisible();
      await playwrightExpect(page.getByText("34 repetitions")).toBeVisible();
      await playwrightExpect(page.getByText("30 repetitions")).toBeVisible();
      await playwrightExpect(page.getByText("1:35")).toBeVisible();

      const results = await new AxeBuilder({ page }).analyze();
      playwrightExpect(results.violations).toEqual([]);
    }
  );

  playwrightTest(
    "shows the seven-day schedule and programme minutes",
    async ({ page }) => {
      await page.goto("/conditioning/programmes/programme-1");
      await playwrightExpect(
        page.getByRole("heading", { name: "July foundation block" })
      ).toBeVisible();
      await playwrightExpect(
        page.getByText("Full-body strength")
      ).toBeVisible();
      await playwrightExpect(page.getByText("Squat — 3×10")).toBeVisible();
      await playwrightExpect(
        page.getByText("Light stretching only.")
      ).toBeVisible();

      await page.getByText("Show exact chart data").first().click();
      await playwrightExpect(
        page.getByRole("rowheader", { name: "Moderate" })
      ).toBeVisible();

      const results = await new AxeBuilder({ page }).analyze();
      playwrightExpect(results.violations).toEqual([]);
    }
  );

  playwrightTest(
    "creates an assessment and survives a reload",
    async ({ page }) => {
      await page.goto("/conditioning/assessments/new");
      await playwrightExpect(
        page.getByRole("heading", { name: "New assessment" })
      ).toBeVisible();

      // Submit empty first to exercise the inline error summary.
      await page.getByRole("button", { name: "Save assessment" }).click();
      await playwrightExpect(
        page
          .getByRole("listitem")
          .filter({ hasText: "Select an athlete." })
          .first()
      ).toBeVisible();

      await page.getByRole("combobox").first().click();
      await page.getByRole("option").first().click();

      // Pick a day from the calendar popover.
      await page.locator("#assessment-date").click();
      await page.locator("[data-today] button:visible").first().click();

      // Add a standard test from the combobox.
      await page.getByLabel("Search standard tests").fill("push");
      await page.getByRole("option", { name: /Push-ups/ }).click();
      await page.getByLabel("Value").fill("41");
      await page.getByRole("button", { name: "Save assessment" }).click();

      await playwrightExpect(
        page.getByRole("heading", { name: /Conditioning assessment/ })
      ).toBeVisible();
      await playwrightExpect(page.getByText("41 repetitions")).toBeVisible();

      await page.reload();
      await playwrightExpect(page.getByText("41 repetitions")).toBeVisible();
    }
  );

  playwrightTest(
    "supports a custom test with its own unit",
    async ({ page }) => {
      await page.goto("/conditioning/assessments/new?athleteId=seed-1");
      await page.locator("#assessment-date").click();
      await page.locator("[data-today] button:visible").first().click();
      await page.getByRole("button", { name: "Add custom test" }).click();
      await page.getByLabel("Test name").fill("Farmer carry");
      await page.getByLabel("Value").fill("120");
      await page
        .getByRole("combobox", { name: "Unit" })
        .locator("visible=true")
        .click();
      await page.getByRole("option", { name: /Custom/ }).click();
      await page.getByLabel("Custom unit label").fill("m");
      await page.getByLabel("Protocol").first().fill("50 m carry for time.");
      await page.getByRole("button", { name: "Save assessment" }).click();
      await playwrightExpect(page.getByText("120 m")).toBeVisible();
    }
  );

  playwrightTest(
    "edits a programme and keeps its sessions",
    async ({ page }) => {
      await page.goto("/conditioning/programmes/programme-1/edit");
      await playwrightExpect(
        page.getByRole("heading", { name: "Edit programme" })
      ).toBeVisible();
      await playwrightExpect(
        page.getByText("Full-body strength")
      ).toBeVisible();

      await page.getByRole("button", { name: "Add exercise" }).first().click();
      await page.getByRole("button", { name: "Save programme" }).click();
      await playwrightExpect(
        page.getByRole("heading", { name: "July foundation block" })
      ).toBeVisible();

      await page.reload();
      await playwrightExpect(
        page.getByRole("heading", { name: "July foundation block" })
      ).toBeVisible();
    }
  );

  playwrightTest(
    "sorts the assessment table with the keyboard",
    async ({ page }) => {
      await page.goto("/conditioning?athleteId=seed-1");
      const head = page.getByRole("columnheader", { name: /^Assessed on/ });
      await head.getByRole("button").focus();
      await page.keyboard.press("Enter");
      await playwrightExpect(head).toHaveAttribute("aria-sort", "ascending");
    }
  );
});
