import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatChip } from "@/components/ui/StatChip";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors, spacing } from "@/theme";

export default function HomeScreen() {
  const { profile } = useOnboardingStore();

  return (
    <Screen title="Welcome back" subtitle="Your dashboard is ready for personalized workout, nutrition, and habit layers.">
      <LinearGradient colors={["#F97316", "#FB7185", "#0F172A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.heroEyebrow}>Today’s focus</Text>
        <Text style={styles.heroTitle}>Consistency over chaos.</Text>
        <Text style={styles.heroBody}>
          You’re set up for {profile.fitnessGoal?.replace("-", " ") ?? "general wellness"} with a {profile.workoutLocation ?? "flexible"} training setup.
        </Text>
      </LinearGradient>

      <View style={styles.statsRow}>
        <StatChip label="Goal" value={profile.fitnessGoal ? profile.fitnessGoal.replace("-", " ") : "Set"} />
        <StatChip label="Activity" value={profile.activityLevel ? profile.activityLevel.replace("-", " ") : "Pending"} />
        <StatChip label="Diet" value={profile.dietaryPreference ? profile.dietaryPreference.replace("-", " ") : "Open"} />
      </View>

      <SectionCard title="What ships next" eyebrow="Roadmap">
        <Text style={styles.copy}>Supabase auth, profile persistence, dynamic plans, and progress logging can plug into this structure without changing the screen architecture.</Text>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 28,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  heroEyebrow: {
    color: "#FFE7D6",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
  },
  heroBody: {
    color: "#FDEDDC",
    fontSize: 15,
    lineHeight: 22,
    maxWidth: "90%",
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  copy: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
});
