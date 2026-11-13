import { Link } from "expo-router";
import { View } from "react-native";
import { DEFAULT_LOCALE, t } from "@nfe/core";
import { Logo, Text, useTheme } from "@nfe/ui/native";

export default function HomeScreen() {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: theme.layout.screenPadding,
        backgroundColor: theme.color.bg,
      }}
    >
      <Logo size={96} />
      <View style={{ alignItems: "center", gap: 4 }}>
        <Text variant="title">{t(DEFAULT_LOCALE, "app.name")}</Text>
        <Text variant="small" color="textMuted">
          {t(DEFAULT_LOCALE, "app.tagline")}
        </Text>
      </View>
      {__DEV__ ? (
        <Link href="/dev/ui">
          {/* Developer-only entry to the component gallery. */}
          <Text variant="smallStrong" color="accent">
            /dev/ui
          </Text>
        </Link>
      ) : null}
    </View>
  );
}
