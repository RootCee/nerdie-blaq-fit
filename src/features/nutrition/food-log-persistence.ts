import AsyncStorage from "@react-native-async-storage/async-storage";

import { ensureSupabaseSession, getAuthenticatedSupabaseUserId, getOnboardingPersistenceConfig, supabase } from "@/lib/supabase";
import { FoodLogDailyTotals, FoodLogEntry, FoodLogEntryInput, FoodLogRow } from "@/types/nutrition";

const LOCAL_FOOD_LOGS_KEY = "nerdie-blaq-fit:food-logs";

function createLocalId() {
  return `food-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
}

function mapFoodLogRow(row: FoodLogRow): FoodLogEntry {
  return {
    id: row.id,
    logDate: row.log_date,
    mealType: row.meal_type,
    foodName: row.food_name,
    calories: normalizeNumber(row.calories),
    proteinG: normalizeNumber(Number(row.protein_g)),
    carbsG: normalizeNumber(Number(row.carbs_g)),
    fatG: normalizeNumber(Number(row.fat_g)),
    servingNotes: row.serving_notes ?? "",
    createdAt: row.created_at,
    storageMode: "supabase",
  };
}

function mapInputToFoodLogRow(userId: string, input: FoodLogEntryInput) {
  return {
    user_id: userId,
    log_date: input.logDate,
    meal_type: input.mealType,
    food_name: input.foodName.trim(),
    calories: Math.round(normalizeNumber(input.calories)),
    protein_g: normalizeNumber(input.proteinG),
    carbs_g: normalizeNumber(input.carbsG),
    fat_g: normalizeNumber(input.fatG),
    serving_notes: input.servingNotes.trim() || null,
  };
}

async function loadLocalFoodLogs(): Promise<FoodLogEntry[]> {
  const rawValue = await AsyncStorage.getItem(LOCAL_FOOD_LOGS_KEY);
  return rawValue ? JSON.parse(rawValue) as FoodLogEntry[] : [];
}

async function saveLocalFoodLogs(logs: FoodLogEntry[]) {
  await AsyncStorage.setItem(LOCAL_FOOD_LOGS_KEY, JSON.stringify(logs));
}

async function saveLocalFoodLog(input: FoodLogEntryInput): Promise<FoodLogEntry> {
  const now = new Date().toISOString();
  const entry: FoodLogEntry = {
    id: createLocalId(),
    logDate: input.logDate,
    mealType: input.mealType,
    foodName: input.foodName.trim(),
    calories: Math.round(normalizeNumber(input.calories)),
    proteinG: normalizeNumber(input.proteinG),
    carbsG: normalizeNumber(input.carbsG),
    fatG: normalizeNumber(input.fatG),
    servingNotes: input.servingNotes.trim(),
    createdAt: now,
    storageMode: "local",
  };
  const logs = await loadLocalFoodLogs();
  await saveLocalFoodLogs([entry, ...logs]);

  return entry;
}

export async function loadFoodLogsForDate(logDate: string): Promise<FoodLogEntry[]> {
  const config = getOnboardingPersistenceConfig();

  if (!config.isConfigured || !supabase) {
    return (await loadLocalFoodLogs())
      .filter((entry) => entry.logDate === logDate)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  try {
    const userId = await getAuthenticatedSupabaseUserId();
    const { data, error } = await supabase
      .from("user_food_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("log_date", logDate)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return ((data ?? []) as FoodLogRow[]).map(mapFoodLogRow);
  } catch {
    return (await loadLocalFoodLogs())
      .filter((entry) => entry.logDate === logDate)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export async function loadRecentFoodLogs(limit = 12): Promise<FoodLogEntry[]> {
  const config = getOnboardingPersistenceConfig();

  if (!config.isConfigured || !supabase) {
    return (await loadLocalFoodLogs())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  try {
    const userId = await getAuthenticatedSupabaseUserId();
    const { data, error } = await supabase
      .from("user_food_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return ((data ?? []) as FoodLogRow[]).map(mapFoodLogRow);
  } catch {
    return (await loadLocalFoodLogs())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }
}

export async function saveFoodLog(input: FoodLogEntryInput): Promise<FoodLogEntry> {
  if (!input.foodName.trim()) {
    throw new Error("Add a food name before saving.");
  }

  const config = getOnboardingPersistenceConfig();

  if (!config.isConfigured || !supabase) {
    return saveLocalFoodLog(input);
  }

  try {
    await ensureSupabaseSession();
    const userId = await getAuthenticatedSupabaseUserId();
    const { data, error } = await supabase
      .from("user_food_logs")
      .insert(mapInputToFoodLogRow(userId, input))
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return mapFoodLogRow(data as FoodLogRow);
  } catch {
    return saveLocalFoodLog(input);
  }
}

export function calculateFoodLogDailyTotals(entries: FoodLogEntry[]): FoodLogDailyTotals {
  return entries.reduce<FoodLogDailyTotals>(
    (totals, entry) => ({
      calories: totals.calories + entry.calories,
      proteinG: totals.proteinG + entry.proteinG,
      carbsG: totals.carbsG + entry.carbsG,
      fatG: totals.fatG + entry.fatG,
    }),
    {
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    },
  );
}
