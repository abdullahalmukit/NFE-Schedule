import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { DEFAULT_LOCALE } from "@nfe/core";
import { getTheme, resolveThemeName } from "@nfe/ui";
import { UiProvider } from "@nfe/ui/native";
import { fontMap } from "../src/fonts";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts(fontMap);
  const theme = getTheme(resolveThemeName("system", useColorScheme()));

  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);

  // Fall back to system fonts if a font file fails to load rather than blocking the app.
  if (!loaded && !error) return null;

  return (
    <UiProvider preference="system" locale={DEFAULT_LOCALE}>
      <StatusBar style={theme.name === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.color.bg } }}
      />
    </UiProvider>
  );
}
