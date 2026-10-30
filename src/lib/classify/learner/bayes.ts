import type { Verdict } from "@/lib/classify/score";

export const VERDICTS: readonly Verdict[] = ["LEGITIMATE", "NEWSLETTER", "SPAM", "PHISHING"];

/** Shared mailbox providers: the domain says nothing about who is writing. */
const FREEMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "hotmail.fr", "outlook.com", "outlook.fr", "live.com", "live.fr",
  "msn.com", "yahoo.com", "yahoo.fr", "icloud.com", "me.com", "aol.com", "gmx.com", "gmx.fr", "orange.fr",
  "wanadoo.fr", "free.fr", "sfr.fr", "laposte.net", "proton.me", "protonmail.com",
]);

const MAX_TOKENS = 200;
const WORD = /[\p{L}\p{N}]{3,24}/gu;

export type TokenSource = {
  fromAddress: string;
  fromDomain: string;
  subject: string;
  snippet: string | null;
  isBulk: boolean;
};

export function isFreemailDomain(domain: string): boolean {
  return FREEMAIL_DOMAINS.has(domain.toLowerCase());
}

/** A set (presence, not frequency) of words plus a few sender/structure pseudo-tokens prefixed with "@". */
export function tokenize(source: TokenSource): string[] {
  const text = `${source.subject} ${source.snippet ?? ""}`.normalize("NFKC").toLowerCase();
  const tokens = new Set<string>();
  for (const match of text.matchAll(WORD)) {
    if (tokens.size >= MAX_TOKENS) break;
    tokens.add(match[0]);
  }
  tokens.add(`@addr:${source.fromAddress.toLowerCase()}`);
  tokens.add(isFreemailDomain(source.fromDomain) ? "@freemail" : `@dom:${source.fromDomain.toLowerCase()}`);
  if (source.isBulk) tokens.add("@bulk");
  return [...tokens];
}

export type LearnerModel = {
  /** Training messages per verdict. */
  classDocs: Partial<Record<Verdict, number>>;
  /** For each token of the message being scored: how many training messages per verdict contained it. */
  tokenCounts: Map<string, Partial<Record<Verdict, number>>>;
};

export type LearnedPrediction = { verdict: Verdict; probability: number };

/** A class needs a few examples before its likelihoods mean anything. */
const MIN_DOCS_PER_CLASS = 3;

/**
 * Bernoulli naive Bayes over token presence, with a uniform prior: the training
 * set is heavily skewed (thousands of blocked spam vs. a few hundred kept mails),
 * and a frequency prior would push every unfamiliar message toward SPAM.
 * Returns null when fewer than two classes have enough examples to compare.
 */
export function predict(tokens: string[], model: LearnerModel): LearnedPrediction | null {
  const classes = VERDICTS.filter((v) => (model.classDocs[v] ?? 0) >= MIN_DOCS_PER_CLASS);
  if (classes.length < 2) return null;

  const logScores = new Map<Verdict, number>(classes.map((v) => [v, 0]));
  for (const token of tokens) {
    const counts = model.tokenCounts.get(token);
    if (!counts) continue;
    for (const v of classes) {
      const docs = model.classDocs[v] ?? 0;
      const present = counts[v] ?? 0;
      const delta = Math.log((present + 1) / (docs + 2)) - Math.log((docs - present + 1) / (docs + 2));
      logScores.set(v, (logScores.get(v) ?? 0) + delta);
    }
  }

  let best: Verdict = classes[0];
  for (const v of classes) if ((logScores.get(v) ?? 0) > (logScores.get(best) ?? 0)) best = v;
  const max = logScores.get(best) ?? 0;
  let partition = 0;
  for (const v of classes) partition += Math.exp((logScores.get(v) ?? 0) - max);
  return { verdict: best, probability: 1 / partition };
}
