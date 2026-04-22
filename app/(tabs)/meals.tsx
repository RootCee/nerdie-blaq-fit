import { StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatChip } from "@/components/ui/StatChip";
import { generateNutritionGuidance } from "@/features/nutrition/generate-nutrition-guidance";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors, spacing } from "@/theme";

export default function MealsScreen() {
  const { profile, isComplete } = useOnboardingStore();
  const guidance = generateNutritionGuidance(profile);

  if (!isComplete || !guidance) {
    return (
      <Screen title="Meals" subtitle="Nutrition guidance appears here once your profile is complete enough to support a safe general recommendation.">
        <SectionCard title="Nutrition guidance unavailable" eyebrow="Complete onboarding">
          <Text style={styles.copy}>
            Add your goal, weight, activity level, and dietary preference in onboarding so Nerdie Blaq Fit can generate your first nutrition targets.
          </Text>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen title="Meals" subtitle="General nutrition targets and simple meal structure based on your saved profile.">
      <SectionCard title="Daily targets" eyebrow={guidance.goalLabel}>
        <View style={styles.statsRow}>
          <StatChip label="Calories" value={`${guidance.calorieTarget}`} />
          <StatChip label="Protein" value={`${guidance.proteinTargetGrams}g`} />
          <StatChip label="Carbs" value={`${guidance.carbsRangeGrams.min}-${guidance.carbsRangeGrams.max}g`} />
          <StatChip label="Fats" value={`${guidance.fatsRangeGrams.min}-${guidance.fatsRangeGrams.max}g`} />
          <StatChip label="Water" value={`${guidance.waterTargetLiters}L`} />
        </View>
        <Text style={styles.helperText}>
          These are general wellness-oriented estimates, not a medical prescription.
        </Text>
      </SectionCard>

      <SectionCard title="Meal structure" eyebrow={guidance.dietaryPreference.replace("-", " ")}>
        {guidance.mealStructure.map((meal) => (
          <View key={meal.title} style={styles.mealBlock}>
            <Text style={styles.mealTitle}>{meal.title}</Text>
            {meal.components.map((component) => (
              <Text key={`${meal.title}-${component}`} style={styles.listItem}>
                • {component}
              </Text>
            ))}
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Supplement suggestions" eyebrow="Optional categories">
        {guidance.supplementSuggestions.map((group) => (
          <View key={group.category} style={styles.mealBlock}>
            <Text style={styles.mealTitle}>{group.category}</Text>
            {group.suggestions.map((suggestion) => (
              <Text key={`${group.category}-${suggestion}`} style={styles.listItem}>
                • {suggestion}
              </Text>
            ))}
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Built from your profile" eyebrow="Source of truth">
        <Text style={styles.copy}>
          Goal: {profile.fitnessGoal?.replace("-", " ")} | Activity: {profile.activityLevel?.replace("-", " ")} | Diet:{" "}
          {profile.dietaryPreference?.replace("-", " ")}
        </Text>
        <Text style={styles.copy}>Weight reference: {profile.weight}</Text>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  copy: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  mealBlock: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  mealTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  listItem: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
});
