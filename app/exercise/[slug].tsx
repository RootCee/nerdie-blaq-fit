import { useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";

import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { getExerciseMetadata } from "@/features/workouts/exercise-library";
import { colors, spacing } from "@/theme";

function formatSubstitutionType(type: string) {
  return type
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function ExerciseDetailScreen() {
  const params = useLocalSearchParams<{ slug: string; name?: string }>();
  const metadata = getExerciseMetadata(params.slug, params.name);
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  if (__DEV__) {
    console.log("[exercise-detail] render", {
      selectedSlug: params.slug,
      metadataSlug: metadata.slug,
      hasLocalImage: Boolean(metadata.localImage),
      usingPlaceholder: !metadata.localImage,
    });
  }

  return (
    <>
      <Screen
        title={metadata.displayName ?? metadata.name}
        subtitle={metadata.shortDescription ?? "Movement notes for this exercise are still growing, but the essentials will keep getting sharper."}
        footer={<PrimaryButton label="Back to workout" onPress={() => router.back()} variant="ghost" />}
      >
        <Pressable onPress={() => setIsImageExpanded(true)}>
          <Image source={metadata.image} style={styles.image} resizeMode="cover" />
        </Pressable>

        <SectionCard title="Movement snapshot" eyebrow={metadata.isFallback ? "Starter guidance" : "Exercise detail"}>
          <Text style={styles.copy}>
            {metadata.shortDescription ?? "This movement is in your plan, and deeper coaching notes are still on the way."}
          </Text>
          <Text style={styles.metaLine}>
            Best fit: {metadata.workoutLocation.length ? metadata.workoutLocation.join(" / ") : "home / gym"}
          </Text>
          <Text style={styles.metaLine}>
            Gear: {metadata.equipment.length ? metadata.equipment.join(", ") : "Check your workout plan for setup cues"}
          </Text>
        </SectionCard>

        <SectionCard title="Muscles worked" eyebrow="What it hits">
          <Text style={styles.metaLine}>
            Primary: {metadata.primaryMuscles.length ? metadata.primaryMuscles.join(", ") : "More detail coming soon"}
          </Text>
          <Text style={styles.metaLine}>
            Secondary: {metadata.secondaryMuscles.length ? metadata.secondaryMuscles.join(", ") : "More detail coming soon"}
          </Text>
        </SectionCard>

        <SectionCard title="How to move through it" eyebrow="Step by step">
          {metadata.stepByStepInstructions.length ? (
            metadata.stepByStepInstructions.map((step, index) => (
              <Text key={`${metadata.slug}-step-${index}`} style={styles.listItem}>
                {index + 1}. {step}
              </Text>
            ))
          ) : (
            <Text style={styles.copy}>
              Step-by-step coaching notes are still being built out for this movement. For now, lean on the cues in your workout plan and keep the reps controlled.
            </Text>
          )}
        </SectionCard>

        <SectionCard title="Coach cues" eyebrow="Keep it clean">
          {metadata.tips.length ? (
            metadata.tips.map((tip) => (
              <Text key={tip} style={styles.listItem}>
                • {tip}
              </Text>
            ))
          ) : (
            <Text style={styles.copy}>More coaching cues are on the way for this movement.</Text>
          )}
        </SectionCard>

        <SectionCard title="Common misses" eyebrow="Stay sharp">
          {metadata.commonMistakes.length ? (
            metadata.commonMistakes.map((mistake) => (
              <Text key={mistake} style={styles.listItem}>
                • {mistake}
              </Text>
            ))
          ) : (
            <Text style={styles.copy}>Common slip-up notes are still being added for this movement.</Text>
          )}
        </SectionCard>

        <SectionCard title="Smart swaps" eyebrow="Keep the pattern">
          {metadata.substitutions.length ? (
            metadata.substitutions.map((substitution) => {
              const content = (
                <View style={styles.substitutionCard}>
                  <Text style={styles.substitutionType}>{formatSubstitutionType(substitution.type)}</Text>
                  <Text style={styles.substitutionName}>{substitution.name}</Text>
                  <Text style={styles.copy}>{substitution.reason}</Text>
                  <Text style={styles.substitutionLink}>
                    {substitution.existsInLibrary ? "Open swap notes" : "Swap notes coming soon"}
                  </Text>
                </View>
              );

              if (substitution.existsInLibrary) {
                return (
                  <Pressable
                    key={`${metadata.slug}-${substitution.slug}-${substitution.type}`}
                    onPress={() =>
                      router.push({
                        pathname: "/exercise/[slug]" as never,
                        params: { slug: substitution.slug, name: substitution.name } as never,
                      } as never)
                    }
                  >
                    {content}
                  </Pressable>
                );
              }

              return <View key={`${metadata.slug}-${substitution.slug}-${substitution.type}`}>{content}</View>;
            })
          ) : (
            <Text style={styles.copy}>
              Swap suggestions haven’t been added for this movement yet. Check back as the Nerdie Blaq Fit movement library grows.
            </Text>
          )}
        </SectionCard>
      </Screen>

      <Modal
        animationType="fade"
        transparent
        visible={isImageExpanded}
        onRequestClose={() => setIsImageExpanded(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setIsImageExpanded(false)}>
          <Pressable style={styles.closeButton} onPress={() => setIsImageExpanded(false)}>
            <Text style={styles.closeButtonText}>X</Text>
          </Pressable>
          <Image source={metadata.image} style={styles.expandedImage} resizeMode="contain" />
        </Pressable>
      </Modal>
    </>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  closeButton: {
    position: "absolute",
    top: spacing.xxl,
    right: spacing.lg,
    zIndex: 1,
    backgroundColor: colors.overlay,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  closeButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  expandedImage: {
    width: "100%",
    height: "80%",
    maxWidth: 900,
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
  substitutionCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    borderColor: colors.border,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  substitutionType: {
    color: colors.primarySoft,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  substitutionName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  substitutionLink: {
    color: colors.primarySoft,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },
});
