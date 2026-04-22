import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { mapProfileToSupabaseRow } from "@/lib/onboarding-persistence";
import { supabase } from "@/lib/supabase";
import { OnboardingProfile } from "@/types/onboarding";

WebBrowser.maybeCompleteAuthSession();

const AUTH_REDIRECT = "nerdieblaqfit://auth/callback";

// Extracts the PKCE code from a redirect URL without relying on the URL global polyfill.
function extractCode(url: string): string | null {
  const match = url.match(/[?&]code=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Type-safe wrapper for linkIdentity, available in @supabase/supabase-js >= 2.64.
// Upgrade with: npm install @supabase/supabase-js@latest
async function linkIdentityOAuth(provider: "google" | "apple"): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const auth = supabase.auth as unknown as {
    linkIdentity: (params: {
      provider: string;
      options: { redirectTo: string; skipBrowserRedirect: boolean };
    }) => Promise<{ data: { url: string | null }; error: Error | null }>;
  };

  if (typeof auth.linkIdentity !== "function") {
    throw new Error(
      "Upgrade required for social sign-in: npm install @supabase/supabase-js@latest",
    );
  }

  const { data, error } = await auth.linkIdentity({
    provider,
    options: { redirectTo: AUTH_REDIRECT, skipBrowserRedirect: true },
  });

  if (error) throw error;
  if (!data?.url) throw new Error("No OAuth URL returned from Supabase.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_REDIRECT);

  if (result.type === "success") {
    const code = extractCode(result.url);
    if (code) {
      const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
      if (codeError) throw codeError;
    }
  } else if (result.type === "cancel") {
    throw new Error("Sign-in was cancelled.");
  }
}

// Google: always uses browser OAuth via linkIdentity.
// The anonymous user is upgraded in place — same user ID, all profile and workout data is preserved.
export async function linkGoogleAccount(): Promise<void> {
  await linkIdentityOAuth("google");
}

// Apple: uses the native sign-in sheet on iOS (required by App Store guidelines).
// On non-iOS falls back to browser OAuth via linkIdentity.
//
// Note: native Apple Sign In calls signInWithIdToken which may create a new Supabase user
// if the Apple account hasn't been seen before. If that happens and a profileSnapshot is
// provided, the anonymous user's profile is automatically copied to the new account.
export async function linkAppleAccount(
  profileSnapshot?: { userId: string; profile: OnboardingProfile },
): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");

  if (Platform.OS !== "ios") {
    await linkIdentityOAuth("apple");
    return;
  }

  // Dynamic import keeps expo-apple-authentication out of non-iOS bundles.
  const AppleAuthentication = await import("expo-apple-authentication");

  let credential: Awaited<ReturnType<typeof AppleAuthentication.signInAsync>>;

  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (err: unknown) {
    const code = (err as Record<string, unknown>)?.code;
    if (code === "ERR_CANCELED") throw new Error("Sign-in was cancelled.");
    throw err;
  }

  if (!credential.identityToken) {
    throw new Error("Apple Sign In did not return an identity token.");
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
  });

  if (error) throw error;

  if (profileSnapshot) {
    await migrateProfileIfUserChanged(profileSnapshot.userId, profileSnapshot.profile);
  }
}

// If Apple Sign In created a new user (different ID from the anonymous session),
// copy the anonymous user's profile to the new account so no data is lost.
async function migrateProfileIfUserChanged(
  previousUserId: string,
  profile: OnboardingProfile,
): Promise<void> {
  if (!supabase) return;

  const { data } = await supabase.auth.getSession();
  const newUserId = data.session?.user?.id;

  if (!newUserId || newUserId === previousUserId) return;

  const { data: existing } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", newUserId)
    .maybeSingle();

  // Don't overwrite if the Apple account already has a completed profile.
  if (existing?.onboarding_completed) return;

  await supabase
    .from("profiles")
    .upsert(
      mapProfileToSupabaseRow(newUserId, profile, true) as Record<string, unknown>,
      { onConflict: "id" },
    );
}

export interface SessionStatus {
  isAnonymous: boolean;
  userId: string | null;
  email: string | null;
  provider: string | null;
}

export async function getSessionStatus(): Promise<SessionStatus> {
  if (!supabase) return { isAnonymous: true, userId: null, email: null, provider: null };

  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;

  if (!user) return { isAnonymous: true, userId: null, email: null, provider: null };

  return {
    isAnonymous: (user as unknown as { is_anonymous?: boolean }).is_anonymous === true,
    userId: user.id,
    email: user.email ?? null,
    provider: (user.app_metadata?.provider as string | undefined) ?? null,
  };
}
