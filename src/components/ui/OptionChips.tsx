import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/theme";

interface Option<T extends string> {
  label: string;
  value: T;
}

interface OptionChipsProps<T extends string> {
  options: Array<Option<T>>;
  value: T | null;
  onChange: (value: T) => void;
}

export function OptionChips<T extends string>({ options, value, onChange }: OptionChipsProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface MultiSelectChipsProps<T extends string> {
  options: Array<Option<T>>;
  values: T[];
  onToggle: (value: T) => void;
}

export function MultiSelectChips<T extends string>({
  options,
  values,
  onToggle,
}: MultiSelectChipsProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const selected = values.includes(option.value);

        return (
          <Pressable
            key={option.value}
            onPress={() => onToggle(option.value)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(249,115,22,0.14)",
  },
  chipLabel: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  chipLabelSelected: {
    color: colors.primarySoft,
  },
});
