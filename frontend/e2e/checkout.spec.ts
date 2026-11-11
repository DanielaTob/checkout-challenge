import { HEADPHONES } from './mockApi';
import {
  VISA_APPROVED,
  VISA_DECLINED,
  continueToSummary,
  expect,
  expectNoCardInStorage,
  expectNoHorizontalOverflow,
  fillCard,
  fillDelivery,
  openShop,
  payButton,
  productCard,
  startCheckout,
  test,
} from './fixtures';

const PRODUCT = HEADPHONES.name;

test.describe('Checkout E2E (375×667, mocked API)', () => {
  test('AC-007-01 AC-007-05 approved card: summary, approved result and stock 10 → 9', async ({ page, api }) => {
    await openShop(page);
    await expect(productCard(page, PRODUCT).getByText('Quedan 10', { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await startCheckout(page, PRODUCT);
    await fillCard(page, VISA_APPROVED);
    await fillDelivery(page);
    await expectNoHorizontalOverflow(page);
    await continueToSummary(page);
    await expect(page.getByText('VISA •••• 4242')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await payButton(page).click();
    await expect(page.getByRole('heading', { name: '¡Pago aprobado!' })).toBeVisible();
    await expect(page.getByText('CHK-E2E-000001')).toBeVisible();
    await expect(page.getByText('VISA •••• 4242')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoCardInStorage(page);

    await page.getByRole('button', { name: 'Volver a la tienda' }).click();
    await expect(productCard(page, PRODUCT).getByText('Quedan 9', { exact: true })).toBeVisible();
    expect(api.stockOf(HEADPHONES.id)).toBe(9);
    expect(api.transactionPosts).toHaveLength(1);
  });

  test('AC-007-02 AC-007-05 declined card: rejected result and the stock does not change', async ({ page, api }) => {
    await openShop(page);
    await startCheckout(page, PRODUCT);
    await fillCard(page, VISA_DECLINED);
    await fillDelivery(page);
    await continueToSummary(page);

    await payButton(page).click();
    await expect(page.getByRole('heading', { name: 'Pago rechazado' })).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('No se hizo ningún cobro');
    await expectNoHorizontalOverflow(page);
    await expectNoCardInStorage(page);

    await page.getByRole('button', { name: 'Volver a la tienda' }).click();
    await expect(productCard(page, PRODUCT).getByText('Quedan 10', { exact: true })).toBeVisible();
    expect(api.stockOf(HEADPHONES.id)).toBe(10);
  });

  test('AC-007-03 AC-007-05 reload on the summary: delivery kept, card asked again, then approved', async ({ page, api }) => {
    await openShop(page);
    await startCheckout(page, PRODUCT);
    await fillCard(page, VISA_APPROVED);
    await fillDelivery(page);
    await continueToSummary(page);
    await expectNoCardInStorage(page);

    await page.reload();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Nombre completo')).toHaveValue('José Pérez');
    await expect(dialog.getByLabel('Código postal')).toHaveValue('050021');
    await expect(dialog.getByLabel('Número de tarjeta')).toHaveValue('');
    await expect(dialog.getByLabel('CVC')).toHaveValue('');

    await fillCard(page, VISA_APPROVED);
    await continueToSummary(page);
    await payButton(page).click();
    await expect(page.getByRole('heading', { name: '¡Pago aprobado!' })).toBeVisible();
    expect(api.stockOf(HEADPHONES.id)).toBe(9);
    await expectNoHorizontalOverflow(page);
  });

  test('AC-007-04 AC-007-05 reload while paying: recovered by Idempotency-Key, no second charge', async ({ page, api }) => {
    await openShop(page);
    await startCheckout(page, PRODUCT);
    await fillCard(page, VISA_APPROVED);
    await fillDelivery(page);
    await continueToSummary(page);

    api.holdNextTransaction();
    const inFlight = page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/transactions'));
    await payButton(page).click();
    await inFlight;
    await expectNoCardInStorage(page);

    const recovered = page.waitForRequest((r) => r.url().includes('/transactions/by-key/'));
    await page.reload();
    await recovered;

    await expect(page.getByRole('heading', { name: '¡Pago aprobado!' })).toBeVisible();
    await expect(page.getByText('CHK-E2E-000001')).toBeVisible();
    expect(api.transactionPosts).toHaveLength(1);
    expect(api.stockOf(HEADPHONES.id)).toBe(9);
    await expectNoHorizontalOverflow(page);
    await expectNoCardInStorage(page);
  });
});
