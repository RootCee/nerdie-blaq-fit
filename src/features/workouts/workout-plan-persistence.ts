import { ensureSupabaseSession, getOnboardingPersistenceConfig, supabase } from "@/lib/supabase";
import { WorkoutPlan, StoredWorkoutPlanRow } from "@/types/workout";

async function resolveAuthenticatedUserId() {
  const session = await ensureSupabaseSession();
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unable to resolve the authenticated Supabase user for workout plan persistence.");
  }

  return userId;
}

export async function loadActiveWorkoutPlan(): Promise<WorkoutPlan | null> {
  const config = getOnboardingPersistenceConfig();

  if (!config.isConfigured || !supabase) {
    return null;
  }

  const userId = await resolveAuthenticatedUserId();
  const { data, error } = await supabase
    .from("user_workout_plans")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const row = data as StoredWorkoutPlanRow | null;
  return row?.plan_snapshot ?? null;
}

export async function saveWorkoutPlan(plan: WorkoutPlan): Promise<WorkoutPlan> {
  const config = getOnboardingPersistenceConfig();

  if (!config.isConfigured || !supabase) {
    return plan;
  }

  const userId = await resolveAuthenticatedUserId();
  const payload = {
    user_id: userId,
    plan_snapshot: plan,
  };

  const { error } = await supabase
    .from("user_workout_plans")
    .insert(payload as Record<string, unknown>);

  if (error) {
    throw error;
  }

  return plan;
}

export async function replaceActiveWorkoutPlan(plan: WorkoutPlan): Promise<WorkoutPlan> {
  const config = getOnboardingPersistenceConfig();

  if (!config.isConfigured || !supabase) {
    return plan;
  }

  const userId = await resolveAuthenticatedUserId();
  const payload = {
    user_id: userId,
    plan_snapshot: plan,
  };

  const { error } = await supabase
    .from("user_workout_plans")
    .upsert(payload as Record<string, unknown>, { onConflict: "user_id" });

  if (error) {
    throw error;
  }

  return plan;
}
