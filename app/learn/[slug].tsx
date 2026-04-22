import { StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { getLearnArticle } from "@/features/learn/article-library";
import { colors, spacing } from "@/theme";

export default function LearnArticleScreen() {
  const params = useLocalSearchParams<{ slug: string }>();
  const article = getLearnArticle(params.slug);

  if (!article) {
    return (
      <Screen
        title="Learn"
        subtitle="This read isn't available right now."
        footer={<PrimaryButton label="Back to learn" onPress={() => router.back()} variant="ghost" />}
      >
        <SectionCard title="Article not available" eyebrow="Try again">
          <Text style={styles.copy}>
            That article isn't ready right now. Head back to Learn and pick another topic that fits what you need today.
          </Text>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen
      title={article.title}
      subtitle={article.shortSummary}
      footer={<PrimaryButton label="Back to learn" onPress={() => router.back()} variant="ghost" />}
    >
      <SectionCard title="Quick take" eyebrow={article.category.replace(/-/g, " ")}>
        <Text style={styles.metaLine}>Read time: {article.estimatedReadTimeMinutes} min</Text>
        <View style={styles.tagsRow}>
          {article.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Why it matters" eyebrow="The core reason">
        {article.sections.whyItMatters.map((paragraph, index) => (
          <Text key={`wim-${index}`} style={styles.copy}>
            {paragraph}
          </Text>
        ))}
      </SectionCard>

      <SectionCard title="How to apply it" eyebrow="In practice">
        {article.sections.howToApplyIt.map((paragraph, index) => (
          <Text key={`htai-${index}`} style={styles.copy}>
            {paragraph}
          </Text>
        ))}
      </SectionCard>

      <SectionCard title="Common mistakes" eyebrow="Watch out for">
        {article.sections.commonMistakes.map((item, index) => (
          <Text key={`cm-${index}`} style={styles.bulletItem}>
            • {item}
          </Text>
        ))}
      </SectionCard>

      <SectionCard title="Action steps" eyebrow="Do this">
        {article.sections.actionSteps.map((step, index) => (
          <Text key={`as-${index}`} style={styles.actionItem}>
            {index + 1}. {step}
          </Text>
        ))}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 24,
  },
  metaLine: {
    color: colors.primarySoft,
    fontSize: 13,
    fontWeight: "700",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  tagText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  bulletItem: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 24,
  },
  actionItem: {
    color: colors.accentSoft,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 24,
  },
});
