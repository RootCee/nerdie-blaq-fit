import * as WebBrowser from "expo-web-browser";

import { supabase } from "@/lib/supabase";

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

// Apple: use Supabase OAuth/linkIdentity on every platform so the Apple audience
// matches the configured Services ID and the anonymous user is upgraded in place.
export async function linkAppleAccount(
  _profileSnapshot?: unknown,
): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");
  await linkIdentityOAuth("apple");
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
