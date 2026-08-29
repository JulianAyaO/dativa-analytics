import { expect, test } from '@playwright/test';
import { loginWithQuickButton, logout } from '../helpers/auth';
import { createDashboard } from '../helpers/dashboard';

test.describe('Acceso por rol', () => {
  test('ADMIN ve administración y puede editar', async ({ page }) => {
    await loginWithQuickButton(page, 'admin');
    await expect(
      page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Usuarios' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nuevo dashboard' })).toBeVisible();

    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Usuarios' }).click();
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.getByRole('heading', { name: 'Usuarios', level: 1 })).toBeVisible();
  });

  test('ANALYST edita dashboards y no entra a usuarios', async ({ page }) => {
    await loginWithQuickButton(page, 'analyst');
    await expect(page.getByRole('button', { name: 'Nuevo dashboard' })).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Usuarios' }),
    ).toHaveCount(0);

    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/dashboards$/);
  });

  test('VIEWER abre dashboards y no puede editarlos', async ({ page }) => {
    await loginWithQuickButton(page, 'analyst');
    const id = await createDashboard(page, 'Tablero para visualizador');
    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page).toHaveURL(/\/dashboards$/);
    await logout(page);

    await loginWithQuickButton(page, 'viewer');
    await expect(page.getByRole('button', { name: 'Nuevo dashboard' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Editar Tablero para visualizador' })).toHaveCount(0);
    await expect(
      page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Usuarios' }),
    ).toHaveCount(0);

    await page.getByRole('button', { name: 'Abrir Tablero para visualizador' }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboards/${id}$`));
    await expect(page.getByRole('heading', { name: 'Tablero para visualizador', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0);

    await page.goto(`/dashboards/${id}/edit`);
    await expect(page).toHaveURL(/\/dashboards$/);
  });
});
