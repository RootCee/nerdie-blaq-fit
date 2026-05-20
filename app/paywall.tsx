import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { getRevenueCatApiKeyName, REVENUECAT_PRODUCT_ID } from "@/lib/revenuecat";
import { useSubscription } from "@/store/subscription-store";
import { colors, spacing } from "@/theme";

const TERMS_URL = "https://nerdieblaq.xyz/terms";
const PRIVACY_URL = "https://nerdieblaq.xyz/privacy";

function formatFeatureName(feature: string | string[] | undefined) {
  const value = Array.isArray(feature) ? feature[0] : feature;

  if (!value) {
    return "Pro training, nutrition, calendar, and Apple Health features";
  }

  return value.replace(/-/g, " ");
}

export default function PaywallScreen() {
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const {
    status,
    isPro,
    isPremiumOverride,
    isPurchasing,
    isRestoring,
    purchaseActivationStatus,
    activationMessage,
    proPackage,
    error,
    purchasePro,
    restorePurchases,
  } = useSubscription();
  const [actionError, setActionError] = useState<string | null>(null);
  const isBusy = isPurchasing || isRestoring;
  const isActivating = purchaseActivationStatus === "activating";
  const hasPackage = Boolean(proPackage);
  const configurationMessage = "Subscription is being configured. Please try again soon.";
  const displayError = activationMessage
    ? actionError
    : !hasPackage && status === "ready" ? null : actionError ?? error;

  const handlePurchase = async () => {
    setActionError(null);

    try {
      await purchasePro();
    } catch (purchaseError) {
      setActionError(purchaseError instanceof Error ? purchaseError.message : "Purchase did not complete.");
    }
  };

  const handleRestore = async () => {
    setActionError(null);

    try {
      await restorePurchases();
    } catch (restoreError) {
      setActionError(restoreError instanceof Error ? restoreError.message : "Restore did not complete.");
    }
  };

  const openLegalUrl = async (url: string) => {
    setActionError(null);

    try {
      await Linking.openURL(url);
    } catch {
      setActionError("We couldn't open that link right now. Please try again.");
    }
  };

  return (
    <Screen title="Nerdie Blaq Fit Pro" subtitle={`Unlock ${formatFeatureName(feature)}.`}>
      <Pressable onPress={() => router.back()} style={styles.closeButton}>
        <Text style={styles.closeText}>Close</Text>
      </Pressable>

      <SectionCard title="Pro subscription" eyebrow="3-day free trial">
        <View style={styles.priceBlock}>
          <Text style={styles.price}>$9.99/month</Text>
          <Text style={styles.copy}>Start with a 3-day free trial. Cancel anytime in your Apple ID subscriptions.</Text>
        </View>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>Blaq Mass System v1</Text>
          <Text style={styles.featureItem}>Advanced program calendar</Text>
          <Text style={styles.featureItem}>Apple Health sync</Text>
          <Text style={styles.featureItem}>Advanced nutrition features</Text>
        </View>
        {status === "loading" ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.copy}>Checking subscription options.</Text>
          </View>
        ) : null}
        {isPurchasing || isActivating ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.copy}>{activationMessage ?? "Starting purchase..."}</Text>
          </View>
        ) : null}
        {isPremiumOverride ? (
          <Text style={styles.successText}>Tester premium override is active for this account.</Text>
        ) : null}
        {isPro ? <Text style={styles.successText}>{activationMessage ?? "Pro is active. You can return to the app."}</Text> : null}
        {status === "unconfigured" ? (
          <Text style={styles.errorText}>
            RevenueCat is not configured yet. Add {getRevenueCatApiKeyName()} before testing purchases.
          </Text>
        ) : null}
        {status === "ready" && !hasPackage ? (
          <Text style={styles.errorText}>{configurationMessage}</Text>
        ) : null}
        {activationMessage && purchaseActivationStatus === "timeout" ? (
          <Text style={styles.helperText}>{activationMessage}</Text>
        ) : null}
        {displayError ? <Text style={styles.errorText}>{displayError}</Text> : null}
        <PrimaryButton
          label={isActivating ? "Activating Pro..." : isPurchasing ? "Starting trial..." : "Start 3-Day Free Trial"}
          onPress={() => void handlePurchase()}
          disabled={isBusy || isPro || !hasPackage}
        />
        <PrimaryButton
          label={isRestoring ? "Restoring..." : "Restore Purchases"}
          onPress={() => void handleRestore()}
          variant="ghost"
          disabled={isBusy}
        />
        <Text style={styles.legalText}>
          Product ID: {proPackage?.product.identifier ?? REVENUECAT_PRODUCT_ID}. Payment is handled by Apple in-app purchase.
        </Text>
        <View style={styles.legalLinkRow}>
          <Pressable onPress={() => void openLegalUrl(TERMS_URL)} hitSlop={8}>
            <Text style={styles.legalLink}>Terms of Use</Text>
          </Pressable>
          <Text style={styles.legalText}>and</Text>
          <Pressable onPress={() => void openLegalUrl(PRIVACY_URL)} hitSlop={8}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </Pressable>
        </View>
        <Text style={styles.legalText}>
          By starting a trial or restoring purchases, you agree to the Terms of Use and acknowledge the Privacy Policy.
        </Text>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  closeText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  priceBlock: {
    gap: spacing.xs,
  },
  price: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "800",
  },
  copy: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  featureList: {
    gap: spacing.sm,
  },
  featureItem: {
    color: colors.primarySoft,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  successText: {
    color: colors.accentSoft,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  legalText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  legalLinkRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  legalLink: {
    color: colors.primarySoft,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 20,
    textDecorationLine: "underline",
  },
});
