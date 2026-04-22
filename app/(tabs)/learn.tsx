import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { learnArticles } from "@/features/learn/article-library";
import { LEARN_CATEGORIES, LearnCategory, LearnFilter } from "@/types/content";
import { colors, spacing } from "@/theme";

const FILTER_OPTIONS: LearnFilter[] = ["all", ...LEARN_CATEGORIES];

function formatFilterLabel(filter: LearnFilter) {
  if (filter === "all") {
    return "All";
  }

  return filter
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export default function LearnScreen() {
  const [selectedFilter, setSelectedFilter] = useState<LearnFilter>("all");

  const filteredArticles = useMemo(() => {
    if (selectedFilter === "all") {
      return learnArticles;
    }

    return learnArticles.filter((article) => article.category === selectedFilter);
  }, [selectedFilter]);

  if (!learnArticles.length) {
    return (
      <Screen title="Learn" subtitle="Practical education, coaching notes, and smarter fitness context live here.">
        <SectionCard title="Library coming online" eyebrow="Knowledge">
          <Text style={styles.copy}>
            The Learn library is still growing. New reads will land here as Nerdie Blaq Fit builds out the knowledge base.
          </Text>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen title="Learn" subtitle="A practical fitness library you can come back to anytime.">
      <SectionCard title="Education hub" eyebrow="Knowledge">
        <Text style={styles.copy}>
          Sharpen your decisions with short reads on fat loss, muscle gain, recovery, hydration, supplements, mindset, and beginner-friendly fundamentals.
        </Text>
        <Text style={styles.filterHint}>Browse by category, or keep the whole shelf open with All.</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_OPTIONS.map((filter) => {
            const isActive = filter === selectedFilter;

            return (
              <Pressable
                key={filter}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => setSelectedFilter(filter)}
                style={[styles.filterChip, isActive ? styles.filterChipActive : null]}
              >
                <Text style={[styles.filterChipText, isActive ? styles.filterChipTextActive : null]}>
                  {formatFilterLabel(filter)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </SectionCard>

      {!filteredArticles.length ? (
        <SectionCard
          title="Nothing in this lane yet"
          eyebrow={formatFilterLabel(selectedFilter)}
        >
          <Text style={styles.copy}>
            This lane will fill out soon. Switch filters to explore the rest of the library.
          </Text>
        </SectionCard>
      ) : null}

      {filteredArticles.map((article) => (
        <Pressable
          key={article.slug}
          onPress={() =>
            router.push({
              pathname: "/learn/[slug]" as never,
              params: { slug: article.slug } as never,
            } as never)
          }
        >
          <SectionCard title={article.title} eyebrow={article.category.replace("-", " ")}>
            <Text style={styles.copy}>{article.shortSummary}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{article.estimatedReadTimeMinutes} min read</Text>
              <Text style={styles.metaText}>{article.tags.join(" • ")}</Text>
            </View>
            <Text style={styles.linkText}>Read article</Text>
          </SectionCard>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  filterHint: {
    color: colors.primarySoft,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },
  filterRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
  },
  filterChip: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: colors.background,
  },
  metaRow: {
    gap: spacing.xs,
  },
  metaText: {
    color: colors.primarySoft,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },
  linkText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
});
