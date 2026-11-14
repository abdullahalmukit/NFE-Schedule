import { Redirect } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fill, t, type MessageKey } from "@nfe/core";
import { Button, Card, Logo, Text, useTheme } from "@nfe/ui/native";
import { useAuth } from "../src/auth/auth-provider";

/** N-17 Waiting for approval (AUTH-8); also shown for a disabled account. */
export default function PendingScreen() {
  const auth = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Approved (or signed out) → leave; the provider re-checks every 30 s and on focus.
  if (auth.stage !== "pending" && auth.stage !== "disabled") return <Redirect href="/" />;

  const tr = (key: MessageKey) => t(auth.locale, key);
  const disabled = auth.stage === "disabled";

  return (
    <ScrollView
      style={{ backgroundColor: theme.color.bg }}
      contentContainerStyle={{
        flexGrow: 1,
        gap: 24,
        padding: theme.layout.screenPadding,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 20,
      }}
    >
      <Logo size={56} />
      <View style={{ gap: 8 }}>
        <Text variant="display" header>
          {tr(disabled ? "disabled.title" : "pending.title")}
        </Text>
        <Text color="textMuted">{tr(disabled ? "disabled.body" : "pending.body")}</Text>
      </View>
      <Card>
        <Text variant="small" color="textMuted">
          {fill(tr("pending.signedInAs"), {
            email: auth.profile?.email ?? auth.session?.user.email ?? "",
          })}
        </Text>
      </Card>
      <View style={{ marginTop: "auto", gap: 12 }}>
        <Button label={tr("pending.browse")} onPress={() => auth.setBrowsingWhilePending(true)} />
        {disabled ? null : (
          <Button
            label={tr("pending.checkAgain")}
            variant="secondary"
            onPress={() => void auth.refreshProfile()}
          />
        )}
        <Button
          label={tr("auth.signOut")}
          variant="secondary"
          onPress={() => void auth.signOut()}
        />
      </View>
    </ScrollView>
  );
}
