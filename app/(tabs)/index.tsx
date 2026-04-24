import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatChip } from "@/components/ui/StatChip";
import { deriveBodyWeightHistorySummary } from "@/features/body-weight/body-weight-history";
import { loadRecentBodyWeightHistory } from "@/features/body-weight/body-weight-persistence";
import { calculateBmi, parseWeightInPounds } from "@/lib/body-metrics";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors, spacing } from "@/theme";
import { BodyWeightHistorySummary } from "@/types/body-weight";

const DAILY_FOCUS_QUOTES = [
  "Discipline builds the version of you that motivation only talks about.",
  "Small consistent wins will always outrun random perfect days.",
  "Train with intention, recover with respect, and let the results stack.",
  "Your routine is the real flex when nobody is watching.",
  "Progress gets loud when consistency stays quiet.",
  "Every clean rep is a vote for the future you want.",
  "Keep showing up. Momentum loves repetition.",
  "You do not need a perfect day. You need a repeatable one.",
  "Strength grows when your habits stop negotiating.",
  "Trust the basics long enough to let them work.",
  "Results follow the standard you keep, not the mood you chase.",
  "What feels small today becomes visible when you refuse to quit.",
  "Confidence is built one finished session at a time.",
  "Stay steady long enough for the mirror to catch up.",
  "The goal is not hype. The goal is proof.",
];

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function formatWeight(weight: string) {
  return weight.trim() || "Not set";
}

function resolvePhaseLabel(currentWeight: number | null, goalWeight: number | null) {
  if (!currentWeight || !goalWeight) {
    return "Maintenance";
  }

  if (goalWeight < currentWeight) {
    return "Cutting Phase";
  }

  if (goalWeight > currentWeight) {
    return "Bulking Phase";
  }

  return "Maintenance";
}

function resolveProgressPercent(currentWeight: number | null, goalWeight: number | null, latestWeight: number | null) {
  if (!currentWeight || !goalWeight || latestWeight === null) {
    return null;
  }

  const totalChangeNeeded = Math.abs(goalWeight - currentWeight);

  if (totalChangeNeeded === 0) {
    return 100;
  }

  const progressMade = totalChangeNeeded - Math.abs(goalWeight - latestWeight);
  return clamp(Math.round((progressMade / totalChangeNeeded) * 100));
}

export default function HomeScreen() {
  const { profile } = useOnboardingStore();
  const [bodyWeightSummary, setBodyWeightSummary] = useState<BodyWeightHistorySummary | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const todaysFocusQuote = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));

    return DAILY_FOCUS_QUOTES[dayOfYear % DAILY_FOCUS_QUOTES.length];
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function hydrateProgress() {
      try {
        const entries = await loadRecentBodyWeightHistory(7);
        const summary = deriveBodyWeightHistorySummary(entries, {
          goalWeight: profile.goalWeight,
          goalPace: profile.goalPace,
          currentWeight: profile.weight,
        });

        if (isMounted) {
          setBodyWeightSummary(summary);
          setProgressError(null);
        }
      } catch (error) {
        if (isMounted) {
          setProgressError(error instanceof Error ? error.message : "Unable to load weight progress.");
        }
      }
    }

    void hydrateProgress();

    return () => {
      isMounted = false;
    };
  }, [profile.goalPace, profile.goalWeight, profile.weight]);

  const currentWeightPounds = useMemo(() => parseWeightInPounds(profile.weight), [profile.weight]);
  const goalWeightPounds = useMemo(() => parseWeightInPounds(profile.goalWeight), [profile.goalWeight]);
  const bmiSummary = useMemo(() => calculateBmi(profile.height, profile.weight), [profile.height, profile.weight]);
  const latestWeight = bodyWeightSummary?.latestWeight ?? currentWeightPounds;
  const progressPercent = useMemo(
    () => resolveProgressPercent(currentWeightPounds, goalWeightPounds, latestWeight),
    [currentWeightPounds, goalWeightPounds, latestWeight],
  );
  const phaseLabel = useMemo(
    () => resolvePhaseLabel(currentWeightPounds, goalWeightPounds),
    [currentWeightPounds, goalWeightPounds],
  );
  const weeklyChange = bodyWeightSummary?.weeklyChange ?? null;

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

      <SectionCard title="Today's Focus" eyebrow="Daily mindset">
        <Text style={styles.focusQuote}>{todaysFocusQuote}</Text>
      </SectionCard>

      <SectionCard title="Blaq Progress Dashboard" eyebrow="Body metrics">
        <View style={styles.progressHeaderRow}>
          <View style={styles.progressMetric}>
            <Text style={styles.progressLabel}>Current weight</Text>
            <Text style={styles.progressValue}>
              {bodyWeightSummary?.latestWeight ? `${bodyWeightSummary.latestWeight} lb` : formatWeight(profile.weight)}
            </Text>
          </View>
          <View style={styles.progressMetric}>
            <Text style={styles.progressLabel}>Goal weight</Text>
            <Text style={styles.progressValue}>{formatWeight(profile.goalWeight)}</Text>
          </View>
        </View>

        <View style={styles.progressHeaderRow}>
          <View style={styles.progressMetric}>
            <Text style={styles.progressLabel}>BMI</Text>
            <Text style={styles.progressValue}>
              {bmiSummary ? `${bmiSummary.value} · ${bmiSummary.category}` : "Not enough data"}
            </Text>
          </View>
          <View style={styles.progressMetric}>
            <Text style={styles.progressLabel}>Status</Text>
            <Text style={styles.progressValue}>{phaseLabel}</Text>
          </View>
        </View>

        <View style={styles.progressBarBlock}>
          <View style={styles.progressBarHeader}>
            <Text style={styles.progressLabel}>Progress toward goal</Text>
            <Text style={styles.progressPercent}>
              {progressPercent !== null ? `${progressPercent}%` : "Waiting on weigh-ins"}
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercent ?? 0}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.progressFooterRow}>
          <Text style={styles.progressFooterText}>
            Weekly change: {weeklyChange !== null ? `${weeklyChange > 0 ? "+" : ""}${weeklyChange} lb` : "No recent trend yet"}
          </Text>
          {progressError ? <Text style={styles.progressError}>{progressError}</Text> : null}
        </View>
      </SectionCard>

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
  progressHeaderRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  progressMetric: {
    flex: 1,
    minWidth: 140,
    gap: 4,
  },
  progressLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  progressBarBlock: {
    gap: spacing.sm,
  },
  progressBarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  progressPercent: {
    color: colors.primarySoft,
    fontSize: 13,
    fontWeight: "700",
  },
  progressBarTrack: {
    width: "100%",
    height: 12,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  progressFooterRow: {
    gap: spacing.xs,
  },
  progressFooterText: {
    color: colors.primarySoft,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  progressError: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 18,
  },
  focusQuote: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 28,
    textAlign: "center",
  },
});
