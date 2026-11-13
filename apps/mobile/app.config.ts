import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "NFE Schedule",
  slug: "nfe-schedule",
  scheme: "nfeschedule",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  // Final application ID (UPD-3); must never change — see docs/APP_UPDATES.md §3.
  android: { package: "com.diu.nfeschedule" },
  ios: { bundleIdentifier: "com.diu.nfeschedule" },
  plugins: ["expo-router", "expo-status-bar"],
  experiments: { typedRoutes: true },
};

export default config;
