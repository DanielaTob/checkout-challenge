import { test as base, expect, type Page } from '@playwright/test';
import { mockApi, type MockApi } from './mockApi';

export const VISA_APPROVED = '4242424242424242';
export const VISA_DECLINED = '4111111111111111';
const CVC = '123';

/**
 * Every test gets a fresh mocked API (auto: even if it doesn't ask for `api`) and fails on
 * console errors or uncaught exceptions (AC-007-05).
 */
export const test = base.extend<{ api: MockApi }>({
  api: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(`console: ${m.text()}`);
      });
      await use(await mockApi(page));
      expect(errors, 'no console errors').toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

export async function openShop(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Tienda Demo' })).toBeVisible();
}

export const productCard = (page: Page, name: string) => page.getByRole('article', { name });

export async function startCheckout(page: Page, product: string) {
  await productCard(page, product).getByRole('button', { name: 'Pay with credit card' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

export async function fillCard(page: Page, number: string) {
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Número de tarjeta').pressSequentially(number);
  await dialog.getByLabel('Vencimiento (MM/AA)').pressSequentially('0829');
  await dialog.getByLabel('CVC').pressSequentially(CVC);
  await dialog.getByLabel('Nombre en la tarjeta').fill('Jose Perez');
}

export const DELIVERY = {
  'Nombre completo': 'José Pérez',
  Email: 'jose@example.com',
  Teléfono: '3001234567',
  Dirección: 'Calle 10 # 20-30',
  Ciudad: 'Medellín',
  Departamento: 'Antioquia',
  'Código postal': '050021',
} as const;

export async function fillDelivery(page: Page) {
  const dialog = page.getByRole('dialog');
  for (const [label, value] of Object.entries(DELIVERY)) {
    await dialog.getByLabel(label, { exact: true }).fill(value);
  }
}

export async function continueToSummary(page: Page) {
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('Tarifa base')).toBeVisible();
  await expect(page.getByText('Envío', { exact: true })).toBeVisible();
}

export const payButton = (page: Page) => page.getByRole('button', { name: /^Pagar \$/ });

/** AC-007-05: nothing wider than the 375 px viewport. */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);
}

/** AC-007-05: the full card number and the CVC never reach localStorage. */
export async function expectNoCardInStorage(page: Page) {
  const stored = await page.evaluate(() =>
    Object.keys(localStorage)
      .map((k) => `${k}=${localStorage.getItem(k) ?? ''}`)
      .join('\n'),
  );
  expect(stored).not.toContain(VISA_APPROVED);
  expect(stored).not.toContain(VISA_DECLINED);
  expect(stored).not.toMatch(/cvc/i);
}
