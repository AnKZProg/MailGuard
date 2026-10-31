import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { ShellFrame } from "./ShellFrame";
import { loadShellStats } from "@/lib/queries/shell-stats";
import type { ThemePreference } from "@/lib/theme";

type Props = {
  children: ReactNode;
  theme: ThemePreference;
};

export async function AppShell({ children, theme }: Props) {
  const stats = await loadShellStats();

  return (
    <ShellFrame sidebar={<Sidebar stats={stats} theme={theme} />}>{children}</ShellFrame>
  );
}
