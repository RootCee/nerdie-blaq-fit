export const LEARN_CATEGORIES = [
  "fat-loss",
  "muscle-gain",
  "recovery",
  "hydration",
  "supplements",
  "mindset",
  "beginner-tips",
] as const;

export type LearnCategory = (typeof LEARN_CATEGORIES)[number];

export type LearnFilter = "all" | LearnCategory;

export interface LearnArticleSections {
  whyItMatters: string[];
  howToApplyIt: string[];
  commonMistakes: string[];
  actionSteps: string[];
}

export interface LearnArticle {
  slug: string;
  title: string;
  category: LearnCategory;
  shortSummary: string;
  sections: LearnArticleSections;
  tags: string[];
  estimatedReadTimeMinutes: number;
}
