import { Link } from "expo-router";
import { View } from "react-native";
import { DEFAULT_LOCALE, t } from "@nfe/core";
import { Logo, Text, useTheme } from "@nfe/ui/native";

export default function HomeScreen() {
  const theme = useTheme();
  const [strong = "", ...rest] = t(DEFAULT_LOCALE, "app.name").split(" ");
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
      <Logo
        strong={strong}
        rest={rest.join(" ")}
        tagline={t(DEFAULT_LOCALE, "app.tagline")}
        size={48}
      />
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
