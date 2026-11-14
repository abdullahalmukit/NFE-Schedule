import { useEffect, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { getTheme, resolveThemeName } from "@nfe/ui";
import { UiProvider } from "@nfe/ui/native";
import { AuthProvider, useAuth } from "../src/auth/auth-provider";
import { fontMap } from "../src/fonts";

void SplashScreen.preventAutoHideAsync();

/** Keeps the splash screen up until fonts and the session are known. */
function Gate({ fontsDone, children }: { fontsDone: boolean; children: ReactNode }) {
  const { ready, locale } = useAuth();
  const done = fontsDone && ready;
  useEffect(() => {
    if (done) void SplashScreen.hideAsync();
  }, [done]);
  if (!done) return null;
  return (
    <UiProvider preference="system" locale={locale}>
      {children}
    </UiProvider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts(fontMap);
  const theme = getTheme(resolveThemeName("system", useColorScheme()));

  return (
    <AuthProvider>
      {/* Fall back to system fonts if a font file fails rather than blocking the app. */}
      <Gate fontsDone={loaded || Boolean(error)}>
        <StatusBar style={theme.name === "dark" ? "light" : "dark"} />
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.color.bg } }}
        />
      </Gate>
    </AuthProvider>
  );
}
