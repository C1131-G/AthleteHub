import { instant } from "@next/playwright";
import {
  expect as playwrightExpect,
  test as playwrightTest,
} from "@playwright/test";

playwrightTest.describe("AthleteHub instant navigation", () => {
  const workspaceRoutes = [
    ["dashboard", "/dashboard", "Performance dashboard"],
    ["reports", "/reports", "Reports"],
    ["equipment", "/athletes/equipment", "Equipment details"],
    ["conditioning", "/conditioning", "Conditioning"],
    ["training load", "/training-plans", "Training load"],
    ["monthly cycles", "/monthly-cycles", "Monthly cycle"],
  ] as const;
  const deferredRoutes = [
    ["new assessment", "/reports/assessments/new", "New assessment"],
    ["assessment preview", "/reports/assessments/unknown", "Assessment"],
    ["assessment edit", "/reports/assessments/unknown/edit", "Edit assessment"],
    ["cycle profile", "/monthly-cycles/unknown/profile", "Athlete profile"],
    ["cycle equipment", "/monthly-cycles/unknown/equipment", "Equipment"],
    ["cycle weekly", "/monthly-cycles/unknown/weekly", "Weekly reports"],
    [
      "cycle monthly average",
      "/monthly-cycles/unknown/monthly-average",
      "Monthly average",
    ],
    [
      "cycle training load",
      "/monthly-cycles/unknown/training-load",
      "Training load",
    ],
    [
      "cycle conditioning",
      "/monthly-cycles/unknown/conditioning",
      "Conditioning",
    ],
    ["cycle review", "/monthly-cycles/unknown/review", "Cycle review"],
  ] as const;

  for (const [label, route, heading] of workspaceRoutes) {
    playwrightTest(
      `the ${label} shell is instant on initial load`,
      async ({ page }) => {
        await instant(
          page,
          async () => {
            await page.goto(route);
            await playwrightExpect(
              page.getByRole("heading", { level: 1, name: heading })
            ).toBeVisible();
          },
          { baseURL: "http://127.0.0.1:3100" }
        );
      }
    );
  }

  for (const [label, route, heading] of deferredRoutes) {
    playwrightTest(
      `the ${label} identity is instant on initial load`,
      async ({ page }) => {
        await instant(
          page,
          async () => {
            await page.goto(route);
            await playwrightExpect(
              page.getByRole("heading", { level: 1, name: heading })
            ).toBeVisible();
          },
          { baseURL: "http://127.0.0.1:3100" }
        );
      }
    );
  }

  playwrightTest.describe("sidebar navigation and tooltip interactions", () => {
    playwrightTest(
      "keeps expanded desktop navigation stable while links are hovered and changed",
      async ({ page }) => {
        playwrightTest.skip((await page.evaluate(() => innerWidth)) < 500);

        const consoleWarnings: string[] = [];
        page.on("console", (message) => {
          if (message.type() === "warning") {
            consoleWarnings.push(message.text());
          }
        });

        await page.goto("/dashboard");
        await playwrightExpect(
          page.getByRole("heading", { level: 1, name: "Performance dashboard" })
        ).toBeVisible();

        const reportsLink = page.getByRole("link", {
          exact: true,
          name: "Reports",
        });
        await reportsLink.hover();
        await playwrightExpect(
          page.getByRole("tooltip", { name: "Reports" })
        ).toBeHidden();

        const navigation = reportsLink.click();
        await page
          .getByRole("link", { exact: true, name: "Conditioning" })
          .hover();
        await navigation;
        await playwrightExpect(page).toHaveURL(/\/reports$/);
        await playwrightExpect(
          page.getByRole("heading", { level: 1, name: "Reports" })
        ).toBeVisible();
        playwrightExpect(consoleWarnings).toEqual([]);
      }
    );

    playwrightTest(
      "keeps collapsed desktop tooltips and keyboard navigation working",
      async ({ page }) => {
        playwrightTest.skip((await page.evaluate(() => innerWidth)) < 500);

        const consoleWarnings: string[] = [];
        page.on("console", (message) => {
          if (message.type() === "warning") {
            consoleWarnings.push(message.text());
          }
        });

        await page.goto("/dashboard");
        await page
          .getByRole("banner")
          .getByRole("button", { name: "Toggle Sidebar" })
          .click();

        const reportsLink = page.getByRole("link", {
          exact: true,
          name: "Reports",
        });
        await reportsLink.hover();
        await playwrightExpect(
          page.getByRole("tooltip", { name: "Reports" })
        ).toBeVisible();
        await reportsLink.focus();
        await playwrightExpect(
          page.getByRole("tooltip", { name: "Reports" })
        ).toBeVisible();

        await reportsLink.press("Enter");
        await playwrightExpect(page).toHaveURL(/\/reports$/);
        await playwrightExpect(
          page.getByRole("heading", { level: 1, name: "Reports" })
        ).toBeVisible();
        playwrightExpect(consoleWarnings).toEqual([]);
      }
    );

    playwrightTest(
      "disables drawer tooltips while links remain navigable",
      async ({ page }) => {
        playwrightTest.skip((await page.evaluate(() => innerWidth)) >= 500);

        const consoleWarnings: string[] = [];
        page.on("console", (message) => {
          if (message.type() === "warning") {
            consoleWarnings.push(message.text());
          }
        });

        await page.goto("/dashboard");
        await page
          .getByRole("banner")
          .getByRole("button", { name: "Toggle Sidebar" })
          .click();

        const drawer = page.getByRole("dialog");
        const reportsLink = drawer.getByRole("link", {
          exact: true,
          name: "Reports",
        });
        await reportsLink.hover();
        await playwrightExpect(
          page.getByRole("tooltip", { name: "Reports" })
        ).toBeHidden();

        const navigation = reportsLink.click();
        await drawer
          .getByRole("link", { exact: true, name: "Conditioning" })
          .hover();
        await navigation;
        await playwrightExpect(page).toHaveURL(/\/reports$/);
        await playwrightExpect(
          page.getByRole("heading", { level: 1, name: "Reports" })
        ).toBeVisible();
        playwrightExpect(consoleWarnings).toEqual([]);
      }
    );
  });

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

  for (const sourceRoute of ["/dashboard", "/athletes"] as const) {
    playwrightTest(
      `Equipment details is instant from ${sourceRoute}`,
      async ({ page }) => {
        await page.goto(sourceRoute);
        // On mobile the sidebar is a drawer, so its links are not in the DOM
        // until it is opened.
        if ((await page.evaluate(() => innerWidth)) < 500) {
          await page
            .getByRole("banner")
            .getByRole("button", { name: "Toggle Sidebar" })
            .click();
        }
        await instant(page, async () => {
          await page
            .getByRole("link", { exact: true, name: "Equipment" })
            .click();
          await playwrightExpect(page).toHaveURL(/\/athletes\/equipment$/);
          await playwrightExpect(
            page.getByRole("heading", {
              level: 1,
              name: "Equipment details",
            })
          ).toBeVisible();
        });
      }
    );
  }

  playwrightTest(
    "unknown URLs render the accessible not-found shell",
    async ({ page }) => {
      await page.goto("/this-route-does-not-exist");
      await playwrightExpect(
        page.getByRole("heading", { level: 1, name: "Page not found" })
      ).toBeVisible();
      await playwrightExpect(
        page.getByRole("link", { name: "Return to dashboard" })
      ).toBeVisible();
    }
  );
});
