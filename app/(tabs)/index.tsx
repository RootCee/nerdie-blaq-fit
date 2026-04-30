import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatChip } from "@/components/ui/StatChip";
import { deriveBodyWeightHistorySummary } from "@/features/body-weight/body-weight-history";
import { loadRecentBodyWeightHistory } from "@/features/body-weight/body-weight-persistence";
import { calculateBmi, parseWeightInKilograms, parseWeightInPounds } from "@/lib/body-metrics";
import {
  type HealthKitWeightSample,
  getHealthKitNoDataMessage,
  getHealthKitPermissionDeniedMessage,
  getHealthKitSyncSnapshot,
  getHealthKitUnavailableMessage,
  initializeHealthKit,
} from "@/lib/health";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors, spacing } from "@/theme";
import { BodyWeightLogRecord } from "@/types/body-weight";

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

function formatLastSyncedLabel(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function formatWeightFromPounds(weightInPounds: number, profileWeight: string) {
  if (profileWeight.trim().toLowerCase().includes("kg")) {
    const weightInKilograms = parseWeightInKilograms(`${weightInPounds} lb`);
    return weightInKilograms ? `${weightInKilograms.toFixed(1)} kg` : `${weightInPounds.toFixed(1)} lb`;
  }

  return `${weightInPounds.toFixed(1)} lb`;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getComparableTimestamp(record: Pick<BodyWeightLogRecord, "loggedOn" | "createdAt" | "updatedAt">) {
  const timestamp = Date.parse(record.updatedAt || record.createdAt || record.loggedOn);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getComparableSampleTimestamp(sample: HealthKitWeightSample) {
  const timestamp = Date.parse(sample.endDate || sample.startDate);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function mergeHealthWeightIntoHistory(entries: BodyWeightLogRecord[], sample: HealthKitWeightSample | null) {
  if (!sample) {
    return entries;
  }

  const sampleDate = new Date(sample.endDate || sample.startDate);
  const loggedOn = formatDateKey(sampleDate);
  const healthRecord: BodyWeightLogRecord = {
    userId: entries[0]?.userId ?? "healthkit",
    loggedOn,
    weight: Number(sample.value.toFixed(1)),
    createdAt: sample.startDate,
    updatedAt: sample.endDate,
  };

  const sameDayIndex = entries.findIndex((entry) => entry.loggedOn === loggedOn);

  if (sameDayIndex === -1) {
    return [healthRecord, ...entries].sort((left, right) => getComparableTimestamp(right) - getComparableTimestamp(left));
  }

  const nextEntries = [...entries];
  if (getComparableSampleTimestamp(sample) > getComparableTimestamp(nextEntries[sameDayIndex])) {
    nextEntries[sameDayIndex] = healthRecord;
  }

  return nextEntries.sort((left, right) => getComparableTimestamp(right) - getComparableTimestamp(left));
}

function shouldUseHealthWeightSample(profileWeight: string, entries: BodyWeightLogRecord[], sample: HealthKitWeightSample | null) {
  if (!sample) {
    return false;
  }

  if (!profileWeight.trim()) {
    return true;
  }

  const latestExistingEntry = entries[0];
  if (!latestExistingEntry) {
    return false;
  }

  return getComparableSampleTimestamp(sample) > getComparableTimestamp(latestExistingEntry);
}

export default function HomeScreen() {
  const { profile } = useOnboardingStore();
  const [bodyWeightEntries, setBodyWeightEntries] = useState<BodyWeightLogRecord[]>([]);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [isHealthAuthorized, setIsHealthAuthorized] = useState(false);
  const [isHealthLoading, setIsHealthLoading] = useState(true);
  const [isEnablingHealthSync, setIsEnablingHealthSync] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [lastHealthWeightSample, setLastHealthWeightSample] = useState<HealthKitWeightSample | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
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

        if (isMounted) {
          setBodyWeightEntries(entries);
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
        const snapshot = await getHealthKitSyncSnapshot();

        if (!isMounted) {
          return;
        }

        if (!snapshot.available) {
          setIsHealthAuthorized(false);
          setHealthData({
            steps: 0,
            activeCalories: 0,
            workoutsCompleted: 0,
          });
          setHealthError(getHealthKitUnavailableMessage());
          return;
        }

        setIsHealthAuthorized(snapshot.authorized);
        setLastHealthWeightSample(snapshot.latestWeight);

        if (!snapshot.authorized) {
          setHealthData({
            steps: 0,
            activeCalories: 0,
            workoutsCompleted: 0,
          });
          setHealthError(snapshot.permissionDenied ? getHealthKitPermissionDeniedMessage() : null);
          return;
        }

        setHealthData({
          steps: snapshot.steps,
          activeCalories: snapshot.activeCalories,
          workoutsCompleted: snapshot.workoutsCompleted,
        });
        setLastSyncedAt(new Date().toISOString());
        setHealthError(snapshot.hasAnyData ? null : getHealthKitNoDataMessage());
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

  const currentWeightPounds = useMemo(() => parseWeightInPounds(profile.weight), [profile.weight]);
  const goalWeightPounds = useMemo(() => parseWeightInPounds(profile.goalWeight), [profile.goalWeight]);
  const shouldAdoptHealthWeight = useMemo(
    () => shouldUseHealthWeightSample(profile.weight, bodyWeightEntries, lastHealthWeightSample),
    [bodyWeightEntries, lastHealthWeightSample, profile.weight],
  );
  const mergedBodyWeightEntries = useMemo(
    () => mergeHealthWeightIntoHistory(bodyWeightEntries, lastHealthWeightSample),
    [bodyWeightEntries, lastHealthWeightSample],
  );
  const bodyWeightSummary = useMemo(
    () =>
      deriveBodyWeightHistorySummary(mergedBodyWeightEntries, {
        goalWeight: profile.goalWeight,
        goalPace: profile.goalPace,
        currentWeight: profile.weight,
      }),
    [mergedBodyWeightEntries, profile.goalPace, profile.goalWeight, profile.weight],
  );
  const dashboardWeight = useMemo(() => {
    if (bodyWeightSummary.latestWeight !== null && (bodyWeightEntries.length > 0 || shouldAdoptHealthWeight)) {
      return formatWeightFromPounds(bodyWeightSummary.latestWeight, profile.weight);
    }

    return profile.weight;
  }, [bodyWeightEntries.length, bodyWeightSummary.latestWeight, profile.weight, shouldAdoptHealthWeight]);
  const bmiSummary = useMemo(() => calculateBmi(profile.height, dashboardWeight), [dashboardWeight, profile.height]);
  const latestWeight = bodyWeightSummary.latestWeight ?? currentWeightPounds;
  const progressPercent = useMemo(
    () => resolveProgressPercent(currentWeightPounds, goalWeightPounds, latestWeight),
    [currentWeightPounds, goalWeightPounds, latestWeight],
  );
  const phaseLabel = useMemo(
    () => resolvePhaseLabel(currentWeightPounds, goalWeightPounds),
    [currentWeightPounds, goalWeightPounds],
  );
  const weeklyChange = bodyWeightSummary.weeklyChange ?? null;
  const activityStatus = useMemo(
    () => resolveActivityStatus(healthData.steps, healthData.activeCalories, healthData.workoutsCompleted),
    [healthData.activeCalories, healthData.steps, healthData.workoutsCompleted],
  );

  const handleRecalibrateHealthData = async (options?: { suppressUnauthorizedError?: boolean }) => {
    setIsHealthLoading(true);
    setHealthError(null);

    try {
      const snapshot = await getHealthKitSyncSnapshot();

      if (!snapshot.available) {
        setIsHealthAuthorized(false);
        setHealthData({
          steps: 0,
          activeCalories: 0,
          workoutsCompleted: 0,
        });
        setHealthError(getHealthKitUnavailableMessage());
        return;
      }

      setIsHealthAuthorized(snapshot.authorized);

      if (!snapshot.authorized) {
        setHealthData({
          steps: 0,
          activeCalories: 0,
          workoutsCompleted: 0,
        });
        setHealthError(
          snapshot.permissionDenied
            ? getHealthKitPermissionDeniedMessage()
            : options?.suppressUnauthorizedError
              ? null
              : "Apple Health access was not enabled.",
        );
        return;
      }

      setHealthData({
        steps: snapshot.steps,
        activeCalories: snapshot.activeCalories,
        workoutsCompleted: snapshot.workoutsCompleted,
      });
      setLastHealthWeightSample(snapshot.latestWeight);
      setLastSyncedAt(new Date().toISOString());
      setHealthError(snapshot.hasAnyData ? null : getHealthKitNoDataMessage());
    } catch {
      setIsHealthAuthorized(false);
      setHealthError("We couldn't connect to Apple Health right now.");
    } finally {
      setIsHealthLoading(false);
    }
  };

  const handleEnableHealthSync = async () => {
    setIsEnablingHealthSync(true);
    setHealthError(null);

    try {
      const authorized = await initializeHealthKit();
      setIsHealthAuthorized(authorized);

      if (!authorized) {
        const snapshot = await getHealthKitSyncSnapshot();
        setHealthError(
          !snapshot.available
            ? getHealthKitUnavailableMessage()
            : snapshot.permissionDenied
              ? getHealthKitPermissionDeniedMessage()
              : "Apple Health access was not enabled.",
        );
      } else {
        await handleRecalibrateHealthData({ suppressUnauthorizedError: true });
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
            <Text style={styles.progressValue}>{dashboardWeight ? formatWeight(dashboardWeight) : "Not set"}</Text>
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
              label={isHealthLoading ? "Recalibrating..." : "Recalibrate"}
              onPress={() => void handleRecalibrateHealthData()}
              variant="ghost"
              disabled={isHealthLoading || isEnablingHealthSync}
            />
          </>
        )}

        {healthError ? <Text style={styles.progressError}>{healthError}</Text> : null}
        {lastSyncedAt ? <Text style={styles.healthHelper}>Last synced: {formatLastSyncedLabel(lastSyncedAt)}</Text> : null}
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
