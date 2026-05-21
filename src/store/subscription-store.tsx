import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesOfferings,
  PurchasesPackage,
} from "react-native-purchases";

import {
  getRevenueCatApiKeyName,
  getRevenueCatConfig,
  REVENUECAT_ENTITLEMENT_ID,
  REVENUECAT_PRODUCT_ID,
} from "@/lib/revenuecat";
import { ensureSupabaseSession, getOnboardingPersistenceConfig, supabase } from "@/lib/supabase";

type SubscriptionStatus = "loading" | "ready" | "unconfigured" | "error";
type PurchaseActivationStatus = "idle" | "purchasing" | "activating" | "active" | "timeout";

interface SubscriptionStoreValue {
  status: SubscriptionStatus;
  isPro: boolean;
  isPremiumOverride: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  purchaseActivationStatus: PurchaseActivationStatus;
  activationMessage: string | null;
  offering: PurchasesOffering | null;
  proPackage: PurchasesPackage | null;
  error: string | null;
  purchasePro: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionStoreContext = createContext<SubscriptionStoreValue | null>(null);

const CONFIGURING_SUBSCRIPTION_MESSAGE = "Subscription is being configured. Please try again soon.";
const PURCHASE_SYNC_TIMEOUT_MS = 30_000;
const PURCHASE_SYNC_POLL_MS = 2_000;
const PURCHASE_TIMEOUT_MESSAGE = "Purchase received. If Pro does not unlock automatically, tap Restore Purchases.";
const ACTIVATING_PRO_MESSAGE = "Activating Pro... this may take a few seconds";
const PRO_ACTIVE_MESSAGE = "Pro is active. You can return to the app.";

let hasConfiguredPurchases = false;
let configurePurchasesPromise: Promise<boolean> | null = null;

function canUseRevenueCat() {
  return Platform.OS !== "web" && getRevenueCatConfig().isConfigured;
}

function hasProEntitlement(customerInfo: CustomerInfo | null) {
  return customerInfo?.entitlements.active[REVENUECAT_ENTITLEMENT_ID]?.isActive === true;
}

function hasProProductSubscription(customerInfo: CustomerInfo | null) {
  return customerInfo?.activeSubscriptions.includes(REVENUECAT_PRODUCT_ID) === true;
}

function hasProAccess(customerInfo: CustomerInfo | null) {
  return hasProEntitlement(customerInfo) || hasProProductSubscription(customerInfo);
}

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function findProPackage(offering: PurchasesOffering | null) {
  return offering?.availablePackages.find((item) => item.product.identifier === REVENUECAT_PRODUCT_ID) ?? null;
}

function getPackageDebugInfo(pkg: PurchasesPackage | null) {
  if (!pkg) {
    return null;
  }

  return {
    productId: pkg.product.identifier,
    packageIdentifier: pkg.identifier,
    offeringIdentifier: pkg.presentedOfferingContext.offeringIdentifier,
    isConfiguredProduct: pkg.product.identifier === REVENUECAT_PRODUCT_ID,
  };
}

function getCustomerInfoDebugInfo(customerInfo: CustomerInfo | null) {
  if (!customerInfo) {
    return null;
  }

  const entitlementIds = Object.keys(customerInfo.entitlements.all);
  const activeEntitlementIds = Object.keys(customerInfo.entitlements.active);

  return {
    originalAppUserId: customerInfo.originalAppUserId,
    entitlementIds,
    activeEntitlementIds,
    activeSubscriptions: customerInfo.activeSubscriptions,
    allPurchasedProductIdentifiers: customerInfo.allPurchasedProductIdentifiers,
    latestExpirationDate: customerInfo.latestExpirationDate,
    configuredProductExpirationDate: customerInfo.allExpirationDates[REVENUECAT_PRODUCT_ID] ?? null,
    hasProEntitlementKey: entitlementIds.includes(REVENUECAT_ENTITLEMENT_ID),
    hasActiveProEntitlement: hasProEntitlement(customerInfo),
    hasConfiguredProductSubscription: hasProProductSubscription(customerInfo),
    hasProAccess: hasProAccess(customerInfo),
  };
}

function logSubscriptionDebug(label: string, payload: Record<string, unknown>) {
  console.log(`[subscription-debug] ${label}`, {
    expectedEntitlementId: REVENUECAT_ENTITLEMENT_ID,
    expectedProductId: REVENUECAT_PRODUCT_ID,
    ...payload,
  });
}

async function getRevenueCatAppUserId() {
  try {
    return await Purchases.getAppUserID();
  } catch (error) {
    console.warn("[subscription-debug] Unable to read RevenueCat app user ID.", error);
    return null;
  }
}

async function getFreshCustomerInfo(debugLabel: string) {
  try {
    await Purchases.invalidateCustomerInfoCache();
  } catch (error) {
    console.warn(`[subscription-debug] Unable to invalidate customer info cache for ${debugLabel}.`, error);
  }

  return Purchases.getCustomerInfo();
}

function logProductFallbackIfNeeded(label: string, customerInfo: CustomerInfo) {
  if (hasProProductSubscription(customerInfo) && !hasProEntitlement(customerInfo)) {
    logSubscriptionDebug(`${label} product subscription active without pro entitlement`, {
      customerInfo: getCustomerInfoDebugInfo(customerInfo),
      dashboardCheck: `Attach ${REVENUECAT_PRODUCT_ID} to RevenueCat entitlement ${REVENUECAT_ENTITLEMENT_ID}.`,
    });
  }
}

function logRevenueCatOfferings(offerings: PurchasesOfferings) {
  const offeringEntries = Object.values(offerings.all);
  const availablePackages = offeringEntries.flatMap((entry) => entry.availablePackages);

  logSubscriptionDebug("offerings", {
    offeringIdentifiers: offeringEntries.map((entry) => entry.identifier),
    offeringCount: offeringEntries.length,
    currentOfferingIdentifier: offerings.current?.identifier ?? null,
    monthlyPackage: getPackageDebugInfo(offerings.current?.monthly ?? null),
    selectedConfiguredPackage: getPackageDebugInfo(findProPackage(offerings.current ?? null)),
    availablePackages: availablePackages.map((entry) => ({
      offeringIdentifier: entry.presentedOfferingContext.offeringIdentifier,
      packageIdentifier: entry.identifier,
      productId: entry.product.identifier,
      isConfiguredProduct: entry.product.identifier === REVENUECAT_PRODUCT_ID,
    })),
  });
}

async function configureRevenueCatIfNeeded() {
  const revenueCatConfig = getRevenueCatConfig();

  if (Platform.OS === "web" || !revenueCatConfig.isConfigured) {
    return false;
  }

  if (hasConfiguredPurchases) {
    return true;
  }

  if (!configurePurchasesPromise) {
    configurePurchasesPromise = (async () => {
      if (hasConfiguredPurchases) {
        return true;
      }

      await Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);
      Purchases.configure({ apiKey: revenueCatConfig.apiKey });
      hasConfiguredPurchases = true;
      logSubscriptionDebug("configured", {
        platform: Platform.OS,
        appUserId: await getRevenueCatAppUserId(),
      });
      return true;
    })().catch((error) => {
      configurePurchasesPromise = null;
      throw error;
    });
  }

