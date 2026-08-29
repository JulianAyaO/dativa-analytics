import { expect, test } from '@playwright/test';
import { loginWithQuickButton, logout } from '../helpers/auth';

test.describe('Alertas y avisos', () => {
  test('ANALYST crea una alerta, dispara un aviso y VIEWER solo consulta', async ({ page }) => {
    const name = `Ingresos altos ${Date.now()}`;
    await loginWithQuickButton(page, 'analyst');
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Alertas' }).click();
    await expect(page.getByRole('heading', { name: 'Alertas', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'Nueva alerta' }).click();
    await page.getByRole('textbox', { name: 'Nombre' }).fill(name);
    await page.getByRole('textbox', { name: 'Valor objetivo' }).fill('0');
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByRole('heading', { name })).toBeVisible();

    await page.getByRole('button', { name: /Notificaciones/ }).click();
    await expect(page.getByRole('heading', { name: 'Notificaciones', level: 2 })).toBeVisible();
    await expect(page.locator('#centro-notificaciones').getByText(name)).toBeVisible();

    await logout(page);
    await loginWithQuickButton(page, 'viewer');
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Alertas' }).click();
    await expect(page.getByRole('heading', { name })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nueva alerta' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0);
  });
});
