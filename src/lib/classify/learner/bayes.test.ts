import { describe, expect, it } from "vitest";
import { predict, tokenize, type LearnerModel } from "@/lib/classify/learner/bayes";
import type { Verdict } from "@/lib/classify/score";

function buildModel(examples: { verdict: Verdict; tokens: string[] }[]): LearnerModel {
  const classDocs: LearnerModel["classDocs"] = {};
  const tokenCounts: LearnerModel["tokenCounts"] = new Map();
  for (const { verdict, tokens } of examples) {
    classDocs[verdict] = (classDocs[verdict] ?? 0) + 1;
    for (const t of new Set(tokens)) {
      const row = tokenCounts.get(t) ?? {};
      tokenCounts.set(t, { ...row, [verdict]: (row[verdict] ?? 0) + 1 });
    }
  }
  return { classDocs, tokenCounts };
}

const source = (subject: string, snippet: string, fromAddress = "a@shop.example", fromDomain = "shop.example") => ({
  fromAddress,
  fromDomain,
  subject,
  snippet,
  isBulk: false,
});

describe("tokenize", () => {
  it("keeps 3+ letter words once, lowercased and NFKC-folded, plus sender pseudo-tokens", () => {
    const tokens = tokenize(source("ＷＩＮ Win a prize prize", "go"));
    expect(tokens.filter((t) => t === "win")).toHaveLength(1);
    expect(tokens).toContain("prize");
    expect(tokens).not.toContain("go");
    expect(tokens).toContain("@addr:a@shop.example");
    expect(tokens).toContain("@dom:shop.example");
  });

  it("collapses every freemail domain into one token so a gmail.com sender isn't judged by gmail.com", () => {
    expect(tokenize(source("hi", null as unknown as string, "x@gmail.com", "gmail.com"))).toContain("@freemail");
  });
});

describe("predict", () => {
  const model = buildModel([
    ...Array.from({ length: 5 }, () => ({ verdict: "SPAM" as const, tokens: ["whatsapp", "dialogue", "@freemail"] })),
    ...Array.from({ length: 5 }, () => ({ verdict: "LEGITIMATE" as const, tokens: ["facture", "commande", "@dom:shop.example"] })),
  ]);

  it("returns null until two classes have enough examples", () => {
    expect(predict(["whatsapp"], buildModel([{ verdict: "SPAM", tokens: ["whatsapp"] }]))).toBeNull();
  });

  it("predicts the class whose tokens match, with high confidence", () => {
    const spam = predict(["whatsapp", "dialogue", "@freemail"], model);
    expect(spam?.verdict).toBe("SPAM");
    expect(spam?.probability).toBeGreaterThan(0.97);
    expect(predict(["facture", "commande"], model)?.verdict).toBe("LEGITIMATE");
  });

  it("stays undecided (≈ uniform) when no token was ever seen", () => {
    expect(predict(["zzz"], model)?.probability).toBeCloseTo(0.5);
  });

  it("does not let a big class win by size alone (uniform prior)", () => {
    const skewed = buildModel([
      ...Array.from({ length: 500 }, () => ({ verdict: "SPAM" as const, tokens: ["promo"] })),
      ...Array.from({ length: 5 }, () => ({ verdict: "LEGITIMATE" as const, tokens: ["facture"] })),
    ]);
    expect(predict(["inconnu"], skewed)?.probability).toBeCloseTo(0.5);
  });
});
