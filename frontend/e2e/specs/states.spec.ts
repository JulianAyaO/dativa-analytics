import { expect, test } from '@playwright/test';
import { loginWithQuickButton } from '../helpers/auth';
import { addWidget, createDashboard, waitForWidgetData } from '../helpers/dashboard';

test.describe('Estados de flujo crítico', () => {
  test('el catálogo vacío no bloquea al analista', async ({ page }) => {
    await loginWithQuickButton(page, 'analyst');
    await expect(page.getByRole('heading', { name: 'Todavía no hay dashboards' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nuevo dashboard' })).toBeEnabled();
  });

  test('un dashboard inexistente muestra vacío y permite volver', async ({ page }) => {
    await loginWithQuickButton(page, 'analyst');
    await page.goto('/dashboards/ausente-e2e');
    await expect(page.getByRole('heading', { name: 'Dashboard no encontrado' })).toBeVisible();
    await page.getByRole('button', { name: 'Volver al catálogo' }).click();
    await expect(page).toHaveURL(/\/dashboards$/);
    await expect(page.getByRole('heading', { name: 'Dashboards', level: 1 })).toBeVisible();
  });

  test('Pedidos en 7 días muestra empty en el widget y el editor sigue usable', async ({ page }) => {
    await loginWithQuickButton(page, 'analyst');
    await createDashboard(page, 'Tablero vacío');
    await addWidget(page, 'KPI', 'Ingresos · Ventas');
    await waitForWidgetData(page, 'Ingresos · Ventas');

    const config = page.getByRole('complementary', { name: 'Configuración del widget' });
    await config.getByLabel('Fuente de datos').selectOption('orders');
    await config.getByLabel('Periodo').selectOption('last_7_days');

    await expect(
      page.getByText('Este widget no tiene datos para la fuente, métrica y periodo actuales.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Añadir widget Ranking' })).toBeEnabled();
  });

  test('el explorador vacío no rompe búsqueda ni filtros', async ({ page }) => {
    await loginWithQuickButton(page, 'analyst');
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Explorador' }).click();
    await page.getByRole('combobox', { name: 'Fuente' }).selectOption('orders');
    await page.getByRole('combobox', { name: 'Fecha' }).selectOption('last_7_days');
    await expect(page.getByRole('heading', { name: 'Sin transacciones' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Buscar' })).toBeEnabled();
    await page.getByRole('button', { name: 'Restablecer' }).click();
    await expect(page.getByRole('table', { name: 'Líneas de pedido del explorador' })).toBeVisible();
  });
});
