import { ActivityLevel, DietaryPreference, FitnessGoal } from "@/types/onboarding";
import { calculateBmi, parseWeightInPounds } from "@/lib/body-metrics";
import {
  NutritionGuidance,
  NutritionMacroRange,
  NutritionMealSlot,
  NutritionPlannerInput,
  SupplementSuggestion,
} from "@/types/nutrition";

function resolveGoal(goal: FitnessGoal | null) {
  if (goal === "fat-loss") {
    return {
      label: "Fat loss",
      calorieOffset: -250,
      proteinMultiplier: 0.95,
      carbs: { min: 120, max: 220 },
      fats: { min: 45, max: 70 },
    };
  }

  if (goal === "muscle-gain") {
    return {
      label: "Muscle gain",
      calorieOffset: 250,
      proteinMultiplier: 1,
      carbs: { min: 180, max: 320 },
      fats: { min: 55, max: 85 },
    };
  }

  return {
    label: "General fitness",
    calorieOffset: 0,
    proteinMultiplier: 0.85,
    carbs: { min: 150, max: 260 },
    fats: { min: 50, max: 80 },
  };
}

function resolvePaceAdjustment(goalWeight: string, currentWeight: string, goalPace: NutritionPlannerInput["goalPace"], fitnessGoal: FitnessGoal | null) {
  const current = parseWeightInPounds(currentWeight);
  const goal = parseWeightInPounds(goalWeight);

  if (!current || !goal || !goalPace) {
    return 0;
  }

  const delta = goal - current;

  if (fitnessGoal === "muscle-gain" || delta > 0) {
    return goalPace === "easy" ? 100 : goalPace === "steady" ? 175 : 250;
  }

  if (fitnessGoal === "fat-loss" || delta < 0) {
    return goalPace === "easy" ? -100 : goalPace === "steady" ? -200 : -300;
  }

  return 0;
}

function resolveActivityMultiplier(activityLevel: ActivityLevel | null) {
  switch (activityLevel) {
    case "sedentary":
      return 12;
    case "lightly-active":
      return 13;
    case "moderately-active":
      return 14;
    case "very-active":
      return 15;
    case "athlete":
      return 16;
    default:
      return 13;
  }
}

function buildMealStructure(dietaryPreference: DietaryPreference): NutritionMealSlot[] {
  const proteinOptionsByPreference: Record<DietaryPreference, string[]> = {
    balanced: ["eggs or Greek yogurt", "chicken, turkey, tofu, or fish"],
    "high-protein": ["eggs, Greek yogurt, or protein oats", "lean meat, tofu, or cottage cheese"],
    vegetarian: ["Greek yogurt, eggs, tofu, or tempeh", "beans, lentils, edamame, or paneer"],
    vegan: ["tofu scramble or soy yogurt", "beans, lentils, tofu, tempeh, or seitan"],
    pescatarian: ["Greek yogurt, eggs, or protein oats", "fish, shrimp, tofu, or lentils"],
    keto: ["eggs, avocado, and full-fat yogurt", "salmon, chicken thighs, tofu, and nuts"],
    "low-carb": ["eggs, yogurt, or tofu scramble", "lean proteins with non-starchy vegetables"],
  };

  const proteinOptions = proteinOptionsByPreference[dietaryPreference];

  return [
    {
      title: "Breakfast",
      components: [
        `Protein anchor: ${proteinOptions[0]}`,
        "Produce: fruit or vegetables",
        "Smart carb or fiber source matched to your goal",
      ],
    },
    {
      title: "Lunch",
      components: [
        `Protein anchor: ${proteinOptions[1]}`,
        "Vegetables: at least one colorful serving",
        "Carb portion sized to training demand",
      ],
    },
    {
      title: "Snack",
      components: [
        "Easy protein option",
        "Fruit, crunchy vegetables, or a simple high-fiber side",
      ],
    },
    {
      title: "Dinner",
      components: [
        "Protein anchor",
        "Large vegetable serving",
        "Carb or healthy fat emphasis based on your daily target",
      ],
    },
  ];
}

function buildSupplementSuggestions(dietaryPreference: DietaryPreference): SupplementSuggestion[] {
  const baseSuggestions: SupplementSuggestion[] = [
    {
      category: "Protein convenience",
      suggestions: ["protein powder", "ready-to-drink shake"],
    },
    {
      category: "Performance basics",
      suggestions: ["creatine monohydrate", "electrolyte mix for sweaty sessions"],
    },
    {
      category: "General wellness",
      suggestions: ["fiber support if intake is low", "simple hydration routine"],
    },
  ];

  if (dietaryPreference === "vegan" || dietaryPreference === "vegetarian") {
    baseSuggestions.push({
      category: "Plant-based support",
      suggestions: ["vitamin B12 check-in", "omega-3 algae oil option"],
    });
  }

  return baseSuggestions;
}

function clampRange(range: NutritionMacroRange, delta: number): NutritionMacroRange {
  return {
    min: Math.max(40, Math.round(range.min + delta)),
    max: Math.max(60, Math.round(range.max + delta)),
  };
}

export function canGenerateNutritionGuidance(input: NutritionPlannerInput) {
  return Boolean(input.fitnessGoal && input.weight && input.activityLevel && input.dietaryPreference);
}

export function generateNutritionGuidance(input: NutritionPlannerInput): NutritionGuidance | null {
  if (!canGenerateNutritionGuidance(input)) {
    return null;
  }

  const weightInPounds = parseWeightInPounds(input.weight);

  if (!weightInPounds) {
    return null;
  }

  const goal = resolveGoal(input.fitnessGoal);
  const activityMultiplier = resolveActivityMultiplier(input.activityLevel);
  const calorieTarget = Math.round(weightInPounds * activityMultiplier + goal.calorieOffset);
  const paceAdjustment = resolvePaceAdjustment(input.goalWeight, input.weight, input.goalPace, input.fitnessGoal);
  const bmiSummary = calculateBmi(input.height, input.weight);
  const proteinTargetGrams = Math.round(weightInPounds * (goal.proteinMultiplier + (input.goalPace === "aggressive" ? 0.05 : 0)));
  const waterTargetLiters = Number((weightInPounds * 0.5 / 33.814).toFixed(1));

  const activityCarbAdjustment =
    input.activityLevel === "sedentary"
      ? -20
      : input.activityLevel === "athlete"
        ? 40
        : input.activityLevel === "very-active"
          ? 20
          : 0;

  const activityFatAdjustment =
    input.activityLevel === "sedentary"
      ? -5
      : input.activityLevel === "athlete"
        ? 10
        : 0;

  return {
    calorieTarget: calorieTarget + paceAdjustment,
    proteinTargetGrams,
    carbsRangeGrams: clampRange(goal.carbs, activityCarbAdjustment),
    fatsRangeGrams: clampRange(goal.fats, activityFatAdjustment),
    waterTargetLiters,
    mealStructure: buildMealStructure(input.dietaryPreference!),
    supplementSuggestions: buildSupplementSuggestions(input.dietaryPreference!),
    dietaryPreference: input.dietaryPreference!,
    activityLevel: input.activityLevel!,
    goalLabel: goal.label,
    bmiValue: bmiSummary?.value ?? null,
    bmiCategory: bmiSummary?.category ?? null,
  };
}
