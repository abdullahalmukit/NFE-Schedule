import type { ExpoConfig } from "expo/config";
// Plain JSON import: the Expo config loader does not compile workspace TypeScript.
import tokens from "../../design/tokens.json";

const config: ExpoConfig = {
  name: "NFE Schedule",
  slug: "nfe-schedule",
  scheme: "nfeschedule",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  backgroundColor: tokens.color.dark.bg,
  // Final application ID (UPD-3); must never change — see docs/APP_UPDATES.md §3.
  android: {
    package: "com.diu.nfeschedule",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: tokens.brand.ink,
    },
  },
  ios: { bundleIdentifier: "com.diu.nfeschedule" },
  plugins: [
    "expo-router",
    "expo-status-bar",
    "expo-font",
    "expo-secure-store",
    "expo-system-ui",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 120,
        backgroundColor: tokens.brand.ink,
      },
    ],
  ],
  experiments: { typedRoutes: true },
};

export default config;
