import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { FormField } from "@/components/ui/FormField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { loadTodayBodyWeight, saveTodayBodyWeight } from "@/features/body-weight/body-weight-persistence";
import { getExerciseDisplayName, toExerciseSlug } from "@/features/workouts/exercise-library";
import {
  buildWorkoutDayLog,
  deriveWorkoutVolumeSummary,
  loadWorkoutDayLog,
  loadMostRecentPriorExerciseLogs,
  replaceWorkoutDayLog,
} from "@/features/workouts/workout-log-persistence";
import { loadActiveWorkoutPlan } from "@/features/workouts/workout-plan-persistence";
import { colors, spacing } from "@/theme";
import {
  GroupedWorkoutExerciseDisplay,
  WorkoutDay,
  WorkoutDayLog,
  WorkoutExercise,
  WorkoutPreviousVsTodayComparison,
  WorkoutPriorPerformanceSummary,
  WorkoutSetLog,
  WorkoutSupersetGroup,
  WorkoutVolumeSummary,
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

function parseNumericValue(value: string) {
  const numeric = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function deriveBestSetToday(sets: WorkoutSetLog[]): string | null {
  const completed = sets.filter((s) => s.isCompleted);
  if (completed.length === 0) return null;

  const best = completed.reduce((current, candidate) => {
    const cw = parseNumericValue(current.weight);
    const cand_w = parseNumericValue(candidate.weight);
    if (cand_w > cw) return candidate;
    if (cand_w < cw) return current;
    const cr = parseNumericValue(current.reps);
    const cand_r = parseNumericValue(candidate.reps);
    if (cand_r > cr) return candidate;
    if (cand_r < cr) return current;
    return cand_w * cand_r >= cw * cr ? candidate : current;
  });

  const weight = parseNumericValue(best.weight);
  const reps = parseNumericValue(best.reps);
  if (weight === 0 && reps === 0) return null;
  if (weight === 0) return `${reps} rep${reps !== 1 ? "s" : ""}`;
  return `${weight} lb × ${reps}`;
}

export default function WorkoutSessionScreen() {
  const params = useLocalSearchParams<{ dayId: string }>();
  const [day, setDay] = useState<WorkoutDay | null>(null);
  const [log, setLog] = useState<WorkoutDayLog | null>(null);
  const [todayWeight, setTodayWeight] = useState("");
  const [savedTodayWeight, setSavedTodayWeight] = useState("");
  const [weightUpdatedAt, setWeightUpdatedAt] = useState<string | null>(null);
  const [priorPerformanceByExercise, setPriorPerformanceByExercise] = useState<Record<string, WorkoutPriorPerformanceSummary>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingWeight, setIsSavingWeight] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weightError, setWeightError] = useState<string | null>(null);

  const handleExercisePress = (name: string, slug?: string) => {
    const resolvedSlug = slug ?? toExerciseSlug(name);

    if (__DEV__) {
      console.log("[workout-session] exercise slug tapped", resolvedSlug);
    }

    router.push({
      pathname: "/exercise/[slug]" as never,
      params: { slug: resolvedSlug, name } as never,
    } as never);

    if (__DEV__) {
      console.log("[workout-session] route pushed", {
        pathname: "/exercise/[slug]",
        slug: resolvedSlug,
      });
    }
  };

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

        const [existingLog, todayWeightLog, priorPerformance] = await Promise.all([
          loadWorkoutDayLog(selectedDay.id),
          loadTodayBodyWeight(),
          loadMostRecentPriorExerciseLogs(
            [...selectedDay.exercises, ...(selectedDay.coreFinisher?.exercises ?? [])].map(
              (exercise) => exercise.slug ?? exercise.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            ),
            selectedDay.id,
          ),
        ]);
        const mergedLog = buildWorkoutDayLog(selectedDay, existingLog);

        if (isMounted) {
          setDay(selectedDay);
          setLog(mergedLog);
          setPriorPerformanceByExercise(priorPerformance);
          setTodayWeight(todayWeightLog ? String(todayWeightLog.weight) : "");
          setSavedTodayWeight(todayWeightLog ? String(todayWeightLog.weight) : "");
          setWeightUpdatedAt(todayWeightLog?.updatedAt ?? null);
          setError(null);
          setWeightError(null);
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

  const updateExerciseNotes = (exerciseSlug: string, value: string) => {
    setLog((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        exerciseLogs: current.exerciseLogs.map((entry) =>
          entry.exerciseSlug === exerciseSlug ? { ...entry, notes: value } : entry,
        ),
      };
    });
  };

  const updateSetLog = (
    exerciseSlug: string,
    setNumber: number,
    field: keyof Pick<WorkoutSetLog, "reps" | "weight" | "isCompleted">,
    value: string | boolean,
  ) => {
    setLog((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        exerciseLogs: current.exerciseLogs.map((entry) =>
          entry.exerciseSlug === exerciseSlug
            ? {
                ...entry,
                sets: entry.sets.map((set) =>
                  set.setNumber === setNumber ? { ...set, [field]: value } : set,
                ),
              }
            : entry,
        ),
      };
    });
  };

  const copyLastPerformance = (exerciseSlug: string) => {
    const priorPerformance = priorPerformanceByExercise[exerciseSlug];

    if (!priorPerformance) {
      return;
    }

    setLog((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        exerciseLogs: current.exerciseLogs.map((entry) =>
          entry.exerciseSlug === exerciseSlug
            ? {
                ...entry,
                sets: entry.sets.map((set) => {
                  const previousSet = priorPerformance.sets.find((item) => item.setNumber === set.setNumber);

                  if (!previousSet) {
                    return set;
                  }

                  return {
                    ...set,
                    reps: previousSet.reps,
                    weight: previousSet.weight,
                  };
                }),
              }
            : entry,
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
      if (todayWeight.trim() && todayWeight.trim() !== savedTodayWeight.trim()) {
        const savedWeight = await saveTodayBodyWeight(todayWeight);
        setSavedTodayWeight(savedWeight ? String(savedWeight.weight) : todayWeight.trim());
        setTodayWeight(savedWeight ? String(savedWeight.weight) : todayWeight.trim());
        setWeightUpdatedAt(savedWeight?.updatedAt ?? new Date().toISOString());
        setWeightError(null);
      }

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

  const handleSaveTodayWeight = async () => {
    setIsSavingWeight(true);

    try {
      const savedWeight = await saveTodayBodyWeight(todayWeight);

      if (!savedWeight) {
        throw new Error("Body-weight logging is unavailable until Supabase is configured.");
      }

      setTodayWeight(String(savedWeight.weight));
      setSavedTodayWeight(String(savedWeight.weight));
      setWeightUpdatedAt(savedWeight.updatedAt);
      setWeightError(null);
    } catch (saveError) {
      setWeightError(saveError instanceof Error ? saveError.message : "Unable to save today's body weight.");
    } finally {
      setIsSavingWeight(false);
    }
  };

  if (isLoading) {
    return (
      <Screen title="Workout session" subtitle="Loading your session setup.">
        <SectionCard title="Getting your session ready" eyebrow="One sec">
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.copy}>Pulling in your workout structure, saved sets, and last performance data.</Text>
          </View>
        </SectionCard>
      </Screen>
    );
  }

  if (!day || !log) {
    return (
      <Screen
        title="Workout session"
        subtitle="This session isn’t available right now."
        footer={<PrimaryButton label="Back to workout" onPress={() => router.back()} variant="ghost" />}
      >
        <SectionCard title="Session not ready" eyebrow="Try again">
          <Text style={styles.copy}>{error ?? "We couldn’t load this workout day right now."}</Text>
        </SectionCard>
      </Screen>
    );
  }

  const volumeSummary: WorkoutVolumeSummary = deriveWorkoutVolumeSummary(log);
  const groupedExercises = getGroupedExercises(day);

  const renderExerciseLogger = (
    exercise: WorkoutExercise,
    options?: {
      superset?: WorkoutSupersetGroup | null;
      positionInSuperset?: number | null;
      containerStyle?: object;
      showSupersetHeader?: boolean;
    },
  ) => {
    const exerciseSlug = exercise.slug ?? exercise.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const exerciseLog = log.exerciseLogs.find((entry) => entry.exerciseSlug === exerciseSlug);
    const exerciseSummary = volumeSummary.exercises.find((entry) => entry.exerciseSlug === exerciseSlug);
    const priorPerformance = priorPerformanceByExercise[exerciseSlug];
    const bestSetToday = exerciseLog ? deriveBestSetToday(exerciseLog.sets) : null;
    const previousVsToday: WorkoutPreviousVsTodayComparison | null =
      priorPerformance && exerciseLog
        ? {
            exerciseSlug,
            previousTopWeight: priorPerformance.topWeight,
            currentTopWeight: exerciseLog.sets.reduce((max, set) => {
              if (!set.isCompleted) {
                return max;
              }

              return Math.max(max, parseNumericValue(set.weight));
            }, 0),
            previousCompletedReps: priorPerformance.totalCompletedReps,
            currentCompletedReps: exerciseLog.sets.reduce((sum, set) => {
              if (!set.isCompleted) {
                return sum;
              }

              return sum + parseNumericValue(set.reps);
            }, 0),
            previousTotalVolume: priorPerformance.sets.reduce((sum, set) => {
              if (!set.isCompleted) {
                return sum;
              }

              return sum + parseNumericValue(set.reps) * parseNumericValue(set.weight);
            }, 0),
            currentTotalVolume: exerciseLog.sets.reduce((sum, set) => {
              if (!set.isCompleted) {
                return sum;
              }

              return sum + parseNumericValue(set.reps) * parseNumericValue(set.weight);
            }, 0),
          }
        : null;

    return (
      <View
        key={`${day.id}-${exerciseSlug}`}
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
        <Pressable onPress={() => handleExercisePress(exercise.name, exercise.slug)} style={styles.exerciseHeaderButton}>
          <Text style={styles.exerciseCardTitle}>{exercise.displayName ?? getExerciseDisplayName(exercise.name) ?? exercise.name}</Text>
          <Text style={styles.exerciseLink}>View movement notes</Text>
        </Pressable>
        <Text style={styles.helperText}>Target: {exercise.sets} x {exercise.reps}</Text>
        <Text style={styles.helperText}>Rest target: {exercise.restTime}</Text>
        <View style={styles.exerciseSummaryRow}>
          <Text style={styles.exerciseSummaryText}>
            Exercise volume: {exerciseSummary?.totalVolume ?? 0}
          </Text>
          <Text style={styles.exerciseSummaryText}>
            Completed: {exerciseSummary?.totalCompletedSets ?? 0} sets / {exerciseSummary?.totalCompletedReps ?? 0} reps
          </Text>
        </View>
        {priorPerformance ? (
          <View style={styles.previousPerformanceCard}>
            <Text style={styles.previousPerformanceTitle}>Last performance</Text>
            <Text style={styles.previousPerformanceText}>
              {new Date(priorPerformance.completedAt).toLocaleDateString()} • {priorPerformance.totalCompletedSets} sets • {priorPerformance.totalCompletedReps} reps
              {priorPerformance.topWeight ? ` • up to ${priorPerformance.topWeight}` : ""}
            </Text>
            <Text style={styles.previousPerformanceText}>{priorPerformance.dayTitle}</Text>
            <PrimaryButton
              label="Copy Last Performance"
              onPress={() => copyLastPerformance(exerciseSlug)}
              variant="ghost"
              style={styles.copyButton}
            />
          </View>
        ) : (
          <Text style={styles.previousPerformanceEmpty}>No saved performance to copy yet for this movement.</Text>
        )}
        {previousVsToday ? (
          <View style={styles.comparisonCard}>
            <Text style={styles.comparisonTitle}>Previous vs today</Text>
            <Text style={styles.comparisonText}>
              Top weight: {previousVsToday.previousTopWeight || 0} → {previousVsToday.currentTopWeight || 0}
            </Text>
            <Text style={styles.comparisonText}>
              Completed reps: {previousVsToday.previousCompletedReps} → {previousVsToday.currentCompletedReps}
            </Text>
            <Text style={styles.comparisonText}>
              Total volume: {previousVsToday.previousTotalVolume} → {previousVsToday.currentTotalVolume}
            </Text>
            <Text style={styles.comparisonHint}>
              Use this as a quick checkpoint, not a grade. Clean reps still lead the way.
            </Text>
          </View>
        ) : null}
        {exerciseLog?.sets.map((set) => (
          <View key={`${exerciseSlug}-${set.setNumber}`} style={styles.setCard}>
            <View style={styles.setHeaderRow}>
              <Text style={styles.setTitle}>Set {set.setNumber}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: set.isCompleted }}
                onPress={() =>
                  updateSetLog(exerciseSlug, set.setNumber, "isCompleted", !set.isCompleted)
                }
                style={[styles.statusPill, set.isCompleted ? styles.statusPillActive : null]}
              >
                <Text style={[styles.statusPillText, set.isCompleted ? styles.statusPillTextActive : null]}>
                  {set.isCompleted ? "Completed" : "Pending"}
                </Text>
              </Pressable>
            </View>
            <FormField
              label="Reps"
              value={set.reps}
              onChangeText={(value) => updateSetLog(exerciseSlug, set.setNumber, "reps", value)}
              keyboardType="number-pad"
              placeholder={exercise.reps}
            />
            <FormField
              label="Weight"
              value={set.weight}
              onChangeText={(value) => updateSetLog(exerciseSlug, set.setNumber, "weight", value)}
              placeholder="25"
            />
          </View>
        ))}
        {bestSetToday ? (
          <Text style={styles.bestSetToday}>Best set today: {bestSetToday}</Text>
        ) : null}
        <FormField
          label="Notes (optional)"
          value={exerciseLog?.notes ?? ""}
          onChangeText={(value) => updateExerciseNotes(exerciseSlug, value)}
          placeholder="Felt strong on the last set"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>
    );
  };

  return (
    <Screen
      title={day.title}
      subtitle={day.notes}
      footer={
        <View style={styles.footerRow}>
          <PrimaryButton label="Back" onPress={() => router.back()} variant="ghost" style={styles.backButton} />
          <PrimaryButton
            label={isSaving ? "Saving session..." : log.isCompleted ? "Update session log" : "Save session log"}
            onPress={() => void handleSave()}
            style={styles.saveButton}
          />
        </View>
      }
    >
      <SectionCard title="Today’s weight" eyebrow="Daily check-in">
        <Text style={styles.copy}>
          Log today&apos;s body weight before training. It stays separate from your session log and can be updated once per day.
        </Text>
        <FormField
          label="Today’s weight"
          value={todayWeight}
          onChangeText={setTodayWeight}
          keyboardType="decimal-pad"
          placeholder="185.4"
          helper="Use the same unit you normally use in your profile."
        />
        <View style={styles.weightRow}>
          <PrimaryButton
            label={isSavingWeight ? "Saving weight..." : savedTodayWeight ? "Update today’s weight" : "Save today’s weight"}
            onPress={() => void handleSaveTodayWeight()}
            variant="ghost"
            style={styles.weightButton}
          />
          <View style={styles.weightMeta}>
            <Text style={styles.weightMetaText}>
              {savedTodayWeight
                ? `Saved check-in: ${savedTodayWeight}`
                : "No weigh-in saved for today yet."}
            </Text>
            {weightUpdatedAt ? (
              <Text style={styles.weightMetaText}>
                Updated {new Date(weightUpdatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </Text>
            ) : null}
          </View>
        </View>
        {weightError ? <Text style={styles.errorText}>{weightError}</Text> : null}
      </SectionCard>

      <SectionCard title="Session status" eyebrow={day.focus}>
        <Text style={styles.copy}>
          {log.isCompleted && log.completedAt
            ? `Logged on ${new Date(log.completedAt).toLocaleDateString()}`
            : "Track your sets as you go, then save the session when you’re done."}
        </Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Completed sets</Text>
            <Text style={styles.summaryValue}>{volumeSummary.totalCompletedSets}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Completed reps</Text>
            <Text style={styles.summaryValue}>{volumeSummary.totalCompletedReps}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Workout volume</Text>
            <Text style={styles.summaryValue}>{volumeSummary.totalWorkoutVolume}</Text>
          </View>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </SectionCard>

      <SectionCard title="Main work" eyebrow="Train through the day">
        {groupedExercises.map(({ exercise, superset, positionInSuperset }) =>
          renderExerciseLogger(exercise, {
            superset,
            positionInSuperset,
            showSupersetHeader: Boolean(superset),
          }),
        )}
      </SectionCard>

      {day.coreFinisher ? (
        <SectionCard title={day.coreFinisher.title} eyebrow="Finish strong, stay fresh">
          <Text style={styles.copy}>
            {day.coreFinisher.emphasis === "front-core-trunk-stability"
              ? "Front core / trunk stability"
              : "Obliques / side core"}
          </Text>
          <Text style={styles.copy}>{day.coreFinisher.notes}</Text>
          <View style={styles.finisherGroupHeader}>
            <Text style={styles.supersetLabel}>Core finisher superset</Text>
            <Text style={styles.supersetNotes}>Move through both finisher drills before taking the full rest.</Text>
            <Text style={styles.supersetRest}>Rest after group: 30 sec after both exercises</Text>
          </View>
          {day.coreFinisher.exercises.map((exercise) =>
            renderExerciseLogger(exercise, {
              containerStyle: styles.finisherExerciseCard,
            }),
          )}
        </SectionCard>
      ) : null}
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
  exerciseCardTitle: {
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
  weightRow: {
    gap: spacing.sm,
  },
  weightButton: {
    minHeight: 48,
  },
  weightMeta: {
    gap: 4,
  },
  weightMetaText: {
    color: colors.primarySoft,
    fontSize: 12,
    lineHeight: 18,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  summaryCard: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    minWidth: 112,
    padding: spacing.sm,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  exerciseSummaryRow: {
    gap: 4,
  },
  exerciseSummaryText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  previousPerformanceCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    borderColor: colors.border,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  previousPerformanceTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  previousPerformanceText: {
    color: colors.primarySoft,
    fontSize: 12,
    lineHeight: 18,
  },
  previousPerformanceEmpty: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  copyButton: {
    minHeight: 42,
    marginTop: spacing.xs,
  },
  comparisonCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    borderColor: colors.border,
    borderWidth: 1,
    gap: 4,
    padding: spacing.md,
  },
  comparisonTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  comparisonText: {
    color: colors.primarySoft,
    fontSize: 12,
    lineHeight: 18,
  },
  comparisonHint: {
    color: colors.textMuted,
    fontSize: 12,
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
  setCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    borderColor: colors.border,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  setHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  setTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  statusPill: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  statusPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusPillText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  statusPillTextActive: {
    color: colors.background,
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
  bestSetToday: {
    color: colors.accentSoft,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },
});
