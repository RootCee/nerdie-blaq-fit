import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatChip } from "@/components/ui/StatChip";
import { deriveBodyWeightHistorySummary } from "@/features/body-weight/body-weight-history";
import { loadRecentBodyWeightHistory } from "@/features/body-weight/body-weight-persistence";
import { deriveWorkoutMotivationStats } from "@/features/workouts/workout-history-stats";
import { loadWorkoutHistory } from "@/features/workouts/workout-log-persistence";
import { colors, spacing } from "@/theme";
import { WorkoutHistoryItem, WorkoutMotivationStats } from "@/types/workout";
import { BodyWeightHistorySummary } from "@/types/body-weight";

export default function ProgressScreen() {
  const [history, setHistory] = useState<WorkoutHistoryItem[]>([]);
  const [bodyWeightSummary, setBodyWeightSummary] = useState<BodyWeightHistorySummary>({
    latestWeight: null,
    latestLoggedOn: null,
    changeFromPrevious: null,
    entries: [],
  });
  const [stats, setStats] = useState<WorkoutMotivationStats>({
    workoutsCompletedThisWeek: 0,
    totalCompletedSessions: 0,
    currentStreak: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function hydrateHistory() {
        setIsLoading(true);

        try {
          const [items, recentBodyWeightLogs] = await Promise.all([
            loadWorkoutHistory(),
            loadRecentBodyWeightHistory(7),
          ]);

          if (isMounted) {
            setHistory(items);
            setStats(deriveWorkoutMotivationStats(items));
            setBodyWeightSummary(deriveBodyWeightHistorySummary(recentBodyWeightLogs));
            setError(null);
          }
        } catch (historyError) {
          if (isMounted) {
            setError(historyError instanceof Error ? historyError.message : "Unable to load your workout history.");
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }

      void hydrateHistory();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  if (isLoading) {
    return (
      <Screen title="Progress" subtitle="Your completed sessions, momentum, and check-ins live here.">
        <SectionCard title="Loading progress" eyebrow="One sec">
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.copy}>Pulling in your workout history and recent check-ins.</Text>
          </View>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen title="Progress" subtitle="A clear view of the work you’ve already put in.">
      {error ? (
        <SectionCard title="Progress not available" eyebrow="Try again">
          <Text style={styles.copy}>{error}</Text>
        </SectionCard>
      ) : null}

      <SectionCard title="Momentum" eyebrow="This week so far">
        <View style={styles.statsRow}>
          <StatChip label="This week" value={String(stats.workoutsCompletedThisWeek)} />
          <StatChip label="Total" value={String(stats.totalCompletedSessions)} />
          <StatChip label="Streak" value={String(stats.currentStreak)} />
        </View>
        <Text style={styles.streakNote}>
          Current streak = consecutive calendar days with at least one completed workout, ending today or yesterday.
        </Text>
      </SectionCard>

      <SectionCard title="Body-weight check-in" eyebrow="Recent trend">
        {bodyWeightSummary.latestWeight !== null && bodyWeightSummary.latestLoggedOn ? (
          <>
            <View style={styles.statsRow}>
              <StatChip label="Latest" value={String(bodyWeightSummary.latestWeight)} />
              <StatChip
                label="Logged"
                value={new Date(bodyWeightSummary.latestLoggedOn).toLocaleDateString()}
              />
              <StatChip
                label="Change"
                value={
                  bodyWeightSummary.changeFromPrevious === null
                    ? "N/A"
                    : `${bodyWeightSummary.changeFromPrevious > 0 ? "+" : ""}${bodyWeightSummary.changeFromPrevious}`
                }
              />
            </View>
            <Text style={styles.streakNote}>
              Change compares your latest check-in to the previous logged weight.
            </Text>
            <View style={styles.bodyWeightList}>
              {bodyWeightSummary.entries.map((entry) => (
                <View key={entry.loggedOn} style={styles.bodyWeightRow}>
                  <View>
                    <Text style={styles.bodyWeightValue}>{entry.weight}</Text>
                    <Text style={styles.metaLine}>{new Date(entry.loggedOn).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.bodyWeightChange}>
                    {entry.changeFromPrevious === null
                      ? "First logged entry"
                      : `${entry.changeFromPrevious > 0 ? "+" : ""}${entry.changeFromPrevious} from previous`}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.copy}>
            Your weigh-in streak starts here. Log today&apos;s weight from a workout session and your recent history will show up here.
          </Text>
        )}
      </SectionCard>

      {!history.length ? (
        <SectionCard title="No saved sessions yet" eyebrow="Start building history">
          <Text style={styles.copy}>
            Once you save your first workout session, this space starts telling the story of your progress.
          </Text>
        </SectionCard>
      ) : null}

      {history.map((item) => (
        <Pressable
          key={item.dayId}
          onPress={() =>
            router.push({
              pathname: "/workout-history/[dayId]" as never,
              params: { dayId: item.dayId } as never,
            } as never)
          }
        >
          <SectionCard title={item.dayTitle} eyebrow={new Date(item.completedAt).toLocaleDateString()}>
            <Text style={styles.statusLine}>Status: {item.completionStatus}</Text>
            <Text style={styles.copy}>{item.exerciseSummary}</Text>
            <Text style={styles.metaLine}>Logged exercises: {item.loggedExerciseCount}</Text>
            <Text style={styles.metaLine}>
              {item.totalCompletedSets} sets • {item.totalCompletedReps} reps • volume {item.totalWorkoutVolume}
            </Text>
            {item.notesPreview ? <Text style={styles.notesPreview}>Notes: {item.notesPreview}</Text> : null}
            <Text style={styles.linkText}>Review saved session</Text>
          </SectionCard>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingState: {
    alignItems: "flex-start",
    gap: spacing.md,
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
  streakNote: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  statusLine: {
    color: colors.primarySoft,
    fontSize: 13,
    fontWeight: "700",
  },
  metaLine: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  notesPreview: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  bodyWeightList: {
    gap: spacing.sm,
  },
  bodyWeightRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    padding: spacing.md,
  },
  bodyWeightValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  bodyWeightChange: {
    color: colors.primarySoft,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    textAlign: "right",
  },
  linkText: {
    color: colors.primarySoft,
    fontSize: 13,
    fontWeight: "600",
  },
});
