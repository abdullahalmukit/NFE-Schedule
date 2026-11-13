import { Link, Redirect } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fill, t, type MessageKey } from "@nfe/core";
import { Button, Card, InfoBanner, Logo, Text, useTheme } from "@nfe/ui/native";
import { useAuth } from "../src/auth/auth-provider";

/**
 * Home. Until the routine screens arrive (student-home, student-routine) it
 * shows who is looking: guest, pending (browsing) or signed-in account.
 */
export default function HomeScreen() {
  const auth = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  if (auth.stage === "sign-in") return <Redirect href="/sign-in" />;
  if (auth.stage === "disabled") return <Redirect href="/pending" />;
  if (auth.stage === "pending" && !auth.browsingWhilePending) return <Redirect href="/pending" />;

  const tr = (key: MessageKey) => t(auth.locale, key);

  return (
    <ScrollView
      style={{ backgroundColor: theme.color.bg }}
      contentContainerStyle={{
        flexGrow: 1,
        gap: 24,
        padding: theme.layout.screenPadding,
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 20,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Logo size={48} />
        <View style={{ flex: 1 }}>
          <Text variant="title">{tr("app.name")}</Text>
          <Text variant="small" color="textMuted">
            {tr("app.tagline")}
          </Text>
        </View>
      </View>

      {auth.stage === "pending" ? (
        <InfoBanner
          icon="alert"
          tone="warning"
          title={tr("home.pending")}
          onPress={() => auth.setBrowsingWhilePending(false)}
        />
      ) : null}

      <Card>
        <Text color="textMuted">{tr("home.routineSoon")}</Text>
      </Card>

      {auth.stage === "guest" ? (
        <View style={{ gap: 12 }}>
          <Text variant="small" color="textMuted">
            {tr("home.guest")}
          </Text>
          <Button label={tr("home.signIn")} onPress={() => void auth.leaveGuest()} />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <Text variant="small" color="textMuted">
            {fill(tr("home.signedInAs"), { email: auth.profile?.email ?? "" })}
          </Text>
          <Button
            label={tr("auth.signOut")}
            variant="secondary"
            onPress={() => void auth.signOut()}
          />
        </View>
      )}

      {__DEV__ ? (
        <Link href="/dev/ui" style={{ alignSelf: "center", marginTop: "auto", padding: 12 }}>
          {/* Developer-only entry to the component gallery. */}
          <Text variant="smallStrong" color="accent">
            /dev/ui
          </Text>
        </Link>
      ) : null}
    </ScrollView>
  );
}
