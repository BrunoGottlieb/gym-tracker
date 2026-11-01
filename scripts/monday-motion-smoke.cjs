const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  await context.route('**/api/streaks', route => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const home = () => page.getByRole('button', { name: 'Treinos', exact: true }).click();
  try {
    await page.goto(process.env.APP_URL || 'http://127.0.0.1:4174/gym-tracker/');
    await page.locator('.workout-tile[data-workout=a]').waitFor();
    assert.match(await page.locator('.workout-tile[data-workout=a] img').getAttribute('src'), /motion\/bench-press-1\.webp$/);
    await page.locator('.workout-tile[data-workout=a]').click();
    assert.equal(await page.locator('.exercise-motion').count(), 6);
    assert.equal(await page.locator('.set-button').count(), 18);
    const first = page.locator('.exercise-motion').first();
    await page.waitForFunction(() => document.querySelector('.exercise-motion img')?.src.includes('/motion/'));
    const initial = await first.locator('img').getAttribute('src');
    await page.waitForFunction(src => document.querySelector('.exercise-motion img')?.getAttribute('src') !== src, initial);
    const names = await page.locator('.exercise-row h2').allTextContents();
    for (const name of names) {
      await page.getByRole('button', { name: `Ampliar imagem de ${name}`, exact: true }).click();
      const preview = page.locator('.motion-preview');
      await preview.getByRole('button', { name: 'Pausar movimento', exact: true }).click();
      for (const position of [1, 2]) {
        await preview.getByRole('button', { name: `Ver posição ${position}`, exact: true }).click();
        assert.match(await preview.locator('img').getAttribute('src'), new RegExp(`-${position}\\.webp$`));
        await preview.locator('img').evaluate(img => img.decode());
        await page.waitForTimeout(1250);
        assert.equal(await preview.getAttribute('data-position'), String(position));
      }
      await preview.getByRole('button', { name: 'Reproduzir movimento', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('.motion-preview')?.dataset.position === '1');
      await page.getByRole('button', { name: 'Fechar', exact: true }).click();
    }
    await page.getByRole('button', { name: `Ampliar imagem de ${names[0]}`, exact: true }).click();
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.locator('dialog').evaluate(el => el.scrollWidth > el.clientWidth), false);
    }
    fs.mkdirSync('artifacts/monday-motion', { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'artifacts/monday-motion/preview.png' });
    await page.getByRole('button', { name: 'Fechar', exact: true }).click();
    await page.screenshot({ path: 'artifacts/monday-motion/workout.png', fullPage: true });
    await home();
    await page.locator('.workout-tile[data-workout=d]').click();
    assert.equal(await page.locator('.exercise-motion').count(), 0, 'Other days keep static illustrations');
    await home();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true);
    await page.reload();
    await page.locator('.workout-tile[data-workout=a]').click();
    await page.getByRole('button', { name: `Ampliar imagem de ${names[5]}`, exact: true }).click();
    await page.locator('.motion-preview').getByRole('button', { name: 'Pausar movimento', exact: true }).click();
    await page.getByRole('button', { name: 'Ver posição 2', exact: true }).click();
    await page.locator('.motion-preview img').evaluate(img => img.decode());
    await page.getByRole('button', { name: 'Fechar', exact: true }).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.exercise-motion').first().scrollIntoViewIfNeeded();
    const still = await first.getAttribute('data-position');
    await page.waitForTimeout(1350);
    assert.equal(await first.getAttribute('data-position'), still, 'Reduced motion disables autoplay');
    await page.getByRole('button', { name: `Ampliar imagem de ${names[0]}`, exact: true }).click();
    await page.getByRole('button', { name: 'Reproduzir movimento', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.motion-preview')?.dataset.position === '2');
    assert.deepEqual(errors, []);
    console.log('PASS: six two-frame loops, all 12 assets decode, zoom, pause/manual positions, resume, responsive layout, offline and reduced motion; other workouts unchanged.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
