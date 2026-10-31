import { expect, test } from "@playwright/test";

test("sur téléphone, le menu ouvre la navigation et une page s'y choisit", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const menu = page.getByRole("button", { name: "Ouvrir le menu" });
  await expect(menu).toBeVisible();
  await menu.click();
  await page.locator("#app-sidebar").getByRole("link", { name: /Quarantaine/ }).click();
  await expect(page).toHaveURL(/\/quarantine$/);
  await expect(page.getByRole("heading", { name: "Quarantaine" })).toBeVisible();
  await expect(page.locator("#app-sidebar")).not.toHaveAttribute("data-open", /.*/);
});

test("sur téléphone, un mail ouvert prend tout l'écran avec un retour", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("listbox", { name: "Messages" }).getByRole("option").filter({ hasText: "Réunion de jeudi" }).click();
  await expect(page.getByRole("listbox", { name: "Messages" })).toBeHidden();
  await page.getByRole("link", { name: "Retour à la liste (Échap)" }).click();
  await expect(page.getByRole("listbox", { name: "Messages" })).toBeVisible();
});
