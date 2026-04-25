import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { getExerciseDisplayName, toExerciseSlug } from "@/features/workouts/exercise-library";
import { deriveWorkoutVolumeSummary, loadWorkoutDayLog } from "@/features/workouts/workout-log-persistence";
import { loadActiveWorkoutPlan } from "@/features/workouts/workout-plan-persistence";
import { colors, spacing } from "@/theme";
import {
  GroupedWorkoutExerciseDisplay,
  WorkoutDay,
  WorkoutDayLog,
  WorkoutExercise,
  WorkoutExerciseComparison,
  WorkoutPlanComparisonSummary,
  WorkoutSupersetGroup,
} from "@/types/workout";

function getGroupedExercises(day: WorkoutDay): GroupedWorkoutExerciseDisplay[] {
  const supersetsBySlug = new Map(
    (day.supersets ?? []).flatMap((superset) =>
      superset.exerciseSlugs.map((slug, index) => [slug, { superset, positionInSuperset: index + 1 }] as const),
    ),
  );

  return day.exercises.map((exercise) => {
    const key = exercise.slug ?? exercise.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const match = supersetsBySlug.get(key);

    return {
      exercise,
      superset: match?.superset ?? null,
      positionInSuperset: match?.positionInSuperset ?? null,
    };
  });
}

function parsePlannedSetCount(label: string) {
  const match = label.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 1;
}

function derivePlanComparisonSummary(day: WorkoutDay, log: WorkoutDayLog): WorkoutPlanComparisonSummary {
  const plannedExercises = [...day.exercises, ...(day.coreFinisher?.exercises ?? [])];
  const exercises: WorkoutExerciseComparison[] = plannedExercises.map((exercise) => {
    const slug = exercise.slug ?? exercise.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const logEntry = log.exerciseLogs.find((entry) => entry.exerciseSlug === slug);
    const completedSets = logEntry?.sets.filter((set) => set.isCompleted).length ?? 0;

    return {
      exerciseSlug: slug,
      exerciseName: exercise.name,
      plannedSets: parsePlannedSetCount(exercise.sets),
      completedSets,
      missedSets: Math.max(parsePlannedSetCount(exercise.sets) - completedSets, 0),
      isBelowPlanned: completedSets < parsePlannedSetCount(exercise.sets),
    };
  });

  const coreExercises = day.coreFinisher?.exercises ?? [];
  const coreFinisherCompleted = coreExercises.length
    ? coreExercises.every((exercise) => {
        const slug = exercise.slug ?? exercise.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const comparison = exercises.find((entry) => entry.exerciseSlug === slug);
        return Boolean(comparison?.completedSets);
      })
    : false;

  return {
    totalPlannedExercises: plannedExercises.length,
    totalCompletedExercises: exercises.filter((entry) => entry.completedSets > 0).length,
    totalPlannedSets: exercises.reduce((sum, entry) => sum + entry.plannedSets, 0),
    totalCompletedSets: exercises.reduce((sum, entry) => sum + entry.completedSets, 0),
    coreFinisherWasPlanned: Boolean(coreExercises.length),
    coreFinisherCompleted,
    hasMissedWork: exercises.some((entry) => entry.isBelowPlanned),
    missedExerciseCount: exercises.filter((entry) => entry.isBelowPlanned).length,
    exercises,
  };
}

