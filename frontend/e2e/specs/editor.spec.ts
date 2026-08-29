import { expect, test } from '@playwright/test';
import { loginWithQuickButton } from '../helpers/auth';
import {
  addWidget,
  createDashboard,
  saveDashboard,
  storedLayout,
  waitForWidgetData,
} from '../helpers/dashboard';

test.describe('Editor de dashboards', () => {
  test('crea, configura, mueve, redimensiona, guarda y persiste tras recargar', async ({ page }) => {
    await loginWithQuickButton(page, 'analyst');
    const id = await createDashboard(page, 'Tablero persistente', 'Flujo crítico del editor');

    await addWidget(page, 'KPI', 'Ingresos · Ventas');
    await waitForWidgetData(page, 'Ingresos · Ventas');
    await expect(page.getByRole('button', { name: 'Ver transacciones en el explorador' })).toBeVisible();

    const config = page.getByRole('complementary', { name: 'Configuración del widget' });
    await config.getByLabel('Título').fill('KPI E2E');
    await expect(page.getByRole('group', { name: 'KPI E2E' })).toBeVisible();
    await config.getByLabel('Métrica').selectOption('units');

    const widget = page.getByRole('group', { name: 'KPI E2E' });
    const item = page.locator('gridster-item').filter({ has: widget });
    const canvas = page.locator('gridster');
    const handle = widget.getByRole('button', { name: 'Mover KPI E2E' });
    const beforeBox = await item.boundingBox();
    expect(beforeBox).toBeTruthy();

    await handle.dragTo(canvas, { targetPosition: { x: 420, y: 140 } });
    await item.locator('.gridster-item-resizable-handler').last().dragTo(canvas, {
      force: true,
      targetPosition: { x: 560, y: 280 },
    });

    await expect
      .poll(async () => {
        const afterBox = await item.boundingBox();
        if (!afterBox || !beforeBox) {
          return false;
        }
        return (
          Math.abs(afterBox.x - beforeBox.x) > 24 ||
          Math.abs(afterBox.y - beforeBox.y) > 24 ||
          Math.abs(afterBox.width - beforeBox.width) > 24 ||
          Math.abs(afterBox.height - beforeBox.height) > 24
        );
      })
      .toBeTruthy();

    await expect(page.getByText('Sin guardar', { exact: true })).toBeVisible();
    await saveDashboard(page);

    const saved = await storedLayout(page, id, 'KPI E2E');
    expect(saved).toBeTruthy();
    expect(
      saved!.x !== 0 || saved!.y !== 0 || saved!.cols !== 3 || saved!.rows !== 2,
    ).toBeTruthy();

    await page.reload();
    await expect(page.getByLabel('Nombre del dashboard')).toHaveValue('Tablero persistente');
    await expect(page.getByRole('group', { name: 'KPI E2E' })).toBeVisible();
    await waitForWidgetData(page, 'KPI E2E');

    const restored = await storedLayout(page, id, 'KPI E2E');
    expect(restored).toEqual(saved);
  });

  test('descarta cambios no guardados', async ({ page }) => {
    await loginWithQuickButton(page, 'analyst');
    await createDashboard(page, 'Tablero descartable');
    await page.getByLabel('Nombre del dashboard').fill('Nombre temporal');
    await expect(page.getByText('Sin guardar', { exact: true })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Descartar' }).click();

    await expect(page.getByLabel('Nombre del dashboard')).toHaveValue('Tablero descartable');
    await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeDisabled();
  });
});
