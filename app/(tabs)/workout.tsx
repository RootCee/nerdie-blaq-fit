import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatChip } from "@/components/ui/StatChip";
import { getExerciseDisplayName, toExerciseSlug } from "@/features/workouts/exercise-library";
import { generateWorkoutPlan } from "@/features/workouts/generate-workout-plan";
import { countCompletedWorkoutDays, deleteAllWorkoutDayLogs, loadWorkoutDayLogs } from "@/features/workouts/workout-log-persistence";
import {
  loadActiveWorkoutPlan,
  replaceActiveWorkoutPlan,
  saveWorkoutPlan,
} from "@/features/workouts/workout-plan-persistence";
import { getOnboardingPersistenceConfig } from "@/lib/supabase";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors, spacing } from "@/theme";
import { GroupedWorkoutExerciseDisplay, WorkoutDay, WorkoutDayLog, WorkoutPlan } from "@/types/workout";

function getGroupedExercises(day: WorkoutDay): GroupedWorkoutExerciseDisplay[] {
  const supersetsBySlug = new Map(
    (day.supersets ?? []).flatMap((superset) =>
      superset.exerciseSlugs.map((slug, index) => [slug, { superset, positionInSuperset: index + 1 }] as const),
    ),
  );

  return day.exercises.map((exercise) => {
    const key = exercise.slug ?? toExerciseSlug(exercise.name);
    const match = supersetsBySlug.get(key);

    return {
      exercise,
      superset: match?.superset ?? null,
      positionInSuperset: match?.positionInSuperset ?? null,
    };
  });
}

function shouldReplaceSavedPlan(savedPlan: WorkoutPlan, generatedPlan: WorkoutPlan) {
  return (
    savedPlan.version !== generatedPlan.version ||
    savedPlan.weekIndex !== generatedPlan.weekIndex ||
    savedPlan.advancedIntensityPhase !== generatedPlan.advancedIntensityPhase
  );
}

