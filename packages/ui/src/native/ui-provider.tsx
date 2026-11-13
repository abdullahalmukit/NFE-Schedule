import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { getTheme, resolveThemeName, type Theme, type ThemePreference } from "../theme";

export type UiLocale = "en" | "bn";

interface UiContextValue {
  theme: Theme;
  locale: UiLocale;
  /** Admin logo (`branding.logo_path`); null = built-in logo. */
  logoUrl: string | null;
}

const UiContext = createContext<UiContextValue>({
  theme: getTheme("dark"),
  locale: "en",
  logoUrl: null,
});

export interface UiProviderProps {
  /** Settings → Theme (ME-8); follows the system by default. */
  preference?: ThemePreference;
  /** Picks Hind Siliguri for Bangla text. */
  locale?: UiLocale;
  /** Public URL of the admin's logo, if one is set. */
  logoUrl?: string | null;
  children: ReactNode;
}

export function UiProvider({
  preference = "system",
  locale = "en",
  logoUrl = null,
  children,
}: UiProviderProps) {
  const system = useColorScheme();
  const name = resolveThemeName(preference, system);
  const value = useMemo(
    () => ({ theme: getTheme(name), locale, logoUrl }),
    [name, locale, logoUrl],
  );
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiContextValue {
  return useContext(UiContext);
}

export function useTheme(): Theme {
  return useContext(UiContext).theme;
}
