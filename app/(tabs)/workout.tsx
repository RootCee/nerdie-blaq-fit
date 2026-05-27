import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, InteractionManager, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { DailyReadinessCheckIn } from "@/components/workouts/DailyReadinessCheckIn";
import { ProLockCard } from "@/components/ProLockCard";
import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatChip } from "@/components/ui/StatChip";
import { TRAINING_PATHS, getTrainingPathById, recommendTrainingPath } from "@/config/trainingPaths";
import { TRAINING_FOCUSES, getTrainingFocusById } from "@/config/trainingFocus";
import { getExerciseDisplayName, toExerciseSlug } from "@/features/workouts/exercise-library";
import { createDefaultDailyCheckIn, loadDailyCheckIn, saveDailyCheckIn } from "@/features/workouts/daily-checkin-persistence";
import { generateWorkoutPlan } from "@/features/workouts/generate-workout-plan";
import { countCompletedWorkoutDays, deleteAllWorkoutDayLogs, loadWorkoutDayLogs } from "@/features/workouts/workout-log-persistence";
import {
  loadActiveWorkoutPlan,
  replaceActiveWorkoutPlan,
  saveWorkoutPlan,
} from "@/features/workouts/workout-plan-persistence";
import { getScheduledWorkoutLogId, getWorkoutDayForWeekday, PROGRAM_WEEKDAY_LABELS } from "@/features/workouts/workout-schedule";
import { getOnboardingPersistenceConfig } from "@/lib/supabase";
import { adaptWorkoutWithGeminiCoach } from "@/lib/ai/geminiTrainingCoach";
import { AdaptiveTrainingResult, adaptWorkoutForReadiness } from "@/lib/adaptiveTraining";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useSubscription } from "@/store/subscription-store";
import { colors, spacing } from "@/theme";
import { WorkoutDay, WorkoutDayLog, WorkoutExercise, WorkoutPlan, WorkoutSupersetGroup } from "@/types/workout";
import { DailyReadinessCheckIn as DailyReadinessCheckInValue } from "@/types/readiness";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type ProgramTrackerSlot = {
  index: number;
  weekIndex: number;
  label: (typeof PROGRAM_WEEKDAY_LABELS)[number];
  date: Date;
  workoutDay: WorkoutDay | null;
  workoutLogId: string | null;
  completed: boolean;
  isRestDay: boolean;
};

type PendingWorkoutRoute =
  | {
      pathname: "/exercise/[slug]";
      params: { slug: string; name: string };
    }
  | {
      pathname: "/workout-session/[dayId]";
      params: { dayId: string; weekIndex?: string };
    };

type WorkoutFlowGroup = {
  id: string;
  superset: WorkoutSupersetGroup | null;
  entries: Array<{
    exercise: WorkoutExercise;
    positionInSuperset: number | null;
  }>;
};

function getWorkoutFlowGroups(day: WorkoutDay): WorkoutFlowGroup[] {
  const exerciseBySlug = new Map(
    day.exercises.map((exercise) => [exercise.slug ?? toExerciseSlug(exercise.name), exercise]),
  );
  const supersetsBySlug = new Map(
    (day.supersets ?? []).flatMap((superset) =>
      superset.exerciseSlugs.map((slug, index) => [slug, { superset, positionInSuperset: index + 1 }] as const),
    ),
  );
  const renderedSupersetIds = new Set<string>();

  return day.exercises.reduce<WorkoutFlowGroup[]>((groups, exercise) => {
    const slug = exercise.slug ?? toExerciseSlug(exercise.name);
    const match = supersetsBySlug.get(slug);

    if (!match) {
      groups.push({
        id: slug,
        superset: null,
        entries: [{ exercise, positionInSuperset: null }],
      });
      return groups;
    }

    if (renderedSupersetIds.has(match.superset.id)) {
      return groups;
    }

    renderedSupersetIds.add(match.superset.id);

    groups.push({
      id: match.superset.id,
      superset: match.superset,
      entries: match.superset.exerciseSlugs
        .map((exerciseSlug, index) => {
          const supersetExercise = exerciseBySlug.get(exerciseSlug);
          return supersetExercise
            ? { exercise: supersetExercise, positionInSuperset: index + 1 }
            : null;
        })
        .filter((entry): entry is { exercise: WorkoutExercise; positionInSuperset: number } => Boolean(entry)),
    });
    return groups;
  }, []);
}

