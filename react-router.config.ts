import type { Config } from "@react-router/dev/config";

// Phase 1: framework mode, still a SPA (ssr: false) for behavior parity with the
// old Vite SPA. No `prerender` yet — that is Phase 2, where the public content
// routes get prerendered to static HTML. Keeping `appDirectory: "src"` so the
// framework files live alongside the existing pages/components.
export default {
  appDirectory: "src",
  ssr: false,
} satisfies Config;
