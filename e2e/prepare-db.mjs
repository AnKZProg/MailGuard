// Rebuilds the end-to-end database from scratch, then starts nothing: the
// Playwright webServer command runs this before `next start`. Refuses to touch
// any database outside e2e/.data, so it can never reset the real one.
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const url = process.env.DATABASE_URL ?? "";
const dbFile = path.resolve(url.replace(/^file:/, ""));
if (!url.startsWith("file:") || !dbFile.includes(`${path.sep}e2e${path.sep}.data${path.sep}`)) {
  throw new Error(`Refus de réinitialiser une base hors de e2e/.data : ${url || "(DATABASE_URL vide)"}`);
}
rmSync(path.dirname(dbFile), { recursive: true, force: true });
// The folder was just removed, so this push only ever creates a fresh, empty schema.
execSync(`npx prisma db push --url "${url}"`, { stdio: "inherit" });

const HOUR = 3600_000;
const DAY = 24 * HOUR;

const INBOX = [
  { subject: "Votre commande a été expédiée", from: "no-reply@amazon.fr", name: "Amazon.fr", verdict: "LEGITIMATE", hoursAgo: 1 },
  { subject: "Réunion de jeudi", from: "claire@studio.example", name: "Claire Martin", verdict: "LEGITIMATE", hoursAgo: 2, isRead: true },
  { subject: "Votre lettre hebdomadaire", from: "news@gazette.example", name: "La Gazette", verdict: "NEWSLETTER", hoursAgo: 30 },
  { subject: "Vérifiez votre compte — connexion suspecte", from: "support@paypa1.example", name: "PayPal Support", verdict: "PHISHING", hoursAgo: 50 },
];

/** Two fake mailboxes with undecryptable tokens, a handful of inbox mails, one quarantined scam. */
async function seed(url) {
  const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
  try {
    const fakeAccount = (n, provider, emailAddress) =>
      db.account.create({
        data: {
          provider,
          providerAccountId: `e2e-${n}`,
          emailAddress,
          displayName: null,
          colorToken: `account-${n}`,
          accessTokenEnc: "not-a-real-token",
          refreshTokenEnc: "not-a-real-token",
          tokenExpiresAt: new Date(Date.now() + 365 * DAY),
          scopes: "e2e",
          status: "ACTIVE",
          lastSyncAt: new Date(Date.now() - HOUR),
        },
      });
    const gmail = await fakeAccount(1, "GOOGLE", "e2e.gmail@example.com");
    await fakeAccount(2, "MICROSOFT", "e2e.outlook@example.com");

    for (const [i, f] of INBOX.entries()) {
      await db.message.create({
        data: {
          accountId: gmail.id,
          providerMessageId: `e2e-${i}`,
          threadId: `e2e-thread-${i}`,
          fromAddress: f.from,
          fromDomain: f.from.split("@")[1],
          fromDisplayName: f.name,
          toCount: 1,
          subject: f.subject,
          snippet: `Aperçu : ${f.subject}`,
          receivedAt: new Date(Date.now() - f.hoursAgo * HOUR),
          isRead: f.isRead ?? false,
          hasAttachments: false,
          providerSpamFlag: false,
          verdict: f.verdict,
          score: f.verdict === "PHISHING" ? 0.9 : 0.05,
          classifiedAt: new Date(),
          state: "INBOX",
        },
      });
    }

    const scam = await db.message.create({
      data: {
        accountId: gmail.id,
        providerMessageId: "e2e-quarantined",
        threadId: "e2e-thread-q",
        fromAddress: "no-reply@norton-renew.example",
        fromDomain: "norton-renew.example",
        fromDisplayName: "NORTON",
        toCount: 1,
        subject: "ALERTE SYSTÈME : PROTECTION INACTIVE",
        snippet: "Votre abonnement a expiré",
        receivedAt: new Date(Date.now() - 3 * DAY),
        isRead: false,
        hasAttachments: false,
        providerSpamFlag: true,
        verdict: "PHISHING",
        score: 1,
        classifiedAt: new Date(),
        state: "QUARANTINED",
      },
    });
    await db.quarantineItem.create({
      data: {
        messageId: scam.id,
        accountId: gmail.id,
        purgeAfter: new Date(Date.now() + 10 * DAY),
        reason: "PHISHING",
        restoreSnapshot: JSON.stringify({ labelIds: ["INBOX"] }),
      },
    });
  } finally {
    await db.$disconnect();
  }
}

await seed(url);
