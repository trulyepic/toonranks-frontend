import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: {
    // Build once, then serve the static SPA via `vite preview`. Running against
    // the dev server let Vite's dep optimizer race Playwright on cold CI starts
    // (transient chunk 404s -> JS never loads -> empty <title>), which made the
    // smoke tests flaky on a different route each run. The built bundle has no
    // runtime dep optimization, so this is deterministic. VITE_* env vars are
    // baked at build time, so they must be set on this (build) command.
    command:
      "npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
    env: {
      VITE_APP_BASE_URL: "http://127.0.0.1:9",
      VITE_GOOGLE_CLIENT_ID: "test-google-client-id",
      VITE_RECAPTCHA_SITE_KEY: "test-recaptcha-site-key",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
