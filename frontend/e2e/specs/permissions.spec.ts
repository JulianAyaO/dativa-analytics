import { expect, test } from '@playwright/test';
import { loginWithQuickButton } from '../helpers/auth';

test.describe('Permisos de las nuevas rutas', () => {
  test('VIEWER no entra a importar ni a usuarios', async ({ page }) => {
    await loginWithQuickButton(page, 'viewer');
    await expect(
      page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Importar' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Usuarios' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Alertas' }),
    ).toBeVisible();

    await page.goto('/import');
    await expect(page).toHaveURL(/\/dashboards$/);
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/dashboards$/);
    await page.goto('/admin/activity');
    await expect(page).toHaveURL(/\/dashboards$/);
  });

  test('ADMIN consulta el historial de actividad', async ({ page }) => {
    await loginWithQuickButton(page, 'admin');
    await expect(
      page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Actividad' }),
    ).toBeVisible();
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Actividad' }).click();
    await expect(page.getByRole('heading', { name: 'Actividad', level: 1 })).toBeVisible();
  });

  test('ANALYST importa y no administra usuarios', async ({ page }) => {
    await loginWithQuickButton(page, 'analyst');
    await expect(
      page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Importar' }),
    ).toBeVisible();
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Importar' }).click();
    await expect(page.getByRole('heading', { name: 'Importar datos', level: 1 })).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Usuarios' }),
    ).toHaveCount(0);
  });
});
