export type MuscleGroupSoreness = {
  chest: number;
  back: number;
  shoulders: number;
  arms: number;
  legs: number;
  core: number;
};

export interface DailyReadinessCheckIn {
  id?: string;
  checkinDate: string;
  sleepHours: number;
  energyLevel: number;
  soreness: MuscleGroupSoreness;
  jointPainNotes: string;
  timeAvailableMinutes: number;
  previousSessionRpe: number;
  stressLevel: number;
  storageMode?: "local" | "supabase";
}

export interface DailyReadinessCheckInRow {
  id: string;
  user_id: string;
  checkin_date: string;
  sleep_hours: number | null;
  energy_level: number | null;
  stress_level: number | null;
  time_available_minutes: number | null;
  previous_session_rpe: number | null;
  soreness: Partial<MuscleGroupSoreness> | null;
  joint_pain_notes: string | null;
  created_at: string;
}

export const DEFAULT_SORENESS: MuscleGroupSoreness = {
  chest: 0,
  back: 0,
  shoulders: 0,
  arms: 0,
  legs: 0,
  core: 0,
};
