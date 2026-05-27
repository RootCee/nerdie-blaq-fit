import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";

import {
  ChallengeProofShareCard,
  ChallengeProofShareCardStats,
  SOCIAL_PROOF_STORY_HEIGHT,
  SOCIAL_PROOF_STORY_WIDTH,
} from "@/components/challenges/ChallengeProofShareCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { FormField } from "@/components/ui/FormField";
import { ProLockCard } from "@/components/ProLockCard";
import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatChip } from "@/components/ui/StatChip";
import { getChallengeById } from "@/config/challenges";
import { deriveBodyWeightHistorySummary } from "@/features/body-weight/body-weight-history";
import { loadRecentBodyWeightHistory } from "@/features/body-weight/body-weight-persistence";
import { buildChallengeProofSummary, getTodayDateKey } from "@/features/challenges/challenge-proof";
import { loadActiveChallenge, loadChallengeDailyLogs, saveChallengeDailyLog, startChallenge } from "@/features/challenges/challenge-persistence";
import { loadDailyCheckIn } from "@/features/workouts/daily-checkin-persistence";
import { deriveWorkoutMotivationStats } from "@/features/workouts/workout-history-stats";
import { loadWorkoutDayLog, loadWorkoutHistory } from "@/features/workouts/workout-log-persistence";
import { calculateReadinessScore } from "@/lib/adaptiveTraining";
import { generateShareProgressText } from "@/lib/share/shareProgress";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useSubscription } from "@/store/subscription-store";
import { colors, spacing } from "@/theme";
import { ChallengeProofSummary, MissedWorkoutReason, UserChallenge, UserChallengeDailyLog } from "@/types/challenge";
import { WorkoutDayLog, WorkoutHistoryItem, WorkoutMotivationStats } from "@/types/workout";
import { BodyWeightHistorySummary } from "@/types/body-weight";

const beastChallenge = getChallengeById("four-week-beast");
const missedReasonOptions: Array<{ label: string; value: MissedWorkoutReason }> = [
  { label: "Not enough time", value: "not-enough-time" },
  { label: "Too sore", value: "too-sore" },
  { label: "Low energy", value: "low-energy" },
  { label: "Injury/pain", value: "injury-pain" },
  { label: "Forgot", value: "forgot" },
  { label: "Other", value: "other" },
];

function buildWeeklyRecapMessage(
  workoutsCompletedThisWeek: number,
  trendDirection: BodyWeightHistorySummary["trendDirection"],
  distanceFromGoal: number | null,
) {
  if (workoutsCompletedThisWeek >= 4 && trendDirection === "steady") {
    return "Strong week. You kept the work consistent and the scale steady, which is often exactly what solid progress looks like.";
  }

  if (workoutsCompletedThisWeek >= 3 && trendDirection === "down" && distanceFromGoal !== null && distanceFromGoal < 0) {
    return "You stacked solid training with a downward weight trend. Keep the basics repeatable and let the week build on itself.";
  }

  if (workoutsCompletedThisWeek >= 3 && trendDirection === "up" && distanceFromGoal !== null && distanceFromGoal > 0) {
    return "You trained well and your weight is moving upward toward your target. Stay patient and keep recovery in the plan.";
  }

  if (workoutsCompletedThisWeek >= 1) {
    return "You put real work on the board this week. Stay steady, keep logging, and let the trend get clearer.";
  }

  return "A new week can turn quickly. One solid session and one honest check-in is enough to restart momentum.";
}

function hasWorkoutCompletedOnDate(history: WorkoutHistoryItem[], dateKey: string) {
  return history.some((item) => getTodayDateKey(new Date(item.completedAt)) === dateKey);
}

function getStartOfWeek(date: Date) {
  const copy = new Date(date);
  const weekday = copy.getDay();
  const distanceFromMonday = (weekday + 6) % 7;

  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - distanceFromMonday);

  return copy;
}

function getEndOfWeek(date: Date) {
  const start = getStartOfWeek(date);
  const end = new Date(start);

  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return end;
}

