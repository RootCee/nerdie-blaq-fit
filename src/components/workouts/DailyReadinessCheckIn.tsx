import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { FormField } from "@/components/ui/FormField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { DailyReadinessCheckIn as DailyReadinessCheckInValue, MuscleGroupSoreness } from "@/types/readiness";
import { colors, spacing } from "@/theme";

interface DailyReadinessCheckInProps {
  value: DailyReadinessCheckInValue;
  isSaving: boolean;
  error: string | null;
  onChange: (value: DailyReadinessCheckInValue) => void;
  onSave: (value: DailyReadinessCheckInValue) => void;
  onGenerateAdaptive: (value: DailyReadinessCheckInValue) => void;
}

const sorenessGroups: Array<keyof MuscleGroupSoreness> = ["chest", "back", "shoulders", "arms", "legs", "core"];
const neutralDefaults = {
  sleepHours: 7,
  energyLevel: 7,
  stressLevel: 5,
  timeAvailableMinutes: 60,
  previousSessionRpe: 0,
};

type NumericCheckInKey = "sleepHours" | "energyLevel" | "stressLevel" | "timeAvailableMinutes" | "previousSessionRpe";

function formatDraftValue(value: number) {
  return Number.isFinite(value) ? String(value) : "";
}

function parseDraftNumber(rawValue: string) {
  if (!rawValue.trim()) {
    return null;
  }

  const numeric = Number(rawValue.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function clampByKey(key: NumericCheckInKey, value: number) {
  if (key === "sleepHours") return clamp(value, 0, 24);
  if (key === "timeAvailableMinutes") return clamp(value, 0, 240);
  return clamp(value, 0, 10);
}

export function DailyReadinessCheckIn({ value, isSaving, error, onChange, onSave, onGenerateAdaptive }: DailyReadinessCheckInProps) {
  const [numberDrafts, setNumberDrafts] = useState<Record<NumericCheckInKey, string>>({
    sleepHours: formatDraftValue(value.sleepHours),
    energyLevel: formatDraftValue(value.energyLevel),
    stressLevel: formatDraftValue(value.stressLevel),
    timeAvailableMinutes: formatDraftValue(value.timeAvailableMinutes),
    previousSessionRpe: formatDraftValue(value.previousSessionRpe),
  });
  const [sorenessDrafts, setSorenessDrafts] = useState<Record<keyof MuscleGroupSoreness, string>>({
    chest: formatDraftValue(value.soreness.chest),
    back: formatDraftValue(value.soreness.back),
    shoulders: formatDraftValue(value.soreness.shoulders),
    arms: formatDraftValue(value.soreness.arms),
    legs: formatDraftValue(value.soreness.legs),
    core: formatDraftValue(value.soreness.core),
  });

  useEffect(() => {
    setNumberDrafts({
      sleepHours: formatDraftValue(value.sleepHours),
      energyLevel: formatDraftValue(value.energyLevel),
      stressLevel: formatDraftValue(value.stressLevel),
      timeAvailableMinutes: formatDraftValue(value.timeAvailableMinutes),
      previousSessionRpe: formatDraftValue(value.previousSessionRpe),
    });
    setSorenessDrafts({
      chest: formatDraftValue(value.soreness.chest),
      back: formatDraftValue(value.soreness.back),
      shoulders: formatDraftValue(value.soreness.shoulders),
      arms: formatDraftValue(value.soreness.arms),
      legs: formatDraftValue(value.soreness.legs),
      core: formatDraftValue(value.soreness.core),
    });
  }, [
    value.checkinDate,
    value.energyLevel,
    value.previousSessionRpe,
    value.sleepHours,
    value.soreness.arms,
    value.soreness.back,
    value.soreness.chest,
    value.soreness.core,
    value.soreness.legs,
    value.soreness.shoulders,
    value.stressLevel,
    value.timeAvailableMinutes,
  ]);

  const updateNumber = (key: NumericCheckInKey, rawValue: string) => {
    setNumberDrafts((current) => ({ ...current, [key]: rawValue }));
    const nextValue = parseDraftNumber(rawValue);

    if (nextValue === null) {
      return;
    }

    onChange({
      ...value,
      [key]: clampByKey(key, nextValue),
    });
  };

  const updateSoreness = (group: keyof MuscleGroupSoreness, rawValue: string) => {
    setSorenessDrafts((current) => ({ ...current, [group]: rawValue }));
    const nextValue = parseDraftNumber(rawValue);

    if (nextValue === null) {
      return;
    }

    onChange({
      ...value,
      soreness: {
        ...value.soreness,
        [group]: clamp(nextValue, 0, 10),
      },
    });
  };

  const normalizeDrafts = (): DailyReadinessCheckInValue => {
    const normalizedNumbers = (Object.keys(neutralDefaults) as NumericCheckInKey[]).reduce((result, key) => {
      const parsedValue = parseDraftNumber(numberDrafts[key]);
      return {
        ...result,
        [key]: clampByKey(key, parsedValue ?? neutralDefaults[key]),
      };
    }, {} as Pick<DailyReadinessCheckInValue, NumericCheckInKey>);
    const normalizedSoreness = sorenessGroups.reduce((result, group) => {
      const parsedValue = parseDraftNumber(sorenessDrafts[group]);
      return {
        ...result,
        [group]: clamp(parsedValue ?? 0, 0, 10),
      };
    }, {} as MuscleGroupSoreness);

    return {
      ...value,
      ...normalizedNumbers,
      soreness: normalizedSoreness,
    };
  };

  const handleAction = (action: "save" | "generate") => {
    const normalizedValue = normalizeDrafts();
    onChange(normalizedValue);

    if (action === "save") {
      onSave(normalizedValue);
      return;
    }

    onGenerateAdaptive(normalizedValue);
  };

  return (
    <SectionCard title="Daily Readiness Check-In" eyebrow="Save or adapt">
      <Text style={styles.copy}>
        Complete the check-in, then save it as today's readiness. You can generate an adaptive workout from it or start the planned session as-is.
      </Text>
      <View style={styles.grid}>
        <FormField
          label="Sleep hours"
          value={numberDrafts.sleepHours}
          onChangeText={(text) => updateNumber("sleepHours", text)}
          keyboardType="decimal-pad"
          placeholder="7"
          helper="Blank uses 7. Use 0 if you did not sleep."
        />
        <FormField
          label="Energy 0-10"
          value={numberDrafts.energyLevel}
          onChangeText={(text) => updateNumber("energyLevel", text)}
          keyboardType="number-pad"
          placeholder="7"
        />
        <FormField
          label="Stress 0-10"
          value={numberDrafts.stressLevel}
          onChangeText={(text) => updateNumber("stressLevel", text)}
          keyboardType="number-pad"
          placeholder="5"
        />
        <FormField
          label="Time available"
          value={numberDrafts.timeAvailableMinutes}
          onChangeText={(text) => updateNumber("timeAvailableMinutes", text)}
          keyboardType="number-pad"
          placeholder="60"
          helper="Blank uses 60 minutes."
        />
        <FormField
          label="Previous RPE 0-10"
          value={numberDrafts.previousSessionRpe}
          onChangeText={(text) => updateNumber("previousSessionRpe", text)}
          keyboardType="number-pad"
          placeholder="0"
          helper="Use 0 if you did not train last session. RPE means Rate of Perceived Exertion: 10 is maximum effort."
        />
      </View>
      <View style={styles.sorenessGrid}>
        {sorenessGroups.map((group) => (
          <FormField
            key={group}
            label={`${group.charAt(0).toUpperCase()}${group.slice(1)} soreness 0-10`}
            value={sorenessDrafts[group]}
            onChangeText={(text) => updateSoreness(group, text)}
            keyboardType="number-pad"
            placeholder="0"
          />
        ))}
      </View>
      <FormField
        label="Joint pain notes"
        value={value.jointPainNotes}
        onChangeText={(text) => onChange({ ...value, jointPainNotes: text })}
        placeholder="Shoulder, knee, elbow, back notes..."
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />
      <PrimaryButton
        label={isSaving ? "Saving check-in..." : "Save Daily Readiness"}
        onPress={() => handleAction("save")}
        disabled={isSaving}
      />
      <PrimaryButton
        label={isSaving ? "Saving check-in..." : "Generate Adaptive Workout"}
        onPress={() => handleAction("generate")}
        disabled={isSaving}
        variant="ghost"
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Text style={styles.storageText}>
        Check-in mode: {value.storageMode === "supabase" ? "Supabase" : "local fallback"}
      </Text>
    </SectionCard>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);
}

const styles = StyleSheet.create({
  copy: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  grid: {
    gap: spacing.sm,
  },
  sorenessGrid: {
    gap: spacing.sm,
  },
  storageText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
});
