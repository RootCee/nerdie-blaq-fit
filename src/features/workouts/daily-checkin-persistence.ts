import AsyncStorage from "@react-native-async-storage/async-storage";

import { ensureSupabaseSession, getOnboardingPersistenceConfig, supabase } from "@/lib/supabase";
import { DailyReadinessCheckIn, DailyReadinessCheckInRow, DEFAULT_SORENESS, MuscleGroupSoreness } from "@/types/readiness";

const LOCAL_CHECKIN_PREFIX = "nerdie-blaq-fit:daily-checkin:";

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function createDefaultDailyCheckIn(date = new Date()): DailyReadinessCheckIn {
  return {
    checkinDate: todayKey(date),
    sleepHours: 7,
    energyLevel: 7,
    soreness: DEFAULT_SORENESS,
    jointPainNotes: "",
    timeAvailableMinutes: 60,
    previousSessionRpe: 0,
    stressLevel: 5,
    storageMode: "local",
  };
}

function normalizeSoreness(value: Partial<MuscleGroupSoreness> | null | undefined): MuscleGroupSoreness {
  return {
    ...DEFAULT_SORENESS,
    ...(value ?? {}),
  };
}

function mapRowToCheckIn(row: DailyReadinessCheckInRow): DailyReadinessCheckIn {
  return {
    id: row.id,
    checkinDate: row.checkin_date,
    sleepHours: row.sleep_hours ?? 7,
    energyLevel: row.energy_level ?? 7,
    stressLevel: row.stress_level ?? 5,
    timeAvailableMinutes: row.time_available_minutes ?? 60,
    previousSessionRpe: row.previous_session_rpe ?? 0,
    soreness: normalizeSoreness(row.soreness),
    jointPainNotes: row.joint_pain_notes ?? "",
    storageMode: "supabase",
  };
}

function toSupabasePayload(userId: string, checkIn: DailyReadinessCheckIn) {
  return {
    user_id: userId,
    checkin_date: checkIn.checkinDate,
    sleep_hours: checkIn.sleepHours,
    energy_level: checkIn.energyLevel,
    stress_level: checkIn.stressLevel,
    time_available_minutes: checkIn.timeAvailableMinutes,
    previous_session_rpe: checkIn.previousSessionRpe,
    soreness: checkIn.soreness,
    joint_pain_notes: checkIn.jointPainNotes || null,
  };
}

async function resolveAuthenticatedUserId() {
  const session = await ensureSupabaseSession();
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unable to resolve the authenticated Supabase user for daily check-ins.");
  }

  return userId;
}

async function loadLocalDailyCheckIn(date: string) {
  const rawValue = await AsyncStorage.getItem(`${LOCAL_CHECKIN_PREFIX}${date}`);

  if (!rawValue) {
    return null;
  }

  return JSON.parse(rawValue) as DailyReadinessCheckIn;
}

async function saveLocalDailyCheckIn(checkIn: DailyReadinessCheckIn) {
  const localCheckIn = { ...checkIn, storageMode: "local" as const };
  await AsyncStorage.setItem(`${LOCAL_CHECKIN_PREFIX}${checkIn.checkinDate}`, JSON.stringify(localCheckIn));
  return localCheckIn;
}

export async function loadDailyCheckIn(date = todayKey()): Promise<DailyReadinessCheckIn | null> {
  const config = getOnboardingPersistenceConfig();

  if (!config.isConfigured || !supabase) {
    return loadLocalDailyCheckIn(date);
  }

  try {
    const userId = await resolveAuthenticatedUserId();
    const { data, error } = await supabase
      .from("user_daily_checkins")
      .select("*")
      .eq("user_id", userId)
      .eq("checkin_date", date)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapRowToCheckIn(data as DailyReadinessCheckInRow) : null;
  } catch {
    return loadLocalDailyCheckIn(date);
  }
}

export async function saveDailyCheckIn(checkIn: DailyReadinessCheckIn): Promise<DailyReadinessCheckIn> {
  const config = getOnboardingPersistenceConfig();

  if (!config.isConfigured || !supabase) {
    return saveLocalDailyCheckIn(checkIn);
  }

  try {
    const userId = await resolveAuthenticatedUserId();
    const { data, error } = await supabase
      .from("user_daily_checkins")
      .upsert(toSupabasePayload(userId, checkIn) as Record<string, unknown>, { onConflict: "user_id,checkin_date" })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return mapRowToCheckIn(data as DailyReadinessCheckInRow);
  } catch {
    return saveLocalDailyCheckIn(checkIn);
  }
}
