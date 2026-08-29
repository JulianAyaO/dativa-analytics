import { expect, type Page } from '@playwright/test';

export async function createDashboard(page: Page, name: string, description = ''): Promise<string> {
  await page.getByRole('button', { name: 'Nuevo dashboard' }).click();
  await page.getByLabel('Nombre').fill(name);
  if (description) {
    await page.getByLabel('Descripción').fill(description);
  }
  await page.getByRole('button', { name: 'Crear y editar' }).click();
  await expect(page).toHaveURL(/\/dashboards\/[^/]+\/edit/);
  const id = page.url().match(/\/dashboards\/([^/]+)\/edit/)?.[1];
  if (!id) {
    throw new Error('No se pudo leer el id del dashboard creado.');
  }
  await expect(page.getByLabel('Nombre del dashboard')).toHaveValue(name);
  return id;
}

export async function addWidget(page: Page, typeLabel: string, title: string): Promise<void> {
  await page
    .getByRole('region', { name: 'Paleta de widgets' })
    .getByRole('button', { name: `Añadir widget ${typeLabel}` })
    .click();
  await expect(page.getByRole('group', { name: title })).toBeVisible();
}

export async function waitForWidgetData(page: Page, title: string): Promise<void> {
  const widget = page.getByRole('group', { name: title });
  await expect(widget.getByRole('status', { name: 'Cargando datos' })).toHaveCount(0);
}

export async function saveDashboard(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Guardado', { exact: true })).toBeVisible();
}

export async function storedLayout(
  page: Page,
  dashboardId: string,
  widgetTitle: string,
): Promise<{ x: number; y: number; cols: number; rows: number } | null> {
  return page.evaluate(
    ({ id, title }) => {
      const raw = localStorage.getItem('dativa.dashboards');
      if (!raw) {
        return null;
      }
      const dashboards = JSON.parse(raw) as Array<{
        id: string;
        widgets: Array<{ title: string; layout: { x: number; y: number; cols: number; rows: number } }>;
      }>;
      const dashboard = dashboards.find((item) => item.id === id);
      return dashboard?.widgets.find((widget) => widget.title === title)?.layout ?? null;
    },
    { id: dashboardId, title: widgetTitle },
  );
}
