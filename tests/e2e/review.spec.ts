import { expect, test } from '@playwright/test';
import { ACCOUNTS, go, login, logout } from './helpers';

const NADIA_REVIEW = '/entretiens/66666666-0000-4000-8000-000000000142';

test('préparation en deux temps, clôture et signature d’un entretien', async ({ page }) => {
  // 1. La collaboratrice prépare sa partie.
  await login(page, ACCOUNTS.nadia, 'Nadia');
  await go(page, NADIA_REVIEW);
  await expect(page.getByRole('tab', { name: 'Ma préparation' })).toHaveAttribute('data-state', 'active');
  await page.getByLabel('Quelles sont vos réussites depuis notre dernier échange ?').fill('Réception de la cellule Plasturgie sans réserve.');
  await page.getByLabel('Quelles difficultés ou quels blocages rencontrez-vous ?').click();
  await page.getByRole('radio', { name: '5' }).first().click();
  await expect(page.getByText(/2 réponses sur 5/)).toBeVisible();
  await page.getByRole('button', { name: 'Valider ma préparation' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Valider' }).click();
  await expect(page.getByText('Préparation validée').first()).toBeVisible();
  // Avant la préparation du manager, la vue côte à côte reste fermée pour elle.
  await page.getByRole('tab', { name: 'Vue côte à côte' }).click();
  await expect(page.getByText('Vue côte à côte pas encore disponible')).toBeVisible();
  await logout(page);

  // 2. Le manager voit la préparation validée, prépare la sienne et observe l'écart.
  await login(page, ACCOUNTS.manager, 'Camille');
  await go(page, NADIA_REVIEW);
  await page.getByRole('tab', { name: 'Ma préparation' }).click();
  await page.getByRole('radio', { name: '2' }).first().click();
  await page.getByRole('button', { name: 'Valider ma préparation' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Valider' }).click();
  await page.getByRole('tab', { name: 'Vue côte à côte' }).click();
  await expect(page.getByText('Réception de la cellule Plasturgie sans réserve.')).toBeVisible();
  await expect(page.getByText(/écart.* d’appréciation à discuter/)).toBeVisible();

  // 3. Compte-rendu, plan d'action, clôture et signature du manager.
  await page.getByRole('tab', { name: 'Compte-rendu' }).click();
  await page.getByLabel('Synthèse partagée').fill('Charge à rééquilibrer en décembre avec Thomas.');
  await page.getByLabel('Nouvelle action').fill('Planifier le renfort de Thomas sur la L3');
  await page.getByRole('button', { name: 'Ajouter' }).click();
  await expect(page.getByText('Planifier le renfort de Thomas sur la L3')).toBeVisible();
  await page.getByRole('button', { name: 'Clore l’entretien' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Clore l’entretien' }).click();
  await page.getByRole('button', { name: 'Signer' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Signer' }).click();
  await expect(page.getByText(/Signé le/)).toHaveCount(1);
  await logout(page);

  // 4. La collaboratrice signe à son tour : le compte-rendu est figé.
  await login(page, ACCOUNTS.nadia, 'Nadia');
  await go(page, NADIA_REVIEW);
  await expect(page.getByText('Charge à rééquilibrer en décembre avec Thomas.')).toBeVisible();
  await page.getByRole('button', { name: 'Signer' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Signer' }).click();
  await expect(page.getByText(/Signé le/)).toHaveCount(2);
  await expect(page.getByText('Compte-rendu signé par les deux parties')).toBeVisible();
});
