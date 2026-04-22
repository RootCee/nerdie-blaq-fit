import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import {
  getSessionStatus,
  linkAppleAccount,
  linkGoogleAccount,
  SessionStatus,
} from "@/lib/social-auth";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors, spacing } from "@/theme";

export default function ProfileScreen() {
  const { profile, resetProfile, storageMode, error, refreshProfile } = useOnboardingStore();
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [isLinking, setIsLinking] = useState<"apple" | "google" | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    void loadStatus();
  }, []);

  const loadStatus = async () => {
    const status = await getSessionStatus();
    setSessionStatus(status);
  };

  const handleLink = async (provider: "apple" | "google") => {
    setIsLinking(provider);
    setLinkError(null);

    try {
      if (provider === "apple") {
        const snapshot =
          sessionStatus?.userId && profile
            ? { userId: sessionStatus.userId, profile }
            : undefined;
        await linkAppleAccount(snapshot);
      } else {
        await linkGoogleAccount();
      }

      await refreshProfile();
      await loadStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-in failed. Please try again.";
      if (!message.toLowerCase().includes("cancel")) {
        setLinkError(message);
      }
    } finally {
      setIsLinking(null);
    }
  };

  const handleReset = async () => {
    try {
      await resetProfile();
      router.replace("/onboarding");
    } catch {
      // The store surfaces the error text so the user can retry from here.
    }
  };

  return (
    <Screen title="Profile" subtitle="Your saved profile and account settings.">
      <SectionCard
        title="Profile snapshot"
        eyebrow={storageMode === "supabase" ? "Supabase" : "Local fallback"}
      >
        <View style={styles.list}>
          <Text style={styles.item}>Age: {profile.age || "Not set"}</Text>
          <Text style={styles.item}>Sex: {profile.sex ?? "Not set"}</Text>
          <Text style={styles.item}>Height: {profile.height || "Not set"}</Text>
          <Text style={styles.item}>Weight: {profile.weight || "Not set"}</Text>
          <Text style={styles.item}>Goal: {profile.fitnessGoal ?? "Not set"}</Text>
          <Text style={styles.item}>
            Equipment: {profile.availableEquipment.join(", ") || "Not set"}
          </Text>
          <Text style={styles.item}>
            Injuries: {profile.injuriesOrLimitations || "None added"}
          </Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </SectionCard>

      {sessionStatus === null ? (
        <SectionCard title="Account" eyebrow="Loading">
          <ActivityIndicator color={colors.primary} />
        </SectionCard>
      ) : sessionStatus.isAnonymous ? (
        <SectionCard title="Save your progress" eyebrow="Account upgrade">
          <Text style={styles.copy}>
            Your data is tied to this device. Sign in with Apple or Google to back it up and
            access it on any device without losing your profile or workout history.
          </Text>
          {linkError ? <Text style={styles.error}>{linkError}</Text> : null}
          <View style={styles.buttonGroup}>
            <PrimaryButton
              label={isLinking === "apple" ? "Signing in with Apple..." : "Continue with Apple"}
              onPress={() => void handleLink("apple")}
              style={styles.socialButton}
            />
            <PrimaryButton
              label={
                isLinking === "google" ? "Signing in with Google..." : "Continue with Google"
              }
              onPress={() => void handleLink("google")}
              variant="ghost"
              style={styles.socialButton}
            />
          </View>
        </SectionCard>
      ) : (
        <SectionCard
          title="Account linked"
          eyebrow={sessionStatus.provider ?? "Signed in"}
        >
          {sessionStatus.email ? (
            <Text style={styles.item}>Signed in as {sessionStatus.email}</Text>
          ) : (
            <Text style={styles.item}>Account linked</Text>
          )}
          <Text style={styles.copy}>
            Your profile and workout history are backed up. Sign in with the same account on
            any device to restore your data.
          </Text>
        </SectionCard>
      )}

      <PrimaryButton
        label="Reset onboarding"
        onPress={() => void handleReset()}
        variant="ghost"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  item: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  copy: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonGroup: {
    gap: spacing.sm,
  },
  socialButton: {
    minHeight: 52,
  },
});
