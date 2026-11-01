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
  const workout = process.env.MOTION_WORKOUT || 'a';
  const cover = {a:'bench-press', b:'assisted-pullup', c:'lever-squat', d:'incline-dumbbell', e:'preacher-curl', home:'tuck-front-lever'}[workout];
  const folder = {a:'monday-motion', b:'tuesday-motion', c:'wednesday-motion', d:'thursday-motion', e:'friday-motion', home:'home-motion'}[workout];
  const home = () => page.getByRole('button', { name: 'Treinos', exact: true }).click();
  try {
    await page.goto(process.env.APP_URL || 'http://127.0.0.1:4174/gym-tracker/');
    await page.locator(`.workout-tile[data-workout=${workout}]`).waitFor();
    assert.match(await page.locator(`.workout-tile[data-workout=${workout}] img`).getAttribute('src'), new RegExp(`motion/covers/${cover}\\.webp$`));
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      for (const id of ['a', 'b', 'c', 'd', 'e', 'home']) {
        const coverImage = page.locator(`.workout-tile[data-workout=${id}] .motion-cover img`);
        await coverImage.evaluate(img => img.decode());
        const layout = await coverImage.evaluate(img => {
          const rect = img.getBoundingClientRect(), parent = img.parentElement.getBoundingClientRect(), css = getComputedStyle(img);
          return { fit: css.objectFit, blend: css.mixBlendMode, width: Math.abs(rect.width - parent.width), height: Math.abs(rect.height - parent.height), naturalWidth: img.naturalWidth };
        });
        assert.equal(layout.fit, 'cover'); assert.equal(layout.blend, 'normal'); assert.equal(layout.naturalWidth, 1440);
        assert.ok(layout.width < 1 && layout.height < 1, 'Blue image fills cover at width ' + width);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    fs.mkdirSync(`artifacts/${folder}`, { recursive: true });
    await page.screenshot({ path: `artifacts/${folder}/home.png`, fullPage: true });
    await page.locator(`.workout-tile[data-workout=${workout}]`).click();
    assert.equal(await page.locator('.exercise-motion').count(), workout === 'home' ? 2 : ['c','d','e'].includes(workout) ? 7 : 6);
    assert.equal(await page.locator('.set-button').count(), workout === 'home' ? 6 : workout === 'c' ? 22 : ['d','e'].includes(workout) ? 21 : 18);
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
    fs.mkdirSync(`artifacts/${folder}`, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `artifacts/${folder}/preview.png` });
    await page.getByRole('button', { name: 'Fechar', exact: true }).click();
    await page.screenshot({ path: `artifacts/${folder}/workout.png`, fullPage: true });
    await home();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true);
    await page.reload();
    await page.locator(`.workout-tile[data-workout=${workout}]`).click();
    await page.getByRole('button', { name: `Ampliar imagem de ${names.at(-1)}`, exact: true }).click();
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
    console.log('PASS: all workout pose pairs, full blue covers at mobile/desktop widths, zoom, pause/manual positions, resume, offline, reduced motion and unchanged other workouts.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
