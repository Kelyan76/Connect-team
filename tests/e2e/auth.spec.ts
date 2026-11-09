import { expect, test } from '@playwright/test';
import { ACCOUNTS, go, login, logout, PASSWORD } from './helpers';

test('connexion manager puis collaborateur : navigation adaptée au rôle', async ({ page }) => {
  await page.goto('/connexion');

  // Mauvais mot de passe : message clair, pas de jargon technique.
  await page.getByLabel('Adresse e-mail').fill(ACCOUNTS.manager);
  await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('alert')).toContainText('Adresse e-mail ou mot de passe incorrect', { timeout: 90_000 });

  await login(page, ACCOUNTS.manager, 'Camille');
  const nav = page.getByRole('complementary', { name: 'Navigation principale' });
  await expect(nav.getByRole('link', { name: 'Collaborateurs' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Paramètres' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Bonjour Camille' })).toBeVisible();
  await expect(page.getByText('Atteinte des objectifs', { exact: true })).toBeVisible();
  await logout(page);

  await login(page, ACCOUNTS.nadia, 'Nadia');
  await expect(nav.getByRole('link', { name: 'Collaborateurs' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Mes objectifs' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Bonjour Nadia' })).toBeVisible();
  await expect(page.getByText('Mon prochain entretien')).toBeVisible();

  // Route réservée au manager : retour au tableau de bord.
  await go(page, '/equipe');
  await expect(page).toHaveURL(/\/$/);
  await go(page, '/parametres');
  await expect(page).toHaveURL(/\/$/);
});

test('palette de commandes et raccourcis clavier', async ({ page }) => {
  await login(page, ACCOUNTS.manager, 'Camille');
  await page.keyboard.press('Control+k');
  const palette = page.getByRole('dialog');
  await expect(palette).toBeVisible();
  await palette.getByPlaceholder('Rechercher…').fill('Julien');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Julien Mercier');
  await page.keyboard.press('Escape');

  await go(page, '/taches');
  await page.keyboard.press('n');
  await expect(page.getByRole('dialog', { name: 'Nouvelle tâche' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('mot de passe oublié : lien reçu dans la boîte de démonstration', async ({ page }) => {
  await page.goto('/mot-de-passe-oublie');
  await page.getByLabel('Adresse e-mail').fill(ACCOUNTS.julien);
  await page.getByRole('button', { name: 'Envoyer le lien' }).click();
  await page.getByRole('link', { name: 'Ouvrir la boîte mail de démonstration' }).click({ timeout: 90_000 });
  await page.getByRole('link', { name: 'Ouvrir le lien' }).first().click();
  await expect(page.getByRole('heading', { name: 'Choisissez votre mot de passe' })).toBeVisible();
  await page.getByLabel('Nouveau mot de passe').fill('court');
  await page.getByLabel('Confirmation').fill('court');
  await page.getByRole('button', { name: 'Enregistrer et continuer' }).click();
  await expect(page.getByText('Le mot de passe ne respecte pas toutes les règles.')).toBeVisible();
  await page.getByLabel('Nouveau mot de passe').fill(`${PASSWORD}x`);
  await page.getByLabel('Confirmation').fill(`${PASSWORD}x`);
  await page.getByRole('button', { name: 'Enregistrer et continuer' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Bonjour Julien' })).toBeVisible({ timeout: 60_000 });
});
