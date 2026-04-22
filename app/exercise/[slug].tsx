import { Image, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";

import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { getExerciseMetadata } from "@/features/workouts/exercise-library";
import { colors, spacing } from "@/theme";

export default function ExerciseDetailScreen() {
  const params = useLocalSearchParams<{ slug: string; name?: string }>();
  const metadata = getExerciseMetadata(params.slug, params.name);

  return (
    <Screen
      title={metadata.name}
      subtitle={metadata.shortDescription ?? "Exercise details will expand here as the local movement library grows."}
      footer={<PrimaryButton label="Back to workout" onPress={() => router.back()} variant="ghost" />}
    >
      <Image source={metadata.image} style={styles.image} resizeMode="cover" />

      <SectionCard title="Overview" eyebrow={metadata.isFallback ? "Starter metadata" : "Exercise detail"}>
        <Text style={styles.copy}>
          {metadata.shortDescription ?? "This movement is included in your plan, but a richer description has not been added yet."}
        </Text>
        <Text style={styles.metaLine}>
          Location: {metadata.workoutLocation.length ? metadata.workoutLocation.join(" / ") : "home / gym"}
        </Text>
        <Text style={styles.metaLine}>
          Equipment: {metadata.equipment.length ? metadata.equipment.join(", ") : "See your workout plan for setup guidance"}
        </Text>
      </SectionCard>

      <SectionCard title="Muscles worked" eyebrow="Target areas">
        <Text style={styles.metaLine}>
          Primary: {metadata.primaryMuscles.length ? metadata.primaryMuscles.join(", ") : "Details coming soon"}
        </Text>
        <Text style={styles.metaLine}>
          Secondary: {metadata.secondaryMuscles.length ? metadata.secondaryMuscles.join(", ") : "Details coming soon"}
        </Text>
      </SectionCard>

      <SectionCard title="How to do it" eyebrow="Step by step">
        {metadata.stepByStepInstructions.length ? (
          metadata.stepByStepInstructions.map((step, index) => (
            <Text key={`${metadata.slug}-step-${index}`} style={styles.listItem}>
              {index + 1}. {step}
            </Text>
          ))
        ) : (
          <Text style={styles.copy}>
            Step-by-step coaching notes are still being added for this movement. Use the exercise notes in your workout plan for now.
          </Text>
        )}
      </SectionCard>

      <SectionCard title="Tips" eyebrow="Coach cues">
        {metadata.tips.length ? (
          metadata.tips.map((tip) => (
            <Text key={tip} style={styles.listItem}>
              • {tip}
            </Text>
          ))
        ) : (
          <Text style={styles.copy}>Detailed coaching tips are coming soon for this exercise.</Text>
        )}
      </SectionCard>

      <SectionCard title="Common mistakes" eyebrow="Move clean">
        {metadata.commonMistakes.length ? (
          metadata.commonMistakes.map((mistake) => (
            <Text key={mistake} style={styles.listItem}>
              • {mistake}
            </Text>
          ))
        ) : (
          <Text style={styles.copy}>Common mistake notes are still being added for this movement.</Text>
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: 220,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  copy: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  metaLine: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  listItem: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
});
