import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL, E2E_PORT, E2E_SERVER_ENV } from "./e2e/env";

/**
 * Runs against the production build (`npm run build` first) on its own port and
 * its own throwaway database. Uses the installed Google Chrome so nothing has to
 * be downloaded — GitHub's Ubuntu runners ship it too.
 */
export default defineConfig({
  testDir: "./e2e",
  // One shared database: tests run in order instead of racing each other.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: E2E_BASE_URL,
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"], channel: "chrome" }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    // The database is rebuilt here, not in globalSetup: Playwright starts the server first.
    command: `node e2e/prepare-db.mjs && npx next start -H 127.0.0.1 -p ${E2E_PORT}`,
    url: E2E_BASE_URL,
    env: E2E_SERVER_ENV,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
