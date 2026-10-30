import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { loadShellStats } from "@/lib/queries/shell-stats";
import type { ThemePreference } from "@/lib/theme";

type Props = {
  children: ReactNode;
  theme: ThemePreference;
};

export async function AppShell({ children, theme }: Props) {
  const stats = await loadShellStats();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface-0 text-text-primary">
      <Sidebar stats={stats} theme={theme} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
