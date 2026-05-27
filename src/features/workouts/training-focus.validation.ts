import { TRAINING_FOCUSES } from "@/config/trainingFocus";
import { generateWorkoutPlan } from "@/features/workouts/generate-workout-plan";
import { adaptWorkoutForReadiness } from "@/lib/adaptiveTraining";
import { OnboardingProfile } from "@/types/onboarding";
import { DailyReadinessCheckIn } from "@/types/readiness";

const baseProfile: OnboardingProfile = {
  age: "34",
  sex: "prefer-not-to-say",
  height: "5'8",
  weight: "175",
  goalWeight: "165",
  goalPace: "steady",
  activityLevel: "very-active",
  fitnessGoal: "muscle-gain",
  workoutExperience: "advanced",
  trainingPathId: "beast",
  trainingFocusId: "mass-power",
  workoutLocation: "gym",
  availableEquipment: ["barbell", "bench", "dumbbells", "cardio-machine", "resistance-bands"],
  dietaryPreference: "balanced",
  injuriesOrLimitations: "",
};

const shortTimeCheckIn: DailyReadinessCheckIn = {
  checkinDate: "2026-05-26",
  sleepHours: 7,
  energyLevel: 7,
  soreness: { chest: 2, back: 2, shoulders: 2, arms: 2, legs: 2, core: 2 },
  jointPainNotes: "",
  timeAvailableMinutes: 30,
  previousSessionRpe: 7,
  stressLevel: 4,
};

const lowReadinessCheckIn: DailyReadinessCheckIn = {
  ...shortTimeCheckIn,
  sleepHours: 5,
  energyLevel: 4,
  soreness: { chest: 7, back: 7, shoulders: 7, arms: 7, legs: 7, core: 8 },
  timeAvailableMinutes: 55,
  previousSessionRpe: 9,
  stressLevel: 8,
};

function hasPlan(plan: ReturnType<typeof generateWorkoutPlan>) {
  return Boolean(plan && plan.days.length > 0 && plan.days.every((day) => day.exercises.length > 0));
}

function planText(plan: ReturnType<typeof generateWorkoutPlan>) {
  return plan?.days.map((day) => `${day.title} ${day.focus} ${day.exercises.map((exercise) => exercise.name).join(" ")} ${day.coreFinisher?.title ?? ""}`).join(" ").toLowerCase() ?? "";
}

function hasAlternatingCoreObliqueFinishers(plan: ReturnType<typeof generateWorkoutPlan>) {
  if (!plan?.days.length) {
    return false;
  }

  return plan.days.every((day, index) => {
    const expected = index % 2 === 0 ? "front-core-trunk-stability" : "obliques-side-core";
    return day.coreFinisher?.emphasis === expected;
  });
}

function hasNoMixedCoreAndObliqueFinisher(plan: ReturnType<typeof generateWorkoutPlan>) {
  const frontCorePattern = /dead bug|hollow|bird dog|crunch|leg raise|knee raise|glute bridge|plank$/i;
  const obliquePattern = /side plank|russian twist|woodchop|oblique|landmine twist/i;

  return Boolean(plan?.days.every((day) => {
    const exerciseNames = day.coreFinisher?.exercises.map((exercise) => exercise.name).join(" ") ?? "";

    if (day.coreFinisher?.emphasis === "front-core-trunk-stability") {
      return !obliquePattern.test(exerciseNames);
    }

    if (day.coreFinisher?.emphasis === "obliques-side-core") {
      return !frontCorePattern.test(exerciseNames);
    }

    return true;
  }));
}