export default function WorkoutScreen() {
  const { profile, isComplete } = useOnboardingStore();
  const [completedWorkoutCount, setCompletedWorkoutCount] = useState(0);
  const generatedPlan = useMemo(() => generateWorkoutPlan(profile, completedWorkoutCount), [completedWorkoutCount, profile]);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [dayLogs, setDayLogs] = useState<Record<string, WorkoutDayLog>>({});
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const persistenceConfig = getOnboardingPersistenceConfig();

  const refreshDayLogs = useCallback(async () => {
    if (!isComplete || !generatedPlan) {
      setDayLogs({});
      setIsLoadingLogs(false);
      return;
    }

    setIsLoadingLogs(true);

    try {
      const logs = await loadWorkoutDayLogs();
      setDayLogs(logs);
      setCompletedWorkoutCount(countCompletedWorkoutDays(logs));
    } catch (logError) {
      setError(logError instanceof Error ? logError.message : "Unable to load your workout history.");
    } finally {
      setIsLoadingLogs(false);
    }
  }, [generatedPlan, isComplete]);

  useEffect(() => {
    let isMounted = true;

    async function hydratePlan() {
      if (!isComplete || !generatedPlan) {
        if (isMounted) {
          setPlan(null);
          setIsLoadingPlan(false);
          setError(null);
        }
        return;
      }

      setIsLoadingPlan(true);

      try {
        const savedPlan = await loadActiveWorkoutPlan();

        if (savedPlan) {
          const isStalePlan = shouldReplaceSavedPlan(savedPlan, generatedPlan);
          const action = isStalePlan ? "replace" : "reuse";

          if (__DEV__) {
            console.log("[workout-screen] loaded saved plan", {
              savedPlanTitle: savedPlan.title,
              savedPlanVersion: savedPlan.version ?? "missing",
              savedPlanWeekIndex: savedPlan.weekIndex ?? "missing",
              savedPlanIntensityPhase: savedPlan.advancedIntensityPhase ?? "missing",
              generatedPlanTitle: generatedPlan.title,
              generatedPlanVersion: generatedPlan.version ?? "missing",
              generatedPlanWeekIndex: generatedPlan.weekIndex ?? "missing",
              generatedPlanIntensityPhase: generatedPlan.advancedIntensityPhase ?? "missing",
              action,
            });
          }

          if (isStalePlan) {
            if (persistenceConfig.isConfigured) {
              await replaceActiveWorkoutPlan(generatedPlan);
            }

            if (__DEV__) {
              console.log("[workout-screen] saved plan replaced", {
                replacedTitle: savedPlan.title,
                replacedVersion: savedPlan.version ?? "missing",
                replacedWeekIndex: savedPlan.weekIndex ?? "missing",
                replacedIntensityPhase: savedPlan.advancedIntensityPhase ?? "missing",
                nextTitle: generatedPlan.title,
                nextVersion: generatedPlan.version ?? "missing",
                nextWeekIndex: generatedPlan.weekIndex ?? "missing",
                nextIntensityPhase: generatedPlan.advancedIntensityPhase ?? "missing",
              });
            }

            if (isMounted) {
              setPlan(generatedPlan);
              setError(null);
            }
            return;
          }

          if (__DEV__) {
            console.log("[workout-screen] saved plan reused", {
              activeTitle: savedPlan.title,
              activeVersion: savedPlan.version ?? "missing",
              activeWeekIndex: savedPlan.weekIndex ?? "missing",
              activeIntensityPhase: savedPlan.advancedIntensityPhase ?? "missing",
            });
          }

          if (isMounted) {
            setPlan(savedPlan);
            setError(null);
          }
          return;
        }

        if (persistenceConfig.isConfigured) {
          await saveWorkoutPlan(generatedPlan);
        }

        if (__DEV__) {
          console.log("[workout-screen] generated plan saved", {
            generatedPlanTitle: generatedPlan.title,
            generatedPlanVersion: generatedPlan.version ?? "missing",
            generatedPlanWeekIndex: generatedPlan.weekIndex ?? "missing",
            generatedPlanIntensityPhase: generatedPlan.advancedIntensityPhase ?? "missing",
          });
        }

        if (isMounted) {
          setPlan(generatedPlan);
          setError(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setPlan(generatedPlan);
          setError(loadError instanceof Error ? loadError.message : "Unable to load your saved workout plan.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingPlan(false);
        }
      }
    }

    void hydratePlan();

    return () => {
      isMounted = false;
    };
  }, [generatedPlan, isComplete, persistenceConfig.isConfigured]);

  useFocusEffect(
    useCallback(() => {
      void refreshDayLogs();
    }, [refreshDayLogs]),
  );

  const handleRegeneratePlan = async () => {
    if (!generatedPlan) {
      return;
    }

    if (__DEV__) {
      console.log("[workout-screen] regenerating plan", {
        generatedPlanVersion: generatedPlan.version ?? "missing",
        generatedPlanTitle: generatedPlan.title,
        generatedPlanWeekIndex: generatedPlan.weekIndex ?? "missing",
        generatedPlanIntensityPhase: generatedPlan.advancedIntensityPhase ?? "missing",
        action: "force-replace",
      });
    }

    setIsRegenerating(true);

    try {
      if (persistenceConfig.isConfigured) {
        await replaceActiveWorkoutPlan(generatedPlan);
        await deleteAllWorkoutDayLogs();
      }

      setPlan(generatedPlan);
      setDayLogs({});
      setError(null);
    } catch (replaceError) {
      setError(replaceError instanceof Error ? replaceError.message : "Unable to replace the current workout plan.");
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!isComplete || !generatedPlan) {
    return (
      <Screen title="Workout" subtitle="Your weekly training plan shows up here once your setup is complete.">
        <SectionCard title="Your plan starts with onboarding" eyebrow="Finish setup">
          <Text style={styles.copy}>
            Lock in your goal, experience, activity level, and training location so Nerdie Blaq Fit can build your first week with intention.
          </Text>
        </SectionCard>
      </Screen>
    );
  }

  if (isLoadingPlan) {
    return (
      <Screen title="Session" subtitle="Loading your active training plan.">
        <SectionCard title="Pulling up your plan" eyebrow="One sec">
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.copy}>Bringing your saved training week into view.</Text>
          </View>
        </SectionCard>
      </Screen>
    );
  }

  if (!plan) {
    return (
      <Screen title="Session" subtitle="Your plan isn’t available right now.">
        <SectionCard title="Plan not ready yet" eyebrow="Try again">
          <Text style={styles.copy}>
            {error ?? "We couldn’t pull in your training week just yet."}
          </Text>
          <PrimaryButton label="Build plan again" onPress={() => void handleRegeneratePlan()} />
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen title="Session" subtitle="Your current training week, built from your saved profile and setup.">
      <SectionCard title={plan.title} eyebrow="Your current plan">
        <Text style={styles.copy}>{plan.summary}</Text>
        <View style={styles.statsRow}>
          <StatChip label="Days" value={String(plan.trainingDays)} />
          <StatChip label="Goal" value={plan.goal.replace("-", " ")} />
          <StatChip label="Location" value={plan.location} />
          <StatChip label="Level" value={plan.experience} />
        </View>
        <PrimaryButton
          label={isRegenerating ? "Refreshing plan..." : "Refresh plan"}
          onPress={() => void handleRegeneratePlan()}
          variant="ghost"
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </SectionCard>

      <SectionCard title="Plan notes" eyebrow="How to use this week">
        {plan.notes.map((note) => (
          <Text key={note} style={styles.noteItem}>
            • {note}
          </Text>
        ))}
      </SectionCard>

      {plan.days.map((day) => (
        <SectionCard key={day.id} title={day.title} eyebrow={day.focus}>
          <View style={styles.dayHeaderRow}>
            <View style={[styles.statusBadge, dayLogs[day.id]?.isCompleted ? styles.completedBadge : styles.pendingBadge]}>
              <Text style={styles.statusText}>
                {dayLogs[day.id]?.isCompleted ? "Complete" : isLoadingLogs ? "Checking..." : "Ready"}
              </Text>
            </View>
            <PrimaryButton
              label={dayLogs[day.id]?.isCompleted ? "Update session" : "Start session"}
              onPress={() =>
                router.push({
                  pathname: "/workout-session/[dayId]" as never,
                  params: {
                    dayId: day.id,
                  } as never,
                } as never)
              }
              variant="ghost"
              style={styles.dayAction}
            />
          </View>
          <Text style={styles.dayNotes}>{day.notes}</Text>
          {dayLogs[day.id]?.completedAt ? (
            <Text style={styles.completedAtText}>
              Logged on {new Date(dayLogs[day.id].completedAt as string).toLocaleDateString()}
            </Text>
          ) : null}

          {getGroupedExercises(day).map(({ exercise: item, superset, positionInSuperset }) => (
            <View
              key={`${day.id}-${item.name}`}
              style={[
                styles.exerciseCard,
                superset ? styles.supersetExerciseCard : null,
              ]}
            >
              {superset ? (
                <View style={styles.supersetHeader}>
                  <Text style={styles.supersetLabel}>
                    {superset.title} • Move {positionInSuperset} of {superset.exerciseSlugs.length}
                  </Text>
                  <Text style={styles.supersetNotes}>{superset.notes}</Text>
                  <Text style={styles.supersetRest}>Rest: {superset.restAfterGroup}</Text>
                </View>
              ) : null}
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/exercise/[slug]" as never,
                    params: {
                      slug: item.slug ?? toExerciseSlug(item.name),
                      name: item.name,
                    } as never,
                  } as never)
                }
              >
                <Text style={styles.exerciseName}>{item.displayName ?? getExerciseDisplayName(item.name) ?? item.name}</Text>
                <Text style={styles.exerciseLink}>View movement notes</Text>
              </Pressable>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>Sets: {item.sets}</Text>
                <Text style={styles.metaText}>Reps: {item.reps}</Text>
                <Text style={styles.metaText}>Recovery: {item.restTime}</Text>
              </View>
              <Text style={styles.exerciseNotes}>{item.notes}</Text>
            </View>
          ))}

          {day.coreFinisher ? (
            <View style={styles.coreFinisherCard}>
              <Text style={styles.coreFinisherTitle}>{day.coreFinisher.title === "Advanced ab block" ? "Blaq Core System" : day.coreFinisher.title}</Text>
              <Text style={styles.coreFinisherEyebrow}>
                {day.coreFinisher.emphasis === "front-core-trunk-stability"
                  ? "Front core / trunk stability"
                  : "Obliques / side core"}
              </Text>
              <Text style={styles.exerciseNotes}>{day.coreFinisher.notes}</Text>
              {day.coreFinisher.exercises.map((item) => (
                <View key={`${day.id}-core-${item.name}`} style={styles.coreFinisherExercise}>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/exercise/[slug]" as never,
                        params: {
                          slug: item.slug ?? toExerciseSlug(item.name),
                          name: item.name,
                        } as never,
                      } as never)
                    }
                  >
                    <Text style={styles.exerciseName}>{item.displayName ?? getExerciseDisplayName(item.name) ?? item.name}</Text>
                    <Text style={styles.exerciseLink}>View movement notes</Text>
                  </Pressable>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>Sets: {item.sets}</Text>
                    <Text style={styles.metaText}>Reps: {item.reps}</Text>
                    <Text style={styles.metaText}>Recovery: {item.restTime}</Text>
                  </View>
                  <Text style={styles.exerciseNotes}>{item.notes}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </SectionCard>
      ))}
      <SectionCard title="Built from your profile" eyebrow="Your source data">
        <Text style={styles.copy}>
          Goal: {profile.fitnessGoal?.replace("-", " ")} | Experience: {profile.workoutExperience} | Location:{" "}
          {profile.workoutLocation}
        </Text>
        <Text style={styles.copy}>
          Equipment: {profile.availableEquipment.length ? profile.availableEquipment.join(", ") : "none"}
        </Text>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  loadingState: {
    alignItems: "flex-start",
    gap: spacing.md,
  },
  noteItem: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  dayHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  completedBadge: {
    backgroundColor: "rgba(20,184,166,0.14)",
    borderColor: colors.accent,
  },
  pendingBadge: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  statusText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  dayAction: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  dayNotes: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  completedAtText: {
    color: colors.primarySoft,
    fontSize: 12,
    fontWeight: "600",
  },
  exerciseCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  supersetExerciseCard: {
    borderColor: colors.primary,
  },
  supersetHeader: {
    gap: 2,
  },
  supersetLabel: {
    color: colors.primarySoft,
    fontSize: 12,
    fontWeight: "700",
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
  },
  exerciseName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  exerciseLink: {
    color: colors.primarySoft,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metaText: {
    color: colors.primarySoft,
    fontSize: 13,
    fontWeight: "600",
  },
  exerciseNotes: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  coreFinisherCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    borderColor: colors.accent,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  coreFinisherTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  coreFinisherEyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  coreFinisherExercise: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
});
