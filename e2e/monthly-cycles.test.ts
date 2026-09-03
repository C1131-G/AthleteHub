import { AxeBuilder } from "@axe-core/playwright";
import {
  expect as playwrightExpect,
  test as playwrightTest,
} from "@playwright/test";
import type { Page } from "@playwright/test";

const ATHLETES_KEY = "athletehub.athletes.v1";
const EQUIPMENT_KEY = "athletehub.equipment.v1";
const PLANS_KEY = "athletehub.training-plans.v1";
const ASSESSMENTS_KEY = "athletehub.conditioning-assessments.v1";
const PROGRAMMES_KEY = "athletehub.conditioning-programmes.v1";
const WEEKLY_KEY = "athletehub.weekly-reports.v1";
const CYCLES_KEY = "athletehub.monthly-cycles.v1";

/** The whole cycle month is in the past, so every Monday is reportable. */
const MONTH = "2026-08";
const MONDAYS = [
  "2026-08-03",
  "2026-08-10",
  "2026-08-17",
  "2026-08-24",
  "2026-08-31",
] as const;

const athlete = (id: string, athleteId: string, fullName: string) => ({
  armSpanCm: 178,
  athleteId,
  category: "recurve",
  createdAt: "2026-07-01T00:00:00.000Z",
  dateOfBirth: "2005-04-01",
  equipmentNotes: "",
  fullName,
  heightCm: 176,
  id,
  photoUrl: "",
  status: "active",
  targetDistanceM: 70,
  targetScore: 650,
  technicalFocus: "Steady hold at full draw",
  updatedAt: "2026-07-01T00:00:00.000Z",
  weightKg: 68,
});

const weeklyReport = (id: string, weekStart: string, overrides = {}) => ({
  absenceReason: "",
  actionItems: [],
  arrowsPlanned: 900,
  arrowsShot: 840,
  athleteId: "seed-1",
  createdAt: `${weekStart}T09:00:00.000Z`,
  distanceM: 70,
  equipmentSetupId: "setup-1",
  id,
  maxScore: 360,
  performanceNotes: "Good groups.",
  scores: [310, 320, 300],
  status: "completed",
  trainingDays: 5,
  trainingPlanId: "plan-1",
  trainingPlanWeekId: "w1",
  updatedAt: `${weekStart}T09:00:00.000Z`,
  weekStart,
  ...overrides,
});

const equipmentSetup = {
  athleteId: "seed-1",
  coachNotes: "Checked before the season.",
  createdAt: "2026-07-15T00:00:00.000Z",
  id: "setup-1",
  items: [
    {
      custom: false,
      id: "riser",
      key: "riser",
      label: "Handle / riser",
      requirement: "25in",
      value: "Gillo GT27",
    },
  ],
  recordedAt: "2026-07-15",
  updatedAt: "2026-07-15T00:00:00.000Z",
};

const seasonPlan = (athleteId: string, id: string, name: string) => ({
  athleteId,
  createdAt: "2026-07-01T00:00:00.000Z",
  endsOn: "2026-09-30",
  events: [],
  id,
  name,
  startsOn: "2026-08-01",
  status: "active",
  strategyNotes: "Build volume through August, sharpen in September.",
  targetDistanceM: 70,
  targetScore: 660,
  updatedAt: "2026-07-01T00:00:00.000Z",
  weeks: MONDAYS.map((weekStart, index) => ({
    arrowsPlanned: 900 + index * 50,
    id: `w${index + 1}`,
    technicalFocus: `Focus ${index + 1}`,
    trainingDaysPlanned: 6,
    weekStart,
  })),
});

const conditioningAssessment = {
  assessedOn: "2026-08-12",
  athleteId: "seed-1",
  coachSummary: "Solid base strength.",
  createdAt: "2026-08-12T00:00:00.000Z",
  developmentAreas: ["Core endurance"],
  id: "assessment-1",
  recommendations: ["Keep plank progression"],
  restrictionNotes: "",
  results: [
    {
      category: "isometric",
      id: "result-1",
      improvementDirection: "higher",
      key: "plank",
      label: "Plank hold",
      notes: "",
      protocol: "Max hold",
      rating: "good",
      unit: "seconds",
      value: 95,
    },
  ],
  status: "completed",
  strengths: ["Posterior chain"],
  updatedAt: "2026-08-12T00:00:00.000Z",
};

