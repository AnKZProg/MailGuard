import { db } from "@/lib/db";
import { getValidAccessToken } from "@/lib/providers/token-manager";
import { auditGoogleAccount, GOOGLE_AUDIT_KINDS } from "@/lib/security/google-audit";
import { auditMicrosoftAccount, MICROSOFT_AUDIT_KINDS } from "@/lib/security/microsoft-audit";
import { reconcileFindings } from "@/lib/security/findings";

export async function runSecurityAudit(accountId: string, provider: "GOOGLE" | "MICROSOFT"): Promise<void> {
  const accessToken = await getValidAccessToken(accountId);
  const { emailAddress } = await db.account.findUniqueOrThrow({ where: { id: accountId }, select: { emailAddress: true } });

  if (provider === "GOOGLE") {
    const findings = await auditGoogleAccount(accessToken, emailAddress);
    await reconcileFindings(accountId, [...GOOGLE_AUDIT_KINDS], findings);
  } else {
    const findings = await auditMicrosoftAccount(accessToken, emailAddress);
    await reconcileFindings(accountId, [...MICROSOFT_AUDIT_KINDS], findings);
  }
}