  return configurePurchasesPromise;
}

async function getPremiumOverride() {
  const persistenceConfig = getOnboardingPersistenceConfig();

  if (!persistenceConfig.isConfigured || !supabase) {
    return false;
  }

  const session = await ensureSupabaseSession();
  const userId = session?.user?.id;

  if (!userId) {
    return false;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("is_premium_override")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (error.code === "42703" || error.message.toLowerCase().includes("is_premium_override")) {
      console.warn("[subscription] premium override column is not available yet. Defaulting to free access.");
      return false;
    }

    console.warn("[subscription] premium override lookup failed.", error.message);
    return false;
  }

  return (data as { is_premium_override?: boolean | null } | null)?.is_premium_override === true;
}

async function identifyRevenueCatUser() {
  const persistenceConfig = getOnboardingPersistenceConfig();

  if (!persistenceConfig.isConfigured || !supabase) {
    return;
  }

  const session = await ensureSupabaseSession();
  const userId = session?.user?.id;

  if (userId) {
    const previousAppUserId = await getRevenueCatAppUserId();

    if (previousAppUserId === userId) {
      return;
    }

    const loginResult = await Purchases.logIn(userId);
    logSubscriptionDebug("identified app user", {
      previousAppUserId,
      requestedUserId: userId,
      currentAppUserId: await getRevenueCatAppUserId(),
      created: loginResult.created,
      customerInfo: getCustomerInfoDebugInfo(loginResult.customerInfo),
    });
  }
}

