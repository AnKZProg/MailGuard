/** "learned" and "security" are explanatory only — they never add to a category score. */
export type SignalCategory = "phishing" | "spam" | "newsletter" | "learned" | "security";

export type Signal = {
  ruleId: string;
  category: SignalCategory;
  /** Contribution to the category's score, 0..1. Several signals in the same category add up. */
  weight: number;
  detail: string;
};
