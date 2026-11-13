import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "NFE Schedule",
  slug: "nfe-schedule",
  scheme: "nfeschedule",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  plugins: ["expo-router", "expo-status-bar"],
  experiments: { typedRoutes: true },
};

export default config;