export function SubscriptionProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<SubscriptionStatus>("loading");
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [isPremiumOverride, setIsPremiumOverride] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [purchaseActivationStatus, setPurchaseActivationStatus] = useState<PurchaseActivationStatus>("idle");
  const [activationMessage, setActivationMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const purchaseOperationInFlightRef = useRef(false);

  const refreshSubscription = useCallback(async () => {
    const revenueCatConfig = getRevenueCatConfig();
    const nextPremiumOverride = await getPremiumOverride().catch(() => false);

    setIsPremiumOverride(nextPremiumOverride);

    if (nextPremiumOverride) {
      setStatus("ready");
      setError(null);
      return;
    }

    if (Platform.OS === "web" || !revenueCatConfig.isConfigured) {
      setStatus("unconfigured");
      setError(null);
      return;
    }

    setStatus((current) => (current === "ready" ? current : "loading"));

    try {
      await configureRevenueCatIfNeeded();

      await identifyRevenueCatUser();

      const appUserId = await getRevenueCatAppUserId();
      const [nextCustomerInfo, nextOfferings] = await Promise.all([
        Purchases.getCustomerInfo(),
        Purchases.getOfferings(),
      ]);

      logRevenueCatOfferings(nextOfferings);
      logSubscriptionDebug("refresh customerInfo", {
        appUserId,
        customerInfo: getCustomerInfoDebugInfo(nextCustomerInfo),
      });
      logProductFallbackIfNeeded("refresh", nextCustomerInfo);
      setCustomerInfo(nextCustomerInfo);
      setOffering(nextOfferings.current ?? null);
      setError(findProPackage(nextOfferings.current ?? null) ? null : CONFIGURING_SUBSCRIPTION_MESSAGE);
      setStatus("ready");
    } catch (subscriptionError) {
      setError(subscriptionError instanceof Error ? subscriptionError.message : "Subscription status is unavailable.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void refreshSubscription();

    if (Platform.OS === "web" || !getRevenueCatConfig().isConfigured) {
      return;
    }

    let isMounted = true;
    let isListenerRegistered = false;
    const listener = (nextCustomerInfo: CustomerInfo) => {
      logSubscriptionDebug("listener customerInfo update", {
        customerInfo: getCustomerInfoDebugInfo(nextCustomerInfo),
      });
      setCustomerInfo(nextCustomerInfo);
      logProductFallbackIfNeeded("listener", nextCustomerInfo);
      if (hasProAccess(nextCustomerInfo)) {
        setPurchaseActivationStatus("active");
        setActivationMessage(PRO_ACTIVE_MESSAGE);
        setError(null);
      }
    };

    void configureRevenueCatIfNeeded()
      .then((isConfigured) => {
        if (!isMounted || !isConfigured) {
          return;
        }

        Purchases.addCustomerInfoUpdateListener(listener);
        isListenerRegistered = true;
      })
      .catch((listenerError) => {
        console.warn("[subscription-debug] Unable to register customer info listener.", listenerError);
      });

    return () => {
      isMounted = false;
      if (isListenerRegistered) {
        Purchases.removeCustomerInfoUpdateListener(listener);
      }
    };
  }, [refreshSubscription]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        if (purchaseOperationInFlightRef.current) {
          logSubscriptionDebug("foreground refresh skipped during purchase operation", {});
          return;
        }

        void refreshSubscription();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshSubscription]);

  const proPackage = useMemo(() => findProPackage(offering), [offering]);
  const isPro = isPremiumOverride || hasProAccess(customerInfo);

  const refreshUntilProIsActive = useCallback(async () => {
    const startedAt = Date.now();
    let attempt = 1;

    while (Date.now() - startedAt <= PURCHASE_SYNC_TIMEOUT_MS) {
      const nextCustomerInfo = await getFreshCustomerInfo(`poll attempt ${attempt}`);
      setCustomerInfo(nextCustomerInfo);
      logSubscriptionDebug("poll customerInfo", {
        attempt,
        elapsedMs: Date.now() - startedAt,
        appUserId: await getRevenueCatAppUserId(),
        customerInfo: getCustomerInfoDebugInfo(nextCustomerInfo),
      });
      logProductFallbackIfNeeded("poll", nextCustomerInfo);

      if (hasProAccess(nextCustomerInfo)) {
        setPurchaseActivationStatus("active");
        setActivationMessage(PRO_ACTIVE_MESSAGE);
        setError(null);
        return true;
      }

      attempt += 1;
      await wait(PURCHASE_SYNC_POLL_MS);
    }

    setPurchaseActivationStatus("timeout");
    setActivationMessage(PURCHASE_TIMEOUT_MESSAGE);
    setError(PURCHASE_TIMEOUT_MESSAGE);
    return false;
  }, []);

  const purchasePro = useCallback(async () => {
    if (!canUseRevenueCat()) {
      setError(`RevenueCat is not configured yet. Add ${getRevenueCatApiKeyName()} before testing purchases.`);
      return;
    }

    if (!proPackage) {
      setError(CONFIGURING_SUBSCRIPTION_MESSAGE);
      return;
    }

    setIsPurchasing(true);
    purchaseOperationInFlightRef.current = true;
    setPurchaseActivationStatus("purchasing");
    setActivationMessage(ACTIVATING_PRO_MESSAGE);
    setError(null);

    try {
      await configureRevenueCatIfNeeded();
      const appUserIdBeforePurchase = await getRevenueCatAppUserId();
      logSubscriptionDebug("purchase starting", {
        appUserId: appUserIdBeforePurchase,
        package: getPackageDebugInfo(proPackage),
        isIntendedMonthlyPackage: proPackage.product.identifier === REVENUECAT_PRODUCT_ID,
      });

      const result = await Purchases.purchasePackage(proPackage);
      setCustomerInfo(result.customerInfo);
      logSubscriptionDebug("purchase result customerInfo", {
        appUserId: await getRevenueCatAppUserId(),
        package: getPackageDebugInfo(proPackage),
        customerInfo: getCustomerInfoDebugInfo(result.customerInfo),
      });
      logProductFallbackIfNeeded("purchase result", result.customerInfo);

      if (hasProAccess(result.customerInfo)) {
        setPurchaseActivationStatus("active");
        setActivationMessage(PRO_ACTIVE_MESSAGE);
        setError(null);
        return;
      }

      setPurchaseActivationStatus("activating");
      setActivationMessage(ACTIVATING_PRO_MESSAGE);
      const forcedCustomerInfo = await getFreshCustomerInfo("post-purchase");
      setCustomerInfo(forcedCustomerInfo);
      logSubscriptionDebug("post-purchase forced customerInfo", {
        appUserId: await getRevenueCatAppUserId(),
        customerInfo: getCustomerInfoDebugInfo(forcedCustomerInfo),
      });
      logProductFallbackIfNeeded("post-purchase", forcedCustomerInfo);

      if (hasProAccess(forcedCustomerInfo)) {
        setPurchaseActivationStatus("active");
        setActivationMessage(PRO_ACTIVE_MESSAGE);
        setError(null);
        return;
      }

      await refreshUntilProIsActive();
    } catch (purchaseError) {
      if (!(purchaseError as { userCancelled?: boolean }).userCancelled) {
        setPurchaseActivationStatus("idle");
        setActivationMessage(null);
        console.warn("[subscription-debug] RevenueCat purchase failed.", purchaseError);
        setError(purchaseError instanceof Error ? purchaseError.message : "Purchase did not complete.");
        throw purchaseError;
      }
      setPurchaseActivationStatus("idle");
      setActivationMessage(null);
      setError("Purchase canceled");
    } finally {
      setIsPurchasing(false);
      purchaseOperationInFlightRef.current = false;
    }
  }, [proPackage, refreshUntilProIsActive]);

  const restorePurchases = useCallback(async () => {
    if (!canUseRevenueCat()) {
      setError(`RevenueCat is not configured yet. Add ${getRevenueCatApiKeyName()} before restoring purchases.`);
      return;
    }

    setIsRestoring(true);
    purchaseOperationInFlightRef.current = true;
    setPurchaseActivationStatus("activating");
    setActivationMessage(ACTIVATING_PRO_MESSAGE);
    setError(null);

    try {
      await configureRevenueCatIfNeeded();
      logSubscriptionDebug("restore starting", {
        appUserId: await getRevenueCatAppUserId(),
      });
      const restoredInfo = await Purchases.restorePurchases();
      setCustomerInfo(restoredInfo);
      logSubscriptionDebug("restore result customerInfo", {
        appUserId: await getRevenueCatAppUserId(),
        customerInfo: getCustomerInfoDebugInfo(restoredInfo),
      });
      logProductFallbackIfNeeded("restore result", restoredInfo);

      if (hasProAccess(restoredInfo)) {
        setPurchaseActivationStatus("active");
        setActivationMessage(PRO_ACTIVE_MESSAGE);
        setError(null);
        return;
      }

      const forcedCustomerInfo = await getFreshCustomerInfo("post-restore");
      setCustomerInfo(forcedCustomerInfo);
      logSubscriptionDebug("post-restore forced customerInfo", {
        appUserId: await getRevenueCatAppUserId(),
        customerInfo: getCustomerInfoDebugInfo(forcedCustomerInfo),
      });
      logProductFallbackIfNeeded("post-restore", forcedCustomerInfo);

      if (hasProAccess(forcedCustomerInfo)) {
        setPurchaseActivationStatus("active");
        setActivationMessage(PRO_ACTIVE_MESSAGE);
        setError(null);
        return;
      }

      await refreshUntilProIsActive();
    } catch (restoreError) {
      setPurchaseActivationStatus("idle");
      setActivationMessage(null);
      console.warn("[subscription-debug] RevenueCat restore failed.", restoreError);
      setError(restoreError instanceof Error ? restoreError.message : "Restore did not complete.");
      throw restoreError;
    } finally {
      setIsRestoring(false);
      purchaseOperationInFlightRef.current = false;
    }
  }, [refreshUntilProIsActive]);

  const value = useMemo<SubscriptionStoreValue>(
    () => ({
      status,
      isPro,
      isPremiumOverride,
      isPurchasing,
      isRestoring,
      purchaseActivationStatus,
      activationMessage,
      offering,
      proPackage,
      error,
      purchasePro,
      restorePurchases,
      refreshSubscription,
    }),
    [
      error,
      activationMessage,
      isPremiumOverride,
      isPro,
      isPurchasing,
      isRestoring,
      offering,
      purchaseActivationStatus,
      proPackage,
      purchasePro,
      refreshSubscription,
      restorePurchases,
      status,
    ],
  );

  return <SubscriptionStoreContext.Provider value={value}>{children}</SubscriptionStoreContext.Provider>;
}

export function useSubscription() {
  const context = useContext(SubscriptionStoreContext);

  if (!context) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }

  return context;
}
