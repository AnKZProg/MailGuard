import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./data/mailguard.db" });
const db = new PrismaClient({ adapter });

const account = await db.account.create({
  data: {
    provider: "GOOGLE",
    providerAccountId: "dev-seed-1",
    emailAddress: "test@example.com",
    displayName: "Test Account",
    colorToken: "account-3",
    accessTokenEnc: "x",
    refreshTokenEnc: "x",
    tokenExpiresAt: new Date(Date.now() + 3600_000),
    scopes: "dev",
    status: "ACTIVE",
  },
});

const fixtures = [
  { subject: "Votre commande a été expédiée", from: "no-reply@amazon.fr", name: "Amazon.fr", verdict: "LEGITIMATE", score: 0.05, isRead: true },
  { subject: "Votre lettre hebdomadaire", from: "news@legit-newsletter.com", name: "La Gazette", verdict: "NEWSLETTER", score: 0.6, isRead: true },
  { subject: "GRATUIT: gagnez un iPhone maintenant !", from: "promo@dealsdealsdeals.biz", name: null, verdict: "SPAM", score: 0.7, isRead: false },
  { subject: "Vérifiez votre compte — connexion suspecte détectée", from: "support@paypa1.com", name: "PayPal Support", verdict: "PHISHING", score: 0.9, isRead: false },
];

for (const [i, f] of fixtures.entries()) {
  await db.message.create({
    data: {
      accountId: account.id,
      providerMessageId: `dev-${i}`,
      threadId: `thread-${i}`,
      fromAddress: f.from,
      fromDomain: f.from.split("@")[1],
      fromDisplayName: f.name,
      toCount: 1,
      subject: f.subject,
      snippet: "Aperçu du message de test...",
      receivedAt: new Date(Date.now() - i * 3600_000),
      isRead: f.isRead,
      hasAttachments: false,
      providerSpamFlag: f.verdict === "SPAM",
      verdict: f.verdict,
      score: f.score,
      classifiedAt: new Date(),
    },
  });
}

const blockedFixtures = [
  { scope: "ADDRESS", pattern: "promo@dealsdealsdeals.biz" },
  { scope: "DOMAIN", pattern: "spam-mailer.example" },
];

for (const b of blockedFixtures) {
  await db.senderPolicy.create({ data: { scope: b.scope, pattern: b.pattern, verdict: "BLOCK", accountId: account.id } });
}

console.log("Seeded", account.id);
await db.$disconnect();
