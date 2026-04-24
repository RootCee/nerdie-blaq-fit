import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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

const PROGRAM_WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type ProgramTrackerSlot = {
  index: number;
  label: (typeof PROGRAM_WEEKDAY_LABELS)[number];
  date: Date;
  workoutDay: WorkoutDay | null;
  completed: boolean;
  isRestDay: boolean;
};

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

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfProgramWeek(date: Date) {
  const normalized = startOfLocalDay(date);
  const day = normalized.getDay();
  const offset = day === 0 ? -6 : 1 - day;

  return new Date(normalized.getFullYear(), normalized.getMonth(), normalized.getDate() + offset);
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function differenceInCalendarDays(laterDate: Date, earlierDate: Date) {
  return Math.floor((startOfLocalDay(laterDate).getTime() - startOfLocalDay(earlierDate).getTime()) / MS_PER_DAY);
}

function formatShortDate(dateString?: string) {
  if (!dateString) {
    return null;
  }

  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function trimProgramDayTitle(title: string) {
  return title.includes(":") ? title.split(":").slice(1).join(":").trim() : title;
}

function buildScheduledPlan(plan: WorkoutPlan, planStartDate = startOfProgramWeek(new Date()).toISOString()): WorkoutPlan {
  const startDate = startOfLocalDay(new Date(planStartDate));
  const today = startOfLocalDay(new Date());
  const rawDayOffset = differenceInCalendarDays(today, startDate);
  const safeDayOffset = Math.max(rawDayOffset, 0);
  const programLengthWeeks = plan.programLengthWeeks ?? 8;
  const maxWeekIndex = Math.max(programLengthWeeks - 1, 0);
  const currentWeekIndex = Math.min(Math.floor(safeDayOffset / 7), maxWeekIndex);
  const currentProgramDay = ((safeDayOffset % 7) + 7) % 7 + 1;
  const estimatedCompletionDate = addDays(startDate, programLengthWeeks * 7 - 1).toISOString();

  return {
    ...plan,
    planStartDate: startDate.toISOString(),
    programLengthWeeks,
    currentWeekIndex,
    currentProgramDay,
    estimatedCompletionDate,
  };
}

function isCompletedDuringWeek(log: WorkoutDayLog | undefined, weekStart: Date) {
  if (!log?.isCompleted || !log.completedAt) {
    return false;
  }

  const completedAt = startOfLocalDay(new Date(log.completedAt));
  const weekEnd = addDays(weekStart, 6);

  return completedAt >= weekStart && completedAt <= weekEnd;
}

function buildProgramWeekSlots(plan: WorkoutPlan, dayLogs: Record<string, WorkoutDayLog>, weekIndex: number): ProgramTrackerSlot[] {
  const weekStart = addDays(startOfLocalDay(new Date(plan.planStartDate ?? new Date().toISOString())), weekIndex * 7);

  return PROGRAM_WEEKDAY_LABELS.map((label, index) => {
    const workoutDay = index < plan.days.length ? plan.days[index] : null;

    return {
      index,
      label,
      date: addDays(weekStart, index),
      workoutDay,
      completed: workoutDay ? isCompletedDuringWeek(dayLogs[workoutDay.id], weekStart) : false,
      isRestDay: !workoutDay,
    };
  });
}

function buildProgramCalendar(plan: WorkoutPlan, dayLogs: Record<string, WorkoutDayLog>) {
  const weeks = plan.programLengthWeeks ?? 8;

  return Array.from({ length: weeks }, (_, weekOffset) => ({
    weekIndex: weekOffset,
    slots: buildProgramWeekSlots(plan, dayLogs, weekOffset),
  }));
}

export default function WorkoutScreen() {
  const { profile, isComplete } = useOnboardingStore();
  const [completedWorkoutCount, setCompletedWorkoutCount] = useState(0);
  const generatedPlan = useMemo(() => generateWorkoutPlan(profile, completedWorkoutCount), [completedWorkoutCount, profile]);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [dayLogs, setDayLogs] = useState<Record<string, WorkoutDayLog>>({});
  const [selectedProgramDay, setSelectedProgramDay] = useState(0);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const persistenceConfig = getOnboardingPersistenceConfig();
  const scheduledGeneratedPlan = useMemo(
    () => (generatedPlan ? buildScheduledPlan(generatedPlan) : null),
    [generatedPlan],
  );

  const refreshDayLogs = useCallback(async () => {
    if (!isComplete || !scheduledGeneratedPlan) {
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
  }, [isComplete, scheduledGeneratedPlan]);

  useEffect(() => {
    let isMounted = true;

    async function hydratePlan() {
      if (!isComplete || !scheduledGeneratedPlan) {
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
          const hydratedSavedPlan = buildScheduledPlan(savedPlan, savedPlan.planStartDate);
          const isStalePlan = shouldReplaceSavedPlan(savedPlan, scheduledGeneratedPlan);
          const action = isStalePlan ? "replace" : "reuse";

          if (__DEV__) {
            console.log("[workout-screen] loaded saved plan", {
              savedPlanTitle: savedPlan.title,
              savedPlanVersion: savedPlan.version ?? "missing",
              savedPlanWeekIndex: savedPlan.weekIndex ?? "missing",
              savedPlanIntensityPhase: savedPlan.advancedIntensityPhase ?? "missing",
              generatedPlanTitle: scheduledGeneratedPlan.title,
              generatedPlanVersion: scheduledGeneratedPlan.version ?? "missing",
              generatedPlanWeekIndex: scheduledGeneratedPlan.weekIndex ?? "missing",
              generatedPlanIntensityPhase: scheduledGeneratedPlan.advancedIntensityPhase ?? "missing",
              action,
            });
          }

          if (isStalePlan) {
            const replacementPlan = buildScheduledPlan(scheduledGeneratedPlan, savedPlan.planStartDate);

            if (persistenceConfig.isConfigured) {
              await replaceActiveWorkoutPlan(replacementPlan);
            }

            if (__DEV__) {
              console.log("[workout-screen] saved plan replaced", {
                replacedTitle: savedPlan.title,
                replacedVersion: savedPlan.version ?? "missing",
                replacedWeekIndex: savedPlan.weekIndex ?? "missing",
                replacedIntensityPhase: savedPlan.advancedIntensityPhase ?? "missing",
                nextTitle: replacementPlan.title,
                nextVersion: replacementPlan.version ?? "missing",
                nextWeekIndex: replacementPlan.weekIndex ?? "missing",
                nextIntensityPhase: replacementPlan.advancedIntensityPhase ?? "missing",
              });
            }

            if (isMounted) {
              setPlan(replacementPlan);
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
            setPlan(hydratedSavedPlan);
            setError(null);
          }
          return;
        }

        if (persistenceConfig.isConfigured) {
          await saveWorkoutPlan(scheduledGeneratedPlan);
        }

        if (__DEV__) {
          console.log("[workout-screen] generated plan saved", {
            generatedPlanTitle: scheduledGeneratedPlan.title,
            generatedPlanVersion: scheduledGeneratedPlan.version ?? "missing",
            generatedPlanWeekIndex: scheduledGeneratedPlan.weekIndex ?? "missing",
            generatedPlanIntensityPhase: scheduledGeneratedPlan.advancedIntensityPhase ?? "missing",
          });
        }

        if (isMounted) {
          setPlan(scheduledGeneratedPlan);
          setError(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setPlan(scheduledGeneratedPlan);
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
  }, [isComplete, persistenceConfig.isConfigured, scheduledGeneratedPlan]);

  useFocusEffect(
    useCallback(() => {
      void refreshDayLogs();
    }, [refreshDayLogs]),
  );

  const handleRegeneratePlan = async () => {
    if (!scheduledGeneratedPlan) {
      return;
    }

    if (__DEV__) {
      console.log("[workout-screen] regenerating plan", {
        generatedPlanVersion: scheduledGeneratedPlan.version ?? "missing",
        generatedPlanTitle: scheduledGeneratedPlan.title,
        generatedPlanWeekIndex: scheduledGeneratedPlan.weekIndex ?? "missing",
        generatedPlanIntensityPhase: scheduledGeneratedPlan.advancedIntensityPhase ?? "missing",
        action: "force-replace",
      });
    }

    setIsRegenerating(true);

    try {
      if (persistenceConfig.isConfigured) {
        await replaceActiveWorkoutPlan(scheduledGeneratedPlan);
        await deleteAllWorkoutDayLogs();
      }

      setPlan(scheduledGeneratedPlan);
      setDayLogs({});
      setError(null);
    } catch (replaceError) {
      setError(replaceError instanceof Error ? replaceError.message : "Unable to replace the current workout plan.");
    } finally {
      setIsRegenerating(false);
    }
  };

  useEffect(() => {
    if (!plan) {
      return;
    }

    setSelectedProgramDay(Math.min(Math.max((plan.currentProgramDay ?? 1) - 1, 0), 6));
  }, [plan?.planStartDate, plan?.version, plan?.currentProgramDay]);

  if (!isComplete || !scheduledGeneratedPlan) {
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

  const trackerWeekIndex = plan.currentWeekIndex ?? 0;
  const weekSlots = buildProgramWeekSlots(plan, dayLogs, trackerWeekIndex);
  const programCalendar = buildProgramCalendar(plan, dayLogs);
  const selectedSlot = weekSlots[selectedProgramDay] ?? weekSlots[0];
  const selectedDay = selectedSlot?.workoutDay ?? null;
  const todayProgramIndex = Math.min(Math.max((plan.currentProgramDay ?? 1) - 1, 0), 6);
  const currentWeekLabel = `Week ${(plan.currentWeekIndex ?? 0) + 1} of ${plan.programLengthWeeks ?? 8}`;
  const estimatedCompletionLabel = formatShortDate(plan.estimatedCompletionDate);
  const planStartLabel = formatShortDate(plan.planStartDate);
  const selectedDayExercises = selectedDay ? getGroupedExercises(selectedDay) : [];

  return (
    <>
      <Screen title="Session" subtitle="Your current training week, built from your saved profile and setup.">
      <SectionCard title={plan.title} eyebrow="Current Plan">
        <Text style={styles.copy}>{plan.summary}</Text>
        <View style={styles.statsRow}>
          <StatChip label="Days" value={String(plan.trainingDays)} />
          <StatChip label="Goal" value={plan.goal.replace("-", " ")} />
          <StatChip label="Location" value={plan.location} />
          <StatChip label="Level" value={plan.experience} />
        </View>
        <View style={styles.programMetaRow}>
          <Text style={styles.programMetaText}>{currentWeekLabel}</Text>
          <Text style={styles.programMetaText}>
            Program day {plan.currentProgramDay ?? 1} of 7
          </Text>
          {planStartLabel ? <Text style={styles.programMetaText}>Started {planStartLabel}</Text> : null}
          {estimatedCompletionLabel ? <Text style={styles.programMetaText}>Estimated finish {estimatedCompletionLabel}</Text> : null}
        </View>
        <PrimaryButton
          label={isRegenerating ? "Refreshing plan..." : "Refresh plan"}
          onPress={() => void handleRegeneratePlan()}
          variant="ghost"
        />
        <PrimaryButton
          label="View Full Program Calendar"
          onPress={() => setIsCalendarOpen(true)}
          variant="ghost"
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </SectionCard>

      <SectionCard title={currentWeekLabel} eyebrow="Weekly tracker">
        <View style={styles.weekTrackerRow}>
          {weekSlots.map((slot) => {
            const isSelected = selectedSlot?.index === slot.index;
            const isToday = todayProgramIndex === slot.index;
            const cardStyles = [
              styles.weekDayCard,
              slot.isRestDay ? styles.restDayCard : null,
              slot.completed ? styles.completedDayCard : null,
              isToday ? styles.todayDayCard : null,
              isSelected ? styles.selectedDayCard : null,
            ];

            return (
              <Pressable
                key={`${slot.label}-${slot.index}`}
                onPress={() => setSelectedProgramDay(slot.index)}
                style={cardStyles}
              >
                <Text style={styles.weekDayLabel}>{slot.label}</Text>
                <Text style={styles.weekDayDate}>{slot.date.getDate()}</Text>
                <Text style={styles.weekDayTitle} numberOfLines={2}>
                  {slot.workoutDay ? trimProgramDayTitle(slot.workoutDay.title) : "Rest / Recovery Day"}
                </Text>
                <Text style={styles.weekDayStatus}>
                  {slot.isRestDay ? "Rest" : slot.completed ? "Complete" : isLoadingLogs ? "Checking" : "Ready"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard title="Plan notes" eyebrow="How to use this week">
        {plan.notes.map((note) => (
          <Text key={note} style={styles.noteItem}>
            • {note}
          </Text>
        ))}
      </SectionCard>

      {selectedDay ? (
        <SectionCard key={selectedDay.id} title={selectedDay.title} eyebrow={selectedDay.focus}>
          <View style={styles.dayHeaderRow}>
            <View style={[styles.statusBadge, selectedSlot.completed ? styles.completedBadge : styles.pendingBadge]}>
              <Text style={styles.statusText}>
                {selectedSlot.completed ? "Complete" : isLoadingLogs ? "Checking..." : "Ready"}
              </Text>
            </View>
            <PrimaryButton
              label={selectedSlot.completed ? "Update session" : "Start session"}
              onPress={() =>
                router.push({
                  pathname: "/workout-session/[dayId]" as never,
                  params: {
                    dayId: selectedDay.id,
                  } as never,
                } as never)
              }
              variant="ghost"
              style={styles.dayAction}
            />
          </View>
          <Text style={styles.dayNotes}>{selectedDay.notes}</Text>
          {dayLogs[selectedDay.id]?.completedAt ? (
            <Text style={styles.completedAtText}>
              Logged on {new Date(dayLogs[selectedDay.id].completedAt as string).toLocaleDateString()}
            </Text>
          ) : null}

          {selectedDayExercises.map(({ exercise: item, superset, positionInSuperset }) => (
            <View
              key={`${selectedDay.id}-${item.name}`}
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
                  <Text style={styles.supersetRest}>Recovery: {superset.restAfterGroup}</Text>
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

          {selectedDay.coreFinisher ? (
            <View style={styles.coreFinisherCard}>
              <Text style={styles.coreFinisherTitle}>{selectedDay.coreFinisher.title === "Advanced ab block" ? "Blaq Core System" : selectedDay.coreFinisher.title}</Text>
              <Text style={styles.coreFinisherEyebrow}>
                {selectedDay.coreFinisher.emphasis === "front-core-trunk-stability"
                  ? "Front core / trunk stability"
                  : "Obliques / side core"}
              </Text>
              <Text style={styles.exerciseNotes}>{selectedDay.coreFinisher.notes}</Text>
              {selectedDay.coreFinisher.exercises.map((item) => (
                <View key={`${selectedDay.id}-core-${item.name}`} style={styles.coreFinisherExercise}>
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
      ) : (
        <SectionCard title="Rest / Recovery Day" eyebrow="Selected day">
          <Text style={styles.copy}>
            This slot is your recovery day. Use it for mobility, walking, easy stretching, or full rest so the rest of the week stays productive.
          </Text>
        </SectionCard>
      )}
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

      <Modal
        animationType="slide"
        transparent
        visible={isCalendarOpen}
        onRequestClose={() => setIsCalendarOpen(false)}
      >
        <View style={styles.calendarModalBackdrop}>
          <View style={styles.calendarModalCard}>
            <View style={styles.calendarModalHeader}>
              <View style={styles.calendarModalCopy}>
                <Text style={styles.calendarModalTitle}>Full Program Calendar</Text>
                <Text style={styles.calendarModalSubtitle}>
                  {currentWeekLabel}
                  {estimatedCompletionLabel ? ` • Estimated finish ${estimatedCompletionLabel}` : ""}
                </Text>
              </View>
              <Pressable onPress={() => setIsCalendarOpen(false)} style={styles.calendarCloseButton}>
                <Text style={styles.calendarCloseText}>X</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.calendarScrollContent}>
              {programCalendar.map((week) => (
                <View key={`week-${week.weekIndex}`} style={styles.calendarWeekCard}>
                  <Text style={styles.calendarWeekTitle}>
                    Week {week.weekIndex + 1} of {plan.programLengthWeeks ?? 8}
                  </Text>
                  <View style={styles.calendarWeekGrid}>
                    {week.slots.map((slot) => {
                      const isFutureWeek = week.weekIndex > (plan.currentWeekIndex ?? 0);
                      const isCurrentWeek = week.weekIndex === (plan.currentWeekIndex ?? 0);

                      return (
                        <View
                          key={`week-${week.weekIndex}-${slot.index}`}
                          style={[
                            styles.calendarDayCard,
                            slot.isRestDay ? styles.restDayCard : null,
                            slot.completed ? styles.completedDayCard : null,
                            isCurrentWeek && todayProgramIndex === slot.index ? styles.todayDayCard : null,
                            isFutureWeek ? styles.futureDayCard : null,
                          ]}
                        >
                          <Text style={styles.calendarDayLabel}>{slot.label}</Text>
                          <Text style={styles.calendarDayTitle} numberOfLines={3}>
                            {slot.workoutDay ? trimProgramDayTitle(slot.workoutDay.title) : "Rest / Recovery Day"}
                          </Text>
                          <Text style={styles.calendarDayStatus}>
                            {slot.isRestDay ? "Rest" : slot.completed ? "Complete" : isFutureWeek ? "Future" : "Scheduled"}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  programMetaRow: {
    gap: spacing.xs,
  },
  programMetaText: {
    color: colors.primarySoft,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
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
  weekTrackerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  weekDayCard: {
    width: "30%",
    minWidth: 96,
    flexGrow: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 4,
  },
  restDayCard: {
    opacity: 0.88,
  },
  completedDayCard: {
    borderColor: colors.accent,
    backgroundColor: "rgba(20,184,166,0.14)",
  },
  todayDayCard: {
    borderColor: colors.primarySoft,
  },
  selectedDayCard: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  futureDayCard: {
    opacity: 0.72,
  },
  weekDayLabel: {
    color: colors.primarySoft,
    fontSize: 12,
    fontWeight: "700",
  },
  weekDayDate: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  weekDayTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  weekDayStatus: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
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
  calendarModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: spacing.lg,
    justifyContent: "center",
  },
  calendarModalCard: {
    maxHeight: "88%",
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  calendarModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  calendarModalCopy: {
    flex: 1,
    gap: 4,
  },
  calendarModalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  calendarModalSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  calendarCloseButton: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  calendarCloseText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  calendarScrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  calendarWeekCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  calendarWeekTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  calendarWeekGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  calendarDayCard: {
    width: "30%",
    minWidth: 96,
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 4,
  },
  calendarDayLabel: {
    color: colors.primarySoft,
    fontSize: 11,
    fontWeight: "700",
  },
  calendarDayTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  calendarDayStatus: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
});
