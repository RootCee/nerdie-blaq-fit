import AsyncStorage from "@react-native-async-storage/async-storage";

import { ensureSupabaseSession, getAuthenticatedSupabaseUserId, getOnboardingPersistenceConfig, supabase } from "@/lib/supabase";
import { SupplementLogEntry, SupplementLogEntryInput, SupplementLogRow } from "@/types/nutrition";

const LOCAL_SUPPLEMENT_LOGS_KEY = "nerdie-blaq-fit:supplement-logs";

function createLocalId() {
  return `supplement-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
}

function mapSupplementLogRow(row: SupplementLogRow): SupplementLogEntry {
  return {
    id: row.id,
    logDate: row.log_date,
    timing: row.timing,
    supplementName: row.supplement_name,
    amount: row.amount,
    calories: normalizeNumber(row.calories),
    proteinG: normalizeNumber(Number(row.protein_g)),
    carbsG: normalizeNumber(Number(row.carbs_g)),
    fatG: normalizeNumber(Number(row.fat_g)),
    notes: row.notes ?? "",
    createdAt: row.created_at,
    storageMode: "supabase",
  };
}

function mapInputToSupplementLogRow(userId: string, input: SupplementLogEntryInput) {
  return {
    user_id: userId,
    log_date: input.logDate,
    timing: input.timing,
    supplement_name: input.supplementName.trim(),
    amount: input.amount.trim(),
    calories: Math.round(normalizeNumber(input.calories)),
    protein_g: normalizeNumber(input.proteinG),
    carbs_g: normalizeNumber(input.carbsG),
    fat_g: normalizeNumber(input.fatG),
    notes: input.notes.trim() || null,
  };
}

async function loadLocalSupplementLogs(): Promise<SupplementLogEntry[]> {
  const rawValue = await AsyncStorage.getItem(LOCAL_SUPPLEMENT_LOGS_KEY);
  return rawValue ? JSON.parse(rawValue) as SupplementLogEntry[] : [];
}

async function saveLocalSupplementLogs(logs: SupplementLogEntry[]) {
  await AsyncStorage.setItem(LOCAL_SUPPLEMENT_LOGS_KEY, JSON.stringify(logs));
}

async function saveLocalSupplementLog(input: SupplementLogEntryInput): Promise<SupplementLogEntry> {
  const now = new Date().toISOString();
  const entry: SupplementLogEntry = {
    id: createLocalId(),
    logDate: input.logDate,
    timing: input.timing,
    supplementName: input.supplementName.trim(),
    amount: input.amount.trim(),
    calories: Math.round(normalizeNumber(input.calories)),
    proteinG: normalizeNumber(input.proteinG),
    carbsG: normalizeNumber(input.carbsG),
    fatG: normalizeNumber(input.fatG),
    notes: input.notes.trim(),
    createdAt: now,
    storageMode: "local",
  };
  const logs = await loadLocalSupplementLogs();
  await saveLocalSupplementLogs([entry, ...logs]);

  return entry;
}

export async function loadSupplementLogsForDate(logDate: string): Promise<SupplementLogEntry[]> {
  const config = getOnboardingPersistenceConfig();

  if (!config.isConfigured || !supabase) {
    return (await loadLocalSupplementLogs())
      .filter((entry) => entry.logDate === logDate)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  try {
    const userId = await getAuthenticatedSupabaseUserId();
    const { data, error } = await supabase
      .from("user_supplement_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("log_date", logDate)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return ((data ?? []) as SupplementLogRow[]).map(mapSupplementLogRow);
  } catch {
    return (await loadLocalSupplementLogs())
      .filter((entry) => entry.logDate === logDate)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export async function loadRecentSupplementLogs(limit = 8): Promise<SupplementLogEntry[]> {
  const config = getOnboardingPersistenceConfig();

  if (!config.isConfigured || !supabase) {
    return (await loadLocalSupplementLogs())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  try {
    const userId = await getAuthenticatedSupabaseUserId();
    const { data, error } = await supabase
      .from("user_supplement_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return ((data ?? []) as SupplementLogRow[]).map(mapSupplementLogRow);
  } catch {
    return (await loadLocalSupplementLogs())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }
}

export async function saveSupplementLog(input: SupplementLogEntryInput): Promise<SupplementLogEntry> {
  if (!input.supplementName.trim()) {
    throw new Error("Add a supplement name before saving.");
  }

  if (!input.amount.trim()) {
    throw new Error("Add an amount before saving.");
  }

  const config = getOnboardingPersistenceConfig();

  if (!config.isConfigured || !supabase) {
    return saveLocalSupplementLog(input);
  }

  try {
    await ensureSupabaseSession();
    const userId = await getAuthenticatedSupabaseUserId();
    const { data, error } = await supabase
      .from("user_supplement_logs")
      .insert(mapInputToSupplementLogRow(userId, input))
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return mapSupplementLogRow(data as SupplementLogRow);
  } catch {
    return saveLocalSupplementLog(input);
  }
}