const conditioningProgramme = (athleteId: string, id: string) => ({
  athleteId,
  createdAt: "2026-08-20T00:00:00.000Z",
  endsOn: "2026-12-31",
  id,
  objectives: ["Hold endurance"],
  phase: "development",
  restrictionNotes: "",
  sessions: [],
  startsOn: "2026-01-01",
  status: "active",
  title: "September development block",
  trainingPlanId: "",
  updatedAt: "2026-08-20T00:00:00.000Z",
});

const fullFleet = {
  assessments: [conditioningAssessment],
  athletes: [
    athlete("seed-1", "AH-001", "Jatin Kumar"),
    athlete("seed-2", "AH-002", "Meera Nair"),
  ],
  equipment: [
    equipmentSetup,
    { ...equipmentSetup, athleteId: "seed-2", id: "setup-2" },
  ],
  plans: [seasonPlan("seed-1", "plan-1", "Season 2026-27")],
  programmes: [
    conditioningProgramme("seed-1", "programme-1"),
    conditioningProgramme("seed-2", "programme-2"),
  ],
  weekly: [
    // Medical leave with a documented reason counts as covered.
    weeklyReport("leave", "2026-08-17", {
      absenceReason: "Fever, cleared by the team doctor.",
      arrowsShot: 0,
      distanceM: undefined,
      scores: [],
      status: "medical-leave",
      trainingDays: 0,
    }),
    ...MONDAYS.map((weekStart, index) => weeklyReport(`r${index}`, weekStart)),
  ],
};

/**
 * Writes the seed once after the app has loaded, so a later reload keeps
 * whatever the test saved instead of restoring the fixture.
 */
/** Fixture payloads are written verbatim; the repositories validate on read. */
type SeedEntry = readonly [string, readonly unknown[]];

const seedOnce = async (page: Page, entries: readonly SeedEntry[]) => {
  await page.goto("/monthly-cycles?month=2026-08");
  await page.evaluate(
    ([fixture]) => {
      for (const [key, value] of fixture) {
        if (!window.localStorage.getItem(key)) {
          window.localStorage.setItem(key, JSON.stringify(value));
        }
      }
    },
    [entries] as const
  );
  await page.reload();
};

