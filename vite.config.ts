import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

// SPIKE config (Phase 0) — uses the React Router framework plugin so we can
// run `react-router build` and verify prerendered static HTML. The original
// SPA/vitest config is saved as vite.config.original.bak.
export default defineConfig({
  plugins: [reactRouter()],
});
