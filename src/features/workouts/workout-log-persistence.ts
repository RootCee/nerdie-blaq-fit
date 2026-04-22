import { ensureSupabaseSession, getAuthenticatedSupabaseUserId, getOnboardingPersistenceConfig, supabase } from "@/lib/supabase";
import { toExerciseSlug } from "@/features/workouts/exercise-library";
import { WorkoutDay, WorkoutDayLog, WorkoutExerciseLog, StoredWorkoutDayLogRow } from "@/types/workout";

export function buildWorkoutDayLog(day: WorkoutDay, existingLog?: WorkoutDayLog | null): WorkoutDayLog {
  const existingBySlug = new Map(
    existingLog?.exerciseLogs.map((entry) => [entry.exerciseSlug, entry]) ?? [],
  );

  return {
    dayId: day.id,
    dayTitle: day.title,
    isCompleted: existingLog?.isCompleted ?? false,
    completedAt: existingLog?.completedAt ?? null,
    exerciseLogs: day.exercises.map((exercise) => {
      const slug = exercise.slug ?? toExerciseSlug(exercise.name);
      const existingExerciseLog = existingBySlug.get(slug);

      return {
        exerciseSlug: slug,
        exerciseName: exercise.name,
        completedSets: existingExerciseLog?.completedSets ?? "",
        reps: existingExerciseLog?.reps ?? "",
        weightUsed: existingExerciseLog?.weightUsed ?? "",
        notes: existingExerciseLog?.notes ?? "",
      };
    }),
  };
}

function mapStoredRowToWorkoutDayLog(row: StoredWorkoutDayLogRow): WorkoutDayLog {
  return {
    dayId: row.day_id,
    dayTitle: row.day_title,
    isCompleted: row.is_completed,
    completedAt: row.completed_at,
    exerciseLogs: row.exercise_logs,
  };
}

function mapWorkoutDayLogToStoredRow(userId: string, log: WorkoutDayLog): Omit<StoredWorkoutDayLogRow, "created_at" | "updated_at"> {
  return {
    user_id: userId,
    day_id: log.dayId,
    day_title: log.dayTitle,
    is_completed: log.isCompleted,
    completed_at: log.completedAt,
    exercise_logs: log.exerciseLogs,
  };
}

export async function loadWorkoutDayLogs(): Promise<Record<string, WorkoutDayLog>> {
  const config = getOnboardingPersistenceConfig();

  if (!config.isConfigured || !supabase) {
    return {};
  }

  const userId = await getAuthenticatedSupabaseUserId();
  const { data, error } = await supabase
    .from("user_workout_day_logs")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as StoredWorkoutDayLogRow[];

  return Object.fromEntries(
    rows.map((row) => {
      const log = mapStoredRowToWorkoutDayLog(row);
      return [log.dayId, log];
    }),
  );
}

export async function loadWorkoutDayLog(dayId: string): Promise<WorkoutDayLog | null> {
  const config = getOnboardingPersistenceConfig();

  if (!config.isConfigured || !supabase) {
    return null;
  }

  const userId = await getAuthenticatedSupabaseUserId();
  const { data, error } = await supabase
    .from("user_workout_day_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("day_id", dayId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const row = data as StoredWorkoutDayLogRow | null;
  return row ? mapStoredRowToWorkoutDayLog(row) : null;
}

export async function replaceWorkoutDayLog(log: WorkoutDayLog): Promise<WorkoutDayLog> {
  const config = getOnboardingPersistenceConfig();

  if (!config.isConfigured || !supabase) {
    return log;
  }

  await ensureSupabaseSession();
  const userId = await getAuthenticatedSupabaseUserId();
  const payload = mapWorkoutDayLogToStoredRow(userId, log);

  const { error } = await supabase
    .from("user_workout_day_logs")
    .upsert(payload as Record<string, unknown>, { onConflict: "user_id,day_id" });

  if (error) {
    throw error;
  }

  return log;
}

export async function deleteAllWorkoutDayLogs(): Promise<void> {
  const config = getOnboardingPersistenceConfig();

  if (!config.isConfigured || !supabase) {
    return;
  }

  const userId = await getAuthenticatedSupabaseUserId();
  const { error } = await supabase
    .from("user_workout_day_logs")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}
