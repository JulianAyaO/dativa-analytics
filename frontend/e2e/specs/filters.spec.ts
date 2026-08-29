import { expect, test } from '@playwright/test';
import { loginWithQuickButton } from '../helpers/auth';
import { addWidget, createDashboard, saveDashboard, waitForWidgetData } from '../helpers/dashboard';
import { expectFilterValue, pickFilterValue } from '../helpers/filters';

test.describe('Filtros y drill-through', () => {
  test('los filtros actualizan el KPI y el explorador conserva región y fuente', async ({ page }) => {
    await loginWithQuickButton(page, 'analyst');
    await createDashboard(page, 'Tablero con filtros');
    await addWidget(page, 'KPI', 'Ingresos · Ventas');
    await waitForWidgetData(page, 'Ingresos · Ventas');

    const kpi = page.getByRole('button', { name: 'Ver transacciones en el explorador' });
    const initialValue = (await kpi.innerText()).trim();
    expect(initialValue.length).toBeGreaterThan(0);

    await pickFilterValue(page, 'Regi', 'Caribe');
    await expect(page.getByRole('button', { name: 'Quitar filtro Región: Caribe' })).toBeVisible();
    await expect(kpi).not.toHaveText(initialValue, { timeout: 15_000 });

    await pickFilterValue(page, 'Regi', 'Andina');
    await expect(page.getByRole('button', { name: 'Quitar filtro Región: Andina' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Quitar filtro Región: Caribe' })).toBeVisible();

    await saveDashboard(page);
    await page.getByRole('button', { name: 'Ver', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboards\/[^/]+$/);
    await waitForWidgetData(page, 'Ingresos · Ventas');

    await page.getByRole('button', { name: 'Ver transacciones en el explorador' }).click();
    await expect(page).toHaveURL(/\/explorer/);
    await expect(page.getByRole('heading', { name: 'Explorador de datos', level: 1 })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Fuente' })).toHaveValue('sales');
    await expect(page.getByRole('button', { name: 'Quitar filtro Región: Caribe' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Quitar filtro Región: Andina' })).toBeVisible();
  });

  test('un ranking abre el explorador conservando el vendedor', async ({ page }) => {
    await loginWithQuickButton(page, 'analyst');
    await createDashboard(page, 'Tablero ranking');
    await addWidget(page, 'Ranking', 'Ingresos · Vendedor');
    await waitForWidgetData(page, 'Ingresos · Vendedor');
    await saveDashboard(page);
    await page.getByRole('button', { name: 'Ver', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboards\/[^/]+$/);
    await waitForWidgetData(page, 'Ingresos · Vendedor');

    const ranking = page.getByRole('group', { name: 'Ingresos · Vendedor' });
    const drill = ranking.getByRole('button', { name: /Ver .+ en el explorador/ }).first();
    const label = (await drill.innerText()).replace(/^Ver /, '').replace(/ en el explorador$/, '');
    await drill.evaluate((node) => (node as HTMLButtonElement).click());

    await expect(page).toHaveURL(/\/explorer/);
    await expect(page.getByRole('combobox', { name: 'Fuente' })).toHaveValue('sales');
    await expectFilterValue(page, 'Vendedor', label);
  });
});
