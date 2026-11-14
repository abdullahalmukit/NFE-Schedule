import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";
import { chunkedStorage, supabaseProjectUrl, type Database } from "@nfe/core";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY (apps/mobile/.env)",
  );
}

/**
 * Supabase client for the phone (anon key + the user's session). The session is
 * kept in the device keychain / keystore via expo-secure-store, split into
 * chunks because a session is larger than one secure-store value should be.
 */
export const supabase = createClient<Database>(supabaseProjectUrl(url), anonKey, {
  auth: {
    storage: chunkedStorage(SecureStore),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh tokens only while the app is in the foreground.
AppState.addEventListener("change", (state) => {
  if (state === "active") void supabase.auth.startAutoRefresh();
  else void supabase.auth.stopAutoRefresh();
});
