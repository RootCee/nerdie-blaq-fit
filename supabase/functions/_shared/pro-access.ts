// @ts-nocheck
// Shared server-side Pro + quota checks for the AI Edge Functions.
//
// Pro is granted when either:
//   - profiles.is_premium_override = true (admin tester flag), or
//   - RevenueCat reports an active "pro" entitlement for the user.
//     The app logs RevenueCat in with the Supabase user id, so they match.
//
// Required secret for RevenueCat checks: REVENUECAT_SECRET_API_KEY (a RevenueCat
// secret API key, starts with "sk_"). If it is missing, the check is skipped
// (so paying users are never blocked by config) but daily caps still apply.

const REVENUECAT_ENTITLEMENT_ID = Deno.env.get("REVENUECAT_ENTITLEMENT_ID") ?? "pro";

export const DEFAULT_GEMINI_MODELS = "gemini-3.1-flash-lite,gemini-3.5-flash,gemini-2.5-flash";

export function getGeminiModels() {
  return (Deno.env.get("GEMINI_MODEL") ?? DEFAULT_GEMINI_MODELS)
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}

async function hasPremiumOverride(userClient, userId) {
  const { data, error } = await userClient
    .from("profiles")
    .select("is_premium_override")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return false;
  }

  return data?.is_premium_override === true;
}

async function hasRevenueCatPro(userId) {
  const secretKey = Deno.env.get("REVENUECAT_SECRET_API_KEY");

  if (!secretKey) {
    return { configured: false, isPro: false };
  }

  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    // Fail closed only on a definite answer; a RevenueCat outage should not
    // lock out paying users, so treat 5xx as "unknown" and allow.
    if (response.status >= 500) {
      return { configured: true, isPro: true };
    }

    return { configured: true, isPro: false };
  }

  const payload = await response.json();
  const entitlement = payload?.subscriber?.entitlements?.[REVENUECAT_ENTITLEMENT_ID];

  if (!entitlement) {
    return { configured: true, isPro: false };
  }

  const expiresDate = entitlement.expires_date;
  const isActive = !expiresDate || new Date(expiresDate).getTime() > Date.now();

  return { configured: true, isPro: isActive };
}

/**
 * Returns null when the request may proceed, or { error, status } to send back.
 */
export async function requireProAndQuota(userClient, userId, feature, dailyLimit) {
  const isOverride = await hasPremiumOverride(userClient, userId);

  if (!isOverride) {
    const revenueCat = await hasRevenueCatPro(userId).catch(() => ({ configured: true, isPro: true }));

    if (revenueCat.configured && !revenueCat.isPro) {
      return { error: "This is a Nerdie Blaq Fit Pro feature. Upgrade to Pro to use it.", status: 403 };
    }
  }

  const { data: withinLimit, error: quotaError } = await userClient.rpc("consume_ai_quota", {
    p_feature: feature,
    p_daily_limit: dailyLimit,
  });

  // If the quota function has not been migrated yet, do not break the feature.
  if (quotaError) {
    return null;
  }

  if (withinLimit === false) {
    return { error: "Daily AI limit reached. It resets at midnight UTC — you can still log manually.", status: 429 };
  }

  return null;
}
