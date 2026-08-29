import { expect, test } from '@playwright/test';
import { loginWithQuickButton } from '../helpers/auth';

test.describe('Explorador', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithQuickButton(page, 'analyst');
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Explorador' }).click();
    await expect(page).toHaveURL(/\/explorer/);
    await expect(page.getByRole('heading', { name: 'Explorador de datos', level: 1 })).toBeVisible();
    await expect(page.getByRole('status', { name: 'Cargando transacciones' })).toHaveCount(0);
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('busca, filtra, ordena, pagina y exporta CSV', async ({ page }) => {
    const dateHeader = page.getByRole('columnheader', { name: /Fecha/ });
    await expect(dateHeader).toHaveAttribute('aria-sort', 'descending');
    await dateHeader.getByRole('button', { name: /Ordenar por Fecha|Fecha/ }).click();
    await expect(dateHeader).toHaveAttribute('aria-sort', 'ascending');

    const pageLabel = page.getByText(/gina 1 de \d+/);
    await expect(pageLabel).toBeVisible();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await expect(page.getByText(/gina 2 de \d+/)).toBeVisible();
    await page.getByRole('button', { name: 'Anterior' }).click();
    await expect(pageLabel).toBeVisible();

    const range = page.locator('.dtv-explorer__range');
    await expect(range).toContainText(/ de /);
    const initialRange = (await range.innerText()).trim();
    await page.getByRole('searchbox', { name: 'Buscar' }).fill('Caribe');
    await expect(range).not.toHaveText(initialRange);
    await expect(page.getByRole('table')).toContainText('Caribe');
    await page.getByRole('searchbox', { name: 'Buscar' }).fill('');
    await expect(range).toHaveText(initialRange);

    const amazon = page.getByRole('checkbox', { name: /Amazon/ });
    await page.getByRole('button', { name: /^Regi/ }).click();
    await expect(amazon).toBeVisible();
    await amazon.check();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: /Quitar filtro Regi.*Amazon/ })).toBeVisible();
    await expect(page.getByRole('table')).toContainText(/Amazon/);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('transacciones.csv');

    const excelDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Excel' }).click();
    const excel = await excelDownload;
    expect(excel.suggestedFilename()).toBe('transacciones.xlsx');
  });
});
