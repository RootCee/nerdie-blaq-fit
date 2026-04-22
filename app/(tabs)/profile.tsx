import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors, spacing } from "@/theme";

export default function ProfileScreen() {
  const { profile, resetProfile, storageMode, error } = useOnboardingStore();

  const handleReset = async () => {
    try {
      await resetProfile();
      router.replace("/onboarding");
    } catch {
      // The store surfaces the error text so the user can retry from here.
    }
  };

  return (
    <Screen title="Profile" subtitle="Onboarding now hydrates from Supabase when configured, with the local store still available as a fallback.">
      <SectionCard title="Profile snapshot" eyebrow={storageMode === "supabase" ? "Supabase" : "Local fallback"}>
        <View style={styles.list}>
          <Text style={styles.item}>Age: {profile.age || "Not set"}</Text>
          <Text style={styles.item}>Sex: {profile.sex ?? "Not set"}</Text>
          <Text style={styles.item}>Height: {profile.height || "Not set"}</Text>
          <Text style={styles.item}>Weight: {profile.weight || "Not set"}</Text>
          <Text style={styles.item}>Goal: {profile.fitnessGoal ?? "Not set"}</Text>
          <Text style={styles.item}>Equipment: {profile.availableEquipment.join(", ") || "Not set"}</Text>
          <Text style={styles.item}>Injuries: {profile.injuriesOrLimitations || "None added"}</Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </SectionCard>

      <PrimaryButton label="Reset onboarding" onPress={() => void handleReset()} variant="ghost" />
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
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
});
