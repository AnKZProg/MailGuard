"use client";

import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { THEME_COOKIE, type ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "Thème du système", icon: Monitor },
  { value: "light", label: "Thème clair", icon: Sun },
  { value: "dark", label: "Thème sombre", icon: Moon },
];

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** The cookie lets the server render the right theme on the next load (no flash); the attribute applies it now. */
function applyTheme(value: ThemePreference): void {
  document.cookie = `${THEME_COOKIE}=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
  if (value === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", value);
}

export function ThemeToggle({ initial }: { initial: ThemePreference }) {
  const [theme, setTheme] = useState(initial);

  function choose(value: ThemePreference) {
    setTheme(value);
    applyTheme(value);
  }

  return (
    <div role="radiogroup" aria-label="Thème" className="flex items-center gap-0.5 rounded-md border border-border-subtle bg-surface-0 p-0.5">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => choose(value)}
          className={cn(
            "flex h-6 w-7 items-center justify-center rounded transition-colors",
            theme === value ? "bg-surface-2 text-text-primary" : "text-text-tertiary hover:text-text-secondary",
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      ))}
    </div>
  );
}
