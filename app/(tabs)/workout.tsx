import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatChip } from "@/components/ui/StatChip";
import { toExerciseSlug } from "@/features/workouts/exercise-library";
import { generateWorkoutPlan } from "@/features/workouts/generate-workout-plan";
import { deleteAllWorkoutDayLogs, loadWorkoutDayLogs } from "@/features/workouts/workout-log-persistence";
import {
  loadActiveWorkoutPlan,
  replaceActiveWorkoutPlan,
  saveWorkoutPlan,
} from "@/features/workouts/workout-plan-persistence";
import { getOnboardingPersistenceConfig } from "@/lib/supabase";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors, spacing } from "@/theme";
import { WorkoutDayLog, WorkoutPlan } from "@/types/workout";

export default function WorkoutScreen() {
  const { profile, isComplete } = useOnboardingStore();
  const generatedPlan = useMemo(() => generateWorkoutPlan(profile), [profile]);
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
          if (isMounted) {
            setPlan(savedPlan);
            setError(null);
          }
          return;
        }

        if (persistenceConfig.isConfigured) {
          await saveWorkoutPlan(generatedPlan);
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
      <Screen title="Workout" subtitle="Your weekly plan appears here once onboarding is complete and your training preferences are set.">
        <SectionCard title="No plan yet" eyebrow="Complete onboarding">
          <Text style={styles.copy}>
            Finish onboarding with your goal, experience, activity level, and workout location so Nerdie Blaq Fit can build your first weekly training split.
          </Text>
        </SectionCard>
      </Screen>
    );
  }

  if (isLoadingPlan) {
    return (
      <Screen title="Workout" subtitle="Loading your active training plan.">
        <SectionCard title="Fetching plan" eyebrow="Please wait">
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.copy}>Bringing in your saved weekly plan.</Text>
          </View>
        </SectionCard>
      </Screen>
    );
  }

  if (!plan) {
    return (
      <Screen title="Workout" subtitle="Your plan could not be loaded right now.">
        <SectionCard title="Plan unavailable" eyebrow="Try again">
          <Text style={styles.copy}>
            {error ?? "We could not load or generate your workout plan just yet."}
          </Text>
          <PrimaryButton label="Regenerate Plan" onPress={() => void handleRegeneratePlan()} />
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen title="Workout" subtitle="A deterministic weekly plan built from your saved profile and current training setup.">
      <SectionCard title={plan.title} eyebrow="Generated weekly plan">
        <Text style={styles.copy}>{plan.summary}</Text>
        <View style={styles.statsRow}>
          <StatChip label="Days" value={String(plan.trainingDays)} />
          <StatChip label="Goal" value={plan.goal.replace("-", " ")} />
          <StatChip label="Location" value={plan.location} />
          <StatChip label="Level" value={plan.experience} />
        </View>
        <PrimaryButton
          label={isRegenerating ? "Regenerating..." : "Regenerate Plan"}
          onPress={() => void handleRegeneratePlan()}
          variant="ghost"
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </SectionCard>

      <SectionCard title="Plan notes" eyebrow="How to use it">
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
                {dayLogs[day.id]?.isCompleted ? "Completed" : isLoadingLogs ? "Loading..." : "Pending"}
              </Text>
            </View>
            <PrimaryButton
              label={dayLogs[day.id]?.isCompleted ? "Update Log" : "Log Workout"}
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
              Finished on {new Date(dayLogs[day.id].completedAt as string).toLocaleDateString()}
            </Text>
          ) : null}

          {day.exercises.map((item) => (
            <View key={`${day.id}-${item.name}`} style={styles.exerciseCard}>
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
                <Text style={styles.exerciseName}>{item.name}</Text>
                <Text style={styles.exerciseLink}>Open exercise details</Text>
              </Pressable>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>Sets: {item.sets}</Text>
                <Text style={styles.metaText}>Reps: {item.reps}</Text>
                <Text style={styles.metaText}>Rest: {item.restTime}</Text>
              </View>
              <Text style={styles.exerciseNotes}>{item.notes}</Text>
            </View>
          ))}
        </SectionCard>
      ))}
      <SectionCard title="Built from your profile" eyebrow="Source of truth">
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
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
});
