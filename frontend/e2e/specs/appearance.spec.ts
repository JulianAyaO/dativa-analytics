import { expect, test } from '@playwright/test';
import { loginWithQuickButton } from '../helpers/auth';

test.describe('Apariencia', () => {
  test('cambia el tema oscuro, claro y de sistema', async ({ page }) => {
    await loginWithQuickButton(page, 'analyst');
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Ajustes' }).click();
    await expect(page.getByRole('heading', { name: 'Ajustes', level: 1 })).toBeVisible();

    await page.getByRole('radio', { name: 'Oscuro', exact: true }).check({ force: true });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('radio', { name: 'Claro', exact: true }).check({ force: true });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.getByRole('radio', { name: 'Sistema', exact: true }).check({ force: true });
    await expect(page.locator('html')).toHaveAttribute('data-theme', /light|dark/);
  });

  test('el interruptor del shell cambia el tema de toda la app', async ({ page }) => {
    await loginWithQuickButton(page, 'analyst');
    const before = await page.locator('html').getAttribute('data-theme');
    await page.getByRole('switch').click();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', before ?? '');
    await page.getByRole('switch').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', before ?? '');
  });
});
