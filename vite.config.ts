import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

// SPIKE config (Phase 0) — uses the React Router framework plugin so we can
// run `react-router build` and verify prerendered static HTML. The original
// SPA/vitest config is saved as vite.config.original.bak.
export default defineConfig({
  plugins: [reactRouter()],
  optimizeDeps: {
    // Pre-bundle the TipTap editor stack at server start. Without this, Vite
    // discovers these deps lazily on the first thread-page visit and
    // re-optimizes mid-session, which can split React across two dep-cache
    // generations and crash with "Invalid hook call" in dev.
    include: [
      "@tiptap/react",
      "@tiptap/core",
      "@tiptap/starter-kit",
      "@tiptap/extension-link",
      "@tiptap/extension-superscript",
      "@tiptap/extension-placeholder",
      "@tiptap/extension-image",
      "tiptap-markdown",
    ],
  },
});
