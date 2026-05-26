import { ChallengeConfig } from "@/config/challenges";
import { BodyWeightLogRecord } from "@/types/body-weight";
import { ChallengeProofSummary, UserChallenge, UserChallengeDailyLog } from "@/types/challenge";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function calculateChallengeDay(challenge: UserChallenge, config: ChallengeConfig, now = new Date()) {
  const startedAt = startOfLocalDay(new Date(challenge.startedAt));
  const today = startOfLocalDay(now);
  const day = Math.floor((today.getTime() - startedAt.getTime()) / MS_PER_DAY) + 1;

  return Math.min(Math.max(day, 1), config.durationDays);
}

export function calculateCompletionPercentage(logs: UserChallengeDailyLog[], config: ChallengeConfig) {
  const loggedDays = new Set(logs.map((log) => log.logDate)).size;
  return Math.min(Math.round((loggedDays / config.durationDays) * 100), 100);
}

export function calculateAccountedWorkoutCount(logs: UserChallengeDailyLog[]) {
  return logs.filter((log) => log.workoutCompleted || log.missedReason).length;
}

export function calculateCheckInStreak(logs: UserChallengeDailyLog[], now = new Date()) {
  const loggedDates = new Set(logs.filter((log) => log.readinessScore !== null).map((log) => log.logDate));
  let cursor = startOfLocalDay(now);
  let streak = 0;

  while (loggedDates.has(formatDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export function calculateProofScore(logs: UserChallengeDailyLog[], config: ChallengeConfig) {
  const pointEligibleLogs = logs.filter((log) => log.workoutCompleted);
  const completed = logs.filter((log) => log.workoutCompleted).length;
  const missed = logs.filter((log) => !log.workoutCompleted && log.missedReason).length;
  const completedDays = new Set(pointEligibleLogs.map((log) => log.logDate)).size;
  const checkInDays = pointEligibleLogs.filter((log) => log.readinessScore !== null).length;
  const painFlags = pointEligibleLogs.filter((log) => log.painFlag).length;
  const strengthNotes = pointEligibleLogs.filter((log) => log.strengthNotes.trim()).length;
  const readinessScores = pointEligibleLogs
    .map((log) => log.readinessScore)
    .filter((score): score is number => typeof score === "number");
  const readinessImproved = readinessScores.length >= 4 && readinessScores[readinessScores.length - 1] >= readinessScores[0];

  const consistencyScore = (completedDays / config.durationDays) * 28;
  const workoutScore = Math.min(completed / Math.max(completed + missed, 1), 1) * 26;
  const checkInScore = (checkInDays / config.durationDays) * 18;
  const painManagementScore = completedDays > 0 ? Math.max(0, 1 - painFlags / completedDays) * 12 : 0;
  const overloadScore = Math.min(strengthNotes / 8, 1) * 12;
  const readinessScore = readinessImproved ? 4 : 0;

  return Math.round(Math.min(consistencyScore + workoutScore + checkInScore + painManagementScore + overloadScore + readinessScore, 100));
}

export function buildChallengeProofSummary(
  challenge: UserChallenge,
  config: ChallengeConfig,
  logs: UserChallengeDailyLog[],
  bodyWeightEntries: BodyWeightLogRecord[],
  now = new Date(),
): ChallengeProofSummary {
  const currentDay = calculateChallengeDay(challenge, config, now);
  const weekStart = addDays(startOfLocalDay(now), -6);
  const readinessScores = logs
    .map((log) => log.readinessScore)
    .filter((score): score is number => typeof score === "number");

  return {
    currentDay,
    currentWeek: Math.ceil(currentDay / 7),
    completionPercentage: calculateCompletionPercentage(logs, config),
    workoutsAccountedFor: calculateAccountedWorkoutCount(logs),
    workoutsCompleted: logs.filter((log) => log.workoutCompleted).length,
    workoutsCompletedThisWeek: logs.filter((log) => log.workoutCompleted && startOfLocalDay(new Date(log.logDate)) >= weekStart).length,
    missedSessions: logs.filter((log) => !log.workoutCompleted && log.missedReason).length,
    checkInStreak: calculateCheckInStreak(logs, now),
    averageReadinessScore: readinessScores.length
      ? Math.round(readinessScores.reduce((sum, score) => sum + score, 0) / readinessScores.length)
      : null,
    painFlags: logs.filter((log) => log.painFlag).length,
    strengthNoteCount: logs.filter((log) => log.strengthNotes.trim()).length,
    bodyWeightEntryCount: bodyWeightEntries.length,
    proofScore: calculateProofScore(logs, config),
  };
}

export function getTodayDateKey(now = new Date()) {
  return formatDateKey(now);
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
