import { expect, test } from '@playwright/test';
import { DEMO_LOGINS, loginWithForm, loginWithQuickButton, type DemoRole } from '../helpers/auth';

test.describe('Login', () => {
  test('entra con el formulario de la cuenta analista', async ({ page }) => {
    await loginWithForm(page, 'analyst');
    await expect(page.getByRole('button', { name: `Cuenta de ${DEMO_LOGINS.analyst.name}` })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Usuarios' })).toHaveCount(0);
  });

  for (const role of ['admin', 'analyst', 'viewer'] as DemoRole[]) {
    test(`inicio rápido como ${DEMO_LOGINS[role].role}`, async ({ page }) => {
      await loginWithQuickButton(page, role);
      await expect(page.getByRole('button', { name: `Cuenta de ${DEMO_LOGINS[role].name}` })).toBeVisible();
    });
  }

  test('no muestra errores de validación al abrir el login', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Dativa/);
    await expect(page.getByText('El correo es obligatorio')).toHaveCount(0);
    await expect(page.getByText('La contraseña es obligatoria')).toHaveCount(0);
  });

  test('el interruptor del login cambia a modo oscuro', async ({ page }) => {
    await page.goto('/login');
    const before = await page.locator('html').getAttribute('data-theme');
    await page.getByRole('switch').click();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', before ?? '');
  });
});
