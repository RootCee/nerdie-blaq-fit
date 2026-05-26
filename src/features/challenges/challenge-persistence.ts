import AsyncStorage from "@react-native-async-storage/async-storage";

import { ChallengeId } from "@/config/challenges";
import { ensureSupabaseSession, getAuthenticatedSupabaseUserId, getOnboardingPersistenceConfig, supabase } from "@/lib/supabase";
import {
  ChallengeStatus,
  MissedWorkoutReason,
  UserChallenge,
  UserChallengeDailyLog,
  UserChallengeDailyLogRow,
  UserChallengeRow,
} from "@/types/challenge";

const LOCAL_CHALLENGES_KEY = "nerdie-blaq-fit:user-challenges";
const LOCAL_CHALLENGE_LOGS_KEY = "nerdie-blaq-fit:user-challenge-daily-logs";

export interface SaveChallengeDailyLogInput {
  userChallengeId: string;
  logDate: string;
  workoutCompleted: boolean;
  missedReason: MissedWorkoutReason | null;
  readinessScore: number | null;
  painFlag: boolean;
  strengthNotes: string;
}

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mapChallengeRow(row: UserChallengeRow): UserChallenge {
  return {
    id: row.id,
    challengeId: row.challenge_id,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    storageMode: "supabase",
  };
}

function mapDailyLogRow(row: UserChallengeDailyLogRow): UserChallengeDailyLog {
  return {
    id: row.id,
    userChallengeId: row.user_challenge_id,
    logDate: row.log_date,
    workoutCompleted: row.workout_completed,
    missedReason: row.missed_reason,
    readinessScore: row.readiness_score,
    painFlag: row.pain_flag,
    strengthNotes: row.strength_notes ?? "",
    createdAt: row.created_at,
    storageMode: "supabase",
  };
}

async function loadLocalChallenges(): Promise<UserChallenge[]> {
  const rawValue = await AsyncStorage.getItem(LOCAL_CHALLENGES_KEY);
  return rawValue ? JSON.parse(rawValue) as UserChallenge[] : [];
}

async function saveLocalChallenges(challenges: UserChallenge[]) {
  await AsyncStorage.setItem(LOCAL_CHALLENGES_KEY, JSON.stringify(challenges));
}

async function loadLocalDailyLogs(): Promise<UserChallengeDailyLog[]> {
  const rawValue = await AsyncStorage.getItem(LOCAL_CHALLENGE_LOGS_KEY);
  return rawValue ? JSON.parse(rawValue) as UserChallengeDailyLog[] : [];
}

async function saveLocalDailyLogs(logs: UserChallengeDailyLog[]) {
  await AsyncStorage.setItem(LOCAL_CHALLENGE_LOGS_KEY, JSON.stringify(logs));
}

async function loadActiveLocalChallenge(challengeId: ChallengeId): Promise<UserChallenge | null> {
  const challenges = await loadLocalChallenges();
  return challenges.find((challenge) => challenge.challengeId === challengeId && challenge.status === "active") ?? null;
}

async function startLocalChallenge(challengeId: ChallengeId): Promise<UserChallenge> {
  const existing = await loadActiveLocalChallenge(challengeId);

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const challenge: UserChallenge = {
    id: createLocalId("challenge"),
    challengeId,
    status: "active",
    startedAt: now,
    completedAt: null,
    createdAt: now,
    storageMode: "local",
  };
  const challenges = await loadLocalChallenges();
  await saveLocalChallenges([challenge, ...challenges]);

  return challenge;
}

