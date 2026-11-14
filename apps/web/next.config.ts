import type { NextConfig } from "next";

const config: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@nfe/core", "@nfe/ui", "@nfe/parser"],
  // File readers for the master data import load at run time in Node, not bundled.
  serverExternalPackages: ["pdfjs-dist", "word-extractor"],
  // Do not write an AGENTS.md file into the app on `next dev`.
  agentRules: false,
};

export default config;
