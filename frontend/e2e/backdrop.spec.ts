import type { Page } from '@playwright/test';
import { HEADPHONES } from './mockApi';
import {
  VISA_APPROVED,
  continueToSummary,
  expect,
  expectNoHorizontalOverflow,
  fillCard,
  fillDelivery,
  openShop,
  payButton,
  startCheckout,
  test,
} from './fixtures';

async function toSummary(page: Page) {
  await openShop(page);
  await startCheckout(page, HEADPHONES.name);
  await fillCard(page, VISA_APPROVED);
  await fillDelivery(page);
  await continueToSummary(page);
}

const toggle = (page: Page) => page.getByRole('button', { name: /Resumen del pedido/ });
const front = (page: Page) => page.locator('.backdrop__front');

/** The front layer spans the whole container and sits on the bottom edge of the viewport. */
async function expectFrontAnchored(page: Page) {
  // measure the resting position, not a frame of the entry animation
  await front(page).evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));
  const viewport = page.viewportSize()!;
  const app = (await page.locator('.app').boundingBox())!;
  const box = (await front(page).boundingBox())!;
  expect(Math.round(box.x)).toBe(Math.round(app.x));
  expect(Math.round(box.width)).toBe(Math.round(app.width));
  expect(Math.round(box.y + box.height)).toBe(viewport.height);
  const radius = await front(page).evaluate((el) => {
    const css = getComputedStyle(el);
    return [css.borderTopLeftRadius, css.borderTopRightRadius, css.borderBottomLeftRadius];
  });
  expect(radius).toEqual(['16px', '16px', '0px']);
}

test.describe('Summary as a Material backdrop', () => {
  test('AC-009-04 at 375×667 the front layer is anchored at the bottom, full width, and Pagar is visible without scrolling', async ({ page }) => {
    await toSummary(page);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expectFrontAnchored(page);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(payButton(page)).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
    await expectNoHorizontalOverflow(page);
  });

  test('AC-009-02 AC-009-03 the subheader swaps the active layer; Esc and the scrim bring the front layer back', async ({ page }) => {
    await toSummary(page);
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', { name: 'Editar datos' })).toBeHidden();

    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('button', { name: 'Editar datos' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aumentar cantidad' })).toBeFocused();
    await expect(payButton(page)).toBeHidden();
    await expect(page.locator('.backdrop__scrim')).toBeVisible();
    await expectFrontAnchored(page);
    await expectNoHorizontalOverflow(page);

    await page.keyboard.press('Escape');
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle(page)).toBeFocused();
    await expect(payButton(page)).toBeInViewport({ ratio: 1 });

    await toggle(page).click();
    await page.locator('.backdrop__scrim').click();
    await expect(payButton(page)).toBeVisible();
  });

  test('AC-009-02 changing the quantity in the back layer re-quotes the front layer', async ({ page }) => {
    await toSummary(page);
    await expect(payButton(page)).toHaveText(/262\.900/);
    await toggle(page).click();
    await page.getByRole('button', { name: 'Aumentar cantidad' }).click();
    await expect(toggle(page)).toContainText('512.800');
    await page.keyboard.press('Escape');
    await expect(payButton(page)).toHaveText(/512\.800/);
  });

  test.describe('desktop', () => {
    test.use({ viewport: { width: 1280, height: 800 }, hasTouch: false });

    test('AC-009-04 at 1280×800 the same backdrop lives in the centered container, without a centered dialog', async ({ page }) => {
      await toSummary(page);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.locator('.modal-overlay, .sheet-backdrop')).toHaveCount(0);
      const app = (await page.locator('.app').boundingBox())!;
      expect(Math.round(app.width)).toBe(1080);
      expect(Math.round(app.x)).toBe(100); // centered: (1280 − 1080) / 2
      await expectFrontAnchored(page);
      await expect(payButton(page)).toBeInViewport({ ratio: 1 });
      await expectNoHorizontalOverflow(page);
    });
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('AC-009-05 with prefers-reduced-motion the layers do not animate', async ({ page }) => {
      await toSummary(page);
      const motion = (selector: string) =>
        page.locator(selector).evaluate((el) => {
          const css = getComputedStyle(el);
          return { animation: css.animationName, transition: css.transitionProperty };
        });
      expect((await motion('.backdrop__front')).animation).toBe('none');
      expect((await motion('.backdrop__front-body')).animation).toBe('none');
      expect((await motion('.backdrop__chevron')).transition).toBe('none');
      expect((await motion('.backdrop__product')).transition).toBe('none');
      await toggle(page).click();
      expect((await motion('.backdrop__controls')).animation).toBe('none');
      expect((await motion('.backdrop__scrim')).animation).toBe('none');
    });
  });
});