function shouldReplaceSavedPlan(savedPlan: WorkoutPlan, generatedPlan: WorkoutPlan) {
  return (
    savedPlan.version !== generatedPlan.version ||
    savedPlan.title !== generatedPlan.title ||
    savedPlan.trainingDays !== generatedPlan.trainingDays ||
    savedPlan.trainingFocusId !== generatedPlan.trainingFocusId ||
    savedPlan.programLengthWeeks !== generatedPlan.programLengthWeeks ||
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

function getTodayActionCopy(hasAdaptiveWorkout: boolean, hasWorkoutToday: boolean) {
  if (!hasWorkoutToday) {
    return "Today is a recovery slot. Keep the calendar handy and let recovery do its job.";
  }

  if (hasAdaptiveWorkout) {
    return "Your readiness check-in is connected to today's workout. Review the adjustment, then start the session.";
  }

  return "Choose your path, complete readiness, then save it. You can generate an adaptive workout or start the planned session.";
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
    const workoutDay = getWorkoutDayForWeekday(plan, index);
    const workoutLogId = workoutDay ? getScheduledWorkoutLogId(workoutDay.id, weekIndex) : null;
    const scheduledLog = workoutLogId ? dayLogs[workoutLogId] : undefined;
    const legacyLog = workoutDay ? dayLogs[workoutDay.id] : undefined;

    return {
      index,
      weekIndex,
      label,
      date: addDays(weekStart, index),
      workoutDay,
      workoutLogId,
      completed: workoutDay ? isCompletedDuringWeek(scheduledLog, weekStart) || isCompletedDuringWeek(legacyLog, weekStart) : false,
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

function getReadinessLabel(score: number) {
  if (score >= 80) return "Ready";
  if (score >= 60) return "Steady";
  if (score >= 45) return "Scale";
  return "Recover";
}

function getPlainAdjustment(result: AdaptiveTrainingResult) {
  if (result.volumeAdjustment < 0.8) {
    return "Today keeps the main work and pulls back accessories so you can train without forcing recovery.";
  }

  if (result.removedExercises.length > 0) {
    return "Today is compressed. Compounds stay in, and lower-priority work moves out.";
  }

  if (result.exerciseSwaps.length > 0) {
    return "Today uses safer alternatives for the areas you flagged while keeping the same target muscles.";
  }

  return "Today stays close to the original plan. Use clean reps and keep one or two reps in reserve.";
}

function getWhyChanged(result: AdaptiveTrainingResult, checkIn: DailyReadinessCheckInValue) {
  const reasons: string[] = [];

  if (checkIn.sleepHours < 7) reasons.push("sleep");
  if (checkIn.stressLevel >= 8) reasons.push("stress");
  if (checkIn.previousSessionRpe >= 9) reasons.push("previous session effort");
  if (Math.max(...Object.values(checkIn.soreness)) >= 6) reasons.push("soreness");
  if (checkIn.timeAvailableMinutes < 55) reasons.push("available time");
  if (checkIn.jointPainNotes.trim()) reasons.push("joint notes");

  if (!reasons.length) {
    return "Your check-in supports the planned session, so only minor coaching guidance was added.";
  }

  return `Changed because your check-in flagged ${reasons.join(", ")}. The goal is to preserve the target muscles without piling on unnecessary fatigue.`;
}

export default function WorkoutScreen() {
  const { profile, isComplete, updateProfile, saveProfile } = useOnboardingStore();
  const { isPro } = useSubscription();
  const [completedWorkoutCount, setCompletedWorkoutCount] = useState(0);
  const selectedTrainingPath = getTrainingPathById(profile.trainingPathId ?? recommendTrainingPath(profile));
  const selectedTrainingFocus = getTrainingFocusById(profile.trainingFocusId);
  const effectiveTrainingPath = selectedTrainingPath.proRequired && !isPro ? getTrainingPathById("foundation") : selectedTrainingPath;
  const wantsBlaqMass = selectedTrainingPath.id === "beast";
  const generatedPlan = useMemo(
    () => generateWorkoutPlan(profile, completedWorkoutCount, {
      enableBlaqMass: isPro,
      trainingPathId: effectiveTrainingPath.id,
      trainingFocusId: selectedTrainingFocus.id,
    }),
    [completedWorkoutCount, effectiveTrainingPath.id, isPro, profile, selectedTrainingFocus.id],
  );
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [dayLogs, setDayLogs] = useState<Record<string, WorkoutDayLog>>({});
  const [selectedProgramDay, setSelectedProgramDay] = useState(0);
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<PendingWorkoutRoute | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [dailyCheckIn, setDailyCheckIn] = useState<DailyReadinessCheckInValue>(() => createDefaultDailyCheckIn());
  const [adaptiveResult, setAdaptiveResult] = useState<AdaptiveTrainingResult | null>(null);
  const [isSavingCheckIn, setIsSavingCheckIn] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [adaptiveError, setAdaptiveError] = useState<string | null>(null);
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

  useEffect(() => {
    if (isDayDetailOpen || !pendingRoute) {
      return;
    }

    const task = InteractionManager.runAfterInteractions(() => {
      if (__DEV__) {
        console.log("[workout-screen] modal closed before navigation", pendingRoute);
      }

      router.push({
        pathname: pendingRoute.pathname as never,
        params: pendingRoute.params as never,
      } as never);

      if (__DEV__) {
        console.log("[workout-screen] route pushed", pendingRoute);
      }

      setPendingRoute(null);
    });

    return () => {
      task.cancel();
    };
  }, [isDayDetailOpen, pendingRoute]);

  const queueDayDetailNavigation = useCallback((route: PendingWorkoutRoute) => {
    setPendingRoute(route);
    setIsDayDetailOpen(false);
  }, []);

  const handleDayDetailExercisePress = useCallback((name: string, slug?: string) => {
    const resolvedSlug = slug ?? toExerciseSlug(name);

    if (__DEV__) {
      console.log("[workout-screen] exercise slug tapped", resolvedSlug);
    }

    queueDayDetailNavigation({
      pathname: "/exercise/[slug]",
      params: {
        slug: resolvedSlug,
        name,
      },
    });
  }, [queueDayDetailNavigation]);

  const handleStartSessionFromDayDetail = useCallback((dayId: string, weekIndex = plan?.currentWeekIndex ?? 0) => {
    queueDayDetailNavigation({
      pathname: "/workout-session/[dayId]",
      params: { dayId, weekIndex: String(weekIndex) },
    });
  }, [plan?.currentWeekIndex, queueDayDetailNavigation]);

  useFocusEffect(
    useCallback(() => {
      void refreshDayLogs();
    }, [refreshDayLogs]),
  );

  useEffect(() => {
    let isMounted = true;

    async function hydrateDailyCheckIn() {
      const today = new Date().toISOString().slice(0, 10);
      const savedCheckIn = await loadDailyCheckIn(today);

      if (isMounted) {
        setDailyCheckIn(savedCheckIn ?? createDefaultDailyCheckIn());
        setAdaptiveResult(null);
      }
    }

    void hydrateDailyCheckIn();

    return () => {
      isMounted = false;
    };
  }, []);

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
      setAdaptiveResult(null);
      setAdaptiveError(null);
      setError(null);
    } catch (replaceError) {
      setError(replaceError instanceof Error ? replaceError.message : "Unable to replace the current workout plan.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleTrainingPathSelect = async (pathId: typeof selectedTrainingPath.id) => {
    const nextProfile = { ...profile, trainingPathId: pathId };
    updateProfile({ trainingPathId: pathId });
    setAdaptiveResult(null);
    setAdaptiveError(null);

    try {
      await saveProfile(nextProfile);
    } catch {
      // Profile save errors are already surfaced by the onboarding store.
    }
  };

  const handleTrainingFocusSelect = async (focusId: typeof selectedTrainingFocus.id) => {
    const nextProfile = { ...profile, trainingFocusId: focusId };
    updateProfile({ trainingFocusId: focusId });
    setAdaptiveResult(null);
    setAdaptiveError(null);

    try {
      await saveProfile(nextProfile);
    } catch {
      // Profile save errors are already surfaced by the onboarding store.
    }
  };

  const handleSaveDailyReadiness = async (checkInOverride?: DailyReadinessCheckInValue) => {
    setIsSavingCheckIn(true);
    setCheckInError(null);
    setAdaptiveError(null);

    try {
      const savedCheckIn = await saveDailyCheckIn(checkInOverride ?? dailyCheckIn);
      setDailyCheckIn(savedCheckIn);
    } catch (saveError) {
      setCheckInError(saveError instanceof Error ? saveError.message : "Check-in could not be saved.");
    } finally {
      setIsSavingCheckIn(false);
    }
  };

  const handleGenerateAdaptiveWorkout = async (checkInOverride?: DailyReadinessCheckInValue) => {
    if (!plan) {
      setAdaptiveError("No workout plan is available yet. Refresh your plan and try again.");
      return;
    }

    const todayIndex = Math.min(Math.max((plan.currentProgramDay ?? 1) - 1, 0), 6);
    const todayWorkout = buildProgramWeekSlots(plan, dayLogs, plan.currentWeekIndex ?? 0)[todayIndex]?.workoutDay;

    if (!todayWorkout) {
      setAdaptiveResult(null);
      setAdaptiveError("No workout is scheduled for today. Use this as a recovery day or pick another unlocked training day.");
      return;
    }

    setIsSavingCheckIn(true);
    setCheckInError(null);
    setAdaptiveError(null);

    try {
      const checkInToSave = checkInOverride ?? dailyCheckIn;
      const savedCheckIn = await saveDailyCheckIn(checkInToSave);
      setDailyCheckIn(savedCheckIn);
      const adaptationInput = {
        profile,
        selectedTrainingPath: effectiveTrainingPath,
        selectedTrainingFocus,
        plannedWorkout: todayWorkout,
        checkIn: savedCheckIn,
      };
      const result = isPro
        ? await adaptWorkoutWithGeminiCoach(adaptationInput)
        : adaptWorkoutForReadiness(adaptationInput);
      setAdaptiveResult(result);
      setSelectedProgramDay(todayIndex);
    } catch (checkInError) {
      const message = checkInError instanceof Error ? checkInError.message : "Unable to generate today's adaptive workout.";
      setCheckInError("Check-in could not be saved. Your workout was not changed.");
      setAdaptiveError(message);
    } finally {
      setIsSavingCheckIn(false);
    }
  };

  useEffect(() => {
    if (!plan) {
      return;
    }

    setSelectedProgramDay(Math.min(Math.max((plan.currentProgramDay ?? 1) - 1, 0), 6));
  }, [plan?.planStartDate, plan?.version, plan?.currentProgramDay]);

  const openPaywall = useCallback((feature: string) => {
    router.push({
      pathname: "/paywall" as never,
      params: { feature } as never,
    } as never);
  }, []);

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
  const todayProgramIndex = Math.min(Math.max((plan.currentProgramDay ?? 1) - 1, 0), 6);
  const plannedSelectedDay = selectedSlot?.workoutDay ?? null;
  const selectedDay = adaptiveResult && selectedProgramDay === todayProgramIndex
    ? adaptiveResult.adjustedWorkout
    : plannedSelectedDay;
  const currentWeekLabel = `Week ${(plan.currentWeekIndex ?? 0) + 1} of ${plan.programLengthWeeks ?? 8}`;
  const estimatedCompletionLabel = formatShortDate(plan.estimatedCompletionDate);
  const planStartLabel = formatShortDate(plan.planStartDate);
  const selectedDayFlowGroups = selectedDay ? getWorkoutFlowGroups(selectedDay) : [];
  const todaysPlannedWorkout = weekSlots[todayProgramIndex]?.workoutDay ?? null;
  const todaysWorkout = adaptiveResult?.adjustedWorkout ?? todaysPlannedWorkout;
  const hasAdaptiveWorkout = Boolean(adaptiveResult);
  const todayActionCopy = getTodayActionCopy(hasAdaptiveWorkout, Boolean(todaysPlannedWorkout));
  const selectedDayStatus = selectedSlot?.isRestDay
    ? "Rest Day"
    : selectedSlot?.completed
      ? "Done"
      : isLoadingLogs
        ? "Checking..."
        : "Not Done";
  const selectedDayLog = selectedSlot?.workoutLogId
    ? dayLogs[selectedSlot.workoutLogId] ?? (selectedDay ? dayLogs[selectedDay.id] : undefined)
    : selectedDay ? dayLogs[selectedDay.id] : undefined;

  return (
    <>
      <Screen title="Session" subtitle="Pick the path, check readiness, then train the right version of today.">
        <SectionCard title="Today's training flow" eyebrow="Path + readiness">
          <Text style={styles.copy}>{todayActionCopy}</Text>
          <View style={styles.pathSelector}>
            <Text style={styles.pathSelectorTitle}>Training path</Text>
            {!profile.trainingPathId ? (
              <Text style={styles.helperText}>
                No saved path yet. We are showing the recommended {selectedTrainingPath.title}; choose a path to save it.
              </Text>
            ) : null}
            <View style={styles.pathGrid}>
              {TRAINING_PATHS.map((path) => {
                const isSelected = selectedTrainingPath.id === path.id;
                const isLocked = path.proRequired && !isPro;

                return (
                  <Pressable
                    key={path.id}
                    onPress={() => {
                      if (isLocked) {
                        openPaywall(path.title);
                        return;
                      }

                      void handleTrainingPathSelect(path.id);
                    }}
                    style={[styles.pathCard, isSelected ? styles.pathCardSelected : null, isLocked ? styles.lockedDayCard : null]}
                  >
                    <Text style={styles.pathTitle}>{path.title}</Text>
                    <Text style={styles.pathSubtitle}>{isLocked ? "Pro" : path.subtitle}</Text>
                    <Text style={styles.pathDescription} numberOfLines={3}>{path.description}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          {selectedTrainingPath.proRequired && !isPro ? (
            <Text style={styles.programMetaText}>
              Beast Path is a Pro path. Foundation stays active until Pro is unlocked.
            </Text>
          ) : null}
          <View style={styles.pathSelector}>
            <Text style={styles.pathSelectorTitle}>Training focus</Text>
            <Text style={styles.helperText}>
              Choose the training focus that matches the body and performance you’re building.
            </Text>
            <View style={styles.pathGrid}>
              {TRAINING_FOCUSES.map((focus) => {
                const isSelected = selectedTrainingFocus.id === focus.id;

                return (
                  <Pressable
                    key={focus.id}
                    onPress={() => void handleTrainingFocusSelect(focus.id)}
                    style={[styles.pathCard, isSelected ? styles.pathCardSelected : null]}
                  >
                    <Text style={styles.pathTitle}>{focus.title}</Text>
                    <Text style={styles.pathSubtitle}>{focus.subtitle}</Text>
                    <Text style={styles.pathDescription} numberOfLines={3}>{focus.description}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {todaysPlannedWorkout ? (
          <>
            <DailyReadinessCheckIn
              value={dailyCheckIn}
              isSaving={isSavingCheckIn}
              error={checkInError}
              onChange={setDailyCheckIn}
              onSave={(checkIn) => void handleSaveDailyReadiness(checkIn)}
              onGenerateAdaptive={(checkIn) => void handleGenerateAdaptiveWorkout(checkIn)}
            />
            {adaptiveResult ? (
              <SectionCard title="Today's Adjustment" eyebrow="Recovery Score">
                <View style={styles.recoveryScoreCard}>
                  <Text style={styles.recoveryScoreValue}>{adaptiveResult.readinessScore}</Text>
                  <View style={styles.recoveryScoreCopy}>
                    <Text style={styles.recoveryScoreLabel}>{getReadinessLabel(adaptiveResult.readinessScore)}</Text>
                    <Text style={styles.helperText}>Recovery Score out of 100</Text>
                  </View>
                </View>
                <View style={styles.statsRow}>
                  <StatChip label="Volume" value={`${Math.round(adaptiveResult.volumeAdjustment * 100)}%`} />
                  <StatChip label="Swaps" value={String(adaptiveResult.exerciseSwaps.length)} />
                  <StatChip label="Removed" value={String(adaptiveResult.removedExercises.length)} />
                </View>
                <Text style={styles.adjustmentPlain}>{getPlainAdjustment(adaptiveResult)}</Text>
                <View style={styles.whyBox}>
                  <Text style={styles.whyTitle}>Why this changed</Text>
                  <Text style={styles.copy}>{getWhyChanged(adaptiveResult, dailyCheckIn)}</Text>
                </View>
                {adaptiveResult.exerciseSwaps.length ? (
                  <View style={styles.changeList}>
                    <Text style={styles.changeListTitle}>Swapped today</Text>
                    {adaptiveResult.exerciseSwaps.map((swap) => (
                      <Text key={`${swap.from}-${swap.to}`} style={styles.noteItem}>
                        • {swap.from} to {swap.to}: {swap.reason}
                      </Text>
                    ))}
                  </View>
                ) : null}
                {adaptiveResult.removedExercises.length ? (
                  <View style={styles.changeList}>
                    <Text style={styles.changeListTitle}>Removed today</Text>
                    {adaptiveResult.removedExercises.map((exerciseName) => (
                      <Text key={exerciseName} style={styles.noteItem}>
                        • {exerciseName}: lower-priority work removed for recovery or time.
                      </Text>
                    ))}
                  </View>
                ) : null}
                <Text style={styles.copy}>{adaptiveResult.coachMessage}</Text>
                {adaptiveResult.safetyFlags.map((flag) => (
                  <Text key={flag} style={styles.noteItem}>• {flag}</Text>
                ))}
              </SectionCard>
            ) : null}
            {adaptiveError ? (
              <SectionCard title="Adaptive workout not ready" eyebrow="Try again">
                <Text style={styles.copy}>{adaptiveError}</Text>
                <PrimaryButton label="Try again" onPress={() => void handleGenerateAdaptiveWorkout()} variant="ghost" />
              </SectionCard>
            ) : null}
          </>
        ) : (
          <Text style={styles.copy}>
            No lifting session is scheduled for this program day. Recovery is part of the plan, so use this slot for easy walking, mobility, or full rest.
          </Text>
        )}
          {todaysWorkout ? (
            <PrimaryButton
              label={dayLogs[getScheduledWorkoutLogId(todaysWorkout.id, trackerWeekIndex)]?.isCompleted || dayLogs[todaysWorkout.id]?.isCompleted ? "Update Today's Session" : "Start Today's Session"}
              onPress={() => handleStartSessionFromDayDetail(todaysWorkout.id, trackerWeekIndex)}
            />
          ) : null}
        </SectionCard>

        <SectionCard title={plan.title} eyebrow="Program calendar">
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
          <View style={styles.weekTrackerRow}>
            {weekSlots.map((slot) => {
              const isSelected = selectedSlot?.index === slot.index;
              const isToday = todayProgramIndex === slot.index;
              const isLocked = !isPro && !isToday;
              const cardStyles = [
                styles.weekDayCard,
                slot.isRestDay ? styles.restDayCard : null,
                slot.completed ? styles.completedDayCard : null,
                isToday ? styles.todayDayCard : null,
                isSelected ? styles.selectedDayCard : null,
                isLocked ? styles.lockedDayCard : null,
              ];

              return (
                <Pressable
                  key={`${slot.label}-${slot.index}`}
                  onPress={() => {
                    if (isLocked) {
                      openPaywall("weekly workout days");
                      return;
                    }

                    setSelectedProgramDay(slot.index);
                    setIsDayDetailOpen(true);
                  }}
                  style={cardStyles}
                >
                  <Text style={styles.weekDayLabel}>{slot.label}</Text>
                  <Text style={styles.weekDayDate}>{slot.date.getDate()}</Text>
                  <Text style={styles.weekDayTitle} numberOfLines={2}>
                    {slot.workoutDay ? trimProgramDayTitle(slot.workoutDay.title) : "Rest / Recovery Day"}
                  </Text>
                  <Text style={styles.weekDayStatus}>
                    {isLocked ? "Locked" : slot.isRestDay ? "Rest Day" : slot.completed ? "Done" : isToday ? "Today" : "Not Done"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <PrimaryButton
            label={isRegenerating ? "Refreshing plan..." : "Refresh plan"}
            onPress={() => void handleRegeneratePlan()}
            variant="ghost"
          />
          <PrimaryButton
            label="View Full Program Calendar"
            onPress={() => {
              if (isPro) {
                setIsCalendarOpen(true);
                return;
              }

              openPaywall("full program calendar");
            }}
            variant="ghost"
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </SectionCard>

        {!isPro && wantsBlaqMass ? (
          <ProLockCard
            title="Beast Path"
            description="Golden-Era Inspired AI Bodybuilding, AI adaptive adjustments, advanced recovery score, progression analytics, and coach messages are Pro features."
            feature="Beast Path"
          />
        ) : null}

        {!isPro ? (
          <ProLockCard
            title="Advanced Program Calendar"
            description="Weekly tracking stays free. Upgrade to Pro to see the full multi-week program calendar."
            feature="advanced calendar"
          />
        ) : null}

        <SectionCard title="Plan notes" eyebrow="How to use this week">
          {plan.notes.map((note) => (
            <Text key={note} style={styles.noteItem}>
              • {note}
            </Text>
          ))}
        </SectionCard>

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
        visible={isDayDetailOpen}
        onRequestClose={() => setIsDayDetailOpen(false)}
      >
        <View style={styles.calendarModalBackdrop}>
          <View style={styles.calendarModalCard}>
            <View style={styles.calendarModalHeader}>
              <View style={styles.calendarModalCopy}>
                <Text style={styles.calendarModalTitle}>
                  {selectedSlot ? `${selectedSlot.label} • ${formatShortDate(selectedSlot.date.toISOString())}` : "Session Day"}
                </Text>
                <Text style={styles.calendarModalSubtitle}>
                  {selectedDay ? trimProgramDayTitle(selectedDay.title) : "Rest / Recovery Day"}
                </Text>
                <Text style={styles.calendarModalStatus}>
                  {selectedDayStatus}
                  {selectedDayLog?.completedAt
                    ? ` • Logged ${new Date(selectedDayLog.completedAt).toLocaleDateString()}`
                    : ""}
                </Text>
              </View>
              <Pressable onPress={() => setIsDayDetailOpen(false)} style={styles.calendarCloseButton}>
                <Text style={styles.calendarCloseText}>X</Text>
              </Pressable>
            </View>

            {selectedDay ? (
              <PrimaryButton
                label={selectedSlot?.completed ? "Update Session" : "Start Session"}
                onPress={() => handleStartSessionFromDayDetail(selectedDay.id, selectedSlot?.weekIndex ?? trackerWeekIndex)}
              />
            ) : null}

            <ScrollView contentContainerStyle={styles.calendarScrollContent}>
              {selectedDay ? (
                <>
                  <SectionCard title={selectedDay.title} eyebrow={selectedDay.focus}>
                    <Text style={styles.dayNotes}>{selectedDay.notes}</Text>
                    {selectedDayFlowGroups.map((group) => {
                      if (!group.superset) {
                        const item = group.entries[0].exercise;

                        return (
                          <View key={`${selectedDay.id}-${item.name}`} style={styles.exerciseCard}>
                            <Pressable
                              onPress={() => handleDayDetailExercisePress(item.name, item.slug)}
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
                        );
                      }

                      return (
                        <View key={`${selectedDay.id}-${group.id}`} style={styles.supersetGroupCard}>
                          <View style={styles.supersetHeader}>
                            <Text style={styles.supersetLabel}>{group.superset.title}</Text>
                            <Text style={styles.supersetNotes}>{group.superset.notes}</Text>
                            <Text style={styles.supersetRest}>Flow: complete each move in order, then rest {group.superset.restAfterGroup}.</Text>
                          </View>
                          <View style={styles.supersetStack}>
                            {group.entries.map(({ exercise: item, positionInSuperset }) => (
                              <View
                                key={`${selectedDay.id}-${group.id}-${item.name}`}
                                style={[styles.exerciseCard, styles.supersetExerciseCard]}
                              >
                                <Text style={styles.supersetMoveLabel}>
                                  Move {positionInSuperset} of {group.superset?.exerciseSlugs.length}
                                </Text>
                                <Pressable
                                  onPress={() => handleDayDetailExercisePress(item.name, item.slug)}
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
                        </View>
                      );
                    })}

                    {selectedDay.coreFinisher ? (
                      <View style={styles.coreFinisherCard}>
                        <Text style={styles.coreFinisherTitle}>
                          {selectedDay.coreFinisher.title === "Advanced ab block" ? "Blaq Core System" : selectedDay.coreFinisher.title}
                        </Text>
                        <Text style={styles.coreFinisherEyebrow}>
                          {selectedDay.coreFinisher.emphasis === "front-core-trunk-stability"
                            ? "Front core / trunk stability"
                            : "Obliques / side core"}
                        </Text>
                        <Text style={styles.exerciseNotes}>{selectedDay.coreFinisher.notes}</Text>
                        {selectedDay.coreFinisher.exercises.map((item) => (
                          <View key={`${selectedDay.id}-core-${item.name}`} style={styles.coreFinisherExercise}>
                            <Pressable
                              onPress={() => handleDayDetailExercisePress(item.name, item.slug)}
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

                  <PrimaryButton
                    label={selectedSlot?.completed ? "Update Session" : "Start Session"}
                    onPress={() => handleStartSessionFromDayDetail(selectedDay.id, selectedSlot?.weekIndex ?? trackerWeekIndex)}
                  />
                </>
              ) : (
                <SectionCard title="Rest / Recovery Day" eyebrow="Selected day">
                  <Text style={styles.copy}>
                    This slot is your recovery day. Use it for mobility, walking, easy stretching, or full rest so the rest of the week stays productive.
                  </Text>
                </SectionCard>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  helperText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  adjustmentPlain: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 23,
  },
  recoveryScoreCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.primary,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  recoveryScoreValue: {
    color: colors.primarySoft,
    fontSize: 44,
    fontWeight: "900",
    lineHeight: 50,
  },
  recoveryScoreCopy: {
    flex: 1,
    gap: 2,
  },
  recoveryScoreLabel: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  whyBox: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  whyTitle: {
    color: colors.primarySoft,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  changeList: {
    gap: spacing.xs,
  },
  changeListTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
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
  pathSelector: {
    gap: spacing.sm,
  },
  pathSelectorTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  pathGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  pathCard: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexGrow: 1,
    gap: 4,
    minWidth: 140,
    padding: spacing.sm,
    width: "46%",
  },
  pathCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  pathTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  pathSubtitle: {
    color: colors.primarySoft,
    fontSize: 12,
    fontWeight: "700",
  },
  pathDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
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
  lockedDayCard: {
    opacity: 0.64,
    borderColor: colors.danger,
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
  supersetGroupCard: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.primary,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  supersetStack: {
    gap: spacing.sm,
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
  supersetMoveLabel: {
    color: colors.primarySoft,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
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
  calendarModalStatus: {
    color: colors.primarySoft,
    fontSize: 12,
    fontWeight: "600",
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
