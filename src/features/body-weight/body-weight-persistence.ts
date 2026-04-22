import { ensureSupabaseSession, getAuthenticatedSupabaseUserId, getOnboardingPersistenceConfig, supabase } from "@/lib/supabase";
import { BodyWeightLogRecord, StoredBodyWeightLogRow } from "@/types/body-weight";

function getTodayDateKey(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function mapStoredRowToBodyWeightLog(row: StoredBodyWeightLogRow): BodyWeightLogRecord {
  return {
    userId: row.user_id,
    loggedOn: row.logged_on,
    weight: row.weight,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseWeightInput(weight: string | number) {
  const value = typeof weight === "number" ? weight : Number.parseFloat(weight.trim());

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Enter a valid body weight before saving.");
  }

  return Number(value.toFixed(2));
}

export async function loadTodayBodyWeight(): Promise<BodyWeightLogRecord | null> {
  const config = getOnboardingPersistenceConfig();

  if (!config.isConfigured || !supabase) {
    return null;
  }

  const userId = await getAuthenticatedSupabaseUserId();
  const today = getTodayDateKey();
  const { data, error } = await supabase
    .from("user_body_weight_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("logged_on", today)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapStoredRowToBodyWeightLog(data as StoredBodyWeightLogRow) : null;
}

export async function saveTodayBodyWeight(weight: string | number): Promise<BodyWeightLogRecord | null> {
  const config = getOnboardingPersistenceConfig();

  if (!config.isConfigured || !supabase) {
    return null;
  }

  await ensureSupabaseSession();
  const userId = await getAuthenticatedSupabaseUserId();
  const loggedOn = getTodayDateKey();
  const payload = {
    user_id: userId,
    logged_on: loggedOn,
    weight: parseWeightInput(weight),
  };

  const { data, error } = await supabase
    .from("user_body_weight_logs")
    .upsert(payload as Record<string, unknown>, { onConflict: "user_id,logged_on" })
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapStoredRowToBodyWeightLog(data as StoredBodyWeightLogRow) : null;
}

export async function loadRecentBodyWeightHistory(limit = 14): Promise<BodyWeightLogRecord[]> {
  const config = getOnboardingPersistenceConfig();

  if (!config.isConfigured || !supabase) {
    return [];
  }

  const userId = await getAuthenticatedSupabaseUserId();
  const { data, error } = await supabase
    .from("user_body_weight_logs")
    .select("*")
    .eq("user_id", userId)
    .order("logged_on", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return ((data ?? []) as StoredBodyWeightLogRow[]).map(mapStoredRowToBodyWeightLog);
}
