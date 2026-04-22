import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock, Session } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

export function getSupabaseConfig() {
  return {
    url: supabaseUrl ?? "",
    anonKey: supabaseAnonKey ?? "",
    isConfigured: Boolean(supabaseUrl && supabaseAnonKey),
  };
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
      global: {
        fetch: (...args) => fetch(...args),
      },
    })
  : null;

let hasRegisteredAppStateListener = false;

if (supabase && Platform.OS !== "web" && !hasRegisteredAppStateListener) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });

  hasRegisteredAppStateListener = true;
}

export async function ensureSupabaseSession(): Promise<Session | null> {
  if (!supabase) {
    return null;
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (session?.user) {
    return session;
  }

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    throw error;
  }

  if (!data.session?.user) {
    throw new Error("Supabase anonymous sign-in did not return a session.");
  }

  return data.session;
}

export async function getAuthenticatedSupabaseUserId(): Promise<string> {
  const session = await ensureSupabaseSession();
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unable to resolve the authenticated Supabase user.");
  }

  return userId;
}

export function getOnboardingPersistenceConfig() {
  const config = getSupabaseConfig();

  return {
    ...config,
    mode: config.isConfigured ? "supabase" as const : "local" as const,
  };
}

export function assertSupabaseReady() {
  const config = getSupabaseConfig();

  if (!config.isConfigured || !supabase) {
    throw new Error(
      "Supabase is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to continue.",
    );
  }

  return { ...config, client: supabase };
}

