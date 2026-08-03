import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@spendguard/sdk": path.resolve(__dirname, "../../packages/sdk/src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
  },
});
