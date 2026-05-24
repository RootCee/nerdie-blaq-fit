import { StyleSheet, Text, View } from "react-native";

import { FormField } from "@/components/ui/FormField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { DailyReadinessCheckIn as DailyReadinessCheckInValue, MuscleGroupSoreness } from "@/types/readiness";
import { colors, spacing } from "@/theme";

interface DailyReadinessCheckInProps {
  value: DailyReadinessCheckInValue;
  isSaving: boolean;
  onChange: (value: DailyReadinessCheckInValue) => void;
  onSubmit: () => void;
}

const sorenessGroups: Array<keyof MuscleGroupSoreness> = ["chest", "back", "shoulders", "arms", "legs", "core"];

export function DailyReadinessCheckIn({ value, isSaving, onChange, onSubmit }: DailyReadinessCheckInProps) {
  const updateNumber = (key: keyof DailyReadinessCheckInValue, rawValue: string) => {
    const nextValue = Number(rawValue.replace(/[^0-9.]/g, ""));
    onChange({
      ...value,
      [key]: Number.isFinite(nextValue) ? nextValue : 0,
    });
  };

  const updateSoreness = (group: keyof MuscleGroupSoreness, rawValue: string) => {
    const nextValue = clamp(Number(rawValue.replace(/[^0-9]/g, "")), 1, 10);
    onChange({
      ...value,
      soreness: {
        ...value.soreness,
        [group]: nextValue,
      },
    });
  };

  return (
    <SectionCard title="Daily Readiness Check-In" eyebrow="Before generation">
      <Text style={styles.copy}>
        Daily adaptation works best when the inputs are honest. This does not diagnose injuries; it helps today's plan scale intelligently.
      </Text>
      <View style={styles.grid}>
        <FormField
          label="Sleep hours"
          value={String(value.sleepHours)}
          onChangeText={(text) => updateNumber("sleepHours", text)}
          keyboardType="decimal-pad"
          placeholder="7"
        />
        <FormField
          label="Energy 1-10"
          value={String(value.energyLevel)}
          onChangeText={(text) => updateNumber("energyLevel", text)}
          keyboardType="number-pad"
          placeholder="7"
        />
        <FormField
          label="Stress 1-10"
          value={String(value.stressLevel)}
          onChangeText={(text) => updateNumber("stressLevel", text)}
          keyboardType="number-pad"
          placeholder="5"
        />
        <FormField
          label="Time available"
          value={String(value.timeAvailableMinutes)}
          onChangeText={(text) => updateNumber("timeAvailableMinutes", text)}
          keyboardType="number-pad"
          placeholder="60"
        />
        <FormField
          label="Previous RPE 1-10"
          value={String(value.previousSessionRpe)}
          onChangeText={(text) => updateNumber("previousSessionRpe", text)}
          keyboardType="number-pad"
          placeholder="7"
        />
      </View>
      <View style={styles.sorenessGrid}>
        {sorenessGroups.map((group) => (
          <FormField
            key={group}
            label={`${group.charAt(0).toUpperCase()}${group.slice(1)} soreness`}
            value={String(value.soreness[group])}
            onChangeText={(text) => updateSoreness(group, text)}
            keyboardType="number-pad"
            placeholder="3"
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
        label={isSaving ? "Saving check-in..." : "Generate Adaptive Workout"}
        onPress={onSubmit}
        disabled={isSaving}
      />
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
});
