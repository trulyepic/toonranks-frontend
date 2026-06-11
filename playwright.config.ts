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
    // Build once, then run the SSR server (react-router-serve) — under ssr:true
    // the app is server-rendered, so we can't serve it as a static bundle. We
    // build against a dead API base so the app's data fetches fail fast in tests
    // (the smoke tests only assert server-rendered titles/content, which come
    // from native meta() and don't need the API). VITE_* are baked at build time;
    // PORT is read by react-router-serve at runtime. Both are set here so they
    // apply to the build and the server.
    command: "npm run build && npm run start",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
    env: {
      VITE_APP_BASE_URL: "http://127.0.0.1:9",
      VITE_GOOGLE_CLIENT_ID: "test-google-client-id",
      VITE_RECAPTCHA_SITE_KEY: "test-recaptcha-site-key",
      HOST: "127.0.0.1",
      PORT: "4173",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
