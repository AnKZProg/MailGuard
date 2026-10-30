import { db } from "@/lib/db";
import type { Message, Verdict } from "@prisma/client";
import { predict, tokenize, type LearnedPrediction, type LearnerModel } from "@/lib/classify/learner/bayes";

const BOOTSTRAP_KEY = "learnerBootstrapped";
const SQLITE_IN_CHUNK = 500;

type LearnableMessage = Pick<Message, "fromAddress" | "fromDomain" | "subject" | "snippet" | "listUnsubscribe" | "listId">;

function tokensOf(message: LearnableMessage): string[] {
  return tokenize({
    fromAddress: message.fromAddress,
    fromDomain: message.fromDomain,
    subject: message.subject,
    snippet: message.snippet,
    isBulk: Boolean(message.listUnsubscribe || message.listId),
  });
}

async function loadModel(tokens: string[]): Promise<LearnerModel> {
  const [classes, rows] = await Promise.all([
    db.learnedClass.findMany(),
    db.learnedToken.findMany({ where: { token: { in: tokens } } }),
  ]);
  const classDocs: LearnerModel["classDocs"] = {};
  for (const c of classes) classDocs[c.verdict] = c.docs;
  const tokenCounts: LearnerModel["tokenCounts"] = new Map();
  for (const row of rows) {
    tokenCounts.set(row.token, { ...tokenCounts.get(row.token), [row.verdict]: row.count });
  }
  return { classDocs, tokenCounts };
}

export async function predictForMessage(message: LearnableMessage): Promise<LearnedPrediction | null> {
  const tokens = tokensOf(message);
  return predict(tokens, await loadModel(tokens));
}

/**
 * Records the user's verdict for one message as a training example. Re-correcting
 * the same message moves its example from the old class to the new one instead of
 * counting it twice.
 */
export async function recordUserVerdict(messageId: string, verdict: Verdict): Promise<void> {
  const message = await db.message.findUniqueOrThrow({ where: { id: messageId } });
  const previous = message.userVerdict;
  if (previous === verdict) return;
  const tokens = tokensOf(message);

  await db.$transaction([
    ...(previous
      ? [
          db.learnedToken.updateMany({ where: { verdict: previous, token: { in: tokens } }, data: { count: { decrement: 1 } } }),
          db.learnedClass.update({ where: { verdict: previous }, data: { docs: { decrement: 1 } } }),
        ]
      : []),
    ...tokens.map((token) =>
      db.learnedToken.upsert({
        where: { token_verdict: { token, verdict } },
        create: { token, verdict, count: 1 },
        update: { count: { increment: 1 } },
      }),
    ),
    db.learnedClass.upsert({ where: { verdict }, create: { verdict, docs: 1 }, update: { docs: { increment: 1 } } }),
    db.message.update({ where: { id: messageId }, data: { userVerdict: verdict } }),
  ]);
}

/** Labels already implied by past user actions: blocked senders, unsubscribes, filed or restored mail. */
async function collectHistoricalLabels(): Promise<Map<string, Verdict>> {
  const labels = new Map<string, Verdict>();

  const blocked = await db.senderPolicy.findMany({ where: { verdict: "BLOCK" }, select: { scope: true, pattern: true } });
  const blockedAddresses = blocked.filter((p) => p.scope === "ADDRESS").map((p) => p.pattern);
  const blockedDomains = blocked.filter((p) => p.scope === "DOMAIN").map((p) => p.pattern);
  for (let i = 0; i < Math.max(blockedAddresses.length, blockedDomains.length); i += SQLITE_IN_CHUNK) {
    const rows = await db.message.findMany({
      where: {
        OR: [
          { fromAddress: { in: blockedAddresses.slice(i, i + SQLITE_IN_CHUNK) } },
          { fromDomain: { in: blockedDomains.slice(i, i + SQLITE_IN_CHUNK) } },
        ],
      },
      select: { id: true },
    });
    for (const r of rows) labels.set(r.id, "SPAM");
  }

  const unsubscribes = await db.auditLog.findMany({ where: { action: "unsubscribe" }, select: { messageIds: true } });
  for (const entry of unsubscribes) {
    for (const id of JSON.parse(entry.messageIds) as string[]) labels.set(id, "NEWSLETTER");
  }

  const kept = await db.message.findMany({
    where: { OR: [{ state: "ORGANIZED" }, { quarantineItem: { restoredAt: { not: null } } }] },
    select: { id: true },
  });
  for (const r of kept) labels.set(r.id, "LEGITIMATE");

  return labels;
}

/**
 * One-time: trains the learner on what the user's past actions already say, so it
 * is useful from day one instead of waiting for fresh corrections. Counts are built
 * in memory and written in bulk — thousands of per-token upserts would take minutes.
 */
export async function bootstrapLearnerOnce(): Promise<void> {
  if (await db.appSetting.findUnique({ where: { key: BOOTSTRAP_KEY } })) return;

  const labels = await collectHistoricalLabels();
  const ids = [...labels.keys()];
  const classDocs = new Map<Verdict, number>();
  const tokenCounts = new Map<string, number>();
  const idsByVerdict = new Map<Verdict, string[]>();

  for (let i = 0; i < ids.length; i += SQLITE_IN_CHUNK) {
    const messages = await db.message.findMany({ where: { id: { in: ids.slice(i, i + SQLITE_IN_CHUNK) }, userVerdict: null } });
    for (const message of messages) {
      const verdict = labels.get(message.id);
      if (!verdict) continue;
      classDocs.set(verdict, (classDocs.get(verdict) ?? 0) + 1);
      const bucket = idsByVerdict.get(verdict) ?? [];
      bucket.push(message.id);
      idsByVerdict.set(verdict, bucket);
      for (const token of tokensOf(message)) {
        const key = `${verdict}\u0000${token}`;
        tokenCounts.set(key, (tokenCounts.get(key) ?? 0) + 1);
      }
    }
  }

  const tokenRows = [...tokenCounts].map(([key, count]) => {
    const [verdict, token] = key.split("\u0000") as [Verdict, string];
    return { token, verdict, count };
  });

  await db.$transaction(async (tx) => {
    for (const row of tokenRows) {
      await tx.learnedToken.upsert({
        where: { token_verdict: { token: row.token, verdict: row.verdict } },
        create: row,
        update: { count: { increment: row.count } },
      });
    }
    for (const [verdict, docs] of classDocs) {
      await tx.learnedClass.upsert({ where: { verdict }, create: { verdict, docs }, update: { docs: { increment: docs } } });
    }
    for (const [verdict, verdictIds] of idsByVerdict) {
      for (let i = 0; i < verdictIds.length; i += SQLITE_IN_CHUNK) {
        await tx.message.updateMany({ where: { id: { in: verdictIds.slice(i, i + SQLITE_IN_CHUNK) } }, data: { userVerdict: verdict } });
      }
    }
    await tx.appSetting.create({ data: { key: BOOTSTRAP_KEY, value: new Date().toISOString() } });
  }, { timeout: 120_000 });

  const total = [...classDocs.values()].reduce((a, b) => a + b, 0);
  console.info(`[learner] amorcé avec ${total} exemples tirés de l'historique, ${tokenRows.length} jetons`);
}
