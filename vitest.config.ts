import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests run against the shared packages' TypeScript source, so `npm test` never needs a prior build.
export default defineConfig({
  resolve: {
    alias: {
      "@utopia/engine": fileURLToPath(new URL("./engine/src/index.ts", import.meta.url)),
      "@utopia/ai": fileURLToPath(new URL("./ai/src/index.ts", import.meta.url)),
      "@utopia/protocol": fileURLToPath(new URL("./protocol/src/index.ts", import.meta.url)),
    },
  },
  test: {
    include: [
      "engine/test/**/*.test.ts",
      "ai/test/**/*.test.ts",
      "protocol/test/**/*.test.ts",
      "server/test/**/*.test.ts",
      "client/test/**/*.test.ts",
      "tools/test/**/*.test.ts",
    ],
  },
});
