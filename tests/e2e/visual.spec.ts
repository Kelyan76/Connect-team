import { mkdirSync } from 'node:fs';
import { test, type Page } from '@playwright/test';
import { ACCOUNTS, go, login, logout } from './helpers';

/**
 * Revue visuelle : chaque écran en clair et en sombre, en desktop (1440×900) et en tablette (820×1180).
 * Les captures sont écrites dans screenshots/<rôle>/ pour examen.
 */
const MANAGER_ROUTES: [string, string][] = [
  ['tableau-de-bord', '/'],
  ['alertes', '/alertes'],
  ['rapports', '/rapports'],
  ['equipe', '/equipe'],
  ['fiche', '/equipe/11111111-0000-4000-8000-000000000006'],
  ['entretiens', '/entretiens'],
  ['entretien', '/entretiens/66666666-0000-4000-8000-000000000043'],
  ['trames', '/entretiens/trames'],
  ['objectifs', '/objectifs'],
  ['competences', '/competences'],
  ['feedbacks', '/feedbacks'],
  ['meteo', '/meteo'],
  ['taches', '/taches'],
  ['charge', '/plan-de-charge'],
  ['absences', '/absences'],
  ['reunions', '/reunions'],
  ['delegation', '/delegation'],
  ['parametres', '/parametres'],
];
const COLLAB_ROUTES: [string, string][] = [
  ['tableau-de-bord', '/'],
  ['entretiens', '/entretiens'],
  ['preparation', '/entretiens/66666666-0000-4000-8000-000000000042'],
  ['objectifs', '/objectifs'],
  ['competences', '/competences'],
  ['meteo', '/meteo'],
  ['taches', '/taches'],
  ['absences', '/absences'],
];
const SIZES = { desktop: { width: 1440, height: 900 }, tablette: { width: 820, height: 1180 } };

async function shoot(page: Page, role: string, routes: [string, string][]) {
  mkdirSync(`screenshots/${role}`, { recursive: true });
  for (const [name, path] of routes) {
    await go(page, path);
    await page.waitForTimeout(700);
    for (const [size, viewport] of Object.entries(SIZES)) {
      await page.setViewportSize(viewport);
      for (const theme of ['clair', 'sombre'] as const) {
        await page.evaluate((t) => document.documentElement.classList.toggle('dark', t === 'sombre'), theme);
        await page.waitForTimeout(150);
        await page.screenshot({ path: `screenshots/${role}/${name}-${size}-${theme}.png`, fullPage: false });
      }
    }
    await page.setViewportSize(SIZES.desktop);
  }
}

test('captures des écrans', async ({ page }) => {
  test.setTimeout(900_000);
  await page.goto('/connexion');
  mkdirSync('screenshots/public', { recursive: true });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'screenshots/public/connexion-desktop-clair.png' });
  await login(page, ACCOUNTS.manager, 'Claire');
  await shoot(page, 'manager', MANAGER_ROUTES);
  await logout(page);
  await login(page, ACCOUNTS.nadia, 'Nadia');
  await shoot(page, 'collaborateur', COLLAB_ROUTES);
});
