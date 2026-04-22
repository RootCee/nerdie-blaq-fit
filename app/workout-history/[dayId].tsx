import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { loadWorkoutDayLog } from "@/features/workouts/workout-log-persistence";
import { colors, spacing } from "@/theme";
import { WorkoutDayLog } from "@/types/workout";

export default function WorkoutHistoryDetailScreen() {
  const params = useLocalSearchParams<{ dayId: string }>();
  const [log, setLog] = useState<WorkoutDayLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function hydrateHistoryDetail() {
      setIsLoading(true);

      try {
        const historyLog = await loadWorkoutDayLog(params.dayId);

        if (!historyLog) {
          throw new Error("This workout history entry could not be found.");
        }

        if (isMounted) {
          setLog(historyLog);
          setError(null);
        }
      } catch (historyError) {
        if (isMounted) {
          setError(historyError instanceof Error ? historyError.message : "Unable to load this workout history entry.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void hydrateHistoryDetail();

    return () => {
      isMounted = false;
    };
  }, [params.dayId]);

  if (isLoading) {
    return (
      <Screen title="Workout history" subtitle="Loading your saved session details.">
        <SectionCard title="Fetching history" eyebrow="Please wait">
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.copy}>Bringing in your completed workout log.</Text>
          </View>
        </SectionCard>
      </Screen>
    );
  }

  if (!log) {
    return (
      <Screen
        title="Workout history"
        subtitle="This history entry is unavailable right now."
        footer={<PrimaryButton label="Back to progress" onPress={() => router.back()} variant="ghost" />}
      >
        <SectionCard title="History unavailable" eyebrow="Try again">
          <Text style={styles.copy}>{error ?? "We could not load this workout history entry."}</Text>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen
      title={log.dayTitle}
      subtitle={log.completedAt ? `Completed on ${new Date(log.completedAt).toLocaleDateString()}` : "Saved workout log"}
      footer={<PrimaryButton label="Back to progress" onPress={() => router.back()} variant="ghost" />}
    >
      <SectionCard title="Completion status" eyebrow="Saved log">
        <Text style={styles.statusText}>{log.isCompleted ? "Completed" : "Not completed"}</Text>
      </SectionCard>

      {log.exerciseLogs.map((entry) => (
        <SectionCard key={`${log.dayId}-${entry.exerciseSlug}`} title={entry.exerciseName} eyebrow={`${entry.completedSets || "0"} sets`}>
          <Text style={styles.copy}>Reps: {entry.reps || "Not logged"}</Text>
          <Text style={styles.copy}>Weight: {entry.weightUsed || "Not logged"}</Text>
          <Text style={styles.copy}>Notes: {entry.notes || "No notes added"}</Text>
        </SectionCard>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingState: {
    alignItems: "flex-start",
    gap: spacing.md,
  },
  copy: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  statusText: {
    color: colors.primarySoft,
    fontSize: 15,
    fontWeight: "700",
  },
});