async function saveLocalDailyLog(input: SaveChallengeDailyLogInput): Promise<UserChallengeDailyLog> {
  const logs = await loadLocalDailyLogs();
  const existing = logs.find((log) => log.userChallengeId === input.userChallengeId && log.logDate === input.logDate);
  const nextLog: UserChallengeDailyLog = {
    id: existing?.id ?? createLocalId("challenge-log"),
    userChallengeId: input.userChallengeId,
    logDate: input.logDate,
    workoutCompleted: input.workoutCompleted,
    missedReason: input.missedReason,
    readinessScore: input.readinessScore,
    painFlag: input.painFlag,
    strengthNotes: input.strengthNotes,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    storageMode: "local",
  };
  const nextLogs = [nextLog, ...logs.filter((log) => log.id !== nextLog.id)];
  await saveLocalDailyLogs(nextLogs);

  return nextLog;
}

export async function loadActiveChallenge(challengeId: ChallengeId): Promise<UserChallenge | null> {
  const config = getOnboardingPersistenceConfig();

  if (!config.isConfigured || !supabase) {
    return loadActiveLocalChallenge(challengeId);
  }

  try {
    const userId = await getAuthenticatedSupabaseUserId();
    const { data, error } = await supabase
      .from("user_challenges")
      .select("*")
      .eq("user_id", userId)
      .eq("challenge_id", challengeId)
      .eq("status", "active" satisfies ChallengeStatus)
      .order("started_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapChallengeRow(data as UserChallengeRow) : null;
  } catch {
    return loadActiveLocalChallenge(challengeId);
  }
}

export async function startChallenge(challengeId: ChallengeId): Promise<UserChallenge> {
  const config = getOnboardingPersistenceConfig();

  if (!config.isConfigured || !supabase) {
    return startLocalChallenge(challengeId);
  }

  try {
    await ensureSupabaseSession();
    const userId = await getAuthenticatedSupabaseUserId();
    const existing = await loadActiveChallenge(challengeId);

    if (existing) {
      return existing;
    }

    const { data, error } = await supabase
      .from("user_challenges")
      .insert({
        user_id: userId,
        challenge_id: challengeId,
        status: "active",
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return mapChallengeRow(data as UserChallengeRow);
  } catch {
    return startLocalChallenge(challengeId);
  }
}

export async function loadChallengeDailyLogs(userChallengeId: string): Promise<UserChallengeDailyLog[]> {
  const config = getOnboardingPersistenceConfig();

  if (!config.isConfigured || !supabase) {
    return (await loadLocalDailyLogs())
      .filter((log) => log.userChallengeId === userChallengeId)
      .sort((a, b) => a.logDate.localeCompare(b.logDate));
  }

  try {
    const userId = await getAuthenticatedSupabaseUserId();
    const { data, error } = await supabase
      .from("user_challenge_daily_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("user_challenge_id", userChallengeId)
      .order("log_date", { ascending: true });

    if (error) {
      throw error;
    }

    return ((data ?? []) as UserChallengeDailyLogRow[]).map(mapDailyLogRow);
  } catch {
    return (await loadLocalDailyLogs())
      .filter((log) => log.userChallengeId === userChallengeId)
      .sort((a, b) => a.logDate.localeCompare(b.logDate));
  }
}

export async function saveChallengeDailyLog(input: SaveChallengeDailyLogInput): Promise<UserChallengeDailyLog> {
  const config = getOnboardingPersistenceConfig();

  if (!config.isConfigured || !supabase || input.userChallengeId.startsWith("challenge-")) {
    return saveLocalDailyLog(input);
  }

  try {
    const userId = await getAuthenticatedSupabaseUserId();
    const { data, error } = await supabase
      .from("user_challenge_daily_logs")
      .upsert({
        user_id: userId,
        user_challenge_id: input.userChallengeId,
        log_date: input.logDate,
        workout_completed: input.workoutCompleted,
        missed_reason: input.missedReason,
        readiness_score: input.readinessScore,
        pain_flag: input.painFlag,
        strength_notes: input.strengthNotes || null,
      }, { onConflict: "user_challenge_id,log_date" })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return mapDailyLogRow(data as UserChallengeDailyLogRow);
  } catch {
    return saveLocalDailyLog(input);
  }
}
