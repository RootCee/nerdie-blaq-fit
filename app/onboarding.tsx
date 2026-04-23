import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { FormField } from "@/components/ui/FormField";
import { MultiSelectChips, OptionChips } from "@/components/ui/OptionChips";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { parseHeightInMeters, parseWeightInPounds } from "@/lib/body-metrics";
import {
  activityLevelOptions,
  dietaryPreferenceOptions,
  equipmentOptions,
  fitnessGoalOptions,
  goalPaceOptions,
  sexOptions,
  workoutExperienceOptions,
  workoutLocationOptions,
} from "@/constants/options";
import { useOnboardingStore } from "@/store/onboarding-store";
import { calculateBmi } from "@/lib/body-metrics";
import { colors, spacing } from "@/theme";
import { EquipmentOption, OnboardingProfile } from "@/types/onboarding";

const totalSteps = 4;
const saveErrorMessage = "We couldn't save your setup right now. Please try again in a moment.";

type StepErrors = Partial<Record<keyof OnboardingProfile, string>>;

function validateAge(age: string) {
  const numericAge = Number.parseInt(age.trim(), 10);

  if (!age.trim()) {
    return "Enter your age.";
  }

  if (!Number.isFinite(numericAge) || numericAge < 13 || numericAge > 120) {
    return "Enter a valid age between 13 and 120.";
  }

  return null;
}

function validateStep(profile: OnboardingProfile, stepIndex: number): StepErrors {
  const errors: StepErrors = {};

  if (stepIndex === 0) {
    const ageError = validateAge(profile.age);
    if (ageError) errors.age = ageError;

    if (!profile.height.trim()) {
      errors.height = "Enter your height.";
    } else if (!parseHeightInMeters(profile.height)) {
      errors.height = "Enter a valid height like 5'8 or 173 cm.";
    }

    if (!profile.weight.trim()) {
      errors.weight = "Enter your current weight.";
    } else if (!parseWeightInPounds(profile.weight)) {
      errors.weight = "Enter a valid weight like 165 lb or 75 kg.";
    }

    if (!profile.goalWeight.trim()) {
      errors.goalWeight = "Enter your goal weight.";
    } else if (!parseWeightInPounds(profile.goalWeight)) {
      errors.goalWeight = "Enter a valid goal weight like 150 lb or 68 kg.";
    }

    if (!profile.sex) {
      errors.sex = "Choose the option that fits you best.";
    }
  }

  if (stepIndex === 1) {
    if (!profile.activityLevel) {
      errors.activityLevel = "Select your current activity level.";
    }

    if (!profile.fitnessGoal) {
      errors.fitnessGoal = "Select your main fitness goal.";
    }

    if (!profile.goalPace) {
      errors.goalPace = "Select the pace you want to follow.";
    }

    if (!profile.workoutExperience) {
      errors.workoutExperience = "Select your workout experience.";
    }
  }

  if (stepIndex === 2) {
    if (!profile.workoutLocation) {
      errors.workoutLocation = "Choose where you plan to work out.";
    }

    if (profile.availableEquipment.length === 0) {
      errors.availableEquipment = "Pick at least one option, even if it's None.";
    }
  }

  if (stepIndex === 3 && !profile.dietaryPreference) {
    errors.dietaryPreference = "Select the eating style that fits you best.";
  }

  return errors;
}

function getFirstInvalidStep(profile: OnboardingProfile) {
  for (let stepIndex = 0; stepIndex < totalSteps; stepIndex += 1) {
    if (Object.keys(validateStep(profile, stepIndex)).length > 0) {
      return stepIndex;
    }
  }

  return null;
}

