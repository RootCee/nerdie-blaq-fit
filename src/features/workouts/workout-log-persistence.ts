import { ensureSupabaseSession, getAuthenticatedSupabaseUserId, getOnboardingPersistenceConfig, supabase } from "@/lib/supabase";
import { toExerciseSlug } from "@/features/workouts/exercise-library";
import {
  WorkoutDay,
  WorkoutDayLog,
  WorkoutExerciseLog,
  WorkoutPriorPerformanceSummary,
  WorkoutExerciseVolumeSummary,
  WorkoutHistoryItem,
  WorkoutSetLog,
  WorkoutVolumeSummary,
  StoredWorkoutDayLogRow,
} from "@/types/workout";

interface LegacyWorkoutExerciseLog {
  exerciseSlug: string;
  exerciseName: string;
  completedSets?: string;
  reps?: string;
  weightUsed?: string;
  notes?: string;
  sets?: WorkoutSetLog[];
}

function parsePlannedSetCount(setsLabel: string) {
  const match = setsLabel.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 1;
}

function createEmptySetLog(setNumber: number): WorkoutSetLog {
  return {
    setNumber,
    reps: "",
    weight: "",
    isCompleted: false,
  };
}

function normalizeSetLogs(rawSets: WorkoutSetLog[] | undefined, fallbackCount: number, fallbackReps = "", fallbackWeight = "") {
  if (rawSets?.length) {
    return rawSets.map((set, index) => ({
      setNumber: Number.isFinite(set.setNumber) ? set.setNumber : index + 1,
      reps: set.reps ?? "",
      weight: set.weight ?? "",
      isCompleted: Boolean(set.isCompleted),
    }));
  }

  return Array.from({ length: Math.max(fallbackCount, 1) }, (_, index) => ({
    ...createEmptySetLog(index + 1),
    reps: fallbackReps,
    weight: fallbackWeight,
    isCompleted: false,
  }));
}

function normalizeExerciseLog(entry: LegacyWorkoutExerciseLog, fallbackCount = 1): WorkoutExerciseLog {
  const legacyCompletedSets = Math.max(Number.parseInt(entry.completedSets ?? "0", 10) || 0, 0);
  const normalizedSets = normalizeSetLogs(
    entry.sets,
    Math.max(fallbackCount, legacyCompletedSets, 1),
    entry.reps ?? "",
    entry.weightUsed ?? "",
  ).map((set, index) => ({
    ...set,
    setNumber: index + 1,
    isCompleted: entry.sets?.length ? set.isCompleted : index < legacyCompletedSets,
  }));

  return {
    exerciseSlug: entry.exerciseSlug,
    exerciseName: entry.exerciseName,
    sets: normalizedSets,
    notes: entry.notes ?? "",
  };
}

