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

  console.log(`[social-auth] opening browser for provider: ${provider}`);
  const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_REDIRECT);
  console.log(`[social-auth] browser result type: ${result.type}`);

  if (result.type === "success") {
    const code = extractCode(result.url);
    console.log(`[social-auth] callback received — provider: ${provider}, code present: ${Boolean(code)}`);
    if (code) {
      const { data: sessionData, error: codeError } = await supabase.auth.exchangeCodeForSession(code);
      if (codeError) throw codeError;

      const exchangedUser = sessionData.session?.user;
      console.log(`[social-auth] exchangeCodeForSession — userId: ${exchangedUser?.id ?? "none"}`);
      console.log(`[social-auth] exchangeCodeForSession — email: ${exchangedUser?.email ?? "none"}`);
      console.log(`[social-auth] exchangeCodeForSession — is_anonymous: ${exchangedUser?.is_anonymous}`);
      console.log(`[social-auth] exchangeCodeForSession — identities: ${JSON.stringify((exchangedUser?.identities ?? []).map((id) => id.provider))}`);

      // Force-refresh local session cache so the next getUser() call
      // sends the newly-issued access token rather than a stale one.
      const { data: { session: refreshedSession } } = await supabase.auth.getSession();
      console.log(`[social-auth] getSession post-exchange — userId: ${refreshedSession?.user?.id ?? "none"}`);

      // Authoritative server-side state — reflects the linked identity.
      const { data: { user: serverUser } } = await supabase.auth.getUser();
      console.log(`[social-auth] getUser post-exchange — is_anonymous: ${serverUser?.is_anonymous}`);
      console.log(`[social-auth] getUser post-exchange — identities: ${JSON.stringify((serverUser?.identities ?? []).map((id) => id.provider))}`);
      console.log(`[social-auth] getUser post-exchange — provider: ${serverUser?.app_metadata?.provider as string | undefined ?? "none"}`);
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

  // Step 1: refresh local session cache (resolves AsyncStorage write before server call).
  const { data: { session } } = await supabase.auth.getSession();
  console.log(`[social-auth] getSessionStatus — local session userId: ${session?.user?.id ?? "none"}, is_anonymous: ${session?.user?.is_anonymous}`);

  // Step 2: getUser() fetches authoritative state from the server — is_anonymous and
  // identities reflect the post-link state rather than stale cached JWT claims.
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    console.log("[social-auth] getUser returned no user:", error?.message ?? "no user");
    return { isAnonymous: true, userId: null, email: null, provider: null };
  }

  const identities = user.identities ?? [];
  // A social identity is any provider other than the anonymous placeholder.
  const socialIdentity = identities.find(
    (id) => id.provider !== "anonymous" && id.provider !== "email",
  );

  // Prefer the linked social identity's provider; fall back to app_metadata.provider.
  const provider =
    socialIdentity?.provider ??
    (user.app_metadata?.provider as string | undefined) ??
    null;

  // Anonymous only when the server confirms it AND no social identity is attached.
  const isAnonymous = user.is_anonymous === true && !socialIdentity;

  const email =
    user.email ??
    (socialIdentity?.identity_data?.email as string | undefined) ??
    null;

  console.log("[social-auth] status:", {
    userId: user.id,
    email,
    isAnonymous,
    provider,
    identities: identities.map((id) => id.provider),
  });

  return { isAnonymous, userId: user.id, email, provider };
}
