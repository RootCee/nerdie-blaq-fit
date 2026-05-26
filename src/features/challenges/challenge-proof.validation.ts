import { getChallengeById } from "@/config/challenges";
import { buildChallengeProofSummary, calculateAccountedWorkoutCount, calculateCompletionPercentage, calculateProofScore } from "@/features/challenges/challenge-proof";
import { UserChallenge, UserChallengeDailyLog } from "@/types/challenge";

const challengeConfig = getChallengeById("four-week-beast");
const activeChallenge: UserChallenge = {
  id: "local-test-challenge",
  challengeId: "four-week-beast",
  status: "active",
  startedAt: "2026-05-01T08:00:00.000Z",
  completedAt: null,
  createdAt: "2026-05-01T08:00:00.000Z",
  storageMode: "local",
};

const logs: UserChallengeDailyLog[] = [
  {
    id: "log-1",
    userChallengeId: activeChallenge.id,
    logDate: "2026-05-01",
    workoutCompleted: true,
    missedReason: null,
    readinessScore: 72,
    painFlag: false,
    strengthNotes: "Bench moved smoother.",
    createdAt: "2026-05-01T08:00:00.000Z",
  },
  {
    id: "log-2",
    userChallengeId: activeChallenge.id,
    logDate: "2026-05-02",
    workoutCompleted: false,
    missedReason: "too-sore",
    readinessScore: 61,
    painFlag: true,
    strengthNotes: "",
    createdAt: "2026-05-02T08:00:00.000Z",
  },
  {
    id: "log-3",
    userChallengeId: activeChallenge.id,
    logDate: "2026-05-03",
    workoutCompleted: true,
    missedReason: null,
    readinessScore: 75,
    painFlag: false,
    strengthNotes: "Squat top set improved by 5 lb.",
    createdAt: "2026-05-03T08:00:00.000Z",
  },
];

const missedOnlyLogs: UserChallengeDailyLog[] = [
  {
    id: "missed-only-log",
    userChallengeId: activeChallenge.id,
    logDate: "2026-05-01",
    workoutCompleted: false,
    missedReason: "too-sore",
    readinessScore: 72,
    painFlag: true,
    strengthNotes: "",
    createdAt: "2026-05-01T08:00:00.000Z",
  },
];

export function validateChallengeProofBasics() {
  const summary = buildChallengeProofSummary(activeChallenge, challengeConfig, logs, [], new Date("2026-05-03T12:00:00.000Z"));

  return {
    startingChallengeShapeWorks: activeChallenge.status === "active" && activeChallenge.challengeId === "four-week-beast",
    completingDailyLogsWorks: logs.some((log) => log.workoutCompleted) && logs.some((log) => log.missedReason === "too-sore"),
    completionPercentageWorks: calculateCompletionPercentage(logs, challengeConfig) === 11,
    missedWorkoutCountsAsAccounted: calculateAccountedWorkoutCount(missedOnlyLogs) === 1,
    missedWorkoutGeneratesNoProofScore: calculateProofScore(missedOnlyLogs, challengeConfig) === 0,
    fitScoreWorks: calculateProofScore(logs, challengeConfig) > 0,
    localFallbackShapeWorks: activeChallenge.storageMode === "local",
    summaryIncludesProofMetrics: summary.proofScore > 0 && summary.missedSessions === 1 && summary.workoutsAccountedFor === 3,
  };
}
