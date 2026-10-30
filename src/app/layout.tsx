import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import { AppShell } from "@/components/layout/AppShell";
import { CommandPalette } from "@/components/layout/CommandPalette";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MailGuard",
  description: "Tri, quarantaine et audit de sécurité pour toutes tes boîtes mail, en local.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${mono.variable} h-full`}
      data-theme={theme === "system" ? undefined : theme}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <AppShell theme={theme}>{children}</AppShell>
        <CommandPalette />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--surface-1)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-default)",
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}
