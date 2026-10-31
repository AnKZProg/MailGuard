import { expect, test } from "@playwright/test";

type Page = import("@playwright/test").Page;

/** Server HTML shows up before React attaches the shortcuts: wait for the client bundle before typing. */
async function openInbox(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

const rows = (page: Page) => page.getByRole("listbox", { name: "Messages" }).getByRole("option");

test.describe("boîte unifiée", () => {
  test("liste les mails par date avec le nombre de non lus", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Boîte unifiée" })).toBeVisible();
    await expect(page.getByText("3 non lus")).toBeVisible();
    await expect(rows(page)).toHaveCount(4);
    await expect(page.getByText("Aujourd'hui", { exact: true })).toBeVisible();
  });

  test("ouvre un mail au clic et le referme avec Échap", async ({ page }) => {
    await page.goto("/");
    await rows(page).filter({ hasText: "Réunion de jeudi" }).click();
    const viewer = page.getByRole("region", { name: "Lecture du message" });
    await expect(viewer.getByRole("heading", { name: "Réunion de jeudi" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(viewer).toBeHidden();
  });

  test("navigue au clavier : j pour descendre, Entrée pour ouvrir", async ({ page }) => {
    await openInbox(page);
    await expect(rows(page)).toHaveCount(4);
    await page.keyboard.press("j");
    await page.keyboard.press("j");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/open=/);
    await expect(page.getByRole("region", { name: "Lecture du message" }).getByRole("heading", { level: 2 })).toHaveText(
      "Réunion de jeudi",
    );
  });

  test("filtre par verdict", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Filtrer par verdict" }).getByRole("link", { name: /^Phishing/ }).click();
    await expect(page).toHaveURL(/verdict=PHISHING/);
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText("Vérifiez votre compte");
  });

  test("recherche par expéditeur ou sujet", async ({ page }) => {
    await openInbox(page);
    await page.keyboard.press("/");
    await page.keyboard.type("gazette");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/q=gazette/);
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText("La Gazette");
  });

  test("affiche l'aide des raccourcis avec ?", async ({ page }) => {
    await openInbox(page);
    await expect(rows(page)).toHaveCount(4);
    await page.keyboard.press("?");
    await expect(page.getByRole("dialog", { name: "Raccourcis clavier" })).toBeVisible();
  });
});
