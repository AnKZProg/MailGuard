import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { db } from "@/lib/db";
import { isShadowModeEnabled } from "@/lib/settings/app-settings";

type Props = {
  children: ReactNode;
};

export async function AppShell({ children }: Props) {
  const [criticalFindingsCount, shadowModeEnabled] = await Promise.all([
    db.securityFinding.count({ where: { resolvedAt: null, severity: "CRITICAL", acknowledgedAt: null } }),
    isShadowModeEnabled(),
  ]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface-0 text-text-primary">
      <Sidebar criticalFindingsCount={criticalFindingsCount} shadowModeEnabled={shadowModeEnabled} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
