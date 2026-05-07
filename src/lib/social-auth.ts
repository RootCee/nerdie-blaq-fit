import * as WebBrowser from "expo-web-browser";

import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

const AUTH_REDIRECT = "nerdieblaqfit://auth/callback";
const callbackExchangePromises = new Map<string, Promise<SessionStatus | null>>();

class IdentityAlreadyLinkedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdentityAlreadyLinkedError";
  }
}

interface AuthIdentity {
  provider?: string | null;
  identity_data?: {
    email?: string | null;
  } | null;
}

interface AuthUserStatusSource {
  id: string;
  email?: string | null;
  is_anonymous?: boolean | null;
  identities?: AuthIdentity[] | null;
  app_metadata?: {
    provider?: string | null;
    providers?: string[] | null;
  } | null;
}

function extractCallbackParams(url: string) {
  const [, queryString = ""] = url.split("?");
  const [, hashString = ""] = url.split("#");
  const params = new URLSearchParams(queryString);
  const hashParams = new URLSearchParams(hashString);

  return {
    code: params.get("code") ?? hashParams.get("code"),
    accessToken: params.get("access_token") ?? hashParams.get("access_token"),
    refreshToken: params.get("refresh_token") ?? hashParams.get("refresh_token"),
    error: params.get("error") ?? hashParams.get("error"),
    errorDescription: params.get("error_description") ?? hashParams.get("error_description"),
  };
}

function getIdentityProviders(user: AuthUserStatusSource | null | undefined) {
  return (user?.identities ?? [])
    .map((identity) => identity.provider)
    .filter((identityProvider): identityProvider is string => Boolean(identityProvider));
}

function getMetadataProviders(user: AuthUserStatusSource | null | undefined) {
  const providers = user?.app_metadata?.providers;
  return Array.isArray(providers)
    ? providers.filter((metadataProvider): metadataProvider is string => Boolean(metadataProvider))
    : [];
}

function getConnectedProvider(user: AuthUserStatusSource | null | undefined) {
  const identityProvider = getIdentityProviders(user).find(
    (provider) => provider === "google" || provider === "apple",
  );

  if (identityProvider) {
    return identityProvider;
  }

  const metadataProvider = user?.app_metadata?.provider;
  if (metadataProvider === "google" || metadataProvider === "apple") {
    return metadataProvider;
  }

  return getMetadataProviders(user).find((provider) => provider === "google" || provider === "apple") ?? null;
}

function buildSessionStatus(user: AuthUserStatusSource): SessionStatus {
  const provider = getConnectedProvider(user);
  const socialIdentity = (user.identities ?? []).find((identity) => identity.provider === provider);

  return {
    isAnonymous: user.is_anonymous === true && !provider,
    userId: user.id,
    email: user.email ?? socialIdentity?.identity_data?.email ?? null,
    provider,
  };
}

export function getAuthRedirectUrl() {
  return AUTH_REDIRECT;
}

export function isIdentityAlreadyLinkedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return error instanceof IdentityAlreadyLinkedError
    || message.toLowerCase().includes("identity is already linked");
}

