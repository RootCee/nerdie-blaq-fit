import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { FormField } from "@/components/ui/FormField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import {
  buildWorkoutDayLog,
  loadWorkoutDayLog,
  replaceWorkoutDayLog,
} from "@/features/workouts/workout-log-persistence";
import { loadActiveWorkoutPlan } from "@/features/workouts/workout-plan-persistence";
import { colors, spacing } from "@/theme";
import { WorkoutDay, WorkoutDayLog } from "@/types/workout";

export default function WorkoutSessionScreen() {
  const params = useLocalSearchParams<{ dayId: string }>();
  const [day, setDay] = useState<WorkoutDay | null>(null);
  const [log, setLog] = useState<WorkoutDayLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function hydrateSession() {
      setIsLoading(true);

      try {
        const plan = await loadActiveWorkoutPlan();
        const selectedDay = plan?.days.find((entry) => entry.id === params.dayId) ?? null;

        if (!selectedDay) {
          throw new Error("This workout day could not be found in your active plan.");
        }

        const existingLog = await loadWorkoutDayLog(selectedDay.id);
        const mergedLog = buildWorkoutDayLog(selectedDay, existingLog);

        if (isMounted) {
          setDay(selectedDay);
          setLog(mergedLog);
          setError(null);
        }
      } catch (sessionError) {
        if (isMounted) {
          setError(sessionError instanceof Error ? sessionError.message : "Unable to load this workout session.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void hydrateSession();

    return () => {
      isMounted = false;
    };
  }, [params.dayId]);

  const updateExerciseLog = (
    exerciseSlug: string,
    field: "completedSets" | "reps" | "weightUsed" | "notes",
    value: string,
  ) => {
    setLog((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        exerciseLogs: current.exerciseLogs.map((entry) =>
          entry.exerciseSlug === exerciseSlug ? { ...entry, [field]: value } : entry,
        ),
      };
    });
  };

  const handleSave = async () => {
    if (!log) {
      return;
    }

    setIsSaving(true);

    try {
      const updatedLog: WorkoutDayLog = {
        ...log,
        isCompleted: true,
        completedAt: new Date().toISOString(),
      };

      await replaceWorkoutDayLog(updatedLog);
      setLog(updatedLog);
      setError(null);
      router.back();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this workout log.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Screen title="Workout session" subtitle="Loading your saved workout details.">
        <SectionCard title="Fetching session" eyebrow="Please wait">
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.copy}>Bringing in your day structure and previous log.</Text>
          </View>
        </SectionCard>
      </Screen>
    );
  }

  if (!day || !log) {
    return (
      <Screen
        title="Workout session"
        subtitle="This session is unavailable right now."
        footer={<PrimaryButton label="Back to workout" onPress={() => router.back()} variant="ghost" />}
      >
        <SectionCard title="Session unavailable" eyebrow="Try again">
          <Text style={styles.copy}>{error ?? "We could not load this workout day."}</Text>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen
      title={day.title}
      subtitle={day.notes}
      footer={
        <View style={styles.footerRow}>
          <PrimaryButton label="Back" onPress={() => router.back()} variant="ghost" style={styles.backButton} />
          <PrimaryButton
            label={isSaving ? "Saving..." : log.isCompleted ? "Update Completed Workout" : "Save Completed Workout"}
            onPress={() => void handleSave()}
            style={styles.saveButton}
          />
        </View>
      }
    >
      <SectionCard title="Session status" eyebrow={day.focus}>
        <Text style={styles.copy}>
          {log.isCompleted && log.completedAt
            ? `Completed on ${new Date(log.completedAt).toLocaleDateString()}`
            : "Not completed yet. Fill in your exercise performance and save when done."}
        </Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </SectionCard>

      {day.exercises.map((exercise, index) => {
        const exerciseLog = log.exerciseLogs[index];
        const exerciseSlug = exerciseLog?.exerciseSlug ?? exercise.slug ?? exercise.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

        return (
          <SectionCard key={`${day.id}-${exercise.name}`} title={exercise.name} eyebrow={`Target: ${exercise.sets} x ${exercise.reps}`}>
            <Text style={styles.helperText}>Rest target: {exercise.restTime}</Text>
            <FormField
              label="Completed sets"
              value={exerciseLog?.completedSets ?? ""}
              onChangeText={(value) =>
                updateExerciseLog(exerciseSlug, "completedSets", value)
              }
              keyboardType="number-pad"
              placeholder={exercise.sets}
            />
            <FormField
              label="Reps performed"
              value={exerciseLog?.reps ?? ""}
              onChangeText={(value) =>
                updateExerciseLog(exerciseSlug, "reps", value)
              }
              placeholder={exercise.reps}
            />
            <FormField
              label="Weight used (optional)"
              value={exerciseLog?.weightUsed ?? ""}
              onChangeText={(value) =>
                updateExerciseLog(exerciseSlug, "weightUsed", value)
              }
              placeholder="25 lb dumbbells"
            />
            <FormField
              label="Notes (optional)"
              value={exerciseLog?.notes ?? ""}
              onChangeText={(value) =>
                updateExerciseLog(exerciseSlug, "notes", value)
              }
              placeholder="Felt strong on the last set"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </SectionCard>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  helperText: {
    color: colors.primarySoft,
    fontSize: 13,
    fontWeight: "600",
  },
  loadingState: {
    alignItems: "flex-start",
    gap: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  backButton: {
    flex: 0.9,
  },
  saveButton: {
    flex: 1.4,
  },
});