function parseNumericValue(value: string) {
  const numeric = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

export function deriveWorkoutVolumeSummary(log: WorkoutDayLog): WorkoutVolumeSummary {
  const exercises: WorkoutExerciseVolumeSummary[] = log.exerciseLogs.map((exercise) => {
    const totalCompletedSets = exercise.sets.filter((set) => set.isCompleted).length;
    const totalCompletedReps = exercise.sets.reduce((sum, set) => {
      if (!set.isCompleted) {
        return sum;
      }

      return sum + parseNumericValue(set.reps);
    }, 0);
    const totalVolume = exercise.sets.reduce((sum, set) => {
      if (!set.isCompleted) {
        return sum;
      }

      return sum + parseNumericValue(set.reps) * parseNumericValue(set.weight);
    }, 0);

    return {
      exerciseSlug: exercise.exerciseSlug,
      exerciseName: exercise.exerciseName,
      totalVolume,
      totalCompletedReps,
      totalCompletedSets,
    };
  });

  return {
    totalWorkoutVolume: exercises.reduce((sum, exercise) => sum + exercise.totalVolume, 0),
    totalCompletedReps: exercises.reduce((sum, exercise) => sum + exercise.totalCompletedReps, 0),
    totalCompletedSets: exercises.reduce((sum, exercise) => sum + exercise.totalCompletedSets, 0),
    exercises,
  };
}

export function buildWorkoutDayLog(day: WorkoutDay, existingLog?: WorkoutDayLog | null): WorkoutDayLog {
  const existingBySlug = new Map(
    existingLog?.exerciseLogs.map((entry) => [entry.exerciseSlug, entry]) ?? [],
  );
  const allExercises = [...day.exercises, ...(day.coreFinisher?.exercises ?? [])];

  return {
    dayId: day.id,
    dayTitle: day.title,
    isCompleted: existingLog?.isCompleted ?? false,
    completedAt: existingLog?.completedAt ?? null,
    exerciseLogs: allExercises.map((exercise) => {
      const slug = exercise.slug ?? toExerciseSlug(exercise.name);
      const existingExerciseLog = existingBySlug.get(slug);
      const plannedSetCount = parsePlannedSetCount(exercise.sets);

      return normalizeExerciseLog({
        exerciseSlug: slug,
        exerciseName: exercise.name,
        sets: existingExerciseLog?.sets,
        notes: existingExerciseLog?.notes ?? "",
      }, existingExerciseLog?.sets.length ?? plannedSetCount);
    }),
  };
}

function mapStoredRowToWorkoutDayLog(row: StoredWorkoutDayLogRow): WorkoutDayLog {
  return {
    dayId: row.day_id,
    dayTitle: row.day_title,
    isCompleted: row.is_completed,
    completedAt: row.completed_at,
    exerciseLogs: row.exercise_logs.map((entry) => normalizeExerciseLog(entry as LegacyWorkoutExerciseLog)),
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

function mapExerciseLogToPriorPerformance(
  dayLog: WorkoutDayLog,
  exerciseLog: WorkoutExerciseLog,
): WorkoutPriorPerformanceSummary | null {
  if (!dayLog.completedAt) {
    return null;
  }

  const totalCompletedSets = exerciseLog.sets.filter((set) => set.isCompleted).length;
  const totalCompletedReps = exerciseLog.sets.reduce((sum, set) => {
    if (!set.isCompleted) {
      return sum;
    }

    return sum + parseNumericValue(set.reps);
  }, 0);
  const topWeight = exerciseLog.sets.reduce((max, set) => {
    if (!set.isCompleted) {
      return max;
    }

    return Math.max(max, parseNumericValue(set.weight));
  }, 0);

  if (!totalCompletedSets) {
    return null;
  }

  return {
    exerciseSlug: exerciseLog.exerciseSlug,
    exerciseName: exerciseLog.exerciseName,
    dayId: dayLog.dayId,
    dayTitle: dayLog.dayTitle,
    completedAt: dayLog.completedAt,
    sets: exerciseLog.sets,
    totalCompletedSets,
    totalCompletedReps,
    topWeight,
  };
}

export async function loadMostRecentPriorExerciseLogs(
  exerciseSlugs: string[],
  currentDayId: string,
): Promise<Record<string, WorkoutPriorPerformanceSummary>> {
  if (!exerciseSlugs.length) {
    return {};
  }

  const logsByDay = await loadWorkoutDayLogs();
  const sortedLogs = Object.values(logsByDay)
    .filter((log) => log.dayId !== currentDayId && log.isCompleted && log.completedAt)
    .sort((a, b) => new Date(b.completedAt as string).getTime() - new Date(a.completedAt as string).getTime());

  const remaining = new Set(exerciseSlugs);
  const results: Record<string, WorkoutPriorPerformanceSummary> = {};

  for (const dayLog of sortedLogs) {
    for (const exerciseLog of dayLog.exerciseLogs) {
      if (!remaining.has(exerciseLog.exerciseSlug)) {
        continue;
      }

      const summary = mapExerciseLogToPriorPerformance(dayLog, exerciseLog);

      if (!summary) {
        continue;
      }

      results[exerciseLog.exerciseSlug] = summary;
      remaining.delete(exerciseLog.exerciseSlug);

      if (!remaining.size) {
        return results;
      }
    }
  }

  return results;
}

function summarizeExerciseLog(entry: WorkoutExerciseLog) {
  const completedSets = entry.sets.filter((set) => set.isCompleted);
  const reps = completedSets.reduce((sum, set) => sum + parseNumericValue(set.reps), 0);
  const heaviestWeight = completedSets.reduce((max, set) => Math.max(max, parseNumericValue(set.weight)), 0);
  const weightSuffix = heaviestWeight ? ` @ up to ${heaviestWeight}` : "";

  return `${entry.exerciseName}: ${completedSets.length} sets, ${reps} reps${weightSuffix}`;
}

function mapWorkoutDayLogToHistoryItem(log: WorkoutDayLog): WorkoutHistoryItem | null {
  if (!log.isCompleted || !log.completedAt) {
    return null;
  }

  const notesPreview =
    log.exerciseLogs
      .map((entry) => entry.notes.trim())
      .find(Boolean) ?? null;

  const exerciseSummary = log.exerciseLogs
    .slice(0, 2)
    .map(summarizeExerciseLog)
    .join(" • ");
  const volumeSummary = deriveWorkoutVolumeSummary(log);

  return {
    dayId: log.dayId,
    dayTitle: log.dayTitle,
    completedAt: log.completedAt,
    completionStatus: "completed",
    exerciseSummary,
    notesPreview,
    loggedExerciseCount: log.exerciseLogs.length,
    totalCompletedSets: volumeSummary.totalCompletedSets,
    totalCompletedReps: volumeSummary.totalCompletedReps,
    totalWorkoutVolume: volumeSummary.totalWorkoutVolume,
  };
}

export async function loadWorkoutHistory(): Promise<WorkoutHistoryItem[]> {
  const logsByDay = await loadWorkoutDayLogs();
  const history = Object.values(logsByDay)
    .map(mapWorkoutDayLogToHistoryItem)
    .filter((item): item is WorkoutHistoryItem => Boolean(item))
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  return history;
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
