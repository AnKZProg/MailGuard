export const THEME_COOKIE = "mailguard_theme";
export type ThemePreference = "system" | "light" | "dark";

export function parseTheme(value: string | undefined): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}
