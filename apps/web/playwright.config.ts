import { defineConfig, devices } from "@playwright/test";
import { MOCK_PORT, MOCK_URL, SITE_PORT, SITE_URL } from "./e2e/helpers";

// End-to-end tests against a real production build (next build + next
// start), talking to e2e/mock-backend.ts instead of rust-be. One worker:
// the mock's state and the site's cache are shared across tests.

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: SITE_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "bun e2e/mock-backend.ts",
      url: `${MOCK_URL}/health`,
      env: { MOCK_BACKEND_PORT: String(MOCK_PORT), MOCK_BACKEND_ORIGIN: SITE_URL },
      reuseExistingServer: false,
    },
    {
      // A fresh build every run: a stale .next-e2e fetch cache would serve
      // posts from a previous run's mock state.
      command: `rm -rf .next-e2e && next build && next start -H 127.0.0.1 -p ${SITE_PORT}`,
      url: SITE_URL,
      timeout: 240_000,
      env: {
        NEXT_DIST_DIR: ".next-e2e",
        RUST_API_URL: MOCK_URL,
        NEXT_PUBLIC_RUST_API_URL: MOCK_URL,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      reuseExistingServer: false,
    },
  ],
});
