import { expect, test } from '@playwright/test';
import { loginWithQuickButton, logout, waitForCatalog } from '../helpers/auth';

test.describe('Identidad', () => {
  test('registro crea un visualizador sin edición', async ({ page }) => {
    const email = `viewer.${Date.now()}@dativa.app`;
    await page.goto('/register');
    await expect(page).toHaveTitle(/Dativa/);
    await page.getByRole('textbox', { name: 'Nombre' }).fill('Cuenta Nueva');
    await page.getByRole('textbox', { name: 'Correo' }).fill(email);
    await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill('Clave1234');
    await page.getByRole('textbox', { name: 'Confirmar contraseña' }).fill('Clave1234');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page).toHaveURL(/\/dashboards/);
    await waitForCatalog(page);
    await expect(page.getByRole('button', { name: 'Nuevo dashboard' })).toHaveCount(0);
    await expect(
      page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Usuarios' }),
    ).toHaveCount(0);
  });

  test('ADMIN crea un analista y ese usuario entra', async ({ page }) => {
    const email = `analyst.${Date.now()}@dativa.app`;
    await loginWithQuickButton(page, 'admin');
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Usuarios' }).click();
    await expect(page.getByRole('heading', { name: 'Usuarios', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'Nuevo usuario' }).click();
    await page.getByRole('textbox', { name: 'Nombre' }).fill('Analista Nuevo');
    await page.getByRole('textbox', { name: 'Correo' }).fill(email);
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('Clave1234');
    await page.getByRole('combobox', { name: 'Rol de la cuenta' }).selectOption('ANALYST');
    await page.getByRole('button', { name: 'Crear', exact: true }).click();
    await expect(page.getByText('Se creó Analista Nuevo.')).toBeVisible();

    await logout(page);
    await page.getByRole('textbox', { name: 'Correo' }).fill(email);
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('Clave1234');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboards/);
    await waitForCatalog(page);
    await expect(page.getByRole('button', { name: 'Nuevo dashboard' })).toBeVisible();
    await expect(page.getByRole('button', { name: `Cuenta de Analista Nuevo` })).toBeVisible();
  });

  test('cuenta actualiza el nombre visible', async ({ page }) => {
    await loginWithQuickButton(page, 'viewer');
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Ajustes' }).click();
    await page.getByRole('textbox', { name: 'Nombre visible' }).fill('Marta Actualizada');
    await page.getByRole('button', { name: 'Guardar perfil' }).click();
    await expect(page.getByText('Perfil actualizado.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cuenta de Marta Actualizada' })).toBeVisible();
    await expect(page.getByText(/Rol actual/)).toContainText('Visualizador');
  });
});