export async function handleAuthCallbackUrl(url: string): Promise<SessionStatus | null> {
  const client = supabase;

  if (!client) {
    console.log("[social-auth] callback ignored because Supabase is not configured.");
    return null;
  }

  if (!url.startsWith(AUTH_REDIRECT)) {
    return null;
  }

  const { code, accessToken, refreshToken, error, errorDescription } = extractCallbackParams(url);
  console.log(`[social-auth] callback URL received: ${url}`);
  console.log(`[social-auth] callback code present: ${Boolean(code)}`);
  console.log(`[social-auth] callback tokens present: ${Boolean(accessToken && refreshToken)}`);

  if (error) {
    const message = errorDescription ?? error;
    if (message.toLowerCase().includes("identity is already linked")) {
      throw new IdentityAlreadyLinkedError(message);
    }

    throw new Error(message);
  }

  if (!code && (!accessToken || !refreshToken)) {
    return null;
  }

  const callbackKey = code ?? `${accessToken}:${refreshToken}`;
  const existingExchange = callbackExchangePromises.get(callbackKey);
  if (existingExchange) {
    return existingExchange;
  }

  const exchangePromise = (async () => {
    const { data: sessionData, error: codeError } = code
      ? await client.auth.exchangeCodeForSession(code)
      : await client.auth.setSession({
          access_token: accessToken as string,
          refresh_token: refreshToken as string,
        });

    if (codeError) {
      console.error("[social-auth] callback session exchange failed:", codeError.message);
      throw codeError;
    }

    const exchangedUser = sessionData.session?.user;
    console.log("[social-auth] callback session exchange succeeded.", {
      userId: exchangedUser?.id ?? "none",
      email: exchangedUser?.email ?? "none",
      is_anonymous: exchangedUser?.is_anonymous,
      identities: getIdentityProviders(exchangedUser),
      providers: getMetadataProviders(exchangedUser),
    });

    const {
      data: { session },
      error: sessionError,
    } = await client.auth.getSession();

    if (sessionError) {
      console.error("[social-auth] getSession post-exchange failed:", sessionError.message);
      throw sessionError;
    }

    console.log("[social-auth] getSession post-exchange.", {
      userId: session?.user?.id ?? "none",
      email: session?.user?.email ?? "none",
      is_anonymous: session?.user?.is_anonymous,
      identities: getIdentityProviders(session?.user),
      providers: getMetadataProviders(session?.user),
    });

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      console.error("[social-auth] getUser post-exchange failed:", userError?.message ?? "no user");
      throw userError ?? new Error("Supabase did not return a user after OAuth callback.");
    }

    console.log("[social-auth] getUser post-exchange.", {
      userId: user.id,
      email: user.email ?? "none",
      is_anonymous: user.is_anonymous,
      identities: getIdentityProviders(user),
      provider: user.app_metadata?.provider ?? "none",
      providers: getMetadataProviders(user),
    });

    return buildSessionStatus(user);
  })();

  callbackExchangePromises.set(callbackKey, exchangePromise);

  try {
    return await exchangePromise;
  } finally {
    callbackExchangePromises.delete(callbackKey);
  }
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

  console.log(`[social-auth] OAuth provider selected: ${provider}`);
  console.log(`[social-auth] redirectTo used: ${AUTH_REDIRECT}`);
  console.log(`[social-auth] opening browser for provider: ${provider}`);
  const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_REDIRECT);
  console.log(`[social-auth] browser result type: ${result.type}`);

  if (result.type === "success") {
    await handleAuthCallbackUrl(result.url);
  } else if (result.type === "cancel") {
    throw new Error("Sign-in was cancelled.");
  }
}

async function signInExistingOAuth(provider: "google" | "apple"): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: AUTH_REDIRECT,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error("No OAuth URL returned from Supabase.");

  console.log(`[social-auth] existing OAuth sign-in provider selected: ${provider}`);
  console.log(`[social-auth] existing OAuth redirectTo used: ${AUTH_REDIRECT}`);
  const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_REDIRECT);
  console.log(`[social-auth] existing OAuth browser result type: ${result.type}`);

  if (result.type === "success") {
    await handleAuthCallbackUrl(result.url);
  } else if (result.type === "cancel") {
    throw new Error("Sign-in was cancelled.");
  }
}

async function linkOrSignInOAuth(provider: "google" | "apple"): Promise<void> {
  try {
    await linkIdentityOAuth(provider);
  } catch (error) {
    if (!isIdentityAlreadyLinkedError(error)) {
      throw error;
    }

    console.log(`[social-auth] ${provider} identity already linked to another user; signing into existing account.`);
    await signInExistingOAuth(provider);
  }
}

// Google: always uses browser OAuth via linkIdentity.
// The anonymous user is upgraded in place — same user ID, all profile and workout data is preserved.
export async function linkGoogleAccount(): Promise<void> {
  await linkOrSignInOAuth("google");
}

// Apple: use Supabase OAuth/linkIdentity on every platform so the Apple audience
// matches the configured Services ID and the anonymous user is upgraded in place.
export async function linkAppleAccount(
  _profileSnapshot?: unknown,
): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");
  await linkOrSignInOAuth("apple");
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

  const status = buildSessionStatus(user);

  console.log("[social-auth] status:", {
    userId: user.id,
    email: status.email,
    isAnonymous: status.isAnonymous,
    provider: status.provider,
    identities: getIdentityProviders(user),
    providers: getMetadataProviders(user),
  });

  return status;
}
