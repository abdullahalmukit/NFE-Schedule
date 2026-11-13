import type { NextConfig } from "next";

const config: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@nfe/core", "@nfe/ui"],
  // Do not write an AGENTS.md file into the app on `next dev`.
  agentRules: false,
};

export default config;