function isCompletedThisWeek(item: WorkoutHistoryItem, now = new Date()) {
  const completedAt = new Date(item.completedAt);

  return completedAt >= getStartOfWeek(now) && completedAt <= getEndOfWeek(now);
}

function parseLoggedNumber(value: string) {
  const numeric = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function getBestSetLabel(log: WorkoutDayLog | null) {
  if (!log) {
    return "No completed set yet";
  }

  let bestSet: { exerciseName: string; reps: number; weight: number; setVolume: number } | null = null;

  for (const exercise of log.exerciseLogs) {
    for (const set of exercise.sets) {
      if (!set.isCompleted) {
        continue;
      }

      const reps = parseLoggedNumber(set.reps);
      const weight = parseLoggedNumber(set.weight);
      const setVolume = reps * weight;

      if (
        !bestSet ||
        setVolume > bestSet.setVolume ||
        (setVolume === bestSet.setVolume && weight > bestSet.weight)
      ) {
        bestSet = {
          exerciseName: exercise.exerciseName,
          reps,
          weight,
          setVolume,
        };
      }
    }
  }

  if (!bestSet) {
    return "No completed set yet";
  }

  return bestSet.weight > 0
    ? `${bestSet.exerciseName} ${bestSet.weight} x ${bestSet.reps}`
    : `${bestSet.exerciseName} ${bestSet.reps} reps`;
}

function getWorkoutVolumeForDate(history: WorkoutHistoryItem[], dateKey: string) {
  return history
    .filter((item) => getTodayDateKey(new Date(item.completedAt)) === dateKey)
    .reduce((sum, item) => sum + item.totalWorkoutVolume, 0);
}

function getWorkoutVolumeSince(history: WorkoutHistoryItem[], startDate: Date) {
  const startTime = new Date(startDate).setHours(0, 0, 0, 0);

  return history
    .filter((item) => new Date(item.completedAt).getTime() >= startTime)
    .reduce((sum, item) => sum + item.totalWorkoutVolume, 0);
}

function getWorkoutMinutesSince(history: WorkoutHistoryItem[], startDate: Date) {
  const startTime = new Date(startDate).setHours(0, 0, 0, 0);

  return history
    .filter((item) => new Date(item.completedAt).getTime() >= startTime)
    .reduce((sum, item) => sum + Math.round((item.durationSeconds ?? 0) / 60), 0);
}

function getWeeklyWorkoutVolume(history: WorkoutHistoryItem[]) {
  return getWorkoutVolumeSince(history, getStartOfWeek(new Date()));
}

function formatWeightGoalProgress(summary: BodyWeightHistorySummary) {
  if (summary.distanceFromGoal === null) {
    return "Building weight trend";
  }

  if (summary.distanceFromGoal === 0) {
    return "Goal weight reached";
  }

  const distance = Math.abs(summary.distanceFromGoal);
  return `${distance} lb ${summary.distanceFromGoal > 0 ? "above" : "below"} goal`;
}

export default function ProgressScreen() {
  const { profile, isComplete } = useOnboardingStore();
  const { isPro } = useSubscription();
  const shareCardRef = useRef<View>(null);
  const [history, setHistory] = useState<WorkoutHistoryItem[]>([]);
  const [challenge, setChallenge] = useState<UserChallenge | null>(null);
  const [challengeLogs, setChallengeLogs] = useState<UserChallengeDailyLog[]>([]);
  const [challengeSummary, setChallengeSummary] = useState<ChallengeProofSummary | null>(null);
  const [bestSetToday, setBestSetToday] = useState("No completed set yet");
  const [strengthNotes, setStrengthNotes] = useState("");
  const [isMissedModalOpen, setIsMissedModalOpen] = useState(false);
  const [missedReason, setMissedReason] = useState<MissedWorkoutReason>("not-enough-time");
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [challengeLoadError, setChallengeLoadError] = useState<string | null>(null);
  const [isChallengeSaving, setIsChallengeSaving] = useState(false);
  const [bodyWeightSummary, setBodyWeightSummary] = useState<BodyWeightHistorySummary>({
    latestWeight: null,
    latestLoggedOn: null,
    changeFromPrevious: null,
    entries: [],
    trendDirection: "insufficient-data",
    weeklyChange: null,
    distanceFromGoal: null,
    adjustmentSuggestion: null,
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
          const todayHistoryItem = items.find((item) => getTodayDateKey(new Date(item.completedAt)) === getTodayDateKey());
          const todayWorkoutLog = todayHistoryItem ? await loadWorkoutDayLog(todayHistoryItem.dayId) : null;
          let activeChallenge: UserChallenge | null = null;
          let activeChallengeLogs: UserChallengeDailyLog[] = [];
          let challengeBodyWeightLogs = recentBodyWeightLogs;
          let challengeLoadMessage: string | null = null;

          try {
            activeChallenge = await loadActiveChallenge(beastChallenge.id);
            activeChallengeLogs = activeChallenge ? await loadChallengeDailyLogs(activeChallenge.id) : [];
            challengeBodyWeightLogs = activeChallenge ? await loadRecentBodyWeightHistory(28) : recentBodyWeightLogs;

            if (
              activeChallenge &&
              hasWorkoutCompletedOnDate(items, getTodayDateKey()) &&
              !activeChallengeLogs.some((log) => log.logDate === getTodayDateKey())
            ) {
              const checkIn = await loadDailyCheckIn(getTodayDateKey());
              await saveChallengeDailyLog({
                userChallengeId: activeChallenge.id,
                logDate: getTodayDateKey(),
                workoutCompleted: true,
                missedReason: null,
                readinessScore: checkIn ? calculateReadinessScore(checkIn) : null,
                painFlag: false,
                strengthNotes: "Synced from completed workout session.",
              });
              activeChallengeLogs = await loadChallengeDailyLogs(activeChallenge.id);
            }
          } catch (challengeLoadFailure) {
            challengeLoadMessage = challengeLoadFailure instanceof Error
              ? challengeLoadFailure.message
              : "Challenge data could not load right now.";
          }

          if (isMounted) {
            setHistory(items);
            setBestSetToday(getBestSetLabel(todayWorkoutLog));
            setChallenge(activeChallenge);
            setChallengeLogs(activeChallengeLogs);
            setChallengeLoadError(challengeLoadMessage);
            setChallengeSummary(
              activeChallenge
                ? buildChallengeProofSummary(activeChallenge, beastChallenge, activeChallengeLogs, challengeBodyWeightLogs)
                : null,
            );
            setStats(deriveWorkoutMotivationStats(items));
            setBodyWeightSummary(
              deriveBodyWeightHistorySummary(recentBodyWeightLogs, {
                goalWeight: profile.goalWeight,
                goalPace: profile.goalPace,
                currentWeight: profile.weight,
              }),
            );
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
    }, [profile.goalPace, profile.goalWeight, profile.weight]),
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

  const weeklyRecapMessage = buildWeeklyRecapMessage(
    stats.workoutsCompletedThisWeek,
    bodyWeightSummary.trendDirection,
    bodyWeightSummary.distanceFromGoal,
  );
  const currentWeekHistory = history.filter((item) => isCompletedThisWeek(item));
  const todayChallengeLog = challengeLogs.find((log) => log.logDate === getTodayDateKey()) ?? null;
  const hasLoggedChallengeToday = Boolean(todayChallengeLog);
  const shouldShowSharePrompt = Boolean(challenge || challengeSummary);
  const shareProgressText = shouldShowSharePrompt
    ? generateShareProgressText({ fitScore: challengeSummary?.proofScore ?? null })
    : null;
  const shareCardStats: ChallengeProofShareCardStats | null = challenge && challengeSummary
    ? {
        proofScore: challengeSummary.proofScore,
        currentDay: challengeSummary.currentDay,
        currentWeek: challengeSummary.currentWeek,
        completionPercentage: challengeSummary.completionPercentage,
        todayVolume: getWorkoutVolumeForDate(history, getTodayDateKey()),
        weeklyVolume: getWeeklyWorkoutVolume(history),
        challengeVolume: getWorkoutVolumeSince(history, new Date(challenge.startedAt)),
        bestSetToday,
        daysLogged: challengeSummary.daysLogged,
        timeSpentMinutes: getWorkoutMinutesSince(history, new Date(challenge.startedAt)),
        streakDays: stats.currentStreak,
        weightGoalProgress: formatWeightGoalProgress(bodyWeightSummary),
        workoutsAccountedFor: challengeSummary.workoutsAccountedFor,
        workoutsCompleted: challengeSummary.workoutsCompleted,
        averageReadinessScore: challengeSummary.averageReadinessScore,
      }
    : null;

  const refreshChallenge = async (activeChallenge = challenge) => {
    if (!activeChallenge) {
      setChallengeSummary(null);
      setChallengeLogs([]);
      setChallengeLoadError(null);
      return;
    }

    try {
      const [logs, bodyWeightLogs] = await Promise.all([
        loadChallengeDailyLogs(activeChallenge.id),
        loadRecentBodyWeightHistory(28),
      ]);
      setChallenge(activeChallenge);
      setChallengeLogs(logs);
      setChallengeLoadError(null);
      setChallengeSummary(buildChallengeProofSummary(activeChallenge, beastChallenge, logs, bodyWeightLogs));
    } catch (refreshError) {
      setChallengeLoadError(refreshError instanceof Error ? refreshError.message : "Challenge data could not refresh right now.");
    }
  };

  const handleStartChallenge = async () => {
    if (!isPro) {
      return;
    }

    setIsChallengeSaving(true);
    setChallengeError(null);

    try {
      const nextChallenge = await startChallenge(beastChallenge.id);
      await refreshChallenge(nextChallenge);
      setChallengeError(null);
    } catch (startError) {
      setChallengeError(startError instanceof Error ? startError.message : "Challenge save failed. Try again when your connection or local storage is available.");
    } finally {
      setIsChallengeSaving(false);
    }
  };

  const getTodayReadinessScore = async () => {
    const checkIn = await loadDailyCheckIn(getTodayDateKey());
    return checkIn ? calculateReadinessScore(checkIn) : null;
  };

  const handleSaveChallengeLog = async (workoutCompleted: boolean, reason: MissedWorkoutReason | null) => {
    if (!challenge) {
      setChallengeError("No active challenge is available yet. Start the challenge before logging today.");
      return;
    }

    if (!isPro) {
      setChallengeError("The 4-Week Beast Challenge is a Pro proof-tracking feature.");
      return;
    }

    if (hasLoggedChallengeToday) {
      setChallengeError("Today's challenge proof is already saved. You can log the next challenge day tomorrow.");
      return;
    }

    setIsChallengeSaving(true);
    setChallengeError(null);

    try {
      const readinessScore = await getTodayReadinessScore();
      await saveChallengeDailyLog({
        userChallengeId: challenge.id,
        logDate: getTodayDateKey(),
        workoutCompleted,
        missedReason: workoutCompleted ? null : reason,
        readinessScore,
        painFlag: reason === "injury-pain",
        strengthNotes,
      });
      setStrengthNotes("");
      setIsMissedModalOpen(false);
      await refreshChallenge(challenge);
    } catch (logError) {
      setChallengeError(logError instanceof Error ? logError.message : "Daily log save failed. Your challenge proof was not updated.");
    } finally {
      setIsChallengeSaving(false);
    }
  };

  const handleShareProgress = async () => {
    if (!shareProgressText) {
      return;
    }

    try {
      if (shareCardStats && shareCardRef.current) {
        const uri = await captureRef(shareCardRef, {
          fileName: "nerdie-blaq-fit-proof-story",
          format: "png",
          height: SOCIAL_PROOF_STORY_HEIGHT,
          quality: 1,
          result: "tmpfile",
          width: SOCIAL_PROOF_STORY_WIDTH,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            dialogTitle: "Share your story proof",
            mimeType: "image/png",
            UTI: "public.png",
          });
          return;
        }
      }

      await Share.share({
        message: shareProgressText,
      });
    } catch (shareError) {
      setChallengeError(shareError instanceof Error ? shareError.message : "Sharing is not available right now.");
    }
  };

  return (
    <>
    <Screen title="Progress" subtitle="Proof of consistency, smart training, and the work you have already put in.">
      {error ? (
        <SectionCard title="Progress not available" eyebrow="Try again">
          <Text style={styles.copy}>{error}</Text>
        </SectionCard>
      ) : null}

      {!isComplete ? (
        <SectionCard title="Profile not finished" eyebrow="Missing profile">
          <Text style={styles.copy}>
            Finish onboarding to unlock personalized training paths, adaptive readiness, and challenge proof tracking.
          </Text>
          <PrimaryButton label="Finish setup" onPress={() => router.push("/onboarding" as never)} variant="ghost" />
        </SectionCard>
      ) : null}

      <SectionCard title={beastChallenge.title} eyebrow="Proof of consistency">
        <Text style={styles.copy}>{beastChallenge.description}</Text>
        {challengeLoadError ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>Challenge load failed</Text>
            <Text style={styles.copy}>{challengeLoadError}</Text>
            <PrimaryButton label="Retry challenge data" onPress={() => void refreshChallenge()} variant="ghost" />
          </View>
        ) : null}
        {!isPro ? (
          <ProLockCard
            title="4-Week Beast Challenge"
            description="Unlock the 4-week challenge, advanced proof tracking, and recovery-aware progress metrics with Pro. Free training and basic progress tracking still work without Pro."
            feature="4-Week Beast Challenge"
          />
        ) : null}
        {!challenge ? (
          <>
            <Text style={styles.streakNote}>
              No challenge data yet. Start when you are ready to track proof of consistency.
            </Text>
            <View style={styles.challengeGoalList}>
              {beastChallenge.weeklyGoals.slice(0, 3).map((goal) => (
                <Text key={goal} style={styles.noteItem}>• {goal}</Text>
              ))}
            </View>
            {challengeError ? <Text style={styles.errorText}>{challengeError}</Text> : null}
            <PrimaryButton
              label={isChallengeSaving ? "Starting challenge..." : "Start 4-Week Beast Challenge"}
              onPress={() => void handleStartChallenge()}
              disabled={isChallengeSaving || !isPro}
            />
          </>
        ) : challengeSummary ? (
          <>
            <View style={styles.proofScoreCard}>
              <Text style={styles.proofScoreValue}>{challengeSummary.proofScore}</Text>
              <View style={styles.proofScoreCopy}>
                <Text style={styles.proofScoreTitle}>Nerdie Blaq Fit Score</Text>
                <Text style={styles.streakNote}>Discipline, consistency, and smart training. Not a body judgment.</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <StatChip label="Day" value={`${challengeSummary.currentDay}/28`} />
              <StatChip label="Week" value={String(challengeSummary.currentWeek)} />
              <StatChip label="Complete" value={`${challengeSummary.completionPercentage}%`} />
              <StatChip label="Accounted" value={String(challengeSummary.workoutsAccountedFor)} />
              <StatChip label="Workouts" value={String(challengeSummary.workoutsCompleted)} />
              <StatChip label="This week" value={String(challengeSummary.workoutsCompletedThisWeek)} />
              <StatChip label="Missed" value={String(challengeSummary.missedSessions)} />
              <StatChip label="Check-ins" value={String(challengeSummary.checkInStreak)} />
              <StatChip label="Avg recovery" value={challengeSummary.averageReadinessScore === null ? "N/A" : String(challengeSummary.averageReadinessScore)} />
              <StatChip label="Pain flags" value={String(challengeSummary.painFlags)} />
              <StatChip label="Strength notes" value={String(challengeSummary.strengthNoteCount)} />
              <StatChip label="Weight logs" value={String(challengeSummary.bodyWeightEntryCount)} />
            </View>
            {!challengeLogs.length ? (
              <Text style={styles.streakNote}>
                No challenge logs yet. Save today&apos;s workout or missed-session reason to start your proof record.
              </Text>
            ) : null}
            {challengeSummary.averageReadinessScore === null ? (
              <Text style={styles.streakNote}>
                No readiness score yet. Complete a daily readiness check-in before logging challenge proof to include recovery data.
              </Text>
            ) : null}
            <Text style={styles.streakNote}>
              Started {new Date(challenge.startedAt).toLocaleDateString()} • Challenge storage: {challenge.storageMode === "supabase" ? "Supabase" : "local fallback"}
            </Text>
            <Text style={styles.copy}>Earn the split through logged proof: train hard, adjust smart, and keep honest notes when life interrupts the plan.</Text>
            {shareProgressText ? (
              <View style={styles.sharePromptCard}>
                <Text style={styles.sharePromptTitle}>Share your proof. Show your discipline.</Text>
                {shareCardStats ? (
                  <View ref={shareCardRef} collapsable={false} style={styles.shareCardPreview}>
                    <ChallengeProofShareCard
                      generatedOnLabel={new Date().toLocaleDateString()}
                      stats={shareCardStats}
                    />
                  </View>
                ) : (
                  <Text style={styles.copy}>{shareProgressText}</Text>
                )}
                <PrimaryButton
                  label={shareCardStats ? "Share Story Card" : "Share Progress"}
                  onPress={() => void handleShareProgress()}
                  disabled={isChallengeSaving}
                  variant="ghost"
                />
              </View>
            ) : null}
            <FormField
              label="Strength notes"
              value={strengthNotes}
              onChangeText={setStrengthNotes}
              placeholder="Bench felt smoother, squat +5 lb, better control..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            {todayChallengeLog ? (
              <View style={styles.todayProofCard}>
                <Text style={styles.todayProofTitle}>Today&apos;s proof is saved</Text>
                <Text style={styles.statusLine}>
                  {todayChallengeLog.workoutCompleted ? "Workout completed" : `Missed - ${todayChallengeLog.missedReason?.replace(/-/g, " ") ?? "reason saved"}`}
                </Text>
                <Text style={styles.streakNote}>Come back tomorrow to log the next challenge day.</Text>
              </View>
            ) : null}
            {challengeError ? <Text style={styles.errorText}>{challengeError}</Text> : null}
            <View style={styles.buttonRow}>
              <PrimaryButton
                label={isChallengeSaving ? "Saving..." : hasLoggedChallengeToday ? "Workout Logged Today" : "Log Today's Workout Complete"}
                onPress={() => void handleSaveChallengeLog(true, null)}
                disabled={isChallengeSaving || !isPro || hasLoggedChallengeToday}
                style={styles.flexButton}
              />
              <PrimaryButton
                label={hasLoggedChallengeToday ? "Today's Proof Saved" : "Log Missed Session"}
                onPress={() => setIsMissedModalOpen(true)}
                disabled={isChallengeSaving || !isPro || hasLoggedChallengeToday}
                variant="ghost"
                style={styles.flexButton}
              />
            </View>
          </>
        ) : null}
      </SectionCard>

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

      <SectionCard title="Weekly recap" eyebrow="Coach check-in">
        <View style={styles.statsRow}>
          <StatChip label="Workouts" value={String(stats.workoutsCompletedThisWeek)} />
          <StatChip
            label="Trend"
            value={
              bodyWeightSummary.trendDirection === "up"
                ? "Up"
                : bodyWeightSummary.trendDirection === "down"
                  ? "Down"
                  : bodyWeightSummary.trendDirection === "steady"
                    ? "Steady"
                    : "Building"
            }
          />
          <StatChip
            label="Goal gap"
            value={
              bodyWeightSummary.distanceFromGoal === null
                ? "N/A"
                : `${bodyWeightSummary.distanceFromGoal > 0 ? "+" : ""}${bodyWeightSummary.distanceFromGoal}`
            }
          />
        </View>
        <Text style={styles.copy}>{weeklyRecapMessage}</Text>
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
            {(bodyWeightSummary.weeklyChange !== null || bodyWeightSummary.distanceFromGoal !== null || bodyWeightSummary.adjustmentSuggestion) ? (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Weekly direction</Text>
                <Text style={styles.summaryCopy}>
                  {bodyWeightSummary.trendDirection === "up"
                    ? "Trending up"
                    : bodyWeightSummary.trendDirection === "down"
                      ? "Trending down"
                      : bodyWeightSummary.trendDirection === "steady"
                        ? "Holding steady"
                        : "Building trend data"}
                  {bodyWeightSummary.weeklyChange !== null
                    ? ` • ${bodyWeightSummary.weeklyChange > 0 ? "+" : ""}${bodyWeightSummary.weeklyChange} this week`
                    : ""}
                </Text>
                {bodyWeightSummary.distanceFromGoal !== null ? (
                  <Text style={styles.summaryCopy}>
                    Distance from goal weight: {bodyWeightSummary.distanceFromGoal > 0 ? "+" : ""}{bodyWeightSummary.distanceFromGoal}
                  </Text>
                ) : null}
                {bodyWeightSummary.adjustmentSuggestion ? (
                  <Text style={styles.summaryCopy}>{bodyWeightSummary.adjustmentSuggestion}</Text>
                ) : null}
              </View>
            ) : null}
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

      {!currentWeekHistory.length ? (
        <SectionCard title="No workouts finished this week" eyebrow="Current week">
          <Text style={styles.copy}>
            Finished workouts from this week will show here. When the week rolls over, this list resets for the new week.
          </Text>
        </SectionCard>
      ) : null}

      {currentWeekHistory.map((item) => (
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

      <Modal
        animationType="fade"
        transparent
        visible={isMissedModalOpen}
        onRequestClose={() => setIsMissedModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>What got in the way?</Text>
            <Text style={styles.copy}>
              Missed sessions are data, not a judgment. Log the reason so the next choice gets smarter.
            </Text>
            <View style={styles.reasonGrid}>
              {missedReasonOptions.map((option) => {
                const isSelected = missedReason === option.value;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setMissedReason(option.value)}
                    style={[styles.reasonChip, isSelected ? styles.reasonChipSelected : null]}
                  >
                    <Text style={[styles.reasonChipText, isSelected ? styles.reasonChipTextSelected : null]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.buttonStack}>
              <PrimaryButton
                label={isChallengeSaving ? "Saving..." : "Save Missed Session"}
                onPress={() => void handleSaveChallengeLog(false, missedReason)}
                disabled={isChallengeSaving}
              />
              <PrimaryButton
                label="Cancel"
                onPress={() => setIsMissedModalOpen(false)}
                disabled={isChallengeSaving}
                variant="ghost"
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  buttonStack: {
    gap: spacing.sm,
  },
  flexButton: {
    flex: 1,
    minWidth: 180,
  },
  challengeGoalList: {
    gap: spacing.xs,
  },
  noteItem: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  proofScoreCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.primary,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  proofScoreValue: {
    color: colors.primarySoft,
    fontSize: 44,
    fontWeight: "900",
    lineHeight: 50,
  },
  proofScoreCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  proofScoreTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },
  noticeBox: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  noticeTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  sharePromptCard: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.primary,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  shareCardPreview: {
    alignSelf: "center",
    width: "100%",
  },
  sharePromptTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  todayProofCard: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.primary,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  todayProofTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
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
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
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
  summaryCard: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  summaryCopy: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
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
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.72)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 420,
    padding: spacing.lg,
    width: "100%",
  },
  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  reasonChip: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  reasonChipSelected: {
    backgroundColor: "rgba(249,115,22,0.14)",
    borderColor: colors.primary,
  },
  reasonChipText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "700",
  },
  reasonChipTextSelected: {
    color: colors.primarySoft,
  },
});
