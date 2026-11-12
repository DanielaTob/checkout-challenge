import type { Page } from '@playwright/test';
import { HEADPHONES } from './mockApi';
import {
  DELIVERY,
  VISA_APPROVED,
  VISA_DECLINED,
  continueToSummary,
  expect,
  fillCard,
  fillDelivery,
  openShop,
  payButton,
  startCheckout,
  test,
} from './fixtures';

const persisted = (page: Page) =>
  page.evaluate(() =>
    Object.keys(localStorage)
      .map((k) => `${k}=${localStorage.getItem(k) ?? ''}`)
      .join('\n'),
  );

/** redux-persist writes asynchronously: wait until localStorage satisfies the check. */
const expectPersisted = (page: Page, check: (stored: string) => void) =>
  expect(async () => check(await persisted(page))).toPass({ timeout: 5000 });

async function payWith(page: Page, card: string) {
  await openShop(page);
  await startCheckout(page, HEADPHONES.name);
  await fillCard(page, card);
  await fillDelivery(page);
  await continueToSummary(page);
  await payButton(page).click();
}

async function expectEmptyModal(page: Page) {
  await startCheckout(page, HEADPHONES.name);
  const dialog = page.getByRole('dialog');
  for (const label of [...Object.keys(DELIVERY), 'Número de tarjeta', 'CVC', 'Nombre en la tarjeta'])
    await expect(dialog.getByLabel(label, { exact: true })).toHaveValue('');
}

test.describe('Clearing the checkout after a purchase (spec 011)', () => {
  test('AC-011-02 AC-011-03 after an approved purchase, localStorage keeps no delivery or transaction and the next purchase starts empty, also after a reload', async ({ page }) => {
    await payWith(page, VISA_APPROVED);
    await expect(page.getByRole('heading', { name: '¡Pago aprobado!' })).toBeVisible();
    await expectPersisted(page, (s) => expect(s).toContain(DELIVERY['Nombre completo']));

    await page.getByRole('button', { name: 'Volver a la tienda' }).click();
    await expectPersisted(page, (s) => {
      for (const value of Object.values(DELIVERY)) expect(s).not.toContain(value);
      expect(s).not.toContain('CHK-E2E-000001');
      expect(s).not.toContain('4242');
      expect(s).not.toContain('VISA');
    });
    await expectEmptyModal(page);

    await page.reload();
    await expect(page.getByRole('dialog')).toBeVisible(); // the open modal is restored (spec 005)…
    await page.getByRole('button', { name: /Cerrar/ }).click();
    await expectEmptyModal(page); // …and still has nothing from the approved purchase
  });

  test('AC-011-04 after a declined payment, Intentar de nuevo opens the modal with the delivery data and an empty card', async ({ page }) => {
    await payWith(page, VISA_DECLINED);
    await expect(page.getByRole('heading', { name: 'Pago rechazado' })).toBeVisible();
    await page.getByRole('button', { name: 'Intentar de nuevo' }).click();
    const dialog = page.getByRole('dialog');
    for (const [label, value] of Object.entries(DELIVERY))
      await expect(dialog.getByLabel(label, { exact: true })).toHaveValue(value);
    await expect(dialog.getByLabel('Número de tarjeta')).toHaveValue('');
    await expect(dialog.getByLabel('CVC')).toHaveValue('');
  });

  test('AC-011-05 after a declined payment, Volver a la tienda keeps the delivery data (state and localStorage) for the next purchase', async ({ page }) => {
    await payWith(page, VISA_DECLINED);
    await expect(page.getByRole('heading', { name: 'Pago rechazado' })).toBeVisible();
    await page.getByRole('button', { name: 'Volver a la tienda' }).click();
    await expectPersisted(page, (s) => {
      expect(s).toContain(DELIVERY['Nombre completo']);
      expect(s).not.toContain('CHK-E2E-000001');
    });
    await startCheckout(page, HEADPHONES.name);
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Nombre completo')).toHaveValue(DELIVERY['Nombre completo']);
    await expect(dialog.getByLabel('Número de tarjeta')).toHaveValue('');
  });
});
