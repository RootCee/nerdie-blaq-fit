import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { FormField } from "@/components/ui/FormField";
import { OptionChips } from "@/components/ui/OptionChips";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ProLockCard } from "@/components/ProLockCard";
import { MedicalNotice } from "@/components/MedicalNotice";
import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatChip } from "@/components/ui/StatChip";
import { generateMealPlan } from "@/features/nutrition/generate-meal-plan";
import { generateNutritionGuidance } from "@/features/nutrition/generate-nutrition-guidance";
import { calculateFoodLogDailyTotals, loadFoodLogsForDate, loadRecentFoodLogs, loadSavedMeals, saveFoodLog, saveMealForLater, saveMealFromFoodLog } from "@/features/nutrition/food-log-persistence";
import { loadRecentSupplementLogs, loadSupplementLogsForDate, saveSupplementLog } from "@/features/nutrition/supplement-log-persistence";
import { estimateFoodNutritionWithGemini } from "@/lib/ai/geminiFoodEstimator";
import { getActiveCaloriesForDate } from "@/lib/health";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useSubscription } from "@/store/subscription-store";
import { GroceryList } from "@/types/meal-plan";
import { FoodLogEntry, FoodMealType, FoodNutritionEstimate, SavedMealEntry, SupplementLogEntry, SupplementTiming } from "@/types/nutrition";
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

const MEAL_TYPE_OPTIONS: Array<{ label: string; value: FoodMealType }> = [
  { label: "Breakfast", value: "breakfast" },
  { label: "Lunch", value: "lunch" },
  { label: "Dinner", value: "dinner" },
  { label: "Snack", value: "snack" },
];

const SUPPLEMENT_TIMING_OPTIONS: Array<{ label: string; value: SupplementTiming }> = [
  { label: "Morning", value: "morning" },
  { label: "Pre", value: "pre-workout" },
  { label: "During", value: "intra-workout" },
  { label: "Post", value: "post-workout" },
  { label: "Evening", value: "evening" },
];

