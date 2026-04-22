import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatChip } from "@/components/ui/StatChip";
import { deriveWorkoutMotivationStats } from "@/features/workouts/workout-history-stats";
import { loadWorkoutHistory } from "@/features/workouts/workout-log-persistence";
import { colors, spacing } from "@/theme";
import { WorkoutHistoryItem, WorkoutMotivationStats } from "@/types/workout";

export default function ProgressScreen() {
  const [history, setHistory] = useState<WorkoutHistoryItem[]>([]);
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
          const items = await loadWorkoutHistory();

          if (isMounted) {
            setHistory(items);
            setStats(deriveWorkoutMotivationStats(items));
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
      <Screen title="Progress" subtitle="Your completed sessions and saved momentum live here.">
        <SectionCard title="Loading history" eyebrow="Please wait">
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.copy}>Bringing in your completed workout history.</Text>
          </View>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen title="Progress" subtitle="A motivating history of the workout days you’ve already completed.">
      {error ? (
        <SectionCard title="History issue" eyebrow="Try again">
          <Text style={styles.copy}>{error}</Text>
        </SectionCard>
      ) : null}

      <SectionCard title="Momentum" eyebrow="This week">
        <View style={styles.statsRow}>
          <StatChip label="This week" value={String(stats.workoutsCompletedThisWeek)} />
          <StatChip label="Total" value={String(stats.totalCompletedSessions)} />
          <StatChip label="Streak" value={String(stats.currentStreak)} />
        </View>
        <Text style={styles.streakNote}>
          Current streak = consecutive calendar days with at least one completed workout, ending today or yesterday.
        </Text>
      </SectionCard>

      {!history.length ? (
        <SectionCard title="No completed workouts yet" eyebrow="Start logging">
          <Text style={styles.copy}>
            Your workout history will appear here once you mark a workout day as completed and save the session log.
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
            {item.notesPreview ? <Text style={styles.notesPreview}>Notes: {item.notesPreview}</Text> : null}
            <Text style={styles.linkText}>Open saved workout log</Text>
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
  linkText: {
    color: colors.primarySoft,
    fontSize: 13,
    fontWeight: "600",
  },
});
