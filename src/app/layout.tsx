import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { AutoSync } from "@/components/mail/AutoSync";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} ${mono.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
        <CommandPalette />
        <AutoSync />
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
