import { Redirect } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  domainHint,
  fill,
  isSignupRefusal,
  rejectionMessage,
  t,
  type Locale,
  type MessageKey,
} from "@nfe/core";
import {
  Button,
  InfoBanner,
  Logo,
  SegmentedControl,
  Text,
  TextField,
  useTheme,
} from "@nfe/ui/native";
import { useAuth } from "../src/auth/auth-provider";
import { signInWithGoogle } from "../src/auth/google";
import { supabase } from "../src/lib/supabase";

type EmailStep = "closed" | "email" | "code";

/** N-1 Welcome / sign-in, step 1 of 2 (AUTH-1, AUTH-2, AUTH-9). */
export default function SignInScreen() {
  const auth = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<EmailStep>("closed");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  if (auth.stage !== "sign-in") return <Redirect href="/" />;

  const tr = (key: MessageKey) => t(auth.locale, key);
  const hint = domainHint(auth.signup);
  const onlyDomain =
    auth.signup.domain_mode === "restricted" && auth.signup.allowed_domains.length === 1
      ? (auth.signup.allowed_domains[0] ?? null)
      : null;

  function explain(message: string | undefined): string {
    if (isSignupRefusal(auth.signup, message)) return rejectionMessage(auth.signup, auth.locale);
    if (message && /network|fetch|offline/i.test(message)) return tr("auth.errorOffline");
    return tr("auth.errorGeneric");
  }

  async function run(task: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await task();
    } finally {
      setBusy(false);
    }
  }

  const google = () =>
    run(async () => {
      const result = await signInWithGoogle(onlyDomain);
      if (!result.ok && !result.cancelled) setError(explain(result.message));
    });

  const sendCode = () =>
    run(async () => {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (err) setError(explain(err.message));
      else setStep("code");
    });

  const verifyCode = () =>
    run(async () => {
      const { error: err } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "email",
      });
      if (err) {
        setError(
          isSignupRefusal(auth.signup, err.message) ? explain(err.message) : tr("auth.errorCode"),
        );
      }
    });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.color.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          gap: 28,
          padding: theme.layout.screenPadding,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text variant="caption" color="accent">
            {tr("auth.step1")}
          </Text>
          <View style={{ width: 176 }}>
            <SegmentedControl<Locale>
              value={auth.locale}
              onChange={(l) => void auth.changeLocale(l)}
              options={[
                { value: "en", label: t("en", "lang.en") },
                { value: "bn", label: t("bn", "lang.bn") },
              ]}
            />
          </View>
        </View>

        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Logo size={56} />
            <Text variant="title" header>
              {tr("app.name")}
            </Text>
          </View>
          <Text color="textMuted">{tr("auth.intro")}</Text>
        </View>

        {error ? <InfoBanner icon="alert" tone="warning" title={error} /> : null}

        <View style={{ gap: 12 }}>
          {auth.signup.google ? (
            <>
              <Button label={tr("auth.google")} onPress={google} disabled={busy} />
              <Text variant="small" color="textMuted" style={{ textAlign: "center" }}>
                {hint ? `${fill(tr("auth.domainHint"), { domains: hint })} · ` : ""}
                {tr("auth.firstTime")}
              </Text>
            </>
          ) : null}

          {auth.signup.email_otp ? (
            step === "closed" ? (
              <Button
                label={tr("auth.emailCode")}
                icon="mail"
                variant="secondary"
                onPress={() => setStep("email")}
                disabled={busy}
              />
            ) : step === "email" ? (
              <View style={{ gap: 12 }}>
                <TextField
                  label={tr("auth.emailLabel")}
                  placeholder={tr("auth.emailLabel")}
                  value={email}
                  onChangeText={setEmail}
                  icon="mail"
                  keyboardType="email-address"
                />
                <Button
                  label={tr("auth.sendCode")}
                  variant="secondary"
                  onPress={sendCode}
                  disabled={busy || !email.includes("@")}
                />
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <Text variant="small" color="textMuted">
                  {fill(tr("auth.codeSent"), { email })}
                </Text>
                <TextField
                  label={tr("auth.codeLabel")}
                  placeholder={tr("auth.codeLabel")}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                />
                <Button
                  label={tr("auth.verify")}
                  onPress={verifyCode}
                  disabled={busy || code.trim().length < 6}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setStep("email");
                    setCode("");
                  }}
                  style={{ alignSelf: "center", padding: 12 }}
                >
                  <Text variant="smallStrong" color="accent">
                    {tr("auth.changeEmail")}
                  </Text>
                </Pressable>
              </View>
            )
          ) : null}
        </View>

        <View style={{ marginTop: "auto", gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.color.border }} />
            <Text variant="small" color="textFaint">
              {tr("auth.or")}
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.color.border }} />
          </View>
          <Button
            label={tr("auth.guest")}
            variant="secondary"
            onPress={() => void auth.continueAsGuest()}
            disabled={busy}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
