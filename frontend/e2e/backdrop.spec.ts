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

const front = (page: Page) => page.locator('.backdrop__front');
const back = (page: Page) => page.locator('.backdrop__back');
const editButton = (page: Page) => page.getByRole('button', { name: 'Editar datos' });
const plus = (page: Page) => page.getByRole('button', { name: 'Aumentar cantidad' });

/** Measure resting positions, not a frame of the entry animation. */
const settle = (page: Page) =>
  front(page).evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));

const noPageScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight && window.scrollY === 0);

test.describe('Summary in two fixed layers (ADR 0006)', () => {
  test('AC-009-04 at 375×667 the back layer is compact on top and the front sheet is anchored at the bottom with Pagar visible without scrolling', async ({ page }) => {
    await toSummary(page);
    await settle(page);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const viewport = page.viewportSize()!;
    const app = (await page.locator('.app').boundingBox())!;
    const backBox = (await back(page).boundingBox())!;
    const box = (await front(page).boundingBox())!;
    // back layer on top and compact, front layer below it, full width, on the bottom edge
    expect(backBox.y + backBox.height).toBeLessThanOrEqual(box.y);
    expect(backBox.height).toBeLessThanOrEqual(160);
    expect(Math.round(box.x)).toBe(Math.round(app.x));
    expect(Math.round(box.width)).toBe(Math.round(app.width));
    expect(Math.round(box.y + box.height)).toBe(viewport.height);
    const radius = await front(page).evaluate((el) => {
      const css = getComputedStyle(el);
      return [css.borderTopLeftRadius, css.borderTopRightRadius, css.borderBottomLeftRadius];
    });
    expect(radius).toEqual(['16px', '16px', '0px']);
    await expect(editButton(page)).toBeInViewport({ ratio: 1 });
    await expect(plus(page)).toBeInViewport({ ratio: 1 });
    await expect(payButton(page)).toBeInViewport({ ratio: 1 });
    expect(await noPageScroll(page)).toBe(true);
    await expectNoHorizontalOverflow(page);
  });

  test('AC-009-02 AC-009-03 both layers stay visible, without toggle or scrim; focus enters on the heading and Tab goes back controls → Pagar', async ({ page, browserName }) => {
    // Safari/WebKit only tabs to buttons with Option+Tab (its default keyboard setting)
    const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
    await toSummary(page);
    const heading = page.getByRole('heading', { name: 'Resumen del pedido' });
    await expect(heading).toBeFocused();
    await expect(page.getByRole('region', { name: 'Resumen del pedido' })).toContainText('Tarifa base');
    await expect(page.locator('[aria-expanded], .backdrop__scrim')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Resumen del pedido/ })).toHaveCount(0);
    await expect(editButton(page)).toBeVisible();
    await expect(payButton(page)).toBeVisible();

    await page.getByRole('heading', { name: 'Tienda Demo' }).click(); // start tabbing from the top
    await page.keyboard.press(tab);
    await expect(plus(page)).toBeFocused(); // − is disabled at quantity 1
    await page.keyboard.press(tab);
    await expect(editButton(page)).toBeFocused();
    await page.keyboard.press(tab);
    await expect(payButton(page)).toBeFocused();
  });

  test('AC-009-02 changing the quantity re-quotes the front layer, both layers still on screen', async ({ page }) => {
    await toSummary(page);
    await expect(payButton(page)).toHaveText(/262\.900/);
    await plus(page).click();
    await expect(payButton(page)).toHaveText(/512\.800/);
    await expect(page.getByRole('group', { name: 'Cantidad' })).toContainText('Cantidad: 2');
    await expect(payButton(page)).toBeInViewport({ ratio: 1 });
    await expect(editButton(page)).toBeInViewport({ ratio: 1 });
  });

  test.describe('desktop', () => {
    test.use({ viewport: { width: 1280, height: 800 }, hasTouch: false });

    test('AC-009-06 at 1280×800 the layers are two top-aligned columns in the centered container, without dialog or empty gap', async ({ page }) => {
      await toSummary(page);
      await settle(page);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.locator('.modal-overlay, .sheet-backdrop')).toHaveCount(0);
      const app = (await page.locator('.app').boundingBox())!;
      expect(Math.round(app.width)).toBe(1080);
      expect(Math.round(app.x)).toBe(100); // centered: (1280 − 1080) / 2
      const backBox = (await back(page).boundingBox())!;
      const box = (await front(page).boundingBox())!;
      // side by side: back on the left, front on the right, both starting at the same height
      expect(backBox.x + backBox.width).toBeLessThan(box.x);
      expect(Math.round(backBox.y)).toBe(Math.round(box.y));
      expect(box.x + box.width).toBeLessThanOrEqual(app.x + app.width);
      // no empty gap: the front card is not pushed to the bottom of the viewport
      const viewport = page.viewportSize()!;
      expect(box.y + box.height).toBeLessThan(viewport.height - 100);
      const radius = await front(page).evaluate((el) => getComputedStyle(el).borderBottomLeftRadius);
      expect(radius).toBe('16px');
      await expect(payButton(page)).toBeInViewport({ ratio: 1 });
      await expect(editButton(page)).toBeInViewport({ ratio: 1 });
      await expect(page.getByText(HEADPHONES.description)).toBeVisible();
      expect(await noPageScroll(page)).toBe(true);
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
          return { animation: css.animationName, transition: css.transitionDuration };
        });
      for (const selector of ['.backdrop__front', '.backdrop__back', '.backdrop__product']) {
        const m = await motion(selector);
        expect(m.animation, selector).toBe('none');
        // the global reduced-motion rule leaves at most 0.01 ms
        for (const d of m.transition.split(',')) expect(parseFloat(d), selector).toBeLessThanOrEqual(0.00001);
      }
    });
  });
});
