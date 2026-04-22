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
import {
  activityLevelOptions,
  dietaryPreferenceOptions,
  equipmentOptions,
  fitnessGoalOptions,
  sexOptions,
  workoutExperienceOptions,
  workoutLocationOptions,
} from "@/constants/options";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors, spacing } from "@/theme";
import { EquipmentOption } from "@/types/onboarding";

const totalSteps = 4;

export default function OnboardingScreen() {
  const { profile, updateProfile, completeOnboarding, isSaving, error, storageMode } = useOnboardingStore();
  const [step, setStep] = useState(0);

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
      setStep((current) => current + 1);
      return;
    }

    try {
      await completeOnboarding();
      router.replace("/(tabs)");
    } catch {
      // The store exposes a user-facing error string so the user can retry.
    }
  };

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

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {step === 0 ? (
        <SectionCard title="Personal details" eyebrow="Step 1 of 4">
          <FormField
            label="Age"
            value={profile.age}
            onChangeText={(value) => updateProfile({ age: value })}
            keyboardType="number-pad"
            placeholder="29"
          />
          <FormField
            label="Height"
            value={profile.height}
            onChangeText={(value) => updateProfile({ height: value })}
            placeholder="5'8 or 173 cm"
          />
          <FormField
            label="Weight"
            value={profile.weight}
            onChangeText={(value) => updateProfile({ weight: value })}
            placeholder="165 lb or 75 kg"
          />
          <View style={styles.group}>
            <Text style={styles.label}>Sex</Text>
            <OptionChips options={sexOptions} value={profile.sex} onChange={(value) => updateProfile({ sex: value })} />
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
          </View>
          <View style={styles.group}>
            <Text style={styles.label}>Fitness goal</Text>
            <OptionChips
              options={fitnessGoalOptions}
              value={profile.fitnessGoal}
              onChange={(value) => updateProfile({ fitnessGoal: value })}
            />
          </View>
          <View style={styles.group}>
            <Text style={styles.label}>Workout experience</Text>
            <OptionChips
              options={workoutExperienceOptions}
              value={profile.workoutExperience}
              onChange={(value) => updateProfile({ workoutExperience: value })}
            />
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
          </View>
          <View style={styles.group}>
            <Text style={styles.label}>Available equipment</Text>
            <MultiSelectChips
              options={equipmentOptions}
              values={profile.availableEquipment}
              onToggle={toggleEquipment}
            />
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
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
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
