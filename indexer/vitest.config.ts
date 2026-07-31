import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Use SDK source directly so indexer tests don't require a prior
      // `npm run build:sdk`.
      "@spendguard/sdk": fileURLToPath(
        new URL("../packages/sdk/src/index.ts", import.meta.url),
      ),
    },
  },
});