export default function OnboardingScreen() {
  const { profile, updateProfile, completeOnboarding, isSaving, error, storageMode } = useOnboardingStore();
  const [step, setStep] = useState(0);
  const bmiSummary = useMemo(() => calculateBmi(profile.height, profile.weight), [profile.height, profile.weight]);
  const currentStepErrors = useMemo(() => validateStep(profile, step), [profile, step]);
  const isCurrentStepValid = Object.keys(currentStepErrors).length === 0;

  const stepTitle = useMemo(() => {
    switch (step) {
      case 0:
        return {
          title: "Build your base",
          subtitle: "Give Nerdie Blaq Fit your real-world starting point so your coaching, training, and nutrition feel made for you.",
        };
      case 1:
        return {
          title: "Shape your training lane",
          subtitle: "Your goal, activity level, and experience help set the right rhythm, volume, and pace for the week ahead.",
        };
      case 2:
        return {
          title: "Train with what you have",
          subtitle: "Your setup matters. We’ll use your space and equipment to keep the plan practical, not fantasy.",
        };
      default:
        return {
          title: "Fuel progress, protect progress",
          subtitle: "Your food preferences and movement limits help us build something sustainable, not something you’ll outgrow in a week.",
        };
    }
  }, [step]);

  const toggleEquipment = (equipment: EquipmentOption) => {
    const hasItem = profile.availableEquipment.includes(equipment);
    const nextValues = hasItem
      ? profile.availableEquipment.filter((item) => item !== equipment)
      : [...profile.availableEquipment, equipment];

    updateProfile({ availableEquipment: nextValues });
  };

  const handleNext = async () => {
    if (step < totalSteps - 1) {
      if (!isCurrentStepValid) {
        return;
      }

      setStep((current) => current + 1);
      return;
    }

    const firstInvalidStep = getFirstInvalidStep(profile);

    if (firstInvalidStep !== null) {
      setStep(firstInvalidStep);
      return;
    }

    try {
      await completeOnboarding();
      router.replace("/(tabs)");
    } catch {
      // The store exposes a user-facing error string so the user can retry.
    }
  };

  const saveError = error === saveErrorMessage ? error : null;

  return (
    <Screen
      title={stepTitle.title}
      subtitle={stepTitle.subtitle}
      footer={
        <View style={styles.footerRow}>
          {step > 0 ? <PrimaryButton label="Back" onPress={() => setStep((current) => current - 1)} variant="ghost" /> : null}
          <PrimaryButton
            label={isSaving ? "Saving your setup..." : step === totalSteps - 1 ? "Finish setup" : "Keep going"}
            onPress={() => void handleNext()}
            disabled={isSaving || !isCurrentStepValid}
            style={styles.primaryButton}
          />
        </View>
      }
    >
      <LinearGradient colors={["#18181B", "#101114", "#050505"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.eyebrow}>Nerdie Blaq Fit</Text>
        <Text style={styles.heroTitle}>Smart fitness with structure, style, and room for real life.</Text>
        <ProgressDots activeIndex={step} count={totalSteps} />
        <Text style={styles.helperText}>
          Save mode: {storageMode === "supabase" ? "Supabase connected" : "Local backup mode"}
        </Text>
      </LinearGradient>

      {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}

      {step === 0 ? (
        <SectionCard title="Personal details" eyebrow="Step 1 of 4">
          <FormField
            label="Age"
            value={profile.age}
            onChangeText={(value) => updateProfile({ age: value })}
            keyboardType="number-pad"
            placeholder="29"
            helper={currentStepErrors.age}
          />
          <FormField
            label="Height"
            value={profile.height}
            onChangeText={(value) => updateProfile({ height: value })}
            placeholder="5'8 or 173 cm"
            helper={currentStepErrors.height}
          />
          <FormField
            label="Weight"
            value={profile.weight}
            onChangeText={(value) => updateProfile({ weight: value })}
            placeholder="165 lb or 75 kg"
            helper={currentStepErrors.weight}
          />
          <FormField
            label="Goal weight"
            value={profile.goalWeight}
            onChangeText={(value) => updateProfile({ goalWeight: value })}
            placeholder="150 lb or 68 kg"
            helper={currentStepErrors.goalWeight}
          />
          {bmiSummary ? (
            <View style={styles.bmiCard}>
              <Text style={styles.bmiTitle}>BMI: {bmiSummary.value} • {bmiSummary.category}</Text>
              <Text style={styles.helperText}>{bmiSummary.message}</Text>
            </View>
          ) : null}
          <View style={styles.group}>
            <Text style={styles.label}>Sex</Text>
            <OptionChips options={sexOptions} value={profile.sex} onChange={(value) => updateProfile({ sex: value })} />
            {currentStepErrors.sex ? <Text style={styles.inlineError}>{currentStepErrors.sex}</Text> : null}
          </View>
        </SectionCard>
      ) : null}

      {step === 1 ? (
        <SectionCard title="Training profile" eyebrow="Step 2 of 4">
          <View style={styles.group}>
            <Text style={styles.label}>Activity level</Text>
            <OptionChips
              options={activityLevelOptions}
              value={profile.activityLevel}
              onChange={(value) => updateProfile({ activityLevel: value })}
            />
            {currentStepErrors.activityLevel ? <Text style={styles.inlineError}>{currentStepErrors.activityLevel}</Text> : null}
          </View>
          <View style={styles.group}>
            <Text style={styles.label}>Fitness goal</Text>
            <OptionChips
              options={fitnessGoalOptions}
              value={profile.fitnessGoal}
              onChange={(value) => updateProfile({ fitnessGoal: value })}
            />
            {currentStepErrors.fitnessGoal ? <Text style={styles.inlineError}>{currentStepErrors.fitnessGoal}</Text> : null}
          </View>
          <View style={styles.group}>
            <Text style={styles.label}>Goal pace</Text>
            <OptionChips
              options={goalPaceOptions}
              value={profile.goalPace}
              onChange={(value) => updateProfile({ goalPace: value })}
            />
            {currentStepErrors.goalPace ? <Text style={styles.inlineError}>{currentStepErrors.goalPace}</Text> : null}
          </View>
          <View style={styles.group}>
            <Text style={styles.label}>Workout experience</Text>
            <OptionChips
              options={workoutExperienceOptions}
              value={profile.workoutExperience}
              onChange={(value) => updateProfile({ workoutExperience: value })}
            />
            {currentStepErrors.workoutExperience ? <Text style={styles.inlineError}>{currentStepErrors.workoutExperience}</Text> : null}
          </View>
        </SectionCard>
      ) : null}

      {step === 2 ? (
        <SectionCard title="Training setup" eyebrow="Step 3 of 4">
          <View style={styles.group}>
            <Text style={styles.label}>Workout location</Text>
            <OptionChips
              options={workoutLocationOptions}
              value={profile.workoutLocation}
              onChange={(value) => updateProfile({ workoutLocation: value })}
            />
            {currentStepErrors.workoutLocation ? <Text style={styles.inlineError}>{currentStepErrors.workoutLocation}</Text> : null}
          </View>
          <View style={styles.group}>
            <Text style={styles.label}>Available equipment</Text>
            <MultiSelectChips
              options={equipmentOptions}
              values={profile.availableEquipment}
              onToggle={toggleEquipment}
            />
            {currentStepErrors.availableEquipment ? <Text style={styles.inlineError}>{currentStepErrors.availableEquipment}</Text> : null}
          </View>
        </SectionCard>
      ) : null}

      {step === 3 ? (
        <SectionCard title="Recovery and nutrition" eyebrow="Step 4 of 4">
          <View style={styles.group}>
            <Text style={styles.label}>Dietary preference</Text>
            <OptionChips
              options={dietaryPreferenceOptions}
              value={profile.dietaryPreference}
              onChange={(value) => updateProfile({ dietaryPreference: value })}
            />
            {currentStepErrors.dietaryPreference ? <Text style={styles.inlineError}>{currentStepErrors.dietaryPreference}</Text> : null}
          </View>
          <FormField
            label="Injuries or limitations"
            value={profile.injuriesOrLimitations}
            onChangeText={(value) => updateProfile({ injuriesOrLimitations: value })}
            placeholder="Low back sensitivity, shoulder limits, knee discomfort..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </SectionCard>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 28,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eyebrow: {
    color: colors.primarySoft,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  group: {
    gap: spacing.sm,
  },
  bmiCard: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  bmiTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  inlineError: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 18,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  footerRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
  },
});
