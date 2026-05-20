import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { useSubscription } from "@/store/subscription-store";
import { colors, spacing } from "@/theme";

interface ProLockCardProps {
  title: string;
  eyebrow?: string;
  description: string;
  feature?: string;
}

export function ProLockCard({ title, eyebrow = "Pro", description, feature }: ProLockCardProps) {
  const { isPro, isPurchasing, purchaseActivationStatus, activationMessage } = useSubscription();
  const isActivating = isPurchasing || purchaseActivationStatus === "activating";

  return (
    <SectionCard title={title} eyebrow={eyebrow}>
      <View style={styles.content}>
        <Text style={styles.copy}>{description}</Text>
        {isPro ? (
          <Text style={styles.successText}>Pro is active. This feature is unlocking now.</Text>
        ) : (
          <>
            <View style={styles.bullets}>
              <Text style={styles.bullet}>$9.99/month after trial</Text>
              <Text style={styles.bullet}>3-day free trial</Text>
              <Text style={styles.bullet}>Cancel anytime</Text>
            </View>
            {activationMessage ? <Text style={styles.helperText}>{activationMessage}</Text> : null}
            <PrimaryButton
              label={isActivating ? "Activating Pro..." : "Unlock Pro"}
              disabled={isActivating}
              onPress={() =>
                router.push({
                  pathname: "/paywall" as never,
                  params: feature ? ({ feature } as never) : undefined,
                } as never)
              }
            />
          </>
        )}
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  copy: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  bullets: {
    gap: spacing.xs,
  },
  bullet: {
    color: colors.primarySoft,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  successText: {
    color: colors.accentSoft,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
});