export function validateTrainingFocusSystems() {
  const focusShapeWorks = TRAINING_FOCUSES.length === 4 && TRAINING_FOCUSES.every((focus) =>
    focus.id &&
    focus.title &&
    focus.subtitle &&
    focus.description &&
    focus.recommendedFor.length > 0 &&
    focus.primaryMusclePriorities.length > 0 &&
    focus.weeklyVolumeBias &&
    focus.coreFrequency &&
    focus.conditioningBias &&
    focus.recoverySensitivity &&
    typeof focus.proRequired === "boolean"
  );

  const beastMassPlan = generateWorkoutPlan(baseProfile, 0, {
    enableBlaqMass: true,
    trainingPathId: "beast",
    trainingFocusId: "mass-power",
  });
  const beastSculptPlan = generateWorkoutPlan({ ...baseProfile, fitnessGoal: "recomposition", trainingFocusId: "sculpt-strength" }, 0, {
    enableBlaqMass: true,
    trainingPathId: "beast",
    trainingFocusId: "sculpt-strength",
  });
  const foundationSculptPlan = generateWorkoutPlan({
    ...baseProfile,
    fitnessGoal: "recomposition",
    workoutExperience: "beginner",
    trainingFocusId: "sculpt-strength",
  }, 0, {
    enableBlaqMass: false,
    trainingPathId: "foundation",
    trainingFocusId: "sculpt-strength",
  });
  const foundationMassPlan = generateWorkoutPlan({ ...baseProfile, workoutExperience: "beginner", trainingFocusId: "mass-power" }, 0, {
    trainingPathId: "foundation",
    trainingFocusId: "mass-power",
  });
  const maintenanceGlutesPlan = generateWorkoutPlan({ ...baseProfile, fitnessGoal: "recomposition", trainingFocusId: "glutes-core" }, 0, {
    trainingPathId: "maintenance",
    trainingFocusId: "glutes-core",
  });
  const athleteConditioningPlan = generateWorkoutPlan({ ...baseProfile, fitnessGoal: "endurance", trainingFocusId: "athletic-conditioning" }, 0, {
    trainingPathId: "athlete",
    trainingFocusId: "athletic-conditioning",
  });
  const oldUserPlan = generateWorkoutPlan({ ...baseProfile, trainingFocusId: null }, 0, {
    enableBlaqMass: true,
    trainingPathId: "beast",
  });

  const beastSculptText = planText(beastSculptPlan);
  const maintenanceGlutesText = planText(maintenanceGlutesPlan);
  const athleteConditioningText = planText(athleteConditioningPlan);
  const foundationSculptExerciseCount = foundationSculptPlan?.days.reduce((sum, day) => sum + day.exercises.length + (day.coreFinisher?.exercises.length ?? 0), 0) ?? 0;
  const beastSculptExerciseCount = beastSculptPlan?.days.reduce((sum, day) => sum + day.exercises.length + (day.coreFinisher?.exercises.length ?? 0), 0) ?? 0;
  const sculptShortTime = beastSculptPlan
    ? adaptWorkoutForReadiness({
        profile: { ...baseProfile, trainingFocusId: "sculpt-strength" },
        selectedTrainingPath: { id: "beast", title: "Beast Path", subtitle: "", description: "", daysPerWeek: 6, experienceRequirement: "", recommendedFor: [], weeklySplit: [], proRequired: true },
        selectedTrainingFocus: TRAINING_FOCUSES.find((focus) => focus.id === "sculpt-strength"),
        plannedWorkout: beastSculptPlan.days[0],
        checkIn: shortTimeCheckIn,
      })
    : null;
  const massShortTime = beastMassPlan
    ? adaptWorkoutForReadiness({
        profile: { ...baseProfile, trainingFocusId: "mass-power" },
        selectedTrainingPath: { id: "beast", title: "Beast Path", subtitle: "", description: "", daysPerWeek: 6, experienceRequirement: "", recommendedFor: [], weeklySplit: [], proRequired: true },
        selectedTrainingFocus: TRAINING_FOCUSES.find((focus) => focus.id === "mass-power"),
        plannedWorkout: beastMassPlan.days[0],
        checkIn: shortTimeCheckIn,
      })
    : null;
  const lowReadinessSculpt = beastSculptPlan
    ? adaptWorkoutForReadiness({
        profile: { ...baseProfile, trainingFocusId: "sculpt-strength" },
        selectedTrainingPath: { id: "beast", title: "Beast Path", subtitle: "", description: "", daysPerWeek: 6, experienceRequirement: "", recommendedFor: [], weeklySplit: [], proRequired: true },
        selectedTrainingFocus: TRAINING_FOCUSES.find((focus) => focus.id === "sculpt-strength"),
        plannedWorkout: beastSculptPlan.days[0],
        checkIn: lowReadinessCheckIn,
      })
    : null;

  return {
    focusConfigShapeWorks: focusShapeWorks,
    allMajorCombosGeneratePlans: [
      foundationMassPlan,
      foundationSculptPlan,
      beastMassPlan,
      beastSculptPlan,
      maintenanceGlutesPlan,
      athleteConditioningPlan,
    ].every(hasPlan),
    oldUserWithoutFocusDefaultsToMassPower: oldUserPlan?.trainingFocusId === "mass-power" && Boolean(oldUserPlan.title.includes("Golden-Era")),
    beastSculptIncludesFocusEmphasis: /glute|hip thrust|bridge/.test(beastSculptText) && /shoulder|posture|reverse fly/.test(beastSculptText) && /core|abs|plank|dead bug/.test(beastSculptText),
    maintenanceGlutesIncludesGluteCoreEmphasis: /glute|hip thrust|bridge/.test(maintenanceGlutesText) && /core|plank|dead bug|oblique/.test(maintenanceGlutesText),
    athleteConditioningIncludesConditioningEmphasis: /conditioning|circuit|stamina|interval|walk/.test(athleteConditioningText),
    coreAndObliquesAlternateByWorkoutDay: hasAlternatingCoreObliqueFinishers(beastSculptPlan) && hasAlternatingCoreObliqueFinishers(beastMassPlan),
    coreFinishersNeverMixCoreAndObliques: hasNoMixedCoreAndObliqueFinisher(beastSculptPlan) && hasNoMixedCoreAndObliqueFinisher(beastMassPlan),
    foundationSculptIsLowerVolumeThanBeastSculpt: foundationSculptExerciseCount < beastSculptExerciseCount,
    massPowerPreservesExistingBehavior: Boolean(beastMassPlan?.title.includes("Golden-Era") && beastMassPlan.days[0]?.title.includes("Chest + Back")),
    sculptShortTimePreservesFocusWork: Boolean(sculptShortTime?.adjustedWorkout.exercises.some((exercise) => /glute|hip thrust|bridge|shoulder|posture|row/i.test(exercise.name))),
    massPowerShortTimePreservesCompounds: Boolean(massShortTime?.adjustedWorkout.exercises.some((exercise) => /bench|row|pull|deadlift|press/i.test(exercise.name))),
    lowReadinessReducesCoreVolume: Boolean(lowReadinessSculpt && (!lowReadinessSculpt.adjustedWorkout.coreFinisher || lowReadinessSculpt.volumeAdjustment < 1)),
  };
}
