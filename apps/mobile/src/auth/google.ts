import { supabase } from "../lib/supabase";

export type GoogleResult = { ok: true } | { ok: false; cancelled: boolean; message?: string };

/**
 * Native Google sign-in (Android account picker) → Supabase session (AUTH-1).
 * The ID token's audience is the Web client ID, which Supabase's Google
 * provider accepts. Needs a development or release build (not Expo Go).
 */
export async function signInWithGoogle(onlyDomain: string | null): Promise<GoogleResult> {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId)
    return { ok: false, cancelled: false, message: "Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID" };

  // Loaded on demand so the rest of the app still opens where the native module is missing.
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } =
    await import("@react-native-google-signin/google-signin");
  GoogleSignin.configure({ webClientId, ...(onlyDomain ? { hostedDomain: onlyDomain } : {}) });

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return { ok: false, cancelled: true };
    const idToken = response.data.idToken;
    if (!idToken) return { ok: false, cancelled: false, message: "No ID token from Google" };

    const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: idToken });
    if (error) {
      await GoogleSignin.signOut().catch(() => undefined);
      return { ok: false, cancelled: false, message: error.message };
    }
    return { ok: true };
  } catch (e) {
    if (
      isErrorWithCode(e) &&
      (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)
    ) {
      return { ok: false, cancelled: true };
    }
    return { ok: false, cancelled: false, message: e instanceof Error ? e.message : String(e) };
  }
}
