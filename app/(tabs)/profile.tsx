import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { deleteCurrentAccount } from "@/lib/account-deletion";
import { mapProfileToSupabaseRow } from "@/lib/onboarding-persistence";
import {
  getSessionStatus,
  linkAppleAccount,
  linkGoogleAccount,
  SessionStatus,
} from "@/lib/social-auth";
import { supabase } from "@/lib/supabase";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useSubscription } from "@/store/subscription-store";
import { colors, spacing } from "@/theme";

function formatProvider(provider: string | null): string {
  if (!provider) return "Signed in";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export default function ProfileScreen() {
  const { isComplete, profile, clearProfileState, resetProfile, storageMode, error, refreshProfile } = useOnboardingStore();
  const { isPro, isPremiumOverride, status: subscriptionStatus, refreshSubscription } = useSubscription();
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [isLinking, setIsLinking] = useState<"apple" | "google" | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const status = await getSessionStatus();
    setSessionStatus(status);
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  // Reload session status whenever auth state changes (e.g. after OAuth callback completes).
  useEffect(() => {
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[profile] onAuthStateChange — event: ${event}, userId: ${session?.user?.id ?? "none"}, is_anonymous: ${session?.user?.is_anonymous}`);
      void loadStatus();
    });
    return () => subscription.unsubscribe();
  }, [loadStatus]);

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

      const status = await getSessionStatus();
      if (supabase && status.userId && !status.isAnonymous) {
        const { error: profileSaveError } = await supabase
          .from("profiles")
          .upsert(
            mapProfileToSupabaseRow(status.userId, profile, isComplete) as Record<string, unknown>,
            { onConflict: "id" },
          );

        if (profileSaveError) {
          throw profileSaveError;
        }
      }

      await refreshProfile();
      setSessionStatus(status);
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

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setDeleteAccountError(null);

    try {
      await deleteCurrentAccount();
      await supabase?.auth.signOut().catch(() => undefined);
      clearProfileState();
      setIsDeleteModalOpen(false);
      await refreshSubscription();
      router.replace("/onboarding");
    } catch (deleteError) {
      setDeleteAccountError(
        deleteError instanceof Error
          ? deleteError.message
          : "Account deletion did not complete. Please try again.",
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <>
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
          title="Account connected"
          eyebrow={formatProvider(sessionStatus.provider)}
        >
          {sessionStatus.email ? (
            <Text style={styles.item}>{sessionStatus.email}</Text>
          ) : null}
          <Text style={styles.copy}>
            Your profile and workout history are backed up and available on any device.
          </Text>
        </SectionCard>
      )}

      <SectionCard title="Pro access" eyebrow={isPro ? "Active" : "Free"}>
        <Text style={styles.copy}>
          {isPremiumOverride
            ? "Tester premium override is active for this account."
            : isPro
              ? "Your Pro subscription is active."
              : "Basic workout, meal targets, progress, learning, and profile flows remain free."}
        </Text>
        <Text style={styles.item}>RevenueCat status: {subscriptionStatus}</Text>
        <View style={styles.buttonGroup}>
          {!isPro ? (
            <PrimaryButton label="View Pro" onPress={() => router.push("/paywall" as never)} />
          ) : null}
          <PrimaryButton label="Refresh Pro status" onPress={() => void refreshSubscription()} variant="ghost" />
        </View>
      </SectionCard>

      <PrimaryButton
        label="Reset onboarding"
        onPress={() => void handleReset()}
        variant="ghost"
      />

      <SectionCard title="Delete Account" eyebrow="Permanent">
        <Text style={styles.copy}>
          Delete your Nerdie Blaq Fit account and app data, including your profile, workout plan, workout logs, and body weight logs. This cannot be undone.
        </Text>
        {deleteAccountError ? <Text style={styles.error}>{deleteAccountError}</Text> : null}
        <PrimaryButton
          label={isDeletingAccount ? "Deleting account..." : "Delete Account"}
          onPress={() => setIsDeleteModalOpen(true)}
          disabled={isDeletingAccount}
          variant="ghost"
        />
      </SectionCard>
    </Screen>

      <Modal
        animationType="fade"
        transparent
        visible={isDeleteModalOpen}
        onRequestClose={() => {
          if (!isDeletingAccount) {
            setIsDeleteModalOpen(false);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete account?</Text>
            <Text style={styles.copy}>
              This permanently deletes your account and app data from Nerdie Blaq Fit, including profile details, workout plans, workout logs, and progress data.
            </Text>
            {deleteAccountError ? <Text style={styles.error}>{deleteAccountError}</Text> : null}
            <View style={styles.buttonGroup}>
              <PrimaryButton
                label={isDeletingAccount ? "Deleting..." : "Yes, Delete My Account"}
                onPress={() => void handleDeleteAccount()}
                disabled={isDeletingAccount}
              />
              <PrimaryButton
                label="Cancel"
                onPress={() => setIsDeleteModalOpen(false)}
                disabled={isDeletingAccount}
                variant="ghost"
              />
            </View>
            {isDeletingAccount ? (
              <View style={styles.deletingRow}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.copy}>Deleting your account and signing you out.</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
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
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.72)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 420,
    padding: spacing.lg,
    width: "100%",
  },
  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  deletingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
});
