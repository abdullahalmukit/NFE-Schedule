import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/{src,test}/**/*.test.ts", "apps/web/{app,lib,src}/**/*.test.{ts,tsx}"],
    environment: "node",
    testTimeout: 30_000,
  },
});