const TIMING_LABELS: Record<SupplementTiming, string> = {
  morning: "Morning",
  "pre-workout": "Pre-workout",
  "intra-workout": "During workout",
  "post-workout": "Post-workout",
  evening: "Evening",
};

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseNumberInput(value: string) {
  const numeric = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function isWithinLastHours(dateString: string, hours: number) {
  const timestamp = new Date(dateString).getTime();

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return Date.now() - timestamp <= hours * 60 * 60 * 1000;
}

function getFoodInputFromForm(logDate: string, mealType: FoodMealType, foodName: string, calories: string, proteinG: string, carbsG: string, fatG: string, servingAmount: string, servingNotes: string) {
  return {
    logDate,
    mealType,
    foodName,
    calories: parseNumberInput(calories),
    proteinG: parseNumberInput(proteinG),
    carbsG: parseNumberInput(carbsG),
    fatG: parseNumberInput(fatG),
    servingNotes: servingNotes.trim()
      ? `${servingAmount.trim()} - ${servingNotes.trim()}`
      : servingAmount.trim(),
  };
}

export default function MealsScreen() {
  const { profile, isComplete } = useOnboardingStore();
  const { isPro } = useSubscription();
  const guidance = generateNutritionGuidance(profile);
  const [selectedDate, setSelectedDate] = useState(getTodayDateKey());
  const [mealType, setMealType] = useState<FoodMealType>("breakfast");
  const [foodName, setFoodName] = useState("");
  const [servingAmount, setServingAmount] = useState("");
  const [calories, setCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [servingNotes, setServingNotes] = useState("");
  const [foodLogs, setFoodLogs] = useState<FoodLogEntry[]>([]);
  const [recentFoodLogs, setRecentFoodLogs] = useState<FoodLogEntry[]>([]);
  const [savedMeals, setSavedMeals] = useState<SavedMealEntry[]>([]);
  const [activeCalories, setActiveCalories] = useState(0);
  const [isFoodLogLoading, setIsFoodLogLoading] = useState(true);
  const [isFoodLogSaving, setIsFoodLogSaving] = useState(false);
  const [isSavedMealSaving, setIsSavedMealSaving] = useState(false);
  const [isEstimatingFood, setIsEstimatingFood] = useState(false);
  const [nutritionEstimate, setNutritionEstimate] = useState<FoodNutritionEstimate | null>(null);
  const [supplementLogs, setSupplementLogs] = useState<SupplementLogEntry[]>([]);
  const [recentSupplementLogs, setRecentSupplementLogs] = useState<SupplementLogEntry[]>([]);
  const [supplementTiming, setSupplementTiming] = useState<SupplementTiming>("pre-workout");
  const [supplementName, setSupplementName] = useState("");
  const [supplementAmount, setSupplementAmount] = useState("");
  const [supplementCalories, setSupplementCalories] = useState("");
  const [supplementProteinG, setSupplementProteinG] = useState("");
  const [supplementCarbsG, setSupplementCarbsG] = useState("");
  const [supplementFatG, setSupplementFatG] = useState("");
  const [supplementNotes, setSupplementNotes] = useState("");
  const [isSupplementSaving, setIsSupplementSaving] = useState(false);
  const [foodLogError, setFoodLogError] = useState<string | null>(null);
  const [supplementLogError, setSupplementLogError] = useState<string | null>(null);
  const foodTotals = calculateFoodLogDailyTotals(foodLogs);
  const supplementTotals = calculateFoodLogDailyTotals(supplementLogs.map((entry) => ({
    id: entry.id,
    logDate: entry.logDate,
    mealType: "snack",
    foodName: entry.supplementName,
    calories: entry.calories,
    proteinG: entry.proteinG,
    carbsG: entry.carbsG,
    fatG: entry.fatG,
    servingNotes: entry.notes,
    createdAt: entry.createdAt,
    storageMode: entry.storageMode,
  })));
  const combinedTotals = {
    calories: foodTotals.calories + supplementTotals.calories,
    proteinG: foodTotals.proteinG + supplementTotals.proteinG,
    carbsG: foodTotals.carbsG + supplementTotals.carbsG,
    fatG: foodTotals.fatG + supplementTotals.fatG,
  };
  const netCalories = combinedTotals.calories - activeCalories;

  const refreshFoodLogs = async () => {
    const [entries, recentEntries, savedMealEntries] = await Promise.all([
      loadFoodLogsForDate(selectedDate),
      loadRecentFoodLogs(10),
      loadSavedMeals(),
    ]);

    setFoodLogs(entries);
    setRecentFoodLogs(recentEntries.filter((entry) => entry.logDate !== selectedDate && isWithinLastHours(entry.createdAt, 24)).slice(0, 6));
    setSavedMeals(savedMealEntries);
  };

  const refreshSupplementLogs = async () => {
    const [entries, recentEntries] = await Promise.all([
      loadSupplementLogsForDate(selectedDate),
      loadRecentSupplementLogs(8),
    ]);

    setSupplementLogs(entries);
    setRecentSupplementLogs(recentEntries.filter((entry) => entry.logDate !== selectedDate).slice(0, 5));
  };

  useEffect(() => {
    let isMounted = true;

    async function hydrateFoodLog() {
      setIsFoodLogLoading(true);

      try {
        const [entries, recentEntries, savedMealEntries, healthCalories] = await Promise.all([
          loadFoodLogsForDate(selectedDate),
          loadRecentFoodLogs(10),
          loadSavedMeals(),
          getActiveCaloriesForDate(selectedDate),
        ]);

        if (isMounted) {
          setFoodLogs(entries);
          setRecentFoodLogs(recentEntries.filter((entry) => entry.logDate !== selectedDate && isWithinLastHours(entry.createdAt, 24)).slice(0, 6));
          setSavedMeals(savedMealEntries);
          setActiveCalories(healthCalories);
          setFoodLogError(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setFoodLogError(loadError instanceof Error ? loadError.message : "Unable to load food logs.");
        }
      } finally {
        if (isMounted) {
          setIsFoodLogLoading(false);
        }
      }
    }

    void hydrateFoodLog();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateSupplementLog() {
      try {
        const [entries, recentEntries] = await Promise.all([
          loadSupplementLogsForDate(selectedDate),
          loadRecentSupplementLogs(8),
        ]);

        if (isMounted) {
          setSupplementLogs(entries);
          setRecentSupplementLogs(recentEntries.filter((entry) => entry.logDate !== selectedDate).slice(0, 5));
          setSupplementLogError(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setSupplementLogError(loadError instanceof Error ? loadError.message : "Unable to load supplement logs.");
        }
      }
    }

    void hydrateSupplementLog();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  const handleSaveFoodLog = async () => {
    setIsFoodLogSaving(true);
    setFoodLogError(null);

    try {
      await saveFoodLog({
        ...getFoodInputFromForm(selectedDate, mealType, foodName, calories, proteinG, carbsG, fatG, servingAmount, servingNotes),
      });
      setFoodName("");
      setServingAmount("");
      setCalories("");
      setProteinG("");
      setCarbsG("");
      setFatG("");
      setServingNotes("");
      setNutritionEstimate(null);
      await refreshFoodLogs();
    } catch (saveError) {
      setFoodLogError(saveError instanceof Error ? saveError.message : "Unable to save this food log.");
    } finally {
      setIsFoodLogSaving(false);
    }
  };

  const handleSaveCurrentMealForLater = async () => {
    setIsSavedMealSaving(true);
    setFoodLogError(null);

    try {
      await saveMealForLater(getFoodInputFromForm(selectedDate, mealType, foodName, calories, proteinG, carbsG, fatG, servingAmount, servingNotes));
      setSavedMeals(await loadSavedMeals());
    } catch (saveError) {
      setFoodLogError(saveError instanceof Error ? saveError.message : "Unable to save this meal for later.");
    } finally {
      setIsSavedMealSaving(false);
    }
  };

  const handleEstimateFood = async () => {
    setIsEstimatingFood(true);
    setFoodLogError(null);
    setNutritionEstimate(null);

    try {
      const estimate = await estimateFoodNutritionWithGemini({
        foodName,
        amount: servingAmount,
        mealType,
      });

      setNutritionEstimate(estimate);
      setFoodName(estimate.foodName);
      setServingAmount(estimate.amount);
      setCalories(String(estimate.calories));
      setProteinG(String(estimate.proteinG));
      setCarbsG(String(estimate.carbsG));
      setFatG(String(estimate.fatG));
      setServingNotes((current) => {
        const interpretation = estimate.servingInterpretation || estimate.amount;
        return current.trim() ? current : `Estimated serving: ${interpretation}`;
      });
    } catch (estimateError) {
      setFoodLogError(estimateError instanceof Error ? estimateError.message : "Unable to estimate nutrition.");
    } finally {
      setIsEstimatingFood(false);
    }
  };

  const handleSaveSupplementLog = async () => {
    setIsSupplementSaving(true);
    setSupplementLogError(null);

    try {
      await saveSupplementLog({
        logDate: selectedDate,
        timing: supplementTiming,
        supplementName,
        amount: supplementAmount,
        calories: parseNumberInput(supplementCalories),
        proteinG: parseNumberInput(supplementProteinG),
        carbsG: parseNumberInput(supplementCarbsG),
        fatG: parseNumberInput(supplementFatG),
        notes: supplementNotes,
      });
      setSupplementName("");
      setSupplementAmount("");
      setSupplementCalories("");
      setSupplementProteinG("");
      setSupplementCarbsG("");
      setSupplementFatG("");
      setSupplementNotes("");
      await refreshSupplementLogs();
    } catch (saveError) {
      setSupplementLogError(saveError instanceof Error ? saveError.message : "Unable to save this supplement log.");
    } finally {
      setIsSupplementSaving(false);
    }
  };

  const fillFoodFromLog = (entry: FoodLogEntry) => {
    const [amount, ...noteParts] = entry.servingNotes.split(" - ");

    setMealType(entry.mealType);
    setFoodName(entry.foodName);
    setServingAmount(amount?.trim() || entry.servingNotes);
    setCalories(String(entry.calories));
    setProteinG(String(entry.proteinG));
    setCarbsG(String(entry.carbsG));
    setFatG(String(entry.fatG));
    setServingNotes(noteParts.join(" - ").trim());
    setNutritionEstimate(null);
    setFoodLogError(null);
  };

  const fillFoodFromSavedMeal = (entry: SavedMealEntry) => {
    const [amount, ...noteParts] = entry.servingNotes.split(" - ");

    setMealType(entry.mealType);
    setFoodName(entry.foodName);
    setServingAmount(amount?.trim() || entry.servingNotes);
    setCalories(String(entry.calories));
    setProteinG(String(entry.proteinG));
    setCarbsG(String(entry.carbsG));
    setFatG(String(entry.fatG));
    setServingNotes(noteParts.join(" - ").trim());
    setNutritionEstimate(null);
    setFoodLogError(null);
  };

  const repeatFoodLog = async (entry: FoodLogEntry) => {
    setIsFoodLogSaving(true);
    setFoodLogError(null);

    try {
      await saveFoodLog({
        logDate: selectedDate,
        mealType: entry.mealType,
        foodName: entry.foodName,
        calories: entry.calories,
        proteinG: entry.proteinG,
        carbsG: entry.carbsG,
        fatG: entry.fatG,
        servingNotes: entry.servingNotes,
      });
      await refreshFoodLogs();
    } catch (saveError) {
      setFoodLogError(saveError instanceof Error ? saveError.message : "Unable to repeat this food log.");
    } finally {
      setIsFoodLogSaving(false);
    }
  };

  const repeatSavedMeal = async (entry: SavedMealEntry) => {
    setIsFoodLogSaving(true);
    setFoodLogError(null);

    try {
      await saveFoodLog({
        logDate: selectedDate,
        mealType: entry.mealType,
        foodName: entry.foodName,
        calories: entry.calories,
        proteinG: entry.proteinG,
        carbsG: entry.carbsG,
        fatG: entry.fatG,
        servingNotes: entry.servingNotes,
      });
      await refreshFoodLogs();
    } catch (saveError) {
      setFoodLogError(saveError instanceof Error ? saveError.message : "Unable to add this saved meal.");
    } finally {
      setIsFoodLogSaving(false);
    }
  };

  const saveRecentFoodForLater = async (entry: FoodLogEntry) => {
    setIsSavedMealSaving(true);
    setFoodLogError(null);

    try {
      await saveMealFromFoodLog(entry);
      setSavedMeals(await loadSavedMeals());
    } catch (saveError) {
      setFoodLogError(saveError instanceof Error ? saveError.message : "Unable to save this meal for later.");
    } finally {
      setIsSavedMealSaving(false);
    }
  };

  const fillSupplementFromLog = (entry: SupplementLogEntry) => {
    setSupplementTiming(entry.timing);
    setSupplementName(entry.supplementName);
    setSupplementAmount(entry.amount);
    setSupplementCalories(String(entry.calories));
    setSupplementProteinG(String(entry.proteinG));
    setSupplementCarbsG(String(entry.carbsG));
    setSupplementFatG(String(entry.fatG));
    setSupplementNotes(entry.notes);
    setSupplementLogError(null);
  };

  const repeatSupplementLog = async (entry: SupplementLogEntry) => {
    setIsSupplementSaving(true);
    setSupplementLogError(null);

    try {
      await saveSupplementLog({
        logDate: selectedDate,
        timing: entry.timing,
        supplementName: entry.supplementName,
        amount: entry.amount,
        calories: entry.calories,
        proteinG: entry.proteinG,
        carbsG: entry.carbsG,
        fatG: entry.fatG,
        notes: entry.notes,
      });
      await refreshSupplementLogs();
    } catch (saveError) {
      setSupplementLogError(saveError instanceof Error ? saveError.message : "Unable to repeat this supplement log.");
    } finally {
      setIsSupplementSaving(false);
    }
  };

  const foodLogSection = (
    <>
      <SectionCard title="Daily Nutrition" eyebrow="Targets + food log">
        <FormField
          label="Date"
          value={selectedDate}
          onChangeText={setSelectedDate}
          placeholder="YYYY-MM-DD"
          helper="Use YYYY-MM-DD. Apple Health active calories are included when Health access is connected."
        />
        {guidance ? (
          <>
            <Text style={styles.sectionLabel}>Targets</Text>
            <View style={styles.statsRow}>
              <StatChip label="Calories" value={`${guidance.calorieTarget}`} />
              <StatChip label="Protein" value={`${guidance.proteinTargetGrams}g`} />
              <StatChip label="Carbs" value={`${guidance.carbsRangeGrams.min}-${guidance.carbsRangeGrams.max}g`} />
              <StatChip label="Fats" value={`${guidance.fatsRangeGrams.min}-${guidance.fatsRangeGrams.max}g`} />
              <StatChip label="Water" value={`${guidance.waterTargetLiters}L`} />
            </View>
          </>
        ) : null}
        <Text style={styles.sectionLabel}>Logged today</Text>
        <View style={styles.statsRow}>
          <StatChip label="Total calories" value={`${Math.round(combinedTotals.calories)} cal`} />
          <StatChip label="Food" value={`${Math.round(foodTotals.calories)} cal`} />
          <StatChip label="Add-ons" value={`${Math.round(supplementTotals.calories)} cal`} />
          <StatChip label="Protein" value={`${Math.round(combinedTotals.proteinG)}g`} />
          <StatChip label="Carbs" value={`${Math.round(combinedTotals.carbsG)}g`} />
          <StatChip label="Fat" value={`${Math.round(combinedTotals.fatG)}g`} />
          <StatChip label="Active" value={`${activeCalories} cal`} />
          <StatChip label="Net" value={`${Math.round(netCalories)} cal`} />
        </View>
        <Text style={styles.helperText}>
          Total calories include food plus supplement/add-on calories. Net subtracts Apple Health active calories when available.
        </Text>
        {guidance ? (
          <>
            <Text style={styles.helperText}>
              These are general wellness-focused estimates, not medical advice.
            </Text>
            <MedicalNotice />
          </>
        ) : null}
      </SectionCard>

      <SectionCard title="Add food" eyebrow="Meal entry">
        <OptionChips options={MEAL_TYPE_OPTIONS} value={mealType} onChange={setMealType} />
        <FormField label="Food name" value={foodName} onChangeText={setFoodName} placeholder="Chicken rice bowl" />
        <FormField
          label="Amount / serving size"
          value={servingAmount}
          onChangeText={setServingAmount}
          placeholder="1 bowl, 8 oz, 1 cup..."
          helper="Use the amount you actually ate. AI estimates are easier when the serving is specific."
        />
        <PrimaryButton
          label={isEstimatingFood ? "Estimating..." : "Estimate Calories & Macros"}
          onPress={() => void handleEstimateFood()}
          disabled={isEstimatingFood || isFoodLogSaving}
          variant="ghost"
        />
        {nutritionEstimate ? (
          <View style={styles.estimateCard}>
            <Text style={styles.estimateTitle}>Estimated nutrition</Text>
            <Text style={styles.prepDesc}>
              {nutritionEstimate.servingInterpretation || nutritionEstimate.amount}
            </Text>
            <Text style={styles.helperText}>
              Confidence: {nutritionEstimate.confidence}. {nutritionEstimate.notes}
            </Text>
          </View>
        ) : null}
        <View style={styles.formGrid}>
          <FormField label="Calories" value={calories} onChangeText={setCalories} keyboardType="number-pad" placeholder="520" />
          <FormField label="Protein grams" value={proteinG} onChangeText={setProteinG} keyboardType="decimal-pad" placeholder="42" />
          <FormField label="Carbs grams" value={carbsG} onChangeText={setCarbsG} keyboardType="decimal-pad" placeholder="55" />
          <FormField label="Fat grams" value={fatG} onChangeText={setFatG} keyboardType="decimal-pad" placeholder="14" />
        </View>
        <FormField
          label="Serving notes"
          value={servingNotes}
          onChangeText={setServingNotes}
          placeholder="1 bowl, sauce on side..."
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        <PrimaryButton
          label={isFoodLogSaving ? "Saving food..." : "Add Food"}
          onPress={() => void handleSaveFoodLog()}
          disabled={isFoodLogSaving}
        />
        <PrimaryButton
          label={isSavedMealSaving ? "Saving meal..." : "Save Meal for Later"}
          onPress={() => void handleSaveCurrentMealForLater()}
          disabled={isSavedMealSaving || isFoodLogSaving}
          variant="ghost"
        />
        {foodLogError ? <Text style={styles.errorText}>{foodLogError}</Text> : null}
      </SectionCard>

      {savedMeals.length ? (
        <SectionCard title="Saved meals" eyebrow="Add anytime">
          {savedMeals.map((entry) => (
            <View key={`saved-${entry.id}`} style={styles.repeatCard}>
              <View style={styles.prepHeader}>
                <Text style={styles.prepSlot}>{SLOT_LABELS[entry.mealType]}</Text>
                <Text style={styles.prepCalories}>{entry.calories} cal</Text>
              </View>
              <Text style={styles.prepTitle}>{entry.foodName}</Text>
              <Text style={styles.prepDesc}>
                {Math.round(entry.proteinG)}g protein • {Math.round(entry.carbsG)}g carbs • {Math.round(entry.fatG)}g fat
              </Text>
              {entry.servingNotes ? <Text style={styles.portionHint}>{entry.servingNotes}</Text> : null}
              <Text style={styles.helperText}>Saved {new Date(entry.savedAt).toLocaleDateString()}</Text>
              <View style={styles.repeatButtonRow}>
                <PrimaryButton
                  label="Use Numbers"
                  onPress={() => fillFoodFromSavedMeal(entry)}
                  disabled={isFoodLogSaving}
                  variant="ghost"
                  style={styles.repeatButton}
                />
                <PrimaryButton
                  label="Add Today"
                  onPress={() => void repeatSavedMeal(entry)}
                  disabled={isFoodLogSaving}
                  style={styles.repeatButton}
                />
              </View>
            </View>
          ))}
        </SectionCard>
      ) : null}

      {recentFoodLogs.length ? (
        <SectionCard title="Recent meals" eyebrow="Last 24 hours">
          {recentFoodLogs.map((entry) => (
            <View key={`recent-${entry.id}`} style={styles.repeatCard}>
              <View style={styles.prepHeader}>
                <Text style={styles.prepSlot}>{SLOT_LABELS[entry.mealType]}</Text>
                <Text style={styles.prepCalories}>{entry.calories} cal</Text>
              </View>
              <Text style={styles.prepTitle}>{entry.foodName}</Text>
              <Text style={styles.prepDesc}>
                {Math.round(entry.proteinG)}g protein • {Math.round(entry.carbsG)}g carbs • {Math.round(entry.fatG)}g fat
              </Text>
              {entry.servingNotes ? <Text style={styles.portionHint}>{entry.servingNotes}</Text> : null}
              <View style={styles.repeatButtonRow}>
                <PrimaryButton
                  label="Use Numbers"
                  onPress={() => fillFoodFromLog(entry)}
                  disabled={isFoodLogSaving}
                  variant="ghost"
                  style={styles.repeatButton}
                />
                <PrimaryButton
                  label="Add Today"
                  onPress={() => void repeatFoodLog(entry)}
                  disabled={isFoodLogSaving}
                  style={styles.repeatButton}
                />
                <PrimaryButton
                  label="Save"
                  onPress={() => void saveRecentFoodForLater(entry)}
                  disabled={isSavedMealSaving}
                  variant="ghost"
                  style={styles.repeatButton}
                />
              </View>
            </View>
          ))}
        </SectionCard>
      ) : null}

      <SectionCard title="Today's entries" eyebrow={isFoodLogLoading ? "Loading" : `${foodLogs.length} logged`}>
        {!foodLogs.length ? (
          <Text style={styles.copy}>No food logged for this date yet.</Text>
        ) : (
          foodLogs.map((entry) => (
            <View key={entry.id} style={styles.foodLogCard}>
              <View style={styles.prepHeader}>
                <Text style={styles.prepSlot}>{SLOT_LABELS[entry.mealType]}</Text>
                <Text style={styles.prepCalories}>{entry.calories} cal</Text>
              </View>
              <Text style={styles.prepTitle}>{entry.foodName}</Text>
              <Text style={styles.prepDesc}>
                {Math.round(entry.proteinG)}g protein • {Math.round(entry.carbsG)}g carbs • {Math.round(entry.fatG)}g fat
              </Text>
              {entry.servingNotes ? <Text style={styles.portionHint}>{entry.servingNotes}</Text> : null}
              <Text style={styles.helperText}>
                Saved with {entry.storageMode === "supabase" ? "Supabase" : "local fallback"}
              </Text>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title="Supplement Log" eyebrow="Timing + add-ons">
        <Text style={styles.helperText}>
          Track shakes, creatine, BCAAs, vitamins, electrolytes, and other add-ons. Use Food Log for shakes or bars with meaningful calories.
        </Text>
        <OptionChips options={SUPPLEMENT_TIMING_OPTIONS} value={supplementTiming} onChange={setSupplementTiming} />
        <FormField label="Supplement / add-on" value={supplementName} onChangeText={setSupplementName} placeholder="Creatine, BCAAs, whey, multivitamin..." />
        <FormField label="Amount" value={supplementAmount} onChangeText={setSupplementAmount} placeholder="5g, 2 scoops, 2 capsules..." />
        <View style={styles.formGrid}>
          <FormField label="Calories (optional)" value={supplementCalories} onChangeText={setSupplementCalories} keyboardType="number-pad" placeholder="0" />
          <FormField label="Protein grams" value={supplementProteinG} onChangeText={setSupplementProteinG} keyboardType="decimal-pad" placeholder="0" />
          <FormField label="Carbs grams" value={supplementCarbsG} onChangeText={setSupplementCarbsG} keyboardType="decimal-pad" placeholder="0" />
          <FormField label="Fat grams" value={supplementFatG} onChangeText={setSupplementFatG} keyboardType="decimal-pad" placeholder="0" />
        </View>
        <FormField
          label="Notes"
          value={supplementNotes}
          onChangeText={setSupplementNotes}
          placeholder="Before workout, mixed with water, label says zero calories..."
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        <PrimaryButton
          label={isSupplementSaving ? "Saving supplement..." : "Add Supplement"}
          onPress={() => void handleSaveSupplementLog()}
          disabled={isSupplementSaving}
          variant="ghost"
        />
        {supplementLogError ? <Text style={styles.errorText}>{supplementLogError}</Text> : null}
        {recentSupplementLogs.length ? (
          <View style={styles.supplementList}>
            <Text style={styles.sectionLabel}>Repeat add-on</Text>
            {recentSupplementLogs.map((entry) => (
              <View key={`recent-supplement-${entry.id}`} style={styles.repeatCard}>
                <View style={styles.prepHeader}>
                  <Text style={styles.prepSlot}>{TIMING_LABELS[entry.timing]}</Text>
                  <Text style={styles.prepCalories}>{entry.calories ? `${entry.calories} cal` : "No macro impact"}</Text>
                </View>
                <Text style={styles.prepTitle}>{entry.supplementName}</Text>
                <Text style={styles.prepDesc}>{entry.amount}</Text>
                <View style={styles.repeatButtonRow}>
                  <PrimaryButton
                    label="Use Numbers"
                    onPress={() => fillSupplementFromLog(entry)}
                    disabled={isSupplementSaving}
                    variant="ghost"
                    style={styles.repeatButton}
                  />
                  <PrimaryButton
                    label="Add Today"
                    onPress={() => void repeatSupplementLog(entry)}
                    disabled={isSupplementSaving}
                    style={styles.repeatButton}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : null}
        {supplementLogs.length ? (
          <View style={styles.supplementList}>
            {supplementLogs.map((entry) => (
              <View key={entry.id} style={styles.supplementCard}>
                <View style={styles.prepHeader}>
                  <Text style={styles.prepSlot}>{TIMING_LABELS[entry.timing]}</Text>
                  <Text style={styles.prepCalories}>{entry.calories ? `${entry.calories} cal` : "No macro impact"}</Text>
                </View>
                <Text style={styles.prepTitle}>{entry.supplementName}</Text>
                <Text style={styles.prepDesc}>{entry.amount}</Text>
                {entry.proteinG || entry.carbsG || entry.fatG ? (
                  <Text style={styles.prepDesc}>
                    {Math.round(entry.proteinG)}g protein • {Math.round(entry.carbsG)}g carbs • {Math.round(entry.fatG)}g fat
                  </Text>
                ) : null}
                {entry.notes ? <Text style={styles.portionHint}>{entry.notes}</Text> : null}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.copy}>No supplements logged for this date yet.</Text>
        )}
      </SectionCard>
    </>
  );

  if (!isComplete || !guidance) {
    return (
      <Screen title="Meals" subtitle="Your nutrition targets show up here once your profile is complete enough to support a safe recommendation.">
        {foodLogSection}
        <SectionCard title="Your meal guidance starts with your profile" eyebrow="Finish setup">
          <Text style={styles.copy}>
            Add your goal, weight, activity level, and food preference in onboarding so Nerdie Blaq Fit can build your first set of targets.
          </Text>
        </SectionCard>
      </Screen>
    );
  }

  const mealPlan = generateMealPlan(profile.dietaryPreference ?? "balanced");
  const sampleDayCalories = mealPlan.meals.reduce((sum, meal) => sum + meal.estimatedCalories, 0);

  return (
    <Screen title="Meals" subtitle="Simple daily targets and meal structure built from your saved profile.">
      {foodLogSection}

      <SectionCard title="Meal targets" eyebrow={guidance.goalLabel}>
        <Text style={styles.helperText}>
          Estimated sample day: {sampleDayCalories} calories across the meals below.
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

      {isPro ? (
        <>
          <SectionCard title="Meal prep guide" eyebrow="Concrete meals for your preference">
            {mealPlan.meals.map((meal) => (
              <View key={meal.slot} style={styles.prepCard}>
                <View style={styles.prepHeader}>
                  <Text style={styles.prepSlot}>{SLOT_LABELS[meal.slot]}</Text>
                  <Text style={styles.prepCalories}>{meal.estimatedCalories} cal</Text>
                </View>
                <Text style={styles.prepTitle}>{meal.title}</Text>
                <Text style={styles.prepDesc}>{meal.description}</Text>
                {meal.ingredients.map((ingredient) => (
                  <Text key={ingredient.name} style={styles.listItem}>
                    • {ingredient.name} — {ingredient.amount}
                  </Text>
                ))}
                <Text style={styles.portionHint}>{meal.portionGuidance}</Text>
                {meal.substitutions?.length ? (
                  <View style={styles.substitutionsBlock}>
                    <Text style={styles.substitutionsTitle}>Easy swaps</Text>
                    {meal.substitutions.map((swap) => (
                      <Text key={`${meal.slot}-${swap.type}`} style={styles.listItem}>
                        • {swap.title}: {swap.detail}
                      </Text>
                    ))}
                  </View>
                ) : null}
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
        </>
      ) : (
        <ProLockCard
          title="Advanced Nutrition"
          description="Daily calorie and macro targets stay free. Pro unlocks meal prep guides, grocery lists, swaps, and supplement ideas."
          feature="advanced nutrition features"
        />
      )}

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
  sectionLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
    textTransform: "uppercase",
  },
  formGrid: {
    gap: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
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
  foodLogCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    borderColor: colors.border,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  supplementList: {
    gap: spacing.sm,
  },
  supplementCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    borderColor: colors.border,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  repeatCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    borderColor: colors.border,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  repeatButtonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  repeatButton: {
    flex: 1,
    minWidth: 130,
  },
  estimateCard: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.primary,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  estimateTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  prepHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  prepSlot: {
    color: colors.primarySoft,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  prepCalories: {
    color: colors.accentSoft,
    fontSize: 12,
    fontWeight: "700",
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
  substitutionsBlock: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  substitutionsTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
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
