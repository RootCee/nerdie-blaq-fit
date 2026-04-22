import { StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatChip } from "@/components/ui/StatChip";
import { generateMealPlan } from "@/features/nutrition/generate-meal-plan";
import { generateNutritionGuidance } from "@/features/nutrition/generate-nutrition-guidance";
import { useOnboardingStore } from "@/store/onboarding-store";
import { GroceryList } from "@/types/meal-plan";
import { colors, spacing } from "@/theme";

const GROCERY_CATEGORIES: Array<{ key: keyof GroceryList; label: string }> = [
  { key: "protein", label: "Protein" },
  { key: "carbs", label: "Carbs" },
  { key: "fats", label: "Fats" },
  { key: "extras", label: "Extras" },
];

const SLOT_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

export default function MealsScreen() {
  const { profile, isComplete } = useOnboardingStore();
  const guidance = generateNutritionGuidance(profile);

  if (!isComplete || !guidance) {
    return (
      <Screen title="Meals" subtitle="Your nutrition targets show up here once your profile is complete enough to support a safe recommendation.">
        <SectionCard title="Your meal guidance starts with your profile" eyebrow="Finish setup">
          <Text style={styles.copy}>
            Add your goal, weight, activity level, and food preference in onboarding so Nerdie Blaq Fit can build your first set of targets.
          </Text>
        </SectionCard>
      </Screen>
    );
  }

  const mealPlan = generateMealPlan(profile.dietaryPreference ?? "balanced");

  return (
    <Screen title="Meals" subtitle="Simple daily targets and meal structure built from your saved profile.">
      <SectionCard title="Daily targets" eyebrow={guidance.goalLabel}>
        <View style={styles.statsRow}>
          <StatChip label="Calories" value={`${guidance.calorieTarget}`} />
          <StatChip label="Protein" value={`${guidance.proteinTargetGrams}g`} />
          <StatChip label="Carbs" value={`${guidance.carbsRangeGrams.min}-${guidance.carbsRangeGrams.max}g`} />
          <StatChip label="Fats" value={`${guidance.fatsRangeGrams.min}-${guidance.fatsRangeGrams.max}g`} />
          <StatChip label="Water" value={`${guidance.waterTargetLiters}L`} />
        </View>
        <Text style={styles.helperText}>
          These are general wellness-focused estimates, not medical advice.
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

      <SectionCard title="Meal prep guide" eyebrow="Concrete meals for your preference">
        {mealPlan.meals.map((meal) => (
          <View key={meal.slot} style={styles.prepCard}>
            <Text style={styles.prepSlot}>{SLOT_LABELS[meal.slot]}</Text>
            <Text style={styles.prepTitle}>{meal.title}</Text>
            <Text style={styles.prepDesc}>{meal.description}</Text>
            {meal.ingredients.map((ingredient) => (
              <Text key={ingredient.name} style={styles.listItem}>
                • {ingredient.name} — {ingredient.amount}
              </Text>
            ))}
            <Text style={styles.portionHint}>{meal.portionGuidance}</Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Grocery list" eyebrow="Stock up for the week">
        {GROCERY_CATEGORIES.map(({ key, label }) => {
          const items = mealPlan.groceryList[key];
          if (items.length === 0) return null;
          return (
            <View key={key} style={styles.groceryCategory}>
              <Text style={styles.groceryCategoryLabel}>{label}</Text>
              {items.map((item) => (
                <Text key={item.name} style={styles.listItem}>
                  • {item.name} — {item.amount}
                </Text>
              ))}
            </View>
          );
        })}
      </SectionCard>

      <SectionCard title="Supplement ideas" eyebrow="Optional support">
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

      <SectionCard title="Built from your profile" eyebrow="Your source data">
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
  prepCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    borderColor: colors.border,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  prepSlot: {
    color: colors.primarySoft,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  prepTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  prepDesc: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  portionHint: {
    color: colors.accentSoft,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  groceryCategory: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  groceryCategoryLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
});
