import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'Cadence-Demo26!';
export const ACCOUNTS = {
  manager: 'camille.lefevre@nebuleo.example',
  nadia: 'ines.moreau@nebuleo.example',
  julien: 'hugo.lambert@nebuleo.example',
} as const;

/** Connexion par le formulaire ; attend la page d'arrivée (tableau de bord ou page demandée avant connexion). */
export async function login(page: Page, email: string, firstName: string) {
  if (!page.url().includes('/connexion')) await page.goto('/connexion');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Connexion' })).toHaveCount(0, { timeout: 90_000 });
  await expect(page.getByRole('button', { name: 'Menu du profil' })).toContainText(firstName, { timeout: 60_000 });
}

/** Déconnexion par le menu du profil (la base embarquée reste en mémoire). */
export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Menu du profil' }).click();
  await page.getByRole('menuitem', { name: 'Se déconnecter' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Connexion' })).toBeVisible();
}

/** Navigation interne sans rechargement (conserve la base en mémoire). */
export async function go(page: Page, path: string) {
  await page.evaluate((p) => {
    history.pushState({}, '', p);
    dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 30_000 });
}
