import { StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatChip } from "@/components/ui/StatChip";
import { generateWorkoutPlan } from "@/features/workouts/generate-workout-plan";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors, spacing } from "@/theme";

export default function WorkoutScreen() {
  const { profile, isComplete } = useOnboardingStore();
  const plan = generateWorkoutPlan(profile);

  if (!isComplete || !plan) {
    return (
      <Screen title="Workout" subtitle="Your weekly plan appears here once onboarding is complete and your training preferences are set.">
        <SectionCard title="No plan yet" eyebrow="Complete onboarding">
          <Text style={styles.copy}>
            Finish onboarding with your goal, experience, activity level, and workout location so Nerdie Blaq Fit can build your first weekly training split.
          </Text>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen title="Workout" subtitle="A deterministic weekly plan built from your saved profile and current training setup.">
      <SectionCard title={plan.title} eyebrow="Generated weekly plan">
        <Text style={styles.copy}>{plan.summary}</Text>
        <View style={styles.statsRow}>
          <StatChip label="Days" value={String(plan.trainingDays)} />
          <StatChip label="Goal" value={plan.goal.replace("-", " ")} />
          <StatChip label="Location" value={plan.location} />
          <StatChip label="Level" value={plan.experience} />
        </View>
      </SectionCard>

      <SectionCard title="Plan notes" eyebrow="How to use it">
        {plan.notes.map((note) => (
          <Text key={note} style={styles.noteItem}>
            • {note}
          </Text>
        ))}
      </SectionCard>

      {plan.days.map((day) => (
        <SectionCard key={day.id} title={day.title} eyebrow={day.focus}>
          <Text style={styles.dayNotes}>{day.notes}</Text>

          {day.exercises.map((item) => (
            <View key={`${day.id}-${item.name}`} style={styles.exerciseCard}>
              <Text style={styles.exerciseName}>{item.name}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>Sets: {item.sets}</Text>
                <Text style={styles.metaText}>Reps: {item.reps}</Text>
                <Text style={styles.metaText}>Rest: {item.restTime}</Text>
              </View>
              <Text style={styles.exerciseNotes}>{item.notes}</Text>
            </View>
          ))}
        </SectionCard>
      ))}
      <SectionCard title="Built from your profile" eyebrow="Source of truth">
        <Text style={styles.copy}>
          Goal: {profile.fitnessGoal?.replace("-", " ")} | Experience: {profile.workoutExperience} | Location:{" "}
          {profile.workoutLocation}
        </Text>
        <Text style={styles.copy}>
          Equipment: {profile.availableEquipment.length ? profile.availableEquipment.join(", ") : "none"}
        </Text>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  noteItem: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  dayNotes: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  exerciseCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metaText: {
    color: colors.primarySoft,
    fontSize: 13,
    fontWeight: "600",
  },
  exerciseNotes: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
