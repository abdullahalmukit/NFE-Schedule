import { StyleSheet, Text, View } from "react-native";
import { DEFAULT_LOCALE, t } from "@nfe/core";
import { tokens } from "@nfe/ui";

const c = tokens.color.dark;

export default function HomeScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{t(DEFAULT_LOCALE, "app.name")}</Text>
      <Text style={styles.subtitle}>{t(DEFAULT_LOCALE, "app.tagline")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: c.bg,
  },
  title: { color: c.text, fontSize: 24, fontWeight: "700" },
  subtitle: { color: c.textMuted, fontSize: 14 },
});
