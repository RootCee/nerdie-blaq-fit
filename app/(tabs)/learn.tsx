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
      <Screen title="Learn" subtitle="Education can live here as explainers, short-form lessons, and habit coaching.">
        <SectionCard title="Content shelf" eyebrow="Knowledge">
          <Text style={styles.copy}>
            Local education content has not been added yet. This tab will populate as the article library grows.
          </Text>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen title="Learn" subtitle="A local library of practical fitness education you can revisit anytime.">
      <SectionCard title="Education hub" eyebrow="Knowledge">
        <Text style={styles.copy}>
          Build better decisions with short reads on fat loss, muscle gain, recovery, hydration, supplements, mindset, and beginner-friendly fundamentals.
        </Text>
        <Text style={styles.filterHint}>Browse by category or keep it wide open with All.</Text>
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
          title="Nothing in this category yet"
          eyebrow={formatFilterLabel(selectedFilter)}
        >
          <Text style={styles.copy}>
            This category is ready for more articles soon. Switch filters to explore the rest of the library.
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
            <Text style={styles.linkText}>Open article</Text>
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
