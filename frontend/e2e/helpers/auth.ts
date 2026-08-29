import { expect, type Page } from '@playwright/test';

export type DemoRole = 'admin' | 'analyst' | 'viewer';

export const DEMO_LOGINS: Record<
  DemoRole,
  { email: string; name: string; password: string; quickLabel: string; role: string }
> = {
  admin: {
    email: 'admin@dativa.app',
    name: 'Ana Admin',
    password: 'Dativa123!',
    quickLabel: 'Entrar como Administrador (admin@dativa.app)',
    role: 'ADMIN',
  },
  analyst: {
    email: 'analyst@dativa.app',
    name: 'Luis Analista',
    password: 'Dativa123!',
    quickLabel: 'Entrar como Analista (analyst@dativa.app)',
    role: 'ANALYST',
  },
  viewer: {
    email: 'viewer@dativa.app',
    name: 'Marta Visualizadora',
    password: 'Dativa123!',
    quickLabel: 'Entrar como Visualizador (viewer@dativa.app)',
    role: 'VIEWER',
  },
};

export async function openLogin(page: Page): Promise<void> {
  await page.goto('/login');
  await expect(page).toHaveTitle(/Dativa/);
  await expect(page.getByRole('heading', { name: 'Dativa' })).toBeVisible();
}

export async function loginWithQuickButton(page: Page, role: DemoRole): Promise<void> {
  await openLogin(page);
  await page.getByRole('button', { name: DEMO_LOGINS[role].quickLabel }).click();
  await expect(page).toHaveURL(/\/dashboards/);
  await waitForCatalog(page);
}

export async function loginWithForm(page: Page, role: DemoRole): Promise<void> {
  const account = DEMO_LOGINS[role];
  await openLogin(page);
  await page.getByRole('textbox', { name: 'Correo' }).fill(account.email);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(account.password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboards/);
  await waitForCatalog(page);
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Cuenta de / }).click();
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login/);
}

export async function waitForCatalog(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Dashboards', level: 1 })).toBeVisible();
  await expect(page.getByRole('status', { name: 'Cargando dashboards' })).toHaveCount(0);
}
