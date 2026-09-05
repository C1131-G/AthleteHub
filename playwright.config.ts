import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  /**
   * These drive a real standalone server, several through multi-step flows, so
   * the per-assertion and per-test defaults are too tight once workers compete
   * for it. Generous budgets here beat `test.slow()` scattered over the suite.
   */
  expect: { timeout: 15_000 },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bun run instant:server",
    reuseExistingServer: false,
    timeout: 300_000,
    url: "http://127.0.0.1:3100",
  },
});