export default function WorkoutHistoryDetailScreen() {
  const params = useLocalSearchParams<{ dayId: string }>();
  const [log, setLog] = useState<WorkoutDayLog | null>(null);
  const [plannedDay, setPlannedDay] = useState<WorkoutDay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleExercisePress = (name: string, slug?: string) => {
    const resolvedSlug = slug ?? toExerciseSlug(name);

    if (__DEV__) {
      console.log("[workout-history] exercise slug tapped", resolvedSlug);
    }

    router.push({
      pathname: "/exercise/[slug]" as never,
      params: { slug: resolvedSlug, name } as never,
    } as never);

    if (__DEV__) {
      console.log("[workout-history] route pushed", {
        pathname: "/exercise/[slug]",
        slug: resolvedSlug,
      });
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function hydrateHistoryDetail() {
      setIsLoading(true);

      try {
        const [historyLog, activePlan] = await Promise.all([
          loadWorkoutDayLog(params.dayId),
          loadActiveWorkoutPlan(),
        ]);

        if (!historyLog) {
          throw new Error("This workout history entry could not be found.");
        }

        if (isMounted) {
          setLog(historyLog);
          setPlannedDay(activePlan?.days.find((day) => day.id === params.dayId) ?? null);
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
      <Screen title="Workout history" subtitle="Loading your saved session review.">
        <SectionCard title="Pulling up your history" eyebrow="One sec">
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.copy}>Bringing in your saved session details and training structure.</Text>
          </View>
        </SectionCard>
      </Screen>
    );
  }

  if (!log) {
    return (
      <Screen
        title="Workout history"
        subtitle="This saved session isn’t available right now."
        footer={<PrimaryButton label="Back to progress" onPress={() => router.back()} variant="ghost" />}
      >
        <SectionCard title="Saved session not available" eyebrow="Try again">
          <Text style={styles.copy}>{error ?? "We couldn’t load this workout review right now."}</Text>
        </SectionCard>
      </Screen>
    );
  }

  const volumeSummary = deriveWorkoutVolumeSummary(log);
  const groupedExercises = plannedDay ? getGroupedExercises(plannedDay) : [];
  const comparisonSummary = plannedDay ? derivePlanComparisonSummary(plannedDay, log) : null;

  const renderExerciseLog = (
    exercise: WorkoutExercise,
    options?: {
      superset?: WorkoutSupersetGroup | null;
      positionInSuperset?: number | null;
      containerStyle?: object;
      showSupersetHeader?: boolean;
    },
  ) => {
    const exerciseSlug = exercise.slug ?? exercise.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const entry = log.exerciseLogs.find((item) => item.exerciseSlug === exerciseSlug);
    const comparison = comparisonSummary?.exercises.find((item) => item.exerciseSlug === exerciseSlug);

    if (!entry) {
      return null;
    }

    return (
      <View
        key={`${log.dayId}-${exerciseSlug}`}
        style={[
          styles.exerciseCard,
          options?.superset ? styles.supersetExerciseCard : null,
          options?.containerStyle ?? null,
        ]}
      >
        {options?.superset && options.showSupersetHeader ? (
          <View style={styles.supersetHeader}>
            <Text style={styles.supersetLabel}>
              {options.superset.title} • Move {options.positionInSuperset} of {options.superset.exerciseSlugs.length}
            </Text>
            <Text style={styles.supersetNotes}>{options.superset.notes}</Text>
            <Text style={styles.supersetRest}>Rest after group: {options.superset.restAfterGroup}</Text>
          </View>
        ) : null}
        <Pressable onPress={() => handleExercisePress(entry.exerciseName, exercise.slug)} style={styles.exerciseHeaderButton}>
          <Text style={styles.exerciseName}>{exercise.displayName ?? getExerciseDisplayName(entry.exerciseName) ?? entry.exerciseName}</Text>
          <Text style={styles.exerciseLink}>View movement notes</Text>
        </Pressable>
        <Text style={styles.metaLine}>{entry.sets.filter((set) => set.isCompleted).length} completed sets</Text>
        {comparison ? (
          <View style={styles.comparisonBlock}>
            <Text style={styles.comparisonLine}>
              Planned vs completed: {comparison.plannedSets} sets vs {comparison.completedSets} sets
            </Text>
            {comparison.isBelowPlanned ? (
              <Text style={styles.hintLine}>
                A little work was left on the table here: {comparison.missedSets} set{comparison.missedSets === 1 ? "" : "s"} missed.
              </Text>
            ) : null}
          </View>
        ) : null}
        {entry.sets.map((set) => (
          <View key={`${entry.exerciseSlug}-${set.setNumber}`} style={styles.setRow}>
            <Text style={styles.copy}>Set {set.setNumber}</Text>
            <Text style={styles.copy}>Reps: {set.reps || "-"}</Text>
            <Text style={styles.copy}>Weight: {set.weight || "-"}</Text>
            <Text style={styles.copy}>{set.isCompleted ? "Completed" : "Pending"}</Text>
          </View>
        ))}
        <Text style={styles.copy}>Notes: {entry.notes || "No notes added"}</Text>
      </View>
    );
  };

  return (
    <Screen
      title={log.dayTitle}
      subtitle={log.completedAt ? `Logged on ${new Date(log.completedAt).toLocaleDateString()}` : "Saved session review"}
      footer={<PrimaryButton label="Back to progress" onPress={() => router.back()} variant="ghost" />}
    >
      <SectionCard title="Session summary" eyebrow="Saved log">
        <Text style={styles.statusText}>{log.isCompleted ? "Completed" : "Not completed"}</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.copy}>Completed sets: {volumeSummary.totalCompletedSets}</Text>
          <Text style={styles.copy}>Completed reps: {volumeSummary.totalCompletedReps}</Text>
          <Text style={styles.copy}>Workout volume: {volumeSummary.totalWorkoutVolume}</Text>
        </View>
      </SectionCard>

      {plannedDay ? (
        <>
          {comparisonSummary ? (
            <SectionCard title="Planned vs completed" eyebrow="Quick check">
              <Text style={styles.copy}>
                Exercises completed: {comparisonSummary.totalCompletedExercises} / {comparisonSummary.totalPlannedExercises}
              </Text>
              <Text style={styles.copy}>
                Sets completed: {comparisonSummary.totalCompletedSets} / {comparisonSummary.totalPlannedSets}
              </Text>
              <Text style={styles.copy}>
                Core finisher: {comparisonSummary.coreFinisherWasPlanned
                  ? comparisonSummary.coreFinisherCompleted
                    ? "Completed"
                    : "Planned, but not fully finished"
                  : "Not planned"}
              </Text>
              {comparisonSummary.hasMissedWork ? (
                <View style={styles.hintCard}>
                  <Text style={styles.hintTitle}>Review note</Text>
                  <Text style={styles.hintText}>
                    {comparisonSummary.missedExerciseCount} exercise{comparisonSummary.missedExerciseCount === 1 ? "" : "s"} came in a little below the planned set target.
                  </Text>
                  {!comparisonSummary.coreFinisherCompleted && comparisonSummary.coreFinisherWasPlanned ? (
                    <Text style={styles.hintText}>
                      The core finisher was planned, but not fully completed in this session.
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </SectionCard>
          ) : null}

          <SectionCard title="Main work" eyebrow="Saved structure">
            {groupedExercises.map(({ exercise, superset, positionInSuperset }) =>
              renderExerciseLog(exercise, {
                superset,
                positionInSuperset,
                showSupersetHeader: Boolean(superset),
              }),
            )}
          </SectionCard>

          {plannedDay.coreFinisher ? (
            <SectionCard title={plannedDay.coreFinisher.title} eyebrow="Saved finisher">
              <Text style={styles.copy}>
                {plannedDay.coreFinisher.emphasis === "front-core-trunk-stability"
                  ? "Front core / trunk stability"
                  : "Obliques / side core"}
              </Text>
              <Text style={styles.copy}>{plannedDay.coreFinisher.notes}</Text>
              <View style={styles.finisherGroupHeader}>
                <Text style={styles.supersetLabel}>Core finisher superset</Text>
                <Text style={styles.supersetNotes}>Move through both finisher drills before taking the full rest.</Text>
                <Text style={styles.supersetRest}>Rest after group: 30 sec after both exercises</Text>
              </View>
              {plannedDay.coreFinisher.exercises.map((exercise) =>
                renderExerciseLog(exercise, {
                  containerStyle: styles.finisherExerciseCard,
                }),
              )}
            </SectionCard>
          ) : null}
        </>
      ) : (
        log.exerciseLogs.map((entry) => (
          <SectionCard
            key={`${log.dayId}-${entry.exerciseSlug}`}
            title={entry.exerciseName}
            eyebrow={`${entry.sets.filter((set) => set.isCompleted).length} completed sets`}
          >
            {entry.sets.map((set) => (
              <View key={`${entry.exerciseSlug}-${set.setNumber}`} style={styles.setRow}>
                <Text style={styles.copy}>Set {set.setNumber}</Text>
                <Text style={styles.copy}>Reps: {set.reps || "-"}</Text>
                <Text style={styles.copy}>Weight: {set.weight || "-"}</Text>
                <Text style={styles.copy}>{set.isCompleted ? "Completed" : "Pending"}</Text>
              </View>
            ))}
            <Text style={styles.copy}>Notes: {entry.notes || "No notes added"}</Text>
          </SectionCard>
        ))
      )}
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
  summaryRow: {
    gap: spacing.xs,
  },
  exerciseCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    borderColor: colors.border,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  supersetExerciseCard: {
    borderColor: colors.primary,
  },
  supersetHeader: {
    gap: 4,
  },
  supersetLabel: {
    color: colors.primarySoft,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  supersetNotes: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  supersetRest: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  finisherGroupHeader: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    borderColor: colors.accent,
    borderWidth: 1,
    gap: 4,
    padding: spacing.md,
  },
  finisherExerciseCard: {
    borderColor: colors.accent,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  exerciseHeaderButton: {
    gap: 2,
  },
  exerciseLink: {
    color: colors.primarySoft,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  metaLine: {
    color: colors.primarySoft,
    fontSize: 13,
    fontWeight: "600",
  },
  comparisonLine: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  comparisonBlock: {
    gap: 4,
  },
  hintCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    borderColor: colors.border,
    borderWidth: 1,
    gap: 4,
    padding: spacing.md,
  },
  hintTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  hintText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  hintLine: {
    color: colors.primarySoft,
    fontSize: 12,
    lineHeight: 18,
  },
  setRow: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderColor: colors.border,
    borderWidth: 1,
    gap: 4,
    padding: spacing.sm,
  },
});
