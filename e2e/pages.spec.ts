import { expect, test } from "@playwright/test";

test("la quarantaine montre le mail retenu et sa date de purge", async ({ page }) => {
  await page.goto("/quarantine");
  await expect(page.getByRole("heading", { name: "Quarantaine" })).toBeVisible();
  await expect(page.getByText("ALERTE SYSTÈME : PROTECTION INACTIVE")).toBeVisible();
  await expect(page.getByText(/purge dans 1[01] jours/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Restaurer" })).toBeVisible();
});

test("la déconnexion d'un compte demande une confirmation, et Annuler ne supprime rien", async ({ page }) => {
  await page.goto("/accounts");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Déconnecter e2e.outlook@example.com" }).click();
  await expect(page.getByRole("button", { name: "Confirmer la déconnexion de e2e.outlook@example.com" })).toBeFocused();
  await page.getByRole("button", { name: "Annuler" }).click();
  await page.reload();
  await expect(page.getByText("e2e.outlook@example.com").first()).toBeVisible();
});

test("la page Comptes affiche l'état de la sauvegarde", async ({ page }) => {
  await page.goto("/accounts");
  await expect(page.getByText("Sauvegarde de la base")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sauvegarder maintenant" })).toBeVisible();
});

test("la page Sécurité liste les vérifications et ce qui ne peut pas l'être", async ({ page }) => {
  await page.goto("/security");
  await expect(page.getByText("Aucun réglage suspect sur tes 2 comptes.")).toBeVisible();
  await expect(page.getByText("Adresses d'envoi et de réponse")).toBeVisible();
  await expect(page.getByText(/Accès délégués : Google ne les montre/)).toBeVisible();
});

test("le thème choisi survit au rechargement", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("radio", { name: "Thème sombre" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("radio", { name: "Thème du système" }).click();
});
