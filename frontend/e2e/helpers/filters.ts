import { expect, type Page } from '@playwright/test';

export function filterTrigger(page: Page, field: string) {
  return page.getByRole('button', { name: new RegExp(`^${field}`) });
}

export async function pickFilterValue(page: Page, field: string, value: string | RegExp): Promise<void> {
  await filterTrigger(page, field).click();
  await page.getByRole('checkbox', { name: value }).check();
  await page.keyboard.press('Escape');
}

export async function expectFilterValue(page: Page, field: string, value: string): Promise<void> {
  await expect(filterTrigger(page, field)).toContainText(value);
  await expect(page.getByRole('button', { name: new RegExp(`Quitar filtro .+${value}`) })).toBeVisible();
}
