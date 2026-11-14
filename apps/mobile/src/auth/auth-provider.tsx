import type { Session } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import {
  AUTH_SIGNUP_DEFAULTS,
  authStage,
  parseAuthSignup,
  resolveLocale,
  type AuthSignupSettings,
  type AuthStage,
  type Locale,
  type ProfileStatus,
} from "@nfe/core";
import { readGuestLocale, saveLocale } from "../lib/locale";
import { supabase } from "../lib/supabase";

const GUEST_KEY = "nfe.guest";
/** How often a pending account re-checks its status (AUTH-8) until push arrives. */
const RECHECK_MS = 30_000;

interface Profile {
  email: string;
  full_name: string | null;
  status: ProfileStatus;
  locale: string;
}

interface AuthContextValue {
  ready: boolean;
  stage: AuthStage;
  locale: Locale;
  signup: AuthSignupSettings;
  session: Session | null;
  profile: Profile | null;
  /** "Browse routines meanwhile" chosen on N-17. */
  browsingWhilePending: boolean;
  setBrowsingWhilePending(value: boolean): void;
  continueAsGuest(): Promise<void>;
  /** Guest taps "Sign in": back to N-1. */
  leaveGuest(): Promise<void>;
  changeLocale(locale: Locale): Promise<void>;
  refreshProfile(): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [guest, setGuest] = useState(false);
  const [guestLocale, setGuestLocale] = useState<Locale | null>(null);
  const [adminLocale, setAdminLocale] = useState<unknown>(undefined);
  const [signup, setSignup] = useState<AuthSignupSettings>(AUTH_SIGNUP_DEFAULTS);
  const [browsingWhilePending, setBrowsingWhilePending] = useState(false);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("email, full_name, status, locale")
      .eq("id", userId)
      .maybeSingle();
    if (data) setProfile(data);
  }, []);

  // Start-up: device state, public sign-in settings, current session.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const [guestFlag, savedLocale, settings, current] = await Promise.all([
        SecureStore.getItemAsync(GUEST_KEY),
        readGuestLocale(),
        supabase
          .from("app_settings")
          .select("key, value")
          .in("key", ["auth.signup", "i18n.default_locale"])
          .then(
            (r) => r.data,
            () => null,
          ), // offline: keep the defaults
        supabase.auth.getSession(),
      ]);
      if (!alive) return;
      setGuest(guestFlag === "1");
      setGuestLocale(savedLocale);
      setSignup(parseAuthSignup(settings?.find((s) => s.key === "auth.signup")?.value));
      setAdminLocale(settings?.find((s) => s.key === "i18n.default_locale")?.value);
      setSession(current.data.session);
      await loadProfile(current.data.session?.user.id);
      if (alive) setReady(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      void loadProfile(next?.user.id);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const stage = authStage({ signedIn: Boolean(session), status: profile?.status, guest });

  // A pending account moves on by itself once approved: re-check on focus and every 30 s.
  useEffect(() => {
    if (stage !== "pending" || !session) return;
    const recheck = () => void loadProfile(session.user.id);
    const id = setInterval(recheck, RECHECK_MS);
    const sub = AppState.addEventListener("change", (s) => s === "active" && recheck());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [stage, session, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      stage,
      locale: resolveLocale({ saved: profile?.locale ?? guestLocale, adminDefault: adminLocale }),
      signup,
      session,
      profile,
      browsingWhilePending,
      setBrowsingWhilePending,
      async continueAsGuest() {
        await SecureStore.setItemAsync(GUEST_KEY, "1");
        setGuest(true);
      },
      async leaveGuest() {
        await SecureStore.deleteItemAsync(GUEST_KEY);
        setGuest(false);
      },
      async changeLocale(next) {
        const where = await saveLocale(next);
        if (where === "profile") setProfile((p) => (p ? { ...p, locale: next } : p));
        else setGuestLocale(next);
      },
      async refreshProfile() {
        await loadProfile(session?.user.id);
      },
      async signOut() {
        await supabase.auth.signOut();
        await SecureStore.deleteItemAsync(GUEST_KEY);
        setGuest(false);
        setBrowsingWhilePending(false);
        try {
          const { GoogleSignin } = await import("@react-native-google-signin/google-signin");
          await GoogleSignin.signOut();
        } catch {
          // not signed in with Google, or running without the native module
        }
      },
    }),
    [
      ready,
      stage,
      profile,
      guestLocale,
      adminLocale,
      signup,
      session,
      browsingWhilePending,
      loadProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
