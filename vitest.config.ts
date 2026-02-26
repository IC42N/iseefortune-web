import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // if your `@` is meant to point to `src`, use:
      // "@": path.resolve(__dirname, "src"),
    },
  },
});