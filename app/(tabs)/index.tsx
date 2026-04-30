import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatChip } from "@/components/ui/StatChip";
import { deriveBodyWeightHistorySummary } from "@/features/body-weight/body-weight-history";
import { loadRecentBodyWeightHistory } from "@/features/body-weight/body-weight-persistence";
import { calculateBmi, parseWeightInPounds } from "@/lib/body-metrics";
import {
  getHealthKitAuthorizationStatus,
  getHealthKitUnavailableMessage,
  isHealthKitAvailable,
  getTodayActiveCalories,
  getTodaySteps,
  getTodayWorkouts,
  initializeHealthKit,
} from "@/lib/health";
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

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function resolveActivityStatus(steps: number, activeCalories: number, workoutsCompleted: number) {
  if (workoutsCompleted >= 2 || steps >= 12000 || activeCalories >= 800) {
    return "High activity";
  }

  if (workoutsCompleted >= 1 || steps >= 6000 || activeCalories >= 300) {
    return "Moderate activity";
  }

  return "Low activity";
}

export default function HomeScreen() {
  const { profile } = useOnboardingStore();
  const [bodyWeightSummary, setBodyWeightSummary] = useState<BodyWeightHistorySummary | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [isHealthAuthorized, setIsHealthAuthorized] = useState(false);
  const [isHealthLoading, setIsHealthLoading] = useState(true);
  const [isEnablingHealthSync, setIsEnablingHealthSync] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthRefreshNonce, setHealthRefreshNonce] = useState(0);
  const [healthData, setHealthData] = useState({
    steps: 0,
    activeCalories: 0,
    workoutsCompleted: 0,
  });
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

  useEffect(() => {
    let isMounted = true;

    async function hydrateHealthSyncStatus() {
      try {
        const isAvailable = await isHealthKitAvailable();

        if (!isAvailable) {
          if (!isMounted) {
            return;
          }

          setIsHealthAuthorized(false);
          setHealthData({
            steps: 0,
            activeCalories: 0,
            workoutsCompleted: 0,
          });
          setHealthError(getHealthKitUnavailableMessage());
          return;
        }

        const authorized = await getHealthKitAuthorizationStatus();

        if (!isMounted) {
          return;
        }

        setIsHealthAuthorized(authorized);
        setHealthError(null);

        if (!authorized) {
          setHealthData({
            steps: 0,
            activeCalories: 0,
            workoutsCompleted: 0,
          });
        }
      } catch {
        if (!isMounted) {
          return;
        }

        setIsHealthAuthorized(false);
        setHealthError("Health Sync is not available right now.");
      } finally {
        if (isMounted) {
          setIsHealthLoading(false);
        }
      }
    }

    void hydrateHealthSyncStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function hydrateHealthData() {
      if (!isHealthAuthorized) {
        return;
      }

      setIsHealthLoading(true);

      try {
        const [steps, activeCalories, workoutsCompleted] = await Promise.all([
          getTodaySteps(),
          getTodayActiveCalories(),
          getTodayWorkouts(),
        ]);

        if (!isMounted) {
          return;
        }

        setHealthData({
          steps,
          activeCalories,
          workoutsCompleted,
        });
        setHealthError(null);
      } catch {
        if (!isMounted) {
          return;
        }

        setHealthError("We couldn't load Apple Health data just now.");
      } finally {
        if (isMounted) {
          setIsHealthLoading(false);
        }
      }
    }

    void hydrateHealthData();

    return () => {
      isMounted = false;
    };
  }, [healthRefreshNonce, isHealthAuthorized]);

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
  const activityStatus = useMemo(
    () => resolveActivityStatus(healthData.steps, healthData.activeCalories, healthData.workoutsCompleted),
    [healthData.activeCalories, healthData.steps, healthData.workoutsCompleted],
  );

  const handleEnableHealthSync = async () => {
    setIsEnablingHealthSync(true);
    setHealthError(null);

    try {
      const isAvailable = await isHealthKitAvailable();

      if (!isAvailable) {
        setIsHealthAuthorized(false);
        setHealthError(getHealthKitUnavailableMessage());
        return;
      }

      const authorized = await initializeHealthKit();
      setIsHealthAuthorized(authorized);

      if (!authorized) {
        setHealthError("Apple Health access was not enabled.");
      } else {
        setHealthRefreshNonce((current) => current + 1);
      }
    } catch {
      setIsHealthAuthorized(false);
      setHealthError("We couldn't connect to Apple Health right now.");
    } finally {
      setIsEnablingHealthSync(false);
    }
  };

  return (
    <Screen title="Welcome back" subtitle="Your dashboard is ready for personalized workout, nutrition, and habit layers.">
      <View style={styles.brandCard}>
        <Image source={require("../../assets/icon.png")} style={styles.brandLogo} resizeMode="contain" />
        <View style={styles.brandCopy}>
          <Text style={styles.brandTitle}>Nerdie Blaq Fit</Text>
          <Text style={styles.brandTagline}>Music. Money. Muscle.</Text>
        </View>
      </View>

      <SectionCard title="Today's Focus" eyebrow="Daily mindset">
        <Text style={styles.focusQuote}>{todaysFocusQuote}</Text>
        <Text style={styles.focusCopy}>
          You’re set up for {profile.fitnessGoal?.replace("-", " ") ?? "general wellness"} with a {profile.workoutLocation ?? "flexible"} training setup.
        </Text>
      </SectionCard>

      <View style={styles.statsRow}>
        <StatChip label="Goal" value={profile.fitnessGoal ? profile.fitnessGoal.replace("-", " ") : "Set"} />
        <StatChip label="Activity" value={profile.activityLevel ? profile.activityLevel.replace("-", " ") : "Pending"} />
        <StatChip label="Diet" value={profile.dietaryPreference ? profile.dietaryPreference.replace("-", " ") : "Open"} />
      </View>

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

      <SectionCard title={isHealthAuthorized ? "Health Sync" : "Connect Apple Health"} eyebrow="Apple Health">
        {!isHealthAuthorized ? (
          <>
            <Text style={styles.copy}>
              Connect Apple Health to bring steps, activity, recovery, and body metrics into Nerdie Blaq Fit.
            </Text>
            <PrimaryButton
              label={isEnablingHealthSync ? "Connecting..." : "Enable Health Sync"}
              onPress={() => void handleEnableHealthSync()}
              disabled={isEnablingHealthSync || isHealthLoading}
            />
          </>
        ) : (
          <>
            <View style={styles.healthStatsRow}>
              <View style={styles.healthMetric}>
                <Text style={styles.progressLabel}>Steps Today</Text>
                <Text style={styles.healthValue}>{formatCompactNumber(healthData.steps)}</Text>
              </View>
              <View style={styles.healthMetric}>
                <Text style={styles.progressLabel}>Active Calories</Text>
                <Text style={styles.healthValue}>{formatCompactNumber(healthData.activeCalories)}</Text>
              </View>
              <View style={styles.healthMetric}>
                <Text style={styles.progressLabel}>Workouts Completed</Text>
                <Text style={styles.healthValue}>{healthData.workoutsCompleted}</Text>
              </View>
            </View>

            <View style={styles.healthStatusRow}>
              <Text style={styles.progressLabel}>Status</Text>
              <View style={styles.healthStatusBadge}>
                <Text style={styles.healthStatusText}>{isHealthLoading ? "Refreshing..." : activityStatus}</Text>
              </View>
            </View>

            <PrimaryButton
              label={isHealthLoading ? "Refreshing..." : "Refresh Health Data"}
              onPress={() => setHealthRefreshNonce((current) => current + 1)}
              variant="ghost"
              disabled={isHealthLoading || isEnablingHealthSync}
            />
          </>
        )}

        {healthError ? <Text style={styles.progressError}>{healthError}</Text> : null}
        {isHealthAuthorized && !healthError ? (
          <Text style={styles.healthHelper}>
            {isHealthLoading ? "Loading your Apple Health summary..." : "Apple Health data updates from the start of today through now."}
          </Text>
        ) : null}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  brandLogo: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  brandCopy: {
    flex: 1,
    gap: 4,
  },
  brandTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  brandTagline: {
    color: colors.primarySoft,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
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
  focusCopy: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  previewBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewBadgeText: {
    color: colors.primarySoft,
    fontSize: 12,
    fontWeight: "700",
  },
  healthStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  healthMetric: {
    flex: 1,
    minWidth: 140,
    padding: spacing.md,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  healthValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  healthStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  healthStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: "rgba(20, 184, 166, 0.14)",
    borderWidth: 1,
    borderColor: colors.accent,
  },
  healthStatusText: {
    color: colors.accentSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  healthHelper: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
});
