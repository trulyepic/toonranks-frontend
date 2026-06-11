import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Separate from vite.config.ts because the app build now uses the React Router
// framework plugin, which isn't compatible with the vitest test runner config.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    exclude: ["e2e/**", "node_modules/**", "dist/**", "build/**"],
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
});
