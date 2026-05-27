import { ChallengeId } from "@/config/challenges";

export type ChallengeStatus = "active" | "completed" | "abandoned";

export type MissedWorkoutReason =
  | "not-enough-time"
  | "too-sore"
  | "low-energy"
  | "injury-pain"
  | "forgot"
  | "other";

export interface UserChallenge {
  id: string;
  challengeId: ChallengeId;
  status: ChallengeStatus;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  storageMode?: "local" | "supabase";
}

export interface UserChallengeDailyLog {
  id: string;
  userChallengeId: string;
  logDate: string;
  workoutCompleted: boolean;
  missedReason: MissedWorkoutReason | null;
  readinessScore: number | null;
  painFlag: boolean;
  strengthNotes: string;
  createdAt: string;
  storageMode?: "local" | "supabase";
}

export interface UserChallengeRow {
  id: string;
  user_id: string;
  challenge_id: ChallengeId;
  status: ChallengeStatus;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface UserChallengeDailyLogRow {
  id: string;
  user_id: string;
  user_challenge_id: string;
  log_date: string;
  workout_completed: boolean;
  missed_reason: MissedWorkoutReason | null;
  readiness_score: number | null;
  pain_flag: boolean;
  strength_notes: string | null;
  created_at: string;
}

export interface ChallengeProofSummary {
  currentDay: number;
  currentWeek: number;
  completionPercentage: number;
  daysLogged: number;
  workoutsAccountedFor: number;
  workoutsCompleted: number;
  workoutsCompletedThisWeek: number;
  missedSessions: number;
  checkInStreak: number;
  averageReadinessScore: number | null;
  painFlags: number;
  strengthNoteCount: number;
  bodyWeightEntryCount: number;
  proofScore: number;
}