const seedDirect = async (page: Page, entries: readonly SeedEntry[]) => {
  await page.addInitScript(
    ([fixture]) => {
      for (const [key, value] of fixture) {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    },
    [entries] as const
  );
};

const queueRowFor = (page: Page, name: string) =>
  page.getByRole("row", { name: new RegExp(name, "i") });

const completeCycleFor = (athleteId: string, id: string) => ({
  athleteId,
  completedAt: "2026-08-31T18:00:00.000Z",
  createdAt: "2026-08-01T08:00:00.000Z",
  id,
  lastVisitedStep: "review",
  month: MONTH,
  status: "complete",
  steps: Object.fromEntries(
    [
      "profile",
      "equipment",
      "weekly",
      "monthly-average",
      "training-load",
      "conditioning",
      "review",
    ].map((step) => [
      step,
      {
        confirmedAt: "2026-08-31T18:00:00.000Z",
        reason: "Previously completed with an accepted exception.",
        sources: [],
        status: "exception",
      },
    ])
  ),
  updatedAt: "2026-08-31T18:00:00.000Z",
});

playwrightTest.describe("monthly cycles", () => {
  playwrightTest(
    "starts, exits, reloads, and resumes a cycle",
    async ({ page }) => {
      await seedOnce(page, [[ATHLETES_KEY, fullFleet.athletes]]);
      await page.goto("/monthly-cycles?month=2026-08");
      await playwrightExpect(page).toHaveURL(
        /\/monthly-cycles\?month=2026-08$/
      );
      if (await page.getByRole("dialog").count()) {
        await page
          .getByRole("dialog")
          .getByRole("link", { name: "Monthly Cycle" })
          .click();
      }
      await playwrightExpect(
        page.getByRole("heading", { name: "Monthly cycle" })
      ).toBeVisible();

      await queueRowFor(page, "Jatin Kumar")
        .getByRole("button", { name: "Start" })
        .click();
      await playwrightExpect(page).toHaveURL(
        /\/monthly-cycles\/[\w-]+\/profile$/
      );
      await playwrightExpect(
        page.getByRole("heading", { exact: true, name: "Profile" })
      ).toBeVisible();

      await page.getByRole("button", { name: "Save & exit" }).click();
      await playwrightExpect(page).toHaveURL(
        /\/monthly-cycles\?month=2026-08$/
      );

      await page.reload();
      await queueRowFor(page, "Jatin Kumar")
        .getByRole("link", { name: "Resume" })
        .click();
      await playwrightExpect(page).toHaveURL(
        /\/monthly-cycles\/[\w-]+\/profile$/
      );
    }
  );

  playwrightTest(
    "completes one athlete from profile through review and advances to the next",
    async ({ page }) => {
      await seedOnce(page, [
        [ATHLETES_KEY, fullFleet.athletes],
        [EQUIPMENT_KEY, fullFleet.equipment],
        [PLANS_KEY, fullFleet.plans],
        [ASSESSMENTS_KEY, fullFleet.assessments],
        [PROGRAMMES_KEY, fullFleet.programmes],
        [
          WEEKLY_KEY,
          fullFleet.weekly.filter((report) => report.athleteId === "seed-1"),
        ],
      ]);
      await page.goto("/monthly-cycles?month=2026-08");
      await queueRowFor(page, "Jatin Kumar")
        .getByRole("button", { name: "Start" })
        .click();

      // Profile
      await page
        .getByRole("button", { name: "Confirm profile is current" })
        .click();
      await playwrightExpect(page).toHaveURL(/\/equipment$/);

      // Equipment: confirm the setup effective by month end.
      await page.getByRole("radio", { name: "Use this setup" }).check();
      await page.getByRole("button", { name: "Save & continue" }).click();
      await playwrightExpect(page).toHaveURL(/\/weekly$/);

      // Weekly: all five Mondays are covered by seeded reports.
      await playwrightExpect(page.getByText("5 expected weeks")).toBeVisible();
      await page.getByRole("button", { name: "Save & continue" }).click();
      await playwrightExpect(page).toHaveURL(/\/monthly-average$/);

      // Monthly average
      await page.getByRole("button", { name: "Save & continue" }).click();
      await playwrightExpect(page).toHaveURL(/\/training-load$/);

      // Training load: the seeded plan covers September; save it unchanged.
      await playwrightExpect(page.getByText("Season 2026-27")).toBeVisible();
      await page.getByRole("button", { name: "Save & continue" }).click();
      await playwrightExpect(page).toHaveURL(/\/conditioning$/);

      // Conditioning: assessment and programme are on record.
      await page
        .getByRole("button", { name: "Confirm conditioning coverage" })
        .click();
      await page.getByRole("button", { name: "Save & continue" }).click();
      await playwrightExpect(page).toHaveURL(/\/review$/);

      // Review
      await page
        .locator("#review-summary")
        .fill("Strong month; steady scores at 70m.");
      await page
        .getByRole("button", { name: "Complete monthly cycle" })
        .click();

      // The workflow advances to the next incomplete active athlete.
      await playwrightExpect(page).toHaveURL(
        /\/monthly-cycles\/[\w-]+\/profile$/
      );
      await playwrightExpect(
        page.getByRole("heading", { name: "Profile" })
      ).toBeVisible();

      // The finished cycle is complete in the queue, and the report exists.
      await page.goto("/monthly-cycles?month=2026-08");
      await playwrightExpect(page).toHaveURL(
        /\/monthly-cycles\?month=2026-08$/
      );
      await playwrightExpect(
        queueRowFor(page, "Jatin Kumar").getByText("Complete", { exact: true })
      ).toBeVisible();
    }
  );

  playwrightTest(
    "records a missing week exception and completes through every exception path",
    async ({ page }) => {
      await seedDirect(page, [
        [ATHLETES_KEY, fullFleet.athletes],
        [EQUIPMENT_KEY, fullFleet.equipment],
        [WEEKLY_KEY, fullFleet.weekly],
        [PLANS_KEY, fullFleet.plans],
        [ASSESSMENTS_KEY, fullFleet.assessments],
        [PROGRAMMES_KEY, fullFleet.programmes],
        // The other athlete already finished, so completing this cycle
        // finishes the month.
        [CYCLES_KEY, [completeCycleFor("seed-1", "cycle-seed-1")]],
      ]);
      // Start seed-2's cycle directly through the athlete picker.
      await page.goto("/monthly-cycles?month=2026-08");
      await playwrightExpect(page).toHaveURL(
        /\/monthly-cycles\?month=2026-08$/
      );
      await queueRowFor(page, "Meera Nair")
        .getByRole("button", { name: "Start" })
        .click();

      await page
        .getByRole("button", { name: "Confirm profile is current" })
        .click();
      await playwrightExpect(page).toHaveURL(/\/equipment$/);

      // No equipment change (a previous setup exists).
      await page.getByRole("radio", { name: "No equipment change" }).check();
      await page.getByRole("button", { name: "Save & continue" }).click();
      await playwrightExpect(page).toHaveURL(/\/weekly$/);

      // Two of five weeks are missing; a documented exception completes the step.
      await playwrightExpect(page.getByText("not covered")).toBeVisible();
      await page
        .locator("#weekly-exception")
        .fill("Athlete traveled; two weeks could not be made up.");
      await page.getByRole("button", { name: "Save & continue" }).click();
      await playwrightExpect(page).toHaveURL(/\/monthly-average$/);
      await page.getByRole("button", { name: "Save & continue" }).click();
      await playwrightExpect(page).toHaveURL(/\/training-load$/);

      // No covering plan: document the planning exception.
      await page
        .locator("#training-load-exception")
        .fill("Federation calendar not published for September.");
      await page.getByRole("button", { name: "Save & continue" }).click();
      await playwrightExpect(page).toHaveURL(/\/conditioning$/);

      // Conditioning: structured exception with explanation.
      await page.locator("#conditioning-exception-status").click();
      await page.getByRole("option", { name: "Medical exemption" }).click();
      await page
        .locator("#conditioning-exception-explanation")
        .fill("Returning from illness; testing deferred one month.");
      await page.getByRole("button", { name: "Save & continue" }).click();
      await playwrightExpect(page).toHaveURL(/\/review$/);

      await page
        .locator("#review-summary")
        .fill("Reduced month; documented exceptions.");
      await page
        .getByRole("button", { name: "Complete monthly cycle" })
        .click();

      // Every active athlete is complete, so the queue greets the coach.
      await playwrightExpect(page).toHaveURL(
        /\/monthly-cycles\?month=2026-08&summary=month-complete/
      );
      await playwrightExpect(page.getByText("Month complete")).toBeVisible();
    }
  );

  playwrightTest(
    "warns before abandoning unsaved changes inside the shell",
    async ({ page }) => {
      await seedOnce(page, [
        [ATHLETES_KEY, fullFleet.athletes],
        [EQUIPMENT_KEY, fullFleet.equipment],
      ]);
      await page.goto("/monthly-cycles?month=2026-08");
      await playwrightExpect(page).toHaveURL(
        /\/monthly-cycles\?month=2026-08$/
      );
      await queueRowFor(page, "Jatin Kumar")
        .getByRole("button", { name: "Start" })
        .click();
      await page
        .getByRole("button", { name: "Confirm profile is current" })
        .click();
      await playwrightExpect(page).toHaveURL(/\/equipment$/);

      await page.getByRole("radio", { name: "Record a new setup" }).check();
      await page.getByRole("textbox", { name: "Notes" }).fill("Partial edits");

      await page.getByRole("button", { name: "Back" }).click();
      await playwrightExpect(
        page.getByText("Discard unsaved changes?")
      ).toBeVisible();

      await page.getByRole("button", { name: "Keep editing" }).click();
      await playwrightExpect(page).toHaveURL(/\/equipment$/);

      await page.getByRole("button", { name: "Back" }).click();
      await page.getByRole("button", { name: "Discard changes" }).click();
      await playwrightExpect(page).toHaveURL(/\/profile$/);
    }
  );

  playwrightTest(
    "keeps the shell mounted across step navigation",
    async ({ page }) => {
      await seedOnce(page, [
        [ATHLETES_KEY, fullFleet.athletes],
        [EQUIPMENT_KEY, fullFleet.equipment],
      ]);
      await page.goto("/monthly-cycles?month=2026-08");
      await queueRowFor(page, "Jatin Kumar")
        .getByRole("button", { name: "Start" })
        .click();
      await playwrightExpect(
        page.getByRole("heading", { exact: true, name: "Profile" })
      ).toBeVisible();

      await page.evaluate(() => {
        const header = document.querySelector("header.bg-card");
        if (header) {
          // SAFETY: marking the live element to detect a remount later.
          (header as HTMLElement & { __shellProbe?: boolean }).__shellProbe =
            true;
        }
      });

      await page.getByRole("link", { name: /Weekly reports/ }).click();
      // The route heading and the step heading share this text, so the level
      // is what distinguishes them.
      await playwrightExpect(
        page.getByRole("heading", { level: 1, name: "Weekly reports" })
      ).toBeVisible();

      const probeSurvived = await page.evaluate(() => {
        const header = document.querySelector("header.bg-card");
        // SAFETY: reading the marker set before the navigation happened.
        return Boolean(
          header &&
          (header as HTMLElement & { __shellProbe?: boolean }).__shellProbe
        );
      });
      playwrightExpect(probeSurvived).toBe(true);
    }
  );

  playwrightTest(
    "keeps labels when the sidebar is collapsed and supports keyboard navigation",
    async ({ page }) => {
      await seedOnce(page, [[ATHLETES_KEY, fullFleet.athletes]]);
      await page.goto("/monthly-cycles?month=2026-08");
      await playwrightExpect(page).toHaveURL(
        /\/monthly-cycles\?month=2026-08$/
      );
      if (await page.getByRole("dialog").count()) {
        await page
          .getByRole("dialog")
          .getByRole("link", { name: "Monthly Cycle" })
          .click();
      }
      await playwrightExpect(
        page.getByRole("heading", { name: "Monthly cycle" })
      ).toBeVisible();

      await page
        .getByRole("banner")
        .getByRole("button", { name: "Toggle Sidebar" })
        .click();
      const link = page.getByRole("link", { name: "Monthly Cycle" });
      playwrightExpect(link).toBeAttached();
      playwrightExpect(link).toHaveAttribute("aria-label", "Monthly Cycle");

      await page.getByRole("link", { name: "Monthly Cycle" }).focus();
      await page.keyboard.press("Enter");
      await playwrightExpect(
        page.getByRole("heading", { name: "Monthly cycle" })
      ).toBeVisible();
    }
  );

  playwrightTest(
    "has no axe violations on the cycle routes",
    async ({ page }) => {
      // Eight sequential axe scans do not fit the default per-test budget.
      playwrightTest.slow();
      await seedDirect(page, [
        [ATHLETES_KEY, fullFleet.athletes],
        [EQUIPMENT_KEY, fullFleet.equipment],
        [PLANS_KEY, fullFleet.plans],
        [ASSESSMENTS_KEY, fullFleet.assessments],
        [PROGRAMMES_KEY, fullFleet.programmes],
        [
          WEEKLY_KEY,
          fullFleet.weekly.filter((report) => report.athleteId === "seed-1"),
        ],
        [CYCLES_KEY, [completeCycleFor("seed-1", "cycle-axe")]],
      ]);

      const axeOn = async (path: string) => {
        await page.goto(path);
        await playwrightExpect(
          page.getByRole("heading", { level: 1 })
        ).toBeVisible();
        const results = await new AxeBuilder({ page }).analyze();
        return results.violations;
      };

      const queue = await axeOn("/monthly-cycles?month=2026-08");
      playwrightExpect(queue, "axe violations on /monthly-cycles").toEqual([]);

      const cycleUrl = "http://127.0.0.1:3100/monthly-cycles/cycle-axe/profile";
      const cycleBase = cycleUrl.replace(/\/profile$/, "");

      const steps = [
        "profile",
        "equipment",
        "weekly",
        "monthly-average",
        "training-load",
        "conditioning",
        "review",
      ] as const;
      for (const step of steps) {
        // The same page must navigate sequentially to verify each route.
        // eslint-disable-next-line no-await-in-loop
        const url = new URL(`${cycleBase}/${step}`);
        // eslint-disable-next-line no-await-in-loop
        const violations = await axeOn(url.pathname + url.search);
        playwrightExpect(violations, `axe violations on ${step}`).toEqual([]);
      }
    }
  );
});
