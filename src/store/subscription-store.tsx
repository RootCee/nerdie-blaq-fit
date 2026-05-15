import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
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

interface SubscriptionStoreValue {
  status: SubscriptionStatus;
  isPro: boolean;
  isPremiumOverride: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  offering: PurchasesOffering | null;
  proPackage: PurchasesPackage | null;
  error: string | null;
  purchasePro: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionStoreContext = createContext<SubscriptionStoreValue | null>(null);

const CONFIGURING_SUBSCRIPTION_MESSAGE = "Subscription is being configured. Please try again soon.";

let hasConfiguredPurchases = false;

function canUseRevenueCat() {
  return Platform.OS !== "web" && getRevenueCatConfig().isConfigured && hasConfiguredPurchases;
}

function hasProEntitlement(customerInfo: CustomerInfo | null) {
  return customerInfo?.entitlements.active[REVENUECAT_ENTITLEMENT_ID]?.isActive === true;
}

function findProPackage(offering: PurchasesOffering | null) {
  return (
    offering?.availablePackages.find(
      (item) => item.product.identifier === REVENUECAT_PRODUCT_ID,
    ) ??
    offering?.monthly ??
    offering?.availablePackages[0] ??
    null
  );
}

function logRevenueCatOfferings(offerings: PurchasesOfferings) {
  if (!__DEV__) {
    return;
  }

  const offeringEntries = Object.values(offerings.all);
  const availablePackages = offeringEntries.flatMap((entry) => entry.availablePackages);

  console.log("[subscription] RevenueCat offerings returned", {
    offeringIdentifiers: offeringEntries.map((entry) => entry.identifier),
    offeringCount: offeringEntries.length,
  });
  console.log("[subscription] RevenueCat current offering identifier", offerings.current?.identifier ?? null);
  console.log(
    "[subscription] RevenueCat available packages",
    availablePackages.map((entry) => ({
      offeringIdentifier: entry.presentedOfferingContext.offeringIdentifier,
      packageIdentifier: entry.identifier,
    })),
  );
  console.log(
    "[subscription] RevenueCat product identifiers",
    availablePackages.map((entry) => entry.product.identifier),
  );
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
    await Purchases.logIn(userId);
  }
}

export function SubscriptionProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<SubscriptionStatus>("loading");
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [isPremiumOverride, setIsPremiumOverride] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (!hasConfiguredPurchases) {
        await Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);
        Purchases.configure({ apiKey: revenueCatConfig.apiKey });
        hasConfiguredPurchases = true;
      }

      await identifyRevenueCatUser();

      const [nextCustomerInfo, nextOfferings] = await Promise.all([
        Purchases.getCustomerInfo(),
        Purchases.getOfferings(),
      ]);

      logRevenueCatOfferings(nextOfferings);
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

    const listener = (nextCustomerInfo: CustomerInfo) => {
      setCustomerInfo(nextCustomerInfo);
    };

    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [refreshSubscription]);

  const proPackage = useMemo(() => findProPackage(offering), [offering]);
  const isPro = isPremiumOverride || hasProEntitlement(customerInfo);

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
    setError(null);

    try {
      const result = await Purchases.purchasePackage(proPackage);
      setCustomerInfo(result.customerInfo);
    } catch (purchaseError) {
      if (!(purchaseError as { userCancelled?: boolean }).userCancelled) {
        setError(purchaseError instanceof Error ? purchaseError.message : "Purchase did not complete.");
        throw purchaseError;
      }
    } finally {
      setIsPurchasing(false);
    }
  }, [proPackage]);

  const restorePurchases = useCallback(async () => {
    if (!canUseRevenueCat()) {
      setError(`RevenueCat is not configured yet. Add ${getRevenueCatApiKeyName()} before restoring purchases.`);
      return;
    }

    setIsRestoring(true);
    setError(null);

    try {
      const restoredInfo = await Purchases.restorePurchases();
      setCustomerInfo(restoredInfo);
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : "Restore did not complete.");
      throw restoreError;
    } finally {
      setIsRestoring(false);
    }
  }, []);

  const value = useMemo<SubscriptionStoreValue>(
    () => ({
      status,
      isPro,
      isPremiumOverride,
      isPurchasing,
      isRestoring,
      offering,
      proPackage,
      error,
      purchasePro,
      restorePurchases,
      refreshSubscription,
    }),
    [
      error,
      isPremiumOverride,
      isPro,
      isPurchasing,
      isRestoring,
      offering,
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
